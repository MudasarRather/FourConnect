<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card">
       <div class="modal-header">
          <h3>Upload Document</h3>
          <button class="close-btn" @click="$emit('close')"><X :size="18" /></button>
       </div>
       
       <div class="modal-body">
          <div class="form-group">
             <label>Document Name</label>
             <input v-model="form.file_name" placeholder="E.g. Oct Invoice" />
          </div>
          
          <div class="form-group">
             <label>Category</label>
             <select v-model="form.category">
                <option>Invoice</option>
                <option>Contract</option>
                <option>Purchase Order</option>
                <option>Receipt</option>
                <option>Other</option>
             </select>
          </div>

          <div class="form-group">
             <label>File URL (Mock)</label>
             <input v-model="form.file_url" placeholder="https://..." />
          </div>
       </div>

       <div class="modal-footer">
          <button class="btn-cancel" @click="$emit('close')">Cancel</button>
          <button class="btn-primary" @click="submit" :disabled="!form.file_name || !form.file_url">Upload</button>
       </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { X } from 'lucide-vue-next'

const emit = defineEmits(['close', 'upload'])
const form = ref({
   file_name: '',
   category: 'Invoice',
   file_url: '',
   file_size_bytes: 1024 // Mock size
})

const submit = () => {
   emit('upload', form.value)
   emit('close')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.modal-card {
  width: 400px; background: #18181b; border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5);
}
.modal-header {
  padding: 16px 24px; border-bottom: 1px solid rgba(255,255,255,0.05);
  display: flex; justify-content: space-between; align-items: center;
}
h3 { margin: 0; color: white; font-size: 16px; font-weight: 600; }
.close-btn { background: transparent; border: none; color: rgba(255,255,255,0.4); cursor: pointer; }
.close-btn:hover { color: white; }

.modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
label { font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.5); text-transform: uppercase; }
input, select {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);
  padding: 10px; border-radius: 8px; color: white; font-size: 13px; outline: none;
}
input:focus, select:focus { border-color: #3b82f6; }

.modal-footer {
  padding: 16px 24px; background: rgba(255,255,255,0.02);
  display: flex; justify-content: flex-end; gap: 12px;
}
.btn-cancel { background: transparent; border: none; color: rgba(255,255,255,0.6); cursor: pointer; font-size: 13px; }
.btn-primary { 
  background: #3b82f6; color: white; border: none; padding: 8px 20px; 
  border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer;
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
