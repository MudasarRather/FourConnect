<template>
  <div class="chart-panel content-card">
    <!-- Header matching other cards -->
    <div class="panel-header">
       <h3>Budget Allocation</h3>
       <div class="stat-badge" :class="usageBadgeClass">{{ usageBadgeText }}</div>
    </div>
    
    <!-- Centered Chart Area -->
    <div class="chart-area">
       <div class="donut-container">
          <svg viewBox="0 0 100 100" class="donut-svg">
             <!-- Background track -->
             <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="10"/>
             
             <!-- Remaining Budget Segment (Gray) -->
             <circle 
                v-if="remainingPercent > 0"
                cx="50" cy="50" r="38"
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                stroke-width="10"
                :stroke-dasharray="`${remainingArc} ${circumference}`"
                :stroke-dashoffset="-usedArc"
                :style="{ transform: 'rotate(-90deg)', transformOrigin: '50px 50px' }"
                class="segment remaining-segment"
             />
             
             <!-- Allocated Segments -->
             <circle 
                v-for="(seg, i) in segments" 
                :key="i"
                cx="50" cy="50" r="38"
                fill="none"
                :stroke="seg.color"
                stroke-width="10"
                :stroke-dasharray="`${seg.arc} ${circumference}`"
                :stroke-dashoffset="-seg.offset"
                :style="{ 
                   transform: 'rotate(-90deg)', 
                   transformOrigin: '50px 50px',
                   transition: `stroke-dasharray 0.8s ease ${i * 0.1}s, stroke-dashoffset 0.8s ease ${i * 0.1}s`
                }"
                class="segment"
                :class="{ 'hovered': hoveredIndex === i }"
                @mouseenter="handleSegmentHover(i)"
                @mouseleave="hoveredIndex = null"
             />
          </svg>
          
          <!-- Center Content -->
          <div class="center-content">
             <span class="center-label">ALLOCATED</span>
             <span class="center-value">{{ allocatedPercent }}%</span>
          </div>
       </div>
    </div>

    <!-- Data Summary Below Chart -->
    <div class="data-summary" ref="summaryContainer">
       <div 
          v-for="(item, i) in summaryItems" 
          :key="i" 
          :ref="el => itemRefs[i] = el"
          class="summary-row"
          :class="{ 'highlighted': hoveredIndex === i }"
          @mouseenter="hoveredIndex = i"
          @mouseleave="hoveredIndex = null"
       >
          <div class="row-left">
             <span class="color-dot" :style="{ background: item.color }"></span>
             <span class="row-label">{{ item.name }}</span>
          </div>
          <span class="row-value">{{ item.formattedValue }}</span>
       </div>
       
       <!-- Remaining Budget Row -->
       <div class="summary-row remaining" v-if="remainingBudget > 0">
          <div class="row-left">
             <span class="color-dot" style="background: rgba(255,255,255,0.15)"></span>
             <span class="row-label">Remaining</span>
          </div>
          <span class="row-value">{{ formatCurrency(remainingBudget) }}</span>
       </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'

const props = defineProps({
  milestones: { type: Array, default: () => [] },
  totalBudget: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' }
})

const hoveredIndex = ref(null)
const summaryContainer = ref(null)
const itemRefs = ref([])
const circumference = 2 * Math.PI * 38

// Colors - Orange/Amber palette
const colors = [
  '#f59e0b', // Amber 500
  '#fbbf24', // Amber 400
  '#d97706', // Amber 600
  '#fcd34d', // Amber 300
  '#b45309', // Amber 700
]

