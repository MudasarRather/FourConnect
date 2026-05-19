<template>
  <RecModal
    :open="open"
    title="New Application"
    subtitle="Apply an existing candidate to an open position"
    :icon="ClipboardList"
    :width="540"
    @close="$emit('close')"
  >
    <form @submit.prevent="onSubmit" class="form">
      <div class="field-block">
        <HrFieldLabel label="Candidate" required :error="!!errors.candidate_id" />
        <HrSelect v-model="form.candidate_id" :options="candidateOptions" placeholder="Select candidate" searchable
                  :error="!!errors.candidate_id" :error-text="errors.candidate_id" />
      </div>
      <div class="field-block">
        <HrFieldLabel label="Open Position" required :error="!!errors.position_id" />
        <HrSelect v-model="form.position_id" :options="positionOptions" placeholder="Select an open position" searchable
                  :error="!!errors.position_id" :error-text="errors.position_id" />
      </div>
      <div class="field-block">
        <HrFieldLabel label="Source" />
        <HrSelect v-model="form.source" :options="sourceOptions" />
      </div>
      <div class="field-block">
        <HrFieldLabel label="Initial Notes (optional)" />
        <HrTextarea v-model="form.notes" :rows="2" placeholder="Anything noteworthy at intake…" />
      </div>
    </form>

    <template #footer>
      <button class="ghost" @click="$emit('close')">Cancel</button>
      <div class="grow" />
      <button class="primary" :disabled="submitting" @click="onSubmit">
        <Loader2 v-if="submitting" :size="14" class="spin" />
        <Plus v-else :size="14" />
        Create Application
      </button>
    </template>
  </RecModal>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ClipboardList, Plus, Loader2 } from 'lucide-vue-next'
import RecModal from '../components/RecModal.vue'
import HrFieldLabel from '../../../../components/hr/forms/HrFieldLabel.vue'
import HrSelect from '../../../../components/hr/forms/HrSelect.vue'
import HrTextarea from '../../../../components/hr/forms/HrTextarea.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  candidates: { type: Array, default: () => [] },
  positions: { type: Array, default: () => [] },
  submitting: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'submit'])

const sourceOptions = [
  { value: 'PORTAL',   label: 'Portal' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'NAUKRI',   label: 'Naukri' },
  { value: 'INDEED',   label: 'Indeed' },
  { value: 'AGENCY',   label: 'Agency' },
  { value: 'WALK_IN',  label: 'Walk-in' },
  { value: 'CAMPUS',   label: 'Campus' },
  { value: 'DIRECT',   label: 'Direct' },
  { value: 'OTHER',    label: 'Other' },
]

const candidateOptions = computed(() =>
  (props.candidates || []).map(c => ({
    value: c.id,
    label: `${c.full_name} · ${c.candidate_code}${c.current_designation ? ' — ' + c.current_designation : ''}`,
  }))
)
const positionOptions = computed(() =>
  (props.positions || []).map(p => ({
    value: p.id,
    label: `${p.job_title} · ${p.job_code}${p.department_name ? ' — ' + p.department_name : ''}`,
  }))
)

const blank = () => ({
  candidate_id: null,
  position_id: null,
  source: 'PORTAL',
  notes: '',
})
const form = ref(blank())
const errors = reactive({})

watch(() => props.open, (v) => {
  if (v) {
    form.value = blank()
    Object.keys(errors).forEach(k => delete errors[k])
  }
})

const onSubmit = () => {
  Object.keys(errors).forEach(k => delete errors[k])
  if (!form.value.candidate_id) errors.candidate_id = 'Pick a candidate'
  if (!form.value.position_id) errors.position_id = 'Pick a position'
  if (Object.keys(errors).length) return

  const payload = { ...form.value }
  if (!payload.notes) delete payload.notes
  emit('submit', payload)
}
</script>

<style scoped>
.form { display: flex; flex-direction: column; gap: 14px; }
.field-block { display: flex; flex-direction: column; gap: 2px; }

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
</style>
