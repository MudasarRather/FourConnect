<template>
  <div class="sd-problems">
    <div class="sd-toolbar">
      <div class="sd-filter"><SdSelect v-model="statusFilter" :options="STATUS_FILTER_OPTS" placeholder="All statuses" /></div>
      <span class="sd-spacer" />
      <button class="sd-btn sd-btn-primary" @click="openCreate"><Plus :size="15" /> New Problem</button>
    </div>

    <div v-if="problems.length" class="sd-problem-list">
      <Motion
        v-for="(p, i) in problems"
        :key="p.id"
        as="button"
        type="button"
        class="sd-problem-row sd-card"
        :initial="{ opacity: 0, y: 10 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.3, delay: Math.min(i * 0.025, 0.3), ease: [0.16, 1, 0.3, 1] }"
        @click="openEdit(p)"
      >
        <span class="pb-icon"><AlertOctagon :size="18" /></span>
        <div class="pb-main">
          <div class="pb-top">
            <span class="pb-no sd-mono">{{ p.problem_number || '—' }}</span>
            <span class="sd-ibadge" :style="severityBadge(p.severity)">{{ p.severity || 'severity' }}</span>
          </div>
          <p class="pb-title">{{ p.title }}</p>
          <div class="pb-meta">
            <span v-if="p.organization_name" class="pb-meta-item">{{ p.organization_name }}</span>
            <span class="pb-meta-item"><LinkIcon :size="12" /> {{ ticketCount(p) }} tickets</span>
          </div>
        </div>
        <span class="sd-ibadge pb-status" :style="statusBadge(p.status)">{{ statusLabel(p.status) }}</span>
      </Motion>
    </div>
    <div v-else class="sd-empty-state">
      <AlertOctagon :size="34" />
      <p>{{ loadingList ? 'Loading…' : 'No problems logged yet.' }}</p>
      <button v-if="!loadingList" class="sd-btn sd-btn-primary" @click="openCreate"><Plus :size="15" /> Log a problem</button>
    </div>

    <SdProblemModal :open="modalOpen" :problem="editing" @close="modalOpen = false" @saved="onSaved" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { Plus, AlertOctagon, Link as LinkIcon } from 'lucide-vue-next'
import SdSelect from '../components/SdSelect.vue'
import SdProblemModal from '../modals/SdProblemModal.vue'
import { listProblems } from '@/composables/useSupportDesk'

const props = defineProps({
  dashboard: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  createSignal: { type: Number, default: 0 },
})
const emit = defineEmits(['go', 'changed'])

const STATUS_FILTER_OPTS = [
  { value: null, label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'known_error', label: 'Known Error' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]
const STATUS_LABELS = {
  open: 'Open', investigating: 'Investigating', known_error: 'Known Error',
  resolved: 'Resolved', closed: 'Closed',
}
const STATUS_TOKEN = {
  open: '--sd-warning', investigating: '--sd-ember', known_error: '--sd-warning',
  resolved: '--sd-success', closed: '--sd-success',
}
const SEVERITY_TOKEN = { low: '--sd-steel', medium: '--sd-warning', high: '--sd-danger' }

const problems = ref([])
const loadingList = ref(true)
const statusFilter = ref(null)
const modalOpen = ref(false)
const editing = ref(null)

const statusLabel = (s) => STATUS_LABELS[s] || s || '—'
const ticketCount = (p) => (Array.isArray(p.linked_ticket_ids) ? p.linked_ticket_ids.length : 0)
const badge = (token) => {
  const v = `var(${token || '--sd-steel'})`
  return { color: v, background: `color-mix(in srgb, ${v} 13%, transparent)`, border: `1px solid color-mix(in srgb, ${v} 32%, transparent)` }
}
const statusBadge = (s) => badge(STATUS_TOKEN[s])
const severityBadge = (s) => badge(SEVERITY_TOKEN[s])

const reload = async () => {
  loadingList.value = true
  try {
    const params = {}
    if (statusFilter.value) params.status = statusFilter.value
    problems.value = await listProblems(params)
  } catch { problems.value = [] }
  finally { loadingList.value = false }
}
const openCreate = () => { editing.value = null; modalOpen.value = true }
const openEdit = (p) => { editing.value = p; modalOpen.value = true }
const onSaved = () => { modalOpen.value = false; reload(); emit('changed') }

watch(statusFilter, reload)
watch(() => props.createSignal, () => { if (props.createSignal) openCreate() })
onMounted(reload)
</script>

<style scoped>
.sd-problems { display: flex; flex-direction: column; gap: 16px; }
.sd-toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.sd-filter { width: 220px; }
.sd-spacer { flex: 1; }
.sd-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 11px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; background: var(--sd-grad-hero); color: #1a1206; white-space: nowrap; }
[data-theme="light"] .sd-btn-primary { color: #fff8ec; }

.sd-problem-list { display: flex; flex-direction: column; gap: 9px; }
.sd-problem-row { display: flex; align-items: center; gap: 14px; padding: 14px 16px; text-align: left; cursor: pointer; transition: border-color 0.2s var(--sd-spring), box-shadow 0.2s var(--sd-spring); }
.sd-problem-row:hover { border-color: var(--sd-amber-border); box-shadow: var(--sd-card-shadow); }
.pb-icon { width: 40px; height: 40px; border-radius: 11px; display: grid; place-items: center; color: var(--sd-amber); background: var(--sd-amber-soft); flex-shrink: 0; }
.pb-main { flex: 1; min-width: 0; }
.pb-top { display: flex; align-items: center; gap: 9px; margin-bottom: 4px; }
.pb-no { font-size: 12px; font-weight: 700; color: var(--sd-amber); }
.pb-title { font-size: 14.5px; font-weight: 600; color: var(--sd-text); margin: 0 0 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pb-meta { display: flex; flex-wrap: wrap; gap: 14px; }
.pb-meta-item { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--sd-text-muted); }
.pb-status { flex-shrink: 0; }

.sd-ibadge { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 999px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.02em; text-transform: capitalize; white-space: nowrap; }

.sd-empty-state { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 56px 20px; color: var(--sd-text-dim); text-align: center; }
.sd-empty-state p { margin: 0; font-size: 14px; color: var(--sd-text-muted); }
@media (max-width: 640px) { .pb-status { display: none; } }
</style>
