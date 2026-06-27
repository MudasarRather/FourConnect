<template>
  <!-- ═══════════════════════ THE PERFORMANCE OBSERVATORY ═══════════════════════
       The Arena's signature instrument. A living celestial orrery:
        · a luminous CORE = the workforce's average score (colour = scoreTone),
          wrapped by a conic completion-rate ring + breathing corona,
        · four concentric ORBITAL TRACKS = the review lifecycle (Self → Manager →
          Completed → Acknowledged), each carrying orbiting bodies — one glowing
          mote per in-flight review, capped with a +N overflow marker,
        · a flowing topographic wave-field + drifting starfield backdrop so it
          reads rich even on an empty database,
        · 3-tier pointer parallax + 3D tilt for depth.
       Distinct from the Assets "Status Reactor" (static nested arcs) and the Exit
       "flowing current" — this is the only orbiting-orrery motif. -->
  <div ref="rootEl" class="obs" :class="{ lit }">
    <!-- backdrop layers -->
    <span class="obs-grain" aria-hidden="true" />
    <div class="obs-wave" aria-hidden="true">
      <svg viewBox="0 0 1000 520" preserveAspectRatio="none">
        <path v-for="n in 7" :key="'w' + n" class="obs-wline" :style="{ '--wi': n }"
          :d="wavePath(n)" pathLength="1" />
      </svg>
    </div>
    <div class="obs-stars" aria-hidden="true">
      <span v-for="s in stars" :key="'s' + s.i" class="obs-star"
        :style="{ left: s.x + '%', top: s.y + '%', '--d': s.d + 's', '--dl': s.dl + 's', '--sz': s.sz + 'px' }" />
    </div>

    <!-- the orrery -->
    <div class="obs-scene">
      <div class="obs-system">
        <!-- orbit rings + bodies -->
        <div v-for="(st, ri) in stages" :key="st.key" class="obs-ring" :class="{ active: st.count > 0 }"
          :style="{ '--d': st.dia + '%', '--c': st.color }">
          <span class="obs-ring-line" />
          <button class="obs-ring-tag" type="button" @click="$emit('pick', st.key)">
            <component :is="st.icon" :size="11" /><b>{{ st.count }}</b><span>{{ st.label }}</span>
          </button>
          <div v-for="b in st.bodies" :key="st.key + b.i" class="obs-arm" :style="{ '--a0': b.a0 + 'deg', '--dur': st.dur + 's' }"
            :class="{ rev: ri % 2 === 1 }">
            <div class="obs-spin" :style="{ '--dur': st.dur + 's' }">
              <span class="obs-body" :style="{ '--c': st.color }"><i /></span>
            </div>
          </div>
          <div v-if="st.overflow > 0" class="obs-arm obs-arm-more" :style="{ '--a0': '8deg', '--dur': st.dur + 's' }" :class="{ rev: ri % 2 === 1 }">
            <div class="obs-spin" :style="{ '--dur': st.dur + 's' }"><span class="obs-more">+{{ st.overflow }}</span></div>
          </div>
        </div>

        <!-- core -->
        <div class="obs-core" :style="{ '--perf-p': compDeg + 'deg', '--core': coreColor }">
          <span class="obs-core-corona" />
          <span class="obs-core-ring" />
          <span class="obs-core-emit" />
          <span class="obs-core-emit two" />
          <div class="obs-core-face">
            <span class="obs-core-val" v-if="avg != null"><SetCountUp :value="avg" :decimals="1" /><i>/{{ max }}</i></span>
            <span class="obs-core-val dim" v-else>—</span>
            <span class="obs-core-lab">avg score</span>
            <span class="obs-core-comp"><Gauge :size="10" /> {{ Math.round(completion) }}% complete</span>
          </div>
        </div>
      </div>
    </div>

    <!-- floating glass HUD -->
    <div class="obs-hud obs-hud-tl">
      <span class="obs-hud-k"><Telescope :size="12" /> Reviews in orbit</span>
      <b><SetCountUp :value="total" /></b>
    </div>
    <div class="obs-hud obs-hud-tr">
      <span class="obs-hud-k"><BadgeCheck :size="12" /> Signed off</span>
      <b><SetCountUp :value="acknowledged" /></b>
    </div>
    <div class="obs-hud obs-hud-bl">
      <span class="obs-hud-k"><Activity :size="12" /> In flight</span>
      <b><SetCountUp :value="inFlight" /></b>
    </div>
    <button class="obs-hud obs-hud-br" :class="{ alert: overdue > 0 }" type="button" @click="$emit('pick', 'overdue')">
      <span class="obs-hud-k"><TriangleAlert :size="12" /> Overdue</span>
      <b><SetCountUp :value="overdue" /></b>
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Gauge, Telescope, BadgeCheck, Activity, TriangleAlert, PencilRuler, UserCheck, CheckCircle2, ShieldCheck } from 'lucide-vue-next'
import SetCountUp from '@/views/hr/settings/components/SetCountUp.vue'
import { usePointerSpotlight, prefersReduced } from '@/composables/useShiftMotion'
import { scoreTone } from '@/composables/usePerformance'

