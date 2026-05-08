<template>
  <div v-if="isOpen" class="dialog-overlay" @click.self="cancel">
    <div class="dialog-card">
      <div class="dialog-header">
        <div class="icon-box danger">
          <Trash2 :size="24" />
        </div>
        <h3>{{ title }}</h3>
      </div>
      
      <p class="dialog-message">{{ message }}</p>
      
      <div class="dialog-actions">
        <button class="btn-cancel" @click="cancel">{{ cancelText }}</button>
        <button class="btn-confirm" @click="confirm">{{ confirmText }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Trash2 } from 'lucide-vue-next'

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  title: { type: String, default: 'Confirm Action' },
  message: { type: String, default: 'Are you sure you want to proceed?' },
  confirmText: { type: String, default: 'Confirm' },
  cancelText: { type: String, default: 'Cancel' }
})

const emit = defineEmits(['confirm', 'cancel'])

const confirm = () => emit('confirm')
const cancel = () => emit('cancel')
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;
}

.dialog-card {
  background: rgba(30, 30, 35, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 24px;
  width: 90%; max-width: 400px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  display: flex; flex-direction: column; align-items: center; text-align: center;
  animation: slideUp 0.3s cubic-bezier(0.19, 1, 0.22, 1);
}

.dialog-header { margin-bottom: 16px; }
.icon-box {
  width: 48px; height: 48px; border-radius: 50%;
  background: rgba(239, 68, 68, 0.1); color: #ef4444;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 16px;
}

h3 {
  font-size: 18px; font-weight: 600; color: white; margin: 0;
}

.dialog-message {
  font-size: 14px; color: rgba(255, 255, 255, 0.6);
  line-height: 1.5; margin-bottom: 24px;
}

.dialog-actions {
  display: flex; gap: 12px; width: 100%;
}

.btn-cancel, .btn-confirm {
  flex: 1; padding: 10px; border-radius: 10px; font-size: 14px; font-weight: 500;
  cursor: pointer; transition: all 0.2s;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.05); color: white; border: 1px solid rgba(255, 255, 255, 0.1);
}
.btn-cancel:hover { background: rgba(255, 255, 255, 0.1); }

.btn-confirm {
  background: #ef4444; color: white; border: none;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}
.btn-confirm:hover { background: #dc2626; transform: translateY(-1px); }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>
