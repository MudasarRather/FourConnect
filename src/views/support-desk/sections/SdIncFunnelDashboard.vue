<template>
  <div class="ifd" :class="{ 'is-ready': isReady }">
    <!-- ═══════════════════ HEADER ═══════════════════ -->
    <Motion as="header" class="hd" v-bind="enter(0)">
      <div class="hd-lead">
        <div class="eye sd-mono"><Radar :size="12" /> COMMAND FUNNEL · THE CONCOURSE · WHOLE DESK</div>
        <h1 class="hd-title">Every signal, every team — <em>one concourse.</em></h1>
        <div class="sub sd-mono">{{ subLine }}</div>
      </div>
      <div class="hd-actions">
        <Motion as="button" class="hd-ghost" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }"
          title="Refresh" aria-label="Refresh" @click="refresh(false)">
          <RefreshCw :size="15" :class="{ spin: loading }" />
        </Motion>
        <Motion as="button" class="hd-cta" :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.96 }"
          @click="exportBrief"><Download :size="14" /> Export brief</Motion>
      </div>
    </Motion>

    <!-- ═══════════════════ EXEC KPI RAIL (10) ═══════════════════ -->
    <Motion as="div" class="kpis" v-bind="enter(0.03)">
      <button v-for="m in kpis" :key="m.k" class="kpi" :class="m.tone" @click="m.go && m.go()">
        <div class="n sd-mono">{{ m.n }}</div>
        <div class="k">{{ m.k }}</div>
        <div v-if="m.dl" class="dl sd-mono" :class="{ bad: m.dlBad }">{{ m.dl }}</div>
      </button>
    </Motion>

    <!-- ═══════════════════ GOVERNANCE GRID (12-col dense) ═══════════════════ -->
    <div class="grid">
      <!-- ── ACTIVE FLEET · worst first ── -->
      <Motion as="section" class="card c5" v-bind="enter(0.06)">
        <div class="ch">
          <ListOrdered :size="14" class="dot" />
          <h3>Active fleet · worst first</h3>
          <button class="lv" @click="goTab('active')"><i />LIVE · {{ fleet.length }}</button>
        </div>
        <div v-if="fleet.length" class="rows scroll">
          <button v-for="r in fleet" :key="r.id" class="row" @click="openTicket(r.id)">
            <span class="sev" :class="`s${r.sev}`" />
            <span class="no sd-mono">{{ r.ticket_number }}</span>
            <span class="bd">
              <span class="s">{{ r.subject }}</span>
              <span class="m sd-mono">{{ fleetMeta(r) }}</span>
            </span>
            <span class="sla sd-mono" :class="fleetSla(r).tone">{{ fleetSla(r).txt }}</span>
          </button>
        </div>
        <p v-else class="empty">The fleet is green — no active incidents on the board.</p>
      </Motion>

      <!-- ── MAJOR INCIDENT COMMAND ── -->
      <Motion as="section" class="card c4" v-bind="enter(0.08)">
        <div class="ch">
          <Radio :size="14" class="dot" />
          <h3>Major incident command</h3>
          <span class="lv"><i />{{ miRows.length }} LIVE</span>
        </div>
        <div v-if="miRows.length" class="mi-list scroll">
          <button v-for="r in miRows" :key="r.id" class="mi" @click="openTicket(r.id)">
            <span class="f sd-mono">● SEV{{ r.sev }} · MI</span>
            <span class="cl sd-mono" :class="fleetSla(r).tone">{{ fleetSla(r).txt }}</span>
            <h4>{{ r.subject }}</h4>
            <div class="ro sd-mono">CMDR {{ r.incident_commander_name || '—' }} · Comms {{ r.comms_lead_name || '—' }} · Ops {{ r.ops_lead_name || '—' }}</div>
            <div class="ph">
              <span v-for="p in miPhases(r)" :key="p.label" class="p sd-mono" :class="p.state">{{ p.label }}</span>
            </div>
            <div class="mibar sd-mono">
              <span>MTTD <b>{{ hm(stats?.mttd_minutes_30d) }}</b></span>
              <span v-if="r.next_update_due_at">update <b :class="updateTone(r)">{{ updateDue(r) }}</b></span>
              <span v-else-if="r.mi_proposal_note">proposal <b class="warn">pending</b></span>
            </div>
          </button>
        </div>
        <p v-else class="empty">No major incidents live — the war rooms are dark.
          <span v-if="(stats?.mi_proposals_pending || 0) > 0" class="empty-hot">{{ stats.mi_proposals_pending }} proposal(s) awaiting confirm.</span>
        </p>
      </Motion>

      <!-- ── ESCALATION HEATMAP ── -->
      <Motion as="section" class="card c3" v-bind="enter(0.1)">
        <div class="ch"><ChevronsUp :size="14" class="dot" /><h3>Escalation heatmap</h3><span class="mo sd-mono">TIER × 24h</span></div>
        <div v-for="hr in heatRows" :key="hr.tier" class="heatrow" :class="`l${hr.tier}`">
          <span class="tg sd-mono">{{ hr.label }}</span>
          <div class="heat">
            <span v-for="(c, i) in hr.cells" :key="i" class="c" :class="cellClass(c.i)"
              :title="c.v ? `${hr.label} · ${c.v}` : ''" />
          </div>
        </div>
        <div class="mibar sd-mono">
          <span>L1 <b>{{ tierCounts.l1 }}</b></span>
          <span>L2 <b style="color:var(--l2)">{{ tierCounts.l2 }}</b></span>
          <span>L3 <b style="color:var(--l3)">{{ tierCounts.l3 }}</b></span>
          <span>de-esc 30d <b>{{ stats?.critical?.de_escalations_30d ?? 0 }}</b></span>
        </div>
      </Motion>

      <!-- ── RESPONDER LEADERBOARD ── -->
      <Motion as="section" class="card c3" v-bind="enter(0.12)">
        <div class="ch"><Trophy :size="14" class="dot" /><h3>Responder leaderboard</h3><span class="mo sd-mono">30D</span></div>
        <div v-if="leaderboard.length" class="lead">
          <div v-for="(p, i) in leaderboard" :key="p.name + i" class="lr">
            <span class="rk sd-mono">{{ i + 1 }}</span>
            <span class="av">{{ initials(p.name) }}</span>
            <span class="nm">{{ p.name }}<span class="sd-mono">{{ p.sub }}</span></span>
            <span class="v sd-mono">{{ p.v }}</span>
          </div>
        </div>
        <p v-else class="empty">No responder activity in the window.</p>
      </Motion>

      <!-- ── ON-CALL ROSTER ── -->
      <Motion as="section" class="card c3" v-bind="enter(0.14)">
        <div class="ch"><PhoneCall :size="14" class="dot" /><h3>On-call roster</h3><span class="lv"><i />NOW</span></div>
        <div v-if="roster.length" class="roster">
          <div v-for="(p, i) in roster" :key="p.name + i" class="ro">
            <span class="st" :class="p.on ? 'on' : 'idle'" />
            <span class="nm">{{ p.name }}<span class="sd-mono">{{ p.sub }}</span></span>
            <span class="rl sd-mono">{{ p.role }}</span>
          </div>
        </div>
        <p v-else class="empty">No responders currently engaged.</p>
      </Motion>

      <!-- ── BY CATEGORY · SERVICE ── -->
      <Motion as="section" class="card c3" v-bind="enter(0.16)">
        <div class="ch"><Layers :size="14" class="dot" /><h3>By category · service</h3></div>
        <div v-if="(stats?.by_category || []).length" class="bars">
          <button v-for="c in stats.by_category" :key="c.key || c.label" class="br"
            @click="goTab('active', c.label ? { q: c.label } : {})">
            <span class="k">{{ c.label }}</span>
            <span class="t"><i class="grow" :class="{ hot: c.breached }" :style="{ width: barPct(c.count, maxCat) }" /></span>
            <span class="v sd-mono">{{ c.count }}<i v-if="c.breached" class="brc">/{{ c.breached }}brc</i></span>
          </button>
        </div>
        <p v-else class="empty">No active incidents to categorise.</p>
      </Motion>

      <!-- ── FLOW · 14d ── -->
      <Motion as="section" class="card c4" v-bind="enter(0.18)">
        <div class="ch"><TrendingUp :size="14" class="dot" /><h3>Flow · 14d created vs resolved</h3></div>
        <svg class="spark" viewBox="0 0 280 70" preserveAspectRatio="none" aria-hidden="true">
          <polygon class="sp-area" :points="sparkGeo.area" />
          <polyline class="sp-in" :points="sparkGeo.created" />
          <polyline class="sp-out" :points="sparkGeo.resolved" />
        </svg>
        <div class="mibar sd-mono">
          <span>raised <b>{{ trendSum.created }}</b></span>
          <span class="ok">restored <b class="ok">{{ trendSum.resolved }}</b></span>
          <span>net <b :class="trendSum.created - trendSum.resolved > 0 ? 'esc' : 'ok'">{{ signed(trendSum.created - trendSum.resolved) }}</b></span>
          <span>backlog <b>{{ stats?.active_total ?? 0 }}</b></span>
        </div>
      </Motion>

      <!-- ── RCA GOVERNANCE ── -->
      <Motion as="section" class="card c4" v-bind="enter(0.2)">
        <div class="ch"><FlaskConical :size="14" class="dot" /><h3>RCA governance</h3>
          <span class="mo sd-mono">COVERAGE {{ rca.coverage != null ? Math.round(rca.coverage) + '%' : '—' }}</span></div>
        <div class="pipe">
          <button v-for="p in rcaPipe" :key="p.k" class="pf" :class="{ hot: p.hot }" @click="goTab('rca', { lens: p.lens })">
            <b class="sd-mono">{{ p.n }}</b><span>{{ p.k }}</span>
          </button>
        </div>
        <div class="mibar sd-mono">
          <span>cycle <b>{{ rca.cycle != null ? rca.cycle + 'h' : '—' }}</b></span>
          <span>review lat <b>{{ rca.review != null ? rca.review + 'h' : '—' }}</b></span>
          <span>KEDB <b>{{ rca.kedb ?? '—' }}</b></span>
        </div>
      </Motion>

      <!-- ── PIR PIPELINE · ACTIONS ── -->
      <Motion as="section" class="card c4" v-bind="enter(0.22)">
        <div class="ch"><FileCheck2 :size="14" class="dot" /><h3>PIR pipeline · actions</h3></div>
        <div class="pipe">
          <button v-for="p in pirPipe" :key="p.k" class="pf" :class="{ hot: p.hot }" @click="goTab('post-incident', { status: p.status })">
            <b class="sd-mono">{{ p.n }}</b><span>{{ p.k }}</span>
          </button>
        </div>
        <div class="mibar sd-mono">
          <span :class="{ hot: pir.owed > 0 }">{{ pir.owed }} <b :class="pir.owed > 0 ? 'esc' : ''">owe PIR</b></span>
          <span>actions open <b>{{ pir.actions_open }}</b></span>
          <span>overdue <b :class="pir.actions_overdue > 0 ? 'esc' : ''">{{ pir.actions_overdue }}</b></span>
        </div>
      </Motion>

      <!-- ── EXPOSURE · BUSINESS IMPACT ── -->
      <Motion as="section" class="card c4" v-bind="enter(0.24)">
        <div class="ch"><AlertTriangle :size="14" class="dot" /><h3>Exposure · business impact</h3></div>
        <div class="flags">
          <span class="fl">Revenue <b>{{ exposure.revenue }}</b></span>
          <span class="fl">Compliance <b>{{ exposure.compliance }}</b></span>
          <span class="fl">Security <b>{{ exposure.security }}</b></span>
          <span class="fl">Public <b>{{ exposure.public }}</b></span>
          <span class="fl" :class="{ ok: exposure.unassessed === 0 }">Unassessed <b>{{ exposure.unassessed }}</b></span>
        </div>
        <div class="bars tight">
          <div class="br"><span class="k">High impact</span><span class="t"><i class="grow esc" :style="{ width: barPct(exposure.high, maxImpact) }" /></span><span class="v sd-mono">{{ exposure.high }}</span></div>
          <div class="br"><span class="k">Medium</span><span class="t"><i class="grow" :style="{ width: barPct(exposure.medium, maxImpact) }" /></span><span class="v sd-mono">{{ exposure.medium }}</span></div>
          <div class="br"><span class="k">Low</span><span class="t"><i class="grow" :style="{ width: barPct(exposure.low, maxImpact) }" /></span><span class="v sd-mono">{{ exposure.low }}</span></div>
        </div>
      </Motion>

      <!-- ── SLA BURN-DOWN · AGING ── -->
      <Motion as="section" class="card c4" v-bind="enter(0.26)">
        <div class="ch"><Gauge :size="14" class="dot" /><h3>SLA burn-down · aging</h3></div>
        <div class="bars tight">
          <div class="br"><span class="k">Met</span><span class="t"><i class="grow live" :style="{ width: slaSplit.metPct + '%' }" /></span><span class="v sd-mono">{{ slaSplit.metPct }}%</span></div>
          <div class="br"><span class="k">At-risk</span><span class="t"><i class="grow warn" :style="{ width: slaSplit.riskPct + '%' }" /></span><span class="v sd-mono">{{ slaSplit.riskPct }}%</span></div>
          <div class="br"><span class="k">Breached</span><span class="t"><i class="grow esc" :style="{ width: slaSplit.breachedPct + '%' }" /></span><span class="v sd-mono">{{ slaSplit.breachedPct }}%</span></div>
        </div>
        <div class="mibar sd-mono">
          <span v-for="a in aging" :key="a.label">{{ a.label }} <b :class="{ esc: a.hot }">{{ a.count }}</b></span>
          <span>next <b :class="nextBreach.tone">{{ nextBreach.txt }}</b></span>
        </div>
      </Motion>

      <!-- ── PER-TEAM · CSAT ── -->
      <Motion as="section" class="card c4" v-bind="enter(0.28)">
        <div class="ch"><Users :size="14" class="dot" /><h3>Per-team · CSAT</h3></div>
        <div v-if="perTeam.length" class="bars tight">
          <button v-for="t in perTeam" :key="t.name" class="br" @click="goTab('active', { q: t.name })">
            <span class="k">{{ t.name }}</span>
            <span class="t"><i class="grow" :style="{ width: barPct(t.active, maxTeam) }" /></span>
            <span class="v sd-mono">{{ t.active }}<i v-if="t.sla != null" class="dim">·{{ Math.round(t.sla) }}%</i></span>
          </button>
        </div>
        <p v-else class="empty">No team activity on the board.</p>
        <div class="csat">
          <svg viewBox="0 0 60 60" aria-hidden="true">
            <circle cx="30" cy="30" r="24" fill="none" stroke="var(--sd-border)" stroke-width="5" />
            <circle class="csat-arc" cx="30" cy="30" r="24" fill="none" stroke="var(--sd-fun-resolved)" stroke-width="5"
              stroke-linecap="round" stroke-dasharray="150.8"
              :stroke-dashoffset="isReady ? (150.8 - csatArc) : 150.8" transform="rotate(-90 30 30)" />
          </svg>
          <div>
            <div class="big sd-mono">{{ csat.avg != null ? csat.avg.toFixed(1) : '—' }}</div>
            <div class="sm"><b v-if="csat.positivePct != null">{{ csat.positivePct }}%</b><template v-if="csat.positivePct != null"> positive · </template>reopen {{ csat.reopen != null ? Math.round(csat.reopen) + '%' : '—' }}</div>
          </div>
        </div>
      </Motion>

      <!-- ── LIVE AUDIT FEED ── -->
      <Motion as="section" class="card c4" v-bind="enter(0.3)">
        <div class="ch"><Activity :size="14" class="dot" /><h3>Live audit feed</h3><span class="lv"><i />LIVE</span></div>
        <div v-if="feed.length" class="feed">
          <button v-for="(f, i) in feed" :key="`${f.ticket_id}-${f.at}-${i}`" class="fr" @click="openTicket(f.ticket_id)">
            <span class="d" :class="feedTone(f.action)" />
            <span class="ft">{{ feedVerb(f.action) }} · {{ f.ticket_number }}<i v-if="f.subject" class="fsub"> · {{ f.subject }}</i></span>
            <span class="tm sd-mono">{{ ago(f.at) }}</span>
          </button>
        </div>
        <p v-else class="empty">No incident activity yet.</p>
      </Motion>

      <!-- ── RECURRING PROBLEMS · KEDB ── -->
      <Motion as="section" class="card c8" v-bind="enter(0.32)">
        <div class="ch"><Repeat :size="14" class="dot" /><h3>Recurring problems · known-error clusters</h3><span class="mo sd-mono">PROBLEM ⋈ KEDB</span></div>
        <div v-if="recurring.length" class="bars">
          <button v-for="(r, i) in recurring" :key="i" class="br" @click="goTab('rca')">
            <span class="k wide">{{ r.sig }}</span>
            <span class="t"><i class="grow" :class="{ esc: r.count >= 3 }" :style="{ width: r.w + '%' }" /></span>
            <span class="v sd-mono">×{{ r.count }}<i v-if="r.kedb" class="kedb"> KEDB</i></span>
          </button>
        </div>
        <p v-else class="empty">No recurrence clusters flagged
          <span v-if="!admin" class="dim"> — cross-team clusters are visible to superadmins.</span>
        </p>
      </Motion>
    </div>
  </div>
