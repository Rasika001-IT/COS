import { useOutletContext } from 'react-router-dom'

// Context the AppShell passes to routed screens — currently the selected siteId.
export interface ShellContext {
  siteId?: string
}

export function useShellContext(): ShellContext {
  return useOutletContext<ShellContext>()
}
