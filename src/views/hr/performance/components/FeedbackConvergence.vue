<template>
  <div ref="fcEl" class="fc" :class="{ reduced }">
    <!-- ─── ambient field ─── -->
    <span class="fc-grain" aria-hidden="true" />
    <span class="fc-aura" aria-hidden="true" />
    <svg class="fc-motes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <circle v-for="m in motes" :key="m.k" :cx="m.x" :cy="m.y" :r="m.r" class="fc-mote"
        :style="{ '--tw': m.dur + 's', '--dl': m.dl + 's', '--op': m.op }" />
    </svg>

    <!-- ─── floating HUD ─── -->
    <div class="fc-hud" :style="{ '--px': pPar.x, '--py': pPar.y }">
      <div class="fc-hud-chip"><span class="fc-hud-v"><SetCountUp :value="invited" /></span><span class="fc-hud-l">Invited</span></div>
      <div class="fc-hud-chip"><span class="fc-hud-v"><SetCountUp :value="submitted" /></span><span class="fc-hud-l">Responded</span></div>
      <div class="fc-hud-chip ok"><span class="fc-hud-v"><SetCountUp :value="responseRate" :decimals="0" suffix="%" /></span><span class="fc-hud-l">Response</span></div>
      <div class="fc-hud-chip"><span class="fc-hud-v"><SetCountUp :value="openRequests" /></span><span class="fc-hud-l">Collecting</span></div>
    </div>

    <!-- ─── convergence stage ─── -->
    <div class="fc-stage" :style="{ '--px': pPar.x, '--py': pPar.y }">
      <svg class="fc-beams" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <!-- scaffold -->
        <circle v-for="r in [44, 32, 21]" :key="'s' + r" cx="50" cy="50" :r="r" class="fc-scaffold" />
        <!-- converging beams -->
        <g v-for="g in gates" :key="'b' + g.key">
          <line :x1="g.x" :y1="g.y" x2="50" y2="50" class="fc-beam" :class="{ live: g.count > 0 }"
            :style="{ stroke: g.color, '--dur': g.dur + 's' }" />
        </g>
        <!-- core completion ring -->
        <circle cx="50" cy="50" r="15.5" class="fc-core-track" />
      </svg>

      <!-- subject core orb -->
      <div class="fc-core" :style="{ '--perf-p': coreFrac * 360 + 'deg', '--g': coreTone }">
        <span class="fc-core-corona" aria-hidden="true" />
        <span class="fc-core-ring" aria-hidden="true" />
        <span v-if="submitted > 0" class="fc-core-pulse" aria-hidden="true" />
        <div class="fc-core-in">
          <b><SetCountUp :value="responseRate" :decimals="0" suffix="%" /></b>
          <span>responded</span>
          <i v-if="overallAvg != null">avg {{ Number(overallAvg).toFixed(1) }}</i>
        </div>
      </div>

      <!-- compass relationship gates -->
      <button v-for="g in gates" :key="g.key" type="button" class="fc-gate" :class="{ live: g.count > 0, hot: hover === g.key }"
        :style="{ left: g.lx + '%', top: g.ly + '%', '--c': g.color }"
        @mouseenter="hover = g.key" @mouseleave="hover = null" @focus="hover = g.key" @blur="hover = null">
        <span class="fc-gate-ic"><component :is="g.icon" :size="15" /></span>
        <span class="fc-gate-meta"><b>{{ g.label }}</b><i>{{ g.count }} voice{{ g.count === 1 ? '' : 's' }}</i></span>
        <span v-if="g.count > 0" class="fc-gate-badge">{{ g.count }}</span>
      </button>
    </div>

    <div class="fc-foot">
      <Quote :size="12" /> Multi-rater perception converging on the subject — beams brighten as voices arrive.
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onBeforeUnmount } from 'vue'
import { Quote } from 'lucide-vue-next'
import SetCountUp from '@/views/hr/settings/components/SetCountUp.vue'
import { feedbackRelMeta, scoreTone } from '@/composables/usePerformance'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  relationships: { type: Array, default: () => [] }, // [{key,count}]
  competencies: { type: Array, default: () => [] },   // [{key,label,avg,count}]
  invited: { type: Number, default: 0 },
  submitted: { type: Number, default: 0 },
  responseRate: { type: Number, default: 0 },
  openRequests: { type: Number, default: 0 },
  overallAvg: { type: [Number, null], default: null },
  ratingMax: { type: Number, default: 5 },
})

const reduced = prefersReduced()
const fcEl = ref(null)
const hover = ref(null)

