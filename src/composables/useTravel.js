// Data layer for the HR Travel Management module ("Aviation Command Deck").
// Reactive list state + lifecycle actions over /api/hr/travel, plus self-service
// (/api/hr/me/travel) and masters lookups. Mirrors useReimbursements.js.
import { ref, computed } from 'vue'
import axios from 'axios'
import {
  Plane, PlaneTakeoff, Map, Handshake, GraduationCap, Presentation, ClipboardCheck,
  FileSearch, Users, MapPin, Landmark, Gavel, Siren, Briefcase,
  Clock, Hourglass, CheckCircle2, XCircle, Undo2, Ban, BadgeCheck, Wallet, RotateCcw,
  Send, Hotel, TrainFront, Car, Bus, CarFront, Building2, Banknote, UserCheck,
  Compass, Route, Navigation, Ticket, Tag, ArrowRight, ArrowLeftRight,
} from 'lucide-vue-next'
import { API, authHeader } from '@/utils/api'

const BASE = `${API}/hr/travel`
const ME = `${API}/hr/me/travel`
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

// ─── money (Indian numbering) ───────────────────────────────────────────────
export const fmtINR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })
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
export const airportCode = (loc) => (loc || '').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || '•••'

// ─── trip shape (one-way / round-trip / multi-city) ──────────────────────────
export const TRIP_TYPES = [
  { key: 'ONE_WAY', label: 'One-way', icon: ArrowRight },
  { key: 'ROUND_TRIP', label: 'Round trip', icon: ArrowLeftRight },
  { key: 'MULTI_CITY', label: 'Multi-city', icon: Route },
]
export const tripTypeMeta = (k) => TRIP_TYPES.find(t => t.key === String(k || '').toUpperCase()) || TRIP_TYPES[1]
export const isMultiCity = (req) => String(req?.trip_type || '').toUpperCase() === 'MULTI_CITY'

// Per-leg transport modes (a multi-city trip can mix these leg by leg).
export const LEG_MODES = [
  { key: 'FLIGHT', label: 'Flight', short: 'Flight', icon: Plane },
  { key: 'TRAIN', label: 'Train', short: 'Train', icon: TrainFront },
  { key: 'BUS', label: 'Bus', short: 'Bus', icon: Bus },
  { key: 'TAXI', label: 'Taxi', short: 'Taxi', icon: Car },
  { key: 'RENTAL', label: 'Rental', short: 'Rental', icon: CarFront },
]
export const legModeMeta = (k) => LEG_MODES.find(m => m.key === String(k || '').toUpperCase()) || LEG_MODES[0]

// Normalized leg list for DISPLAY — uses the stored itinerary for multi-city,
// otherwise synthesizes legs from the single-route envelope (round-trip = 2 hops).
export function tripLegs(req) {
  if (!req) return []
  const it = req.itinerary
  if (Array.isArray(it) && it.length) {
    return it.map(l => ({
      from_location: l.from_location, to_location: l.to_location,
      departure_date: l.departure_date, mode: String(l.mode || 'FLIGHT').toUpperCase(),
      to_city_category: l.to_city_category || null,
    }))
  }
  const tt = String(req.trip_type || 'ROUND_TRIP').toUpperCase()
  const mode = req.flight_required ? 'FLIGHT' : req.train_required ? 'TRAIN' : 'FLIGHT'
  const legs = [{ from_location: req.from_location, to_location: req.to_location, departure_date: req.departure_date, mode, to_city_category: req.to_city_category }]
  if (tt === 'ROUND_TRIP' && req.return_date && req.return_date !== req.departure_date) {
    legs.push({ from_location: req.to_location, to_location: req.from_location, departure_date: req.return_date, mode, to_city_category: req.to_city_category })
  }
  return legs
}
export const legCount = (req) => isMultiCity(req) ? (Array.isArray(req?.itinerary) ? req.itinerary.length : 0) : 0

// Compact route string: "DEL → BLR → CCU → DEL" (multi-city) or "DEL → BLR".
export function routeSummary(req) {
  if (!req) return ''
  if (isMultiCity(req)) {
    const legs = tripLegs(req)
    const stops = [legs[0]?.from_location, ...legs.map(l => l.to_location)].filter(Boolean)
    return stops.map(airportCode).join(' → ')
  }
  return `${airportCode(req.from_location)} → ${airportCode(req.to_location)}`
}

