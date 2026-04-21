import type { Page } from '@/App'

interface Props {
  currentPage: Page
  onNavigate: (page: Page) => void
  children: React.ReactNode
}

const navItems: { label: string; page: Page }[] = [
  { label: 'Dashboard',   page: 'dashboard'   },
  { label: 'Journal',     page: 'journal'     },
  { label: 'Decoder',     page: 'decoder'     },
  { label: 'Performance', page: 'performance' },
  { label: 'Charts',      page: 'charts'      },
]

export function Layout({ currentPage, onNavigate, children }: Props) {
  function signOut() {
    sessionStorage.removeItem('authed')
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-sm tracking-tight text-foreground">
              forex-sensei
            </span>
            <nav className="flex gap-1">
              {navItems.map(({ label, page }) => (
                <button
                  key={page}
                  onClick={() => onNavigate(page)}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                    currentPage === page
                      ? 'bg-secondary text-secondary-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>
          <button
            onClick={signOut}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
