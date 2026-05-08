<template>
  <div class="step-container slide-up-enter">
    <div class="step-header">
      <h2>Step 7: Security & Compliance</h2>
      <p>Define the security responsibilities, data protection, and regulatory compliance standards.</p>
    </div>

    <div class="form-grid">
      <div class="form-section">
        <h3 class="section-title">Security Measures</h3>
        <p class="section-desc">Select the specific security protocols the Provider guarantees to maintain.</p>
        
        <div class="checkbox-grid">
          <label 
            v-for="measure in availableMeasures" 
            :key="measure"
            class="custom-checkbox-wrapper"
            :class="{ active: form.security_measures.includes(measure) }"
          >
            <div class="checkbox-box">
              <Check :size="14" v-if="form.security_measures.includes(measure)" />
            </div>
            <input 
              type="checkbox" 
              :value="measure" 
              :checked="form.security_measures.includes(measure)"
              @change="toggleMeasure(measure)"
              class="hidden-cb"
            />
            <span class="cb-label">{{ measure }}</span>
          </label>
        </div>
      </div>

      <div class="form-section standards-section">
        <h3 class="section-title">Compliance Standards</h3>
        <p class="section-desc">Select adherence to global regulations and standards.</p>
        
        <div class="tags-grid">
          <button 
            v-for="std in availableStandards" 
            :key="std"
            class="tag-btn"
            :class="{ active: form.compliance_standards.includes(std) }"
            @click="toggleStandard(std)"
          >
            {{ std }}
          </button>
        </div>
      </div>

      <div class="form-section">
        <h3 class="section-title">Data Policies</h3>
        
        <div class="input-row">
          <div class="input-group">
            <label>Data Retention Policy <span class="help-text">(Days/Years)</span></label>
            <input 
              type="text" 
              :value="form.data_retention_policy" 
              @input="update('data_retention_policy', $event.target.value)"
              placeholder="e.g. 7 years post-termination"
              class="premium-input"
            />
          </div>
          
          <div class="input-group">
            <label>Incident Reporting SLA <span class="help-text">(Breach Notification)</span></label>
            <input 
              type="text" 
              :value="form.incident_reporting_time" 
              @input="update('incident_reporting_time', $event.target.value)"
              placeholder="e.g. Within 24 hours of discovery"
              class="premium-input text-red"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Check } from 'lucide-vue-next'

const props = defineProps({
  form: { type: Object, required: true }
})
const emit = defineEmits(['updateForm'])

const availableMeasures = [
  'Data Encryption at Rest (AES-256)',
  'Data Encryption in Transit (TLS 1.2+)',
  'Role-Based Access Control (RBAC)',
  'Multi-Factor Authentication (MFA)',
  'Web Application Firewall (WAF)',
  'Monthly Vulnerability Scanning',
  'Annual Penetration Testing',
  'DDoS Protection',
  'Daily Immutable Backups'
]

const availableStandards = [
  'ISO/IEC 27001', 'SOC 2 Type II', 'GDPR', 
  'HIPAA', 'CCPA/CPRA', 'PCI DSS', 'FedRAMP'
]

const toggleMeasure = (item) => {
  const current = [...props.form.security_measures]
  const idx = current.indexOf(item)
  if (idx > -1) current.splice(idx, 1)
  else current.push(item)
  update('security_measures', current)
}

const toggleStandard = (item) => {
  const current = [...props.form.compliance_standards]
  const idx = current.indexOf(item)
  if (idx > -1) current.splice(idx, 1)
  else current.push(item)
  update('compliance_standards', current)
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
.standards-section { background: rgba(76, 175, 80, 0.02); border-color: rgba(76, 175, 80, 0.1); }

.section-title { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: rgba(255, 255, 255, 0.4); margin: 0 0 8px 0; font-weight: 600; }
.section-desc { font-size: 13px; color: rgba(255, 255, 255, 0.4); margin: 0 0 24px 0; }

/* Custom Checkbox Grid */
.checkbox-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.custom-checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  transition: all 0.2s ease;
  user-select: none;
}

.custom-checkbox-wrapper:hover {
  background: rgba(255, 255, 255, 0.05);
}

.custom-checkbox-wrapper.active {
  background: rgba(255, 235, 59, 0.1);
  border-color: rgba(255, 235, 59, 0.3);
}

.hidden-cb { display: none; }

.checkbox-box {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.custom-checkbox-wrapper.active .checkbox-box {
  background: #ffeb3b;
  border-color: #ffeb3b;
  color: #000;
}

.cb-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

.custom-checkbox-wrapper.active .cb-label {
  color: #ffeb3b;
}

/* Compliance Tags */
.tags-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.tag-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.tag-btn:hover { background: rgba(255, 255, 255, 0.1); }
.tag-btn.active { background: rgba(76, 175, 80, 0.15); color: #4CAF50; border-color: #4CAF50; box-shadow: 0 0 10px rgba(76, 175, 80, 0.2); }

/* Standard Inputs */
.input-row { display: flex; gap: 16px; }
.input-row .input-group { flex: 1; margin-bottom: 0; }
.input-group { display: flex; flex-direction: column; gap: 8px; }
.input-group label { font-size: 12px; font-weight: 500; color: rgba(255, 255, 255, 0.7); display: flex; align-items: center; justify-content: space-between;}
.help-text { color: rgba(255,255,255,0.3); font-weight: 400; font-size: 11px;}

.premium-input { background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(255, 255, 255, 0.1); color: #fff; padding: 12px 16px; border-radius: 8px; font-size: 14px; transition: all 0.2s; width: 100%; box-sizing: border-box; }
.premium-input:focus { outline: none; border-color: #ffeb3b; box-shadow: 0 0 0 3px rgba(255, 235, 59, 0.1); }
.text-red:focus { border-color: #f44336; box-shadow: 0 0 0 3px rgba(244, 67, 54, 0.1); }

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