const props = defineProps({
  stats: { type: Object, default: () => ({}) },
  max: { type: Number, default: 5 },
})
defineEmits(['pick'])

const rootEl = ref(null)
usePointerSpotlight(rootEl)
const lit = ref(false)
onMounted(() => { requestAnimationFrame(() => { lit.value = true }) })

const byStatus = computed(() => props.stats.by_status || {})
const total = computed(() => props.stats.total || 0)
const avg = computed(() => props.stats.avg_overall ?? null)
const completion = computed(() => props.stats.completion_rate || 0)
const acknowledged = computed(() => props.stats.acknowledged || 0)
const overdue = computed(() => props.stats.overdue || 0)
const inFlight = computed(() => (byStatus.value.SELF_ASSESSMENT || 0) + (byStatus.value.MANAGER_ASSESSMENT || 0) + (byStatus.value.DRAFT || 0))
const compDeg = computed(() => Math.round(completion.value / 100 * 360))
const coreColor = computed(() => avg.value != null ? scoreTone(avg.value, props.max) : 'var(--perf-unset)')

const CAP = 9
const RING_DEFS = [
  { key: 'SELF_ASSESSMENT',    label: 'Self',         color: 'var(--perf-amber)',  icon: PencilRuler,   dia: 40, dur: 30 },
  { key: 'MANAGER_ASSESSMENT', label: 'Manager',      color: 'var(--perf-orange)', icon: UserCheck,     dia: 58, dur: 38 },
  { key: 'COMPLETED',          label: 'Completed',    color: 'var(--perf-gold)',   icon: CheckCircle2,  dia: 76, dur: 48 },
  { key: 'ACKNOWLEDGED',       label: 'Acknowledged', color: 'var(--perf-ok)',     icon: ShieldCheck,   dia: 94, dur: 60 },
]
// deterministic angle jitter so bodies aren't perfectly even / lockstep
const jitter = (seed) => ((Math.sin(seed * 12.9898) * 43758.5453) % 1 + 1) % 1
const stages = computed(() => RING_DEFS.map((r, ri) => {
  const count = byStatus.value[r.key] || 0
  const shown = Math.min(count, CAP)
  const bodies = Array.from({ length: shown }, (_, i) => ({
    i, a0: Math.round((i / Math.max(1, shown)) * 360 + jitter(ri * 7 + i * 3) * 26),
  }))
  return { ...r, count, bodies, overflow: Math.max(0, count - CAP) }
}))

// data-independent starfield (never empty)
const stars = Array.from({ length: 26 }, (_, i) => ({
  i,
  x: Math.round(((Math.sin(i * 7.1) + 1) / 2) * 100),
  y: Math.round(((Math.cos(i * 4.3) + 1) / 2) * 100),
  d: (2.4 + (i % 5) * 0.7).toFixed(1),
  dl: ((i % 7) * 0.4).toFixed(1),
  sz: 1 + (i % 3),
}))

