<template>
  <div class="sd-svc">
    <!-- ───────────── Panel 1: Catalog items ───────────── -->
    <section class="sd-svc-panel">
      <div class="sd-panel-head">
        <div>
          <p class="sd-panel-eyebrow">CATALOG</p>
          <h3 class="sd-panel-title">Service Items</h3>
        </div>
        <button class="sd-btn sd-btn-primary" @click="openCreate"><Plus :size="15" /> Add Service</button>
      </div>

      <div v-if="items.length" class="sd-item-grid">
        <Motion
          v-for="(it, i) in items"
          :key="it.id"
          as="button"
          type="button"
          class="sd-item-card sd-card"
          :initial="{ opacity: 0, y: 12 }"
          :animate="{ opacity: 1, y: 0 }"
          :while-hover="{ y: -3 }"
          :transition="{ duration: 0.34, delay: Math.min(i * 0.03, 0.3), ease: [0.16, 1, 0.3, 1] }"
          @click="openEdit(it)"
        >
          <div class="sd-item-top">
            <span class="sd-item-badge"><Package :size="18" /></span>
            <span v-if="it.is_active === false" class="sd-item-inactive">inactive</span>
          </div>
          <h4 class="sd-item-name">{{ it.name }}</h4>
          <p class="sd-item-cat">{{ it.category || 'General' }}</p>
          <div class="sd-item-meta">
            <span v-if="it.cost != null" class="sd-item-cost">{{ fmtCost(it.cost) }}</span>
            <span class="sd-item-eta"><Clock :size="12" /> {{ etaLabel(it.estimated_delivery_hours) }}</span>
          </div>
          <span v-if="it.approval_required" class="sd-item-approval"><ShieldCheck :size="12" /> Approval required</span>
        </Motion>
      </div>
      <div v-else class="sd-empty-state">
        <Package :size="34" />
        <p>{{ itemsLoading ? 'Loading…' : 'No catalog items yet.' }}</p>
        <button v-if="!itemsLoading" class="sd-btn sd-btn-primary" @click="openCreate"><Plus :size="15" /> Add a service</button>
      </div>
    </section>

    <!-- ───────────── Panel 2: Service requests ───────────── -->
    <section class="sd-svc-panel">
      <div class="sd-panel-head">
        <div>
          <p class="sd-panel-eyebrow">FULFILMENT</p>
          <h3 class="sd-panel-title">Service Requests</h3>
        </div>
        <div class="sd-filter"><SdSelect v-model="reqStatusFilter" :options="reqFilterOpts" placeholder="All statuses" /></div>
      </div>

      <div v-if="requests.length" class="sd-req-list">
        <Motion
          v-for="(r, i) in requests"
          :key="r.id"
          as="div"
          class="sd-req-row sd-card"
          :initial="{ opacity: 0, y: 10 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.3, delay: Math.min(i * 0.025, 0.3), ease: [0.16, 1, 0.3, 1] }"
        >
          <div class="sd-req-main">
            <p class="sd-req-name">{{ r.service_item_name || 'Service request' }}</p>
            <p class="sd-req-date">{{ fmtDate(r.created_at) }}</p>
          </div>
          <span class="sd-req-badge" :class="reqStatusClass(r.status)">{{ statusLabel(r.status) }}</span>
          <div class="sd-req-action">
            <SdSelect
              :model-value="r.status"
              :options="statusOpts"
              placeholder="Set status"
              @update:model-value="(v) => changeStatus(r, v)"
            />
          </div>
        </Motion>
      </div>
      <div v-else class="sd-empty-state">
        <ClipboardList :size="34" />
        <p>{{ reqLoading ? 'Loading…' : 'No service requests yet.' }}</p>
      </div>
    </section>

    <SdServiceItemModal :open="modalOpen" :item="editing" @close="modalOpen = false" @saved="onSaved" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import axios from 'axios'
import { Motion } from 'motion-v'
import { Plus, Package, Clock, ShieldCheck, ClipboardList } from 'lucide-vue-next'
import { API } from '@/utils/api'
import SdSelect from '../components/SdSelect.vue'
import SdServiceItemModal from '../modals/SdServiceItemModal.vue'
import { listServiceItems, listServiceRequests } from '@/composables/useSupportDesk'

// NOTE: useSupportDesk.js does not export `updateServiceRequest` (and we must not
// modify that shared file). Inlined here using the same path-aware auth header
// + API base pattern the composable itself uses.
const _authHeader = () => {
  const isUser = typeof window !== 'undefined' && window.location?.pathname?.startsWith('/user')
  const primary = isUser ? 'user_token' : 'admin_token'
  const fallback = isUser ? 'admin_token' : 'user_token'
  const t = localStorage.getItem(primary) || localStorage.getItem(fallback)
  return t ? { Authorization: `Bearer ${t}` } : {}
}
const updateServiceRequest = async (id, body) =>
  (await axios.patch(`${API}/support-desk/service-requests/${id}`, body, { headers: _authHeader() })).data

const props = defineProps({
  dashboard: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  createSignal: { type: Number, default: 0 },
})
const emit = defineEmits(['go', 'changed'])

const items = ref([])
const requests = ref([])
const itemsLoading = ref(true)
const reqLoading = ref(true)
const reqStatusFilter = ref(null)
const modalOpen = ref(false)
const editing = ref(null)

