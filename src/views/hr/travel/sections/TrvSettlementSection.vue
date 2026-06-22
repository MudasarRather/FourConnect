<template>
  <div class="stl">
    <TrvSectionHead :icon="Scale" eyebrow="Travel · Closure" title="Settlement" accent="Clearing House"
      subtitle="Advance reconciled against actual expenses + DA — netted into a payable or recovery posting. Company-paid bookings are surfaced so you never reimburse them twice.">
      <template #lenses>
        <button class="lens" :class="{ on: !statusFilter }" @click="statusFilter = ''">All <b>{{ items.length }}</b></button>
        <button v-for="s in SETTLEMENT_STATUS" :key="s.key" class="lens" :class="{ on: statusFilter === s.key }"
          :style="{ '--c': s.hex }" @click="statusFilter = statusFilter === s.key ? '' : s.key">
          {{ s.label }} <b>{{ countBy(s.key) }}</b>
        </button>
      </template>
    </TrvSectionHead>

    <!-- signature instrument: reconciliation river -->
    <SettlementFlow :items="filtered" />

    <!-- command bar -->
    <div class="stl-bar">
      <div class="sb-search">
        <Search :size="15" />
        <input v-model="q" type="text" placeholder="Search by number, traveller or tour ref…" />
        <button v-if="q" class="sb-clear" @click="q = ''"><X :size="13" /></button>
      </div>
      <div class="sb-tools">
        <div class="sb-sort">
          <ArrowDownUp :size="14" />
          <select v-model="sortBy">
            <option value="newest">Newest</option>
            <option value="payable">Highest payable</option>
            <option value="recoverable">Highest recovery</option>
            <option value="amount">Largest net</option>
          </select>
        </div>
        <div class="sb-view">
          <button :class="{ on: view === 'grid' }" @click="setView('grid')" title="Grid"><LayoutGrid :size="15" /></button>
          <button :class="{ on: view === 'list' }" @click="setView('list')" title="List"><List :size="15" /></button>
        </div>
        <button class="sb-refresh" :class="{ spin: loading }" @click="load" title="Refresh"><RefreshCw :size="15" /></button>
      </div>
    </div>

    <!-- list -->
    <div v-if="loading" class="grid" :class="view"><div v-for="n in 4" :key="n" class="skel" /></div>
    <div v-else-if="visible.length" class="grid" :class="view">
      <SettlementLedgerCard v-for="(s, i) in visible" :key="s.id" :s="s" :index="i" :bookings="bookedFor(s)"
        @detail="openDetail" @verify="openVerify" @settle="openSettle" @reverse="openReverse" @go="(p) => $emit('go', p)" />
    </div>
    <TrvEmptyState v-else :icon="Scale"
      :title="q || statusFilter ? 'No matching settlements' : 'Nothing to settle'"
      :subtitle="q || statusFilter ? 'Adjust the filters or search to see more.' : 'Settlements open automatically once travellers complete tours and file post-trip expenses.'" />

    <!-- detail + actions -->
    <SettlementDrawer :open="drawer" :settlement="active" :bookings="activeBookings" @close="drawer = false"
      @verify="openVerify" @settle="openSettle" @reverse="openReverse" @go="onDrawerGo" />
    <SettlementVerifyModal :open="verifyM" :s="active" @close="verifyM = false" @done="afterAction" />
    <SettlementSettleModal :open="settleM" :s="active" @close="settleM = false" @done="afterAction" />
    <SettlementReverseModal :open="reverseM" :s="active" @close="reverseM = false" @done="afterAction" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Scale, Search, X, ArrowDownUp, LayoutGrid, List, RefreshCw } from 'lucide-vue-next'
import TrvSectionHead from '../components/TrvSectionHead.vue'
import TrvEmptyState from '../components/TrvEmptyState.vue'
import SettlementFlow from '../components/SettlementFlow.vue'
import SettlementLedgerCard from '../components/SettlementLedgerCard.vue'
import SettlementDrawer from '../components/SettlementDrawer.vue'
import SettlementVerifyModal from '../modals/SettlementVerifyModal.vue'
import SettlementSettleModal from '../modals/SettlementSettleModal.vue'
import SettlementReverseModal from '../modals/SettlementReverseModal.vue'
import { useToast } from 'vue-toastification'
import { errText, fetchSettlements, fetchBookings, SETTLEMENT_STATUS } from '@/composables/useTravel'

const emit = defineEmits(['go', 'refresh-stats'])
const toast = useToast()

const items = ref([])
const bookings = ref([])
const loading = ref(false)
const statusFilter = ref('')
const q = ref('')
const sortBy = ref('newest')
const view = ref(localStorage.getItem('trv_stl_view') || 'grid')
const setView = (v) => { view.value = v; localStorage.setItem('trv_stl_view', v) }

const countBy = (k) => items.value.filter(s => s.status === k).length

// company-paid bookings grouped by tour (double-pay guard)
const byReq = computed(() => {
  const m = {}
  for (const b of bookings.value) (m[b.travel_request_id] ||= []).push(b)
  return m
})
const bookedFor = (s) => byReq.value[s.travel_request_id] || []

