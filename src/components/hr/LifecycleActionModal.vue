<template>
  <transition name="lc-modal">
    <div
      v-if="open && template"
      class="lc-modal-backdrop"
      @click.self="onCancel"
      @keydown.esc="onCancel"
      tabindex="-1"
    >
      <div class="lc-modal-card hr-spotlight" ref="cardRef">
        <div class="aurora" aria-hidden="true" />

        <!-- Header -->
        <header class="lc-modal-head" :class="`tone-${template.tone}`">
          <span class="head-icon">
            <component :is="template.icon" :size="16" />
          </span>
          <div class="head-text">
            <h4>{{ template.title }}</h4>
            <p v-if="employee">{{ employee.full_name || employee.user?.full_name || '—' }} · <span class="mono">{{ employee.employee_id }}</span></p>
          </div>
          <button class="close-x" @click="onCancel" aria-label="Close">
            <X :size="16" />
          </button>
        </header>

        <p v-if="template.desc" class="lc-modal-desc">{{ template.desc }}</p>

        <!-- Form -->
        <div class="lc-modal-fields">
          <div
            v-for="f in template.fields"
            :key="f.key"
            class="modal-field"
            :class="{ full: f.full }"
          >
            <HrFieldLabel :label="f.label" :helper="f.helper || ''" :required="!!f.required" :error="!!fieldErrors[f.key]" />
            <HrDatePicker
              v-if="f.type === 'date'"
              v-model="values[f.key]"
              :min="f.min || ''"
              :max="f.max || ''"
              :error="!!fieldErrors[f.key]"
              :error-text="fieldErrors[f.key]"
            />
            <HrTextarea
              v-else-if="f.type === 'textarea'"
              v-model="values[f.key]"
              :rows="f.rows || 3"
              :placeholder="f.placeholder || ''"
              :error="!!fieldErrors[f.key]"
              :error-text="fieldErrors[f.key]"
            />
            <HrSelect
              v-else-if="f.type === 'select'"
              v-model="values[f.key]"
              :options="dynamicOptions(f)"
              :placeholder="f.placeholder || 'Select…'"
              :error="!!fieldErrors[f.key]"
              :error-text="fieldErrors[f.key]"
            />
            <HrSearchCombobox
              v-else-if="f.type === 'user-search'"
              v-model="values[f.key]"
              :search="searchUsers"
              :selected-label="values[`__${f.key}_label`] || ''"
              :placeholder="f.placeholder || 'Search users…'"
              :error="!!fieldErrors[f.key]"
              :error-text="fieldErrors[f.key]"
              @change="(u) => onUserPicked(f.key, u)"
            />
            <HrNumberInput
              v-else-if="f.type === 'number'"
              v-model="values[f.key]"
              :min="f.min ?? 0"
              :step-by="f.step ?? 1000"
              :error="!!fieldErrors[f.key]"
              :error-text="fieldErrors[f.key]"
            />
            <HrRadio
              v-else-if="f.type === 'radio'"
              v-model="values[f.key]"
              :options="f.options || []"
            />
            <HrInput
              v-else
              v-model="values[f.key]"
              :placeholder="f.placeholder || ''"
              :error="!!fieldErrors[f.key]"
              :error-text="fieldErrors[f.key]"
            />
          </div>
        </div>

        <!-- Footer -->
        <footer class="lc-modal-foot">
          <button class="ghost" @click="onCancel">Cancel</button>
          <button
            class="primary"
            :class="`tone-${template.tone}`"
            :disabled="submitting"
            @click="onConfirm"
          >
            <Loader2 v-if="submitting" class="spin" :size="13" />
            <component v-else :is="template.icon" :size="13" />
            {{ template.confirmLabel || 'Confirm' }}
          </button>
        </footer>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import axios from 'axios'
import {
  X, Loader2,
  CheckCircle, ArrowUp, ArrowRight, Pause, Play, Briefcase, LogOut, Archive,
  Undo2, Gauge,
} from 'lucide-vue-next'

