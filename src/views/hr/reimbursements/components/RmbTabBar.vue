<template>
  <div class="rmb-tabbar">
    <div ref="shellRef" class="rmb-tab-shell" role="tablist"
      @mouseleave="hoverIdx = -1">
      <!-- receipt-tape perforation shimmer edge -->
      <span class="dock-tape" aria-hidden="true" />
      <!-- ambient sheen + pointer glare -->
      <span class="dock-sheen" aria-hidden="true" />
      <span class="dock-glare" aria-hidden="true" />

      <!-- hover ghost pill (follows the hovered, non-active tab) -->
      <span class="ind-hover" :class="{ show: showHover }" :style="hoverStyle" aria-hidden="true" />

      <!-- the morphing active indicator -->
      <span class="ind-active" :style="activeStyle" aria-hidden="true">
        <span class="ind-shine" />
        <span class="ind-edge" />
      </span>

      <button
        v-for="(t, i) in tabs" :key="t.key"
        :ref="el => setTab(el, i)"
        class="rmb-tab" :class="{ active: modelValue === t.key }"
        role="tab" :aria-selected="modelValue === t.key"
        :style="{ '--i': i }"
        @mouseenter="hoverIdx = i"
        @click="select(t.key)"
      >
        <span class="ic"><component :is="t.icon" :size="15" :stroke-width="2.2" /></span>
        <span class="lbl">{{ t.label }}</span>
        <transition name="badge-pop">
          <span v-if="t.count" class="badge" :class="{ pulse: modelValue !== t.key }">{{ t.count }}</span>
        </transition>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  modelValue: { type: String, default: '' },
  tabs: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue'])

const shellRef = ref(null)
usePointerSpotlight(shellRef)

const tabEls = []                       // index → DOM button (not reactive; read in measure)
const setTab = (el, i) => { tabEls[i] = el || undefined }

const ready = ref(false)
const activeRect = ref(null)
const hoverIdx = ref(-1)
const hoverRect = ref(null)

const rectOf = (el) => (el && shellRef.value)
  ? { left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight }
  : null

const measureActive = () => {
  const idx = props.tabs.findIndex(t => t.key === props.modelValue)
  const r = rectOf(tabEls[idx])
  if (r) { activeRect.value = r; ready.value = true }
}
const measureHover = () => { hoverRect.value = rectOf(tabEls[hoverIdx.value]) }

const select = (key) => { if (key !== props.modelValue) emit('update:modelValue', key) }

const activeStyle = computed(() => {
  const r = activeRect.value
  if (!r) return { opacity: 0 }
  return {
    transform: `translate3d(${r.left}px, ${r.top}px, 0)`,
    width: r.width + 'px', height: r.height + 'px',
    opacity: ready.value ? 1 : 0,
  }
})
const showHover = computed(() =>
  hoverIdx.value >= 0 && !!hoverRect.value && props.tabs[hoverIdx.value]?.key !== props.modelValue)
const hoverStyle = computed(() => {
  const r = hoverRect.value
  if (!r) return { opacity: 0 }
  return { transform: `translate3d(${r.left}px, ${r.top}px, 0)`, width: r.width + 'px', height: r.height + 'px' }
})

watch(hoverIdx, measureHover)
watch(() => props.modelValue, () => nextTick(measureActive))
watch(() => props.tabs, () => nextTick(() => { measureActive(); measureHover() }), { deep: true })

let ro = null
onMounted(() => {
  nextTick(() => {
    measureActive()
    // re-measure after fonts/layout settle so the pill lands precisely
    requestAnimationFrame(() => requestAnimationFrame(measureActive))
  })
  if (typeof ResizeObserver !== 'undefined' && shellRef.value) {
    ro = new ResizeObserver(() => { measureActive(); if (hoverIdx.value >= 0) measureHover() })
    ro.observe(shellRef.value)
  }
})
onBeforeUnmount(() => ro?.disconnect())
</script>

<style scoped>
.rmb-tabbar { position: sticky; top: 0; z-index: 20; padding: 8px 0 16px; }

.rmb-tab-shell {
  position: relative; display: flex; gap: 4px; flex-wrap: wrap;
  padding: 7px; border-radius: 18px; overflow: hidden;
  background: linear-gradient(165deg, var(--rmb-paper-elevated), var(--rmb-surface));
  border: 1px solid var(--rmb-border-soft);
  backdrop-filter: blur(18px) saturate(150%);
  box-shadow: 0 18px 44px -30px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05);
}

/* perforation shimmer edge */
.dock-tape { position: absolute; top: 0; left: 0; right: 0; height: 3px; z-index: 4; pointer-events: none;
  background: var(--hr-gradient-ambient); background-size: 220% 100%;
  animation: rmb-perforation-shimmer 7s linear infinite; opacity: 0.8; }
/* ambient diagonal sheen */
.dock-sheen { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0;
  background: linear-gradient(110deg, transparent 42%, rgba(255,255,255,0.08) 50%, transparent 58%);
  background-size: 240% 100%; background-position: 130% 0; animation: dock-sheen 9s ease-in-out 1.6s infinite; }
/* pointer-tracked glare */
.dock-glare { position: absolute; inset: 0; z-index: 0; pointer-events: none; border-radius: inherit;
  opacity: calc(var(--spot, 0) * 0.9); transition: opacity 0.3s;
  background: radial-gradient(220px 120px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%),
    var(--rmb-glare), transparent 65%); }

