# Phase 22: Smart Scrape

**Version:** 1.13.0
**Codename:** Smart Scrape
**Focus:** AI-powered content extraction, Q&A generation, semantic dedup, smart crawl
**Depends on:** Phase 11 (Site Scraper complete)

---

## Goal

Upgrade the Phase 11 Site Scraper from rigid CSS-selector parsing to **AI-powered content extraction**. Claude reads raw page text and returns structured entries, generates guest-facing Q&A pairs, and uses embedding similarity to deduplicate. A new **Smart Crawl** step discovers relevant pages automatically from a domain, eliminating the need for staff to manually find URLs.

---

## What You Can Test

After completing this phase, test these scenarios:

### 1. AI Content Extraction
Dashboard → Tools → Site Scraper:
```
Enter URL: https://example-hotel.com/amenities
Click: "Fetch Content"
Click: "Process with AI"
Expected:
- HTML stripped to clean text (no tags, nav, scripts)
- AI extracts structured entries (title, content, category)
- No CSS selectors needed — works on any page layout
- Confidence score shown per entry
```

### 2. Q&A Generation
After AI processing:
```
Expected:
- Each entry has 2–3 generated guest questions
- Questions appear in the review step
- Example: "What time does the pool close?"
- Q&A pairs imported alongside content entries
```

### 3. Semantic Deduplication
Scrape overlapping pages:
```
URLs:
- https://example-hotel.com/amenities
- https://example-hotel.com/pool-and-spa

Click: "Fetch All" → "Process with AI"
Expected:
- Duplicate entries detected via embedding cosine similarity
- Warning badges on near-duplicates (>0.90 similarity)
- Option to merge, keep best, or skip duplicates
- No false positives on genuinely different entries
```

### 4. Smart Crawl Discovery (Sub-phase B)
Dashboard → Tools → Site Scraper → "Discover Pages":
```
Enter domain: example-hotel.com
Click: "Discover"
Expected:
- Sitemap.xml parsed for page list
- Homepage links extracted as fallback
- AI scores each URL for relevance (high/medium/low)
- Suggested URLs shown in selectable list
- Staff confirms selection → enters existing fetch/process flow
```

### 5. Source Tracking
After importing entries:
```
Expected:
- Each knowledge_base entry stores source_url and source_entry_id
- Re-scraping same URL detects already-imported entries
- Dashboard shows "Source: example-hotel.com/faq" per entry
```

---

## Architecture

### Updated Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Dashboard  │────▶│  API Route  │────▶│  Crawler    │  (Sub-phase B)
│  (React)    │     │   (Hono)    │     │  (discover) │
└─────────────┘     └──────┬──────┘     └──────┬──────┘
                           │                    │
                           ▼                    ▼
                    ┌─────────────┐     ┌─────────────┐
                    │   Scraper   │     │  AI Scorer  │
                    │   (fetch)   │     │ (relevance) │
                    └──────┬──────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ HTML→Text   │  ← cheerio strip (Sub-phase A)
                    │ (cleanup)   │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  AI Parser  │  ← Claude extracts entries (Sub-phase A)
                    │ (extraction)│
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    │             │
                    ▼             ▼
             ┌───────────┐ ┌───────────┐
             │ Q&A Gen   │ │  Dedup    │  ← embedding similarity (Sub-phase A)
             │(questions)│ │(cosine)   │
             └─────┬─────┘ └─────┬─────┘
                   │             │
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────┐
                   │ Knowledge   │
                   │   Base      │
                   └─────────────┘
