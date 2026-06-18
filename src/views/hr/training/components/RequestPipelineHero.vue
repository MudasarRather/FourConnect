<template>
  <Motion as="section" class="rph" ref="rootRef"
    :initial="reduced ? false : { opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
    <span class="rph-aurora" aria-hidden="true" />
    <span class="trn-spotlight" aria-hidden="true" />
    <span class="trn-grain" aria-hidden="true" />

    <div class="rph-top">
      <!-- lead -->
      <div class="rph-lead">
        <span class="rph-eyebrow"><GitPullRequestArrow :size="13" /> Approval Pipeline</span>
        <h1 class="rph-title">Requests</h1>
        <p class="rph-sub">Employee-initiated training requests in flight — from submission, through the approval chain, to enrolment.</p>

        <div class="rph-tools">
          <div class="rph-search">
            <Search :size="15" />
            <input :value="search" @input="$emit('update:search', $event.target.value)" placeholder="Search number, employee, program…" />
            <button v-if="search" class="rph-search-x" @click="$emit('update:search', '')" aria-label="Clear"><X :size="14" /></button>
          </div>
          <div class="rph-filter">
            <TrnSelect :model-value="statusFilter" @update:modelValue="$emit('update:statusFilter', $event)"
              :options="statusOptions" placeholder="All statuses" />
          </div>
          <Motion as="button" type="button" class="rph-chip" :class="{ on: needsDecisionOnly }"
            :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }"
            @click="$emit('update:needsDecisionOnly', !needsDecisionOnly)">
            <span class="rph-chip-pulse" :class="{ live: pending > 0 }" aria-hidden="true" />
            <Gavel :size="14" /> Needs my decision
            <span class="rph-chip-n trn-mono">{{ pending }}</span>
          </Motion>
        </div>
      </div>

      <!-- decision radar -->
      <div class="rph-radar" :class="{ 'is-in': visible }">
        <span class="rph-radar-aura" aria-hidden="true" />
        <span class="rph-radar-sweep" :class="{ live: pending > 0 }" aria-hidden="true" />
        <svg class="rph-radar-svg" :viewBox="`0 0 ${SZ} ${SZ}`" aria-hidden="true">
          <!-- grid rings + crosshair (mission-control motif) -->
          <circle class="rph-grid" :cx="C" :cy="C" :r="R" fill="none" />
          <circle class="rph-grid" :cx="C" :cy="C" :r="R * 0.66" fill="none" />
          <circle class="rph-grid" :cx="C" :cy="C" :r="R * 0.33" fill="none" />
          <line class="rph-grid" :x1="C" :y1="C - R" :x2="C" :y2="C + R" />
          <line class="rph-grid" :x1="C - R" :y1="C" :x2="C + R" :y2="C" />
          <!-- status ring -->
          <circle class="rph-track" :cx="C" :cy="C" :r="RING" fill="none" :stroke-width="STROKE" />
          <circle v-for="(s, i) in segments" :key="s.key" class="rph-seg"
            :cx="C" :cy="C" :r="RING" fill="none" :stroke-width="STROKE" stroke-linecap="round"
            :stroke="s.color" :transform="`rotate(${s.startDeg} ${C} ${C})`"
            :stroke-dasharray="visible ? `${s.dash} ${CIRC}` : `0 ${CIRC}`"
            :style="{ transitionDelay: (0.25 + i * 0.1) + 's', filter: `drop-shadow(0 0 5px color-mix(in srgb, ${s.color} 55%, transparent))` }" />
        </svg>
        <div class="rph-radar-center">
          <span class="rph-radar-val"><TrnCountUp :value="pending" :duration="1.5" /></span>
          <span class="rph-radar-lab">awaiting decision</span>
        </div>
      </div>
    </div>

    <!-- funnel pipeline -->
    <div class="rph-pipe" ref="pipeRef" :class="{ 'is-in': pipeIn }">
      <template v-for="(st, i) in stations" :key="st.key">
        <button type="button" class="rph-station" :class="{ active: statusFilter === st.status }"
          :style="{ '--c': st.color, transitionDelay: (i * 0.09) + 's' }"
          @click="$emit('update:statusFilter', statusFilter === st.status ? '' : st.status)">
          <span class="rph-station-ring" aria-hidden="true">
            <span class="rph-station-ic"><component :is="st.icon" :size="17" /></span>
          </span>
          <span class="rph-station-val"><TrnCountUp :value="st.value" :duration="1.3" /></span>
          <span class="rph-station-lab">{{ st.label }}</span>
          <span class="rph-station-hint">{{ st.hint }}</span>
        </button>
        <span v-if="i < stations.length - 1" class="rph-pipe-link" :style="{ '--c': stations[i + 1].color }" aria-hidden="true">
          <span class="rph-pipe-fill" />
          <span v-if="!reduced && stations[i + 1].value > 0" class="rph-packet" :style="{ animationDelay: (i * 0.6) + 's' }" />
        </span>
      </template>
    </div>

    <!-- outcome strip -->
    <div class="rph-outcomes">
      <button v-for="o in outcomes" :key="o.key" type="button" class="rph-outcome"
        :class="{ active: statusFilter === o.status }" :style="{ '--c': o.color }"
        @click="$emit('update:statusFilter', statusFilter === o.status ? '' : o.status)">
        <component :is="o.icon" :size="13" />
        <span class="rph-outcome-lab">{{ o.label }}</span>
        <span class="rph-outcome-n trn-mono">{{ o.value }}</span>
      </button>
      <div class="rph-flow">
        <span class="rph-flow-lab">Fulfilment rate</span>
        <div class="rph-flow-track"><span class="rph-flow-fill" :style="{ width: pipeIn ? fulfilRate + '%' : '0%' }" /></div>
        <span class="rph-flow-val trn-mono">{{ fulfilRate }}%</span>
      </div>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import {
  GitPullRequestArrow, Search, X, Gavel, Clock3, CircleCheck, GraduationCap,
  CornerUpLeft, Ban, CircleSlash, FilePen,
} from 'lucide-vue-next'
import TrnSelect from './TrnSelect.vue'
import TrnCountUp from './TrnCountUp.vue'
import { prefersReduced, usePointerSpotlight, useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  counts: { type: Object, default: () => ({}) }, // keyed by TrainingRequestStatus
  search: { type: String, default: '' },
  statusFilter: { type: String, default: '' },
  needsDecisionOnly: { type: Boolean, default: false },
})
defineEmits(['update:search', 'update:statusFilter', 'update:needsDecisionOnly'])

