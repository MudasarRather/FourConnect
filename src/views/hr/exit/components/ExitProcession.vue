<template>
  <Motion ref="rootRef" as="div" class="ex-proc" :class="`mode-${mode}`"
    :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
    <span class="proc-spot" aria-hidden="true" />
    <span class="proc-grid" aria-hidden="true" />
    <span v-if="!reduced" class="proc-sheen" aria-hidden="true" />

    <svg class="proc-svg" :viewBox="`0 0 ${W} ${HGT}`" preserveAspectRatio="xMidYMid meet"
      role="img" aria-label="Exit procession">
      <defs>
        <linearGradient id="exProcTrack" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#fcd34d" />
          <stop offset="55%" stop-color="#fb923c" />
          <stop offset="100%" stop-color="#fb923c" />
        </linearGradient>
        <linearGradient id="exProcDone" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#fbbf24" />
          <stop offset="100%" stop-color="#34d399" />
        </linearGradient>
      </defs>

      <!-- horizon baseline -->
      <line :x1="padX" :y1="baseY" :x2="W - padX" :y2="baseY" class="proc-base" />
      <!-- drawn progress track (single mode) -->
      <line v-if="mode === 'single'" :x1="padX" :y1="baseY" :x2="progressX" :y2="baseY"
        class="proc-fill" :class="{ drawn: visible }" />
      <!-- continuous light runner riding the baseline (the flow) -->
      <circle v-if="!reduced" class="proc-runner" cx="0" cy="0" r="3"
        :style="{ offsetPath: baselinePath }" />

      <!-- gate posts -->
      <g v-for="(s, i) in nodes" :key="s.key" class="proc-gate"
        :class="{ done: s.done, current: s.current, blocked: s.blocked }"
        @click="$emit('pick', s.key)" role="button" tabindex="0">
        <rect :x="s.x - 4" :y="baseY - postH(s)" width="8" :height="postH(s)" rx="3"
          class="gate-post" :style="postStyle(s)" />
        <circle :cx="s.x" :cy="baseY - postH(s) - 9" :r="s.current ? 6 : 5" class="gate-lamp"
          :style="{ '--c': s.color }" />
        <text v-if="mode === 'cohort'" :x="s.x" :y="baseY - postH(s) - 20" class="gate-count">{{ s.count }}</text>
        <text :x="s.x" :y="baseY + 18" class="gate-label">{{ s.short }}</text>
        <text :x="s.x" :y="baseY + 30" class="gate-num">{{ String(i + 1).padStart(2, '0') }}</text>
      </g>

      <!-- walking figure (single mode) rides to current -->
      <g v-if="mode === 'single' && !reduced && figureX != null" class="proc-figure" :style="{ '--fx': figureX + 'px' }">
        <circle :cx="0" :cy="baseY - 16" r="3.4" />
        <line :x1="0" :y1="baseY - 13" :x2="0" :y2="baseY - 5" />
        <line :x1="-3" :y1="baseY - 10" :x2="3" :y2="baseY - 10" />
      </g>
    </svg>
  </Motion>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { Motion } from 'motion-v'
import { EXIT_STAGES } from '@/composables/useExit'
import { prefersReduced, usePointerSpotlight, useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  mode: { type: String, default: 'cohort' },          // cohort | single
  counts: { type: Object, default: () => ({}) },        // cohort: { stageKey: n }
  state: { type: Object, default: null },               // single: from exitStageState()
})
defineEmits(['pick'])

const reduced = prefersReduced()
const rootRef = ref(null)
usePointerSpotlight(rootRef)
const { visible } = useInView(rootRef, { threshold: 0.25 })

// draw-on gate: posts rise from the baseline once the instrument is in view
const grown = ref(reduced)
watch(visible, (v) => { if (v) grown.value = true }, { immediate: true })

const W = 920, HGT = 150, padX = 46, baseY = 96
const baselinePath = `path('M ${padX} ${baseY} L ${W - padX} ${baseY}')`
const SHORT = {
  resignation: 'Resign', approval: 'Approve', notice: 'Notice', handover: 'Handover',
  interview: 'Interview', clearance: 'Clearance', assets: 'Assets', settlement: 'F&F',
  experience: 'Exp.', relieving: 'Relieve', archived: 'Archive',
}

const nodes = computed(() => {
  const n = EXIT_STAGES.length
  const span = W - padX * 2
  const maxCount = Math.max(1, ...EXIT_STAGES.map(s => Number(props.counts[s.key] || 0)))
  const st = props.state || { done: {}, currentIndex: -1, blocked: {} }
  return EXIT_STAGES.map((s, i) => {
    const x = padX + (n === 1 ? 0 : (span * i) / (n - 1))
    const count = Number(props.counts[s.key] || 0)
    const done = props.mode === 'single' ? !!st.done?.[s.key] : count > 0
    const current = props.mode === 'single' && i === st.currentIndex && !st.closed
    const blocked = props.mode === 'single' && !!st.blocked?.[s.key]
    const ratio = props.mode === 'cohort' ? count / maxCount : (done ? 1 : current ? 0.7 : 0.4)
    const color = blocked ? 'var(--ex-blocked)' : done ? 'var(--ex-cleared)' : current ? 'var(--ex-violet)' : 'var(--ex-steel)'
    return { ...s, short: SHORT[s.key] || s.label, x, count, done, current, blocked, ratio, color }
  })
})

