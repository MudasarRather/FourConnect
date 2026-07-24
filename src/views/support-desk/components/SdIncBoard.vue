<template>
  <!-- The Fault Grid's dense response board — a live switch-list, not a generic table:
       every row is a circuit with a SEV breaker, a flowing status trace, the command
       roster, and a breathing SLA countdown. Shared by the agent boards (active /
       critical) with per-desk column flags; rows stagger in with sd-deal. -->
  <div class="ibd" :class="{ compact }">
    <div class="ibd-head sd-mono" role="row">
      <span v-if="selectable" class="c-sel"><input type="checkbox" :checked="allSelected" @change="$emit('toggle-all')" /></span>
      <span class="c-sev">SEV</span>
      <button class="c-id sortable" @click="$emit('sort', 'ticket_number')">FAULT #</button>
      <span class="c-sub">INCIDENT</span>
      <span class="c-svc">SERVICE / DISTRICT</span>
      <span v-if="showImpact" class="c-imp">EXPOSURE</span>
      <span class="c-own">RESPONSE</span>
      <button class="c-age sortable" @click="$emit('sort', 'created_at')">AGE</button>
      <span class="c-sla">SLA</span>
      <span class="c-act" />
    </div>

    <TransitionGroup name="ibd-row" tag="div" class="ibd-body">
      <div v-for="(r, i) in rows" :key="r.id" class="row-shell" :style="{ '--i': Math.min(i, 14) }">
        <div class="row" :class="[`sev${r.sev}`, { mi: r.is_major_incident }]" role="row" tabindex="0"
          @click="$emit('open', r.id)" @keydown.enter="$emit('open', r.id)">
          <span class="row-spine" aria-hidden="true" />
          <span v-if="selectable" class="c-sel" @click.stop>
            <input type="checkbox" :checked="selected.includes(String(r.id))" @change="$emit('toggle', String(r.id))" />
          </span>
          <span class="c-sev"><SdIncSevBadge :sev="r.sev" /></span>
          <span class="c-id sd-mono">{{ r.ticket_number }}</span>
          <span class="c-sub">
            <b class="sub-t">{{ r.subject }}</b>
            <span class="sub-meta">
              <i class="st" :class="`st-${r.status}`">{{ statusText(r.status) }}</i>
              <i v-if="r.is_major_incident" class="mi-chip"><Siren :size="9" /> MI</i>
              <i v-if="r.is_escalated" class="esc-chip">L{{ r.escalation_level }}</i>
              <i v-if="r.has_pir" class="pir-chip">PIR·{{ (r.pir_status || '').replace('_', ' ') }}</i>
            </span>
          </span>
          <span class="c-svc">
            <template v-if="(r.affected_services || []).length">
              <i v-for="s in r.affected_services.slice(0, 2)" :key="s" class="svc-chip">{{ s }}</i>
              <i v-if="r.affected_services.length > 2" class="svc-chip more">+{{ r.affected_services.length - 2 }}</i>
            </template>
            <i v-else class="svc-chip dim">{{ r.category_name || '—' }}</i>
          </span>
          <span v-if="showImpact" class="c-imp">
            <i v-if="r.affected_users" class="imp-n sd-mono" title="Affected users"><Users :size="10" /> {{ r.affected_users }}</i>
            <i v-if="r.compliance_impact" class="imp-flag" title="Compliance exposure">C</i>
            <i v-if="r.security_impact" class="imp-flag sec" title="Security exposure">S</i>
            <i v-if="r.public_impact" class="imp-flag pub" title="Public exposure">P</i>
          </span>
          <span class="c-own">
            <b class="own-name">{{ r.assigned_agent_name || '— unowned' }}</b>
            <i v-if="r.incident_commander_name" class="own-cmd" title="Incident commander">
              <Crown :size="9" /> {{ r.incident_commander_name }}</i>
            <i v-else-if="r.is_major_incident" class="own-cmd missing">no commander</i>
          </span>
          <span class="c-age sd-mono">{{ age(r) }}</span>
          <span class="c-sla">
            <span class="sla" :class="slaTone(r)">
              <i class="sla-dot" /><span class="sd-mono">{{ slaText(r) }}</span>
            </span>
          </span>
          <span class="c-act" @click.stop>
            <slot name="actions" :row="r">
              <button v-if="!r.acknowledged_at && r.sev <= 2" class="act ack" title="Acknowledge (MTTA)"
                @click="$emit('ack', r)"><ShieldCheck :size="13" /></button>
              <button v-if="r.is_major_incident" class="act war" title="War room"
                @click="$emit('war', r)"><Radio :size="13" /></button>
              <button class="act" title="Open" @click="$emit('open', r.id)"><ArrowRight :size="13" /></button>
            </slot>
          </span>
        </div>
      </div>
    </TransitionGroup>

    <div v-if="!rows.length && !loading" class="ibd-empty">
      <component :is="emptyIcon" :size="22" />
      <p>{{ empty }}</p>
    </div>
    <div v-if="loading" class="ibd-loading"><span class="ld" /><span class="ld" /><span class="ld" /></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ShieldCheck, Radio, ArrowRight, Siren, Users, Crown, Zap } from 'lucide-vue-next'
