<template>
  <div ref="root" class="rkr ex-grain" :class="dir" :style="{ '--c': dirColor }">
    <span class="rkr-aura" aria-hidden="true" />
    <span class="rkr-grid" aria-hidden="true" />
    <span v-for="(m, i) in motes" :key="'m' + i" class="rkr-mote" :style="{ left: m.x + '%', top: m.y + '%', '--d': m.d + 's', '--dl': m.dl + 's' }" aria-hidden="true" />

    <div class="rkr-scene" aria-hidden="true">
      <!-- converging energy streams: earnings (left, emerald) vs recoveries (right, red) -->
      <div class="rkr-stream" :class="{ dim: !num(earnings) }">
        <span v-for="(d, i) in earnDots" :key="'e' + i" class="fdot earn" :style="{ top: (d.y * 100) + '%', width: d.size + 'px', height: d.size + 'px', '--dur': d.dur + 's', '--delay': d.delay + 's' }" />
      </div>
      <div class="rkr-stream" :class="{ dim: !num(recoveries) }">
        <span v-for="(d, i) in recDots" :key="'r' + i" class="fdot rec" :style="{ top: (d.y * 100) + '%', width: d.size + 'px', height: d.size + 'px', '--dur': d.dur + 's', '--delay': d.delay + 's' }" />
      </div>

      <!-- orbiting bodies -->
      <span class="rkr-orbit o1"><span class="sat" /></span>
      <span class="rkr-orbit o2"><span class="sat" /></span>
      <span class="rkr-orbit o3" />

      <!-- emanating pulses -->
      <span class="rkr-pulse" />
      <span class="rkr-pulse d2" />

      <!-- dual-arc balance ring + rotating sheen -->
      <span class="rkr-ring" :style="{ '--seam': seamDeg + 'deg' }"><span class="rkr-sheen" /></span>

      <!-- core readout -->
      <div class="rkr-face">
        <span class="rkr-eyebrow">{{ dirLabel }}</span>
        <ReckonOdometer class="rkr-od" :value="Math.abs(net)" :color="'var(--ex-text)'" />
        <span class="rkr-sub ex-mono">{{ settlementNumber || '—' }}</span>
      </div>
      <span class="rkr-glare" aria-hidden="true" />
    </div>

    <!-- weighing readouts -->
    <div class="rkr-sides">
      <div class="rkr-side earn">
        <div class="rkr-side-top"><span class="rkr-dot" /><TrendingUp :size="12" /> Earnings</div>
        <div class="rkr-side-val ex-mono"><ExCountUp :value="num(earnings)" :format="fmtINR" /></div>
        <div class="rkr-bar"><span class="rkr-bar-fill earn" :style="{ width: earnPctBar + '%' }" /></div>
      </div>
      <div class="rkr-side rec">
        <div class="rkr-side-top"><span class="rkr-dot" /><TrendingDown :size="12" /> Recoveries</div>
        <div class="rkr-side-val ex-mono"><ExCountUp :value="num(recoveries)" :format="fmtINR" /></div>
        <div class="rkr-bar"><span class="rkr-bar-fill rec" :style="{ width: recPctBar + '%' }" /></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { TrendingUp, TrendingDown } from 'lucide-vue-next'
import ReckonOdometer from './ReckonOdometer.vue'
import ExCountUp from './ExCountUp.vue'
import { fmtINR } from '@/composables/useExit'
import { usePointerSpotlight, seededWave } from '@/composables/useShiftMotion'

const props = defineProps({
  earnings: { type: Number, default: 0 },
  recoveries: { type: Number, default: 0 },
  settlementNumber: { type: String, default: '' },
})
const root = ref(null)
usePointerSpotlight(root)

const num = (v) => Number(v || 0)
const net = computed(() => num(props.earnings) - num(props.recoveries))
const maxSide = computed(() => Math.max(num(props.earnings), num(props.recoveries), 1))
const earnPctBar = computed(() => Math.round((num(props.earnings) / maxSide.value) * 100))
const recPctBar = computed(() => Math.round((num(props.recoveries) / maxSide.value) * 100))
const total = computed(() => num(props.earnings) + num(props.recoveries))
// seam between the emerald (earnings) and red (recoveries) arcs — a true balance reading.
const seamDeg = computed(() => (total.value > 0 ? Math.round((num(props.earnings) / total.value) * 360) : 180))

const dir = computed(() => (net.value > 0 ? 'payable' : net.value < 0 ? 'recoverable' : 'balanced'))
const dirLabel = computed(() => (dir.value === 'payable' ? 'NET PAYABLE' : dir.value === 'recoverable' ? 'NET RECOVERABLE' : 'BALANCED'))
const dirColor = computed(() => (dir.value === 'payable' ? 'var(--ex-cleared)' : dir.value === 'recoverable' ? 'var(--ex-blocked)' : '#9ca3af'))

