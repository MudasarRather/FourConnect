<template>
  <div class="sd-pulse-dash">
    <!-- ░░░░ THE TERMINAL — one merged mega-hero (masthead + exchange screen + tape + lenses) ░░░░ -->
    <Motion as="section" class="pd-hero" ref="heroRef"
      :initial="{ opacity: 0, y: 20 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }"
      @mousemove="onMove" @mouseleave="resetMove">

      <!-- ambient atmosphere -->
      <div class="pd-atm" aria-hidden="true">
        <span class="orb a1" :style="orbStyle(1)" />
        <span class="orb a2" :style="orbStyle(0.6)" />
        <span class="orb a3" :style="orbStyle(0.35)" />
        <span class="orb a4" :style="orbStyle(-0.45)" />
        <span class="pd-grain sd-grain" />
        <span class="pd-gridmap" />
        <svg class="pd-mesh" viewBox="0 0 1200 400" preserveAspectRatio="none">
          <path class="mesh-line" d="M-50,330 C300,250 520,360 760,250 C980,150 1100,230 1260,150" />
          <path class="mesh-line m2" d="M-50,250 C260,180 480,300 720,190 C940,90 1120,180 1260,90" />
          <path class="mesh-line m3" d="M-50,380 C320,320 560,400 820,310 C1020,240 1160,300 1260,230" />
        </svg>
      </div>

      <div class="pd-hero-inner">
        <!-- LEFT — the lead -->
        <div class="pd-lead">
          <Motion as="p" class="pd-eyebrow sd-mono" :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }" :transition="t(0)">
            <span class="eb-glyph"><span class="eb-ring" /><span class="eb-core" /></span>
            SUPPORT · {{ isAgent ? 'DESK TERMINAL' : 'YOUR DESK' }}
            <span class="eb-sep" />
            <span class="eb-live"><i class="eb-dot" /> LIVE</span>
          </Motion>

          <h1 class="pd-title">
            <Motion as="span" class="tl" :initial="{ opacity: 0, y: 30 }" :animate="{ opacity: 1, y: 0 }" :transition="t(0.06)">
              {{ isAgent ? 'The Support' : 'Your Support' }}
            </Motion>
            <Motion as="span" class="tl grad" :initial="{ opacity: 0, y: 30 }" :animate="{ opacity: 1, y: 0 }" :transition="t(0.14)">
              {{ isAgent ? 'Terminal' : 'Desk' }}
            </Motion>
          </h1>

          <Motion as="p" class="pd-sub" :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="t(0.22)">
            {{ headline }}
          </Motion>

          <!-- CTA row -->
          <Motion as="div" class="pd-cta" :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="t(0.3)">
            <Motion as="button" type="button" class="pd-btn primary"
              :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }" @click="createOpen = true">
              <Plus :size="15" /><span>Raise a ticket</span>
            </Motion>
            <Motion v-if="isAgent" as="button" type="button" class="pd-btn"
              :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }" @click="goTab('all')">
              <LayoutGrid :size="15" /><span>Open desk</span>
            </Motion>
            <Motion as="button" type="button" class="pd-btn"
              :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }" @click="goTab('my')">
              <Ticket :size="15" /><span>My tickets</span>
            </Motion>
            <Motion as="button" type="button" class="pd-btn ghost"
              :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }" @click="$emit('go', 'knowledge-base')">
              <BookOpen :size="15" /><span>Knowledge base</span>
            </Motion>
          </Motion>

          <!-- live status strip -->
          <Motion as="div" class="pd-status" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :transition="t(0.4)">
            <span class="pd-clockchip sd-mono"><i />{{ clock }}</span>
            <template v-if="isAgent && ag">
              <span class="pd-stat"><b>SLA</b> {{ ag.sla_compliance_pct_30d != null ? ag.sla_compliance_pct_30d + '%' : '—' }}</span>
              <span class="pd-stat"><b>MTTR</b> {{ fmtMin(ag.mttr_minutes_30d) }}</span>
              <span class="pd-stat" :class="{ hot: (ag.breached_active || 0) > 0 }"><b>BREACHED</b> {{ ag.breached_active ?? 0 }}</span>
              <span class="pd-stat"><b>CSAT</b> {{ ag.csat_avg_30d != null ? ag.csat_avg_30d + '★' : '—' }}</span>
            </template>
            <template v-else>
              <span class="pd-stat"><b>OPEN</b> {{ me.open ?? 0 }}</span>
              <span class="pd-stat"><b>IN PROGRESS</b> {{ me.in_progress ?? 0 }}</span>
              <span class="pd-stat up"><b>RESOLVED</b> {{ me.resolved ?? 0 }}</span>
            </template>
          </Motion>
        </div>

        <!-- RIGHT — the exchange screen (a lit terminal on the desk, tilted by the pointer) -->
        <Motion as="div" class="pd-screen-wrap"
          :initial="{ opacity: 0, scale: 0.9, y: 14 }" :animate="{ opacity: 1, scale: 1, y: 0 }"
          :transition="{ duration: 0.8, delay: 0.18, ease: [0.16, 1, 0.3, 1] }">
          <div class="pd-screen" :style="screenTilt">
            <span class="scr-scan" aria-hidden="true" />
            <span class="scr-grain" aria-hidden="true" />
            <span class="scr-flare" aria-hidden="true" />

            <!-- agents: 14-day exchange chart · everyone else: personal channel board -->
            <SdTerminalInstrument v-if="isAgent" :agent="ag" />
            <div v-else class="pd-chan">
              <header class="ch-head">
                <span class="ch-title sd-mono"><i class="ti-dot" /> DESK CHANNELS · LIVE</span>
              </header>
              <div class="ch-readout" :class="{ clear: !chActive }">
                <span class="chr-n sd-mono">{{ chActive || '✓' }}</span>
                <span class="chr-l sd-mono">{{ chActive ? (chActive === 1 ? 'TICKET ACTIVE' : 'TICKETS ACTIVE') : 'ALL CLEAR' }}</span>
              </div>
              <div class="ch-rows">
                <div v-for="(c, i) in channels" :key="c.key" class="ch-row" :style="{ '--i': i }">
                  <span class="ch-key sd-mono">{{ c.label }}</span>
                  <span class="ch-bar"><i :class="c.tone" :style="{ '--w': c.pct + '%' }" /></span>
                  <span class="ch-n sd-mono">{{ c.n }}</span>
                </div>
              </div>
            </div>
          </div>
        </Motion>
      </div>

      <!-- full-bleed ticker tape — the hero's own Bloomberg strip -->
      <Motion as="div" class="pd-tape" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :transition="t(0.5)">
        <div class="pd-reel">
          <span v-for="(m, i) in tapeLoop" :key="i" class="tk" :class="m.tone">
            <b>{{ m.label }}</b><em>{{ m.val }}</em>
          </span>
        </div>
        <span class="tape-fade l" aria-hidden="true" /><span class="tape-fade r" aria-hidden="true" />
      </Motion>

      <!-- telemetry lenses docked in the hero -->
      <div class="pd-lenses">
        <Motion as="button" v-for="(l, i) in personalLenses" :key="l.key" type="button" class="lens"
          :style="{ '--lc': l.accent }"
          :initial="{ opacity: 0, y: 18, filter: 'blur(7px)' }" :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
          :transition="{ duration: 0.5, delay: 0.5 + i * 0.07, ease: [0.16, 1, 0.3, 1] }"
          :while-hover="{ y: -3 }" :while-tap="{ scale: 0.97 }" @click="goTab('my')">
          <span class="lens-ic"><component :is="l.icon" :size="15" /></span>
          <span class="lens-body">
            <span class="lens-n"><SdCountUp :value="Number(l.value) || 0" /></span>
            <span class="lens-lbl">{{ l.label }}</span>
            <span class="lens-sub sd-mono">{{ l.sub }}</span>
          </span>
          <span v-if="l.live" class="lens-live" aria-hidden="true"><i /></span>
          <span class="lens-bar" />
        </Motion>
      </div>
    </Motion>

    <!-- ░░ AGENT COMMAND LAYER — only for support agents ░░ -->
    <Presence>
      <Motion v-if="isAgent" class="pd-command" :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">

        <!-- radial gauge bank -->
        <div class="pd-gauges">
          <SdPulseGauge mode="ring" :fraction="g.slaFrac" :display="g.slaText" label="SLA compliance"
            caption="30-day" :accent="g.slaAccent" :index="0" clickable @activate="goTab('resolved')" />
          <SdPulseGauge mode="arc" :fraction="g.mttaFrac" :display="fmtMin(ag && ag.mtta_minutes_30d)" label="MTTA"
            caption="mean ack" :accent="'var(--pulse)'" :index="1" clickable @activate="goTab('critical')" />
          <SdPulseGauge mode="arc" :fraction="g.mttrFrac" :display="fmtMin(ag && ag.mttr_minutes_30d)" label="MTTR"
            caption="mean resolve" :accent="'var(--pulse-ember)'" :index="2" clickable @activate="goTab('resolved')" />
          <SdPulseGauge mode="ring" :fraction="g.csatFrac" :display="g.csatText" label="CSAT"
            :caption="ag ? (ag.csat_count_30d + ' rated') : ''" :accent="g.csatAccent" :index="3" clickable @activate="goTab('resolved')" />
          <SdPulseGauge mode="arc" :fraction="g.reopenFrac" :display="g.reopenText" label="Reopen rate"
            caption="30-day" :accent="g.reopenAccent" :index="4" clickable @activate="goTab('reopened')" />
        </div>

        <!-- desk situational lenses -->
        <div class="pd-desk-lenses">
          <SdKpiTile v-for="(k, i) in deskLenses" :key="k.key" :icon="k.icon" :label="k.label" :value="k.value"
            :accent="k.accent" :sub="k.sub" :index="i" :live="k.live" clickable @activate="goTab(k.tab)" />
        </div>

        <!-- at-risk rail + team roster -->
        <div class="pd-ops-grid">
          <SdPulseAtRisk :items="ag ? ag.at_risk : []" @open="drawerId = $event" @go="goTab('overdue')" />

          <section class="pd-roster sd-card">
            <header class="pd-ph">
              <h3><Users :size="15" /> Team roster</h3>
              <button class="pd-link" @click="goTab('team')">Team ops →</button>
            </header>

            <div v-if="ag && ag.fastest_lap && ag.fastest_lap.count" class="pd-lap">
              <span class="lap-medal"><Award :size="14" /></span>
              <span><b>{{ ag.fastest_lap.name || 'A teammate' }}</b> leads today — {{ ag.fastest_lap.count }} resolved</span>
            </div>

            <div v-if="roster.length" class="rst-rows">
              <div v-for="(m, i) in roster" :key="i" class="rst-row" :style="{ '--i': i }">
                <span class="rst-ava" aria-hidden="true">{{ m.initials }}</span>
                <span class="rst-main">
                  <span class="rst-name">{{ m.name || 'Agent' }}</span>
                  <span class="rst-bar"><i :style="{ '--w': m.pct + '%' }" /></span>
                </span>
                <span class="rst-nums">
                  <span class="rst-open sd-mono">{{ m.open }}</span>
                  <span v-if="m.breaching" class="rst-brc sd-mono" title="breaching">{{ m.breaching }}</span>
                  <span v-if="m.critical" class="rst-crit sd-mono" title="critical">{{ m.critical }}</span>
                </span>
              </div>
            </div>
            <div v-else class="pd-mini-empty">
              <p>No active team load — the queue is clear.</p>
            </div>

            <!-- priority spread -->
            <div v-if="prioTotal" class="pd-prio">
              <span class="pd-prio-label sd-mono">OPEN DESK · PRIORITY MIX</span>
              <div class="pd-prio-bar">
                <i v-for="p in prioSpread" :key="p.key" :class="'pri-' + p.key" :style="{ width: p.pct + '%' }"
                  :title="`${p.label}: ${p.n}`" />
              </div>
              <div class="pd-prio-legend">
                <span v-for="p in prioSpread.filter(x => x.n)" :key="p.key"><i :class="'pri-' + p.key" />{{ p.label }} {{ p.n }}</span>
              </div>
            </div>
          </section>
        </div>
      </Motion>
    </Presence>

    <!-- ░░ Personal panels (everyone) ░░ -->
    <div class="pd-grid">
      <!-- flight strips — my recent tickets -->
      <section class="sd-card pd-panel pd-recent">
        <header class="pd-ph"><h3><Ticket :size="15" /> My recent tickets</h3><button class="pd-link" @click="goTab('my')">View all →</button></header>
        <div v-if="recent.length" class="fs-rows">
          <button v-for="(tk, i) in recent" :key="tk.id" class="fs-row" :style="{ '--i': i, '--pc': priColor(tk.priority) }"
            @click="drawerId = String(tk.id)">
            <span class="fs-spine" aria-hidden="true" />
            <span class="fs-main">
              <span class="fs-top">
                <span class="fs-no sd-mono">{{ tk.ticket_number }}</span>
                <SdPill kind="priority" :value="tk.priority" />
                <span class="fs-ago sd-mono">{{ agoShort(tk.updated_at || tk.created_at) }}</span>
              </span>
              <span class="fs-subj">{{ tk.subject }}</span>
            </span>
            <span class="fs-journey" :title="statusLabel(tk.status)">
              <i v-for="n in 3" :key="n" class="fs-step"
                :class="{ on: stepOf(tk.status) >= n - 1, done: stepOf(tk.status) === 2, spark: stepOf(tk.status) === n - 1 && stepOf(tk.status) < 2 }" />
            </span>
            <SdPill kind="status" :value="tk.status" />
          </button>
        </div>
        <div v-else class="pd-empty">
          <span class="pe-ico"><Inbox :size="26" /></span>
          <p>{{ recentLoading ? 'Loading your tickets…' : 'No tickets yet — raise one and we’ll take it from here.' }}</p>
          <button v-if="!recentLoading" class="pd-btn primary sm" @click="createOpen = true"><Plus :size="14" /> Raise a ticket</button>
        </div>
      </section>

      <!-- quick help -->
      <section class="sd-card pd-panel pd-help">
        <header class="pd-ph"><h3><Sparkles :size="15" /> Quick help</h3></header>
        <Motion v-for="(h, i) in HELP" :key="h.key" as="button" type="button" class="qh-card"
          :initial="{ opacity: 0, x: 16 }" :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.45, delay: 0.15 + i * 0.08, ease: [0.16, 1, 0.3, 1] }"
          :while-hover="{ x: 4 }" :while-tap="{ scale: 0.98 }" @click="onHelp(h.key)">
          <span class="qh-ico"><component :is="h.icon" :size="18" /></span>
          <span class="qh-text"><b>{{ h.title }}</b><small>{{ h.sub }}</small></span>
          <span class="qh-arr"><ChevronRight :size="16" /></span>
          <span class="qh-sheen" aria-hidden="true" />
        </Motion>
      </section>
    </div>

    <!-- Raise-a-ticket modal + adaptive drawer -->
    <SdModalShell :open="createOpen" eyebrow="Support · New" title="Raise a support ticket" width="620px" @close="createOpen = false">
      <SdNewTicketSection embedded @changed="onCreated" @go="onCreateGo" />
    </SdModalShell>
    <SdTicketDrawer :ticket-id="drawerId" @close="drawerId = null" @changed="onDrawerChanged" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  Plus, Ticket, BookOpen, Inbox, Hourglass, Activity, CheckCircle2, Layers,
  Sparkles, Megaphone, ChevronRight, LayoutGrid, AlertTriangle, Timer,
  Users, Award, Flame, HandHelping,
} from 'lucide-vue-next'
import SdKpiTile from '../components/SdKpiTile.vue'
import SdCountUp from '../components/SdCountUp.vue'
import SdPill from '../components/SdPill.vue'
import SdModalShell from '../components/SdModalShell.vue'
import SdTerminalInstrument from '../components/SdTerminalInstrument.vue'
import SdPulseGauge from '../components/SdPulseGauge.vue'
import SdPulseAtRisk from '../components/SdPulseAtRisk.vue'
import SdNewTicketSection from './SdNewTicketSection.vue'
import SdTicketDrawer from '../drawers/SdTicketDrawer.vue'
import { listMyTickets, statusLabel, priorityColor, fetchTicketPulse } from '@/composables/useSupportDesk'

