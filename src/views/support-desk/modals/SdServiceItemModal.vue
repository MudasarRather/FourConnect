<template>
  <SdModalShell :open="open" :eyebrow="editing ? 'EDIT SERVICE' : 'NEW SERVICE'"
    :title="editing ? (form.name || 'Service item') : 'Add a catalog service'" width="620px" @close="$emit('close')">
    <form class="sd-form" @submit.prevent="submit">
      <label class="sd-field"><span class="sd-label">Name <em>*</em></span>
        <input v-model="form.name" class="sd-input" placeholder="New laptop provisioning" /></label>

      <label class="sd-field"><span class="sd-label">Description</span>
        <textarea v-model="form.description" rows="3" class="sd-input" placeholder="What this service delivers…" /></label>

      <div class="sd-grid2">
        <label class="sd-field"><span class="sd-label">Category</span>
          <input v-model="form.category" class="sd-input" placeholder="Hardware / Access / Software" /></label>
        <label class="sd-field"><span class="sd-label">Estimated delivery (hours)</span>
          <input v-model.number="form.estimated_delivery_hours" type="number" min="0" step="1" class="sd-input" placeholder="48" /></label>
      </div>

      <div class="sd-grid2">
        <label class="sd-field"><span class="sd-label">Cost</span>
          <input v-model.number="form.cost" type="number" min="0" step="0.01" class="sd-input" placeholder="0.00" /></label>
        <div class="sd-field sd-checks">
          <label class="sd-check"><input type="checkbox" v-model="form.approval_required" /> Approval required</label>
          <label class="sd-check"><input type="checkbox" v-model="form.is_active" /> Active</label>
        </div>
      </div>

      <p v-if="error" class="sd-form-error">{{ error }}</p>
    </form>
    <template #footer>
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
import axios from 'axios'
import { API } from '@/utils/api'
import SdModalShell from '../components/SdModalShell.vue'
import { createServiceItem } from '@/composables/useSupportDesk'

// NOTE: useSupportDesk.js does not export `updateServiceItem` (and we must not
// modify that shared file). Inlined here using the same path-aware auth header
// + API base pattern the composable itself uses.
const _authHeader = () => {
  const isUser = typeof window !== 'undefined' && window.location?.pathname?.startsWith('/user')
  const primary = isUser ? 'user_token' : 'admin_token'
  const fallback = isUser ? 'admin_token' : 'user_token'
  const t = localStorage.getItem(primary) || localStorage.getItem(fallback)
  return t ? { Authorization: `Bearer ${t}` } : {}
}
const updateServiceItem = async (id, body) =>
  (await axios.patch(`${API}/support-desk/service-items/${id}`, body, { headers: _authHeader() })).data

const props = defineProps({
  open: { type: Boolean, default: false },
  item: { type: Object, default: null },
})
const emit = defineEmits(['close', 'saved'])

const saving = ref(false)
const error = ref('')
const editing = computed(() => !!props.item)

const blank = () => ({
  name: '', description: '', category: '',
  approval_required: false, estimated_delivery_hours: null, cost: null, is_active: true,
})
const form = ref(blank())

watch(() => props.open, (v) => {
  if (!v) return
  error.value = ''
  form.value = props.item ? { ...blank(), ...props.item } : blank()
})

const submit = async () => {
  if (!form.value.name.trim()) { error.value = 'Name is required.'; return }
  saving.value = true; error.value = ''
  try {
    const payload = { ...form.value }
    if (editing.value) await updateServiceItem(props.item.id, payload)
    else await createServiceItem(payload)
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
.sd-input { width: 100%; padding: 10px 13px; border-radius: 11px; font-size: 14px; font-family: inherit; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text); resize: vertical; }
.sd-input:focus { outline: none; border-color: var(--sd-amber-border); box-shadow: 0 0 0 3px var(--sd-amber-soft); }
.sd-checks { justify-content: center; gap: 10px; }
.sd-check { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--sd-text-secondary); }
.sd-form-error { color: var(--sd-danger); font-size: 12.5px; margin: 0; }
.sd-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 11px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); }
.sd-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.sd-btn-primary { border: none; background: var(--sd-grad-hero); color: #1a1206; }
[data-theme="light"] .sd-btn-primary { color: #fff8ec; }
</style>
