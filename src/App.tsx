import { useAppStore } from './store'
import { CreateScreen } from './components/CreateScreen'
import { HomeGallery } from './components/HomeGallery'
import { MicButton } from './components/MicButton'
import { interpretCommand } from './services/commands'

export default function App() {
  const tab = useAppStore((s) => s.tab)
  const setTab = useAppStore((s) => s.setTab)

  // Persistent "bring to life" voice command — available in every Create
  // mode for ad hoc merge commands ("sit the couch on its back").
  const runCommand = (transcript: string): string | null => {
    const { draft, updateObject } = useAppStore.getState()
    const result = interpretCommand(transcript, draft)
    if (!result) return null
    for (const { placedId, patch } of result.patches) updateObject(placedId, patch)
    return result.summary
  }

  return (
    <div className="app">
      <header className="app-header">
        <nav className="tabs" aria-label="Main">
          <button className={`tab${tab === 'create' ? ' active' : ''}`} onClick={() => setTab('create')} data-testid="tab-create">
            Create
          </button>
          <button className={`tab${tab === 'home' ? ' active' : ''}`} onClick={() => setTab('home')} data-testid="tab-home">
            Home
          </button>
        </nav>
        {tab === 'create' && <MicButton onFinal={runCommand} label="Bring to life — voice command" />}
      </header>
      <main className="app-body">{tab === 'create' ? <CreateScreen /> : <HomeGallery />}</main>
    </div>
  )
}
