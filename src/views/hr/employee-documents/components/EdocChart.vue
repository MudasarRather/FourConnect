<template>
  <div class="edoc-chart">
    <Doughnut v-if="type === 'doughnut'" :key="`d-${themeKey}`" :data="chartData" :options="options" />
    <Bar v-else :key="`b-${themeKey}`" :data="chartData" :options="options" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Doughnut, Bar } from 'vue-chartjs'
import {
  Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale,
  Tooltip, Legend,
} from 'chart.js'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const props = defineProps({
  type: { type: String, default: 'doughnut' }, // 'doughnut' | 'bar'
  points: { type: Array, default: () => [] },   // [{label, value, key}]
  palette: { type: Array, default: () => ['#fbbf24', '#f59e0b', '#fb923c', '#ea580c', '#f97316', '#d97706', '#34d399', '#f87171', '#9ca3af'] },
  label: { type: String, default: 'Documents' },
})

const themeKey = ref(document.documentElement.getAttribute('data-theme') || 'dark')
let mo
onMounted(() => {
  mo = new MutationObserver(() => {
    themeKey.value = document.documentElement.getAttribute('data-theme') || 'dark'
  })
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
})
onBeforeUnmount(() => mo?.disconnect())

const isLight = computed(() => themeKey.value === 'light')

const chartData = computed(() => ({
  labels: props.points.map(p => p.label),
  datasets: [{
    label: props.label,
    data: props.points.map(p => p.value),
    backgroundColor: props.type === 'doughnut'
      ? props.points.map((_, i) => props.palette[i % props.palette.length])
      : props.points.map((_, i) => props.palette[i % props.palette.length] + 'cc'),
    borderColor: isLight.value ? 'rgba(255,255,255,0.7)' : 'rgba(12,11,9,0.6)',
    borderWidth: props.type === 'doughnut' ? 2 : 0,
    borderRadius: props.type === 'bar' ? 7 : 0,
    hoverOffset: 6,
    maxBarThickness: 34,
  }],
}))

const tick = computed(() => (isLight.value ? '#6b5840' : '#8e8e93'))
const grid = computed(() => (isLight.value ? 'rgba(40,25,10,0.06)' : 'rgba(255,255,255,0.04)'))

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: props.type === 'doughnut'
      ? { position: 'right', labels: { color: isLight.value ? '#1a1410' : '#f5f5f7', font: { size: 11, weight: '600' }, boxWidth: 10, boxHeight: 10, padding: 10, usePointStyle: true } }
      : { display: false },
    tooltip: {
      backgroundColor: isLight.value ? 'rgba(26,20,16,0.92)' : 'rgba(14,11,9,0.92)',
      titleColor: isLight.value ? '#fff' : '#f5f5f7',
      bodyColor: isLight.value ? '#f5e9d8' : '#c5c5c8',
      borderColor: isLight.value ? 'rgba(217,119,6,0.32)' : 'rgba(251,191,36,0.18)',
      borderWidth: 1, padding: 10, cornerRadius: 8,
    },
  },
  cutout: props.type === 'doughnut' ? '64%' : undefined,
  scales: props.type === 'bar' ? {
    x: { grid: { display: false }, ticks: { color: tick.value, font: { size: 10 } } },
    y: { grid: { color: grid.value }, ticks: { color: tick.value, font: { size: 10 }, precision: 0 }, beginAtZero: true },
  } : {},
}))
</script>

<style scoped>
.edoc-chart { position: relative; width: 100%; height: 100%; min-height: 220px; }
</style>