const props = defineProps({
  selfDashboard: { type: Object, default: null },
  opsDashboard: { type: Object, default: null },
  agentReveal: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['go', 'changed'])

const route = useRoute()
const router = useRouter()
const t = (delay = 0) => ({ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] })
const priColor = (v) => priorityColor(v)

/* ── data ── */
const pulse = ref(null)
const loadPulse = async () => {
  try { pulse.value = await fetchTicketPulse() } catch { pulse.value = null }
}
const me = computed(() => pulse.value?.me || props.selfDashboard || {})
const ag = computed(() => pulse.value?.agent || null)
// Command layer visibility keys off the parent's settled agent probe (not pulse arrival).
const isAgent = computed(() => props.agentReveal || !!ag.value)

const ticketsBase = computed(() => (route.path.startsWith('/user') ? '/user/support' : '/admin/support-desk') + '/tickets')
const goTab = (tab) => router.push(`${ticketsBase.value}/${tab}`)

const fmtMin = (m) => {
  if (m == null) return '—'
  if (m < 60) return `${Math.round(m)}m`
  if (m < 1440) return `${(m / 60).toFixed(1)}h`
  return `${(m / 1440).toFixed(1)}d`
}

const headline = computed(() => {
  const s = me.value
  if (isAgent.value) {
    if (!ag.value) return 'Desk telemetry syncing — your live exchange is warming up.'
    const b = ag.value.breached_active || 0
    const c = ag.value.claimable || 0
    if (b > 0) return `${b} ticket${b === 1 ? '' : 's'} past SLA on the desk — clear the red before it compounds.`
    if (c > 0) return `${c} unclaimed ticket${c === 1 ? '' : 's'} in your queue and ${ag.value.open_desk || 0} open. The desk is yours.`
    return `Desk under control — ${ag.value.open_desk || 0} open, SLA holding at ${ag.value.sla_compliance_pct_30d ?? '—'}%.`
  }
  const open = Number(s.open) || 0, ip = Number(s.in_progress) || 0
  if (!s.total) return 'Need a hand? Raise a ticket and track it from here.'
  if (open + ip === 0) return 'All your tickets are resolved — you’re all clear.'
  if (ip > 0) return `${ip} of your tickets ${ip === 1 ? 'is' : 'are'} being worked on right now.`
  return `You have ${open} open ${open === 1 ? 'ticket' : 'tickets'} with the support team.`
})

