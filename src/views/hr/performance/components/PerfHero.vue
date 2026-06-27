<template>
  <Motion as="header" class="ph" :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
    <span class="ph-grain" aria-hidden="true" />
    <span class="ph-aura" aria-hidden="true" />
    <div class="ph-lead">
      <div class="ph-text">
        <span class="ph-eyebrow"><span class="ph-dot" /><component :is="icon" v-if="icon" :size="12" />{{ eyebrow }}</span>
        <h1 class="ph-title">{{ title }}<span v-if="accent" class="ph-accent"> {{ accent }}</span></h1>
        <p v-if="sub" class="ph-sub">{{ sub }}</p>
      </div>
      <div v-if="$slots.actions" class="ph-actions"><slot name="actions" /></div>
    </div>
    <div v-if="$slots.lenses" class="ph-lenses"><slot name="lenses" /></div>
    <slot />
  </Motion>
</template>

<script setup>
import { Motion } from 'motion-v'
import { prefersReduced } from '@/composables/useShiftMotion'
defineProps({ eyebrow: String, title: String, accent: String, sub: String, icon: [Object, Function] })
const reduced = prefersReduced()
</script>

<style scoped>
.ph { position: relative; overflow: hidden; padding: 22px 24px; border-radius: 20px; display: flex; flex-direction: column; gap: 16px;
  background: var(--perf-surface); border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow); }
.ph-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.5; z-index: 0;
  background-image: linear-gradient(color-mix(in srgb, var(--perf-gold) 6%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--perf-gold) 6%, transparent) 1px, transparent 1px);
  background-size: 30px 30px; mask-image: radial-gradient(120% 130% at 0% 0%, #000 12%, transparent 72%); -webkit-mask-image: radial-gradient(120% 130% at 0% 0%, #000 12%, transparent 72%); }
.ph-aura { position: absolute; inset: -50% 40% auto -8%; height: 90%; pointer-events: none; z-index: 0;
  background: radial-gradient(circle, color-mix(in srgb, var(--perf-gold) 20%, transparent), transparent 70%); filter: blur(30px); }
.ph-lead { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; flex-wrap: wrap; }
.ph-text { min-width: 0; }
.ph-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: color-mix(in srgb, var(--perf-gold) 62%, var(--perf-text-muted)); }
.ph-eyebrow :deep(svg) { color: var(--perf-gold); }
.ph-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--perf-gold); box-shadow: 0 0 10px var(--perf-gold); }
.ph-title { margin: 8px 0 0; font-size: clamp(22px, 3vw, 30px); font-weight: 850; letter-spacing: -0.02em; line-height: 1.05; color: var(--perf-text); }
.ph-accent { background: var(--perf-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.ph-sub { margin: 9px 0 0; font-size: 13.5px; line-height: 1.5; color: var(--perf-text-muted); max-width: 66ch; }
.ph-actions { display: flex; align-items: center; gap: 9px; flex-shrink: 0; }
.ph-lenses { position: relative; z-index: 1; }
</style>
