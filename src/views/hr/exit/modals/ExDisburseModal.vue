<!--
  ExDisburseModal — "The Disbursement · Treasury Authorization"
  ─────────────────────────────────────────────────────────────────────────────
  Corporate-grade Full & Final payout flow (maker-checker, à la Google/Microsoft
  treasury ops). Replaces the old single-panel "Disburse F&F" modal.

  Three stages: Channel → Schedule → Authorize, each gated, with an always-on
  signature instrument (the "Disbursement Conduit") that routes the F&F amount
  from the settlement vault, through the chosen channel, to its destination.

  The whole point of the redesign: make the F&F-vs-salary reconciliation
  EXPLICIT, which the old modal never did. The recurring confusion was —
  "F&F is ₹7,008 but the payroll bank file shows ₹3,808, how does finance pay
  this?" The answer depends entirely on the channel:
    • PAYROLL  → posts a ₹7,008 ARREAR onto the chosen pay run; the employee's
                 salary bank file for that month becomes ONE combined transfer
                 (regular net + F&F). We fetch the regular payslip live and show
                 the exact combined figure, plus a hard warning if that run was
                 already RELEASED (the arrear won't land until it's regenerated).
    • BANK     → a SEPARATE bank transfer, outside the salary run — it will NOT
                 appear in the payroll bank file.
    • CASH     → paid manually outside payroll; recorded here for audit only.

  Backend contract is unchanged — paySettlement still receives
  { settlement_method, period_month, period_year, note }. Value date + payment
  reference (bank/cash) are folded into `note` so no schema migration is needed.
