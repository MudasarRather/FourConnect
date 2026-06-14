<template>
  <aside class="tower-rail" role="tablist" aria-label="Shifts & Rosters sections">
    <!-- atmosphere: graphite grid + drift orb + scanline + tick-rain -->
    <div class="tr-atmos" aria-hidden="true">
      <span class="tr-grid" />
      <span class="tr-orb" />
      <span class="tr-scan shift-scanline" />
      <span v-for="t in TICKS" :key="t.i" class="tr-tick shift-tick-rain" :style="t.style" />
    </div>

    <!-- brand: a small live instrument dial with a radar sweep -->
    <Motion as="header" class="tr-brand"
      :initial="{ opacity: 0, y: -8 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
      <span class="tr-dial">
        <span class="tr-dial-sweep shift-sweep" aria-hidden="true" />
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="24" r="21" fill="none" stroke="var(--shift-grid-line)" stroke-width="2" />
          <g class="tr-dial-ticks shift-dial-rot">
            <line v-for="n in 12" :key="n" x1="24" :y1="4" x2="24" :y2="n % 3 === 0 ? 9 : 7"
              :transform="`rotate(${n * 30} 24 24)`"
              :stroke="n % 3 === 0 ? 'var(--shift-amber)' : 'var(--shift-text-dim)'" stroke-width="1.4" stroke-linecap="round" />
          </g>
          <line class="tr-hand" x1="24" y1="24" :x2="hand.x" :y2="hand.y" stroke="var(--shift-amber-bright)" stroke-width="1.6" stroke-linecap="round" />
          <circle class="tr-tip" :cx="hand.x" :cy="hand.y" r="2" fill="var(--shift-amber-bright)" />
          <circle cx="24" cy="24" r="3.4" fill="var(--shift-amber)" stroke="#2a1a05" stroke-width="0.8" />
        </svg>
      </span>
      <div class="tr-brand-meta">
        <span class="tr-eyebrow">CONTROL · TOWER</span>
        <span class="tr-name">Shifts &amp; Rosters</span>
        <span class="tr-clock-row">
          <span class="tr-live" aria-hidden="true" />
          <span class="tr-clock shift-mono">{{ clock }}</span>
        </span>
      </div>
    </Motion>

    <!-- grouped tabs -->
    <nav class="tr-body" ref="trackRef">
      <span class="tr-marker" :style="markerStyle" aria-hidden="true" />
      <template v-for="g in groups" :key="g.key">
        <span class="tr-group"><span class="trg-node" aria-hidden="true" />{{ g.label }}</span>
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

    <!-- live status console -->
    <Motion as="footer" class="tr-console" aria-hidden="true"
      :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.28, ease: [0.16, 1, 0.3, 1] }">
      <span class="trc-eq"><i v-for="n in 5" :key="n" :style="{ animationDelay: `${(n * 0.13).toFixed(2)}s` }" /></span>
      <span class="trc-meta">
        <span class="trc-status">OPERATIONAL</span>
        <span class="trc-count shift-mono">{{ liveModules }} modules online</span>
      </span>
    </Motion>
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
const liveModules = computed(() => props.tabs.filter(t => !t.soon).length)

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
  position: sticky; top: 12px; max-height: calc(100vh - 24px); display: flex; flex-direction: column;
  box-shadow: 0 22px 56px -28px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(253, 230, 138, 0.05); }
/* top accent hairline */
.tower-rail::before { content: ''; position: absolute; top: 0; left: 18px; right: 18px; height: 1px; z-index: 3;
  background: linear-gradient(90deg, transparent, var(--shift-amber), transparent); opacity: 0.55; }

