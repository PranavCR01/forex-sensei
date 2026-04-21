import { useState } from 'react'
import { PinGate } from '@/components/PinGate'
import { Layout } from '@/components/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { Journal } from '@/pages/Journal'
import { HeadlineDecoder } from '@/pages/HeadlineDecoder'
import { Performance } from '@/pages/Performance'

export type Page = 'dashboard' | 'journal' | 'decoder' | 'performance'

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

  function handleSaveToJournal(prefill: JournalPrefill) {
    setJournalPrefill(prefill)
    setPage('journal')
  }

  if (!authed) {
    return <PinGate onAuth={() => setAuthed(true)} />
  }

  return (
    <Layout currentPage={page} onNavigate={setPage}>
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
    </Layout>
  )
}
