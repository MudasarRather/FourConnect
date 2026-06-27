<template>
  <div class="prx set-scope">
    <!-- ═══════════════ Console hero ═══════════════ -->
    <section class="prx-hero">
      <span class="prx-grain" aria-hidden="true" />
      <span class="prx-aura" aria-hidden="true" />
      <span class="prx-floor" aria-hidden="true" />
      <Cpu class="prx-ambient" :size="240" aria-hidden="true" />

      <div class="prx-lead">
        <div class="prx-lead-text">
          <span class="prx-eyebrow"><Calculator :size="12" /> Pay &amp; Statutory · Engine</span>
          <h2 class="prx-title">Payroll <span class="prx-accent">Engine</span></h2>
          <p class="prx-sub">The calibration policy the payroll engine reads — working-days basis, overtime, settlement and the default tax regime. Every knob is live; an unset one uses the built-in default.</p>
        </div>
        <div class="prx-actions">
          <Motion as="button" type="button" class="set-btn set-btn-steel" :disabled="loading"
            :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" title="Refresh" @click="reload">
            <RefreshCw :size="14" :class="{ 'set-spin': loading }" /> Refresh
          </Motion>
          <Motion as="button" type="button" class="set-btn set-btn-primary"
            :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.96 }" @click="goPayroll">
            <Wallet :size="14" /> Payroll dashboard
          </Motion>
        </div>
      </div>

      <!-- telemetry lenses -->
      <div class="prx-lenses">
        <button v-for="l in lenses" :key="l.key" type="button" class="prx-lens" :class="{ on: lens === l.key, stat: l.stat }"
          :style="{ '--lc': l.color }" @click="!l.stat && (lens = lens === l.key ? 'all' : l.key)">
          <span class="prx-lens-ic"><component :is="l.icon" :size="15" /></span>
          <span class="prx-lens-meta">
            <b><SetCountUp :value="l.value" /></b>
            <span>{{ l.label }}</span>
          </span>
          <span class="prx-lens-bar" aria-hidden="true" />
        </button>
      </div>

      <!-- sample inputs + live engine -->
      <div class="prx-sample">
        <label class="prx-sample-in">
          <span><Banknote :size="12" /> Sample gross</span>
          <div class="prx-sample-fld"><i>₹</i><input type="number" v-model.number="sampleGross" min="0" /></div>
        </label>
        <label class="prx-sample-in">
          <span><CalendarMinus :size="12" /> Unpaid days</span>
          <div class="prx-sample-fld"><input type="number" v-model.number="sampleLop" min="0" :max="31" /></div>
        </label>
      </div>

      <PayEngineCore
        :gross="sampleGross" :net="netOfLop" :per-day="perDay" :lop-deduction="lopDeduction"
        :ot-per-hour="otPerHour" :working-days="workingDays" :lop-days="sampleLop"
        :basis-label="pretty(values.WORKING_DAYS_BASIS || 'ACTUAL')"
        lop-label="Per day"
        :ot-mult="values.OVERTIME_MULTIPLIER || 1"
        :tax-regime="values.DEFAULT_TAX_REGIME || 'NEW'"
        cycle-label="Monthly" />
    </section>

    <!-- ═══════════════ Calibration modules ═══════════════ -->
    <div v-if="loading" class="prx-skel">
      <span class="prx-skel-beam" aria-hidden="true" />
    </div>

    <div v-else class="prx-modules">
      <section v-for="(g, gi) in shownGroups" :key="g" class="prx-module" :style="{ '--gi': gi }">
        <header class="prx-module-head">
          <span class="prx-module-ic"><component :is="groupIcon[g] || Settings2" :size="14" /></span>
          <b>{{ g }}</b>
          <span class="prx-module-count">{{ rulesByGroup[g].length }}</span>
          <span class="prx-module-line" aria-hidden="true" />
        </header>
        <div class="prx-grid">
          <PayrollRuleCard v-for="(r, i) in rulesByGroup[g]" :key="r.key"
            :rule="r" :value="values[r.key]" :configured="configured.has(r.key)"
            :icon="meta(r.key).icon" :step="meta(r.key).step" :min="meta(r.key).min" :max="meta(r.key).max" :unit="meta(r.key).unit"
            :consumed="meta(r.key).consumed" :consumed-by="meta(r.key).by" :index="i"
            @set="(v) => setVal(r, v)" @reset="askReset(r)" @go="goModule" />
        </div>
      </section>

      <p v-if="!shownGroups.length" class="prx-empty">No rules match this filter.</p>
    </div>

    <PayrollRuleResetModal
      :open="resetTarget !== null" :loading="resetting" :rule="resetTarget"
      :current-value="resetTarget ? values[resetTarget.key] : ''"
      :default-value="resetTarget ? defaults[resetTarget.key] : ''"
      :consumed="resetTarget ? meta(resetTarget.key).consumed : false"
      :consumed-by="resetTarget ? meta(resetTarget.key).by : 'payroll'"
      @close="resetTarget = null" @confirm="confirmReset" @go="goModule" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { Motion } from 'motion-v'
