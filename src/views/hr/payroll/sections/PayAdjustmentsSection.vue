<template>
  <div class="mint-line">
    <!-- ░░░░░░░░░░ MASTHEAD ░░░░░░░░░░ -->
    <Motion as="header" class="masthead"
      :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
      <div class="mh-left">
        <h2 class="line-title pay-foil-text">{{ lineTitle }}</h2>
        <span class="scanbar" aria-hidden="true" />
        <p class="mh-cap">{{ total }} {{ kindMeta.label.toLowerCase() }}{{ total === 1 ? '' : 's' }} on the line</p>
      </div>
      <div class="dest-chip">
        <span class="dock-light" :class="{ live: approvedCount > 0 }" aria-hidden="true" />
        <div class="dest-txt">
          <span class="dest-eyebrow">Next pay run</span>
          <span class="dest-run">{{ runLabel }}</span>
        </div>
      </div>
    </Motion>

    <!-- ░░░░░░░░░░ COMMAND BAR ░░░░░░░░░░ -->
    <Motion as="div" class="cmd"
      :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.12, ease: [0.16, 1, 0.3, 1] }">
      <div class="switches" role="tablist">
        <Motion class="switch-hl" as="span" aria-hidden="true"
          :animate="{ x: swHlX, width: swHlW }"
          :transition="{ type: 'spring', stiffness: 360, damping: 30 }" />
        <button v-for="(s, i) in statusOpts" :key="s.v" ref="swBtns" class="switch"
          :class="{ on: status === s.v }" @click="setStatus(s.v)">{{ s.label }}</button>
      </div>
      <div class="cmd-right">
        <div class="search" :class="{ on: searchFocused }">
          <Search :size="15" />
          <input v-model="q" placeholder="Find employee…"
            @focus="searchFocused = true" @blur="searchFocused = false"
            @keyup.enter="() => { page = 1; reload() }" />
        </div>
        <Motion as="button" class="stage-cta" @click="modalOpen = true"
          :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }">
          <span class="cta-sweep" aria-hidden="true" />
          <Plus :size="15" /> Stage {{ kindMeta.label.toLowerCase() }}
        </Motion>
      </div>
    </Motion>

    <!-- ░░░░░░░░░░ BELT + DOCK ░░░░░░░░░░ -->
    <div class="belt-area">
      <div class="belt-col">
        <!-- belt header rail -->
        <div class="belt-head" :class="{ moving: approvedCount > 0 }">
          <span class="dashes" aria-hidden="true" />
          <ul class="legend">
            <li class="lg-stub">Ticket</li>
            <li class="lg-body">Employee &amp; type</li>
            <li class="lg-amt">Amount</li>
            <li class="lg-status">Status</li>
            <li class="lg-act">·</li>
          </ul>
        </div>

        <!-- loading -->
        <ul v-if="loading" class="tickets">
          <li v-for="i in 6" :key="i" class="ticket skel">
            <span class="pay-skel sk-stub" />
            <span class="pay-skel sk-body" />
            <span class="pay-skel sk-amt" />
            <span class="pay-skel sk-status" />
          </li>
        </ul>

        <!-- empty -->
        <PayEmptyState v-else-if="!items.length" :icon="kindIcon"
          :title="status || q ? 'Nothing on the line for this filter' : `No ${kindMeta.label.toLowerCase()}s on the line yet`"
          :sub="status || q ? 'Clear the filter or search to see the full belt.' : `Stage a ${kindMeta.label.toLowerCase()} to queue it for the next pay run.`">
          <button class="stage-cta plain" @click="modalOpen = true"><Plus :size="15" /> Stage {{ kindMeta.label.toLowerCase() }}</button>
        </PayEmptyState>

        <!-- the line -->
        <transition :name="`belt-${pgDir}`" mode="out-in">
          <ul v-if="items.length" :key="page" class="tickets">
            <Motion v-for="(a, i) in items" :key="a.id" as="li" class="trow"
              :initial="{ opacity: 0, x: -24 }" :animate="{ opacity: 1, x: 0 }"
              :transition="{ delay: Math.min(i * 0.045, 0.4), duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
              <article class="ticket" :class="[statusClass(a.status), { open: isOpen(a.id), sealing: sealId === a.id }]"
                @click="toggle(a.id)">
                <span class="clamp" aria-hidden="true" />
                <span class="flow-streak" v-if="sealId === a.id" aria-hidden="true" />

                <span class="stub"><component :is="subIcon(a.sub_type)" :size="16" /></span>

                <div class="tk-body">
                  <div class="tk-name">{{ a.employee_name || a.employee_code }}
                    <span class="tk-code">{{ a.employee_code }}</span></div>
                  <div class="tk-sub">
                    <span class="tk-type">{{ a.sub_type || kindMeta.label }}</span>
                    <span class="tk-dot">·</span>
                    <span class="tk-period">{{ periodLabel(a) }}</span>
                  </div>
                </div>

                <div class="tk-amt">
                  <span class="amt-chev" :class="a.is_deduction ? 'dn' : 'up'">{{ a.is_deduction ? '▼' : '▲' }}</span>
                  <PayMoneyValue :tone="a.is_deduction ? 'deduction' : 'net'" :value="a.amount" />
                  <span v-if="a.is_taxable" class="tax-pill">TAX</span>
                </div>

                <div class="tk-status">
                  <span class="latch" :class="statusClass(a.status)">
                    <span class="latch-dot" />
                    <span class="latch-lbl">{{ adjStatusMeta(a.status).label }}</span>
                    <Lock v-if="a.status === 'PAID'" :size="11" class="latch-lock" />
                  </span>
                  <span v-if="sealId === a.id" class="seal" aria-hidden="true">SEALED</span>
                </div>

                <div class="tk-actions" @click.stop>
                  <Motion v-if="a.status === 'DRAFT'" as="button" class="act ok" title="Approve · convey to pay run"
                    :whileHover="{ scale: 1.14 }" :whileTap="{ scale: 0.9 }" @click="approve(a)"><Check :size="14" /></Motion>
                  <Motion v-if="a.status === 'DRAFT' || a.status === 'APPROVED'" as="button" class="act warn" title="Pull off the pay run"
                    :whileHover="{ scale: 1.14 }" :whileTap="{ scale: 0.9 }" @click="askCancel(a)"><Scissors :size="14" /></Motion>
                  <Motion v-if="a.status === 'DRAFT'" as="button" class="act danger" title="Eject ticket"
                    :whileHover="{ scale: 1.14 }" :whileTap="{ scale: 0.9 }" @click="askDelete(a)"><Trash2 :size="14" /></Motion>
                  <span v-if="a.status === 'PAID' || a.status === 'CANCELLED'" class="act-lock"><Lock :size="13" /></span>
                </div>

                <!-- expand-in-place console -->
                <div class="console" :class="{ show: isOpen(a.id) }">
                  <div class="console-inner">
                    <div class="cl-facts">
                      <div class="cl-period">
                        <span class="cl-lbl">Covers</span>
                        <div class="cl-bar"><span class="cl-bar-fill" /></div>
                        <span class="cl-range">{{ coversLabel(a) }}</span>
                      </div>
                      <div class="cl-reason" v-if="a.reason"><FileText :size="12" /> {{ a.reason }}</div>
                      <div class="cl-tags">
                        <span class="cl-tag">{{ a.is_deduction ? 'Deduction' : 'Earning' }}</span>
                        <span class="cl-tag" :class="{ muted: !a.is_taxable }">{{ a.is_taxable ? 'Taxable' : 'Non-taxable' }}</span>
                        <span v-if="a.payroll_ref" class="cl-tag ref">ref {{ a.payroll_ref }}</span>
                      </div>
                    </div>
                    <div class="cl-strip">
                      <span class="cl-strip-lbl">Posting</span>
                      <div class="flight">
                        <template v-for="(n, ni) in flightNodes(a)" :key="n.k">
                          <span class="fl-node" :class="{ done: ni < flightIdx(a), now: ni === flightIdx(a), dead: a.status === 'CANCELLED' }">
                            <span class="fl-dot" /><span class="fl-name">{{ n.label }}</span>
                          </span>
                          <span v-if="ni < flightNodes(a).length - 1" class="fl-link" :class="{ done: ni < flightIdx(a) }" />
                        </template>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </Motion>
          </ul>
        </transition>

        <!-- conveyor pagination console -->
        <Motion v-if="!loading && total > 0" as="nav" class="conveyor-pg"
          :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }">
          <span class="pg-readout">TICKETS <strong>{{ rangeLabel }}</strong> / {{ total }}</span>
          <div class="pg-ctrls">
            <Motion as="button" class="jog" :disabled="page <= 1" @click="go(page - 1)"
              :whileTap="{ scale: 0.85, rotate: -8 }"><ChevronLeft :size="16" /></Motion>
            <div class="slats">
              <button v-for="p in windowPages" :key="p" class="slat" :class="{ on: p === page }"
                @click="go(p)"><span class="slat-fill" /><span class="slat-num">{{ p }}</span></button>
            </div>
            <Motion as="button" class="jog" :disabled="page >= totalPages" @click="go(page + 1)"
              :whileTap="{ scale: 0.85, rotate: 8 }"><ChevronRight :size="16" /></Motion>
          </div>
          <div class="pg-size">
            <span>per page</span>
            <button v-for="n in sizes" :key="n" class="sz" :class="{ on: n === limit }"
              @click="setSize(n)">{{ n }}</button>
          </div>
        </Motion>
      </div>

      <!-- DOCKING BAY -->
      <aside class="dock" :class="{ live: approvedCount > 0 }">
        <span class="dock-glow" :key="bayKey" aria-hidden="true" />
        <div class="dock-head">
          <span class="dock-eyebrow">Pay run</span>
          <span class="dock-run">{{ runLabel }}</span>
        </div>
        <div class="ingots" :key="`ing-${bayKey}`">
          <span v-for="n in ingotCount" :key="n" class="ingot" :style="{ '--d': (n * 0.06) + 's' }" />
          <span v-if="!ingotCount" class="ingot-empty">— empty —</span>
        </div>
        <div class="dock-readout">
          <div class="dr-row"><span>Queued</span><b>{{ approvedCount }}</b></div>
          <div class="dr-row"><span>Amount</span><b class="dr-sum">{{ inrShort(approvedSum) }}</b></div>
        </div>
      </aside>
    </div>

    <!-- ░░░░░░░░░░ MODALS ░░░░░░░░░░ -->
    <PayAdjustmentModal :open="modalOpen" :kind="kind" @close="modalOpen = false" @saved="onSaved" />
    <PayAdjustmentDeleteModal :open="del.open" :item="del.item" :kind-label="kindMeta.label" :busy="del.busy"
      @close="del.open = false" @confirm="doDelete" />
    <PayAdjustmentCancelModal :open="cnl.open" :item="cnl.item" :kind-label="kindMeta.label" :run-label="runLabel" :busy="cnl.busy"
      @close="cnl.open = false" @confirm="doCancel" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { Motion } from 'motion-v'
