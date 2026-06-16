<template>
  <div class="sst">
    <!-- loading -->
    <div v-if="loading" class="sst-load">
      <div class="pay-skel" style="height:70px" />
      <div class="pay-skel" style="height:230px" />
      <div class="pay-skel" style="height:190px" />
      <div class="pay-skel" style="height:220px" />
    </div>

    <PayEmptyState v-else-if="unlinked" :icon="Landmark"
      title="No tax profile yet"
      sub="Your tax statement appears once your account is linked to an employee profile and payroll is processed." />

    <template v-else>
      <!-- ░░ header + YTD telemetry ░░ -->
      <header class="sst-head">
        <div class="sh-lead">
          <span class="eyebrow"><Landmark :size="13" /> My tax · FY {{ summary.fiscal_year }}</span>
          <h1>Your tax, on the ledger.</h1>
          <span class="sh-regime" :data-regime="summary.regime || 'NEW'">
            <ShieldCheck :size="12" /> {{ (summary.regime || 'NEW') }} regime
          </span>
        </div>
        <div class="ytd">
          <div v-for="(t, i) in ytd" :key="t.label" class="ytd-tile" :style="{ '--ac': t.color, animationDelay: (0.05 * i) + 's' }">
            <span class="yt-l">{{ t.label }}</span>
            <span class="yt-v"><PayMoneyValue :value="t.value" short :tone="t.tone" /></span>
          </div>
        </div>
      </header>

      <!-- ░░ HERO — tax statement ░░ -->
      <section class="deck" @pointermove="spot" @pointerleave="unspot">
        <span class="deck-aura" aria-hidden="true" />
        <span class="p-spot" aria-hidden="true" />
        <div class="deck-grid">
          <div class="deck-main">
            <span class="d-eyebrow">Tax deducted at source · FY {{ summary.fiscal_year }}</span>
            <div class="d-tds"><PayMoneyValue :value="summary.tds" tone="deduction" :duration="950" /></div>
            <p class="d-sub">From {{ summary.slips_count }} released payslip{{ summary.slips_count === 1 ? '' : 's' }} · gross paid
              <b><PayMoneyValue :value="summary.gross" short /></b></p>

            <!-- statutory composition bar -->
            <div class="comp-bar" v-if="compTotal > 0">
              <span v-for="seg in compSegs" :key="seg.key" class="comp-seg" :style="{ width: seg.pct + '%', background: seg.color }" :title="`${seg.label}: ${inr(seg.value)}`" />
            </div>
            <div class="comp-key">
              <span v-for="seg in compSegs" :key="seg.key" class="ck"><i :style="{ background: seg.color }" />{{ seg.label }}</span>
            </div>
          </div>

          <div class="ident">
            <div class="id-row" v-for="r in identRows" :key="r.label"><span>{{ r.label }}</span><b>{{ r.value || '—' }}</b></div>
          </div>
        </div>
      </section>

      <!-- ░░ statutory split + month strip ░░ -->
      <div class="grid-2">
        <section class="card a1">
          <header class="card-head"><span class="hn">01</span><h3>Statutory deductions</h3></header>
          <div class="stat-list">
            <div v-for="(s, i) in statRows" :key="s.key" class="stat-row" :style="{ '--c': s.color, animationDelay: (0.05 * i) + 's' }">
              <span class="sr-name">{{ s.label }}</span>
              <div class="sr-track"><span class="sr-fill" :style="{ width: s.pct + '%' }" /></div>
              <span class="sr-amt"><PayMoneyValue :value="s.value" short :animate="false" /></span>
            </div>
            <p v-if="!statRows.length" class="muted">No statutory deductions recorded this year.</p>
          </div>
        </section>

        <section class="card a2">
          <header class="card-head"><span class="hn">02</span><h3>Month-by-month TDS</h3></header>
          <div class="months">
            <div v-for="(m, i) in summary.months" :key="i" class="mo" :class="{ on: Number(m.tds) > 0 }">
              <span class="mo-bar-wrap"><span class="mo-bar" :style="{ height: moHeight(m) + '%', animationDelay: (0.03 * i) + 's' }" /></span>
              <span class="mo-lbl">{{ m.label[0] }}</span>
              <span class="mo-tip">{{ m.label }} {{ m.year }} · ₹{{ inrShort(m.tds) }}</span>
            </div>
          </div>
          <div class="mo-foot"><span>Apr</span><span class="muted">peak ₹{{ inrShort(peakTds) }}/mo</span><span>Mar</span></div>
        </section>
      </div>

      <!-- ░░ Form 12BB — investment & exemption declaration (the form YOU fill) ░░ -->
      <section class="deck studio">
        <div class="deck-head">
          <span class="eyebrow"><Scale :size="12" /> Form 12BB · Investment &amp; Exemption Declaration</span>
          <h2 class="deck-title pay-foil-text">Declare to lower your TDS</h2>
          <p class="deck-sub">This is the <b>one form you fill</b> — Form 12BB (Rule 26C). Declare your rent, home-loan interest
            and Chapter VI-A investments so the right tax is deducted from your salary. <b>Old regime only</b> — the New regime
            ignores these and applies a flat ₹75,000 standard deduction. Your <b>Form 16</b> (below) is issued by HR — you don't fill it.</p>
        </div>

        <div class="f12-top">
          <label class="fld ag"><span>Annual gross (₹)</span>
            <input :value="form.annual_gross" inputmode="decimal" class="no-spin" placeholder="auto from CTC"
                   @input="onNum($event, 'annual_gross')" @keydown="blockE" /></label>
          <div class="regime-pick">
            <span class="rp-lbl">Tax regime · your election</span>
            <div class="rp-toggle" :data-on="regime">
              <span class="rp-pill" aria-hidden="true" />
              <button :class="{ on: regime === 'OLD' }" @click="regime = 'OLD'">Old</button>
              <button :class="{ on: regime === 'NEW' }" @click="regime = 'NEW'">New</button>
            </div>
          </div>
        </div>

        <div v-for="g in DECL_GROUPS" :key="g.title" class="f12-group" :class="{ dim: regime === 'NEW' }">
          <div class="f12-gh"><span class="f12-gt">{{ g.title }}</span><span class="f12-gn">{{ g.note }}</span></div>
          <div class="f12-grid">
            <label v-for="d in g.fields" :key="d.key" class="fld" :title="d.help">
              <span>{{ d.label }} <Info :size="10" class="hlp" /></span>
              <input :value="form[d.key]" inputmode="decimal" class="no-spin" :placeholder="d.placeholder"
                     @input="onNum($event, d.key)" @keydown="blockE" />
            </label>
          </div>
        </div>

        <div v-if="regime === 'NEW'" class="regime-warn">
          <Info :size="13" /> You've elected the <b>New regime</b>, so these declarations won't reduce your tax. Switch to <b>Old</b> above to apply them.
        </div>

        <div class="studio-acts">
          <button class="btn primary" :disabled="saving" @click="save"><Save :size="14" /> {{ saving ? 'Saving…' : 'Save declarations' }}</button>
          <button class="btn ghost" :disabled="recomputing" @click="recompute()"><RefreshCw :size="14" :class="{ spin: recomputing }" /> Recompute</button>
          <span v-if="recommended" class="reco"><Sparkles :size="12" /> {{ recommended }} regime saves you {{ inr(savingAmt) }}/yr</span>
        </div>

        <!-- live face-off -->
        <div v-if="projection" class="duel">
          <article v-for="r in [projection.old_regime, projection.new_regime]" :key="r.regime"
            class="panel" :class="{ win: projection.recommended === r.regime, picked: regime === r.regime }">
            <header class="p-head">
              <div class="p-name">{{ r.regime === 'OLD' ? 'Old regime' : 'New regime' }}
                <span class="p-tag">{{ r.regime === 'OLD' ? 'with deductions' : 'simplified' }}</span></div>
              <span v-if="projection.recommended === r.regime" class="p-win"><Crown :size="12" /> Best</span>
            </header>
            <div class="p-tax">
              <span class="p-tax-lbl">Annual tax</span>
              <PayMoneyValue class="p-tax-val" tone="deduction" :value="r.annual_tax" />
              <span class="p-eff">{{ inr(r.monthly_tds) }}/mo TDS · {{ effRate(r) }}% of gross</span>
            </div>
            <div class="p-rows">
              <div class="p-row"><span>Annual gross</span><PayMoneyValue :value="r.annual_gross" :animate="false" /></div>
              <div class="p-row"><span>Taxable income</span><PayMoneyValue :value="r.taxable_income" :animate="false" /></div>
            </div>
            <div class="meter"><span class="meter-tax" :style="{ width: effRate(r) + '%' }" /></div>
            <div class="meter-key"><span>Keep {{ (100 - effRate(r)).toFixed(1) }}%</span><span>Tax {{ effRate(r) }}%</span></div>
          </article>
        </div>
      </section>

      <!-- ░░ tax documents (Phase C) — issued BY the employer ░░ -->
      <section class="card docs">
        <header class="card-head"><span class="hn">03</span><h3>My tax documents</h3>
          <span class="muted dc-note">Issued by HR · download to file your ITR</span></header>
        <div class="docs-explain"><Info :size="13" /> <span><b>Form 16</b> is your TDS certificate, issued by the employer (Part A = tax deposited, Part B = salary &amp; tax computation). You don't fill it — download it and use it to file your annual <b>Income-Tax Return (ITR)</b> on the income-tax portal.</span></div>
        <div v-if="docs.length" class="doc-list">
          <article v-for="(d, i) in docs" :key="d.id" class="doc" :style="{ animationDelay: (0.05 * i) + 's' }">
            <span class="doc-ic"><FileText :size="18" /></span>
            <div class="doc-meta">
              <b>{{ d.title || ('Form 16 · FY ' + d.fiscal_year) }}</b>
              <small>FY {{ d.fiscal_year }} · TDS ₹{{ inrShort(d.tds_total) }} · {{ fmtDate(d.published_at || d.generated_at) }}</small>
            </div>
            <button class="doc-dl" @click="download(d)"><Download :size="15" /> PDF</button>
          </article>
        </div>
        <PayEmptyState v-else :icon="FileText" title="No documents issued yet"
          sub="Your Form-16 and tax certificates will appear here once HR generates them for a closed financial year." />
      </section>
    </template>
  </div>
