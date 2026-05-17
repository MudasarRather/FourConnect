<template>
  <label class="hr-cbx" :class="{ checked, disabled, indeterminate, 'no-label': !$slots.default && !label }">
    <span class="hr-cbx-box">
      <svg v-if="indeterminate" class="cbx-icon dash" viewBox="0 0 16 16" aria-hidden="true">
        <line x1="3.5" y1="8" x2="12.5" y2="8" />
      </svg>
      <svg v-else-if="checked" class="cbx-icon tick" viewBox="0 0 16 16" aria-hidden="true">
        <polyline points="3.2,8.6 6.6,12 13,5.2" />
      </svg>
    </span>
    <input
      type="checkbox"
      class="sr-only"
      :checked="checked"
      :disabled="disabled"
      @change="onChange"
    />
    <span class="hr-cbx-text">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  label: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  indeterminate: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'change'])

const checked = computed(() => !!props.modelValue && !props.indeterminate)

const onChange = (e) => {
  emit('update:modelValue', e.target.checked)
  emit('change', e.target.checked)
}
</script>

<style scoped>
.hr-cbx {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
  color: var(--hr-text);
  font-size: 13px;
  position: relative;
  line-height: 1.3;
}
.hr-cbx.disabled { opacity: 0.5; cursor: not-allowed; }
.hr-cbx.no-label { gap: 0; }

.hr-cbx-box {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  background: var(--hr-input-bg);
  border: 1px solid var(--hr-input-border);
  transition: background 180ms var(--hr-spring),
              border-color 180ms var(--hr-spring),
              box-shadow 180ms var(--hr-spring);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.hr-cbx:hover .hr-cbx-box { border-color: var(--hr-input-border-hover); }
.hr-cbx.checked .hr-cbx-box,
.hr-cbx.indeterminate .hr-cbx-box {
  background: var(--hr-gradient-rail-active);
  border-color: var(--hr-accent-gold-strong);
  box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.12);
}

.cbx-icon {
  width: 14px;
  height: 14px;
  stroke: #1a1a1c;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
  stroke-dasharray: 24;
  animation: hr-check-pop 220ms var(--hr-spring);
}

.hr-cbx-text {
  font-weight: 500;
  color: inherit;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
