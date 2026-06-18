<template>
  <Motion as="section" class="smh" ref="rootRef"
    :initial="reduced ? false : { opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
    <!-- ── ambient layers ── -->
    <span class="smh-aurora" aria-hidden="true" />
    <span class="trn-spotlight" aria-hidden="true" />
    <span class="trn-grain" aria-hidden="true" />
    <span class="smh-stars" aria-hidden="true">
      <i v-for="s in stars" :key="s.i" :style="s.style" />
    </span>

    <div class="smh-top">
      <!-- ── lead ── -->
      <div class="smh-lead">
        <span class="smh-eyebrow">
          <Telescope :size="13" /> Competency Observatory
        </span>
        <h1 class="smh-title">Skill&nbsp;Matrix</h1>
        <p class="smh-sub">Every competency mapped to a star — coverage brightens, gaps ring red.</p>

        <div class="smh-tools">
          <div class="smh-dept">
            <TrnSelect :model-value="deptId" @update:modelValue="$emit('update:deptId', $event)"
              :options="deptOptions" searchable search-placeholder="Find a department…"
              placeholder="All departments" />
          </div>
          <Motion as="button" class="trn-btn trn-btn-ghost" type="button"
            :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="$emit('manage')">
            <Library :size="15" /> Manage skills
          </Motion>
          <Motion as="button" class="trn-btn trn-btn-primary" type="button"
            :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="$emit('assess')">
            <Plus :size="15" /> Assess competency
          </Motion>
        </div>
      </div>

      <!-- ── mastery orbit ── -->
      <div class="smh-orbit">
        <div class="smo" :style="{ '--arc-c': arcColor }">
          <span class="smo-aura" aria-hidden="true" />
          <svg class="smo-svg" :viewBox="`0 0 ${SZ} ${SZ}`" aria-hidden="true">
            <circle class="smo-track" :cx="C" :cy="C" :r="R" fill="none" :stroke-width="STROKE" />
            <circle class="smo-arc" :cx="C" :cy="C" :r="R" fill="none" :stroke-width="STROKE"
              stroke-linecap="round" :stroke-dasharray="CIRC"
              :stroke-dashoffset="visible ? arcOffset : CIRC"
              :transform="`rotate(-90 ${C} ${C})`" />
            <!-- arc-tip comet -->
            <circle v-if="visible" class="smo-comet" :r="STROKE / 2 - 1"
              :cx="tip.x" :cy="tip.y" />
            <!-- satellite riding the inner track -->
            <g class="smo-sat-orbit">
              <circle class="smo-sat" :cx="C" :cy="C - R" :r="3.2" />
            </g>
          </svg>
          <div class="smo-center">
            <span class="smo-val"><TrnCountUp :value="masteryPct" :suffix="'%'" :duration="1.6" /></span>
            <span class="smo-lab">Mastery</span>
            <span class="smo-foot trn-mono">{{ metCount }}/{{ total }} meet bar</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── metric capsules ── -->
    <div class="smh-metrics">
      <Motion v-for="(m, i) in metrics" :key="m.key" as="div" class="smh-cap" :class="{ danger: m.danger }"
        :style="{ '--c': m.color }"
        :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.5, delay: 0.12 + i * 0.07, ease: [0.16, 1, 0.3, 1] }"
        :whileHover="{ y: -3 }">
        <span class="smh-cap-rail" aria-hidden="true" />
        <span class="smh-cap-ic"><component :is="m.icon" :size="16" /></span>
        <div class="smh-cap-body">
          <strong class="smh-cap-val">
            <TrnCountUp :value="m.value" :decimals="m.decimals || 0" />
          </strong>
          <span class="smh-cap-eyebrow trn-mono">{{ m.label }}</span>
        </div>
        <span class="smh-cap-foot">{{ m.foot }}</span>
      </Motion>
    </div>

    <!-- ── proficiency distribution ── -->
    <div class="smh-bands" ref="bandsRef" :class="{ 'is-in': bandsIn }">
      <div class="smh-bands-head">
        <span class="smh-bands-title trn-mono">Proficiency spread</span>
        <span class="smh-bands-total">{{ bandTotal }} assessed cells</span>
      </div>
      <div class="smh-bar">
        <span v-for="(b, i) in shownBands" :key="b.key" class="smh-seg"
          :style="{ width: bandsIn ? b.pct + '%' : '0%', background: b.color, transitionDelay: (i * 0.1) + 's' }"
          :title="`${b.label}: ${b.value}`" />
        <span v-if="!bandTotal" class="smh-seg-empty" />
      </div>
      <ul class="smh-band-legend">
        <li v-for="b in BANDS" :key="b.key">
          <span class="smh-band-dot" :style="{ background: b.color }" />
          <span class="smh-band-name">{{ b.label }}</span>
          <span class="smh-band-n trn-mono">{{ bandCounts[b.key] || 0 }}</span>
        </li>
      </ul>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Telescope, Library, Plus, Users, Grid3x3, Layers, TrendingDown } from 'lucide-vue-next'