const mkDots = (seed, n = 13) => {
  const w = seededWave(seed, n)
  return Array.from({ length: n }, (_, i) => ({
    y: 0.5 + (w[i] - 0.5) * 0.74,
    delay: -((w[i] * 3.4) + (i * 0.24)),
    dur: 2.3 + w[(i + 4) % n] * 2.1,
    size: 3 + Math.round(w[(i + 6) % n] * 3),
  }))
}
const earnDots = mkDots(7)
const recDots = mkDots(17)
const motes = Array.from({ length: 7 }, (_, i) => {
  const w = seededWave(31 + i, 4)
  return { x: Math.round(w[0] * 92) + 4, y: Math.round(w[1] * 88) + 4, d: 7 + w[2] * 8, dl: -w[3] * 6 }
})
</script>

<style scoped>
@property --seam { syntax: '<angle>'; inherits: false; initial-value: 180deg; }

.rkr { position: relative; overflow: hidden; border-radius: 18px; padding: 16px 16px 18px; min-height: 430px;
  background: var(--ex-surface); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow);
  transition: box-shadow 0.4s, border-color 0.3s; }
.rkr:hover { border-color: var(--ex-border-strong); box-shadow: 0 22px 60px -20px color-mix(in srgb, var(--c) 32%, transparent), var(--ex-card-shadow); }
.rkr-aura { position: absolute; inset: -30%; pointer-events: none;
  background: radial-gradient(45% 40% at 50% 36%, color-mix(in srgb, var(--c) 26%, transparent), transparent 70%);
  animation: rkr-breathe 7s ease-in-out infinite; }
