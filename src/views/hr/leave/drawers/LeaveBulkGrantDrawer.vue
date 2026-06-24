<template>
  <Teleport to="body">
    <transition name="bg">
      <div v-if="open" class="bg-scrim" @click.self="$emit('close')">
        <aside class="bg-drawer">
          <!-- ambient depth -->
          <span class="bg-orb bg-orb-a" aria-hidden="true" />
          <span class="bg-orb bg-orb-b" aria-hidden="true" />
          <span class="bg-tex" aria-hidden="true" />
          <span class="bg-rail" aria-hidden="true" />

          <!-- ════ HEADER ════ -->
          <Motion as="header" class="bg-head"
            :initial="{ opacity: 0, y: -14 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
            <Motion as="button" class="bg-close" @click="$emit('close')"
              :whileHover="{ rotate: 90, scale: 1.08 }" :whileTap="{ scale: 0.9 }" aria-label="Close">
              <X :size="15" />
            </Motion>
            <div class="bg-head-main">
              <Motion as="div" class="bg-icon"
                :initial="{ scale: 0.4, rotate: -30, opacity: 0 }" :animate="{ scale: 1, rotate: 0, opacity: 1 }"
                :transition="{ duration: 0.6, delay: 0.08, ease: [0.34, 1.56, 0.64, 1] }">
                <Gift :size="20" /><span class="bg-icon-ring" /><span class="bg-icon-spark" />
              </Motion>
              <div class="bg-head-text">
                <span class="bg-eye leave-mono"><span class="bg-eye-led" /> POLICY&nbsp;GRANT</span>
                <h3 class="bg-title">Grant balance per policy</h3>
                <p class="bg-suborg">Top every active employee up to their policy quota — in one stroke.</p>
              </div>
            </div>
          </Motion>

          <!-- ════ RESULT SPLASH ════ -->
          <transition name="bg-splash">
            <div v-if="result" class="bg-result">
              <Motion as="div" class="bg-result-ring"
                :initial="{ scale: 0.4, opacity: 0 }" :animate="{ scale: 1, opacity: 1 }"
                :transition="{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }">
                <Check :size="34" />
              </Motion>
              <h4 class="bg-result-h">Reserves topped up</h4>
              <div class="bg-result-grid">
                <div class="bg-result-stat"><b class="leave-mono">{{ fmt(result.credited_days) }}</b><span>days credited</span></div>
                <div class="bg-result-stat"><b class="leave-mono">{{ result.employees_credited }}</b><span>employees</span></div>
                <div class="bg-result-stat"><b class="leave-mono">{{ result.skipped_already_satisfied }}</b><span>already at quota</span></div>
                <div class="bg-result-stat" v-if="result.skipped_ineligible"><b class="leave-mono">{{ result.skipped_ineligible }}</b><span>skipped (leaving)</span></div>
              </div>
              <button class="leave-btn" @click="$emit('close')">Done</button>
            </div>
          </transition>

          <!-- ════ BODY ════ -->
          <div v-if="!result" class="bg-body">
            <!-- 01 · Leave types (annually-credited) -->
            <Motion v-if="cappedTypes.length" as="section" class="bg-block"
              :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.5, delay: 0.16, ease: [0.16, 1, 0.3, 1] }">
              <span class="bg-label leave-mono">
                01 · Annual leave types
                <button class="bg-all" type="button" @click="toggleAllTypes">
                  {{ allTypesSelected ? 'Clear' : 'Select all' }}
                </button>
              </span>
              <div class="bg-types">
                <Motion v-for="(t, i) in cappedTypes" :key="t.key" as="button" type="button"
                  class="bg-type" :class="{ active: selectedTypes.includes(t.key) }"
                  :style="{ '--ty-c': t.hex }"
                  :initial="{ opacity: 0, scale: 0.82 }" :animate="{ opacity: 1, scale: 1 }"
                  :transition="{ duration: 0.32, delay: 0.2 + i * 0.03, ease: [0.34, 1.56, 0.64, 1] }"
                  :whileHover="{ y: -3, scale: 1.04 }" :whileTap="{ scale: 0.95 }"
                  @click="toggleType(t.key)">
                  <LeaveTypeIcon :type="t.key" :size="14" />
                  <span class="bg-type-lbl">{{ t.label }}</span>
                  <span class="bg-type-q leave-mono">{{ fmt(t.quota) }}d</span>
                  <span v-if="selectedTypes.includes(t.key)" class="bg-type-tick"><Check :size="10" /></span>
                </Motion>
              </div>
            </Motion>

            <!-- 01b · Accrual leaves — auto-credited monthly, caught up here -->
            <Motion v-if="accrualTypes.length" as="section" class="bg-block"
              :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }">
              <span class="bg-label leave-mono">Accrual leaves <i>credited monthly, not lump-granted</i></span>
              <div class="bg-accrual">
                <div v-for="t in accrualTypes" :key="t.key" class="bg-acc-row" :style="{ '--ty-c': t.hex }">
                  <LeaveTypeIcon :type="t.key" :size="14" />
                  <span class="bg-acc-lbl">{{ t.label }}</span>
                  <span class="bg-acc-rate leave-mono">{{ fmt(t.rate) }}/mo · {{ fmt(t.quota) }}/yr</span>
                </div>
              </div>
              <p class="bg-note">
                <Info :size="12" />
                <span>These accrue automatically each month (now on a daily scheduler). Use catch-up to
                credit any of this year’s <b>{{ elapsedMonths }}</b> elapsed month(s) that haven’t run
                yet — it never exceeds the annual quota and never re-credits used days.</span>
              </p>
              <Motion as="button" type="button" class="bg-acc-btn"
                :whileHover="catchingUp ? {} : { y: -2 }" :whileTap="{ scale: 0.97 }"
                :disabled="catchingUp" @click="catchUp">
                <component :is="catchingUp ? Loader2 : CalendarClock" :size="14" :class="{ 'bg-spin': catchingUp }" />
                {{ catchingUp ? 'Catching up…' : 'Catch up monthly accrual' }}
              </Motion>
            </Motion>

            <!-- 02 · Who -->
            <Motion v-if="cappedTypes.length" as="section" class="bg-block"
              :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.5, delay: 0.24, ease: [0.16, 1, 0.3, 1] }">
              <span class="bg-label leave-mono">02 · Who receives it</span>
              <div class="bg-seg">
                <button type="button" class="bg-seg-btn" :class="{ on: scope === 'all' }" @click="scope = 'all'">
                  <Users :size="13" /> All active
                </button>
                <button type="button" class="bg-seg-btn" :class="{ on: scope === 'dept' }" @click="scope = 'dept'">
                  <Building2 :size="13" /> By department
                </button>
              </div>
              <div v-if="scope === 'dept'" class="bg-depts">
                <button v-for="d in departments" :key="d" type="button"
                  class="bg-dept" :class="{ on: dept === d }" @click="dept = d">{{ d }}</button>
              </div>
              <p class="bg-note">
                <Info :size="12" />
                <span>Only <b>active</b> employees are eligible — anyone serving notice or separated is
                skipped automatically. Anyone already granted their annual quota is skipped too
                (<b>used days are never re-credited</b>). Accrual leaves like Earned are credited monthly,
                so they aren’t listed here.</span>
              </p>
            </Motion>

            <!-- 03 · Live projection -->
            <Motion v-if="cappedTypes.length" as="section" class="bg-proj"
              :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.5, delay: 0.32, ease: [0.16, 1, 0.3, 1] }">
              <header class="bg-proj-head"><span class="bg-label leave-mono">03 · Projection</span>
                <span class="bg-proj-live"><span class="bg-proj-led" /> live</span>
              </header>
              <div class="bg-proj-hero">
                <div class="bg-proj-num leave-mono">+{{ fmt(tDays) }}<span class="bg-proj-suf">days</span></div>
                <div class="bg-proj-cap">credited across <b>{{ projection.employees }}</b> employee(s)</div>
              </div>
              <div class="bg-proj-bar">
                <span class="bg-proj-fill" :style="{ width: barPct + '%' }"><span class="bg-proj-shine" /></span>
              </div>
              <div class="bg-proj-meta leave-mono">
                <span>{{ projection.eligible }} eligible</span>
                <span v-if="projection.satisfied">· {{ projection.satisfied }} already full</span>
                <span v-if="projection.skipped">· {{ projection.skipped }} skipped</span>
              </div>
              <!-- per-type breakdown -->
              <div v-if="projection.perType.length" class="bg-proj-types">
                <div v-for="pt in projection.perType" :key="pt.key" class="bg-pt">
                  <LeaveTypeIcon :type="pt.key" :size="12" />
                  <span class="bg-pt-lbl">{{ pt.label }}</span>
                  <span class="bg-pt-val leave-mono">+{{ fmt(pt.days) }}d</span>
                </div>
              </div>
            </Motion>

            <!-- 04 · Reason -->
            <Motion v-if="cappedTypes.length" as="section" class="bg-block"
              :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }">
              <span class="bg-label leave-mono">04 · Reason <i>optional</i></span>
              <div class="bg-textwrap">
                <textarea v-model.trim="reason" rows="2" maxlength="400"
                  class="bg-textarea" placeholder="e.g. FY 2026–27 annual leave grant" />
              </div>
            </Motion>
          </div>

          <!-- ════ FOOTER ════ -->
          <footer v-if="!result" class="bg-foot">
            <transition name="bg-splash">
              <span v-if="cappedTypes.length && !canGrant && hint" class="bg-hint"><Info :size="12" /> {{ hint }}</span>
            </transition>
            <button class="leave-btn leave-btn-sm" @click="$emit('close')">{{ cappedTypes.length ? 'Cancel' : 'Done' }}</button>
            <Motion v-if="cappedTypes.length" as="button" type="button" class="bg-save" :class="{ ready: canGrant }"
              :whileHover="canGrant ? { y: -2, scale: 1.015 } : {}" :whileTap="canGrant ? { scale: 0.97 } : {}"
              :disabled="!canGrant || saving" @click="grant">
              <span class="bg-save-sweep" />
              <component :is="saving ? Loader2 : Sparkles" :size="14" :class="{ 'bg-spin': saving }" />
              {{ saving ? 'Granting…' : `Grant to ${projection.employees} employee${projection.employees === 1 ? '' : 's'}` }}
            </Motion>
          </footer>
        </aside>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import { X, Gift, Check, Users, Building2, Info, Sparkles, Loader2, CalendarClock } from 'lucide-vue-next'
