<template>
  <div class="rmb-reports" ref="rootRef">
    <!-- cinematic backdrop -->
    <div class="rp-atmos" aria-hidden="true">
      <span class="rp-orb o1" /><span class="rp-orb o2" /><span class="rp-orb o3" />
      <span class="rp-grid-bg" /><span class="rp-scan" />
      <span class="rmb-spotlight" /><span class="rmb-grain" />
    </div>

    <!-- ── console header ── -->
    <Motion as="header" class="rp-head"
      :initial="{ opacity: 0, y: -12 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
      <div class="rp-head-l">
        <span class="rp-eyebrow"><FileBarChart2 :size="12" /> Exports · finance &amp; audit</span>
        <h2>Report <span class="ink">foundry</span></h2>
        <span class="rp-meta rmb-mono">
          <span class="rp-live" />
          <RmbCountUp :value="reports.length" /> report{{ reports.length === 1 ? '' : 's' }}
          <span class="rp-sep">·</span> PDF <span class="rp-dim">branded</span>
          <span class="rp-sep">·</span> Excel <span class="rp-dim">KPI deck + charts</span>
          <span class="rp-sep">·</span> CSV <span class="rp-dim">raw</span>
        </span>
      </div>
      <div class="rp-head-r">
        <span class="rp-eq" aria-hidden="true"><i v-for="n in 5" :key="n" :style="{ animationDelay: `${(n * 0.13).toFixed(2)}s` }" /></span>
        <button class="rp-refresh" :class="{ spin: refreshing }" @click="refresh" aria-label="Refresh reports"><RefreshCw :size="15" /></button>
      </div>
    </Motion>

    <!-- ── range control rail ── -->
    <Motion as="div" class="rp-rail"
      :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }">
      <div class="rp-presets">
        <CalendarDays :size="15" class="rp-cal" />
        <button v-for="p in PRESETS" :key="p.key" class="rp-preset" :class="{ on: preset === p.key }" @click="applyPreset(p.key)">{{ p.label }}</button>
      </div>
      <div class="rp-dates">
        <label class="rp-date"><span>From</span><input type="date" v-model="from" @change="preset = 'custom'" /></label>
        <span class="rp-arrow">→</span>
        <label class="rp-date"><span>To</span><input type="date" v-model="to" @change="preset = 'custom'" /></label>
        <button v-if="from || to" class="rp-clear" @click="applyPreset('all')" aria-label="Clear range"><X :size="13" /></button>
      </div>
    </Motion>

    <!-- ── grid ── -->
    <div class="rp-board rmb-ribbon">
      <div v-if="loading" class="rp-cards">
        <div v-for="i in 6" :key="i" class="rmb-skel card-skel"></div>
      </div>
      <div v-else-if="reports.length" class="rp-cards">
        <RmbReportCard v-for="(r, i) in reports" :key="r.key" :report="r" :index="i"
                       :busy="stateOf(r.key).busy" :done="stateOf(r.key).done"
                       @download="(fmt) => dl(r.key, fmt)" />
      </div>
      <RmbEmptyState v-else :icon="FileBarChart2" title="No reports available"
                     subtitle="Reports load from the server — check the backend is running." />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  FileBarChart2, CalendarDays, RefreshCw, X,
  ScrollText, Landmark, Tags, Users, Inbox, Hourglass, Wallet, RotateCcw, BarChart3,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { fetchReportIndex, downloadReport, errText } from '@/composables/useReimbursements'
import { usePointerSpotlight } from '@/composables/useShiftMotion'
import RmbReportCard from '../components/RmbReportCard.vue'
import RmbCountUp from '../components/RmbCountUp.vue'
import RmbEmptyState from '../components/RmbEmptyState.vue'

const toast = useToast()
const rootRef = ref(null)
usePointerSpotlight(rootRef)

// Frontend mirror of backend REPORT_META motif/accent — drives each card's identity.
const STYLE = {
  claims_register:     { motif: 'ledger',    accent: '#ea580c', deep: '#7c2d12', soft: '#fff4ec', icon: ScrollText, tagline: 'Every claim, end to end' },
  settlement_summary:  { motif: 'vault',     accent: '#0d9488', deep: '#134e4a', soft: '#effbf8', icon: Landmark,   tagline: 'What was paid, and how' },
  by_category:         { motif: 'spectrum',  accent: '#7c3aed', deep: '#4c1d95', soft: '#f6f2ff', icon: Tags,       tagline: 'Spend across the spectrum' },
  by_employee:         { motif: 'podium',    accent: '#4f46e5', deep: '#312e81', soft: '#f1f1fe', icon: Users,      tagline: 'Who claims the most' },
  pending_approvals:   { motif: 'pipeline',  accent: '#d97706', deep: '#7c4a07', soft: '#fff7ea', icon: Inbox,      tagline: 'Stuck in the chain' },
  aging:               { motif: 'stopwatch', accent: '#e11d48', deep: '#881337', soft: '#fff1f4', icon: Hourglass,  tagline: 'How long claims wait' },
  payroll_settlements: { motif: 'payslip',   accent: '#15803d', deep: '#14532d', soft: '#f0fdf4', icon: Wallet,     tagline: 'Folded into payslips' },
  reversals:           { motif: 'clawback',  accent: '#b91c1c', deep: '#7f1d1d', soft: '#fef2f2', icon: RotateCcw,  tagline: 'Corrections on record' },
}
const FALLBACK = { motif: 'ledger', accent: '#ea580c', deep: '#7c2d12', soft: '#fff4ec', icon: BarChart3, tagline: 'Report' }