.tr-atmos { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.tr-grid { position: absolute; inset: 0; opacity: 0.5;
  background-image: linear-gradient(var(--shift-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--shift-grid-line) 1px, transparent 1px);
  background-size: 22px 22px; }
.tr-orb { position: absolute; width: 170px; height: 170px; top: -46px; left: -50px; border-radius: 50%;
  background: radial-gradient(circle, rgba(251, 146, 60, 0.16), transparent 70%); filter: blur(6px);
  animation: tr-orb-drift 15s ease-in-out infinite; }
.tr-scan { position: absolute; left: 0; right: 0; top: 0; height: 38%;
  background: linear-gradient(180deg, transparent, rgba(251,191,36,0.07), transparent); }
.tr-tick { position: absolute; top: 0; width: 1px; height: 10px; background: linear-gradient(var(--shift-amber), transparent); opacity: 0; }
.shift-tick-rain { animation-name: shift-tick-fall; animation-timing-function: linear; animation-iteration-count: infinite; }

.tr-brand { position: relative; z-index: 2; display: flex; align-items: center; gap: 10px; padding: 4px 6px 14px; border-bottom: 1px solid var(--shift-border-soft); margin-bottom: 10px; }
.tr-dial { position: relative; width: 42px; height: 42px; flex-shrink: 0; animation: tr-dial-breathe 4.5s ease-in-out infinite; }
.tr-dial svg { position: relative; width: 100%; height: 100%; }
.tr-dial-sweep { position: absolute; inset: 1px; border-radius: 50%; background: var(--shift-grad-sweep); z-index: 0;
  -webkit-mask: radial-gradient(closest-side, transparent 62%, #000 64%, #000 100%);
  mask: radial-gradient(closest-side, transparent 62%, #000 64%, #000 100%);
  opacity: 0.9; animation: shift-sweep 5s linear infinite; }
.tr-dial-ticks { transform-origin: 24px 24px; animation: shift-dial-rot 60s linear infinite; }
.tr-tip { transform-box: fill-box; transform-origin: center; animation: tr-tip-pulse 2s ease-in-out infinite; }
.tr-brand-meta { display: flex; flex-direction: column; min-width: 0; }
.tr-eyebrow { font-family: var(--shift-mono); font-size: 8px; letter-spacing: 0.16em; color: var(--shift-amber-strong); }
.tr-name { font-size: 13px; font-weight: 800; color: var(--shift-text); letter-spacing: -0.01em; }
.tr-clock-row { display: inline-flex; align-items: center; gap: 6px; margin-top: 2px; }
.tr-live { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; background: var(--shift-ok);
  animation: tr-live-pulse 2.2s ease-out infinite; }
.tr-clock { font-size: 10px; color: var(--shift-text-muted); }

.tr-body { position: relative; z-index: 2; flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; gap: 1px; overflow-y: auto; scrollbar-width: thin; padding-right: 2px; }
.tr-body::-webkit-scrollbar { width: 5px; }
.tr-body::-webkit-scrollbar-thumb { background: var(--shift-border); border-radius: 4px; }
.tr-group { display: flex; align-items: center; gap: 7px; font-family: var(--shift-mono); font-size: 8.5px; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--shift-text-dim); padding: 12px 10px 5px; }
.tr-group:first-child { padding-top: 2px; }
.trg-node { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; background: var(--shift-amber-strong); box-shadow: 0 0 6px rgba(251, 191, 36, 0.55); }
.tr-group::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, var(--shift-border), transparent); }

.tr-marker { position: absolute; left: 0; width: 100%; border-radius: 11px; z-index: -1; overflow: hidden;
  background: linear-gradient(100deg, rgba(251,191,36,0.18), rgba(251,146,60,0.08));
  border: 1px solid var(--shift-border);
  box-shadow: 0 6px 20px -8px rgba(251, 146, 60, 0.45), inset 0 1px 0 rgba(253, 230, 138, 0.12);
  transition: transform 0.34s var(--shift-spring), height 0.34s var(--shift-spring), opacity 0.2s; }
.tr-marker::before { content: ''; position: absolute; left: 0; top: 14%; bottom: 14%; width: 3px; border-radius: 999px;
  background: var(--shift-grad-rail); animation: tr-rail-glow 2.4s ease-in-out infinite; }
.tr-marker::after { content: ''; position: absolute; inset: 0;
  background: linear-gradient(100deg, transparent 35%, rgba(253,230,138,0.16) 50%, transparent 65%);
  background-size: 220% 100%; animation: tr-marker-shimmer 3.4s ease-in-out infinite; }

.tr-tab { position: relative; display: flex; align-items: center; gap: 9px; width: 100%; text-align: left;
  padding: 9px 10px; border: 0; background: transparent; color: var(--shift-text-muted); cursor: pointer;
  border-radius: 11px; font: inherit; font-size: 12.5px; font-weight: 600; transition: color 0.2s; }
/* hover wipe-in fill (suppressed on the active tab — the marker owns it) */
.tr-tab::before { content: ''; position: absolute; inset: 0; border-radius: 11px; z-index: -1;
  background: linear-gradient(100deg, rgba(251,191,36,0.10), rgba(251,146,60,0.03));
  opacity: 0; transform: scaleX(0.7); transform-origin: left center;
  transition: opacity 0.25s var(--shift-ease), transform 0.3s var(--shift-ease); }