import LeaveTypeIcon from '../components/LeaveTypeIcon.vue'
import { bulkGrantBalances, accrueCatchup, typeMeta } from '@/composables/useLeaves'
import { useToast } from 'vue-toastification'

const props = defineProps({
  open: { type: Boolean, default: false },
  // The section's grouped employees — each { id, name, lifecycle_state, dept, balances:[{leave_type,available,quota,carry_forward_in}] }
  employees: { type: Array, default: () => [] },
})
const emit = defineEmits(['close', 'granted'])
const toast = useToast()

const TYPE_HEX = {
  CASUAL: '#fde047', SICK: '#e34a0a', EARNED: '#f59e0b', MATERNITY: '#fdba74',
  PATERNITY: '#b45309', BEREAVEMENT: '#854d0e', COMP_OFF: '#f97316', LWP: '#ea580c',
  STUDY: '#ca8a04', SPECIAL: '#fb923c',
}
const num = (v) => Number(v) || 0
const fmt = (v) => { const n = num(v); return Number.isInteger(n) ? String(n) : n.toFixed(1) }

const selectedTypes = ref([])
const scope = ref('all')
const dept = ref('')
const reason = ref('')
const saving = ref(false)
const result = ref(null)

const isEmployable = (e) => !e.lifecycle_state || ['ACTIVE', 'ON_PROBATION'].includes(e.lifecycle_state)

