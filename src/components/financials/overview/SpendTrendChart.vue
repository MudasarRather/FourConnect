<template>
  <div class="chart-panel content-card">
    <!-- Header with Time Toggle -->
    <div class="panel-header">
       <h3>Spend Velocity</h3>
       <div class="header-right">
          <div class="time-toggle">
             <button 
                v-for="opt in timeOptions" 
                :key="opt.value" 
                :class="{ active: timeGranularity === opt.value }"
                @click="timeGranularity = opt.value"
             >{{ opt.label }}</button>
          </div>
       </div>
    </div>
    
    <!-- KPI Summary Row - Using backend summary values -->
    <div class="kpi-row">
       <div class="kpi-item">
          <span class="kpi-label">Project Budget</span>
          <span class="kpi-value budget">{{ formatCurrency(summary.total_budget) }}</span>
       </div>
       <div class="kpi-divider"></div>
       <div class="kpi-item">
          <span class="kpi-label">Actual Spend</span>
          <span class="kpi-value spent">{{ formatCurrency(summary.total_spent) }}</span>
       </div>
       <div class="kpi-divider"></div>
       <div class="kpi-item">
          <span class="kpi-label">Remaining</span>
          <span class="kpi-value remaining">{{ formatCurrency(computedRemaining) }}</span>
       </div>
    </div>
    
    <!-- Chart Area -->
    <div class="chart-wrapper" v-if="hasData">
       <Line :data="chartData" :options="chartOptions" :key="chartKey" />
    </div>
    
    <!-- Empty State -->
    <div class="empty-state" v-else>
       <div class="empty-icon">📊</div>
       <p>No completed milestones yet</p>
       <span>Spend data will appear when milestones are marked complete</span>
    </div>
    
    <!-- Bottom Stats -->
    <div class="bottom-stats" v-if="hasData">
       <div class="stat-item">
          <span class="stat-dot completed"></span>
          <span class="stat-text">{{ completedCount }} completed</span>
       </div>
       <div class="stat-item">
          <span class="stat-dot pending"></span>
          <span class="stat-text">{{ inProgressCount }} in progress</span>
       </div>
       <div class="stat-item">
          <span class="stat-dot"></span>
          <span class="stat-text">{{ utilizedPercent }}% utilized</span>
       </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Line } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const props = defineProps({
  milestones: { type: Array, default: () => [] },
  summary: { type: Object, default: () => ({}) }
})

const timeGranularity = ref('day')
const timeOptions = [
   { label: 'Day', value: 'day' },
   { label: 'Month', value: 'month' },
   { label: 'Year', value: 'year' }
]

// Filter milestones by status
const completedMilestones = computed(() => {
   return props.milestones.filter(m => m.status === 'completed')
})

const inProgressMilestones = computed(() => {
   return props.milestones.filter(m => m.status === 'in_progress')
})

const completedCount = computed(() => completedMilestones.value.length)
const inProgressCount = computed(() => inProgressMilestones.value.length)
const hasData = computed(() => completedMilestones.value.length > 0)

// Use backend summary values directly (these are already currency-converted)
const computedRemaining = computed(() => {
   const budget = props.summary.total_budget || 0
   const spent = props.summary.total_spent || 0
   return Math.max(0, budget - spent)
})

const utilizedPercent = computed(() => {
   return (props.summary.budget_utilized_percentage || 0).toFixed(1)
})

// Chart key for re-render on toggle change
const chartKey = computed(() => `${timeGranularity.value}-${completedMilestones.value.length}`)

// Currency formatter - ALWAYS use en-US to match KPI cards (K notation)
const formatCurrency = (val) => {
   const currency = props.summary?.currency || 'USD'
   const symbol = { USD: '$', INR: '₹', EUR: '€', GBP: '£' }[currency] || '$'
   // Always use en-US for consistent K/M notation
   const formatted = new Intl.NumberFormat('en-US', { 
      notation: 'compact', 
      maximumFractionDigits: 1 
   }).format(val || 0)
   return symbol + formatted
}

// Format date based on granularity
const formatDateKey = (dateStr) => {
   if (!dateStr) return null
   const d = new Date(dateStr)
   if (isNaN(d.getTime())) return null
   
   switch (timeGranularity.value) {
      case 'day': return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      case 'month': return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      case 'year': return d.getFullYear().toString()
      default: return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
   }
}

