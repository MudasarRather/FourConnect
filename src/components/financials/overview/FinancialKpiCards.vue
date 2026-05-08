<template>
  <div class="kpi-grid">
     <!-- Approved Budget -->
     <div class="kpi-card content-card" v-for="(card, i) in cards" :key="i" :class="'delay-' + i">
        <div class="card-header-mini">
           <div class="icon-box" :class="card.colorClass">
              <component :is="card.icon" :size="20" />
           </div>
           <span class="label">{{ card.label }}</span>
        </div>
        
        <div class="card-body">
           <div class="value-row">
              <span class="value">{{ card.display }}</span>
           </div>
           
           <div class="trend-row" v-if="card.subLabel">
              <div class="trend-indicator" :class="card.trendClass">
                 <component :is="card.trendIcon" :size="12" v-if="card.trendIcon" />
                 <span>{{ card.subLabel }}</span>
              </div>
           </div>
           
           <!-- Decorative Geometry -->
           <div class="geo-shape" :class="card.colorClass"></div>
        </div>
     </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Wallet, CreditCard, Layers, PieChart, TrendingUp, TrendingDown, AlertCircle } from 'lucide-vue-next'

const props = defineProps({
  summary: { type: Object, default: () => ({}) }
})

const getSymbol = (curr) => {
   const map = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'INR': '₹', 'JPY': '¥' }
   return map[curr] || '$'
}

const formatCompact = (num, curr) => {
   const symbol = getSymbol(curr || 'USD')
   const val = new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(num || 0)
   return symbol + val
}

// Smart percentage formatting - shows more precision for small values
const formatPercent = (pct) => {
   if (pct === null || pct === undefined) return '0%'
   if (pct === 0) return '0%'
   if (pct < 0.1) return '<0.1%'
   if (pct < 1) return pct.toFixed(2) + '%'
   if (pct < 10) return pct.toFixed(1) + '%'
   return Math.round(pct) + '%'
}

const cards = computed(() => [
   { 
      label: 'Project Budget', 
      value: props.summary.total_budget, 
      display: formatCompact(props.summary.total_budget, props.summary.currency),
      icon: Wallet, 
      colorClass: 'theme-orange',
      subLabel: 'Total Allocation',
      trendClass: 'neutral',
      trendIcon: Layers
   },
   { 
      label: 'Actual Spend', 
      value: props.summary.total_spent, 
      display: formatCompact(props.summary.total_spent, props.summary.currency),
      icon: CreditCard, 
      colorClass: 'theme-yellow',
      subLabel: `${formatPercent(props.summary.budget_utilized_percentage)} Utilized`,
      trendClass: (props.summary.budget_utilized_percentage || 0) > 80 ? 'danger' : 'success',
      trendIcon: (props.summary.budget_utilized_percentage || 0) > 80 ? TrendingUp : TrendingDown
   },
   { 
      label: 'Milestone Budget', 
      value: props.summary.milestone_budget, 
      display: formatCompact(props.summary.milestone_budget, props.summary.currency),
      icon: Layers, 
      colorClass: 'theme-teal',
      subLabel: `${formatPercent(props.summary.milestone_allocation_percentage)} of Project Budget`,
      trendClass: 'neutral',
      trendIcon: null
   },
   { 
      label: 'Remaining Budget', 
      value: props.summary.forecast_variance || 0, 
      display: formatCompact(props.summary.forecast_variance, props.summary.currency),
      icon: PieChart, 
      colorClass: 'theme-red',
      subLabel: 'Available Funds',
      trendClass: props.summary.forecast_variance > 0 ? 'success' : 'danger',
      trendIcon: props.summary.forecast_variance > 0 ? TrendingUp : TrendingDown
   }
])
</script>

<style scoped>
.kpi-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-bottom: 24px;
}

/* Base Card Style matching ProjectDetails */
.content-card {
  background: rgba(30, 30, 33, 0.4);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 24px;
  position: relative;
  overflow: hidden;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s;
  animation: fadeUp 0.6s ease-out forwards;
  opacity: 0;
}

.content-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
  border-color: rgba(255,255,255,0.15);
}

.card-header-mini {
  display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
}

.icon-box {
  width: 42px; height: 42px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  /* Glassy inner look */
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
}

.label {
  font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.05em;
}

.card-body { position: relative; z-index: 2; }

.value-row { display: flex; align-items: flex-start; gap: 2px; margin-bottom: 8px; }
.currency { font-size: 18px; color: rgba(255,255,255,0.4); font-weight: 600; margin-top: 4px; }
.value { font-size: 32px; font-weight: 700; color: white; letter-spacing: -0.02em; line-height: 1; }

.trend-row { display: flex; align-items: center; }
.trend-indicator {
  font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 20px;
  display: flex; align-items: center; gap: 6px;
}
.neutral { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.6); }
.success { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.danger { background: rgba(244, 63, 94, 0.1); color: #f43f5e; }

/* Themes - Orange/Yellow/Amber */
.theme-orange { color: #f97316; }
.theme-orange .icon-box { background: linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(249, 115, 22, 0.02)); border-color: rgba(249, 115, 22, 0.2); }

.theme-yellow { color: #eab308; }
.theme-yellow .icon-box { background: linear-gradient(135deg, rgba(234, 179, 8, 0.1), rgba(234, 179, 8, 0.02)); border-color: rgba(234, 179, 8, 0.2); }

.theme-amber { color: #f59e0b; }
.theme-amber .icon-box { background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.02)); border-color: rgba(245, 158, 11, 0.2); }

.theme-red { color: #f43f5e; }
.theme-red .icon-box { background: linear-gradient(135deg, rgba(244, 63, 94, 0.1), rgba(244, 63, 94, 0.02)); border-color: rgba(244, 63, 94, 0.2); }

.theme-teal { color: #14b8a6; }
.theme-teal .icon-box { background: linear-gradient(135deg, rgba(20, 184, 166, 0.1), rgba(20, 184, 166, 0.02)); border-color: rgba(20, 184, 166, 0.2); }


/* Geometric Decoration */
.geo-shape {
  position: absolute; right: -40px; top: -40px;
  width: 140px; height: 140px; border-radius: 50%;
  background: radial-gradient(circle, currentColor 0%, transparent 70%);
  opacity: 0.05; pointer-events: none; z-index: 1;
}

/* Animations */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.delay-0 { animation-delay: 0.1s; }
.delay-1 { animation-delay: 0.2s; }
.delay-2 { animation-delay: 0.3s; }
.delay-3 { animation-delay: 0.4s; }
</style>
