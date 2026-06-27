// Numbering Series — pure formatting helpers + module→downstream map.
// Shared by the Mint Press instrument, plate cards, the configure modal and the
// decommission modal so the "Next ID" string is rendered identically everywhere
// (and matches the backend app/utils/hr/numbering.py:preview exactly).
import { Users, UserPlus } from 'lucide-vue-next'
import { MODULES } from '../components/connectivity'

const pad = (n, width) => String(Math.max(0, Math.floor(Number(n) || 0))).padStart(Math.max(0, Number(width) || 0), '0')

/** Render what a given counter value prints as — mirrors backend `preview()`. */
export function fmtPreview(series, n, now = new Date()) {
  const s = series || {}
  const sep = s.separator || ''
  const parts = []
  if (s.prefix) parts.push(s.prefix)
  if (s.include_year) parts.push(String(now.getFullYear()))
  if (s.include_month) parts.push(String(now.getMonth() + 1).padStart(2, '0'))
  parts.push(pad(n, s.padding))
  let out = sep ? parts.join(sep) : parts.join('')
  if (s.suffix) out = sep ? `${out}${sep}${s.suffix}` : `${out}${s.suffix}`
  return out
}

/** The next ID a configured series would mint (counter + 1). */
export function nextId(series, now = new Date()) {
  return fmtPreview(series, (Number(series?.current_number) || 0) + 1, now)
}

/** Built-in fallback sample for an unconfigured module, e.g. EMP0001. */
export function builtinSample(mod) {
  return `${mod?.sample_prefix || ''}0001`
}

/**
 * The ordered anatomy of an identifier — each token + whether it is active.
 * Drives the token strips on the card, modal preview and the press bed.
 */
export function tokenAnatomy(series, now = new Date()) {
  const s = series || {}
  return [
    { key: 'prefix', label: 'PRE', on: !!s.prefix, value: s.prefix || '' },
    { key: 'year', label: 'YYYY', on: !!s.include_year, value: String(now.getFullYear()) },
    { key: 'month', label: 'MM', on: !!s.include_month, value: String(now.getMonth() + 1).padStart(2, '0') },
    { key: 'counter', label: '#'.repeat(Math.min(6, Math.max(1, Number(s.padding) || 4))), on: true, value: pad((Number(s.current_number) || 0) + 1, s.padding) },
    { key: 'suffix', label: 'SUF', on: !!s.suffix, value: s.suffix || '' },
  ]
}

// ── module → real downstream HR module it actually feeds (closes the
//    connectivity loophole: catalog keys like EMPLOYEE ≠ MODULES keys) ─────────
const DOWNSTREAM = {
  EMPLOYEE: { key: 'employees', group: 'Workforce' },
  RECRUITMENT_REQUISITION: { key: 'recruitment', group: 'Recruitment' },
  RECRUITMENT_POSITION: { key: 'recruitment', group: 'Recruitment' },
  RECRUITMENT_CANDIDATE: { key: 'recruitment', group: 'Recruitment' },
  RECRUITMENT_APPLICATION: { key: 'recruitment', group: 'Recruitment' },
  RECRUITMENT_INTERVIEW: { key: 'recruitment', group: 'Recruitment' },
  RECRUITMENT_OFFER: { key: 'recruitment', group: 'Recruitment' },
}
const GROUP_ICON = { Workforce: Users, Recruitment: UserPlus }
export const GROUP_ORDER = ['Workforce', 'Recruitment']

/** Resolve the downstream module record { key, group, label, icon, to } for a catalog module. */
export function downstreamOf(module) {
  const d = DOWNSTREAM[module] || { key: null, group: 'Other' }
  const mod = d.key ? MODULES[d.key] : null
  return {
    key: d.key,
    group: d.group,
    label: mod?.label || d.group,
    icon: mod?.icon || GROUP_ICON[d.group] || UserPlus,
    to: mod?.to || null,
  }
}
