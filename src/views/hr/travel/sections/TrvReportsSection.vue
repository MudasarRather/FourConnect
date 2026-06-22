<template>
  <div class="rep">
    <!-- ══ Console hero — "Dispatch Bureau" ══ -->
    <Motion as="section" class="rep-hero trv-grain"
      :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
      <span class="hero-aura" aria-hidden="true" />
      <Printer class="hero-motif" :size="240" aria-hidden="true" />

      <div class="hero-top">
        <div class="hero-lead">
          <span class="hero-eyebrow"><FileBarChart2 :size="13" /> Travel · Intelligence</span>
          <h1 class="hero-title">Dispatch <span class="grad">Bureau</span></h1>
          <p class="hero-sub">Compose and dispatch branded travel intelligence — {{ reports.length || 'twelve' }} reports
            across operations, finance and management, each one click from a cover-designed PDF, a charted Excel or a clean CSV.</p>
        </div>
        <div class="hero-cta">
          <Motion as="button" type="button" class="btn primary" :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }"
            @click="openCompose(null)"><Wand2 :size="16" /> Compose export</Motion>
          <Motion as="button" type="button" class="btn ghost" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="loadAll">
            <RefreshCw :size="14" :class="{ spin: loading }" /> Refresh</Motion>
        </div>
      </div>

      <!-- scope strip — windows the whole console + seeds downloads -->
      <div class="hero-scope">
        <div class="scope-presets">
          <button v-for="p in PRESETS" :key="p.key" class="scope-preset" :class="{ on: preset === p.key }"
            @click="preset = p.key"><component :is="p.icon" :size="12" /> {{ p.label }}</button>
        </div>
        <div class="scope-dept">
          <Building2 :size="13" />
          <TrvSelect v-model="deptId" :options="deptOpts" placeholder="All departments" size="sm" />
        </div>
        <span class="scope-period">{{ scopeLabel }}</span>
      </div>

      <!-- signature instrument -->
      <DispatchPress :overview="overview" />

      <!-- lenses — group filters + finance telemetry -->
      <div class="hero-lenses">
        <button class="lens" :class="{ on: groupLens === 'all' }" @click="groupLens = 'all'">
          <Layers :size="13" /> <span>All reports</span> <b><TrvCountUp :value="reports.length" /></b>
        </button>
        <button v-for="g in GROUPS" :key="g.key" class="lens" :class="{ on: groupLens === g.key }" :style="{ '--c': g.hex }"
          @click="groupLens = g.key">
          <component :is="g.icon" :size="13" /> <span>{{ g.key }}</span> <b><TrvCountUp :value="groupCount(g.key)" /></b>
        </button>
        <div class="lens stat" style="--c:#fb923c">
          <Coins :size="13" /> <span>Est. spend</span> <b>{{ money(kpis.est_spend) }}</b>
        </div>
        <div class="lens stat" style="--c:#34d399">
          <Wallet :size="13" /> <span>Advances out</span> <b>{{ money(kpis.advances_out) }}</b>
        </div>
        <div class="lens stat" style="--c:#fbbf24">
          <Calculator :size="13" /> <span>DA paid</span> <b>{{ money(kpis.da_paid) }}</b>
        </div>
      </div>
    </Motion>

    <!-- ══ Report deck ══ -->
    <div v-if="loading" class="rep-grid"><div v-for="n in 6" :key="n" class="rep-skel" /></div>

    <div v-else-if="visibleReports.length" class="rep-grid">
      <ReportDossierCard v-for="(r, i) in visibleReports" :key="r.key" :report="r" :index="i"
        :icon="ICONS[r.key]" :count="countFor(r.key)" :busy="dl.key === r.key ? dl.fmt : ''" :link-tab="LINKS[r.key] || ''"
        @compose="openCompose" @download="download" @go="(tab) => emit('go', tab)" />
    </div>

    <TrvEmptyState v-else :icon="FileBarChart2" title="No reports in this group"
      subtitle="Switch the lens to see the full intelligence deck." cta="All reports" :cta-icon="Layers"
      @cta="groupLens = 'all'" />

    <!-- ══ Compose modal ══ -->
    <ComposeExportModal :open="composeOpen" :reports="reports" :initial="composeInitial" :departments="deptItems"
      :counts="counts" :icon-map="ICONS" :scope="scopeParams" :busy="composeBusy"
      @close="composeOpen = false" @generate="composeGenerate" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  FileBarChart2, Printer, Wand2, RefreshCw, Layers, Coins, Wallet, Calculator, Building2,
  Plane, Map as MapIcon, CalendarRange, CalendarDays, History, Sigma, Infinity as InfinityIcon,
  Ticket, UserRound, TrendingUp, Clock, Scale, Trophy, Timer,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import DispatchPress from '../components/DispatchPress.vue'
