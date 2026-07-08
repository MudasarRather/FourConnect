<template>
  <!-- The Timetable — busiest arrival hours (7 × 24, viewer-local time). Hovering
       a slot raises an animated departure-card tooltip and lights up its whole
       day-row and hour-column, like tracing a service on a printed timetable. -->
  <div class="sd-ihm" @pointerleave="clearTip">
    <div ref="gridEl" class="ihm-grid" :style="{ '--cols': 24 }">
      <span class="ihm-corner" />
      <span v-for="h in 24" :key="'h' + h" class="ihm-hlbl sd-mono" :class="{ on: tip && tip.hour === h - 1 }">
        {{ (h - 1) % 6 === 0 || (tip && tip.hour === h - 1) ? String(h - 1).padStart(2, '0') : '' }}
      </span>
      <template v-for="(d, di) in DAYS" :key="d.key">
        <span class="ihm-dlbl sd-mono" :class="{ on: tip && tip.dow === d.dow }">{{ d.label }}</span>
        <i v-for="h in 24" :key="d.key + h" class="ihm-cell"
          :class="{ peak: isPeak(d.dow, h - 1), trace: tip && tip.dow !== d.dow && tip.hour !== h - 1 ? false : tip && (tip.dow === d.dow || tip.hour === h - 1), on: tip && tip.dow === d.dow && tip.hour === h - 1 }"
          :style="cellStyle(d.dow, h - 1, di, h - 1)"
          @pointerenter="setTip($event, d, h - 1)" />
      </template>

      <!-- departure-card tooltip -->
      <Transition name="ihm-tip">
        <div v-if="tip" class="ihm-tip" :class="{ below: tip.below }" :style="{ left: tip.x + 'px', top: tip.y + 'px' }">
          <span class="tip-when sd-mono">{{ tip.full }} · {{ String(tip.hour).padStart(2, '0') }}:00–{{ String((tip.hour + 1) % 24).padStart(2, '0') }}:00</span>
          <span class="tip-count">{{ tip.count }}<em>{{ tip.count === 1 ? 'arrival' : 'arrivals' }}</em></span>
          <span class="tip-meter"><i :style="{ width: tip.pct + '%' }" /></span>
          <span class="tip-note sd-mono">{{ tip.note }}</span>
        </div>
      </Transition>
    </div>

    <div class="ihm-foot sd-mono">
      <span>QUIET</span>
      <span class="ihm-scale"><i v-for="s in 5" :key="s" :style="{ opacity: 0.15 + (s - 1) * 0.21 }" /></span>
      <span>RUSH</span>
      <span v-if="peak" class="ihm-peak">PEAK · {{ peak.label }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  matrix: { type: Array, default: () => [] },   // IntelHeatCell[] — dow 0=Sunday (Postgres)
})

/* Monday-first display; Postgres dow: 0=Sun … 6=Sat */
const DAYS = [
  { key: 'mon', dow: 1, label: 'MO', full: 'Monday' }, { key: 'tue', dow: 2, label: 'TU', full: 'Tuesday' },
  { key: 'wed', dow: 3, label: 'WE', full: 'Wednesday' }, { key: 'thu', dow: 4, label: 'TH', full: 'Thursday' },
  { key: 'fri', dow: 5, label: 'FR', full: 'Friday' }, { key: 'sat', dow: 6, label: 'SA', full: 'Saturday' },
  { key: 'sun', dow: 0, label: 'SU', full: 'Sunday' },
]

const map = computed(() => {
  const m = new Map()
  for (const c of props.matrix || []) m.set(`${c.dow}:${c.hour}`, c.count || 0)
  return m
})
const get = (dow, h) => map.value.get(`${dow}:${h}`) || 0
const max = computed(() => Math.max(1, ...(props.matrix || []).map(c => c.count || 0)))
const peak = computed(() => {
  let best = null
  for (const c of props.matrix || []) if (!best || c.count > best.count) best = c
  if (!best || !best.count) return null
  const d = DAYS.find(x => x.dow === best.dow)
  return { ...best, label: `${d ? d.full.slice(0, 3).toUpperCase() : '?'} ${String(best.hour).padStart(2, '0')}:00 (${best.count})` }
})
const isPeak = (dow, h) => peak.value && peak.value.dow === dow && peak.value.hour === h

const cellStyle = (dow, h, di, hi) => {
  const v = get(dow, h)
  const a = v ? 0.16 + 0.84 * (v / max.value) : 0
  return {
    background: v ? `color-mix(in srgb, var(--intel) ${Math.round(a * 100)}%, transparent)` : 'var(--sd-surface-glass)',
    animationDelay: `${(di * 24 + hi) * 4}ms`,
  }
}

