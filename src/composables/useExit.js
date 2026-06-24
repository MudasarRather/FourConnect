// Data layer for the HR Exit Management module ("The Threshold — Ceremonial Gateway").
// Reactive list state + workflow actions over /api/hr/exit, self-service over
// /api/hr/me/exit, plus the lifecycle bridge that reuses the employee endpoints.
// Mirrors useTravel.js.
import { ref, computed, watch, unref } from 'vue'
import axios from 'axios'
import {
  FileText, ShieldCheck, CalendarClock, Handshake, MessagesSquare, ClipboardCheck,
  PackageCheck, Scale, ScrollText, BadgeCheck, Archive, DoorOpen,
  Clock, Hourglass, CheckCircle2, XCircle, Undo2, Ban, Wallet, RotateCcw,
  Users, Landmark, Building2, Server, ShieldX, Lock, Briefcase, UserCheck, Plane,
  UserMinus, GraduationCap, Home, HeartPulse, TrendingUp, Sparkles, AlertTriangle,
  MailX, KeyRound, Laptop, WifiOff, BookLock, Coins, ReceiptText, IdCard, ScanFace,
  UserCog, LogOut,
} from 'lucide-vue-next'
import { API, authHeader } from '@/utils/api'

const BASE = `${API}/hr/exit`
const ME = `${API}/hr/me/exit`
const EMP = `${API}/hr/employees`
const H = () => ({ headers: authHeader() })

// ─── error text (FastAPI 422 returns detail as array) ───────────────────────
export function errText(e, fallback = 'Something went wrong') {
  const d = e?.response?.data?.detail
  if (!d) return e?.message || fallback
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map(x => x?.msg || (typeof x === 'string' ? x : JSON.stringify(x))).join('; ') || fallback
  if (typeof d === 'object') return d.msg || JSON.stringify(d)
  return String(d)
}

