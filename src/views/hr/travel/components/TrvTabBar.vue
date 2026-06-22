<template>
  <div class="trv-tabbar" data-anim="tabs-dock">
    <div class="trv-tabbar-scroll">
      <Motion v-for="(t, i) in tabs" :key="t.key" as="button" type="button"
        class="dock-item" :class="{ on: modelValue === t.key }"
        :initial="{ opacity: 0, y: -8 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.34, delay: 0.03 * i, ease: [0.16, 1, 0.3, 1] }"
        :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }"
        @click="$emit('update:modelValue', t.key)">
        <component :is="t.icon" :size="15" class="dock-ico" />
        <span class="dock-label">{{ t.label }}</span>
        <span v-if="t.count" class="dock-count">{{ t.count }}</span>
        <span v-if="modelValue === t.key" class="dock-underline" />
      </Motion>
    </div>
  </div>
</template>

<script setup>
import { Motion } from 'motion-v'
defineProps({
  modelValue: { type: String, required: true },
  tabs: { type: Array, required: true },
})
defineEmits(['update:modelValue'])
</script>

<style scoped>
.trv-tabbar {
  position: sticky; top: 0; z-index: 30; margin: 4px 0 16px;
  background: linear-gradient(180deg, var(--trv-canvas) 60%, transparent);
  padding: 6px 0 8px;
}
.trv-tabbar-scroll {
  display: flex; gap: 4px; overflow-x: auto; padding: 5px;
  background: var(--trv-surface-glass); border: 1px solid var(--trv-border);
  border-radius: 15px; backdrop-filter: blur(16px); scrollbar-width: none;
}
.trv-tabbar-scroll::-webkit-scrollbar { display: none; }
.dock-item {
  position: relative; display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 14px; border-radius: 11px; border: none; cursor: pointer;
  background: transparent; color: var(--trv-text-muted);
  font-size: 12.5px; font-weight: 650; white-space: nowrap; transition: color 0.2s, background 0.2s;
}
.dock-item:hover { color: var(--trv-text-secondary); background: rgba(255,255,255,0.03); }
.dock-item.on { color: var(--trv-text); background: var(--trv-amber-soft); }
.dock-ico { opacity: 0.85; }
.dock-item.on .dock-ico { color: var(--trv-amber); opacity: 1; }
.dock-count {
  display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 5px;
  font-size: 10.5px; font-weight: 800; border-radius: 999px;
  background: var(--trv-grad-hero); color: #1a1205;
}
.dock-underline {
  position: absolute; left: 12px; right: 12px; bottom: 3px; height: 2px; border-radius: 2px;
  background: var(--trv-grad-hero);
}
[data-theme="light"] .trv-tabbar { background: linear-gradient(180deg, var(--trv-canvas) 60%, transparent); }
[data-theme="light"] .dock-item:hover { background: rgba(120,90,30,0.06); }
</style>
