<template>
  <div class="rep">
    <!-- ════════ Briefing Console hero ════════ -->
    <Motion as="header" class="rep-hero as-card" ref="heroEl"
      :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
      <span class="as-grain" />
      <span class="as-spotlight" />
      <span class="rep-floor as-blueprint-floor" />
      <FileBarChart2 class="rep-ambient" :size="340" aria-hidden="true" />

      <div class="rep-hero-grid">
        <div class="rep-lead">
          <span class="rep-eyebrow"><Radar :size="13" /> Report Foundry · Briefing Deck</span>
          <h2 class="rep-title">Brief the <span class="grad">estate</span>.</h2>
          <p class="rep-sub">{{ reports.length || 16 }} lifecycle dossiers — each rendered as a uniquely-branded PDF, a structured Excel workbook, or raw CSV.</p>

          <!-- global telemetry -->
          <div class="rep-trio">
            <div class="rep-stat">
              <span class="rep-stat-v"><AssetCountUp :value="reports.length" /></span>
              <span class="rep-stat-l">Dossiers</span>
              <i class="rep-stat-bar" />
            </div>
            <div class="rep-stat">
              <span class="rep-stat-v"><AssetCountUp :value="totalAssets" /></span>
              <span class="rep-stat-l">Assets indexed</span>
              <i class="rep-stat-bar" />
            </div>
            <div class="rep-stat">
              <span class="rep-stat-v">₹<AssetCountUp :value="estateValueCompact.n" :decimals="estateValueCompact.d" />{{ estateValueCompact.suffix }}</span>
              <span class="rep-stat-l">Estate value</span>
              <i class="rep-stat-bar" />
            </div>
          </div>

          <!-- scope bar -->
          <div class="rep-scope">
            <span class="rep-scope-h"><SlidersHorizontal :size="12" /> Scope</span>
            <div class="rep-scope-ctrls">
              <HrDatePicker v-model="scope.from" :max="scope.to || ''" placeholder="From" />
              <span class="rep-scope-arrow">→</span>
              <HrDatePicker v-model="scope.to" :min="scope.from || ''" placeholder="To" />
              <div class="rep-scope-dept"><AsSelect v-model="scope.department_id" :options="deptOptions" placeholder="All departments" /></div>
              <button v-if="scopeActive" class="rep-scope-reset" title="Clear scope" @click="resetScope"><RotateCcw :size="13" /></button>
            </div>
          </div>
        </div>

        <div class="rep-deck-wrap">
          <ReportDeck :plates="deckPlates" @open="openCompose" @focus="() => {}" />
          <span class="rep-deck-cap">Live dossier deck · click to compose</span>
        </div>
      </div>
    </Motion>

    <!-- ════════ group lenses ════════ -->
    <div v-if="!loading" class="rep-lenses">
      <button class="rep-lens" :class="{ on: activeGroup === '' }" @click="activeGroup = ''">
        <Layers :size="14" /> <span>All</span><b>{{ reports.length }}</b>
      </button>
      <button v-for="g in groupList" :key="g.key" class="rep-lens" :class="{ on: activeGroup === g.key }"
        :style="{ '--a': g.accent }" @click="activeGroup = activeGroup === g.key ? '' : g.key">
        <component :is="g.icon" :size="14" /> <span>{{ g.label }}</span><b>{{ g.count }}</b>
      </button>
    </div>

    <!-- ════════ loading ════════ -->
    <div v-if="loading" class="rep-grid">
      <div v-for="n in 6" :key="n" class="as-skel" style="height:208px;border-radius:18px" />
    </div>

    <!-- ════════ grouped grid ════════ -->
    <template v-else>
      <Motion v-for="g in visibleGroups" :key="g.key" as="section" class="rep-group"
        :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4 }">
        <h3 class="rep-group-title" :style="{ '--a': g.accent }">
          <component :is="g.icon" :size="14" /> {{ g.label }}<span class="rep-group-n">{{ g.reports.length }}</span>
        </h3>
        <div class="rep-grid">
          <ReportDossierCard v-for="(r, i) in g.reports" :key="r.key" :report="r" :index="i"
            :live="overview[r.key] || null" :busy="busy.key === r.key ? busy.fmt : ''" :link-label="r.linkLabel"
            @compose="openCompose(r)" @download="(fmt) => quickDownload(r, fmt)" @go="goToModule(r)" />
        </div>
      </Motion>
    </template>

    <!-- ════════ compose & export ════════ -->
    <ComposeExportModal :open="composeOpen" :report="composeReport" :live="composeReport ? (overview[composeReport.key] || null) : null"
      :departments="departments" :scope="scope" :busy="composeBusy" @close="composeOpen = false" @submit="onComposeSubmit" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  FileBarChart2, Radar, Layers, SlidersHorizontal, RotateCcw,
  Gauge, Boxes, PackageCheck, Activity, Banknote, ShieldCheck, Gavel,
} from 'lucide-vue-next'
import ReportDeck from '../components/ReportDeck.vue'
import ReportDossierCard from '../components/ReportDossierCard.vue'
import AssetCountUp from '../components/AssetCountUp.vue'
import AsSelect from '../components/AsSelect.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import ComposeExportModal from '../modals/ComposeExportModal.vue'
import {
  fetchReports, fetchReportOverview, downloadReport, fetchDepartments,
  REPORT_TAB_LINK, ASSET_TABS, titleCase, errText,
} from '@/composables/useAssets'
import { seededWave, usePointerSpotlight } from '@/composables/useShiftMotion'

