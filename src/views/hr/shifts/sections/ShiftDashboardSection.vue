<template>
  <div class="dash">
    <!-- skeleton -->
    <div v-if="loading && !stats" class="dash-skel">
      <div class="sk" v-for="n in 8" :key="n" style="height:96px" />
      <div class="sk wide" style="height:240px" /><div class="sk" style="height:240px" />
    </div>

    <template v-else>
      <Motion as="header" class="dash-head" :initial="{ opacity: 0, y: -8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4 }">
        <div>
          <span class="dh-eyebrow"><Radio :size="12" /> Console · live readout</span>
          <h2>Operations overview</h2>
        </div>
        <button class="dh-refresh" :class="{ spin: refreshing }" @click="onRefresh" aria-label="Refresh"><RefreshCw :size="15" /></button>
      </Motion>

      <!-- KPI grid -->
      <div class="kpi-grid">
        <ShiftKpiTile v-for="(k, i) in kpiTiles" :key="k.label" v-bind="k" :index="i" />
      </div>

      <!-- charts row 1 -->
      <div class="grid-2">
        <Motion as="section" class="card" :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, delay: 0.1 }">
          <header class="card-head"><span class="hnum">01</span><h3>Shift distribution</h3><span class="hmeta">on duty today</span></header>
          <ShiftBarChart :items="distItems" :height="180" />
        </Motion>
        <Motion as="section" class="card" :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, delay: 0.16 }">
          <header class="card-head"><span class="hnum">02</span><h3>Department allocation</h3>
            <span class="legend-min"><i class="dot amber" />total <i class="dot ember" />night</span></header>
          <ShiftBarChart :items="deptItems" :height="180" />
        </Motion>
      </div>

      <!-- charts row 2 -->
      <div class="grid-2">
        <Motion as="section" class="card" :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, delay: 0.22 }">
          <header class="card-head"><span class="hnum">03</span><h3>Overtime trend</h3><span class="hmeta">approved · 6 mo</span></header>
          <ShiftTrendChart :points="stats?.overtime_trend || []" color="var(--shift-ember)" suffix="h" />
        </Motion>
        <Motion as="section" class="card" :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, delay: 0.28 }">
          <header class="card-head"><span class="hnum">04</span><h3>Night utilisation</h3><span class="hmeta">last 7 days</span></header>
          <ShiftTrendChart :points="stats?.night_utilization || []" color="var(--shift-amber)" />
        </Motion>
      </div>

      <!-- coverage + actions -->
      <div class="grid-2-wide">
        <Motion as="section" class="card" :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, delay: 0.32 }">
          <header class="card-head"><span class="hnum">05</span><h3>Weekly coverage</h3>
            <button class="card-link" @click="$emit('go', 'coverage')">Manage <ArrowUpRight :size="13" /></button></header>
          <div v-if="(stats?.weekly_coverage || []).length" class="cov-list">
            <ShiftCoverageMeter v-for="(c, i) in stats.weekly_coverage" :key="i" :label="c.label" :required="c.required" :assigned="c.assigned" />
          </div>
          <p v-else class="empty-note">No coverage rules yet — set minimum staffing in <button class="inline-link" @click="$emit('go','coverage')">Coverage</button>.</p>
        </Motion>

        <Motion as="section" class="card actions-card" :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, delay: 0.38 }">
          <header class="card-head"><span class="hnum">06</span><h3>Quick actions</h3></header>
          <div class="act-tiles">
            <button class="act" @click="$emit('go', 'management')"><CalendarClock :size="16" /><b>Manage shifts</b><span>Templates &amp; timing</span></button>
            <button class="act" @click="$emit('go', 'assignment')"><UsersRound :size="16" /><b>Assign</b><span>Place employees</span></button>
            <button class="act" @click="$emit('go', 'rotation')"><RefreshCcw :size="16" /><b>Rotation</b><span>Cyclic patterns</span></button>
            <button class="act" @click="$emit('go', 'rosters')"><CalendarRange :size="16" /><b>Roster</b><span>Weekly plan</span></button>
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
import { computed, ref } from 'vue'
import { Motion } from 'motion-v'
import {
  Radio, RefreshCw, CalendarClock, UsersRound, RefreshCcw, CalendarRange, AlertTriangle,
  UserMinus, CheckCircle2, ArrowUpRight, Layers, Moon, Timer, ShieldAlert, CalendarCheck, Repeat,
} from 'lucide-vue-next'
import ShiftKpiTile from '../components/ShiftKpiTile.vue'
import ShiftBarChart from '../components/ShiftBarChart.vue'
import ShiftTrendChart from '../components/ShiftTrendChart.vue'
import ShiftCoverageMeter from '../components/ShiftCoverageMeter.vue'
import { shiftTypeMeta } from '@/composables/useShifts'

