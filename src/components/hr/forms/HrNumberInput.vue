<template>
  <div class="hr-num-shell" :class="{ error, disabled, focused }">
    <input
      ref="inputEl"
      :id="id"
      :value="display"
      type="text"
      inputmode="numeric"
      pattern="[0-9]*"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      class="hr-num-input"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
      @keydown="onKey"
    />
    <div class="hr-num-steppers">
      <button type="button" class="step-btn" :disabled="disabled || atMax" @click="step(+stepBy)" tabindex="-1" aria-label="Increase">
        <svg viewBox="0 0 10 6" width="10" height="6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,5 5,1 9,5" /></svg>
      </button>
      <button type="button" class="step-btn" :disabled="disabled || atMin" @click="step(-stepBy)" tabindex="-1" aria-label="Decrease">
        <svg viewBox="0 0 10 6" width="10" height="6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,1 5,5 9,1" /></svg>
      </button>
    </div>
  </div>
  <div v-if="error && errorText" class="hr-input-error-text">{{ errorText }}</div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  id: { type: String, default: undefined },
  modelValue: { type: [Number, String, null], default: null },
  placeholder: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  error: { type: Boolean, default: false },
  errorText: { type: String, default: '' },
  min: { type: Number, default: null },
  max: { type: Number, default: null },
  stepBy: { type: Number, default: 1 },
  // When true, allow decimal entry (e.g. "2.5"). Defaults to true if stepBy is non-integer.
  allowDecimal: { type: Boolean, default: undefined },
  // Optional cap on decimal places (only used when decimals are allowed).
  decimals: { type: Number, default: 2 },
})
const emit = defineEmits(['update:modelValue'])

const inputEl = ref(null)
const focused = ref(false)

const decimalsAllowed = computed(() =>
  props.allowDecimal === undefined ? !Number.isInteger(props.stepBy) : props.allowDecimal
)

const display = computed(() => (props.modelValue === null || props.modelValue === undefined ? '' : String(props.modelValue)))

const atMin = computed(() => props.min !== null && Number(props.modelValue ?? 0) <= props.min)
const atMax = computed(() => props.max !== null && Number(props.modelValue ?? 0) >= props.max)

// Soft normalization while typing — only validates type, NOT range.
// Range clamping happens on blur so users can type intermediate values
// like "2" on the way to "2024" without being snapped to min=1950.
const roundDecimals = (n) => {
  if (decimalsAllowed.value && Number.isInteger(props.decimals)) {
    const factor = Math.pow(10, props.decimals)
    return Math.round(n * factor) / factor
  }
  return n
}

const clampRange = (v) => {
  if (v === '' || v === null) return null
  let n = Number(v)
  if (Number.isNaN(n)) return props.modelValue
  if (props.min !== null && n < props.min) n = props.min
  if (props.max !== null && n > props.max) n = props.max
  return roundDecimals(n)
}

const parseLoose = (v) => {
  if (v === '' || v === null) return null
  const n = Number(v)
  if (Number.isNaN(n)) return props.modelValue
  return roundDecimals(n)
}

const onInput = (e) => {
  let raw = e.target.value
  // Strip anything other than digits, minus (only at start), and decimal point if allowed
  if (decimalsAllowed.value) {
    raw = raw.replace(/[^\d.-]/g, '')
    raw = raw.replace(/(?!^)-/g, '')
    const firstDot = raw.indexOf('.')
    if (firstDot >= 0) {
      raw = raw.slice(0, firstDot + 1) + raw.slice(firstDot + 1).replace(/\./g, '')
    }
  } else {
    raw = raw.replace(/[^\d-]/g, '')
    raw = raw.replace(/(?!^)-/g, '')
  }
  if (e.target.value !== raw) e.target.value = raw

  if (raw === '' || raw === '-' || raw === '.') {
    emit('update:modelValue', null)
    return
  }
  if (decimalsAllowed.value && raw.endsWith('.')) {
    emit('update:modelValue', raw)
    return
  }
  // While typing, parse without applying min/max bounds.
  emit('update:modelValue', parseLoose(raw))
}

const onFocus = () => { focused.value = true }
const onBlur = () => {
  focused.value = false
  // Apply min/max bounds on blur so typed intermediate values are accepted live.
  if (props.modelValue !== null && props.modelValue !== '' && props.modelValue !== undefined) {
    const clamped = clampRange(props.modelValue)
    if (clamped !== props.modelValue) emit('update:modelValue', clamped)
  }
}

const step = (delta) => {
  const cur = Number(props.modelValue ?? 0)
  emit('update:modelValue', clampRange(cur + delta))
}

const onKey = (e) => {
  if (e.key === 'ArrowUp') { e.preventDefault(); step(+props.stepBy) }
  else if (e.key === 'ArrowDown') { e.preventDefault(); step(-props.stepBy) }
}

watch(() => props.error, (v, prev) => {
  if (v && !prev && inputEl.value) {
    inputEl.value.parentElement?.classList.remove('shake')
    void inputEl.value.parentElement?.offsetWidth
    inputEl.value.parentElement?.classList.add('shake')
  }
})

defineExpose({ focus: () => inputEl.value?.focus() })
</script>

<style scoped>
.hr-num-shell {
  display: flex;
  align-items: stretch;
  height: var(--hr-input-height);
  background: var(--hr-input-bg);
  border: 1px solid var(--hr-input-border);
  border-radius: 10px;
  transition: background 200ms var(--hr-spring),
              border-color 200ms var(--hr-spring),
              box-shadow 220ms var(--hr-spring);
  overflow: hidden;
}
.hr-num-shell:hover:not(.disabled):not(.focused) {
  background: var(--hr-input-bg-hover);
  border-color: var(--hr-input-border-hover);
}
.hr-num-shell.focused {
  background: var(--hr-input-bg-focus);
  border-color: var(--hr-input-border-focus);
  box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.10);
}
.hr-num-shell.error {
  border-color: var(--hr-input-error);
  background: var(--hr-input-error-soft);
}
.hr-num-shell.disabled { opacity: 0.6; cursor: not-allowed; }
.hr-num-shell.shake { animation: hr-shake 0.42s linear; }

.hr-num-input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: 0;
  color: var(--hr-input-text);
  font-size: 13px;
  font-family: var(--hr-mono);
  letter-spacing: 0.5px;
  padding: 0 12px;
  outline: none;
}
.hr-num-input::placeholder { color: var(--hr-input-placeholder); font-family: inherit; }

.hr-num-steppers {
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--hr-border);
}
.step-btn {
  width: 26px;
  flex: 1;
  background: transparent;
  border: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--hr-text-muted);
  transition: background 150ms;
}
.step-btn + .step-btn { border-top: 1px solid var(--hr-border); }
.step-btn:hover:not(:disabled) { background: rgba(251, 191, 36, 0.10); color: var(--hr-accent-gold); }
.step-btn:active:not(:disabled) { background: rgba(251, 191, 36, 0.18); }
.step-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.hr-input-error-text {
  color: var(--hr-input-error);
  font-size: 11px;
  margin-top: 4px;
  padding-left: 4px;
  font-weight: 500;
}
</style>
