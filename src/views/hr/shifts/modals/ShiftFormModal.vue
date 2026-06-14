<template>
  <OnbModal
    :open="open"
    :title="editing ? 'Update shift template' : 'New shift template'"
    :subtitle="stepSubtitle"
    :icon="CalendarClock"
    :width="940"
    @close="$emit('close')"
  >
    <div class="wz">
      <!-- ════════ STEPPER RAIL ════════ -->
      <nav class="wz-steps" aria-label="Wizard steps">
        <div class="wz-steps-line"><span class="wz-steps-fill" :style="{ width: fillPct + '%' }" /></div>
        <button v-for="(st, i) in STEPS" :key="st.key" type="button" class="wz-step"
          :class="{ active: i === step, done: i < step, ahead: i > step, invalid: i < step && !stepValid(i) }"
          :disabled="i > maxReached" @click="goto(i)">
          <span class="wz-step-dot">
            <component :is="i < step ? Check : st.icon" :size="14" />
          </span>
          <span class="wz-step-label">{{ st.label }}</span>
        </button>
      </nav>

      <div class="wz-body">
        <!-- ════════ STEP CONTENT ════════ -->
        <div class="wz-pane">
          <transition :name="`wz-${dir}`" mode="out-in">
            <div :key="step" class="wz-step-content">

              <!-- STEP 0 — IDENTITY -->
              <div v-if="step === 0" class="wz-fields">
                <p class="wz-lead">Give the blueprint a unique code and a human name. The code is referenced in rosters, audit logs and the daily rollup.</p>
                <div class="sf-row tri">
                  <label class="sf-field">
                    <span>Code <em>*</em></span>
                    <input v-model="form.code" placeholder="NIGHT-22-06" class="sf-input mono" :disabled="editing" @input="form.code = form.code.toUpperCase()" />
                    <small v-if="editing" class="sf-note">Code is locked after creation</small>
                  </label>
                  <label class="sf-field">
                    <span>Name <em>*</em></span>
                    <input v-model="form.name" placeholder="Night Shift" class="sf-input" />
                  </label>
                  <label class="sf-field">
                    <span>Type</span>
                    <HrSelect :model-value="form.shift_type" :options="shiftTypeOptions" @update:model-value="v => form.shift_type = v" />
                  </label>
                </div>
                <label class="sf-field">
                  <span>Description</span>
                  <input v-model="form.description" placeholder="Optional note about who this shift is for" class="sf-input" />
                </label>
                <div class="type-picker">
                  <Motion v-for="(t, ti) in SHIFT_TYPES" :key="t.key" as="button" type="button"
                    class="type-card" :class="{ on: form.shift_type === t.key }" :style="{ '--tc': t.color }"
                    :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ delay: 0.04 * ti, duration: 0.3 }"
                    :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="form.shift_type = t.key">
                    <span class="type-swatch" />
                    {{ t.label }}
                  </Motion>
                </div>
              </div>

              <!-- STEP 1 — TIMING -->
              <div v-else-if="step === 1" class="wz-fields">
                <p class="wz-lead">Set the working window and day-hour thresholds. Overnight shifts (end ≤ start) are detected automatically.</p>
                <div class="sf-row quad">
                  <label class="sf-field"><span>Start <em>*</em></span><input v-model="form.start_time" type="time" class="sf-input mono" /></label>
                  <label class="sf-field"><span>End <em>*</em></span><input v-model="form.end_time" type="time" class="sf-input mono" /></label>
                  <label class="sf-field"><span>Half-day hrs</span><input v-model.number="form.half_day_hours" type="number" min="0" step="0.5" class="sf-input mono" /></label>
                  <label class="sf-field"><span>Full-day hrs</span><input v-model.number="form.full_day_hours" type="number" min="0" step="0.5" class="sf-input mono" /></label>
                </div>
                <label class="sf-field">
                  <span>Weekly off days</span>
                  <div class="dow-row">
                    <Motion v-for="(label, idx) in DOW_LABELS" :key="idx" as="button" type="button"
                      class="dow-pill" :class="{ active: form.weekly_off_days.includes(idx) }"
                      :whileTap="{ scale: 0.88 }" @click="toggleDow(idx)">{{ label }}</Motion>
                  </div>
                </label>
                <label class="sf-toggle">
                  <input type="checkbox" v-model="form.night_allowance" />
                  <span class="tg-track"><span class="tg-knob" /></span>
                  <span class="tg-text"><Moon :size="13" /> Night allowance applicable</span>
                </label>
              </div>

              <!-- STEP 2 — POLICY -->
              <div v-else-if="step === 2" class="wz-fields">
                <p class="wz-lead">Define how lateness is handled. When enabled, punches beyond the threshold are blocked from self-service and routed to an admin for approval.</p>
                <label class="sf-toggle big">
                  <input type="checkbox" v-model="form.late_punch_requires_approval" />
                  <span class="tg-track"><span class="tg-knob" /></span>
                  <span class="tg-text"><ShieldCheck :size="14" /> Block self-punch beyond threshold — route to admin approval</span>
                </label>
                <div class="sf-row tri">
                  <label class="sf-field"><span>Grace (min)</span><input v-model.number="form.grace_minutes" type="number" min="0" class="sf-input mono" /></label>
                  <label class="sf-field"><span>Self-punch threshold</span><input v-model.number="form.late_self_punch_threshold_minutes" type="number" min="0" class="sf-input mono" :disabled="!form.late_punch_requires_approval" /></label>
                  <label class="sf-field"><span>Half-day grace</span><input v-model.number="form.half_day_grace_minutes" type="number" min="0" class="sf-input mono" /></label>
                </div>
                <div class="policy-hint">
                  <Hourglass :size="14" />
                  <p>A punch within <b>{{ form.grace_minutes }} min</b> of start is on-time.
                    <template v-if="form.late_punch_requires_approval">Beyond <b>{{ form.late_self_punch_threshold_minutes }} min</b> late, employees must request approval.</template>
                    <template v-else>Late punches are recorded but not blocked.</template>
                  </p>
                </div>
              </div>

              <!-- STEP 3 — BREAKS -->
              <div v-else-if="step === 3" class="wz-fields">
                <p class="wz-lead">Set the daily break allowance and optionally restrict it to named windows. Windows appear on the blueprint timeline as hatched bands.</p>
                <div class="sf-row tri">
                  <label class="sf-field"><span>Total break / day (min)</span><input v-model.number="form.break_minutes" type="number" min="0" class="sf-input mono" /></label>
                  <label class="sf-field"><span>Overrun alert (min)</span><input v-model.number="form.break_overrun_alert_minutes" type="number" min="0" class="sf-input mono" /></label>
                  <label class="sf-field"><span>&nbsp;</span><button type="button" class="sf-ghost" @click="addBreakWindow"><Plus :size="13" />Add window</button></label>
                </div>
                <p v-if="!form.break_windows.length" class="sf-hint">No break windows — employees may break anytime under the daily cap. Add named windows (e.g. Lunch 13:00–14:00) to restrict timing.</p>
                <div class="bw-list">
                  <Motion v-for="(bw, idx) in form.break_windows" :key="idx" as="div" class="bw-row"
                    :initial="{ opacity: 0, x: -10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.3 }">
                    <input v-model="bw.label" placeholder="Label" class="sf-input bw-label" />
                    <input v-model="bw.start_time" type="time" class="sf-input bw-time mono" />
                    <span class="bw-dash">→</span>
                    <input v-model="bw.end_time" type="time" class="sf-input bw-time mono" />
                    <input v-model.number="bw.max_minutes" type="number" min="1" max="240" class="sf-input bw-max mono" placeholder="max" />
                    <button type="button" class="bw-del" @click="form.break_windows.splice(idx, 1)"><X :size="13" /></button>
                  </Motion>
                </div>
              </div>

              <!-- STEP 4 — REVIEW -->
              <div v-else class="wz-fields">
                <p class="wz-lead">Confirm the blueprint. {{ editing ? 'Saving rolls the changes into the daily attendance summary.' : 'On create it becomes available to assign to employees.' }}</p>
                <div class="rv-grid">
                  <div class="rv-item"><span>Code</span><b class="mono">{{ form.code || '—' }}</b></div>
                  <div class="rv-item"><span>Name</span><b>{{ form.name || '—' }}</b></div>
                  <div class="rv-item"><span>Type</span><b>{{ typeLabel }}</b></div>
                  <div class="rv-item"><span>Window</span><b class="mono">{{ form.start_time }} → {{ form.end_time }}</b></div>
                  <div class="rv-item"><span>Length</span><b class="mono">{{ lengthHrs }} h</b></div>
                  <div class="rv-item"><span>Off days</span><b>{{ offSummary }}</b></div>
                  <div class="rv-item"><span>Grace</span><b class="mono">{{ form.grace_minutes }} min</b></div>
                  <div class="rv-item"><span>Approval</span><b>{{ form.late_punch_requires_approval ? 'Required' : 'Off' }}</b></div>
                  <div class="rv-item"><span>Break / day</span><b class="mono">{{ form.break_minutes }} min</b></div>
                  <div class="rv-item"><span>Windows</span><b>{{ form.break_windows.length || 'Flexible' }}</b></div>
                  <div class="rv-item"><span>Night</span><b>{{ form.night_allowance ? 'Yes' : 'No' }}</b></div>
                </div>
              </div>

            </div>
          </transition>
        </div>

        <!-- ════════ LIVE BLUEPRINT PREVIEW ════════ -->
        <aside class="wz-preview">
          <div class="pv-tag">Live preview</div>
          <div class="pv-card" :style="{ '--accent': typeColor }">
            <header class="pv-head">
              <span class="pv-code mono">{{ form.code || 'CODE' }}</span>
              <span class="pv-type">{{ typeLabel }}</span>
            </header>
            <h4 class="pv-name">{{ form.name || 'Untitled shift' }}</h4>

            <div class="pv-timeline">
              <div class="pv-track">
                <span class="pv-grid" aria-hidden="true" />
                <div class="pv-bar" :class="{ overnight: isOvernight }" :style="{ left: barLeft + '%', width: barWidth + '%' }">
                  <span class="mono">{{ shortTime(form.start_time) }}</span>
                  <span class="mono">{{ shortTime(form.end_time) }}</span>
                </div>
                <span v-for="(bw, bi) in validWindows" :key="bi" class="pv-break"
                  :style="{ left: hourPct(bw.start_time) + '%', width: durationPct(bw.start_time, bw.end_time) + '%' }" />
              </div>
              <div class="pv-ruler"><span v-for="h in [0,6,12,18,24]" :key="h">{{ String(h).padStart(2,'0') }}</span></div>
            </div>

            <div class="pv-stats">
              <div class="pv-stat"><span>Length</span><b class="mono">{{ lengthHrs }}h</b></div>
              <div class="pv-stat"><span>Break</span><b class="mono">{{ form.break_minutes }}m</b></div>
              <div class="pv-stat"><span>Grace</span><b class="mono">{{ form.grace_minutes }}m</b></div>
            </div>

            <div class="pv-chips">
              <span v-if="form.late_punch_requires_approval" class="pv-chip"><ShieldCheck :size="10" /> Approval</span>
              <span v-if="form.night_allowance" class="pv-chip"><Moon :size="10" /> Night</span>
              <span v-if="validWindows.length" class="pv-chip">{{ validWindows.length }} window{{ validWindows.length>1?'s':'' }}</span>
              <span class="pv-chip ghost">{{ offSummary }}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>

    <template #footer>
      <span class="wz-foot-note">Step {{ step + 1 }} of {{ STEPS.length }} · {{ editing ? 'Editing' : 'Creating' }}</span>
      <button v-if="step > 0" class="sf-ghost" @click="back"><ChevronLeft :size="14" />Back</button>
      <button v-else class="sf-ghost" @click="$emit('close')">Cancel</button>

      <button v-if="step < STEPS.length - 1" class="sf-primary" :disabled="!stepValid(step)" @click="next">
        Next<ChevronRight :size="14" />
      </button>
      <button v-else class="sf-primary" :disabled="!isValid || saving" @click="submit">
        <CheckCircle2 v-if="!saving" :size="14" /><Loader2 v-else :size="14" class="spin" />
        {{ saving ? 'Saving…' : (editing ? 'Save changes' : 'Create shift') }}
      </button>
    </template>
  </OnbModal>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  CalendarClock, Moon, ShieldCheck, Plus, X, CheckCircle2, Loader2, Hourglass,
  Check, ChevronLeft, ChevronRight, Fingerprint, Clock, Coffee, ClipboardCheck,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import OnbModal from '../../onboarding/components/OnbModal.vue'
