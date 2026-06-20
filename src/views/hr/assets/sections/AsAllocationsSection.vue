<template>
  <div class="alp">
    <AllocConsole
      :ready="available.length"
      :deployed="active.length"
      :acknowledged="ackedCount"
      :awaiting-ack="pendingCount"
      :overdue="overdueCount"
      :ack-rate="ackRate"
      @go="$emit('go', $event)"
      @pick="onPick" />

    <div class="alp-bays">
      <!-- ── Launch bay ── -->
      <Motion as="section" class="alp-bay as-card"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.05 }">
        <header class="bay-head">
          <div class="bay-head-text">
            <span class="bay-ic ready"><Warehouse :size="16" /></span>
            <div>
              <h3 class="bay-title">Launch bay</h3>
              <p class="bay-sub">{{ available.length }} ready<span v-if="reserved.length"> · {{ reserved.length }} reserved</span></p>
            </div>
          </div>
          <button class="bay-refresh" @click="reload" :disabled="loading" title="Refresh">
            <RefreshCw :size="14" :class="{ spin: loading }" />
          </button>
        </header>

        <div v-if="loading" class="bay-skel">
          <div v-for="n in 4" :key="n" class="as-skel" style="height: 96px; border-radius: 18px;" />
        </div>

        <template v-else>
          <div v-if="available.length || reserved.length" class="bay-grid">
            <AllocLaunchCard v-for="(a, i) in available" :key="a.id" :asset="a" :index="i"
              @deploy="openAllocate" @detail="$emit('detail', $event)" />

            <div v-if="reserved.length" class="bay-divider">
              <Lock :size="11" /> Reserved · release to deploy
            </div>
            <AllocLaunchCard v-for="(a, i) in reserved" :key="a.id" :asset="a" :index="available.length + i" reserved
              :busy="releasing.has(a.id)" @release="releaseReserved" @detail="$emit('detail', $event)" />
          </div>
          <AssetEmptyState v-else :icon="PackageCheck" title="Bay is clear"
            sub="No assets are sitting idle. Register or return assets to refill the launch bay.">
            <button class="as-btn as-btn-ghost" @click="$emit('go', 'inventory')"><Boxes :size="14" /> Open inventory</button>
          </AssetEmptyState>
        </template>
      </Motion>

      <!-- ── Field roster ── -->
      <Motion as="section" class="alp-bay as-card"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.12 }">
        <header class="bay-head">
          <div class="bay-head-text">
            <span class="bay-ic field"><Send :size="15" /></span>
            <div>
              <h3 class="bay-title">In the field</h3>
              <p class="bay-sub">{{ active.length }} deployed · {{ pendingCount }} awaiting · {{ overdueCount }} overdue</p>
            </div>
          </div>
        </header>

        <div class="field-tools">
          <div class="field-search">
            <Search :size="14" />
            <input v-model="search" placeholder="Search holder or asset code…" />
          </div>
          <div class="field-chips">
            <button v-for="f in FILTERS" :key="f.key" class="field-chip" :class="{ on: filter === f.key }"
              :data-tone="f.key" @click="filter = f.key">
              {{ f.label }}<span v-if="counts[f.key]" class="field-chip-n">{{ counts[f.key] }}</span>
            </button>
          </div>
        </div>

        <div v-if="loading" class="bay-skel">
          <div v-for="n in 5" :key="n" class="as-skel" style="height: 66px; border-radius: 16px;" />
        </div>
        <AssetEmptyState v-else-if="!filteredActive.length" :icon="filtered ? Filter : ClipboardList"
          :title="filtered ? 'No matches' : 'Nothing in the field'"
          :sub="filtered ? 'Clear the filter to see all active allocations.' : 'Deploy an asset from the launch bay to start tracking it here.'" />
        <ul v-else class="field-list">
          <AllocFieldCard v-for="(al, i) in filteredActive" :key="al.id" :alloc="al" :index="i"
            :fresh="al.asset_id === freshAssetId" :busy="acking.has(al.id)"
            @acknowledge="acknowledge" @return="openReturn" @history="$emit('detail', $event)" />
        </ul>
      </Motion>
    </div>

    <AllocateModal :open="allocOpen" :asset="allocTarget" @close="allocOpen = false" @allocated="onAllocated" />
    <ReturnModal :open="retOpen" :alloc="retTarget" @close="retOpen = false" @returned="onReturned" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  Warehouse, Send, RefreshCw, Search, Lock, Boxes, PackageCheck, Filter, ClipboardList,
} from 'lucide-vue-next'
import AllocConsole from '../components/AllocConsole.vue'
import AllocLaunchCard from '../components/AllocLaunchCard.vue'
import AllocFieldCard from '../components/AllocFieldCard.vue'
import AssetEmptyState from '../components/AssetEmptyState.vue'
import AllocateModal from '../modals/AllocateModal.vue'
import ReturnModal from '../modals/ReturnModal.vue'
import {
  fetchAssets, fetchAllocations, acknowledgeAllocation, patchAsset, errText,
} from '@/composables/useAssets'

