<template>
  <!-- Radial desk instrument for the Terminal dashboard.
       mode="ring" → full 360° compliance ring · mode="arc" → 240° speedometer.
       A single rAF tween drives the arc fill, the traveling glow head, the needle
       sweep and the tick lighting so the whole instrument moves as one machine.
       The dial sits in a dark "instrument well" — a lit gauge on the desk, matching
       the terminal screen aesthetic in both themes. -->
  <div ref="el" class="pg" :class="[mode, { clickable }]" :style="{ '--ac': accent, '--i': index }"
       :role="clickable ? 'button' : undefined" :tabindex="clickable ? 0 : undefined"
       @pointermove="onMove" @pointerleave="onLeave"
       @click="clickable && $emit('activate')" @keydown.enter="clickable && $emit('activate')">
    <span class="pg-glow" aria-hidden="true" />
    <span class="pg-glare" aria-hidden="true" />
    <span class="pg-sheen" aria-hidden="true" />

    <div class="pg-well">
      <span class="pg-halo" aria-hidden="true" />
      <span class="pg-scan" aria-hidden="true" />
      <div class="pg-dial">
        <svg :viewBox="`0 0 ${SZ} ${SZ}`" class="pg-svg" aria-hidden="true">
          <defs>
            <linearGradient :id="gradId" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" class="pg-stop-a" />
              <stop offset="100%" class="pg-stop-b" />
            </linearGradient>
          </defs>
          <line v-for="(tk, i) in ticks" :key="'t' + i" class="pg-tick" :class="{ lit: tk.lit, major: tk.major }"
            :x1="tk.x1" :y1="tk.y1" :x2="tk.x2" :y2="tk.y2" />
          <circle class="pg-track" :cx="C" :cy="C" :r="R" pathLength="100"
            :stroke-dasharray="`${span} 100`" :transform="`rotate(${rot} ${C} ${C})`" />
          <circle class="pg-fill" :cx="C" :cy="C" :r="R" pathLength="100" :stroke="`url(#${gradId})`"
            :stroke-dasharray="`${span} 100`" :stroke-dashoffset="offset"
            :transform="`rotate(${rot} ${C} ${C})`" />
          <!-- needle sweep -->
          <g class="pg-needle" :transform="`rotate(${needleDeg} ${C} ${C})`">
            <polygon class="pg-needle-body" :points="`${C + 14},${C - 1.6} ${C + R - 15},${C} ${C + 14},${C + 1.6}`" />
          </g>
          <circle class="pg-hub-o" :cx="C" :cy="C" r="7.5" />
          <circle class="pg-hub" :cx="C" :cy="C" r="4" />
          <!-- traveling glow head riding the arc tip -->
          <circle class="pg-head" :cx="head.x" :cy="head.y" r="4.6" />
          <circle class="pg-head-ring" :cx="head.x" :cy="head.y" r="4.6" />
        </svg>
        <div class="pg-core">
          <span class="pg-val sd-mono" :key="display">{{ display }}</span>
          <span v-if="delta" class="pg-delta" :class="deltaTone">{{ delta }}</span>
        </div>
      </div>
    </div>

    <div class="pg-meta">
      <span class="pg-label">{{ label }}</span>
      <span v-if="caption" class="pg-caption sd-mono">{{ caption }}</span>
    </div>
    <span class="pg-baseline" aria-hidden="true" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  mode: { type: String, default: 'arc' },        // 'ring' | 'arc'
  fraction: { type: Number, default: 0 },          // 0..1 fill
  display: { type: String, default: '—' },         // big centred readout
  label: { type: String, default: '' },
  caption: { type: String, default: '' },
  delta: { type: String, default: '' },            // small ± chip under the value
  deltaTone: { type: String, default: 'up' },      // 'up' | 'down' | 'flat'
  accent: { type: String, default: 'var(--pulse)' },
  index: { type: Number, default: 0 },
  clickable: { type: Boolean, default: false },
})
defineEmits(['activate'])

const SZ = 128, C = 64, R = 53
let uidSeq = 0
const gradId = `pg-grad-${++uidSeq}-${Math.abs((`${props.label}${props.index}`).split('').reduce((s, ch) => s + ch.charCodeAt(0), 0))}`

// ring = full 360 (span 100); arc = 240° (span 66.67), rotated so the gap sits at the bottom.
const span = computed(() => (props.mode === 'ring' ? 100 : 66.67))
const rot = computed(() => (props.mode === 'ring' ? -90 : 150))