const reports = ref([])
const loading = ref(false)
const refreshing = ref(false)
const cardState = reactive({})           // { [key]: { busy, done } }
const stateOf = (key) => cardState[key] || { busy: '', done: '' }

const from = ref('')
const to = ref('')
const preset = ref('all')

const iso = (d) => d.toISOString().slice(0, 10)
const PRESETS = [
  { key: 'all', label: 'All time' },
  { key: 'fy', label: 'This FY' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'month', label: 'This month' },
]
function applyPreset(key) {
  preset.value = key
  const now = new Date()
  if (key === 'all') { from.value = ''; to.value = '' }
  else if (key === 'fy') {
    const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
    from.value = `${y}-04-01`; to.value = iso(now)
  } else if (key === 'quarter') {
    const d = new Date(now); d.setMonth(d.getMonth() - 3)
    from.value = iso(d); to.value = iso(now)
  } else if (key === 'month') {
    from.value = iso(new Date(now.getFullYear(), now.getMonth(), 1)); to.value = iso(now)
  }
}

async function dl(key, fmt) {
  if (stateOf(key).busy) return
  cardState[key] = { busy: fmt, done: '' }
  try {
    await downloadReport(key, { format: fmt, from: from.value || undefined, to: to.value || undefined })
    cardState[key] = { busy: '', done: fmt }
    setTimeout(() => { if (cardState[key]?.done === fmt) cardState[key] = { busy: '', done: '' } }, 2400)
  } catch (e) {
    toast.error(errText(e, 'Export failed (PDF needs GTK on Windows — run vendor/setup_gtk.py)'))
    cardState[key] = { busy: '', done: '' }
  }
}

async function load() {
  loading.value = true
  try {
    const items = (await fetchReportIndex()).items || []
    reports.value = items.map(it => ({ ...it, ...(STYLE[it.key] || FALLBACK) }))
  } catch { toast.error('Failed to load reports') }
  finally { loading.value = false }
}
function refresh() {
  refreshing.value = true
  load().finally(() => setTimeout(() => { refreshing.value = false }, 700))
}
onMounted(load)
</script>

<style scoped>
.rmb-reports { position: relative; display: flex; flex-direction: column; gap: 16px; }
.rmb-reports > :not(.rp-atmos) { position: relative; z-index: 1; }

/* ── backdrop ── */
.rp-atmos { position: absolute; inset: -12px; z-index: 0; overflow: hidden; border-radius: 24px; pointer-events: none; }
.rp-orb { position: absolute; border-radius: 50%; filter: blur(66px); }
.rp-orb.o1 { width: 360px; height: 360px; top: -120px; left: -40px; opacity: 0.15;
  background: radial-gradient(circle, rgba(234,88,12,0.9), transparent 68%); animation: rp-drift 24s ease-in-out infinite;
  transform: translate3d(calc((var(--mx,0.5) - 0.5) * -28px), calc((var(--my,0.5) - 0.5) * -18px), 0); }
.rp-orb.o2 { width: 320px; height: 320px; bottom: -130px; right: 6%; opacity: 0.12;
  background: radial-gradient(circle, rgba(13,148,136,0.85), transparent 70%); animation: rp-drift 30s ease-in-out infinite reverse;
  transform: translate3d(calc((var(--mx,0.5) - 0.5) * 24px), calc((var(--my,0.5) - 0.5) * 18px), 0); }
.rp-orb.o3 { width: 280px; height: 280px; top: 26%; right: -50px; opacity: 0.1;
  background: radial-gradient(circle, rgba(124,58,237,0.8), transparent 70%); animation: rp-drift 34s ease-in-out infinite;
  transform: translate3d(calc((var(--mx,0.5) - 0.5) * 14px), calc((var(--my,0.5) - 0.5) * -12px), 0); }
