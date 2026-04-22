import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { DecoderResponse, DecoderAnalysis, MarketSnapshot } from '../../api/ai'
import type { JournalPrefill } from '@/App'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const directionClass: Record<string, string> = {
  bullish: 'bg-green-100 text-green-800 border-green-300 hover:bg-green-100',
  bearish: 'bg-red-100   text-red-800   border-red-300   hover:bg-red-100',
  neutral: 'bg-gray-100  text-gray-700  border-gray-300  hover:bg-gray-100',
}
const confidenceClass: Record<string, string> = {
  high:   'bg-blue-100   text-blue-800   border-blue-300   hover:bg-blue-100',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-100',
  low:    'bg-gray-100   text-gray-700   border-gray-300   hover:bg-gray-100',
}
const fallbackClass = 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-100'

const directionToTrade: Record<string, 'long' | 'short'> = {
  bullish: 'long',
  bearish: 'short',
  neutral: 'long',
}

interface ApiError { error: string }
type ApiResponse = DecoderResponse | ApiError
function isError(r: ApiResponse): r is ApiError { return 'error' in r }

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

interface Props {
  onSaveToJournal: (prefill: JournalPrefill) => void
}

export function HeadlineDecoder({ onSaveToJournal }: Props) {
  const [headline, setHeadline]     = useState('')
  const [loading, setLoading]       = useState(false)
  const [result, setResult]         = useState<DecoderResponse | null>(null)
  const [error, setError]           = useState('')
  const [newsExpanded, setNewsExpanded] = useState(false)

  async function handleDecode() {
    if (!headline.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    setNewsExpanded(false)

    try {
      const res = await fetch('/api/ai', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ headline }),
      })

      const contentType = res.headers.get('content-type') ?? ''
      if (!contentType.includes('application/json')) {
        const text = await res.text()
        setError(
          `Server returned ${res.status} (${contentType || 'no content-type'}).` +
          (text ? ` Body: ${text.slice(0, 200)}` : ' Empty body — is the dev server running with the local-api plugin?')
        )
        return
      }

      const data = (await res.json()) as ApiResponse
      isError(data) ? setError(data.error) : setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  function handleSave() {
    if (!result) return
    onSaveToJournal({
      pair:      result.analysis.pair,
      direction: directionToTrade[result.analysis.direction] ?? 'long',
      reasoning: result.analysis.summary,
    })
  }

  const a: DecoderAnalysis | undefined = result?.analysis
  const m: MarketSnapshot | undefined  = result?.marketSnapshot

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Headline Decoder</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Paste any headline — get a plain-language forex impact analysis grounded on live market data.
        </p>
      </div>

      <div className="space-y-3">
        <Label htmlFor="headline">Headline</Label>
        <Textarea
          id="headline"
          rows={3}
          placeholder="Paste any news headline — RBI policy, oil prices, US Fed, trade wars, anything global..."
          value={headline}
          onChange={e => setHeadline(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleDecode() }}
        />
        <Button onClick={handleDecode} disabled={loading || !headline.trim()}>
          {loading ? 'Connecting the dots…' : 'Decode'}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      {a && m && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{a.pair}</CardTitle>
              <Badge variant="outline" className={directionClass[a.direction] ?? fallbackClass}>
                {a.direction.charAt(0).toUpperCase() + a.direction.slice(1)}
              </Badge>
              <Badge variant="outline" className={confidenceClass[a.confidence] ?? fallbackClass}>
                {a.confidence.charAt(0).toUpperCase() + a.confidence.slice(1)} confidence
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-sm text-foreground leading-relaxed">{a.summary}</p>

            <div className="border-l-2 border-border pl-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Macro link</p>
              <p className="text-sm text-muted-foreground italic">{a.macro_link}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Watch next</p>
              <p className="text-sm text-muted-foreground">{a.what_to_watch}</p>
            </div>

            <div className="pt-1 border-t border-border space-y-2">
              <p className="text-xs text-muted-foreground">
                {[
                  m.usdInr   != null ? `USD/INR: ${m.usdInr.toFixed(2)}`           : null,
                  m.wtiPrice != null ? `WTI: $${m.wtiPrice.toFixed(2)}/bbl (live)` : null,
                  `fetched ${formatTime(m.fetchedAt)}`,
                ].filter(Boolean).join(' · ')}
              </p>

              {/* News context toggle */}
              {m.newsHeadlines.length > 0 && (
                <div>
                  <button
                    onClick={() => setNewsExpanded(v => !v)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {newsExpanded
                      ? <ChevronUp className="h-3 w-3" />
                      : <ChevronDown className="h-3 w-3" />
                    }
                    News context used ({m.newsHeadlines.length} headlines from Finnhub + NewsData.io)
                  </button>
                  {newsExpanded && (
                    <ol className="mt-2 space-y-1 pl-1">
                      {m.newsHeadlines.map((h, i) => (
                        <li key={i} className="text-xs text-muted-foreground/70 leading-snug">
                          {i + 1}. {h}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}
            </div>

            <Button variant="outline" size="sm" onClick={handleSave}>
              Save to Journal
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
