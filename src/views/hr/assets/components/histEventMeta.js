// Provenance / Chain-of-custody event metadata — single source of truth for the
// History "Black Box" surface (HistChronicleHero / Dossier / TapeReel / Spine /
// EventCard). Maps every AssetEventType the backend can emit to an icon, a tone
// token (from asset-theme.css), a lifecycle category (for the lens filter rail),
// a short glyph (for the recorder tape), and — crucially — the workspace tab its
// related entity lives on, so a timeline event can jump straight to its source.
import {
  PackagePlus, Pencil, Receipt, Send, CheckCheck, Undo2, SearchX, ShieldAlert,
  ArrowLeftRight, ArrowRightLeft, Wrench, Hammer, ClipboardCheck, Scan,
  Archive, Trash2, History, ShieldCheck, PackageCheck, CircleSlash, PackageOpen,
} from 'lucide-vue-next'

// category keys → lens rail meta
export const EVENT_CATEGORIES = [
  { key: 'registry',   label: 'Registry',   color: 'var(--as-steel)',          short: 'REG' },
  { key: 'custody',    label: 'Custody',     color: 'var(--as-st-allocated)',   short: 'CUS' },
  { key: 'service',    label: 'Service',     color: 'var(--as-st-maintenance)', short: 'SVC' },
  { key: 'movement',   label: 'Transfers',   color: 'var(--as-amber)',          short: 'MOV' },
  { key: 'governance', label: 'Governance',  color: 'var(--as-st-retired)',     short: 'GOV' },
]

// eventType → { icon, color, category, label, glyph }
const EVENT_META = {
  CREATED:               { icon: PackagePlus,    color: 'var(--as-st-available)',   category: 'registry',   label: 'Asset registered',     glyph: '✦' },
  PROCUREMENT_RECORDED:  { icon: Receipt,        color: 'var(--as-amber)',          category: 'registry',   label: 'Procurement recorded', glyph: '₹' },
  UPDATED:               { icon: Pencil,         color: 'var(--as-steel)',          category: 'registry',   label: 'Record updated',       glyph: '✎' },
  STATUS_CHANGED:        { icon: History,        color: 'var(--as-steel)',          category: 'registry',   label: 'Status changed',       glyph: '↻' },
  DELETED:               { icon: Trash2,         color: 'var(--as-al-lost)',        category: 'registry',   label: 'Record deleted',       glyph: '✕' },

  ALLOCATED:             { icon: Send,           color: 'var(--as-st-allocated)',   category: 'custody',    label: 'Deployed to field',    glyph: '→' },
  ACKNOWLEDGED:          { icon: CheckCheck,     color: 'var(--as-st-available)',   category: 'custody',    label: 'Custody acknowledged', glyph: '✓' },
  RETURN_REQUESTED:      { icon: PackageOpen,    color: 'var(--as-st-reserved)',    category: 'custody',    label: 'Return requested',     glyph: '⤴' },
  RETURN_REQUEST_CANCELLED:{ icon: CircleSlash,  color: 'var(--as-steel)',          category: 'custody',    label: 'Return req. withdrawn',glyph: '⤫' },
  RETURNED:              { icon: Undo2,          color: 'var(--as-al-returned)',    category: 'custody',    label: 'Recovered to bay',     glyph: '↩' },

  MARKED_DAMAGED:        { icon: ShieldAlert,    color: 'var(--as-al-damaged)',     category: 'service',    label: 'Marked damaged',       glyph: '!' },
  DAMAGE_REPORTED:       { icon: ShieldAlert,    color: 'var(--as-al-damaged)',     category: 'service',    label: 'Damage reported',      glyph: '!' },
  DAMAGE_RESOLVED:       { icon: ShieldCheck,    color: 'var(--as-st-available)',   category: 'service',    label: 'Damage resolved',      glyph: '✓' },
  MAINTENANCE_SCHEDULED: { icon: Wrench,         color: 'var(--as-st-maintenance)', category: 'service',    label: 'Service scheduled',    glyph: '⚙' },
  MAINTENANCE_STARTED:   { icon: Hammer,         color: 'var(--as-st-maintenance)', category: 'service',    label: 'Service started',      glyph: '⚙' },
  MAINTENANCE_COMPLETED: { icon: CheckCheck,     color: 'var(--as-st-available)',   category: 'service',    label: 'Service completed',    glyph: '✓' },

  TRANSFER_REQUESTED:    { icon: ArrowLeftRight, color: 'var(--as-st-reserved)',    category: 'movement',   label: 'Transfer requested',   glyph: '⇄' },
  TRANSFER_APPROVED:     { icon: ArrowRightLeft, color: 'var(--as-st-allocated)',   category: 'movement',   label: 'Transfer approved',    glyph: '⇄' },
  TRANSFER_COMPLETED:    { icon: ArrowLeftRight, color: 'var(--as-amber)',          category: 'movement',   label: 'Transfer completed',   glyph: '⇄' },
  TRANSFER_REJECTED:     { icon: CircleSlash,    color: 'var(--as-al-lost)',        category: 'movement',   label: 'Transfer rejected',    glyph: '✕' },

  AUDIT_SCANNED:         { icon: Scan,           color: 'var(--as-st-allocated)',   category: 'governance', label: 'Audit scan',           glyph: '◎' },
  DISPOSAL_REQUESTED:    { icon: ClipboardCheck, color: 'var(--as-st-reserved)',    category: 'governance', label: 'Disposal requested',   glyph: '⊘' },
  DISPOSAL_APPROVED:     { icon: ClipboardCheck, color: 'var(--as-st-allocated)',   category: 'governance', label: 'Disposal approved',    glyph: '⊘' },
  DISPOSAL_COMPLETED:    { icon: Archive,        color: 'var(--as-st-retired)',     category: 'governance', label: 'Disposal completed',   glyph: '⊘' },
  RETIRED:               { icon: Archive,        color: 'var(--as-st-retired)',     category: 'governance', label: 'Retired',              glyph: '◾' },
  MARKED_LOST:           { icon: SearchX,        color: 'var(--as-al-lost)',        category: 'governance', label: 'Marked lost',          glyph: '?' },
}

const FALLBACK = { icon: History, color: 'var(--as-amber)', category: 'registry', label: 'Event', glyph: '•' }
export const eventMeta = (k) => EVENT_META[k] || { ...FALLBACK, label: titleize(k) }

// related_entity_type (lowercase, from the backend) → workspace tab key
const RELATED_TAB = {
  allocation: 'allocations',
  transfer: 'transfers',
  maintenance: 'maintenance',
  damage: 'damage',
  disposal: 'disposal',
  audit: 'audits',
}
export const relatedTab = (t) => RELATED_TAB[(t || '').toLowerCase()] || null

export function titleize(k) {
  return String(k || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

// "12 Jun · 14:30" style stamp
export function fmtStamp(d) {
  if (!d) return ''
  return new Date(d).toLocaleString(undefined, {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  }).replace(',', ' ·')
}

// human "3 days ago" relative — used in the recent-activity rail
export function relTime(d) {
  if (!d) return ''
  const diff = (Date.now() - new Date(d).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  const days = Math.floor(diff / 86400)
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}