.tr-tab:hover::before { opacity: 1; transform: scaleX(1); }
.tr-tab.is-active::before { opacity: 0; }
.tr-tab:hover { color: var(--shift-text); }
.tr-tab.is-active { color: var(--shift-text); font-weight: 700; }
.tt-ic { display: inline-flex; width: 18px; justify-content: center; color: var(--shift-text-dim); transition: color 0.2s, transform 0.2s; }
.tr-tab:hover .tt-ic { color: var(--shift-amber); transform: translateX(1px); }
.tr-tab.is-active .tt-ic { color: var(--shift-amber); transform: scale(1.08); animation: tr-ic-glow 2.8s ease-in-out infinite; }
.tt-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tt-soon { font-family: var(--shift-mono); font-size: 8px; text-transform: uppercase; letter-spacing: 0.08em;
  padding: 2px 5px; border-radius: 6px; color: var(--shift-text-dim); background: rgba(148,163,184,0.12); }
.tt-count { font-family: var(--shift-mono); font-size: 9.5px; font-weight: 700; min-width: 17px; height: 17px; padding: 0 5px;
  display: inline-flex; align-items: center; justify-content: center; border-radius: 999px;
  background: rgba(251,191,36,0.16); color: var(--shift-amber); border: 1px solid rgba(251,191,36,0.28);
  animation: tr-count-pulse 3s ease-in-out infinite; }
.tr-tab.is-soon { opacity: 0.72; }

.tr-console { position: relative; z-index: 2; display: flex; align-items: center; gap: 9px; margin-top: 10px;
  padding: 9px 8px 2px; border-top: 1px solid var(--shift-border-soft); }
.trc-eq { display: inline-flex; align-items: flex-end; gap: 2px; height: 15px; flex-shrink: 0; }
.trc-eq i { display: block; width: 2.5px; height: 100%; border-radius: 2px; transform-origin: bottom;
  background: linear-gradient(180deg, var(--shift-amber-bright), var(--shift-amber-strong));
  animation: tr-eq-bounce 1.1s ease-in-out infinite; }
.trc-meta { display: flex; flex-direction: column; line-height: 1.3; min-width: 0; }
.trc-status { font-family: var(--shift-mono); font-size: 8px; letter-spacing: 0.16em; color: var(--shift-ok); }
.trc-count { font-size: 9px; color: var(--shift-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ─── scoped keyframes ─── */
@keyframes tr-orb-drift { 0%, 100% { transform: translate(0, 0); opacity: 0.55; } 50% { transform: translate(44px, 64px); opacity: 0.9; } }
@keyframes tr-dial-breathe { 0%, 100% { filter: drop-shadow(0 3px 8px rgba(251,146,60,0.20)); } 50% { filter: drop-shadow(0 4px 14px rgba(251,146,60,0.42)); } }
@keyframes tr-tip-pulse { 0%, 100% { opacity: 0.55; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.35); } }
@keyframes tr-live-pulse { 0% { box-shadow: 0 0 0 0 rgba(52,211,153,0.5); } 70%, 100% { box-shadow: 0 0 0 7px rgba(52,211,153,0); } }
@keyframes tr-rail-glow { 0%, 100% { box-shadow: 0 0 6px rgba(251,191,36,0.45); opacity: 0.85; } 50% { box-shadow: 0 0 12px rgba(251,191,36,0.9); opacity: 1; } }
@keyframes tr-marker-shimmer { 0% { background-position: 120% 0; } 60%, 100% { background-position: -60% 0; } }
@keyframes tr-ic-glow { 0%, 100% { filter: drop-shadow(0 0 0 rgba(251,191,36,0)); } 50% { filter: drop-shadow(0 0 5px rgba(251,191,36,0.75)); } }
@keyframes tr-count-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(251,191,36,0); } 50% { box-shadow: 0 0 0 3px rgba(251,191,36,0.10); } }
@keyframes tr-eq-bounce { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }

@media (prefers-reduced-motion: reduce) {
  .tr-orb, .tr-dial, .tr-tip, .tr-live, .tr-marker::before, .tr-marker::after,
  .tr-tab.is-active .tt-ic, .tt-count, .trc-eq i { animation: none !important; }
}

@media (max-width: 900px) {
  .tower-rail { width: 100%; position: static; max-height: none; }
  .tr-body { flex-direction: row; flex-wrap: wrap; flex: 0 0 auto; }
  .tr-group { width: 100%; }
  .tr-tab { width: auto; }
  .tr-marker { display: none; }
  .tr-tab.is-active { background: linear-gradient(100deg, rgba(251,191,36,0.16), rgba(251,146,60,0.08)); border: 1px solid var(--shift-border); }
}
</style>