// ─── money / dates ──────────────────────────────────────────────────────────
export const fmtINR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })
export const fmtINR2 = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const fmtCompactINR = (n) => {
  const v = Number(n || 0); const a = Math.abs(v)
  if (a >= 1e7) return '₹' + (v / 1e7).toFixed(a >= 1e8 ? 0 : 1).replace(/\.0$/, '') + 'Cr'
  if (a >= 1e5) return '₹' + (v / 1e5).toFixed(a >= 1e6 ? 0 : 1).replace(/\.0$/, '') + 'L'
  if (a >= 1e3) return '₹' + (v / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'k'
  return '₹' + Math.round(v)
}
export const fmtDate = (d) => {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return String(d) }
}
// LOCAL calendar date (YYYY-MM-DD), not UTC. Using toISOString() directly returns
// the UTC date, which near midnight is a day off from the user's (and the backend's
// IST) day — that off-by-one made the drawer show "30d left" while the board showed
// "29d". Shifting by the tz offset keeps day-math aligned with the server's date.today().
export const todayISO = () => {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}
export const daysBetween = (a, b) => {
  if (!a || !b) return null
  const ms = new Date(b).setHours(0, 0, 0, 0) - new Date(a).setHours(0, 0, 0, 0)
  return Math.round(ms / 86400000)
}
export const daysRemaining = (lwd) => (lwd ? daysBetween(todayISO(), lwd) : null)
export const addDays = (d, n) => {
  const base = d ? new Date(d) : new Date()
  if (isNaN(base.getTime())) return ''
  base.setHours(0, 0, 0, 0)
  base.setDate(base.getDate() + (Number(n) || 0))
  const off = base.getTimezoneOffset()
  return new Date(base.getTime() - off * 60000).toISOString().slice(0, 10)
}
export const initials = (name) => (name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase() || '—'

// ─── the 10-stage exit procession (the Ceremonial Gateway) ──────────────────
export const EXIT_STAGES = [
  { key: 'resignation', label: 'Resignation', icon: FileText },
  { key: 'approval', label: 'Approval', icon: ShieldCheck },
  { key: 'notice', label: 'Notice Period', icon: CalendarClock },
  { key: 'handover', label: 'Knowledge Transfer', icon: Handshake },
  { key: 'interview', label: 'Exit Interview', icon: MessagesSquare },
  { key: 'clearance', label: 'Clearance', icon: ClipboardCheck },
  { key: 'assets', label: 'Asset Return', icon: PackageCheck },
  { key: 'settlement', label: 'Final Settlement', icon: Scale },
  { key: 'experience', label: 'Experience Letter', icon: ScrollText },
  { key: 'relieving', label: 'Relieving Letter', icon: BadgeCheck },
  { key: 'archived', label: 'Archived', icon: Archive },
]
export const stageIndex = (key) => EXIT_STAGES.findIndex(s => s.key === key)
export const stageMeta = (key) => EXIT_STAGES.find(s => s.key === key) || EXIT_STAGES[0]

// ─── case-status metadata ───────────────────────────────────────────────────
export const CASE_STATUS = [
  { key: 'DRAFT', label: 'Draft', icon: FileText, tone: 'draft', hex: '#9ca3af' },
  { key: 'SUBMITTED', label: 'Submitted', icon: Hourglass, tone: 'submitted', hex: '#fbbf24' },
  { key: 'MANAGER_REVIEW', label: 'Manager review', icon: ShieldCheck, tone: 'review', hex: '#f59e0b' },
  { key: 'ACCEPTED', label: 'Accepted', icon: CheckCircle2, tone: 'accepted', hex: '#fb923c' },
  { key: 'NOTICE_PERIOD', label: 'Serving notice', icon: CalendarClock, tone: 'notice', hex: '#ea580c' },
  { key: 'CLEARANCE', label: 'Clearance', icon: ClipboardCheck, tone: 'clearance', hex: '#d97706' },
  { key: 'SETTLEMENT', label: 'Settlement', icon: Scale, tone: 'settlement', hex: '#34d399' },
  { key: 'COMPLETED', label: 'Relieved', icon: BadgeCheck, tone: 'completed', hex: '#60d394' },
  { key: 'WITHDRAWN', label: 'Withdrawn', icon: Undo2, tone: 'withdrawn', hex: '#6b7280' },
  { key: 'REJECTED', label: 'Rejected', icon: XCircle, tone: 'rejected', hex: '#ef4444' },
  { key: 'CANCELLED', label: 'Cancelled', icon: Ban, tone: 'cancelled', hex: '#6b7280' },
]
const CASE_STATUS_BY_KEY = Object.fromEntries(CASE_STATUS.map(s => [s.key, s]))
export const caseStatusMeta = (k) => CASE_STATUS_BY_KEY[k] || { key: k, label: k, icon: Clock, tone: 'draft', hex: '#9ca3af' }

// A case may be expunged only before it is ACCEPTED (no clearance / settlement /
// lifecycle artefacts yet) or once it is closed. Mirrors DELETABLE_STATUSES on the
// backend — keep both in sync.
export const DELETABLE_STATUSES = ['DRAFT', 'SUBMITTED', 'MANAGER_REVIEW', 'REJECTED', 'WITHDRAWN', 'CANCELLED']
// Not-yet-accepted (live) cases vs closed cases — drives the modal's copy.
export const PRE_ACCEPT_STATUSES = ['DRAFT', 'SUBMITTED', 'MANAGER_REVIEW']
export const isDeletable = (status) => DELETABLE_STATUSES.includes(status)
export const isPreAccept = (status) => PRE_ACCEPT_STATUSES.includes(status)

// ─── resignation types ──────────────────────────────────────────────────────
export const RESIGNATION_TYPES = [
  { key: 'VOLUNTARY', label: 'Voluntary', icon: DoorOpen, selfAllowed: true },
  { key: 'RETIREMENT', label: 'Retirement', icon: Sparkles, selfAllowed: true },
  { key: 'CONTRACT_COMPLETION', label: 'Contract completion', icon: FileText, selfAllowed: true },
  { key: 'PROBATION_EXIT', label: 'Probation exit', icon: Clock, selfAllowed: true },
  { key: 'MUTUAL_SEPARATION', label: 'Mutual separation', icon: Handshake, selfAllowed: false },
  { key: 'TERMINATION', label: 'Termination', icon: ShieldX, selfAllowed: false },
  { key: 'TRANSFER', label: 'Transfer out', icon: Plane, selfAllowed: true },
]
export const resignationTypeMeta = (k) => RESIGNATION_TYPES.find(t => t.key === k) || RESIGNATION_TYPES[0]

// ─── reason categories ──────────────────────────────────────────────────────
export const REASON_CATEGORIES = [
  { key: 'BETTER_OPPORTUNITY', label: 'Better opportunity', icon: TrendingUp },
  { key: 'COMPENSATION', label: 'Compensation', icon: Wallet },
  { key: 'RELOCATION', label: 'Relocation', icon: Home },
  { key: 'HIGHER_STUDIES', label: 'Higher studies', icon: GraduationCap },
  { key: 'HEALTH', label: 'Health', icon: HeartPulse },
  { key: 'PERSONAL', label: 'Personal', icon: Users },
  { key: 'WORK_ENVIRONMENT', label: 'Work environment', icon: Building2 },
  { key: 'CAREER_GROWTH', label: 'Career growth', icon: TrendingUp },
  { key: 'RETIREMENT', label: 'Retirement', icon: Sparkles },
  { key: 'PERFORMANCE', label: 'Performance', icon: AlertTriangle },
  { key: 'MISCONDUCT', label: 'Misconduct', icon: ShieldX },
  { key: 'REDUNDANCY', label: 'Redundancy', icon: UserMinus },
  { key: 'CONTRACT_END', label: 'Contract end', icon: FileText },
  { key: 'OTHER', label: 'Other', icon: FileText },
]
export const reasonMeta = (k) => REASON_CATEGORIES.find(r => r.key === k) || REASON_CATEGORIES[REASON_CATEGORIES.length - 1]

// ─── clearance departments + statuses ───────────────────────────────────────
export const CLEARANCE_DEPTS = [
  { key: 'MANAGER', label: 'Manager', icon: Briefcase, hex: '#fbbf24' },
  { key: 'IT', label: 'IT', icon: Server, hex: '#fb923c' },
  { key: 'FINANCE', label: 'Finance', icon: Landmark, hex: '#34d399' },
  { key: 'HR', label: 'HR', icon: Users, hex: '#fb923c' },
  { key: 'ADMIN', label: 'Admin', icon: Building2, hex: '#d97706' },
  { key: 'SECURITY', label: 'Security', icon: Lock, hex: '#f59e0b' },
  { key: 'PROJECT', label: 'Project', icon: ClipboardCheck, hex: '#ea580c' },
]
export const clearanceDeptMeta = (k) => CLEARANCE_DEPTS.find(d => d.key === k) || { key: k, label: k, icon: ClipboardCheck, hex: '#9ca3af' }
export const CLEARANCE_STATUS = [
  { key: 'PENDING', label: 'Pending', hex: '#9ca3af' },
  { key: 'IN_PROGRESS', label: 'In progress', hex: '#fbbf24' },
  { key: 'CLEARED', label: 'Cleared', hex: '#34d399' },
  { key: 'BLOCKED', label: 'Blocked', hex: '#ef4444' },
  { key: 'NA', label: 'N/A', hex: '#6b7280' },
]
export const clearanceStatusMeta = (k) => CLEARANCE_STATUS.find(s => s.key === k) || CLEARANCE_STATUS[0]

// ─── per-component sign-off playbook ────────────────────────────────────────
// Each clearance obligation signs off *differently*. Keyed on the stable
// `item_key` seeded by the backend template, this drives the cinematic sign-off
// console: a component-specific icon + animated motif, a one-line brief, an
// optional system-effect notice, a verification checklist (the "process"),
// remark presets, and whether a recovery charge is relevant. Unknown keys fall
// back to a sensible per-department profile so custom policy items still work.
const ITEM_PLAYBOOK = {
  // ── MANAGER ──
  mgr_handover: {
    icon: Handshake, motif: 'handover',
    brief: 'Confirm all active work, documents and credentials are transferred to the team.',
    steps: ['Pending tasks reassigned to a successor', 'Project docs & repositories handed over', 'Active client / vendor threads transferred', 'Handover note acknowledged by the manager'],
    presets: ['Handover note signed', 'Reassigned to successor', 'Nothing left pending'],
  },
  mgr_knowledge_transfer: {
    icon: GraduationCap, motif: 'handover',
    brief: 'Verify domain knowledge and KT sessions are complete and documented.',
    steps: ['KT sessions conducted with the team', 'KT documentation uploaded', 'Successor confirms readiness', 'Open questions logged & owned'],
    presets: ['KT sessions complete', 'Docs uploaded', 'Successor ready'],
  },
  // ── IT ──
  it_email_revoke: {
    icon: MailX, motif: 'access-revoke',
    brief: 'Disable corporate email & SSO so the leaver loses identity-based access.',
    system: 'Email and SSO identity are disabled on the last working day.',
    steps: ['Mailbox forwarding / delegation set', 'Out-of-office configured', 'SSO / IdP account disabled', 'Mailbox export / archive taken'],
    presets: ['Mailbox archived & disabled', 'Forwarding set to manager', 'SSO revoked'],
  },
  it_erp_login: {
    icon: KeyRound, motif: 'erp-revoke',
    brief: 'Revoke the employee’s ERP (FourConnect) login & credentials — the account that grants ERP access.',
    system: 'ERP login is disabled via Account Provisioning — password is reset and is_active / is_activated are cleared.',
    steps: ['ERP account located (work-email login)', 'Active ERP sessions terminated', 'Login credentials revoked / disabled', 'Roles & data-access removed', 'Owned records re-assigned (if any)'],
    presets: ['ERP login disabled', 'Credentials revoked, sessions killed', 'Access fully de-provisioned'],
    link: { tab: 'asset-return', label: 'Account provisioning' },
  },
  it_laptop_return: {
    icon: Laptop, motif: 'device',
    brief: 'Recover company hardware. Unreturned devices are charged to the final settlement.',
    steps: ['Laptop / device collected', 'Charger & accessories returned', 'Device wiped / re-imaged', 'Asset record marked returned'],
    presets: ['Device returned & wiped', 'All accessories collected'],
    recovery: { label: 'Unrecovered hardware value', hint: 'Charged to F&F if the device is not returned' },
    link: { tab: 'asset-return', label: 'Asset recovery' },
  },
  it_vpn_revoke: {
    icon: WifiOff, motif: 'access-revoke',
    brief: 'Revoke remote / VPN network access and de-register MFA.',
    steps: ['VPN profile revoked', 'Network certificates revoked', 'MFA tokens de-registered', 'Active sessions terminated'],
    presets: ['VPN revoked', 'MFA de-registered'],
  },
  it_repo_access: {
    icon: BookLock, motif: 'access-revoke',
    brief: 'Revoke source-code, repository and deployment access.',
    steps: ['Git / repo org membership removed', 'CI/CD & deploy keys revoked', 'Personal access tokens revoked', 'Shared secrets rotated'],
    presets: ['Repo access removed', 'Tokens revoked, secrets rotated'],
  },
  // ── FINANCE ──
  fin_loan_advance: {
    icon: Coins, motif: 'ledger',
    brief: 'Close outstanding loans and salary advances against the final settlement.',
    steps: ['Outstanding loan balance computed', 'Advance balance computed', 'Recovery scheduled in F&F', 'Employee acknowledged the dues'],
    presets: ['No dues outstanding', 'Recovery scheduled in F&F'],
    // Travel advances auto-recover (read live); this ₹ captures any OTHER loan /
    // salary advance → settlement.loan_recovery on seal (see apply-fin-loans).
    recovery: { label: 'Other loan / salary advance', hint: 'Travel advances auto-recover — enter only non-travel loans here' },
    link: { tab: 'settlement', label: 'Final settlement' },
    apply: {
      kind: 'fin',
      verb: 'Schedule recovery',
      tasks: [
        { key: 'loan_balance_computed', target: 'F&F · loan recovery', icon: Coins, note: 'Confirm the outstanding loan / salary-advance balance.' },
        { key: 'advance_balance_computed', target: 'F&F · advance recovery', icon: Plane, note: 'Travel advances are read live and auto-recovered.' },
        { key: 'recovery_scheduled', target: 'F&F settlement', icon: Scale, note: 'Schedules the dues into the Full & Final on seal.' },
        { key: 'employee_acknowledged', target: 'Acknowledgement', icon: BadgeCheck, note: 'Employee has acknowledged the dues to be recovered.' },
      ],
    },
  },
  fin_reimbursement: {
    icon: ReceiptText, motif: 'ledger',
    brief: 'Settle or close every pending reimbursement claim.',
    steps: ['Pending claims reviewed', 'Approved claims queued for payout', 'Rejected / withdrawn claims closed', 'No claims left in-flight'],
    presets: ['All claims settled', 'No claims pending'],
  },
  // ── ADMIN ──
  adm_access_card: {
    icon: IdCard, motif: 'badge',
    brief: 'Collect the physical access / ID card and deactivate it.',
    steps: ['Access / ID card collected', 'Card deactivated in the access system', 'Visitor / temporary passes returned'],
    presets: ['Card collected & deactivated'],
    recovery: { label: 'Lost-card charge', hint: 'Charged if the card is not returned' },
  },
  adm_locker: {
    icon: Building2, motif: 'badge',
    brief: 'Clear locker, parking and other facility allocations.',
    steps: ['Locker emptied & key returned', 'Parking pass returned', 'Facility / wallet balance settled'],
    presets: ['Locker & parking cleared'],
  },
  // ── SECURITY ──
  sec_premises: {
    icon: DoorOpen, motif: 'access-revoke',
    brief: 'Revoke physical premises and secure-zone access.',
    steps: ['Building access groups removed', 'After-hours access revoked', 'Datacenter / secure-zone access removed'],
    presets: ['Premises access revoked'],
  },
  sec_biometric: {
    icon: ScanFace, motif: 'biometric',
    brief: 'De-register the biometric enrolment from every device.',
    steps: ['Fingerprint / face template deleted', 'Biometric devices synced', 'Attendance device de-enrolled'],
    presets: ['Biometric de-registered'],
  },
  // ── PROJECT ──
  prj_client_handover: {
    icon: Handshake, motif: 'handover',
    brief: 'Complete the client-facing handover and revoke client-system access.',
    steps: ['Client informed of the transition', 'Access to client systems revoked', 'Deliverables transferred to the team', 'Client sign-off obtained'],
    presets: ['Client handover complete', 'Client systems access revoked'],
  },
  // ── HR ──
  hr_exit_interview: {
    icon: MessagesSquare, motif: 'seal',
    brief: 'Confirm the exit interview / survey is complete and feedback is captured.',
    steps: ['Interview conducted or survey submitted', 'Feedback recorded', 'Attrition reason captured'],
    presets: ['Interview complete', 'Survey submitted'],
    link: { tab: 'interviews', label: 'Exit interviews' },
  },
  hr_records: {
    icon: ScrollText, motif: 'seal',
    brief: 'Update employee records, statutory data and lifecycle state.',
    steps: ['HRIS status updated', 'Documents archived', 'Statutory records updated (PF / ESI)', 'Lifecycle set to exited on LWD'],
    presets: ['Records updated & archived'],
    // Each task WRITES to the named record on seal (see apply-hr-records). Aligned
    // by index with `steps`. The lifecycle task runs the real EXIT transition.
    apply: {
      kind: 'records',
      verb: 'Finalise records',
      tasks: [
        { key: 'hris_status', target: 'Employee record', icon: UserCog, note: 'Writes an HRIS-status row to the employee timeline.' },
        { key: 'documents_archived', target: 'Personnel file', icon: Archive, note: 'Records the personnel-file archival.' },
        { key: 'statutory_updated', target: 'Statutory · PF / ESI', icon: Landmark, note: 'Marks PF / ESI statutory records updated.' },
        { key: 'lifecycle_exited', target: 'Lifecycle state', icon: LogOut, danger: true,
          note: 'Sets the employee to EXITED on their last working day and triggers asset off-boarding.' },
      ],
    },
  },
  hr_ff_ack: {
    icon: BadgeCheck, motif: 'seal',
    brief: 'Obtain the employee’s Full & Final acknowledgement.',
    steps: ['F&F statement shared with the employee', 'Employee acknowledged the amounts', 'Payout schedule confirmed'],
    presets: ['F&F acknowledged', 'Payout schedule confirmed'],
    link: { tab: 'settlement', label: 'Final settlement' },
    // Each task is written onto the F&F settlement record (see apply-ff-ack).
    apply: {
      kind: 'ff',
      verb: 'Record acknowledgement',
      tasks: [
        { key: 'statement_shared', target: 'F&F settlement', icon: FileText, note: 'Stamps when the statement was shared.' },
        { key: 'employee_acknowledged', target: 'F&F settlement', icon: BadgeCheck, note: 'Records the employee’s acknowledgement of the amounts.' },
        { key: 'payout_confirmed', target: 'Payout schedule', icon: CalendarClock, note: 'Confirms the payout schedule on the settlement.' },
      ],
    },
  },
}
const DEPT_FALLBACK = {
  MANAGER: { icon: Handshake, motif: 'handover' },
  IT: { icon: Server, motif: 'access-revoke' },
  FINANCE: { icon: Landmark, motif: 'ledger' },
  ADMIN: { icon: Building2, motif: 'badge' },
  SECURITY: { icon: Lock, motif: 'access-revoke' },
  PROJECT: { icon: ClipboardCheck, motif: 'handover' },
  HR: { icon: ScrollText, motif: 'seal' },
}
export function clearanceItemPlaybook(itemKey, department) {
  const known = ITEM_PLAYBOOK[itemKey]
  if (known) return known
  const fb = DEPT_FALLBACK[department] || { icon: ClipboardCheck, motif: 'generic' }
  return {
    icon: fb.icon, motif: fb.motif,
    brief: 'Verify this obligation is satisfied before signing off the gate.',
    steps: ['Obligation verified by the gate-keeper', 'Supporting records updated', 'Nothing left outstanding'],
    presets: ['Verified & cleared', 'Nothing outstanding'],
  }
}

// ─── settlement / letter / interview statuses ───────────────────────────────
export const SETTLEMENT_STATUS = [
  { key: 'DRAFT', label: 'Draft', hex: '#9ca3af' },
  { key: 'VERIFIED', label: 'Verified', hex: '#fbbf24' },
  { key: 'APPROVED', label: 'Approved', hex: '#fb923c' },
  { key: 'PAID', label: 'Paid', hex: '#34d399' },
  { key: 'CLOSED', label: 'Closed', hex: '#60d394' },
  { key: 'REVERSED', label: 'Reversed', hex: '#fb923c' },
]
export const settlementStatusMeta = (k) => SETTLEMENT_STATUS.find(s => s.key === k) || SETTLEMENT_STATUS[0]
export const LETTER_STATUS = [
  { key: 'NOT_GENERATED', label: 'Not generated', hex: '#9ca3af' },
  { key: 'GENERATED', label: 'Generated', hex: '#fbbf24' },
  { key: 'ISSUED', label: 'Issued', hex: '#34d399' },
  { key: 'REVOKED', label: 'Revoked', hex: '#ef4444' },
]
export const letterStatusMeta = (k) => LETTER_STATUS.find(s => s.key === k) || LETTER_STATUS[0]
export const INTERVIEW_STATUS = [
  { key: 'PENDING', label: 'To schedule', hex: '#a8a29e' },
  { key: 'SCHEDULED', label: 'Scheduled', hex: '#fbbf24' },
  { key: 'IN_PROGRESS', label: 'In progress', hex: '#fb923c' },
  { key: 'COMPLETED', label: 'Completed', hex: '#34d399' },
  { key: 'SKIPPED', label: 'Skipped', hex: '#6b7280' },
  { key: 'CANCELLED', label: 'Cancelled', hex: '#6b7280' },
]
// Default to PENDING ("To schedule") when status is unknown/missing — a slot exists
// the moment a separation is accepted, but it isn't scheduled until HR acts.
export const interviewStatusMeta = (k) => INTERVIEW_STATUS.find(s => s.key === k) || INTERVIEW_STATUS[0]

// ─── color helpers ───────────────────────────────────────────────────────────
export const clearanceColor = (k) => clearanceStatusMeta(k).hex
export const stageColor = (done, blocked, current) =>
  blocked ? 'var(--ex-blocked)' : done ? 'var(--ex-cleared)' : current ? 'var(--ex-violet)' : 'var(--ex-steel)'

// ─── F&F netting helper (mirror the backend engine for live previews) ────────
export function fnfReconcile({ earnings = 0, recoveries = 0 } = {}) {
  const e = Number(earnings) || 0
  const r = Number(recoveries) || 0
  const net = e - r
  return {
    totalEarnings: e, totalRecoveries: r, net,
    payable: net > 0 ? net : 0, recoverable: net < 0 ? -net : 0,
    direction: net > 0 ? 'payable' : net < 0 ? 'recoverable' : 'balanced',
  }
}

// ─── notice-served gate (mirror of backend notice_serving.is_notice_served) ──
// The F&F disburses only AFTER notice is served: already separated, formally
// waived, or the last working day has arrived. Used to gate the Disburse action.
const _SEPARATED = ['EXITED', 'ARCHIVED', 'INACTIVE']
export function noticeServed(c) {
  if (!c) return { served: false, reason: 'No case selected.', remainingDays: null }
  if (_SEPARATED.includes(c.lifecycle_state)) return { served: true, reason: null, remainingDays: null }
  if (c.notice_waived) return { served: true, reason: null, remainingDays: null }
  const lwd = c.last_working_date ? new Date(c.last_working_date + 'T00:00:00') : null
  if (!lwd || isNaN(lwd.getTime())) {
    return { served: false, reason: 'Set the last working day before the Full & Final can be disbursed.', remainingDays: null }
  }
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const remaining = Math.ceil((lwd - today) / 86400000)
  if (remaining <= 0) return { served: true, reason: null, remainingDays: remaining }
  const dl = lwd.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
  return {
    served: false,
    remainingDays: remaining,
    reason: `Notice is still being served — ${remaining} day${remaining === 1 ? '' : 's'} remain to the last working day (${dl}). The F&F can be disbursed once notice is served.`,
  }
}

// ─── single-case stage state for the procession (best-effort from detail) ────
export function exitStageState(c) {
  const done = {}
  if (!c) return { done, currentIndex: 0, lifecycle: null }
  const st = c.status
  const lc = c.lifecycle_state
  const closed = ['REJECTED', 'WITHDRAWN', 'CANCELLED'].includes(st)
  const docIssued = (t) => (c.documents || []).some(d => d.doc_type === t && d.status === 'ISSUED')
  done.resignation = true
  done.approval = !['DRAFT', 'SUBMITTED', 'MANAGER_REVIEW'].includes(st) || c.manager_decision === 'APPROVED'
  done.notice = !!c.notice_period_start_date || ['CLEARANCE', 'SETTLEMENT', 'COMPLETED'].includes(st)
  done.handover = (c.clearance_progress_pct || 0) >= 50 || ['SETTLEMENT', 'COMPLETED'].includes(st)
  done.interview = (c.interview?.status === 'COMPLETED')
  done.clearance = (c.clearance_progress_pct || 0) >= 100 || ['SETTLEMENT', 'COMPLETED'].includes(st)
  done.assets = done.clearance
  done.settlement = ['PAID', 'CLOSED'].includes(c.settlement?.status)
  done.experience = docIssued('EXPERIENCE_LETTER')
  done.relieving = docIssued('RELIEVING_LETTER')
  done.archived = lc === 'ARCHIVED'
  // current = first not-done (unless closed).
  let currentIndex = EXIT_STAGES.findIndex(s => !done[s.key])
  if (currentIndex < 0) currentIndex = EXIT_STAGES.length - 1
  return { done, currentIndex, lifecycle: lc, closed }
}

// ─── reactive list factory ────────────────────────────────────────────────────
export function useExitCases(initial = {}) {
  const items = ref([])
  const total = ref(0)
  const loading = ref(false)
  const filters = ref({ page: 1, limit: 20, q: '', status: '', resignation_type: '', department_id: '', ...initial })
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / (filters.value.limit || 20))))

  const fetchList = async () => {
    loading.value = true
    try {
      const params = {}
      Object.entries(filters.value).forEach(([k, v]) => { if (v !== '' && v != null) params[k] = v })
      const { data } = await axios.get(`${BASE}/cases`, { params, ...H() })
      items.value = data.items || []
      total.value = data.total || 0
    } finally { loading.value = false }
  }
  const setFilters = (patch) => { filters.value = { ...filters.value, ...patch }; if (!('page' in patch)) filters.value.page = 1 }
  return { items, total, totalPages, loading, filters, fetchList, setFilters }
}

