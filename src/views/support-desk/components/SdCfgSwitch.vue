<template>
  <!-- SdCfgSwitch — cinematic toggle: gradient track charge, spring knob with
       squash-and-stretch, tick/dash micro-glyph, focus ring. Replaces bare
       checkboxes across the Queue-Config modals. -->
  <button type="button" class="cfs" :class="{ on: modelValue, disabled }" role="switch" :aria-checked="modelValue"
    :disabled="disabled" @click="!disabled && $emit('update:modelValue', !modelValue)">
    <span class="cfs-track" aria-hidden="true">
      <span class="cfs-charge" />
      <span class="cfs-knob">
        <svg viewBox="0 0 10 10" class="cfs-glyph">
          <path v-if="modelValue" d="M2,5.2 L4.2,7.4 L8,3.2" />
          <path v-else d="M2.6,5 L7.4,5" />
        </svg>
      </span>
    </span>
    <span v-if="label" class="cfs-b">
      <b>{{ label }}</b>
      <i v-if="hint">{{ hint }}</i>
    </span>
    <slot />
  </button>
</template>

<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})
defineEmits(['update:modelValue'])
</script>

<style scoped>
.cfs { display: flex; align-items: center; gap: 11px; padding: 9px 12px; border-radius: 12px; width: 100%;
  cursor: pointer; font-family: inherit; text-align: left; background: var(--sd-surface-glass);
  border: 1px solid var(--sd-border); transition: border-color 0.22s, background 0.22s, transform 0.22s var(--sd-spring); }
.cfs:hover:not(.disabled) { border-color: var(--sd-amber-border); transform: translateY(-1px); }
.cfs.on { border-color: color-mix(in srgb, var(--sd-amber) 40%, transparent); background: var(--sd-amber-soft); }
.cfs.disabled { opacity: 0.55; cursor: not-allowed; }
.cfs:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--sd-amber-soft); }

.cfs-track { position: relative; width: 38px; height: 21px; border-radius: 999px; flex-shrink: 0; overflow: visible;
  background: var(--sd-surface); border: 1.5px solid var(--sd-border-strong); transition: border-color 0.25s; }
.cfs.on .cfs-track { border-color: transparent; }
.cfs-charge { position: absolute; inset: 0; border-radius: inherit; opacity: 0; background: var(--sd-grad-hero);
  transition: opacity 0.3s; }
.cfs.on .cfs-charge { opacity: 1; }
.cfs-knob { position: absolute; top: 50%; left: 2px; width: 15px; height: 15px; border-radius: 50%;
  display: grid; place-items: center; transform: translateY(-50%);
  background: var(--sd-text-muted); transition: left 0.32s var(--sd-spring), background 0.25s, width 0.18s, height 0.18s;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35); }
.cfs.on .cfs-knob { left: calc(100% - 17px); background: #fff; }
.cfs:active:not(.disabled) .cfs-knob { width: 18px; height: 13px; }   /* squash & stretch on press */
.cfs-glyph { width: 9px; height: 9px; }
.cfs-glyph path { fill: none; stroke: var(--sd-surface); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round;
  stroke-dasharray: 12; stroke-dashoffset: 0; }
.cfs.on .cfs-glyph path { stroke: #b45309; animation: cfs-draw 0.35s var(--sd-spring); }
@keyframes cfs-draw { from { stroke-dashoffset: 12; } to { stroke-dashoffset: 0; } }

.cfs-b { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.cfs-b b { font-size: 12.5px; font-weight: 700; color: var(--sd-text); }
.cfs-b i { font-style: normal; font-size: 10.5px; color: var(--sd-text-muted); line-height: 1.35; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .cfs.on .cfs-glyph path { animation: none; }
}
</style>
