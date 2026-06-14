<template>
  <section class="cov">
    <!-- ═══════════ COMMAND BAR ═══════════ -->
    <Motion as="header" class="cmd" :initial="{ opacity: 0, y: -12 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
      <span class="cmd-glow" aria-hidden="true" />
      <span class="cmd-scan shift-scanline" aria-hidden="true" />

      <div class="cmd-scope">
        <ShiftCoverageRadar :blips="blips" :readiness="readiness" />
      </div>

      <div class="cmd-readout">
        <span class="eyebrow">
          <span class="eyebrow-dot" :data-live="isToday" /> Coverage Radar · {{ isToday ? 'LIVE' : 'PREVIEW' }}
        </span>
        <h2>Staffing Coverage</h2>
        <p>Each blip is a minimum-staffing rule plotted by shift time and live head-count. The sweep pings shortfalls — critical positions burn red at the core.</p>

        <!-- date scrubber -->
        <div class="scrub">
          <button class="scrub-nav" @click="stepDate(-1)" title="Previous day"><ChevronLeft :size="15" /></button>
          <HrDatePicker
            v-model="onDate"
            class="scrub-dp"
            :clearable="false"
            placeholder="Pick a date"
            @change="loadAlerts"
          />
          <button class="scrub-nav" @click="stepDate(1)" title="Next day"><ChevronRight :size="15" /></button>
          <button class="scrub-today" :disabled="isToday" @click="goToday">Today</button>
          <button class="scrub-refresh" :class="{ spin: loadingAlerts }" @click="loadAlerts" title="Refresh"><RefreshCw :size="13" /></button>
        </div>

        <div class="readout-stats">
          <button class="rs" data-tone="gold" @click="$emit('go', 'management')">
            <span class="rs-ic"><Radar :size="14" /></span>
            <span class="rs-meta"><b><ShiftCountUp :value="rules.length" /></b><small>Rules monitored</small></span>
          </button>
          <button class="rs" :data-tone="totalShort > 0 ? 'warn' : 'ok'" @click="scrollToShort">
            <span class="rs-ic"><Users :size="14" /></span>
            <span class="rs-meta"><b><ShiftCountUp :value="totalShort" /></b><small>Heads short</small></span>
          </button>
          <button class="rs" :data-tone="criticalCount > 0 ? 'alert' : 'ok'" @click="scrollToShort">
            <span class="rs-ic"><AlertTriangle :size="14" /></span>
            <span class="rs-meta"><b><ShiftCountUp :value="criticalCount" /></b><small>Critical gaps</small></span>
          </button>
        </div>

        <Transition name="cov-fade">
          <button v-if="totalShort > 0" class="resolve-cta" @click="$emit('go', 'assignment')">
            <Zap :size="14" /> Resolve in Assignment <ArrowRight :size="14" />
          </button>
        </Transition>
      </div>
    </Motion>

    <!-- ═══════════ COVERAGE MATRIX ═══════════ -->
    <div class="panel" ref="matrixRef">
      <header class="panel-head">
        <span class="hnum">01</span>
        <h3>Coverage matrix</h3>
        <span class="hmeta">{{ niceDate }}</span>
        <span class="flex-spacer" />
        <ShiftStatusPill v-if="rules.length" :tone="criticalCount ? 'alert' : (totalShort ? 'warn' : 'ok')">
          {{ criticalCount ? criticalCount + ' critical' : (totalShort ? totalShort + ' short' : 'All covered') }}
        </ShiftStatusPill>
      </header>

      <div v-if="matrix.length" class="cov-grid">
        <Motion v-for="(c, i) in matrix" :key="c.id" as="article" class="cell" :data-status="c.status"
          :initial="{ opacity: 0, y: 20, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.5, delay: Math.min(i * 0.05, 0.5), ease: [0.16, 1, 0.3, 1] }">
          <span v-if="c.status === 'CRITICAL'" class="cell-aura" aria-hidden="true" />

          <div class="cell-top">
            <span class="cell-code">{{ c.shift_code }}</span>
            <div class="cell-id">
              <b>{{ c.shift_name }}</b>
              <small>{{ c.department_name || 'All departments' }} · {{ shiftTimeLabel(c.shift_id) }}</small>
            </div>
            <ShiftStatusPill :tone="statusTone(c.status)">{{ statusText(c) }}</ShiftStatusPill>
          </div>

          <div class="cell-gauge">
            <div class="cg-num">
              <span class="cg-have" :data-tone="statusTone(c.status)">
                <ShiftCountUp v-if="c.assigned !== null" :value="c.assigned" /><template v-else>—</template>
              </span>
              <span class="cg-sep">/</span>
              <span class="cg-need">{{ c.min_staff }}</span>
              <span class="cg-cap">on duty / required</span>
            </div>
            <div class="cg-track">
              <div class="cg-fill" :style="{ width: fillPct(c) + '%' }" />
              <span class="cg-marker" />
            </div>
          </div>

          <div class="cell-ctl">
            <div class="stepper">
              <button @click="stepMin(c, -1)" :disabled="c.min_staff <= 1" title="Lower minimum"><Minus :size="13" /></button>
              <span class="stepper-val">min {{ c.min_staff }}</span>
              <button @click="stepMin(c, 1)" title="Raise minimum"><Plus :size="13" /></button>
            </div>

            <button class="chip" :class="{ on: c.critical }" @click="patchRule(c, { critical: !c.critical })"
              :title="c.critical ? 'Critical position' : 'Mark critical'">
              <component :is="c.critical ? ShieldAlert : Shield" :size="13" />
              <span>Critical</span>
            </button>

            <button class="chip" :class="{ paused: !c.is_active }" @click="patchRule(c, { is_active: !c.is_active })"
              :title="c.is_active ? 'Pause monitoring' : 'Resume monitoring'">
              <component :is="c.is_active ? Pause : Play" :size="13" />
              <span>{{ c.is_active ? 'Pause' : 'Resume' }}</span>
            </button>

            <span class="flex-spacer" />

            <Transition name="cov-fade">
              <button v-if="c.shortfall > 0 && c.is_active" class="chip resolve" @click="$emit('go', 'assignment')" title="Assign staff to this shift">
                <Zap :size="13" /><span>Resolve</span>
              </button>
            </Transition>

            <!-- inline delete confirm -->
            <div class="del-wrap" :class="{ confirming: confirmId === c.id }">
              <button v-if="confirmId !== c.id" class="icon-btn danger" @click="confirmId = c.id" title="Delete rule"><Trash2 :size="13" /></button>
              <template v-else>
                <button class="icon-btn danger solid" @click="removeRule(c)" title="Confirm delete"><Check :size="13" /></button>
                <button class="icon-btn" @click="confirmId = null" title="Cancel"><X :size="13" /></button>
              </template>
            </div>
          </div>
        </Motion>
      </div>

      <ShiftEmptyState v-else :icon="Radar" title="No coverage rules yet"
        sub="Define a minimum head-count below and the radar starts watching live assignments against it." />
    </div>

    <!-- ═══════════ COMPOSER ═══════════ -->
    <Motion as="div" class="panel composer" :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }">
      <header class="panel-head">
        <span class="hnum">02</span><h3>Add a minimum-staffing rule</h3>
      </header>

      <div class="compose">
        <select v-model="form.shift_id" class="cf-input">
          <option value="">Select shift…</option>
          <option v-for="s in shifts" :key="s.id" :value="s.id">{{ s.name }} ({{ s.code }})</option>
        </select>
        <select v-model="form.department_id" class="cf-input">
          <option value="">All departments</option>
          <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
        </select>
        <div class="stepper compose-min">
          <button @click="form.min_staff = Math.max(1, form.min_staff - 1)" :disabled="form.min_staff <= 1"><Minus :size="13" /></button>
          <span class="stepper-val">min {{ form.min_staff }}</span>
          <button @click="form.min_staff++"><Plus :size="13" /></button>
        </div>
        <input v-model="form.label" class="cf-input cf-label" placeholder="Label (optional)" />
        <button class="chip compose-crit" :class="{ on: form.critical }" @click="form.critical = !form.critical">
          <component :is="form.critical ? ShieldAlert : Shield" :size="13" /><span>Critical</span>
        </button>
        <button class="btn-primary" :disabled="!form.shift_id || saving" @click="addRule">
          <Plus :size="14" />{{ saving ? 'Adding…' : 'Add rule' }}
        </button>
      </div>

      <Transition name="cov-fade">
        <p v-if="form.shift_id" class="compose-preview">
          <Activity :size="12" />
          Watching <b>{{ shiftName(form.shift_id) }}</b> in <b>{{ deptName(form.department_id) }}</b> ·
          alert when on-duty drops below <b>{{ form.min_staff }}</b>
          <ShiftStatusPill v-if="form.critical" tone="alert">Critical</ShiftStatusPill>
        </p>
      </Transition>
    </Motion>
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import {
  Radar, RefreshCw, Plus, Minus, Users, Trash2, AlertTriangle, ShieldAlert, Shield,
  Pause, Play, ChevronLeft, ChevronRight, ArrowRight, Check, X, Activity, Zap,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import ShiftCoverageRadar from '../components/ShiftCoverageRadar.vue'
import ShiftStatusPill from '../components/ShiftStatusPill.vue'
import ShiftEmptyState from '../components/ShiftEmptyState.vue'
import ShiftCountUp from '../components/ShiftCountUp.vue'
import {
  fetchCoverageRules, createCoverageRule, updateCoverageRule, deleteCoverageRule,
  fetchCoverageAlerts, fetchShifts, fetchDepartments, shortTime, todayIso, isoOffsetDays,
} from '@/composables/useShifts'

const emit = defineEmits(['refresh-stats', 'go'])
const toast = useToast()

const shifts = ref([])
const departments = ref([])
const rules = ref([])
const alerts = ref(null)
const loadingAlerts = ref(false)
const saving = ref(false)
const confirmId = ref(null)
const onDate = ref(todayIso())
const matrixRef = ref(null)
const form = reactive({ shift_id: '', department_id: '', min_staff: 1, label: '', critical: false })

// ─── lookups ───
const shiftMap = computed(() => Object.fromEntries(shifts.value.map(s => [s.id, s])))
const shiftName = (id) => shiftMap.value[id]?.name || 'shift'
const deptName = (id) => (departments.value.find(d => d.id === id)?.name) || 'all departments'
const shiftTimeLabel = (id) => {
  const s = shiftMap.value[id]
  return s ? `${shortTime(s.start_time)}–${shortTime(s.end_time)}` : '—'
}
const startAngle = (id) => {
  const t = shiftMap.value[id]?.start_time
  if (!t) return 0
  const [h, m] = String(t).split(':').map(Number)
  return ((h || 0) * 60 + (m || 0)) / 1440 * 360
}

const isToday = computed(() => onDate.value === todayIso())
const niceDate = computed(() => {
  const d = new Date(onDate.value + 'T00:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
})

// ─── merged matrix (rule + live alert) ───
const alertMap = computed(() => Object.fromEntries((alerts.value?.alerts || []).map(a => [a.rule_id, a])))
const STATUS_RANK = { CRITICAL: 0, WARN: 1, OK: 2, PAUSED: 3 }
const matrix = computed(() => rules.value.map(r => {
  const a = alertMap.value[r.id]
  const status = !r.is_active ? 'PAUSED' : (a?.status || 'OK')
  return {
    ...r,
    assigned: r.is_active && a ? a.assigned : null,
    shortfall: r.is_active && a ? a.shortfall : 0,
    status,
  }
}).sort((x, y) => (STATUS_RANK[x.status] - STATUS_RANK[y.status]) || (y.shortfall - x.shortfall)))

const totalShort = computed(() => alerts.value?.total_shortfall || 0)
const criticalCount = computed(() => alerts.value?.critical_count || 0)
const readiness = computed(() => {
  const live = matrix.value.filter(c => c.status !== 'PAUSED')
  if (!live.length) return 100
  const covered = live.filter(c => c.status === 'OK').length
  return Math.round((covered / live.length) * 100)
})

// ─── radar blips (active rules only) ───
const blips = computed(() => matrix.value.filter(c => c.status !== 'PAUSED').map(c => ({
  id: c.id,
  label: `${c.shift_name} — ${c.assigned ?? 0}/${c.min_staff}`,
  angleDeg: startAngle(c.shift_id),
  status: c.status,
  critical: c.critical,
})))

// ─── cell gauge helpers ───
const fillPct = (c) => {
  if (c.status === 'PAUSED' || c.assigned === null) return 0
  return c.min_staff ? Math.min(100, (c.assigned / c.min_staff) * 100) : 100
}
const statusTone = (s) => s === 'OK' ? 'ok' : s === 'CRITICAL' ? 'alert' : s === 'PAUSED' ? 'neutral' : 'warn'
const statusText = (c) => {
  if (c.status === 'PAUSED') return 'Paused'
  if (c.status === 'OK') return 'Covered'
  return `${c.shortfall} short`
}

// ─── data loading ───
const loadAlerts = async () => {
  loadingAlerts.value = true
  try { alerts.value = await fetchCoverageAlerts(isToday.value ? {} : { on_date: onDate.value }) }
  catch { /* best-effort */ }
  finally { loadingAlerts.value = false }
}
const loadRules = async () => {
  try { const d = await fetchCoverageRules({ limit: 200 }); rules.value = d.items || [] }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load rules') }
}

const stepDate = (delta) => { onDate.value = isoOffsetDays(delta, new Date(onDate.value + 'T00:00:00')); loadAlerts() }
const goToday = () => { onDate.value = todayIso(); loadAlerts() }
const scrollToShort = () => matrixRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })

