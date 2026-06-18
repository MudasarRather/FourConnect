<template>
  <label class="trn-field" :class="{ inline: type === 'toggle' }">
    <span v-if="label" class="tf-label">{{ label }}<i v-if="required" class="req">*</i></span>

    <template v-if="type === 'select'">
      <select class="tf-input" :value="modelValue" @change="$emit('update:modelValue', $event.target.value)">
        <option v-if="placeholder" value="">{{ placeholder }}</option>
        <option v-for="o in normalizedOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
    </template>

    <template v-else-if="type === 'textarea'">
      <textarea class="tf-input" :rows="rows" :placeholder="placeholder" :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)" />
    </template>

    <template v-else-if="type === 'toggle'">
      <button type="button" class="tf-toggle" :class="{ on: modelValue }" role="switch" :aria-checked="modelValue"
        @click="$emit('update:modelValue', !modelValue)"><span class="knob" /></button>
    </template>

    <template v-else>
      <input class="tf-input" :type="type" :placeholder="placeholder" :step="step" :value="modelValue"
        @input="$emit('update:modelValue', type === 'number' ? ($event.target.value === '' ? null : Number($event.target.value)) : $event.target.value)" />
    </template>

    <span v-if="hint" class="tf-hint">{{ hint }}</span>
  </label>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  modelValue: { type: [String, Number, Boolean, null], default: '' },
  label: { type: String, default: '' },
  type: { type: String, default: 'text' }, // text | number | date | select | textarea | toggle
  placeholder: { type: String, default: '' },
  options: { type: Array, default: () => [] },  // [string] or [{value,label}]
  required: { type: Boolean, default: false },
  hint: { type: String, default: '' },
  rows: { type: Number, default: 3 },
  step: { type: String, default: null },
})
defineEmits(['update:modelValue'])
const normalizedOptions = computed(() =>
  props.options.map(o => (typeof o === 'object' ? o : { value: o, label: String(o).replace(/_/g, ' ') }))
)
</script>

<style scoped>
.trn-field { display: flex; flex-direction: column; gap: 6px; }
.trn-field.inline { flex-direction: row; align-items: center; justify-content: space-between; }
.tf-label { font-size: 12px; font-weight: 600; color: var(--trn-text-secondary); }
.tf-label .req { color: var(--trn-st-failed); margin-left: 2px; font-style: normal; }
.tf-input { width: 100%; font: inherit; font-size: 13.5px; color: var(--trn-text);
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); border-radius: 11px; padding: 9px 12px;
  transition: border-color 0.2s, box-shadow 0.2s; }
.tf-input:focus { outline: none; border-color: color-mix(in srgb, var(--trn-amber) 55%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--trn-amber) 14%, transparent); }
select.tf-input { cursor: pointer; }
textarea.tf-input { resize: vertical; min-height: 64px; }
.tf-hint { font-size: 11px; color: var(--trn-text-dim); }
.tf-toggle { position: relative; width: 42px; height: 24px; border-radius: 999px; border: 1px solid var(--trn-border-strong);
  background: var(--trn-surface); cursor: pointer; transition: background 0.25s, border-color 0.25s; flex-shrink: 0; }
.tf-toggle .knob { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%;
  background: var(--trn-text-muted); transition: transform 0.25s var(--trn-spring), background 0.25s; }
.tf-toggle.on { background: color-mix(in srgb, var(--trn-amber) 30%, transparent); border-color: var(--trn-amber); }
.tf-toggle.on .knob { transform: translateX(18px); background: var(--trn-amber-bright); }
</style>
