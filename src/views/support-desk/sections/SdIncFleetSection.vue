<template>
  <div class="isb">
    <!-- ═══════════ THE BRIEF ═══════════ -->
    <Motion as="section" class="brief sd-card" :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
      <div class="brief-sweep" aria-hidden="true" />
      <header class="dateline">
        <span class="dl-m sd-mono">COMMAND FUNNEL</span>
        <span class="dl-t sd-mono">SITUATION BRIEF · {{ todayLabel }}</span>
        <span class="dl-scope sd-mono">Superuser · whole-desk{{ teamCount ? ` · ${teamCount} teams` : '' }}</span>
        <span class="dl-live sd-mono"><i />LIVE · {{ agoLabel }}</span>
      </header>

      <div class="lede">
        <div class="lede-copy">
          <h1 class="lede-h">
            The desk holds <em>{{ s.active_total || 0 }} active faults</em><template v-if="s.sla?.breached"> — <b class="brk">{{ s.sla.breached }} have breached.</b></template>
          </h1>
          <p class="lede-p">{{ narrative }}</p>
          <div class="lanes">
            <button v-for="f in flagChips" :key="f.key" class="lane" :class="{ on: flag === f.key, hot: f.tone === 'bad' }"
              @click="setFlag(f.key)">{{ f.label }} <b class="sd-mono">{{ f.n }}</b></button>
          </div>
        </div>
        <div class="board">
          <div v-for="b in boardCells" :key="b.key" class="flapg">
            <div class="flaps" :style="{ '--c': b.color }">
              <span v-for="(d, di) in b.digits" :key="di" class="digit" :class="{ flip: flap }" :style="{ animationDelay: `${di * 90}ms` }">{{ d }}</span>
            </div>
            <span class="flap-l sd-mono" :style="{ color: b.color }">{{ b.label }}</span>
          </div>
        </div>
      </div>

      <!-- KPI wall -->
      <div class="kwall">
        <button v-for="k in kpis" :key="k.k" class="kw" :style="{ '--w': k.w }" @click="k.go && k.go()">
          <span class="kw-l sd-mono">{{ k.k }}</span>
          <span class="kw-v sd-mono" :class="k.tone">{{ k.v }}<small v-if="k.u">{{ k.u }}</small></span>
          <span class="kw-d sd-mono" :class="k.dtone">{{ k.d }}</span>
        </button>
      </div>
    </Motion>

    <!-- ═══════════ INTEL BAND ═══════════ -->
    <div class="intel">
      <section class="panel sd-card">
        <h3 class="p-h sd-mono">CROSS-TEAM SCOREBOARD <span class="p-c">by open load</span></h3>
        <div v-if="scoreboard.length" class="sbwrap">
          <button v-for="(t, i) in scoreboard" :key="t.id || t.name" class="sb" :class="{ crit: t.pct >= 90 }" @click="goTeamTimeline(t)">
            <span class="sb-rk sd-mono">{{ i + 1 }}</span>
            <span class="sb-nm">{{ t.name }}</span>
            <span class="sb-track"><i :style="{ width: `${t.pct}%` }" /></span>
            <span class="sb-n sd-mono">{{ t.active }}</span>
            <span class="sb-tr sd-mono" :class="t.trTone">{{ t.tr }}</span>
          </button>
        </div>
        <p v-else class="p-empty sd-mono">No per-team data.</p>
      </section>

      <section class="panel sd-card">
        <h3 class="p-h sd-mono">ESCALATION LADDER <span class="p-c">org-wide</span></h3>
        <div class="ribbon">
          <button v-for="r in ladder" :key="r.lv" class="rung" :class="{ hot: r.hot }" @click="$emit('go', 'incidents/critical')">
            <span class="rung-n sd-mono">{{ r.lv }}</span>
            <span class="rung-c"><b>{{ r.name }}</b><i>{{ r.note }}</i></span>
            <span class="rung-ct sd-mono" :style="{ color: r.color }">{{ r.ct }}</span>
          </button>
        </div>
      </section>
    </div>

    <!-- ═══════════ THE SITUATION ROOM (ops) ═══════════ -->
    <div class="opslab sd-mono"><Radio :size="12" /> THE SITUATION ROOM · LIVE GOVERNANCE QUEUE</div>

    <!-- toolbar -->
    <div class="ops-tools">
      <div class="bar-q"><Search :size="13" /><input v-model="q" type="text" placeholder="Search incidents, services, owners…" @keyup.enter="reload" /></div>
      <SdSelect v-model="fSev" :options="sevOptions" @update:modelValue="reload" />
      <SdSelect v-if="serviceOptions.length > 1" v-model="fService" :options="serviceOptions" @update:modelValue="reload" />
      <SdSelect v-model="sortKey" :options="sortOptions" @update:modelValue="reload" />
      <button class="bar-btn" title="Refresh" @click="reload(false)"><RefreshCw :size="14" :class="{ spin: loading }" /></button>
    </div>

    <!-- bulk bar -->
    <Transition name="bulk">
      <div v-if="selected.size" class="bulkbar">
        <span class="bb-sel sd-mono"><b>{{ selected.size }}</b> selected</span>
        <button class="bv" :disabled="busy" @click="bulk('ack')"><Check :size="12" /> Ack</button>
        <button class="bv" :disabled="busy || !selCanEscalate" :title="selCanEscalate ? '' : 'None of the selected incidents have an owner to escalate'" @click="bulk('escalate')"><Zap :size="12" /> Escalate</button>
        <button class="bv" :disabled="busy || !selCanDeEscalate" :title="selCanDeEscalate ? '' : 'None of the selected incidents are escalated'" @click="bulk('de-escalate')"><ChevronDown :size="12" /> De-escalate</button>
        <button class="bv ghost" @click="clearSel">Clear</button>
      </div>
    </Transition>

    <!-- table -->
    <div class="tablewrap sd-card">
      <div class="thead">
        <button class="th-ck" :class="{ on: allSel }" @click="toggleAll"><Check :size="11" /></button>
        <span class="s ns">Sev</span>
        <span class="s ns">Incident</span>
        <span class="s ns">Service / impact</span>
        <span class="s ns">Roster</span>
        <span class="s ns">Team</span>
        <span class="s ns">SLA burn</span>
        <span class="s" :class="{ act: sortKey.startsWith('created') }" @click="setSort('created_at')">Age</span>
        <span class="th-cols sd-mono">{{ total }}</span>
      </div>

      <TransitionGroup name="row" tag="div" class="tbody">
        <article v-for="(r, i) in rows" :key="r.id" class="row" :class="`sev${r.sev}`" :style="{ '--i': i }"
          @click="$emit('open', r.id)">
          <button class="ck" :class="{ on: selected.has(r.id) }" @click.stop="toggleSel(r.id)"><Check :size="11" /></button>
          <span class="c-sev"><i class="led" :class="{ s1: r.sev === 1 }" /><span class="sd-mono">SEV{{ r.sev }}</span></span>
          <div class="c-inc">
            <span class="num sd-mono">{{ r.ticket_number }}</span>
            <span class="subj"><span v-if="r.is_major_incident" class="mi sd-mono">MI</span>{{ r.subject }}</span>
            <span class="meta sd-mono">
              <i :class="r.acknowledged_at ? 'ok' : 'bad'">{{ r.acknowledged_at ? '✓ ACK' : '◇ UNACKED' }}</i>
              <i :class="{ bad: !r.incident_commander_id && r.is_major_incident }">{{ r.incident_commander_id ? '★ CMDR' : (r.is_major_incident ? '★ NO CMDR' : '') }}</i>
              <i v-if="r.escalation_level">L{{ r.escalation_level }}</i>
              <i v-if="r.parent_incident_number">↳ {{ r.parent_incident_number }}</i>
              <i v-else-if="r.child_count">⧉ {{ r.child_count }}</i>
            </span>
          </div>
          <div class="c-svc">
            <span class="svc-chips">
              <span v-for="sv in (r.affected_services || []).slice(0, 3)" :key="sv" class="chip sd-mono">{{ sv }}</span>
              <span v-if="!r.affected_services?.length" class="chip dim sd-mono">unmapped</span>
            </span>
            <span v-if="r.affected_users" class="blast sd-mono"><i class="r" />{{ fmtUsers(r.affected_users) }}</span>
          </div>
          <div class="c-roster">
            <span class="av cmdr" :class="{ none: !r.incident_commander_id }" :title="r.incident_commander_name || 'commander unstaffed'">{{ ini(r.incident_commander_name) }}</span>
            <span class="av comms" :class="{ none: !r.comms_lead_id }" :title="r.comms_lead_name || 'comms unstaffed'">{{ ini(r.comms_lead_name) }}</span>
            <span class="av ops" :class="{ none: !r.ops_lead_id }" :title="r.ops_lead_name || 'ops unstaffed'">{{ ini(r.ops_lead_name) }}</span>
          </div>
          <div class="c-team">
            <span class="tn">{{ r.team_name || '—' }}</span>
            <span class="tm sd-mono">{{ r.assigned_agent_name || 'unowned' }}</span>
          </div>
          <div class="c-sla">
            <span class="bar"><i class="fill" :class="slaTone(r)" :style="{ width: `${slaPct(r)}%` }" /></span>
            <span class="lab sd-mono"><span class="t" :class="slaTone(r)">{{ slaLabel(r) }}</span><span>{{ slaRemain(r) }}</span></span>
          </div>
          <div class="c-age sd-mono">{{ age(r.created_at) }}</div>
          <div class="c-acts" @click.stop>
            <button class="a" title="Reassign" @click="openAssign(r)"><Users :size="13" /></button>
            <button class="a" :disabled="!r.assigned_agent_id"
              :title="r.assigned_agent_id ? 'Escalate' : 'Assign an owner before escalating'" @click="rowEscalate(r)"><Zap :size="13" /></button>
            <button v-if="r.war_room_url" class="a" title="War room" @click="toBridge(r)"><Radio :size="13" /></button>
            <button class="a" title="Open" @click="$emit('open', r.id)"><ChevronRight :size="13" /></button>
          </div>
        </article>
      </TransitionGroup>

      <div v-if="!rows.length && !loading" class="empty sd-mono">
        <Waves :size="20" />
        <p>{{ flag || fSev || fService || q ? 'No incidents match these filters.' : 'The funnel runs clear — no active incidents.' }}</p>
        <button v-if="flag || fSev || fService || q" class="bv" @click="clearFilters">Clear filters</button>
      </div>

      <!-- pager -->
      <div v-if="pages > 1" class="pager sd-mono">
        <button class="pg" :disabled="page <= 1" @click="go(page - 1)">‹</button>
        <span>{{ page }} / {{ pages }}</span>
        <button class="pg" :disabled="page >= pages" @click="go(page + 1)">›</button>
        <span class="pg-tot">{{ total }} incidents</span>
      </div>
    </div>

    <!-- ticker -->
    <div class="ticker sd-card">
      <span class="tk-l sd-mono">LIVE FEED</span>
      <div class="tk-track">
        <div class="tk-run" :class="{ paused: !feed.length }">
          <template v-if="feed.length">
            <span v-for="(f, i) in feedLoop" :key="i" class="tk-i"><b class="sd-mono">{{ f.time }}</b>{{ f.text }}</span>
          </template>
          <span v-else class="tk-i sd-mono">No recent command activity.</span>
        </div>
      </div>
      <div class="tk-jumps sd-mono">
        <button class="tk-j" @click="$emit('go', 'incidents/major')">Major</button>
        <button class="tk-j" @click="$emit('go', 'incidents/critical')">Critical</button>
        <button class="tk-j" @click="$emit('go', 'incidents/rca')">RCA</button>
        <button class="tk-j" @click="$emit('go', 'incidents/post-incident')">PIR</button>
        <button class="tk-j" @click="$emit('go', 'incidents/timeline')">Timeline →</button>
      </div>
    </div>

    <SdIncAssignPop :open="assignOpen" :ticket="assignTarget" @close="assignOpen = false" @done="onAssigned" />
  </div>
