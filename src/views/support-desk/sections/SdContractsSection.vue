<template>
  <div class="sd-contracts">
    <div class="sd-toolbar">
      <div class="sd-filter"><SdSelect v-model="orgFilter" :options="orgFilterOpts" placeholder="All organizations" /></div>
      <div class="sd-search">
        <Search :size="15" />
        <input v-model="q" type="text" placeholder="Search contracts…" />
      </div>
      <button class="sd-btn sd-btn-primary" @click="openCreate"><Plus :size="15" /> Add Contract</button>
    </div>

    <div v-if="filtered.length" class="sd-contract-list">
      <Motion
        v-for="(c, i) in filtered"
        :key="c.id"
        as="button"
        type="button"
        class="sd-contract-row sd-card"
        :initial="{ opacity: 0, y: 10 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.3, delay: Math.min(i * 0.025, 0.3), ease: [0.16, 1, 0.3, 1] }"
        @click="openEdit(c)"
      >
        <div class="sd-contract-icon"><FileText :size="18" /></div>
        <div class="sd-contract-main">
          <p class="sd-contract-name">
            <span v-if="c.contract_number" class="sd-mono">{{ c.contract_number }}</span>
            <span class="sd-contract-title">{{ c.name }}</span>
          </p>
          <p class="sd-contract-sub">{{ c.organization_name || '—' }}</p>
        </div>
        <div class="sd-contract-meta">
          <span v-if="c.contract_value != null" class="sd-contract-value">{{ formatValue(c) }}</span>
          <span class="sd-status-badge" :class="statusClass(c.status)">{{ statusLabel(c.status) }}</span>
          <span v-if="c.renewal_date" class="sd-contract-renew"><CalendarClock :size="13" /> {{ formatDate(c.renewal_date) }}</span>
        </div>
      </Motion>
    </div>
    <div v-else class="sd-empty-state">
      <FileText :size="34" />
      <p>{{ loading ? 'Loading…' : 'No contracts yet.' }}</p>
      <button v-if="!loading" class="sd-btn sd-btn-primary" @click="openCreate"><Plus :size="15" /> Add a contract</button>
    </div>

    <SdContractModal :open="modalOpen" :contract="editing" :default-org-id="orgFilter" @close="modalOpen = false" @saved="onSaved" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { Search, Plus, FileText, CalendarClock } from 'lucide-vue-next'
import SdSelect from '../components/SdSelect.vue'
import SdContractModal from '../modals/SdContractModal.vue'
import { listContracts, loadPickers, usePickers } from '@/composables/useSupportDesk'

defineProps({
  dashboard: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  createSignal: { type: Number, default: 0 },
})
const emit = defineEmits(['go', 'changed'])

const pickers = usePickers()
const contracts = ref([])
const loading = ref(true)
const q = ref('')
const orgFilter = ref(null)
const modalOpen = ref(false)
const editing = ref(null)

const orgFilterOpts = computed(() => [{ value: null, label: 'All organizations' }, ...(pickers.organizations || []).map(o => ({ value: o.id, label: o.name }))])

const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  if (!term) return contracts.value
  return contracts.value.filter(c =>
    (c.name || '').toLowerCase().includes(term) ||
    (c.contract_number || '').toLowerCase().includes(term)
  )
})

const STATUS_LABELS = { active: 'Active', expired: 'Expired', terminated: 'Terminated' }
const statusLabel = (s) => STATUS_LABELS[s] || s || '—'
const statusClass = (s) => (s === 'active' ? 'is-active' : s === 'terminated' ? 'is-terminated' : 'is-expired')

const formatValue = (c) => {
  const cur = c.currency || 'INR'
  const v = Number(c.contract_value)
  if (Number.isNaN(v)) return `${cur} ${c.contract_value}`
  return `${cur} ${v.toLocaleString('en-IN')}`
}
const formatDate = (d) => {
  if (!d) return ''
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return String(d).slice(0, 10)
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const reload = async () => {
  loading.value = true
  try {
    const params = {}
    if (orgFilter.value) params.organization_id = orgFilter.value
    contracts.value = await listContracts(params)
  } catch { contracts.value = [] }
  finally { loading.value = false }
}
const openCreate = () => { editing.value = null; modalOpen.value = true }
const openEdit = (c) => { editing.value = c; modalOpen.value = true }
const onSaved = () => { modalOpen.value = false; reload(); emit('changed') }

watch(orgFilter, reload)
onMounted(() => { loadPickers(); reload() })
</script>

<style scoped>
.sd-contracts { display: flex; flex-direction: column; gap: 16px; }
.sd-toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.sd-filter { width: 220px; }
.sd-search { flex: 1; min-width: 180px; display: flex; align-items: center; gap: 9px; padding: 10px 14px; border-radius: 12px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text-muted); }
.sd-search input { flex: 1; background: none; border: none; outline: none; color: var(--sd-text); font-size: 14px; }
.sd-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 11px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; background: var(--sd-grad-hero); color: #1a1206; white-space: nowrap; }
[data-theme="light"] .sd-btn-primary { color: #fff8ec; }

.sd-contract-list { display: flex; flex-direction: column; gap: 9px; }
.sd-contract-row { display: flex; align-items: center; gap: 14px; padding: 13px 16px; text-align: left; cursor: pointer; transition: border-color 0.2s var(--sd-spring); }
.sd-contract-row:hover { border-color: var(--sd-amber-border); }
.sd-contract-icon { width: 40px; height: 40px; border-radius: 11px; display: grid; place-items: center; color: var(--sd-amber); background: var(--sd-amber-soft); flex-shrink: 0; }
.sd-contract-main { flex: 1; min-width: 0; }
.sd-contract-name { display: flex; align-items: center; gap: 10px; font-size: 14.5px; margin: 0 0 3px; flex-wrap: wrap; }
.sd-contract-name .sd-mono { font-size: 12px; color: var(--sd-amber); }
.sd-contract-title { font-weight: 600; color: var(--sd-text); }
.sd-contract-sub { font-size: 12.5px; color: var(--sd-text-muted); margin: 0; }
.sd-contract-meta { display: flex; flex-direction: column; gap: 5px; align-items: flex-end; flex-shrink: 0; }
.sd-contract-value { font-size: 13px; font-weight: 700; color: var(--sd-text); }
.sd-contract-renew { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--sd-text-secondary); }

.sd-status-badge { font-size: 10.5px; font-weight: 700; letter-spacing: 0.02em; text-transform: uppercase; padding: 2px 8px; border-radius: 6px; }
.sd-status-badge.is-active { color: var(--sd-success); background: var(--sd-success-soft); }
.sd-status-badge.is-expired { color: var(--sd-steel); background: var(--sd-steel-soft); }
.sd-status-badge.is-terminated { color: var(--sd-danger); background: var(--sd-danger-soft); }

.sd-empty-state { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 56px 20px; color: var(--sd-text-dim); text-align: center; }
.sd-empty-state p { margin: 0; font-size: 14px; color: var(--sd-text-muted); }
@media (max-width: 640px) { .sd-contract-meta { display: none; } }
</style>