onMounted(async () => {
  try {
    [shifts.value, departments.value] = await Promise.all([
      fetchShifts({ limit: 100 }).then(d => d.items || []), fetchDepartments(),
    ])
  } catch { /* */ }
  await Promise.all([loadRules(), loadAlerts()])
})

// ─── mutations ───
const addRule = async () => {
  if (!form.shift_id) return
  saving.value = true
  try {
    await createCoverageRule({
      shift_id: form.shift_id, department_id: form.department_id || null,
      min_staff: Math.max(1, Number(form.min_staff) || 1), label: form.label || null, critical: form.critical,
    })
    toast.success('Coverage rule added')
    Object.assign(form, { shift_id: '', department_id: '', min_staff: 1, label: '', critical: false })
    await Promise.all([loadRules(), loadAlerts()]); emit('refresh-stats')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not add rule') }
  finally { saving.value = false }
}

const removeRule = async (c) => {
  confirmId.value = null
  try {
    await deleteCoverageRule(c.id)
    toast.success('Rule deleted')
    await Promise.all([loadRules(), loadAlerts()]); emit('refresh-stats')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not delete') }
}

// debounced patch for rapid stepper clicks
const stepTimers = {}
const patchRule = async (c, body, { debounce = false } = {}) => {
  const run = async () => {
    try {
      await updateCoverageRule(c.id, body)
      await Promise.all([loadRules(), loadAlerts()]); emit('refresh-stats')
    } catch (e) { toast.error(e?.response?.data?.detail || 'Could not update rule'); loadRules() }
  }
  if (!debounce) return run()
  clearTimeout(stepTimers[c.id])
  stepTimers[c.id] = setTimeout(run, 480)
}

const stepMin = (c, delta) => {
  const next = Math.max(1, (c.min_staff || 1) + delta)
  if (next === c.min_staff) return
  // optimistic: mutate the underlying rule so the gauge reacts instantly
  const live = rules.value.find(r => r.id === c.id)
  if (live) live.min_staff = next
  patchRule(c, { min_staff: next }, { debounce: true })
}

onBeforeUnmount(() => Object.values(stepTimers).forEach(clearTimeout))
</script>

<style scoped>
.cov { display: flex; flex-direction: column; gap: 16px; }

/* ═══════════ COMMAND BAR ═══════════ */
.cmd { position: relative; display: grid; grid-template-columns: 290px 1fr; align-items: center; gap: 26px;
  padding: 24px 28px; border-radius: 24px; overflow: hidden;
  background: var(--shift-surface); border: 1px solid var(--shift-border); }
.cmd-glow { position: absolute; inset: 0; background: var(--shift-grad-hero); pointer-events: none; }
.cmd-scan { position: absolute; left: 0; right: 0; top: 0; height: 38%;
  background: linear-gradient(180deg, transparent, rgba(251,191,36,0.07), transparent); pointer-events: none;
  animation: shift-scanline 7s ease-in-out infinite; }
.cmd-scope { position: relative; z-index: 1; }
.cmd-readout { position: relative; z-index: 1; min-width: 0; }

.eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: var(--shift-mono); font-size: 10px;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--shift-amber-strong); }
.eyebrow-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--shift-text-dim); }
.eyebrow-dot[data-live="true"] { background: var(--shift-ok); animation: shift-ring-pulse 2.4s ease-in-out infinite; }
.cmd-readout h2 { margin: 7px 0 5px; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; color: var(--shift-text); }
.cmd-readout p { margin: 0 0 14px; font-size: 12.5px; line-height: 1.55; color: var(--shift-text-muted); max-width: 560px; }

