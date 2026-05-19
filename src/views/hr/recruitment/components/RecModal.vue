<template>
  <Teleport to="body">
    <transition name="rec-fade">
      <div v-if="open" class="rec-modal-overlay" @click.self="$emit('close')">
        <div class="rec-modal hr-spotlight" ref="modalRef" :style="{ maxWidth: width + 'px' }">
          <div class="modal-aurora" aria-hidden="true" />
          <header class="modal-head">
            <div class="title-row">
              <div v-if="icon" class="title-icon">
                <component :is="icon" :size="18" />
              </div>
              <div class="title-block">
                <h3 v-if="title">{{ title }}</h3>
                <p v-if="subtitle">{{ subtitle }}</p>
              </div>
            </div>
            <button class="close-btn" @click="$emit('close')" aria-label="Close">
              <X :size="16" />
            </button>
          </header>
          <div class="modal-body">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { useSpotlight } from '../../../../composables/useSpotlight'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  icon: { type: [Object, Function], default: null },
  width: { type: Number, default: 560 },
})
const emit = defineEmits(['close'])

const modalRef = ref(null)
useSpotlight(modalRef)

const onKey = (e) => { if (e.key === 'Escape') emit('close') }

watch(() => props.open, (v) => {
  if (v) {
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
  } else {
    document.body.style.overflow = ''
    window.removeEventListener('keydown', onKey)
  }
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.rec-modal-overlay {
  position: fixed;
  inset: 0;
  /* Truly transparent with deep blur — see backdrop content faintly */
  background: rgba(6, 6, 8, 0.42);
  backdrop-filter: blur(22px) saturate(150%);
  -webkit-backdrop-filter: blur(22px) saturate(150%);
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
  overflow-y: auto;
}

.rec-modal {
  position: relative;
  width: 100%;
  max-width: 560px;
  /* Glass surface */
  background: rgba(14, 14, 16, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  backdrop-filter: blur(38px) saturate(170%);
  -webkit-backdrop-filter: blur(38px) saturate(170%);
  box-shadow:
    0 30px 80px -20px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(251, 191, 36, 0.08),
    0 0 80px rgba(251, 146, 60, 0.16);
  overflow: hidden;
  max-height: calc(100vh - 56px);
  display: flex;
  flex-direction: column;
}
.rec-modal::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: var(--hr-gradient-hero);
  z-index: 3;
}

.modal-aurora {
  position: absolute; inset: 0;
  background:
    radial-gradient(80% 100% at 0% 0%, rgba(251, 191, 36, 0.18), transparent 60%),
    radial-gradient(60% 80% at 100% 30%, rgba(251, 146, 60, 0.16), transparent 60%);
  background-size: 200% 200%;
  animation: hr-aurora 14s ease-in-out infinite;
  pointer-events: none;
  z-index: 1;
  opacity: 0.7;
}

.modal-head, .modal-body, .modal-footer { position: relative; z-index: 2; }

.modal-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  gap: 14px;
}
.title-row { display: flex; align-items: center; gap: 12px; }
.title-icon {
  display: grid; place-items: center;
  width: 36px; height: 36px;
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid var(--hr-accent-gold-border);
  border-radius: 11px;
  color: var(--hr-accent-gold);
}
.title-block h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--hr-text);
  letter-spacing: -0.015em;
}
.title-block p {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--hr-text-muted);
}

.close-btn {
  display: grid; place-items: center;
  width: 32px; height: 32px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--hr-border-strong);
  border-radius: 10px;
  color: var(--hr-text-secondary);
  cursor: pointer;
  transition: all 220ms var(--hr-spring);
  flex-shrink: 0;
}
.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--hr-text);
  transform: rotate(90deg);
}

.modal-body {
  padding: 22px;
  overflow-y: auto;
  flex: 1;
}
.modal-body::-webkit-scrollbar { width: 8px; }
.modal-body::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.08);
  border-radius: 4px;
}

.modal-footer {
  display: flex;
  gap: 8px;
  padding: 14px 22px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(14, 14, 16, 0.5);
}

/* Enter / leave transitions */
.rec-fade-enter-active, .rec-fade-leave-active {
  transition: opacity 0.24s var(--hr-spring);
}
.rec-fade-enter-from, .rec-fade-leave-to { opacity: 0; }

.rec-fade-enter-active .rec-modal,
.rec-fade-leave-active .rec-modal {
  transition: transform 0.32s var(--hr-spring), opacity 0.32s var(--hr-spring);
}
.rec-fade-enter-from .rec-modal {
  transform: translateY(16px) scale(0.96);
  opacity: 0;
}
.rec-fade-leave-to .rec-modal {
  transform: translateY(8px) scale(0.98);
  opacity: 0;
}
</style>
