<template>
  <div v-if="active" class="hr-confetti" aria-hidden="true">
    <span
      v-for="(p, i) in particles"
      :key="i"
      class="hr-confetti-piece"
      :style="p.style"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  fire: { type: Number, default: 0 }, // increment a counter to trigger a burst
  count: { type: Number, default: 14 },
  duration: { type: Number, default: 820 },
  originX: { type: String, default: '50%' },
  originY: { type: String, default: '50%' },
})

const reduce =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const COLORS = ['#fbbf24', '#fb923c', '#f59e0b', '#f97316', '#fef3c7']

const active = ref(false)
const particles = ref([])

watch(() => props.fire, (v, prev) => {
  if (v === prev) return
  if (reduce) return
  burst()
})

function burst() {
  particles.value = Array.from({ length: props.count }, () => {
    const angle = (Math.random() * 360) * (Math.PI / 180)
    const distance = 70 + Math.random() * 90
    const dx = Math.cos(angle) * distance
    const dy = Math.sin(angle) * distance - 40 // rise slightly
    const rotation = (Math.random() * 720 - 360)
    const size = 5 + Math.random() * 4
    const color = COLORS[Math.floor(Math.random() * COLORS.length)]
    const shape = Math.random() > 0.5 ? '999px' : '2px'
    return {
      style: {
        left: props.originX,
        top: props.originY,
        width: size + 'px',
        height: (size * 1.4) + 'px',
        background: color,
        borderRadius: shape,
        '--cx': dx + 'px',
        '--cy': dy + 'px',
        '--cr': rotation + 'deg',
        animationDuration: props.duration + 'ms',
        animationDelay: (Math.random() * 80) + 'ms',
      },
    }
  })
  active.value = true
  setTimeout(() => { active.value = false; particles.value = [] }, props.duration + 200)
}
</script>

<style scoped>
.hr-confetti {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
  z-index: 5;
}
.hr-confetti-piece {
  position: absolute;
  transform: translate(-50%, -50%);
  animation: hr-confetti-rise both var(--hr-spring);
  box-shadow: 0 0 6px currentColor;
  will-change: transform, opacity;
}
@media (prefers-reduced-motion: reduce) {
  .hr-confetti { display: none; }
}
</style>
