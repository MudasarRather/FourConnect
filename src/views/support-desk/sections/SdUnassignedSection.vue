<template>
  <div class="unq sd-tw">
    <!-- ══════════════════ INTAKE / DISPATCH HERO ══════════════════ -->
    <section ref="heroEl" class="unq-hero" @mousemove="onHeroMove" @mouseleave="resetHero">
      <div class="unq-atm" aria-hidden="true">
        <span class="orb a1" :style="orbStyle(1)" />
        <span class="orb a2" :style="orbStyle(0.62)" />
        <span class="orb a3" :style="orbStyle(0.34)" />
        <span class="orb a4" :style="orbStyle(-0.42)" />
        <span class="unq-grain" />
        <span class="unq-grid" />
        <svg class="unq-mesh" viewBox="0 0 1200 400" preserveAspectRatio="none">
          <path class="ml" d="M-40,320 C300,250 520,360 760,250 C980,150 1100,230 1260,150" />
          <path class="ml m2" d="M-40,250 C260,180 480,300 720,190 C940,90 1120,180 1260,90" />
          <path class="ml m3" d="M-40,372 C320,320 560,400 820,310 C1020,240 1160,300 1260,230" />
        </svg>
      </div>

      <div class="unq-hero-row">
        <div class="unq-lead">
          <Motion as="span" class="unq-eyebrow sd-mono" :initial="{ y: -8, opacity: 0 }" :animate="{ y: 0, opacity: 1 }" :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
            <span class="eb-glyph"><span class="eb-ring" /><span class="eb-core" /></span>
            SUPPORT · INTAKE / DISPATCH
            <span class="eb-sep" /><span class="eb-live"><i /> LIVE</span>
          </Motion>
          <h2 class="unq-title">
            <Motion as="span" :initial="{ y: 22, opacity: 0 }" :animate="{ y: 0, opacity: 1 }" :transition="{ duration: 0.7, delay: 0.06, ease: [0.16, 1, 0.3, 1] }">Claim </Motion><Motion as="span" class="unq-accent" :initial="{ y: 22, opacity: 0 }" :animate="{ y: 0, opacity: 1 }" :transition="{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }">Field</Motion>
          </h2>
          <p class="unq-sub">{{ subline }}</p>

          <div class="unq-cta">
            <Motion as="button" type="button" class="unq-btn primary" :disabled="!topPick || claiming" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }" @click="openClaim(topPick)">
              <Zap :size="15" :class="{ spin: claiming }" /> Claim next
            </Motion>
            <Motion as="button" type="button" class="unq-btn" :class="{ on: playMode }" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }" title="Guided mode — auto-serve &amp; claim the next ticket after each one" @click="toggleGuided">
              <component :is="playMode ? Pause : Play" :size="14" /> <span>Guided{{ playMode ? ' · on' : '' }}</span>
            </Motion>
            <Motion as="button" type="button" class="unq-btn" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }" @click="$emit('new')"><Plus :size="15" /> New ticket</Motion>
            <Motion as="button" type="button" class="unq-btn icon" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.95 }" title="Refresh" @click="refreshAll"><RefreshCw :size="15" :class="{ spin: loading }" /></Motion>
          </div>

          <div class="unq-pulse">
            <span class="unq-scan"><Radar :size="13" /> <b>{{ stats.total || 0 }}</b> awaiting claim<template v-if="stats.team_names && stats.team_names.length"> across <b>{{ stats.team_count }}</b> {{ stats.team_count === 1 ? 'team' : 'teams' }}</template></span>
            <span class="unq-pdiv" />
            <span class="unq-chip danger" title="Breaching SLA"><i /><b>{{ stats.breaching || 0 }}</b> breaching</span>
            <span class="unq-chip warn" title="Due soon"><i /><b>{{ stats.due_soon || 0 }}</b> due soon</span>
            <span class="unq-chip steel" title="Oldest ticket waiting"><i /><b>{{ oldestLabel }}</b> oldest</span>
          </div>
        </div>

        <!-- signature gravity well -->
        <Motion as="div" class="unq-field" :initial="{ opacity: 0, scale: 0.92 }" :animate="{ opacity: 1, scale: 1 }" :transition="{ duration: 0.8, delay: 0.18, ease: [0.16, 1, 0.3, 1] }">
          <SdClaimField :tickets="workingSet" :now="now" :breaching="stats.breaching || 0" :next-id="nextId" @open="openTicket" @claim-next="openClaim(topPick)" />
        </Motion>
      </div>
    </section>

    <!-- ══════════════════ KPI BENTO ══════════════════ -->
    <div class="unq-kpis">
      <SdKpiTile v-for="(k, i) in kpis" :key="k.key" :icon="k.icon" :label="k.label" :value="k.value"
        :accent="k.color" :suffix="k.suffix || ''" :index="i" :live="k.live || false" />
    </div>

    <!-- ══════════════════ NEXT UP spotlight ══════════════════ -->
    <Presence>
      <Motion v-if="topPick" class="unq-next sd-card" :key="topPick.id"
        :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: -6 }" :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }">
        <span class="nx-spine" :style="{ background: priColor(topPick.priority) }" />
        <div class="nx-badge"><Sparkles :size="13" /> NEXT UP</div>
        <div class="nx-main">
          <div class="nx-head">
            <span class="nx-no sd-mono">{{ topPick.ticket_number }}</span>
            <SdPill kind="priority" :value="topPick.priority" />
            <span v-if="slaState(topPick) === 'breached'" class="nx-flag breach">SLA breached</span>
            <span v-else-if="slaState(topPick) === 'due-soon'" class="nx-flag due">Due soon</span>
            <span class="nx-lane" :class="topPick.team_id ? 'team' : 'triage'">{{ topPick.team_id ? (topPick.team_name || 'Team queue') : 'Triage pool' }}</span>
          </div>
          <p class="nx-subj">{{ topPick.subject }}</p>
          <div class="nx-meta">
            <span><Clock3 :size="12" /> waiting {{ ageLabel(topPick) }}</span>
            <span v-if="topPick.raised_by_name"><User :size="12" /> {{ topPick.raised_by_name }}</span>
            <span v-if="topPick.category_name"><Tag :size="12" /> {{ topPick.category_name }}</span>
          </div>
        </div>
        <div class="nx-actions">
          <button class="unq-btn primary sm" :disabled="claiming" @click="openClaim(topPick)"><UserCheck :size="14" /> Claim</button>
          <button class="unq-btn sm" @click="openTicket(topPick.id)"><ArrowUpRight :size="14" /> Open</button>
        </div>
      </Motion>
    </Presence>

    <!-- ══════════════════ CONTROL DECK ══════════════════ -->
    <section class="unq-deck sd-card">
      <!-- lane selector -->
      <div class="unq-lanes">
        <button v-for="l in LANES" :key="l.key" class="lane" :class="{ on: lane === l.key }" :style="{ '--lc': l.color }" @click="setLane(l.key)">
          <component :is="l.icon" :size="14" />
          <span class="lane-l">{{ l.label }}</span>
          <span class="lane-n sd-mono">{{ l.count }}</span>
        </button>
      </div>

      <div class="unq-bar">
        <!-- priority quick-filter -->
        <div class="unq-pris">
          <button class="pri" :class="{ on: !f.priority }" @click="f.priority = ''; reload()">All</button>
          <button v-for="p in PRIORITIES" :key="p.value" class="pri" :class="{ on: f.priority === p.value }" :style="{ '--pc': priColor(p.value) }" @click="f.priority = f.priority === p.value ? '' : p.value; reload()">
            <i />{{ p.label }}<span v-if="stats.by_priority && stats.by_priority[p.value]" class="pri-n">{{ stats.by_priority[p.value] }}</span>
          </button>
        </div>
        <div class="unq-tools">
          <button class="unq-btn sm" :class="{ on: showFilters }" @click="showFilters = !showFilters">
            <SlidersHorizontal :size="14" /> Filters <span v-if="activeFilterCount" class="unq-fbadge">{{ activeFilterCount }}</span>
          </button>
          <SdSelect v-model="sortKey" :options="SORTS" class="unq-sort" @update:model-value="reload" />
          <span class="unq-count sd-mono">{{ total }} {{ total === 1 ? 'ticket' : 'tickets' }}<template v-if="wsCapped"> · showing first 100</template></span>
        </div>
      </div>
    </section>

    <!-- filters -->
    <Transition name="unq-flt">
      <section v-if="showFilters" class="unq-filters sd-card">
        <div class="flt-q">
          <Search :size="14" />
          <input v-model="f.q" type="text" placeholder="Search subject or ticket #…" @keyup.enter="reload" />
          <button v-if="f.q" class="flt-x" @click="f.q = ''; reload()"><X :size="12" /></button>
        </div>
        <div class="flt-field"><label>Type</label><SdSelect v-model="f.ticket_type" :options="opt(TICKET_TYPES, 'All types')" @update:model-value="reload" /></div>
        <div v-if="teamOptions.length > 1" class="flt-field"><label>Team</label><SdSelect v-model="f.team_id" :options="teamOptions" @update:model-value="reload" /></div>
        <div class="flt-actions">
          <button v-if="activeFilterCount" class="unq-btn sm ghost" @click="clearFilters"><X :size="13" /> Clear</button>
        </div>
      </section>
    </Transition>

    <!-- bulk bar -->
    <Presence>
      <Motion v-if="agent && selected.length" class="unq-bulk sd-card"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: 12 }" :transition="{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }">
        <span class="bulk-n">{{ selected.length }} selected</span>
        <div class="bulk-actions">
          <button class="unq-btn sm primary" :disabled="!myId || claiming" @click="claimSelected"><UserCheck :size="13" /> Claim to me</button>
          <button class="unq-btn sm" @click="openEscalateFlow"><Flame :size="13" /> Escalate</button>
        </div>
        <button class="unq-btn sm ghost" @click="selected = []">Clear</button>
      </Motion>
    </Presence>

    <!-- ══════════════════ CLAIM QUEUE (smart-ranked) ══════════════════ -->
    <section class="unq-queue">
      <header class="q-head">
        <label class="q-all" v-if="agent && ranked.length">
          <input type="checkbox" :checked="allSelected" @change="toggleAll" /> Select all
        </label>
        <span class="q-order sd-mono"><ArrowDownWideNarrow :size="12" /> {{ sortKey === 'smart' ? 'Smart claim order' : (SORTS.find(s => s.value === sortKey)?.label || '') }}</span>
      </header>

      <div v-if="loading" class="q-skeleton">
        <div v-for="i in 5" :key="i" class="sk-row" />
      </div>

      <div v-else-if="!ranked.length" class="q-empty sd-card">
        <div class="qe-orb"><Inbox :size="30" /></div>
        <h3>Queue is clear</h3>
        <p>No unassigned open tickets in your team’s pool — every request has an owner.</p>
      </div>

      <TransitionGroup v-else name="q-list" tag="div" class="q-list">
        <article v-for="(t, i) in ranked" :key="t.id" class="q-row" :class="{ sel: isSel(t.id), breach: slaState(t) === 'breached' }"
          :style="{ '--i': i, '--pc': priColor(t.priority) }" @click="openTicket(t.id)">
          <span class="q-spine" />
          <label v-if="agent" class="q-check" @click.stop>
            <input type="checkbox" :checked="isSel(t.id)" @change="toggleSel(t.id)" />
          </label>
          <span class="q-rank sd-mono">{{ i + 1 }}</span>
          <div class="q-body">
            <div class="q-line1">
              <span class="q-no sd-mono">{{ t.ticket_number }}</span>
              <SdPill kind="priority" :value="t.priority" />
              <span class="q-lane" :class="t.team_id ? 'team' : 'triage'">
                <component :is="t.team_id ? Users : Inbox" :size="10" />{{ t.team_id ? (t.team_name || 'Team') : 'Triage' }}
              </span>
            </div>
            <p class="q-subj">{{ t.subject }}</p>
            <div class="q-meta">
              <span v-if="t.raised_by_name" class="qm"><User :size="11" /> {{ t.raised_by_name }}</span>
              <span v-if="t.category_name" class="qm"><Tag :size="11" /> {{ t.category_name }}</span>
              <span class="qm"><Clock3 :size="11" /> {{ ageLabel(t) }}</span>
            </div>
          </div>
          <div class="q-sla" :class="slaState(t)">
            <span class="qs-dot" />
            <span class="qs-l">{{ slaLabel(t) }}</span>
          </div>
          <div class="q-actions" @click.stop>
            <button class="q-claim" :disabled="claiming" title="Claim to me" @click="openClaim(t)"><UserCheck :size="14" /> Claim</button>
            <button class="q-open" title="Open ticket" @click="openTicket(t.id)"><ArrowUpRight :size="15" /></button>
          </div>
        </article>
      </TransitionGroup>

      <p v-if="wsCapped" class="q-capnote"><Info :size="12" /> Showing the 100 most-urgent — refine filters to narrow the pool.</p>
    </section>

    <SdTicketDrawer :ticket-id="drawerId" :caps="{ agent }" @close="onDrawerClose" @changed="refreshAll" />
    <SdBulkActionModal :open="bulkModalOpen" mode="escalate" :tickets="selectedTickets" :me="me" :assignees="[]" :now="now"
      @close="bulkModalOpen = false" @done="onBulkDone" />
    <SdEscalateConsole :open="!!escalateTarget" :ticket="escalateTarget" :me="me" :assignees="[]" :now="now"
      @close="escalateTarget = null" @done="onEscalated" />
    <SdClaimModal :open="claimOpen" :ticket="claimTarget" :agent="agent" @close="claimOpen = false" @claimed="onClaimed" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  Zap, Play, Pause, Plus, RefreshCw, Radar, SlidersHorizontal, Search, X,
  UserCheck, Flame, Inbox, Users, Layers, AlertTriangle, Timer, AlarmClock, Clock3,
  Sparkles, ArrowUpRight, ArrowDownWideNarrow, User, Tag, Info, Gauge,
} from 'lucide-vue-next'
import SdClaimField from '../components/SdClaimField.vue'
import SdKpiTile from '../components/SdKpiTile.vue'
import SdPill from '../components/SdPill.vue'
import SdSelect from '../components/SdSelect.vue'
import SdTicketDrawer from '../drawers/SdTicketDrawer.vue'
import SdEscalateConsole from '../drawers/SdEscalateConsole.vue'
import SdBulkActionModal from '../modals/SdBulkActionModal.vue'
import SdClaimModal from '../modals/SdClaimModal.vue'
import {
  listUnassignedQueue, fetchUnassignedQueueStats, claimNextTicket, bulkTickets,
  getMe, PRIORITIES, TICKET_TYPES, priorityColor,
} from '@/composables/useSupportDesk'

