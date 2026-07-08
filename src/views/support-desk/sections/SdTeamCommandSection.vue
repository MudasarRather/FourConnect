<template>
  <div class="tc">
    <!-- ── hero console + fleet lens dock (instrument slots in as the backdrop) ── -->
    <SdTeamCommandHero :lenses="heroLenses" :active-lens="lens" :stats="totals"
      :loading="loading" :teams-count="cards.length"
      @pick="onLens" @new-team="openCreate" @refresh="refreshAll(true)">
      <template v-if="cards.length" #instrument>
        <SdTeamCommandInstrument :teams="cards" :stats="totals" :active-team="activeTeam?.id || null"
          :lens="lens" :now="now" :reduced="reduced" @select-team="onInstrumentSelect" />
      </template>
    </SdTeamCommandHero>

    <!-- ── inline fleet error (kept out of the hero; last-good data stays up) ── -->
    <p v-if="error && !cards.length" class="tc-error sd-card"><AlertTriangle :size="14" /> {{ error }}
      <button class="tc-retry" @click="refreshAll(true)">Retry</button>
    </p>

    <!-- ── fleet board ⇄ per-team drill ── -->
    <SdTeamFleetBoard v-if="!activeTeam" :teams="cards" :lens="lens" :active-team="null"
      :loading="loading" :now="now" :reduced="reduced"
      @open="openTeam" @edit="openEdit" @new="openCreate" />

    <SdTeamCommandDrill v-else :team="activeTeam" :stats="drillStats" :rows="drillRows"
      :total="drillTotal" :page="drillPage" :limit="DRILL_LIMIT" :loading="drillLoading"
      :stats-loading="statsLoading" :lens="drillLens" :now="now"
      @back="closeTeam" @lens="onDrillLens" @page="onDrillPage" @open="openTicket"
      @route="routeOpen = true" @rebalance="rebalanceOpen = true"
      @edit="openEdit(activeTeam)" @refresh="loadDrill()" />

    <!-- ── ceremonies ── -->
    <SdTeamModal :open="modalOpen" :team="editingTeam" @close="modalOpen = false"
      @saved="onTeamSaved" @deleted="onTeamDeleted" />
    <SdTeamRouteModal :open="routeOpen" :team="activeTeam" :roster="drillStats.roster || []"
      @close="routeOpen = false" @done="onRouted" />
    <SdTeamRebalanceModal :open="rebalanceOpen" :team="activeTeam"
      @close="rebalanceOpen = false" @done="onRebalanced" />

    <!-- one drawer instance for the whole desk (the workspace-global one is not used
         here — its @changed never reaches the section, so data would go stale) -->
    <SdTicketDrawer :ticket-id="drawerId" @close="drawerId = null" @changed="onDrawerChanged" />
  </div>
</template>

<script setup>
/* SdTeamCommandSection — the ADMIN "Team Command" oversight desk.
   Fleet board of every support team (sealed /teams/overview — same lens math as the
   agent Squad Command desk, so both panels reconcile), per-team drill
   (/teams/{id}/stats + /tickets), guarded team CRUD (structured 409s), admin route +
   rebalance. Deep links: ?team=<id>&lens=<key>&ticket=<id>. */
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Layers, Inbox, Siren, Timer, Hourglass, MoonStar, AlertTriangle } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import SdTeamCommandHero from '../components/SdTeamCommandHero.vue'
import SdTeamCommandInstrument from '../components/SdTeamCommandInstrument.vue'
import SdTeamFleetBoard from '../components/SdTeamFleetBoard.vue'
import SdTeamCommandDrill from '../components/SdTeamCommandDrill.vue'
import SdTicketDrawer from '../drawers/SdTicketDrawer.vue'
import SdTeamModal from '../modals/SdTeamModal.vue'
import SdTeamRouteModal from '../modals/SdTeamRouteModal.vue'
import SdTeamRebalanceModal from '../modals/SdTeamRebalanceModal.vue'
import {
  fetchTeamsOverview, fetchTeamStats, listTeamTickets, listTeams,
} from '@/composables/useSupportDesk'

const emit = defineEmits(['open', 'go', 'changed', 'new'])
const route = useRoute()
const router = useRouter()
const toast = useToast()

const reduced = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  && document.documentElement.getAttribute('data-cinematic') !== 'on'

const DRILL_LIMIT = 50

/* ── fleet state ── */
const overview = ref({ teams: [], totals: {} })
const fullTeams = ref([])            // listTeams() — carries member_ids/roles for the edit wizard
const loading = ref(true)
const error = ref('')
const lens = ref('fleet')
const now = ref(Date.now())

