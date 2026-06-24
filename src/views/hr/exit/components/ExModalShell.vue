<template>
  <Teleport to="body">
    <Presence>
      <div v-if="open" class="exm-overlay" @mousedown.self="$emit('close')">
        <Motion as="div" class="exm ex-grain" :class="['tone-' + tone, wide ? 'wide' : '']"
          :initial="{ opacity: 0, y: 26, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 16, scale: 0.98 }" :transition="{ duration: 0.32, ease: [0.16,1,0.3,1] }">
          <span class="exm-sheen" aria-hidden="true" />
          <header class="exm-head">
            <span class="exm-ico" :class="'tone-' + tone"><component :is="icon" :size="18" /></span>
            <div class="exm-htxt"><h3 class="exm-title">{{ title }}</h3><p v-if="sub" class="exm-sub">{{ sub }}</p></div>
            <button class="exm-x" type="button" @click="$emit('close')"><X :size="17" /></button>
          </header>
          <div class="exm-body"><slot /></div>
          <footer class="exm-foot"><slot name="foot" /></footer>
        </Motion>
      </div>
    </Presence>
  </Teleport>
</template>

<script setup>
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X } from 'lucide-vue-next'
defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  sub: { type: String, default: '' },
  icon: { type: [Object, Function], default: null },
  tone: { type: String, default: 'amber' }, // amber | success | danger
  wide: { type: Boolean, default: false },
})
defineEmits(['close'])
</script>

<style scoped>
.exm-overlay { position: fixed; inset: 0; z-index: 1440; display: grid; place-items: center; padding: 20px;
  background: rgba(6,5,10,0.66); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
[data-theme="light"] .exm-overlay { background: rgba(60,45,20,0.32); }
.exm { position: relative; overflow: hidden; width: min(440px, 96vw); max-height: 90vh; display: flex; flex-direction: column;
  border-radius: 20px; background: var(--ex-surface-elevated); border: 1px solid var(--ex-border-strong); box-shadow: var(--ex-shadow); }
.exm.wide { width: min(620px, 96vw); }
.exm-sheen { position: absolute; inset: 0 0 auto; height: 2px; pointer-events: none;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--ex-amber) 70%, transparent), transparent); }
.exm.tone-danger .exm-sheen { background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--ex-blocked) 70%, transparent), transparent); }
.exm.tone-success .exm-sheen { background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--ex-cleared) 70%, transparent), transparent); }
.exm-head { display: flex; align-items: flex-start; gap: 12px; padding: 18px 20px 12px; }
.exm-ico { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
  color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.exm-ico.tone-danger { color: var(--ex-blocked); background: color-mix(in srgb, var(--ex-blocked) 13%, transparent); border-color: color-mix(in srgb, var(--ex-blocked) 30%, transparent); }
.exm-ico.tone-success { color: var(--ex-cleared); background: color-mix(in srgb, var(--ex-cleared) 13%, transparent); border-color: color-mix(in srgb, var(--ex-cleared) 30%, transparent); }
.exm-htxt { flex: 1; min-width: 0; }
.exm-title { font-size: 15px; font-weight: 820; margin: 0; color: var(--ex-text); }
.exm-sub { font-size: 12px; color: var(--ex-text-muted); margin: 2px 0 0; }
.exm-x { margin-left: auto; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; cursor: pointer;
  background: transparent; border: 1px solid var(--ex-border); color: var(--ex-text-muted); transition: color 0.2s, border-color 0.2s; }
.exm-x:hover { color: var(--ex-text); border-color: var(--ex-border-strong); }
.exm-body { padding: 4px 20px 14px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; }
.exm-foot { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px 18px; }
</style>
