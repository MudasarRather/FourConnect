<template>
  <div class="rsb" ref="rootRef">
    <div v-for="(r, i) in rows" :key="r.key" class="rsb-row" :class="{ on: hover === i }"
      @mouseenter="hover = i" @mouseleave="hover = -1" :style="{ '--c': r.color }">
      <span class="rsb-label">{{ r.label }}</span>
      <div class="rsb-track">
        <div class="rsb-fill" :style="{ width: (visible ? pct(r.value) : 0) + '%', transitionDelay: (i * 0.07) + 's' }">
          <span class="rsb-flow" aria-hidden="true" />
        </div>
      </div>
      <span class="rsb-val rmb-mono"><RmbCountUp :value="r.value" /></span>
    </div>
    <p v-if="!rows.length" class="rsb-empty">No claims recorded yet.</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import RmbCountUp from './RmbCountUp.vue'
import { useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  // items: [{ key, label, value, color }]
  items: { type: Array, default: () => [] },
})

const rootRef = ref(null)
const hover = ref(-1)
const { visible } = useInView(rootRef, { threshold: 0.25 })

const rows = computed(() =>
  props.items
    .map((r, i) => ({ key: r.key ?? i, label: r.label, value: Number(r.value) || 0, color: r.color || 'var(--rmb-amber)' }))
    .filter(r => r.value > 0)
    .sort((a, b) => b.value - a.value))
const max = computed(() => Math.max(1, ...rows.value.map(r => r.value)))
const pct = (v) => Math.max(3, (v / max.value) * 100)
</script>

<style scoped>
.rsb { display: flex; flex-direction: column; gap: 10px; }
.rsb-row { display: grid; grid-template-columns: 92px 1fr 38px; align-items: center; gap: 12px; }
.rsb-label { font-size: 11.5px; color: var(--rmb-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: color 0.2s; }
.rsb-row.on .rsb-label { color: var(--rmb-text); }
.rsb-track { position: relative; height: 12px; border-radius: 999px; background: var(--rmb-grid-line); overflow: hidden; }
.rsb-fill { position: relative; height: 100%; border-radius: 999px; overflow: hidden;
  background: linear-gradient(90deg, color-mix(in srgb, var(--c) 72%, transparent), var(--c));
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.25);
  transition: width 1s var(--rmb-ease), filter 0.25s, box-shadow 0.25s; }
.rsb-row.on .rsb-fill { filter: brightness(1.12); box-shadow: 0 0 18px -3px var(--c), inset 0 1px 0 rgba(255,255,255,0.3); }
.rsb-flow { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%);
  background-size: 220% 100%; animation: rsb-flow 2.6s linear infinite; }
.rsb-val { font-size: 13px; font-weight: 700; color: var(--rmb-text); text-align: right; }
.rsb-empty { color: var(--rmb-text-muted); font-size: 13px; padding: 14px 4px; text-align: center; }

@keyframes rsb-flow { 0% { background-position: 130% 0; } 100% { background-position: -60% 0; } }
@media (prefers-reduced-motion: reduce) { .rsb-fill { transition: width 0.4s; } .rsb-flow { display: none; } }
</style>
