<template>
  <div class="dash" ref="dashRef">
    <!-- cinematic backdrop: drifting aurora + instrument grid + scanline (parallax-reactive) -->
    <div class="dash-atmos" aria-hidden="true">
      <span class="da-orb o1" /><span class="da-orb o2" /><span class="da-orb o3" />
      <span class="da-grid" />
      <span class="da-scan shift-scanline" />
    </div>

    <!-- skeleton -->
    <div v-if="loading && !stats" class="dash-skel">
      <div class="sk" v-for="n in 8" :key="n" style="height:132px" />
      <div class="sk wide" style="height:240px" /><div class="sk" style="height:240px" />
    </div>

    <template v-else>
      <Motion as="header" class="dash-head" :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
        <div class="dh-left">
          <span class="dh-eyebrow"><Radio :size="12" /> Console · live readout</span>
          <h2>Operations overview</h2>
          <span class="dh-meta shift-mono"><span class="dh-live" />{{ clock }} · synced {{ syncedLabel }}</span>
        </div>
        <div class="dh-right">
          <span class="dh-eq" aria-hidden="true"><i v-for="n in 5" :key="n" :style="{ animationDelay: `${(n * 0.12).toFixed(2)}s` }" /></span>
          <button class="dh-refresh" :class="{ spin: refreshing }" @click="onRefresh" aria-label="Refresh"><RefreshCw :size="15" /></button>
        </div>
      </Motion>

      <!-- KPI instrument deck -->
      <div class="kpi-grid">
        <ShiftKpiTile v-for="(k2, i) in kpiTiles" :key="k2.label" v-bind="k2" :index="i" />
      </div>

      <!-- distribution + allocation -->
      <div class="grid-2">
        <Motion as="section" class="card" :initial="{ opacity: 0, y: 22 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }">
          <span class="card-sheen" aria-hidden="true" />
          <header class="card-head"><span class="hnum">01</span><h3>Shift distribution</h3>
            <button class="card-link" @click="$emit('go','management')">Shifts <ArrowUpRight :size="13" /></button></header>
          <ShiftBarChart :items="distItems" :height="180" />
          <p v-if="!distItems.length" class="empty-note">No active shifts — create one in <button class="inline-link" @click="$emit('go','management')">Shift Management</button>.</p>
        </Motion>
        <Motion as="section" class="card" :initial="{ opacity: 0, y: 22 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.55, delay: 0.16, ease: [0.16, 1, 0.3, 1] }">
          <span class="card-sheen" aria-hidden="true" />
          <header class="card-head"><span class="hnum">02</span><h3>Department allocation</h3>
            <span class="legend-min"><i class="dot amber" />total <i class="dot ember" />night</span></header>
          <ShiftBarChart :items="deptItems" :height="180" />
          <p v-if="!deptItems.length" class="empty-note">No assignments yet — place employees in <button class="inline-link" @click="$emit('go','assignment')">Assignment</button>.</p>
        </Motion>
      </div>

      <!-- trend strip -->
      <div class="grid-2">
        <Motion as="section" class="card" :initial="{ opacity: 0, y: 22 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.55, delay: 0.22, ease: [0.16, 1, 0.3, 1] }">
          <span class="card-sheen" aria-hidden="true" />
          <header class="card-head"><span class="hnum">03</span><h3>Overtime trend</h3>
            <button class="card-link" @click="$emit('go','overtime-rules')">Rules <ArrowUpRight :size="13" /></button></header>
          <ShiftTrendChart :points="stats?.overtime_trend || []" color="var(--shift-ember)" suffix="h" />
        </Motion>
        <Motion as="section" class="card" :initial="{ opacity: 0, y: 22 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.55, delay: 0.28, ease: [0.16, 1, 0.3, 1] }">
          <span class="card-sheen" aria-hidden="true" />
          <header class="card-head"><span class="hnum">04</span><h3>Night utilisation</h3>
            <button class="card-link" @click="$emit('go','night')">Night <ArrowUpRight :size="13" /></button></header>
          <ShiftTrendChart :points="stats?.night_utilization || []" color="var(--shift-amber)" />
        </Motion>
      </div>

      <!-- coverage + quick actions -->
      <div class="grid-2-wide">
        <Motion as="section" class="card" :initial="{ opacity: 0, y: 22 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.55, delay: 0.32, ease: [0.16, 1, 0.3, 1] }">
          <span class="card-sheen" aria-hidden="true" />
          <header class="card-head"><span class="hnum">05</span><h3>Weekly coverage</h3>
            <button class="card-link" @click="$emit('go', 'coverage')">Manage <ArrowUpRight :size="13" /></button></header>
          <div v-if="(stats?.weekly_coverage || []).length" class="cov-list">
            <ShiftCoverageMeter v-for="(c, i) in stats.weekly_coverage" :key="i" :label="c.label" :required="c.required" :assigned="c.assigned" />
          </div>
          <p v-else class="empty-note">No coverage rules yet — set minimum staffing in <button class="inline-link" @click="$emit('go','coverage')">Coverage</button>.</p>
        </Motion>

        <Motion as="section" class="card actions-card" :initial="{ opacity: 0, y: 22 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.55, delay: 0.38, ease: [0.16, 1, 0.3, 1] }">
          <span class="card-sheen" aria-hidden="true" />
          <header class="card-head"><span class="hnum">06</span><h3>Quick actions</h3></header>
          <div class="act-dock">
            <Motion v-for="(a, i) in actions" :key="a.go" as="button" class="act"
              :initial="{ opacity: 0, scale: 0.92 }" :animate="{ opacity: 1, scale: 1 }"
              :transition="{ duration: 0.4, delay: 0.42 + i * 0.05, ease: [0.16, 1, 0.3, 1] }"
              :whileHover="{ y: -3 }" :whileTap="{ scale: 0.96 }"
              @click="$emit('go', a.go)">
              <span class="act-sweep" aria-hidden="true" />
              <span class="act-ic"><component :is="a.icon" :size="16" /></span>
              <b>{{ a.title }}</b>
              <span class="act-sub">{{ a.sub }}</span>
              <ArrowUpRight :size="13" class="act-arr" />
            </Motion>
          </div>
          <div v-if="k.shift_conflicts > 0" class="flag alert" @click="$emit('go','coverage')">
            <AlertTriangle :size="13" /> {{ k.shift_conflicts }} employee{{ k.shift_conflicts > 1 ? 's have' : ' has' }} overlapping assignments
          </div>
          <div v-else-if="k.unassigned_employees > 0" class="flag warn" @click="$emit('go','assignment')">
            <UserMinus :size="13" /> {{ k.unassigned_employees }} active employee{{ k.unassigned_employees > 1 ? 's are' : ' is' }} unassigned
          </div>
          <div v-else class="flag ok"><CheckCircle2 :size="13" /> All active employees are scheduled</div>
        </Motion>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import {
  Radio, RefreshCw, CalendarClock, UsersRound, RefreshCcw, CalendarRange, AlertTriangle,
  UserMinus, CheckCircle2, ArrowUpRight, Layers, Moon, Timer, ShieldAlert, CalendarCheck, Repeat,
  CalendarDays, Radar,
} from 'lucide-vue-next'
import ShiftKpiTile from '../components/ShiftKpiTile.vue'
import ShiftBarChart from '../components/ShiftBarChart.vue'
import ShiftTrendChart from '../components/ShiftTrendChart.vue'
import ShiftCoverageMeter from '../components/ShiftCoverageMeter.vue'
import { shiftTypeMeta } from '@/composables/useShifts'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({ stats: { type: Object, default: null }, loading: Boolean })
const emit = defineEmits(['go', 'refresh'])

