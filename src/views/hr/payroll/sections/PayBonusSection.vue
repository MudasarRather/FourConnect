<template>
  <div class="gala">
    <!-- ░░░░░░░░░░ REWARD RESERVOIR (hero) ░░░░░░░░░░ -->
    <Motion as="header" class="reservoir"
      :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
      <div class="res-info">
        <span class="eyebrow"><Sparkles :size="12" /> REWARD POOL · {{ runLabel }}</span>
        <h2 class="res-title">Bonus Gala</h2>
        <p class="res-sub">Approved bonuses pour into the pool and post to the next pay run. Award, seal, celebrate.</p>
        <div class="res-stats">
          <div class="rs"><span>Pool (approved)</span><b class="rs-pool"><PayMoneyValue :value="approvedSum" short tone="net" /></b></div>
          <div class="rs"><span>Awards queued</span><b><PayCountUp :value="approvedCount" /></b></div>
          <div class="rs"><span>Drafts pending</span><b class="rs-draft"><PayCountUp :value="draftCount" /></b></div>
        </div>
      </div>

      <!-- liquid-gold vessel -->
      <div class="vessel" :class="{ live: approvedCount > 0 }">
        <span class="vessel-glow" :key="poolKey" aria-hidden="true" />
        <div class="water" :style="{ height: fillPct + '%' }" aria-hidden="true">
          <span class="wave w1" /><span class="wave w2" />
          <span v-for="s in 5" :key="s" class="spark" :style="{ '--x': (s*17 + 6) + '%', '--d': (s*0.5) + 's' }" />
        </div>
        <div class="vessel-face">
          <span class="vf-pct pay-foil-text">{{ Math.round(fillPct) }}%</span>
          <span class="vf-lbl">approved of staged</span>
        </div>
        <div class="vessel-ticks" aria-hidden="true"><i v-for="t in 4" :key="t" /></div>
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
        <Motion as="button" class="award-cta" @click="modalOpen = true"
          :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }">
          <span class="ribbon-l" aria-hidden="true" /><Award :size="15" /> Award bonus
        </Motion>
      </div>
    </Motion>

    <!-- ░░░░░░░░░░ MEDALLION GALLERY ░░░░░░░░░░ -->
    <div v-if="loading" class="medals">
      <div v-for="i in 6" :key="i" class="medal-skel">
        <div class="pay-skel" style="height:62px;width:62px;border-radius:50%;margin:0 auto" />
        <div class="pay-skel" style="height:14px;width:60%;margin:14px auto 0" />
        <div class="pay-skel" style="height:24px;width:50%;margin:10px auto 0" />
      </div>
    </div>

    <PayEmptyState v-else-if="!items.length" :icon="Award"
      :title="status || q ? 'No bonuses match this filter' : 'No bonuses awarded yet'"
      :sub="status || q ? 'Clear the filter or search to see all awards.' : 'Award a bonus to drop it into the reward pool.'">
      <button class="award-cta plain" @click="modalOpen = true"><Award :size="15" /> Award bonus</button>
    </PayEmptyState>

    <transition :name="`gala-${pgDir}`" mode="out-in">
      <div v-if="items.length" :key="page" class="medals">
        <Motion v-for="(a, i) in items" :key="a.id" as="article" class="medal"
          :class="[`t-${subTone(a.sub_type)}`, statusClass(a.status), { sealing: sealId === a.id }]"
          :initial="{ opacity: 0, y: 26, scale: 0.85, rotate: -6 }"
          :animate="{ opacity: 1, y: 0, scale: 1, rotate: 0 }"
          :transition="{ type: 'spring', stiffness: 220, damping: 20, delay: Math.min(i * 0.06, 0.5) }"
          @pointermove="spot" @pointerleave="unspot">
          <span class="m-spot" aria-hidden="true" />
          <span v-if="a.status === 'APPROVED' || a.status === 'PAID'" class="m-award" aria-hidden="true">{{ a.status === 'PAID' ? 'PAID' : 'AWARDED' }}</span>
          <span v-if="sealId === a.id" class="burst" aria-hidden="true"><i v-for="b in 8" :key="b" :style="{ '--a': (b*45) + 'deg' }" /></span>

          <!-- medal -->
          <div class="disc">
            <span class="disc-ring" aria-hidden="true" />
            <span class="disc-core"><component :is="subIcon(a.sub_type)" :size="24" /></span>
            <span class="disc-ribbon" aria-hidden="true"><i /><i /></span>
          </div>

          <div class="m-type">{{ a.sub_type || 'Bonus' }}</div>
          <div class="m-name">{{ a.employee_name || a.employee_code }}</div>
          <div class="m-code">{{ a.employee_code }}</div>

          <div class="m-amt"><PayMoneyValue :value="a.amount" tone="net" /></div>
          <div class="m-meta">
            <span class="m-period"><CalendarClock :size="11" /> {{ periodLabel(a) }}</span>
            <span class="latch" :class="statusClass(a.status)"><span class="latch-dot" />{{ adjStatusMeta(a.status).label }}</span>
          </div>
          <div v-if="a.reason" class="m-reason">{{ a.reason }}</div>

          <div class="m-actions">
            <Motion v-if="a.status === 'DRAFT'" as="button" class="act ok" title="Approve · add to pool"
              :whileHover="{ scale: 1.14 }" :whileTap="{ scale: 0.9 }" @click="approve(a)"><Check :size="14" /></Motion>
            <Motion v-if="a.status === 'DRAFT' || a.status === 'APPROVED'" as="button" class="act warn" title="Cancel"
              :whileHover="{ scale: 1.14 }" :whileTap="{ scale: 0.9 }" @click="askCancel(a)"><Ban :size="14" /></Motion>
            <Motion v-if="a.status === 'DRAFT'" as="button" class="act danger" title="Delete"
              :whileHover="{ scale: 1.14 }" :whileTap="{ scale: 0.9 }" @click="askDelete(a)"><Trash2 :size="14" /></Motion>
            <span v-if="a.status === 'PAID' || a.status === 'CANCELLED'" class="act-lock"><Lock :size="13" /></span>
          </div>
        </Motion>
      </div>
    </transition>

    <!-- ░░░░░░░░░░ COIN-REEL PAGINATION ░░░░░░░░░░ -->
    <Motion v-if="!loading && total > 0" as="nav" class="reel"
      :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }">
      <span class="reel-readout">AWARDS <strong>{{ rangeLabel }}</strong> / {{ total }}</span>
      <div class="reel-mid">
        <Motion as="button" class="coin nav" :disabled="page <= 1" @click="go(page - 1)"
          :whileTap="{ scale: 0.85, rotate: -20 }"><ChevronLeft :size="16" /></Motion>
        <button v-for="p in windowPages" :key="p" class="coin" :class="{ on: p === page }" @click="go(p)">
          <span class="coin-face">{{ p }}</span>
        </button>
        <Motion as="button" class="coin nav" :disabled="page >= totalPages" @click="go(page + 1)"
          :whileTap="{ scale: 0.85, rotate: 20 }"><ChevronRight :size="16" /></Motion>
      </div>
      <div class="reel-size">
        <span>per page</span>
        <button v-for="n in sizes" :key="n" class="sz" :class="{ on: n === limit }" @click="setSize(n)">{{ n }}</button>
      </div>
    </Motion>

    <!-- ░░░░░░░░░░ MODALS ░░░░░░░░░░ -->
    <PayAdjustmentModal :open="modalOpen" kind="BONUS" @close="modalOpen = false" @saved="onSaved" />
    <PayAdjustmentDeleteModal :open="del.open" :item="del.item" kind-label="Bonus" :busy="del.busy"
      @close="del.open = false" @confirm="doDelete" />
    <PayAdjustmentCancelModal :open="cnl.open" :item="cnl.item" kind-label="Bonus" :run-label="runLabel" :busy="cnl.busy"
      @close="cnl.open = false" @confirm="doCancel" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  Sparkles, Award, Search, Check, Ban, Trash2, Lock, ChevronLeft, ChevronRight,
  CalendarClock, PartyPopper, Trophy, UserPlus, HeartHandshake, Flag, Gift,
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

