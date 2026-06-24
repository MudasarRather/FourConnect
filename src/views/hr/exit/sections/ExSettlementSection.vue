<template>
  <div class="ex-sett">
    <ExSectionHead :icon="Scale" eyebrow="Exit Management · Treasury" title="Final Reckoning" accent="F&F"
      subtitle="Earnings weighed against recoveries — attendance-gated, verified, approved, posted to payroll. Closing the books.">
      <template #actions>
        <div class="case-pick"><ExSelect v-model="activeId" :options="caseOpts" searchable placeholder="Select a case…" @change="load" /></div>
      </template>
      <template v-if="cases.length" #lenses>
        <button class="lens" :class="{ on: lens === 'all' }" @click="lens = 'all'" type="button">
          <span class="lens-ic"><Users :size="13" /></span><span class="lens-v">{{ cases.length }}</span><span class="lens-l">All cases</span><span class="lens-bar" />
        </button>
        <button class="lens pay" :class="{ on: lens === 'payable' }" @click="lens = 'payable'" type="button">
          <span class="lens-ic"><TrendingUp :size="13" /></span><span class="lens-v">{{ buckets.payable.n }}</span><span class="lens-l">Payable</span><span class="lens-bar" />
        </button>
        <button class="lens rec" :class="{ on: lens === 'recoverable' }" @click="lens = 'recoverable'" type="button">
          <span class="lens-ic"><TrendingDown :size="13" /></span><span class="lens-v">{{ buckets.recoverable.n }}</span><span class="lens-l">Recoverable</span><span class="lens-bar" />
        </button>
        <button class="lens" :class="{ on: lens === 'balanced' }" @click="lens = 'balanced'" type="button">
          <span class="lens-ic"><Scale :size="13" /></span><span class="lens-v">{{ buckets.balanced.n }}</span><span class="lens-l">Balanced</span><span class="lens-bar" />
        </button>
        <div class="lens stat pay"><span class="lens-ic"><Wallet :size="13" /></span><span class="lens-v">{{ fmtCompactINR(buckets.payable.sum) }}</span><span class="lens-l">Σ payable</span><span class="lens-bar" /></div>
        <div class="lens stat rec"><span class="lens-ic"><Undo2 :size="13" /></span><span class="lens-v">{{ fmtCompactINR(buckets.recoverable.sum) }}</span><span class="lens-l">Σ recoverable</span><span class="lens-bar" /></div>
      </template>
    </ExSectionHead>

    <div v-if="loadingCases" class="grid-load"><Loader2 :size="22" class="spin" /> Loading settlements…</div>
    <ExEmptyState v-else-if="!cases.length" :icon="Scale" title="No settlements yet"
      subtitle="A draft F&F is created when a separation is accepted; complete clearance to verify it." />

    <template v-else>
      <!-- roster strip -->
      <div class="roster">
        <button v-for="c in rosterPaged" :key="c.id" class="rchip" :class="{ on: c.id === activeId, [dirOf(c)]: true }"
          @click="select(c.id)" type="button">
          <span class="rchip-av">{{ initials(c.employee_name || c.employee_code) }}</span>
          <span class="rchip-mid">
            <span class="rchip-name">{{ c.employee_name || c.employee_code }}</span>
            <span class="rchip-case ex-mono">{{ c.case_number }}</span>
          </span>
          <span class="rchip-net ex-mono" :class="dirOf(c)">{{ fmtCompactINR(Math.abs(caseNet(c))) }}</span>
        </button>
        <div v-if="!rosterCases.length" class="rchip-empty">No {{ lens }} settlements.</div>
      </div>
      <ExPager :page="rosterPage" :total-pages="rosterPages" :total="rosterTotal" :limit="10" @update:page="rosterPage = $event" />

      <div v-if="loadingS" class="grid-load"><Loader2 :size="20" class="spin" /> Loading…</div>

      <Motion v-else-if="s" as="div" class="stage" :key="activeId"
        :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, ease: [0.16,1,0.3,1] }">
        <!-- context header -->
        <div class="ctx ex-card">
          <div class="ctx-id">
            <span class="ctx-av">{{ initials(activeCase?.employee_name || activeCase?.employee_code) }}</span>
            <div>
              <h3 class="ctx-name">{{ activeCase?.employee_name || activeCase?.employee_code || 'Employee' }}</h3>
              <p class="ctx-meta"><span class="ex-mono">{{ s.settlement_number }}</span><span v-if="activeCase?.case_number"> · {{ activeCase.case_number }}</span><span v-if="s.payroll_ref"> · → {{ s.payroll_ref }}</span></p>
            </div>
          </div>
          <div class="ctx-right">
            <ExStatusPill :status="s.status" kind="settlement" />
            <div class="ctx-links">
              <button class="xlink" @click="$emit('go', { tab: 'clearance' })" type="button"><ClipboardCheck :size="12" /> Clearance</button>
              <button class="xlink" @click="$emit('go', { tab: 'asset-return' })" type="button"><PackageCheck :size="12" /> Asset return</button>
            </div>
          </div>
        </div>

        <!-- pipeline + actions -->
        <div class="flow ex-card ex-grain">
          <SettlementPipeline :status="s.status" />

          <!-- pre-verification gate: clearance 100% · assets returned · interview done -->
          <div v-if="isGateStatus" class="pfg" :class="{ ready: preflightReady }">
            <div class="pfg-head">
              <component :is="preflightReady ? ShieldCheck : ShieldAlert" :size="15" class="pfg-hic" />
              <span class="pfg-title">{{ preflightReady ? 'Cleared to verify' : 'Pre-verification gate' }}</span>
              <span class="pfg-sub">{{ loadingPreflight ? 'Checking obligations…' : preflightReady
                ? 'All prerequisites concluded' : `${blockersCount} obligation${blockersCount === 1 ? '' : 's'} pending before this F&F can be verified` }}</span>
              <Loader2 v-if="loadingPreflight" :size="14" class="spin pfg-spin" />
            </div>
            <div class="pfg-checks">
              <button v-for="c in preflightChecks" :key="c.key" class="pfg-chk" :class="{ ok: c.ok }"
                @click="$emit('go', { tab: c.tab })" type="button" :title="`Open ${c.tab.replace('-', ' ')}`">
                <span class="pfg-cic"><component :is="PRE_ICONS[c.key] || ClipboardCheck" :size="14" /></span>
                <span class="pfg-cmid">
                  <span class="pfg-cl">{{ c.label }}</span>
                  <span class="pfg-cd">{{ c.detail }}</span>
                </span>
                <component :is="c.ok ? CheckCircle2 : AlertCircle" :size="16" class="pfg-stat" />
                <ArrowUpRight :size="12" class="pfg-go" />
              </button>
            </div>
          </div>

          <!-- notice-period gate: F&F disburses only once notice is served -->
          <div v-if="s.status === 'APPROVED' && !noticeGate.served" class="ngate">
            <CalendarClock :size="15" class="ngate-ic" />
            <div class="ngate-txt">
              <span class="ngate-title">Notice still being served</span>
              <span class="ngate-sub">{{ noticeGate.reason }}</span>
            </div>
            <button class="ngate-go" type="button" @click="$emit('go', { tab: 'notice' })"><ArrowUpRight :size="13" /> Notice</button>
          </div>

          <div class="flow-actions">
            <button class="sa-btn ghost" :disabled="busy || !canRecalc" @click="doAction('recalc')" type="button"><RotateCcw :size="14" /> Recompute</button>
            <button class="sa-btn ghost" :disabled="busy || !canRecalc" @click="openAdjust" type="button"><SlidersHorizontal :size="14" /> Adjust lines</button>
            <button v-if="['DRAFT','REVERSED'].includes(s.status)" class="sa-btn" :disabled="busy || !preflightReady" @click="openVerify" type="button"
              :title="preflightReady ? 'Verify settlement' : 'Complete clearance, asset return & exit interview first'"><BadgeCheck :size="14" /> Verify</button>
            <button v-if="s.status === 'VERIFIED'" class="sa-btn" :disabled="busy" @click="approveOpen = true" type="button"><ShieldCheck :size="14" /> Approve</button>
            <button v-if="s.status === 'APPROVED'" class="sa-btn primary" :disabled="busy || !noticeGate.served" @click="payOpen = true" type="button"
              :title="noticeGate.served ? 'Disburse the Full & Final' : noticeGate.reason"><Banknote :size="14" /> Disburse F&amp;F</button>
            <button v-if="['APPROVED','PAID','CLOSED'].includes(s.status)" class="sa-btn ghost" :disabled="busy" @click="openAdvice('pdf')" type="button" title="Full & Final payment advice (beneficiary bank account + breakdown) for finance to execute"><FileText :size="14" /> Payment advice</button>
            <button v-if="s.status === 'PAID'" class="sa-btn" :disabled="busy" @click="closeOpen = true" type="button"><Lock :size="14" /> Close</button>
            <button v-if="s.status === 'PAID'" class="sa-btn danger-ghost" :disabled="busy" @click="reverseOpen = true" type="button"><Undo2 :size="14" /> Reverse</button>
          </div>
        </div>

        <!-- instrument + ledger -->
        <div class="sett-grid">
          <ReckoningReactor :earnings="num(s.total_earnings)" :recoveries="num(s.total_recoveries)" :settlement-number="s.settlement_number" />
          <SettlementLedger :s="s" />
        </div>
      </Motion>
    </template>

    <!-- ── Adjust lines (override + recompute) ── -->
    <ExModalShell :open="adjOpen" :icon="SlidersHorizontal" tone="amber" wide
      title="Adjust &amp; recompute" :sub="`${s?.settlement_number} · pin a line or let it auto-derive`" @close="adjOpen = false">
      <div class="adjp" :class="previewNet.direction">
        <span class="adjp-glow" aria-hidden="true" />
        <div class="adjp-core">
          <span class="adjp-eyebrow">{{ previewLabel }}</span>
          <ReckonOdometer class="adjp-od" :value="Math.abs(previewNet.net)" :color="previewColor" />
        </div>
        <div class="adjp-meter"><span class="adjp-fill earn" :style="{ width: earnShare + '%' }" /><span class="adjp-fill rec" :style="{ width: recShare + '%' }" /></div>
        <div class="adjp-legend">
          <span class="le earn"><span class="le-dot" /> Earnings <b class="ex-mono">{{ fmtINR(previewEarn) }}</b></span>
          <span class="le rec"><b class="ex-mono">{{ fmtINR(previewRec) }}</b> Recoveries <span class="le-dot" /></span>
        </div>
      </div>
      <p class="exm-note"><b>Auto</b> lines re-derive from attendance, leave, payroll, clearance &amp; travel. Type to <b>pin</b> a line; the revert arrow restores the computed figure. Pinned changes need a reason and are written to the audit log.</p>
      <div class="adj-grid">
        <div class="adj-col">
          <h5 class="adj-h earn"><TrendingUp :size="12" /> Earnings</h5>
          <Motion v-for="(k, i) in EARN_KEYS" :key="k" as="div" class="adjf" :class="{ pin: pinned(k) }"
            :initial="reduced ? false : { opacity: 0, x: -8 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.32, delay: 0.03 * i, ease: [0.16,1,0.3,1] }">
            <div class="adjf-top">
              <span class="adjf-name">{{ LABELS[k] }}</span>
              <span class="adjf-tag" :class="isAuto(k) ? 'auto' : 'man'">{{ isAuto(k) ? 'AUTO' : 'MANUAL' }}</span>
              <Presence><Motion v-if="pinned(k)" as="span" class="adjf-pin" :initial="{ opacity: 0, scale: 0.6 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0.6 }"><Pin :size="9" /> pinned</Motion></Presence>
            </div>
            <div class="adjf-ctl">
              <span class="adjf-cur">₹</span>
              <input v-model.number="adj[k]" type="number" min="0" step="1" />
              <button v-if="pinned(k)" class="adjf-rv" @click="revert(k)" type="button" :title="isAuto(k) ? `Revert to auto (${fmtINR(autoVal(k))})` : 'Clear'"><RotateCcw :size="12" /></button>
            </div>
          </Motion>
        </div>
        <div class="adj-col">
          <h5 class="adj-h rec"><TrendingDown :size="12" /> Recoveries</h5>
          <Motion v-for="(k, i) in REC_KEYS" :key="k" as="div" class="adjf" :class="{ pin: pinned(k) }"
            :initial="reduced ? false : { opacity: 0, x: 8 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.32, delay: 0.03 * i, ease: [0.16,1,0.3,1] }">
            <div class="adjf-top">
              <span class="adjf-name">{{ LABELS[k] }}</span>
              <span class="adjf-tag" :class="isAuto(k) ? 'auto' : 'man'">{{ isAuto(k) ? 'AUTO' : 'MANUAL' }}</span>
              <Presence><Motion v-if="pinned(k)" as="span" class="adjf-pin" :initial="{ opacity: 0, scale: 0.6 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0.6 }"><Pin :size="9" /> pinned</Motion></Presence>
            </div>
            <div class="adjf-ctl">
              <span class="adjf-cur">₹</span>
              <input v-model.number="adj[k]" type="number" min="0" step="1" />
              <button v-if="pinned(k)" class="adjf-rv" @click="revert(k)" type="button" :title="isAuto(k) ? `Revert to auto (${fmtINR(autoVal(k))})` : 'Clear'"><RotateCcw :size="12" /></button>
            </div>
          </Motion>
        </div>
      </div>

      <Presence>
        <Motion v-if="dirtyCount" as="div" class="adj-reason" :initial="reduced ? false : { opacity: 0, y: -6 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: -6 }">
          <label>Reason for adjustment <i>*</i><span class="adj-reason-meta">{{ dirtyCount }} line{{ dirtyCount > 1 ? 's' : '' }} changed · recorded to audit log</span></label>
          <textarea v-model="adjReason" rows="2" placeholder="e.g. Gratuity pinned per CFO approval; claim CL-26-0123 verified manually." />
        </Motion>
      </Presence>

      <template #foot>
        <button class="exm-btn ghost" :disabled="busy" @click="resetAuto" type="button"><RotateCcw :size="14" /> Reset to auto</button>
        <button class="exm-btn primary" :disabled="applyDisabled" @click="doAdjust" type="button"><Loader2 v-if="busy" :size="15" class="spin" /><Check v-else :size="15" /> {{ dirtyCount ? `Apply ${dirtyCount} change${dirtyCount > 1 ? 's' : ''}` : 'Recompute' }}</button>
      </template>
    </ExModalShell>

    <!-- ── Verify ── -->
    <ExModalShell :open="verifyOpen" :icon="BadgeCheck" tone="amber"
      title="Verify settlement" :sub="`${s?.settlement_number} · finance review`" @close="verifyOpen = false">
      <div class="pf">
        <div class="pf-row"><span>Earnings</span><b class="ex-mono earn">{{ fmtINR(num(s?.total_earnings)) }}</b></div>
        <div class="pf-row"><span>Recoveries</span><b class="ex-mono rec">{{ fmtINR(num(s?.total_recoveries)) }}</b></div>
        <div class="pf-row net"><span>{{ netDir }}</span><b class="ex-mono">{{ fmtINR(Math.abs(num(s?.net_amount))) }}</b></div>
      </div>
      <div class="vbasis"><CalendarCheck :size="13" /><span>Salary basis · <b>{{ pendingBasis }}</b></span></div>

      <!-- system prerequisites (hard gate) -->
      <div class="vgate" :class="{ ready: preflightReady }">
        <span class="vgate-h"><component :is="preflightReady ? ShieldCheck : ShieldAlert" :size="12" /> Pre-verification requirements</span>
        <div v-for="c in preflightChecks" :key="c.key" class="vgate-row" :class="{ ok: c.ok }">
          <component :is="c.ok ? CheckCircle2 : AlertCircle" :size="15" class="vgate-ic" />
          <span class="vgate-l">{{ c.label }}</span>
          <span class="vgate-d">{{ c.detail }}</span>
          <button class="vgate-go" type="button" @click="$emit('go', { tab: c.tab }); verifyOpen = false"><ArrowUpRight :size="12" /></button>
        </div>
        <p v-if="!preflightReady" class="vgate-note">Resolve the items above (clearance, asset return, exit interview) before this F&amp;F can be verified.</p>
      </div>

      <div class="vchk">
        <span class="vchk-h"><ClipboardCheck :size="12" /> Verification checklist</span>
        <Motion v-for="(c, i) in VCHECKLIST" :key="c.k" as="button" type="button" class="vchk-row" :class="{ on: vChecks[c.k] }"
          @click="vChecks[c.k] = !vChecks[c.k]"
          :initial="reduced ? false : { opacity: 0, x: -8 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.3, delay: 0.05 + 0.06 * i, ease: [0.16,1,0.3,1] }">
          <component :is="vChecks[c.k] ? CheckCircle2 : Circle" :size="17" class="vchk-ic" />
          <span>{{ c.label }}</span>
        </Motion>
      </div>

      <div class="fld"><label>Verification notes <i>(optional)</i></label><textarea v-model="verifyNotes" rows="2" placeholder="Reviewed against attendance &amp; payroll…" /></div>
      <template #foot>
        <button class="exm-btn ghost" @click="verifyOpen = false" type="button">Cancel</button>
        <button class="exm-btn primary" :disabled="busy || !allChecked || !preflightReady" @click="doVerify" type="button"><Loader2 v-if="busy" :size="15" class="spin" /><BadgeCheck v-else :size="15" /> {{ !preflightReady ? 'Prerequisites pending' : allChecked ? 'Verify' : `Confirm all (${VCHECKLIST.filter(c => vChecks[c.k]).length}/${VCHECKLIST.length})` }}</button>
      </template>
    </ExModalShell>

    <!-- ── Approve — corporate authorization gate ── -->
    <ExApproveModal :open="approveOpen" :settlement="s" :busy="busy" @close="approveOpen = false" @approve="doApprove" />

    <!-- ── Disburse (pay) — corporate-grade Disbursement Authorization ── -->
    <ExDisburseModal :open="payOpen" :settlement="s" :busy="busy"
      :employee-id="activeCase?.employee_id ? String(activeCase.employee_id) : null"
      :employee-name="activeCase?.employee_name || activeCase?.employee_code || ''"
      :last-working-date="activeCase?.last_working_date || null"
      :lifecycle-state="activeCase?.lifecycle_state || ''"
      :notice-served="noticeGate.served" :notice-block="noticeGate.reason || ''"
      @close="payOpen = false" @disburse="doPay" />

    <!-- ── Close — "Sealing the Ledger" ceremony ── -->
    <ExCloseModal :open="closeOpen" :settlement="s" :busy="busy"
      :employee-name="activeCase?.employee_name || activeCase?.employee_code || ''"
      @close="closeOpen = false" @confirm="doClose" />

    <!-- ── Reverse ── -->
    <ExModalShell :open="reverseOpen" :icon="Undo2" tone="danger"
      title="Reverse settlement" :sub="`${s?.settlement_number} · clawback`" @close="reverseOpen = false">
      <p class="exm-note danger">Reversal posts a compensating payroll entry if the F&amp;F was already released, and reopens the settlement for re-verification.</p>
      <div class="fld"><label>Reason <i>*</i></label><textarea v-model="reverseReason" rows="3" placeholder="Why is this being reversed?" /></div>
      <template #foot>
        <button class="exm-btn ghost" @click="reverseOpen = false" type="button">Cancel</button>
        <button class="exm-btn danger" :disabled="busy || !reverseReason.trim()" @click="doReverse" type="button"><Loader2 v-if="busy" :size="15" class="spin" /><Undo2 v-else :size="15" /> Reverse</button>
      </template>
    </ExModalShell>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  Scale, Loader2, RotateCcw, SlidersHorizontal, Check, BadgeCheck, ShieldCheck, Banknote,
  Lock, Undo2, TrendingUp, TrendingDown, Users, Wallet, Landmark, ArrowRight, ArrowUpRight,
  ArrowDownRight, ClipboardCheck, PackageCheck, Pin, CheckCircle2, Circle, CalendarCheck, CalendarClock, Sparkles,
  ShieldAlert, AlertCircle, MessagesSquare, FileText,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import ExSectionHead from '../components/ExSectionHead.vue'
