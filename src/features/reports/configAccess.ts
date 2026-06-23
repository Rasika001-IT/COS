import type { Role } from '@/types'
import type { ReportTypeConfig } from '@/types/reports'

// Business Admin (§4.4) honouring helpers, shared by ReportsScreen + ReportBuilder.

const DEFAULT_GENERATE_ROLES: Role[] = ['manager', 'supervisor', 'admin', 'superadmin']

export function canGenerate(config: ReportTypeConfig, role: Role): boolean {
  return (config.generateRoles ?? DEFAULT_GENERATE_ROLES).includes(role)
}

// Drop columns an admin disabled (enabled === false) from every section, so both
// the builder UI and the generated PDF honour the config.
export function withEnabledColumns(config: ReportTypeConfig): ReportTypeConfig {
  return {
    ...config,
    sections: config.sections.map((s) => ({ ...s, columns: s.columns.filter((c) => c.enabled !== false) })),
  }
}
