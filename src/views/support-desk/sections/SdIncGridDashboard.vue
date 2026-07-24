<template>
  <div class="igd">
    <!-- ═══ agents-only gate (self-service employees) ═══ -->
    <Motion v-if="gated" as="section" class="igd-gate sd-card"
      :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, ease: EASE }">
      <span class="gate-glyph"><ShieldAlert :size="26" /></span>
      <h2>Incident command is a responder desk</h2>
      <p>The Fault Grid is for support agents coordinating live incidents. If something's broken
        for you, raise a ticket — the desk will route it and keep you posted.</p>
      <Motion as="button" class="gate-cta" :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.96 }"
        @click="$emit('new')"><Plus :size="15" /> Raise a ticket</Motion>
    </Motion>

    <template v-else>
      <!-- ═══════════════════ HERO — THE SITUATION DECK ═══════════════════ -->
      <div class="igd-hero-row">
        <Motion as="section" class="hero-lead" :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.6, ease: EASE }">
          <span class="hero-grain" aria-hidden="true" />
          <span class="hero-orb breath" aria-hidden="true" />
          <div class="hero-top">
            <span class="hero-eyebrow"><Zap :size="12" /> FAULT GRID · SITUATION DECK</span>
            <span class="scope-chip" :class="{ all: isSuper }">
              <i /> {{ isSuper ? 'ALL TEAMS' : 'YOUR TEAM' }}
            </span>
          </div>
          <h1 class="hero-title">
            <template v-if="(stats?.by_sev?.sev1 || 0) > 0">{{ stats.by_sev.sev1 }} blackout{{ stats.by_sev.sev1 > 1 ? 's' : '' }} in progress.<br><em>One is bleeding SLA.</em></template>
            <template v-else-if="(stats?.active_total || 0) > 0">{{ stats.active_total }} live fault{{ stats.active_total > 1 ? 's' : '' }} on the grid.<br><em>Crews responding.</em></template>
            <template v-else>The grid <em>holds</em>.</template>
          </h1>
          <p class="hero-sub">{{ postureLine }}</p>
          <div class="hero-ctas">
            <Motion as="button" class="cta primary" :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.96 }"
              @click="$emit('new')"><Siren :size="14" /> Declare Incident</Motion>
            <Motion as="button" class="cta ghost" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }"
              @click="goTab('major')"><Radio :size="14" /> War Rooms <b v-if="warRooms">{{ warRooms }}</b></Motion>
            <Motion as="button" class="cta ghost" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }"
              @click="refresh(false)"><RefreshCw :size="14" :class="{ spin: loading }" /> Refresh</Motion>
          </div>
        </Motion>

        <!-- priority spotlight — the worst live fault -->
        <Motion as="section" class="spot" :class="{ empty: !spotlight }"
          :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.6, delay: 0.08, ease: EASE }">
          <template v-if="spotlight">
            <span class="spot-glow" aria-hidden="true" />
            <div class="spot-flag" :class="sevTone(spotlight.sev)">
              <i /> SEV{{ spotlight.sev }} · PRIORITY SPOTLIGHT
            </div>
            <h3 class="spot-title" @click="openTicket(spotlight.id)">{{ spotlight.subject }}</h3>
            <div class="spot-meta sd-mono">
              <span>{{ spotlight.ticket_number }}</span>
              <span v-if="spotlight.incident_commander_name">CMDR <b>{{ spotlight.incident_commander_name }}</b></span>
              <span v-else class="bad">NO CMDR</span>
              <span v-if="spotlight.war_room_url">war room <b>live</b></span>
              <span v-if="(spotlight.affected_services || []).length"><b>{{ spotlight.affected_services.length }}</b> svc</span>
            </div>
            <div class="spot-clock">
              <span class="t sd-mono" :class="slaTone(spotlight)">{{ countdown(spotlight.resolution_due_at) }}</span>
              <span class="lbl">to resolution SLA</span>
            </div>
            <div class="spot-bar"><i :class="slaTone(spotlight)" :style="{ width: slaPct(spotlight) + '%' }" /></div>
            <div class="spot-verbs">
              <button class="vb solid" @click="openTicket(spotlight.id)">{{ spotlight.acknowledged_at ? 'Post update' : 'Acknowledge' }}</button>
              <button class="vb" v-if="spotlight.war_room_url" @click="openWar(spotlight)">Join bridge</button>
              <button class="vb" @click="openTicket(spotlight.id)">Open</button>
            </div>
          </template>
          <template v-else>
            <div class="spot-clear"><Gauge :size="26" /><b>Grid clear</b><span>No live faults on your desk.</span></div>
          </template>
        </Motion>
      </div>

      <!-- ═══ 8 telemetry lenses ═══ -->
      <div class="lenses">
        <Motion v-for="(l, i) in lenses" :key="l.key" as="button" class="lens" :class="[l.tone, { dim: !l.value }]"
          :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.4, delay: 0.12 + i * 0.04, ease: EASE }"
          :whileHover="{ y: -3, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="l.go()">
          <span class="lens-ic"><component :is="l.icon" :size="14" /></span>
          <span class="lens-val sd-mono">{{ l.value }}</span>
          <span class="lens-lbl">{{ l.label }}</span>
          <i class="lens-bar" aria-hidden="true" />
        </Motion>
      </div>

      <!-- ═══ BODY: pulse + board  |  service + debt/aging/escalation/responder/sla/quality ═══ -->
      <div class="igd-body">
        <div class="col-main">
          <!-- desk pulse -->
          <Motion as="section" class="sd-card card" :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.5, delay: 0.14, ease: EASE }">
            <header class="ch"><TrendingUp :size="14" /><h3>Desk pulse · 14-day flow</h3>
              <span class="live sd-mono"><i />LIVE</span></header>
            <svg class="pulse" viewBox="0 0 560 120" preserveAspectRatio="none" aria-hidden="true">
              <polyline class="p-in" :points="pulsePts.created" />
              <polyline class="p-out" :points="pulsePts.resolved" />
              <circle v-for="(m, i) in pulseBreaches" :key="i" class="p-brc" :cx="m" cy="8" r="3.5" />
            </svg>
            <footer class="ch-foot sd-mono">
              <span>+{{ stats?.new_today ?? 0 }} today</span>
              <span class="ok">−{{ stats?.resolved_today ?? 0 }} restored</span>
              <span v-if="stats?.mttr_trend_pct != null" :class="stats.mttr_trend_pct <= 0 ? 'ok' : 'bad'">
                MTTR {{ stats.mttr_trend_pct > 0 ? '+' : '' }}{{ stats.mttr_trend_pct }}% m/m</span>
              <span>MTTA {{ mm(stats?.mtta_minutes_30d) }}</span>
            </footer>
          </Motion>

          <!-- active board -->
          <Motion as="section" class="sd-card card" :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.5, delay: 0.2, ease: EASE }">
            <header class="ch"><Activity :size="14" /><h3>Active faults · worst first</h3>
              <span class="live sd-mono"><i />{{ rows.length }}</span></header>
            <ul class="rows-list">
              <li v-for="r in boardRows" :key="r.id">
                <button class="row" @click="openTicket(r.id)">
                  <SdIncSevBadge :sev="r.sev" />
                  <span class="no sd-mono">{{ shortNo(r.ticket_number) }}</span>
                  <span class="rb">
                    <span class="rs">{{ r.subject }}</span>
                    <span class="rm sd-mono">{{ microStatus(r) }}</span>
                  </span>
                  <span class="sla sd-mono" :class="slaTone(r)">{{ countdown(r.resolution_due_at) }}</span>
                </button>
              </li>
              <li v-if="!boardRows.length" class="empty">No active faults on your desk.</li>
            </ul>
          </Motion>
        </div>

        <div class="col-side">
          <!-- load by service -->
          <Motion as="section" class="sd-card card" :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.5, delay: 0.16, ease: EASE }">
            <header class="ch"><Server :size="14" /><h3>Load by service</h3></header>
            <div v-if="(stats?.top_services || []).length" class="svc-list">
              <button v-for="s in stats.top_services" :key="s.service" class="svc"
                @click="goTab('active', { service: s.service })">
                <span class="svc-name">{{ s.service }}</span>
                <span class="svc-rail"><i :class="{ hot: s.sev12 > 0 }" :style="{ width: (s.count / maxSvc * 100) + '%' }" /></span>
                <span class="svc-n sd-mono">{{ s.open }}<i class="dim">/{{ s.count }}</i></span>
              </button>
            </div>
            <p v-else class="empty">No affected services recorded — stamp them from a drawer's Impact panel.</p>
          </Motion>

          <!-- SLA burn + next breach -->
          <Motion as="section" class="sd-card card" :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.5, delay: 0.2, ease: EASE }">
            <header class="ch"><Gauge :size="14" /><h3>SLA burn-down</h3></header>
            <div class="burn">
              <div class="bl"><span class="k">Met</span><span class="t"><i class="ok" :style="{ width: slaSplit.met + '%' }" /></span><span class="v sd-mono">{{ slaSplit.met }}%</span></div>
              <div class="bl"><span class="k">At-risk</span><span class="t"><i class="warn" :style="{ width: slaSplit.risk + '%' }" /></span><span class="v sd-mono">{{ slaSplit.risk }}%</span></div>
              <div class="bl"><span class="k">Breached</span><span class="t"><i class="bad" :style="{ width: slaSplit.brc + '%' }" /></span><span class="v sd-mono">{{ slaSplit.brc }}%</span></div>
            </div>
            <div v-if="extras?.next_breach?.minutes != null" class="next-breach sd-mono">
              NEXT BREACH IN <b>{{ minLabel(extras.next_breach.minutes) }}</b>
              <span v-if="extras.next_breach.ticket_number"> · {{ extras.next_breach.ticket_number }}</span>
            </div>
          </Motion>

          <!-- escalation + responder load -->
          <Motion as="section" class="sd-card card" :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.5, delay: 0.24, ease: EASE }">
            <header class="ch"><Flame :size="14" /><h3>Escalation · responders</h3></header>
            <div class="esc">
              <div class="tier l1"><span class="tg">L1</span><span class="bar"><i :style="{ width: tierPct(esc.l1) + '%' }" /></span><span class="c sd-mono">{{ esc.l1 }}</span></div>
              <div class="tier l2"><span class="tg">L2</span><span class="bar"><i :style="{ width: tierPct(esc.l2) + '%' }" /></span><span class="c sd-mono">{{ esc.l2 }}</span></div>
              <div class="tier l3"><span class="tg">L3</span><span class="bar"><i :style="{ width: tierPct(esc.l3) + '%' }" /></span><span class="c sd-mono">{{ esc.l3 }}</span></div>
            </div>
            <div v-if="responders.length" class="resp">
              <div v-for="r in responders" :key="r.name" class="rp">
                <span class="av">{{ initials(r.name) }}</span>
                <span class="nm">{{ r.name }}<span class="sd-mono">SEV1 {{ r.sev1 }} · SEV2 {{ r.sev2 }}</span></span>
                <span class="ld sd-mono" :class="{ hot: r.unacked > 0 }">{{ r.unacked }} unack</span>
              </div>
            </div>
          </Motion>

          <!-- review debt + aging + quality -->
          <Motion as="section" class="sd-card card" :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.5, delay: 0.28, ease: EASE }">
            <header class="ch"><SearchCheck :size="14" /><h3>Review debt · quality</h3></header>
            <div class="debt">
              <button class="dc" :class="{ hot: (stats?.missing_rca || 0) > 0 }" @click="goTab('rca')">
                <span class="n sd-mono">{{ stats?.missing_rca ?? 0 }}</span><span class="l">criticals missing RCA (30d)</span><ArrowRight :size="13" /></button>
              <button class="dc" :class="{ hot: (stats?.pir?.missing || 0) > 0 }" @click="goTab('post-incident')">
                <span class="n sd-mono">{{ stats?.pir?.missing ?? 0 }}</span><span class="l">majors without a PIR</span><ArrowRight :size="13" /></button>
              <button class="dc" @click="goTab('post-incident')">
                <span class="n sd-mono">{{ stats?.pir?.in_review ?? 0 }}</span><span class="l">PIRs awaiting review</span><ArrowRight :size="13" /></button>
            </div>
            <div class="qrow">
              <div class="q"><span class="qv sd-mono gold">{{ extras?.quality?.csat_avg != null ? extras.quality.csat_avg.toFixed(1) : '—' }}</span><span class="ql">CSAT</span></div>
              <div class="q"><span class="qv sd-mono">{{ extras?.quality?.reopen_rate_pct != null ? extras.quality.reopen_rate_pct + '%' : '—' }}</span><span class="ql">Reopen</span></div>
              <div class="q"><span class="qv sd-mono">{{ agingHot }}</span><span class="ql">Aging &gt;4h</span></div>
              <div class="q"><span class="qv sd-mono">{{ tasksPct }}%</span><span class="ql">Playbook</span></div>
            </div>
          </Motion>
        </div>
      </div>

      <footer class="igd-foot sd-mono">
        <span>{{ isSuper ? 'Whole desk' : 'Team-sealed · your squad' }}</span>
        <span class="ok">+{{ stats?.new_today ?? 0 }} raised / −{{ stats?.resolved_today ?? 0 }} restored today</span>
        <span>MTTR {{ mm(stats?.mttr_minutes_current_month) }} · MTTD {{ mm(stats?.mttd_minutes_30d) }}</span>
        <span v-if="err" class="bad">⚠ {{ err }}</span>
      </footer>
    </template>
  </div>
