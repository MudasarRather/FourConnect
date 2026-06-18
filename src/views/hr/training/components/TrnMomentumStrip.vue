<template>
  <div class="mom" ref="rootRef" :class="{ 'is-in': visible }">
    <div class="mom-grid" aria-hidden="true"><i v-for="n in 4" :key="n" /></div>
    <div v-if="cols.length" class="mom-plot">
      <div class="mom-col" v-for="(c, i) in cols" :key="i"
        :title="`${c.label} · ${c.completions} completions · ${c.hours} h`">
        <div class="mom-stack">
          <span class="mom-bar comp" :style="{ height: c.cH + '%', '--d': (i * 0.05) + 's' }" />
          <span class="mom-bar hour" :style="{ height: c.hH + '%', '--d': (i * 0.05 + 0.06) + 's' }" />
        </div>
        <span class="mom-x">{{ c.label }}</span>
      </div>
      <span class="mom-sweep" aria-hidden="true" />
    </div>
    <div v-else class="mom-empty">No momentum data yet — completed trainings will chart here.</div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  data: { type: Array, default: () => [] }, // [{ month, completions, hours }]
})

const rootRef = ref(null)
const { visible } = useInView(rootRef, { threshold: 0.25 })

const cols = computed(() => {
  const rows = props.data || []
  if (!rows.length) return []
  const max = Math.max(1, ...rows.map(r => Math.max(Number(r.completions) || 0, Number(r.hours) || 0)))
  return rows.map(r => ({
    label: r.month,
    completions: Number(r.completions) || 0,
    hours: Number(r.hours) || 0,
    cH: Math.max(3, ((Number(r.completions) || 0) / max) * 100),
    hH: Math.max(3, ((Number(r.hours) || 0) / max) * 100),
  }))
})
</script>

<style scoped>
.mom { position: relative; height: 100%; min-height: 196px; display: flex; }
.mom-grid { position: absolute; inset: 0 0 22px; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none; z-index: 0; }
.mom-grid i { height: 1px; background: linear-gradient(90deg, transparent, var(--trn-border-soft) 18%, var(--trn-border-soft) 82%, transparent); }

.mom-plot { position: relative; flex: 1; display: flex; align-items: flex-end; justify-content: space-between; gap: 6px; z-index: 1; overflow: hidden; }
.mom-col { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 7px; height: 100%; }
.mom-stack { flex: 1; width: 100%; display: flex; align-items: flex-end; justify-content: center; gap: 4px; }
.mom-bar { width: 38%; max-width: 16px; min-width: 5px; border-radius: 6px 6px 3px 3px; transform: scaleY(0); transform-origin: bottom;
  transition: transform 0.85s var(--trn-spring), filter 0.3s; transition-delay: var(--d, 0s); will-change: transform; }
.is-in .mom-bar { transform: scaleY(1); }
.mom-bar.comp { background: linear-gradient(180deg, var(--trn-st-completed), color-mix(in srgb, var(--trn-st-completed) 55%, transparent));
  box-shadow: 0 0 12px -3px var(--trn-st-completed); }
.mom-bar.hour { background: linear-gradient(180deg, var(--trn-amber-bright), var(--trn-ember));
  box-shadow: 0 0 12px -3px var(--trn-ember); }
.mom-col:hover .mom-bar { filter: brightness(1.18) saturate(1.1); }
.mom-x { font-family: var(--trn-mono); font-size: 9px; letter-spacing: 0.04em; color: var(--trn-text-dim); white-space: nowrap; }

/* one-shot shine sweep once bars are up */
.mom-sweep { position: absolute; inset: 0; pointer-events: none; opacity: 0;
  background: linear-gradient(100deg, transparent 40%, color-mix(in srgb, var(--trn-amber) 14%, transparent) 50%, transparent 60%);
  background-size: 220% 100%; }
.is-in .mom-sweep { animation: mom-sweep 1.3s ease 0.7s 1; }

.mom-empty { flex: 1; display: grid; place-items: center; text-align: center; font-size: 12.5px; color: var(--trn-text-dim); padding: 24px; }

@keyframes mom-sweep { 0% { opacity: 0; background-position: 130% 0; } 25% { opacity: 1; } 100% { opacity: 0; background-position: -40% 0; } }
@media (prefers-reduced-motion: reduce) {
  .mom-bar { transform: scaleY(1); transition: none; }
  .mom-sweep { animation: none !important; }
}
</style>