</template>

<script setup>
/*
  SdIncFleetSection — ADMIN "Active Incidents" desk · "THE SITUATION BRIEF" (D6).
  A hybrid of the Marquee Brief (editorial dateline + split-flap posture board +
  KPI wall + cross-team scoreboard + escalation ladder + live ticker) flowing into
  the Situation Room (server-filtered governance table + bulk verbs + row overrides).
  Whole-desk superuser oversight — NOT the agent BEAM. Row-click opens the shared
  SdTicketDrawer (full incident-command verb set lives there).
*/
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Motion } from 'motion-v'
import { Search, RefreshCw, Waves, Zap, Check, Users, Radio, ChevronRight, ChevronDown } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import SdSelect from '../components/SdSelect.vue'
import SdIncAssignPop from '../components/SdIncAssignPop.vue'
import {
  fetchIncidentCommandDashboard, fetchIncidentStats, listIncidents,
  ackTicket, escalateTicket, deEscalateTicket, warRoomHref, normalizeIncidentRow,
} from '@/composables/useSupportDesk'

const props = defineProps({
  panel: { type: String, default: 'admin' },
  agentReveal: { type: Boolean, default: false },
})
const emit = defineEmits(['open', 'go', 'new'])

const route = useRoute()
const router = useRouter()
const toast = useToast()