import SdIncSevBadge from './SdIncSevBadge.vue'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  now: { type: Number, default: () => Date.now() },
  loading: { type: Boolean, default: false },
  selectable: { type: Boolean, default: false },
  selected: { type: Array, default: () => [] },
  showImpact: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
  empty: { type: String, default: 'No live faults — the grid holds.' },
  emptyIcon: { type: [Object, Function], default: () => Zap },
})
defineEmits(['open', 'toggle', 'toggle-all', 'sort', 'ack', 'war'])

const allSelected = computed(() => props.rows.length > 0
  && props.rows.every(r => props.selected.includes(String(r.id))))

const STATUS_TEXT = {
  open: 'Open', in_progress: 'Working', pending_customer: 'Await customer',
  pending_vendor: 'Await vendor', on_hold: 'Held', escalated: 'Escalated',
  resolved: 'Resolved', closed: 'Closed',
}
const statusText = (s) => STATUS_TEXT[s] || s

const age = (r) => {
  const start = new Date(r.incident_started_at || r.created_at).getTime()
  const m = Math.max(0, (props.now - start) / 60000)
  if (m < 60) return `${Math.round(m)}m`
  if (m < 2880) return `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`
  return `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h`
}

const slaTone = (r) => {
  if (r.sla_resolution_breached || r.sla_response_breached) return 'bad'
  if (r.sla_paused_since) return 'paused'
  if (!r.resolution_due_at) return 'none'
  const mins = (new Date(r.resolution_due_at).getTime() - props.now) / 60000
  return mins <= 60 ? 'bad' : mins <= 240 ? 'warn' : 'ok'
}
const slaText = (r) => {
  if (r.sla_resolution_breached) return 'BREACHED'
  if (r.sla_response_breached) return 'RESP BRC'
  if (r.sla_paused_since) return 'PAUSED'
  if (!r.resolution_due_at) return '—'
  const mins = (new Date(r.resolution_due_at).getTime() - props.now) / 60000
  if (mins <= 0) return 'DUE'
  if (mins < 60) return `${Math.round(mins)}m`
  if (mins < 2880) return `${Math.floor(mins / 60)}h ${Math.round(mins % 60)}m`
  return `${Math.floor(mins / 1440)}d`
}
</script>

<style scoped>
.ibd { border-radius: 16px; overflow: hidden; background: var(--sd-surface);
  border: 1px solid var(--sd-border); }

.ibd-head, .row { display: grid; align-items: center; gap: 10px;
  grid-template-columns: var(--cols, 68px 96px minmax(220px, 2fr) minmax(120px, 1fr) 150px 74px 92px 96px); }
.ibd:has(.c-sel) .ibd-head, .ibd:has(.c-sel) .row {
  grid-template-columns: 30px 68px 96px minmax(220px, 2fr) minmax(120px, 1fr) 150px 74px 92px 96px; }
