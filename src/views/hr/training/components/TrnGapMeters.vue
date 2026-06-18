<template>
  <div class="gm" ref="rootRef" :class="{ 'is-in': visible }">
    <ul v-if="rows.length" class="gm-list">
      <li v-for="(r, i) in rows" :key="i" class="gm-row" :style="{ '--d': (i * 0.08) + 's' }">
        <span class="gm-rank trn-mono">{{ String(i + 1).padStart(2, '0') }}</span>
        <div class="gm-body">
          <div class="gm-top">
            <span class="gm-name">{{ r.label }}</span>
            <span class="gm-val trn-mono">{{ r.value.toFixed(1) }}</span>
          </div>
          <div class="gm-track">
            <span class="gm-fill" :style="{ width: visible ? r.pct + '%' : '0%', transitionDelay: (i * 0.08) + 's' }" />
          </div>
        </div>
      </li>
    </ul>
    <div v-else class="gm-empty">No skill-matrix data yet — start mapping competencies to light up this chart.</div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  items: { type: Array, default: () => [] }, // [{ skill, avg_gap }]
})

const rootRef = ref(null)
const { visible } = useInView(rootRef, { threshold: 0.25 })

const rows = computed(() => {
  const src = (props.items || []).slice(0, 6)
  if (!src.length) return []
  const max = Math.max(0.1, ...src.map(s => Number(s.avg_gap) || 0))
  return src.map(s => ({
    label: s.skill,
    value: Number(s.avg_gap) || 0,
    pct: Math.max(6, ((Number(s.avg_gap) || 0) / max) * 100),
  }))
})
</script>

<style scoped>
.gm { height: 100%; display: flex; }
.gm-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 13px; width: 100%; justify-content: center; }
.gm-row { display: flex; align-items: center; gap: 12px; opacity: 0; transform: translateX(-8px); }
.is-in .gm-row { animation: gm-in 0.55s var(--trn-spring) forwards; animation-delay: var(--d, 0s); }
.gm-rank { font-size: 11px; font-weight: 700; color: var(--trn-text-dim); width: 18px; flex-shrink: 0; }
.gm-body { flex: 1; min-width: 0; }
.gm-top { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 5px; }
.gm-name { font-size: 12.5px; font-weight: 600; color: var(--trn-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gm-val { font-size: 12px; font-weight: 700; color: var(--trn-ember); flex-shrink: 0; }
.gm-track { height: 8px; border-radius: 999px; background: var(--trn-surface); border: 1px solid var(--trn-border-soft); overflow: hidden; }
.gm-fill { display: block; height: 100%; width: 0; border-radius: 999px;
  background: linear-gradient(90deg, var(--trn-amber), var(--trn-ember));
  box-shadow: 0 0 12px -2px var(--trn-ember); transition: width 1.05s var(--trn-spring); }

.gm-empty { flex: 1; display: grid; place-items: center; text-align: center; font-size: 12.5px; color: var(--trn-text-dim); padding: 24px; }

@keyframes gm-in { to { opacity: 1; transform: translateX(0); } }
@media (prefers-reduced-motion: reduce) {
  .gm-row { animation: none; opacity: 1; transform: none; }
  .gm-fill { transition: none; }
}
</style>
