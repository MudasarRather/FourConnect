<template>
  <div class="bk">
    <!-- ════════ LOGISTICS CONSOLE HERO ════════ -->
    <Motion as="section" class="lc trv-grain"
      :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
      <span class="lc-aura" aria-hidden="true" />
      <span class="lc-floor" aria-hidden="true" />
      <Luggage class="lc-ghost" :size="210" aria-hidden="true" />

      <div class="lc-main">
        <div class="lc-lead">
          <span class="lc-eyebrow"><Luggage :size="12" /> Travel · Logistics Desk</span>
          <h1 class="lc-title">Itinerary <span class="grad">Builder</span></h1>
          <p class="lc-sub">Once a trip is cleared, this is where the desk books it — flights, trains, hotels and transfers assembled into one confirmed itinerary per traveller.</p>
          <div class="lc-cta">
            <Motion as="button" class="lc-btn primary" :disabled="!bookableTours.length"
              :title="!bookableTours.length && hasApprovedTours ? 'All tours are settled — bookings are locked' : ''"
              :whileHover="bookableTours.length ? { y: -2, scale: 1.02 } : {}" :whileTap="bookableTours.length ? { scale: 0.97 } : {}" @click="openNewGlobal">
              <Plus :size="15" /> New booking
            </Motion>
            <button class="lc-btn ghost" @click="load" :disabled="loading">
              <RefreshCw :size="14" :class="{ spin: loading }" /> Refresh
            </button>
            <button v-if="!hasApprovedTours" class="lc-btn steel" @click="$emit('go', 'approvals')">
              <ShieldCheck :size="14" /> Clear a request first
            </button>
          </div>
        </div>

        <div class="lc-gauge">
          <BookingGauge :bookings="allBookings" />
        </div>
      </div>

      <!-- lenses -->
      <div class="lc-lenses">
        <button v-for="l in lenses" :key="l.key" class="lens" :class="[{ on: lens === l.key }, l.tone]"
          :disabled="l.stat" @click="!l.stat && toggleLens(l.key)">
          <span class="lens-ico"><component :is="l.icon" :size="15" /></span>
          <span class="lens-body">
            <TrvCountUp class="lens-val" :value="l.value" :format="l.fmt" />
            <span class="lens-lbl">{{ l.label }}</span>
          </span>
          <span class="lens-bar" />
        </button>
      </div>
    </Motion>

    <!-- ════════ COMMAND BAR ════════ -->
    <div v-if="!loading && tours.length" class="bk-bar">
      <div class="bk-search" :class="{ focus: searchFocus }">
        <Search :size="15" />
        <input v-model="q" placeholder="Search tour, route or traveller…" @focus="searchFocus = true" @blur="searchFocus = false" />
        <button v-if="q" class="bk-search-x" @click="q = ''"><X :size="13" /></button>
      </div>
      <span class="bk-count">{{ visTours.length }} of {{ tours.length }} tours</span>
    </div>

    <!-- ════════ CONTENT ════════ -->
    <div v-if="loading" class="grid"><div v-for="n in 3" :key="n" class="skel" /></div>

    <TrvEmptyState v-else-if="!tours.length" :icon="Ticket"
      title="No approved tours to book"
      subtitle="Bookings open once a travel request is approved. Clear one in the Control Tower, then assemble its itinerary here."
      cta="Open Control Tower" :cta-icon="ShieldCheck" @cta="$emit('go', 'approvals')" />

    <div v-else-if="visTours.length" class="grid">
      <TourManifestCard v-for="(t, i) in visTours" :key="t.id" :tour="t" :bookings="bookingsFor(t.id)" :index="i"
        :locked="isLocked(t.id)" @add="onAdd" @edit="onEdit" @detail="onDetail" />
    </div>

    <p v-else class="bk-nomatch">
      <Search :size="14" /> No tours match this view.
      <button class="link-btn" @click="clearFilters">Clear filters</button>
    </p>

    <!-- modal + drawer -->
    <BookingModal :open="showModal" :request-id="activeReqId" :request-ref="activeRef" :booking="editBooking"
      :tours="tourOptions" @close="showModal = false" @saved="load" />
    <TravelDetailDrawer :open="showDetail" :request-id="detailId" @close="showDetail = false" @changed="load" @go="$emit('go', $event)" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  Ticket, Plus, ShieldCheck, RefreshCw, Luggage, Layers, PackageOpen, CheckCheck, Wallet, Search, X,
} from 'lucide-vue-next'
import BookingGauge from '../components/BookingGauge.vue'
import TourManifestCard from '../components/TourManifestCard.vue'
import TrvCountUp from '../components/TrvCountUp.vue'
import TrvEmptyState from '../components/TrvEmptyState.vue'
import BookingModal from '../modals/BookingModal.vue'
import TravelDetailDrawer from '../components/TravelDetailDrawer.vue'
import { useToast } from 'vue-toastification'
import { errText, fetchBookings, fetchSettlements, useTravelRequests, fmtCompactINR } from '@/composables/useTravel'

