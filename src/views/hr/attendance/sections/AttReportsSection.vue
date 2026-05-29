<template>
  <section class="att-rep" data-anim="att-reports">
    <!-- ═══════════════════ HERO BANNER ═══════════════════ -->
    <Motion as="header" class="att-section-banner tone-yellow rep-hero"
      :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }"
    >
      <span class="att-banner-glow" />
      <span class="rep-hero-orbit" aria-hidden="true">
        <span class="orbit orbit-a"></span>
        <span class="orbit orbit-b"></span>
        <span class="orbit orbit-c"></span>
      </span>
      <div class="att-banner-text">
        <span class="att-banner-eyebrow">
          <span class="att-banner-eyebrow-dot" />Reports · Intelligence · Exports
        </span>
        <h2 class="att-banner-title">
          <span>Attendance</span>
          <span class="att-banner-divider">·</span>
          <span>Reports Studio</span>
        </h2>
        <p class="att-banner-sub">
          Multi-format, multi-period attendance intelligence — branded PDF cover pages,
          colour-coded Excel workbooks, and clean spreadsheet-ready CSV. Filter by date
          range &amp; department, preview the dataset, then export in your preferred format.
        </p>
      </div>
      <div class="rep-hero-stats" aria-hidden="true">
        <div class="hs-tile">
          <span class="hs-num">{{ summary.rows.toLocaleString() }}</span>
          <span class="hs-lab">Records in window</span>
        </div>
        <div class="hs-tile">
          <span class="hs-num">{{ summary.employees }}</span>
          <span class="hs-lab">Employees touched</span>
        </div>
        <div class="hs-tile hs-tile-accent">
          <span class="hs-num">{{ summary.on_time_pct }}<small>%</small></span>
          <span class="hs-lab">On-time rate</span>
        </div>
      </div>
    </Motion>

    <!-- ═══════════════════ FILTER BAR ═══════════════════ -->
    <Motion as="div" class="rep-filter-bar att-glass-card"
      :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }"
    >
      <div class="filter-cluster">
        <span class="filter-label">
          <CalendarRange :size="12" />
          Date Range
        </span>
        <div class="preset-row">
          <button v-for="p in PRESETS" :key="p.key"
            class="preset-chip"
            :class="{ active: activePreset === p.key }"
            @click="applyPreset(p.key)">
            {{ p.label }}
          </button>
        </div>
        <div class="date-row">
          <div class="date-cell">
            <span class="date-cell-tag">From</span>
            <HrDatePicker
              v-model="fromDate"
              :max="toDate"
              :clearable="false"
              placeholder="Start date"
            />
          </div>
          <span class="date-dash" aria-hidden="true">
            <span class="dash-dot" />
            <span class="dash-line" />
            <span class="dash-arrow">→</span>
            <span class="dash-line" />
            <span class="dash-dot" />
          </span>
          <div class="date-cell">
            <span class="date-cell-tag">To</span>
            <HrDatePicker
              v-model="toDate"
              :min="fromDate"
              :max="today"
              :clearable="false"
              placeholder="End date"
            />
          </div>
        </div>
      </div>

      <div class="filter-divider" />

      <div class="filter-cluster">
        <span class="filter-label">
          <Building2 :size="12" />
          Department
        </span>
        <select v-model="departmentId" class="dept-select">
          <option :value="''">All departments</option>
          <option v-for="d in departmentOptions" :key="d.value" :value="d.value">
            {{ d.label }}
          </option>
        </select>
        <div class="window-info">
          <span>{{ rangeDays }} day{{ rangeDays === 1 ? '' : 's' }} selected</span>
          <span class="dot-sep">·</span>
          <span>Pull on demand</span>
        </div>
      </div>

      <div class="filter-cta">
        <Motion as="button" class="refresh-btn"
          :whileHover="{ y: -1, scale: 1.02 }"
          :whileTap="{ scale: 0.97 }"
          @click="loadPreview"
          :disabled="loadingPreview"
        >
          <RefreshCcw :size="13" :class="{ spinning: loadingPreview }" />
          {{ loadingPreview ? `Loading ${previewProgress.done}/${previewProgress.total}…` : 'Refresh Preview' }}
        </Motion>
      </div>
    </Motion>

    <!-- ═══════════════════ REPORT GRID ═══════════════════ -->
    <div class="rep-grid">
      <Motion v-for="(r, i) in REPORTS" :key="r.key"
        as="article"
        class="rep-card att-glass-card"
        :style="{
          '--accent': r.accentHex,
          '--accent-soft': r.accentSoft,
          '--accent-text': r.textHex,
        }"
        :initial="{ opacity: 0, y: 16, scale: 0.98 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :transition="{ duration: 0.45, delay: 0.15 + 0.06 * i, ease: [0.22, 1, 0.36, 1] }"
        :whileHover="{ y: -4 }"
      >
        <span class="card-aurora" aria-hidden="true" />
        <span class="card-grid-overlay" aria-hidden="true" />

        <header class="rep-card-head">
          <Motion as="span" class="rep-icon"
            :whileHover="{ scale: 1.08, rotate: 4 }"
            :transition="{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }"
          >
            <component :is="r.icon" :size="16" />
          </Motion>
          <div class="rep-head-text">
            <span class="rep-eyebrow">
              <span class="rep-eyebrow-dot" />
              {{ r.tag }}
            </span>
            <h3 class="rep-name">{{ r.title }}</h3>
          </div>
        </header>

        <p class="rep-desc">{{ r.desc }}</p>

        <!-- Mini KPI line -->
        <div class="rep-mini-stats" v-if="!loadingPreview">
          <span class="mini-stat">
            <span class="ms-num">{{ statsFor(r.key).count.toLocaleString() }}</span>
            <span class="ms-lab">Rows</span>
          </span>
          <span class="mini-stat" v-if="statsFor(r.key).secondary !== null">
            <span class="ms-num">{{ statsFor(r.key).secondary }}</span>
            <span class="ms-lab">{{ statsFor(r.key).secondaryLabel }}</span>
          </span>
        </div>
        <div v-else class="rep-mini-stats">
          <span class="mini-stat mini-skeleton" />
          <span class="mini-stat mini-skeleton" />
        </div>

        <!-- Action row: three format buttons -->
        <div class="rep-actions">
          <Motion as="button"
            class="fmt-btn fmt-csv"
            :whileHover="{ y: -1 }"
            :whileTap="{ scale: 0.96 }"
            :disabled="busy[r.key] !== undefined"
            @click="run(r.key, 'csv')"
            :title="`Export ${r.title} as CSV`"
          >
            <span v-if="busy[r.key] === 'csv'" class="btn-spinner" />
            <FileText v-else :size="13" />
            <span>CSV</span>
          </Motion>
          <Motion as="button"
            class="fmt-btn fmt-pdf"
            :whileHover="{ y: -1 }"
            :whileTap="{ scale: 0.96 }"
            :disabled="busy[r.key] !== undefined"
            @click="run(r.key, 'pdf')"
            :title="`Export ${r.title} as branded PDF`"
          >
            <span v-if="busy[r.key] === 'pdf'" class="btn-spinner" />
            <FileType v-else :size="13" />
            <span>PDF</span>
          </Motion>
          <Motion as="button"
            class="fmt-btn fmt-xls"
            :whileHover="{ y: -1 }"
            :whileTap="{ scale: 0.96 }"
            :disabled="busy[r.key] !== undefined"
            @click="run(r.key, 'excel')"
            :title="`Export ${r.title} as styled Excel`"
          >
            <span v-if="busy[r.key] === 'excel'" class="btn-spinner" />
            <FileSpreadsheet v-else :size="13" />
            <span>Excel</span>
          </Motion>
        </div>

        <!-- Live progress bar overlays card while running -->
        <Motion v-if="busy[r.key] && busyProgress[r.key]"
          as="div" class="rep-progress-overlay"
          :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
        >
          <div class="rep-progress-text">
            Generating {{ busy[r.key].toUpperCase() }} · day {{ busyProgress[r.key].done }} / {{ busyProgress[r.key].total }}
          </div>
          <div class="rep-progress-bar">
            <div class="rep-progress-fill" :style="{ width: progressPct(r.key) + '%' }" />
          </div>
        </Motion>
      </Motion>
    </div>

    <!-- ═══════════════════ LIVE PREVIEW ═══════════════════ -->
    <Motion as="article" class="rep-preview att-glass-card"
      :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, delay: 0.5, ease: [0.22, 1, 0.36, 1] }"
    >
      <span class="preview-aurora" aria-hidden="true" />
      <header class="prev-head">
        <div>
          <span class="att-banner-eyebrow">
            <span class="att-banner-eyebrow-dot" />
            {{ fromDate }} → {{ toDate }}
          </span>
          <h3>Live preview · {{ rangeDays }}-day window</h3>
          <p class="prev-sub">Aggregated across {{ summary.employees }} employees and {{ summary.departments }} departments in this window.</p>
        </div>
        <div class="prev-head-right">
          <span class="prev-status-dot" :class="{ live: !loadingPreview }" />
          <span class="prev-status-text">{{ loadingPreview ? 'Pulling roster…' : 'Synced' }}</span>
        </div>
      </header>

      <!-- Status mix bar -->
      <div class="prev-mixbar">
        <div class="mix-track">
          <Motion v-for="m in mixSegments" :key="m.key"
            as="div" class="mix-seg"
            :style="{ '--seg-color': m.color, '--seg-light': m.light }"
            :initial="{ width: 0 }"
            :animate="{ width: m.pct + '%' }"
            :transition="{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }"
            :title="`${m.label}: ${m.value} (${m.pct.toFixed(1)}%)`"
          />
        </div>
        <div class="mix-legend">
          <span v-for="m in mixSegments" :key="'l-' + m.key" class="mix-legend-item">
            <span class="mix-dot" :style="{ background: m.color }" />
            <span class="mix-text">{{ m.label }}</span>
            <span class="mix-val">{{ m.value }}</span>
          </span>
        </div>
      </div>

      <!-- Big-number grid -->
      <div class="prev-stats">
        <div class="prev-stat" v-for="(s, i) in bigStats" :key="s.key">
          <Motion as="span" class="num"
            :initial="{ opacity: 0, y: 8 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.4, delay: 0.6 + i * 0.05, ease: [0.22, 1, 0.36, 1] }"
            :style="{ '--accent': s.color }"
          >
            {{ s.value }}<small v-if="s.suffix">{{ s.suffix }}</small>
          </Motion>
          <span class="label">{{ s.label }}</span>
        </div>
      </div>

      <!-- Department coverage rows -->
      <div class="prev-dept" v-if="byDept.length">
        <h4 class="prev-dept-title">Department coverage</h4>
        <div class="dept-rows">
          <div v-for="d in byDept" :key="d.department" class="dept-row">
            <span class="dept-name">{{ d.department }}</span>
            <div class="dept-bar">
              <Motion as="div" class="dept-bar-fill"
                :initial="{ width: 0 }"
                :animate="{ width: d.coverage + '%' }"
                :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }"
              />
              <span class="dept-bar-label">{{ d.coverage }}%</span>
            </div>
            <span class="dept-count">{{ d.present }}/{{ d.total }}</span>
          </div>
        </div>
      </div>
      <div v-else-if="!loadingPreview" class="prev-empty">
        <Inbox :size="22" />
        <p>No attendance records in this window. Try expanding the date range.</p>
      </div>
    </Motion>
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  FileText, FileType, FileSpreadsheet, RefreshCcw,
  CalendarRange, Building2, Inbox,
  BarChart3, Clock4, Home, Users, AlertTriangle, Calendar, ClipboardList,
  Coffee,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import {
  fetchAttendanceRange,
  runReport, reportTheme, STATUS_COLORS,
} from '@/utils/attendanceReportGenerator'
import { useHrReference } from '@/composables/useEmployees'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'