// ─── client-side pager (for sections that load a full set then slice locally) ──
// Pass a ref/computed array; get back a page-state + the current page's slice.
// Auto-clamps the page when the source shrinks (e.g. a filter narrows the list).
export function useClientPage(sourceRef, perPage = 10) {
  const page = ref(1)
  const total = computed(() => (unref(sourceRef) || []).length)
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage)))
  const paged = computed(() => {
    const start = (page.value - 1) * perPage
    return (unref(sourceRef) || []).slice(start, start + perPage)
  })
  watch(totalPages, (tp) => { if (page.value > tp) page.value = tp })
  const reset = () => { page.value = 1 }
  return { page, total, totalPages, paged, perPage, reset }
}

// ─── admin reads ──────────────────────────────────────────────────────────────
export const fetchStats = async () => (await axios.get(`${BASE}/dashboard`, H())).data
export const fetchCases = async (params = {}) => (await axios.get(`${BASE}/cases`, { params, ...H() })).data
export const fetchCase = async (id) => (await axios.get(`${BASE}/${id}`, H())).data
// Resolve an employee's OPEN exit case (or null) — powers the "Initiate Exit"
// deep-link from the employee profile so the Resignation tab can focus an
// existing case rather than create a duplicate. Returns { employee, open_case }.
export const fetchActiveCaseForEmployee = async (employeeId) =>
  (await axios.get(`${BASE}/cases/active-for-employee`, { params: { employee_id: employeeId }, ...H() })).data
