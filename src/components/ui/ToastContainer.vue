<template>
  <div class="toast-container">
    <transition-group name="toast">
      <div 
        v-for="toast in toasts" 
        :key="toast.id" 
        class="toast-item"
        :class="toast.type"
      >
        <div class="icon-wrapper">
          <CheckCircle v-if="toast.type === 'success'" :size="20" class="icon success-icon" />
          <AlertCircle v-if="toast.type === 'error'" :size="20" class="icon error-icon" />
          <Info v-if="toast.type === 'info'" :size="20" class="icon info-icon" />
        </div>
        <span class="message">{{ toast.message }}</span>
        <button class="close-btn" @click="removeToast(toast.id)">
          <X :size="14" />
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { useToast } from '../../composables/useToast'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-vue-next'

const { toasts, removeToast } = useToast()
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none; /* Let clicks pass through empty space */
}

.toast-item {
  pointer-events: auto;
  min-width: 300px;
  max-width: 400px;
  background: #1c1c1e;
  border: 1px solid #3a3a3c;
  padding: 14px 16px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  backdrop-filter: blur(10px);
}

.toast-item.success { border-color: #30d158; background: rgba(48, 209, 88, 0.1); }
.toast-item.error { border-color: #ff453a; background: rgba(255, 69, 58, 0.1); }
.toast-item.info { border-color: #0a84ff; background: rgba(10, 132, 255, 0.1); }

.message {
  font-size: 13px;
  color: #f5f5f7;
  font-weight: 500;
  flex: 1;
}

.icon { flex-shrink: 0; }
.success-icon { color: #30d158; }
.error-icon { color: #ff453a; }
.info-icon { color: #0a84ff; }

.close-btn {
  background: none;
  border: none;
  color: #86868b;
  cursor: pointer;
  padding: 4px;
  display: flex;
}
.close-btn:hover { color: #f5f5f7; }

/* Transitions */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(30px) scale(0.9);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
