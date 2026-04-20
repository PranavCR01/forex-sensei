import { useRef, useState } from 'react'

// VITE_APP_PIN is embedded into the client bundle by Vite at build time.
// Anyone with browser DevTools → Sources can read this value in plain text.
// This is intentional: forex-sensei is a single-user, personal, non-public tool.
// The PIN is a convenience lock only — do not store secrets or treat this as security.
const STORED_PIN = import.meta.env.VITE_APP_PIN as string

interface Props {
  onAuth: () => void
}

export function PinGate({ onAuth }: Props) {
  const [digits, setDigits] = useState(['', '', '', ''])
  const [shaking, setShaking] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null])

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1)
    const next = digits.slice()
    next[index] = digit
    setDigits(next)

    if (digit && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }

    if (next.every(d => d !== '')) {
      const entered = next.join('')
      if (entered === STORED_PIN) {
        sessionStorage.setItem('authed', 'true')
        onAuth()
      } else {
        setShaking(true)
        setTimeout(() => {
          setShaking(false)
          setDigits(['', '', '', ''])
          inputRefs.current[0]?.focus()
        }, 500)
      }
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      const prev = digits.slice()
      prev[index - 1] = ''
      setDigits(prev)
      inputRefs.current[index - 1]?.focus()
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-8">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            forex-sensei
          </h1>
          <p className="text-sm text-muted-foreground">Enter your PIN to continue</p>
        </div>

        <div className={`flex gap-3 ${shaking ? 'animate-shake' : ''}`}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={d}
              autoFocus={i === 0}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              className="w-14 h-14 text-center text-xl font-mono rounded-md border border-input bg-background text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
