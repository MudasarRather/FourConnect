<template>
  <!-- Entrances — which doors the range's arrivals came through. An interactive
       departure-hall turnstile dial: hovering a door (segment OR legend row)
       widens its gate, swings the center readout to that channel and lights its
       legend meter. -->
  <div class="sd-icm" @pointerleave="active = ''">
    <div class="icm-donut">
      <span class="icm-halo" aria-hidden="true" />
      <svg viewBox="0 0 120 120">
        <circle class="track" cx="60" cy="60" r="46" />
        <circle v-for="(s, i) in segs" :key="s.key" class="seg" :class="{ on: active === s.key, dim: active && active !== s.key }"
          cx="60" cy="60" r="46" :stroke="s.color"
          :stroke-dasharray="`${s.len} ${CIRC - s.len}`" :stroke-dashoffset="-s.off"
          :style="{ animationDelay: `${0.15 + i * 0.12}s` }"
          @pointerenter="active = s.key" />
      </svg>
      <div class="icm-center" :key="active || '_all'">
        <span class="c-big">{{ activeSeg ? activeSeg.value : total }}</span>
        <span class="c-cap sd-mono">{{ activeSeg ? activeSeg.label.toUpperCase() : 'ARRIVALS' }}</span>
        <span v-if="activeSeg" class="c-pct sd-mono" :style="{ color: activeSeg.color }">{{ activeSeg.pct }}% OF FLOW</span>
      </div>
    </div>

    <div class="icm-legend">
      <button v-for="(s, i) in segs" :key="s.key" type="button" class="lg-row" :class="{ on: active === s.key, dim: active && active !== s.key }"
        :style="{ '--i': i, '--c': s.color }" @pointerenter="active = s.key" @focus="active = s.key">
        <i class="lg-door" aria-hidden="true" />
        <span class="lg-name">{{ s.label }}</span>
        <span class="lg-track"><i :style="{ width: s.pct + '%', animationDelay: `${0.3 + i * 0.1}s` }" /></span>
        <span class="lg-pct sd-mono">{{ s.pct }}%</span>
        <span class="lg-val sd-mono">{{ s.value }}</span>
      </button>
      <p v-if="!segs.length" class="icm-empty sd-mono">ALL ENTRANCES QUIET — NO ARRIVALS IN RANGE</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  mix: { type: Object, default: () => ({}) },   // { source: count }
})

