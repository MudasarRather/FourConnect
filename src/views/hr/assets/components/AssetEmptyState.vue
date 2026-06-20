<template>
  <div class="aes" ref="root">
    <span class="aes-floor as-blueprint-floor" aria-hidden="true" />
    <Motion class="aes-orb" as="div"
      :initial="{ opacity: 0, scale: 0.7 }" :animate="{ opacity: 1, scale: 1 }"
      :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
      <span class="aes-ring r1" /><span class="aes-ring r2" /><span class="aes-ring r3" />
      <component :is="icon" :size="26" />
    </Motion>
    <Motion as="h3" class="aes-title"
      :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.12 }">{{ title }}</Motion>
    <Motion as="p" class="aes-sub"
      :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.2 }">{{ sub }}</Motion>
    <Motion as="div" class="aes-slot"
      :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.28 }"><slot /></Motion>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Motion } from 'motion-v'
import { Boxes } from 'lucide-vue-next'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

defineProps({
  icon: { type: [Object, Function], default: () => Boxes },
  title: { type: String, default: 'Nothing here yet' },
  sub: { type: String, default: '' },
})
const root = ref(null)
usePointerSpotlight(root)
</script>

<style scoped>
.aes { position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; text-align: center;
  padding: 50px 24px 44px; border: 1.5px dashed var(--as-border-strong); border-radius: 18px; background: var(--as-surface); }
.aes-floor { opacity: 0.5; }
.aes-orb { position: relative; display: grid; place-items: center; width: 66px; height: 66px; border-radius: 50%; color: var(--as-amber);
  background: radial-gradient(circle at 40% 30%, color-mix(in srgb, var(--as-amber) 22%, transparent), transparent 70%);
  border: 1px solid color-mix(in srgb, var(--as-amber) 30%, transparent); margin-bottom: 16px; }
.aes-ring { position: absolute; border-radius: 50%; border: 1px solid color-mix(in srgb, var(--as-amber) 22%, transparent); }
.r1 { inset: -8px; animation: as-spin 9s linear infinite; }
.r2 { inset: -16px; border-style: dashed; animation: as-spin 14s linear infinite reverse; }
.r3 { inset: -24px; opacity: 0.5; animation: as-spin 22s linear infinite; }
.aes-title { margin: 0; font-size: 16px; font-weight: 800; color: var(--as-text); position: relative; }
.aes-sub { margin: 6px 0 0; font-size: 13px; color: var(--as-text-muted); max-width: 360px; position: relative; }
.aes-slot { margin-top: 18px; position: relative; }
@media (prefers-reduced-motion: reduce) { .aes-ring { animation: none !important; } }
</style>