/* ── pointer parallax (orbs drift, screen tilts) ── */
const heroRef = ref(null)
const mx = ref(0), my = ref(0)
const onMove = (e) => {
  const r = heroRef.value?.$el?.getBoundingClientRect?.() || heroRef.value?.getBoundingClientRect?.()
  if (!r) return
  mx.value = ((e.clientX - r.left) / r.width - 0.5) * 2
  my.value = ((e.clientY - r.top) / r.height - 0.5) * 2
}
const resetMove = () => { mx.value = 0; my.value = 0 }
const orbStyle = (d) => ({ transform: `translate3d(${(mx.value * d * 22).toFixed(1)}px, ${(my.value * d * 16).toFixed(1)}px, 0)` })
const screenTilt = computed(() => ({
  transform: `perspective(1200px) rotateX(${(my.value * -4).toFixed(2)}deg) rotateY(${(mx.value * 6).toFixed(2)}deg)`,
}))

/* ── desk clock ── */
const now = ref(Date.now())
let tick = null
const clock = computed(() => new Date(now.value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))

/* ── ticker tape (role-adaptive) ── */
const tape = computed(() => {
  if (isAgent.value) {
    const x = ag.value || {}
    const c14 = x.created_14d ?? 0, r14 = x.resolved_14d ?? 0
    const delta = x.backlog_delta_14d ?? (c14 - r14)
    return [
      { label: 'RESOLVED 14D', val: `▲ ${r14}`, tone: 'up' },
      { label: 'CREATED 14D', val: `${c14}`, tone: 'dn' },
      { label: 'BACKLOG Δ', val: delta > 0 ? `+${delta}` : `${delta}`, tone: delta > 0 ? 'dn' : delta < 0 ? 'up' : 'fl' },
      { label: 'SLA 30D', val: x.sla_compliance_pct_30d != null ? `${x.sla_compliance_pct_30d}%` : '—', tone: (x.sla_compliance_pct_30d ?? 100) >= 90 ? 'up' : 'dn' },
      { label: 'BREACHED', val: `${x.breached_active ?? 0}`, tone: (x.breached_active ?? 0) > 0 ? 'dn' : 'up' },
      { label: 'CSAT', val: x.csat_avg_30d != null ? `${x.csat_avg_30d}★` : '—', tone: 'fl' },
      { label: 'MTTA', val: fmtMin(x.mtta_minutes_30d), tone: 'fl' },
      { label: 'MTTR', val: fmtMin(x.mttr_minutes_30d), tone: 'fl' },
      { label: 'CLAIMABLE', val: `${x.claimable ?? 0}`, tone: (x.claimable ?? 0) > 0 ? 'dn' : 'up' },
      { label: 'REOPEN', val: `${x.reopen_rate_30d ?? 0}%`, tone: 'fl' },
      { label: 'CRITICAL', val: `${x.critical_active ?? 0}`, tone: (x.critical_active ?? 0) > 0 ? 'dn' : 'up' },
    ]
  }
  const s = me.value
  return [
    { label: 'OPEN', val: `${s.open ?? 0}`, tone: (s.open ?? 0) > 0 ? 'dn' : 'up' },
    { label: 'IN PROGRESS', val: `${s.in_progress ?? 0}`, tone: 'fl' },
    { label: 'AWAITING YOU', val: `${s.pending ?? 0}`, tone: (s.pending ?? 0) > 0 ? 'dn' : 'up' },
    { label: 'RESOLVED', val: `▲ ${s.resolved ?? 0}`, tone: 'up' },
    { label: 'TOTAL', val: `${s.total ?? 0}`, tone: 'fl' },
    { label: 'DESK', val: 'LIVE', tone: 'up' },
  ]
})
// marquee needs 2 identical halves; short tapes double their items first
const tapeLoop = computed(() => {
  const half = tape.value.length >= 8 ? tape.value : [...tape.value, ...tape.value]
  return [...half, ...half]
})

