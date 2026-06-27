<template>
  <SdModalShell :open="open" :eyebrow="editing ? 'EDIT ASSET' : 'NEW ASSET'"
    :title="editing ? form.name || 'Asset' : 'Add a customer asset'" width="640px" @close="$emit('close')">
    <form class="sd-form" @submit.prevent="submit">
      <div class="sd-grid2">
        <label class="sd-field"><span class="sd-label">Name <em>*</em></span>
          <input v-model="form.name" class="sd-input" placeholder="Core Firewall 01" /></label>
        <div class="sd-field">
          <span class="sd-label">Asset type</span>
          <SdSelect v-model="form.asset_type" :options="typeOpts" placeholder="Select type" />
        </div>
      </div>
      <div class="sd-field">
        <span class="sd-label">Organization</span>
        <SdSelect v-model="form.organization_id" :options="orgOpts" placeholder="Select organization" />
      </div>
      <div class="sd-grid2">
        <label class="sd-field"><span class="sd-label">Serial number</span>
          <input v-model="form.serial_number" class="sd-input" placeholder="SN-…" /></label>
        <label class="sd-field"><span class="sd-label">Model</span>
          <input v-model="form.model" class="sd-input" placeholder="Model no." /></label>
      </div>
      <div class="sd-grid2">
        <label class="sd-field"><span class="sd-label">Vendor</span>
          <input v-model="form.vendor" class="sd-input" placeholder="Cisco / Dell…" /></label>
        <label class="sd-field"><span class="sd-label">Vendor contact</span>
          <input v-model="form.vendor_contact" class="sd-input" placeholder="name / phone / email" /></label>
      </div>
      <div class="sd-grid2">
        <label class="sd-field"><span class="sd-label">Warranty start</span>
          <input v-model="form.warranty_start" type="date" class="sd-input" /></label>
        <label class="sd-field"><span class="sd-label">Warranty end</span>
          <input v-model="form.warranty_end" type="date" class="sd-input" /></label>
      </div>
      <label class="sd-field"><span class="sd-label">AMC</span>
        <input v-model="form.amc" class="sd-input" placeholder="Active until 2026" /></label>
      <label class="sd-field"><span class="sd-label">Notes</span>
        <textarea v-model="form.notes" rows="3" class="sd-input" /></label>
      <p v-if="error" class="sd-form-error">{{ error }}</p>
    </form>
    <template #footer>
      <button v-if="editing" class="sd-btn sd-btn-danger" type="button" :disabled="saving" @click="remove">Delete</button>
      <span style="flex:1" />
      <button class="sd-btn" type="button" @click="$emit('close')">Cancel</button>
      <button class="sd-btn sd-btn-primary" type="button" :disabled="saving || !form.name.trim()" @click="submit">
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
  createCustomerAsset, updateCustomerAsset, deleteCustomerAsset, loadPickers, usePickers,
} from '@/composables/useSupportDesk'

const props = defineProps({ open: Boolean, asset: { type: Object, default: null }, defaultOrgId: { type: String, default: null } })
const emit = defineEmits(['close', 'saved'])

const ASSET_TYPES = ['server', 'firewall', 'switch', 'router', 'workstation', 'license', 'database', 'cloud']
const TYPE_LABELS = {
  server: 'Server', firewall: 'Firewall', switch: 'Switch', router: 'Router',
  workstation: 'Workstation', license: 'License', database: 'Database', cloud: 'Cloud',
}

const pickers = usePickers()
const saving = ref(false)
const error = ref('')
const editing = computed(() => !!props.asset)
const orgOpts = computed(() => (pickers.organizations || []).map(o => ({ value: o.id, label: o.name })))
const typeOpts = ASSET_TYPES.map(t => ({ value: t, label: TYPE_LABELS[t] }))

const toDateInput = (v) => (v ? String(v).slice(0, 10) : '')

const blank = () => ({
  name: '', organization_id: props.defaultOrgId || null, asset_type: 'server',
  serial_number: '', model: '', vendor: '',
  warranty_start: '', warranty_end: '', amc: '', vendor_contact: '', notes: '',
})
const form = ref(blank())

watch(() => props.open, (v) => {
  if (v) {
    error.value = ''
    loadPickers()
    if (props.asset) {
      form.value = { ...blank(), ...props.asset }
      form.value.warranty_start = toDateInput(props.asset.warranty_start)
      form.value.warranty_end = toDateInput(props.asset.warranty_end)
    } else {
      form.value = blank()
    }
  }
})

const buildPayload = () => {
  const f = form.value
  const str = (v) => (v && String(v).trim() ? v : null)
  return {
    name: f.name.trim(),
    organization_id: f.organization_id || null,
    asset_type: f.asset_type,
    serial_number: str(f.serial_number),
    model: str(f.model),
    vendor: str(f.vendor),
    warranty_start: str(f.warranty_start),
    warranty_end: str(f.warranty_end),
    amc: str(f.amc),
    vendor_contact: str(f.vendor_contact),
    notes: str(f.notes),
  }
}

const submit = async () => {
  if (!form.value.name.trim()) { error.value = 'Name is required.'; return }
  saving.value = true; error.value = ''
  try {
    const payload = buildPayload()
    if (editing.value) await updateCustomerAsset(props.asset.id, payload)
    else await createCustomerAsset(payload)
    emit('saved')
  } catch (e) { error.value = e?.response?.data?.detail || 'Save failed.' }
  finally { saving.value = false }
}
const remove = async () => {
  saving.value = true; error.value = ''
  try { await deleteCustomerAsset(props.asset.id); emit('saved') }
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
.sd-form-error { color: var(--sd-danger); font-size: 12.5px; margin: 0; }
.sd-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 11px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); }
.sd-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.sd-btn-primary { border: none; background: var(--sd-grad-hero); color: #1a1206; }
[data-theme="light"] .sd-btn-primary { color: #fff8ec; }
.sd-btn-danger { color: var(--sd-danger); border-color: color-mix(in srgb, var(--sd-danger) 35%, transparent); }
</style>
