<template>
  <div class="treasury">
    <!-- ═══════════════════════════════════════════════════════════════════
         00 · HERO — "Settlement Desk"
         A treasury console: a mechanical ₹ odometer (rolling digits) reading
         the live money pool, twin coin-meters (sanctioned vs disbursed), and a
         days→₹ conversion readout. Deliberately mechanical/financial — not the
         flow-lanes (Applications), orbital dial (My-Approvals) or molten vessel
         (Comp-off).
    ═══════════════════════════════════════════════════════════════════ -->
    <Motion class="ty-desk" as="section"
      :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }"
    >
      <span class="ty-grid" aria-hidden="true" />
      <span class="ty-coins" aria-hidden="true"><i v-for="n in 9" :key="n" :style="coinStyle(n)" /></span>
      <span class="ty-edge tl" /><span class="ty-edge tr" /><span class="ty-edge bl" /><span class="ty-edge br" />

      <!-- LEFT — copy + readout -->
      <div class="ty-copy">
        <Motion as="div" class="ty-eye"
          :initial="{ opacity: 0, x: -10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.5, delay: 0.08 }">
          <span class="ty-eye-led" />
          <span class="leave-mono">TREASURY</span><span class="ty-eye-sep">/</span>
          <span class="leave-mono">SETTLEMENT DESK</span><span class="ty-eye-sep">/</span>
          <span class="leave-mono ty-eye-fy">FY {{ fyLabel }}</span>
        </Motion>

        <h1 class="ty-title">Unused days,
          <span class="ty-title-l2">settled to <em>salary.</em></span>
        </h1>
        <p class="ty-sub">
          Employees convert encashable leave into pay. HR <b>sanctions</b> (the balance is debited
          and the payout locked), then Finance <b>disburses</b> against a payroll batch.
        </p>

        <div class="ty-readout">
          <Motion v-for="(g, i) in gauges" :key="g.key" as="div" class="ty-gauge" :data-tone="g.tone"
            :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.45, delay: 0.22 + i * 0.07 }" :whileHover="{ y: -3 }">
            <span class="ty-gauge-ic"><component :is="g.icon" :size="13" /></span>
            <div>
              <span class="ty-gauge-val leave-mono">{{ g.value }}</span>
              <span class="ty-gauge-lbl">{{ g.label }}</span>
            </div>
          </Motion>
        </div>
      </div>

      <!-- RIGHT — the odometer -->
      <div class="ty-vault">
        <div class="ty-odo-toggle">
          <button :class="{ on: odoMode === 'pending' }" @click="odoMode = 'pending'">Pending pool</button>
          <button :class="{ on: odoMode === 'paid' }" @click="odoMode = 'paid'">Disbursed · FY</button>
        </div>

        <div class="ty-odo" :data-mode="odoMode">
          <span class="ty-odo-cur">₹</span>
          <div class="ty-odo-reel">
            <template v-for="(cell, i) in odometerCells" :key="'c' + i">
              <span v-if="!cell.isDigit" class="ty-odo-sep">{{ cell.char }}</span>
              <span v-else class="ty-odo-digit">
                <span class="ty-odo-strip" :style="{ transform: `translateY(-${cell.digit}em)`, transitionDelay: (i * 0.04) + 's' }">
                  <span v-for="d in 10" :key="d">{{ d - 1 }}</span>
                </span>
              </span>
            </template>
          </div>
        </div>
        <div class="ty-odo-cap leave-mono">
          {{ odoMode === 'pending' ? `${money.pendingCount} request(s) awaiting sanction` : `${money.paidCount} disbursed this FY` }}
        </div>

        <!-- twin coin meters -->
        <div class="ty-meters">
          <div class="ty-meter">
            <div class="ty-meter-head"><span class="leave-mono">SANCTIONED</span><span class="leave-mono">₹{{ inr(money.approvedAmt) }}</span></div>
            <div class="ty-meter-bar"><span class="san" :style="{ width: barPct(money.approvedAmt) + '%' }" /></div>
          </div>
          <div class="ty-meter">
            <div class="ty-meter-head"><span class="leave-mono">DISBURSED</span><span class="leave-mono">₹{{ inr(money.paidAmt) }}</span></div>
            <div class="ty-meter-bar"><span class="paid" :style="{ width: barPct(money.paidAmt) + '%' }" /></div>
          </div>
        </div>
      </div>
    </Motion>

    <!-- ═══════════════════════════════════════════════════════════════════
         01 · MONEY-SPLIT BAR — ₹ across the settlement lifecycle
    ═══════════════════════════════════════════════════════════════════ -->
    <Motion class="ty-split" as="section"
      :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, delay: 0.18 }">
      <div class="ty-split-head">
        <span class="leave-mono">SETTLEMENT VALUE · ₹{{ inr(money.totalAmt) }}</span>
        <span class="ty-split-legend leave-mono">
          <i class="d-pend" /> Pending <i class="d-san" /> Sanctioned <i class="d-paid" /> Paid <i class="d-rej" /> Rejected
        </span>
      </div>
      <div class="ty-split-bar">
        <span class="seg pend" :style="{ width: splitPct('pend') + '%' }" :title="`Pending ₹${inr(money.pendingAmt)}`" />
        <span class="seg san"  :style="{ width: splitPct('san') + '%' }"  :title="`Sanctioned ₹${inr(money.approvedAmt)}`" />
        <span class="seg paid" :style="{ width: splitPct('paid') + '%' }" :title="`Paid ₹${inr(money.paidAmt)}`" />
        <span class="seg rej"  :style="{ width: splitPct('rej') + '%' }"  :title="`Rejected ₹${inr(money.rejectedAmt)}`" />
        <span v-if="!money.totalAmt" class="ty-split-empty leave-mono">NO SETTLEMENTS YET</span>
      </div>
    </Motion>

    <!-- ═══════════════════════════════════════════════════════════════════
         02 · TOOLBAR
    ═══════════════════════════════════════════════════════════════════ -->
    <Motion class="ty-bar" as="div"
      :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.24 }">
      <div class="ty-segs">
        <button v-for="s in SEGMENTS" :key="s.key" class="ty-seg" :class="{ on: segment === s.key }" :data-tone="s.tone"
          @click="segment = s.key">
          {{ s.label }}<span class="ty-seg-n leave-mono">{{ segCount(s.key) }}</span>
        </button>
      </div>
      <div class="ty-bar-right">
        <div class="ty-search">
          <Search :size="13" />
          <input v-model="query" type="text" placeholder="Search name / ref…" />
          <button v-if="query" class="ty-search-x" @click="query = ''"><X :size="12" /></button>
        </div>
        <button class="leave-btn leave-btn-sm" :disabled="loading" @click="reload">
          <RefreshCw :size="13" :class="{ spin: loading }" /> Refresh
        </button>
      </div>
    </Motion>

    <!-- ═══════════════════════════════════════════════════════════════════
         03 · SETTLEMENT SLIPS
    ═══════════════════════════════════════════════════════════════════ -->
    <div v-if="loading" class="ty-grid-cards">
      <div v-for="i in 4" :key="i" class="leave-skel ty-slip-skel" />
    </div>

    <div v-else-if="!filtered.length" class="ty-empty">
      <div class="ty-empty-ic"><Banknote :size="32" /></div>
      <h4>{{ rows.length ? 'No settlements in this view' : 'No encashment requests yet' }}</h4>
      <p>{{ rows.length ? 'Try another status or clear the search.' : 'Employees raise encashment from their self-service page; sanctioned payouts appear here for disbursal.' }}</p>
    </div>

    <div v-else class="ty-grid-cards">
      <Motion v-for="(r, i) in filtered" :key="r.id" as="article"
        class="ty-slip" :data-s="r.status" role="button" tabindex="0"
        :initial="{ opacity: 0, y: 18, rotateX: -6 }" :animate="{ opacity: 1, y: 0, rotateX: 0 }"
        :transition="{ duration: 0.42, delay: Math.min(i * 0.05, 0.4), ease: [0.16, 1, 0.3, 1] }"
        :whileHover="{ y: -5 }"
        @click="openDetail(r)" @keydown.enter="openDetail(r)">
        <span class="ty-slip-guilloche" aria-hidden="true" />
        <span class="ty-slip-cue leave-mono" aria-hidden="true">VIEW</span>

        <!-- perforated stub -->
        <div class="ty-stub">
          <span class="ty-stub-ref leave-mono">{{ r.reference_no }}</span>
          <span class="ty-stamp" :data-s="r.status">{{ stampText(r.status) }}</span>
          <span class="ty-stub-fy leave-mono">{{ r.fiscal_year }}</span>
        </div>

        <div class="ty-slip-main">
          <header class="ty-slip-head">
            <span class="ty-ava">{{ initials(r.employee_name) }}</span>
            <div class="ty-who">
              <span class="ty-name">{{ r.employee_name }}</span>
              <span class="ty-meta leave-mono">{{ r.department_name || r.employee_code || '—' }} · {{ r.leave_type }}</span>
            </div>
            <span class="ty-applied leave-mono">{{ relTime(r.created_at) }}</span>
          </header>

          <div class="ty-figure">
            <span class="ty-fig-cur">₹</span>
            <span class="ty-fig-amt leave-mono">{{ inr(r.amount) }}</span>
            <span class="ty-fig-eqn leave-mono">{{ r.days_requested }}d × ₹{{ inr(r.basic_salary_snapshot) }}</span>
          </div>

          <p v-if="r.request_notes" class="ty-note">“{{ r.request_notes }}”</p>
          <div v-if="r.decision_notes" class="ty-decision leave-mono">
            <Quote :size="10" /> {{ r.status === 'REJECTED' ? 'Rejected' : 'Sanctioned' }}: {{ r.decision_notes }}
          </div>
          <div v-if="r.status === 'PAID' && r.payroll_ref" class="ty-payref leave-mono">
            <Hash :size="10" /> Payroll ref · {{ r.payroll_ref }}
          </div>

          <footer class="ty-slip-foot">
            <div v-if="r.status === 'PENDING_MANAGER'" class="ty-settled muted leave-mono">
              <Hourglass :size="12" /> Awaiting manager endorsement
            </div>
            <div v-else-if="r.status === 'PENDING'" class="ty-act">
              <button class="leave-btn leave-btn-sm leave-btn-danger" @click.stop="askReject(r)" :disabled="busyId === r.id"><X :size="12" /> Reject</button>
              <button class="leave-btn leave-btn-sm leave-btn-primary" @click.stop="approve(r)" :disabled="busyId === r.id"><Check :size="12" /> Sanction</button>
            </div>
            <div v-else-if="r.status === 'APPROVED'" class="ty-act">
              <span class="ty-await leave-mono">awaiting payout</span>
              <button class="leave-btn leave-btn-sm leave-btn-primary" @click.stop="openPay(r)" :disabled="busyId === r.id"><Banknote :size="12" /> Disburse</button>
            </div>
            <div v-else-if="r.status === 'PAID'" class="ty-settled leave-mono"><CheckCheck :size="12" /> Settled {{ relTime(r.paid_at) }}</div>
            <div v-else class="ty-settled muted leave-mono">{{ r.status }}</div>
          </footer>
        </div>
      </Motion>
    </div>

    <LeaveEncashmentRejectModal :open="rejectModal.open" :request="rejectModal.row"
      stage="HR" @cancel="rejectModal.open=false" @confirm="confirmReject" />
    <LeaveEncashmentPayModal :open="payModal.open" :request="payModal.row" @cancel="payModal.open=false" @paid="onPaid" />
    <LeaveEncashmentDetailModal :open="detailModal.open" :request="detailModal.row"
      @cancel="detailModal.open=false"
      @sanction="onDetailSanction" @reject="onDetailReject" @disburse="onDetailDisburse" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  RefreshCw, Check, X, Inbox, CheckCircle2, Wallet, Banknote,
  Search, Quote, Hash, CheckCheck, Layers, Hourglass,
} from 'lucide-vue-next'
import LeaveEncashmentRejectModal from '../modals/LeaveEncashmentRejectModal.vue'
import LeaveEncashmentPayModal from '../modals/LeaveEncashmentPayModal.vue'
import LeaveEncashmentDetailModal from '../modals/LeaveEncashmentDetailModal.vue'
import { fetchEncashmentList, fetchEncashmentStats, decideEncashment } from '@/composables/useLeaves'
import { useToast } from 'vue-toastification'