import {
  Calculator, RefreshCw, Cpu, Wallet, Banknote, CalendarMinus, Settings2,
  CalendarClock, CalendarDays, Timer, Landmark,
  DoorOpen, SlidersHorizontal, CheckCircle2, CircleDashed, Layers, Coins,
} from 'lucide-vue-next'
import SetCountUp from '../components/SetCountUp.vue'
import PayEngineCore from '../components/PayEngineCore.vue'
import PayrollRuleCard from '../components/PayrollRuleCard.vue'
import PayrollRuleResetModal from '../components/PayrollRuleResetModal.vue'
import { MODULES } from '../components/connectivity'
import { payrollRulesCatalog, getPayrollRules, upsertPayrollRule, errText, titleCase } from '../composables/useHrSettings'

const router = useRouter()
const toast = useToast()
const loading = ref(false)
const cat = ref([])
const defaults = reactive({})
const values = reactive({})
const configured = reactive(new Set())
const lens = ref('all')

const NUM_KEYS = new Set(['WORKING_DAYS_FIXED', 'OVERTIME_MULTIPLIER'])

// per-rule presentation + engine-consumption metadata. Every rule here is now
// LIVE — read by the payroll/settlement engine. OVERTIME_MULTIPLIER is the
// org-wide OT fallback (per-type Overtime Rules in the Shifts module override
// it), so it still cross-links there. The retired knobs (payroll cycle/start/
// processing — monthly-only engine; LOP basis — unified with WORKING_DAYS_BASIS)
// were removed rather than shown as inert.
const META = {
  WORKING_DAYS_BASIS:    { icon: CalendarClock, by: 'payroll',  consumed: true },
  WORKING_DAYS_FIXED:    { icon: CalendarDays,  by: 'payroll',  consumed: true,  step: 1, min: 1, max: 31 },
  OVERTIME_MULTIPLIER:   { icon: Timer,         by: 'shifts',   consumed: true,  step: 0.1, min: 1, max: 3, unit: '×' },
  ENCASHMENT_BASIS:      { icon: Coins,         by: 'exit',     consumed: true },
  NOTICE_RECOVERY_BASIS: { icon: DoorOpen,      by: 'exit',     consumed: true },
  DEFAULT_TAX_REGIME:    { icon: Landmark,      by: 'payslips', consumed: true },
}
const meta = (k) => ({ icon: SlidersHorizontal, by: 'payroll', consumed: false, step: 1, min: 0, max: null, unit: '', ...(META[k] || {}) })

const groupIcon = { Attendance: CalendarClock, Settlement: Wallet, Tax: Landmark }

async function reload() {
  loading.value = true
  try {
    const [c, data] = await Promise.all([payrollRulesCatalog(), getPayrollRules()])
    cat.value = c.rules || []
    Object.assign(defaults, c.defaults || {})
    configured.clear()
    for (const r of data.rules || []) {
      values[r.key] = r.value
      if (r.configured) configured.add(r.key)
    }
  } catch (e) { toast.error(errText(e, 'Failed to load payroll rules')) }
  finally { loading.value = false }
}
onMounted(reload)

const pretty = (o) => titleCase(o)
const total = computed(() => cat.value.length)
const configuredCount = computed(() => configured.size)
const defaultCount = computed(() => total.value - configuredCount.value)

const lenses = computed(() => [
  { key: 'all', label: 'All rules', value: total.value, icon: Layers, color: 'var(--set-gold)' },
  { key: 'configured', label: 'Overridden', value: configuredCount.value, icon: CheckCircle2, color: 'var(--set-amber)' },
  { key: 'default', label: 'At default', value: defaultCount.value, icon: CircleDashed, color: 'var(--set-unset)' },
])