```

### New Files

```
src/extensions/tools/site-scraper/
├── html-to-text.ts     # Cheerio HTML → clean text
├── ai-parser.ts        # AI-powered content extraction
├── qa-generator.ts     # Generate guest Q&A pairs
├── deduplicator.ts     # Embedding cosine similarity dedup
└── crawler.ts          # URL discovery engine (Sub-phase B)
```

---

## Tasks

### Sub-phase A: Enhance Existing Pipeline

No new UI steps — enhances the existing fetch → process → import flow.

#### A1. HTML-to-Text Converter

- [ ] Create `src/extensions/tools/site-scraper/html-to-text.ts`:
  ```typescript
  export interface CleanTextResult {
    text: string;
    title: string;
    wordCount: number;
    language?: string;
  }

  export function htmlToCleanText(html: string): CleanTextResult;
  ```

- [ ] Implement with cheerio:
  - Remove `<script>`, `<style>`, `<noscript>`, `<svg>`
  - Remove nav, header, footer, cookie banners
  - Preserve heading hierarchy as text markers
  - Collapse whitespace, trim lines
  - Return plain text suitable for AI input

#### A2. AI Content Extraction

- [ ] Create `src/extensions/tools/site-scraper/ai-parser.ts`:
  ```typescript
  export interface AIExtractedEntry {
    title: string;
    content: string;
    category: 'faq' | 'policy' | 'amenity' | 'service' | 'dining' | 'room_type' | 'local_info';
    keywords: string[];
    confidence: number;  // 0–1
  }

  export async function extractContentWithAI(
    cleanText: string,
    context?: { hotelName?: string; url?: string }
  ): Promise<AIExtractedEntry[]>;
  ```

- [ ] Replace CSS-selector parsing with AI extraction:
  - Send clean text to Claude with structured output prompt
  - Return typed entries with category, keywords, confidence
  - Handle long pages by chunking text (max ~3000 words per call)

- [ ] AI Prompt:
  ```
  You are extracting structured knowledge base entries from a hotel website page.

  For each distinct piece of information, return:
  - title: concise name (max 60 chars)
  - content: the full information a guest would need
  - category: faq | policy | amenity | service | dining | room_type | local_info
  - keywords: 5–10 search terms
  - confidence: 0–1 how confident you are this is useful

  Page text:
  {cleanText}

  Return a JSON array. Omit boilerplate, navigation text, or marketing fluff.
  ```

#### A3. Q&A Generation

- [ ] Create `src/extensions/tools/site-scraper/qa-generator.ts`:
  ```typescript
  export interface GeneratedQA {
    question: string;
    answer: string;
    entryIndex: number;  // links back to source entry
  }

  export async function generateQAPairs(
    entries: AIExtractedEntry[]
  ): Promise<GeneratedQA[]>;
  ```

- [ ] Generate 2–3 guest questions per entry:
  - Questions phrased as a guest would ask
  - Answers derived from the entry content
  - Batch entries to minimize API calls

- [ ] AI Prompt:
  ```
  For each knowledge base entry, generate 2–3 questions a hotel guest
  might ask that this entry answers. Phrase naturally.

  Entries:
  {entries}

  Return JSON array: [{ question, answer, entryIndex }]
  ```

#### A4. Semantic Deduplication

- [ ] Create `src/extensions/tools/site-scraper/deduplicator.ts`:
  ```typescript
  export interface DedupResult {
    entries: AIExtractedEntry[];
    duplicates: DuplicatePair[];
  }

  export interface DuplicatePair {
    indexA: number;
    indexB: number;
    similarity: number;  // cosine similarity 0–1
  }

  export async function deduplicateEntries(
    entries: AIExtractedEntry[],
    existingEmbeddings?: Float32Array[]
  ): Promise<DedupResult>;
  ```

- [ ] Implement with embedding cosine similarity:
  - Generate embeddings for each entry's content
  - Compare all pairs (new vs new, new vs existing)
  - Flag pairs with similarity > 0.90 as duplicates
  - Return sorted by similarity descending

#### A5. Database Migration

- [ ] Add columns to `knowledge_base` table:
  ```sql
  ALTER TABLE knowledge_base ADD COLUMN source_entry_id TEXT;
  ALTER TABLE knowledge_base ADD COLUMN source_url TEXT;
  ```

- [ ] Create migration file:
  - `source_entry_id`: links entry to its original scrape
  - `source_url`: the page URL content was extracted from
  - Both nullable (manual entries have no source)

#### A6. Route Integration

- [ ] Update `POST /api/v1/tools/site-scraper/process`:
  - Pipe through `htmlToCleanText()` → `extractContentWithAI()`
  - Return AI-extracted entries instead of CSS-parsed entries

- [ ] Add `POST /api/v1/tools/site-scraper/generate-qa`:
  ```typescript
  // Body: { entries: AIExtractedEntry[] }
  // Returns: { qaPairs: GeneratedQA[] }
  ```

- [ ] Update `POST /api/v1/tools/site-scraper/import`:
  - Accept Q&A pairs alongside entries
  - Store `source_url` and `source_entry_id`
  - Run deduplication against existing knowledge base
  - Return dedup warnings with import results

#### A7. Frontend Updates

- [ ] Update `SiteScraper.tsx` review step:
  - Show generated Q&A pairs under each entry (collapsible)
  - Allow editing/deleting individual Q&A pairs
  - Show confidence score as progress bar
  - Add "Regenerate Q&A" button per entry

- [ ] Add processing indicators:
  - "Extracting content with AI..." spinner
  - "Generating Q&A pairs..." spinner
  - Step progress (1/3 Fetching → 2/3 Extracting → 3/3 Q&A)

- [ ] Add deduplication warnings:
  - Yellow badge on near-duplicate entries
  - "Similar to: [existing entry title]" with similarity %
  - Radio buttons: Keep Both / Merge / Skip

#### A8. Source Tracking UI

Surface `source_url` data across two existing pages — no new pages needed.

**Site Scraper page — Scrape History panel** (below the URL input form):

- [ ] Add `GET /api/v1/tools/site-scraper/sources` endpoint:
  - Query `knowledge_base` grouped by `source_url WHERE source_url IS NOT NULL`
  - Return: `{ sources: { url, domain, entryCount, lastImportedAt }[] }`

- [ ] Add "Previously Imported" section below the URL input in `SiteScraper.tsx`:
  - Grouped by domain, expandable to show individual URLs
  - Per URL: entry count badge, relative timestamp ("2d ago")
  - Re-scrape button (↻) per URL — pre-fills the URL input and starts the flow
  - Click URL → navigates to Knowledge Base filtered by that source
  - Empty state: "No pages imported yet"

  ```
  Previously Imported Sources
  ┌──────────────────────────────────────────────────────────┐
  │ example-hotel.com/faq           12 entries    2d ago  ↻  │
  │ example-hotel.com/amenities      8 entries    2d ago  ↻  │
  │ example-hotel.com/policies       5 entries    5d ago  ↻  │
  └──────────────────────────────────────────────────────────┘
  ```

**Knowledge Base page — Source indicator & filter:**

- [ ] Add source indicator to entries table in `KnowledgeBase.tsx`:
  - Scraped entries: small Globe icon, domain shown on hover tooltip
  - Manual entries: no icon (clean default)
  - Keep it subtle — icon only, no extra column

- [ ] Add source filter alongside existing category tabs:
  - `All | Manual | Scraped`
  - "Scraped" filter accepts optional `?source=URL` query param
    (used when clicking a URL from the Scraper History panel)

---

### Sub-phase B: Smart Crawl Discovery

New UI step before fetch — staff enters domain, system discovers relevant pages.

#### B1. URL Discovery Engine

- [ ] Create `src/extensions/tools/site-scraper/crawler.ts`:
  ```typescript
  export interface DiscoveredUrl {
    url: string;
    title?: string;
    source: 'sitemap' | 'homepage_link' | 'linked_page';
    relevanceScore: number;  // 0–1, AI-scored
    relevanceReason: string;
  }

  export interface DiscoveryResult {
    domain: string;
    urls: DiscoveredUrl[];
    sitemapFound: boolean;
    totalLinksScanned: number;
  }

  export async function discoverUrls(domain: string): Promise<DiscoveryResult>;
  ```

- [ ] Implement discovery pipeline:
  1. Try `https://{domain}/sitemap.xml` — parse all URLs
  2. Fallback: fetch homepage, extract all internal links
  3. Score each URL with AI for hotel-content relevance
  4. Filter out login pages, booking engines, blog posts
  5. Sort by relevance score descending

