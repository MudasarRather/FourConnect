<template>
  <Teleport to="body">
    <Transition name="modal-backdrop">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <Transition name="modal-content" appear>
          <div v-if="modelValue" class="modal-container glass-panel" :class="actionClass">

            <!-- Icon-led hero -->
            <div class="modal-icon" :class="actionClass">
              <component :is="iconComponent" :size="28" stroke-width="2" />
            </div>

            <h3 class="modal-title">{{ title }}</h3>
            <p class="modal-message">{{ description }}</p>

            <!-- Reason textarea -->
            <div class="reason-wrap">
              <label class="reason-label">
                Reason
                <span class="req">*</span>
              </label>
              <textarea
                v-model="reason"
                class="reason-input"
                placeholder="Provide a reason..."
                rows="4"
                :class="{ 'has-error': showError }"
                autofocus
              ></textarea>
              <span v-if="showError" class="err-msg">A reason is required.</span>
            </div>

            <div class="modal-actions">
              <button class="btn cancel" @click="close" :disabled="isSubmitting">
                Cancel
              </button>
              <button
                class="btn confirm"
                :class="actionClass"
                @click="confirm"
                :disabled="!reason.trim() || isSubmitting"
              >
                <Loader2 v-if="isSubmitting" :size="16" class="spin" />
                <span>{{ isSubmitting ? 'Processing...' : confirmText }}</span>
              </button>
            </div>

          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Trash2, UserMinus, XCircle, AlertTriangle, Loader2 } from 'lucide-vue-next'

const props = defineProps({
  modelValue: Boolean,
  isSubmitting: Boolean,
  title: { type: String, default: 'Action Required' },
  description: { type: String, default: 'Please provide a reason.' },
  confirmText: { type: String, default: 'Confirm' }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const reason = ref('')
const showError = ref(false)

// Pick icon + accent based on title (avoids needing a new prop)
const iconComponent = computed(() => {
  const t = (props.title || '').toLowerCase()
  if (t.includes('delete')) return Trash2
  if (t.includes('remove')) return UserMinus
  if (t.includes('decline')) return XCircle
  return AlertTriangle
})

const actionClass = computed(() => {
  const t = (props.title || '').toLowerCase()
  if (t.includes('delete')) return 'danger'
  if (t.includes('remove')) return 'warn'
  if (t.includes('decline')) return 'danger'
  return 'warn'
})

// Reset state whenever the modal opens
watch(() => props.modelValue, (open) => {
  if (open) {
    reason.value = ''
    showError.value = false
  }
})

const close = () => {
  emit('update:modelValue', false)
  reason.value = ''
  showError.value = false
}

const confirm = () => {
  if (!reason.value.trim()) {
    showError.value = true
    return
  }
  emit('confirm', reason.value.trim())
}
</script>

<style scoped>
/* Overlay */
.modal-overlay {
  position: fixed; inset: 0; z-index: 20000;
  background: rgba(0, 0, 0, 0.62);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
}

/* Container — premium centered card (recruitment ConfirmationModal style) */
.modal-container {
  width: 100%; max-width: 460px;
  background: rgba(20, 18, 14, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 32px 28px 24px;
  display: flex; flex-direction: column; align-items: center;
  text-align: center;
  box-shadow:
    0 40px 90px rgba(0, 0, 0, 0.55),
    0 12px 24px rgba(0, 0, 0, 0.30),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  position: relative;
  overflow: hidden;
}
.modal-container::before {
  content: "";
  position: absolute; inset: 0;
  background: radial-gradient(ellipse at top, rgba(245, 158, 11, 0.08), transparent 60%);
  pointer-events: none;
}

/* Icon hero */
.modal-icon {
  width: 64px; height: 64px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 18px;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.06) inset, 0 10px 30px rgba(0, 0, 0, 0.30);
  position: relative;
  z-index: 1;
}
.modal-icon.danger {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.20), rgba(220, 38, 38, 0.10));
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.30);
}
.modal-icon.warn {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.20), rgba(217, 119, 6, 0.10));
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.30);
}

.modal-title {
  font-size: 18px; font-weight: 700; color: #f5f5f7;
  margin: 0 0 8px 0; letter-spacing: -0.01em;
  position: relative; z-index: 1;
}
.modal-message {
  font-size: 13px; line-height: 1.55;
  color: rgba(255, 255, 255, 0.65);
  margin: 0 0 22px 0;
  max-width: 360px;
  position: relative; z-index: 1;
}