</template>

<script setup>
// NOTE: motion-v is deliberately NOT used here. Entrances are CSS keyframes
// (pay-rise) — this page re-renders on async recompute, and motion-v's
// onVnodeUpdated has crashed on async-patched subtrees in this module
// (see PayTaxSection.vue). PayMoneyValue/PayCountUp still animate via rAF.
import { ref, reactive, computed, onMounted } from 'vue'
import { Landmark, ShieldCheck, Scale, Save, RefreshCw, Sparkles, Crown, FileText, Download, Info } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'

import '@/styles/payroll-theme.css'
import PayMoneyValue from './payroll/components/PayMoneyValue.vue'
import PayEmptyState from './payroll/components/PayEmptyState.vue'
import { inr, inrShort, fyLabel } from '@/composables/usePayroll'
import {
  fetchMyTaxSummary, fetchMyTaxProjection, saveMyTaxDeclarations,
  fetchMyTaxDocuments, downloadMyTaxDocPdf,
} from '@/composables/usePayslip'

const toast = useToast()
const loading = ref(true)
const unlinked = ref(false)
const summary = ref({ fiscal_year: fyLabel(), months: [] })
const projection = ref(null)
const docs = ref([])
const saving = ref(false)
const recomputing = ref(false)
const regime = ref('NEW')

