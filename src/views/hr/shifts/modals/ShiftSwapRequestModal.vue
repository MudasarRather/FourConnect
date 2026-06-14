<template>
  <OnbModal :open="open" title="New shift swap" subtitle="Exchange the shifts two employees are actually assigned on a date. Manager approval performs the swap."
    :icon="ArrowLeftRight" :width="660" @close="$emit('close')">
    <div class="sw-grid" v-if="open">
      <!-- live exchange preview -->
      <Motion as="div" class="sw-preview" :data-ready="canPreview"
        :initial="{ opacity: 0, y: -8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }">
        <span class="pv-shimmer" aria-hidden="true" />
        <div class="pv-party">
          <span class="pv-av">{{ initials(empName(form.requester_employee_id)) || 'R' }}</span>
          <div class="pv-id">
            <b>{{ empName(form.requester_employee_id) || 'Requester' }}</b>
            <span class="pv-flow">
              <span class="pv-chip">{{ reqShift?.shift_code || '—' }}</span>
              <ArrowRight :size="11" class="pv-arr" />
              <span class="pv-chip got">{{ cptShift?.shift_code || '—' }}</span>
            </span>
          </div>
        </div>

        <div class="pv-core">
          <span class="pv-core-ring" aria-hidden="true" />
          <span class="pv-core-ic"><Repeat :size="16" /></span>
          <small>{{ form.swap_date ? formatDate(form.swap_date) : 'pick a date' }}</small>
        </div>

        <div class="pv-party right">
          <div class="pv-id ar">
            <b>{{ empName(form.counterparty_employee_id) || 'Counterparty' }}</b>
            <span class="pv-flow">
              <span class="pv-chip alt">{{ cptShift?.shift_code || '—' }}</span>
              <ArrowRight :size="11" class="pv-arr" />
              <span class="pv-chip got alt">{{ reqShift?.shift_code || '—' }}</span>
            </span>
          </div>
          <span class="pv-av alt">{{ initials(empName(form.counterparty_employee_id)) || 'C' }}</span>
        </div>
      </Motion>

      <!-- pair selectors -->
      <div class="sw-pair">
        <Motion as="div" class="sw-side" :initial="{ opacity: 0, x: -14 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.05 }">
          <span class="sw-side-label"><span class="dot" /> Requester</span>
          <OnbField type="select" :model-value="form.requester_employee_id" :options="empOptions" placeholder="Select employee…"
            @update:model-value="v => form.requester_employee_id = v" />
          <div class="shiftcard" :data-state="sideState('req')">
            <Loader2 v-if="sideState('req') === 'loading'" :size="13" class="spin" />
            <template v-else-if="sideState('req') === 'found'">
              <Clock :size="13" /><span class="sc-code">{{ reqShift.shift_code }}</span>
              <span class="sc-name">{{ reqShift.shift_name }}</span>
            </template>
            <template v-else-if="sideState('req') === 'off'"><CalendarX :size="13" /><span>Weekly off ({{ weekdayName }})</span></template>
            <template v-else-if="sideState('req') === 'none'"><AlertTriangle :size="13" /><span>No shift on this date</span></template>
            <template v-else><CalendarSearch :size="13" /><span>Pick employee &amp; date</span></template>
          </div>
        </Motion>

        <span class="sw-swap-ic"><ArrowLeftRight :size="16" /></span>

        <Motion as="div" class="sw-side" :initial="{ opacity: 0, x: 14 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.1 }">
          <span class="sw-side-label"><span class="dot alt" /> Counterparty</span>
          <OnbField type="select" :model-value="form.counterparty_employee_id" :options="cptOptions" placeholder="Select employee…"
            @update:model-value="v => form.counterparty_employee_id = v" />
          <div class="shiftcard" :data-state="sideState('cpt')">
            <Loader2 v-if="sideState('cpt') === 'loading'" :size="13" class="spin" />
            <template v-else-if="sideState('cpt') === 'found'">
              <Clock :size="13" /><span class="sc-code">{{ cptShift.shift_code }}</span>
              <span class="sc-name">{{ cptShift.shift_name }}</span>
            </template>
            <template v-else-if="sideState('cpt') === 'off'"><CalendarX :size="13" /><span>Weekly off ({{ weekdayName }})</span></template>
            <template v-else-if="sideState('cpt') === 'none'"><AlertTriangle :size="13" /><span>No shift on this date</span></template>
            <template v-else><CalendarSearch :size="13" /><span>Pick employee &amp; date</span></template>
          </div>
        </Motion>
      </div>

      <Motion as="div" class="sw-row" :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.15 }">
        <div class="sw-date">
          <OnbField type="date" label="Swap date" required :model-value="form.swap_date"
            @update:model-value="v => form.swap_date = v" />
        </div>
        <div class="sw-reason">
          <OnbField label="Reason" placeholder="Why the swap? (optional)" :model-value="form.reason"
            @update:model-value="v => form.reason = v" />
        </div>
      </Motion>

      <Transition name="sw-fade">
        <p v-if="warning" class="sw-warn"><AlertTriangle :size="13" /> {{ warning }}</p>
      </Transition>
    </div>

    <template #footer>
      <span class="sw-foot">Only real, same-day assignments can be exchanged — both sides must have a shift on the date.</span>
      <button class="sw-ghost" @click="$emit('close')">Cancel</button>
      <button class="sw-primary" :disabled="!valid || saving" @click="submit">
        <CheckCircle2 v-if="!saving" :size="14" /><Loader2 v-else :size="14" class="spin" /> Create swap
      </button>
    </template>
  </OnbModal>
