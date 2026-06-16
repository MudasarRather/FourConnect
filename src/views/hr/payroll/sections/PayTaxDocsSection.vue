<template>
  <div class="txd">
    <!-- ░░░░░░ CONTROL DECK ░░░░░░ -->
    <div class="deck">
      <span class="deck-aura" aria-hidden="true" />
      <div class="deck-head">
        <span class="eyebrow"><FileText :size="12" /> TAX DOCUMENTS · FORM 16</span>
        <h2 class="deck-title pay-foil-text">Issue Form 16</h2>
        <p class="deck-sub">Generate an employee's Form-16 tax certificate for a financial year. Published documents
          appear on the employee's <b>Self-Service → My Tax Documents</b> page to view &amp; download.</p>
      </div>

      <div class="picker">
        <!-- scope -->
        <div class="scope">
          <span class="scope-lbl">Issue for</span>
          <div class="scope-toggle" :data-on="scope">
            <span class="scope-pill" aria-hidden="true" />
            <button :class="{ on: scope === 'one' }" @click="scope = 'one'">One employee</button>
            <button :class="{ on: scope === 'all' }" @click="scope = 'all'">Everyone on payroll</button>
          </div>
        </div>

        <div class="row">
          <label v-if="scope === 'one'" class="fld emp">
            <span>Employee</span>
            <div class="sel-wrap" ref="trigRef">
              <button type="button" class="sel-btn" :class="{ open: selOpen }" @click="toggleSel">
                <span v-if="selectedEmp" class="sel-cur">
                  <span class="sel-av">{{ initials(selectedEmp) }}</span>
                  <span class="sel-cur-name">{{ empName(selectedEmp) }}</span>
                  <span class="sel-cur-code">{{ selectedEmp.employee_id }}</span>
                </span>
                <span v-else class="sel-ph">Select an employee…</span>
                <ChevronDown :size="16" class="sel-caret" :class="{ up: selOpen }" />
              </button>
            </div>
          </label>
          <div v-else class="fld emp all-note"><span>Scope</span>
            <div class="all-box"><Users :size="15" /> {{ employees.length }} employee(s) on payroll</div>
          </div>

          <label class="fld fy"><span>Financial year</span>
            <div class="fy-wrap">
              <button v-for="o in fyOptions" :key="o" type="button" class="fy-chip" :class="{ on: fy === o }" @click="fy = o">{{ o }}</button>
            </div>
          </label>
        </div>

        <div class="acts">
          <button class="btn primary" :disabled="busy || (scope === 'one' && !employeeId)" @click="generate(true)">
            <Stamp :size="14" :class="{ spin: busy }" /> {{ busy ? progressLabel : 'Generate & publish' }}
          </button>
          <button class="btn ghost" :disabled="busy || (scope === 'one' && !employeeId)" @click="generate(false)">
            <Save :size="14" /> Save as draft
          </button>
          <span class="hint"><Info :size="12" /> Form-16 is rebuilt live from released payslips — regenerate any time to refresh totals.</span>
        </div>
      </div>
    </div>

    <!-- ░░░░░░ ISSUED LIST ░░░░░░ -->
    <section class="card">
      <header class="card-head">
        <span class="hn">01</span><h3>Issued documents</h3>
        <div class="filter">
          <button v-for="o in ['All', ...fyOptions]" :key="o" class="f-chip" :class="{ on: fyFilter === o }" @click="fyFilter = o">{{ o }}</button>
          <button class="refresh" :class="{ spin: loading }" @click="loadDocs" aria-label="Refresh"><RefreshCw :size="14" /></button>
        </div>
      </header>

      <div v-if="loading && !docs.length" class="loading"><div class="pay-skel" v-for="i in 3" :key="i" style="height:62px" /></div>

      <div v-else-if="filteredDocs.length" class="doc-list">
        <article v-for="(d, i) in filteredDocs" :key="d.id" class="doc" :style="{ animationDelay: (0.04 * i) + 's' }">
          <span class="doc-ic"><FileText :size="18" /></span>
          <div class="doc-meta">
            <b>{{ empNameById(d.employee_id) }}</b>
            <small>{{ d.title || ('Form 16 · FY ' + d.fiscal_year) }} · TDS ₹{{ inrShort(d.tds_total) }} · {{ fmtDate(d.published_at || d.generated_at) }}</small>
          </div>
          <span class="status" :data-s="d.status">{{ d.status === 'PUBLISHED' ? 'Published' : 'Draft' }}</span>
          <button class="dl" @click="download(d)"><Download :size="14" /> PDF</button>
        </article>
      </div>

      <PayEmptyState v-else :icon="FileText" title="No tax documents yet"
        sub="Generate a Form-16 above — issued certificates land here and on the employee's self-service page." />
    </section>

    <!-- ░░ teleported employee dropdown ░░ -->
    <Teleport to="body">
      <transition name="sel-pop">
        <div v-if="selOpen" class="sel-pop" :style="popStyle" @mousedown.stop @click.stop>
          <button v-for="e in employees" :key="e.id" type="button" class="sel-opt" :class="{ on: e.id === employeeId }" @click="pick(e)">
            <span class="sel-av">{{ initials(e) }}</span>
            <span class="sel-meta"><span class="sel-name">{{ empName(e) }}</span><span class="sel-code">{{ e.employee_id }}</span></span>
            <Check v-if="e.id === employeeId" :size="16" class="sel-check" />
          </button>
          <div v-if="!employees.length" class="sel-empty">No employees on payroll</div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup>
