<template>
  <Motion ref="rootRef" as="div" class="ir ex-grain" :class="enpsTone"
    :initial="reduced ? false : { opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
    <span class="ir-aura" aria-hidden="true" />
    <span class="ir-spot" aria-hidden="true" />

    <!-- floating telemetry -->
    <div class="ir-hud">
      <div class="hud-chip">
        <span class="hud-ic" :style="{ '--c': '#fbbf24' }"><Star :size="13" /></span>
        <span class="hud-meta"><b><ExCountUp :value="avgOverall" :decimals="1" />/5</b><i>Avg candour</i></span>
      </div>
      <div class="hud-chip">
        <span class="hud-ic" :style="{ '--c': '#34d399' }"><ThumbsUp :size="13" /></span>
        <span class="hud-meta"><b><ExCountUp :value="recommendPct" :suffix="'%'" /></b><i>Would recommend</i></span>
      </div>
      <div class="hud-chip">
        <span class="hud-ic" :style="{ '--c': '#fb923c' }"><AudioLines :size="13" /></span>
        <span class="hud-meta"><b><ExCountUp :value="completedCount" />/<ExCountUp :value="total" /></b><i>Voices heard</i></span>
      </div>
    </div>

    <div class="ir-stage">
      <!-- LEFT: the resonance chamber — a radial voiceprint -->
      <div class="ir-chamber">
        <svg class="ir-cvs" viewBox="0 0 300 300" role="img" aria-label="Exit-interview sentiment resonance">
          <defs>
            <radialGradient id="irCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#fff7e6" />
              <stop offset="40%" stop-color="#fde68a" />
              <stop offset="100%" stop-color="#fb923c" stop-opacity="0.18" />
            </radialGradient>
          </defs>

          <!-- faint concentric scaffold -->
          <g class="ir-scaffold" aria-hidden="true">
            <circle cx="150" cy="150" r="66" />
            <circle cx="150" cy="150" r="96" />
            <circle cx="150" cy="150" r="126" />
          </g>

          <!-- expanding sound-ripples -->
          <circle class="ir-ripple" cx="150" cy="150" r="50" />
          <circle class="ir-ripple" cx="150" cy="150" r="50" style="animation-delay:-1.3s" />
          <circle class="ir-ripple" cx="150" cy="150" r="50" style="animation-delay:-2.6s" />

          <!-- spinning reticle -->
          <circle class="ir-reticle" cx="150" cy="150" r="58" />

          <!-- polar voiceprint bars -->
          <g class="ir-polar">
            <g v-for="(b, i) in polar" :key="i" :transform="`rotate(${b.a} 150 150)`">
              <rect class="pbar" :class="{ idle: b.idle }" x="148.6" :y="84 - b.len" width="2.8" :height="b.len" rx="1.4"
                :style="{ fill: b.color, '--d': b.delay + 's' }" />
            </g>
          </g>

          <!-- core orb -->
          <circle class="ir-core-disc" cx="150" cy="150" r="44" fill="url(#irCore)" />
        </svg>
        <div class="ir-core-read">
          <span class="cr-v"><ExCountUp :value="enps" :format="signed" /></span>
          <span class="cr-k">eNPS · voice index</span>
          <span class="cr-spectrum">
            <i class="seg det" :style="{ width: pct(buckets.det) }" />
            <i class="seg pas" :style="{ width: pct(buckets.pas) }" />
            <i class="seg pro" :style="{ width: pct(buckets.pro) }" />
          </span>
        </div>
      </div>

      <!-- RIGHT: live dimension channels -->
      <div class="ir-channels">
        <div class="ir-ch-head"><Waves :size="13" /> Sentiment by dimension</div>
        <div v-for="d in dims" :key="d.key" class="ch" :class="{ muted: !d.avg }">
          <span class="ch-lab">{{ d.label }}</span>
          <span class="ch-bar">
            <span class="ch-grid" aria-hidden="true" />
            <span class="ch-fill" :style="{ width: (revealed ? d.avg / 5 * 100 : 0) + '%', background: meterColor(d.avg) }" />
          </span>
          <span class="ch-val ex-mono">{{ d.avg ? d.avg.toFixed(1) : '—' }}</span>
        </div>
      </div>
    </div>
  </Motion>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { Motion } from 'motion-v'
import { Star, ThumbsUp, AudioLines, Waves } from 'lucide-vue-next'
import ExCountUp from './ExCountUp.vue'
import { prefersReduced, usePointerSpotlight, useInView, seededWave } from '@/composables/useShiftMotion'

const props = defineProps({
  items: { type: Array, default: () => [] }, // cases with .interview
})

