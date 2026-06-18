<template>
  <div class="sb" ref="rootRef" :class="{ 'is-in': visible }">
    <div v-if="total > 0" class="sb-bar">
      <span v-for="(seg, i) in segs" :key="i" class="sb-seg"
        :style="{ width: visible ? seg.pct + '%' : '0%', background: seg.color, transitionDelay: (i * 0.1) + 's', boxShadow: `0 0 14px -4px ${seg.color}` }"
        :title="`${seg.label}: ${seg.value}`" />
    </div>
    <div v-else class="sb-bar sb-bar-empty"><span class="sb-empty-fill" /></div>

    <ul class="sb-legend">
      <li v-for="(seg, i) in segs" :key="i">
        <span class="sb-dot" :style="{ background: seg.color }" />
        <span class="sb-name">{{ seg.label }}</span>
        <span class="sb-val trn-mono">{{ seg.value }}</span>
      </li>
      <li v-if="!segs.length" class="sb-none">No data yet</li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  segments: { type: Array, default: () => [] }, // [{ label, value, color }]
})

const rootRef = ref(null)
const { visible } = useInView(rootRef, { threshold: 0.3 })

const total = computed(() => (props.segments || []).reduce((a, s) => a + (Number(s.value) || 0), 0))
const segs = computed(() => {
  const t = total.value || 1
  return (props.segments || [])
    .filter(s => (Number(s.value) || 0) > 0)
    .map(s => ({ ...s, value: Number(s.value) || 0, pct: ((Number(s.value) || 0) / t) * 100 }))
})
</script>

<style scoped>
.sb { display: flex; flex-direction: column; gap: 16px; height: 100%; justify-content: center; }
.sb-bar { display: flex; height: 16px; border-radius: 999px; overflow: hidden; background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.sb-seg { height: 100%; width: 0; transition: width 1s var(--trn-spring); }
.sb-seg:not(:last-child) { border-right: 2px solid var(--trn-canvas); }
.sb-bar-empty { position: relative; }
.sb-empty-fill { position: absolute; inset: 0; background: linear-gradient(90deg, var(--trn-border-soft), transparent); }

.sb-legend { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.sb-legend li { display: flex; align-items: center; gap: 9px; font-size: 11.5px; }
.sb-dot { width: 9px; height: 9px; border-radius: 3px; flex-shrink: 0; }
.sb-name { flex: 1; min-width: 0; color: var(--trn-text-secondary); text-transform: capitalize; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sb-val { font-weight: 700; color: var(--trn-text); }
.sb-none { color: var(--trn-text-dim); justify-content: center; }

@media (prefers-reduced-motion: reduce) { .sb-seg { transition: none; } }
</style>
