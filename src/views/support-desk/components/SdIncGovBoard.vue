<template>
  <!-- SdIncGovBoard — "The full board" from the Governance Bento artifact: composed
       glass table, hover (or focus / pin) unfolds the ADMIN VERB RAIL beneath the
       row. The rail itself is SdIncVerbRail variant="oversight" — the module's ONE
       permission surface (NO ack on this desk) — restyled to the artifact's keys. -->
  <div class="gbb">
    <div class="bhead sd-mono">
      <button class="bh sort" :class="{ on: sortKey === 'ticket_number' }" @click="$emit('sort', 'ticket_number')">
        FAULT<ArrowUpDown class="ic" /></button>
      <span>SEV</span><span>SUBJECT</span><span>OWNER / CMDR</span><span>SLA</span>
      <span>CADENCE</span><span>PLAYBOOK</span><span>EXPOSURE</span><span>LINKS</span>
      <span class="r">WATCH</span>
    </div>

    <div v-if="loading && !rows.length" class="gb-empty sd-mono">SWEEPING THE LENS…</div>
    <div v-else-if="!rows.length" class="gb-empty sd-mono">
      NO FAULTS ON THIS LENS — THE DESK IS, FOR ONCE, QUIET.</div>

    <div v-for="r in rows" v-else :key="String(r.id)" :ref="(el) => setRow(r.id, el)"
      class="brow" :class="{ pinned: isFocused(r) }" tabindex="0"
      @mouseenter="$emit('peek', r.id)" @click.self="$emit('open', r.id)">
      <div class="brow-grid" @click="$emit('open', r.id)">
        <span class="bid sd-mono">{{ r.ticket_number }}
          <span v-if="linksOf(r)" class="kids">{{ linksOf(r) }}</span></span>
        <span class="bsev"><SdIncSevBadge :sev="r.sev" />
          <small v-if="r.is_major_incident" class="sd-mono">MI</small>
          <small v-else-if="r.mi_proposed_at" class="sd-mono cand">CAND</small></span>
        <span class="bsub">{{ r.subject }}
          <small class="sd-mono">{{ r.affected_users != null ? `${fmtNum(r.affected_users)} USERS AFFECTED` : (r.category_name || '—').toUpperCase() }}</small></span>
        <span class="bown">
          <span class="avatar sd-mono">{{ initials(r.assigned_agent_name) }}</span>
          <span class="who sd-mono">{{ r.assigned_agent_name || '— OPEN' }}
            <small :class="{ unst: r.sev === 1 && !r.incident_commander_id }">{{ cmdrLine(r) }}</small></span></span>
        <span class="bsla sd-mono" :class="slaCls(r)"><span>{{ slaVal(r) }}</span>
          <small>{{ slaLbl(r) }}</small></span>
        <span class="bcad sd-mono" :class="{ over: cadOver(r) }">
          <template v-if="!r.update_interval_minutes"><span class="no">—</span></template>
          <template v-else><span>{{ cadVal(r) }}</span>
            <small>{{ cadOver(r) ? 'OVERDUE' : `${r.update_interval_minutes}M` }}</small></template></span>
        <span class="bpb sd-mono" :class="{ full: r.task_total && r.task_done === r.task_total }">
          <template v-if="r.task_total">
            <span>{{ r.task_done }}/{{ r.task_total }}</span>
            <span class="bar"><i :style="{ width: `${Math.round((r.task_done / r.task_total) * 100)}%` }" /></span>
          </template>
          <span v-else class="no">—</span></span>
        <span class="bexp">
          <i v-for="t in expOf(r)" :key="t" class="echip sd-mono" :class="{ un: t === 'UNASSESSED' }">{{ t }}</i></span>
        <span class="blink sd-mono">{{ linksOf(r) || '—' }}</span>
        <span class="bwatch sd-mono"><Eye class="ic" />{{ watchOf(r.id) ?? '—' }}</span>
      </div>
      <!-- the admin verb rail — unfolds on hover / focus / pin -->
      <div class="rail">
        <div class="rail-in">
          <SdIncVerbRail :row="r" variant="oversight" :busy-id="busyId"
            @confirm-mi="(row) => $emit('confirm-mi', row)"
            @decline-mi="(row) => $emit('decline-mi', row)"
            @assign="(row) => $emit('assign', row)"
            @nudge="(row) => $emit('nudge', row)"
            @roster="(row) => $emit('roster', row)"
            @reclassify="(p) => $emit('reclassify', p)"
            @escalate="(row) => $emit('escalate', row)"
            @watchers="(row) => $emit('watchers', row)"
            @sitrep="(row) => $emit('sitrep', row)"
            @open="(row) => $emit('open', row.id)" />
        </div>
      </div>
    </div>

    <SdIncPager :page="page" :total="total" :limit="limit" @update:page="$emit('page', $event)" />
  </div>