-->
<template>
  <Teleport to="body">
    <Presence>
      <div v-if="open" class="dz-overlay" @mousedown.self="$emit('close')">
        <Motion as="div" class="dz ex-grain"
          :initial="reduced ? false : { opacity: 0, y: 28, scale: 0.965 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18, scale: 0.98 }"
          :transition="{ duration: 0.34, ease: [0.16,1,0.3,1] }">
          <span class="dz-sheen" aria-hidden="true" />

          <!-- ── header ── -->
          <header class="dz-head">
            <span class="dz-ico"><Banknote :size="19" /></span>
            <div class="dz-htxt">
              <h3 class="dz-title">Disburse Full &amp; Final</h3>
              <p class="dz-sub">
                <span class="ex-mono">{{ settlement?.settlement_number }}</span>
                <span class="dz-dot">·</span>
                <span :class="['dz-dir', dir]">{{ dirLabel }} {{ fmtINR(netAbs) }}</span>
              </p>
            </div>
            <button class="dz-x" type="button" @click="$emit('close')"><X :size="17" /></button>
          </header>

          <!-- ── step rail ── -->
          <div class="dz-rail">
            <template v-for="(st, i) in STEPS" :key="st.k">
              <button class="dz-step" :class="{ on: step === i + 1, done: step > i + 1 }"
                type="button" @click="goStep(i + 1)" :disabled="i + 1 > maxReached">
                <span class="dz-step-dot">
                  <Presence mode="wait">
                    <Motion v-if="step > i + 1" key="c" as="span" :initial="{ scale: 0 }" :animate="{ scale: 1 }"><Check :size="12" /></Motion>
                    <Motion v-else key="n" as="span" :initial="false">{{ i + 1 }}</Motion>
                  </Presence>
                </span>
                <span class="dz-step-l">{{ st.label }}</span>
              </button>
              <span v-if="i < STEPS.length - 1" class="dz-step-link" :class="{ on: step > i + 1 }" />
            </template>
          </div>

          <div class="dz-body">
            <!-- notice-period gate — F&F disburses only once notice is served -->
            <div v-if="!noticeServed" class="dz-notice">
              <CalendarClock :size="17" />
              <div class="dz-notice-t">
                <b>Notice period still being served</b>
                <span>{{ noticeBlock || 'The Full & Final can be disbursed once the notice period is served.' }}</span>
              </div>
            </div>

            <!-- ════ SIGNATURE INSTRUMENT — the Disbursement Conduit ════ -->
            <div class="cdt" :class="method.toLowerCase()" ref="cdtEl">
              <span class="cdt-aura" aria-hidden="true" />
              <span class="cdt-grid" aria-hidden="true" />

              <!-- source: the F&F vault -->
              <div class="cdt-node src">
                <span class="cdt-ic"><Scale :size="16" /></span>
                <span class="cdt-lbl">Full &amp; Final</span>
                <span class="cdt-amt ex-mono">{{ fmtINR(netAbs) }}</span>
              </div>

              <!-- conduit rail 1 -->
              <div class="cdt-pipe">
                <span class="cdt-flow" aria-hidden="true" />
                <i v-for="n in 3" :key="'p1' + n" class="cdt-pcl" :style="pclStyle(n, 0)" aria-hidden="true" />
              </div>

              <!-- channel router hub -->
              <div class="cdt-hub">
                <span class="cdt-hub-ring" aria-hidden="true" />
                <span class="cdt-hub-ring r2" aria-hidden="true" />
                <Presence mode="wait">
                  <Motion :key="method" as="span" class="cdt-hub-ic"
                    :initial="reduced ? false : { scale: 0.5, rotate: -40, opacity: 0 }"
                    :animate="{ scale: 1, rotate: 0, opacity: 1 }"
                    :exit="{ scale: 0.5, rotate: 40, opacity: 0 }"
                    :transition="{ duration: 0.32, ease: [0.16,1,0.3,1] }">
                    <component :is="hubIcon" :size="20" />
                  </Motion>
                </Presence>
              </div>

              <!-- conduit rail 2 -->
              <div class="cdt-pipe">
                <span class="cdt-flow" aria-hidden="true" />
                <i v-for="n in 3" :key="'p2' + n" class="cdt-pcl" :style="pclStyle(n, 0.4)" aria-hidden="true" />
              </div>

              <!-- destination -->
              <div class="cdt-node dest">
                <span class="cdt-ic"><component :is="destIcon" :size="16" /></span>
                <span class="cdt-lbl">{{ destLabel }}</span>
                <span class="cdt-amt ex-mono">{{ destAmt }}</span>
              </div>
            </div>
            <Motion as="p" class="cdt-caption" :class="captionTone" :key="captionKey"
              :initial="reduced ? false : { opacity: 0, y: 4 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.3 }">
              <component :is="captionIcon" :size="13" class="cdt-cap-ic" />
              <span>{{ caption }}</span>
            </Motion>

            <!-- ════ STEP 1 — CHANNEL ════ -->
            <Presence mode="wait">
              <Motion v-if="step === 1" key="s1" as="div" class="dz-pane"
                :initial="reduced ? false : { opacity: 0, x: -10 }" :animate="{ opacity: 1, x: 0 }" :exit="{ opacity: 0, x: -10 }" :transition="{ duration: 0.26 }">
                <span class="dz-eyebrow">Settlement channel</span>
                <div class="dz-methods">
                  <button v-for="m in METHODS" :key="m.k" type="button" class="dz-method" :class="{ on: method === m.k }" @click="method = m.k">
                    <span class="dz-method-ic"><component :is="m.icon" :size="17" /></span>
                    <span class="dz-method-t">{{ m.label }}</span>
                    <span class="dz-method-s">{{ m.sub }}</span>
                    <Presence><Motion v-if="method === m.k" as="span" class="dz-method-chk" :initial="{ scale: 0 }" :animate="{ scale: 1 }" :exit="{ scale: 0 }"><Check :size="12" /></Motion></Presence>
                  </button>
                </div>

                <!-- the reconciliation explainer (the confusion-resolver) -->
                <Presence mode="wait">
                  <!-- PAYROLL -->
                  <Motion v-if="method === 'PAYROLL'" key="ex-pr" as="div" class="dz-explain" :class="{ danger: noRunRisk }" :initial="reduced ? false : { opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: -6 }" :transition="{ duration: 0.28 }">
                    <!-- guard: separated employee not in any run → arrear would orphan -->
                    <template v-if="noRunRisk">
                      <p class="dz-explain-h danger"><AlertTriangle :size="13" /> This won't be paid through payroll</p>
                      <p class="dz-explain-b">
                        {{ employeeName || 'This employee' }} is <b>{{ (lifecycleState || 'no longer active').toLowerCase() }}</b> and isn't in the
                        <b>{{ monthName }} {{ periodYear }}</b> payroll run. An arrear posted here would sit <b>unpaid</b> — payroll only
                        pays employees who are in the run for that period. Settle the F&amp;F as a <b>separate Bank transfer</b> (or Cash) instead.
                      </p>
                      <button type="button" class="dz-switch" @click="method = 'BANK_TRANSFER'"><Landmark :size="14" /> Switch to Bank transfer</button>
                    </template>
                    <template v-else>
                      <p class="dz-explain-h"><Info :size="13" /> One combined salary transfer</p>
                      <p class="dz-explain-b">
                        The F&amp;F posts as an <b>arrear</b> onto {{ employeeName || 'the employee' }}'s
                        <b>{{ monthName }} {{ periodYear }}</b> pay run. Their salary bank-file row for that month
                        becomes a single combined payment — finance pays <b>once</b>, not twice.
                      </p>
                      <!-- live combined-transfer ledger -->
                      <div class="dz-combine" :class="{ loading: loadingPayslip }">
                        <div class="dz-cmb-row">
                          <span>Regular {{ monthName }} net pay
                            <Presence><Motion v-if="regularPayslip" as="i" class="dz-pay-stat" :class="payslipTone" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }">{{ regularPayslip.status }}</Motion></Presence>
                          </span>
                          <b class="ex-mono">{{ loadingPayslip ? '…' : (regularPayslip ? fmtINR(regNet) : '—') }}</b>
                        </div>
                        <div class="dz-cmb-row earn"><span><ArrowUpRight :size="12" /> F&amp;F arrear</span><b class="ex-mono">{{ fmtINR(earnings) }}</b></div>
                        <div v-if="recoveries > 0" class="dz-cmb-row rec"><span><ArrowDownRight :size="12" /> F&amp;F recovery</span><b class="ex-mono">−{{ fmtINR(recoveries) }}</b></div>
                        <div class="dz-cmb-row total">
                          <span>{{ regularPayslip ? 'Combined bank transfer' : 'F&F arrear posted' }}</span>
                          <b class="ex-mono">{{ regularPayslip ? fmtINR(combined) : '+' + fmtINR(net) }}</b>
                        </div>
                      </div>
                      <Presence>
                        <Motion v-if="staleWarning" as="div" class="dz-warn" :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }">
                          <AlertTriangle :size="14" />
                          <span>The <b>{{ monthName }}</b> run is already <b>released</b>. This arrear is recorded but won't reach the bank file until that batch is <b>regenerated</b> — or pick the next open pay run.</span>
                        </Motion>
                      </Presence>
                    </template>
                  </Motion>

                  <!-- BANK -->
                  <Motion v-else-if="method === 'BANK_TRANSFER'" key="ex-bk" as="div" class="dz-explain" :initial="reduced ? false : { opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: -6 }" :transition="{ duration: 0.28 }">
                    <p class="dz-explain-h"><Info :size="13" /> A separate bank transfer</p>
                    <p class="dz-explain-b">
                      Finance wires <b>{{ fmtINR(netAbs) }}</b> to {{ employeeName || 'the employee' }} directly.
                      This is <b>outside</b> the salary run — it will <b>not</b> appear in the payroll bank file, and posts
                      <b>no</b> payroll entry. Capture the UTR / reference next so the books reconcile.
                    </p>
                  </Motion>

                  <!-- CASH -->
                  <Motion v-else key="ex-csh" as="div" class="dz-explain" :initial="reduced ? false : { opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: -6 }" :transition="{ duration: 0.28 }">
                    <p class="dz-explain-h"><Info :size="13" /> Paid in cash</p>
                    <p class="dz-explain-b">
                      <b>{{ fmtINR(netAbs) }}</b> handed over / paid manually, outside payroll. Recorded here for the
                      audit trail only — no payroll entry and nothing in the salary bank file.
                    </p>
                  </Motion>
                </Presence>
              </Motion>

              <!-- ════ STEP 2 — SCHEDULE & REFERENCE ════ -->
              <Motion v-else-if="step === 2" key="s2" as="div" class="dz-pane"
                :initial="reduced ? false : { opacity: 0, x: -10 }" :animate="{ opacity: 1, x: 0 }" :exit="{ opacity: 0, x: -10 }" :transition="{ duration: 0.26 }">
                <template v-if="method === 'PAYROLL'">
                  <span class="dz-eyebrow">Target pay run</span>
                  <div class="dz-two">
                    <div class="dz-fld"><label>Pay-run month</label><ExSelect v-model="periodMonth" :options="monthOpts" /></div>
                    <div class="dz-fld"><label>Pay-run year</label><ExSelect v-model="periodYear" :options="yearOpts" /></div>
                  </div>
                  <div class="dz-hint"><CalendarClock :size="13" /><span>Posted as an approved, unpaid arrear. It folds into the net pay when this run is generated or regenerated.</span></div>
                </template>
                <template v-else>
                  <span class="dz-eyebrow">{{ method === 'CASH' ? 'Cash payout details' : 'Bank transfer details' }}</span>
                  <div class="dz-two">
                    <div class="dz-fld">
                      <label>Value date</label>
                      <HrDatePicker v-model="valueDate" placeholder="dd / mm / yyyy" />
                    </div>
                    <div class="dz-fld">
                      <label>{{ method === 'CASH' ? 'Voucher no.' : 'UTR / reference' }} <i>(optional)</i></label>
                      <input v-model="reference" type="text" class="dz-input" :placeholder="method === 'CASH' ? 'CASH-VCH-…' : 'UTR / NEFT ref…'" />
                    </div>
                  </div>
                </template>
                <div class="dz-fld"><label>Note <i>(optional)</i></label><input v-model="note" type="text" class="dz-input" placeholder="Reference / remarks for the audit trail" /></div>
              </Motion>

              <!-- ════ STEP 3 — AUTHORIZE ════ -->
              <Motion v-else key="s3" as="div" class="dz-pane"
                :initial="reduced ? false : { opacity: 0, x: -10 }" :animate="{ opacity: 1, x: 0 }" :exit="{ opacity: 0, x: -10 }" :transition="{ duration: 0.26 }">
                <span class="dz-eyebrow">Disbursement instruction</span>
                <div v-if="noRunRisk" class="dz-risk">
                  <AlertTriangle :size="16" />
                  <span><b>{{ employeeName || 'This employee' }}</b> isn't in the {{ monthName }} payroll run — a payroll arrear won't be paid.
                    <button type="button" class="dz-risk-sw" @click="method = 'BANK_TRANSFER'; step = 1">Switch to Bank</button></span>
                </div>
                <div class="dz-instr">
                  <span class="dz-instr-sheen" aria-hidden="true" />
                  <div class="dz-instr-row"><span class="dz-il">Beneficiary</span><span class="dz-iv">{{ employeeName || '—' }}</span></div>
                  <div class="dz-instr-row"><span class="dz-il">Channel</span><span class="dz-iv"><component :is="hubIcon" :size="13" /> {{ methodLabel }}</span></div>
                  <div class="dz-instr-row"><span class="dz-il">{{ method === 'PAYROLL' ? 'Pay run' : 'Value date' }}</span><span class="dz-iv">{{ method === 'PAYROLL' ? `${monthName} ${periodYear}` : (valueDate ? fmtDate(valueDate) : 'On disbursement') }}</span></div>
                  <div v-if="method !== 'PAYROLL' && reference" class="dz-instr-row"><span class="dz-il">Reference</span><span class="dz-iv ex-mono">{{ reference }}</span></div>
                  <div class="dz-instr-sep" />
                  <div class="dz-instr-row money earn"><span class="dz-il"><ArrowUpRight :size="12" /> Arrear (earnings)</span><span class="dz-iv ex-mono">{{ fmtINR(earnings) }}</span></div>
                  <div class="dz-instr-row money rec"><span class="dz-il"><ArrowDownRight :size="12" /> Recovery (deduction)</span><span class="dz-iv ex-mono">{{ fmtINR(recoveries) }}</span></div>
                  <div class="dz-instr-row money net"><span class="dz-il">{{ dirLabel }}</span><span class="dz-iv ex-mono">{{ fmtINR(netAbs) }}</span></div>
                  <div v-if="method === 'PAYROLL' && regularPayslip" class="dz-instr-combine">
                    <span><Banknote :size="12" /> Combined {{ monthName }} bank transfer</span>
                    <b class="ex-mono">{{ fmtINR(combined) }}</b>
                  </div>
                </div>

                <!-- maker-checker provenance -->
                <div class="dz-mc">
                  <div class="dz-mc-node done"><BadgeCheck :size="14" /><div><span class="dz-mc-l">Approved</span><span class="dz-mc-d">{{ settlement?.approved_at ? fmtDate(settlement.approved_at) : 'Finance' }}</span></div></div>
                  <span class="dz-mc-arrow"><ArrowRight :size="13" /></span>
                  <div class="dz-mc-node live"><ShieldCheck :size="14" /><div><span class="dz-mc-l">Disbursed by</span><span class="dz-mc-d">You · now</span></div></div>
                </div>

                <!-- authorization gate -->
                <button type="button" class="dz-ack" :class="{ on: ack }" @click="ack = !ack">
                  <component :is="ack ? CheckCircle2 : Circle" :size="18" class="dz-ack-ic" />
                  <span>I confirm this Full &amp; Final is verified &amp; approved, and <b>authorise its disbursement</b> via {{ methodLabel }}.</span>
                </button>
              </Motion>
            </Presence>
          </div>

          <!-- ── footer ── -->
          <footer class="dz-foot">
            <button v-if="step > 1" class="dz-btn ghost" type="button" :disabled="busy" @click="step--"><ArrowLeft :size="15" /> Back</button>
            <button v-else class="dz-btn ghost" type="button" :disabled="busy" @click="$emit('close')">Cancel</button>
            <button v-if="step < 3" class="dz-btn primary" type="button" @click="step++">Continue <ArrowRight :size="15" /></button>
            <button v-else class="dz-btn go" type="button" :disabled="busy || !ack || !noticeServed" @click="submit"
              :title="noticeServed ? '' : noticeBlock">
              <Loader2 v-if="busy" :size="16" class="dz-spin" /><Banknote v-else :size="16" />
              {{ busy ? 'Disbursing…' : !noticeServed ? 'Notice not served' : 'Disburse ' + fmtINR(netAbs) }}
            </button>
          </footer>
        </Motion>
      </div>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  Banknote, Landmark, Wallet, Scale, X, Check, CheckCircle2, Circle, Info, AlertTriangle,
  CalendarClock, ArrowRight, ArrowLeft, ArrowUpRight, ArrowDownRight, ShieldCheck, BadgeCheck, Loader2,
} from 'lucide-vue-next'
import ExSelect from '../components/ExSelect.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import { fmtINR, fmtDate } from '@/composables/useExit'
import { fetchPayslips } from '@/composables/usePayslip'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  open: { type: Boolean, default: false },
  settlement: { type: Object, default: null },
  employeeId: { type: [String, null], default: null },
  employeeName: { type: String, default: '' },
  lastWorkingDate: { type: [String, null], default: null },
  lifecycleState: { type: String, default: '' },
  noticeServed: { type: Boolean, default: true },
  noticeBlock: { type: String, default: '' },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'disburse'])
