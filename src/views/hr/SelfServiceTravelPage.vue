<template>
  <div class="sst">
    <!-- unlinked banner -->
    <Motion v-if="unlinked" as="div" class="sst-unlinked" :initial="{ opacity: 0, y: -8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4 }">
      <UserRoundX :size="20" />
      <div><strong>You aren't linked to an HR employee profile.</strong><span>Ask HR to link your account before you can raise travel requests.</span></div>
    </Motion>

    <!-- hero deck -->
    <SsFlightDeck :requests="requests" :summary="summary" :filter="filter" :first-name="firstName" :greeting="greeting"
      :actionable="expensables.length > 0" :disabled="unlinked" @new="openNew" @pick="filter = $event" @expense="onHeroExpense" />

    <!-- list -->
    <div class="sst-listhead">
      <h2 class="sst-h2">{{ headTitle }} <span class="sst-count trv-mono">{{ visible.length }}</span></h2>
      <button v-if="filter" class="sst-reset" @click="filter = ''"><RotateCcw :size="13" /> Clear filter</button>
    </div>

    <div v-if="loading" class="grid"><div v-for="n in 3" :key="n" class="skel" /></div>
    <div v-else-if="visible.length" class="grid">
      <SsTripCard v-for="(r, i) in visible" :key="r.id" :req="r" :index="i" @open="openDetail" @action="onCardAction" />
    </div>
    <TrvEmptyState v-else-if="!unlinked" :icon="Plane" :title="filter ? 'Nothing in this phase' : 'No trips yet'"
      :subtitle="filter ? 'Try another phase, or clear the filter.' : 'Raise your first official travel request to get going.'"
      :cta="filter ? 'Clear filter' : 'New request'" :cta-icon="filter ? RotateCcw : Plus" @cta="filter ? (filter = '') : openNew()" />

    <!-- modals + drawer -->
    <SsRequestModal :open="showRequest" :edit-request="editTarget" :existing-trips="requests" @close="showRequest = false" @saved="reloadAll" />
    <SsTripDrawer ref="drawerRef" :trip="drawerTrip" :me-id="meId" @close="drawerTrip = null" @action="onDrawerAction" />
    <SsExpenseModal :open="!!expenseTrip" :trip="expenseTrip" @close="expenseTrip = null" @saved="reloadAll" />
    <SsAdvanceModal :open="!!advanceTrip" :trip="advanceTrip" @close="advanceTrip = null" @saved="reloadAll" />
    <SsBookingModal :open="!!bookingTrip" :trip="bookingTrip" :edit-booking="bookingEdit" @close="bookingTrip = null" @saved="onBookingSaved" />
    <SsWithdrawModal :open="!!withdrawTrip" :trip="withdrawTrip" @close="withdrawTrip = null" @saved="reloadAll" />
    <SsDeleteModal :open="!!deleteTrip" :trip="deleteTrip" @close="deleteTrip = null" @saved="reloadAll" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { Motion } from 'motion-v'
import axios from 'axios'
import { Plane, Plus, RotateCcw, UserRoundX } from 'lucide-vue-next'
import SsFlightDeck from './travel/selfservice/SsFlightDeck.vue'
import SsTripCard from './travel/selfservice/SsTripCard.vue'
import SsRequestModal from './travel/selfservice/SsRequestModal.vue'
import SsTripDrawer from './travel/selfservice/SsTripDrawer.vue'
import SsExpenseModal from './travel/selfservice/SsExpenseModal.vue'
import SsAdvanceModal from './travel/selfservice/SsAdvanceModal.vue'
import SsBookingModal from './travel/selfservice/SsBookingModal.vue'
import SsWithdrawModal from './travel/selfservice/SsWithdrawModal.vue'
import SsDeleteModal from './travel/selfservice/SsDeleteModal.vue'
import TrvEmptyState from './travel/components/TrvEmptyState.vue'
import { useToast } from 'vue-toastification'
import { API, authHeader } from '@/utils/api'
import '@/styles/travel-theme.css'
import { errText, fetchMyRequests, fetchMySummary, submitMyRequest, deleteMyBooking } from '@/composables/useTravel'
import { useGreeting } from '@/composables/useGreeting'

const toast = useToast()
const requests = ref([])
const summary = ref({})
const loading = ref(false)
const unlinked = ref(false)
const filter = ref('')
const meId = ref('')

// modal / drawer state
const showRequest = ref(false)
const editTarget = ref(null)
const drawerTrip = ref(null)
const drawerRef = ref(null)
const expenseTrip = ref(null)
const advanceTrip = ref(null)
const bookingTrip = ref(null)
const bookingEdit = ref(null)
const withdrawTrip = ref(null)
const deleteTrip = ref(null)

const meUser = () => { try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} } }
const firstName = computed(() => (meUser().full_name || 'there').split(' ')[0])
const { greeting } = useGreeting()