import HrSelect from '@/components/hr/forms/HrSelect.vue'
import {
  createShift, patchShift, DOW_LABELS, DOW_FULL, SHIFT_TYPES,
  shiftTypeMeta, shortTime, hourPct, durationPct,
} from '@/composables/useShifts'

const shiftTypeOptions = SHIFT_TYPES.map(t => ({ value: t.key, label: t.label }))

const props = defineProps({
  open: { type: Boolean, default: false },
  shift: { type: Object, default: null },
})
const emit = defineEmits(['close', 'saved'])
const toast = useToast()

const STEPS = [
  { key: 'identity', label: 'Identity', icon: Fingerprint },
  { key: 'timing',   label: 'Timing',   icon: Clock },
  { key: 'policy',   label: 'Policy',    icon: ShieldCheck },
  { key: 'breaks',   label: 'Breaks',    icon: Coffee },
  { key: 'review',   label: 'Review',    icon: ClipboardCheck },
]

const editing = computed(() => !!props.shift?.id)
const saving = ref(false)
const step = ref(0)
const maxReached = ref(0)
const dir = ref('fwd')

const blank = () => ({
  code: '', name: '', shift_type: 'GENERAL', start_time: '09:00', end_time: '18:00',
  break_minutes: 60, grace_minutes: 10, half_day_grace_minutes: 10,
  half_day_hours: 4, full_day_hours: 8, weekly_off_days: [5, 6],
  night_allowance: false, description: '', break_windows: [],
  late_punch_requires_approval: true, late_self_punch_threshold_minutes: 15, break_overrun_alert_minutes: 10,
})
const form = reactive(blank())