</template>

<script setup>
/*
  SdIncFunnelDashboard — the ADMIN incident oversight dashboard, "C1 · The Concourse".
  Whole-desk governance (superadmin-only route): a 10-metric exec KPI rail over a dense
  12-col grid of governance instruments — active fleet (worst-first), MI command with
  phase clocks, escalation heatmap, responder leaderboard, on-call roster, category
  bars, 14-day flow, RCA/PIR pipelines, exposure flags, SLA burn+aging, per-team/CSAT,
  live audit feed and recurring/KEDB clusters. NO agent gate, NO ack/response verbs —
  oversight affordances only (export, deep-links). One sealed command-dashboard request
  (agent+extras+admin); falls back to /incidents/stats when the endpoint is absent.
  60s visibility-gated silent re-poll; last-good kept on error.
*/
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Motion } from 'motion-v'
import {
  Radar, Download, RefreshCw, ListOrdered, Radio, ChevronsUp, Trophy, PhoneCall,
  Layers, TrendingUp, FlaskConical, FileCheck2, AlertTriangle, Gauge, Users, Activity, Repeat,
} from 'lucide-vue-next'
import {
  fetchIncidentCommandDashboard, fetchIncidentStats, listIncidents, normalizeIncidentRow,
} from '@/composables/useSupportDesk'

