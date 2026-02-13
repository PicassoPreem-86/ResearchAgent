# ResearchAgent

AI-powered business intelligence platform. Enter a domain, get a deep research report with SWOT analysis, competitive landscape, strategic recommendations, and personalized outreach.

## Architecture

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion
- **Backend**: Hono server (port 3001) with SSE streaming
- **AI**: OpenAI gpt-4o with JSON response format
- **Scraping**: Cheerio for HTML parsing (homepage, about, careers, pricing, blog, team, news)

## Project Structure

```
src/
├── components/     # React UI components
├── hooks/          # Custom React hooks (useResearch, useDiscover, useTalent, etc.)
├── types/          # TypeScript type definitions (prospect.ts is the central types file)
├── styles/         # Global CSS (index.css with Tailwind)
├── server/         # Hono backend
│   ├── index.ts    # Server entry — MUST import 'dotenv/config' FIRST
│   ├── analyzer.ts # OpenAI analysis (gpt-4o, JSON mode)
│   ├── scraper.ts  # Cheerio web scraping + tech detection + JSON-LD
│   ├── discover.ts # Company discovery (Google, Product Hunt, YC)
│   ├── talent.ts   # Talent intelligence + recruiting outreach
│   ├── bulk.ts     # Bulk domain processing
│   ├── history.ts  # JSON file persistence (data/history.json)
│   ├── icp.ts      # ICP save/load (data/icp.json)
│   └── pdf.ts      # PDF export with pdfkit
└── App.tsx         # Main app with 5 modes: single, compare, discover, talent, bulk
```

## Key Patterns

- All API calls use SSE streaming (`data: {...}\n`) for real-time progress
- Frontend hooks consume SSE via `ReadableStream` and update React state
- `data.stage === 'complete'` with `data.data` carries the final result
- `data.stage === 'error'` carries error messages
- Vite proxies `/api/*` to `localhost:3001` (see vite.config.ts)

## Critical Gotchas

- `import 'dotenv/config'` MUST be the first import in `src/server/index.ts` — OpenAI client initializes at module scope and needs env vars loaded first
- The `@anthropic-ai/sdk` dep in package.json is unused (switched to OpenAI) — can be removed
- `data/` directory is gitignored — history and ICP files are created at runtime
- Scraper text extraction is capped at 15k chars per page to stay within token limits

## Commands

```bash
pnpm dev          # Start both Vite (5173) and Hono (3001) concurrently
pnpm build        # Production build (frontend only)
pnpm preview      # Preview production build
pnpm dev:client   # Vite only
pnpm dev:server   # Hono only
```

## Environment

Requires `.env` with:
```
OPENAI_API_KEY=sk-...
```

## Modes

1. **Research** — Single company deep-dive with template lenses (General, Investor DD, Competitive, Partnership, Sales)
2. **Compare** — Side-by-side comparison of 2-5 companies with dimension scoring and winner analysis
3. **Discover** — Find companies via lookalike search or ICP matching
4. **Talent** — Recruiting intelligence: team extraction, role matching, personalized outreach
5. **Bulk** — Process multiple domains at once with CSV export
