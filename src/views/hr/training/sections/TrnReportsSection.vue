<template>
  <div class="trn-sec">
    <!-- ─────────── hero / foundry console ─────────── -->
    <Motion as="header" class="rf-hero" ref="heroRef"
      :initial="reduced ? false : { opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
      <span class="rf-aurora" aria-hidden="true" />
      <span class="trn-spotlight" aria-hidden="true" />
      <span class="trn-grain" aria-hidden="true" />

      <div class="rf-top">
        <div class="rf-lead">
          <span class="rf-eyebrow"><FileBarChart2 :size="13" /> Report Foundry</span>
          <h1 class="rf-title">Reports</h1>
          <p class="rf-sub">Press-ready exports of the entire Observatory — each report a uniquely-designed PDF, a data-rich Excel workbook, or raw CSV. Scope by date &amp; department.</p>
        </div>
        <div class="rf-stats">
          <div class="rf-stat"><strong><TrnCountUp :value="reports.length" :duration="1.2" /></strong><span>reports</span></div>
          <div class="rf-stat"><strong>{{ groups.length }}</strong><span>lenses</span></div>
          <div class="rf-stat"><strong>3</strong><span>formats</span></div>
        </div>
      </div>

      <!-- filter console -->
      <div class="rf-console">
        <div class="rf-search">
          <Search :size="15" />
          <input v-model="search" placeholder="Find a report…" />
          <button v-if="search" class="rf-search-x" @click="search = ''" aria-label="Clear"><X :size="14" /></button>
        </div>
        <div class="rf-date"><span>From</span><HrDatePicker v-model="filters.from" :max="filters.to || ''" placeholder="dd / mm / yyyy" /></div>
        <div class="rf-date"><span>To</span><HrDatePicker v-model="filters.to" :min="filters.from || ''" placeholder="dd / mm / yyyy" /></div>
        <div class="rf-dept">
          <TrnSelect v-model="filters.department_id" :options="deptOptions" searchable
            search-placeholder="Find department…" placeholder="All departments" />
        </div>
        <button v-if="hasScope" class="rf-clear" @click="clearScope"><FilterX :size="13" /> Clear scope</button>
      </div>
      <div v-if="hasScope" class="rf-scope">
        <Info :size="12" /> Exports below are scoped to
        <b v-if="filters.from || filters.to">{{ filters.from || '…' }} → {{ filters.to || '…' }}</b>
        <b v-if="filters.department_id">{{ deptName }}</b>
      </div>
    </Motion>

    <!-- loading -->
    <div v-if="loading" class="rf-grid"><div v-for="n in 6" :key="n" class="trn-skel" style="height: 188px; border-radius: 18px" /></div>

    <!-- empty search -->
    <TrnEmptyState v-else-if="!filtered.length" :icon="FileBarChart2" title="No matching reports"
      sub="Try a different term, or clear the search." />

    <!-- grouped catalog -->
    <template v-else>
      <section v-for="(grp, gi) in groupedReports" :key="grp.key" class="rf-group">
        <Motion as="div" class="rf-group-head"
          :initial="reduced ? false : { opacity: 0, x: -12 }" :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.45, delay: gi * 0.06, ease: [0.16, 1, 0.3, 1] }">
          <span class="rf-group-bar" />
          <div>
            <h2>{{ grp.label }}</h2>
            <p>{{ grp.desc }}</p>
          </div>
          <span class="rf-group-n trn-mono">{{ grp.items.length }}</span>
        </Motion>

        <div class="rf-grid">
          <Motion v-for="(r, i) in grp.items" :key="r.key" as="article" class="rf-card" ref="cardRefs"
            :style="{ '--a': r.accent, '--d': r.accent_deep || r.accent }"
            :initial="reduced ? false : { opacity: 0, y: 18, filter: 'blur(6px)' }"
            :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
            :transition="{ duration: 0.5, delay: Math.min(i * 0.06, 0.4), ease: [0.16, 1, 0.3, 1] }"
            :whileHover="reduced ? {} : { y: -5 }">
            <span class="rf-card-spot trn-spotlight" aria-hidden="true" />
            <RpReportCover :motif="r.motif" :accent="r.accent" :accent-deep="r.accent_deep" :icon="iconFor(r.key)" />
            <div class="rf-card-body">
              <div class="rf-card-head">
                <h3>{{ r.name }}</h3>
                <button v-if="tabFor(r.key)" class="rf-card-go" :title="`Open ${r.name} tab`" @click="$emit('go', tabFor(r.key))">
                  <ArrowUpRight :size="14" />
                </button>
              </div>
              <p class="rf-card-tag">{{ r.tagline }}</p>
            </div>
            <div class="rf-actions">
              <button class="rf-btn pdf" :disabled="busy === r.key + ':pdf'" @click="run(r.key, 'pdf')">
                <Loader v-if="busy === r.key + ':pdf'" :size="13" class="spin" /><FileText v-else :size="13" /> PDF
              </button>
              <button class="rf-btn" :disabled="busy === r.key + ':excel'" @click="run(r.key, 'excel')">
                <Loader v-if="busy === r.key + ':excel'" :size="13" class="spin" /><Sheet v-else :size="13" /> Excel
              </button>
              <button class="rf-btn" :disabled="busy === r.key + ':csv'" @click="run(r.key, 'csv')">
                <Loader v-if="busy === r.key + ':csv'" :size="13" class="spin" /><FileSpreadsheet v-else :size="13" /> CSV
              </button>
            </div>
          </Motion>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  FileText, Sheet, FileSpreadsheet, Loader, Search, X, FilterX, Info, ArrowUpRight,
  FileBarChart2, UsersRound, CircleCheckBig, ClipboardCheck, Star, Grid3x3, Award,
  Presentation, ShieldCheck, Inbox, Wallet, Building2,
} from 'lucide-vue-next'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import TrnSelect from '../components/TrnSelect.vue'
import TrnCountUp from '../components/TrnCountUp.vue'
import TrnEmptyState from '../components/TrnEmptyState.vue'
import RpReportCover from '../components/RpReportCover.vue'
import { fetchReportsList, downloadReport } from '@/composables/useTraining'
import { useHrReference } from '@/composables/useEmployees'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'

