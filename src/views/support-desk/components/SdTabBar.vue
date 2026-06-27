<template>
  <nav class="sd-tabbar" role="tablist" :aria-label="ariaLabel">
    <div class="tabbar-track" ref="trackRef">
      <button
        v-for="t in tabs"
        :key="t.key"
        :ref="(el) => (tabRefs[t.key] = el)"
        role="tab"
        type="button"
        :aria-selected="modelValue === t.key"
        :class="['tab', modelValue === t.key && 'is-active']"
        @click="select(t.key)"
      >
        <component :is="t.icon" v-if="t.icon" :size="14" class="tab-icon" />
        <span class="tab-label">{{ t.label }}</span>
        <span v-if="t.count != null" class="tab-count">{{ t.count }}</span>
      </button>
      <div class="tab-underline" :style="underlineStyle" />
    </div>
  </nav>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  modelValue: { type: String, required: true },
  tabs: { type: Array, required: true },
  ariaLabel: { type: String, default: 'Support Desk sections' },
})
const emit = defineEmits(['update:modelValue'])

const trackRef = ref(null)
const tabRefs = ref({})
const underlineStyle = ref({ width: '0px', transform: 'translateX(0)' })

const recalc = () => {
  nextTick(() => {
    const el = tabRefs.value[props.modelValue]
    if (!el || !trackRef.value) return
    underlineStyle.value = {
      width: `${el.offsetWidth}px`,
      transform: `translateX(${el.offsetLeft}px)`,
    }
    // keep the active tab in view on overflow
    try { el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }) } catch { /* noop */ }
  })
}

const select = (key) => {
  if (key === props.modelValue) return
  emit('update:modelValue', key)
}

watch(() => props.modelValue, recalc)
watch(() => props.tabs.map(t => `${t.label}:${t.count}`).join('|'), recalc)

let ro
onMounted(() => {
  recalc()
  if (trackRef.value && typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => recalc())
    ro.observe(trackRef.value)
  }
  window.addEventListener('resize', recalc)
})
onBeforeUnmount(() => {
  ro?.disconnect()
  window.removeEventListener('resize', recalc)
})
</script>

<style scoped>
.sd-tabbar {
  position: sticky;
  top: 0;
  z-index: 50;
  margin: 0 0 18px;
  padding: 6px 0;
  background: linear-gradient(180deg, var(--sd-canvas) 60%, transparent);
}
.tabbar-track {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0 4px;
  border-bottom: 1px solid var(--sd-border);
  overflow-x: auto;
}
.tabbar-track::-webkit-scrollbar { display: none; }
.tabbar-track { scrollbar-width: none; }

.tab {
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 15px 14px;
  background: transparent;
  border: none;
  color: var(--sd-text-muted);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
  cursor: pointer;
  white-space: nowrap;
  transition: color 220ms var(--sd-spring);
}
.tab:hover { color: var(--sd-text-secondary); }
.tab.is-active { color: var(--sd-text); font-weight: 600; }
.tab-icon { opacity: 0.85; transition: transform 220ms var(--sd-spring), opacity 220ms var(--sd-spring); }
.tab.is-active .tab-icon { opacity: 1; color: var(--sd-amber); }

.tab-count {
  display: inline-grid; place-items: center;
  min-width: 20px; height: 18px;
  padding: 0 6px;
  font-size: 10px;
  font-weight: 700;
  background: var(--sd-amber-soft);
  border-radius: 999px;
  color: var(--sd-amber);
}

.tab-underline {
  position: absolute;
  left: 0;
  bottom: -1px;
  height: 2px;
  background: var(--sd-grad-rail);
  border-radius: 2px;
  z-index: 1;
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.45), 0 0 24px rgba(251, 146, 60, 0.25);
  transition: transform 360ms cubic-bezier(0.22, 1, 0.36, 1), width 360ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform, width;
}

[data-theme="light"] .sd-tabbar { background: linear-gradient(180deg, var(--sd-canvas) 60%, transparent); }
[data-theme="light"] .tab-underline { box-shadow: 0 0 12px rgba(217, 119, 6, 0.4); }

@media (prefers-reduced-motion: reduce) {
  .tab-underline { transition: none; }
}
</style>