const filtered = computed(() => statusFilter.value ? items.value.filter(s => s.status === statusFilter.value) : items.value)

const netOf = (s) => (Number(s.payable_amount) || 0) > 0 ? Number(s.payable_amount) : Number(s.recoverable_amount) || 0
const visible = computed(() => {
  let list = filtered.value
  const term = q.value.trim().toLowerCase()
  if (term) list = list.filter(s =>
    (s.settlement_number || '').toLowerCase().includes(term) ||
    (s.employee_name || '').toLowerCase().includes(term) ||
    (s.travel_reference_number || '').toLowerCase().includes(term))
  const arr = [...list]
  if (sortBy.value === 'payable') arr.sort((a, b) => (Number(b.payable_amount) || 0) - (Number(a.payable_amount) || 0))
  else if (sortBy.value === 'recoverable') arr.sort((a, b) => (Number(b.recoverable_amount) || 0) - (Number(a.recoverable_amount) || 0))
  else if (sortBy.value === 'amount') arr.sort((a, b) => netOf(b) - netOf(a))
  else arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  return arr
})

const load = async () => {
  loading.value = true
  try {
    const [st, bk] = await Promise.all([fetchSettlements({ limit: 200 }), fetchBookings({ limit: 200 })])
    items.value = st.items || []
    bookings.value = bk.items || []
  } catch (e) { toast.error(errText(e, 'Failed to load settlements')) }
  finally { loading.value = false }
}

// drawer + modal state
const active = ref(null)
const drawer = ref(false)
const verifyM = ref(false)
const settleM = ref(false)
const reverseM = ref(false)
const activeBookings = computed(() => active.value ? bookedFor(active.value) : [])

const openDetail = (s) => { active.value = s; drawer.value = true }
const openVerify = (s) => { active.value = s; verifyM.value = true }
const openSettle = (s) => { active.value = s; settleM.value = true }
const openReverse = (s) => { active.value = s; reverseM.value = true }
const onDrawerGo = (p) => { drawer.value = false; emit('go', p) }

const afterAction = async () => { drawer.value = false; await load(); emit('refresh-stats') }

onMounted(load)
</script>

<style scoped>
.lens { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 999px; cursor: pointer; font-size: 12px; font-weight: 600; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); transition: all 0.2s; }
.lens.on { color: var(--c, var(--trv-amber)); border-color: var(--c, var(--trv-amber-border)); background: color-mix(in srgb, var(--c, #fbbf24) 12%, transparent); }
.lens b { color: var(--trv-text); }

.stl-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.sb-search { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 220px; padding: 9px 13px; border-radius: 11px; background: var(--trv-surface); border: 1px solid var(--trv-border); color: var(--trv-text-dim); }
.sb-search input { flex: 1; background: none; border: none; outline: none; color: var(--trv-text); font-size: 13px; font-family: inherit; }
.sb-search input::placeholder { color: var(--trv-text-dim); }
.sb-clear { display: inline-flex; background: none; border: none; color: var(--trv-text-dim); cursor: pointer; padding: 0; }
.sb-clear:hover { color: var(--trv-text); }
.sb-tools { display: flex; align-items: center; gap: 8px; }
.sb-sort { display: flex; align-items: center; gap: 7px; padding: 0 11px; border-radius: 11px; background: var(--trv-surface); border: 1px solid var(--trv-border); color: var(--trv-text-dim); }
.sb-sort select { background: none; border: none; outline: none; color: var(--trv-text); font-size: 12.5px; font-weight: 600; font-family: inherit; padding: 9px 4px; cursor: pointer; }
.sb-view { display: flex; gap: 2px; padding: 3px; border-radius: 11px; background: var(--trv-surface); border: 1px solid var(--trv-border); }
.sb-view button { display: inline-flex; padding: 6px 9px; border-radius: 8px; background: none; border: none; color: var(--trv-text-dim); cursor: pointer; }
.sb-view button.on { background: var(--trv-amber-soft); color: var(--trv-amber); }
.sb-refresh { display: inline-flex; padding: 9px; border-radius: 11px; background: var(--trv-surface); border: 1px solid var(--trv-border); color: var(--trv-text-muted); cursor: pointer; }
.sb-refresh:hover { color: var(--trv-amber); border-color: var(--trv-amber-border); }
.sb-refresh.spin :deep(svg) { animation: stl-spin 0.9s linear infinite; }
@keyframes stl-spin { to { transform: rotate(360deg); } }

.grid { display: grid; gap: 14px; }
.grid.grid { grid-template-columns: repeat(auto-fill, minmax(390px, 1fr)); }
.grid.list { grid-template-columns: 1fr; }
.skel { height: 184px; border-radius: 16px; background: linear-gradient(100deg, var(--trv-surface) 30%, var(--trv-surface-elevated) 50%, var(--trv-surface) 70%); background-size: 200% 100%; animation: trv-runway-flow 1.4s linear infinite; }

@media (max-width: 520px) { .grid.grid { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .skel, .sb-refresh.spin :deep(svg) { animation: none; } }
</style>