// Auto-scroll to item when segment is hovered
const handleSegmentHover = (index) => {
   hoveredIndex.value = index
   nextTick(() => {
      const item = itemRefs.value[index]
      if (item && summaryContainer.value) {
         item.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
   })
}

// Process milestones
const processedMilestones = computed(() => {
   if (!props.milestones?.length) return []
   
   return props.milestones.map((m, i) => ({
      name: m.name || m.milestone_type || 'Milestone',
      amount: m.budget_amount_converted ?? m.budget_amount ?? 0,
      color: colors[i % colors.length]
   })).sort((a, b) => b.amount - a.amount)
})

const totalAllocated = computed(() => {
   return processedMilestones.value.reduce((sum, m) => sum + m.amount, 0)
})

const remainingBudget = computed(() => {
   return Math.max(0, props.totalBudget - totalAllocated.value)
})

const allocatedPercent = computed(() => {
   if (!props.totalBudget) return 0
   return Math.min(100, (totalAllocated.value / props.totalBudget) * 100).toFixed(0)
})

const remainingPercent = computed(() => {
   if (!props.totalBudget) return 0
   return Math.max(0, 100 - parseFloat(allocatedPercent.value))
})

// Usage badge
const usageBadgeClass = computed(() => {
   const pct = parseFloat(allocatedPercent.value)
   if (pct >= 90) return 'danger'
   if (pct >= 70) return 'warning'
   return 'success'
})

const usageBadgeText = computed(() => {
   const pct = parseFloat(allocatedPercent.value)
   if (pct >= 90) return 'NEAR LIMIT'
   if (pct >= 70) return 'HIGH USAGE'
   return `${remainingPercent.value.toFixed(0)}% Free`
})

// SVG Arc calculations
const usedArc = computed(() => {
   const pct = totalAllocated.value / (props.totalBudget || 1)
   return Math.min(pct, 1) * circumference
})

const remainingArc = computed(() => {
   return circumference - usedArc.value
})

const segments = computed(() => {
   if (!processedMilestones.value.length || totalAllocated.value === 0) return []
   
   let offset = 0
   return processedMilestones.value.map(m => {
      const pct = m.amount / (props.totalBudget || 1)
      const arc = Math.min(pct, 1) * circumference
      const seg = { ...m, arc, offset }
      offset += arc
      return seg
   })
})

// Summary items for legend
const summaryItems = computed(() => {
   return processedMilestones.value.map(m => ({
      name: m.name,
      color: m.color,
      formattedValue: formatCurrency(m.amount)
   }))
})

// Currency formatter - use en-US for consistency
const formatCurrency = (val) => {
   const currency = props.currency || 'USD'
   const symbol = { USD: '$', INR: '₹', EUR: '€', GBP: '£' }[currency] || '$'
   return symbol + new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(val)
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

.stat-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 12px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.stat-badge.success { color: #22c55e; background: rgba(34, 197, 94, 0.1); }
.stat-badge.warning { color: #f59e0b; background: rgba(245, 158, 11, 0.1); }
.stat-badge.danger { color: #ef4444; background: rgba(239, 68, 68, 0.1); }

/* Chart Area - Centered */
.chart-area {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 0 16px;
}

.donut-container {
  position: relative;
  width: 140px;
  height: 140px;
}

.donut-svg {
  width: 100%;
  height: 100%;
}

.segment {
  cursor: pointer;
  transition: opacity 0.2s ease, stroke-width 0.2s ease;
}

.segment:hover,
.segment.hovered {
  stroke-width: 12;
  opacity: 1;
}

.remaining-segment {
  pointer-events: none;
}

/* Center Content */
.center-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
}

.center-label {
  display: block;
  font-size: 9px;
  color: rgba(255,255,255,0.4);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 2px;
}

.center-value {
  display: block;
  font-size: 26px;
  font-weight: 700;
  color: white;
  line-height: 1;
}

/* Data Summary - LARGER ITEMS */
.data-summary {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-top: 1px solid rgba(255,255,255,0.06);
  padding-top: 16px;
  overflow-y: auto;
  scroll-behavior: smooth;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(255,255,255,0.02);
  transition: all 0.25s ease;
  cursor: default;
}

.summary-row:hover,
.summary-row.highlighted {
  background: rgba(255,255,255,0.06);
  transform: translateX(4px);
  border-left: 3px solid currentColor;
}

.summary-row.remaining {
  opacity: 0.6;
}

.row-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.row-label {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255,255,255,0.85);
  text-transform: capitalize;
}

.row-value {
  font-size: 14px;
  font-weight: 600;
  color: white;
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
}
</style>
