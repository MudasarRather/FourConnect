<template>
  <div class="scope">
    <!-- ░░░░░░░░░░ OSCILLOSCOPE HERO ░░░░░░░░░░ -->
    <Motion as="header" class="osc"
      :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
      <span class="osc-grid" aria-hidden="true" />
      <div class="osc-info">
        <span class="eyebrow"><Activity :size="12" /> VARIABLE PAY · {{ runLabel }}</span>
        <h2 class="osc-title pay-foil-text">Variance Signal</h2>
        <p class="osc-sub">Performance-linked pay fluctuates by attainment. Read the signal, approve to lock it into the run.</p>
        <div class="osc-stats">
          <div class="os"><span>Payout (approved)</span><b class="os-net"><PayMoneyValue :value="approvedSum" short tone="net" /></b></div>
          <div class="os"><span>Signals live</span><b><PayCountUp :value="approvedCount" /></b></div>
          <div class="os"><span>Volatility</span><b class="os-vol"><PayCountUp :value="volatility" :decimals="1" /><span class="pct">%</span></b></div>
        </div>
      </div>

      <!-- live waveform -->
      <div class="trace" :class="{ live: approvedCount > 0 }">
        <svg class="trace-svg" :key="`tr-${heroPoints.length}-${Math.round(approvedSum)}`" viewBox="0 0 300 70" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient :id="gradId" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="var(--pay-treasury)" /><stop offset="55%" stop-color="var(--pay-amber)" /><stop offset="100%" stop-color="var(--pay-ember)" />
            </linearGradient>
          </defs>
          <path class="trace-line" :d="heroPath" fill="none" :stroke="`url(#${gradId})`" pathLength="1" />
        </svg>
        <span class="trace-beam" aria-hidden="true" />
        <span class="trace-dot" aria-hidden="true" />
        <span class="trace-cap">live trace · {{ heroPoints.length }} pts</span>
      </div>
    </Motion>

    <!-- ░░░░░░░░░░ CONTROL DECK ░░░░░░░░░░ -->
    <Motion as="div" class="deck"
      :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.14, ease: [0.16, 1, 0.3, 1] }">
      <div class="chips">
        <Motion v-for="s in statusOpts" :key="s.v" as="button" class="chip" :class="{ on: status === s.v }"
          :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }" @click="setStatus(s.v)">
          <span class="chip-dot" :class="s.cls" /> {{ s.label }}
        </Motion>
      </div>
      <div class="deck-right">
        <div class="search" :class="{ on: searchFocused }">
          <Search :size="15" />
          <input v-model="q" placeholder="Find recipient…" @focus="searchFocused = true"
            @blur="searchFocused = false" @keyup.enter="() => { page = 1; reload() }" />
        </div>
        <Motion as="button" class="add-cta" @click="modalOpen = true"
          :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }">
          <span class="cta-sweep" aria-hidden="true" /><Plus :size="15" /> Add variable pay
        </Motion>
      </div>
    </Motion>

    <!-- ░░░░░░░░░░ SIGNAL FEED ░░░░░░░░░░ -->
    <div v-if="loading" class="feed">
      <div v-for="i in 4" :key="i" class="sig-skel">
        <div class="pay-skel" style="height:16px;width:35%" />
        <div class="pay-skel" style="height:44px;width:100%;margin-top:14px;border-radius:12px" />
      </div>
    </div>

    <PayEmptyState v-else-if="!items.length" :icon="Activity"
      :title="status || q ? 'No signals match this filter' : 'No variable pay yet'"
      :sub="status || q ? 'Clear the filter or search to read all signals.' : 'Add a variable-pay component to put a signal on the scope.'">
      <button class="add-cta plain" @click="modalOpen = true"><Plus :size="15" /> Add variable pay</button>
    </PayEmptyState>

    <transition :name="`feed-${pgDir}`" mode="out-in">
      <div v-if="items.length" :key="page" class="feed">
        <Motion v-for="(a, i) in items" :key="a.id" as="article" class="sig"
          :class="[`t-${subTone(a.sub_type)}`, statusClass(a.status), { locking: sealId === a.id }]"
          :initial="{ opacity: 0, y: 22, scale: 0.98 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ delay: Math.min(i * 0.06, 0.45), duration: 0.5, ease: [0.16, 1, 0.3, 1] }"
          @pointermove="spot" @pointerleave="unspot">
          <span class="sig-spot" aria-hidden="true" />
          <span class="lock-ping" v-if="sealId === a.id" aria-hidden="true" />

          <div class="sig-head">
            <div class="sh-who">
              <span class="sh-icon"><component :is="subIcon(a.sub_type)" :size="15" /></span>
              <div class="sh-txt">
                <span class="sh-name">{{ a.employee_name || a.employee_code }}</span>
                <span class="sh-sub"><span class="sh-type">{{ a.sub_type || 'Variable' }}</span><span class="sh-dot">·</span><span class="sh-period">{{ periodLabel(a) }}</span></span>
              </div>
            </div>
            <div class="sh-right">
              <PayMoneyValue class="sh-amt" :value="a.amount" tone="net" />
              <span class="latch" :class="statusClass(a.status)"><span class="latch-dot" />{{ adjStatusMeta(a.status).label }}</span>
            </div>
          </div>

          <!-- waveform signal -->
          <div class="wave">
            <svg class="wave-svg" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
              <path class="wave-path" :class="{ frozen: a.status === 'PAID' || a.status === 'CANCELLED' }"
                :d="cardWave(ratio(a), i)" fill="none" />
            </svg>
            <span class="wave-base" aria-hidden="true" />
            <span class="amp-tag">amp {{ Math.round(ratio(a) * 100) }}%</span>
          </div>

          <div class="sig-actions">
            <Motion v-if="a.status === 'DRAFT'" as="button" class="act ok" title="Approve · lock signal"
              :whileHover="{ scale: 1.14 }" :whileTap="{ scale: 0.9 }" @click="approve(a)"><Check :size="14" /></Motion>
            <Motion v-if="a.status === 'DRAFT' || a.status === 'APPROVED'" as="button" class="act warn" title="Cancel"
              :whileHover="{ scale: 1.14 }" :whileTap="{ scale: 0.9 }" @click="askCancel(a)"><Ban :size="14" /></Motion>
            <Motion v-if="a.status === 'DRAFT'" as="button" class="act danger" title="Delete"
              :whileHover="{ scale: 1.14 }" :whileTap="{ scale: 0.9 }" @click="askDelete(a)"><Trash2 :size="14" /></Motion>
            <span v-if="a.status === 'PAID' || a.status === 'CANCELLED'" class="act-lock"><Lock :size="13" /> {{ a.status === 'PAID' ? 'Locked' : 'Cancelled' }}</span>
            <span v-if="a.reason" class="sig-reason">{{ a.reason }}</span>
          </div>
        </Motion>
      </div>
    </transition>

    <!-- ░░░░░░░░░░ TUNER PAGINATION ░░░░░░░░░░ -->
    <Motion v-if="!loading && total > 0" as="nav" class="tuner"
      :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }">
      <span class="tuner-readout">SIGNALS <strong>{{ rangeLabel }}</strong> / {{ total }}</span>
      <div class="tuner-mid">
        <Motion as="button" class="dial nav" :disabled="page <= 1" @click="go(page - 1)"
          :whileTap="{ scale: 0.85, x: -3 }"><ChevronLeft :size="16" /></Motion>
        <div class="stations">
          <span class="band" aria-hidden="true" />
          <Motion class="needle" as="span" aria-hidden="true" :animate="{ x: needleX }"
            :transition="{ type: 'spring', stiffness: 380, damping: 28 }" />
          <button v-for="p in windowPages" :key="p" class="station" :class="{ on: p === page }" @click="go(p)">
            <span class="st-tick" /><span class="st-num">{{ p }}</span>
          </button>
        </div>
        <Motion as="button" class="dial nav" :disabled="page >= totalPages" @click="go(page + 1)"
          :whileTap="{ scale: 0.85, x: 3 }"><ChevronRight :size="16" /></Motion>
      </div>
      <div class="tuner-size">
        <span>per page</span>
        <button v-for="n in sizes" :key="n" class="sz" :class="{ on: n === limit }" @click="setSize(n)">{{ n }}</button>
      </div>
    </Motion>

    <!-- ░░░░░░░░░░ MODALS ░░░░░░░░░░ -->
    <PayAdjustmentModal :open="modalOpen" kind="VARIABLE_PAY" @close="modalOpen = false" @saved="onSaved" />
    <PayAdjustmentDeleteModal :open="del.open" :item="del.item" kind-label="Variable pay" :busy="del.busy"
      @close="del.open = false" @confirm="doDelete" />
    <PayAdjustmentCancelModal :open="cnl.open" :item="cnl.item" kind-label="Variable pay" :run-label="runLabel" :busy="cnl.busy"
      @close="cnl.open = false" @confirm="doCancel" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  Activity, Plus, Search, Check, Ban, Trash2, Lock, ChevronLeft, ChevronRight,
  Percent, CalendarRange, Rocket, Gauge,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import PayEmptyState from '../components/PayEmptyState.vue'