/* date scrubber */
.scrub { display: inline-flex; align-items: center; gap: 6px; margin-bottom: 14px; flex-wrap: wrap; }
.scrub-nav, .scrub-refresh { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center;
  border: 1px solid var(--shift-border-soft); background: var(--shift-surface-2); color: var(--shift-text-muted); cursor: pointer;
  transition: transform 0.18s var(--shift-ease), border-color 0.18s, color 0.18s; }
.scrub-nav:hover, .scrub-refresh:hover { color: var(--shift-amber); border-color: var(--shift-border); transform: translateY(-1px); }
.scrub-refresh.spin :deep(svg) { animation: shift-spin 0.85s linear infinite; }
/* HrDatePicker (popover calendar — same component as onboarding asset purchase
   date) sized to sit inline with the scrubber nav buttons */
.scrub-dp { width: 190px; }
.scrub-dp :deep(.hr-dp-trigger) { height: 30px; border-radius: 9px; padding: 0 11px;
  background: var(--shift-surface-2); border-color: var(--shift-border-soft); }
.scrub-dp :deep(.hr-dp-trigger:hover:not(:disabled)) { border-color: var(--shift-border); }
.scrub-dp :deep(.trig-value) { font-size: 12px; }
.scrub-today { height: 30px; padding: 0 13px; border-radius: 9px; font-size: 12px; font-weight: 700; cursor: pointer;
  border: 1px solid var(--shift-border-soft); background: var(--shift-surface-2); color: var(--shift-text-2); }
