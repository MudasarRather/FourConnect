<template>
  <SdModalShell :open="open" :eyebrow="editing ? 'EDIT CHANGE REQUEST' : 'NEW CHANGE REQUEST'"
    :title="editing ? form.title || 'Change request' : 'Raise a change request'" width="680px" @close="$emit('close')">
    <form class="sd-form" @submit.prevent="submit">
      <label class="sd-field"><span class="sd-label">Title <em>*</em></span>
        <input v-model="form.title" class="sd-input" placeholder="Migrate prod DB to managed Postgres" /></label>

      <label class="sd-field"><span class="sd-label">Description</span>
        <textarea v-model="form.description" rows="3" class="sd-input" placeholder="What is being changed?" /></label>

      <div class="sd-grid2">
        <label class="sd-field"><span class="sd-label">Reason</span>
          <textarea v-model="form.reason" rows="3" class="sd-input" placeholder="Why is this change needed?" /></label>
        <label class="sd-field"><span class="sd-label">Impact</span>
          <textarea v-model="form.impact" rows="3" class="sd-input" placeholder="Systems / users affected" /></label>
      </div>

      <div class="sd-grid2">
        <div class="sd-field">
          <span class="sd-label">Risk level</span>
          <SdSelect v-model="form.risk_level" :options="RISK_OPTS" placeholder="Select risk" />
        </div>
        <label class="sd-field"><span class="sd-label">Implementation date</span>
          <input v-model="form.implementation_date" type="date" class="sd-input" /></label>
      </div>

      <div class="sd-grid2">
        <label class="sd-field"><span class="sd-label">Rollback plan</span>
          <textarea v-model="form.rollback_plan" rows="3" class="sd-input" placeholder="How to revert if it fails" /></label>
        <label class="sd-field"><span class="sd-label">Testing plan</span>
          <textarea v-model="form.testing_plan" rows="3" class="sd-input" placeholder="How it will be validated" /></label>
      </div>

      <div class="sd-grid2">
        <div class="sd-field">
          <span class="sd-label">Organization</span>
          <SdSelect v-model="form.organization_id" :options="orgOpts" placeholder="No organization" />
        </div>
        <div v-if="editing" class="sd-field">
          <span class="sd-label">Status</span>
          <SdSelect v-model="form.status" :options="STATUS_OPTS" placeholder="Status" />
        </div>
      </div>

      <p v-if="error" class="sd-form-error">{{ error }}</p>
    </form>
    <template #footer>
      <button v-if="editing" class="sd-btn sd-btn-danger" type="button" :disabled="saving" @click="remove">Delete</button>
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
  createChangeRequest, updateChangeRequest, deleteChangeRequest,
  loadPickers, usePickers,
} from '@/composables/useSupportDesk'

const props = defineProps({ open: Boolean, change: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved'])

const pickers = usePickers()
const saving = ref(false)
const error = ref('')
const editing = computed(() => !!props.change)
const orgOpts = computed(() => [{ value: null, label: 'No organization' }, ...(pickers.organizations || []).map(o => ({ value: o.id, label: o.name }))])

const RISK_OPTS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]
const STATUS_OPTS = [
  { value: 'draft', label: 'Draft' },
  { value: 'review', label: 'Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'implemented', label: 'Implemented' },
  { value: 'closed', label: 'Closed' },
  { value: 'rejected', label: 'Rejected' },
]

const blank = () => ({
  title: '', description: '', reason: '', impact: '', risk_level: 'medium',
  implementation_date: '', rollback_plan: '', testing_plan: '',
  organization_id: null, status: 'draft',
})
const form = ref(blank())

watch(() => props.open, (v) => {
  if (v) {
    error.value = ''
    loadPickers()
    if (props.change) {
      const c = props.change
      form.value = {
        ...blank(),
        ...c,
        implementation_date: c.implementation_date ? String(c.implementation_date).slice(0, 10) : '',
      }
    } else {
      form.value = blank()
    }
  }
})

const submit = async () => {
  if (!form.value.title.trim()) { error.value = 'Title is required.'; return }
  saving.value = true; error.value = ''
  try {
    const payload = { ...form.value }
    if (!payload.implementation_date) payload.implementation_date = null
    if (!editing.value) delete payload.status
    if (editing.value) await updateChangeRequest(props.change.id, payload)
    else await createChangeRequest(payload)
    emit('saved')
  } catch (e) { error.value = e?.response?.data?.detail || 'Save failed.' }
  finally { saving.value = false }
}
const remove = async () => {
  saving.value = true; error.value = ''
  try { await deleteChangeRequest(props.change.id); emit('saved') }
  catch (e) { error.value = e?.response?.data?.detail || 'Delete failed.' }
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
textarea.sd-input { resize: vertical; min-height: 64px; line-height: 1.5; }
.sd-form-error { color: var(--sd-danger); font-size: 12.5px; margin: 0; }
.sd-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 11px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); }
.sd-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.sd-btn-primary { border: none; background: var(--sd-grad-hero); color: #1a1206; }
[data-theme="light"] .sd-btn-primary { color: #fff8ec; }
.sd-btn-danger { color: var(--sd-danger); border-color: color-mix(in srgb, var(--sd-danger) 35%, transparent); }
</style>