// Build timeline from completed milestones
const timelineData = computed(() => {
   if (!completedMilestones.value.length) return { labels: [], spend: [], cumulative: [] }
   
   const dateMap = {}
   completedMilestones.value.forEach(m => {
      const dateField = m.actual_end_date || m.due_date || m.created_at
      const key = formatDateKey(dateField)
      if (!key) return
      
      const amt = m.budget_amount_converted ?? m.budget_amount ?? 0
      if (!dateMap[key]) dateMap[key] = { spend: 0, date: new Date(dateField) }
      dateMap[key].spend += amt
   })
   
   const sortedKeys = Object.keys(dateMap).sort((a, b) => dateMap[a].date - dateMap[b].date)
   
   let cumulative = 0
   const spendData = []
   const cumulativeData = []
   
   sortedKeys.forEach(key => {
      spendData.push(dateMap[key].spend)
      cumulative += dateMap[key].spend
      cumulativeData.push(cumulative)
   })
   
   return { labels: sortedKeys, spend: spendData, cumulative: cumulativeData }
})

// Chart data
const chartData = computed(() => {
   const { labels, spend, cumulative } = timelineData.value
   const budget = props.summary.total_budget || 0
   const budgetLine = labels.map(() => budget)
   const remainingLine = cumulative.map(c => Math.max(0, budget - c))
   
   return {
      labels,
      datasets: [
         {
            label: 'Spend per Period',
            backgroundColor: (ctx) => {
               const canvas = ctx.chart.ctx
               const gradient = canvas.createLinearGradient(0, 0, 0, 280)
               gradient.addColorStop(0, 'rgba(249, 115, 22, 0.15)')
               gradient.addColorStop(1, 'rgba(249, 115, 22, 0)')
               return gradient
            },
            borderColor: '#f97316',
            borderWidth: 2.5,
            pointBackgroundColor: '#18181b',
            pointBorderColor: '#f97316',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: true,
            tension: 0.3,
            data: spend
         },
         {
            label: 'Cumulative Spend',
            borderColor: '#fbbf24',
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            tension: 0.3,
            data: cumulative
         },
         {
            label: 'Project Budget',
            borderColor: 'rgba(34, 197, 94, 0.5)',
            borderWidth: 1.5,
            borderDash: [6, 4],
            pointRadius: 0,
            fill: false,
            data: budgetLine
         },
         {
            label: 'Remaining Budget',
            borderColor: 'rgba(96, 165, 250, 0.5)',
            borderWidth: 1.5,
            borderDash: [4, 4],
            pointRadius: 0,
            fill: false,
            tension: 0.3,
            data: remainingLine
         }
      ]
   }
})

// Chart options
const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  animation: { duration: 800, easing: 'easeOutQuart' },
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
      labels: { color: 'rgba(255,255,255,0.5)', font: { size: 10 }, boxWidth: 12, padding: 12 }
    },
    tooltip: {
       backgroundColor: 'rgba(24, 24, 27, 0.95)',
       padding: 12,
       cornerRadius: 8,
       callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
       }
    }
  },
  scales: {
     y: {
       grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
       ticks: {
         color: 'rgba(255,255,255,0.3)',
         font: { size: 10 },
         callback: (val) => formatCurrency(val)
       }
     },
     x: {
       grid: { display: false },
       ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 } }
     }
  }
}))
</script>

<style scoped>
.content-card {
  background: rgba(30, 30, 33, 0.4);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

h3 {
  font-size: 14px;
  font-weight: 600;
  color: white;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.time-toggle {
  display: flex;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  padding: 2px;
}

.time-toggle button {
  padding: 4px 10px;
  font-size: 10px;
  font-weight: 500;
  color: rgba(255,255,255,0.5);
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.time-toggle button:hover { color: rgba(255,255,255,0.8); }
.time-toggle button.active { background: rgba(249, 115, 22, 0.2); color: #f97316; }

.kpi-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: rgba(255,255,255,0.02);
  border-radius: 12px;
  margin-bottom: 16px;
}

.kpi-item { flex: 1; text-align: center; }
.kpi-divider { width: 1px; height: 32px; background: rgba(255,255,255,0.08); }

.kpi-label {
  display: block;
  font-size: 10px;
  color: rgba(255,255,255,0.4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}

.kpi-value {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: white;
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
}

.kpi-value.spent { color: #f97316; }
.kpi-value.remaining { color: #22c55e; }

.chart-wrapper { flex: 1; min-height: 120px; }

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: rgba(255,255,255,0.4);
}

.empty-icon { font-size: 32px; margin-bottom: 12px; opacity: 0.5; }
.empty-state p { font-size: 14px; font-weight: 500; margin: 0 0 4px; color: rgba(255,255,255,0.6); }
.empty-state span { font-size: 12px; }

.bottom-stats {
  display: flex;
  justify-content: center;
  gap: 24px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.06);
  margin-top: 8px;
}

.stat-item { display: flex; align-items: center; gap: 6px; }
.stat-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.2); }
.stat-dot.completed { background: #22c55e; }
.stat-dot.pending { background: #f97316; }
.stat-text { font-size: 11px; color: rgba(255,255,255,0.5); font-weight: 500; }
</style>
