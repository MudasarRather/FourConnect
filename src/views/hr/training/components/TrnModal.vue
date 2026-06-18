<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" class="tm-overlay" as="div"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.2 }" @mousedown.self="$emit('close')">
        <Motion class="tm-panel" :class="{ wide }" as="div" role="dialog" aria-modal="true"
          :initial="{ opacity: 0, y: 22, scale: 0.97 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 14, scale: 0.98 }"
          :transition="{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }"
          @mousedown.stop>
          <header class="tm-head">
            <span v-if="icon" class="tm-ic"><component :is="icon" :size="17" /></span>
            <div class="tm-titles">
              <h3>{{ title }}</h3>
              <p v-if="subtitle">{{ subtitle }}</p>
            </div>
            <button class="tm-x" @click="$emit('close')" aria-label="Close"><X :size="18" /></button>
          </header>
          <div class="tm-body"><slot /></div>
          <footer v-if="$slots.footer" class="tm-foot"><slot name="footer" /></footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  icon: { type: [Object, Function], default: null },
  wide: { type: Boolean, default: false },
})
const emit = defineEmits(['close'])

const onKey = (e) => { if (e.key === 'Escape' && props.open) emit('close') }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.tm-overlay { position: fixed; inset: 0; z-index: 1400; display: grid; place-items: center; padding: 24px;
  background: rgba(6, 5, 4, 0.6); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
[data-theme="light"] .tm-overlay { background: rgba(60, 40, 15, 0.28); }
.tm-panel { width: 100%; max-width: 540px; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column;
  background: var(--trn-glass-deep); backdrop-filter: var(--trn-glass-blur); -webkit-backdrop-filter: var(--trn-glass-blur);
  border: 1px solid var(--trn-border-strong); border-radius: 22px; box-shadow: var(--trn-glass-shadow); }
.tm-panel.wide { max-width: 880px; }
.tm-head { display: flex; align-items: center; gap: 11px; padding: 18px 20px 14px; border-bottom: 1px solid var(--trn-border-soft); }
.tm-ic { display: inline-flex; width: 34px; height: 34px; border-radius: 11px; align-items: center; justify-content: center;
  color: var(--trn-amber); background: var(--trn-cert-active-soft); background: color-mix(in srgb, var(--trn-amber) 14%, transparent); }
.tm-titles { flex: 1; min-width: 0; }
.tm-titles h3 { margin: 0; font-size: 16px; font-weight: 700; color: var(--trn-text); }
.tm-titles p { margin: 2px 0 0; font-size: 12px; color: var(--trn-text-muted); }
.tm-x { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 9px;
  border: 1px solid var(--trn-border-soft); background: var(--trn-surface); color: var(--trn-text-muted); cursor: pointer; transition: all 0.2s; }
.tm-x:hover { color: var(--trn-text); background: var(--trn-surface-elevated); }
.tm-body { padding: 18px 20px; overflow-y: auto; }
.tm-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--trn-border-soft); }
</style>
