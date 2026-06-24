<template>
  <div class="ex-reports">
    <ReportPressConsole :reports="allReports" :kpis="ov?.kpis || {}" :departments="departments"
      :active-group="activeGroup" :scope="scope" :loading="loading"
      @update:group="activeGroup = $event" @update:scope="onScope" />

    <!-- ─── focus stage ─── -->
    <Presence>
      <Motion v-if="focused" key="stage" as="section" class="stage ex-grain"
        :initial="reduced ? false : { opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
        :exit="reduced ? undefined : { opacity: 0, y: 12 }" :transition="{ duration: 0.4, ease: [0.16,1,0.3,1] }"
        :style="{ '--a': focused.accent, '--deep': focused.deep }">
        <header class="stage-head">
          <button class="stage-back" type="button" @click="closeReport"><ChevronLeft :size="16" /> All issues</button>
          <div class="stage-id">
            <span class="stage-grp">{{ focused.group }}</span>
            <h3 class="stage-name">{{ focused.name }}</h3>
            <p class="stage-sub">{{ focused.subtitle }}</p>
          </div>
          <button v-if="sourceFor(focused.key)" class="stage-go" type="button" @click="$emit('go', { tab: sourceFor(focused.key) })">
            Open {{ sourceLabel(focused.key) }} <ArrowUpRight :size="14" />
          </button>
        </header>

        <div class="stage-grid">
          <!-- left: live cover + export -->
          <div class="stage-left">
            <div class="stage-cover"><ReportCoverArt :report="focused" size="lg" :live="true" /></div>
            <div class="stage-exports">
              <Motion as="button" class="exp-btn pdf" :disabled="busyKey === focused.key" type="button"
                @click="dl(focused.key, 'pdf')" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }">
                <FileText :size="15" /> Pressed PDF</Motion>
              <div class="exp-row">
                <Motion as="button" class="exp-btn sm" :disabled="busyKey === focused.key" type="button"
                  @click="dl(focused.key, 'excel')" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }"><Sheet :size="14" /> Excel</Motion>
                <Motion as="button" class="exp-btn sm" :disabled="busyKey === focused.key" type="button"
                  @click="dl(focused.key, 'csv')" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }"><Download :size="14" /> CSV</Motion>
              </div>
              <div class="exp-scope"><CalendarRange :size="12" /> {{ scopeLabel }}</div>
              <Loader2 v-if="busyKey === focused.key" :size="16" class="exp-spin spin" />
            </div>
          </div>

          <!-- right: KPIs + data preview -->
          <div class="stage-right">
            <div v-if="detailLoading" class="stage-load"><Loader2 :size="20" class="spin" /> Composing…</div>
            <template v-else>
              <div class="stage-kpis">
                <div v-for="(t, i) in detailTiles" :key="i" class="skpi" :style="{ '--d': i }">
                  <span class="skpi-rail" /><span class="skpi-v">{{ fmtTile(t) }}</span><span class="skpi-l">{{ t[0] }}</span>
                </div>
              </div>

              <div class="stage-tablewrap">
                <div class="stable-head">
                  <span class="sth-t"><TableProperties :size="13" /> Data preview</span>
                  <span class="sth-n">{{ previewNote }}</span>
                </div>
                <div v-if="!detail?.rows?.length" class="stable-empty"><Inbox :size="22" /> No records for this scope.</div>
                <div v-else class="stable-scroll">
                  <table class="stable">
                    <thead><tr><th v-for="c in detail.columns" :key="c.key" :class="`a-${c.align}`">{{ c.label }}</th></tr></thead>
                    <tbody>
                      <tr v-for="(r, ri) in previewRows" :key="ri">
                        <td v-for="c in detail.columns" :key="c.key" :class="[`a-${c.align}`, { mono: c.mono }]">
                          <span v-if="c.status" class="pill" :class="toneClass(r[c.key])">{{ pretty(r[c.key]) }}</span>
                          <span v-else-if="c.bar" class="barcell"><span class="bar-fill" :style="{ width: barPct(r[c.key]) + '%' }" /><span class="bar-txt">{{ fmtCell(r[c.key], c.fmt) }}</span></span>
                          <span v-else>{{ fmtCell(r[c.key], c.fmt) }}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </template>
          </div>
        </div>
      </Motion>
    </Presence>

    <!-- ─── gallery ─── -->
    <div v-if="loading && !ov" class="grid-load"><Loader2 :size="22" class="spin" /> Loading the bureau…</div>
    <div v-else class="gallery">
      <ReportCoverCard v-for="(r, i) in galleryReports" :key="r.key" :report="r" :index="i"
        :busy="busyKey === r.key" :focused="focused?.key === r.key" :source-tab="sourceFor(r.key)"
        @focus="openReport" @export="onExport" @go="$emit('go', $event)" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  Loader2, FileText, Sheet, Download, ChevronLeft, ArrowUpRight, CalendarRange,
  TableProperties, Inbox,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import ReportPressConsole from '../components/ReportPressConsole.vue'