import ExSelect from '../components/ExSelect.vue'
import ExEmptyState from '../components/ExEmptyState.vue'
import ExStatusPill from '../components/ExStatusPill.vue'
import ExModalShell from '../components/ExModalShell.vue'
import ReckoningReactor from '../components/ReckoningReactor.vue'
import ReckonOdometer from '../components/ReckonOdometer.vue'
import SettlementPipeline from '../components/SettlementPipeline.vue'
import SettlementLedger from '../components/SettlementLedger.vue'
import ExPager from '../components/ExPager.vue'
import ExDisburseModal from '../modals/ExDisburseModal.vue'
import ExApproveModal from '../modals/ExApproveModal.vue'
import ExCloseModal from '../modals/ExCloseModal.vue'
import {
  fetchCases, getSettlement, recalcSettlement, verifySettlement, approveSettlement,
  paySettlement, closeSettlement, reverseSettlement, fetchSettlementPreflight, fmtINR, fmtCompactINR, errText,
  fnfReconcile, initials, useClientPage, openPaymentAdvice, noticeServed,
} from '@/composables/useExit'
import { prefersReduced } from '@/composables/useShiftMotion'

const emit = defineEmits(['go', 'refresh-stats'])
const toast = useToast()
const reduced = prefersReduced()

const cases = ref([]); const loadingCases = ref(false); const activeId = ref(null)
const s = ref(null); const busy = ref(false); const loadingS = ref(false); const lens = ref('all')
const preflight = ref(null); const loadingPreflight = ref(false)

