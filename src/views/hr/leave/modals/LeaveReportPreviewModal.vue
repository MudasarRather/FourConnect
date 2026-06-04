<template>
  <Teleport to="body">
    <transition name="rpm">
      <div v-if="open" class="rpm-scrim" :style="vars" @mousedown.self="$emit('close')">
        <div class="rpm-panel" @mousedown.stop>
          <!-- ════ Hero ════ -->
          <header class="rpm-hero">
            <span class="hero-motif" aria-hidden="true">{{ report?.icon || 'R' }}</span>
            <span class="hero-glow" aria-hidden="true" />
            <button class="rpm-close" @click="$emit('close')" aria-label="Close"><X :size="16" /></button>

            <div class="hero-row">
              <span class="hero-badge"><component :is="report?.lucide || FileBarChart" :size="20" /></span>
              <div class="hero-text">
                <span class="hero-eye leave-mono"><span class="he-dot" /> Report preview · live</span>
                <h3 class="hero-title">{{ report?.name || 'Report' }}</h3>
                <p class="hero-tag">{{ report?.tagline }}</p>
              </div>
            </div>

            <!-- Window controls -->
            <div class="hero-controls">
              <div class="hc-presets">
                <button v-for="p in PRESETS" :key="p.key" class="hc-chip"
                  :class="{ active: activePreset === p.key }" @click="applyPreset(p.key)">{{ p.label }}</button>
              </div>
              <div class="hc-dates">
                <label class="hc-field"><CalendarRange :size="13" /><input type="date" v-model="filters.from" :max="filters.to" @change="onCustom" /></label>
                <span class="hc-arrow">→</span>
                <label class="hc-field"><input type="date" v-model="filters.to" :min="filters.from" @change="onCustom" /></label>
                <button class="leave-btn leave-btn-sm" :disabled="loading" @click="reload">
                  <RefreshCw :size="13" :class="{ spin: loading }" /> Recast
                </button>
              </div>
            </div>
          </header>

          <!-- ════ Body ════ -->
          <div class="rpm-body">
            <!-- KPI stat cards -->
            <div v-if="preview" class="kpi-grid">
              <Motion v-for="(v, k, i) in summary" :key="k" as="div" class="kpi-stat"
                :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.4, delay: Math.min(i * 0.05, 0.3), ease: [0.16, 1, 0.3, 1] }"
              >
                <span class="ks-val"><LeaveCountUp :value="Number(v) || 0" :prefix="isMoney(k) ? '₹ ' : ''" :decimals="decimalsFor(k, v)" :compact="isMoney(k)" /></span>
                <span class="ks-lbl">{{ pretty(k) }}</span>
                <span class="ks-bar"><span class="ks-fill" :style="{ width: ready ? kpiPct(k, v) + '%' : '0%' }" /></span>
              </Motion>
            </div>

            <!-- Spectrum bar -->
            <div v-if="preview && spectrum.length" class="spectrum">
              <div class="spec-track">
                <span v-for="(s, si) in spectrum" :key="si" class="spec-seg"
                  :style="{ width: ready ? specPct(s) + '%' : '0%', background: s.color, transitionDelay: (si*90)+'ms' }" />
              </div>
              <div class="spec-legend">
                <span v-for="(s, si) in spectrum" :key="si" class="sl-item">
                  <span class="sl-dot" :style="{ background: s.color }" /> {{ s.label }} <b class="leave-mono">{{ fmtInt(s.value) }}</b>
                </span>
              </div>
            </div>

            <!-- Loading -->
            <div v-if="loading && !preview" class="load-stack">
              <div v-for="i in 6" :key="i" class="leave-skel skel-row" />
            </div>

            <!-- Empty -->
            <div v-else-if="preview && !preview.rows.length" class="leave-empty">
              <BarChart3 :size="40" :style="`color:${accent}`" />
              <div style="font-size:14px;font-weight:700;color:var(--leave-text)">No rows in this window</div>
              <div style="font-size:12px">Widen the date range or pick a different preset.</div>
            </div>

            <!-- Table -->
            <div v-else-if="preview" class="rpm-table-wrap">
              <table class="rpm-table">
                <thead>
                  <tr><th v-for="c in columns" :key="c.key">{{ c.label }}</th></tr>
                </thead>
                <tbody>
                  <Motion v-for="(r, i) in preview.rows" :key="i" as="tr"
                    :initial="{ opacity: 0, x: -10 }" :animate="{ opacity: 1, x: 0 }"
                    :transition="{ duration: 0.32, delay: Math.min(i * 0.018, 0.5), ease: [0.16, 1, 0.3, 1] }"
                  >
                    <td v-for="c in columns" :key="c.key" :class="cellClass(c.key, r[c.key])">
                      <span v-if="c.key === 'status'" class="stat-pill" :class="`s-${(r[c.key]||'').toLowerCase()}`">{{ fmtCell(c.key, r[c.key]) }}</span>
                      <template v-else>{{ fmtCell(c.key, r[c.key]) }}</template>
                    </td>
                  </Motion>
                </tbody>
              </table>
              <div v-if="preview.total_rows > preview.rows.length" class="rpm-trim">
                Showing first {{ preview.rows.length }} of {{ preview.total_rows }} rows · export for the full dataset
              </div>
            </div>
          </div>

          <!-- ════ Footer ════ -->
          <footer class="rpm-foot">
            <span v-if="preview" class="foot-cnt leave-mono">
              <b>{{ preview.total_rows }}</b> {{ preview.total_rows === 1 ? 'row' : 'rows' }} ·
              {{ filters.from }} → {{ filters.to }}
            </span>
            <div class="foot-actions">
              <button class="leave-btn leave-btn-sm" :disabled="!preview || dl.csv" @click="download('csv')"><FileText :size="13" :class="{ spin: dl.csv }" /> CSV</button>
              <button class="leave-btn leave-btn-sm" :disabled="!preview || dl.excel" @click="download('excel')"><Sheet :size="13" :class="{ spin: dl.excel }" /> Excel</button>
              <button class="leave-btn leave-btn-sm leave-btn-primary" :disabled="!preview || dl.pdf" @click="download('pdf')"><FileDown :size="13" :class="{ spin: dl.pdf }" /> PDF</button>
            </div>
          </footer>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  X, RefreshCw, FileText, Sheet, FileDown, BarChart3, CalendarRange, FileBarChart,
} from 'lucide-vue-next'
import LeaveCountUp from '../components/LeaveCountUp.vue'
import { fetchReportPreview, downloadReport } from '@/composables/useLeaves'
import { useToast } from 'vue-toastification'