import {
  Plus, Search, Check, Scissors, Trash2, Lock, ChevronLeft, ChevronRight,
  FileText, TrendingUp, ArrowUpCircle, CalendarClock, Scale, Coins, BadgePercent, Gift, Zap,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import PayEmptyState from '../components/PayEmptyState.vue'
import PayMoneyValue from '../components/PayMoneyValue.vue'
import PayAdjustmentModal from '../modals/PayAdjustmentModal.vue'
import PayAdjustmentDeleteModal from '../modals/PayAdjustmentDeleteModal.vue'
import PayAdjustmentCancelModal from '../modals/PayAdjustmentCancelModal.vue'
import { monthLabel, inrShort } from '@/composables/usePayroll'
import {
  ADJUSTMENT_KINDS, adjStatusMeta, fetchAdjustments,
  approveAdjustment, cancelAdjustment, deleteAdjustment,
} from '@/composables/usePayrollExtra'

const props = defineProps({ kind: { type: String, default: 'BONUS' } })
const emit = defineEmits(['refresh-stats'])
const toast = useToast()

const kindMeta = computed(() => ADJUSTMENT_KINDS[props.kind] || ADJUSTMENT_KINDS.BONUS)
const lineTitle = computed(() => `${kindMeta.value.label.toUpperCase()} LINE`)
const kindIcon = computed(() => ({ BONUS: Gift, INCENTIVE: Zap, VARIABLE_PAY: TrendingUp, ARREAR: BadgePercent, DEDUCTION: Coins }[props.kind] || Coins))

/* next pay run = current month/year (the run being prepared) */
const now = new Date()
const runLabel = `${monthLabel(now.getMonth() + 1)} ${now.getFullYear()}`

/* ── data ── */
const items = ref([]); const total = ref(0); const loading = ref(false)
const status = ref(null); const page = ref(1); const limit = ref(10); const q = ref('')
const sizes = [10, 25, 50]
const modalOpen = ref(false)
const searchFocused = ref(false)
const open = ref(new Set())
const sealId = ref(null)
const pgDir = ref('fwd')

/* docking bay aggregates (approved, across the whole kind) */
const approvedCount = ref(0); const approvedSum = ref(0); const bayKey = ref(0)
const ingotCount = computed(() => Math.min(approvedCount.value, 11))

/* ── status switch reel ── */
const statusOpts = [
  { v: null, label: 'All' },
  { v: 'DRAFT', label: 'Draft' },
  { v: 'APPROVED', label: 'Approved' },
  { v: 'PAID', label: 'Paid' },
  { v: 'CANCELLED', label: 'Cancelled' },
]
const swBtns = ref([]); const swHlX = ref(0); const swHlW = ref(0)
const measureSw = async () => {
  await nextTick()
  const idx = statusOpts.findIndex(s => s.v === status.value)
  const el = swBtns.value?.[idx]
  if (el) { swHlX.value = el.offsetLeft; swHlW.value = el.offsetWidth }
}

/* ── helpers ── */
const SUB_ICONS = {
  'Delayed Increment': TrendingUp, 'Delayed Promotion': ArrowUpCircle,
  'Attendance Correction': CalendarClock, 'Salary Revision': Scale,
}
const subIcon = (s) => SUB_ICONS[s] || kindIcon.value
const statusClass = (s) => ({ DRAFT: 'draft', APPROVED: 'approved', PAID: 'paid', CANCELLED: 'cancelled' }[s] || 'draft')
const periodLabel = (a) => a.period_month ? `${monthLabel(a.period_month)} ${a.period_year}` : 'Next run'
const fmtDate = (d) => { if (!d) return null; const dt = new Date(d); return isNaN(dt) ? d : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) }
const coversLabel = (a) => {
  const f = fmtDate(a.from_date), t = fmtDate(a.to_date)
  if (f && t) return `${f} → ${t}`
  if (f) return `from ${f}`
  return periodLabel(a)
}
const isOpen = (id) => open.value.has(id)
const toggle = (id) => { const s = new Set(open.value); s.has(id) ? s.delete(id) : s.add(id); open.value = s }