// Grantable = annually-credited types only (quota > 0 AND monthly_accrual === 0).
// Accrual-based types (Earned etc.) are auto-credited each month, never bulk-granted.
const cappedTypes = computed(() => {
  const m = new Map()
  for (const e of props.employees) {
    for (const b of (e.balances || [])) {
      if (num(b.quota) > 0 && num(b.monthly_accrual) === 0 && b.leave_type !== 'LWP' && !m.has(b.leave_type)) {
        m.set(b.leave_type, { key: b.leave_type, label: typeMeta(b.leave_type).label, hex: TYPE_HEX[b.leave_type] || '#fbbf24', quota: num(b.quota) })
      }
    }
  }
  return Array.from(m.values())
})
const allTypesSelected = computed(() => cappedTypes.value.length > 0 && selectedTypes.value.length === cappedTypes.value.length)

// Accrual-based types (monthly_accrual > 0) — credited monthly, never lump-granted.
const accrualTypes = computed(() => {
  const m = new Map()
  for (const e of props.employees) {
    for (const b of (e.balances || [])) {
      if (num(b.monthly_accrual) > 0 && b.leave_type !== 'LWP' && !m.has(b.leave_type)) {
        m.set(b.leave_type, { key: b.leave_type, label: typeMeta(b.leave_type).label, hex: TYPE_HEX[b.leave_type] || '#fbbf24', rate: num(b.monthly_accrual), quota: num(b.quota) })
      }
    }
  }
  return Array.from(m.values())
})

// Months elapsed in the current fiscal year (India default: FY starts 01-Apr).
const elapsedMonths = computed(() => {
  const now = new Date(); const m = now.getMonth()  // 0-based
  const startYear = (m >= 3) ? now.getFullYear() : now.getFullYear() - 1
  return (now.getFullYear() - startYear) * 12 + (m - 3) + 1
})

