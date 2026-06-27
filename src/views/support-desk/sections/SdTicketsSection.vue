<template>
  <div class="sd-tickets">
    <!-- Filter lenses -->
    <div class="sd-lenses-row">
      <button
        v-for="s in SCOPES"
        :key="s.key"
        class="sd-lens-chip"
        :class="{ active: scope === s.key }"
        @click="setScope(s.key)"
      >{{ s.label }}</button>
    </div>

    <!-- Toolbar -->
    <div class="sd-toolbar">
      <div class="sd-search">
        <Search :size="15" />
        <input v-model="q" type="text" placeholder="Search subject or ticket #…" @keyup.enter="reload(1)" />
      </div>
      <button class="sd-btn sd-btn-primary" @click="openCreate">
        <Plus :size="15" /> New Ticket
      </button>
    </div>

    <!-- List -->
    <div v-if="items.length" class="sd-ticket-list">
      <Motion
        v-for="(t, i) in items"
        :key="t.id"
        as="button"
        type="button"
        class="sd-ticket-row"
        :initial="{ opacity: 0, y: 10 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.32, delay: Math.min(i * 0.025, 0.3), ease: [0.16, 1, 0.3, 1] }"
        @click="openDrawer(t.id)"
      >
        <span class="tk-spine" :style="{ background: `var(--sd-pri-${t.priority})` }" />
        <div class="tk-main">
          <div class="tk-top">
            <span class="tk-no sd-mono">{{ t.ticket_number }}</span>
            <SdPill kind="priority" :value="t.priority" />
            <SdPill v-if="t.is_escalated" kind="status" value="escalated" />
          </div>
          <p class="tk-subject">{{ t.subject }}</p>
          <div class="tk-meta">
            <span v-if="t.organization_name" class="tk-meta-item"><Building2 :size="12" />{{ t.organization_name }}</span>
            <span v-else-if="t.contact_name" class="tk-meta-item"><User :size="12" />{{ t.contact_name }}</span>
            <span v-if="t.assigned_agent_name" class="tk-meta-item"><UserCheck :size="12" />{{ t.assigned_agent_name }}</span>
            <span v-if="t.comment_count" class="tk-meta-item"><MessageSquare :size="12" />{{ t.comment_count }}</span>
            <span class="tk-meta-item"><Clock :size="12" />{{ ago(t.created_at) }}</span>
          </div>
        </div>
        <div class="tk-right">
          <SdPill kind="status" :value="t.status" />
          <SdPill v-if="t.sla_resolution_state" kind="sla" :value="t.sla_resolution_state" />
        </div>
      </Motion>
    </div>
    <div v-else class="sd-empty-state">
      <Inbox :size="34" />
      <p>{{ loading ? 'Loading tickets…' : 'No tickets match this view.' }}</p>
      <button v-if="!loading" class="sd-btn sd-btn-primary" @click="openCreate"><Plus :size="15" /> Create a ticket</button>
    </div>

    <!-- Pagination -->
    <div v-if="total > limit" class="sd-pager">
      <button class="sd-pg-btn" :disabled="page <= 1" @click="reload(page - 1)">‹ Prev</button>
      <span class="sd-pg-info">{{ page }} / {{ totalPages }} · {{ total }} tickets</span>
      <button class="sd-pg-btn" :disabled="page >= totalPages" @click="reload(page + 1)">Next ›</button>
    </div>

    <SdTicketCreateModal :open="createOpen" @close="createOpen = false" @created="onCreated" />
    <SdTicketDrawer :ticket-id="drawerId" @close="drawerId = null" @changed="onDrawerChanged" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Motion } from 'motion-v'
import { Search, Plus, Inbox, Building2, User, UserCheck, MessageSquare, Clock } from 'lucide-vue-next'
import SdPill from '../components/SdPill.vue'
import SdTicketCreateModal from '../modals/SdTicketCreateModal.vue'
import SdTicketDrawer from '../drawers/SdTicketDrawer.vue'
import { listTickets } from '@/composables/useSupportDesk'

const props = defineProps({
  createSignal: { type: Number, default: 0 },
})
const emit = defineEmits(['go', 'changed'])

const SCOPES = [
  { key: 'all', label: 'All' },
  { key: 'my', label: 'My Tickets' },
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'critical', label: 'Critical' },
  { key: 'escalated', label: 'Escalated' },
  { key: 'pending', label: 'Pending' },
  { key: 'sla_breached', label: 'SLA Breached' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
]

const scope = ref('all')
const q = ref('')
const items = ref([])
const total = ref(0)
const page = ref(1)
const limit = ref(20)
const loading = ref(true)
const createOpen = ref(false)
const drawerId = ref(null)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))

