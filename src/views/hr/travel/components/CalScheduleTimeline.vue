<template>
  <!-- "Schedule Runway" — a flight-Gantt where every tour is a bar spanning
       departure→return across the month axis. In-flight tours carry a gliding
       plane; a live NOW playhead crosses every lane. Unique to the calendar tab. -->
  <div class="tl" :style="{ '--n': N }">
    <!-- axis -->
    <div class="tl-axis">
      <span class="tl-axis-label"><Route :size="12" /> Tour</span>
      <div class="tl-days">
        <span v-for="c in dayCols" :key="c.i" class="tl-wk" v-show="c.weekend"
          :style="{ left: ((c.i - 1) / N * 100) + '%', width: (100 / N) + '%' }" aria-hidden="true" />
        <span v-for="c in dayCols" :key="'n' + c.i" class="tl-day" :class="{ today: c.today }"
          :style="{ left: ((c.i - 0.5) / N * 100) + '%' }">{{ c.i }}</span>
        <span v-if="nowPct !== null" class="tl-now-beacon" :style="{ left: nowPct + '%' }"><b>NOW</b></span>
      </div>
    </div>

    <!-- lanes -->
    <div class="tl-body">
      <div v-for="(r, i) in rows" :key="r.id" class="tl-row">
        <div class="tl-row-label">
          <span class="tl-ref trv-mono">{{ r.travel_reference_number }}</span>
          <span class="tl-route">{{ r.from_location }} → {{ r.to_location }}</span>
        </div>
        <div class="tl-track">
          <span v-if="nowPct !== null" class="tl-now" :style="{ left: nowPct + '%' }" aria-hidden="true" />
          <button type="button" class="tl-bar" :class="{ cl: r.continuesLeft, cr: r.continuesRight, live: r.inProgress }"
            :style="{ left: r.leftPct + '%', width: r.widthPct + '%', '--c': r.hex, '--d': (i * 0.05) + 's' }"
            @mouseenter="onEnter(r, $event)" @mouseleave="$emit('leave')" @focus="onEnter(r, $event)" @blur="$emit('leave')"
            @click="$emit('open', r)">
            <span class="tl-bar-fill" />
            <span v-if="!r.continuesLeft" class="tl-dot start"><PlaneTakeoff :size="10" /></span>
            <span class="tl-bar-label">{{ r.employee_name || r.to_location }}</span>
            <span v-if="r.inProgress" class="tl-plane"><Plane :size="11" /></span>
            <span v-if="!r.continuesRight" class="tl-dot end"><PlaneLanding :size="10" /></span>
          </button>
        </div>
      </div>

      <div v-if="!rows.length" class="tl-empty"><CalendarRange :size="22" /><span>No tours overlap {{ monthLabel }}.</span></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Route, Plane, PlaneTakeoff, PlaneLanding, CalendarRange } from 'lucide-vue-next'
import { statusMeta } from '@/composables/useTravel'

const props = defineProps({
  events: { type: Array, default: () => [] },
  monthStart: { type: Date, required: true },
  today: { type: String, default: '' },     // iso 'YYYY-MM-DD'
})
const emit = defineEmits(['hover', 'leave', 'open'])

const parse = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d) }
const N = computed(() => new Date(props.monthStart.getFullYear(), props.monthStart.getMonth() + 1, 0).getDate())
const monthLabel = computed(() => props.monthStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }))

const dayCols = computed(() => {
  const y = props.monthStart.getFullYear(), m = props.monthStart.getMonth()
  const todayIso = props.today
  return Array.from({ length: N.value }, (_, idx) => {
    const day = idx + 1
    const dow = new Date(y, m, day).getDay()
    const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return { i: day, weekend: dow === 0 || dow === 6, today: iso === todayIso }
  })
})

const nowPct = computed(() => {
  if (!props.today) return null
  const [y, m, d] = props.today.split('-').map(Number)
  if (y !== props.monthStart.getFullYear() || (m - 1) !== props.monthStart.getMonth()) return null
  return (d - 0.5) / N.value * 100
})

const rows = computed(() => {
  const ms = props.monthStart
  const me = new Date(ms.getFullYear(), ms.getMonth() + 1, 0)
  return props.events.map(e => {
    const dep = parse(e.departure_date), ret = parse(e.return_date)
    const startIdx = dep < ms ? 0 : dep.getDate() - 1
    const endIdx = ret > me ? N.value - 1 : ret.getDate() - 1
    return {
      ...e,
      leftPct: startIdx / N.value * 100,
      widthPct: Math.max(1, endIdx - startIdx + 1) / N.value * 100,
      continuesLeft: dep < ms, continuesRight: ret > me,
      inProgress: e.status === 'IN_PROGRESS',
      hex: statusMeta(e.status).hex,
    }
  })
})

const onEnter = (r, ev) => emit('hover', r, ev.currentTarget.getBoundingClientRect())
</script>

<style scoped>
.tl { border-radius: 18px; padding: 14px 16px 8px; background: var(--trv-surface); border: 1px solid var(--trv-border); box-shadow: var(--trv-card-shadow); overflow: hidden; }