const emit = defineEmits(['refresh-stats', 'detail', 'go'])
const toast = useToast()

const available = ref([])
const reserved = ref([])
const allocations = ref([])
const loading = ref(true)

const today = new Date().toISOString().slice(0, 10)
const isOverdue = (al) => al.expected_return_date && al.expected_return_date < today

// Active allocations, sorted: overdue → awaiting ack → live, then newest first.
const active = computed(() => {
  const rank = (al) => isOverdue(al) ? 0 : (!al.acknowledged_by_employee ? 1 : 2)
  return [...allocations.value]
    .filter(a => a.status === 'ALLOCATED')
    .sort((a, b) => rank(a) - rank(b) || (b.allocated_date || '').localeCompare(a.allocated_date || ''))
})
const ackedCount = computed(() => active.value.filter(a => a.acknowledged_by_employee).length)
const pendingCount = computed(() => active.value.length - ackedCount.value)
const overdueCount = computed(() => active.value.filter(isOverdue).length)
const ackRate = computed(() => active.value.length ? Math.round((ackedCount.value / active.value.length) * 100) : 0)

// ── field roster filter / search ──
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Awaiting' },
  { key: 'overdue', label: 'Overdue' },
]
const filter = ref('all')
const search = ref('')
const counts = computed(() => ({ all: active.value.length, pending: pendingCount.value, overdue: overdueCount.value }))
const filtered = computed(() => filter.value !== 'all' || !!search.value.trim())
const filteredActive = computed(() => {
  const q = search.value.trim().toLowerCase()
  return active.value.filter(al => {
    if (filter.value === 'pending' && al.acknowledged_by_employee) return false
    if (filter.value === 'overdue' && !isOverdue(al)) return false
    if (q && !((al.employee_name || '').toLowerCase().includes(q) || (al.asset_code || '').toLowerCase().includes(q))) return false
    return true
  })
})
function onPick(key) { filter.value = ['pending', 'overdue'].includes(key) ? key : 'all' }

// ── load ──
async function reload() {
  loading.value = true
  try {
    const [av, rv, al] = await Promise.all([
      fetchAssets({ asset_status: 'AVAILABLE', limit: 100 }),
      fetchAssets({ asset_status: 'RESERVED', limit: 100 }),
      fetchAllocations({ allocation_status: 'ALLOCATED' }),
    ])
    available.value = av.items || []
    reserved.value = rv.items || []
    allocations.value = al || []
  } catch (e) {
    toast.error(errText(e, 'Failed to load allocations'))
  } finally {
    loading.value = false
  }
}
onMounted(reload)

// ── allocate ──
const allocOpen = ref(false)
const allocTarget = ref(null)
const freshAssetId = ref('')
let freshTimer = null
const openAllocate = (a) => { allocTarget.value = a; allocOpen.value = true }
function onAllocated() {
  freshAssetId.value = allocTarget.value?.id || ''
  reload()
  emit('refresh-stats')
  if (freshTimer) clearTimeout(freshTimer)
  freshTimer = setTimeout(() => { freshAssetId.value = '' }, 1800)
}

// ── return ──
const retOpen = ref(false)
const retTarget = ref(null)
const openReturn = (al) => { retTarget.value = al; retOpen.value = true }
function onReturned() { reload(); emit('refresh-stats') }