// flowing topographic contour lines
const reduced = prefersReduced()
function wavePath(n) {
  const y = 60 + n * 58
  const amp = 16 + (n % 3) * 8
  const k = 0.9 + n * 0.07
  let d = `M -40 ${y}`
  for (let x = 0; x <= 1080; x += 60) {
    const yy = y + Math.sin((x / 1000) * Math.PI * 2 * k + n) * amp
    d += ` L ${x} ${Math.round(yy)}`
  }
  return d
}
</script>

<style scoped>
.obs { position: relative; overflow: hidden; border-radius: 22px; min-height: 360px;
  background: radial-gradient(120% 130% at 50% 0%, color-mix(in srgb, var(--perf-gold) 7%, transparent), transparent 60%), var(--perf-glass);
  border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow);
  --mx: 0.5; --my: 0.5; --spot: 0; }

.obs-grain { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(color-mix(in srgb, var(--perf-gold) 5%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--perf-gold) 5%, transparent) 1px, transparent 1px);
  background-size: 34px 34px; mask-image: radial-gradient(120% 120% at 50% 50%, transparent 38%, #000 90%); -webkit-mask-image: radial-gradient(120% 120% at 50% 50%, transparent 38%, #000 90%); }

/* flowing wave field */
.obs-wave { position: absolute; inset: -6% -4%; z-index: 0; pointer-events: none;
  transform: translate(calc((var(--mx) - 0.5) * -16px), calc((var(--my) - 0.5) * -12px));
  mask-image: radial-gradient(80% 90% at 50% 48%, transparent 30%, #000 78%); -webkit-mask-image: radial-gradient(80% 90% at 50% 48%, transparent 30%, #000 78%); }
.obs-wave svg { width: 100%; height: 100%; }
.obs-wline { fill: none; stroke: color-mix(in srgb, var(--perf-gold) 30%, transparent); stroke-width: 1.4; opacity: 0.5;
  stroke-dasharray: 0.04 0.018; stroke-dashoffset: 0; animation: obs-flow calc(13s + var(--wi) * 2s) linear infinite; }
@keyframes obs-flow { to { stroke-dashoffset: -1; } }

/* starfield */
.obs-stars { position: absolute; inset: 0; z-index: 0; pointer-events: none;
  transform: translate(calc((var(--mx) - 0.5) * 10px), calc((var(--my) - 0.5) * 8px)); }
.obs-star { position: absolute; width: var(--sz); height: var(--sz); border-radius: 50%; background: color-mix(in srgb, var(--perf-gold) 70%, #fff);
  box-shadow: 0 0 6px color-mix(in srgb, var(--perf-gold) 60%, transparent); opacity: 0.25; animation: obs-twinkle var(--d) ease-in-out var(--dl) infinite; }
@keyframes obs-twinkle { 0%, 100% { opacity: 0.18; transform: scale(0.8); } 50% { opacity: 0.85; transform: scale(1.2); } }

/* scene + 3D tilt */
.obs-scene { position: absolute; inset: 0; z-index: 1; display: grid; place-items: center; perspective: 1200px; }
.obs-system { position: relative; width: min(366px, 74%); aspect-ratio: 1; transform-style: preserve-3d;
  transform: rotateX(calc((var(--my) - 0.5) * -7deg)) rotateY(calc((var(--mx) - 0.5) * 9deg));
  transition: transform 0.25s var(--perf-spring); }

/* orbit rings */
.obs-ring { position: absolute; left: 50%; top: 50%; width: var(--d); height: var(--d); transform: translate(-50%, -50%); border-radius: 50%; }
.obs-ring-line { position: absolute; inset: 0; border-radius: 50%; border: 1px dashed color-mix(in srgb, var(--c) 18%, transparent);
  opacity: 0.55; animation: obs-ring-spin 90s linear infinite; }
.obs-ring.active .obs-ring-line { border-color: color-mix(in srgb, var(--c) 32%, transparent); opacity: 0.8; }
@keyframes obs-ring-spin { to { transform: rotate(360deg); } }
.obs-ring-tag { position: absolute; left: 50%; top: -2px; transform: translate(-50%, -50%); display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 8px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 9.5px; font-weight: 750; white-space: nowrap;
  color: var(--c); background: color-mix(in srgb, var(--perf-canvas) 70%, transparent); border: 1px solid color-mix(in srgb, var(--c) 34%, transparent);
  backdrop-filter: blur(6px); transition: transform 0.2s var(--perf-spring), box-shadow 0.25s; z-index: 4; }
.obs-ring-tag:hover { transform: translate(-50%, -50%) scale(1.08); box-shadow: 0 0 16px color-mix(in srgb, var(--c) 40%, transparent); }
.obs-ring-tag b { font-size: 11px; font-weight: 900; font-variant-numeric: tabular-nums; }
.obs-ring-tag span { color: var(--perf-text-muted); font-weight: 650; }

/* orbiting bodies — outer arm = static start offset, inner = continuous spin */
.obs-arm { position: absolute; left: 50%; bottom: 50%; width: 0; height: 50%; transform-origin: bottom center; transform: rotate(var(--a0)); }
.obs-spin { position: absolute; inset: 0; transform-origin: bottom center; animation: obs-orbit var(--dur) linear infinite; }
.obs-arm.rev .obs-spin { animation-direction: reverse; }
@keyframes obs-orbit { to { transform: rotate(360deg); } }
.obs-body { position: absolute; top: 0; left: 50%; transform: translate(-50%, -50%); width: 11px; height: 11px; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff, var(--c) 62%); box-shadow: 0 0 10px var(--c), 0 0 3px var(--c); }
.obs-body i { position: absolute; inset: -5px; border-radius: 50%; border: 1px solid color-mix(in srgb, var(--c) 50%, transparent); opacity: 0.6; }
.obs-more { position: absolute; top: 0; left: 50%; transform: translate(-50%, -50%); padding: 2px 6px; border-radius: 999px; font-size: 9px; font-weight: 850;
  color: var(--c); background: color-mix(in srgb, var(--perf-canvas) 75%, transparent); border: 1px solid color-mix(in srgb, var(--c) 40%, transparent); white-space: nowrap; }

/* core */
.obs-core { position: absolute; left: 50%; top: 50%; width: 30%; height: 30%; transform: translate(-50%, -50%); border-radius: 50%;
  display: grid; place-items: center; z-index: 3;
  background: conic-gradient(var(--perf-ok) var(--perf-p, 0deg), var(--perf-track) 0); transition: --perf-p 1.1s var(--perf-spring); }
.obs-core::after { content: ''; position: absolute; inset: 5px; border-radius: 50%;
  background: radial-gradient(circle at 50% 38%, color-mix(in srgb, var(--core) 30%, var(--perf-surface-elevated)), var(--perf-surface-elevated) 72%);
  border: 1px solid color-mix(in srgb, var(--core) 30%, transparent); }
.obs-core-corona { position: absolute; inset: -28%; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--core) 38%, transparent), transparent 66%); filter: blur(10px); animation: obs-breathe 5s ease-in-out infinite; }
@keyframes obs-breathe { 0%, 100% { opacity: 0.55; transform: scale(0.94); } 50% { opacity: 1; transform: scale(1.06); } }
.obs-core-ring { position: absolute; inset: -6%; border-radius: 50%; border: 1px solid color-mix(in srgb, var(--core) 40%, transparent); opacity: 0.5; animation: obs-ring-spin 40s linear infinite; }
.obs-core-emit { position: absolute; inset: 0; border-radius: 50%; border: 1.5px solid color-mix(in srgb, var(--core) 50%, transparent); pointer-events: none; animation: obs-emit 3.4s ease-out infinite; }
.obs-core-emit.two { animation-delay: 1.7s; }
@keyframes obs-emit { 0% { transform: scale(1); opacity: 0.7; } 100% { transform: scale(1.9); opacity: 0; } }
.obs-core-face { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 1px; text-align: center; }
.obs-core-val { font-size: clamp(20px, 5vw, 30px); font-weight: 900; letter-spacing: -0.02em; line-height: 1; color: var(--perf-text); font-variant-numeric: tabular-nums; }
.obs-core-val.dim { color: var(--perf-text-dim); }
.obs-core-val i { font-size: 11px; font-style: normal; color: var(--perf-text-muted); font-weight: 700; }
.obs-core-lab { font-size: 9px; font-weight: 750; letter-spacing: 0.12em; text-transform: uppercase; color: var(--perf-text-muted); }
.obs-core-comp { display: inline-flex; align-items: center; gap: 3px; margin-top: 3px; font-size: 9px; font-weight: 700; color: var(--perf-ok); }
.obs-core-comp :deep(svg) { color: var(--perf-ok); }