const payOpen = ref(false); const reverseOpen = ref(false); const verifyOpen = ref(false)
const approveOpen = ref(false); const closeOpen = ref(false); const adjOpen = ref(false)
const reverseReason = ref(''); const verifyNotes = ref('')
const EARN_KEYS = ['pending_salary', 'leave_encashment_amount', 'incentives_amount', 'bonus_amount', 'reimbursements_amount', 'gratuity_amount', 'other_earnings']
const REC_KEYS = ['notice_recovery', 'loan_recovery', 'advance_recovery', 'asset_recovery', 'other_deductions']
const LABELS = {
  pending_salary: 'Pending salary', leave_encashment_amount: 'Leave encashment', incentives_amount: 'Incentives',
  bonus_amount: 'Bonus', reimbursements_amount: 'Reimbursements', gratuity_amount: 'Gratuity', other_earnings: 'Other earnings',
  notice_recovery: 'Notice recovery', loan_recovery: 'Loan recovery', advance_recovery: 'Advance recovery',
  asset_recovery: 'Asset recovery', other_deductions: 'Other deductions',
}
const adj = reactive({})
let adjBase = {}

const num = (v) => Number(v || 0)
const caseNet = (c) => Number(c?.settlement_net_amount ?? c?.settlement?.net_amount ?? 0)
const dirOf = (c) => { const n = caseNet(c); return n > 0 ? 'payable' : n < 0 ? 'recoverable' : 'balanced' }
const canRecalc = computed(() => s.value && ['DRAFT', 'VERIFIED', 'REVERSED'].includes(s.value.status))
const netDir = computed(() => { const n = num(s.value?.net_amount); return n > 0 ? 'Net payable' : n < 0 ? 'Net recoverable' : 'Balanced' })
const caseOpts = computed(() => cases.value.map(c => ({ value: c.id, label: `${c.employee_name || c.employee_code} · ${c.case_number}` })))
const activeCase = computed(() => cases.value.find(c => c.id === activeId.value) || null)
const noticeGate = computed(() => noticeServed(activeCase.value))

