// Audit-log shared metadata — entity icons, action→family colour mapping,
// cross-tab deep-link targets, and label/relative-time formatters. Imported by
// AuditConsoleHero, AuditEventCard and TrnAuditLogsSection so the vocabulary
// (incl. BUDGET + ASSESSMENT, which the old page silently dropped) stays in one
// place and matches what the backend's write_training_audit actually emits.
import {
  BookOpen, UsersRound, Award, Grid3x3, Inbox, Presentation, Library, Star,
  ShieldCheck, Wallet, ClipboardCheck, Box,
} from 'lucide-vue-next'

// Every entity_type the training module writes to hr_training_audit_logs.
export const ENTITY_TYPES = [
  'PROGRAM', 'ASSIGNMENT', 'CERTIFICATION', 'SKILL', 'REQUEST', 'TRAINER',
  'MATERIAL', 'FEEDBACK', 'COMPLIANCE', 'BUDGET', 'ASSESSMENT',
]

export const ACTIONS = [
  'CREATE', 'UPDATE', 'DELETE', 'ASSIGN', 'SUBMIT', 'APPROVE', 'REJECT', 'RETURN',
  'CANCEL', 'FULFILL', 'COMPLETE', 'WAIVE', 'FAIL', 'RENEW', 'REASSIGN', 'EXPIRE', 'FEEDBACK',
]

const ENTITY_ICONS = {
  PROGRAM: BookOpen, ASSIGNMENT: UsersRound, CERTIFICATION: Award, SKILL: Grid3x3,
  REQUEST: Inbox, TRAINER: Presentation, MATERIAL: Library, FEEDBACK: Star,
  COMPLIANCE: ShieldCheck, BUDGET: Wallet, ASSESSMENT: ClipboardCheck,
}
export const entityIcon = (e) => ENTITY_ICONS[e] || Box

// entity_type → workspace tab key (deep-link target for "open source").
export const GO_TAB = {
  PROGRAM: 'programs', ASSIGNMENT: 'enrollment', CERTIFICATION: 'certifications',
  SKILL: 'skill-matrix', REQUEST: 'requests', TRAINER: 'trainers',
  MATERIAL: 'materials', FEEDBACK: 'feedback', COMPLIANCE: 'compliance',
  BUDGET: 'budget', ASSESSMENT: 'assessments',
}
export const goTab = (e) => GO_TAB[e] || null

// action → colour family (4 families across the 17 actions).
const FAMILY_OF = {
  CREATE: 'created', ASSIGN: 'created',
  UPDATE: 'updated', RENEW: 'updated', REASSIGN: 'updated',
  APPROVE: 'progressed', COMPLETE: 'progressed', FULFILL: 'progressed', SUBMIT: 'progressed', FEEDBACK: 'progressed',
  DELETE: 'removed', REJECT: 'removed', FAIL: 'removed', EXPIRE: 'removed', CANCEL: 'removed', RETURN: 'removed', WAIVE: 'removed',
}
export const familyOf = (action) => FAMILY_OF[action] || 'progressed'

// family meta — ordered for the distribution rail.
export const FAMILIES = [
  { key: 'created', label: 'Created', color: 'var(--trn-amber)' },
  { key: 'updated', label: 'Updated', color: 'var(--trn-amber-strong)' },
  { key: 'progressed', label: 'Progressed', color: 'var(--trn-st-completed)' },
  { key: 'removed', label: 'Removed', color: 'var(--trn-st-failed)' },
]
export const familyColor = (key) => (FAMILIES.find(f => f.key === key) || FAMILIES[0]).color

export const prettyLabel = (s) =>
  String(s || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())

// "just now" / "5m ago" / "2h ago" / "3d ago" / "12 Jun"
export const relTime = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d)) return '—'
  const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000))
  if (s < 45) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export const dayKey = (iso) => {
  const d = new Date(iso)
  if (isNaN(d)) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const dayLabel = (key) => {
  const d = new Date(key + 'T00:00:00')
  const t = new Date(); t.setHours(0, 0, 0, 0)
  const diff = Math.round((d - t) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === -1) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}