defineEmits([])
const toast = useToast()

// ──────────────────────────────────────────────────────────────────────
// Catalogue of reports rendered as cards. UI metadata only; the heavy
// shaping/export pipeline lives in attendanceReportGenerator.js.
// ──────────────────────────────────────────────────────────────────────
const REPORTS = [
  { key: 'monthly',    title: 'Monthly Summary',   tag: 'Per-employee',          desc: 'Per-employee totals — present, late, absent, working hours and overtime — across every month in the window.', icon: Calendar,        accentHex: '#d97706', accentSoft: '#fef3c7', textHex: '#92400e' },
  { key: 'late',       title: 'Late Arrivals',     tag: 'Punctuality',           desc: 'Every late punch-in with grace breach minutes, ranked from worst offender to first. Trend chart on the cover.',  icon: Clock4,          accentHex: '#a16207', accentSoft: '#fef9c3', textHex: '#854d0e' },
  { key: 'overtime',   title: 'Overtime',          tag: 'Approved hours',        desc: 'Approved OT hours by employee with shift, check-out time, and total working-hours context for sanity-checking.', icon: BarChart3,       accentHex: '#ea580c', accentSoft: '#ffedd5', textHex: '#9a3412' },
  { key: 'wfh',        title: 'Work From Home',    tag: 'Remote attendance',     desc: 'Approved WFH/Remote days, working hours logged remotely, and weekly distribution across employees.',                icon: Home,            accentHex: '#0284c7', accentSoft: '#e0f2fe', textHex: '#075985' },
  { key: 'compliance', title: 'Shift Compliance',  tag: 'Coverage vs roster',    desc: 'Actual working hours vs the rostered expectation. Highlights missing-punch days and below-80% coverage.',          icon: Users,           accentHex: '#0d9488', accentSoft: '#ccfbf1', textHex: '#115e59' },
  { key: 'anomalies',  title: 'Anomalies',         tag: 'Flags & exceptions',    desc: 'Flagged punches, geo-failed check-ins, missing check-outs, and >30-minute late events — your audit feed.',         icon: AlertTriangle,   accentHex: '#b91c1c', accentSoft: '#fee2e2', textHex: '#7f1d1d' },
  { key: 'daily',      title: 'Daily Roster',      tag: 'Full date-range list',  desc: 'Day-by-day, employee-by-employee roster with check-in, check-out, hours, late minutes and status. Full audit trail.', icon: ClipboardList,   accentHex: '#7c3aed', accentSoft: '#ede9fe', textHex: '#4c1d95' },
  { key: 'breaks',     title: 'Breaks',            tag: 'Off-the-clock time',    desc: 'Break minutes per day, ratio of break-to-working time, and longest sessions flagged. Cafe-receipt PDF, intensity pills.', icon: Coffee,           accentHex: '#92400e', accentSoft: '#fef3c7', textHex: '#451a03' },
]