</template>

<script setup>
/*
  SdIncGridDashboard — AGENT incident command dashboard, "THE SITUATION DECK".
  Editorial posture hero + a glowing priority-spotlight on the single worst live fault
  (live SLA countdown + agent verbs) → 8 telemetry lenses → desk-pulse + worst-first
  active board | load-by-service + SLA burn + escalation/responders + review-debt/quality.
  Team-sealed (a lead sees their squad; superuser = whole desk). ONE sealed rollup call
  (/incidents/command-dashboard → agent+extras) + the active lens window for the board,
  with a graceful fallback to /incidents/stats. 60s visibility+ungated silent re-poll.
*/
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Motion } from 'motion-v'
import {
  Zap, Siren, Radio, RefreshCw, Plus, ShieldAlert, TrendingUp, Server, Activity,
  SearchCheck, ArrowRight, AlarmClock, ShieldOff, Flame, Gauge,
} from 'lucide-vue-next'
import SdIncSevBadge from '../components/SdIncSevBadge.vue'
import {
  fetchIncidentCommandDashboard, fetchIncidentStats, listIncidents, isAtRisk,
} from '@/composables/useSupportDesk'

const EASE = [0.16, 1, 0.3, 1]
const props = defineProps({
  panel: { type: String, default: 'admin' },
  agentReveal: { type: Boolean, default: false },
})
const emit = defineEmits(['new', 'go', 'open', 'changed'])

