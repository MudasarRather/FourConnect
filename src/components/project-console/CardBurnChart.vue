<template>
  <div class="glass-card budget-donut-card">
    <div class="card-header">
      <div class="header-left">
        <div class="icon-box"><PieChart :size="16" /></div>
        <h3>Budget Allocation</h3>
      </div>
      <div class="header-right">
         <span class="badge" :class="healthStatus">{{ healthLabel }}</span>
      </div>
    </div>

    <div class="chart-body">
       <!-- Donut Chart -->
       <div class="donut-wrapper">
          <svg viewBox="0 0 100 100" class="donut-svg">
            <circle cx="50" cy="50" r="40.5" class="track" />
            
            <circle 
               v-for="(seg, index) in segments" 
               :key="seg.id"
               cx="50" cy="50" r="40.5"
               fill="none"
               stroke-width="8"
               :stroke="seg.color"
               :stroke-dasharray="`${seg.dash} ${seg.gap}`"
               :stroke-dashoffset="seg.offset"
               class="segment"
               :class="{ active: hoveredId === seg.id }"
               @mouseenter="hoveredId = seg.id"
               @mouseleave="hoveredId = null"
            />
          </svg>
          <div class="center-text">
             <template v-if="hoveredSegment">
                <span class="c-label">{{ hoveredSegment.name }}</span>
                <span class="c-val dynamic" :style="{ color: hoveredSegment.color }">
                   {{ formatMilestoneCurrency(hoveredSegment) }}
                </span>
             </template>
             <template v-else>
                <span class="c-label">Allocated</span>
                <span class="c-val main">{{ percentAllocated }}%</span>
             </template>
          </div>
       </div>

       <!-- Premium List -->
       <div class="milestone-list">
          <div 
             v-for="(m, i) in processedMilestones" 
             :key="m.id" 
             class="m-row" 
             :class="{ active: hoveredId === m.id }"
             @mouseenter="hoveredId = m.id" 
             @mouseleave="hoveredId = null"
          >
             <div class="m-indicator" :style="{ background: m.color }"></div>
             <div class="m-info">
                <span class="m-name">{{ m.name }}</span>
                <div class="m-meta">
                   <component :is="getStatusIcon(m.status)" class="m-icon" :class="m.status" />
                   <span>{{ formatDate(m.due_date) }}</span>
                </div>
             </div>
             <div class="m-cost-col">
                <!-- MAIN: Project Currency (Converted) -->
                <span class="m-cost">
                    {{ formatCurrency(m.normalized_amount) }}
                </span>
                
                <!-- SUB: Native Currency (if different) -->
                <span v-if="m.currency !== project.currency" class="m-cost-conv">
                   {{ formatMilestoneCurrency(m) }}
                </span>
             </div>
          </div>
       </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { PieChart, Clock, PlayCircle, CheckCircle2, AlertCircle } from 'lucide-vue-next'

const props = defineProps({
  project: { type: Object, default: () => ({}) },
  milestones: { type: Array, default: () => [] },
  utilizedAmount: { type: Number, default: null } // New prop from backend
})

const hoveredId = ref(null)

// ... (keep rates for relative sizing) ...
const EXCHANGE_RATES = {
  'USD': 1,
  'EUR': 0.92,
  'GBP': 0.79,
  'INR': 83.5,
  'AUD': 1.52,
  'CAD': 1.35,
  'JPY': 150.0
}

const convertAmount = (amount, from, to) => {
  if (!amount) return 0
  if (from === to) return amount
  
  const fromRate = EXCHANGE_RATES[from] || 1
  const toRate = EXCHANGE_RATES[to] || 1
  
  const inUSD = amount / fromRate
  return inUSD * toRate
}

// 20-Color Harmonic Palette (Gold/Orange Bias + Cool Accents)
// Amber/orange/yellow palette only — each chart segment gets a unique tint
// within the brand hue family so the chart reads as a unified gradient.
const PALETTE = [
  '#f59e0b', // Amber 500
  '#f97316', // Orange 500
  '#fbbf24', // Amber 400
  '#fdba74', // Orange 300
  '#facc15', // Yellow 400
  '#fde68a', // Amber 200
  '#d97706', // Amber 600
  '#ea580c', // Orange 600
  '#eab308', // Yellow 500
  '#b45309', // Amber 700
  '#92400e', // Amber 800
  '#fed7aa', // Orange 200
  '#fef3c7', // Amber 100
  '#ca8a04', // Yellow 600
  '#c2410c', // Orange 700
  '#fef08a', // Yellow 200
  '#a16207', // Yellow 700
  '#f59e0b', // Loop Amber
  '#f97316',
  '#fbbf24'
]

