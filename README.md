# forex-sensei

![Vercel](https://img.shields.io/badge/vercel-deployed-black?logo=vercel)
![React](https://img.shields.io/badge/react-18-blue?logo=react)
![TypeScript](https://img.shields.io/badge/typescript-5-blue?logo=typescript)
![Tailwind](https://img.shields.io/badge/tailwind-v4-06B6D4?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/supabase-postgresql-3ECF8E?logo=supabase)
![Groq](https://img.shields.io/badge/groq-llama_3.3_70b-orange)
![License](https://img.shields.io/badge/license-private-red)

A personal forex learning tool built for Rajesh — a 55-year-old businessman with 30 years of experience in electrical infrastructure and deep knowledge of global macro, geopolitics, and energy markets. The app bridges his existing mental model to forex concepts through AI-powered analysis grounded in live market data.

## Live

[forex-sensei.vercel.app](https://forex-sensei.vercel.app)

## What it does

**Trade Journal** — Log trade hypotheses before entering. The core field is "Why do I think this?" — enforcing the habit of writing reasoning before acting.

**Headline Decoder** — Paste any news headline and get a plain-language forex impact analysis grounded on live data: USD/INR rates (Frankfurter), WTI crude (OilPriceAPI), and current news (Finnhub + NewsData.io merged feed with temporal weighting). Uses Groq (Llama 3.3 70B) with chain-of-thought and few-shot prompting.

**Performance Tracker** — Close trades, record outcomes, and track win rate over time. Pattern analysis identifies which macro themes (energy, central bank, trade policy) the user gets right most often.

**Chart Companion** — Upload a Kite/Zerodha chart screenshot. AI identifies the pattern and explains it using analogies from the user's background (energy infrastructure, sales, global affairs). Uses Gemini 2.5 Flash as primary with Groq Llama 4 Scout as fallback.

## Architecture

```
Frontend          Vercel Serverless      External APIs
─────────         ─────────────────      ─────────────
React 18          /api/ai               Groq (text + vision)
Vite + TS    ───► ├── headline handler  Gemini 2.5 Flash
Tailwind v4       │   ├── Frankfurter   OilPriceAPI (WTI)
shadcn/ui         │   ├── OilPriceAPI   Frankfurter (FX rates)
                  │   ├── Finnhub news  Finnhub (general news)
Supabase          │   └── NewsData.io   NewsData.io (targeted)
PostgreSQL   ◄────└── chart handler
(trades +         └── Groq/Gemini
events)
```

## AI Stack

| Feature | Model | Provider |
|---|---|---|
| Headline analysis | Llama 3.3 70B | Groq (free) |
| Chart vision (primary) | Gemini 2.5 Flash | Google AI Studio (free) |
| Chart vision (fallback) | Llama 4 Scout | Groq (free) |

## RAG Pipeline

The headline decoder implements a retrieval-augmented generation pipeline:

1. **Retrieval** — parallel fetch of FX rates, WTI price, Finnhub general news, NewsData.io keyword search
2. **Temporal weighting** — headlines sorted by recency, filtered to 48h, sub-6h headlines weighted as ground truth
3. **Augmentation** — live data injected into Groq prompt alongside few-shot examples and chain-of-thought instruction
4. **Generation** — Groq reasons from current data, not training data assumptions

## Caching Strategy

| Data | TTL | Key |
|---|---|---|
| WTI crude price | 5 min | module-level |
| General news (Finnhub) | 15 min | module-level |
| Targeted news (NewsData) | 30 min | headline hash |
| Chart analysis | 10 min | image hash |

## Slice History

| Slice | Feature | Status |
|---|---|---|
| 1 | Foundation, PIN auth, trade journal | Complete |
| 2 | Headline decoder, Groq integration | Complete |
| 2b | Live data grounding (FX + WTI) | Complete |
| 2c | News grounding (Finnhub + NewsData) | Complete |
| 3 | Hypothesis tracker, performance page | Complete |
| 4 | Chart companion, vision AI | Complete |

## Environment Variables

| Variable | Used in | Description |
|---|---|---|
| VITE_SUPABASE_URL | Client | Supabase project URL |
| VITE_SUPABASE_ANON_KEY | Client | Supabase publishable key |
| VITE_APP_PIN | Client | 4-digit PIN (note: visible in bundle) |
| GROQ_API_KEY | Server | Groq API key |
| GEMINI_API_KEY | Server | Google AI Studio key |
| OIL_PRICE_API_KEY | Server | OilPriceAPI.com key |
| FINNHUB_API_KEY | Server | Finnhub market news key |
| NEWSDATA_API_KEY | Server | NewsData.io targeted search key |

## Local Setup

```bash
git clone https://github.com/PranavCR01/forex-sensei
cd forex-sensei
npm install
cp .env.local.example .env.local
# Fill in all env vars in .env.local
npm run dev
```

Requires Node 18+. The dev server emulates Vercel serverless functions via a custom Vite plugin — no separate backend needed.

## Analytics

User interactions are logged to a Supabase `events` table (event_type + jsonb metadata). Events: trade_logged, trade_closed, headline_decoded, chart_uploaded, tour_started, tour_completed, page_viewed. Analytics fail silently and never affect app functionality.

## Built by

Pranav CR — [github.com/PranavCR01](https://github.com/PranavCR01)

---

*Not financial advice. Educational tool only.*
