import { useState } from 'react'
import { TradeForm } from '@/components/TradeForm'
import { TradeList } from '@/components/TradeList'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export function Journal() {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Log a Trade</CardTitle>
          <CardDescription>
            Record your thesis before you enter. The reasoning is the point.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TradeForm onSuccess={() => setRefreshKey(k => k + 1)} />
        </CardContent>
      </Card>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">Trade History</h2>
        <TradeList refreshKey={refreshKey} />
      </div>
    </div>
  )
}
