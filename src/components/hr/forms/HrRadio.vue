<template>
  <div class="hr-radio-group" role="radiogroup" :aria-disabled="disabled">
    <button
      v-for="(opt, idx) in options"
      :key="opt.value ?? idx"
      type="button"
      role="radio"
      :aria-checked="modelValue === opt.value"
      :class="['radio-pill', { active: modelValue === opt.value }]"
      :disabled="disabled || opt.disabled"
      @click="select(opt.value)"
      @keydown="onKey($event, idx)"
      ref="pillRefs"
    >
      <component v-if="opt.icon" :is="opt.icon" :size="13" class="pill-ic" />
      <span class="pill-label">{{ opt.label }}</span>
    </button>
    <span class="active-indicator" :style="indicatorStyle" />
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number, null], default: null },
  options: { type: Array, required: true }, // [{ value, label, icon?, disabled? }]
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'change'])

const pillRefs = ref([])
const indicatorStyle = ref({ opacity: 0 })

const select = (v) => {
  if (props.disabled) return
  emit('update:modelValue', v)
  emit('change', v)
}

const onKey = (e, idx) => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault()
    const next = (idx + 1) % props.options.length
    pillRefs.value[next]?.focus()
    select(props.options[next].value)
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault()
    const prev = (idx - 1 + props.options.length) % props.options.length
    pillRefs.value[prev]?.focus()
    select(props.options[prev].value)
  }
}

const updateIndicator = () => {
  const idx = props.options.findIndex(o => o.value === props.modelValue)
  if (idx < 0 || !pillRefs.value[idx]) {
    indicatorStyle.value = { opacity: 0 }
    return
  }
  const el = pillRefs.value[idx]
  if (!el) return
  indicatorStyle.value = {
    opacity: 1,
    transform: `translateX(${el.offsetLeft}px)`,
    width: `${el.offsetWidth}px`,
  }
}

watch(() => props.modelValue, () => nextTick(updateIndicator))
watch(() => props.options.length, () => nextTick(updateIndicator))
onMounted(() => nextTick(updateIndicator))
</script>

<style scoped>
.hr-radio-group {
  display: inline-flex;
  position: relative;
  padding: 4px;
  background: var(--hr-input-bg);
  border: 1px solid var(--hr-input-border);
  border-radius: 12px;
  gap: 2px;
}

.radio-pill {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--hr-text-muted);
  background: transparent;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  transition: color 200ms var(--hr-spring);
  white-space: nowrap;
}
.radio-pill:hover:not(:disabled) { color: var(--hr-text); }
.radio-pill.active { color: #1a1a1c; }
.radio-pill:disabled { opacity: 0.5; cursor: not-allowed; }
.radio-pill:focus-visible {
  outline: 2px solid var(--hr-accent-gold-border);
  outline-offset: -2px;
}

.pill-ic { color: inherit; }

.active-indicator {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 0;
  background: var(--hr-gradient-rail-active);
  border-radius: 8px;
  z-index: 0;
  box-shadow: 0 4px 14px -4px rgba(251, 146, 60, 0.5);
  transition: transform 240ms var(--hr-spring), width 240ms var(--hr-spring), opacity 180ms;
  pointer-events: none;
}
</style>