const totals = computed(() => overview.value.totals || {})
const cards = computed(() => {
  const byId = Object.fromEntries(fullTeams.value.map(t => [String(t.id), t]))
  return (overview.value.teams || []).map(c => ({ ...c, members: byId[String(c.id)]?.members || [] }))
})

const heroLenses = computed(() => {
  const t = totals.value
  return [
    { key: 'fleet', label: 'Fleet · active', value: t.open ?? 0, icon: Layers, color: 'var(--sd-team-core)', hint: 'Every active ticket across all teams' },
    { key: 'unassigned', label: 'Unowned', value: t.unassigned ?? 0, icon: Inbox, color: 'var(--sd-team-hi)', hint: 'Teams with unowned work in their queue' },
    { key: 'breached', label: 'Breached', value: t.breached ?? 0, icon: Siren, color: 'var(--sd-team-strain)', hint: 'Teams carrying SLA breaches' },
    { key: 'due_soon', label: 'Due 4h', value: t.due_soon ?? 0, icon: Timer, color: 'var(--sd-team-hi)', hint: 'Resolution due within 4 hours' },
    { key: 'idle', label: 'Idle 24h', value: t.idle ?? 0, icon: Hourglass, color: 'var(--sd-team-idle)', hint: 'Untouched for a day' },
    { key: 'uncovered', label: 'Off shift', value: t.uncovered ?? 0, icon: MoonStar, color: 'var(--sd-team-idle)', hint: 'Teams outside business hours with open work' },
    { key: 'orphaned', label: 'No crew', value: t.orphaned ?? 0, icon: AlertTriangle, color: 'var(--sd-team-strain)', hint: 'Teams with no assignable agents — work will strand' },
  ]
})

const guardMessage = (e) => {
  const d = e?.response?.data?.detail
  if (!d) return 'Something went wrong — try again.'
  return typeof d === 'string' ? d : (d.message || d.error || 'Blocked by a safety guard.')
}

const refreshAll = async (manual = false) => {
  loading.value = true
  try {
    const [ov, full] = await Promise.all([fetchTeamsOverview(), listTeams()])
    overview.value = ov || { teams: [], totals: {} }
    fullTeams.value = full || []
    error.value = ''
    // keep the drill's identity card live (counts move under it)
    if (activeTeam.value) {
      const fresh = (overview.value.teams || []).find(c => String(c.id) === String(activeTeam.value.id))
      if (fresh) activeTeam.value = { ...fresh, members: activeTeam.value.members || [] }
    }
  } catch (e) {
    error.value = guardMessage(e)
    if (manual) toast.error(error.value)
  } finally { loading.value = false }
}

/* ── drill state ── */
const activeTeam = ref(null)
const drillStats = ref({})
const drillRows = ref([])
const drillTotal = ref(0)
const drillPage = ref(1)
const drillLens = ref('all')
const drillLoading = ref(false)
const statsLoading = ref(false)

const loadDrillStats = async () => {
  if (!activeTeam.value) return
  statsLoading.value = true
  try { drillStats.value = await fetchTeamStats(activeTeam.value.id) }
  catch (e) { drillStats.value = {}; toast.error(guardMessage(e)) }
  finally { statsLoading.value = false }
}
const loadDrillRows = async () => {
  if (!activeTeam.value) return
  drillLoading.value = true
  try {
    const r = await listTeamTickets(activeTeam.value.id, {
      lens: drillLens.value === 'all' ? undefined : drillLens.value,
      page: drillPage.value, limit: DRILL_LIMIT, sort_by: 'updated_at', sort_dir: 'desc',
    })
    drillRows.value = r.items || []
    drillTotal.value = r.total || 0
  } catch (e) { drillRows.value = []; drillTotal.value = 0; toast.error(guardMessage(e)) }
  finally { drillLoading.value = false }
}
const loadDrill = () => Promise.all([loadDrillStats(), loadDrillRows()])

const openTeam = (card) => {
  activeTeam.value = card
  drillPage.value = 1
  // carry a matching fleet lens into the drill
  drillLens.value = ({ breached: 'breaching', unassigned: 'unassigned', due_soon: 'due_soon', idle: 'idle' })[lens.value] || 'all'
  loadDrill()
  syncQuery()
}
const closeTeam = () => { activeTeam.value = null; drillStats.value = {}; drillRows.value = []; syncQuery() }
const onDrillLens = (key) => { drillLens.value = key; drillPage.value = 1; loadDrillRows(); syncQuery() }
const onDrillPage = (p) => { drillPage.value = p; loadDrillRows() }
const onInstrumentSelect = (id) => {
  const card = cards.value.find(c => String(c.id) === String(id))
  if (card) openTeam(card)
}

