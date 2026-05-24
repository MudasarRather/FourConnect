<template>
  <div class="kpi-grid">
     <!-- Card 1: Total Paid -->
     <div class="kpi-card">
        <div class="kpi-icon total">
           <Wallet :size="20" />
        </div>
        <div class="kpi-content">
           <span class="label">Total Paid</span>
           <span class="value">{{ format(stats.total_paid) }}</span>
        </div>
     </div>

     <!-- Card 2: Remaining Budget -->
     <div class="kpi-card">
        <div class="kpi-icon pending">
           <Clock :size="20" />
        </div>
        <div class="kpi-content">
           <span class="label">Remaining Payment</span>
           <span class="value pending">{{ format(stats.remaining) }}</span>
        </div>
     </div>

      <!-- Card 3: Avg Payment -->
     <div class="kpi-card">
        <div class="kpi-icon avg">
           <BarChart2 :size="20" />
        </div>
        <div class="kpi-content">
           <span class="label">Average Payment</span>
           <span class="value">{{ format(stats.avg_payment) }}</span>
        </div>
     </div>

     <!-- Card 4: Last Payment -->
     <div class="kpi-card">
        <div class="kpi-icon last">
           <Calendar :size="20" />
        </div>
        <div class="kpi-content">
           <span class="label">Last Payment</span>
           <span class="value date">{{ stats.last_payment_date }}</span>
        </div>
     </div>

     <!-- Card 5: TDS Deductions -->
     <div class="kpi-card">
        <div class="kpi-icon tds">
           <Scissors :size="20" />
        </div>
        <div class="kpi-content">
           <span class="label">TDS Deductions</span>
           <span class="value">{{ format(stats.total_tds) }}</span>
        </div>
     </div>

     <!-- Card 6: Other Deductions -->
     <div class="kpi-card">
        <div class="kpi-icon other">
           <FileMinus :size="20" />
        </div>
        <div class="kpi-content">
           <span class="label">Other Deductions</span>
           <span class="value">{{ format(stats.total_other) }}</span>
        </div>
     </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Wallet, Clock, Calendar, BarChart2, Scissors, FileMinus } from 'lucide-vue-next'

const props = defineProps({ 
  payments: Array,
  currency: { type: String, default: 'USD' },
  project: Object
})

const stats = computed(() => {
   // Calculate totals
   const payments = props.payments || []
   
   // Actual Cash Out (Net Amount)
   const total_paid = payments.reduce((a, b) => a + Number(b.amount_paid || 0), 0)
   
   // Total Value Consumed (Gross Amount before deductions)
   const total_gross = payments.reduce((a, b) => a + Number(b.invoice_amount_gross || b.amount_paid || 0), 0)
   
   // Deductions
   const total_tds = payments.reduce((a, b) => {
       const gross = Number(b.invoice_amount_gross || 0)
       const tds = Number(b.tds_percent || 0)
       return a + (gross * tds / 100)
   }, 0)

   const total_other = payments.reduce((a, b) => {
       const gross = Number(b.invoice_amount_gross || 0)
       const other = Number(b.other_deductions || 0)
       return a + (gross * other / 100)
   }, 0)
   
   const avg_payment = payments.length ? total_paid / payments.length : 0
   
   const last_payment_date = payments[0]?.payment_date 
      ? new Date(payments[0].payment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
      : '—'

   // Remaining Payment = Project Budget - Total Gross Amount
   const projectBudget = parseFloat(props.project?.budget_amount) || 0
   const remaining = projectBudget - total_gross

   return { total_paid, avg_payment, last_payment_date, remaining, total_tds, total_other }
})

const format = (n) => {
   return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: props.currency,
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
   }).format(n)
}
</script>

<style scoped>
.kpi-grid {
   display: grid; 
   grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
   gap: 16px; margin-bottom: 24px;
}

.kpi-card {
   background: rgba(255, 255, 255, 0.03);
   backdrop-filter: blur(10px);
   border: 1px solid rgba(255, 255, 255, 0.05);
   border-radius: 16px;
   padding: 20px;
   display: flex; align-items: center; gap: 16px;
   transition: transform 0.2s, background 0.2s;
}

.kpi-card:hover {
   background: rgba(255, 255, 255, 0.05);
   transform: translateY(-2px);
}

.kpi-icon {
   width: 42px; height: 42px;
   border-radius: 12px;
   display: flex; align-items: center; justify-content: center;
}
.kpi-icon.total { background: rgba(74, 222, 128, 0.1); color: #4ade80; }
.kpi-icon.pending { background: rgba(251, 191, 36, 0.1); color: #fbbf24; }
.kpi-icon.avg { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.kpi-icon.last { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
.kpi-icon.tds { background: rgba(244, 63, 94, 0.1); color: #f43f5e; }
.kpi-icon.other { background: rgba(251, 146, 60, 0.1); color: #fb923c; }

.kpi-content {
   display: flex; flex-direction: column; gap: 4px;
}

.label {
   font-size: 11px; font-weight: 500; 
   color: rgba(255, 255, 255, 0.5); 
   text-transform: uppercase; letter-spacing: 0.05em;
}

.value {
   font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
   font-size: 20px; font-weight: 600; 
   color: #f5f5f7; letter-spacing: -0.01em;
}

.value.pending { color: #fbbf24; }
.value.date { font-size: 16px; font-weight: 500; }

/* ═════════════════════════════════════════════════════════
   LIGHT THEME OVERRIDES
   ═════════════════════════════════════════════════════════ */
[data-theme="light"] .kpi-card {
  background: rgba(255, 250, 240, 0.85);
  border: 1px solid rgba(40, 25, 10, 0.10);
  box-shadow: 0 2px 8px rgba(40, 25, 10, 0.04);
}
[data-theme="light"] .kpi-card:hover {
  background: rgba(255, 250, 240, 0.95);
  border-color: rgba(217, 119, 6, 0.22);
}
[data-theme="light"] .kpi-icon.total {
  background: rgba(5, 150, 105, 0.12);
  color: #047857;
}
[data-theme="light"] .kpi-icon.pending {
  background: rgba(217, 119, 6, 0.14);
  color: #b45309;
}
[data-theme="light"] .kpi-icon.avg {
  background: rgba(217, 119, 6, 0.12);
  color: #92400e;
}
[data-theme="light"] .kpi-icon.last {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}
[data-theme="light"] .kpi-icon.tds {
  background: rgba(220, 38, 38, 0.10);
  color: #b91c1c;
}
[data-theme="light"] .kpi-icon.other {
  background: rgba(249, 115, 22, 0.14);
  color: #c2410c;
}
[data-theme="light"] .label {
  color: #b45309;
  font-weight: 700;
}
[data-theme="light"] .value {
  color: #1a1410;
}
[data-theme="light"] .value.pending {
  color: #b45309;
}
</style>
