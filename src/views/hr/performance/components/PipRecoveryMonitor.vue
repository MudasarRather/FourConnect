<template>
  <!-- ═══════════════════ THE RECOVERY MONITOR · vital-signs cardiograph ═══════════════════
       PIPs as patients on a recovery monitor. A live ECG trace sweeps a clinical contour
       grid; every active plan is a glowing VITAL NODE plotted by time-elapsed (x) ×
       objectives-recovered (y), climbing toward a dashed RECOVERY THRESHOLD before a deadline
       gate. The trace + read-head tint amber → red as plans go overdue. Distinct within
       Performance from the orrery / bell-curve / flux-pipeline / lanes / 9-box / mint /
       mountain-ascent / convergence — the only medical vital-signs motif. -->
  <div ref="rootEl" class="rm" :class="`tone-${tone}`">
    <span class="rm-vignette" aria-hidden="true" />

    <!-- ambient layer (parallax depth 1) -->
    <div class="rm-layer rm-l1" :style="par(1)">
      <svg class="rm-svg" viewBox="0 0 1000 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <linearGradient id="rmEcg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" :stop-color="toneColor" stop-opacity="0" />
            <stop offset="50%" :stop-color="toneColor" stop-opacity="1" />
            <stop offset="100%" :stop-color="toneColor" stop-opacity="0.3" />
          </linearGradient>
          <linearGradient id="rmThresh" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="var(--perf-ok)" stop-opacity="0.1" />
            <stop offset="100%" stop-color="var(--perf-ok)" stop-opacity="0.6" />
          </linearGradient>
        </defs>
        <!-- contour field -->
        <g class="rm-contours">
          <path v-for="(c, i) in contours" :key="i" :d="c" :style="{ '--ci': i }" />
        </g>
        <!-- recovery threshold (the standard to reach) -->
        <line class="rm-thresh" x1="0" :y1="threshY" x2="1000" :y2="threshY" />
      </svg>
    </div>

    <!-- ECG trace layer (parallax depth 2) -->
    <div class="rm-layer rm-l2" :style="par(2)">
      <svg class="rm-svg" viewBox="0 0 1000 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <path class="rm-ecg-ghost" :d="ecg" />
        <path class="rm-ecg-flow" :d="ecg" />
      </svg>
      <span class="rm-readhead"><i /></span>
    </div>

    <!-- vital nodes (parallax depth 3) -->
    <div class="rm-layer rm-l3" :style="par(3)">
      <div class="rm-deadline"><span>deadline</span></div>
      <Motion v-for="(n, i) in nodes" :key="n.id" as="button" type="button" class="rm-node" :class="{ over: n.over }"
        :style="{ left: n.x + '%', top: n.y + '%', '--c': n.color }" :title="`${n.name} · ${n.met}/${n.tot} met · ${n.elapsed}% elapsed`"
        :initial="reduced ? false : { opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }"
        :transition="{ duration: 0.5, delay: Math.min(i * 0.06, 0.5), ease: [0.16, 1, 0.3, 1] }"
        @click="$emit('focus', n.pip)">
        <span class="rm-node-pulse" />
        <span class="rm-node-av">{{ n.initials }}</span>
      </Motion>
      <span v-if="overflow > 0" class="rm-overflow">+{{ overflow }} more</span>
      <p v-if="!nodes.length" class="rm-empty">No active plans on the monitor — the trace runs idle.</p>
    </div>

    <!-- axis hints -->
    <span class="rm-axis rm-axis-top"><ArrowUp :size="9" /> recovered</span>
    <span class="rm-axis rm-axis-bot">at-risk</span>
    <span class="rm-axis rm-axis-left">start</span>

    <!-- floating glass vitals HUD -->
    <div class="rm-hud">
      <div class="rm-hud-title"><Activity :size="12" /> Live vitals</div>
      <div class="rm-vitals">
        <div class="rm-vital"><span class="rm-vital-dot amber" /><b><SetCountUp :value="stats.active || 0" :decimals="0" /></b><i>active</i></div>
        <div class="rm-vital"><span class="rm-vital-dot ok" /><b><SetCountUp :value="stats.successful || 0" :decimals="0" /></b><i>recovered</i></div>
        <div class="rm-vital crit" :class="{ alarm: (stats.overdue || 0) > 0 }"><span class="rm-vital-dot conflict" /><b><SetCountUp :value="stats.overdue || 0" :decimals="0" /></b><i>overdue</i></div>
        <div class="rm-vital"><span class="rm-vital-dot ok" /><b><SetCountUp :value="successRate" :decimals="0" suffix="%" /></b><i>success</i></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Activity, ArrowUp } from 'lucide-vue-next'