const router = useRouter()
const gated = computed(() => props.panel === 'employee' && !props.agentReveal)
const base = computed(() => (props.panel === 'employee' ? '/user/support' : '/admin/support-desk'))
const goTab = (tab, query) => router.push({ path: `${base.value}/incidents/${tab}`, query })

/* reactive reduced-motion (fixes the prior stale one-shot ref) */
const cinematicOn = () => document.documentElement.getAttribute('data-cinematic') === 'on'
const reduced = ref(false)
let mqReduce = null
const syncReduced = () => { reduced.value = !!(mqReduce && mqReduce.matches) && !cinematicOn() }

const stats = ref(null)
const extras = ref(null)
const isSuper = ref(false)
const rows = ref([])
const loading = ref(false)
const err = ref('')
const now = ref(Date.now())
let tick = null
let poll = null

const refresh = async (silent = true) => {
  if (gated.value) return
  if (!silent) loading.value = true
  try {
    let d = null
    try { d = await fetchIncidentCommandDashboard() } catch { d = null }
    if (d && d.agent) {                       // composed endpoint live
      stats.value = d.agent
      extras.value = d.extras || {}
      isSuper.value = !!d.is_superuser
    } else {                                  // fallback: stats-only
      stats.value = await fetchIncidentStats()
      extras.value = extras.value || {}
    }
    const l = await listIncidents({ lens: 'active', limit: 100 })
    rows.value = (l.items || []).map(r => ({ ...r, sev: r.sev ?? (r.is_major_incident ? 1 : r.priority === 'critical' ? 2 : (r.priority === 'urgent' || r.priority === 'high') ? 3 : 4) }))
    err.value = ''
  } catch (e) {
    err.value = 'live data unavailable — showing last good'
  } finally { loading.value = false }
}

