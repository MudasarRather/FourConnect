// Frontend mirror of the backend lifecycle write-guard (app/utils/hr/lifecycle_guard.py).
// Used to filter employee pickers so an admin doesn't pick someone the API would
// reject with a 409. The backend stays the authoritative boundary — this is UX only.
//
// Modes:
//   'employable'   → only ACTIVE / ON_PROBATION (new forward-looking grants:
//                    asset allocation, transfer, training, induction, welcome kit,
//                    ERP login). Hides ON_NOTICE / SUSPENDED / EXITED / ARCHIVED / INACTIVE.
//   'not-separated'→ hide only the fully-separated (EXITED / ARCHIVED / INACTIVE);
//                    keep ON_NOTICE + SUSPENDED. For settlement / finance and
//                    "create-new" date-bound flows where an on-notice employee is
//                    still legitimately transactable (the backend caps by date, not state).

export const EMPLOYABLE_STATES = ['ACTIVE', 'ON_PROBATION']
export const SEPARATED_STATES = ['EXITED', 'ARCHIVED', 'INACTIVE']

const stateOf = (e) => (e?.lifecycle_state || '').toUpperCase()

export const isEmployable = (e) => EMPLOYABLE_STATES.includes(stateOf(e))
export const isNotSeparated = (e) => stateOf(e) ? !SEPARATED_STATES.includes(stateOf(e)) : true

// Filter a list by mode. Unknown/missing lifecycle_state is treated as selectable
// (fail-open on the client — the backend still enforces), so a lighter employee
// payload that omits the field never hides everyone.
export function selectableEmployees(list, mode = 'employable') {
  const arr = Array.isArray(list) ? list : []
  if (mode === 'not-separated') return arr.filter(e => !stateOf(e) || isNotSeparated(e))
  // 'employable' — but only filter rows that actually carry a state
  return arr.filter(e => !stateOf(e) || isEmployable(e))
}

// Human note for the hidden count.
export function hiddenNote(total, shown, mode = 'employable') {
  const n = Math.max(0, (total || 0) - (shown || 0))
  if (!n) return ''
  const who = mode === 'not-separated' ? 'exited' : 'on notice or exited'
  return `${n} employee${n > 1 ? 's' : ''} ${who} ${n > 1 ? 'are' : 'is'} hidden — they can't receive this.`
}
