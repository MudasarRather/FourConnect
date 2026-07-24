<template>
  <!-- The Beam's board (artifact-faithful): editorial luminous rows on the open field —
       amber mono fault number, roomy subject, a mono micro-status line, and a reserved
       right rail where the SLA readout CROSSFADES into the labeled verb rail on hover
       (reserved space = nothing ever overlaps). The beam's landing row is edge-lit. -->
  <div class="br" :class="{ selectmode: selectable }" @pointerleave="tip.show = false">
    <TransitionGroup name="br-row" tag="div" class="br-body">
      <article v-for="(r, i) in rows" :key="r.id" class="row"
        :class="[`s${r.sev}`, { lit: i === litIndex, sel: selected.includes(String(r.id)), breach: isBreached(r) }]"
        :style="{ '--i': Math.min(i, 12) }" role="row" tabindex="0"
        @click="$emit('open', r.id)" @keydown.enter.self="$emit('open', r.id)"
        @pointermove="moveTip($event, r)" @pointerenter="moveTip($event, r)">
        <span class="edge" aria-hidden="true" />

        <span v-if="selectable" class="c-sel" @click.stop>
          <input type="checkbox" :checked="selected.includes(String(r.id))"
            :aria-label="`Select ${r.ticket_number}`" @change="$emit('toggle', String(r.id))" />
        </span>

        <span class="c-num sd-mono">
          <i class="sev-dot" aria-hidden="true" />{{ r.ticket_number }}
        </span>

        <span class="c-main">
          <span class="subj-line">
            <b class="subj">{{ r.subject }}</b>
            <i v-if="r.is_major_incident" class="mi-chip">MI</i>
          </span>
          <span class="tagline">
            <i v-for="s in (r.affected_services || []).slice(0, 2)" :key="s" class="svc sd-mono">{{ s }}</i>
            <i v-if="!(r.affected_services || []).length && r.category_name" class="svc sd-mono">{{ r.category_name }}</i>
            <em class="micro sd-mono">
              <span class="who">{{ (r.assigned_agent_name || 'UNOWNED').toUpperCase() }}</span>
              <span v-if="r.incident_commander_name" class="ok">· CMDR {{ r.incident_commander_name.toUpperCase() }}</span>
              <span v-else class="bad">· NO CMDR</span>
              <span v-if="!r.acknowledged_at && r.sev <= 2" class="bad">· UNACKED</span>
              <span v-if="r.is_escalated" class="warn">· L{{ r.escalation_level }}</span>
              <span v-if="r.status === 'on_hold' || r.sla_paused_since" class="dim">· HELD</span>
              <span v-if="r.parent_incident_number" class="ok">· ⌐ {{ r.parent_incident_number }}</span>
              <span v-if="r.child_count" class="ok">· {{ r.child_count }} LINKED</span>
              <span v-if="r.has_pir" class="ok">· PIR {{ (r.pir_status || '').replace('_', ' ').toUpperCase() }}</span>
            </em>
          </span>
        </span>

        <!-- reserved right rail: SLA readout ⇄ verb rail (grid-stacked, crossfade) -->
        <span class="c-right" @click.stop>
          <span class="sla" :class="slaTone(r)">
            <small>{{ slaLabel(r) }}</small>
            <b class="sd-mono">{{ slaText(r) }}</b>
          </span>
          <span class="verbs" role="toolbar" :aria-label="`Actions for ${r.ticket_number}`">
            <button v-if="!r.acknowledged_at && r.sev <= 2" class="vb pri" @click="$emit('ack', r)">
              <ShieldCheck :size="12" /> Ack</button>
            <button class="vb" @click="$emit('update', r)"><MessageSquare :size="12" /> Update</button>
            <button v-if="r.war_room_url" class="vb" @click="$emit('bridge', r)"><Video :size="12" /> Bridge</button>
            <button class="vb" @click="$emit('roster', r)"><Crown :size="12" /> Roster</button>
            <button class="vb" @click="$emit('decision', r)"><Gavel :size="12" /> Decision</button>
            <button class="vb" @click="$emit('declare', r)"><Siren :size="12" />
              {{ r.is_major_incident ? 'MI' : 'Declare' }}</button>
            <button class="vb" @click="$emit('link', r)"><Link2 :size="12" /> Link</button>
            <button v-if="r.is_major_incident" class="vb" @click="$emit('war', r)"><Radio :size="12" /> War</button>
            <button class="vb go" @click="$emit('open', r.id)"><ArrowRight :size="12" /> Open</button>
          </span>
        </span>
      </article>
    </TransitionGroup>

    <!-- cursor tooltip (artifact style) -->
    <Teleport to="body">
      <div v-show="tip.show" class="br-tip" :style="{ left: tip.x + 'px', top: tip.y + 'px' }">
        <b class="sd-mono">{{ tip.num }}</b>
        <span>{{ tip.subj }}</span>
        <em class="sd-mono" :class="tip.tone">{{ tip.sla }}</em>
      </div>
    </Teleport>

    <div v-if="!rows.length && !loading" class="br-empty">
      <span class="ring"><Zap :size="20" /></span>
      <p>{{ empty }}</p>
      <slot name="empty-actions" />
    </div>
    <div v-if="loading && !rows.length" class="br-loading"><span /><span /><span /></div>
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue'
import {
  ShieldCheck, Radio, ArrowRight, Siren, Crown, Zap, MessageSquare, Video, Gavel, Link2,
} from 'lucide-vue-next'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  now: { type: Number, default: () => Date.now() },
  loading: { type: Boolean, default: false },
  selectable: { type: Boolean, default: false },
  selected: { type: Array, default: () => [] },
  selIndex: { type: Number, default: -1 },      // keyboard selection ring (-1 = none)
  empty: { type: String, default: 'Nothing under the light — the desk holds.' },
})
defineEmits(['open', 'toggle', 'ack', 'update', 'bridge', 'roster', 'decision', 'declare', 'link', 'war'])