- [ ] AI Relevance Scoring Prompt:
  ```
  Score each URL for hotel knowledge-base relevance (0–1).
  High: FAQ, amenities, policies, dining, rooms, spa, services
  Medium: about, contact, location, gallery
  Low: blog, news, careers, booking engine, login

  URLs:
  {urls}

  Return JSON: [{ url, score, reason }]
  ```

#### B2. Discovery Endpoint

- [ ] Create `POST /api/v1/tools/site-scraper/discover`:
  ```typescript
  // Body: { domain: string }
  // Returns: { result: DiscoveryResult }
  ```

- [ ] Rate limit: 1 discovery per domain per minute
- [ ] Cache results for 1 hour

#### B3. Frontend Discovery Step

- [ ] Add new first step to `SiteScraper.tsx`:
  - Domain input field (e.g., `example-hotel.com`)
  - "Discover Pages" button with loading state
  - Results table:
    - Checkbox (pre-checked for high relevance)
    - URL (truncated, full on hover)
    - Relevance score (color-coded badge)
    - Source (sitemap / homepage link)
  - "Select All High Relevance" shortcut button
  - "Fetch Selected" → enters existing flow

- [ ] Update step flow:
  ```
  Before: Enter URLs → Fetch → Process → Review → Import
  After:  Discover → Select URLs → Fetch → Process → Review → Import
                     (or manually enter URLs to skip discovery)
  ```