/* HUD */
.obs-hud { position: absolute; z-index: 4; display: flex; flex-direction: column; gap: 2px; padding: 9px 12px; border-radius: 13px;
  background: color-mix(in srgb, var(--perf-surface-elevated) 78%, transparent); border: 1px solid var(--perf-border); backdrop-filter: blur(12px);
  box-shadow: 0 12px 30px -20px rgba(0,0,0,0.7); opacity: 0; transform: translateY(8px) scale(0.96); transition: opacity 0.5s var(--perf-spring), transform 0.5s var(--perf-spring); }
.obs.lit .obs-hud { opacity: 1; transform: none; }
.obs-hud-tl { top: 14px; left: 14px; transition-delay: 0.15s; transform: translate(calc((var(--mx) - 0.5) * -14px), calc((var(--my) - 0.5) * -10px)); }
.obs-hud-tr { top: 14px; right: 14px; transition-delay: 0.22s; align-items: flex-end; text-align: right; transform: translate(calc((var(--mx) - 0.5) * 14px), calc((var(--my) - 0.5) * -10px)); }
.obs-hud-bl { bottom: 14px; left: 14px; transition-delay: 0.29s; transform: translate(calc((var(--mx) - 0.5) * -14px), calc((var(--my) - 0.5) * 10px)); }
.obs-hud-br { bottom: 14px; right: 14px; transition-delay: 0.36s; align-items: flex-end; text-align: right; cursor: pointer; font: inherit; transform: translate(calc((var(--mx) - 0.5) * 14px), calc((var(--my) - 0.5) * 10px)); }
.obs.lit .obs-hud-tl, .obs.lit .obs-hud-tr, .obs.lit .obs-hud-bl, .obs.lit .obs-hud-br { transform: translate(var(--hx, 0), var(--hy, 0)); }
.obs-hud-k { display: inline-flex; align-items: center; gap: 5px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--perf-text-muted); white-space: nowrap; }
.obs-hud-k :deep(svg) { color: var(--perf-gold); }
.obs-hud b { font-size: 19px; font-weight: 900; color: var(--perf-text); font-variant-numeric: tabular-nums; line-height: 1; }
.obs-hud-br.alert { border-color: color-mix(in srgb, var(--perf-conflict) 40%, transparent); }
.obs-hud-br.alert .obs-hud-k, .obs-hud-br.alert .obs-hud-k :deep(svg) { color: var(--perf-conflict); }
.obs-hud-br.alert b { color: var(--perf-conflict); }
.obs-hud-br.alert { animation: obs-alert 2.4s ease-in-out infinite; }
@keyframes obs-alert { 0%, 100% { box-shadow: 0 12px 30px -20px rgba(0,0,0,0.7); } 50% { box-shadow: 0 0 0 1px color-mix(in srgb, var(--perf-conflict) 30%, transparent), 0 0 22px -6px var(--perf-conflict); } }

@media (max-width: 640px) {
  .obs-hud b { font-size: 16px; }
  .obs-system { width: 80%; }
}
@media (prefers-reduced-motion: reduce) {
  .obs-wline, .obs-star, .obs-ring-line, .obs-spin, .obs-core-corona, .obs-core-ring, .obs-core-emit, .obs-hud-br.alert { animation: none; }
  .obs-system, .obs-wave, .obs-stars { transform: none; }
  .obs-core-emit { display: none; }
}
</style>
