<template>
  <div class="trn-sec">
    <RequestPipelineHero
      :counts="counts"
      v-model:search="search"
      v-model:statusFilter="statusFilter"
      v-model:needsDecisionOnly="needsDecisionOnly" />

    <div class="rq-listhead">
      <div class="rq-listhead-l">
        <h2>{{ listTitle }}</h2>
        <span class="rq-count trn-mono">{{ filtered.length }}</span>
      </div>
      <button v-if="hasActiveFilter" class="rq-clear" @click="clearFilters"><X :size="13" /> Clear filters</button>
    </div>

    <div v-if="loading" class="rq-list">
      <div v-for="n in 4" :key="n" class="trn-skel" style="height: 138px; border-radius: 18px" />
    </div>

    <TrnEmptyState v-else-if="!filtered.length" :icon="Inbox" title="No training requests"
      :sub="hasActiveFilter ? 'No requests match the current filters.' : 'When employees request a training or external course, their requests land here for review and fulfilment.'" />

    <TransitionGroup v-else name="rq-flow" tag="div" class="rq-list">
      <RequestFlowCard v-for="(r, i) in filtered" :key="r.id" :request="r" :index="i"
        @view="openDetail" @decide="openDecide" @fulfill="openFulfill" />
    </TransitionGroup>

    <RequestDecisionModal :open="decideOpen" :request="acting" @close="decideOpen = false" @saved="onDecided" />
    <RequestFulfillModal :open="fulfillOpen" :request="acting" @close="fulfillOpen = false" @saved="onFulfilled" />
    <RequestDetailDrawer :open="drawerOpen" :request="viewing"
      @close="drawerOpen = false" @decide="onDrawerDecide" @fulfill="onDrawerFulfill" @go-enrollment="onGoEnrollment" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { Inbox, X } from 'lucide-vue-next'
import TrnEmptyState from '../components/TrnEmptyState.vue'
import RequestPipelineHero from '../components/RequestPipelineHero.vue'
import RequestFlowCard from '../components/RequestFlowCard.vue'
import RequestDecisionModal from '../modals/RequestDecisionModal.vue'
import RequestFulfillModal from '../modals/RequestFulfillModal.vue'
import RequestDetailDrawer from '../drawers/RequestDetailDrawer.vue'
import { fetchRequests } from '@/composables/useTraining'

const emit = defineEmits(['refresh-stats', 'go'])
const toast = useToast()

const requests = ref([])
const loading = ref(true)
const search = ref('')
const statusFilter = ref('')
const needsDecisionOnly = ref(false)

const decideOpen = ref(false)
const fulfillOpen = ref(false)
const drawerOpen = ref(false)
const acting = ref(null)
const viewing = ref(null)

// ── counts for the hero ──────────────────────────────────────────────────────
const counts = computed(() => {
  const c = {}
  for (const r of requests.value) c[r.status] = (c[r.status] || 0) + 1
  return c
})

// ── filtering + actionable-first sort ────────────────────────────────────────
const PRIORITY = { PENDING_APPROVAL: 0, APPROVED: 1, RETURNED: 2, FULFILLED: 3, DRAFT: 4, REJECTED: 5, CANCELLED: 6 }
const filtered = computed(() => {
  let rows = requests.value.slice()
  if (needsDecisionOnly.value) rows = rows.filter(r => r.status === 'PENDING_APPROVAL')
  if (statusFilter.value) rows = rows.filter(r => r.status === statusFilter.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    rows = rows.filter(r =>
      (r.request_number || '').toLowerCase().includes(q) ||
      (r.title || '').toLowerCase().includes(q) ||
      (r.employee_name || '').toLowerCase().includes(q) ||
      (r.employee_code || '').toLowerCase().includes(q) ||
      (r.program_name || '').toLowerCase().includes(q) ||
      (r.external_provider || '').toLowerCase().includes(q))
  }
  return rows.sort((a, b) => {
    const pa = PRIORITY[a.status] ?? 9, pb = PRIORITY[b.status] ?? 9
    if (pa !== pb) return pa - pb
    return new Date(b.submitted_at || b.created_at || 0) - new Date(a.submitted_at || a.created_at || 0)
  })
})

const hasActiveFilter = computed(() => !!search.value || !!statusFilter.value || needsDecisionOnly.value)
const listTitle = computed(() => {
  if (needsDecisionOnly.value) return 'Awaiting your decision'
  if (statusFilter.value) return statusFilter.value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
  return 'All requests'
})
const clearFilters = () => { search.value = ''; statusFilter.value = ''; needsDecisionOnly.value = false }

// ── data ──────────────────────────────────────────────────────────────────────
const load = async () => {
  loading.value = true
  try { requests.value = await fetchRequests() || [] }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load requests') }
  finally { loading.value = false }
}
onMounted(load)

const openDetail = (r) => { viewing.value = r; drawerOpen.value = true }
const openDecide = (r) => { acting.value = r; decideOpen.value = true }
const openFulfill = (r) => { acting.value = r; fulfillOpen.value = true }

const onDecided = () => { drawerOpen.value = false; load(); emit('refresh-stats') }
const onFulfilled = () => { drawerOpen.value = false; load(); emit('refresh-stats') }

const onDrawerDecide = (r) => { drawerOpen.value = false; openDecide(r) }
const onDrawerFulfill = (r) => { drawerOpen.value = false; openFulfill(r) }
const onGoEnrollment = () => { drawerOpen.value = false; emit('go', 'enrollment') }
</script>

<style scoped>
.trn-sec { display: flex; flex-direction: column; gap: 18px; }

.rq-listhead { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.rq-listhead-l { display: flex; align-items: center; gap: 10px; }
.rq-listhead-l h2 { margin: 0; font-size: 17px; font-weight: 800; letter-spacing: -0.01em; color: var(--trn-text); }
.rq-count { font-size: 12px; font-weight: 700; padding: 2px 9px; border-radius: 999px;
  background: color-mix(in srgb, var(--trn-amber) 14%, transparent); color: var(--trn-amber-strong); }
.rq-clear { display: inline-flex; align-items: center; gap: 5px; font: inherit; font-size: 12px; font-weight: 600; padding: 6px 11px; border-radius: 9px;
  cursor: pointer; color: var(--trn-text-muted); background: var(--trn-surface); border: 1px solid var(--trn-border-soft); transition: all 0.2s; }
.rq-clear:hover { color: var(--trn-text); border-color: color-mix(in srgb, var(--trn-amber) 34%, transparent); }

.rq-list { display: flex; flex-direction: column; gap: 12px; position: relative; }

.rq-flow-move { transition: transform 0.45s var(--trn-spring); }
.rq-flow-enter-active { transition: all 0.42s var(--trn-spring); }
.rq-flow-leave-active { transition: all 0.32s var(--trn-spring); position: absolute; width: 100%; }
.rq-flow-enter-from { opacity: 0; transform: translateY(14px) scale(0.98); }
.rq-flow-leave-to { opacity: 0; transform: scale(0.96); }

@media (prefers-reduced-motion: reduce) {
  .rq-flow-move, .rq-flow-enter-active, .rq-flow-leave-active { transition: none; }
}
</style>