// ─── request status metadata ────────────────────────────────────────────────
export const TRAVEL_STATUS = [
  { key: 'DRAFT', label: 'Draft', icon: Clock, tone: 'draft', hex: '#9ca3af' },
  { key: 'PENDING_APPROVAL', label: 'In review', icon: Hourglass, tone: 'pending', hex: '#fbbf24' },
  { key: 'APPROVED', label: 'Approved', icon: CheckCircle2, tone: 'approved', hex: '#34d399' },
  { key: 'RETURNED', label: 'Returned', icon: Undo2, tone: 'returned', hex: '#f59e0b' },
  { key: 'REJECTED', label: 'Rejected', icon: XCircle, tone: 'rejected', hex: '#ef4444' },
  { key: 'IN_PROGRESS', label: 'In progress', icon: PlaneTakeoff, tone: 'progress', hex: '#fb923c' },
  { key: 'COMPLETED', label: 'Completed', icon: BadgeCheck, tone: 'completed', hex: '#60d394' },
  { key: 'CANCELLED', label: 'Cancelled', icon: Ban, tone: 'cancelled', hex: '#6b7280' },
]
export const TRAVEL_STATUS_BY_KEY = Object.fromEntries(TRAVEL_STATUS.map(s => [s.key, s]))
export const statusMeta = (k) => TRAVEL_STATUS_BY_KEY[k] || { key: k, label: k, icon: Clock, tone: 'draft', hex: '#9ca3af' }

// ─── travel types ───────────────────────────────────────────────────────────
export const TRAVEL_TYPES = [
  { key: 'Official Tour', icon: Plane }, { key: 'Project Visit', icon: Map },
  { key: 'Client Visit', icon: Handshake }, { key: 'Training', icon: GraduationCap },
  { key: 'Conference', icon: Presentation }, { key: 'Inspection', icon: ClipboardCheck },
  { key: 'Audit Visit', icon: FileSearch }, { key: 'Meeting', icon: Users },
  { key: 'Site Visit', icon: MapPin }, { key: 'Government Meeting', icon: Landmark },
  { key: 'Tender Meeting', icon: Gavel }, { key: 'Emergency Travel', icon: Siren },
]

// ─── travel-category icon registry ──────────────────────────────────────────
// A curated set of lucide icons HR can pin to a travel category. Stored as the
// icon NAME (string) on the category; the card / concourse / modal resolve it
// back to a component via categoryIcon(). Falls back to a generic tag.
export const CATEGORY_ICONS = [
  { name: 'Tag', icon: Tag }, { name: 'Plane', icon: Plane }, { name: 'Map', icon: Map },
  { name: 'Handshake', icon: Handshake }, { name: 'GraduationCap', icon: GraduationCap },
  { name: 'Presentation', icon: Presentation }, { name: 'ClipboardCheck', icon: ClipboardCheck },
  { name: 'FileSearch', icon: FileSearch }, { name: 'Users', icon: Users }, { name: 'MapPin', icon: MapPin },
  { name: 'Landmark', icon: Landmark }, { name: 'Gavel', icon: Gavel }, { name: 'Siren', icon: Siren },
  { name: 'Briefcase', icon: Briefcase }, { name: 'Building2', icon: Building2 }, { name: 'Hotel', icon: Hotel },
  { name: 'Ticket', icon: Ticket }, { name: 'Compass', icon: Compass }, { name: 'Route', icon: Route },
  { name: 'Navigation', icon: Navigation },
]
const CATEGORY_ICON_BY_NAME = Object.fromEntries(CATEGORY_ICONS.map(i => [i.name, i.icon]))
export const categoryIcon = (name) => CATEGORY_ICON_BY_NAME[name] || Tag

// ─── booking types ──────────────────────────────────────────────────────────
export const BOOKING_TYPES = [
  { key: 'FLIGHT', label: 'Flight', icon: Plane, hex: '#fbbf24' },
  { key: 'TRAIN', label: 'Train', icon: TrainFront, hex: '#fb923c' },
  { key: 'HOTEL', label: 'Hotel', icon: Hotel, hex: '#34d399' },
  { key: 'TAXI', label: 'Taxi', icon: Car, hex: '#f59e0b' },
  { key: 'BUS', label: 'Bus', icon: Bus, hex: '#60a5fa' },
  { key: 'RENTAL', label: 'Rental', icon: CarFront, hex: '#c084fc' },
]
export const bookingMeta = (k) => BOOKING_TYPES.find(b => b.key === k) || { key: k, label: k, icon: Briefcase, hex: '#9ca3af' }

