<template>
  <div class="tax">
    <!-- ░░░░░░░░░░ CONTROL DECK ░░░░░░░░░░ -->
    <div class="deck">
      <span class="deck-aura" aria-hidden="true" />
      <div class="deck-head">
        <span class="eyebrow"><Landmark :size="12" /> TAX STUDIO · FY {{ fy }}</span>
        <h2 class="deck-title pay-foil-text">Regime Face-off</h2>
        <p class="deck-sub">Project annual income-tax under both regimes — computed automatically per Indian law (AY 2026-27) and recommended for you.</p>
      </div>

      <div class="picker">
        <label class="fld emp"><span>Employee</span>
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

        <div class="decls">
          <label class="fld"><span>Annual gross (₹)</span>
            <input v-model.number="form.annual_gross" type="number" placeholder="auto from CTC" @input="scheduleAuto" />
          </label>
          <label v-for="d in DECL_FIELDS" :key="d.key" class="fld">
            <span>{{ d.label }}
              <button type="button" class="info" @click.prevent="tip = tip === d.key ? null : d.key"><Info :size="11" /></button>
            </span>
            <input v-model.number="form[d.key]" type="number" :placeholder="d.placeholder" @input="scheduleAuto" />
            <transition name="tip">
              <span v-if="tip === d.key" class="tip">{{ d.help }}</span>
            </transition>
          </label>
        </div>

        <div class="hint-line"><Info :size="12" /> 80C, 80D &amp; HRA are <b>optional</b> — they only lower tax under the <b>old regime</b>. The <b>new regime</b> ignores them (flat ₹75k standard deduction). Leave blank to assume no deductions.</div>

        <div class="pk-acts">
          <button class="btn primary" :disabled="!employeeId || loading" @click="run()">
            <RefreshCw :size="14" :class="{ spin: loading }" /> {{ loading ? 'Computing…' : 'Recompute' }}
          </button>
          <button class="btn ghost" :disabled="!result || loading" @click="save"><Save :size="14" /> Save declarations</button>
          <span v-if="result && autoNote" class="auto-note"><Sparkles :size="12" /> auto-projected</span>
        </div>
      </div>
    </div>

    <PayEmptyState v-if="!result && !loading" :icon="Scale" title="Pick an employee"
      sub="Choose someone to instantly project their annual tax across both regimes and see which wins." />

    <!-- loading shimmer -->
    <div v-else-if="loading && !result" class="duel">
      <div v-for="i in 2" :key="i" class="panel"><div class="pay-skel" style="height:300px;border-radius:18px" /></div>
    </div>

    <template v-else-if="result">
      <!-- ░░░░░░░░░░ VERDICT ░░░░░░░░░░ -->
      <div class="verdict" :class="recClass">
        <div class="vd-scale" aria-hidden="true">
          <span class="vd-beam" :style="{ transform: `rotate(${beamTilt}deg)` }">
            <span class="vd-pan l" /><span class="vd-pan r" />
          </span>
          <span class="vd-fulcrum" />
        </div>
        <div class="vd-txt">
          <span class="vd-eyebrow">Recommended</span>
          <h3 class="vd-headline"><Crown :size="18" /> {{ recLabel }} regime</h3>
          <p class="vd-save" v-if="saving > 0">saves <b class="pay-foil-text">{{ inr(saving) }}</b> a year vs the {{ loserLabel }} regime</p>
          <p class="vd-save" v-else>both regimes land at the same tax this year</p>
        </div>
      </div>

      <!-- ░░░░░░░░░░ REGIME PANELS ░░░░░░░░░░ -->
      <div class="duel">
        <article v-for="(r, idx) in [result.new_regime, result.old_regime]" :key="r.regime"
          class="panel" :class="{ win: result.recommended === r.regime }"
          @pointermove="spot" @pointerleave="unspot">
          <span class="p-spot" aria-hidden="true" />
          <header class="p-head">
            <div class="p-name">{{ r.regime === 'OLD' ? 'Old regime' : 'New regime' }}
              <span class="p-tag">{{ r.regime === 'OLD' ? 'with deductions' : 'simplified' }}</span></div>
            <span v-if="result.recommended === r.regime" class="p-win"><Crown :size="12" /> Best</span>
          </header>

          <!-- headline tax -->
          <div class="p-tax">
            <span class="p-tax-lbl">Annual tax</span>
            <PayMoneyValue class="p-tax-val" tone="deduction" :value="r.annual_tax" />
            <span class="p-eff">{{ effRate(r) }}% effective · {{ inr(r.monthly_tds) }}/mo TDS</span>
          </div>

          <!-- slab ladder -->
          <div class="ladder">
            <span class="ladder-cap">How ₹{{ inrShort(r.taxable_income) }} taxable climbs the slabs</span>
            <div v-for="(s, si) in ladder(r.regime, r.taxable_income)" :key="si" class="rung" :class="{ reached: s.reached, marginal: s.marginal }">
              <span class="rung-rate" :style="{ '--rc': rateColor(s.rate) }">{{ s.rate }}%</span>
              <div class="rung-track">
                <span class="rung-fill" :style="{ '--rc': rateColor(s.rate), transform: `scaleX(${s.reached ? s.fillRatio : 0})`, transitionDelay: `${0.3 + si * 0.08}s` }" />
              </div>
              <span class="rung-band">{{ s.label }}</span>
            </div>
          </div>

          <!-- breakdown rows -->
          <div class="p-rows">
            <div class="p-row"><span>Annual gross</span><PayMoneyValue :value="r.annual_gross" :animate="false" /></div>
            <div class="p-row sub"><span>− Deductions</span><PayMoneyValue tone="net" :value="r.annual_gross - r.taxable_income" :animate="false" /></div>
            <div class="p-row hl"><span>= Taxable income</span><PayMoneyValue :value="r.taxable_income" :animate="false" /></div>
          </div>

          <!-- take-home vs tax meter -->
          <div class="meter" :title="`Tax ${effRate(r)}% of gross`">
            <span class="meter-tax" :style="{ width: effRate(r) + '%' }" />
          </div>
          <div class="meter-key"><span><i class="k net" /> Keep {{ (100 - effRate(r)).toFixed(1) }}%</span><span><i class="k tax" /> Tax {{ effRate(r) }}%</span></div>
        </article>
      </div>
    </template>

    <!-- ░░ teleported employee dropdown — escapes overflow/stacking contexts ░░ -->
    <Teleport to="body">
      <transition name="sel-pop">
        <div v-if="selOpen" class="sel-pop" :style="popStyle" @mousedown.stop @click.stop>
          <button v-for="e in employees" :key="e.id" type="button" class="sel-opt" :class="{ on: e.id === employeeId }" @click="pick(e)">
            <span class="sel-av"><span class="sel-av-ring" aria-hidden="true" />{{ initials(e) }}</span>
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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import axios from 'axios'
import { Landmark, Sparkles, Scale, Info, Crown, ChevronDown, RefreshCw, Save, Check } from 'lucide-vue-next'
// NOTE: motion-v is deliberately NOT used on this page. Its onVnodeUpdated hook
// crashed (variantToStyle → splitValues) when the async-loaded employee <select>
// options patched the deck subtree mid-enter, leaving the deck stuck at the
// initial opacity:0 (invisible). All entrances here are CSS keyframes instead.
import { useToast } from 'vue-toastification'
import { API, authHeader } from '@/utils/api'
import PayEmptyState from '../components/PayEmptyState.vue'
import PayMoneyValue from '../components/PayMoneyValue.vue'
import { projectTax } from '@/composables/usePayrollExtra'
import { inr, inrShort, fyLabel } from '@/composables/usePayroll'