/* One rAF tween (ease-out cubic, slight overshoot settle) drives arc + head + needle + ticks. */
const frac = ref(0)
const clamped = computed(() => Math.max(0, Math.min(1, Number(props.fraction) || 0)))
let raf = null
const tweenTo = (target) => {
  if (raf) cancelAnimationFrame(raf)
  const from = frac.value, delta = target - from, dur = 1300
  let t0 = null
  const step = (ts) => {
    if (t0 == null) t0 = ts
    const p = Math.min(1, (ts - t0) / dur)
    // easeOutBack-ish: overshoot then settle, clamped to sane range
    const k = 1.35
    const e = 1 + (k + 1) * Math.pow(p - 1, 3) + k * Math.pow(p - 1, 2)
    frac.value = Math.max(0, Math.min(1.04, from + delta * e))
    if (p < 1) raf = requestAnimationFrame(step)
    else frac.value = target
  }
  raf = requestAnimationFrame(step)
}
onMounted(() => { tweenTo(clamped.value) })
onBeforeUnmount(() => { if (raf) cancelAnimationFrame(raf) })
watch(clamped, (v) => { tweenTo(v) })

const offset = computed(() => (span.value * (1 - Math.min(1, frac.value))).toFixed(3))
const needleDeg = computed(() => rot.value + Math.min(1, frac.value) * span.value * 3.6)

/* glow head rides the end of the fill arc */
const head = computed(() => {
  const rad = (needleDeg.value * Math.PI) / 180
  return { x: (C + R * Math.cos(rad)).toFixed(2), y: (C + R * Math.sin(rad)).toFixed(2) }
})

/* tick marks along the dial; ticks behind the sweep light up as the needle passes */
const ticks = computed(() => {
  const n = props.mode === 'ring' ? 28 : 19
  const out = []
  for (let i = 0; i < n; i++) {
    const f = props.mode === 'ring' ? i / n : i / (n - 1)
    const major = props.mode === 'ring' ? i % 7 === 0 : i % 3 === 0
    const deg = rot.value + f * span.value * 3.6
    const rad = (deg * Math.PI) / 180
    const r1 = R - 8, r2 = major ? R - 15 : R - 12
    out.push({
      x1: (C + r1 * Math.cos(rad)).toFixed(2), y1: (C + r1 * Math.sin(rad)).toFixed(2),
      x2: (C + r2 * Math.cos(rad)).toFixed(2), y2: (C + r2 * Math.sin(rad)).toFixed(2),
      lit: f <= Math.min(1, frac.value) + 0.001, major,
    })
  }
  return out
})

/* 3D pointer tilt + spotlight glare (same mechanic as the KPI tiles) */
const el = ref(null)
const onMove = (e) => {
  const node = el.value; if (!node) return
  const r = node.getBoundingClientRect()
  node.style.setProperty('--mx', ((e.clientX - r.left) / r.width).toFixed(3))
  node.style.setProperty('--my', ((e.clientY - r.top) / r.height).toFixed(3))
  node.style.setProperty('--spot', '1')
}
const onLeave = () => {
  const node = el.value; if (!node) return
  node.style.setProperty('--spot', '0'); node.style.setProperty('--mx', '0.5'); node.style.setProperty('--my', '0.5')
}
</script>

<style scoped>
.pg { position: relative; display: flex; flex-direction: column; align-items: center; gap: 11px;
  padding: 16px 14px 15px; border-radius: 20px; background: var(--sd-surface); border: 1px solid var(--sd-border);
  overflow: hidden; animation: sd-deal 0.55s var(--sd-spring) backwards; animation-delay: calc(var(--i) * 0.06s);
  transition: border-color 0.28s var(--sd-spring), box-shadow 0.28s var(--sd-spring), transform 0.32s var(--sd-spring);
  transform: perspective(900px) rotateX(calc((var(--my, 0.5) - 0.5) * -5deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 7deg));
  transform-style: preserve-3d; }
.pg.clickable { cursor: pointer; }
.pg.clickable:hover { border-color: color-mix(in srgb, var(--ac) 48%, var(--sd-border-strong));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--ac) 24%, transparent), 0 18px 40px rgba(0, 0, 0, 0.32);
  transform: perspective(900px) rotateX(calc((var(--my, 0.5) - 0.5) * -5deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 7deg)) translateY(-3px); }
.pg-glow { position: absolute; inset: 0; pointer-events: none; border-radius: inherit;
  background: radial-gradient(120% 90% at 50% 0%, color-mix(in srgb, var(--ac) 12%, transparent), transparent 62%); }
.pg-glare { position: absolute; inset: 0; pointer-events: none; border-radius: inherit; opacity: var(--spot, 0);
  background: radial-gradient(340px circle at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), color-mix(in srgb, var(--ac) 22%, transparent), transparent 46%);
  transition: opacity 0.3s; mix-blend-mode: screen; }
.pg-sheen { position: absolute; top: 0; left: 0; width: 44%; height: 100%; pointer-events: none;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--ac) 14%, transparent), transparent);
  transform: translateX(-130%) skewX(-18deg); opacity: 0; }
.pg.clickable:hover .pg-sheen { opacity: 1; animation: sd-tile-sheen 0.9s ease; }