// CSS-keyframe entrances (no motion-v) — consistent with PayTaxSection's
// documented motion-v async-patch crash guard.
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import axios from 'axios'
import { FileText, ChevronDown, Check, Stamp, Save, Info, RefreshCw, Download, Users } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { API, authHeader } from '@/utils/api'
import PayEmptyState from '../components/PayEmptyState.vue'
import { inrShort } from '@/composables/usePayroll'
import { generateForm16, fetchTaxDocuments, downloadTaxDocPdf } from '@/composables/usePayslip'

const toast = useToast()
const employees = ref([])
const employeeId = ref(null)
const scope = ref('one')          // 'one' | 'all'
const docs = ref([])
const loading = ref(false)
const busy = ref(false)
const progress = ref({ done: 0, total: 0 })
const fyFilter = ref('All')

// FY options — current + previous two (format "2026-27", matches backend fy_for)
const fyOptions = (() => {
  const d = new Date()
  const sy = d.getMonth() + 1 >= 4 ? d.getFullYear() : d.getFullYear() - 1
  return [0, 1, 2].map(n => { const y = sy - n; return `${y}-${String(y + 1).slice(2)}` })
})()
const fy = ref(fyOptions[0])

const empName = (e) => e?.user?.full_name || e?.full_name || e?.employee_id || '—'
const initials = (e) => (empName(e) || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
const empById = computed(() => Object.fromEntries(employees.value.map(e => [String(e.id), e])))
const empNameById = (id) => empName(empById.value[String(id)]) || 'Employee'
const fmtDate = (s) => { if (!s) return '—'; try { return new Date(s).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return '' } }

const selectedEmp = computed(() => employees.value.find(e => e.id === employeeId.value) || null)
const filteredDocs = computed(() => fyFilter.value === 'All' ? docs.value : docs.value.filter(d => d.fiscal_year === fyFilter.value))
const progressLabel = computed(() => progress.value.total > 1 ? `Generating ${progress.value.done}/${progress.value.total}…` : 'Working…')

/* teleported employee dropdown */
const selOpen = ref(false)
const trigRef = ref(null)
const popStyle = ref({})
const recalcPop = () => {
  const el = trigRef.value; if (!el) return
  const r = el.getBoundingClientRect()
  popStyle.value = { position: 'fixed', top: `${r.bottom + 6}px`, left: `${r.left}px`, width: `${r.width}px`, zIndex: 6000 }
}
const toggleSel = () => { if (selOpen.value) closeSel(); else { recalcPop(); selOpen.value = true } }
const closeSel = () => { selOpen.value = false }
const pick = (e) => { employeeId.value = e.id; closeSel() }
const onDocDown = (ev) => { if (selOpen.value && trigRef.value && !trigRef.value.contains(ev.target)) closeSel() }
const onKey = (ev) => { if (ev.key === 'Escape') closeSel() }
const onReflow = () => { if (selOpen.value) recalcPop() }

const loadDocs = async () => {
  loading.value = true
  try { docs.value = (await fetchTaxDocuments()).items || [] }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load tax documents') }
  finally { loading.value = false }
}

const generate = async (publish) => {
  busy.value = true
  try {
    if (scope.value === 'all') {
      const list = employees.value
      progress.value = { done: 0, total: list.length }
      let ok = 0
      for (const e of list) {
        try { await generateForm16({ employee_id: e.id, fiscal_year: fy.value, publish }); ok++ }
        catch { /* skip employees without payroll */ }
        progress.value.done++
      }
      toast.success(`Form-16 ${publish ? 'published' : 'drafted'} for ${ok} employee(s) · FY ${fy.value}`)
    } else {
      if (!employeeId.value) return
      await generateForm16({ employee_id: employeeId.value, fiscal_year: fy.value, publish })
      toast.success(`Form-16 ${publish ? 'published' : 'saved as draft'} · FY ${fy.value}`)
    }
    await loadDocs()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not generate Form-16')
  } finally { busy.value = false; progress.value = { done: 0, total: 0 } }
}

const download = async (d) => {
  try { await downloadTaxDocPdf(d.id, `Form16-${empNameById(d.employee_id)}-${d.fiscal_year}`) }
  catch (e) { toast.error(e?.response?.status === 503 ? 'PDF engine unavailable (GTK)' : 'Download failed') }
}

// /hr/employees caps limit at 100 — page through to load everyone (needed for bulk issue).
const loadEmployees = async () => {
  const all = []
  let page = 1
  try {
    while (page <= 50) {
      const { items = [], total = 0 } = (await axios.get(`${API}/hr/employees/`,
        { headers: authHeader(), params: { page, limit: 100 } })).data
      all.push(...items)
      if (items.length < 100 || all.length >= total) break
      page++
    }
  } catch { /* leave whatever we managed to load */ }
  employees.value = all
}

onMounted(async () => {
  await loadEmployees()
  document.addEventListener('mousedown', onDocDown)
  document.addEventListener('keydown', onKey)
  window.addEventListener('resize', onReflow)
  window.addEventListener('scroll', onReflow, true)
  loadDocs()
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocDown)
  document.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', onReflow)
  window.removeEventListener('scroll', onReflow, true)
})
</script>