.scrub-today:disabled { opacity: 0.4; cursor: default; }
.scrub-today:not(:disabled):hover { border-color: var(--shift-border); color: var(--shift-amber); }

.readout-stats { display: flex; flex-wrap: wrap; gap: 9px; }
.rs { display: flex; align-items: center; gap: 9px; padding: 9px 13px; border-radius: 13px; cursor: pointer; text-align: left;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2);
  transition: transform 0.2s var(--shift-ease), border-color 0.2s; }
.rs:hover { transform: translateY(-2px); border-color: var(--shift-border); }
.rs-ic { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; flex-shrink: 0;
  background: rgba(251,191,36,0.12); color: var(--shift-amber); }
.rs[data-tone="warn"] .rs-ic { background: var(--shift-warn-soft); color: var(--shift-ember-strong); }
.rs[data-tone="alert"] .rs-ic { background: var(--shift-alert-soft); color: var(--shift-alert); }
.rs[data-tone="ok"] .rs-ic { background: var(--shift-ok-soft); color: var(--shift-ok); }
.rs-meta { display: flex; flex-direction: column; }
.rs-meta b { font-family: var(--shift-mono); font-size: 17px; font-weight: 800; color: var(--shift-text); line-height: 1.1; }
.rs-meta small { font-size: 10px; color: var(--shift-text-muted); }