import ReportDossierCard from '../components/ReportDossierCard.vue'
import TrvCountUp from '../components/TrvCountUp.vue'
import TrvSelect from '../components/TrvSelect.vue'
import TrvEmptyState from '../components/TrvEmptyState.vue'
import ComposeExportModal from '../modals/ComposeExportModal.vue'
import {
  errText, fmtCompactINR, fetchReportIndex, fetchReportOverview, downloadReport, fetchDepartments,
} from '@/composables/useTravel'

const emit = defineEmits(['go'])
const toast = useToast()

// per-report glyphs + cross-links to sibling tabs
const ICONS = {
  'travel-requests': Plane, 'booking-register': Ticket, 'employee-history': UserRound,
  'department-travel': Building2, 'route-analysis': MapIcon, 'travel-cost': TrendingUp,
  'da-report': Calculator, 'advance-report': Wallet, 'advance-outstanding': Clock,
  'settlement-report': Scale, 'frequent-travelers': Trophy, 'approval-tat': Timer,
}
const LINKS = {
  'travel-requests': 'requests', 'booking-register': 'booking', 'employee-history': 'requests',
  'department-travel': 'requests', 'route-analysis': 'requests', 'travel-cost': 'settlement',
  'da-report': 'da', 'advance-report': 'advances', 'advance-outstanding': 'advances',
  'settlement-report': 'settlement', 'frequent-travelers': 'requests', 'approval-tat': 'approvals',
}
const GROUPS = [
  { key: 'Travel', icon: Plane, hex: '#fbbf24' },
  { key: 'Finance', icon: Coins, hex: '#34d399' },
  { key: 'Management', icon: Sigma, hex: '#fb923c' },
]
const PRESETS = [
  { key: 'all', label: 'All time', icon: InfinityIcon },
  { key: '90d', label: '90 days', icon: CalendarRange },
  { key: 'ytd', label: 'This year', icon: CalendarDays },
  { key: '12m', label: '12 months', icon: History },
]

const reports = ref([])
const overview = ref({})
const deptItems = ref([])
const loading = ref(false)

const groupLens = ref('all')
const preset = ref('all')
const deptId = ref('')

const composeOpen = ref(false)
const composeInitial = ref(null)
const composeBusy = ref(false)
const dl = ref({ key: '', fmt: '' })

const iso = (d) => d.toISOString().slice(0, 10)
const scopeParams = computed(() => {
  const p = {}
  if (preset.value !== 'all') {
    const now = new Date()
    let from
    if (preset.value === '90d') from = new Date(Date.now() - 89 * 864e5)
    else if (preset.value === '12m') from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    else from = new Date(now.getFullYear(), 0, 1)
    p.date_from = iso(from)
    p.date_to = iso(now)
  }
  if (deptId.value) p.department_id = deptId.value
  return p
})
const scopeLabel = computed(() => {
  const f = scopeParams.value.date_from, t = scopeParams.value.date_to
  if (!f || !t) return 'All records'
  const fmt = (s) => { try { return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return s } }
  return `${fmt(f)} → ${fmt(t)}`
})

const kpis = computed(() => overview.value?.kpis || {})
const counts = computed(() => overview.value?.counts || {})
const deptOpts = computed(() => [{ value: '', label: 'All departments' }, ...deptItems.value])
const visibleReports = computed(() => groupLens.value === 'all'
  ? reports.value : reports.value.filter(r => r.group === groupLens.value))

const groupCount = (g) => reports.value.filter(r => r.group === g).length
const countFor = (k) => Number(counts.value[k]) || 0
const money = (v) => fmtCompactINR(v || 0)

const loadIndex = async () => {
  try { reports.value = (await fetchReportIndex()).items || [] }
  catch (e) { toast.error(errText(e, 'Failed to load reports')) }
}
const loadOverview = async () => {
  try { overview.value = await fetchReportOverview(scopeParams.value) }
  catch (e) { /* keep last; press idles gracefully */ overview.value = overview.value || {} ; void e }
}
const loadDepts = async () => {
  try { deptItems.value = ((await fetchDepartments()).items || []).map(d => ({ value: d.id, label: d.name })) }
  catch { deptItems.value = [] }
}
const loadAll = async () => {
  loading.value = true
  try { await Promise.all([loadIndex(), loadOverview(), loadDepts()]) }
  finally { loading.value = false }
}

watch(scopeParams, loadOverview)

const openCompose = (report) => { composeInitial.value = report; composeOpen.value = true }

const download = async (key, fmt) => {
  if (dl.value.key) return
  dl.value = { key, fmt }
  try {
    await downloadReport(key, fmt, { ...scopeParams.value })
    toast.success(`${fmt.toUpperCase()} dispatched`)
  } catch (e) { toast.error(errText(e, 'Export failed')) }
  finally { dl.value = { key: '', fmt: '' } }
}

