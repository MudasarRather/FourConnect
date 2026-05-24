<template>
  <div class="contribution-badge" :title="`Total Milestone Contribution: ${formatted}%`">
    <div class="icon-ring">
      <PieChart :size="10" />
    </div>
    <span class="label">Contribution</span>
    <span class="value">{{ formatted }}%</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { PieChart } from 'lucide-vue-next'

const props = defineProps({
  value: {
    type: [Number, String],
    default: 0
  }
})

// Round to max 2 decimals, strip trailing zeros — fixes "33.33333333333333%" overflow
const formatted = computed(() => {
  const n = Number(props.value) || 0
  return parseFloat(n.toFixed(2)).toString()
})
</script>

<style scoped>
.contribution-badge {
    display: flex; align-items: center; gap: 6px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    backdrop-filter: blur(4px);
    padding: 4px 10px 4px 4px; /* Tighter padding left for icon */
    border-radius: 20px; /* Pill shape */
    height: 24px;
    transition: all 0.2s ease;
    user-select: none;
}

.contribution-badge:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.icon-ring {
    display: flex; align-items: center; justify-content: center;
    width: 20px; height: 20px;
    background: linear-gradient(135deg, #f59e0b, #f97316);
    box-shadow: 0 0 10px rgba(245, 158, 11, 0.45);
    border-radius: 50%;
    color: white;
}

.label {
    font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.5);
    text-transform: uppercase; letter-spacing: 0.02em;
    margin-left: 2px;
}

.value {
    font-size: 11px; font-weight: 700; color: #f5f5f7;
    font-family: 'SF Mono', ui-monospace, monospace;
    text-shadow: 0 0 10px rgba(255,255,255,0.1);
}

/* ═════════ LIGHT THEME OVERRIDES ═════════════════════════════════════════ */
[data-theme="light"] .contribution-badge {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(217, 119, 6, 0.22);
  box-shadow: 0 2px 8px rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .contribution-badge:hover {
  background: rgba(217, 119, 6, 0.10);
  border-color: rgba(217, 119, 6, 0.40);
  box-shadow: 0 4px 12px rgba(40, 25, 10, 0.15);
}
[data-theme="light"] .icon-ring {
  background: linear-gradient(135deg, #d97706, #b45309);
  box-shadow: 0 0 10px rgba(217, 119, 6, 0.40);
}
[data-theme="light"] .label { color: #92400e; }
[data-theme="light"] .value { color: var(--text-primary); text-shadow: none; }
</style>