const DECL_KEYS = ['sec_80c', 'sec_80ccd_1b', 'sec_80d', 'sec_80e', 'sec_80g', 'sec_80tta', 'home_loan_interest', 'hra_exemption', 'lta_exemption']
const form = reactive(Object.fromEntries([['annual_gross', null], ...DECL_KEYS.map(k => [k, null])]))
const DECL_GROUPS = [
  {
    title: 'Chapter VI-A deductions', note: 'Investments & payments',
    fields: [
      { key: 'sec_80c', label: '80C', placeholder: 'max ₹1.5L', help: 'EPF / PPF, ELSS, LIC, home-loan principal, tuition fees — capped at ₹1,50,000.' },
      { key: 'sec_80ccd_1b', label: '80CCD(1B)', placeholder: 'NPS · max ₹50k', help: 'Additional NPS contribution — over and above 80C, capped at ₹50,000.' },
      { key: 'sec_80d', label: '80D', placeholder: 'mediclaim', help: 'Health-insurance premium — self/family (more if covering senior-citizen parents).' },
      { key: 'sec_80e', label: '80E', placeholder: 'edu-loan interest', help: 'Interest on an education loan — no upper limit.' },
      { key: 'sec_80g', label: '80G', placeholder: 'donations', help: 'Eligible donations to approved funds / charities.' },
      { key: 'sec_80tta', label: '80TTA', placeholder: 'max ₹10k', help: 'Interest from savings accounts — capped at ₹10,000.' },
    ],
  },
  {
    title: 'Exemptions & allowances', note: 'Rent, travel & home loan',
    fields: [
      { key: 'hra_exemption', label: 'HRA exemption', placeholder: 'exempt rent portion', help: 'House Rent Allowance — least of actual HRA, rent − 10% of salary, or 40/50% of salary.' },
      { key: 'lta_exemption', label: 'LTA', placeholder: 'travel exemption', help: 'Leave Travel Allowance — domestic travel, 2 trips in a 4-year block.' },
      { key: 'home_loan_interest', label: 'Home-loan interest', placeholder: 'Sec 24(b) · max ₹2L', help: 'Interest on a self-occupied house loan — Section 24(b), capped at ₹2,00,000.' },
    ],
  },
]
const declPayload = () => Object.fromEntries(DECL_KEYS.map(k => [k, Number(form[k]) || 0]))

