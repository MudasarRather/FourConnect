<template>
  <div class="sbc" ref="rootRef">
    <div class="sbc-plot" :style="{ height: height + 'px' }">
      <div v-for="(it, i) in items" :key="i" class="sbc-col" @mouseenter="hover = i" @mouseleave="hover = -1">
        <span class="sbc-val" :class="{ on: hover === i }">{{ fmt(it.value) }}</span>
        <div class="sbc-bar-track">
          <div class="sbc-bar" :style="barStyle(it, i)" :class="{ on: hover === i }">
            <span v-if="it.subValue" class="sbc-sub-bar" :style="{ height: subPct(it) + '%', background: it.subColor || 'rgba(0,0,0,0.25)' }" />
          </div>
        </div>
        <span class="sbc-lbl" :class="{ on: hover === i }">{{ it.label }}</span>
      </div>
      <div v-if="!items.length" class="sbc-empty">No data yet</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  // items: [{ label, value, color?, subValue?, subColor? }]
  items: { type: Array, default: () => [] },
  height: { type: Number, default: 180 },
  formatValue: { type: Function, default: null },
})

const rootRef = ref(null)
const hover = ref(-1)
const max = computed(() => Math.max(1, ...props.items.map(i => Number(i.value) || 0)))
const fmt = (v) => (props.formatValue ? props.formatValue(v) : (Number(v) || 0))
const barStyle = (it, i) => ({
  height: `${Math.max(2, ((Number(it.value) || 0) / max.value) * 100)}%`,
  background: it.color || 'var(--shift-amber)',
  animationDelay: `${i * 70}ms`,
})
const subPct = (it) => Math.min(100, ((Number(it.subValue) || 0) / Math.max(1, Number(it.value) || 1)) * 100)
</script>

<style scoped>
.sbc { width: 100%; }
.sbc-plot { display: flex; align-items: flex-end; gap: 10px; padding-top: 18px; }
.sbc-col { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; justify-content: flex-end; cursor: default; }
.sbc-val { font-family: var(--shift-mono); font-size: 11px; font-weight: 700; color: var(--shift-text-muted); transition: color 0.2s; }
.sbc-val.on { color: var(--shift-amber); }
.sbc-bar-track { flex: 1; width: 100%; max-width: 46px; display: flex; align-items: flex-end; }
.sbc-bar { position: relative; width: 100%; border-radius: 8px 8px 4px 4px; transform-origin: bottom;
  animation: shift-bar-grow 0.7s var(--shift-ease) both; transition: filter 0.2s, box-shadow 0.2s; overflow: hidden; }
.sbc-bar.on { filter: brightness(1.12); box-shadow: 0 0 18px -4px currentColor; }
.sbc-sub-bar { position: absolute; left: 0; right: 0; bottom: 0; border-radius: 0 0 4px 4px; }
.sbc-lbl { font-size: 10.5px; color: var(--shift-text-muted); text-align: center; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; transition: color 0.2s; }
.sbc-lbl.on { color: var(--shift-text); }
.sbc-empty { width: 100%; text-align: center; align-self: center; color: var(--shift-text-dim); font-size: 12px; }
@media (prefers-reduced-motion: reduce) { .sbc-bar { animation: none; } }
</style>
