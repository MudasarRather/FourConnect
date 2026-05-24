<template>
  <nav class="onb-dock" role="tablist" :aria-label="$attrs['aria-label'] || 'Onboarding sections'">
    <div class="onb-dock-shell">
      <div class="onb-dock-track" ref="trackEl">
        <Motion
          v-for="t in tabs"
          :key="t.key"
          as="button"
          :ref="el => setTabRef(el, t.key)"
          class="onb-dock-tab"
          :class="{ 'is-active': modelValue === t.key }"
          role="tab"
          :aria-selected="modelValue === t.key"
          :initial="{ opacity: 0, y: 10 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.32, delay: 0.02 * tabs.indexOf(t), ease: [0.22, 1, 0.36, 1] }"
          :whileHover="{ y: -3, transition: { duration: 0.18 } }"
          :whileTap="{ scale: 0.94 }"
          @click="$emit('update:modelValue', t.key)"
          @mouseenter="hovered = t.key"
          @mouseleave="hovered = ''"
        >
          <span class="dock-icon"><component :is="t.icon" :size="15" /></span>
          <span class="dock-label">{{ t.label }}</span>
          <span v-if="t.count != null && t.count > 0" class="dock-badge">{{ t.count }}</span>
        </Motion>
        <!-- Sliding pill behind the active tab -->
        <span class="onb-dock-pill" :style="pillStyle" />
      </div>
    </div>
    <span class="onb-dock-shadow" aria-hidden="true" />
  </nav>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue'
import { Motion } from 'motion-v'

const props = defineProps({
  tabs: { type: Array, required: true },
  modelValue: { type: String, required: true },
})
defineEmits(['update:modelValue'])

const trackEl = ref(null)
const tabRefs = ref({})
const setTabRef = (el, key) => {
  // Motion-v exposes the rendered element via $el
  const root = el?.$el || el
  if (root) tabRefs.value[key] = root
}
const pill = ref({ x: 0, w: 0 })
const hovered = ref('')

const pillStyle = computed(() => ({
  transform: `translateX(${pill.value.x}px)`,
  width: `${pill.value.w}px`,
}))

const recalc = async () => {
  await nextTick()
  const el = tabRefs.value[props.modelValue]
  if (!el || !trackEl.value) return
  const trackRect = trackEl.value.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  // Pill position is RELATIVE to scroll start, not visible viewport, so include scrollLeft
  pill.value = { x: r.left - trackRect.left + trackEl.value.scrollLeft, w: r.width }
  // Smoothly bring the active tab into view (centered) so the first tab is never clipped silently
  if (typeof el.scrollIntoView === 'function') {
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }
}

let ro
onMounted(() => {
  recalc()
  ro = new ResizeObserver(recalc)
  if (trackEl.value) ro.observe(trackEl.value)
  Object.values(tabRefs.value).forEach(el => el && ro.observe(el))
  window.addEventListener('resize', recalc)
})
onBeforeUnmount(() => {
  ro?.disconnect()
  window.removeEventListener('resize', recalc)
})
watch(() => props.modelValue, recalc)
watch(() => props.tabs, recalc, { deep: true })
</script>