/* The agent gate lifts ASYNCHRONOUSLY. On the user panel `agentReveal` starts false and
   flips true only after the workspace's support-agent probe (bootDetect) resolves — which
   happens AFTER this child has already mounted. So onMounted's refresh() gets gated out on
   that first pass and the board sits at all-zeros ("Reading the grid…") until the 60s poll.
   Re-run the fetch the instant the gate lifts so a real agent sees their grid immediately. */
watch(gated, (isGated, wasGated) => {
  if (wasGated && !isGated) refresh(false)
})

/* posture line */
const postureLine = computed(() => {
  const s = stats.value
  if (!s) return 'Reading the grid…'
  const p = [`${s.active_total} active`]
  if (s.by_sev?.sev1) p.push(`${s.by_sev.sev1} blackout`)
  if (s.unacked) p.push(`${s.unacked} unacked`)
  if (s.sla?.breached) p.push(`${s.sla.breached} past SLA`)
  if (s.sla?.at_risk) p.push(`${s.sla.at_risk} at-risk`)
  p.push(`${s.resolved_today} restored today`)
  return p.join(' · ') + '.'
})

/* worst live fault for the spotlight */
const sevRank = (r) => (r.sev || 4) * 1000 - (r.sla_resolution_breached ? 500 : 0)
  + (r.resolution_due_at ? new Date(r.resolution_due_at).getTime() / 1e11 : 9)
const boardRows = computed(() => [...rows.value].sort((a, b) => sevRank(a) - sevRank(b)).slice(0, 8))
const spotlight = computed(() => boardRows.value[0] || null)

const warRooms = computed(() => extras.value?.war_rooms ?? rows.value.filter(r => r.war_room_url).length)

/* lenses */
const lenses = computed(() => {
  const s = stats.value || {}
  const by = s.by_sev || {}
  return [
    { key: 'active', label: 'Active', value: s.active_total ?? 0, icon: Zap, tone: '', go: () => goTab('active') },
    { key: 'sev1', label: 'SEV1', value: by.sev1 ?? 0, icon: Siren, tone: 'arc', go: () => goTab('major') },
    { key: 'sev2', label: 'SEV2', value: by.sev2 ?? 0, icon: Flame, tone: 'arc', go: () => goTab('critical') },
    { key: 'sev3', label: 'SEV3', value: by.sev3 ?? 0, icon: Zap, tone: '', go: () => goTab('active', { lens: 'sev3' }) },
    { key: 'unacked', label: 'Unacked', value: s.unacked ?? 0, icon: ShieldOff, tone: 'warn', go: () => goTab('critical', { lens: 'unacked' }) },
    { key: 'overdue', label: 'Overdue', value: s.update_overdue ?? 0, icon: AlarmClock, tone: 'warn', go: () => goTab('active', { lens: 'overdue' }) },
    { key: 'atrisk', label: 'At-risk', value: s.sla?.at_risk ?? 0, icon: Gauge, tone: '', go: () => goTab('active', { lens: 'at_risk' }) },
    { key: 'breached', label: 'Breached', value: s.sla?.breached ?? 0, icon: Flame, tone: 'arc', go: () => goTab('active', { lens: 'breached' }) },
  ]
})

/* pulse polylines (14d) + breach markers */
const pulsePts = computed(() => {
  const t = stats.value?.trend_14d || []
  const max = Math.max(1, ...t.map(p => Math.max(p.created, p.resolved)))
  const pt = (v, i) => `${8 + i * (544 / 13)},${112 - (v / max) * 96}`
  return {
    created: t.map((p, i) => pt(p.created, i)).join(' '),
    resolved: t.map((p, i) => pt(p.resolved, i)).join(' '),
  }
})
const pulseBreaches = computed(() => {
  const t = stats.value?.trend_14d || []
  return t.map((p, i) => (p.created > p.resolved + 2 ? 8 + i * (544 / 13) : null)).filter(v => v != null)
})

const maxSvc = computed(() => Math.max(1, ...(stats.value?.top_services || []).map(s => s.count)))
const slaSplit = computed(() => {
  const s = stats.value?.sla || {}; const tot = (s.met || 0) + (s.at_risk || 0) + (s.breached || 0) || 1
  return { met: Math.round((s.met || 0) / tot * 100), risk: Math.round((s.at_risk || 0) / tot * 100), brc: Math.round((s.breached || 0) / tot * 100) }
})
const esc = computed(() => extras.value?.escalation || { l1: 0, l2: 0, l3: 0 })
const tierPct = (n) => { const m = Math.max(1, esc.value.l1, esc.value.l2, esc.value.l3); return Math.round((n || 0) / m * 100) }
const responders = computed(() => (stats.value?.critical?.responder_load || []).slice(0, 4))
const agingHot = computed(() => {
  const a = extras.value?.aging_ladder || []
  return a.filter(b => b.bucket === '>8h' || b.bucket === '4-8h').reduce((s, b) => s + (b.count || 0), 0)
})
const tasksPct = computed(() => extras.value?.tasks_live?.progress_pct != null ? Math.round(extras.value.tasks_live.progress_pct) : 0)