const props = defineProps({
  panel: { type: String, default: 'admin' },
  agentReveal: { type: Boolean, default: false },
})
const emit = defineEmits(['open', 'go', 'new'])

const router = useRouter()
const base = computed(() => (props.panel === 'employee' ? '/user/support' : '/admin/support-desk'))
const goTab = (tab, query = {}) => router.push({ path: `${base.value}/incidents/${tab}`, query })
const openTicket = (id) => emit('open', id)

/* ── reduced-motion, reactive (matchMedia + data-cinematic force-on) ── */
const hasWin = typeof window !== 'undefined'
const mq = hasWin && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
const cinematicOn = () => hasWin && document.documentElement.getAttribute('data-cinematic') === 'on'
const computeReduced = () => !!(mq && mq.matches) && !cinematicOn()
const reduced = ref(computeReduced())
const onReducedChange = () => { reduced.value = computeReduced() }
let cinematicObs = null

const spr = [0.16, 1, 0.3, 1]
const enter = (delay = 0) => (reduced.value
  ? { initial: false, animate: { opacity: 1 }, transition: { duration: 0 } }
  : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay, ease: spr } })

/* ── state ── */
const stats = ref(null)
const admin = ref(null)
const extras = ref(null)
const rows = ref([])
const loading = ref(false)
const isReady = ref(false)
const now = ref(Date.now())
let tick = null
let poll = null
let cmdUnavailable = false

const refresh = async (silent = true) => {
  if (!silent) loading.value = true
  try {
    let d = null
    if (!cmdUnavailable) {
      try { d = await fetchIncidentCommandDashboard() } catch { d = null; cmdUnavailable = true }
    }
    if (d && d.agent) {
      stats.value = d.agent
      admin.value = d.admin || null
      extras.value = d.extras || null
    } else {
      stats.value = await fetchIncidentStats()
      admin.value = null
      extras.value = null
    }
    try {
      const l = await listIncidents({ lens: 'active', limit: 100 })
      rows.value = (l.items || []).map(normalizeIncidentRow)
    } catch { /* keep last-good rows */ }
  } catch { /* keep last-good payload */ } finally {
    loading.value = false
    if (!isReady.value) nextTick(() => requestAnimationFrame(() => { isReady.value = true }))
  }
}

/* ── formatters ── */
const hm = (m) => {
  if (m == null) return '—'
  m = Math.round(m)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60); const r = m % 60
  return r ? `${h}h${String(r).padStart(2, '0')}` : `${h}h`
}
const signed = (n) => (n > 0 ? `+${n}` : `${n}`)
const initials = (name = '') => (name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '—')
const barPct = (v, max) => `${Math.max(v > 0 ? 4 : 0, Math.round((v / (max || 1)) * 100))}%`
const ago = (at) => {
  const s = Math.max(0, (now.value - new Date(at).getTime()) / 1000)
  if (s < 90) return `${Math.round(s)}s`
  if (s < 5400) return `${Math.round(s / 60)}m`
  if (s < 129600) return `${Math.round(s / 3600)}h`
  return `${Math.round(s / 86400)}d`
}
const fmtCountdown = (dueIso, breached = false, paused = false) => {
  if (breached) return { txt: 'BREACH', tone: 'bad' }
  if (paused) return { txt: 'PAUSED', tone: 'ok' }
  if (!dueIso) return { txt: '—', tone: 'ok' }
  const ms = new Date(dueIso).getTime() - now.value
  if (ms <= 0) return { txt: 'DUE', tone: 'bad' }
  const mins = ms / 60000
  const tone = mins <= 15 ? 'bad' : mins <= 60 ? 'warn' : 'ok'
  if (mins < 60) {
    const m = Math.floor(mins); const s = Math.floor((ms % 60000) / 1000)
    return { txt: `${m}:${String(s).padStart(2, '0')}`, tone }
  }
  const h = Math.floor(mins / 60); const mm = Math.floor(mins % 60)
  return { txt: `${h}:${String(mm).padStart(2, '0')}`, tone }
}