export const BOOKING_STATUS = [
  { key: 'PENDING', label: 'Pending', hex: '#9ca3af' },
  { key: 'BOOKED', label: 'Booked', hex: '#fbbf24' },
  { key: 'CONFIRMED', label: 'Confirmed', hex: '#34d399' },
  { key: 'CANCELLED', label: 'Cancelled', hex: '#ef4444' },
  { key: 'COMPLETED', label: 'Completed', hex: '#60d394' },
]

// ─── city categories (DA tiers) ─────────────────────────────────────────────
export const CITY_CATEGORIES = [
  { key: 'METRO', label: 'Metro', hex: '#fb923c' },
  { key: 'TIER_2', label: 'Tier 2', hex: '#fbbf24' },
  { key: 'TIER_3', label: 'Tier 3', hex: '#a3a3a3' },
  { key: 'INTERNATIONAL', label: 'International', hex: '#34d399' },
]
export const cityMeta = (k) => CITY_CATEGORIES.find(c => c.key === k) || { key: k, label: k, hex: '#9ca3af' }

// ─── priority ───────────────────────────────────────────────────────────────
export const PRIORITIES = [
  { key: 'LOW', label: 'Low', hex: 'var(--trv-pri-low)' },
  { key: 'NORMAL', label: 'Normal', hex: 'var(--trv-pri-normal)' },
  { key: 'HIGH', label: 'High', hex: 'var(--trv-pri-high)' },
  { key: 'URGENT', label: 'Urgent', hex: 'var(--trv-pri-urgent)' },
]
export const priorityMeta = (k) => PRIORITIES.find(p => p.key === k) || PRIORITIES[1]

// ─── advance / settlement / DA status ───────────────────────────────────────
export const ADVANCE_STATUS = [
  { key: 'REQUESTED', label: 'Requested', icon: Send, hex: '#fbbf24' },
  { key: 'APPROVED', label: 'Approved', icon: CheckCircle2, hex: '#34d399' },
  { key: 'RELEASED', label: 'Released', icon: Wallet, hex: '#fb923c' },
  { key: 'SETTLED', label: 'Settled', icon: BadgeCheck, hex: '#60d394' },
  { key: 'RECOVERED', label: 'Recovered', icon: RotateCcw, hex: '#c084fc' },
  { key: 'REJECTED', label: 'Rejected', icon: XCircle, hex: '#ef4444' },
  { key: 'CANCELLED', label: 'Cancelled', icon: Ban, hex: '#6b7280' },
]
export const advanceMeta = (k) => ADVANCE_STATUS.find(s => s.key === k) || { key: k, label: k, icon: Clock, hex: '#9ca3af' }

// Lifecycle gates for the advance "vault" stepper (Requested → Approved →
// Released → Closed). Shared by the card + drawer so they stay in lock-step.
export const ADVANCE_GATES = [
  { key: 'REQUESTED', label: 'Requested', icon: Send },
  { key: 'APPROVED', label: 'Approved', icon: CheckCircle2 },
  { key: 'RELEASED', label: 'Released', icon: Wallet },
  { key: 'SETTLED', label: 'Closed', icon: BadgeCheck },
]
// Returns the lifecycle posture for a given advance:
//   reached   = index of the furthest gate the advance has cleared (0..3)
//   terminal  = 'REJECTED' | 'CANCELLED' | null (interrupted before closure)
//   recovered = true when the advance closed by recovery (employee owed money)
export function advanceGateState(a) {
  const s = a?.status
  const order = ['REQUESTED', 'APPROVED', 'RELEASED', 'SETTLED']
  let reached = order.indexOf(s)
  if (s === 'RECOVERED') reached = 3
  const terminal = s === 'REJECTED' ? 'REJECTED' : s === 'CANCELLED' ? 'CANCELLED' : null
  if (terminal) reached = a?.approved_at ? 1 : 0   // froze at last good gate
  if (reached < 0) reached = 0
  return { reached, terminal, recovered: s === 'RECOVERED', live: s === 'RELEASED' }
}

// The amount that matters for treasury exposure (approver-trimmed where set).
export const advanceEffective = (a) => Number(a?.approved_amount ?? a?.advance_amount ?? 0)

