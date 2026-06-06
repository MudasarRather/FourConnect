<template>
  <Teleport to="body">
    <transition name="psd-fade">
      <div v-if="open" class="psd-overlay" :class="{ 'as-modal': isModal }" @mousedown.self="$emit('close')">
        <Motion class="psd-panel" :class="{ 'as-modal': isModal }" :as="isModal ? 'div' : 'aside'"
          :initial="enterFrom" :animate="enterTo" :exit="exitTo"
          :transition="{ duration: 0.46, ease: [0.16,1,0.3,1] }">
          <span class="psd-foil" aria-hidden="true" />

          <!-- ── header / identity ── -->
          <header class="psd-head">
            <div class="psd-head-main">
              <span class="psd-eyebrow"><Coins :size="11" /> Minted statement</span>
              <h2 v-if="slip" class="psd-no pay-foil-text">{{ slip.payslip_no }}</h2>
              <h2 v-else class="psd-no">Loading…</h2>
              <div v-if="slip" class="psd-id">
                <span class="psd-avatar" :style="avatarStyle">{{ initials }}</span>
                <div class="psd-id-txt">
                  <b>{{ slip.employee_name || slip.employee_code }}</b>
                  <span>{{ [slip.designation_name, slip.department_name].filter(Boolean).join(' · ') || slip.employee_code }}</span>
                </div>
              </div>
            </div>
            <button class="psd-x" @click="$emit('close')"><X :size="18" /></button>
          </header>

          <div v-if="loading" class="psd-body"><div class="pay-skel" style="height:120px" /><div class="pay-skel" style="height:220px;margin-top:14px" /></div>

          <div v-else-if="slip" class="psd-body">
            <!-- period + status seal -->
            <div class="psd-period">
              <span class="psd-period-lbl"><CalendarDays :size="13" /> {{ monthLabel(slip.period_month) }} {{ slip.period_year }}</span>
              <span class="psd-seal" :class="slip.status.toLowerCase()">{{ statusMeta(slip.status).label }}</span>
            </div>

            <!-- ── net-pay hero with gross→deductions→net flow ── -->
            <Motion as="div" class="psd-hero"
              :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.5, delay: 0.06, ease: [0.16,1,0.3,1] }">
              <div class="psd-hero-top">
                <span class="psd-hero-lbl">Net pay</span>
                <span class="psd-coin"><Coins :size="18" /><i class="psd-coin-ring" /></span>
              </div>
              <PayMoneyValue class="psd-net-big" tone="net" :value="slip.net_pay" :duration="900" />

              <div class="psd-flow">
                <svg class="psd-flow-svg" viewBox="0 0 300 26" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M22 13 H150 M150 13 H278" class="psd-flow-track" />
                  <path d="M22 13 H278" class="psd-flow-live" />
                </svg>
                <div class="psd-flow-nodes">
                  <div class="psd-fn"><span class="fn-lbl">Gross</span><PayMoneyValue class="fn-val" :value="slip.gross_earnings" :animate="false" /></div>
                  <div class="psd-fn minus"><span class="fn-lbl">Deductions</span><PayMoneyValue class="fn-val" tone="deduction" :value="slip.total_deductions" :animate="false" /></div>
                  <div class="psd-fn"><span class="fn-lbl">Net</span><PayMoneyValue class="fn-val" tone="net" :value="slip.net_pay" :animate="false" /></div>
                </div>
              </div>

              <!-- allocation meter: how gross splits into take-home vs deductions -->
              <div class="psd-meter" :title="`Take-home ${pct(slip.net_pay)}% · Deductions ${pct(slip.total_deductions)}%`">
                <Motion as="span" class="seg net" :initial="{ scaleX: 0 }" :animate="{ scaleX: 1 }"
                  :transition="{ duration: 0.8, delay: 0.25, ease: [0.16,1,0.3,1] }"
                  :style="{ width: pct(slip.net_pay) + '%' }" />
                <Motion as="span" class="seg ded" :initial="{ scaleX: 0 }" :animate="{ scaleX: 1 }"
                  :transition="{ duration: 0.8, delay: 0.4, ease: [0.16,1,0.3,1] }"
                  :style="{ width: pct(slip.total_deductions) + '%' }" />
              </div>
              <div class="psd-meter-key">
                <span><i class="k net" /> Take-home {{ pct(slip.net_pay) }}%</span>
                <span><i class="k ded" /> Deductions {{ pct(slip.total_deductions) }}%</span>
              </div>
            </Motion>

            <!-- ── attendance basis ── -->
            <div class="psd-meta">
              <Motion v-for="(m, i) in metaTiles" :key="m.k" as="div" class="psd-mt"
                :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.36, delay: 0.18 + i*0.05 }">
                <span>{{ m.k }}</span><b>{{ m.v }}</b>
              </Motion>
            </div>

            <!-- ── component ledger cards ── -->
            <Motion v-for="(sec, si) in groupedSections" :key="sec.key" as="section" class="psec" :class="sec.cat"
              :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.46, delay: 0.24 + si*0.08, ease: [0.16,1,0.3,1] }">
              <header class="psec-head">
                <span class="psec-ico"><component :is="sec.icon" :size="14" /></span>
                <div class="psec-h-txt">
                  <span class="psec-label">{{ sec.label }}</span>
                  <span class="psec-count">{{ sec.lines.length }} {{ sec.lines.length === 1 ? 'item' : 'items' }}</span>
                </div>
                <PayMoneyValue class="psec-total" :tone="sec.tone" :value="sec.total" :duration="800" />
                <span class="psec-underline" />
              </header>
              <ul class="psec-lines">
                <li v-for="(l, li) in sec.lines" :key="l.component_code" class="pln" :style="{ '--li': li }">
                  <span class="pln-dot" />
                  <div class="pln-main">
                    <span class="pln-name">{{ l.component_name }}</span>
                    <span v-if="prettyNote(l)" class="pln-note">{{ prettyNote(l) }}</span>
                  </div>
                  <span class="pln-tags">
                    <span v-if="sec.key === 'EARNING' && !l.is_taxable" class="pln-tag free">Tax-free</span>
                    <span v-if="Number(l.full_amount) > Number(l.amount)" class="pln-tag pro"
                      :title="`Full ${fmtFull(l.full_amount)} · prorated for LOP`">Prorated</span>
                  </span>
                  <PayMoneyValue class="pln-amt" :tone="sec.tone" :value="l.amount" :animate="false" />
                </li>
              </ul>
            </Motion>

            <!-- ── disbursement readiness ── -->
            <Motion as="div" class="psd-card" :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.42, delay: 0.4 }">
              <div class="psd-card-h"><CreditCard :size="14" /> Bank disbursement
                <span class="psd-ready" :class="{ ok: disbursed }">{{ disbursed ? 'Disbursed' : 'Pending release' }}</span>
              </div>
              <div class="psd-kv">
                <div><span>Bank</span><b>{{ slip.bank_name || '—' }}</b></div>
                <div><span>Account</span><b class="mono">{{ maskAccount(slip.account_number) }}</b></div>
                <div><span>IFSC</span><b class="mono">{{ slip.ifsc || '—' }}</b></div>
                <div><span>Amount credited</span><b class="mono"><PayMoneyValue tone="net" :value="slip.net_pay" :animate="false" /></b></div>
              </div>
            </Motion>

            <!-- ── statutory identity + CTC ── -->
            <Motion as="div" class="psd-card" :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.42, delay: 0.46 }">
              <div class="psd-card-h"><ShieldCheck :size="14" /> Statutory &amp; cost</div>
              <div class="psd-kv">
                <div><span>PAN</span><b class="mono">{{ slip.pan || '—' }}</b></div>
                <div><span>UAN</span><b class="mono">{{ slip.uan || '—' }}</b></div>
                <div><span>Tax regime</span><b>{{ slip.tax_regime || '—' }}</b></div>
                <div><span>Employer cost</span><b class="mono"><PayMoneyValue :value="slip.employer_contributions" :animate="false" /></b></div>
                <div class="span2"><span>Cost to company (monthly)</span><b class="mono"><PayMoneyValue :value="slip.ctc_value || ctcFallback" :animate="false" /></b></div>
              </div>
            </Motion>

            <div v-if="slip.remarks" class="psd-remarks"><b>Remarks</b> {{ slip.remarks }}</div>
          </div>

          <!-- ── corporate workflow footer ── -->
          <footer v-if="slip" class="psd-foot">
            <div class="psd-wf">
              <span class="wf-eyebrow"><GitBranch :size="11" /> Approval workflow</span>
              <div class="psd-ladder">
                <div v-for="(st, i) in ladder" :key="st.key" class="lad" :class="{ done: st.done, on: st.on, branch: st.branch }">
                  <span v-if="i < ladder.length - 1" class="lad-line" :class="{ fill: st.done }" />
                  <span class="lad-dot"><Check v-if="st.done" :size="9" :stroke-width="3.4" /></span>
                  <span class="lad-lbl">{{ st.label }}</span>
                </div>
              </div>
            </div>
            <div class="psd-actions">
              <button class="psd-btn ghost" @click="download" :disabled="acting"><Download :size="15" /> PDF</button>
              <template v-if="mode === 'admin'">
                <button v-if="canHold" class="psd-btn hold" @click="holdOpen = true" :disabled="acting"><Pause :size="15" /> Hold</button>
                <button v-if="canRelease" class="psd-btn primary" @click="doRelease" :disabled="acting"><Check :size="15" /> Release</button>
              </template>
            </div>
          </footer>

          <PayHoldModal :open="holdOpen" :payslip="slip" :busy="acting"
            @close="holdOpen = false" @confirm="confirmHold" />
        </Motion>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { Motion } from 'motion-v'