// 6 relationship gates around the core (compass layout)
const GATE_ORDER = [
  { key: 'SELF', ang: -90 }, { key: 'MANAGER', ang: -30 }, { key: 'PEER', ang: 30 },
  { key: 'DIRECT_REPORT', ang: 90 }, { key: 'SKIP_LEVEL', ang: 150 }, { key: 'EXTERNAL', ang: 210 },
]
const relCount = (k) => { const r = props.relationships.find(x => x.key === k); return r ? (r.count || 0) : 0 }
const gates = computed(() => GATE_ORDER.map((g, i) => {
  const meta = feedbackRelMeta(g.key)
  const rad = (g.ang * Math.PI) / 180
  const R = 44       // beam endpoint radius (svg units)
  const LR = 50      // gate dom radius (%)
  const count = relCount(g.key)
  return {
    key: g.key, label: meta.label, icon: meta.icon, color: meta.color, count,
    x: +(50 + Math.cos(rad) * R).toFixed(2), y: +(50 + Math.sin(rad) * R).toFixed(2),
    lx: +(50 + Math.cos(rad) * LR).toFixed(2), ly: +(50 + Math.sin(rad) * LR).toFixed(2),
    dur: (2.2 + (i % 3) * 0.5).toFixed(1),
  }
}))

const coreFrac = computed(() => Math.max(0, Math.min(1, (props.responseRate || 0) / 100)))
const coreTone = computed(() => props.overallAvg != null ? scoreTone(props.overallAvg, props.ratingMax) : 'var(--perf-gold)')

// data-independent twinkling motes so an empty atrium still reads alive
const motes = computed(() => {
  const out = []; let s = 9173
  for (let i = 0; i < 22; i++) {
    s = (s * 9301 + 49297) % 233280; const x = (s / 233280) * 100
    s = (s * 9301 + 49297) % 233280; const y = (s / 233280) * 100
    s = (s * 9301 + 49297) % 233280; const r = 0.2 + (s / 233280) * 0.5
    s = (s * 9301 + 49297) % 233280; const dur = 2.6 + (s / 233280) * 4
    s = (s * 9301 + 49297) % 233280; const dl = (s / 233280) * 5
    s = (s * 9301 + 49297) % 233280; const op = 0.16 + (s / 233280) * 0.45
    out.push({ k: i, x: x.toFixed(2), y: y.toFixed(2), r: r.toFixed(2), dur: dur.toFixed(2), dl: dl.toFixed(2), op: op.toFixed(2) })
  }
  return out
})

// pointer parallax
const pPar = reactive({ x: 0, y: 0 })
let raf = null, pend = null
const onMove = (e) => {
  const el = fcEl.value; if (!el) return
  const r = el.getBoundingClientRect(); if (!r.width) return
  pend = { x: ((e.clientX - r.left) / r.width - 0.5) * 2, y: ((e.clientY - r.top) / r.height - 0.5) * 2 }
  if (!raf) raf = requestAnimationFrame(() => { raf = null; if (pend) { pPar.x = pend.x.toFixed(3); pPar.y = pend.y.toFixed(3) } })
}
const onLeave = () => { pPar.x = 0; pPar.y = 0 }
onMounted(() => { if (reduced) return; const el = fcEl.value; if (!el) return; el.addEventListener('pointermove', onMove, { passive: true }); el.addEventListener('pointerleave', onLeave) })
onBeforeUnmount(() => { const el = fcEl.value; if (el) { el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerleave', onLeave) } if (raf) cancelAnimationFrame(raf) })
</script>

<style scoped>
.fc { position: relative; overflow: hidden; isolation: isolate; min-height: 360px; padding: 16px; border-radius: 20px;
  background: radial-gradient(120% 120% at 50% 0%, color-mix(in srgb, var(--perf-gold) 7%, transparent), transparent 58%), var(--perf-panel);
  border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow); }
.fc-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.45;
  background-image: linear-gradient(color-mix(in srgb, var(--perf-gold) 5%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--perf-gold) 5%, transparent) 1px, transparent 1px);
  background-size: 30px 30px; mask-image: radial-gradient(80% 80% at 50% 50%, #000, transparent 75%); -webkit-mask-image: radial-gradient(80% 80% at 50% 50%, #000, transparent 75%); }
.fc-aura { position: absolute; inset: 8% 28% auto; height: 60%; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--perf-gold) 16%, transparent), transparent 68%); filter: blur(40px); animation: fc-breathe 8s ease-in-out infinite; }
.fc-motes { position: absolute; inset: 0; width: 100%; height: 100%; }
.fc-mote { fill: var(--perf-gold-bright); opacity: var(--op); transform-box: fill-box; transform-origin: center; animation: fc-tw var(--tw) ease-in-out var(--dl) infinite; }
@keyframes fc-breathe { 0%, 100% { opacity: 0.65; transform: scale(1); } 50% { opacity: 1; transform: scale(1.08); } }
@keyframes fc-tw { 0%, 100% { opacity: calc(var(--op) * 0.3); } 50% { opacity: var(--op); } }

/* HUD */
.fc-hud { position: absolute; top: 14px; right: 14px; z-index: 4; display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; max-width: 60%;
  transform: translate(calc(var(--px, 0) * -5px), calc(var(--py, 0) * -4px)); transition: transform 0.3s var(--perf-spring); }
