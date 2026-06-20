<template>
  <div class="hist">
    <HistChronicleHero
      v-model:query="query" :results="results" :searching="searching"
      :recent="recent" :loading-recent="loadingRecent" :collapsed="!!selected"
      @select="select" @select-id="selectById" />

    <template v-if="selected">
      <HistAssetDossier :asset="selected" :events="events" @clear="clear" />

      <div v-if="loadingHistory" class="hist-skel">
        <div class="as-skel" style="height:118px;border-radius:18px" />
        <div class="as-skel" style="height:420px;border-radius:18px" />
      </div>

      <template v-else-if="events.length">
        <HistTapeReel :events="events" :active-id="activeId" @seek="onSeek" />
        <HistChronicleSpine :events="events" :active-id="activeId" @go="onGo" />
      </template>

      <AssetEmptyState v-else :icon="History" title="No recorded events yet"
        sub="This asset's black box is empty — once it's allocated, serviced, transferred or audited, every move will surface here on the time-spine." />
    </template>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { History } from 'lucide-vue-next'
import HistChronicleHero from '../components/HistChronicleHero.vue'
import HistAssetDossier from '../components/HistAssetDossier.vue'
import HistTapeReel from '../components/HistTapeReel.vue'
import HistChronicleSpine from '../components/HistChronicleSpine.vue'
import AssetEmptyState from '../components/AssetEmptyState.vue'
import {
  fetchAssets, fetchAsset, fetchAssetHistory, fetchAllocations, fetchAuditLogs, errText,
} from '@/composables/useAssets'

const props = defineProps({ assetId: { type: String, default: '' } })
const emit = defineEmits(['go', 'consumed'])
const toast = useToast()

const query = ref('')
const results = ref([])
const searching = ref(false)
const selected = ref(null)
const events = ref([])
const loadingHistory = ref(false)
const activeId = ref(null)

const recent = ref([])
const loadingRecent = ref(false)

// ── search (debounced) ──
let deb = null
watch(query, () => {
  clearTimeout(deb)
  if (!query.value.trim()) { results.value = []; searching.value = false; return }
  searching.value = true
  deb = setTimeout(doSearch, 300)
})
async function doSearch() {
  const q = query.value.trim()
  if (!q) { results.value = []; searching.value = false; return }
  try {
    const res = await fetchAssets({ search: q, limit: 12 })
    results.value = res.items || []
  } catch (e) { toast.error(errText(e, 'Search failed')) }
  finally { searching.value = false }
}

// ── selection ──
async function select(a) {
  selected.value = a
  results.value = []
  query.value = ''
  activeId.value = null
  events.value = []           // drop the previous asset's timeline so vitals don't flash stale
  loadingHistory.value = true
  try {
    let hist = []
    try { hist = await fetchAssetHistory(a.id) }
    catch (e) {
      // graceful fallback: derive a thin timeline from allocations if /history is absent
      if ([404, 405].includes(e?.response?.status)) {
        const allocs = await fetchAllocations({})
        hist = allocs.filter(al => al.asset_id === a.id).map(al => ({
          id: al.id, asset_id: a.id, event_type: al.status === 'ALLOCATED' ? 'ALLOCATED' : 'RETURNED',
          to_status: al.status, note: al.employee_name || '', created_at: al.created_at,
        }))
      } else throw e
    }
    events.value = hist
  } catch (e) {
    toast.error(errText(e, 'Failed to load history'))
    events.value = []
  } finally {
    loadingHistory.value = false
  }
}

async function selectById(id) {
  if (!id) return
  try {
    const a = await fetchAsset(id)
    if (a) await select(a)
  } catch (e) {
    toast.error(errText(e, 'Could not open that asset'))
  }
}

function clear() {
  selected.value = null; events.value = []; activeId.value = null
  query.value = ''; results.value = []
  loadRecent()
}

const onSeek = (id) => { activeId.value = activeId.value === id ? null : id }
const onGo = (tab) => emit('go', tab)

// ── idle recent-activity feed (cross-asset entry) ──
async function loadRecent() {
  loadingRecent.value = true
  try {
    const res = await fetchAuditLogs({ page: 1, limit: 24 })
    recent.value = res?.items || []
  } catch { recent.value = [] }
  finally { loadingRecent.value = false }
}

// ── deep-link from an inventory/allocation/return card ──
// Consume the id once (the workspace clears it) so returning to this tab later
// lands on the idle hub instead of re-opening a dossier the user already cleared.
watch(() => props.assetId, (id) => { if (id) { selectById(id); emit('consumed') } })
onMounted(() => {
  if (props.assetId) { selectById(props.assetId); emit('consumed') }
  else loadRecent()
})
</script>

<style scoped>
.hist { display: flex; flex-direction: column; gap: 14px; }
.hist-skel { display: flex; flex-direction: column; gap: 14px; }
</style>
