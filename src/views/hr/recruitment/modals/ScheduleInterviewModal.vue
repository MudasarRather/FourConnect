<template>
  <RecModal
    :open="open"
    title="Schedule Interview"
    subtitle="Set up an interview for a pipeline candidate"
    :icon="CalendarClock"
    :width="640"
    @close="$emit('close')"
  >
    <form @submit.prevent="onSubmit" class="form">
      <div class="field-block">
        <HrFieldLabel label="Application" required :error="!!errors.application_id" />
        <HrSelect v-model="form.application_id" :options="appOptions" placeholder="Pick application" searchable
                  :error="!!errors.application_id" :error-text="errors.application_id" />
      </div>

      <div class="grid">
        <div class="field-block">
          <HrFieldLabel label="Interview Type" required />
          <HrSelect v-model="form.interview_type" :options="typeOptions" />
        </div>
        <div class="field-block">
          <HrFieldLabel label="Mode" required />
          <HrSelect v-model="form.mode" :options="modeOptions" />
        </div>
        <div class="field-block">
          <HrFieldLabel label="Round" required />
          <HrSelect v-model="form.round" :options="roundOptions" />
        </div>
        <div class="field-block">
          <HrFieldLabel label="Duration (mins)" required :error="!!errors.duration_minutes" />
          <HrNumberInput v-model="form.duration_minutes" :min="10" :max="600" :step-by="15"
                         :error="!!errors.duration_minutes" :error-text="errors.duration_minutes" />
        </div>
      </div>

      <div class="grid dt-grid">
        <div class="field-block">
          <HrFieldLabel label="Interview Date" required :error="!!errors.scheduled_at" />
          <HrDatePicker
            v-model="form.scheduled_date"
            :min="todayIso"
            placeholder="Pick a date"
          />
        </div>
        <div class="field-block">
          <HrFieldLabel label="Interview Time" required :error="!!errors.scheduled_at" />
          <HrSelect
            v-model="form.scheduled_time"
            :options="timeOptions"
            placeholder="Pick a time"
            searchable
          />
        </div>
        <div v-if="errors.scheduled_at" class="dt-error">
          <span class="err">{{ errors.scheduled_at }}</span>
        </div>
      </div>

      <div class="grid">
        <div class="field-block">
          <HrFieldLabel label="Panel" required :error="!!errors.panel_id" />
          <HrSelect v-model="form.panel_id" :options="panelOptions" placeholder="Pick a panel" />
          <div v-if="errors.panel_id" class="field-err">{{ errors.panel_id }}</div>
        </div>
        <div class="field-block">
          <HrFieldLabel label="Meeting Link / Venue" required :error="!!errors.meeting_link" />
          <HrInput v-model="form.meeting_link" placeholder="https://meet.google.com/…"
                   :error="!!errors.meeting_link" :error-text="errors.meeting_link" />
        </div>
      </div>

      <div class="field-block">
        <HrFieldLabel label="Notes" required :error="!!errors.notes" />
        <HrTextarea v-model="form.notes" :rows="2" placeholder="What should interviewers know?" />
        <div v-if="errors.notes" class="field-err">{{ errors.notes }}</div>
      </div>
    </form>

    <template #footer>
      <button class="ghost" @click="$emit('close')">Cancel</button>
      <div class="grow" />
      <button class="primary" :disabled="submitting" @click="onSubmit">
        <Loader2 v-if="submitting" :size="14" class="spin" />
        <CalendarPlus v-else :size="14" />
        Schedule
      </button>
    </template>
  </RecModal>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { CalendarClock, CalendarPlus, Loader2 } from 'lucide-vue-next'
import RecModal from '../components/RecModal.vue'
import HrFieldLabel from '../../../../components/hr/forms/HrFieldLabel.vue'
import HrInput from '../../../../components/hr/forms/HrInput.vue'
import HrSelect from '../../../../components/hr/forms/HrSelect.vue'
import HrTextarea from '../../../../components/hr/forms/HrTextarea.vue'
import HrNumberInput from '../../../../components/hr/forms/HrNumberInput.vue'
import HrDatePicker from '../../../../components/hr/forms/HrDatePicker.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  applications: { type: Array, default: () => [] },
  panels: { type: Array, default: () => [] },
  submitting: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'submit'])

const typeOptions = [
  { value: 'HR',          label: 'HR' },
  { value: 'TECHNICAL',   label: 'Technical' },
  { value: 'MANAGERIAL',  label: 'Managerial' },
  { value: 'CULTURAL',    label: 'Cultural' },
  { value: 'FINAL',       label: 'Final' },
  { value: 'CLIENT',      label: 'Client' },
]
const modeOptions = [
  { value: 'ONLINE',  label: 'Online' },
  { value: 'OFFLINE', label: 'Offline' },
  { value: 'PHONE',   label: 'Phone' },
]
const roundOptions = [
  { value: 'R1',    label: 'Round 1' },
  { value: 'R2',    label: 'Round 2' },
  { value: 'R3',    label: 'Round 3' },
  { value: 'R4',    label: 'Round 4' },
  { value: 'FINAL', label: 'Final' },
]