const emit = defineEmits(['go', 'refresh-stats'])
const toast = useToast()

const allBookings = ref([])
const tours = ref([])
const settlements = ref([])
const loading = ref(false)
const lens = ref('all')
const q = ref('')
const searchFocus = ref(false)

const showModal = ref(false)
const showDetail = ref(false)
const editBooking = ref(null)
const activeReqId = ref(null)
const activeRef = ref('')
const detailId = ref(null)

const { items: reqItems, fetchList: fetchReqs } = useTravelRequests({ limit: 100 })

const CONFIRMED = new Set(['CONFIRMED', 'COMPLETED'])

// bookings grouped by tour id
const byTour = computed(() => {
  const m = {}
  for (const b of allBookings.value) {
    (m[b.travel_request_id] ||= []).push(b)
  }
  return m
})
const bookingsFor = (id) => byTour.value[id] || []
const hasApprovedTours = computed(() => tours.value.length > 0)

// A finalized settlement (settled/paid/reversed) freezes the tour's bookings.
const CLOSED_SETTLEMENT = new Set(['SETTLED', 'PAID', 'REVERSED'])
const lockedTourIds = computed(() => new Set(
  settlements.value.filter(s => CLOSED_SETTLEMENT.has(s.status)).map(s => s.travel_request_id)))
const isLocked = (id) => lockedTourIds.value.has(id)
const bookableTours = computed(() => tours.value.filter(t => !isLocked(t.id)))

const tourOptions = computed(() => bookableTours.value.map(t => ({
  value: t.id, label: `${t.travel_reference_number} · ${t.from_location} → ${t.to_location}`,
})))

// fulfilment helpers
const isAwaiting = (t) => bookingsFor(t.id).length === 0
const isConfirmed = (t) => { const b = bookingsFor(t.id); return b.length > 0 && b.every(x => CONFIRMED.has(x.status)) }

const totalSpend = computed(() => allBookings.value.reduce((s, b) => s + Number(b.total_cost || 0), 0))

const lenses = computed(() => [
  { key: 'all', label: 'Tours', icon: Layers, tone: 'amber', value: tours.value.length },
  { key: 'awaiting', label: 'Awaiting logistics', icon: PackageOpen, tone: 'ember', value: tours.value.filter(isAwaiting).length },
  { key: 'confirmed', label: 'Fully confirmed', icon: CheckCheck, tone: 'emerald', value: tours.value.filter(isConfirmed).length },
  { key: 'segments', label: 'Segments', icon: Ticket, tone: 'steel', value: allBookings.value.length, stat: true },
  { key: 'spend', label: 'Total spend', icon: Wallet, tone: 'info', value: totalSpend.value, fmt: fmtCompactINR, stat: true },
])
const toggleLens = (k) => { lens.value = lens.value === k ? 'all' : k }

