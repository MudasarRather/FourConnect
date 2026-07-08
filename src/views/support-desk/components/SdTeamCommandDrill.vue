<template>
  <Motion as="section" class="dr" :style="{ '--tc': team?.color || 'var(--sd-team-core)' }"
    :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }">
    <!-- ── identity header ── -->
    <header class="dr-head sd-card">
      <button class="dr-back" title="Back to the fleet" @click="$emit('back')"><ArrowLeft :size="15" /></button>
      <span class="dr-spine" aria-hidden="true" />
      <div class="dr-id">
        <div class="dr-idrow">
          <h3 class="dr-name">{{ team?.name }}</h3>
          <span v-if="team?.code" class="dr-code sd-mono">{{ team.code }}</span>
          <span class="dr-cov" :class="{ offed: team?.coverage_open === false }">
            <MoonStar v-if="team?.coverage_open === false" :size="10" />
            {{ team?.coverage_open === true ? 'ON SHIFT' : team?.coverage_open === false ? 'OFF SHIFT' : '24×7' }}
          </span>
        </div>
        <p class="dr-sub">
          <Crown :size="11" /> {{ stats.lead_name || team?.lead_name || 'No lead' }}
          <span class="dr-dot">·</span>{{ team?.agent_count ?? 0 }} agent{{ (team?.agent_count ?? 0) === 1 ? '' : 's' }}
          <span class="dr-dot">·</span><Zap :size="11" /> {{ team?.assignment_method === 'load_balanced' ? 'load-balanced' : team?.assignment_method === 'manual' ? 'manual' : 'round-robin' }}
          <span v-if="hours" class="dr-dot">·</span>{{ hours }}
        </p>
      </div>
      <div class="dr-actions">
        <button class="dr-btn" :disabled="!(team?.unassigned > 0)" :title="team?.unassigned ? 'Hand one unowned ticket to a specific person' : 'No unowned tickets to route'"
          @click="$emit('route')"><UserCheck :size="13" /> Route</button>
        <button class="dr-btn sync" :disabled="!(team?.unassigned > 0)" :title="team?.unassigned ? `Spread the ${team.unassigned} unowned ticket(s) across the crew` : 'Queue is fully owned'"
          @click="$emit('rebalance')"><Shuffle :size="13" /> Rebalance{{ team?.unassigned ? ' · ' + team.unassigned : '' }}</button>
        <button class="dr-btn" title="Edit this team" @click="$emit('edit')"><Pencil :size="13" /> Edit</button>
        <button class="dr-btn icon" title="Refresh" @click="$emit('refresh')"><RefreshCw :size="13" :class="{ 'dr-spin': loading || statsLoading }" /></button>
      </div>
    </header>

    <!-- ── drill lenses (same vocabulary as the sealed backend list) ── -->
    <div class="dr-lenses" role="tablist" aria-label="Team lenses">
      <button v-for="l in lensDefs" :key="l.key" class="dr-lens" :class="{ on: lens === l.key }"
        :style="{ '--lc': l.color }" role="tab" :aria-selected="lens === l.key" @click="$emit('lens', l.key)">
        <component :is="l.icon" :size="12" /> {{ l.label }} <b class="sd-mono">{{ l.value }}</b>
      </button>
    </div>

    <!-- ── collision hotspots (Zendesk-style: ≥2 live viewers) ── -->
    <div v-if="(stats.hotspots || []).length" class="dr-hot sd-card">
      <Eye :size="13" /> <b>Collision watch:</b>
      <button v-for="h in stats.hotspots" :key="h.ticket_id" class="dr-hot-chip" :title="(h.viewer_names || []).join(', ')"
        @click="$emit('open', h.ticket_id)">
        <span class="sd-mono">{{ h.ticket_number }}</span> · {{ h.viewer_count }} viewing
      </button>
    </div>

    <!-- ── roster health + flow/leaderboard ── -->
    <div class="dr-grid">
      <aside class="dr-roster sd-card">
        <header class="dr-rh"><UsersRound :size="14" /> Roster health
          <span class="dr-rn sd-mono">{{ roster.length }}</span></header>
        <div v-if="statsLoading && !roster.length" class="dr-r-skel" aria-hidden="true"><span v-for="i in 4" :key="i" /></div>
        <p v-else-if="!roster.length" class="dr-r-empty">No members on the roster yet — edit the team to seat a crew.</p>
        <ul v-else class="dr-rlist">
          <Motion v-for="(r, i) in roster" :key="r.agent_id" as="li" class="dr-rrow"
            :initial="{ opacity: 0, x: -10 }" :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.32, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }">
            <span class="dr-ava" :class="{ lead: r.is_lead }">{{ initials(r.name) }}</span>
            <div class="dr-rmain">
              <div class="dr-rtop">
                <span class="dr-rname">{{ r.name || 'Member' }}</span>
                <Crown v-if="r.is_lead" :size="10" class="dr-crown" />
                <span v-if="r.role === 'collaborator'" class="dr-collab">viewer</span>
                <span class="dr-ropen sd-mono">{{ r.open }} open</span>
              </div>
              <div class="dr-rbar" :title="`${r.open} open · ${r.breaching} breaching · ${r.due_soon} due soon`">
                <span class="dr-rfill" :style="{ width: loadPct(r), background: r.breaching ? 'var(--sd-team-strain)' : 'var(--tc)' }" />
              </div>
              <div class="dr-rmeta sd-mono">
                <span v-if="r.breaching" class="strain"><Siren :size="9" /> {{ r.breaching }}</span>
                <span v-if="r.due_soon" class="warm"><Timer :size="9" /> {{ r.due_soon }}</span>
                <span class="sync"><CircleCheck :size="9" /> {{ r.resolved_7d }} · 7d</span>
                <span v-if="r.csat_avg != null">★ {{ r.csat_avg.toFixed(1) }}</span>
                <span class="dr-aging" title="Age of open work: <1d / 1-3d / 3-7d / 7d+">
                  <i v-for="(v, k) in aging(r)" :key="k" :style="{ height: v + 'px' }" :class="{ hot: k === 3 && aging(r)[3] > 3 }" />
                </span>
              </div>
            </div>
          </Motion>
        </ul>
      </aside>

      <div class="dr-side">
        <div class="sd-card dr-flow">
          <header class="dr-rh"><Activity :size="14" /> Inflow vs outflow · 14d</header>
          <SdFlowBalance :flow="stats.flow || []" />
        </div>
        <div class="sd-card dr-podium">
          <header class="dr-rh"><Trophy :size="14" /> Resolvers · 7d</header>
          <p v-if="!(stats.leaderboard || []).length" class="dr-r-empty">Nothing shipped in the last 7 days.</p>
          <ol v-else class="dr-lb">
            <li v-for="(e, i) in (stats.leaderboard || []).slice(0, 5)" :key="e.agent_id" :class="`p${i}`">
              <span class="dr-lb-rank sd-mono">{{ i + 1 }}</span>
              <span class="dr-lb-name">{{ e.name || 'Agent' }}</span>
              <b class="sd-mono">{{ e.resolved_7d }}</b>
              <span v-if="e.csat_avg != null" class="dr-lb-csat sd-mono">★{{ e.csat_avg.toFixed(1) }}</span>
            </li>
          </ol>
        </div>
      </div>
    </div>

    <!-- ── ticket ledger ── -->
    <div class="dr-ledger">
      <SdTicketTable :rows="rows" :columns="COLS" :loading="loading" :now="now" accent="var(--tc)"
        :empty="emptyCopy" :empty-icon="UsersRound" @open="$emit('open', $event)" />
      <div v-if="pages > 1" class="dr-pager sd-mono">
        <button class="dr-btn icon" :disabled="page <= 1" @click="$emit('page', page - 1)"><ChevronLeft :size="14" /></button>
        <span>{{ page }} / {{ pages }}</span>
        <button class="dr-btn icon" :disabled="page >= pages" @click="$emit('page', page + 1)"><ChevronRight :size="14" /></button>
      </div>
    </div>
  </Motion>
