<template>
  <aside class="tower-rail" role="tablist" aria-label="Shifts & Rosters sections">
    <!-- atmosphere: graphite grid + scanline + tick-rain -->
    <div class="tr-atmos" aria-hidden="true">
      <span class="tr-grid" />
      <span class="tr-scan shift-scanline" />
      <span v-for="t in TICKS" :key="t.i" class="tr-tick shift-tick-rain" :style="t.style" />
    </div>

    <!-- brand: a small live instrument dial -->
    <header class="tr-brand">
      <span class="tr-dial">
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="24" r="21" fill="none" stroke="var(--shift-grid-line)" stroke-width="2" />
          <g class="tr-dial-ticks shift-dial-rot">
            <line v-for="n in 12" :key="n" x1="24" :y1="4" x2="24" :y2="n % 3 === 0 ? 9 : 7"
              :transform="`rotate(${n * 30} 24 24)`"
              :stroke="n % 3 === 0 ? 'var(--shift-amber)' : 'var(--shift-text-dim)'" stroke-width="1.4" stroke-linecap="round" />
          </g>
          <line class="tr-hand" x1="24" y1="24" :x2="hand.x" :y2="hand.y" stroke="var(--shift-amber-bright)" stroke-width="1.6" stroke-linecap="round" />
          <circle cx="24" cy="24" r="3.4" fill="var(--shift-amber)" stroke="#2a1a05" stroke-width="0.8" />
        </svg>
      </span>
      <div class="tr-brand-meta">
        <span class="tr-eyebrow">CONTROL · TOWER</span>
        <span class="tr-name">Shifts &amp; Rosters</span>
        <span class="tr-clock shift-mono">{{ clock }}</span>
      </div>
    </header>

    <!-- grouped tabs -->
    <nav class="tr-body" ref="trackRef">
      <span class="tr-marker" :style="markerStyle" aria-hidden="true" />
      <template v-for="g in groups" :key="g.key">
        <span class="tr-group">{{ g.label }}</span>
        <Motion v-for="(t, i) in tabsByGroup(g.key)" :key="t.key" as="button"
          :ref="el => setRef(el, t.key)"
          class="tr-tab" :class="{ 'is-active': modelValue === t.key, 'is-soon': t.soon }"
          role="tab" :aria-selected="modelValue === t.key"
          :initial="{ opacity: 0, x: -10 }" :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.3, delay: 0.02 * i, ease: [0.16, 1, 0.3, 1] }"
          :whileHover="{ x: 2 }" :whileTap="{ scale: 0.97 }"
          @click="$emit('update:modelValue', t.key)">
          <span class="tt-ic"><component :is="t.icon" :size="15" /></span>
          <span class="tt-label">{{ t.label }}</span>
          <span v-if="t.soon" class="tt-soon" title="Coming soon">soon</span>
          <span v-else-if="counts && counts[t.key] != null && counts[t.key] > 0" class="tt-count">{{ counts[t.key] }}</span>
        </Motion>
      </template>
    </nav>
  </aside>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { Motion } from 'motion-v'

const props = defineProps({
  modelValue: { type: String, required: true },
  tabs: { type: Array, required: true },
  groups: { type: Array, required: true },
  counts: { type: Object, default: () => ({}) },
})
defineEmits(['update:modelValue'])

const TICKS = Array.from({ length: 7 }, (_, i) => ({
  i,
  style: {
    left: `${8 + (i * 13) % 88}%`,
    animationDelay: `${(i * 0.9).toFixed(2)}s`,
    animationDuration: `${(4 + (i % 4)).toFixed(1)}s`,
  },
}))

const tabsByGroup = (gk) => props.tabs.filter(t => t.group === gk)

// active marker
const trackRef = ref(null)
const refs = ref({})
const setRef = (el, key) => { const root = el?.$el || el; if (root) refs.value[key] = root }
const marker = ref({ y: 0, h: 0, show: false })
const markerStyle = computed(() => ({
  transform: `translateY(${marker.value.y}px)`,
  height: `${marker.value.h}px`,
  opacity: marker.value.show ? 1 : 0,
}))
const recalc = async () => {
  await nextTick()
  const el = refs.value[props.modelValue]
  const track = trackRef.value
  if (!el || !track) { marker.value.show = false; return }
  marker.value = { y: el.offsetTop, h: el.offsetHeight, show: true }
}
let ro
onMounted(() => {
  recalc()
  ro = new ResizeObserver(recalc)
  if (trackRef.value) ro.observe(trackRef.value)
})
onBeforeUnmount(() => ro?.disconnect())
watch(() => props.modelValue, recalc)