import PayMoneyValue from '../components/PayMoneyValue.vue'
import PayCountUp from '../components/PayCountUp.vue'
import PayAdjustmentModal from '../modals/PayAdjustmentModal.vue'
import PayAdjustmentDeleteModal from '../modals/PayAdjustmentDeleteModal.vue'
import PayAdjustmentCancelModal from '../modals/PayAdjustmentCancelModal.vue'
import { monthLabel } from '@/composables/usePayroll'
import {
  adjStatusMeta, fetchAdjustments, approveAdjustment, cancelAdjustment, deleteAdjustment,
} from '@/composables/usePayrollExtra'

const emit = defineEmits(['refresh-stats'])
const toast = useToast()

const now = new Date()
const runLabel = `${monthLabel(now.getMonth() + 1)} ${now.getFullYear()}`
const gradId = `vp-grad-${Math.floor(now.getTime() % 100000)}`

const items = ref([]); const total = ref(0); const loading = ref(false)
const status = ref(null); const page = ref(1); const limit = ref(10); const q = ref('')
const sizes = [10, 25, 50]
const modalOpen = ref(false)
const searchFocused = ref(false)
const sealId = ref(null)
const pgDir = ref('fwd')

/* hero signal aggregates */
const approvedSum = ref(0); const approvedCount = ref(0); const heroPoints = ref([]); const volatility = ref(0)