const toast = useToast()
const rows = ref([])
const loading = ref(false)
const segment = ref('PENDING')
const query = ref('')
const busyId = ref(null)
const odoMode = ref('pending')
const rejectModal = ref({ open: false, row: null })
const payModal = ref({ open: false, row: null })
const detailModal = ref({ open: false, row: null })

const fyLabel = computed(() => {
  const d = new Date(); const y = d.getFullYear()
  const start = d.getMonth() >= 3 ? y : y - 1
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`
})

const num = (v) => Number(v) || 0
const inr = (n) => num(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })
const initials = (name) => {
  if (!name) return '?'
  const p = String(name).trim().split(/\s+/).filter(Boolean)
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase()
}
const relTime = (v) => {
  if (!v) return ''
  const m = (Date.now() - new Date(v).getTime()) / 60000
  if (m < 1) return 'just now'
  if (m < 60) return `${Math.floor(m)}m ago`
  if (m < 1440) return `${Math.floor(m / 60)}h ago`
  return `${Math.floor(m / 1440)}d ago`
}
const stampText = (s) => ({ PENDING_MANAGER: 'AWAITING MGR', PENDING: 'PENDING HR', APPROVED: 'SANCTIONED', PAID: 'PAID', REJECTED: 'REJECTED', CANCELLED: 'VOID' }[s] || s)

// ── money aggregates (client-side from the full list) ──
const money = computed(() => {
  const g = { pendingAmt: 0, approvedAmt: 0, paidAmt: 0, rejectedAmt: 0, totalAmt: 0,
    pendingCount: 0, approvedCount: 0, paidCount: 0, rejectedCount: 0, totalDays: 0 }
  for (const r of rows.value) {
    const a = num(r.amount)
    g.totalDays += num(r.days_requested)
    if (r.status === 'PENDING') { g.pendingAmt += a; g.pendingCount++; g.totalAmt += a }
    else if (r.status === 'APPROVED') { g.approvedAmt += a; g.approvedCount++; g.totalAmt += a }
    else if (r.status === 'PAID') { g.paidAmt += a; g.paidCount++; g.totalAmt += a }
    else if (r.status === 'REJECTED') { g.rejectedAmt += a; g.rejectedCount++; g.totalAmt += a }
  }
  return g
})

const odoValue = computed(() => odoMode.value === 'pending' ? money.value.pendingAmt : money.value.paidAmt)
const odometerCells = computed(() => {
  const s = inr(odoValue.value)   // grouped, no decimals
  return s.split('').map((char) => {
    const isDigit = char >= '0' && char <= '9'
    return { char, isDigit, digit: isDigit ? Number(char) : 0 }
  })
})

const gauges = computed(() => {
  const m = money.value
  return [
    { key: 'pend', icon: Inbox, label: 'Awaiting sanction', value: m.pendingCount, tone: 'amber' },
    { key: 'san', icon: CheckCircle2, label: 'Sanctioned', value: m.approvedCount, tone: 'gold' },
    { key: 'days', icon: Layers, label: 'Days encashed', value: money.value.totalDays % 1 === 0 ? money.value.totalDays : money.value.totalDays.toFixed(1), tone: 'gold' },
    { key: 'paid', icon: Wallet, label: 'Disbursed · FY', value: m.paidCount, tone: 'gold' },
  ]
})

const barPct = (v) => {
  const max = Math.max(money.value.approvedAmt, money.value.paidAmt, money.value.pendingAmt, 1)
  return Math.round((num(v) / max) * 100)
}
const splitPct = (k) => {
  const t = money.value.totalAmt || 1
  const map = { pend: money.value.pendingAmt, san: money.value.approvedAmt, paid: money.value.paidAmt, rej: money.value.rejectedAmt }
  return (num(map[k]) / t) * 100
}

// ── segments / filtering ──
const SEGMENTS = [
  { key: 'all', label: 'All', tone: 'gold' },
  { key: 'PENDING_MANAGER', label: 'Mgr review', tone: 'amber' },
  { key: 'PENDING', label: 'HR review', tone: 'amber' },
  { key: 'APPROVED', label: 'Sanctioned', tone: 'gold' },
  { key: 'PAID', label: 'Paid', tone: 'gold' },
  { key: 'REJECTED', label: 'Rejected', tone: 'ember' },
]
const matchSeg = (r, key) => key === 'all' ? r.status !== 'CANCELLED' : r.status === key
const matchQuery = (r) => {
  const q = query.value.trim().toLowerCase()
  if (!q) return true
  return [r.employee_name, r.reference_no, r.department_name, r.employee_code]
    .filter(Boolean).some(v => String(v).toLowerCase().includes(q))
}
const segCount = (key) => rows.value.filter(r => matchSeg(r, key) && matchQuery(r)).length
const filtered = computed(() => rows.value.filter(r => matchSeg(r, segment.value) && matchQuery(r)))

// ── decorative coin particles ──
const coinStyle = (n) => ({
  left: `${(n * 53) % 96}%`, top: `${(n * 37) % 80}%`,
  animationDuration: `${5 + (n % 4)}s`, animationDelay: `-${n * 0.7}s`,
  width: `${5 + (n % 3) * 2}px`, height: `${5 + (n % 3) * 2}px`,
})

// ── data ──
const reload = async () => {
  loading.value = true
  try {
    // Fetch all statuses once → client-side segmenting + money aggregates.
    const list = await fetchEncashmentList({ limit: 200 })
    rows.value = list.items || []
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load encashments')
    rows.value = []
  } finally { loading.value = false }
}

const approve = async (r) => {
  busyId.value = r.id
  try {
    await decideEncashment(r.id, { decision: 'APPROVED', notes: null })
    toast.success(`Sanctioned · ${r.reference_no}`)
    await reload()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Sanction failed') }
  finally { busyId.value = null }
}
const askReject = (r) => { rejectModal.value = { open: true, row: r } }
const confirmReject = async (notes) => {
  const r = rejectModal.value.row
  rejectModal.value.open = false
  if (!r) return
  busyId.value = r.id
  try {
    await decideEncashment(r.id, { decision: 'REJECTED', notes })
    toast.success(`Rejected · ${r.reference_no}`)
    await reload()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Reject failed') }
  finally { busyId.value = null }
}
const openPay = (r) => { payModal.value = { open: true, row: r } }
const onPaid = () => { payModal.value.open = false; reload() }

// ── detail modal (click a slip) + act from within it ──
const openDetail = (r) => { detailModal.value = { open: true, row: r } }
const onDetailSanction = async (r) => { detailModal.value.open = false; await approve(r) }
const onDetailReject = (r) => { detailModal.value.open = false; askReject(r) }
const onDetailDisburse = (r) => { detailModal.value.open = false; openPay(r) }

onMounted(reload)
</script>

<style scoped>
@import '@/styles/leave-theme.css';

.treasury { display: flex; flex-direction: column; gap: 16px; }

/* ════════════════════════════════════════════════════════════════════════
   HERO — Settlement Desk
   ════════════════════════════════════════════════════════════════════════ */
.ty-desk {
  position: relative; overflow: hidden; isolation: isolate;
  display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr); gap: 28px; align-items: center;
  padding: 28px 30px; border-radius: 24px; min-height: 300px;
  background:
    radial-gradient(60% 100% at 100% 50%, rgba(251, 191, 36, 0.16), transparent 60%),
    radial-gradient(50% 80% at 0% 0%, rgba(217, 119, 6, 0.12), transparent 55%),
    linear-gradient(160deg, #0a0703, #130d05 60%, #160f06);
  border: 1px solid var(--leave-border);
}
[data-theme="light"] .ty-desk {
  background:
    radial-gradient(60% 100% at 100% 50%, rgba(251, 191, 36, 0.22), transparent 60%),
    radial-gradient(50% 80% at 0% 0%, rgba(217, 119, 6, 0.1), transparent 55%),
    linear-gradient(160deg, #fffdf5, #fff5e2);
  border-color: rgba(180, 83, 9, 0.2);
}
@media (max-width: 940px) { .ty-desk { grid-template-columns: 1fr; } }

.ty-grid { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(var(--leave-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--leave-grid-line) 1px, transparent 1px);
  background-size: 32px 32px; mask-image: radial-gradient(120% 120% at 100% 50%, #000 35%, transparent 90%);
  -webkit-mask-image: radial-gradient(120% 120% at 100% 50%, #000 35%, transparent 90%); }
.ty-coins { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
.ty-coins i { position: absolute; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fde047, #d97706 70%); box-shadow: 0 0 8px rgba(251,191,36,0.5); opacity: 0; animation: ty-coin-float ease-in-out infinite; }
@keyframes ty-coin-float { 0%,100% { transform: translateY(0) rotate(0); opacity: 0; } 30% { opacity: 0.5; } 50% { transform: translateY(-14px) rotate(180deg); opacity: 0.8; } 70% { opacity: 0.4; } }
.ty-edge { position: absolute; width: 20px; height: 20px; z-index: 1; pointer-events: none; opacity: 0.55; }
.ty-edge::before, .ty-edge::after { content: ''; position: absolute; background: var(--leave-brand); }
.ty-edge::before { width: 100%; height: 1.5px; } .ty-edge::after { width: 1.5px; height: 100%; }
.ty-edge.tl { top: 12px; left: 12px; } .ty-edge.tl::before,.ty-edge.tl::after { top: 0; left: 0; }
.ty-edge.tr { top: 12px; right: 12px; } .ty-edge.tr::before { top: 0; right: 0; } .ty-edge.tr::after { top: 0; right: 0; }
.ty-edge.bl { bottom: 12px; left: 12px; } .ty-edge.bl::before { bottom: 0; left: 0; } .ty-edge.bl::after { bottom: 0; left: 0; }
.ty-edge.br { bottom: 12px; right: 12px; } .ty-edge.br::before { bottom: 0; right: 0; } .ty-edge.br::after { bottom: 0; right: 0; }

.ty-copy { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.ty-eye { display: inline-flex; align-items: center; gap: 8px; width: max-content; max-width: 100%; padding: 6px 12px; border-radius: 999px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.13em; color: var(--leave-text-secondary);
  background: rgba(251, 191, 36, 0.09); border: 1px solid rgba(251, 191, 36, 0.3); }
[data-theme="light"] .ty-eye { background: rgba(251,191,36,0.16); border-color: rgba(180,83,9,0.26); }
.ty-eye-led { width: 7px; height: 7px; border-radius: 50%; background: var(--leave-approved); box-shadow: 0 0 10px var(--leave-approved); animation: leave-eyebrow-pulse 1.7s ease-in-out infinite; }
.ty-eye-sep { color: var(--leave-text-muted); opacity: 0.5; }
.ty-eye-fy { color: var(--leave-brand); }

.ty-title { margin: 0; font-size: clamp(26px, 3.1vw, 38px); font-weight: 800; letter-spacing: -0.028em; line-height: 1.06; color: #fff3d6; text-wrap: balance; }
[data-theme="light"] .ty-title { color: #2a1100; }
.ty-title-l2 { display: block; }
.ty-title em { font-style: italic; background: linear-gradient(135deg, #fde047, #f59e0b 55%, #ea580c); background-clip: text; -webkit-background-clip: text; color: transparent; }
.ty-sub { margin: 0; max-width: 52ch; font-size: 13px; line-height: 1.6; color: var(--w-gold-100); opacity: 0.86; }
[data-theme="light"] .ty-sub { color: #6b3d12; opacity: 1; }
.ty-sub b { color: var(--leave-brand); font-weight: 800; }
[data-theme="light"] .ty-sub b { color: var(--w-gold-600); }

.ty-readout { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 9px; margin-top: 4px; }
@media (max-width: 560px) { .ty-readout { grid-template-columns: repeat(2, 1fr); } }
.ty-gauge { display: flex; align-items: center; gap: 9px; padding: 9px 11px; border-radius: 13px;
  background: rgba(28, 18, 8, 0.66); border: 1px solid var(--leave-border); transition: border-color .22s, box-shadow .22s; }
[data-theme="light"] .ty-gauge { background: rgba(255, 248, 233, 0.82); }
.ty-gauge:hover { border-color: var(--leave-brand); box-shadow: 0 8px 22px -12px rgba(251,191,36,0.45); }
.ty-gauge-ic { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0; background: rgba(251,191,36,0.13); color: var(--leave-brand); }
.ty-gauge[data-tone="amber"] .ty-gauge-ic { background: rgba(245,158,11,0.16); color: var(--w-gold-400); }
.ty-gauge-val { display: block; font-size: 18px; font-weight: 800; line-height: 1; letter-spacing: -0.02em; color: var(--hr-text); font-variant-numeric: tabular-nums; }
.ty-gauge-lbl { display: block; margin-top: 3px; font-size: 8px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--hr-text-muted); white-space: nowrap; }

/* ── vault / odometer ── */
.ty-vault { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 12px;
  padding: 16px 18px; border-radius: 18px; background: rgba(16, 11, 5, 0.6); border: 1px solid var(--leave-border); }
[data-theme="light"] .ty-vault { background: rgba(255, 250, 235, 0.66); }
.ty-odo-toggle { display: inline-flex; gap: 3px; padding: 3px; border-radius: 9px; background: rgba(0,0,0,0.25); border: 1px solid var(--leave-border); align-self: flex-start; }
[data-theme="light"] .ty-odo-toggle { background: rgba(120,53,15,0.06); }
.ty-odo-toggle button { height: 24px; padding: 0 10px; border: 0; border-radius: 7px; background: transparent; color: var(--hr-text-muted); font-size: 10px; font-weight: 800; letter-spacing: 0.04em; cursor: pointer; transition: background .2s, color .2s; }
.ty-odo-toggle button.on { background: color-mix(in srgb, var(--leave-brand) 18%, transparent); color: var(--leave-brand); }

.ty-odo { display: flex; align-items: center; gap: 6px; padding: 6px 4px; }
.ty-odo-cur { font-size: 30px; font-weight: 800; color: var(--leave-brand); }
.ty-odo-reel { display: flex; align-items: center; font-size: 46px; font-weight: 900; letter-spacing: -0.02em; font-family: 'SF Mono', ui-monospace, monospace; }
.ty-odo-sep { color: var(--hr-text-muted); padding: 0 1px; }
.ty-odo-digit { position: relative; display: inline-block; width: 0.62em; height: 1em; overflow: hidden; }
.ty-odo-strip { position: absolute; top: 0; left: 0; display: flex; flex-direction: column; will-change: transform;
  transition: transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
  background: linear-gradient(180deg, #fff3c4, #f59e0b 55%, #ea580c); background-clip: text; -webkit-background-clip: text; color: transparent; }
.ty-odo-strip span { height: 1em; display: flex; align-items: center; justify-content: center; }
.ty-odo[data-mode="paid"] .ty-odo-strip { background: linear-gradient(180deg, #fde047, #d97706 60%, #b45309); background-clip: text; -webkit-background-clip: text; }
.ty-odo-cap { font-size: 9px; font-weight: 700; letter-spacing: 0.06em; color: var(--hr-text-muted); }

.ty-meters { display: flex; flex-direction: column; gap: 9px; margin-top: 4px; }
.ty-meter-head { display: flex; justify-content: space-between; font-size: 9px; font-weight: 800; letter-spacing: 0.1em; color: var(--hr-text-muted); margin-bottom: 4px; }
.ty-meter-bar { height: 7px; border-radius: 7px; background: rgba(255,255,255,0.06); overflow: hidden; }
[data-theme="light"] .ty-meter-bar { background: rgba(120,53,15,0.1); }
.ty-meter-bar span { display: block; height: 100%; border-radius: 7px; transition: width 1s cubic-bezier(0.16,1,0.3,1); }
.ty-meter-bar .san { background: linear-gradient(90deg, #f59e0b, #fbbf24); box-shadow: 0 0 10px rgba(251,191,36,0.5); }
.ty-meter-bar .paid { background: linear-gradient(90deg, #d97706, #fde047); box-shadow: 0 0 10px rgba(253,224,71,0.5); }

/* ════════════════════════════════════════════════════════════════════════
   MONEY-SPLIT BAR
   ════════════════════════════════════════════════════════════════════════ */
.ty-split { padding: 13px 16px; border-radius: 16px; background: var(--leave-surface); border: 1px solid var(--leave-border); backdrop-filter: blur(14px); }
.ty-split-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.ty-split-head > .leave-mono:first-child { font-size: 11px; font-weight: 800; letter-spacing: 0.04em; color: var(--hr-text); }
.ty-split-legend { display: inline-flex; align-items: center; gap: 8px; font-size: 9px; color: var(--hr-text-muted); }
.ty-split-legend i { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: -4px; }
.ty-split-legend .d-pend { background: #facc15; } .ty-split-legend .d-san { background: #f59e0b; }
.ty-split-legend .d-paid { background: #d97706; } .ty-split-legend .d-rej { background: var(--w-ember-500); }
.ty-split-bar { position: relative; display: flex; height: 16px; border-radius: 8px; overflow: hidden; background: rgba(255,255,255,0.05); }
[data-theme="light"] .ty-split-bar { background: rgba(120,53,15,0.08); }
.ty-split-bar .seg { height: 100%; transition: width 1s cubic-bezier(0.16,1,0.3,1); }
.ty-split-bar .seg.pend { background: repeating-linear-gradient(45deg, #facc15 0 6px, #eab308 6px 12px); }
.ty-split-bar .seg.san { background: #f59e0b; }
.ty-split-bar .seg.paid { background: linear-gradient(90deg, #d97706, #fde047); }
.ty-split-bar .seg.rej { background: var(--w-ember-500); }
.ty-split-empty { position: absolute; inset: 0; display: grid; place-items: center; font-size: 9px; letter-spacing: 0.16em; color: var(--hr-text-muted); }

/* ════════════════════════════════════════════════════════════════════════
   TOOLBAR
   ════════════════════════════════════════════════════════════════════════ */
.ty-bar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.ty-segs { display: inline-flex; gap: 4px; padding: 4px; border-radius: 12px; background: var(--leave-surface); border: 1px solid var(--leave-border); flex-wrap: wrap; }
.ty-seg { --st: var(--leave-brand); display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px; border-radius: 9px; font-size: 11.5px; font-weight: 700; cursor: pointer; white-space: nowrap; background: transparent; border: 1px solid transparent; color: var(--hr-text-secondary); transition: background .2s, color .2s, border-color .2s; }
.ty-seg[data-tone="amber"] { --st: var(--w-gold-400); } .ty-seg[data-tone="ember"] { --st: var(--w-ember-500); }
.ty-seg:hover { color: var(--hr-text); }
.ty-seg.on { background: color-mix(in srgb, var(--st) 16%, transparent); border-color: color-mix(in srgb, var(--st) 45%, transparent); color: var(--hr-text); box-shadow: 0 4px 14px -8px var(--st); }
.ty-seg-n { display: inline-grid; place-items: center; min-width: 18px; height: 16px; padding: 0 5px; border-radius: 999px; font-size: 9.5px; font-weight: 800; background: rgba(255,255,255,0.08); color: var(--hr-text-muted); }
.ty-seg.on .ty-seg-n { background: color-mix(in srgb, var(--st) 28%, transparent); color: var(--hr-text); }
.ty-bar-right { display: inline-flex; align-items: center; gap: 8px; }
.ty-search { display: inline-flex; align-items: center; gap: 7px; height: 32px; padding: 0 10px; border-radius: 9px; background: var(--leave-surface); border: 1px solid var(--leave-border); color: var(--hr-text-muted); transition: border-color .2s; }
.ty-search:focus-within { border-color: var(--leave-brand); }
.ty-search input { border: 0; background: transparent; outline: none; color: var(--hr-text); font: inherit; font-size: 12px; width: 150px; min-width: 0; }
.ty-search input::placeholder { color: var(--hr-text-muted); }
.ty-search-x { display: grid; place-items: center; width: 16px; height: 16px; border: 0; border-radius: 50%; background: rgba(255,255,255,0.08); color: var(--hr-text-muted); cursor: pointer; }

/* ════════════════════════════════════════════════════════════════════════
   SETTLEMENT SLIPS
   ════════════════════════════════════════════════════════════════════════ */
.ty-grid-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 12px; perspective: 1200px; }
.ty-slip-skel { height: 176px; border-radius: 16px; }

.ty-slip {
  position: relative; overflow: hidden; isolation: isolate; display: flex; border-radius: 16px; cursor: pointer;
  background: var(--leave-surface); border: 1px solid var(--leave-border); backdrop-filter: blur(14px);
  transform-style: preserve-3d; transition: border-color .24s var(--leave-ease), box-shadow .24s var(--leave-ease);
  outline: none;
}
.ty-slip:focus-visible { border-color: var(--leave-brand); box-shadow: 0 0 0 3px color-mix(in srgb, var(--leave-brand) 30%, transparent); }
.ty-slip-cue {
  position: absolute; top: 10px; right: 12px; z-index: 2; pointer-events: none;
  display: inline-flex; align-items: center; gap: 3px; padding: 2px 7px; border-radius: 999px;
  font-size: 8px; font-weight: 800; letter-spacing: 0.12em;
  background: color-mix(in srgb, var(--leave-brand) 16%, transparent); color: var(--leave-brand);
  border: 1px solid color-mix(in srgb, var(--leave-brand) 32%, transparent);
  opacity: 0; transform: translateY(-3px); transition: opacity .2s, transform .2s;
}
.ty-slip:hover .ty-slip-cue { opacity: 1; transform: translateY(0); }
[data-theme="light"] .ty-slip { background: rgba(255, 250, 240, 0.92); border-color: rgba(180, 83, 9, 0.18); }
.ty-slip:hover { border-color: color-mix(in srgb, var(--leave-brand) 50%, transparent); box-shadow: 0 24px 56px -30px rgba(0,0,0,0.8), 0 0 26px -12px rgba(251,191,36,0.4); }
.ty-slip[data-s="PAID"] { border-color: color-mix(in srgb, var(--w-gold-500) 45%, transparent); }
.ty-slip[data-s="REJECTED"] { opacity: 0.82; }
.ty-slip-guilloche { position: absolute; inset: 0; z-index: -1; pointer-events: none; opacity: 0;
  background: radial-gradient(circle at 80% 20%, transparent 40px, rgba(251,191,36,0.06) 41px, transparent 42px),
    radial-gradient(circle at 30% 80%, transparent 30px, rgba(234,88,12,0.05) 31px, transparent 32px);
  transition: opacity .3s; }
.ty-slip:hover .ty-slip-guilloche { opacity: 1; }

/* perforated stub */
.ty-stub {
  position: relative; flex-shrink: 0; width: 40px; display: flex; flex-direction: column; align-items: center; justify-content: space-between;
  padding: 14px 0; background: rgba(251, 191, 36, 0.06);
  border-right: 2px dashed color-mix(in srgb, var(--leave-brand) 30%, transparent);
}
[data-theme="light"] .ty-stub { background: rgba(251, 191, 36, 0.1); }
.ty-stub-ref, .ty-stub-fy { writing-mode: vertical-rl; transform: rotate(180deg); font-size: 8.5px; font-weight: 700; letter-spacing: 0.1em; color: var(--hr-text-muted); }
.ty-stamp { writing-mode: vertical-rl; transform: rotate(180deg); font-size: 9px; font-weight: 900; letter-spacing: 0.14em; padding: 4px 2px; border-radius: 4px; }
.ty-stamp[data-s="PENDING_MANAGER"] { color: var(--w-ember-400); }
.ty-stamp[data-s="PENDING"] { color: var(--w-gold-400); }
.ty-stamp[data-s="APPROVED"] { color: var(--leave-brand); }
.ty-stamp[data-s="PAID"] { color: var(--w-gold-300); }
.ty-stamp[data-s="REJECTED"] { color: var(--leave-rejected); }
.ty-stamp[data-s="CANCELLED"] { color: var(--leave-cancelled); }

.ty-slip-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 9px; padding: 13px 15px; }
.ty-slip-head { display: flex; align-items: center; gap: 9px; }
.ty-ava { display: inline-grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0; background: linear-gradient(135deg, var(--leave-brand), var(--w-gold-500)); color: #2a1100; font-weight: 800; font-size: 11px; }
.ty-who { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.ty-name { font-size: 13px; font-weight: 800; color: var(--hr-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ty-meta { font-size: 9.5px; color: var(--hr-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ty-applied { font-size: 9px; color: var(--hr-text-muted); flex-shrink: 0; }

.ty-figure { display: flex; align-items: baseline; gap: 5px; flex-wrap: wrap; }
.ty-fig-cur { font-size: 16px; font-weight: 800; color: var(--leave-approved); }
.ty-fig-amt { font-size: 28px; font-weight: 900; letter-spacing: -0.03em; line-height: 1; font-variant-numeric: tabular-nums;
  background: linear-gradient(135deg, #fde047, #f59e0b 70%); background-clip: text; -webkit-background-clip: text; color: transparent; }
.ty-fig-eqn { font-size: 10px; color: var(--hr-text-muted); margin-left: 4px; }

.ty-note { margin: 0; padding: 7px 10px; border-radius: 9px; background: rgba(251,191,36,0.06); border-left: 2px solid color-mix(in srgb, var(--leave-brand) 35%, transparent); font-size: 11.5px; line-height: 1.45; font-style: italic; color: var(--hr-text-secondary); }
.ty-decision { display: flex; align-items: center; gap: 5px; font-size: 10px; color: var(--hr-text-muted); }
.ty-payref { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; color: var(--w-gold-300); padding: 3px 8px; border-radius: 6px; background: rgba(251,191,36,0.1); align-self: flex-start; }
[data-theme="light"] .ty-payref { color: var(--w-gold-600); }

.ty-slip-foot { margin-top: auto; display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
.ty-act { display: flex; align-items: center; gap: 6px; }
.ty-await { font-size: 9.5px; color: var(--hr-text-muted); margin-right: auto; }
.ty-settled { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 800; letter-spacing: 0.04em; color: var(--leave-approved); }
.ty-settled.muted { color: var(--hr-text-muted); }

/* empty */
.ty-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 44px 24px; border-radius: 20px; border: 1px dashed var(--leave-border); background: radial-gradient(80% 60% at 50% 0%, rgba(251,191,36,0.1), transparent 60%); }
.ty-empty-ic { display: grid; place-items: center; width: 68px; height: 68px; border-radius: 20px; background: rgba(251,191,36,0.12); border: 1px solid rgba(251,191,36,0.3); color: var(--leave-brand); animation: leave-glow-breathe 3s ease-in-out infinite; }
.ty-empty h4 { margin: 6px 0 0; font-size: 15px; font-weight: 800; color: var(--hr-text); }
.ty-empty p { margin: 0; max-width: 46ch; font-size: 12.5px; line-height: 1.6; color: var(--hr-text-muted); }

.spin { animation: ty-spin 0.9s linear infinite; }
@keyframes ty-spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .ty-coins i, .ty-eye-led, .ty-empty-ic { animation: none !important; }
  .ty-odo-strip { transition: none !important; }
}
</style>