const reload = async (toPage = 1) => {
  loading.value = true
  page.value = toPage
  try {
    const params = { page: page.value, limit: limit.value }
    if (scope.value !== 'all') params.scope = scope.value
    if (q.value.trim()) params.q = q.value.trim()
    const res = await listTickets(params)
    items.value = res.items || []
    total.value = res.total || 0
  } catch {
    items.value = []; total.value = 0
  } finally {
    loading.value = false
  }
}

const setScope = (k) => { if (scope.value !== k) { scope.value = k; reload(1) } }
const openCreate = () => { createOpen.value = true }
const openDrawer = (id) => { drawerId.value = id }
const onCreated = () => { createOpen.value = false; reload(1); emit('changed') }
const onDrawerChanged = () => { reload(page.value); emit('changed') }

const ago = (iso) => {
  if (!iso) return ''
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

watch(() => props.createSignal, () => { if (props.createSignal) openCreate() })

// Deep-link from a notification: /admin/support-desk/tickets?ticket=<id> opens its drawer.
const route = useRoute()
watch(() => route.query.ticket, (v) => { if (v) drawerId.value = String(v) })
onMounted(() => {
  reload(1)
  if (route.query.ticket) drawerId.value = String(route.query.ticket)
})
</script>

<style scoped>
.sd-tickets { display: flex; flex-direction: column; gap: 14px; }

.sd-lenses-row { display: flex; flex-wrap: wrap; gap: 8px; }
.sd-lens-chip {
  padding: 7px 14px; border-radius: 999px; cursor: pointer; font-size: 12.5px; font-weight: 600;
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border); color: var(--sd-text-secondary);
  transition: all 0.2s var(--sd-spring);
}
.sd-lens-chip:hover { color: var(--sd-text); border-color: var(--sd-border-strong); }
.sd-lens-chip.active { color: #1a1206; background: var(--sd-grad-rail); border-color: transparent; }
[data-theme="light"] .sd-lens-chip.active { color: #fff8ec; }

.sd-toolbar { display: flex; gap: 10px; align-items: center; }
.sd-search {
  flex: 1; display: flex; align-items: center; gap: 9px; padding: 10px 14px; border-radius: 12px;
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text-muted);
}
.sd-search input { flex: 1; background: none; border: none; outline: none; color: var(--sd-text); font-size: 14px; }
.sd-search input::placeholder { color: var(--sd-text-dim); }

.sd-btn {
  display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 11px;
  font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid var(--sd-border-strong);
  background: var(--sd-surface); color: var(--sd-text); white-space: nowrap;
  transition: transform 0.2s var(--sd-spring), border-color 0.2s;
}
.sd-btn:hover { transform: translateY(-1px); }
.sd-btn-primary { border: none; background: var(--sd-grad-hero); color: #1a1206; box-shadow: 0 6px 18px rgba(251,146,60,0.26); }
[data-theme="light"] .sd-btn-primary { color: #fff8ec; }

.sd-ticket-list { display: flex; flex-direction: column; gap: 9px; }
.sd-ticket-row {
  position: relative; display: flex; align-items: center; gap: 14px;
  padding: 14px 16px 14px 18px; border-radius: 15px; cursor: pointer; text-align: left;
  background: var(--sd-surface); border: 1px solid var(--sd-border); overflow: hidden;
  transition: border-color 0.2s var(--sd-spring), box-shadow 0.2s var(--sd-spring), transform 0.2s;
}
.sd-ticket-row:hover { border-color: var(--sd-border-strong); box-shadow: var(--sd-card-shadow); }
.tk-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; }
.tk-main { flex: 1; min-width: 0; }
.tk-top { display: flex; align-items: center; gap: 9px; margin-bottom: 5px; }
.tk-no { font-size: 12px; font-weight: 700; color: var(--sd-amber); }
.tk-subject { font-size: 14.5px; font-weight: 600; color: var(--sd-text); margin: 0 0 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tk-meta { display: flex; flex-wrap: wrap; gap: 14px; }
.tk-meta-item { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--sd-text-muted); }
.tk-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }

.sd-empty-state {
  display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 56px 20px;
  color: var(--sd-text-dim); text-align: center;
}
.sd-empty-state p { margin: 0; font-size: 14px; color: var(--sd-text-muted); }

.sd-pager { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 8px; }
.sd-pg-btn {
  padding: 8px 16px; border-radius: 10px; cursor: pointer; font-size: 13px; font-weight: 600;
  background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text);
}
.sd-pg-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.sd-pg-info { font-size: 12.5px; color: var(--sd-text-muted); font-variant-numeric: tabular-nums; }

@media (max-width: 640px) {
  .tk-right { display: none; }
}
</style>
