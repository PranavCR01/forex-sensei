import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClosedTrade {
  id: string
  pair: string
  direction: 'long' | 'short'
  entry_price: number | null
  exit_price: number | null
  entry_date: string
  exit_date: string | null
  outcome: 'win' | 'loss' | 'neutral'
  pips: number | null
  reasoning: string | null
  notes: string | null
}

interface PerformanceStats {
  totalClosed: number
  winRate: number
  avgPips: number | null
  bestStreak: number
}

interface PatternInsight {
  label: string
  value: string
  sublabel: string
}

interface ChartPoint {
  name: string
  value: number
  outcome: 'win' | 'loss' | 'neutral'
  pair: string
  direction: string
  date: string
}

// ─── Lookup objects (no dynamic Tailwind interpolation) ────────────────────────

const outcomeClass: Record<string, string> = {
  win:     'bg-green-100 text-green-800 border-green-300 hover:bg-green-100',
  loss:    'bg-red-100   text-red-800   border-red-300   hover:bg-red-100',
  neutral: 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100',
}
const fallbackClass = 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-100'

const directionClass: Record<string, string> = {
  long:  'bg-green-100 text-green-800 border-green-300 hover:bg-green-100',
  short: 'bg-red-100   text-red-800   border-red-300   hover:bg-red-100',
}

const barColors: Record<string, string> = {
  win:     '#22c55e',
  loss:    '#ef4444',
  neutral: '#f59e0b',
}

const pipsPositiveClass = 'text-green-700 font-medium'
const pipsNegativeClass = 'text-red-600 font-medium'
const pipsNeutralClass  = 'text-muted-foreground'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeStats(trades: ClosedTrade[]): PerformanceStats {
  const total = trades.length
  const wins  = trades.filter(t => t.outcome === 'win').length
  const withPips = trades.filter(t => t.pips != null)
  const avgPips  = withPips.length > 0
    ? withPips.reduce((sum, t) => sum + (t.pips ?? 0), 0) / withPips.length
    : null

  let bestStreak = 0, current = 0
  for (const t of trades) {
    if (t.outcome === 'win') { current++; bestStreak = Math.max(bestStreak, current) }
    else current = 0
  }

  return {
    totalClosed: total,
    winRate:     total > 0 ? Math.round((wins / total) * 100) : 0,
    avgPips,
    bestStreak,
  }
}

function computePatterns(trades: ClosedTrade[]): PatternInsight[] {
  if (trades.length < 3) return []

  const insights: PatternInsight[] = []

  // Best pair by win count
  const pairMap: Record<string, { wins: number; total: number }> = {}
  for (const t of trades) {
    pairMap[t.pair] ??= { wins: 0, total: 0 }
    pairMap[t.pair].total++
    if (t.outcome === 'win') pairMap[t.pair].wins++
  }
  const bestPairEntry = Object.entries(pairMap).sort((a, b) => b[1].wins - a[1].wins)[0]
  if (bestPairEntry) {
    const [pair, { wins, total }] = bestPairEntry
    const losses = total - wins
    insights.push({
      label:    'Best pair',
      value:    pair,
      sublabel: `${wins} win${wins !== 1 ? 's' : ''}, ${losses} loss${losses !== 1 ? 'es' : ''}`,
    })
  }

  // Direction win rates
  const longWins  = trades.filter(t => t.direction === 'long'  && t.outcome === 'win').length
  const longTotal = trades.filter(t => t.direction === 'long').length
  const shortWins  = trades.filter(t => t.direction === 'short' && t.outcome === 'win').length
  const shortTotal = trades.filter(t => t.direction === 'short').length
  const longPct  = longTotal  > 0 ? Math.round((longWins  / longTotal)  * 100) : 0
  const shortPct = shortTotal > 0 ? Math.round((shortWins / shortTotal) * 100) : 0
  insights.push({
    label:    'Direction bias',
    value:    longPct >= shortPct ? `Long ${longPct}%` : `Short ${shortPct}%`,
    sublabel: `Long: ${longPct}% · Short: ${shortPct}%`,
  })

  // Macro keyword categories
  const categories = [
    { key: 'energy',      label: 'Energy calls',       keywords: ['oil', 'crude', 'opec', 'wti', 'brent', 'petroleum'] },
    { key: 'centralbank', label: 'Central bank calls',  keywords: ['rbi', 'fed', 'federal reserve', 'rate', 'inflation', 'hawkish', 'dovish'] },
    { key: 'trade',       label: 'Trade/macro calls',   keywords: ['tariff', 'trade war', 'import', 'export', 'gdp'] },
  ]
  const catResults = categories.map(cat => {
    let wins = 0, total = 0
    for (const t of trades) {
      const text = ((t.reasoning ?? '') + ' ' + (t.notes ?? '')).toLowerCase()
      if (cat.keywords.some(kw => text.includes(kw))) {
        total++
        if (t.outcome === 'win') wins++
      }
    }
    return { ...cat, wins, total }
  })
  const bestCat = catResults.filter(c => c.total > 0).sort((a, b) => b.wins - a.wins)[0]
  if (bestCat) {
    const losses = bestCat.total - bestCat.wins
    insights.push({
      label:    bestCat.label,
      value:    `${bestCat.wins} win${bestCat.wins !== 1 ? 's' : ''}, ${losses} loss${losses !== 1 ? 'es' : ''}`,
      sublabel: `based on ${bestCat.total} trade${bestCat.total !== 1 ? 's' : ''}`,
    })
  }

  return insights
}