/* ── posture sub-line ── */
const subLine = computed(() => {
  const s = stats.value
  if (!s) return 'Reading the desk…'
  const teams = perTeam.value.length
  const metPct = Math.round(((s.sla?.met ?? 0) / (s.active_total || 1)) * 100)
  const restored14 = (s.trend_14d || []).reduce((a, p) => a + (p.resolved || 0), 0)
  return `${s.active_total ?? 0} active · ${s.major_active ?? 0} major · ${teams} team${teams === 1 ? '' : 's'} engaged`
    + ` · ${metPct}% SLA · ${restored14} resolved (14d) · ${pir.value.in_review} PIR${pir.value.in_review === 1 ? '' : 's'} in review`
    + ` · ${rca.value.owed} owe an RCA`
})

/* ── exec KPI rail (10) ── */
const kpis = computed(() => {
  const s = stats.value || {}
  const active = s.active_total ?? 0
  const metPct = Math.round(((s.sla?.met ?? 0) / (active || 1)) * 100)
  const breached = s.sla?.breached ?? 0
  const unacked = s.unacked ?? 0
  return [
    { k: 'Active', n: active, tone: '', go: () => goTab('active') },
    { k: 'Major', n: s.major_active ?? 0, tone: 'esc', go: () => goTab('major') },
    { k: 'SEV1', n: s.by_sev?.sev1 ?? 0, tone: 'esc', go: () => goTab('major') },
    { k: 'SEV2', n: s.by_sev?.sev2 ?? 0, tone: 'warn', go: () => goTab('critical') },
    { k: 'Unacked', n: unacked, tone: unacked > 0 ? 'warn' : '', go: () => goTab('critical', { lens: 'unacked' }) },
    { k: 'MTTA', n: hm(s.mtta_minutes_30d), dl: '30d', tone: '', go: () => goTab('timeline') },
    {
      k: 'MTTR', n: hm(s.mttr_minutes_current_month), tone: '',
      dl: s.mttr_trend_pct != null ? `${s.mttr_trend_pct > 0 ? '+' : ''}${s.mttr_trend_pct}% m/m` : null,
      dlBad: (s.mttr_trend_pct ?? 0) > 0, go: () => goTab('timeline'),
    },
    { k: 'SLA met', n: `${metPct}%`, tone: metPct >= 85 ? 'live' : 'warn', go: () => goTab('active') },
    { k: 'Breached', n: breached, tone: breached > 0 ? 'esc' : '', go: () => goTab('active', { flag: 'breached' }) },
    { k: 'CSAT', n: csat.value.avg != null ? csat.value.avg.toFixed(1) : '—', tone: 'gold', go: () => goTab('post-incident') },
  ]
})

/* ── active fleet (worst-first) ── */
const fleet = computed(() => {
  const list = rows.value || []
  return [...list].sort((a, b) => {
    if ((a.sev ?? 4) !== (b.sev ?? 4)) return (a.sev ?? 4) - (b.sev ?? 4)
    const ab = a.sla_resolution_breached ? 0 : 1; const bb = b.sla_resolution_breached ? 0 : 1
    if (ab !== bb) return ab - bb
    const ad = a.resolution_due_at ? new Date(a.resolution_due_at).getTime() : Infinity
    const bd = b.resolution_due_at ? new Date(b.resolution_due_at).getTime() : Infinity
    return ad - bd
  })
})
const tierLabel = (r) => {
  const lv = r.escalation_level || 0
  if (lv >= 2) return 'L3'
  if (lv === 1) return 'L2'
  return r.is_escalated ? 'L2' : 'L1'
}
const fleetMeta = (r) => {
  const bits = []
  bits.push(r.team_name || 'Unrouted')
  if (r.is_major_incident) bits.push('MI')
  if (r.incident_commander_name) bits.push(`CMDR ${r.incident_commander_name}`)
  else if (r.sev <= 2) bits.push('NO CMDR')
  if (r.is_escalated) bits.push(tierLabel(r))
  if (!r.acknowledged_at && r.sev <= 2) bits.push('UNACKED')
  else if (r.next_update_due_at && new Date(r.next_update_due_at).getTime() < now.value) bits.push('update overdue')
  return bits.join(' · ')
}
const fleetSla = (r) => fmtCountdown(r.resolution_due_at, r.sla_resolution_breached, !!r.sla_paused_since)

/* ── MI command ── */
const miRows = computed(() => fleet.value.filter(r => r.is_major_incident))
const PHASES = ['DETECT', 'DECLARE', 'MITIGATE', 'RESOLVE', 'PIR']
const miPhases = (r) => {
  const s = (r.status || '').toLowerCase()
  const resolved = !!r.resolved_at || s === 'resolved' || s === 'closed'
  const closed = !!r.closed_at || s === 'closed'
  const pirDone = ['approved', 'published'].includes(r.pir_status || '')
  const cur = pirDone ? 6 : (r.has_pir || closed) ? 5 : resolved ? 4 : 3
  return PHASES.map((label, i) => {
    const n = i + 1
    return { label, state: n < cur ? 'done' : n === cur ? 'now' : '' }
  })
}
const updateDue = (r) => fmtCountdown(r.next_update_due_at).txt
const updateTone = (r) => {
  const t = fmtCountdown(r.next_update_due_at).tone
  return t === 'bad' ? 'esc' : t === 'warn' ? 'warn' : 'ok'
}

/* ── escalation heatmap (tier × 24) ── */
const HEAT_COLS = 24
const heatRows = computed(() => {
  const hm2 = admin.value?.escalation_heatmap || []
  const grid = { 1: Array(HEAT_COLS).fill(0), 2: Array(HEAT_COLS).fill(0), 3: Array(HEAT_COLS).fill(0) }
  hm2.forEach((e) => {
    const t = Math.min(3, Math.max(1, Number(e.tier) || 1))
    const d = Number(e.day_index)
    if (grid[t] && d >= 0 && d < HEAT_COLS) grid[t][d] += (e.count || 0)
  })
  const max = Math.max(1, ...Object.values(grid).flat())
  return [1, 2, 3].map(t => ({
    tier: t, label: `L${t}`,
    total: grid[t].reduce((a, c) => a + c, 0),
    cells: grid[t].map(c => ({ v: c, i: c / max })),
  }))
})
const cellClass = (i) => (i > 0.75 ? 'hi' : i > 0.5 ? 'md' : i > 0.28 ? 'lo' : '')
const tierCounts = computed(() => {
  const e = extras.value?.escalation
  if (e && (e.l1 != null || e.l2 != null || e.l3 != null)) return { l1: e.l1 || 0, l2: e.l2 || 0, l3: e.l3 || 0 }
  const hr = heatRows.value
  if (hr.some(r => r.total)) return { l1: hr[0].total, l2: hr[1].total, l3: hr[2].total }
  const c = { l1: 0, l2: 0, l3: 0 }
  ;(rows.value || []).forEach((r) => {
    if (!r.is_escalated) return
    const lv = r.escalation_level || 0
    if (lv >= 2) c.l3++; else if (lv === 1) c.l2++; else c.l1++
  })
  return c
})

