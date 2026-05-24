<template>
  <Teleport to="body">
    <Transition name="modal-backdrop">
      <div v-if="isOpen" class="modal-backdrop" @click.self="handleClose">
        <Transition name="modal-content" appear>
          <div v-if="isOpen" class="modal-container">
             <div class="modal-icon">
                <component :is="icon" :size="32" />
             </div>
             
             <h3 class="modal-title">{{ title }}</h3>
             <p class="modal-message">{{ message }}</p>
             
             <!-- Slot for custom content (e.g., input fields) -->
             <div v-if="$slots.default" class="modal-custom-content">
               <slot></slot>
             </div>
             
             <div class="modal-actions">
                <button class="btn cancel" @click="handleClose" :disabled="loading">{{ cancelText }}</button>
                <button class="btn confirm" @click="handleConfirm" :disabled="loading">
                  <Loader2 v-if="loading" :size="16" class="spin" />
                  <span>{{ confirmText }}</span>
                </button>
             </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { AlertTriangle, Loader2 } from 'lucide-vue-next'

const props = defineProps({
  isOpen: { type: Boolean, required: true },
  title: { type: String, default: 'Confirm Action' },
  message: { type: String, default: 'Are you sure you want to proceed?' },
  confirmText: { type: String, default: 'Delete' },
  cancelText: { type: String, default: 'Cancel' },
  icon: { type: Object, default: () => AlertTriangle },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'confirm'])

const handleClose = () => emit('close')
const handleConfirm = () => emit('confirm')
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0; 
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-container {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
}

.modal-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
}

.modal-title {
    font-size: 18px;
    font-weight: 600;
    color: #fff;
    margin-bottom: 8px;
}

.modal-message {
    font-size: 14px;
    color: #a1a1aa;
    margin-bottom: 24px;
    line-height: 1.5;
}

.modal-actions {
    display: flex;
    gap: 12px;
    width: 100%;
}

.btn {
    flex: 1;
    padding: 10px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
}

.btn.cancel {
    background: #27272a;
    color: #fff;
}

.btn.cancel:hover {
    background: #3f3f46;
}

.btn.confirm {
    background: #ef4444;
    color: #fff;
}

.btn.confirm:hover:not(:disabled) {
    background: #dc2626;
}

.btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn.confirm {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
}

.modal-custom-content {
    width: 100%;
    text-align: left;
    margin-bottom: 24px;
}

.spin {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

/* Transitions */
.modal-backdrop-enter-active,
.modal-backdrop-leave-active {
  transition: opacity 0.3s ease;
}

.modal-backdrop-enter-from,
.modal-backdrop-leave-to {
  opacity: 0;
}

.modal-content-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-content-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-content-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}
.modal-content-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}

/* ─── Light theme overrides ─────────────────────────────────────────────── */
[data-theme="light"] .modal-backdrop { background: rgba(26, 20, 16, 0.45); }
[data-theme="light"] .modal-container {
  background: rgba(255, 250, 240, 0.98);
  border-color: rgba(40, 25, 10, 0.12);
  color: var(--text-primary);
  box-shadow: 0 30px 80px rgba(40, 25, 10, 0.28);
}
[data-theme="light"] .modal-title { color: var(--text-primary); }
[data-theme="light"] .modal-message { color: var(--text-secondary); }
[data-theme="light"] .btn.cancel {
  background: rgba(40, 25, 10, 0.06);
  color: var(--text-primary);
  border-color: rgba(40, 25, 10, 0.14);
}
[data-theme="light"] .btn.cancel:hover { background: rgba(40, 25, 10, 0.12); }
</style>