/* impact desks without selection render 9 cells — no 30px .c-sel track here */
.ibd:has(.c-imp) .ibd-head, .ibd:has(.c-imp) .row {
  grid-template-columns: 68px 96px minmax(200px, 2fr) minmax(110px, 1fr) 118px 150px 74px 92px 96px; }
.ibd:has(.c-sel):has(.c-imp) .ibd-head, .ibd:has(.c-sel):has(.c-imp) .row {
  grid-template-columns: 30px 68px 96px minmax(200px, 2fr) minmax(110px, 1fr) 118px 150px 74px 92px 96px; }

.ibd-head { padding: 10px 14px; font-size: 9px; letter-spacing: 0.14em; color: var(--sd-text-muted);
  border-bottom: 1px solid var(--sd-border); background: var(--sd-surface-elevated); }
.sortable { background: none; border: 0; padding: 0; cursor: pointer; text-align: left;
  color: inherit; font: inherit; letter-spacing: inherit; }
.sortable:hover { color: var(--sd-inc-core); }

.ibd-body { display: flex; flex-direction: column; }
.row-shell { animation: sd-deal 0.5s var(--sd-spring) both; animation-delay: calc(var(--i) * 0.04s); }
.row { position: relative; padding: 11px 14px; cursor: pointer; border-bottom: 1px solid var(--sd-border);
  transition: background 0.2s var(--sd-spring); outline: none; }
.compact .row { padding: 7px 14px; }
.row:hover, .row:focus-visible { background: var(--sd-inc-soft); }
.row-spine { position: absolute; left: 0; top: 10%; bottom: 10%; width: 3px; border-radius: 3px;
  background: var(--sd-inc-dim); transition: all 0.25s var(--sd-spring); }
.row.sev1 .row-spine { background: var(--sd-pri-critical); box-shadow: 0 0 10px var(--sd-pri-critical); }
.row.sev2 .row-spine { background: var(--sd-pri-urgent); }
.row.sev3 .row-spine { background: var(--sd-amber); }
.row.mi { background: linear-gradient(90deg, var(--sd-inc-arc-soft), transparent 30%); }

.c-id { font-size: 11px; font-weight: 700; color: var(--sd-text-secondary); }
.c-sub { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.sub-t { font-size: 12.8px; font-weight: 700; color: var(--sd-text); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; }
.sub-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.st { font-style: normal; font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--sd-text-muted); }
.st-in_progress { color: var(--sd-inc-core); }
.st-escalated { color: var(--sd-inc-arc); }
.st-resolved, .st-closed { color: var(--sd-inc-live); }
.mi-chip { display: inline-flex; align-items: center; gap: 3px; font-style: normal; font-size: 8.5px;
  font-weight: 800; letter-spacing: 0.1em; color: var(--sd-inc-arc); background: var(--sd-inc-arc-soft);
  padding: 1px 6px; border-radius: 10px; }
.esc-chip { font-style: normal; font-size: 8.5px; font-weight: 800; color: var(--sd-inc-warn);
  background: var(--sd-inc-warn-soft); padding: 1px 6px; border-radius: 10px; font-family: var(--sd-mono); }
.pir-chip { font-style: normal; font-size: 8.5px; font-weight: 800; letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--sd-inc-live); background: var(--sd-inc-live-soft);
  padding: 1px 6px; border-radius: 10px; }

.c-svc { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; min-width: 0; }
.svc-chip { font-style: normal; font-size: 9.5px; font-weight: 700; color: var(--sd-text-secondary);
  background: var(--sd-surface-elevated); border: 1px solid var(--sd-border);
  padding: 2px 7px; border-radius: 10px; white-space: nowrap; max-width: 110px;
  overflow: hidden; text-overflow: ellipsis; }
.svc-chip.more { color: var(--sd-inc-core); border-color: var(--sd-inc-brd); }
.svc-chip.dim { opacity: 0.7; }