/* the beam lands on the keyboard selection, else the first row */
const litIndex = computed(() => (props.selIndex >= 0 && props.selIndex < props.rows.length ? props.selIndex : 0))

const isBreached = (r) => !!(r.sla_resolution_breached || r.sla_response_breached)
const slaTone = (r) => {
  if (isBreached(r)) return 'bad'
  if (r.sla_paused_since) return 'paused'
  if (!r.resolution_due_at) return 'none'
  const mins = (new Date(r.resolution_due_at).getTime() - props.now) / 60000
  return mins <= 60 ? 'bad' : mins <= 240 ? 'warn' : 'ok'
}
const slaLabel = (r) => (isBreached(r) ? 'OVERDUE' : r.sla_paused_since ? 'HELD' : 'TO BREACH')
const slaText = (r) => {
  if (r.sla_resolution_breached) return 'BREACHED'
  if (r.sla_response_breached) return 'RESP BRC'
  if (r.sla_paused_since) return 'PAUSED'
  if (!r.resolution_due_at) return '—'
  const mins = (new Date(r.resolution_due_at).getTime() - props.now) / 60000
  if (mins <= 0) return 'DUE'
  if (mins < 60) return `${Math.round(mins)}m ${String(59 - (Math.floor(props.now / 1000) % 60)).padStart(2, '0')}s`
  if (mins < 2880) return `${Math.floor(mins / 60)}h ${String(Math.round(mins % 60)).padStart(2, '0')}m`
  return `${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h`
}

/* cursor tooltip — fixed-position, artifact style */
const tip = reactive({ show: false, x: 0, y: 0, num: '', subj: '', sla: '', tone: 'ok' })
const moveTip = (e, r) => {
  tip.num = r.ticket_number
  tip.subj = r.subject
  tip.sla = isBreached(r) ? 'SLA BREACHED' : r.sla_paused_since ? 'SLA PAUSED'
    : `${slaText(r)} TO BREACH`
  tip.tone = slaTone(r)
  tip.x = Math.min(e.clientX + 18, window.innerWidth - 320)
  tip.y = Math.min(e.clientY + 18, window.innerHeight - 90)
  tip.show = true
}
</script>

<style scoped>
.br-body { display: flex; flex-direction: column; }

.row { position: relative; display: flex; align-items: center; gap: 20px; min-height: 74px;
  padding: 15px 22px 15px 24px; cursor: pointer; outline: none;
  border-bottom: 1px solid var(--sd-border);
  animation: sd-deal 0.5s var(--sd-spring) both; animation-delay: calc(var(--i) * 0.05s);
  transition: background 0.3s var(--sd-spring); }