const buckets = computed(() => {
  const b = { payable: { n: 0, sum: 0 }, recoverable: { n: 0, sum: 0 }, balanced: { n: 0 } }
  for (const c of cases.value) {
    const n = caseNet(c)
    if (n > 0) { b.payable.n++; b.payable.sum += n }
    else if (n < 0) { b.recoverable.n++; b.recoverable.sum += -n }
    else b.balanced.n++
  }
  return b
})
const rosterCases = computed(() => {
  if (lens.value === 'all') return cases.value
  return cases.value.filter(c => dirOf(c) === lens.value)
})
const { page: rosterPage, total: rosterTotal, totalPages: rosterPages, paged: rosterPaged } = useClientPage(rosterCases, 10)
watch(lens, () => { rosterPage.value = 1 })

const previewEarn = computed(() => EARN_KEYS.reduce((a, k) => a + num(adj[k]), 0))
const previewRec = computed(() => REC_KEYS.reduce((a, k) => a + num(adj[k]), 0))
const previewNet = computed(() => fnfReconcile({ earnings: previewEarn.value, recoveries: previewRec.value }))
const previewColor = computed(() => (previewNet.value.direction === 'payable' ? 'var(--ex-cleared)' : previewNet.value.direction === 'recoverable' ? 'var(--ex-blocked)' : '#9ca3af'))
const previewLabel = computed(() => (previewNet.value.direction === 'recoverable' ? 'NET RECOVERABLE' : previewNet.value.direction === 'payable' ? 'NET PAYABLE' : 'BALANCED'))
const earnShare = computed(() => { const t = previewEarn.value + previewRec.value; return t > 0 ? Math.round((previewEarn.value / t) * 100) : 50 })
const recShare = computed(() => 100 - earnShare.value)

// ── auto-vs-pinned adjustment model ──
const snap = computed(() => s.value?.computation_snapshot || {})
const AUTO_KEYS = ['pending_salary', 'leave_encashment_amount', 'gratuity_amount', 'reimbursements_amount', 'notice_recovery', 'asset_recovery', 'advance_recovery']
const MANUAL_KEYS = ['incentives_amount', 'bonus_amount', 'other_earnings', 'loan_recovery', 'other_deductions']
const AUTO_FROM = {
  pending_salary: () => num(snap.value.pending_salary?.amount),
  leave_encashment_amount: () => num(snap.value.leave_encashment?.amount),
  gratuity_amount: () => num(snap.value.gratuity?.amount),
  reimbursements_amount: () => num(snap.value.reimbursements),
  notice_recovery: () => num(snap.value.notice_recovery?.amount),
  asset_recovery: () => num(snap.value.asset_recovery),
  advance_recovery: () => num(snap.value.advance_recovery?.amount),
}
const isAuto = (k) => AUTO_KEYS.includes(k)
const autoVal = (k) => (AUTO_FROM[k] ? AUTO_FROM[k]() : 0)
const pinned = (k) => (isAuto(k) ? num(adj[k]) !== autoVal(k) : num(adj[k]) !== 0)
const revert = (k) => { adj[k] = isAuto(k) ? autoVal(k) : 0 }
const overridesToSend = computed(() => {
  const o = {}
  for (const k of AUTO_KEYS) if (num(adj[k]) !== autoVal(k)) o[k] = num(adj[k])
  for (const k of MANUAL_KEYS) if (num(adj[k]) !== num(adjBase[k])) o[k] = num(adj[k])
  return o
})
const dirtyCount = computed(() => Object.keys(overridesToSend.value).length)
const adjReason = ref('')
const applyDisabled = computed(() => busy.value || (dirtyCount.value > 0 && !adjReason.value.trim()))

// ── verification checklist (corporate gate) ──
const VCHECKLIST = [
  { k: 'recon', label: 'Earnings & recoveries reconciled against attendance and payroll' },
  { k: 'clearance', label: 'Clearance and asset return reviewed for recoveries' },
  { k: 'net', label: 'Net settlement figure confirmed correct' },
]
const vChecks = reactive({ recon: false, clearance: false, net: false })
const allChecked = computed(() => VCHECKLIST.every(c => vChecks[c.k]))
const pendingBasis = computed(() => {
  const ps = snap.value.pending_salary || {}
  if (ps.basis === 'attendance_paid_days') return `${num(ps.paid_days)}/${num(ps.month_days)} paid days · attendance-gated`
  if (ps.basis === 'already_paid_via_payslip') return 'already paid via payslip'
  if (ps.basis === 'none') return 'last-working-date not set'
  return ps.basis || 'pending salary'
})
const openVerify = () => { vChecks.recon = false; vChecks.clearance = false; vChecks.net = false; verifyNotes.value = ''; loadPreflight(); verifyOpen.value = true }