/* Reason area */
.reason-wrap {
  width: 100%; text-align: left;
  display: flex; flex-direction: column; gap: 6px;
  margin-bottom: 22px;
  position: relative; z-index: 1;
}
.reason-label {
  font-size: 10px; text-transform: uppercase; font-weight: 700;
  color: rgba(255, 255, 255, 0.40);
  letter-spacing: 0.08em;
}
.req { color: #ef4444; margin-left: 2px; }

.reason-input {
  width: 100%; box-sizing: border-box;
  background: rgba(0, 0, 0, 0.30);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 10px;
  padding: 12px;
  color: #f5f5f7;
  font-size: 13px; font-family: inherit;
  resize: vertical; min-height: 80px;
  outline: none;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
}
.reason-input:focus {
  border-color: #f59e0b;
  background: rgba(0, 0, 0, 0.40);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.12);
}
.reason-input.has-error { border-color: #ef4444; }
.err-msg { font-size: 11px; color: #f87171; margin-top: 4px; }

/* Footer buttons */
.modal-actions {
  display: flex; gap: 10px; width: 100%;
  position: relative; z-index: 1;
}

.btn {
  flex: 1;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 13px; font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.2s, color 0.2s, border-color 0.2s, transform 0.15s, box-shadow 0.2s;
}

.btn.cancel {
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.70);
  border-color: rgba(255, 255, 255, 0.08);
}
.btn.cancel:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.btn.confirm.danger {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: #fff;
  box-shadow: 0 6px 18px rgba(239, 68, 68, 0.30);
}
.btn.confirm.danger:hover:not(:disabled) {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  box-shadow: 0 10px 24px rgba(220, 38, 38, 0.40);
  transform: translateY(-1px);
}
.btn.confirm.warn {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fff;
  box-shadow: 0 6px 18px rgba(245, 158, 11, 0.30);
}
.btn.confirm.warn:hover:not(:disabled) {
  background: linear-gradient(135deg, #d97706, #b45309);
  box-shadow: 0 10px 24px rgba(217, 119, 6, 0.40);
  transform: translateY(-1px);
}

.btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Transitions */
.modal-backdrop-enter-active, .modal-backdrop-leave-active { transition: opacity 0.25s ease; }
.modal-backdrop-enter-from, .modal-backdrop-leave-to { opacity: 0; }

.modal-content-enter-active { transition: all 0.30s cubic-bezier(0.16, 1, 0.3, 1); }
.modal-content-leave-active { transition: all 0.20s cubic-bezier(0.16, 1, 0.3, 1); }
.modal-content-enter-from { opacity: 0; transform: scale(0.95) translateY(10px); }
.modal-content-leave-to { opacity: 0; transform: scale(0.95) translateY(10px); }

/* ═════════ LIGHT THEME OVERRIDES — frosted cream, transparency preserved ═════ */
[data-theme="light"] .modal-overlay {
  background: rgba(26, 20, 16, 0.32);
  backdrop-filter: blur(10px);
}

[data-theme="light"] .modal-container {
  background: rgba(255, 250, 240, 0.72);
  border-color: rgba(217, 119, 6, 0.22);
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  box-shadow:
    0 40px 90px rgba(40, 25, 10, 0.26),
    0 12px 24px rgba(40, 25, 10, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.50);
  color: var(--text-primary);
}
[data-theme="light"] .modal-container::before {
  background: radial-gradient(ellipse at top, rgba(217, 119, 6, 0.10), transparent 60%);
}

[data-theme="light"] .modal-icon.danger {
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.18), rgba(220, 38, 38, 0.08));
  color: #b91c1c;
  border-color: rgba(220, 38, 38, 0.32);
  box-shadow: 0 10px 30px rgba(220, 38, 38, 0.20);
}
[data-theme="light"] .modal-icon.warn {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.20), rgba(217, 119, 6, 0.08));
  color: #b45309;
  border-color: rgba(217, 119, 6, 0.36);
  box-shadow: 0 10px 30px rgba(217, 119, 6, 0.20);
}

[data-theme="light"] .modal-title {
  background: linear-gradient(120deg, #92400e 0%, #d97706 60%, #b45309 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
[data-theme="light"] .modal-message { color: #6b5840; }

[data-theme="light"] .reason-label { color: #b45309; }
[data-theme="light"] .req { color: #dc2626; }

[data-theme="light"] .reason-input {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(217, 119, 6, 0.22);
  color: var(--text-primary);
}
[data-theme="light"] .reason-input::placeholder { color: rgba(26, 20, 16, 0.40); }
[data-theme="light"] .reason-input:focus {
  background: rgba(255, 246, 226, 0.92);
  border-color: #d97706;
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.14);
}
[data-theme="light"] .reason-input.has-error { border-color: #dc2626; }
[data-theme="light"] .err-msg { color: #dc2626; }

[data-theme="light"] .btn.cancel {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(217, 119, 6, 0.22);
  color: #6b5840;
}
[data-theme="light"] .btn.cancel:hover:not(:disabled) {
  background: rgba(217, 119, 6, 0.10);
  color: #92400e;
  border-color: rgba(217, 119, 6, 0.40);
}

[data-theme="light"] .btn.confirm.danger {
  background: linear-gradient(135deg, #dc2626, #991b1b);
  box-shadow: 0 6px 18px rgba(220, 38, 38, 0.30);
}
[data-theme="light"] .btn.confirm.danger:hover:not(:disabled) {
  background: linear-gradient(135deg, #b91c1c, #7f1d1d);
  box-shadow: 0 10px 24px rgba(185, 28, 28, 0.40);
}
[data-theme="light"] .btn.confirm.warn {
  background: linear-gradient(135deg, #d97706, #b45309);
  box-shadow: 0 6px 18px rgba(217, 119, 6, 0.30);
}
[data-theme="light"] .btn.confirm.warn:hover:not(:disabled) {
  background: linear-gradient(135deg, #c2410c, #92400e);
  box-shadow: 0 10px 24px rgba(217, 119, 6, 0.40);
}
</style>
