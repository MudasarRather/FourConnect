<template>
  <label class="onb-field" :class="{ 'is-focused': focused, 'is-error': !!error, 'is-disabled': disabled, 'is-full': full }">
    <span v-if="label" class="onb-field-label">
      {{ label }}
      <span v-if="required" class="onb-field-req">*</span>
    </span>

    <!-- Select: delegate to HrSelect for popover-style dropdown -->
    <HrSelect
      v-if="type === 'select'"
      :model-value="modelValue ?? ''"
      :options="hrOptions"
      :placeholder="placeholder || 'Select…'"
      :disabled="disabled"
      :error="!!error"
      :error-text="error"
      @update:model-value="(v) => emit('update:modelValue', v)"
      @change="(v) => emit('update:modelValue', v)"
    />

    <!-- Date: delegate to HrDatePicker -->
    <HrDatePicker
      v-else-if="type === 'date'"
      :model-value="modelValue ?? ''"
      :placeholder="placeholder || 'dd / mm / yyyy'"
      :disabled="disabled"
      :error="!!error"
      :error-text="error"
      @update:model-value="(v) => emit('update:modelValue', v)"
    />

    <!-- Datetime-local: native (no HR component) but custom styled -->
    <div v-else-if="type === 'datetime-local'" class="onb-field-control" :data-type="type">
      <input
        type="datetime-local"
        :value="modelValue ?? ''"
        :placeholder="placeholder"
        :disabled="disabled"
        @input="onInput"
        @focus="focused = true"
        @blur="focused = false"
      />
      <span class="onb-field-underline" />
    </div>

    <!-- Textarea -->
    <div v-else-if="type === 'textarea'" class="onb-field-control" :data-type="type">
      <span v-if="$slots.prefix" class="onb-field-prefix"><slot name="prefix" /></span>
      <textarea
        :value="modelValue ?? ''"
        :placeholder="placeholder"
        :disabled="disabled"
        :rows="rows"
        @input="onInput"
        @focus="focused = true"
        @blur="focused = false"
      />
      <span v-if="$slots.suffix" class="onb-field-suffix"><slot name="suffix" /></span>
      <span class="onb-field-underline" />
    </div>

    <!-- Default: text / email / number / password -->
    <div v-else class="onb-field-control" :data-type="type">
      <span v-if="$slots.prefix" class="onb-field-prefix"><slot name="prefix" /></span>
      <input
        :type="type"
        :value="modelValue ?? ''"
        :placeholder="placeholder"
        :disabled="disabled"
        :step="step"
        :min="min"
        :max="max"
        @input="onInput"
        @focus="focused = true"
        @blur="focused = false"
      />
      <span v-if="$slots.suffix" class="onb-field-suffix"><slot name="suffix" /></span>
      <span class="onb-field-underline" />
    </div>

    <span v-if="error" class="onb-field-error">{{ error }}</span>
    <span v-else-if="hint" class="onb-field-hint">{{ hint }}</span>
  </label>
</template>

<script setup>
import { ref, computed } from 'vue'
import HrSelect from '../../../../components/hr/forms/HrSelect.vue'
import HrDatePicker from '../../../../components/hr/forms/HrDatePicker.vue'