import ReportCoverCard from '../components/ReportCoverCard.vue'
import ReportCoverArt from '../components/ReportCoverArt.vue'
import {
  fetchReportOverview, fetchReportData, downloadReport, fetchDepartments,
  errText, fmtCompactINR, fmtDate,
} from '@/composables/useExit'
import { prefersReduced } from '@/composables/useShiftMotion'

defineEmits(['go'])
const toast = useToast()
const reduced = prefersReduced()

const ov = ref(null)
const loading = ref(false)
const departments = ref([])
const activeGroup = ref('all')
const scope = ref({ date_from: null, date_to: null, department_id: null })
const busyKey = ref(null)
const focused = ref(null)
const detail = ref(null)
const detailLoading = ref(false)

const allReports = computed(() => ov.value?.reports || [])
const galleryReports = computed(() => activeGroup.value === 'all'
  ? allReports.value
  : allReports.value.filter(r => r.group === activeGroup.value))

// report → source sibling tab (closes the "reports are disconnected" loophole)
const SOURCE = {
  'exit-register': 'resignation', 'exit-reasons': 'resignation', 'tenure-analysis': 'dashboard',
  'rehire-register': 'resignation', 'attrition-analysis': 'dashboard', 'attrition-by-department': 'dashboard',
  'separation-type': 'dashboard', 'interview-insights': 'interviews', 'notice-tracker': 'notice',
  'clearance-status': 'clearance', 'final-settlement-register': 'settlement',
}
const LABEL = {
  resignation: 'Resignation', dashboard: 'Dashboard', interviews: 'Interviews',
  notice: 'Notice', clearance: 'Clearance', settlement: 'Settlement',
}
const sourceFor = (k) => SOURCE[k] || ''
const sourceLabel = (k) => LABEL[SOURCE[k]] || ''

const scopeParams = computed(() => {
  const p = {}
  if (scope.value.date_from) p.date_from = scope.value.date_from
  if (scope.value.date_to) p.date_to = scope.value.date_to
  if (scope.value.department_id) p.department_id = scope.value.department_id
  return p
})
const scopeLabel = computed(() => {
  const s = scope.value
  if (!s.date_from && !s.date_to && !s.department_id) return 'All time · all departments'
  const parts = []
  if (s.date_from || s.date_to) parts.push(`${s.date_from ? fmtDate(s.date_from) : '…'} → ${s.date_to ? fmtDate(s.date_to) : '…'}`)
  if (s.department_id) { const d = departments.value.find(x => x.id === s.department_id); parts.push(d ? d.name : 'Dept') }
  return parts.join(' · ')
})

const load = async () => {
  loading.value = true
  try { ov.value = await fetchReportOverview(scopeParams.value) }
  catch (e) { toast.error(errText(e, 'Failed to load reports')) }
  finally { loading.value = false }
}
const onScope = (s) => { scope.value = s; load(); if (focused.value) loadDetail(focused.value.key) }

const loadDetail = async (key) => {
  detailLoading.value = true
  try { detail.value = await fetchReportData(key, scopeParams.value) }
  catch (e) { toast.error(errText(e, 'Failed to load report data')); detail.value = null }
  finally { detailLoading.value = false }
}
const openReport = (r) => {
  focused.value = r
  loadDetail(r.key)
  requestAnimationFrame(() => document.querySelector('.stage')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }))
}
const closeReport = () => { focused.value = null; detail.value = null }

const dl = async (key, fmt) => {
  busyKey.value = key
  try { await downloadReport(key, fmt, scopeParams.value); toast.success(`${fmt.toUpperCase()} ready`) }
  catch (e) { toast.error(errText(e, 'Export failed')) }
  finally { busyKey.value = null }
}
const onExport = ({ key, fmt }) => dl(key, fmt)