</template>

<script setup>
/*
  Contract: rows are the server-paged critical window (lens=critical&live=1). The
  WATCH column is honest lazy data — it fills from the host's peek cache after a
  row has been hovered (`watchOf(id)` returns null until the sitrep settles), never
  a 12-row sitrep fan-out. `focusId` (?focus= deep link) pins its row: rail open,
  spine lit, scrolled into view once.
*/
import { watch, nextTick } from 'vue'
import { ArrowUpDown, Eye } from 'lucide-vue-next'
import SdIncSevBadge from './SdIncSevBadge.vue'
import SdIncPager from './SdIncPager.vue'
import SdIncVerbRail from './SdIncVerbRail.vue'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  now: { type: Number, default: () => Date.now() },
  loading: { type: Boolean, default: false },
  page: { type: Number, default: 1 },
  total: { type: Number, default: 0 },
  limit: { type: Number, default: 12 },
  busyId: { type: [String, Number], default: null },
  focusId: { type: [String, Number], default: null },
  sortKey: { type: String, default: null },
  watchOf: { type: Function, default: () => null },
})
defineEmits(['open', 'page', 'sort', 'peek', 'confirm-mi', 'decline-mi', 'assign', 'nudge',
  'roster', 'reclassify', 'escalate', 'watchers', 'sitrep'])

const rowEls = {}
const setRow = (id, el) => { rowEls[String(id)] = el }
const isFocused = (r) => props.focusId != null && String(props.focusId) === String(r.id)

