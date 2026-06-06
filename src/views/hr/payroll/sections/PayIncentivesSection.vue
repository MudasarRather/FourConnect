<template>
  <div class="boost">
    <!-- ░░░░░░░░░░ TELEMETRY HERO ░░░░░░░░░░ -->
    <Motion as="header" class="telemetry"
      :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
      <span class="tele-grid" aria-hidden="true" />
      <div class="tele-info">
        <span class="eyebrow"><Gauge :size="12" /> PERFORMANCE INCENTIVES · {{ runLabel }}</span>
        <h2 class="tele-title pay-foil-text">Boost Board</h2>
        <p class="tele-sub">Performance payouts ranked by magnitude. Approve to ignite — each award surges into the next pay run.</p>
        <div class="tele-stats">
          <div class="ts"><span>Payout (approved)</span><b class="ts-net"><PayMoneyValue :value="approvedSum" short tone="net" /></b></div>
          <div class="ts"><span>Awards live</span><b><PayCountUp :value="approvedCount" /></b></div>
          <div class="ts"><span>Top boost</span><b class="ts-top"><PayMoneyValue :value="topIncentive" short tone="net" /></b></div>
        </div>
      </div>

      <!-- equalizer / RPM energy meter -->
      <div class="eq" :class="{ live: approvedCount > 0 }" aria-hidden="true">
        <span v-for="b in 24" :key="b" class="eq-bar" :class="{ lit: b <= litCount }"
          :style="{ '--i': b, animationDelay: (b * 0.06) + 's' }" />
        <span class="eq-redline" :style="{ left: redlinePct + '%' }" />
        <span class="eq-cap">{{ litCount }}/24 energy</span>
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
          <input v-model="q" placeholder="Find performer…" @focus="searchFocused = true"
            @blur="searchFocused = false" @keyup.enter="() => { page = 1; reload() }" />
        </div>
        <Motion as="button" class="add-cta" @click="modalOpen = true"
          :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }">
          <span class="cta-sweep" aria-hidden="true" /><Zap :size="15" /> Add incentive
        </Motion>
      </div>
    </Motion>

    <!-- ░░░░░░░░░░ LEADERBOARD ░░░░░░░░░░ -->
    <div v-if="loading" class="tower">
      <div v-for="i in 6" :key="i" class="lane-skel">
        <span class="pay-skel" style="width:34px;height:34px;border-radius:10px" />
        <div style="flex:1"><div class="pay-skel" style="height:14px;width:40%" /><div class="pay-skel" style="height:10px;width:100%;margin-top:10px;border-radius:99px" /></div>
      </div>
    </div>

    <PayEmptyState v-else-if="!items.length" :icon="Gauge"
      :title="status || q ? 'No incentives match this filter' : 'No incentives yet'"
      :sub="status || q ? 'Clear the filter or search to see the full board.' : 'Add a performance incentive to put it on the board.'">
      <button class="add-cta plain" @click="modalOpen = true"><Zap :size="15" /> Add incentive</button>
    </PayEmptyState>

    <transition :name="`tower-${pgDir}`" mode="out-in">
      <div v-if="items.length" :key="page" class="tower">
        <Motion v-for="(a, i) in ranked" :key="a.id" as="article" class="lane"
          :class="[`t-${subTone(a.sub_type)}`, statusClass(a.status), { igniting: sealId === a.id, podium: i < 3 }]"
          :initial="{ opacity: 0, x: -28 }" :animate="{ opacity: 1, x: 0 }"
          :transition="{ delay: Math.min(i * 0.055, 0.45), duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
          <span class="lane-flare" v-if="sealId === a.id" aria-hidden="true" />

          <!-- rank -->
          <span class="rank" :class="{ medal: i < 3 }">
            <component v-if="i < 3" :is="Trophy" :size="15" />
            <template v-else>{{ (page - 1) * limit + i + 1 }}</template>
          </span>

          <div class="lane-main">
            <div class="lane-head">
              <div class="lh-who">
                <span class="lh-name">{{ a.employee_name || a.employee_code }}</span>
                <span class="lh-type" :class="`t-${subTone(a.sub_type)}`"><component :is="subIcon(a.sub_type)" :size="11" /> {{ a.sub_type || 'Incentive' }}</span>
                <span class="lh-period">{{ periodLabel(a) }}</span>
              </div>
              <div class="lh-right">
                <span class="latch" :class="statusClass(a.status)"><span class="latch-dot" />{{ adjStatusMeta(a.status).label }}</span>
                <div class="lane-actions">
                  <Motion v-if="a.status === 'DRAFT'" as="button" class="act ok" title="Approve · ignite"
                    :whileHover="{ scale: 1.14 }" :whileTap="{ scale: 0.9 }" @click="approve(a)"><Check :size="14" /></Motion>
                  <Motion v-if="a.status === 'DRAFT' || a.status === 'APPROVED'" as="button" class="act warn" title="Cancel"
                    :whileHover="{ scale: 1.14 }" :whileTap="{ scale: 0.9 }" @click="askCancel(a)"><Ban :size="14" /></Motion>
                  <Motion v-if="a.status === 'DRAFT'" as="button" class="act danger" title="Delete"
                    :whileHover="{ scale: 1.14 }" :whileTap="{ scale: 0.9 }" @click="askDelete(a)"><Trash2 :size="14" /></Motion>
                  <span v-if="a.status === 'PAID' || a.status === 'CANCELLED'" class="act-lock"><Lock :size="13" /></span>
                </div>
              </div>
            </div>

            <!-- surge bar -->
            <div class="surge">
              <div class="surge-track">
                <Motion class="surge-fill" as="span"
                  :initial="{ scaleX: 0 }" :animate="{ scaleX: barPct(a) }"
                  :transition="{ duration: 0.9, delay: 0.2 + Math.min(i * 0.055, 0.45), ease: [0.16, 1, 0.3, 1] }">
                  <span class="surge-speed" aria-hidden="true" />
                  <span class="surge-tip" aria-hidden="true" />
                </Motion>
              </div>
              <PayMoneyValue class="surge-amt" :value="a.amount" tone="net" />
            </div>
          </div>
        </Motion>
      </div>
    </transition>

    <!-- ░░░░░░░░░░ RPM PAGINATION ░░░░░░░░░░ -->
    <Motion v-if="!loading && total > 0" as="nav" class="rpm"
      :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }">
      <span class="rpm-readout">AWARDS <strong>{{ rangeLabel }}</strong> / {{ total }}</span>
      <div class="rpm-mid">
        <Motion as="button" class="rev nav" :disabled="page <= 1" @click="go(page - 1)"
          :whileTap="{ scale: 0.85, x: -3 }"><ChevronLeft :size="16" /></Motion>
        <div class="notches">
          <button v-for="p in windowPages" :key="p" class="notch" :class="{ on: p === page }" @click="go(p)">
            <span class="notch-bar" /><span class="notch-num">{{ p }}</span>
          </button>
        </div>
        <Motion as="button" class="rev nav" :disabled="page >= totalPages" @click="go(page + 1)"
          :whileTap="{ scale: 0.85, x: 3 }"><ChevronRight :size="16" /></Motion>
      </div>
      <div class="rpm-size">
        <span>per page</span>
        <button v-for="n in sizes" :key="n" class="sz" :class="{ on: n === limit }" @click="setSize(n)">{{ n }}</button>
      </div>
    </Motion>

    <!-- ░░░░░░░░░░ MODALS ░░░░░░░░░░ -->
    <PayAdjustmentModal :open="modalOpen" kind="INCENTIVE" @close="modalOpen = false" @saved="onSaved" />
    <PayAdjustmentDeleteModal :open="del.open" :item="del.item" kind-label="Incentive" :busy="del.busy"
      @close="del.open = false" @confirm="doDelete" />
    <PayAdjustmentCancelModal :open="cnl.open" :item="cnl.item" kind-label="Incentive" :run-label="runLabel" :busy="cnl.busy"
      @close="cnl.open = false" @confirm="doCancel" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  Gauge, Zap, Search, Check, Ban, Trash2, Lock, ChevronLeft, ChevronRight,
  Trophy, Target, Users, CalendarCheck, Share2,
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

