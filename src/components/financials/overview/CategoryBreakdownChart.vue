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
  background: rgba(30, 30, 33, 0.45);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  box-shadow:
    0 20px 50px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  animation: cat-card-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
  transition: transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease;
}
.content-card:hover {
  transform: translateY(-3px);
  border-color: rgba(245, 158, 11, 0.22);
  box-shadow:
    0 30px 70px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

/* Floating ambient orbs */
.content-card::before,
.content-card::after {
  content: "";
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(40px);
  z-index: 0;
}
.content-card::before {
  width: 180px; height: 180px;
  top: -60px; right: -40px;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.20), transparent 70%);
  animation: cat-orb-a 14s ease-in-out infinite;
}
.content-card::after {
  width: 140px; height: 140px;
  bottom: -50px; left: -30px;
  background: radial-gradient(circle, rgba(249, 115, 22, 0.16), transparent 70%);
  animation: cat-orb-b 17s ease-in-out infinite;
}
.content-card > * { position: relative; z-index: 1; }

@keyframes cat-card-enter {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes cat-orb-a {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-12px, 16px) scale(1.10); }
}
@keyframes cat-orb-b {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(15px, -12px) scale(1.08); }
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
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border: 1px solid transparent;
  position: relative;
  animation: cat-badge-breathe 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.stat-badge.success {
  color: #22c55e;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.18), rgba(34, 197, 94, 0.06));
  border-color: rgba(34, 197, 94, 0.35);
}
.stat-badge.warning {
  color: #fbbf24;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.18), rgba(251, 191, 36, 0.06));
  border-color: rgba(251, 191, 36, 0.35);
}
.stat-badge.danger {
  color: #ef4444;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(239, 68, 68, 0.06));
  border-color: rgba(239, 68, 68, 0.35);
}

@keyframes cat-badge-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

/* Chart Area - Centered */
.chart-area {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px 0 18px;
  position: relative;
}

.donut-container {
  position: relative;
  width: 150px;
  height: 150px;
  animation: donut-spin-in 1.2s cubic-bezier(0.16, 1, 0.3, 1) both;
}

/* Soft glow halo behind donut */
.donut-container::after {
  content: "";
  position: absolute; inset: -8px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.18), transparent 65%);
  filter: blur(16px);
  z-index: -1;
  animation: halo-pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.donut-svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 4px 12px rgba(245, 158, 11, 0.22));
}

@keyframes donut-spin-in {
  from { opacity: 0; transform: scale(0.85) rotate(-12deg); }
  to { opacity: 1; transform: scale(1) rotate(0deg); }
}
@keyframes halo-pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.08); }
}

.segment {
  cursor: pointer;
  transition: opacity 0.25s ease, stroke-width 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.segment:hover,
.segment.hovered {
  stroke-width: 13;
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
  animation: center-fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both;
}

.center-label {
  display: block;
  font-size: 9px;
  color: rgba(245, 158, 11, 0.75);
  text-transform: uppercase;
  letter-spacing: 0.10em;
  margin-bottom: 4px;
  font-weight: 700;
}

.center-value {
  display: block;
  font-size: 28px;
  font-weight: 800;
  background: linear-gradient(135deg, #fff 30%, #fbbf24 100%);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  line-height: 1;
  letter-spacing: -0.02em;
}

@keyframes center-fade-in {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.85); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
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

/* ═════════════════════════════════════════════════════════
   LIGHT THEME OVERRIDES
   ═════════════════════════════════════════════════════════ */
[data-theme="light"] .content-card {
  background: rgba(255, 250, 240, 0.85);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  border: 1px solid rgba(40, 25, 10, 0.10);
  box-shadow:
    0 20px 50px rgba(40, 25, 10, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.50);
}
[data-theme="light"] .content-card:hover {
  border-color: rgba(217, 119, 6, 0.32);
  box-shadow:
    0 30px 70px rgba(40, 25, 10, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.60);
}
[data-theme="light"] .content-card::before {
  background: radial-gradient(circle, rgba(217, 119, 6, 0.22), transparent 70%);
}
[data-theme="light"] .content-card::after {
  background: radial-gradient(circle, rgba(234, 88, 12, 0.18), transparent 70%);
}
[data-theme="light"] .donut-container::after {
  background: radial-gradient(circle, rgba(217, 119, 6, 0.22), transparent 65%);
}
[data-theme="light"] .donut-svg {
  filter: drop-shadow(0 4px 12px rgba(217, 119, 6, 0.28));
}
[data-theme="light"] .center-label {
  color: #b45309;
}
[data-theme="light"] .center-value {
  background: linear-gradient(135deg, #92400e 30%, #d97706 100%);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
[data-theme="light"] .stat-badge.success {
  color: #047857;
  background: linear-gradient(135deg, rgba(5, 150, 105, 0.18), rgba(5, 150, 105, 0.06));
  border-color: rgba(5, 150, 105, 0.40);
}
[data-theme="light"] .stat-badge.warning {
  color: #b45309;
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.18), rgba(217, 119, 6, 0.06));
  border-color: rgba(217, 119, 6, 0.40);
}
[data-theme="light"] .stat-badge.danger {
  color: #b91c1c;
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.16), rgba(220, 38, 38, 0.04));
  border-color: rgba(220, 38, 38, 0.40);
}
[data-theme="light"] h3 {
  color: #b45309;
  font-weight: 700;
}
[data-theme="light"] .stat-badge.success {
  color: #047857;
  background: rgba(5, 150, 105, 0.14);
}
[data-theme="light"] .stat-badge.warning {
  color: #b45309;
  background: rgba(217, 119, 6, 0.14);
}
[data-theme="light"] .stat-badge.danger {
  color: #b91c1c;
  background: rgba(220, 38, 38, 0.10);
}
[data-theme="light"] .donut-svg circle[stroke="rgba(255,255,255,0.03)"] {
  stroke: rgba(40, 25, 10, 0.08);
}
[data-theme="light"] .donut-svg circle[stroke="rgba(255,255,255,0.08)"] {
  stroke: rgba(40, 25, 10, 0.16);
}
[data-theme="light"] .center-label {
  color: #b45309;
  font-weight: 700;
}
[data-theme="light"] .center-value { color: #1a1410; }
[data-theme="light"] .data-summary {
  border-top: 1px solid rgba(40, 25, 10, 0.08);
}
[data-theme="light"] .summary-row {
  background: rgba(255, 250, 240, 0.55);
  border: 1px solid rgba(40, 25, 10, 0.06);
}
[data-theme="light"] .summary-row:hover,
[data-theme="light"] .summary-row.highlighted {
  background: rgba(217, 119, 6, 0.08);
  border-color: rgba(217, 119, 6, 0.22);
}
[data-theme="light"] .row-label { color: #1a1410; }
[data-theme="light"] .row-value { color: #1a1410; }
[data-theme="light"] .summary-row.remaining {
  opacity: 0.7;
}
[data-theme="light"] .summary-row.remaining .color-dot {
  background: rgba(40, 25, 10, 0.18) !important;
}
[data-theme="light"] ::-webkit-scrollbar-thumb {
  background: rgba(217, 119, 6, 0.30);
}
</style>