/* posting flight strip */
const flightNodes = (a) => [
  { k: 'd', label: 'Draft' }, { k: 'a', label: 'Approved' },
  { k: 'r', label: runLabel.split(' ')[0] }, { k: 'p', label: 'Paid' },
]
const flightIdx = (a) => {
  if (a.status === 'DRAFT') return 0
  if (a.status === 'APPROVED') return 1
  if (a.status === 'PAID') return 3
  return -1 // cancelled
}

/* ── pagination window ── */
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))
const windowStart = computed(() => Math.max(1, Math.min(page.value - 2, totalPages.value - 4)))
const windowPages = computed(() => {
  const end = Math.min(totalPages.value, windowStart.value + 4); const out = []
  for (let i = windowStart.value; i <= end; i++) out.push(i)
  return out
})
const rangeLabel = computed(() => {
  if (!total.value) return '0'
  const a = (page.value - 1) * limit.value + 1
  const b = Math.min(page.value * limit.value, total.value)
  return `${a}–${b}`
})

/* ── load ── */
const reload = async () => {
  loading.value = true
  try {
    const res = await fetchAdjustments({ adjustment_type: props.kind, status: status.value || undefined,
      skip: (page.value - 1) * limit.value, limit: limit.value })
    items.value = res.items || []; total.value = res.total || 0
    open.value = new Set()
  } catch { toast.error('Failed to load') }
  finally { loading.value = false }
}
const loadBay = async () => {
  try {
    const res = await fetchAdjustments({ adjustment_type: props.kind, status: 'APPROVED', limit: 200 })
    approvedCount.value = res.total || 0
    approvedSum.value = (res.items || []).reduce((s, x) => s + Number(x.amount || 0), 0)
    bayKey.value++
  } catch { /* non-fatal */ }
}

