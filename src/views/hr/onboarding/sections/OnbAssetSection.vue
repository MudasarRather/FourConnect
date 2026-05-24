<template>
  <section class="onb-assets">
    <Motion as="header" class="onb-section-banner as-banner"
      :initial="{ opacity: 0, y: -10 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }"
    >
      <span class="onb-section-banner-glow" />
      <div class="onb-section-banner-text">
        <span class="onb-eyebrow"><span class="onb-eyebrow-dot" /> Inventory · allocate · return</span>
        <h2 class="onb-banner-title">
          <span class="id-title-word">Asset</span>
          <span class="banner-divider">·</span>
          <span class="id-title-word" style="animation-delay: 80ms">Allocation</span>
        </h2>
        <p class="onb-banner-sub">Inventory on the left, allocations on the right. Click <strong>Allocate</strong> on any available asset to issue it to a joiner.</p>
      </div>
      <div class="onb-banner-aside">
        <div class="onb-banner-stat">
          <span class="onb-banner-stat-value">{{ assets.filter(a => a.status === 'AVAILABLE').length }}</span>
          <span class="onb-banner-stat-label">Available</span>
        </div>
        <div class="onb-banner-stat">
          <span class="onb-banner-stat-value">{{ allocations.filter(a => a.status === 'ALLOCATED').length }}</span>
          <span class="onb-banner-stat-label">Allocated</span>
        </div>
        <div class="as-banner-actions">
          <button class="onb-btn-ghost" @click="reload" :disabled="loading"><RefreshCw :size="13" />Refresh</button>
          <button class="onb-btn-primary" @click="openCreate"><Plus :size="13" />New asset</button>
        </div>
      </div>
    </Motion>

    <!-- Inventory + Allocations split -->
    <div class="as-grid">
      <Motion as="section" class="as-card inv-card"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }"
      >
        <header class="card-head">
          <div>
            <h3 class="card-title">Inventory</h3>
            <p class="card-sub">{{ assets.length }} items · filter by type</p>
          </div>
          <select v-model="typeFilter" @change="reload" class="mini-select">
            <option value="">All types</option>
            <option v-for="t in ASSET_TYPES" :key="t" :value="t">{{ t }}</option>
          </select>
        </header>
        <ul class="as-list">
          <Motion v-for="(a, i) in assets" :key="a.id" as="li" class="as-row" :data-status="a.status"
            :initial="{ opacity: 0, x: -6 }" :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.32, delay: 0.03 * i, ease: [0.22, 1, 0.36, 1] }"
          >
            <span class="as-icon" :data-type="a.asset_type"><Package :size="14" /></span>
            <div class="as-row-main">
              <div class="as-code onb-mono">{{ a.asset_code }}</div>
              <div class="as-meta">{{ a.brand || '' }} {{ a.model || a.asset_type }}</div>
              <div class="as-sub onb-mono" v-if="a.serial_number">SN: {{ a.serial_number }}</div>
            </div>
            <div class="as-side">
              <span class="as-pill" :data-status="a.status">{{ a.status }}</span>
              <button v-if="a.status === 'AVAILABLE'" class="onb-btn-ghost mini" @click="openAllocate(a)">Allocate</button>
              <span v-else-if="a.assigned_employee_name" class="as-emp">→ {{ a.assigned_employee_name }}</span>
            </div>
          </Motion>
          <li v-if="!assets.length" class="as-empty">No assets in inventory.</li>
        </ul>
      </Motion>

      <Motion as="section" class="as-card alloc-card"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.45, delay: 0.06, ease: [0.22, 1, 0.36, 1] }"
      >
        <header class="card-head">
          <div>
            <h3 class="card-title">Active allocations</h3>
            <p class="card-sub">Latest 100 records</p>
          </div>
        </header>
        <ul class="as-list">
          <Motion v-for="(al, i) in allocations" :key="al.id" as="li" class="as-row"
            :initial="{ opacity: 0, x: -6 }" :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.32, delay: 0.03 * i, ease: [0.22, 1, 0.36, 1] }"
          >
            <span class="as-icon"><Package :size="14" /></span>
            <div class="as-row-main">
              <div class="as-code onb-mono">{{ al.asset_code }}</div>
              <div class="as-meta">{{ al.employee_name }} · since {{ formatDate(al.allocated_date) }}</div>
            </div>
            <div class="as-side">
              <span class="as-pill" :data-status="al.status">{{ al.status }}</span>
              <button v-if="al.status === 'ALLOCATED'" class="onb-btn-ghost mini" @click="returnAlloc(al)">Return</button>
            </div>
          </Motion>
          <li v-if="!allocations.length" class="as-empty">No active allocations.</li>
        </ul>
      </Motion>
    </div>

    <!-- Allocate modal -->
    <OnbModal :open="!!allocAsset" :title="`Allocate ${allocAsset?.asset_code || ''}`" subtitle="Issue this asset to a joiner" :icon="Package" :width="520" @close="closeAllocate">
      <div class="form-stack">
        <OnbProcessPicker v-model="allocProcessId" label="Allocate to" />
        <div class="form-grid-2">
          <OnbField v-model="allocForm.expected_return_date" type="date" label="Expected return date" />
          <OnbField v-model="allocForm.condition_on_issue" type="select" label="Condition on issue"
            :options="['NEW','GOOD','FAIR','POOR'].map(c => ({ value: c, label: c }))" />
        </div>
        <OnbField v-model="allocForm.notes" type="textarea" label="Notes" placeholder="Any special instructions for the joiner..." full />
      </div>
      <template #footer>
        <button class="onb-btn-ghost" @click="closeAllocate">Cancel</button>
        <button class="onb-btn-primary" :disabled="!allocProcessId" @click="doAllocate"><CheckCircle2 :size="13" />Allocate</button>
      </template>
    </OnbModal>

    <!-- Create asset modal -->
    <OnbModal :open="showCreate" title="Add asset" subtitle="Register a new asset in inventory" :icon="Plus" :width="620" @close="showCreate = false">
      <div class="form-stack">
        <div class="form-grid-2">
          <OnbField v-model="newAsset.asset_code" label="Asset code" placeholder="LAP-001" required />
          <OnbField v-model="newAsset.asset_type" type="select" label="Type" required
            :options="ASSET_TYPES.map(t => ({ value: t, label: t }))" />
          <OnbField v-model="newAsset.brand" label="Brand" placeholder="Apple, Dell, …" required />
          <OnbField v-model="newAsset.model" label="Model" placeholder="MacBook Pro 14” M3" required />
          <OnbField v-model="newAsset.serial_number" label="Serial number" placeholder="ABC123XYZ" required />
          <OnbField v-model="newAsset.condition" type="select" label="Condition" required
            :options="['NEW','GOOD','FAIR','POOR'].map(c => ({ value: c, label: c }))" />
          <OnbField v-model="newAsset.purchase_date" type="date" label="Purchase date" required />
          <OnbField v-model.number="newAsset.purchase_cost" type="number" label="Purchase cost" step="0.01" required />
        </div>
        <OnbField v-model="newAsset.notes" type="textarea" label="Notes" full hint="Optional — any extra context about this asset." />
      </div>
      <template #footer>
        <button class="onb-btn-ghost" @click="showCreate = false">Cancel</button>
        <button class="onb-btn-primary" :disabled="!isAssetValid" @click="doCreate"><Plus :size="13" />Add asset</button>
      </template>
    </OnbModal>
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { RefreshCw, Plus, Package, CheckCircle2 } from 'lucide-vue-next'
import OnbProcessPicker from '../components/OnbProcessPicker.vue'
import OnbModal from '../components/OnbModal.vue'
import OnbField from '../components/OnbField.vue'
import {
  fetchAssets, createAsset, allocateAsset, returnAllocation, fetchAllocations,
} from '../composables/useOnbAssets'
import { fetchProcessDetail } from '../composables/useOnboarding'
import { useToast } from 'vue-toastification'

