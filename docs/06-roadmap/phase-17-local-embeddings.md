# Phase 17: Local Embeddings with Capability-Based Fallback

**Focus:** Add local AI provider for embeddings with automatic fallback
**Risk:** Medium
**Depends on:** Phase 15 (Extensions Architecture)
**Status:** IN PROGRESS (Phase 17.1, 17.2, 17.3 Complete - Dashboard UI in 17.4 is future work)

---

## Problem Statement

1. **Anthropic Claude has no embedding API** - current code uses fake hash-based embeddings
2. **Knowledge base search doesn't work** - similarity scores are ~6-12% (threshold is 30%)
3. **Users need OpenAI for embeddings** - adds cost and external dependency
4. **Self-hosted Docker app should work out of the box** - without requiring external APIs

---

## Solution Overview

1. Add **local AI provider** using Transformers.js (runs in Node.js)
2. Use **existing manifest capabilities** - already defined in code
3. Implement **automatic fallback** - use local embeddings when main AI doesn't support them
4. Show **critical issues** in Dashboard when capabilities are missing
5. **Enable by default** on first run

---

## Current State Analysis

### AI Provider Manifests (Already Exist)

Each provider already declares capabilities in their manifest:

```typescript
// src/extensions/ai/providers/anthropic.ts
capabilities: { completion: true, embedding: false, streaming: true }

// src/extensions/ai/providers/openai.ts
capabilities: { completion: true, embedding: true, streaming: true }

// src/extensions/ai/providers/ollama.ts
capabilities: { completion: true, embedding: true, streaming: true }
```

**No DB changes needed** - we read capabilities directly from manifests via the registry.

### Current Embedding Flow

```
KnowledgeService.search(query)
  → provider.embed(query)
  → Anthropic.embed() returns hash-based fake embedding
  → cosine similarity = ~6% (no matches found)
```

---

## Implementation Plan

### Part A: Local AI Provider Extension

**Location:** `src/extensions/ai/providers/local.ts`

**Dependencies:**
```json
{
  "@huggingface/transformers": "^3.4.0"
}
```

**Models:**
| Purpose | Model | Size | RAM Needed |
|---------|-------|------|------------|
| Embedding | `Xenova/all-MiniLM-L6-v2` | ~80MB | ~200MB |
| Completion (Default) | `onnx-community/Llama-3.2-1B-Instruct-ONNX` | ~1.2GB | ~2-3GB |
| Completion (Balanced) | `HuggingFaceTB/SmolLM2-1.7B-Instruct` | ~3.4GB | ~6-8GB |
| Completion (Best) | `onnx-community/Phi-3-mini-4k-instruct-onnx` | ~2GB | ~4-6GB |

> Note: Llama 3.2 1B is the default for its small size and 128K context. Smaller models (Qwen 0.5B, TinyLlama) were removed due to poor response quality.

**Implementation:**

```typescript
export class LocalAIProvider implements AIProvider, BaseProvider {
  readonly id = 'local';
  readonly name = 'local';

  private embeddingPipeline: Pipeline | null = null;
  private completionPipeline: Pipeline | null = null;

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    if (!this.embeddingPipeline) {
      this.embeddingPipeline = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2'
      );
    }
    const output = await this.embeddingPipeline(request.text, {
      pooling: 'mean',
      normalize: true
    });
    return { embedding: Array.from(output.data) };
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    // Lazy load completion model (larger, only when needed)
    if (!this.completionPipeline) {
      this.completionPipeline = await pipeline(
        'text-generation',
        'Xenova/Qwen1.5-0.5B-Chat'
      );
    }
    // ... implementation
  }
}

export const manifest: AIExtensionManifest = {
  id: 'local',
  name: 'Local AI (Built-in)',
  category: 'ai',
  version: '1.0.0',
  description: 'Built-in local AI using Transformers.js. Provides basic completion and semantic embeddings without external APIs.',
  icon: '🏠',
  configSchema: [], // No configuration needed
  capabilities: {
    completion: true,
    embedding: true,
    streaming: false,
  },
  createProvider: () => new LocalAIProvider(),
};
```