/* ── responder leaderboard ── */
const leaderboard = computed(() => {
  const L = admin.value?.leaderboard
  if (Array.isArray(L) && L.length) {
    return L.slice(0, 6).map(x => ({
      name: x.name || '—',
      v: x.resolved_30d ?? 0,
      sub: `${x.resolved_30d ?? 0} resolved${x.mttr_minutes != null ? ` · MTTR ${hm(x.mttr_minutes)}` : ''}`,
    }))
  }
  const rl = stats.value?.critical?.responder_load || []
  return [...rl]
    .sort((a, b) => ((b.sev1 || 0) + (b.sev2 || 0)) - ((a.sev1 || 0) + (a.sev2 || 0)))
    .slice(0, 6)
    .map((x) => {
      const load = (x.sev1 || 0) + (x.sev2 || 0)
      return { name: x.name || '—', v: load, sub: `${load} active${x.unacked ? ` · ${x.unacked} unacked` : ''}` }
    })
})

/* ── on-call roster (roles cross-referenced from live MI seats) ── */
const roleByName = computed(() => {
  const map = {}
  miRows.value.forEach((r) => {
    if (r.incident_commander_name && !map[r.incident_commander_name]) map[r.incident_commander_name] = 'CMDR'
    if (r.comms_lead_name && !map[r.comms_lead_name]) map[r.comms_lead_name] = 'COMMS'
    if (r.ops_lead_name && !map[r.ops_lead_name]) map[r.ops_lead_name] = 'OPS'
  })
  return map
})
const roster = computed(() => {
  const rmap = roleByName.value
  const rl = stats.value?.critical?.responder_load || []
  let list = rl.map((x) => {
    const load = (x.sev1 || 0) + (x.sev2 || 0)
    return {
      name: x.name || '—', role: rmap[x.name] || 'RESP', on: load > 0,
      sub: load > 0 ? `${load} active${x.sev1 ? ' · SEV1' : ''}` : 'idle · standby',
    }
  })
  if (!list.length) {
    const seen = new Set()
    miRows.value.forEach((r) => {
      [['incident_commander_name', 'CMDR'], ['comms_lead_name', 'COMMS'], ['ops_lead_name', 'OPS']].forEach(([k, role]) => {
        const nm = r[k]
        if (nm && !seen.has(nm)) { seen.add(nm); list.push({ name: nm, role, on: true, sub: `${r.ticket_number}` }) }
      })
    })
  }
  return list.slice(0, 8)
})

/* ── category / service bars ── */
const maxCat = computed(() => Math.max(1, ...(stats.value?.by_category || []).map(c => c.count || 0)))

/* ── flow spark (14d) ── */
const sparkGeo = computed(() => {
  const t = stats.value?.trend_14d || []
  if (!t.length) return { created: '', resolved: '', area: '' }
  const max = Math.max(1, ...t.map(p => Math.max(p.created || 0, p.resolved || 0)))
  const n = t.length
  const X = i => (n <= 1 ? 4 : 4 + i * (272 / (n - 1)))
  const Y = v => 64 - (v / max) * 56
  const cPts = t.map((p, i) => `${X(i).toFixed(1)},${Y(p.created || 0).toFixed(1)}`)
  const rPts = t.map((p, i) => `${X(i).toFixed(1)},${Y(p.resolved || 0).toFixed(1)}`)
  return { created: cPts.join(' '), resolved: rPts.join(' '), area: `${cPts.join(' ')} ${X(n - 1).toFixed(1)},68 ${X(0).toFixed(1)},68` }
})
const trendSum = computed(() => {
  const t = stats.value?.trend_14d || []
  return { created: t.reduce((a, p) => a + (p.created || 0), 0), resolved: t.reduce((a, p) => a + (p.resolved || 0), 0) }
})

/* ── RCA governance ── */
const rca = computed(() => {
  const a = admin.value?.rca
  const owedFallback = stats.value?.missing_rca ?? 0
  if (!a) return { coverage: null, owed: owedFallback, pending: 0, returned: 0, validated: 0, stale: 0, cycle: null, review: null, kedb: null }
  return {
    coverage: a.coverage_pct, owed: a.owed ?? owedFallback, pending: a.pending ?? 0, returned: a.returned ?? 0,
    validated: a.validated ?? 0, stale: a.stale ?? 0, cycle: a.cycle_time_median_h, review: a.review_latency_median_h,
    kedb: a.kedb_known_errors,
  }
})
const rcaPipe = computed(() => [
  { k: 'owed', n: rca.value.owed, hot: rca.value.owed > 0, lens: 'owed' },
  { k: 'pending', n: rca.value.pending, hot: false, lens: 'pending' },
  { k: 'validated', n: rca.value.validated, hot: false, lens: 'validated' },
  { k: 'returned', n: rca.value.returned, hot: rca.value.returned > 0, lens: 'returned' },
  { k: 'stale', n: rca.value.stale, hot: rca.value.stale > 0, lens: 'stale' },
])

/* ── PIR pipeline ── */
const pir = computed(() => {
  const a = admin.value?.pir
  const s = stats.value?.pir || {}
  const src = a || s
  return {
    owed: src.owed ?? s.owed ?? s.missing ?? 0,
    draft: src.draft ?? 0, in_review: src.in_review ?? 0, approved: src.approved ?? 0, published: src.published ?? 0,
    actions_open: src.actions_open ?? s.actions_open ?? 0,
    actions_overdue: src.actions_overdue ?? stats.value?.actions_overdue ?? 0,
  }
})
const pirPipe = computed(() => [
  { k: 'draft', n: pir.value.draft, hot: false, status: 'draft' },
  { k: 'review', n: pir.value.in_review, hot: pir.value.in_review > 0, status: 'in_review' },
  { k: 'approved', n: pir.value.approved, hot: false, status: 'approved' },
  { k: 'published', n: pir.value.published, hot: false, status: 'published' },
])

/* ── exposure ── */
const exposure = computed(() => {
  const e = stats.value?.critical?.exposure || {}
  const bi = e.by_business_impact || {}
  return {
    revenue: e.revenue_flagged || 0, compliance: e.compliance || 0, security: e.security || 0,
    public: e.public || 0, unassessed: e.unassessed || 0,
    high: (bi.high || 0) + (bi.critical || 0), medium: bi.medium || 0, low: bi.low || 0,
  }
})
const maxImpact = computed(() => Math.max(1, exposure.value.high, exposure.value.medium, exposure.value.low))

