<template>
  <Teleport to="body">
    <Presence>
      <Motion
        v-if="open"
        class="sd-modal-overlay"
        :style="{ zIndex: z }"
        :initial="{ opacity: 0 }"
        :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }"
        :transition="{ duration: 0.22 }"
        @mousedown.self="$emit('close')"
      >
        <Motion
          class="sd-modal sd-grain"
          role="dialog"
          aria-modal="true"
          :initial="{ opacity: 0, y: 24, scale: 0.98 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 16, scale: 0.985 }"
          :transition="{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }"
          :style="{ '--modal-w': width }"
        >
          <div class="sd-modal-head">
            <div class="sd-modal-titles">
              <p v-if="eyebrow" class="sd-modal-eyebrow">{{ eyebrow }}</p>
              <h2 class="sd-modal-title">{{ title }}</h2>
            </div>
            <button class="sd-modal-x" type="button" aria-label="Close" @click="$emit('close')">
              <X :size="18" />
            </button>
          </div>
          <div class="sd-modal-body"><slot /></div>
          <div v-if="$slots.footer" class="sd-modal-foot"><slot name="footer" /></div>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { onMounted, onBeforeUnmount, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  eyebrow: { type: String, default: '' },
  width: { type: String, default: '560px' },
  // stack rung — default matches the CSS fallback; callers co-rendered with the
  // war-room console (z5200) pass 5300, drawer-launched contexts pass 2700
  z: { type: Number, default: 2000 },
})
const emit = defineEmits(['close'])

const onKey = (e) => { if (e.key === 'Escape' && props.open) emit('close') }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

// lock body scroll while open
watch(() => props.open, (v) => {
  if (typeof document !== 'undefined') document.body.style.overflow = v ? 'hidden' : ''
})
onBeforeUnmount(() => { if (typeof document !== 'undefined') document.body.style.overflow = '' })
</script>

<style scoped>
.sd-modal-overlay {
  position: fixed; inset: 0; z-index: 2000;
  display: grid; place-items: center;
  padding: 24px;
  background: rgba(4, 5, 6, 0.62);
  backdrop-filter: blur(10px) saturate(140%);
  -webkit-backdrop-filter: blur(10px) saturate(140%);
}
[data-theme="light"] .sd-modal-overlay { background: rgba(40, 25, 10, 0.34); }

.sd-modal {
  position: relative;
  width: min(var(--modal-w, 560px), 94vw);
  max-height: 88vh;
  display: flex; flex-direction: column;
  background: var(--sd-surface-elevated);
  border: 1px solid var(--sd-border-strong);
  border-radius: 22px;
  box-shadow: var(--sd-shadow-hover);
  overflow: hidden;
}
.sd-modal::before {
  content: ""; position: absolute; inset: 0 0 auto 0; height: 3px;
  background: var(--sd-grad-rail);
  opacity: 0.9;
}

.sd-modal-head {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
  padding: 22px 24px 14px;
  border-bottom: 1px solid var(--sd-border);
}
.sd-modal-eyebrow {
  font-family: var(--sd-mono); font-size: 10.5px; font-weight: 700;
  letter-spacing: 0.2em; text-transform: uppercase; color: var(--sd-amber); margin: 0 0 6px;
}
.sd-modal-title { font-size: 19px; font-weight: 800; letter-spacing: -0.02em; color: var(--sd-text); margin: 0; }
.sd-modal-x {
  flex-shrink: 0; width: 34px; height: 34px; display: grid; place-items: center;
  border-radius: 10px; cursor: pointer;
  background: transparent; border: 1px solid var(--sd-border); color: var(--sd-text-muted);
  transition: all 0.2s var(--sd-spring);
}
.sd-modal-x:hover { color: var(--sd-text); border-color: var(--sd-border-strong); background: var(--sd-surface); }

.sd-modal-body { padding: 20px 24px; overflow-y: auto; }
.sd-modal-foot {
  display: flex; align-items: center; justify-content: flex-end; gap: 10px;
  padding: 16px 24px; border-top: 1px solid var(--sd-border);
  background: var(--sd-surface-glass);
}

@media (prefers-reduced-motion: reduce) {
  .sd-modal-overlay, .sd-modal { transition: none !important; }
}
</style>