import SetCountUp from '@/views/hr/settings/components/SetCountUp.vue'
import { usePointerSpotlight, prefersReduced } from '@/composables/useShiftMotion'
import { pipStatusMeta } from '@/composables/usePerformance'

const props = defineProps({
  pips: { type: Array, default: () => [] },
  stats: { type: Object, default: () => ({}) },
})
defineEmits(['focus'])

const reduced = prefersReduced()
const rootEl = ref(null)
usePointerSpotlight(rootEl)
const par = (depth) => reduced ? {} : { transform: `translate3d(calc((var(--mx,0.5) - 0.5) * ${depth * 7}px), calc((var(--my,0.5) - 0.5) * ${depth * 5}px), 0)` }

const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
const elapsedPct = (p) => {
  if (!p.start_date || !p.end_date) return 0
  const s = new Date(p.start_date).getTime(), e = new Date(p.end_date).getTime(), n = Date.now()
  if (e <= s) return 0
  return Math.round((n - s) / (e - s) * 100)
}

const threshY = 54   // recovery threshold line (viewBox y) — target "fully recovered"

const allActive = computed(() => props.pips.filter(p => ['ACTIVE', 'EXTENDED'].includes(p.status)))
const nodes = computed(() => allActive.value.slice(0, 12).map(p => {
  const objs = p.objectives || []
  const met = objs.filter(o => o.status === 'MET').length
  const tot = objs.length
  const ratio = tot ? met / tot : 0.42                       // neutral when no objectives yet
  const e = elapsedPct(p)
  const over = p.end_date && new Date(p.end_date) < new Date()
  return {
    id: p.id, pip: p, name: p.employee_name, initials: initials(p.employee_name),
    met, tot, elapsed: Math.max(0, e), over,
    x: Math.max(4, Math.min(95, e)),
    y: 80 - ratio * 64,                                       // 0 met → 80% (low), all met → 16% (recovered)
    color: over ? 'var(--perf-conflict)' : pipStatusMeta(p.status).color,
  }
}))
const overflow = computed(() => Math.max(0, allActive.value.length - 12))

const successRate = computed(() => {
  const ok = props.stats.successful || 0, no = props.stats.unsuccessful || 0
  return ok + no ? Math.round(ok / (ok + no) * 100) : 0
})

const tone = computed(() => (props.stats.overdue || 0) > 0 ? 'crit' : allActive.value.length ? 'live' : 'calm')
const toneColor = computed(() => tone.value === 'crit' ? 'var(--perf-conflict)' : tone.value === 'live' ? 'var(--perf-gold)' : 'var(--perf-ok)')

// ── ECG cardiograph path (procedural PQRST complexes) ──
function buildEcg(width = 1000, mid = 150, beats = 6) {
  const seg = [
    [0.00, 0], [0.38, 0], [0.42, -0.10], [0.46, 0], [0.50, 0.10],
    [0.53, -0.66], [0.57, 0.30], [0.61, 0], [0.72, -0.16], [0.80, 0], [1.00, 0],
  ]
  const amp = 92, bw = width / beats
  let d = ''
  for (let b = 0; b < beats; b++) {
    for (const [f, a] of seg) {
      const x = (b + f) * bw, y = mid + a * amp
      d += (b === 0 && f === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' '
    }
  }
  return d.trim()
}
const ecg = buildEcg()

// flowing topographic contour lines
const contours = computed(() => {
  const out = []
  for (let r = 0; r < 5; r++) {
    const base = 40 + r * 52
    let d = `M0 ${base}`
    for (let x = 0; x <= 1000; x += 50) {
      const y = base + Math.sin((x / 1000) * Math.PI * 3 + r * 0.8) * (10 + r * 2)
      d += ` L${x} ${y.toFixed(1)}`
    }
    out.push(d)
  }
  return out
})
</script>

<style scoped>
.rm { position: relative; overflow: hidden; height: 320px; border-radius: 20px; isolation: isolate;
  background: radial-gradient(120% 120% at 18% 0%, color-mix(in srgb, var(--perf-gold) 7%, var(--perf-panel)), var(--perf-panel) 62%);
  border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow); }