/* ── personal telemetry lenses ── */
const personalLenses = computed(() => ([
  { key: 'open', icon: Ticket, label: 'Open', value: me.value.open ?? 0, accent: 'var(--pulse)', live: true, sub: 'awaiting us' },
  { key: 'progress', icon: Activity, label: 'In progress', value: me.value.in_progress ?? 0, accent: 'var(--pulse-bright)', sub: 'being worked' },
  { key: 'pending', icon: Hourglass, label: 'Awaiting you', value: me.value.pending ?? 0, accent: 'var(--pulse-ember)', sub: 'needs your reply' },
  { key: 'resolved', icon: CheckCircle2, label: 'Resolved', value: me.value.resolved ?? 0, accent: 'var(--pulse-up)', sub: 'closed out' },
  { key: 'total', icon: Layers, label: 'Total', value: me.value.total ?? 0, accent: 'var(--pulse-deep)', sub: 'all time' },
]))

/* ── employee screen channels ── */
const channels = computed(() => {
  const s = me.value
  const rows = [
    { key: 'open', label: 'OPEN', n: Number(s.open) || 0, tone: 'warn' },
    { key: 'progress', label: 'WORK', n: Number(s.in_progress) || 0, tone: 'hot' },
    { key: 'pending', label: 'YOU', n: Number(s.pending) || 0, tone: 'crit' },
    { key: 'resolved', label: 'DONE', n: Number(s.resolved) || 0, tone: 'ok' },
  ]
  const max = Math.max(1, ...rows.map((r) => r.n))
  return rows.map((r) => ({ ...r, pct: Math.round((r.n / max) * 100) }))
})
const chActive = computed(() => (Number(me.value.open) || 0) + (Number(me.value.in_progress) || 0) + (Number(me.value.pending) || 0))

/* ── desk lenses (agent) ── */
const deskLenses = computed(() => {
  const a = ag.value || {}
  return [
    { key: 'open', icon: LayoutGrid, label: 'Open desk', value: a.open_desk ?? 0, accent: 'var(--pulse)', tab: 'open', live: true, sub: 'active queue' },
    { key: 'unassigned', icon: Inbox, label: 'Unassigned', value: a.unassigned ?? 0, accent: 'var(--pulse-ember)', tab: 'unassigned', sub: 'no owner' },
    { key: 'claim', icon: HandHelping, label: 'Claimable', value: a.claimable ?? 0, accent: 'var(--pulse-bright)', tab: 'unassigned', sub: 'your pool' },
    { key: 'breached', icon: Timer, label: 'Breached', value: a.breached_active ?? 0, accent: 'var(--pulse-dn)', tab: 'breached', sub: 'past SLA' },
    { key: 'critical', icon: AlertTriangle, label: 'Critical', value: a.critical_active ?? 0, accent: 'var(--sd-pri-critical)', tab: 'critical', sub: 'highest priority' },
    { key: 'escalated', icon: Flame, label: 'Escalated', value: a.escalated_active ?? 0, accent: 'var(--sd-st-escalated)', tab: 'escalated', sub: 'raised a tier' },
  ]
})

/* ── gauges ── */
const g = computed(() => {
  const a = ag.value || {}
  const sla = a.sla_compliance_pct_30d
  const csat = a.csat_avg_30d
  const reopen = a.reopen_rate_30d ?? 0
  const clampFrac = (v) => Math.max(0, Math.min(1, v))
  return {
    slaFrac: sla != null ? clampFrac(sla / 100) : 0,
    slaText: sla != null ? `${sla}%` : '—',
    slaAccent: sla == null ? 'var(--pulse)' : sla >= 90 ? 'var(--pulse-up)' : sla >= 75 ? 'var(--pulse-ember)' : 'var(--pulse-dn)',
    // speed gauges: fuller = faster (MTTA vs 4h cap, MTTR vs 2d cap)
    mttaFrac: a.mtta_minutes_30d != null ? clampFrac(1 - a.mtta_minutes_30d / 240) : 0,
    mttrFrac: a.mttr_minutes_30d != null ? clampFrac(1 - a.mttr_minutes_30d / 2880) : 0,
    csatFrac: csat != null ? clampFrac(csat / 5) : 0,
    csatText: csat != null ? `${csat}★` : '—',
    csatAccent: csat == null ? 'var(--pulse)' : csat >= 4 ? 'var(--pulse-up)' : csat >= 3 ? 'var(--pulse-ember)' : 'var(--pulse-dn)',
    reopenFrac: clampFrac(reopen / 100),
    reopenText: `${reopen}%`,
    reopenAccent: reopen <= 5 ? 'var(--pulse-up)' : reopen <= 15 ? 'var(--pulse-ember)' : 'var(--pulse-dn)',
  }
})