</template>

<script setup>
/* SdTeamCommandDrill — one team's operations under the admin glass: roster health rail,
   flow balance, resolver podium, collision watch, and the sealed ticket ledger. All data
   arrives via /teams/{id}/stats + /teams/{id}/tickets so every count reconciles with
   the fleet card that opened it. */
import { computed } from 'vue'
import { Motion } from 'motion-v'
import {
  ArrowLeft, Crown, Zap, Pencil, RefreshCw, Shuffle, UserCheck, UsersRound, MoonStar,
  Siren, Timer, CircleCheck, Activity, Trophy, Eye, ChevronLeft, ChevronRight,
  Layers, Inbox, Hourglass, Flame, AlertTriangle, Pause,
} from 'lucide-vue-next'
import SdTicketTable from './SdTicketTable.vue'
import SdFlowBalance from './SdFlowBalance.vue'

const props = defineProps({
  team: { type: Object, default: null },              // overview card
  stats: { type: Object, default: () => ({}) },        // /teams/{id}/stats
  rows: { type: Array, default: () => [] },
  total: { type: Number, default: 0 },
  page: { type: Number, default: 1 },
  limit: { type: Number, default: 50 },
  loading: { type: Boolean, default: false },
  statsLoading: { type: Boolean, default: false },
  lens: { type: String, default: 'all' },
  now: { type: Number, default: () => Date.now() },
})
defineEmits(['back', 'lens', 'page', 'open', 'route', 'rebalance', 'edit', 'refresh'])

