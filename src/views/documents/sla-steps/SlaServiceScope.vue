<template>
  <div class="step-container slide-up-enter">
    <div class="step-header">
      <h2>Step 3: Service Scope</h2>
      <p>Define the specific services covered under this agreement.</p>
    </div>

    <div class="dynamic-table-section">
      <div class="table-header-row">
        <h3 :class="['section-title', { 'error-label': errors.services }]">Covered Services <span v-if="errors.services" class="error-msg">- Required (Check individual rows if empty)</span></h3>
        <button class="add-btn" @click="addService">
          <Plus :size="14" /> Add Service
        </button>
      </div>

      <div class="premium-table-wrapper">
        <table class="premium-table">
          <thead>
            <tr>
              <th width="30%">Service Name</th>
              <th width="45%">Description</th>
              <th width="20%">Category</th>
              <th width="5%" class="text-center">Act</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="localServices.length === 0">
              <td colspan="4" class="empty-state">
                <div class="empty-content">
                  <Database :size="24" class="empty-icon" />
                  <p>No services defined yet.</p>
                  <button class="text-add-btn" @click="addService">Click to add your first service component</button>
                </div>
              </td>
            </tr>
            <tr v-for="(svc, index) in localServices" :key="index" class="table-row-animate">
              <td>
                <input 
                  type="text" 
                  v-model="svc.service_name" 
                  placeholder="e.g. Server Monitoring" 
                  class="table-input"
                  @blur="syncToParent"
                />
              </td>
              <td>
                <input 
                  type="text" 
                  v-model="svc.description" 
                  placeholder="24/7 uptime tracking..." 
                  class="table-input"
                  @blur="syncToParent"
                />
              </td>
              <td>
                <SlaSelect 
                  v-model="svc.service_category" 
                  :options="categoryOptions"
                  class="table-select" 
                  @change="syncToParent"
                />
              </td>
              <td class="text-center">
                <button class="icon-btn delete-btn" @click="removeService(index)">
                  <Trash2 :size="16" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { Plus, Trash2, Database } from 'lucide-vue-next'
import SlaSelect from '../../../components/ui/SlaSelect.vue'

const props = defineProps({
  form: { type: Object, required: true },
  errors: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['updateForm'])

// Local reactive array to build the table
const localServices = ref([])

onMounted(() => {
  if (props.form.services && props.form.services.length > 0) {
    localServices.value = JSON.parse(JSON.stringify(props.form.services))
  } else {
    // Add one default empty row to start
    localServices.value = [{
      service_name: '',
      description: '',
      service_category: 'Infrastructure',
      metrics: [] // Needs to be preserved for Step 4
    }]
    syncToParent()
  }
})

const addService = () => {
  localServices.value.push({
    service_name: '',
    description: '',
    service_category: 'Infrastructure',
    metrics: []
  })
  syncToParent()
}

const removeService = (index) => {
  localServices.value.splice(index, 1)
  syncToParent()
}

const syncToParent = () => {
  emit('updateForm', 'services', localServices.value)
}

const categoryOptions = [
  'Infrastructure',
  'Application',
  'Network',
  'Security',
  'Database'
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

.dynamic-table-section {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.table-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
  font-weight: 600;
}

.add-btn {
  background: rgba(255, 235, 59, 0.1);
  color: #ffeb3b;
  border: 1px solid rgba(255, 235, 59, 0.2);
  height: 32px;
  padding: 0 16px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.add-btn:hover {
  background: rgba(255, 235, 59, 0.2);
  transform: translateY(-1px);
}

.premium-table-wrapper {
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.3);
}

.premium-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.premium-table th {
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-weight: 600;
}

.premium-table td {
  padding: 8px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.premium-table tr:last-child td {
  border-bottom: none;
}

.table-input {
  width: 100%;
  background: transparent;
  border: 1px solid transparent;
  color: #fff;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s;
  box-sizing: border-box;
}

.table-input:hover {
  background: rgba(255, 255, 255, 0.03);
}

.table-input:focus {
  outline: none;
  background: rgba(0, 0, 0, 0.5);
  border-color: rgba(255, 235, 59, 0.5);
}

.text-center {
  text-align: center;
}

.icon-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.delete-btn:hover {
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
}

.empty-state {
  padding: 40px !important;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.3);
}

.empty-icon {
  margin-bottom: 12px;
  color: rgba(255, 255, 255, 0.2);
}

.empty-content p {
  margin: 0 0 8px 0;
  font-size: 14px;
}

.text-add-btn {
  background: transparent;
  border: none;
  color: #ffeb3b;
  font-size: 13px;
  cursor: pointer;
  text-decoration: underline;
}

.table-row-animate {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; background: rgba(255, 235, 59, 0.1); }
  to { opacity: 1; background: transparent; }
}

.slide-up-enter {
  animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