const setStatus = (s) => { status.value = s; page.value = 1; measureSw(); reload() }
const go = (p) => {
  if (p < 1 || p > totalPages.value || p === page.value) return
  pgDir.value = p > page.value ? 'fwd' : 'back'
  page.value = p; reload()
}
const setSize = (n) => { limit.value = n; page.value = 1; reload() }
const onSaved = () => { reload(); loadBay(); emit('refresh-stats') }

/* ── row actions ── */
const approve = async (a) => {
  sealId.value = a.id
  try {
    await approveAdjustment(a.id)
    toast.success(`${kindMeta.value.label} sealed · queued to pay run`)
    await Promise.all([reload(), loadBay()]); emit('refresh-stats')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed') }
  finally { setTimeout(() => { sealId.value = null }, 250) }
}

const del = ref({ open: false, item: null, busy: false })
const cnl = ref({ open: false, item: null, busy: false })
const askDelete = (a) => { del.value = { open: true, item: a, busy: false } }
const askCancel = (a) => { cnl.value = { open: true, item: a, busy: false } }

const doDelete = async ({ reason, note }) => {
  del.value.busy = true
  try {
    await deleteAdjustment(del.value.item.id, { reason, note })
    toast.success('Ticket ejected from the line')
    del.value.open = false
    await Promise.all([reload(), loadBay()]); emit('refresh-stats')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Delete failed') }
  finally { del.value.busy = false }
}
const doCancel = async ({ reason, note }) => {
  cnl.value.busy = true
  try {
    await cancelAdjustment(cnl.value.item.id, { reason, note })
    toast.success('Pulled off the pay run')
    cnl.value.open = false
    await Promise.all([reload(), loadBay()]); emit('refresh-stats')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Cancel failed') }
  finally { cnl.value.busy = false }
}

watch(() => props.kind, () => { status.value = null; page.value = 1; q.value = ''; measureSw(); reload(); loadBay() })
onMounted(() => { reload(); loadBay(); measureSw() })
</script>

<style scoped>
.mint-line { display: flex; flex-direction: column; gap: 16px; padding-top: 8px; }

/* ░░░░░░░░░░ MASTHEAD ░░░░░░░░░░ */
.masthead { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; flex-wrap: wrap; }
.mh-left { min-width: 0; }
.line-title { margin: 0; font-size: 26px; font-weight: 850; letter-spacing: 0.02em; line-height: 1.05; }
.scanbar { display: block; height: 3px; width: 92px; margin-top: 7px; border-radius: 3px;
  background: var(--pay-grad-rail); position: relative; overflow: hidden; }
.scanbar::after { content: ''; position: absolute; inset: 0; width: 40%;
  background: linear-gradient(90deg, transparent, var(--pay-mint-bright), transparent);
  animation: pay-foil-sweep 3s var(--pay-ease) infinite; }
.mh-cap { margin: 9px 0 0; font-family: var(--pay-mono); font-size: 11.5px; color: var(--pay-text-muted); }

.dest-chip { flex: none; display: inline-flex; align-items: center; gap: 11px; padding: 10px 16px 10px 13px;
  border-radius: 14px; background: var(--pay-surface); border: 1px solid var(--pay-border-soft);
  box-shadow: inset 0 0 26px rgba(251,191,36,0.05); }
.dock-light { width: 11px; height: 11px; border-radius: 50%; background: var(--pay-text-muted); flex: none; }
.dock-light.live { background: var(--pay-net); box-shadow: 0 0 0 0 var(--pay-net); animation: pay-node-halo 2s ease-in-out infinite; }
.dest-txt { display: flex; flex-direction: column; line-height: 1.15; }
.dest-eyebrow { font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--pay-text-muted); }
.dest-run { font-family: var(--pay-mono); font-size: 14px; font-weight: 800; color: var(--pay-treasury); }

/* ░░░░░░░░░░ COMMAND BAR ░░░░░░░░░░ */
.cmd { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.switches { position: relative; display: inline-flex; padding: 3px; border-radius: 12px;
  background: var(--pay-surface); border: 1px solid var(--pay-border-soft); }
.switch-hl { position: absolute; top: 3px; bottom: 3px; left: 0; border-radius: 9px;
  background: var(--pay-grad-cta); box-shadow: 0 4px 14px -6px rgba(234,88,12,0.55); z-index: 0; }
.switch { position: relative; z-index: 1; padding: 7px 14px; border: none; background: transparent; cursor: pointer;
  font-size: 12px; font-weight: 600; color: var(--pay-text-muted); transition: color 0.25s var(--pay-ease); white-space: nowrap; }
.switch.on { color: #1a1206; }
.cmd-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.search { position: relative; display: flex; align-items: center; gap: 9px; padding: 9px 13px; border-radius: 11px;
  background: var(--pay-surface); border: 1px solid var(--pay-border-soft); color: var(--pay-text-muted);
  transition: border-color 0.3s var(--pay-ease), box-shadow 0.3s var(--pay-ease); min-width: 190px; }
.search.on { border-color: var(--pay-amber); box-shadow: 0 0 0 4px rgba(245,158,11,0.12); }
.search input { background: none; border: none; outline: none; color: var(--pay-text); font-size: 13px; width: 100%; }
.stage-cta { position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px;
  border-radius: 11px; border: none; cursor: pointer; background: var(--pay-grad-cta); color: #1a1206; font-weight: 700; font-size: 13px; }
.stage-cta.plain { margin-top: 4px; }
.cta-sweep { position: absolute; top: 0; bottom: 0; width: 36%; transform: translateX(-220%);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent); }
.stage-cta:hover .cta-sweep { animation: pay-foil-sweep 0.9s var(--pay-ease); }

/* ░░░░░░░░░░ BELT AREA ░░░░░░░░░░ */
.belt-area { display: flex; align-items: flex-start; gap: 14px; }
.belt-col { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; }

/* belt header rail */
.belt-head { position: relative; overflow: hidden; border-radius: 12px; padding: 0 8px;
  border: 1px solid var(--pay-border-soft); background: var(--pay-surface); }
.belt-head .dashes { position: absolute; inset: 0; opacity: 0.5; pointer-events: none;
  background: repeating-linear-gradient(90deg, var(--pay-amber) 0 14px, transparent 14px 30px);
  background-size: 30px 100%; -webkit-mask: linear-gradient(180deg, transparent, #000 50%, transparent);
  mask: linear-gradient(180deg, transparent, #000 50%, transparent); opacity: 0.16; }
.belt-head.moving .dashes { animation: pay-belt-roll 0.9s linear infinite; opacity: 0.3; }
.legend { position: relative; z-index: 1; list-style: none; margin: 0; padding: 0;
  display: grid; grid-template-columns: 46px 1fr 150px 132px 96px; align-items: center; gap: 14px; height: 38px; }
.legend li { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--pay-text-muted); }
.legend .lg-amt { text-align: right; } .legend .lg-act { text-align: center; opacity: 0; }

/* ░░░░░░░░░░ TICKETS ░░░░░░░░░░ */
.tickets { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 9px; }
.ticket { position: relative; overflow: hidden; isolation: isolate;
  display: grid; grid-template-columns: 46px 1fr 150px 132px 96px; align-items: center; gap: 14px;
  padding: 13px 8px 13px 0; padding-left: 16px; border-radius: 14px; cursor: pointer;
  background: linear-gradient(100deg, var(--pay-surface), var(--pay-surface-2));
  border: 1px solid var(--pay-border-soft);
  box-shadow: 0 1px 0 rgba(255,255,255,0.03) inset, 0 10px 26px -22px rgba(0,0,0,0.7);
  transition: transform 0.3s var(--pay-ease), border-color 0.3s var(--pay-ease), box-shadow 0.3s var(--pay-ease), opacity 0.3s; }
.tickets:hover .ticket:not(:hover) { opacity: 0.86; }
.ticket:hover { transform: translateY(-3px) scale(1.012); border-color: var(--pay-border);
  box-shadow: 0 1px 0 rgba(255,255,255,0.05) inset, 0 18px 40px -24px rgba(234,88,12,0.42); z-index: 3; }
.ticket.skel { display: grid; opacity: 1; cursor: default; }
.sk-stub { width: 30px; height: 30px; border-radius: 9px; } .sk-body { height: 30px; }
.sk-amt { height: 22px; } .sk-status { height: 24px; border-radius: 999px; }

/* left rail clamp (approved/paid locked onto the belt) */
.clamp { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; border-radius: 0 4px 4px 0;
  background: var(--pay-text-muted); opacity: 0; transform: scaleY(0.3); transform-origin: center;
  transition: opacity 0.4s var(--pay-ease), transform 0.4s var(--pay-spring); }
.ticket.approved .clamp, .ticket.paid .clamp { opacity: 1; transform: scaleY(1); background: var(--pay-grad-rail); }
.ticket.cancelled .clamp { opacity: 1; transform: scaleY(1); background: var(--pay-st-cancelled); }
.ticket.paid .clamp { background: var(--pay-statutory); }

/* flow streak shooting toward the dock during seal */
.flow-streak { position: absolute; left: 30%; right: -2%; top: 50%; height: 2px; z-index: 4; pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--pay-mint-bright), var(--pay-amber));
  animation: pay-flow-travel-once 0.6s var(--pay-ease) forwards; }

/* perforated stub */
.stub { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; flex: none;
  background: rgba(251,191,36,0.12); color: var(--pay-treasury); border: 1px dashed var(--pay-border);
  transition: transform 0.5s var(--pay-spring); }
.ticket:hover .stub { transform: rotate(8deg); }

.tk-body { min-width: 0; }
.tk-name { color: var(--pay-text); font-weight: 700; font-size: 13.5px; display: flex; align-items: baseline; gap: 8px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tk-code { font-family: var(--pay-mono); font-size: 10.5px; color: var(--pay-text-muted); font-weight: 500; flex: none; }
.tk-sub { display: flex; align-items: center; gap: 7px; margin-top: 4px; font-size: 11.5px; }
.tk-type { color: var(--pay-text-2); font-weight: 600; }
.tk-dot { color: var(--pay-text-muted); opacity: 0.5; }
.tk-period { color: var(--pay-text-muted); font-family: var(--pay-mono); }

.tk-amt { display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
.tk-amt :deep(.pay-money) { font-size: 16px; }
.amt-chev { font-size: 9px; } .amt-chev.up { color: var(--pay-net); } .amt-chev.dn { color: var(--pay-deduction); }
.tax-pill { font-family: var(--pay-mono); font-size: 8px; font-weight: 800; letter-spacing: 0.06em; padding: 2px 5px;
  border-radius: 5px; color: var(--pay-statutory); background: var(--pay-statutory-soft); }

/* status latch */
.tk-status { position: relative; display: flex; align-items: center; gap: 8px; }
.latch { display: inline-flex; align-items: center; gap: 7px; padding: 4px 11px; border-radius: 999px;
  font-family: var(--pay-mono); font-size: 10.5px; font-weight: 700; letter-spacing: 0.02em; border: 1px solid transparent; }
.latch-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.latch-lock { margin-left: 1px; }
.latch.draft { color: var(--pay-st-draft); border-color: color-mix(in srgb, var(--pay-st-draft) 40%, transparent);
  background: transparent; animation: pay-glow-breathe 2.4s ease-in-out infinite; }
.latch.approved { color: #1a1206; background: var(--pay-grad-cta); }
.latch.paid { color: var(--pay-statutory); background: var(--pay-statutory-soft);
  border-color: color-mix(in srgb, var(--pay-statutory) 30%, transparent); }
.latch.paid .latch-lbl { background: linear-gradient(110deg, var(--pay-statutory), var(--pay-amber), var(--pay-statutory));
  background-size: 220% 100%; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  animation: pay-foil-text 6s linear infinite; }
.latch.cancelled { color: var(--pay-st-cancelled); background: rgba(156,163,175,0.1); text-decoration: line-through; }
.seal { position: absolute; right: -2px; top: -16px; font-family: var(--pay-mono); font-size: 8px; font-weight: 800;
  letter-spacing: 0.14em; color: var(--pay-net); padding: 2px 6px; border-radius: 5px;
  border: 1px dashed color-mix(in srgb, var(--pay-net) 55%, transparent); background: var(--pay-net-soft);
  animation: pay-seal-press 0.6s var(--pay-spring) both; }

/* actions */
.tk-actions { display: flex; align-items: center; justify-content: flex-end; gap: 6px; opacity: 0;
  transform: translateX(8px); transition: opacity 0.22s var(--pay-ease), transform 0.22s var(--pay-ease); }
.ticket:hover .tk-actions, .ticket.open .tk-actions { opacity: 1; transform: translateX(0); }
.act { width: 30px; height: 30px; border-radius: 9px; border: 1px solid var(--pay-border-soft);
  background: var(--pay-surface-2); color: var(--pay-text-2); cursor: pointer; display: grid; place-items: center; }
.act.ok:hover { color: var(--pay-net); border-color: color-mix(in srgb, var(--pay-net) 40%, transparent); }
.act.warn:hover { color: var(--pay-amber); border-color: var(--pay-border); }
.act.danger:hover { color: var(--pay-deduction); border-color: color-mix(in srgb, var(--pay-deduction) 40%, transparent); }
.act-lock { width: 30px; height: 30px; display: grid; place-items: center; color: var(--pay-text-muted); opacity: 0.5; }

/* expand-in-place console */
.console { grid-column: 1 / -1; display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.45s var(--pay-ease); }
.console.show { grid-template-rows: 1fr; }
.console > .console-inner { overflow: hidden; min-height: 0; }
.console.show .console-inner { padding-top: 13px; }
.console-inner { display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px;
  border-top: 1px dashed var(--pay-border-soft); }
.cl-facts { display: flex; flex-direction: column; gap: 9px; padding-top: 12px; }
.cl-period { display: flex; align-items: center; gap: 10px; }
.cl-lbl { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--pay-text-muted); flex: none; }
.cl-bar { flex: 1; height: 6px; border-radius: 99px; background: var(--pay-surface); overflow: hidden; border: 1px solid var(--pay-border-soft); }
.cl-bar-fill { display: block; height: 100%; width: 100%; transform-origin: left center;
  background: var(--pay-grad-cta); animation: pay-meter-grow 0.8s var(--pay-ease) both; }
.cl-range { font-family: var(--pay-mono); font-size: 11px; color: var(--pay-text-2); flex: none; }
.cl-reason { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--pay-text-2);
  padding: 8px 11px; border-radius: 9px; background: rgba(251,191,36,0.06); border: 1px solid var(--pay-border-soft); }
.cl-reason svg { color: var(--pay-treasury); flex: none; }
.cl-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.cl-tag { font-family: var(--pay-mono); font-size: 10px; padding: 3px 8px; border-radius: 6px;
  background: var(--pay-surface); border: 1px solid var(--pay-border-soft); color: var(--pay-text-2); }
.cl-tag.muted { color: var(--pay-text-muted); } .cl-tag.ref { color: var(--pay-treasury); }

.cl-strip { padding-top: 12px; }
.cl-strip-lbl { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--pay-text-muted); }
.flight { display: flex; align-items: center; margin-top: 12px; }
.fl-node { display: flex; flex-direction: column; align-items: center; gap: 6px; flex: none; }
.fl-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--pay-surface); border: 2px solid var(--pay-text-muted); }
.fl-name { font-size: 9.5px; color: var(--pay-text-muted); font-family: var(--pay-mono); white-space: nowrap; }
.fl-node.done .fl-dot { background: var(--pay-net); border-color: var(--pay-net); }
.fl-node.done .fl-name { color: var(--pay-text-2); }
.fl-node.now .fl-dot { background: var(--pay-amber); border-color: var(--pay-amber); animation: pay-node-halo 1.8s ease-in-out infinite; }
.fl-node.now .fl-name { color: var(--pay-treasury); font-weight: 700; }
.fl-node.dead .fl-dot { background: var(--pay-st-cancelled); border-color: var(--pay-st-cancelled); }
.fl-link { flex: 1; height: 2px; min-width: 18px; margin: 0 4px; margin-bottom: 16px; background: var(--pay-border-soft); }
.fl-link.done { background: linear-gradient(90deg, var(--pay-net), var(--pay-amber)); }

/* ░░░░░░░░░░ DOCKING BAY ░░░░░░░░░░ */
.dock { position: sticky; top: 12px; flex: none; width: 134px; align-self: stretch;
  display: flex; flex-direction: column; gap: 12px; padding: 16px 14px; border-radius: 16px;
  background: linear-gradient(180deg, var(--pay-surface-2), var(--pay-surface));
  border: 1px solid var(--pay-border-soft); overflow: hidden; isolation: isolate; }
.dock-glow { position: absolute; left: 50%; top: -10%; width: 130%; height: 60%; transform: translateX(-50%); z-index: -1;
  pointer-events: none; opacity: 0; background: radial-gradient(closest-side, rgba(251,191,36,0.22), transparent 70%); }
.dock.live .dock-glow { animation: pay-dock-bloom 1.4s var(--pay-ease); opacity: 1; }
.dock-head { display: flex; flex-direction: column; gap: 1px; }
.dock-eyebrow { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--pay-text-muted); }
.dock-run { font-family: var(--pay-mono); font-size: 13px; font-weight: 800; color: var(--pay-treasury); }
.ingots { display: flex; flex-direction: column-reverse; gap: 4px; min-height: 120px; justify-content: flex-start;
  padding: 8px; border-radius: 11px; background: var(--pay-surface);
  border: 1px solid var(--pay-border-soft); box-shadow: inset 0 0 24px rgba(0,0,0,0.25); }
.ingot { height: 9px; border-radius: 3px; background: var(--pay-grad-cta);
  box-shadow: 0 1px 0 rgba(255,255,255,0.3) inset, 0 0 10px -2px rgba(245,158,11,0.5);
  transform-origin: bottom center; animation: pay-ingot-rise 0.5s var(--pay-spring) both; animation-delay: var(--d, 0s); }
.ingot-empty { font-family: var(--pay-mono); font-size: 10px; color: var(--pay-text-muted); text-align: center; margin: auto; }
.dock-readout { display: flex; flex-direction: column; gap: 7px; }
.dr-row { display: flex; align-items: baseline; justify-content: space-between; }
.dr-row span { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--pay-text-muted); }
.dr-row b { font-family: var(--pay-mono); font-size: 16px; font-weight: 800; color: var(--pay-text); }
.dr-row b.dr-sum { color: var(--pay-net); font-size: 13px; }

