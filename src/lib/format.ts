// Small formatting/date helpers used across the slice. Locale-stable, no deps.

export function safeDiv(num: number, den: number, fallback = 0): number {
  return den === 0 ? fallback : num / den
}

export function pct(num: number, den: number): number {
  return Math.round(safeDiv(num, den, 0) * 100)
}

const DAY_MS = 86_400_000

export function greeting(date = new Date()): string {
  const h = date.getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function formatDayMonth(iso: string): string {
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' })
}

/** "2h 15m" worked-hours label from decimal hours. */
export function formatDuration(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** Elapsed worked time between an ISO check-in and now/checkout, in decimal hours. */
export function workedHours(checkIn: string, checkOut?: string): number {
  const end = checkOut ? new Date(checkOut).getTime() : Date.now()
  return Math.max(0, (end - new Date(checkIn).getTime()) / 3_600_000)
}

export function todayISODate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function addDaysISO(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * DAY_MS).toISOString().slice(0, 10)
}

// Compact Indian-currency label: ₹480 Cr / ₹12.5 L / ₹4,500.
export function formatINRCompact(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(n % 1e7 === 0 ? 0 : 1)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${n.toLocaleString('en-IN')}`
}

// "in 124 days" / "12 days ago" from a signed day count.
export function daysRemainingLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Due today'
  return `${days}d left`
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}
