import type { VercelRequest, VercelResponse } from '@vercel/node'

// GROQ_API_KEY and EIA_API_KEY have no VITE_ prefix — they never leave the server.
// Vite only exposes VITE_* vars to the browser bundle; plain vars are server-only.

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MarketSnapshot {
  usdInr:   number | null
  eurUsd:   number | null
  usdJpy:   number | null
  usdCad:   number | null
  usdAud:   number | null
  wtiPrice: number | null
  wtiDate:  string | null
  fetchedAt: string
}

export interface DecoderAnalysis {
  pair:         string
  direction:    'bullish' | 'bearish' | 'neutral'
  confidence:   'high' | 'medium' | 'low'
  summary:      string
  macro_link:   string
  what_to_watch: string
}

export interface DecoderResponse {
  analysis:       DecoderAnalysis
  marketSnapshot: MarketSnapshot
}

interface FrankfurterResponse {
  rates: Record<string, number>
}

interface EiaDataPoint {
  period: string
  value:  number | string | null
}

interface EiaResponse {
  response: {
    data: EiaDataPoint[]
  }
}

interface GroqChoice {
  message: { content: string }
}

interface GroqApiResponse {
  choices: GroqChoice[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, timeoutMs = 3000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function fetchFrankfurterUsd(): Promise<Partial<MarketSnapshot>> {
  const res = await fetchWithTimeout(
    'https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR,JPY,CAD,AUD',
  )
  if (!res.ok) return {}
  const data = (await res.json()) as FrankfurterResponse
  return {
    usdInr: data.rates['INR'] ?? null,
    usdJpy: data.rates['JPY'] ?? null,
    usdCad: data.rates['CAD'] ?? null,
    usdAud: data.rates['AUD'] ?? null,
  }
}

async function fetchFrankfurterEur(): Promise<Partial<MarketSnapshot>> {
  const res = await fetchWithTimeout(
    'https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD',
  )
  if (!res.ok) return {}
  const data = (await res.json()) as FrankfurterResponse
  return { eurUsd: data.rates['USD'] ?? null }
}

async function fetchEia(apiKey: string): Promise<Partial<MarketSnapshot>> {
  const url =
    `https://api.eia.gov/v2/petroleum/pri/spt/data/` +
    `?api_key=${apiKey}&frequency=daily&data[0]=value&facets[series][]=RWTC` +
    `&sort[0][column]=period&sort[0][direction]=desc&offset=0&length=1`
  const res = await fetchWithTimeout(url)
  if (!res.ok) return {}
  const data = (await res.json()) as EiaResponse
  const latest = data.response?.data?.[0]
  if (!latest) return {}
  // EIA returns "--" as a string on days with no data — parse defensively
  const raw = latest.value
  const price = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''))
  return {
    wtiPrice: Number.isFinite(price) ? price : null,
    wtiDate:  latest.period ?? null,
  }
}

function fmt(n: number | null, decimals = 2): string {
  return n != null ? n.toFixed(decimals) : 'unavailable'
}