.rkr-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(color-mix(in srgb, var(--ex-text) 5%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--ex-text) 5%, transparent) 1px, transparent 1px);
  background-size: 26px 26px; mask: radial-gradient(70% 60% at 50% 35%, #000, transparent 75%);
  -webkit-mask: radial-gradient(70% 60% at 50% 35%, #000, transparent 75%); }
.rkr-mote { position: absolute; width: 3px; height: 3px; border-radius: 50%; pointer-events: none;
  background: color-mix(in srgb, var(--c) 70%, transparent); box-shadow: 0 0 7px color-mix(in srgb, var(--c) 60%, transparent);
  animation: rkr-mote var(--d) ease-in-out var(--dl) infinite; opacity: 0.5; }

.rkr-scene { position: relative; height: 268px; transform-style: preserve-3d;
  transform: perspective(950px) rotateX(calc((var(--my, 0.5) - 0.5) * -7deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 9deg));
  transition: transform 0.35s ease-out; }
.rkr-glare { position: absolute; inset: 0; border-radius: 16px; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(220px circle at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), color-mix(in srgb, var(--c) 22%, transparent), transparent 60%); }

/* streams */
.rkr-stream { position: absolute; inset: 0; pointer-events: none; transition: opacity 0.5s; }
.rkr-stream.dim { opacity: 0.14; }
.fdot { position: absolute; border-radius: 50%; will-change: left, top, opacity, transform; }
.fdot.earn { left: 3%; background: var(--ex-cleared); box-shadow: 0 0 8px var(--ex-cleared); animation: flow-e var(--dur) linear var(--delay) infinite; }
.fdot.rec { left: 97%; background: var(--ex-blocked); box-shadow: 0 0 8px var(--ex-blocked); animation: flow-r var(--dur) linear var(--delay) infinite; }

/* orbits */
.rkr-orbit { position: absolute; top: 134px; left: 50%; border-radius: 50%; transform: translate(-50%, -50%);
  border: 1px solid color-mix(in srgb, var(--ex-text) 10%, transparent); }
.o1 { width: 176px; height: 176px; animation: rkr-spin 19s linear infinite; }
.o2 { width: 216px; height: 216px; border-style: dashed; border-color: color-mix(in srgb, var(--c) 22%, transparent); animation: rkr-spin 28s linear infinite reverse; }
.o3 { width: 252px; height: 252px; opacity: 0.6; animation: rkr-spin 40s linear infinite; }
.sat { position: absolute; top: -4px; left: calc(50% - 4px); width: 8px; height: 8px; border-radius: 50%;
  background: var(--c); box-shadow: 0 0 10px var(--c); }
.o2 .sat { background: var(--ex-amber); box-shadow: 0 0 10px var(--ex-amber); }

/* pulses */
.rkr-pulse { position: absolute; top: 134px; left: 50%; width: 128px; height: 128px; border-radius: 50%;
  border: 1px solid var(--c); transform: translate(-50%, -50%) scale(0.6); animation: rkr-pulse 3.6s ease-out infinite; }
.rkr-pulse.d2 { animation-delay: 1.8s; }

/* dual-arc balance ring */
.rkr-ring { position: absolute; top: 134px; left: 50%; width: 128px; height: 128px; border-radius: 50%; transform: translate(-50%, -50%);
  background: conic-gradient(from -90deg, var(--ex-cleared) 0 var(--seam), var(--ex-blocked) var(--seam) 360deg);
  transition: --seam 1s cubic-bezier(0.16, 1, 0.3, 1);
  -webkit-mask: radial-gradient(circle, transparent 0 53%, #000 54%); mask: radial-gradient(circle, transparent 0 53%, #000 54%);
  filter: drop-shadow(0 0 14px color-mix(in srgb, var(--c) 45%, transparent)); }
.rkr-sheen { position: absolute; inset: 0; border-radius: 50%;
  background: conic-gradient(from 0deg, transparent 0 80%, rgba(255, 255, 255, 0.55) 90%, transparent 97%);
  animation: rkr-spin 4.5s linear infinite; }

/* core face */
.rkr-face { position: absolute; top: 134px; left: 50%; width: 116px; transform: translate(-50%, -50%); text-align: center; z-index: 3; }
.rkr-eyebrow { display: block; font-size: 8px; font-weight: 850; letter-spacing: 0.1em; color: var(--c); }
.rkr-od { font-size: 21px; font-weight: 850; margin: 3px 0 1px; }
.rkr-sub { display: block; font-size: 8px; color: var(--ex-text-dim); }

/* sides */
.rkr-sides { position: relative; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 6px; }
.rkr-side { position: relative; overflow: hidden; padding: 9px 11px; border-radius: 12px; background: var(--ex-panel); border: 1px solid var(--ex-border); }
.rkr-side::after { content: ''; position: absolute; inset: 0; pointer-events: none; transform: translateX(-120%);
  background: linear-gradient(110deg, transparent 30%, color-mix(in srgb, var(--ex-text) 7%, transparent) 50%, transparent 70%);
  animation: rkr-shine 5.5s ease-in-out infinite; }
.rkr-side.rec::after { animation-delay: 2.75s; }
.rkr-side-top { display: flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
.rkr-side.earn .rkr-side-top { color: var(--ex-cleared); }
.rkr-side.rec .rkr-side-top { color: var(--ex-blocked); }
.rkr-dot { width: 7px; height: 7px; border-radius: 50%; }
.rkr-side.earn .rkr-dot { background: var(--ex-cleared); box-shadow: 0 0 7px var(--ex-cleared); animation: rkr-blink 2.4s ease-in-out infinite; }
.rkr-side.rec .rkr-dot { background: var(--ex-blocked); box-shadow: 0 0 7px var(--ex-blocked); animation: rkr-blink 2.4s ease-in-out 1.2s infinite; }
.rkr-side-val { font-size: 16px; font-weight: 820; color: var(--ex-text); margin: 5px 0 7px; }
.rkr-bar { height: 5px; border-radius: 3px; overflow: hidden; background: color-mix(in srgb, var(--ex-text) 8%, transparent); }
.rkr-bar-fill { display: block; height: 100%; border-radius: 3px; transition: width 1.1s cubic-bezier(0.16, 1, 0.3, 1); }
.rkr-bar-fill.earn { background: linear-gradient(90deg, #34d399, #059669); }
.rkr-bar-fill.rec { background: linear-gradient(90deg, #f87171, #b91c1c); }

@keyframes flow-e { 0% { left: 3%; opacity: 0; transform: scale(0.4); } 14% { opacity: 0.95; } 82% { opacity: 0.95; } 100% { left: 50%; top: 50%; opacity: 0; transform: scale(1.4); } }
@keyframes flow-r { 0% { left: 97%; opacity: 0; transform: scale(0.4); } 14% { opacity: 0.95; } 82% { opacity: 0.95; } 100% { left: 50%; top: 50%; opacity: 0; transform: scale(1.4); } }
@keyframes rkr-spin { to { transform: translate(-50%, -50%) rotate(360deg); } }
@keyframes rkr-pulse { 0% { opacity: 0.5; transform: translate(-50%, -50%) scale(0.6); } 100% { opacity: 0; transform: translate(-50%, -50%) scale(2.15); } }
@keyframes rkr-breathe { 0%, 100% { opacity: 0.8; transform: scale(1); } 50% { opacity: 1; transform: scale(1.06); } }
@keyframes rkr-mote { 0%, 100% { transform: translateY(0); opacity: 0.25; } 50% { transform: translateY(-14px); opacity: 0.7; } }
@keyframes rkr-shine { 0%, 55% { transform: translateX(-120%); } 80%, 100% { transform: translateX(120%); } }
@keyframes rkr-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }

@media (prefers-reduced-motion: reduce) {
  .rkr-aura, .rkr-mote, .fdot, .rkr-orbit, .rkr-pulse, .rkr-sheen, .rkr-side::after, .rkr-dot { animation: none; }
  .rkr-scene { transform: none; transition: none; }
  .rkr-ring, .rkr-bar-fill { transition: none; }
  .rkr-stream.dim { opacity: 0.3; }
}
</style>