import {
  X, Download, Coins, CalendarDays, CreditCard, ShieldCheck, Pause, Check,
  ArrowUpRight, ArrowDownRight, Landmark, Building2, GitBranch,
} from 'lucide-vue-next'
import PayMoneyValue from '../components/PayMoneyValue.vue'
import PayHoldModal from '../modals/PayHoldModal.vue'
import { monthLabel, statusMeta, inr } from '@/composables/usePayroll'
import {
  PAYSLIP_SECTIONS, fetchPayslip, fetchMyPayslip,
  downloadPayslipPdf, downloadMyPayslipPdf, holdPayslip, releasePayslip,
} from '@/composables/usePayslip'
import { useToast } from 'vue-toastification'

const props = defineProps({
  open: Boolean,
  payslipId: { type: String, default: null },
  mode: { type: String, default: 'admin' },        // 'admin' | 'self'
  variant: { type: String, default: 'drawer' },    // 'drawer' (slide-in) | 'modal' (centered)
})
const emit = defineEmits(['close', 'updated'])
const toast = useToast()

const slip = ref(null)
const loading = ref(false)
const acting = ref(false)

const isModal = computed(() => props.variant === 'modal')
const enterFrom = computed(() => isModal.value ? { opacity: 0, y: 34, scale: 0.94 } : { x: 80, opacity: 0, scale: 0.985 })
const enterTo = computed(() => isModal.value ? { opacity: 1, y: 0, scale: 1 } : { x: 0, opacity: 1, scale: 1 })
const exitTo = computed(() => isModal.value ? { opacity: 0, y: 20, scale: 0.97 } : { x: 80, opacity: 0 })