.resolve-cta { margin-top: 14px; display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 11px;
  border: none; cursor: pointer; font-weight: 700; font-size: 12.5px; color: #2a1407; background: var(--shift-grad-cta);
  box-shadow: 0 6px 18px rgba(234,88,12,0.28); transition: transform 0.2s var(--shift-ease); }
.resolve-cta:hover { transform: translateY(-2px); }

/* ═══════════ PANELS ═══════════ */
.panel { background: var(--shift-surface); border: 1px solid var(--shift-border-soft); border-radius: 18px; padding: 16px 18px; }
.panel-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.hnum { font-family: var(--shift-mono); font-size: 11px; color: var(--shift-amber); }
.panel-head h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--shift-text); }
.hmeta { font-family: var(--shift-mono); font-size: 10.5px; color: var(--shift-text-muted); }
.flex-spacer { flex: 1; }

/* ═══════════ MATRIX GRID ═══════════ */
.cov-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 12px; }
.cell { position: relative; display: flex; flex-direction: column; gap: 13px; padding: 15px 16px; border-radius: 16px; overflow: hidden;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft);
  transition: transform 0.25s var(--shift-ease), border-color 0.25s, box-shadow 0.25s; }
.cell:hover { transform: translateY(-3px); border-color: var(--shift-border); box-shadow: 0 14px 34px rgba(0,0,0,0.28); }
.cell[data-status="CRITICAL"] { border-color: color-mix(in srgb, var(--shift-alert) 32%, transparent); }
.cell[data-status="PAUSED"] { opacity: 0.72; }
.cell-aura { position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(120% 80% at 50% 0%, var(--shift-alert-soft), transparent 60%);
  animation: cell-aura 2.6s ease-in-out infinite; }