defineEmits(['refresh-stats'])

const toast = useToast()

const ASSET_TYPES = ['LAPTOP','DESKTOP','MOBILE','SIM','RFID_CARD','ID_CARD','HEADSET','MONITOR','KEYBOARD','MOUSE','VEHICLE','KEYS','OTHER']

const assets = ref([])
const allocations = ref([])
const typeFilter = ref('')
const loading = ref(false)

const allocAsset = ref(null)
const allocProcessId = ref('')
const allocForm = reactive({ expected_return_date: '', condition_on_issue: 'NEW', notes: '' })

const showCreate = ref(false)
const newAsset = reactive({ asset_code: '', asset_type: 'LAPTOP', brand: '', model: '', serial_number: '', condition: 'NEW', purchase_date: '', purchase_cost: null, notes: '' })
const isAssetValid = computed(() => {
  const a = newAsset
  return Boolean(
    a.asset_code && a.asset_type && a.brand && a.model && a.serial_number
    && a.condition && a.purchase_date
    && a.purchase_cost != null && a.purchase_cost !== ''
  )
})

const reload = async () => {
  loading.value = true
  try {
    const params = { limit: 100 }
    if (typeFilter.value) params.asset_type = typeFilter.value
    const inv = await fetchAssets(params)
    assets.value = inv.items || []
    allocations.value = await fetchAllocations({})
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not load assets') }
  finally { loading.value = false }
}
onMounted(reload)

const openCreate = () => {
  Object.assign(newAsset, { asset_code: '', asset_type: 'LAPTOP', brand: '', model: '', serial_number: '', condition: 'NEW', purchase_date: '', purchase_cost: null, notes: '' })
  showCreate.value = true
}
const openAllocate = (a) => { allocAsset.value = a; allocProcessId.value = ''; Object.assign(allocForm, { expected_return_date: '', condition_on_issue: a.condition || 'NEW', notes: '' }) }
const closeAllocate = () => { allocAsset.value = null }

const doAllocate = async () => {
  try {
    const detail = await fetchProcessDetail(allocProcessId.value)
    const payload = {
      asset_id: allocAsset.value.id,
      employee_id: detail.process.employee_id,
      process_id: allocProcessId.value,
      condition_on_issue: allocForm.condition_on_issue,
      notes: allocForm.notes || null,
    }
    if (allocForm.expected_return_date) payload.expected_return_date = allocForm.expected_return_date
    await allocateAsset(allocAsset.value.id, payload)
    toast.success('Allocated')
    closeAllocate()
    await reload()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Allocation failed') }
}
const returnAlloc = async (al) => {
  if (!confirm(`Return ${al.asset_code}?`)) return
  try {
    await returnAllocation(al.id, { returned_date: new Date().toISOString().slice(0, 10), status: 'RETURNED' })
    await reload()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Return failed') }
}
const doCreate = async () => {
  try {
    const payload = { ...newAsset }
    if (!payload.purchase_date) delete payload.purchase_date
    if (payload.purchase_cost == null || payload.purchase_cost === '') delete payload.purchase_cost
    await createAsset(payload)
    showCreate.value = false
    await reload()
    toast.success('Asset added')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Create failed') }
}
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''
</script>

<style scoped>
@import '../../../../styles/onboarding-theme.css';

.onb-assets { display: flex; flex-direction: column; gap: 16px; }

.as-banner .banner-divider {
  display: inline-block; margin: 0 6px;
  color: var(--hr-text-dim); font-weight: 400;
  -webkit-text-fill-color: var(--hr-text-dim);
}
.as-banner strong { color: var(--hr-accent-gold); font-weight: 700; }
.as-banner-actions { display: flex; gap: 8px; align-self: flex-end; }

.as-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 1100px) { .as-grid { grid-template-columns: 1fr; } }

.as-card {
  position: relative;
  background: var(--onb-glass);
  border: var(--onb-glass-stroke);
  border-radius: 22px; overflow: hidden;
  backdrop-filter: var(--onb-glass-blur);
  -webkit-backdrop-filter: var(--onb-glass-blur);
  box-shadow: var(--onb-glass-shadow);
}
.card-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.06); gap: 10px; }
.card-title { margin: 0; font-size: 14px; font-weight: 700; color: var(--hr-text); }
.card-sub { margin: 2px 0 0; font-size: 11.5px; color: var(--hr-text-muted); }
.mini-select { background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); color: var(--hr-text);
  border-radius: 8px; padding: 5px 10px; font-size: 11.5px; font-family: inherit; color-scheme: dark; }

