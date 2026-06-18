<template>
  <aside class="liquid-rail" ref="railRef" role="tablist" aria-label="Training & Development sections">
    <!-- acrylic atmosphere: cursor reveal + slow sheen + starfield -->
    <div class="lr-reveal" aria-hidden="true" />
    <div class="lr-sheen" aria-hidden="true" />
    <div class="lr-grain trn-grain" aria-hidden="true" />

    <!-- brand: minimal rotating monogram -->
    <Motion as="header" class="lr-brand"
      :initial="{ opacity: 0, y: -8 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
      <span class="lr-mark">
        <span class="lr-mark-glow" aria-hidden="true" />
        <svg viewBox="0 0 44 44" aria-hidden="true">
          <circle class="lm-track" cx="22" cy="22" r="16.5" fill="none" />
          <circle class="lm-arc" cx="22" cy="22" r="16.5" fill="none" pathLength="100" />
          <g class="lm-orbit"><circle cx="22" cy="5.5" r="1.7" /></g>
          <circle class="lm-core" cx="22" cy="22" r="4" />
        </svg>
      </span>
      <div class="lr-brand-meta">
        <span class="lr-eyebrow">LEARNING · OBSERVATORY</span>
        <span class="lr-name">Training &amp; Dev</span>
      </div>
    </Motion>

    <!-- nav: a glowing conduit with liquid selection + station tabs -->
    <nav class="lr-nav" ref="trackRef">
      <!-- left-edge conduit rail with a travelling light pulse -->
      <span class="lr-spine" aria-hidden="true"><span class="lr-spine-pulse" /></span>

      <Motion class="lr-sel-trail" :initial="false"
        :animate="{ y: marker.y }" :style="{ height: marker.h + 'px', opacity: marker.show ? 0.55 : 0 }"
        :transition="trailSpring" aria-hidden="true" />
      <Motion class="lr-sel" :initial="false"
        :animate="{ y: marker.y }" :style="{ height: marker.h + 'px', opacity: marker.show ? 1 : 0 }"
        :transition="leadSpring" aria-hidden="true">
        <span class="lr-sel-bar" />
      </Motion>

      <template v-for="g in groups" :key="g.key">
        <span v-if="tabsByGroup(g.key).length" class="lr-group">
          <span class="lr-group-node" aria-hidden="true" />{{ g.label }}
        </span>
        <Motion v-for="(t, i) in tabsByGroup(g.key)" :key="t.key" as="button"
          :ref="el => setRef(el, t.key)"
          class="lr-tab" :class="{ 'is-active': modelValue === t.key, 'is-soon': t.soon }"
          role="tab" :aria-selected="modelValue === t.key"
          :initial="{ opacity: 0, x: -10 }" :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.3, delay: 0.016 * i, ease: [0.16, 1, 0.3, 1] }"
          :whileHover="{ x: 3 }" :whileTap="{ scale: 0.975 }"
          @click="$emit('update:modelValue', t.key)">
          <span class="lt-ic">
            <span class="lt-ic-halo" aria-hidden="true" />
            <component :is="t.icon" :size="15" />
          </span>
          <span class="lt-label">{{ t.label }}</span>
          <span v-if="t.soon" class="lt-soon" title="Coming soon">soon</span>
          <span v-else-if="counts && counts[t.key] != null && counts[t.key] > 0" class="lt-count">{{ counts[t.key] }}</span>
        </Motion>
      </template>
    </nav>

    <!-- footer: minimal live status -->
    <Motion as="footer" class="lr-foot" aria-hidden="true"
      :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.26, ease: [0.16, 1, 0.3, 1] }">
      <span class="lr-pulse" />
      <span class="lr-foot-text">
        <b>Calibrated</b>
        <span class="trn-mono">{{ liveModules }} modules online</span>
      </span>
    </Motion>
  </aside>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { Motion } from 'motion-v'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  modelValue: { type: String, required: true },
  tabs: { type: Array, required: true },
  groups: { type: Array, required: true },
  counts: { type: Object, default: () => ({}) },
})
defineEmits(['update:modelValue'])

const reduced = prefersReduced()
const railRef = ref(null)
usePointerSpotlight(railRef)

