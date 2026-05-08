<template>
  <transition name="modal-fade">
    <div v-if="isOpen" class="modal-overlay" @click.self="close">
      <div class="modal-container slide-up">
        <div class="modal-header">
          <div class="header-icon reject">
            <XCircle :size="24" />
          </div>
          <div class="header-text">
            <h2>Rejection Reason</h2>
            <p>Please provide a detailed explanation for rejecting this handover document.</p>
          </div>
        </div>

        <div class="modal-body">
          <div class="input-group">
            <label for="rejection-reason">Feedback for Creator</label>
            <textarea 
              id="rejection-reason" 
              v-model="reason" 
              placeholder="e.g. Missing technical architecture diagrams in Step 4..."
              rows="4"
              ref="reasonInput"
            ></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" @click="close">Cancel</button>
          <button 
            class="btn-primary danger" 
            :disabled="!reason.trim() || isSubmitting"
            @click="submit"
          >
            <span v-if="!isSubmitting">Confirm Rejection</span>
            <span v-else class="loader"></span>
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { XCircle } from 'lucide-vue-next'

const props = defineProps({
  isOpen: Boolean,
  isSubmitting: Boolean
})

const emit = defineEmits(['close', 'confirm'])

const reason = ref('')
const reasonInput = ref(null)

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    reason.value = ''
    nextTick(() => {
      reasonInput.value?.focus()
    })
  }
})

const close = () => {
  if (props.isSubmitting) return
  emit('close')
}

const submit = () => {
  if (!reason.value.trim() || props.isSubmitting) return
  emit('confirm', reason.value)
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-container {
  background: #121214;
  width: 100%;
  max-width: 480px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 40px 100px rgba(0, 0, 0, 0.8);
  overflow: hidden;
  position: relative;
}

.modal-container::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  opacity: 0.02;
  pointer-events: none;
}

.modal-header {
  padding: 32px 32px 24px;
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.header-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-icon.reject {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.15);
}

.header-text h2 {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 4px;
}

.header-text p {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.5;
  margin: 0;
}

.modal-body {
  padding: 0 32px 32px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.input-group label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

textarea {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px;
  color: #fff;
  font-size: 14px;
  font-family: inherit;
  resize: none;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

textarea:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(239, 68, 68, 0.4);
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1);
}

.modal-footer {
  padding: 24px 32px 32px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  background: rgba(255, 255, 255, 0.01);
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}

button {
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-secondary {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.2);
}

.btn-primary {
  background: #fff;
  border: none;
  color: #000;
}

.btn-primary.danger {
  background: #ef4444;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(239, 68, 68, 0.2);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Animations */
.modal-fade-enter-active, .modal-fade-leave-active {
  transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-fade-enter-from, .modal-fade-leave-to {
  opacity: 0;
}

.slide-up {
  animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.loader {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