/* reservoir aggregates */
const approvedSum = ref(0); const approvedCount = ref(0)
const draftSum = ref(0); const draftCount = ref(0)
const poolKey = ref(0)
const fillPct = computed(() => {
  const denom = approvedCount.value + draftCount.value
  if (!denom) return 0
  return Math.max(6, Math.min(100, (approvedCount.value / denom) * 100))
})

/* status filter */
const statusOpts = [
  { v: null, label: 'All', cls: 'all' },
  { v: 'DRAFT', label: 'Draft', cls: 'draft' },
  { v: 'APPROVED', label: 'Approved', cls: 'approved' },
  { v: 'PAID', label: 'Paid', cls: 'paid' },
  { v: 'CANCELLED', label: 'Cancelled', cls: 'cancelled' },
]

/* sub-type medal identity */
const SUB = {
  'Festival':           { icon: PartyPopper,   tone: 'amber' },
  'Performance':        { icon: Trophy,        tone: 'net' },
  'Joining':            { icon: UserPlus,      tone: 'gold' },
  'Retention':          { icon: HeartHandshake,tone: 'ember' },
  'Project Completion': { icon: Flag,          tone: 'mint' },
}
const subIcon = (s) => (SUB[s]?.icon) || Gift
const subTone = (s) => (SUB[s]?.tone) || 'gold'
const statusClass = (s) => ({ DRAFT: 'draft', APPROVED: 'approved', PAID: 'paid', CANCELLED: 'cancelled' }[s] || 'draft')
const periodLabel = (a) => a.period_month ? `${monthLabel(a.period_month)} ${a.period_year}` : 'Next run'