const emit = defineEmits(['go'])
const toast = useToast()

const heroEl = ref(null)
usePointerSpotlight(heroEl)   // hero pointer glare; resolves the Motion ref's $el

// ── group taxonomy (lenses + section headers) ──
const GROUP_META = {
  overview:   { label: 'Estate',     icon: Gauge,        accent: '#fbbf24' },
  inventory:  { label: 'Inventory',  icon: Boxes,        accent: '#fbbf24' },
  allocation: { label: 'Allocation', icon: PackageCheck, accent: '#f59e0b' },
  lifecycle:  { label: 'Lifecycle',  icon: Activity,     accent: '#9aa1ab' },
  financial:  { label: 'Financial',  icon: Banknote,     accent: '#34d399' },
  compliance: { label: 'Compliance', icon: ShieldCheck,  accent: '#fcd34d' },
  governance: { label: 'Governance', icon: Gavel,        accent: '#fb923c' },
}
const GROUP_ORDER = ['overview', 'inventory', 'allocation', 'lifecycle', 'financial', 'compliance', 'governance']
const tabLabel = (k) => ASSET_TABS.find(t => t.key === k)?.label || 'module'

// ── data ──
const reports = ref([])
const overview = ref({})        // { key: {count, summary} }
const totals = ref({})
const departments = ref([])
const loading = ref(true)
const activeGroup = ref('')

const scope = reactive({ from: '', to: '', department_id: '' })
const scopeActive = computed(() => !!(scope.from || scope.to || scope.department_id))
const resetScope = () => { scope.from = ''; scope.to = ''; scope.department_id = '' }
const deptOptions = computed(() => [
  { value: '', label: 'All departments' },
  ...departments.value.map(d => ({ value: d.id, label: d.name })),
])

// hash a key → stable numeric seed for the sparkline
const seedOf = (k) => String(k).split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 100000, 7)

// reports enriched with a stable wave + cross-link metadata
const enriched = computed(() => reports.value.map(r => ({
  ...r,
  wave: seededWave(seedOf(r.key), 14),
  linkTab: REPORT_TAB_LINK[r.key] || 'dashboard',
  linkLabel: tabLabel(REPORT_TAB_LINK[r.key] || 'dashboard'),
})))

const byKey = computed(() => Object.fromEntries(enriched.value.map(r => [r.key, r])))

// grouped, ordered
const groups = computed(() => {
  const map = {}
  for (const r of enriched.value) {
    const g = r.group || 'lifecycle'
    ;(map[g] ||= []).push(r)
  }
  return GROUP_ORDER.filter(g => map[g]).concat(Object.keys(map).filter(g => !GROUP_ORDER.includes(g)))
    .map(key => ({
      key,
      label: GROUP_META[key]?.label || titleCase(key),
      icon: GROUP_META[key]?.icon || Layers,
      accent: GROUP_META[key]?.accent || '#fbbf24',
      reports: map[key],
    }))
})
const groupList = computed(() => groups.value.map(g => ({ ...g, count: g.reports.length })))
const visibleGroups = computed(() => activeGroup.value ? groups.value.filter(g => g.key === activeGroup.value) : groups.value)

