<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" as="div" class="cf-ov" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.22 }" @click.self="$emit('close')">
        <Motion as="div" class="cf" :initial="{ opacity: 0, y: 18, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 12, scale: 0.97 }" :transition="{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }">
          <span class="cf-aura" aria-hidden="true" />
          <div class="cf-ic"><component :is="icon" :size="22" /></div>
          <h3>{{ title }}</h3>
          <p v-if="message">{{ message }}</p>
          <div class="cf-foot">
            <button class="btn ghost" @click="$emit('close')">{{ cancelLabel }}</button>
            <Motion as="button" class="btn danger" :disabled="busy" :whileHover="!busy ? { y: -2 } : {}" :whileTap="!busy ? { scale: 0.97 } : {}" @click="$emit('confirm')">
              <Loader2 v-if="busy" :size="15" class="spin" /><component v-else :is="icon" :size="15" /> {{ confirmLabel }}
            </Motion>
          </div>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { TriangleAlert, Loader2 } from 'lucide-vue-next'
defineProps({
  open: Boolean, title: { type: String, default: 'Are you sure?' }, message: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Delete' }, cancelLabel: { type: String, default: 'Cancel' },
  icon: { type: [Object, Function], default: () => TriangleAlert }, busy: { type: Boolean, default: false },
})
defineEmits(['close', 'confirm'])
</script>

<style scoped>
.cf-ov { position: fixed; inset: 0; z-index: 1450; display: grid; place-items: center; padding: 18px; background: rgba(6,5,4,0.66); backdrop-filter: blur(9px); }
.cf { position: relative; width: min(380px, 96vw); overflow: hidden; text-align: center; padding: 24px 22px 18px; border-radius: 20px; background: var(--trv-surface-elevated); border: 1px solid var(--trv-border-strong); box-shadow: var(--trv-shadow); }
.cf-aura { position: absolute; inset: -60% 20% 60% 20%; pointer-events: none; background: radial-gradient(60% 70% at 50% 0%, rgba(239,68,68,0.16), transparent 70%); }
.cf-ic { position: relative; display: inline-grid; place-items: center; width: 52px; height: 52px; border-radius: 50%; margin-bottom: 12px; color: var(--trv-st-rejected); background: var(--trv-st-rejected-soft); border: 1px solid color-mix(in srgb, var(--trv-st-rejected) 30%, transparent); }
.cf h3 { position: relative; font-size: 16.5px; font-weight: 800; margin: 0 0 6px; color: var(--trv-text); }
.cf p { position: relative; font-size: 12.5px; line-height: 1.5; color: var(--trv-text-muted); margin: 0 0 18px; }
.cf-foot { position: relative; display: flex; gap: 10px; justify-content: center; }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.btn.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.btn.danger { background: var(--trv-st-rejected); color: #fff; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.spin { animation: cf-spin 0.8s linear infinite; }
@keyframes cf-spin { to { transform: rotate(360deg); } }
[data-theme="light"] .cf-ov { background: rgba(60,40,15,0.34); }
@media (prefers-reduced-motion: reduce) { .spin { animation: none; } }
</style>
