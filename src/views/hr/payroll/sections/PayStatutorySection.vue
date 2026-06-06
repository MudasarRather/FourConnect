<template>
  <div class="stat">
    <!-- ░░░░░░░░░░ COMPLIANCE COMMAND (hero) ░░░░░░░░░░ -->
    <div class="cmd">
      <span class="cmd-grid" aria-hidden="true" />
      <div class="cmd-info">
        <span class="eyebrow"><ShieldCheck :size="12" /> STATUTORY COMPLIANCE · FY {{ comp?.fiscal_year || fy }}</span>
        <h2 class="cmd-title pay-foil-text">Obligations Board</h2>
        <p class="cmd-sub">Every statutory head withheld from {{ comp?.period_label || 'this period' }}'s payroll, with its filing authority, deposit deadline &amp; return — remit on time to stay compliant.</p>
        <div class="cmd-stats">
          <div class="cst"><span>Total liability</span><b class="cst-big"><PayMoneyValue tone="statutory" :value="comp?.total_statutory || 0" short /></b></div>
          <div class="cst"><span>Covered employees</span><b>{{ comp?.employee_count ?? 0 }}</b></div>
          <div class="cst"><span>Heads due</span><b>{{ dueCount }}</b></div>
        </div>
      </div>

      <!-- composition bar -->
      <div class="comp-card">
        <div class="comp-head"><Layers :size="12" /> Composition</div>
        <div class="comp-bar">
          <span v-for="(h, i) in heads" :key="h.key" class="comp-seg" :style="{ width: pct(h.amount) + '%', '--c': h.color, '--i': i }" :title="`${h.label} · ${inr(h.amount)}`" />
          <span v-if="!totalStat" class="comp-empty" />
        </div>
        <div class="comp-legend">
          <span v-for="h in heads" :key="h.key" class="cl"><i :style="{ background: h.color }" /> {{ h.short }} {{ Math.round(pct(h.amount)) }}%</span>
        </div>
      </div>
    </div>

    <!-- period -->
    <div class="deck">
      <div class="period">
        <div class="sel-wrap">
          <select v-model.number="month" @change="loadCompliance"><option v-for="m in 12" :key="m" :value="m">{{ monthLabel(m) }}</option></select>
          <ChevronDown :size="14" class="sel-caret" />
        </div>
        <input v-model.number="year" type="number" class="yr" @change="loadCompliance" />
      </div>
    </div>

    <PayEmptyState v-if="!comp" :icon="ShieldCheck" title="No statutory data yet"
      sub="Compliance figures are summed from each payslip's PF / ESI / PT / TDS lines once payroll is generated for the month." />

    <!-- ░░░░░░░░░░ OBLIGATION CARDS ░░░░░░░░░░ -->
    <div v-else class="board">
      <article v-for="(h, i) in heads" :key="h.key" class="ob" :class="`a-${h.tone}`" :style="{ '--i': i }"
        @pointermove="spot" @pointerleave="unspot">
        <span class="ob-spot" aria-hidden="true" />
        <span class="ob-seal" aria-hidden="true"><component :is="h.icon" :size="60" /></span>

        <header class="ob-head">
          <span class="ob-ico"><component :is="h.icon" :size="17" /></span>
          <div class="ob-titles">
            <span class="ob-name">{{ h.label }}</span>
            <span class="ob-auth">{{ h.authority }}</span>
          </div>
          <span class="ob-due" :class="{ urgent: h.urgent }"><CalendarClock :size="11" /> by {{ h.dueLabel }}</span>
        </header>

        <div class="ob-amt"><PayMoneyValue tone="statutory" :value="h.amount" /></div>

        <!-- employee / employer split -->
        <div v-if="h.split" class="ob-split">
          <div class="sp-bar">
            <span class="sp-emp" :style="{ width: splitPct(h, 'employee') + '%' }" />
            <span class="sp-er" :style="{ width: splitPct(h, 'employer') + '%' }" />
          </div>
          <div class="sp-legend">
            <span><i class="d emp" /> Employee {{ inrShort(h.employee) }}</span>
            <span><i class="d er" /> Employer {{ inrShort(h.employer) }}</span>
          </div>
        </div>
        <div v-else class="ob-single">
          <span class="os-lbl">{{ h.singleNote }}</span>
        </div>

        <footer class="ob-foot">
          <span class="ob-form"><FileText :size="11" /> {{ h.form }}</span>
        </footer>
      </article>
    </div>

    <!-- ░░░░░░░░░░ RATES EDITOR ░░░░░░░░░░ -->
    <div class="rates">
      <header class="rates-head">
        <div><h3>Statutory rates &amp; ceilings <span class="ry">FY {{ comp?.fiscal_year || fy }}</span></h3>
          <span class="hint">Editable — changes apply to future pay runs only (past runs keep their config snapshot)</span></div>
      </header>
      <div v-if="cfgLoading" class="pay-skel" style="height:160px; border-radius:14px" />
      <div v-else class="rate-grid">
        <div v-for="(row, i) in scalarConfigs" :key="row.id" class="rate-row" :style="{ '--i': i }">
          <div class="rr-key"><span class="rr-name">{{ prettyKey(row.key) }}</span><span class="rr-raw">{{ row.key }}<em v-if="row.state_code"> · {{ row.state_code }}</em></span></div>
          <div class="rr-edit">
            <input v-model.number="row._edit" type="number" step="0.0001" class="rr-in" />
            <button class="rr-save" :class="{ dirty: row._edit != row.value_num }" :disabled="row._edit == row.value_num" @click="saveCfg(row)">
              <Check :size="13" /> Save
            </button>
          </div>
        </div>
      </div>
      <p v-if="jsonConfigs.length" class="json-note"><Info :size="13" /> Slab tables (Professional Tax / TDS) hold {{ jsonConfigs.length }} configured band sets — edited via the API.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Info, ShieldCheck, Layers, ChevronDown, CalendarClock, FileText, Check, Landmark, HeartPulse, Building2, Receipt } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import PayEmptyState from '../components/PayEmptyState.vue'