export const fetchNoticeBoard = async () => (await axios.get(`${BASE}/notice-board`, H())).data
export const fetchNoticeServing = async (id) => (await axios.get(`${BASE}/${id}/notice-serving`, H())).data
export const fetchNoticePreview = async (employeeId, resignationType = 'VOLUNTARY') =>
  (await axios.get(`${BASE}/notice-preview`, { params: { employee_id: employeeId, resignation_type: resignationType }, ...H() })).data
export const fetchClearance = async (id) => (await axios.get(`${BASE}/${id}/clearance`, H())).data
export const fetchInterview = async (id) => (await axios.get(`${BASE}/${id}/interview`, H())).data
export const fetchExitAssets = async (id) => (await axios.get(`${BASE}/${id}/assets`, H())).data
export const getSettlement = async (id) => (await axios.get(`${BASE}/${id}/settlement`, H())).data
export const fetchAudit = async (params = {}) => (await axios.get(`${BASE}/audit-logs`, { params, ...H() })).data
export const fetchPolicies = async (params = {}) => (await axios.get(`${BASE}/policies`, { params, ...H() })).data

// ─── case workflow actions ────────────────────────────────────────────────────
export const createCase = async (body) => (await axios.post(`${BASE}/cases`, body, H())).data
export const updateCase = async (id, body) => (await axios.patch(`${BASE}/${id}`, body, H())).data
export const deleteCase = async (id, body = {}) => (await axios.delete(`${BASE}/${id}`, { data: body, ...H() })).data
export const submitCase = async (id, body = {}) => (await axios.post(`${BASE}/${id}/submit`, body, H())).data
export const managerDecision = async (id, decision, notes) => (await axios.post(`${BASE}/${id}/manager-decision`, { decision, notes }, H())).data
export const acceptCase = async (id, body = {}) => (await axios.post(`${BASE}/${id}/accept`, body, H())).data
export const rejectCase = async (id, reason) => (await axios.post(`${BASE}/${id}/reject`, { reason }, H())).data
export const cancelCase = async (id, reason) => (await axios.post(`${BASE}/${id}/cancel`, { reason }, H())).data
export const startNotice = async (id, body) => (await axios.post(`${BASE}/${id}/start-notice`, body, H())).data
export const waiveNotice = async (id, body) => (await axios.post(`${BASE}/${id}/waive-notice`, body, H())).data
export const adjustNotice = async (id, body) => (await axios.post(`${BASE}/${id}/adjust-notice`, body, H())).data
export const finalizeExit = async (id, body) => (await axios.post(`${BASE}/${id}/finalize-exit`, body, H())).data
export const archiveCase = async (id, body = {}) => (await axios.post(`${BASE}/${id}/archive`, body || {}, H())).data