const visTours = computed(() => {
  let list = tours.value
  if (lens.value === 'awaiting') list = list.filter(isAwaiting)
  else if (lens.value === 'confirmed') list = list.filter(isConfirmed)
  const term = q.value.trim().toLowerCase()
  if (term) list = list.filter(t => [t.travel_reference_number, t.from_location, t.to_location, t.employee_name]
    .filter(Boolean).some(v => String(v).toLowerCase().includes(term)))
  return list
})
const clearFilters = () => { lens.value = 'all'; q.value = '' }

// ── data ──────────────────────────────────────────────────────────────────
const load = async () => {
  loading.value = true
  try {
    const [bk] = await Promise.all([fetchBookings({ limit: 200 }), fetchReqs(), fetchSettlements({ limit: 200 })
      .then(d => { settlements.value = d.items || [] }).catch(() => { settlements.value = [] })])
    allBookings.value = bk.items || []
    tours.value = (reqItems.value || []).filter(r => ['APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(r.status))
  } catch (e) { toast.error(errText(e, 'Failed to load bookings')) }
  finally { loading.value = false }
}

// ── interactions ──────────────────────────────────────────────────────────
const LOCKED_MSG = "This tour's settlement is finalized — its bookings are locked."
const onAdd = (tour) => {
  if (isLocked(tour.id)) { toast.warning(LOCKED_MSG); return }
  editBooking.value = null; activeReqId.value = tour.id; activeRef.value = tour.travel_reference_number; showModal.value = true
}
const onEdit = ({ booking, tour }) => {
  if (isLocked(tour.id)) { toast.warning(LOCKED_MSG); return }
  editBooking.value = booking; activeReqId.value = tour.id; activeRef.value = tour.travel_reference_number; showModal.value = true
}
const onDetail = (id) => { detailId.value = id; showDetail.value = true }
const openNewGlobal = () => { if (!bookableTours.value.length) return; editBooking.value = null; activeReqId.value = null; activeRef.value = ''; showModal.value = true }

onMounted(load)
</script>

<style scoped>
.bk { display: flex; flex-direction: column; gap: 18px; }

/* ════════ HERO ════════ */
.lc { position: relative; overflow: hidden; border-radius: 24px; padding: 26px 26px 20px;
  background: var(--trv-surface-elevated); border: 1px solid var(--trv-border); box-shadow: var(--trv-shadow); }
.lc-aura { position: absolute; inset: -50% 28% 18% -14%; pointer-events: none;
  background: radial-gradient(60% 70% at 18% 0%, rgba(251, 146, 60, 0.16), transparent 70%);
  animation: trv-aura-drift 12s ease-in-out infinite; }
.lc-floor { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(var(--trv-border) 1px, transparent 1px), linear-gradient(90deg, var(--trv-border) 1px, transparent 1px);
  background-size: 46px 46px; mask-image: linear-gradient(to bottom, black, transparent 78%); }
.lc-ghost { position: absolute; right: -26px; top: -20px; color: var(--trv-amber); opacity: 0.05; pointer-events: none; transform: rotate(-12deg); }

.lc-main { position: relative; display: grid; grid-template-columns: 1fr auto; gap: 28px; align-items: center; }
.lc-lead { min-width: 0; }
.lc-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--trv-amber); padding: 5px 11px; border-radius: 999px; background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }
.lc-title { font-size: clamp(26px, 4vw, 40px); font-weight: 850; margin: 12px 0 6px; color: var(--trv-text); line-height: 1.04; }
.lc-title .grad { background: var(--trv-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.lc-sub { font-size: 13.5px; color: var(--trv-text-secondary); margin: 0; max-width: 560px; line-height: 1.55; }
.lc-cta { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-top: 18px; }
.lc-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 11px; font-size: 12.5px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.lc-btn.primary { background: var(--trv-grad-hero); color: #1a1205; box-shadow: var(--trv-amber-glow); }
.lc-btn.primary:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.lc-btn.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.lc-btn.ghost:hover { color: var(--trv-text); }
.lc-btn.steel { background: var(--trv-steel-soft); color: var(--trv-text); border-color: var(--trv-border-strong); }
.lc-btn:disabled { cursor: default; }
.lc-gauge { width: clamp(240px, 28vw, 320px); flex-shrink: 0; display: grid; place-items: center; }

/* lenses */
.lc-lenses { position: relative; display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-top: 22px; }
.lens { position: relative; overflow: hidden; display: flex; align-items: center; gap: 11px; padding: 12px 14px; border-radius: 14px; cursor: pointer; text-align: left;
  background: var(--trv-panel); border: 1px solid var(--trv-border); transition: transform 0.25s var(--trv-spring), border-color 0.25s, background 0.25s; }
.lens:not(:disabled):hover { transform: translateY(-2px); border-color: var(--trv-border-strong); }
.lens:disabled { cursor: default; }
.lens-ico { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; color: var(--trv-text-muted); background: var(--trv-surface); border: 1px solid var(--trv-border); }
.lens-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.lens-val { font-size: 21px; font-weight: 850; color: var(--trv-text); line-height: 1; font-variant-numeric: tabular-nums; }
.lens-lbl { font-size: 10.5px; color: var(--trv-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lens-bar { position: absolute; left: 0; bottom: 0; height: 3px; width: 100%; transform: scaleX(0); transform-origin: left; transition: transform 0.3s var(--trv-spring); background: var(--trv-grad-hero); }
.lens.on { border-color: var(--trv-amber-border); background: var(--trv-amber-soft); }
.lens.on .lens-bar { transform: scaleX(1); }
.lens.on .lens-ico, .lens.amber .lens-ico { color: var(--trv-amber); }
.lens.ember .lens-ico { color: var(--trv-ember); }
.lens.emerald .lens-ico { color: var(--trv-st-approved); }
.lens.steel .lens-ico { color: var(--trv-steel); }
.lens.info .lens-ico { color: var(--trv-amber-bright); }
.lens.on.ember .lens-bar { background: linear-gradient(90deg, var(--trv-ember), var(--trv-ember-deep)); }
.lens.on.emerald .lens-bar { background: linear-gradient(90deg, var(--trv-st-approved), var(--trv-st-completed)); }

/* command bar */
.bk-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.bk-search { flex: 1; min-width: 220px; display: flex; align-items: center; gap: 8px; padding: 9px 13px; border-radius: 12px; background: var(--trv-surface); border: 1px solid var(--trv-border); color: var(--trv-text-muted); transition: border-color 0.2s; }
.bk-search.focus { border-color: var(--trv-amber-border); }
.bk-search input { flex: 1; background: none; border: none; outline: none; color: var(--trv-text); font-size: 13px; font-family: inherit; }
.bk-search-x { background: none; border: none; color: var(--trv-text-dim); cursor: pointer; display: grid; place-items: center; }
.bk-count { font-size: 11.5px; color: var(--trv-text-muted); white-space: nowrap; }

/* content */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 16px; }
.skel { height: 250px; border-radius: 20px; background: linear-gradient(100deg, var(--trv-surface) 30%, var(--trv-surface-elevated) 50%, var(--trv-surface) 70%); background-size: 200% 100%; animation: trv-runway-flow 1.4s linear infinite; }
.bk-nomatch { display: inline-flex; align-items: center; gap: 7px; justify-content: center; font-size: 12.5px; color: var(--trv-text-dim); padding: 18px; border-radius: 14px; background: var(--trv-surface); border: 1px dashed var(--trv-border); }
.link-btn { background: none; border: none; color: var(--trv-amber); font-weight: 700; cursor: pointer; font-size: 12.5px; text-decoration: underline; }
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 860px) {
  .lc-main { grid-template-columns: 1fr; }
  .lc-gauge { width: 100%; max-width: 300px; margin-inline: auto; }
  .lc-lenses { grid-template-columns: repeat(2, 1fr); }
  .grid { grid-template-columns: 1fr; }
}
@media (max-width: 480px) { .lc-lenses { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .lc-aura { animation: none; } }
</style>