function buildMarketContext(s: MarketSnapshot): string {
  const oil = s.wtiPrice != null
    ? `$${s.wtiPrice.toFixed(2)}/barrel (as of ${s.wtiDate})`
    : 'unavailable'

  return `LIVE MARKET DATA (fetched at ${s.fetchedAt}):
Currency Rates:
- USD/INR: ${fmt(s.usdInr, 2)}
- EUR/USD: ${fmt(s.eurUsd, 4)}
- USD/JPY: ${fmt(s.usdJpy, 2)}
- USD/CAD: ${fmt(s.usdCad, 4)}
- USD/AUD: ${fmt(s.usdAud, 4)}

Commodity:
- WTI Crude Oil: ${oil}

Context: India imports ~85% of its oil. Every $10 rise in crude increases India's import bill by ~$15 billion/year, putting depreciation pressure on INR.`
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a forex education assistant for a 55-year-old Indian businessman named Rajesh who has 30 years of experience selling electrical infrastructure — transformers, high-tension cables, RMUs — across India. He deeply understands global oil markets, US-India trade, geopolitics, and macroeconomics. He is learning forex trading and needs plain-language explanations that connect to concepts he already knows.

You will be given:
1. A news headline
2. Live market data fetched right now

REASONING PROCESS — think through these steps before answering:
- Which currency pairs does this headline most directly affect?
- Is the effect bullish or bearish on USD, INR, or both?
- How confident are you given the headline's specificity?
- What does the live market data tell you about current positioning?
- What analogy from energy infrastructure would help him understand?

FEW-SHOT EXAMPLES:

Example 1:
Headline: "US Federal Reserve signals no rate cuts in 2025"
Live data: USD/INR: 84.20, WTI: $87/barrel
Reasoning: Fed holding rates → dollar stays strong → capital stays in US → less flow to emerging markets → INR weakens. Current USD/INR at 84.20 suggests market already partially priced this in.
Output:
{
  "pair": "USD/INR",
  "direction": "bullish",
  "confidence": "high",
  "summary": "When the Fed holds rates high, the US dollar becomes more attractive to global investors seeking yield. Money flows into dollar assets and out of emerging market currencies like the rupee. With USD/INR already at 84.20, this confirms the dollar's strength.",
  "macro_link": "Think of it like demand for your transformers when a new power grid project is announced — capital flows where returns are highest, and right now the US is that project.",
  "what_to_watch": "Watch the next RBI meeting — if RBI holds rates too, the rupee pressure may ease slightly."
}

Example 2:
Headline: "OPEC+ agrees to cut oil production by 1 million barrels/day"
Live data: USD/INR: 83.80, WTI: $82/barrel
Reasoning: Oil supply cut → crude price rises → India's import bill increases → more dollars needed to buy oil → rupee demand falls → INR depreciates. Direct impact on USD/INR bullish.
Output:
{
  "pair": "USD/INR",
  "direction": "bullish",
  "confidence": "high",
  "summary": "India imports 85% of its oil. When OPEC cuts supply, crude prices rise, and India needs more dollars to pay for the same amount of oil. This increases demand for dollars and puts selling pressure on the rupee.",
  "macro_link": "You know how transformer copper prices affect your project costs — same principle. When your key input gets more expensive and you cannot reduce consumption, your margins compress. India cannot stop buying oil, so rupee takes the hit.",
  "what_to_watch": "Track Brent crude — if it breaks $90/barrel, expect USD/INR to test 85."
}

Now analyze the headline given by the user using the live market data provided. Think step by step. Then output ONLY valid JSON matching this exact schema — no preamble, no markdown, no explanation outside the JSON:
{
  "pair": "most affected pair e.g. USD/INR",
  "direction": "bullish | bearish | neutral",
  "confidence": "high | medium | low",
  "summary": "2-3 sentences, plain language, references live rates",
  "macro_link": "1 sentence using energy/infrastructure analogy",
  "what_to_watch": "1 concrete thing to monitor next"
}`

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = req.body as { headline?: string }
  const headline = body?.headline?.trim()
  if (!headline) {
    return res.status(400).json({ error: 'headline is required' })
  }

  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured on the server' })
  }

  // ── Step 1: fetch live market data in parallel, fail gracefully ─────────────
  const eiaKey = process.env.EIA_API_KEY

  const [fxUsd, fxEur, eia] = await Promise.all([
    fetchFrankfurterUsd().catch((): Partial<MarketSnapshot> => ({})),
    fetchFrankfurterEur().catch((): Partial<MarketSnapshot> => ({})),
    eiaKey ? fetchEia(eiaKey).catch((): Partial<MarketSnapshot> => ({})) : Promise.resolve<Partial<MarketSnapshot>>({}),
  ])

  const snapshot: MarketSnapshot = {
    usdInr:    fxUsd.usdInr    ?? null,
    eurUsd:    fxEur.eurUsd    ?? null,
    usdJpy:    fxUsd.usdJpy    ?? null,
    usdCad:    fxUsd.usdCad    ?? null,
    usdAud:    fxUsd.usdAud    ?? null,
    wtiPrice:  eia.wtiPrice    ?? null,
    wtiDate:   eia.wtiDate     ?? null,
    fetchedAt: new Date().toISOString(),
  }

  // ── Step 2: build grounded context ─────────────────────────────────────────
  const marketContext = buildMarketContext(snapshot)

  // ── Step 3: call Groq ───────────────────────────────────────────────────────
  let groqRes: Response
  try {
    groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model:      'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens:  800,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: `Headline: ${headline}\n\n${marketContext}` },
        ],
      }),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error reaching Groq'
    console.error('[ai] Groq fetch error:', msg)
    return res.status(502).json({ error: msg })
  }

  if (!groqRes.ok) {
    const text = await groqRes.text()
    console.error('[ai] Groq HTTP error:', groqRes.status, text)
    return res.status(502).json({ error: `Groq returned ${groqRes.status}: ${text}` })
  }

  const groqData = (await groqRes.json()) as GroqApiResponse
  const content  = groqData.choices[0]?.message?.content ?? ''

  if (!content) {
    return res.status(502).json({ error: 'Empty response from Groq' })
  }

  // ── Step 4: parse JSON robustly ─────────────────────────────────────────────
  // Strip markdown fences, then extract the first {...} block — handles
  // models that output chain-of-thought text before the JSON object.
  const stripped  = content.replace(/^```(?:json)?\n?/im, '').replace(/\n?```$/im, '').trim()
  const jsonStart = stripped.indexOf('{')
  const jsonEnd   = stripped.lastIndexOf('}')

  if (jsonStart === -1 || jsonEnd < jsonStart) {
    console.error('[ai] No JSON object in model response:', stripped.slice(0, 300))
    return res.status(502).json({ error: 'Model did not return a JSON object', raw: stripped.slice(0, 300) })
  }

  let analysis: DecoderAnalysis
  try {
    analysis = JSON.parse(stripped.slice(jsonStart, jsonEnd + 1)) as DecoderAnalysis
  } catch (err) {
    console.error('[ai] JSON parse failed:', err)
    return res.status(502).json({ error: 'Failed to parse model JSON' })
  }

  // ── Step 5: return analysis + snapshot ─────────────────────────────────────
  const response: DecoderResponse = { analysis, marketSnapshot: snapshot }
  return res.status(200).json(response)
}