defineEmits(['go'])
const toast = useToast()
const reduced = prefersReduced()
const heroRef = ref(null)
usePointerSpotlight(heroRef)
const { reference, loadReferenceData } = useHrReference()

const reports = ref([])
const loading = ref(true)
const busy = ref('')
const search = ref('')
const filters = reactive({ from: '', to: '', department_id: '' })

const GROUPS = [
  { key: 'engagement', label: 'Engagement', desc: 'How learners move through training' },
  { key: 'capability', label: 'Capability', desc: 'Skills, credentials & faculty strength' },
  { key: 'governance', label: 'Governance', desc: 'Mandates, approvals & spend' },
  { key: 'executive', label: 'Executive', desc: 'Cross-cutting rollups for leadership' },
]
const ICONS = {
  enrollments: UsersRound, completion: CircleCheckBig, assessments: ClipboardCheck, feedback: Star,
  skill_gap: Grid3x3, certifications: Award, trainers: Presentation, compliance: ShieldCheck,
  requests: Inbox, budget: Wallet, department: Building2,
}
const TABS = {
  enrollments: 'enrollment', completion: 'enrollment', assessments: 'assessments', feedback: 'feedback',
  skill_gap: 'skill-matrix', certifications: 'certifications', trainers: 'trainers',
  compliance: 'compliance', requests: 'requests', budget: 'budget',
}
const iconFor = (k) => ICONS[k] || FileBarChart2
const tabFor = (k) => TABS[k] || null

const deptOptions = computed(() => [
  { value: '', label: 'All departments' },
  ...(reference.departments || []).map(d => ({ value: d.id, label: d.name })),
])
const deptName = computed(() => (reference.departments || []).find(d => d.id === filters.department_id)?.name || '')
const hasScope = computed(() => !!(filters.from || filters.to || filters.department_id))
const clearScope = () => { filters.from = ''; filters.to = ''; filters.department_id = '' }

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return reports.value
  return reports.value.filter(r => r.name.toLowerCase().includes(q) || (r.tagline || '').toLowerCase().includes(q))
})
const groups = computed(() => GROUPS.filter(g => reports.value.some(r => r.group === g.key)))
const groupedReports = computed(() =>
  GROUPS.map(g => ({ ...g, items: filtered.value.filter(r => r.group === g.key) })).filter(g => g.items.length))