const departments = computed(() => {
  const s = new Set()
  for (const e of props.employees) if (e.dept) s.add(e.dept)
  return Array.from(s).sort()
})

// Eligible employees in scope (employable + dept filter).
const scopedEmployees = computed(() =>
  props.employees.filter(e =>
    isEmployable(e) && (scope.value === 'all' || (scope.value === 'dept' && e.dept === dept.value)),
  ),
)

// Exact projection — mirrors the backend top-up: delta = max(0, quota+cf − available).
const projection = computed(() => {
  const sel = new Set(selectedTypes.value)
  let total = 0, satisfied = 0
  const touched = new Set()
  const perType = new Map()
  for (const e of scopedEmployees.value) {
    for (const b of (e.balances || [])) {
      if (!sel.has(b.leave_type) || num(b.quota) <= 0 || num(b.monthly_accrual) > 0) continue
      // Top up the ENTITLEMENT already credited (NOT available) so used days are
      // never re-credited — mirrors the backend grant exactly.
      const credited = num(b.opening_balance) + num(b.accrued) + num(b.carry_forward_in) + num(b.adjustments)
      const target = num(b.quota) + num(b.carry_forward_in)
      const delta = Math.max(0, target - credited)
      if (delta > 0) {
        total += delta
        touched.add(e.id)
        const cur = perType.get(b.leave_type) || { key: b.leave_type, label: typeMeta(b.leave_type).label, days: 0 }
        cur.days += delta; perType.set(b.leave_type, cur)
      } else satisfied += 1
    }
  }
  const ineligible = props.employees.length - props.employees.filter(isEmployable).length
  return {
    days: total,
    employees: touched.size,
    eligible: scopedEmployees.value.length,
    satisfied,
    skipped: ineligible,
    perType: Array.from(perType.values()).sort((a, b) => b.days - a.days),
  }
})

const canGrant = computed(() => selectedTypes.value.length > 0 && projection.value.employees > 0 && (scope.value === 'all' || !!dept.value))
const hint = computed(() => {
  if (!selectedTypes.value.length) return 'Pick at least one leave type to grant.'
  if (scope.value === 'dept' && !dept.value) return 'Choose a department.'
  if (projection.value.employees === 0) return 'Everyone in scope is already at quota — nothing to credit.'
  return ''
})

