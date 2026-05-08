<template>
  <div class="glass-card">
    <div class="card-header">
      <div class="header-left">
        <div class="icon-box"><Wallet :size="16" /></div>
        <h3>Budget</h3>
      </div>
      <!-- Budget Type Pill (Capex/Opex) -->
      <span class="badge" :class="type?.toLowerCase()">{{ type || 'Opex' }}</span>
    </div>

    <div class="budget-content">
      <div class="big-num">
        <span class="curr">{{ currency }}</span>
        <span class="amt">{{ formatCompact(amount) }}</span>
      </div>

      <div class="progress-wrap">
        <div class="p-track">
           <div class="p-fill" :style="{ width: percentUsed + '%' }"></div>
        </div>
      </div>

      <div class="legend-row">
        <div class="l-item">
          <div class="dot used"></div>
          <span class="l-label">Used ({{ percentUsed }}%)</span>
          <span class="l-val">{{ formatCompact(usedAmount) }}</span>
        </div>
        <div class="l-item">
          <div class="dot rem"></div>
          <span class="l-label">Remaining ({{ 100 - percentUsed }}%)</span>
          <span class="l-val">{{ formatCompact(remainingAmount) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Wallet } from 'lucide-vue-next'

const props = defineProps({
  amount: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  type: { type: String, default: 'Opex' },
  milestones: { type: Array, default: () => [] },
  usedAmountOverride: { type: Number, default: null } // New prop
})

// Exchange Rates (Mocked, same as BurnChart)
// ... (keep logic for local dev/fallback if override missing) ...
const EXCHANGE_RATES = {
  'USD': 1, 'EUR': 0.92, 'GBP': 0.79, 'INR': 83.5, 
  'AUD': 1.52, 'CAD': 1.35, 'JPY': 150.0
}
const convertAmount = (amt, from, to) => {
  if (!amt) return 0
  if (from === to) return amt
  const fromRate = EXCHANGE_RATES[from] || 1
  const toRate = EXCHANGE_RATES[to] || 1
  return (amt / fromRate) * toRate
}

const usedAmount = computed(() => {
   if (props.usedAmountOverride !== null && props.usedAmountOverride !== undefined) {
       return props.usedAmountOverride
   }
   return props.milestones.reduce((sum, m) => {
       const mBudget = m.budget_amount || 0
       const normalized = convertAmount(mBudget, m.currency || 'USD', props.currency)
       return sum + normalized
   }, 0)
})

const remainingAmount = computed(() => Math.max(0, props.amount - usedAmount.value))

const percentUsed = computed(() => {
   if (!props.amount) return 0
   return Math.min(100, Math.round((usedAmount.value / props.amount) * 100))
})

const formatCompact = (val) => {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(val)
}
</script>

<style scoped>
.glass-card {
  background: rgba(30, 30, 33, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 24px;
  backdrop-filter: blur(12px);
  display: flex; flex-direction: column;
}

.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.header-left { display: flex; align-items: center; gap: 10px; }
.icon-box { 
  width: 28px; height: 28px; background: rgba(255, 255, 255, 0.05); 
  border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #a1a1aa;
}
h3 { font-size: 14px; font-weight: 600; color: rgba(255, 255, 255, 0.9); margin: 0; }

.badge { 
  font-size: 10px; padding: 4px 8px; border-radius: 6px; 
  text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;
}
.badge.capex { background: rgba(236, 72, 153, 0.15); color: #f472b6; }
.badge.opex { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }

.budget-content { display: flex; flex-direction: column; gap: 16px; }
.big-num { display: flex; align-items: baseline; gap: 4px; }
.curr { font-size: 14px; color: #71717a; font-weight: 500; }
.amt { font-size: 28px; font-weight: 700; color: white; line-height: 1; }

.progress-wrap { width: 100%; }
.p-track { height: 6px; background: rgba(255, 255, 255, 0.1); border-radius: 3px; overflow: hidden; }
.p-fill { height: 100%; background: linear-gradient(90deg, #ec4899, #8b5cf6); border-radius: 3px; transition: width 0.5s ease; }

.legend-row { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
.l-item { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #a1a1aa; }
.l-label { flex: 1; }
.l-val { color: white; font-weight: 600; }
.dot { width: 6px; height: 6px; border-radius: 50%; }
.used { background: #ec4899; }
.rem { background: #3f3f46; }
</style>
