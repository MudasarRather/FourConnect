<template>
  <aside class="att-dock" role="tablist" aria-label="Attendance sections">
    <!-- ════════════════════════════════════════════════════════
         Ambient atmosphere — tick rain + perspective baseline + glow
         Different motif from edoc (no papers, no fold corner).
         Attendance gets: vertical hour-tick particles, second-pulse,
         and a "punch ticket" active indicator with sheen sweep.
         ════════════════════════════════════════════════════════ -->
    <div class="dock-atmos" aria-hidden="true">
      <div class="atm-vrid" />
      <div class="atm-warm-aurora" />
      <!-- (Pulse-ring circles removed per design feedback — felt
           visually noisy. Ambient depth is preserved by the vertical
           clock-tick column + atm-wheel + warm aurora layer below.) -->
      <!-- Vertical clock-tick column down the dock edge -->
      <svg class="atm-rail" viewBox="0 0 30 800" preserveAspectRatio="xMidYMin slice">
        <line v-for="n in 24" :key="n"
          :x1="22" :y1="(n - 1) * 36 + 20"
          :x2="n % 6 === 0 ? 8 : 16" :y2="(n - 1) * 36 + 20"
          :stroke="n % 6 === 0 ? 'rgba(251, 191, 36, 0.55)' : 'rgba(251, 191, 36, 0.20)'"
          stroke-width="1" stroke-linecap="round" />
      </svg>
      <!-- Slow-rotating hour-tick wheel near the bottom of the dock -->
      <svg class="atm-wheel" viewBox="0 0 80 80" aria-hidden="true">
        <g class="atm-wheel-rot">
          <line v-for="n in 12" :key="n"
            :x1="40 + 32 * Math.cos((n - 1) * (Math.PI / 6) - Math.PI / 2)"
            :y1="40 + 32 * Math.sin((n - 1) * (Math.PI / 6) - Math.PI / 2)"
            :x2="40 + 36 * Math.cos((n - 1) * (Math.PI / 6) - Math.PI / 2)"
            :y2="40 + 36 * Math.sin((n - 1) * (Math.PI / 6) - Math.PI / 2)"
            stroke="rgba(251, 191, 36, 0.35)" stroke-width="1.4" stroke-linecap="round" />
        </g>
      </svg>
    </div>

    <!-- ════════════════════════════════════════════════════════
         Brand header — Clock face icon + module name
         ════════════════════════════════════════════════════════ -->
    <header class="dock-brand" aria-hidden="true">
      <div class="brand-clock">
        <svg viewBox="0 0 40 40">
          <defs>
            <linearGradient id="bclockFace" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#fde68a" />
              <stop offset="55%" stop-color="#fbbf24" />
              <stop offset="100%" stop-color="#fb923c" />
            </linearGradient>
          </defs>
          <circle cx="20" cy="20" r="17" fill="url(#bclockFace)" stroke="rgba(255,255,255,0.6)" stroke-width="1.4"/>
          <line v-for="n in 12" :key="n"
            :x1="20 + 14 * Math.cos((n - 1) * (Math.PI / 6) - Math.PI / 2)"
            :y1="20 + 14 * Math.sin((n - 1) * (Math.PI / 6) - Math.PI / 2)"
            :x2="20 + 16 * Math.cos((n - 1) * (Math.PI / 6) - Math.PI / 2)"
            :y2="20 + 16 * Math.sin((n - 1) * (Math.PI / 6) - Math.PI / 2)"
            stroke="rgba(58, 40, 16, 0.85)" :stroke-width="n % 3 === 0 ? 1.6 : 1" stroke-linecap="round" />
          <line class="bc-hand bc-hand-min" x1="20" y1="20" x2="20" y2="9" stroke="#1f1408" stroke-width="2.2" stroke-linecap="round" />
          <line class="bc-hand bc-hand-hr" x1="20" y1="20" x2="27" y2="20" stroke="#1f1408" stroke-width="1.6" stroke-linecap="round" />
          <line class="bc-hand bc-hand-sec" x1="20" y1="20" x2="20" y2="6" stroke="#c2410c" stroke-width="0.8" stroke-linecap="round" />
          <circle cx="20" cy="20" r="2" fill="#1f1408" />
        </svg>
        <span class="brand-pulse" />
      </div>
      <div class="brand-meta">
        <span class="brand-eyebrow">PUNCH · CONSOLE</span>
        <span class="brand-name">Time Engine</span>
      </div>
    </header>

    <!-- ════════════════════════════════════════════════════════
         Rail body — grouped vertical items
         Active "punch ticket" indicator morphs vertically between items.
         ════════════════════════════════════════════════════════ -->
    <nav class="dock-rail" ref="trackRef">
      <span class="ticket" :style="ticketStyle" aria-hidden="true">
        <span class="ticket-body" />
        <span class="ticket-perf-l" />
        <span class="ticket-perf-r" />
        <span class="ticket-sheen" />
        <span class="ticket-stamp">
          <svg viewBox="0 0 16 16">
            <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2 1.5" />
            <path d="M5.5 8l1.8 1.8L11 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          </svg>
        </span>
      </span>

      <template v-for="(grp, gi) in groupedTabs" :key="grp.key">
        <header class="group-head">
          <span class="group-num">{{ String(gi + 1).padStart(2, '0') }}</span>
          <span class="group-label">{{ grp.label }}</span>
          <span class="group-rule" />
        </header>
        <ul class="group-items">
          <li v-for="t in grp.items" :key="t.key">
            <Motion
              as="button"
              :data-key="t.key"
              role="tab"
              type="button"
              :aria-selected="modelValue === t.key"
              :class="['punch-tab', modelValue === t.key && 'is-active', t.soon && 'is-soon']"
              :whileHover="modelValue === t.key ? {} : { x: 3 }"
              :whileTap="{ scale: 0.97 }"
              :transition="{ duration: 0.28, ease: EASE }"
              @click="select(t.key)"
            >
              <span class="pt-tick" aria-hidden="true" />
              <span class="pt-icon"><component :is="t.icon" :size="15" /></span>
              <span class="pt-label">{{ t.label }}</span>
              <span v-if="t.count != null && t.count > 0" class="pt-count">{{ t.count > 99 ? '99+' : t.count }}</span>
              <span v-else-if="t.soon" class="pt-soon" />
            </Motion>
          </li>
        </ul>
      </template>
    </nav>

    <!-- Bottom hour ticker (mini live readout) -->
    <footer class="dock-foot">
      <span class="foot-dot" />
      <span class="foot-time onb-mono">{{ liveHM }}</span>
      <span class="foot-label">on the clock</span>
    </footer>

    <!-- subtle bottom scan ray (different from edoc — vertical sweep) -->
    <span class="dock-vertical-scan" aria-hidden="true" />
  </aside>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Motion } from 'motion-v'