// deck = a curated spread (falls back to the first 5 reports)
const DECK_PICK = ['estate_overview', 'inventory_register', 'allocation_register', 'financial_valuation', 'audit_reconciliation']
const deckPlates = computed(() => {
  const picks = DECK_PICK.map(k => byKey.value[k]).filter(Boolean)
  const list = (picks.length >= 3 ? picks : enriched.value.slice(0, 5))
  return list.map(r => ({
    key: r.key, name: r.name, eyebrow: r.eyebrow, icon: r.icon, group: r.group,
    accent: r.accent, accent_deep: r.accent_deep, wave: r.wave,
    count: overview.value[r.key]?.count ?? null,
  }))
})

// ── global telemetry ──
const totalAssets = computed(() => Number(totals.value.assets ?? overview.value.inventory_register?.count ?? 0))
const estateValueCompact = computed(() => {
  const v = Number(totals.value.value || 0)
  if (v >= 1e7) return { n: v / 1e7, d: 2, suffix: ' Cr' }
  if (v >= 1e5) return { n: v / 1e5, d: 2, suffix: ' L' }
  if (v >= 1e3) return { n: v / 1e3, d: 1, suffix: ' k' }
  return { n: v, d: 0, suffix: '' }
})

onMounted(async () => {
  try {
    const [reps, ov, deps] = await Promise.all([
      fetchReports(),
      fetchReportOverview(),
      fetchDepartments({ limit: 200 }).catch(() => []),
    ])
    reports.value = reps
    departments.value = Array.isArray(deps) ? deps : (deps?.items || [])
    if (ov && !ov.__unavailable) {
      overview.value = ov.reports || {}
      totals.value = ov.totals || {}
    }
  } catch (e) {
    toast.error(errText(e, 'Failed to load reports'))
  } finally {
    loading.value = false
  }
})

// ── downloads ──
const busy = reactive({ key: '', fmt: '' })
async function quickDownload(r, format) {
  busy.key = r.key; busy.fmt = format
  try {
    await downloadReport(r.key, format, { from: scope.from, to: scope.to, department_id: scope.department_id })
    toast.success(`${r.name} · ${format.toUpperCase()} downloaded`)
  } catch (e) {
    toast.error(downloadErr(e))
  } finally { busy.key = ''; busy.fmt = '' }
}

// ── compose modal ──
const composeOpen = ref(false)
const composeReport = ref(null)
const composeBusy = ref(false)
function openCompose(r) {
  composeReport.value = byKey.value[r.key] || r
  composeOpen.value = true
}
async function onComposeSubmit(payload) {
  if (!composeReport.value) return
  const { format, ...params } = payload
  composeBusy.value = true
  try {
    await downloadReport(composeReport.value.key, format, params)
    toast.success(`${composeReport.value.name} · ${format.toUpperCase()} downloaded`)
    composeOpen.value = false
  } catch (e) {
    toast.error(downloadErr(e))
  } finally { composeBusy.value = false }
}

function downloadErr(e) {
  return e?.response?.status === 503
    ? 'PDF engine unavailable on this host — try Excel or CSV.'
    : errText(e, 'Download failed')
}

// ── cross-link to the live module tab ──
function goToModule(r) { emit('go', { tab: REPORT_TAB_LINK[r.key] || 'dashboard' }) }
</script>

<style scoped>
.rep { display: flex; flex-direction: column; gap: 18px; }

/* ════ hero ════ */
.rep-hero { position: relative; overflow: hidden; padding: 26px 28px; border-radius: 22px; }
.rep-floor { opacity: 0.7; }
.rep-ambient { position: absolute; right: -90px; top: 50%; transform: translateY(-50%); color: var(--as-amber); opacity: 0.04; z-index: 0;
  animation: rep-spin 90s linear infinite; }
.rep-hero-grid { position: relative; z-index: 1; display: grid; grid-template-columns: 1fr 280px; gap: 26px; align-items: center; }
@media (max-width: 880px) { .rep-hero-grid { grid-template-columns: 1fr; } .rep-deck-wrap { order: -1; } }