const reduced = prefersReduced()

const STEPS = [{ k: 'channel', label: 'Channel' }, { k: 'schedule', label: 'Schedule' }, { k: 'authorize', label: 'Authorize' }]
const METHODS = [
  { k: 'PAYROLL', label: 'Payroll', sub: 'Folds into the pay run', icon: Banknote },
  { k: 'BANK_TRANSFER', label: 'Bank', sub: 'Separate transfer', icon: Landmark },
  { k: 'CASH', label: 'Cash', sub: 'Manual payout', icon: Wallet },
]
const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
const monthOpts = monthNames.map((m, i) => ({ value: i + 1, label: m }))

const step = ref(1)
const maxReached = ref(1)
const method = ref('PAYROLL')
const periodMonth = ref(1)
const periodYear = ref(2026)
const valueDate = ref('')
const reference = ref('')
const note = ref('')
const ack = ref(false)
const cdtEl = ref(null)
const regularPayslip = ref(null)
const loadingPayslip = ref(false)

const num = (v) => Number(v || 0)
const earnings = computed(() => num(props.settlement?.total_earnings))
const recoveries = computed(() => num(props.settlement?.total_recoveries))
const net = computed(() => num(props.settlement?.net_amount))
const netAbs = computed(() => Math.abs(net.value))
const dir = computed(() => (net.value > 0 ? 'payable' : net.value < 0 ? 'recoverable' : 'balanced'))
const dirLabel = computed(() => (dir.value === 'recoverable' ? 'Net recoverable' : dir.value === 'payable' ? 'Net payable' : 'Balanced'))
const monthName = computed(() => monthNames[periodMonth.value - 1] || '')
const yearOpts = computed(() => {
  const y = periodYear.value
  return [y - 1, y, y + 1].map(v => ({ value: v, label: String(v) }))
})