const items = ref([]); const total = ref(0); const loading = ref(false)
const status = ref(null); const page = ref(1); const limit = ref(10); const q = ref('')
const sizes = [10, 25, 50]
const modalOpen = ref(false)
const searchFocused = ref(false)
const sealId = ref(null)
const pgDir = ref('fwd')

/* hero aggregates */
const approvedSum = ref(0); const approvedCount = ref(0); const draftCount = ref(0); const topIncentive = ref(0)
const litCount = computed(() => {
  const denom = approvedCount.value + draftCount.value
  if (!denom) return 0
  return Math.max(1, Math.round((approvedCount.value / denom) * 24))
})
const redlinePct = computed(() => Math.min(100, (litCount.value / 24) * 100))

/* status filter */
const statusOpts = [
  { v: null, label: 'All', cls: 'all' },
  { v: 'DRAFT', label: 'Draft', cls: 'draft' },
  { v: 'APPROVED', label: 'Approved', cls: 'approved' },
  { v: 'PAID', label: 'Paid', cls: 'paid' },
  { v: 'CANCELLED', label: 'Cancelled', cls: 'cancelled' },
]

/* sub-type identity (INCENTIVE: Sales / Recruitment / Attendance / Referral) */
const SUB = {
  'Sales':       { icon: Target,        tone: 'amber' },
  'Recruitment': { icon: Users,         tone: 'net' },
  'Attendance':  { icon: CalendarCheck, tone: 'gold' },
  'Referral':    { icon: Share2,        tone: 'ember' },
}
const subIcon = (s) => (SUB[s]?.icon) || Zap
const subTone = (s) => (SUB[s]?.tone) || 'gold'
const statusClass = (s) => ({ DRAFT: 'draft', APPROVED: 'approved', PAID: 'paid', CANCELLED: 'cancelled' }[s] || 'draft')
const periodLabel = (a) => a.period_month ? `${monthLabel(a.period_month)} ${a.period_year}` : 'Next run'

