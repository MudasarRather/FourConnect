<template>
  <div class="hr-input-shell" :class="{ error, disabled, focused, mono, 'has-left': $slots.left, 'has-right': $slots.right }">
    <span v-if="$slots.left" class="slot-side left">
      <slot name="left" />
    </span>
    <input
      ref="inputEl"
      :id="id"
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :autocomplete="autocomplete"
      :inputmode="inputmode"
      :maxlength="maxlength"
      class="hr-input"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
      @keydown="$emit('keydown', $event)"
    />
    <span v-if="$slots.right" class="slot-side right">
      <slot name="right" />
    </span>
  </div>
  <div v-if="error && errorText" class="hr-input-error-text">{{ errorText }}</div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  id: { type: String, default: undefined },
  modelValue: { type: [String, Number, null], default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  error: { type: Boolean, default: false },
  errorText: { type: String, default: '' },
  mono: { type: Boolean, default: false },
  autocomplete: { type: String, default: 'off' },
  inputmode: { type: String, default: undefined },
  maxlength: { type: [Number, String], default: undefined },
  // When true, strip every non-digit character on input.
  digits: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'focus', 'blur', 'keydown'])

const inputEl = ref(null)
const focused = ref(false)

const onInput = (e) => {
  let v = e.target.value
  if (props.digits) {
    const filtered = v.replace(/\D/g, '')
    if (filtered !== v) {
      // Snap the visible value back so the user can't see non-digits.
      e.target.value = filtered
      v = filtered
    }
  }
  emit('update:modelValue', v)
}
const onFocus = (e) => { focused.value = true; emit('focus', e) }
const onBlur = (e) => { focused.value = false; emit('blur', e) }

// Shake on error toggle
watch(() => props.error, (v, prev) => {
  if (v && !prev && inputEl.value) {
    inputEl.value.parentElement?.classList.remove('shake')
    void inputEl.value.parentElement?.offsetWidth
    inputEl.value.parentElement?.classList.add('shake')
  }
})

defineExpose({ focus: () => inputEl.value?.focus(), blur: () => inputEl.value?.blur() })
</script>

<style scoped>
.hr-input-shell {
  display: flex;
  align-items: center;
  height: var(--hr-input-height);
  background: var(--hr-input-bg);
  border: 1px solid var(--hr-input-border);
  border-radius: 10px;
  padding: 0 12px;
  transition: background 200ms var(--hr-spring),
              border-color 200ms var(--hr-spring),
              box-shadow 220ms var(--hr-spring);
  position: relative;
}
.hr-input-shell:hover:not(.disabled):not(.focused) {
  background: var(--hr-input-bg-hover);
  border-color: var(--hr-input-border-hover);
}
.hr-input-shell.focused {
  background: var(--hr-input-bg-focus);
  border-color: var(--hr-input-border-focus);
  box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.10);
}
.hr-input-shell.error {
  border-color: var(--hr-input-error);
  background: var(--hr-input-error-soft);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.08);
}
.hr-input-shell.disabled { opacity: 0.6; cursor: not-allowed; }
.hr-input-shell.shake { animation: hr-shake 0.42s linear; }
.hr-input-shell.has-left .hr-input { padding-left: 6px; }
.hr-input-shell.has-right .hr-input { padding-right: 6px; }
.hr-input-shell.mono .hr-input { font-family: var(--hr-mono); letter-spacing: 0.5px; }

.hr-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: 0;
  background: transparent;
  color: var(--hr-input-text);
  font-size: 13px;
  outline: none;
  font-family: inherit;
}
.hr-input::placeholder { color: var(--hr-input-placeholder); }
.hr-input:disabled { cursor: not-allowed; color: var(--hr-text-dim); }

.slot-side {
  display: inline-flex;
  align-items: center;
  color: var(--hr-text-muted);
  font-size: 12px;
}
.slot-side.left { margin-right: 6px; }
.slot-side.right { margin-left: 6px; }

.hr-input-error-text {
  color: var(--hr-input-error);
  font-size: 11px;
  margin-top: 4px;
  padding-left: 4px;
  font-weight: 500;
}
</style>