function toChartPoints(trades: ClosedTrade[]): ChartPoint[] {
  return trades.map((t, i) => ({
    name:      `#${i + 1}`,
    value:     t.pips ?? (t.outcome === 'win' ? 1 : t.outcome === 'loss' ? -1 : 0),
    outcome:   t.outcome,
    pair:      t.pair,
    direction: t.direction,
    date:      t.exit_date ?? t.entry_date,
  }))
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short',
  })
}

function getPipsClass(pips: number): string {
  if (pips > 0) return pipsPositiveClass
  if (pips < 0) return pipsNegativeClass
  return pipsNeutralClass
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────

interface TooltipProps {
  active?: boolean
  payload?: Array<{ payload: ChartPoint }>
}

function ChartTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const hasMeaningfulPips = d.value !== 1 && d.value !== -1 && d.value !== 0
  return (
    <div className="bg-background border border-border rounded-md px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-foreground">{d.pair} · {d.direction}</p>
      <p className="text-muted-foreground">{formatDate(d.date)}</p>
      <p className="capitalize text-foreground">
        {d.outcome}
        {hasMeaningfulPips && ` · ${d.value > 0 ? '+' : ''}${d.value} pips`}
      </p>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Performance() {
  const [trades, setTrades]         = useState<ClosedTrade[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchClosed() {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('trades')
        .select('id, pair, direction, entry_price, exit_price, entry_date, exit_date, outcome, pips, reasoning, notes')
        .eq('status', 'closed')
        .order('created_at', { ascending: true })

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setTrades((data ?? []) as ClosedTrade[])
      }
      setLoading(false)
    }
    fetchClosed()
  }, [])

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (error)   return <p className="text-sm text-red-600">Error: {error}</p>

  if (trades.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Performance</h1>
        <div className="py-16 text-center space-y-2">
          <p className="text-foreground font-medium">Close your first trade to start tracking your edge.</p>
          <p className="text-sm text-muted-foreground">
            Go to Journal → open trade → Close Trade to record an outcome.
          </p>
        </div>
      </div>
    )
  }

  const stats    = computeStats(trades)
  const patterns = computePatterns(trades)
  const chart    = toChartPoints(trades)

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Performance</h1>

      {/* ── 1. Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Closed trades', value: String(stats.totalClosed) },
          { label: 'Win rate',      value: `${stats.winRate}%` },
          { label: 'Avg pips',      value: stats.avgPips != null ? `${stats.avgPips > 0 ? '+' : ''}${stats.avgPips.toFixed(1)}` : '—' },
          { label: 'Best streak',   value: `${stats.bestStreak}W` },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-2xl font-semibold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── 2. Win/Loss chart ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Trade results</CardTitle>
          <p className="text-xs text-muted-foreground">
            {trades.some(t => t.pips != null) ? 'Pips per trade' : 'Win (+1) / Loss (−1) per trade'}
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chart} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                {chart.map((entry, i) => (
                  <Cell key={i} fill={barColors[entry.outcome] ?? '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── 3. Pattern insights ── */}
      <div>
        <h2 className="text-base font-semibold mb-3">Your patterns</h2>
        {patterns.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Close at least 3 trades to see your patterns.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {patterns.map(p => (
              <Card key={p.label}>
                <CardContent className="pt-4 pb-3 space-y-0.5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{p.label}</p>
                  <p className="font-semibold text-foreground">{p.value}</p>
                  <p className="text-xs text-muted-foreground">{p.sublabel}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── 4. Trade review list ── */}
      <div>
        <h2 className="text-base font-semibold mb-3">Trade review</h2>
        <div className="space-y-2">
          {trades.slice().reverse().map(trade => {
            const isExpanded = expandedId === trade.id
            return (
              <Card
                key={trade.id}
                className="cursor-pointer"
                onClick={() => setExpandedId(prev => prev === trade.id ? null : trade.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{trade.pair}</span>
                      <Badge variant="outline" className={directionClass[trade.direction] ?? fallbackClass}>
                        {trade.direction.charAt(0).toUpperCase() + trade.direction.slice(1)}
                      </Badge>
                      <Badge variant="outline" className={outcomeClass[trade.outcome] ?? fallbackClass}>
                        {trade.outcome.charAt(0).toUpperCase() + trade.outcome.slice(1)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 text-xs text-muted-foreground">
                      {trade.entry_price != null && (
                        <span>
                          {trade.entry_price}{trade.exit_price != null && ` → ${trade.exit_price}`}
                        </span>
                      )}
                      {trade.pips != null && (
                        <span className={getPipsClass(trade.pips)}>
                          {trade.pips > 0 ? '+' : ''}{trade.pips} pips
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(trade.entry_date)}
                    {trade.exit_date && ` → ${formatDate(trade.exit_date)}`}
                  </p>
                </CardHeader>

                {isExpanded && (trade.reasoning || trade.notes) && (
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                          Your thesis
                        </p>
                        <p className="text-sm text-foreground leading-relaxed">
                          {trade.reasoning ?? <span className="italic text-muted-foreground">No thesis recorded.</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                          What happened
                        </p>
                        <p className="text-sm text-foreground leading-relaxed">
                          {trade.notes ?? <span className="italic text-muted-foreground">No closing notes.</span>}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
