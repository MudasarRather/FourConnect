<template>
  <section class="srep">
    <!-- ════════════════════ HEADER ════════════════════ -->
    <Motion as="header" class="srep-head" :initial="{ opacity: 0, y: -14 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, ease: EASE }">
      <span class="head-scan" aria-hidden="true" />
      <span class="head-grid" aria-hidden="true" />

      <!-- printing-press motif -->
      <div class="press" aria-hidden="true">
        <span class="press-sheet s1" /><span class="press-sheet s2" /><span class="press-sheet s3" />
        <span class="press-roll" />
      </div>

      <div class="head-id">
        <span class="eyebrow"><span class="eyebrow-dot" /> Export bureau · live data</span>
        <h2 class="head-title">Reports<span class="title-sweep" aria-hidden="true" /></h2>
        <p>Six operational reports rendered server-side — each a unique magazine-style <b>PDF</b>, a charted <b>Excel</b> workbook and a clean <b>CSV</b>. Built straight from live shift data for the window below.</p>
      </div>

      <div class="head-side">
        <div class="head-stat">
          <b><ShiftCountUp :value="windowTotal" /></b><small>records in window</small>
        </div>
        <button class="btn-ghost" :class="{ spin: loadingPreview }" title="Refresh" @click="reloadPreview"><RefreshCw :size="15" /></button>
      </div>
    </Motion>

    <!-- ════════════════════ CONTROL BAR ════════════════════ -->
    <Motion as="div" class="controls" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.45, delay: 0.08, ease: EASE }">
      <div class="ctl-range">
        <span class="ctl-ic"><CalendarRange :size="14" /></span>
        <label class="ctl-field"><span>From</span>
          <HrDatePicker v-model="from" :max="to" :clearable="false" @change="reloadPreview" />
        </label>
        <span class="ctl-arrow">→</span>
        <label class="ctl-field"><span>To</span>
          <HrDatePicker v-model="to" :min="from" :clearable="false" @change="reloadPreview" />
        </label>
      </div>
      <div class="ctl-presets">
        <button v-for="p in PRESETS" :key="p.days" class="preset" :class="{ on: activePreset === p.days }" @click="applyPreset(p.days)">{{ p.label }}</button>
      </div>
      <label class="ctl-field ctl-dept">
        <span>Department</span>
        <HrSelect
          v-model="departmentId"
          :options="deptOptions"
          :loading="loadingDepts"
          placeholder="All departments"
          @change="reloadPreview"
        />
      </label>
      <span class="ctl-window">{{ windowDays }} day{{ windowDays === 1 ? '' : 's' }}</span>
    </Motion>

    <!-- ════════════════════ REPORT GALLERY ════════════════════ -->
    <div class="gallery">
      <Motion v-for="(r, i) in REPORTS" :key="r.key" as="article" class="rcard" :style="cardVars(r)"
        :initial="{ opacity: 0, y: 22 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.5, delay: 0.05 * i, ease: EASE }"
        v-tilt="{ max: 5, scale: 1.012, perspective: 1100 }">
        <span class="rc-ring" aria-hidden="true" />

        <!-- mini magazine cover — unique per report, matches the PDF motif -->
        <div class="rc-cover" :data-motif="r.key">
          <span class="cov-band" />
          <!-- roster · dispatch -->
          <template v-if="r.key === 'roster'">
            <span class="disp-bar b1" /><span class="disp-bar b2" /><span class="disp-bar b3" />
          </template>
          <!-- coverage · radar -->
          <svg v-else-if="r.key === 'coverage'" class="cov-svg" viewBox="0 0 100 64">
            <circle cx="50" cy="34" r="24" class="rg" /><circle cx="50" cy="34" r="15" class="rg" /><circle cx="50" cy="34" r="6" class="rg" />
            <line x1="50" y1="34" x2="50" y2="10" class="sweep" />
            <circle cx="62" cy="22" r="2.2" class="blip" />
          </svg>
          <!-- overtime · ledger -->
          <template v-else-if="r.key === 'overtime'">
            <span class="led-line l1" /><span class="led-line l2" /><span class="led-line l3" />
            <span class="led-stamp">1.5×</span><span class="cov-flux" />
          </template>
          <!-- night · nocturne -->
          <template v-else-if="r.key === 'night'">
            <span class="noc-moon" />
            <span v-for="s in 6" :key="s" class="noc-star" :style="starStyle(s)" />
          </template>
          <!-- rotation · orbit -->
          <svg v-else-if="r.key === 'rotation'" class="cov-svg" viewBox="0 0 100 64">
            <circle cx="50" cy="34" r="22" class="orbit-ring" />
            <g class="orbit-spin" style="transform-origin:50px 34px">
              <circle cx="50" cy="12" r="3.2" class="orbit-dot lead" />
              <circle cx="72" cy="34" r="2.6" class="orbit-dot" />
              <circle cx="28" cy="34" r="2.6" class="orbit-dot" />
            </g>
            <circle cx="50" cy="34" r="9" class="orbit-core" />
          </svg>
          <!-- workforce · forecast -->
          <template v-else>
            <span class="fc-grid-m" />
            <span class="fc-bar-m req" /><span class="fc-bar-m asg" />
          </template>
          <span class="cov-icon"><component :is="r.icon" :size="15" /></span>
        </div>

        <div class="rc-body">
          <div class="rc-top">
            <h3>{{ r.name }}</h3>
            <span class="rc-count"><ShiftCountUp :value="countFor(r.key)" /></span>
          </div>
          <p class="rc-tag">{{ r.tagline }}</p>
          <div class="rc-stat" :class="statTone(r.key)">{{ statFor(r.key) }}</div>
        </div>

        <div class="rc-actions">
          <button class="fmt pdf" :disabled="!!busy[r.key]" @click="run(r.key, 'pdf')">
            <Loader2 v-if="busy[r.key] === 'pdf'" :size="13" class="spin" /><FileText v-else :size="13" />PDF
          </button>
          <button class="fmt xls" :disabled="!!busy[r.key]" @click="run(r.key, 'excel')">
            <Loader2 v-if="busy[r.key] === 'excel'" :size="13" class="spin" /><FileSpreadsheet v-else :size="13" />Excel
          </button>
          <button class="fmt csv" :disabled="!!busy[r.key]" @click="run(r.key, 'csv')">
            <Loader2 v-if="busy[r.key] === 'csv'" :size="13" class="spin" /><FileDown v-else :size="13" />CSV
          </button>
        </div>
      </Motion>
    </div>

    <!-- ════════════════════ DATA LINEAGE (connection) ════════════════════ -->
    <Motion as="div" class="lineage" :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.12, ease: EASE }">
      <div class="ln-head"><GitBranch :size="13" /> Where each report draws from</div>
      <div class="ln-flow">
        <button v-for="l in LINEAGE" :key="l.key" class="ln-node" :style="{ '--c': metaFor(l.key).accent }" @click="go(l.to)">
          <span class="ln-dot" /><span class="ln-name">{{ metaFor(l.key).name }}</span>
          <ArrowUpRight :size="11" class="ln-arr" /><small>{{ l.from }}</small>
        </button>
      </div>
    </Motion>
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  RefreshCw, CalendarRange, Building2, FileText, FileSpreadsheet, FileDown, Loader2,
  CalendarClock, Radar, Coins, Moon, RefreshCcw, TrendingUp, GitBranch, ArrowUpRight,
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import ShiftCountUp from '../components/ShiftCountUp.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import HrSelect from '@/components/hr/forms/HrSelect.vue'
import {
  SHIFT_REPORTS, runShiftReport, fetchShiftReportPreview, fetchDepartments,
  todayIso, isoOffsetDays,
} from '@/composables/useShifts'