const totalBudget = computed(() => props.project?.budget_amount || 1)
const projectCurrency = computed(() => props.project?.currency || 'USD')

const percentAllocated = computed(() => {
   // Use backend value if available
   if (props.utilizedAmount !== null) {
       return Math.round((props.utilizedAmount / totalBudget.value) * 100)
   }
   const allocated = processedMilestones.value.reduce((sum, m) => sum + m.normalized_amount, 0)
   return Math.round((allocated / totalBudget.value) * 100)
})

// Augment Milestones with Color AND Normalized Budget
const processedMilestones = computed(() => {
   let items = [...props.milestones]
      .map(m => ({
          ...m,
          // Use Backend provided converted amount (Consistency with API)
          normalized_amount: (m.budget_amount_converted !== undefined && m.budget_amount_converted !== null) 
              ? m.budget_amount_converted 
              : convertAmount(m.budget_amount || 0, m.currency || 'USD', projectCurrency.value)
      }))

   // Scaling Logic: Match the sum to backend's utilizedAmount
   if (props.utilizedAmount !== null) {
       const localSum = items.reduce((sum, m) => sum + m.normalized_amount, 0)
       if (localSum > 0) {
           const scale = props.utilizedAmount / localSum
           items = items.map(m => ({ ...m, normalized_amount: m.normalized_amount * scale }))
       }
   }
      
   return items
      .sort((a,b) => b.normalized_amount - a.normalized_amount)
      .map((m, i) => ({
          ...m,
          color: PALETTE[i % PALETTE.length]
      }))

})

// Circular Logic using NORMALIZED amounts
const segments = computed(() => {
   const circumference = 2 * Math.PI * 40.5
   let accumulatedPercent = 0
   
   return processedMilestones.value.map(m => {
      const budget = m.normalized_amount || 0
      const percent = Math.min(1, budget / totalBudget.value)
      
      const dash = percent * circumference
      const gap = circumference - dash 
      const segmentOffset = - (accumulatedPercent * circumference)
      accumulatedPercent += percent
      
      return { ...m, dash, gap, offset: segmentOffset }
   })
})

const hoveredSegment = computed(() => segments.value.find(s => s.id === hoveredId.value))

const healthStatus = computed(() => {
   if (percentAllocated.value > 100) return 'critical'
   if (percentAllocated.value > 85) return 'warning'
   return 'healthy'
})
const healthLabel = computed(() => {
   if (healthStatus.value === 'critical') return 'Over Budget'
   if (healthStatus.value === 'warning') return 'High Usage'
   return 'Healthy'
})

// Helpers
const getStatusIcon = (s) => {
   switch(s) {
      case 'completed': return CheckCircle2
      case 'in_progress': return PlayCircle
      case 'pending': return Clock
      default: return AlertCircle
   }
}

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''

const formatMilestoneCurrency = (m) => {
   const val = m.budget_amount || 0
   const curr = m.currency || 'USD'
   return val.toLocaleString('en-US', { style: 'currency', currency: curr, maximumFractionDigits: 0 })
}

const formatCurrency = (val) => {
   return val.toLocaleString('en-US', { style: 'currency', currency: projectCurrency.value, maximumFractionDigits: 0 })
}

</script>

<style scoped>
.glass-card {
  background: rgba(20, 20, 23, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 24px 20px;
  backdrop-filter: blur(16px);
  display: flex; flex-direction: column;
  height: 100%;
}

.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding: 0 4px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.icon-box { 
  width: 32px; height: 32px; background: rgba(255, 255, 255, 0.06); 
  border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #d4d4d8;
}
h3 { font-size: 15px; font-weight: 600; color: white; margin: 0; }

.badge { font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; }
.badge.healthy { background: rgba(245, 158, 11, 0.12); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.28); }
.badge.warning { background: rgba(234, 179, 8, 0.1); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.2); }
.badge.critical { background: rgba(239, 68, 68, 0.1); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2); }

.chart-body { display: flex; align-items: center; gap: 28px; height: 100%; }

.donut-wrapper { position: relative; width: 130px; height: 130px; flex-shrink: 0; }
.donut-svg { transform: rotate(-90deg); width: 100%; height: 100%; }
.track { fill: none; stroke: rgba(255,255,255,0.04); stroke-width: 8; }
.segment {
   transition: stroke-width 0.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s;
   cursor: pointer;
}
.segment:hover, .segment.active { stroke-width: 12; opacity: 1; filter: drop-shadow(0 0 6px rgba(0,0,0,0.6)); }
.donut-wrapper:hover .segment:not(.active):not(:hover) { opacity: 0.3; }

