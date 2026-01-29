# Phase 11: Tools

**Version:** 1.2.0
**Codename:** Toolkit
**Focus:** Built-in tools for hotel onboarding and operations
**Depends on:** Phase 10 (Extension Architecture)

---

## Goal

Build a suite of **built-in tools** that help hotels quickly onboard and manage their Butler installation. These tools live in `src/extensions/tools/` and are maintained as part of the core product (not third-party extensions).

---

## Philosophy

While `src/extensions/` contains adapters for external systems (channels, PMS, AI providers), the `tools/` subdirectory contains **first-party utilities** that:

1. **Accelerate onboarding** - Reduce manual data entry
2. **Improve operations** - Automate repetitive tasks
3. **Enhance quality** - Help hotels maintain accurate data

---

## Tools Roadmap

| Sub-Phase | Tool | Purpose |
|-----------|------|---------|
| 11.1 | [Site Scraper](phase-11-1-site-scraper.md) | Import knowledge base from hotel website |
| 11.2 | CSV Importer | Bulk import knowledge entries from spreadsheet |
| 11.3 | PDF Extractor | Extract content from PDF documents |
| 11.4 | Translation Helper | Translate knowledge base to multiple languages |
| 11.5 | Data Validator | Audit and validate knowledge base quality |

---

## Architecture

### Extension Category

Tools are a new extension category alongside `ai`, `channels`, and `pms`:

```
src/extensions/
├── ai/              # AI providers (anthropic, openai, ollama)
├── channels/        # Communication (whatsapp, sms, email)
├── pms/             # Property management systems
└── tools/           # Built-in tools (site-scraper, csv-importer, etc.)
```

### Tool Manifest

```typescript
export interface ToolExtensionManifest extends BaseExtensionManifest {
  category: 'tool';
  dashboardRoute?: string;  // UI route in dashboard
}
```

### Dashboard Integration

Tools appear in the dashboard under a **Tools** section, each with its own dedicated UI page for configuration and operation.

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Onboarding time | Reduce from hours to minutes |
| Knowledge base quality | 90%+ entries with proper categories |
| Staff satisfaction | Self-service without engineering support |

---

## Related Documents

- [Phase 10: Extension Architecture](phase-10-extensions.md)
- [Phase 11.1: Site Scraper](phase-11-1-site-scraper.md)
- [ADR-006: Extension Architecture](../03-architecture/decisions/006-extension-architecture.md)