const CIRC = 2 * Math.PI * 46
/* distinct warm-family hues per door — literal hexes picked to read on BOTH themes */
const META = {
  portal: ['Portal', '#e8a33d'],
  email: ['Email', '#c9773a'],
  internal: ['Internal', '#8a6f45'],
  phone: ['Phone', '#4fae83'],
  chat: ['Chat', '#e2854c'],
  whatsapp: ['WhatsApp', '#6fae5f'],
  api: ['API', '#9aa2af'],
  monitoring: ['Monitoring', '#d96a5a'],
}
const active = ref('')
const total = computed(() => Object.values(props.mix || {}).reduce((a, b) => a + b, 0))
const segs = computed(() => {
  const entries = Object.entries(props.mix || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
  let off = 0
  return entries.map(([k, v]) => {
    const frac = total.value ? v / total.value : 0
    const len = frac * CIRC
    const seg = {
      key: k, value: v, pct: Math.round(frac * 100),
      label: META[k]?.[0] || (k.charAt(0).toUpperCase() + k.slice(1)),
      color: META[k]?.[1] || '#9aa2af',
      len: Math.max(0, len - 2.5), off,
    }
    off += len
    return seg
  })
})
const activeSeg = computed(() => segs.value.find(s => s.key === active.value) || null)
</script>

<style scoped>
.sd-icm { display: grid; grid-template-columns: 148px 1fr; gap: 18px; align-items: center; }

.icm-donut { position: relative; }
.icm-halo { position: absolute; inset: -8%; border-radius: 50%; pointer-events: none;
  background: conic-gradient(from 0deg, transparent 0 70%, color-mix(in srgb, var(--intel) 14%, transparent) 86%, transparent 100%);
  animation: sd-icm-halo 9s linear infinite; }
@keyframes sd-icm-halo { to { transform: rotate(360deg); } }
.icm-donut svg { width: 100%; display: block; transform: rotate(-90deg); position: relative; }
.track { fill: none; stroke: var(--sd-surface-glass); stroke-width: 12; }
.seg { fill: none; stroke-width: 12; stroke-linecap: butt; cursor: pointer;
  transition: stroke-width 0.25s var(--sd-spring), opacity 0.2s, filter 0.2s;
  animation: sd-icm-sweep 1s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
.seg.on { stroke-width: 17; filter: drop-shadow(0 0 8px currentColor) brightness(1.08); }
.seg.dim { opacity: 0.3; }
@keyframes sd-icm-sweep { from { stroke-dasharray: 0 289; } }

.icm-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 2px; pointer-events: none; animation: sd-icm-swap 0.3s var(--sd-spring); }
@keyframes sd-icm-swap { from { opacity: 0; transform: scale(0.86); } }
.c-big { font-size: 26px; font-weight: 800; color: var(--sd-text); letter-spacing: -0.02em; line-height: 1; }
.c-cap { font-size: 7.5px; letter-spacing: 0.26em; color: var(--sd-text-dim); }
.c-pct { font-size: 8px; letter-spacing: 0.14em; font-weight: 700; }

.icm-legend { display: flex; flex-direction: column; gap: 5px; }
.lg-row { display: grid; grid-template-columns: 14px minmax(64px, auto) 1fr auto auto; align-items: center; gap: 9px;
  width: 100%; padding: 6px 8px; border: 1px solid transparent; border-radius: 10px; background: transparent;
  cursor: pointer; text-align: left; transition: background 0.16s, border-color 0.16s, opacity 0.2s, transform 0.2s var(--sd-spring);
  animation: sd-stream-in 0.45s var(--sd-spring) backwards; animation-delay: calc(var(--i) * 0.06s); }
.lg-row.on { background: color-mix(in srgb, var(--c) 8%, transparent); border-color: color-mix(in srgb, var(--c) 35%, transparent); transform: translateX(3px); }
.lg-row.dim { opacity: 0.45; }
.lg-row:focus-visible { outline: 2px solid var(--intel); outline-offset: 1px; }

.lg-door { width: 11px; height: 11px; border-radius: 3px; background: var(--c); position: relative;
  box-shadow: 0 0 8px color-mix(in srgb, var(--c) 45%, transparent); }
.lg-row.on .lg-door { animation: sd-icm-door 0.9s ease-in-out infinite alternate; }
@keyframes sd-icm-door { from { transform: scaleX(1); } to { transform: scaleX(0.55); } }
.lg-name { font-size: 12.5px; color: var(--sd-text-secondary); font-weight: 600; }
.lg-row.on .lg-name { color: var(--sd-text); }
.lg-track { height: 5px; border-radius: 99px; background: var(--sd-surface-glass); overflow: hidden; }
.lg-track i { display: block; height: 100%; border-radius: 99px; background: var(--c); transform-origin: left;
  animation: sd-bar-grow 0.8s var(--sd-spring) backwards; transition: width 0.4s var(--sd-spring); }
.lg-pct { font-size: 10px; color: var(--sd-text-dim); min-width: 30px; text-align: right; }
.lg-val { font-size: 12px; font-weight: 700; color: var(--sd-text); min-width: 24px; text-align: right; }
.icm-empty { color: var(--sd-text-dim); font-size: 10px; letter-spacing: 0.18em; margin: 0; }

@media (max-width: 480px) { .sd-icm { grid-template-columns: 1fr; } .icm-donut { max-width: 160px; margin: 0 auto; } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .seg, html:not([data-cinematic="on"]) .lg-row,
  html:not([data-cinematic="on"]) .lg-track i, html:not([data-cinematic="on"]) .icm-center,
  html:not([data-cinematic="on"]) .icm-halo, html:not([data-cinematic="on"]) .lg-row.on .lg-door { animation: none; }
}
</style>