</template>

<script setup>
import { reactive, computed, ref, watch } from 'vue'
import { Motion } from 'motion-v'
import { ArrowLeftRight, ArrowRight, Repeat, CheckCircle2, Loader2, AlertTriangle, Clock, CalendarSearch, CalendarX } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import OnbModal from '../../onboarding/components/OnbModal.vue'
import OnbField from '../../onboarding/components/OnbField.vue'
import { createSwap, fetchEmployeesLite, fetchShifts, fetchShiftAssignments, fetchHolidays, todayIso } from '@/composables/useShifts'

const props = defineProps({ open: Boolean })
const emit = defineEmits(['close', 'saved'])
const toast = useToast()
const employees = ref([])
const shifts = ref([])
const saving = ref(false)
// resolved same-day assignment per side: undefined = not resolved, null = none found, object = { shift_id, shift_code, shift_name }
const reqShift = ref(undefined)
const cptShift = ref(undefined)
const loadingReq = ref(false)
const loadingCpt = ref(false)
let reqSeq = 0, cptSeq = 0
const blank = () => ({ requester_employee_id: '', counterparty_employee_id: '', requester_shift_id: '', counterparty_shift_id: '', swap_date: todayIso(), reason: '' })
const form = reactive(blank())
const holidays = ref([])
let loadedYear = null
const loadHolidays = async (year) => {
  if (!year || year === loadedYear) return
  loadedYear = year
  try { holidays.value = await fetchHolidays({ year }) } catch { holidays.value = [] }
}

watch(() => props.open, async (o) => {
  if (!o) return
  Object.assign(form, blank())
  reqShift.value = undefined; cptShift.value = undefined
  try { [employees.value, shifts.value] = await Promise.all([fetchEmployeesLite(''), fetchShifts({ limit: 100 }).then(d => d.items || [])]) } catch { /* */ }
  loadHolidays(Number((form.swap_date || '').slice(0, 4)))
})
watch(() => form.swap_date, (d) => { if (d) loadHolidays(Number(d.slice(0, 4))) })

const empName = (id) => employees.value.find(e => e.id === id)?.full_name || ''
const initials = (n) => (n || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
const formatDate = (iso) => { try { return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) } catch { return iso } }

const empOptions = computed(() => employees.value.map(e => ({ value: e.id, label: e.full_name, disabled: e.id === form.counterparty_employee_id })))
const cptOptions = computed(() => employees.value.map(e => ({ value: e.id, label: e.full_name, disabled: e.id === form.requester_employee_id })))
const shiftMap = computed(() => Object.fromEntries(shifts.value.map(s => [s.id, s])))

