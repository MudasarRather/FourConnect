<template>
  <Motion ref="rootRef" as="section" class="mer ex-grain"
    :initial="reduced ? false : { opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
    <span class="mer-spot" aria-hidden="true" />
    <span class="mer-aura" aria-hidden="true" />

    <!-- header strip -->
    <header class="mer-head">
      <div class="mh-lead">
        <span class="mh-eyebrow"><Radar :size="12" /> NOTICE MERIDIAN · LIVE</span>
        <h3 class="mh-title">Every clock, on one horizon</h3>
      </div>
      <div class="mh-readout">
        <span class="ro-chip"><b><ExCountUp :value="total" /></b><i>serving</i></span>
        <span class="ro-chip" :class="{ alert: overdueCount }"><b :style="{ color: overdueCount ? 'var(--ex-blocked)' : '' }"><ExCountUp :value="overdueCount" /></b><i>overdue</i></span>
        <span class="ro-chip"><b><ExCountUp :value="avgDays" :suffix="'d'" /></b><i>avg left</i></span>
        <span class="ro-chip soon"><b>{{ soonest ? soonest.label : '—' }}</b><i>soonest LWD</i></span>
      </div>
    </header>

    <!-- the countdown corridor -->
    <div ref="fieldEl" class="mer-field" @pointerleave="hover = null">
      <span class="mf-floor" aria-hidden="true" />
      <span class="mf-horizon" aria-hidden="true" />

      <!-- overdue antechamber -->
      <span class="mf-past" aria-hidden="true" />

      <!-- day tick rails -->
      <span v-for="t in ticks" :key="'tk'+t.days" class="mf-tick" :style="{ left: t.left + '%' }">
        <span class="tk-line" /><span class="tk-lab ex-mono">{{ t.label }}</span>
      </span>

      <!-- NOW playhead -->
      <span class="mf-now" :style="{ left: NOW + '%' }">
        <span class="now-dot" /><span class="now-line" /><span class="now-tag ex-mono">TODAY</span>
      </span>

      <!-- threshold portal -->
      <span class="mf-gate">
        <span class="gate-glow" /><span class="gate-bar" /><span class="gate-lab">THRESHOLD</span>
      </span>

      <!-- sweep light -->
      <span v-if="!reduced" class="mf-sweep" aria-hidden="true" />

      <!-- traveller orbs -->
      <button v-for="o in orbs" :key="o.id" type="button"
        class="mer-orb" :class="{ imminent: o.imminent, overdue: o.overdue, waived: o.waived }"
        :style="{ left: o.left + '%', top: o.top + '%', '--c': o.color, '--clr': o.clearance, '--d': o.delay + 's' }"
        @click="$emit('pick', o.id)" @pointerenter="hover = o" @focus="hover = o"
        :aria-label="`${o.name}: ${o.overdue ? o.days + ' days overdue' : o.days + ' days left'}`">
        <span class="orb-trail" aria-hidden="true" />
        <span class="orb-ring" aria-hidden="true" />
        <span class="orb-core" aria-hidden="true" />
        <span v-if="o.imminent && !reduced" class="orb-ping" aria-hidden="true" />
      </button>

      <!-- floating tooltip -->
      <Presence>
        <Motion v-if="hover" as="div" class="mer-tip" :style="tipStyle"
          :initial="{ opacity: 0, y: 6, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 4, scale: 0.97 }" :transition="{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }">
          <span class="tip-dot" :style="{ background: hover.color }" />
          <div class="tip-body">
            <span class="tip-name">{{ hover.name }}</span>
            <span class="tip-meta ex-mono">{{ hover.code }} · {{ hover.dept }}</span>
            <span class="tip-stat" :style="{ color: hover.color }">
              {{ hover.overdue ? `+${hover.days}d overdue` : `${hover.days} days left` }} · {{ hover.clearance }}% cleared
            </span>
          </div>
        </Motion>
      </Presence>
    </div>

    <!-- legend -->
    <div class="mer-legend">
      <span class="lg"><i style="background:var(--ex-blocked)" /> Overdue</span>
      <span class="lg"><i style="background:var(--ex-ember-deep)" /> ≤ 3d</span>
      <span class="lg"><i style="background:var(--ex-ember)" /> ≤ 7d</span>
      <span class="lg"><i style="background:var(--ex-amber-strong)" /> ≤ 14d</span>
      <span class="lg"><i style="background:var(--ex-amber)" /> further out</span>
      <span class="lg ring"><i class="ring-i" /> ring = clearance %</span>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { Radar } from 'lucide-vue-next'