const EASE = [0.16, 1, 0.3, 1]
const toast = useToast()
const router = useRouter()

const ICONS = { roster: CalendarClock, coverage: Radar, overtime: Coins, night: Moon, rotation: RefreshCcw, workforce: TrendingUp }
const TAGS = {
  roster: 'Who works when — the operating schedule',
  coverage: 'Required vs assigned — where the gaps are',
  overtime: 'Approved OT scored through the multiplier engine',
  night: 'After-dark crew with allowances & transport',
  rotation: 'Cyclical patterns — cadence, steps & crew',
  workforce: 'Demand vs supply — the staffing forecast',
}
const REPORTS = SHIFT_REPORTS.map(r => ({ ...r, icon: ICONS[r.key], tagline: TAGS[r.key] }))
const metaFor = (k) => REPORTS.find(r => r.key === k) || REPORTS[0]

const LINEAGE = [
  { key: 'roster', from: 'Assignment · Management', to: '/admin/hr/shifts/assignment' },
  { key: 'coverage', from: 'Coverage', to: '/admin/hr/shifts/coverage' },
  { key: 'overtime', from: 'Overtime Rules × Attendance OT', to: '/admin/hr/shifts/overtime-rules' },
  { key: 'night', from: 'Night Shifts', to: '/admin/hr/shifts/night' },
  { key: 'rotation', from: 'Rotation', to: '/admin/hr/shifts/rotation' },
  { key: 'workforce', from: 'Workforce', to: '/admin/hr/shifts/workforce' },
]

