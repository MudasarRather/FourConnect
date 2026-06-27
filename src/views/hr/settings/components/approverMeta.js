// Shared approver-type catalogue for the Approval Workflows surface — the gate
// card, the relay rail, the routing-intelligence panel and the revert modal all
// read from here so an icon / colour / label never drifts between them.
// Brand palette only (warm gold/amber/orange + emerald); no blue/purple.
import { UserCheck, Building2, Users, Wallet, User } from 'lucide-vue-next'

export const APPROVER_META = {
  MANAGER:   { icon: UserCheck, label: 'Reporting manager', color: 'var(--set-orange)', hint: "The employee's reporting manager" },
  DEPT_HEAD: { icon: Building2, label: 'Department head',   color: 'var(--set-amber)',  hint: 'Head of the employee’s department' },
  HR:        { icon: Users,     label: 'HR',                color: 'var(--set-gold)',   hint: 'Any HR / super admin can action' },
  FINANCE:   { icon: Wallet,    label: 'Finance',           color: 'var(--set-ok)',     hint: 'Finance / super admin can action' },
  USER:      { icon: User,      label: 'Specific person',   color: 'var(--set-ember)',  hint: 'A single named approver' },
}

export const approverMeta = (t) => APPROVER_META[t] || APPROVER_META.MANAGER
export const approverIcon = (t) => approverMeta(t).icon
export const approverColor = (t) => approverMeta(t).color
export const approverTypeOptions = (types = []) => types.map((t) => {
  const m = approverMeta(t)
  return { value: t, label: m.label, icon: m.icon, dot: m.color, hint: m.hint }
})