const groups = computed(() => [...new Set(cat.value.map(r => r.group))])
const rulesByGroup = computed(() => {
  const o = {}
  for (const r of cat.value) {
    if (lens.value === 'configured' && !configured.has(r.key)) continue
    if (lens.value === 'default' && configured.has(r.key)) continue
    ;(o[r.group] = o[r.group] || []).push(r)
  }
  return o
})
const shownGroups = computed(() => groups.value.filter(g => (rulesByGroup.value[g] || []).length))

async function setVal(rule, raw) {
  const isNum = NUM_KEYS.has(rule.key)
  const v = isNum ? Number(raw) : raw
  values[rule.key] = v
  try {
    await upsertPayrollRule({ key: rule.key, ...(isNum ? { value_num: v } : { value_str: v }) })
    configured.add(rule.key)
  } catch (e) { toast.error(errText(e, 'Failed to save rule')); reload() }
}

// ── reset (cinematic modal) ──
const resetTarget = ref(null)
const resetting = ref(false)
const askReset = (rule) => { resetTarget.value = rule }
async function confirmReset(reason) {
  if (!resetTarget.value) return
  resetting.value = true
  const key = resetTarget.value.key
  try {
    const { API, authHeader } = await import('@/utils/api')
    const axios = (await import('axios')).default
    await axios.delete(`${API}/hr/settings/payroll-rules/${key}`, {
      headers: authHeader(), params: reason ? { reason } : {},
    })
    configured.delete(key)
    resetTarget.value = null
    await reload()
    toast.success('Reset to default')
  } catch (e) { toast.error(errText(e, 'Reset failed')) }
  finally { resetting.value = false }
}

// ── cross-links ──
const goModule = (key) => { const m = MODULES[key]; if (m?.to) router.push(m.to) }
const goPayroll = () => goModule('payroll')

// ── sample preview (feeds the engine) ──
const sampleGross = ref(40000)
const sampleLop = ref(2)
const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
const workingDays = computed(() => {
  const basis = values.WORKING_DAYS_BASIS || 'ACTUAL'
  if (basis === 'CALENDAR_30') return 30
  if (basis === 'FIXED') return Number(values.WORKING_DAYS_FIXED) || 30
  return daysInMonth   // ACTUAL (default)
})
const perDay = computed(() => (Number(sampleGross.value) || 0) / (workingDays.value || 1))
// LOP divisor IS the working-days denominator (WORKING_DAYS_BASIS), mirroring the
// real engine: deduction = per-day pay × unpaid days.
const lopDeduction = computed(() => perDay.value * (Number(sampleLop.value) || 0))
const otPerHour = computed(() => perDay.value / 8 * (Number(values.OVERTIME_MULTIPLIER) || 1))
const netOfLop = computed(() => Math.max(0, (Number(sampleGross.value) || 0) - lopDeduction.value))
</script>

<style scoped>
.prx { display: flex; flex-direction: column; gap: 16px; }

/* ═══════════════ hero ═══════════════ */
.prx-hero { position: relative; overflow: hidden; padding: 22px 22px 20px; border-radius: 22px;
  background: linear-gradient(165deg, var(--set-surface), var(--set-panel)); border: 1px solid var(--set-border-strong);
  box-shadow: var(--set-card-shadow); display: flex; flex-direction: column; gap: 18px; }
.prx-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: radial-gradient(circle at 20% 30%, rgba(255,255,255,0.04) 0.5px, transparent 1.4px), radial-gradient(circle at 75% 60%, rgba(0,0,0,0.16) 0.5px, transparent 1.4px);
  background-size: 30px 30px, 38px 38px; }
.prx-aura { position: absolute; inset: -50% 20% auto -10%; height: 150%; pointer-events: none;
  background: var(--set-grad-core); filter: blur(30px); opacity: 0.8; }
