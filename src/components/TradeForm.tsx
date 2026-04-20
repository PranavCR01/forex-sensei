import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const PAIRS = ['USD/INR', 'EUR/USD', 'USD/JPY', 'GBP/USD', 'AUD/USD', 'USD/CAD', 'XAU/USD']

type Direction = 'long' | 'short'
type SubmitState = 'idle' | 'loading' | 'success' | 'error'

// Lookup objects instead of string interpolation — dynamic class names get
// tree-shaken by Tailwind if constructed as template literals at runtime.
const directionActiveClass: Record<Direction, string> = {
  long:  'bg-green-100 text-green-800 border-green-300 hover:bg-green-100',
  short: 'bg-red-100   text-red-800   border-red-300   hover:bg-red-100',
}
const directionIdleClass: Record<Direction, string> = {
  long:  'border-border text-muted-foreground hover:bg-secondary/50',
  short: 'border-border text-muted-foreground hover:bg-secondary/50',
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}

function defaultForm() {
  return {
    pair:       'USD/INR',
    direction:  'long' as Direction,
    entryPrice: '',
    entryDate:  today(),
    reasoning:  '',
  }
}

interface Props {
  onSuccess?: () => void
}

export function TradeForm({ onSuccess }: Props) {
  const [form, setForm] = useState(defaultForm)
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitState('loading')
    setErrorMsg('')

    const { error } = await supabase.from('trades').insert({
      pair:        form.pair,
      direction:   form.direction,
      entry_price: form.entryPrice ? parseFloat(form.entryPrice) : null,
      entry_date:  form.entryDate,
      reasoning:   form.reasoning || null,
      status:      'open',
    })

    if (error) {
      setSubmitState('error')
      setErrorMsg(error.message)
      return
    }

    setSubmitState('success')
    setForm(defaultForm())
    onSuccess?.()
    setTimeout(() => setSubmitState('idle'), 3000)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        {/* Pair */}
        <div className="space-y-1.5">
          <Label htmlFor="pair">Pair</Label>
          <Select
            value={form.pair}
            onValueChange={val => val && setForm(f => ({ ...f, pair: val }))}
          >
            <SelectTrigger id="pair">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAIRS.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Entry Price */}
        <div className="space-y-1.5">
          <Label htmlFor="entry-price">Entry Price</Label>
          <Input
            id="entry-price"
            type="number"
            step="any"
            placeholder="e.g. 84.20"
            value={form.entryPrice}
            onChange={e => setForm(f => ({ ...f, entryPrice: e.target.value }))}
          />
        </div>
      </div>

      {/* Direction toggle */}
      <div className="space-y-1.5">
        <Label>Direction</Label>
        <div className="flex gap-2">
          {(['long', 'short'] as Direction[]).map(dir => (
            <button
              key={dir}
              type="button"
              onClick={() => setForm(f => ({ ...f, direction: dir }))}
              className={`flex-1 py-2 rounded-md border text-sm font-medium capitalize transition-colors ${
                form.direction === dir
                  ? directionActiveClass[dir]
                  : directionIdleClass[dir]
              }`}
            >
              {dir}
            </button>
          ))}
        </div>
      </div>

      {/* Entry Date */}
      <div className="space-y-1.5">
        <Label htmlFor="entry-date">Entry Date</Label>
        <Input
          id="entry-date"
          type="date"
          value={form.entryDate}
          onChange={e => setForm(f => ({ ...f, entryDate: e.target.value }))}
          required
        />
      </div>

      {/* Reasoning — the most important field */}
      <div className="space-y-1.5">
        <Label htmlFor="reasoning">Why do I think this?</Label>
        <Textarea
          id="reasoning"
          rows={3}
          placeholder="What's the macro thesis? What are the key levels? What would change your view?"
          value={form.reasoning}
          onChange={e => setForm(f => ({ ...f, reasoning: e.target.value }))}
        />
      </div>

      {/* Submit */}
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={submitState === 'loading'}>
          {submitState === 'loading' ? 'Saving…' : 'Log Trade'}
        </Button>

        {submitState === 'success' && (
          <span className="text-sm text-green-700">Trade logged successfully.</span>
        )}
        {submitState === 'error' && (
          <span className="text-sm text-red-600">Error: {errorMsg}</span>
        )}
      </div>
    </form>
  )
}