const props = defineProps({
  open: { type: Boolean, default: false },
  report: { type: Object, default: null },
  window: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['close'])
const toast = useToast()

const PRESETS = [
  { key: '30d', label: '30D' }, { key: 'mtd', label: 'MTD' },
  { key: 'qtd', label: 'QTR' }, { key: 'fy', label: 'FY' },
]
const activePreset = ref('')
const iso = (d) => d.toISOString().slice(0, 10)

const filters = reactive({ from: '', to: '' })
const preview = ref(null)
const loading = ref(false)
const ready = ref(false)
const dl = reactive({ csv: false, excel: false, pdf: false })

const accent = computed(() => props.report?.accent || '#fbbf24')
const vars = computed(() => ({
  '--ra': props.report?.accent || '#fbbf24',
  '--rs': props.report?.accent_soft || '#fef3c7',
  '--rd': props.report?.accent_deep || '#78350f',
}))

const summary = computed(() => preview.value?.summary || {})

const columns = computed(() => {
  if (!preview.value?.rows?.length) return []
  return Object.keys(preview.value.rows[0]).map(k => ({
    key: k,
    label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
  }))
})

// Spectrum bar — detect a meaningful split from the summary
const MONEY_KEYS = new Set(['total_liability', 'total_amount', 'amount', 'basic_salary', 'liability_amount'])
const spectrum = computed(() => {
  const s = summary.value
  const gold = 'var(--leave-approved)', amber = 'var(--leave-pending-mgr)', ember = 'var(--leave-rejected)'
  if ('approved' in s || 'pending' in s || 'rejected' in s) return [
    { label: 'Approved', value: s.approved || 0, color: gold },
    { label: 'Pending', value: s.pending || 0, color: amber },
    { label: 'Rejected', value: s.rejected || 0, color: ember },
  ]
  if ('paid' in s && 'pending' in s) return [
    { label: 'Paid', value: s.paid || 0, color: gold },
    { label: 'Pending', value: s.pending || 0, color: amber },
  ]
  if ('total_used' in s || 'total_available' in s) return [
    { label: 'Used', value: s.total_used || 0, color: ember },
    { label: 'Available', value: s.total_available || 0, color: gold },
  ]
  if ('auto' in s || 'manual' in s) return [
    { label: 'Auto', value: s.auto || 0, color: gold },
    { label: 'Manual', value: s.manual || 0, color: amber },
    { label: 'Expired', value: s.expired || 0, color: ember },
  ]
  return []
})

const applyPreset = (key) => {
  activePreset.value = key
  const now = new Date()
  let from
  if (key === '30d') { from = new Date(); from.setDate(from.getDate() - 30) }
  else if (key === 'mtd') from = new Date(now.getFullYear(), now.getMonth(), 1)
  else if (key === 'qtd') { const q = Math.floor(now.getMonth() / 3) * 3; from = new Date(now.getFullYear(), q, 1) }
  else if (key === 'fy') { const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1; from = new Date(y, 3, 1) }
  filters.from = iso(from); filters.to = iso(now)
  reload()
}
const onCustom = () => { activePreset.value = ''; reload() }

watch(() => [props.open, props.report?.key], async () => {
  if (props.open && props.report?.key) {
    filters.from = props.window?.from || iso(new Date(Date.now() - 30 * 864e5))
    filters.to = props.window?.to || iso(new Date())
    activePreset.value = ''
    preview.value = null
    await reload()
  }
}, { immediate: true })

const reload = async () => {
  if (!props.report?.key) return
  loading.value = true; ready.value = false
  try {
    preview.value = await fetchReportPreview(props.report.key, { from: filters.from, to: filters.to, limit: 60 })
    requestAnimationFrame(() => { ready.value = true })
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Preview failed')
  } finally { loading.value = false }
}

const download = async (format) => {
  if (!props.report?.key) return
  dl[format] = true
  try {
    await downloadReport(props.report.key, { format, from: filters.from, to: filters.to })
    toast.success(`${format.toUpperCase()} · ${props.report.name} downloaded`)
  } catch (e) {
    toast.error(e?.response?.data?.detail || `${format} export failed`)
  } finally { dl[format] = false }
}

// ─── formatting ────────────────────────────────────────────────────────────
const isMoney = (k) => MONEY_KEYS.has(k)
const decimalsFor = (k, v) => {
  if (isMoney(k)) return 0
  return (typeof v === 'number' && !Number.isInteger(v)) ? 1 : 0
}
const pretty = (k) => String(k).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
const fmtInt = (v) => Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 1 })
const kpiPct = (k, v) => {
  const vals = Object.entries(summary.value).filter(([kk]) => !isMoney(kk)).map(([, vv]) => Number(vv) || 0)
  const max = Math.max(...vals, 1)
  if (isMoney(k)) return 100
  return Math.max(6, Math.min(100, (Number(v) || 0) / max * 100))
}
const specPct = (s) => {
  const total = spectrum.value.reduce((a, b) => a + (Number(b.value) || 0), 0)
  if (total <= 0) return s === spectrum.value[0] ? 100 : 0
  return Math.max(0, (Number(s.value) || 0) / total * 100)
}

