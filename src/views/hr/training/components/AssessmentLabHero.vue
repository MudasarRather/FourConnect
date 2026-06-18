<template>
  <Motion as="section" class="alh" ref="rootRef"
    :initial="reduced ? false : { opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
    <span class="alh-aurora" aria-hidden="true" />
    <span class="trn-spotlight" aria-hidden="true" />
    <span class="trn-grain" aria-hidden="true" />

    <div class="alh-top">
      <!-- lead -->
      <div class="alh-lead">
        <span class="alh-eyebrow"><FlaskConical :size="13" /> Examination Deck</span>
        <h1 class="alh-title">Assessments</h1>
        <p class="alh-sub">Graded checkpoints across every program. A passing score auto-completes the enrolment and mints its certificate.</p>

        <div class="alh-tools">
          <div class="alh-search">
            <Search :size="15" />
            <input :value="search" @input="$emit('update:search', $event.target.value)" placeholder="Search assessment or program…" />
            <button v-if="search" class="alh-search-x" @click="$emit('update:search', '')" aria-label="Clear"><X :size="14" /></button>
          </div>
          <div class="alh-filter">
            <TrnSelect :model-value="programFilter" @update:modelValue="$emit('update:programFilter', $event)"
              searchable search-placeholder="Search programs…" :options="programOptions" placeholder="All programs" />
          </div>
          <Motion as="button" class="trn-btn trn-btn-primary" type="button"
            :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="$emit('create')">
            <Plus :size="15" /> New assessment
          </Motion>
        </div>
      </div>

      <!-- score dial -->
      <div class="alh-dial" :class="{ 'is-in': visible }">
        <span class="alh-dial-aura" aria-hidden="true" />
        <svg class="alh-dial-svg" :viewBox="`0 0 ${SZ} ${SZ}`" aria-hidden="true">
          <!-- tick marks (exam dial) -->
          <line v-for="t in ticks" :key="'t'+t.i" class="alh-tick" :class="{ major: t.major }"
            :x1="t.x1" :y1="t.y1" :x2="t.x2" :y2="t.y2" />
          <!-- gauge track -->
          <path class="alh-gtrack" :d="arcPath(0, 1)" fill="none" :stroke-width="GW" stroke-linecap="round" />
          <!-- gauge fill -->
          <path class="alh-gfill" :d="arcPath(0, 1)" fill="none" :stroke-width="GW" stroke-linecap="round"
            :stroke-dasharray="ARC_LEN" :stroke-dashoffset="visible ? ARC_LEN * (1 - passRate / 100) : ARC_LEN" />
          <!-- needle -->
          <line class="alh-needle" :x1="C" :y1="C" :x2="needle.x" :y2="needle.y" stroke-linecap="round" />
          <circle class="alh-hub" :cx="C" :cy="C" :r="6" />
        </svg>
        <div class="alh-dial-center">
          <span class="alh-dial-val"><TrnCountUp :value="passRate" :duration="1.6" suffix="%" /></span>
          <span class="alh-dial-lab">pass rate</span>
        </div>
        <span class="alh-dial-min">0</span>
        <span class="alh-dial-max">100</span>
      </div>
    </div>

    <!-- meters + type mix -->
    <div class="alh-bottom" ref="botRef" :class="{ 'is-in': botIn }">
      <div class="alh-meters">
        <div v-for="(m, i) in meters" :key="m.key" class="alh-meter" :style="{ '--c': m.color, '--d': (0.1 + i * 0.08) + 's' }">
          <span class="alh-meter-ic"><component :is="m.icon" :size="15" /></span>
          <div class="alh-meter-txt">
            <strong class="alh-meter-val"><TrnCountUp :value="m.value" :suffix="m.suffix || ''" /></strong>
            <span class="alh-meter-lab">{{ m.label }}</span>
          </div>
        </div>
      </div>

      <div class="alh-mix">
        <div class="alh-mix-head">
          <span class="alh-mix-title">Format mix</span>
          <span class="alh-mix-total trn-mono">{{ total }} total</span>
        </div>
        <div class="alh-mix-bar">
          <span v-for="seg in typeMix" :key="seg.key" class="alh-mix-seg" :style="{ width: botIn ? seg.pct + '%' : '0%', '--c': seg.color }" :title="`${seg.label}: ${seg.count}`" />
        </div>
        <div class="alh-mix-legend">
          <span v-for="seg in typeMix" :key="seg.key" class="alh-mix-leg" :style="{ '--c': seg.color }">
            <span class="alh-mix-dot" /> {{ seg.label }} <b>{{ seg.count }}</b>
          </span>
        </div>
      </div>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import {
  FlaskConical, Search, X, Plus, ClipboardList, Repeat2, BadgeCheck, Gauge,
} from 'lucide-vue-next'
import TrnSelect from './TrnSelect.vue'
import TrnCountUp from './TrnCountUp.vue'
import { prefersReduced, usePointerSpotlight, useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  assessments: { type: Array, default: () => [] },
  programs: { type: Array, default: () => [] },
  search: { type: String, default: '' },
  programFilter: { type: String, default: '' },
})
defineEmits(['update:search', 'update:programFilter', 'create'])

