<template>
  <!-- Passenger satisfaction — a brass departure-hall gauge. The needle springs
       to the range's CSAT average, the stars punch in one by one, and the 1–5
       distribution rides animated meters. No ratings yet → ghost-star shimmer. -->
  <div class="sd-ics">
    <template v-if="hasData">
      <div class="ics-top">
        <div class="ics-gauge">
          <svg viewBox="0 0 140 84">
            <path class="g-track" d="M14 74 A56 56 0 0 1 126 74" pathLength="100" />
            <path class="g-zone lo" d="M14 74 A56 56 0 0 1 126 74" pathLength="100" />
            <path class="g-zone mid" d="M14 74 A56 56 0 0 1 126 74" pathLength="100" />
            <path class="g-zone hi" d="M14 74 A56 56 0 0 1 126 74" pathLength="100" />
            <g class="g-needle" :style="{ transform: `rotate(${needleDeg}deg)` }">
              <line x1="70" y1="74" x2="70" y2="26" />
              <circle cx="70" cy="74" r="5.5" />
            </g>
            <text class="g-min sd-mono" x="14" y="82">1.0</text>
            <text class="g-max sd-mono" x="114" y="82">5.0</text>
          </svg>
          <div class="ics-avg">
            <span class="v"><SdCountUp :value="csat.avg ?? 0" :decimals="2" /></span>
            <span class="stars" aria-hidden="true">
              <Star v-for="s in 5" :key="s" :size="13" class="st" :class="{ lit: csat.avg != null && s <= Math.round(csat.avg) }"
                :style="{ animationDelay: `${0.5 + s * 0.09}s` }" />
            </span>
          </div>
        </div>
        <div class="ics-side">
          <div class="side-chip"><span class="k sd-mono">RATED</span><span class="n">{{ csat.count }}</span></div>
          <div class="side-chip"><span class="k sd-mono">RESPONSE</span><span class="n">{{ csat.response_rate_pct == null ? '—' : csat.response_rate_pct + '%' }}</span></div>
          <svg class="ics-spark" viewBox="0 0 150 40" preserveAspectRatio="none">
            <path v-if="sparkArea" class="sp-a" :d="sparkArea" />
            <path v-if="sparkPath" class="sp" :d="sparkPath" pathLength="1" />
          </svg>
        </div>
      </div>

      <div class="ics-dist">
        <div v-for="b in bars" :key="b.score" class="ds-row" :class="{ zero: !b.count }">
          <span class="ds-k sd-mono">{{ b.score }}★</span>
          <span class="ds-track"><i :style="{ width: b.pct + '%', background: b.color, animationDelay: `${0.2 + b.i * 0.08}s` }" /></span>
          <span class="ds-v sd-mono">{{ b.count }}</span>
        </div>
      </div>
    </template>

    <!-- empty state — ghost stars waiting for the first stamp -->
    <div v-else class="ics-empty">
      <span class="ghost-stars" aria-hidden="true">
        <Star v-for="s in 5" :key="s" :size="20" :style="{ animationDelay: `${s * 0.18}s` }" />
      </span>
      <p class="e-title">No ratings stamped yet</p>
      <p class="e-sub sd-mono">CSAT CARDS APPEAR AS RESOLVED PASSENGERS RATE THE SERVICE</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Star } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  csat: { type: Object, default: () => ({ distribution: {}, trend: [] }) },  // IntelCsatBlock
})

const hasData = computed(() => (props.csat?.count || 0) > 0)

/* needle: avg 1..5 → -78°..+78° around the dial pivot */
const needleDeg = computed(() => {
  const a = props.csat?.avg
  if (a == null) return -78
  return -78 + ((Math.min(5, Math.max(1, a)) - 1) / 4) * 156
})

const bars = computed(() => {
  const dist = props.csat?.distribution || {}
  const max = Math.max(1, ...Object.values(dist))
  const color = (s) => (s >= 4 ? 'var(--intel-up)' : s === 3 ? 'var(--intel)' : 'var(--intel-dn)')
  return [5, 4, 3, 2, 1].map((s, i) => ({
    score: s, i, count: dist[String(s)] || 0,
    pct: Math.round(((dist[String(s)] || 0) / max) * 100), color: color(s),
  }))
})

const sparkPts = computed(() => {
  const all = props.csat?.trend || []
  const pts = all.filter(p => p.avg != null)
  if (pts.length < 2) return []
  return pts.map(p => ({
    x: (all.indexOf(p) / Math.max(1, all.length - 1)) * 142 + 4,
    y: 36 - ((p.avg - 1) / 4) * 30,
  }))
})
const sparkPath = computed(() => sparkPts.value.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' '))
const sparkArea = computed(() => {
  if (!sparkPts.value.length) return ''
  const first = sparkPts.value[0]; const last = sparkPts.value[sparkPts.value.length - 1]
  return `${sparkPath.value} L${last.x.toFixed(1)} 38 L${first.x.toFixed(1)} 38 Z`
})
</script>

<style scoped>
.sd-ics { display: flex; flex-direction: column; gap: 12px; }
.ics-top { display: grid; grid-template-columns: minmax(140px, 1fr) minmax(120px, 1fr); gap: 14px; align-items: center; }

