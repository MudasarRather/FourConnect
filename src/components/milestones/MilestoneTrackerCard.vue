<template>
  <div class="milestone-tracker-card glass-panel">
    <div class="tracker-header">
      <div class="title-row">
         <div class="icon-box">
           <Activity :size="18" class="text-indigo-400" />
         </div>
         <div class="header-text">
            <h3>{{ milestone.name }}</h3>
            <span class="subtitle">
               {{ milestone.project_name ? milestone.project_name : 'Active Tracking' }}
            </span>
         </div>
      </div>
      
      <div class="header-badges">
         <!-- Contribution Badge -->
         <div class="contribution-badge" title="Contribution Weightage">
            <PieChart :size="14" />
            <span>{{ totalContribution }}%</span>
         </div>
         <div class="manual-badge">In Progress</div>
      </div>
    </div>

    <!-- Tracking Form -->
    <div class="tracker-body">
       <div class="tracker-grid">
          
          <!-- Actual Start -->
          <div class="input-group">
             <label>Actual Start</label>
             <DatePicker 
                v-model="form.actual_start_date" 
                placeholder="Select Date" 
                class="tracker-input"
             />
          </div>

          <!-- Actual End -->
          <div class="input-group">
             <label>Actual End</label>
             <DatePicker 
                v-model="form.actual_end_date" 
                placeholder="Select Date" 
                class="tracker-input"
             />
          </div>

          <!-- Risk Level -->
          <div class="input-group">
             <label>Risk Level</label>
             <CustomSelect 
                v-model="form.risk_level"
                :options="riskOptions"
                placeholder="Select Risk"
                class="tracker-select"
             />
          </div>

          <!-- Delay Reason -->
          <div class="input-group full-width">
             <label>Delay / Notes</label>
             <input 
                v-model="form.delay_reason" 
                class="text-input tracker-text" 
                placeholder="Enter reason for delay or status notes..." 
             />
          </div>

       </div>
    </div>

    <div class="tracker-footer">
       <div class="last-updated" v-if="milestone.last_updated_by">
          <Clock :size="12" /> Updated by {{ milestone.last_updated_by.full_name }}
       </div>
       <div class="ml-auto">
          <button class="btn-primary-sm" @click="saveTracking" :disabled="isSubmitting">
             <Save :size="14" /> {{ isSubmitting ? 'Saving...' : 'Update Tracker' }}
          </button>
       </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Activity, PieChart, Clock, Save } from 'lucide-vue-next'
import DatePicker from '../ui/CompactDatePicker.vue'
import CustomSelect from '../ui/CustomSelect.vue'
import { useToast } from '../../composables/useToast'
import axios from 'axios'

const props = defineProps({
  milestone: { type: Object, required: true }
})

const emit = defineEmits(['refresh'])
const { addToast } = useToast()

const isSubmitting = ref(false)

const form = ref({
   actual_start_date: props.milestone.actual_start_date || '',
   actual_end_date: props.milestone.actual_end_date || '',
   risk_level: props.milestone.risk_level || 'low',
   delay_reason: props.milestone.delay_reason || ''
})

// Calculate Total Contribution from tasks
const totalContribution = computed(() => {
   if (!props.milestone.tasks) return 0
   return props.milestone.tasks.reduce((sum, t) => sum + (parseFloat(t.weightage) || 0), 0)
})

const riskOptions = [
   { label: 'Low', value: 'low' },
   { label: 'Medium', value: 'medium' },
   { label: 'High', value: 'high' }
]

const saveTracking = async () => {
   isSubmitting.value = true
   try {
      const formData = new FormData()
      if (form.value.actual_start_date) formData.append('actual_start_date', form.value.actual_start_date)
      if (form.value.actual_end_date) formData.append('actual_end_date', form.value.actual_end_date)
      if (form.value.risk_level) formData.append('risk_level', form.value.risk_level)
      if (form.value.delay_reason) formData.append('delay_reason', form.value.delay_reason)

      await axios.patch(`/api/milestones/${props.milestone.id}`, formData)
      addToast('Milestone tracking updated', 'success')
      emit('refresh')
   } catch (e) {
      console.error(e)
      addToast('Failed to update tracking', 'error')
   } finally {
      isSubmitting.value = false
   }
}

// Watch for prop changes to update local form (if switching milestones)
watch(() => props.milestone, (newVal) => {
    form.value = {
       actual_start_date: newVal.actual_start_date || '',
       actual_end_date: newVal.actual_end_date || '',
       risk_level: newVal.risk_level || 'low',
       delay_reason: newVal.delay_reason || ''
    }
}, { deep: true })
</script>

<style scoped>
.milestone-tracker-card {
  background: rgba(30, 30, 35, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  transition: all 0.2s ease;
}

.tracker-header {
  display: flex; justify-content: space-between; align-items: start;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.title-row { display: flex; gap: 12px; align-items: center; }
.icon-box {
  width: 36px; height: 36px;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.header-text h3 {
  font-size: 15px; font-weight: 600; color: #f5f5f7; margin: 0;
}
.subtitle { font-size: 11px; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.5px; }

.header-badges { display: flex; gap: 8px; }

.contribution-badge {
   display: flex; align-items: center; gap: 6px;
   background: rgba(16, 185, 129, 0.1);
   border: 1px solid rgba(16, 185, 129, 0.2);
   color: #34d399;
   padding: 4px 8px;
   border-radius: 6px;
   font-size: 12px; font-weight: 500;
}

.manual-badge {
   background: #f59e0b; color: #000;
   font-size: 11px; font-weight: 700;
   padding: 4px 8px; border-radius: 6px;
   text-transform: uppercase;
}

.tracker-grid {
   display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;
}
.full-width { grid-column: span 3; }

.input-group label {
   display: block; font-size: 11px; color: #71717a; margin-bottom: 6px;
   text-transform: uppercase; font-weight: 600;
}

.tracker-input, .tracker-select, .tracker-text {
   background: rgba(0, 0, 0, 0.2) !important;
   border: 1px solid rgba(255, 255, 255, 0.1);
}
.tracker-text { width: 100%; font-size: 13px; color: #e4e4e7; }

.tracker-footer {
   display: flex; align-items: center;
   margin-top: 16px; padding-top: 12px;
   border-top: 1px solid rgba(255, 255, 255, 0.05);
}
.last-updated {
   display: flex; align-items: center; gap: 6px;
   font-size: 11px; color: #52525b;
}

.btn-primary-sm {
   background: #3b82f6; color: white; border: none;
   padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 500;
   display: flex; align-items: center; gap: 6px; cursor: pointer;
   transition: background 0.2s;
}
.btn-primary-sm:hover { background: #2563eb; }
.btn-primary-sm:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