/* cursor spotlight */
const spot = (e) => { const el = e.currentTarget, r = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${e.clientX - r.left}px`); el.style.setProperty('--my', `${e.clientY - r.top}px`); el.style.setProperty('--sp', '1') }
const unspot = (e) => e.currentTarget.style.setProperty('--sp', '0')

/* pagination */
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))
const windowStart = computed(() => Math.max(1, Math.min(page.value - 2, totalPages.value - 4)))
const windowPages = computed(() => {
  const end = Math.min(totalPages.value, windowStart.value + 4); const out = []
  for (let i = windowStart.value; i <= end; i++) out.push(i); return out
})
const rangeLabel = computed(() => {
  if (!total.value) return '0'
  const a = (page.value - 1) * limit.value + 1
  return `${a}–${Math.min(page.value * limit.value, total.value)}`
})

/* load */
const reload = async () => {
  loading.value = true
  try {
    const res = await fetchAdjustments({ adjustment_type: 'BONUS', status: status.value || undefined,
      skip: (page.value - 1) * limit.value, limit: limit.value })
    items.value = res.items || []; total.value = res.total || 0
  } catch { toast.error('Failed to load') }
  finally { loading.value = false }
}
const loadPool = async () => {
  try {
    const [ap, dr] = await Promise.all([
      fetchAdjustments({ adjustment_type: 'BONUS', status: 'APPROVED', limit: 200 }),
      fetchAdjustments({ adjustment_type: 'BONUS', status: 'DRAFT', limit: 200 }),
    ])
    approvedCount.value = ap.total || 0
    approvedSum.value = (ap.items || []).reduce((s, x) => s + Number(x.amount || 0), 0)
    draftCount.value = dr.total || 0
    draftSum.value = (dr.items || []).reduce((s, x) => s + Number(x.amount || 0), 0)
    poolKey.value++
  } catch { /* non-fatal */ }
}

const setStatus = (s) => { status.value = s; page.value = 1; reload() }
const go = (p) => { if (p < 1 || p > totalPages.value || p === page.value) return; pgDir.value = p > page.value ? 'fwd' : 'back'; page.value = p; reload() }
const setSize = (n) => { limit.value = n; page.value = 1; reload() }
const onSaved = () => { reload(); loadPool(); emit('refresh-stats') }

const approve = async (a) => {
  sealId.value = a.id
  try {
    await approveAdjustment(a.id)
    toast.success('Bonus awarded · added to pool')
    await Promise.all([reload(), loadPool()]); emit('refresh-stats')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed') }
  finally { setTimeout(() => { sealId.value = null }, 700) }
}

const del = ref({ open: false, item: null, busy: false })
const cnl = ref({ open: false, item: null, busy: false })
const askDelete = (a) => { del.value = { open: true, item: a, busy: false } }
const askCancel = (a) => { cnl.value = { open: true, item: a, busy: false } }
const doDelete = async ({ reason, note }) => {
  del.value.busy = true
  try { await deleteAdjustment(del.value.item.id, { reason, note }); toast.success('Bonus deleted'); del.value.open = false; await Promise.all([reload(), loadPool()]); emit('refresh-stats') }
  catch (e) { toast.error(e?.response?.data?.detail || 'Delete failed') } finally { del.value.busy = false }
}
const doCancel = async ({ reason, note }) => {
  cnl.value.busy = true
  try { await cancelAdjustment(cnl.value.item.id, { reason, note }); toast.success('Bonus cancelled'); cnl.value.open = false; await Promise.all([reload(), loadPool()]); emit('refresh-stats') }
  catch (e) { toast.error(e?.response?.data?.detail || 'Cancel failed') } finally { cnl.value.busy = false }
}

onMounted(() => { reload(); loadPool() })
</script>

<style scoped>
.gala { display: flex; flex-direction: column; gap: 18px; padding-top: 8px; }

/* ░░░░░░░░░░ RESERVOIR ░░░░░░░░░░ */
.reservoir { position: relative; overflow: hidden; isolation: isolate; display: flex; align-items: center; gap: 26px;
  flex-wrap: wrap; justify-content: space-between; padding: 24px 26px; border-radius: 22px;
  background: linear-gradient(150deg, var(--pay-surface), var(--pay-surface-2));
  border: 1px solid var(--pay-border-soft); box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset, 0 18px 50px -34px rgba(0,0,0,0.8); }
.reservoir::before { content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1px; pointer-events: none; opacity: 0.7;
  background: linear-gradient(140deg, rgba(251,191,36,0.5), transparent 38%, transparent 62%, rgba(184,134,11,0.32));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; }
.res-info { min-width: 0; flex: 1; }
.eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 10px; font-weight: 800; letter-spacing: 0.13em; color: var(--pay-treasury); }
.eyebrow svg { color: var(--pay-amber); }
.res-title { margin: 7px 0 0; font-size: 28px; font-weight: 850; letter-spacing: -0.02em; color: var(--pay-text); }
.res-sub { margin: 8px 0 0; font-size: 12.5px; color: var(--pay-text-2); max-width: 44ch; line-height: 1.5; }
.res-stats { display: flex; flex-wrap: wrap; gap: 22px; margin-top: 16px; }
.rs { display: flex; flex-direction: column; gap: 3px; }
.rs span { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--pay-text-muted); }
.rs b { font-family: var(--pay-mono); font-size: 18px; font-weight: 800; color: var(--pay-text); }
.rs b.rs-pool { color: var(--pay-net); } .rs b.rs-draft { color: var(--pay-st-draft); }

/* vessel */
.vessel { position: relative; flex: none; width: 150px; height: 150px; border-radius: 50%;
  background: radial-gradient(circle at 50% 30%, var(--pay-surface), var(--pay-surface-2));
  border: 2px solid var(--pay-border); overflow: hidden; box-shadow: inset 0 0 40px rgba(0,0,0,0.4), 0 12px 36px -18px rgba(245,158,11,0.4); }
.vessel-glow { position: absolute; inset: -20%; z-index: 0; pointer-events: none; opacity: 0;
  background: radial-gradient(closest-side, rgba(251,191,36,0.3), transparent 70%); }
.vessel.live .vessel-glow { animation: pool-bloom 1.6s var(--pay-ease); opacity: 0.7; }
.water { position: absolute; left: 0; right: 0; bottom: 0; z-index: 1;
  background: linear-gradient(180deg, rgba(251,191,36,0.92), rgba(234,88,12,0.9));
  transition: height 1.2s cubic-bezier(0.16,1,0.3,1); box-shadow: 0 0 30px rgba(245,158,11,0.5); }
.wave { position: absolute; left: -50%; width: 200%; height: 200%; top: -184%; border-radius: 43% 47% 44% 46%; }
.wave.w1 { background: rgba(253,230,138,0.55); animation: wave-spin 7s linear infinite; }
.wave.w2 { background: rgba(245,158,11,0.5); top: -178%; animation: wave-spin 11s linear infinite reverse; }
.spark { position: absolute; bottom: 6px; left: var(--x); width: 4px; height: 4px; border-radius: 50%;
  background: var(--pay-mint-bright); box-shadow: 0 0 6px var(--pay-mint-bright);
  animation: pool-rise 2.6s ease-in var(--d) infinite; }
.vessel-face { position: absolute; inset: 0; z-index: 2; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; }
.vf-pct { font-family: var(--pay-mono); font-size: 30px; font-weight: 850; line-height: 1; }
.vf-lbl { font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--pay-text-2); margin-top: 3px;
  background: var(--pay-surface-2); padding: 2px 7px; border-radius: 6px; }
.vessel-ticks { position: absolute; inset: 0; z-index: 2; pointer-events: none; }
.vessel-ticks i { position: absolute; right: 8px; width: 8px; height: 1.5px; background: var(--pay-border); }
.vessel-ticks i:nth-child(1){ top: 25%; } .vessel-ticks i:nth-child(2){ top: 42%; }
.vessel-ticks i:nth-child(3){ top: 59%; } .vessel-ticks i:nth-child(4){ top: 76%; }

/* ░░░░░░░░░░ CONTROL DECK ░░░░░░░░░░ */
.deck { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.chips { display: flex; gap: 8px; flex-wrap: wrap; }
.chip { display: inline-flex; align-items: center; gap: 7px; padding: 7px 14px; border-radius: 999px; cursor: pointer;
  border: 1px solid var(--pay-border-soft); background: var(--pay-surface); color: var(--pay-text-2); font-size: 12px; font-weight: 600; }
.chip-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--pay-text-muted); }
.chip-dot.draft { background: var(--pay-st-draft); } .chip-dot.approved { background: var(--pay-amber); }
.chip-dot.paid { background: var(--pay-statutory); } .chip-dot.cancelled { background: var(--pay-st-cancelled); }
.chip-dot.all { background: var(--pay-net); }
.chip.on { color: #1a1206; background: var(--pay-grad-cta); border-color: transparent; box-shadow: 0 6px 16px -8px rgba(234,88,12,0.5); }
.chip.on .chip-dot { background: rgba(26,18,6,0.7); }
.deck-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.search { position: relative; display: flex; align-items: center; gap: 9px; padding: 9px 13px; border-radius: 11px;
  background: var(--pay-surface); border: 1px solid var(--pay-border-soft); color: var(--pay-text-muted);
  transition: border-color 0.3s var(--pay-ease), box-shadow 0.3s var(--pay-ease); min-width: 190px; }
.search.on { border-color: var(--pay-amber); box-shadow: 0 0 0 4px rgba(245,158,11,0.12); }
.search input { background: none; border: none; outline: none; color: var(--pay-text); font-size: 13px; width: 100%; }
.award-cta { position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px;
  border-radius: 11px; border: none; cursor: pointer; background: var(--pay-grad-cta); color: #1a1206; font-weight: 700; font-size: 13px; }
.award-cta.plain { margin-top: 4px; }
.ribbon-l { position: absolute; top: 0; bottom: 0; width: 34%; transform: translateX(-220%);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent); }
.award-cta:hover .ribbon-l { animation: pay-foil-sweep 0.9s var(--pay-ease); }

/* ░░░░░░░░░░ MEDALLION GALLERY ░░░░░░░░░░ */
.medals { display: grid; grid-template-columns: repeat(auto-fill, minmax(232px, 1fr)); gap: 14px; }
.medal-skel { padding: 22px; border-radius: 18px; background: var(--pay-surface); border: 1px solid var(--pay-border-soft); }

.medal { --accent: var(--pay-treasury); position: relative; overflow: hidden; isolation: isolate; text-align: center;
  display: flex; flex-direction: column; align-items: center; padding: 22px 16px 16px; border-radius: 18px;
  background: linear-gradient(170deg, var(--pay-surface), var(--pay-surface-2)); border: 1px solid var(--pay-border-soft);
  box-shadow: 0 1px 0 rgba(255,255,255,0.03) inset, 0 14px 34px -26px rgba(0,0,0,0.7);
  transition: transform 0.35s var(--pay-ease), border-color 0.35s var(--pay-ease), box-shadow 0.35s var(--pay-ease); }
.medal.t-amt, .medal.t-amber { --accent: var(--pay-amber); }
.medal.t-net { --accent: var(--pay-net); }
.medal.t-gold { --accent: var(--pay-treasury); }
.medal.t-ember { --accent: var(--pay-ember); }
.medal.t-mint { --accent: var(--pay-mint); }
.medal:hover { transform: translateY(-5px); border-color: var(--accent); box-shadow: 0 1px 0 rgba(255,255,255,0.05) inset, 0 22px 48px -26px color-mix(in srgb, var(--accent) 55%, transparent); }
.m-spot { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: -1; opacity: var(--sp, 0);
  transition: opacity 0.4s var(--pay-ease);
  background: radial-gradient(180px circle at var(--mx,50%) var(--my,50%), color-mix(in srgb, var(--accent) 22%, transparent), transparent 60%); }
.medal.cancelled { opacity: 0.62; }
.medal.cancelled .disc-core { filter: grayscale(0.6); }

.m-award { position: absolute; top: 12px; right: -28px; z-index: 3; transform: rotate(38deg); width: 110px; text-align: center;
  font-family: var(--pay-mono); font-size: 8.5px; font-weight: 800; letter-spacing: 0.12em; color: #1a1206; padding: 3px 0;
  background: var(--pay-grad-cta); box-shadow: 0 4px 10px -4px rgba(234,88,12,0.5); }
.medal.paid .m-award { background: linear-gradient(135deg, var(--pay-statutory), var(--pay-amber)); color: #fff2dd; }

/* approve spark burst */
.burst { position: absolute; top: 46px; left: 50%; z-index: 4; pointer-events: none; }
.burst i { position: absolute; width: 4px; height: 10px; border-radius: 2px; background: var(--pay-mint-bright);
  transform: rotate(var(--a)) translateY(0); transform-origin: center -2px;
  animation: burst-out 0.7s var(--pay-ease) both; }
@keyframes burst-out { 0% { opacity: 0; transform: rotate(var(--a)) translateY(0) scaleY(0.4); }
  35% { opacity: 1; } 100% { opacity: 0; transform: rotate(var(--a)) translateY(-34px) scaleY(1); } }

/* medal disc */
.disc { position: relative; width: 64px; height: 64px; margin-bottom: 14px; display: grid; place-items: center; }
.disc-ring { position: absolute; inset: -3px; border-radius: 50%; padding: 3px;
  background: conic-gradient(from 0deg, var(--accent), var(--pay-mint-bright), var(--accent), var(--pay-treasury), var(--accent));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude;
  transition: transform 0.8s var(--pay-ease); }
.medal:hover .disc-ring { transform: rotate(180deg); }
.disc-core { width: 56px; height: 56px; border-radius: 50%; display: grid; place-items: center; color: var(--accent);
  background: radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--accent) 22%, var(--pay-surface)), var(--pay-surface-2));
  box-shadow: inset 0 2px 6px rgba(255,255,255,0.15), inset 0 -3px 8px rgba(0,0,0,0.3); position: relative; z-index: 1; }
.disc-ribbon { position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); display: flex; gap: 0; z-index: 0; }
.disc-ribbon i { width: 10px; height: 16px; background: var(--accent); opacity: 0.85; }
.disc-ribbon i:first-child { clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 70%, 0 100%); transform: rotate(-8deg); }
.disc-ribbon i:last-child { clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 70%, 0 100%); transform: rotate(8deg); }

.m-type { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent); }
.m-name { margin-top: 6px; font-size: 14px; font-weight: 700; color: var(--pay-text); max-width: 100%;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.m-code { font-family: var(--pay-mono); font-size: 10.5px; color: var(--pay-text-muted); margin-top: 2px; }
.m-amt { margin-top: 12px; } .m-amt :deep(.pay-money) { font-size: 24px; }
.m-meta { display: flex; align-items: center; gap: 8px; margin-top: 10px; flex-wrap: wrap; justify-content: center; }
.m-period { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; color: var(--pay-text-muted); font-family: var(--pay-mono); }
.latch { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px; border-radius: 999px; font-family: var(--pay-mono);
  font-size: 9.5px; font-weight: 700; }
.latch-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.latch.draft { color: var(--pay-st-draft); background: rgba(253,224,71,0.12); }
.latch.approved { color: var(--pay-amber); background: rgba(245,158,11,0.13); }
.latch.paid { color: var(--pay-statutory); background: var(--pay-statutory-soft); }
.latch.cancelled { color: var(--pay-st-cancelled); background: rgba(156,163,175,0.12); text-decoration: line-through; }
.m-reason { margin-top: 8px; font-size: 11px; color: var(--pay-text-muted); line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.m-actions { display: flex; gap: 7px; margin-top: 14px; opacity: 0; transform: translateY(6px);
  transition: opacity 0.25s var(--pay-ease), transform 0.25s var(--pay-ease); }
.medal:hover .m-actions, .medal:focus-within .m-actions { opacity: 1; transform: translateY(0); }
.act { width: 32px; height: 32px; border-radius: 10px; border: 1px solid var(--pay-border-soft); background: var(--pay-surface-2);
  color: var(--pay-text-2); cursor: pointer; display: grid; place-items: center; }
.act.ok:hover { color: var(--pay-net); border-color: color-mix(in srgb, var(--pay-net) 40%, transparent); }
.act.warn:hover { color: var(--pay-amber); border-color: var(--pay-border); }
.act.danger:hover { color: var(--pay-deduction); border-color: color-mix(in srgb, var(--pay-deduction) 40%, transparent); }
.act-lock { width: 32px; height: 32px; display: grid; place-items: center; color: var(--pay-text-muted); opacity: 0.5; }

/* ░░░░░░░░░░ COIN-REEL PAGINATION ░░░░░░░░░░ */
.reel { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-top: 4px;
  padding: 12px 18px; border-radius: 16px; background: linear-gradient(150deg, var(--pay-surface), var(--pay-surface-2));
  border: 1px solid var(--pay-border-soft); }
.reel-readout { font-family: var(--pay-mono); font-size: 11px; color: var(--pay-text-muted); }
.reel-readout strong { color: var(--pay-text); }
.reel-mid { display: inline-flex; align-items: center; gap: 7px; }
.coin { width: 34px; height: 34px; border-radius: 50%; border: 1px solid var(--pay-border-soft); background: var(--pay-surface-2);
  color: var(--pay-text-2); cursor: pointer; display: grid; place-items: center; font-family: var(--pay-mono); font-size: 12px; font-weight: 700;
  transition: transform 0.3s var(--pay-spring), border-color 0.2s, color 0.2s; }
.coin:hover:not(:disabled):not(.on) { border-color: var(--pay-border); color: var(--pay-text); transform: translateY(-2px); }
.coin:disabled { opacity: 0.35; cursor: not-allowed; }
.coin.on { color: #1a1206; border-color: transparent; background: var(--pay-grad-coin); transform: scale(1.16);
  box-shadow: 0 6px 16px -6px rgba(245,158,11,0.6), inset 0 1px 0 rgba(255,255,255,0.4); }
.coin-face { display: block; }
.reel-size { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--pay-text-muted); }
.sz { padding: 5px 10px; border-radius: 9px; border: 1px solid var(--pay-border-soft); background: var(--pay-surface-2);
  color: var(--pay-text-2); cursor: pointer; font-family: var(--pay-mono); font-size: 11px; }
.sz.on { color: var(--pay-treasury); border-color: var(--pay-border); background: rgba(251,191,36,0.12); }

/* gallery page transition */
.gala-fwd-enter-active, .gala-back-enter-active, .gala-fwd-leave-active, .gala-back-leave-active {
  transition: opacity 0.3s var(--pay-ease), transform 0.3s var(--pay-ease); }
.gala-fwd-enter-from { opacity: 0; transform: translateX(30px) scale(0.98); }
.gala-fwd-leave-to { opacity: 0; transform: translateX(-30px) scale(0.98); }
.gala-back-enter-from { opacity: 0; transform: translateX(-30px) scale(0.98); }
.gala-back-leave-to { opacity: 0; transform: translateX(30px) scale(0.98); }

/* keyframes */
@keyframes wave-spin { to { transform: rotate(360deg); } }
@keyframes pool-rise { 0% { opacity: 0; transform: translateY(0) scale(1); } 20% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-120px) scale(0.4); } }
@keyframes pool-bloom { 0% { opacity: 0; transform: scale(0.7); } 50% { opacity: 0.7; } 100% { opacity: 0.5; transform: scale(1); } }

/* ░░░░░░░░░░ RESPONSIVE ░░░░░░░░░░ */
@media (max-width: 640px) { .reservoir { justify-content: center; text-align: center; } .res-info { flex: auto; } .res-stats { justify-content: center; } }

/* ░░░░░░░░░░ LIGHT THEME ░░░░░░░░░░ */
[data-theme="light"] .chip.on, [data-theme="light"] .award-cta { color: #2a1a06; }
[data-theme="light"] .coin.on { color: #2a1a06; }
[data-theme="light"] .vessel { box-shadow: inset 0 0 30px rgba(120,90,40,0.18), 0 12px 36px -18px rgba(245,158,11,0.34); }
[data-theme="light"] .vessel.live .vessel-glow { opacity: 0.5; }
[data-theme="light"] .latch.cancelled { color: #8a734f; }
[data-theme="light"] .m-award { color: #2a1a06; }

/* ░░░░░░░░░░ REDUCED MOTION ░░░░░░░░░░ */
@media (prefers-reduced-motion: reduce) {
  .wave, .spark, .vessel.live .vessel-glow, .burst i, .award-cta:hover .ribbon-l { animation: none !important; }
  .medal:hover { transform: none; } .medal:hover .disc-ring { transform: none; }
  .water { transition: none; }
}
</style>
