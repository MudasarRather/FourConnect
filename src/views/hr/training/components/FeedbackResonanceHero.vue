<template>
  <Motion as="section" class="frh" ref="rootRef"
    :initial="reduced ? false : { opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
    <!-- ambient layers -->
    <span class="frh-aurora" aria-hidden="true" />
    <span class="trn-spotlight" aria-hidden="true" />
    <span class="trn-grain" aria-hidden="true" />
    <span class="frh-eq" aria-hidden="true">
      <i v-for="b in eqBars" :key="b.i" :style="b.style" />
    </span>

    <div class="frh-top">
      <!-- ── lead + toolbar ── -->
      <div class="frh-lead">
        <span class="frh-eyebrow"><AudioLines :size="13" /> Voice of the Learner</span>
        <h1 class="frh-title">Feedback</h1>
        <p class="frh-sub">
          Every rating a frequency — content, trainer and relevance tuned into one resonance.
          <span class="frh-sentiment" :style="{ '--c': gaugeColor }">{{ sentimentWord }}</span> overall.
        </p>

        <div class="frh-tools">
          <div class="frh-search">
            <Search :size="15" />
            <input :value="search" @input="$emit('update:search', $event.target.value)"
              placeholder="Search comment, program, learner…" />
            <button v-if="search" class="frh-search-x" @click="$emit('update:search', '')" aria-label="Clear"><X :size="14" /></button>
          </div>
          <div class="frh-sel">
            <TrnSelect :model-value="programFilter" @update:modelValue="$emit('update:programFilter', $event)"
              :options="programOptions" searchable search-placeholder="Find a program…" placeholder="All programs" />
          </div>
          <div class="frh-sel">
            <TrnSelect :model-value="trainerFilter" @update:modelValue="$emit('update:trainerFilter', $event)"
              :options="trainerOptions" searchable search-placeholder="Find a trainer…" placeholder="All trainers" />
          </div>
          <div class="frh-sel narrow">
            <TrnSelect :model-value="sort" @update:modelValue="$emit('update:sort', $event)" :options="sortOptions" placeholder="Sort" />
          </div>
          <Motion as="button" type="button" class="frh-chip" :class="{ on: recommendOnly }"
            :whileHover="reduced ? {} : { y: -2 }" :whileTap="{ scale: 0.95 }"
            @click="$emit('update:recommendOnly', !recommendOnly)">
            <ThumbsUp :size="14" /> Recommended only
          </Motion>
        </div>
      </div>

      <!-- ── resonance gauge (240° speedometer) ── -->
      <div class="frh-gauge" :class="{ 'is-in': visible }" :style="{ '--c': gaugeColor }">
        <span class="frh-gauge-aura" aria-hidden="true" />
        <span class="frh-gauge-sweep" aria-hidden="true" />
        <svg class="frh-gauge-svg" viewBox="0 0 200 200" aria-hidden="true">
          <defs>
            <linearGradient id="frhGauge" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stop-color="var(--trn-ember)" />
              <stop offset="55%" stop-color="var(--trn-amber)" />
              <stop offset="100%" stop-color="var(--trn-star)" />
            </linearGradient>
          </defs>
          <!-- track -->
          <circle class="frh-track" cx="100" cy="100" :r="R" fill="none" :stroke-width="STROKE"
            pathLength="100" :stroke-dasharray="`${SPAN} ${100 - SPAN}`" :transform="`rotate(150 100 100)`" />
          <!-- ticks -->
          <line v-for="t in ticks" :key="t.v" class="frh-tick" :class="{ major: t.major }"
            :x1="t.x1" :y1="t.y1" :x2="t.x2" :y2="t.y2" />
          <!-- value arc -->
          <circle class="frh-fill" cx="100" cy="100" :r="R" fill="none" :stroke-width="STROKE" stroke-linecap="round"
            stroke="url(#frhGauge)" pathLength="100" :stroke-dasharray="visible ? `${fillLen} 100` : `0 100`"
            :transform="`rotate(150 100 100)`" />
          <!-- comet tip -->
          <circle v-if="visible && total" class="frh-comet" :cx="tip.x" :cy="tip.y" :r="STROKE / 2 - 1.5" />
        </svg>
        <div class="frh-gauge-center">
          <div class="frh-gauge-num">
            <span class="frh-gauge-val trn-mono"><TrnCountUp :value="overallAvg" :decimals="1" :duration="1.6" /></span>
            <span class="frh-gauge-of">/5</span>
          </div>
          <FbStarMeter :rating="overallAvg" :size="17" :gap="3" ignite />
          <span class="frh-gauge-foot trn-mono">{{ total.toLocaleString() }} response{{ total === 1 ? '' : 's' }}</span>
        </div>
        <span class="frh-gauge-end lo">0</span>
        <span class="frh-gauge-end hi">5</span>
      </div>
    </div>

    <!-- ── instrument strip: metric capsules + rating distribution ── -->
    <div class="frh-strip">
      <div class="frh-metrics">
        <Motion v-for="(m, i) in metrics" :key="m.key" as="button" type="button" class="frh-cap"
          :style="{ '--c': m.color }" :disabled="!m.go"
          :initial="reduced ? false : { opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.5, delay: 0.15 + i * 0.07, ease: [0.16, 1, 0.3, 1] }"
          :whileHover="reduced || !m.go ? {} : { y: -3 }" @click="m.go && $emit('go', m.go)">
          <span class="frh-cap-ic"><component :is="m.icon" :size="16" /></span>
          <div class="frh-cap-body">
            <strong class="frh-cap-val"><TrnCountUp :value="m.value" :suffix="m.suffix || ''" :decimals="m.decimals || 0" /></strong>
            <span class="frh-cap-lab">{{ m.label }}</span>
          </div>
          <ArrowUpRight v-if="m.go" :size="13" class="frh-cap-go" />
        </Motion>
      </div>

      <div class="frh-dist" ref="distRef" :class="{ 'is-in': distIn }">
        <div class="frh-dist-head">
          <span class="frh-dist-title trn-mono">Rating spread</span>
          <span class="frh-dist-foot">{{ distTotal.toLocaleString() }} rated</span>
        </div>
        <div class="frh-dist-bars">
          <div v-for="(d, i) in distRows" :key="d.star" class="frh-dist-col"
            :title="`${d.star}★ — ${d.count} (${d.pct}%)`">
            <span class="frh-dist-n">{{ d.count }}</span>
            <div class="frh-dist-track">
              <span class="frh-dist-fill" :style="{ height: distIn ? Math.max(d.h, d.count ? 5 : 0) + '%' : '0%',
                background: d.color, transitionDelay: (i * 0.08) + 's' }" />
            </div>
            <span class="frh-dist-star" :style="{ color: d.color }">{{ d.star }}★</span>
          </div>
        </div>
      </div>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { AudioLines, Search, X, ThumbsUp, Users, BookOpen, ArrowUpRight, Presentation } from 'lucide-vue-next'