const PRESETS = [
  { label: '7d', days: 7 }, { label: '30d', days: 30 }, { label: '90d', days: 90 }, { label: '1y', days: 365 },
]

const to = ref(todayIso())
const from = ref(isoOffsetDays(-89))
const departmentId = ref(null)
const departments = ref([])
const loadingDepts = ref(false)
const preview = ref(null)
const loadingPreview = ref(false)
const busy = reactive({})
const activePreset = ref(90)

const windowDays = computed(() => {
  const a = new Date(from.value), b = new Date(to.value)
  return Math.max(1, Math.round((b - a) / 86400000) + 1)
})
const windowTotal = computed(() => {
  const c = preview.value?.counts || {}
  return Object.values(c).reduce((a, b) => a + (b || 0), 0)
})
const countFor = (k) => (preview.value?.counts || {})[k] || 0
const summaryFor = (k) => (preview.value?.summaries || {})[k] || {}

const statFor = (k) => {
  const s = summaryFor(k)
  if (k === 'roster') return `${s.employees ?? 0} employees · ${s.shifts ?? 0} shifts`
  if (k === 'coverage') return s.total_shortfall ? `${s.total_shortfall} short · ${s.critical || 0} critical` : `${s.covered ?? 0} posts covered`
  if (k === 'overtime') return `${s.payable_hours ?? 0}h payable · ${s.occurrences ?? 0} events`
  if (k === 'night') return `${s.with_policy ?? 0} w/ policy · ${s.transport ?? 0} transport`
  if (k === 'rotation') return `${s.members ?? 0} crew · ${s.total_steps ?? 0} steps`
  return s.shortfall ? `${s.coverage_pct ?? 0}% covered · ${s.shortfall} short` : `${s.coverage_pct ?? 100}% covered`
}
const statTone = (k) => {
  const s = summaryFor(k)
  if (k === 'coverage') return s.critical ? 'bad' : s.total_shortfall ? 'warn' : 'good'
  if (k === 'workforce') return s.shortfall ? 'warn' : 'good'
  return ''
}

const deptOptions = computed(() => [
  { value: null, label: 'All departments', icon: Building2 },
  ...departments.value.map(d => ({ value: d.id, label: d.name })),
])

const cardVars = (r) => ({ '--c': r.accent, '--c-soft': r.soft, '--c-deep': r.deep })
const starStyle = (s) => ({ left: `${(s * 31 % 80) + 8}%`, top: `${(s * 17 % 30) + 8}%`, animationDelay: `${s * 0.4}s` })

const reloadPreview = async () => {
  if (!from.value || !to.value) return
  loadingPreview.value = true
  try { preview.value = await fetchShiftReportPreview({ from: from.value, to: to.value, ...(departmentId.value ? { department_id: departmentId.value } : {}) }) }
  catch (e) { toast.error(e?.response?.data?.detail || 'Could not load preview') }
  finally { loadingPreview.value = false }
}
const applyPreset = (days) => {
  activePreset.value = days
  to.value = todayIso()
  from.value = isoOffsetDays(-(days - 1))
  reloadPreview()
}
const run = async (key, format) => {
  if (busy[key]) return
  if (!from.value || !to.value) { toast.warning('Pick a date range first'); return }
  busy[key] = format
  try {
    await runShiftReport({ reportKey: key, format, from: from.value, to: to.value, department_id: departmentId.value || null })
    toast.success(`${metaFor(key).name} · ${format.toUpperCase()} ready (${countFor(key)} record${countFor(key) === 1 ? '' : 's'})`)
  } catch (e) {
    toast.error(e?.message || e?.response?.data?.detail || 'Export failed')
  } finally { delete busy[key] }
}
const go = (path) => router.push(path)

