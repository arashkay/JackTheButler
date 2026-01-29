# Phase 11.1: Site Scraper Tool

**Version:** 1.2.0
**Codename:** Knowledge Harvester
**Focus:** Auto-import knowledge base from hotel websites
**Depends on:** Phase 10 (Core complete)

---

## Goal

Build a **Site Scraper** tool that allows hotels to quickly populate their knowledge base by scraping their existing website (FAQ pages, amenities, policies, etc.). This dramatically reduces onboarding time from hours of manual entry to minutes of automated import.

---

## What You Can Test

After completing this phase, test these scenarios:

### 1. Single URL Scrape
Dashboard → Tools → Site Scraper:
```
Enter URL: https://example-hotel.com/faq
Click: "Fetch Content"
Expected:
- Page is fetched and parsed
- Content sections are extracted
- Preview shows extracted entries
```

### 2. Multi-URL Scrape
Add multiple URLs:
```
URLs:
- https://example-hotel.com/faq
- https://example-hotel.com/amenities
- https://example-hotel.com/policies

Click: "Fetch All"
Expected:
- All pages fetched in sequence
- Combined preview of all entries
- Duplicates detected and flagged
```

### 3. AI Categorization
After fetching content:
```
Click: "Process with AI"
Expected:
- Each entry gets a category (faq, amenity, policy, service, dining)
- Titles are extracted or generated
- Keywords are generated
- Content is cleaned and structured
```

### 4. Preview & Edit
Before importing:
```
Expected:
- See all entries in a table
- Edit title, content, category inline
- Delete unwanted entries
- Reorder by priority
```

### 5. Import to Knowledge Base
Click "Import Selected":
```
Expected:
- Entries saved to knowledge_base table
- Embeddings generated for vector search
- Success message with count
- Knowledge base page shows new entries
```

### 6. Re-scrape & Update
Scrape same URL again:
```
Expected:
- Detect existing entries by URL/title
- Option to: Skip, Update, or Create duplicate
- Show diff of changed content
```

---

## Architecture

### Extension Structure

```
src/extensions/tools/
└── site-scraper/
    ├── index.ts           # Extension exports
    ├── manifest.ts        # Extension manifest
    ├── scraper.ts         # Core scraping logic
    ├── parser.ts          # HTML parsing & extraction
    ├── processor.ts       # AI content processing
    └── routes.ts          # API endpoints
```

### Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Dashboard │────▶│  API Route  │────▶│   Scraper   │
│   (React)   │     │   (Hono)    │     │   (fetch)   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Knowledge  │◀────│  Processor  │◀────│   Parser    │
│    Base     │     │    (AI)     │     │  (cheerio)  │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## Tasks

### 1. Extension Setup

- [ ] Create `src/extensions/tools/` directory structure
- [ ] Create tool extension types in `src/extensions/types.ts`:
  ```typescript
  export interface ToolExtensionManifest extends BaseExtensionManifest {
    category: 'tool';
    // Tool-specific UI route
    dashboardRoute?: string;
  }
  ```
- [ ] Create `src/extensions/tools/site-scraper/manifest.ts`:
  ```typescript
  export const manifest: ToolExtensionManifest = {
    id: 'tool-site-scraper',
    name: 'Site Scraper',
    category: 'tool',
    version: '1.0.0',
    description: 'Import knowledge base from hotel website',
    icon: 'Globe',
    dashboardRoute: '/tools/site-scraper',
    configSchema: [],
  };
  ```

### 2. Scraper Core

- [ ] Create `src/extensions/tools/site-scraper/scraper.ts`:
  ```typescript
  export interface ScrapeOptions {
    url: string;
    selector?: string;        // CSS selector to target specific content
    excludeSelectors?: string[]; // Skip nav, footer, etc.
    timeout?: number;
  }

  export interface ScrapeResult {
    url: string;
    title: string;
    content: string;
    html: string;
    fetchedAt: string;
    error?: string;
  }

  export async function scrapeUrl(options: ScrapeOptions): Promise<ScrapeResult>;
  export async function scrapeUrls(urls: string[]): Promise<ScrapeResult[]>;
  ```

- [ ] Implement fetching with:
  - User-Agent header (identify as Butler bot)
  - Timeout handling (default 10s)
  - Redirect following
  - Error handling for 404, 500, etc.
  - Rate limiting between requests

### 3. HTML Parser

- [ ] Create `src/extensions/tools/site-scraper/parser.ts`:
  ```typescript
  export interface ParsedContent {
    title: string;
    sections: ContentSection[];
    metadata: {
      description?: string;
      keywords?: string[];
      language?: string;
    };
  }

  export interface ContentSection {
    heading?: string;
    content: string;
    type: 'paragraph' | 'list' | 'table' | 'faq';
  }

  export function parseHtml(html: string, options?: ParseOptions): ParsedContent;
  ```

- [ ] Implement parsing with cheerio:
  - Extract page title from `<title>` or `<h1>`
  - Extract meta description and keywords
  - Find main content area (article, main, .content, etc.)
  - Split by headings (h2, h3) into sections
  - Clean text (remove extra whitespace, scripts, styles)
  - Detect FAQ patterns (Q&A, accordion, dl/dt/dd)
  - Extract lists and tables

### 4. AI Processor

