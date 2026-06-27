<template>
  <div class="sp-portal">
    <div class="sp-toggle"><ThemeToggle /></div>

    <div class="sp-shell">
      <SdLiquidBasin
        eyebrow="CLIENT SUPPORT PORTAL"
        title="How can we help?"
        subtitle="Raise a request and our team will get back to you. Track everything with the link we give you."
        variant="user"
        :metrics="[]"
        :actions="[]"
        :priority-counts="ambient"
      />

      <!-- Success state -->
      <Motion
        v-if="result"
        as="div"
        class="sp-success sd-card"
        :initial="{ opacity: 0, y: 18 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }"
      >
        <span class="sp-success-ico"><CheckCircle2 :size="34" /></span>
        <h2>Request received</h2>
        <p>Your ticket <b class="sd-mono">{{ result.ticket_number }}</b> has been logged. Keep this tracking link to follow progress and reply.</p>
        <div class="sp-track-row">
          <input class="sp-track-link" :value="trackUrl" readonly @focus="$event.target.select()" />
          <button class="sp-mini" type="button" @click="copyLink"><Copy :size="14" /> {{ copied ? 'Copied' : 'Copy' }}</button>
        </div>
        <div class="sp-success-actions">
          <button class="sp-submit" type="button" @click="goTrack"><ArrowRight :size="16" /> Track this ticket</button>
          <button class="sp-ghost" type="button" @click="reset">Raise another</button>
        </div>
      </Motion>

      <!-- Form -->
      <Motion
        v-else
        as="form"
        class="sp-form sd-card"
        :initial="{ opacity: 0, y: 18 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }"
        @submit.prevent="onSubmit"
      >
        <h2 class="sp-form-title">Submit a request</h2>
        <div class="sp-grid">
          <label class="sp-field">
            <span>Organization code <em>*</em></span>
            <input v-model="form.orgCode" type="text" placeholder="e.g. ACME-01" autocomplete="off" />
          </label>
          <label class="sp-field">
            <span>Your email <em>*</em></span>
            <input v-model="form.email" type="email" placeholder="you@company.com" autocomplete="email" />
          </label>
        </div>
        <div class="sp-grid">
          <label class="sp-field">
            <span>Your name</span>
            <input v-model="form.contact_name" type="text" placeholder="Full name" />
          </label>
          <label class="sp-field">
            <span>Phone</span>
            <input v-model="form.contact_phone" type="text" placeholder="Optional" />
          </label>
        </div>
        <label class="sp-field">
          <span>Subject <em>*</em></span>
          <input v-model="form.subject" type="text" placeholder="Brief summary of the issue" />
        </label>
        <label class="sp-field">
          <span>Priority</span>
          <div class="sp-priority">
            <button v-for="p in priorities" :key="p.key" type="button" class="sp-pri" :class="{ active: form.priority === p.key }" :style="{ '--pri': p.color }" @click="form.priority = p.key">{{ p.label }}</button>
          </div>
        </label>
        <label class="sp-field">
          <span>Description</span>
          <textarea v-model="form.description" rows="5" placeholder="Tell us what's happening, with as much detail as you can." />
        </label>

        <p v-if="error" class="sp-error">{{ error }}</p>

        <button type="submit" class="sp-submit" :disabled="saving || !valid">
          <Send :size="16" /> {{ saving ? 'Submitting…' : 'Submit request' }}
        </button>
        <p class="sp-fineprint">Powered by Fourreck Support Desk · this portal connects to fourreck.com</p>
      </Motion>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Motion } from 'motion-v'
import { Send, CheckCircle2, ArrowRight, Copy } from 'lucide-vue-next'
import SdLiquidBasin from '../support-desk/components/SdLiquidBasin.vue'
import ThemeToggle from '@/components/common/ThemeToggle.vue'
import { publicSubmitTicket } from '@/composables/useSupportDesk'
import '../../styles/support-desk-theme.css'  // global token + keyframe injection (public page)

const router = useRouter()
const ambient = { critical: 1, urgent: 2, high: 3, medium: 4, low: 3 }
const priorities = [
  { key: 'low', label: 'Low', color: 'var(--sd-pri-low)' },
  { key: 'medium', label: 'Medium', color: 'var(--sd-pri-medium)' },
  { key: 'high', label: 'High', color: 'var(--sd-pri-high)' },
  { key: 'urgent', label: 'Urgent', color: 'var(--sd-pri-urgent)' },
  { key: 'critical', label: 'Critical', color: 'var(--sd-pri-critical)' },
]
const blank = () => ({ orgCode: '', email: '', contact_name: '', contact_phone: '', subject: '', priority: 'medium', description: '' })
const form = ref(blank())
const error = ref('')
const saving = ref(false)
const result = ref(null)
const copied = ref(false)

const valid = computed(() => form.value.orgCode.trim() && form.value.email.trim() && form.value.subject.trim())
const trackUrl = computed(() => (result.value ? `${window.location.origin}/support/portal/${result.value.public_token}` : ''))

