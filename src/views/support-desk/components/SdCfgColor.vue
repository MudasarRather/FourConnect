<template>
  <!-- SdCfgColor — house-palette swatch picker with selection ring pop + a validated
       custom-hex escape hatch. Kills the raw "#f2b64d" text inputs (invalid hex could
       leak into lane/skill colour and paint broken UI). -->
  <div class="cfc">
    <button v-for="c in SWATCHES" :key="c" type="button" class="cfc-dot" :class="{ on: same(c) }"
      :style="{ '--c': c }" :title="c" @click="pick(c)">
      <span class="cfc-ring" aria-hidden="true" />
    </button>
    <button type="button" class="cfc-dot custom" :class="{ on: customOn }" title="Custom hex" @click="customOpen = !customOpen">
      <Pipette :size="11" />
    </button>
    <Presence>
      <Motion v-if="customOpen" class="cfc-custom" :initial="{ opacity: 0, width: 0 }" :animate="{ opacity: 1, width: 'auto' }" :exit="{ opacity: 0, width: 0 }">
        <input :value="modelValue" class="cfc-inp sd-mono" placeholder="#f2b64d" maxlength="7" @input="onCustom($event.target.value)" />
        <span class="cfc-valid" :class="{ bad: modelValue && !validHex }">{{ modelValue ? (validHex ? '✓' : 'not a hex') : '' }}</span>
      </Motion>
    </Presence>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { Pipette } from 'lucide-vue-next'

const props = defineProps({ modelValue: { type: String, default: '' } })
const emit = defineEmits(['update:modelValue'])

/* the house warm palette + semantic accents (brand rule: no blue/purple) */
const SWATCHES = ['#f2b64d', '#fb923c', '#f97316', '#d97706', '#b45309', '#ef4444', '#34d399', '#0d9488', '#9ca3af', '#e7dbc7']
const HEX_RX = /^#[0-9a-fA-F]{6}$/
const validHex = computed(() => HEX_RX.test(props.modelValue || ''))
const same = (c) => (props.modelValue || '').toLowerCase() === c.toLowerCase()
const customOn = computed(() => !!props.modelValue && !SWATCHES.some(same))
const customOpen = ref(false)
const pick = (c) => { customOpen.value = false; emit('update:modelValue', same(c) ? '' : c) }
const onCustom = (v) => {
  let x = (v || '').trim()
  if (x && !x.startsWith('#')) x = '#' + x
  emit('update:modelValue', x)
}
defineExpose({ validHex })
</script>

<style scoped>
.cfc { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; }
.cfc-dot { position: relative; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; border: 1.5px solid var(--sd-border-strong);
  background: var(--c, var(--sd-surface-glass)); display: grid; place-items: center; color: var(--sd-text-muted);
  transition: transform 0.22s var(--sd-spring), border-color 0.22s, box-shadow 0.22s; }
.cfc-dot:hover { transform: translateY(-2px) scale(1.08); }
.cfc-dot.on { border-color: var(--sd-text); transform: scale(1.12); box-shadow: 0 4px 12px color-mix(in srgb, var(--c, #000) 45%, transparent); }
.cfc-ring { position: absolute; inset: -4px; border-radius: 50%; border: 1.5px solid var(--c, var(--sd-amber)); opacity: 0; }
.cfc-dot.on .cfc-ring { opacity: 1; animation: cfc-pop 0.45s var(--sd-spring); }
@keyframes cfc-pop { 0% { transform: scale(0.6); opacity: 0.9; } 100% { transform: scale(1); opacity: 1; } }
.cfc-dot.custom { background: conic-gradient(#f2b64d, #ef4444, #34d399, #f2b64d); color: #1a1206; }

.cfc-custom { display: inline-flex; align-items: center; gap: 6px; overflow: hidden; white-space: nowrap; }
.cfc-inp { width: 86px; padding: 5px 9px; border-radius: 9px; font-size: 11.5px; background: var(--sd-surface-glass);
  border: 1px solid var(--sd-border-strong); color: var(--sd-text); }
.cfc-inp:focus { outline: none; border-color: var(--sd-amber-border); }
.cfc-valid { font-size: 10px; font-weight: 700; color: var(--sd-success); }
.cfc-valid.bad { color: var(--sd-danger); }
</style>