// ──────────────────────────────────────────────────────────────────────
// Filter state
// ──────────────────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10)
const fromDate = ref('')
const toDate = ref(today)
const departmentId = ref('')
const activePreset = ref('30d')

const PRESETS = [
  { key: '7d',   label: 'Last 7 days',  days: 7 },
  { key: '14d',  label: 'Last 14 days', days: 14 },
  { key: '30d',  label: 'Last 30 days', days: 30 },
  { key: '60d',  label: 'Last 60 days', days: 60 },
  { key: '90d',  label: 'Last 90 days', days: 90 },
  { key: 'mtd',  label: 'This month',   days: 'mtd' },
]

function applyPreset(key) {
  activePreset.value = key
  const t = new Date(today + 'T00:00:00')
  let from = new Date(t)
  const p = PRESETS.find(x => x.key === key)
  if (!p) return
  if (p.days === 'mtd') {
    from = new Date(t.getFullYear(), t.getMonth(), 1)
  } else {
    from.setDate(t.getDate() - (p.days - 1))
  }
  fromDate.value = from.toISOString().slice(0, 10)
  toDate.value = today
  // Auto-reload on preset change (cheap UX win)
  loadPreview()
}

const rangeDays = computed(() => {
  if (!fromDate.value || !toDate.value) return 0
  const f = new Date(fromDate.value)
  const t = new Date(toDate.value)
  return Math.max(1, Math.round((t - f) / 86400000) + 1)
})

// ──────────────────────────────────────────────────────────────────────
// Department options
// ──────────────────────────────────────────────────────────────────────
const { reference, loadReferenceData } = useHrReference()
const departmentOptions = computed(() =>
  (reference.departments || []).map(d => ({ value: d.id, label: d.name }))
)

// ──────────────────────────────────────────────────────────────────────
// Preview state — backend-driven KPIs
// ──────────────────────────────────────────────────────────────────────
const preview = ref(null)
const loadingPreview = ref(false)
const previewProgress = reactive({ done: 0, total: 1 })

// Normalize the backend summary so existing template bindings (which use
// camelCase keys like `halfDay`, `on_time_pct`, `overtime_hours`) keep
// working without renaming things.
const summary = computed(() => {
  const s = preview.value?.summary
  if (!s) {
    return {
      rows: 0, employees: 0, departments: 0,
      present: 0, late: 0, absent: 0, halfDay: 0, leave: 0, wfh: 0,
      overtime_hours: 0, late_minutes: 0, on_time_pct: 0,
    }
  }
  return {
    rows: s.rows, employees: s.employees, departments: s.departments,
    present: s.present, late: s.late, absent: s.absent,
    halfDay: s.half_day, leave: s.leave, wfh: s.wfh,
    overtime_hours: s.overtime_hours, late_minutes: s.late_minutes,
    on_time_pct: s.on_time_pct,
  }
})

function statsFor(reportKey) {
  const counts = preview.value?.counts || {}
  const s = preview.value?.summary
  const count = counts[reportKey] || 0
  if (!s) return { count, secondary: null, secondaryLabel: '' }
  let secondary = null, secondaryLabel = ''
  if (reportKey === 'monthly') {
    secondary = s.overtime_hours ? `${s.overtime_hours.toFixed(1)}h` : null
    secondaryLabel = 'Total OT'
  } else if (reportKey === 'late') {
    secondary = s.late_minutes ? `${s.late_minutes} min` : null
    secondaryLabel = 'Late mins'
  } else if (reportKey === 'overtime') {
    secondary = s.overtime_hours ? `${s.overtime_hours.toFixed(1)}h` : null
    secondaryLabel = 'Total hrs'
  } else if (reportKey === 'wfh') {
    secondary = s.employees || null
    secondaryLabel = 'Employees'
  } else if (reportKey === 'compliance') {
    secondary = s.employees || null
    secondaryLabel = 'Employees'
  } else if (reportKey === 'anomalies') {
    secondary = count || null
    secondaryLabel = 'Flagged'
  } else if (reportKey === 'daily') {
    secondary = s.employees || null
    secondaryLabel = 'Employees'
  } else if (reportKey === 'breaks') {
    secondary = count || null
    secondaryLabel = 'Break-days'
  }
  return { count, secondary, secondaryLabel }
}

// ──────────────────────────────────────────────────────────────────────
// Status mix bar — segments scaled to sum = 100%
// ──────────────────────────────────────────────────────────────────────
const mixSegments = computed(() => {
  const s = summary.value
  const total = s.present + s.absent + s.leave + s.wfh + s.halfDay || 1
  const segs = [
    { key: 'present',  label: 'Present',  value: s.present - s.wfh,  color: STATUS_COLORS.PRESENT.hex,  light: STATUS_COLORS.PRESENT.light },
    { key: 'wfh',      label: 'WFH',      value: s.wfh,      color: STATUS_COLORS.WFH.hex,      light: STATUS_COLORS.WFH.light },
    { key: 'leave',    label: 'Leave',    value: s.leave,    color: STATUS_COLORS.LEAVE.hex,    light: STATUS_COLORS.LEAVE.light },
    { key: 'halfDay',  label: 'Half-day', value: s.halfDay,  color: STATUS_COLORS.HALF_DAY.hex, light: STATUS_COLORS.HALF_DAY.light },
    { key: 'absent',   label: 'Absent',   value: s.absent,   color: STATUS_COLORS.ABSENT.hex,   light: STATUS_COLORS.ABSENT.light },
  ]
  return segs.map(seg => ({ ...seg, pct: (seg.value / total) * 100 }))
})

const bigStats = computed(() => [
  { key: 'present',  label: 'Present-days',   value: summary.value.present,  color: STATUS_COLORS.PRESENT.hex },
  { key: 'late',     label: 'Late events',    value: summary.value.late,     color: STATUS_COLORS.LATE.hex },
  { key: 'absent',   label: 'Absences',       value: summary.value.absent,   color: STATUS_COLORS.ABSENT.hex },
  { key: 'ot',       label: 'OT hours',       value: summary.value.overtime_hours.toFixed(1), suffix: 'h', color: '#ea580c' },
  { key: 'wfh',      label: 'WFH days',       value: summary.value.wfh,      color: STATUS_COLORS.WFH.hex },
  { key: 'leave',    label: 'Leave days',     value: summary.value.leave,    color: STATUS_COLORS.LEAVE.hex },
])