import ExCountUp from './ExCountUp.vue'
import { fmtDate } from '@/composables/useExit'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  rows: { type: Array, default: () => [] },
})
defineEmits(['pick'])

const reduced = prefersReduced()
const rootRef = ref(null)
usePointerSpotlight(rootRef)
const fieldEl = ref(null)
const hover = ref(null)

// corridor geometry (percent of field width)
const NOW = 19          // today playhead
const GATE = 93         // threshold portal
const PAST0 = 4         // far edge of the overdue antechamber

const withDays = computed(() => props.rows.filter(r => r.days_remaining != null))
const activeDays = computed(() => withDays.value.filter(r => r.days_remaining >= 0).map(r => r.days_remaining))
const scaleMax = computed(() => Math.max(30, ...(activeDays.value.length ? activeDays.value : [0])))
const overdueMax = computed(() => {
  const od = withDays.value.filter(r => r.days_remaining < 0).map(r => -r.days_remaining)
  return Math.max(7, ...(od.length ? od : [0]))
})

const tierColor = (days, overdue) => {
  if (overdue) return 'var(--ex-blocked)'
  if (days <= 3) return 'var(--ex-ember-deep)'
  if (days <= 7) return 'var(--ex-ember)'
  if (days <= 14) return 'var(--ex-amber-strong)'
  return 'var(--ex-amber)'
}

const LANES = 4
const orbs = computed(() => props.rows.map((r, i) => {
  const days = r.days_remaining
  const overdue = days != null && days < 0
  let left
  if (days == null) left = NOW
  else if (overdue) left = Math.max(PAST0, NOW - 4 - Math.min(1, (-days) / overdueMax.value) * (NOW - 4 - PAST0))
  else left = NOW + Math.min(1, days / scaleMax.value) * (GATE - NOW)
  const lane = i % LANES
  const jitter = ((i * 53) % 7) - 3
  const top = 20 + lane * 15.5 + jitter
  return {
    id: r.case_id,
    name: r.employee_name || r.employee_code || '—',
    code: r.case_number || r.employee_code || '',
    dept: r.department_name || '—',
    days: overdue ? -days : (days ?? 0),
    overdue,
    waived: !!r.notice_waived,
    clearance: Math.round(r.clearance_progress_pct || 0),
    color: tierColor(days ?? 99, overdue),
    imminent: overdue || (days != null && days <= 7),
    left, top,
    delay: Math.min(i * 0.05, 0.6),
  }
}))

const ticks = computed(() => {
  const sm = scaleMax.value
  const marks = [7, 14, 30, 60, 90].filter(d => d <= sm)
  if (!marks.includes(sm)) marks.push(sm)
  return [...new Set(marks)].sort((a, b) => a - b).map(d => ({
    days: d, label: `+${d}d`, left: NOW + Math.min(1, d / sm) * (GATE - NOW),
  }))
})

const total = computed(() => props.rows.length)
const overdueCount = computed(() => props.rows.filter(r => r.overdue).length)
const avgDays = computed(() => {
  const a = activeDays.value
  return a.length ? Math.round(a.reduce((s, d) => s + d, 0) / a.length) : 0
})
const soonest = computed(() => {
  const cand = withDays.value.filter(r => !r.overdue).sort((a, b) => a.days_remaining - b.days_remaining)[0]
    || withDays.value[0]
  return cand ? { label: fmtDate(cand.last_working_date) } : null
})

const tipStyle = computed(() => {
  const o = hover.value
  if (!o) return {}
  const right = o.left > 64
  return {
    left: o.left + '%', top: o.top + '%',
    transform: `translate(${right ? '-100%' : '0'}, -130%)`,
    marginLeft: right ? '-10px' : '14px',
  }
})
</script>

<style scoped>
.mer {
  position: relative; overflow: hidden; border-radius: 22px; padding: 16px 18px 14px;
  background: var(--ex-surface-elevated); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow);
}
.mer-spot { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(560px 280px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), rgba(251,146,60,0.13), transparent 62%); }
.mer-aura { position: absolute; inset: -40% 30% 50% -10%; pointer-events: none;
  background: radial-gradient(60% 80% at 25% 0%, rgba(251,146,60,0.16), transparent 70%); animation: ex-aura-drift 12s ease-in-out infinite; }