// ─── former-employee document portal (PUBLIC — no auth) ──────────────────────
// A leaver whose ERP login was revoked during clearance downloads their letters
// via an unguessable per-case token. No auth header — these endpoints are public.
export const fetchExitPortal = async (token) => (await axios.get(`${BASE}/portal/${token}`)).data
export const portalDownloadUrl = (token, slug) => `${BASE}/portal/${token}/download/${slug}`
export const portalLink = (token) => `${window.location.origin}/exit/documents/${token}`
export const verifyExitLetter = async (code) => (await axios.get(`${BASE}/verify/${code}`)).data
// HR: re-mint the token (invalidates a leaked link)
export const rotatePortalToken = async (caseId) => (await axios.post(`${BASE}/${caseId}/letters/portal/rotate`, {}, H())).data

// ─── clearance ─────────────────────────────────────────────────────────────────
export const updateClearanceItem = async (itemId, body) => (await axios.patch(`${BASE}/clearance-items/${itemId}`, body, H())).data
export const reopenClearanceItem = async (itemId, reason) => (await axios.post(`${BASE}/clearance-items/${itemId}/reopen`, { reason }, H())).data
export const revokeErpLogin = async (itemId) => (await axios.post(`${BASE}/clearance-items/${itemId}/revoke-erp`, {}, H())).data
export const revokeProvisioning = async (itemId) => (await axios.post(`${BASE}/clearance-items/${itemId}/revoke-provisioning`, {}, H())).data
// HR-gate apply actions — the marked tasks write to the real records, then sign
// off the gate. Return { item, effects:[{key,label,done,detail,target,severity}] }.
export const applyHrRecords = async (itemId, body) => (await axios.post(`${BASE}/clearance-items/${itemId}/apply-hr-records`, body, H())).data
export const applyFfAck = async (itemId, body) => (await axios.post(`${BASE}/clearance-items/${itemId}/apply-ff-ack`, body, H())).data
export const applyFinLoans = async (itemId, body) => (await axios.post(`${BASE}/clearance-items/${itemId}/apply-fin-loans`, body, H())).data
export const completeClearance = async (id) => (await axios.post(`${BASE}/${id}/clearance/complete`, {}, H())).data