/* ── the departure-card tooltip ── */
const gridEl = ref(null)
const tip = ref(null)
const noteOf = (count) => {
  if (!count) return 'NO SERVICE'
  const share = count / max.value
  if (share >= 0.75) return 'HEAVY INFLOW'
  if (share >= 0.4) return 'STEADY SERVICE'
  return 'LIGHT TRAFFIC'
}
const setTip = (e, d, hour) => {
  const cell = e.currentTarget
  const count = get(d.dow, hour)
  const below = cell.offsetTop < 74
  tip.value = {
    dow: d.dow, hour, count, full: d.full,
    pct: Math.round((count / max.value) * 100),
    note: count && isPeak(d.dow, hour) ? 'PEAK SLOT — STAFF UP' : noteOf(count),
    x: cell.offsetLeft + cell.offsetWidth / 2,
    y: below ? cell.offsetTop + cell.offsetHeight + 10 : cell.offsetTop - 10,
    below,
  }
}
const clearTip = () => { tip.value = null }
</script>

<style scoped>
.sd-ihm { display: flex; flex-direction: column; gap: 10px; }
.ihm-grid { position: relative; display: grid; grid-template-columns: 26px repeat(var(--cols), 1fr); gap: 3px; align-items: center; }
.ihm-corner { width: 100%; }
.ihm-hlbl { font-size: 8.5px; color: var(--sd-text-dim); text-align: center; letter-spacing: 0.04em; height: 12px; transition: color 0.15s, transform 0.2s var(--sd-spring); }
.ihm-hlbl.on { color: var(--intel); font-weight: 700; transform: scale(1.25); }
.ihm-dlbl { font-size: 9px; color: var(--sd-text-muted); letter-spacing: 0.1em; transition: color 0.15s; }
.ihm-dlbl.on { color: var(--intel); font-weight: 700; }

.ihm-cell { aspect-ratio: 1; border-radius: 3px; display: block; min-width: 0; cursor: pointer;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--sd-border) 55%, transparent);
  animation: sd-ihm-in 0.45s var(--sd-spring) backwards;
  transition: transform 0.18s var(--sd-spring), filter 0.18s, box-shadow 0.18s; }
.ihm-cell.trace { filter: brightness(1.35); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--intel) 45%, transparent); }
.ihm-cell.on { transform: scale(1.45); z-index: 2; position: relative;
  box-shadow: 0 0 0 2px var(--intel), 0 6px 16px color-mix(in srgb, var(--intel) 45%, transparent); }
.ihm-cell.peak { box-shadow: inset 0 0 0 1.5px var(--intel-bright); }
@keyframes sd-ihm-in { from { opacity: 0; transform: scale(0.4); } }

/* the departure-card */
.ihm-tip { position: absolute; z-index: 5; transform: translate(-50%, -100%); pointer-events: none;
  display: flex; flex-direction: column; gap: 5px; min-width: 168px; padding: 10px 12px 11px; border-radius: 12px;
  background: linear-gradient(180deg, var(--intel-board-2), var(--intel-board));
  border: 1px solid color-mix(in srgb, var(--intel-sig) 40%, transparent);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.3); }
.ihm-tip.below { transform: translate(-50%, 0); }
.ihm-tip::after { content: ""; position: absolute; left: 50%; bottom: -5px; width: 10px; height: 10px;
  transform: translateX(-50%) rotate(45deg); background: var(--intel-board);
  border-right: 1px solid color-mix(in srgb, var(--intel-sig) 40%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--intel-sig) 40%, transparent); }
.ihm-tip.below::after { bottom: auto; top: -5px; transform: translateX(-50%) rotate(225deg); }
.tip-when { font-size: 9px; letter-spacing: 0.18em; color: var(--intel-sig); text-transform: uppercase; }
.tip-count { font-size: 22px; font-weight: 800; color: var(--intel-board-txt); line-height: 1; letter-spacing: -0.02em; }
.tip-count em { font-style: normal; font-size: 10px; font-weight: 600; color: var(--intel-board-dim); margin-left: 6px; letter-spacing: 0.08em; }
.tip-meter { height: 4px; border-radius: 99px; background: rgba(244, 239, 227, 0.1); overflow: hidden; }
.tip-meter i { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, var(--intel-sig), var(--intel-sig-dn)); transition: width 0.25s var(--sd-spring); }
.tip-note { font-size: 8.5px; letter-spacing: 0.2em; color: var(--intel-board-dim); }

.ihm-tip-enter-active { transition: opacity 0.18s, transform 0.22s var(--sd-spring); }
.ihm-tip-leave-active { transition: opacity 0.12s; }
.ihm-tip-enter-from { opacity: 0; transform: translate(-50%, -100%) translateY(6px) scale(0.92); }
.ihm-tip.below.ihm-tip-enter-from { transform: translate(-50%, 0) translateY(-6px) scale(0.92); }
.ihm-tip-leave-to { opacity: 0; }

.ihm-foot { display: flex; align-items: center; gap: 8px; font-size: 9px; letter-spacing: 0.14em; color: var(--sd-text-dim); }
.ihm-scale { display: inline-flex; gap: 3px; }
.ihm-scale i { width: 12px; height: 8px; border-radius: 2px; background: var(--intel); display: inline-block; }
.ihm-peak { margin-left: auto; color: var(--intel); font-weight: 700; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .ihm-cell { animation: none; transition: none; }
  html:not([data-cinematic="on"]) .ihm-tip-enter-active, html:not([data-cinematic="on"]) .ihm-tip-leave-active { transition: none; }
}
</style>