export const SETTLEMENT_STATUS = [
  { key: 'DRAFT', label: 'Draft', hex: '#9ca3af' },
  { key: 'SUBMITTED', label: 'Submitted', hex: '#fbbf24' },
  { key: 'VERIFIED', label: 'Verified', hex: '#fb923c' },
  { key: 'SETTLED', label: 'Settled', hex: '#34d399' },
  { key: 'PAID', label: 'Paid', hex: '#60d394' },
  { key: 'REVERSED', label: 'Reversed', hex: '#c084fc' },
]
export const settlementMeta = (k) => SETTLEMENT_STATUS.find(s => s.key === k) || { key: k, label: k, hex: '#9ca3af' }

// Settlement disbursement rails (backend TravelSettlementMethod).
export const SETTLEMENT_METHODS = [
  { key: 'PAYROLL', label: 'Payroll', icon: Wallet, hex: '#fbbf24', hint: 'Net into the next salary run' },
  { key: 'BANK_TRANSFER', label: 'Bank transfer', icon: Landmark, hex: '#34d399', hint: 'Direct NEFT/IMPS to the traveller' },
  { key: 'CASH', label: 'Cash', icon: Banknote, hex: '#fb923c', hint: 'Settled in hand at the desk' },
]
export const settlementMethodMeta = (k) => SETTLEMENT_METHODS.find(m => m.key === k) || { key: k, label: k || '—', icon: Wallet, hex: '#9ca3af', hint: '' }

// ─── double-pay guard ────────────────────────────────────────────────────────
// Stops a traveller being reimbursed for something the company already booked.
// Matches an employee expense line against the tour's company-paid bookings:
//   strong = amount matches a booking total (±1) → almost certainly a duplicate
//   soft   = expense category overlaps a booked travel type → worth a look
const EXPENSE_CAT_BOOKINGS = {
  TRAVEL: ['FLIGHT', 'TRAIN', 'BUS'], FLIGHT: ['FLIGHT'], TRAIN: ['TRAIN'],
  ACCOMMODATION: ['HOTEL'], HOTEL: ['HOTEL'], TAXI: ['TAXI', 'RENTAL'], FUEL: ['RENTAL'],
}
export function bookingDupeFlag(line, bookings = []) {
  if (!bookings.length) return { flagged: false, strong: false }
  const amt = Number(line?.amount || 0)
  const strong = amt > 0 && bookings.some(b => Math.abs(Number(b.total_cost || 0) - amt) <= 1)
  const types = EXPENSE_CAT_BOOKINGS[String(line?.category || '').toUpperCase()] || []
  const soft = types.length > 0 && bookings.some(b => types.includes(b.booking_type))
  return { flagged: strong || soft, strong }
}
export const countBookingDupes = (lines = [], bookings = []) =>
  (lines || []).filter(ln => bookingDupeFlag(ln, bookings).flagged).length

// ─── per-diem (M&IE) coverage + receipt discipline ──────────────────────────
// Mirrors app/utils/hr/travel/settlement.py::DA_COVERED_CATEGORIES. When a DA is
// paid, claims in these categories are covered by the per-diem and NOT separately
// reimbursable (the backend excludes them from approved_expense by default).
export const DA_COVERED_CATEGORIES = ['FOOD', 'TAXI', 'COMMUNICATION', 'MISC']
export const isDaCovered = (cat) => DA_COVERED_CATEGORIES.includes(String(cat || '').toUpperCase())
export const daCoveredFlag = (line, daAmount = 0) => Number(daAmount) > 0 && isDaCovered(line?.category)
export const sumDaCovered = (lines = [], daAmount = 0) =>
  Number(daAmount) > 0
    ? (lines || []).filter(l => isDaCovered(l?.category)).reduce((a, l) => a + (Number(l?.amount) || 0), 0)
    : 0

// Receipt discipline — a higher-value line with no attachment is unsupported and
// should be scrutinised (or disallowed) before settling.
export const RECEIPT_THRESHOLD = 2000
export const expenseLineUnsupported = (line) =>
  (Number(line?.amount) || 0) >= RECEIPT_THRESHOLD && !((line?.attachments || []).length > 0)
export const countUnsupported = (lines = []) => (lines || []).filter(expenseLineUnsupported).length