/* leaderboard: rank by amount within the loaded page */
const ranked = computed(() => [...items.value].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0)))
const maxAmt = computed(() => ranked.value.reduce((m, a) => Math.max(m, Number(a.amount || 0)), 0))
const barPct = (a) => { const m = maxAmt.value; if (!m) return 0; return Math.max(0.08, Number(a.amount || 0) / m) }

/* pagination */
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))
const windowStart = computed(() => Math.max(1, Math.min(page.value - 2, totalPages.value - 4)))
const windowPages = computed(() => { const end = Math.min(totalPages.value, windowStart.value + 4); const out = []; for (let i = windowStart.value; i <= end; i++) out.push(i); return out })
const rangeLabel = computed(() => { if (!total.value) return '0'; const a = (page.value - 1) * limit.value + 1; return `${a}–${Math.min(page.value * limit.value, total.value)}` })

/* load */
const reload = async () => {
  loading.value = true
  try {
    const res = await fetchAdjustments({ adjustment_type: 'INCENTIVE', status: status.value || undefined,
      skip: (page.value - 1) * limit.value, limit: limit.value })
    items.value = res.items || []; total.value = res.total || 0
  } catch { toast.error('Failed to load') }
  finally { loading.value = false }
}
const loadMeter = async () => {
  try {
    const [ap, dr] = await Promise.all([
      fetchAdjustments({ adjustment_type: 'INCENTIVE', status: 'APPROVED', limit: 200 }),
      fetchAdjustments({ adjustment_type: 'INCENTIVE', status: 'DRAFT', limit: 1 }),
    ])
    approvedCount.value = ap.total || 0
    approvedSum.value = (ap.items || []).reduce((s, x) => s + Number(x.amount || 0), 0)
    topIncentive.value = (ap.items || []).reduce((m, x) => Math.max(m, Number(x.amount || 0)), 0)
    draftCount.value = dr.total || 0
  } catch { /* non-fatal */ }
}

