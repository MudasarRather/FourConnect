<template>
  <SdModalShell :open="open" :eyebrow="editing ? 'EDIT ORGANIZATION' : 'NEW ORGANIZATION'"
    :title="editing ? form.name || 'Organization' : 'Add a client organization'" width="640px" @close="$emit('close')">
    <form class="sd-form" @submit.prevent="submit">
      <div class="sd-grid2">
        <label class="sd-field"><span class="sd-label">Name <em>*</em></span>
          <input v-model="form.name" class="sd-input" placeholder="Acme Corp" /></label>
        <label class="sd-field"><span class="sd-label">Code</span>
          <input v-model="form.code" class="sd-input" placeholder="ACME-01 (used for portal)" /></label>
      </div>
      <div class="sd-grid2">
        <label class="sd-field"><span class="sd-label">Industry</span>
          <input v-model="form.industry" class="sd-input" placeholder="SaaS / Manufacturing…" /></label>
        <label class="sd-field"><span class="sd-label">Website</span>
          <input v-model="form.website" class="sd-input" placeholder="https://…" /></label>
      </div>
      <div class="sd-grid2">
        <label class="sd-field"><span class="sd-label">Email</span>
          <input v-model="form.email" type="email" class="sd-input" placeholder="support@acme.com" /></label>
        <label class="sd-field"><span class="sd-label">Phone</span>
          <input v-model="form.phone" class="sd-input" /></label>
      </div>
      <div class="sd-grid2">
        <label class="sd-field"><span class="sd-label">Support plan</span>
          <input v-model="form.support_plan" class="sd-input" placeholder="Premium / Standard" /></label>
        <label class="sd-field"><span class="sd-label">Support hours</span>
          <input v-model="form.support_hours" class="sd-input" placeholder="24x7 / 9-6 IST" /></label>
      </div>
      <div class="sd-field">
        <span class="sd-label">SLA package</span>
        <SdSelect v-model="form.sla_package_id" :options="slaOpts" placeholder="Default SLA" />
      </div>
      <label class="sd-field"><span class="sd-label">Address</span>
        <textarea v-model="form.address" rows="2" class="sd-input" /></label>
      <label class="sd-check"><input type="checkbox" v-model="form.is_active" /> Active</label>
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
  createOrganization, updateOrganization, deleteOrganization,
  loadPickers, usePickers,
} from '@/composables/useSupportDesk'

const props = defineProps({ open: Boolean, org: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved'])

const pickers = usePickers()
const saving = ref(false)
const error = ref('')
const editing = computed(() => !!props.org)
const slaOpts = computed(() => (pickers.slaPackages || []).map(s => ({ value: s.id, label: s.name })))

const blank = () => ({ name: '', code: '', industry: '', website: '', email: '', phone: '',
  support_plan: '', support_hours: '', sla_package_id: null, address: '', is_active: true })
const form = ref(blank())

watch(() => props.open, (v) => {
  if (v) {
    error.value = ''
    loadPickers()
    form.value = props.org ? { ...blank(), ...props.org } : blank()
  }
})

const submit = async () => {
  if (!form.value.name.trim()) { error.value = 'Name is required.'; return }
  saving.value = true; error.value = ''
  try {
    const payload = { ...form.value }
    if (editing.value) await updateOrganization(props.org.id, payload)
    else await createOrganization(payload)
    emit('saved')
  } catch (e) { error.value = e?.response?.data?.detail || 'Save failed.' }
  finally { saving.value = false }
}
const remove = async () => {
  saving.value = true; error.value = ''
  try { await deleteOrganization(props.org.id); emit('saved') }
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
.sd-check { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--sd-text-secondary); }
.sd-form-error { color: var(--sd-danger); font-size: 12.5px; margin: 0; }
.sd-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 11px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); }
.sd-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.sd-btn-primary { border: none; background: var(--sd-grad-hero); color: #1a1206; }
[data-theme="light"] .sd-btn-primary { color: #fff8ec; }
.sd-btn-danger { color: var(--sd-danger); border-color: color-mix(in srgb, var(--sd-danger) 35%, transparent); }
</style>