// Client-side mirror of app/utils/hr/travel/settlement.py::reconcile — lets the
// verify/settle modals preview the net the instant the verifier nudges the
// approved-expense total, without a round-trip.
//   reimbursable = approved_expense + da_amount
//   payable      = max(0, reimbursable − advance_received)   (company owes employee)
//   recoverable  = max(0, advance_received − reimbursable)   (employee owes company)
export function reconcilePreview({ advance = 0, da = 0, approvedExpense = 0 } = {}) {
  const adv = Number(advance) || 0
  const reimbursable = (Number(approvedExpense) || 0) + (Number(da) || 0)
  const net = reimbursable - adv
  return {
    advance: adv,
    da: Number(da) || 0,
    approvedExpense: Number(approvedExpense) || 0,
    reimbursable,
    payable: net > 0 ? net : 0,
    recoverable: net < 0 ? -net : 0,
    net,                                   // +ve = payable, −ve = recoverable
    direction: net > 0 ? 'payable' : net < 0 ? 'recoverable' : 'balanced',
  }
}

export const DA_STATUS = [
  { key: 'COMPUTED', label: 'Computed', hex: '#fbbf24' },
  { key: 'APPROVED', label: 'Approved', hex: '#34d399' },
  { key: 'PAID', label: 'Paid', hex: '#60d394' },
  { key: 'REVERSED', label: 'Reversed', hex: '#c084fc' },
]

export const EXPENSE_CATEGORIES = [
  'TRAVEL', 'ACCOMMODATION', 'FOOD', 'TAXI', 'FUEL', 'PARKING', 'TOLL', 'COMMUNICATION', 'MISC',
]

// Approval-chain visual stages (control-tower runway gates).
export const APPROVER_TYPE_LABEL = {
  MANAGER: 'Reporting Manager', DEPT_HEAD: 'Department Head',
  FINANCE: 'Finance', HR: 'HR', USER: 'Approver',
}

// ─── policy governance metadata ─────────────────────────────────────────────
// Cabin entitlement ladder (rung = altitude on the "Governance Altitude" deck).
export const FLIGHT_CLASSES = [
  { key: 'NONE', label: 'No air', short: 'None', rung: 0, hex: '#9ca3af' },
  { key: 'ECONOMY', label: 'Economy', short: 'Eco', rung: 1, hex: '#fbbf24' },
  { key: 'PREMIUM_ECONOMY', label: 'Premium Economy', short: 'Premium', rung: 2, hex: '#f59e0b' },
  { key: 'BUSINESS', label: 'Business', short: 'Business', rung: 3, hex: '#fb923c' },
  { key: 'FIRST', label: 'First', short: 'First', rung: 4, hex: '#ea580c' },
]
export const flightClassMeta = (k) => {
  const norm = String(k || '').toUpperCase().replace(/\s+/g, '_').replace('PREMIUM', 'PREMIUM_ECONOMY').replace('PREMIUM_ECONOMY_ECONOMY', 'PREMIUM_ECONOMY')
  return FLIGHT_CLASSES.find(f => f.key === norm) || FLIGHT_CLASSES[0]
}
export const TRAIN_CLASSES = [
  { key: 'NONE', label: 'No rail', short: 'None' },
  { key: 'SLEEPER', label: 'Sleeper', short: 'SL' },
  { key: 'AC3', label: 'AC 3-tier', short: 'AC3' },
  { key: 'AC2', label: 'AC 2-tier', short: 'AC2' },
  { key: 'AC1', label: 'AC First', short: 'AC1' },
]
export const HOTEL_CATEGORIES = ['Guest House', 'Budget', '3 Star', '4 Star', '5 Star']
export const TRAVEL_SCOPES = ['ALL', 'DOMESTIC', 'INTERNATIONAL', 'PROJECT', 'TRAINING', 'EMERGENCY']

// Approver-type palette for the chain builder + runway. `needsUser` flags the
// stages the backend validator demands a named approver_user_id for.
export const APPROVER_TYPES = [
  { key: 'MANAGER', label: 'Reporting Manager', icon: Briefcase, hex: '#fbbf24', needsUser: false, hint: 'Resolved to the traveller’s manager at submit' },
  { key: 'DEPT_HEAD', label: 'Department Head', icon: Building2, hex: '#fb923c', needsUser: true, hint: 'A named department head' },
  { key: 'FINANCE', label: 'Finance', icon: Landmark, hex: '#34d399', needsUser: false, hint: 'Cleared by a finance superadmin' },
  { key: 'HR', label: 'HR', icon: Users, hex: '#60a5fa', needsUser: false, hint: 'Cleared by an HR superadmin' },
  { key: 'USER', label: 'Named approver', icon: UserCheck, hex: '#c084fc', needsUser: true, hint: 'A specific person you pick' },
]
export const approverTypeMeta = (k) => APPROVER_TYPES.find(a => a.key === k) || APPROVER_TYPES[0]
export const DEFAULT_TRAVEL_CHAIN = [
  { approver_type: 'MANAGER', label: 'Reporting Manager' },
  { approver_type: 'FINANCE', label: 'Finance' },
]

