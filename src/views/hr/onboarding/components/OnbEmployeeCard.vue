<template>
  <button
    class="onb-emp-card"
    ref="cardEl"
    @click="$emit('open', process)"
    @mousemove="onMouseMove"
    @mouseleave="resetTilt"
    data-spotlight
  >
    <div class="onb-emp-card-inner">
      <div class="onb-emp-card-top">
        <div class="onb-emp-avatar">{{ initials }}</div>
        <OnbStageBadge :stage="process.current_stage" />
      </div>
      <div class="onb-emp-name">{{ process.employee_name || 'Joiner' }}</div>
      <div class="onb-emp-meta">
        <span class="onb-emp-mono">{{ process.employee_code || '—' }}</span>
        <span class="onb-emp-dot"></span>
        <span>{{ process.employee_designation || 'Designation pending' }}</span>
      </div>
      <div class="onb-emp-dept">{{ process.employee_department || 'Department unassigned' }}</div>

      <div class="onb-emp-progress">
        <div class="onb-emp-progress-bar">
          <div class="onb-emp-progress-fill" :style="{ width: `${process.progress_pct || 0}%` }"></div>
        </div>
        <span class="onb-emp-progress-pct">{{ process.progress_pct || 0 }}%</span>
      </div>
      <div class="onb-emp-meta">
        <span>Joining</span>
        <span class="onb-emp-mono">{{ formattedJoiningDate }}</span>
      </div>
    </div>
  </button>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import OnbStageBadge from './OnbStageBadge.vue'

const props = defineProps({
  process: { type: Object, required: true },
})
defineEmits(['open'])

const cardEl = ref(null)
const reducedMotion = ref(false)
onMounted(() => {
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
})

const initials = computed(() => {
  const name = props.process.employee_name || ''
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('') || '?'
})

const formattedJoiningDate = computed(() => {
  if (!props.process.target_joining_date) return 'TBD'
  const d = new Date(props.process.target_joining_date)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
})

const onMouseMove = (e) => {
  if (reducedMotion.value) return
  const el = cardEl.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const px = (e.clientX - rect.left) / rect.width
  const py = (e.clientY - rect.top) / rect.height
  const rotY = (px - 0.5) * 8  // tilt left/right
  const rotX = -(py - 0.5) * 6 // tilt up/down
  el.style.setProperty('--tilt-x', rotX + 'deg')
  el.style.setProperty('--tilt-y', rotY + 'deg')
  el.style.setProperty('--mx', `${px * 100}%`)
  el.style.setProperty('--my', `${py * 100}%`)
}
const resetTilt = () => {
  const el = cardEl.value
  if (!el) return
  el.style.setProperty('--tilt-x', '0deg')
  el.style.setProperty('--tilt-y', '0deg')
}
</script>

<style scoped>
.onb-emp-card {
  --tilt-x: 0deg; --tilt-y: 0deg;
  position: relative;
  width: 100%;
  background: var(--onb-card);
  border: 1px solid var(--hr-border);
  border-radius: 16px;
  padding: 14px;
  text-align: left;
  cursor: pointer;
  color: var(--hr-text);
  font: inherit;
  transform-style: preserve-3d;
  transform: perspective(800px) rotateX(var(--tilt-x)) rotateY(var(--tilt-y));
  transition: border-color .2s var(--hr-spring), box-shadow .25s var(--hr-spring), transform .15s var(--hr-spring);
  overflow: hidden;
}
.onb-emp-card::before {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(280px at var(--mx, 50%) var(--my, 50%), rgba(251, 191, 36, 0.16), transparent 70%);
  opacity: 0; transition: opacity .25s ease;
  pointer-events: none;
}
.onb-emp-card:hover {
  border-color: var(--onb-card-hover-border);
  box-shadow: var(--onb-card-glow);
}
.onb-emp-card:hover::before { opacity: 1; }
.onb-emp-card-inner { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 8px; }
.onb-emp-card-top { display: flex; align-items: center; justify-content: space-between; }
.onb-emp-avatar {
  width: 38px; height: 38px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--hr-gradient-hero); color: #1f1408;
  font-weight: 800; font-size: 13px; letter-spacing: 0.2px;
  box-shadow: 0 6px 20px -8px rgba(251, 146, 60, 0.5);
}
.onb-emp-name { font-size: 14.5px; font-weight: 700; color: var(--hr-text); }
.onb-emp-meta {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; color: var(--hr-text-muted);
}
.onb-emp-mono { font-family: var(--hr-mono); font-size: 10.5px; color: var(--hr-text-secondary); }
.onb-emp-dot { width: 3px; height: 3px; background: var(--hr-text-dim); border-radius: 50%; }
.onb-emp-dept { font-size: 11.5px; color: var(--hr-text-secondary); }

.onb-emp-progress {
  display: flex; align-items: center; gap: 10px;
  margin-top: 4px;
}
.onb-emp-progress-bar {
  flex: 1; height: 5px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.onb-emp-progress-fill {
  height: 100%;
  background: var(--hr-gradient-hero);
  border-radius: inherit;
  transition: width .9s var(--hr-ease-quint);
  box-shadow: 0 0 8px rgba(251, 191, 36, 0.4);
}
.onb-emp-progress-pct {
  font-size: 11px; font-weight: 700; font-variant-numeric: tabular-nums;
  color: var(--hr-text);
  min-width: 30px; text-align: right;
}
</style>