/* dark instrument well — a lit gauge face on the desk, in both themes */
.pg-well { position: relative; width: 132px; height: 132px; border-radius: 50%; display: grid; place-items: center;
  background: radial-gradient(90% 90% at 50% 30%, color-mix(in srgb, var(--ac) 10%, transparent), transparent 62%),
    radial-gradient(circle, var(--pulse-stage-2, #0d0f13) 0%, var(--pulse-stage, #08090c) 78%);
  border: 1px solid color-mix(in srgb, var(--ac) 26%, var(--pulse-screen-edge, rgba(251, 191, 36, 0.16)));
  box-shadow: inset 0 4px 18px rgba(0, 0, 0, 0.55), inset 0 -2px 8px rgba(0, 0, 0, 0.4),
    0 6px 18px rgba(0, 0, 0, 0.22); overflow: hidden; }
.pg-halo { position: absolute; inset: -30%; pointer-events: none; opacity: 0.5;
  background: conic-gradient(from 0deg, transparent 0 78%, color-mix(in srgb, var(--ac) 30%, transparent) 90%, transparent 100%);
  animation: pg-halo 7s linear infinite; }
.pg-scan { position: absolute; inset: 0; pointer-events: none; border-radius: 50%; opacity: 0.4;
  background: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.028) 0 1px, transparent 1px 3px); }

.pg-dial { position: relative; width: 122px; height: 122px; }
.pg-svg { width: 100%; height: 100%; overflow: visible; display: block; }
.pg-stop-a { stop-color: var(--ac); }
.pg-stop-b { stop-color: color-mix(in srgb, var(--ac) 55%, #ffffff 12%); }
.pg-tick { stroke: rgba(255, 255, 255, 0.14); stroke-width: 1.4; stroke-linecap: round; transition: stroke 0.35s; }
.pg-tick.major { stroke-width: 1.9; }
.pg-tick.lit { stroke: color-mix(in srgb, var(--ac) 78%, transparent); }
.pg-track { fill: none; stroke: rgba(255, 255, 255, 0.1); stroke-width: 7.5; stroke-linecap: round; }
.pg-fill { fill: none; stroke-width: 7.5; stroke-linecap: round;
  filter: drop-shadow(0 0 7px color-mix(in srgb, var(--ac) 60%, transparent)); }

.pg-needle-body { fill: color-mix(in srgb, var(--ac) 85%, #ffffff 10%);
  filter: drop-shadow(0 0 4px color-mix(in srgb, var(--ac) 60%, transparent)); }
.pg-hub-o { fill: none; stroke: color-mix(in srgb, var(--ac) 45%, transparent); stroke-width: 1.4; }
.pg-hub { fill: var(--ac); filter: drop-shadow(0 0 5px var(--ac)); }
.pg-head { fill: var(--ac); filter: drop-shadow(0 0 8px var(--ac)); }
.pg-head-ring { fill: none; stroke: var(--ac); stroke-width: 1.4; opacity: 0.7;
  animation: pg-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite; transform-origin: center; transform-box: fill-box; }

.pg-core { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; }
.pg-val { font-size: 22px; font-weight: 800; color: var(--pulse-screen-txt, #e8ecf2); letter-spacing: -0.02em; line-height: 1;
  text-shadow: 0 0 16px color-mix(in srgb, var(--ac) 45%, transparent); animation: pg-pop 0.5s var(--sd-spring); }
.pg-delta { font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 999px; }
.pg-delta.up { color: var(--pulse-up); background: color-mix(in srgb, var(--pulse-up) 18%, transparent); }
.pg-delta.down { color: var(--pulse-dn); background: color-mix(in srgb, var(--pulse-dn) 20%, transparent); }
.pg-delta.flat { color: rgba(255, 255, 255, 0.6); background: rgba(255, 255, 255, 0.08); }

.pg-meta { display: flex; flex-direction: column; align-items: center; gap: 2px; text-align: center; }
.pg-label { font-size: 12.5px; font-weight: 700; color: var(--sd-text); }
.pg-caption { font-size: 10px; color: var(--sd-text-dim); letter-spacing: 0.04em; text-transform: uppercase; }
.pg-baseline { position: absolute; left: 18%; right: 18%; bottom: 0; height: 2.5px; border-radius: 999px 999px 0 0;
  background: linear-gradient(90deg, transparent, var(--ac), transparent); transform: scaleX(0); opacity: 0.85;
  transition: transform 0.35s var(--sd-spring); }
.pg:hover .pg-baseline { transform: scaleX(1); }

@keyframes pg-halo { to { transform: rotate(360deg); } }
@keyframes pg-ping { 0% { transform: scale(1); opacity: 0.7; } 75%, 100% { transform: scale(2.4); opacity: 0; } }
@keyframes pg-pop { 0% { opacity: 0; transform: scale(0.7); filter: blur(4px); } 100% { opacity: 1; transform: scale(1); filter: blur(0); } }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .pg { animation: none; transform: none; }
  html:not([data-cinematic="on"]) .pg:hover { transform: none; }
  html:not([data-cinematic="on"]) .pg-halo,
  html:not([data-cinematic="on"]) .pg-head-ring,
  html:not([data-cinematic="on"]) .pg-val { animation: none; }
  html:not([data-cinematic="on"]) .pg-sheen { animation: none !important; }
}
</style>
