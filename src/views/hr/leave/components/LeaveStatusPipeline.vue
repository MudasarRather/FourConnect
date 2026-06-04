<template>
  <div class="pipe" :class="toneClass" :style="vars" role="group" aria-label="Leave approval pipeline">
    <svg class="pipe-line" viewBox="0 0 400 10" preserveAspectRatio="none" aria-hidden="true">
      <line x1="6" y1="5" x2="394" y2="5" class="pipe-track" />
      <Motion as="line" x1="6" y1="5" x2="394" y2="5" class="pipe-fill"
        :initial="{ pathLength: 0 }"
        :animate="{ pathLength: progress }"
        :transition="{ duration: 0.9, delay: 0.12, ease: [0.16, 1, 0.3, 1] }"
      />
    </svg>
    <ol class="pipe-stages" :style="{ gridTemplateColumns: `repeat(${stages.length}, 1fr)` }">
      <li v-for="(s, i) in stages" :key="i"
        class="pipe-stage"
        :data-state="stageState(i)"
        :data-type="s.type || ''"
      >
        <span class="pipe-dot">
          <Check v-if="stageState(i) === 'done'" :size="11" />
          <X v-else-if="stageState(i) === 'failed'" :size="11" />
          <SkipForward v-else-if="stageState(i) === 'skipped'" :size="10" />
          <span v-else class="pipe-dot-fill" />
        </span>
        <span class="pipe-label">{{ s.label }}</span>
      </li>
    </ol>
    <div v-if="failureNote" class="pipe-fail-note">
      <AlertTriangle :size="11" /> {{ failureNote }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Check, X, AlertTriangle, SkipForward } from 'lucide-vue-next'

const props = defineProps({
  status: { type: String, required: true },
  // Phase 4 — Optional snapshot of the leave's approval_steps array. When
  // provided the pipeline renders one dot per stage (label = step.label,
  // state derived from step.decision + current_step). When omitted the
  // component falls back to the legacy fixed 4-stage rendering.
  steps: { type: Array, default: null },
  currentStep: { type: Number, default: 0 },
  // Compact variant — used inside small request cards
  compact: { type: Boolean, default: false },
})

const failedStatuses = ['REJECTED', 'MANAGER_REJECTED', 'CANCELLED', 'WITHDRAWN']
const isFailed = computed(() => failedStatuses.includes(props.status))
const isApproved = computed(() => props.status === 'APPROVED')

// ─── Chain-aware (Phase 4) ───────────────────────────────────────────────
const isChainMode = computed(() => Array.isArray(props.steps) && props.steps.length > 0)

// ─── Legacy fixed stages ─────────────────────────────────────────────────
const LEGACY_STAGES = [
  { label: 'Submitted' },
  { label: 'Manager' },
  { label: 'HR' },
  { label: 'Approved' },
]
const legacyCurrentIndex = () => {
  const s = props.status
  if (s === 'DRAFT') return 0
  if (s === 'PENDING_MANAGER' || s === 'MANAGER_REJECTED' || s === 'WITHDRAWN') return 1
  if (s === 'PENDING_HR' || s === 'REJECTED') return 2
  if (s === 'APPROVED') return 3
  if (s === 'CANCELLED') return 3
  return 0
}

// Build the stage descriptor list for both modes.
const stages = computed(() => {
  if (isChainMode.value) {
    return props.steps.map(s => ({ label: s.label, type: s.approver_type }))
  }
  return LEGACY_STAGES
})

const currentIndex = computed(() => isChainMode.value ? Math.min(props.currentStep ?? 0, stages.value.length) : legacyCurrentIndex())

const progress = computed(() => {
  if (isApproved.value) return 1
  const max = Math.max(1, stages.value.length - 1)
  return Math.max(0, Math.min(1, currentIndex.value / max))
})

const stageState = (i) => {
  if (isChainMode.value) {
    const step = props.steps[i]
    const dec = step?.decision
    if (dec === 'APPROVED') return 'done'
    if (dec === 'REJECTED') return 'failed'
    if (dec === 'SKIPPED') return 'skipped'
    if (i === currentIndex.value && !isFailed.value && !isApproved.value) return 'active'
    if (isApproved.value && i < currentIndex.value) return 'done'
    return 'idle'
  }
  // Legacy
  const cur = currentIndex.value
  if (isApproved.value) return i <= cur ? 'done' : 'idle'
  if (isFailed.value && i === cur) return 'failed'
  if (i < cur) return 'done'
  if (i === cur && !isFailed.value) return 'active'
  return 'idle'
}

const toneClass = computed(() => {
  if (isApproved.value) return 'tone-approved'
  if (isFailed.value) return 'tone-failed'
  return 'tone-active'
})
const vars = computed(() => ({}))

