<template>
  <div class="forecast-tab">
     <div class="header-row">
        <h2>Financial Forecast</h2>
     </div>

     <div class="forecast-grid">
        <div class="main-col">
           <ForecastKpis :data="forecastData" />
           <!-- Placeholder for Trend Chart (can reuse SpendTrendChart or make a specific one) -->
           <div class="chart-box glass-panel">
              <h3>Burn Rate Projection</h3>
              <div class="placeholder-chart">
                 <!-- Reusing SpendTrend for now but labeled differently -->
                 <SpendTrendChart :payments="payments" style="height: 100%;" />
              </div>
           </div>
        </div>

        <div class="side-col">
           <ForecastInputPanel 
              v-model="manualEAC"
              @save="handleUpdateForecast"
           />
        </div>
     </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'
import ForecastKpis from './forecast/ForecastKpis.vue'
import ForecastInputPanel from './forecast/ForecastInputPanel.vue'
import SpendTrendChart from './overview/SpendTrendChart.vue' // Reuse for now

const props = defineProps({ projectId: String, token: String })
const forecastData = ref({})
const manualEAC = ref(0)
const payments = ref([]) // Needed for the chart

const fetchForecast = async () => {
   try {
      const headers = { Authorization: `Bearer ${props.token}` }
      const [forecastRes, paymentsRes] = await Promise.all([
         axios.get(`http://localhost:8000/api/project-financials/${props.projectId}/financials/forecast`, { headers }),
         axios.get(`http://localhost:8000/api/project-financials/${props.projectId}/payments`, { headers })
      ])
      forecastData.value = forecastRes.data
      manualEAC.value = forecastRes.data.forecast_total_cost
      payments.value = paymentsRes.data
   } catch (e) { console.error(e) }
}

const handleUpdateForecast = async () => {
   try {
      await axios.put(`http://localhost:8000/api/project-financials/${props.projectId}/financials/forecast`, {
         forecast_total_cost: manualEAC.value
      }, {
         headers: { Authorization: `Bearer ${props.token}` }
      })
      // Refresh
      fetchForecast()
   } catch (e) { console.error('Failed to update forecast', e) }
}

onMounted(fetchForecast)
</script>

<style scoped>
.forecast-tab { animation: fadeIn 0.4s ease-out; }
.header-row { margin-bottom: 24px; }
h2 { font-size: 20px; font-weight: 600; color: white; margin: 0; }

.forecast-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }

.chart-box { padding: 20px; height: 350px; display: flex; flex-direction: column; }
.chart-box h3 { font-size: 14px; color: white; margin-bottom: 16px; }
.placeholder-chart { flex: 1; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