onMounted(async () => {
  loadReferenceData()
  try { reports.value = (await fetchReportsList()).reports || [] }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load reports') }
  finally { loading.value = false }
})

const run = async (key, format) => {
  busy.value = `${key}:${format}`
  try {
    const params = {}
    if (filters.from) params.from = filters.from
    if (filters.to) params.to = filters.to
    if (filters.department_id) params.department_id = filters.department_id
    await downloadReport(key, format, params)
    toast.success(`${format.toUpperCase()} export ready`)
  } catch (e) {
    const msg = e?.response?.status === 503
      ? 'PDF rendering is unavailable on the server (GTK not installed).'
      : (e?.response?.data?.detail || 'Export failed')
    toast.error(msg)
  } finally { busy.value = '' }
}
</script>

<style scoped>
.trn-sec { display: flex; flex-direction: column; gap: 18px; }

/* ── hero ── */
.rf-hero { position: relative; overflow: hidden; isolation: isolate; border-radius: 24px; padding: 26px 28px 20px;
  border: 1px solid var(--trn-border-soft); background: var(--trn-grad-hero), var(--trn-surf-card); box-shadow: var(--trn-card-shadow); }
.rf-aurora { position: absolute; inset: -45% -20% auto -20%; height: 100%; z-index: 0; pointer-events: none;
  background: radial-gradient(54% 66% at 18% 0%, color-mix(in srgb, var(--trn-amber) 22%, transparent), transparent 60%),
    radial-gradient(56% 68% at 86% 8%, color-mix(in srgb, var(--trn-ember) 14%, transparent), transparent 60%);
  filter: blur(14px); opacity: 0.85; animation: rf-drift 19s ease-in-out infinite alternate; }
.rf-top { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
.rf-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--trn-mono); font-size: 11px; font-weight: 600;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--trn-amber-strong); }
.rf-eyebrow :deep(svg) { color: var(--trn-amber); }
.rf-title { margin: 9px 0 0; font-size: 34px; font-weight: 850; letter-spacing: -0.03em; line-height: 1; color: var(--trn-text);
  background: linear-gradient(120deg, var(--trn-text) 38%, var(--trn-amber-strong)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.rf-sub { margin: 10px 0 0; font-size: 13px; color: var(--trn-text-muted); max-width: 62ch; }
.rf-stats { display: flex; gap: 10px; flex-shrink: 0; }
.rf-stat { display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 10px 14px; border-radius: 14px;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); min-width: 64px; }
.rf-stat strong { font-family: var(--trn-mono); font-size: 22px; font-weight: 850; color: var(--trn-text); line-height: 1; }
.rf-stat span { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--trn-text-dim); }

.rf-console { position: relative; z-index: 1; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 18px; }
.rf-search { display: flex; align-items: center; gap: 8px; padding: 0 10px 0 12px; border-radius: 12px; flex: 1; min-width: 200px;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); transition: border-color 0.2s, box-shadow 0.2s; }
.rf-search:focus-within { border-color: color-mix(in srgb, var(--trn-amber) 50%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--trn-amber) 14%, transparent); }
.rf-search :deep(svg) { color: var(--trn-text-dim); flex-shrink: 0; }
.rf-search input { flex: 1; min-width: 0; border: 0; background: transparent; padding: 9px 0; font: inherit; font-size: 13px; color: var(--trn-text); }
.rf-search input:focus { outline: none; }
.rf-search-x { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; border: 0; cursor: pointer;
  background: var(--trn-surface-elevated); color: var(--trn-text-muted); }
.rf-date { display: flex; flex-direction: column; gap: 4px; width: 150px; align-self: flex-end; font-size: 10px;
  text-transform: uppercase; letter-spacing: 0.06em; color: var(--trn-text-dim); }