// ── stage formatting ──
const detailTiles = computed(() => detail.value?.summary?.tiles || [])
const fmtTile = (t) => {
  const [, val, kind] = t
  if (kind === 'inr') return fmtCompactINR(val)
  if (kind === 'pct') return `${val}%`
  if (kind === 'num1') return Number(val).toFixed(1)
  return Number(val).toLocaleString('en-IN')
}
const previewRows = computed(() => (detail.value?.rows || []).slice(0, 12))
const previewNote = computed(() => {
  const n = detail.value?.rows?.length || 0
  if (!n) return ''
  return n > 12 ? `Showing 12 of ${n} — export for the full set` : `${n} record${n === 1 ? '' : 's'}`
})
const fmtCell = (v, fmt) => {
  if (v === null || v === undefined || v === '') return '—'
  if (fmt === 'inr') return fmtCompactINR(v)
  if (fmt === 'int') return Number(v).toLocaleString('en-IN')
  if (fmt === 'num1') return Number(v).toFixed(1)
  if (fmt === 'pct') return `${v}%`
  return String(v)
}
const barPct = (v) => Math.max(0, Math.min(100, Number(v) || 0))
const pretty = (v) => {
  const s = String(v)
  if (s.includes(' ') || s.includes('/') || s.includes('—')) return s
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
const GOOD = new Set(['COMPLETED', 'PAID', 'CLOSED', 'APPROVED', 'ELIGIBLE', 'YES', 'CLEARED', 'VOLUNTARY', 'SETTLEMENT', '2–5 yr', '5+ yr'])
const BAD = new Set(['REJECTED', 'CANCELLED', 'WITHDRAWN', 'REVERSED', 'BLOCKED', 'NOT_ELIGIBLE', 'NO', 'INVOLUNTARY', '< 6 mo'])
const WARN = new Set(['NOTICE_PERIOD', 'CLEARANCE', 'SUBMITTED', 'MANAGER_REVIEW', 'ACCEPTED', 'SCHEDULED', 'IN_PROGRESS', 'UNDECIDED', 'MUTUAL', 'PENDING', '6–12 mo', '1–2 yr'])
const toneClass = (v) => { const s = String(v); return GOOD.has(s) ? 'good' : BAD.has(s) ? 'bad' : WARN.has(s) ? 'warn' : 'neutral' }

watch(activeGroup, () => { /* gallery re-filters reactively */ })
onMounted(async () => {
  load()
  try { const d = await fetchDepartments(); departments.value = d.items || d || [] } catch { departments.value = [] }
})
</script>

<style scoped>
.ex-reports { color: var(--ex-text); }
.grid-load { display: flex; align-items: center; gap: 8px; justify-content: center; padding: 60px; color: var(--ex-text-muted); }
.spin { animation: ex-spin-slow 0.8s linear infinite; }

/* ── gallery ── */
.gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(212px, 1fr)); gap: 18px; }
@media (max-width: 560px) { .gallery { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; } }

/* ── focus stage ── */
.stage { position: relative; overflow: hidden; border-radius: 22px; margin-bottom: 18px; padding: 20px 22px;
  background: var(--ex-surface-elevated); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow); }
.stage::before { content: ""; position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(80% 60% at 100% 0%, color-mix(in srgb, var(--a) 12%, transparent), transparent 60%); }
.stage-head { position: relative; display: grid; grid-template-columns: auto 1fr auto; gap: 16px; align-items: center; margin-bottom: 18px; }
.stage-back { display: inline-flex; align-items: center; gap: 5px; padding: 8px 13px; border-radius: 10px; cursor: pointer;
  font-size: 12.5px; font-weight: 700; color: var(--ex-text-secondary); background: var(--ex-surface); border: 1px solid var(--ex-border); }
.stage-back:hover { color: var(--ex-text); border-color: var(--ex-border-strong); }
.stage-id { min-width: 0; }
.stage-grp { font-size: 9px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ex-violet); }
.stage-name { font-size: clamp(18px, 2.4vw, 24px); font-weight: 850; margin: 2px 0 3px; color: var(--ex-text); line-height: 1.1; }
.stage-sub { font-size: 12.5px; color: var(--ex-text-muted); margin: 0; max-width: 560px; }
.stage-go { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 10px; cursor: pointer; white-space: nowrap;
  font-size: 12.5px; font-weight: 700; color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.stage-go:hover { background: color-mix(in srgb, var(--ex-violet) 18%, transparent); }

.stage-grid { position: relative; display: grid; grid-template-columns: 340px 1fr; gap: 24px; align-items: start; }
@media (max-width: 860px) { .stage-grid { grid-template-columns: 1fr; } .stage-cover { max-width: 320px; } }

.stage-cover { border-radius: 20px; overflow: hidden; box-shadow: var(--ex-shadow); }
.stage-exports { margin-top: 14px; display: flex; flex-direction: column; gap: 8px; position: relative; }
.exp-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 12px 14px; border-radius: 12px;
  font-size: 13.5px; font-weight: 800; cursor: pointer; border: 1px solid transparent; color: #fff; background: var(--ex-grad-hero);
  box-shadow: 0 10px 24px -10px color-mix(in srgb, var(--a) 70%, transparent); }