const tabsByGroup = (gk) => props.tabs.filter(t => t.group === gk)
const liveModules = computed(() => props.tabs.filter(t => !t.soon).length)

// liquid selection: lead capsule snaps, trail lags → squash/stretch feel
const leadSpring = computed(() => reduced ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 36, mass: 0.85 })
const trailSpring = computed(() => reduced ? { duration: 0 } : { type: 'spring', stiffness: 190, damping: 24, mass: 1.25 })

const trackRef = ref(null)
const refs = ref({})
const setRef = (el, key) => { const root = el?.$el || el; if (root) refs.value[key] = root }
const marker = ref({ y: 0, h: 0, show: false })
const recalc = async () => {
  await nextTick()
  const el = refs.value[props.modelValue]
  const track = trackRef.value
  if (!el || !track) { marker.value.show = false; return }
  marker.value = { y: el.offsetTop, h: el.offsetHeight, show: true }
}
let ro
onMounted(() => { recalc(); ro = new ResizeObserver(recalc); if (trackRef.value) ro.observe(trackRef.value) })
onBeforeUnmount(() => ro?.disconnect())
watch(() => props.modelValue, recalc)
</script>

<style scoped>
.liquid-rail { position: relative; flex-shrink: 0; width: 244px; align-self: stretch;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); border-radius: 24px;
  padding: 15px 12px 13px; overflow: hidden; backdrop-filter: var(--trn-glass-blur); -webkit-backdrop-filter: var(--trn-glass-blur);
  position: sticky; top: 12px; max-height: calc(100vh - 24px); display: flex; flex-direction: column;
  box-shadow: 0 26px 60px -30px rgba(0,0,0,0.78), inset 0 1px 0 rgba(253,230,138,0.06); }
[data-theme="light"] .liquid-rail { box-shadow: 0 24px 54px -30px rgba(120,80,20,0.34), inset 0 1px 0 rgba(255,255,255,0.6); }

/* Fluent-style cursor reveal — lights the panel where the pointer is */
.lr-reveal { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.45s ease;
  background: radial-gradient(240px 240px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%),
    color-mix(in srgb, var(--trn-amber) 18%, transparent), transparent 62%); }
.lr-sheen { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0.5;
  background: linear-gradient(160deg, rgba(253,230,138,0.06), transparent 36%); }
.lr-grain { z-index: 0; opacity: 0.04; }

/* ── brand monogram ── */
.lr-brand { position: relative; z-index: 2; flex-shrink: 0; display: flex; align-items: center; gap: 11px; padding: 0 6px 12px; margin-bottom: 10px; border-bottom: 1px solid var(--trn-border-soft); }
.lr-mark { position: relative; width: 42px; height: 42px; flex-shrink: 0; }
.lr-mark-glow { position: absolute; inset: -4px; border-radius: 50%; background: radial-gradient(circle, var(--trn-dome-glow), transparent 68%); animation: lr-breathe 4.5s ease-in-out infinite; }
.lr-mark svg { position: relative; width: 100%; height: 100%; }
.lm-track { stroke: var(--trn-border-strong); stroke-width: 1.4; }
.lm-arc { stroke: var(--trn-amber); stroke-width: 2.2; stroke-linecap: round; stroke-dasharray: 30 70; transform-origin: 22px 22px; animation: trn-orbit-spin 5.5s linear infinite; filter: drop-shadow(0 0 4px var(--trn-dome-glow)); }
.lm-orbit { transform-origin: 22px 22px; animation: trn-orbit-spin 7.5s linear infinite reverse; }
.lm-orbit circle { fill: var(--trn-amber-bright); }
.lm-core { fill: var(--trn-amber); animation: lr-core 3.2s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
.lr-brand-meta { display: flex; flex-direction: column; min-width: 0; gap: 3px; }
.lr-eyebrow { font-family: var(--trn-mono); font-size: 8px; letter-spacing: 0.16em; color: var(--trn-amber-strong); }
.lr-name { font-size: 14px; font-weight: 800; color: var(--trn-text); letter-spacing: -0.015em; }

/* ── nav (no scroll — sized to fit the viewport) ── */
.lr-nav { position: relative; z-index: 2; flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; gap: 0;
  overflow: hidden; padding-left: 4px; }

/* left-edge conduit rail */
.lr-spine { position: absolute; left: 4px; top: 8px; bottom: 6px; width: 2px; border-radius: 2px; z-index: 0; pointer-events: none; overflow: hidden;
  background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--trn-amber) 24%, transparent) 12%, color-mix(in srgb, var(--trn-amber) 24%, transparent) 88%, transparent); }