---

## Error Handling

| Error | Handling |
|-------|----------|
| AI extraction returns empty | Fall back to CSS-selector parsing, show warning |
| AI rate limit hit | Queue remaining entries, retry with backoff |
| Q&A generation fails | Import entries without Q&A, show warning |
| Embedding API unavailable | Skip dedup, warn "duplicates not checked" |
| Sitemap.xml not found | Fall back to homepage link extraction |
| Domain unreachable | Show error, suggest checking the URL |
| Too many URLs discovered | Cap at 50, show "showing top 50 by relevance" |
| Cosine similarity timeout | Skip dedup for remaining entries, partial results |

---

## Testing

```typescript
describe('Smart Scrape', () => {
  describe('html-to-text', () => {
    it('strips scripts, styles, and nav elements');
    it('preserves heading hierarchy as text markers');
    it('collapses whitespace');
    it('returns word count');
  });

  describe('ai-parser', () => {
    it('extracts entries from clean text');
    it('assigns categories and confidence scores');
    it('chunks long text for multiple AI calls');
    it('falls back to CSS parsing on AI failure');
  });

  describe('qa-generator', () => {
    it('generates 2–3 questions per entry');
    it('batches entries to minimize API calls');
    it('handles empty entries gracefully');
  });

  describe('deduplicator', () => {
    it('detects duplicate entries above 0.90 similarity');
    it('compares new entries against existing knowledge base');
    it('does not flag genuinely different entries');
    it('handles missing embeddings gracefully');
  });

  describe('crawler', () => {
    it('parses sitemap.xml for URLs');
    it('falls back to homepage links');
    it('scores URLs for relevance');
    it('filters out login and booking pages');
    it('caps results at 50 URLs');
  });

  describe('source-tracking', () => {
    it('returns sources grouped by domain');
    it('returns entry count and last imported timestamp per URL');
    it('excludes manual entries (source_url IS NULL)');
    it('filters knowledge base entries by source URL');
  });

  describe('integration', () => {
    it('full flow: discover → fetch → extract → Q&A → dedup → import');
    it('stores source_url and source_entry_id');
    it('re-scrape detects existing entries');
  });
});
```

---

## Future Enhancements

- [ ] **Scheduled Re-scrape**: Periodic re-import to catch website changes
- [ ] **PDF & Menu Parsing**: Extract content from linked PDFs and menu images
- [ ] **Multi-language Detection**: Tag entries by language, import into correct locale
- [ ] **Headless Browser Mode**: Puppeteer/Playwright for JS-rendered sites
- [ ] **Bulk Domain Import**: Import from multiple hotel properties at once
- [ ] **Change Diffing**: Show what changed since last scrape per URL

---

## Verification Checklist

```bash
# After implementation
pnpm typecheck
pnpm test
pnpm lint

# Manual testing — Sub-phase A
1. Dashboard → Tools → Site Scraper
2. Enter hotel URL → Fetch
3. Verify clean text extraction (no HTML tags)
4. Click Process → verify AI-extracted entries with categories
5. Verify Q&A pairs generated per entry
6. Scrape overlapping page → verify dedup warnings
7. Import → verify source_url stored in knowledge_base
8. Test AI responses use new Q&A content
9. Verify "Previously Imported" panel shows scraped URLs with counts
10. Click ↻ on a source → verify URL pre-filled, flow restarts
11. Knowledge Base → verify Globe icon on scraped entries
12. Knowledge Base → filter "Scraped" → verify only scraped entries shown

# Manual testing — Sub-phase B
1. Dashboard → Tools → Site Scraper → "Discover Pages"
2. Enter domain → click Discover
3. Verify URLs listed with relevance scores
4. Select relevant pages → click "Fetch Selected"
5. Verify flow continues into existing process → review → import
```