**Model Storage:** `~/.cache/huggingface/` (auto-downloaded on first use via transformers.js)

**WebSocket Progress Events:**
```typescript
// Event type (src/types/events.ts)
MODEL_DOWNLOAD_PROGRESS: 'model.download.progress'

// Payload structure
interface ModelDownloadProgressEvent {
  type: 'model.download.progress';
  timestamp: Date;
  payload: {
    model: string;                    // e.g., 'Xenova/all-MiniLM-L6-v2'
    status: 'initiate' | 'download' | 'progress' | 'done' | 'ready';
    file?: string;                    // Current file being downloaded
    progress?: number;                // 0-100 percentage
    loaded?: number;                  // Bytes loaded
    total?: number;                   // Total bytes
  };
}

// WebSocket message (broadcast to dashboard)
{ type: 'model:download:progress', payload: { ... } }
```

**Dashboard Integration (Future):**
- Subscribe to `model:download:progress` WebSocket messages
- Show progress bar during "Test Connection"
- Display file name and percentage

---

### Part B: Registry Capability-Based Getters

**File:** `src/extensions/registry.ts`

Use existing `manifest.capabilities` to check provider support:

```typescript
/**
 * Get a provider that supports completion
 * Priority: User-configured provider > Local fallback
 */
getCompletionProvider(): AIProvider | undefined {
  // First try user's active AI provider with completion support
  for (const [id, ext] of this.extensions) {
    if (ext.manifest.category === 'ai' && ext.status === 'active' && id !== 'local') {
      const manifest = ext.manifest as AIExtensionManifest;
      if (manifest.capabilities.completion) {
        return this.aiProviders.get(id);
      }
    }
  }
  // Fallback to local
  return this.aiProviders.get('local');
}

/**
 * Get a provider that supports embeddings
 * Priority: User-configured with real embeddings > Local fallback
 */
getEmbeddingProvider(): AIProvider | undefined {
  // First try user's active AI provider with embedding support (not local)
  for (const [id, ext] of this.extensions) {
    if (ext.manifest.category === 'ai' && ext.status === 'active' && id !== 'local') {
      const manifest = ext.manifest as AIExtensionManifest;
      if (manifest.capabilities.embedding) {
        return this.aiProviders.get(id);
      }
    }
  }
  // Fallback to local (which has capabilities.embedding: true)
  return this.aiProviders.get('local');
}
```

---

### Part C: Knowledge Service Integration

**File:** `src/ai/knowledge/index.ts`

Update to use `getEmbeddingProvider()`:

```typescript
export class KnowledgeService {
  private getEmbeddingProvider(): LLMProvider {
    const registry = getExtensionRegistry();
    const provider = registry.getEmbeddingProvider();
    if (!provider) {
      throw new Error('No embedding provider available');
    }
    return provider;
  }

  async search(query: string, options: SearchOptions = {}): Promise<KnowledgeSearchResult[]> {
    const provider = this.getEmbeddingProvider();
    const queryEmbedding = await provider.embed({ text: query });
    // ... rest of search logic
  }
}
```

---

### Part D: Auto-Enable on First Run

**File:** `src/index.ts` (or dedicated initialization)

```typescript
async function initializeDefaultExtensions() {
  const aiConfigs = await db
    .select()
    .from(integrationConfigs)
    .where(eq(integrationConfigs.integrationId, 'ai'));

  // If no AI provider configured, enable local
  if (aiConfigs.length === 0) {
    log.info('No AI provider configured, enabling local AI');
    await extensionConfigService.activateExtension('local', {});
  }
}
```

---

### Part E: System Status API

**File:** `src/gateway/routes/system.ts`