.rep-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--as-amber); }
.rep-title { margin: 11px 0 0; font-size: clamp(26px, 4vw, 38px); font-weight: 850; letter-spacing: -0.03em; line-height: 1.02; color: var(--as-text); }
.rep-title .grad { background: linear-gradient(120deg, var(--as-amber-bright), var(--as-ember)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.rep-sub { margin: 9px 0 0; font-size: 13.5px; line-height: 1.55; color: var(--as-text-muted); max-width: 52ch; }

/* telemetry trio */
.rep-trio { display: flex; gap: 26px; margin-top: 20px; flex-wrap: wrap; }
.rep-stat { position: relative; display: flex; flex-direction: column; gap: 2px; padding-bottom: 8px; }
.rep-stat-v { font-family: var(--as-mono); font-size: 25px; font-weight: 800; letter-spacing: -0.02em; color: var(--as-text); line-height: 1; }
.rep-stat-l { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--as-text-dim); }
.rep-stat-bar { position: absolute; left: 0; bottom: 0; height: 2px; width: 34px; border-radius: 2px; background: var(--as-grad-rail); }

/* scope bar */
.rep-scope { display: flex; align-items: center; gap: 12px; margin-top: 20px; padding: 11px 14px; border-radius: 14px;
  background: var(--as-surface); border: 1px solid var(--as-border-soft); flex-wrap: wrap; }
.rep-scope-h { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--as-text-dim); }
.rep-scope-h :deep(svg) { color: var(--as-amber); }
.rep-scope-ctrls { display: flex; align-items: center; gap: 8px; flex: 1; flex-wrap: wrap; }
.rep-scope-arrow { color: var(--as-text-dim); font-weight: 700; }
.rep-scope-dept { min-width: 168px; flex: 1; }
.rep-scope-reset { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; cursor: pointer; flex-shrink: 0;
  color: var(--as-text-muted); background: var(--as-surface-elevated); border: 1px solid var(--as-border-soft); transition: all 0.2s; }
.rep-scope-reset:hover { color: var(--as-ember); border-color: color-mix(in srgb, var(--as-ember) 40%, transparent); transform: rotate(-40deg); }

/* deck */
.rep-deck-wrap { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.rep-deck-cap { font-size: 10px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--as-text-dim); }

/* lenses */
.rep-lenses { display: flex; gap: 9px; flex-wrap: wrap; }
.rep-lens { display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 999px; cursor: pointer; font: inherit;
  font-size: 12.5px; font-weight: 600; color: var(--as-text-muted); background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: all 0.22s var(--as-spring); }
.rep-lens:hover { color: var(--as-text); border-color: var(--as-border-strong); transform: translateY(-1px); }
.rep-lens b { font-family: var(--as-mono); font-size: 11px; font-weight: 800; padding: 1px 6px; border-radius: 6px; background: var(--as-surface-elevated); color: var(--as-text-secondary); }
.rep-lens.on { color: var(--a, var(--as-amber)); background: color-mix(in srgb, var(--a, var(--as-amber)) 12%, transparent); border-color: color-mix(in srgb, var(--a, var(--as-amber)) 36%, transparent); }
.rep-lens.on b { background: color-mix(in srgb, var(--a, var(--as-amber)) 20%, transparent); color: var(--a, var(--as-amber)); }
.rep-lens :deep(svg) { color: var(--a, var(--as-amber)); }

/* groups */
.rep-group { display: flex; flex-direction: column; gap: 13px; }
.rep-group-title { display: inline-flex; align-items: center; gap: 8px; margin: 0; font-size: 12px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--as-text-dim); }
.rep-group-title :deep(svg) { color: var(--a, var(--as-amber)); }
.rep-group-n { font-family: var(--as-mono); font-size: 10px; padding: 1px 7px; border-radius: 999px; background: var(--as-surface); color: var(--as-text-muted); border: 1px solid var(--as-border-soft); }
.rep-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(294px, 1fr)); gap: 14px; align-items: stretch; }

@keyframes rep-spin { to { transform: translateY(-50%) rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .rep-ambient { animation: none; } }
</style>