.rf-dept { width: 180px; align-self: flex-end; }
.rf-clear { display: inline-flex; align-items: center; gap: 5px; align-self: flex-end; font: inherit; font-size: 12px; font-weight: 600;
  padding: 8px 11px; border-radius: 10px; cursor: pointer; color: var(--trn-text-muted); background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.rf-clear:hover { color: var(--trn-text); border-color: color-mix(in srgb, var(--trn-amber) 34%, transparent); }
.rf-scope { position: relative; z-index: 1; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 12px;
  font-size: 11.5px; color: var(--trn-text-muted); }
.rf-scope :deep(svg) { color: var(--trn-amber-strong); }
.rf-scope b { font-weight: 700; color: var(--trn-text-secondary); padding: 1px 8px; border-radius: 999px;
  background: color-mix(in srgb, var(--trn-amber) 12%, transparent); }

/* ── groups ── */
.rf-group { display: flex; flex-direction: column; gap: 14px; }
.rf-group-head { display: flex; align-items: center; gap: 12px; }
.rf-group-bar { width: 4px; height: 34px; border-radius: 3px; background: var(--trn-grad-rail); box-shadow: 0 0 12px -2px var(--trn-amber); }
.rf-group-head h2 { margin: 0; font-size: 17px; font-weight: 800; letter-spacing: -0.02em; color: var(--trn-text); }
.rf-group-head p { margin: 1px 0 0; font-size: 12px; color: var(--trn-text-muted); }
.rf-group-n { margin-left: auto; font-size: 12px; font-weight: 700; padding: 3px 11px; border-radius: 999px;
  color: var(--trn-amber); background: color-mix(in srgb, var(--trn-amber) 13%, transparent); }

.rf-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(268px, 1fr)); gap: 14px; }
.rf-card { position: relative; overflow: hidden; padding: 14px; border-radius: 18px; border: 1px solid var(--trn-border-soft);
  background: var(--trn-surf-card); box-shadow: var(--trn-card-shadow); display: flex; flex-direction: column; gap: 11px;
  transition: box-shadow 0.3s, border-color 0.3s; }
.rf-card:hover { box-shadow: var(--trn-card-shadow-hover); border-color: color-mix(in srgb, var(--a) 38%, transparent); }
.rf-card-spot { z-index: 0; }
.rf-card > *:not(.rf-card-spot) { position: relative; z-index: 1; }
.rf-card-body { display: flex; flex-direction: column; gap: 3px; flex: 1; }
.rf-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.rf-card-head h3 { margin: 0; font-size: 15px; font-weight: 750; color: var(--trn-text); line-height: 1.25; }
.rf-card-go { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0; cursor: pointer;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); color: var(--trn-text-muted); transition: all 0.2s; }
.rf-card-go:hover { color: var(--a); border-color: color-mix(in srgb, var(--a) 45%, transparent); transform: translate(1px, -1px); }
.rf-card-tag { margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--trn-text-muted); }
.rf-actions { display: flex; gap: 6px; }
.rf-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 5px; font: inherit; font-size: 11.5px; font-weight: 600;
  padding: 8px 8px; border-radius: 10px; border: 1px solid var(--trn-border-soft); background: var(--trn-surface); color: var(--trn-text-secondary);
  cursor: pointer; transition: all 0.2s; }
.rf-btn:hover:not(:disabled) { color: var(--trn-text); background: var(--trn-surface-elevated); transform: translateY(-1px); }
.rf-btn.pdf { color: var(--a); border-color: color-mix(in srgb, var(--a) 32%, transparent); background: color-mix(in srgb, var(--a) 8%, transparent); }
.rf-btn.pdf:hover:not(:disabled) { background: color-mix(in srgb, var(--a) 15%, transparent); }
.rf-btn:disabled { opacity: 0.6; cursor: default; }
.spin { animation: rf-spin 0.9s linear infinite; }

@keyframes rf-drift { 0% { transform: translate3d(-3%, -2%, 0) scale(1); } 100% { transform: translate3d(4%, 3%, 0) scale(1.07); } }
@keyframes rf-spin { to { transform: rotate(360deg); } }

@media (max-width: 720px) {
  .rf-top { flex-direction: column; }
  .rf-stats { width: 100%; }
  .rf-date { width: 100%; }
  .rf-dept { width: 100%; }
}
@media (prefers-reduced-motion: reduce) { .rf-aurora { animation: none; } }
</style>
