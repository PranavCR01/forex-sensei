import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { logEvent } from '@/lib/analytics'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Outcome = 'win' | 'loss' | 'neutral'
type SubmitState = 'idle' | 'loading' | 'error'

const outcomeActiveClass: Record<Outcome, string> = {
  win:     'bg-green-100 text-green-800 border-green-300 hover:bg-green-100',
  loss:    'bg-red-100   text-red-800   border-red-300   hover:bg-red-100',
  neutral: 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100',
}
const outcomeIdleClass = 'border-border text-muted-foreground hover:bg-secondary/50'

function today(): string {
  return new Date().toISOString().split('T')[0]
}

interface Props {
  tradeId:   string
  pair:      string
  direction: string
  onCancel:  () => void
  onSuccess: () => void
}

export function CloseTradeForm({ tradeId, pair, direction, onCancel, onSuccess }: Props) {
  const [exitPrice, setExitPrice] = useState('')
  const [exitDate, setExitDate]   = useState(today())
  const [outcome, setOutcome]     = useState<Outcome>('win')
  const [pips, setPips]           = useState('')
  const [notes, setNotes]         = useState('')
  const [state, setState]         = useState<SubmitState>('idle')
  const [errorMsg, setErrorMsg]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('loading')
    setErrorMsg('')

    const { error } = await supabase
      .from('trades')
      .update({
        exit_price: exitPrice ? parseFloat(exitPrice) : null,
        exit_date:  exitDate  || null,
        outcome,
        pips:       pips ? parseFloat(pips) : null,
        notes:      notes || null,
        status:     'closed',
      })
      .eq('id', tradeId)

    if (error) {
      setState('error')
      setErrorMsg(error.message)
      return
    }

    logEvent('trade_closed', {
      pair,
      direction,
      outcome,
      pips: pips ? parseFloat(pips) : null,
    })
    setState('idle')
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 pt-3 border-t border-border space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Close Trade
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`exit-price-${tradeId}`}>Exit Price</Label>
          <Input
            id={`exit-price-${tradeId}`}
            type="number"
            step="any"
            placeholder="e.g. 84.80"
            value={exitPrice}
            onChange={e => setExitPrice(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`exit-date-${tradeId}`}>Exit Date</Label>
          <Input
            id={`exit-date-${tradeId}`}
            type="date"
            value={exitDate}
            onChange={e => setExitDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Outcome</Label>
        <div className="flex gap-2">
          {(['win', 'loss', 'neutral'] as Outcome[]).map(o => (
            <button
              key={o}
              type="button"
              onClick={() => setOutcome(o)}
              className={`flex-1 py-1.5 rounded-md border text-sm font-medium capitalize transition-colors ${
                outcome === o ? outcomeActiveClass[o] : outcomeIdleClass
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`pips-${tradeId}`}>Pips (optional)</Label>
        <Input
          id={`pips-${tradeId}`}
          type="number"
          step="any"
          placeholder="e.g. 12.5 or -8.2"
          value={pips}
          onChange={e => setPips(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`notes-${tradeId}`}>What actually happened?</Label>
        <Textarea
          id={`notes-${tradeId}`}
          rows={2}
          placeholder="What actually happened? Was your reasoning correct?"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      {state === 'error' && (
        <p className="text-sm text-red-600">Error: {errorMsg}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={state === 'loading'}>
          {state === 'loading' ? 'Saving…' : 'Close Trade'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
