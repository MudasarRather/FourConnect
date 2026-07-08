// Chrono Desk — shared date arithmetic for the calendar views.
// All keys are LOCAL calendar days ("YYYY-MM-DD" in the browser's zone) — the
// backend buckets with tz_offset so `days[]` lines up with these keys exactly
// (the classic UTC→IST off-by-one guard).

export const dayKey = (d) => {
  const x = d instanceof Date ? d : new Date(d)
  const y = x.getFullYear(), m = String(x.getMonth() + 1).padStart(2, '0'), dd = String(x.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export const todayKey = () => dayKey(new Date())

export const addDays = (d, n) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export const startOfDay = (d) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export const startOfWeek = (d) => {          // Sunday-anchored, matching the desk's grids
  const x = startOfDay(d)
  x.setDate(x.getDate() - x.getDay())
  return x
}

export const startOfMonth = (d) => {
  const x = startOfDay(d)
  x.setDate(1)
  return x
}

/** The 42-cell month window: the Sunday on/before the 1st → 6 weeks out. */
export const monthGridRange = (anchor) => {
  const first = startOfMonth(anchor)
  const gridStart = startOfWeek(first)
  const gridEnd = addDays(gridStart, 41)
  gridEnd.setHours(23, 59, 59, 999)
  return { gridStart, gridEnd, first }
}

export const monthLabel = (d) =>
  d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

export const dayLabel = (d) =>
  d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

export const shortDayLabel = (d) =>
  d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

export const fmtTime = (iso) => {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

export const hourOf = (iso) => {
  const d = new Date(iso)
  return d.getHours() + d.getMinutes() / 60
}

export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** relative label for agenda groups: Today / Tomorrow / weekday, date */
export const relDayLabel = (key) => {
  const t = todayKey()
  if (key === t) return 'Today'
  if (key === dayKey(addDays(new Date(), 1))) return 'Tomorrow'
  if (key === dayKey(addDays(new Date(), -1))) return 'Yesterday'
  return shortDayLabel(new Date(`${key}T00:00:00`))
}

/** Business-hours day match: backend sends 0=Mon…6=Sun; JS getDay() is 0=Sun…6=Sat. */
export const isBusinessDay = (jsDay, businessDays) => {
  if (!Array.isArray(businessDays) || !businessDays.length) return jsDay !== 0 && jsDay !== 6
  const mondayBased = (jsDay + 6) % 7
  return businessDays.includes(mondayBased)
}