const SEC_TONE = { EARNING: '', DEDUCTION: 'deduction', STATUTORY_DEDUCTION: 'statutory', EMPLOYER_CONTRIBUTION: 'net' }
const SEC_ICON = { EARNING: ArrowUpRight, DEDUCTION: ArrowDownRight, STATUTORY_DEDUCTION: Landmark, EMPLOYER_CONTRIBUTION: Building2 }

// calc_note sometimes carries a bare enum dump (e.g. "StatutoryKind.PF_EMPLOYEE")
// that's redundant with the component name — suppress it; keep real traces.
const ENUM_NOTE = /^[A-Za-z]+Kind\.[A-Z0-9_]+$/
const prettyNote = (l) => {
  const n = (l.calc_note || '').trim()
  return !n || ENUM_NOTE.test(n) ? '' : n
}
const fmtFull = (v) => inr(v)

const load = async () => {
  if (!props.payslipId) return
  loading.value = true; slip.value = null
  try {
    slip.value = props.mode === 'self' ? await fetchMyPayslip(props.payslipId) : await fetchPayslip(props.payslipId)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load payslip') }
  finally { loading.value = false }
}
watch(() => [props.open, props.payslipId], () => { if (props.open && props.payslipId) load() })

const initials = computed(() => {
  const n = slip.value?.employee_name || slip.value?.employee_code || '?'
  return n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
})
const avatarStyle = computed(() => {
  const seed = (slip.value?.employee_code || 'x').charCodeAt(0) % 3
  const grads = [
    'linear-gradient(135deg,#fbbf24,#b8860b)',
    'linear-gradient(135deg,#f59e0b,#ea580c)',
    'linear-gradient(135deg,#fde68a,#d97706)',
  ]
  return { background: grads[seed] }
})

const metaTiles = computed(() => slip.value ? [
  { k: 'Working', v: fmtDays(slip.value.working_days) },
  { k: 'Paid', v: fmtDays(slip.value.paid_days) },
  { k: 'LOP', v: fmtDays(slip.value.lop_days) },
  { k: 'Regime', v: slip.value.tax_regime || '—' },
] : [])
const fmtDays = (d) => { const n = Number(d || 0); return Number.isInteger(n) ? String(n) : n.toFixed(1) }

const groupedSections = computed(() => {
  if (!slip.value) return []
  return PAYSLIP_SECTIONS.map(sec => {
    const lines = (slip.value.lines || []).filter(l => l.component_type === sec.key)
    const total = lines.reduce((a, l) => a + Number(l.amount || 0), 0)
    return { ...sec, lines, total, tone: SEC_TONE[sec.key] || '', icon: SEC_ICON[sec.key] }
  }).filter(s => s.lines.length)
})

const grossNum = computed(() => Number(slip.value?.gross_earnings || 0))
const ctcFallback = computed(() => grossNum.value + Number(slip.value?.employer_contributions || 0))
const pct = (v) => {
  const g = grossNum.value
  if (!g) return 0
  return Math.max(0, Math.min(100, Math.round((Number(v || 0) / g) * 100)))
}
const maskAccount = (a) => a ? `•••• ${String(a).slice(-4)}` : '—'

// corporate status workflow
const holdOpen = ref(false)
const disbursed = computed(() => slip.value?.status === 'RELEASED')
// backend rejects holding a RELEASED payslip (409) — only pre-release slips can be held
const canHold = computed(() => ['GENERATED', 'APPROVED'].includes(slip.value?.status))
const canRelease = computed(() => ['GENERATED', 'APPROVED', 'HELD'].includes(slip.value?.status))

const ladder = computed(() => {
  const s = slip.value?.status
  if (s === 'HELD') {
    return [
      { key: 'gen', label: 'Generated', done: true },
      { key: 'held', label: 'On hold', on: true, branch: true },
    ]
  }
  const order = ['GENERATED', 'APPROVED', 'RELEASED']
  const idx = order.indexOf(s)
  const labels = { GENERATED: 'Generated', APPROVED: 'Approved', RELEASED: 'Released' }
  return order.map((k, i) => ({
    key: k, label: labels[k],
    done: idx > i, on: idx === i,
  }))
})

const applyUpdated = (updated, fallbackStatus) => {
  if (updated && updated.id) slip.value = updated                       // full PayslipResponse
  else if (updated && updated.status) slip.value = { ...slip.value, status: updated.status }
  else slip.value.status = fallbackStatus
}
const doRelease = async () => {
  acting.value = true
  try {
    applyUpdated(await releasePayslip(slip.value.id), 'RELEASED')
    toast.success('Payslip released'); emit('updated')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to release') }
  finally { acting.value = false }
}
const confirmHold = async (payload) => {
  acting.value = true
  try {
    applyUpdated(await holdPayslip(slip.value.id, payload), 'HELD')
    toast.success('Payslip held'); emit('updated'); holdOpen.value = false
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to hold') }
  finally { acting.value = false }
}

const download = async () => {
  acting.value = true
  try {
    if (props.mode === 'self') await downloadMyPayslipPdf(slip.value.id, slip.value.payslip_no)
    else await downloadPayslipPdf(slip.value.id, slip.value.payslip_no)
  } catch (e) {
    toast.error(e?.response?.status === 503 ? 'PDF engine unavailable on the server (GTK)' : 'Download failed')
  } finally { acting.value = false }
}
</script>

<style scoped>
.psd-overlay { position: fixed; inset: 0; z-index: 4000;
  background: radial-gradient(120% 90% at 100% 0%, rgba(245,158,11,0.12), transparent 55%), rgba(6,5,4,0.55);
  backdrop-filter: blur(8px) saturate(140%); -webkit-backdrop-filter: blur(8px) saturate(140%);
  display: flex; justify-content: flex-end; }
.psd-panel { position: relative; width: min(540px, 96vw); height: 100%; display: flex; flex-direction: column;
  background: radial-gradient(140% 60% at 100% 0%, rgba(251,191,36,0.10), transparent 50%), var(--pay-surface-2);
  border-left: 1px solid var(--pay-border); box-shadow: -34px 0 100px -44px rgba(0,0,0,0.85); overflow: hidden; }

/* ── centered modal variant ── */
.psd-overlay.as-modal { justify-content: center; align-items: center; padding: 24px;
  background: radial-gradient(120% 90% at 50% -10%, rgba(245,158,11,0.16), transparent 55%), rgba(6,5,4,0.6);
  backdrop-filter: blur(10px) saturate(140%); -webkit-backdrop-filter: blur(10px) saturate(140%); }
.psd-panel.as-modal { width: min(620px, 96vw); height: auto; max-height: 90vh; border-radius: 24px;
  border: 1px solid var(--pay-border); border-left: 1px solid var(--pay-border);
  background: radial-gradient(150% 55% at 50% 0%, rgba(251,191,36,0.11), transparent 48%), var(--pay-surface-2);
  box-shadow: 0 44px 130px -42px rgba(0,0,0,0.86), inset 0 1px 0 rgba(255,255,255,0.05); }
.psd-panel.as-modal .psd-foil { border-radius: 24px 24px 0 0; }
.psd-panel.as-modal .psd-head { border-radius: 24px 24px 0 0;
  background: linear-gradient(180deg, var(--pay-surface-2), transparent); }
[data-theme="light"] .psd-overlay.as-modal {
  background: radial-gradient(120% 90% at 50% -10%, rgba(245,158,11,0.14), transparent 55%), rgba(40,25,10,0.34); }
[data-theme="light"] .psd-panel.as-modal { box-shadow: 0 44px 130px -42px rgba(40,25,10,0.38), inset 0 1px 0 rgba(255,255,255,0.6); }

/* animated foil edge */
.psd-foil { position: absolute; top: 0; left: 0; right: 0; height: 3px; overflow: hidden; z-index: 5;
  background: linear-gradient(90deg, transparent, rgba(251,191,36,0.2), transparent); }
.psd-foil::after { content: ''; position: absolute; inset: 0 auto 0 0; width: 38%;
  background: linear-gradient(90deg, transparent, var(--pay-mint-bright), var(--pay-amber), transparent);
  animation: pay-foil-sweep 3.6s var(--pay-ease) infinite; }

/* ── header ── */
.psd-head { position: relative; z-index: 2; display: flex; justify-content: space-between; align-items: flex-start;
  gap: 12px; padding: 22px 22px 16px; background: linear-gradient(180deg, var(--pay-surface-2), transparent);
  border-bottom: 1px solid var(--pay-border-soft); }
.psd-head-main { min-width: 0; }
.psd-eyebrow { display: inline-flex; align-items: center; gap: 5px; font-family: var(--pay-mono); font-size: 10px;
  text-transform: uppercase; letter-spacing: 0.14em; color: var(--pay-treasury); }
.psd-no { margin: 5px 0 0; font-size: 21px; font-family: var(--pay-mono); font-weight: 800; letter-spacing: -0.01em; }
.psd-no:not(.pay-foil-text) { color: var(--pay-text); }
.psd-id { display: flex; align-items: center; gap: 10px; margin-top: 11px; }
.psd-avatar { width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center; flex-shrink: 0;
  color: #1a1206; font-weight: 800; font-size: 13px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.4);
  animation: pay-coin-drop 0.7s var(--pay-spring) both; }
.psd-id-txt { min-width: 0; display: flex; flex-direction: column; }
.psd-id-txt b { font-size: 14px; color: var(--pay-text); }
.psd-id-txt span { font-size: 11.5px; color: var(--pay-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.psd-x { flex-shrink: 0; width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--pay-border-soft);
  background: var(--pay-surface); color: var(--pay-text-2); cursor: pointer; display: grid; place-items: center;
  transition: transform 0.22s var(--pay-spring), color 0.18s, border-color 0.18s, background 0.18s; }
.psd-x:hover { color: var(--pay-text); border-color: var(--pay-border); background: var(--pay-deduction-soft); transform: rotate(90deg); }

/* ── body ── */
.psd-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 16px 22px 30px; }
.psd-body::-webkit-scrollbar { width: 8px; }
.psd-body::-webkit-scrollbar-thumb { background: var(--pay-border); border-radius: 8px; }

.psd-period { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.psd-period-lbl { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--pay-text-muted); }
.psd-seal { font-family: var(--pay-mono); font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 5px 12px; border-radius: 8px; border: 1.5px solid currentColor; color: var(--pay-treasury);
  animation: pay-seal-press 0.6s var(--pay-spring) both; }
.psd-seal.released { color: var(--pay-net); }
.psd-seal.held { color: var(--pay-danger); }
.psd-seal.cancelled { color: var(--pay-st-cancelled); }

/* hero */
.psd-hero { padding: 18px; border-radius: 18px; margin-bottom: 16px; overflow: hidden;
  background: radial-gradient(120% 100% at 100% 0%, rgba(52,211,153,0.10), transparent 55%), var(--pay-net-soft);
  border: 1px solid rgba(52,211,153,0.22); }
.psd-hero-top { display: flex; align-items: center; justify-content: space-between; }
.psd-hero-lbl { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--pay-net-strong); }
.psd-coin { position: relative; width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center;
  color: #1a1206; background: var(--pay-grad-coin); box-shadow: 0 6px 18px -6px rgba(245,158,11,0.6); }
.psd-coin-ring { position: absolute; inset: -5px; border-radius: 50%; border: 1.5px dashed rgba(251,191,36,0.5);
  animation: pay-orbit 14s linear infinite; }
.psd-net-big { display: block; font-size: 34px; margin: 6px 0 14px; }

.psd-flow { position: relative; margin-bottom: 14px; }
.psd-flow-svg { position: absolute; inset: auto 0 0 0; width: 100%; height: 26px; top: 50%; transform: translateY(-50%); z-index: 0; }
.psd-flow-track { fill: none; stroke: var(--pay-border-soft); stroke-width: 2; }
.psd-flow-live { fill: none; stroke: var(--pay-treasury); stroke-width: 2; opacity: 0.6;
  stroke-dasharray: 6 10; animation: pay-flow-travel 3s linear infinite; }
.psd-flow-nodes { position: relative; z-index: 1; display: flex; justify-content: space-between; gap: 6px; }
.psd-fn { display: flex; flex-direction: column; gap: 2px; padding: 6px 9px; border-radius: 10px;
  background: var(--pay-surface-2); border: 1px solid var(--pay-border-soft); text-align: center; }
.psd-fn.minus { transform: translateY(-2px); }
.fn-lbl { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--pay-text-muted); }
.fn-val { font-size: 12px; }

.psd-meter { display: flex; height: 10px; border-radius: 999px; overflow: hidden; background: var(--pay-surface);
  border: 1px solid var(--pay-border-soft); }
.psd-meter .seg { height: 100%; transform-origin: left; }
.psd-meter .seg.net { background: linear-gradient(90deg, var(--pay-net-strong), var(--pay-net)); }
.psd-meter .seg.ded { background: linear-gradient(90deg, var(--pay-deduction), #ea580c); }
.psd-meter-key { display: flex; gap: 16px; margin-top: 8px; }
.psd-meter-key span { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--pay-text-muted); }
.psd-meter-key .k { width: 9px; height: 9px; border-radius: 3px; }
.psd-meter-key .k.net { background: var(--pay-net); } .psd-meter-key .k.ded { background: var(--pay-deduction); }

/* meta tiles */
.psd-meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 9px; margin-bottom: 18px; }
.psd-mt { background: var(--pay-surface); border: 1px solid var(--pay-border-soft); border-radius: 11px; padding: 9px 8px; text-align: center; }
.psd-mt span { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--pay-text-muted); }
.psd-mt b { font-family: var(--pay-mono); color: var(--pay-text); font-size: 15px; }

/* ── ledger cards (earnings / deductions / statutory / employer) ── */
.psec { margin-bottom: 12px; border-radius: 16px; overflow: hidden;
  border: 1px solid var(--pay-border-soft); background: var(--pay-surface);
  --c: var(--pay-mint); --c-soft: rgba(251,191,36,0.12); }
.psec.earning   { --c: var(--pay-mint);      --c-soft: rgba(251,191,36,0.12); }
.psec.deduction { --c: var(--pay-deduction); --c-soft: var(--pay-deduction-soft); }
.psec.statutory { --c: var(--pay-statutory); --c-soft: var(--pay-statutory-soft); }
.psec.employer  { --c: var(--pay-net);       --c-soft: var(--pay-net-soft); }

.psec-head { position: relative; display: flex; align-items: center; gap: 11px; padding: 13px 15px;
  background: linear-gradient(180deg, var(--c-soft), transparent); }
.psec-ico { flex-shrink: 0; width: 30px; height: 30px; border-radius: 10px; display: grid; place-items: center;
  background: var(--c-soft); color: var(--c); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 22%, transparent); }