const REQ_STATUSES = [
  { value: 'requested', label: 'Requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'closed', label: 'Closed' },
  { value: 'rejected', label: 'Rejected' },
]
const statusOpts = REQ_STATUSES
const reqFilterOpts = [{ value: null, label: 'All statuses' }, ...REQ_STATUSES]

const statusLabel = (v) => REQ_STATUSES.find(s => s.value === v)?.label || v || '—'
const reqStatusClass = (v) => ({
  requested: 'is-open', approved: 'is-progress', assigned: 'is-progress',
  in_progress: 'is-progress', completed: 'is-resolved', closed: 'is-closed', rejected: 'is-danger',
}[v] || 'is-closed')

const fmtCost = (c) => {
  const n = Number(c)
  if (isNaN(n)) return String(c)
  try { return n.toLocaleString(undefined, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }) }
  catch { return `₹${n.toLocaleString()}` }
}
const etaLabel = (h) => {
  if (h == null || h === '') return 'No ETA'
  const n = Number(h)
  if (isNaN(n)) return String(h)
  if (n % 24 === 0 && n >= 24) return `${n / 24}d`
  return `${n}h`
}
const fmtDate = (v) => {
  if (!v) return '—'
  const d = new Date(v)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

const loadItems = async () => {
  itemsLoading.value = true
  try { items.value = (await listServiceItems()) || [] }
  catch { items.value = [] }
  finally { itemsLoading.value = false }
}
const loadRequests = async () => {
  reqLoading.value = true
  try {
    const params = {}
    if (reqStatusFilter.value) params.status = reqStatusFilter.value
    requests.value = (await listServiceRequests(params)) || []
  } catch { requests.value = [] }
  finally { reqLoading.value = false }
}

const changeStatus = async (r, status) => {
  if (!status || status === r.status) return
  const prev = r.status
  r.status = status // optimistic
  try {
    await updateServiceRequest(r.id, { status })
    await loadRequests()
    emit('changed')
  } catch {
    r.status = prev
  }
}

const openCreate = () => { editing.value = null; modalOpen.value = true }
const openEdit = (it) => { editing.value = it; modalOpen.value = true }
const onSaved = async () => {
  modalOpen.value = false
  await loadItems()
  emit('changed')
}

watch(reqStatusFilter, loadRequests)
watch(() => props.createSignal, (v, old) => { if (v !== old) openCreate() })

onMounted(async () => { await loadItems(); await loadRequests() })
</script>

<style scoped>
.sd-svc { display: flex; flex-direction: column; gap: 24px; }
.sd-svc-panel { display: flex; flex-direction: column; gap: 14px; }
.sd-panel-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.sd-panel-eyebrow { font-family: var(--sd-mono); font-size: 10px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: var(--sd-amber); margin: 0 0 4px; }
.sd-panel-title { font-size: 17px; font-weight: 800; letter-spacing: -0.02em; color: var(--sd-text); margin: 0; }
.sd-filter { width: 200px; }
.sd-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 11px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; background: var(--sd-grad-hero); color: #1a1206; white-space: nowrap; }
[data-theme="light"] .sd-btn-primary { color: #fff8ec; }

/* ─── Catalog items ─── */
.sd-item-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 14px; }
.sd-item-card { padding: 18px; text-align: left; cursor: pointer; display: flex; flex-direction: column; gap: 6px; transition: border-color 0.2s var(--sd-spring), box-shadow 0.2s var(--sd-spring); }
.sd-item-card:hover { border-color: var(--sd-amber-border); box-shadow: var(--sd-card-shadow); }
.sd-item-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.sd-item-badge { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 12px; color: var(--sd-amber); background: var(--sd-amber-soft); }
.sd-item-inactive { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--sd-steel); padding: 3px 8px; border-radius: 6px; background: var(--sd-steel-soft); }
.sd-item-name { font-size: 15.5px; font-weight: 700; color: var(--sd-text); margin: 0; }
.sd-item-cat { font-size: 12px; color: var(--sd-text-muted); margin: 0 0 4px; }
.sd-item-meta { display: flex; align-items: center; gap: 14px; }
.sd-item-cost { font-size: 14px; font-weight: 700; color: var(--sd-amber); }
.sd-item-eta { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--sd-text-secondary); }
.sd-item-approval { display: inline-flex; align-items: center; gap: 5px; margin-top: 4px; font-size: 11px; font-weight: 600; color: var(--sd-warning); }

/* ─── Service requests ─── */
.sd-req-list { display: flex; flex-direction: column; gap: 9px; }
.sd-req-row { display: flex; align-items: center; gap: 14px; padding: 13px 16px; }
.sd-req-main { flex: 1; min-width: 0; }
.sd-req-name { font-size: 14px; font-weight: 600; color: var(--sd-text); margin: 0 0 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sd-req-date { font-size: 11.5px; color: var(--sd-text-dim); margin: 0; }
.sd-req-action { width: 170px; flex-shrink: 0; }

/* Request status badge (inline — service-request statuses not in SdPill map) */
.sd-req-badge {
  font-size: 10px; font-weight: 700; letter-spacing: 0.02em; text-transform: uppercase;
  padding: 4px 10px; border-radius: 999px; flex-shrink: 0; white-space: nowrap;
  color: var(--bc); background: color-mix(in srgb, var(--bc) 13%, transparent);
  border: 1px solid color-mix(in srgb, var(--bc) 30%, transparent);
}
.sd-req-badge.is-open { --bc: var(--sd-st-open); }
.sd-req-badge.is-progress { --bc: var(--sd-st-progress); }
.sd-req-badge.is-resolved { --bc: var(--sd-st-resolved); }
.sd-req-badge.is-closed { --bc: var(--sd-st-closed); }
.sd-req-badge.is-danger { --bc: var(--sd-danger); }

.sd-empty-state { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 48px 20px; color: var(--sd-text-dim); text-align: center; }
.sd-empty-state p { margin: 0; font-size: 14px; color: var(--sd-text-muted); }

@media (max-width: 640px) {
  .sd-req-badge { display: none; }
  .sd-req-action { width: 140px; }
}
</style>