const num = (v) => Number(v || 0)

// ── YTD telemetry ──
const ytd = computed(() => {
  const s = summary.value
  const statutory = num(s.tds) + num(s.pf_employee) + num(s.esi_employee) + num(s.professional_tax) + num(s.lwf)
  return [
    { label: 'TDS · YTD', value: num(s.tds), tone: 'deduction', color: 'var(--pay-deduction)' },
    { label: 'PF · employee', value: num(s.pf_employee), tone: 'statutory', color: 'var(--pay-statutory)' },
    { label: 'Statutory · total', value: statutory, tone: 'statutory', color: 'var(--pay-treasury)' },
    { label: 'Gross paid', value: num(s.gross), tone: '', color: 'var(--pay-mint)' },
  ]
})

// ── statutory composition (hero bar) ──
const compSegs = computed(() => {
  const s = summary.value
  const segs = [
    { key: 'tds', label: 'TDS', value: num(s.tds), color: 'var(--pay-deduction)' },
    { key: 'pf', label: 'PF', value: num(s.pf_employee) + num(s.pf_employer), color: 'var(--pay-treasury)' },
    { key: 'esi', label: 'ESI', value: num(s.esi_employee) + num(s.esi_employer), color: 'var(--pay-mint)' },
    { key: 'pt', label: 'PT', value: num(s.professional_tax), color: 'var(--pay-amber)' },
    { key: 'lwf', label: 'LWF', value: num(s.lwf), color: 'var(--pay-ember)' },
  ].filter(x => x.value > 0)
  const total = segs.reduce((a, x) => a + x.value, 0) || 1
  return segs.map(x => ({ ...x, pct: Math.max(2, (x.value / total) * 100) }))
})
const compTotal = computed(() => compSegs.value.reduce((a, x) => a + x.value, 0))

// ── statutory split list ──
const statRows = computed(() => {
  const s = summary.value
  const rows = [
    { key: 'tds', label: 'TDS', value: num(s.tds), color: 'var(--pay-deduction)' },
    { key: 'pfe', label: 'PF · employee', value: num(s.pf_employee), color: 'var(--pay-treasury)' },
    { key: 'pfr', label: 'PF · employer', value: num(s.pf_employer), color: 'var(--pay-statutory)' },
    { key: 'esie', label: 'ESI · employee', value: num(s.esi_employee), color: 'var(--pay-mint)' },
    { key: 'esir', label: 'ESI · employer', value: num(s.esi_employer), color: 'var(--pay-net)' },
    { key: 'pt', label: 'Professional tax', value: num(s.professional_tax), color: 'var(--pay-amber)' },
    { key: 'lwf', label: 'Labour Welfare Fund', value: num(s.lwf), color: 'var(--pay-ember)' },
  ].filter(x => x.value > 0).sort((a, b) => b.value - a.value)
  const max = Math.max(1, ...rows.map(r => r.value))
  return rows.map(r => ({ ...r, pct: Math.max(4, (r.value / max) * 100) }))
})

// ── identity ──
const identRows = computed(() => {
  const s = summary.value
  return [
    { label: 'PAN', value: s.pan }, { label: 'UAN', value: s.uan },
    { label: 'PF number', value: s.pf_number }, { label: 'ESIC number', value: s.esic_number },
  ]
})

// ── month strip ──
const peakTds = computed(() => Math.max(0, ...(summary.value.months || []).map(m => num(m.tds))))
const moHeight = (m) => peakTds.value > 0 ? Math.max(4, (num(m.tds) / peakTds.value) * 100) : 4

// ── face-off ──
const effRate = (r) => { const g = num(r.annual_gross); return g ? Math.min(100, (num(r.annual_tax) / g) * 100).toFixed(1) : '0.0' }
const recommended = computed(() => projection.value ? (projection.value.recommended === 'OLD' ? 'Old' : 'New') : '')
const savingAmt = computed(() => projection.value
  ? Math.abs(num(projection.value.old_regime.annual_tax) - num(projection.value.new_regime.annual_tax)) : 0)

// ── numeric inputs (no spinner, digits + one dot) ──
function sanitize(v) {
  let s = String(v).replace(/[^\d.]/g, '')
  const i = s.indexOf('.')
  if (i !== -1) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '')
  return s
}
function onNum(e, key) { const c = sanitize(e.target.value); if (c !== e.target.value) e.target.value = c; form[key] = c }
function blockE(e) { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault() }

const fmtDate = (s) => { if (!s) return '—'; try { return new Date(s).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return '' } }