/* ░░░░░░░░░░ CONVEYOR PAGINATION ░░░░░░░░░░ */
.conveyor-pg { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
  margin-top: 4px; padding: 11px 16px; border-radius: 14px;
  background: linear-gradient(100deg, var(--pay-surface), var(--pay-surface-2));
  border: 1px solid var(--pay-border-soft); }
.pg-readout { font-family: var(--pay-mono); font-size: 11px; color: var(--pay-text-muted); }
.pg-readout strong { color: var(--pay-text); }
.pg-ctrls { display: inline-flex; align-items: center; gap: 9px; }
.jog { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 50%;
  border: 1px solid var(--pay-border-soft); background: var(--pay-surface-2); color: var(--pay-text-2); cursor: pointer;
  transition: border-color 0.2s, color 0.2s; }
.jog:hover:not(:disabled) { border-color: var(--pay-border); color: var(--pay-text); }
.jog:disabled { opacity: 0.4; cursor: not-allowed; }
.slats { display: inline-flex; align-items: center; gap: 5px; }
.slat { position: relative; overflow: hidden; height: 30px; width: 24px; border-radius: 8px; border: 1px solid var(--pay-border-soft);
  background: var(--pay-surface); color: var(--pay-text-muted); cursor: pointer; font-family: var(--pay-mono); font-size: 11px; font-weight: 700;
  transition: width 0.4s var(--pay-spring), color 0.25s; }
