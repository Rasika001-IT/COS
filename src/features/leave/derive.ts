import type { AttendanceLog, LeaveRequest, PayrollRow, User } from '@/types'

// Pure leave/payroll derivation — shared by the MSW handler and unit-tested. All
// time inputs are injected (`now`) for deterministic tests.

const DAY = 86_400_000

/** Inclusive day count between two ISO dates (single day = 1). */
export function leaveDays(startDate: string, endDate: string): number {
  const a = Date.parse(startDate.slice(0, 10))
  const b = Date.parse(endDate.slice(0, 10))
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0
  return Math.round((b - a) / DAY) + 1
}

/** Working days = non-Sundays in the month, capped at today (month-to-date). */
export function workingDaysInMonth(month: string, now: number): number {
  const [y, m] = month.split('-').map(Number)
  const todayDate = new Date(now)
  const sameMonth = todayDate.getUTCFullYear() === y && todayDate.getUTCMonth() + 1 === m
  const lastDay = sameMonth ? todayDate.getUTCDate() : new Date(Date.UTC(y, m, 0)).getUTCDate()
  let count = 0
  for (let d = 1; d <= lastDay; d++) {
    if (new Date(Date.UTC(y, m - 1, d)).getUTCDay() !== 0) count++ // 0 = Sunday
  }
  return count
}

/** Count approved-leave days that fall within the given month. */
function approvedLeaveDaysInMonth(leave: LeaveRequest[], month: string): number {
  return leave
    .filter((l) => l.status === 'approved')
    .reduce((sum, l) => {
      // Days of this request that land in `month`.
      let days = 0
      const start = new Date(l.startDate.slice(0, 10))
      const end = new Date(l.endDate.slice(0, 10))
      for (let t = start.getTime(); t <= end.getTime(); t += DAY) {
        if (new Date(t).toISOString().slice(0, 7) === month) days++
      }
      return sum + days
    }, 0)
}

export function payrollRow(
  user: Pick<User, 'id' | 'name'>,
  monthLogs: AttendanceLog[],
  userLeave: LeaveRequest[],
  month: string,
  now: number,
): PayrollRow {
  const workingDays = workingDaysInMonth(month, now)
  const present = new Set(monthLogs.map((l) => l.checkIn.slice(0, 10))).size
  const leaveTaken = approvedLeaveDaysInMonth(userLeave, month)
  const overtimeHours = Math.round(
    monthLogs.reduce((sum, l) => sum + Math.max(0, (l.workedHours ?? 0) - 8), 0),
  )
  const absent = Math.max(0, workingDays - present - leaveTaken)
  return { userId: user.id, userName: user.name, workingDays, present, absent, leaveTaken, overtimeHours }
}