const reduced = prefersReduced()
const rootRef = ref(null)
usePointerSpotlight(rootRef)
const { visible } = useInView(rootRef, { threshold: 0.2 })
const revealed = ref(reduced)
watch(visible, (v) => { if (v) revealed.value = true }, { immediate: true })

const completed = computed(() => props.items.filter(c => c.interview?.status === 'COMPLETED'))
const total = computed(() => props.items.length)
const completedCount = computed(() => completed.value.length)

const overallScores = computed(() => completed.value.map(c => Number(c.interview?.ratings?.overall || 0)).filter(Boolean))
const avgOverall = computed(() => overallScores.value.length ? overallScores.value.reduce((a, b) => a + b, 0) / overallScores.value.length : 0)

const buckets = computed(() => {
  let pro = 0, pas = 0, det = 0
  overallScores.value.forEach(s => { if (s >= 4) pro++; else if (s <= 2) det++; else pas++ })
  return { pro, pas, det, n: overallScores.value.length }
})
const enps = computed(() => {
  const n = buckets.value.n
  if (!n) return 0
  return Math.round((buckets.value.pro / n - buckets.value.det / n) * 100)
})
const enpsTone = computed(() => enps.value >= 30 ? 'good' : enps.value >= 0 ? 'mid' : 'bad')
const recommendPct = computed(() => {
  const answered = completed.value.filter(c => c.interview?.would_recommend != null)
  if (!answered.length) return 0
  return Math.round(answered.filter(c => c.interview.would_recommend).length / answered.length * 100)
})

const pct = (v) => buckets.value.n ? (v / buckets.value.n * 100) + '%' : '0%'
const signed = (v) => (v > 0 ? '+' : '') + Math.round(v)

const DIM_DEFS = [
  { key: 'overall', label: 'Overall' }, { key: 'management', label: 'Mgmt' },
  { key: 'culture', label: 'Culture' }, { key: 'growth', label: 'Growth' }, { key: 'compensation', label: 'Comp' },
]
const dims = computed(() => DIM_DEFS.map(d => {
  const vals = completed.value.map(c => Number(c.interview?.ratings?.[d.key] || 0)).filter(Boolean)
  return { ...d, avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0 }
}))

const sentColor = (s) => s >= 4 ? '#34d399' : s <= 2 ? '#ef4444' : '#fbbf24'
const meterColor = (a) => a >= 4 ? 'linear-gradient(90deg,#34d399,#6ee7b7)' : a >= 3 ? 'linear-gradient(90deg,#fb923c,#fcd34d)' : a > 0 ? 'linear-gradient(90deg,#ef4444,#fb923c)' : 'var(--ex-steel-soft)'

// 44-bar radial voiceprint: real completed interviews mapped onto bars, rest idle
const NBARS = 44
const polar = computed(() => {
  const scores = overallScores.value
  const idle = seededWave(11, NBARS)
  return Array.from({ length: NBARS }, (_, i) => {
    const a = +((i / NBARS) * 360).toFixed(1)
    const delay = +(((i * 0.137) % 1) * 1.6).toFixed(2)
    if (i < scores.length) {
      const s = scores[i]
      return { a, len: +(16 + (s / 5) * 46).toFixed(1), color: sentColor(s), idle: false, delay }
    }
    return { a, len: +(8 + idle[i] * 18).toFixed(1), color: 'var(--ex-steel-dim)', idle: true, delay }
  })
})
</script>

<style scoped>
.ir { position: relative; overflow: hidden; border-radius: 20px; isolation: isolate;
  background: var(--ex-panel); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow); padding-bottom: 8px;
  --tone: #fbbf24; }
