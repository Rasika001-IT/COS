// Pure leave/payroll derivation (mirrors the frontend features/leave/derive.ts).
const DAY = 86_400_000

export function leaveDays(startDate: string, endDate: string): number {
  const a = Date.parse(startDate.slice(0, 10))
  const b = Date.parse(endDate.slice(0, 10))
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0
  return Math.round((b - a) / DAY) + 1
}

export function workingDaysInMonth(month: string, now: number): number {
  const [y, m] = month.split('-').map(Number)
  const todayDate = new Date(now)
  const sameMonth = todayDate.getUTCFullYear() === y && todayDate.getUTCMonth() + 1 === m
  const lastDay = sameMonth ? todayDate.getUTCDate() : new Date(Date.UTC(y, m, 0)).getUTCDate()
  let count = 0
  for (let d = 1; d <= lastDay; d++) {
    if (new Date(Date.UTC(y, m - 1, d)).getUTCDay() !== 0) count++ // exclude Sundays
  }
  return count
}

function approvedLeaveDaysInMonth(leave: { status: string; startDate: string; endDate: string }[], month: string): number {
  return leave
    .filter((l) => l.status === 'approved')
    .reduce((sum, l) => {
      let days = 0
      const start = new Date(l.startDate.slice(0, 10)).getTime()
      const end = new Date(l.endDate.slice(0, 10)).getTime()
      for (let t = start; t <= end; t += DAY) if (new Date(t).toISOString().slice(0, 7) === month) days++
      return sum + days
    }, 0)
}

export function payrollRow(
  user: { id: string; name: string },
  monthLogs: { checkIn: string; workedHours?: number }[],
  userLeave: { status: string; startDate: string; endDate: string }[],
  month: string,
  now: number,
) {
  const workingDays = workingDaysInMonth(month, now)
  const present = new Set(monthLogs.map((l) => l.checkIn.slice(0, 10))).size
  const leaveTaken = approvedLeaveDaysInMonth(userLeave, month)
  const overtimeHours = Math.round(monthLogs.reduce((s, l) => s + Math.max(0, (l.workedHours ?? 0) - 8), 0))
  const absent = Math.max(0, workingDays - present - leaveTaken)
  return { userId: user.id, userName: user.name, workingDays, present, absent, leaveTaken, overtimeHours }
}