.row:last-child { border-bottom: 0; }
.row:hover, .row:focus-visible {
  background: linear-gradient(90deg, color-mix(in srgb, var(--sd-inc-soft) 75%, transparent), transparent 82%); }
.row:focus-visible { box-shadow: inset 0 0 0 1px var(--sd-inc-core); border-radius: 12px; }
.row.sel { background: var(--sd-inc-soft); }

/* the beam's landing — luminous top edge on the lit row */
.row .edge { position: absolute; inset: 0 0 auto; height: 1.5px; opacity: 0; pointer-events: none;
  background: linear-gradient(90deg, transparent 4%, var(--sd-inc-hi), var(--sd-inc-core), transparent 96%);
  box-shadow: 0 0 18px var(--sd-inc-core); transition: opacity 0.4s; }
.row.lit .edge { opacity: 0.85; }
.row.lit { background: linear-gradient(90deg, color-mix(in srgb, var(--sd-inc-soft) 85%, transparent), transparent 78%); }
.row.breach.lit .edge { background: linear-gradient(90deg, transparent 4%, var(--sd-inc-arc), var(--sd-inc-core), transparent 96%);
  box-shadow: 0 0 18px var(--sd-inc-arc); }

.c-sel { flex: none; }
.c-sel input { accent-color: var(--sd-inc-core); width: 15px; height: 15px; cursor: pointer; }

.c-num { flex: 0 0 118px; display: inline-flex; align-items: center; gap: 9px;
  font-size: 12px; font-weight: 700; letter-spacing: 0.04em; color: var(--sd-inc-core); }
.sev-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--sd-inc-dim); flex: none; }
.row.s1 .sev-dot { background: var(--sd-pri-critical); box-shadow: 0 0 10px var(--sd-pri-critical);
  animation: sd-inc-led 1.3s ease-in-out infinite; }
.row.s2 .sev-dot { background: var(--sd-pri-urgent); }
.row.s3 .sev-dot { background: var(--sd-amber); }

