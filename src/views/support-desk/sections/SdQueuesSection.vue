<template>
  <div class="sd-qw" :style="{ '--acc': 'var(--sd-gold)' }">
    <header class="qw-hero sd-card">
      <div>
        <p class="qw-eyebrow"><span class="qw-dot" /> SUPPORT · QUEUES</p>
        <h2 class="qw-title"><Inbox :size="22" /> Work Queues</h2>
        <p class="qw-sub">Skill / level intake buckets. Pick a queue to work it.</p>
      </div>
      <button v-if="isAdmin" class="qw-btn primary" @click="openCreate"><Plus :size="15" /> New queue</button>
    </header>

    <div v-if="queues.length" class="qw-grid">
      <button v-for="(qrow, i) in queues" :key="qrow.id" class="qw-card sd-card" :class="{ on: selected === qrow.id }"
        :style="{ '--tc': qrow.color || 'var(--sd-gold)', '--i': i }" @click="select(qrow.id)">
        <span class="qw-card-spine" />
        <div class="qw-card-top">
          <span class="qw-card-name">{{ qrow.name }}</span>
          <button v-if="isAdmin" class="qw-edit" @click.stop="openEdit(qrow)"><Pencil :size="12" /></button>
        </div>
        <span class="qw-card-team">{{ qrow.team_name || 'No team' }}<span v-if="qrow.auto_assign" class="qw-auto">· {{ methodLabel(qrow.assignment_method) }}</span></span>
        <div class="qw-card-stats">
          <span><b>{{ qrow.open_ticket_count ?? 0 }}</b> open</span>
          <span v-if="(qrow.category_ids || []).length"><b>{{ (qrow.category_ids || []).length }}</b> categories</span>
        </div>
      </button>
    </div>
    <div v-else class="qw-empty sd-card">
      <Inbox :size="28" /><p>{{ loading ? 'Loading queues…' : 'No queues yet.' }}</p>
      <button v-if="isAdmin && !loading" class="qw-btn primary sm" @click="openCreate"><Plus :size="14" /> Create the first queue</button>
    </div>

    <section v-if="selected" class="qw-board">
      <header class="qw-board-h"><h3>{{ selectedName }} · tickets</h3><span class="qw-board-n">{{ qTotal }} total</span></header>
      <SdTicketTable :rows="qRows" :columns="COLS" :loading="ticketsLoading" :now="now"
        accent="var(--sd-gold)" :empty="{ title: 'Empty queue', blurb: 'No tickets routed to this queue.' }" :empty-icon="Inbox"
        @open="openTicket" />
    </section>

    <SdTicketDrawer v-if="isAdmin || agentReveal" :ticket-id="drawerId" @close="drawerId = null" @changed="onChanged" />

    <SdModalShell :open="modalOpen" :eyebrow="editing ? 'EDIT QUEUE' : 'NEW QUEUE'" :title="editing ? 'Edit queue' : 'Create queue'" width="520px" @close="modalOpen = false">
      <div class="qw-form">
        <label class="qw-f"><span>Name *</span><input v-model="form.name" class="qw-inp" placeholder="e.g. Billing" /></label>
        <div class="qw-grid2">
          <label class="qw-f"><span>Code</span><input v-model="form.code" class="qw-inp" placeholder="BILL" /></label>
          <label class="qw-f"><span>Colour</span><input v-model="form.color" class="qw-inp" placeholder="#ffb900" /></label>
        </div>
        <div class="qw-f"><span>Team <i v-if="form.assignment_method !== 'manual'" class="qw-req">· required for auto-assign</i></span><SdSelect v-model="form.team_id" :options="teamOpts" placeholder="No team" /></div>
        <div class="qw-f">
          <span>Assignment method</span>
          <div class="qw-seg">
            <button v-for="m in METHODS" :key="m.value" type="button" class="qw-seg-b" :class="{ on: form.assignment_method === m.value }" @click="form.assignment_method = m.value">
              <component :is="m.icon" :size="13" /> {{ m.label }}
            </button>
          </div>
          <p class="qw-hint">{{ methodHint }}</p>
        </div>
        <div class="qw-f">
          <span>Routes categories</span>
          <div v-if="categoryList.length" class="qw-cats">
            <button v-for="c in categoryList" :key="c.id" type="button" class="qw-cat" :class="{ on: form.category_ids.includes(String(c.id)) }" @click="toggleCat(String(c.id))">{{ c.name }}</button>
          </div>
          <p v-else class="qw-hint">No categories yet.</p>
          <p class="qw-hint">New tickets in the selected categories route to this queue automatically.</p>
        </div>
      </div>
      <template #footer>
        <button v-if="editing" class="qw-btn danger" @click="removeQueue"><Trash2 :size="14" /> Delete</button>
        <button class="qw-btn" @click="modalOpen = false">Cancel</button>
        <button class="qw-btn primary" :disabled="busy || !form.name.trim()" @click="save">{{ editing ? 'Save' : 'Create' }}</button>
      </template>
    </SdModalShell>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { Inbox, Plus, Pencil, Trash2, Hand, Repeat, Scale } from 'lucide-vue-next'
