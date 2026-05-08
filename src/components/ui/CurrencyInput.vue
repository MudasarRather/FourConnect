<template>
  <div class="currency-input-wrapper">
    <div class="currency-input">
      <span class="currency-symbol">{{ currencySymbol }}</span>
      <input 
        type="text"
        :value="formattedValue"
        @input="handleInput"
        @blur="formatOnBlur"
        class="amount-input"
        :placeholder="placeholder"
      />
      <div class="stepper-buttons">
        <button type="button" class="step-btn" @click="increment" tabindex="-1">
          <ChevronUp :size="12" />
        </button>
        <button type="button" class="step-btn" @click="decrement" tabindex="-1">
          <ChevronDown :size="12" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ChevronUp, ChevronDown } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: [Number, String], default: '' },
  currency: { type: String, default: 'USD' },
  placeholder: { type: String, default: '0.00' },
  step: { type: Number, default: 1000 }
})

const emit = defineEmits(['update:modelValue'])

const currencySymbols = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$'
}

const currencySymbol = computed(() => currencySymbols[props.currency] || '$')

const formattedValue = computed(() => {
  if (!props.modelValue && props.modelValue !== 0) return ''
  const num = parseFloat(props.modelValue)
  if (isNaN(num)) return ''
  return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
})

const handleInput = (e) => {
  // Remove non-numeric characters except decimal point
  let raw = e.target.value.replace(/[^0-9.]/g, '')
  
  // Ensure only one decimal point
  const parts = raw.split('.')
  if (parts.length > 2) {
    raw = parts[0] + '.' + parts.slice(1).join('')
  }
  
  // Update input display with cleaned value
  e.target.value = raw
  
  // Emit as number for proper validation, or empty string if empty
  if (raw === '' || raw === '.') {
    emit('update:modelValue', '')
  } else {
    const numValue = parseFloat(raw)
    emit('update:modelValue', isNaN(numValue) ? '' : numValue)
  }
}

const formatOnBlur = () => {
  const num = parseFloat(props.modelValue)
  if (!isNaN(num)) {
    emit('update:modelValue', num)
  }
}

const increment = () => {
  const current = parseFloat(props.modelValue) || 0
  emit('update:modelValue', current + props.step)
}

const decrement = () => {
  const current = parseFloat(props.modelValue) || 0
  const newVal = current - props.step
  emit('update:modelValue', newVal >= 0 ? newVal : 0)
}
</script>

<style scoped>
.currency-input-wrapper {
  position: relative;
}

.currency-input {
  height: 36px;
  display: flex;
  align-items: center;
  background: #121214;
  border: 1px solid #3a3a3c;
  border-radius: 6px;
  overflow: hidden;
  transition: all 0.2s;
}

.currency-input:focus-within {
  border-color: #3b82f6;
  background: #000;
}

.currency-symbol {
  padding: 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: #6e6e73;
  background: rgba(255, 255, 255, 0.03);
  height: 100%;
  display: flex;
  align-items: center;
  border-right: 1px solid #3a3a3c;
}

.amount-input {
  flex: 1;
  height: 100%;
  background: transparent;
  border: none;
  padding: 0 10px;
  font-size: 13px;
  color: #f5f5f5;
  outline: none;
}

.amount-input::placeholder {
  color: #6e6e73;
}

/* Custom Stepper Buttons */
.stepper-buttons {
  display: flex;
  flex-direction: column;
  border-left: 1px solid #3a3a3c;
}

.step-btn {
  width: 24px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: #6e6e73;
  cursor: pointer;
  transition: all 0.15s;
}

.step-btn:first-child {
  border-bottom: 1px solid #3a3a3c;
}

.step-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f5f5f5;
}

.step-btn:active {
  background: rgba(59, 130, 246, 0.2);
}
</style>