const failureNote = computed(() => {
  if (props.status === 'MANAGER_REJECTED') return 'Manager declined'
  if (props.status === 'REJECTED') return 'Declined'
  if (props.status === 'CANCELLED') return 'Cancelled'
  if (props.status === 'WITHDRAWN') return 'Withdrawn by employee'
  return ''
})
</script>

<style scoped>
.pipe {
  position: relative;
  --pipe-track: rgba(255, 255, 255, 0.08);
  --pipe-fill: var(--leave-pending-mgr);
  --pipe-dot-idle: rgba(255, 255, 255, 0.10);
  --pipe-dot-active: var(--leave-pending-mgr);
  --pipe-dot-done: var(--leave-approved);
  --pipe-dot-failed: var(--leave-rejected);
  display: flex; flex-direction: column; gap: 4px;
}
.pipe.tone-approved { --pipe-fill: var(--leave-approved); --pipe-dot-active: var(--leave-approved); }
.pipe.tone-failed   { --pipe-fill: var(--leave-rejected); }

[data-theme="light"] .pipe {
  --pipe-track: rgba(120, 53, 15, 0.14);
  --pipe-dot-idle: rgba(120, 53, 15, 0.10);
}

.pipe-line { position: absolute; left: 0; right: 0; top: 11px; height: 10px; width: 100%; pointer-events: none; }
.pipe-track { stroke: var(--pipe-track); stroke-width: 2; stroke-linecap: round; }
.pipe-fill  { stroke: var(--pipe-fill);  stroke-width: 3; stroke-linecap: round;
              filter: drop-shadow(0 0 4px color-mix(in srgb, var(--pipe-fill) 50%, transparent)); }

.pipe-stages {
  position: relative; z-index: 1;
  display: grid; grid-template-columns: repeat(4, 1fr);
  list-style: none; margin: 0; padding: 0;
  align-items: start;
}
.pipe-stage { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.pipe-dot {
  position: relative;
  width: 18px; height: 18px; border-radius: 50%;
  display: grid; place-items: center;
  background: var(--pipe-dot-idle);
  color: rgba(255, 255, 255, 0.55);
  border: 1px solid var(--pipe-dot-idle);
  transition: background .3s, color .3s, transform .25s;
}
.pipe-dot-fill { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

.pipe-stage[data-state="done"] .pipe-dot {
  background: var(--pipe-dot-done); color: #fff; border-color: var(--pipe-dot-done);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--pipe-dot-done) 14%, transparent);
}
.pipe-stage[data-state="active"] .pipe-dot {
  background: var(--pipe-dot-active); color: #fff; border-color: var(--pipe-dot-active);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--pipe-dot-active) 18%, transparent);
  animation: pipe-pulse 1.8s ease-in-out infinite;
}
.pipe-stage[data-state="failed"] .pipe-dot {
  background: var(--pipe-dot-failed); color: #fff; border-color: var(--pipe-dot-failed);
}
.pipe-stage[data-state="skipped"] .pipe-dot {
  background: rgba(180, 83, 9, 0.18); color: #fcd34d; border-color: rgba(180, 83, 9, 0.50);
}
.pipe-stage[data-state="skipped"] .pipe-label { color: #b45309; opacity: 0.78; }

/* Subtle accent per chain approver type — keeps long chains readable */
.pipe-stage[data-type="USER"][data-state="active"] .pipe-dot {
  background: #b45309; border-color: #b45309;
  box-shadow: 0 0 0 3px color-mix(in srgb, #b45309 18%, transparent);
}
.pipe-stage[data-type="USER"][data-state="active"] .pipe-label { color: #fcd34d; }
.pipe-stage[data-type="MANAGER"][data-state="active"] .pipe-dot {
  background: #fbbf24; border-color: #fbbf24;
  box-shadow: 0 0 0 3px color-mix(in srgb, #fbbf24 18%, transparent);
}
.pipe-stage[data-type="MANAGER"][data-state="active"] .pipe-label { color: #fcd34d; }
@keyframes pipe-pulse {
  0%, 100% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--pipe-dot-active) 18%, transparent); transform: scale(1); }
  50%      { box-shadow: 0 0 0 8px color-mix(in srgb, var(--pipe-dot-active)  0%, transparent); transform: scale(1.08); }
}

.pipe-label {
  font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.10em; text-transform: uppercase;
  color: var(--hr-text-muted);
}
.pipe-stage[data-state="active"] .pipe-label { color: var(--pipe-dot-active); }
.pipe-stage[data-state="done"]   .pipe-label { color: var(--pipe-dot-done); }
.pipe-stage[data-state="failed"] .pipe-label { color: var(--pipe-dot-failed); }

.pipe-fail-note {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 10.5px; font-weight: 700;
  color: var(--leave-rejected);
  padding: 2px 8px; border-radius: 999px;
  background: var(--leave-rejected-soft);
  align-self: flex-start;
  margin-top: 2px;
}
</style>
