<template>
  <div ref="stageEl" class="ag" :class="{ reduced }">
    <span class="ag-grain" aria-hidden="true" />
    <span class="ag-aura" aria-hidden="true" :style="{ '--c': sealHex }" />
    <span class="ag-motes" aria-hidden="true"><i v-for="n in 6" :key="n" :style="moteStyle(n)" /></span>

    <div class="ag-stage">
      <!-- radial shield -->
      <svg class="ag-svg" viewBox="0 0 240 240" aria-hidden="true">
        <!-- ambient reticle -->
        <circle class="ag-reticle" cx="120" cy="120" r="112" />
        <circle class="ag-hairline" cx="120" cy="120" r="74" />
        <!-- statute arcs -->
        <g v-for="a in arcs" :key="a.key">
          <circle class="ag-track" cx="120" cy="120" :r="R" :stroke-dasharray="`${a.trackLen} ${C}`"
            :transform="`rotate(${a.start} 120 120)`" />
          <circle class="ag-fill" :style="{ stroke: a.hex, strokeDasharray: `${a.fillLen} ${C}`, filter: `drop-shadow(0 0 6px ${a.hex})` }"
            cx="120" cy="120" :r="R" :transform="`rotate(${a.start} 120 120)`" />
        </g>
      </svg>

      <!-- family nodes -->
      <button v-for="a in arcs" :key="a.key" type="button" class="ag-node" :data-status="a.status"
        :style="{ top: a.pos.top, left: a.pos.left, '--c': a.hex }" @click="$emit('pick', a.key)" :title="`${a.label} — ${a.configured}/${a.total} configured`">
        <span class="ag-node-ic"><component :is="ICONS[a.key]" :size="15" /></span>
        <span class="ag-node-body">
          <b>{{ a.short }}</b>
          <span class="ag-node-flag" :data-status="a.status"><i /> {{ a.flag }}</span>
        </span>
        <span class="ag-node-cov set-mono">{{ a.configured }}/{{ a.total }}</span>
      </button>

      <!-- central compliance seal -->
      <div class="ag-seal">
        <span class="ag-seal-ring" :style="{ '--ag-p': pctDeg + 'deg', '--c': sealHex }" />
        <span class="ag-seal-core" :data-state="sealState">
          <component :is="sealState === 'sealed' ? Lock : ShieldAlert" :size="18" />
          <b><SetCountUp :value="overall.pct" :suffix="'%'" /></b>
          <small>compliant</small>
        </span>
      </div>
    </div>

    <!-- caption -->
    <div class="ag-cap">
      <span class="ag-cap-fy set-mono">{{ fy }}<i v-if="state"> · {{ state }}</i></span>
      <span class="ag-cap-state" :data-state="sealState">{{ sealLabel }}</span>
      <span class="ag-cap-note">{{ overall.configured }}/{{ overall.total }} engine inputs configured · the rest fall back to statutory defaults</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { PiggyBank, HeartPulse, Landmark, Receipt, Lock, ShieldAlert } from 'lucide-vue-next'
import SetCountUp from './SetCountUp.vue'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  families: { type: Array, default: () => [] }, // [{key,label,short,hex,configured,total}]
  overall: { type: Object, default: () => ({ configured: 0, total: 0, pct: 0 }) },
  fy: { type: String, default: '' },
  state: { type: String, default: '' },
})
defineEmits(['pick'])

const reduced = prefersReduced()
const stageEl = ref(null)
usePointerSpotlight(stageEl)

const ICONS = { pf: PiggyBank, esi: HeartPulse, pt: Landmark, tax: Receipt }
const R = 94
const C = 2 * Math.PI * R
const SPAN = 64
const CENTERS = { pf: -90, esi: 0, pt: 90, tax: 180 }
const POS = {
  pf: { top: '3%', left: '50%' }, esi: { top: '50%', left: '97%' },
  pt: { top: '97%', left: '50%' }, tax: { top: '50%', left: '3%' },
}
const FLAG = { sealed: 'ON TIME', partial: 'SAFETY', open: 'RED FLAG' }