// Department coverage — comes from backend, already sorted.
const byDept = computed(() => (preview.value?.by_department || []).slice(0, 6))

// ──────────────────────────────────────────────────────────────────────
// Loading + running
// ──────────────────────────────────────────────────────────────────────
async function loadPreview() {
  if (!fromDate.value || !toDate.value) return
  loadingPreview.value = true
  previewProgress.done = 0
  previewProgress.total = 1
  try {
    const res = await fetchAttendanceRange({
      from: fromDate.value,
      to: toDate.value,
      department_id: departmentId.value || null,
      onProgress: (d, t) => { previewProgress.done = d; previewProgress.total = t },
    })
    preview.value = res
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not load attendance preview')
  } finally {
    loadingPreview.value = false
  }
}

watch(departmentId, () => loadPreview())

const busy = reactive({})
const busyProgress = reactive({})

function progressPct(key) {
  const p = busyProgress[key]
  if (!p || !p.total) return 0
  return Math.round((p.done / p.total) * 100)
}

async function run(reportKey, format) {
  if (busy[reportKey]) return
  if (!fromDate.value || !toDate.value) {
    toast.warning('Pick a date range first')
    return
  }
  busy[reportKey] = format
  busyProgress[reportKey] = { done: 0, total: 1 }
  try {
    await runReport({
      reportKey, format,
      from: fromDate.value,
      to: toDate.value,
      department_id: departmentId.value || null,
      onProgress: (d, t) => { busyProgress[reportKey] = { done: d, total: t } },
    })
    const rowsCount = (preview.value?.counts || {})[reportKey] || 0
    toast.success(
      `${REPORTS.find(r => r.key === reportKey).title} · ${format.toUpperCase()} ready ` +
      `(${rowsCount} row${rowsCount === 1 ? '' : 's'})`
    )
  } catch (e) {
    console.error(e)
    toast.error(e?.response?.data?.detail || `Export failed: ${e?.message || 'unknown error'}`)
  } finally {
    delete busy[reportKey]
    delete busyProgress[reportKey]
  }
}

onMounted(async () => {
  loadReferenceData?.()
  applyPreset('30d')  // also triggers loadPreview
})
</script>

<style scoped>
@import '../../../../styles/attendance-theme.css';

.att-rep {
  display: flex; flex-direction: column; gap: 16px;
  padding-top: 18px;
  --rep-text:    var(--hr-text);
  --rep-muted:   var(--hr-text-muted);
  --rep-sec:     var(--hr-text-secondary);
  --rep-card-bd: rgba(251, 191, 36, 0.20);
  --rep-cell:    rgba(40, 30, 22, 0.40);
}
[data-theme="light"] .att-rep {
  --rep-card-bd: rgba(180, 83, 9, 0.22);
  --rep-cell:    rgba(255, 250, 240, 0.85);
}

/* ════════════════════ HERO ════════════════════ */
.rep-hero {
  position: relative;
  overflow: hidden;
  padding: 28px 30px;
  display: grid !important;
  grid-template-columns: 1fr auto;
  gap: 26px;
  align-items: center;
}
.rep-hero-orbit {
  position: absolute;
  inset: -10% -10% auto auto;
  width: 380px; height: 380px;
  pointer-events: none;
  opacity: 0.55;
}
.orbit {
  position: absolute; inset: 0;
  border-radius: 50%;
  border: 1px dashed rgba(251, 191, 36, 0.36);
  animation: att-ring-rotate 80s linear infinite;
}
.orbit-a { inset: 0; }
.orbit-b { inset: 18%; border-color: rgba(251, 146, 60, 0.32); animation-duration: 60s; animation-direction: reverse; }
.orbit-c { inset: 36%; border-color: rgba(20, 184, 166, 0.32); animation-duration: 40s; }
[data-theme="light"] .orbit { border-color: rgba(180, 83, 9, 0.30); }
[data-theme="light"] .orbit-b { border-color: rgba(194, 65, 12, 0.28); }
[data-theme="light"] .orbit-c { border-color: rgba(13, 148, 136, 0.28); }
.rep-hero-stats {
  position: relative; z-index: 2;
  display: flex; gap: 10px;
}
.hs-tile {
  position: relative;
  min-width: 110px;
  padding: 14px 16px;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(0, 0, 0, 0.20));
  border: 1px solid rgba(251, 191, 36, 0.28);
  display: flex; flex-direction: column; gap: 4px;
  backdrop-filter: blur(12px);
}
[data-theme="light"] .hs-tile {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.6), rgba(255, 250, 240, 0.85));
  border-color: rgba(180, 83, 9, 0.26);
  box-shadow: 0 8px 22px -16px rgba(120, 53, 15, 0.30);
}
.hs-tile-accent {
  background: linear-gradient(180deg, rgba(251, 191, 36, 0.16), rgba(234, 88, 12, 0.10));
  border-color: rgba(251, 146, 60, 0.45);
}
[data-theme="light"] .hs-tile-accent {
  background: linear-gradient(180deg, rgba(254, 240, 138, 0.50), rgba(254, 215, 170, 0.55));
}
.hs-num {
  font-size: 24px; font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--rep-text);
  font-variant-numeric: tabular-nums;
}
.hs-num small { font-size: 13px; margin-left: 2px; opacity: 0.75; }
.hs-lab {
  font-size: 9px;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  font-weight: 800;
  color: var(--rep-muted);
}
[data-theme="light"] .hs-lab { color: #6b5840; }
.hs-tile-accent .hs-num {
  background: var(--att-gradient-hero);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* ════════════════════ FILTER BAR ════════════════════ */
.rep-filter-bar {
  display: grid;
  grid-template-columns: 1.4fr auto 1fr auto;
  align-items: center;
  gap: 22px;
  padding: 18px 24px;
}
@media (max-width: 1100px) {
  .rep-filter-bar { grid-template-columns: 1fr; }
  .filter-divider { display: none; }
}
.filter-cluster { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.filter-label {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; letter-spacing: 1.4px; text-transform: uppercase; font-weight: 800;
  color: var(--att-teal-100);
}
[data-theme="light"] .filter-label { color: var(--att-teal-500); }
.filter-divider {
  width: 1px; height: 56px;
  background: linear-gradient(180deg, transparent, rgba(251, 191, 36, 0.36), transparent);
}
[data-theme="light"] .filter-divider {
  background: linear-gradient(180deg, transparent, rgba(180, 83, 9, 0.36), transparent);
}
.preset-row { display: flex; gap: 6px; flex-wrap: wrap; }
.preset-chip {
  padding: 5px 11px;
  border-radius: 999px;
  font-size: 11px; font-weight: 700; letter-spacing: 0.2px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--rep-muted);
  border: 1px solid rgba(251, 191, 36, 0.18);
  cursor: pointer;
  transition: background .22s, color .22s, border-color .22s, transform .18s;
}
[data-theme="light"] .preset-chip {
  background: rgba(255, 250, 240, 0.6);
  border-color: rgba(180, 83, 9, 0.20);
  color: #6b5840;
}
.preset-chip:hover {
  background: rgba(251, 191, 36, 0.10);
  border-color: rgba(251, 191, 36, 0.40);
  color: var(--rep-text);
  transform: translateY(-1px);
}
.preset-chip.active {
  background: linear-gradient(135deg, #fde68a, #fbbf24);
  color: #1f1408;
  border-color: rgba(251, 191, 36, 0.55);
  box-shadow: 0 6px 18px -8px rgba(251, 146, 60, 0.55);
}
[data-theme="light"] .preset-chip.active {
  background: linear-gradient(135deg, #f59e0b, #ea580c);
  color: #fff;
  border-color: rgba(180, 83, 9, 0.50);
}
.date-row {
  display: flex; gap: 12px; align-items: stretch;
  position: relative;
}
.date-cell {
  position: relative;
  flex: 1; min-width: 150px;
  display: flex; flex-direction: column; gap: 4px;
  isolation: isolate;
}
.date-cell-tag {
  position: absolute;
  top: -7px; left: 12px;
  z-index: 2;
  padding: 1px 8px;
  border-radius: 999px;
  background: linear-gradient(135deg, #fde68a, #fbbf24);
  color: #1f1408;
  font-size: 8.5px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase;
  box-shadow: 0 4px 10px -4px rgba(251, 146, 60, 0.55);
  pointer-events: none;
}
[data-theme="light"] .date-cell-tag {
  background: linear-gradient(135deg, #f59e0b, #ea580c);
  color: #fff;
  box-shadow: 0 4px 10px -4px rgba(194, 65, 12, 0.45);
}

/* ─── Animated dash between the two date cells ─── */
.date-dash {
  display: inline-flex; align-items: center;
  gap: 4px;
  color: var(--rep-muted);
  font-weight: 800;
  padding: 0 4px;
  font-size: 13px;
}
.dash-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: #fbbf24;
  box-shadow: 0 0 6px rgba(251, 191, 36, 0.7);
  animation: dash-dot-pulse 2.2s ease-in-out infinite;
}
[data-theme="light"] .dash-dot {
  background: #b45309;
  box-shadow: 0 0 6px rgba(180, 83, 9, 0.45);
}
@keyframes dash-dot-pulse {
  0%, 100% { transform: scale(1);   opacity: 0.55; }
  50%      { transform: scale(1.4); opacity: 1; }
}
.dash-line {
  display: inline-block;
  width: 14px; height: 1.4px;
  border-radius: 1px;
  background: linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.65), transparent);
  background-size: 200% 100%;
  animation: dash-line-flow 2.2s linear infinite;
}
[data-theme="light"] .dash-line {
  background: linear-gradient(90deg, transparent, rgba(180, 83, 9, 0.65), transparent);
  background-size: 200% 100%;
}
@keyframes dash-line-flow {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.dash-arrow {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px;
  border-radius: 7px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.22), rgba(234, 88, 12, 0.14));
  border: 1px solid rgba(251, 146, 60, 0.55);
  color: #fcd34d;
  font-size: 11px; font-weight: 800;
  box-shadow: 0 4px 12px -6px rgba(251, 146, 60, 0.55);
  animation: dash-arrow-bob 2.6s ease-in-out infinite;
}
[data-theme="light"] .dash-arrow {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.20), rgba(194, 65, 12, 0.14));
  border-color: rgba(180, 83, 9, 0.55);
  color: #b45309;
  box-shadow: 0 4px 12px -6px rgba(180, 83, 9, 0.45);
}
@keyframes dash-arrow-bob {
  0%, 100% { transform: translateX(0); }
  50%      { transform: translateX(3px); }
}