.as-list { list-style: none; margin: 0; padding: 0; max-height: 560px; overflow-y: auto; }
.as-list::-webkit-scrollbar { width: 6px; }
.as-list::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.06); border-radius: 4px; }
.as-row { display: flex; align-items: center; gap: 12px; padding: 12px 18px; border-top: 1px solid var(--hr-border); }
.as-row:first-child { border-top: 0; }
.as-icon { width: 32px; height: 32px; border-radius: 9px; background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold);
  display: inline-flex; align-items: center; justify-content: center; }
.as-icon[data-type="LAPTOP"], .as-icon[data-type="DESKTOP"] { background: rgba(251, 191, 36, 0.16); color: #fbbf24; }
.as-icon[data-type="MOBILE"], .as-icon[data-type="SIM"]    { background: rgba(251, 146, 60, 0.16); color: #fb923c; }
.as-icon[data-type="RFID_CARD"], .as-icon[data-type="ID_CARD"] { background: rgba(192, 132, 252, 0.16); color: #c084fc; }
.as-row-main { flex: 1; min-width: 0; }
.as-code { font-size: 12.5px; font-weight: 700; color: var(--hr-text); }
.as-meta { font-size: 11px; color: var(--hr-text-muted); margin-top: 2px; }
.as-sub { font-size: 10px; color: var(--hr-text-dim); margin-top: 1px; }
.onb-mono { font-family: var(--hr-mono); }
.as-side { display: flex; align-items: center; gap: 8px; }
.as-pill { font-size: 9.5px; font-weight: 700; padding: 3px 8px; border-radius: 999px; background: rgba(255, 255, 255, 0.05); color: var(--hr-text-muted); }
.as-pill[data-status="AVAILABLE"] { background: rgba(52, 211, 153, 0.16); color: #34d399; }
.as-pill[data-status="ALLOCATED"] { background: rgba(251, 191, 36, 0.18); color: #fbbf24; }
.as-pill[data-status="MAINTENANCE"] { background: rgba(248, 113, 113, 0.16); color: #f87171; }
.as-pill[data-status="RETURNED"]  { background: rgba(52, 211, 153, 0.14); color: #34d399; }
.as-pill[data-status="LOST"]      { background: rgba(248, 113, 113, 0.18); color: #f87171; }
.as-emp { font-size: 11px; color: var(--hr-text-muted); }
.as-empty { padding: 22px; text-align: center; font-size: 12px; color: var(--hr-text-dim); }
.mini { padding: 4px 10px; font-size: 11px; }

.form-stack { display: flex; flex-direction: column; gap: 14px; }
.form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
</style>