/* status filter */
const statusOpts = [
  { v: null, label: 'All', cls: 'all' },
  { v: 'DRAFT', label: 'Draft', cls: 'draft' },
  { v: 'APPROVED', label: 'Approved', cls: 'approved' },
  { v: 'PAID', label: 'Paid', cls: 'paid' },
  { v: 'CANCELLED', label: 'Cancelled', cls: 'cancelled' },
]

/* sub-type identity (VARIABLE_PAY: Performance Pay / Commission / Quarterly Incentive / Project Bonus) */
const SUB = {
  'Performance Pay':     { icon: Gauge,        tone: 'net' },
  'Commission':          { icon: Percent,      tone: 'amber' },
  'Quarterly Incentive': { icon: CalendarRange,tone: 'gold' },
  'Project Bonus':       { icon: Rocket,       tone: 'ember' },
}
const subIcon = (s) => (SUB[s]?.icon) || Activity
const subTone = (s) => (SUB[s]?.tone) || 'gold'
const statusClass = (s) => ({ DRAFT: 'draft', APPROVED: 'approved', PAID: 'paid', CANCELLED: 'cancelled' }[s] || 'draft')
const periodLabel = (a) => a.period_month ? `${monthLabel(a.period_month)} ${a.period_year}` : 'Next run'