/* ─── HrDatePicker trigger — stronger borders inside the filter bar ─── */
.att-rep .date-cell :deep(.hr-dp-trigger) {
  width: 100%;
  padding: 11px 14px;
  border-radius: 11px;
  border: 1px solid rgba(251, 191, 36, 0.48);
  background: rgba(255, 255, 255, 0.05);
  color: var(--rep-text);
  font-size: 13px; font-weight: 700;
  letter-spacing: 0.15px;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: border-color .22s var(--att-spring), background .22s var(--att-spring),
              box-shadow .25s var(--att-spring), transform .18s var(--att-spring);
}
[data-theme="light"] .att-rep .date-cell :deep(.hr-dp-trigger) {
  background: rgba(255, 250, 240, 0.92);
  border-color: rgba(180, 83, 9, 0.48);
  color: var(--rep-text);
}
.att-rep .date-cell :deep(.hr-dp-trigger:hover:not(:disabled)) {
  border-color: rgba(251, 146, 60, 0.78);
  background: rgba(251, 191, 36, 0.08);
  transform: translateY(-1px);
  box-shadow: 0 10px 22px -14px rgba(251, 146, 60, 0.55);
}
[data-theme="light"] .att-rep .date-cell :deep(.hr-dp-trigger:hover:not(:disabled)) {
  border-color: rgba(194, 65, 12, 0.72);
  background: rgba(255, 246, 226, 0.96);
  box-shadow: 0 10px 22px -14px rgba(194, 65, 12, 0.40);
}
.att-rep .date-cell :deep(.hr-dp.open .hr-dp-trigger),
.att-rep .date-cell :deep(.hr-dp.focused .hr-dp-trigger) {
  border-color: rgba(251, 146, 60, 0.85);
  background: rgba(251, 191, 36, 0.10);
  box-shadow:
    0 0 0 3px rgba(251, 146, 60, 0.16),
    0 12px 26px -14px rgba(251, 146, 60, 0.60);
}
[data-theme="light"] .att-rep .date-cell :deep(.hr-dp.open .hr-dp-trigger),
[data-theme="light"] .att-rep .date-cell :deep(.hr-dp.focused .hr-dp-trigger) {
  border-color: rgba(194, 65, 12, 0.80);
  background: rgba(255, 248, 232, 0.98);
  box-shadow:
    0 0 0 3px rgba(194, 65, 12, 0.14),
    0 12px 26px -14px rgba(194, 65, 12, 0.45);
}
.att-rep .date-cell :deep(.hr-dp-trigger .trig-cal) {
  color: #fbbf24;
  transition: transform .35s var(--att-spring), color .25s;
}
[data-theme="light"] .att-rep .date-cell :deep(.hr-dp-trigger .trig-cal) { color: #b45309; }
.att-rep .date-cell :deep(.hr-dp-trigger:hover:not(:disabled) .trig-cal) { transform: rotate(-6deg) scale(1.08); }
.att-rep .date-cell :deep(.hr-dp.open .hr-dp-trigger .trig-cal) { transform: rotate(-12deg) scale(1.12); color: #fcd34d; }
[data-theme="light"] .att-rep .date-cell :deep(.hr-dp.open .hr-dp-trigger .trig-cal) { color: #c2410c; }

/* Stack vertically on narrow screens; hide the dash arrow */
@media (max-width: 560px) {
  .date-row { flex-direction: column; align-items: stretch; }
  .date-dash { align-self: center; transform: rotate(90deg); margin: 4px 0; }
}
.dept-select {
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(251, 191, 36, 0.22);
  border-radius: 10px;
  font: inherit; font-size: 12.5px;
  color: var(--rep-text);
  cursor: pointer;
}
[data-theme="light"] .dept-select {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(180, 83, 9, 0.26);
  color: var(--rep-text);
}
.dept-select option { background: #1a1410; color: #fff; }
[data-theme="light"] .dept-select option { background: #fff; color: var(--rep-text); }
.window-info {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--rep-muted);
  letter-spacing: 0.3px;
}
.window-info .dot-sep { margin: 0 4px; opacity: 0.5; }
.filter-cta { display: flex; align-items: center; justify-content: flex-end; }
.refresh-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 11px 18px;
  border-radius: 12px;
  background: linear-gradient(135deg, #fde68a 0%, #fbbf24 50%, #f59e0b 100%);
  color: #1f1408;
  font-weight: 800; font-size: 12.5px; letter-spacing: 0.3px;
  border: 1px solid rgba(251, 191, 36, 0.55);
  cursor: pointer;
  box-shadow: 0 12px 26px -10px rgba(251, 146, 60, 0.55);
  transition: box-shadow .25s, background-position .35s;
  background-size: 200% 200%;
}
.refresh-btn:hover { background-position: 100% 50%; box-shadow: 0 18px 36px -10px rgba(251, 146, 60, 0.72); }
.refresh-btn:disabled { opacity: 0.7; cursor: progress; }
[data-theme="light"] .refresh-btn {
  background: linear-gradient(135deg, #fbbf24, #f59e0b 55%, #ea580c);
  color: #fff;
}
.spinning { animation: att-hand-sweep 0.9s linear infinite; }

/* ════════════════════ REPORT GRID ════════════════════ */
.rep-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
  gap: 16px;
}
.rep-card {
  position: relative;
  padding: 20px 20px 16px;
  display: flex; flex-direction: column; gap: 10px;
  overflow: hidden;
  isolation: isolate;
  cursor: default;
  transition: border-color .35s, box-shadow .35s;
}
.rep-card:hover {
  border-color: var(--accent) !important;
  box-shadow:
    0 26px 60px -28px color-mix(in srgb, var(--accent) 60%, transparent),
    inset 0 0 0 1px color-mix(in srgb, var(--accent) 25%, transparent);
}
.card-aurora {
  position: absolute;
  inset: -30% -30% auto -30%;
  height: 60%;
  background: radial-gradient(70% 60% at 50% 40%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 65%);
  filter: blur(40px);
  z-index: -1;
  opacity: 0;
  transition: opacity .35s ease-out;
  pointer-events: none;
}
.rep-card:hover .card-aurora { opacity: 1; }
.card-grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(251, 191, 36, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(251, 191, 36, 0.04) 1px, transparent 1px);
  background-size: 24px 24px, 24px 24px;
  z-index: -1;
  opacity: 0.5;
  pointer-events: none;
  mask-image: radial-gradient(120% 100% at 100% 0%, #000, transparent 60%);
}
[data-theme="light"] .card-grid-overlay {
  background-image:
    linear-gradient(rgba(120, 53, 15, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(120, 53, 15, 0.05) 1px, transparent 1px);
}

.rep-card-head { display: flex; align-items: flex-start; gap: 12px; }
.rep-icon {
  width: 40px; height: 40px;
  border-radius: 11px;
  display: inline-flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  flex-shrink: 0;
}
.rep-head-text { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.rep-eyebrow {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 9px; font-weight: 800; letter-spacing: 1.3px; text-transform: uppercase;
  color: var(--accent);
}
.rep-eyebrow-dot {
  width: 4px; height: 4px; border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 5px color-mix(in srgb, var(--accent) 60%, transparent);
  animation: att-live-pulse 2.4s ease-in-out infinite;
}
.rep-name {
  margin: 0; font-size: 16px; font-weight: 800;
  color: var(--rep-text); letter-spacing: -0.012em;
  line-height: 1.2;
}
.rep-desc {
  margin: 0;
  font-size: 12px; line-height: 1.55;
  color: var(--rep-muted);
}

.rep-mini-stats {
  display: flex; gap: 18px; margin-top: 2px;
  padding: 10px 12px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 18%, transparent);
}
.mini-stat { display: flex; flex-direction: column; gap: 2px; }
.ms-num {
  font-size: 17px; font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--rep-text);
  font-variant-numeric: tabular-nums;
}
.ms-lab {
  font-size: 9px; font-weight: 800; letter-spacing: 0.9px; text-transform: uppercase;
  color: var(--rep-muted);
}
[data-theme="light"] .ms-lab { color: #6b5840; }
.mini-skeleton {
  height: 22px; width: 60%;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent) 14%, transparent), transparent);
  background-size: 200% 100%;
  border-radius: 6px;
  animation: skeleton-shimmer 1.2s linear infinite;
}
@keyframes skeleton-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.rep-actions {
  margin-top: auto;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
  padding-top: 14px;
  border-top: 1px dashed color-mix(in srgb, var(--accent) 18%, transparent);
}
.fmt-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 9px 8px;
  border-radius: 10px;
  font: inherit; font-size: 11px; font-weight: 800; letter-spacing: 0.3px;
  border: 1px solid;
  cursor: pointer;
  transition: transform .2s, box-shadow .2s, background .2s, border-color .2s, color .2s;
  position: relative; overflow: hidden;
}
.fmt-btn:disabled { opacity: 0.55; cursor: progress; transform: none !important; }
.fmt-csv {
  background: rgba(20, 184, 166, 0.10);
  color: #5eead4;
  border-color: rgba(20, 184, 166, 0.36);
}
.fmt-csv:hover:not(:disabled) {
  background: rgba(20, 184, 166, 0.22);
  border-color: rgba(20, 184, 166, 0.60);
  color: #ccfbf1;
  box-shadow: 0 10px 22px -10px rgba(20, 184, 166, 0.55);
}
.fmt-pdf {
  background: rgba(220, 38, 38, 0.10);
  color: #fca5a5;
  border-color: rgba(220, 38, 38, 0.36);
}
.fmt-pdf:hover:not(:disabled) {
  background: rgba(220, 38, 38, 0.22);
  border-color: rgba(220, 38, 38, 0.60);
  color: #fecaca;
  box-shadow: 0 10px 22px -10px rgba(220, 38, 38, 0.55);
}
.fmt-xls {
  background: rgba(34, 197, 94, 0.10);
  color: #86efac;
  border-color: rgba(34, 197, 94, 0.36);
}
.fmt-xls:hover:not(:disabled) {
  background: rgba(34, 197, 94, 0.22);
  border-color: rgba(34, 197, 94, 0.60);
  color: #bbf7d0;
  box-shadow: 0 10px 22px -10px rgba(34, 197, 94, 0.55);
}
[data-theme="light"] .fmt-csv {
  background: rgba(13, 148, 136, 0.12);
  color: #0f766e;
  border-color: rgba(13, 148, 136, 0.45);
}
[data-theme="light"] .fmt-csv:hover:not(:disabled) {
  background: rgba(13, 148, 136, 0.22);
  color: #115e59;
}
[data-theme="light"] .fmt-pdf {
  background: rgba(185, 28, 28, 0.10);
  color: #991b1b;
  border-color: rgba(185, 28, 28, 0.45);
}
[data-theme="light"] .fmt-pdf:hover:not(:disabled) {
  background: rgba(185, 28, 28, 0.20);
  color: #7f1d1d;
}
[data-theme="light"] .fmt-xls {
  background: rgba(21, 128, 61, 0.10);
  color: #166534;
  border-color: rgba(21, 128, 61, 0.40);
}
[data-theme="light"] .fmt-xls:hover:not(:disabled) {
  background: rgba(21, 128, 61, 0.20);
  color: #14532d;
}
.btn-spinner {
  width: 11px; height: 11px;
  border: 1.5px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: att-hand-sweep 0.7s linear infinite;
}

.rep-progress-overlay {
  position: absolute; left: 0; right: 0; bottom: 0;
  background: linear-gradient(0deg, rgba(20, 16, 14, 0.92), rgba(20, 16, 14, 0.40));
  backdrop-filter: blur(8px);
  padding: 12px 16px 14px;
  display: flex; flex-direction: column; gap: 6px;
  z-index: 4;
}
[data-theme="light"] .rep-progress-overlay {
  background: linear-gradient(0deg, rgba(255, 250, 240, 0.95), rgba(255, 250, 240, 0.55));
}
.rep-progress-text {
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.5px;
  color: var(--rep-text);
}
.rep-progress-bar {
  height: 5px;
  background: rgba(251, 191, 36, 0.18);
  border-radius: 3px;
  overflow: hidden;
}
.rep-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), #fbbf24, #fb923c);
  background-size: 200% 100%;
  animation: att-gradient-flow 2s linear infinite;
  border-radius: 3px;
  transition: width 0.35s ease-out;
}