// Resilient department load — the backend runs a single-connection pool with no
// --reload, so a request fired during a backend restart used to fail silently
// (old empty catch) and leave the dropdown permanently empty. Retry with backoff
// and surface a real error if it still can't load.
const loadDepartments = async (attempt = 1) => {
  loadingDepts.value = true
  try {
    departments.value = await fetchDepartments()
    loadingDepts.value = false
  } catch (e) {
    if (attempt < 3) { setTimeout(() => loadDepartments(attempt + 1), 600 * attempt); return }
    loadingDepts.value = false
    departments.value = []
    toast.error(e?.response?.data?.detail || 'Could not load departments')
  }
}

onMounted(() => {
  reloadPreview()
  loadDepartments()
})
</script>

<style scoped>
.srep { display: flex; flex-direction: column; gap: 16px; }

/* ════════════════════ HEADER ════════════════════ */
.srep-head { position: relative; overflow: hidden; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 22px;
  padding: 20px 24px; border-radius: 24px; background: var(--shift-surface); border: 1px solid var(--shift-border);
  backdrop-filter: var(--shift-glass-blur); -webkit-backdrop-filter: var(--shift-glass-blur); }
.head-scan { position: absolute; left: 0; right: 0; top: 0; height: 38%; pointer-events: none; z-index: 0;
  background: linear-gradient(180deg, rgba(253,230,138,0.08), transparent); animation: shift-scanline 7s ease-in-out infinite; }
.head-grid { position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: 0.45;
  background-image: linear-gradient(var(--shift-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--shift-grid-line) 1px, transparent 1px);
  background-size: 36px 36px; mask-image: radial-gradient(120% 90% at 18% 0%, #000 30%, transparent 75%);
  -webkit-mask-image: radial-gradient(120% 90% at 18% 0%, #000 30%, transparent 75%); animation: shift-grid-pan 26s linear infinite; }
.srep-head > *:not(.head-scan):not(.head-grid) { position: relative; z-index: 1; }

/* printing press motif */
.press { position: relative; width: 66px; height: 56px; flex-shrink: 0; }
.press-sheet { position: absolute; width: 38px; height: 30px; border-radius: 3px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.press-sheet.s1 { left: 0; top: 4px; transform: rotate(-7deg); animation: sheet-out 3.6s ease-in-out infinite; }
.press-sheet.s2 { left: 10px; top: 12px; transform: rotate(2deg); animation: sheet-out 3.6s ease-in-out infinite 0.6s; }
.press-sheet.s3 { left: 20px; top: 20px; transform: rotate(8deg); opacity: 0.7; }
@keyframes sheet-out { 0%,100% { transform: translateY(0) rotate(-7deg); } 50% { transform: translateY(-4px) rotate(-9deg); } }
.press-roll { position: absolute; right: -2px; top: 0; width: 14px; height: 56px; border-radius: 7px; background: var(--shift-grad-cta); box-shadow: 0 0 14px -3px rgba(245,158,11,0.6); }

.head-id { min-width: 0; }
.eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--shift-mono); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--shift-amber-strong); }
.eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--shift-ok); animation: shift-ring-pulse 2.4s ease-out infinite; }
.head-title { position: relative; display: inline-block; margin: 7px 0 6px; font-size: 25px; font-weight: 800; letter-spacing: -0.025em; color: var(--shift-text); }
.title-sweep { position: absolute; left: 0; bottom: -3px; height: 2px; width: 100%; border-radius: 2px;
  background: linear-gradient(90deg, transparent, var(--shift-amber), var(--shift-ember), transparent); background-size: 220% 100%; animation: title-shimmer 4.5s ease-in-out infinite; }
