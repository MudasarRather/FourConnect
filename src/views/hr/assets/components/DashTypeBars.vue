<template>
  <Motion as="section" class="tb as-card" ref="root"
    :initial="reduced ? false : { opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, delay: 0.12, ease: [0.16, 1, 0.3, 1] }">
    <span class="as-grain" aria-hidden="true" />
    <span class="as-spotlight" aria-hidden="true" />
    <header class="tb-head">
      <span class="tb-eyebrow"><Boxes :size="13" /> Fleet composition</span>
      <span class="tb-sub as-mono">{{ rows.length }} asset types</span>
    </header>

    <div v-if="rows.length" class="tb-list">
      <Motion v-for="(r, i) in rows" :key="r.key" as="button" type="button" class="tb-row" :class="{ lead: i === 0 }" :style="{ '--c': r.color }"
        :initial="reduced ? false : { opacity: 0, x: -12 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.18 + i * 0.05, ease: [0.16, 1, 0.3, 1] }"
        :whileHover="reduced ? {} : { x: 3 }" :whileTap="{ scale: 0.99 }" @click="$emit('pick', r.key)" :title="`${r.label} · view in inventory`">
        <span class="tb-label">
          <span class="tb-dot" />{{ r.label }}
          <CircleDot v-if="i === 0" :size="11" class="tb-lead-ic" />
        </span>
        <span class="tb-track"><span class="tb-fill" :style="{ width: draw ? r.pct + '%' : '0%' }"><span class="tb-fill-sheen" /></span></span>
        <span class="tb-val as-mono"><AssetCountUp :value="r.value" :start="draw" /></span>
        <span class="tb-share as-mono">{{ r.share }}%</span>
      </Motion>
    </div>
    <div v-else class="tb-empty"><PackageSearch :size="16" /> No assets registered yet.</div>
  </Motion>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { Motion } from 'motion-v'
import { Boxes, CircleDot, PackageSearch } from 'lucide-vue-next'
import AssetCountUp from './AssetCountUp.vue'
import { typeMeta } from '@/composables/useAssets'
import { prefersReduced, useInView, usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({ stats: { type: Object, default: () => ({}) } })
defineEmits(['pick'])

const root = ref(null)
const reduced = prefersReduced()
usePointerSpotlight(root)
const { visible } = useInView(root, { threshold: 0.2 })
const draw = ref(false)
onMounted(() => { nextTick(() => requestAnimationFrame(() => { draw.value = true })) })

const rows = computed(() => {
  const bt = props.stats.by_type || {}
  const entries = Object.entries(bt).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((s, [, v]) => s + v, 0)
  const max = entries.length ? entries[0][1] : 1
  return entries.map(([k, v]) => ({
    key: k, label: typeMeta(k).label, color: `var(${typeMeta(k).cssVar})`,
    value: v, share: total ? Math.round((v / total) * 100) : 0, pct: Math.round((v / max) * 100),
  }))
})
</script>

<style scoped>
.tb { position: relative; overflow: hidden; padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }
.tb-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.tb-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--as-text-secondary); }
.tb-eyebrow :deep(svg) { color: var(--as-amber); }
.tb-sub { font-size: 11px; color: var(--as-text-dim); }

.tb-list { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; }
@media (max-width: 720px) { .tb-list { grid-template-columns: 1fr; } }
.tb-row { display: grid; grid-template-columns: 120px 1fr auto auto; align-items: center; gap: 10px; padding: 7px 10px; border-radius: 11px; cursor: pointer; text-align: left; font: inherit;
  background: transparent; border: 1px solid transparent; transition: background 0.2s, border-color 0.2s; }
.tb-row:hover { background: var(--as-surface); border-color: color-mix(in srgb, var(--c) 38%, transparent); }
.tb-row.lead { background: color-mix(in srgb, var(--c) 7%, transparent); }
.tb-label { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 600; color: var(--as-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tb-dot { width: 9px; height: 9px; border-radius: 3px; background: var(--c); box-shadow: 0 0 7px color-mix(in srgb, var(--c) 65%, transparent); flex-shrink: 0; }
.tb-lead-ic { color: var(--c); }
.tb-track { position: relative; height: 9px; border-radius: 999px; background: var(--as-border-soft); overflow: hidden; }
.tb-fill { position: relative; display: block; height: 100%; border-radius: 999px; overflow: hidden;
  background: linear-gradient(90deg, color-mix(in srgb, var(--c) 55%, transparent), var(--c)); box-shadow: 0 0 9px -1px color-mix(in srgb, var(--c) 70%, transparent);
  transition: width 1.2s var(--as-spring); }
.tb-fill-sheen { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%); background-size: 220% 100%; animation: as-sheen 2.6s ease infinite; }
.tb-val { font-size: 13.5px; font-weight: 800; color: var(--as-text); min-width: 26px; text-align: right; }
.tb-share { font-size: 10.5px; color: var(--as-text-dim); min-width: 32px; text-align: right; }
.tb-empty { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 28px; font-size: 13px; color: var(--as-text-muted); }
.tb-empty :deep(svg) { color: var(--as-amber); }

@media (prefers-reduced-motion: reduce) { .tb-fill { transition: none; } .tb-fill-sheen { animation: none; } }
</style>