import SdTicketTable from '../components/SdTicketTable.vue'
import SdModalShell from '../components/SdModalShell.vue'
import SdSelect from '../components/SdSelect.vue'
import SdTicketDrawer from '../drawers/SdTicketDrawer.vue'
import { listQueues, createQueue, updateQueue, deleteQueue, listTeams, listTickets, loadPickers, usePickers } from '@/composables/useSupportDesk'
import { useToast } from 'vue-toastification'

const props = defineProps({ panel: { type: String, default: 'admin' }, agentReveal: { type: Boolean, default: false } })
const toast = useToast()
const isAdmin = computed(() => props.panel === 'admin')

const COLS = ['flag', 'number', 'subject', 'priority', 'status', 'agent', 'sla', 'updated']
const queues = ref([])
const teams = ref([])
const loading = ref(true)
const selected = ref(null)
const selectedName = computed(() => queues.value.find(q => q.id === selected.value)?.name || 'Queue')
const qRows = ref([]); const qTotal = ref(0); const ticketsLoading = ref(false)
const drawerId = ref(null); const now = ref(Date.now()); let tick = null

const teamOpts = computed(() => [{ value: '', label: 'No team' }, ...teams.value.map(t => ({ value: t.id, label: t.name }))])

const pickers = usePickers()
const categoryList = computed(() => pickers.categories || [])
const METHODS = [
  { value: 'manual', label: 'Manual', icon: Hand },
  { value: 'round_robin', label: 'Round-robin', icon: Repeat },
  { value: 'load_balanced', label: 'Load-balanced', icon: Scale },
]
const methodHint = computed(() => ({
  manual: 'Tickets land here unassigned — agents pick them up (triage).',
  round_robin: 'Rotate new tickets evenly across the team, oldest-served-first.',
  load_balanced: 'Give each new ticket to the team member with the fewest open tickets.',
}[form.assignment_method] || ''))
const methodLabel = (v) => METHODS.find(m => m.value === v)?.label || 'Manual'
const toggleCat = (id) => { const i = form.category_ids.indexOf(id); if (i >= 0) form.category_ids.splice(i, 1); else form.category_ids.push(id) }

const load = async () => {
  loading.value = true
  try { queues.value = await listQueues() } catch { queues.value = [] } finally { loading.value = false }
  try { teams.value = await listTeams() } catch { teams.value = [] }
  loadPickers().catch(() => {})
}
const select = async (id) => {
  selected.value = id; ticketsLoading.value = true
  try { const r = await listTickets({ queue_id: id, page: 1, limit: 100 }); qRows.value = r.items || []; qTotal.value = r.total || 0 }
  catch { qRows.value = []; qTotal.value = 0 } finally { ticketsLoading.value = false }
}
const openTicket = (id) => { drawerId.value = String(id) }
const onChanged = () => { if (selected.value) select(selected.value) }

