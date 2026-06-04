<template>
  <div class="leave-section reports-studio" :class="{ ready }">
    <!-- ═══════════════ CONTROL DECK ═══════════════ -->
    <Motion as="header" class="rs-deck"
      :initial="{ opacity: 0, y: -16 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }"
    >
      <div class="deck-atm" aria-hidden="true">
        <span class="deck-orb o1" /><span class="deck-orb o2" />
        <span class="deck-grid" />
        <svg class="deck-wave" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0 70 Q 200 20 420 60 T 820 50 T 1200 64" fill="none" stroke="url(#rsWave)" stroke-width="1.3" />
          <defs>
            <linearGradient id="rsWave" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#fde047" stop-opacity="0" />
              <stop offset="50%" stop-color="#fbbf24" stop-opacity=".7" />
              <stop offset="100%" stop-color="#ea580c" stop-opacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div class="deck-row">
        <div class="deck-copy">
          <span class="deck-eye leave-mono">
            <span class="eye-orb"><span class="eo-ring" /><span class="eo-core" /></span>
            Reports Studio · Phase 3
          </span>
          <h2 class="deck-title">Leave&nbsp;<em>Intelligence</em>&nbsp;Atelier</h2>
          <p class="deck-sub">
            Six purpose-built instruments — register, departmental footprint, balance snapshot,
            payroll liability, comp-off ledger &amp; encashment voucher. Tune the window, watch the
            numbers re-cast live, then cast a <b>CSV</b>, branded <b>Excel</b> or magazine <b>PDF</b>.
          </p>
        </div>

        <!-- Live aggregate ring -->
        <Motion class="deck-gauge" as="div"
          :initial="{ opacity: 0, scale: 0.8, rotate: -10 }"
          :animate="{ opacity: 1, scale: 1, rotate: 0 }"
          :transition="{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }"
        >
          <svg viewBox="0 0 132 132" class="gauge-svg">
            <circle cx="66" cy="66" r="56" class="gauge-track" />
            <circle cx="66" cy="66" r="56" class="gauge-fill"
              :stroke-dasharray="gaugeCirc"
              :stroke-dashoffset="gaugeOffset" />
            <circle cx="66" cy="66" r="42" class="gauge-track inner" />
          </svg>
          <div class="gauge-mid">
            <span class="gm-eye leave-mono">APPROVED</span>
            <span class="gm-num"><LeaveCountUp :value="approvalRate" :suffix="'%'" /></span>
            <span class="gm-lbl">of window</span>
          </div>
        </Motion>
      </div>

      <!-- Window + presets + aggregate chips -->
      <div class="deck-controls">
        <div class="win-presets">
          <button v-for="p in PRESETS" :key="p.key"
            class="win-chip" :class="{ active: activePreset === p.key }"
            @click="applyPreset(p.key)">{{ p.label }}</button>
        </div>
        <div class="win-dates">
          <label class="win-field">
            <CalendarRange :size="13" />
            <input type="date" v-model="range.from" @change="onCustomDate" :max="range.to" />
          </label>
          <span class="win-arrow">→</span>
          <label class="win-field">
            <input type="date" v-model="range.to" @change="onCustomDate" :min="range.from" />
          </label>
          <button class="leave-btn leave-btn-sm" @click="reloadAll" :disabled="anyLoading">
            <RefreshCw :size="13" :class="{ spin: anyLoading }" /> Recast
          </button>
        </div>

        <div class="agg-ribbon">
          <div v-for="a in aggregates" :key="a.label" class="agg-pill">
            <span class="agg-ico"><component :is="a.icon" :size="13" /></span>
            <div class="agg-body">
              <span class="agg-val"><LeaveCountUp :value="a.value" :prefix="a.prefix || ''" :decimals="a.decimals || 0" :compact="!!a.compact" /></span>
              <span class="agg-lbl">{{ a.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </Motion>

    <!-- ═══════════════ BENTO STUDIO ═══════════════ -->
    <div v-if="loadingIndex && !cards.length" class="rs-bento">
      <div v-for="i in 6" :key="i" class="leave-skel" :class="i === 1 ? 'skel-feature' : 'skel-card'" />
    </div>

    <div v-else-if="!cards.length" class="leave-empty">
      <BarChart3 :size="42" style="color: var(--leave-approved)" />
      <div style="font-size:14px;font-weight:700;color:var(--leave-text)">No report generators registered</div>
    </div>

    <div v-else class="rs-bento">
      <Motion v-for="(c, i) in cards" :key="c.key" as="article"
        class="rs-card" :class="[`span-${c.span}`, { feature: c.feature, busy: c.loading }]"
        :style="cardVars(c)"
        :initial="{ opacity: 0, y: 26, rotateX: -7 }"
        :animate="{ opacity: 1, y: 0, rotateX: 0 }"
        :transition="{ duration: 0.6, delay: Math.min(i * 0.08, 0.5), ease: [0.16, 1, 0.3, 1] }"
        @mousemove="tilt($event)"
        @mouseleave="untilt($event)"
        @click="openPreview(c)"
      >
        <span class="card-glare" aria-hidden="true" />
        <span class="card-glow" aria-hidden="true" />
        <span class="card-motif" aria-hidden="true">{{ c.icon }}</span>
        <span class="card-sweep" aria-hidden="true" />

        <div class="card-inner">
          <!-- Header -->
          <header class="card-head">
            <span class="card-badge"><component :is="c.lucide" :size="15" /></span>
            <div class="card-headtext">
              <span class="card-tag leave-mono">{{ c.motif.toUpperCase() }}</span>
              <h3 class="card-name">{{ c.name }}</h3>
            </div>
          </header>

          <p class="card-tagline">{{ c.tagline }}</p>

          <!-- Hero KPI -->
          <div class="card-hero">
            <div class="hero-num">
              <span v-if="c.loading" class="hero-skel" />
              <template v-else>
                <LeaveCountUp class="hn-val" :value="c.viz.hero.value"
                  :prefix="c.viz.hero.prefix || ''" :decimals="c.viz.hero.decimals || 0"
                  :compact="!!c.viz.hero.compact" />
              </template>
            </div>
            <span class="hero-lbl">{{ c.viz.hero.label }}</span>
          </div>

          <!-- Animated spectrum bar -->
          <div class="card-bar" :title="c.viz.segs.map(s => `${s.label}: ${s.value}`).join(' · ')">
            <span v-for="(s, si) in c.viz.segs" :key="si" class="bar-seg"
              :style="{ width: ready && !c.loading ? segPct(c.viz.segs, s) + '%' : '0%', background: s.color, transitionDelay: (si * 90) + 'ms' }" />
          </div>
          <div class="card-legend">
            <span v-for="(s, si) in c.viz.segs" :key="si" class="lg-item">
              <span class="lg-dot" :style="{ background: s.color }" />{{ s.label }}
              <b class="leave-mono">{{ fmtInt(s.value) }}</b>
            </span>
          </div>

          <!-- Sub chips -->
          <div class="card-chips">
            <div v-for="ch in c.viz.chips" :key="ch.label" class="mini-chip" :data-tone="ch.tone || ''">
              <span class="mc-val"><LeaveCountUp :value="ch.value" :prefix="ch.prefix || ''" :decimals="ch.decimals || 0" :compact="!!ch.compact" /></span>
              <span class="mc-lbl">{{ ch.label }}</span>
            </div>
          </div>

          <!-- Footer -->
          <footer class="card-foot">
            <button class="cf-btn primary" @click.stop="openPreview(c)">
              <Eye :size="13" /> Preview
            </button>
            <div class="cf-exports">
              <button class="cf-btn" :disabled="isBusy(c.key,'csv')" @click.stop="quickExport(c, 'csv')" title="CSV">
                <FileText :size="13" :class="{ spin: isBusy(c.key,'csv') }" /> CSV
              </button>
              <button class="cf-btn" :disabled="isBusy(c.key,'excel')" @click.stop="quickExport(c, 'excel')" title="Excel">
                <Sheet :size="13" :class="{ spin: isBusy(c.key,'excel') }" /> XLSX
              </button>
              <button class="cf-btn" :disabled="isBusy(c.key,'pdf')" @click.stop="quickExport(c, 'pdf')" title="PDF">
                <FileDown :size="13" :class="{ spin: isBusy(c.key,'pdf') }" /> PDF
              </button>
            </div>
          </footer>
        </div>
      </Motion>
    </div>

    <LeaveReportPreviewModal
      :open="modal.open"
      :report="modal.report"
      :window="range"
      @close="modal.open = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { Motion } from 'motion-v'
import {
  RefreshCw, BarChart3, Eye, FileText, Sheet, FileDown, CalendarRange,
  ScrollText, Building2, Scale, IndianRupee, Coffee, Wallet, Users, CalendarDays, Layers,
} from 'lucide-vue-next'
import LeaveCountUp from '../components/LeaveCountUp.vue'
import LeaveReportPreviewModal from '../modals/LeaveReportPreviewModal.vue'
import { fetchReportIndex, fetchReportPreview, downloadReport } from '@/composables/useLeaves'
import { useToast } from 'vue-toastification'

const toast = useToast()
const reduced = typeof window !== 'undefined' && window.matchMedia
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ─── Date window ───────────────────────────────────────────────────────────
const iso = (d) => d.toISOString().slice(0, 10)
const today = new Date()
const shift = (days) => { const d = new Date(); d.setDate(d.getDate() - days); return d }

const PRESETS = [
  { key: '30d', label: '30 days' },
  { key: 'mtd', label: 'This month' },
  { key: 'qtd', label: 'Quarter' },
  { key: 'fy',  label: 'Fiscal yr' },
  { key: '1y',  label: '12 months' },
]
const activePreset = ref('30d')
const range = reactive({ from: iso(shift(30)), to: iso(today) })

const applyPreset = (key) => {
  activePreset.value = key
  const now = new Date()
  let from
  if (key === '30d') from = shift(30)
  else if (key === 'mtd') from = new Date(now.getFullYear(), now.getMonth(), 1)
  else if (key === 'qtd') { const q = Math.floor(now.getMonth() / 3) * 3; from = new Date(now.getFullYear(), q, 1) }
  else if (key === 'fy') { const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1; from = new Date(y, 3, 1) }
  else if (key === '1y') { from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()) }
  range.from = iso(from); range.to = iso(now)
  reloadSummaries()
}
const onCustomDate = () => { activePreset.value = ''; reloadSummaries() }

// ─── Per-report enrichment (lucide icon, span, viz builder) ──────────────────
const ENRICH = {
  leave_register:    { lucide: ScrollText, span: 12, feature: true },
  department_leaves: { lucide: Building2,  span: 6 },
  balance_report:    { lucide: Scale,      span: 6 },
  liability_report:  { lucide: IndianRupee,span: 4 },
  comp_off_report:   { lucide: Coffee,     span: 4 },
  encashment_report: { lucide: Wallet,     span: 4 },
}

const buildViz = (key, s) => {
  s = s || {}
  const gold = 'var(--leave-approved)', amber = 'var(--leave-pending-mgr)', ember = 'var(--leave-rejected)', orange = 'var(--leave-withdrawn)'
  if (key === 'leave_register') return {
    hero: { value: s.days_total || 0, label: 'leave-days in window', decimals: 1 },
    segs: [
      { label: 'Approved', value: s.approved || 0, color: gold },
      { label: 'Pending', value: s.pending || 0, color: amber },
      { label: 'Rejected', value: s.rejected || 0, color: ember },
    ],
    chips: [
      { label: 'Requests', value: s.rows || 0 },
      { label: 'Employees', value: s.employees || 0 },
    ],
  }
  if (key === 'department_leaves') return {
    hero: { value: s.days_total || 0, label: 'approved days', decimals: 1 },
    segs: [
      { label: 'Teams', value: s.departments || 0, color: gold },
      { label: 'People', value: s.employees || 0, color: amber },
    ],
    chips: [
      { label: 'Departments', value: s.departments || 0 },
      { label: 'Rows', value: s.rows || 0 },
    ],
  }
  if (key === 'balance_report') return {
    hero: { value: s.total_available || 0, label: 'days available', decimals: 1 },
    segs: [
      { label: 'Used', value: s.total_used || 0, color: ember },
      { label: 'Available', value: s.total_available || 0, color: gold },
    ],
    chips: [
      { label: 'Quota', value: s.total_quota || 0, decimals: 0 },
      { label: 'Employees', value: s.employees || 0 },
    ],
  }
  if (key === 'liability_report') return {
    hero: { value: s.total_liability || 0, label: 'payroll exposure', prefix: '₹ ', compact: true },
    segs: [
      { label: 'Exposure', value: Math.max(1, s.total_liability || 0), color: ember },
    ],
    chips: [
      { label: 'Days at risk', value: s.total_days || 0, decimals: 1 },
      { label: 'Employees', value: s.employees || 0 },
    ],
  }
  if (key === 'comp_off_report') return {
    hero: { value: s.total_days || 0, label: 'comp-off days', decimals: 1 },
    segs: [
      { label: 'Auto', value: s.auto || 0, color: gold },
      { label: 'Manual', value: s.manual || 0, color: amber },
      { label: 'Expired', value: s.expired || 0, color: ember },
    ],
    chips: [
      { label: 'Grants', value: s.rows || 0 },
      { label: 'Expired', value: s.expired || 0, tone: 'danger' },
    ],
  }
  if (key === 'encashment_report') return {
    hero: { value: s.total_amount || 0, label: 'cashed out', prefix: '₹ ', compact: true },
    segs: [
      { label: 'Paid', value: s.paid || 0, color: gold },
      { label: 'Pending', value: s.pending || 0, color: amber },
    ],
    chips: [
      { label: 'Days', value: s.total_days || 0, decimals: 1 },
      { label: 'Vouchers', value: s.rows || 0 },
    ],
  }
  return { hero: { value: s.rows || 0, label: 'rows' }, segs: [{ label: 'Rows', value: s.rows || 0, color: gold }], chips: [] }
}

// ─── State ───────────────────────────────────────────────────────────────
const cards = ref([])
const loadingIndex = ref(false)
const ready = ref(false)
const busy = reactive({})           // `${key}:${format}` → bool
const modal = reactive({ open: false, report: null })

const anyLoading = computed(() => cards.value.some(c => c.loading))

// Aggregate ribbon across all cards' summaries
const sumOf = (key, field) => {
  const c = cards.value.find(x => x.key === key)
  return Number(c?.summary?.[field] || 0)
}
const aggregates = computed(() => ([
  { label: 'Leave days', value: sumOf('leave_register', 'days_total'), decimals: 1, icon: CalendarDays },
  { label: 'Requests', value: sumOf('leave_register', 'rows'), icon: Layers },
  { label: 'Employees', value: sumOf('leave_register', 'employees'), icon: Users },
  { label: 'Liability', value: sumOf('liability_report', 'total_liability'), prefix: '₹ ', compact: true, icon: IndianRupee },
]))

// Approval-rate gauge from register summary
const approvalRate = computed(() => {
  const a = sumOf('leave_register', 'approved')
  const r = sumOf('leave_register', 'rejected')
  const p = sumOf('leave_register', 'pending')
  const denom = a + r + p
  return denom ? Math.round((a / denom) * 100) : 0
})
const gaugeCirc = 2 * Math.PI * 56
const gaugeOffset = computed(() => gaugeCirc - (approvalRate.value / 100) * gaugeCirc)

// ─── Fetching ──────────────────────────────────────────────────────────────
const loadIndex = async () => {
  loadingIndex.value = true
  try {
    const data = await fetchReportIndex()
    cards.value = (data.items || []).map(r => {
      const e = ENRICH[r.key] || { lucide: BarChart3, span: 4 }
      return {
        ...r, ...e,
        loading: true,
        summary: null,
        viz: buildViz(r.key, {}),
      }
    })
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load report index')
  } finally { loadingIndex.value = false }
}

const reloadSummaries = async () => {
  if (!cards.value.length) return
  cards.value.forEach(c => { c.loading = true })
  ready.value = false
  await Promise.all(cards.value.map(async (c) => {
    try {
      const p = await fetchReportPreview(c.key, { from: range.from, to: range.to, limit: 1 })
      c.summary = p.summary || {}
      c.viz = buildViz(c.key, c.summary)
    } catch {
      c.summary = {}; c.viz = buildViz(c.key, {})
    } finally { c.loading = false }
  }))
  await nextTick()
  // let the bars animate from 0
  requestAnimationFrame(() => { ready.value = true })
}

const reloadAll = async () => { await loadIndex(); await reloadSummaries() }

// ─── Tilt (Blender-ish 3D pointer parallax) ──────────────────────────────────
const tilt = (e) => {
  if (reduced) return
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  const px = (e.clientX - r.left) / r.width
  const py = (e.clientY - r.top) / r.height
  el.style.setProperty('--rx', `${(py - 0.5) * -7}deg`)
  el.style.setProperty('--ry', `${(px - 0.5) * 9}deg`)
  el.style.setProperty('--gx', `${px * 100}%`)
  el.style.setProperty('--gy', `${py * 100}%`)
}
const untilt = (e) => {
  const el = e.currentTarget
  el.style.setProperty('--rx', '0deg')
  el.style.setProperty('--ry', '0deg')
}
const cardVars = (c) => ({ '--ra': c.accent, '--rs': c.accent_soft, '--rd': c.accent_deep })

// ─── Helpers ─────────────────────────────────────────────────────────────
const segPct = (segs, s) => {
  const total = segs.reduce((a, b) => a + (Number(b.value) || 0), 0)
  if (total <= 0) return s === segs[0] ? 100 : 0
  return Math.max(0, (Number(s.value) || 0) / total * 100)
}
const fmtInt = (v) => Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 1 })
const isBusy = (key, fmt) => !!busy[`${key}:${fmt}`]

