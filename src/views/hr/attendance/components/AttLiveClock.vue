<template>
  <div class="att-clock" :style="{ '--size': size + 'px' }">
    <svg :width="size" :height="size" viewBox="0 0 200 200" class="att-clock-svg" aria-hidden="true">
      <defs>
        <linearGradient :id="gradientId" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"  stop-color="#14b8a6" />
          <stop offset="55%" stop-color="#facc15" />
          <stop offset="100%" stop-color="#fb923c" />
        </linearGradient>
        <filter :id="glowId" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <!-- decorative outer ring -->
      <circle cx="100" cy="100" r="94" fill="none" stroke="rgba(20,184,166,0.12)" stroke-width="1" stroke-dasharray="2 4" class="att-clock-outer" />
      <!-- tick marks -->
      <g class="att-clock-ticks">
        <line v-for="n in 12" :key="n"
          :x1="100 + 86 * Math.cos((n - 1) * (Math.PI / 6) - Math.PI / 2)"
          :y1="100 + 86 * Math.sin((n - 1) * (Math.PI / 6) - Math.PI / 2)"
          :x2="100 + 92 * Math.cos((n - 1) * (Math.PI / 6) - Math.PI / 2)"
          :y2="100 + 92 * Math.sin((n - 1) * (Math.PI / 6) - Math.PI / 2)"
          stroke="rgba(94, 234, 212, 0.45)" stroke-width="1.5" stroke-linecap="round" />
      </g>
      <!-- bg track -->
      <circle cx="100" cy="100" :r="radius" fill="none" stroke="rgba(20, 184, 166, 0.18)" :stroke-width="stroke" />
      <!-- progress arc -->
      <circle
        ref="arcEl"
        cx="100" cy="100" :r="radius" fill="none"
        :stroke="`url(#${gradientId})`" :stroke-width="stroke"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
        :filter="`url(#${glowId})`"
        transform="rotate(-90 100 100)"
        class="att-clock-arc" />
    </svg>
    <div class="att-clock-center">
      <div class="att-clock-eyebrow">{{ eyebrow }}</div>
      <div class="att-clock-time">{{ formatted }}</div>
      <div class="att-clock-sub">{{ sub }}</div>
    </div>
    <span class="att-clock-pulse" aria-hidden="true" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, onUnmounted } from 'vue'
import { gsap } from 'gsap'

const props = defineProps({
  shiftStart: { type: [Date, String], default: null },
  shiftEnd:   { type: [Date, String], default: null },
  size:       { type: Number, default: 220 },
  stroke:     { type: Number, default: 12 },
  eyebrow:    { type: String, default: 'Shift remaining' },
  reduced:    { type: Boolean, default: false },
})

const radius = computed(() => 100 - props.stroke / 2 - 8)
const circumference = computed(() => 2 * Math.PI * radius.value)

// Random ids so multiple instances on the same page don't share <defs>.
const uid = Math.random().toString(36).slice(2, 8)
const gradientId = `attClockGrad-${uid}`
const glowId = `attClockGlow-${uid}`

const arcEl = ref(null)
const now = ref(new Date())
const timer = ref(null)

const _date = (v) => (v instanceof Date ? v : v ? new Date(v) : null)

const start = computed(() => _date(props.shiftStart))
const end   = computed(() => _date(props.shiftEnd))

const totalSeconds = computed(() => {
  if (!start.value || !end.value) return 0
  return Math.max(1, (end.value - start.value) / 1000)
})
const elapsedSeconds = computed(() => {
  if (!start.value) return 0
  return Math.max(0, (now.value - start.value) / 1000)
})
const remainingSeconds = computed(() => Math.max(0, totalSeconds.value - elapsedSeconds.value))
const progress = computed(() => Math.min(1, elapsedSeconds.value / totalSeconds.value))
const dashOffset = computed(() => circumference.value * (1 - progress.value))

const pad = (n) => String(Math.max(0, Math.floor(n))).padStart(2, '0')
const formatted = computed(() => {
  const s = remainingSeconds.value
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  return `${pad(h)}:${pad(m)}:${pad(sec)}`
})
const sub = computed(() => (start.value && end.value ? 'until clock-out' : 'no shift today'))

onMounted(() => {
  // Live tick
  timer.value = setInterval(() => { now.value = new Date() }, 1000)

  // One-shot GSAP sweep on mount
  if (!props.reduced && arcEl.value) {
    const target = dashOffset.value
    gsap.fromTo(arcEl.value,
      { strokeDashoffset: circumference.value },
      { strokeDashoffset: target, duration: 1.6, ease: 'power3.out' },
    )
  }
})
onBeforeUnmount(() => { if (timer.value) clearInterval(timer.value) })
onUnmounted(() => { if (timer.value) clearInterval(timer.value) })

watch([() => props.shiftStart, () => props.shiftEnd], () => {
  if (!props.reduced && arcEl.value) {
    gsap.fromTo(arcEl.value,
      { strokeDashoffset: circumference.value },
      { strokeDashoffset: dashOffset.value, duration: 1.0, ease: 'power3.out' },
    )
  }
})
</script>

<style scoped>
@import '../../../../styles/attendance-theme.css';

.att-clock {
  position: relative;
  width: var(--size); height: var(--size);
  display: inline-flex; align-items: center; justify-content: center;
  filter: drop-shadow(0 22px 60px rgba(20, 184, 166, 0.35));
}
.att-clock-svg { display: block; }
.att-clock-outer {
  transform-origin: 100px 100px;
  animation: att-ring-rotate 28s linear infinite;
}

.att-clock-center {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  text-align: center;
}
.att-clock-eyebrow {
  font-size: 10px; font-weight: 800; letter-spacing: 1.6px;
  text-transform: uppercase; color: var(--att-teal-100);
}
.att-clock-time {
  font-size: clamp(28px, calc(var(--size) * 0.16), 44px);
  font-weight: 800; letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  background: var(--att-gradient-hero);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 8px 24px rgba(251, 146, 60, 0.40));
}
.att-clock-sub {
  font-size: 10px; letter-spacing: 0.4px;
  color: var(--hr-text-muted);
}

.att-clock-pulse {
  position: absolute; top: 12px; right: 12px;
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--att-teal-100);
  box-shadow: 0 0 12px var(--att-teal-100);
}
.att-clock-pulse::after {
  content: ''; position: absolute; inset: -4px; border-radius: 50%;
  background: transparent; box-shadow: 0 0 0 0 rgba(94, 234, 212, 0.6);
  animation: att-live-pulse 2.2s ease-in-out infinite;
}

[data-theme="light"] .att-clock { filter: drop-shadow(0 22px 60px rgba(13, 148, 136, 0.30)); }
[data-theme="light"] .att-clock-eyebrow { color: var(--att-teal-400); }
[data-theme="light"] .att-clock-time {
  background: linear-gradient(110deg, var(--att-teal-400), var(--att-yellow-500), var(--att-orange-500));
  -webkit-background-clip: text; background-clip: text;
}
[data-theme="light"] .att-clock-pulse {
  background: var(--att-teal-400);
  box-shadow: 0 0 12px var(--att-teal-400);
}
</style>
