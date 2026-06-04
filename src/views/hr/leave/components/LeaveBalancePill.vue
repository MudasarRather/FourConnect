<template>
  <Motion as="article" class="bp" :class="{ 'is-low': isLow, 'is-empty': isEmpty }"
    :style="vars"
    :initial="{ opacity: 0, y: 12 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.45, delay: delay, ease: [0.16, 1, 0.3, 1] }"
    :whileHover="reduced ? {} : { y: -3, scale: 1.03 }"
  >
    <!-- Radial progress ring -->
    <svg class="bp-ring" viewBox="0 0 56 56" aria-hidden="true">
      <circle cx="28" cy="28" r="24" class="bp-ring-track" />
      <circle cx="28" cy="28" r="24" class="bp-ring-arc"
        :stroke-dasharray="circ"
        :stroke-dashoffset="dashOffset"
      />
    </svg>
    <span class="bp-icon">
      <LeaveTypeIcon :type="type" :size="14" />
    </span>
    <div class="bp-body">
      <div class="bp-value leave-mono">
        <span class="bp-num">{{ formattedBalance }}</span>
        <span class="bp-quota">/{{ formattedQuota }}</span>
      </div>
      <div class="bp-label">{{ label }}</div>
    </div>
    <transition name="bp-accrue">
      <div v-if="accrueDelta" class="bp-accrue-floater leave-mono">
        +{{ accrueDelta }}
      </div>
    </transition>
  </Motion>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import LeaveTypeIcon from './LeaveTypeIcon.vue'
import { typeMeta } from '@/composables/useLeaves'

const props = defineProps({
  type: { type: String, required: true },
  balance: { type: [Number, String], default: 0 },
  quota: { type: [Number, String], default: 0 },
  label: { type: String, default: '' },
  delay: { type: Number, default: 0 },
  accrueDelta: { type: [Number, String], default: null },
  reduced: { type: Boolean, default: false },
})

const meta = computed(() => typeMeta(props.type))
const vars = computed(() => ({ '--bp-c': meta.value.hex || 'var(--hr-accent-gold)' }))

const num = (v) => Number(v) || 0
const formattedBalance = computed(() => {
  const n = num(props.balance)
  return Number.isInteger(n) ? n : n.toFixed(1)
})
const formattedQuota = computed(() => {
  const n = num(props.quota)
  if (n <= 0) return '∞'
  return Number.isInteger(n) ? n : n.toFixed(1)
})

const circ = 2 * Math.PI * 24
const dashOffset = computed(() => {
  const q = num(props.quota)
  if (q <= 0) return circ
  const ratio = Math.max(0, Math.min(1, num(props.balance) / q))
  return circ * (1 - ratio)
})

const isLow = computed(() => {
  const q = num(props.quota); const b = num(props.balance)
  return q > 0 && b > 0 && b / q < 0.20
})
const isEmpty = computed(() => num(props.balance) <= 0 && num(props.quota) > 0)
</script>

<style scoped>
.bp {
  position: relative;
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px 10px 12px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--bp-c) 8%, var(--leave-surface));
  border: 1px solid color-mix(in srgb, var(--bp-c) 28%, transparent);
  min-width: 156px;
  color: var(--hr-text);
  isolation: isolate;
  overflow: hidden;
  transition: background .25s, border-color .25s;
}
.bp:hover { border-color: color-mix(in srgb, var(--bp-c) 50%, transparent); }
.bp::before {
  content: ''; position: absolute; inset: -40% -20% auto auto;
  width: 60%; height: 160%;
  background: radial-gradient(50% 50% at 50% 50%, color-mix(in srgb, var(--bp-c) 35%, transparent), transparent 70%);
  filter: blur(28px); opacity: 0.45; z-index: -1;
  pointer-events: none;
  animation: leave-glow-breathe 6s ease-in-out infinite;
}

.bp-ring {
  width: 38px; height: 38px; flex-shrink: 0;
  transform: rotate(-90deg);
}
.bp-ring-track { fill: none; stroke: color-mix(in srgb, var(--bp-c) 18%, transparent); stroke-width: 4; }
.bp-ring-arc {
  fill: none;
  stroke: var(--bp-c);
  stroke-width: 4;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.9s var(--leave-spring);
  filter: drop-shadow(0 0 4px color-mix(in srgb, var(--bp-c) 40%, transparent));
}
.bp-icon { position: absolute; left: 21px; top: 50%; transform: translate(-50%, -50%); pointer-events: none; }

.bp-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.bp-value {
  display: flex; align-items: baseline; gap: 2px;
  font-size: 18px; font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--hr-text);
  font-variant-numeric: tabular-nums;
}
.bp-num { color: var(--bp-c); }
.bp-quota { font-size: 11.5px; color: var(--hr-text-muted); font-weight: 700; }
.bp-label {
  font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.13em; text-transform: uppercase;
  color: var(--hr-text-muted);
}

.bp.is-low .bp-num { color: #fbbf24; }
.bp.is-empty .bp-num { color: var(--leave-cancelled); }

/* Accrual floater "+1.5" animation */
.bp-accrue-floater {
  position: absolute; right: 10px; top: 4px;
  font-size: 11px; font-weight: 800;
  color: var(--leave-approved);
  pointer-events: none;
}
.bp-accrue-enter-active { animation: leave-accrue-pop 1.2s ease-out both; }
</style>