const LENS_STATUSES = {
  planning: ['DRAFT', 'RETURNED'], review: ['PENDING_APPROVAL'], approved: ['APPROVED'],
  travelling: ['IN_PROGRESS'], completed: ['COMPLETED'],
}
const LENS_TITLE = { planning: 'Planning', review: 'In review', approved: 'Approved', travelling: 'Travelling', completed: 'Completed' }
const visible = computed(() => filter.value ? requests.value.filter(r => LENS_STATUSES[filter.value]?.includes(r.status)) : requests.value)
const headTitle = computed(() => filter.value ? LENS_TITLE[filter.value] : 'Your trips')
const expensables = computed(() => requests.value.filter(r => r.status === 'COMPLETED' && !(r.settlement && !['DRAFT', 'SUBMITTED'].includes(r.settlement.status))))

const hydrateMe = async () => {
  meId.value = meUser().id || ''
  if (meId.value) return
  try { const { data } = await axios.get(`${API}/auth/me`, { headers: authHeader() }); meId.value = data.id || '' } catch { /* ignore */ }
}
const load = async () => {
  loading.value = true
  try {
    const [r, s] = await Promise.all([fetchMyRequests({ limit: 100 }), fetchMySummary()])
    unlinked.value = !!r.unlinked || !!s.unlinked
    requests.value = r.items || []
    summary.value = s || {}
  } catch (e) { toast.error(errText(e, 'Failed to load your travel')) } finally { loading.value = false }
}
// reload list/summary; keep the open drawer in sync with the fresh row (or close if gone)
const reloadAll = async () => {
  await load()
  if (drawerTrip.value) {
    const fresh = requests.value.find(r => r.id === drawerTrip.value.id)
    if (fresh) { drawerTrip.value = fresh; await nextTick(); drawerRef.value?.reloadBookings?.() }
    else drawerTrip.value = null
  }
}

const openNew = () => { editTarget.value = null; showRequest.value = true }
const openEdit = (r) => { editTarget.value = r; showRequest.value = true }
const openDetail = (r) => { drawerTrip.value = r }
const openExpense = (r) => { expenseTrip.value = r }
const openAdvance = (r) => { advanceTrip.value = r }
const openBooking = (r, b = null) => { bookingEdit.value = b; bookingTrip.value = r }
const openWithdraw = (r) => { withdrawTrip.value = r }
const openDelete = (r) => { deleteTrip.value = r }

const submitQuick = async (r) => {
  try { await submitMyRequest(r.id); toast.success('Submitted for approval'); await reloadAll() }
  catch (e) { toast.error(errText(e, 'Could not submit')) }
}
const onHeroExpense = () => {
  const e = expensables.value
  if (!e.length) return toast.info('No completed trips to expense yet')
  if (e.length === 1) return openExpense(e[0])
  filter.value = 'completed'; toast.info('Pick a completed trip to file its expenses')
}

const route = (type, req, booking) => {
  switch (type) {
    case 'edit': return openEdit(req)
    case 'submit': return submitQuick(req)
    case 'book': return openBooking(req, booking || null)
    case 'advance': return openAdvance(req)
    case 'expense': return openExpense(req)
    case 'withdraw': return openWithdraw(req)
    case 'delete': return openDelete(req)
    case 'deletebooking': return delBooking(booking)
    case 'open': return openDetail(req)
  }
}
const onCardAction = ({ type, req }) => route(type, req)
const onDrawerAction = ({ type, req, booking }) => route(type, req, booking)

const delBooking = async (b) => {
  if (!b) return
  try {
    await deleteMyBooking(b.id); toast.success('Booking removed')
    drawerRef.value?.reloadBookings?.(); await load()
    if (drawerTrip.value) { const f = requests.value.find(r => r.id === drawerTrip.value.id); if (f) drawerTrip.value = f }
  } catch (e) { toast.error(errText(e, 'Could not remove booking')) }
}
const onBookingSaved = async () => { drawerRef.value?.reloadBookings?.(); await reloadAll() }

onMounted(async () => { hydrateMe(); await load() })
</script>

<style scoped>
.sst { display: flex; flex-direction: column; gap: 18px; color: var(--trv-text); }
.sst-unlinked { display: flex; align-items: center; gap: 12px; padding: 14px 18px; border-radius: 14px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #f87171; }
.sst-unlinked strong { display: block; font-size: 13px; } .sst-unlinked span { font-size: 12px; opacity: 0.85; }
.sst-listhead { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.sst-h2 { font-size: 15px; font-weight: 800; color: var(--trv-text); margin: 0; display: inline-flex; align-items: center; gap: 9px; }
.sst-count { font-size: 12px; font-weight: 700; color: var(--trv-amber); padding: 2px 9px; border-radius: 999px; background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }
.sst-reset { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; cursor: pointer; color: var(--trv-text-muted); background: var(--trv-panel); border: 1px solid var(--trv-border); }
.sst-reset:hover { color: var(--trv-amber); border-color: var(--trv-amber-border); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 14px; }
.skel { height: 220px; border-radius: 18px; background: linear-gradient(100deg, var(--trv-surface) 30%, var(--trv-surface-elevated) 50%, var(--trv-surface) 70%); background-size: 200% 100%; animation: trv-runway-flow 1.4s linear infinite; }
@media (prefers-reduced-motion: reduce) { .skel { animation: none; } }
</style>
