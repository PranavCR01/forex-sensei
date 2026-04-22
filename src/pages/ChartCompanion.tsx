import { useState, useRef } from 'react'
import { Clock } from 'lucide-react'
import { logEvent } from '@/lib/analytics'
import type { ChartAnalysis, ChartVisionResponse } from '../../api/ai'
import type { JournalPrefill } from '@/App'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const biasClass: Record<string, string> = {
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

const biasToTrade: Record<string, 'long' | 'short'> = {
  bullish: 'long',
  bearish: 'short',
  neutral: 'long',
}

const TIPS = [
  'Include the timeframe selector in your screenshot',
  'Show at least 50 candles for pattern recognition',
  'Include the pair name visible in the chart header',
]

interface ApiError { error: string }
function isError(r: ChartVisionResponse | ApiError): r is ApiError { return 'error' in r }

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

interface Props {
  onSaveToJournal: (prefill: JournalPrefill) => void
}

export function ChartCompanion({ onSaveToJournal }: Props) {
  const [file, setFile]         = useState<File | null>(null)
  const [preview, setPreview]   = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<ChartVisionResponse | null>(null)
  const [error, setError]       = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(selected: File) {
    if (selected.size > 4 * 1024 * 1024) {
      setError('Image is over 4MB — please crop or compress it before uploading.')
      return
    }
    setError('')
    setResult(null)
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }
  function onDragLeave() { setDragOver(false) }
  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFileSelect(dropped)
  }

  async function handleAnalyse() {
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const base64 = await toBase64(file)
      const res = await fetch('/api/ai', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ image: base64, mimeType: file.type }),
      })

      const contentType = res.headers.get('content-type') ?? ''
      if (!contentType.includes('application/json')) {
        const text = await res.text()
        setError(`Server returned ${res.status}. ${text.slice(0, 200)}`)
        return
      }

      const data = (await res.json()) as ChartVisionResponse | ApiError
      if (isError(data)) {
        setError(data.error)
      } else {
        setResult(data)
        logEvent('chart_uploaded', {
          pattern:    data.analysis.pattern,
          bias:       data.analysis.bias,
          confidence: data.analysis.confidence,
          fromCache:  data.fromCache,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  function handleSave() {
    if (!result) return
    const a: ChartAnalysis = result.analysis
    onSaveToJournal({
      pair:      a.pair,
      direction: biasToTrade[a.bias] ?? 'long',
      reasoning: `${a.pattern} on ${a.pair} ${a.timeframe}: ${a.pattern_simple} Watch: ${a.what_to_watch}`,
    })
  }

  const a = result?.analysis
  const rl = result?.rateLimitInfo

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Chart Companion</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a Kite screenshot and get a plain-language explanation of the pattern, key levels, and what to watch.
        </p>
      </div>

      {/* Tips */}
      <div className="grid grid-cols-3 gap-3">
        {TIPS.map((tip) => (
          <div key={tip} className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
            <p className="text-xs text-muted-foreground leading-snug">{tip}</p>
          </div>
        ))}
      </div>

      {/* Upload zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`relative rounded-xl border-2 border-dashed cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 p-8 text-center
          ${dragOver
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/30'
          }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
        />
        {preview ? (
          <img
            src={preview}
            alt="Chart preview"
            className="max-h-72 w-full object-contain rounded-lg"
          />
        ) : (
          <>
            <p className="text-sm font-medium text-foreground">
              Drop a Kite chart screenshot here, or click to upload
            </p>
            <p className="text-xs text-muted-foreground">PNG, JPEG, or WebP · max 4MB</p>
          </>
        )}
      </div>

      {file && (
        <div className="flex items-center gap-3">
          <Button onClick={handleAnalyse} disabled={loading}>
            {loading ? 'Reading the chart…' : 'Analyse Chart'}
          </Button>
          <span className="text-xs text-muted-foreground">{file.name}</span>
        </div>
      )}

      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      {a && result && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{a.pattern}</CardTitle>
              <Badge variant="outline" className={biasClass[a.bias] ?? fallbackClass}>
                {a.bias.charAt(0).toUpperCase() + a.bias.slice(1)}
              </Badge>
              <Badge variant="outline" className={confidenceClass[a.confidence] ?? fallbackClass}>
                {a.confidence.charAt(0).toUpperCase() + a.confidence.slice(1)} confidence
              </Badge>
              {result.fromCache && (
                <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-50 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Cached result
                </Badge>
              )}
            </div>
            {(a.pair !== 'Unknown' || a.timeframe) && (
              <p className="text-xs text-muted-foreground mt-1">
                {[a.pair !== 'Unknown' ? a.pair : null, a.timeframe || null]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Most important field for Rajesh */}
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                What this means
              </p>
              <p className="text-sm text-foreground leading-relaxed">{a.pattern_simple}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Current price action
              </p>
              <p className="text-sm text-muted-foreground">{a.current_price_action}</p>
            </div>

            {a.key_levels.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Key levels
                </p>
                <ul className="space-y-1">
                  {a.key_levels.map((level) => (
                    <li key={level} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-border">–</span>
                      {level}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="border-l-2 border-border pl-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Watch next
              </p>
              <p className="text-sm text-muted-foreground">{a.what_to_watch}</p>
            </div>

            <p className="text-xs text-muted-foreground/60 italic">{a.disclaimer}</p>

            <Button variant="outline" size="sm" onClick={handleSave}>
              Save insight to Journal
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Rate limit warning — shown below the card */}
      {rl && rl.requestsRemaining < 50 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">
            Heads up — you have <strong>{rl.requestsRemaining}</strong> chart{' '}
            {rl.requestsRemaining === 1 ? 'analysis' : 'analyses'} remaining today.
            Resets at midnight UTC (5:30 AM IST).
          </p>
        </div>
      )}
    </div>
  )
}
