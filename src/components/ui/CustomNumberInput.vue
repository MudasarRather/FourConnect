<template>
  <div class="custom-number-input" :class="{ 'has-error': error, 'is-disabled': disabled }">
    <input
      :value="modelValue"
      type="number"
      :placeholder="placeholder"
      :min="min"
      :max="max"
      :step="step"
      class="number-input-field"
      @input="updateValue"
      @keydown="handleKeyDown"
      @blur="$emit('blur', $event)"
    />
  </div>
</template>

<script setup>
defineProps({
  modelValue: [Number, String],
  placeholder: String,
  min: Number,
  max: Number,
  step: Number,
  error: Boolean,
  disabled: Boolean
})

const emit = defineEmits(['update:modelValue', 'blur'])

const handleKeyDown = (e) => {
    // Block invalid chars explicitly ('e', '+', '-')
    if (['e', 'E', '+', '-'].includes(e.key)) {
        e.preventDefault()
        return
    }
    
    // Allow Controls (Backspace, Delete, Tab, arrows, etc.)
    const controls = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
    if (controls.includes(e.key) || e.ctrlKey || e.metaKey) return
    
    // Allow Numbers
    if (/^[0-9]$/.test(e.key)) return
    
    // Allow Decimal (required for budget)
    if (e.key === '.') return
    
    // Block Everything Else (Alphabets, Symbols, Spaces)
    e.preventDefault()
}

const updateValue = (e) => {
  emit('update:modelValue', e.target.value)
}
</script>

<style scoped>
.custom-number-input {
  position: relative;
  width: 100%;
}

.number-input-field {
  width: 100%;
  height: 36px;
  background: #121214;
  border: 1px solid #3a3a3c;
  border-radius: 6px;
  padding: 0 12px;
  color: #f5f5f5;
  font-size: 13px;
  font-family: inherit;
  transition: all 0.2s;
  
  /* Hide arrows */
  -moz-appearance: textfield;
}

.number-input-field::-webkit-outer-spin-button,
.number-input-field::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.number-input-field:focus {
  outline: none;
  border-color: #3b82f6;
  background: #1a1a1c;
}

.has-error .number-input-field {
  border-color: #ef4444;
}

.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