const COLS = ['flag', 'number', 'subject', 'priority', 'status', 'agent', 'sla', 'updated']

const lensDefs = computed(() => {
  const s = props.stats
  return [
    { key: 'all', label: 'Active', value: s.queue ?? 0, icon: Layers, color: 'var(--sd-team-core)' },
    { key: 'unassigned', label: 'Unowned', value: s.unassigned ?? 0, icon: Inbox, color: 'var(--sd-team-hi)' },
    { key: 'breaching', label: 'Breaching', value: s.breached_active ?? 0, icon: Siren, color: 'var(--sd-team-strain)' },
    { key: 'due_soon', label: 'Due 4h', value: s.due_4h ?? 0, icon: Timer, color: 'var(--sd-team-hi)' },
    { key: 'idle', label: 'Idle 24h', value: s.idle_24h ?? 0, icon: Hourglass, color: 'var(--sd-team-idle)' },
    { key: 'escalated', label: 'Escalated', value: s.escalated ?? 0, icon: Flame, color: 'var(--sd-team-strain)' },
    { key: 'pending', label: 'Paused', value: (s.pending_customer ?? 0) + (s.pending_vendor ?? 0) + (s.on_hold ?? 0), icon: Pause, color: 'var(--sd-team-idle)' },
    { key: 'critical', label: 'Critical', value: s.critical ?? 0, icon: AlertTriangle, color: 'var(--sd-team-strain)' },
  ]
})

const roster = computed(() => props.stats.roster || [])
const maxOpen = computed(() => Math.max(1, ...roster.value.map(r => r.open || 0)))
const loadPct = (r) => `${Math.round(((r.open || 0) / maxOpen.value) * 100)}%`
const aging = (r) => [r.aging_1d || 0, r.aging_3d || 0, r.aging_7d || 0, r.aging_7plus || 0]
  .map(v => Math.min(3 + v * 2.5, 14))

const pages = computed(() => Math.max(1, Math.ceil((props.total || 0) / (props.limit || 50))))
const hours = computed(() => {
  const bh = props.team?.business_hours || {}
  return bh.start ? `${bh.start}–${bh.end}${bh.tz ? ' ' + bh.tz : ''}` : ''
})
const emptyCopy = computed(() => ({
  title: props.lens === 'all' ? 'A quiet queue' : 'Nothing under this lens',
  blurb: props.lens === 'all'
    ? 'No active tickets are routed to this team right now.'
    : 'Clear — switch lenses to widen the net.',
}))
const initials = (n) => (n || 'M').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
</script>

<style scoped>
.dr { display: flex; flex-direction: column; gap: 12px; }

