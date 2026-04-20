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
- [ ] Slice 2: Why we proxy API keys through serverless instead of calling Groq directly from React
- [ ] Slice 2: What a system prompt is and how to write one that produces consistent output
- [ ] Slice 3: How to model state that changes over time (open → closed trades, win/loss tracking)
- [ ] Slice 4: What base64 encoding is and why images need it for API calls

---

## Project Overview
A personal forex learning tool for a single user (55yo, Bangalore).
Bridges 30yr macro/geopolitics knowledge to forex concepts. Not a trading platform — a **learning + journaling** tool.

**Live URL:** TBD (deploy to Vercel next)
**Repo:** TBD

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
- [ ] **Slice 2** — Headline Decoder (Groq text)
- [ ] **Slice 3** — Hypothesis Tracker + Win/Loss chart
- [ ] **Slice 4** — Chart Companion (Gemini vision, Kite screenshot upload)

---

## Slice 1 — What Was Built
**Stack decisions locked in this slice:**
- Tailwind v4 (not v3) — configured via `@tailwindcss/vite` plugin, no `tailwind.config.js`
- shadcn init requires `paths` alias in both `tsconfig.json` AND `tsconfig.app.json` (both need `"ignoreDeprecations": "6.0"`)
- React 18 must be pinned (`npm install react@18 ...`) BEFORE running `npx shadcn@latest init` to avoid peer dep conflict
- All badge/status colors use lookup objects — Tailwind v4 tree-shakes dynamically constructed class strings

**Files created:**
```
src/
  App.tsx               — useState routing (no React Router), PinGate → Layout
  components/
    PinGate.tsx         — 4-box PIN input, shake animation, sessionStorage auth
    Layout.tsx          — nav header (Dashboard / Journal), sign out
    TradeForm.tsx       — pair select, direction toggle, entry fields, Supabase insert
    TradeList.tsx       — Supabase fetch, Tabs (All/Open/Closed), trade cards
    ui/                 — shadcn: button card badge select textarea input tabs label
  pages/
    Dashboard.tsx       — welcome + 3 stat cards (Total, Open, Last Entry)
    Journal.tsx         — TradeForm + TradeList with refreshKey bridge
  lib/
    supabase.ts         — createClient with env var guard (throws on missing vars)
    utils.ts            — cn() helper (written by shadcn init)
api/
  ai.ts                 — Vercel Pages Router stub, returns { message: 'AI coming in Slice 2' }
vercel.json             — /api/* rewrite rule
.env.local.example      — template with all required keys documented
```

**Supabase trades table:** created manually in dashboard — see original spec for SQL.
**RLS policy:** `allow all using (true)` — tighten in Slice 3 before sharing URL.

---

## Key Pairs
USD/INR (primary), EUR/USD, USD/JPY, GBP/USD, AUD/USD, USD/CAD, XAU/USD

---

## Session Log
| Date | What was done |
|---|---|
| 2026-04-20 | CLAUDE.md created. Slice 1 spec finalized. Stack locked. |
| 2026-04-20 | Slice 1 fully built and tested: Vite scaffold, Tailwind v4, shadcn/ui, PinGate, TradeForm (Supabase insert confirmed), TradeList (filter tabs, live refresh), Dashboard (stat cards), /api/ai.ts stub, vercel.json, .env.local.example. Production build passing. |

---

## Current Status
**Slice 1 complete.**
**Next:** Push to GitHub, deploy to Vercel, then spec Slice 2 (Headline Decoder).
