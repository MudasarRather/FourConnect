<template>
  <SdModalShell :open="open" eyebrow="NEW TICKET" title="Raise a support ticket" width="640px" @close="$emit('close')">
    <form class="sd-form" @submit.prevent="submit">
      <label class="sd-field">
        <span class="sd-label">Subject <em>*</em></span>
        <input v-model="form.subject" type="text" class="sd-input" placeholder="Brief summary of the issue" />
      </label>

      <label class="sd-field">
        <span class="sd-label">Description</span>
        <textarea v-model="form.description" rows="4" class="sd-input" placeholder="What's happening, with as much detail as possible…" />
      </label>

      <div class="sd-grid2">
        <div class="sd-field">
          <span class="sd-label">Priority</span>
          <SdSelect v-model="form.priority" :options="PRIORITIES" />
        </div>
        <div class="sd-field">
          <span class="sd-label">Type</span>
          <SdSelect v-model="form.ticket_type" :options="TICKET_TYPES" />
        </div>
      </div>

      <div class="sd-grid2">
        <div class="sd-field">
          <span class="sd-label">Category</span>
          <SdSelect v-model="form.category_id" :options="categoryOpts" placeholder="Uncategorized" />
        </div>
        <div class="sd-field">
          <span class="sd-label">Source</span>
          <SdSelect v-model="form.source" :options="SOURCES" />
        </div>
      </div>

      <div class="sd-field">
        <span class="sd-label">Organization</span>
        <SdSelect v-model="form.organization_id" :options="orgOpts" placeholder="None (ad-hoc contact)" />
      </div>

      <div class="sd-grid2">
        <label class="sd-field">
          <span class="sd-label">Contact name</span>
          <input v-model="form.contact_name" type="text" class="sd-input" placeholder="Reporter name" />
        </label>
        <label class="sd-field">
          <span class="sd-label">Contact email</span>
          <input v-model="form.contact_email" type="email" class="sd-input" placeholder="reporter@company.com" />
        </label>
      </div>

      <p v-if="error" class="sd-form-error">{{ error }}</p>
    </form>

    <template #footer>
      <button class="sd-btn" type="button" @click="$emit('close')">Cancel</button>
      <button class="sd-btn sd-btn-primary" type="button" :disabled="saving || !form.subject.trim()" @click="submit">
        {{ saving ? 'Creating…' : 'Create ticket' }}
      </button>
    </template>
  </SdModalShell>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import SdModalShell from '../components/SdModalShell.vue'
import SdSelect from '../components/SdSelect.vue'
import {
  createTicket, loadPickers, usePickers,
  PRIORITIES, TICKET_TYPES, SOURCES,
} from '@/composables/useSupportDesk'

const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(['close', 'created'])

const pickers = usePickers()
const saving = ref(false)
const error = ref('')

const blank = () => ({
  subject: '', description: '', priority: 'medium', ticket_type: 'incident',
  category_id: null, source: 'internal', organization_id: null,
  contact_name: '', contact_email: '',
})
const form = ref(blank())

const categoryOpts = computed(() => (pickers.categories || []).map(c => ({ value: c.id, label: c.name })))
const orgOpts = computed(() => (pickers.organizations || []).map(o => ({ value: o.id, label: o.name })))

watch(() => props.open, (v) => {
  if (v) { form.value = blank(); error.value = ''; loadPickers() }
})

const submit = async () => {
  if (!form.value.subject.trim()) { error.value = 'Subject is required.'; return }
  saving.value = true
  error.value = ''
  try {
    const payload = { ...form.value }
    Object.keys(payload).forEach(k => { if (payload[k] === '' || payload[k] == null) delete payload[k] })
    payload.subject = form.value.subject.trim()
    const created = await createTicket(payload)
    emit('created', created)
  } catch (e) {
    error.value = e?.response?.data?.detail || 'Failed to create ticket.'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.sd-form { display: flex; flex-direction: column; gap: 14px; }
.sd-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 520px) { .sd-grid2 { grid-template-columns: 1fr; } }
.sd-field { display: flex; flex-direction: column; gap: 7px; }
.sd-label { font-size: 12px; font-weight: 600; color: var(--sd-text-secondary); }
.sd-label em { color: var(--sd-danger); font-style: normal; }
.sd-input {
  width: 100%; padding: 11px 13px; border-radius: 11px; font-size: 14px; font-family: inherit;
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text);
  transition: border-color 0.2s var(--sd-spring), box-shadow 0.2s var(--sd-spring);
}
.sd-input::placeholder { color: var(--sd-text-dim); }
.sd-input:focus { outline: none; border-color: var(--sd-amber-border); box-shadow: 0 0 0 3px var(--sd-amber-soft); }
textarea.sd-input { resize: vertical; }
.sd-form-error { color: var(--sd-danger); font-size: 12.5px; margin: 0; padding: 9px 12px; border-radius: 9px; background: var(--sd-danger-soft); }

.sd-btn {
  display: inline-flex; align-items: center; gap: 7px; padding: 10px 18px; border-radius: 11px;
  font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid var(--sd-border-strong);
  background: var(--sd-surface); color: var(--sd-text);
}
.sd-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.sd-btn-primary { border: none; background: var(--sd-grad-hero); color: #1a1206; }
[data-theme="light"] .sd-btn-primary { color: #fff8ec; }
</style>