/* header */
.dr-head { position: relative; display: flex; align-items: center; gap: 13px; padding: 15px 17px; overflow: hidden; }
.dr-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--tc); }
.dr-back { width: 32px; height: 32px; flex: 0 0 32px; display: grid; place-items: center; border-radius: 10px; cursor: pointer;
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text-secondary); transition: all 0.15s; }
.dr-back:hover { color: var(--tc); border-color: color-mix(in srgb, var(--tc) 45%, transparent); transform: translateX(-2px); }
.dr-id { flex: 1; min-width: 0; }
.dr-idrow { display: flex; align-items: center; flex-wrap: wrap; gap: 9px; }
.dr-name { margin: 0; font-size: 18px; font-weight: 800; color: var(--sd-text); }
.dr-code { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; color: var(--tc);
  padding: 1px 8px; border-radius: 999px; background: color-mix(in srgb, var(--tc) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--tc) 30%, transparent); }
.dr-cov { display: inline-flex; align-items: center; gap: 4px; font-size: 9px; font-weight: 800; letter-spacing: 0.1em;
  color: var(--sd-team-sync); }
.dr-cov.offed { color: var(--sd-team-idle); }
.dr-sub { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin: 4px 0 0;
  font-size: 12px; color: var(--sd-text-muted); }
.dr-sub :deep(svg) { color: var(--tc); }
.dr-dot { color: var(--sd-text-dim); }
.dr-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dr-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border-radius: 10px;
  font-size: 12px; font-weight: 650; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); transition: all 0.15s; }
.dr-btn:hover:not(:disabled) { border-color: color-mix(in srgb, var(--tc) 45%, transparent); }
.dr-btn.sync { color: var(--sd-team-sync); border-color: color-mix(in srgb, var(--sd-team-sync) 40%, transparent);
  background: var(--sd-team-sync-soft); }
.dr-btn.icon { padding: 8px 9px; }
.dr-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.dr-spin { animation: dr-rot 1s linear infinite; }
@keyframes dr-rot { to { transform: rotate(360deg); } }

/* lenses */
.dr-lenses { display: flex; flex-wrap: wrap; gap: 7px; }
.dr-lens { display: inline-flex; align-items: center; gap: 7px; padding: 8px 13px; border-radius: 999px;
  font-size: 12px; font-weight: 650; cursor: pointer; font-family: inherit; color: var(--sd-text-secondary);
  background: var(--sd-surface); border: 1px solid var(--sd-border); transition: all 0.16s var(--sd-spring); }
.dr-lens :deep(svg) { color: var(--lc); }
.dr-lens b { font-size: 11px; color: var(--sd-text-dim); }
.dr-lens:hover { border-color: color-mix(in srgb, var(--lc) 45%, transparent); color: var(--sd-text); }
.dr-lens.on { color: var(--lc); background: color-mix(in srgb, var(--lc) 10%, transparent);
  border-color: color-mix(in srgb, var(--lc) 45%, transparent); }
.dr-lens.on b { color: var(--lc); }

/* hotspots */
.dr-hot { display: flex; align-items: center; flex-wrap: wrap; gap: 9px; padding: 10px 14px;
  font-size: 12px; color: var(--sd-text-secondary); }
.dr-hot :deep(svg) { color: var(--sd-team-strain); }
.dr-hot b { color: var(--sd-text); font-weight: 700; }
.dr-hot-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px;
  font-size: 11px; font-weight: 650; cursor: pointer; font-family: inherit; color: var(--sd-team-strain);
  background: var(--sd-team-strain-soft); border: 1px solid color-mix(in srgb, var(--sd-team-strain) 32%, transparent); }

/* grid */
.dr-grid { display: grid; grid-template-columns: minmax(300px, 380px) 1fr; gap: 12px; align-items: start; }
@media (max-width: 980px) { .dr-grid { grid-template-columns: 1fr; } }
.dr-roster { padding: 15px 16px; display: flex; flex-direction: column; gap: 11px; }
.dr-rh { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 750; color: var(--sd-text); }
.dr-rh :deep(svg) { color: var(--tc); }
.dr-rn { margin-left: auto; font-size: 11px; color: var(--sd-text-dim); }
.dr-rlist { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px;
  max-height: 420px; overflow: auto; }
