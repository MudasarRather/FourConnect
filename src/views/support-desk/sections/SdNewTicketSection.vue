<template>
  <div class="sd-new">
    <Motion
      as="div" class="sd-new-card sd-card"
      :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }"
    >
      <div v-if="done" class="sd-done">
        <span class="sd-done-ico"><CheckCircle2 :size="32" /></span>
        <h3>Ticket raised</h3>
        <p>Your request <b class="sd-mono">{{ done.ticket_number }}</b> is in. We'll notify you on updates.</p>
        <div class="sd-done-actions">
          <button class="sd-btn sd-btn-primary" @click="$emit('go', 'tickets')">View my tickets</button>
          <button class="sd-btn" @click="reset">Raise another</button>
        </div>
      </div>

      <form v-else class="sd-form" @submit.prevent="submit">
        <h3 class="sd-new-title">Raise a support ticket</h3>
        <label class="sd-field"><span class="sd-label">Subject <em>*</em></span>
          <input v-model="form.subject" class="sd-input" placeholder="Brief summary of your issue" /></label>
        <label class="sd-field"><span class="sd-label">Description</span>
          <textarea v-model="form.description" rows="5" class="sd-input" placeholder="Tell us what's happening, with as much detail as you can…" /></label>
        <div class="sd-grid2">
          <div class="sd-field"><span class="sd-label">Priority</span><SdSelect v-model="form.priority" :options="PRIORITIES" /></div>
          <div class="sd-field"><span class="sd-label">Type</span><SdSelect v-model="form.ticket_type" :options="TICKET_TYPES" /></div>
        </div>
        <p v-if="error" class="sd-form-error">{{ error }}</p>
        <button type="submit" class="sd-btn sd-btn-primary sd-submit" :disabled="saving || !form.subject.trim()">
          <Send :size="15" /> {{ saving ? 'Submitting…' : 'Submit ticket' }}
        </button>
      </form>
    </Motion>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Motion } from 'motion-v'
import { Send, CheckCircle2 } from 'lucide-vue-next'
import SdSelect from '../components/SdSelect.vue'
import { createMyTicket, PRIORITIES, TICKET_TYPES } from '@/composables/useSupportDesk'

defineProps({ dashboard: { type: Object, default: null }, loading: { type: Boolean, default: false }, createSignal: { type: Number, default: 0 } })
const emit = defineEmits(['go', 'changed'])

const blank = () => ({ subject: '', description: '', priority: 'medium', ticket_type: 'incident' })
const form = ref(blank())
const saving = ref(false); const error = ref(''); const done = ref(null)

const submit = async () => {
  if (!form.value.subject.trim()) { error.value = 'Subject is required.'; return }
  saving.value = true; error.value = ''
  try {
    const payload = { subject: form.value.subject.trim(), description: form.value.description || undefined, priority: form.value.priority, ticket_type: form.value.ticket_type }
    done.value = await createMyTicket(payload)
    emit('changed')
  } catch (e) { error.value = e?.response?.data?.detail || 'Failed to submit ticket.' }
  finally { saving.value = false }
}
const reset = () => { done.value = null; form.value = blank(); error.value = '' }
</script>

<style scoped>
.sd-new { display: grid; place-items: start center; padding-top: 8px; }
.sd-new-card { width: min(620px, 100%); padding: 28px 28px 30px; }
.sd-new-title { font-size: 18px; font-weight: 800; color: var(--sd-text); margin: 0 0 18px; }
.sd-form { display: flex; flex-direction: column; gap: 14px; }
.sd-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 520px) { .sd-grid2 { grid-template-columns: 1fr; } }
.sd-field { display: flex; flex-direction: column; gap: 7px; }
.sd-label { font-size: 12px; font-weight: 600; color: var(--sd-text-secondary); }
.sd-label em { color: var(--sd-danger); font-style: normal; }
.sd-input { width: 100%; padding: 11px 13px; border-radius: 11px; font-size: 14px; font-family: inherit; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text); }
.sd-input:focus { outline: none; border-color: var(--sd-amber-border); box-shadow: 0 0 0 3px var(--sd-amber-soft); }
textarea.sd-input { resize: vertical; }
.sd-form-error { color: var(--sd-danger); font-size: 12.5px; margin: 0; padding: 9px 12px; border-radius: 9px; background: var(--sd-danger-soft); }
.sd-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); }
.sd-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.sd-btn-primary { border: none; background: var(--sd-grad-hero); color: #1a1206; }
[data-theme="light"] .sd-btn-primary { color: #fff8ec; }
.sd-submit { width: 100%; margin-top: 4px; }
.sd-done { text-align: center; padding: 20px 8px; }
.sd-done-ico { display: inline-grid; place-items: center; width: 64px; height: 64px; border-radius: 18px; color: var(--sd-success); background: var(--sd-success-soft); margin-bottom: 16px; }
.sd-done h3 { font-size: 20px; font-weight: 800; color: var(--sd-text); margin: 0 0 8px; }
.sd-done p { font-size: 14px; color: var(--sd-text-secondary); margin: 0 0 20px; }
.sd-done-actions { display: flex; gap: 10px; justify-content: center; }
</style>