const EASE = [0.16, 1, 0.3, 1]

const props = defineProps({
  modelValue: { type: String, required: true },
  tabs: { type: Array, required: true },
})
const emit = defineEmits(['update:modelValue'])

const trackRef = ref(null)
const ticketStyle = ref({ opacity: 0 })
const liveHM = ref('--:--')

// Grouping config — attendance has its own (different from edoc's
// "Navigation/Documents/Operations/System").
const GROUPS = {
  floor:    { order: 1, label: 'Live Floor' },
  workflow: { order: 2, label: 'Workflow' },
  config:   { order: 3, label: 'Configuration' },
  audit:    { order: 4, label: 'Audit & Logs' },
}
const TAB_GROUP = {
  dashboard:   'floor',
  daily:       'floor',
  corrections: 'workflow',
  wfh:         'workflow',
  overtime:    'workflow',
  shifts:      'config',
  biometric:   'config',
  policies:    'config',
  'late-rules':'config',
  remote:      'config',
  geo:         'config',
  holidays:    'config',
  reports:     'audit',
  logs:        'audit',
  exceptions:  'audit',
}

const groupedTabs = computed(() => {
  const map = {}
  for (const t of props.tabs) {
    const g = TAB_GROUP[t.key] || 'config'
    if (!map[g]) map[g] = { key: g, label: GROUPS[g]?.label || g, order: GROUPS[g]?.order || 99, items: [] }
    map[g].items.push(t)
  }
  return Object.values(map).sort((a, b) => a.order - b.order)
})