import TrnSelect from './TrnSelect.vue'
import TrnCountUp from './TrnCountUp.vue'
import FbStarMeter from './FbStarMeter.vue'
import { prefersReduced, usePointerSpotlight, useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  overallAvg: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  recommendRate: { type: Number, default: 0 },
  programsRated: { type: Number, default: 0 },
  trainersRated: { type: Number, default: 0 },
  distribution: { type: Object, default: () => ({}) }, // { 1:n, 2:n, 3:n, 4:n, 5:n }
  distTotal: { type: Number, default: 0 },
  // filter v-models
  search: { type: String, default: '' },
  programFilter: { type: String, default: '' },
  trainerFilter: { type: String, default: '' },
  sort: { type: String, default: 'recent' },
  recommendOnly: { type: Boolean, default: false },
  programOptions: { type: Array, default: () => [] },
  trainerOptions: { type: Array, default: () => [] },
  sortOptions: { type: Array, default: () => [] },
})
defineEmits([
  'update:search', 'update:programFilter', 'update:trainerFilter', 'update:sort', 'update:recommendOnly', 'go',
])

const reduced = prefersReduced()
const rootRef = ref(null)
usePointerSpotlight(rootRef)
const { visible } = useInView(rootRef, { threshold: 0.2 })
const distRef = ref(null)
const { visible: distIn } = useInView(distRef, { threshold: 0.3 })

// ── gauge geometry (240° arc, gap at bottom) ────────────────────────────────
const R = 84, STROKE = 14, SPAN = 240 / 360 * 100 // pathLength units
const frac = computed(() => Math.max(0, Math.min(1, props.overallAvg / 5)))
const fillLen = computed(() => frac.value * SPAN)
const tip = computed(() => {
  const a = (150 + frac.value * 240) * Math.PI / 180
  return { x: 100 + R * Math.cos(a), y: 100 + R * Math.sin(a) }
})
const gaugeColor = computed(() =>
  props.overallAvg >= 4 ? 'var(--trn-st-completed)'
    : props.overallAvg >= 3 ? 'var(--trn-amber)'
      : props.overallAvg > 0 ? 'var(--trn-st-failed)' : 'var(--trn-st-not-started)')
