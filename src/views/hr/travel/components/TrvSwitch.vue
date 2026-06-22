<template>
  <button type="button" class="trsw" :class="{ on: modelValue, disabled }" role="switch" :aria-checked="modelValue"
    :disabled="disabled" @click="toggle">
    <span class="trsw-track"><span class="trsw-glow" /></span>
    <span class="trsw-knob"><span class="trsw-knob-dot" /></span>
    <span v-if="label" class="trsw-label">{{ modelValue ? (onLabel || label) : (offLabel || label) }}</span>
  </button>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  label: { type: String, default: '' },
  onLabel: { type: String, default: '' },
  offLabel: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'change'])
const toggle = () => { if (props.disabled) return; emit('update:modelValue', !props.modelValue); emit('change', !props.modelValue) }
</script>

<style scoped>
.trsw { position: relative; display: inline-flex; align-items: center; gap: 9px; background: none; border: none; padding: 0; cursor: pointer; }
.trsw.disabled { opacity: 0.5; cursor: not-allowed; }
.trsw-track { position: relative; width: 40px; height: 22px; border-radius: 999px; overflow: hidden; flex-shrink: 0;
  background: var(--trv-steel-soft); border: 1px solid var(--trv-border-strong); transition: background 0.3s, border-color 0.3s; }
.trsw-glow { position: absolute; inset: 0; opacity: 0; background: var(--trv-grad-hero); transition: opacity 0.35s; }
.trsw.on .trsw-track { border-color: var(--trv-amber-border); }
.trsw.on .trsw-glow { opacity: 1; }
.trsw-knob { position: absolute; top: 50%; left: 3px; width: 16px; height: 16px; border-radius: 50%; z-index: 1;
  transform: translate(0, -50%); background: var(--trv-text-muted);
  transition: transform 0.32s var(--trv-spring), background 0.3s, box-shadow 0.3s; }
.trsw.on .trsw-knob { transform: translate(18px, -50%); background: #1a1205; box-shadow: 0 0 10px rgba(251,191,36,0.6); }
.trsw-knob-dot { position: absolute; inset: 5px; border-radius: 50%; background: rgba(255,255,255,0.25); opacity: 0; transition: opacity 0.3s; }
.trsw.on .trsw-knob-dot { opacity: 1; }
.trsw-label { font-size: 12.5px; font-weight: 600; color: var(--trv-text-secondary); }
.trsw.on .trsw-label { color: var(--trv-text); }
@media (prefers-reduced-motion: reduce) { .trsw-knob, .trsw-glow, .trsw-track { transition: none; } }
</style>