const props = defineProps({
  scope: { type: String, default: 'unassigned' },
  panel: { type: String, default: 'admin' },
  agentReveal: { type: Boolean, default: false },
  dashboard: { type: Object, default: null },
})
const emit = defineEmits(['new', 'go'])

const route = useRoute()
const toast = useToast()
const agent = computed(() => props.panel === 'admin' || props.agentReveal)
const cinematicOn = () => document.documentElement.getAttribute('data-cinematic') === 'on'
const reduced = ref(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && !cinematicOn())

/* hero pointer parallax */
const heroEl = ref(null)
const hmx = ref(0), hmy = ref(0)
const onHeroMove = (e) => {
  if (reduced.value) return
  const r = heroEl.value?.getBoundingClientRect?.(); if (!r) return
  hmx.value = ((e.clientX - r.left) / r.width - 0.5) * 2
  hmy.value = ((e.clientY - r.top) / r.height - 0.5) * 2
}
const resetHero = () => { hmx.value = 0; hmy.value = 0 }
const orbStyle = (d) => ({ transform: `translate3d(${(hmx.value * d * 22).toFixed(1)}px, ${(hmy.value * d * 18).toFixed(1)}px, 0)` })

/* lane + filters + sort */
const lane = ref('all')
const f = reactive({ q: '', priority: '', ticket_type: '', team_id: '' })
const sortKey = ref('smart')
const showFilters = ref(false)
const SORTS = [
  { value: 'smart', label: 'Smart claim order' },
  { value: 'created_at:asc', label: 'Oldest first' },
  { value: 'created_at:desc', label: 'Newest first' },
]
const activeFilterCount = computed(() => (f.q ? 1 : 0) + (f.ticket_type ? 1 : 0) + (f.team_id ? 1 : 0))
const clearFilters = () => { f.q = ''; f.ticket_type = ''; f.team_id = ''; f.priority = ''; reload() }

