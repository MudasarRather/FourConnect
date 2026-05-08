<template>
  <div class="budget-card content-card">
    <!-- Header -->
    <div class="panel-header">
       <h3>Budget vs Actual</h3>
       <div class="variance-badge" :class="varianceClass">
          {{ varianceText }}
       </div>
    </div>
    
    <!-- Animated Metrics Grid -->
    <div class="metrics-grid">
       <!-- Project Budget -->
       <div class="metric-item" :class="{ 'animate': isAnimated }" style="--delay: 0">
          <div class="metric-top">
             <div class="metric-icon budget-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                   <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
             </div>
             <span class="metric-label">Project Budget</span>
          </div>
          <div class="metric-value-row">
             <span class="metric-value">{{ formatCurrency(projectBudget) }}</span>
          </div>
          <div class="progress-track">
             <div class="progress-fill budget-fill" :class="{ 'animate': isAnimated }" style="width: 100%"></div>
          </div>
       </div>

       <!-- Milestone Allocation -->
       <div class="metric-item" :class="{ 'animate': isAnimated }" style="--delay: 1">
          <div class="metric-top">
             <div class="metric-icon allocation-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                   <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
             </div>
             <span class="metric-label">Milestone Allocation</span>
          </div>
          <div class="metric-value-row">
             <span class="metric-value">{{ formatCurrency(milestoneAllocation) }}</span>
             <span class="metric-percent">{{ allocationPercent }}%</span>
          </div>
          <div class="progress-track">
             <div class="progress-fill allocation-fill" :class="{ 'animate': isAnimated }" :style="{ '--target-width': allocationPercent + '%' }"></div>
          </div>
       </div>

       <!-- Actual Spend -->
       <div class="metric-item" :class="{ 'animate': isAnimated }" style="--delay: 2">
          <div class="metric-top">
             <div class="metric-icon spent-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                   <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
             </div>
             <span class="metric-label">Actual Spend</span>
          </div>
          <div class="metric-value-row">
             <span class="metric-value spent-val">{{ formatCurrency(actualSpend) }}</span>
             <span class="metric-percent">{{ spentPercent }}%</span>
          </div>
          <div class="progress-track">
             <div class="progress-fill spent-fill" :class="{ 'animate': isAnimated }" :style="{ '--target-width': spentPercent + '%' }"></div>
          </div>
       </div>

       <!-- Remaining Budget -->
       <div class="metric-item" :class="{ 'animate': isAnimated }" style="--delay: 3">
          <div class="metric-top">
             <div class="metric-icon remaining-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                   <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
             </div>
             <span class="metric-label">Remaining Budget</span>
          </div>
          <div class="metric-value-row">
             <span class="metric-value remaining-val">{{ formatCurrency(remainingBudget) }}</span>
             <span class="metric-percent">{{ remainingPercent }}%</span>
          </div>
          <div class="progress-track">
             <div class="progress-fill remaining-fill" :class="{ 'animate': isAnimated }" :style="{ '--target-width': remainingPercent + '%' }"></div>
          </div>
       </div>
    </div>
    
    <!-- Summary Footer -->
    <div class="summary-footer" :class="{ 'animate': isAnimated }">
       <div class="summary-item">
          <span class="summary-label">Utilization</span>
          <span class="summary-value" :class="utilizationClass">{{ formatPercent(spentPercent) }}</span>
       </div>
       <div class="summary-divider"></div>
       <div class="summary-item">
          <span class="summary-label">Health</span>
          <span class="summary-value" :class="healthClass">{{ healthStatus }}</span>
       </div>
       <div class="summary-divider"></div>
       <div class="summary-item">
          <span class="summary-label">Variance</span>
          <span class="summary-value" :class="varianceValueClass">{{ formatCurrency(variance) }}</span>
       </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'

const props = defineProps({
  formattedData: { type: Object, default: () => ({}) }
})

const isAnimated = ref(false)
onMounted(() => { setTimeout(() => isAnimated.value = true, 100) })

// Values
const projectBudget = computed(() => props.formattedData?.budget || 0)
const milestoneAllocation = computed(() => props.formattedData?.milestone_budget || 0)
const actualSpend = computed(() => props.formattedData?.actual || 0)
const currency = computed(() => props.formattedData?.currency || 'USD')

const remainingBudget = computed(() => Math.max(0, projectBudget.value - actualSpend.value))
const variance = computed(() => projectBudget.value - actualSpend.value)

// Percentages
const allocationPercent = computed(() => {
   if (!projectBudget.value) return 0
   return Math.min(100, (milestoneAllocation.value / projectBudget.value * 100)).toFixed(1)
})

const spentPercent = computed(() => {
   if (!projectBudget.value) return 0
   return Math.min(100, (actualSpend.value / projectBudget.value * 100)).toFixed(1)
})

const remainingPercent = computed(() => {
   if (!projectBudget.value) return 0
   return Math.max(0, 100 - parseFloat(spentPercent.value)).toFixed(1)
})

