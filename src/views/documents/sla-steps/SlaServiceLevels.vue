<template>
  <div class="step-container slide-up-enter">
    <div class="step-header">
      <h2>Step 4: Service Levels & Metrics</h2>
      <p>Define measurable performance metrics for the services covered in Step 3.</p>
    </div>

    <!-- Iterate through the services defined in step 3 -->
    <div v-if="localServices.length === 0" class="global-empty-state">
      <div class="alert-box">
        <Server :size="24" class="alert-icon" />
        <div class="alert-text">
          <h4>No Services Defined</h4>
          <p>Please return to Step 3 and define your Service Scope before attaching metrics.</p>
        </div>
      </div>
    </div>

    <div v-else class="metrics-grid">
      <div v-for="(svc, svcIndex) in localServices" :key="svcIndex" class="service-metrics-card">
        <div class="card-header">
          <div class="svc-info">
            <span class="svc-badge">{{ svc.service_category || 'Uncategorized' }}</span>
            <h3 :class="['svc-name', { 'error-label': errors.metrics }]">{{ svc.service_name || 'Unnamed Service' }} <span v-if="errors.metrics" class="error-msg">- Fill all metric rows</span></h3>
          </div>
          <button class="add-metric-btn" @click="addMetric(svcIndex)">
            <Plus :size="14" /> Add Metric
          </button>
        </div>

        <div class="metrics-table-wrapper">
          <table class="premium-table">
            <thead>
              <tr>
                <th width="15%">Priority</th>
                <th width="20%">Response Target</th>
                <th width="20%">Resolution Target</th>
                <th width="20%">Uptime Commitment</th>
                <th width="20%">Measurement Method</th>
                <th width="5%"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!svc.metrics || svc.metrics.length === 0">
                <td colspan="6" class="empty-state text-center">
                  <span class="dim-text">No metrics attached to this service.</span>
                </td>
              </tr>
              <tr v-for="(metric, mIndex) in svc.metrics" :key="mIndex">
                <td>
                  <SlaSelect 
                    v-model="metric.priority_level" 
                    :options="priorityOptions"
                    class="table-select priority-select" 
                    :class="metric.priority_level?.toLowerCase()" 
                    @change="syncToParent"
                  />
                </td>
                <td>
                  <input type="text" v-model="metric.response_time" placeholder="e.g. 15 min" class="table-input" @blur="syncToParent"/>
                </td>
                <td>
                  <input type="text" v-model="metric.resolution_time" placeholder="e.g. 2 hours" class="table-input" @blur="syncToParent"/>
                </td>
                <td>
                  <input type="text" v-model="metric.uptime_commitment" placeholder="e.g. 99.99%" class="table-input" @blur="syncToParent"/>
                </td>
                <td>
                  <input type="text" v-model="metric.measurement_method" placeholder="Monitoring Tool" class="table-input" @blur="syncToParent"/>
                </td>
                <td class="text-center">
                  <button class="icon-btn delete-btn" @click="removeMetric(svcIndex, mIndex)">
                    <X :size="16" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Plus, X, Server } from 'lucide-vue-next'
import SlaSelect from '../../../components/ui/SlaSelect.vue'

const props = defineProps({
  form: { type: Object, required: true },
  errors: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['updateForm'])

const localServices = ref([])

onMounted(() => {
  // We edit the same 'services' nested array as step 3
  if (props.form.services) {
    localServices.value = JSON.parse(JSON.stringify(props.form.services))
  }
})

const addMetric = (svcIndex) => {
  if (!localServices.value[svcIndex].metrics) {
    localServices.value[svcIndex].metrics = []
  }
  localServices.value[svcIndex].metrics.push({
    priority_level: 'High',
    response_time: '',
    resolution_time: '',
    uptime_commitment: '',
    measurement_method: ''
  })
  syncToParent()
}

const removeMetric = (svcIndex, mIndex) => {
  localServices.value[svcIndex].metrics.splice(mIndex, 1)
  syncToParent()
}

const syncToParent = () => {
  emit('updateForm', 'services', localServices.value)
}

const priorityOptions = [
  'Critical',
  'High',
  'Medium',
  'Low'
]
</script>

<style scoped>
.step-container {
  max-width: 900px;
  margin: 0 auto;
}

.step-header {
  margin-bottom: 32px;
}

.step-header h2 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px 0;
  letter-spacing: -0.5px;
}

.step-header p {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  margin: 0;
}

.alert-box {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.2);
  padding: 24px;
  border-radius: 8px;
  color: #fff;
}

.alert-icon {
  color: #f44336;
}

.alert-text h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  color: #f44336;
}

.alert-text p {
  margin: 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

.metrics-grid {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.service-metrics-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.svc-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.svc-badge {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 4px 8px;
  background: rgba(255, 235, 59, 0.1);
  color: #ffeb3b;
  border-radius: 4px;
}

.svc-name {
  font-size: 16px;
  font-weight: 500;
  margin: 0;
  color: #fff;
}

.add-metric-btn {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  height: 28px;
  padding: 0 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.add-metric-btn:hover {
  background: rgba(255, 235, 59, 0.1);
  color: #ffeb3b;
  border-color: rgba(255, 235, 59, 0.3);
}

.metrics-table-wrapper {
  overflow-x: auto;
}

.premium-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.premium-table th {
  background: transparent;
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 12px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-weight: 600;
}

.premium-table td {
  padding: 8px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.02);
}

.premium-table tr:hover td {
  background: rgba(255, 255, 255, 0.01);
}

.table-input {
  width: 100%;
  background: transparent;
  border: 1px solid transparent;
  color: #fff;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  transition: all 0.2s;
  box-sizing: border-box;
}

.priority-select.critical { color: #f44336; font-weight: 600; }
.priority-select.high { color: #ff9800; font-weight: 600; }
.priority-select.medium { color: #2196f3; }
.priority-select.low { color: #9e9e9e; }

.table-input:hover { background: rgba(255, 255, 255, 0.03); }
.table-input:focus { outline: none; background: rgba(0, 0, 0, 0.5); border-color: rgba(255, 235, 59, 0.5); }

.text-center { text-align: center; }
.dim-text { color: rgba(255, 255, 255, 0.3); font-size: 13px; }

.icon-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.2);
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  transition: all 0.2s;
}
.delete-btn:hover { color: #f44336; background: rgba(244, 67, 54, 0.1); }

.slide-up-enter { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>
