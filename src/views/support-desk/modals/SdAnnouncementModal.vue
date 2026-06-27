<template>
  <SdModalShell :open="open" :eyebrow="editing ? 'EDIT ANNOUNCEMENT' : 'NEW ANNOUNCEMENT'"
    :title="editing ? form.title || 'Announcement' : 'Post an announcement'" width="640px" @close="$emit('close')">
    <form class="sd-form" @submit.prevent="submit">
      <label class="sd-field"><span class="sd-label">Title <em>*</em></span>
        <input v-model="form.title" class="sd-input" placeholder="Scheduled maintenance window" /></label>
      <div class="sd-grid2">
        <label class="sd-field"><span class="sd-label">Category</span>
          <input v-model="form.category" class="sd-input" placeholder="Maintenance / Release / Notice" /></label>
        <div class="sd-field">
          <span class="sd-label">Audience</span>
          <SdSelect v-model="form.audience" :options="audienceOpts" placeholder="All" />
        </div>
      </div>
      <div v-if="form.audience === 'organization'" class="sd-field">
        <span class="sd-label">Target organization</span>
        <SdSelect v-model="form.target_org_id" :options="orgOpts" placeholder="Select organization" />
      </div>
      <label class="sd-field"><span class="sd-label">Description</span>
        <textarea v-model="form.description" rows="4" class="sd-input" placeholder="Details visible to the targeted audience…" /></label>
      <div class="sd-grid2">
        <label class="sd-field"><span class="sd-label">Publish date</span>
          <input v-model="form.publish_date" type="date" class="sd-input" /></label>
        <label class="sd-field"><span class="sd-label">Expiry date</span>
          <input v-model="form.expiry_date" type="date" class="sd-input" /></label>
      </div>
      <label class="sd-check"><input type="checkbox" v-model="form.is_active" /> Active</label>
      <p v-if="error" class="sd-form-error">{{ error }}</p>
    </form>
    <template #footer>
      <button v-if="editing" class="sd-btn sd-btn-danger" type="button" :disabled="saving" @click="remove">Delete</button>
      <span style="flex:1" />
      <button class="sd-btn" type="button" @click="$emit('close')">Cancel</button>
      <button class="sd-btn sd-btn-primary" type="button" :disabled="saving || !form.title.trim()" @click="submit">
        {{ saving ? 'Saving…' : (editing ? 'Save changes' : 'Publish') }}
      </button>
    </template>
  </SdModalShell>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import SdModalShell from '../components/SdModalShell.vue'
import SdSelect from '../components/SdSelect.vue'
import {
  createAnnouncement, updateAnnouncement, deleteAnnouncement,
  loadPickers, usePickers,
} from '@/composables/useSupportDesk'

const props = defineProps({ open: Boolean, announcement: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved'])

const pickers = usePickers()
const saving = ref(false)
const error = ref('')
const editing = computed(() => !!props.announcement)

const audienceOpts = [
  { value: 'all', label: 'All' },
  { value: 'organization', label: 'Organization' },
  { value: 'contract', label: 'Contract' },
  { value: 'users', label: 'Users' },
]
const orgOpts = computed(() => (pickers.organizations || []).map(o => ({ value: o.id, label: o.name })))

const toDateInput = (d) => (d ? String(d).slice(0, 10) : '')

const blank = () => ({
  title: '', category: '', description: '', audience: 'all',
  target_org_id: null, publish_date: '', expiry_date: '', is_active: true,
})
const form = ref(blank())

watch(() => props.open, (v) => {
  if (v) {
    error.value = ''
    loadPickers()
    if (props.announcement) {
      const a = props.announcement
      form.value = {
        ...blank(),
        ...a,
        publish_date: toDateInput(a.publish_date),
        expiry_date: toDateInput(a.expiry_date),
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
    payload.publish_date = payload.publish_date || null
    payload.expiry_date = payload.expiry_date || null
    if (payload.audience !== 'organization') payload.target_org_id = null
    if (editing.value) await updateAnnouncement(props.announcement.id, payload)
    else await createAnnouncement(payload)
    emit('saved')
  } catch (e) { error.value = e?.response?.data?.detail || 'Save failed.' }
  finally { saving.value = false }
}
const remove = async () => {
  saving.value = true; error.value = ''
  try { await deleteAnnouncement(props.announcement.id); emit('saved') }
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
