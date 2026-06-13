<template>
  <OnbModal
    :open="open"
    :title="editing ? 'Update shift template' : 'New shift template'"
    :subtitle="editing ? 'Saving rolls into the daily attendance summary' : 'Reusable blueprint — timing, break windows, late-punch policy'"
    :icon="CalendarClock"
    :width="800"
    @close="$emit('close')"
  >
    <div class="sf-grid">
      <!-- IDENTITY -->
      <fieldset class="sf-block">
        <legend>Identity</legend>
        <div class="sf-row tri">
          <label class="sf-field">
            <span>Code <em>*</em></span>
            <input v-model="form.code" placeholder="NIGHT-22-06" class="sf-input" :disabled="editing" />
          </label>
          <label class="sf-field">
            <span>Name <em>*</em></span>
            <input v-model="form.name" placeholder="Night Shift" class="sf-input" />
          </label>
          <label class="sf-field">
            <span>Type</span>
            <select v-model="form.shift_type" class="sf-input">
              <option value="GENERAL">General</option>
              <option value="NIGHT">Night</option>
              <option value="ROTATIONAL">Rotational</option>
              <option value="FLEXIBLE">Flexible</option>
            </select>
          </label>
        </div>
        <label class="sf-field">
          <span>Description</span>
          <input v-model="form.description" placeholder="Optional note about who this shift is for" class="sf-input" />
        </label>
      </fieldset>

      <!-- TIMING -->
      <fieldset class="sf-block">
        <legend>Timing &amp; day hours</legend>
        <div class="sf-row quad">
          <label class="sf-field"><span>Start <em>*</em></span><input v-model="form.start_time" type="time" class="sf-input" /></label>
          <label class="sf-field"><span>End <em>*</em></span><input v-model="form.end_time" type="time" class="sf-input" /></label>
          <label class="sf-field"><span>Half-day hrs</span><input v-model.number="form.half_day_hours" type="number" min="0" step="0.5" class="sf-input" /></label>
          <label class="sf-field"><span>Full-day hrs</span><input v-model.number="form.full_day_hours" type="number" min="0" step="0.5" class="sf-input" /></label>
        </div>
        <label class="sf-field">
          <span>Weekly off days</span>
          <div class="dow-row">
            <button type="button" v-for="(label, idx) in DOW_LABELS" :key="idx"
              class="dow-pill" :class="{ active: form.weekly_off_days.includes(idx) }" @click="toggleDow(idx)">{{ label }}</button>
          </div>
        </label>
        <label class="sf-toggle">
          <input type="checkbox" v-model="form.night_allowance" />
          <span><Moon :size="12" /> Night allowance applicable</span>
        </label>
      </fieldset>

      <!-- LATE-PUNCH -->
      <fieldset class="sf-block">
        <legend>Late-punch policy</legend>
        <label class="sf-toggle">
          <input type="checkbox" v-model="form.late_punch_requires_approval" />
          <span><ShieldCheck :size="12" /> Block self-punch beyond threshold — route to admin approval</span>
        </label>
        <div class="sf-row tri">
          <label class="sf-field"><span>Grace (min)</span><input v-model.number="form.grace_minutes" type="number" min="0" class="sf-input" /></label>
          <label class="sf-field"><span>Self-punch threshold</span><input v-model.number="form.late_self_punch_threshold_minutes" type="number" min="0" class="sf-input" :disabled="!form.late_punch_requires_approval" /></label>
          <label class="sf-field"><span>Half-day grace</span><input v-model.number="form.half_day_grace_minutes" type="number" min="0" class="sf-input" /></label>
        </div>
      </fieldset>

      <!-- BREAKS -->
      <fieldset class="sf-block">
        <legend>Breaks</legend>
        <div class="sf-row tri">
          <label class="sf-field"><span>Total break / day (min)</span><input v-model.number="form.break_minutes" type="number" min="0" class="sf-input" /></label>
          <label class="sf-field"><span>Overrun alert (min)</span><input v-model.number="form.break_overrun_alert_minutes" type="number" min="0" class="sf-input" /></label>
          <label class="sf-field"><span>&nbsp;</span><button type="button" class="sf-ghost" @click="addBreakWindow"><Plus :size="13" />Add window</button></label>
        </div>
        <p v-if="!form.break_windows.length" class="sf-hint">No break windows — employees may break anytime under the daily cap. Add named windows (e.g. Lunch 13:00–14:00) to restrict timing.</p>
        <div class="bw-list">
          <Motion v-for="(bw, idx) in form.break_windows" :key="idx" as="div" class="bw-row"
            :initial="{ opacity: 0, x: -8 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.3 }">
            <input v-model="bw.label" placeholder="Label" class="sf-input bw-label" />
            <input v-model="bw.start_time" type="time" class="sf-input bw-time" />
            <span class="bw-dash">→</span>
            <input v-model="bw.end_time" type="time" class="sf-input bw-time" />
            <input v-model.number="bw.max_minutes" type="number" min="1" max="240" class="sf-input bw-max" placeholder="max" />
            <button type="button" class="bw-del" @click="form.break_windows.splice(idx, 1)"><X :size="13" /></button>
          </Motion>
        </div>
      </fieldset>
    </div>

    <template #footer>
      <span class="sf-foot-note">{{ editing ? 'Editing template' : 'Creating template' }}</span>
      <button class="sf-ghost" @click="$emit('close')">Cancel</button>
      <button class="sf-primary" :disabled="!isValid || saving" @click="submit">
        <CheckCircle2 v-if="!saving" :size="14" /><Loader2 v-else :size="14" class="spin" />
        {{ saving ? 'Saving…' : (editing ? 'Save changes' : 'Create shift') }}
      </button>
    </template>
  </OnbModal>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { CalendarClock, Moon, ShieldCheck, Plus, X, CheckCircle2, Loader2 } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import OnbModal from '../../onboarding/components/OnbModal.vue'
