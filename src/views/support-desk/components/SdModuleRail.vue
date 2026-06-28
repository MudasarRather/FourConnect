<template>
  <nav class="sd-rail" aria-label="Support Desk sections">
    <div class="sd-rail-track">
      <RouterLink
        v-for="m in SD_MODULES"
        :key="m.key"
        :to="`${base}/${m.key}`"
        class="rail-item"
        :class="{ on: m.key === active }"
        :style="{ '--ac': m.accent }"
      >
        <component :is="m.icon" :size="15" class="rail-ic" />
        <span class="rail-label">{{ m.label }}</span>
        <span class="rail-spark" />
      </RouterLink>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { RouterLink } from 'vue-router'
import { SD_MODULES } from '../modules.js'

const route = useRoute()
const base = computed(() => (route.path.startsWith('/user') ? '/user/support-desk' : '/admin/support-desk'))
const active = computed(() => {
  // /admin/support-desk/<key>  — take the segment right after support-desk
  const parts = route.path.split('/').filter(Boolean)
  const ix = parts.indexOf('support-desk')
  return ix >= 0 ? (parts[ix + 1] || 'dashboard') : 'dashboard'
})
</script>

<style scoped>
.sd-rail {
  position: sticky; top: 0; z-index: 12; margin: 0 0 4px;
  background: linear-gradient(180deg, var(--sd-canvas) 70%, transparent);
  padding: 4px 0 6px;
}
.sd-rail-track {
  display: flex; gap: 6px; overflow-x: auto; padding: 5px; border-radius: 14px;
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border);
  scrollbar-width: thin;
}
.sd-rail-track::-webkit-scrollbar { height: 5px; }
.sd-rail-track::-webkit-scrollbar-thumb { background: var(--sd-border-strong); border-radius: 999px; }

.rail-item {
  position: relative; display: inline-flex; align-items: center; gap: 7px; flex-shrink: 0;
  padding: 8px 13px; border-radius: 10px; text-decoration: none; white-space: nowrap;
  color: var(--sd-text-muted); font-size: 12.5px; font-weight: 600;
  border: 1px solid transparent; transition: color 0.2s, background 0.2s, border-color 0.2s, transform 0.2s var(--sd-spring);
}
.rail-ic { color: var(--ac); opacity: 0.75; transition: opacity 0.2s; }
.rail-item:hover { color: var(--sd-text); background: var(--sd-surface); transform: translateY(-1px); }
.rail-item:hover .rail-ic { opacity: 1; }
.rail-item.on { color: var(--sd-text); background: var(--sd-surface-elevated); border-color: color-mix(in srgb, var(--ac) 35%, var(--sd-border-strong)); }
.rail-item.on .rail-ic { opacity: 1; }
.rail-spark { position: absolute; left: 12px; right: 12px; bottom: 3px; height: 2px; border-radius: 2px; background: var(--ac); opacity: 0; transform: scaleX(0.3); transform-origin: center; transition: opacity 0.25s, transform 0.25s var(--sd-spring); }
.rail-item.on .rail-spark { opacity: 1; transform: scaleX(1); box-shadow: 0 0 8px var(--ac); }

@media (prefers-reduced-motion: reduce) {
  .rail-item, .rail-spark { transition: none; }
  .rail-item:hover { transform: none; }
}
</style>