// Format percent smartly
const formatPercent = (pct) => {
   const p = parseFloat(pct)
   if (p === 0) return '0%'
   if (p < 0.1) return '<0.1%'
   if (p < 1) return p.toFixed(2) + '%'
   if (p < 10) return p.toFixed(1) + '%'
   return Math.round(p) + '%'
}

// Status
const varianceClass = computed(() => variance.value > 0 ? 'positive' : variance.value < 0 ? 'negative' : 'neutral')
const varianceText = computed(() => variance.value > 0 ? 'UNDER BUDGET' : variance.value < 0 ? 'OVER BUDGET' : 'ON BUDGET')

const utilizationClass = computed(() => {
   const pct = parseFloat(spentPercent.value)
   return pct >= 90 ? 'danger' : pct >= 70 ? 'warning' : 'success'
})

const healthClass = computed(() => {
   const alloc = parseFloat(allocationPercent.value)
   return alloc > 100 ? 'danger' : alloc >= 80 ? 'success' : 'warning'
})

const healthStatus = computed(() => {
   const alloc = parseFloat(allocationPercent.value)
   return alloc > 100 ? 'Over-allocated' : alloc >= 80 ? 'Healthy' : alloc >= 50 ? 'Moderate' : 'Low'
})

const varianceValueClass = computed(() => variance.value > 0 ? 'success' : variance.value < 0 ? 'danger' : 'neutral')

// Currency (en-US for K/M notation)
const formatCurrency = (val) => {
   const curr = currency.value
   const symbol = { USD: '$', INR: '₹', EUR: '€', GBP: '£' }[curr] || '$'
   return symbol + new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(val || 0)
}
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
  margin-bottom: 20px;
}

h3 {
  font-size: 14px;
  font-weight: 600;
  color: white;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.variance-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 20px;
  text-transform: uppercase;
}

.variance-badge.positive { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
.variance-badge.negative { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.variance-badge.neutral { background: rgba(96, 165, 250, 0.1); color: #60a5fa; }

/* Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  flex: 1;
}

.metric-item {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.5s ease;
  transition-delay: calc(var(--delay) * 0.1s);
}

.metric-item.animate {
  opacity: 1;
  transform: translateY(0);
}

.metric-item:hover {
  background: rgba(255,255,255,0.04);
  transform: translateY(-2px);
}

.metric-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.metric-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
}

.metric-item:hover .metric-icon {
  transform: scale(1.1);
}

.budget-icon { background: rgba(251, 191, 36, 0.15); color: #fbbf24; }
.allocation-icon { background: rgba(20, 184, 166, 0.15); color: #14b8a6; }
.spent-icon { background: rgba(249, 115, 22, 0.15); color: #f97316; }
.remaining-icon { background: rgba(34, 197, 94, 0.15); color: #22c55e; }

.metric-label {
  font-size: 11px;
  color: rgba(255,255,255,0.5);
  font-weight: 500;
}

.metric-value-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.metric-value {
  font-size: 18px;
  font-weight: 700;
  color: white;
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
}

.metric-value.spent-val { color: #f97316; }
.metric-value.remaining-val { color: #22c55e; }

.metric-percent {
  font-size: 11px;
  color: rgba(255,255,255,0.4);
  font-weight: 500;
}

/* Animated Progress Bars */
.progress-track {
  height: 6px;
  background: rgba(255,255,255,0.05);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  width: 0;
  transition: width 1s ease;
  transition-delay: calc(var(--delay, 0) * 0.15s + 0.3s);
}

.progress-fill.animate {
  width: var(--target-width, 100%);
}

.budget-fill { background: linear-gradient(90deg, #fbbf24, #f59e0b); --target-width: 100%; }
.allocation-fill { background: linear-gradient(90deg, #14b8a6, #0d9488); }
.spent-fill { background: linear-gradient(90deg, #f97316, #ea580c); }
.remaining-fill { background: linear-gradient(90deg, #22c55e, #16a34a); }

/* Summary Footer */
.summary-footer {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px 20px;
  background: rgba(255,255,255,0.02);
  border-radius: 12px;
  margin-top: 16px;
  opacity: 0;
  transform: translateY(10px);
  transition: all 0.5s ease 0.5s;
}

.summary-footer.animate {
  opacity: 1;
  transform: translateY(0);
}

.summary-item { flex: 1; text-align: center; }
.summary-divider { width: 1px; height: 28px; background: rgba(255,255,255,0.08); }

.summary-label {
  display: block;
  font-size: 10px;
  color: rgba(255,255,255,0.4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}

.summary-value {
  font-size: 13px;
  font-weight: 600;
  color: white;
}

.summary-value.success { color: #22c55e; }
.summary-value.warning { color: #f59e0b; }
.summary-value.danger { color: #ef4444; }
.summary-value.neutral { color: #60a5fa; }
</style>