.tl-axis { display: grid; grid-template-columns: 156px 1fr; gap: 12px; align-items: center; padding-bottom: 9px; margin-bottom: 6px; border-bottom: 1px solid var(--trv-border); }
.tl-axis-label { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: var(--trv-text-dim); }
.tl-axis-label :deep(svg) { color: var(--trv-amber); }
.tl-days { position: relative; height: 20px; }
.tl-wk { position: absolute; top: -9px; bottom: -7px; background: rgba(255,255,255,0.025); }
.tl-day { position: absolute; top: 50%; transform: translate(-50%, -50%); font-size: 9px; font-weight: 600; color: var(--trv-text-dim); font-variant-numeric: tabular-nums; }
.tl-day.today { color: var(--trv-amber); font-weight: 800; }
.tl-now-beacon { position: absolute; top: -11px; transform: translateX(-50%); }
.tl-now-beacon b { font-size: 7.5px; font-weight: 800; letter-spacing: 0.08em; color: #1a1205; background: var(--trv-amber); padding: 1px 5px; border-radius: 4px; box-shadow: 0 0 10px rgba(251,191,36,0.6); }

.tl-body { position: relative; display: flex; flex-direction: column; gap: 7px; max-height: 440px; overflow-y: auto; padding-top: 4px; }
.tl-row { display: grid; grid-template-columns: 156px 1fr; gap: 12px; align-items: center; }
.tl-row-label { min-width: 0; }
.tl-ref { display: block; font-size: 10.5px; font-weight: 700; color: var(--trv-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tl-route { display: block; font-size: 9.5px; color: var(--trv-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.tl-track { position: relative; height: 30px;
  background-image: repeating-linear-gradient(90deg, var(--trv-border) 0 1px, transparent 1px calc(100% / var(--n))); border-radius: 8px; }
.tl-now { position: absolute; top: -4px; bottom: -4px; width: 0; border-left: 1.5px dashed var(--trv-amber); opacity: 0.65; z-index: 3; }

.tl-bar { position: absolute; top: 50%; transform: translateY(-50%) scaleX(0); transform-origin: left center;
  height: 24px; min-width: 26px; border-radius: 8px; cursor: pointer; padding: 0 8px; border: none; overflow: hidden;
  display: flex; align-items: center; gap: 6px; background: none;
  animation: tl-grow 0.55s cubic-bezier(0.16,1,0.3,1) forwards; animation-delay: var(--d); }
@keyframes tl-grow { to { transform: translateY(-50%) scaleX(1); } }
.tl-bar-fill { position: absolute; inset: 0; z-index: 0; border-radius: inherit;
  background: linear-gradient(100deg, color-mix(in srgb, var(--c) 88%, transparent), color-mix(in srgb, var(--c) 42%, transparent));
  border: 1px solid color-mix(in srgb, var(--c) 55%, transparent); box-shadow: inset 0 0 16px -5px color-mix(in srgb, var(--c) 70%, transparent); }
.tl-bar.cl .tl-bar-fill { border-top-left-radius: 0; border-bottom-left-radius: 0; }
.tl-bar.cr .tl-bar-fill { border-top-right-radius: 0; border-bottom-right-radius: 0; }
.tl-bar:hover { z-index: 6; }
.tl-bar:hover .tl-bar-fill { filter: brightness(1.16); box-shadow: inset 0 0 16px -5px color-mix(in srgb, var(--c) 70%, transparent), 0 4px 16px -4px var(--c); }
.tl-dot { position: relative; z-index: 1; display: grid; place-items: center; width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0; color: #fff; background: color-mix(in srgb, var(--c) 92%, black 10%); }
.tl-bar-label { position: relative; z-index: 1; flex: 1; min-width: 0; font-size: 10px; font-weight: 700; color: #1a1205; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-shadow: 0 1px 1px rgba(255,255,255,0.18); }
.tl-plane { position: absolute; z-index: 2; top: 50%; left: 0; color: #fff; filter: drop-shadow(0 0 4px rgba(255,255,255,0.7)); animation: tl-glide 3.2s ease-in-out infinite; }
@keyframes tl-glide { 0% { transform: translate(2px, -50%); opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { transform: translate(calc(var(--tw, 60px)), -50%); opacity: 0; } }

.tl-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 9px; padding: 40px 0; color: var(--trv-text-dim); font-size: 12.5px; }
.tl-empty :deep(svg) { color: var(--trv-amber); opacity: 0.7; }

[data-theme="light"] .tl-wk { background: rgba(120,90,30,0.05); }
[data-theme="light"] .tl-bar-label { color: #2a1c08; text-shadow: none; }

@media (max-width: 720px) { .tl-axis, .tl-row { grid-template-columns: 108px 1fr; } }
@media (prefers-reduced-motion: reduce) {
  .tl-bar { transform: translateY(-50%) scaleX(1); animation: none; }
  .tl-plane { animation: none; opacity: 0.9; left: auto; right: 6px; }
}
</style>