.ir.good { --tone: #34d399; }
.ir.bad { --tone: #ef4444; }
.ir-aura { position: absolute; inset: -40% 30% 40% -10%; pointer-events: none;
  background: radial-gradient(55% 70% at 22% 12%, color-mix(in srgb, var(--tone) 18%, transparent), transparent 70%); animation: ex-aura-drift 12s ease-in-out infinite; }
.ir-spot { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.4s; z-index: 4;
  background: radial-gradient(420px 220px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), rgba(251, 146, 60, 0.12), transparent 62%); }

/* HUD */
.ir-hud { position: relative; z-index: 3; display: flex; flex-wrap: wrap; gap: 8px; padding: 14px 16px 0; }
.hud-chip { display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 14px;
  background: var(--ex-surface-glass); border: 1px solid var(--ex-border-strong);
  backdrop-filter: blur(16px) saturate(150%); -webkit-backdrop-filter: blur(16px) saturate(150%); box-shadow: 0 8px 22px -12px rgba(0, 0, 0, 0.5); }
.hud-ic { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 9px; flex-shrink: 0;
  color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.hud-meta { display: flex; flex-direction: column; line-height: 1.1; }
.hud-meta b { font-size: 15px; font-weight: 850; color: var(--ex-text); font-family: var(--ex-mono); }
.hud-meta i { font-size: 9px; font-style: normal; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ex-text-muted); }

/* stage */
.ir-stage { position: relative; z-index: 1; display: grid; grid-template-columns: 286px 1fr; gap: 16px; align-items: center; padding: 8px 18px 6px; }

/* chamber */
.ir-chamber { position: relative; width: 286px; height: 286px; margin: 0 auto; }
.ir-cvs { display: block; width: 100%; height: 100%; }
.ir-scaffold circle { fill: none; stroke: var(--ex-border); stroke-width: 1; opacity: 0.5; }
.ir-ripple { fill: none; stroke: var(--tone); stroke-width: 1.4; opacity: 0; transform-box: fill-box; transform-origin: center;
  animation: ir-ripple 3.9s ease-out infinite; }
@keyframes ir-ripple { 0% { transform: scale(0.62); opacity: 0.5; } 100% { transform: scale(2.55); opacity: 0; } }
.ir-reticle { fill: none; stroke: rgba(255, 247, 230, 0.4); stroke-width: 1; stroke-dasharray: 2 7;
  transform-box: fill-box; transform-origin: center; animation: ir-spin 22s linear infinite; }
@keyframes ir-spin { to { transform: rotate(360deg); } }
/* near-white reticle vanishes on cream → deepen it in light */
[data-theme="light"] .ir-reticle { stroke: color-mix(in srgb, var(--ex-ember) 38%, transparent); }
[data-theme="light"] .ir-ripple { stroke-width: 1.8; }

.pbar { transform-box: fill-box; transform-origin: center bottom; filter: drop-shadow(0 0 3px currentColor);
  animation: ir-grow 0.7s var(--ex-spring) backwards, ir-pulse 2.6s ease-in-out infinite;
  animation-delay: var(--d), var(--d); }
.pbar.idle { opacity: 0.42; }
@keyframes ir-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
@keyframes ir-pulse { 0%, 100% { transform: scaleY(0.7); } 50% { transform: scaleY(1); } }

.ir-core-disc { transform-box: fill-box; transform-origin: center; animation: ir-core 5s ease-in-out infinite;
  filter: drop-shadow(0 0 18px color-mix(in srgb, var(--tone) 60%, transparent)); }
@keyframes ir-core { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }

.ir-core-read { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; pointer-events: none; }
.cr-v { font-family: var(--ex-mono); font-size: 34px; font-weight: 900; line-height: 1; color: var(--tone);
  text-shadow: 0 2px 14px color-mix(in srgb, var(--tone) 40%, transparent); }
.cr-k { font-size: 8.5px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ex-text-muted); }
.cr-spectrum { display: flex; width: 94px; height: 5px; border-radius: 999px; overflow: hidden; background: var(--ex-steel-soft); margin-top: 5px; }
.cr-spectrum .seg { height: 100%; transition: width 0.8s var(--ex-spring); }
.seg.det { background: #ef4444; } .seg.pas { background: #fbbf24; } .seg.pro { background: #34d399; }

/* channels */
.ir-channels { display: flex; flex-direction: column; gap: 9px; min-width: 0; }
.ir-ch-head { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ex-violet); margin-bottom: 2px; }
.ch { display: grid; grid-template-columns: 58px 1fr 34px; align-items: center; gap: 10px; }
.ch.muted { opacity: 0.55; }
.ch-lab { font-size: 11px; font-weight: 750; color: var(--ex-text-secondary); text-transform: uppercase; letter-spacing: 0.04em; }
.ch-bar { position: relative; height: 12px; border-radius: 999px; background: var(--ex-steel-soft); overflow: hidden; border: 1px solid var(--ex-border); }
.ch-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: repeating-linear-gradient(90deg, transparent 0 calc(20% - 1px), var(--ex-border-strong) calc(20% - 1px) 20%); }
.ch-fill { position: relative; display: block; height: 100%; border-radius: 999px; transition: width 1.1s var(--ex-spring); }
.ch-fill::after { content: ""; position: absolute; inset: 0; border-radius: 999px; overflow: hidden;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.45), transparent); animation: ex-sheen-pass 3s ease-in-out infinite; }
.ch-val { font-size: 13px; font-weight: 850; color: var(--ex-text); text-align: right; }

@media (max-width: 760px) {
  .ir-stage { grid-template-columns: 1fr; }
  .ir-chamber { width: 240px; height: 240px; }
}
@media (prefers-reduced-motion: reduce) {
  .ir-aura, .ir-ripple, .ir-reticle, .pbar, .ir-core-disc, .ch-fill::after { animation: none !important; }
  .ch-fill, .cr-spectrum .seg { transition: none; }
  .pbar { transform: scaleY(1); }
}
</style>