const methodLabel = computed(() => METHODS.find(m => m.k === method.value)?.label || method.value)
const hubIcon = computed(() => (method.value === 'PAYROLL' ? Banknote : method.value === 'BANK_TRANSFER' ? Landmark : Wallet))
const destIcon = computed(() => (method.value === 'PAYROLL' ? CalendarClock : method.value === 'BANK_TRANSFER' ? Landmark : Wallet))
const destLabel = computed(() => (method.value === 'PAYROLL' ? `${monthName.value} run` : method.value === 'BANK_TRANSFER' ? 'Bank A/C' : 'Cash'))
const regNet = computed(() => num(regularPayslip.value?.net_pay))
const combined = computed(() => regNet.value + net.value)
const destAmt = computed(() => {
  if (method.value !== 'PAYROLL') return fmtINR(netAbs.value)
  return regularPayslip.value ? fmtINR(combined.value) : '+' + fmtINR(net.value)
})

// payslip status → tone + stale-batch detection
const payslipTone = computed(() => {
  const s = regularPayslip.value?.status
  return s === 'RELEASED' ? 'released' : s === 'HELD' || s === 'CANCELLED' ? 'held' : 'draft'
})
const staleWarning = computed(() => method.value === 'PAYROLL' && regularPayslip.value?.status === 'RELEASED')

// Payroll candidate states (mirror backend PAYABLE_STATES). An employee outside
// these — EXITED / ARCHIVED / INACTIVE / SUSPENDED — is generally NOT in a
// regular run, so a payroll arrear would orphan (post but never get paid). When
// they're separated AND have no payslip for the chosen period, surface it loudly
// and steer to Bank / Cash. This is the guard for the "Abrar isn't in the run" gap.
const PAYABLE_STATES = ['ACTIVE', 'ON_PROBATION', 'ON_NOTICE']
const separated = computed(() => !!props.lifecycleState && !PAYABLE_STATES.includes(props.lifecycleState))
const noRunRisk = computed(() => method.value === 'PAYROLL' && separated.value && !loadingPayslip.value && !regularPayslip.value)

// conduit caption — the one-line confusion-resolver
const caption = computed(() => {
  if (method.value === 'BANK_TRANSFER') return 'Separate bank transfer — will NOT appear in the salary bank file.'
  if (method.value === 'CASH') return 'Paid in cash outside payroll — recorded for audit only.'
  if (noRunRisk.value) return `${props.employeeName || 'This employee'} has left payroll — a ${monthName.value} arrear won't be paid. Use Bank transfer or Cash.`
  if (staleWarning.value) return `${monthName.value} run already released — regenerate that batch (or use the next open run) so this lands.`
  if (regularPayslip.value) return `${props.employeeName || 'Employee'}'s ${monthName.value} bank file becomes one combined transfer of ${fmtINR(combined.value)}.`
  return `Posts a ${fmtINR(net.value)} arrear to the ${monthName.value} run — folds into one transfer when it's generated.`
})
const captionTone = computed(() => (noRunRisk.value ? 'danger' : staleWarning.value ? 'warn' : method.value === 'PAYROLL' ? 'good' : 'info'))
const captionIcon = computed(() => (noRunRisk.value || staleWarning.value ? AlertTriangle : Info))
const captionKey = computed(() => `${method.value}-${noRunRisk.value}-${staleWarning.value}-${!!regularPayslip.value}`)

