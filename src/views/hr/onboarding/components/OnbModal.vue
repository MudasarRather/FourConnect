<template>
  <Teleport to="body">
    <transition name="onb-modal">
      <div v-if="open" class="onb-modal-overlay" @click.self="$emit('close')">
        <div
          class="onb-modal"
          ref="modalRef"
          :style="{ maxWidth: width + 'px' }"
          @mousemove="onMove"
        >
          <div class="onb-modal-aurora" aria-hidden="true" />
          <div class="onb-modal-spotlight" aria-hidden="true" :style="spotlightStyle" />
          <div class="onb-modal-edge" aria-hidden="true" />

          <header class="onb-modal-head">
            <div class="head-row">
              <div v-if="icon" class="head-icon">
                <component :is="icon" :size="18" />
              </div>
              <div class="head-text">
                <h3 v-if="title">{{ title }}</h3>
                <p v-if="subtitle">{{ subtitle }}</p>
              </div>
            </div>
            <button class="head-close" @click="$emit('close')" aria-label="Close">
              <X :size="16" />
            </button>
          </header>

          <div class="onb-modal-body">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="onb-modal-footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, onBeforeUnmount, computed } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  open:     { type: Boolean, default: false },
  title:    { type: String, default: '' },
  subtitle: { type: String, default: '' },
  icon:     { type: [Object, Function], default: null },
  width:    { type: Number, default: 560 },
})
const emit = defineEmits(['close'])

const modalRef = ref(null)
const mx = ref(50), my = ref(30)
const spotlightStyle = computed(() => ({
  background: `radial-gradient(420px circle at ${mx.value}% ${my.value}%, rgba(251, 191, 36, 0.18), transparent 60%)`,
}))

const onMove = (e) => {
  const el = modalRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  mx.value = ((e.clientX - r.left) / r.width) * 100
  my.value = ((e.clientY - r.top) / r.height) * 100
}

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
.onb-modal-overlay {
  position: fixed; inset: 0;
  background: rgba(6, 6, 8, 0.46);
  backdrop-filter: blur(24px) saturate(150%);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  z-index: 1200;
  display: flex; align-items: center; justify-content: center;
  padding: 28px;
  overflow-y: auto;
}
.onb-modal {
  position: relative;
  width: 100%; max-width: 560px;
  background: rgba(14, 14, 16, 0.66);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 22px;
  backdrop-filter: blur(40px) saturate(170%);
  -webkit-backdrop-filter: blur(40px) saturate(170%);
  box-shadow:
    0 40px 90px -22px rgba(0, 0, 0, 0.65),
    0 0 0 1px rgba(251, 191, 36, 0.08),
    0 0 90px -10px rgba(251, 146, 60, 0.22);
  overflow: hidden;
  max-height: calc(100vh - 56px);
  display: flex; flex-direction: column;
}
[data-theme="light"] .onb-modal {
  background: rgba(255, 250, 240, 0.78);
  border-color: rgba(40, 25, 10, 0.12);
  backdrop-filter: blur(28px) saturate(150%);
  -webkit-backdrop-filter: blur(28px) saturate(150%);
  box-shadow:
    0 40px 90px -22px rgba(40, 25, 10, 0.22),
    0 0 0 1px rgba(217, 119, 6, 0.15),
    0 0 90px -10px rgba(251, 146, 60, 0.18);
}
[data-theme="light"] .onb-modal-aurora {
  background:
    radial-gradient(80% 100% at 0% 0%, rgba(251, 146, 60, 0.18), transparent 60%),
    radial-gradient(60% 80% at 100% 30%, rgba(217, 119, 6, 0.14), transparent 60%);
}
[data-theme="light"] .onb-modal-head {
  border-bottom-color: rgba(40, 25, 10, 0.08);
}
.onb-modal-edge {
  position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: var(--hr-gradient-hero);
  z-index: 4;
}
.onb-modal-aurora {
  position: absolute; inset: 0;
  background:
    radial-gradient(80% 100% at 0% 0%, rgba(251, 191, 36, 0.20), transparent 60%),
    radial-gradient(60% 80% at 100% 30%, rgba(251, 146, 60, 0.16), transparent 60%);
  background-size: 200% 200%;
  animation: hr-aurora 14s ease-in-out infinite;
  pointer-events: none; z-index: 1;
}
.onb-modal-spotlight {
  position: absolute; inset: 0;
  pointer-events: none; z-index: 2;
  transition: background .25s ease;
}

.onb-modal-head, .onb-modal-body, .onb-modal-footer { position: relative; z-index: 3; }

.onb-modal-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  gap: 14px;
}
.head-row { display: flex; align-items: center; gap: 12px; }
.head-icon {
  display: grid; place-items: center;
  width: 36px; height: 36px;
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid var(--hr-accent-gold-border);
  border-radius: 11px;
  color: var(--hr-accent-gold);
}
.head-text h3 {
  margin: 0; font-size: 17px; font-weight: 700;
  color: var(--hr-text); letter-spacing: -0.015em;
}
.head-text p {
  margin: 3px 0 0; font-size: 12px; color: var(--hr-text-muted);
}
.head-close {
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
.head-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--hr-text);
  transform: rotate(90deg);
}

.onb-modal-body { padding: 22px; overflow-y: auto; flex: 1; }
.onb-modal-body::-webkit-scrollbar { width: 8px; }
.onb-modal-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }

.onb-modal-footer {
  display: flex; gap: 8px; justify-content: flex-end;
  padding: 14px 22px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(14, 14, 16, 0.5);
}

.onb-modal-enter-active, .onb-modal-leave-active {
  transition: opacity 0.24s var(--hr-spring);
}
.onb-modal-enter-from, .onb-modal-leave-to { opacity: 0; }
.onb-modal-enter-active .onb-modal,
.onb-modal-leave-active .onb-modal {
  transition: transform 0.34s var(--hr-spring), opacity 0.34s var(--hr-spring);
}
.onb-modal-enter-from .onb-modal {
  transform: translateY(20px) scale(0.96);
  opacity: 0;
}
.onb-modal-leave-to .onb-modal {
  transform: translateY(10px) scale(0.98);
  opacity: 0;
}

/* ─── Light theme overrides — full modal anatomy ────────────────────────── */
[data-theme="light"] .onb-modal-overlay {
  background: rgba(26, 20, 16, 0.32);
  backdrop-filter: blur(12px) saturate(140%);
  -webkit-backdrop-filter: blur(12px) saturate(140%);
}
[data-theme="light"] .onb-modal-head {
  border-bottom-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .head-icon {
  background: rgba(217, 119, 6, 0.16);
  border-color: rgba(217, 119, 6, 0.36);
  color: #b45309;
}
[data-theme="light"] .head-close {
  background: rgba(40, 25, 10, 0.05);
  border-color: rgba(40, 25, 10, 0.14);
  color: var(--hr-text-secondary);
}
[data-theme="light"] .head-close:hover {
  background: rgba(40, 25, 10, 0.10);
  color: var(--hr-text);
}
[data-theme="light"] .onb-modal-body::-webkit-scrollbar-thumb {
  background: rgba(40, 25, 10, 0.18);
}
[data-theme="light"] .onb-modal-footer {
  background: rgba(252, 245, 232, 0.65);
  border-top-color: rgba(40, 25, 10, 0.10);
}
</style>