// ── Resolve each employee's ACTUAL shift on the chosen date ──
const resolveSide = async (side) => {
  const empId = side === 'req' ? form.requester_employee_id : form.counterparty_employee_id
  const ref_ = side === 'req' ? reqShift : cptShift
  const setShiftId = (v) => { if (side === 'req') form.requester_shift_id = v; else form.counterparty_shift_id = v }
  if (!empId || !form.swap_date) { ref_.value = undefined; setShiftId(''); return }
  const seq = side === 'req' ? (reqSeq = reqSeq + 1) : (cptSeq = cptSeq + 1)
  if (side === 'req') loadingReq.value = true; else loadingCpt.value = true
  try {
    const rows = await fetchShiftAssignments({ employee_id: empId, active_on: form.swap_date })
    if (seq !== (side === 'req' ? reqSeq : cptSeq)) return // stale response, ignore
    const a = Array.isArray(rows) ? rows[0] : null
    if (a) { ref_.value = { shift_id: a.shift_id, shift_code: a.shift_code, shift_name: a.shift_name, weekly_off_days: shiftMap.value[a.shift_id]?.weekly_off_days || [] }; setShiftId(a.shift_id) }
    else { ref_.value = null; setShiftId('') }
  } catch {
    if (seq === (side === 'req' ? reqSeq : cptSeq)) { ref_.value = null; setShiftId('') }
  } finally {
    if (side === 'req') loadingReq.value = false; else loadingCpt.value = false
  }
}
watch(() => [form.requester_employee_id, form.swap_date], () => resolveSide('req'))
watch(() => [form.counterparty_employee_id, form.swap_date], () => resolveSide('cpt'))

const WD = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
// JS getDay() is 0=Sun…6=Sat; convert to Python weekday (0=Mon…6=Sun) to match weekly_off_days.
const pyWeekday = computed(() => form.swap_date ? (new Date(form.swap_date + 'T00:00:00').getDay() + 6) % 7 : null)
const weekdayName = computed(() => pyWeekday.value != null ? WD[pyWeekday.value] : '')
const weeklyOffReq = computed(() => pyWeekday.value != null && !!reqShift.value?.weekly_off_days?.includes(pyWeekday.value))
const weeklyOffCpt = computed(() => pyWeekday.value != null && !!cptShift.value?.weekly_off_days?.includes(pyWeekday.value))
const holidayHit = computed(() => form.swap_date ? holidays.value.find(h => h.is_active && h.date === form.swap_date) : null)

const sideState = (side) => {
  const loading = side === 'req' ? loadingReq.value : loadingCpt.value
  const v = side === 'req' ? reqShift.value : cptShift.value
  if (loading) return 'loading'
  if (v === undefined) return 'idle'
  if (v === null) return 'none'
  if (side === 'req' ? weeklyOffReq.value : weeklyOffCpt.value) return 'off'
  return 'found'
}

const bothPicked = computed(() => !!form.requester_employee_id && !!form.counterparty_employee_id)
const sameEmployee = computed(() => form.requester_employee_id && form.requester_employee_id === form.counterparty_employee_id)
const canPreview = computed(() => bothPicked.value && !!form.swap_date)
const sameShift = computed(() => reqShift.value?.shift_id && reqShift.value.shift_id === cptShift.value?.shift_id)

const warning = computed(() => {
  if (sameEmployee.value) return 'Requester and counterparty must be different people.'
  if (!bothPicked.value || !form.swap_date) return ''
  if (loadingReq.value || loadingCpt.value) return ''
  if (reqShift.value === null) return `${empName(form.requester_employee_id) || 'Requester'} has no shift assigned on this date — nothing to swap.`
  if (cptShift.value === null) return `${empName(form.counterparty_employee_id) || 'Counterparty'} has no shift assigned on this date — nothing to swap.`
  if (holidayHit.value) return `${formatDate(form.swap_date)} is a holiday (${holidayHit.value.name}) — shifts don't run. Use Holiday Shifts for holiday duty.`
  if (weeklyOffReq.value) return `${empName(form.requester_employee_id) || 'Requester'}'s shift is off on ${weekdayName.value} (weekly off) — nothing to swap.`
  if (weeklyOffCpt.value) return `${empName(form.counterparty_employee_id) || 'Counterparty'}'s shift is off on ${weekdayName.value} (weekly off) — nothing to swap.`
  if (sameShift.value) return 'Both are already on the same shift that day — there is nothing to exchange.'
  return ''
})

const valid = computed(() =>
  bothPicked.value && !sameEmployee.value && !!form.swap_date &&
  !!reqShift.value?.shift_id && !!cptShift.value?.shift_id && !sameShift.value &&
  !holidayHit.value && !weeklyOffReq.value && !weeklyOffCpt.value)