import PayMoneyValue from '../components/PayMoneyValue.vue'
import { monthLabel, inr, inrShort, fyLabel, fetchStatutoryConfig, updateStatutoryConfig } from '@/composables/usePayroll'
import { fetchCompliance } from '@/composables/usePayrollExtra'

const toast = useToast()
const now = new Date()
const month = ref(now.getMonth() + 1); const year = ref(now.getFullYear())
const comp = ref(null); const configs = ref([]); const cfgLoading = ref(false)
const fy = fyLabel()

/* next-month deposit window (PF/ESI by 15th, PT ~20th, TDS by 7th of next month) */
const nextMonthLabel = computed(() => monthLabel(month.value === 12 ? 1 : month.value + 1))
const nmShort = computed(() => nextMonthLabel.value.slice(0, 3))
const dueDateFor = (day) => new Date(month.value === 12 ? year.value + 1 : year.value, month.value % 12, day)
const isUrgent = (day) => { const d = dueDateFor(day); const left = Math.ceil((d - now) / 86400000); return left >= 0 && left <= 4 }

const totalStat = computed(() => Number(comp.value?.total_statutory || 0))
const pct = (v) => totalStat.value ? (Number(v || 0) / totalStat.value) * 100 : 0

const heads = computed(() => {
  const c = comp.value
  if (!c) return []
  return [
    { key: 'EPF', label: 'Provident Fund', short: 'PF', authority: 'EPFO', tone: 'gold', color: '#b8860b', icon: Landmark,
      amount: Number(c.pf_employee) + Number(c.pf_employer), split: true, employee: Number(c.pf_employee), employer: Number(c.pf_employer),
      dueLabel: `15 ${nmShort.value}`, urgent: isUrgent(15), form: 'ECR · Form 12A' },
    { key: 'ESI', label: "Employees' State Insurance", short: 'ESI', authority: 'ESIC', tone: 'ember', color: '#ea580c', icon: HeartPulse,
      amount: Number(c.esi_employee) + Number(c.esi_employer), split: true, employee: Number(c.esi_employee), employer: Number(c.esi_employer),
      dueLabel: `15 ${nmShort.value}`, urgent: isUrgent(15), form: 'ESI return' },
    { key: 'PT', label: 'Professional Tax', short: 'PT', authority: 'State Govt', tone: 'amber', color: '#f59e0b', icon: Building2,
      amount: Number(c.professional_tax), split: false, singleNote: 'Employee deduction · remitted by employer per state schedule',
      dueLabel: `20 ${nmShort.value}`, urgent: isUrgent(20), form: 'State PT return' },
    { key: 'TDS', label: 'Tax Deducted at Source', short: 'TDS', authority: 'Income Tax Dept', tone: 'bronze', color: '#92400e', icon: Receipt,
      amount: Number(c.tds), split: false, singleNote: 'Income-tax withheld at source on salary',
      dueLabel: `7 ${nmShort.value}`, urgent: isUrgent(7), form: 'Challan 281 · 24Q' },
  ]
})
const dueCount = computed(() => heads.value.filter(h => h.amount > 0).length)
const splitPct = (h, which) => { const t = h.employee + h.employer; return t ? (h[which] / t) * 100 : 0 }

