// Shared metadata for the Exit "Chain of Custody" audit recorder.
// Single source of truth for action families/icons/labels, entity meta, the
// cross-link resolver (audit row → sibling exit tab) and the time/hash helpers,
// so the forge instrument, the ledger rows and the section stay in lockstep.
import {
  FilePlus, Send, Layers, Calculator, FileText, FilePen, Gavel, CalendarClock,
  ClipboardCheck, RotateCcw, CalendarPlus, ShieldCheck, CheckCircle2, FastForward,
  MessagesSquare, PackageCheck, BadgeCheck, Wallet, Lock, ScrollText, DoorOpen,
  Archive, XCircle, Ban, Undo2, FileX, Trash2, FileBadge, Scale, Users,
} from 'lucide-vue-next'

// ─── action families (drive tone, the chain blocks + the composition ring) ───
export const AUDIT_FAMILIES = {
  genesis:    { key: 'genesis',    label: 'Created',   color: '#fbbf24' },
  transition: { key: 'transition', label: 'In motion', color: '#fb923c' },
  completion: { key: 'completion', label: 'Cleared',   color: '#34d399' },
  reversal:   { key: 'reversal',   label: 'Reversed',  color: '#ef4444' },
  config:     { key: 'config',     label: 'Config',    color: '#9ca3af' },
}
export const FAMILY_ORDER = ['genesis', 'transition', 'completion', 'reversal', 'config']

// ─── per-action metadata (full 33-action enum from the backend) ──────────────
const ACTIONS = {
  CREATED:                 { label: 'Case created',          icon: FilePlus,       family: 'genesis' },
  SUBMITTED:               { label: 'Submitted',             icon: Send,           family: 'genesis' },
  CLEARANCE_SEEDED:        { label: 'Clearance seeded',      icon: Layers,         family: 'genesis' },
  SETTLEMENT_DRAFTED:      { label: 'Settlement drafted',    icon: Calculator,     family: 'genesis' },
  LETTER_GENERATED:        { label: 'Letter generated',      icon: FileText,       family: 'genesis' },

  UPDATED:                 { label: 'Case updated',          icon: FilePen,        family: 'transition' },
  MANAGER_DECISION:        { label: 'Manager decision',      icon: Gavel,          family: 'transition' },
  NOTICE_STARTED:          { label: 'Notice started',        icon: CalendarClock,  family: 'transition' },
  NOTICE_ADJUSTED:         { label: 'Notice adjusted',       icon: CalendarClock,  family: 'transition' },
  CLEARANCE_ITEM_UPDATED:  { label: 'Clearance signed off',  icon: ClipboardCheck, family: 'transition' },
  CLEARANCE_REOPENED:      { label: 'Clearance reopened',    icon: RotateCcw,      family: 'transition' },
  INTERVIEW_SCHEDULED:     { label: 'Interview scheduled',   icon: CalendarPlus,   family: 'transition' },
  SETTLEMENT_RECALCULATED: { label: 'Settlement recomputed', icon: Calculator,     family: 'transition' },
  SETTLEMENT_VERIFIED:     { label: 'Settlement verified',   icon: ShieldCheck,    family: 'transition' },

  ACCEPTED:                { label: 'Accepted',              icon: CheckCircle2,   family: 'completion' },
  NOTICE_WAIVED:           { label: 'Notice waived',         icon: FastForward,    family: 'completion' },
  CLEARANCE_COMPLETED:     { label: 'Clearance completed',   icon: ClipboardCheck, family: 'completion' },
  INTERVIEW_COMPLETED:     { label: 'Interview completed',   icon: MessagesSquare, family: 'completion' },
  ASSET_RETURN_FLAGGED:    { label: 'Asset return flagged',  icon: PackageCheck,   family: 'completion' },
  SETTLEMENT_APPROVED:     { label: 'Settlement approved',   icon: BadgeCheck,     family: 'completion' },
  SETTLEMENT_PAID:         { label: 'Settlement paid',       icon: Wallet,         family: 'completion' },
  SETTLEMENT_CLOSED:       { label: 'Settlement closed',     icon: Lock,           family: 'completion' },
  LETTER_ISSUED:           { label: 'Letter issued',         icon: ScrollText,     family: 'completion' },
  EXITED:                  { label: 'Exit finalised',        icon: DoorOpen,       family: 'completion' },
  ARCHIVED:                { label: 'Archived',              icon: Archive,        family: 'completion' },

  REJECTED:                { label: 'Rejected',              icon: XCircle,        family: 'reversal' },
  CANCELLED:               { label: 'Cancelled',             icon: Ban,            family: 'reversal' },
  WITHDRAWN:               { label: 'Withdrawn',             icon: Undo2,          family: 'reversal' },
  SETTLEMENT_REVERSED:     { label: 'Settlement reversed',   icon: RotateCcw,      family: 'reversal' },
  LETTER_REVOKED:          { label: 'Letter revoked',        icon: FileX,          family: 'reversal' },
  DELETED:                 { label: 'Deleted',               icon: Trash2,         family: 'reversal' },
  POLICY_DELETED:          { label: 'Policy retired',        icon: Trash2,         family: 'reversal' },

  POLICY_CREATED:          { label: 'Policy created',        icon: FileBadge,      family: 'config' },
  POLICY_UPDATED:          { label: 'Policy updated',        icon: FilePen,        family: 'config' },
}

