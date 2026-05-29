<template>
  <Teleport to="body">
    <div class="ssd-modal-overlay" @click.self="$emit('close')">
      <Motion as="div"
        class="ssd-modal-card"
        :initial="{ opacity: 0, y: 20, scale: 0.96 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :transition="{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }"
      >
        <span class="modal-aurora" aria-hidden="true" />

        <header class="modal-head">
          <div>
            <span class="modal-eyebrow"><span class="modal-eyebrow-dot" />Ask HR</span>
            <h3 class="modal-title">Request a Document</h3>
            <p class="modal-sub">Ask HR to issue an official letter or certificate. You'll receive it once HR fulfils your request.</p>
          </div>
          <button class="modal-close" @click="$emit('close')" aria-label="Close"><X :size="18" /></button>
        </header>

        <div class="modal-body">
          <!-- Type picker — grid of cards -->
          <div class="type-grid">
            <button v-for="t in REQUEST_TYPES" :key="t.key"
              type="button"
              class="type-card"
              :class="{ active: form.request_type === t.key }"
              @click="form.request_type = t.key"
            >
              <span class="type-icon">
                <component :is="iconFor(t.key)" :size="16" />
              </span>
              <span class="type-text">
                <strong>{{ t.label }}</strong>
                <span class="type-eta">{{ t.eta }}</span>
              </span>
              <span class="type-tag">{{ t.tag }}</span>
            </button>
          </div>

          <div class="form-stack">
            <label v-if="form.request_type === 'CUSTOM'" class="form-field">
              <span class="form-label">Custom Title <span class="req">*</span></span>
              <input type="text" v-model="form.custom_title" maxlength="160"
                placeholder="e.g. Internship completion verification" required />
            </label>

            <label class="form-field">
              <span class="form-label">Reason / Description <span class="req">*</span></span>
              <textarea v-model="form.reason" rows="4" maxlength="2000" required
                placeholder="Briefly tell HR why you need this document and any specific details to include." />
            </label>

            <div class="form-row">
              <label class="form-field">
                <span class="form-label">Purpose <span class="req">*</span></span>
                <input type="text" v-model="form.purpose" maxlength="120" required
                  placeholder="e.g. Visa application, Bank loan, New job" />
              </label>
              <label class="form-field">
                <span class="form-label">Additional Notes</span>
                <input type="text" v-model="form.notes" maxlength="2000"
                  placeholder="Anything else HR should know (optional)" />
              </label>
            </div>
          </div>
        </div>

        <footer class="modal-foot">
          <button class="btn-ghost" @click="$emit('close')" :disabled="submitting">Cancel</button>
          <Motion as="button"
            class="btn-primary"
            :whileHover="{ y: -1, scale: 1.02 }"
            :whileTap="{ scale: 0.96 }"
            :disabled="!canSubmit || submitting"
            @click="onSubmit"
          >
            <span v-if="submitting" class="spinner" />
            <Send v-else :size="13" />
            <span>{{ submitting ? 'Submitting…' : 'Send Request' }}</span>
          </Motion>
        </footer>

        <!-- Wax-seal flourish on success -->
        <div v-if="success" class="seal-overlay" aria-hidden="true">
          <Motion as="div"
            class="wax-seal"
            :initial="{ opacity: 0, scale: 0, rotate: -180 }"
            :animate="{ opacity: 1, scale: 1, rotate: 0 }"
            :transition="{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }"
          >
            <svg viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="46" fill="url(#wax-grad)" stroke="#92400e" stroke-width="2" />
              <circle cx="50" cy="50" r="36" fill="none" stroke="#fef3c7" stroke-width="1.2" stroke-dasharray="3 2" />
              <path d="M30 50 L46 64 L72 36" stroke="#fef3c7" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none" />
              <defs>
                <radialGradient id="wax-grad" cx="0.3" cy="0.3" r="0.8">
                  <stop offset="0%" stop-color="#f59e0b" />
                  <stop offset="60%" stop-color="#d97706" />
                  <stop offset="100%" stop-color="#92400e" />
                </radialGradient>
              </defs>
            </svg>
            <p class="seal-msg">Request submitted</p>
          </Motion>
        </div>
      </Motion>
    </div>
  </Teleport>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { Motion } from 'motion-v'