/* header */
.mer-head { position: relative; display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.mh-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.16em; color: var(--ex-violet);
  padding: 4px 9px; border-radius: 999px; background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.mh-title { font-size: 16px; font-weight: 820; color: var(--ex-text); margin: 8px 0 0; }
.mh-readout { display: flex; gap: 8px; flex-wrap: wrap; }
.ro-chip { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; padding: 6px 12px; border-radius: 12px;
  background: var(--ex-surface); border: 1px solid var(--ex-border); min-width: 64px; }
.ro-chip.alert { border-color: color-mix(in srgb, var(--ex-blocked) 34%, transparent); }
.ro-chip b { font-family: var(--ex-mono); font-size: 17px; font-weight: 850; color: var(--ex-text); line-height: 1; }
.ro-chip.soon b { font-size: 12.5px; }
.ro-chip i { font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ex-text-muted); font-style: normal; }

/* corridor */
.mer-field { position: relative; height: 240px; margin-top: 14px; border-radius: 16px; overflow: hidden;
  background: radial-gradient(120% 140% at 95% 50%, rgba(251,146,60,0.07), transparent 58%), var(--ex-panel); border: 1px solid var(--ex-border); }
.mf-floor { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background:
    repeating-linear-gradient(90deg, transparent 0, transparent 38px, color-mix(in srgb, var(--ex-border-strong) 55%, transparent) 38px, color-mix(in srgb, var(--ex-border-strong) 55%, transparent) 39px),
    repeating-linear-gradient(0deg, transparent 0, transparent 38px, color-mix(in srgb, var(--ex-border) 80%, transparent) 38px, color-mix(in srgb, var(--ex-border) 80%, transparent) 39px);
  mask: linear-gradient(180deg, transparent, #000 22%, #000 78%, transparent);
  -webkit-mask: linear-gradient(180deg, transparent, #000 22%, #000 78%, transparent); }
.mf-horizon { position: absolute; left: 0; right: 0; top: 50%; height: 1px; background: linear-gradient(90deg, transparent, var(--ex-border-strong), transparent); }

.mf-past { position: absolute; top: 0; bottom: 0; left: 0; width: 19%;
  background: linear-gradient(90deg, color-mix(in srgb, var(--ex-blocked) 16%, transparent), transparent);
  border-right: 1px dashed color-mix(in srgb, var(--ex-blocked) 32%, transparent); pointer-events: none; }

.mf-tick { position: absolute; top: 0; bottom: 0; transform: translateX(-50%); pointer-events: none; }
.tk-line { position: absolute; top: 8px; bottom: 22px; left: 50%; width: 1px; background: linear-gradient(180deg, transparent, var(--ex-border-strong), transparent); }
.tk-lab { position: absolute; bottom: 6px; left: 50%; transform: translateX(-50%); font-size: 9.5px; font-weight: 700; color: var(--ex-text-dim); white-space: nowrap; }

.mf-now { position: absolute; top: 0; bottom: 0; transform: translateX(-50%); pointer-events: none; z-index: 3; }
.now-line { position: absolute; top: 0; bottom: 0; left: 50%; width: 2px; transform: translateX(-50%);
  background: linear-gradient(180deg, transparent, var(--ex-amber-bright), var(--ex-ember), transparent); box-shadow: 0 0 14px rgba(251,146,60,0.6); animation: now-breathe 3.4s ease-in-out infinite; }
.now-dot { position: absolute; top: 5px; left: 50%; transform: translateX(-50%); width: 9px; height: 9px; border-radius: 50%; background: var(--ex-amber-bright); box-shadow: 0 0 12px var(--ex-ember); }
.now-tag { position: absolute; top: -2px; left: 50%; transform: translateX(-50%) translateY(-100%); display: none; }
@keyframes now-breathe { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }

.mf-gate { position: absolute; top: 0; bottom: 0; right: 0; width: 7%; pointer-events: none; z-index: 2; }
.gate-glow { position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(251,146,60,0.2)); }
.gate-bar { position: absolute; top: 10%; bottom: 10%; right: 14px; width: 4px; border-radius: 4px;
  background: var(--ex-grad-dusk); box-shadow: 0 0 22px rgba(251,146,60,0.55); animation: gate-pulse 4.2s ease-in-out infinite; }
.gate-lab { position: absolute; top: 50%; right: 2px; transform: translateY(-50%) rotate(90deg); transform-origin: center;
  font-size: 9px; font-weight: 800; letter-spacing: 0.22em; color: var(--ex-ember); white-space: nowrap; }
@keyframes gate-pulse { 0%, 100% { opacity: 0.7; box-shadow: 0 0 14px rgba(251,146,60,0.4); } 50% { opacity: 1; box-shadow: 0 0 28px rgba(251,146,60,0.7); } }

.mf-sweep { position: absolute; top: 0; bottom: 0; left: 0; width: 120px; pointer-events: none; z-index: 1;
  background: linear-gradient(90deg, transparent, rgba(251,191,36,0.1) 45%, rgba(251,146,60,0.16) 50%, rgba(251,191,36,0.1) 55%, transparent);
  animation: mer-sweep 7s cubic-bezier(0.45,0,0.55,1) infinite; }
@keyframes mer-sweep { 0% { transform: translateX(-130px); opacity: 0; } 12% { opacity: 1; } 88% { opacity: 1; } 100% { transform: translateX(calc(100vw)); opacity: 0; } }

/* orbs */
.mer-orb { position: absolute; width: 26px; height: 26px; transform: translate(-50%, -50%); padding: 0; border: none; background: none; cursor: pointer; z-index: 4;
  animation: orb-in 0.6s var(--ex-spring) backwards; animation-delay: var(--d); }
@keyframes orb-in { 0% { opacity: 0; transform: translate(-50%, -50%) scale(0.2); } 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
.orb-core { position: absolute; inset: 7px; border-radius: 50%; background: var(--c); box-shadow: 0 0 10px var(--c), 0 0 4px #fff inset; transition: transform 0.25s var(--ex-spring); }
.orb-ring { position: absolute; inset: 0; border-radius: 50%;
  background: conic-gradient(from -90deg, var(--c) calc(var(--clr, 0) * 1%), color-mix(in srgb, var(--ex-steel) 30%, transparent) 0);
  -webkit-mask: radial-gradient(circle, transparent 54%, #000 57%); mask: radial-gradient(circle, transparent 54%, #000 57%); opacity: 0.85; }
.orb-trail { position: absolute; right: 50%; top: 50%; height: 2px; width: 0; transform: translateY(-50%);
  background: linear-gradient(90deg, transparent, var(--c)); opacity: 0; transition: width 0.4s var(--ex-spring), opacity 0.3s; }
.mer-orb.imminent .orb-trail { width: 46px; opacity: 0.55; }
.orb-ping { position: absolute; inset: 4px; border-radius: 50%; border: 1.5px solid var(--c); animation: orb-ping 2.4s ease-out infinite; }
@keyframes orb-ping { 0% { transform: scale(0.7); opacity: 0.7; } 100% { transform: scale(2.1); opacity: 0; } }
.mer-orb.waived .orb-core { background: repeating-linear-gradient(45deg, var(--c), var(--c) 2px, transparent 2px, transparent 4px), var(--c); }
.mer-orb:hover { z-index: 9; }
.mer-orb:hover .orb-core, .mer-orb:focus-visible .orb-core { transform: scale(1.35); }
.mer-orb:focus-visible { outline: none; }
.mer-orb:focus-visible .orb-ring { box-shadow: 0 0 0 2px var(--ex-violet-border); }

/* tooltip */
.mer-tip { position: absolute; z-index: 12; display: flex; gap: 9px; align-items: flex-start; pointer-events: none;
  padding: 9px 12px; border-radius: 12px; background: var(--ex-surface-glass); border: 1px solid var(--ex-border-strong);
  box-shadow: 0 18px 44px -14px rgba(0,0,0,0.7); backdrop-filter: blur(18px) saturate(150%); -webkit-backdrop-filter: blur(18px) saturate(150%); min-width: 150px; }
.tip-dot { width: 9px; height: 9px; border-radius: 50%; margin-top: 3px; box-shadow: 0 0 8px currentColor; flex-shrink: 0; }
.tip-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.tip-name { font-size: 12.5px; font-weight: 820; color: var(--ex-text); }
.tip-meta { font-size: 10px; color: var(--ex-text-muted); }
.tip-stat { font-size: 11px; font-weight: 800; margin-top: 2px; }

/* legend */
.mer-legend { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 11px; padding-left: 2px; }
.lg { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 600; color: var(--ex-text-muted); }
.lg i { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
.lg.ring .ring-i { background: conic-gradient(from -90deg, var(--ex-ember) 65%, color-mix(in srgb, var(--ex-steel) 30%, transparent) 0);
  -webkit-mask: radial-gradient(circle, transparent 45%, #000 48%); mask: radial-gradient(circle, transparent 45%, #000 48%); }

@media (max-width: 760px) {
  .mer-field { height: 220px; }
  .mh-readout { width: 100%; justify-content: flex-start; }
}
@media (prefers-reduced-motion: reduce) {
  .mer-aura, .now-line, .gate-bar, .mf-sweep, .orb-ping, .mer-orb { animation: none !important; }
}
</style>