const postH = (s) => 18 + Math.round((grown.value ? (s.ratio || 0) : 0) * 44)
const postStyle = (s) => ({
  fill: s.done ? 'url(#exProcDone)' : s.current ? 'var(--ex-violet)' : s.blocked ? 'var(--ex-blocked)' : 'url(#exProcTrack)',
  opacity: s.done || s.current ? 1 : (props.mode === 'cohort' ? 0.35 + 0.5 * (s.ratio || 0) : 0.4),
})

const progressX = computed(() => {
  const st = props.state
  if (!st || st.currentIndex < 0) return padX
  const span = W - padX * 2
  const n = EXIT_STAGES.length
  return padX + (span * Math.max(0, st.currentIndex)) / (n - 1)
})
const figureX = computed(() => (props.mode === 'single' ? progressX.value : null))
</script>

<style scoped>
.ex-proc {
  position: relative; overflow: hidden; border-radius: 18px; padding: 6px 8px;
  background: var(--ex-surface); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow);
}
.proc-spot { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s; z-index: 2;
  background: radial-gradient(440px 220px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), rgba(251,146,60,0.12), transparent 60%); }
.proc-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(rgba(251,146,60,0.05) 1px, transparent 1px); background-size: 100% 26px; }
.proc-sheen { position: absolute; top: 0; bottom: 0; width: 28%; pointer-events: none; z-index: 1;
  background: linear-gradient(100deg, transparent, rgba(251,146,60,0.1), transparent);
  animation: ex-sheen-pass 6.5s ease-in-out infinite; }

.proc-svg { position: relative; z-index: 1; display: block; width: 100%; height: auto; }
.proc-base { stroke: var(--ex-border-strong); stroke-width: 1.4; }
.proc-fill { stroke: url(#exProcDone); stroke-width: 3; stroke-linecap: round;
  stroke-dasharray: 920; stroke-dashoffset: 920; }
.proc-fill.drawn { animation: ex-proc-grow 1.1s var(--ex-spring) forwards; }
@keyframes ex-proc-grow { to { stroke-dashoffset: 0; } }

.proc-runner { fill: var(--ex-amber-bright); filter: drop-shadow(0 0 5px var(--ex-amber)); offset-rotate: 0deg;
  animation: ex-proc-run 6s linear infinite; }
@keyframes ex-proc-run {
  0% { offset-distance: 0%; opacity: 0; }
  10% { opacity: 0.95; }
  90% { opacity: 0.95; }
  100% { offset-distance: 100%; opacity: 0; }
}

.proc-gate { cursor: pointer; }
.gate-post { transition: y 0.7s var(--ex-spring), height 0.7s var(--ex-spring), opacity 0.4s; }
.gate-lamp { fill: var(--c); filter: drop-shadow(0 0 5px var(--c)); transition: r 0.3s; }
.proc-gate.done .gate-lamp { animation: ex-gate-light 3.2s ease-in-out infinite; }
.proc-gate.current .gate-lamp { animation: ex-gate-light 1.8s ease-in-out infinite; }
.gate-count { fill: var(--ex-text); font-size: 13px; font-weight: 800; text-anchor: middle; font-variant-numeric: tabular-nums; }
.gate-label { fill: var(--ex-text-secondary); font-size: 9.5px; font-weight: 700; text-anchor: middle; letter-spacing: 0.04em; }
.gate-num { fill: var(--ex-text-dim); font-size: 8px; font-weight: 700; text-anchor: middle; }
.proc-gate:hover .gate-post { opacity: 1 !important; }
.proc-gate:hover .gate-label { fill: var(--ex-text); }
.proc-gate:hover .gate-lamp { filter: drop-shadow(0 0 9px var(--c)); }

.proc-figure { transform: translateX(var(--fx, 0)); transition: transform 1.2s var(--ex-spring); }
.proc-figure circle { fill: var(--ex-violet-bright); }
.proc-figure line { stroke: var(--ex-violet-bright); stroke-width: 1.6; stroke-linecap: round; }

@media (prefers-reduced-motion: reduce) {
  .proc-fill.drawn { animation: none; stroke-dashoffset: 0; }
  .proc-sheen, .proc-gate.done .gate-lamp, .proc-gate.current .gate-lamp, .proc-runner { animation: none; }
  .gate-post { transition: none; }
  .proc-figure { transition: none; }
}
</style>
