<template>
  <div class="step-container slide-up-enter">
    <div class="step-header">
      <h2>Step 5: Support & Escalation</h2>
      <p>Configure the tiered support structure and escalation protocols.</p>
    </div>

    <div class="form-grid">
      <div class="form-section support-window">
        <h3 class="section-title text-yellow">Support Window</h3>
        
        <div class="input-row">
          <div class="input-group">
            <label :class="{ 'error-label': errors.escalations }">Availability Mode <span class="required">*</span></label>
            <SlaSelect 
              :modelValue="form.escalations[0]?.support_availability || '24x7'" 
              @update:modelValue="updateGlobalEscalation('support_availability', $event)"
              :options="availabilityOptions"
              class="premium-select"
            />
          </div>
          
          <div class="input-group" v-if="(form.escalations[0]?.support_availability || '24x7') !== '24x7'">
            <label :class="{ 'error-label': errors.escalations }">Start Time <span class="required">*</span></label>
            <input 
              type="time" 
              :value="form.escalations[0]?.support_start_time || '09:00'" 
              @input="updateGlobalEscalation('support_start_time', $event.target.value)"
              class="premium-input datetime-invert"
            />
          </div>
          
          <div class="input-group" v-if="(form.escalations[0]?.support_availability || '24x7') !== '24x7'">
            <label :class="{ 'error-label': errors.escalations }">End Time <span class="required">*</span></label>
            <input 
              type="time" 
              :value="form.escalations[0]?.support_end_time || '17:00'" 
              @input="updateGlobalEscalation('support_end_time', $event.target.value)"
              class="premium-input datetime-invert"
            />
          </div>

          <div class="input-group">
            <label :class="{ 'error-label': errors.escalations }">Timezone <span class="required">*</span></label>
            <input 
              type="text" 
              :value="form.escalations[0]?.timezone || 'UTC'" 
              @input="updateGlobalEscalation('timezone', $event.target.value)"
              placeholder="e.g. UTC, EST"
              class="premium-input"
            />
          </div>
        </div>
      </div>

      <div class="form-section matrix-section">
        <div class="table-header-row">
          <h3 :class="['section-title', { 'error-label': errors.escalations }]">Escalation Matrix <span v-if="errors.escalations" class="error-msg" style="margin-left:8px;font-size:11px;">- Please fill all table fields</span></h3>
          <button class="add-btn" @click="addEscalation">
            <Plus :size="14" /> Add Tier
          </button>
        </div>

        <div class="premium-table-wrapper">
          <table class="premium-table">
            <thead>
              <tr>
                <th width="15%">Level</th>
                <th width="20%">Role</th>
                <th width="20%">Contact Person</th>
                <th width="20%">Contact Details</th>
                <th width="20%">Escalate After</th>
                <th width="5%"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(esc, index) in localEscalations" :key="index">
                <td>
                  <input type="text" v-model="esc.level" placeholder="e.g. Level 1" class="table-input bold-input" @blur="syncToParent"/>
                </td>
                <td>
                  <input type="text" v-model="esc.role" placeholder="e.g. Support Eng" class="table-input" @blur="syncToParent"/>
                </td>
                <td>
                  <input type="text" v-model="esc.contact_person" placeholder="Name" class="table-input" @blur="syncToParent"/>
                </td>
                <td>
                  <div class="contact-inputs">
                    <input type="email" v-model="esc.email" placeholder="Email" class="table-input compact" @blur="syncToParent"/>
                    <input type="text" inputmode="numeric" :value="esc.phone" @input="updateEscPhone(index, $event.target.value)" @keypress="onlyNumeric" placeholder="Phone" class="table-input compact" @blur="syncToParent"/>
                  </div>
                </td>
                <td>
                  <input type="text" v-model="esc.response_time" placeholder="e.g. 1 hour" class="table-input" @blur="syncToParent"/>
                </td>
                <td class="text-center">
                  <button class="icon-btn delete-btn" @click="removeEscalation(index)">
                    <Trash2 :size="16" />
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
import { Plus, Trash2 } from 'lucide-vue-next'
import SlaSelect from '../../../components/ui/SlaSelect.vue'

