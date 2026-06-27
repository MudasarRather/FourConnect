<template>
  <div class="as-root">
    <div class="as-shell">
      <AssetHangarRail v-model="activeTab" :tabs="TABS" :groups="GROUPS" :counts="tabCounts" />

      <div class="as-main">
        <main class="as-canvas">
          <transition :name="`as-slide-${slideDir}`" mode="out-in">
            <section :key="activeTab" class="canvas-inner">
              <AsDashboardSection v-if="activeTab === 'dashboard'" :stats="stats" @go="selectTab" @new-asset="goNewAsset" />
              <AsInventorySection v-else-if="activeTab === 'inventory'" :stats="stats" :initial-filter="invFilter"
                @refresh-stats="loadStats" @detail="openHistory" @consumed="invFilter = null" />
              <AsAllocationsSection v-else-if="activeTab === 'allocations'" @refresh-stats="loadStats" @detail="openHistory" @go="selectTab" />
              <AsReturnsSection v-else-if="activeTab === 'returns'" @refresh-stats="loadStats" @detail="openHistory" @go="selectTab" />
              <AsHistorySection v-else-if="activeTab === 'history'" :asset-id="historyAssetId" @go="selectTab" @consumed="historyAssetId = ''" />
              <AsTransfersSection v-else-if="activeTab === 'transfers'" @refresh-stats="loadStats" @detail="openHistory" @go="selectTab" />
              <AsDamageSection v-else-if="activeTab === 'damage'" @refresh-stats="loadStats" @detail="openHistory" @go="selectTab" />
              <AsMaintenanceSection v-else-if="activeTab === 'maintenance'" @refresh-stats="loadStats" @detail="openHistory" @go="selectTab" />
              <AsAuditsSection v-else-if="activeTab === 'audits'" @refresh-stats="loadStats" @detail="openHistory" @go="selectTab" />
              <AsDisposalSection v-else-if="activeTab === 'disposal'" @refresh-stats="loadStats" @detail="openHistory" @go="selectTab" />
              <AsCategoriesSection v-else-if="activeTab === 'categories'" @refresh-stats="loadStats" @detail="openHistory" @go="selectTab" />
              <AsVendorsSection v-else-if="activeTab === 'vendors'" @go="selectTab" />
              <AsReportsSection v-else-if="activeTab === 'reports'" @go="selectTab" />
              <AsAuditLogsSection v-else-if="activeTab === 'audit-logs'" @detail="openHistory" @go="selectTab" />
              <AssetComingSoon v-else :section-key="activeTab" :teaser="comingSoonTeaser" @go="selectTab" />
            </section>
          </transition>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import '@/styles/asset-theme.css'

import AssetHangarRail from './components/AssetHangarRail.vue'
import AssetComingSoon from './components/AssetComingSoon.vue'
import AsDashboardSection from './sections/AsDashboardSection.vue'
import AsInventorySection from './sections/AsInventorySection.vue'
import AsAllocationsSection from './sections/AsAllocationsSection.vue'
import AsReturnsSection from './sections/AsReturnsSection.vue'
import AsHistorySection from './sections/AsHistorySection.vue'
import AsTransfersSection from './sections/AsTransfersSection.vue'
import AsDamageSection from './sections/AsDamageSection.vue'
import AsMaintenanceSection from './sections/AsMaintenanceSection.vue'
import AsAuditsSection from './sections/AsAuditsSection.vue'
import AsDisposalSection from './sections/AsDisposalSection.vue'
import AsCategoriesSection from './sections/AsCategoriesSection.vue'
import AsVendorsSection from './sections/AsVendorsSection.vue'
import AsReportsSection from './sections/AsReportsSection.vue'
import AsAuditLogsSection from './sections/AsAuditLogsSection.vue'

import {
  ASSET_TABS, ASSET_TAB_KEYS, ASSET_GROUPS,
  fetchAssetStats, fetchAssets, fetchAllocations, computeAssetStats,
} from '@/composables/useAssets'

const route = useRoute()
const router = useRouter()

