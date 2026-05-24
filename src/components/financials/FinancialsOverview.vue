<template>
  <div class="financial-overview-container">
     
     <!-- 1. KPIs -->
     <FinancialKpiCards :summary="summary" />

   <!-- 2. Charts Grid -->
     <div class="charts-grid-bento">
        <!-- Main Spend Trend -->
        <div class="grid-span-2">
           <SpendTrendChart :milestones="milestones" :summary="summary" />
        </div>

        <!-- Allocation Donut -->
        <div class="grid-span-1">
           <CategoryBreakdownChart 
              :milestones="milestones" 
              :totalBudget="summary.total_budget" 
              :currency="summary.currency"
           />
        </div>

        <!-- Budget vs Actual Bar - Now Full Width Row -->
        <div class="grid-span-3">
           <BudgetVsActualChart :formattedData="budgetVsActualData" />
        </div>
     </div>
     
     <!-- Floating Quick Actions Widget -->
     <QuickFinancialActions @action="handleAction" />

  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed, defineAsyncComponent } from 'vue'
import axios from 'axios'

// Sub-components
import FinancialKpiCards from './overview/FinancialKpiCards.vue'
import BudgetVsActualChart from './overview/BudgetVsActualChart.vue'
import SpendTrendChart from './overview/SpendTrendChart.vue'
import CategoryBreakdownChart from './overview/CategoryBreakdownChart.vue'
import QuickFinancialActions from './overview/QuickFinancialActions.vue'
import { API } from '@/utils/api'

const props = defineProps({
  projectId: String,
  token: String,
  project: Object
})

// Data
const summary = ref({})
const payments = ref([])
const milestones = ref([])

const fetchData = async () => {
   if (!props.projectId) {
      console.log('No projectId provided')
      return
   }
   
   console.log('Fetching financial data for project:', props.projectId, 'Token exists:', !!props.token)
   
   try {
       const headers = { Authorization: `Bearer ${props.token}` }
       
       // Fetch all data in parallel
       const [sumRes, payRes, milRes] = await Promise.all([
            axios.get(`${API}/project-financials/${props.projectId}/financials/summary`, { headers }).catch(e => { console.error('Summary API error:', e); return { data: null } }),
            axios.get(`${API}/project-financials/${props.projectId}/payments`, { headers }).catch(e => { console.error('Payments API error:', e); return { data: [] } }),
            axios.get(`${API}/projects/${props.projectId}/milestones`, { headers }).catch(e => { console.error('Milestones API error:', e); return { data: [] } })
       ])
       
       payments.value = payRes.data || []
       milestones.value = milRes.data || []
       
       // If summary API returns valid data with actual budget, use it
       if (sumRes.data && sumRes.data.total_budget > 0) {
           summary.value = sumRes.data
       } else {
           // Use project prop passed from parent as fallback
           const project = props.project
           console.log('Using project prop as fallback:', project)
           
           if (project) {
               const totalBudget = project.budget_amount || 0
               const currency = project.currency || 'USD'
               const milestoneBudget = milestones.value.reduce((sum, m) => sum + (parseFloat(m.budget_amount) || 0), 0)
               const actualSpend = milestones.value.filter(m => m.status === 'completed').reduce((sum, m) => sum + (parseFloat(m.budget_amount) || 0), 0)
               
               summary.value = {
                   total_budget: totalBudget,
                   total_spent: actualSpend,
                   remaining_budget: totalBudget - actualSpend,
                   milestone_budget: milestoneBudget,
                   currency: currency,
                   burn_rate: totalBudget > 0 ? (actualSpend / totalBudget * 100) : 0,
                   forecast_variance: totalBudget - actualSpend,
                   budget_utilized_percentage: totalBudget > 0 ? (actualSpend / totalBudget * 100) : 0,
                   milestone_allocation_percentage: totalBudget > 0 ? (milestoneBudget / totalBudget * 100) : 0
               }
           }
       }
       
       console.log('Financial Dashboard Data:', { summary: summary.value, milestones: milestones.value, payments: payments.value })
       
   } catch (e) {
       console.error("Failed to fetch dashboard data", e)
   }
}

watch(() => props.projectId, fetchData)
onMounted(fetchData)

// Data Formatting for Charts
const budgetVsActualData = computed(() => {
   return {
      budget: summary.value.total_budget || 0,
      milestone_budget: summary.value.milestone_budget || 0,
      actual: summary.value.total_spent || 0,
      currency: summary.value.currency || 'USD'
   }
})

const handleAction = (action) => {
   console.log("Action:", action)
   // Logic to open modals
}
</script>

<style scoped>
.financial-overview-container {
  animation: fadeIn 0.4s ease-out;
}

.charts-grid-bento {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
}
.grid-span-2 { grid-column: span 2; height: 320px; }
.grid-span-3 { grid-column: span 3; height: 320px; }
.grid-span-1 { grid-column: span 1; height: 320px; }

.actions-col { display: flex; flex-direction: column; gap: 24px; }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
