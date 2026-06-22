<template>
  <div class="adv">
    <TrvSectionHead :icon="Coins" eyebrow="Travel · Treasury" title="Capital" accent="Disbursement Vault"
      subtitle="Pre-travel cash advances — approve, trim, release to payroll, and recover on settlement. Every rupee in the field, tracked from ask to closure.">
      <template #actions>
        <Motion as="button" class="btn primary" :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="createM = true">
          <Plus :size="15" /> Raise advance
        </Motion>
        <button class="icon-btn" :class="{ spin: loading }" @click="load" title="Refresh"><RefreshCw :size="15" /></button>
      </template>
      <template #lenses>
        <button class="lens" :class="{ on: !statusFilter }" @click="setFilter('')">All <b>{{ items.length }}</b></button>
        <button v-for="s in ADVANCE_STATUS" :key="s.key" class="lens" :class="{ on: statusFilter === s.key }"
          :style="{ '--c': s.hex }" @click="setFilter(s.key)">
          <component :is="s.icon" :size="11" /> {{ s.label }} <b>{{ countBy(s.key) }}</b>
        </button>
      </template>
    </TrvSectionHead>

    <!-- signature instrument: the treasury reservoir -->
    <AdvanceVaultCore :items="items" :active-filter="statusFilter" @pick="onPick" />

    <!-- command bar -->
    <div class="adv-bar">
      <div class="ab-search">
        <Search :size="15" />
        <input v-model="q" type="text" placeholder="Search advance #, traveller or tour ref…" />
        <button v-if="q" class="ab-clear" @click="q = ''"><X :size="13" /></button>
      </div>
      <div class="ab-tools">
        <div class="ab-sort">
          <ArrowDownUp :size="14" />
          <select v-model="sortBy">
            <option value="newest">Newest</option>
            <option value="amount">Largest amount</option>
            <option value="lifecycle">Lifecycle stage</option>
          </select>
        </div>
        <div class="ab-view">
          <button :class="{ on: view === 'grid' }" @click="setView('grid')" title="Grid"><LayoutGrid :size="15" /></button>
          <button :class="{ on: view === 'list' }" @click="setView('list')" title="List"><List :size="15" /></button>
        </div>
      </div>
    </div>

    <!-- list -->
    <div v-if="loading" class="grid" :class="view"><div v-for="n in 6" :key="n" class="skel" /></div>
    <div v-else-if="visible.length" class="grid" :class="view">
      <AdvanceVaultCard v-for="(a, i) in visible" :key="a.id" :a="a" :index="i"
        @approve="openApprove" @release="openRelease" @reject="openReject" @detail="openDetail" @go="(p) => $emit('go', p)" />
    </div>
    <TrvEmptyState v-else :icon="Coins"
      :title="q || statusFilter ? 'No matching advances' : 'No advances yet'"
      :subtitle="q || statusFilter ? 'Adjust the filters or search to see more.' : 'Travellers request advances from self-service once a tour is approved — or raise one here on their behalf.'"
      :cta="q || statusFilter ? '' : 'Raise advance'" :cta-icon="Plus" @cta="createM = true" />

    <!-- drawer + modals -->
    <AdvanceDetailDrawer :open="drawer" :advance="active" @close="drawer = false"
      @approve="fromDrawer(openApprove, $event)" @release="fromDrawer(openRelease, $event)"
      @reject="fromDrawer(openReject, $event)" @go="onDrawerGo" />
    <AdvanceApproveModal :open="approveM" :advance="active" @close="approveM = false" @done="afterAction" />
    <AdvanceReleaseModal :open="releaseM" :advance="active" @close="releaseM = false" @done="afterAction" />
    <AdvanceRejectModal :open="rejectM" :advance="active" @close="rejectM = false" @done="afterAction" />
    <AdvanceCreateModal :open="createM" :blocked-request-ids="blockedRequestIds" @close="createM = false" @done="afterAction" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { Coins, Plus, RefreshCw, Search, X, ArrowDownUp, LayoutGrid, List } from 'lucide-vue-next'
import TrvSectionHead from '../components/TrvSectionHead.vue'
import TrvEmptyState from '../components/TrvEmptyState.vue'
import AdvanceVaultCore from '../components/AdvanceVaultCore.vue'
import AdvanceVaultCard from '../components/AdvanceVaultCard.vue'
import AdvanceDetailDrawer from '../components/AdvanceDetailDrawer.vue'
import AdvanceApproveModal from '../modals/AdvanceApproveModal.vue'
import AdvanceReleaseModal from '../modals/AdvanceReleaseModal.vue'
import AdvanceRejectModal from '../modals/AdvanceRejectModal.vue'
import AdvanceCreateModal from '../modals/AdvanceCreateModal.vue'
import { useToast } from 'vue-toastification'
import { errText, fetchAdvances, advanceEffective, advanceGateState, ADVANCE_STATUS } from '@/composables/useTravel'

const emit = defineEmits(['go', 'refresh-stats'])
const toast = useToast()

const items = ref([])
const loading = ref(false)
const statusFilter = ref('')
const q = ref('')
const sortBy = ref('newest')
const view = ref(localStorage.getItem('trv_adv_view') || 'grid')
const setView = (v) => { view.value = v; localStorage.setItem('trv_adv_view', v) }