.slat.on { width: 40px; color: #1a1206; border-color: transparent; }
.slat-fill { position: absolute; inset: 0; opacity: 0; background: var(--pay-grad-cta); transition: opacity 0.3s; }
.slat.on .slat-fill { opacity: 1; }
.slat-num { position: relative; z-index: 1; }
.pg-size { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--pay-text-muted); }
.sz { padding: 5px 9px; border-radius: 8px; border: 1px solid var(--pay-border-soft); background: var(--pay-surface-2);
  color: var(--pay-text-2); cursor: pointer; font-family: var(--pay-mono); font-size: 11px; transition: 0.2s; }
.sz.on { color: var(--pay-treasury); border-color: var(--pay-border); background: rgba(251,191,36,0.12); }

/* belt page transition */
.belt-fwd-enter-active, .belt-back-enter-active, .belt-fwd-leave-active, .belt-back-leave-active {
  transition: opacity 0.3s var(--pay-ease), transform 0.3s var(--pay-ease), filter 0.3s var(--pay-ease); }
.belt-fwd-enter-from { opacity: 0; transform: translateX(34px); filter: blur(3px); }
.belt-fwd-leave-to { opacity: 0; transform: translateX(-40px); filter: blur(3px); }
.belt-back-enter-from { opacity: 0; transform: translateX(-34px); filter: blur(3px); }
.belt-back-leave-to { opacity: 0; transform: translateX(40px); filter: blur(3px); }