import TrnSelect from './TrnSelect.vue'
import TrnCountUp from './TrnCountUp.vue'
import { prefersReduced, usePointerSpotlight, useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  masteryPct: { type: Number, default: 0 },
  metCount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  gapCount: { type: Number, default: 0 },
  gapShare: { type: Number, default: 0 },
  peopleCount: { type: Number, default: 0 },
  skillCount: { type: Number, default: 0 },
  avgGap: { type: Number, default: 0 },
  bandCounts: { type: Object, default: () => ({}) }, // { emerging, developing, proficient, mastery }
  departments: { type: Array, default: () => [] },
  deptId: { type: [String, null], default: '' },
})
defineEmits(['update:deptId', 'manage', 'assess'])

const reduced = prefersReduced()
const rootRef = ref(null)
usePointerSpotlight(rootRef)
const { visible } = useInView(rootRef, { threshold: 0.2 })

const bandsRef = ref(null)
const { visible: bandsIn } = useInView(bandsRef, { threshold: 0.3 })

// ── orbit geometry ──────────────────────────────────────────────────────────
const SZ = 184
const C = SZ / 2
const STROKE = 13
const R = C - STROKE / 2 - 4
const CIRC = 2 * Math.PI * R
const arcOffset = computed(() => CIRC * (1 - Math.max(0, Math.min(100, props.masteryPct)) / 100))
// arc tip coordinates (angle from top, clockwise)
const tip = computed(() => {
  const frac = Math.max(0, Math.min(100, props.masteryPct)) / 100
  const ang = -Math.PI / 2 + frac * Math.PI * 2
  return { x: C + R * Math.cos(ang), y: C + R * Math.sin(ang) }
})
const arcColor = computed(() =>
  props.masteryPct >= 80 ? 'var(--trn-st-completed)'
    : props.masteryPct >= 50 ? 'var(--trn-amber)'
      : 'var(--trn-ember)')

// ── metric capsules ─────────────────────────────────────────────────────────
const metrics = computed(() => [
  { key: 'people', label: 'People', value: props.peopleCount, icon: Users, color: 'var(--trn-amber)', foot: 'in the matrix' },
  { key: 'skills', label: 'Skills', value: props.skillCount, icon: Layers, color: 'var(--trn-amber-strong)', foot: 'tracked competencies' },
  { key: 'cells', label: 'Cells', value: props.total, icon: Grid3x3, color: 'var(--trn-star)', foot: 'data points mapped' },
  { key: 'gaps', label: 'Open gaps', value: props.gapCount, icon: TrendingDown, color: 'var(--trn-st-failed)', foot: `${props.gapShare}% of cells`, danger: props.gapCount > 0 },
])

