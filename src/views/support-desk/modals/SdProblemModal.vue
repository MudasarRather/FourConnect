<template>
  <SdModalShell :open="open" :eyebrow="editing ? 'EDIT PROBLEM' : 'NEW PROBLEM'"
    :title="editing ? form.title || 'Problem' : 'Log a problem record'" width="680px" @close="$emit('close')">
    <form class="sd-form" @submit.prevent="submit">
      <label class="sd-field"><span class="sd-label">Title <em>*</em></span>
        <input v-model="form.title" class="sd-input" placeholder="Recurring checkout timeouts" /></label>

      <label class="sd-field"><span class="sd-label">Description</span>
        <textarea v-model="form.description" rows="3" class="sd-input" placeholder="Summarise the underlying problem" /></label>

      <div class="sd-grid2">
        <div class="sd-field">
          <span class="sd-label">Severity</span>
          <SdSelect v-model="form.severity" :options="SEVERITY_OPTS" placeholder="Select severity" />
        </div>
        <div v-if="editing" class="sd-field">
          <span class="sd-label">Status</span>
          <SdSelect v-model="form.status" :options="STATUS_OPTS" placeholder="Status" />
        </div>
      </div>

      <label class="sd-field"><span class="sd-label">Impact</span>
        <textarea v-model="form.impact" rows="2" class="sd-input" placeholder="Business / customer impact" /></label>

      <div class="sd-field">
        <span class="sd-label">Organization</span>
        <SdSelect v-model="form.organization_id" :options="orgOpts" placeholder="No organization" />
      </div>

      <div class="sd-rca">
        <p class="sd-rca-title">Root Cause Analysis</p>
        <div class="sd-grid2">
          <label class="sd-field"><span class="sd-label">Root cause</span>
            <textarea v-model="form.root_cause" rows="3" class="sd-input" placeholder="What is actually causing this?" /></label>
          <label class="sd-field"><span class="sd-label">Resolution plan</span>
            <textarea v-model="form.resolution_plan" rows="3" class="sd-input" placeholder="How will it be permanently fixed?" /></label>
        </div>
        <div class="sd-grid2">
          <label class="sd-field"><span class="sd-label">Preventive measures</span>
            <textarea v-model="form.preventive_measures" rows="3" class="sd-input" placeholder="How to stop it recurring" /></label>
          <label class="sd-field"><span class="sd-label">Lessons learned</span>
            <textarea v-model="form.lessons_learned" rows="3" class="sd-input" placeholder="Takeaways for the team" /></label>
        </div>
      </div>

      <p v-if="error" class="sd-form-error">{{ error }}</p>
    </form>
    <template #footer>
      <span style="flex:1" />
      <button class="sd-btn" type="button" @click="$emit('close')">Cancel</button>
      <button class="sd-btn sd-btn-primary" type="button" :disabled="saving || !form.title.trim()" @click="submit">
        {{ saving ? 'Saving…' : (editing ? 'Save changes' : 'Create') }}
      </button>
    </template>
  </SdModalShell>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import SdModalShell from '../components/SdModalShell.vue'
import SdSelect from '../components/SdSelect.vue'
import {
  createProblem, updateProblem, loadPickers, usePickers,
} from '@/composables/useSupportDesk'

const props = defineProps({ open: Boolean, problem: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved'])

const pickers = usePickers()
const saving = ref(false)
const error = ref('')
const editing = computed(() => !!props.problem)
const orgOpts = computed(() => [{ value: null, label: 'No organization' }, ...(pickers.organizations || []).map(o => ({ value: o.id, label: o.name }))])

const SEVERITY_OPTS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]
const STATUS_OPTS = [
  { value: 'open', label: 'Open' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'known_error', label: 'Known Error' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

const blank = () => ({
  title: '', description: '', severity: 'medium', impact: '',
  status: 'open', organization_id: null,
  root_cause: '', resolution_plan: '', preventive_measures: '', lessons_learned: '',
})
const form = ref(blank())

watch(() => props.open, (v) => {
  if (v) {
    error.value = ''
    loadPickers()
    form.value = props.problem ? { ...blank(), ...props.problem } : blank()
  }
})

const submit = async () => {
  if (!form.value.title.trim()) { error.value = 'Title is required.'; return }
  saving.value = true; error.value = ''
  try {
    const payload = { ...form.value }
    if (!editing.value) delete payload.status
    if (editing.value) await updateProblem(props.problem.id, payload)
    else await createProblem(payload)
    emit('saved')
  } catch (e) { error.value = e?.response?.data?.detail || 'Save failed.' }
  finally { saving.value = false }
}
</script>

<style scoped>
.sd-form { display: flex; flex-direction: column; gap: 13px; }
.sd-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
@media (max-width: 520px) { .sd-grid2 { grid-template-columns: 1fr; } }
.sd-field { display: flex; flex-direction: column; gap: 6px; }
.sd-label { font-size: 12px; font-weight: 600; color: var(--sd-text-secondary); }
.sd-label em { color: var(--sd-danger); font-style: normal; }
.sd-input { width: 100%; padding: 10px 13px; border-radius: 11px; font-size: 14px; font-family: inherit; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text); }
.sd-input:focus { outline: none; border-color: var(--sd-amber-border); box-shadow: 0 0 0 3px var(--sd-amber-soft); }
textarea.sd-input { resize: vertical; min-height: 60px; line-height: 1.5; }
.sd-rca { display: flex; flex-direction: column; gap: 13px; padding: 14px; border-radius: 14px; border: 1px solid var(--sd-border); background: var(--sd-grad-card); }
.sd-rca-title { font-family: var(--sd-mono); font-size: 10.5px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--sd-amber); margin: 0; }
.sd-form-error { color: var(--sd-danger); font-size: 12.5px; margin: 0; }
.sd-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 11px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); }
.sd-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.sd-btn-primary { border: none; background: var(--sd-grad-hero); color: #1a1206; }
[data-theme="light"] .sd-btn-primary { color: #fff8ec; }
</style>