const props = defineProps({
  form: { type: Object, required: true },
  errors: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['updateForm'])

const localEscalations = ref([])

onMounted(() => {
  if (props.form.escalations && props.form.escalations.length > 0) {
    localEscalations.value = JSON.parse(JSON.stringify(props.form.escalations))
  } else {
    // Default Tier 1
    localEscalations.value = [{
      level: 'Level 1',
      role: 'Support Desk',
      contact_person: '',
      phone: '',
      email: '',
      response_time: '1 hour',
      support_availability: '24x7',
      support_start_time: '09:00',
      support_end_time: '17:00',
      timezone: 'UTC'
    }]
    syncToParent()
  }
})

const updateGlobalEscalation = (field, value) => {
  // Global settings mapped to all escalation rows for schema consistency
  localEscalations.value.forEach(esc => {
    esc[field] = value
  })
  syncToParent()
}

const addEscalation = () => {
  const currentGlobal = localEscalations.value[0] || {}
  const nextLevel = `Level ${localEscalations.value.length + 1}`
  
  localEscalations.value.push({
    level: nextLevel,
    role: '',
    contact_person: '',
    phone: '',
    email: '',
    response_time: '',
    support_availability: currentGlobal.support_availability || '24x7',
    support_start_time: currentGlobal.support_start_time || '09:00',
    support_end_time: currentGlobal.support_end_time || '17:00',
    timezone: currentGlobal.timezone || 'UTC'
  })
  syncToParent()
}

const removeEscalation = (index) => {
  localEscalations.value.splice(index, 1)
  syncToParent()
}

const syncToParent = () => {
  emit('updateForm', 'escalations', localEscalations.value)
}

const updateEscPhone = (index, val) => {
  localEscalations.value[index].phone = val.replace(/[^0-9]/g, '')
}

const onlyNumeric = (e) => {
  if (!/[0-9]/.test(e.key)) e.preventDefault()
}

const availabilityOptions = [
  { label: '24x7 Coverage', value: '24x7' },
  { label: 'Business Hours', value: 'Business Hours' },
  { label: 'Custom Hours', value: 'Custom Hours' }
]
</script>

<style scoped>
.step-container { max-width: 900px; margin: 0 auto; }
.step-header { margin-bottom: 32px; }
.step-header h2 { font-size: 24px; font-weight: 600; margin: 0 0 8px 0; letter-spacing: -0.5px; }
.step-header p { color: rgba(255, 255, 255, 0.6); font-size: 14px; margin: 0; }

.form-grid { display: flex; flex-direction: column; gap: 32px; }
.form-section { background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 24px; }
.support-window { background: rgba(255, 235, 59, 0.02); border-color: rgba(255, 235, 59, 0.1); }
.text-yellow { color: rgba(255, 235, 59, 0.6); }

.section-title { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: rgba(255, 255, 255, 0.4); margin: 0 0 20px 0; font-weight: 600; }
.table-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.table-header-row .section-title { margin: 0; }

.input-row { display: flex; gap: 16px; align-items: flex-end;}
.input-row .input-group { flex: 1; margin-bottom: 0; }
.input-group { display: flex; flex-direction: column; gap: 8px; }
.input-group label { font-size: 12px; font-weight: 500; color: rgba(255, 255, 255, 0.7); }
.required { color: #f44336; margin-left: 2px; }
.error-label { color: #ff5252 !important; }
.error-msg { color: #ff5252; font-size: 11px; margin-left: 4px; text-transform: none; font-weight: normal; }

.premium-input { background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(255, 255, 255, 0.1); color: #fff; padding: 12px 16px; border-radius: 8px; font-size: 14px; transition: all 0.2s; width: 100%; box-sizing: border-box; }
.premium-input:focus { outline: none; border-color: #ffeb3b; box-shadow: 0 0 0 3px rgba(255, 235, 59, 0.1); }
.datetime-invert::-webkit-calendar-picker-indicator { filter: invert(1); cursor: pointer; }

.add-btn { background: rgba(255, 235, 59, 0.1); color: #ffeb3b; border: 1px solid rgba(255, 235, 59, 0.2); height: 32px; padding: 0 16px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
.add-btn:hover { background: rgba(255, 235, 59, 0.2); transform: translateY(-1px); }

.premium-table-wrapper { overflow-x: auto; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08); background: rgba(0, 0, 0, 0.3); }
.premium-table { width: 100%; border-collapse: collapse; text-align: left; }
.premium-table th { background: rgba(255, 255, 255, 0.03); color: rgba(255, 255, 255, 0.5); font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); font-weight: 600; }
.premium-table td { padding: 8px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.04); vertical-align: top; }

.table-input { width: 100%; background: transparent; border: 1px solid transparent; color: #fff; padding: 10px 12px; border-radius: 6px; font-size: 14px; transition: all 0.2s; box-sizing: border-box; }
.table-input:hover { background: rgba(255, 255, 255, 0.03); }
.table-input:focus { outline: none; background: rgba(0, 0, 0, 0.5); border-color: rgba(255, 235, 59, 0.5); }
.bold-input { font-weight: 600; color: #ffeb3b; }

.contact-inputs { display: flex; flex-direction: column; gap: 4px; }
.compact { padding: 6px 10px; font-size: 13px; }

.icon-btn { background: transparent; border: none; color: rgba(255, 255, 255, 0.3); cursor: pointer; padding: 10px; border-radius: 6px; transition: all 0.2s; }
.delete-btn:hover { background: rgba(244, 67, 54, 0.1); color: #f44336; }

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