/* ── state ── */
const dash = ref(null)
const stats = ref(null)
const admin = ref(null)
const extras = ref(null)
const rows = ref([])
const total = ref(0)
const page = ref(1)
const limit = 20
const loading = ref(false)
const busy = ref(false)
const now = ref(Date.now())
const generatedAt = ref(Date.now())
const flap = ref(false)

const q = ref('')
const fSev = ref('')
const fService = ref('')
const flag = ref('')
const sortKey = ref('created_at:desc')

const selected = ref(new Set())
const assignOpen = ref(false)
const assignTarget = ref(null)

let tick = null, poll = null

/* ── options ── */
const sevOptions = [{ value: '', label: 'All SEV' }, { value: '1', label: 'SEV1' },
  { value: '2', label: 'SEV2' }, { value: '3', label: 'SEV3' }, { value: '4', label: 'SEV4' }]
const sortOptions = [
  { value: 'created_at:desc', label: 'Newest first' },
  { value: 'created_at:asc', label: 'Oldest first' },
  { value: 'ticket_number:desc', label: 'Number ↓' },
  { value: 'ticket_number:asc', label: 'Number ↑' },
]
const serviceOptions = computed(() => [{ value: '', label: 'All services' },
  ...((stats.value?.top_services || []).map(x => ({ value: x.service, label: x.service })))])
// Whitelisted flag lenses this desk understands — both the flag chips AND deep-links are
// validated against this so a malformed ?flag/?lens can't send an unknown value that the
// backend 422s (which loadRows would swallow into a silent-empty table).
const FLAG_KEYS = ['unacked', 'at_risk', 'breached', 'unowned', 'cmdr_unstaffed', 'update_overdue']