.lr-spine-pulse { position: absolute; left: -1px; width: 4px; height: 44px; border-radius: 3px; top: -44px;
  background: linear-gradient(180deg, transparent, var(--trn-amber-bright), transparent); filter: blur(1px); animation: lr-spine-travel 3.8s cubic-bezier(0.5,0,0.5,1) infinite; }

/* liquid selection capsules (absolute, glide via spring) */
.lr-sel, .lr-sel-trail { position: absolute; left: 0; top: 0; width: 100%; border-radius: 13px; z-index: 0; pointer-events: none; }
.lr-sel { background: linear-gradient(100deg, color-mix(in srgb, var(--trn-amber) 22%, transparent), color-mix(in srgb, var(--trn-ember) 8%, transparent));
  border: 1px solid color-mix(in srgb, var(--trn-amber) 32%, transparent);
  box-shadow: 0 8px 22px -10px rgba(251,146,60,0.5), inset 0 1px 0 rgba(253,230,138,0.16); overflow: hidden; }
.lr-sel-bar { position: absolute; left: 0; top: 16%; bottom: 16%; width: 3px; border-radius: 999px; background: var(--trn-grad-rail); box-shadow: 0 0 10px var(--trn-amber); animation: lr-bar 2.4s ease-in-out infinite; }
.lr-sel::after { content: ''; position: absolute; inset: 0; background: linear-gradient(100deg, transparent 36%, rgba(253,230,138,0.18) 50%, transparent 64%); background-size: 220% 100%; animation: lr-shimmer 3.6s ease-in-out infinite; }
.lr-sel-trail { background: radial-gradient(120% 90% at 30% 50%, color-mix(in srgb, var(--trn-amber) 26%, transparent), transparent 72%); filter: blur(6px); }

.lr-group { position: relative; z-index: 1; font-family: var(--trn-mono); font-size: 8.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--trn-text-dim);
  padding: clamp(8px, 1vh, 13px) 10px 4px 22px; }
.lr-group:first-of-type { padding-top: 4px; }
.lr-group-node { position: absolute; left: -1px; top: calc(100% - 12px); width: 8px; height: 8px; border-radius: 50%; background: var(--trn-surface-elevated);
  border: 1.5px solid color-mix(in srgb, var(--trn-amber) 45%, transparent); box-shadow: 0 0 6px color-mix(in srgb, var(--trn-amber) 30%, transparent); }

.lr-tab { position: relative; z-index: 1; display: flex; align-items: center; gap: 11px; width: 100%; text-align: left;
  padding: clamp(6px, 0.82vh, 9px) 11px; border: 0; background: transparent; color: var(--trn-text-muted); cursor: pointer;
  border-radius: 13px; font: inherit; font-size: 12.5px; font-weight: 600; transition: color 0.22s; }
/* hover wash (suppressed on active — the capsule owns it) */
.lr-tab::before { content: ''; position: absolute; inset: 0; border-radius: 13px; z-index: -1; opacity: 0; transform: scale(0.96);
  background: color-mix(in srgb, var(--trn-amber) 9%, transparent); transition: opacity 0.24s var(--trn-ease), transform 0.28s var(--trn-ease); }