const recompute = async () => {
  recomputing.value = true
  try {
    projection.value = await fetchMyTaxProjection({
      annual_gross: form.annual_gross ? Number(form.annual_gross) : null,
      declarations: declPayload(),
    })
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not project tax') }
  finally { recomputing.value = false }
}
const save = async () => {
  saving.value = true
  try {
    projection.value = await saveMyTaxDeclarations({ ...declPayload(), tax_regime: regime.value })
    summary.value = { ...summary.value, regime: regime.value }
    toast.success('Form 12BB declaration saved')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not save declarations') }
  finally { saving.value = false }
}
const download = async (d) => {
  try { await downloadMyTaxDocPdf(d.id, `Form16-${d.fiscal_year}`) }
  catch (e) { toast.error(e?.response?.status === 503 ? 'PDF engine unavailable (GTK)' : 'Download failed') }
}

// ── pointer spotlight on the hero ──
const spot = (e) => { const el = e.currentTarget, b = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${e.clientX - b.left}px`); el.style.setProperty('--my', `${e.clientY - b.top}px`); el.style.setProperty('--sp', '1') }
const unspot = (e) => e.currentTarget.style.setProperty('--sp', '0')

const load = async () => {
  loading.value = true
  try {
    const s = await fetchMyTaxSummary()
    unlinked.value = !!s.unlinked
    summary.value = s.unlinked ? { fiscal_year: fyLabel(), months: [] } : s
    if (!unlinked.value) {
      regime.value = s.regime === 'OLD' ? 'OLD' : 'NEW'
      const d = s.declarations || {}
      for (const k of DECL_KEYS) if (d[k] != null && Number(d[k]) > 0) form[k] = String(d[k])
      const [proj, dl] = await Promise.all([
        fetchMyTaxProjection({ declarations: declPayload() }).catch(() => null),
        fetchMyTaxDocuments().catch(() => ({ items: [] })),
      ])
      projection.value = proj
      docs.value = dl.items || []
    }
  } catch (e) { toast.error('Failed to load tax statement') }
  finally { loading.value = false }
}
onMounted(load)
</script>

<style scoped>
.sst { position: relative; min-height: 100%; padding: 24px 28px 60px; color: var(--pay-text); background: var(--pay-canvas);
  display: flex; flex-direction: column; gap: 18px; }
.sst-load { display: flex; flex-direction: column; gap: 16px; }
.muted { color: var(--pay-text-muted); font-style: italic; font-size: 12.5px; }

/* ░░ header ░░ */
.sst-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
.eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--pay-mono); font-size: 11px;
  text-transform: uppercase; letter-spacing: 0.14em; color: var(--pay-treasury); }
.sh-lead h1 { margin: 6px 0 0; font-size: clamp(26px, 4vw, 38px); font-weight: 800; letter-spacing: -0.03em; color: var(--pay-text); }
.sh-regime { display: inline-flex; align-items: center; gap: 5px; margin-top: 8px; font-size: 10.5px; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.06em; padding: 3px 10px; border-radius: 999px;
  color: var(--pay-treasury); background: rgba(251,191,36,0.12); border: 1px solid var(--pay-border-soft); }
.sh-regime[data-regime="OLD"] { color: var(--pay-amber); }

.ytd { display: grid; grid-template-columns: repeat(4, minmax(96px, 1fr)); gap: 12px; flex: 1; max-width: 580px; }
.ytd-tile { padding: 11px 13px; border-radius: 14px; background: var(--pay-surface); border: 1px solid var(--pay-border-soft);
  border-top: 2px solid var(--ac); animation: pay-rise 0.5s var(--pay-ease) both; }
.yt-l { display: block; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--pay-text-muted); }
.yt-v { display: block; margin-top: 4px; font-size: 18px; font-weight: 900; }
.yt-v :deep(.pay-money) { font-size: 18px; }

/* ░░ deck / hero ░░ */
.deck { position: relative; overflow: hidden; isolation: isolate; border-radius: 22px; padding: 22px 24px;
  background: linear-gradient(150deg, var(--pay-surface), var(--pay-surface-2)); border: 1px solid var(--pay-border-soft);
  box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset, 0 18px 50px -34px rgba(0,0,0,0.8);
  animation: pay-rise 0.55s var(--pay-ease) both; }
.deck::before { content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1px; pointer-events: none; opacity: 0.7;
  background: linear-gradient(140deg, rgba(146,64,14,0.5), transparent 38%, transparent 62%, rgba(184,134,11,0.32));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; }
.deck-aura { position: absolute; top: -50%; right: -8%; width: 50%; height: 200%; z-index: -1; pointer-events: none;
  background: radial-gradient(closest-side, rgba(146,64,14,0.16), transparent 70%); animation: pay-aurora-drift 12s ease-in-out infinite; }
.p-spot { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 0; opacity: var(--sp, 0); transition: opacity 0.4s var(--pay-ease);
  background: radial-gradient(260px circle at var(--mx,50%) var(--my,50%), rgba(245,158,11,0.14), transparent 60%); }

.deck-grid { position: relative; z-index: 1; display: grid; grid-template-columns: 1fr 240px; gap: 22px; align-items: center; }
.d-eyebrow { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--pay-statutory); }
.d-tds { font-size: 12px; margin-top: 4px; }
.d-tds :deep(.pay-money) { font-size: 40px; letter-spacing: -0.02em; }
.d-sub { margin: 6px 0 0; font-size: 12.5px; color: var(--pay-text-2); }
.d-sub b :deep(.pay-money) { font-size: 12.5px; color: var(--pay-text); }
.comp-bar { display: flex; height: 11px; border-radius: 999px; overflow: hidden; margin-top: 16px; background: var(--pay-surface); border: 1px solid var(--pay-border-soft); }
.comp-seg { height: 100%; transition: width 0.9s var(--pay-ease); }
.comp-key { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 9px; font-size: 10.5px; color: var(--pay-text-muted); }
.ck { display: inline-flex; align-items: center; gap: 5px; }
.ck i { width: 9px; height: 9px; border-radius: 3px; }

.ident { display: flex; flex-direction: column; gap: 2px; padding: 14px 16px; border-radius: 14px;
  background: var(--pay-surface); border: 1px dashed var(--pay-border); }
.id-row { display: flex; justify-content: space-between; gap: 12px; padding: 7px 0; border-bottom: 1px dotted var(--pay-border-soft); font-size: 12px; }
.id-row:last-child { border-bottom: none; }
.id-row span { color: var(--pay-text-muted); text-transform: uppercase; font-size: 9.5px; letter-spacing: 0.06em; align-self: center; }
.id-row b { font-family: var(--pay-mono); color: var(--pay-text); font-size: 12.5px; }

/* ░░ grid cards ░░ */
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.card { position: relative; overflow: hidden; border-radius: 18px; padding: 18px 20px;
  background: linear-gradient(165deg, var(--pay-surface), var(--pay-surface-2)); border: 1px solid var(--pay-border-soft);
  box-shadow: 0 1px 0 rgba(255,255,255,0.03) inset, 0 14px 34px -26px rgba(0,0,0,0.7); animation: pay-rise 0.55s var(--pay-ease) both; }
.card.a2 { animation-delay: 0.08s; }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.hn { font-family: var(--pay-mono); font-size: 11px; color: var(--pay-amber); }
.card-head h3 { margin: 0; font-size: 14px; font-weight: 800; color: var(--pay-text); flex: 1; }
.dc-note { font-style: normal; }

.stat-list { display: flex; flex-direction: column; gap: 9px; }
.stat-row { display: grid; grid-template-columns: 116px 1fr auto; align-items: center; gap: 12px; animation: pay-rise 0.5s var(--pay-ease) both; }
.sr-name { font-size: 12px; color: var(--pay-text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sr-track { height: 9px; border-radius: 999px; background: var(--pay-surface); border: 1px solid var(--pay-border-soft); overflow: hidden; }
.sr-fill { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, color-mix(in srgb, var(--c) 65%, transparent), var(--c));
  box-shadow: 0 0 12px -3px var(--c); width: 0; animation: sr-grow 0.9s var(--pay-ease) 0.1s forwards; }
.sr-amt { font-size: 12.5px; }
@keyframes sr-grow { from { transform: scaleX(0); transform-origin: left; } }

.months { display: flex; align-items: flex-end; gap: 5px; height: 120px; padding-top: 6px; }
.mo { position: relative; flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; }
.mo-bar-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; justify-content: center; }
.mo-bar { width: 70%; max-width: 16px; border-radius: 5px 5px 2px 2px; background: var(--pay-surface-2); border: 1px solid var(--pay-border-soft);
  transition: height 0.7s var(--pay-ease); }
.mo.on .mo-bar { background: linear-gradient(180deg, var(--pay-amber), var(--pay-deduction)); border-color: transparent; box-shadow: 0 0 10px -3px var(--pay-amber); }
.mo-lbl { font-size: 9px; color: var(--pay-text-muted); font-family: var(--pay-mono); }
.mo-tip { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%) translateY(-4px); white-space: nowrap;
  background: var(--pay-glass); backdrop-filter: var(--pay-glass-blur); border: 1px solid var(--pay-border); border-radius: 8px;
  padding: 4px 8px; font-size: 10px; color: var(--pay-text); opacity: 0; pointer-events: none; transition: opacity 0.2s; z-index: 3; }
.mo:hover .mo-tip { opacity: 1; }
.mo-foot { display: flex; justify-content: space-between; margin-top: 8px; font-size: 10px; color: var(--pay-text-muted); }

/* ░░ studio ░░ */
.studio { display: flex; flex-direction: column; }
.deck-head { position: relative; z-index: 1; }
.deck-title { margin: 7px 0 0; font-size: 24px; font-weight: 850; }
.deck-sub { margin: 8px 0 16px; font-size: 12.5px; color: var(--pay-text-2); max-width: 64ch; line-height: 1.5; }
.decls { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(3, 1fr) auto; gap: 12px; align-items: end; }
/* Form 12BB layout */
.f12-top { position: relative; z-index: 1; display: grid; grid-template-columns: 1fr auto; gap: 14px; align-items: end; margin-bottom: 4px; }
.f12-group { position: relative; z-index: 1; margin-top: 14px; transition: opacity 0.3s var(--pay-ease); }
.f12-group.dim { opacity: 0.5; }
.f12-gh { display: flex; align-items: baseline; gap: 9px; margin-bottom: 9px; }
.f12-gt { font-size: 12px; font-weight: 800; color: var(--pay-text); }
.f12-gn { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--pay-text-muted); }
.f12-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.hlp { color: var(--pay-text-muted); opacity: 0.7; vertical-align: -1px; cursor: help; }
.regime-warn { display: flex; align-items: center; gap: 8px; margin-top: 14px; padding: 10px 13px; border-radius: 11px; font-size: 12px;
  color: var(--pay-amber); background: rgba(245,158,11,0.08); border: 1px solid var(--pay-border-soft); }
.regime-warn svg { flex: none; }
.fld { display: flex; flex-direction: column; gap: 6px; }
.fld > span { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--pay-text-muted); display: inline-flex; align-items: center; gap: 4px; }
.fld input { width: 100%; box-sizing: border-box; background: var(--pay-surface-2); border: 1px solid var(--pay-border-soft);
  border-radius: 10px; padding: 10px 12px; color: var(--pay-text); font-size: 13px; outline: none; font-family: inherit;
  transition: border-color 0.25s var(--pay-ease), box-shadow 0.25s var(--pay-ease); }
.fld input:focus { border-color: var(--pay-amber); box-shadow: 0 0 0 3px rgba(245,158,11,0.12); }
.no-spin::-webkit-outer-spin-button, .no-spin::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.no-spin { -moz-appearance: textfield; appearance: textfield; }
.regime-pick { display: flex; flex-direction: column; gap: 6px; }
.rp-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--pay-text-muted); }
.rp-toggle { position: relative; display: grid; grid-template-columns: 1fr 1fr; gap: 0; padding: 3px; border-radius: 11px;
  background: var(--pay-surface-2); border: 1px solid var(--pay-border-soft); }
.rp-pill { position: absolute; top: 3px; bottom: 3px; left: 3px; width: calc(50% - 3px); border-radius: 8px;
  background: var(--pay-grad-cta); box-shadow: 0 4px 12px -6px rgba(245,158,11,0.6); transition: transform 0.36s var(--pay-spring); }
.rp-toggle[data-on="NEW"] .rp-pill { transform: translateX(100%); }
.rp-toggle button { position: relative; z-index: 1; background: none; border: none; cursor: pointer; padding: 8px 14px;
  font-size: 12.5px; font-weight: 700; color: var(--pay-text-2); transition: color 0.25s; }
.rp-toggle button.on { color: #1a1206; }

.studio-acts { position: relative; z-index: 1; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 16px; }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 18px; border-radius: 11px; cursor: pointer; font-weight: 700; font-size: 13px; border: 1px solid transparent;
  transition: transform 0.2s var(--pay-spring), box-shadow 0.25s var(--pay-ease); }
.btn.primary { background: var(--pay-grad-cta); color: #1a1206; }
.btn.ghost { background: var(--pay-surface-2); border-color: var(--pay-border-soft); color: var(--pay-text-2); }
.btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 24px -12px rgba(245,158,11,0.5); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.spin { animation: pay-dial-spin 0.9s linear infinite; }
.reco { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--pay-net); font-family: var(--pay-mono); }

.duel { position: relative; z-index: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 18px; }
.panel { position: relative; overflow: hidden; padding: 18px; border-radius: 16px;
  background: linear-gradient(165deg, var(--pay-surface), var(--pay-surface-2)); border: 1px solid var(--pay-border-soft);
  transition: border-color 0.35s var(--pay-ease), box-shadow 0.35s var(--pay-ease); }
.panel.win { border-color: var(--pay-net); box-shadow: 0 0 0 1px var(--pay-net) inset, 0 18px 44px -26px rgba(52,211,153,0.4); }
.panel.picked::after { content: 'Your choice'; position: absolute; top: 12px; right: 12px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--pay-treasury); }
.p-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 14px; }
.p-name { font-size: 15px; font-weight: 800; color: var(--pay-text); display: flex; align-items: center; gap: 8px; }
.p-tag { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--pay-text-muted);
  padding: 2px 7px; border-radius: 6px; background: var(--pay-surface); }
.p-win { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 800; padding: 3px 9px; border-radius: 999px; color: #0a3a2a; background: var(--pay-net); }
.p-tax { display: flex; flex-direction: column; gap: 2px; padding-bottom: 13px; margin-bottom: 13px; border-bottom: 1px dashed var(--pay-border-soft); }
.p-tax-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--pay-text-muted); }
.p-tax-val :deep(.pay-money) { font-size: 28px; }
.p-eff { font-family: var(--pay-mono); font-size: 11px; color: var(--pay-text-muted); margin-top: 2px; }
.p-rows { display: flex; flex-direction: column; }
.p-row { display: flex; align-items: center; justify-content: space-between; padding: 7px 0; font-size: 12.5px; color: var(--pay-text-2); }
.p-row :deep(.pay-money) { font-size: 13px; }
.meter { height: 9px; border-radius: 99px; margin-top: 12px; overflow: hidden; position: relative; background: linear-gradient(90deg, var(--pay-net), var(--pay-net-strong)); }
.meter-tax { position: absolute; right: 0; top: 0; bottom: 0; width: 0; background: linear-gradient(90deg, var(--pay-amber), var(--pay-deduction)); transition: width 0.9s var(--pay-ease) 0.2s; }
.meter-key { display: flex; justify-content: space-between; margin-top: 7px; font-size: 10.5px; color: var(--pay-text-muted); }

/* ░░ documents ░░ */
.docs { padding-bottom: 8px; }
.docs-explain { display: flex; align-items: flex-start; gap: 9px; margin: -4px 0 14px; padding: 11px 13px; border-radius: 12px;
  font-size: 12px; line-height: 1.5; color: var(--pay-text-2); background: var(--pay-surface); border: 1px solid var(--pay-border-soft); }
.docs-explain svg { flex: none; margin-top: 2px; color: var(--pay-treasury); }
.docs-explain b { color: var(--pay-text); }
.doc-list { display: flex; flex-direction: column; gap: 10px; }
.doc { display: flex; align-items: center; gap: 13px; padding: 13px 15px; border-radius: 13px;
  background: var(--pay-surface); border: 1px solid var(--pay-border-soft); animation: pay-rise 0.5s var(--pay-ease) both;
  transition: border-color 0.25s var(--pay-ease), transform 0.25s var(--pay-spring); }
.doc:hover { border-color: var(--pay-border); transform: translateX(2px); }
.doc-ic { width: 40px; height: 40px; flex: none; border-radius: 11px; display: grid; place-items: center; color: var(--pay-treasury); background: rgba(251,191,36,0.12); }
.doc-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.doc-meta b { font-size: 13.5px; color: var(--pay-text); }
.doc-meta small { font-size: 11px; color: var(--pay-text-muted); }
.doc-dl { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; cursor: pointer; font-weight: 700; font-size: 12px;
  background: var(--pay-grad-cta); color: #1a1206; border: none; transition: transform 0.2s var(--pay-spring), box-shadow 0.25s var(--pay-ease); }
.doc-dl:hover { transform: translateY(-2px); box-shadow: 0 10px 22px -12px rgba(245,158,11,0.55); }

/* ░░ light theme ░░ */
[data-theme="light"] .btn.primary, [data-theme="light"] .doc-dl, [data-theme="light"] .rp-toggle button.on { color: #2a1a06; }
[data-theme="light"] .deck-aura { opacity: 0.6; }
[data-theme="light"] .p-win { color: #fff; }

/* ░░ responsive ░░ */
@media (max-width: 980px) { .deck-grid { grid-template-columns: 1fr; } .grid-2 { grid-template-columns: 1fr; }
  .decls, .f12-grid { grid-template-columns: 1fr 1fr; } .duel { grid-template-columns: 1fr; } }
@media (max-width: 820px) { .ytd { max-width: none; width: 100%; grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px) { .decls, .f12-grid { grid-template-columns: 1fr; } .f12-top { grid-template-columns: 1fr; } }

@media (prefers-reduced-motion: reduce) {
  .deck, .card, .ytd-tile, .stat-row, .doc, .deck-aura, .spin { animation: none !important; }
  .sr-fill, .comp-seg, .mo-bar, .meter-tax, .rp-pill, .btn { transition: none !important; }
  .sr-fill { width: var(--w, 100%); }
}
</style>