// particle inline style — staggered along the conduit
const pclStyle = (n, base) => ({
  animationDelay: `${(base + n * 0.55).toFixed(2)}s`,
})

const goStep = (n) => { if (n <= maxReached.value) step.value = n }

watch(step, (v) => { if (v > maxReached.value) maxReached.value = v })

// fetch the employee's regular payslip for the chosen period (best-effort)
let payslipReq = 0
const loadRegularPayslip = async () => {
  regularPayslip.value = null
  if (!props.open || method.value !== 'PAYROLL' || !props.employeeId) return
  const reqId = ++payslipReq
  loadingPayslip.value = true
  try {
    const { items } = await fetchPayslips({ employee_id: props.employeeId, month: periodMonth.value, year: periodYear.value, limit: 5 })
    if (reqId !== payslipReq) return
    regularPayslip.value = (items || []).find(p => p.period_month === periodMonth.value && p.period_year === periodYear.value) || null
  } catch {
    if (reqId === payslipReq) regularPayslip.value = null
  } finally {
    if (reqId === payslipReq) loadingPayslip.value = false
  }
}
watch([() => props.open, method, periodMonth, periodYear], loadRegularPayslip)

// (re)initialise on open
watch(() => props.open, (o) => {
  if (!o) return
  const now = new Date()
  const lwd = props.lastWorkingDate ? new Date(props.lastWorkingDate) : null
  const base = lwd && !isNaN(lwd.getTime()) ? lwd : now
  periodMonth.value = base.getMonth() + 1
  periodYear.value = base.getFullYear()
  method.value = 'PAYROLL'
  step.value = 1; maxReached.value = 1
  valueDate.value = (lwd && !isNaN(lwd.getTime()) ? lwd : now).toISOString().slice(0, 10)
  reference.value = ''; note.value = ''; ack.value = false
}, { immediate: true })

const submit = () => {
  if (!ack.value || props.busy || !props.noticeServed) return
  // Fold value-date + reference into `note` for bank/cash (backend stores method/period/note only).
  let composedNote = note.value.trim()
  if (method.value !== 'PAYROLL') {
    const bits = []
    if (reference.value.trim()) bits.push(`Ref ${reference.value.trim()}`)
    if (valueDate.value) bits.push(`Value ${valueDate.value}`)
    if (composedNote) bits.push(composedNote)
    composedNote = bits.join(' · ')
  }
  emit('disburse', {
    settlement_method: method.value,
    period_month: periodMonth.value,
    period_year: periodYear.value,
    note: composedNote || undefined,
  })
}
</script>

<style scoped>
.dz-overlay { position: fixed; inset: 0; z-index: 1440; display: grid; place-items: center; padding: 20px;
  background: rgba(6,5,10,0.66); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
[data-theme="light"] .dz-overlay { background: rgba(60,45,20,0.32); }
.dz { position: relative; overflow: hidden; width: min(580px, 96vw); max-height: 92vh; display: flex; flex-direction: column;
  border-radius: 22px; background: var(--ex-surface-elevated); border: 1px solid var(--ex-border-strong); box-shadow: var(--ex-shadow); }
.dz-sheen { position: absolute; inset: 0 0 auto; height: 2px; pointer-events: none;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--ex-cleared) 70%, transparent), transparent); }

/* header */
.dz-head { display: flex; align-items: flex-start; gap: 12px; padding: 18px 20px 12px; flex-shrink: 0; }
.dz-ico { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
  color: var(--ex-cleared); background: color-mix(in srgb, var(--ex-cleared) 13%, transparent); border: 1px solid color-mix(in srgb, var(--ex-cleared) 30%, transparent); }