const toast = useToast()
const employees = ref([]); const employeeId = ref(null); const loading = ref(false); const result = ref(null)
const form = ref({ annual_gross: null, sec_80c: null, sec_80d: null, hra_exemption: null })
const tip = ref(null); const autoNote = ref(false)
const fy = fyLabel()
const empName = (e) => e.user?.full_name || e.full_name || e.employee_id
const initials = (e) => (empName(e) || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

/* ── custom employee dropdown (teleported; escapes overflow + stacking) ── */
const selOpen = ref(false)
const trigRef = ref(null)
const popStyle = ref({})
const selectedEmp = computed(() => employees.value.find(e => e.id === employeeId.value) || null)
const recalcPop = () => {
  const el = trigRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  popStyle.value = { position: 'fixed', top: `${r.bottom + 6}px`, left: `${r.left}px`, width: `${r.width}px`, zIndex: 6000 }
}
const toggleSel = () => { if (selOpen.value) { closeSel() } else { recalcPop(); selOpen.value = true } }
const closeSel = () => { selOpen.value = false }
const pick = (e) => { employeeId.value = e.id; closeSel(); onPick() }
const onDocDown = (ev) => { if (selOpen.value && trigRef.value && !trigRef.value.contains(ev.target)) closeSel() }
const onKey = (ev) => { if (ev.key === 'Escape') closeSel() }
const onReflow = () => { if (selOpen.value) recalcPop() }

const DECL_FIELDS = [
  { key: 'sec_80c', label: '80C', placeholder: 'max ₹1.5L',
    help: 'Section 80C — investments & payments like EPF/PPF, ELSS, life insurance, home-loan principal, tuition fees. Deduction capped at ₹1,50,000/yr. Old regime only.' },
  { key: 'sec_80d', label: '80D', placeholder: 'max ₹25k',
    help: 'Section 80D — health-insurance premiums for self & family (basic cap ₹25,000; more for senior-citizen parents). Old regime only.' },
  { key: 'hra_exemption', label: 'HRA exemption', placeholder: 'exempt rent portion',
    help: 'House Rent Allowance exemption — the tax-free part of HRA if you live in rented housing (least of: actual HRA, rent − 10% of salary, or 50%/40% of salary). Old regime only.' },
]

/* standard FY2025-26 / AY2026-27 slabs (mirror the backend defaults) — used for the ladder visual */
const SLABS = {
  NEW: [ { from: 0, to: 400000, rate: 0 }, { from: 400000, to: 800000, rate: 5 }, { from: 800000, to: 1200000, rate: 10 },
    { from: 1200000, to: 1600000, rate: 15 }, { from: 1600000, to: 2000000, rate: 20 }, { from: 2000000, to: 2400000, rate: 25 }, { from: 2400000, to: null, rate: 30 } ],
  OLD: [ { from: 0, to: 250000, rate: 0 }, { from: 250000, to: 500000, rate: 5 }, { from: 500000, to: 1000000, rate: 20 }, { from: 1000000, to: null, rate: 30 } ],
}
const ladder = (regime, taxable) => {
  const t = Number(taxable || 0)
  return (SLABS[regime] || SLABS.NEW).map(s => {
    const top = s.to ?? Math.max(t, s.from + 1)
    const width = s.to ? (s.to - s.from) : Math.max(1, top - s.from)
    const inThis = Math.max(0, Math.min(t, top) - s.from)
    return {
      rate: s.rate, reached: t > s.from,
      marginal: t > s.from && (s.to == null || t <= s.to),
      fillRatio: Math.max(0.04, width > 0 ? inThis / width : 0),
      label: s.to ? `${inrShort(s.from)}–${inrShort(s.to)}` : `${inrShort(s.from)}+`,
    }
  })
}
const rateColor = (r) => ({ 0: 'var(--pay-text-muted)', 5: 'var(--pay-mint)', 10: 'var(--pay-treasury)',
  15: 'var(--pay-amber)', 20: 'var(--pay-ember)', 25: 'var(--pay-deduction)', 30: 'var(--pay-deduction)' }[r] || 'var(--pay-amber)')

const effRate = (r) => { const g = Number(r.annual_gross || 0); return g ? Math.min(100, (Number(r.annual_tax || 0) / g) * 100).toFixed(1) : '0.0' }

/* verdict */
const recLabel = computed(() => result.value?.recommended === 'OLD' ? 'Old' : 'New')
const loserLabel = computed(() => result.value?.recommended === 'OLD' ? 'new' : 'old')
const recClass = computed(() => result.value?.recommended === 'OLD' ? 'rec-old' : 'rec-new')
const saving = computed(() => {
  if (!result.value) return 0
  return Math.abs(Number(result.value.old_regime.annual_tax) - Number(result.value.new_regime.annual_tax))
})
// beam tilts toward the recommended (cheaper) side: NEW = left pan down (-), OLD = right pan down (+)
const beamTilt = computed(() => {
  if (!result.value || saving.value === 0) return 0
  const mag = Math.min(11, 4 + (saving.value / Math.max(1, Number(result.value.old_regime.annual_gross))) * 80)
  return result.value.recommended === 'NEW' ? -mag : mag
})

/* cursor spotlight */
const spot = (e) => { const el = e.currentTarget, b = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${e.clientX - b.left}px`); el.style.setProperty('--my', `${e.clientY - b.top}px`); el.style.setProperty('--sp', '1') }
const unspot = (e) => e.currentTarget.style.setProperty('--sp', '0')

/* projection — FIX: never pass the click event as save_declarations */
const run = async (saveDeclarations) => {
  const save_declarations = saveDeclarations === true
  if (!employeeId.value) return
  loading.value = true
  try {
    result.value = await projectTax({
      employee_id: employeeId.value,
      annual_gross: form.value.annual_gross || null,
      declarations: { sec_80c: form.value.sec_80c || 0, sec_80d: form.value.sec_80d || 0, hra_exemption: form.value.hra_exemption || 0 },
      save_declarations,
    })
  } catch (e) { toast.error(e?.response?.data?.detail || 'Projection failed') }
  finally { loading.value = false }
}
const save = async () => { await run(true); if (result.value) toast.success('Declarations saved') }

/* auto-project on employee pick + debounced on declaration edits */
const onPick = () => { result.value = null; autoNote.value = true; run() }
let timer = null
const scheduleAuto = () => {
  if (!employeeId.value) return
  clearTimeout(timer)
  timer = setTimeout(() => { autoNote.value = true; run() }, 600)
}

onMounted(async () => {
  try { employees.value = (await axios.get(`${API}/hr/employees/`, { headers: authHeader(), params: { limit: 100 } })).data.items || [] } catch {}
  document.addEventListener('mousedown', onDocDown)
  document.addEventListener('keydown', onKey)
  window.addEventListener('resize', onReflow)
  window.addEventListener('scroll', onReflow, true)
})
onBeforeUnmount(() => {
  clearTimeout(timer)
  document.removeEventListener('mousedown', onDocDown)
  document.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', onReflow)
  window.removeEventListener('scroll', onReflow, true)
})
</script>

<style scoped>
.tax { display: flex; flex-direction: column; gap: 18px; padding-top: 8px; }

/* ░░░░░░░░░░ CONTROL DECK ░░░░░░░░░░ */
.deck { position: relative; overflow: hidden; isolation: isolate; border-radius: 22px; padding: 22px 24px;
  background: linear-gradient(150deg, var(--pay-surface), var(--pay-surface-2)); border: 1px solid var(--pay-border-soft);
  box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset, 0 18px 50px -34px rgba(0,0,0,0.8);
  animation: pay-rise 0.55s var(--pay-ease) both; }
.deck::before { content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1px; pointer-events: none; opacity: 0.7;
  background: linear-gradient(140deg, rgba(146,64,14,0.5), transparent 38%, transparent 62%, rgba(184,134,11,0.32));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; }
.deck-aura { position: absolute; top: -50%; right: -8%; width: 50%; height: 200%; z-index: -1; pointer-events: none;
  background: radial-gradient(closest-side, rgba(146,64,14,0.16), transparent 70%); animation: pay-aurora-drift 12s ease-in-out infinite; }
.eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 10px; font-weight: 800; letter-spacing: 0.13em; color: var(--pay-statutory); }
.eyebrow svg { color: var(--pay-amber); }
.deck-title { margin: 7px 0 0; font-size: 27px; font-weight: 850; letter-spacing: -0.01em; }
.deck-sub { margin: 8px 0 16px; font-size: 12.5px; color: var(--pay-text-2); max-width: 60ch; line-height: 1.5; }

.picker { display: flex; flex-direction: column; gap: 14px; }
.fld { display: flex; flex-direction: column; gap: 6px; position: relative; }
.fld > span { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--pay-text-muted); display: inline-flex; align-items: center; gap: 5px; }
.info { width: 16px; height: 16px; border-radius: 50%; border: 1px solid var(--pay-border-soft); background: var(--pay-surface-2);
  color: var(--pay-text-muted); cursor: pointer; display: grid; place-items: center; padding: 0; transition: 0.2s; }
.info:hover { color: var(--pay-amber); border-color: var(--pay-border); }
.fld input { width: 100%; box-sizing: border-box; background: var(--pay-surface-2); border: 1px solid var(--pay-border-soft);
  border-radius: 10px; padding: 10px 12px; color: var(--pay-text); font-size: 13px; outline: none;
  transition: border-color 0.25s var(--pay-ease), box-shadow 0.25s var(--pay-ease); }
.fld input:focus { border-color: var(--pay-amber); box-shadow: 0 0 0 3px rgba(245,158,11,0.12); }

/* ── custom employee select trigger ── */
.sel-wrap { position: relative; }
.sel-btn { width: 100%; box-sizing: border-box; display: flex; align-items: center; gap: 10px; cursor: pointer; min-height: 48px;
  background: var(--pay-surface-2); border: 1px solid var(--pay-border-soft); border-radius: 12px; padding: 8px 12px;
  color: var(--pay-text); font-size: 13px; text-align: left;
  transition: border-color 0.25s var(--pay-ease), box-shadow 0.25s var(--pay-ease); }
.sel-btn:hover { border-color: var(--pay-border); }
.sel-btn.open { border-color: var(--pay-amber); box-shadow: 0 0 0 3px rgba(245,158,11,0.12); }
.sel-ph { flex: 1; color: var(--pay-text-muted); }
.sel-cur { flex: 1; display: flex; align-items: center; gap: 10px; min-width: 0; }
.sel-cur-name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sel-cur-code { font-family: var(--pay-mono); font-size: 11px; color: var(--pay-text-muted); flex: none; }
.sel-caret { color: var(--pay-text-muted); flex: none; transition: transform 0.3s var(--pay-spring), color 0.25s; }
.sel-btn.open .sel-caret, .sel-caret.up { transform: rotate(180deg); color: var(--pay-amber); }
.sel-av { position: relative; flex: none; width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center;
  font-family: var(--pay-mono); font-size: 11px; font-weight: 800; color: var(--pay-treasury); background: rgba(251,191,36,0.14); }
.decls { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.tip { position: absolute; top: 100%; left: 0; right: 0; z-index: 5; margin-top: 6px; padding: 9px 11px; border-radius: 10px;
  background: var(--pay-surface-2); border: 1px solid var(--pay-border); font-size: 11px; line-height: 1.45; color: var(--pay-text-2);
  box-shadow: 0 14px 30px -16px rgba(0,0,0,0.6); }
.tip-enter-active, .tip-leave-active { transition: opacity 0.2s var(--pay-ease), transform 0.2s var(--pay-ease); }
.tip-enter-from, .tip-leave-to { opacity: 0; transform: translateY(-4px); }
.hint-line { display: flex; align-items: flex-start; gap: 8px; font-size: 11.5px; color: var(--pay-text-muted); line-height: 1.5;
  padding: 9px 12px; border-radius: 10px; background: rgba(245,158,11,0.06); border: 1px solid var(--pay-border-soft); }
.hint-line svg { color: var(--pay-amber); flex: none; margin-top: 1px; } .hint-line b { color: var(--pay-text-2); }
.pk-acts { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 18px; border-radius: 11px; cursor: pointer; font-weight: 700; font-size: 13px; border: 1px solid transparent; }
.btn.primary { background: var(--pay-grad-cta); color: #1a1206; }
.btn.ghost { background: var(--pay-surface-2); border-color: var(--pay-border-soft); color: var(--pay-text-2); }
.btn { transition: transform 0.2s var(--pay-spring), box-shadow 0.25s var(--pay-ease); }
.btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 24px -12px rgba(245,158,11,0.5); }
.btn:active:not(:disabled) { transform: scale(0.97); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.spin { animation: pay-dial-spin 0.9s linear infinite; }
.auto-note { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--pay-net); font-family: var(--pay-mono); }
.auto-note svg { color: var(--pay-net); }

/* ░░░░░░░░░░ VERDICT ░░░░░░░░░░ */
.verdict { display: flex; align-items: center; gap: 22px; padding: 18px 24px; border-radius: 18px; position: relative; overflow: hidden;
  background: linear-gradient(120deg, var(--pay-surface), var(--pay-surface-2)); border: 1px solid var(--pay-border);
  animation: pay-rise 0.5s var(--pay-ease) both; }
.verdict.rec-new { box-shadow: 0 0 0 1px color-mix(in srgb, var(--pay-net) 30%, transparent) inset, 0 14px 40px -26px rgba(52,211,153,0.4); }
.verdict.rec-old { box-shadow: 0 0 0 1px color-mix(in srgb, var(--pay-amber) 30%, transparent) inset, 0 14px 40px -26px rgba(245,158,11,0.4); }
.vd-scale { position: relative; width: 96px; height: 60px; flex: none; }
.vd-beam { position: absolute; top: 14px; left: 8px; right: 8px; height: 3px; border-radius: 3px; background: var(--pay-grad-rail); transform-origin: center; display: block; transition: transform 0.7s var(--pay-spring); }
.vd-pan { position: absolute; top: 3px; width: 26px; height: 26px; border-radius: 0 0 13px 13px; border: 1.5px solid var(--pay-border);
  border-top: none; background: rgba(251,191,36,0.08); }
.vd-pan.l { left: -8px; } .vd-pan.r { right: -8px; }
.vd-fulcrum { position: absolute; left: 50%; top: 16px; transform: translateX(-50%); width: 0; height: 0;
  border-left: 9px solid transparent; border-right: 9px solid transparent; border-bottom: 30px solid var(--pay-statutory); opacity: 0.7; }
.vd-txt { min-width: 0; }
.vd-eyebrow { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--pay-text-muted); }
.vd-headline { margin: 3px 0 0; display: inline-flex; align-items: center; gap: 8px; font-size: 19px; font-weight: 800; color: var(--pay-text); }
.vd-headline svg { color: var(--pay-amber); }
.vd-save { margin: 5px 0 0; font-size: 13px; color: var(--pay-text-2); } .vd-save b { font-family: var(--pay-mono); font-weight: 850; font-size: 16px; }

/* ░░░░░░░░░░ REGIME PANELS ░░░░░░░░░░ */
.duel { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.panel { position: relative; overflow: hidden; isolation: isolate; perspective: 800px; padding: 20px; border-radius: 18px;
  background: linear-gradient(165deg, var(--pay-surface), var(--pay-surface-2)); border: 1px solid var(--pay-border-soft);
  box-shadow: 0 1px 0 rgba(255,255,255,0.03) inset, 0 14px 34px -26px rgba(0,0,0,0.7);
  transition: border-color 0.35s var(--pay-ease), box-shadow 0.35s var(--pay-ease);
  animation: pay-rise 0.6s var(--pay-ease) both; }
.duel .panel:nth-child(2) { animation-delay: 0.12s; }
.panel.win { border-color: var(--pay-net); box-shadow: 0 0 0 1px var(--pay-net) inset, 0 18px 44px -26px rgba(52,211,153,0.4); }
.p-spot { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: -1; opacity: var(--sp, 0); transition: opacity 0.4s var(--pay-ease);
  background: radial-gradient(220px circle at var(--mx,50%) var(--my,50%), rgba(245,158,11,0.16), transparent 60%); }
.p-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.p-name { font-size: 16px; font-weight: 800; color: var(--pay-text); display: flex; align-items: center; gap: 9px; }
.p-tag { font-size: 9.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--pay-text-muted);
  padding: 2px 7px; border-radius: 6px; background: var(--pay-surface); }
.p-win { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 800; padding: 3px 9px; border-radius: 999px;
  color: #0a3a2a; background: var(--pay-net); }
.p-tax { display: flex; flex-direction: column; gap: 2px; padding-bottom: 14px; margin-bottom: 14px; border-bottom: 1px dashed var(--pay-border-soft); }
.p-tax-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--pay-text-muted); }
.p-tax-val :deep(.pay-money) { font-size: 30px; letter-spacing: -0.01em; }
.p-eff { font-family: var(--pay-mono); font-size: 11px; color: var(--pay-text-muted); margin-top: 2px; }

/* slab ladder */
.ladder { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.ladder-cap { font-size: 10px; color: var(--pay-text-muted); margin-bottom: 4px; }
.rung { display: grid; grid-template-columns: 40px 1fr auto; align-items: center; gap: 10px; opacity: 0.5; transition: opacity 0.3s var(--pay-ease); }
.rung.reached { opacity: 1; }
.rung.marginal .rung-rate { box-shadow: 0 0 0 2px color-mix(in srgb, var(--rc) 50%, transparent); animation: pay-glow-breathe 2s ease-in-out infinite; }
.rung-rate { font-family: var(--pay-mono); font-size: 11px; font-weight: 800; color: var(--rc); text-align: center; padding: 3px 0; border-radius: 6px;
  background: color-mix(in srgb, var(--rc) 12%, transparent); }
.rung-track { height: 8px; border-radius: 99px; background: var(--pay-surface); border: 1px solid var(--pay-border-soft); overflow: hidden; }
.rung-fill { display: block; height: 100%; width: 100%; transform: scaleX(0); transform-origin: left center; border-radius: 99px;
  transition: transform 0.7s var(--pay-ease);
  background: linear-gradient(90deg, color-mix(in srgb, var(--rc) 60%, transparent), var(--rc)); box-shadow: 0 0 10px -3px var(--rc); }
.rung-band { font-family: var(--pay-mono); font-size: 9.5px; color: var(--pay-text-muted); white-space: nowrap; }

.p-rows { display: flex; flex-direction: column; }
.p-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; font-size: 13px; color: var(--pay-text-2); }
.p-row.sub { color: var(--pay-text-muted); } .p-row.hl { border-top: 1px dashed var(--pay-border-soft); color: var(--pay-text); font-weight: 600; }
.p-row :deep(.pay-money) { font-size: 14px; }

.meter { height: 9px; border-radius: 99px; margin-top: 14px; background: linear-gradient(90deg, var(--pay-net), var(--pay-net-strong));
  overflow: hidden; position: relative; }
.meter-tax { position: absolute; right: 0; top: 0; bottom: 0; width: 0; background: linear-gradient(90deg, var(--pay-amber), var(--pay-deduction));
  transition: width 0.9s var(--pay-ease) 0.3s; }
.meter-key { display: flex; justify-content: space-between; margin-top: 7px; font-size: 10.5px; color: var(--pay-text-muted); }
.meter-key i { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 5px; vertical-align: -1px; }
.meter-key .k.net { background: var(--pay-net); } .meter-key .k.tax { background: var(--pay-deduction); }

/* ░░░░░░░░░░ RESPONSIVE ░░░░░░░░░░ */
@media (max-width: 860px) { .decls { grid-template-columns: 1fr 1fr; } .duel { grid-template-columns: 1fr; } }
@media (max-width: 480px) { .decls { grid-template-columns: 1fr; } .verdict { flex-direction: column; text-align: center; } }

/* ░░░░░░░░░░ TELEPORTED EMPLOYEE DROPDOWN ░░░░░░░░░░ */
.sel-pop { background: var(--pay-glass); backdrop-filter: var(--pay-glass-blur); -webkit-backdrop-filter: var(--pay-glass-blur);
  border: 1px solid var(--pay-border); border-radius: 14px; padding: 6px; max-height: 320px; overflow-y: auto;
  box-shadow: 0 24px 60px -24px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05); }
.sel-pop::-webkit-scrollbar { width: 8px; } .sel-pop::-webkit-scrollbar-thumb { background: var(--pay-border); border-radius: 8px; }
.sel-opt { width: 100%; display: flex; align-items: center; gap: 11px; padding: 9px 11px; border: none; background: transparent;
  border-radius: 10px; cursor: pointer; text-align: left; color: var(--pay-text); transition: background 0.18s var(--pay-ease); }
.sel-opt:hover { background: rgba(251,191,36,0.1); }
.sel-opt.on { background: rgba(251,191,36,0.14); }
.sel-av-ring { position: absolute; inset: -2px; border-radius: 11px; padding: 2px; opacity: 0; transition: opacity 0.2s var(--pay-ease);
  background: conic-gradient(from 0deg, var(--pay-treasury), var(--pay-mint), var(--pay-amber), var(--pay-treasury));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; }
.sel-opt:hover .sel-av-ring, .sel-opt.on .sel-av-ring { opacity: 0.9; }
.sel-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.sel-name { font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sel-code { font-family: var(--pay-mono); font-size: 10.5px; color: var(--pay-text-muted); }
.sel-check { color: var(--pay-net); flex: none; }
.sel-empty { padding: 16px; text-align: center; font-size: 12px; color: var(--pay-text-muted); }
.sel-pop-enter-active, .sel-pop-leave-active { transition: opacity 0.2s var(--pay-ease), transform 0.2s var(--pay-ease); transform-origin: top center; }
.sel-pop-enter-from, .sel-pop-leave-to { opacity: 0; transform: translateY(-8px) scale(0.97); }

/* ░░░░░░░░░░ LIGHT THEME ░░░░░░░░░░ */
[data-theme="light"] .btn.primary { color: #2a1a06; }
[data-theme="light"] .sel-opt:hover { background: rgba(217,119,6,0.1); }
[data-theme="light"] .sel-opt.on { background: rgba(217,119,6,0.13); }
[data-theme="light"] .p-win { color: #fff; }
[data-theme="light"] .deck-aura { opacity: 0.6; }

/* ░░░░░░░░░░ REDUCED MOTION ░░░░░░░░░░ */
@media (prefers-reduced-motion: reduce) {
  .deck, .verdict, .panel, .deck-aura, .rung.marginal .rung-rate, .spin { animation: none !important; }
  .vd-beam, .rung-fill, .meter-tax, .btn { transition: none !important; }
}
</style>
