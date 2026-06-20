<template>
  <div class="inv">
    <InvPulseStrip :stats="stats" :active-status="statusFilter" @pick="onStatus" />

    <Motion as="section" class="inv-console as-card"
      :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.05 }">
      <InvCommandBar
        :search="search" @update:search="onSearch"
        :sort="sort" :options="SORT_OPTIONS" @update:sort="onSort"
        :view="view" @update:view="view = $event"
        :result-count="total" :filtered="filtered" :loading="loading"
        @register="openCreate" />
      <span class="inv-console-div" aria-hidden="true" />
      <InvFilterChips
        :stats="stats"
        :status-filter="statusFilter" @update:statusFilter="onStatus"
        :type-filter="typeFilter" @update:typeFilter="onType"
        :condition-filter="conditionFilter" @update:conditionFilter="onCond"
        :warranty="warranty" @update:warranty="onWarranty" />
    </Motion>

    <!-- category deep-link banner (from Categories → "Open in Fleet bay") -->
    <Transition name="inv-fade">
      <div v-if="categoryId" class="inv-catbar">
        <span class="inv-catbar-ic"><FolderTree :size="14" /></span>
        <span class="inv-catbar-txt">Showing assets in category <b>{{ categoryLabel || 'selected' }}</b></span>
        <button type="button" class="inv-catbar-x" @click="clearCategory"><X :size="13" /> Clear</button>
      </div>
    </Transition>

    <!-- vendor deep-link banner (from Vendors → "View sourced assets") -->
    <Transition name="inv-fade">
      <div v-if="vendorId" class="inv-catbar">
        <span class="inv-catbar-ic"><Building2 :size="14" /></span>
        <span class="inv-catbar-txt">Showing assets sourced from <b>{{ vendorLabel || 'selected vendor' }}</b></span>
        <button type="button" class="inv-catbar-x" @click="clearVendor"><X :size="13" /> Clear</button>
      </div>
    </Transition>

    <!-- loading -->
    <div v-if="loading && !assets.length" class="inv-stage">
      <div v-if="view === 'bay'" class="inv-grid">
        <div v-for="n in 8" :key="n" class="inv-skel" :style="{ '--i': n }">
          <span class="inv-skel-scan" />
        </div>
      </div>
      <div v-else class="inv-manifest">
        <div v-for="n in 7" :key="n" class="inv-skel-row" :style="{ '--i': n }"><span class="inv-skel-scan" /></div>
      </div>
    </div>

    <!-- empty -->
    <AssetEmptyState v-else-if="!assets.length" :icon="Boxes" title="No assets in this bay"
      :sub="filtered ? 'No assets match the current filters — try widening or clearing them.' : 'Register your first asset to start tracking the fleet.'">
      <button v-if="filtered" class="as-btn as-btn-ghost" @click="clearAll"><FilterX :size="14" /> Clear filters</button>
      <button class="as-btn as-btn-primary" @click="openCreate"><Plus :size="14" /> Register asset</button>
    </AssetEmptyState>

    <!-- results -->
    <Transition v-else :name="view === 'bay' ? 'inv-fade' : 'inv-fade'" mode="out-in">
      <div :key="view" class="inv-stage">
        <!-- BAY (grid) -->
        <div v-if="view === 'bay'" class="inv-grid-wrap">
          <span class="inv-bayscan" :key="gridNonce" aria-hidden="true" />
          <div class="inv-grid" :key="gridNonce">
            <AssetCard v-for="(a, i) in assets" :key="a.id" :asset="a" :index="i"
              @allocate="openAllocate" @edit="openEdit" @detail="$emit('detail', a.id)" @delete="openDelete" />
          </div>
        </div>

        <!-- MANIFEST (list) -->
        <div v-else class="inv-manifest-wrap">
          <div class="inv-manifest">
            <div class="mh">
              <span class="mh-c">Asset</span>
              <span class="mh-c">Type</span>
              <span class="mh-c">Status</span>
              <span class="mh-c">Condition</span>
              <span class="mh-c">Assigned to</span>
              <span class="mh-c mh-right">Value</span>
              <span class="mh-c mh-right">Actions</span>
            </div>
            <div class="inv-rows" :key="gridNonce">
              <InvManifestRow v-for="(a, i) in assets" :key="a.id" :asset="a" :index="i"
                @allocate="openAllocate" @edit="openEdit" @detail="$emit('detail', a.id)" @delete="openDelete" />
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- pager -->
    <div v-if="totalPages > 1" class="inv-pager">
      <button class="as-btn as-btn-ghost" :disabled="page <= 1" @click="go(page - 1)"><ChevronLeft :size="14" /></button>
      <span class="inv-page as-mono">{{ page }} / {{ totalPages }}</span>
      <button class="as-btn as-btn-ghost" :disabled="page >= totalPages" @click="go(page + 1)"><ChevronRight :size="14" /></button>
    </div>

    <AssetUpsertModal :open="upsertOpen" :asset="editTarget" @close="upsertOpen = false" @saved="onMutate" />
    <AllocateModal :open="allocOpen" :asset="allocTarget" @close="allocOpen = false" @allocated="onMutate" />
    <AssetDeleteModal :open="delOpen" :loading="deleting" title="Delete asset"
      :item-name="delTarget?.asset_code" :item-meta="delTarget ? `${delTarget.brand || ''} ${delTarget.model || delTarget.asset_type}` : ''"
      :icon="Boxes" :reasons="ASSET_DELETE_REASONS" require-reason
      :consequences="['Removes it from inventory views', 'Allocation history is preserved', 'Cannot be deleted while allocated / in service']"
      confirm-label="Delete asset" @close="delOpen = false" @confirm="doDelete" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  Plus, Boxes, ChevronLeft, ChevronRight, FilterX, FolderTree, Building2, X,
  Clock, ArrowDownAZ, Coins, ShieldCheck,
} from 'lucide-vue-next'
import InvPulseStrip from '../components/InvPulseStrip.vue'
import InvCommandBar from '../components/InvCommandBar.vue'
import InvFilterChips from '../components/InvFilterChips.vue'
import InvManifestRow from '../components/InvManifestRow.vue'
import AssetCard from '../components/AssetCard.vue'
import AssetEmptyState from '../components/AssetEmptyState.vue'
import AssetDeleteModal from '../components/AssetDeleteModal.vue'
import AssetUpsertModal from '../modals/AssetUpsertModal.vue'
import AllocateModal from '../modals/AllocateModal.vue'
import { fetchAssets, deleteAsset, ASSET_DELETE_REASONS, errText } from '@/composables/useAssets'

