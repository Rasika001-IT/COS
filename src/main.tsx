import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Brand fonts (self-hosted via fontsource — no external CDN at runtime).
import '@fontsource/oswald/400.css'
import '@fontsource/oswald/500.css'
import '@fontsource/oswald/600.css'
import '@fontsource/oswald/700.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'

import './styles/tokens.css'
import './styles/global.css'

import { App } from './app/App'

// Start the MSW mock worker before the app renders so the very first RTK Query
// request is intercepted. MSW is the LOCAL-DEV backend only: it never runs in a
// production build, and `VITE_ENABLE_MSW=false` turns it off in dev too (point
// VITE_API_URL at the real backend). No slice code changes either way.
async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MSW === 'false') return
  if (!import.meta.env.DEV) return
  const { worker } = await import('./api/mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