.prx-floor { position: absolute; inset: 0; pointer-events: none; opacity: 0.35;
  background-image: linear-gradient(var(--set-trace-idle) 1px, transparent 1px), linear-gradient(90deg, var(--set-trace-idle) 1px, transparent 1px);
  background-size: 32px 32px; mask-image: radial-gradient(circle at 70% 30%, #000 20%, transparent 75%); }
.prx-ambient { position: absolute; right: -40px; top: -40px; color: var(--set-amber); opacity: 0.05; pointer-events: none;
  animation: set-spin 90s linear infinite; }

.prx-lead { position: relative; z-index: 2; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.prx-lead-text { min-width: 0; flex: 1; }
.prx-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--set-amber);
  padding: 5px 11px; border-radius: 999px; background: var(--set-pad); border: 1px solid var(--set-border-warm); }
.prx-title { margin: 11px 0 7px; font-size: clamp(26px, 4vw, 38px); font-weight: 850; letter-spacing: -0.02em; line-height: 1; color: var(--set-text); }
.prx-accent { background: var(--set-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.prx-sub { margin: 0; max-width: 640px; font-size: 12.5px; line-height: 1.55; color: var(--set-text-muted); }
.prx-actions { display: flex; gap: 9px; flex-shrink: 0; }

/* lenses */
.prx-lenses { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.prx-lens { position: relative; overflow: hidden; display: flex; align-items: center; gap: 11px; padding: 12px 14px; border-radius: 14px; cursor: pointer;
  background: var(--set-surface); border: 1px solid var(--set-border); text-align: left; transition: all 0.22s var(--set-spring); }
.prx-lens:hover { border-color: var(--set-border-strong); transform: translateY(-2px); }
.prx-lens.on { border-color: color-mix(in srgb, var(--lc) 40%, transparent); background: color-mix(in srgb, var(--lc) 8%, var(--set-surface)); }
.prx-lens-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; color: var(--lc);
  background: color-mix(in srgb, var(--lc) 13%, transparent); border: 1px solid color-mix(in srgb, var(--lc) 26%, transparent); }
.prx-lens-meta { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.prx-lens-meta b { font-size: 20px; font-weight: 850; color: var(--set-text); line-height: 1; }
.prx-lens-meta span { font-size: 10.5px; font-weight: 600; color: var(--set-text-muted); }
.prx-lens-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; transform: scaleX(0); transform-origin: left; background: var(--lc); transition: transform 0.3s var(--set-spring); }
.prx-lens.on .prx-lens-bar { transform: scaleX(1); }

/* sample inputs */
.prx-sample { position: relative; z-index: 2; display: flex; gap: 12px; flex-wrap: wrap; }
.prx-sample-in { display: flex; flex-direction: column; gap: 5px; }
.prx-sample-in > span { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--set-text-dim); }
.prx-sample-fld { display: inline-flex; align-items: center; gap: 4px; padding: 6px 11px; border-radius: 10px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); transition: border-color 0.2s; }
.prx-sample-fld:focus-within { border-color: var(--set-amber); }
.prx-sample-fld i { font-style: normal; font-size: 12px; color: var(--set-text-dim); }
.prx-sample-fld input { width: 90px; border: 0; background: transparent; font: inherit; font-size: 14px; font-weight: 700; color: var(--set-text); outline: none; }

/* ═══════════════ modules ═══════════════ */
.prx-modules { display: flex; flex-direction: column; gap: 18px; }
.prx-module { display: flex; flex-direction: column; gap: 12px; animation: set-deal 0.5s var(--set-spring) backwards; animation-delay: calc(var(--gi, 0) * 0.08s); }
.prx-module-head { display: flex; align-items: center; gap: 9px; }
.prx-module-ic { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0; color: var(--set-amber);
  background: color-mix(in srgb, var(--set-amber) 12%, transparent); border: 1px solid color-mix(in srgb, var(--set-amber) 24%, transparent); }
.prx-module-head b { font-size: 13px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--set-text-secondary); }
.prx-module-count { font-size: 10px; font-weight: 800; color: var(--set-text-dim); padding: 2px 8px; border-radius: 999px; background: var(--set-surface); border: 1px solid var(--set-border); }
.prx-module-line { flex: 1; height: 1px; background: linear-gradient(90deg, var(--set-border-strong), transparent); }

.prx-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }

.prx-empty { text-align: center; padding: 40px; color: var(--set-text-muted); font-size: 13px; }

.prx-skel { position: relative; overflow: hidden; height: 280px; border-radius: 18px; background: var(--set-surface); border: 1px solid var(--set-border); }
.prx-skel-beam { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(251,191,36,0.08) 50%, transparent 70%); background-size: 220% 100%; animation: set-sheen 1.5s ease infinite; }

@media (max-width: 720px) {
  .prx-lenses { grid-template-columns: 1fr; }
  .prx-grid { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .prx-ambient, .prx-skel-beam { animation: none; }
  .prx-module { animation: none; }
}
</style>