// ─── interview ──────────────────────────────────────────────────────────────────
export const scheduleInterview = async (id, body) => (await axios.post(`${BASE}/${id}/interview/schedule`, body, H())).data
export const completeInterview = async (id, body) => (await axios.post(`${BASE}/${id}/interview/submit`, body, H())).data

// ─── asset return ─────────────────────────────────────────────────────────────
export const flagAssetReturns = async (id) => (await axios.post(`${BASE}/${id}/assets/flag-returns`, {}, H())).data

// ─── settlement ─────────────────────────────────────────────────────────────────
export const recalcSettlement = async (id, overrides, reason) => (await axios.post(`${BASE}/${id}/settlement/recalculate`, { overrides, reason }, H())).data
export const patchSettlement = async (id, body) => (await axios.patch(`${BASE}/${id}/settlement`, body, H())).data
export const fetchSettlementPreflight = async (id) => (await axios.get(`${BASE}/${id}/settlement/preflight`, H())).data
export const verifySettlement = async (id, notes) => (await axios.post(`${BASE}/${id}/settlement/verify`, { notes }, H())).data
export const approveSettlement = async (id, notes) => (await axios.post(`${BASE}/${id}/settlement/approve`, { notes }, H())).data
export const paySettlement = async (id, body) => (await axios.post(`${BASE}/${id}/settlement/pay`, body, H())).data
export const reverseSettlement = async (id, reason) => (await axios.post(`${BASE}/${id}/settlement/reverse`, { reason }, H())).data
export const closeSettlement = async (id, notes, category) => (await axios.post(`${BASE}/${id}/settlement/close`, { notes, category }, H())).data
// Finance-facing F&F payment advice (bank account + breakdown). PDF opens in a
// new tab for preview/print; CSV downloads (matches the payroll bank-file columns).
export const openPaymentAdvice = async (caseId, settlementNo, fmt = 'pdf') => {
  const { data } = await axios.get(`${BASE}/${caseId}/settlement/payment-advice`, { params: { fmt }, responseType: 'blob', ...H() })
  const url = URL.createObjectURL(data)
  if (fmt === 'csv') {
    const a = document.createElement('a'); a.href = url; a.download = `ff-advice-${settlementNo || caseId}.csv`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  } else {
    window.open(url, '_blank'); setTimeout(() => URL.revokeObjectURL(url), 8000)
  }
}