watch(() => props.open, (o) => {
  if (!o) return
  step.value = 0
  maxReached.value = 0
  dir.value = 'fwd'
  if (props.shift?.id) {
    const s = props.shift
    Object.assign(form, {
      code: s.code, name: s.name, shift_type: s.shift_type,
      start_time: (s.start_time || '').slice(0, 5), end_time: (s.end_time || '').slice(0, 5),
      break_minutes: s.break_minutes ?? 60, grace_minutes: s.grace_minutes ?? 10,
      half_day_grace_minutes: s.half_day_grace_minutes ?? 10,
      half_day_hours: Number(s.half_day_hours ?? 4), full_day_hours: Number(s.full_day_hours ?? 8),
      weekly_off_days: Array.isArray(s.weekly_off_days) ? [...s.weekly_off_days] : [5, 6],
      night_allowance: !!s.night_allowance, description: s.description || '',
      break_windows: Array.isArray(s.break_windows) ? s.break_windows.map(w => ({ ...w })) : [],
      late_punch_requires_approval: s.late_punch_requires_approval ?? true,
      late_self_punch_threshold_minutes: s.late_self_punch_threshold_minutes ?? 15,
      break_overrun_alert_minutes: s.break_overrun_alert_minutes ?? 10,
    })
  } else {
    Object.assign(form, blank())
  }
}, { immediate: true })

