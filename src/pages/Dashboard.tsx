import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Stats {
  total: number
  open: number
  lastEntry: string | null
}

function formatToday(): string {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatDate(iso: string): string {
  // Append T00:00:00 to force local-time parsing — bare ISO dates are parsed as UTC
  // and would display as the previous day in IST (UTC+5:30)
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchStats() {
      const { data, error: fetchError } = await supabase
        .from('trades')
        .select('status, entry_date')
        .order('entry_date', { ascending: false })

      if (fetchError) {
        setError(fetchError.message)
        return
      }

      const trades = data ?? []
      setStats({
        total:     trades.length,
        open:      trades.filter(t => t.status === 'open').length,
        lastEntry: trades[0]?.entry_date ?? null,
      })
    }

    fetchStats()
  }, [])

  const statCards = [
    { label: 'Total Trades', value: stats === null ? '—' : String(stats.total) },
    { label: 'Open Trades',  value: stats === null ? '—' : String(stats.open)  },
    { label: 'Last Entry',   value: stats?.lastEntry ? formatDate(stats.lastEntry) : '—' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Good day, Rajesh.
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{formatToday()}</p>
      </div>

      {error && (
        <p className="text-sm text-red-600">Failed to load stats: {error}</p>
      )}

      <div className="grid grid-cols-3 gap-4">
        {statCards.map(({ label, value }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-foreground">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Quick Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p><span className="text-foreground font-medium">Journal</span> — log every trade idea before you enter. Write your reasoning.</p>
          <p><span className="text-foreground font-medium">Decoder</span> — paste any news headline to see how it affects the rupee.</p>
          <p><span className="text-foreground font-medium">Performance</span> — close trades and track your win rate over time.</p>
          <p><span className="text-foreground font-medium">Charts</span> — upload a Kite screenshot; AI explains the pattern in plain language.</p>
          <p className="pt-1 text-xs">Click <span className="text-foreground font-medium">Guided Tour</span> in the nav bar for a full walkthrough.</p>
        </CardContent>
      </Card>
    </div>
  )
}
