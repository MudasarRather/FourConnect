<template>
  <div class="contribution-badge" title="Total Milestone Contribution">
    <div class="icon-ring">
      <PieChart :size="10" />
    </div>
    <span class="label">Milestone Contribution:</span>
    <span class="value">{{ value }}%</span>
  </div>
</template>

<script setup>
import { PieChart } from 'lucide-vue-next'

defineProps({
  value: {
    type: [Number, String],
    default: 0
  }
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
    background: linear-gradient(135deg, #3b82f6, #6366f1);
    box-shadow: 0 0 10px rgba(59, 130, 246, 0.4);
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
</style>