const reduced = prefersReduced()
const rootRef = ref(null)
usePointerSpotlight(rootRef)
const { visible } = useInView(rootRef, { threshold: 0.2 })
const botRef = ref(null)
const { visible: botIn } = useInView(botRef, { threshold: 0.3 })

// ── aggregate stats ──────────────────────────────────────────────────────────
const total = computed(() => props.assessments.length)
const totalAttempts = computed(() => props.assessments.reduce((s, a) => s + (a.result_count || 0), 0))
const totalPassed = computed(() => props.assessments.reduce((s, a) => s + (a.pass_count || 0), 0))
const passRate = computed(() => totalAttempts.value ? Math.round((totalPassed.value / totalAttempts.value) * 100) : 0)

const meters = computed(() => [
  { key: 'count', label: 'Assessments', icon: ClipboardList, color: 'var(--trn-amber)', value: total.value },
  { key: 'attempts', label: 'Attempts logged', icon: Repeat2, color: 'var(--trn-amber-strong)', value: totalAttempts.value },
  { key: 'passed', label: 'Passed', icon: BadgeCheck, color: 'var(--trn-st-completed)', value: totalPassed.value },
  { key: 'rate', label: 'Avg pass rate', icon: Gauge, color: 'var(--trn-ember)', value: passRate.value, suffix: '%' },
])

// ── type mix ─────────────────────────────────────────────────────────────────
const TYPE_DEFS = [
  { key: 'QUIZ', label: 'Quiz', color: 'var(--trn-amber)' },
  { key: 'EXAM', label: 'Exam', color: 'var(--trn-ember)' },
  { key: 'PRACTICAL', label: 'Practical', color: 'var(--trn-amber-strong)' },
  { key: 'SURVEY', label: 'Survey', color: 'var(--trn-star-dim)' },
]
const typeMix = computed(() => {
  const t = total.value || 1
  return TYPE_DEFS.map(d => {
    const count = props.assessments.filter(a => a.assessment_type === d.key).length
    return { ...d, count, pct: (count / t) * 100 }
  }).filter(d => d.count > 0)
})

// ── gauge geometry (240° arc, -210°→30°) ─────────────────────────────────────
const SZ = 200, C = SZ / 2, GW = 12
const R = C - GW / 2 - 14
const START = -210, SWEEP = 240
const rad = (deg) => (deg * Math.PI) / 180
const pt = (deg, r = R) => ({ x: C + r * Math.cos(rad(deg)), y: C + r * Math.sin(rad(deg)) })
const ARC_LEN = (2 * Math.PI * R) * (SWEEP / 360)
const arcPath = () => {
  const a = pt(START), b = pt(START + SWEEP)
  return `M ${a.x} ${a.y} A ${R} ${R} 0 1 1 ${b.x} ${b.y}`
}
const needle = computed(() => pt(START + SWEEP * (passRate.value / 100), R - 10))
const ticks = computed(() => {
  const out = []
  for (let i = 0; i <= 10; i++) {
    const deg = START + (SWEEP * i) / 10
    const major = i % 5 === 0
    const r1 = R + GW / 2 + 3
    const r2 = r1 + (major ? 8 : 4)
    const a = pt(deg, r1), b = pt(deg, r2)
    out.push({ i, major, x1: a.x, y1: a.y, x2: b.x, y2: b.y })
  }
  return out
})