@keyframes title-shimmer { 0%,100% { background-position: 200% 0; opacity: 0.55; } 50% { background-position: -40% 0; opacity: 1; } }
.head-id p { margin: 0; font-size: 12.5px; line-height: 1.6; color: var(--shift-text-muted); max-width: 660px; }
.head-id p b { color: var(--shift-text-2); font-weight: 700; }
.head-side { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; flex-shrink: 0; }
.head-stat { display: flex; flex-direction: column; align-items: center; padding: 8px 16px; border-radius: 14px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.head-stat b { font-family: var(--shift-mono); font-size: 20px; font-weight: 900; color: var(--shift-text); line-height: 1; }
.head-stat small { font-size: 9px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--shift-text-muted); margin-top: 3px; }
.btn-ghost { display: inline-flex; align-items: center; gap: 6px; padding: 10px 12px; border-radius: 12px; cursor: pointer; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); transition: 0.2s; }
.btn-ghost:hover { color: var(--shift-text); border-color: var(--shift-border); }
.btn-ghost.spin :deep(svg) { animation: shift-spin 0.85s linear infinite; }

/* ════════════════════ CONTROLS ════════════════════ */
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 16px; background: var(--shift-surface); border: 1px solid var(--shift-border-soft); }
.ctl-range { display: inline-flex; align-items: center; gap: 10px; }
.ctl-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; background: rgba(251,191,36,0.12); color: var(--shift-amber); }
.ctl-field { display: flex; flex-direction: column; gap: 4px; flex: 0 0 auto; min-width: 152px; }
.ctl-field span { font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--shift-text-muted); }
.ctl-arrow { color: var(--shift-text-dim); font-size: 14px; align-self: center; margin-top: 15px; }
.ctl-presets { display: inline-flex; gap: 5px; }
.preset { padding: 6px 11px; border-radius: 999px; cursor: pointer; font-family: var(--shift-mono); font-size: 11px; font-weight: 700; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-muted); transition: 0.18s; }
.preset:hover { color: var(--shift-text-2); border-color: var(--shift-border); }
.preset.on { color: #1f1408; background: var(--shift-grad-cta); border-color: transparent; }
.ctl-dept { min-width: 190px; }
.ctl-window { margin-left: auto; font-family: var(--shift-mono); font-size: 11px; font-weight: 700; color: var(--shift-amber); padding: 5px 11px; border-radius: 999px; background: rgba(251,191,36,0.1); border: 1px solid var(--shift-border); }

/* ════════════════════ GALLERY ════════════════════ */
.gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 16px; }
.rcard { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 12px; padding: 14px; border-radius: 20px;
  background: var(--shift-surface); border: 1px solid var(--shift-border-soft); transform-style: preserve-3d; transition: border-color 0.25s, box-shadow 0.3s; }