// Stagger delays for the emanating pulse-rings (one per group).
const pulseSeeds = Array.from({ length: 6 }, (_, i) => ({
  delay: i * 0.9,
  duration: 4 + (i % 3) * 0.6,
}))
const pulseStyle = (n) => ({
  animationDelay: pulseSeeds[n - 1].delay + 's',
  animationDuration: pulseSeeds[n - 1].duration + 's',
})

const recalc = () => nextTick(() => {
  const track = trackRef.value
  if (!track) return
  const el = track.querySelector(`[data-key="${props.modelValue}"]`)
  if (!el) return
  ticketStyle.value = {
    width: `${el.offsetWidth}px`,
    height: `${el.offsetHeight}px`,
    transform: `translate(${el.offsetLeft}px, ${el.offsetTop}px)`,
    opacity: 1,
  }
  el.scrollIntoView?.({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
})

const select = (key) => { if (key !== props.modelValue) emit('update:modelValue', key) }

let tickId = null
const refreshLive = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  liveHM.value = `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

watch(() => props.modelValue, recalc)
watch(() => props.tabs.map(t => `${t.label}${t.count}`).join('|'), recalc)

let ro
onMounted(() => {
  refreshLive()
  tickId = setInterval(refreshLive, 30000)
  recalc()
  if (trackRef.value && typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(recalc); ro.observe(trackRef.value)
  }
  window.addEventListener('resize', recalc)
})
onBeforeUnmount(() => {
  if (tickId) clearInterval(tickId)
  ro?.disconnect()
  window.removeEventListener('resize', recalc)
})
</script>

<style scoped>
@import '../../../../styles/attendance-theme.css';

/* ════════════════════════════════════════════════════════════════════
   ATT DOCK — Vertical "Punch-Card Console"
   Different from edoc's "Records Command Rail": no paper sheet fold,
   no document corner peel. Instead: a horizontal "punch ticket" with
   perforated edges that morphs vertically between items, an analog
   clock-face brand, falling time-card particles, a vertical scan ray.
   ════════════════════════════════════════════════════════════════════ */

.att-dock {
  position: sticky; top: 16px;
  align-self: flex-start;
  flex-shrink: 0;
  width: 254px;
  max-height: calc(100vh - 32px);
  margin: 0 18px 0 0;
  display: flex; flex-direction: column;
  border-radius: 22px;
  background:
    radial-gradient(120% 60% at 0% 0%, rgba(251,191,36,0.10), transparent 50%),
    radial-gradient(110% 60% at 100% 100%, rgba(251,146,60,0.08), transparent 55%),
    linear-gradient(180deg, rgba(28,22,18,0.88), rgba(20,16,14,0.86));
  border: 1px solid rgba(251, 191, 36, 0.26);
  backdrop-filter: blur(34px) saturate(170%);
  -webkit-backdrop-filter: blur(34px) saturate(170%);
  box-shadow:
    0 26px 60px -28px rgba(0,0,0,0.75),
    inset 0 1px 0 rgba(255,255,255,0.045) inset,
    0 -1px 0 rgba(180, 83, 9, 0.10) inset;
  overflow: hidden;
  z-index: 4;
}

/* ── Atmosphere layers ── */
.dock-atmos {
  position: absolute; inset: 0; pointer-events: none; overflow: hidden;
  border-radius: 22px;
}
.atm-vrid {
  position: absolute; inset: -6px;
  background-image:
    linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
  background-size: 24px 24px;
  mask-image: radial-gradient(120% 80% at 50% 50%, #000 30%, transparent 95%);
  -webkit-mask-image: radial-gradient(120% 80% at 50% 50%, #000 30%, transparent 95%);
  opacity: 0.45;
}
.atm-warm-aurora {
  position: absolute; inset: -40%;
  background:
    radial-gradient(50% 30% at 50% 0%, rgba(251,191,36,0.22), transparent 60%),
    radial-gradient(60% 35% at 50% 100%, rgba(251,146,60,0.16), transparent 60%),
    radial-gradient(40% 25% at 100% 50%, rgba(234,88,12,0.12), transparent 60%);
  filter: blur(8px);
  animation: att-warm-aurora 24s ease-in-out infinite;
  opacity: 0.85;
}
/* Emanating pulse rings — replaces the falling paper-card motif. */
.atm-pulses {
  position: absolute; inset: 0; width: 100%; height: 100%;
  opacity: 0.55;
  pointer-events: none;
}
.atm-pulses g { transform-origin: center; }
.atm-pulse-ring {
  fill: none;
  stroke: rgba(251, 191, 36, 0.55);
  stroke-width: 1.2;
  transform-origin: var(--cx, 38px) var(--cy, 40px);
  animation: att-pulse-emanate linear infinite;
}
.atm-pulses g .atm-pulse-ring {
  /* Set per-group origin via CSS custom prop fallback */
  transform-box: fill-box;
  transform-origin: center;
}

/* Vertical clock-tick column on the dock's left edge */
.atm-rail {
  position: absolute; left: 0; top: 80px; bottom: 70px; width: 30px;
  opacity: 0.55;
  pointer-events: none;
}

/* Faint slow-rotating hour-tick wheel ghost at the bottom */
.atm-wheel {
  position: absolute; left: 50%; bottom: 70px;
  transform: translateX(-50%);
  width: 80px; height: 80px;
  opacity: 0.16;
  pointer-events: none;
}
.atm-wheel-rot {
  transform-origin: 40px 40px;
  animation: att-hand-sweep 120s linear infinite;
}

/* ── Brand header ── */
.dock-brand {
  position: relative; z-index: 4;
  display: flex; align-items: center; gap: 11px;
  padding: 16px 16px 14px;
  border-bottom: 1px dashed rgba(251, 191, 36, 0.22);
}
.brand-clock {
  position: relative; width: 40px; height: 40px;
  border-radius: 10px;
  box-shadow: 0 6px 18px -8px rgba(251, 146, 60, 0.55);
}
.brand-clock svg { width: 40px; height: 40px; display: block; }
.bc-hand { transform-origin: 20px 20px; }
.bc-hand-min { animation: att-hand-sweep-slow 60s linear infinite; }
.bc-hand-hr  { animation: att-hand-sweep-slow 720s linear infinite; }
.bc-hand-sec { animation: att-hand-sweep 6s linear infinite; }
.brand-pulse {
  position: absolute; inset: -3px; border-radius: 14px;
  background: radial-gradient(closest-side, rgba(251, 146, 60, 0.5), transparent 70%);
  z-index: -1; opacity: 0.7;
  animation: att-warm-aurora 6s ease-in-out infinite;
}
.brand-meta { display: flex; flex-direction: column; line-height: 1; flex: 1; }
.brand-eyebrow {
  font-family: var(--hr-mono); font-size: 8.5px; font-weight: 700;
  letter-spacing: 0.22em; text-transform: uppercase; color: #fbbf24;
}
.brand-name {
  margin-top: 4px; font-size: 14px; font-weight: 800;
  letter-spacing: -0.01em;
  background: linear-gradient(120deg, #fff 10%, #fcd34d 60%, #fb923c 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}

/* ── Rail body ── */
.dock-rail {
  position: relative; z-index: 2;
  flex: 1;
  overflow-y: auto;
  padding: 6px 10px 14px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.dock-rail::-webkit-scrollbar { width: 0; height: 0; display: none; }

/* ── Group headers ── */
.group-head {
  display: grid; grid-template-columns: auto auto 1fr;
  align-items: center; gap: 8px;
  padding: 12px 4px 6px;
  position: relative; z-index: 3;
}
.group-num {
  font-family: var(--hr-mono);
  font-size: 9.5px; font-weight: 700; color: var(--att-orange-200);
  letter-spacing: 0.5px;
}
.group-label {
  font-size: 9.5px; font-weight: 700;
  color: var(--hr-text-muted);
  text-transform: uppercase; letter-spacing: 1.4px;
}
.group-rule {
  height: 1px;
  background: linear-gradient(90deg, rgba(251,191,36,0.30) 0%, rgba(255,255,255,0.04) 60%, transparent 100%);
}

.group-items {
  list-style: none; padding: 0; margin: 0 0 4px;
  display: flex; flex-direction: column; gap: 2px;
}

/* ── Tab = "punch slot" with leading second-tick ── */
.punch-tab {
  position: relative; z-index: 2;
  display: flex; align-items: center; gap: 11px;
  width: 100%; height: 36px;
  padding: 0 10px 0 14px;
  border: none; border-radius: 11px;
  background: transparent;
  color: var(--hr-text-muted);
  font-size: 12.5px; font-weight: 500;
  white-space: nowrap; cursor: pointer; text-align: left;
  font-family: inherit;
  transition: color 240ms var(--att-spring), padding-left 0.32s var(--att-spring);
  overflow: visible;
}
.punch-tab:hover { color: var(--hr-text-secondary); }
.punch-tab.is-active { color: #1f1408; font-weight: 700; padding-left: 18px; }

/* leading vertical tick (like a clock second-hand mark) */
.pt-tick {
  position: absolute; left: 4px; top: 50%;
  width: 2px; height: 0;
  background: linear-gradient(180deg, rgba(251, 191, 36, 0.8), rgba(251, 146, 60, 0.8));
  border-radius: 1px;
  transform: translateY(-50%);
  transition: height 0.32s var(--att-spring), opacity 0.25s;
  opacity: 0;
}
.punch-tab:hover .pt-tick { height: 18px; opacity: 1; }
.punch-tab.is-active .pt-tick {
  height: 22px; opacity: 1;
  background: linear-gradient(180deg, #1f1408, #3a2810);
  box-shadow: 0 0 6px rgba(31, 20, 8, 0.5);
}

.pt-icon {
  flex: 0 0 18px; width: 18px; height: 18px;
  display: inline-flex; align-items: center; justify-content: center;
  transition: transform 0.36s var(--att-spring), color 220ms var(--att-spring);
}
.pt-icon :deep(svg) { width: 15px; height: 15px; display: block; }
.punch-tab:hover .pt-icon { transform: rotate(-4deg) scale(1.06); }
.punch-tab.is-active .pt-icon { transform: rotate(-2deg) scale(1.14); color: #1f1408; }

.pt-label {
  flex: 1; overflow: hidden; text-overflow: ellipsis;
  transition: letter-spacing 0.32s var(--att-spring), transform 0.28s var(--att-spring);
}
.punch-tab.is-active .pt-label { letter-spacing: 0.02em; transform: translateX(1px); }

.pt-count {
  display: inline-grid; place-items: center;
  min-width: 18px; height: 16px; padding: 0 5px;
  font-family: var(--hr-mono);
  font-size: 9.5px; font-weight: 800; border-radius: 999px;
  background: #ef4444; color: #fff;
  box-shadow: 0 0 0 2px rgba(20, 16, 14, 0.6), 0 0 10px rgba(248,113,113,0.4);
  animation: att-live-pulse 2.4s ease-in-out infinite;
}
.punch-tab.is-active .pt-count {
  background: rgba(31, 20, 8, 0.88); color: #fff;
  box-shadow: 0 0 0 2px rgba(255,255,255,0.20);
}
.pt-soon {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--att-orange-200); box-shadow: 0 0 6px var(--att-orange-200);
}

/* ── The morphing "punch ticket" (active background, slides vertically) ── */
.ticket {
  position: absolute; top: 0; left: 0; z-index: 1;
  border-radius: 12px;
  background: transparent;
  transition:
    transform 520ms var(--att-ease-quint),
    width 520ms var(--att-ease-quint),
    height 520ms var(--att-ease-quint),
    opacity 320ms ease;
  will-change: transform, width, height;
}
.ticket-body {
  position: absolute; inset: 0; border-radius: 12px;
  background: linear-gradient(135deg, #fde68a 0%, #fbbf24 38%, #f59e0b 68%, #fb923c 100%);
  background-size: 220% 220%;
  animation: att-gradient-flow 6s linear infinite;
  box-shadow:
    0 6px 20px -8px rgba(251, 146, 60, 0.7),
    0 0 0 1px rgba(251, 191, 36, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.5),
    inset 0 -8px 12px -8px rgba(180, 83, 9, 0.35);
}
/* Perforated left + right edges — the "punch ticket" effect */
.ticket-perf-l,
.ticket-perf-r {
  position: absolute; top: 6px; bottom: 6px; width: 4px;
  background:
    radial-gradient(circle at 50% 4px, rgba(180, 83, 9, 0.6) 1.1px, transparent 1.5px),
    radial-gradient(circle at 50% 10px, rgba(180, 83, 9, 0.6) 1.1px, transparent 1.5px),
    radial-gradient(circle at 50% 16px, rgba(180, 83, 9, 0.6) 1.1px, transparent 1.5px),
    radial-gradient(circle at 50% 22px, rgba(180, 83, 9, 0.6) 1.1px, transparent 1.5px);
  background-repeat: repeat-y; background-size: 4px 12px;
  pointer-events: none;
  opacity: 0.55;
}
.ticket-perf-l { left: 2px; }
.ticket-perf-r { right: 2px; }
.ticket-sheen {
  position: absolute; inset: 0; border-radius: 12px;
  background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.35) 50%, transparent 65%);
  transform: translateX(-100%);
  animation: att-ticket-sheen 3.6s var(--att-spring) infinite;
  mix-blend-mode: screen;
  pointer-events: none;
}
.ticket-stamp {
  position: absolute; right: 8px; bottom: 5px;
  width: 16px; height: 16px;
  display: grid; place-items: center;
  border-radius: 50%;
  background: rgba(120, 53, 15, 0.18); color: rgba(120, 53, 15, 0.90);
  border: 1px dashed rgba(180, 83, 9, 0.55);
  animation: att-stamp-press 4s ease-in-out infinite;
}
.ticket-stamp svg { width: 10px; height: 10px; }

/* ── Bottom mini live readout ── */
.dock-foot {
  position: relative; z-index: 3;
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px 14px;
  border-top: 1px dashed rgba(251, 191, 36, 0.22);
  font-size: 11px; color: var(--hr-text-muted);
}
.foot-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--att-success-100);
  box-shadow: 0 0 8px var(--att-success-100);
  animation: att-live-pulse 2s ease-in-out infinite;
  flex-shrink: 0;
}
.foot-time {
  font-size: 13px; font-weight: 800;
  color: var(--att-teal-100); letter-spacing: 0.5px;
}
.foot-label {
  font-size: 9px; font-weight: 700; letter-spacing: 1.4px;
  text-transform: uppercase; color: var(--hr-text-muted);
}

/* Vertical scan ray (different from edoc's horizontal one) */
.dock-vertical-scan {
  position: absolute; left: 0; top: 0; bottom: 0; width: 2px;
  background: linear-gradient(180deg, transparent 0%, rgba(251, 191, 36, 0.7) 30%, rgba(251, 146, 60, 0.9) 50%, rgba(251, 191, 36, 0.7) 70%, transparent 100%);
  background-size: 100% 200%;
  animation: att-dock-scan 7s linear infinite;
  z-index: 5; pointer-events: none;
  filter: blur(0.3px) drop-shadow(0 0 6px rgba(251, 146, 60, 0.5));
}

/* ────────────── Reduced motion ────────────── */
@media (prefers-reduced-motion: reduce) {
  .atm-warm-aurora, .atm-pulse-ring, .atm-wheel-rot,
  .ticket-body, .ticket-sheen, .ticket-stamp,
  .brand-pulse, .bc-hand-sec, .bc-hand-min, .bc-hand-hr,
  .pt-count, .foot-dot, .dock-vertical-scan {
    animation: none !important;
  }
  .punch-tab, .pt-icon, .pt-label, .pt-tick { transition: none !important; }
}

/* ════════════════════════════════════════════════════════════════════
   LIGHT THEME
   ════════════════════════════════════════════════════════════════════ */
[data-theme="light"] .att-dock {
  background:
    radial-gradient(120% 60% at 0% 0%, rgba(217,119,6,0.12), transparent 50%),
    radial-gradient(110% 60% at 100% 100%, rgba(234,88,12,0.10), transparent 55%),
    linear-gradient(180deg, rgba(255,250,240,0.94), rgba(255,246,232,0.90));
  border-color: rgba(180,83,9,0.26);
  box-shadow:
    0 26px 60px -28px rgba(120,53,15,0.32),
    0 1px 0 rgba(255,255,255,0.70) inset,
    0 -1px 0 rgba(180,83,9,0.06) inset;
}
[data-theme="light"] .atm-vrid {
  background-image:
    linear-gradient(rgba(120,53,15,0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(120,53,15,0.07) 1px, transparent 1px);
}
[data-theme="light"] .atm-warm-aurora {
  background:
    radial-gradient(50% 30% at 50% 0%, rgba(251,191,36,0.26), transparent 60%),
    radial-gradient(60% 35% at 50% 100%, rgba(251,146,60,0.18), transparent 60%),
    radial-gradient(40% 25% at 100% 50%, rgba(234,88,12,0.14), transparent 60%);
}
[data-theme="light"] .atm-pulse-ring { stroke: rgba(180, 83, 9, 0.55); }
[data-theme="light"] .atm-rail line { stroke: rgba(180, 83, 9, 0.45) !important; }
[data-theme="light"] .atm-rail line:nth-child(6n) { stroke: rgba(194, 65, 12, 0.75) !important; }
[data-theme="light"] .atm-wheel { opacity: 0.20; }
[data-theme="light"] .atm-wheel line { stroke: rgba(180, 83, 9, 0.55); }
[data-theme="light"] .dock-brand { border-bottom-color: rgba(180,83,9,0.28); }
[data-theme="light"] .brand-eyebrow { color: #b45309; }
[data-theme="light"] .brand-name {
  background: linear-gradient(120deg, #1a1410 5%, #b45309 55%, #ea580c 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
[data-theme="light"] .brand-clock { box-shadow: 0 6px 16px -6px rgba(180,83,9,0.5); }

[data-theme="light"] .group-num { color: #c2410c; }
[data-theme="light"] .group-label { color: #92400e; }
[data-theme="light"] .group-rule {
  background: linear-gradient(90deg, rgba(180,83,9,0.45) 0%, rgba(40,25,10,0.08) 60%, transparent 100%);
}

[data-theme="light"] .punch-tab { color: #6b5840; }
[data-theme="light"] .punch-tab:hover { color: #44362a; }
[data-theme="light"] .punch-tab.is-active { color: #3a2810; }

[data-theme="light"] .pt-tick { background: linear-gradient(180deg, #c2410c, #ea580c); }
[data-theme="light"] .punch-tab.is-active .pt-tick {
  background: linear-gradient(180deg, #1f1408, #3a2810);
}
[data-theme="light"] .pt-count {
  background: #dc2626; color: #fff;
  box-shadow: 0 0 0 2px rgba(255,250,240,0.85), 0 0 10px rgba(220,38,38,0.35);
}
[data-theme="light"] .punch-tab.is-active .pt-count {
  background: rgba(120,53,15,0.88);
}

[data-theme="light"] .ticket-body {
  box-shadow:
    0 6px 20px -8px rgba(180,83,9,0.55),
    0 0 0 1px rgba(180,83,9,0.42),
    inset 0 1px 0 rgba(255,255,255,0.6),
    inset 0 -8px 12px -8px rgba(120,53,15,0.32);
}
[data-theme="light"] .ticket-perf-l,
[data-theme="light"] .ticket-perf-r {
  background:
    radial-gradient(circle at 50% 4px, rgba(120,53,15,0.6) 1.1px, transparent 1.5px),
    radial-gradient(circle at 50% 10px, rgba(120,53,15,0.6) 1.1px, transparent 1.5px),
    radial-gradient(circle at 50% 16px, rgba(120,53,15,0.6) 1.1px, transparent 1.5px),
    radial-gradient(circle at 50% 22px, rgba(120,53,15,0.6) 1.1px, transparent 1.5px);
  background-repeat: repeat-y; background-size: 4px 12px;
}

[data-theme="light"] .dock-foot { border-top-color: rgba(180,83,9,0.28); }
[data-theme="light"] .foot-dot { background: var(--att-success-300); box-shadow: 0 0 8px var(--att-success-300); }
[data-theme="light"] .foot-time { color: var(--att-teal-500); }
[data-theme="light"] .foot-label { color: var(--hr-text-muted); }

[data-theme="light"] .dock-vertical-scan {
  background: linear-gradient(180deg, transparent 0%, rgba(217,119,6,0.7) 30%, rgba(234,88,12,0.9) 50%, rgba(217,119,6,0.7) 70%, transparent 100%);
  filter: blur(0.3px) drop-shadow(0 0 6px rgba(217,119,6,0.5));
}
</style>