/* ── roster ── */
const initialsOf = (name) => (name || 'A').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
const roster = computed(() => {
  const rows = (ag.value?.roster || []).slice(0, 6)
  const max = Math.max(1, ...rows.map((r) => r.open || 0))
  return rows.map((r) => ({ ...r, initials: initialsOf(r.name), pct: Math.round(((r.open || 0) / max) * 100) }))
})

/* ── priority spread (open desk) ── */
const PRI = [
  { key: 'critical', label: 'Critical' }, { key: 'urgent', label: 'Urgent' },
  { key: 'high', label: 'High' }, { key: 'medium', label: 'Medium' }, { key: 'low', label: 'Low' },
]
const prioTotal = computed(() => Object.values(ag.value?.priority_counts || {}).reduce((s, v) => s + (v || 0), 0))
const prioSpread = computed(() => {
  const pc = ag.value?.priority_counts || {}
  const total = prioTotal.value || 1
  return PRI.map((p) => ({ ...p, n: pc[p.key] || 0, pct: Math.round(((pc[p.key] || 0) / total) * 100) }))
})

/* status → journey step */
const stepOf = (st) => {
  if (['resolved', 'closed'].includes(st)) return 2
  if (['in_progress', 'pending_customer', 'pending_vendor', 'escalated'].includes(st)) return 1
  return 0
}

/* relative time — short form for the flight strips */
const agoShort = (iso) => {
  if (!iso) return ''
  const diff = now.value - new Date(iso).getTime()
  if (diff < 60000) return 'now'
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

/* recent my tickets */
const recent = ref([])
const recentLoading = ref(true)
const loadRecent = async () => {
  recentLoading.value = true
  try { recent.value = (await listMyTickets({ page: 1, limit: 6 })).items || [] }
  catch { recent.value = [] }
  finally { recentLoading.value = false }
}
/* live desk: 1s clock + 45s telemetry poll + instant refresh when the tab regains focus */
let poll = null
const onVisible = () => { if (!document.hidden) { loadPulse(); loadRecent() } }
onMounted(() => {
  loadRecent(); loadPulse()
  tick = setInterval(() => { now.value = Date.now() }, 1000)
  poll = setInterval(() => { if (!document.hidden) { loadPulse(); loadRecent() } }, 45000)
  document.addEventListener('visibilitychange', onVisible)
})
onUnmounted(() => {
  if (tick) clearInterval(tick)
  if (poll) clearInterval(poll)
  document.removeEventListener('visibilitychange', onVisible)
})

/* quick help */
const HELP = [
  { key: 'kb', icon: BookOpen, title: 'Browse the knowledge base', sub: 'Guides and fixes for common issues' },
  { key: 'ann', icon: Megaphone, title: 'Announcements', sub: 'Latest notices from the support team' },
  { key: 'new', icon: Plus, title: 'Raise a new ticket', sub: 'Tell us what’s going on' },
]
const onHelp = (key) => {
  if (key === 'kb') emit('go', 'knowledge-base')
  else if (key === 'ann') emit('go', 'communication')
  else createOpen.value = true
}

/* create modal + drawer */
const createOpen = ref(false)
const drawerId = ref(null)
const onCreated = () => { loadRecent(); loadPulse(); emit('changed') }
const onCreateGo = () => { createOpen.value = false; goTab('my') }
const onDrawerChanged = () => { loadRecent(); loadPulse(); emit('changed') }
</script>

<style scoped>
.sd-pulse-dash { display: flex; flex-direction: column; gap: 16px; color: var(--sd-text); }

/* ═══════════ THE MEGA-HERO ═══════════ */
.pd-hero { position: relative; overflow: hidden; border-radius: 26px; isolation: isolate;
  background: var(--sd-panel); border: 1px solid var(--pulse-border); box-shadow: var(--sd-card-shadow); }

/* atmosphere */
.pd-atm { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.orb { position: absolute; border-radius: 50%; filter: blur(64px); will-change: transform; transition: transform 0.5s var(--sd-spring); }
.orb.a1 { width: 400px; height: 400px; top: -150px; left: -100px; background: radial-gradient(circle, rgba(251, 191, 36, 0.38), transparent 65%); animation: pd-orb 22s ease-in-out infinite; }
.orb.a2 { width: 320px; height: 320px; top: -70px; right: 6%; background: radial-gradient(circle, rgba(251, 146, 60, 0.3), transparent 66%); animation: pd-orb 27s ease-in-out infinite reverse; }
.orb.a3 { width: 260px; height: 260px; bottom: -120px; left: 26%; background: radial-gradient(circle, rgba(234, 88, 12, 0.24), transparent 68%); animation: pd-orb 31s ease-in-out infinite; }
.orb.a4 { width: 340px; height: 340px; bottom: -160px; right: -100px; background: radial-gradient(circle, rgba(252, 211, 77, 0.24), transparent 67%); animation: pd-orb 25s ease-in-out infinite reverse; }
[data-theme="light"] .orb { opacity: 0.55; }
.pd-gridmap { position: absolute; inset: 0; opacity: 0.4;
  background-image: radial-gradient(rgba(251, 191, 36, 0.07) 1px, transparent 1px); background-size: 26px 26px;
  -webkit-mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.55), transparent 78%); mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.55), transparent 78%); }
.pd-mesh { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.45; }
.mesh-line { fill: none; stroke: rgba(251, 191, 36, 0.28); stroke-width: 1.4; stroke-dasharray: 6 11; animation: pd-mesh 26s linear infinite; }
.mesh-line.m2 { stroke: rgba(251, 146, 60, 0.24); animation-duration: 32s; }
.mesh-line.m3 { stroke: rgba(234, 88, 12, 0.18); animation-duration: 38s; }

.pd-hero-inner { position: relative; z-index: 1; display: grid; grid-template-columns: 1.15fr 1fr; gap: 34px; align-items: center;
  padding: 36px 38px 28px; }

/* lead */
.pd-eyebrow { display: inline-flex; align-items: center; gap: 9px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.18em;
  color: var(--pulse); padding: 6px 13px; border-radius: 999px; background: var(--pulse-soft); border: 1px solid var(--pulse-border); margin: 0; }