// ── proficiency bands ─────────────────────────────────────────────────────────
const BANDS = [
  { key: 'emerging', label: 'Emerging', color: 'var(--trn-heat-1)' },
  { key: 'developing', label: 'Developing', color: 'var(--trn-heat-2)' },
  { key: 'proficient', label: 'Proficient', color: 'var(--trn-heat-3)' },
  { key: 'mastery', label: 'Mastery', color: 'var(--trn-heat-4)' },
]
const bandTotal = computed(() => BANDS.reduce((a, b) => a + (Number(props.bandCounts[b.key]) || 0), 0))
const shownBands = computed(() => {
  const t = bandTotal.value || 1
  return BANDS
    .map(b => ({ ...b, value: Number(props.bandCounts[b.key]) || 0 }))
    .filter(b => b.value > 0)
    .map(b => ({ ...b, pct: (b.value / t) * 100 }))
})

// ── dept dropdown ─────────────────────────────────────────────────────────────
const deptOptions = computed(() => [
  { value: '', label: 'All departments' },
  ...(props.departments || []).map(d => ({ value: d.id, label: d.name })),
])

// ── decorative starfield (deterministic) ──────────────────────────────────────
const stars = Array.from({ length: 18 }, (_, i) => {
  const a = (i * 2654435761) % 1000 / 1000
  const b = (i * 40503) % 1000 / 1000
  const c = (i * 73856093) % 1000 / 1000
  return {
    i,
    style: {
      left: (6 + a * 88) + '%',
      top: (8 + b * 80) + '%',
      animationDelay: (c * 4).toFixed(2) + 's',
      animationDuration: (2.6 + c * 3).toFixed(2) + 's',
      opacity: 0.3 + b * 0.5,
    },
  }
})
</script>

<style scoped>
.smh {
  position: relative; overflow: hidden; isolation: isolate;
  border-radius: 24px; padding: 26px 28px 24px;
  border: 1px solid var(--trn-border-soft);
  background:
    var(--trn-grad-hero),
    var(--trn-surf-card);
  box-shadow: var(--trn-card-shadow);
}
.smh-aurora {
  position: absolute; inset: -40% -20% auto -20%; height: 90%; z-index: 0; pointer-events: none;
  background:
    radial-gradient(60% 70% at 78% 10%, color-mix(in srgb, var(--trn-amber) 22%, transparent), transparent 60%),
    radial-gradient(50% 60% at 20% 0%, color-mix(in srgb, var(--trn-ember) 16%, transparent), transparent 60%);
  filter: blur(10px); opacity: 0.85;
  animation: smh-drift 16s ease-in-out infinite alternate;
}
.smh-stars { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
.smh-stars i { position: absolute; width: 3px; height: 3px; border-radius: 50%;
  background: var(--trn-starfield); box-shadow: 0 0 6px var(--trn-starfield);
  animation: trn-twinkle 3s ease-in-out infinite; }

.smh-top { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 28px; }

/* lead */
.smh-lead { min-width: 0; }
.smh-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--trn-mono);
  font-size: 11px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--trn-amber-strong); }
.smh-eyebrow :deep(svg) { color: var(--trn-amber); }
.smh-title { margin: 9px 0 0; font-size: 34px; font-weight: 850; letter-spacing: -0.03em; line-height: 1;
  color: var(--trn-text);
  background: linear-gradient(120deg, var(--trn-text) 30%, var(--trn-amber-strong));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.smh-sub { margin: 10px 0 0; font-size: 13px; color: var(--trn-text-muted); max-width: 44ch; }
.smh-tools { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 18px; }
.smh-dept { width: 210px; }

/* orbit */
.smh-orbit { flex-shrink: 0; display: grid; place-items: center; }
.smo { position: relative; width: 184px; height: 184px; }
.smo-aura { position: absolute; inset: 18px; border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--arc-c) 30%, transparent), transparent 68%);
  animation: smo-breathe 5s ease-in-out infinite; }
