<template>
  <div class="input-panel glass-panel">
     <h3>Forecast Adjustments</h3>
     <p class="desc">Manually adjust the Estimate at Completion (EAC) based on new risks or scope changes.</p>
     
     <div class="control-row">
        <label>Estimated Final Cost</label>
        <div class="input-wrap">
           <span>$</span>
           <input type="number" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />
        </div>
     </div>

     <div class="actions">
        <button class="btn-save" @click="$emit('save')">Update Forecast</button>
     </div>
  </div>
</template>

<script setup>
defineProps(['modelValue'])
defineEmits(['update:modelValue', 'save'])
</script>

<style scoped>
.glass-panel { background: #18181b; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 24px; }
h3 { margin: 0 0 8px 0; font-size: 16px; color: white; }
.desc { margin: 0 0 24px 0; font-size: 13px; color: rgba(255,255,255,0.5); line-height: 1.4; }

.control-row { margin-bottom: 24px; }
label { display: block; font-size: 11px; text-transform: uppercase; color: rgba(255,255,255,0.5); font-weight: 600; margin-bottom: 8px; }

.input-wrap {
   display: flex; align-items: center; background: rgba(255,255,255,0.03);
   border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 0 12px;
}
.input-wrap span { color: rgba(255,255,255,0.3); font-weight: 600; }
input {
   background: transparent; border: none; padding: 12px; color: white; font-size: 16px; 
   font-family: 'SF Mono', monospace; width: 100%; outline: none;
}

.btn-save {
   width: 100%; padding: 12px; border-radius: 8px; border: none;
   background: #3b82f6; color: white; font-weight: 600; cursor: pointer; transition: background 0.2s;
}
.btn-save:hover { background: #2563eb; }

/* ═════════════════════════════════════════════════════════
   LIGHT THEME OVERRIDES
   ═════════════════════════════════════════════════════════ */
[data-theme="light"] .glass-panel {
  background: rgba(255, 250, 240, 0.85);
  border: 1px solid rgba(40, 25, 10, 0.10);
  box-shadow: 0 2px 8px rgba(40, 25, 10, 0.04);
}
[data-theme="light"] h3 { color: #1a1410; }
[data-theme="light"] .desc { color: #6b5840; }
[data-theme="light"] label {
  color: #b45309;
  font-weight: 700;
}
[data-theme="light"] .input-wrap {
  background: rgba(255, 250, 240, 0.55);
  border: 1px solid rgba(217, 119, 6, 0.22);
}
[data-theme="light"] .input-wrap:focus-within {
  border-color: #d97706;
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.14);
}
[data-theme="light"] .input-wrap span { color: #b45309; }
[data-theme="light"] input { color: #1a1410; }
[data-theme="light"] .btn-save {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fff;
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.30);
}
[data-theme="light"] .btn-save:hover {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
}
</style>