const sentimentWord = computed(() => {
  const a = props.overallAvg
  if (!props.total) return 'Awaiting'
  if (a >= 4.5) return 'Outstanding'
  if (a >= 4) return 'Excellent'
  if (a >= 3.5) return 'Strong'
  if (a >= 3) return 'Fair'
  if (a >= 2) return 'Mixed'
  return 'Poor'
})
// integer ticks 0..5 sitting just outside the track
const ticks = computed(() => Array.from({ length: 6 }, (_, v) => {
  const a = (150 + (v / 5) * 240) * Math.PI / 180
  const r0 = R + STROKE / 2 + 2, r1 = r0 + (v % 5 === 0 ? 7 : 4)
  return {
    v, major: v % 5 === 0,
    x1: 100 + r0 * Math.cos(a), y1: 100 + r0 * Math.sin(a),
    x2: 100 + r1 * Math.cos(a), y2: 100 + r1 * Math.sin(a),
  }
}))

// ── metric capsules ──────────────────────────────────────────────────────────
const metrics = computed(() => [
  { key: 'responses', label: 'Responses', value: props.total, icon: Users, color: 'var(--trn-amber)' },
  { key: 'recommend', label: 'Would recommend', value: props.recommendRate, suffix: '%', icon: ThumbsUp, color: 'var(--trn-st-completed)' },
  { key: 'programs', label: 'Programs rated', value: props.programsRated, icon: BookOpen, color: 'var(--trn-amber-strong)', go: 'programs' },
  { key: 'trainers', label: 'Trainers rated', value: props.trainersRated, icon: Presentation, color: 'var(--trn-ember)', go: 'trainers' },
])

// ── rating distribution (5★ → 1★) ─────────────────────────────────────────────
const STAR_COLOR = {
  5: 'var(--trn-st-completed)', 4: 'var(--trn-amber)', 3: 'var(--trn-amber-strong)',
  2: 'var(--trn-st-waived)', 1: 'var(--trn-st-failed)',
}
const distRows = computed(() => {
  const counts = [5, 4, 3, 2, 1].map(s => ({ star: s, count: Number(props.distribution[s]) || 0, color: STAR_COLOR[s] }))
  const max = Math.max(1, ...counts.map(c => c.count))
  return counts.map(c => ({ ...c, h: (c.count / max) * 100, pct: props.distTotal ? Math.round((c.count / props.distTotal) * 100) : 0 }))
})

// ── decorative equalizer backdrop (deterministic) ─────────────────────────────
const eqBars = Array.from({ length: 26 }, (_, i) => {
  const h = 24 + ((i * 37) % 60)
  return { i, style: { height: h + '%', left: (i / 26 * 100) + '%', animationDelay: ((i * 0.13) % 2.4).toFixed(2) + 's', animationDuration: (1.6 + (i % 5) * 0.3).toFixed(2) + 's' } }
})
</script>

<style scoped>
.frh { position: relative; overflow: hidden; isolation: isolate; border-radius: 24px; padding: 26px 28px 22px;
  border: 1px solid var(--trn-border-soft); background: var(--trn-grad-hero), var(--trn-surf-card); box-shadow: var(--trn-card-shadow); }
.frh-aurora { position: absolute; inset: -40% -20% auto -20%; height: 92%; z-index: 0; pointer-events: none;
  background:
    radial-gradient(56% 68% at 84% 4%, color-mix(in srgb, var(--trn-st-completed) 13%, transparent), transparent 60%),
    radial-gradient(54% 64% at 16% 0%, color-mix(in srgb, var(--trn-amber) 22%, transparent), transparent 60%);
  filter: blur(14px); opacity: 0.85; animation: frh-drift 18s ease-in-out infinite alternate; }