.eb-glyph { position: relative; width: 13px; height: 13px; }
.eb-ring { position: absolute; inset: 0; border-radius: 50%; border: 1.4px solid var(--pulse); border-top-color: transparent; animation: pd-spin 2.6s linear infinite; }
.eb-core { position: absolute; inset: 4px; border-radius: 50%; background: var(--pulse); animation: pd-pulse 2s ease-in-out infinite; }
.eb-sep { width: 1px; height: 11px; background: var(--pulse-border); }
.eb-live { display: inline-flex; align-items: center; gap: 5px; color: var(--pulse-up); }
.eb-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--pulse-up); box-shadow: 0 0 8px var(--pulse-up); animation: pd-pulse 1.6s ease-in-out infinite; }

.pd-title { margin: 16px 0 0; display: flex; flex-direction: column; line-height: 1.0; font-weight: 850; letter-spacing: -0.032em;
  font-size: clamp(34px, 4.8vw, 60px); color: var(--sd-text); }
.pd-title .grad { background: var(--pulse-grad); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent;
  padding-bottom: 0.08em; }
.pd-sub { margin: 14px 0 0; font-size: 15px; line-height: 1.55; color: var(--sd-text-secondary); max-width: 46ch; }

.pd-cta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
.pd-btn { display: inline-flex; align-items: center; gap: 8px; padding: 11px 17px; border-radius: 13px; font-size: 13px; font-weight: 700;
  cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: rgba(255, 255, 255, 0.04);
  color: var(--sd-text); backdrop-filter: blur(8px); transition: border-color 0.25s var(--sd-spring); }
.pd-btn:hover { border-color: var(--pulse-border); }
.pd-btn.primary { border: none; background: var(--pulse-grad); color: var(--pulse-ink); box-shadow: 0 10px 28px var(--pulse-glow); }
.pd-btn.ghost { background: transparent; }
.pd-btn.sm { padding: 8px 14px; font-size: 12.5px; }
/* :not(.primary) keeps the gradient CTA vivid in light mode — the old rule ghosted it */
[data-theme="light"] .pd-btn:not(.primary) { background: rgba(120, 70, 10, 0.05); }

.pd-status { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; margin-top: 20px; }
.pd-clockchip { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
  color: var(--pulse-up); padding: 5px 11px; border-radius: 999px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.pd-clockchip i { width: 7px; height: 7px; border-radius: 50%; background: var(--pulse-up); box-shadow: 0 0 8px var(--pulse-up); animation: pd-pulse 1.6s ease-in-out infinite; }
.pd-stat { font-family: var(--sd-mono); font-size: 11.5px; color: var(--sd-text-secondary); }
.pd-stat b { color: var(--sd-text-dim); font-weight: 700; letter-spacing: 0.08em; margin-right: 5px; font-size: 10px; }
.pd-stat.hot { color: var(--pulse-dn); }
.pd-stat.up { color: var(--pulse-up); }

/* the exchange screen */
.pd-screen-wrap { display: flex; justify-content: center; min-width: 0; }
.pd-screen { position: relative; width: 100%; max-width: 520px; border-radius: 20px; padding: 14px 16px 14px; overflow: hidden;
  background: radial-gradient(120% 90% at 50% -10%, color-mix(in srgb, var(--pulse) 9%, transparent), transparent 60%),
    linear-gradient(180deg, var(--pulse-stage-2), var(--pulse-stage));
  border: 1px solid var(--pulse-screen-edge);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.42), 0 0 0 1px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.04);
  transition: transform 0.4s var(--sd-spring); transform-style: preserve-3d; will-change: transform; }
.scr-scan { position: absolute; inset: 0; pointer-events: none; z-index: 3; opacity: 0.5;
  background: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.03) 0 1px, transparent 1px 3px); }
.scr-grain { position: absolute; inset: 0; pointer-events: none; z-index: 3; opacity: 0.35;
  background-image: radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px); background-size: 3px 3px; }
.scr-flare { position: absolute; top: -60%; left: -30%; width: 60%; height: 220%; pointer-events: none; z-index: 4; opacity: 0;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.06), transparent); transform: rotate(12deg) translateX(-40%); }
.pd-screen:hover .scr-flare { opacity: 1; animation: pd-flare 1.4s ease; }

/* employee channel board */
.pd-chan { display: flex; flex-direction: column; gap: 12px; position: relative; z-index: 1; }
.ch-head { display: flex; align-items: center; justify-content: space-between; }
.ch-title { display: inline-flex; align-items: center; gap: 7px; font-size: 10px; font-weight: 700; letter-spacing: 0.16em; color: var(--pulse-screen-dim); }
.ti-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--pulse); box-shadow: 0 0 8px var(--pulse-glow); animation: sd-breathe 2.4s ease-in-out infinite; }
.ch-readout { display: flex; align-items: baseline; gap: 12px; padding: 12px 14px; border-radius: 13px;
  background: rgba(0, 0, 0, 0.3); border: 1px solid var(--pulse-screen-edge); }
.chr-n { font-size: 38px; font-weight: 800; letter-spacing: -0.02em; line-height: 1; color: var(--pulse-bright);
  text-shadow: 0 0 18px var(--pulse-glow); }
.ch-readout.clear .chr-n { color: var(--pulse-up); text-shadow: 0 0 18px color-mix(in srgb, var(--pulse-up) 50%, transparent); }
.chr-l { font-size: 10.5px; font-weight: 700; letter-spacing: 0.16em; color: var(--pulse-screen-dim); }
.ch-rows { display: flex; flex-direction: column; gap: 8px; }
.ch-row { display: grid; grid-template-columns: 44px 1fr 26px; align-items: center; gap: 9px;
  animation: sd-stream-in 0.5s var(--sd-spring) backwards; animation-delay: calc(0.55s + var(--i) * 0.08s); }
.ch-key { font-size: 9.5px; letter-spacing: 0.1em; color: var(--pulse-screen-dim); }
.ch-bar { height: 8px; border-radius: 999px; background: rgba(255, 255, 255, 0.06); overflow: hidden; }
.ch-bar i { display: block; height: 100%; width: var(--w); border-radius: 999px; transform-origin: left center;
  animation: pd-grow 0.9s cubic-bezier(0.16, 1, 0.3, 1) backwards; animation-delay: calc(0.7s + var(--i) * 0.09s); }
.ch-bar i.ok { background: var(--pulse-up); } .ch-bar i.warn { background: var(--pulse); }
.ch-bar i.hot { background: var(--pulse-ember); } .ch-bar i.crit { background: var(--pulse-dn); }
.ch-n { font-size: 11px; font-weight: 700; color: var(--pulse-screen-txt); text-align: right; }