/* cursor spotlight */
const spot = (e) => { const el = e.currentTarget, r = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${e.clientX - r.left}px`); el.style.setProperty('--my', `${e.clientY - r.top}px`); el.style.setProperty('--sp', '1') }
const unspot = (e) => e.currentTarget.style.setProperty('--sp', '0')

/* per-row signal amplitude (relative to the biggest on this page) */
const maxAmt = computed(() => items.value.reduce((m, a) => Math.max(m, Number(a.amount || 0)), 0))
const ratio = (a) => { const m = maxAmt.value; if (!m) return 0.4; return Math.max(0.12, Number(a.amount || 0) / m) }

/* sine waveform path (width 200 for seamless -100 scroll, viewBox 0 0 100 40) */
const cardWave = (r, i) => {
  const W = 200, H = 40, periods = 8, amp = 4 + r * 13, phase = i * 0.7, samples = 80
  let d = ''
  for (let s = 0; s <= samples; s++) {
    const x = (s / samples) * W
    const y = H / 2 - Math.sin((s / samples) * periods * 2 * Math.PI + phase) * amp
    d += (s ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1) + ' '
  }
  return d.trim()
}

/* hero oscilloscope trace from approved amounts */
const HW = 300, HH = 70, HP = 9
const heroPath = computed(() => {
  const n = heroPoints.value
  if (n.length < 2) return `M0 ${HH / 2} L${HW} ${HH / 2}`
  const min = Math.min(...n), max = Math.max(...n), span = (max - min) || 1
  const step = HW / (n.length - 1)
  return n.map((v, i) => {
    const x = i * step, y = HP + (HH - 2 * HP) * (1 - (v - min) / span)
    return (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)
  }).join(' ')
})

/* pagination */
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))
const windowStart = computed(() => Math.max(1, Math.min(page.value - 2, totalPages.value - 4)))
const windowPages = computed(() => { const end = Math.min(totalPages.value, windowStart.value + 4); const out = []; for (let i = windowStart.value; i <= end; i++) out.push(i); return out })
const rangeLabel = computed(() => { if (!total.value) return '0'; const a = (page.value - 1) * limit.value + 1; return `${a}–${Math.min(page.value * limit.value, total.value)}` })
const STATION = 44
const needleX = computed(() => (page.value - windowStart.value) * STATION)

/* load */
const reload = async () => {
  loading.value = true
  try {
    const res = await fetchAdjustments({ adjustment_type: 'VARIABLE_PAY', status: status.value || undefined,
      skip: (page.value - 1) * limit.value, limit: limit.value })
    items.value = res.items || []; total.value = res.total || 0
  } catch { toast.error('Failed to load') }
  finally { loading.value = false }
}
const loadSignal = async () => {
  try {
    const ap = await fetchAdjustments({ adjustment_type: 'VARIABLE_PAY', status: 'APPROVED', limit: 200 })
    const arr = (ap.items || []).map(x => Number(x.amount || 0))
    approvedCount.value = ap.total || 0
    approvedSum.value = arr.reduce((s, v) => s + v, 0)
    heroPoints.value = [...arr].reverse().slice(-30)   // chronological-ish for the trace
    // volatility = coefficient of variation (%)
    if (arr.length > 1) {
      const mean = approvedSum.value / arr.length
      const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length
      volatility.value = mean ? Math.min(999, (Math.sqrt(variance) / mean) * 100) : 0
    } else volatility.value = 0
  } catch { /* non-fatal */ }
}

const setStatus = (s) => { status.value = s; page.value = 1; reload() }
const go = (p) => { if (p < 1 || p > totalPages.value || p === page.value) return; pgDir.value = p > page.value ? 'fwd' : 'back'; page.value = p; reload() }
const setSize = (n) => { limit.value = n; page.value = 1; reload() }
const onSaved = () => { reload(); loadSignal(); emit('refresh-stats') }

const approve = async (a) => {
  sealId.value = a.id
  try {
    await approveAdjustment(a.id)
    toast.success('Signal locked · added to payout')
    await Promise.all([reload(), loadSignal()]); emit('refresh-stats')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed') }
  finally { setTimeout(() => { sealId.value = null }, 700) }
}

const del = ref({ open: false, item: null, busy: false })
const cnl = ref({ open: false, item: null, busy: false })
const askDelete = (a) => { del.value = { open: true, item: a, busy: false } }
const askCancel = (a) => { cnl.value = { open: true, item: a, busy: false } }
const doDelete = async ({ reason, note }) => {
  del.value.busy = true
  try { await deleteAdjustment(del.value.item.id, { reason, note }); toast.success('Variable pay deleted'); del.value.open = false; await Promise.all([reload(), loadSignal()]); emit('refresh-stats') }
  catch (e) { toast.error(e?.response?.data?.detail || 'Delete failed') } finally { del.value.busy = false }
}
const doCancel = async ({ reason, note }) => {
  cnl.value.busy = true
  try { await cancelAdjustment(cnl.value.item.id, { reason, note }); toast.success('Variable pay cancelled'); cnl.value.open = false; await Promise.all([reload(), loadSignal()]); emit('refresh-stats') }
  catch (e) { toast.error(e?.response?.data?.detail || 'Cancel failed') } finally { cnl.value.busy = false }
}

onMounted(() => { reload(); loadSignal() })
</script>

<style scoped>
.scope { display: flex; flex-direction: column; gap: 18px; padding-top: 8px; }

/* ░░░░░░░░░░ OSCILLOSCOPE HERO ░░░░░░░░░░ */
.osc { position: relative; overflow: hidden; isolation: isolate; display: flex; align-items: center; gap: 28px;
  flex-wrap: wrap; justify-content: space-between; padding: 24px 26px; border-radius: 22px;
  background: linear-gradient(150deg, var(--pay-surface), var(--pay-surface-2));
  border: 1px solid var(--pay-border-soft); box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset, 0 18px 50px -34px rgba(0,0,0,0.8); }
.osc::before { content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1px; pointer-events: none; opacity: 0.7;
  background: linear-gradient(140deg, rgba(251,191,36,0.5), transparent 38%, transparent 62%, rgba(184,134,11,0.32));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; }
.osc-grid { position: absolute; inset: 0; z-index: -1; opacity: 0.4; pointer-events: none;
  background-image: linear-gradient(var(--pay-border-soft) 1px, transparent 1px), linear-gradient(90deg, var(--pay-border-soft) 1px, transparent 1px);
  background-size: 22px 22px; -webkit-mask: radial-gradient(130% 90% at 100% 50%, #000, transparent 72%); mask: radial-gradient(130% 90% at 100% 50%, #000, transparent 72%); }
.osc-info { min-width: 0; flex: 1; }
.eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 10px; font-weight: 800; letter-spacing: 0.13em; color: var(--pay-treasury); }
.eyebrow svg { color: var(--pay-net); }
.osc-title { margin: 7px 0 0; font-size: 28px; font-weight: 850; letter-spacing: -0.01em; }
.osc-sub { margin: 8px 0 0; font-size: 12.5px; color: var(--pay-text-2); max-width: 46ch; line-height: 1.5; }
.osc-stats { display: flex; flex-wrap: wrap; gap: 22px; margin-top: 16px; }
.os { display: flex; flex-direction: column; gap: 3px; }
.os span { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--pay-text-muted); }
.os b { font-family: var(--pay-mono); font-size: 18px; font-weight: 800; color: var(--pay-text); }
.os b.os-net { color: var(--pay-net); } .os b.os-vol { color: var(--pay-amber); } .os-vol .pct { font-size: 12px; opacity: 0.7; }

/* live trace */
.trace { position: relative; flex: none; width: 320px; max-width: 100%; height: 92px; padding: 11px 10px 22px;
  border-radius: 14px; background: var(--pay-surface); border: 1px solid var(--pay-border-soft);
  box-shadow: inset 0 0 30px rgba(0,0,0,0.3); overflow: hidden; }
.trace-svg { width: 100%; height: 100%; display: block; }
.trace-line { stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; filter: drop-shadow(0 0 4px rgba(245,158,11,0.5));
  stroke-dasharray: 1; animation: pay-draw 1.4s var(--pay-ease) both; }
.trace-beam { position: absolute; top: 8px; bottom: 22px; width: 36px; left: 0; pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(52,211,153,0.18), rgba(52,211,153,0.4)); border-right: 1px solid var(--pay-net); }
.trace.live .trace-beam { animation: beam-scan 3.2s linear infinite; }
.trace-dot { position: absolute; right: 12px; top: 50%; width: 7px; height: 7px; border-radius: 50%; background: var(--pay-net);
  box-shadow: 0 0 10px var(--pay-net); }
.trace.live .trace-dot { animation: pay-node-halo 2s ease-in-out infinite; }
.trace-cap { position: absolute; left: 0; right: 0; bottom: 7px; text-align: center; font-family: var(--pay-mono);
  font-size: 9px; letter-spacing: 0.08em; color: var(--pay-text-muted); text-transform: uppercase; }

/* ░░░░░░░░░░ CONTROL DECK ░░░░░░░░░░ */
.deck { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.chips { display: flex; gap: 8px; flex-wrap: wrap; }
.chip { display: inline-flex; align-items: center; gap: 7px; padding: 7px 14px; border-radius: 999px; cursor: pointer;
  border: 1px solid var(--pay-border-soft); background: var(--pay-surface); color: var(--pay-text-2); font-size: 12px; font-weight: 600; }
.chip-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--pay-text-muted); }
.chip-dot.draft { background: var(--pay-st-draft); } .chip-dot.approved { background: var(--pay-amber); }
.chip-dot.paid { background: var(--pay-statutory); } .chip-dot.cancelled { background: var(--pay-st-cancelled); } .chip-dot.all { background: var(--pay-net); }
.chip.on { color: #1a1206; background: var(--pay-grad-cta); border-color: transparent; box-shadow: 0 6px 16px -8px rgba(234,88,12,0.5); }
.chip.on .chip-dot { background: rgba(26,18,6,0.7); }
.deck-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.search { position: relative; display: flex; align-items: center; gap: 9px; padding: 9px 13px; border-radius: 11px;
  background: var(--pay-surface); border: 1px solid var(--pay-border-soft); color: var(--pay-text-muted);
  transition: border-color 0.3s var(--pay-ease), box-shadow 0.3s var(--pay-ease); min-width: 190px; }
.search.on { border-color: var(--pay-amber); box-shadow: 0 0 0 4px rgba(245,158,11,0.12); }
.search input { background: none; border: none; outline: none; color: var(--pay-text); font-size: 13px; width: 100%; }
.add-cta { position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px;
  border-radius: 11px; border: none; cursor: pointer; background: var(--pay-grad-cta); color: #1a1206; font-weight: 700; font-size: 13px; }
.add-cta.plain { margin-top: 4px; }
.cta-sweep { position: absolute; top: 0; bottom: 0; width: 34%; transform: translateX(-220%);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent); }
.add-cta:hover .cta-sweep { animation: pay-foil-sweep 0.9s var(--pay-ease); }

/* ░░░░░░░░░░ SIGNAL FEED ░░░░░░░░░░ */
.feed { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 12px; }
.sig-skel { padding: 16px; border-radius: 16px; background: var(--pay-surface); border: 1px solid var(--pay-border-soft); }

.sig { --accent: var(--pay-treasury); position: relative; overflow: hidden; isolation: isolate;
  display: flex; flex-direction: column; gap: 12px; padding: 15px 16px; border-radius: 16px;
  background: linear-gradient(150deg, var(--pay-surface), var(--pay-surface-2)); border: 1px solid var(--pay-border-soft);
  box-shadow: 0 1px 0 rgba(255,255,255,0.03) inset, 0 12px 30px -24px rgba(0,0,0,0.7);
  transition: transform 0.35s var(--pay-ease), border-color 0.35s var(--pay-ease), box-shadow 0.35s var(--pay-ease); }
.sig.t-amber { --accent: var(--pay-amber); } .sig.t-net { --accent: var(--pay-net); }
.sig.t-gold { --accent: var(--pay-treasury); } .sig.t-ember { --accent: var(--pay-ember); } .sig.t-mint { --accent: var(--pay-mint); }
.sig:hover { transform: translateY(-4px); border-color: var(--accent); box-shadow: 0 1px 0 rgba(255,255,255,0.05) inset, 0 20px 44px -26px color-mix(in srgb, var(--accent) 55%, transparent); }
.sig.cancelled { opacity: 0.62; }
.sig-spot { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: -1; opacity: var(--sp, 0);
  transition: opacity 0.4s var(--pay-ease);
  background: radial-gradient(200px circle at var(--mx,50%) var(--my,50%), color-mix(in srgb, var(--accent) 20%, transparent), transparent 60%); }
.lock-ping { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 4; border: 2px solid var(--accent);
  animation: lock-pulse 0.7s var(--pay-ease) forwards; }

.sig-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.sh-who { display: flex; align-items: center; gap: 11px; min-width: 0; }
.sh-icon { flex: none; width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; color: var(--accent);
  background: color-mix(in srgb, var(--accent) 14%, transparent); border: 1px solid var(--pay-border-soft); }
.sh-txt { min-width: 0; }
.sh-name { display: block; color: var(--pay-text); font-weight: 700; font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sh-sub { display: flex; align-items: center; gap: 6px; margin-top: 3px; font-size: 11px; }
.sh-type { color: var(--accent); font-weight: 600; } .sh-dot { color: var(--pay-text-muted); opacity: 0.5; } .sh-period { color: var(--pay-text-muted); font-family: var(--pay-mono); }
.sh-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex: none; }
.sh-amt { font-size: 18px; } .sh-amt :deep(.pay-money) { font-size: 18px; }
.latch { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px; border-radius: 999px; font-family: var(--pay-mono); font-size: 9.5px; font-weight: 700; }
.latch-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.latch.draft { color: var(--pay-st-draft); background: rgba(253,224,71,0.12); }
.latch.approved { color: var(--pay-amber); background: rgba(245,158,11,0.13); }
.latch.paid { color: var(--pay-statutory); background: var(--pay-statutory-soft); }
.latch.cancelled { color: var(--pay-st-cancelled); background: rgba(156,163,175,0.12); text-decoration: line-through; }

/* waveform */
.wave { position: relative; height: 40px; border-radius: 10px; overflow: hidden; background: var(--pay-surface);
  border: 1px solid var(--pay-border-soft); }
.wave-svg { width: 100%; height: 100%; display: block; }
.wave-path { stroke: var(--accent); stroke-width: 1.6; vector-effect: non-scaling-stroke; transform: translateX(0);
  filter: drop-shadow(0 0 3px color-mix(in srgb, var(--accent) 60%, transparent)); animation: wave-scroll 3s linear infinite; }
.wave-path.frozen { animation: none; opacity: 0.6; }
.wave-base { position: absolute; left: 0; right: 0; top: 50%; height: 1px; background: var(--pay-border-soft); }
.amp-tag { position: absolute; top: 5px; right: 8px; font-family: var(--pay-mono); font-size: 8.5px; letter-spacing: 0.06em;
  color: var(--accent); background: var(--pay-surface-2); padding: 1px 6px; border-radius: 5px; }

.sig-actions { display: flex; align-items: center; gap: 7px; }
.act { width: 30px; height: 30px; border-radius: 9px; border: 1px solid var(--pay-border-soft); background: var(--pay-surface-2); color: var(--pay-text-2); cursor: pointer; display: grid; place-items: center; }
.act.ok:hover { color: var(--pay-net); border-color: color-mix(in srgb, var(--pay-net) 40%, transparent); }
.act.warn:hover { color: var(--pay-amber); border-color: var(--pay-border); }
.act.danger:hover { color: var(--pay-deduction); border-color: color-mix(in srgb, var(--pay-deduction) 40%, transparent); }
.act-lock { display: inline-flex; align-items: center; gap: 5px; font-family: var(--pay-mono); font-size: 10px; color: var(--pay-text-muted); }
.sig-reason { margin-left: auto; font-size: 10.5px; color: var(--pay-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 45%; }

/* ░░░░░░░░░░ TUNER PAGINATION ░░░░░░░░░░ */
.tuner { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-top: 4px;
  padding: 12px 18px; border-radius: 16px; background: linear-gradient(150deg, var(--pay-surface), var(--pay-surface-2));
  border: 1px solid var(--pay-border-soft); }
.tuner-readout { font-family: var(--pay-mono); font-size: 11px; color: var(--pay-text-muted); }
.tuner-readout strong { color: var(--pay-text); }
.tuner-mid { display: inline-flex; align-items: center; gap: 10px; }
.dial { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 50%; border: 1px solid var(--pay-border-soft);
  background: var(--pay-surface-2); color: var(--pay-text-2); cursor: pointer; transition: border-color 0.2s, color 0.2s; }
.dial:hover:not(:disabled) { border-color: var(--pay-border); color: var(--pay-text); }
.dial:disabled { opacity: 0.35; cursor: not-allowed; }
.stations { position: relative; display: inline-flex; padding: 6px 0 4px; border-radius: 11px; background: var(--pay-surface);
  border: 1px solid var(--pay-border-soft); }
.band { position: absolute; left: 8px; right: 8px; top: 9px; height: 1px;
  background: repeating-linear-gradient(90deg, var(--pay-border) 0 2px, transparent 2px 8px); }
.needle { position: absolute; top: 4px; left: 0; width: 44px; height: 2px; background: var(--pay-net);
  box-shadow: 0 0 8px var(--pay-net); border-radius: 2px; z-index: 2; }
.station { position: relative; z-index: 1; width: 44px; display: flex; flex-direction: column; align-items: center; gap: 5px;
  border: none; background: transparent; cursor: pointer; }
.st-tick { width: 2px; height: 9px; background: var(--pay-border); border-radius: 2px; transition: 0.3s var(--pay-ease); }
.st-num { font-family: var(--pay-mono); font-size: 11px; font-weight: 700; color: var(--pay-text-muted); transition: color 0.25s; }
.station:hover .st-num { color: var(--pay-text); }
.station.on .st-tick { height: 13px; background: var(--pay-net); box-shadow: 0 0 8px var(--pay-net); }
.station.on .st-num { color: var(--pay-net); }
.tuner-size { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--pay-text-muted); }
.sz { padding: 5px 10px; border-radius: 9px; border: 1px solid var(--pay-border-soft); background: var(--pay-surface-2); color: var(--pay-text-2); cursor: pointer; font-family: var(--pay-mono); font-size: 11px; }
.sz.on { color: var(--pay-treasury); border-color: var(--pay-border); background: rgba(251,191,36,0.12); }

/* page transition */
.feed-fwd-enter-active, .feed-back-enter-active, .feed-fwd-leave-active, .feed-back-leave-active { transition: opacity 0.3s var(--pay-ease), transform 0.3s var(--pay-ease); }
.feed-fwd-enter-from { opacity: 0; transform: translateX(28px); } .feed-fwd-leave-to { opacity: 0; transform: translateX(-28px); }
.feed-back-enter-from { opacity: 0; transform: translateX(-28px); } .feed-back-leave-to { opacity: 0; transform: translateX(28px); }

/* keyframes */
@keyframes wave-scroll { to { transform: translateX(-100px); } }
@keyframes beam-scan { 0% { left: -10%; } 100% { left: 100%; } }
@keyframes lock-pulse { 0% { opacity: 0.9; transform: scale(1); } 100% { opacity: 0; transform: scale(1.04); } }

/* ░░░░░░░░░░ RESPONSIVE ░░░░░░░░░░ */
@media (max-width: 720px) { .osc { justify-content: center; } .trace { width: 100%; } .feed { grid-template-columns: 1fr; } }

/* ░░░░░░░░░░ LIGHT THEME ░░░░░░░░░░ */
[data-theme="light"] .chip.on, [data-theme="light"] .add-cta { color: #2a1a06; }
[data-theme="light"] .trace { box-shadow: inset 0 0 22px rgba(120,90,40,0.12); }
[data-theme="light"] .latch.cancelled { color: #8a734f; }

/* ░░░░░░░░░░ REDUCED MOTION ░░░░░░░░░░ */
@media (prefers-reduced-motion: reduce) {
  .trace-line, .trace.live .trace-beam, .trace.live .trace-dot, .wave-path, .lock-ping, .add-cta:hover .cta-sweep { animation: none !important; }
  .trace-line { stroke-dasharray: none; }
  .sig:hover { transform: none; }
}
</style>
