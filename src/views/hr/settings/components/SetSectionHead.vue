<template>
  <Motion as="header" ref="rootEl" class="set-head" :style="{ '--acc': accentColor }"
    :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
    <span class="set-head-grain" aria-hidden="true" />
    <span class="set-head-aura" aria-hidden="true" />

    <div class="set-head-lead">
      <div class="set-head-text">
        <span class="set-eyebrow">
          <span class="eb-dot" />
          <component :is="icon" v-if="icon" :size="12" />
          {{ eyebrow }}
        </span>
        <h1 class="set-title">
          {{ title }}<span v-if="accent" class="set-title-accent">&nbsp;{{ accent }}</span>
        </h1>
        <p v-if="sub" class="set-sub">{{ sub }}</p>
      </div>
      <div v-if="$slots.actions" class="set-head-actions">
        <slot name="actions" />
      </div>
    </div>

    <div v-if="$slots.lenses" class="set-head-lenses">
      <slot name="lenses" />
    </div>
    <slot />
  </Motion>
</template>

<script setup>
import { ref } from 'vue'
import { Motion } from 'motion-v'
import { prefersReduced } from '@/composables/useShiftMotion'

defineProps({
  eyebrow: { type: String, default: '' },
  title: { type: String, default: '' },
  accent: { type: String, default: '' },
  accentColor: { type: String, default: 'var(--set-gold)' },
  sub: { type: String, default: '' },
  icon: { type: [Object, Function], default: null },
})
const rootEl = ref(null)
const reduced = prefersReduced()
</script>

<style scoped>
.set-head {
  position: relative; overflow: hidden;
  padding: 22px 24px; border-radius: 20px;
  background: var(--set-surface); border: 1px solid var(--set-border);
  box-shadow: var(--set-card-shadow);
  display: flex; flex-direction: column; gap: 16px;
}
.set-head-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.5; z-index: 0;
  background-image: linear-gradient(color-mix(in srgb, var(--acc) 6%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--acc) 6%, transparent) 1px, transparent 1px);
  background-size: 30px 30px;
  mask-image: radial-gradient(120% 130% at 0% 0%, #000 12%, transparent 72%);
  -webkit-mask-image: radial-gradient(120% 130% at 0% 0%, #000 12%, transparent 72%); }
.set-head-aura { position: absolute; inset: -50% 40% auto -8%; height: 90%; pointer-events: none; z-index: 0;
  background: radial-gradient(circle, color-mix(in srgb, var(--acc) 20%, transparent), transparent 70%); filter: blur(30px); }

.set-head-lead { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; flex-wrap: wrap; }
.set-head-text { min-width: 0; }
.set-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 10.5px; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase; color: color-mix(in srgb, var(--acc) 62%, var(--set-text-muted)); }
.set-eyebrow :deep(svg) { color: var(--acc); }
.eb-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--acc); box-shadow: 0 0 10px var(--acc);
  animation: set-led-pulse 2.6s ease-in-out infinite; }
.set-title { margin: 8px 0 0; font-size: clamp(22px, 3vw, 30px); font-weight: 850; letter-spacing: -0.02em;
  line-height: 1.05; color: var(--set-text); }
.set-title-accent { background: var(--set-grad-hero); -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; }
.set-sub { margin: 9px 0 0; font-size: 13.5px; line-height: 1.5; color: var(--set-text-muted); max-width: 64ch; }

.set-head-actions { display: flex; align-items: center; gap: 9px; flex-shrink: 0; }
.set-head-lenses { position: relative; z-index: 1; }

@media (prefers-reduced-motion: reduce) { .eb-dot { animation: none; } }
</style>
