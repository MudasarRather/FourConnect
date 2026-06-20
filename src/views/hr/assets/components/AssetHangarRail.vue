<template>
  <nav class="ahr" :class="{ collapsed }" aria-label="Asset Management sections">
    <div class="ahr-spine" aria-hidden="true"><span class="ahr-spine-glow" /></div>

    <button class="ahr-collapse" @click="collapsed = !collapsed" :title="collapsed ? 'Expand' : 'Collapse'">
      <component :is="collapsed ? ChevronRight : ChevronLeft" :size="15" />
    </button>

    <div class="ahr-groups">
      <div v-for="g in groupedTabs" :key="g.key" class="ahr-group">
        <span v-if="!collapsed" class="ahr-group-label">{{ g.label }}</span>
        <Motion v-for="(t, i) in g.tabs" :key="t.key" as="button" type="button" class="ahr-item"
          :class="{ active: modelValue === t.key, soon: t.soon }"
          :initial="{ opacity: 0, x: -14 }" :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.34, delay: 0.02 * i, ease: [0.16, 1, 0.3, 1] }"
          :whileHover="{ x: collapsed ? 0 : 3 }" :whileTap="{ scale: 0.97 }"
          :title="t.label" @click="$emit('update:modelValue', t.key)">
          <span class="ahr-rail-mark" aria-hidden="true" />
          <span class="ahr-ic"><component :is="t.icon" :size="16" /></span>
          <span v-if="!collapsed" class="ahr-label">{{ t.label }}</span>
          <span v-if="!collapsed && counts[t.key]" class="ahr-count as-mono">{{ counts[t.key] }}</span>
          <span v-if="!collapsed && t.soon" class="ahr-soon">soon</span>
        </Motion>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: String, required: true },
  tabs: { type: Array, required: true },
  groups: { type: Array, required: true },
  counts: { type: Object, default: () => ({}) },
})
defineEmits(['update:modelValue'])

const collapsed = ref(false)
const groupedTabs = computed(() =>
  props.groups
    .map(g => ({ ...g, tabs: props.tabs.filter(t => t.group === g.key) }))
    .filter(g => g.tabs.length)
)
</script>

<style scoped>
.ahr { position: sticky; top: 16px; align-self: flex-start; width: 230px; flex-shrink: 0;
  padding: 16px 12px; border-radius: 20px; border: 1px solid var(--as-border-soft);
  background: var(--as-surf-card); box-shadow: var(--as-card-shadow); transition: width 0.32s var(--as-spring); }
.ahr.collapsed { width: 62px; }

.ahr-spine { position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px; border-radius: 3px; overflow: hidden;
  background: linear-gradient(180deg, transparent, var(--as-steel-dim), transparent); opacity: 0.4; }
.ahr-spine-glow { position: absolute; left: 0; right: 0; height: 30%; background: var(--as-grad-rail); animation: as-bay-pulse 4s ease-in-out infinite; }

.ahr-collapse { position: absolute; top: -10px; right: -10px; width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center;
  background: var(--as-surface-elevated); border: 1px solid var(--as-border-strong); color: var(--as-text-muted); cursor: pointer; transition: all 0.2s; z-index: 2; }
.ahr-collapse:hover { color: var(--as-amber); border-color: color-mix(in srgb, var(--as-amber) 40%, transparent); }

.ahr-groups { display: flex; flex-direction: column; gap: 12px; }
.ahr-group { display: flex; flex-direction: column; gap: 3px; }
.ahr-group-label { font-size: 9.5px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--as-text-dim); padding: 4px 10px 2px; }

.ahr-item { position: relative; display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 10px; border-radius: 11px;
  border: 1px solid transparent; background: transparent; color: var(--as-text-secondary); cursor: pointer; font: inherit; text-align: left;
  transition: background 0.22s, color 0.22s, border-color 0.22s; }
.collapsed .ahr-item { justify-content: center; padding: 9px 0; }
.ahr-item:hover { background: var(--as-surface); color: var(--as-text); }
.ahr-item.active { background: color-mix(in srgb, var(--as-amber) 12%, transparent); color: var(--as-text);
  border-color: color-mix(in srgb, var(--as-amber) 26%, transparent); }
.ahr-rail-mark { position: absolute; left: -12px; top: 50%; transform: translateY(-50%) scaleY(0); width: 3px; height: 60%; border-radius: 3px;
  background: var(--as-grad-rail); box-shadow: 0 0 10px var(--as-amber); transition: transform 0.3s var(--as-spring); }
.ahr-item.active .ahr-rail-mark { transform: translateY(-50%) scaleY(1); }

.ahr-ic { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0; color: inherit; }
.ahr-item.active .ahr-ic { color: var(--as-amber); }
.ahr-label { font-size: 13px; font-weight: 600; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ahr-count { font-size: 10px; font-weight: 700; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px; display: inline-grid; place-items: center;
  color: var(--as-amber); background: color-mix(in srgb, var(--as-amber) 14%, transparent); }
.ahr-soon { font-size: 8.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--as-steel-dim);
  padding: 2px 5px; border-radius: 5px; background: var(--as-st-maintenance-soft); }

@media (max-width: 900px) {
  .ahr { position: relative; top: 0; width: 100%; }
  .ahr.collapsed { width: 100%; }
  .ahr-groups { flex-direction: row; flex-wrap: wrap; gap: 6px; }
  .ahr-group { flex-direction: row; flex-wrap: wrap; }
  .ahr-group-label { display: none; }
  .ahr-spine { display: none; }
}
@media (prefers-reduced-motion: reduce) { .ahr-spine-glow { animation: none; } }
</style>