.smo-svg { position: relative; width: 100%; height: 100%; display: block; }
.smo-track { stroke: var(--trn-border-strong); opacity: 0.4; }
.smo-arc { stroke: var(--arc-c); transition: stroke-dashoffset 1.5s var(--trn-spring);
  filter: drop-shadow(0 0 6px color-mix(in srgb, var(--arc-c) 60%, transparent)); }
.smo-comet { fill: #fff; opacity: 0.95; filter: drop-shadow(0 0 7px var(--arc-c)); }
[data-theme="light"] .smo-comet { fill: var(--arc-c); }
.smo-sat-orbit { transform-origin: 92px 92px; animation: trn-orbit-spin 13s linear infinite; }
.smo-sat { fill: var(--trn-amber-bright); filter: drop-shadow(0 0 6px var(--trn-amber)); }
.smo-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
.smo-val { font-family: var(--trn-mono); font-size: 38px; font-weight: 850; line-height: 1; letter-spacing: -0.03em; color: var(--trn-text); }
.smo-lab { font-size: 9.5px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--trn-text-dim); }
.smo-foot { font-size: 10px; color: var(--trn-text-muted); margin-top: 4px; }

/* metric capsules */
.smh-metrics { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 22px; }
.smh-cap { position: relative; display: flex; align-items: center; gap: 12px; padding: 13px 15px 13px 17px;
  border-radius: 16px; border: 1px solid var(--trn-border-soft); background: var(--trn-surface);
  overflow: hidden; cursor: default; }
.smh-cap-rail { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--c);
  box-shadow: 0 0 12px -2px var(--c); }
.smh-cap-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 12px; flex-shrink: 0;
  color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--c) 26%, transparent); }
.smh-cap-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.smh-cap-val { font-family: var(--trn-mono); font-size: 23px; font-weight: 800; line-height: 1; color: var(--trn-text); }
.smh-cap.danger .smh-cap-val { color: var(--trn-st-failed); }
.smh-cap-eyebrow { font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--trn-text-dim); }
.smh-cap-foot { font-size: 10.5px; color: var(--trn-text-muted); text-align: right; max-width: 84px; line-height: 1.3; flex-shrink: 0; }

/* proficiency bands */
.smh-bands { position: relative; z-index: 1; margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--trn-border-soft);
  display: flex; flex-direction: column; gap: 11px; }
.smh-bands-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.smh-bands-title { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trn-text-dim); }
.smh-bands-total { font-size: 11px; color: var(--trn-text-muted); }
.smh-bar { display: flex; height: 14px; border-radius: 999px; overflow: hidden;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.smh-seg { height: 100%; width: 0; transition: width 1.1s var(--trn-spring); }
.smh-seg:not(:last-child) { border-right: 2px solid var(--trn-canvas); }
.smh-seg-empty { flex: 1; background: linear-gradient(90deg, var(--trn-border-soft), transparent); }
.smh-band-legend { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px 18px; }
.smh-band-legend li { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; }
.smh-band-dot { width: 9px; height: 9px; border-radius: 3px; flex-shrink: 0; }
.smh-band-name { color: var(--trn-text-secondary); }
.smh-band-n { font-weight: 700; color: var(--trn-text); }

@keyframes smh-drift { 0% { transform: translate3d(-3%, -2%, 0) scale(1); } 100% { transform: translate3d(4%, 3%, 0) scale(1.08); } }
@keyframes smo-breathe { 0%, 100% { opacity: 0.5; transform: scale(0.94); } 50% { opacity: 0.9; transform: scale(1.06); } }

@media (max-width: 880px) {
  .smh-top { flex-direction: column-reverse; align-items: stretch; gap: 16px; }
  .smh-orbit { justify-self: center; }
  .smh-metrics { grid-template-columns: repeat(2, 1fr); }
  .smh-dept { width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .smh-aurora, .smh-stars i, .smo-aura, .smo-sat-orbit { animation: none !important; }
  .smo-arc, .smh-seg { transition: none !important; }
}
</style>
