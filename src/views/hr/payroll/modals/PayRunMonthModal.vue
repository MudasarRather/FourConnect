<template>
  <Teleport to="body">
    <transition name="paym-fade">
      <div v-if="open" class="paym-overlay" @mousedown.self="$emit('close')">
        <Motion class="paym-modal create paymw" as="div"
          :initial="{ opacity: 0, y: 28, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.5, ease: [0.16,1,0.3,1] }">
          <span class="paym-foil" />
          <button class="paym-x" @click="$emit('close')"><X :size="18" /></button>

          <!-- ── hero ── -->
          <header class="paym-hero">
            <div class="paym-coin"><span class="paym-coin-ring" /><component :is="stepMeta.icon" :size="22" /></div>
            <div class="paym-hero-txt">
              <p class="paym-eyebrow"><Cpu :size="12" /> Processing · Monthly run · Step {{ step }} of 3</p>
              <transition name="paymw-title" mode="out-in">
                <h2 class="paym-title" :key="step">{{ stepMeta.title }}</h2>
              </transition>
              <p class="paym-sub">{{ stepMeta.sub }}</p>
            </div>
          </header>

          <!-- ── step rail ── -->
          <div class="paymw-rail">
            <div v-for="(s, i) in STEPS" :key="s.key" class="paymw-seg" :class="segCls(i)">
              <span class="paymw-seg-dot">
                <Check v-if="i + 1 < step" :size="11" />
                <span v-else>{{ i + 1 }}</span>
              </span>
              <span class="paymw-seg-lbl">{{ s.label }}</span>
              <span v-if="i < STEPS.length - 1" class="paymw-seg-line"><span class="fill" :class="{ on: i + 1 < step }" /></span>
            </div>
          </div>

          <!-- ── body: animated step swap ── -->
          <div class="paym-body paymw-body">
            <transition :name="`paymw-step-${dir}`" mode="out-in">
              <!-- STEP 1 · PERIOD & SCOPE -->
              <div v-if="step === 1" class="paymw-pane" key="s1">
                <div class="paym-grid2">
                  <label class="paym-field" :style="{ '--i': 0 }"><span>Month</span>
                    <select v-model.number="f.period_month">
                      <option v-for="m in 12" :key="m" :value="m">{{ monthLabel(m) }}</option>
                    </select>
                  </label>
                  <label class="paym-field" :style="{ '--i': 1 }"><span>Year</span>
                    <input v-model.number="f.period_year" type="number" />
                  </label>
                </div>
                <div class="paym-grid2">
                  <label class="paym-field" :style="{ '--i': 2 }"><span>Pay date (optional)</span>
                    <HrDatePicker v-model="f.pay_date" />
                  </label>
                  <label class="paym-field" :style="{ '--i': 3 }"><span>Department scope</span>
                    <select v-model="f.department_id">
                      <option :value="null">All departments</option>
                      <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
                    </select>
                  </label>
                </div>
                <label class="paym-field" :style="{ '--i': 4 }"><span>Notes</span>
                  <textarea v-model="f.notes" rows="2" placeholder="Optional — e.g. cycle reference, special instruction"></textarea>
                </label>
                <div class="paym-note"><Info :size="15" /><span>Next we'll run a <b>pre-flight eligibility check</b> for this period &amp; scope — so you see exactly who will be paid before any draft is created.</span></div>
              </div>

              <!-- STEP 2 · ELIGIBILITY -->
              <div v-else-if="step === 2" class="paymw-pane" key="s2">
                <!-- loading -->
                <div v-if="eligLoading" class="paymw-elig-load">
                  <div class="paymw-ring-skel"><span class="pay-skel" style="width:108px;height:108px;border-radius:50%" /></div>
                  <div class="paymw-rows">
                    <div v-for="i in 4" :key="i" class="pay-skel" style="height:46px" />
                  </div>
                </div>

                <div v-else-if="eligError" class="paymw-elig-err">
                  <AlertTriangle :size="22" /><p>{{ eligError }}</p>
                  <button class="paym-btn ghost" @click="loadEligibility">Retry</button>
                </div>

                <template v-else-if="elig">
                  <!-- summary band -->
                  <div class="paymw-summary">
                    <div class="paymw-ring">
                      <svg viewBox="0 0 120 120" class="paymw-ring-svg">
                        <circle class="rt" cx="60" cy="60" r="52" />
                        <circle class="rf" cx="60" cy="60" r="52"
                          :stroke-dasharray="ringCirc"
                          :stroke-dashoffset="ringOffset" />
                      </svg>
                      <div class="paymw-ring-mid">
                        <PayCountUp :value="elig.eligible_count" class="rn" />
                        <span class="rl">of {{ elig.total_candidates }} · eligible</span>
                      </div>
                    </div>
                    <div class="paymw-kpis">
                      <Motion class="paymw-kpi" as="div" :style="{ '--i': 0 }"
                        :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.05 }">
                        <span class="k-lbl"><Coins :size="12" /> Est. net payout</span>
                        <b class="k-val ok mono"><PayMoneyValue :value="elig.estimated_net" tone="net" short /></b>
                      </Motion>
                      <Motion class="paymw-kpi" as="div" :style="{ '--i': 1 }" :class="{ alert: elig.blocked_count }"
                        :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.11 }">
                        <span class="k-lbl"><AlertTriangle :size="12" /> Exceptions</span>
                        <b class="k-val" :class="{ warn: elig.blocked_count }"><PayCountUp :value="elig.blocked_count" /></b>
                      </Motion>
                      <Motion class="paymw-kpi" as="div" :style="{ '--i': 2 }"
                        :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.17 }">
                        <span class="k-lbl"><LogOut :size="12" /> Final settlement</span>
                        <b class="k-val"><PayCountUp :value="elig.final_settlement_count" /></b>
                      </Motion>
                      <Motion class="paymw-kpi" as="div" :style="{ '--i': 3 }"
                        :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.23 }">
                        <span class="k-lbl"><Wallet :size="12" /> Est. gross</span>
                        <b class="k-val mono"><PayMoneyValue :value="elig.estimated_gross" short /></b>
                      </Motion>
                    </div>
                  </div>

                  <!-- zero-eligible warning -->
                  <div v-if="!elig.eligible_count" class="paym-note danger">
                    <AlertTriangle :size="15" />
                    <span>No employees are eligible for this scope. Adjust the department scope, or assign active compensation &amp; a salary structure, before running payroll.</span>
                  </div>

                  <!-- roster -->
                  <div class="paymw-roster">
                    <div class="paymw-roster-h"><span>Roster</span><span class="mono">{{ elig.rows.length }} candidates</span></div>
                    <ul class="paymw-list">
                      <Motion v-for="(r, i) in elig.rows" :key="r.employee_id" as="li" class="paymw-emp" :class="{ blocked: !r.eligible }"
                        :initial="{ opacity: 0, x: -10 }" :animate="{ opacity: 1, x: 0 }"
                        :transition="{ duration: 0.32, delay: Math.min(i * 0.035, 0.4), ease: [0.16,1,0.3,1] }">
                        <span class="emp-ava" :class="{ blk: !r.eligible }">{{ initials(r) }}</span>
                        <div class="emp-id">
                          <span class="emp-name">{{ r.employee_name || r.employee_code }}</span>
                          <span class="emp-meta">{{ r.employee_code }} · {{ r.department_name || '—' }}</span>
                        </div>
                        <span class="emp-life" :class="lifeCls(r.lifecycle_state)">{{ lifeLabel(r.lifecycle_state) }}</span>
                        <div class="emp-num">
                          <PayMoneyValue v-if="r.eligible && r.est_net != null" :value="r.est_net" tone="net" :animate="false" short class="emp-ctc" />
                          <span v-else class="emp-ctc dim">—</span>
                          <span v-if="r.eligible" class="emp-sub">
                            {{ fmtDays(r.paid_days) }}/{{ fmtDays(r.working_days) }}d<template v-if="Number(r.lop_days) > 0"> · <span class="lop">{{ fmtDays(r.lop_days) }} LOP</span></template>
                          </span>
                          <span v-else class="emp-sub">CTC {{ inrShort(r.monthly_ctc) }}</span>
                        </div>
                        <span v-if="r.eligible" class="emp-flag ok">
                          <component :is="r.final_settlement ? LogOut : Check" :size="13" />
                          {{ r.final_settlement ? 'Final settle' : 'Will pay' }}
                        </span>
                        <span v-else class="emp-flag blk" :title="r.reason_label">
                          <AlertTriangle :size="12" /> {{ shortReason(r.reason) }}
                        </span>
                      </Motion>
                    </ul>
                  </div>
                </template>
              </div>

              <!-- STEP 3 · REVIEW -->
              <div v-else class="paymw-pane" key="s3">
                <div class="paymw-review">
                  <div class="paymw-rev-grid">
                    <div class="rev-cell" :style="{ '--i': 0 }"><span>Period</span><b>{{ monthLabel(f.period_month) }} {{ f.period_year }}</b></div>
                    <div class="rev-cell" :style="{ '--i': 1 }"><span>Scope</span><b>{{ scopeLabel }}</b></div>
                    <div class="rev-cell" :style="{ '--i': 2 }"><span>Pay date</span><b>{{ f.pay_date || 'Not set' }}</b></div>
                    <div class="rev-cell" :style="{ '--i': 3 }"><span>Employees to pay</span><b class="ok"><PayCountUp :value="elig ? elig.eligible_count : 0" /></b></div>
                  </div>
                  <div class="paymw-rev-totals" v-if="elig">
                    <div class="rt-row strong"><span><Coins :size="13" /> Estimated net payout</span><PayMoneyValue tone="net" :value="elig.estimated_net" class="rt-val" /></div>
                    <div class="rt-row"><span><Wallet :size="13" /> Estimated gross</span><PayMoneyValue :value="elig.estimated_gross" class="rt-val" /></div>
                    <div class="rt-row" v-if="elig.final_settlement_count"><span><LogOut :size="13" /> Final settlements included</span><b class="mono">{{ elig.final_settlement_count }}</b></div>
                    <div class="rt-row" v-if="elig.blocked_count"><span><AlertTriangle :size="13" /> Exceptions (won't be paid)</span><b class="mono warn">{{ elig.blocked_count }}</b></div>
                  </div>
                  <label class="paym-field" :style="{ '--i': 4 }"><span>Notes (optional)</span>
                    <textarea v-model="f.notes" rows="2" placeholder="Optional"></textarea>
                  </label>
                  <div class="paym-note"><Info :size="15" /><span>This creates a <b>draft</b> batch for {{ monthLabel(f.period_month) }} {{ f.period_year }} — no payslips are finalised and nothing is paid out yet. You can verify and approve before any release.</span></div>
                </div>
              </div>
            </transition>
          </div>

          <!-- ── footer ── -->
          <footer class="paym-foot paymw-foot">
            <button v-if="step > 1" class="paym-btn ghost" @click="back"><ChevronLeft :size="15" /> Back</button>
            <button v-else class="paym-btn ghost" @click="$emit('close')">Cancel</button>
            <div class="paymw-foot-r">
              <span v-if="step === 2 && elig && elig.blocked_count" class="paymw-foot-hint">
                {{ elig.blocked_count }} excluded — {{ elig.eligible_count }} will be paid
              </span>
              <button v-if="step < 3" class="paym-btn primary" :disabled="step === 2 && eligLoading" @click="next">
                {{ step === 1 ? 'Check eligibility' : 'Review run' }} <ChevronRight :size="15" />
              </button>
              <button v-else class="paym-btn primary" :disabled="saving" @click="create">
                <Play :size="15" /> {{ saving ? 'Creating…' : 'Create run' }}
              </button>
            </div>
          </footer>
        </Motion>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import { Motion } from 'motion-v'
import { X, CalendarClock, Info, Cpu, Check, ChevronLeft, ChevronRight, Play,
  AlertTriangle, Users, LogOut, Coins, Wallet, ClipboardCheck, ListChecks } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import PayCountUp from '../components/PayCountUp.vue'
import PayMoneyValue from '../components/PayMoneyValue.vue'
import { API, authHeader } from '@/utils/api'
import { monthLabel, inrShort } from '@/composables/usePayroll'
import { createBatch, fetchEligibility } from '@/composables/usePayrollBatch'

const props = defineProps({ open: Boolean, defaultPeriod: { type: Object, default: () => ({}) } })
const emit = defineEmits(['close', 'created'])
const toast = useToast()

const now = new Date()
const blankForm = () => ({ period_month: props.defaultPeriod.month || now.getMonth() + 1,
  period_year: props.defaultPeriod.year || now.getFullYear(), pay_date: '', department_id: null, notes: '' })
const f = ref(blankForm())
const departments = ref([])
const saving = ref(false)

const step = ref(1)
const dir = ref('fwd')
const elig = ref(null)
const eligLoading = ref(false)
const eligError = ref('')

const STEPS = [
  { key: 'period', label: 'Period & scope', icon: CalendarClock,
    title: 'New monthly run', sub: 'Open a payroll batch for the chosen period and scope.' },
  { key: 'eligibility', label: 'Eligibility', icon: ListChecks,
    title: 'Eligibility preview', sub: 'Exactly who will be paid for this period — and who is held back, with the reason.' },
  { key: 'review', label: 'Review & launch', icon: ClipboardCheck,
    title: 'Review & launch', sub: 'Confirm the run. A draft is created — nothing is paid until you release it.' },
]
const stepMeta = computed(() => STEPS[step.value - 1])
const segCls = (i) => ({ done: i + 1 < step.value, active: i + 1 === step.value })

// ── eligibility ring geometry ──
const ringCirc = 2 * Math.PI * 52
const ringOffset = computed(() => {
  if (!elig.value || !elig.value.total_candidates) return ringCirc
  const pct = elig.value.eligible_count / elig.value.total_candidates
  return ringCirc * (1 - pct)
})

const scopeLabel = computed(() => {
  if (!f.value.department_id) return 'All departments'
  const d = departments.value.find(x => x.id === f.value.department_id)
  return d ? d.name : 'Selected department'
})

const LIFE = {
  ACTIVE: 'Active', ON_PROBATION: 'Probation', ON_NOTICE: 'Notice',
  EXITED: 'Exited', SUSPENDED: 'Suspended', INACTIVE: 'Inactive', ARCHIVED: 'Archived',
}
const lifeLabel = (s) => LIFE[s] || s
const lifeCls = (s) => ({
  exit: s === 'EXITED', notice: s === 'ON_NOTICE', probation: s === 'ON_PROBATION', active: s === 'ACTIVE',
})
const REASON_SHORT = { no_compensation: 'No compensation', no_structure: 'No structure', no_components: 'Empty structure' }
const shortReason = (r) => REASON_SHORT[r] || 'Not payable'
const initials = (r) => {
  const n = (r.employee_name || r.employee_code || '?').trim()
  const parts = n.split(/\s+/)
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : n.slice(0, 2)).toUpperCase()
}
// trim trailing ".0" on whole-day counts (28.0 -> 28, keep 16.5)
const fmtDays = (d) => {
  const n = Number(d || 0)
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

const loadEligibility = async () => {
  eligLoading.value = true; eligError.value = ''
  try {
    elig.value = await fetchEligibility({
      period_month: f.value.period_month, period_year: f.value.period_year,
      department_id: f.value.department_id,
    })
  } catch (e) {
    eligError.value = e?.response?.data?.detail || 'Failed to run eligibility check'
    elig.value = null
  } finally { eligLoading.value = false }
}

const next = async () => {
  dir.value = 'fwd'
  if (step.value === 1) { step.value = 2; loadEligibility() }
  else if (step.value === 2) { step.value = 3 }
}
const back = () => { dir.value = 'back'; if (step.value > 1) step.value -= 1 }

const create = async () => {
  saving.value = true
  try {
    const batch = await createBatch({ period_month: f.value.period_month, period_year: f.value.period_year,
      pay_date: f.value.pay_date || null, department_id: f.value.department_id, notes: f.value.notes || null })
    toast.success(`Run ${batch.batch_no} created`)
    emit('created', batch); emit('close')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to create run') }
  finally { saving.value = false }
}

watch(() => props.open, async (o) => {
  if (!o) return
  f.value = blankForm()
  step.value = 1; dir.value = 'fwd'; elig.value = null; eligError.value = ''
  if (!departments.value.length) {
    try {
      const res = await axios.get(`${API}/hr/departments`, { headers: authHeader() })
      departments.value = Array.isArray(res.data) ? res.data : (res.data.items || [])
    } catch {}
  }
})
</script>

<style scoped>
/* shell width override — wizard needs room for the roster */
.paymw { width: min(720px, 96vw); }
.paymw-body { min-height: 320px; }

/* ── step rail ── */
.paymw-rail { display: flex; align-items: center; padding: 2px 24px 14px; gap: 0; }
.paymw-seg { position: relative; display: flex; align-items: center; gap: 8px; }
.paymw-seg-dot { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center;
  font-family: var(--pay-mono); font-size: 11px; font-weight: 700; flex-shrink: 0;
  background: var(--pay-surface-2); border: 1.5px solid var(--pay-border-soft); color: var(--pay-text-muted);
  transition: background 0.3s var(--pay-ease), border-color 0.3s var(--pay-ease), color 0.3s var(--pay-ease), box-shadow 0.3s; }
.paymw-seg.active .paymw-seg-dot { background: var(--pay-grad-cta); border-color: transparent; color: #1a1206;
  box-shadow: 0 0 0 4px rgba(251,191,36,0.16); animation: pay-node-halo 2s ease-in-out infinite; }
.paymw-seg.done .paymw-seg-dot { background: var(--pay-net); border-color: var(--pay-net); color: #04261a; }
.paymw-seg-lbl { font-size: 11.5px; font-weight: 600; color: var(--pay-text-muted); white-space: nowrap; transition: color 0.3s; }
.paymw-seg.active .paymw-seg-lbl, .paymw-seg.done .paymw-seg-lbl { color: var(--pay-text); }
.paymw-seg-line { flex: 1; min-width: 22px; height: 2px; margin: 0 10px; border-radius: 2px;
  background: var(--pay-border-soft); position: relative; overflow: hidden; }
.paymw-seg-line .fill { position: absolute; inset: 0; transform-origin: left; transform: scaleX(0);
  background: linear-gradient(90deg, var(--pay-net-strong), var(--pay-net)); transition: transform 0.45s var(--pay-ease); }
.paymw-seg-line .fill.on { transform: scaleX(1); }

/* ── pane swap transitions ── */
.paymw-pane { display: flex; flex-direction: column; gap: 14px; }
.paymw-step-fwd-enter-active, .paymw-step-back-enter-active,
.paymw-step-fwd-leave-active, .paymw-step-back-leave-active { transition: opacity 0.3s var(--pay-ease), transform 0.3s var(--pay-ease); }
.paymw-step-fwd-enter-from { opacity: 0; transform: translateX(26px); }
.paymw-step-fwd-leave-to { opacity: 0; transform: translateX(-22px); }
.paymw-step-back-enter-from { opacity: 0; transform: translateX(-26px); }
.paymw-step-back-leave-to { opacity: 0; transform: translateX(22px); }
.paymw-title-enter-active, .paymw-title-leave-active { transition: opacity 0.25s var(--pay-ease), transform 0.25s var(--pay-ease); }
.paymw-title-enter-from { opacity: 0; transform: translateY(8px); }
.paymw-title-leave-to { opacity: 0; transform: translateY(-8px); }

/* ── step 2: loading ── */
.paymw-elig-load { display: flex; flex-direction: column; gap: 16px; align-items: center; padding: 8px 0; }
.paymw-rows { display: flex; flex-direction: column; gap: 8px; width: 100%; }
.paymw-elig-err { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 26px; text-align: center; color: var(--pay-text-2); }
.paymw-elig-err svg { color: var(--pay-deduction); }

/* ── summary band: ring + kpis ── */
.paymw-summary { display: flex; gap: 18px; align-items: center; padding: 4px 0 2px; }
.paymw-ring { position: relative; width: 120px; height: 120px; flex-shrink: 0; display: grid; place-items: center; }
.paymw-ring-svg { width: 120px; height: 120px; transform: rotate(-90deg); }
.paymw-ring-svg .rt { fill: none; stroke: var(--pay-border-soft); stroke-width: 9; }
.paymw-ring-svg .rf { fill: none; stroke: url(#pwgrad); stroke: var(--pay-net); stroke-width: 9; stroke-linecap: round;
  transition: stroke-dashoffset 1s var(--pay-ease); filter: drop-shadow(0 0 6px rgba(52,211,153,0.4)); }
.paymw-ring-mid { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0; }
.paymw-ring-mid .rn { font-family: var(--pay-mono); font-size: 32px; font-weight: 800; color: var(--pay-text); line-height: 1; }
.paymw-ring-mid .rl { font-size: 10px; color: var(--pay-net-strong); margin-top: 5px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; }
.paymw-kpis { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
.paymw-kpi { padding: 10px 12px; border-radius: 12px; background: var(--pay-surface-2); border: 1px solid var(--pay-border-soft); }
.paymw-kpi.wide { grid-column: 1 / -1; }
.paymw-kpi.alert { border-color: rgba(194,65,12,0.3); background: var(--pay-deduction-soft); }
.k-lbl { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--pay-text-muted); }
.k-val { display: block; margin-top: 4px; font-family: var(--pay-mono); font-size: 20px; font-weight: 800; color: var(--pay-text); }
.k-val.ok { color: var(--pay-net); } .k-val.warn { color: var(--pay-deduction); }

/* ── roster ── */
.paymw-roster-h { display: flex; justify-content: space-between; align-items: center; font-size: 11px;
  text-transform: uppercase; letter-spacing: 0.06em; color: var(--pay-text-muted); margin-bottom: 6px; }
.paymw-roster-h .mono { font-family: var(--pay-mono); }
.paymw-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; max-height: 230px; overflow-y: auto; padding-right: 4px; }
.paymw-list::-webkit-scrollbar { width: 7px; } .paymw-list::-webkit-scrollbar-thumb { background: var(--pay-border); border-radius: 7px; }
.paymw-emp { display: flex; align-items: center; gap: 11px; padding: 9px 12px; border-radius: 12px;
  background: var(--pay-surface-2); border: 1px solid var(--pay-border-soft); }
.paymw-emp.blocked { opacity: 0.82; background: var(--pay-deduction-soft); border-color: rgba(194,65,12,0.22); }
.emp-ava { width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0; display: grid; place-items: center;
  font-family: var(--pay-mono); font-size: 12px; font-weight: 700; color: #1a1206; background: var(--pay-grad-rail); }
.emp-ava.blk { background: linear-gradient(135deg, #c2410c, #92400e); color: #fde8d8; }
.emp-id { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 1px; }
.emp-name { font-size: 13px; font-weight: 600; color: var(--pay-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.emp-meta { font-family: var(--pay-mono); font-size: 10.5px; color: var(--pay-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.emp-life { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 3px 7px; border-radius: 6px;
  background: rgba(255,255,255,0.05); color: var(--pay-text-muted); white-space: nowrap; }
.emp-life.active { color: var(--pay-net); background: var(--pay-net-soft); }
.emp-life.probation { color: var(--pay-mint); background: rgba(251,191,36,0.12); }
.emp-life.notice { color: var(--pay-amber); background: rgba(245,158,11,0.12); }
.emp-life.exit { color: var(--pay-statutory); background: var(--pay-statutory-soft); }
.emp-num { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; min-width: 84px; }
.emp-ctc { font-size: 13px; }
.emp-ctc.dim { color: var(--pay-text-muted); font-family: var(--pay-mono); }
.emp-sub { font-family: var(--pay-mono); font-size: 9.5px; color: var(--pay-text-muted); white-space: nowrap; }
.emp-sub .lop { color: var(--pay-deduction); }
.emp-flag { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 700; padding: 4px 9px; border-radius: 999px; white-space: nowrap; min-width: 78px; justify-content: center; }
.emp-flag.ok { color: var(--pay-net); background: var(--pay-net-soft); }
.emp-flag.blk { color: var(--pay-deduction); background: rgba(194,65,12,0.14); }

/* ── step 3: review ── */
.paymw-review { display: flex; flex-direction: column; gap: 14px; }
.paymw-rev-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.rev-cell { padding: 12px 14px; border-radius: 12px; background: var(--pay-surface-2); border: 1px solid var(--pay-border-soft);
  animation: pay-rise 0.5s var(--pay-ease) both; animation-delay: calc(var(--i,0) * 60ms + 0.05s); }
.rev-cell span { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--pay-text-muted); margin-bottom: 5px; }
.rev-cell b { font-size: 15px; color: var(--pay-text); font-weight: 700; } .rev-cell b.ok { color: var(--pay-net); font-family: var(--pay-mono); }
.paymw-rev-totals { display: flex; flex-direction: column; gap: 8px; padding: 14px 16px; border-radius: 14px;
  background: rgba(251,191,36,0.06); border: 1px solid var(--pay-border); }
.rt-row { display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; color: var(--pay-text-2); }
.rt-row span { display: inline-flex; align-items: center; gap: 7px; }
.rt-row .rt-val { font-size: 16px; color: var(--pay-text); } .rt-row b.warn { color: var(--pay-deduction); }
.rt-row .mono { font-family: var(--pay-mono); }
.rt-row.strong { padding-bottom: 8px; border-bottom: 1px solid var(--pay-border-soft); margin-bottom: 2px; }
.rt-row.strong span { color: var(--pay-text); font-weight: 600; }
.rt-row.strong .rt-val { font-size: 19px; }

/* ── footer extras ── */
.paymw-foot { justify-content: space-between; align-items: center; }
.paymw-foot-r { display: flex; align-items: center; gap: 12px; }
.paymw-foot-hint { font-size: 11px; color: var(--pay-text-muted); }
.paym-btn { display: inline-flex; align-items: center; gap: 6px; }

@media (max-width: 560px) {
  .paymw-summary { flex-direction: column; } .paymw-kpis { width: 100%; }
  .paymw-rev-grid { grid-template-columns: 1fr; } .paymw-seg-lbl { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .paymw-seg.active .paymw-seg-dot { animation: none; }
  .paymw-ring-svg .rf { transition: none; }
}

/* ════════ LIGHT THEME OVERRIDES ════════ */
[data-theme="light"] .paymw-seg-dot { background: var(--pay-surface-2); }
[data-theme="light"] .paymw-kpi { background: rgba(255,250,240,0.7); }
[data-theme="light"] .paymw-emp { background: rgba(255,250,240,0.7); }
[data-theme="light"] .paymw-emp.blocked { background: rgba(154,52,18,0.07); border-color: rgba(154,52,18,0.2); }
[data-theme="light"] .emp-life { background: rgba(40,25,10,0.05); }
[data-theme="light"] .rev-cell { background: rgba(255,250,240,0.7); }
[data-theme="light"] .paymw-ring-svg .rf { filter: drop-shadow(0 0 5px rgba(5,150,105,0.35)); }
</style>
