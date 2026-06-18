<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" class="td-overlay" as="div"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.2 }" @mousedown.self="$emit('close')">
        <Motion class="td-panel" :class="{ wide }" as="aside" role="dialog" aria-modal="true"
          :initial="{ x: '100%' }" :animate="{ x: 0 }" :exit="{ x: '100%' }"
          :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }"
          @mousedown.stop>
          <header class="td-head">
            <span v-if="icon" class="td-ic"><component :is="icon" :size="17" /></span>
            <div class="td-titles">
              <span class="td-eyebrow">{{ eyebrow }}</span>
              <h3>{{ title }}</h3>
            </div>
            <button class="td-x" @click="$emit('close')" aria-label="Close"><X :size="18" /></button>
          </header>
          <div class="td-body"><slot /></div>
          <footer v-if="$slots.footer" class="td-foot"><slot name="footer" /></footer>
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
  eyebrow: { type: String, default: '' },
  icon: { type: [Object, Function], default: null },
  wide: { type: Boolean, default: false },
})
const emit = defineEmits(['close'])
const onKey = (e) => { if (e.key === 'Escape' && props.open) emit('close') }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.td-overlay { position: fixed; inset: 0; z-index: 1400; display: flex; justify-content: flex-end;
  background: rgba(6, 5, 4, 0.55); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
[data-theme="light"] .td-overlay { background: rgba(60, 40, 15, 0.24); }
.td-panel { width: 100%; max-width: 440px; height: 100%; display: flex; flex-direction: column;
  background: var(--trn-glass-deep); backdrop-filter: var(--trn-glass-blur); -webkit-backdrop-filter: var(--trn-glass-blur);
  border-left: 1px solid var(--trn-border-strong); box-shadow: var(--trn-glass-shadow); }
.td-panel.wide { max-width: 580px; }
.td-head { display: flex; align-items: center; gap: 11px; padding: 20px 22px 16px; border-bottom: 1px solid var(--trn-border-soft); }
.td-ic { display: inline-flex; width: 36px; height: 36px; border-radius: 11px; align-items: center; justify-content: center;
  color: var(--trn-amber); background: color-mix(in srgb, var(--trn-amber) 14%, transparent); }
.td-titles { flex: 1; min-width: 0; }
.td-eyebrow { font-family: var(--trn-mono); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--trn-amber-strong); }
.td-titles h3 { margin: 2px 0 0; font-size: 17px; font-weight: 700; color: var(--trn-text); }
.td-x { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 9px;
  border: 1px solid var(--trn-border-soft); background: var(--trn-surface); color: var(--trn-text-muted); cursor: pointer; transition: all 0.2s; }
.td-x:hover { color: var(--trn-text); background: var(--trn-surface-elevated); }
.td-body { flex: 1; padding: 20px 22px; overflow-y: auto; }
.td-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 22px; border-top: 1px solid var(--trn-border-soft); }
@media (max-width: 520px) { .td-panel { max-width: 100%; } }
</style>
