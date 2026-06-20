<template>
  <Motion as="section" class="md as-card" ref="root"
    :initial="reduced ? false : { opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, delay: 0.18, ease: [0.16, 1, 0.3, 1] }">
    <span class="as-grain" aria-hidden="true" />
    <header class="md-head">
      <span class="md-eyebrow"><LayoutGrid :size="13" /> Command deck</span>
      <span class="md-sub">Jump into any lifecycle stage</span>
    </header>

    <div class="md-grid">
      <Motion v-for="(t, i) in tiles" :key="t.key" as="button" type="button" class="md-tile" :style="{ '--c': t.color }"
        :initial="reduced ? false : { opacity: 0, y: 14, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
        :transition="{ duration: 0.4, delay: 0.2 + i * 0.035, ease: [0.16, 1, 0.3, 1] }"
        :whileHover="reduced ? {} : { y: -4 }" :whileTap="{ scale: 0.96 }" @click="$emit('go', t.key)">
        <span class="md-tile-glow" aria-hidden="true" />
        <span class="md-tile-ic"><component :is="t.icon" :size="17" /></span>
        <span class="md-tile-body">
          <span class="md-tile-lab">{{ t.label }}</span>
          <span class="md-tile-grp">{{ t.group }}</span>
        </span>
        <span v-if="t.badge != null" class="md-tile-badge as-mono" :data-tone="t.tone">{{ t.badge }}</span>
        <ArrowUpRight :size="14" class="md-tile-arr" />
      </Motion>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { LayoutGrid, ArrowUpRight } from 'lucide-vue-next'
import { ASSET_TABS } from '@/composables/useAssets'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({ stats: { type: Object, default: () => ({}) } })
defineEmits(['go'])
const reduced = prefersReduced()
const root = ref(null)

const GROUP_COLOR = {
  fleet: 'var(--as-amber)', lifecycle: 'var(--as-ember)', governance: 'var(--as-steel)',
  catalog: 'var(--as-amber-strong)', system: 'var(--as-steel-dim)', overview: 'var(--as-amber)',
}
const GROUP_LABEL = { fleet: 'Fleet', lifecycle: 'Lifecycle', governance: 'Governance', catalog: 'Catalog', system: 'System', overview: 'Overview' }

function badgeFor(key) {
  const s = props.stats || {}
  switch (key) {
    case 'inventory': return { v: s.total || 0, tone: 'neutral' }
    case 'allocations': return { v: s.allocated || 0, tone: 'info' }
    case 'returns': return { v: s.overdue_returns || 0, tone: (s.overdue_returns || 0) > 0 ? 'warn' : 'neutral' }
    case 'maintenance': return { v: s.maintenance || 0, tone: 'neutral' }
    case 'damage': return { v: s.open_damages || 0, tone: (s.open_damages || 0) > 0 ? 'danger' : 'neutral' }
    default: return null
  }
}
const tiles = computed(() => ASSET_TABS.filter(t => t.key !== 'dashboard').map(t => {
  const b = badgeFor(t.key)
  return {
    key: t.key, label: t.label, icon: t.icon, color: GROUP_COLOR[t.group] || 'var(--as-amber)',
    group: GROUP_LABEL[t.group] || t.group, badge: b ? b.v : null, tone: b ? b.tone : 'neutral',
  }
}))
</script>

<style scoped>
.md { position: relative; overflow: hidden; padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }
.md-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.md-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--as-text-secondary); }
.md-eyebrow :deep(svg) { color: var(--as-amber); }
.md-sub { font-size: 11.5px; color: var(--as-text-dim); }

.md-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(184px, 1fr)); gap: 10px; }
.md-tile { position: relative; overflow: hidden; display: flex; align-items: center; gap: 11px; padding: 12px 13px; border-radius: 14px; cursor: pointer; text-align: left; font: inherit;
  background: var(--as-surf-card); border: 1px solid var(--as-border-soft); box-shadow: var(--as-card-shadow); transition: border-color 0.22s, box-shadow 0.22s; }
.md-tile:hover { border-color: color-mix(in srgb, var(--c) 50%, transparent); box-shadow: var(--as-card-shadow-hover); }
.md-tile-glow { position: absolute; inset: 0; pointer-events: none; opacity: 0; background: radial-gradient(120% 130% at 0% 0%, color-mix(in srgb, var(--c) 16%, transparent), transparent 60%); transition: opacity 0.3s; }
.md-tile:hover .md-tile-glow { opacity: 1; }
.md-tile-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; color: var(--c);
  background: color-mix(in srgb, var(--c) 13%, transparent); border: 1px solid color-mix(in srgb, var(--c) 28%, transparent); transition: transform 0.25s var(--as-spring); }
.md-tile:hover .md-tile-ic { transform: scale(1.08) rotate(-4deg); }
.md-tile-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.md-tile-lab { font-size: 13.5px; font-weight: 700; color: var(--as-text); }
.md-tile-grp { font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--as-text-dim); }
.md-tile-badge { font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 999px; color: var(--as-text-secondary); background: var(--as-surface); border: 1px solid var(--as-border-soft); }
.md-tile-badge[data-tone="info"] { color: var(--as-st-allocated); background: var(--as-st-allocated-soft); border-color: color-mix(in srgb, var(--as-st-allocated) 30%, transparent); }
.md-tile-badge[data-tone="warn"] { color: var(--as-st-reserved); background: var(--as-st-reserved-soft); border-color: color-mix(in srgb, var(--as-st-reserved) 32%, transparent); }
.md-tile-badge[data-tone="danger"] { color: var(--as-al-damaged); background: var(--as-al-damaged-soft); border-color: color-mix(in srgb, var(--as-al-damaged) 32%, transparent); }
.md-tile-arr { color: var(--as-text-dim); flex-shrink: 0; transition: transform 0.25s var(--as-spring), color 0.2s; }
.md-tile:hover .md-tile-arr { color: var(--c); transform: translate(2px, -2px); }
</style>