const composeGenerate = async (payload) => {
  composeBusy.value = true
  const { key, format, ...params } = payload
  try {
    await downloadReport(key, format, params)
    toast.success(`${format.toUpperCase()} dispatched`)
    composeOpen.value = false
  } catch (e) { toast.error(errText(e, 'Export failed')) }
  finally { composeBusy.value = false }
}

onMounted(loadAll)
</script>

<style scoped>
.rep { display: flex; flex-direction: column; gap: 16px; }

/* ── hero ── */
.rep-hero { position: relative; overflow: hidden; isolation: isolate; padding: 22px 24px; border-radius: 22px;
  background: var(--trv-surface-elevated); border: 1px solid var(--trv-border); box-shadow: var(--trv-card-shadow); }
.hero-aura { position: absolute; inset: -50% 40% 30% -10%; pointer-events: none; z-index: 0;
  background: radial-gradient(60% 80% at 18% 0%, rgba(251,191,36,0.16), transparent 70%); animation: trv-aura-drift 11s ease-in-out infinite; }
.hero-motif { position: absolute; top: -54px; right: -40px; color: var(--trv-amber); opacity: 0.05; z-index: 0;
  animation: trv-spin-slow 120s linear infinite; }
.hero-top { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.hero-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--trv-amber); padding: 4px 11px; border-radius: 999px; background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }
.hero-title { font-size: clamp(22px, 3vw, 30px); font-weight: 830; margin: 11px 0 5px; color: var(--trv-text); line-height: 1.08; }
.hero-title .grad { background: var(--trv-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.hero-sub { font-size: 13px; color: var(--trv-text-secondary); margin: 0; max-width: 600px; line-height: 1.5; }
.hero-cta { display: flex; gap: 9px; flex-wrap: wrap; }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.btn.primary { background: var(--trv-grad-hero); color: #1a1205; box-shadow: var(--trv-amber-glow); }
.btn.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.spin { animation: trv-spin-slow 0.9s linear infinite; }

/* scope strip */
.hero-scope { position: relative; z-index: 1; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 16px; }
.scope-presets { display: inline-flex; gap: 4px; padding: 4px; border-radius: 12px; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.scope-preset { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 9px; cursor: pointer;
  font-size: 11.5px; font-weight: 650; color: var(--trv-text-muted); background: transparent; border: none; transition: all 0.2s; }
.scope-preset:hover { color: var(--trv-text); }
.scope-preset.on { color: #1a1205; background: var(--trv-grad-hero); box-shadow: 0 6px 16px -8px rgba(251,191,36,0.6); }
.scope-dept { display: inline-flex; align-items: center; gap: 7px; color: var(--trv-text-muted); }
.scope-dept :deep(.trvs) { width: 200px; }
.scope-period { margin-left: auto; font-size: 11.5px; font-family: var(--trv-mono); color: var(--trv-text-muted); }

/* lenses */
.hero-lenses { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 9px; margin-top: 18px; }
.lens { --c: var(--trv-amber); display: inline-flex; align-items: center; gap: 7px; padding: 8px 13px; border-radius: 12px; cursor: pointer;
  font-size: 12px; font-weight: 600; color: var(--trv-text-secondary); background: var(--trv-panel); border: 1px solid var(--trv-border);
  position: relative; overflow: hidden; transition: color 0.2s, border-color 0.2s, transform 0.2s; }
.lens::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--c); transform: scaleX(0); transform-origin: left; transition: transform 0.3s var(--trv-spring); }
.lens:hover { transform: translateY(-2px); color: var(--trv-text); }
.lens.on { color: var(--trv-text); border-color: color-mix(in srgb, var(--c) 45%, transparent); background: color-mix(in srgb, var(--c) 10%, transparent); }
.lens.on::after { transform: scaleX(1); }
.lens b { font-weight: 800; color: var(--c); font-variant-numeric: tabular-nums; }
.lens :deep(svg) { color: var(--c); }
.lens.stat { cursor: default; }
.lens.stat:hover { transform: none; }

/* deck */
.rep-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 14px; }
.rep-skel { height: 234px; border-radius: 18px; background: linear-gradient(100deg, var(--trv-surface) 30%, var(--trv-surface-elevated) 50%, var(--trv-surface) 70%);
  background-size: 200% 100%; animation: trv-runway-flow 1.4s linear infinite; }

[data-theme="light"] .scope-preset.on, [data-theme="light"] .btn.primary { color: #1a1205; }

@media (max-width: 640px) { .scope-period { margin-left: 0; } .scope-dept :deep(.trvs) { width: 160px; } }
@media (prefers-reduced-motion: reduce) { .hero-aura, .hero-motif, .rep-skel, .spin { animation: none !important; } }
</style>
