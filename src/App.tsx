import { useState } from 'react'
import { PinGate } from '@/components/PinGate'
import { Layout } from '@/components/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { Journal } from '@/pages/Journal'

export type Page = 'dashboard' | 'journal'

export default function App() {
  const [authed, setAuthed] = useState(
    sessionStorage.getItem('authed') === 'true'
  )
  const [page, setPage] = useState<Page>('dashboard')

  if (!authed) {
    return <PinGate onAuth={() => setAuthed(true)} />
  }

  return (
    <Layout currentPage={page} onNavigate={setPage}>
      {page === 'dashboard' ? <Dashboard /> : <Journal />}
    </Layout>
  )
}