const programOptions = computed(() => [
  { value: '', label: 'All programs' },
  ...(props.programs || []).map(p => ({ value: p.id, label: p.name, hint: p.code || '' })),
])
</script>

<style scoped>
.alh { position: relative; overflow: hidden; isolation: isolate; border-radius: 24px; padding: 26px 28px 22px;
  border: 1px solid var(--trn-border-soft); background: var(--trn-grad-hero), var(--trn-surf-card); box-shadow: var(--trn-card-shadow); }
.alh-aurora { position: absolute; inset: -40% -20% auto -20%; height: 92%; z-index: 0; pointer-events: none;
  background:
    radial-gradient(56% 68% at 82% 6%, color-mix(in srgb, var(--trn-st-completed) 13%, transparent), transparent 60%),
    radial-gradient(54% 64% at 20% 0%, color-mix(in srgb, var(--trn-amber) 20%, transparent), transparent 60%);
  filter: blur(14px); opacity: 0.85; animation: alh-drift 18s ease-in-out infinite alternate; }

.alh-top { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 28px; }
.alh-lead { min-width: 0; flex: 1; }
.alh-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--trn-mono); font-size: 11px; font-weight: 600;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--trn-amber-strong); }
.alh-eyebrow :deep(svg) { color: var(--trn-amber); }
.alh-title { margin: 9px 0 0; font-size: 34px; font-weight: 850; letter-spacing: -0.03em; line-height: 1; color: var(--trn-text);
  background: linear-gradient(120deg, var(--trn-text) 34%, var(--trn-amber-strong)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.alh-sub { margin: 10px 0 0; font-size: 13px; color: var(--trn-text-muted); max-width: 48ch; }

.alh-tools { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 18px; }
.alh-search { display: flex; align-items: center; gap: 8px; padding: 0 10px 0 12px; border-radius: 12px; flex: 1; min-width: 230px;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); transition: border-color 0.2s, box-shadow 0.2s; }
.alh-search:focus-within { border-color: color-mix(in srgb, var(--trn-amber) 50%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--trn-amber) 14%, transparent); }
.alh-search :deep(svg) { color: var(--trn-text-dim); flex-shrink: 0; }
.alh-search input { flex: 1; min-width: 0; border: 0; background: transparent; padding: 9px 0; font: inherit; font-size: 13px; color: var(--trn-text); }
.alh-search input:focus { outline: none; }
.alh-search input::placeholder { color: var(--trn-text-dim); }
.alh-search-x { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; border: 0; cursor: pointer;
  background: var(--trn-surface-elevated); color: var(--trn-text-muted); flex-shrink: 0; }
.alh-search-x:hover { color: var(--trn-text); }
.alh-filter { width: 190px; }

/* score dial */
.alh-dial { position: relative; flex-shrink: 0; width: 200px; height: 200px; display: grid; place-items: center; }
.alh-dial-aura { position: absolute; inset: 20px; border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--trn-st-completed) 18%, transparent), transparent 68%);
  animation: alh-breathe 5.6s ease-in-out infinite; }
.alh-dial-svg { position: relative; width: 100%; height: 100%; }
.alh-tick { stroke: var(--trn-text-dim); stroke-width: 1.5; opacity: 0.5; }
.alh-tick.major { stroke: var(--trn-text-muted); stroke-width: 2; opacity: 0.9; }
.alh-gtrack { stroke: var(--trn-border-strong); opacity: 0.5; }
.alh-gfill { stroke: var(--trn-amber); transition: stroke-dashoffset 1.5s var(--trn-spring) 0.2s;
  filter: drop-shadow(0 0 6px color-mix(in srgb, var(--trn-amber) 45%, transparent)); }