// ── acknowledge (optimistic) ──
const acking = reactive(new Set())
async function acknowledge(al) {
  if (al.acknowledged_by_employee || acking.has(al.id)) return
  acking.add(al.id)
  al.acknowledged_by_employee = true // optimistic → ring fills
  try {
    await acknowledgeAllocation(al.id)
    toast.success('Acknowledgement recorded')
    emit('refresh-stats')
  } catch (e) {
    al.acknowledged_by_employee = false
    toast.error(errText(e, 'Failed to acknowledge'))
  } finally {
    acking.delete(al.id)
  }
}

// ── release a reserved asset back to the ready bay (RESERVED → AVAILABLE) ──
const releasing = reactive(new Set())
async function releaseReserved(asset) {
  if (releasing.has(asset.id)) return
  releasing.add(asset.id)
  try {
    await patchAsset(asset.id, { status: 'AVAILABLE' })
    toast.success(`${asset.asset_code} released to the bay`)
    await reload()
    emit('refresh-stats')
  } catch (e) {
    toast.error(errText(e, 'Could not release this reservation'))
  } finally {
    releasing.delete(asset.id)
  }
}
</script>

<style scoped>
.alp { display: flex; flex-direction: column; gap: 16px; }
.alp-bays { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 16px; align-items: start; }
@media (max-width: 1000px) { .alp-bays { grid-template-columns: 1fr; } }

.alp-bay { padding: 16px 16px 18px; display: flex; flex-direction: column; gap: 14px; min-height: 320px; }

.bay-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.bay-head-text { display: flex; align-items: center; gap: 11px; }
.bay-ic { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; flex-shrink: 0; }
.bay-ic.ready { color: var(--as-st-available); background: var(--as-st-available-soft); }
.bay-ic.field { color: var(--as-st-allocated); background: var(--as-st-allocated-soft); }
.bay-title { margin: 0; font-size: 15px; font-weight: 800; color: var(--as-text); }
.bay-sub { margin: 2px 0 0; font-size: 11.5px; color: var(--as-text-muted); }
.bay-refresh { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; cursor: pointer; color: var(--as-text-muted);
  background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: color 0.2s, background 0.2s, transform 0.2s; }
.bay-refresh:hover { color: var(--as-text); background: var(--as-surface-elevated); transform: rotate(40deg); }
.bay-refresh:disabled { cursor: default; }

.bay-skel { display: flex; flex-direction: column; gap: 10px; }
.bay-grid { display: grid; grid-template-columns: 1fr; gap: 11px; max-height: 600px; overflow-y: auto; padding-right: 2px; }
.bay-divider { display: flex; align-items: center; gap: 6px; margin: 6px 2px 0; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--as-text-dim); }
.bay-divider :deep(svg) { color: var(--as-st-reserved); }

/* field tools */
.field-tools { display: flex; flex-direction: column; gap: 10px; }
.field-search { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 11px; background: var(--as-surface); border: 1px solid var(--as-border-soft); color: var(--as-text-dim); }
.field-search:focus-within { border-color: color-mix(in srgb, var(--as-amber) 50%, transparent); }
.field-search input { flex: 1; border: none; background: none; outline: none; font: inherit; font-size: 13px; color: var(--as-text); }
.field-chips { display: flex; gap: 7px; }
.field-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 600;
  color: var(--as-text-secondary); background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: all 0.2s var(--as-spring); }
.field-chip:hover { border-color: var(--as-border-strong); transform: translateY(-1px); }
.field-chip.on { color: var(--as-text); background: color-mix(in srgb, var(--as-amber) 12%, transparent); border-color: color-mix(in srgb, var(--as-amber) 32%, transparent); }
.field-chip.on[data-tone="pending"] { background: var(--as-st-reserved-soft); border-color: color-mix(in srgb, var(--as-st-reserved) 34%, transparent); }
.field-chip.on[data-tone="overdue"] { background: var(--as-al-lost-soft); border-color: color-mix(in srgb, var(--as-al-lost) 34%, transparent); }
.field-chip-n { font-family: var(--as-mono); font-size: 11px; font-weight: 800; padding: 0 5px; border-radius: 999px; background: color-mix(in srgb, var(--as-text) 8%, transparent); }

.field-list { list-style: none; margin: 0; padding: 0 2px 0 0; display: flex; flex-direction: column; gap: 10px; max-height: 600px; overflow-y: auto; }
.spin { animation: as-spin 0.9s linear infinite; }
</style>