const submit = async () => {
  if (!valid.value) { toast.warning(warning.value || 'Pick two employees with shifts on the same date'); return }
  saving.value = true
  try {
    await createSwap({
      requester_employee_id: form.requester_employee_id, counterparty_employee_id: form.counterparty_employee_id,
      swap_date: form.swap_date, requester_shift_id: reqShift.value.shift_id,
      counterparty_shift_id: cptShift.value.shift_id, reason: form.reason || null,
    })
    toast.success('Swap request created')
    emit('saved'); emit('close')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not create swap') }
  finally { saving.value = false }
}
</script>

<style scoped>
.sw-grid { display: flex; flex-direction: column; gap: 18px; }

/* ─── live exchange preview ─── */
.sw-preview { position: relative; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 14px;
  padding: 16px 18px; border-radius: 16px; overflow: hidden;
  background: var(--shift-surface-2, rgba(26,29,34,0.86)); border: 1px solid var(--shift-border-soft, rgba(255,255,255,0.06)); }
.pv-shimmer { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background: linear-gradient(115deg, transparent 30%, rgba(251,191,36,0.10) 50%, transparent 70%);
  background-size: 220% 100%; animation: pv-sheen 5.5s linear infinite; }
.sw-preview[data-ready="true"] .pv-shimmer { opacity: 0.9; }
.pv-party { position: relative; z-index: 1; display: flex; align-items: center; gap: 11px; min-width: 0; }
.pv-party.right { justify-content: flex-end; }
.pv-av { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; font-size: 12px; font-weight: 800; flex-shrink: 0;
  font-family: var(--shift-mono); background: radial-gradient(circle at 38% 32%, #fff4d6, #fbbf24 65%, #b45309); color: #2a1a05; }
.pv-av.alt { background: radial-gradient(circle at 38% 32%, #ffe2c4, #fb923c 62%, #c2410c); color: #2a1205; }
.pv-id { min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.pv-id.ar { align-items: flex-end; }
.pv-id b { font-size: 13px; font-weight: 700; color: var(--shift-text, #f4f6fa); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pv-flow { display: inline-flex; align-items: center; gap: 5px; }
.pv-chip { font-family: var(--shift-mono); font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 6px;
  background: rgba(148,163,184,0.16); color: var(--shift-text-muted, #8a91a0); }
.pv-chip.got { background: rgba(251,191,36,0.14); color: var(--shift-amber, #fbbf24); }
.pv-chip.got.alt { background: rgba(251,146,60,0.16); color: var(--shift-ember, #fb923c); }
.pv-arr { color: var(--shift-text-dim, #5f6675); }
.pv-core { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; flex-shrink: 0; }
.pv-core-ic { width: 36px; height: 36px; border-radius: 12px; display: grid; place-items: center; color: var(--shift-amber, #fbbf24);
  background: var(--shift-surface, rgba(18,20,24,0.66)); border: 1px solid var(--shift-border, rgba(251,191,36,0.13)); animation: pv-rock 3.4s ease-in-out infinite; }
.pv-core-ring { position: absolute; top: 0; width: 36px; height: 36px; border-radius: 12px; border: 1px solid var(--shift-amber, #fbbf24);
  opacity: 0; animation: pv-pulse 3s ease-out infinite; }
.pv-core small { font-family: var(--shift-mono); font-size: 9px; color: var(--shift-text-muted, #8a91a0); }

/* ─── pair selectors ─── */
.sw-pair { display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px; align-items: start; }
.sw-side { display: flex; flex-direction: column; gap: 10px; }
.sw-side-label { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.07em;
  color: var(--shift-amber-strong, #f59e0b); font-family: var(--shift-mono); }
.sw-side-label .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--shift-amber, #fbbf24); }
.sw-side-label .dot.alt { background: var(--shift-ember, #fb923c); }
.sw-swap-ic { align-self: center; margin-top: 24px; width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center;
  background: rgba(251,191,36,0.12); color: var(--shift-amber, #fbbf24); border: 1px solid var(--shift-border, rgba(251,191,36,0.13)); }

/* resolved-shift card (replaces the free dropdown — only real assignments) */
.shiftcard { display: flex; align-items: center; gap: 7px; min-height: 38px; padding: 8px 12px; border-radius: 11px; font-size: 12px;
  border: 1px solid var(--shift-border-soft, rgba(255,255,255,0.06)); background: var(--hr-input-bg); color: var(--shift-text-muted, #8a91a0);
  transition: border-color 0.2s, color 0.2s, background 0.2s; }
.shiftcard[data-state="found"] { border-color: color-mix(in srgb, var(--shift-ok, #34d399) 30%, transparent); color: var(--shift-text, #f4f6fa); background: var(--shift-ok-soft, rgba(52,211,153,0.12)); }
.shiftcard[data-state="found"] :deep(svg) { color: var(--shift-ok, #34d399); }
.shiftcard[data-state="none"] { border-color: color-mix(in srgb, var(--shift-alert, #ef4444) 32%, transparent); color: var(--shift-alert, #ef4444); background: var(--shift-alert-soft, rgba(239,68,68,0.13)); }
.shiftcard[data-state="off"] { border-color: color-mix(in srgb, var(--shift-ember, #fb923c) 36%, transparent); color: var(--shift-ember-strong, #ea580c); background: var(--shift-warn-soft, rgba(251,146,60,0.14)); }
.shiftcard[data-state="off"] :deep(svg) { color: var(--shift-ember-strong, #ea580c); }
.shiftcard[data-state="loading"] { color: var(--shift-amber, #fbbf24); }
.sc-code { font-family: var(--shift-mono); font-size: 11px; font-weight: 800; padding: 1px 6px; border-radius: 5px; background: rgba(52,211,153,0.18); }
.sc-name { color: var(--shift-text-2, #c2c8d2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.sw-row { display: grid; grid-template-columns: 1fr 1.4fr; gap: 14px; }
.sw-warn { display: flex; align-items: center; gap: 7px; margin: 0; padding: 9px 12px; border-radius: 10px; font-size: 12px;
  color: var(--shift-alert, #ef4444); background: var(--shift-alert-soft, rgba(239,68,68,0.13));
  border: 1px solid color-mix(in srgb, var(--shift-alert, #ef4444) 30%, transparent); }

.sw-foot { flex: 1; font-size: 11px; color: var(--shift-text-dim, #5f6675); }
.sw-ghost { padding: 9px 15px; border-radius: 10px; border: 1px solid var(--shift-border-soft, rgba(255,255,255,0.06)); background: transparent;
  color: var(--shift-text-2, #c2c8d2); cursor: pointer; font-size: 13px; font-weight: 600; transition: border-color 0.18s, color 0.18s; }
.sw-ghost:hover { border-color: var(--shift-border, rgba(251,191,36,0.13)); color: var(--shift-text, #f4f6fa); }
.sw-primary { padding: 9px 17px; border-radius: 10px; border: none; cursor: pointer; font-size: 13px; font-weight: 700;
  background: var(--shift-grad-cta, linear-gradient(135deg,#fbbf24,#f59e0b 52%,#ea580c)); color: #1f1408;
  display: inline-flex; align-items: center; gap: 7px; transition: transform 0.2s, box-shadow 0.2s; }
.sw-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(234,88,12,0.3); }
.sw-primary:disabled { opacity: 0.5; cursor: default; }
.spin :deep(svg), .spin { animation: shift-spin 0.85s linear infinite; }

.sw-fade-enter-active, .sw-fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.sw-fade-enter-from, .sw-fade-leave-to { opacity: 0; transform: translateY(-4px); }

@keyframes pv-sheen { to { background-position: -220% 0; } }
@keyframes pv-rock { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-14deg); } 75% { transform: rotate(14deg); } }
@keyframes pv-pulse { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(1.9); opacity: 0; } }

@media (max-width: 560px) {
  .sw-pair { grid-template-columns: 1fr; }
  .sw-swap-ic { transform: rotate(90deg); justify-self: center; margin-top: 0; }
  .sw-row { grid-template-columns: 1fr; }
  .sw-preview { grid-template-columns: 1fr; gap: 10px; }
  .pv-party.right { justify-content: flex-start; }
  .pv-id.ar { align-items: flex-start; }
}
@media (prefers-reduced-motion: reduce) { .pv-shimmer, .pv-core-ic, .pv-core-ring { animation: none !important; } }

/* ════════════════ LIGHT THEME OVERRIDES ════════════════ */
[data-theme="light"] .sw-preview { background: rgba(255,250,240,0.7); border-color: rgba(40,32,20,0.10); }
[data-theme="light"] .pv-chip { background: rgba(40,32,20,0.08); }
[data-theme="light"] .sw-swap-ic, [data-theme="light"] .pv-core-ic { background: rgba(217,119,6,0.12); }
[data-theme="light"] .sc-code { background: rgba(5,150,105,0.18); }
</style>
