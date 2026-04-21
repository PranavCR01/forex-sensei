import { useState } from 'react'
import { TradeForm } from '@/components/TradeForm'
import { TradeList } from '@/components/TradeList'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { JournalPrefill } from '@/App'

interface Props {
  prefill?: JournalPrefill | null
  onPrefillConsumed?: () => void
}

export function Journal({ prefill, onPrefillConsumed }: Props) {
  const [refreshKey, setRefreshKey] = useState(0)

  // key forces TradeForm to remount when prefill changes, seeding fresh initial state
  const formKey = prefill ? JSON.stringify(prefill) : 'default'

  function handleSuccess() {
    setRefreshKey(k => k + 1)
    onPrefillConsumed?.()
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Log a Trade</CardTitle>
          <CardDescription>
            {prefill
              ? 'Pre-filled from Headline Decoder — review and adjust before saving.'
              : 'Record your thesis before you enter. The reasoning is the point.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TradeForm
            key={formKey}
            initialValues={prefill ?? undefined}
            onSuccess={handleSuccess}
          />
        </CardContent>
      </Card>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">Trade History</h2>
        <TradeList refreshKey={refreshKey} />
      </div>
    </div>
  )
}