/* gauge */
.ics-gauge { position: relative; }
.ics-gauge svg { width: 100%; display: block; }
.g-track { fill: none; stroke: var(--sd-surface-glass); stroke-width: 9; stroke-linecap: round; }
.g-zone { fill: none; stroke-width: 9; stroke-linecap: butt; opacity: 0.85;
  stroke-dasharray: 0 100; animation: sd-ics-zone 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.g-zone.lo { stroke: var(--intel-dn); --seg: 33; animation-delay: 0.1s; }
.g-zone.mid { stroke: var(--intel); --seg: 24; stroke-dashoffset: -34; animation-delay: 0.25s; }
.g-zone.hi { stroke: var(--intel-up); --seg: 40; stroke-dashoffset: -59; animation-delay: 0.4s; }
@keyframes sd-ics-zone { to { stroke-dasharray: var(--seg) 100; } }
.g-needle { transform-origin: 70px 74px; transition: transform 1.1s cubic-bezier(0.22, 1.4, 0.36, 1); }
.g-needle line { stroke: var(--sd-text); stroke-width: 2.6; stroke-linecap: round; }
.g-needle circle { fill: var(--intel); stroke: var(--sd-surface); stroke-width: 2; }
.g-min, .g-max { font-size: 7.5px; fill: var(--sd-text-dim); letter-spacing: 0.1em; }

.ics-avg { position: absolute; left: 0; right: 0; bottom: -4px; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.ics-avg .v { font-size: 21px; font-weight: 800; color: var(--sd-text); letter-spacing: -0.02em; line-height: 1; }
.stars { display: inline-flex; gap: 2px; color: var(--sd-text-dim); }
.stars .st { animation: sd-ics-pop 0.4s var(--sd-spring) backwards; }
.stars .lit { color: var(--intel); fill: var(--intel); filter: drop-shadow(0 0 5px color-mix(in srgb, var(--intel) 55%, transparent)); }
@keyframes sd-ics-pop { from { opacity: 0; transform: scale(0) rotate(-40deg); } }

/* side */
.ics-side { display: flex; flex-direction: column; gap: 8px; }
.side-chip { display: flex; align-items: baseline; justify-content: space-between; gap: 8px;
  padding: 7px 11px; border-radius: 11px; background: var(--sd-surface-glass); }
.side-chip .k { font-size: 8.5px; letter-spacing: 0.2em; color: var(--sd-text-dim); }
.side-chip .n { font-size: 15px; font-weight: 800; color: var(--sd-text); }
.ics-spark { width: 100%; height: 40px; }
.sp-a { fill: color-mix(in srgb, var(--intel) 12%, transparent); opacity: 0; animation: sd-ics-fade 0.8s 0.9s ease forwards; }
.sp { fill: none; stroke: var(--intel); stroke-width: 2; stroke-linecap: round;
  stroke-dasharray: 1; stroke-dashoffset: 1; animation: sd-ics-draw 1.2s 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes sd-ics-draw { to { stroke-dashoffset: 0; } }
@keyframes sd-ics-fade { to { opacity: 1; } }

/* distribution */
.ics-dist { display: flex; flex-direction: column; gap: 6px; }
.ds-row { display: grid; grid-template-columns: 26px 1fr 30px; align-items: center; gap: 9px; transition: opacity 0.2s; }
.ds-row.zero { opacity: 0.45; }
.ds-k { font-size: 10.5px; color: var(--sd-text-muted); }
.ds-track { height: 8px; border-radius: 999px; background: var(--sd-surface-glass); overflow: hidden; }
.ds-track i { display: block; height: 100%; border-radius: 999px; transform-origin: left; position: relative;
  animation: sd-bar-grow 0.8s var(--sd-spring) backwards; transition: width 0.5s var(--sd-spring); }
.ds-v { font-size: 11px; font-weight: 700; color: var(--sd-text); text-align: right; }

/* empty state */
.ics-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 22px 10px 18px; text-align: center; }
.ghost-stars { display: inline-flex; gap: 7px; color: var(--sd-text-dim); }
.ghost-stars :deep(svg) { animation: sd-ics-ghost 2.6s ease-in-out infinite; }
@keyframes sd-ics-ghost { 0%, 100% { opacity: 0.3; transform: translateY(0); } 50% { opacity: 0.85; transform: translateY(-3px); } }
.e-title { margin: 2px 0 0; font-size: 14px; font-weight: 700; color: var(--sd-text-secondary); }
.e-sub { margin: 0; font-size: 8.5px; letter-spacing: 0.2em; color: var(--sd-text-dim); max-width: 34ch; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .g-zone { animation: none; stroke-dasharray: var(--seg) 100; }
  html:not([data-cinematic="on"]) .g-needle { transition: none; }
  html:not([data-cinematic="on"]) .stars .st, html:not([data-cinematic="on"]) .ds-track i,
  html:not([data-cinematic="on"]) .sp, html:not([data-cinematic="on"]) .sp-a,
  html:not([data-cinematic="on"]) .ghost-stars :deep(svg) { animation: none; }
  html:not([data-cinematic="on"]) .sp { stroke-dashoffset: 0; }
  html:not([data-cinematic="on"]) .sp-a { opacity: 1; }
}
</style>