.rcard:hover { border-color: color-mix(in srgb, var(--c) 45%, transparent); box-shadow: 0 22px 44px -26px color-mix(in srgb, var(--c) 70%, transparent); }
@property --rc-a { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
.rc-ring { position: absolute; inset: 0; border-radius: inherit; padding: 1px; pointer-events: none; opacity: 0; z-index: 0;
  background: conic-gradient(from var(--rc-a), transparent 0deg, var(--c) 90deg, transparent 220deg, var(--c) 320deg, transparent 360deg);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask-composite: exclude; transition: opacity 0.35s; animation: rc-rot 6s linear infinite; }
@keyframes rc-rot { to { --rc-a: 360deg; } }
.rcard:hover .rc-ring { opacity: 0.55; }
.rcard > *:not(.rc-ring) { position: relative; z-index: 1; }

/* mini cover */
.rc-cover { position: relative; height: 92px; border-radius: 13px; overflow: hidden;
  background: linear-gradient(135deg, color-mix(in srgb, var(--c) 14%, var(--shift-surface-2)), var(--shift-surface-2)); border: 1px solid color-mix(in srgb, var(--c) 22%, transparent); }
.cov-band { position: absolute; top: 0; left: 0; right: 0; height: 5px; background: linear-gradient(90deg, var(--c), var(--c-deep)); }
.cov-icon { position: absolute; right: 9px; bottom: 9px; width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center;
  background: color-mix(in srgb, var(--c) 18%, transparent); color: var(--c); border: 1px solid color-mix(in srgb, var(--c) 36%, transparent); }
.cov-svg { width: 100%; height: 100%; }

/* dispatch bars */
.disp-bar { position: absolute; left: 14px; height: 8px; border-radius: 4px; background: linear-gradient(90deg, var(--c), var(--c-deep)); transform-origin: left; animation: bar-grow 2.6s var(--shift-ease) infinite alternate; }
.disp-bar.b1 { top: 24px; width: 62%; animation-delay: 0s; }
.disp-bar.b2 { top: 42px; width: 44%; animation-delay: 0.3s; }
.disp-bar.b3 { top: 60px; width: 74%; animation-delay: 0.6s; }
@keyframes bar-grow { from { transform: scaleX(0.55); } to { transform: scaleX(1); } }

/* radar */
.cov-svg .rg { fill: none; stroke: color-mix(in srgb, var(--c) 45%, transparent); stroke-width: 1; }
.cov-svg .sweep { stroke: var(--c); stroke-width: 1.4; transform-origin: 50px 34px; animation: radar-sweep 3s linear infinite; }
@keyframes radar-sweep { to { transform: rotate(360deg); } }
.cov-svg .blip { fill: var(--c); animation: blip-blink 3s ease-in-out infinite; }
@keyframes blip-blink { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }

/* ledger */
.led-line { position: absolute; left: 14px; right: 40px; height: 5px; border-radius: 3px; background: color-mix(in srgb, var(--c) 30%, transparent); }
.led-line.l1 { top: 26px; } .led-line.l2 { top: 42px; width: 50%; } .led-line.l3 { top: 58px; }
.led-stamp { position: absolute; left: 14px; top: 22px; font-family: var(--shift-mono); font-weight: 900; font-size: 22px; color: var(--c); transform: rotate(-8deg); opacity: 0.9; }
.cov-flux { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 35%, color-mix(in srgb, var(--c) 18%, transparent) 50%, transparent 65%); background-size: 250% 100%; animation: flux-run 3s ease-in-out infinite; }
@keyframes flux-run { 0% { background-position: 160% 0; } 100% { background-position: -60% 0; } }