/* ── per-step validation ─────────────────────────────────────────────────── */
const stepValid = (i) => {
  if (i === 0) return !!(form.code && form.name)
  if (i === 1) return !!(form.start_time && form.end_time)
  if (i === 3) return form.break_windows.every(w => w.label && w.start_time && w.end_time && w.max_minutes > 0)
  return true
}
const isValid = computed(() => stepValid(0) && stepValid(1) && stepValid(3))
const fillPct = computed(() => STEPS.length <= 1 ? 0 : (step.value / (STEPS.length - 1)) * 100)

const stepSubtitle = computed(() => {
  const subs = [
    'Identity — code, name and shift type',
    'Timing — working window and day hours',
    'Late-punch policy and grace windows',
    'Break allowance and named windows',
    editing.value ? 'Review and save changes' : 'Review and create the blueprint',
  ]
  return subs[step.value] || ''
})

const next = () => {
  if (!stepValid(step.value)) return
  if (step.value < STEPS.length - 1) { dir.value = 'fwd'; step.value++; maxReached.value = Math.max(maxReached.value, step.value) }
}
const back = () => { if (step.value > 0) { dir.value = 'back'; step.value-- } }
const goto = (i) => { if (i > maxReached.value) return; dir.value = i > step.value ? 'fwd' : 'back'; step.value = i }