// ── pre-verification gate (clearance 100% · assets returned · interview done) ──
const PRE_ICONS = { clearance: ClipboardCheck, assets: PackageCheck, interview: MessagesSquare }
const _FALLBACK_CHECKS = [
  { key: 'clearance', label: 'Clearance 100% complete', tab: 'clearance' },
  { key: 'assets', label: 'Company assets returned', tab: 'asset-return' },
  { key: 'interview', label: 'Exit interview concluded', tab: 'interviews' },
]
const preflightChecks = computed(() => preflight.value?.checks || _FALLBACK_CHECKS.map(c => ({ ...c, ok: false, detail: 'Checking…' })))
const preflightReady = computed(() => !!preflight.value?.ready)
const blockersCount = computed(() => preflight.value?.blockers?.length ?? preflightChecks.value.filter(c => !c.ok).length)
const isGateStatus = computed(() => !!s.value && ['DRAFT', 'REVERSED'].includes(s.value.status))
const loadPreflight = async () => {
  if (!activeId.value) { preflight.value = null; return }
  loadingPreflight.value = true
  try { preflight.value = await fetchSettlementPreflight(activeId.value) }
  catch { preflight.value = null }
  finally { loadingPreflight.value = false }
}

const loadCases = async () => {
  loadingCases.value = true
  try {
    const all = []; const seen = new Set()
    for (const st of ['SETTLEMENT', 'CLEARANCE', 'NOTICE_PERIOD', 'COMPLETED', 'ACCEPTED']) {
      const d = await fetchCases({ status: st, limit: 100 })
      for (const c of (d.items || [])) { if (!seen.has(c.id)) { seen.add(c.id); all.push(c) } }
    }
    cases.value = all
    if (all.length && !activeId.value) { activeId.value = all[0].id; await load() }
  } catch (e) { toast.error(errText(e, 'Failed to load cases')) }
  finally { loadingCases.value = false }
}
const load = async () => {
  if (!activeId.value) return
  loadingS.value = true
  preflight.value = null
  try {
    s.value = await getSettlement(activeId.value)
    if (s.value && ['DRAFT', 'REVERSED'].includes(s.value.status)) await loadPreflight()
  }
  catch (e) { s.value = null; if (e?.response?.status !== 404) toast.error(errText(e, 'Failed to load settlement')) }
  finally { loadingS.value = false }
}
const select = (id) => { if (id === activeId.value) return; activeId.value = id; load() }

const refreshCaseNet = () => {
  if (s.value && activeCase.value) activeCase.value.settlement_net_amount = num(s.value.net_amount)
}
const doAction = async (kind) => {
  busy.value = true
  try {
    if (kind === 'recalc') await recalcSettlement(activeId.value)
    toast.success('Recomputed from source'); await load(); refreshCaseNet(); emit('refresh-stats')
  } catch (e) { toast.error(errText(e, 'Action failed')) }
  finally { busy.value = false }
}
const openAdjust = () => {
  if (!s.value) return
  for (const k of [...EARN_KEYS, ...REC_KEYS]) adj[k] = num(s.value[k])
  adjBase = { ...adj }
  adjReason.value = ''
  adjOpen.value = true
}
const doAdjust = async () => {
  busy.value = true
  try {
    const o = overridesToSend.value
    const n = Object.keys(o).length
    await recalcSettlement(activeId.value, n ? o : undefined, adjReason.value.trim() || undefined)
    toast.success(n ? `Pinned ${n} line${n > 1 ? 's' : ''} & recomputed` : 'Recomputed from source')
    adjOpen.value = false; await load(); refreshCaseNet(); emit('refresh-stats')
  } catch (e) { toast.error(errText(e, 'Adjust failed')) }
  finally { busy.value = false }
}
const resetAuto = async () => {
  busy.value = true
  try { await recalcSettlement(activeId.value); toast.success('Reset to auto'); adjOpen.value = false; await load(); refreshCaseNet(); emit('refresh-stats') }
  catch (e) { toast.error(errText(e, 'Reset failed')) }
  finally { busy.value = false }
}
const doVerify = async () => {
  busy.value = true
  try { await verifySettlement(activeId.value, verifyNotes.value || undefined); toast.success('Verified'); verifyOpen.value = false; verifyNotes.value = ''; await load(); emit('refresh-stats') }
  catch (e) { toast.error(errText(e, 'Verify failed')) }
  finally { busy.value = false }
}
const doApprove = async (payload) => {
  busy.value = true
  try { await approveSettlement(activeId.value, payload?.notes || undefined); toast.success('Settlement approved'); approveOpen.value = false; await load(); emit('refresh-stats') }
  catch (e) { toast.error(errText(e, 'Approve failed')) }
  finally { busy.value = false }
}
const doPay = async (payload) => {
  busy.value = true
  try {
    await paySettlement(activeId.value, payload)
    payOpen.value = false; await load(); refreshCaseNet(); emit('refresh-stats')
    if (payload.settlement_method && payload.settlement_method !== 'PAYROLL')
      toast.success('Disbursed — open "Payment advice" to execute the bank transfer')
    else toast.success('Settlement disbursed')
  } catch (e) { toast.error(errText(e, 'Pay failed')) }
  finally { busy.value = false }
}
const openAdvice = async (fmt = 'pdf') => {
  try { await openPaymentAdvice(activeId.value, s.value?.settlement_number, fmt) }
  catch (e) { toast.error(errText(e, 'Could not open payment advice')) }
}
const doClose = async (payload) => {
  busy.value = true
  try {
    await closeSettlement(activeId.value, payload?.notes || undefined, payload?.category || undefined)
    toast.success('Settlement closed & sealed'); closeOpen.value = false; await load(); emit('refresh-stats')
  }
  catch (e) { toast.error(errText(e, 'Close failed')) }
  finally { busy.value = false }
}
const doReverse = async () => {
  busy.value = true
  try { await reverseSettlement(activeId.value, reverseReason.value); toast.success('Reversed'); reverseOpen.value = false; reverseReason.value = ''; await load(); refreshCaseNet(); emit('refresh-stats') }
  catch (e) { toast.error(errText(e, 'Reverse failed')) }
  finally { busy.value = false }
}
onMounted(loadCases)
</script>

<style scoped>
.ex-sett { color: var(--ex-text); }
.case-pick { width: 300px; max-width: 56vw; }
.grid-load { display: flex; align-items: center; gap: 8px; justify-content: center; padding: 44px; color: var(--ex-text-muted); }
.spin { animation: ex-spin-slow 0.8s linear infinite; }

/* lenses */
.lens { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 1px; min-width: 96px; padding: 9px 13px 11px; border-radius: 13px;
  cursor: pointer; text-align: left; background: var(--ex-panel); border: 1px solid var(--ex-border); color: var(--ex-text-secondary); transition: border-color 0.2s, transform 0.2s, background 0.2s; }