/* ░░░░░░░░░░ KEYFRAMES (page-local) ░░░░░░░░░░ */
@keyframes pay-belt-roll { from { background-position: 0 0; } to { background-position: 30px 0; } }
@keyframes pay-flow-travel-once { from { opacity: 0; transform: scaleX(0); transform-origin: left; }
  40% { opacity: 1; } to { opacity: 0; transform: scaleX(1); transform-origin: left; } }
@keyframes pay-dock-bloom { 0% { opacity: 0; transform: translateX(-50%) scale(0.7); }
  50% { opacity: 1; } 100% { opacity: 0.6; transform: translateX(-50%) scale(1); } }

/* ░░░░░░░░░░ RESPONSIVE ░░░░░░░░░░ */
@media (max-width: 980px) {
  .belt-area { flex-direction: column; }
  .dock { width: 100%; position: static; flex-direction: row; align-items: center; gap: 16px; }
  .dock-head { flex: none; } .ingots { flex: 1; flex-direction: row; min-height: 0; height: 36px; align-items: flex-end; }
  .ingot { width: 9px; height: auto; flex: 1; max-width: 16px; }
  .dock-readout { flex-direction: row; gap: 18px; }
}
@media (max-width: 720px) {
  .legend, .ticket { grid-template-columns: 40px 1fr auto; }
  .legend .lg-amt, .legend .lg-status, .legend .lg-act { display: none; }
  .tk-amt { grid-column: 3; } .tk-status { grid-column: 1 / -1; margin-top: 8px; }
  .tk-actions { grid-column: 1 / -1; justify-content: flex-start; opacity: 1; transform: none; }
  .console-inner { grid-template-columns: 1fr; }
}

/* ░░░░░░░░░░ LIGHT THEME ░░░░░░░░░░ */
[data-theme="light"] .switch.on, [data-theme="light"] .latch.approved, [data-theme="light"] .slat.on { color: #2a1a06; }
[data-theme="light"] .stage-cta { color: #2a1a06; }
[data-theme="light"] .latch.cancelled { color: #8a734f; }
[data-theme="light"] .ingots { box-shadow: inset 0 0 18px rgba(120,90,40,0.12); }
[data-theme="light"] .dock.live .dock-glow { opacity: 0.5; }
[data-theme="light"] .belt-head.moving .dashes { opacity: 0.4; }

/* ░░░░░░░░░░ REDUCED MOTION ░░░░░░░░░░ */
@media (prefers-reduced-motion: reduce) {
  .scanbar::after, .dock-light.live, .belt-head.moving .dashes, .latch.draft,
  .latch.paid .latch-lbl, .fl-node.now .fl-dot, .flow-streak, .ingot, .dock.live .dock-glow,
  .cl-bar-fill, .seal, .cta-sweep { animation: none !important; }
  .ticket:hover { transform: none; } .ticket:hover .stub { transform: none; }
}
</style>