import { createShift, patchShift, DOW_LABELS } from '@/composables/useShifts'

const props = defineProps({
  open: { type: Boolean, default: false },
  shift: { type: Object, default: null },
})
const emit = defineEmits(['close', 'saved'])
const toast = useToast()

const editing = computed(() => !!props.shift?.id)
const saving = ref(false)

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

const isValid = computed(() => !!(
  form.code && form.name && form.start_time && form.end_time
  && form.break_windows.every(w => w.label && w.start_time && w.end_time && w.max_minutes > 0)
))

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
  if (!isValid.value) return
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
.sf-grid { display: flex; flex-direction: column; gap: 16px; }
.sf-block { border: 1px solid var(--shift-border-soft); border-radius: 14px; padding: 14px 16px 16px; margin: 0; }
.sf-block legend { padding: 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--shift-amber-strong); font-family: var(--shift-mono); }
.sf-row { display: grid; gap: 12px; }
.sf-row.tri { grid-template-columns: 1fr 1fr 1fr; }
.sf-row.quad { grid-template-columns: 1fr 1fr 1fr 1fr; }
.sf-field { display: flex; flex-direction: column; gap: 5px; }
.sf-field > span { font-size: 11px; color: var(--shift-text-muted); }
.sf-field em { color: var(--shift-amber); font-style: normal; }
.sf-input { background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); border-radius: 9px; padding: 8px 10px;
  color: var(--shift-text); font: inherit; font-size: 13px; transition: border-color 0.2s; }
.sf-input:focus { outline: none; border-color: var(--shift-amber); }
.sf-input:disabled { opacity: 0.55; cursor: not-allowed; }
.dow-row { display: flex; gap: 6px; }
.dow-pill { width: 34px; height: 32px; border-radius: 8px; border: 1px solid var(--hr-input-border); background: var(--hr-input-bg);
  color: var(--shift-text-muted); cursor: pointer; font-size: 11px; font-weight: 700; transition: 0.18s; }
.dow-pill.active { background: var(--shift-grad-cta); color: #1f1408; border-color: transparent; }
.sf-toggle { display: flex; align-items: center; gap: 9px; margin-top: 12px; font-size: 12.5px; color: var(--shift-text-2); cursor: pointer; }
.sf-toggle span { display: inline-flex; align-items: center; gap: 6px; }
.sf-hint { margin: 8px 0 0; font-size: 11.5px; color: var(--shift-text-dim); line-height: 1.5; }
.bw-list { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
.bw-row { display: flex; align-items: center; gap: 8px; }
.bw-label { flex: 1; } .bw-time { width: 110px; } .bw-max { width: 72px; }
.bw-dash { color: var(--shift-text-dim); }
.bw-del { width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--shift-alert-soft); background: var(--shift-alert-soft);
  color: var(--shift-alert); cursor: pointer; display: grid; place-items: center; flex-shrink: 0; }
.sf-foot-note { flex: 1; font-size: 11px; color: var(--shift-text-dim); }
.sf-ghost { padding: 9px 15px; border-radius: 10px; border: 1px solid var(--shift-border-soft); background: transparent;
  color: var(--shift-text-2); cursor: pointer; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; }
.sf-ghost:hover { border-color: var(--shift-border); color: var(--shift-text); }
.sf-primary { padding: 9px 17px; border-radius: 10px; border: none; cursor: pointer; font-size: 13px; font-weight: 700;
  background: var(--shift-grad-cta); color: #1f1408; display: inline-flex; align-items: center; gap: 7px; box-shadow: 0 8px 22px -10px rgba(245,158,11,0.7); }
.sf-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.spin :deep(svg), .spin { animation: shift-spin 0.9s linear infinite; }
@media (max-width: 640px) { .sf-row.tri, .sf-row.quad { grid-template-columns: 1fr 1fr; } }
</style>