// Derive per-stage runway state from a request's approval_steps snapshot.
export function runwayStateFor(req) {
  const steps = req?.approval_steps || []
  const cur = Number(req?.current_step || 0)
  return steps.map((s, i) => {
    let state = 'pending'
    if (s.decision === 'APPROVED') state = 'done'
    else if (s.decision === 'REJECTED') state = 'rejected'
    else if (s.decision === 'RETURNED') state = 'returned'
    else if (s.decision === 'SKIPPED') state = 'skipped'
    else if (i === cur && (req.status === 'PENDING_APPROVAL')) state = 'current'
    return {
      ...s, state, idx: i,
      typeLabel: s.label || APPROVER_TYPE_LABEL[s.approver_type] || s.approver_type,
    }
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// Admin — reactive list factory
// ═══════════════════════════════════════════════════════════════════════════
export function useTravelRequests(initial = {}) {
  const items = ref([])
  const total = ref(0)
  const loading = ref(false)
  const filters = ref({ page: 1, limit: 20, q: '', status: '', category_id: '', travel_type: '', department_id: '', ...initial })

  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / (filters.value.limit || 20))))

  const fetchList = async () => {
    loading.value = true
    try {
      const params = {}
      Object.entries(filters.value).forEach(([k, v]) => { if (v !== '' && v != null) params[k] = v })
      const { data } = await axios.get(`${BASE}/`, { params, ...H() })
      items.value = data.items || []
      total.value = data.total || 0
    } finally { loading.value = false }
  }
  const setFilters = (patch) => { filters.value = { ...filters.value, ...patch }; if (!('page' in patch)) filters.value.page = 1 }
  return { items, total, totalPages, loading, filters, fetchList, setFilters }
}

// ─── admin reads ────────────────────────────────────────────────────────────
export const fetchStats = async () => (await axios.get(`${BASE}/stats`, H())).data
export const fetchRequests = async (params = {}) => (await axios.get(`${BASE}/`, { params, ...H() })).data
export const fetchRequest = async (id) => (await axios.get(`${BASE}/${id}`, H())).data
export const fetchQueue = async (params = {}) => (await axios.get(`${BASE}/queue`, { params, ...H() })).data
export const fetchCalendar = async (params = {}) => (await axios.get(`${BASE}/calendar`, { params, ...H() })).data
export const fetchAudit = async (params = {}) => (await axios.get(`${BASE}/audit`, { params, ...H() })).data
export const fetchApproverCandidates = async (q = '') => (await axios.get(`${BASE}/approver-candidates`, { params: { q }, ...H() })).data

// ─── admin request actions ──────────────────────────────────────────────────
export const adminCreateRequest = async (body) => (await axios.post(`${BASE}/`, body, H())).data
export const updateRequest = async (id, body) => (await axios.patch(`${BASE}/${id}`, body, H())).data
export const deleteRequest = async (id, reason) => (await axios.delete(`${BASE}/${id}`, { data: { reason }, ...H() })).data
export const decideRequest = async (id, decision, notes) => (await axios.patch(`${BASE}/${id}/decide`, { decision, notes }, H())).data
export const returnRequest = async (id, reason) => (await axios.post(`${BASE}/${id}/request-changes`, { reason }, H())).data
export const escalateRequest = async (id, note) => (await axios.post(`${BASE}/${id}/escalate`, { note }, H())).data
export const cancelRequest = async (id, reason) => (await axios.post(`${BASE}/${id}/cancel`, { reason }, H())).data
export const executeRequest = async (id, sync_attendance = true) => (await axios.post(`${BASE}/${id}/execute`, { sync_attendance }, H())).data
export const completeRequest = async (id) => (await axios.post(`${BASE}/${id}/complete`, {}, H())).data
export const bulkDecide = async (ids, decision, notes) => (await axios.post(`${BASE}/bulk-decide`, { ids, decision, notes }, H())).data

// ─── bookings ───────────────────────────────────────────────────────────────
export const fetchBookings = async (params = {}) => (await axios.get(`${BASE}/bookings`, { params, ...H() })).data
export const createBooking = async (body) => (await axios.post(`${BASE}/bookings`, body, H())).data
export const updateBooking = async (id, body) => (await axios.patch(`${BASE}/bookings/${id}`, body, H())).data
export const deleteBooking = async (id) => (await axios.delete(`${BASE}/bookings/${id}`, H())).data