const props = defineProps({
  stats: { type: Object, default: () => ({}) },
  initialFilter: { type: Object, default: null },
})
const emit = defineEmits(['refresh-stats', 'detail', 'consumed'])
const toast = useToast()

// ── sort catalog (single source of truth; passed to the command bar) ──
const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest first', by: 'created_at', dir: 'desc', icon: Clock },
  { id: 'oldest', label: 'Oldest first', by: 'created_at', dir: 'asc', icon: Clock },
  { id: 'code', label: 'Code A → Z', by: 'asset_code', dir: 'asc', icon: ArrowDownAZ },
  { id: 'value_hi', label: 'Value: high → low', by: 'purchase_cost', dir: 'desc', icon: Coins },
  { id: 'value_lo', label: 'Value: low → high', by: 'purchase_cost', dir: 'asc', icon: Coins },
  { id: 'warranty', label: 'Warranty: soonest', by: 'warranty_end', dir: 'asc', icon: ShieldCheck },
]

const assets = ref([])
const loading = ref(true)
const page = ref(1)
const limit = 12
const total = ref(0)
const totalPages = ref(1)
const gridNonce = ref(0)

const search = ref('')
const statusFilter = ref('')
const typeFilter = ref('')
const conditionFilter = ref('')
const warranty = ref(false)
const categoryId = ref('')          // deep-link only (from Categories → "Open in Fleet bay")
const categoryLabel = ref('')
const vendorId = ref('')             // deep-link only (from Vendors → "View sourced assets")
const vendorLabel = ref('')
const sort = ref(SORT_OPTIONS[0])
const view = ref('bay')