.lens.stat { cursor: default; }
.lens:not(.stat):hover { transform: translateY(-2px); border-color: var(--ex-border-strong); }
.lens.on { border-color: var(--ex-violet-border); background: var(--ex-violet-soft); }
.lens-ic { color: var(--ex-text-muted); }
.lens.pay .lens-ic { color: var(--ex-cleared); } .lens.rec .lens-ic { color: var(--ex-blocked); }
.lens-v { font-size: 19px; font-weight: 850; color: var(--ex-text); line-height: 1; margin-top: 3px; }
.lens-l { font-size: 10.5px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ex-text-muted); }
.lens-bar { position: absolute; left: 0; bottom: 0; height: 2px; width: 100%; background: var(--ex-grad-hero); transform: scaleX(0); transform-origin: left; transition: transform 0.3s var(--ex-spring); }
.lens.on .lens-bar, .lens.stat.pay .lens-bar, .lens.stat.rec .lens-bar { transform: scaleX(1); }
.lens.stat.rec .lens-bar { background: linear-gradient(90deg, #f87171, #b91c1c); }

/* roster */
.roster { display: flex; gap: 9px; overflow-x: auto; padding: 4px 2px 10px; margin-bottom: 4px; }
.rchip { display: flex; align-items: center; gap: 9px; flex-shrink: 0; padding: 8px 12px 8px 8px; border-radius: 13px; cursor: pointer;
  background: var(--ex-surface); border: 1px solid var(--ex-border); color: var(--ex-text); transition: transform 0.2s, border-color 0.2s, box-shadow 0.3s; }
.rchip:hover { transform: translateY(-2px); border-color: var(--ex-border-strong); }
.rchip.on { border-color: var(--ex-violet-border); box-shadow: 0 0 0 2px color-mix(in srgb, var(--ex-amber) 14%, transparent), var(--ex-card-shadow); background: var(--ex-surface-elevated); }
.rchip-av { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; font-size: 11.5px; font-weight: 800; flex-shrink: 0;
  color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.rchip-mid { display: flex; flex-direction: column; gap: 1px; }
.rchip-name { font-size: 12.5px; font-weight: 700; white-space: nowrap; }
.rchip-case { font-size: 10px; color: var(--ex-text-dim); }
.rchip-net { font-size: 12.5px; font-weight: 800; padding-left: 6px; }
.rchip-net.payable { color: var(--ex-cleared); } .rchip-net.recoverable { color: var(--ex-blocked); } .rchip-net.balanced { color: var(--ex-text-muted); }
.rchip-empty { display: grid; place-items: center; padding: 14px 18px; font-size: 12px; color: var(--ex-text-dim); }

/* stage */
.stage { display: flex; flex-direction: column; gap: 14px; }
.ctx { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 14px 16px; }
.ctx-id { display: flex; align-items: center; gap: 12px; }
.ctx-av { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 12px; font-size: 14px; font-weight: 800;
  color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.ctx-name { font-size: 16px; font-weight: 800; margin: 0; color: var(--ex-text); }
.ctx-meta { font-size: 11.5px; color: var(--ex-text-muted); margin: 2px 0 0; }
.ctx-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.ctx-links { display: flex; gap: 6px; }
.xlink { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 9px; font-size: 11px; font-weight: 700; cursor: pointer;
  background: transparent; border: 1px solid var(--ex-border); color: var(--ex-text-secondary); transition: color 0.2s, border-color 0.2s; }
.xlink:hover { color: var(--ex-violet); border-color: var(--ex-violet-border); }

.flow { padding: 16px 18px 14px; }

/* notice-period gate (blocks disburse until notice served) */
.ngate { display: flex; align-items: center; gap: 11px; margin-top: 14px; padding: 11px 13px; border-radius: 13px;
  border: 1px solid color-mix(in srgb, var(--ex-pending) 34%, transparent); background: color-mix(in srgb, var(--ex-pending) 9%, transparent); }
.ngate-ic { color: var(--ex-pending); flex-shrink: 0; }
.ngate-txt { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
.ngate-title { font-size: 12.5px; font-weight: 800; color: var(--ex-text); }
.ngate-sub { font-size: 11px; line-height: 1.45; color: var(--ex-text-muted); }
.ngate-go { display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0; padding: 6px 11px; border-radius: 9px; font-size: 11px; font-weight: 700; cursor: pointer;
  background: transparent; border: 1px solid color-mix(in srgb, var(--ex-pending) 34%, transparent); color: var(--ex-pending); transition: background 0.2s; }
.ngate-go:hover { background: color-mix(in srgb, var(--ex-pending) 14%, transparent); }

.flow-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--ex-border); }
.sa-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; font-size: 12.5px; font-weight: 700; cursor: pointer;
  border: 1px solid var(--ex-border-strong); background: var(--ex-surface); color: var(--ex-text-secondary); transition: transform 0.18s, border-color 0.2s, color 0.2s; }
.sa-btn:hover:not(:disabled) { transform: translateY(-1px); }
.sa-btn.primary { border: none; background: var(--ex-grad-hero); color: #1a1206; }
.sa-btn.ghost { background: transparent; }
.sa-btn.danger-ghost { color: var(--ex-blocked); border-color: color-mix(in srgb, var(--ex-blocked) 30%, transparent); }
.sa-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.sett-grid { display: grid; grid-template-columns: 372px 1fr; gap: 14px; align-items: start; }
@media (max-width: 980px) { .sett-grid { grid-template-columns: 1fr; } }

/* modal internals */
.exm-note { font-size: 12px; color: var(--ex-text-secondary); margin: 0; padding: 9px 11px; border-radius: 10px; background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.exm-note.danger { color: var(--ex-blocked); background: color-mix(in srgb, var(--ex-blocked) 11%, transparent); border-color: color-mix(in srgb, var(--ex-blocked) 28%, transparent); }
.exm-note.success { color: var(--ex-cleared); background: color-mix(in srgb, var(--ex-cleared) 11%, transparent); border-color: color-mix(in srgb, var(--ex-cleared) 28%, transparent); }
.exm-note b { color: inherit; }
.seg { display: grid; gap: 6px; } .seg-3 { grid-template-columns: repeat(3, 1fr); }
.seg button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 6px; border-radius: 9px; cursor: pointer;
  background: var(--ex-surface); border: 1px solid var(--ex-border); color: var(--ex-text-secondary); font-weight: 700; font-size: 11.5px; transition: all 0.2s; }
.seg button.on { border-color: var(--ex-cleared); background: color-mix(in srgb, var(--ex-cleared) 13%, transparent); color: var(--ex-cleared); }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.fld { display: flex; flex-direction: column; gap: 5px; }
.fld label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--ex-text-muted); }
.fld label i { color: var(--ex-violet); font-style: normal; text-transform: none; }
.fld input, .fld textarea { width: 100%; padding: 10px 12px; border-radius: 10px; font-size: 13px; font-family: inherit; background: rgba(0,0,0,0.3); border: 1px solid var(--ex-border); color: var(--ex-text); resize: vertical; }
.fld input:focus, .fld textarea:focus { outline: none; border-color: var(--ex-violet-border); }
[data-theme="light"] .fld input, [data-theme="light"] .fld textarea { background: rgba(255,250,242,0.72); }

.adj-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.adj-col { display: flex; flex-direction: column; gap: 7px; }
.adj-h { display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; margin: 0 0 2px; }
.adj-h.earn { color: var(--ex-cleared); } .adj-h.rec { color: var(--ex-blocked); }
.adj-fld { display: grid; grid-template-columns: 1fr 116px; align-items: center; gap: 8px; }
.adj-fld span { font-size: 12px; color: var(--ex-text-secondary); }
.adj-fld input { padding: 7px 10px; border-radius: 9px; font-size: 12.5px; font-family: var(--ex-mono); text-align: right; background: rgba(0,0,0,0.3); border: 1px solid var(--ex-border); color: var(--ex-text); }
[data-theme="light"] .adj-fld input { background: rgba(255,250,242,0.72); }
.adj-prev { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 11px 13px; border-radius: 12px; background: var(--ex-panel); border: 1px solid var(--ex-border); }
.adj-prev .apl { display: block; font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ex-text-muted); }
.adj-prev b { font-size: 14px; font-weight: 820; color: var(--ex-text); }
.adj-prev b.earn { color: var(--ex-cleared); } .adj-prev b.rec { color: var(--ex-blocked); }
.apar { color: var(--ex-text-dim); }
.adj-net { margin-left: auto; text-align: right; padding-left: 12px; border-left: 1px solid var(--ex-border); }
.adj-prev.payable .adj-net b { color: var(--ex-cleared); } .adj-prev.recoverable .adj-net b { color: var(--ex-blocked); }

