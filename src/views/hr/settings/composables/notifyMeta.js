// Notification Rules — shared channel / audience / module metadata + helpers.
// Single source of truth for the Dispatch deck, the matrix, and both modals so
// icons, colours and the "live vs pending transport" status never drift.
import {
  Bell, Mail, MessageSquare, Smartphone, MessageCircle,
  Users, UserPlus, CalendarDays, CalendarClock, Plane, Receipt, Wallet,
  Boxes, GraduationCap, DoorOpen, UserCog, Briefcase, ShieldCheck, Banknote,
} from 'lucide-vue-next'

// Delivery channels — order matters (matrix columns / transceiver stack).
export const CHANNELS = [
  { key: 'IN_APP', label: 'In-app', short: 'In-app', icon: Bell, color: '#fbbf24', live: true },
  { key: 'EMAIL', label: 'Email', short: 'Email', icon: Mail, color: '#fb923c', live: false },
  { key: 'SMS', label: 'SMS', short: 'SMS', icon: MessageSquare, color: '#f59e0b', live: false },
  { key: 'PUSH', label: 'Push', short: 'Push', icon: Smartphone, color: '#34d399', live: false },
  { key: 'WHATSAPP', label: 'WhatsApp', short: 'WA', icon: MessageCircle, color: '#10b981', live: false },
]
export const CHANNEL_BY_KEY = Object.fromEntries(CHANNELS.map(c => [c.key, c]))

// Audiences — who receives the alert. (icon only — no dot, so the compact
// matrix trigger has room for the label and never truncates to "Em…")
export const AUDIENCES = [
  { value: 'EMPLOYEE', label: 'Employee', icon: Users },
  { value: 'MANAGER', label: 'Manager', icon: UserCog },
  { value: 'HR', label: 'HR', icon: Briefcase },
  { value: 'FINANCE', label: 'Finance', icon: Banknote },
  { value: 'ADMIN', label: 'Admin', icon: ShieldCheck },
]
export const AUDIENCE_BY_VALUE = Object.fromEntries(AUDIENCES.map(a => [a.value, a]))

// Event-source modules (the modules that raise the catalog events).
export const MODULE_META = {
  employees: { label: 'Employees', icon: Users, to: '/admin/hr/employees/all' },
  recruitment: { label: 'Recruitment', icon: UserPlus, to: '/admin/hr/recruitment/dashboard' },
  leave: { label: 'Leave', icon: CalendarDays, to: '/admin/hr/leave/dashboard' },
  attendance: { label: 'Attendance', icon: CalendarClock, to: '/admin/hr/attendance/dashboard' },
  travel: { label: 'Travel', icon: Plane, to: '/admin/hr/travel/dashboard' },
  reimbursements: { label: 'Reimbursements', icon: Receipt, to: '/admin/hr/reimbursements/dashboard' },
  payroll: { label: 'Payroll', icon: Wallet, to: '/admin/hr/payroll/dashboard' },
  assets: { label: 'Assets', icon: Boxes, to: '/admin/hr/assets/dashboard' },
  training: { label: 'Training', icon: GraduationCap, to: '/admin/hr/training/dashboard' },
  exit: { label: 'Exit', icon: DoorOpen, to: '/admin/hr/exit/dashboard' },
}
export const moduleLabel = (m) => MODULE_META[m]?.label || m
export const moduleIcon = (m) => MODULE_META[m]?.icon || Bell
export const moduleTo = (m) => MODULE_META[m]?.to || null
export const MODULE_ORDER = Object.keys(MODULE_META)

/** Default fallback title for an event when no template is set (mirrors notify.py). */
export function eventDefaultTitle(event) {
  return String(event || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