/* data */
const workingSet = ref([])
const total = ref(0)
const wsCapped = ref(false)
const loading = ref(false)
const stats = ref({})
const now = ref(Date.now())
const myId = ref(null)
const me = ref({})
const claiming = ref(false)
const playMode = ref(false)
let tick = null

const serverSort = () => {
  if (sortKey.value === 'created_at:desc') return { sort_by: 'created_at', sort_dir: 'desc' }
  return { sort_by: 'created_at', sort_dir: 'asc' }   // smart re-ranks client-side; oldest-first is the base
}
const params = () => ({
  lane: lane.value,
  q: f.q || undefined,
  priority: f.priority || undefined,
  ticket_type: f.ticket_type || undefined,
  team_id: f.team_id || undefined,
  ...serverSort(),
})

const load = async () => {
  loading.value = true
  try {
    const r = await listUnassignedQueue({ ...params(), page: 1, limit: 100 })
    workingSet.value = r.items || []
    total.value = r.total || 0
    wsCapped.value = (r.total || 0) > 100
  } catch { workingSet.value = []; total.value = 0; wsCapped.value = false; toast.error('Could not load this desk — check the connection and press Refresh.') }
  finally { loading.value = false }
}
const loadStats = async () => { try { stats.value = await fetchUnassignedQueueStats() } catch { stats.value = {} } }
const reload = () => { selected.value = []; load() }
const refreshAll = () => { load(); loadStats() }
const setLane = (key) => { lane.value = key; reload() }