const openPreview = (c) => { modal.report = c; modal.open = true }

const quickExport = async (c, format) => {
  const k = `${c.key}:${format}`
  busy[k] = true
  try {
    await downloadReport(c.key, { format, from: range.from, to: range.to })
    toast.success(`${format.toUpperCase()} · ${c.name} downloaded`)
  } catch (e) {
    toast.error(e?.response?.data?.detail || `${format} export failed`)
  } finally { busy[k] = false }
}

onMounted(reloadAll)
</script>

<style scoped>
.reports-studio { display: flex; flex-direction: column; gap: 18px; }

/* ════════════════ CONTROL DECK ════════════════ */
.rs-deck {
  position: relative; overflow: hidden; isolation: isolate;
  padding: 24px 26px 20px;
  border-radius: 24px;
  border: 1px solid var(--leave-border);
  background:
    radial-gradient(80% 120% at 0% 0%, rgba(251,191,36,0.16), transparent 60%),
    radial-gradient(60% 120% at 100% 100%, rgba(234,88,12,0.16), transparent 60%),
    linear-gradient(135deg, #0c0703, #150a04 55%, #100805);
}
[data-theme="light"] .rs-deck {
  background:
    radial-gradient(80% 120% at 0% 0%, rgba(251,191,36,0.28), transparent 60%),
    radial-gradient(60% 120% at 100% 100%, rgba(234,88,12,0.16), transparent 60%),
    linear-gradient(135deg, #fffdf5, #fff4e0);
}
.deck-atm { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
.deck-orb { position: absolute; border-radius: 50%; filter: blur(60px); }
.deck-orb.o1 { width: 320px; height: 320px; top: -130px; left: -80px; background: radial-gradient(circle, rgba(251,191,36,.5), transparent 65%); animation: leave-glow-breathe 9s ease-in-out infinite; }
.deck-orb.o2 { width: 280px; height: 280px; bottom: -120px; right: -60px; background: radial-gradient(circle, rgba(234,88,12,.45), transparent 65%); animation: leave-glow-breathe 11s ease-in-out infinite reverse; }
.deck-grid { position: absolute; inset: 0; background-image: radial-gradient(var(--leave-grid-line, rgba(251,191,36,.14)) 1px, transparent 1px); background-size: 24px 24px; mask-image: linear-gradient(180deg, rgba(0,0,0,.5), transparent 70%); opacity: .5; }
.deck-wave { position: absolute; inset: auto 0 0 0; width: 100%; height: 120px; opacity: .55; }
.deck-wave path { stroke-dasharray: 7 11; animation: mesh-flow 24s linear infinite; }
@keyframes mesh-flow { to { stroke-dashoffset: -220; } }

.deck-row { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.deck-copy { min-width: 0; }
.deck-eye {
  display: inline-flex; align-items: center; gap: 9px;
  font-size: 10px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase;
  color: var(--w-gold-200); padding: 5px 11px; border-radius: 999px;
  background: rgba(251,191,36,.10); border: 1px solid rgba(251,191,36,.32);
}
[data-theme="light"] .deck-eye { color: var(--w-gold-700); background: rgba(251,191,36,.2); border-color: rgba(217,119,6,.34); }
.eye-orb { position: relative; width: 11px; height: 11px; }
.eo-ring { position: absolute; inset: 0; border-radius: 50%; border: 1.5px solid var(--w-gold-300); animation: leave-orb-spin 2.8s linear infinite; }
.eo-core { position: absolute; inset: 3px; border-radius: 50%; background: var(--w-gold-300); box-shadow: 0 0 10px var(--w-gold-300); animation: leave-eyebrow-pulse 1.8s ease-in-out infinite; }
.deck-title {
  margin: 12px 0 6px; font-size: clamp(26px, 3.4vw, 40px); font-weight: 800;
  letter-spacing: -.028em; line-height: 1; color: #fff8dc;
}
[data-theme="light"] .deck-title { color: #2a1100; }
.deck-title em {
  font-style: italic;
  background: linear-gradient(135deg, #fde047, #fbbf24 55%, #ea580c);
  background-clip: text; -webkit-background-clip: text; color: transparent;
}
.deck-sub { margin: 0; max-width: 70ch; font-size: 12.5px; line-height: 1.6; color: var(--leave-text-secondary); }
.deck-sub b { color: var(--leave-text); }

/* Aggregate ring */
.deck-gauge { position: relative; flex-shrink: 0; width: 132px; height: 132px; }
.gauge-svg { width: 132px; height: 132px; transform: rotate(-90deg); }
.gauge-track { fill: none; stroke: rgba(251,191,36,.12); stroke-width: 7; }
.gauge-track.inner { stroke-width: 1; stroke-dasharray: 2 5; stroke: rgba(234,88,12,.3); }
.gauge-fill { fill: none; stroke: url(#rsWave); stroke: #fbbf24; stroke-width: 7; stroke-linecap: round; transition: stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1); filter: drop-shadow(0 0 6px rgba(251,191,36,.6)); }
.gauge-mid { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; }
.gm-eye { font-size: 7.5px; font-weight: 800; letter-spacing: .18em; color: var(--w-gold-200); }
[data-theme="light"] .gm-eye { color: var(--w-gold-700); }
.gm-num { font-size: 26px; font-weight: 800; letter-spacing: -.02em; background: linear-gradient(135deg, #fde047, #fbbf24 60%, #ea580c); background-clip: text; -webkit-background-clip: text; color: transparent; }
.gm-lbl { font-size: 8.5px; color: var(--leave-text-muted); letter-spacing: .04em; }

/* Controls */
.deck-controls { position: relative; z-index: 1; display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 18px; }
.win-presets { display: flex; gap: 6px; flex-wrap: wrap; }
.win-chip {
  height: 30px; padding: 0 13px; border-radius: 999px; cursor: pointer;
  font: inherit; font-size: 11.5px; font-weight: 700;
  background: rgba(255,255,255,.04); border: 1px solid var(--leave-border);
  color: var(--leave-text-secondary); transition: all .2s var(--leave-ease);
}
[data-theme="light"] .win-chip { background: rgba(255,250,235,.8); border-color: var(--leave-border); }
.win-chip:hover { border-color: var(--leave-border-strong); color: var(--leave-text); transform: translateY(-1px); }
.win-chip.active { background: var(--leave-grad-cta); border-color: transparent; color: #2a1100; box-shadow: 0 6px 16px -8px rgba(251,191,36,.7); }

.win-dates { display: flex; align-items: center; gap: 8px; }
.win-field { display: inline-flex; align-items: center; gap: 7px; height: 30px; padding: 0 10px; border-radius: 8px; background: rgba(255,255,255,.04); border: 1px solid var(--leave-border); color: var(--w-gold-200); }
[data-theme="light"] .win-field { background: rgba(255,250,235,.8); color: var(--w-gold-600); }
.win-field input { background: transparent; border: 0; outline: 0; color: var(--leave-text); font: inherit; font-size: 12px; }
.win-field input::-webkit-calendar-picker-indicator { filter: invert(.6) sepia(1) saturate(4) hue-rotate(5deg); cursor: pointer; }
.win-arrow { color: var(--leave-text-muted); font-size: 13px; }

.agg-ribbon { display: flex; gap: 8px; margin-left: auto; flex-wrap: wrap; }
.agg-pill { display: flex; align-items: center; gap: 9px; padding: 7px 13px; border-radius: 12px; background: rgba(20,14,8,.5); border: 1px solid var(--leave-border); backdrop-filter: blur(8px); }
[data-theme="light"] .agg-pill { background: rgba(255,250,235,.85); }
.agg-ico { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; background: rgba(251,191,36,.14); border: 1px solid rgba(251,191,36,.3); color: var(--w-gold-200); }
[data-theme="light"] .agg-ico { color: var(--w-gold-600); }
.agg-body { display: flex; flex-direction: column; line-height: 1.1; }
.agg-val { font-size: 16px; font-weight: 800; letter-spacing: -.02em; color: var(--leave-text); font-variant-numeric: tabular-nums; }
.agg-lbl { font-size: 8.5px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--leave-text-muted); }

/* ════════════════ BENTO ════════════════ */
.rs-bento { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px; }
.skel-feature { grid-column: span 12; height: 200px; border-radius: 22px; }
.skel-card { grid-column: span 4; height: 290px; border-radius: 22px; }
@media (max-width: 980px) { .skel-card { grid-column: span 6; } }

.span-12 { grid-column: span 12; }
.span-6  { grid-column: span 6; }
.span-4  { grid-column: span 4; }
@media (max-width: 1100px) { .span-4 { grid-column: span 6; } }
@media (max-width: 760px) { .span-6, .span-4, .span-12 { grid-column: span 12; } }

.rs-card {
  position: relative; isolation: isolate; cursor: pointer; overflow: hidden;
  border-radius: 22px;
  padding: 1px; /* gradient ring */
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--ra) 38%, transparent), color-mix(in srgb, var(--ra) 10%, transparent));
  transform-style: preserve-3d;
  transform: perspective(1000px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
  transition: transform .35s var(--leave-ease), box-shadow .35s var(--leave-ease);
}
.rs-card:hover { box-shadow: 0 30px 70px -34px color-mix(in srgb, var(--ra) 70%, transparent); z-index: 3; }
.card-inner {
  position: relative; z-index: 2; height: 100%;
  display: flex; flex-direction: column; gap: 9px;
  padding: 18px 18px 15px; border-radius: 21px;
  background: linear-gradient(180deg, var(--leave-surface-2), color-mix(in srgb, var(--ra) 7%, var(--leave-surface-2)));
}
[data-theme="light"] .card-inner {
  background: linear-gradient(180deg, rgba(255,250,240,.96), color-mix(in srgb, var(--ra) 9%, rgba(255,250,240,.96)));
}
.card-glow { position: absolute; inset: -40% 0 auto -10%; height: 160%; width: 60%; z-index: 0; background: radial-gradient(50% 50% at 50% 50%, color-mix(in srgb, var(--ra) 34%, transparent), transparent 70%); filter: blur(34px); opacity: .8; }
.card-motif {
  position: absolute; z-index: 1; top: 6px; right: 14px;
  font-size: 92px; font-weight: 900; line-height: 1; letter-spacing: -.05em;
  color: color-mix(in srgb, var(--ra) 16%, transparent);
  text-shadow: 0 6px 24px color-mix(in srgb, var(--ra) 22%, transparent);
  transform: translateZ(18px); pointer-events: none;
}
.card-glare {
  position: absolute; inset: 0; z-index: 4; border-radius: 21px; pointer-events: none; opacity: 0;
  background: radial-gradient(360px 360px at var(--gx, 50%) var(--gy, 0%), rgba(255,255,255,.16), transparent 60%);
  transition: opacity .3s;
}
.rs-card:hover .card-glare { opacity: 1; }
.card-sweep { position: absolute; inset: 0; z-index: 5; pointer-events: none; background: linear-gradient(110deg, transparent 0%, rgba(255,255,255,.1) 50%, transparent 100%); transform: translateX(-110%); }
.rs-card:hover .card-sweep { animation: leave-ember-sweep 1s ease-out; }

.card-head { display: flex; align-items: center; gap: 11px; }
.card-badge {
  display: grid; place-items: center; width: 40px; height: 40px; border-radius: 13px;
  background: color-mix(in srgb, var(--ra) 18%, transparent);
  border: 1px solid color-mix(in srgb, var(--ra) 45%, transparent);
  color: var(--ra); flex-shrink: 0; transform: translateZ(26px);
  box-shadow: 0 8px 18px -10px color-mix(in srgb, var(--ra) 70%, transparent);
}
.card-headtext { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.card-tag { font-size: 8.5px; font-weight: 800; letter-spacing: .2em; color: var(--ra); opacity: .85; }
.card-name { margin: 0; font-size: 17px; font-weight: 800; letter-spacing: -.014em; color: var(--leave-text); }
.card-tagline { margin: 0; font-size: 11.5px; font-style: italic; color: var(--rd); opacity: .8; }
[data-theme="light"] .card-tagline { color: var(--rd); opacity: .9; }

.card-hero { display: flex; align-items: baseline; gap: 9px; margin-top: 2px; transform: translateZ(14px); }
.hero-num { font-size: 38px; font-weight: 800; line-height: 1; letter-spacing: -.03em; }
.hn-val { background: linear-gradient(135deg, color-mix(in srgb, var(--ra) 80%, #fff8dc), var(--ra) 60%, var(--rd)); background-clip: text; -webkit-background-clip: text; color: transparent; font-variant-numeric: tabular-nums; }
.hero-skel { display: inline-block; width: 90px; height: 32px; border-radius: 8px; background: linear-gradient(90deg, rgba(251,191,36,.08), rgba(251,191,36,.18), rgba(251,191,36,.08)); background-size: 200% 100%; animation: leave-shimmer 1.3s linear infinite; }
.hero-lbl { font-size: 11px; font-weight: 700; letter-spacing: .02em; color: var(--leave-text-muted); }

.card-bar { display: flex; gap: 3px; height: 9px; border-radius: 6px; overflow: hidden; margin-top: 4px; background: rgba(251,191,36,.08); border: 1px solid var(--leave-border-soft); }
.bar-seg { height: 100%; border-radius: 3px; min-width: 0; transition: width .9s cubic-bezier(.16,1,.3,1); }
.card-legend { display: flex; flex-wrap: wrap; gap: 10px; }
.lg-item { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; color: var(--leave-text-secondary); }
.lg-dot { width: 7px; height: 7px; border-radius: 2px; }
.lg-item b { color: var(--leave-text); font-size: 10.5px; }

.card-chips { display: flex; gap: 9px; margin-top: auto; }
.mini-chip {
  flex: 1; display: flex; flex-direction: column; gap: 1px;
  padding: 9px 11px; border-radius: 12px;
  background: color-mix(in srgb, var(--ra) 9%, transparent);
  border: 1px solid color-mix(in srgb, var(--ra) 24%, transparent);
}
.mini-chip[data-tone="danger"] { background: var(--leave-rejected-soft); border-color: color-mix(in srgb, var(--leave-rejected) 34%, transparent); }
.mc-val { font-size: 18px; font-weight: 800; letter-spacing: -.02em; color: var(--leave-text); font-variant-numeric: tabular-nums; }
.mini-chip[data-tone="danger"] .mc-val { color: var(--leave-rejected); }
.mc-lbl { font-size: 8.5px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--leave-text-muted); }

.card-foot { display: flex; align-items: center; gap: 7px; margin-top: 2px; flex-wrap: wrap; }
.cf-exports { display: flex; gap: 6px; margin-left: auto; }
.cf-btn {
  display: inline-flex; align-items: center; gap: 5px; height: 30px; padding: 0 11px;
  border-radius: 9px; font: inherit; font-size: 11px; font-weight: 700; cursor: pointer;
  background: rgba(255,255,255,.04); border: 1px solid var(--leave-border); color: var(--leave-text-secondary);
  transition: all .2s var(--leave-ease);
}
[data-theme="light"] .cf-btn { background: rgba(255,250,240,.85); }
.cf-btn:hover:not(:disabled) { border-color: var(--ra); color: var(--ra); transform: translateY(-1px); background: color-mix(in srgb, var(--ra) 12%, transparent); }
.cf-btn:disabled { opacity: .55; cursor: wait; }
.cf-btn.primary { background: color-mix(in srgb, var(--ra) 20%, transparent); border-color: color-mix(in srgb, var(--ra) 50%, transparent); color: var(--ra); }
.cf-btn.primary:hover { background: color-mix(in srgb, var(--ra) 30%, transparent); box-shadow: 0 8px 18px -8px color-mix(in srgb, var(--ra) 60%, transparent); }

/* Feature card — horizontal split */
.rs-card.feature .card-inner { display: grid; grid-template-columns: 1.1fr 1fr; gap: 20px 28px; align-items: center; padding: 22px 24px; }
.rs-card.feature .card-head { grid-column: 1; }
.rs-card.feature .card-tagline { grid-column: 1; grid-row: 2; margin-top: -4px; }
.rs-card.feature .card-hero { grid-column: 1; grid-row: 3; }
.rs-card.feature .card-foot { grid-column: 1; grid-row: 4; }
.rs-card.feature .card-bar { grid-column: 2; grid-row: 1 / 3; align-self: center; height: 14px; }
.rs-card.feature .card-legend { grid-column: 2; grid-row: 3; }
.rs-card.feature .card-chips { grid-column: 2; grid-row: 4; margin-top: 0; }
.rs-card.feature .card-motif { font-size: 130px; }
@media (max-width: 760px) {
  .rs-card.feature .card-inner { grid-template-columns: 1fr; }
  .rs-card.feature .card-head, .rs-card.feature .card-tagline, .rs-card.feature .card-hero,
  .rs-card.feature .card-foot, .rs-card.feature .card-bar, .rs-card.feature .card-legend, .rs-card.feature .card-chips { grid-column: 1; grid-row: auto; }
}

.spin { animation: leave-orb-spin 1s linear infinite; }

@media (prefers-reduced-motion: reduce) {
  .deck-orb, .deck-wave path, .eo-ring, .eo-core, .card-sweep, .spin { animation: none !important; }
  .rs-card { transform: none !important; }
}
</style>