const reduced = prefersReduced()
const rootRef = ref(null)
usePointerSpotlight(rootRef)
const { visible } = useInView(rootRef, { threshold: 0.2 })
const pipeRef = ref(null)
const { visible: pipeIn } = useInView(pipeRef, { threshold: 0.3 })

const n = (k) => Number(props.counts[k]) || 0
const pending = computed(() => n('PENDING_APPROVAL'))

// ── radar donut: full status mix ─────────────────────────────────────────────
const SEG_DEFS = [
  { key: 'PENDING_APPROVAL', color: 'var(--trn-st-in-progress)' },
  { key: 'APPROVED', color: 'var(--trn-amber-strong)' },
  { key: 'FULFILLED', color: 'var(--trn-st-completed)' },
  { key: 'RETURNED', color: 'var(--trn-st-waived)' },
  { key: 'REJECTED', color: 'var(--trn-st-failed)' },
  { key: 'DRAFT', color: 'var(--trn-st-not-started)' },
  { key: 'CANCELLED', color: 'var(--trn-st-not-started)' },
]
const total = computed(() => SEG_DEFS.reduce((a, s) => a + n(s.key), 0))

const SZ = 190, C = SZ / 2, STROKE = 12, RING = C - STROKE / 2 - 6
const R = C - 8
const CIRC = 2 * Math.PI * RING
const GAP = 5
const segments = computed(() => {
  const t = total.value || 1
  let acc = 0
  return SEG_DEFS.map(s => {
    const count = n(s.key)
    const len = (count / t) * CIRC
    const startDeg = (acc / CIRC) * 360 - 90
    acc += len
    return { ...s, count, dash: Math.max(len - GAP, count > 0 ? 1 : 0), startDeg }
  }).filter(s => s.count > 0)
})

// ── funnel stations ──────────────────────────────────────────────────────────
const stations = computed(() => [
  { key: 'pending', status: 'PENDING_APPROVAL', label: 'Awaiting decision', hint: 'In the chain', icon: Clock3, color: 'var(--trn-st-in-progress)', value: n('PENDING_APPROVAL') },
  { key: 'approved', status: 'APPROVED', label: 'Approved', hint: 'Ready to fulfil', icon: CircleCheck, color: 'var(--trn-amber-strong)', value: n('APPROVED') },
  { key: 'fulfilled', status: 'FULFILLED', label: 'Enrolled', hint: 'Now in training', icon: GraduationCap, color: 'var(--trn-st-completed)', value: n('FULFILLED') },
])