/* ── SLA burn + aging ── */
const slaSplit = computed(() => {
  const s = stats.value?.sla || {}
  const total = Math.max(1, (s.met || 0) + (s.breached || 0) + (s.at_risk || 0))
  const r = (v) => Math.round(((v || 0) / total) * 100)
  return { metPct: r(s.met), riskPct: r(s.at_risk), breachedPct: r(s.breached) }
})
const aging = computed(() => {
  const ladder = extras.value?.aging_ladder
  if (Array.isArray(ladder) && ladder.length) {
    return ladder.slice(0, 3).map(x => ({ label: x.label ?? x.bucket ?? '', count: x.count ?? x.value ?? 0, hot: /8h|14/.test(String(x.label ?? x.bucket ?? '')) }))
  }
  const b = { '>8h': 0, '4-8h': 0, '2-4h': 0 }
  ;(rows.value || []).forEach((r) => {
    if (r.sla_resolution_breached || r.sla_paused_since || !r.resolution_due_at) return
    const h = (new Date(r.resolution_due_at).getTime() - now.value) / 3600000
    if (h < 0) return
    if (h > 8) b['>8h']++; else if (h > 4) b['4-8h']++; else if (h > 2) b['2-4h']++
  })
  return [
    { label: '>8h', count: b['>8h'], hot: b['>8h'] > 0 },
    { label: '4-8h', count: b['4-8h'], hot: false },
    { label: '2-4h', count: b['2-4h'], hot: false },
  ]
})
const nextBreach = computed(() => {
  const nb = extras.value?.next_breach
  let due = null
  if (nb) due = typeof nb === 'string' ? nb : (nb.resolution_due_at || nb.at || null)
  if (!due) {
    let min = Infinity
    ;(rows.value || []).forEach((r) => {
      if (r.sla_resolution_breached || r.sla_paused_since || !r.resolution_due_at) return
      const t = new Date(r.resolution_due_at).getTime()
      if (t > now.value && t < min) min = t
    })
    if (min !== Infinity) due = new Date(min).toISOString()
  }
  return fmtCountdown(due)
})

/* ── per-team + CSAT ── */
const perTeam = computed(() => {
  const pt = admin.value?.per_team
  if (Array.isArray(pt) && pt.length) {
    return pt.slice(0, 6).map(t => ({
      name: t.team_name || '—', active: t.active ?? 0, sla: t.sla_met_pct, mttr: t.mttr_minutes, csat: t.csat_avg, reopen: t.reopen_pct,
    }))
  }
  const g = {}
  ;(rows.value || []).forEach((r) => { const k = r.team_name || 'Unrouted'; g[k] = (g[k] || 0) + 1 })
  return Object.entries(g).sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([name, active]) => ({ name, active, sla: null, mttr: null, csat: null, reopen: null }))
})
const maxTeam = computed(() => Math.max(1, ...perTeam.value.map(t => t.active || 0)))
const csat = computed(() => {
  const q = extras.value?.quality
  const avg = q?.csat_avg ?? null
  return {
    avg, positivePct: avg != null ? Math.round((avg / 5) * 100) : null,
    reopen: q?.reopen_rate_pct ?? null, n: q?.csat_responses ?? null,
  }
})
const csatArc = computed(() => (csat.value.avg != null ? (csat.value.avg / 5) * 150.8 : 0))

/* ── live audit feed ── */
const feed = computed(() => (stats.value?.feed || []).slice(0, 8))
const FEED_VERBS = {
  created: 'Raised', acknowledged: 'Acknowledged', escalated: 'Escalated', status_changed: 'Status moved',
  resolved: 'Resolved', closed: 'Closed', major_incident: 'MI declared', incident_sev_changed: 'Reclassified',
  decision_logged: 'Decision logged', incident_roles_set: 'Roster staffed', mi_proposed: 'MI proposed',
  pir_created: 'PIR opened', pir_submitted: 'PIR submitted', pir_approved: 'PIR approved', pir_published: 'PIR published',
  rca_filed: 'RCA filed', rca_reviewed: 'RCA validated', reopened: 'Reopened',
}
const feedVerb = (a) => FEED_VERBS[a] || (a || '').replace(/_/g, ' ')
const feedTone = (a = '') => {
  const x = a.toLowerCase()
  if (x.includes('major') || x.includes('declared')) return 'a'
  if (x.includes('escalat')) return 'w'
  if (x.includes('resolv') || x.includes('published') || x.includes('closed')) return 'l'
  return 'c'
}

/* ── recurring / KEDB ── */
const recurring = computed(() => {
  const r = admin.value?.recurring
  if (!Array.isArray(r) || !r.length) return []
  const max = Math.max(1, ...r.map(x => x.count || 0))
  return r.slice(0, 6).map(x => ({
    sig: x.signature || x.suggested_problem_title || 'recurring fault',
    count: x.count || 0, kedb: !!x.has_open_problem, w: Math.round(((x.count || 0) / max) * 100),
  }))
})

/* ── export brief (client-side, from loaded data) ── */
const exportBrief = () => {
  const s = stats.value || {}
  const lines = [
    `# Incident Command Brief`,
    `_${new Date().toLocaleString()} · whole desk_`,
    '',
    `Active ${s.active_total ?? 0} · Major ${s.major_active ?? 0} · SEV1 ${s.by_sev?.sev1 ?? 0} · SEV2 ${s.by_sev?.sev2 ?? 0} · Unacked ${s.unacked ?? 0}`,
    `MTTA(30d) ${hm(s.mtta_minutes_30d)} · MTTR(month) ${hm(s.mttr_minutes_current_month)}${s.mttr_trend_pct != null ? ` (${s.mttr_trend_pct > 0 ? '+' : ''}${s.mttr_trend_pct}% m/m)` : ''}`,
    `SLA met ${slaSplit.value.metPct}% · Breached ${s.sla?.breached ?? 0} · Next breach ${nextBreach.value.txt}`,
    `RCA owed ${rca.value.owed} · PIR in review ${pir.value.in_review} · Actions overdue ${pir.value.actions_overdue}`,
    '',
    `## Active fleet (worst-first)`,
    ...fleet.value.slice(0, 25).map(r => `- SEV${r.sev} ${r.ticket_number} · ${r.subject} · ${r.team_name || '—'}`
      + `${r.is_major_incident ? ' · MI' : ''}${r.incident_commander_name ? ` · CMDR ${r.incident_commander_name}` : ''} · ${fleetSla(r).txt}`),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `incident-brief-${new Date().toISOString().slice(0, 10)}.md`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

onMounted(() => {
  refresh(false)
  mq?.addEventListener?.('change', onReducedChange)
  if (hasWin && 'MutationObserver' in window) {
    cinematicObs = new MutationObserver(onReducedChange)
    cinematicObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-cinematic'] })
  }
  tick = setInterval(() => { now.value = Date.now() }, 1000)
  poll = setInterval(() => { if (document.visibilityState === 'visible') refresh(true) }, 60000)
})
onBeforeUnmount(() => {
  clearInterval(tick); clearInterval(poll)
  mq?.removeEventListener?.('change', onReducedChange)
  cinematicObs?.disconnect()
})
</script>

<style scoped>
.ifd {
  --l2: #60a5fa; --l3: #c084fc; --gold: #eab308; --warn: #fbbf24; --auto: #a8a29e;
  --warn-soft: rgba(251, 191, 36, 0.14);
  display: flex; flex-direction: column; gap: 16px;
}
[data-theme="light"] .ifd {
  --l2: #2563eb; --l3: #7c3aed; --gold: #a16207; --warn: #b45309; --auto: #78716c;
  --warn-soft: rgba(180, 83, 9, 0.12);
}

/* ── header ── */
.hd { display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap; }
.hd-lead { flex: 1; min-width: 260px; }
.eye { display: inline-flex; align-items: center; gap: 7px; font-size: 10px; font-weight: 800;
  letter-spacing: 0.2em; color: var(--sd-fun-core); }
.hd-title { margin: 5px 0 0; font-size: clamp(19px, 2.3vw, 27px); font-weight: 350; line-height: 1.1;
  letter-spacing: -0.01em; color: var(--sd-text); }
.hd-title em { font-style: normal; font-weight: 700; background: var(--sd-fun-grad);
  -webkit-background-clip: text; background-clip: text; color: transparent; }
.sub { margin-top: 5px; font-size: 10.5px; color: var(--sd-text-muted); line-height: 1.5; }
.hd-actions { display: flex; align-items: center; gap: 8px; }
.hd-ghost { display: inline-grid; place-items: center; width: 34px; height: 34px; border-radius: 9px;
  cursor: pointer; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border); }
.hd-ghost:hover { color: var(--sd-text); border-color: var(--sd-fun-brd); }
.hd-cta { display: inline-flex; align-items: center; gap: 8px; padding: 9px 15px; border-radius: 9px;
  cursor: pointer; font-size: 12px; font-weight: 800; color: #1a1206; border: 0;
  background: var(--sd-fun-grad); box-shadow: var(--sd-fun-glow); }
[data-theme="light"] .hd-cta { color: #fff8ec; }
.spin { animation: sd-spin-slow 1.1s linear infinite; }

/* ── exec KPI rail ── */
.kpis { display: grid; grid-template-columns: repeat(10, 1fr); gap: 8px; }
.kpi { position: relative; overflow: hidden; padding: 9px 10px; border-radius: 11px; text-align: left;
  cursor: pointer; background: var(--sd-card); border: 1px solid var(--sd-border);
  transition: border-color 0.2s var(--sd-spring), transform 0.2s var(--sd-spring); }
.kpi:hover { border-color: var(--sd-fun-brd); transform: translateY(-2px); }
.kpi .n { font-size: 17px; font-weight: 800; line-height: 1; color: var(--sd-text); }
.kpi .k { margin-top: 3px; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--sd-text-muted); }
.kpi .dl { margin-top: 2px; font-size: 8px; color: var(--sd-fun-resolved); }
.kpi .dl.bad { color: var(--sd-fun-esc); }
.kpi.esc .n { color: var(--sd-fun-esc); }
.kpi.warn .n { color: var(--warn); }
.kpi.live .n { color: var(--sd-fun-resolved); }
.kpi.gold .n { color: var(--gold); }

/* ── grid ── */
.grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 12px; grid-auto-flow: dense; align-items: start; }
.card { border-radius: 13px; padding: 12px 13px; background: var(--sd-card); border: 1px solid var(--sd-border);
  box-shadow: var(--sd-shadow); min-width: 0; }