// Applications whose pipeline is already closed shouldn't be schedulable:
// you can't interview someone who already joined, was rejected, or
// withdrew. Filter them out of the picker rather than relying on the
// caller to do it.
const SCHEDULE_BLOCKED_STAGES = new Set(['JOINED', 'REJECTED', 'WITHDRAWN'])

const appOptions = computed(() =>
  (props.applications || [])
    .filter(a => !SCHEDULE_BLOCKED_STAGES.has(a.current_stage))
    .map(a => ({
      value: a.id,
      label: `${a.candidate_name || '—'} · ${a.position_title || '—'} (${a.application_code})`,
    }))
)
const panelOptions = computed(() =>
  (props.panels || []).map(p => ({ value: p.id, label: p.name }))
)

const blank = () => ({
  application_id: null,
  panel_id: null,
  interview_type: 'HR',
  mode: 'ONLINE',
  round: 'R1',
  scheduled_date: '',
  scheduled_time: '',
  duration_minutes: 60,
  meeting_link: '',
  notes: '',
})

const form = ref(blank())
const errors = reactive({})

const pad = (n) => String(n).padStart(2, '0')

// Min date (today) for the date picker — disallow scheduling in the past
const todayIso = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
})

// Time options in 15-minute increments, formatted as 12-hour with AM/PM
const timeOptions = computed(() => {
  const opts = []
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      const value = `${pad(h)}:${pad(m)}`
      const hour12 = h % 12 === 0 ? 12 : h % 12
      const ampm = h < 12 ? 'AM' : 'PM'
      opts.push({ value, label: `${hour12}:${pad(m)} ${ampm}` })
    }
  }
  return opts
})

watch(() => props.open, (v) => {
  if (v) {
    form.value = blank()
    Object.keys(errors).forEach(k => delete errors[k])
  }
})

const isValidUrl = (s) => {
  if (!s) return true
  try { new URL(s); return true } catch { return false }
}

const onSubmit = () => {
  Object.keys(errors).forEach(k => delete errors[k])
  if (!form.value.application_id) errors.application_id = 'Pick an application'

  let scheduledIso = null
  if (!form.value.scheduled_date || !form.value.scheduled_time) {
    errors.scheduled_at = 'Date and time are required'
  } else {
    const combined = new Date(`${form.value.scheduled_date}T${form.value.scheduled_time}:00`)
    if (Number.isNaN(combined.getTime())) {
      errors.scheduled_at = 'Invalid date or time'
    } else if (combined < new Date()) {
      errors.scheduled_at = 'Cannot schedule in the past'
    } else {
      scheduledIso = combined.toISOString()
    }
  }

  if (!form.value.duration_minutes || Number(form.value.duration_minutes) < 10) {
    errors.duration_minutes = 'Minimum 10 minutes'
  }
  if (!form.value.panel_id) errors.panel_id = 'Panel is required'
  if (!form.value.meeting_link?.trim()) {
    errors.meeting_link = 'Meeting link / venue is required'
  } else if (form.value.mode === 'ONLINE' && !isValidUrl(form.value.meeting_link)) {
    errors.meeting_link = 'Enter a valid URL'
  }
  if (!form.value.notes?.trim()) errors.notes = 'Notes are required'
  if (Object.keys(errors).length) return

  const { scheduled_date, scheduled_time, ...rest } = form.value
  const payload = { ...rest, scheduled_at: scheduledIso }
  for (const [k, v] of Object.entries(payload)) {
    if (v === '' || v === null || v === undefined) delete payload[k]
  }
  emit('submit', payload)
}
</script>

<style scoped>
.form { display: flex; flex-direction: column; gap: 12px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field-block { display: flex; flex-direction: column; gap: 2px; }

.dt-grid { grid-template-columns: 1fr 1fr; }
.dt-error { grid-column: 1 / -1; }
.err { color: var(--hr-input-error); font-size: 11px; margin-top: 4px; display: block; }
.field-err {
  font-size: 11px;
  color: var(--hr-input-error, #f87171);
  margin-top: 2px;
  font-weight: 500;
}

.ghost, .primary {
  display: inline-flex; align-items: center; gap: 6px;
  height: 38px;
  padding: 0 16px;
  border-radius: 10px;
  font-size: 12.5px; font-weight: 700;
  cursor: pointer;
  border: 1px solid var(--hr-border-strong);
  transition: all 0.22s var(--hr-spring);
}
.ghost { background: transparent; color: var(--hr-text-secondary); }
.ghost:hover { background: rgba(255,255,255,0.04); color: var(--hr-text); }
.primary {
  background: var(--hr-gradient-rail-active);
  border-color: var(--hr-accent-gold);
  color: #1a1a1c;
  box-shadow: 0 6px 18px -6px rgba(251, 146, 60, 0.5);
}
.primary:hover:not(:disabled) {
  box-shadow: 0 10px 24px -6px rgba(251, 146, 60, 0.7), 0 0 30px rgba(251, 191, 36, 0.35);
}
.primary:disabled { opacity: 0.5; cursor: not-allowed; }
.grow { flex: 1; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

@media (max-width: 600px) {
  .grid { grid-template-columns: 1fr; }
}
</style>