import HrFieldLabel from './forms/HrFieldLabel.vue'
import HrInput from './forms/HrInput.vue'
import HrTextarea from './forms/HrTextarea.vue'
import HrSelect from './forms/HrSelect.vue'
import HrDatePicker from './forms/HrDatePicker.vue'
import HrNumberInput from './forms/HrNumberInput.vue'
import HrRadio from './forms/HrRadio.vue'
import HrSearchCombobox from './forms/HrSearchCombobox.vue'
import { useSpotlight } from '../../composables/useSpotlight'
import { API } from '@/utils/api'

const props = defineProps({
  open: { type: Boolean, required: true },
  action: { type: String, default: '' },
  employee: { type: Object, default: null },
  reference: { type: Object, default: () => ({ departments: [], designations: [], grades: [], locations: [] }) },
  submitting: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'confirm'])

const cardRef = ref(null)
useSpotlight(cardRef)

const todayIso = () => new Date().toISOString().slice(0, 10)

// All lifecycle action templates — keep these in lockstep with backend
// schemas in app/schemas/hr/employee_lifecycle.py. Required fields mirror
// the Pydantic `Field(...)` declarations exactly.
const TEMPLATES = {
  confirm: {
    title: 'Confirm Employee',
    desc: "Convert this probationary employee to a permanent role. Confirmation date is recorded and the lifecycle state moves to ACTIVE.",
    icon: CheckCircle,
    tone: 'green',
    confirmLabel: 'Confirm Employee',
    fields: [
      { key: 'effective_date', label: 'Confirmation Date', type: 'date', helper: 'Defaults to today', required: false, full: true },
      { key: 'reason', label: 'Notes', type: 'textarea', placeholder: 'Optional — recorded in history', full: true },
    ],
  },
  'put-on-probation': {
    title: 'Place on Probation',
    desc: 'Move this ACTIVE employee onto a probation window for a performance review. Their lifecycle state becomes ON_PROBATION and a confirmation review date is set.',
    icon: Gauge,
    tone: 'orange',
    confirmLabel: 'Place on Probation',
    fields: [
      { key: 'probation_months', label: 'Probation length (months)', type: 'number', step: 1, helper: 'Defaults to 6 months', required: true },
      { key: 'effective_date', label: 'Start date', type: 'date', helper: 'Defaults to today' },
      { key: 'confirmation_date', label: 'Review / Confirmation date', type: 'date', helper: 'Optional — auto-calculated from start + months', full: true },
      { key: 'reason', label: 'Reason / Notes', type: 'textarea', placeholder: 'e.g. Performance review window, role transition…', full: true },
    ],
  },
  suspend: {
    title: 'Suspend Employee',
    desc: 'Suspension is reversible via Reinstate. The reason is mandatory and will be visible in audit history.',
    icon: Pause,
    tone: 'red',
    confirmLabel: 'Suspend',
    fields: [
      { key: 'reason', label: 'Reason for suspension', type: 'textarea', placeholder: 'Required — describe the cause', required: true, full: true },
      { key: 'effective_date', label: 'Effective Date', type: 'date', helper: 'Defaults to today', full: true },
    ],
  },
  reinstate: {
    title: 'Reinstate Employee',
    desc: 'Restore this employee from Suspended back to Active.',
    icon: Play,
    tone: 'green',
    confirmLabel: 'Reinstate',
    fields: [
      { key: 'effective_date', label: 'Effective Date', type: 'date', full: true },
      { key: 'reason', label: 'Reinstatement notes', type: 'textarea', placeholder: 'Optional', full: true },
    ],
  },
  'give-notice': {
    title: 'Serve Notice',
    desc: 'Records the notice period and last working date. The lifecycle state moves to ON_NOTICE.',
    icon: Briefcase,
    tone: 'orange',
    confirmLabel: 'Serve Notice',
    fields: [
      { key: 'notice_period_start_date', label: 'Notice Start Date', type: 'date', required: true },
      { key: 'last_working_date', label: 'Last Working Date', type: 'date', required: true },
      { key: 'reason', label: 'Reason / Notes', type: 'textarea', placeholder: 'Optional — visible in history', full: true },
    ],
  },
  exit: {
    title: 'Mark as Exited',
    desc: 'Records the final exit date and closes employment. This is irreversible — use Archive instead if unsure.',
    icon: LogOut,
    tone: 'red',
    confirmLabel: 'Mark Exited',
    fields: [
      { key: 'exit_date', label: 'Exit Date', type: 'date', required: true },
      { key: 'eligible_for_rehire', label: 'Eligible for Rehire?', type: 'radio', options: [
        { value: true,  label: 'Yes' },
        { value: false, label: 'No' },
      ], full: true },
      { key: 'reason', label: 'Exit Reason', type: 'textarea', placeholder: 'Optional — recorded in history', full: true },
    ],
  },
  archive: {
    title: 'Archive Employee',
    desc: 'Archive moves the record to a read-only state. The profile remains available for audit history and can be restored later.',
    icon: Archive,
    tone: 'neutral',
    confirmLabel: 'Archive',
    fields: [
      { key: 'reason', label: 'Reason / Notes', type: 'textarea', placeholder: 'Optional', full: true },
    ],
  },
  unarchive: {
    title: 'Restore from Archive',
    desc: 'Move this archived employee back to Active. Their previous employment data remains intact.',
    icon: Undo2,
    tone: 'gold',
    confirmLabel: 'Restore',
    fields: [
      { key: 'reason', label: 'Restoration reason', type: 'textarea', placeholder: 'Optional', full: true },
    ],
  },
  promote: {
    title: 'Promote Employee',
    desc: 'Update designation, grade, and pay. Annual CTC auto-recalculates from monthly × 12 if you set Monthly CTC.',
    icon: ArrowUp,
    tone: 'gold',
    confirmLabel: 'Promote',
    fields: [
      { key: 'new_designation_id', label: 'New Designation', type: 'select', dynamic: 'designations', required: true, full: true },
      { key: 'new_grade_id', label: 'New Grade', type: 'select', dynamic: 'grades' },
      { key: 'new_pay_level', label: 'New Pay Level', placeholder: 'e.g. P4' },
      { key: 'new_monthly_ctc', label: 'New Monthly CTC (₹)', type: 'number', step: 1000, full: true },
      { key: 'effective_date', label: 'Effective Date', type: 'date' },
      { key: 'reason', label: 'Reason / Justification', type: 'textarea', full: true },
    ],
  },
  transfer: {
    title: 'Transfer Employee',
    desc: 'Move to a new department, location, or under a different reporting manager. At least one change is required.',
    icon: ArrowRight,
    tone: 'gold',
    confirmLabel: 'Transfer',
    fields: [
      { key: 'new_department_id', label: 'New Department', type: 'select', dynamic: 'departments', full: true },
      { key: 'new_work_location_id', label: 'New Work Location', type: 'select', dynamic: 'locations', full: true },
      { key: 'new_reporting_manager_id', label: 'New Reporting Manager', type: 'user-search', placeholder: 'Search by name or email…', full: true },
      { key: 'effective_date', label: 'Effective Date', type: 'date', helper: 'Defaults to today' },
      { key: 'reason', label: 'Transfer Reason', type: 'textarea', placeholder: 'e.g. Org restructure, role move…', full: true },
    ],
  },
}