/* SLA helpers */
const dueMs = (t) => { const d = t.resolution_due_at || t.response_due_at; return d ? new Date(d).getTime() : null }
const slaState = (t) => {
  const dm = dueMs(t)
  if (t.sla_resolution_breached || (dm != null && dm <= now.value)) return 'breached'
  if (dm == null) return 'none'
  return (dm - now.value) <= 7200000 ? 'due-soon' : 'ok'
}
const slaLabel = (t) => {
  const s = slaState(t)
  if (s === 'breached') return 'Breached'
  if (s === 'none') return 'No SLA'
  const dm = dueMs(t); const h = (dm - now.value) / 3600000
  if (s === 'due-soon') return h < 1 ? `${Math.max(1, Math.round(h * 60))}m left` : `${Math.round(h)}h left`
  return h < 48 ? `${Math.round(h)}h left` : `${Math.round(h / 24)}d left`
}
const ageLabel = (t) => {
  const ms = now.value - new Date(t.created_at).getTime()
  const h = ms / 3600000
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m`
  if (h < 48) return `${Math.round(h)}h`
  return `${Math.round(h / 24)}d`
}
const oldestLabel = computed(() => {
  const m = stats.value?.oldest_age_minutes || 0
  if (!m) return '—'
  if (m < 60) return `${m}m`
  if (m < 60 * 48) return `${Math.round(m / 60)}h`
  return `${Math.round(m / 1440)}d`
})
const priColor = (p) => priorityColor ? priorityColor(p) : `var(--sd-pri-${p})`

/* smart claim ranking (mirrors the backend claim-next order) */
const PRANK = { critical: 0, urgent: 1, high: 2, medium: 3, low: 4 }
const claimScore = (t) => {
  const dm = dueMs(t)
  const breached = t.sla_resolution_breached || (dm != null && dm <= now.value)
  const hrsToDue = dm != null ? Math.max(0, (dm - now.value) / 3600000) : 999
  const pr = PRANK[t.priority] ?? 3
  const ageHrs = (now.value - new Date(t.created_at).getTime()) / 3600000
  return (breached ? 0 : 1) * 1e9 + Math.min(hrsToDue, 999) * 1e5 + pr * 1e3 - Math.min(ageHrs, 999)
}
const ranked = computed(() => {
  const list = [...workingSet.value]
  if (sortKey.value === 'smart') list.sort((a, b) => claimScore(a) - claimScore(b))
  return list
})
const topPick = computed(() => ranked.value[0] || null)
const nextId = computed(() => topPick.value?.id || null)

/* KPI bento */
const kpis = computed(() => {
  const s = stats.value || {}
  return [
    { key: 'total', label: 'Awaiting claim', icon: Inbox, color: 'var(--sd-amber)', value: s.total || 0 },
    { key: 'team', label: 'Team queue', icon: Users, color: 'var(--sd-amber-strong)', value: s.team_queue || 0 },
    { key: 'triage', label: 'Triage pool', icon: Layers, color: 'var(--sd-ember)', value: s.triage_pool || 0 },
    { key: 'breaching', label: 'Breaching', icon: Timer, color: 'var(--sd-danger)', value: s.breaching || 0, live: (s.breaching || 0) > 0 },
    { key: 'dueSoon', label: 'Due soon', icon: AlarmClock, color: 'var(--sd-warning)', value: s.due_soon || 0 },
    { key: 'critical', label: 'Critical', icon: AlertTriangle, color: 'var(--sd-pri-critical)', value: (s.by_priority && s.by_priority.critical) || 0 },
  ]
})

/* lanes */
const LANES = computed(() => {
  const s = stats.value || {}
  return [
    { key: 'all', label: 'All waiting', icon: Layers, color: 'var(--sd-amber)', count: s.total || 0 },
    { key: 'team', label: 'Team queue', icon: Users, color: 'var(--sd-amber-strong)', count: s.team_queue || 0 },
    { key: 'triage', label: 'Triage pool', icon: Inbox, color: 'var(--sd-ember)', count: s.triage_pool || 0 },
  ]
})

const subline = computed(() => {
  const names = stats.value?.team_names || []
  if (names.length) return `Open work waiting to be claimed for ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` +${names.length - 3}` : ''}. Pull one before the SLA clock bites.`
  return 'Open work waiting to be claimed in your team’s pool — pull one before the SLA clock bites.'
})

const teamOptions = computed(() => {
  const ts = stats.value?.teams || []
  return [{ value: '', label: 'All my teams' }, ...ts.map(t => ({ value: t.team_id, label: `${t.name || 'Team'} (${t.count})` }))]
})
const opt = (arr, allLabel) => [{ value: '', label: allLabel }, ...arr.map(x => ({ value: x.value, label: x.label }))]

/* selection + bulk */
const selected = ref([])
const isSel = (id) => selected.value.includes(String(id))
const toggleSel = (id) => { const s = String(id); selected.value = isSel(id) ? selected.value.filter(x => x !== s) : [...selected.value, s] }
const allSelected = computed(() => ranked.value.length > 0 && ranked.value.every(t => isSel(t.id)))
const toggleAll = () => {
  const ids = ranked.value.map(t => String(t.id))
  selected.value = allSelected.value ? [] : ids
}
const doBulk = async (action, payload = {}) => {
  if (!selected.value.length) return
  try {
    const r = await bulkTickets({ ids: selected.value, action, ...payload })
    toast.success(`${r.updated ?? selected.value.length} ticket${(r.updated ?? 2) === 1 ? '' : 's'} updated`)
    selected.value = []; refreshAll()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Bulk action failed') }
}

/* escalation runs through the corporate console (single) / governed bulk modal (multi)
   instead of a silent, reason-less bulk call — same experience as My Tickets. */
const bulkModalOpen = ref(false)
const selectedTickets = computed(() => ranked.value.filter(t => selected.value.includes(String(t.id))))
const escalateTarget = ref(null)
const openEscalateFlow = () => {
  if (!selected.value.length) return
  if (selectedTickets.value.length === 1) { escalateTarget.value = selectedTickets.value[0]; return }
  bulkModalOpen.value = true
}
const onBulkDone = ({ updated = 0, skipped = 0 } = {}) => {
  bulkModalOpen.value = false; selected.value = []
  if (updated) toast.success(`${updated} ticket${updated === 1 ? '' : 's'} escalated${skipped ? ` · ${skipped} skipped` : ''}`)
  refreshAll()
}
const onEscalated = () => { escalateTarget.value = null; selected.value = []; toast.success('Ticket escalated'); refreshAll() }
const claimSelected = async () => {
  if (!selected.value.length || !myId.value) return
  claiming.value = true
  try {
    const r = await bulkTickets({ ids: selected.value, action: 'assign', assigned_agent_id: myId.value })
    toast.success(`Claimed ${r.updated ?? selected.value.length} ticket${(r.updated ?? 2) === 1 ? '' : 's'}`)
    selected.value = []; refreshAll()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not claim') }
  finally { claiming.value = false }
}

/* deliberate claim → animated modal (requester + team/request-type eligibility + workflow + reason) */
const claimOpen = ref(false)
const claimTarget = ref(null)
const openClaim = (t) => { if (!t) return; claimTarget.value = t; claimOpen.value = true }
const onClaimed = (res) => {
  claimOpen.value = false
  refreshAll()
  if (res && res.id) openTicket(res.id)   // open the freshly-claimed ticket so the agent can work it
}

/* guided mode toggle — turning it ON starts the atomic auto-serve loop */
const toggleGuided = () => { playMode.value = !playMode.value; if (playMode.value) claimNext() }

/* guided "Claim next" — atomic server pick (no modal; the fast lane) */
const claimNext = async () => {
  if (claiming.value) return
  claiming.value = true
  try {
    const t = await claimNextTicket({ lane: lane.value, team_id: f.team_id || undefined })
    toast.success(`Claimed ${t.ticket_number}`)
    refreshAll()
    openTicket(t.id)               // Play/guided mode: open it so the agent works it immediately
  } catch (e) {
    if (e?.response?.status === 404) { toast.info('Queue is clear — nothing left to claim.'); playMode.value = false }
    else toast.error(e?.response?.data?.detail || 'Could not claim next ticket')
  } finally { claiming.value = false }
}

/* drawer */
const drawerId = ref(null)
const openTicket = (id) => { drawerId.value = String(id) }
const onDrawerClose = () => {
  drawerId.value = null
  // Guided mode: serve the next ticket automatically once the current one is closed.
  if (playMode.value && (stats.value?.total || 0) > 0) setTimeout(claimNext, 220)
}

onMounted(async () => {
  refreshAll()
  try { const m = await getMe(); me.value = m || {}; myId.value = m?.id || null } catch { /* non-fatal */ }
  if (route.query.ticket) openTicket(route.query.ticket)
  tick = setInterval(() => { now.value = Date.now() }, 1000)
})
onBeforeUnmount(() => { clearInterval(tick) })
watch(() => route.query.ticket, (v) => { if (v) openTicket(v) })
watch(agent, refreshAll)
</script>

<style scoped>
.unq { display: flex; flex-direction: column; gap: 14px; color: var(--sd-text); }

/* ═══════════════ HERO ═══════════════ */
.unq-hero { position: relative; overflow: hidden; border-radius: 24px; padding: 28px 30px 26px; isolation: isolate;
  background: var(--sd-grad-hero), var(--sd-panel); background-blend-mode: overlay, normal;
  border: 1px solid var(--sd-border-strong); box-shadow: var(--sd-shadow); }
.unq-hero::before { content: ''; position: absolute; inset: 0; z-index: -1; background: linear-gradient(135deg, rgba(8, 10, 12, 0.88), rgba(10, 12, 14, 0.8)); }
[data-theme="light"] .unq-hero::before { background: linear-gradient(135deg, rgba(255, 251, 245, 0.84), rgba(255, 248, 238, 0.72)); }

.unq-atm { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.orb { position: absolute; border-radius: 50%; filter: blur(64px); will-change: transform; transition: transform 0.5s var(--sd-spring); }
.orb.a1 { width: 360px; height: 360px; top: -130px; left: -80px; background: radial-gradient(circle, rgba(251, 191, 36, 0.4), transparent 65%); animation: unq-orb 23s ease-in-out infinite; }
.orb.a2 { width: 300px; height: 300px; top: -70px; right: 14%; background: radial-gradient(circle, rgba(251, 146, 60, 0.32), transparent 66%); animation: unq-orb 28s ease-in-out infinite reverse; }
.orb.a3 { width: 240px; height: 240px; bottom: -130px; left: 30%; background: radial-gradient(circle, rgba(234, 88, 12, 0.26), transparent 68%); animation: unq-orb 31s ease-in-out infinite; }
.orb.a4 { width: 300px; height: 300px; bottom: -150px; right: -80px; background: radial-gradient(circle, rgba(252, 211, 77, 0.24), transparent 67%); animation: unq-orb 26s ease-in-out infinite reverse; }
.unq-grain { position: absolute; inset: 0; opacity: 0.05; mix-blend-mode: overlay;
  background-image: radial-gradient(rgba(251, 191, 36, 0.5) 1px, transparent 1px), radial-gradient(rgba(234, 88, 12, 0.4) 1px, transparent 1px);
  background-size: 5px 5px, 7px 7px; background-position: 0 0, 2px 3px; }
.unq-grid { position: absolute; inset: 0; opacity: 0.4; background-image: radial-gradient(rgba(251, 191, 36, 0.06) 1px, transparent 1px); background-size: 26px 26px;
  -webkit-mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.5), transparent 75%); mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.5), transparent 75%); }
.unq-mesh { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.45; }
.ml { fill: none; stroke: rgba(251, 191, 36, 0.3); stroke-width: 1.4; stroke-dasharray: 6 11; animation: unq-mesh 26s linear infinite; }
.ml.m2 { stroke: rgba(251, 146, 60, 0.26); animation-duration: 32s; }
.ml.m3 { stroke: rgba(234, 88, 12, 0.2); animation-duration: 38s; }

.unq-hero-row { position: relative; z-index: 1; display: grid; grid-template-columns: 1.04fr 1.16fr; gap: 26px; align-items: center; }
.unq-lead { display: flex; flex-direction: column; min-width: 0; }
.unq-eyebrow { display: inline-flex; align-items: center; gap: 9px; width: fit-content; font-size: 10px; font-weight: 700; letter-spacing: 0.15em; color: var(--sd-amber); padding: 6px 13px; border-radius: 999px; background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); }
.eb-glyph { position: relative; width: 13px; height: 13px; }
.eb-ring { position: absolute; inset: 0; border-radius: 50%; border: 1.4px solid var(--sd-amber); border-top-color: transparent; animation: unq-spin 2.6s linear infinite; }
.eb-core { position: absolute; inset: 4px; border-radius: 50%; background: var(--sd-amber); animation: unq-blip 2s ease-in-out infinite; }
.eb-sep { width: 1px; height: 11px; background: var(--sd-amber-border); }
.eb-live { display: inline-flex; align-items: center; gap: 5px; color: var(--sd-success); }
.eb-live i { width: 6px; height: 6px; border-radius: 50%; background: var(--sd-success); box-shadow: 0 0 8px var(--sd-success); animation: unq-blip 1.6s ease-in-out infinite; }

.unq-title { margin: 15px 0 0; font-weight: 850; letter-spacing: -0.03em; line-height: 1; font-size: clamp(30px, 3.8vw, 46px); }
.unq-accent { background: var(--sd-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.unq-sub { margin: 13px 0 0; font-size: 14px; line-height: 1.55; color: var(--sd-text-secondary); max-width: 48ch; }

.unq-cta { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 20px; }
.unq-pulse { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 20px; }
.unq-scan { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; color: var(--sd-text-muted); }
.unq-scan svg { color: var(--sd-amber); }
.unq-scan b { color: var(--sd-text); font-family: var(--sd-mono); font-weight: 700; }
.unq-pdiv { width: 1px; height: 16px; background: var(--sd-border-strong); }
.unq-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 999px; font-size: 11.5px; color: var(--sd-text-secondary); background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.unq-chip i { width: 7px; height: 7px; border-radius: 50%; }
.unq-chip b { color: var(--sd-text); font-weight: 800; font-family: var(--sd-mono); }
.unq-chip.danger i { background: var(--sd-danger); box-shadow: 0 0 7px var(--sd-danger); }
.unq-chip.warn i { background: var(--sd-warning); box-shadow: 0 0 7px var(--sd-warning); }
.unq-chip.steel i { background: var(--sd-steel); box-shadow: 0 0 7px var(--sd-steel); }

.unq-field { min-height: 322px; }

/* ═══════════════ BUTTONS ═══════════════ */
.unq-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 11px; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); transition: border-color 0.2s, background 0.2s, transform 0.12s; }
.unq-btn:hover { border-color: var(--sd-amber); }
.unq-btn:active { transform: translateY(1px); }
.unq-btn.on { border-color: var(--sd-amber); color: var(--sd-amber); background: var(--sd-amber-soft); }
.unq-btn.primary { border: none; background: var(--sd-grad-hero); color: #1a1206; box-shadow: 0 8px 22px rgba(251, 146, 60, 0.28); }
[data-theme="light"] .unq-btn.primary { color: #fff8ec; }
.unq-btn.sm { padding: 7px 12px; font-size: 12px; }
.unq-btn.icon { padding: 9px 10px; }
.unq-btn.ghost { background: transparent; }
.unq-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.unq-fbadge { display: inline-grid; place-items: center; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: var(--sd-amber); color: #1a1206; font-size: 10px; font-weight: 800; }
[data-theme="light"] .unq-fbadge { color: #fff8ec; }
.spin { animation: unq-spin 0.8s linear infinite; }

/* ═══════════════ KPI ═══════════════ */
.unq-kpis { display: grid; grid-template-columns: repeat(6, 1fr); gap: 11px; }

/* ═══════════════ NEXT UP ═══════════════ */
.unq-next { position: relative; display: flex; align-items: center; gap: 16px; padding: 15px 18px 15px 20px; overflow: hidden; border-color: var(--sd-amber-border); }
.nx-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; }
.nx-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.14em; color: var(--sd-amber); padding: 5px 10px; border-radius: 999px; background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); flex-shrink: 0; }
.nx-main { flex: 1; min-width: 0; }
.nx-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.nx-no { font-size: 12px; font-weight: 700; color: var(--sd-amber); }
.nx-flag { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
.nx-flag.breach { color: var(--sd-danger); background: color-mix(in srgb, var(--sd-danger) 15%, transparent); }
.nx-flag.due { color: var(--sd-warning); background: color-mix(in srgb, var(--sd-warning) 15%, transparent); }
.nx-lane { display: inline-flex; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; color: var(--sd-text-muted); background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.nx-lane.triage { color: var(--sd-ember); }
.nx-subj { margin: 6px 0 5px; font-size: 14px; font-weight: 600; color: var(--sd-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nx-meta { display: flex; flex-wrap: wrap; gap: 14px; font-size: 11.5px; color: var(--sd-text-muted); }
.nx-meta span { display: inline-flex; align-items: center; gap: 5px; }
.nx-actions { display: flex; gap: 8px; flex-shrink: 0; }

/* ═══════════════ CONTROL DECK ═══════════════ */
.unq-deck { display: flex; flex-direction: column; gap: 12px; padding: 13px 15px; }
.unq-lanes { display: flex; flex-wrap: wrap; gap: 8px; }
.lane { display: inline-flex; align-items: center; gap: 8px; padding: 9px 15px; border-radius: 999px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface-glass); color: var(--sd-text-secondary); transition: border-color 0.18s, color 0.18s, background 0.18s; }
.lane:hover { border-color: var(--lc); color: var(--sd-text); }
.lane.on { border-color: var(--lc); color: var(--lc); background: color-mix(in srgb, var(--lc) 12%, transparent); }
.lane svg { color: var(--lc); }
.lane-n { font-size: 11px; font-weight: 800; padding: 1px 8px; border-radius: 999px; background: color-mix(in srgb, var(--lc) 16%, transparent); }

.unq-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding-top: 12px; border-top: 1px solid var(--sd-border); }
.unq-pris { display: inline-flex; flex-wrap: wrap; gap: 6px; }
.pri { display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px; border-radius: 999px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border); background: var(--sd-surface-glass); color: var(--sd-text-muted); transition: color 0.16s, border-color 0.16s; }
.pri i { width: 7px; height: 7px; border-radius: 50%; background: var(--pc, var(--sd-steel)); }
.pri:hover { color: var(--sd-text); }
.pri.on { color: var(--sd-text); border-color: var(--pc, var(--sd-amber)); background: color-mix(in srgb, var(--pc, var(--sd-amber)) 12%, transparent); }
.pri-n { font-size: 10px; font-weight: 800; font-family: var(--sd-mono); opacity: 0.8; }
.unq-tools { display: inline-flex; align-items: center; gap: 8px; margin-left: auto; flex-wrap: wrap; }
.unq-sort :deep(.sd-select) { min-width: 172px; }
.unq-count { font-size: 12px; color: var(--sd-text-dim); }

/* filters */
.unq-flt-enter-active, .unq-flt-leave-active { transition: opacity 0.22s var(--sd-spring), transform 0.22s var(--sd-spring); }
.unq-flt-enter-from, .unq-flt-leave-to { opacity: 0; transform: translateY(-6px); }
.unq-filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; padding: 16px 18px; }
.flt-q { flex: 1; min-width: 220px; display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 11px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text-dim); }
.flt-q input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--sd-text); font-size: 13px; font-family: inherit; }
.flt-x { display: grid; place-items: center; background: none; border: none; color: var(--sd-text-dim); cursor: pointer; }
.flt-field { display: flex; flex-direction: column; gap: 5px; min-width: 160px; }
.flt-field label { font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--sd-text-dim); }
.flt-actions { display: flex; gap: 8px; align-items: flex-end; margin-left: auto; }

/* bulk */
.unq-bulk { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 12px 16px; border-color: var(--sd-amber); }
.bulk-n { font-size: 13px; font-weight: 700; color: var(--sd-amber); }
.bulk-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }

/* ═══════════════ QUEUE ═══════════════ */
.unq-queue { display: flex; flex-direction: column; gap: 9px; }
.q-head { display: flex; align-items: center; justify-content: space-between; padding: 0 4px; }
.q-all { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; color: var(--sd-text-muted); cursor: pointer; }
.q-all input { accent-color: var(--sd-amber); }
.q-order { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--sd-text-dim); }

.q-skeleton { display: flex; flex-direction: column; gap: 9px; }
.sk-row { height: 74px; border-radius: 16px; background: linear-gradient(100deg, var(--sd-surface) 30%, var(--sd-surface-elevated) 50%, var(--sd-surface) 70%); background-size: 200% 100%; animation: unq-shimmer 1.4s linear infinite; border: 1px solid var(--sd-border); }

.q-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; padding: 46px 24px; }
.qe-orb { display: grid; place-items: center; width: 66px; height: 66px; border-radius: 50%; color: var(--sd-success); background: color-mix(in srgb, var(--sd-success) 12%, transparent); border: 1px solid color-mix(in srgb, var(--sd-success) 30%, transparent); }
.q-empty h3 { margin: 6px 0 0; font-size: 17px; font-weight: 700; }
.q-empty p { margin: 0; font-size: 13px; color: var(--sd-text-muted); max-width: 40ch; }

.q-list { display: flex; flex-direction: column; gap: 9px; }
.q-row { position: relative; display: flex; align-items: center; gap: 13px; padding: 13px 16px 13px 20px; border-radius: 16px; cursor: pointer; overflow: hidden;
  background: var(--sd-surface); border: 1px solid var(--sd-border); box-shadow: var(--sd-card-shadow); transition: border-color 0.18s, transform 0.18s, box-shadow 0.18s;
  animation: unq-deal 0.5s var(--sd-spring) both; animation-delay: calc(min(var(--i) * 0.035s, 0.5s)); }
.q-row:hover { border-color: var(--sd-amber-border); transform: translateY(-2px); box-shadow: var(--sd-shadow-hover); }
.q-row.sel { border-color: var(--sd-amber); background: var(--sd-amber-soft); }
.q-row.breach { border-color: color-mix(in srgb, var(--sd-danger) 40%, var(--sd-border)); }
.q-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--pc, var(--sd-steel)); }
.q-row.breach .q-spine { background: var(--sd-danger); box-shadow: 0 0 12px var(--sd-danger); }
.q-check { display: inline-flex; }
.q-check input { accent-color: var(--sd-amber); width: 15px; height: 15px; }
.q-rank { width: 22px; text-align: center; font-size: 13px; font-weight: 800; color: var(--sd-text-dim); flex-shrink: 0; }
.q-body { flex: 1; min-width: 0; }
.q-line1 { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.q-no { font-size: 11.5px; font-weight: 700; color: var(--sd-amber); }
.q-lane { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 700; padding: 2px 7px; border-radius: 999px; color: var(--sd-text-muted); background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.q-lane.triage { color: var(--sd-ember); }
.q-subj { margin: 5px 0 5px; font-size: 13.5px; font-weight: 600; color: var(--sd-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.q-meta { display: flex; flex-wrap: wrap; gap: 12px; }
.qm { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--sd-text-muted); }
.q-sla { display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 62px; flex-shrink: 0; }
.qs-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--sd-steel); }
.q-sla.breached .qs-dot { background: var(--sd-danger); box-shadow: 0 0 8px var(--sd-danger); }
.q-sla.due-soon .qs-dot { background: var(--sd-warning); box-shadow: 0 0 8px var(--sd-warning); }
.q-sla.ok .qs-dot { background: var(--sd-success); }
.qs-l { font-size: 10px; font-weight: 700; color: var(--sd-text-muted); }
.q-sla.breached .qs-l { color: var(--sd-danger); }
.q-sla.due-soon .qs-l { color: var(--sd-warning); }
.q-actions { display: flex; align-items: center; gap: 7px; flex-shrink: 0; }
.q-claim { display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; border: none; background: var(--sd-grad-hero); color: #1a1206; box-shadow: 0 6px 16px rgba(251, 146, 60, 0.24); transition: transform 0.12s; }
[data-theme="light"] .q-claim { color: #fff8ec; }
.q-claim:hover { transform: translateY(-1px); }
.q-claim:disabled { opacity: 0.5; cursor: not-allowed; }
.q-open { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; cursor: pointer; border: 1px solid var(--sd-border-strong); background: var(--sd-surface-glass); color: var(--sd-text-secondary); transition: color 0.16s, border-color 0.16s; }
.q-open:hover { color: var(--sd-amber); border-color: var(--sd-amber); }
.q-capnote { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--sd-text-dim); padding: 2px 4px; }

.q-list-enter-active, .q-list-leave-active { transition: opacity 0.35s var(--sd-spring), transform 0.35s var(--sd-spring); }
.q-list-enter-from { opacity: 0; transform: translateY(10px); }
.q-list-leave-to { opacity: 0; transform: translateX(24px) scale(0.97); }
.q-list-move { transition: transform 0.35s var(--sd-spring); }

@keyframes unq-orb { 0%, 100% { translate: 0 0; } 50% { translate: 24px -18px; } }
@keyframes unq-mesh { to { stroke-dashoffset: -200; } }
@keyframes unq-spin { to { transform: rotate(360deg); } }
@keyframes unq-blip { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.82); } }
@keyframes unq-deal { from { opacity: 0; transform: translateY(12px) scale(0.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes unq-shimmer { to { background-position: -200% 0; } }

/* responsive */
@media (max-width: 1080px) {
  .unq-hero-row { grid-template-columns: 1fr; }
  .unq-field { order: -1; min-height: 300px; }
  .unq-kpis { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 720px) {
  .unq-hero { padding: 22px 18px; }
  .unq-kpis { grid-template-columns: repeat(2, 1fr); }
  .unq-tools { margin-left: 0; }
  .q-sla { display: none; }
  .q-claim span { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .orb,
  html:not([data-cinematic="on"]) .ml,
  html:not([data-cinematic="on"]) .eb-ring,
  html:not([data-cinematic="on"]) .eb-core,
  html:not([data-cinematic="on"]) .eb-live i,
  html:not([data-cinematic="on"]) .spin,
  html:not([data-cinematic="on"]) .q-row,
  html:not([data-cinematic="on"]) .sk-row { animation: none; }
}
</style>