const props = defineProps({ stats: { type: Object, default: null }, loading: Boolean })
const emit = defineEmits(['go', 'refresh'])

const refreshing = ref(false)
const onRefresh = () => { refreshing.value = true; emit('refresh'); setTimeout(() => { refreshing.value = false }, 850) }

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

const distItems = computed(() => (props.stats?.shift_distribution || []).map(s => ({
  label: s.code, value: s.count, color: shiftTypeMeta(s.shift_type).color,
})))
const deptItems = computed(() => (props.stats?.dept_allocation || []).map(d => ({
  label: d.department_name, value: d.count, color: 'var(--shift-amber)', subValue: d.night_count, subColor: 'var(--shift-ember-strong)',
})))
</script>

<style scoped>
.dash { display: flex; flex-direction: column; gap: 16px; }
.dash-skel { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.dash-skel .sk { border-radius: 16px; background: linear-gradient(100deg, var(--shift-surface), var(--shift-surface-2), var(--shift-surface)); background-size: 200% 100%; animation: shift-shimmer 1.4s linear infinite; }
.dash-skel .wide { grid-column: span 2; }
@keyframes shift-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.dash-head { display: flex; align-items: flex-end; justify-content: space-between; }
.dh-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--shift-mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--shift-amber-strong); }
.dash-head h2 { margin: 3px 0 0; font-size: 21px; font-weight: 800; letter-spacing: -0.02em; color: var(--shift-text); }
.dh-refresh { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); transition: 0.2s; }
.dh-refresh:hover { color: var(--shift-amber); border-color: var(--shift-border); }
.dh-refresh.spin :deep(svg) { animation: shift-spin 0.85s var(--shift-ease); }

.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 13px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.grid-2-wide { display: grid; grid-template-columns: 1.4fr 1fr; gap: 14px; }
@media (max-width: 1100px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 900px) { .grid-2, .grid-2-wide { grid-template-columns: 1fr; } }

.card { position: relative; background: var(--shift-surface); border: 1px solid var(--shift-border-soft); border-radius: 18px; padding: 16px 18px; overflow: hidden; }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.hnum { font-family: var(--shift-mono); font-size: 11px; color: var(--shift-amber); }
.card-head h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--shift-text); flex: 1; }
.hmeta { font-family: var(--shift-mono); font-size: 10.5px; color: var(--shift-text-muted); }
.card-link { display: inline-flex; align-items: center; gap: 4px; background: none; border: 0; cursor: pointer; font-size: 11.5px; color: var(--shift-amber); font-weight: 600; }
.legend-min { display: inline-flex; align-items: center; gap: 8px; font-size: 10px; color: var(--shift-text-muted); }
.legend-min .dot { width: 7px; height: 7px; border-radius: 50%; margin-right: 2px; display: inline-block; }
.dot.amber { background: var(--shift-amber); } .dot.ember { background: var(--shift-ember-strong); }
.empty-note { color: var(--shift-text-muted); font-size: 13px; padding: 22px 6px; text-align: center; }
.inline-link { background: none; border: 0; color: var(--shift-amber); cursor: pointer; font: inherit; text-decoration: underline; }

.cov-list { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
@media (max-width: 640px) { .cov-list { grid-template-columns: 1fr; } }

.actions-card { display: flex; flex-direction: column; }
.act-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.act { display: flex; flex-direction: column; gap: 2px; align-items: flex-start; padding: 12px; border-radius: 12px; cursor: pointer;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); transition: 0.2s; }
.act:hover { border-color: var(--shift-border); transform: translateY(-2px); }
.act svg { color: var(--shift-amber); }
.act b { font-size: 13px; color: var(--shift-text); margin-top: 4px; }
.act span { font-size: 10.5px; color: var(--shift-text-muted); }
.flag { display: inline-flex; align-items: center; gap: 7px; margin-top: 12px; padding: 9px 12px; border-radius: 10px; font-size: 11.5px; font-weight: 600; cursor: pointer; }
.flag.alert { color: var(--shift-alert); background: var(--shift-alert-soft); }
.flag.warn { color: var(--shift-ember-strong); background: var(--shift-warn-soft); }
.flag.ok { color: var(--shift-ok); background: var(--shift-ok-soft); cursor: default; }
@media (max-width: 1100px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
