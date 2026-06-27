<template>
  <div class="sd-audit">
    <!-- Toolbar -->
    <div class="sd-toolbar">
      <div class="sd-search">
        <Search :size="15" />
        <input v-model="q" type="text" placeholder="Search audit logs…" @keyup.enter="reload" />
      </div>
      <div class="sd-filter">
        <SdSelect v-model="entityType" :options="entityOptions" placeholder="All entities" />
      </div>
      <button class="sd-btn sd-btn-ghost" :disabled="loading" @click="reload">
        <component :is="RefreshCw" :size="15" :class="{ 'sd-spin': loading }" /> Refresh
      </button>
    </div>

    <!-- Timeline -->
    <section class="sd-card sd-panel">
      <div v-if="logs.length" class="sd-timeline">
        <Motion
          v-for="(l, i) in logs"
          :key="l.id"
          as="div"
          class="sd-log-row"
          :initial="{ opacity: 0, y: 10 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.3, delay: Math.min(i * 0.02, 0.24), ease: [0.16, 1, 0.3, 1] }"
        >
          <span class="sd-log-rail" />
          <div class="sd-log-body">
            <div class="sd-log-head">
              <span class="sd-log-action">{{ humanize(l.action) }}</span>
              <span class="sd-log-entity sd-mono">{{ l.entity_type }}</span>
            </div>
            <div class="sd-log-meta">
              <span class="sd-log-actor">{{ l.actor_name || 'System' }}</span>
              <span class="sd-log-dot">·</span>
              <span class="sd-log-time" :title="absoluteTime(l.created_at)">{{ relativeTime(l.created_at) }}</span>
            </div>
            <details v-if="hasDetail(l.detail)" class="sd-log-detail">
              <summary>Details</summary>
              <pre class="sd-mono">{{ prettyJson(l.detail) }}</pre>
            </details>
          </div>
        </Motion>
      </div>
      <div v-else class="sd-empty-state">
        <ScrollText :size="34" />
        <p>{{ loading ? 'Loading…' : 'No audit entries found.' }}</p>
      </div>
    </section>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="sd-pager">
      <button class="sd-btn sd-btn-ghost" :disabled="page <= 1 || loading" @click="go(page - 1)">
        <ChevronLeft :size="15" /> Prev
      </button>
      <span class="sd-pager-info">Page {{ page }} of {{ totalPages }} <span class="sd-pager-total">· {{ total }} entries</span></span>
      <button class="sd-btn sd-btn-ghost" :disabled="page >= totalPages || loading" @click="go(page + 1)">
        Next <ChevronRight :size="15" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { Search, RefreshCw, ScrollText, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import SdSelect from '../components/SdSelect.vue'
import { listAuditLogs } from '@/composables/useSupportDesk'

defineProps({
  dashboard: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  createSignal: { type: Number, default: 0 },
})
defineEmits(['go', 'changed'])

const entityOptions = [
  { value: '', label: 'All entities' },
  { value: 'support.ticket', label: 'Tickets' },
  { value: 'support.organization', label: 'Organizations' },
  { value: 'support.customer', label: 'Customers' },
  { value: 'support.contract', label: 'Contracts' },
  { value: 'support.change', label: 'Changes' },
  { value: 'support.problem', label: 'Problems' },
  { value: 'support.sla_package', label: 'SLA Packages' },
]

const LIMIT = 50

const logs = ref([])
const loading = ref(false)
const q = ref('')
const entityType = ref('')
const page = ref(1)
const total = ref(0)
const limit = ref(LIMIT)

const totalPages = computed(() => Math.max(1, Math.ceil((total.value || 0) / (limit.value || LIMIT))))

const reload = async () => {
  loading.value = true
  try {
    const params = { page: page.value, limit: LIMIT }
    if (q.value.trim()) params.q = q.value.trim()
    if (entityType.value) params.entity_type = entityType.value
    const res = await listAuditLogs(params)
    logs.value = (res && res.items) || []
    total.value = (res && res.total) || 0
    if (res && res.limit) limit.value = res.limit
    if (res && res.page) page.value = res.page
  } catch {
    logs.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const go = (p) => {
  if (p < 1 || p > totalPages.value || loading.value) return
  page.value = p
  reload()
}

// reload from page 1 whenever the entity-type filter changes
watch(entityType, () => { page.value = 1; reload() })

/* ── humanize "support.ticket.created" → "Ticket created" ── */
const humanize = (action) => {
  if (!action) return '—'
  const segs = String(action).split('.').filter(Boolean)
  const tail = segs.slice(-2)
  return tail
    .map(seg => seg.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
    .join(' ')
}

const hasDetail = (detail) => detail != null && (typeof detail !== 'object' || Object.keys(detail).length > 0)
const prettyJson = (detail) => {
  try { return JSON.stringify(detail, null, 2) }
  catch { return String(detail) }
}

/* ── time formatting ── */
const absoluteTime = (iso) => {
  if (!iso) return ''
  const dt = new Date(iso)
  return isNaN(dt) ? String(iso) : dt.toLocaleString()
}
const relativeTime = (iso) => {
  if (!iso) return '—'
  const dt = new Date(iso)
  if (isNaN(dt)) return String(iso)
  const diff = Date.now() - dt.getTime()
  const s = Math.round(diff / 1000)
  if (s < 0) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.round(h / 24)
  if (days < 30) return `${days}d ago`
  const mo = Math.round(days / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.round(mo / 12)}y ago`
}

onMounted(reload)
</script>

<style scoped>
.sd-audit { display: flex; flex-direction: column; gap: 16px; }

.sd-toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.sd-search { flex: 1; min-width: 200px; display: flex; align-items: center; gap: 9px; padding: 10px 14px; border-radius: 12px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text-muted); }
.sd-search input { flex: 1; background: none; border: none; outline: none; color: var(--sd-text); font-size: 14px; }
.sd-filter { width: 200px; }

.sd-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 11px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; white-space: nowrap; }
.sd-btn[disabled] { opacity: 0.6; cursor: not-allowed; }
.sd-btn-ghost { background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text-secondary); }
.sd-btn-ghost:hover:not([disabled]) { border-color: var(--sd-amber-border); color: var(--sd-text); }
.sd-spin { animation: sd-spin-slow 0.9s linear infinite; }

.sd-panel { padding: 14px 18px; }

.sd-timeline { display: flex; flex-direction: column; }
.sd-log-row { display: grid; grid-template-columns: 14px 1fr; gap: 14px; padding: 12px 4px; position: relative; }
.sd-log-row + .sd-log-row { border-top: 1px solid var(--sd-border); }
.sd-log-rail { width: 8px; height: 8px; border-radius: 50%; margin-top: 5px; background: var(--sd-amber); box-shadow: 0 0 8px var(--sd-amber-border); }
.sd-log-body { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.sd-log-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.sd-log-action { font-size: 14px; font-weight: 700; color: var(--sd-text); }
.sd-log-entity { font-size: 11px; color: var(--sd-text-dim); padding: 2px 8px; border-radius: 6px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.sd-log-meta { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--sd-text-muted); }
.sd-log-actor { font-weight: 600; color: var(--sd-text-secondary); }
.sd-log-dot { color: var(--sd-text-dim); }
.sd-log-time { font-variant-numeric: tabular-nums; }

.sd-log-detail { margin-top: 2px; }
.sd-log-detail summary { font-size: 12px; color: var(--sd-amber); cursor: pointer; user-select: none; width: fit-content; }
.sd-log-detail summary:hover { color: var(--sd-amber-bright); }
.sd-log-detail pre {
  margin: 8px 0 0; padding: 12px 14px; border-radius: 10px;
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border);
  color: var(--sd-text-secondary); font-size: 12px; line-height: 1.5;
  overflow-x: auto; white-space: pre; max-height: 320px;
}

.sd-empty-state { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 56px 20px; color: var(--sd-text-dim); text-align: center; }
.sd-empty-state p { margin: 0; font-size: 14px; color: var(--sd-text-muted); }

.sd-pager { display: flex; align-items: center; justify-content: center; gap: 16px; }
.sd-pager-info { font-size: 12.5px; color: var(--sd-text-muted); font-variant-numeric: tabular-nums; }
.sd-pager-total { color: var(--sd-text-dim); }

@media (max-width: 640px) {
  .sd-filter { width: 100%; }
}
</style>