.dz-htxt { flex: 1; min-width: 0; }
.dz-title { font-size: 16px; font-weight: 830; margin: 0; color: var(--ex-text); }
.dz-sub { font-size: 12px; color: var(--ex-text-muted); margin: 3px 0 0; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.dz-dot { opacity: 0.4; }
.dz-dir.payable { color: var(--ex-cleared); font-weight: 700; }
.dz-dir.recoverable { color: var(--ex-blocked); font-weight: 700; }
.dz-dir.balanced { color: var(--ex-text-muted); font-weight: 700; }
.dz-x { margin-left: auto; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; cursor: pointer; flex-shrink: 0;
  background: transparent; border: 1px solid var(--ex-border); color: var(--ex-text-muted); transition: color 0.2s, border-color 0.2s; }
.dz-x:hover { color: var(--ex-text); border-color: var(--ex-border-strong); }

/* step rail */
.dz-rail { display: flex; align-items: center; gap: 0; padding: 4px 22px 14px; flex-shrink: 0; }
.dz-step { display: flex; align-items: center; gap: 8px; padding: 4px 2px; background: transparent; border: none; cursor: pointer; }
.dz-step:disabled { cursor: default; }
.dz-step-dot { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0; font-size: 11.5px; font-weight: 800;
  background: var(--ex-panel); border: 1px solid var(--ex-border-strong); color: var(--ex-text-muted); transition: all 0.3s var(--ex-spring); }
.dz-step.on .dz-step-dot { background: var(--ex-grad-hero); border-color: transparent; color: #1a1206; box-shadow: 0 0 0 4px color-mix(in srgb, var(--ex-amber) 16%, transparent); }
.dz-step.done .dz-step-dot { background: color-mix(in srgb, var(--ex-cleared) 18%, transparent); border-color: color-mix(in srgb, var(--ex-cleared) 45%, transparent); color: var(--ex-cleared); }
.dz-step-l { font-size: 12px; font-weight: 700; color: var(--ex-text-muted); transition: color 0.3s; }
.dz-step.on .dz-step-l { color: var(--ex-text); }
.dz-step.done .dz-step-l { color: var(--ex-cleared); }
.dz-step-link { flex: 1; height: 2px; margin: 0 9px; border-radius: 2px; background: var(--ex-border); position: relative; overflow: hidden; }
.dz-step-link.on { background: color-mix(in srgb, var(--ex-cleared) 45%, transparent); }

/* body */
.dz-body { padding: 2px 20px 14px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; flex: 1 1 auto; min-height: 0; }
.dz-body > * { flex-shrink: 0; }
.dz-pane { display: flex; flex-direction: column; gap: 11px; }
.dz-eyebrow { font-size: 10px; font-weight: 850; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ex-text-muted); }

/* notice-period gate banner */
.dz-notice { display: flex; align-items: center; gap: 11px; padding: 11px 13px; border-radius: 13px;
  color: var(--ex-pending); background: color-mix(in srgb, var(--ex-pending) 11%, transparent); border: 1px solid color-mix(in srgb, var(--ex-pending) 32%, transparent); }
.dz-notice > svg { flex-shrink: 0; }
.dz-notice-t { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.dz-notice-t b { font-size: 12.5px; font-weight: 800; color: var(--ex-text); }
.dz-notice-t span { font-size: 11.5px; line-height: 1.45; color: var(--ex-text-secondary); }

/* ════ Disbursement Conduit (signature instrument) ════ */
/* payroll = brand gold (pinned so it stays legible on the cream light theme,
   not the lighter --ex-amber); bank = emerald (clean settled channel);
   cash = warm neutral (manual). No blue/purple/teal — on-brand palette. */
.cdt { --cdt-c: #f59e0b; position: relative; overflow: hidden; display: grid; grid-template-columns: auto 1fr auto 1fr auto; align-items: center; gap: 4px;
  padding: 18px 16px; border-radius: 16px; background: var(--ex-panel); border: 1px solid var(--ex-border); }
.cdt.bank_transfer { --cdt-c: #10b981; }
.cdt.cash { --cdt-c: #a8895c; }
.cdt-aura { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background: radial-gradient(60% 120% at 50% -10%, color-mix(in srgb, var(--cdt-c) 18%, transparent), transparent 70%); }
.cdt-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.4;
  background-image: linear-gradient(color-mix(in srgb, var(--ex-text) 5%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--ex-text) 5%, transparent) 1px, transparent 1px);
  background-size: 22px 22px; mask-image: radial-gradient(80% 80% at 50% 50%, #000, transparent); }
.cdt-node { position: relative; display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 92px; padding: 4px 6px; }
.cdt-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 12px;
  color: var(--cdt-c); background: color-mix(in srgb, var(--cdt-c) 13%, transparent); border: 1px solid color-mix(in srgb, var(--cdt-c) 32%, transparent); }
.cdt-node.src .cdt-ic { color: var(--ex-text-secondary); background: color-mix(in srgb, var(--ex-text) 8%, transparent); border-color: var(--ex-border-strong); }
.cdt-lbl { font-size: 9.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ex-text-muted); white-space: nowrap; }
.cdt-amt { font-size: 13.5px; font-weight: 840; color: var(--ex-text); white-space: nowrap; }
.cdt-node.dest .cdt-amt { color: var(--cdt-c); }

.cdt-pipe { position: relative; height: 40px; }
.cdt-flow { position: absolute; top: 50%; left: 0; right: 0; height: 3px; transform: translateY(-50%); border-radius: 3px;
  background-image: repeating-linear-gradient(90deg, color-mix(in srgb, var(--cdt-c) 60%, transparent) 0 8px, transparent 8px 16px);
  background-size: 16px 100%; animation: cdt-march 0.7s linear infinite; opacity: 0.7; }
.cdt-pcl { position: absolute; top: 50%; left: 0; width: 7px; height: 7px; margin-top: -3.5px; border-radius: 50%;
  background: var(--cdt-c); box-shadow: 0 0 8px var(--cdt-c); animation: cdt-glide 1.65s linear infinite; }
@keyframes cdt-march { to { background-position: 16px 0; } }
@keyframes cdt-glide { 0% { left: -4px; opacity: 0; transform: scale(0.6); } 12% { opacity: 1; transform: scale(1); } 88% { opacity: 1; } 100% { left: 100%; opacity: 0; transform: scale(0.6); } }

.cdt-hub { position: relative; display: grid; place-items: center; width: 54px; height: 54px; }
.cdt-hub-ic { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 14px; z-index: 2;
  color: #fff; background: linear-gradient(135deg, color-mix(in srgb, var(--cdt-c) 88%, #000), var(--cdt-c)); box-shadow: 0 4px 16px color-mix(in srgb, var(--cdt-c) 40%, transparent); }
.cdt.cash .cdt-hub-ic, .cdt.payroll .cdt-hub-ic { color: #1a1206; }
.cdt-hub-ring { position: absolute; inset: 0; border-radius: 50%; border: 1.5px solid color-mix(in srgb, var(--cdt-c) 40%, transparent); animation: cdt-pulse 2.4s ease-out infinite; }
.cdt-hub-ring.r2 { animation-delay: 1.2s; }
@keyframes cdt-pulse { 0% { transform: scale(0.7); opacity: 0.8; } 100% { transform: scale(1.45); opacity: 0; } }

.cdt-caption { display: flex; align-items: flex-start; gap: 7px; margin: -4px 0 0; padding: 9px 12px; border-radius: 11px; font-size: 11.5px; line-height: 1.45; font-weight: 600;
  color: var(--ex-text-secondary); background: var(--ex-panel); border: 1px solid var(--ex-border); }
.cdt-caption.good { color: var(--ex-cleared); background: color-mix(in srgb, var(--ex-cleared) 9%, transparent); border-color: color-mix(in srgb, var(--ex-cleared) 24%, transparent); }
.cdt-caption.warn { color: var(--ex-pending); background: color-mix(in srgb, var(--ex-pending) 10%, transparent); border-color: color-mix(in srgb, var(--ex-pending) 30%, transparent); }
.cdt-caption.danger { color: var(--ex-blocked); background: color-mix(in srgb, var(--ex-blocked) 10%, transparent); border-color: color-mix(in srgb, var(--ex-blocked) 30%, transparent); }
.cdt-cap-ic { flex-shrink: 0; margin-top: 1px; }

/* method picker */
.dz-methods { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }
.dz-method { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 3px; padding: 12px 12px 11px; border-radius: 13px; cursor: pointer; text-align: left;
  background: var(--ex-surface); border: 1px solid var(--ex-border); transition: transform 0.18s, border-color 0.22s, background 0.22s; }
.dz-method:hover { transform: translateY(-2px); border-color: var(--ex-border-strong); }
.dz-method.on { border-color: color-mix(in srgb, var(--ex-cleared) 50%, transparent); background: color-mix(in srgb, var(--ex-cleared) 9%, transparent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--ex-cleared) 14%, transparent); }
.dz-method-ic { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; color: var(--ex-text-secondary); background: color-mix(in srgb, var(--ex-text) 7%, transparent); transition: color 0.22s, background 0.22s; }
.dz-method.on .dz-method-ic { color: var(--ex-cleared); background: color-mix(in srgb, var(--ex-cleared) 16%, transparent); }
.dz-method-t { font-size: 13px; font-weight: 800; color: var(--ex-text); margin-top: 3px; }
.dz-method-s { font-size: 10px; font-weight: 600; color: var(--ex-text-muted); }
.dz-method-chk { position: absolute; top: 9px; right: 9px; display: grid; place-items: center; width: 19px; height: 19px; border-radius: 50%; color: #04140d; background: var(--ex-cleared); }

/* explainer */
.dz-explain { display: flex; flex-direction: column; gap: 8px; padding: 13px 14px; border-radius: 13px; overflow: hidden;
  background: color-mix(in srgb, var(--ex-cleared) 6%, var(--ex-panel)); border: 1px solid var(--ex-border); }
.dz-explain.danger { background: color-mix(in srgb, var(--ex-blocked) 7%, var(--ex-panel)); border-color: color-mix(in srgb, var(--ex-blocked) 28%, transparent); }
.dz-explain-h { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 800; color: var(--ex-cleared); margin: 0; }
.dz-explain-h.danger { color: var(--ex-blocked); }
.dz-explain-b { font-size: 12px; line-height: 1.55; color: var(--ex-text-secondary); margin: 0; }
.dz-explain-b b { color: var(--ex-text); font-weight: 750; }
.dz-switch { align-self: flex-start; display: inline-flex; align-items: center; gap: 7px; margin-top: 3px; padding: 9px 14px; border-radius: 10px; font-size: 12.5px; font-weight: 760; cursor: pointer;
  color: #04140d; background: linear-gradient(135deg, #34d399, #059669); border: none; transition: transform 0.18s; box-shadow: 0 4px 14px color-mix(in srgb, var(--ex-cleared) 28%, transparent); }
.dz-switch:hover { transform: translateY(-1px); }

/* not-in-run risk banner (Authorize step) */
.dz-risk { display: flex; align-items: center; gap: 9px; padding: 11px 13px; border-radius: 12px; font-size: 12px; line-height: 1.5; font-weight: 650;
  color: var(--ex-blocked); background: color-mix(in srgb, var(--ex-blocked) 10%, transparent); border: 1px solid color-mix(in srgb, var(--ex-blocked) 30%, transparent); }
.dz-risk > svg { flex-shrink: 0; }
.dz-risk b { color: var(--ex-text); }
.dz-risk-sw { margin-left: 4px; padding: 3px 10px; border-radius: 7px; font-size: 11px; font-weight: 760; cursor: pointer; color: #04140d; background: var(--ex-cleared); border: none; }
.dz-risk-sw:hover { filter: brightness(1.06); }

.dz-combine { display: flex; flex-direction: column; gap: 1px; margin-top: 2px; padding: 11px 13px; border-radius: 11px; background: var(--ex-surface); border: 1px solid var(--ex-border); transition: opacity 0.2s; }
.dz-combine.loading { opacity: 0.55; }
.dz-cmb-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 4px 0; font-size: 12px; color: var(--ex-text-secondary); }
.dz-cmb-row span { display: inline-flex; align-items: center; gap: 5px; }
.dz-cmb-row b { color: var(--ex-text); font-weight: 750; }
.dz-cmb-row.earn { color: var(--ex-cleared); } .dz-cmb-row.earn b { color: var(--ex-cleared); }
.dz-cmb-row.rec { color: var(--ex-blocked); } .dz-cmb-row.rec b { color: var(--ex-blocked); }
.dz-cmb-row.total { margin-top: 3px; padding-top: 8px; border-top: 1px dashed var(--ex-border-strong); font-weight: 800; font-size: 13.5px; color: var(--ex-text); }
.dz-cmb-row.total b { color: var(--ex-cleared); font-size: 15px; font-weight: 850; }
.dz-pay-stat { font-style: normal; font-size: 8.5px; font-weight: 800; letter-spacing: 0.06em; padding: 1px 5px; border-radius: 5px; margin-left: 6px; }
.dz-pay-stat.released { color: var(--ex-cleared); background: color-mix(in srgb, var(--ex-cleared) 16%, transparent); }
.dz-pay-stat.draft { color: var(--ex-pending); background: color-mix(in srgb, var(--ex-pending) 16%, transparent); }
.dz-pay-stat.held { color: var(--ex-text-muted); background: color-mix(in srgb, var(--ex-text) 12%, transparent); }

.dz-warn { display: flex; align-items: flex-start; gap: 8px; overflow: hidden; padding: 10px 12px; border-radius: 11px; font-size: 11.5px; line-height: 1.5; font-weight: 600;
  color: var(--ex-pending); background: color-mix(in srgb, var(--ex-pending) 10%, transparent); border: 1px solid color-mix(in srgb, var(--ex-pending) 30%, transparent); }
.dz-warn svg { flex-shrink: 0; margin-top: 1px; }
.dz-warn b { color: var(--ex-text); }

/* schedule fields */
.dz-two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.dz-fld { display: flex; flex-direction: column; gap: 5px; }
.dz-fld label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--ex-text-muted); }
.dz-fld label i { color: var(--ex-cleared); font-style: normal; text-transform: none; }
.dz-input { width: 100%; padding: 10px 12px; border-radius: 10px; font-size: 13px; font-family: inherit; background: rgba(0,0,0,0.3); border: 1px solid var(--ex-border); color: var(--ex-text); }
.dz-input:focus { outline: none; border-color: color-mix(in srgb, var(--ex-cleared) 50%, transparent); }
[data-theme="light"] .dz-input { background: rgba(255,250,242,0.72); }
.dz-hint { display: flex; align-items: flex-start; gap: 7px; padding: 9px 11px; border-radius: 10px; font-size: 11px; line-height: 1.5; color: var(--ex-text-muted); background: var(--ex-panel); border: 1px solid var(--ex-border); }
.dz-hint svg { flex-shrink: 0; margin-top: 1px; color: var(--ex-cleared); }

/* authorize — instruction card */
.dz-instr { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 2px; padding: 14px 16px; border-radius: 14px; background: var(--ex-panel); border: 1px solid var(--ex-border-strong); }
.dz-instr-sheen { position: absolute; inset: 0 0 auto; height: 1px; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--ex-cleared) 60%, transparent), transparent); }
.dz-instr-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 4px 0; font-size: 12.5px; }
.dz-il { color: var(--ex-text-muted); display: inline-flex; align-items: center; gap: 5px; }
.dz-iv { color: var(--ex-text); font-weight: 700; display: inline-flex; align-items: center; gap: 5px; text-align: right; }
.dz-instr-sep { height: 1px; margin: 6px 0; background: var(--ex-border); }
.dz-instr-row.money.earn .dz-iv, .dz-instr-row.money.earn .dz-il { color: var(--ex-cleared); }
.dz-instr-row.money.rec .dz-iv, .dz-instr-row.money.rec .dz-il { color: var(--ex-blocked); }
.dz-instr-row.money.net { margin-top: 4px; padding-top: 8px; border-top: 1px solid var(--ex-border-strong); }
.dz-instr-row.money.net .dz-il { color: var(--ex-text-secondary); font-weight: 700; }
.dz-instr-row.money.net .dz-iv { font-size: 15px; font-weight: 850; }
.dz-instr-combine { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 9px; padding: 9px 11px; border-radius: 10px; font-size: 11.5px; font-weight: 700;
  color: var(--ex-cleared); background: color-mix(in srgb, var(--ex-cleared) 11%, transparent); border: 1px solid color-mix(in srgb, var(--ex-cleared) 26%, transparent); }