export const ALL_ACTIONS = Object.keys(ACTIONS)

export function auditActionMeta(action) {
  const a = ACTIONS[action]
  if (a) return { ...a, color: AUDIT_FAMILIES[a.family].color }
  return { label: pretty(action), icon: FileText, family: 'transition', color: AUDIT_FAMILIES.transition.color }
}

// ─── entity meta (drives the quick-filter lenses + row chips) ────────────────
export const AUDIT_ENTITIES = [
  { value: 'CASE',       label: 'Case',       icon: DoorOpen,       color: '#fb923c' },
  { value: 'CLEARANCE',  label: 'Clearance',  icon: ClipboardCheck, color: '#d97706' },
  { value: 'INTERVIEW',  label: 'Interview',  icon: MessagesSquare, color: '#fbbf24' },
  { value: 'SETTLEMENT', label: 'Settlement', icon: Scale,          color: '#34d399' },
  { value: 'DOCUMENT',   label: 'Document',   icon: ScrollText,     color: '#f59e0b' },
  { value: 'POLICY',     label: 'Policy',     icon: FileBadge,      color: '#9ca3af' },
]
const ENTITY_BY = Object.fromEntries(AUDIT_ENTITIES.map(e => [e.value, e]))
export const auditEntityMeta = (e) =>
  ENTITY_BY[e] || { value: e, label: pretty(e), icon: Users, color: '#9ca3af' }

// ─── cross-link resolver — closes the "is the audit page connected?" loophole ─
// Every row can jump to the sibling tab that owns its entity, so the trail is a
// live index into the rest of the module, not a dead read-only log.
const TAB_LABEL = {
  resignation: 'Resignation', notice: 'Notice period', interviews: 'Exit interview',
  clearance: 'Clearance', 'asset-return': 'Asset return', settlement: 'Final settlement',
  'experience-letter': 'Experience letter', 'relieving-letter': 'Relieving letter',
  policies: 'Policies', dashboard: 'Dashboard',
}
export const auditTargetLabel = (tab) => TAB_LABEL[tab] || 'Details'

export function auditTargetTab(entry) {
  const e = entry?.entity_type
  const a = entry?.action || ''
  if (e === 'CLEARANCE') return 'clearance'
  if (e === 'INTERVIEW') return 'interviews'
  if (e === 'SETTLEMENT') return 'settlement'
  if (e === 'POLICY') return 'policies'
  if (e === 'DOCUMENT') {
    const n = (entry?.note || '').toLowerCase()
    return n.includes('reliev') ? 'relieving-letter' : 'experience-letter'
  }
  if (e === 'CASE') {
    if (a.startsWith('NOTICE_')) return 'notice'
    if (a === 'ASSET_RETURN_FLAGGED') return 'asset-return'
    return 'resignation'
  }
  return 'dashboard'
}

// ─── text / hash / time helpers ──────────────────────────────────────────────
export function pretty(s) {
  return String(s || '').toLowerCase().replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())
}
// deterministic 7-char "seal" lifted from the row's uuid — gives every entry a
// hash-stamped, tamper-evident feel without hashing anything client-side.
export const shortHash = (id) => String(id || '').replace(/[^a-f0-9]/gi, '').slice(0, 7).toUpperCase() || '0000000'

export const fmtFull = (d) => {
  if (!d) return '—'
  try { return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return String(d) }
}
export function relTime(d) {
  if (!d) return '—'
  const t = new Date(d).getTime()
  if (isNaN(t)) return '—'
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000))
  if (s < 45) return 'just now'
  if (s < 90) return '1 min ago'
  const m = Math.floor(s / 60); if (m < 60) return m + ' min ago'
  const h = Math.floor(m / 60); if (h < 24) return h + ' hr ago'
  const dd = Math.floor(h / 24); if (dd < 30) return dd + 'd ago'
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) } catch { return '—' }
}
export function isToday(d) {
  try {
    const x = new Date(d), n = new Date()
    return x.getFullYear() === n.getFullYear() && x.getMonth() === n.getMonth() && x.getDate() === n.getDate()
  } catch { return false }
}