const outcomes = computed(() => [
  { key: 'returned', status: 'RETURNED', label: 'Returned', icon: CornerUpLeft, color: 'var(--trn-st-waived)', value: n('RETURNED') },
  { key: 'rejected', status: 'REJECTED', label: 'Rejected', icon: Ban, color: 'var(--trn-st-failed)', value: n('REJECTED') },
  { key: 'draft', status: 'DRAFT', label: 'Draft', icon: FilePen, color: 'var(--trn-st-not-started)', value: n('DRAFT') },
  { key: 'cancelled', status: 'CANCELLED', label: 'Cancelled', icon: CircleSlash, color: 'var(--trn-st-not-started)', value: n('CANCELLED') },
])

// decided requests that converted into an enrolment
const fulfilRate = computed(() => {
  const decided = n('APPROVED') + n('FULFILLED') + n('REJECTED')
  if (!decided) return 0
  return Math.round((n('FULFILLED') / decided) * 100)
})

const statusOptions = computed(() => [
  { value: '', label: 'All statuses' },
  { value: 'PENDING_APPROVAL', label: 'Pending approval', dot: 'var(--trn-st-in-progress)' },
  { value: 'APPROVED', label: 'Approved', dot: 'var(--trn-amber-strong)' },
  { value: 'FULFILLED', label: 'Fulfilled', dot: 'var(--trn-st-completed)' },
  { value: 'RETURNED', label: 'Returned', dot: 'var(--trn-st-waived)' },
  { value: 'REJECTED', label: 'Rejected', dot: 'var(--trn-st-failed)' },
  { value: 'DRAFT', label: 'Draft', dot: 'var(--trn-st-not-started)' },
  { value: 'CANCELLED', label: 'Cancelled', dot: 'var(--trn-st-not-started)' },
])
</script>

<style scoped>
.rph { position: relative; overflow: hidden; isolation: isolate; border-radius: 24px; padding: 26px 28px 20px;
  border: 1px solid var(--trn-border-soft); background: var(--trn-grad-hero), var(--trn-surf-card); box-shadow: var(--trn-card-shadow); }
.rph-aurora { position: absolute; inset: -40% -20% auto -20%; height: 92%; z-index: 0; pointer-events: none;
  background:
    radial-gradient(56% 68% at 82% 6%, color-mix(in srgb, var(--trn-st-completed) 14%, transparent), transparent 60%),
    radial-gradient(54% 64% at 20% 0%, color-mix(in srgb, var(--trn-amber) 20%, transparent), transparent 60%);
  filter: blur(14px); opacity: 0.85; animation: rph-drift 18s ease-in-out infinite alternate; }

.rph-top { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 28px; }

.rph-lead { min-width: 0; flex: 1; }
.rph-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--trn-mono); font-size: 11px; font-weight: 600;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--trn-amber-strong); }
.rph-eyebrow :deep(svg) { color: var(--trn-amber); }
.rph-title { margin: 9px 0 0; font-size: 34px; font-weight: 850; letter-spacing: -0.03em; line-height: 1; color: var(--trn-text);
  background: linear-gradient(120deg, var(--trn-text) 34%, var(--trn-amber-strong)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.rph-sub { margin: 10px 0 0; font-size: 13px; color: var(--trn-text-muted); max-width: 48ch; }

.rph-tools { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 18px; }
.rph-search { display: flex; align-items: center; gap: 8px; padding: 0 10px 0 12px; border-radius: 12px; flex: 1; min-width: 230px;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); transition: border-color 0.2s, box-shadow 0.2s; }
.rph-search:focus-within { border-color: color-mix(in srgb, var(--trn-amber) 50%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--trn-amber) 14%, transparent); }
.rph-search :deep(svg) { color: var(--trn-text-dim); flex-shrink: 0; }
.rph-search input { flex: 1; min-width: 0; border: 0; background: transparent; padding: 9px 0; font: inherit; font-size: 13px; color: var(--trn-text); }
.rph-search input:focus { outline: none; }
.rph-search input::placeholder { color: var(--trn-text-dim); }
.rph-search-x { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; border: 0; cursor: pointer;
  background: var(--trn-surface-elevated); color: var(--trn-text-muted); flex-shrink: 0; }
