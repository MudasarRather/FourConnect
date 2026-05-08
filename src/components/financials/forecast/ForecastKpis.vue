<template>
  <div class="forecast-kpis">
     <div class="kpi-block glass-panel">
         <!-- Risk Alert if Overrun -->
         <div v-if="data.expected_overrun > 0" class="risk-banner">
            <AlertTriangle :size="18" />
            <span>Projected Overrun: ${{ format(data.expected_overrun) }}</span>
         </div>
         
         <div class="stats-grid">
             <div class="stat">
                <span class="label">EAC (Total Forecast)</span>
                <span class="value lg">${{ format(data.forecast_total_cost) }}</span>
             </div>
             <div class="stat">
                <span class="label">Budget Variance</span>
                <span class="value" :class="data.expected_overrun > 0 ? 'text-rose-400' : 'text-emerald-400'">
                   {{ data.expected_overrun > 0 ? '+' : '' }}${{ format(data.expected_overrun) }}
                </span>
             </div>
             <div class="stat">
                <span class="label">CPI (Cost Performance)</span>
                <span class="value mono">1.0</span> <!-- Mocked CPI for now -->
             </div>
         </div>
     </div>
  </div>
</template>

<script setup>
import { AlertTriangle } from 'lucide-vue-next'

const props = defineProps({ data: Object })

const format = (n) => n ? Number(n).toLocaleString() : '0'
</script>

<style scoped>
.kpi-block { padding: 0; overflow: hidden; background: #18181b; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; margin-bottom: 24px; }
.risk-banner {
   background: rgba(244, 63, 94, 0.1); color: #f43f5e; padding: 12px 20px;
   display: flex; align-items: center; gap: 10px; font-weight: 600; font-size: 13px;
   border-bottom: 1px solid rgba(244, 63, 94, 0.2);
}

.stats-grid { display: flex; padding: 24px; gap: 40px; }
.stat { display: flex; flex-direction: column; gap: 6px; }
.label { font-size: 11px; text-transform: uppercase; color: rgba(255,255,255,0.4); font-weight: 600; }
.value { font-size: 20px; font-weight: 700; color: white; font-family: 'SF Mono', monospace; }
.lg { font-size: 28px; }
.mono { color: #f59e0b; }
</style>
