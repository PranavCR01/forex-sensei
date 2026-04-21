# forex-sensei — CLAUDE.md
> Update this file at the start of every Claude Code session with progress, decisions, and what's next.
> Keep this file under 150 lines.

---

## Claude Code Workflow Rules
1. **Always `/plan` before coding.** Plan all files, deps, and risk points first. Wait for approval.
2. **One step at a time.** Don't move to the next step until the previous one compiles cleanly.
3. **After each step, explain it.** 3-bullet explanation: problem solved, how it works, one risk.
4. **Update CLAUDE.md** at the end of every session — session log + current status.
5. **`/compact` regularly** to manage token context on long sessions.

---

## Learning Goals (Pranav)
**Concepts to master, slice by slice:**
- [x] Slice 1: How React state flows through a real app (PinGate → App → pages)
- [x] Slice 1: Why env vars have VITE_ prefix for some and not others (client vs server boundary)
- [x] Slice 1: What Supabase RLS actually does and why it matters even for one user
- [x] Slice 1: How Vercel serverless functions work — what a request/response cycle looks like
- [x] Slice 2: Why we proxy API keys through serverless instead of calling Groq directly from React
- [x] Slice 2: What a system prompt is and how to write one that produces consistent output (chain-of-thought + few-shot)
- [ ] Slice 2b: How Promise.all with AbortController handles parallel fetches with graceful degradation
- [ ] Slice 2b: Why API endpoints change and how to debug a 404 on a third-party API (check changelog, try v1 vs v2, read raw response)
- [ ] Slice 2c: In-memory caching pattern — cache-then-fetch, TTL check, stale-on-error fallback
- [x] Slice 3: How to model state that changes over time (open → closed trades, win/loss tracking)
- [ ] Slice 3: How recharts works — ResponsiveContainer, BarChart, Cell for per-bar color, controlled data shape
- [ ] Slice 3: Derived state vs stored state — computing win rate client-side from raw data vs storing it in the DB
- [ ] Slice 4: What base64 encoding is and why images need it for API calls

---

## Project Overview
A personal forex learning tool for a single user (55yo, Bangalore).
Bridges 30yr macro/geopolitics knowledge to forex concepts. Not a trading platform — a **learning + journaling** tool.

**Live URL:** https://forex-sensei.vercel.app
**Repo:** https://github.com/PranavCR01/forex-sensei

---

## Tech Stack
| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind v4 + shadcn/ui (New York) |
| Backend | Vercel serverless functions (`/api/*`) |
| Database | Supabase (PostgreSQL + RLS — allow all policy for now) |
| Auth | PIN-based, `VITE_APP_PIN`, sessionStorage, single user |
| AI — text | Groq API (Llama 3.3 70B) — Slice 2 |
| AI — vision | Google Gemini 2.5 Flash — Slice 4 |
| Hosting | Vercel (frontend + serverless) |

---

## AI Model Routing
| Feature | Model | API |
|---|---|---|
| Headline decoder | llama-3.3-70b-versatile | Groq |
| Trade journal summaries | llama-3.3-70b-versatile | Groq |
| Chart companion (image) | gemini-2.5-flash | Google AI Studio |
| Weekly insight synthesis | gemini-2.5-flash | Google AI Studio |

---

## Slice Plan
- [x] **Slice 1** — Foundation + Trade Journal ✓
- [x] **Slice 2** — Headline Decoder (Groq text) ✓
- [x] **Slice 2b** — Grounded Decoder (live Frankfurter + EIA data) ✓
- [x] **Slice 3** — Hypothesis Tracker + Win/Loss chart ✓
- [ ] **Slice 4** — Chart Companion (Gemini vision, Kite screenshot upload)

---

## Slice 1 — What Was Built
**Stack decisions locked in this slice:**
- Tailwind v4 — configured via `@tailwindcss/vite` plugin, no `tailwind.config.js`
- shadcn init requires `paths` alias in both `tsconfig.json` AND `tsconfig.app.json` (both need `"ignoreDeprecations": "6.0"`)
- React 18 must be pinned BEFORE `npx shadcn@latest init` to avoid peer dep conflict
- All badge/status colors use lookup objects — Tailwind v4 tree-shakes dynamic class strings

