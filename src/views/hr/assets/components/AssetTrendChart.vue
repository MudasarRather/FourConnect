<template>
  <div class="as-chart-wrap">
    <component :is="chartComp" :data="data" :options="options" :key="themeRef + type" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Line, Bar, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS, Title, Tooltip, Legend, ArcElement,
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler,
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, ArcElement, CategoryScale, LinearScale,
  PointElement, LineElement, BarElement, Filler)

const props = defineProps({
  type: { type: String, default: 'bar' },   // line | bar | doughnut
  data: { type: Object, required: true },
  stacked: { type: Boolean, default: false },
})
const chartComp = computed(() => ({ line: Line, bar: Bar, doughnut: Doughnut }[props.type] || Bar))

const themeRef = ref(document.documentElement.getAttribute('data-theme') || 'dark')
let obs = null
onMounted(() => {
  obs = new MutationObserver(() => {
    themeRef.value = document.documentElement.getAttribute('data-theme') || 'dark'
  })
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
})
onUnmounted(() => obs?.disconnect())
const isLight = computed(() => themeRef.value === 'light')

const options = computed(() => {
  const light = isLight.value
  const tick = light ? '#6b5840' : 'rgba(255,255,255,0.42)'
  const grid = light ? 'rgba(40,25,10,0.06)' : 'rgba(255,255,255,0.04)'
  const legend = light ? '#6b5840' : 'rgba(255,255,255,0.55)'
  const tipBg = light ? 'rgba(255,250,240,0.96)' : 'rgba(20,18,16,0.95)'
  const base = {
    responsive: true, maintainAspectRatio: false,
    animation: { duration: 800, easing: 'easeOutQuart' },
    plugins: {
      legend: {
        display: props.type === 'doughnut', position: 'bottom',
        labels: { color: legend, font: { size: 10, weight: '600' }, boxWidth: 12, padding: 12 },
      },
      tooltip: {
        backgroundColor: tipBg, titleColor: light ? '#1a1410' : '#fff',
        bodyColor: light ? '#6b5840' : 'rgba(255,255,255,0.85)',
        borderColor: light ? 'rgba(217,119,6,0.3)' : 'rgba(255,255,255,0.1)',
        borderWidth: 1, padding: 10, cornerRadius: 8,
      },
    },
  }
  if (props.type === 'doughnut') return { ...base, cutout: '64%' }
  return {
    ...base,
    scales: {
      y: { stacked: props.stacked, beginAtZero: true, grid: { color: grid, drawBorder: false }, ticks: { color: tick, font: { size: 10 }, precision: 0 } },
      x: { stacked: props.stacked, grid: { display: false }, ticks: { color: tick, font: { size: 10 } } },
    },
  }
})
</script>

<style scoped>
.as-chart-wrap { position: relative; height: 100%; width: 100%; }
</style>