// ─── letters ──────────────────────────────────────────────────────────────────
export const generateLetter = async (id, slug, body = {}) => (await axios.post(`${BASE}/${id}/letters/${slug}/generate`, body, H())).data
export const issueLetter = async (id, slug) => (await axios.post(`${BASE}/${id}/letters/${slug}/issue`, {}, H())).data
export const revokeLetter = async (id, slug, reason) => (await axios.post(`${BASE}/${id}/letters/${slug}/revoke`, { reason }, H())).data
export const letterDownloadUrl = (id, slug) => `${BASE}/${id}/letters/${slug}/download`

// ─── policies ─────────────────────────────────────────────────────────────────
export const createPolicy = async (body) => (await axios.post(`${BASE}/policies`, body, H())).data
export const updatePolicy = async (id, body) => (await axios.patch(`${BASE}/policies/${id}`, body, H())).data
export const deletePolicy = async (id, reason) => (await axios.delete(`${BASE}/policies/${id}`, { params: reason ? { reason } : {}, ...H() })).data

// ─── reports ──────────────────────────────────────────────────────────────────
export const fetchReportIndex = async () => (await axios.get(`${BASE}/reports/`, H())).data
export const fetchReportOverview = async (params = {}) => (await axios.get(`${BASE}/reports/overview`, { params, ...H() })).data
export const fetchReportData = async (key, params = {}) => (await axios.get(`${BASE}/reports/${key}`, { params, ...H() })).data
export const downloadReport = async (key, format, params = {}) => {
  const { data } = await axios.get(`${BASE}/reports/${key}/export`, {
    params: { format, ...params }, responseType: 'blob', ...H(),
  })
  const ext = format === 'excel' ? 'xlsx' : format
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url; a.download = `${key}.${ext}`; a.click()
  URL.revokeObjectURL(url)
}