- [ ] Create `src/extensions/tools/site-scraper/processor.ts`:
  ```typescript
  export interface ProcessedEntry {
    category: 'faq' | 'policy' | 'amenity' | 'service' | 'dining' | 'room_type' | 'local_info';
    title: string;
    content: string;
    keywords: string[];
    priority: number;
    sourceUrl: string;
    confidence: number;
  }

  export async function processContent(
    sections: ContentSection[],
    context?: { hotelName?: string }
  ): Promise<ProcessedEntry[]>;
  ```

- [ ] Implement AI processing:
  - Use Claude to categorize content
  - Generate concise titles
  - Extract/generate keywords
  - Assign priority based on category
  - Clean and format content
  - Merge related sections

- [ ] AI Prompt template:
  ```
  You are processing hotel website content for a knowledge base.

  For each section, determine:
  1. Category: faq, policy, amenity, service, dining, room_type, local_info
  2. Title: Concise, descriptive title (max 50 chars)
  3. Keywords: 5-10 search keywords
  4. Priority: 1-10 (10 = most important)

  Content to process:
  {sections}

  Return JSON array of entries.
  ```

### 5. API Routes

- [ ] Create `src/extensions/tools/site-scraper/routes.ts`:
  ```typescript
  // POST /api/v1/tools/site-scraper/fetch
  // Body: { urls: string[], options?: ScrapeOptions }
  // Returns: { results: ScrapeResult[] }

  // POST /api/v1/tools/site-scraper/process
  // Body: { content: ScrapeResult[], options?: ProcessOptions }
  // Returns: { entries: ProcessedEntry[] }

  // POST /api/v1/tools/site-scraper/import
  // Body: { entries: ProcessedEntry[] }
  // Returns: { imported: number, skipped: number, errors: string[] }

  // GET /api/v1/tools/site-scraper/preview?url=...
  // Returns: Quick preview of what can be scraped
  ```

- [ ] Register routes in gateway:
  ```typescript
  // src/gateway/routes/api.ts
  import { siteScraperRoutes } from '@/extensions/tools/site-scraper/routes.js';
  api.route('/tools/site-scraper', siteScraperRoutes);
  ```

### 6. Dashboard UI

- [ ] Create `apps/dashboard/src/pages/tools/SiteScraper.tsx`:
  - URL input (single or multiple)
  - "Fetch" button with loading state
  - Raw content preview
  - "Process with AI" button
  - Processed entries table with:
    - Checkbox for selection
    - Category badge
    - Title (editable)
    - Content preview (expandable)
    - Keywords (editable)
    - Delete button
  - "Import Selected" button
  - Progress/success/error feedback

- [ ] Add route to App.tsx:
  ```typescript
  <Route path="/tools/site-scraper" element={<SiteScraperPage />} />
  ```

- [ ] Add to navigation (Layout.tsx):
  ```typescript
  // Under Settings or as new "Tools" section
  { path: '/tools/site-scraper', label: 'Site Scraper', icon: <Globe /> }
  ```

### 7. Knowledge Base Integration

- [ ] Create import function in `src/services/knowledge.ts`:
  ```typescript
  export async function importKnowledgeEntries(
    entries: ProcessedEntry[]
  ): Promise<{ imported: number; skipped: number }>;
  ```

- [ ] Handle duplicates:
  - Check by title similarity
  - Check by content hash
  - Option to update existing or skip

- [ ] Generate embeddings for new entries:
  - Call embedding API
  - Store in knowledge_embeddings table

---

## Default Exclude Selectors

```typescript
const DEFAULT_EXCLUDE = [
  'nav', 'header', 'footer',
  '.navigation', '.nav', '.menu',
  '.sidebar', '.widget',
  '.cookie-banner', '.popup',
  '.social-share', '.comments',
  'script', 'style', 'noscript',
  '[role="navigation"]',
  '[aria-hidden="true"]',
];
```

---

## Error Handling

| Error | Handling |
|-------|----------|
| 404 Not Found | Skip URL, show warning |
| 403 Forbidden | Skip URL, suggest checking robots.txt |
| Timeout | Retry once, then skip with warning |
| Invalid HTML | Attempt parsing, warn about quality |
| Rate Limited | Back off, retry with delay |
| Empty Content | Skip, warn "no content found" |

---

## Testing

```typescript
describe('Site Scraper', () => {
  describe('scraper', () => {
    it('fetches URL and returns HTML');
    it('handles 404 gracefully');
    it('respects timeout');
    it('follows redirects');
  });

  describe('parser', () => {
    it('extracts title from h1');
    it('splits content by headings');
    it('detects FAQ patterns');
    it('removes navigation elements');
  });

  describe('processor', () => {
    it('categorizes FAQ content');
    it('generates keywords');
    it('assigns priorities');
  });

  describe('import', () => {
    it('creates knowledge base entries');
    it('detects duplicates');
    it('generates embeddings');
  });
});
```

---

## Future Enhancements

- [ ] **Sitemap Support**: Auto-discover pages from sitemap.xml
- [ ] **Scheduled Re-scrape**: Periodic updates to catch changes
- [ ] **Diff View**: Show what changed since last scrape
- [ ] **PDF Support**: Extract content from PDF links
- [ ] **Multi-language**: Detect and tag content language
- [ ] **Headless Browser**: Puppeteer option for JS-heavy sites

---

## Verification Checklist

```bash
# After implementation
pnpm typecheck
pnpm test

# Manual testing
1. Dashboard → Tools → Site Scraper
2. Enter hotel FAQ URL
3. Click Fetch → verify content preview
4. Click Process → verify AI categorization
5. Edit entries as needed
6. Click Import → verify knowledge base updated
7. Test AI responses use new knowledge
```
