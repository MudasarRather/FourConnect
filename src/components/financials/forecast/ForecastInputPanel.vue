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
</style>