/* formatting helpers */
const mm = (m) => (m == null ? '—' : m >= 60 ? `${Math.floor(m / 60)}h ${Math.round(m % 60)}m` : `${Math.round(m)}m`)
const minLabel = (m) => (m == null ? '—' : m >= 60 ? `${Math.floor(m / 60)}h ${Math.round(m % 60)}m` : `${Math.round(m)}m`)
const shortNo = (n) => (n || '').replace(/^.*?([A-Z]*-?\d+)$/, '$1')
const initials = (n) => (n || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
const sevTone = (sev) => (sev === 1 ? 'arc' : sev === 2 ? 'warn' : '')
const slaTone = (r) => {
  if (!r) return ''
  if (r.sla_resolution_breached || r.sla_response_breached) return 'bad'
  if (isAtRisk(r, now.value)) return 'warn'
  return 'ok'
}
const slaPct = (r) => {
  if (!r?.resolution_due_at || !r?.created_at) return 60
  const due = new Date(r.resolution_due_at).getTime(); const start = new Date(r.created_at).getTime()
  if (due <= start) return 100
  return Math.max(4, Math.min(100, Math.round((now.value - start) / (due - start) * 100)))
}
const countdown = (due) => {
  if (!due) return '—'
  const ms = new Date(due).getTime() - now.value
  const past = ms < 0; const s = Math.abs(ms) / 1000
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = Math.floor(s % 60)
  const body = h > 0 ? `${h}:${String(m).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`
  return past ? `-${body}` : body
}
const microStatus = (r) => {
  const p = []
  p.push(r.incident_commander_name ? `CMDR ${r.incident_commander_name.split(' ')[0]}` : 'NO CMDR')
  p.push(r.acknowledged_at ? 'ack' : 'UNACKED')
  if (r.escalation_level > 0) p.push(`L${r.escalation_level + 1}`)
  if (r.war_room_url) p.push('war room')
  return p.join(' · ')
}

const openTicket = (id) => emit('open', id)
const openWar = (r) => { if (r.war_room_url) window.open(r.war_room_url, '_blank', 'noopener') }

onMounted(() => {
  mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
  syncReduced()
  mqReduce && mqReduce.addEventListener && mqReduce.addEventListener('change', syncReduced)
  refresh(false)
  tick = setInterval(() => { now.value = Date.now() }, 1000)
  poll = setInterval(() => { if (!gated.value && document.visibilityState === 'visible') refresh(true) }, 60000)
})
onBeforeUnmount(() => {
  clearInterval(tick); clearInterval(poll)
  mqReduce && mqReduce.removeEventListener && mqReduce.removeEventListener('change', syncReduced)
})
</script>

<style scoped>
.igd { display: flex; flex-direction: column; gap: 16px; }

/* gate */
.igd-gate { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 56px 24px;
  text-align: center; border-radius: 18px; background: var(--sd-surface); border: 1px solid var(--sd-border); }
.gate-glyph { display: grid; place-items: center; width: 58px; height: 58px; border-radius: 16px;
  color: var(--sd-inc-core); background: var(--sd-inc-soft); border: 1px solid var(--sd-inc-brd); }
.igd-gate h2 { margin: 4px 0 0; font-size: 19px; color: var(--sd-text); }
.igd-gate p { margin: 0; max-width: 480px; font-size: 13px; line-height: 1.6; color: var(--sd-text-secondary); }
.gate-cta { display: inline-flex; align-items: center; gap: 8px; margin-top: 8px; padding: 10px 18px; border-radius: 12px;
  border: 0; cursor: pointer; font-weight: 800; font-size: 13px; color: #1a1206; background: var(--sd-inc-grad); }
[data-theme="light"] .gate-cta { color: #fff8ec; }

/* hero row */
.igd-hero-row { display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px; align-items: stretch; }
.hero-lead { position: relative; border-radius: 22px; overflow: hidden; isolation: isolate; padding: 26px 26px 22px;
  background: radial-gradient(120% 100% at 6% -12%, var(--sd-inc-soft), transparent 55%),
    linear-gradient(180deg, var(--sd-inc-stage), color-mix(in srgb, var(--sd-inc-stage) 82%, var(--sd-canvas)));
  border: 1px solid var(--sd-inc-brd); box-shadow: var(--sd-shadow); color: #f6ecd8; }
.hero-grain { position: absolute; inset: 0; z-index: 0; opacity: 0.5; pointer-events: none;
  background-image: linear-gradient(var(--sd-inc-grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--sd-inc-grid-line) 1px, transparent 1px); background-size: 30px 30px;
  -webkit-mask-image: linear-gradient(180deg, rgba(0,0,0,.7), transparent 70%);
  mask-image: linear-gradient(180deg, rgba(0,0,0,.7), transparent 70%); }
.hero-orb { position: absolute; top: -140px; right: -90px; width: 380px; height: 380px; z-index: 0; filter: blur(32px);
  background: radial-gradient(circle, var(--sd-inc-soft), transparent 65%); }
.hero-top { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.hero-eyebrow { display: inline-flex; align-items: center; gap: 7px; padding: 5px 12px; border-radius: 20px; font-size: 10px;
  font-weight: 800; letter-spacing: .16em; font-family: var(--sd-mono); color: var(--sd-inc-core);
  background: var(--sd-inc-soft); border: 1px solid var(--sd-inc-brd); }
.scope-chip { display: inline-flex; align-items: center; gap: 6px; font-family: var(--sd-mono); font-size: 9.5px; font-weight: 800;
  letter-spacing: .12em; color: #c6b491; padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(245,166,35,.24); }
.scope-chip i { width: 6px; height: 6px; border-radius: 50%; background: var(--sd-inc-core); }
.scope-chip.all { color: var(--sd-inc-hi); }
.hero-title { position: relative; z-index: 1; margin: 14px 0 6px; font-size: clamp(24px, 3.2vw, 40px); font-weight: 300;
  line-height: 1.04; letter-spacing: -.02em; color: #fff; }
.hero-title em { font-style: normal; font-weight: 650; background: var(--sd-inc-grad);
  -webkit-background-clip: text; background-clip: text; color: transparent; }
.hero-sub { position: relative; z-index: 1; margin: 0 0 16px; font-size: 13px; color: #c6b491; max-width: 560px; }
.hero-ctas { position: relative; z-index: 1; display: flex; gap: 10px; flex-wrap: wrap; }
.cta { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 12px; border: 1px solid transparent;
  cursor: pointer; font-size: 12.8px; font-weight: 800; }
.cta.primary { color: #1a1206; background: var(--sd-inc-grad); box-shadow: 0 8px 22px var(--sd-inc-soft); }
[data-theme="light"] .cta.primary { color: #fff8ec; }
.cta.ghost { color: #c6b491; background: rgba(255,255,255,.03); border-color: rgba(245,166,35,.24); }
.cta.ghost:hover { color: #fff; border-color: var(--sd-inc-brd); }
.cta b { padding: 1px 7px; border-radius: 12px; font-family: var(--sd-mono); font-size: 11px; color: var(--sd-inc-arc);
  background: var(--sd-inc-arc-soft); }
.spin { animation: sd-spin-slow 1.1s linear infinite; }

/* spotlight */
.spot { position: relative; border-radius: 22px; overflow: hidden; padding: 20px; border: 1px solid var(--sd-inc-arc);
  background: radial-gradient(130% 120% at 100% 0%, var(--sd-inc-arc-soft), transparent 60%),
    linear-gradient(180deg, var(--sd-surface), var(--sd-surface-elevated, var(--sd-surface)));
  box-shadow: var(--sd-shadow); }
.spot.empty { border-color: var(--sd-border); }
.spot-glow { position: absolute; inset: 0; border-radius: 22px; pointer-events: none;
  box-shadow: inset 0 0 60px var(--sd-inc-arc-soft); animation: spotpulse 3.4s ease-in-out infinite; }
.spot-flag { display: inline-flex; align-items: center; gap: 7px; font-family: var(--sd-mono); font-size: 10px; font-weight: 800;
  letter-spacing: .12em; color: var(--sd-inc-arc); padding: 4px 9px; border-radius: 7px; background: var(--sd-inc-arc-soft); }
.spot-flag.warn { color: var(--sd-inc-warn); background: var(--sd-inc-warn-soft); }
.spot-flag i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; animation: sd-inc-led 1.8s ease-in-out infinite; }
.spot-title { margin: 12px 0 4px; font-size: 16.5px; font-weight: 700; line-height: 1.25; color: var(--sd-text); cursor: pointer; }
.spot-title:hover { color: var(--sd-inc-core); }
.spot-meta { display: flex; gap: 12px; flex-wrap: wrap; font-size: 10px; color: var(--sd-text-muted); margin-top: 6px; }
.spot-meta b { color: var(--sd-text-secondary); font-weight: 700; }
.spot-meta .bad { color: var(--sd-inc-arc); }
.spot-clock { margin-top: 14px; display: flex; align-items: baseline; gap: 8px; }
.spot-clock .t { font-size: 30px; font-weight: 800; line-height: 1; color: var(--sd-inc-arc); }
.spot-clock .t.warn { color: var(--sd-inc-warn); } .spot-clock .t.ok { color: var(--sd-inc-live); } .spot-clock .t.bad { color: var(--sd-inc-arc); }
.spot-clock .lbl { font-size: 10px; letter-spacing: .1em; color: var(--sd-text-muted); text-transform: uppercase; }
.spot-bar { margin-top: 10px; height: 6px; border-radius: 4px; background: var(--sd-border); overflow: hidden; }
.spot-bar i { display: block; height: 100%; border-radius: 4px; background: linear-gradient(90deg, var(--sd-inc-arc), var(--sd-inc-warn)); }
.spot-bar i.ok { background: var(--sd-inc-live); } .spot-bar i.warn { background: var(--sd-inc-warn); }
.spot-verbs { display: flex; gap: 6px; margin-top: 14px; flex-wrap: wrap; }
.vb { font-size: 11px; font-weight: 700; padding: 6px 11px; border-radius: 8px; background: var(--sd-inc-soft);
  color: var(--sd-inc-core); border: 1px solid var(--sd-inc-brd); cursor: pointer; }
.vb.solid { color: #1a1206; background: var(--sd-inc-grad); border-color: transparent; }
[data-theme="light"] .vb.solid { color: #fff8ec; }
.vb:hover { transform: translateY(-1px); }
.spot-clear { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; height: 100%;
  color: var(--sd-text-muted); text-align: center; }
.spot-clear b { color: var(--sd-inc-live); font-size: 16px; } .spot-clear span { font-size: 12px; }

/* lenses */
.lenses { display: grid; grid-template-columns: repeat(8, 1fr); gap: 10px; }
.lens { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 3px; padding: 11px 12px 13px;
  border-radius: 14px; cursor: pointer; overflow: hidden; text-align: left; background: var(--sd-surface);
  border: 1px solid var(--sd-border); color: var(--sd-text); }
.lens:hover { border-color: var(--sd-inc-brd); }
.lens.dim { opacity: .68; }
.lens-ic { color: var(--sd-inc-core); }
.lens.arc .lens-ic { color: var(--sd-inc-arc); } .lens.warn .lens-ic { color: var(--sd-inc-warn); }
.lens-val { font-size: 21px; font-weight: 800; line-height: 1; }
.lens-lbl { font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--sd-text-muted); }
.lens-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2.5px; background: var(--sd-inc-grad);
  transform: scaleX(0); transform-origin: left; transition: transform .35s var(--sd-spring); }
.lens.arc .lens-bar { background: linear-gradient(90deg, var(--sd-inc-arc), transparent); }
.lens.warn .lens-bar { background: linear-gradient(90deg, var(--sd-inc-warn), transparent); }
.lens:hover .lens-bar { transform: scaleX(1); }

/* body */
.igd-body { display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px; align-items: start; }
.col-main, .col-side { display: flex; flex-direction: column; gap: 16px; }
.card { border-radius: 16px; padding: 15px 16px; background: var(--sd-surface); border: 1px solid var(--sd-border); }
.ch { display: flex; align-items: center; gap: 8px; margin-bottom: 11px; color: var(--sd-inc-core); }
.ch h3 { margin: 0; flex: 1; font-size: 12.5px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; color: var(--sd-text); }
.live { display: inline-flex; align-items: center; gap: 6px; font-size: 9px; letter-spacing: .12em; color: var(--sd-inc-live); }
.live i { width: 6px; height: 6px; border-radius: 50%; background: var(--sd-inc-live); animation: sd-inc-led 1.8s ease-in-out infinite; }

.pulse { width: 100%; height: 120px; }
.p-in { fill: none; stroke: var(--sd-inc-core); stroke-width: 2; stroke-linejoin: round;
  stroke-dasharray: 1200; stroke-dashoffset: 1200; animation: draw 1.5s var(--sd-spring) forwards; }
.p-out { fill: none; stroke: var(--sd-inc-live); stroke-width: 2; stroke-linejoin: round;
  stroke-dasharray: 1200; stroke-dashoffset: 1200; animation: draw 1.5s .25s var(--sd-spring) forwards; }
.p-brc { fill: var(--sd-inc-arc); }
@keyframes draw { to { stroke-dashoffset: 0; } }
.ch-foot { display: flex; gap: 14px; margin-top: 8px; font-size: 10.5px; color: var(--sd-text-muted); flex-wrap: wrap; }
.ch-foot .ok { color: var(--sd-inc-live); } .ch-foot .bad { color: var(--sd-inc-arc); }

.rows-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.row { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 9px; border-radius: 10px; cursor: pointer;
  border: 1px solid transparent; background: transparent; text-align: left; }
.row:hover { background: var(--sd-inc-soft); border-color: var(--sd-inc-brd); }
.row .no { font-size: 11px; font-weight: 700; color: var(--sd-inc-core); width: 62px; flex-shrink: 0; }
.rb { flex: 1; min-width: 0; }
.rs { display: block; font-size: 13px; font-weight: 600; color: var(--sd-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rm { display: block; font-size: 9.5px; color: var(--sd-text-muted); margin-top: 1px; }
.row .sla { font-size: 11px; font-weight: 700; flex-shrink: 0; }
.sla.bad { color: var(--sd-inc-arc); } .sla.warn { color: var(--sd-inc-warn); } .sla.ok { color: var(--sd-inc-live); }
.empty { padding: 10px 2px; font-size: 12px; color: var(--sd-text-muted); }

.svc-list { display: flex; flex-direction: column; gap: 7px; }
.svc { display: grid; grid-template-columns: 96px 1fr 46px; align-items: center; gap: 10px; padding: 6px 8px; border-radius: 10px;
  border: 1px solid transparent; background: transparent; cursor: pointer; text-align: left; }
.svc:hover { background: var(--sd-inc-soft); border-color: var(--sd-inc-brd); }
.svc-name { font-size: 12px; font-weight: 700; color: var(--sd-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.svc-rail { height: 6px; border-radius: 4px; background: var(--sd-border); overflow: hidden; }
.svc-rail i { display: block; height: 100%; border-radius: 4px; background: var(--sd-inc-grad); }
.svc-rail i.hot { background: linear-gradient(90deg, var(--sd-inc-arc), var(--sd-inc-core)); }
.svc-n { font-size: 12px; font-weight: 800; color: var(--sd-text); text-align: right; }
.svc-n .dim { font-style: normal; color: var(--sd-text-muted); font-weight: 600; }

.burn { display: flex; flex-direction: column; gap: 8px; }
.bl { display: flex; align-items: center; gap: 9px; }
.bl .k { font-size: 11px; color: var(--sd-text-secondary); width: 60px; }
.bl .t { flex: 1; height: 7px; border-radius: 4px; background: var(--sd-border); overflow: hidden; }
.bl .t i { display: block; height: 100%; border-radius: 4px; } .bl .t i.ok { background: var(--sd-inc-live); }
.bl .t i.warn { background: var(--sd-inc-warn); } .bl .t i.bad { background: var(--sd-inc-arc); }
.bl .v { font-size: 11px; font-weight: 700; width: 30px; text-align: right; }
.next-breach { margin-top: 11px; font-size: 10px; color: var(--sd-text-muted); }
.next-breach b { color: var(--sd-inc-arc); }

.esc { display: flex; flex-direction: column; gap: 6px; }
.tier { display: flex; align-items: center; gap: 9px; }
.tier .tg { font-size: 10px; font-weight: 800; width: 24px; }
.tier.l1 .tg { color: var(--sd-inc-core); } .tier.l2 .tg { color: var(--l2); } .tier.l3 .tg { color: var(--l3); }
.tier .bar { flex: 1; height: 6px; border-radius: 4px; background: var(--sd-border); overflow: hidden; }
.tier .bar i { display: block; height: 100%; border-radius: 4px; }
.tier.l1 .bar i { background: var(--sd-inc-core); } .tier.l2 .bar i { background: var(--l2); } .tier.l3 .bar i { background: var(--l3); }
.tier .c { font-size: 11px; font-weight: 800; width: 22px; text-align: right; color: var(--sd-text); }
.resp { display: flex; flex-direction: column; gap: 7px; margin-top: 11px; }
.rp { display: flex; align-items: center; gap: 9px; }
.rp .av { width: 24px; height: 24px; border-radius: 7px; display: grid; place-items: center; font-size: 9px; font-weight: 800;
  color: #1a1206; background: var(--sd-inc-grad); flex-shrink: 0; }
[data-theme="light"] .rp .av { color: #fff8ec; }
.rp .nm { flex: 1; font-size: 11.5px; font-weight: 600; color: var(--sd-text); min-width: 0; }
.rp .nm span { display: block; font-size: 8.5px; color: var(--sd-text-muted); font-weight: 500; }
.rp .ld { font-size: 9.5px; font-weight: 700; color: var(--sd-text-muted); }
.rp .ld.hot { color: var(--sd-inc-arc); }

.debt { display: flex; flex-direction: column; gap: 7px; }
.dc { display: flex; align-items: center; gap: 11px; width: 100%; padding: 9px 11px; border-radius: 11px; cursor: pointer;
  border: 1px solid transparent; background: var(--sd-surface-elevated, var(--sd-surface)); color: var(--sd-inc-core); }
.dc:hover { border-color: var(--sd-inc-brd); transform: translateX(3px); }
.dc.hot { color: var(--sd-inc-arc); background: var(--sd-inc-arc-soft); }
.dc .n { font-size: 17px; font-weight: 800; width: 32px; color: var(--sd-text); } .dc.hot .n { color: var(--sd-inc-arc); }
.dc .l { flex: 1; font-size: 11px; color: var(--sd-text-secondary); text-align: left; }
.qrow { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 12px; }
.q { display: flex; flex-direction: column; align-items: center; padding: 8px 4px; border-radius: 10px;
  background: var(--sd-surface-elevated, var(--sd-surface)); border: 1px solid var(--sd-border); }
.qv { font-size: 16px; font-weight: 800; } .qv.gold { color: var(--sd-inc-hi); }
.ql { font-size: 8.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--sd-text-muted); margin-top: 2px; }

.igd-foot { display: flex; gap: 18px; flex-wrap: wrap; padding: 14px 4px 0; font-size: 11px; color: var(--sd-text-muted);
  border-top: 1px solid var(--sd-divider-color, var(--sd-border)); }
.igd-foot .ok { color: var(--sd-inc-live); } .igd-foot .bad { color: var(--sd-inc-arc); }

/* scoped tier accents (not in theme.css) */
.igd { --l2: #60a5fa; --l3: #c084fc; }

.breath { animation: orbdrift 9s ease-in-out infinite; }
@keyframes orbdrift { 0%, 100% { opacity: .45; transform: translate(0, 0); } 50% { opacity: .8; transform: translate(-16px, 12px); } }
@keyframes spotpulse { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }

@media (max-width: 1080px) {
  .igd-hero-row, .igd-body { grid-template-columns: 1fr; }
  .lenses { grid-template-columns: repeat(4, 1fr); }
}
@media (max-width: 560px) { .lenses { grid-template-columns: repeat(2, 1fr); } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .spin,
  html:not([data-cinematic="on"]) .p-in, html:not([data-cinematic="on"]) .p-out,
  html:not([data-cinematic="on"]) .spot-glow, html:not([data-cinematic="on"]) .live i,
  html:not([data-cinematic="on"]) .spot-flag i { animation: none !important; }
  html:not([data-cinematic="on"]) .p-in, html:not([data-cinematic="on"]) .p-out { stroke-dashoffset: 0; }
  /* .breath uses a non-sd- class so the global reduce sweep leaves it; keep it a calm ambient loop */
}
</style>