```typescript
/**
 * GET /api/v1/system/status
 * Returns system health and critical issues
 */
systemRoutes.get('/status', async (c) => {
  const registry = getExtensionRegistry();
  const issues: SystemIssue[] = [];

  // Check completion capability
  const completionProvider = registry.getCompletionProvider();
  if (!completionProvider) {
    issues.push({
      type: 'no_completion_provider',
      severity: 'critical',
      message: 'No AI provider available for conversations',
      action: { label: 'Configure AI', route: '/settings/extensions' }
    });
  }

  // Check embedding capability
  const embeddingProvider = registry.getEmbeddingProvider();
  const activeAI = registry.getActiveAIProvider();

  if (!embeddingProvider) {
    issues.push({
      type: 'no_embedding_provider',
      severity: 'critical',
      message: 'No embedding provider available for knowledge search',
      action: { label: 'Configure AI', route: '/settings/extensions' }
    });
  } else if (embeddingProvider.name === 'local' && activeAI?.name !== 'local') {
    issues.push({
      type: 'using_local_embeddings',
      severity: 'info',
      message: 'Using local embeddings (slower than cloud)',
      action: { label: 'Add OpenAI', route: '/settings/extensions' }
    });
  }

  return c.json({
    healthy: issues.filter(i => i.severity === 'critical').length === 0,
    issues,
    providers: {
      completion: completionProvider?.name ?? null,
      embedding: embeddingProvider?.name ?? null,
    }
  });
});
```

---

### Part F: Dashboard Critical Issues

**File:** `apps/dashboard/src/components/CriticalIssues.tsx`

```tsx
export function CriticalIssues() {
  const { data } = useQuery(['system-status'], () => api.get('/system/status'));

  if (!data?.issues?.length) return null;

  return (
    <div className="space-y-2 mb-6">
      {data.issues.map((issue) => (
        <Alert
          key={issue.type}
          variant={issue.severity === 'critical' ? 'destructive' : 'default'}
        >
          <AlertDescription className="flex justify-between items-center">
            <span>{issue.message}</span>
            <Link to={issue.action.route}>
              <Button size="sm" variant="outline">{issue.action.label}</Button>
            </Link>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
```

**File:** `apps/dashboard/src/pages/Dashboard.tsx`

```tsx
export function DashboardPage() {
  return (
    <div>
      <CriticalIssues />
      {/* ... rest of dashboard */}
    </div>
  );
}
```

---

### Part G: Knowledge Base & Scraper Warnings

**File:** `apps/dashboard/src/pages/tools/KnowledgeBase.tsx`

```tsx
// Add warning banner when using local embeddings
const { data: status } = useQuery(['system-status'], ...);

{status?.providers?.embedding === 'local' && (
  <Alert className="mb-4">
    <AlertDescription>
      Using local embeddings. Search may be slower than cloud providers.
    </AlertDescription>
  </Alert>
)}

{!status?.providers?.embedding && (
  <Alert variant="destructive" className="mb-4">
    <AlertDescription>
      No embedding provider configured. Knowledge search is disabled.
      <Link to="/settings/extensions">Configure AI</Link>
    </AlertDescription>
  </Alert>
)}
```

---

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `src/extensions/ai/providers/local.ts` | Create ✅ | Local AI provider with progress events |
| `src/extensions/ai/providers/index.ts` | Modify ✅ | Export local provider |
| `src/extensions/ai/index.ts` | Modify ✅ | Register local provider |
| `src/types/events.ts` | Modify ✅ | Add MODEL_DOWNLOAD_PROGRESS event |
| `src/gateway/websocket-bridge.ts` | Modify ✅ | Broadcast model download progress |
| `tests/extensions/ai/providers/local.test.ts` | Create ✅ | 13 tests for local provider |
| `src/extensions/registry.ts` | Modify ✅ | Add `getCompletionProvider()`, `getEmbeddingProvider()` |
| `src/gateway/routes/knowledge.ts` | Modify ✅ | Use embedding/completion providers |
| `tests/extensions/registry.test.ts` | Modify ✅ | Add 4 tests for capability-based getters |
| `src/gateway/routes/system.ts` | Create ✅ | System status API |
| `src/gateway/routes/api.ts` | Modify ✅ | Register system routes |
| `tests/gateway/system.test.ts` | Create ✅ | 7 tests for system status API |
| `apps/dashboard/src/components/CriticalIssues.tsx` | Future | Issues component |
| `apps/dashboard/src/pages/Dashboard.tsx` | Future | Add CriticalIssues |
| `apps/dashboard/src/pages/tools/KnowledgeBase.tsx` | Future | Add warnings |