.cell-top { display: flex; align-items: center; gap: 11px; }
.cell-code { font-family: var(--shift-mono); font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 7px;
  background: rgba(251,191,36,0.13); color: var(--shift-amber); flex-shrink: 0; }
.cell-id { min-width: 0; flex: 1; display: flex; flex-direction: column; }
.cell-id b { font-size: 13.5px; font-weight: 700; color: var(--shift-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cell-id small { font-size: 10.5px; color: var(--shift-text-muted); font-family: var(--shift-mono); }

.cell-gauge { display: flex; flex-direction: column; gap: 9px; }
.cg-num { display: flex; align-items: baseline; gap: 5px; }
.cg-have { font-family: var(--shift-mono); font-size: 26px; font-weight: 900; color: var(--shift-text); line-height: 1; }
.cg-have[data-tone="ok"] { color: var(--shift-ok); }
.cg-have[data-tone="warn"] { color: var(--shift-ember-strong); }
.cg-have[data-tone="alert"] { color: var(--shift-alert); }
.cg-sep { font-family: var(--shift-mono); font-size: 18px; color: var(--shift-text-dim); }
.cg-need { font-family: var(--shift-mono); font-size: 18px; font-weight: 700; color: var(--shift-text-2); }
.cg-cap { margin-left: 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--shift-text-muted); }
.cg-track { position: relative; height: 8px; border-radius: 999px; background: rgba(148,163,184,0.16); overflow: hidden; }
.cg-fill { height: 100%; border-radius: 999px; transition: width 0.9s var(--shift-ease); background: linear-gradient(90deg, var(--shift-ember), var(--shift-amber-strong)); }
.cell[data-status="OK"] .cg-fill { background: linear-gradient(90deg, var(--shift-ok-strong), var(--shift-ok)); }
.cell[data-status="CRITICAL"] .cg-fill { background: linear-gradient(90deg, var(--shift-alert), #f87171); }
.cg-marker { position: absolute; right: 0; top: -2px; bottom: -2px; width: 2px; background: var(--shift-text-dim); opacity: 0.6; }

.cell-ctl { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.stepper { display: inline-flex; align-items: center; gap: 2px; border-radius: 9px; padding: 2px;
  background: var(--shift-surface); border: 1px solid var(--shift-border-soft); }
.stepper button { width: 24px; height: 24px; border-radius: 7px; border: none; cursor: pointer; display: grid; place-items: center;
  background: transparent; color: var(--shift-text-2); transition: background 0.15s, color 0.15s; }
.stepper button:hover:not(:disabled) { background: rgba(251,191,36,0.14); color: var(--shift-amber); }
.stepper button:disabled { opacity: 0.35; cursor: default; }
.stepper-val { font-family: var(--shift-mono); font-size: 11px; font-weight: 700; color: var(--shift-text-2); padding: 0 5px; min-width: 44px; text-align: center; }

.chip { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 9px; cursor: pointer; font-size: 11px; font-weight: 600;
  border: 1px solid var(--shift-border-soft); background: var(--shift-surface); color: var(--shift-text-muted);
  transition: border-color 0.18s, color 0.18s, background 0.18s, transform 0.18s; }
.chip:hover { transform: translateY(-1px); color: var(--shift-text); border-color: var(--shift-border); }
.chip.on { background: var(--shift-alert-soft); color: var(--shift-alert); border-color: color-mix(in srgb, var(--shift-alert) 34%, transparent); }
.chip.paused { background: rgba(148,163,184,0.12); color: var(--shift-text-2); }
.chip.resolve { background: var(--shift-warn-soft); color: var(--shift-ember-strong); border-color: color-mix(in srgb, var(--shift-ember) 34%, transparent); }

.del-wrap { display: inline-flex; gap: 5px; }
.icon-btn { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; cursor: pointer;
  border: 1px solid var(--shift-border-soft); background: var(--shift-surface); color: var(--shift-text-muted); transition: all 0.18s; }
.icon-btn:hover { color: var(--shift-text); border-color: var(--shift-border); }
.icon-btn.danger:hover { color: var(--shift-alert); border-color: color-mix(in srgb, var(--shift-alert) 34%, transparent); }
.icon-btn.danger.solid { background: var(--shift-alert); color: #fff; border-color: var(--shift-alert); }
.del-wrap.confirming { padding: 2px; border-radius: 9px; background: var(--shift-alert-soft); }

/* ═══════════ COMPOSER ═══════════ */
.compose { display: flex; flex-wrap: wrap; align-items: center; gap: 9px; }
.cf-input { padding: 9px 12px; border-radius: 10px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border);
  color: var(--shift-text); font: inherit; font-size: 12.5px; transition: border-color 0.18s; }
.cf-input:focus { outline: none; border-color: var(--shift-amber); }
.cf-label { flex: 1; min-width: 140px; }
.compose-min { padding: 3px; }
.btn-primary { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 10px; border: none; cursor: pointer;
  background: var(--shift-grad-cta); color: #1f1408; font-weight: 700; font-size: 12.5px; transition: transform 0.2s var(--shift-ease), box-shadow 0.2s; }
.btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(234,88,12,0.28); }
.btn-primary:disabled { opacity: 0.5; cursor: default; }
.compose-preview { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin: 14px 0 0; padding: 11px 13px; border-radius: 11px;
  font-size: 12px; color: var(--shift-text-muted); background: var(--shift-surface-2); border: 1px dashed var(--shift-border); }
.compose-preview b { color: var(--shift-text); font-weight: 700; }
.compose-preview :deep(svg) { color: var(--shift-amber); flex-shrink: 0; }

/* transitions */
.cov-fade-enter-active, .cov-fade-leave-active { transition: opacity 0.3s var(--shift-ease), transform 0.3s var(--shift-ease); }
.cov-fade-enter-from, .cov-fade-leave-to { opacity: 0; transform: translateY(-4px); }

@keyframes cell-aura { 0%, 100% { opacity: 0.45; } 50% { opacity: 0.9; } }

@media (max-width: 880px) {
  .cmd { grid-template-columns: 1fr; }
  .cmd-scope { max-width: 230px; }
  .cov-grid { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .cg-fill { transition: none; } .cell-aura { animation: none; }
}

/* ════════════════════════ LIGHT THEME OVERRIDES ════════════════════════ */
:root[data-theme="light"] .cmd-scan { background: linear-gradient(180deg, transparent, rgba(217,119,6,0.06), transparent); }
:root[data-theme="light"] .cg-track { background: rgba(40, 32, 20, 0.10); }
:root[data-theme="light"] .cell:hover { box-shadow: 0 14px 30px rgba(40, 32, 20, 0.12); }
:root[data-theme="light"] .icon-btn.danger.solid { color: #fff; }
:root[data-theme="light"] .cell-code,
:root[data-theme="light"] .rs-ic { background: rgba(217, 119, 6, 0.14); color: var(--shift-amber-strong); }
:root[data-theme="light"] .cg-marker { background: var(--shift-text-muted); }
</style>
