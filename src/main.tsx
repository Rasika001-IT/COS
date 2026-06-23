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
// request is intercepted. When the real backend lands, delete src/api/mocks/
// and this block — no slice code changes.
async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MOCKS === 'false') return
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