/* rates editor */
const scalarConfigs = computed(() => configs.value.filter(c => c.value_num != null).map(c => ({ ...c, _edit: c._edit ?? Number(c.value_num) })))
const jsonConfigs = computed(() => configs.value.filter(c => c.value_json != null))
const PRETTY = {
  PF_RATE: 'PF rate', PF_WAGE_CEILING: 'PF wage ceiling', ESI_EMPLOYEE_RATE: 'ESI employee rate', ESI_EMPLOYER_RATE: 'ESI employer rate',
  ESI_WAGE_LIMIT: 'ESI wage limit', STD_DEDUCTION_OLD: 'Std deduction (old)', STD_DEDUCTION_NEW: 'Std deduction (new)',
  SEC_80C_CAP: '80C cap', SEC_80D_CAP: '80D cap', CESS_RATE: 'Health & edu cess',
}
const prettyKey = (k) => PRETTY[k] || k.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, m => m.toUpperCase())

/* spotlight */
const spot = (e) => { const el = e.currentTarget, b = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${e.clientX - b.left}px`); el.style.setProperty('--my', `${e.clientY - b.top}px`); el.style.setProperty('--sp', '1') }
const unspot = (e) => e.currentTarget.style.setProperty('--sp', '0')

const loadCompliance = async () => {
  try { comp.value = await fetchCompliance(year.value, month.value); await loadConfig() }
  catch { toast.error('Failed to load compliance') }
}
const loadConfig = async () => {
  if (!comp.value) return
  cfgLoading.value = true
  try { configs.value = (await fetchStatutoryConfig({ fiscal_year: comp.value.fiscal_year })).items || [] }
  catch {} finally { cfgLoading.value = false }
}
const saveCfg = async (row) => {
  try { await updateStatutoryConfig(row.id, { value_num: row._edit }); toast.success(`${prettyKey(row.key)} updated`); loadConfig() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Update failed') }
}
onMounted(loadCompliance)
</script>

<style scoped>
.stat { display: flex; flex-direction: column; gap: 16px; padding-top: 8px; }

/* ░░░░░░░░░░ COMMAND HERO ░░░░░░░░░░ */
.cmd { position: relative; overflow: hidden; isolation: isolate; display: flex; align-items: center; gap: 26px;
  flex-wrap: wrap; justify-content: space-between; padding: 24px 26px; border-radius: 22px;
  background: linear-gradient(150deg, var(--pay-surface), var(--pay-surface-2)); border: 1px solid var(--pay-border-soft);
  box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset, 0 18px 50px -34px rgba(0,0,0,0.8); animation: pay-rise 0.55s var(--pay-ease) both; }
.cmd::before { content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1px; pointer-events: none; opacity: 0.7;
  background: linear-gradient(140deg, rgba(146,64,14,0.5), transparent 38%, transparent 62%, rgba(184,134,11,0.32));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; }
.cmd-grid { position: absolute; inset: 0; z-index: -1; opacity: 0.4; pointer-events: none;
  background-image: linear-gradient(var(--pay-border-soft) 1px, transparent 1px), linear-gradient(90deg, var(--pay-border-soft) 1px, transparent 1px);
  background-size: 24px 24px; -webkit-mask: radial-gradient(130% 90% at 100% 50%, #000, transparent 72%); mask: radial-gradient(130% 90% at 100% 50%, #000, transparent 72%); }
.cmd-info { min-width: 0; flex: 1; }
.eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 10px; font-weight: 800; letter-spacing: 0.13em; color: var(--pay-statutory); }
.eyebrow svg { color: var(--pay-amber); }
.cmd-title { margin: 7px 0 0; font-size: 27px; font-weight: 850; letter-spacing: -0.01em; }
.cmd-sub { margin: 8px 0 16px; font-size: 12.5px; color: var(--pay-text-2); max-width: 60ch; line-height: 1.5; }
.cmd-stats { display: flex; flex-wrap: wrap; gap: 22px; }
.cst { display: flex; flex-direction: column; gap: 3px; }
.cst span { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--pay-text-muted); }
.cst b { font-family: var(--pay-mono); font-size: 18px; font-weight: 800; color: var(--pay-text); }
.cst b.cst-big { color: var(--pay-statutory); }

.comp-card { flex: none; width: 280px; max-width: 100%; padding: 15px 16px; border-radius: 16px; background: var(--pay-surface); border: 1px solid var(--pay-border-soft); }
.comp-head { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--pay-text-muted); margin-bottom: 10px; }
.comp-head svg { color: var(--pay-treasury); }
.comp-bar { display: flex; height: 16px; border-radius: 99px; overflow: hidden; background: var(--pay-surface-2); border: 1px solid var(--pay-border-soft); }
.comp-seg { height: 100%; background: var(--c); transform-origin: left; animation: seg-grow 0.7s var(--pay-ease) both; animation-delay: calc(var(--i) * 0.08s); box-shadow: inset -1px 0 0 rgba(0,0,0,0.18); }
.comp-empty { flex: 1; }
.comp-legend { display: flex; flex-wrap: wrap; gap: 9px 14px; margin-top: 11px; }
.cl { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; color: var(--pay-text-2); font-family: var(--pay-mono); }
.cl i { width: 9px; height: 9px; border-radius: 3px; }

/* ░░░░░░░░░░ PERIOD ░░░░░░░░░░ */
.deck { display: flex; }
.period { display: flex; gap: 8px; }
.sel-wrap { position: relative; }
.period select, .yr { background: var(--pay-surface); border: 1px solid var(--pay-border-soft); border-radius: 11px; padding: 9px 12px; color: var(--pay-text); font-size: 13px; outline: none; }
.period select { appearance: none; padding-right: 32px; cursor: pointer; }
.sel-caret { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--pay-text-muted); pointer-events: none; }
.yr { width: 92px; }

/* ░░░░░░░░░░ OBLIGATION CARDS ░░░░░░░░░░ */
.board { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.ob { --accent: var(--pay-treasury); position: relative; overflow: hidden; isolation: isolate; padding: 18px; border-radius: 18px;
  background: linear-gradient(160deg, var(--pay-surface), var(--pay-surface-2)); border: 1px solid var(--pay-border-soft);
  box-shadow: 0 1px 0 rgba(255,255,255,0.03) inset, 0 14px 34px -26px rgba(0,0,0,0.7);
  transition: transform 0.35s var(--pay-ease), border-color 0.35s var(--pay-ease), box-shadow 0.35s var(--pay-ease);
  animation: pay-rise 0.5s var(--pay-ease) both; animation-delay: calc(var(--i) * 0.07s); }
.ob.a-gold { --accent: var(--pay-treasury); } .ob.a-ember { --accent: var(--pay-ember); }
.ob.a-amber { --accent: var(--pay-amber); } .ob.a-bronze { --accent: var(--pay-statutory); }
.ob:hover { transform: translateY(-5px); border-color: var(--accent); box-shadow: 0 1px 0 rgba(255,255,255,0.05) inset, 0 22px 48px -26px color-mix(in srgb, var(--accent) 55%, transparent); }
.ob-spot { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: -1; opacity: var(--sp, 0); transition: opacity 0.4s var(--pay-ease);
  background: radial-gradient(220px circle at var(--mx,50%) var(--my,50%), color-mix(in srgb, var(--accent) 18%, transparent), transparent 60%); }
.ob-seal { position: absolute; right: -10px; bottom: -10px; color: var(--accent); opacity: 0.07; transform: rotate(-8deg); pointer-events: none; }
.ob:hover .ob-seal { opacity: 0.12; }
.ob-head { display: flex; align-items: center; gap: 11px; margin-bottom: 14px; }
.ob-ico { flex: none; width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; color: var(--accent);
  background: color-mix(in srgb, var(--accent) 14%, transparent); border: 1px solid var(--pay-border-soft); }
.ob-titles { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.ob-name { font-size: 13.5px; font-weight: 700; color: var(--pay-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ob-auth { font-size: 10px; font-family: var(--pay-mono); color: var(--accent); }
.ob-due { flex: none; display: inline-flex; align-items: center; gap: 4px; font-family: var(--pay-mono); font-size: 9.5px; font-weight: 700;
  padding: 3px 8px; border-radius: 999px; color: var(--pay-text-muted); background: var(--pay-surface); border: 1px solid var(--pay-border-soft); }
.ob-due.urgent { color: var(--pay-deduction); border-color: color-mix(in srgb, var(--pay-deduction) 40%, transparent); background: var(--pay-deduction-soft); }
.ob-amt { margin-bottom: 14px; } .ob-amt :deep(.pay-money) { font-size: 26px; }
.ob-split { display: flex; flex-direction: column; gap: 7px; }
.sp-bar { display: flex; height: 9px; border-radius: 99px; overflow: hidden; background: var(--pay-surface); border: 1px solid var(--pay-border-soft); }
.sp-emp { background: color-mix(in srgb, var(--accent) 45%, var(--pay-surface-2)); transform-origin: left; animation: seg-grow 0.7s var(--pay-ease) 0.2s both; }
.sp-er { background: var(--accent); transform-origin: left; animation: seg-grow 0.7s var(--pay-ease) 0.3s both; }
.sp-legend { display: flex; justify-content: space-between; font-size: 10.5px; color: var(--pay-text-muted); font-family: var(--pay-mono); }
.sp-legend .d { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 5px; vertical-align: -1px; }
.sp-legend .d.emp { background: color-mix(in srgb, var(--accent) 45%, var(--pay-surface-2)); } .sp-legend .d.er { background: var(--accent); }
.ob-single { min-height: 24px; }
.os-lbl { font-size: 11px; color: var(--pay-text-muted); line-height: 1.45; }
.ob-foot { margin-top: 14px; padding-top: 12px; border-top: 1px dashed var(--pay-border-soft); }
.ob-form { display: inline-flex; align-items: center; gap: 6px; font-family: var(--pay-mono); font-size: 10.5px; color: var(--pay-text-2); }
.ob-form svg { color: var(--accent); }

/* ░░░░░░░░░░ RATES EDITOR ░░░░░░░░░░ */
.rates { padding: 20px; border-radius: 18px; background: var(--pay-surface); border: 1px solid var(--pay-border-soft); animation: pay-rise 0.5s var(--pay-ease) 0.1s both; }
.rates-head { margin-bottom: 14px; }
.rates-head h3 { margin: 0; font-size: 15px; color: var(--pay-text); display: flex; align-items: center; gap: 8px; }
.ry { font-family: var(--pay-mono); font-size: 11px; color: var(--pay-treasury); background: rgba(251,191,36,0.12); padding: 2px 8px; border-radius: 6px; }
.hint { font-size: 11px; color: var(--pay-text-muted); display: block; margin-top: 4px; }
.rate-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; }
.rate-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 13px; border-radius: 12px;
  background: var(--pay-surface-2); border: 1px solid var(--pay-border-soft); animation: pay-rise 0.4s var(--pay-ease) both; animation-delay: calc(var(--i) * 0.03s);
  transition: border-color 0.25s var(--pay-ease); }
.rate-row:hover { border-color: var(--pay-border); }
.rr-key { min-width: 0; }
.rr-name { display: block; font-size: 12.5px; font-weight: 600; color: var(--pay-text); }
.rr-raw { font-family: var(--pay-mono); font-size: 9.5px; color: var(--pay-text-muted); } .rr-raw em { font-style: normal; color: var(--pay-treasury); }
.rr-edit { display: flex; align-items: center; gap: 7px; flex: none; }
.rr-in { width: 96px; background: var(--pay-surface); border: 1px solid var(--pay-border-soft); border-radius: 8px; padding: 6px 9px; color: var(--pay-text); text-align: right; font-family: var(--pay-mono); font-size: 12px; outline: none; transition: border-color 0.2s; }
.rr-in:focus { border-color: var(--pay-amber); }
.rr-save { display: inline-flex; align-items: center; gap: 4px; padding: 6px 11px; border-radius: 8px; border: 1px solid var(--pay-border-soft);
  background: var(--pay-surface); color: var(--pay-text-muted); cursor: pointer; font-size: 11px; font-weight: 700; transition: 0.2s var(--pay-ease); }
.rr-save.dirty { color: #1a1206; background: var(--pay-grad-cta); border-color: transparent; box-shadow: 0 6px 16px -8px rgba(234,88,12,0.5); }
.rr-save:disabled { opacity: 0.45; cursor: not-allowed; }
.json-note { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--pay-text-muted); margin: 14px 0 0; }
.json-note svg { color: var(--pay-treasury); }

/* ░░░░░░░░░░ RESPONSIVE ░░░░░░░░░░ */
@media (max-width: 820px) { .cmd { justify-content: center; } .comp-card { width: 100%; } }

/* ░░░░░░░░░░ LIGHT THEME ░░░░░░░░░░ */
[data-theme="light"] .rr-save.dirty { color: #2a1a06; }

/* ░░░░░░░░░░ REDUCED MOTION ░░░░░░░░░░ */
@media (prefers-reduced-motion: reduce) {
  .cmd, .ob, .rates, .rate-row, .comp-seg, .sp-emp, .sp-er { animation: none !important; }
  .ob:hover { transform: none; }
}
</style>
