import { useState } from 'react'
import { logEvent } from '@/lib/analytics'
import { PinGate } from '@/components/PinGate'
import { Layout } from '@/components/Layout'
import { OnboardingTour } from '@/components/OnboardingTour'
import { Dashboard } from '@/pages/Dashboard'
import { Journal } from '@/pages/Journal'
import { HeadlineDecoder } from '@/pages/HeadlineDecoder'
import { Performance } from '@/pages/Performance'
import { ChartCompanion } from '@/pages/ChartCompanion'

export type Page = 'dashboard' | 'journal' | 'decoder' | 'performance' | 'charts'

export interface JournalPrefill {
  pair: string
  direction: 'long' | 'short'
  reasoning: string
}

export default function App() {
  const [authed, setAuthed] = useState(
    sessionStorage.getItem('authed') === 'true'
  )
  const [page, setPage] = useState<Page>('dashboard')
  const [journalPrefill, setJournalPrefill] = useState<JournalPrefill | null>(null)
  const [showTour, setShowTour] = useState(
    () => localStorage.getItem('tourCompleted') !== 'true'
  )

  function handleNavigate(newPage: Page) {
    logEvent('page_viewed', { page: newPage })
    setPage(newPage)
  }

  function handleSaveToJournal(prefill: JournalPrefill) {
    setJournalPrefill(prefill)
    setPage('journal')
  }

  if (!authed) {
    return <PinGate onAuth={() => setAuthed(true)} />
  }

  return (
    <Layout currentPage={page} onNavigate={handleNavigate} onStartTour={() => setShowTour(true)}>
      {showTour && <OnboardingTour onComplete={() => setShowTour(false)} />}
      {page === 'dashboard' && <Dashboard />}
      {page === 'journal' && (
        <Journal
          prefill={journalPrefill}
          onPrefillConsumed={() => setJournalPrefill(null)}
        />
      )}
      {page === 'decoder' && (
        <HeadlineDecoder onSaveToJournal={handleSaveToJournal} />
      )}
      {page === 'performance' && <Performance />}
      {page === 'charts' && (
        <ChartCompanion onSaveToJournal={handleSaveToJournal} />
      )}
    </Layout>
  )
}
