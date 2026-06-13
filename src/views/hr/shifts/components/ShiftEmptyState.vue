<template>
  <Motion as="div" class="shift-empty"
    :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
    <div class="se-orbit" aria-hidden="true">
      <span class="se-ring" />
      <span class="se-ring r2" />
      <span class="se-ic"><component :is="icon" :size="24" /></span>
    </div>
    <h3>{{ title }}</h3>
    <p v-if="sub">{{ sub }}</p>
    <div class="se-actions"><slot name="actions" /></div>
  </Motion>
</template>

<script setup>
import { Motion } from 'motion-v'
import { Inbox } from 'lucide-vue-next'
defineProps({
  icon: { type: [Object, Function], default: Inbox },
  title: { type: String, default: 'Nothing here yet' },
  sub: { type: String, default: '' },
})
</script>

<style scoped>
.shift-empty { display: grid; place-items: center; text-align: center; padding: 48px 24px; gap: 4px; }
.se-orbit { position: relative; width: 92px; height: 92px; margin-bottom: 10px; }
.se-ring { position: absolute; inset: 0; border-radius: 50%; border: 1px solid var(--shift-border); animation: shift-ring-pulse 3.4s ease-in-out infinite; }
.se-ring.r2 { inset: 14px; opacity: 0.6; animation-delay: 0.7s; }
.se-ic { position: absolute; inset: 28px; border-radius: 50%; display: grid; place-items: center;
  color: var(--shift-amber); background: radial-gradient(circle, rgba(251,191,36,0.18), transparent 70%); }
.shift-empty h3 { margin: 0; font-size: 16px; font-weight: 700; color: var(--shift-text); }
.shift-empty p { margin: 4px auto 0; max-width: 420px; font-size: 13px; line-height: 1.55; color: var(--shift-text-muted); }
.se-actions { margin-top: 14px; display: flex; gap: 10px; }
</style>