.alh-needle { stroke: var(--trn-text); stroke-width: 3; transform-origin: center;
  transition: none; }
.alh-hub { fill: var(--trn-amber-strong); stroke: var(--trn-canvas); stroke-width: 2; }
.alh-dial-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; transform: translateY(14px); }
.alh-dial-val { font-family: var(--trn-mono); font-size: 34px; font-weight: 850; line-height: 1; letter-spacing: -0.03em; color: var(--trn-text); }
.alh-dial-lab { font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--trn-text-dim); }
.alh-dial-min, .alh-dial-max { position: absolute; bottom: 30px; font-family: var(--trn-mono); font-size: 10px; color: var(--trn-text-dim); }
.alh-dial-min { left: 26px; } .alh-dial-max { right: 26px; }

/* bottom */
.alh-bottom { position: relative; z-index: 1; display: grid; grid-template-columns: 1.6fr 1fr; gap: 22px; margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--trn-border-soft); }
.alh-meters { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.alh-meter { display: flex; align-items: center; gap: 10px; opacity: 0; transform: translateY(8px);
  transition: opacity 0.5s var(--trn-spring), transform 0.5s var(--trn-spring); transition-delay: var(--d); }
.alh-bottom.is-in .alh-meter { opacity: 1; transform: translateY(0); }
.alh-meter-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
  color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); border: 1px solid color-mix(in srgb, var(--c) 26%, transparent); }
.alh-meter-txt { display: flex; flex-direction: column; min-width: 0; }
.alh-meter-val { font-family: var(--trn-mono); font-size: 19px; font-weight: 850; color: var(--trn-text); line-height: 1.1; }
.alh-meter-lab { font-size: 11px; color: var(--trn-text-muted); white-space: nowrap; }

.alh-mix { display: flex; flex-direction: column; gap: 9px; border-left: 1px solid var(--trn-border-soft); padding-left: 22px; }
.alh-mix-head { display: flex; align-items: center; justify-content: space-between; }
.alh-mix-title { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--trn-text-muted); }
.alh-mix-total { font-size: 11px; font-weight: 700; color: var(--trn-text-dim); }
.alh-mix-bar { display: flex; height: 10px; border-radius: 999px; overflow: hidden; background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.alh-mix-seg { height: 100%; background: var(--c); transition: width 1s var(--trn-spring) 0.3s; box-shadow: inset 0 0 0 1px color-mix(in srgb, #000 8%, transparent); }
.alh-mix-seg + .alh-mix-seg { border-left: 1.5px solid var(--trn-canvas); }
.alh-mix-legend { display: flex; flex-wrap: wrap; gap: 10px; }
.alh-mix-leg { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--trn-text-muted); }
.alh-mix-leg b { color: var(--trn-text); font-weight: 700; }
.alh-mix-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c); box-shadow: 0 0 7px var(--c); }

@keyframes alh-drift { 0% { transform: translate3d(-3%, -2%, 0) scale(1); } 100% { transform: translate3d(4%, 3%, 0) scale(1.07); } }
@keyframes alh-breathe { 0%, 100% { opacity: 0.45; transform: scale(0.93); } 50% { opacity: 0.85; transform: scale(1.07); } }

@media (max-width: 900px) {
  .alh-top { flex-direction: column-reverse; align-items: stretch; gap: 16px; }
  .alh-dial { margin: 0 auto; }
  .alh-search, .alh-filter { width: 100%; flex: 1 1 100%; }
  .alh-bottom { grid-template-columns: 1fr; }
  .alh-mix { border-left: 0; padding-left: 0; border-top: 1px solid var(--trn-border-soft); padding-top: 16px; }
  .alh-meters { grid-template-columns: repeat(2, 1fr); }
}
@media (prefers-reduced-motion: reduce) {
  .alh-aurora, .alh-dial-aura { animation: none !important; }
  .alh-gfill, .alh-mix-seg, .alh-meter { transition: none !important; }
}
</style>
