<template>
  <div class="sd-assets">
    <div class="sd-toolbar">
      <div class="sd-filter"><SdSelect v-model="orgFilter" :options="orgFilterOpts" placeholder="All organizations" /></div>
      <div class="sd-filter sd-filter-sm"><SdSelect v-model="typeFilter" :options="typeFilterOpts" placeholder="All types" /></div>
      <div class="sd-search">
        <Search :size="15" />
        <input v-model="q" type="text" placeholder="Search assets…" />
      </div>
      <button class="sd-btn sd-btn-primary" @click="openCreate"><Plus :size="15" /> Add Asset</button>
    </div>

    <div v-if="filtered.length" class="sd-asset-grid">
      <Motion
        v-for="(a, i) in filtered"
        :key="a.id"
        as="button"
        type="button"
        class="sd-asset-card sd-card"
        :initial="{ opacity: 0, y: 12 }"
        :animate="{ opacity: 1, y: 0 }"
        :while-hover="{ y: -3 }"
        :transition="{ duration: 0.34, delay: Math.min(i * 0.03, 0.3), ease: [0.16, 1, 0.3, 1] }"
        @click="openEdit(a)"
      >
        <div class="sd-asset-top">
          <span class="sd-asset-badge"><Server :size="18" /></span>
          <span class="sd-asset-type">{{ typeLabel(a.asset_type) }}</span>
        </div>
        <h3 class="sd-asset-name">{{ a.name }}</h3>
        <p class="sd-asset-sub">
          <span v-if="a.serial_number" class="sd-mono">{{ a.serial_number }}</span>
          <span v-if="a.vendor"> · {{ a.vendor }}</span>
        </p>
        <div class="sd-asset-foot">
          <span class="sd-asset-org"><Building2 :size="13" /> {{ a.organization_name || '—' }}</span>
          <span v-if="a.warranty_end" class="sd-asset-warranty" :class="{ expired: isExpired(a.warranty_end) }">
            <ShieldCheck :size="13" /> {{ formatDate(a.warranty_end) }}
            <em v-if="isExpired(a.warranty_end)">expired</em>
          </span>
        </div>
      </Motion>
    </div>
    <div v-else class="sd-empty-state">
      <Server :size="34" />
      <p>{{ loading ? 'Loading…' : 'No assets yet.' }}</p>
      <button v-if="!loading" class="sd-btn sd-btn-primary" @click="openCreate"><Plus :size="15" /> Add an asset</button>
    </div>

    <SdAssetModal :open="modalOpen" :asset="editing" :default-org-id="orgFilter" @close="modalOpen = false" @saved="onSaved" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { Search, Plus, Server, Building2, ShieldCheck } from 'lucide-vue-next'
import SdSelect from '../components/SdSelect.vue'
import SdAssetModal from '../modals/SdAssetModal.vue'
import { listCustomerAssets, loadPickers, usePickers } from '@/composables/useSupportDesk'

defineProps({
  dashboard: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  createSignal: { type: Number, default: 0 },
})
const emit = defineEmits(['go', 'changed'])

const ASSET_TYPES = ['server', 'firewall', 'switch', 'router', 'workstation', 'license', 'database', 'cloud']
const TYPE_LABELS = {
  server: 'Server', firewall: 'Firewall', switch: 'Switch', router: 'Router',
  workstation: 'Workstation', license: 'License', database: 'Database', cloud: 'Cloud',
}

const pickers = usePickers()
const assets = ref([])
const loading = ref(true)
const q = ref('')
const orgFilter = ref(null)
const typeFilter = ref(null)
const modalOpen = ref(false)
const editing = ref(null)

const orgFilterOpts = computed(() => [{ value: null, label: 'All organizations' }, ...(pickers.organizations || []).map(o => ({ value: o.id, label: o.name }))])
const typeFilterOpts = [{ value: null, label: 'All types' }, ...ASSET_TYPES.map(t => ({ value: t, label: TYPE_LABELS[t] }))]

const typeLabel = (t) => TYPE_LABELS[t] || t || '—'

const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  if (!term) return assets.value
  return assets.value.filter(a =>
    (a.name || '').toLowerCase().includes(term) ||
    (a.serial_number || '').toLowerCase().includes(term) ||
    (a.vendor || '').toLowerCase().includes(term)
  )
})

const formatDate = (d) => {
  if (!d) return ''
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return String(d).slice(0, 10)
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
const isExpired = (d) => {
  if (!d) return false
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return false
  return dt.getTime() < Date.now()
}

const reload = async () => {
  loading.value = true
  try {
    const params = {}
    if (orgFilter.value) params.organization_id = orgFilter.value
    if (typeFilter.value) params.asset_type = typeFilter.value
    assets.value = await listCustomerAssets(params)
  } catch { assets.value = [] }
  finally { loading.value = false }
}
const openCreate = () => { editing.value = null; modalOpen.value = true }
const openEdit = (a) => { editing.value = a; modalOpen.value = true }
const onSaved = () => { modalOpen.value = false; reload(); emit('changed') }

watch([orgFilter, typeFilter], reload)
onMounted(() => { loadPickers(); reload() })
</script>

<style scoped>
.sd-assets { display: flex; flex-direction: column; gap: 16px; }
.sd-toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.sd-filter { width: 200px; }
.sd-filter-sm { width: 160px; }
.sd-search { flex: 1; min-width: 160px; display: flex; align-items: center; gap: 9px; padding: 10px 14px; border-radius: 12px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text-muted); }
.sd-search input { flex: 1; background: none; border: none; outline: none; color: var(--sd-text); font-size: 14px; }
.sd-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 11px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; background: var(--sd-grad-hero); color: #1a1206; white-space: nowrap; }
[data-theme="light"] .sd-btn-primary { color: #fff8ec; }

.sd-asset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
.sd-asset-card { padding: 18px; text-align: left; cursor: pointer; transition: border-color 0.2s var(--sd-spring), box-shadow 0.2s var(--sd-spring); }
.sd-asset-card:hover { border-color: var(--sd-amber-border); box-shadow: var(--sd-card-shadow); }
.sd-asset-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.sd-asset-badge { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 12px; color: var(--sd-amber); background: var(--sd-amber-soft); }
.sd-asset-type { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; color: var(--sd-text-secondary); padding: 3px 8px; border-radius: 6px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.sd-asset-name { font-size: 16px; font-weight: 700; color: var(--sd-text); margin: 0 0 4px; }
.sd-asset-sub { font-size: 12px; color: var(--sd-text-muted); margin: 0 0 14px; }
.sd-asset-sub .sd-mono { color: var(--sd-amber); }
.sd-asset-foot { display: flex; flex-direction: column; gap: 6px; }
.sd-asset-org { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--sd-text-secondary); }
.sd-asset-warranty { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--sd-text-secondary); }
.sd-asset-warranty.expired { color: var(--sd-danger); }
.sd-asset-warranty em { font-style: normal; font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 1px 6px; border-radius: 5px; color: var(--sd-danger); background: var(--sd-danger-soft); }

.sd-empty-state { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 56px 20px; color: var(--sd-text-dim); text-align: center; }
.sd-empty-state p { margin: 0; font-size: 14px; color: var(--sd-text-muted); }
</style>
