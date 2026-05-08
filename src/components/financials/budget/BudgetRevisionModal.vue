<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card">
       <div class="modal-header">
          <h3>{{ isEdit ? 'Revise Budget' : 'New Budget Allocation' }}</h3>
          <button class="close-btn" @click="$emit('close')"><X :size="18" /></button>
       </div>
       
       <div class="modal-body">
          <div class="row">
             <div class="form-group half">
                <label>Budget Type</label>
                <select v-model="form.budget_type">
                   <option>Capex</option>
                   <option>Opex</option>
                </select>
             </div>
             <div class="form-group half">
                <label>Amount (USD)</label>
                <input type="number" v-model="form.allocated_amount" />
             </div>
          </div>

          <div class="form-group">
             <label>Funding Source</label>
             <input v-model="form.funding_source" placeholder="e.g. Q4 Operations Fund" />
          </div>

          <div class="form-group">
            <label>Cost Center</label>
            <input v-model="form.cost_center" placeholder="e.g. CC-102" />
          </div>

          <div class="form-group">
             <label>Justification</label>
             <textarea v-model="form.justification" rows="3" placeholder="Reason for this allocation..."></textarea>
          </div>
       </div>

       <div class="modal-footer">
          <button class="btn-cancel" @click="$emit('close')">Cancel</button>
          <button class="btn-primary" @click="submit">{{ isEdit ? 'Save Revision' : 'Allocate' }}</button>
       </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  initialData: Object,
  isEdit: Boolean
})
const emit = defineEmits(['close', 'save'])

const form = ref({
   budget_type: 'Opex',
   allocated_amount: 0,
   funding_source: '',
   cost_center: '',
   justification: ''
})

watch(() => props.initialData, (newVal) => {
   if (newVal) form.value = { ...newVal }
}, { immediate: true })

const submit = () => {
   emit('save', form.value)
   emit('close')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.modal-card {
  width: 500px; background: #18181b; border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5);
}
.modal-header {
  padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.05);
  display: flex; justify-content: space-between; align-items: center;
}
h3 { margin: 0; color: white; font-size: 16px; font-weight: 600; }
.close-btn { background: transparent; border: none; color: rgba(255,255,255,0.4); cursor: pointer; }

.modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.row { display: flex; gap: 16px; }
.half { flex: 1; }

.form-group { display: flex; flex-direction: column; gap: 6px; }
label { font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.5); text-transform: uppercase; }
input, select, textarea {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);
  padding: 10px; border-radius: 8px; color: white; font-size: 13px; outline: none;
  font-family: inherit;
}
input:focus, select:focus, textarea:focus { border-color: #3b82f6; }

.modal-footer {
  padding: 16px 24px; background: rgba(255,255,255,0.02);
  display: flex; justify-content: flex-end; gap: 12px;
}
.btn-cancel { background: transparent; border: none; color: rgba(255,255,255,0.6); cursor: pointer; font-size: 13px; }
.btn-primary { 
  background: #3b82f6; color: white; border: none; padding: 8px 20px; 
  border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer;
}
</style>