/* equalizer dust along the bottom edge */
.frh-eq { position: absolute; left: 0; right: 0; bottom: 0; height: 40%; z-index: 0; pointer-events: none; opacity: 0.13;
  -webkit-mask: linear-gradient(0deg, #000, transparent); mask: linear-gradient(0deg, #000, transparent); }
.frh-eq i { position: absolute; bottom: 0; width: 2.4%; border-radius: 3px 3px 0 0;
  background: linear-gradient(180deg, var(--trn-amber), transparent); transform-origin: bottom; animation: frh-eq-pulse ease-in-out infinite alternate; }
[data-theme="light"] .frh-eq { opacity: 0.18; }

.frh-top { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 28px; }

/* lead */
.frh-lead { min-width: 0; flex: 1; }
.frh-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--trn-mono); font-size: 11px; font-weight: 600;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--trn-amber-strong); }
.frh-eyebrow :deep(svg) { color: var(--trn-amber); }
.frh-title { margin: 9px 0 0; font-size: 34px; font-weight: 850; letter-spacing: -0.03em; line-height: 1; color: var(--trn-text);
  background: linear-gradient(120deg, var(--trn-text) 34%, var(--trn-amber-strong)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.frh-sub { margin: 10px 0 0; font-size: 13px; color: var(--trn-text-muted); max-width: 52ch; line-height: 1.5; }
.frh-sentiment { font-weight: 800; color: var(--c, var(--trn-amber)); }

.frh-tools { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 18px; }
.frh-search { display: flex; align-items: center; gap: 8px; padding: 0 10px 0 12px; border-radius: 12px; flex: 1; min-width: 220px;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); transition: border-color 0.2s, box-shadow 0.2s; }
.frh-search:focus-within { border-color: color-mix(in srgb, var(--trn-amber) 50%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--trn-amber) 14%, transparent); }
.frh-search :deep(svg) { color: var(--trn-text-dim); flex-shrink: 0; }
.frh-search input { flex: 1; min-width: 0; border: 0; background: transparent; padding: 9px 0; font: inherit; font-size: 13px; color: var(--trn-text); }
.frh-search input:focus { outline: none; }
.frh-search input::placeholder { color: var(--trn-text-dim); }
.frh-search-x { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; border: 0; cursor: pointer;
  background: var(--trn-surface-elevated); color: var(--trn-text-muted); flex-shrink: 0; }
.frh-search-x:hover { color: var(--trn-text); }
.frh-sel { width: 168px; }
.frh-sel.narrow { width: 138px; }
.frh-chip { display: inline-flex; align-items: center; gap: 7px; font: inherit; font-size: 12.5px; font-weight: 600;
  padding: 9px 13px; border-radius: 11px; cursor: pointer; color: var(--trn-text-secondary);
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); transition: all 0.22s var(--trn-spring); white-space: nowrap; }
.frh-chip:hover { color: var(--trn-text); border-color: color-mix(in srgb, var(--trn-st-completed) 40%, transparent); }
.frh-chip.on { color: var(--trn-st-completed); border-color: color-mix(in srgb, var(--trn-st-completed) 55%, transparent);
  background: var(--trn-st-completed-soft); }

/* gauge */
.frh-gauge { position: relative; flex-shrink: 0; width: 222px; height: 200px; display: grid; place-items: center; }
.frh-gauge-aura { position: absolute; inset: 26px 16px 30px; border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--c) 22%, transparent), transparent 68%);
  animation: frh-breathe 5.4s ease-in-out infinite; }