.dz-instr-combine span { display: inline-flex; align-items: center; gap: 6px; }
.dz-instr-combine b { font-size: 13.5px; font-weight: 850; }

/* maker-checker */
.dz-mc { display: flex; align-items: stretch; gap: 8px; }
.dz-mc-node { flex: 1; display: flex; align-items: center; gap: 9px; padding: 9px 12px; border-radius: 11px; background: var(--ex-panel); border: 1px solid var(--ex-border); }
.dz-mc-node.done { color: var(--ex-cleared); border-color: color-mix(in srgb, var(--ex-cleared) 28%, transparent); background: color-mix(in srgb, var(--ex-cleared) 8%, transparent); }
.dz-mc-node.live { color: var(--ex-amber); border-color: var(--ex-violet-border); background: var(--ex-violet-soft); }
.dz-mc-node > svg { flex-shrink: 0; }
.dz-mc-node div { display: flex; flex-direction: column; min-width: 0; }
.dz-mc-l { font-size: 11.5px; font-weight: 800; }
.dz-mc-d { font-size: 10px; color: var(--ex-text-muted); }
.dz-mc-arrow { display: grid; place-items: center; color: var(--ex-text-dim); flex-shrink: 0; }

/* authorization gate */
.dz-ack { display: flex; align-items: flex-start; gap: 10px; text-align: left; padding: 12px 14px; border-radius: 13px; cursor: pointer; font-size: 12px; line-height: 1.5; font-weight: 600;
  color: var(--ex-text-secondary); background: var(--ex-surface); border: 1px solid var(--ex-border); transition: border-color 0.25s, background 0.25s, color 0.25s; }
