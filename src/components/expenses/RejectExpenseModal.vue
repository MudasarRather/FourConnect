<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @mousedown.self="close">
        <div class="modal-content glass-panel">
          <!-- Header -->
          <div class="modal-header">
            <div class="header-icon-box danger">
              <AlertOctagon :size="20" class="danger-icon" />
            </div>
            <div class="header-text">
              <h2>Reject Expense</h2>
              <p>Please provide a reason for rejecting this expense</p>
            </div>
            <button class="close-btn" @click="close" type="button">
              <X :size="20" />
            </button>
          </div>

          <!-- Body -->
          <div class="modal-body">
            <label class="input-label">Rejection Reason <span class="required">*</span></label>
            <textarea 
              v-model="reason" 
              placeholder="e.g. Missing valid receipt, amount exceeds policy limit..."
              class="glass-input"
              rows="4"
            ></textarea>
            <span v-if="error" class="error-msg">{{ error }}</span>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button class="btn-cancel" @click="close" :disabled="loading" type="button">Cancel</button>
            <button class="btn-danger" @click="submit" :disabled="loading" type="button">
              <Loader2 v-if="loading" :size="14" class="spin" />
              <span v-else>Reject Expense</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { X, AlertOctagon, Loader2 } from 'lucide-vue-next'

const props = defineProps({
  isOpen: Boolean,
  loading: Boolean
})

const emit = defineEmits(['close', 'confirm'])

const reason = ref('')
const error = ref('')

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    reason.value = ''
    error.value = ''
  }
})

const close = () => {
  if (props.loading) return
  emit('close')
}

const submit = () => {
  if (!reason.value.trim()) {
    error.value = 'A rejection reason is required.'
    return
  }
  error.value = ''
  emit('confirm', reason.value.trim())
}
</script>

<style scoped>
/* ── Overlay ── */
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}

/* ── Modal Content (Glassmorphism) ── */
.modal-content.glass-panel {
  width: 100%; max-width: 480px;
  background: rgba(20, 20, 22, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05);
  display: flex; flex-direction: column;
  color: #f5f5f7;
  overflow: hidden;
}

/* ── Header ── */
.modal-header {
  padding: 24px;
  display: flex; align-items: flex-start; gap: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
}
.header-icon-box.danger {
  width: 40px; height: 40px; flex-shrink: 0;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  color: #ef4444;
}
.header-text h2 {
  font-size: 18px; font-weight: 600; color: #fff; margin: 0 0 4px 0;
}
.header-text p {
  font-size: 13px; color: rgba(255,255,255,0.5); margin: 0; line-height: 1.4;
}
.close-btn {
  position: absolute; top: 20px; right: 20px;
  background: transparent; border: none; color: rgba(255,255,255,0.4);
  cursor: pointer; padding: 4px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.close-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }

/* ── Body ── */
.modal-body {
  padding: 24px;
  display: flex; flex-direction: column; gap: 8px;
}
.input-label {
  font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.7);
  letter-spacing: 0.02em; text-transform: uppercase;
}
.required { color: #ef4444; }

.glass-input {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 12px 14px;
  color: #fff; font-size: 14px;
  width: 100%; box-sizing: border-box;
  font-family: inherit;
  transition: all 0.2s;
  resize: vertical;
}
.glass-input:focus {
  outline: none; border-color: rgba(239, 68, 68, 0.4);
  background: rgba(0, 0, 0, 0.3);
}
.glass-input::placeholder { color: rgba(255,255,255,0.3); }

.error-msg {
  color: #ef4444; font-size: 12px; margin-top: 4px;
}

/* ── Footer ── */
.modal-footer {
  padding: 16px 24px;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex; justify-content: flex-end; gap: 12px;
}
.btn-cancel {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white; padding: 8px 16px; border-radius: 8px;
  font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;
}
.btn-cancel:hover:not(:disabled) { background: rgba(255, 255, 255, 0.1); }
.btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-danger {
  background: #ef4444;
  border: 1px solid #dc2626;
  color: white; padding: 8px 20px; border-radius: 8px;
  font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;
  display: flex; align-items: center; gap: 8px;
}
.btn-danger:hover:not(:disabled) { background: #dc2626; }
.btn-danger:disabled { opacity: 0.7; cursor: not-allowed; }

/* ── Animation ── */
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

.modal-enter-active, .modal-leave-active {
  transition: opacity 0.3s ease;
}
.modal-enter-active .modal-content, .modal-leave-active .modal-content {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
}
.modal-enter-from, .modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal-content, .modal-leave-to .modal-content {
  opacity: 0; transform: scale(0.95) translateY(10px);
}
</style>
