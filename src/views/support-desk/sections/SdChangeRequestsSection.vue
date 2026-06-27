<template>
  <div class="sd-changes">
    <div class="sd-toolbar">
      <div class="sd-filter"><SdSelect v-model="statusFilter" :options="STATUS_FILTER_OPTS" placeholder="All statuses" /></div>
      <span class="sd-spacer" />
      <button class="sd-btn sd-btn-primary" @click="openCreate"><Plus :size="15" /> New Change</button>
    </div>

    <div v-if="changes.length" class="sd-change-list">
      <Motion
        v-for="(c, i) in changes"
        :key="c.id"
        as="button"
        type="button"
        class="sd-change-row sd-card"
        :initial="{ opacity: 0, y: 10 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.3, delay: Math.min(i * 0.025, 0.3), ease: [0.16, 1, 0.3, 1] }"
        @click="openEdit(c)"
      >
        <span class="ch-icon"><GitPullRequestArrow :size="18" /></span>
        <div class="ch-main">
          <div class="ch-top">
            <span class="ch-no sd-mono">{{ c.change_number || '—' }}</span>
            <span class="sd-ibadge" :style="riskBadge(c.risk_level)">{{ c.risk_level || 'risk' }}</span>
          </div>
          <p class="ch-title">{{ c.title }}</p>
          <p v-if="c.organization_name" class="ch-org">{{ c.organization_name }}</p>
        </div>
        <span class="sd-ibadge ch-status" :style="statusBadge(c.status)">{{ statusLabel(c.status) }}</span>
      </Motion>
    </div>
    <div v-else class="sd-empty-state">
      <GitPullRequestArrow :size="34" />
      <p>{{ loadingList ? 'Loading…' : 'No change requests yet.' }}</p>
      <button v-if="!loadingList" class="sd-btn sd-btn-primary" @click="openCreate"><Plus :size="15" /> Raise a change</button>
    </div>

    <SdChangeModal :open="modalOpen" :change="editing" @close="modalOpen = false" @saved="onSaved" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { Plus, GitPullRequestArrow } from 'lucide-vue-next'
import SdSelect from '../components/SdSelect.vue'
import SdChangeModal from '../modals/SdChangeModal.vue'
import { listChangeRequests } from '@/composables/useSupportDesk'

const props = defineProps({
  dashboard: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  createSignal: { type: Number, default: 0 },
})
const emit = defineEmits(['go', 'changed'])

const STATUS_FILTER_OPTS = [
  { value: null, label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'review', label: 'Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'implemented', label: 'Implemented' },
  { value: 'closed', label: 'Closed' },
  { value: 'rejected', label: 'Rejected' },
]
const STATUS_LABELS = {
  draft: 'Draft', review: 'Review', approved: 'Approved', scheduled: 'Scheduled',
  implemented: 'Implemented', closed: 'Closed', rejected: 'Rejected',
}

// ITIL statuses aren't in SdPill's map — inline token-coloured badges.
const STATUS_TOKEN = {
  draft: '--sd-steel', review: '--sd-warning', approved: '--sd-ember', scheduled: '--sd-ember',
  implemented: '--sd-success', closed: '--sd-success', rejected: '--sd-danger',
}
const RISK_TOKEN = { low: '--sd-steel', medium: '--sd-warning', high: '--sd-danger' }

const changes = ref([])
const loadingList = ref(true)
const statusFilter = ref(null)
const modalOpen = ref(false)
const editing = ref(null)

const statusLabel = (s) => STATUS_LABELS[s] || s || '—'
const badge = (token) => {
  const v = `var(${token || '--sd-steel'})`
  return { color: v, background: `color-mix(in srgb, ${v} 13%, transparent)`, border: `1px solid color-mix(in srgb, ${v} 32%, transparent)` }
}
const statusBadge = (s) => badge(STATUS_TOKEN[s])
const riskBadge = (r) => badge(RISK_TOKEN[r])

const reload = async () => {
  loadingList.value = true
  try {
    const params = {}
    if (statusFilter.value) params.status = statusFilter.value
    changes.value = await listChangeRequests(params)
  } catch { changes.value = [] }
  finally { loadingList.value = false }
}
const openCreate = () => { editing.value = null; modalOpen.value = true }
const openEdit = (c) => { editing.value = c; modalOpen.value = true }
const onSaved = () => { modalOpen.value = false; reload(); emit('changed') }

watch(statusFilter, reload)
watch(() => props.createSignal, () => { if (props.createSignal) openCreate() })
onMounted(reload)
</script>

<style scoped>
.sd-changes { display: flex; flex-direction: column; gap: 16px; }
.sd-toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.sd-filter { width: 220px; }
.sd-spacer { flex: 1; }
.sd-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 11px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; background: var(--sd-grad-hero); color: #1a1206; white-space: nowrap; }
[data-theme="light"] .sd-btn-primary { color: #fff8ec; }

.sd-change-list { display: flex; flex-direction: column; gap: 9px; }
.sd-change-row { display: flex; align-items: center; gap: 14px; padding: 14px 16px; text-align: left; cursor: pointer; transition: border-color 0.2s var(--sd-spring), box-shadow 0.2s var(--sd-spring); }
.sd-change-row:hover { border-color: var(--sd-amber-border); box-shadow: var(--sd-card-shadow); }
.ch-icon { width: 40px; height: 40px; border-radius: 11px; display: grid; place-items: center; color: var(--sd-amber); background: var(--sd-amber-soft); flex-shrink: 0; }
.ch-main { flex: 1; min-width: 0; }
.ch-top { display: flex; align-items: center; gap: 9px; margin-bottom: 4px; }
.ch-no { font-size: 12px; font-weight: 700; color: var(--sd-amber); }
.ch-title { font-size: 14.5px; font-weight: 600; color: var(--sd-text); margin: 0 0 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ch-org { font-size: 12.5px; color: var(--sd-text-muted); margin: 0; }
.ch-status { flex-shrink: 0; }

.sd-ibadge { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 999px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.02em; text-transform: capitalize; white-space: nowrap; }

.sd-empty-state { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 56px 20px; color: var(--sd-text-dim); text-align: center; }
.sd-empty-state p { margin: 0; font-size: 14px; color: var(--sd-text-muted); }
@media (max-width: 640px) { .ch-status { display: none; } }
</style>