.adjf { padding: 9px 11px; border-radius: 11px; background: var(--ex-panel); border: 1px solid var(--ex-border); transition: border-color 0.25s, background 0.25s, box-shadow 0.3s; }
.adjf.pin { border-color: var(--ex-violet-border); background: var(--ex-violet-soft); box-shadow: 0 0 0 2px color-mix(in srgb, var(--ex-amber) 10%, transparent); }
.adjf-top { display: flex; align-items: center; gap: 7px; margin-bottom: 6px; }
.adjf-name { font-size: 12px; font-weight: 600; color: var(--ex-text-secondary); flex: 1; min-width: 0; }
.adjf-tag { font-size: 8px; font-weight: 800; letter-spacing: 0.08em; padding: 2px 5px; border-radius: 5px; flex-shrink: 0; }
.adjf-tag.auto { color: var(--ex-text-muted); background: color-mix(in srgb, var(--ex-text) 8%, transparent); }
.adjf-tag.man { color: var(--ex-amber); background: var(--ex-violet-soft); }
.adjf-pin { display: inline-flex; align-items: center; gap: 3px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.04em; color: var(--ex-amber); white-space: nowrap; }
.adjf-ctl { position: relative; display: flex; align-items: center; gap: 6px; }
.adjf-cur { position: absolute; left: 10px; font-size: 12px; color: var(--ex-text-dim); pointer-events: none; }
.adjf-ctl input { flex: 1; min-width: 0; padding: 8px 10px 8px 22px; border-radius: 9px; font-size: 12.5px; font-family: var(--ex-mono); text-align: right; background: rgba(0,0,0,0.3); border: 1px solid var(--ex-border); color: var(--ex-text); }
.adjf-ctl input:focus { outline: none; border-color: var(--ex-violet-border); }
[data-theme="light"] .adjf-ctl input { background: rgba(255,250,242,0.72); }
.adjf-rv { display: grid; place-items: center; width: 30px; height: 32px; flex-shrink: 0; border-radius: 8px; cursor: pointer; background: transparent; border: 1px solid var(--ex-violet-border); color: var(--ex-amber); transition: background 0.2s; }
.adjf-rv:hover { background: var(--ex-violet-soft); }

.adj-reason { display: flex; flex-direction: column; gap: 5px; }
.adj-reason label { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--ex-text-muted); }
.adj-reason label i { color: var(--ex-blocked); font-style: normal; }
.adj-reason-meta { margin-left: auto; font-size: 9.5px; font-weight: 600; text-transform: none; letter-spacing: 0; color: var(--ex-text-dim); }
.adj-reason textarea { width: 100%; padding: 10px 12px; border-radius: 10px; font-size: 12.5px; font-family: inherit; background: rgba(0,0,0,0.3); border: 1px solid var(--ex-violet-border); color: var(--ex-text); resize: vertical; }
.adj-reason textarea:focus { outline: none; }
[data-theme="light"] .adj-reason textarea { background: rgba(255,250,242,0.72); }

.vbasis { display: flex; align-items: center; gap: 7px; padding: 8px 11px; border-radius: 10px; font-size: 11.5px; color: var(--ex-text-secondary); background: color-mix(in srgb, var(--ex-cleared) 9%, transparent); border: 1px solid color-mix(in srgb, var(--ex-cleared) 22%, transparent); }
.vbasis svg { color: var(--ex-cleared); flex-shrink: 0; }
.vbasis b { color: var(--ex-text); }
.vchk { display: flex; flex-direction: column; gap: 7px; }
.vchk-h { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; color: var(--ex-text-muted); }
.vchk-row { display: flex; align-items: center; gap: 10px; text-align: left; padding: 10px 12px; border-radius: 11px; cursor: pointer; font-size: 12px; font-weight: 600; color: var(--ex-text-secondary); background: var(--ex-panel); border: 1px solid var(--ex-border); transition: border-color 0.25s, background 0.25s, color 0.25s; }
.vchk-row:hover { border-color: var(--ex-border-strong); }
.vchk-row.on { color: var(--ex-text); border-color: color-mix(in srgb, var(--ex-cleared) 38%, transparent); background: color-mix(in srgb, var(--ex-cleared) 11%, transparent); }
.vchk-ic { flex-shrink: 0; color: var(--ex-text-dim); transition: color 0.25s; }
.vchk-row.on .vchk-ic { color: var(--ex-cleared); }

/* ── inline pre-verification gate (in the flow card) ── */
.pfg { margin-top: 14px; padding: 12px 14px; border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--ex-pending) 34%, transparent);
  background: color-mix(in srgb, var(--ex-pending) 8%, transparent); }
.pfg.ready { border-color: color-mix(in srgb, var(--ex-cleared) 34%, transparent); background: color-mix(in srgb, var(--ex-cleared) 8%, transparent); }
.pfg-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.pfg-hic { color: var(--ex-pending); flex-shrink: 0; }
.pfg.ready .pfg-hic { color: var(--ex-cleared); }
.pfg-title { font-size: 12.5px; font-weight: 800; color: var(--ex-text); }
.pfg-sub { font-size: 11px; color: var(--ex-text-muted); }
.pfg-spin { color: var(--ex-text-muted); margin-left: auto; }
.pfg-checks { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
@media (max-width: 720px) { .pfg-checks { grid-template-columns: 1fr; } }
.pfg-chk { display: flex; align-items: center; gap: 9px; text-align: left; padding: 9px 11px; border-radius: 11px; cursor: pointer;
  background: var(--ex-surface); border: 1px solid var(--ex-border); transition: transform 0.2s, border-color 0.2s; }
.pfg-chk:hover { transform: translateY(-2px); border-color: var(--ex-border-strong); }
.pfg-cic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
  color: var(--ex-pending); background: color-mix(in srgb, var(--ex-pending) 13%, transparent); }
