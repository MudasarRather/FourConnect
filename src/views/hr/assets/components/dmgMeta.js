// Damage "Triage Bay" metadata — single source of truth for the incident
// response surface (DmgTriageHero / DmgIncidentCard / LogDamageModal /
// DmgResolveModal). Severity drives an ECG amplitude (a damaged asset is a
// patient on a monitor); status drives a triage pipeline. Colours come from
// asset-theme.css so dark + light themes both work.
import {
  Siren, Search, Wrench, ShieldCheck, Archive, Ban,
  AlertTriangle, AlertOctagon, Skull, Bug,
} from 'lucide-vue-next'

// ── Severity (impact magnitude) ──
const SEVERITY = {
  MINOR:      { label: 'Minor',      color: 'var(--as-cond-good)', amp: 0.32, icon: Bug,           rank: 1 },
  MODERATE:   { label: 'Moderate',   color: 'var(--as-cond-fair)', amp: 0.55, icon: AlertTriangle, rank: 2 },
  MAJOR:      { label: 'Major',      color: 'var(--as-cond-poor)', amp: 0.80, icon: AlertOctagon,  rank: 3 },
  TOTAL_LOSS: { label: 'Total loss', color: 'var(--as-al-lost)',   amp: 1.00, icon: Skull,         rank: 4 },
}
export const SEVERITIES = Object.keys(SEVERITY)
export const sevMeta = (k) => SEVERITY[k] || SEVERITY.MINOR

// ── Status (triage state) ──
const STATUS = {
  REPORTED:     { label: 'Reported',    color: 'var(--as-st-reserved)',    icon: Siren,       stage: 0 },
  UNDER_REVIEW: { label: 'Under review', color: 'var(--as-st-allocated)',  icon: Search,      stage: 1 },
  IN_REPAIR:    { label: 'In repair',   color: 'var(--as-st-maintenance)', icon: Wrench,      stage: 2 },
  RESOLVED:     { label: 'Resolved',    color: 'var(--as-st-available)',   icon: ShieldCheck, stage: 3 },
  WRITE_OFF:    { label: 'Written off', color: 'var(--as-st-retired)',     icon: Archive,     stage: 3 },
  REJECTED:     { label: 'Rejected',    color: 'var(--as-al-lost)',        icon: Ban,         stage: 3 },
}
export const statusMeta = (k) => STATUS[k] || STATUS.REPORTED

// linear triage backbone the ticket travels (off-ramps WRITE_OFF/REJECTED handled by stage)
export const TRIAGE_PIPELINE = [
  { key: 'REPORTED',     label: 'Reported',  icon: Siren },
  { key: 'UNDER_REVIEW', label: 'Review',    icon: Search },
  { key: 'IN_REPAIR',    label: 'Repair',    icon: Wrench },
  { key: 'RESOLVED',     label: 'Resolved',  icon: ShieldCheck },
]
export const isTerminal = (k) => ['RESOLVED', 'WRITE_OFF', 'REJECTED'].includes(k)
export const isOpen = (k) => !isTerminal(k)

// allowed transitions mirror the backend state machine (state.py · ALLOWED_DAMAGE_STATUS)
export const NEXT_ACTIONS = {
  REPORTED:     [{ to: 'UNDER_REVIEW', label: 'Begin review', kind: 'advance' }, { to: 'REJECTED', label: 'Reject', kind: 'reject' }],
  UNDER_REVIEW: [{ to: 'IN_REPAIR', label: 'Send to repair', kind: 'advance' }, { to: 'RESOLVED', label: 'Resolve', kind: 'resolve' }, { to: 'REJECTED', label: 'Reject', kind: 'reject' }],
  IN_REPAIR:    [{ to: 'RESOLVED', label: 'Resolve', kind: 'resolve' }, { to: 'WRITE_OFF', label: 'Write off', kind: 'writeoff' }],
}

export function titleize(s) {
  return String(s || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

export function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── ECG / heartbeat generator ────────────────────────────────────────────────
// One realistic cardiac complex per beat (P-Q-R-S-T), sampled to a polyline.
// `amp` 0..1 scales the spike height; returns an SVG points string.
function beatY(phase) {
  // phase 0..1 within a single beat; returns deflection (-0.35..1, baseline 0)
  const bump = (centre, width, height) => {
    const d = Math.abs(phase - centre)
    return d < width ? height * Math.cos((d / width) * (Math.PI / 2)) : 0
  }
  let y = 0
  y += bump(0.18, 0.05, 0.12)    // P wave
  y -= bump(0.40, 0.018, 0.18)   // Q dip
  y += (Math.abs(phase - 0.45) < 0.022 ? (1 - Math.abs(phase - 0.45) / 0.022) : 0) // R spike (sharp)
  y -= bump(0.50, 0.03, 0.30)    // S dip
  y += bump(0.72, 0.07, 0.22)    // T wave
  return y
}

export function ecgPoints(width = 600, height = 60, beats = 4, amp = 0.7, samples = 320) {
  const mid = height * 0.56
  const scale = height * 0.42 * Math.max(0.12, amp)
  const out = []
  for (let i = 0; i <= samples; i++) {
    const x = (i / samples) * width
    const phase = ((i / samples) * beats) % 1
    const y = mid - beatY(phase) * scale
    out.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return out.join(' ')
}
