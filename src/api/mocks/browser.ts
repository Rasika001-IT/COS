import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { reportsHandlers } from './reportsHandlers'
import { projectsHandlers } from './projectsHandlers'
import { grievancesHandlers } from './grievancesHandlers'
import { leaveHandlers } from './leaveHandlers'
import { adminHandlers } from './adminHandlers'
import { superAdminHandlers } from './superAdminHandlers'
import { expireCurrentToken } from './shared'

export const worker = setupWorker(
  ...superAdminHandlers, // platform routes first
  ...adminHandlers, // admin routes (more specific verbs on shared paths)
  ...handlers,
  ...reportsHandlers,
  ...projectsHandlers,
  ...grievancesHandlers,
  ...leaveHandlers,
)

// Dev convenience: trigger CONTRACT.md §1's refresh flow from the console.
// Call window.__cosExpireToken() then make any request — the next protected call
// returns 401 TOKEN_EXPIRED, baseQueryWithReauth refreshes + retries transparently.
if (import.meta.env.DEV) {
  ;(window as unknown as { __cosExpireToken: () => void }).__cosExpireToken = () => {
    expireCurrentToken()
    // eslint-disable-next-line no-console
    console.info('[mock] current access token marked expired — next request will refresh & retry')
  }
}