const setStatus = (s) => { status.value = s; page.value = 1; reload() }
const go = (p) => { if (p < 1 || p > totalPages.value || p === page.value) return; pgDir.value = p > page.value ? 'fwd' : 'back'; page.value = p; reload() }
const setSize = (n) => { limit.value = n; page.value = 1; reload() }
const onSaved = () => { reload(); loadMeter(); emit('refresh-stats') }

const approve = async (a) => {
  sealId.value = a.id
  try {
    await approveAdjustment(a.id)
    toast.success('Incentive ignited · added to payout')
    await Promise.all([reload(), loadMeter()]); emit('refresh-stats')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed') }
  finally { setTimeout(() => { sealId.value = null }, 700) }
}

const del = ref({ open: false, item: null, busy: false })
const cnl = ref({ open: false, item: null, busy: false })
const askDelete = (a) => { del.value = { open: true, item: a, busy: false } }
const askCancel = (a) => { cnl.value = { open: true, item: a, busy: false } }
const doDelete = async ({ reason, note }) => {
  del.value.busy = true
  try { await deleteAdjustment(del.value.item.id, { reason, note }); toast.success('Incentive deleted'); del.value.open = false; await Promise.all([reload(), loadMeter()]); emit('refresh-stats') }
  catch (e) { toast.error(e?.response?.data?.detail || 'Delete failed') } finally { del.value.busy = false }
}
const doCancel = async ({ reason, note }) => {
  cnl.value.busy = true
  try { await cancelAdjustment(cnl.value.item.id, { reason, note }); toast.success('Incentive cancelled'); cnl.value.open = false; await Promise.all([reload(), loadMeter()]); emit('refresh-stats') }
  catch (e) { toast.error(e?.response?.data?.detail || 'Cancel failed') } finally { cnl.value.busy = false }
}

onMounted(() => { reload(); loadMeter() })
</script>

<style scoped>
.boost { display: flex; flex-direction: column; gap: 18px; padding-top: 8px; }

/* ░░░░░░░░░░ TELEMETRY HERO ░░░░░░░░░░ */
.telemetry { position: relative; overflow: hidden; isolation: isolate; display: flex; align-items: center; gap: 28px;
  flex-wrap: wrap; justify-content: space-between; padding: 24px 26px; border-radius: 22px;
  background: linear-gradient(150deg, var(--pay-surface), var(--pay-surface-2));
  border: 1px solid var(--pay-border-soft); box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset, 0 18px 50px -34px rgba(0,0,0,0.8); }
.telemetry::before { content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1px; pointer-events: none; opacity: 0.7;
  background: linear-gradient(140deg, rgba(245,158,11,0.5), transparent 38%, transparent 62%, rgba(234,88,12,0.32));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; }
.tele-grid { position: absolute; inset: 0; z-index: -1; opacity: 0.4; pointer-events: none;
  background-image: linear-gradient(var(--pay-border-soft) 1px, transparent 1px), linear-gradient(90deg, var(--pay-border-soft) 1px, transparent 1px);
  background-size: 26px 26px; -webkit-mask: radial-gradient(130% 90% at 100% 0%, #000, transparent 70%); mask: radial-gradient(130% 90% at 100% 0%, #000, transparent 70%); }
.tele-info { min-width: 0; flex: 1; }
.eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 10px; font-weight: 800; letter-spacing: 0.13em; color: var(--pay-treasury); }
.eyebrow svg { color: var(--pay-amber); }
.tele-title { margin: 7px 0 0; font-size: 28px; font-weight: 850; letter-spacing: -0.01em; }
.tele-sub { margin: 8px 0 0; font-size: 12.5px; color: var(--pay-text-2); max-width: 46ch; line-height: 1.5; }
.tele-stats { display: flex; flex-wrap: wrap; gap: 22px; margin-top: 16px; }
.ts { display: flex; flex-direction: column; gap: 3px; }
.ts span { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--pay-text-muted); }
.ts b { font-family: var(--pay-mono); font-size: 18px; font-weight: 800; color: var(--pay-text); }
.ts b.ts-net, .ts b.ts-top { color: var(--pay-net); }

/* equalizer */
.eq { position: relative; flex: none; display: flex; align-items: flex-end; gap: 4px; height: 92px; padding: 14px 16px 26px;
  border-radius: 14px; background: var(--pay-surface); border: 1px solid var(--pay-border-soft);
  box-shadow: inset 0 0 30px rgba(0,0,0,0.3); }
.eq-bar { width: 7px; height: 60%; border-radius: 3px; transform-origin: bottom; background: var(--pay-border);
  animation: eq-bounce 1.3s ease-in-out infinite; }
.eq.live .eq-bar.lit { background: linear-gradient(180deg, var(--pay-mint-bright), var(--pay-amber), var(--pay-ember));
  box-shadow: 0 0 8px -1px rgba(245,158,11,0.6); }
.eq-redline { position: absolute; top: 8px; bottom: 22px; width: 2px; background: var(--pay-net);
  box-shadow: 0 0 8px var(--pay-net); transition: left 0.8s var(--pay-ease); }
.eq-cap { position: absolute; left: 0; right: 0; bottom: 8px; text-align: center; font-family: var(--pay-mono);
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

/* ░░░░░░░░░░ LEADERBOARD ░░░░░░░░░░ */
.tower { display: flex; flex-direction: column; gap: 10px; }
.lane-skel { display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-radius: 14px;
  background: var(--pay-surface); border: 1px solid var(--pay-border-soft); }

.lane { --accent: var(--pay-treasury); position: relative; overflow: hidden; isolation: isolate;
  display: flex; align-items: center; gap: 14px; padding: 13px 16px; border-radius: 14px;
  background: linear-gradient(100deg, var(--pay-surface), var(--pay-surface-2)); border: 1px solid var(--pay-border-soft);
  box-shadow: 0 1px 0 rgba(255,255,255,0.03) inset, 0 10px 26px -22px rgba(0,0,0,0.7);
  transition: transform 0.3s var(--pay-ease), border-color 0.3s var(--pay-ease), box-shadow 0.3s var(--pay-ease); }
.lane.t-amber { --accent: var(--pay-amber); } .lane.t-net { --accent: var(--pay-net); }
.lane.t-gold { --accent: var(--pay-treasury); } .lane.t-ember { --accent: var(--pay-ember); } .lane.t-mint { --accent: var(--pay-mint); }
.lane:hover { transform: translateX(3px); border-color: var(--accent); box-shadow: 0 1px 0 rgba(255,255,255,0.05) inset, 0 16px 36px -24px color-mix(in srgb, var(--accent) 55%, transparent); }
.lane.cancelled { opacity: 0.6; }
.lane-flare { position: absolute; inset: 0; z-index: 5; pointer-events: none;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent) 40%, transparent), transparent);
  transform: translateX(-100%); animation: ignite 0.7s var(--pay-ease) forwards; }

