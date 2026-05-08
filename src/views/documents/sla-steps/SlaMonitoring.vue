<template>
  <div class="step-container slide-up-enter">
    <div class="step-header">
      <h2>Step 6: Monitoring & Reporting</h2>
      <p>Configure how service performance is tracked and reported to the client.</p>
    </div>

    <div class="form-grid">
      <div class="form-section">
        <h3 class="section-title">Telemetry & Tooling</h3>
        
        <div class="input-group">
          <label>Monitoring Tools <span class="help-text">(Select multiple)</span></label>
          <div class="tool-tags-container">
            <button 
              v-for="tool in availableTools" 
              :key="tool"
              class="tag-btn"
              :class="{ active: form.monitoring_tools.includes(tool) }"
              @click="toggleTool(tool)"
            >
              {{ tool }}
            </button>
          </div>
        </div>

        <div class="input-group mt-4">
          <label>Monitoring Dashboard URL</label>
          <input 
            type="url" 
            :value="form.monitoring_dashboard_url" 
            @input="update('monitoring_dashboard_url', $event.target.value)"
            placeholder="https://status.example.com"
            class="premium-input"
          />
        </div>
        
        <div class="input-group mt-4">
          <label>Automated Alert Notification Email</label>
          <input 
            type="email" 
            :value="form.alert_notification_email" 
            @input="update('alert_notification_email', $event.target.value)"
            placeholder="alerts@client.com"
            class="premium-input"
          />
        </div>
      </div>

      <div class="form-section">
        <h3 class="section-title">Reporting Cadence</h3>
        
        <div class="input-row">
          <div class="input-group">
            <label>Reporting Frequency</label>
            <SlaSelect 
              :modelValue="form.reporting_frequency" 
              @update:modelValue="update('reporting_frequency', $event)"
              :options="reportingFrequencyOptions"
            />
          </div>
          
          <div class="input-group">
            <label>Delivery Method</label>
            <SlaSelect 
              :modelValue="form.report_delivery_method" 
              @update:modelValue="update('report_delivery_method', $event)"
              :options="reportDeliveryMethodOptions"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import SlaSelect from '../../../components/ui/SlaSelect.vue'

const props = defineProps({
  form: { type: Object, required: true }
})
const emit = defineEmits(['updateForm'])

const availableTools = [
  'Prometheus', 'Datadog', 'Zabbix', 'New Relic', 
  'CloudWatch', 'Grafana', 'Splunk', 'SolarWinds', 'Custom Internal'
]

const reportingFrequencyOptions = [
  'Daily',
  'Weekly',
  'Monthly',
  'Quarterly'
]

const reportDeliveryMethodOptions = [
  { label: 'Email Attachment', value: 'Email' },
  { label: 'Client Portal Upload', value: 'Portal' },
  { label: 'Automated API Push', value: 'Automated' },
  { label: 'Review Meeting', value: 'Meeting' }
]

const toggleTool = (tool) => {
  const current = [...props.form.monitoring_tools]
  const idx = current.indexOf(tool)
  if (idx > -1) {
    current.splice(idx, 1)
  } else {
    current.push(tool)
  }
  update('monitoring_tools', current)
}

const update = (key, value) => {
  emit('updateForm', key, value)
}
</script>

<style scoped>
.step-container { max-width: 800px; margin: 0 auto; }
.step-header { margin-bottom: 32px; }
.step-header h2 { font-size: 24px; font-weight: 600; margin: 0 0 8px 0; letter-spacing: -0.5px; }
.step-header p { color: rgba(255, 255, 255, 0.6); font-size: 14px; margin: 0; }

.form-grid { display: flex; flex-direction: column; gap: 32px; }
.form-section { background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 24px; }
.section-title { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: rgba(255, 255, 255, 0.4); margin: 0 0 20px 0; font-weight: 600; }

.input-row { display: flex; gap: 16px; }
.input-row .input-group { flex: 1; margin-bottom: 0; }
.input-group { display: flex; flex-direction: column; gap: 8px; }
.input-group label { font-size: 12px; font-weight: 500; color: rgba(255, 255, 255, 0.7); display: flex; align-items: center; justify-content: space-between;}
.help-text { color: rgba(255,255,255,0.3); font-weight: 400; font-size: 11px;}
.mt-4 { margin-top: 16px; }

.tool-tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.tag-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.tag-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.tag-btn.active {
  background: rgba(255, 235, 59, 0.15);
  color: #ffeb3b;
  border-color: rgba(255, 235, 59, 0.5);
  box-shadow: 0 0 10px rgba(255, 235, 59, 0.1);
}

.premium-input { background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(255, 255, 255, 0.1); color: #fff; padding: 12px 16px; border-radius: 8px; font-size: 14px; transition: all 0.2s; width: 100%; box-sizing: border-box; }
.premium-input:focus { outline: none; border-color: #ffeb3b; box-shadow: 0 0 0 3px rgba(255, 235, 59, 0.1); }

.slide-up-enter { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

/* DEEP CSS OVERRIDES FOR APPLE-GRADE GLASSMORPHISM */
:deep(.premium-select .select-selected),
:deep(input.premium-input), 
:deep(textarea.premium-textarea), 
:deep(input.table-input), 
:deep(input[type="text"]), 
:deep(input[type="number"]), 
:deep(input[type="email"]), 
:deep(select),
:deep(textarea), 
:deep(.design-select .select-selected) {
    background: rgba(255,255,255,0.03) !important; 
    border: 1px solid rgba(255,255,255,0.08) !important;
    border-radius: 8px !important;
    padding: 10px 14px !important;
    color: #fff !important; 
    font-size: 14px !important;
    font-weight: 400 !important;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important; 
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.1) !important;
    backdrop-filter: blur(10px) !important;
    font-family: 'Inter', sans-serif !important;
    height: auto !important;
}

:deep(select option) { background: #1a1a1c !important; color: #fff !important; }

:deep(input:focus), :deep(textarea:focus), :deep(select:focus), :deep(.design-select .select-selected:focus), :deep(.premium-select .select-selected:focus) { 
    border-color: rgba(245,158,11,0.4) !important; 
    background: rgba(255,255,255,0.06) !important;
    outline: none !important;
    box-shadow: 0 0 0 3px rgba(245,158,11,0.1), inset 0 2px 4px rgba(0,0,0,0.1) !important;
}
</style>