/* ── preview computeds ───────────────────────────────────────────────────── */
const toMin = (t) => { if (!t) return 0; const [h, m] = String(t).split(':').map(Number); return (h || 0) * 60 + (m || 0) }
const isOvernight = computed(() => toMin(form.end_time) <= toMin(form.start_time))
const lengthHrs = computed(() => { let a = toMin(form.start_time), b = toMin(form.end_time); if (b <= a) b += 1440; return +((b - a) / 60).toFixed(1) })
const barLeft = computed(() => hourPct(form.start_time))
const barWidth = computed(() => Math.max(4, durationPct(form.start_time, form.end_time)))
const typeColor = computed(() => shiftTypeMeta(form.shift_type).color)
const typeLabel = computed(() => shiftTypeMeta(form.shift_type).label)
const validWindows = computed(() => form.break_windows.filter(w => w.start_time && w.end_time))
const offSummary = computed(() => {
  if (!form.weekly_off_days.length) return 'No off day'
  return form.weekly_off_days.map(d => DOW_FULL[d]).join(', ')
})

const toggleDow = (idx) => {
  const i = form.weekly_off_days.indexOf(idx)
  if (i >= 0) form.weekly_off_days.splice(i, 1); else form.weekly_off_days.push(idx)
}
const addBreakWindow = () => form.break_windows.push({ label: 'Lunch', start_time: '13:00', end_time: '14:00', max_minutes: 30 })

const buildPayload = () => ({
  code: form.code.trim(), name: form.name.trim(), shift_type: form.shift_type,
  start_time: form.start_time, end_time: form.end_time,
  break_minutes: Number(form.break_minutes) || 0, grace_minutes: Number(form.grace_minutes) || 0,
  half_day_grace_minutes: Number(form.half_day_grace_minutes) || 0,
  half_day_hours: Number(form.half_day_hours) || 0, full_day_hours: Number(form.full_day_hours) || 0,
  weekly_off_days: [...form.weekly_off_days], night_allowance: !!form.night_allowance,
  description: form.description || null,
  break_windows: form.break_windows.map(w => ({ label: w.label.trim(), start_time: w.start_time, end_time: w.end_time, max_minutes: Number(w.max_minutes) || 1 })),
  late_punch_requires_approval: !!form.late_punch_requires_approval,
  late_self_punch_threshold_minutes: Number(form.late_self_punch_threshold_minutes) || 0,
  break_overrun_alert_minutes: Number(form.break_overrun_alert_minutes) || 0,
})

const submit = async () => {
  if (!isValid.value) { toast.warning('Please complete the required fields'); return }
  saving.value = true
  try {
    const payload = buildPayload()
    if (editing.value) {
      const { code, ...editable } = payload
      await patchShift(props.shift.id, editable)
      toast.success('Shift updated')
    } else {
      await createShift(payload)
      toast.success('Shift created')
    }
    emit('saved')
    emit('close')
  } catch (e) {
    toast.error(e?.response?.data?.detail || (editing.value ? 'Could not update' : 'Could not create shift'))
  } finally { saving.value = false }
}
</script>

<style scoped>
.wz { display: flex; flex-direction: column; gap: 18px; }