<style scoped>
.txd { display: flex; flex-direction: column; gap: 16px; padding-top: 8px; }

/* deck */
.deck { position: relative; overflow: hidden; isolation: isolate; border-radius: 22px; padding: 22px 24px;
  background: linear-gradient(150deg, var(--pay-surface), var(--pay-surface-2)); border: 1px solid var(--pay-border-soft);
  box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset, 0 18px 50px -34px rgba(0,0,0,0.8); animation: pay-rise 0.55s var(--pay-ease) both; }
.deck::before { content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1px; pointer-events: none; opacity: 0.7;
  background: linear-gradient(140deg, rgba(146,64,14,0.5), transparent 38%, transparent 62%, rgba(184,134,11,0.32));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; }
.deck-aura { position: absolute; top: -50%; right: -8%; width: 50%; height: 200%; z-index: -1; pointer-events: none;
  background: radial-gradient(closest-side, rgba(146,64,14,0.16), transparent 70%); animation: pay-aurora-drift 12s ease-in-out infinite; }
.eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 10px; font-weight: 800; letter-spacing: 0.13em; color: var(--pay-statutory); }
.eyebrow svg { color: var(--pay-amber); }
.deck-title { margin: 7px 0 0; font-size: 26px; font-weight: 850; }
.deck-sub { margin: 8px 0 16px; font-size: 12.5px; color: var(--pay-text-2); max-width: 70ch; line-height: 1.5; }
.deck-sub b { color: var(--pay-text); }

.picker { display: flex; flex-direction: column; gap: 14px; position: relative; z-index: 1; }
.scope { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.scope-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--pay-text-muted); }
.scope-toggle { position: relative; display: grid; grid-template-columns: 1fr 1fr; padding: 3px; border-radius: 11px;
  background: var(--pay-surface-2); border: 1px solid var(--pay-border-soft); }
.scope-pill { position: absolute; top: 3px; bottom: 3px; left: 3px; width: calc(50% - 3px); border-radius: 8px;
  background: var(--pay-grad-cta); box-shadow: 0 4px 12px -6px rgba(245,158,11,0.6); transition: transform 0.36s var(--pay-spring); }