.c-main { flex: 1; min-width: 0; }
.subj-line { display: flex; align-items: center; gap: 9px; min-width: 0; }
.subj { font-size: 15.5px; font-weight: 560; letter-spacing: -0.01em; color: var(--sd-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mi-chip { flex: none; font-style: normal; font-size: 8px; letter-spacing: 0.14em; font-weight: 800;
  padding: 2px 7px; border-radius: 999px; color: var(--sd-inc-arc); border: 1px solid var(--sd-inc-arc);
  background: var(--sd-inc-arc-soft); animation: sd-breathe 2s ease-in-out infinite; }
.tagline { display: flex; align-items: center; gap: 7px; margin-top: 6px; flex-wrap: wrap; min-width: 0; }
.svc { font-style: normal; font-size: 9px; letter-spacing: 0.04em; color: var(--sd-text-muted);
  padding: 2.5px 9px; border-radius: 6px; background: color-mix(in srgb, var(--sd-surface) 70%, transparent);
  border: 1px solid var(--sd-border); }
.micro { font-style: normal; font-size: 9px; letter-spacing: 0.1em; font-weight: 700;
  color: var(--sd-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.micro .who { color: var(--sd-text-secondary); }
.micro .ok { color: var(--sd-inc-core); }
.micro .warn { color: var(--sd-inc-warn); }
.micro .bad { color: var(--sd-inc-arc); }
.micro .dim { color: var(--sd-text-muted); }

/* reserved right rail — SLA and verbs occupy the SAME grid cell and crossfade,
   so the verb rail can never overlap the row's data columns */
.c-right { flex: 0 0 auto; min-width: 150px; display: grid; align-items: center; justify-items: end; }
.c-right > * { grid-area: 1 / 1; }
.sla { text-align: right; transition: opacity 0.25s var(--sd-spring), transform 0.25s var(--sd-spring); }
.sla small { display: block; font-size: 7.5px; letter-spacing: 0.16em; font-weight: 800;
  color: var(--sd-text-muted); }
.sla b { font-size: 16px; font-weight: 400; color: var(--sd-text); }
.sla.bad b { color: var(--sd-inc-arc); }
.sla.warn b { color: var(--sd-inc-warn); }
.sla.paused b { color: var(--sd-text-muted); }
.verbs { display: flex; gap: 5px; flex-wrap: nowrap; opacity: 0; pointer-events: none;
  transform: translateX(10px); transition: all 0.3s var(--sd-spring); }
.row:hover .sla, .row:focus-within .sla { opacity: 0; transform: translateX(-8px); }
.row:hover .verbs, .row:focus-within .verbs { opacity: 1; pointer-events: auto; transform: none; }
.vb { display: inline-flex; align-items: center; gap: 5px; padding: 6.5px 11px; border-radius: 9px;
  cursor: pointer; font: inherit; font-size: 10.5px; font-weight: 750; white-space: nowrap;
  color: var(--sd-text-secondary);
  background: color-mix(in srgb, var(--sd-surface-elevated) 92%, transparent);
  border: 1px solid var(--sd-border);
  transition: all 0.2s var(--sd-spring); }
.vb:hover { transform: translateY(-2px); color: var(--sd-inc-core); border-color: var(--sd-inc-core);
  background: var(--sd-inc-soft); }
.vb:focus-visible { outline: 2px solid var(--sd-inc-core); outline-offset: 1px; }
.vb.pri { color: #1a1206; background: var(--sd-inc-grad); border-color: transparent;
  box-shadow: 0 6px 16px -6px var(--sd-inc-core); }
[data-theme="light"] .vb.pri { color: #fff8ec; }
.vb.go { color: var(--sd-inc-core); }

/* cursor tooltip */
.br-tip { position: fixed; z-index: 3000; pointer-events: none; display: flex; flex-direction: column;
  gap: 3px; max-width: 300px; padding: 10px 13px; border-radius: 13px;
  background: color-mix(in srgb, var(--sd-surface-elevated) 92%, transparent);
  border: 1px solid var(--sd-inc-brd);
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 18px 44px -16px rgba(0, 0, 0, 0.5); }
[data-theme="light"] .br-tip { background: rgba(255, 250, 240, 0.94);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 18px 40px -16px rgba(122, 90, 40, 0.4); }
.br-tip b { font-size: 10.5px; letter-spacing: 0.06em; color: var(--sd-inc-core); }
.br-tip span { font-size: 12px; font-weight: 600; color: var(--sd-text); line-height: 1.35; }
.br-tip em { font-style: normal; font-size: 9px; letter-spacing: 0.14em; font-weight: 800;
  color: var(--sd-text-muted); }
.br-tip em.bad { color: var(--sd-inc-arc); }
.br-tip em.warn { color: var(--sd-inc-warn); }
.br-tip em.paused { color: var(--sd-text-muted); }

/* enter / leave / move (arrivals ride the beam in) */
.br-row-enter-active { transition: all 0.55s var(--sd-spring); }
.br-row-leave-active { transition: all 0.35s ease; position: absolute; width: 100%; }
.br-row-enter-from { opacity: 0; transform: translateY(-16px) scale(0.995); }
.br-row-leave-to { opacity: 0; transform: translateY(8px); }
.br-row-move { transition: transform 0.55s var(--sd-spring); }

.br-empty { display: flex; flex-direction: column; align-items: center; gap: 11px; padding: 52px 20px;
  color: var(--sd-text-muted); text-align: center; }
.br-empty .ring { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 50%;
  color: var(--sd-inc-core); background: var(--sd-inc-soft); border: 1px solid var(--sd-inc-brd); }
.br-empty p { margin: 0; font-size: 12.5px; }
.br-loading { display: flex; gap: 7px; justify-content: center; padding: 48px; }
.br-loading span { width: 8px; height: 8px; border-radius: 50%; background: var(--sd-inc-core);
  animation: sd-breathe 1s ease-in-out infinite; }
.br-loading span:nth-child(2) { animation-delay: 0.16s; }
.br-loading span:nth-child(3) { animation-delay: 0.32s; }

@media (max-width: 1100px) { .c-right { min-width: 120px; } }
@media (max-width: 900px) {
  .row { flex-wrap: wrap; gap: 10px; }
  .c-num { flex-basis: 100%; }
  .subj { white-space: normal; }
  .c-right { flex-basis: 100%; justify-items: start; }
  .sla { display: none; }
  .verbs { opacity: 1; pointer-events: auto; transform: none; position: static; flex-wrap: wrap; }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .row,
  html:not([data-cinematic="on"]) .mi-chip,
  html:not([data-cinematic="on"]) .sev-dot { animation: none !important; }
}
</style>