.rank { flex: none; width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center;
  font-family: var(--pay-mono); font-size: 13px; font-weight: 800; color: var(--pay-text-2);
  background: var(--pay-surface); border: 1px solid var(--pay-border-soft); }
.rank.medal { color: #1a1206; background: var(--pay-grad-coin); border-color: transparent;
  box-shadow: 0 4px 12px -5px rgba(245,158,11,0.6); }
.lane.podium:nth-child(2) .rank.medal { background: linear-gradient(135deg, #fde68a, #d6d3cd, #b8860b); }
.lane.podium:nth-child(3) .rank.medal { background: linear-gradient(135deg, #f0b27a, #c2410c, #8a5a06); color: #fff2dd; }

.lane-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 9px; }
.lane-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.lh-who { display: flex; align-items: center; gap: 9px; min-width: 0; flex-wrap: wrap; }
.lh-name { color: var(--pay-text); font-weight: 700; font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lh-type { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 6px;
  color: var(--accent); background: color-mix(in srgb, var(--accent) 13%, transparent); }
.lh-period { font-family: var(--pay-mono); font-size: 10.5px; color: var(--pay-text-muted); }
.lh-right { display: flex; align-items: center; gap: 10px; flex: none; }
.latch { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px; border-radius: 999px; font-family: var(--pay-mono); font-size: 9.5px; font-weight: 700; }
.latch-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.latch.draft { color: var(--pay-st-draft); background: rgba(253,224,71,0.12); }
.latch.approved { color: var(--pay-amber); background: rgba(245,158,11,0.13); }
.latch.paid { color: var(--pay-statutory); background: var(--pay-statutory-soft); }
.latch.cancelled { color: var(--pay-st-cancelled); background: rgba(156,163,175,0.12); text-decoration: line-through; }

.lane-actions { display: flex; gap: 6px; opacity: 0; transform: translateX(6px); transition: opacity 0.22s var(--pay-ease), transform 0.22s var(--pay-ease); }
.lane:hover .lane-actions, .lane:focus-within .lane-actions { opacity: 1; transform: translateX(0); }
.act { width: 30px; height: 30px; border-radius: 9px; border: 1px solid var(--pay-border-soft); background: var(--pay-surface-2); color: var(--pay-text-2); cursor: pointer; display: grid; place-items: center; }
.act.ok:hover { color: var(--pay-net); border-color: color-mix(in srgb, var(--pay-net) 40%, transparent); }
.act.warn:hover { color: var(--pay-amber); border-color: var(--pay-border); }
.act.danger:hover { color: var(--pay-deduction); border-color: color-mix(in srgb, var(--pay-deduction) 40%, transparent); }
.act-lock { width: 30px; height: 30px; display: grid; place-items: center; color: var(--pay-text-muted); opacity: 0.5; }

/* surge bar */
.surge { display: flex; align-items: center; gap: 12px; }
.surge-track { flex: 1; height: 10px; border-radius: 99px; background: var(--pay-surface); overflow: hidden;
  border: 1px solid var(--pay-border-soft); position: relative; }
.surge-fill { display: block; height: 100%; width: 100%; transform-origin: left center; border-radius: 99px; position: relative;
  background: linear-gradient(90deg, color-mix(in srgb, var(--accent) 70%, var(--pay-treasury)), var(--accent)); }
.surge-speed { position: absolute; inset: 0; border-radius: 99px;
  background: repeating-linear-gradient(110deg, transparent 0 8px, rgba(255,255,255,0.18) 8px 11px);
  animation: speed-flow 0.7s linear infinite; }
.surge-tip { position: absolute; right: 0; top: 50%; transform: translateY(-50%); width: 5px; height: 14px; border-radius: 3px;
  background: var(--pay-mint-bright); box-shadow: 0 0 10px var(--pay-mint-bright); }
.surge-amt { flex: none; font-size: 15px; min-width: 76px; text-align: right; }

/* RPM pagination */
.rpm { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-top: 4px;
  padding: 12px 18px; border-radius: 16px; background: linear-gradient(150deg, var(--pay-surface), var(--pay-surface-2));
  border: 1px solid var(--pay-border-soft); }
.rpm-readout { font-family: var(--pay-mono); font-size: 11px; color: var(--pay-text-muted); }
.rpm-readout strong { color: var(--pay-text); }
.rpm-mid { display: inline-flex; align-items: center; gap: 8px; }
.rev { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 10px; border: 1px solid var(--pay-border-soft);
  background: var(--pay-surface-2); color: var(--pay-text-2); cursor: pointer; transition: border-color 0.2s, color 0.2s; }
.rev:hover:not(:disabled) { border-color: var(--pay-border); color: var(--pay-text); }
.rev:disabled { opacity: 0.35; cursor: not-allowed; }
.notches { display: inline-flex; align-items: flex-end; gap: 5px; padding: 4px 6px; border-radius: 11px;
  background: var(--pay-surface); border: 1px solid var(--pay-border-soft); }
.notch { position: relative; display: flex; flex-direction: column; align-items: center; gap: 3px; width: 26px; padding: 4px 0;
  border: none; background: transparent; cursor: pointer; }
.notch-bar { width: 100%; height: 4px; border-radius: 2px; background: var(--pay-border); transition: 0.3s var(--pay-ease); }
.notch-num { font-family: var(--pay-mono); font-size: 11px; font-weight: 700; color: var(--pay-text-muted); transition: color 0.25s; }
.notch:hover .notch-num { color: var(--pay-text); }
.notch.on .notch-bar { height: 16px; background: linear-gradient(180deg, var(--pay-mint-bright), var(--pay-amber), var(--pay-ember));
  box-shadow: 0 0 10px -1px rgba(245,158,11,0.7); }
.notch.on .notch-num { color: var(--pay-treasury); }
.rpm-size { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--pay-text-muted); }
.sz { padding: 5px 10px; border-radius: 9px; border: 1px solid var(--pay-border-soft); background: var(--pay-surface-2); color: var(--pay-text-2); cursor: pointer; font-family: var(--pay-mono); font-size: 11px; }
.sz.on { color: var(--pay-treasury); border-color: var(--pay-border); background: rgba(251,191,36,0.12); }

/* page transition */
.tower-fwd-enter-active, .tower-back-enter-active, .tower-fwd-leave-active, .tower-back-leave-active { transition: opacity 0.3s var(--pay-ease), transform 0.3s var(--pay-ease); }
.tower-fwd-enter-from { opacity: 0; transform: translateX(30px); } .tower-fwd-leave-to { opacity: 0; transform: translateX(-30px); }
.tower-back-enter-from { opacity: 0; transform: translateX(-30px); } .tower-back-leave-to { opacity: 0; transform: translateX(30px); }

/* keyframes */
@keyframes eq-bounce { 0%,100% { transform: scaleY(0.4); } 50% { transform: scaleY(1); } }
@keyframes speed-flow { to { background-position: 22px 0; } }
@keyframes ignite { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }

/* ░░░░░░░░░░ RESPONSIVE ░░░░░░░░░░ */
@media (max-width: 720px) {
  .telemetry { justify-content: center; } .eq { width: 100%; justify-content: space-between; }
  .lane-head { flex-direction: column; align-items: flex-start; gap: 8px; }
  .lane-actions { opacity: 1; transform: none; }
}

/* ░░░░░░░░░░ LIGHT THEME ░░░░░░░░░░ */
[data-theme="light"] .chip.on, [data-theme="light"] .add-cta { color: #2a1a06; }
[data-theme="light"] .rank.medal { color: #2a1a06; }
[data-theme="light"] .eq { box-shadow: inset 0 0 22px rgba(120,90,40,0.12); }
[data-theme="light"] .latch.cancelled { color: #8a734f; }

/* ░░░░░░░░░░ REDUCED MOTION ░░░░░░░░░░ */
@media (prefers-reduced-motion: reduce) {
  .eq-bar, .surge-speed, .lane-flare, .add-cta:hover .cta-sweep { animation: none !important; }
  .eq-bar { transform: scaleY(0.7); }
  .lane:hover { transform: none; }
}
</style>
