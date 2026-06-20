<template>
  <label class="af" :class="{ full }">
    <span v-if="label" class="af-lab">{{ label }} <i v-if="required">*</i></span>
    <textarea v-if="type === 'textarea'" class="af-input af-textarea" :value="modelValue" :rows="rows" :placeholder="placeholder"
      @input="$emit('update:modelValue', $event.target.value)" />
    <AsSelect v-else-if="type === 'select'" :model-value="modelValue" :options="selectOptions"
      :placeholder="placeholder || 'Select…'" @update:model-value="$emit('update:modelValue', $event)" />
    <input v-else class="af-input" :type="type" :value="modelValue" :placeholder="placeholder" :step="step" :min="min"
      @input="$emit('update:modelValue', type === 'number' ? ($event.target.value === '' ? null : Number($event.target.value)) : $event.target.value)" />
  </label>
</template>

<script setup>
import { computed } from 'vue'
import AsSelect from './AsSelect.vue'

const props = defineProps({
  modelValue: { type: [String, Number, Boolean, null], default: '' },
  label: { type: String, default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  options: { type: Array, default: () => [] },
  rows: { type: Number, default: 3 },
  full: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  step: { type: [String, Number], default: undefined },
  min: { type: [String, Number], default: undefined },
})
defineEmits(['update:modelValue'])

// Normalise options and prepend an explicit "none/all" entry when a placeholder
// is provided, so the value is still resettable in the new custom dropdown.
const selectOptions = computed(() => {
  const norm = props.options.map(o => (o && typeof o === 'object') ? o : { value: o, label: String(o) })
  return props.placeholder ? [{ value: '', label: props.placeholder }, ...norm] : norm
})
</script>

<style scoped>
.af { display: flex; flex-direction: column; gap: 6px; }
.af.full { grid-column: 1 / -1; }
.af-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-dim); }
.af-lab i { color: var(--as-amber); font-style: normal; }
.af-input { width: 100%; box-sizing: border-box; font: inherit; font-size: 13.5px; color: var(--as-text);
  background: var(--as-surface); border: 1px solid var(--as-border-soft); border-radius: 11px; padding: 9px 12px;
  transition: border-color 0.2s, box-shadow 0.2s; color-scheme: dark; }
[data-theme="light"] .af-input { color-scheme: light; }
.af-input::placeholder { color: var(--as-text-dim); }
.af-input:focus { outline: none; border-color: color-mix(in srgb, var(--as-amber) 55%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--as-amber) 12%, transparent); }
.af-textarea { resize: vertical; min-height: 64px; }
</style>