/* ── hero lens: fleet filter, or drill filter while drilling ── */
const onLens = (l) => {
  lens.value = l.key
  if (activeTeam.value) {
    const mapped = ({ breached: 'breaching', unassigned: 'unassigned', due_soon: 'due_soon', idle: 'idle', fleet: 'all' })[l.key]
    if (mapped) { drillLens.value = mapped; drillPage.value = 1; loadDrillRows() }
    else closeTeam()   // uncovered / orphaned are fleet-shape lenses
  }
  syncQuery()
}

/* ── deep links (?team=&lens=&ticket=) — the sibling syncQuery idiom ── */
const syncQuery = () => {
  const query = { ...route.query }
  if (activeTeam.value) query.team = String(activeTeam.value.id); else delete query.team
  const l = activeTeam.value ? drillLens.value : lens.value
  if (l && l !== 'fleet' && l !== 'all') query.lens = l; else delete query.lens
  router.replace({ query }).catch(() => {})
}

/* ── ceremonies ── */
const modalOpen = ref(false)
const editingTeam = ref(null)
const openCreate = () => { editingTeam.value = null; modalOpen.value = true }
const openEdit = (card) => {
  editingTeam.value = fullTeams.value.find(t => String(t.id) === String(card?.id)) || card || null
  modalOpen.value = true
}
const onTeamSaved = () => {
  modalOpen.value = false
  toast.success('Team saved')
  refreshAll()
  if (activeTeam.value) loadDrill()
  emit('changed')
}
const onTeamDeleted = () => {
  modalOpen.value = false
  toast.success('Team deleted — history kept')
  if (activeTeam.value && String(activeTeam.value.id) === String(editingTeam.value?.id)) closeTeam()
  refreshAll()
  emit('changed')
}

const routeOpen = ref(false)
const onRouted = () => {
  routeOpen.value = false
  toast.success('Ticket routed')
  loadDrill(); refreshAll(); emit('changed')
}
const rebalanceOpen = ref(false)
const onRebalanced = (result) => {
  rebalanceOpen.value = false
  if (result?.assigned) toast.success(`${result.assigned} ticket${result.assigned === 1 ? '' : 's'} rebalanced`)
  loadDrill(); refreshAll(); emit('changed')
}

/* ── drawer (single instance for this desk) ── */
const drawerId = ref(null)
const openTicket = (id) => { drawerId.value = String(id) }
const onDrawerChanged = () => { if (activeTeam.value) loadDrill(); refreshAll(); emit('changed') }
watch(() => route.query.ticket, (v) => { if (v) drawerId.value = String(v) })

/* ── boot + cadence: 1s clock, 60s soft refresh (oversight, not a live work queue) ── */
let tick = null
let soft = null
onMounted(async () => {
  tick = setInterval(() => { now.value = Date.now() }, 1000)
  soft = setInterval(() => { if (!document.hidden) { refreshAll(); if (activeTeam.value) loadDrillStats() } }, 60000)
  await refreshAll()
  const ql = String(route.query.lens || '')
  const qTeam = String(route.query.team || '')
  if (qTeam) {
    const card = cards.value.find(c => String(c.id) === qTeam)
    if (card) {
      if (['all', 'unassigned', 'breaching', 'due_soon', 'idle', 'escalated', 'pending', 'critical'].includes(ql)) drillLens.value = ql
      activeTeam.value = card
      loadDrill()
    }
  } else if (['fleet', 'unassigned', 'breached', 'due_soon', 'idle', 'uncovered', 'orphaned'].includes(ql)) {
    lens.value = ql
  }
  if (route.query.ticket) drawerId.value = String(route.query.ticket)
})
onBeforeUnmount(() => { clearInterval(tick); clearInterval(soft) })
</script>

<style scoped>
.tc { display: flex; flex-direction: column; gap: 14px; color: var(--sd-text); }
.tc-error { display: flex; align-items: center; gap: 9px; margin: 0; padding: 13px 16px;
  font-size: 13px; color: var(--sd-danger); }
.tc-retry { margin-left: auto; padding: 6px 13px; border-radius: 9px; cursor: pointer; font-family: inherit;
  font-size: 12px; font-weight: 650; color: var(--sd-text); background: var(--sd-surface);
  border: 1px solid var(--sd-border-strong); }
</style>
