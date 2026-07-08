<template>
  <!-- Service speed — three station stopwatches: acknowledge, first response,
       resolution. Each dial's brass arc is that stage's share of the passenger's
       total journey time, a hairline hand sweeps continuously, and the slowest
       stage is called out as the bottleneck to fix. -->
  <div class="sd-isp">
    <div class="isp-dials">
      <div v-for="(w, i) in watches" :key="w.key" class="isp-watch" :class="{ slow: w.slowest }" :style="{ '--i': i }">
        <span class="w-crown" aria-hidden="true" />
        <svg viewBox="0 0 96 96">
          <circle class="w-ticks" cx="48" cy="48" r="40" pathLength="60" />
          <circle class="w-track" cx="48" cy="48" r="40" pathLength="100" />
          <circle class="w-arc" cx="48" cy="48" r="40" pathLength="100"
            :style="{ '--fill': w.pct, stroke: w.color, animationDelay: `${0.2 + i * 0.18}s` }" />
          <g class="w-hand" :style="{ animationDuration: `${6 + i * 2.5}s` }">
            <line x1="48" y1="48" x2="48" y2="13" />
          </g>
          <circle class="w-cap" cx="48" cy="48" r="3" />
        </svg>
        <div class="w-read">
          <span class="w-val">{{ w.text }}</span>
          <span class="w-pct sd-mono" :style="{ color: w.color }">{{ w.pct }}%</span>
        </div>
        <span class="w-lbl sd-mono">{{ w.label }}</span>
        <span v-if="w.slowest" class="w-flag sd-mono">BOTTLENECK</span>
      </div>
    </div>
    <p class="isp-foot sd-mono">
      <template v-if="total">ARC = SHARE OF THE PASSENGER'S JOURNEY · TOTAL {{ fmt(total) }}</template>
      <template v-else>NO TIMED SERVICES IN THIS RANGE YET</template>
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  mtta: { type: Number, default: null },            // minutes
  firstResponse: { type: Number, default: null },
  mttr: { type: Number, default: null },
})

const fmt = (m) => { if (m == null) return '—'; if (m < 60) return `${Math.round(m)}m`; if (m < 1440) return `${(m / 60).toFixed(1)}h`; return `${(m / 1440).toFixed(1)}d` }
const total = computed(() => (props.mtta || 0) + (props.firstResponse || 0) + (props.mttr || 0))

const watches = computed(() => {
  const defs = [
    { key: 'ack', label: 'ACKNOWLEDGE', v: props.mtta, color: 'var(--intel-bright)' },
    { key: 'fr', label: 'FIRST RESPONSE', v: props.firstResponse, color: 'var(--intel)' },
    { key: 'res', label: 'RESOLUTION', v: props.mttr, color: 'var(--intel-deep)' },
  ]
  const max = Math.max(...defs.map(d => d.v || 0))
  return defs.map(d => ({
    ...d,
    text: fmt(d.v),
    pct: total.value ? Math.round(((d.v || 0) / total.value) * 100) : 0,
    slowest: max > 0 && d.v === max,
  }))
})
</script>

<style scoped>
.sd-isp { display: flex; flex-direction: column; gap: 10px; }
.isp-dials { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }

.isp-watch { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 12px 6px 10px; border-radius: 14px; background: var(--sd-surface-glass); border: 1px solid transparent;
  animation: sd-isp-in 0.6s var(--sd-spring) backwards; animation-delay: calc(var(--i) * 0.1s);
  transition: border-color 0.2s, transform 0.25s var(--sd-spring); }
.isp-watch:hover { transform: translateY(-3px); border-color: var(--intel-border); }
.isp-watch.slow { border-color: color-mix(in srgb, var(--intel-dn) 35%, transparent); }
@keyframes sd-isp-in { from { opacity: 0; transform: translateY(14px) scale(0.9); } }

.w-crown { position: absolute; top: 6px; left: 50%; width: 8px; height: 5px; transform: translateX(-50%);
  border-radius: 2px 2px 0 0; background: color-mix(in srgb, var(--intel) 55%, var(--sd-text-dim)); }

.isp-watch svg { width: 76px; height: 76px; display: block; }
.w-ticks { fill: none; stroke: var(--sd-text-dim); stroke-width: 4; opacity: 0.35;
  stroke-dasharray: 0.35 4.65; stroke-dashoffset: 0.175; }
.w-track { fill: none; stroke: var(--sd-surface-glass); stroke-width: 6; }
.w-arc { fill: none; stroke-width: 6; stroke-linecap: round; transform: rotate(-90deg); transform-origin: 48px 48px;
  stroke-dasharray: 0 100; animation: sd-isp-arc 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes sd-isp-arc { to { stroke-dasharray: var(--fill) 100; } }
.w-hand { transform-origin: 48px 48px; animation: sd-isp-sweep linear infinite; }
.w-hand line { stroke: color-mix(in srgb, var(--sd-text) 55%, transparent); stroke-width: 1.4; stroke-linecap: round; }
@keyframes sd-isp-sweep { to { transform: rotate(360deg); } }
.w-cap { fill: var(--intel); }

.w-read { position: absolute; top: 42px; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; gap: 0; }
.w-val { font-size: 15.5px; font-weight: 800; color: var(--sd-text); letter-spacing: -0.02em; line-height: 1.1; }
.w-pct { font-size: 8px; font-weight: 700; letter-spacing: 0.1em; }
.w-lbl { font-size: 8px; letter-spacing: 0.18em; color: var(--sd-text-muted); margin-top: 2px; }
.w-flag { font-size: 7.5px; font-weight: 700; letter-spacing: 0.16em; color: var(--intel-dn);
  padding: 2px 7px; border-radius: 5px; background: color-mix(in srgb, var(--intel-dn) 12%, transparent);
  animation: sd-isp-blink 1.6s steps(2, jump-none) infinite; }
@keyframes sd-isp-blink { 50% { opacity: 0.45; } }

.isp-foot { margin: 0; font-size: 8.5px; letter-spacing: 0.16em; color: var(--sd-text-dim); text-align: center; }

@media (max-width: 480px) { .isp-dials { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .isp-watch { animation: none; }
  html:not([data-cinematic="on"]) .w-arc { animation: none; stroke-dasharray: var(--fill) 100; }
  html:not([data-cinematic="on"]) .w-hand, html:not([data-cinematic="on"]) .w-flag { animation: none; }
}
</style>