.frh-gauge-sweep { position: absolute; inset: 6px 6px 22px; border-radius: 50%; pointer-events: none; opacity: 0.45;
  background: conic-gradient(from 150deg, transparent 0deg, color-mix(in srgb, var(--c) 60%, transparent) 40deg, transparent 80deg);
  -webkit-mask: radial-gradient(circle, transparent 64%, #000 66%, #000 79%, transparent 81%);
  mask: radial-gradient(circle, transparent 64%, #000 66%, #000 79%, transparent 81%);
  mix-blend-mode: screen; animation: trn-radar-sweep 6s linear infinite; }
[data-theme="light"] .frh-gauge-sweep { mix-blend-mode: multiply; opacity: 0.32; }
.frh-gauge-svg { position: relative; width: 100%; height: 100%; }
.frh-track { stroke: var(--trn-border-strong); opacity: 0.42; }
.frh-fill { transition: stroke-dasharray 1.3s var(--trn-spring); filter: drop-shadow(0 0 6px color-mix(in srgb, var(--c) 55%, transparent)); }
.frh-tick { stroke: var(--trn-text-dim); stroke-width: 1.4; opacity: 0.5; }
.frh-tick.major { stroke: var(--trn-text-muted); stroke-width: 2; opacity: 0.8; }
.frh-comet { fill: #fff; filter: drop-shadow(0 0 8px var(--c)); animation: frh-comet-pulse 2.2s ease-in-out infinite; }
[data-theme="light"] .frh-comet { fill: var(--c); }
.frh-gauge-center { position: absolute; inset: 0 0 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; }
.frh-gauge-num { display: flex; align-items: baseline; gap: 3px; }
.frh-gauge-val { font-size: 46px; font-weight: 850; line-height: 1; letter-spacing: -0.03em; color: var(--trn-text); }
.frh-gauge-of { font-size: 16px; font-weight: 700; color: var(--trn-text-dim); }
.frh-gauge-foot { font-size: 10.5px; letter-spacing: 0.04em; color: var(--trn-text-muted); margin-top: 2px; }
.frh-gauge-end { position: absolute; bottom: 22px; font-family: var(--trn-mono); font-size: 11px; font-weight: 700; color: var(--trn-text-dim); }
.frh-gauge-end.lo { left: 16px; } .frh-gauge-end.hi { right: 16px; }

/* instrument strip */
.frh-strip { position: relative; z-index: 1; display: grid; grid-template-columns: 1.5fr 1fr; gap: 14px;
  margin-top: 22px; padding-top: 20px; border-top: 1px solid var(--trn-border-soft); }
.frh-metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.frh-cap { position: relative; display: flex; align-items: center; gap: 11px; padding: 12px 14px; text-align: left; font: inherit;
  border-radius: 15px; border: 1px solid var(--trn-border-soft); background: var(--trn-surface); cursor: default; overflow: hidden;
  transition: border-color 0.25s, background 0.25s; }
.frh-cap[disabled] { cursor: default; }
.frh-cap:not([disabled]) { cursor: pointer; }
.frh-cap:not([disabled]):hover { border-color: color-mix(in srgb, var(--c) 42%, transparent); background: var(--trn-surface-elevated); }
.frh-cap-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 12px; flex-shrink: 0; color: var(--c);
  background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 26%, transparent); }
.frh-cap-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.frh-cap-val { font-family: var(--trn-mono); font-size: 22px; font-weight: 800; line-height: 1.05; color: var(--trn-text); }
.frh-cap-lab { font-size: 11px; color: var(--trn-text-muted); }
.frh-cap-go { color: var(--trn-text-dim); flex-shrink: 0; transition: color 0.2s, transform 0.2s; }
.frh-cap:not([disabled]):hover .frh-cap-go { color: var(--c); transform: translate(2px, -2px); }

/* rating distribution */
.frh-dist { display: flex; flex-direction: column; gap: 9px; padding: 13px 15px; border-radius: 16px;
  border: 1px solid var(--trn-border-soft); background: var(--trn-surface); }
.frh-dist-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.frh-dist-title { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trn-text-dim); }
.frh-dist-foot { font-size: 11px; color: var(--trn-text-muted); }
.frh-dist-bars { display: flex; align-items: flex-end; gap: 8px; height: 84px; }
.frh-dist-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; }
.frh-dist-n { font-family: var(--trn-mono); font-size: 11px; font-weight: 700; color: var(--trn-text-secondary); }
.frh-dist-track { position: relative; flex: 1; width: 100%; max-width: 22px; border-radius: 7px 7px 4px 4px; overflow: hidden;
  background: var(--trn-border-soft); display: flex; align-items: flex-end; }
.frh-dist-fill { display: block; width: 100%; height: 0; border-radius: 7px 7px 4px 4px;
  transition: height 0.9s var(--trn-spring); box-shadow: inset 0 1px 0 rgba(255,255,255,0.25); }
.frh-dist-star { font-family: var(--trn-mono); font-size: 10.5px; font-weight: 700; }

@keyframes frh-drift { 0% { transform: translate3d(-3%, -2%, 0) scale(1); } 100% { transform: translate3d(4%, 3%, 0) scale(1.07); } }
@keyframes frh-breathe { 0%, 100% { opacity: 0.45; transform: scale(0.93); } 50% { opacity: 0.85; transform: scale(1.06); } }
@keyframes frh-comet-pulse { 0%, 100% { opacity: 0.85; } 50% { opacity: 1; } }
@keyframes frh-eq-pulse { 0% { transform: scaleY(0.55); } 100% { transform: scaleY(1); } }

@media (max-width: 980px) {
  .frh-top { flex-direction: column-reverse; align-items: stretch; gap: 16px; }
  .frh-gauge { margin: 0 auto; }
  .frh-strip { grid-template-columns: 1fr; }
}
@media (max-width: 560px) {
  .frh-metrics { grid-template-columns: 1fr; }
  .frh-search, .frh-sel, .frh-sel.narrow, .frh-chip { width: 100%; flex: 1 1 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .frh-aurora, .frh-gauge-aura, .frh-gauge-sweep, .frh-comet, .frh-eq i { animation: none !important; }
  .frh-fill, .frh-dist-fill { transition: none !important; }
}
</style>
