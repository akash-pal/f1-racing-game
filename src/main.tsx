import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useInputStore } from './state/useInputStore'
import { useGameStore } from './state/useGameStore'
import { useHudStore } from './state/useHudStore'

if (import.meta.env.DEV) {
  const w = window as unknown as Record<string, unknown>
  // debug handles
  w.__game = { input: useInputStore, game: useGameStore, hud: useHudStore }
  // capture errors for headless inspection
  const errs: string[] = []
  w.__errs = errs
  const origErr = console.error.bind(console)
  console.error = (...a: unknown[]) => {
    errs.push(a.map((x) => (x instanceof Error ? (x.stack ?? x.message) : String(x))).join(' '))
    origErr(...a)
  }
  window.addEventListener('error', (e) => errs.push('error: ' + (e.error?.stack ?? e.message)))
  window.addEventListener('unhandledrejection', (e) =>
    errs.push('rejection: ' + String((e as PromiseRejectionEvent).reason)),
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