// live clock for the brand + dial hand
const now = ref(new Date())
let timer = null
onMounted(() => { timer = setInterval(() => { now.value = new Date() }, 1000) })
onBeforeUnmount(() => clearInterval(timer))
const clock = computed(() => {
  const d = now.value
  let h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m} ${ampm}`
})
const hand = computed(() => {
  const d = now.value
  const min = d.getHours() * 60 + d.getMinutes()
  const ang = (min / 1440) * Math.PI * 2 - Math.PI / 2
  return { x: 24 + 14 * Math.cos(ang), y: 24 + 14 * Math.sin(ang) }
})
</script>

<style scoped>
.tower-rail { position: relative; flex-shrink: 0; width: 212px; align-self: stretch;
  background: var(--shift-surface); border: 1px solid var(--shift-border-soft); border-radius: 22px;
  padding: 14px 12px; overflow: hidden; backdrop-filter: var(--shift-glass-blur); -webkit-backdrop-filter: var(--shift-glass-blur);
  position: sticky; top: 12px; max-height: calc(100vh - 24px); display: flex; flex-direction: column; }
.tr-atmos { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.tr-grid { position: absolute; inset: 0; opacity: 0.5;
  background-image: linear-gradient(var(--shift-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--shift-grid-line) 1px, transparent 1px);
  background-size: 22px 22px; }
.tr-scan { position: absolute; left: 0; right: 0; top: 0; height: 38%;
  background: linear-gradient(180deg, transparent, rgba(251,191,36,0.07), transparent); }
.tr-tick { position: absolute; top: 0; width: 1px; height: 10px; background: linear-gradient(var(--shift-amber), transparent); opacity: 0; }
.shift-tick-rain { animation-name: shift-tick-fall; animation-timing-function: linear; animation-iteration-count: infinite; }

.tr-brand { position: relative; z-index: 2; display: flex; align-items: center; gap: 10px; padding: 4px 6px 14px; border-bottom: 1px solid var(--shift-border-soft); margin-bottom: 10px; }
.tr-dial { width: 42px; height: 42px; flex-shrink: 0; filter: drop-shadow(0 4px 10px rgba(251,146,60,0.25)); }
.tr-dial svg { width: 100%; height: 100%; }
.tr-dial-ticks { transform-origin: 24px 24px; animation: shift-dial-rot 60s linear infinite; }
.tr-brand-meta { display: flex; flex-direction: column; min-width: 0; }
.tr-eyebrow { font-family: var(--shift-mono); font-size: 8px; letter-spacing: 0.16em; color: var(--shift-amber-strong); }
.tr-name { font-size: 13px; font-weight: 800; color: var(--shift-text); letter-spacing: -0.01em; }
.tr-clock { font-size: 10px; color: var(--shift-text-muted); margin-top: 1px; }

.tr-body { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 1px; overflow-y: auto; scrollbar-width: thin; padding-right: 2px; }
.tr-body::-webkit-scrollbar { width: 5px; }
.tr-body::-webkit-scrollbar-thumb { background: var(--shift-border); border-radius: 4px; }
.tr-group { font-family: var(--shift-mono); font-size: 8.5px; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--shift-text-dim); padding: 12px 10px 5px; }
.tr-group:first-child { padding-top: 2px; }
.tr-marker { position: absolute; left: 0; width: 100%; border-radius: 11px; z-index: -1;
  background: linear-gradient(100deg, rgba(251,191,36,0.16), rgba(251,146,60,0.08));
  border: 1px solid var(--shift-border); transition: transform 0.34s var(--shift-spring), height 0.34s var(--shift-spring), opacity 0.2s; }
.tr-marker::before { content: ''; position: absolute; left: 0; top: 14%; bottom: 14%; width: 3px; border-radius: 999px; background: var(--shift-grad-rail); }

.tr-tab { position: relative; display: flex; align-items: center; gap: 9px; width: 100%; text-align: left;
  padding: 9px 10px; border: 0; background: transparent; color: var(--shift-text-muted); cursor: pointer;
  border-radius: 11px; font: inherit; font-size: 12.5px; font-weight: 600; transition: color 0.2s; }
.tr-tab:hover { color: var(--shift-text); }
.tr-tab.is-active { color: var(--shift-text); font-weight: 700; }
.tt-ic { display: inline-flex; width: 18px; justify-content: center; color: var(--shift-text-dim); transition: color 0.2s, transform 0.2s; }
.tr-tab:hover .tt-ic { color: var(--shift-amber); }
.tr-tab.is-active .tt-ic { color: var(--shift-amber); transform: scale(1.08); }
.tt-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tt-soon { font-family: var(--shift-mono); font-size: 8px; text-transform: uppercase; letter-spacing: 0.08em;
  padding: 2px 5px; border-radius: 6px; color: var(--shift-text-dim); background: rgba(148,163,184,0.12); }
.tt-count { font-family: var(--shift-mono); font-size: 9.5px; font-weight: 700; min-width: 17px; height: 17px; padding: 0 5px;
  display: inline-flex; align-items: center; justify-content: center; border-radius: 999px;
  background: rgba(251,191,36,0.16); color: var(--shift-amber); border: 1px solid rgba(251,191,36,0.28); }
.tr-tab.is-soon { opacity: 0.72; }

@media (max-width: 900px) {
  .tower-rail { width: 100%; position: static; max-height: none; }
  .tr-body { flex-direction: row; flex-wrap: wrap; }
  .tr-group { width: 100%; }
  .tr-tab { width: auto; }
  .tr-marker { display: none; }
  .tr-tab.is-active { background: linear-gradient(100deg, rgba(251,191,36,0.16), rgba(251,146,60,0.08)); border: 1px solid var(--shift-border); }
}
</style>