/* ════════ STEPPER ════════ */
.wz-steps { position: relative; display: flex; justify-content: space-between; gap: 4px; }
.wz-steps-line { position: absolute; left: 18px; right: 18px; top: 15px; height: 2px; background: var(--shift-border-soft); border-radius: 2px; z-index: 0; }
.wz-steps-fill { display: block; height: 100%; border-radius: 2px; background: var(--shift-grad-cta); transition: width 0.45s var(--shift-ease); box-shadow: 0 0 10px -2px var(--shift-amber); }
.wz-step { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 7px; flex: 1; background: none; border: 0; cursor: pointer; padding: 0; }
.wz-step:disabled { cursor: default; }
.wz-step-dot { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%;
  background: var(--shift-surface-2); border: 1.5px solid var(--shift-border-soft); color: var(--shift-text-dim);
  transition: all 0.3s var(--shift-spring); }
.wz-step.active .wz-step-dot { background: var(--shift-grad-cta); border-color: transparent; color: #1f1408; box-shadow: 0 0 0 5px rgba(251,191,36,0.14), 0 6px 16px -6px var(--shift-amber); transform: scale(1.08); }
.wz-step.done .wz-step-dot { background: var(--shift-ok-soft); border-color: color-mix(in srgb, var(--shift-ok) 40%, transparent); color: var(--shift-ok); }
.wz-step.invalid .wz-step-dot { border-color: var(--shift-alert); color: var(--shift-alert); }
.wz-step-label { font-size: 10.5px; font-weight: 700; letter-spacing: 0.03em; color: var(--shift-text-dim); transition: color 0.25s; font-family: var(--shift-mono); text-transform: uppercase; }
.wz-step.active .wz-step-label { color: var(--shift-amber); }
.wz-step.done .wz-step-label { color: var(--shift-text-2); }

/* ════════ BODY: content + preview ════════ */
.wz-body { display: grid; grid-template-columns: 1fr 300px; gap: 20px; align-items: start; }
.wz-pane { min-width: 0; min-height: 280px; }
.wz-step-content { min-height: 280px; }
.wz-fields { display: flex; flex-direction: column; gap: 14px; }
.wz-lead { margin: 0; font-size: 12.5px; line-height: 1.6; color: var(--shift-text-muted); }

.sf-row { display: grid; gap: 12px; }
.sf-row.tri { grid-template-columns: 1fr 1fr 1fr; }
.sf-row.quad { grid-template-columns: 1fr 1fr 1fr 1fr; }
.sf-field { display: flex; flex-direction: column; gap: 5px; }
.sf-field > span { font-size: 11px; color: var(--shift-text-muted); }
.sf-field em { color: var(--shift-amber); font-style: normal; }
.sf-note { font-size: 10px; color: var(--shift-text-dim); }
.sf-input { background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); border-radius: 10px; padding: 9px 11px;
  color: var(--shift-text); font: inherit; font-size: 13px; transition: border-color 0.2s, box-shadow 0.2s; }
.sf-input.mono { font-family: var(--shift-mono); }
.sf-input:focus { outline: none; border-color: var(--shift-amber); box-shadow: 0 0 0 3px rgba(251,191,36,0.1); }
.sf-input:disabled { opacity: 0.55; cursor: not-allowed; }
/* strip native number-input spinner arrows for a clean corporate look */
.sf-input[type="number"] { -moz-appearance: textfield; appearance: textfield; }
.sf-input[type="number"]::-webkit-outer-spin-button,
.sf-input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; appearance: none; margin: 0; }

.type-picker { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 4px; }
.type-card { display: flex; align-items: center; gap: 7px; padding: 9px 11px; border-radius: 11px; cursor: pointer; font-size: 12px; font-weight: 600;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); }
.type-card.on { border-color: var(--tc); color: var(--shift-text); background: color-mix(in srgb, var(--tc) 10%, transparent); }
.type-swatch { width: 11px; height: 11px; border-radius: 4px; background: var(--tc); box-shadow: 0 0 8px -1px var(--tc); }

.dow-row { display: flex; gap: 7px; }
.dow-pill { width: 38px; height: 36px; border-radius: 10px; border: 1px solid var(--hr-input-border); background: var(--hr-input-bg);
  color: var(--shift-text-muted); cursor: pointer; font-size: 11px; font-weight: 700; }