.center-text {
   position: absolute; top: 0; left: 0; width: 100%; height: 100%;
   display: flex; flex-direction: column; align-items: center; justify-content: center;
   pointer-events: none; text-align: center;
}
.c-label { font-size: 9px; color: rgba(255,255,255,0.4); text-transform: uppercase; font-weight: 600; max-width: 80%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.c-val { font-size: 16px; font-weight: 700; color: white; }
.c-val.main { font-size: 26px; letter-spacing: -0.02em; }

.milestone-list {
   flex: 1; height: 140px; overflow-y: auto; padding-right: 6px;
   display: flex; flex-direction: column; gap: 6px;
}
.milestone-list::-webkit-scrollbar { width: 4px; }
.milestone-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

.m-row {
   display: flex; align-items: center; gap: 12px; padding: 10px 12px;
   border-radius: 10px; background: rgba(255,255,255,0.02);
   border: 1px solid transparent;
   cursor: pointer; transition: all 0.2s;
}
.m-row:hover, .m-row.active { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.05); transform: translateX(2px); }

.m-indicator { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 8px rgba(0,0,0,0.3); }

.m-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.m-name { font-size: 13px; font-weight: 500; color: #f4f4f5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.m-meta { display: flex; align-items: center; gap: 6px; font-size: 11px; color: rgba(255,255,255,0.5); }
.m-icon { width: 12px; height: 12px; }
.m-icon.pending { color: #eab308; }
.m-icon.in_progress { color: #f97316; }
.m-icon.completed { color: #fbbf24; }

.m-cost-col { display: flex; flex-direction: column; align-items: flex-end; margin-left: auto; }
.m-cost { font-size: 13px; font-weight: 600; color: white; font-variant-numeric: tabular-nums; }
.m-cost-conv { font-size: 10px; color: rgba(255,255,255,0.4); font-variant-numeric: tabular-nums; }

/* ═════════════════ LIGHT THEME OVERRIDES — CardBurnChart ═════════════════ */
[data-theme="light"] .glass-card {
  background: rgba(255, 250, 240, 0.85);
  border: 1px solid rgba(40, 25, 10, 0.10);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  box-shadow: 0 4px 20px rgba(40, 25, 10, 0.04);
}
[data-theme="light"] .card-header {
  border-bottom: 1px solid rgba(40, 25, 10, 0.08);
  padding-bottom: 16px;
}
[data-theme="light"] .icon-box {
  background: rgba(217, 119, 6, 0.12);
  color: #92400e;
}
[data-theme="light"] h3 {
  color: var(--text-primary);
}
[data-theme="light"] .badge.healthy {
  background: rgba(217, 119, 6, 0.12);
  color: #92400e;
  border: 1px solid rgba(217, 119, 6, 0.28);
}
[data-theme="light"] .badge.warning {
  background: rgba(234, 88, 12, 0.12);
  color: #b45309;
  border: 1px solid rgba(234, 88, 12, 0.28);
}
[data-theme="light"] .badge.critical {
  background: rgba(239, 68, 68, 0.10);
  color: #b91c1c;
  border: 1px solid rgba(239, 68, 68, 0.30);
}
[data-theme="light"] .track {
  stroke: rgba(40, 25, 10, 0.08);
}
[data-theme="light"] .segment:hover,
[data-theme="light"] .segment.active {
  filter: drop-shadow(0 0 6px rgba(40, 25, 10, 0.20));
}
[data-theme="light"] .c-label {
  color: #6b5840;
  font-weight: 700;
}
[data-theme="light"] .c-val {
  color: var(--text-primary);
}
[data-theme="light"] .c-val.main {
  color: var(--text-primary);
}
[data-theme="light"] .milestone-list::-webkit-scrollbar-thumb {
  background: rgba(40, 25, 10, 0.18);
}
[data-theme="light"] .m-row {
  background: rgba(40, 25, 10, 0.04);
  border: 1px solid rgba(40, 25, 10, 0.06);
}
[data-theme="light"] .m-row:hover,
[data-theme="light"] .m-row.active {
  background: rgba(40, 25, 10, 0.08);
  border-color: rgba(217, 119, 6, 0.25);
}
[data-theme="light"] .m-indicator {
  box-shadow: 0 0 8px rgba(40, 25, 10, 0.15);
}
[data-theme="light"] .m-name {
  color: var(--text-primary);
}
[data-theme="light"] .m-meta {
  color: #6b5840;
}
[data-theme="light"] .m-icon.pending {
  color: #b45309;
}
[data-theme="light"] .m-icon.in_progress {
  color: #ea580c;
}
[data-theme="light"] .m-icon.completed {
  color: #d97706;
}
[data-theme="light"] .m-cost {
  color: var(--text-primary);
}
[data-theme="light"] .m-cost-conv {
  color: #6b5840;
}
</style>