/* ════════════════════ LIVE PREVIEW ════════════════════ */
.rep-preview {
  padding: 24px 26px;
  display: flex; flex-direction: column; gap: 18px;
  position: relative; overflow: hidden;
  isolation: isolate;
}
.preview-aurora {
  position: absolute;
  inset: -30% -10% auto -10%;
  height: 60%;
  background:
    radial-gradient(35% 40% at 20% 30%, rgba(251, 191, 36, 0.18), transparent 60%),
    radial-gradient(35% 40% at 80% 30%, rgba(234, 88, 12, 0.14), transparent 60%);
  filter: blur(40px);
  z-index: -1;
  animation: att-warm-aurora 22s ease-in-out infinite;
  pointer-events: none;
}
[data-theme="light"] .preview-aurora {
  background:
    radial-gradient(35% 40% at 20% 30%, rgba(217, 119, 6, 0.16), transparent 60%),
    radial-gradient(35% 40% at 80% 30%, rgba(234, 88, 12, 0.12), transparent 60%);
}

.prev-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.prev-head h3 {
  margin: 4px 0 0;
  font-size: 18px; font-weight: 800; letter-spacing: -0.015em;
  color: var(--rep-text);
}
.prev-sub {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--rep-muted);
}
.prev-head-right {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 11px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(251, 191, 36, 0.22);
}
[data-theme="light"] .prev-head-right {
  background: rgba(255, 250, 240, 0.7);
  border-color: rgba(180, 83, 9, 0.24);
}
.prev-status-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #fbbf24;
  box-shadow: 0 0 6px rgba(251, 191, 36, 0.6);
}
.prev-status-dot.live {
  background: #5eead4;
  box-shadow: 0 0 7px rgba(94, 234, 212, 0.65);
  animation: att-live-pulse 2.2s ease-in-out infinite;
}
[data-theme="light"] .prev-status-dot.live {
  background: #0d9488;
  box-shadow: 0 0 7px rgba(13, 148, 136, 0.55);
}
.prev-status-text {
  font-size: 10.5px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase;
  color: var(--rep-muted);
}