// ─── lifecycle bridge (employee lifecycle is the source of truth) ────────────
// The exit workflow endpoints drive these server-side; these are here for any
// direct surfacing (e.g. employee profile cross-actions).
export const giveNotice = async (empPk, body) => (await axios.post(`${EMP}/${empPk}/lifecycle/give-notice`, body, H())).data
export const markExited = async (empPk, body) => (await axios.post(`${EMP}/${empPk}/lifecycle/exit`, body, H())).data
export const archiveEmployee = async (empPk, body = {}) => (await axios.post(`${EMP}/${empPk}/lifecycle/archive`, body, H())).data

// ─── masters ──────────────────────────────────────────────────────────────────
export const fetchEmployeesLite = async (q = '') => {
  try { return (await axios.get(`${EMP}`, { params: { q, limit: 100 }, ...H() })).data }
  catch { return { items: [] } }
}
export const fetchDepartments = async () => {
  try { return (await axios.get(`${API}/hr/departments`, { params: { limit: 100 }, ...H() })).data }
  catch { return { items: [] } }
}
export const fetchGrades = async () => {
  try { return (await axios.get(`${API}/hr/grades`, { params: { limit: 100 }, ...H() })).data }
  catch { return { items: [] } }
}

// ─── self-service ───────────────────────────────────────────────────────────────
export const fetchMyExit = async () => (await axios.get(`${ME}`, H())).data
export const submitMyResignation = async (body) => (await axios.post(`${ME}/resign`, body, H())).data
export const editMyResignation = async (id, body) => (await axios.patch(`${ME}/${id}`, body, H())).data
export const withdrawMyResignation = async (id, reason) => (await axios.post(`${ME}/${id}/withdraw`, { reason }, H())).data
export const submitMyInterview = async (id, body) => (await axios.post(`${ME}/${id}/interview/submit`, body, H())).data
export const myLetterDownloadUrl = (id, slug) => `${ME}/${id}/letters/${slug}/download`
export const fetchMyTeamCases = async () => (await axios.get(`${ME}/team/cases`, H())).data
export const myTeamDecision = async (id, decision, notes) => (await axios.post(`${ME}/${id}/manager-decision`, { decision, notes }, H())).data

// ─── handover (employee submits → reporting manager signs off) ───────────────
// Employee files the work/knowledge/client handover for a MANAGER / PROJECT lane.
export const submitHandover = async (caseId, itemId, body) =>
  (await axios.post(`${ME}/${caseId}/clearance/${itemId}/handover`, body, H())).data
// Reporting manager: read the handover lanes for one team case.
export const fetchTeamCaseClearance = async (caseId) =>
  (await axios.get(`${ME}/team/${caseId}/clearance`, H())).data
// Reporting manager: sign off (CLEARED) or send back (BLOCKED) a handover lane.
export const managerSignoffClearance = async (caseId, itemId, decision, note) =>
  (await axios.post(`${ME}/team/${caseId}/clearance/${itemId}/signoff`, { decision, note }, H())).data