// ─── advances ───────────────────────────────────────────────────────────────
export const fetchAdvances = async (params = {}) => (await axios.get(`${BASE}/advances`, { params, ...H() })).data
export const fetchAdvanceDetail = async (id) => (await axios.get(`${BASE}/advances/${id}/detail`, H())).data
export const createAdvance = async (body) => (await axios.post(`${BASE}/advances`, body, H())).data
export const approveAdvance = async (id, body = {}) => (await axios.post(`${BASE}/advances/${id}/approve`, body, H())).data
export const rejectAdvance = async (id, reason) => (await axios.post(`${BASE}/advances/${id}/reject`, { reason }, H())).data
export const releaseAdvance = async (id, body = {}) => (await axios.post(`${BASE}/advances/${id}/release`, body, H())).data

// ─── DA ─────────────────────────────────────────────────────────────────────
export const fetchDa = async (params = {}) => (await axios.get(`${BASE}/da`, { params, ...H() })).data
export const computeDa = async (requestId, body = {}) => (await axios.post(`${BASE}/${requestId}/da/compute`, body, H())).data
export const approveDa = async (daId, body = {}) => (await axios.post(`${BASE}/da/${daId}/approve`, body, H())).data

// ─── settlements ────────────────────────────────────────────────────────────
export const fetchSettlements = async (params = {}) => (await axios.get(`${BASE}/settlements`, { params, ...H() })).data
export const getSettlement = async (id) => (await axios.get(`${BASE}/settlements/${id}`, H())).data
export const verifySettlement = async (id, body = {}) => (await axios.post(`${BASE}/settlements/${id}/verify`, body, H())).data
export const settleSettlement = async (id, body = {}) => (await axios.post(`${BASE}/settlements/${id}/settle`, body, H())).data
export const reverseSettlement = async (id, reason) => (await axios.post(`${BASE}/settlements/${id}/reverse`, { reason }, H())).data

// ─── categories ─────────────────────────────────────────────────────────────
export const fetchCategories = async (params = {}) => (await axios.get(`${BASE.replace('/travel', '/travel-categories')}/`, { params, ...H() })).data
export const createCategory = async (body) => (await axios.post(`${API}/hr/travel-categories/`, body, H())).data
export const updateCategory = async (id, body) => (await axios.patch(`${API}/hr/travel-categories/${id}`, body, H())).data
export const deleteCategory = async (id, params = {}) => (await axios.delete(`${API}/hr/travel-categories/${id}`, { params, ...H() })).data

// ─── policies ───────────────────────────────────────────────────────────────
export const fetchPolicies = async (params = {}) => (await axios.get(`${API}/hr/travel-policies/`, { params, ...H() })).data
export const createPolicy = async (body) => (await axios.post(`${API}/hr/travel-policies/`, body, H())).data
export const updatePolicy = async (id, body) => (await axios.patch(`${API}/hr/travel-policies/${id}`, body, H())).data
export const deletePolicy = async (id, params = {}) => (await axios.delete(`${API}/hr/travel-policies/${id}`, { params, ...H() })).data

// ─── DA rate matrix ─────────────────────────────────────────────────────────
export const fetchDaRates = async (params = {}) => (await axios.get(`${API}/hr/travel-da-rates/`, { params, ...H() })).data
export const createDaRate = async (body) => (await axios.post(`${API}/hr/travel-da-rates/`, body, H())).data
export const updateDaRate = async (id, body) => (await axios.patch(`${API}/hr/travel-da-rates/${id}`, body, H())).data
export const deleteDaRate = async (id) => (await axios.delete(`${API}/hr/travel-da-rates/${id}`, H())).data

// ─── reports ────────────────────────────────────────────────────────────────
export const fetchReportIndex = async () => (await axios.get(`${BASE}/reports/`, H())).data
export const fetchReportOverview = async (params = {}) => (await axios.get(`${BASE}/reports/overview`, { params, ...H() })).data
export const fetchReportData = async (key, params = {}) => (await axios.get(`${BASE}/reports/${key}`, { params, ...H() })).data
export const exportReportUrl = (key, format, params = {}) => {
  const qs = new URLSearchParams({ format, ...params }).toString()
  return `${BASE}/reports/${key}/export?${qs}`
}
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