/* ── derived brief data ── */
const s = computed(() => stats.value || {})
const teamCount = computed(() => (admin.value?.per_team || []).length || 0)
const todayLabel = computed(() => new Date(generatedAt.value).toLocaleDateString(undefined,
  { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase())
const agoLabel = computed(() => {
  const sec = Math.max(0, Math.round((now.value - generatedAt.value) / 1000))
  return sec < 60 ? `${sec}s ago` : `${Math.floor(sec / 60)}m ago`
})

const narrative = computed(() => {
  const v = s.value
  const bits = []
  if (v.major_active) bits.push(`${v.major_active} major${v.major_active > 1 ? 's' : ''} on live bridges`)
  const lead = (admin.value?.per_team || []).slice().sort((a, b) => (b.active || 0) - (a.active || 0))[0]
  if (lead?.team_name) bits.push(`${lead.team_name} carries the heaviest load at ${lead.active || 0} open`)
  if (v.unacked) bits.push(`${v.unacked} unacked`)
  if (v.roles_unassigned) bits.push(`${v.roles_unassigned} missing a commander`)
  return bits.length ? bits.join(' · ') + '. Paging owed where owners are absent.' : 'The funnel is calm — no faults demand attention right now.'
})

const two = (n) => String(Math.max(0, Math.min(99, Math.round(n || 0)))).padStart(2, '0')
const boardCells = computed(() => [
  { key: 'active', label: 'Active', color: 'var(--sd-fun-core)', digits: two(s.value.active_total).split('') },
  { key: 'risk', label: 'At risk', color: 'var(--sd-inc-warn)', digits: two(s.value.sla?.at_risk).split('') },
  { key: 'brk', label: 'Breached', color: 'var(--sd-fun-esc)', digits: two(s.value.sla?.breached).split('') },
])

const hm = (m) => (m == null ? '—' : m < 60 ? `${Math.round(m)}` : `${(m / 60).toFixed(1)}`)
const hmU = (m) => (m == null ? '' : m < 60 ? 'm' : 'h')
const kpis = computed(() => {
  const v = s.value
  return [
    { k: 'MTTA·30d', v: hm(v.mtta_minutes_30d), u: hmU(v.mtta_minutes_30d), w: '78%', tone: '', d: trend(v.mtta_minutes_30d, null), dtone: 'up', go: () => emit('go', 'incidents/timeline') },
    { k: 'MTTR·mo', v: hm(v.mttr_minutes_current_month), u: hmU(v.mttr_minutes_current_month), w: '64%', tone: '', d: v.mttr_trend_pct != null ? `${v.mttr_trend_pct > 0 ? '▲' : '▼'}${Math.abs(v.mttr_trend_pct)}%` : '—', dtone: v.mttr_trend_pct > 0 ? 'dn' : 'up', go: () => emit('go', 'incidents/timeline') },
    { k: 'MTTD', v: hm(v.mttd_minutes_30d), u: hmU(v.mttd_minutes_30d), w: '52%', tone: '', d: '30d', dtone: '' },
    { k: 'Unacked', v: v.unacked || 0, u: '', w: '44%', tone: 'am', d: 'page owed', dtone: 'am', go: () => setFlag('unacked') },
    { k: 'Unowned', v: v.unowned || 0, u: '', w: '36%', tone: 'dn', d: 'no assignee', dtone: 'dn', go: () => setFlag('unowned') },
    { k: 'Cmdr gap', v: v.roles_unassigned || 0, u: '', w: '32%', tone: 'am', d: 'MI unstaffed', dtone: 'am', go: () => setFlag('cmdr_unstaffed') },
  ]
})
const trend = (val) => (val == null ? '—' : '30d')

const flagChips = computed(() => {
  const v = s.value
  return [
    { key: '', label: 'All', n: v.active_total || 0, tone: '' },
    { key: 'unacked', label: 'Unacked', n: v.unacked || 0, tone: v.unacked ? 'bad' : '' },
    { key: 'at_risk', label: 'At risk', n: v.sla?.at_risk || 0, tone: '' },
    { key: 'breached', label: 'Breached', n: v.sla?.breached || 0, tone: v.sla?.breached ? 'bad' : '' },
    { key: 'unowned', label: 'Unowned', n: v.unowned || 0, tone: '' },
    { key: 'cmdr_unstaffed', label: 'No CMDR', n: v.roles_unassigned || 0, tone: '' },
    { key: 'update_overdue', label: 'Update due', n: v.update_overdue || 0, tone: '' },
  ]
})

const scoreboard = computed(() => {
  const list = (admin.value?.per_team || []).slice().sort((a, b) => (b.active || 0) - (a.active || 0)).slice(0, 6)
  const max = Math.max(1, ...list.map(t => t.active || 0))
  return list.map(t => ({
    id: t.team_id, name: t.team_name || '—', active: t.active || 0, pct: Math.round(((t.active || 0) / max) * 100),
    tr: '—', trTone: 'flat',
  }))
})
// Scoreboard drill-down: a team's incident chronology. Timeline is the only sibling that
// accepts a team filter (?team=<id>); critical/list take none — so we thread the real id
// here rather than faking a fuzzy text filter that could read as broken.
const goTeamTimeline = (t) => emit('go', t?.id ? `incidents/timeline?team=${encodeURIComponent(t.id)}` : 'incidents/timeline')

const ladder = computed(() => {
  const e = extras.value?.escalation || {}
  return [
    { lv: 'L1', name: 'First response', note: 'team on-call', ct: e.l1 ?? 0, color: 'var(--sd-fun-resolved)', hot: false },
    { lv: 'L2', name: 'Team lead', note: 'engaged', ct: e.l2 ?? 0, color: 'var(--sd-inc-warn)', hot: false },
    { lv: 'L3', name: 'Incident commander', note: 'active bridge', ct: e.l3 ?? 0, color: 'var(--sd-fun-esc)', hot: (e.l3 ?? 0) > 0 },
  ]
})

const feed = computed(() => (s.value.feed || []).slice(0, 8))
const feedLoop = computed(() => {
  const f = feed.value.map(x => ({
    time: x.at ? new Date(x.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
    text: `${x.ticket_number ? x.ticket_number + ' · ' : ''}${x.action || ''}${x.actor ? ' · ' + x.actor : ''}`,
  }))
  return [...f, ...f] // duplicate for seamless marquee
})

/* ── pager ── */
const pages = computed(() => Math.max(1, Math.ceil(total.value / limit)))

/* ── loaders ── */
const loadBrief = async () => {
  try {
    const d = await fetchIncidentCommandDashboard()
    if (d && d.agent) {
      dash.value = d; stats.value = d.agent; admin.value = d.admin || null; extras.value = d.extras || null
      generatedAt.value = d.generated_at ? new Date(d.generated_at).getTime() : Date.now()
    }
  } catch {
    try { stats.value = await fetchIncidentStats(); generatedAt.value = Date.now() } catch { /* keep */ }
  }
  flap.value = false; requestAnimationFrame(() => { flap.value = true })
}

const listParams = () => {
  const [sb, sd] = sortKey.value.split(':')
  const p = { lens: 'active', page: page.value, limit, sort_by: sb, sort_dir: sd }
  if (fSev.value) p.sev = fSev.value
  if (flag.value) p.flag = flag.value
  if (fService.value) p.service = fService.value
  if (q.value.trim()) p.q = q.value.trim()
  return p
}
const loadRows = async () => {
  try {
    const res = await listIncidents(listParams())
    rows.value = (res.items || []).map(normalizeIncidentRow)
    total.value = res.total ?? rows.value.length
    // prune stale selections
    const ids = new Set(rows.value.map(r => r.id))
    selected.value = new Set([...selected.value].filter(id => ids.has(id)))
  } catch { /* keep last */ }
}
const reload = async (silent = true) => {
  if (!silent) loading.value = true
  try { await Promise.all([loadBrief(), loadRows()]) } finally { loading.value = false }
}
const go = (p) => { page.value = Math.min(pages.value, Math.max(1, p)); loadRows() }

/* ── filters ── */
const setFlag = (k) => { flag.value = flag.value === k ? '' : k; page.value = 1; loadRows() }
const setSort = (col) => {
  const dir = sortKey.value === `${col}:desc` ? 'asc' : 'desc'
  sortKey.value = `${col}:${dir}`; page.value = 1; loadRows()
}
const clearFilters = () => { flag.value = ''; fSev.value = ''; fService.value = ''; q.value = ''; page.value = 1; loadRows() }

/* deep-links — the immediate run seeds the filter state before the onMounted reload(false);
   every later query change refetches (the old version set the refs but never reloaded, so a
   mid-session deep-link left the table stale). ?focus is consumed once, not re-fired on
   every subsequent query change. */
let firstQuery = true
let lastFocus = null
watch(() => route.query, (qq) => {
  if (qq.q != null) q.value = String(qq.q)
  if (qq.sev != null && ['1', '2', '3', '4'].includes(String(qq.sev))) fSev.value = String(qq.sev)
  if (qq.service != null) fService.value = String(qq.service)
  if (qq.flag != null) { const fv = String(qq.flag); flag.value = FLAG_KEYS.includes(fv) ? fv : '' }
  else if (qq.lens && FLAG_KEYS.includes(String(qq.lens))) flag.value = String(qq.lens)
  const f = qq.focus ? String(qq.focus) : null
  if (f && f !== lastFocus) { lastFocus = f; emit('open', f) }
  if (!firstQuery) { page.value = 1; loadRows() }
  firstQuery = false
}, { immediate: true })

/* ── selection ── */
const allSel = computed(() => rows.value.length > 0 && rows.value.every(r => selected.value.has(r.id)))
const toggleSel = (id) => { const s2 = new Set(selected.value); s2.has(id) ? s2.delete(id) : s2.add(id); selected.value = s2 }
const toggleAll = () => { selected.value = allSel.value ? new Set() : new Set(rows.value.map(r => r.id)) }
const clearSel = () => { selected.value = new Set() }

/* ── verbs ── */
const rowById = (id) => rows.value.find(r => r.id === id)
const isEscalated = (r) => (r?.escalation_level || 0) > 0 || !!r?.is_escalated
// A verb is enabled only when at least one selected row can legally take it — mirrors the
// backend state guards (escalate 409s an unowned ticket, de-escalate 409s a non-escalated
// one) so the bulk bar never offers an action that would just skip every row.
const selCanEscalate = computed(() => [...selected.value].some(id => rowById(id)?.assigned_agent_id))
const selCanDeEscalate = computed(() => [...selected.value].some(id => isEscalated(rowById(id))))
const bulk = async (action) => {
  let ids = [...selected.value]; if (!ids.length || busy.value) return
  // Drop rows the backend would reject outright, so the skip count reflects genuine
  // races (state changed under us) rather than a structural mismatch.
  if (action === 'escalate') ids = ids.filter(id => rowById(id)?.assigned_agent_id)
  else if (action === 'de-escalate') ids = ids.filter(id => isEscalated(rowById(id)))
  if (!ids.length) { toast.info(`No selected incidents are eligible to ${action.replace('-', ' ')}`); return }
  busy.value = true
  let ok = 0
  for (const id of ids) {
    try {
      if (action === 'ack') await ackTicket(id)
      else if (action === 'escalate') await escalateTicket(id, { reason: 'Bulk escalation · Situation Room' })
      else if (action === 'de-escalate') await deEscalateTicket(id, { reason: 'Bulk de-escalation · Situation Room' })
      ok++
    } catch { /* skip ineligible */ }
  }
  busy.value = false
  toast[ok ? 'success' : 'info'](`${action} · ${ok}/${ids.length} applied${ok < ids.length ? ` (${ids.length - ok} skipped)` : ''}`)
  clearSel(); reload()
}
const openAssign = (r) => { assignTarget.value = r; assignOpen.value = true }
const onAssigned = () => { assignOpen.value = false; reload() }
const rowEscalate = async (r) => {
  // Backend 409s an escalate on an unowned incident — pre-empt so the disabled button's
  // intent is never bypassed (e.g. via a keyboard trigger).
  if (!r.assigned_agent_id) { toast.info('Assign an owner before escalating this incident'); return }
  try { await escalateTicket(r.id, { reason: 'Escalated from Situation Room' }); toast.success(`${r.ticket_number} escalated`); reload() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Escalation failed') }
}
const toBridge = (r) => {
  const href = warRoomHref(r.war_room_url, props.panel)
  if (!href) return
  if (/^https?:/.test(href)) window.open(href, '_blank', 'noopener')
  else router.push(href)
}

/* ── sla helpers ── */
const slaBreached = (r) => r.sla_resolution_breached || r.sla_response_breached
const slaTone = (r) => {
  if (slaBreached(r)) return 'brk'
  if (r.sla_paused_since || !r.resolution_due_at) return 'idle'
  const mins = (new Date(r.resolution_due_at).getTime() - now.value) / 60000
  return mins <= 240 ? 'hot' : 'ok'
}
const slaLabel = (r) => {
  if (slaBreached(r)) return 'BREACHED'
  if (r.sla_paused_since) return 'PAUSED'
  if (!r.resolution_due_at) return 'NO SLA'
  const mins = (new Date(r.resolution_due_at).getTime() - now.value) / 60000
  return mins <= 0 ? 'DUE' : mins <= 240 ? 'AT RISK' : 'ON TRACK'
}
const slaRemain = (r) => {
  if (slaBreached(r) || !r.resolution_due_at || r.sla_paused_since) return ''
  const mins = (new Date(r.resolution_due_at).getTime() - now.value) / 60000
  if (mins <= 0) return 'overdue'
  return mins < 60 ? `${Math.round(mins)}m` : mins < 2880 ? `${Math.floor(mins / 60)}h` : `${Math.floor(mins / 1440)}d`
}
const slaPct = (r) => {
  if (slaBreached(r)) return 100
  if (!r.resolution_due_at || !r.created_at) return 8
  const start = new Date(r.created_at).getTime(), due = new Date(r.resolution_due_at).getTime()
  if (due <= start) return 100
  return Math.max(4, Math.min(100, Math.round(((now.value - start) / (due - start)) * 100)))
}

/* ── misc fmt ── */
const ini = (name) => (name ? name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() : '–')
const fmtUsers = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K users` : `${n} users`)
const age = (iso) => {
  if (!iso) return '—'
  const mins = (now.value - new Date(iso).getTime()) / 60000
  if (mins < 60) return `${Math.max(0, Math.round(mins))}m`
  if (mins < 1440) return `${Math.floor(mins / 60)}h${String(Math.floor(mins % 60)).padStart(2, '0')}`
  return `${Math.floor(mins / 1440)}d`
}

onMounted(() => {
  reload(false)
  tick = setInterval(() => { now.value = Date.now() }, 1000)
  poll = setInterval(() => { if (document.visibilityState === 'visible') reload(true) }, 60000)
})
onBeforeUnmount(() => { clearInterval(tick); clearInterval(poll) })
</script>

<style scoped>
.isb { display: flex; flex-direction: column; gap: 14px; }
.sd-card { background: var(--sd-surface); border: 1px solid var(--sd-border); }

/* ── BRIEF ── */
.brief { position: relative; overflow: hidden; border-radius: 24px; padding: 22px 26px;
  background:
    radial-gradient(120% 130% at 78% -20%, var(--sd-fun-soft), transparent 55%),
    linear-gradient(160deg, var(--sd-fun-stage), color-mix(in srgb, var(--sd-fun-stage) 78%, var(--sd-canvas)));
  border: 1px solid var(--sd-fun-brd); }
.brief-sweep { position: absolute; inset: 0; pointer-events: none;
  background: conic-gradient(from 0deg at 82% 26%, transparent 0deg, color-mix(in srgb, var(--sd-fun-core) 12%, transparent) 32deg, transparent 64deg);
  animation: isb-sweep 7s linear infinite; }
@keyframes isb-sweep { to { transform: rotate(360deg); } }

.dateline { position: relative; display: flex; align-items: center; gap: 14px; padding-bottom: 12px;
  margin-bottom: 16px; border-bottom: 1px solid var(--sd-border);
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; }
.dl-m { color: var(--sd-fun-core); }
.dl-t { color: var(--sd-text-secondary); }
.dl-scope { margin-left: auto; color: var(--sd-text-muted); }
.dl-live { display: inline-flex; align-items: center; gap: 6px; color: var(--sd-fun-resolved); }
.dl-live i { width: 6px; height: 6px; border-radius: 50%; background: var(--sd-fun-resolved);
  box-shadow: 0 0 8px var(--sd-fun-resolved); animation: isb-blip 1.4s infinite; }
@keyframes isb-blip { 50% { opacity: 0.35; } }

.lede { position: relative; display: grid; grid-template-columns: 1.35fr 1fr; gap: 28px; align-items: center; }
.lede-h { margin: 0; font-size: clamp(22px, 2.9vw, 38px); font-weight: 300; line-height: 1.05;
  letter-spacing: -0.03em; color: var(--sd-text); }
.lede-h em { font-style: normal; font-weight: 800; background: var(--sd-fun-grad);
  -webkit-background-clip: text; background-clip: text; color: transparent; }
.lede-h b.brk { color: var(--sd-fun-esc); font-weight: 800; }
.lede-p { margin: 12px 0 0; font-size: 12.5px; line-height: 1.55; color: var(--sd-text-secondary); max-width: 54ch; }
.lanes { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 14px; }
.lane { display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px; border-radius: 20px;
  font-size: 10.5px; font-weight: 700; cursor: pointer; background: var(--sd-surface);
  border: 1px solid var(--sd-border); color: var(--sd-text-secondary); transition: all 0.22s var(--sd-spring); }
.lane:hover { color: var(--sd-text); border-color: var(--sd-fun-brd); }
.lane.on { color: var(--sd-fun-core); background: var(--sd-fun-soft); border-color: var(--sd-fun-brd); }
.lane.hot b { color: var(--sd-fun-esc); }
.lane b { font-size: 9px; opacity: 0.85; }

/* split-flap */
.board { display: flex; gap: 16px; justify-content: flex-end; }
.flapg { text-align: center; }
.flaps { display: flex; gap: 5px; }
.digit { position: relative; width: 40px; height: 58px; border-radius: 9px; overflow: hidden;
  font-family: var(--sd-mono); font-size: 38px; font-weight: 800; line-height: 58px; text-align: center;
  color: var(--c, var(--sd-text));
  background: linear-gradient(180deg, var(--sd-surface-elevated), var(--sd-surface));
  border: 1px solid var(--sd-border); box-shadow: 0 8px 20px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.06); }
.digit::after { content: ""; position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: rgba(0,0,0,0.4); z-index: 3; }
.digit.flip { animation: isb-flap 0.5s var(--sd-spring); }
@keyframes isb-flap { 0% { transform: rotateX(0); } 45% { transform: rotateX(-18deg); } 100% { transform: rotateX(0); } }
.flap-l { display: block; margin-top: 10px; font-size: 9px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }

/* KPI wall */
.kwall { display: grid; grid-template-columns: repeat(6, 1fr); gap: 1px; margin-top: 18px;
  border-radius: 14px; overflow: hidden; border: 1px solid var(--sd-border); background: var(--sd-border); }
.kw { position: relative; overflow: hidden; padding: 12px 14px; text-align: left; cursor: pointer;
  background: var(--sd-surface); border: 0; transition: background 0.25s; }
.kw:hover { background: var(--sd-surface-elevated); }
.kw-l { display: block; font-size: 8.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--sd-text-muted); }
.kw-v { display: block; margin-top: 9px; font-size: 24px; font-weight: 800; letter-spacing: -0.03em; color: var(--sd-text); }
.kw-v small { font-size: 11px; color: var(--sd-text-muted); font-weight: 600; margin-left: 2px; }
.kw-v.am { color: var(--sd-inc-warn); } .kw-v.dn { color: var(--sd-fun-esc); }
.kw-d { display: block; margin-top: 6px; font-size: 9px; font-weight: 700; color: var(--sd-text-muted); }
.kw-d.up { color: var(--sd-fun-resolved); } .kw-d.dn { color: var(--sd-fun-esc); } .kw-d.am { color: var(--sd-inc-warn); }
.kw::after { content: ""; position: absolute; left: 0; bottom: 0; height: 2px; width: var(--w, 60%); background: var(--sd-fun-grad); opacity: 0.6; }

/* ── INTEL ── */
.intel { display: grid; grid-template-columns: 1.35fr 1fr; gap: 14px; }
.panel { border-radius: 18px; padding: 16px 18px; }
.p-h { display: flex; align-items: center; gap: 8px; margin: 0 0 14px; font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.13em; text-transform: uppercase; color: var(--sd-text-muted); }
.p-h .p-c { margin-left: auto; color: var(--sd-fun-core); font-size: 9px; letter-spacing: 0.04em; text-transform: none; }
.p-empty { font-size: 11px; color: var(--sd-text-muted); }
.sbwrap { display: flex; flex-direction: column; }
.sb { display: flex; align-items: center; gap: 11px; padding: 7px 0; border: 0; background: none; cursor: pointer;
  border-bottom: 1px solid var(--sd-border); text-align: left; }
.sb:last-child { border-bottom: 0; }
.sb-rk { font-size: 12px; font-weight: 800; color: var(--sd-text-muted); width: 16px; }
.sb-nm { font-size: 12px; font-weight: 700; color: var(--sd-text); width: 84px; }
.sb-track { flex: 1; height: 7px; border-radius: 7px; background: var(--sd-border); overflow: hidden; }
.sb-track i { display: block; height: 100%; border-radius: 7px; background: var(--sd-fun-grad); transition: width 1s var(--sd-spring); }
.sb.crit .sb-track i { background: linear-gradient(90deg, var(--sd-inc-warn), var(--sd-fun-esc)); }
.sb-n { font-size: 13px; font-weight: 800; color: var(--sd-text); width: 24px; text-align: right; }
.sb-tr { font-size: 9px; font-weight: 700; width: 26px; text-align: right; color: var(--sd-text-muted); }
.ribbon { display: flex; flex-direction: column; justify-content: center; height: 100%; }
.rung { position: relative; display: flex; align-items: center; gap: 12px; padding: 9px 0; border: 0; background: none; cursor: pointer; text-align: left; }
.rung + .rung::before { content: ""; position: absolute; left: 17px; top: -9px; height: 18px; width: 2px; background: var(--sd-border); }
.rung-n { width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center; font-size: 13px; font-weight: 800;
  background: var(--sd-surface-elevated); border: 1px solid var(--sd-border); color: var(--sd-text-secondary); z-index: 2; }
.rung.hot .rung-n { background: var(--sd-fun-grad); color: #1a1206; border: 0; box-shadow: 0 0 0 5px var(--sd-fun-soft); }
.rung-c { display: flex; flex-direction: column; gap: 4px; }
.rung-c b { font-size: 13px; font-weight: 700; color: var(--sd-text); }
.rung-c i { font-style: normal; font-size: 9px; font-family: var(--sd-mono); color: var(--sd-text-muted); }
.rung-ct { margin-left: auto; font-size: 18px; font-weight: 800; }

/* ── OPS ── */
.opslab { display: flex; align-items: center; gap: 10px; margin: 6px 2px 2px; font-size: 10px; font-weight: 800;
  letter-spacing: 0.2em; text-transform: uppercase; color: var(--sd-fun-core); }
.opslab::after { content: ""; flex: 1; height: 1px; background: linear-gradient(90deg, var(--sd-fun-brd), transparent); }

.ops-tools { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.bar-q { display: flex; align-items: center; gap: 7px; padding: 8px 12px; border-radius: 20px; flex: 1; min-width: 200px;
  background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text-muted); }
.bar-q input { flex: 1; width: 100%; background: none; border: 0; outline: 0; color: var(--sd-text); font-size: 12px; font-family: inherit; }
.bar-btn { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; cursor: pointer;
  background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text-muted); }
.bar-btn:hover { color: var(--sd-fun-core); border-color: var(--sd-fun-brd); }
.spin { animation: sd-spin-slow 1.1s linear infinite; }

.bulkbar { display: flex; align-items: center; gap: 9px; padding: 11px 16px; border-radius: 16px;
  background: linear-gradient(120deg, var(--sd-fun-soft), var(--sd-surface)); border: 1px solid var(--sd-fun-brd); }
.bb-sel { font-size: 12px; font-weight: 700; color: var(--sd-fun-core); }
.bb-sel b { display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; margin-right: 6px;
  background: var(--sd-fun-core); color: #1a1206; }
.bv { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 10px; cursor: pointer;
  font-size: 11px; font-weight: 700; background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text-secondary);
  transition: all 0.22s var(--sd-spring); }
.bv:hover:not(:disabled) { color: var(--sd-text); border-color: var(--sd-fun-brd); transform: translateY(-1px); }
.bv:disabled { opacity: 0.5; cursor: default; }
.bv.ghost { margin-left: auto; }
.bulk-enter-active, .bulk-leave-active { transition: all 0.35s var(--sd-spring); }
.bulk-enter-from, .bulk-leave-to { opacity: 0; transform: translateY(-8px); }

/* table */
.tablewrap { border-radius: 20px; overflow: hidden; }
.thead, .row { display: grid; grid-template-columns: 34px 74px 1.7fr 1.15fr 96px 1fr 1.15fr 68px 56px; gap: 10px; align-items: center; }
.thead { padding: 12px 18px; border-bottom: 1px solid var(--sd-border);
  font-size: 9px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--sd-text-muted); }
.thead .s { cursor: pointer; transition: color 0.2s; } .thead .s:hover { color: var(--sd-text); } .thead .s.act { color: var(--sd-fun-core); }
.thead .s.ns { cursor: default; } .thead .s.ns:hover { color: var(--sd-text-muted); }
.th-ck, .ck { display: grid; place-items: center; width: 18px; height: 18px; border-radius: 6px; cursor: pointer;
  background: none; border: 1.5px solid var(--sd-border); color: transparent; transition: all 0.2s; }
.th-ck.on, .ck.on { background: var(--sd-fun-core); border-color: var(--sd-fun-core); color: #1a1206; }
.th-cols { margin-left: auto; text-align: right; }
.tbody { display: block; }
.row { padding: 13px 18px; border-bottom: 1px solid var(--sd-border); cursor: pointer; position: relative;
  transition: background 0.22s; animation: sd-fade-up 0.5s var(--sd-spring) both; animation-delay: calc(var(--i) * 0.04s); }
.row:last-child { border-bottom: 0; }
.row::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--sev-c); opacity: 0.85; transition: all 0.3s; }
.row:hover { background: var(--sd-surface-elevated); }
.row:hover::before { width: 5px; }
.row.sev1 { --sev-c: var(--sd-fun-esc); } .row.sev2 { --sev-c: #ff8a3c; }
.row.sev3 { --sev-c: var(--sd-inc-warn); } .row.sev4 { --sev-c: var(--sd-text-muted); }
.c-sev { display: flex; align-items: center; gap: 8px; font-size: 10.5px; font-weight: 800; color: var(--sev-c); }
.led { width: 9px; height: 9px; border-radius: 50%; background: var(--sev-c); box-shadow: 0 0 10px var(--sev-c); animation: sd-inc-led 1.8s infinite; }
.led.s1 { animation-duration: 0.9s; }
.c-inc .num { font-size: 11.5px; font-weight: 700; color: var(--sd-text-muted); }
.c-inc .subj { display: flex; align-items: center; gap: 7px; margin-top: 5px; font-size: 13px; font-weight: 600; color: var(--sd-text); line-height: 1.3; }
.mi { font-size: 8px; font-weight: 800; letter-spacing: 0.06em; padding: 3px 6px; border-radius: 5px; background: var(--sd-fun-esc); color: #fff; box-shadow: 0 0 12px var(--sd-fun-esc-soft); }
.c-inc .meta { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 6px; font-size: 9.5px; color: var(--sd-text-muted); }
.c-inc .meta i { font-style: normal; } .c-inc .meta .ok { color: var(--sd-fun-resolved); } .c-inc .meta .bad { color: var(--sd-fun-esc); }
.svc-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.chip { font-size: 9.5px; font-weight: 600; padding: 4px 7px; border-radius: 6px; background: var(--sd-surface-elevated); border: 1px solid var(--sd-border); color: var(--sd-text-secondary); }
.chip.dim { color: var(--sd-text-muted); }
.blast { display: inline-flex; align-items: center; gap: 5px; margin-top: 5px; font-size: 9px; color: var(--sd-inc-warn); }
.blast .r { width: 5px; height: 5px; border-radius: 50%; background: var(--sd-inc-warn); box-shadow: 0 0 0 4px var(--sd-inc-warn-soft); }
.c-roster { display: flex; align-items: center; }
.av { display: grid; place-items: center; width: 25px; height: 25px; border-radius: 50%; margin-left: -8px; font-size: 8.5px; font-weight: 800;
  color: #1a1206; border: 2px solid var(--sd-surface); }
.av:first-child { margin-left: 0; }
.av.cmdr { background: var(--sd-fun-grad); } .av.comms { background: linear-gradient(135deg, #7cc7ff, #5aa0e0); }
.av.ops { background: linear-gradient(135deg, var(--sd-fun-resolved), #1fae7a); }
.av.none { background: transparent; border: 1.5px dashed var(--sd-fun-esc); color: var(--sd-fun-esc); }
.c-team .tn { font-size: 11.5px; font-weight: 600; color: var(--sd-text-secondary); }
.c-team .tm { display: block; margin-top: 5px; font-size: 8.5px; color: var(--sd-text-muted); }
.c-sla .bar { height: 6px; border-radius: 6px; background: var(--sd-border); overflow: hidden; }
.c-sla .fill { height: 100%; border-radius: 6px; transition: width 0.9s var(--sd-spring); position: relative;
  background: linear-gradient(90deg, var(--sd-fun-resolved), var(--sd-inc-warn)); }
.c-sla .fill.hot { background: linear-gradient(90deg, var(--sd-inc-warn), var(--sd-fun-esc)); }
.c-sla .fill.brk { background: linear-gradient(90deg, var(--sd-fun-esc), #ff2d1a); }
.c-sla .fill.idle { background: var(--sd-text-muted); opacity: 0.4; }
.c-sla .lab { display: flex; justify-content: space-between; margin-top: 6px; font-size: 9px; color: var(--sd-text-muted); }
.c-sla .lab .t.ok { color: var(--sd-fun-resolved); } .c-sla .lab .t.hot { color: var(--sd-inc-warn); } .c-sla .lab .t.brk { color: var(--sd-fun-esc); }
.c-age { font-size: 11px; font-weight: 700; color: var(--sd-text-secondary); text-align: right; }
.c-acts { display: flex; gap: 5px; justify-content: flex-end; opacity: 0; transform: translateX(6px); transition: all 0.3s var(--sd-spring); }
.row:hover .c-acts { opacity: 1; transform: none; }
.a { display: grid; place-items: center; width: 27px; height: 27px; border-radius: 9px; cursor: pointer;
  background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text-muted); transition: all 0.22s; }
.a:hover:not(:disabled) { color: var(--sd-fun-core); border-color: var(--sd-fun-brd); transform: translateY(-2px); }
.a:disabled { opacity: 0.32; cursor: not-allowed; }

.row-enter-active { transition: all 0.4s var(--sd-spring); } .row-enter-from { opacity: 0; transform: translateY(10px); }
.row-leave-active { transition: all 0.2s ease; opacity: 0; } .row-move { transition: transform 0.4s var(--sd-spring); }

.empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 44px 20px; color: var(--sd-text-muted); }
.empty p { margin: 0; font-size: 12px; }
.pager { display: flex; align-items: center; gap: 12px; padding: 12px 18px; border-top: 1px solid var(--sd-border); font-size: 11px; color: var(--sd-text-secondary); }
.pg { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; cursor: pointer; background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text); }
.pg:disabled { opacity: 0.4; cursor: default; } .pg-tot { margin-left: auto; color: var(--sd-text-muted); }

/* ticker */
.ticker { display: flex; align-items: center; height: 42px; border-radius: 12px; overflow: hidden; padding: 0; }
.tk-l { flex: 0 0 auto; display: grid; place-items: center; height: 100%; padding: 0 15px; font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.14em; background: var(--sd-fun-grad); color: #1a1206; }
.tk-track { flex: 1; overflow: hidden; position: relative; height: 100%; }
.tk-run { position: absolute; display: flex; align-items: center; gap: 32px; height: 100%; white-space: nowrap; padding-left: 100%;
  font-size: 11.5px; color: var(--sd-text-secondary); animation: isb-run 34s linear infinite; }
.tk-run.paused { animation: none; padding-left: 20px; }
.tk-run b { color: var(--sd-fun-core); font-size: 9.5px; margin-right: 8px; }
.tk-i { display: inline-flex; align-items: baseline; }
@keyframes isb-run { to { transform: translateX(-100%); } }
.tk-jumps { flex: 0 0 auto; display: flex; align-items: center; height: 100%; }
.tk-j { padding: 0 13px; height: 100%; background: none; border: 0; border-left: 1px solid var(--sd-border);
  cursor: pointer; font-size: 10px; font-weight: 700; color: var(--sd-text-muted); transition: color 0.2s; white-space: nowrap; }
.tk-j:hover { color: var(--sd-fun-core); }

@media (max-width: 1200px) {
  .lede, .intel { grid-template-columns: 1fr; }
  .kwall { grid-template-columns: repeat(3, 1fr); }
  .board { justify-content: flex-start; }
  .thead, .row { grid-template-columns: 34px 60px 1.6fr 1fr 84px 68px 56px; }
  .thead .s:nth-child(6), .c-team, .c-sla, .thead .s:nth-child(7) { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .brief-sweep,
  html:not([data-cinematic="on"]) .spin,
  html:not([data-cinematic="on"]) .row,
  html:not([data-cinematic="on"]) .led,
  html:not([data-cinematic="on"]) .tk-run,
  html:not([data-cinematic="on"]) .digit.flip,
  html:not([data-cinematic="on"]) .dl-live i { animation: none !important; }
}
</style>