const arcs = computed(() => props.families.map((f) => {
  const total = f.total || 0
  const pct = total ? f.configured / total : 0
  const status = pct >= 1 ? 'sealed' : pct > 0 ? 'partial' : 'open'
  const trackLen = (SPAN / 360) * C
  return {
    ...f, pct, status, flag: FLAG[status],
    start: (CENTERS[f.key] ?? 0) - SPAN / 2,
    trackLen, fillLen: trackLen * pct,
    pos: POS[f.key] || { top: '50%', left: '50%' },
  }
}))

const pctDeg = computed(() => Math.round((props.overall.pct || 0) * 3.6))
const sealState = computed(() => {
  const p = props.overall.pct || 0
  return p >= 100 ? 'sealed' : p > 0 ? 'partial' : 'open'
})
const sealHex = computed(() => (sealState.value === 'sealed' ? '#34d399' : sealState.value === 'partial' ? '#fbbf24' : '#f87171'))
const sealLabel = computed(() => ({ sealed: 'Fully sealed', partial: 'On defaults', open: 'Unconfigured' }[sealState.value]))

const moteStyle = (n) => ({ '--mleft': `${(n * 53) % 90 + 5}%`, '--dur': `${6 + (n % 4) * 1.4}s`, '--delay': `${(n * 0.8).toFixed(1)}s` })
</script>

<style scoped>
@property --ag-p { syntax: '<angle>'; inherits: false; initial-value: 0deg; }

.ag { position: relative; overflow: hidden; isolation: isolate; display: flex; flex-direction: column; align-items: center; gap: 12px;
  min-height: 400px; padding: 22px 18px 18px; border-radius: 20px;
  background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow); }