const filtered = computed(() =>
  !!(search.value || statusFilter.value || typeFilter.value || conditionFilter.value || warranty.value || categoryId.value || vendorId.value))

async function reload() {
  loading.value = true
  try {
    const res = await fetchAssets({
      page: page.value, limit,
      search: search.value || undefined,
      asset_type: typeFilter.value || undefined,
      asset_status: statusFilter.value || undefined,
      condition: conditionFilter.value || undefined,
      warranty_expiring: warranty.value || undefined,
      category_id: categoryId.value || undefined,
      vendor_id: vendorId.value || undefined,
      sort_by: sort.value.by,
      sort_dir: sort.value.dir,
    })
    assets.value = res.items || []
    total.value = res.total ?? assets.value.length
    totalPages.value = res.total_pages || 1
    gridNonce.value++   // re-deal the bay/manifest on every successful load
  } catch (e) {
    toast.error(errText(e, 'Failed to load inventory'))
  } finally {
    loading.value = false
  }
}

// ── change handlers (avoid watcher double-fires; each resets to page 1) ──
let deb = null
function onSearch(v) { search.value = v; clearTimeout(deb); deb = setTimeout(() => { page.value = 1; reload() }, 320) }
function onStatus(v) { statusFilter.value = statusFilter.value === v ? '' : v; page.value = 1; reload() }
function onType(v) { typeFilter.value = v; page.value = 1; reload() }
function onCond(v) { conditionFilter.value = v; page.value = 1; reload() }
function onWarranty(v) { warranty.value = v; page.value = 1; reload() }
function onSort(o) { sort.value = o; page.value = 1; reload() }
function go(p) { page.value = p; reload() }

function clearAll() {
  search.value = ''; statusFilter.value = ''; typeFilter.value = ''
  conditionFilter.value = ''; warranty.value = false; categoryId.value = ''; categoryLabel.value = ''
  vendorId.value = ''; vendorLabel.value = ''; page.value = 1
  reload()
}
function clearCategory() { categoryId.value = ''; categoryLabel.value = ''; page.value = 1; reload() }
function clearVendor() { vendorId.value = ''; vendorLabel.value = ''; page.value = 1; reload() }

// ── deep-link filters from dashboard / hero lenses ──
function applyFilter(f) {
  if (!f) return false
  search.value = f.search || ''
  statusFilter.value = f.status || ''
  typeFilter.value = f.type || ''
  conditionFilter.value = f.condition || ''
  warranty.value = !!f.warranty
  categoryId.value = f.category_id || ''
  categoryLabel.value = f.categoryLabel || ''
  vendorId.value = f.vendor_id || ''
  vendorLabel.value = f.vendorLabel || ''
  page.value = 1
  return true
}
watch(() => props.initialFilter, (f) => { if (applyFilter(f)) { reload(); emit('consumed') } })

onMounted(() => {
  const had = applyFilter(props.initialFilter)
  reload()
  if (had) emit('consumed')   // one-shot: parent clears the deep-link so a later rail revisit isn't re-filtered
})

// ── modals ──
const upsertOpen = ref(false)
const editTarget = ref(null)
const openCreate = () => { editTarget.value = null; upsertOpen.value = true }
const openEdit = (a) => { editTarget.value = a; upsertOpen.value = true }

const allocOpen = ref(false)
const allocTarget = ref(null)
const openAllocate = (a) => { allocTarget.value = a; allocOpen.value = true }

const delOpen = ref(false)
const delTarget = ref(null)
const deleting = ref(false)
const openDelete = (a) => { delTarget.value = a; delOpen.value = true }

function onMutate() { reload(); emit('refresh-stats') }