import {
  X, Send, Mail, FileSignature, Award, Shield, Wallet, Briefcase, Plane,
  Stamp, MapPin, FileText,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { REQUEST_TYPES, useSelfServiceDocuments } from '@/composables/useSelfServiceDocuments'

const emit = defineEmits(['close', 'submitted'])
const toast = useToast()
const { createRequest } = useSelfServiceDocuments()

const submitting = ref(false)
const success = ref(false)

const form = reactive({
  request_type: 'EXPERIENCE_LETTER',
  custom_title: '',
  reason: '',
  notes: '',
  purpose: '',
})

const ICON_MAP = {
  EXPERIENCE_LETTER: Mail,
  RELIEVING_LETTER:  FileSignature,
  CONFIRMATION_LETTER: Award,
  APPOINTMENT_LETTER: Briefcase,
  SALARY_CERTIFICATE: Wallet,
  NDA: Shield,
  OFFER_LETTER: FileText,
  ADDRESS_PROOF: MapPin,
  NO_OBJECTION: Plane,
  CUSTOM: Stamp,
}
const iconFor = (k) => ICON_MAP[k] || Mail

// Required: request_type + reason + purpose (and custom_title when type=CUSTOM).
// Optional: additional notes only.
const canSubmit = computed(() => {
  if (!form.request_type) return false
  if (!form.reason.trim()) return false
  if (!form.purpose.trim()) return false
  if (form.request_type === 'CUSTOM' && !form.custom_title.trim()) return false
  return true
})

async function onSubmit() {
  if (!canSubmit.value) return
  submitting.value = true
  try {
    const payload = {
      request_type: form.request_type,
      reason: form.reason.trim(),
      notes: form.notes || undefined,
      purpose: form.purpose || undefined,
      custom_title: form.custom_title || undefined,
    }
    const created = await createRequest(payload)
    success.value = true
    toast.success('Request sent to HR')
    setTimeout(() => {
      emit('submitted', created)
      emit('close')
    }, 1400)
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to send request.')
    submitting.value = false
  }
}
</script>

<style>
@import '../../../../styles/self-service-documents-theme.css';
</style>

<style scoped>
@import './ssd-modal-shared.css';

.type-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
@media (max-width: 540px) { .type-grid { grid-template-columns: 1fr; } }

.type-card {
  position: relative;
  display: flex; align-items: center; gap: 10px;
  padding: 11px 12px;
  border-radius: 12px;
  background: rgba(40, 30, 22, 0.42);
  border: 1px solid rgba(251, 191, 36, 0.22);
  cursor: pointer;
  text-align: left;
  transition: border-color .22s, background .22s, transform .22s var(--ssd-spring);
}
[data-theme="light"] .type-card { background: rgba(255, 250, 240, 0.72); border-color: rgba(180, 83, 9, 0.22); }
.type-card:hover { border-color: rgba(251, 146, 60, 0.55); background: rgba(251, 191, 36, 0.08); transform: translateY(-1px); }
[data-theme="light"] .type-card:hover { background: rgba(251, 191, 36, 0.16); border-color: rgba(194, 65, 12, 0.45); }
.type-card.active {
  border-color: rgba(251, 146, 60, 0.65);
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.18), rgba(251, 146, 60, 0.10));
  box-shadow: 0 12px 24px -10px rgba(251, 146, 60, 0.45);
}
[data-theme="light"] .type-card.active {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.28), rgba(251, 146, 60, 0.18));
}

.type-icon {
  width: 34px; height: 34px;
  flex-shrink: 0;
  border-radius: 10px;
  display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.25), rgba(251, 191, 36, 0.08));
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.35);
}
.type-card.active .type-icon {
  background: linear-gradient(135deg, #fde68a, #fbbf24);
  color: #1f1408;
}

.type-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.type-text strong {
  font-size: 12.5px; font-weight: 700; color: var(--hr-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.type-eta { font-size: 10px; color: var(--hr-text-muted); }

.type-tag {
  font-size: 9px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(251, 191, 36, 0.14);
  color: #fde68a;
}
[data-theme="light"] .type-tag { color: #d97706; background: rgba(251, 191, 36, 0.22); }

/* ─── Wax seal success overlay ─── */
.seal-overlay {
  position: absolute; inset: 0;
  background: radial-gradient(60% 50% at 50% 50%, rgba(22, 16, 12, 0.92), rgba(22, 16, 12, 0.72));
  backdrop-filter: blur(8px);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  z-index: 10;
}
.wax-seal {
  width: 140px; height: 140px;
  filter: drop-shadow(0 22px 40px rgba(146, 64, 14, 0.7));
}
.wax-seal svg { width: 100%; height: 100%; }
.seal-msg {
  margin: 14px 0 0;
  font-size: 14px; font-weight: 800; letter-spacing: 0.3px;
  color: #fde68a;
}
[data-theme="light"] .seal-overlay { background: radial-gradient(60% 50% at 50% 50%, rgba(255, 250, 240, 0.95), rgba(255, 245, 224, 0.82)); }
[data-theme="light"] .seal-msg { color: #92400e; }
</style>