.scope-toggle[data-on="all"] .scope-pill { transform: translateX(100%); }
.scope-toggle button { position: relative; z-index: 1; background: none; border: none; cursor: pointer; padding: 8px 16px;
  font-size: 12.5px; font-weight: 700; color: var(--pay-text-2); transition: color 0.25s; white-space: nowrap; }
.scope-toggle button.on { color: #1a1206; }

.row { display: grid; grid-template-columns: 1.4fr 1fr; gap: 14px; align-items: start; }
.fld { display: flex; flex-direction: column; gap: 6px; }
.fld > span { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--pay-text-muted); }
.all-box { display: inline-flex; align-items: center; gap: 8px; min-height: 48px; padding: 0 14px; border-radius: 12px;
  background: var(--pay-surface-2); border: 1px solid var(--pay-border-soft); color: var(--pay-text); font-size: 13px; }
.all-box svg { color: var(--pay-treasury); }
.fy-wrap { display: flex; gap: 8px; flex-wrap: wrap; }
.fy-chip { padding: 9px 14px; border-radius: 10px; cursor: pointer; font-family: var(--pay-mono); font-size: 12.5px; font-weight: 700;
  background: var(--pay-surface-2); border: 1px solid var(--pay-border-soft); color: var(--pay-text-2); transition: all 0.2s var(--pay-ease); }
.fy-chip:hover { border-color: var(--pay-border); }
.fy-chip.on { background: rgba(245,158,11,0.14); border-color: var(--pay-amber); color: var(--pay-text); }

/* employee select trigger */
.sel-wrap { position: relative; }
.sel-btn { width: 100%; box-sizing: border-box; display: flex; align-items: center; gap: 10px; cursor: pointer; min-height: 48px;
  background: var(--pay-surface-2); border: 1px solid var(--pay-border-soft); border-radius: 12px; padding: 8px 12px;
  color: var(--pay-text); font-size: 13px; text-align: left; transition: border-color 0.25s var(--pay-ease), box-shadow 0.25s var(--pay-ease); }
.sel-btn:hover { border-color: var(--pay-border); }
.sel-btn.open { border-color: var(--pay-amber); box-shadow: 0 0 0 3px rgba(245,158,11,0.12); }
.sel-ph { flex: 1; color: var(--pay-text-muted); }
.sel-cur { flex: 1; display: flex; align-items: center; gap: 10px; min-width: 0; }
.sel-cur-name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sel-cur-code { font-family: var(--pay-mono); font-size: 11px; color: var(--pay-text-muted); flex: none; }
.sel-caret { color: var(--pay-text-muted); flex: none; transition: transform 0.3s var(--pay-spring), color 0.25s; }
.sel-btn.open .sel-caret, .sel-caret.up { transform: rotate(180deg); color: var(--pay-amber); }
.sel-av { flex: none; width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center;
  font-family: var(--pay-mono); font-size: 11px; font-weight: 800; color: var(--pay-treasury); background: rgba(251,191,36,0.14); }

.acts { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 18px; border-radius: 11px; cursor: pointer; font-weight: 700; font-size: 13px; border: 1px solid transparent;
  transition: transform 0.2s var(--pay-spring), box-shadow 0.25s var(--pay-ease); }
.btn.primary { background: var(--pay-grad-cta); color: #1a1206; }
.btn.ghost { background: var(--pay-surface-2); border-color: var(--pay-border-soft); color: var(--pay-text-2); }
.btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 24px -12px rgba(245,158,11,0.5); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.spin { animation: pay-dial-spin 0.9s linear infinite; }
.hint { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--pay-text-muted); }
.hint svg { color: var(--pay-amber); }

/* issued list card */
.card { position: relative; overflow: hidden; border-radius: 18px; padding: 18px 20px;
  background: linear-gradient(165deg, var(--pay-surface), var(--pay-surface-2)); border: 1px solid var(--pay-border-soft);
  box-shadow: 0 1px 0 rgba(255,255,255,0.03) inset, 0 14px 34px -26px rgba(0,0,0,0.7); animation: pay-rise 0.55s var(--pay-ease) 0.08s both; }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
