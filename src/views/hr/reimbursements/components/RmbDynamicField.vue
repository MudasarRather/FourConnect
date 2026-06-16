<template>
  <label class="rmb-field">
    <span class="lbl">{{ spec.label }}<i v-if="spec.required" class="req">*</i></span>

    <select v-if="spec.type === 'select'" class="rmb-input" :value="modelValue"
            @change="$emit('update:modelValue', $event.target.value)">
      <option value="">Select…</option>
      <option v-for="o in (spec.options || [])" :key="o" :value="o">{{ o }}</option>
    </select>

    <textarea v-else-if="spec.type === 'textarea'" class="rmb-input" rows="2"
              :placeholder="spec.placeholder || ''" :value="modelValue"
              @input="$emit('update:modelValue', $event.target.value)"></textarea>

    <!-- date → shared calendar picker (matches HR onboarding/assets) -->
    <HrDatePicker v-else-if="spec.type === 'date'"
                  :model-value="modelValue || ''"
                  :placeholder="spec.placeholder || 'dd / mm / yyyy'"
                  @update:model-value="$emit('update:modelValue', $event)" />

    <!-- number / currency → numeric-only, no spinner arrows -->
    <input v-else-if="spec.type === 'number' || spec.type === 'currency'" type="text"
           inputmode="decimal" class="rmb-input no-spin"
           :placeholder="spec.placeholder || ''" :value="modelValue"
           @input="onNumeric" @keydown="blockNonNumeric" />

    <input v-else type="text" class="rmb-input" :placeholder="spec.placeholder || ''" :value="modelValue"
           @input="$emit('update:modelValue', $event.target.value)" />
  </label>
</template>

<script setup>
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'

const props = defineProps({
  spec: { type: Object, required: true },
  modelValue: { type: [String, Number], default: '' },
})
const emit = defineEmits(['update:modelValue'])

// keep only digits + a single decimal point
function sanitize(v) {
  let s = String(v).replace(/[^\d.]/g, '')
  const i = s.indexOf('.')
  if (i !== -1) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '')
  return s
}
function onNumeric(e) {
  const clean = sanitize(e.target.value)
  if (clean !== e.target.value) e.target.value = clean
  emit('update:modelValue', clean)
}
function blockNonNumeric(e) {
  if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault()
}
</script>

<style scoped>
.rmb-field { display: flex; flex-direction: column; gap: 6px; }
.lbl { font-size: 11.5px; font-weight: 600; color: var(--rmb-text-secondary); letter-spacing: 0.2px; }
.req { color: var(--rmb-st-rejected); margin-left: 3px; font-style: normal; }
.rmb-input {
  width: 100%; box-sizing: border-box;
  background: var(--hr-input-bg); color: var(--rmb-text);
  border: 1px solid var(--hr-input-border); border-radius: 9px;
  padding: 9px 11px; font-size: 13px; font-family: inherit;
  transition: border-color 0.2s, background 0.2s;
}
.rmb-input:focus { outline: none; border-color: var(--rmb-st-pending); background: var(--hr-input-bg-focus); }
.rmb-input::placeholder { color: var(--rmb-text-muted); }
select.rmb-input { cursor: pointer; }
/* strip native number spinner arrows */
.no-spin::-webkit-outer-spin-button, .no-spin::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.no-spin { -moz-appearance: textfield; appearance: textfield; }
[data-theme="light"] .rmb-input { background: rgba(40,25,10,0.04); border-color: rgba(40,25,10,0.14); }
[data-theme="light"] .rmb-input:focus { background: #fffdf8; border-color: var(--rmb-st-pending); }
</style>
