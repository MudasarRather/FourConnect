<template>
  <button type="button" class="trn-switch" :class="{ on: modelValue }" role="switch"
    :aria-checked="modelValue" :style="{ '--acc': accentVar }" @click="toggle">
    <span class="sw-face">
      <span v-if="icon" class="sw-ic"><component :is="icon" :size="15" /></span>
      <span class="sw-text">
        <span class="sw-label">{{ label }}</span>
        <span v-if="description" class="sw-desc">{{ description }}</span>
      </span>
    </span>

    <span class="sw-track" aria-hidden="true">
      <span class="sw-glyph off"><X :size="11" /></span>
      <span class="sw-glyph on"><Check :size="11" /></span>
      <Motion as="span" class="sw-knob"
        :animate="{ x: modelValue ? 20 : 0 }"
        :transition="{ type: 'spring', stiffness: 620, damping: 30 }" />
    </span>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Check, X } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  label: { type: String, default: '' },
  description: { type: String, default: '' },
  icon: { type: [Object, Function], default: null },
  accent: { type: String, default: 'amber' }, // amber | emerald | ember
})
const emit = defineEmits(['update:modelValue'])
const ACCENTS = { amber: 'var(--trn-amber)', emerald: 'var(--trn-st-completed)', ember: 'var(--trn-ember)' }
const accentVar = computed(() => ACCENTS[props.accent] || ACCENTS.amber)
const toggle = () => emit('update:modelValue', !props.modelValue)
</script>

<style scoped>
.trn-switch {
  display: flex; align-items: center; gap: 12px; width: 100%; font: inherit; cursor: pointer; text-align: left;
  padding: 11px 13px; border-radius: 13px; border: 1px solid var(--trn-border-soft);
  background: var(--trn-surface); transition: border-color 0.25s, background 0.25s, box-shadow 0.25s;
}
.trn-switch:hover { border-color: color-mix(in srgb, var(--acc) 32%, transparent); }
.trn-switch.on { border-color: color-mix(in srgb, var(--acc) 42%, transparent);
  background: color-mix(in srgb, var(--acc) 7%, var(--trn-surface));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--acc) 14%, transparent); }

.sw-face { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.sw-ic { display: inline-flex; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
  align-items: center; justify-content: center; color: var(--trn-text-muted);
  background: var(--trn-surface-elevated); border: 1px solid var(--trn-border-soft); transition: all 0.25s; }
.trn-switch.on .sw-ic { color: var(--acc); background: color-mix(in srgb, var(--acc) 16%, transparent);
  border-color: color-mix(in srgb, var(--acc) 34%, transparent); }
.sw-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.sw-label { font-size: 13px; font-weight: 600; color: var(--trn-text); line-height: 1.25; }
.sw-desc { font-size: 11px; color: var(--trn-text-dim); line-height: 1.3; }

.sw-track { position: relative; width: 46px; height: 26px; border-radius: 999px; flex-shrink: 0;
  background: var(--trn-surface-elevated); border: 1px solid var(--trn-border-strong);
  transition: background 0.3s, border-color 0.3s; display: flex; align-items: center; }
.trn-switch.on .sw-track { background: color-mix(in srgb, var(--acc) 32%, transparent); border-color: var(--acc);
  box-shadow: 0 0 14px -2px color-mix(in srgb, var(--acc) 50%, transparent); }
.sw-knob { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%;
  background: var(--trn-text-muted); box-shadow: 0 2px 5px rgba(0,0,0,0.3); z-index: 2; }
.trn-switch.on .sw-knob { background: var(--trn-amber-bright); }
.sw-glyph { position: absolute; display: inline-flex; align-items: center; justify-content: center; z-index: 1;
  transition: opacity 0.25s; }
.sw-glyph.off { right: 6px; color: var(--trn-text-dim); opacity: 1; }
.sw-glyph.on { left: 6px; color: #1a1206; opacity: 0; }
.trn-switch.on .sw-glyph.off { opacity: 0; }
.trn-switch.on .sw-glyph.on { opacity: 1; }
[data-theme="light"] .trn-switch.on .sw-glyph.on { color: #2a1a06; }
</style>
