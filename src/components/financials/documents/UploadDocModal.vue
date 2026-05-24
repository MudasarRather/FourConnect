<template>
  <Teleport to="body">
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
  </Teleport>
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
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0, 0, 0, 0.40);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
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

/* ═════════════════════════════════════════════════════════
   LIGHT THEME OVERRIDES — clean cream modal (NO muddy blur)
   ═════════════════════════════════════════════════════════ */

/* Overlay — modal is now Teleported to body, so backdrop-filter works
   cleanly across the full viewport (same effect as Record Payment modal) */
[data-theme="light"] .modal-overlay {
  background: rgba(26, 20, 16, 0.32);
  backdrop-filter: blur(8px) saturate(140%);
  -webkit-backdrop-filter: blur(8px) saturate(140%);
}

/* Modal panel: solid cream surface (no double-blur), strong shadow + amber ring */
[data-theme="light"] .modal-card {
  background: #faf7f0;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border: 1px solid rgba(217, 119, 6, 0.30);
  box-shadow:
    0 30px 80px rgba(40, 25, 10, 0.30),
    0 12px 24px rgba(40, 25, 10, 0.14),
    0 0 0 1px rgba(255, 255, 255, 0.60) inset;
  animation: udm-pop 0.40s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes udm-pop {
  from { opacity: 0; transform: scale(0.94) translateY(16px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

[data-theme="light"] .modal-header {
  background: rgba(217, 119, 6, 0.06);
  border-bottom: 1px solid rgba(40, 25, 10, 0.10);
}
[data-theme="light"] h3 {
  background: linear-gradient(135deg, #92400e 0%, #d97706 60%, #b45309 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: transparent;
  font-weight: 700;
}
[data-theme="light"] .close-btn { color: #6b5840; }
[data-theme="light"] .close-btn:hover { color: #92400e; }

[data-theme="light"] .modal-body {
  background: transparent;
}

[data-theme="light"] label {
  color: #b45309;
  font-weight: 700;
  letter-spacing: 0.05em;
}
[data-theme="light"] input,
[data-theme="light"] select {
  background: #ffffff;
  border: 1px solid rgba(217, 119, 6, 0.32);
  color: #1a1410;
}
[data-theme="light"] input::placeholder {
  color: rgba(26, 20, 16, 0.40);
}
[data-theme="light"] input:focus,
[data-theme="light"] select:focus {
  border-color: #d97706;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.18);
  outline: none;
}

[data-theme="light"] .modal-footer {
  background: rgba(217, 119, 6, 0.05);
  border-top: 1px solid rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .btn-cancel {
  background: rgba(255, 250, 240, 0.80);
  border: 1px solid rgba(217, 119, 6, 0.30);
  color: #6b5840;
  padding: 8px 20px;
  border-radius: 8px;
  font-weight: 600;
  transition: background 0.20s ease, color 0.20s ease, border-color 0.20s ease;
}
[data-theme="light"] .btn-cancel:hover {
  background: rgba(217, 119, 6, 0.14);
  color: #92400e;
  border-color: rgba(217, 119, 6, 0.50);
}
[data-theme="light"] .btn-primary {
  background: linear-gradient(135deg, #d97706, #b45309);
  color: #fff;
  box-shadow: 0 6px 18px rgba(217, 119, 6, 0.32);
  transition: transform 0.20s ease, box-shadow 0.20s ease, background 0.20s ease;
}
[data-theme="light"] .btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #c2410c, #92400e);
  box-shadow: 0 10px 24px rgba(217, 119, 6, 0.42);
  transform: translateY(-1px);
}
[data-theme="light"] .btn-primary:disabled {
  background: rgba(40, 25, 10, 0.14);
  color: rgba(26, 20, 16, 0.40);
  box-shadow: none;
}
</style>