const template = computed(() => (props.action ? TEMPLATES[props.action] : null))

const values = reactive({})
const fieldErrors = reactive({})

const dynamicOptions = (f) => {
  if (f.options) return f.options
  if (!f.dynamic) return []
  const src = props.reference[f.dynamic] || []
  if (f.dynamic === 'grades') return src.map(g => ({ value: g.id, label: `${g.code} — ${g.name}` }))
  return src.map(x => ({ value: x.id, label: x.name }))
}

// Reset form when the action / employee changes
watch(
  () => [props.open, props.action, props.employee?.id],
  ([o, a]) => {
    Object.keys(values).forEach(k => delete values[k])
    Object.keys(fieldErrors).forEach(k => delete fieldErrors[k])
    if (!o || !a) return
    const tpl = TEMPLATES[a]
    if (!tpl) return
    for (const f of tpl.fields) {
      if (f.type === 'date') values[f.key] = todayIso()
      else if (f.type === 'radio' && f.options?.length) values[f.key] = f.options[0].value
      else values[f.key] = ''
    }
  },
  { immediate: true }
)

// User search for "Reporting Manager" lookup, etc.
const searchUsers = async (term) => {
  if (!term || term.length < 2) return []
  try {
    const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token')
    const res = await axios.get(`${API}/auth/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const t = term.toLowerCase()
    return (res.data || [])
      .filter(u => !u.is_superuser)
      .filter(u =>
        (u.full_name || '').toLowerCase().includes(t) ||
        (u.email || '').toLowerCase().includes(t) ||
        (u.employee_code || '').toLowerCase().includes(t)
      )
      .slice(0, 10)
      .map(u => ({
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        employee_id: u.employee_code,
        avatar_url: u.avatar_url,
      }))
  } catch {
    return []
  }
}

const onUserPicked = (key, user) => {
  values[`__${key}_label`] = user ? (user.full_name || user.email || '') : ''
}

const validate = () => {
  Object.keys(fieldErrors).forEach(k => delete fieldErrors[k])
  if (!template.value) return false
  for (const f of template.value.fields) {
    if (!f.required) continue
    const v = values[f.key]
    if (v === null || v === undefined || v === '') {
      fieldErrors[f.key] = 'Required'
    }
  }
  // Cross-field rules
  if (props.action === 'give-notice') {
    const s = values.notice_period_start_date
    const e = values.last_working_date
    if (s && e && new Date(e) < new Date(s)) {
      fieldErrors.last_working_date = 'Must be on or after the notice start date'
    }
  }
  if (props.action === 'transfer') {
    if (!values.new_department_id && !values.new_work_location_id && !values.new_reporting_manager_id) {
      fieldErrors.new_department_id = 'Pick at least one — department, location, or manager'
    }
  }
  return Object.keys(fieldErrors).length === 0
}

const onCancel = () => emit('close')

const onConfirm = () => {
  if (!validate()) return
  // Build payload — strip empty strings and the private __label entries
  const payload = {}
  for (const [k, v] of Object.entries(values)) {
    if (k.startsWith('__')) continue
    if (v === '' || v === null || v === undefined) continue
    payload[k] = v
  }
  emit('confirm', { action: props.action, employee: props.employee, body: payload })
}
</script>

<style scoped>
.lc-modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.62);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  z-index: 1400;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.lc-modal-card {
  position: relative;
  width: 100%;
  max-width: 560px;
  max-height: 88vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, rgba(28, 28, 32, 0.96), rgba(18, 18, 22, 0.96));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.06) inset,
    0 30px 90px -20px rgba(0, 0, 0, 0.8),
    0 0 0 1px rgba(0, 0, 0, 0.3);
}
.aurora {
  position: absolute; inset: 0;
  background:
    radial-gradient(70% 100% at 0% 0%, rgba(251, 191, 36, 0.16), transparent 60%),
    radial-gradient(50% 80% at 100% 0%, rgba(251, 146, 60, 0.14), transparent 60%);
  pointer-events: none;
  animation: hr-aurora 14s ease-in-out infinite;
}

.lc-modal-head {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 22px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.head-icon {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 11px;
  background: var(--hr-accent-gold-soft);
  border: 1px solid var(--hr-accent-gold-border);
  color: var(--hr-accent-gold);
  flex-shrink: 0;
  animation: head-pop 320ms var(--hr-spring);
}
.lc-modal-head.tone-red .head-icon { background: rgba(248, 113, 113, 0.12); border-color: rgba(248, 113, 113, 0.32); color: var(--hr-suspended); }
.lc-modal-head.tone-orange .head-icon { background: rgba(251, 146, 60, 0.12); border-color: rgba(251, 146, 60, 0.32); color: var(--hr-orange); }
.lc-modal-head.tone-green .head-icon { background: rgba(52, 211, 153, 0.12); border-color: rgba(52, 211, 153, 0.32); color: var(--hr-active); }
.lc-modal-head.tone-neutral .head-icon { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.12); color: var(--hr-text-secondary); }

@keyframes head-pop {
  0% { transform: scale(0.6); opacity: 0; }
  60% { transform: scale(1.08); }
  100% { transform: scale(1); opacity: 1; }
}

.head-text { flex: 1; min-width: 0; }
.head-text h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--hr-text);
  letter-spacing: -0.01em;
}
.head-text p {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--hr-text-muted);
}
.mono { font-family: var(--hr-mono); color: var(--hr-accent-gold); font-weight: 600; }

.close-x {
  width: 30px; height: 30px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--hr-text-muted);
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all 200ms var(--hr-spring);
}
.close-x:hover { background: rgba(255, 255, 255, 0.08); color: var(--hr-text); transform: rotate(90deg); }

.lc-modal-desc {
  position: relative;
  margin: 0;
  padding: 14px 22px 6px;
  font-size: 12.5px;
  color: var(--hr-text-secondary);
  line-height: 1.55;
}
.lc-modal-fields {
  position: relative;
  padding: 14px 22px 18px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  overflow-y: auto;
}
.modal-field { display: flex; flex-direction: column; gap: 2px; }
.modal-field.full { grid-column: span 2; }

.lc-modal-foot {
  position: relative;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 22px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(8, 8, 10, 0.45);
}
.ghost, .primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 220ms var(--hr-spring);
  letter-spacing: 0.2px;
}
.ghost { background: transparent; color: var(--hr-text-secondary); }
.ghost:hover { background: rgba(255, 255, 255, 0.04); color: var(--hr-text); }
.primary {
  background: var(--hr-gradient-rail-active);
  border-color: var(--hr-accent-gold);
  color: #1a1a1c;
  box-shadow: 0 8px 22px -8px rgba(251, 146, 60, 0.55);
}
.primary:hover:not(:disabled) {
  box-shadow: 0 12px 28px -8px rgba(251, 146, 60, 0.75), 0 0 36px rgba(251, 191, 36, 0.32);
  transform: translateY(-1px);
}
.primary:disabled { opacity: 0.6; cursor: wait; }

.primary.tone-red {
  background: linear-gradient(180deg, #ef4444, #b91c1c);
  border-color: rgba(239, 68, 68, 0.7);
  color: #ffffff;
  box-shadow: 0 8px 22px -8px rgba(239, 68, 68, 0.55);
}
.primary.tone-red:hover:not(:disabled) {
  box-shadow: 0 12px 28px -8px rgba(239, 68, 68, 0.7), 0 0 30px rgba(239, 68, 68, 0.35);
}
.primary.tone-orange {
  background: linear-gradient(180deg, #fb923c, #ea580c);
  border-color: rgba(251, 146, 60, 0.7);
  color: #1a1a1c;
}
.primary.tone-green {
  background: linear-gradient(180deg, #34d399, #059669);
  border-color: rgba(52, 211, 153, 0.7);
  color: #0a0f0d;
}
.primary.tone-neutral {
  background: linear-gradient(180deg, #6b7280, #374151);
  border-color: rgba(156, 163, 175, 0.6);
  color: #ffffff;
}

.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

/* Enter / leave */
.lc-modal-enter-active, .lc-modal-leave-active {
  transition: opacity 240ms var(--hr-spring);
}
.lc-modal-enter-active .lc-modal-card,
.lc-modal-leave-active .lc-modal-card {
  transition: transform 320ms var(--hr-spring), opacity 240ms var(--hr-spring);
}
.lc-modal-enter-from, .lc-modal-leave-to { opacity: 0; }
.lc-modal-enter-from .lc-modal-card,
.lc-modal-leave-to .lc-modal-card {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}

@media (max-width: 600px) {
  .lc-modal-fields { grid-template-columns: 1fr; }
  .modal-field.full { grid-column: span 1; }
}
</style>