async function doDelete() {
  if (!delTarget.value) return
  deleting.value = true
  try {
    await deleteAsset(delTarget.value.id)
    toast.success('Asset deleted')
    delOpen.value = false
    onMutate()
  } catch (e) {
    toast.error(errText(e, 'Could not delete — return or close open records first.'))
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.inv { display: flex; flex-direction: column; gap: 14px; }

.inv-console { padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }
.inv-console-div { height: 1px; background: linear-gradient(90deg, transparent, var(--as-border-soft) 12%, var(--as-border-soft) 88%, transparent); }

.inv-stage { min-height: 320px; }
.inv-grid-wrap { position: relative; }
.inv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 14px; }

/* bay-scan: a single light sweep across the whole grid on (re)deal.
   Full-width element + narrow bright band → translateX(100%) traverses the grid. */
.inv-bayscan { position: absolute; top: -6px; bottom: -6px; left: 0; width: 100%; z-index: 3; pointer-events: none;
  background: linear-gradient(90deg, transparent 4%, color-mix(in srgb, var(--as-amber) 16%, transparent) 11%, transparent 20%);
  filter: blur(5px); animation: as-bay-scan 0.95s ease both; }

/* manifest */
.inv-manifest-wrap { overflow-x: auto; }
.inv-manifest { --manifest-cols: minmax(190px, 1.6fr) 96px 122px 132px minmax(120px, 1fr) 96px 104px; min-width: 880px; display: flex; flex-direction: column; gap: 7px; }
.mh { display: grid; grid-template-columns: var(--manifest-cols); gap: 12px; align-items: center; padding: 4px 16px 4px 18px; }
.mh-c { font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--as-text-dim); }
.mh-right { text-align: right; }
.inv-rows { display: flex; flex-direction: column; gap: 7px; }

/* skeletons */
.inv-skel { position: relative; overflow: hidden; height: 158px; border-radius: 19px; background: var(--as-surf-card); border: 1px solid var(--as-border-soft);
  animation: as-deal 0.5s var(--as-spring) both; animation-delay: calc(var(--i) * 0.05s); }
.inv-skel-row { position: relative; overflow: hidden; height: 58px; border-radius: 13px; background: var(--as-surface); border: 1px solid var(--as-border-soft);
  animation: as-deal-row 0.45s var(--as-spring) both; animation-delay: calc(var(--i) * 0.05s); }
.inv-skel-scan { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, color-mix(in srgb, var(--as-amber) 9%, transparent) 50%, transparent 70%);
  background-size: 220% 100%; animation: as-sheen 1.5s ease infinite; }

.inv-pager { display: flex; align-items: center; justify-content: center; gap: 14px; padding-top: 6px; }
.inv-page { font-size: 13px; color: var(--as-text-muted); }

.inv-fade-enter-active, .inv-fade-leave-active { transition: opacity 0.28s var(--as-ease), transform 0.28s var(--as-ease); }
.inv-fade-enter-from { opacity: 0; transform: translateY(10px); }
.inv-fade-leave-to { opacity: 0; transform: translateY(-10px); }

/* category deep-link banner */
.inv-catbar { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 13px;
  background: color-mix(in srgb, var(--as-amber) 9%, var(--as-surface)); border: 1px solid color-mix(in srgb, var(--as-amber) 28%, transparent); }
.inv-catbar-ic { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 9px; color: var(--as-amber); background: color-mix(in srgb, var(--as-amber) 14%, transparent); flex-shrink: 0; }
.inv-catbar-txt { flex: 1; min-width: 0; font-size: 12.5px; color: var(--as-text-secondary); }
.inv-catbar-txt b { color: var(--as-text); font-weight: 800; }
.inv-catbar-x { display: inline-flex; align-items: center; gap: 4px; font: inherit; font-size: 11.5px; font-weight: 700; cursor: pointer;
  padding: 5px 10px; border-radius: 8px; color: var(--as-text-muted); background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: all 0.2s; }
.inv-catbar-x:hover { color: var(--as-text); border-color: var(--as-border-strong); }

@media (prefers-reduced-motion: reduce) {
  .inv-bayscan, .inv-skel, .inv-skel-row, .inv-skel-scan { animation: none; }
  .inv-bayscan { display: none; }
}
</style>