.hn { font-family: var(--pay-mono); font-size: 11px; color: var(--pay-amber); }
.card-head h3 { margin: 0; font-size: 14px; font-weight: 800; color: var(--pay-text); flex: 1; }
.filter { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.f-chip { padding: 5px 11px; border-radius: 8px; cursor: pointer; font-size: 11px; font-weight: 600;
  background: var(--pay-surface-2); border: 1px solid var(--pay-border-soft); color: var(--pay-text-muted); }
.f-chip.on { background: rgba(245,158,11,0.14); border-color: var(--pay-amber); color: var(--pay-text); }
.refresh { width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; cursor: pointer;
  background: var(--pay-surface-2); border: 1px solid var(--pay-border-soft); color: var(--pay-text-2); transition: 0.2s; }
.refresh:hover { color: var(--pay-amber); border-color: var(--pay-border); }

.loading { display: flex; flex-direction: column; gap: 10px; }
.doc-list { display: flex; flex-direction: column; gap: 10px; }
.doc { display: flex; align-items: center; gap: 13px; padding: 12px 15px; border-radius: 13px;
  background: var(--pay-surface); border: 1px solid var(--pay-border-soft); animation: pay-rise 0.5s var(--pay-ease) both;
  transition: border-color 0.25s var(--pay-ease), transform 0.25s var(--pay-spring); }
.doc:hover { border-color: var(--pay-border); transform: translateX(2px); }
.doc-ic { width: 40px; height: 40px; flex: none; border-radius: 11px; display: grid; place-items: center; color: var(--pay-treasury); background: rgba(251,191,36,0.12); }
.doc-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.doc-meta b { font-size: 13.5px; color: var(--pay-text); }
.doc-meta small { font-size: 11px; color: var(--pay-text-muted); }
.status { font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; padding: 4px 10px; border-radius: 999px; flex: none; }
.status[data-s="PUBLISHED"] { color: var(--pay-net); background: rgba(52,211,153,0.14); }
.status[data-s="DRAFT"] { color: var(--pay-amber); background: rgba(245,158,11,0.14); }
.dl { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; cursor: pointer; font-weight: 700; font-size: 12px;
  background: var(--pay-grad-cta); color: #1a1206; border: none; flex: none; transition: transform 0.2s var(--pay-spring), box-shadow 0.25s var(--pay-ease); }
.dl:hover { transform: translateY(-2px); box-shadow: 0 10px 22px -12px rgba(245,158,11,0.55); }

/* teleported dropdown */
.sel-pop { background: var(--pay-glass); backdrop-filter: var(--pay-glass-blur); -webkit-backdrop-filter: var(--pay-glass-blur);
  border: 1px solid var(--pay-border); border-radius: 14px; padding: 6px; max-height: 320px; overflow-y: auto;
  box-shadow: 0 24px 60px -24px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05); }
.sel-pop::-webkit-scrollbar { width: 8px; } .sel-pop::-webkit-scrollbar-thumb { background: var(--pay-border); border-radius: 8px; }
.sel-opt { width: 100%; display: flex; align-items: center; gap: 11px; padding: 9px 11px; border: none; background: transparent;
  border-radius: 10px; cursor: pointer; text-align: left; color: var(--pay-text); transition: background 0.18s var(--pay-ease); }
.sel-opt:hover { background: rgba(251,191,36,0.1); } .sel-opt.on { background: rgba(251,191,36,0.14); }
.sel-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.sel-name { font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sel-code { font-family: var(--pay-mono); font-size: 10.5px; color: var(--pay-text-muted); }
.sel-check { color: var(--pay-net); flex: none; }
.sel-empty { padding: 16px; text-align: center; font-size: 12px; color: var(--pay-text-muted); }
.sel-pop-enter-active, .sel-pop-leave-active { transition: opacity 0.2s var(--pay-ease), transform 0.2s var(--pay-ease); transform-origin: top center; }
.sel-pop-enter-from, .sel-pop-leave-to { opacity: 0; transform: translateY(-8px) scale(0.97); }

/* light theme */
[data-theme="light"] .btn.primary, [data-theme="light"] .dl, [data-theme="light"] .scope-toggle button.on { color: #2a1a06; }
[data-theme="light"] .deck-aura { opacity: 0.6; }
[data-theme="light"] .sel-opt:hover { background: rgba(217,119,6,0.1); } [data-theme="light"] .sel-opt.on { background: rgba(217,119,6,0.13); }

/* responsive */
@media (max-width: 760px) { .row { grid-template-columns: 1fr; } }

@media (prefers-reduced-motion: reduce) {
  .deck, .card, .doc, .deck-aura, .spin { animation: none !important; }
  .scope-pill, .btn, .dl, .doc { transition: none !important; }
}
</style>
