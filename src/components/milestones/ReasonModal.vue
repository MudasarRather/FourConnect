<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal-content">
          <div class="modal-header">
            <h3>{{ title }}</h3>
            <button class="close-btn" @click="close"><X :size="16" /></button>
          </div>
          
          <div class="modal-body">
            <p class="description">{{ description }}</p>
            <textarea 
              v-model="reason" 
              class="reason-input" 
              placeholder="e.g. Provide a reason..."
              rows="4"
            ></textarea>
          </div>
          
          <div class="modal-footer">
            <button class="btn-text secondary" @click="close">Cancel</button>
            <button 
              class="btn-pill danger" 
              @click="confirm" 
              :disabled="!reason.trim() || isSubmitting"
            >
              {{ isSubmitting ? 'Processing...' : confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  modelValue: Boolean,
  isSubmitting: Boolean,
  title: { type: String, default: 'Action Required' },
  description: { type: String, default: 'Please provide a reason.' },
  confirmText: { type: String, default: 'Confirm' }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const reason = ref('')

const close = () => {
  emit('update:modelValue', false)
  reason.value = ''
}

const confirm = () => {
  if (!reason.value.trim()) return
  emit('confirm', reason.value.trim())
}
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; z-index: 20000; /* Above everything */
  background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
}

.modal-content {
  width: 400px; background: #18181b; 
  border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
}

.modal-header {
  padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.modal-header h3 { font-size: 14px; font-weight: 600; color: #f5f5f7; margin: 0; }
.close-btn { background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; }
.close-btn:hover { color: white; }

.modal-body { padding: 20px; }
.description { font-size: 13px; color: rgba(255,255,255,0.6); margin-bottom: 12px; }

.reason-input {
  width: 100%; box-sizing: border-box;
  background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; padding: 12px; color: white; font-size: 13px;
  resize: none; outline: none; transition: border-color 0.2s;
}
.reason-input:focus { border-color: #ef4444; }

.modal-footer {
  padding: 16px 20px; border-top: 1px solid rgba(255,255,255,0.05);
  display: flex; justify-content: flex-end; gap: 12px;
}

.btn-text.secondary { background: none; border: none; color: rgba(255,255,255,0.6); cursor: pointer; font-size: 13px; }
.btn-text.secondary:hover { color: white; }

.btn-pill.danger { background: #ef4444; color: white; border: none; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 500; cursor: pointer; }
.btn-pill.danger:hover { background: #dc2626; }
.btn-pill.danger:disabled { opacity: 0.5; cursor: not-allowed; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