.psec-h-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.psec-label { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; color: var(--pay-text); }
.psec-count { font-family: var(--pay-mono); font-size: 10px; color: var(--pay-text-muted); }
.psec-total { font-size: 16px; flex-shrink: 0; }
.psec-underline { position: absolute; left: 15px; right: 15px; bottom: 0; height: 2px; border-radius: 2px; transform-origin: left;
  background: linear-gradient(90deg, var(--c), transparent); animation: pay-underline-grow 0.6s var(--pay-ease) both; animation-delay: 0.15s; }

.psec-lines { list-style: none; margin: 0; padding: 4px 0 5px; }
.pln { position: relative; display: grid; grid-template-columns: 8px 1fr auto auto; align-items: center; gap: 11px;
  padding: 9px 15px; transition: background 0.18s var(--pay-ease);
  animation: pay-rise 0.42s var(--pay-ease) both; animation-delay: calc(var(--li, 0) * 38ms + 0.12s); }
.pln + .pln::before { content: ''; position: absolute; left: 34px; right: 15px; top: 0; height: 1px; background: var(--pay-border-soft); }
.pln:hover { background: var(--c-soft); }
.pln-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--c); transition: box-shadow 0.2s, transform 0.2s; }
.pln:hover .pln-dot { transform: scale(1.25); box-shadow: 0 0 0 4px color-mix(in srgb, var(--c) 22%, transparent); }
.pln-main { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.pln-name { font-size: 13px; font-weight: 500; color: var(--pay-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pln-note { font-size: 10.5px; color: var(--pay-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pln-tags { display: flex; gap: 4px; flex-shrink: 0; }
.pln-tag { font-size: 8.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; padding: 2px 7px; border-radius: 6px;
  cursor: default; }
.pln-tag.free { background: var(--pay-net-soft); color: var(--pay-net-strong); }
.pln-tag.pro { background: var(--pay-deduction-soft); color: var(--pay-deduction); }
.pln-amt { font-size: 13.5px; flex-shrink: 0; justify-self: end; min-width: 74px; text-align: right; }

/* info cards */
.psd-card { margin-bottom: 14px; padding: 14px 16px; border-radius: 15px; background: var(--pay-surface);
  border: 1px solid var(--pay-border-soft); }
.psd-card-h { display: flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 700; color: var(--pay-text);
  text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 12px; }
.psd-ready { margin-left: auto; font-family: var(--pay-mono); font-size: 9.5px; font-weight: 700; letter-spacing: 0.05em;
  padding: 3px 9px; border-radius: 7px; background: var(--pay-statutory-soft); color: var(--pay-statutory); text-transform: uppercase; }
.psd-ready.ok { background: var(--pay-net-soft); color: var(--pay-net-strong); }
.psd-kv { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; }
.psd-kv .span2 { grid-column: 1 / -1; }
.psd-kv div { display: flex; flex-direction: column; gap: 3px; }
.psd-kv span { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--pay-text-muted); }
.psd-kv b { font-size: 13px; color: var(--pay-text); font-weight: 600; }
.psd-kv b.mono { font-family: var(--pay-mono); }

.psd-remarks { font-size: 12px; color: var(--pay-text-2); line-height: 1.5; padding: 12px 14px; border-radius: 12px;
  background: rgba(251,191,36,0.06); border: 1px solid var(--pay-border); }
.psd-remarks b { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--pay-treasury); margin-bottom: 3px; }

/* ── footer / workflow ── */
.psd-foot { position: relative; z-index: 2; flex-shrink: 0; display: flex; flex-direction: column; gap: 15px;
  padding: 16px 22px 18px; background: var(--pay-surface-2); border-top: 1px solid var(--pay-border);
  box-shadow: 0 -14px 30px -22px rgba(0,0,0,0.7); }
.psd-foot::before { content: ''; position: absolute; top: -1px; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, var(--pay-border), transparent); }

.psd-wf { display: flex; flex-direction: column; gap: 12px; }
.wf-eyebrow { display: inline-flex; align-items: center; gap: 5px; font-family: var(--pay-mono); font-size: 9px;
  text-transform: uppercase; letter-spacing: 0.13em; color: var(--pay-text-muted); }
.wf-eyebrow svg { color: var(--pay-treasury); }

/* centered stepper: dots on top, labels below, lines bridge dot centers */
.psd-ladder { display: flex; padding: 0 4px; }
.lad { position: relative; flex: 1; display: flex; flex-direction: column; align-items: center; gap: 7px; min-width: 0; }
.lad-line { position: absolute; top: 7px; left: 50%; right: -50%; height: 2px; border-radius: 2px; overflow: hidden;
  background: var(--pay-border); z-index: 0; }
.lad-line.fill { background: linear-gradient(90deg, var(--pay-net-strong), var(--pay-net)); }
.lad-line.fill::after { content: ''; position: absolute; inset: 0; width: 40%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.75), transparent); animation: pay-foil-sweep 2.1s linear infinite; }
.lad-dot { position: relative; z-index: 1; width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0;
  display: grid; place-items: center; background: var(--pay-surface); border: 2px solid var(--pay-text-muted);
  color: #04231a; transition: background 0.3s, border-color 0.3s, box-shadow 0.3s; }
.lad.done .lad-dot { background: var(--pay-net); border-color: var(--pay-net); }
.lad.on .lad-dot { background: var(--pay-treasury); border-color: var(--pay-mint-bright);
  box-shadow: 0 0 0 4px rgba(251,191,36,0.16); animation: pay-node-halo 1.9s ease-out infinite; }
.lad.branch .lad-dot { background: var(--pay-danger); border-color: var(--pay-danger); }
.lad-lbl { font-size: 10px; color: var(--pay-text-muted); white-space: nowrap; text-align: center; transition: color 0.25s; }
.lad.done .lad-lbl { color: var(--pay-text-2); font-weight: 600; }
.lad.on .lad-lbl { color: var(--pay-treasury); font-weight: 700; }
.lad.branch .lad-lbl { color: var(--pay-danger); font-weight: 700; }

.psd-actions { display: flex; gap: 9px; }
.psd-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 12px; cursor: pointer;
  font-weight: 700; font-size: 13px; border: 1px solid transparent; transition: transform 0.16s var(--pay-spring), box-shadow 0.2s, border-color 0.18s, color 0.18s; }