.exp-btn.sm { flex: 1; font-size: 12.5px; padding: 10px 12px; font-weight: 700; color: var(--ex-text-secondary);
  background: var(--ex-surface); border-color: var(--ex-border); box-shadow: none; }
.exp-btn.sm:hover { color: var(--ex-text); border-color: var(--ex-border-strong); }
.exp-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.exp-row { display: flex; gap: 8px; }
.exp-scope { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--ex-text-muted); margin-top: 2px; padding-left: 2px; }
.exp-spin { position: absolute; top: 14px; right: 12px; color: #fff; }

.stage-right { min-width: 0; }
.stage-load { display: flex; align-items: center; gap: 8px; justify-content: center; padding: 50px; color: var(--ex-text-muted); }
.stage-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-bottom: 16px; }
.skpi { position: relative; overflow: hidden; padding: 14px 14px 12px; border-radius: 14px; background: var(--ex-surface);
  border: 1px solid var(--ex-border); animation: ex-fade-up 0.5s var(--ex-spring) both; animation-delay: calc(var(--d) * 0.06s); }
.skpi-rail { position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--ex-grad-hero); }
.skpi-v { display: block; font-size: 22px; font-weight: 850; color: var(--ex-text); font-family: var(--ex-mono); font-variant-numeric: tabular-nums; }
.skpi-l { display: block; font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ex-text-muted); margin-top: 4px; }

.stage-tablewrap { border: 1px solid var(--ex-border); border-radius: 14px; overflow: hidden; background: var(--ex-panel); }
.stable-head { display: flex; align-items: center; justify-content: space-between; padding: 11px 14px; border-bottom: 1px solid var(--ex-border); }
.sth-t { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 800; color: var(--ex-text); }
.sth-n { font-size: 11px; color: var(--ex-text-muted); }
.stable-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 40px; color: var(--ex-text-dim); }
.stable-scroll { overflow-x: auto; }
.stable { width: 100%; border-collapse: collapse; font-size: 12px; }
.stable th { position: sticky; top: 0; text-align: left; padding: 9px 12px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.05em;
  text-transform: uppercase; color: var(--ex-text-muted); background: var(--ex-surface); border-bottom: 1px solid var(--ex-border); white-space: nowrap; }
.stable td { padding: 9px 12px; border-bottom: 1px solid var(--ex-border); color: var(--ex-text-secondary); white-space: nowrap; }
.stable tbody tr:last-child td { border-bottom: none; }
.stable tbody tr:hover td { background: var(--ex-violet-soft); }
.a-left { text-align: left; } .a-right { text-align: right; } .a-center { text-align: center; }
.mono { font-family: var(--ex-mono); font-size: 11px; color: var(--ex-text); }
.pill { display: inline-block; padding: 3px 9px; border-radius: 999px; font-size: 10px; font-weight: 700; }
.pill.good { background: var(--ex-cleared-soft); color: var(--ex-cleared); }
.pill.bad { background: var(--ex-blocked-soft); color: var(--ex-blocked); }
.pill.warn { background: var(--ex-pending-soft); color: var(--ex-pending); }
.pill.neutral { background: var(--ex-steel-soft); color: var(--ex-steel); }
.barcell { position: relative; display: block; min-width: 70px; }
.bar-fill { position: absolute; left: 0; top: 50%; transform: translateY(-50%); height: 16px; border-radius: 4px;
  background: color-mix(in srgb, var(--a) 24%, transparent); }
.bar-txt { position: relative; font-weight: 700; font-family: var(--ex-mono); padding-left: 4px; }
[data-theme="light"] .pill.warn { color: #b45309; }

@media (prefers-reduced-motion: reduce) { .skpi { animation: none; } }
</style>