.dr-rrow { display: flex; align-items: flex-start; gap: 10px; }
.dr-ava { width: 30px; height: 30px; flex: 0 0 30px; display: grid; place-items: center; border-radius: 50%;
  font-size: 10px; font-weight: 800; color: var(--sd-team-deep); background: var(--sd-team-soft);
  border: 1px solid var(--sd-team-brd); }
.dr-ava.lead { box-shadow: 0 0 0 1.5px var(--sd-team-core); }
.dr-rmain { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.dr-rtop { display: flex; align-items: center; gap: 6px; }
.dr-rname { font-size: 12.5px; font-weight: 700; color: var(--sd-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dr-crown { color: var(--sd-team-core); flex: 0 0 auto; }
.dr-collab { font-size: 8.5px; font-weight: 800; letter-spacing: 0.1em; color: var(--sd-team-idle);
  padding: 1px 6px; border-radius: 999px; border: 1px dashed var(--sd-team-idle); }
.dr-ropen { margin-left: auto; font-size: 10.5px; color: var(--sd-text-muted); flex: 0 0 auto; }
.dr-rbar { height: 5px; border-radius: 4px; background: var(--sd-border); overflow: hidden; }
.dr-rfill { display: block; height: 100%; border-radius: 4px; transition: width 0.7s var(--sd-ease); }
.dr-rmeta { display: flex; align-items: center; flex-wrap: wrap; gap: 9px; font-size: 10px; color: var(--sd-text-muted); }
.dr-rmeta span { display: inline-flex; align-items: center; gap: 3px; }
.dr-rmeta .strain { color: var(--sd-team-strain); }
.dr-rmeta .warm { color: var(--sd-team-hi); }
.dr-rmeta .sync { color: var(--sd-team-sync); }
.dr-aging { display: inline-flex; align-items: flex-end; gap: 2px; margin-left: auto; height: 14px; }
.dr-aging i { width: 4px; border-radius: 2px 2px 0 0; background: var(--sd-team-idle); opacity: 0.7; }
.dr-aging i.hot { background: var(--sd-team-strain); opacity: 1; }
.dr-r-empty { margin: 0; font-size: 12px; color: var(--sd-text-muted); line-height: 1.5; }
.dr-r-skel { display: flex; flex-direction: column; gap: 10px; }
.dr-r-skel span { height: 34px; border-radius: 10px;
  background: linear-gradient(90deg, var(--sd-surface-glass) 25%, var(--sd-border) 50%, var(--sd-surface-glass) 75%);
  background-size: 200% 100%; animation: dr-shimmer 1.4s linear infinite; }
@keyframes dr-shimmer { to { background-position: -200% 0; } }

.dr-side { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.dr-flow, .dr-podium { padding: 15px 16px; display: flex; flex-direction: column; gap: 10px; }
.dr-lb { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.dr-lb li { display: flex; align-items: center; gap: 10px; padding: 7px 11px; border-radius: 10px;
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.dr-lb li.p0 { border-color: color-mix(in srgb, var(--sd-team-core) 55%, transparent); background: var(--sd-team-soft); }
.dr-lb-rank { width: 18px; height: 18px; display: grid; place-items: center; border-radius: 50%;
  font-size: 9.5px; font-weight: 800; color: var(--sd-team-deep); background: var(--sd-team-soft);
  border: 1px solid var(--sd-team-brd); }
.dr-lb li.p0 .dr-lb-rank { color: #1c1204; background: var(--sd-team-grad); border: none; }
.dr-lb-name { flex: 1; min-width: 0; font-size: 12.5px; font-weight: 650; color: var(--sd-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dr-lb b { font-size: 13px; color: var(--sd-team-sync); }
.dr-lb-csat { font-size: 10.5px; color: var(--sd-text-muted); }

.dr-ledger { display: flex; flex-direction: column; gap: 9px; }
.dr-pager { display: flex; align-items: center; justify-content: center; gap: 12px; font-size: 12px; color: var(--sd-text-muted); }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .dr-spin,
  html:not([data-cinematic="on"]) .dr-r-skel span { animation: none; }
  html:not([data-cinematic="on"]) .dr-rfill { transition: none; }
}
</style>