---

## Phased Implementation

### Phase 17.1: Local AI Provider ✅ COMPLETE
- Install `@huggingface/transformers` v3 (upgraded from `@xenova/transformers` v2)
- Create local.ts provider with:
  - Lazy-loaded embedding pipeline (Xenova/all-MiniLM-L6-v2)
  - Lazy-loaded completion pipeline with 3 model options:
    - Llama 3.2 1B (1.2GB, 128K context) - Default
    - SmolLM2 1.7B (3.4GB, balanced)
    - Phi-3 Mini (2GB, best quality)
  - Model-specific chat templates (Llama, ChatML, Phi-3)
  - `testConnection()` method
  - Dropdown config for model selection
  - Note: Smaller models (Qwen 0.5B, TinyLlama) removed due to poor quality
- Register in ai/index.ts and providers/index.ts
- Write tests for embedding/completion (13 tests)
- **WebSocket Progress Updates:**
  - Add `MODEL_DOWNLOAD_PROGRESS` event type to `src/types/events.ts`
  - Emit progress events via `progress_callback` during model download
  - Broadcast to dashboard via `websocket-bridge.ts` → `model:download:progress`
  - Payload: `{ model, status, file?, progress?, loaded?, total? }`
- **Verify:** `pnpm test` - 244 tests passing

### Phase 17.2: Registry & Fallback Logic ✅ COMPLETE
- Add `getCompletionProvider()` and `getEmbeddingProvider()` to registry
  - Priority: User-configured provider (non-local) > Local fallback
  - Uses manifest `capabilities.embedding` and `capabilities.completion`
- Update knowledge routes (`/ask`, `/reindex`, create, update) to use:
  - `getEmbeddingProvider()` for generating/searching embeddings
  - `getCompletionProvider()` for AI responses
- Add 4 new registry tests for capability-based provider selection
- **Verify:** 248 tests passing

### Phase 17.3: System Status API ✅ COMPLETE
- ~~Auto-enable on first run~~ (Skipped - models are large, don't auto-download)
- Create system status endpoint (`GET /api/v1/system/status`)
- Returns provider status and actionable issues
- **Verify:** API returns correct provider status

### Phase 17.4: Dashboard Action Items (Future)
- Create ActionItems/CriticalIssues component on Dashboard
- Show "Configure AI Provider" prompt when none configured
- Add warnings to Knowledge Base when embeddings unavailable
- **Verify:** UI shows appropriate prompts and warnings

---

## Verification Checklist

```bash
# After all phases
pnpm typecheck    # No errors
pnpm test         # All tests pass
pnpm dev          # Start app

# Test scenarios:
# 1. Fresh install → local AI auto-enabled
# 2. Add Anthropic → completion works, embeddings fallback to local
# 3. Add OpenAI → both completion and embedding use OpenAI
# 4. Knowledge search → finds matches with local embeddings
# 5. Dashboard → shows info banner about local embeddings
```

---

## Rollback Plan

If issues arise:
1. Disable local provider in DB: `UPDATE integration_configs SET enabled = 0 WHERE provider_id = 'local'`
2. Migration is additive (new columns), no data loss
3. Can revert to hash-based fallback by removing local provider code

---

## Future Considerations

1. **Model selection UI** - Let admin choose which local models to use
2. **GPU acceleration** - Use ONNX with CUDA when available
3. **Model caching** - Pre-download models in Docker build
4. **Hybrid search** - Combine FTS5 keywords with vector similarity