.fc-hud-chip { display: flex; flex-direction: column; gap: 1px; padding: 7px 11px; border-radius: 11px; min-width: 64px;
  background: var(--perf-glass); border: 1px solid var(--perf-border); backdrop-filter: blur(10px); }
.fc-hud-v { font-size: 17px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; line-height: 1; }
.fc-hud-chip.ok .fc-hud-v { color: var(--perf-ok); }
.fc-hud-l { font-size: 9px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--perf-text-muted); }

/* stage */
.fc-stage { position: relative; width: 100%; max-width: 460px; margin: 8px auto 0; aspect-ratio: 1; z-index: 2;
  transform: translate(calc(var(--px, 0) * 6px), calc(var(--py, 0) * 6px)); transition: transform 0.3s var(--perf-spring); }
.fc-beams { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.fc-scaffold { fill: none; stroke: var(--perf-border); stroke-width: 0.3; opacity: 0.6; }
.fc-beam { stroke-width: 0.7; opacity: 0.16; stroke-dasharray: 2 3; }
.fc-beam.live { opacity: 0.85; stroke-width: 1; filter: drop-shadow(0 0 1.6px currentColor); animation: fc-flow var(--dur, 2.4s) linear infinite; }
.fc-core-track { fill: none; stroke: var(--perf-track); stroke-width: 1.4; }
@keyframes fc-flow { to { stroke-dashoffset: -25; } }

/* core orb */
.fc-core { position: absolute; left: 50%; top: 50%; width: 31%; aspect-ratio: 1; transform: translate(-50%, -50%); border-radius: 50%;
  display: grid; place-items: center; transition: --perf-p 0.9s var(--perf-spring);
  background: conic-gradient(from -90deg, var(--g) var(--perf-p, 0deg), transparent 0); }
.fc-core-corona { position: absolute; inset: -26%; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--g) 30%, transparent), transparent 66%); filter: blur(14px); animation: fc-breathe 7s ease-in-out infinite; }
.fc-core-ring { position: absolute; inset: 6%; border-radius: 50%; background: var(--perf-surface-elevated); box-shadow: inset 0 0 0 1px var(--perf-border); }
.fc-core-pulse { position: absolute; inset: 0; border-radius: 50%; border: 1.5px solid color-mix(in srgb, var(--g) 60%, transparent); animation: fc-emit 3.4s ease-out infinite; }
@keyframes fc-emit { 0% { transform: scale(1); opacity: 0.7; } 100% { transform: scale(1.5); opacity: 0; } }
.fc-core-in { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 1px; text-align: center; }
.fc-core-in b { font-size: clamp(20px, 5vw, 30px); font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; line-height: 1; }
.fc-core-in span { font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--perf-text-muted); }
.fc-core-in i { margin-top: 2px; font-style: normal; font-size: 10px; font-weight: 800; color: var(--g); }

/* gates */
.fc-gate { position: absolute; transform: translate(-50%, -50%); z-index: 3; display: flex; align-items: center; gap: 8px; padding: 6px 11px 6px 7px; border-radius: 999px; cursor: default; font: inherit;
  background: var(--perf-surface-elevated); border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow); --c: var(--perf-gold);
  transition: transform 0.22s var(--perf-spring), border-color 0.22s, box-shadow 0.28s; }
.fc-gate.live { border-color: color-mix(in srgb, var(--c) 42%, transparent); }
.fc-gate.hot { transform: translate(-50%, -50%) scale(1.08); border-color: var(--c); box-shadow: 0 12px 26px -14px color-mix(in srgb, var(--c) 80%, transparent); z-index: 5; }
.fc-gate-ic { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0; color: var(--c); background: color-mix(in srgb, var(--c) 15%, transparent); border: 1px solid color-mix(in srgb, var(--c) 32%, transparent); }
.fc-gate-meta { display: flex; flex-direction: column; line-height: 1.15; }
.fc-gate-meta b { font-size: 11px; font-weight: 800; color: var(--perf-text); white-space: nowrap; }
.fc-gate-meta i { font-style: normal; font-size: 9.5px; color: var(--perf-text-muted); white-space: nowrap; }
.fc-gate-badge { display: grid; place-items: center; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px; font-size: 10px; font-weight: 850; color: #1a1206; background: var(--c); }

.fc-foot { position: relative; z-index: 2; display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 8px; font-size: 10.5px; color: var(--perf-text-dim); }
.fc-foot :deep(svg) { color: var(--perf-text-muted); }

@media (max-width: 620px) {
  .fc-hud { position: static; max-width: none; margin-bottom: 10px; transform: none; }
  .fc-gate-meta { display: none; }
  .fc-gate { padding: 6px; }
}
@media (prefers-reduced-motion: reduce) {
  .fc-aura, .fc-mote, .fc-beam.live, .fc-core-corona, .fc-core-pulse { animation: none !important; }
  .fc-core, .fc-hud, .fc-stage, .fc-gate { transition: none; }
}
</style>