.prev-mixbar { display: flex; flex-direction: column; gap: 10px; }
.mix-track {
  display: flex; height: 10px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.18);
}
[data-theme="light"] .mix-track {
  background: rgba(180, 83, 9, 0.08);
  border-color: rgba(180, 83, 9, 0.18);
}
.mix-seg {
  height: 100%;
  background: var(--seg-color);
  position: relative;
  transition: filter .25s;
}
.mix-seg:hover { filter: brightness(1.2); }
.mix-legend {
  display: flex; flex-wrap: wrap;
  gap: 14px;
}
.mix-legend-item {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px;
}
.mix-dot { width: 8px; height: 8px; border-radius: 2px; }
.mix-text { font-weight: 700; color: var(--rep-muted); letter-spacing: 0.3px; }
.mix-val { font-weight: 800; color: var(--rep-text); font-variant-numeric: tabular-nums; }

.prev-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 14px;
}
.prev-stat {
  display: flex; flex-direction: column; gap: 4px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(251, 191, 36, 0.14);
  position: relative; overflow: hidden;
}
[data-theme="light"] .prev-stat {
  background: rgba(255, 250, 240, 0.65);
  border-color: rgba(180, 83, 9, 0.18);
}
.prev-stat::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: var(--accent, #fbbf24);
  border-radius: 3px 0 0 3px;
}
.num {
  font-size: 26px; font-weight: 800; letter-spacing: -0.02em;
  color: var(--accent, var(--rep-text));
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.num small { font-size: 13px; opacity: 0.7; margin-left: 1px; }
.label {
  font-size: 9px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase;
  color: var(--rep-muted);
}
[data-theme="light"] .label { color: #6b5840; }

.prev-dept { display: flex; flex-direction: column; gap: 10px; }
.prev-dept-title {
  margin: 4px 0 0;
  font-size: 11px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase;
  color: var(--rep-muted);
}
.dept-rows { display: flex; flex-direction: column; gap: 8px; }
.dept-row {
  display: grid;
  grid-template-columns: 140px 1fr 64px;
  gap: 14px;
  align-items: center;
}
@media (max-width: 640px) { .dept-row { grid-template-columns: 1fr; } }
.dept-name {
  font-size: 12.5px; font-weight: 700; color: var(--rep-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.dept-bar {
  position: relative;
  height: 16px;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.18);
  border-radius: 6px;
  overflow: hidden;
}
[data-theme="light"] .dept-bar {
  background: rgba(180, 83, 9, 0.08);
  border-color: rgba(180, 83, 9, 0.18);
}
.dept-bar-fill {
  position: absolute; left: 0; top: 0; bottom: 0;
  background: linear-gradient(90deg, #fde68a, #fbbf24, #f59e0b);
  background-size: 200% 100%;
  animation: att-gradient-flow 4s linear infinite;
}
[data-theme="light"] .dept-bar-fill {
  background: linear-gradient(90deg, #fbbf24, #f59e0b, #ea580c);
  background-size: 200% 100%;
}
.dept-bar-label {
  position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
  font-size: 10px; font-weight: 800;
  color: #1f1408;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.30);
}
.dept-count {
  font-size: 11px; font-weight: 700;
  color: var(--rep-muted);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.prev-empty {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 30px 20px;
  text-align: center;
  color: var(--rep-muted);
}
.prev-empty svg { color: var(--att-orange-200); }
.prev-empty p {
  margin: 0;
  font-size: 13px; font-weight: 700;
  color: var(--rep-text);
}
[data-theme="light"] .prev-empty svg { color: var(--att-orange-500); }

/* ════════════════════ DARK→LIGHT ════════════════════ */
[data-theme="light"] .rep-hero {
  background:
    radial-gradient(120% 100% at 100% 0%, rgba(234, 179, 8, 0.18), transparent 60%),
    rgba(255, 250, 240, 0.92);
}

/* ════════════════════ BORDER VISIBILITY PASS ════════════════════
   Strengthens every faint border across the Reports surface so the
   grid reads cleanly on BOTH themes. Default theme borders sat at
   alpha 0.14-0.22 (barely visible); these overrides lift them to
   0.40-0.55 (clearly visible without losing the glass aesthetic).
   ──────────────────────────────────────────────────────────────── */

/* Top-level glass cards — banner, filter bar, every report tile, preview */
.att-rep .att-glass-card {
  border: 1px solid rgba(251, 191, 36, 0.42);
  box-shadow:
    0 14px 36px -22px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}
[data-theme="light"] .att-rep .att-glass-card {
  border: 1px solid rgba(180, 83, 9, 0.42);
  box-shadow:
    0 14px 36px -22px rgba(40, 25, 10, 0.20),
    inset 0 1px 0 rgba(255, 255, 255, 0.60);
}

/* Hero banner — match the strengthened card border */
.att-rep .rep-hero {
  border: 1px solid rgba(251, 191, 36, 0.45);
}
[data-theme="light"] .att-rep .rep-hero {
  border-color: rgba(180, 83, 9, 0.44);
}

/* Hero KPI tiles */
.att-rep .hs-tile {
  border-color: rgba(251, 191, 36, 0.48);
}
[data-theme="light"] .att-rep .hs-tile {
  border-color: rgba(180, 83, 9, 0.44);
}
.att-rep .hs-tile-accent {
  border-color: rgba(251, 146, 60, 0.62);
}
[data-theme="light"] .att-rep .hs-tile-accent {
  border-color: rgba(194, 65, 12, 0.55);
}

/* Filter bar — date inputs, dept select, preset chips */
.att-rep .preset-chip {
  border-color: rgba(251, 191, 36, 0.42);
}
[data-theme="light"] .att-rep .preset-chip {
  border-color: rgba(180, 83, 9, 0.44);
}
.att-rep .preset-chip:hover {
  border-color: rgba(251, 191, 36, 0.65);
}
[data-theme="light"] .att-rep .preset-chip:hover {
  border-color: rgba(180, 83, 9, 0.65);
}
.att-rep .preset-chip.active {
  border-color: rgba(251, 191, 36, 0.75);
}
[data-theme="light"] .att-rep .preset-chip.active {
  border-color: rgba(180, 83, 9, 0.70);
}
.att-rep .date-input,
.att-rep .dept-select {
  border: 1px solid rgba(251, 191, 36, 0.48);
}
[data-theme="light"] .att-rep .date-input,
[data-theme="light"] .att-rep .dept-select {
  border-color: rgba(180, 83, 9, 0.48);
}
.att-rep .date-input:focus,
.att-rep .dept-select:focus {
  border-color: rgba(251, 146, 60, 0.78);
  box-shadow: 0 0 0 3px rgba(251, 146, 60, 0.18);
}
[data-theme="light"] .att-rep .date-input:focus,
[data-theme="light"] .att-rep .dept-select:focus {
  border-color: rgba(194, 65, 12, 0.72);
  box-shadow: 0 0 0 3px rgba(194, 65, 12, 0.15);
}
.att-rep .filter-divider {
  background: linear-gradient(180deg, transparent, rgba(251, 191, 36, 0.55), transparent);
}
[data-theme="light"] .att-rep .filter-divider {
  background: linear-gradient(180deg, transparent, rgba(180, 83, 9, 0.55), transparent);
}

/* Report tile internals — mini stats, action divider */
.att-rep .rep-mini-stats {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 42%, transparent);
}
[data-theme="light"] .att-rep .rep-mini-stats {
  background: color-mix(in srgb, var(--accent) 8%, rgba(255, 250, 240, 0.65));
  border-color: color-mix(in srgb, var(--accent) 50%, transparent);
}
.att-rep .rep-actions {
  border-top: 1px dashed color-mix(in srgb, var(--accent) 42%, transparent);
}
[data-theme="light"] .att-rep .rep-actions {
  border-top-color: color-mix(in srgb, var(--accent) 48%, transparent);
}

/* Format buttons — stronger borders */
.att-rep .fmt-csv { border-color: rgba(20, 184, 166, 0.55); }
.att-rep .fmt-pdf { border-color: rgba(220, 38, 38, 0.55); }
.att-rep .fmt-xls { border-color: rgba(34, 197, 94, 0.55); }
[data-theme="light"] .att-rep .fmt-csv { border-color: rgba(13, 148, 136, 0.60); }
[data-theme="light"] .att-rep .fmt-pdf { border-color: rgba(185, 28, 28, 0.60); }
[data-theme="light"] .att-rep .fmt-xls { border-color: rgba(21, 128, 61, 0.55); }

/* Live preview — head pill, mix bar, stat tiles, dept bars */
.att-rep .prev-head-right {
  border: 1px solid rgba(251, 191, 36, 0.48);
}
[data-theme="light"] .att-rep .prev-head-right {
  border-color: rgba(180, 83, 9, 0.48);
}
.att-rep .mix-track {
  border: 1px solid rgba(251, 191, 36, 0.42);
}
[data-theme="light"] .att-rep .mix-track {
  border-color: rgba(180, 83, 9, 0.42);
}
.att-rep .prev-stat {
  border: 1px solid rgba(251, 191, 36, 0.40);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}
[data-theme="light"] .att-rep .prev-stat {
  border-color: rgba(180, 83, 9, 0.40);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.att-rep .dept-bar {
  border: 1px solid rgba(251, 191, 36, 0.45);
}
[data-theme="light"] .att-rep .dept-bar {
  border-color: rgba(180, 83, 9, 0.45);
}

/* Refresh CTA — already strong, but tighten focus + active outline */
.att-rep .refresh-btn {
  border: 1px solid rgba(251, 191, 36, 0.70);
}
[data-theme="light"] .att-rep .refresh-btn {
  border-color: rgba(194, 65, 12, 0.65);
}
</style>
