<template>
  <div class="onb-journey" :class="{ 'onb-animate': !reducedMotion }" ref="rootEl">
    <svg viewBox="0 0 1200 110" preserveAspectRatio="none" class="onb-journey-svg" aria-hidden="true">
      <defs>
        <linearGradient id="onbPathFlow" x1="0%" y1="50%" x2="100%" y2="50%" gradientUnits="userSpaceOnUse">
          <stop offset="0%"  stop-color="#fbbf24" stop-opacity="0.0" />
          <stop offset="40%" stop-color="#fbbf24" stop-opacity="0.85" />
          <stop offset="60%" stop-color="#fb923c" stop-opacity="0.95" />
          <stop offset="100%" stop-color="#f97316" stop-opacity="0.4" />
          <animate attributeName="x1" values="0%;200%" dur="3.6s" repeatCount="indefinite" />
          <animate attributeName="x2" values="100%;300%" dur="3.6s" repeatCount="indefinite" />
        </linearGradient>
        <filter id="onbGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <!-- Dim base path -->
      <path
        :d="pathD"
        fill="none"
        :stroke="`var(--onb-path-stroke)`"
        stroke-width="2"
        stroke-linecap="round"
      />
      <!-- Bright animated overlay (clipped by progress) -->
      <path
        ref="pathEl"
        :d="pathD"
        fill="none"
        stroke="url(#onbPathFlow)"
        stroke-width="3"
        stroke-linecap="round"
        filter="url(#onbGlow)"
        :stroke-dasharray="pathLength"
        :stroke-dashoffset="reducedMotion ? 0 : pathLength"
        class="onb-path-active"
      />
    </svg>

    <!-- Waypoints sit on top of the svg via absolute positioning -->
    <div class="onb-waypoints">
      <button
        v-for="(s, i) in stages"
        :key="s.key"
        class="onb-waypoint"
        :class="{
          'is-complete': s.is_complete,
          'is-current': s.is_active,
          'is-future': !s.is_active && !s.is_complete,
        }"
        :style="{ left: `${waypointPositions[i].x}%`, top: `${waypointPositions[i].y}%` }"
        @click="$emit('waypoint-click', s.key)"
        :data-magnetic="reducedMotion ? null : 'true'"
        :aria-label="`${s.label} stage`"
      >
        <span class="onb-waypoint-ring"></span>
        <span class="onb-waypoint-dot">
          <svg v-if="s.is_complete" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </span>
        <span class="onb-waypoint-label">{{ s.label }}</span>
        <span class="onb-waypoint-count" v-if="s.count > 0">{{ s.count }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  stages: { type: Array, required: true },
})
defineEmits(['waypoint-click'])

const rootEl = ref(null)
const pathEl = ref(null)
const pathLength = ref(1200)

// Smooth sine-undulating path
const pathD = 'M40,55 C180,28 280,82 460,55 S780,28 940,55 S1100,82 1160,55'

const waypointPositions = computed(() => {
  const n = props.stages.length || 7
  // Positions sampled from the path's x-coordinates roughly
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1)
    const x = 4 + t * 92 // % of width
    // sine-y matches the path undulation
    const y = 50 + 12 * Math.sin(t * Math.PI * 2)
    return { x, y }
  })
})

const reducedMotion = ref(false)
let mq

const drawIn = () => {
  if (!pathEl.value || reducedMotion.value) return
  const total = pathEl.value.getTotalLength()
  pathLength.value = total
  // Trigger CSS animation by toggling the dashoffset
  pathEl.value.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1)'
  pathEl.value.style.strokeDashoffset = total
  // Force reflow
  void pathEl.value.getBoundingClientRect()
  pathEl.value.style.strokeDashoffset = 0
}

onMounted(() => {
  mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotion.value = mq.matches
  const handler = (e) => { reducedMotion.value = e.matches }
  mq.addEventListener?.('change', handler)
  drawIn()
})
onBeforeUnmount(() => {
  // best-effort cleanup
  if (mq?.removeEventListener) mq.removeEventListener('change', () => {})
})
watch(() => props.stages, drawIn, { deep: true })
</script>

<style scoped>
.onb-journey {
  position: relative;
  width: 100%;
  height: 130px;
  margin-top: 6px;
}
.onb-journey-svg {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
}
.onb-waypoints {
  position: absolute; inset: 0;
  pointer-events: none;
}
.onb-waypoint {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: auto;
  background: none;
  border: 0;
  cursor: pointer;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: var(--hr-text);
  padding: 0;
  font: inherit;
  transition: transform .2s var(--hr-spring);
}
.onb-waypoint:hover { transform: translate(-50%, -52%) scale(1.04); }
.onb-waypoint-ring {
  position: absolute;
  top: -6px; left: 50%;
  width: var(--onb-waypoint-ring);
  height: var(--onb-waypoint-ring);
  border-radius: 50%;
  transform: translate(-50%, 0);
  border: 1.5px dashed rgba(251, 191, 36, 0.45);
  opacity: 0;
  transition: opacity .25s var(--hr-spring);
}
.onb-waypoint.is-current .onb-waypoint-ring {
  opacity: 1;
  animation: hr-rotate-conic 12s linear infinite;
}
.onb-waypoint-dot {
  position: relative;
  width: var(--onb-waypoint-size);
  height: var(--onb-waypoint-size);
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  border: 2px solid rgba(255, 255, 255, 0.18);
  display: inline-flex; align-items: center; justify-content: center;
  color: #1f1408;
  z-index: 1;
}
.onb-waypoint.is-complete .onb-waypoint-dot {
  background: var(--hr-gradient-hero);
  border-color: transparent;
  box-shadow: var(--onb-path-glow);
}
.onb-waypoint.is-current .onb-waypoint-dot {
  background: radial-gradient(circle at 30% 30%, #fde68a 0%, #fbbf24 50%, #f97316 100%);
  border-color: rgba(251, 191, 36, 0.85);
  animation: onb-current-pulse 2s ease-in-out infinite;
}
.onb-waypoint.is-future .onb-waypoint-dot {
  background: rgba(0, 0, 0, 0.65);
  border-color: rgba(255, 255, 255, 0.18);
}
.onb-waypoint-label {
  position: absolute;
  bottom: -32px;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  color: var(--hr-text-muted);
  white-space: nowrap;
}
.onb-waypoint.is-current .onb-waypoint-label,
.onb-waypoint.is-complete .onb-waypoint-label { color: var(--hr-text); }
.onb-waypoint-count {
  position: absolute;
  top: -18px;
  font-size: 10.5px;
  font-weight: 700;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid var(--hr-border-warm);
  color: var(--hr-accent-gold);
  padding: 1px 7px;
  border-radius: 999px;
  font-variant-numeric: tabular-nums;
}

@media (prefers-reduced-motion: reduce) {
  .onb-waypoint.is-current .onb-waypoint-dot,
  .onb-waypoint.is-current .onb-waypoint-ring,
  .onb-path-active {
    animation: none !important;
  }
}
</style>