**Key files:** `PinGate.tsx`, `TradeForm.tsx`, `TradeList.tsx`, `Dashboard.tsx`, `Journal.tsx`, `Layout.tsx`, `lib/supabase.ts`, `api/ai.ts` (stub), `vercel.json`, `.env.local.example`

**Supabase trades table:** created manually in dashboard. **RLS:** `allow all using (true)` — tighten before sharing URL.

---

## Slice 2 + 2b — What Was Built
- `api/ai.ts` — Groq handler (llama-3.3-70b-versatile), chain-of-thought + few-shot system prompt, JSON extraction by `indexOf`/`lastIndexOf`, markdown fence stripping
- Grounded context: parallel `Promise.all` fetches — Frankfurter (forex rates) + EIA (WTI crude) — each with 3s AbortController timeout, graceful null on failure
- Response shape: `{ analysis: DecoderAnalysis, marketSnapshot: MarketSnapshot }`
- `HeadlineDecoder.tsx` — textarea → decode → result card (pair, direction, confidence, summary, macro_link, watch_next) + live data footer
- "Save to Journal" — pre-fills TradeForm via `JournalPrefill` state in App.tsx + key-based remount
- **Vite dev fix:** custom `local-api` plugin in `vite.config.ts` shims Vercel serverless runtime locally — intercepts `/api/*`, loads env from `.env.local` via `loadEnv`, executes handler via `server.ssrLoadModule`

**Known working API URLs:**
- Frankfurter: `https://api.frankfurter.dev/v1/latest` (v1, not v2)
- OilPriceAPI WTI: `https://api.oilpriceapi.com/v1/prices/latest?by_code=WTI_USD` (near-live, ~5min delay)
- EIA WTI: deprecated — switched to OilPriceAPI; EIA was day-stale and required `facets[series][]=RWTC`

**Env vars (server-side, no VITE_ prefix):** `GROQ_API_KEY`, `OIL_PRICE_API_KEY`

---

## Key Pairs
USD/INR (primary), EUR/USD, USD/JPY, GBP/USD, AUD/USD, USD/CAD, XAU/USD

---

## Session Log
| Date | What was done |
|---|---|
| 2026-04-20 | Slice 1 fully built and tested: Vite scaffold, Tailwind v4, shadcn/ui, PinGate, TradeForm (Supabase insert confirmed), TradeList, Dashboard, api stub, vercel.json. |
| 2026-04-20 | Slice 2: Headline Decoder built — Groq wired, HeadlineDecoder page, Save to Journal pre-fill flow. |
| 2026-04-20 | Slice 2b: Grounded context added — parallel Frankfurter + EIA fetches, AbortController timeouts, marketSnapshot returned alongside analysis. Vite local-api plugin built to shim serverless runtime in dev. Two API bugs fixed: Frankfurter /v2/→/v1/, EIA missing facets[series][]=RWTC was returning wrong dataset (diesel instead of WTI). Live data fetch not yet verified — next session starts here. |
| 2026-04-20 | Slice 2b verified: Frankfurter v1 confirmed live (USD/INR=93.07, EUR/USD=1.176), EIA RWTC confirmed live (WTI=$100.72, period=2026-04-13). EIA_API_KEY added to .env.local. Pushed Slice 2+2b to GitHub and redeployed to Vercel. |
| 2026-04-21 | Slice 2c: Replaced EIA (day-stale) with OilPriceAPI (near-live). Added 5-min in-memory WTI cache with stale-on-error fallback. Updated MarketSnapshot (wtiDate→wtiTimestamp). New footer format: "USD/INR: X · WTI: $Y/bbl (live) · fetched HH:MM". Verified locally: WTI=$89.61, USD/INR=93.07. Deployed to Vercel. |
| 2026-04-21 | Slice 3: CloseTradeForm (expand-in-place, outcome toggle, pips, notes), TradeList updated (Close Trade button, inline form, internalRefresh pattern, exit info on closed cards), Performance page (4 stat cards, recharts BarChart with Cell colors, 3 pattern insights, trade review list with expand-to-compare). recharts v3.8.1 installed. |

---

## Current Status
**Slice 3 deployed. Next: Slice 4 — Chart Companion (Gemini vision, Kite screenshot upload).**

**Tech debt:**
- Move shared AI types from `api/ai.ts` import into `src/types/ai.ts` (fragile relative path)
- Tighten Supabase RLS before sharing the live URL