.ag-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.5; z-index: 0;
  background-image: linear-gradient(color-mix(in srgb, var(--set-ok) 6%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--set-ok) 6%, transparent) 1px, transparent 1px);
  background-size: 30px 30px; mask-image: radial-gradient(80% 80% at 50% 42%, #000 30%, transparent 80%); -webkit-mask-image: radial-gradient(80% 80% at 50% 42%, #000 30%, transparent 80%); }
.ag-aura { position: absolute; top: 8%; left: 50%; width: 60%; height: 60%; transform: translateX(-50%); pointer-events: none; z-index: 0;
  background: radial-gradient(circle, color-mix(in srgb, var(--c) 26%, transparent), transparent 70%); filter: blur(38px);
  transform: translate(calc(-50% + (var(--mx,0.5) - 0.5) * 16px), calc((var(--my,0.5) - 0.5) * 12px)); transition: background 0.5s; }
.ag-motes { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
.ag-motes i { position: absolute; bottom: 12%; left: var(--mleft); width: 3px; height: 3px; border-radius: 50%;
  background: color-mix(in srgb, var(--set-ok) 70%, #fff); box-shadow: 0 0 8px var(--set-ok); opacity: 0; animation: ag-mote var(--dur) linear infinite; animation-delay: var(--delay); }
@keyframes ag-mote { 0% { transform: translateY(0); opacity: 0; } 14% { opacity: 0.8; } 86% { opacity: 0.6; } 100% { transform: translateY(-220px); opacity: 0; } }

.ag-stage { position: relative; width: min(340px, 84vw); aspect-ratio: 1; z-index: 1; }
.ag-svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.ag-reticle { fill: none; stroke: color-mix(in srgb, var(--set-text) 12%, transparent); stroke-width: 1; stroke-dasharray: 2 8; transform-origin: 120px 120px; animation: ag-spin 70s linear infinite; }
.ag-hairline { fill: none; stroke: color-mix(in srgb, var(--set-text) 8%, transparent); stroke-width: 1; }
@keyframes ag-spin { to { transform: rotate(360deg); } }
.ag-track { fill: none; stroke: color-mix(in srgb, var(--set-text) 10%, transparent); stroke-width: 11; stroke-linecap: round; }
.ag-fill { fill: none; stroke-width: 11; stroke-linecap: round; transition: stroke-dasharray 0.9s var(--set-spring); }

.ag-node { position: absolute; transform: translate(-50%, -50%); display: flex; align-items: center; gap: 8px; padding: 7px 11px 7px 8px; border-radius: 13px; cursor: pointer;
  background: var(--set-surface-elevated); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow); transition: transform 0.25s var(--set-spring), border-color 0.25s, box-shadow 0.25s; font: inherit; z-index: 2; }
.ag-node:hover { transform: translate(-50%, -50%) scale(1.05); border-color: color-mix(in srgb, var(--c) 45%, transparent); box-shadow: 0 0 22px -6px var(--c); }
.ag-node-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0; color: var(--c);
  background: color-mix(in srgb, var(--c) 15%, transparent); border: 1px solid color-mix(in srgb, var(--c) 32%, transparent); }
.ag-node-body { display: flex; flex-direction: column; line-height: 1.15; align-items: flex-start; }
.ag-node-body b { font-size: 12.5px; font-weight: 850; color: var(--set-text); }
.ag-node-flag { display: inline-flex; align-items: center; gap: 4px; font-size: 7.5px; font-weight: 850; letter-spacing: 0.08em; }
.ag-node-flag i { width: 5px; height: 5px; border-radius: 1px; }
.ag-node-flag[data-status="sealed"] { color: var(--set-ok); } .ag-node-flag[data-status="sealed"] i { background: var(--set-ok); }
.ag-node-flag[data-status="partial"] { color: var(--set-partial); } .ag-node-flag[data-status="partial"] i { background: var(--set-partial); }
.ag-node-flag[data-status="open"] { color: var(--set-conflict); } .ag-node-flag[data-status="open"] i { background: var(--set-conflict); animation: ag-blink 1.3s ease-in-out infinite; }
@keyframes ag-blink { 0%,100% { opacity: 0.35; } 50% { opacity: 1; } }
.ag-node-cov { font-size: 10px; font-weight: 700; color: var(--set-text-dim); }

.ag-seal { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 132px; height: 132px; z-index: 1; }
.ag-seal-ring { position: absolute; inset: 0; border-radius: 50%; padding: 7px;
  background: conic-gradient(var(--c) var(--ag-p), color-mix(in srgb, var(--set-text) 9%, transparent) 0deg);
  transition: --ag-p 1s var(--set-spring), background 0.5s;
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 8px), #000 calc(100% - 7px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 8px), #000 calc(100% - 7px)); }
.ag-seal-core { position: absolute; inset: 12px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
  background: var(--set-surface-elevated); border: 1px solid var(--set-border); box-shadow: inset 0 0 24px -10px var(--c, #34d399); }
.ag-seal-core :deep(svg) { color: var(--set-ok); margin-bottom: 2px; }
.ag-seal-core[data-state="partial"] :deep(svg) { color: var(--set-partial); }
.ag-seal-core[data-state="open"] :deep(svg) { color: var(--set-conflict); }
.ag-seal-core b { font-size: 24px; font-weight: 850; color: var(--set-text); line-height: 1; }
.ag-seal-core small { font-size: 8.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-text-dim); }

.ag-cap { display: flex; flex-direction: column; align-items: center; gap: 5px; text-align: center; z-index: 1; }
.ag-cap-fy { font-size: 12px; font-weight: 800; color: var(--set-gold); }
.ag-cap-fy i { color: var(--set-text-dim); font-style: normal; }
.ag-cap-state { font-size: 9.5px; font-weight: 850; letter-spacing: 0.1em; text-transform: uppercase; padding: 3px 12px; border-radius: 999px; }
.ag-cap-state[data-state="sealed"] { color: var(--set-ok); background: var(--set-ok-soft); }
.ag-cap-state[data-state="partial"] { color: var(--set-partial); background: var(--set-partial-soft); }
.ag-cap-state[data-state="open"] { color: var(--set-conflict); background: var(--set-conflict-soft); }
.ag-cap-note { font-size: 10.5px; color: var(--set-text-muted); max-width: 38ch; line-height: 1.4; }

@media (prefers-reduced-motion: reduce) {
  .ag-reticle, .ag-motes i { animation: none; }
  .ag-fill, .ag-seal-ring { transition: none; }
  .ag-node-flag[data-status="open"] i { animation: none; }
}
</style>
