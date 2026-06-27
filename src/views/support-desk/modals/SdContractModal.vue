<template>
  <SdModalShell :open="open" :eyebrow="editing ? 'EDIT CONTRACT' : 'NEW CONTRACT'"
    :title="editing ? form.name || 'Contract' : 'Add a support contract'" width="680px" @close="$emit('close')">
    <form class="sd-form" @submit.prevent="submit">
      <div class="sd-grid2">
        <label class="sd-field"><span class="sd-label">Name <em>*</em></span>
          <input v-model="form.name" class="sd-input" placeholder="Annual Support Agreement" /></label>
        <label class="sd-field"><span class="sd-label">Contract number</span>
          <input v-model="form.contract_number" class="sd-input" placeholder="CN-2026-001" /></label>
      </div>
      <div class="sd-field">
        <span class="sd-label">Organization <em>*</em></span>
        <SdSelect v-model="form.organization_id" :options="orgOpts" placeholder="Select organization" />
      </div>
      <div class="sd-grid2">
        <label class="sd-field"><span class="sd-label">Contract type</span>
          <input v-model="form.contract_type" class="sd-input" placeholder="AMC / Subscription" /></label>
        <label class="sd-field"><span class="sd-label">Support package</span>
          <input v-model="form.support_package" class="sd-input" placeholder="Premium / Standard" /></label>
      </div>
      <div class="sd-field">
        <span class="sd-label">SLA package</span>
        <SdSelect v-model="form.sla_package_id" :options="slaOpts" placeholder="Default SLA" />
      </div>
      <div class="sd-grid3">
        <label class="sd-field"><span class="sd-label">Start date</span>
          <input v-model="form.start_date" type="date" class="sd-input" /></label>
        <label class="sd-field"><span class="sd-label">End date</span>
          <input v-model="form.end_date" type="date" class="sd-input" /></label>
        <label class="sd-field"><span class="sd-label">Renewal date</span>
          <input v-model="form.renewal_date" type="date" class="sd-input" /></label>
      </div>
      <div class="sd-grid3">
        <label class="sd-field"><span class="sd-label">Contract value</span>
          <input v-model="form.contract_value" type="number" min="0" step="0.01" class="sd-input" placeholder="0" /></label>
        <label class="sd-field"><span class="sd-label">Currency</span>
          <input v-model="form.currency" class="sd-input" placeholder="INR" /></label>
        <div class="sd-field">
          <span class="sd-label">Billing cycle</span>
          <SdSelect v-model="form.billing_cycle" :options="billingOpts" placeholder="Billing cycle" />
        </div>
      </div>
      <div class="sd-grid2">
        <label class="sd-field"><span class="sd-label">Hours included</span>
          <input v-model="form.hours_included" type="number" min="0" class="sd-input" placeholder="0" /></label>
        <label class="sd-field"><span class="sd-label">Dedicated resources</span>
          <input v-model="form.dedicated_resources" type="number" min="0" class="sd-input" placeholder="0" /></label>
      </div>
      <div v-if="editing" class="sd-field">
        <span class="sd-label">Status</span>
        <SdSelect v-model="form.status" :options="statusOpts" placeholder="Status" />
      </div>
      <p v-if="error" class="sd-form-error">{{ error }}</p>
    </form>
    <template #footer>
      <button v-if="editing" class="sd-btn sd-btn-danger" type="button" :disabled="saving" @click="remove">Delete</button>
      <span style="flex:1" />
      <button class="sd-btn" type="button" @click="$emit('close')">Cancel</button>
      <button class="sd-btn sd-btn-primary" type="button" :disabled="saving || !valid" @click="submit">
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
  createContract, updateContract, deleteContract, loadPickers, usePickers,
} from '@/composables/useSupportDesk'

const props = defineProps({ open: Boolean, contract: { type: Object, default: null }, defaultOrgId: { type: String, default: null } })
const emit = defineEmits(['close', 'saved'])