// ─── masters ────────────────────────────────────────────────────────────────
export const fetchDepartments = async () => {
  try { return (await axios.get(`${API}/hr/departments`, { params: { limit: 100 }, ...H() })).data }
  catch { return { items: [] } }
}
export const fetchGrades = async () => {
  try { return (await axios.get(`${API}/hr/grades`, { params: { limit: 100 }, ...H() })).data }
  catch { return { items: [] } }
}
export const fetchEmployeesLite = async (q = '') => {
  // Respect the backend employees limit cap (<= 100).
  try { return (await axios.get(`${API}/hr/employees`, { params: { q, limit: 100 }, ...H() })).data }
  catch { return { items: [] } }
}
export const fetchProjectsLite = async () => {
  try { return (await axios.get(`${API}/projects/`, { params: { limit: 100 }, ...H() })).data }
  catch { return { items: [], projects: [] } }
}

// ═══════════════════════════════════════════════════════════════════════════
// Self-service (/hr/me/travel)
// ═══════════════════════════════════════════════════════════════════════════
export const fetchMyRequests = async (params = {}) => (await axios.get(`${ME}/`, { params, ...H() })).data
export const fetchMySummary = async () => (await axios.get(`${ME}/summary`, H())).data
export const fetchMyCategories = async () => (await axios.get(`${ME}/categories`, H())).data
export const fetchMyRequest = async (id) => (await axios.get(`${ME}/${id}`, H())).data
export const createMyRequest = async (body) => (await axios.post(`${ME}/`, body, H())).data
export const createMyDraft = async (body) => (await axios.post(`${ME}/draft`, body, H())).data
export const updateMyRequest = async (id, body) => (await axios.patch(`${ME}/${id}`, body, H())).data
export const submitMyRequest = async (id) => (await axios.post(`${ME}/${id}/submit`, {}, H())).data
export const withdrawMyRequest = async (id, reason) => (await axios.delete(`${ME}/${id}`, { data: { reason }, ...H() })).data
// Delete = remove from the traveller's list (any non-active state). For a live
// request the backend cancels it first (audit trail) then soft-deletes.
export const deleteMyRequest = async (id, reason) => (await axios.delete(`${ME}/${id}`, { data: { reason }, params: { remove: true }, ...H() })).data
export const requestMyAdvance = async (id, body) => (await axios.post(`${ME}/${id}/advance`, body, H())).data
export const submitMyExpenses = async (id, body) => (await axios.post(`${ME}/${id}/settlement`, body, H())).data
export const fetchMySettlement = async (id) => (await axios.get(`${ME}/${id}/settlement`, H())).data
export const fetchMyApprovalQueue = async (params = {}) => (await axios.get(`${ME}/approval-queue`, { params, ...H() })).data
export const managerDecide = async (id, decision, notes) => (await axios.patch(`${ME}/requests/${id}/decide`, { decision, notes }, H())).data

// ─── self-service bookings (itinerary) ──────────────────────────────────────
export const fetchMyBookings = async (id) => (await axios.get(`${ME}/${id}/bookings`, H())).data
export const createMyBooking = async (id, body) => (await axios.post(`${ME}/${id}/bookings`, body, H())).data
export const updateMyBooking = async (bookingId, body) => (await axios.patch(`${ME}/bookings/${bookingId}`, body, H())).data
export const deleteMyBooking = async (bookingId) => (await axios.delete(`${ME}/bookings/${bookingId}`, H())).data

// ─── receipt / document upload ───────────────────────────────────────────────
// Reuses the proven expense-attachment endpoint, but normalises the returned
// file_url to a host-relative /storage path so it survives a prod deploy (the
// endpoint hardcodes localhost:8000). The frontend prepends API_BASE on display.
export const uploadTravelReceipt = async (file, onProgress) => {
  const fd = new FormData()
  fd.append('file', file)
  const { data } = await axios.post(`${API}/uploads/expense-attachment`, fd, {
    headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => { if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100)) },
  })
  let url = data.file_url || (data.file_path ? `/${String(data.file_path).replace(/^\/+/, '')}` : '')
  url = url.replace(/^https?:\/\/[^/]+/i, '')                 // strip any baked-in host
  if (url && !url.startsWith('/')) url = `/${url}`
  return {
    file_url: url, file_path: data.file_path || null,
    original_filename: data.original_filename || file.name,
    file_size: data.file_size ?? file.size,
    mime_type: file.type || null, doc_type: 'RECEIPT',
  }
}
