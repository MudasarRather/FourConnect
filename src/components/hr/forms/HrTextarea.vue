<template>
  <div class="hr-ta-shell" :class="{ error, disabled, focused }">
    <textarea
      ref="taEl"
      :id="id"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :rows="rows"
      :maxlength="maxlength"
      class="hr-ta"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
    />
  </div>
  <div v-if="error && errorText" class="hr-input-error-text">{{ errorText }}</div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'

const props = defineProps({
  id: { type: String, default: undefined },
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  error: { type: Boolean, default: false },
  errorText: { type: String, default: '' },
  rows: { type: Number, default: 3 },
  autoresize: { type: Boolean, default: true },
  maxlength: { type: [Number, String], default: undefined },
})
const emit = defineEmits(['update:modelValue'])

const taEl = ref(null)
const focused = ref(false)

const fit = () => {
  if (!props.autoresize || !taEl.value) return
  taEl.value.style.height = 'auto'
  taEl.value.style.height = taEl.value.scrollHeight + 'px'
}

const onInput = (e) => {
  emit('update:modelValue', e.target.value)
  nextTick(fit)
}
const onFocus = () => { focused.value = true }
const onBlur = () => { focused.value = false }

onMounted(fit)
watch(() => props.modelValue, () => nextTick(fit))

defineExpose({ focus: () => taEl.value?.focus() })
</script>

<style scoped>
.hr-ta-shell {
  display: block;
  min-height: var(--hr-input-height);
  background: var(--hr-input-bg);
  border: 1px solid var(--hr-input-border);
  border-radius: 10px;
  padding: 0;
  transition: background 200ms var(--hr-spring),
              border-color 200ms var(--hr-spring),
              box-shadow 220ms var(--hr-spring);
}
.hr-ta-shell:hover:not(.disabled):not(.focused) {
  background: var(--hr-input-bg-hover);
  border-color: var(--hr-input-border-hover);
}
.hr-ta-shell.focused {
  background: var(--hr-input-bg-focus);
  border-color: var(--hr-input-border-focus);
  box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.10);
}
.hr-ta-shell.error {
  border-color: var(--hr-input-error);
  background: var(--hr-input-error-soft);
}
.hr-ta-shell.disabled { opacity: 0.6; cursor: not-allowed; }

.hr-ta {
  width: 100%;
  background: transparent;
  border: 0;
  color: var(--hr-input-text);
  font-size: 13px;
  font-family: inherit;
  padding: 10px 12px;
  outline: none;
  resize: vertical;
  line-height: 1.55;
  min-height: 64px;
}
.hr-ta::placeholder { color: var(--hr-input-placeholder); }

.hr-input-error-text {
  color: var(--hr-input-error);
  font-size: 11px;
  margin-top: 4px;
  padding-left: 4px;
  font-weight: 500;
}
</style>