const dashRef = ref(null)
usePointerSpotlight(dashRef)

const refreshing = ref(false)
const onRefresh = () => { refreshing.value = true; emit('refresh'); setTimeout(() => { refreshing.value = false }, 850) }

// live clock for the console header
const now = ref(new Date())
let timer = null
onMounted(() => { timer = setInterval(() => { now.value = new Date() }, 1000) })
onBeforeUnmount(() => clearInterval(timer))
const clock = computed(() => {
  const d = now.value
  let h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m}:${s} ${ampm}`
})
const syncedLabel = computed(() => {
  const g = props.stats?.generated_at
  if (!g) return 'just now'
  try {
    return new Date(g).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  } catch { return 'just now' }
})

const k = computed(() => props.stats?.kpis || {})
const kpiTiles = computed(() => {
  const x = k.value
  return [
    { label: 'Active shifts', value: x.active_shifts || 0, icon: Layers, color: 'var(--shift-amber)' },
    { label: 'Employees assigned', value: x.employees_assigned || 0, icon: UsersRound, color: 'var(--shift-ok)' },
    { label: 'Night shift staff', value: x.night_shift_employees || 0, icon: Moon, color: 'var(--shift-amber-strong)' },
    { label: 'Upcoming rotations', value: x.upcoming_rotations || 0, icon: Repeat, color: 'var(--shift-ember)' },
    { label: 'Holiday shift staff', value: x.holiday_shift_staff || 0, icon: CalendarCheck, color: 'var(--shift-amber)' },
    { label: 'Overtime hrs (mo)', value: x.overtime_hours || 0, icon: Timer, color: 'var(--shift-ember-strong)', decimals: 1, suffix: 'h' },
    { label: 'Shift conflicts', value: x.shift_conflicts || 0, icon: ShieldAlert, color: 'var(--shift-alert)', tone: 'alert' },
    { label: 'Unassigned', value: x.unassigned_employees || 0, icon: UserMinus, color: 'var(--shift-ember)', tone: x.unassigned_employees > 0 ? 'warn' : 'neutral' },
  ]
})

const actions = [
  { go: 'management', icon: CalendarClock, title: 'Manage shifts', sub: 'Templates & timing' },
  { go: 'assignment', icon: UsersRound, title: 'Assign', sub: 'Place employees' },
  { go: 'rotation', icon: RefreshCcw, title: 'Rotation', sub: 'Cyclic patterns' },
  { go: 'rosters', icon: CalendarRange, title: 'Roster', sub: 'Weekly plan' },
  { go: 'calendar', icon: CalendarDays, title: 'Calendar', sub: 'Month view' },
  { go: 'coverage', icon: Radar, title: 'Coverage', sub: 'Staffing rules' },
]

const distItems = computed(() => (props.stats?.shift_distribution || []).map(s => ({
  label: s.code, value: s.count, color: shiftTypeMeta(s.shift_type).color,
})))
const deptItems = computed(() => (props.stats?.dept_allocation || []).map(d => ({
  label: d.department_name, value: d.count, color: 'var(--shift-amber)', subValue: d.night_count, subColor: 'var(--shift-ember-strong)',
})))
</script>

<style scoped>
.dash { position: relative; display: flex; flex-direction: column; gap: 16px; }

/* ── cinematic backdrop ── */
.dash-atmos { position: absolute; inset: -10px; z-index: 0; overflow: hidden; border-radius: 22px; pointer-events: none; }
.da-orb { position: absolute; border-radius: 50%; filter: blur(60px); }
.da-orb.o1 { width: 420px; height: 420px; top: -120px; left: -60px; opacity: 0.22;
  background: radial-gradient(circle, rgba(251,191,36,0.9), transparent 68%); animation: da-drift1 22s ease-in-out infinite;
  transform: translate3d(calc((var(--mx,0.5) - 0.5) * -34px), calc((var(--my,0.5) - 0.5) * -22px), 0); }
.da-orb.o2 { width: 380px; height: 380px; top: 30%; right: -80px; opacity: 0.18;
  background: radial-gradient(circle, rgba(234,88,12,0.85), transparent 70%); animation: da-drift2 27s ease-in-out infinite;
  transform: translate3d(calc((var(--mx,0.5) - 0.5) * 30px), calc((var(--my,0.5) - 0.5) * 24px), 0); }
.da-orb.o3 { width: 340px; height: 340px; bottom: -100px; left: 35%; opacity: 0.15;
  background: radial-gradient(circle, rgba(245,158,11,0.8), transparent 70%); animation: da-drift1 30s ease-in-out infinite reverse;
  transform: translate3d(calc((var(--mx,0.5) - 0.5) * 18px), calc((var(--my,0.5) - 0.5) * -14px), 0); }
.da-grid { position: absolute; inset: 0; opacity: 0.4;
  background-image: linear-gradient(var(--shift-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--shift-grid-line) 1px, transparent 1px);
  background-size: 40px 40px; -webkit-mask: radial-gradient(140% 110% at 50% 0%, #000, transparent 72%); mask: radial-gradient(140% 110% at 50% 0%, #000, transparent 72%); }
.da-scan { position: absolute; left: 0; right: 0; top: 0; height: 30%; background: linear-gradient(180deg, transparent, rgba(251,191,36,0.04), transparent); }

.dash > :not(.dash-atmos) { position: relative; z-index: 1; }

/* ── skeleton ── */
.dash-skel { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(4, 1fr); gap: 13px; }
.dash-skel .sk { border-radius: 18px; background: linear-gradient(100deg, var(--shift-surface), var(--shift-surface-2), var(--shift-surface)); background-size: 200% 100%; animation: shift-shimmer 1.4s linear infinite; }
.dash-skel .wide { grid-column: span 2; }
@keyframes shift-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ── header ── */
.dash-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.dh-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--shift-mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--shift-amber-strong); }
.dash-head h2 { margin: 3px 0 4px; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; color: var(--shift-text); }
.dh-meta { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; color: var(--shift-text-muted); }
.dh-live { width: 6px; height: 6px; border-radius: 50%; background: var(--shift-ok); animation: shift-ring-pulse 2.2s ease-out infinite; }
.dh-right { display: flex; align-items: center; gap: 12px; }
.dh-eq { display: inline-flex; align-items: flex-end; gap: 2.5px; height: 18px; }
.dh-eq i { display: block; width: 2.5px; height: 100%; border-radius: 2px; transform-origin: bottom;
  background: linear-gradient(180deg, var(--shift-amber-bright), var(--shift-amber-strong)); animation: dh-eq 1.1s ease-in-out infinite; }
.dh-refresh { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); transition: 0.2s; }
.dh-refresh:hover { color: var(--shift-amber); border-color: var(--shift-border); transform: rotate(15deg); }
.dh-refresh.spin :deep(svg) { animation: shift-spin 0.85s var(--shift-ease); }

/* ── grids ── */
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 13px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.grid-2-wide { display: grid; grid-template-columns: 1.4fr 1fr; gap: 14px; }
@media (max-width: 1100px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 900px) { .grid-2, .grid-2-wide { grid-template-columns: 1fr; } }

/* ── cards ── */
.card { position: relative; background: linear-gradient(165deg, var(--shift-surface-2), var(--shift-surface));
  border: 1px solid var(--shift-border-soft); border-radius: 18px; padding: 16px 18px; overflow: hidden;
  transition: border-color 0.3s, box-shadow 0.3s, transform 0.3s;
  box-shadow: 0 16px 40px -28px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04); }
.card:hover { border-color: var(--shift-border); transform: translateY(-2px);
  box-shadow: 0 26px 54px -28px rgba(0,0,0,0.78), inset 0 1px 0 rgba(255,255,255,0.07); }
.card-sheen { position: absolute; inset: 0; pointer-events: none; opacity: 0; border-radius: inherit; transition: opacity 0.3s;
  background: linear-gradient(115deg, transparent 44%, color-mix(in srgb, var(--shift-amber-bright) 12%, transparent) 50%, transparent 56%);
  background-size: 240% 100%; }
.card:hover .card-sheen { opacity: 1; animation: card-sheen 1.1s var(--shift-ease) 1; }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.hnum { font-family: var(--shift-mono); font-size: 11px; color: var(--shift-amber); }
.card-head h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--shift-text); flex: 1; }
.card-link { display: inline-flex; align-items: center; gap: 4px; background: none; border: 0; cursor: pointer; font-size: 11.5px; color: var(--shift-amber); font-weight: 600; transition: gap 0.2s; }
.card-link:hover { gap: 7px; }
.legend-min { display: inline-flex; align-items: center; gap: 8px; font-size: 10px; color: var(--shift-text-muted); }
.legend-min .dot { width: 7px; height: 7px; border-radius: 50%; margin-right: 2px; display: inline-block; }
.dot.amber { background: var(--shift-amber); } .dot.ember { background: var(--shift-ember-strong); }
.empty-note { color: var(--shift-text-muted); font-size: 13px; padding: 16px 6px 4px; text-align: center; }
.inline-link { background: none; border: 0; color: var(--shift-amber); cursor: pointer; font: inherit; text-decoration: underline; }

.cov-list { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
@media (max-width: 640px) { .cov-list { grid-template-columns: 1fr; } }

/* ── quick actions dock ── */
.actions-card { display: flex; flex-direction: column; }
.act-dock { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
@media (max-width: 1240px) { .act-dock { grid-template-columns: 1fr 1fr; } }
.act { position: relative; display: flex; flex-direction: column; gap: 2px; align-items: flex-start; padding: 13px 12px; border-radius: 13px; cursor: pointer;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); overflow: hidden; text-align: left; }
.act:hover { border-color: var(--shift-border); }
.act-sweep { position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.3s;
  background: radial-gradient(120% 90% at 0% 0%, color-mix(in srgb, var(--shift-amber) 18%, transparent), transparent 60%); }
.act:hover .act-sweep { opacity: 1; }
.act-ic { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; margin-bottom: 4px; position: relative; z-index: 1;
  background: rgba(251,191,36,0.12); color: var(--shift-amber); transition: transform 0.3s var(--shift-spring); }
.act:hover .act-ic { transform: scale(1.1) rotate(-4deg); }
.act b { font-size: 13px; color: var(--shift-text); position: relative; z-index: 1; }
.act-sub { font-size: 10.5px; color: var(--shift-text-muted); position: relative; z-index: 1; }
.act-arr { position: absolute; top: 12px; right: 12px; opacity: 0; color: var(--shift-amber); transition: opacity 0.25s, transform 0.25s; }
.act:hover .act-arr { opacity: 1; transform: translate(2px, -2px); }

.flag { display: inline-flex; align-items: center; gap: 7px; margin-top: 14px; padding: 10px 13px; border-radius: 11px; font-size: 11.5px; font-weight: 600; cursor: pointer; transition: transform 0.2s; }
.flag:not(.ok):hover { transform: translateX(2px); }
.flag.alert { color: var(--shift-alert); background: var(--shift-alert-soft); }
.flag.warn { color: var(--shift-ember-strong); background: var(--shift-warn-soft); }
.flag.ok { color: var(--shift-ok); background: var(--shift-ok-soft); cursor: default; }

/* ── keyframes ── */
@keyframes da-drift1 { 0%, 100% { translate: 0 0; } 50% { translate: 50px 40px; } }
@keyframes da-drift2 { 0%, 100% { translate: 0 0; } 50% { translate: -44px -32px; } }
@keyframes dh-eq { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
@keyframes card-sheen { 0% { background-position: 130% 0; } 100% { background-position: -50% 0; } }

/* light theme: dial down aurora intensity on cream */
:root[data-theme="light"] .da-orb.o1 { opacity: 0.16; }
:root[data-theme="light"] .da-orb.o2 { opacity: 0.13; }
:root[data-theme="light"] .da-orb.o3 { opacity: 0.11; }
:root[data-theme="light"] .card-sheen { background: linear-gradient(115deg, transparent 44%, rgba(255,255,255,0.55) 50%, transparent 56%); }

@media (prefers-reduced-motion: reduce) {
  .da-orb, .dh-eq i, .dh-live { animation: none !important; }
  .da-orb { transform: none !important; }
  .card:hover .card-sheen { animation: none; }
}
</style>