const fmtCell = (key, v) => {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (typeof v === 'number') {
    if (['liability_amount', 'amount', 'basic_salary'].includes(key)) return `₹ ${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    if (key === 'utilisation_pct') return `${v}%`
    return Number.isInteger(v) ? v.toString() : v.toFixed(2).replace(/\.?0+$/, '')
  }
  // ISO date strings → friendly
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    const d = new Date(v)
    if (!isNaN(d)) return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  return String(v)
}
const cellClass = (key) => (key === 'status' ? 'is-status' : '')
</script>

<style scoped>
.rpm-scrim {
  position: fixed; inset: 0; z-index: 1200;
  display: flex; align-items: center; justify-content: center;
  padding: 28px;
  background: radial-gradient(70% 90% at 50% 0%, color-mix(in srgb, var(--ra) 26%, transparent), rgba(6,5,4,.7) 70%);
  backdrop-filter: blur(12px) saturate(135%);
}
.rpm-panel {
  position: relative; isolation: isolate;
  width: 1080px; max-width: 96vw; max-height: 92vh;
  display: flex; flex-direction: column; overflow: hidden;
  border-radius: 24px;
  border: 1px solid color-mix(in srgb, var(--ra) 40%, transparent);
  background:
    radial-gradient(120% 50% at 100% 0%, color-mix(in srgb, var(--ra) 12%, transparent), transparent 55%),
    var(--leave-surface-2);
  box-shadow: 0 40px 120px -30px rgba(0,0,0,.8);
}
[data-theme="light"] .rpm-panel {
  background: radial-gradient(120% 50% at 100% 0%, color-mix(in srgb, var(--ra) 16%, transparent), transparent 55%), rgba(255,250,240,.98);
}

/* Hero */
.rpm-hero { position: relative; overflow: hidden; padding: 22px 24px 16px; border-bottom: 1px solid color-mix(in srgb, var(--ra) 26%, transparent); }
.hero-motif { position: absolute; top: -22px; right: 18px; font-size: 150px; font-weight: 900; line-height: 1; letter-spacing: -.05em; color: color-mix(in srgb, var(--ra) 12%, transparent); pointer-events: none; }
.hero-glow { position: absolute; inset: -60% 0 auto 30%; height: 200%; width: 50%; background: radial-gradient(50% 50% at 50% 50%, color-mix(in srgb, var(--ra) 30%, transparent), transparent 70%); filter: blur(40px); z-index: 0; }
.rpm-close { position: absolute; top: 14px; right: 14px; z-index: 3; display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; background: rgba(255,255,255,.05); border: 1px solid color-mix(in srgb, var(--ra) 28%, transparent); color: var(--leave-text-secondary); cursor: pointer; transition: transform .3s, color .2s, border-color .2s; }
.rpm-close:hover { transform: rotate(90deg); color: var(--ra); border-color: var(--ra); }
.hero-row { position: relative; z-index: 1; display: flex; align-items: center; gap: 14px; padding-right: 40px; }
.hero-badge { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 16px; background: color-mix(in srgb, var(--ra) 18%, transparent); border: 1px solid color-mix(in srgb, var(--ra) 45%, transparent); color: var(--ra); flex-shrink: 0; box-shadow: 0 10px 24px -12px color-mix(in srgb, var(--ra) 70%, transparent); }
.hero-eye { display: inline-flex; align-items: center; gap: 7px; font-size: 9.5px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: var(--ra); }
.he-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--ra); box-shadow: 0 0 8px var(--ra); animation: leave-eyebrow-pulse 1.8s ease-in-out infinite; }
.hero-title { margin: 4px 0 2px; font-size: 22px; font-weight: 800; letter-spacing: -.018em; color: var(--leave-text); }
.hero-tag { margin: 0; font-size: 12px; font-style: italic; color: var(--leave-text-muted); }

.hero-controls { position: relative; z-index: 1; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-top: 16px; }
.hc-presets { display: flex; gap: 5px; }
.hc-chip { height: 28px; padding: 0 11px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 11px; font-weight: 700; background: rgba(255,255,255,.04); border: 1px solid var(--leave-border); color: var(--leave-text-secondary); transition: all .2s; }
[data-theme="light"] .hc-chip { background: rgba(255,250,235,.8); }
.hc-chip:hover { border-color: var(--ra); color: var(--ra); }
.hc-chip.active { background: color-mix(in srgb, var(--ra) 22%, transparent); border-color: var(--ra); color: var(--ra); }
.hc-dates { display: flex; align-items: center; gap: 8px; }
.hc-field { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 10px; border-radius: 8px; background: rgba(255,255,255,.04); border: 1px solid var(--leave-border); color: var(--ra); }
[data-theme="light"] .hc-field { background: rgba(255,250,235,.8); }
.hc-field input { background: transparent; border: 0; outline: 0; color: var(--leave-text); font: inherit; font-size: 12px; }
.hc-field input::-webkit-calendar-picker-indicator { filter: invert(.6) sepia(1) saturate(4) hue-rotate(5deg); cursor: pointer; }
.hc-arrow { color: var(--leave-text-muted); }

/* Body */
.rpm-body { padding: 18px 24px; overflow-y: auto; flex: 1; }
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-bottom: 14px; }
.kpi-stat { display: flex; flex-direction: column; gap: 4px; padding: 12px 14px; border-radius: 14px; background: color-mix(in srgb, var(--ra) 9%, transparent); border: 1px solid color-mix(in srgb, var(--ra) 24%, transparent); }
.ks-val { font-size: 22px; font-weight: 800; letter-spacing: -.02em; color: var(--ra); font-variant-numeric: tabular-nums; }
.ks-lbl { font-size: 8.5px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--leave-text-muted); }
.ks-bar { height: 3px; border-radius: 2px; background: color-mix(in srgb, var(--ra) 14%, transparent); overflow: hidden; }
.ks-fill { display: block; height: 100%; border-radius: 2px; background: linear-gradient(90deg, color-mix(in srgb, var(--ra) 70%, #fde047), var(--ra)); transition: width .9s cubic-bezier(.16,1,.3,1); }

.spectrum { margin-bottom: 16px; }
.spec-track { display: flex; gap: 3px; height: 12px; border-radius: 7px; overflow: hidden; background: rgba(251,191,36,.08); border: 1px solid var(--leave-border-soft); }
.spec-seg { height: 100%; border-radius: 3px; transition: width .9s cubic-bezier(.16,1,.3,1); }
.spec-legend { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 8px; }
.sl-item { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--leave-text-secondary); }
.sl-dot { width: 8px; height: 8px; border-radius: 3px; }
.sl-item b { color: var(--leave-text); }

.load-stack { display: flex; flex-direction: column; gap: 6px; }
.skel-row { height: 38px; border-radius: 9px; }

.rpm-table-wrap { border-radius: 14px; border: 1px solid var(--leave-border); overflow: auto; }
[data-theme="light"] .rpm-table-wrap { border-color: var(--leave-border); }
.rpm-table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
.rpm-table thead th {
  position: sticky; top: 0; z-index: 1;
  background: color-mix(in srgb, var(--ra) 20%, var(--leave-surface-3));
  color: var(--ra); font-weight: 800; text-align: left; white-space: nowrap;
  padding: 9px 11px; font-size: 9.5px; letter-spacing: .1em; text-transform: uppercase;
  border-bottom: 1px solid color-mix(in srgb, var(--ra) 32%, transparent);
}
.rpm-table tbody td { padding: 8px 11px; border-bottom: 1px solid var(--leave-border-soft); color: var(--leave-text); white-space: nowrap; max-width: 260px; overflow: hidden; text-overflow: ellipsis; }
.rpm-table tbody tr:hover td { background: color-mix(in srgb, var(--ra) 8%, transparent); }
.rpm-table tbody tr:nth-child(even) td { background: rgba(255,255,255,.02); }
[data-theme="light"] .rpm-table tbody tr:nth-child(even) td { background: rgba(255,250,235,.5); }

.stat-pill { display: inline-block; padding: 2px 9px; border-radius: 999px; font-size: 9.5px; font-weight: 800; letter-spacing: .04em; background: var(--leave-cancelled-soft); color: var(--leave-cancelled); }
.stat-pill.s-approved { background: var(--leave-approved-soft); color: var(--leave-approved); }
.stat-pill.s-paid { background: var(--leave-approved-soft); color: var(--leave-approved); }
.stat-pill.s-pending_manager, .stat-pill.s-pending_hr, .stat-pill.s-pending { background: var(--leave-pending-mgr-soft); color: var(--leave-pending-mgr); }
.stat-pill.s-rejected, .stat-pill.s-manager_rejected { background: var(--leave-rejected-soft); color: var(--leave-rejected); }
.is-status { font-weight: 700; }

.rpm-trim { margin-top: 8px; padding: 8px 12px; border-radius: 9px; background: rgba(255,255,255,.03); font-size: 11px; color: var(--leave-text-muted); text-align: center; }
[data-theme="light"] .rpm-trim { background: rgba(255,250,235,.55); }

/* Footer */
.rpm-foot { display: flex; align-items: center; gap: 10px; padding: 12px 20px; border-top: 1px solid color-mix(in srgb, var(--ra) 22%, transparent); background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--ra) 6%, transparent)); }
.foot-cnt { font-size: 11px; color: var(--leave-text-muted); }
.foot-cnt b { color: var(--leave-text); }
.foot-actions { display: flex; gap: 8px; margin-left: auto; }
.spin { animation: leave-orb-spin 1s linear infinite; }

/* Transitions */
.rpm-enter-active, .rpm-leave-active { transition: opacity .32s ease; }
.rpm-enter-from, .rpm-leave-to { opacity: 0; }
.rpm-enter-active .rpm-panel, .rpm-leave-active .rpm-panel { transition: transform .4s cubic-bezier(.16,1,.3,1), opacity .4s; }
.rpm-enter-from .rpm-panel, .rpm-leave-to .rpm-panel { transform: translateY(24px) scale(.94); opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .he-dot, .spin { animation: none !important; }
  .ks-fill, .spec-seg { transition: none !important; }
}
</style>