.lr-tab:hover::before { opacity: 1; transform: scale(1); }
.lr-tab.is-active::before { opacity: 0; }
.lr-tab:hover { color: var(--trn-text); }
.lr-tab.is-active { color: var(--trn-text); font-weight: 700; }
.lt-ic { position: relative; display: inline-flex; width: 18px; justify-content: center; align-items: center; color: var(--trn-text-dim); transition: color 0.22s, transform 0.22s var(--trn-spring); }
.lt-ic-halo { position: absolute; inset: -6px; border-radius: 50%; opacity: 0; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--trn-amber) 42%, transparent), transparent 70%); transition: opacity 0.3s; }
.lr-tab:hover .lt-ic { color: var(--trn-amber); transform: translateX(1px); }
.lr-tab.is-active .lt-ic { color: var(--trn-amber); transform: scale(1.14); }
.lr-tab.is-active .lt-ic-halo { opacity: 1; animation: lr-halo 2.6s ease-in-out infinite; }
.lt-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lt-soon { font-family: var(--trn-mono); font-size: 8px; text-transform: uppercase; letter-spacing: 0.08em; padding: 2px 5px; border-radius: 6px; color: var(--trn-text-dim); background: rgba(148,163,184,0.12); }
.lt-count { font-family: var(--trn-mono); font-size: 9.5px; font-weight: 700; min-width: 17px; height: 17px; padding: 0 5px;
  display: inline-flex; align-items: center; justify-content: center; border-radius: 999px;
  background: rgba(251,191,36,0.16); color: var(--trn-amber); border: 1px solid rgba(251,191,36,0.28); }
.lr-tab.is-active .lt-count { animation: lr-count-pop 0.4s var(--trn-spring); }
.lr-tab.is-soon { opacity: 0.72; }

/* ── footer ── */
.lr-foot { position: relative; z-index: 2; flex-shrink: 0; display: flex; align-items: center; gap: 10px; margin-top: 8px; padding: 10px 8px 0; border-top: 1px solid var(--trn-border-soft); }
.lr-pulse { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: var(--trn-st-completed); box-shadow: 0 0 8px var(--trn-st-completed); animation: trn-pulse-dot 2.2s ease-out infinite; }
.lr-foot-text { display: flex; flex-direction: column; line-height: 1.35; min-width: 0; }
.lr-foot-text b { font-family: var(--trn-mono); font-size: 8.5px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--trn-st-completed); }
.lr-foot-text span { font-size: 9px; color: var(--trn-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ── keyframes ── */
@keyframes lr-breathe { 0%, 100% { opacity: 0.55; transform: scale(0.94); } 50% { opacity: 1; transform: scale(1.06); } }
@keyframes lr-core { 0%, 100% { filter: drop-shadow(0 0 2px rgba(251,191,36,0.4)); transform: scale(0.9); } 50% { filter: drop-shadow(0 0 7px rgba(251,191,36,0.9)); transform: scale(1.1); } }
@keyframes lr-bar { 0%, 100% { box-shadow: 0 0 6px rgba(251,191,36,0.5); opacity: 0.85; } 50% { box-shadow: 0 0 13px rgba(251,191,36,0.95); opacity: 1; } }
@keyframes lr-shimmer { 0% { background-position: 120% 0; } 60%, 100% { background-position: -60% 0; } }
@keyframes lr-spine-travel { 0% { top: -44px; opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
@keyframes lr-halo { 0%, 100% { transform: scale(0.9); opacity: 0.5; } 50% { transform: scale(1.18); opacity: 0.95; } }
@keyframes lr-count-pop { 0% { transform: scale(0.6); } 60% { transform: scale(1.18); } 100% { transform: scale(1); } }

@media (prefers-reduced-motion: reduce) {
  .lr-mark-glow, .lm-arc, .lm-orbit, .lm-core, .lr-sel-bar, .lr-sel::after, .lr-pulse, .lr-spine-pulse, .lr-tab.is-active .lt-ic-halo, .lr-grain { animation: none !important; }
}
@media (max-width: 900px) {
  .liquid-rail { width: 100%; position: static; max-height: none; }
  .lr-nav { flex-direction: row; flex-wrap: wrap; flex: 0 0 auto; gap: 4px; padding-left: 0; }
  .lr-spine { display: none; }
  .lr-group { width: 100%; padding-left: 10px; }
  .lr-group-node { display: none; }
  .lr-tab { width: auto; }
  .lr-sel, .lr-sel-trail { display: none; }
  .lr-tab.is-active { background: linear-gradient(100deg, color-mix(in srgb, var(--trn-amber) 18%, transparent), transparent 82%); border: 1px solid var(--trn-border-strong); }
}
</style>