const countBy = (k) => items.value.filter(a => a.status === k).length
const setFilter = (k) => { statusFilter.value = statusFilter.value === k ? '' : k }
const onPick = (k) => { statusFilter.value = k }

// requests that already have an open advance (REQUESTED/APPROVED/RELEASED) —
// keeps the create modal from raising a duplicate against the same tour.
const blockedRequestIds = computed(() =>
  items.value.filter(a => ['REQUESTED', 'APPROVED', 'RELEASED'].includes(a.status)).map(a => a.travel_request_id))

const matchStatus = (a) => {
  if (!statusFilter.value) return true
  if (statusFilter.value === 'CLOSED') return ['SETTLED', 'RECOVERED'].includes(a.status)
  return a.status === statusFilter.value
}
const visible = computed(() => {
  const term = q.value.trim().toLowerCase()
  let list = items.value.filter(matchStatus)
  if (term) list = list.filter(a =>
    (a.advance_number || '').toLowerCase().includes(term) ||
    (a.employee_name || '').toLowerCase().includes(term) ||
    (a.travel_reference_number || '').toLowerCase().includes(term))
  const arr = [...list]
  if (sortBy.value === 'amount') arr.sort((a, b) => advanceEffective(b) - advanceEffective(a))
  else if (sortBy.value === 'lifecycle') arr.sort((a, b) => advanceGateState(b).reached - advanceGateState(a).reached)
  else arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  return arr
})

const load = async () => {
  loading.value = true
  try { items.value = (await fetchAdvances({ limit: 200 })).items || [] }
  catch (e) { toast.error(errText(e, 'Failed to load advances')) }
  finally { loading.value = false }
}

// drawer + modal state
const active = ref(null)
const drawer = ref(false)
const approveM = ref(false)
const releaseM = ref(false)
const rejectM = ref(false)
const createM = ref(false)

const openDetail = (a) => { active.value = a; drawer.value = true }
const openApprove = (a) => { active.value = a; approveM.value = true }
const openRelease = (a) => { active.value = a; releaseM.value = true }
const openReject = (a) => { active.value = a; rejectM.value = true }
const fromDrawer = (opener, a) => { drawer.value = false; opener(a) }
const onDrawerGo = (p) => { drawer.value = false; emit('go', p) }

const afterAction = async () => { drawer.value = false; await load(); emit('refresh-stats') }

onMounted(load)
</script>

<style scoped>
.adv { display: flex; flex-direction: column; }

.btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 15px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.btn.primary { background: var(--trv-grad-hero); color: #1a1205; box-shadow: var(--trv-amber-glow); }
.icon-btn { display: inline-flex; padding: 9px; border-radius: 11px; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); cursor: pointer; }
.icon-btn:hover { color: var(--trv-amber); border-color: var(--trv-amber-border); }
.icon-btn.spin :deep(svg) { animation: adv-spin 0.9s linear infinite; }
@keyframes adv-spin { to { transform: rotate(360deg); } }

.lens { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 999px; cursor: pointer; font-size: 12px; font-weight: 600; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); transition: all 0.2s; }
.lens.on { color: var(--c, var(--trv-amber)); border-color: var(--c, var(--trv-amber-border)); background: color-mix(in srgb, var(--c, #fbbf24) 12%, transparent); }
.lens b { color: var(--trv-text); }

.adv-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.ab-search { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 220px; padding: 9px 13px; border-radius: 11px; background: var(--trv-surface); border: 1px solid var(--trv-border); color: var(--trv-text-dim); }
.ab-search input { flex: 1; background: none; border: none; outline: none; color: var(--trv-text); font-size: 13px; font-family: inherit; }
.ab-search input::placeholder { color: var(--trv-text-dim); }
.ab-clear { display: inline-flex; background: none; border: none; color: var(--trv-text-dim); cursor: pointer; padding: 0; }
.ab-clear:hover { color: var(--trv-text); }
.ab-tools { display: flex; align-items: center; gap: 8px; }
.ab-sort { display: flex; align-items: center; gap: 7px; padding: 0 11px; border-radius: 11px; background: var(--trv-surface); border: 1px solid var(--trv-border); color: var(--trv-text-dim); }
.ab-sort select { background: none; border: none; outline: none; color: var(--trv-text); font-size: 12.5px; font-weight: 600; font-family: inherit; padding: 9px 4px; cursor: pointer; }
.ab-view { display: flex; gap: 2px; padding: 3px; border-radius: 11px; background: var(--trv-surface); border: 1px solid var(--trv-border); }
.ab-view button { display: inline-flex; padding: 6px 9px; border-radius: 8px; background: none; border: none; color: var(--trv-text-dim); cursor: pointer; }
.ab-view button.on { background: var(--trv-amber-soft); color: var(--trv-amber); }

.grid { display: grid; gap: 14px; }
.grid.grid { grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); }
.grid.list { grid-template-columns: repeat(auto-fill, minmax(440px, 1fr)); }
.skel { height: 248px; border-radius: 17px; background: linear-gradient(100deg, var(--trv-surface) 30%, var(--trv-surface-elevated) 50%, var(--trv-surface) 70%); background-size: 200% 100%; animation: trv-runway-flow 1.4s linear infinite; }

@media (max-width: 520px) { .grid.grid, .grid.list { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .skel, .icon-btn.spin :deep(svg) { animation: none; } }
</style>
