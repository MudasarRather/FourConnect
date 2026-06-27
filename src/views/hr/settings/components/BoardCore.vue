<template>
  <div class="gb-core" :class="{ live: active }">
    <span class="gb-core-glow" aria-hidden="true" />
    <span class="gb-core-orbit" aria-hidden="true" />
    <div class="gb-core-ring" :style="{ '--gb-p': pct * 3.6 + 'deg' }">
      <span class="gb-core-sheen" aria-hidden="true" />
      <div class="gb-core-face">
        <Cpu :size="22" />
        <b class="gb-core-name">HR·CORE</b>
        <span class="gb-core-pct"><SetCountUp :value="pct" suffix="%" /></span>
        <span class="gb-core-lab">configured</span>
      </div>
    </div>
    <span v-for="n in 4" :key="n" class="gb-core-pin" :style="{ '--a': (n - 1) * 90 + 'deg' }" aria-hidden="true" />
  </div>
</template>

<script setup>
import { Cpu } from 'lucide-vue-next'
import SetCountUp from './SetCountUp.vue'

defineProps({
  pct: { type: Number, default: 0 },
  active: { type: Boolean, default: false },
})
</script>

<style scoped>
.gb-core { position: relative; width: 100%; height: 100%; display: grid; place-items: center; }
.gb-core-glow { position: absolute; inset: -30%; background: var(--set-grad-core); filter: blur(20px);
  opacity: 0.7; transition: opacity 0.4s; }
.gb-core.live .gb-core-glow { opacity: 1; }
.gb-core-orbit { position: absolute; inset: 4%; border-radius: 50%; border: 1px dashed color-mix(in srgb, var(--set-gold) 30%, transparent);
  animation: set-core-rot 26s linear infinite; }

.gb-core-ring { position: relative; width: 100%; height: 100%; max-width: 100%; aspect-ratio: 1; border-radius: 50%;
  padding: 7px; background: conic-gradient(var(--set-gold) var(--gb-p), var(--set-trace-idle) 0);
  transition: --gb-p 1.1s var(--set-ease); -webkit-mask: none; }
.gb-core-ring::after { content: ''; position: absolute; inset: 7px; border-radius: 50%;
  background: radial-gradient(circle at 50% 35%, rgba(40,32,16,0.2), transparent), var(--set-panel);
  border: 1px solid var(--set-border-strong); }
.gb-core-sheen { position: absolute; inset: 0; border-radius: 50%; pointer-events: none;
  background: conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.5) 18deg, transparent 40deg);
  mix-blend-mode: screen; opacity: 0.5; animation: set-core-rot 7s linear infinite; }

.gb-core-face { position: absolute; inset: 7px; border-radius: 50%; z-index: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 1px; color: var(--set-gold); text-align: center; }
.gb-core-face > :deep(svg) { color: var(--set-gold); margin-bottom: 2px; }
.gb-core-name { font-family: var(--set-mono); font-size: 10px; font-weight: 800; letter-spacing: 0.14em; color: var(--set-text-secondary); }
.gb-core-pct { font-size: clamp(18px, 2.4vw, 26px); font-weight: 850; color: var(--set-text); line-height: 1; margin-top: 2px; }
.gb-core-lab { font-size: 8.5px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--set-text-dim); }

.gb-core-pin { position: absolute; top: 50%; left: 50%; width: 50%; height: 2px; transform-origin: left center;
  transform: rotate(var(--a)); pointer-events: none; opacity: 0; }

[data-theme="light"] .gb-core-sheen { mix-blend-mode: normal; opacity: 0.3;
  background: conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.7) 18deg, transparent 40deg); }

@media (prefers-reduced-motion: reduce) {
  .gb-core-orbit, .gb-core-sheen { animation: none; }
  .gb-core-ring { transition: none; }
}
</style>