<style scoped>
.onb-dock {
  position: sticky; top: 0;
  z-index: 50;
  display: flex; justify-content: center;
  padding: 14px 4px 12px;
}
.onb-dock-shell {
  position: relative;
  display: inline-flex;
  background: rgba(14, 14, 16, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  padding: 6px;
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  box-shadow:
    0 24px 60px -28px rgba(251, 146, 60, 0.30),
    0 6px 20px -10px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  max-width: 100%;
  overflow: hidden;
}
.onb-dock-shell::before {
  content: '';
  position: absolute; inset: -1px;
  border-radius: inherit;
  background: linear-gradient(120deg, rgba(251, 191, 36, 0.32), transparent 40%, rgba(251, 146, 60, 0.22) 80%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  padding: 1px;
  -webkit-mask-composite: xor; mask-composite: exclude;
  opacity: 0.5;
  pointer-events: none;
}
.onb-dock-track {
  position: relative;
  display: flex; gap: 2px;
  overflow-x: auto; scrollbar-width: none;
  scroll-behavior: smooth;
  scroll-padding-inline: 32px;
  /* Edge fade — content vanishes softly so users see the rail can scroll */
  -webkit-mask: linear-gradient(90deg,
    transparent 0,
    #000 16px,
    #000 calc(100% - 16px),
    transparent 100%);
          mask: linear-gradient(90deg,
    transparent 0,
    #000 16px,
    #000 calc(100% - 16px),
    transparent 100%);
}
.onb-dock-track::-webkit-scrollbar { display: none; }
.onb-dock-tab { scroll-snap-align: center; }

.onb-dock-tab {
  position: relative; z-index: 2;
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 14px;
  background: transparent; border: 0;
  color: var(--hr-text-muted);
  font: inherit; font-size: 12px; font-weight: 600; letter-spacing: 0.2px;
  white-space: nowrap; cursor: pointer;
  border-radius: 999px;
  transition: color .22s var(--hr-spring);
}
.onb-dock-tab:hover { color: var(--hr-text); }
.onb-dock-tab.is-active { color: #1f1408; font-weight: 700; }
.dock-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px;
  transition: transform .25s var(--hr-spring);
}
.onb-dock-tab.is-active .dock-icon { transform: scale(1.08); }
.dock-label {
  transition: opacity .2s var(--hr-spring);
}
.dock-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 18px;
  padding: 0 5px; border-radius: 999px;
  font-size: 10px; font-weight: 700; font-variant-numeric: tabular-nums;
  background: rgba(251, 191, 36, 0.18); color: var(--hr-accent-gold);
  border: 1px solid rgba(251, 191, 36, 0.3);
}
.onb-dock-tab.is-active .dock-badge {
  background: rgba(31, 20, 8, 0.25); color: #1f1408;
  border-color: rgba(31, 20, 8, 0.3);
}

.onb-dock-pill {
  position: absolute; top: 0; left: 0; bottom: 0;
  background: var(--hr-gradient-hero);
  border-radius: 999px;
  z-index: 1;
  box-shadow: 0 8px 24px -8px rgba(251, 146, 60, 0.65);
  transition: transform 380ms var(--hr-spring), width 380ms var(--hr-spring);
}

.onb-dock-shadow {
  position: absolute; left: 50%; bottom: -2px; transform: translateX(-50%);
  width: 60%; height: 8px;
  background: radial-gradient(ellipse at center, rgba(251, 146, 60, 0.4), transparent 75%);
  filter: blur(8px); opacity: 0.45; pointer-events: none;
}

@media (max-width: 980px) {
  .onb-dock { justify-content: flex-start; padding-left: 8px; padding-right: 8px; overflow: hidden; }
  .onb-dock-shell { max-width: 100%; overflow: hidden; }
}

/* ─── Light theme overrides ───────────────────────────────────────────────
   Dark glass pill becomes cream glass; active tab text stays dark on gold.
   Inactive badge gets readable gold-on-cream. Blur reduced (reads weaker on cream).
   ────────────────────────────────────────────────────────────────────── */
[data-theme="light"] .onb-dock-shell {
  background: rgba(255, 250, 240, 0.78);
  border-color: rgba(40, 25, 10, 0.10);
  backdrop-filter: blur(16px) saturate(130%);
  -webkit-backdrop-filter: blur(16px) saturate(130%);
  box-shadow:
    0 24px 60px -28px rgba(251, 146, 60, 0.30),
    0 6px 20px -10px rgba(40, 25, 10, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
[data-theme="light"] .onb-dock-shell::before {
  background: linear-gradient(120deg, rgba(217, 119, 6, 0.50), transparent 40%, rgba(234, 88, 12, 0.35) 80%);
  opacity: 0.6;
}
[data-theme="light"] .onb-dock-tab { color: var(--hr-text-muted); }
[data-theme="light"] .onb-dock-tab:hover { color: var(--hr-text); }
/* Active tab text stays dark — sits on gold gradient pill which is unchanged. */
[data-theme="light"] .onb-dock-tab.is-active { color: #1f1408; }
/* Inactive badge — gold-on-cream needs higher contrast */
[data-theme="light"] .dock-badge {
  background: rgba(217, 119, 6, 0.18);
  color: #92400e;
  border-color: rgba(217, 119, 6, 0.40);
}
/* Pill shadow softens slightly so it reads as glow not floor */
[data-theme="light"] .onb-dock-pill {
  box-shadow: 0 8px 24px -8px rgba(217, 119, 6, 0.55);
}
[data-theme="light"] .onb-dock-shadow {
  background: radial-gradient(ellipse at center, rgba(217, 119, 6, 0.32), transparent 75%);
}
</style>
