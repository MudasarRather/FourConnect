<template>
  <div class="sbc" ref="rootRef">
    <div class="sbc-plot" :style="{ height: height + 'px' }">
      <!-- baseline grid -->
      <span v-for="g in 3" :key="'g'+g" class="sbc-grid" :style="{ bottom: (g / 4 * 100) + '%' }" aria-hidden="true" />
      <span class="sbc-base" aria-hidden="true" />
      <!-- one-time light sweep -->
      <span class="sbc-sweep" aria-hidden="true" />

      <div v-for="(it, i) in items" :key="i" class="sbc-col"
        @mouseenter="hover = i" @mouseleave="hover = -1">
        <span class="sbc-chip" :class="{ on: hover === i }" :style="{ color: it.color || 'var(--shift-amber)' }">{{ fmt(it.value) }}</span>
        <div class="sbc-bar-track">
          <div class="sbc-bar" :style="barStyle(it, i)" :class="{ on: hover === i }">
            <span class="sbc-cap" />
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
const barStyle = (it, i) => {
  const c = it.color || 'var(--shift-amber)'
  return {
    height: `${Math.max(2, ((Number(it.value) || 0) / max.value) * 100)}%`,
    background: `linear-gradient(180deg, color-mix(in srgb, ${c} 92%, #fff 14%), color-mix(in srgb, ${c} 70%, transparent))`,
    color: c,
    '--bar-delay': `${i * 0.08}s`,
  }
}
const subPct = (it) => Math.min(100, ((Number(it.subValue) || 0) / Math.max(1, Number(it.value) || 1)) * 100)
</script>

<style scoped>
.sbc { width: 100%; }
.sbc-plot { position: relative; display: flex; align-items: flex-end; gap: 10px; padding-top: 22px; }
.sbc-grid { position: absolute; left: 0; right: 0; height: 1px; background: var(--shift-grid-line); pointer-events: none; }
.sbc-base { position: absolute; left: 0; right: 0; bottom: 0; height: 1px;
  background: linear-gradient(90deg, transparent, var(--shift-border), transparent); pointer-events: none; }
.sbc-sweep { position: absolute; inset: 0; pointer-events: none; z-index: 3;
  background: linear-gradient(105deg, transparent 40%, color-mix(in srgb, var(--shift-amber-bright) 22%, transparent) 50%, transparent 60%);
  background-size: 220% 100%; background-position: 130% 0; animation: sbc-sweep 1.5s var(--shift-ease) 0.3s 1; opacity: 0; }

.sbc-col { position: relative; flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 6px;
  height: 100%; justify-content: flex-end; cursor: default; }
.sbc-chip { font-family: var(--shift-mono); font-size: 11px; font-weight: 700; color: var(--shift-text-muted);
  transition: color 0.2s, transform 0.25s var(--shift-spring); transform: translateY(2px); }
.sbc-chip.on { transform: translateY(-2px) scale(1.12); filter: drop-shadow(0 2px 6px color-mix(in srgb, currentColor 40%, transparent)); }
.sbc-bar-track { flex: 1; width: 100%; max-width: 46px; display: flex; align-items: flex-end; }
.sbc-bar { position: relative; width: 100%; border-radius: 8px 8px 4px 4px; transform-origin: bottom;
  animation: sbc-grow 0.9s var(--shift-spring) both; animation-delay: var(--bar-delay);
  transition: filter 0.2s, box-shadow 0.25s, transform 0.25s; overflow: hidden;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.18); }
.sbc-bar.on { filter: brightness(1.14); transform: translateY(-3px);
  box-shadow: 0 0 26px -4px currentColor, inset 0 1px 0 rgba(255,255,255,0.25); }
.sbc-cap { position: absolute; top: 0; left: 0; right: 0; height: 3px; border-radius: 8px 8px 0 0;
  background: color-mix(in srgb, #fff 55%, transparent); opacity: 0.5; }
.sbc-sub-bar { position: absolute; left: 0; right: 0; bottom: 0; border-radius: 0 0 4px 4px; opacity: 0.9; }
.sbc-lbl { font-size: 10.5px; color: var(--shift-text-muted); text-align: center; max-width: 100%;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; transition: color 0.2s; }
.sbc-lbl.on { color: var(--shift-text); }
.sbc-empty { width: 100%; text-align: center; align-self: center; color: var(--shift-text-dim); font-size: 12px; }

@keyframes sbc-grow { 0% { transform: scaleY(0); opacity: 0; } 60% { opacity: 1; } 100% { transform: scaleY(1); opacity: 1; } }
@keyframes sbc-sweep { 0% { background-position: 130% 0; opacity: 0; } 30% { opacity: 1; } 100% { background-position: -60% 0; opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  .sbc-bar, .sbc-sweep { animation: none; }
  .sbc-sweep { display: none; }
}
</style>
