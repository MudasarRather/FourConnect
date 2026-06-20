<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" class="am-overlay" as="div"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.22 }" @mousedown.self="$emit('close')">
        <Motion class="am-panel" as="div" role="dialog" aria-modal="true" :style="{ maxWidth: width + 'px' }"
          :initial="{ opacity: 0, y: 24, scale: 0.96, filter: 'blur(8px)' }"
          :animate="{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }"
          :exit="{ opacity: 0, y: 14, scale: 0.97, filter: 'blur(6px)' }"
          :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }" @mousedown.stop>
          <span class="am-aura" aria-hidden="true" />
          <span class="am-edge" aria-hidden="true" />
          <header class="am-head">
            <span class="am-ic" v-if="icon"><component :is="icon" :size="18" /></span>
            <div class="am-titles">
              <h3>{{ title }}</h3>
              <p v-if="subtitle">{{ subtitle }}</p>
            </div>
            <button class="am-x" @click="$emit('close')" aria-label="Close"><X :size="18" /></button>
          </header>
          <div class="am-body"><slot /></div>
          <footer v-if="$slots.footer" class="am-foot"><slot name="footer" /></footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { watch, onBeforeUnmount } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  icon: { type: [Object, Function, null], default: null },
  width: { type: Number, default: 540 },
})
const emit = defineEmits(['close'])

watch(() => props.open, (o) => {
  document.body.style.overflow = o ? 'hidden' : ''
}, { immediate: true })
onBeforeUnmount(() => { document.body.style.overflow = '' })

const onKey = (e) => { if (e.key === 'Escape' && props.open) emit('close') }
if (typeof window !== 'undefined') window.addEventListener('keydown', onKey)
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.am-overlay { position: fixed; inset: 0; z-index: 1440; display: grid; place-items: center; padding: 24px;
  background: rgba(6, 5, 4, 0.6); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
[data-theme="light"] .am-overlay { background: rgba(60, 40, 15, 0.3); }
.am-panel { position: relative; width: 100%; max-height: 92vh; overflow: hidden; display: flex; flex-direction: column;
  background: var(--as-glass-deep); backdrop-filter: var(--as-glass-blur); -webkit-backdrop-filter: var(--as-glass-blur);
  border: 1px solid var(--as-border-strong); border-radius: 22px; box-shadow: var(--as-glass-shadow); }
.am-aura { position: absolute; inset: -32% -20% auto -20%; height: 62%; pointer-events: none; z-index: 0; background: var(--as-grad-hero); filter: blur(10px); opacity: 0.85; }
.am-edge { position: absolute; top: 0; left: 0; right: 0; height: 2px; z-index: 2; pointer-events: none;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--as-amber) 72%, transparent), transparent); background-size: 220% 100%; animation: as-sheen 4.5s ease-in-out infinite; }
.am-head, .am-body, .am-foot { position: relative; z-index: 1; }
.am-head { display: flex; align-items: center; gap: 12px; padding: 18px 20px 14px; border-bottom: 1px solid var(--as-border-soft); }
.am-ic { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0; color: var(--as-amber);
  background: color-mix(in srgb, var(--as-amber) 14%, transparent); border: 1px solid color-mix(in srgb, var(--as-amber) 28%, transparent); }
.am-titles { flex: 1; min-width: 0; }
.am-titles h3 { margin: 0; font-size: 17px; font-weight: 800; letter-spacing: -0.01em; color: var(--as-text); }
.am-titles p { margin: 2px 0 0; font-size: 12.5px; color: var(--as-text-muted); }
.am-x { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 9px;
  border: 1px solid var(--as-border-soft); background: var(--as-surface); color: var(--as-text-muted); cursor: pointer; transition: all 0.2s; }
.am-x:hover { color: var(--as-text); background: var(--as-surface-elevated); transform: rotate(90deg); }
.am-body { padding: 18px 20px; overflow-y: auto; }
.am-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--as-border-soft); }
@media (prefers-reduced-motion: reduce) { .am-edge { animation: none; } }
</style>