.dz-ack:hover { border-color: var(--ex-border-strong); }
.dz-ack.on { color: var(--ex-text); border-color: color-mix(in srgb, var(--ex-cleared) 42%, transparent); background: color-mix(in srgb, var(--ex-cleared) 9%, transparent); }
.dz-ack b { color: var(--ex-text); font-weight: 800; }
.dz-ack-ic { flex-shrink: 0; margin-top: 1px; color: var(--ex-text-dim); transition: color 0.25s; }
.dz-ack.on .dz-ack-ic { color: var(--ex-cleared); }

/* footer */
.dz-foot { display: flex; justify-content: space-between; gap: 8px; padding: 13px 20px 18px; flex-shrink: 0; border-top: 1px solid var(--ex-border); }
.dz-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: 12px; font-size: 13px; font-weight: 750; cursor: pointer; border: 1px solid transparent; transition: transform 0.18s, opacity 0.2s; }
.dz-btn:hover:not(:disabled) { transform: translateY(-1px); }
.dz-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.dz-btn.ghost { background: transparent; border-color: var(--ex-border-strong); color: var(--ex-text-secondary); }
.dz-btn.primary { background: var(--ex-grad-hero); color: #1a1206; margin-left: auto; }
.dz-btn.go { background: linear-gradient(135deg, #34d399, #059669); color: #04140d; margin-left: auto; box-shadow: 0 6px 18px color-mix(in srgb, var(--ex-cleared) 30%, transparent); }
.dz-spin { animation: dz-spin 0.8s linear infinite; }
@keyframes dz-spin { to { transform: rotate(360deg); } }

@media (max-width: 540px) {
  .cdt { grid-template-columns: 1fr; gap: 8px; }
  .cdt-pipe { height: 26px; }
  .cdt-pipe .cdt-flow { left: 50%; right: auto; top: 0; bottom: 0; width: 3px; height: auto; transform: none;
    background-image: repeating-linear-gradient(180deg, color-mix(in srgb, var(--cdt-c) 60%, transparent) 0 8px, transparent 8px 16px); }
  .cdt-pcl { display: none; }
  .dz-methods { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .cdt-flow, .cdt-pcl, .cdt-hub-ring { animation: none; }
  .cdt-pcl { display: none; }
  .dz-btn, .dz-method, .dz-step-dot { transition: none; }
  .dz-spin { animation: none; }
}
</style>