const onSubmit = async () => {
  if (!valid.value) { error.value = 'Organization code, email and subject are required.'; return }
  saving.value = true; error.value = ''
  try {
    result.value = await publicSubmitTicket({
      org_code: form.value.orgCode.trim(),
      email: form.value.email.trim(),
      subject: form.value.subject.trim(),
      description: form.value.description || undefined,
      priority: form.value.priority,
      contact_name: form.value.contact_name || undefined,
      contact_phone: form.value.contact_phone || undefined,
    })
  } catch (e) {
    error.value = e?.response?.data?.detail || 'Could not submit your request. Please check your organization code.'
  } finally {
    saving.value = false
  }
}
const goTrack = () => { if (result.value) router.push(`/support/portal/${result.value.public_token}`) }
const reset = () => { result.value = null; form.value = blank(); error.value = '' }
const copyLink = async () => {
  try { await navigator.clipboard.writeText(trackUrl.value); copied.value = true; setTimeout(() => (copied.value = false), 1800) } catch { /* noop */ }
}
</script>

<style scoped>
@import '../../styles/support-desk-theme.css';

.sp-portal {
  min-height: 100vh;
  background: radial-gradient(120% 90% at 50% -10%, rgba(251, 146, 60, 0.08), transparent 55%), var(--sd-canvas);
  color: var(--sd-text); padding: 40px 20px 64px;
}
.sp-toggle { position: fixed; top: 18px; right: 20px; z-index: 10; }
.sp-shell { max-width: 760px; margin: 0 auto; }

.sp-form, .sp-success { margin-top: 18px; padding: 28px 26px; }
.sp-form-title { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 18px; color: var(--sd-text); }
.sp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 560px) { .sp-grid { grid-template-columns: 1fr; } }

.sp-field { display: flex; flex-direction: column; gap: 7px; margin-bottom: 16px; }
.sp-field > span { font-size: 12px; font-weight: 600; color: var(--sd-text-secondary); }
.sp-field em { color: var(--sd-danger); font-style: normal; }
.sp-field input, .sp-field textarea {
  width: 100%; padding: 11px 13px; border-radius: 11px; border: 1px solid var(--sd-border-strong);
  background: var(--sd-surface-glass); color: var(--sd-text); font-size: 14px; font-family: inherit;
}
.sp-field input::placeholder, .sp-field textarea::placeholder { color: var(--sd-text-dim); }
.sp-field input:focus, .sp-field textarea:focus { outline: none; border-color: var(--sd-amber-border); box-shadow: 0 0 0 3px var(--sd-amber-soft); }

.sp-priority { display: flex; flex-wrap: wrap; gap: 8px; }
.sp-pri { padding: 8px 14px; border-radius: 999px; cursor: pointer; border: 1px solid var(--sd-border-strong); background: transparent; color: var(--sd-text-secondary); font-size: 12.5px; font-weight: 600; transition: all 0.2s var(--sd-spring); }
.sp-pri:hover { color: var(--sd-text); border-color: var(--pri); }
.sp-pri.active { color: #1a1206; background: var(--pri); border-color: var(--pri); }
[data-theme="light"] .sp-pri.active { color: #fff8ec; }

.sp-error { font-size: 12.5px; color: var(--sd-danger); margin: 0 0 14px; padding: 10px 12px; border-radius: 10px; background: var(--sd-danger-soft); border: 1px solid color-mix(in srgb, var(--sd-danger) 30%, transparent); }
.sp-submit { display: inline-flex; align-items: center; gap: 9px; padding: 12px 22px; border-radius: 12px; border: none; cursor: pointer; background: var(--sd-grad-hero); color: #1a1206; font-size: 14px; font-weight: 700; box-shadow: 0 8px 24px rgba(251, 146, 60, 0.28); transition: transform 0.2s var(--sd-spring); }
.sp-submit:hover { transform: translateY(-2px); }
.sp-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
[data-theme="light"] .sp-submit { color: #fff8ec; }
.sp-fineprint { margin: 16px 0 0; font-size: 11px; color: var(--sd-text-dim); font-family: var(--sd-mono); }

.sp-success { text-align: center; }
.sp-success-ico { display: inline-grid; place-items: center; width: 64px; height: 64px; border-radius: 18px; color: var(--sd-success); background: var(--sd-success-soft); margin-bottom: 16px; }
.sp-success h2 { font-size: 22px; font-weight: 800; color: var(--sd-text); margin: 0 0 10px; }
.sp-success p { font-size: 14px; color: var(--sd-text-secondary); margin: 0 0 18px; }
.sp-track-row { display: flex; gap: 8px; max-width: 480px; margin: 0 auto 18px; }
.sp-track-link { flex: 1; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--sd-border-strong); background: var(--sd-surface-glass); color: var(--sd-text-secondary); font-size: 12.5px; font-family: var(--sd-mono); }
.sp-mini { display: inline-flex; align-items: center; gap: 6px; padding: 10px 13px; border-radius: 10px; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); font-size: 12.5px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.sp-success-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
.sp-ghost { padding: 12px 20px; border-radius: 12px; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); font-size: 14px; font-weight: 600; cursor: pointer; }
</style>