/* ── morphing active indicator ── */
.ind-active { position: absolute; left: 0; top: 0; z-index: 1; border-radius: 12px; pointer-events: none;
  background: var(--hr-gradient-hero); will-change: transform, width, height;
  box-shadow: 0 8px 22px -8px rgba(251, 146, 60, 0.65), 0 0 0 1px rgba(251, 191, 36, 0.25), inset 0 1px 0 rgba(255,255,255,0.4);
  transition: transform 0.5s cubic-bezier(0.34, 1.5, 0.5, 1), width 0.42s var(--rmb-spring), height 0.42s var(--rmb-spring), opacity 0.3s; }
.ind-shine { position: absolute; inset: 0; border-radius: inherit; overflow: hidden; }
.ind-shine::after { content: ''; position: absolute; inset: 0;
  background: linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.45) 50%, transparent 60%);
  background-size: 220% 100%; background-position: 130% 0; animation: ind-shimmer 4.5s ease-in-out 0.6s infinite; }
.ind-edge { position: absolute; left: 14%; right: 14%; top: 1px; height: 1.4px; border-radius: 2px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent); }

/* ── hover ghost pill ── */
.ind-hover { position: absolute; left: 0; top: 0; z-index: 0; border-radius: 12px; pointer-events: none;
  background: var(--rmb-surface-elevated); border: 1px solid var(--rmb-border-soft); opacity: 0;
  transform: translate3d(0,0,0); will-change: transform, width, height;
  transition: transform 0.34s var(--rmb-spring), width 0.3s var(--rmb-spring), height 0.3s var(--rmb-spring), opacity 0.22s; }
.ind-hover.show { opacity: 1; }

/* ── tabs ── */
.rmb-tab { position: relative; z-index: 2; display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 14px; border-radius: 12px; font-size: 12.5px; font-weight: 600; cursor: pointer;
  color: var(--rmb-text-muted); background: transparent; border: none; white-space: nowrap;
  transition: color 0.3s var(--rmb-spring), transform 0.18s var(--rmb-spring);
  animation: tab-in 0.5s var(--rmb-spring) backwards; animation-delay: calc(var(--i) * 0.04s); }
.rmb-tab:active { transform: scale(0.95); }
.rmb-tab:hover { color: var(--rmb-text-secondary); }
.rmb-tab.active { color: #1a1206; }

.ic { display: inline-flex; transition: transform 0.4s var(--rmb-spring), filter 0.3s; }
.rmb-tab:hover .ic { transform: translateY(-1px); }
.rmb-tab.active .ic { transform: scale(1.12); filter: drop-shadow(0 1px 3px rgba(26,18,6,0.35)); }
.lbl { transition: letter-spacing 0.3s; }
.rmb-tab.active .lbl { letter-spacing: 0.01em; }

/* count badge */
.badge { min-width: 17px; height: 17px; padding: 0 5px; border-radius: 9px; position: relative;
  display: inline-grid; place-items: center; font-size: 10px; font-weight: 700;
  background: var(--rmb-st-pending-soft); color: var(--rmb-st-pending);
  transition: background 0.3s, color 0.3s; }
.badge.pulse::after { content: ''; position: absolute; inset: 0; border-radius: inherit;
  box-shadow: 0 0 0 0 var(--rmb-st-pending); animation: badge-ping 2s ease-out infinite; }
.rmb-tab.active .badge { background: rgba(26,18,6,0.22); color: #1a1206; }

/* badge enter/leave */
.badge-pop-enter-active { transition: transform 0.4s var(--rmb-spring), opacity 0.3s; }
.badge-pop-leave-active { transition: transform 0.25s ease, opacity 0.2s; }
.badge-pop-enter-from { transform: scale(0); opacity: 0; }
.badge-pop-leave-to { transform: scale(0); opacity: 0; }

@keyframes tab-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes dock-sheen { 0% { background-position: 130% 0; opacity: 0; } 12% { opacity: 1; } 30% { background-position: -40% 0; opacity: 0; } 100% { background-position: -40% 0; opacity: 0; } }
@keyframes ind-shimmer { 0% { background-position: 130% 0; } 22%, 100% { background-position: -60% 0; } }
@keyframes badge-ping { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--rmb-st-pending) 60%, transparent); }
  100% { box-shadow: 0 0 0 7px color-mix(in srgb, var(--rmb-st-pending) 0%, transparent); } }

/* ── light theme ── */
[data-theme="light"] .rmb-tab.active { color: #2a1a06; }
[data-theme="light"] .rmb-tab.active .badge { background: rgba(42,26,6,0.18); color: #2a1a06; }
[data-theme="light"] .dock-glare { mix-blend-mode: multiply; }
[data-theme="light"] .dock-sheen { background: linear-gradient(110deg, transparent 42%, rgba(255,255,255,0.5) 50%, transparent 58%); }

@media (prefers-reduced-motion: reduce) {
  .rmb-tab { animation: none; }
  .dock-tape, .dock-sheen, .ind-shine::after, .badge.pulse::after { animation: none !important; }
  .ind-active { transition: opacity 0.2s; }
  .ind-hover { transition: opacity 0.2s; }
}
</style>