.c-imp { display: flex; align-items: center; gap: 5px; }
.imp-n { display: inline-flex; align-items: center; gap: 3px; font-style: normal; font-size: 10px;
  color: var(--sd-text-secondary); }
.imp-flag { display: inline-grid; place-items: center; width: 16px; height: 16px; border-radius: 5px;
  font-style: normal; font-size: 8.5px; font-weight: 800; color: var(--sd-inc-warn);
  background: var(--sd-inc-warn-soft); border: 1px solid color-mix(in srgb, var(--sd-inc-warn) 40%, transparent); }
.imp-flag.sec { color: var(--sd-inc-arc); background: var(--sd-inc-arc-soft);
  border-color: color-mix(in srgb, var(--sd-inc-arc) 40%, transparent); }
.imp-flag.pub { color: var(--sd-inc-core); background: var(--sd-inc-soft); border-color: var(--sd-inc-brd); }

.c-own { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.own-name { font-size: 11.5px; font-weight: 700; color: var(--sd-text-secondary); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; }
.own-cmd { display: inline-flex; align-items: center; gap: 4px; font-style: normal; font-size: 9.5px;
  color: var(--sd-inc-core); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.own-cmd.missing { color: var(--sd-inc-arc); }

.c-age { font-size: 11px; color: var(--sd-text-secondary); }

.sla { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px; border-radius: 12px;
  font-size: 10px; font-weight: 800; }
.sla-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.sla.ok { color: var(--sd-inc-live); background: var(--sd-inc-live-soft); }
.sla.warn { color: var(--sd-inc-warn); background: var(--sd-inc-warn-soft); }
.sla.warn .sla-dot { animation: sd-inc-led 1.6s ease-in-out infinite; }
.sla.bad { color: var(--sd-inc-arc); background: var(--sd-inc-arc-soft); }
.sla.bad .sla-dot { animation: sd-inc-led 0.9s ease-in-out infinite; }
.sla.paused { color: var(--sd-text-muted); background: var(--sd-surface-elevated); }
.sla.none { color: var(--sd-text-muted); background: transparent; }

.c-act { display: flex; align-items: center; justify-content: flex-end; gap: 5px; }
.act { display: grid; place-items: center; width: 27px; height: 27px; border-radius: 8px;
  cursor: pointer; background: var(--sd-surface-elevated); border: 1px solid var(--sd-border);
  color: var(--sd-text-muted); transition: all 0.2s var(--sd-spring); }
.act:hover { color: var(--sd-text); border-color: var(--sd-inc-brd); transform: translateY(-1px); }
.act.ack { color: var(--sd-inc-live); }
.act.war { color: var(--sd-inc-arc); }

.ibd-empty { display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 44px 20px; color: var(--sd-text-muted); }
.ibd-empty p { margin: 0; font-size: 12.5px; }
.ibd-loading { display: flex; justify-content: center; gap: 6px; padding: 26px; }
.ld { width: 8px; height: 8px; border-radius: 50%; background: var(--sd-inc-core);
  animation: sd-inc-led 1s ease-in-out infinite; }
.ld:nth-child(2) { animation-delay: 0.18s; }
.ld:nth-child(3) { animation-delay: 0.36s; }

.ibd-row-enter-active { transition: all 0.4s var(--sd-spring); }
.ibd-row-enter-from { opacity: 0; transform: translateY(8px); }
.ibd-row-leave-active { transition: all 0.25s ease; position: absolute; opacity: 0; }
.ibd-row-move { transition: transform 0.4s var(--sd-spring); }

@media (max-width: 1000px) {
  .ibd-head { display: none; }
  .row, .ibd:has(.c-sel) .row, .ibd:has(.c-imp) .row { grid-template-columns: 1fr; gap: 6px; }
  .c-act { justify-content: flex-start; }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .row-shell,
  html:not([data-cinematic="on"]) .sla-dot,
  html:not([data-cinematic="on"]) .ld { animation: none !important; }
}
</style>