.rm-vignette { position: absolute; inset: 0; z-index: 6; pointer-events: none;
  background: radial-gradient(120% 90% at 50% 50%, transparent 55%, color-mix(in srgb, var(--perf-noir, #000) 22%, transparent)); }
.rm-layer { position: absolute; inset: 0; transition: transform 0.25s var(--perf-ease); }
.rm-l1 { z-index: 0; } .rm-l2 { z-index: 1; } .rm-l3 { z-index: 3; }
.rm-svg { position: absolute; inset: 0; width: 100%; height: 100%; }

/* contour field */
.rm-contours path { fill: none; stroke: color-mix(in srgb, var(--perf-gold) 16%, transparent); stroke-width: 1; opacity: 0.5;
  animation: rm-drift calc(22s + var(--ci) * 4s) ease-in-out infinite alternate; }
@keyframes rm-drift { from { transform: translateX(-12px); } to { transform: translateX(12px); } }
.rm-thresh { stroke: url(#rmThresh); stroke-width: 1.5; stroke-dasharray: 7 7; }

/* ECG trace */
.rm-ecg-ghost { fill: none; stroke: color-mix(in srgb, var(--perf-text-muted) 26%, transparent); stroke-width: 1.6; opacity: 0.4; }
.rm-ecg-flow { fill: none; stroke: url(#rmEcg); stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round;
  stroke-dasharray: 120 880; filter: drop-shadow(0 0 6px color-mix(in srgb, var(--perf-gold) 50%, transparent)); animation: rm-flow 3.4s linear infinite; }
.tone-crit .rm-ecg-flow { filter: drop-shadow(0 0 7px color-mix(in srgb, var(--perf-conflict) 60%, transparent)); animation-duration: 1.9s; }
.tone-calm .rm-ecg-flow { filter: drop-shadow(0 0 6px color-mix(in srgb, var(--perf-ok) 50%, transparent)); }
@keyframes rm-flow { from { stroke-dashoffset: 1000; } to { stroke-dashoffset: 0; } }

/* read-head */
.rm-readhead { position: absolute; top: 6%; bottom: 6%; left: 0; width: 2px; transform: translateX(-1px);
  background: linear-gradient(180deg, transparent, var(--toneline, var(--perf-gold)), transparent); opacity: 0.8;
  box-shadow: 0 0 14px 2px color-mix(in srgb, var(--perf-gold) 50%, transparent); animation: rm-sweep 3.4s linear infinite; }
.tone-crit .rm-readhead { background: linear-gradient(180deg, transparent, var(--perf-conflict), transparent); box-shadow: 0 0 14px 2px color-mix(in srgb, var(--perf-conflict) 55%, transparent); animation-duration: 1.9s; }
.tone-calm .rm-readhead { background: linear-gradient(180deg, transparent, var(--perf-ok), transparent); box-shadow: 0 0 12px 2px color-mix(in srgb, var(--perf-ok) 45%, transparent); }
.rm-readhead i { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 7px; height: 7px; border-radius: 50%; background: var(--perf-gold-bright); box-shadow: 0 0 12px var(--perf-gold); }
.tone-crit .rm-readhead i { background: var(--perf-conflict); box-shadow: 0 0 12px var(--perf-conflict); }
@keyframes rm-sweep { from { left: 0; } to { left: 100%; } }

/* deadline gate */
.rm-deadline { position: absolute; top: 8%; bottom: 8%; right: 2.5%; width: 0; border-left: 1.5px dashed color-mix(in srgb, var(--perf-conflict) 50%, transparent); }
.rm-deadline span { position: absolute; bottom: -2px; right: 2px; font-size: 8px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: color-mix(in srgb, var(--perf-conflict) 80%, var(--perf-text-muted)); }

/* vital nodes */
/* centred via negative margin (NOT transform) so motion-v's scale entrance can't drop the offset */
.rm-node { position: absolute; margin: -16px 0 0 -16px; cursor: pointer; padding: 0; border: none; background: none; --c: var(--perf-gold); }
.rm-node-pulse { position: absolute; inset: -6px; border-radius: 50%; border: 1.5px solid var(--c); opacity: 0.5; animation: rm-ping 2.6s ease-out infinite; }
.rm-node.over .rm-node-pulse { animation-duration: 1.3s; }
@keyframes rm-ping { 0% { transform: scale(0.7); opacity: 0.6; } 100% { transform: scale(1.7); opacity: 0; } }
.rm-node-av { position: relative; display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; font-size: 10.5px; font-weight: 850; color: #1a1206;
  background: var(--perf-grad-hero); border: 2px solid var(--c); box-shadow: 0 6px 16px -5px rgba(0,0,0,0.6); transition: transform 0.2s var(--perf-spring); }
.rm-node:hover .rm-node-av { transform: scale(1.16); }
.rm-overflow { position: absolute; right: 6%; top: 50%; transform: translateY(-50%); font-size: 10px; font-weight: 700; color: var(--perf-text-muted); padding: 3px 8px; border-radius: 999px; background: var(--perf-surface); border: 1px solid var(--perf-border); }
.rm-empty { position: absolute; left: 50%; top: 46%; transform: translate(-50%, -50%); margin: 0; font-size: 12px; color: var(--perf-text-dim); font-style: italic; white-space: nowrap; }

/* axis hints */
.rm-axis { position: absolute; z-index: 4; display: inline-flex; align-items: center; gap: 3px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; color: var(--perf-text-dim); pointer-events: none; }
.rm-axis-top { top: 12px; left: 14px; color: color-mix(in srgb, var(--perf-ok) 70%, var(--perf-text-muted)); }
.rm-axis-bot { bottom: 12px; left: 14px; }
.rm-axis-left { bottom: 12px; left: 50%; transform: translateX(-50%); }

/* vitals HUD */
.rm-hud { position: absolute; z-index: 5; top: 12px; right: 12px; display: flex; flex-direction: column; gap: 8px; padding: 11px 13px; border-radius: 14px;
  background: color-mix(in srgb, var(--perf-surface-elevated) 78%, transparent); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid var(--perf-border); }
.rm-hud-title { display: inline-flex; align-items: center; gap: 5px; font-size: 9px; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; color: var(--perf-text-secondary); }
.rm-hud-title :deep(svg) { color: var(--perf-gold); }
.rm-vitals { display: grid; grid-template-columns: repeat(2, auto); gap: 6px 14px; }
.rm-vital { display: flex; align-items: baseline; gap: 6px; }
.rm-vital-dot { width: 6px; height: 6px; border-radius: 50%; align-self: center; }
.rm-vital-dot.amber { background: var(--perf-amber); box-shadow: 0 0 7px var(--perf-amber); }
.rm-vital-dot.ok { background: var(--perf-ok); box-shadow: 0 0 7px var(--perf-ok); }
.rm-vital-dot.conflict { background: var(--perf-conflict); box-shadow: 0 0 7px var(--perf-conflict); }
.rm-vital b { font-size: 16px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; line-height: 1; }
.rm-vital i { font-size: 9.5px; font-style: normal; color: var(--perf-text-muted); }
.rm-vital.alarm .rm-vital-dot.conflict { animation: rm-alarm 1.1s ease-in-out infinite; }
@keyframes rm-alarm { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

@media (max-width: 720px) {
  .rm { height: 280px; }
  .rm-hud { top: 8px; right: 8px; padding: 9px 10px; }
  .rm-vital b { font-size: 14px; }
}
@media (prefers-reduced-motion: reduce) {
  .rm-contours path, .rm-ecg-flow, .rm-readhead, .rm-node-pulse, .rm-vital.alarm .rm-vital-dot.conflict { animation: none; }
  .rm-node:hover .rm-node-av { transform: none; }
}
</style>