.rp-grid-bg { position: absolute; inset: 0; opacity: 0.35;
  background-image: linear-gradient(var(--rmb-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--rmb-grid-line) 1px, transparent 1px);
  background-size: 38px 38px; -webkit-mask: radial-gradient(150% 110% at 50% 0%, #000, transparent 74%); mask: radial-gradient(150% 110% at 50% 0%, #000, transparent 74%); }
.rp-scan { position: absolute; left: 0; right: 0; top: 0; height: 26%; background: linear-gradient(180deg, transparent, rgba(234,88,12,0.035), transparent); }

/* ── header ── */
.rp-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.rp-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--rmb-mono); font-size: 10px;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--rmb-st-returned); }
.rp-head h2 { margin: 4px 0 5px; font-size: 26px; font-weight: 800; letter-spacing: -0.03em; color: var(--rmb-text); }
.rp-head h2 .ink { background: var(--hr-gradient-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.rp-meta { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--rmb-text-muted); flex-wrap: wrap; }
.rp-live { width: 6px; height: 6px; border-radius: 50%; background: var(--rmb-st-approved); animation: rmb-pulse-dot 2.2s ease-out infinite; }
.rp-sep { opacity: 0.5; }
.rp-dim { color: var(--rmb-text-secondary); font-weight: 600; }
.rp-head-r { display: flex; align-items: center; gap: 10px; }
.rp-eq { display: inline-flex; align-items: flex-end; gap: 2.5px; height: 18px; }
.rp-eq i { display: block; width: 2.5px; height: 100%; border-radius: 2px; transform-origin: bottom;
  background: linear-gradient(180deg, var(--rmb-amber-bright), var(--rmb-amber-strong)); animation: rp-eq 1.1s ease-in-out infinite; }
.rp-refresh { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; cursor: pointer;
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); color: var(--rmb-text-secondary); transition: 0.2s; }
.rp-refresh:hover { color: var(--rmb-amber); border-color: var(--rmb-border-strong); transform: rotate(15deg); }
.rp-refresh.spin :deep(svg) { animation: rp-spin 0.8s var(--rmb-ease); }

/* ── range rail ── */
.rp-rail { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; justify-content: space-between;
  padding: 11px 14px; border-radius: 14px; background: var(--rmb-surf-card); border: 1px solid var(--rmb-border-soft); box-shadow: var(--rmb-card-shadow); }
.rp-presets { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.rp-cal { color: var(--rmb-text-muted); margin-right: 2px; }
.rp-preset { padding: 7px 13px; border-radius: 999px; font-size: 12px; font-weight: 600; cursor: pointer;
  color: var(--rmb-text-secondary); background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); transition: all 0.25s var(--rmb-spring); }
.rp-preset:hover { border-color: var(--rmb-border-strong); transform: translateY(-1px); }
.rp-preset.on { color: var(--rmb-amber); background: color-mix(in srgb, var(--rmb-amber) 14%, transparent);
  border-color: color-mix(in srgb, var(--rmb-amber) 50%, transparent); }
.rp-dates { display: inline-flex; align-items: center; gap: 8px; }
.rp-date { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 10px;
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); }
.rp-date span { font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--rmb-text-muted); }
.rp-date input { background: none; border: none; outline: none; color: var(--rmb-text); font-size: 12.5px; font-family: inherit; color-scheme: dark; }
[data-theme="light"] .rp-date input { color-scheme: light; }
.rp-arrow { color: var(--rmb-text-muted); }
.rp-clear { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; cursor: pointer;
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); color: var(--rmb-text-muted); transition: 0.2s; }
.rp-clear:hover { color: var(--rmb-st-rejected); }

/* ── board / grid ── */
.rp-board { border-radius: 16px; padding: 16px; border: 1px solid var(--rmb-border-soft); min-height: 200px; }
.rp-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(268px, 1fr)); gap: 14px; }
.card-skel { height: 250px; }

/* ── keyframes ── */
@keyframes rp-drift { 0%, 100% { translate: 0 0; } 50% { translate: 40px 30px; } }
@keyframes rp-eq { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
@keyframes rp-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

/* ── light theme ── */
:root[data-theme="light"] .rp-orb.o1 { opacity: 0.11; }
:root[data-theme="light"] .rp-orb.o2 { opacity: 0.09; }
:root[data-theme="light"] .rp-orb.o3 { opacity: 0.07; }

@media (prefers-reduced-motion: reduce) {
  .rp-orb, .rp-eq i, .rp-live { animation: none !important; }
  .rp-orb { transform: none !important; }
}
@media (max-width: 620px) {
  .rp-head { flex-direction: column; }
  .rp-head h2 { font-size: 22px; }
  .rp-rail { flex-direction: column; align-items: stretch; }
}
</style>