/* full-bleed ticker tape */
.pd-tape { position: relative; z-index: 1; height: 36px; display: flex; align-items: center; overflow: hidden;
  background: linear-gradient(180deg, var(--pulse-stage-2), var(--pulse-stage));
  border-top: 1px solid var(--pulse-screen-edge); border-bottom: 1px solid var(--pulse-screen-edge); }
.pd-reel { display: flex; align-items: center; gap: 34px; white-space: nowrap; padding-left: 16px;
  animation: pd-reel 36s linear infinite; will-change: transform; }
.pd-reel:hover { animation-play-state: paused; }
.tk { display: inline-flex; align-items: baseline; gap: 7px; font-family: var(--sd-mono); font-size: 11px; }
.tk b { font-weight: 700; letter-spacing: 0.08em; color: var(--pulse-screen-dim); }
.tk em { font-style: normal; font-weight: 800; }
.tk.up em { color: var(--pulse-up); }
.tk.dn em { color: var(--pulse-dn); }
.tk.fl em { color: var(--pulse-bright); }
.tape-fade { position: absolute; top: 0; bottom: 0; width: 60px; pointer-events: none; z-index: 2; }
.tape-fade.l { left: 0; background: linear-gradient(90deg, var(--pulse-stage), transparent); }
.tape-fade.r { right: 0; background: linear-gradient(-90deg, var(--pulse-stage), transparent); }

/* telemetry lenses docked in the hero */
.pd-lenses { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(5, 1fr); gap: 11px; padding: 18px 22px 22px; }
.lens { position: relative; display: flex; align-items: center; gap: 11px; padding: 13px 15px; border-radius: 15px; cursor: pointer;
  font-family: inherit; text-align: left; overflow: hidden; background: var(--sd-surface); border: 1px solid var(--sd-border);
  transition: border-color 0.2s, background 0.2s, box-shadow 0.25s var(--sd-spring); }
.lens:hover { border-color: color-mix(in srgb, var(--lc) 45%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--lc) 22%, transparent), 0 14px 30px rgba(0, 0, 0, 0.25); }
.lens-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; color: var(--lc);
  background: color-mix(in srgb, var(--lc) 14%, transparent); flex-shrink: 0; }
.lens-body { display: flex; flex-direction: column; min-width: 0; }
.lens-n { font-size: 22px; font-weight: 850; color: var(--sd-text); letter-spacing: -0.02em; line-height: 1; }
.lens-lbl { font-size: 11.5px; font-weight: 600; color: var(--sd-text-secondary); margin-top: 3px; }
.lens-sub { font-size: 9.5px; color: var(--sd-text-dim); letter-spacing: 0.04em; }
.lens-live { position: absolute; top: 10px; right: 11px; }
.lens-live i { display: block; width: 6px; height: 6px; border-radius: 50%; background: var(--lc); box-shadow: 0 0 8px var(--lc);
  animation: pd-pulse 1.8s ease-in-out infinite; }
.lens-bar { position: absolute; left: 0; bottom: 0; height: 2.5px; width: 100%; transform: scaleX(0); transform-origin: left;
  background: var(--lc); transition: transform 0.32s var(--sd-spring); }
.lens:hover .lens-bar { transform: scaleX(1); }

/* ═══════════ command layer ═══════════ */
.pd-command { display: flex; flex-direction: column; gap: 16px; }
.pd-gauges { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
.pd-desk-lenses { display: grid; grid-template-columns: repeat(auto-fit, minmax(148px, 1fr)); gap: 11px; }
.pd-ops-grid { display: grid; grid-template-columns: 1.15fr 1fr; gap: 16px; }

/* roster */
.pd-roster { padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; }
.pd-ph { display: flex; align-items: center; justify-content: space-between; }
.pd-ph h3 { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: var(--sd-text); margin: 0; }
.pd-ph h3 :deep(svg) { color: var(--pulse); }
.pd-link { background: none; border: none; color: var(--pulse); font-size: 12.5px; font-weight: 600; cursor: pointer; }
.pd-lap { display: inline-flex; align-items: center; gap: 9px; padding: 8px 12px; border-radius: 11px; font-size: 12.5px; color: var(--sd-text);
  background: var(--pulse-soft); border: 1px solid var(--pulse-border); }
.lap-medal { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 8px; color: var(--pulse-ink);
  background: var(--pulse-grad); box-shadow: 0 4px 12px var(--pulse-glow); flex-shrink: 0; }
.pd-lap b { color: var(--pulse); font-weight: 700; }

.rst-rows { display: flex; flex-direction: column; gap: 9px; }
.rst-row { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 11px;
  animation: sd-stream-in 0.5s var(--sd-spring) backwards; animation-delay: calc(var(--i) * 0.06s); }
.rst-ava { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 10px; font-size: 10.5px; font-weight: 800;
  font-family: var(--sd-mono); color: var(--pulse); background: var(--pulse-soft); border: 1px solid var(--pulse-border); }
.rst-main { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.rst-name { font-size: 12.5px; color: var(--sd-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rst-bar { height: 7px; border-radius: 999px; background: var(--sd-surface-glass); overflow: hidden; }
.rst-bar i { display: block; height: 100%; width: var(--w); border-radius: 999px; background: var(--pulse-grad); transform-origin: left;
  animation: pd-grow 0.8s cubic-bezier(0.16, 1, 0.3, 1) backwards; animation-delay: calc(var(--i) * 0.06s + 0.15s); }
.rst-nums { display: inline-flex; align-items: center; gap: 6px; }
.rst-open { font-size: 12px; font-weight: 700; color: var(--sd-text); }
.rst-brc, .rst-crit { font-size: 10.5px; font-weight: 700; padding: 1px 6px; border-radius: 6px; }
.rst-brc { color: var(--pulse-dn); background: color-mix(in srgb, var(--pulse-dn) 14%, transparent); }
.rst-crit { color: var(--sd-pri-critical); background: color-mix(in srgb, var(--sd-pri-critical) 15%, transparent); }
.pd-mini-empty { padding: 8px 2px; } .pd-mini-empty p { margin: 0; font-size: 12.5px; color: var(--sd-text-muted); }

/* priority spread */
.pd-prio { display: flex; flex-direction: column; gap: 7px; margin-top: 2px; padding-top: 12px; border-top: 1px solid var(--sd-border); }
.pd-prio-label { font-size: 9.5px; letter-spacing: 0.12em; color: var(--sd-text-dim); }
.pd-prio-bar { display: flex; height: 10px; border-radius: 999px; overflow: hidden; background: var(--sd-surface-glass); }
.pd-prio-bar i { transition: width 0.9s cubic-bezier(0.16, 1, 0.3, 1); }
.pd-prio-legend { display: flex; flex-wrap: wrap; gap: 4px 12px; }
.pd-prio-legend span { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--sd-text-muted); }
.pd-prio-legend i { width: 9px; height: 9px; border-radius: 3px; }
.pri-critical { background: var(--sd-pri-critical); } .pri-urgent { background: var(--sd-pri-urgent); }
.pri-high { background: var(--sd-pri-high); } .pri-medium { background: var(--sd-pri-medium); } .pri-low { background: var(--sd-pri-low); }

/* ═══════════ personal grid ═══════════ */
.pd-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px; }
.pd-panel { padding: 18px 20px; }
.pd-recent .pd-ph, .pd-help .pd-ph { margin-bottom: 14px; }

/* flight strips */
.fs-rows { display: flex; flex-direction: column; gap: 7px; }
.fs-row { position: relative; display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 14px;
  padding: 11px 14px 11px 17px; border-radius: 13px; text-align: left; cursor: pointer; overflow: hidden; font-family: inherit;
  background: var(--sd-surface-glass); border: 1px solid transparent;
  transition: border-color 0.18s, transform 0.22s var(--sd-spring), box-shadow 0.25s var(--sd-spring);
  animation: sd-stream-in 0.5s var(--sd-spring) backwards; animation-delay: calc(var(--i) * 0.05s); }
.fs-row:hover { border-color: color-mix(in srgb, var(--pc, var(--pulse)) 40%, transparent); transform: translateY(-2px);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.22); }
.fs-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--pc, var(--sd-steel));
  box-shadow: 0 0 12px color-mix(in srgb, var(--pc, var(--pulse)) 55%, transparent); }