.c3 { grid-column: span 3; } .c4 { grid-column: span 4; } .c5 { grid-column: span 5; } .c8 { grid-column: span 8; }

.ch { display: flex; align-items: center; gap: 7px; margin-bottom: 10px; }
.ch .dot { color: var(--sd-fun-core); flex-shrink: 0; }
.ch h3 { margin: 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;
  color: var(--sd-text); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ch .mo { font-size: 8.5px; letter-spacing: 0.1em; color: var(--sd-text-muted); flex-shrink: 0; }
.lv { display: inline-flex; align-items: center; gap: 4px; font-size: 8.5px; letter-spacing: 0.1em;
  color: var(--sd-fun-resolved); background: none; border: 0; cursor: pointer; font-family: var(--sd-mono); flex-shrink: 0; }
.lv i { width: 5px; height: 5px; border-radius: 50%; background: var(--sd-fun-resolved);
  animation: sd-inc-led 1.8s ease-in-out infinite; }

.empty { margin: 6px 0 0; font-size: 11.5px; color: var(--sd-text-muted); line-height: 1.5; }
.empty-hot { color: var(--warn); font-weight: 700; }
.dim { color: var(--sd-text-muted); font-style: normal; font-weight: 500; }
.scroll { max-height: 262px; overflow-y: auto; scrollbar-width: thin; }

/* ── rows (fleet) ── */
.rows { display: flex; flex-direction: column; gap: 1px; }
.row { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px; border-radius: 7px;
  border: 1px solid transparent; background: transparent; cursor: pointer; text-align: left; }
.row:hover { background: var(--sd-fun-soft); border-color: var(--sd-fun-brd); }
.sev { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.sev.s1 { background: var(--sd-fun-esc); box-shadow: 0 0 6px var(--sd-fun-esc); }
.sev.s2 { background: var(--warn); }
.sev.s3 { background: var(--sd-fun-core); }
.sev.s4 { background: var(--auto); }
.no { font-size: 10px; font-weight: 700; color: var(--sd-fun-core); width: 56px; flex-shrink: 0; }
.bd { flex: 1; min-width: 0; }
.bd .s { display: block; font-size: 11.5px; font-weight: 600; color: var(--sd-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bd .m { display: block; font-size: 8.5px; color: var(--sd-text-muted);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sla { font-size: 10px; font-weight: 700; flex-shrink: 0; }
.sla.bad { color: var(--sd-fun-esc); } .sla.warn { color: var(--warn); } .sla.ok { color: var(--sd-fun-resolved); }

/* ── MI command ── */
.mi-list { display: flex; flex-direction: column; gap: 7px; }
.mi { position: relative; width: 100%; text-align: left; cursor: pointer; border-radius: 9px; padding: 10px;
  background: radial-gradient(120% 100% at 100% 0%, var(--sd-fun-esc-soft), transparent 60%), var(--sd-surface-elevated);
  border: 1px solid color-mix(in srgb, var(--sd-fun-esc) 55%, transparent); }
.mi:hover { border-color: var(--sd-fun-esc); }
.mi .f { font-size: 9px; font-weight: 800; letter-spacing: 0.1em; color: var(--sd-fun-esc); }
.mi .cl { float: right; font-size: 15px; font-weight: 800; color: var(--sd-fun-esc); line-height: 1; }
.mi .cl.warn { color: var(--warn); } .mi .cl.ok { color: var(--sd-fun-resolved); }
.mi h4 { margin: 5px 0 2px; font-size: 12px; font-weight: 650; color: var(--sd-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mi .ro { font-size: 8.5px; color: var(--sd-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ph { display: flex; gap: 3px; margin-top: 7px; }
.ph .p { flex: 1; text-align: center; padding: 3px 1px; border-radius: 5px; font-size: 7px; font-weight: 700;
  letter-spacing: 0.04em; background: var(--sd-fun-soft); color: var(--sd-text-muted); }
.ph .p.done { background: var(--sd-fun-resolved-soft); color: var(--sd-fun-resolved); }
.ph .p.now { background: var(--sd-fun-grad); color: #1a1206; font-weight: 800; }
[data-theme="light"] .ph .p.now { color: #fff8ec; }

/* ── mibar (shared footer strip) ── */
.mibar { display: flex; flex-wrap: wrap; gap: 8px 10px; margin-top: 8px; font-size: 9px; color: var(--sd-text-muted); }
.mibar b { color: var(--sd-text-secondary); font-weight: 700; }
.mibar b.esc { color: var(--sd-fun-esc); } .mibar b.warn { color: var(--warn); } .mibar b.ok { color: var(--sd-fun-resolved); }
.mibar .ok { color: var(--sd-fun-resolved); }
.mibar .hot b { color: var(--sd-fun-esc); }

/* ── heatmap ── */
.heatrow { display: grid; grid-template-columns: 22px 1fr; gap: 6px; align-items: center; margin-bottom: 3px; }
.heatrow .tg { font-size: 8px; font-weight: 800; }
.heatrow.l1 .tg { color: var(--sd-fun-core); }
.heatrow.l2 .tg { color: var(--l2); }
.heatrow.l3 .tg { color: var(--l3); }
.heat { display: grid; grid-template-columns: repeat(24, 1fr); gap: 2px; }
.heat .c { aspect-ratio: 1; border-radius: 2px; background: var(--sd-fun-soft); }
.heat .c.lo { background: var(--warn-soft); }
.heat .c.md { background: var(--sd-fun-esc-soft); }
.heat .c.hi { background: var(--sd-fun-esc); }

/* ── leaderboard ── */
.lead { display: flex; flex-direction: column; gap: 6px; }
.lr { display: flex; align-items: center; gap: 8px; }
.lr .rk { font-size: 10px; color: var(--sd-text-muted); width: 12px; flex-shrink: 0; }
.lr .av { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 6px; flex-shrink: 0;
  font-size: 9px; font-weight: 800; color: #1a1206; background: var(--sd-fun-grad); }
[data-theme="light"] .lr .av { color: #fff8ec; }
.lr .nm { flex: 1; min-width: 0; font-size: 11px; font-weight: 600; color: var(--sd-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lr .nm span { display: block; font-size: 8px; font-weight: 500; color: var(--sd-text-muted); }
.lr .v { font-size: 11px; font-weight: 800; color: var(--sd-fun-core); flex-shrink: 0; }

/* ── roster ── */
.roster { display: flex; flex-direction: column; gap: 6px; }
.ro { display: flex; align-items: center; gap: 8px; }
.ro .st { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.ro .st.on { background: var(--sd-fun-resolved); box-shadow: 0 0 6px var(--sd-fun-resolved); }
.ro .st.idle { background: var(--auto); }
.ro .nm { flex: 1; min-width: 0; font-size: 11px; color: var(--sd-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ro .nm span { display: block; font-size: 8px; color: var(--sd-text-muted); }
.ro .rl { font-size: 8px; font-weight: 800; padding: 2px 6px; border-radius: 5px; flex-shrink: 0;
  background: var(--sd-fun-soft); color: var(--sd-fun-core); }

/* ── bars (category / exposure / sla / per-team / recurring) ── */
.bars { display: flex; flex-direction: column; gap: 5px; }
.bars.tight { gap: 4px; }
.br { display: flex; align-items: center; gap: 7px; width: 100%; background: none; border: 0; cursor: default;
  text-align: left; padding: 0; }
button.br { cursor: pointer; }
.br .k { font-size: 10px; color: var(--sd-text-secondary); width: 78px; flex-shrink: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.br .k.wide { width: 190px; }
.br .t { flex: 1; height: 6px; border-radius: 3px; background: var(--sd-border); overflow: hidden; }
.br .t i { display: block; height: 100%; border-radius: 3px; background: var(--sd-fun-grad);
  transition: width 0.7s var(--sd-spring); }
.br .t i.hot, .br .t i.esc { background: var(--sd-fun-esc); }
.br .t i.warn { background: var(--warn); }
.br .t i.live { background: var(--sd-fun-resolved); }
.br .v { font-size: 9.5px; font-weight: 700; color: var(--sd-text); width: 52px; text-align: right; flex-shrink: 0; }
.br .v .brc, .br .v .kedb { font-style: normal; color: var(--sd-fun-esc); font-weight: 700; }
.br .v .dim { font-style: normal; color: var(--sd-text-muted); font-weight: 500; }
.ifd:not(.is-ready) .grow { width: 0 !important; }

/* ── flow spark ── */
.spark { width: 100%; height: 66px; display: block; }
.sp-area { fill: var(--sd-fun-soft); stroke: none; }
.sp-in { fill: none; stroke: var(--sd-fun-core); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round;
  stroke-dasharray: 900; stroke-dashoffset: 900; animation: ifd-draw 1.4s var(--sd-spring) forwards; }
.sp-out { fill: none; stroke: var(--sd-fun-resolved); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round;
  stroke-dasharray: 900; stroke-dashoffset: 900; animation: ifd-draw 1.4s 0.25s var(--sd-spring) forwards; }
@keyframes ifd-draw { to { stroke-dashoffset: 0; } }

/* ── pipeline chips ── */
.pipe { display: flex; gap: 3px; }
.pf { flex: 1; padding: 8px 4px; border-radius: 7px; cursor: pointer; text-align: center;
  background: var(--sd-surface-elevated); border: 1px solid var(--sd-border); transition: all 0.2s var(--sd-spring); }
.pf:hover { border-color: var(--sd-fun-brd); transform: translateY(-2px); }
.pf.hot { border-color: color-mix(in srgb, var(--sd-fun-core) 50%, transparent); background: var(--sd-fun-soft); }
.pf b { display: block; font-size: 14px; font-weight: 800; color: var(--sd-text); }
.pf span { font-size: 7.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--sd-text-muted); }

/* ── exposure flags ── */
.flags { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 9px; }
.fl { font-size: 9px; font-weight: 700; padding: 4px 8px; border-radius: 6px; font-family: var(--sd-mono);
  color: var(--sd-text-secondary); background: var(--sd-surface-elevated); border: 1px solid var(--sd-border); }
.fl b { color: var(--sd-fun-esc); }
.fl.ok b { color: var(--sd-fun-resolved); }

/* ── csat ── */
.csat { display: flex; align-items: center; gap: 12px; margin-top: 10px; }
.csat svg { width: 56px; height: 56px; flex-shrink: 0; }
.csat-arc { transition: stroke-dashoffset 0.9s var(--sd-spring); }
.csat .big { font-size: 20px; font-weight: 800; color: var(--sd-text); }
.csat .sm { font-size: 10px; color: var(--sd-text-secondary); }
.csat .sm b { color: var(--sd-fun-resolved); }

/* ── feed ── */
.feed { display: flex; flex-direction: column; gap: 4px; max-height: 220px; overflow-y: auto; scrollbar-width: thin; }
.fr { display: flex; align-items: center; gap: 7px; width: 100%; padding: 3px 4px; border-radius: 6px;
  border: 1px solid transparent; background: none; cursor: pointer; text-align: left; font-size: 10.5px;
  color: var(--sd-text-secondary); }
.fr:hover { background: var(--sd-fun-soft); border-color: var(--sd-fun-brd); }
.fr .d { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.fr .d.a { background: var(--sd-fun-esc); } .fr .d.w { background: var(--warn); }
.fr .d.l { background: var(--sd-fun-resolved); } .fr .d.c { background: var(--sd-fun-core); }
.fr .ft { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fr .ft .fsub { font-style: normal; color: var(--sd-text-muted); }
.fr .tm { margin-left: auto; font-size: 8px; color: var(--sd-text-muted); flex-shrink: 0; }

/* ── responsive ── */
@media (max-width: 1200px) {
  .grid { grid-template-columns: repeat(6, 1fr); }
  .c8, .c5 { grid-column: span 6; } .c4 { grid-column: span 3; } .c3 { grid-column: span 3; }
  .kpis { grid-template-columns: repeat(5, 1fr); }
}
@media (max-width: 620px) {
  .grid { grid-template-columns: 1fr; }
  .c3, .c4, .c5, .c8 { grid-column: span 1; }
  .kpis { grid-template-columns: repeat(2, 1fr); }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .spin,
  html:not([data-cinematic="on"]) .lv i,
  html:not([data-cinematic="on"]) .ro .st.on,
  html:not([data-cinematic="on"]) .sp-in,
  html:not([data-cinematic="on"]) .sp-out { animation: none !important; }
  html:not([data-cinematic="on"]) .sp-in, html:not([data-cinematic="on"]) .sp-out { stroke-dashoffset: 0; }
  html:not([data-cinematic="on"]) .br .t i,
  html:not([data-cinematic="on"]) .csat-arc { transition: none !important; }
}
</style>
