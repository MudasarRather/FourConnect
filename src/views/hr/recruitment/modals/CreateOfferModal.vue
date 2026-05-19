<template>
  <RecModal
    :open="open"
    title="Create Offer"
    subtitle="Generate an offer for a selected candidate"
    :icon="Mail"
    :width="620"
    @close="$emit('close')"
  >
    <form @submit.prevent="onSubmit" class="form">
      <div class="field-block">
        <HrFieldLabel label="Application" required :error="!!errors.application_id" />
        <HrSelect v-model="form.application_id" :options="appOptions" placeholder="Pick a selected application" searchable
                  :error="!!errors.application_id" :error-text="errors.application_id" />
      </div>

      <div class="grid">
        <div class="field-block">
          <HrFieldLabel label="Designation" />
          <HrInput v-model="form.designation" placeholder="e.g. Senior Backend Engineer" />
        </div>
        <div class="field-block">
          <HrFieldLabel label="Offered Salary" required :error="!!errors.offered_salary" />
          <HrNumberInput v-model="form.offered_salary" :step-by="10000" :min="1"
            :error="!!errors.offered_salary" :error-text="errors.offered_salary" />
        </div>
        <div class="field-block">
          <HrFieldLabel label="Bonus" />
          <HrNumberInput v-model="form.bonus" :step-by="10000" :min="0" />
        </div>
        <div class="field-block">
          <HrFieldLabel label="Currency" />
          <HrInput v-model="form.currency" mono placeholder="INR" />
        </div>
        <div class="field-block">
          <HrFieldLabel label="Joining Date" />
          <HrDatePicker v-model="form.joining_date" />
        </div>
        <div class="field-block">
          <HrFieldLabel label="Offer Valid Till" />
          <HrDatePicker v-model="form.offer_valid_till" />
        </div>
      </div>

      <div class="field-block">
        <HrFieldLabel label="Notes" />
        <HrTextarea v-model="form.notes" :rows="2" placeholder="Sign-on bonus terms, equity, anything to capture…" />
      </div>

      <div class="note">
        <Sparkles :size="14" />
        <span>Offer will be created as <strong>DRAFT</strong>. Approve and release to send it to the candidate.</span>
      </div>
    </form>

    <template #footer>
      <button class="ghost" @click="$emit('close')">Cancel</button>
      <div class="grow" />
      <button class="primary" :disabled="submitting" @click="onSubmit">
        <Loader2 v-if="submitting" :size="14" class="spin" />
        <Plus v-else :size="14" />
        Create Offer
      </button>
    </template>
  </RecModal>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Mail, Plus, Loader2, Sparkles } from 'lucide-vue-next'
import RecModal from '../components/RecModal.vue'
import HrFieldLabel from '../../../../components/hr/forms/HrFieldLabel.vue'
import HrInput from '../../../../components/hr/forms/HrInput.vue'
import HrSelect from '../../../../components/hr/forms/HrSelect.vue'
import HrTextarea from '../../../../components/hr/forms/HrTextarea.vue'
import HrDatePicker from '../../../../components/hr/forms/HrDatePicker.vue'
import HrNumberInput from '../../../../components/hr/forms/HrNumberInput.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  applications: { type: Array, default: () => [] },
  submitting: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'submit'])

const appOptions = computed(() =>
  (props.applications || []).map(a => ({
    value: a.id,
    label: `${a.candidate_name || '—'} · ${a.position_title || '—'} (${a.application_code})`,
  }))
)

const blank = () => ({
  application_id: null,
  designation: '',
  offered_salary: null,
  bonus: 0,
  currency: 'INR',
  joining_date: null,
  offer_valid_till: null,
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
  if (!form.value.application_id) errors.application_id = 'Pick an application'
  if (!form.value.offered_salary || form.value.offered_salary <= 0) {
    errors.offered_salary = 'Offered salary required'
  }
  if (Object.keys(errors).length) return

  const payload = { ...form.value }
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

.note {
  background: rgba(251, 191, 36, 0.06);
  border: 1px solid var(--hr-accent-gold-border);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 12px;
  color: var(--hr-text-secondary);
  display: flex; align-items: center; gap: 8px;
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