.dow-pill.active { background: var(--shift-grad-cta); color: #1f1408; border-color: transparent; box-shadow: 0 4px 12px -5px var(--shift-amber); }

/* toggle */
.sf-toggle { display: flex; align-items: center; gap: 11px; font-size: 12.5px; color: var(--shift-text-2); cursor: pointer; }
.sf-toggle.big { padding: 12px 14px; border-radius: 12px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.sf-toggle input { position: absolute; opacity: 0; pointer-events: none; }
.tg-track { position: relative; width: 38px; height: 22px; border-radius: 999px; background: var(--shift-border-soft); border: 1px solid var(--shift-border-soft); transition: background 0.25s; flex-shrink: 0; }
.tg-knob { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: var(--shift-text-muted); transition: transform 0.25s var(--shift-spring), background 0.25s; }
.sf-toggle input:checked + .tg-track { background: var(--shift-grad-cta); }
.sf-toggle input:checked + .tg-track .tg-knob { transform: translateX(16px); background: #1f1408; }
.tg-text { display: inline-flex; align-items: center; gap: 7px; }

.policy-hint { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border-radius: 12px; background: rgba(251,191,36,0.06); border: 1px solid var(--shift-border); }
.policy-hint svg { color: var(--shift-amber); flex-shrink: 0; margin-top: 1px; }
.policy-hint p { margin: 0; font-size: 12px; line-height: 1.6; color: var(--shift-text-2); }
.policy-hint b { color: var(--shift-amber); font-family: var(--shift-mono); }

.sf-hint { margin: 0; font-size: 11.5px; color: var(--shift-text-dim); line-height: 1.5; }
.bw-list { display: flex; flex-direction: column; gap: 8px; }
.bw-row { display: flex; align-items: center; gap: 8px; }
.bw-label { flex: 1; } .bw-time { width: 108px; } .bw-max { width: 70px; }
.bw-dash { color: var(--shift-text-dim); }
.bw-del { width: 32px; height: 32px; border-radius: 9px; border: 1px solid var(--shift-alert-soft); background: var(--shift-alert-soft); color: var(--shift-alert); cursor: pointer; display: grid; place-items: center; flex-shrink: 0; }

/* review grid */
.rv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.rv-item { display: flex; flex-direction: column; gap: 3px; padding: 10px 12px; border-radius: 11px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.rv-item span { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--shift-text-dim); font-family: var(--shift-mono); }
.rv-item b { font-size: 13px; color: var(--shift-text); font-weight: 700; }

/* ════════ LIVE PREVIEW ════════ */
.wz-preview { position: sticky; top: 0; }
.pv-tag { font-size: 9.5px; font-family: var(--shift-mono); text-transform: uppercase; letter-spacing: 0.12em; color: var(--shift-amber-strong); margin-bottom: 8px; display: inline-flex; align-items: center; gap: 6px; }
.pv-tag::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--shift-ok); box-shadow: 0 0 6px var(--shift-ok); animation: shift-ring-pulse 2.2s ease-out infinite; }
.pv-card { position: relative; display: flex; flex-direction: column; gap: 12px; padding: 16px; border-radius: 18px;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border); overflow: hidden; }
.pv-card::before { content: ''; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(120% 80% at 0% 0%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 60%); }
.pv-card > * { position: relative; z-index: 1; }
.pv-head { display: flex; align-items: center; justify-content: space-between; }
.pv-code { font-size: 12px; font-weight: 700; color: var(--shift-text); padding: 3px 8px; border-radius: 6px; background: color-mix(in srgb, var(--accent) 12%, transparent); border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent); }
.pv-type { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--accent); }
.pv-name { margin: 0; font-size: 15px; font-weight: 700; color: var(--shift-text); }
.pv-timeline { display: flex; flex-direction: column; gap: 5px; }
.pv-track { position: relative; height: 28px; border-radius: 8px; background: rgba(148,163,184,0.10); overflow: hidden; }
.pv-grid { position: absolute; inset: 0; background-image: repeating-linear-gradient(90deg, var(--shift-grid-line) 0, var(--shift-grid-line) 1px, transparent 1px, transparent 25%); }
.pv-bar { position: absolute; top: 3px; bottom: 3px; border-radius: 6px; min-width: 40px; display: flex; align-items: center; justify-content: space-between; padding: 0 6px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 90%, white 10%), var(--accent)); box-shadow: 0 3px 10px -5px var(--accent); transition: left 0.4s var(--shift-ease), width 0.4s var(--shift-ease); }
.pv-bar span { font-family: var(--shift-mono); font-size: 8px; color: #2a1c08; font-weight: 800; }
.pv-bar.overnight { border-top-right-radius: 0; border-bottom-right-radius: 0; }
.pv-break { position: absolute; top: 3px; bottom: 3px; border-radius: 3px; background: repeating-linear-gradient(45deg, rgba(8,8,10,0.4), rgba(8,8,10,0.4) 3px, transparent 3px, transparent 6px); }
.pv-ruler { display: flex; justify-content: space-between; }
.pv-ruler span { font-family: var(--shift-mono); font-size: 7.5px; color: var(--shift-text-dim); }
.pv-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.pv-stat { display: flex; flex-direction: column; gap: 2px; padding: 8px; border-radius: 9px; background: var(--shift-surface); border: 1px solid var(--shift-border-soft); }
.pv-stat span { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--shift-text-dim); }
.pv-stat b { font-size: 13px; color: var(--shift-text); }
.pv-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.pv-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 999px; font-size: 9.5px; font-weight: 700; font-family: var(--shift-mono); text-transform: uppercase;
  color: var(--shift-amber); background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.26); }