.pfg-chk.ok .pfg-cic { color: var(--ex-cleared); background: var(--ex-cleared-soft); }
.pfg-cmid { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
.pfg-cl { font-size: 11.5px; font-weight: 700; color: var(--ex-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pfg-cd { font-size: 10px; color: var(--ex-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pfg-stat { flex-shrink: 0; color: var(--ex-pending); }
.pfg-chk.ok .pfg-stat { color: var(--ex-cleared); }
.pfg-go { flex-shrink: 0; color: var(--ex-text-dim); opacity: 0.4; transition: opacity 0.2s, color 0.2s; }
.pfg-chk:hover .pfg-go { opacity: 1; color: var(--ex-violet); }

/* ── verify-modal system requirements ── */
.vgate { display: flex; flex-direction: column; gap: 4px; padding: 11px 13px; border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--ex-pending) 30%, transparent);
  background: color-mix(in srgb, var(--ex-pending) 7%, transparent); }
.vgate.ready { border-color: color-mix(in srgb, var(--ex-cleared) 30%, transparent); background: color-mix(in srgb, var(--ex-cleared) 7%, transparent); }
.vgate-h { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; color: var(--ex-pending); margin-bottom: 2px; }
.vgate.ready .vgate-h { color: var(--ex-cleared); }
.vgate-row { display: flex; align-items: center; gap: 9px; padding: 4px 0; }
.vgate-ic { flex-shrink: 0; color: var(--ex-pending); }
.vgate-row.ok .vgate-ic { color: var(--ex-cleared); }
.vgate-l { font-size: 12px; font-weight: 700; color: var(--ex-text); flex-shrink: 0; }
.vgate-d { font-size: 11px; color: var(--ex-text-muted); margin-left: auto; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.vgate-go { display: grid; place-items: center; width: 24px; height: 24px; flex-shrink: 0; border-radius: 7px; cursor: pointer; background: transparent; border: 1px solid var(--ex-border); color: var(--ex-text-muted); }
.vgate-go:hover { color: var(--ex-violet); border-color: var(--ex-violet-border); }
.vgate-note { font-size: 11px; color: var(--ex-text-muted); margin: 4px 0 0; }

.pf { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border-radius: 12px; background: var(--ex-panel); border: 1px solid var(--ex-border); }
.pf-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; font-size: 12.5px; color: var(--ex-text-secondary); }
.pf-row b.earn { color: var(--ex-cleared); } .pf-row b.rec { color: var(--ex-blocked); }
.pf-row.net { margin-top: 4px; padding-top: 9px; border-top: 1px solid var(--ex-border-strong); font-weight: 800; font-size: 14px; color: var(--ex-text); }
.pf-row.net b { color: var(--ex-text); }

.post-prev { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.pp { display: flex; align-items: center; gap: 6px; padding: 9px 11px; border-radius: 10px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; }
.pp b { margin-left: auto; font-size: 12.5px; }
.pp.earn { color: var(--ex-cleared); background: color-mix(in srgb, var(--ex-cleared) 11%, transparent); border: 1px solid color-mix(in srgb, var(--ex-cleared) 24%, transparent); }
.pp.rec { color: var(--ex-blocked); background: color-mix(in srgb, var(--ex-blocked) 11%, transparent); border: 1px solid color-mix(in srgb, var(--ex-blocked) 24%, transparent); }

.exm-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid transparent; transition: transform 0.18s; }
.exm-btn:hover:not(:disabled) { transform: translateY(-1px); }
.exm-btn.ghost { background: transparent; border-color: var(--ex-border-strong); color: var(--ex-text-secondary); }
.exm-btn.primary { background: var(--ex-grad-hero); color: #1a1206; }
.exm-btn.success { background: linear-gradient(135deg, #34d399, #059669); color: #04140d; }
.exm-btn.danger { background: linear-gradient(135deg, #ef4444, #b91c1c); color: #fff; }
.exm-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* kill number-input spinner arrows */
.adjf-ctl input::-webkit-outer-spin-button, .adjf-ctl input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.adjf-ctl input[type="number"] { -moz-appearance: textfield; appearance: textfield; }

/* live adjust preview */
.adjp { position: relative; overflow: hidden; border-radius: 14px; padding: 14px 16px; background: var(--ex-panel); border: 1px solid var(--ex-border); }
.adjp.payable { --c2: var(--ex-cleared); } .adjp.recoverable { --c2: var(--ex-blocked); } .adjp.balanced { --c2: #9ca3af; }
.adjp-glow { position: absolute; inset: -50% 20% 20% -20%; pointer-events: none;
  background: radial-gradient(48% 60% at 40% 8%, color-mix(in srgb, var(--c2) 24%, transparent), transparent 72%);
  animation: adjp-breathe 6s ease-in-out infinite; }
.adjp-core { position: relative; text-align: center; }
.adjp-eyebrow { display: block; font-size: 9px; font-weight: 850; letter-spacing: 0.12em; color: var(--c2); }
.adjp-od { font-size: 26px; font-weight: 850; margin-top: 2px; }
.adjp-meter { position: relative; display: flex; height: 8px; border-radius: 5px; overflow: hidden; margin: 12px 0 7px; background: color-mix(in srgb, var(--ex-text) 8%, transparent); }
.adjp-fill { height: 100%; transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
.adjp-fill.earn { background: linear-gradient(90deg, #34d399, #059669); }
.adjp-fill.rec { background: linear-gradient(90deg, #b91c1c, #f87171); }
.adjp-legend { display: flex; justify-content: space-between; font-size: 11px; color: var(--ex-text-muted); }
.adjp-legend .le { display: inline-flex; align-items: center; gap: 6px; }
.adjp-legend .le b { color: var(--ex-text); }
.adjp-legend .le.earn { color: var(--ex-cleared); } .adjp-legend .le.rec { color: var(--ex-blocked); }
.le-dot { width: 7px; height: 7px; border-radius: 50%; }
.le.earn .le-dot { background: var(--ex-cleared); box-shadow: 0 0 6px var(--ex-cleared); } .le.rec .le-dot { background: var(--ex-blocked); box-shadow: 0 0 6px var(--ex-blocked); }

/* living cards — continuous edge sweep */
.ctx, .flow { position: relative; overflow: hidden; }
.ctx::before, .flow::before { content: ''; position: absolute; inset: 0 0 auto; height: 1px; pointer-events: none;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--ex-amber) 60%, transparent), transparent);
  transform: translateX(-100%); animation: ex-edge 6.5s ease-in-out infinite; }
.flow::before { animation-delay: 3.25s; }
@keyframes ex-edge { 0%, 38% { transform: translateX(-100%); } 72%, 100% { transform: translateX(100%); } }
@keyframes adjp-breathe { 0%, 100% { opacity: 0.8; transform: scale(1); } 50% { opacity: 1; transform: scale(1.08); } }

@media (max-width: 560px) { .adj-grid { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) {
  .spin { animation: none; }
  .lens, .rchip, .sa-btn, .exm-btn, .adjf, .adjf-rv, .vchk-row, .vchk-ic, .adjp-fill { transition: none; }
  .ctx::before, .flow::before, .adjp-glow { animation: none; }
}
</style>
