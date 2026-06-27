<template>
  <div class="mps" :class="{ tiny }" :style="{ '--acc': accent }">
    <button type="button" class="mps-btn" :disabled="atMin" @click="bump(-1)" aria-label="Decrease"><Minus :size="tiny ? 12 : 14" /></button>
    <div class="mps-val">
      <input class="mps-in" :value="display" inputmode="decimal" @input="onInput" @blur="commit" @keydown.enter.prevent="commit" />
      <span v-if="suffix" class="mps-suf">{{ suffix }}</span>
    </div>
    <button type="button" class="mps-btn" :disabled="atMax" @click="bump(1)" aria-label="Increase"><Plus :size="tiny ? 12 : 14" /></button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Minus, Plus } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: [Number, String], default: 0 },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  step: { type: Number, default: 1 },
  suffix: { type: String, default: '' },
  accent: { type: String, default: 'var(--set-gold)' },
  tiny: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const val = computed(() => Number(props.modelValue) || 0)
const display = computed(() => {
  const n = val.value
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
})
const atMin = computed(() => val.value <= props.min)
const atMax = computed(() => val.value >= props.max)
const clamp = (n) => Math.max(props.min, Math.min(props.max, n))

function bump(dir) {
  const next = clamp(Math.round((val.value + dir * props.step) * 100) / 100)
  emit('update:modelValue', next)
}
function onInput(e) {
  const raw = e.target.value.replace(/[^0-9.]/g, '')
  if (raw === '' || raw === '.') return
  const n = Number(raw)
  if (!Number.isNaN(n)) emit('update:modelValue', n)
}
function commit(e) {
  const n = Number(String(e?.target?.value ?? val.value).replace(/[^0-9.]/g, ''))
  emit('update:modelValue', clamp(Number.isNaN(n) ? props.min : n))
}
</script>

<style scoped>
.mps { display: inline-flex; align-items: center; gap: 4px; height: 38px; padding: 0 4px; border-radius: 10px;
  background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); transition: border-color 0.2s, box-shadow 0.2s; }
.mps:focus-within { border-color: color-mix(in srgb, var(--acc) 55%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--acc) 12%, transparent); }
.mps.tiny { height: 32px; gap: 2px; }
.mps-btn { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 7px; cursor: pointer; flex-shrink: 0;
  color: var(--set-text-secondary); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.16s var(--set-spring); }
.mps.tiny .mps-btn { width: 24px; height: 24px; border-radius: 6px; }
.mps-btn:hover:not(:disabled) { color: var(--acc); border-color: color-mix(in srgb, var(--acc) 42%, transparent); transform: translateY(-1px); }
.mps-btn:active:not(:disabled) { transform: translateY(0); }
.mps-btn:disabled { opacity: 0.38; cursor: not-allowed; }
.mps-val { flex: 1; min-width: 0; display: inline-flex; align-items: baseline; justify-content: center; gap: 1px; }
.mps-in { width: 100%; min-width: 0; text-align: center; border: none; background: transparent; outline: none; font: inherit;
  font-size: 13.5px; font-weight: 800; color: var(--set-text); font-variant-numeric: tabular-nums;
  -moz-appearance: textfield; }
.mps.tiny .mps-in { font-size: 12.5px; }
.mps-in::-webkit-outer-spin-button, .mps-in::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.mps-suf { font-size: 10px; font-weight: 700; color: var(--set-text-muted); flex-shrink: 0; }
@media (prefers-reduced-motion: reduce) { .mps-btn:hover:not(:disabled) { transform: none; } }
</style>