.rph-search-x:hover { color: var(--trn-text); }
.rph-filter { width: 178px; }

.rph-chip { position: relative; display: inline-flex; align-items: center; gap: 7px; font: inherit; font-size: 12.5px; font-weight: 600;
  padding: 8px 12px; border-radius: 11px; cursor: pointer; color: var(--trn-text-secondary);
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); transition: all 0.22s var(--trn-spring); }
.rph-chip:hover { color: var(--trn-text); border-color: color-mix(in srgb, var(--trn-amber) 34%, transparent); }
.rph-chip.on { color: var(--trn-amber-strong); border-color: color-mix(in srgb, var(--trn-amber) 55%, transparent);
  background: color-mix(in srgb, var(--trn-amber) 13%, transparent); }
.rph-chip-n { font-size: 11px; font-weight: 800; padding: 1px 7px; border-radius: 999px; color: var(--trn-amber-strong);
  background: color-mix(in srgb, var(--trn-amber) 16%, transparent); }
.rph-chip-pulse { position: absolute; top: 7px; left: 7px; width: 6px; height: 6px; border-radius: 50%; background: var(--trn-st-in-progress); opacity: 0; }
.rph-chip-pulse.live { opacity: 1; animation: rph-pulse 1.9s ease-in-out infinite; }

/* radar */
.rph-radar { position: relative; flex-shrink: 0; width: 190px; height: 190px; display: grid; place-items: center; }
.rph-radar-aura { position: absolute; inset: 18px; border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--trn-st-in-progress) 22%, transparent), transparent 68%);
  animation: rph-breathe 5.6s ease-in-out infinite; }
.rph-radar-sweep { position: absolute; inset: 8px; border-radius: 50%; pointer-events: none; opacity: 0.55;
  background: conic-gradient(from 0deg, transparent 0deg, color-mix(in srgb, var(--trn-amber) 62%, transparent) 42deg, transparent 84deg);
  -webkit-mask: radial-gradient(circle, #000 0, #000 72%, transparent 74%); mask: radial-gradient(circle, #000 0, #000 72%, transparent 74%);
  mix-blend-mode: screen; }
.rph-radar-sweep.live { animation: trn-radar-sweep 4.5s linear infinite; }
[data-theme="light"] .rph-radar-sweep { mix-blend-mode: multiply; opacity: 0.4; }
.rph-radar-svg { position: relative; width: 100%; height: 100%; }
.rph-grid { stroke: var(--trn-grid-line); stroke-width: 1; }
.rph-track { stroke: var(--trn-border-strong); opacity: 0.4; }
.rph-seg { transition: stroke-dasharray 1.05s var(--trn-spring); }
.rph-radar-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; }
.rph-radar-val { font-family: var(--trn-mono); font-size: 42px; font-weight: 850; line-height: 1; letter-spacing: -0.03em; color: var(--trn-text); }
.rph-radar-lab { font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--trn-text-dim); }

/* funnel */
.rph-pipe { position: relative; z-index: 1; display: flex; align-items: center; gap: 0; margin-top: 22px; padding-top: 20px;
  border-top: 1px solid var(--trn-border-soft); }
.rph-station { flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 14px; border: 0;
  border-radius: 16px; cursor: pointer; background: transparent; opacity: 0; transform: translateY(10px);
  transition: opacity 0.5s var(--trn-spring), transform 0.5s var(--trn-spring), background 0.2s; }
.rph-pipe.is-in .rph-station { opacity: 1; transform: translateY(0); }
.rph-station:hover { background: var(--trn-surface); }
.rph-station.active { background: color-mix(in srgb, var(--c) 12%, transparent); }
.rph-station-ring { position: relative; display: grid; place-items: center; width: 50px; height: 50px; border-radius: 50%;
  color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); border: 1.5px solid color-mix(in srgb, var(--c) 32%, transparent);
  box-shadow: 0 0 16px -4px color-mix(in srgb, var(--c) 60%, transparent); }