.pv-chip.ghost { color: var(--shift-text-muted); background: rgba(148,163,184,0.1); border-color: var(--shift-border-soft); }

/* ════════ FOOTER ════════ */
.wz-foot-note { flex: 1; font-size: 11px; color: var(--shift-text-dim); font-family: var(--shift-mono); }
.sf-ghost { padding: 9px 15px; border-radius: 11px; border: 1px solid var(--shift-border-soft); background: transparent; color: var(--shift-text-2); cursor: pointer; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 5px; transition: 0.18s; }
.sf-ghost:hover { border-color: var(--shift-border); color: var(--shift-text); }
.sf-primary { padding: 9px 18px; border-radius: 11px; border: none; cursor: pointer; font-size: 13px; font-weight: 700;
  background: var(--shift-grad-cta); color: #1f1408; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 8px 22px -10px rgba(245,158,11,0.7); transition: 0.2s; }
.sf-primary:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.spin :deep(svg), .spin { animation: shift-spin 0.9s linear infinite; }

/* ════════ STEP TRANSITIONS ════════ */
.wz-fwd-enter-active, .wz-fwd-leave-active, .wz-back-enter-active, .wz-back-leave-active { transition: opacity 0.3s var(--shift-ease), transform 0.3s var(--shift-ease); }
.wz-fwd-enter-from { opacity: 0; transform: translateX(26px); }
.wz-fwd-leave-to { opacity: 0; transform: translateX(-26px); }
.wz-back-enter-from { opacity: 0; transform: translateX(-26px); }
.wz-back-leave-to { opacity: 0; transform: translateX(26px); }
@media (prefers-reduced-motion: reduce) {
  .wz-fwd-enter-from, .wz-fwd-leave-to, .wz-back-enter-from, .wz-back-leave-to { transform: none; }
}

@media (max-width: 760px) {
  .wz-body { grid-template-columns: 1fr; }
  .wz-preview { position: static; order: -1; }
  .sf-row.tri, .sf-row.quad { grid-template-columns: 1fr 1fr; }
  .type-picker { grid-template-columns: 1fr 1fr; }
  .wz-step-label { display: none; }
}

/* ════════ LIGHT THEME ════════ */
[data-theme="light"] .pv-bar span, [data-theme="light"] .pv-bar.overnight span { color: #2a1c08; }
[data-theme="light"] .pv-break { background: repeating-linear-gradient(45deg, rgba(40,28,12,0.3), rgba(40,28,12,0.3) 3px, transparent 3px, transparent 6px); }
[data-theme="light"] .pv-track, [data-theme="light"] .tg-track { background: rgba(40,32,20,0.1); }
[data-theme="light"] .sf-toggle input:checked + .tg-track { background: var(--shift-grad-cta); }
</style>