const pickers = usePickers()
const saving = ref(false)
const error = ref('')
const editing = computed(() => !!props.contract)
const orgOpts = computed(() => (pickers.organizations || []).map(o => ({ value: o.id, label: o.name })))
const slaOpts = computed(() => (pickers.slaPackages || []).map(s => ({ value: s.id, label: s.name })))
const billingOpts = [{ value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' }, { value: 'annual', label: 'Annual' }]
const statusOpts = [{ value: 'active', label: 'Active' }, { value: 'expired', label: 'Expired' }, { value: 'terminated', label: 'Terminated' }]
const valid = computed(() => form.value.name.trim() && form.value.organization_id)

const toDateInput = (v) => (v ? String(v).slice(0, 10) : '')

const blank = () => ({
  name: '', contract_number: '', organization_id: props.defaultOrgId || null,
  contract_type: '', support_package: '', sla_package_id: null,
  start_date: '', end_date: '', renewal_date: '',
  contract_value: '', currency: 'INR', billing_cycle: 'monthly',
  hours_included: '', dedicated_resources: '', status: 'active',
})
const form = ref(blank())

watch(() => props.open, (v) => {
  if (v) {
    error.value = ''
    loadPickers()
    if (props.contract) {
      form.value = { ...blank(), ...props.contract }
      form.value.start_date = toDateInput(props.contract.start_date)
      form.value.end_date = toDateInput(props.contract.end_date)
      form.value.renewal_date = toDateInput(props.contract.renewal_date)
    } else {
      form.value = blank()
    }
  }
})

const buildPayload = () => {
  const f = form.value
  const num = (v) => (v === '' || v == null ? null : Number(v))
  const str = (v) => (v && String(v).trim() ? v : null)
  const payload = {
    name: f.name.trim(),
    contract_number: str(f.contract_number),
    organization_id: f.organization_id,
    contract_type: str(f.contract_type),
    support_package: str(f.support_package),
    sla_package_id: f.sla_package_id || null,
    start_date: str(f.start_date),
    end_date: str(f.end_date),
    renewal_date: str(f.renewal_date),
    contract_value: num(f.contract_value),
    currency: f.currency || 'INR',
    billing_cycle: f.billing_cycle,
    hours_included: num(f.hours_included),
    dedicated_resources: num(f.dedicated_resources),
  }
  if (editing.value) payload.status = f.status
  return payload
}

const submit = async () => {
  if (!valid.value) { error.value = 'Name and organization are required.'; return }
  saving.value = true; error.value = ''
  try {
    const payload = buildPayload()
    if (editing.value) await updateContract(props.contract.id, payload)
    else await createContract(payload)
    emit('saved')
  } catch (e) { error.value = e?.response?.data?.detail || 'Save failed.' }
  finally { saving.value = false }
}
const remove = async () => {
  saving.value = true; error.value = ''
  try { await deleteContract(props.contract.id); emit('saved') }
  catch (e) { error.value = e?.response?.data?.detail || 'Delete failed.' }
  finally { saving.value = false }
}
</script>

<style scoped>
.sd-form { display: flex; flex-direction: column; gap: 13px; }
.sd-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
.sd-grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 13px; }
@media (max-width: 520px) { .sd-grid2, .sd-grid3 { grid-template-columns: 1fr; } }
.sd-field { display: flex; flex-direction: column; gap: 6px; }
.sd-label { font-size: 12px; font-weight: 600; color: var(--sd-text-secondary); }
.sd-label em { color: var(--sd-danger); font-style: normal; }
.sd-input { width: 100%; padding: 10px 13px; border-radius: 11px; font-size: 14px; font-family: inherit; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text); }
.sd-input:focus { outline: none; border-color: var(--sd-amber-border); box-shadow: 0 0 0 3px var(--sd-amber-soft); }
.sd-form-error { color: var(--sd-danger); font-size: 12.5px; margin: 0; }
.sd-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 11px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); }
.sd-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.sd-btn-primary { border: none; background: var(--sd-grad-hero); color: #1a1206; }
[data-theme="light"] .sd-btn-primary { color: #fff8ec; }
.sd-btn-danger { color: var(--sd-danger); border-color: color-mix(in srgb, var(--sd-danger) 35%, transparent); }
</style>
