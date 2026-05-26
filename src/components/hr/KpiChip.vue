<template>
  <button
    type="button"
    class="kpi-chip hr-spotlight"
    :class="[`tone-${tone}`, { active, animate: ripple.show }]"
    @click="onClick"
    ref="chipEl"
  >
    <div class="kpi-icon-wrap" v-if="$slots.icon">
      <svg class="kpi-arc" viewBox="0 0 100 100" aria-hidden="true">
        <circle class="arc-track" cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="6" />
        <circle
          class="arc-fill"
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="url(#kpi-grad)"
          stroke-width="6"
          stroke-linecap="round"
          :stroke-dasharray="282"
          :stroke-dashoffset="arcOffset"
          transform="rotate(-90 50 50)"
        />
        <defs>
          <linearGradient id="kpi-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#fbbf24" />
            <stop offset="100%" stop-color="#fb923c" />
          </linearGradient>
        </defs>
      </svg>
      <span class="kpi-icon"><slot name="icon" /></span>
    </div>
    <div class="kpi-text">
      <span class="kpi-label">{{ label }}</span>
      <div class="kpi-value">
        <span class="kpi-num">{{ display }}</span>
        <span v-if="suffix" class="kpi-suffix">{{ suffix }}</span>
      </div>
      <span v-if="helper" class="kpi-helper">{{ helper }}</span>
    </div>

    <!-- Click ripple -->
    <span
      v-if="ripple.show"
      class="kpi-ripple"
      :style="{ left: ripple.x + 'px', top: ripple.y + 'px' }"
    />
  </button>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useCounter } from '../../composables/useCounter'
import { useSpotlight } from '../../composables/useSpotlight'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String], default: 0 },
  helper: { type: String, default: '' },
  suffix: { type: String, default: '' },
  tone: {
    type: String,
    default: 'neutral',
    validator: (v) => ['neutral', 'gold', 'green', 'orange', 'red', 'violet'].includes(v),
  },
  active: { type: Boolean, default: false },
  barTotal: { type: Number, default: 0 }, // when > 0, drives the conic arc fill
  animate: { type: Boolean, default: true },
})
const emit = defineEmits(['click'])

const chipEl = ref(null)
useSpotlight(chipEl)

const numericValue = computed(() => {
  const n = Number(props.value)
  return Number.isFinite(n) ? n : 0
})

const { current } = useCounter(numericValue, { duration: props.animate ? 800 : 0 })

const display = computed(() =>
  typeof props.value === 'string' ? props.value : current.value.toLocaleString()
)

const arcOffset = computed(() => {
  const total = props.barTotal || Math.max(1, numericValue.value)
  const pct = Math.min(1, numericValue.value / total)
  return Math.round(282 * (1 - pct))
})

const ripple = reactive({ show: false, x: 0, y: 0 })
const onClick = (e) => {
  const rect = chipEl.value?.getBoundingClientRect()
  if (rect) {
    ripple.x = e.clientX - rect.left
    ripple.y = e.clientY - rect.top
    ripple.show = false
    requestAnimationFrame(() => {
      ripple.show = true
      setTimeout(() => { ripple.show = false }, 460)
    })
  }
  emit('click', e)
}
</script>

<style scoped>
.kpi-chip {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 168px;
  height: 60px;
  padding: 0 16px 0 12px;
  border-radius: 14px;
  border: 1px solid var(--hr-border);
  background: var(--hr-surface);
  cursor: pointer;
  text-align: left;
  user-select: none;
  overflow: hidden;
  font-family: inherit;
  transition: transform 0.25s var(--hr-spring),
              border-color 0.2s,
              box-shadow 0.3s var(--hr-spring),
              background 0.25s var(--hr-spring);
  backdrop-filter: blur(18px) saturate(160%);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
}
.kpi-chip:hover {
  transform: translateY(-2px);
  border-color: var(--hr-accent-gold-border);
  box-shadow: 0 18px 40px -22px rgba(0, 0, 0, 0.8), 0 0 22px rgba(251, 191, 36, 0.10);
}

.kpi-icon-wrap {
  position: relative;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.08); /* arc-track color */
}
.kpi-arc {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.arc-track { stroke: rgba(255, 255, 255, 0.08); }
.arc-fill {
  transition: stroke-dashoffset 900ms var(--hr-spring);
}
.kpi-icon {
  position: relative;
  z-index: 1;
  display: inline-flex;
}

.kpi-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-width: 0;
}
.kpi-label {
  color: var(--hr-text-muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
}
.kpi-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
  color: var(--hr-text);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
  font-family: var(--hr-mono);
}
.kpi-suffix { color: var(--hr-text-muted); font-size: 12px; font-weight: 500; font-family: inherit; }
.kpi-helper { color: var(--hr-text-dim); font-size: 10px; }

/* Tones (icon colour) */
.kpi-chip.tone-gold .kpi-icon { color: var(--hr-accent-gold); }
.kpi-chip.tone-green .kpi-icon { color: var(--hr-active); }
.kpi-chip.tone-orange .kpi-icon { color: var(--hr-notice); }
.kpi-chip.tone-red .kpi-icon { color: var(--hr-suspended); }
.kpi-chip.tone-violet .kpi-icon { color: var(--hr-exited); }
.kpi-chip.tone-neutral .kpi-icon { color: var(--hr-text-secondary); }

/* Active = filter is applied */
.kpi-chip.active {
  border-color: var(--hr-accent-gold-border);
  background: linear-gradient(135deg, var(--hr-accent-gold-soft), transparent 70%);
  box-shadow: var(--hr-accent-gold-glow);
}
.kpi-chip.active .kpi-num { color: var(--hr-accent-gold); }

/* Ripple */
.kpi-ripple {
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: rgba(251, 191, 36, 0.35);
  pointer-events: none;
  transform: translate(-50%, -50%);
  animation: hr-ripple 440ms ease-out forwards;
}

/* ═══════════ LIGHT THEME ═══════════ */
[data-theme="light"] .kpi-chip {
  background: rgba(255, 250, 240, 0.78);
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .kpi-chip:hover {
  border-color: rgba(217, 119, 6, 0.42);
  box-shadow: 0 18px 40px -22px rgba(40, 25, 10, 0.32),
              0 0 22px rgba(217, 119, 6, 0.14);
}
[data-theme="light"] .arc-track { stroke: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .kpi-icon-wrap { color: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .kpi-label { color: #92400e; }
[data-theme="light"] .kpi-value { color: #1a1410; }
[data-theme="light"] .kpi-suffix { color: #6b5840; }
[data-theme="light"] .kpi-helper { color: #8d7b62; }
[data-theme="light"] .kpi-chip.tone-gold .kpi-icon { color: #b45309; }
[data-theme="light"] .kpi-chip.tone-green .kpi-icon { color: #047857; }
[data-theme="light"] .kpi-chip.tone-orange .kpi-icon { color: #c2410c; }
[data-theme="light"] .kpi-chip.tone-red .kpi-icon { color: #b91c1c; }
[data-theme="light"] .kpi-chip.tone-violet .kpi-icon { color: #7e22ce; }
[data-theme="light"] .kpi-chip.tone-neutral .kpi-icon { color: #44362a; }
[data-theme="light"] .kpi-chip.active {
  border-color: rgba(217, 119, 6, 0.45);
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.18), rgba(255, 250, 240, 0.62) 70%);
  box-shadow: 0 8px 22px -8px rgba(217, 119, 6, 0.32),
              0 0 24px rgba(217, 119, 6, 0.20);
}
[data-theme="light"] .kpi-chip.active .kpi-num { color: #b45309; }
</style>
