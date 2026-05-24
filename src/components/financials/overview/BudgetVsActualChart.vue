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
  animation: card-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
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
  width: 220px; height: 220px;
  top: -80px; right: -50px;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.20), transparent 70%);
  animation: card-orb-a 12s ease-in-out infinite;
}
.content-card::after {
  width: 180px; height: 180px;
  bottom: -60px; left: -40px;
  background: radial-gradient(circle, rgba(20, 184, 166, 0.14), transparent 70%);
  animation: card-orb-b 16s ease-in-out infinite;
}
.content-card > * { position: relative; z-index: 1; }

@keyframes card-enter {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes card-orb-a {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-15px, 20px) scale(1.08); }
}
@keyframes card-orb-b {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(20px, -15px) scale(1.10); }
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
  font-weight: 800;
  padding: 5px 14px;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border: 1px solid transparent;
  position: relative;
  animation: badge-breathe 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
.variance-badge::before {
  content: "";
  position: absolute; inset: -1px;
  border-radius: 999px;
  background: inherit;
  filter: blur(8px);
  opacity: 0.45;
  z-index: -1;
}

.variance-badge.positive {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.18), rgba(34, 197, 94, 0.06));
  color: #22c55e;
  border-color: rgba(34, 197, 94, 0.35);
}
.variance-badge.negative {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(239, 68, 68, 0.06));
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.35);
}
.variance-badge.neutral {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.18), rgba(251, 191, 36, 0.06));
  color: #fbbf24;
  border-color: rgba(251, 191, 36, 0.35);
}

@keyframes badge-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

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

/* Animated Progress Bars — with shimmer sweep */
.progress-track {
  height: 8px;
  background: rgba(255,255,255,0.06);
  border-radius: 99px;
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.20);
}

.progress-fill {
  height: 100%;
  border-radius: 99px;
  width: 0;
  transition: width 1.2s cubic-bezier(0.16, 1, 0.3, 1);
  transition-delay: calc(var(--delay, 0) * 0.15s + 0.3s);
  position: relative;
  overflow: hidden;
}

.progress-fill::after {
  content: "";
  position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.45), transparent);
  transform: translateX(-100%);
  animation: progress-shimmer 2.6s linear infinite;
  animation-delay: calc(var(--delay, 0) * 0.2s + 1.2s);
}

@keyframes progress-shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.progress-fill.animate {
  width: var(--target-width, 100%);
}

.budget-fill {
  background: linear-gradient(90deg, #fbbf24, #f59e0b);
  --target-width: 100%;
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.50);
}
.allocation-fill {
  background: linear-gradient(90deg, #14b8a6, #0d9488);
  box-shadow: 0 0 12px rgba(20, 184, 166, 0.45);
}
.spent-fill {
  background: linear-gradient(90deg, #f97316, #ea580c);
  box-shadow: 0 0 12px rgba(249, 115, 22, 0.50);
}
.remaining-fill {
  background: linear-gradient(90deg, #22c55e, #16a34a);
  box-shadow: 0 0 12px rgba(34, 197, 94, 0.45);
}

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
  background: radial-gradient(circle, rgba(20, 184, 166, 0.18), transparent 70%);
}

/* Variance badge — light variants with breathing glow */
[data-theme="light"] .variance-badge.positive {
  background: linear-gradient(135deg, rgba(5, 150, 105, 0.20), rgba(5, 150, 105, 0.06));
  color: #047857;
  border-color: rgba(5, 150, 105, 0.40);
}
[data-theme="light"] .variance-badge.negative {
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.16), rgba(220, 38, 38, 0.04));
  color: #b91c1c;
  border-color: rgba(220, 38, 38, 0.40);
}
[data-theme="light"] .variance-badge.neutral {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.20), rgba(217, 119, 6, 0.06));
  color: #b45309;
  border-color: rgba(217, 119, 6, 0.40);
}

[data-theme="light"] .progress-fill::after {
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.65), transparent);
}
[data-theme="light"] h3 {
  color: #b45309;
  font-weight: 700;
}
[data-theme="light"] .variance-badge.positive {
  background: rgba(5, 150, 105, 0.14);
  color: #047857;
}
[data-theme="light"] .variance-badge.negative {
  background: rgba(220, 38, 38, 0.10);
  color: #b91c1c;
}
[data-theme="light"] .variance-badge.neutral {
  background: rgba(217, 119, 6, 0.12);
  color: #b45309;
}
[data-theme="light"] .metric-item {
  background: rgba(255, 250, 240, 0.55);
  border: 1px solid rgba(40, 25, 10, 0.08);
}
[data-theme="light"] .metric-item:hover {
  background: rgba(217, 119, 6, 0.08);
  border-color: rgba(217, 119, 6, 0.22);
}
[data-theme="light"] .budget-icon {
  background: rgba(251, 191, 36, 0.20);
  color: #b45309;
}
[data-theme="light"] .allocation-icon {
  background: rgba(20, 184, 166, 0.18);
  color: #0d9488;
}
[data-theme="light"] .spent-icon {
  background: rgba(249, 115, 22, 0.20);
  color: #c2410c;
}
[data-theme="light"] .remaining-icon {
  background: rgba(5, 150, 105, 0.16);
  color: #047857;
}
[data-theme="light"] .metric-label {
  color: #92400e;
  font-weight: 600;
}
[data-theme="light"] .metric-value { color: #1a1410; }
[data-theme="light"] .metric-value.spent-val { color: #c2410c; }
[data-theme="light"] .metric-value.remaining-val { color: #047857; }
[data-theme="light"] .metric-percent { color: #6b5840; }
[data-theme="light"] .progress-track {
  background: rgba(40, 25, 10, 0.08);
}
[data-theme="light"] .summary-footer {
  background: rgba(255, 250, 240, 0.55);
  border: 1px solid rgba(40, 25, 10, 0.08);
}
[data-theme="light"] .summary-divider {
  background: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .summary-label {
  color: #b45309;
  font-weight: 700;
}
[data-theme="light"] .summary-value { color: #1a1410; }
[data-theme="light"] .summary-value.success { color: #047857; }
[data-theme="light"] .summary-value.warning { color: #b45309; }
[data-theme="light"] .summary-value.danger { color: #b91c1c; }
[data-theme="light"] .summary-value.neutral { color: #92400e; }
</style>