const TABS = ASSET_TABS
const GROUPS = ASSET_GROUPS
const VALID = new Set(ASSET_TAB_KEYS)
const activeTab = ref(VALID.has(route.params.tab) ? route.params.tab : 'dashboard')
const slideDir = ref('forward')
const historyAssetId = ref('')
const invFilter = ref(null)   // deep-link filter pushed into the inventory section
// External deep-link (e.g. HR Settings → Asset Categories → "View N assets"):
// /admin/hr/assets/inventory?category_id=…&categoryLabel=… lands pre-filtered.
// Seeded synchronously in setup so the inventory section reads it on its own mount.
if (activeTab.value === 'inventory' && route.query.category_id) {
  invFilter.value = {
    category_id: String(route.query.category_id),
    categoryLabel: route.query.categoryLabel ? String(route.query.categoryLabel) : '',
    _n: 1,
  }
}

const selectTab = (payload) => {
  const key = typeof payload === 'string' ? payload : payload?.tab
  if (!VALID.has(key)) return
  if (payload && typeof payload === 'object') {
    if (payload.assetId) historyAssetId.value = payload.assetId
    // a fresh object each time (with a nonce) so the inventory section's watcher always refires
    if ('filter' in payload) invFilter.value = payload.filter ? { ...payload.filter, _n: (invFilter.value?._n || 0) + 1 } : null
  }
  if (key === activeTab.value) return
  router.replace({ name: 'HrAssetsTab', params: { tab: key } })
}
const openHistory = (assetId) => { historyAssetId.value = assetId; selectTab('history') }
const goNewAsset = () => { selectTab('inventory') }

watch(() => route.params.tab, (t) => {
  if (!t || !VALID.has(t)) return
  slideDir.value = ASSET_TAB_KEYS.indexOf(t) >= ASSET_TAB_KEYS.indexOf(activeTab.value) ? 'forward' : 'back'
  activeTab.value = t
})
watch(activeTab, (key) => {
  if (VALID.has(key) && route.params.tab !== key) router.replace({ name: 'HrAssetsTab', params: { tab: key } })
})

// ── Stats (server /stats with client-aggregate fallback) ──
const stats = ref({})
const loadStats = async () => {
  try {
    const s = await fetchAssetStats()
    if (s && !s.__unavailable) { stats.value = s; return }
  } catch { /* fall through to client aggregate */ }
  try {
    const [inv, allocs] = await Promise.all([fetchAssets({ limit: 100 }), fetchAllocations({})])
    stats.value = computeAssetStats(inv.items || [], allocs || [])
  } catch { /* leave empty */ }
}
onMounted(loadStats)

const tabCounts = computed(() => ({
  returns: stats.value.overdue_returns || null,
  allocations: stats.value.allocated || null,
  damage: stats.value.open_damages || null,
}))

const comingSoonTeaser = computed(() => {
  const s = stats.value || {}
  switch (activeTab.value) {
    case 'transfers': return s.allocated ?? null
    case 'damage': return s.open_damages ?? null
    case 'maintenance': return s.maintenance ?? null
    case 'disposal': return s.retired ?? null
    case 'audits': return s.total ?? null
    case 'categories': return Object.keys(s.by_type || {}).length || null
    default: return s.total ?? null
  }
})
</script>

<style scoped>
.as-root { min-height: 100%; padding: 16px 20px 60px; color: var(--as-text); background: var(--as-canvas); }
.as-shell { display: flex; align-items: flex-start; gap: 18px; }
.as-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 16px; }
.canvas-inner { will-change: transform, opacity; min-height: 440px; }
@media (max-width: 900px) { .as-shell { flex-direction: column; gap: 12px; } }

.as-slide-forward-enter-active, .as-slide-back-enter-active,
.as-slide-forward-leave-active, .as-slide-back-leave-active {
  transition: opacity 0.26s var(--as-ease), transform 0.26s var(--as-ease);
}
.as-slide-forward-enter-from { opacity: 0; transform: translateX(22px); }
.as-slide-forward-leave-to { opacity: 0; transform: translateX(-22px); }
.as-slide-back-enter-from { opacity: 0; transform: translateX(-22px); }
.as-slide-back-leave-to { opacity: 0; transform: translateX(22px); }
@media (prefers-reduced-motion: reduce) {
  .as-slide-forward-enter-active, .as-slide-back-enter-active,
  .as-slide-forward-leave-active, .as-slide-back-leave-active { transition: opacity 0.2s; }
  .as-slide-forward-enter-from, .as-slide-back-enter-from,
  .as-slide-forward-leave-to, .as-slide-back-leave-to { transform: none; }
}
</style>