// Animated count-up for the projected days
const tDays = ref(0)
let raf = null
watch(() => projection.value.days, (to) => {
  if (raf) cancelAnimationFrame(raf)
  const from = tDays.value; const start = performance.now()
  const step = (now) => {
    const k = Math.min(1, (now - start) / 480); const e = 1 - Math.pow(1 - k, 3)
    tDays.value = from + (to - from) * e
    if (k < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
}, { immediate: true })
onBeforeUnmount(() => { if (raf) cancelAnimationFrame(raf) })

const maxDays = computed(() => {
  // a soft reference so the bar feels proportional: eligible × selected-type quota
  const q = cappedTypes.value.filter(t => selectedTypes.value.includes(t.key)).reduce((s, t) => s + t.quota, 0)
  return Math.max(projection.value.days, projection.value.eligible * q || 1)
})
const barPct = computed(() => Math.max(0, Math.min(100, (projection.value.days / maxDays.value) * 100)))

const toggleType = (k) => {
  const i = selectedTypes.value.indexOf(k)
  if (i >= 0) selectedTypes.value.splice(i, 1); else selectedTypes.value.push(k)
}
const toggleAllTypes = () => {
  selectedTypes.value = allTypesSelected.value ? [] : cappedTypes.value.map(t => t.key)
}

// Reset on open — default to selecting every capped type (the common case).
watch(() => props.open, (v) => {
  if (!v) return
  result.value = null; saving.value = false
  scope.value = 'all'; dept.value = ''; reason.value = ''
  selectedTypes.value = cappedTypes.value.map(t => t.key)
})

const grant = async () => {
  if (!canGrant.value || saving.value) return
  saving.value = true
  try {
    const body = { leave_types: selectedTypes.value, employee_ids: scopedEmployees.value.map(e => e.id), reason: reason.value || null }
    result.value = await bulkGrantBalances(body)
    toast.success(`Credited ${fmt(result.value.credited_days)} day(s) to ${result.value.employees_credited} employee(s)`)
    emit('granted')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to grant balances')
  } finally { saving.value = false }
}

const catchingUp = ref(false)
const catchUp = async () => {
  if (catchingUp.value) return
  catchingUp.value = true
  try {
    const r = await accrueCatchup()
    toast.success(`Accrual caught up — ${r.processed} credit(s) applied${r.notes ? ' · ' + r.notes : ''}`)
    emit('granted')   // reload balances so accrual leaves show their credited amounts
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Accrual catch-up failed')
  } finally { catchingUp.value = false }
}

const onKey = (e) => { if (e.key === 'Escape' && props.open) emit('close') }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
@import '@/styles/leave-theme.css';

.bg-scrim {
  position: fixed; inset: 0; z-index: 1090; display: flex; justify-content: flex-end;
  background: radial-gradient(70% 90% at 100% 50%, rgba(251, 191, 36, 0.26), transparent 60%), rgba(6, 5, 8, 0.58);
  backdrop-filter: blur(12px) saturate(120%); -webkit-backdrop-filter: blur(12px) saturate(120%);
}
.bg-drawer {
  position: relative; overflow: hidden; width: 500px; max-width: 96vw; height: 100%;
  display: flex; flex-direction: column;
  background:
    radial-gradient(120% 50% at 100% 0%, rgba(251, 191, 36, 0.14), transparent 55%),
    radial-gradient(90% 40% at 0% 100%, rgba(234, 88, 12, 0.12), transparent 60%),
    linear-gradient(180deg, rgba(16, 11, 6, 0.97), rgba(10, 7, 4, 0.98));
  border-left: 1px solid var(--leave-border-strong);
  box-shadow: -40px 0 90px -40px rgba(0, 0, 0, 0.9); isolation: isolate;
}
[data-theme="light"] .bg-drawer {
  background:
    radial-gradient(120% 50% at 100% 0%, rgba(251, 191, 36, 0.2), transparent 55%),
    radial-gradient(90% 40% at 0% 100%, rgba(234, 88, 12, 0.1), transparent 60%),
    linear-gradient(180deg, rgba(255, 251, 243, 0.98), rgba(255, 246, 232, 0.98));
}
.bg-rail { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; z-index: 5; background: var(--leave-grad-cta); box-shadow: 0 0 22px rgba(251, 191, 36, 0.6); }
.bg-orb { position: absolute; border-radius: 50%; filter: blur(48px); pointer-events: none; z-index: 0; opacity: 0.55; }
.bg-orb-a { width: 280px; height: 280px; top: -80px; right: -80px; background: radial-gradient(circle, rgba(251, 191, 36, 0.34), transparent 65%); animation: bg-drift-a 11s ease-in-out infinite; }
.bg-orb-b { width: 240px; height: 240px; bottom: 40px; left: -90px; background: radial-gradient(circle, rgba(234, 88, 12, 0.3), transparent 65%); animation: bg-drift-b 13s ease-in-out infinite; }
@keyframes bg-drift-a { 0%,100% { transform: translate(0,0) scale(1);} 50% { transform: translate(-26px,30px) scale(1.12);} }
@keyframes bg-drift-b { 0%,100% { transform: translate(0,0) scale(1);} 50% { transform: translate(24px,-26px) scale(1.1);} }
.bg-tex { position: absolute; inset: 0; z-index: 0; pointer-events: none; background-image: radial-gradient(rgba(251, 191, 36, 0.06) 1px, transparent 1px); background-size: 18px 18px; mask-image: linear-gradient(180deg, rgba(0,0,0,0.5), transparent 65%); opacity: 0.6; }
[data-theme="light"] .bg-tex { background-image: radial-gradient(rgba(180, 83, 9, 0.1) 1px, transparent 1px); }

.bg-head { position: relative; z-index: 3; padding: 24px 24px 18px; border-bottom: 1px solid var(--leave-border); }
.bg-close { position: absolute; top: 16px; right: 16px; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; border: 1px solid var(--leave-border-strong); background: rgba(20, 14, 8, 0.5); color: var(--leave-text-muted); cursor: pointer; }
[data-theme="light"] .bg-close { background: rgba(255, 250, 240, 0.7); }
.bg-close:hover { color: var(--leave-text); border-color: var(--leave-brand); }
.bg-head-main { display: flex; gap: 14px; align-items: flex-start; }
.bg-icon { position: relative; flex-shrink: 0; display: inline-grid; place-items: center; width: 46px; height: 46px; border-radius: 14px; background: linear-gradient(135deg, rgba(251, 191, 36, 0.34), rgba(234, 88, 12, 0.22)); border: 1px solid rgba(251, 191, 36, 0.5); color: #fff3c4; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 10px 24px -12px rgba(234, 88, 12, 0.7); }
[data-theme="light"] .bg-icon { color: #7c2d12; }
.bg-icon-ring { position: absolute; inset: -5px; border-radius: 18px; border: 1px solid rgba(251, 191, 36, 0.45); animation: leave-orb-spin 16s linear infinite; }
.bg-icon-spark { position: absolute; inset: -2px; border-radius: 16px; box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.5); animation: bg-spark 2.6s ease-out infinite; }
@keyframes bg-spark { 0% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.45); } 70%,100% { box-shadow: 0 0 0 14px rgba(251, 191, 36, 0); } }
.bg-head-text { min-width: 0; }
.bg-eye { display: inline-flex; align-items: center; gap: 7px; font-size: 9px; font-weight: 800; letter-spacing: 0.18em; color: var(--leave-text-muted); }
.bg-eye-led { width: 6px; height: 6px; border-radius: 50%; background: var(--leave-brand); box-shadow: 0 0 8px var(--leave-brand); animation: leave-eyebrow-pulse 1.6s ease-in-out infinite; }
.bg-title { margin: 6px 0 0; font-size: 19px; font-weight: 900; letter-spacing: -0.02em; color: var(--leave-text); }
.bg-suborg { margin: 5px 0 0; font-size: 11.5px; line-height: 1.5; color: var(--leave-text-muted); }

.bg-body { position: relative; z-index: 2; flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 22px; scrollbar-width: thin; }
.bg-body::-webkit-scrollbar { width: 6px; }
.bg-body::-webkit-scrollbar-thumb { background: rgba(251, 191, 36, 0.4); border-radius: 999px; }
.bg-block { display: flex; flex-direction: column; gap: 11px; }
.bg-label { display: flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: var(--leave-text-secondary); }
.bg-label i { font-style: normal; font-weight: 600; letter-spacing: 0.08em; color: var(--leave-text-muted); text-transform: none; }
.bg-all { margin-left: auto; font: inherit; font-size: 9.5px; font-weight: 800; letter-spacing: 0.08em; color: var(--leave-brand); background: none; border: 0; cursor: pointer; text-transform: uppercase; }
.bg-empty { padding: 10px; font-size: 11px; letter-spacing: 0.12em; color: var(--leave-text-muted); }

.bg-types { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.bg-type { --ty-c: var(--leave-brand); position: relative; display: flex; align-items: center; gap: 8px; padding: 10px 11px; border-radius: 12px; background: rgba(28, 18, 10, 0.5); border: 1px solid var(--leave-border); color: var(--leave-text-secondary); cursor: pointer; font: inherit; text-align: left; transition: border-color .2s, background .2s, color .2s; }
[data-theme="light"] .bg-type { background: rgba(255, 250, 240, 0.7); }
.bg-type:hover { border-color: color-mix(in srgb, var(--ty-c) 55%, transparent); color: var(--leave-text); }
.bg-type-lbl { font-size: 12px; font-weight: 700; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bg-type-q { font-size: 10px; font-weight: 800; color: var(--leave-text-muted); }
.bg-type.active { border-color: color-mix(in srgb, var(--ty-c) 75%, transparent); background: color-mix(in srgb, var(--ty-c) 16%, rgba(28, 18, 10, 0.6)); color: var(--leave-text); box-shadow: 0 8px 22px -12px color-mix(in srgb, var(--ty-c) 80%, transparent); }
[data-theme="light"] .bg-type.active { background: color-mix(in srgb, var(--ty-c) 22%, rgba(255, 250, 240, 0.85)); }
.bg-type.active .bg-type-q { color: var(--leave-text); }
.bg-type-tick { display: grid; place-items: center; width: 17px; height: 17px; border-radius: 50%; background: var(--ty-c); color: #1f1408; flex-shrink: 0; }

.bg-seg { display: flex; gap: 8px; }
.bg-seg-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 38px; border-radius: 11px; font: inherit; font-size: 12px; font-weight: 700; background: rgba(28, 18, 10, 0.5); border: 1px solid var(--leave-border); color: var(--leave-text-secondary); cursor: pointer; transition: all .2s; }
[data-theme="light"] .bg-seg-btn { background: rgba(255, 250, 240, 0.7); }
.bg-seg-btn.on { border-color: var(--leave-brand); background: rgba(251, 191, 36, 0.14); color: var(--leave-text); }
.bg-depts { display: flex; flex-wrap: wrap; gap: 6px; }
.bg-dept { font: inherit; font-size: 11.5px; font-weight: 700; padding: 6px 12px; border-radius: 999px; background: rgba(28, 18, 10, 0.5); border: 1px solid var(--leave-border); color: var(--leave-text-secondary); cursor: pointer; transition: all .2s; }
[data-theme="light"] .bg-dept { background: rgba(255, 250, 240, 0.7); }
.bg-dept.on { border-color: var(--leave-brand); background: rgba(251, 191, 36, 0.14); color: var(--leave-text); }
.bg-note { display: flex; align-items: flex-start; gap: 6px; margin: 2px 0 0; font-size: 10.5px; line-height: 1.45; color: var(--leave-text-muted); }
.bg-note svg { flex-shrink: 0; margin-top: 1px; color: var(--leave-brand); }
.bg-note > span { flex: 1; min-width: 0; }
.bg-note b { color: var(--leave-text-secondary); font-weight: 800; }

/* accrual leaves block */
.bg-accrual { display: flex; flex-direction: column; gap: 6px; }
.bg-acc-row { --ty-c: var(--leave-brand); display: flex; align-items: center; gap: 9px; padding: 9px 11px; border-radius: 11px; background: color-mix(in srgb, var(--ty-c) 9%, rgba(28, 18, 10, 0.5)); border: 1px solid color-mix(in srgb, var(--ty-c) 24%, transparent); }
[data-theme="light"] .bg-acc-row { background: color-mix(in srgb, var(--ty-c) 12%, rgba(255, 250, 240, 0.8)); }
.bg-acc-lbl { font-size: 12px; font-weight: 700; color: var(--leave-text); flex: 1; min-width: 0; }
.bg-acc-rate { font-size: 10.5px; font-weight: 700; color: var(--leave-text-muted); }
.bg-acc-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 40px; border-radius: 11px; font: inherit; font-size: 12.5px; font-weight: 800; cursor: pointer; color: var(--leave-text); background: rgba(28, 18, 10, 0.6); border: 1px solid var(--leave-border-strong); transition: border-color .25s, color .25s, background .25s; }
[data-theme="light"] .bg-acc-btn { background: rgba(255, 250, 240, 0.8); }
.bg-acc-btn:hover:not(:disabled) { border-color: var(--leave-brand); color: var(--leave-brand); background: rgba(251, 191, 36, 0.12); }
.bg-acc-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.bg-proj { position: relative; padding: 16px; border-radius: 16px; background: radial-gradient(90% 70% at 100% 0%, rgba(251, 191, 36, 0.1), transparent 60%), rgba(20, 13, 7, 0.6); border: 1px solid color-mix(in srgb, var(--leave-approved) 35%, transparent); box-shadow: 0 0 30px -16px var(--leave-approved); }
[data-theme="light"] .bg-proj { background: rgba(255, 248, 230, 0.78); }
.bg-proj-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.bg-proj-live { display: inline-flex; align-items: center; gap: 5px; font-size: 9px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--leave-approved); }
.bg-proj-led { width: 6px; height: 6px; border-radius: 50%; background: var(--leave-approved); box-shadow: 0 0 8px var(--leave-approved); animation: leave-eyebrow-pulse 1.6s ease-in-out infinite; }
.bg-proj-hero { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.bg-proj-num { font-size: 38px; font-weight: 900; line-height: 1; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; background: var(--leave-grad-cta); background-clip: text; -webkit-background-clip: text; color: transparent; }
.bg-proj-suf { font-size: 13px; margin-left: 5px; -webkit-text-fill-color: var(--leave-text-muted); }
.bg-proj-cap { font-size: 11.5px; color: var(--leave-text-secondary); }
.bg-proj-cap b { color: var(--leave-text); font-weight: 800; }
.bg-proj-bar { height: 8px; border-radius: 7px; overflow: hidden; background: rgba(251, 191, 36, 0.1); border: 1px solid var(--leave-border); margin: 12px 0 8px; }
.bg-proj-fill { position: relative; display: block; height: 100%; border-radius: 7px; background: var(--leave-grad-cta); box-shadow: 0 0 14px color-mix(in srgb, var(--leave-approved) 55%, transparent); overflow: hidden; transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
.bg-proj-shine { position: absolute; inset: 0; background: linear-gradient(100deg, transparent, rgba(255,255,255,0.5), transparent); background-size: 220% 100%; animation: leave-gradient-pan 2.8s linear infinite; mix-blend-mode: overlay; }
.bg-proj-meta { display: flex; flex-wrap: wrap; gap: 5px; font-size: 10px; color: var(--leave-text-muted); }
.bg-proj-types { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 12px; }
.bg-pt { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; background: rgba(28, 18, 10, 0.5); border: 1px solid var(--leave-border); }
[data-theme="light"] .bg-pt { background: rgba(255, 250, 240, 0.7); }
.bg-pt-lbl { font-size: 10.5px; font-weight: 700; color: var(--leave-text-secondary); }
.bg-pt-val { font-size: 10.5px; font-weight: 800; color: var(--leave-approved); }

.bg-textwrap { position: relative; border-radius: 12px; border: 1px solid var(--leave-border-strong); background: rgba(28, 18, 10, 0.5); overflow: hidden; transition: border-color .25s; }
[data-theme="light"] .bg-textwrap { background: rgba(255, 250, 240, 0.75); }
.bg-textwrap:focus-within { border-color: var(--leave-brand); }
.bg-textarea { display: block; width: 100%; resize: vertical; min-height: 56px; padding: 11px 12px; border: 0; outline: 0; background: transparent; font: inherit; font-size: 13px; line-height: 1.55; color: var(--leave-text); }
.bg-textarea::placeholder { color: var(--leave-text-placeholder); }

.bg-foot { position: relative; z-index: 3; display: flex; gap: 10px; justify-content: flex-end; align-items: center; padding: 16px 24px 20px; border-top: 1px solid var(--leave-border); background: linear-gradient(0deg, rgba(10, 7, 4, 0.6), transparent); }
[data-theme="light"] .bg-foot { background: linear-gradient(0deg, rgba(255, 246, 232, 0.7), transparent); }
.bg-hint { display: inline-flex; align-items: center; gap: 6px; margin-right: auto; max-width: 55%; font-size: 10.5px; line-height: 1.35; font-weight: 600; color: var(--leave-text-muted); }
.bg-hint svg { flex-shrink: 0; color: var(--leave-brand); }
.bg-save { position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 20px; border-radius: 11px; font: inherit; font-size: 13px; font-weight: 800; color: var(--leave-text-muted); background: rgba(28, 18, 10, 0.6); border: 1px solid var(--leave-border-strong); cursor: not-allowed; transition: all .3s; }
.bg-save.ready { cursor: pointer; color: #2a1100; background: var(--leave-grad-cta); background-size: 200% 100%; border-color: rgba(251, 146, 60, 0.6); box-shadow: 0 14px 34px -12px rgba(234, 88, 12, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.45); }
.bg-save-sweep { position: absolute; inset: 0; background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%); background-size: 220% 100%; background-position: 200% 0; opacity: 0; pointer-events: none; }
.bg-save.ready:hover .bg-save-sweep { animation: bg-sweep 0.9s ease forwards; opacity: 1; }
@keyframes bg-sweep { to { background-position: -120% 0; } }
.bg-spin { animation: bg-rot 0.8s linear infinite; }
@keyframes bg-rot { to { transform: rotate(360deg); } }

/* result splash */
.bg-result { position: relative; z-index: 3; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 30px; text-align: center; }
.bg-result-ring { display: grid; place-items: center; width: 84px; height: 84px; border-radius: 50%; background: radial-gradient(circle, rgba(52, 211, 153, 0.25), transparent 70%); border: 2px solid var(--leave-approved); color: var(--leave-approved); box-shadow: 0 0 40px -8px var(--leave-approved); }
.bg-result-h { margin: 0; font-size: 18px; font-weight: 900; color: var(--leave-text); }
.bg-result-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; width: 100%; max-width: 320px; }
.bg-result-stat { display: flex; flex-direction: column; gap: 2px; padding: 12px; border-radius: 13px; background: rgba(28, 18, 10, 0.5); border: 1px solid var(--leave-border); }
[data-theme="light"] .bg-result-stat { background: rgba(255, 250, 240, 0.8); }
.bg-result-stat b { font-size: 22px; font-weight: 900; color: var(--leave-approved); }
.bg-result-stat span { font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--leave-text-muted); }

.bg-enter-active, .bg-leave-active { transition: opacity .32s ease; }
.bg-enter-from, .bg-leave-to { opacity: 0; }
.bg-enter-active .bg-drawer, .bg-leave-active .bg-drawer { transition: transform .46s cubic-bezier(0.16, 1, 0.3, 1); }
.bg-enter-from .bg-drawer, .bg-leave-to .bg-drawer { transform: translateX(100%) rotateY(8deg) scale(0.97); }
.bg-splash-enter-active, .bg-splash-leave-active { transition: opacity .25s, transform .25s; }
.bg-splash-enter-from, .bg-splash-leave-to { opacity: 0; transform: translateY(6px); }

@media (prefers-reduced-motion: reduce) {
  .bg-orb-a, .bg-orb-b, .bg-icon-ring, .bg-icon-spark, .bg-eye-led, .bg-proj-shine, .bg-proj-led, .bg-spin { animation: none !important; }
}
</style>