/* nocturne */
.rc-cover[data-motif="night"] { background: linear-gradient(180deg, #0b1020, #1c1408); }
.noc-moon { position: absolute; right: 20px; top: 18px; width: 24px; height: 24px; border-radius: 50%; background: #fde68a; box-shadow: inset -8px 2px 0 0 #1c1408, 0 0 14px -2px #fde68a88; }
.noc-star { position: absolute; width: 3px; height: 3px; border-radius: 50%; background: #fde68a; animation: twinkle 2.4s ease-in-out infinite; }
@keyframes twinkle { 0%,100% { opacity: 0.25; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }

/* orbit */
.cov-svg .orbit-ring { fill: none; stroke: color-mix(in srgb, var(--c) 40%, transparent); stroke-width: 1; stroke-dasharray: 2 2; }
.orbit-spin { animation: radar-sweep 6s linear infinite; }
.cov-svg .orbit-dot { fill: #fff; stroke: var(--c-deep); stroke-width: 1; }
.cov-svg .orbit-dot.lead { fill: var(--c); }
.cov-svg .orbit-core { fill: color-mix(in srgb, var(--c) 20%, transparent); stroke: var(--c); stroke-width: 1; }

/* forecast */
.fc-grid-m { position: absolute; inset: 5px 0 0; background-image: linear-gradient(var(--shift-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--shift-grid-line) 1px, transparent 1px); background-size: 16px 16px; opacity: 0.6; }
.fc-bar-m { position: absolute; bottom: 12px; width: 26px; border-radius: 4px 4px 0 0; transform-origin: bottom; animation: bar-rise 2.6s var(--shift-ease) infinite alternate; }
.fc-bar-m.req { left: 28px; height: 56px; background: var(--c-deep); animation-delay: 0s; }
.fc-bar-m.asg { left: 62px; height: 38px; background: var(--c); animation-delay: 0.3s; }
@keyframes bar-rise { from { transform: scaleY(0.5); } to { transform: scaleY(1); } }

.rc-body { display: flex; flex-direction: column; gap: 4px; }
.rc-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.rc-top h3 { margin: 0; font-size: 14.5px; font-weight: 700; color: var(--shift-text); }
.rc-count { font-family: var(--shift-mono); font-size: 16px; font-weight: 900; color: var(--c); }
.rc-tag { margin: 0; font-size: 11.5px; line-height: 1.45; color: var(--shift-text-muted); min-height: 30px; }
.rc-stat { font-family: var(--shift-mono); font-size: 10.5px; font-weight: 600; color: var(--shift-text-2); padding: 4px 9px; border-radius: 7px; background: var(--shift-surface-2); width: fit-content; }
.rc-stat.good { color: var(--shift-ok); background: var(--shift-ok-soft); }
.rc-stat.warn { color: var(--shift-ember-strong); background: var(--shift-warn-soft); }
.rc-stat.bad { color: var(--shift-alert); background: var(--shift-alert-soft); }

.rc-actions { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 7px; margin-top: auto; }
.fmt { display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 8px 6px; border-radius: 10px; cursor: pointer; font-size: 11.5px; font-weight: 700; transition: 0.18s; border: 1px solid; }
.fmt.pdf { background: color-mix(in srgb, var(--c) 14%, transparent); border-color: color-mix(in srgb, var(--c) 40%, transparent); color: var(--c); }
.fmt.pdf:hover { background: color-mix(in srgb, var(--c) 24%, transparent); }
.fmt.xls { background: var(--shift-ok-soft); border-color: color-mix(in srgb, var(--shift-ok) 36%, transparent); color: var(--shift-ok); }
.fmt.xls:hover { background: color-mix(in srgb, var(--shift-ok) 18%, transparent); }
.fmt.csv { background: var(--shift-surface-2); border-color: var(--shift-border-soft); color: var(--shift-text-2); }
.fmt.csv:hover { color: var(--shift-text); border-color: var(--shift-border); }
.fmt:disabled { opacity: 0.55; cursor: default; }
.spin :deep(svg), .spin { animation: shift-spin 0.85s linear infinite; }

/* ════════════════════ LINEAGE ════════════════════ */
.lineage { padding: 16px 18px; border-radius: 18px; background: var(--shift-surface); border: 1px solid var(--shift-border-soft); }
.ln-head { display: inline-flex; align-items: center; gap: 7px; font-family: var(--shift-mono); font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--shift-amber); margin-bottom: 12px; }
.ln-flow { display: flex; flex-wrap: wrap; gap: 8px; }
.ln-node { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 1px; padding: 9px 13px; border-radius: 12px; cursor: pointer; text-align: left;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); transition: 0.2s; }
.ln-node:hover { border-color: color-mix(in srgb, var(--c) 50%, transparent); transform: translateY(-2px); }
.ln-dot { position: absolute; left: 13px; top: 13px; width: 7px; height: 7px; border-radius: 50%; background: var(--c); box-shadow: 0 0 8px -1px var(--c); }
.ln-name { font-size: 12px; font-weight: 700; color: var(--shift-text); padding-left: 13px; }
.ln-node small { font-size: 10px; color: var(--shift-text-muted); padding-left: 13px; }
.ln-arr { position: absolute; right: 11px; top: 11px; opacity: 0.4; transition: 0.2s; }
.ln-node:hover .ln-arr { opacity: 1; transform: translate(2px, -2px); }

/* ════════════════════ RESPONSIVE ════════════════════ */
@media (max-width: 820px) {
  .srep-head { grid-template-columns: auto 1fr; }
  .head-side { grid-column: 1 / -1; flex-direction: row; justify-content: space-between; }
  .ctl-window { margin-left: 0; }
}

/* ════════════════════ LIGHT THEME ════════════════════ */
[data-theme="light"] .head-scan { background: linear-gradient(180deg, rgba(217,119,6,0.08), transparent); }
[data-theme="light"] .preset.on { color: #2a1a05; }
[data-theme="light"] .rc-cover[data-motif="night"] { background: linear-gradient(180deg, #1c1633, #2a1f10); }

@media (prefers-reduced-motion: reduce) {
  .head-scan, .head-grid, .title-sweep, .eyebrow-dot, .press-sheet, .press-roll, .rc-ring,
  .disp-bar, .cov-svg .sweep, .cov-svg .blip, .cov-flux, .noc-star, .orbit-spin, .fc-bar-m { animation: none !important; }
  .disp-bar, .fc-bar-m { transform: none; }
}
</style>