const modalOpen = ref(false); const editing = ref(null); const busy = ref(false)
const form = reactive({ name: '', code: '', color: '', team_id: '', assignment_method: 'round_robin', category_ids: [] })
const reset = () => { form.name = ''; form.code = ''; form.color = ''; form.team_id = ''; form.assignment_method = 'round_robin'; form.category_ids = [] }
const openCreate = () => { editing.value = null; reset(); modalOpen.value = true }
const openEdit = (qrow) => {
  editing.value = qrow
  form.name = qrow.name; form.code = qrow.code || ''; form.color = qrow.color || ''; form.team_id = qrow.team_id || ''
  form.assignment_method = qrow.assignment_method || (qrow.auto_assign ? 'round_robin' : 'manual')
  form.category_ids = (qrow.category_ids || []).map(String)
  modalOpen.value = true
}
const save = async () => {
  busy.value = true
  try {
    const payload = {
      name: form.name.trim(), code: form.code || null, color: form.color || null, team_id: form.team_id || null,
      assignment_method: form.assignment_method, auto_assign: form.assignment_method !== 'manual', category_ids: form.category_ids,
    }
    if (editing.value) await updateQueue(editing.value.id, payload)
    else await createQueue(payload)
    modalOpen.value = false; toast.success('Queue saved'); load()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Save failed') } finally { busy.value = false }
}
const removeQueue = async () => {
  if (!editing.value) return
  try { await deleteQueue(editing.value.id); modalOpen.value = false; toast.success('Queue deleted'); if (selected.value === editing.value.id) selected.value = null; load() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Delete failed') }
}

onMounted(() => { load(); tick = setInterval(() => { now.value = Date.now() }, 1000) })
onBeforeUnmount(() => clearInterval(tick))
</script>

<style scoped>
.sd-qw { display: flex; flex-direction: column; gap: 14px; color: var(--sd-text); }
.qw-hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; padding: 20px 22px; }
.qw-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: var(--sd-mono); font-size: 10.5px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--acc); margin: 0 0 8px; }
.qw-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--acc); box-shadow: 0 0 10px color-mix(in srgb, var(--acc) 60%, transparent); }
.qw-title { display: inline-flex; align-items: center; gap: 10px; font-size: 23px; font-weight: 800; color: var(--sd-text); margin: 0 0 6px; }
.qw-title :deep(svg) { color: var(--acc); }
.qw-sub { font-size: 13.5px; color: var(--sd-text-secondary); margin: 0; }
.qw-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 11px; font-size: 12.5px; font-weight: 600; cursor: pointer; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); }
.qw-btn.primary { border: none; background: var(--sd-grad-hero); color: #1a1206; }
[data-theme="light"] .qw-btn.primary { color: #fff8ec; }
.qw-btn.danger { color: var(--sd-danger); border-color: color-mix(in srgb, var(--sd-danger) 40%, transparent); margin-right: auto; }
.qw-btn.sm { padding: 7px 12px; }
.qw-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.qw-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.qw-card { position: relative; overflow: hidden; padding: 15px 16px; text-align: left; cursor: pointer; display: flex; flex-direction: column; gap: 6px;
  animation: sd-deal 0.45s var(--sd-spring) backwards; animation-delay: calc(var(--i) * 0.04s); transition: border-color 0.2s, transform 0.2s var(--sd-spring); border: 1px solid var(--sd-border); }
.qw-card:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--tc) 45%, transparent); }
.qw-card.on { border-color: var(--tc); box-shadow: 0 0 0 1px var(--tc); }
.qw-card-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--tc); }
.qw-card-top { display: flex; align-items: center; justify-content: space-between; }
.qw-card-name { font-size: 14.5px; font-weight: 800; color: var(--sd-text); }
.qw-edit { width: 24px; height: 24px; display: grid; place-items: center; border-radius: 7px; cursor: pointer; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); color: var(--sd-text-muted); }
.qw-card-team { font-size: 11.5px; color: var(--sd-text-muted); }
.qw-auto { color: var(--acc); margin-left: 5px; }
.qw-card-stats { display: flex; gap: 14px; margin-top: 4px; }
.qw-card-stats span { font-size: 11.5px; color: var(--sd-text-muted); }
.qw-card-stats b { font-size: 16px; color: var(--sd-text); font-weight: 800; }
.qw-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 36px; color: var(--sd-text-muted); }
.qw-board { display: flex; flex-direction: column; gap: 10px; }
.qw-board-h { display: flex; align-items: center; justify-content: space-between; }
.qw-board-h h3 { font-size: 14px; font-weight: 700; color: var(--sd-text); margin: 0; }
.qw-board-n { font-size: 12px; color: var(--sd-text-dim); font-family: var(--sd-mono); }
.qw-form { display: flex; flex-direction: column; gap: 12px; }
.qw-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.qw-f { display: flex; flex-direction: column; gap: 6px; }
.qw-f > span { font-size: 12px; font-weight: 600; color: var(--sd-text-secondary); }
.qw-inp { width: 100%; padding: 10px 12px; border-radius: 10px; font-size: 13.5px; font-family: inherit; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text); }
.qw-chk { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: var(--sd-text-secondary); }
.qw-req { font-style: normal; font-weight: 500; color: var(--sd-text-dim); font-size: 11px; }
.qw-hint { font-size: 11px; color: var(--sd-text-dim); margin: 2px 0 0; line-height: 1.4; }
.qw-seg { display: flex; gap: 6px; }
.qw-seg-b { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 6px; border-radius: 10px; font-size: 12px; font-weight: 650; cursor: pointer; font-family: inherit; color: var(--sd-text-muted); background: var(--sd-surface); border: 1px solid var(--sd-border); transition: all 0.18s var(--sd-spring); }
.qw-seg-b:hover { border-color: var(--sd-amber-border); }
.qw-seg-b.on { color: var(--sd-text); background: var(--sd-amber-soft); border-color: var(--sd-amber-border); }
.qw-cats { display: flex; flex-wrap: wrap; gap: 6px; }
.qw-cat { padding: 6px 11px; border-radius: 999px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border); transition: all 0.16s var(--sd-spring); }
.qw-cat:hover { border-color: var(--sd-amber-border); color: var(--sd-text); }
.qw-cat.on { color: var(--sd-amber); background: var(--sd-amber-soft); border-color: var(--sd-amber-border); }
@media (max-width: 520px) { .qw-grid2 { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { html:not([data-cinematic="on"]) .qw-card { animation: none; } }
</style>
