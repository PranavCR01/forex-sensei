import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Trade {
  id: string
  created_at: string
  pair: string
  direction: string
  entry_price: number | null
  entry_date: string
  reasoning: string | null
  status: string
  outcome: string | null
  pips: number | null
}

// Lookup objects — Tailwind tree-shakes dynamic template-literal classes in production
const directionClass: Record<string, string> = {
  long:  'bg-green-100 text-green-800 border-green-300 hover:bg-green-100',
  short: 'bg-red-100   text-red-800   border-red-300   hover:bg-red-100',
}

const outcomeClass: Record<string, string> = {
  win:     'bg-green-100 text-green-800 border-green-300 hover:bg-green-100',
  loss:    'bg-red-100   text-red-800   border-red-300   hover:bg-red-100',
  neutral: 'bg-gray-100  text-gray-700  border-gray-300  hover:bg-gray-100',
}

const openClass = 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100'
const fallbackClass = 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-100'

function getStatusClass(trade: Trade): string {
  if (trade.status === 'open') return openClass
  return outcomeClass[trade.outcome ?? ''] ?? fallbackClass
}

function getStatusLabel(trade: Trade): string {
  if (trade.status === 'open') return 'Open'
  if (!trade.outcome) return 'Closed'
  return trade.outcome.charAt(0).toUpperCase() + trade.outcome.slice(1)
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

interface Props {
  refreshKey?: number
}

export function TradeList({ refreshKey = 0 }: Props) {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchTrades() {
      setLoading(true)
      setError('')
      const { data, error: fetchError } = await supabase
        .from('trades')
        .select('id, created_at, pair, direction, entry_price, entry_date, reasoning, status, outcome, pips')
        .order('created_at', { ascending: false })

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setTrades(data ?? [])
      }
      setLoading(false)
    }

    fetchTrades()
  }, [refreshKey])

  const open   = trades.filter(t => t.status === 'open')
  const closed = trades.filter(t => t.status === 'closed')

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading trades…</p>
  }

  if (error) {
    return <p className="text-sm text-red-600">Failed to load trades: {error}</p>
  }

  return (
    <Tabs defaultValue="all">
      <TabsList>
        <TabsTrigger value="all">All ({trades.length})</TabsTrigger>
        <TabsTrigger value="open">Open ({open.length})</TabsTrigger>
        <TabsTrigger value="closed">Closed ({closed.length})</TabsTrigger>
      </TabsList>

      {([
        { value: 'all',    list: trades },
        { value: 'open',   list: open   },
        { value: 'closed', list: closed },
      ] as const).map(({ value, list }) => (
        <TabsContent key={value} value={value} className="mt-4 space-y-3">
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No {value === 'all' ? '' : value + ' '}trades yet.
            </p>
          ) : (
            list.map(trade => (
              <Card key={trade.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">
                        {trade.pair}
                      </span>
                      <Badge
                        variant="outline"
                        className={directionClass[trade.direction] ?? fallbackClass}
                      >
                        {trade.direction.charAt(0).toUpperCase() + trade.direction.slice(1)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {trade.entry_price != null && (
                        <span className="text-xs text-muted-foreground">
                          @ {trade.entry_price}
                        </span>
                      )}
                      <Badge
                        variant="outline"
                        className={getStatusClass(trade)}
                      >
                        {getStatusLabel(trade)}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(trade.entry_date)}
                    {trade.pips != null && (
                      <span className="ml-2">· {trade.pips > 0 ? '+' : ''}{trade.pips} pips</span>
                    )}
                  </p>
                </CardHeader>

                {trade.reasoning && (
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {trade.reasoning}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </TabsContent>
      ))}
    </Tabs>
  )
}