.rph-station.active .rph-station-ring { animation: rph-ring-ping 2.2s ease-out infinite; }
.rph-station-val { font-family: var(--trn-mono); font-size: 22px; font-weight: 850; color: var(--trn-text); margin-top: 4px; }
.rph-station-lab { font-size: 12px; font-weight: 700; color: var(--trn-text-secondary); }
.rph-station-hint { font-size: 10px; color: var(--trn-text-dim); }

.rph-pipe-link { position: relative; flex: 1; min-width: 30px; height: 3px; border-radius: 999px; margin: 0 2px 38px; overflow: visible;
  background: var(--trn-border-strong); }
.rph-pipe-fill { position: absolute; inset: 0; border-radius: 999px; transform-origin: left; transform: scaleX(0);
  background: linear-gradient(90deg, color-mix(in srgb, var(--c) 30%, transparent), var(--c));
  transition: transform 0.8s var(--trn-spring) 0.4s; }
.rph-pipe.is-in .rph-pipe-fill { transform: scaleX(1); }
.rph-packet { position: absolute; top: 50%; width: 6px; height: 6px; border-radius: 50%; margin-top: -3px;
  background: #fff; box-shadow: 0 0 8px 2px var(--c); animation: rph-packet 2.6s var(--trn-ease) infinite; }
[data-theme="light"] .rph-packet { background: var(--c); }

/* outcomes */
.rph-outcomes { position: relative; z-index: 1; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
.rph-outcome { display: inline-flex; align-items: center; gap: 6px; font: inherit; font-size: 12px; font-weight: 600; padding: 6px 11px;
  border-radius: 999px; cursor: pointer; color: var(--trn-text-muted); background: var(--trn-surface); border: 1px solid var(--trn-border-soft);
  transition: all 0.2s; }
.rph-outcome :deep(svg) { color: var(--c); }
.rph-outcome:hover { color: var(--trn-text); border-color: color-mix(in srgb, var(--c) 38%, transparent); }
.rph-outcome.active { color: var(--c); border-color: color-mix(in srgb, var(--c) 50%, transparent); background: color-mix(in srgb, var(--c) 12%, transparent); }
.rph-outcome-n { font-weight: 800; color: var(--trn-text); }
.rph-flow { display: flex; align-items: center; gap: 9px; margin-left: auto; min-width: 220px; flex: 1; max-width: 320px; }
.rph-flow-lab { font-size: 11px; font-weight: 600; color: var(--trn-text-muted); white-space: nowrap; }
.rph-flow-track { flex: 1; height: 6px; border-radius: 999px; background: var(--trn-surface); border: 1px solid var(--trn-border-soft); overflow: hidden; }
.rph-flow-fill { display: block; height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, var(--trn-amber-strong), var(--trn-st-completed)); transition: width 1.1s var(--trn-spring) 0.5s; }
.rph-flow-val { font-size: 12.5px; font-weight: 800; color: var(--trn-text); }

@keyframes rph-drift { 0% { transform: translate3d(-3%, -2%, 0) scale(1); } 100% { transform: translate3d(4%, 3%, 0) scale(1.07); } }
@keyframes rph-breathe { 0%, 100% { opacity: 0.45; transform: scale(0.93); } 50% { opacity: 0.85; transform: scale(1.07); } }
@keyframes rph-pulse { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--trn-st-in-progress) 60%, transparent); } 50% { box-shadow: 0 0 0 5px transparent; } }
@keyframes rph-ring-ping { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--c) 45%, transparent); } 70%, 100% { box-shadow: 0 0 0 9px transparent; } }
@keyframes rph-packet { 0% { left: 2%; opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { left: 98%; opacity: 0; } }

@media (max-width: 880px) {
  .rph-top { flex-direction: column-reverse; align-items: stretch; gap: 16px; }
  .rph-radar { justify-self: center; margin: 0 auto; }
  .rph-search, .rph-filter, .rph-chip { width: 100%; flex: 1 1 100%; }
  .rph-pipe { flex-wrap: wrap; justify-content: center; gap: 8px; }
  .rph-pipe-link { flex: 1 1 40px; margin-bottom: 38px; }
  .rph-flow { margin: 8px 0 0; max-width: none; }
}
@media (prefers-reduced-motion: reduce) {
  .rph-aurora, .rph-radar-aura, .rph-radar-sweep, .rph-chip-pulse, .rph-packet, .rph-station.active .rph-station-ring { animation: none !important; }
  .rph-seg, .rph-pipe-fill, .rph-flow-fill, .rph-station { transition: none !important; }
}
</style>