.fs-main { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.fs-top { display: flex; align-items: center; gap: 8px; }
.fs-no { font-size: 12px; font-weight: 700; color: var(--pulse); }
.fs-ago { font-size: 10px; color: var(--sd-text-dim); }
.fs-subj { font-size: 13.5px; color: var(--sd-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fs-journey { display: inline-flex; gap: 5px; align-items: center; }
.fs-step { position: relative; width: 20px; height: 4px; border-radius: 999px; overflow: hidden;
  background: var(--sd-surface); border: 1px solid var(--sd-border); }
.fs-step.on { background: var(--pulse); border-color: transparent; box-shadow: 0 0 8px var(--pulse-glow); }
.fs-step.done.on { background: var(--pulse-up); box-shadow: 0 0 8px color-mix(in srgb, var(--pulse-up) 55%, transparent); }
.fs-step.spark::after { content: ''; position: absolute; top: 0; bottom: 0; width: 8px; border-radius: 999px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.9), transparent);
  animation: pd-spark 1.6s ease-in-out infinite; }

.pd-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 26px 16px; text-align: center; }
.pe-ico { display: grid; place-items: center; width: 56px; height: 56px; border-radius: 16px; color: var(--pulse); background: var(--pulse-soft); }
.pd-empty p { margin: 0; font-size: 13px; color: var(--sd-text-muted); max-width: 30ch; }

/* quick help */
.pd-help { display: flex; flex-direction: column; gap: 9px; }
.qh-card { position: relative; display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: 14px; cursor: pointer;
  text-align: left; overflow: hidden; font-family: inherit;
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border); transition: border-color 0.2s, box-shadow 0.25s var(--sd-spring); }
.qh-card:hover { border-color: var(--pulse-border); box-shadow: 0 10px 26px rgba(0, 0, 0, 0.2); }
.qh-ico { flex-shrink: 0; width: 40px; height: 40px; display: grid; place-items: center; border-radius: 12px; color: var(--pulse);
  background: var(--pulse-soft); transition: transform 0.28s var(--sd-spring), background 0.25s, color 0.25s, box-shadow 0.25s; }
.qh-card:hover .qh-ico { transform: scale(1.08) rotate(-4deg); background: var(--pulse-grad); color: var(--pulse-ink);
  box-shadow: 0 8px 20px var(--pulse-glow); }
.qh-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.qh-text b { font-size: 13.5px; font-weight: 700; color: var(--sd-text); }
.qh-text small { font-size: 11.5px; color: var(--sd-text-muted); }
.qh-arr { color: var(--sd-text-dim); flex-shrink: 0; transition: transform 0.25s var(--sd-spring), color 0.2s; }
.qh-card:hover .qh-arr { transform: translateX(3px); color: var(--pulse); }
.qh-sheen { position: absolute; top: 0; left: 0; width: 42%; height: 100%; pointer-events: none;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--pulse) 12%, transparent), transparent);
  transform: translateX(-130%) skewX(-18deg); opacity: 0; }
.qh-card:hover .qh-sheen { opacity: 1; animation: sd-tile-sheen 0.9s ease; }

/* keyframes */
@keyframes pd-orb { 0%, 100% { translate: 0 0; } 50% { translate: 24px -18px; } }
@keyframes pd-mesh { to { stroke-dashoffset: -200; } }
@keyframes pd-spin { to { transform: rotate(360deg); } }
@keyframes pd-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.55; transform: scale(0.82); } }
@keyframes pd-reel { to { transform: translateX(-50%); } }
@keyframes pd-grow { from { transform: scaleX(0); } }
@keyframes pd-flare { 0% { transform: rotate(12deg) translateX(-60%); } 100% { transform: rotate(12deg) translateX(340%); } }
@keyframes pd-spark { 0% { left: -30%; } 60%, 100% { left: 110%; } }

/* responsive */
@media (max-width: 1120px) {
  .pd-hero-inner { grid-template-columns: 1fr; gap: 26px; }
  .pd-lenses { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
}
@media (max-width: 980px) { .pd-ops-grid { grid-template-columns: 1fr; } }
@media (max-width: 860px) { .pd-grid { grid-template-columns: 1fr; } .pd-hero-inner { padding: 28px 24px 22px; } }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .orb,
  html:not([data-cinematic="on"]) .mesh-line,
  html:not([data-cinematic="on"]) .eb-ring,
  html:not([data-cinematic="on"]) .eb-core,
  html:not([data-cinematic="on"]) .eb-dot,
  html:not([data-cinematic="on"]) .pd-clockchip i,
  html:not([data-cinematic="on"]) .pd-reel,
  html:not([data-cinematic="on"]) .lens-live i,
  html:not([data-cinematic="on"]) .ti-dot,
  html:not([data-cinematic="on"]) .ch-row,
  html:not([data-cinematic="on"]) .ch-bar i,
  html:not([data-cinematic="on"]) .fs-row,
  html:not([data-cinematic="on"]) .fs-step.spark::after,
  html:not([data-cinematic="on"]) .rst-row,
  html:not([data-cinematic="on"]) .rst-bar i,
  html:not([data-cinematic="on"]) .scr-flare,
  html:not([data-cinematic="on"]) .qh-sheen { animation: none !important; }
  html:not([data-cinematic="on"]) .pd-screen { transform: none !important; }
}
</style>
