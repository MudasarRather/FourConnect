<template>
  <Motion as="article" class="kpi-tile" :class="{ alert: tone === 'alert' && Number(value) > 0 }"
    :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }"
    :whileHover="{ y: -4 }">
    <div class="kt-top">
      <span class="kt-ic" :style="{ color: accent, background: `color-mix(in srgb, ${accent} 14%, transparent)` }">
        <component :is="icon" :size="16" />
      </span>
      <span class="kt-lbl">{{ label }}</span>
    </div>
    <ShiftCountUp class="kt-val" :value="Number(value) || 0" :decimals="decimals" :suffix="suffix" />
    <div class="kt-foot">
      <span v-if="hint" class="kt-hint">{{ hint }}</span>
      <span v-else class="kt-spark" :style="{ background: `linear-gradient(90deg, ${accent}, transparent)` }" />
    </div>
    <span class="kt-glow" :style="{ background: `radial-gradient(120% 80% at 80% 0%, color-mix(in srgb, ${accent} 22%, transparent), transparent 60%)` }" />
  </Motion>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Hash } from 'lucide-vue-next'
import ShiftCountUp from './ShiftCountUp.vue'

const props = defineProps({
  label: { type: String, default: '' },
  value: { type: [Number, String], default: 0 },
  icon: { type: [Object, Function], default: Hash },
  color: { type: String, default: 'var(--shift-amber)' },
  tone: { type: String, default: 'neutral' },
  suffix: { type: String, default: '' },
  decimals: { type: Number, default: 0 },
  hint: { type: String, default: '' },
  index: { type: Number, default: 0 },
})
const accent = computed(() => props.color)
</script>

<style scoped>
.kpi-tile { position: relative; display: flex; flex-direction: column; gap: 8px; padding: 15px 16px; border-radius: 18px;
  background: var(--shift-surface); border: 1px solid var(--shift-border-soft); overflow: hidden; transition: border-color 0.25s; }
.kpi-tile:hover { border-color: var(--shift-border); }
.kpi-tile.alert { border-color: color-mix(in srgb, var(--shift-alert) 36%, transparent); background: linear-gradient(180deg, var(--shift-alert-soft), var(--shift-surface)); }
.kt-top { display: flex; align-items: center; gap: 8px; position: relative; z-index: 1; }
.kt-ic { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; flex-shrink: 0; }
.kt-lbl { font-size: 11px; color: var(--shift-text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
.kt-val { font-size: 26px; font-weight: 800; color: var(--shift-text); position: relative; z-index: 1; line-height: 1; }
.kt-foot { height: 14px; display: flex; align-items: center; position: relative; z-index: 1; }
.kt-hint { font-size: 10px; font-family: var(--shift-mono); color: var(--shift-text-dim); }
.kt-spark { height: 3px; width: 60%; border-radius: 999px; opacity: 0.6; }
.kt-glow { position: absolute; inset: 0; pointer-events: none; opacity: 0.5; }
</style>