// ?focus= deep link — scroll the pinned row into view once it exists on the page
watch(() => [props.focusId, props.rows.length], () => {
  if (props.focusId == null) return
  nextTick(() => {
    const el = rowEls[String(props.focusId)]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
})

const pad = (n) => String(n).padStart(2, '0')
const fmtNum = (n) => (n == null ? '—' : Number(n).toLocaleString('en-US'))
const initials = (n) => String(n || '?').split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
const hms = (s) => { s = Math.max(0, s | 0); return `${(s / 3600) | 0}:${pad(((s % 3600) / 60) | 0)}:${pad(s % 60)}` }
const mmss = (s) => { s = Math.max(0, s | 0); return `${pad((s / 60) | 0)}:${pad(s % 60)}` }
const secUntil = (ts) => Math.floor((new Date(ts).getTime() - props.now) / 1000)

const AT_RISK_SEC = 4 * 3600
const slaVal = (r) => {
  if (r.sla_paused_since) return 'HOLD'
  if (r.sla_resolution_breached || r.sla_response_breached) {
    return `+${hms(-secUntil(r.sla_resolution_breached ? (r.resolution_due_at || r.created_at) : (r.response_due_at || r.created_at)))}`
  }
  if (r.resolution_due_at) return hms(secUntil(r.resolution_due_at))
  return '—'
}
const slaLbl = (r) => {
  if (r.sla_paused_since) return 'SLA HELD'
  if (r.sla_resolution_breached || r.sla_response_breached) return 'BREACH'
  if (r.resolution_due_at && secUntil(r.resolution_due_at) <= AT_RISK_SEC) return 'AT-RISK'
  return 'TO BREACH'
}
const slaCls = (r) => {
  if (r.sla_paused_since) return 'hold'
  if (r.sla_resolution_breached || r.sla_response_breached) return 'brc'
  if (r.resolution_due_at && secUntil(r.resolution_due_at) <= AT_RISK_SEC) return 'risk'
  return 'ok'
}
const cadOver = (r) => !!(r.next_update_due_at && new Date(r.next_update_due_at).getTime() < props.now)
const cadVal = (r) => {
  if (!r.next_update_due_at) return '—'
  const s = secUntil(r.next_update_due_at)
  return s < 0 ? `+${mmss(-s)}` : mmss(s)
}
const cmdrLine = (r) => {
  if (r.incident_commander_name) return `CMDR ${r.incident_commander_name.toUpperCase()}`
  if (r.sev === 1) return 'CMDR UNSTAFFED'
  if (r.mi_proposed_at && !r.is_major_incident) return 'MI CANDIDATE · HOLDING'
  if (!r.acknowledged_at) return 'UNACKED'
  return 'STEADY'
}
const expOf = (r) => {
  const out = []
  if (r.revenue_impact) out.push('REV')
  if (r.compliance_impact) out.push('COMP')
  if (r.security_impact) out.push('SEC')
  if (r.public_impact) out.push('PUB')
  if (!out.length && r.affected_users == null && !r.business_impact) out.push('UNASSESSED')
  return out
}
const linksOf = (r) => {
  if (r.parent_incident_number) return `P·${String(r.parent_incident_number).slice(-6)}`
  if (r.child_count) return `${r.child_count} CH`
  return ''
}
</script>

<style scoped>
/* board chrome — theme-native (cream in light) */
.gbb { border: 1px solid var(--sd-border); border-radius: 18px; background: var(--sd-surface);
  overflow: hidden; }
.bhead, .brow-grid { display: grid; gap: 10px; align-items: center;
  grid-template-columns: 92px 62px minmax(190px, 1.5fr) 160px 92px 74px 96px minmax(96px, 1fr) 62px 52px; }
.bhead { padding: 13px 18px; border-bottom: 1px solid var(--sd-border); font-size: 9px;
  font-weight: 600; letter-spacing: 0.22em; color: var(--sd-text-dim); }
.bhead .r { text-align: right; }
.bh.sort { display: inline-flex; align-items: center; gap: 4px; padding: 0; cursor: pointer;
  background: none; border: 0; font: inherit; color: inherit; letter-spacing: inherit; }
.bh.sort .ic { width: 10px; height: 10px; opacity: 0.6; }
.bh.sort.on, .bh.sort:hover { color: var(--sd-fun-core); }
.gb-empty { padding: 36px 20px; text-align: center; font-size: 10px; font-weight: 600;
  letter-spacing: 0.22em; color: var(--sd-text-dim); }

.brow { padding: 12px 18px 11px; border-bottom: 1px solid var(--sd-border); position: relative;
  transition: background 0.25s; cursor: pointer; }
.brow:last-of-type { border-bottom: 0; }
.brow:hover { background: var(--sd-fun-soft); }
.brow.pinned { background: var(--sd-fun-soft); box-shadow: inset 3px 0 0 var(--sd-fun-core); }
.brow:focus-visible { outline: 1px solid var(--sd-fun-core); outline-offset: -1px; }

.bid { font-size: 11.5px; font-weight: 700; letter-spacing: 0.06em; color: var(--sd-text); }
.bid .kids { display: block; font-size: 8.5px; font-weight: 600; letter-spacing: 0.12em;
  color: var(--sd-text-dim); }
.bsev { display: flex; flex-direction: column; align-items: flex-start; gap: 3px; }
.bsev small { font-size: 7px; font-weight: 700; letter-spacing: 0.18em; color: var(--sd-fun-core); }
.bsev small.cand { color: var(--sd-warning); }
.bsub { font-size: 13px; font-weight: 420; line-height: 1.35; color: var(--sd-text); min-width: 0;
  overflow: hidden; }
.bsub small { display: block; font-size: 8.5px; font-weight: 500; letter-spacing: 0.12em;
  color: var(--sd-text-dim); margin-top: 2px; white-space: nowrap; overflow: hidden;
  text-overflow: ellipsis; }
.bown { display: flex; align-items: center; gap: 8px; min-width: 0; }
.avatar { width: 24px; height: 24px; border-radius: 50%; flex: none; display: grid; place-items: center;
  font-size: 8px; font-weight: 800; color: var(--sd-text);
  background: linear-gradient(140deg, var(--sd-fun-soft), var(--sd-fun-deep-soft));
  border: 1px solid var(--sd-fun-brd); }
.who { font-size: 10.5px; font-weight: 600; letter-spacing: 0.06em; color: var(--sd-text); min-width: 0; }
.who small { display: block; font-size: 8px; letter-spacing: 0.1em; color: var(--sd-text-dim);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.who small.unst { color: var(--sd-fun-esc); animation: gbd-soft 1.5s infinite; }
.bsla { font-size: 11.5px; font-weight: 700; font-variant-numeric: tabular-nums; }
.bsla small { display: block; font-size: 7.5px; font-weight: 600; letter-spacing: 0.16em;
  color: var(--sd-text-dim); margin-top: 3px; }
.bsla.ok { color: var(--sd-text-secondary); }
.bsla.risk { color: var(--sd-warning); }
.bsla.brc { color: var(--sd-fun-esc); }
.bsla.hold { color: var(--sd-text-dim); }
.bcad { font-size: 10.5px; font-weight: 600; color: var(--sd-text-secondary);
  font-variant-numeric: tabular-nums; }
.bcad small { display: block; font-size: 7.5px; letter-spacing: 0.14em; color: var(--sd-text-dim);
  margin-top: 3px; }
.bcad.over { color: var(--sd-fun-esc); animation: gbd-soft 1.5s infinite; }
.bcad .no, .bpb .no { color: var(--sd-text-dim); }
.bpb { display: flex; align-items: center; gap: 7px; font-size: 9.5px; font-weight: 600; }
.bpb .bar { flex: 1; height: 4px; border-radius: 4px; background: var(--sd-border-strong);
  overflow: hidden; }
.bpb .bar i { display: block; height: 100%; background: var(--sd-fun-grad); }
.bpb.full .bar i { background: var(--sd-fun-resolved); }
.bexp { display: flex; gap: 5px; flex-wrap: wrap; }
.echip { font-style: normal; font-size: 8px; font-weight: 700; letter-spacing: 0.12em;
  padding: 4px 6px; border-radius: 5px; border: 1px solid var(--sd-border-strong);
  color: var(--sd-text-secondary); }
.echip.un { border-style: dashed; color: var(--sd-warning); }
.blink { font-size: 9px; font-weight: 600; letter-spacing: 0.1em; color: var(--sd-text-dim); }
.bwatch { display: inline-flex; align-items: center; gap: 5px; justify-content: flex-end;
  font-size: 10.5px; font-weight: 700; color: var(--sd-text-secondary); }
.bwatch .ic { width: 12px; height: 12px; color: var(--sd-text-dim); }
.ic { flex: none; }

/* the fold-out admin verb rail */
.rail { display: grid; grid-template-rows: 0fr; opacity: 0;
  transition: grid-template-rows 0.38s var(--sd-spring), opacity 0.3s; }
.brow:hover .rail, .brow:focus-within .rail, .brow.pinned .rail { grid-template-rows: 1fr; opacity: 1; }
.rail-in { overflow: hidden; min-height: 0; padding-top: 10px; }
.rail-in :deep(.ivr) { gap: 7px; }
.rail-in :deep(.ivr-btn) { width: auto; height: auto; padding: 7px 11px; gap: 6px; border-radius: 8px;
  font-family: var(--sd-mono); font-size: 10px; font-weight: 600; letter-spacing: 0.13em;
  background: var(--sd-surface-elevated); border-color: var(--sd-border-strong);
  color: var(--sd-text-muted); }
.rail-in :deep(.ivr-btn svg) { width: 12px; height: 12px; }
.rail-in :deep(.ivr-btn)::after { font: inherit; }
/* artifact-exact verb labels, drawn from the rail's title attrs (house pattern — SdIncRegistry does the same) */
.rail-in :deep(.ivr-btn[title^="Assign"])::after { content: "ASSIGN"; }
.rail-in :deep(.ivr-btn[title^="Nudge"])::after { content: "NUDGE"; }
.rail-in :deep(.ivr-btn[title^="Staff the command"])::after { content: "ROSTER"; }
.rail-in :deep(.ivr-btn[title^="Promote to SEV2"])::after { content: "RECLASSIFY"; }
.rail-in :deep(.ivr-btn[title^="De-escalate"])::after { content: "DE-ESC"; }
.rail-in :deep(.ivr-btn[title^="Escalate"])::after { content: "ESCALATE"; }
.rail-in :deep(.ivr-btn[title^="Stakeholder watchers"])::after { content: "WATCHERS"; }
.rail-in :deep(.ivr-btn[title^="Executive sitrep"])::after { content: "SITREP PDF"; }
.rail-in :deep(.ivr-btn[title^="Open the incident"])::after { content: "OPEN"; }
.rail-in :deep(.ivr-btn[title^="Confirm"])::after { content: "CONFIRM MI"; }
.rail-in :deep(.ivr-btn[title^="Decline"])::after { content: "DECLINE"; }
.rail-in :deep(.ivr-btn:hover) { color: var(--sd-fun-core); border-color: var(--sd-fun-brd);
  background: var(--sd-fun-soft); }
.rail-in :deep(.ivr-btn.hot) { color: #170d03; background: var(--sd-fun-grad); border-color: transparent;
  box-shadow: 0 4px 14px color-mix(in srgb, var(--sd-fun-core) 30%, transparent); }
.rail-in :deep(.ivr-btn.warn) { color: var(--sd-fun-esc); }

@keyframes gbd-soft { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

@media (max-width: 1240px) {
  .bhead { display: none; }
  .brow-grid { grid-template-columns: 88px 52px 1fr 150px 90px; }
  .brow-grid > :nth-child(n+6) { display: none; }
}

/* ═════ LIGHT THEME OVERRIDES ═════ */
[data-theme="light"] .gbb { background: rgba(255, 250, 240, 0.65); }
[data-theme="light"] .rail-in :deep(.ivr-btn) { background: rgba(255, 250, 240, 0.85); }
[data-theme="light"] .rail-in :deep(.ivr-btn.hot) { color: #fff8ec; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .who small.unst,
  html:not([data-cinematic="on"]) .bcad.over { animation: none !important; }
}
</style>