const props = defineProps({
  modelValue: { type: [String, Number, Boolean, null], default: '' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  type: { type: String, default: 'text' },
  rows: { type: Number, default: 3 },
  step: { type: [String, Number], default: undefined },
  min: { type: [String, Number], default: undefined },
  max: { type: [String, Number], default: undefined },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  full: { type: Boolean, default: false },
  options: { type: Array, default: () => [] },
  optionKey:   { type: Function, default: (o) => (typeof o === 'object' ? (o.value ?? o.id) : o) },
  optionValue: { type: Function, default: (o) => (typeof o === 'object' ? (o.value ?? o.id) : o) },
  optionLabel: { type: Function, default: (o) => (typeof o === 'object' ? (o.label ?? o.name ?? String(o.value ?? o.id)) : String(o)) },
})
const emit = defineEmits(['update:modelValue'])

const focused = ref(false)
const onInput = (e) => emit('update:modelValue', e.target.value)

// Normalise options to HrSelect's expected shape ({ value, label, icon?, disabled? }).
const hrOptions = computed(() =>
  (props.options || []).map((o) => ({
    value: props.optionValue(o),
    label: props.optionLabel(o),
    icon: typeof o === 'object' ? o.icon : undefined,
    disabled: typeof o === 'object' ? o.disabled : false,
  }))
)
</script>

<style scoped>
.onb-field {
  display: flex; flex-direction: column; gap: 6px;
  min-width: 0;
}
.onb-field.is-full { grid-column: 1 / -1; }
.onb-field-label {
  font-size: 10px; font-weight: 700; letter-spacing: 0.6px;
  text-transform: uppercase; color: var(--hr-text-muted);
  display: inline-flex; align-items: center; gap: 4px;
  transition: color 200ms var(--hr-spring);
}
.onb-field.is-focused .onb-field-label { color: var(--hr-accent-gold); }
.onb-field.is-error .onb-field-label { color: #f87171; }
.onb-field-req { color: var(--hr-accent-gold); }

.onb-field-control {
  position: relative;
  display: flex; align-items: stretch;
  background: var(--hr-input-bg);
  border: 1px solid var(--hr-input-border);
  border-radius: 12px;
  transition: border-color 200ms var(--hr-spring),
              background 200ms var(--hr-spring),
              box-shadow 280ms var(--hr-spring);
  overflow: hidden;
}
.onb-field.is-focused .onb-field-control {
  border-color: var(--hr-accent-gold-border);
  background: var(--hr-input-bg-focus);
  box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.06),
              0 0 24px -8px rgba(251, 191, 36, 0.35);
}
.onb-field.is-error .onb-field-control {
  border-color: rgba(248, 113, 113, 0.5);
  background: rgba(248, 113, 113, 0.06);
}
.onb-field.is-disabled .onb-field-control { opacity: 0.55; cursor: not-allowed; }

.onb-field-control input,
.onb-field-control textarea {
  flex: 1; min-width: 0;
  background: transparent;
  border: 0; outline: none;
  color: var(--hr-text);
  font: inherit; font-size: 13px;
  padding: 11px 14px;
  font-family: inherit;
}
.onb-field-control textarea { resize: vertical; min-height: 80px; line-height: 1.5; }
.onb-field-control input::placeholder,
.onb-field-control textarea::placeholder {
  color: var(--hr-text-dim);
}

.onb-field-control[data-type="datetime-local"] input {
  font-family: var(--hr-mono); font-size: 12px;
  color-scheme: dark;
}
[data-theme="light"] .onb-field-control[data-type="datetime-local"] input {
  color-scheme: light;
}

.onb-field-prefix, .onb-field-suffix {
  display: inline-flex; align-items: center;
  padding: 0 12px;
  color: var(--hr-text-muted);
  font-size: 12px; font-weight: 600;
}

.onb-field-underline {
  position: absolute; left: 0; right: 0; bottom: 0;
  height: 2px;
  background: var(--hr-gradient-hero);
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 380ms var(--hr-spring);
  border-radius: 2px;
}
.onb-field.is-focused .onb-field-underline { transform: scaleX(1); }

.onb-field-error {
  font-size: 11px; color: #f87171; line-height: 1.3;
}
.onb-field-hint { font-size: 11px; color: var(--hr-text-dim); line-height: 1.3; }

/* ─── Light theme overrides — focus ring + error states ────────────────── */
[data-theme="light"] .onb-field.is-focused .onb-field-control {
  box-shadow:
    0 0 0 4px rgba(217, 119, 6, 0.14),
    0 0 24px -8px rgba(217, 119, 6, 0.35);
}
[data-theme="light"] .onb-field.is-error .onb-field-control {
  border-color: rgba(220, 38, 38, 0.50);
  background: rgba(220, 38, 38, 0.06);
}
[data-theme="light"] .onb-field.is-error .onb-field-label {
  color: #b91c1c;
}
[data-theme="light"] .onb-field-error {
  color: #b91c1c;
}
</style>