.psd-btn:active:not(:disabled) { transform: scale(0.97); }
.psd-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.psd-btn.ghost { background: transparent; border-color: var(--pay-border-soft); color: var(--pay-text-2); }
.psd-btn.ghost:hover:not(:disabled) { border-color: var(--pay-border); color: var(--pay-text); }
.psd-btn.hold { background: var(--pay-deduction-soft); color: var(--pay-deduction); border-color: rgba(194,65,12,0.3); }
.psd-btn.hold:hover:not(:disabled) { transform: translateY(-2px); }
.psd-btn.primary { margin-left: auto; background: var(--pay-grad-cta); color: #1a1206; box-shadow: 0 8px 22px -10px rgba(245,158,11,0.7); }
.psd-btn.primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 14px 32px -12px rgba(245,158,11,0.8); }

/* enter/leave */
.psd-fade-enter-active, .psd-fade-leave-active { transition: opacity 0.32s var(--pay-ease); }
.psd-fade-enter-from, .psd-fade-leave-to { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .psd-foil::after, .psd-coin-ring, .psd-flow-live, .psd-avatar, .psd-seal,
  .pln, .psec-underline, .lad.on .lad-dot, .lad-line.fill::after { animation: none !important; }
}
@media (max-width: 480px) { .psd-meta { grid-template-columns: 1fr 1fr; } .psd-kv { grid-template-columns: 1fr; } }
</style>
