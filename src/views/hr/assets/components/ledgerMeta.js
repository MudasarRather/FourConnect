// ════════════════════════════════════════════════════════════════════════
//  THE LEDGER · Forensic Event Stream — shared metadata
//  ----------------------------------------------------------------------
//  The org-wide Audit-Logs surface is framed as an immutable, tamper-evident
//  LEDGER (not the per-asset "black box" that History owns). This module is the
//  single source of truth for: the family lens rail, the precise event-type
//  picker options, the activity-pulse time bucketing and the forensic
//  ref-hash. Event icon/colour/category/label all defer to histEventMeta so
//  the two surfaces never drift.
// ════════════════════════════════════════════════════════════════════════
import { Layers, PackagePlus, Send, Wrench, ArrowLeftRight, ShieldCheck } from 'lucide-vue-next'
import { eventMeta, EVENT_CATEGORIES } from './histEventMeta.js'

// ── Family lens rail (clickable telemetry chips on the console) ──
// Built atop histEventMeta's EVENT_CATEGORIES so a row's `eventMeta().category`
// maps 1:1 onto a lens. Filtering is client-side over the recent sample.
const FAMILY_ICON = {
  registry: PackagePlus,
  custody: Send,
  service: Wrench,
  movement: ArrowLeftRight,
  governance: ShieldCheck,
}
export const LENS_FAMILIES = [
  { key: 'all', label: 'All events', icon: Layers, color: 'var(--as-amber)', short: 'ALL' },
  ...EVENT_CATEGORIES.map(c => ({ ...c, icon: FAMILY_ICON[c.key] || Layers })),
]

// resolve an event_type → its family/category key (for client-side lens filter)
export const eventCategory = (k) => eventMeta(k).category

// ── Precise event-type picker (AsSelect, flat list ordered by family) ──
// A leading reset option keeps the dropdown clearable.
const EVENT_TYPE_ORDER = [
  'CREATED', 'PROCUREMENT_RECORDED', 'UPDATED', 'STATUS_CHANGED', 'DELETED',
  'ALLOCATED', 'ACKNOWLEDGED', 'RETURNED',
  'MARKED_DAMAGED', 'DAMAGE_REPORTED', 'DAMAGE_RESOLVED',
  'MAINTENANCE_SCHEDULED', 'MAINTENANCE_STARTED', 'MAINTENANCE_COMPLETED',
  'TRANSFER_REQUESTED', 'TRANSFER_APPROVED', 'TRANSFER_COMPLETED', 'TRANSFER_REJECTED',
  'AUDIT_SCANNED', 'DISPOSAL_REQUESTED', 'DISPOSAL_APPROVED', 'DISPOSAL_COMPLETED',
  'RETIRED', 'MARKED_LOST',
]
export const EVENT_TYPE_OPTIONS = [
  { value: '', label: 'All event types', icon: Layers },
  ...EVENT_TYPE_ORDER.map(k => {
    const m = eventMeta(k)
    return { value: k, label: m.label, icon: m.icon, accent: m.color }
  }),
]

// ── Tamper-evident forensic ref-hash from the immutable row id ──
// Purely presentational: a short, stable, monospace "checksum" that sells the
// ledger/forensic framing without inventing data the backend doesn't store.
export const ledgerRef = (id) => {
  const hex = String(id || '').replace(/[^a-f0-9]/gi, '').slice(0, 6).toUpperCase()
  return hex ? `0x${hex}` : '0x------'
}

// ── Activity-pulse bucketing — turns the recent sample into a time-binned
//    equalizer for LedgerPulseRibbon. Buckets ascend in time (oldest → now);
//    each carries a normalised height + the dominant family colour. ──
export function computeBuckets(rows, n = 32) {
  if (!rows || !rows.length) return { buckets: [], maxCount: 0, minTime: 0, maxTime: 0, span: 0 }
  const times = rows.map(r => new Date(r.created_at).getTime()).filter(t => !Number.isNaN(t))
  if (!times.length) return { buckets: [], maxCount: 0, minTime: 0, maxTime: 0, span: 0 }
  const minTime = Math.min(...times)
  const maxTime = Math.max(...times)
  const span = Math.max(1, maxTime - minTime)
  const buckets = Array.from({ length: n }, () => ({ count: 0, fam: {} }))
  for (const r of rows) {
    const t = new Date(r.created_at).getTime()
    if (Number.isNaN(t)) continue
    let idx = Math.floor(((t - minTime) / span) * n)
    if (idx >= n) idx = n - 1
    if (idx < 0) idx = 0
    const b = buckets[idx]
    b.count += 1
    const cat = eventCategory(r.event_type)
    b.fam[cat] = (b.fam[cat] || 0) + 1
  }
  const maxCount = Math.max(1, ...buckets.map(b => b.count))
  const colorOf = (cat) => (EVENT_CATEGORIES.find(c => c.key === cat) || {}).color || 'var(--as-amber)'
  const out = buckets.map((b, i) => {
    let domCat = null, domN = -1
    for (const k in b.fam) { if (b.fam[k] > domN) { domN = b.fam[k]; domCat = k } }
    return {
      i,
      count: b.count,
      value: b.count / maxCount,            // 0..1 normalised height
      color: domCat ? colorOf(domCat) : 'var(--as-steel-dark)',
      t: minTime + ((i + 0.5) / n) * span,  // bucket centre time (for tooltip)
    }
  })
  return { buckets: out, maxCount, minTime, maxTime, span }
}
