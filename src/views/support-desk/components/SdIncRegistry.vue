<template>
  <!-- SdIncRegistry — THE REGISTRY board of "THE DAILY FAULT" (agent Critical desk).
       Ruled broadsheet rows over the server-paged composable window (NO client
       windowing): mono figures, red-ink ✗ marks drawn on breached / overdue rows,
       lane dots on my faults, SLA + cadence clock cells, playbook progress, and the
       PENCIL TRAY — the verb rail sliding out of the row rule. SdIncVerbRail stays
       THE permission surface; this file only restyles it via :deep into the
       artifact's mono text verbs (labels printed from the rail's stable titles). -->
  <section class="registry" aria-label="The registry — live SEV1 and SEV2 board">
    <div class="section-rule">The Registry — Live Exposure
      <span class="tag">SEV1 ∪ SEV2 · <span class="num">{{ total }}</span> STANDING</span>
    </div>
    <div class="reg-head" aria-hidden="true">
      <span /><span>Fault</span><span>Sev</span><span>Subject &amp; exposure</span>
      <span>Pen / Command</span><span>SLA clock</span><span>Cadence</span><span>Playbook</span>
    </div>

    <!-- loading shimmer -->
    <template v-if="loading && !rows.length">
      <div v-for="i in 4" :key="`shim-${i}`" class="rowwrap shim" :style="{ '--i': i }" aria-hidden="true" />
    </template>

    <!-- empty sheet -->
    <div v-else-if="!rows.length" class="reg-empty">
      <p class="re-head">PRESS HOLDS — NO SEV1 ∪ SEV2 STANDING ON THIS FILTER</p>
      <p class="re-sub">The registry prints a clean sheet. New faults land here the moment the wire carries them.</p>
      <button v-if="filtered" class="re-clear" @click="$emit('lens', 'all')">LIFT THE FILTER — BACK TO ALL FAULTS</button>
    </div>

    <!-- the rows -->
    <div v-for="(r, i) in rows" v-else :key="r.id" class="rowwrap" :data-rid="r.id"
      :class="{ 'is-pinned': isPinned(r), 'row-flash': flashSet.has(String(r.id)) }"
      :style="{ '--i': Math.min(i, 13) }">
      <div class="row">
        <span class="mk">
          <svg v-if="exception(r)" viewBox="0 0 26 26" :aria-label="`Exception — ${exception(r)}`">
            <path class="xmark" pathLength="60"
              d="M5 6 C 10 10, 16 16, 21 21 M21 5 C 15 11, 10 16, 5 21"
              :style="{ animationDelay: (1.4 + Math.min(i, 13) * 0.2) + 's' }" /></svg>
          <span v-else-if="isMine(r)" class="lanedot" title="My lane — I hold the pen" />
        </span>

        <span class="fid num">{{ r.ticket_number }}
          <button v-if="r.is_major_incident" class="mi-tick" title="Open the war room"
            @click.stop="$emit('war', r)">MI · LIVE</button>
          <span v-else-if="r.mi_proposed_at" class="mi-tick warn">MI · PROPOSED</span>
        </span>

        <span><span class="sev-badge" :class="r.sev === 1 ? 's1' : 's2'">SEV{{ r.sev }}</span></span>

        <span class="subj">
          <button class="s-title" :title="r.subject" @click="$emit('open', r.id)">{{ r.subject }}</button>
          <span class="chips">
            <span v-for="c in chips(r)" :key="c.label" class="chip" :class="c.cls">{{ c.label }}</span>
          </span>
        </span>

        <span class="who">
          <span class="avatar num" :class="{ none: !r.assigned_agent_id }">{{ initials(r) }}</span>
          <span class="who-txt">
            <span class="wn" :class="{ red: !r.assigned_agent_id }">{{ r.assigned_agent_name || 'Unowned' }}
              <i v-if="isMine(r)" class="me-tag">(me)</i></span>
            <span class="wr" :class="{ red: whoLine(r).red }">{{ whoLine(r).txt }}</span>
          </span>
        </span>

        <span class="cell-clock">
          <template v-if="r.sla_paused_since"><span class="paused">SLA PAUSED</span></template>
          <template v-else-if="slaCell(r)">
            <span class="cv num" :class="slaCell(r).cls">{{ slaCell(r).v }}</span>
            <span class="ck">{{ slaCell(r).k }}</span>
          </template>
          <template v-else><span class="cv num dim">—</span><span class="ck">NO SLA CLOCK</span></template>
        </span>

        <span class="cell-clock">
          <template v-if="cadCell(r)">
            <span class="cv num" :class="cadCell(r).cls">{{ cadCell(r).v }}</span>
            <span class="ck">{{ cadCell(r).k }}</span>
          </template>
          <template v-else><span class="cv num dim">—</span><span class="ck">NO CADENCE SET</span></template>
        </span>

        <span class="pb">
          <template v-if="r.task_total > 0">
            <span class="pbnum num" :class="{ alldone: r.task_done >= r.task_total }">
              {{ r.task_done }}/{{ r.task_total }}<i v-if="r.task_done >= r.task_total"> ✓</i></span>
            <span class="pbtrack">
              <span v-for="s in Math.min(r.task_total, 12)" :key="s" class="seg"
                :class="{ on: s <= segOn(r), all: r.task_done >= r.task_total }" /></span>
          </template>
          <button v-else class="apply" @click="$emit('playbook', r)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>APPLY PLAYBOOK</button>
        </span>
      </div>

      <!-- the pencil tray — verbs slide from the row rule -->
      <div class="tray">
        <div class="tray-inner">
          <SdIncVerbRail :row="r" variant="agent" :busy-id="busyId"
            @ack="$emit('ack', $event)" @update="$emit('update', $event)"
            @playbook="$emit('playbook', $event)" @roster="$emit('roster', $event)"
            @impact="$emit('impact', $event)" @decision="$emit('decision', $event)"
            @link="$emit('link', $event)" @propose="$emit('propose', $event)"
            @declare="$emit('declare', $event)" @bridge="$emit('bridge', $event)"
            @reclassify="$emit('reclassify', $event)" @escalate="$emit('escalate', $event)" />
          <button class="verb-open" @click="$emit('open', r.id)">Open</button>
          <span v-if="isPinned(r) && r.id === pinnedId" class="tray-note">the pencil tray — verbs slide from the row rule</span>
        </div>
      </div>

      <!-- inline playbook — the printed checklist unfolds under the row -->
      <div v-if="String(expandedId) === String(r.id)" class="row-playbook">
        <SdIncPlaybook :ticket="r" @changed="$emit('playbook-changed', r)" />
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
import SdIncVerbRail from './SdIncVerbRail.vue'
import SdIncPlaybook from './SdIncPlaybook.vue'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  now: { type: Number, default: () => Date.now() },
  loading: { type: Boolean, default: false },
  total: { type: Number, default: 0 },
  filtered: { type: Boolean, default: false },     // a lens/search is active (empty state offers the lift)
  meId: { type: [String, Number], default: null },
  pinnedId: { type: [String, Number], default: null },   // the lead row rides with its tray out
  expandedId: { type: [String, Number], default: null }, // inline playbook target
  busyId: { type: [String, Number], default: null },
  flashId: { type: [String, Number], default: null },    // ?focus / circled-figure jump
  arrivalIds: { type: Array, default: () => [] },        // fresh rows flash on the silent poll
  reduced: { type: Boolean, default: false },
})
const emit = defineEmits([
  'open', 'lens', 'war', 'ack', 'update', 'playbook', 'roster', 'impact', 'decision',
  'link', 'propose', 'declare', 'bridge', 'reclassify', 'escalate', 'playbook-changed',
])

/* ── row semantics ── */
const isMine = (r) => props.meId != null && String(r.assigned_agent_id) === String(props.meId)
const isPinned = (r) => String(r.id) === String(props.pinnedId) || String(r.id) === String(props.expandedId)
const cadOverdue = (r) => !!(r.next_update_due_at && new Date(r.next_update_due_at).getTime() < props.now)
const exception = (r) => {
  if (r.sla_resolution_breached || r.sla_response_breached) return 'SLA breached'
  if (cadOverdue(r)) return 'cadence overdue'
  if (!r.assigned_agent_id) return 'unowned'
  return ''
}
const initials = (r) => {
  const n = String(r.assigned_agent_name || '').trim()
  if (!n) return '—'
  const p = n.split(/\s+/)
  return (p[0][0] + (p[1]?.[0] || '')).toUpperCase()
}

const pad = (n) => String(n).padStart(2, '0')
const shortMin = (ms) => {
  const m = Math.max(0, Math.round(ms / 60000))
  return m >= 60 ? `${Math.floor(m / 60)}h ${pad(m % 60)}m` : `${m}m`
}
const sinceShort = (ts) => (ts ? shortMin(props.now - new Date(ts).getTime()) : '—')
const fmtDur = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60
  return h > 0 ? `${h}h ${pad(m)}m ${pad(ss)}s` : `${m}m ${pad(ss)}s`
}
const fmtNum = (n) => Number(n).toLocaleString()

const whoLine = (r) => {
  if (!r.assigned_agent_id) return { txt: 'UNACKED · NO PEN', red: true }
  if (!r.acknowledged_at) return { txt: `UNACKED · ${sinceShort(r.created_at)}`, red: true }
  if (r.is_major_incident && !r.incident_commander_id) return { txt: 'CMDR UNSTAFFED', red: true }
  if (r.incident_commander_name) {
    const p = String(r.incident_commander_name).trim().split(/\s+/)
    const last = p.length > 1 ? p[p.length - 1] : p[0]
    return { txt: `CMDR ${String(last).toUpperCase()} · ACKED`, red: false }
  }
  return { txt: 'ACKED', red: false }
}

const slaCell = (r) => {
  if (r.sla_resolution_breached) return { v: `BREACHED +${sinceShort(r.resolution_due_at)}`, k: 'SLA EXCEEDED', cls: 'red over' }
  if (!r.resolution_due_at) return null
  const ms = new Date(r.resolution_due_at).getTime() - props.now
  if (ms <= 0) return { v: 'DUE NOW', k: 'TO BREACH', cls: 'red over' }
  if (ms < 2 * 36e5) return { v: fmtDur(ms), k: 'TO BREACH', cls: 'red' }
  if (ms < 4 * 36e5) return { v: fmtDur(ms), k: 'TO BREACH · AT-RISK', cls: 'warn' }
  return { v: fmtDur(ms), k: 'TO BREACH · HEALTHY', cls: 'live' }
}
const cadCell = (r) => {
  if (!r.update_interval_minutes && !r.next_update_due_at) return null
  const promise = r.update_interval_minutes ? `${r.update_interval_minutes}m PROMISE` : 'PROMISE'
  if (!r.next_update_due_at) return { v: '—', k: `NEXT · ${promise}`, cls: 'dim' }
  const ms = new Date(r.next_update_due_at).getTime() - props.now
  if (ms <= 0) return { v: `+${shortMin(-ms)}`, k: `OVERDUE · ${promise}`, cls: 'red over' }
  return { v: fmtDur(ms), k: `NEXT · ${promise}`, cls: 'gold' }
}
const segOn = (r) => {
  const cap = Math.min(r.task_total, 12)
  return Math.round((r.task_done / Math.max(1, r.task_total)) * cap)
}

const chips = (r) => {
  const out = []
  if (r.revenue_impact) out.push({ label: 'REV', cls: 'exp' })
  if (r.public_impact) out.push({ label: 'PUB', cls: 'exp' })
  if (r.compliance_impact) out.push({ label: 'COMP', cls: 'exp' })
  if (r.security_impact) out.push({ label: 'SEC', cls: 'expred' })
  if (r.affected_users != null) out.push({ label: `${fmtNum(r.affected_users)} USERS`, cls: 'num' })
  else out.push({ label: 'UNASSESSED', cls: 'expred' })
  if (r.child_count > 0) out.push({ label: `${r.child_count} CHILD${r.child_count === 1 ? '' : 'REN'}`, cls: 'link' })
  if (r.parent_incident_number) out.push({ label: `CHILD OF ${r.parent_incident_number}`, cls: 'link' })
  if (r.war_room_url) out.push({ label: 'BRIDGE ON', cls: '' })
  if (r.sla_paused_since) out.push({ label: 'CLOCK PAUSED', cls: '' })
  return out.slice(0, 5)
}

/* ── focus / arrival flashes ── */
const flashSet = ref(new Set())
const flashTimers = new Set()
const flash = (ids) => {
  const next = new Set(flashSet.value)
  ids.forEach((id) => next.add(String(id)))
  flashSet.value = next
  const t = setTimeout(() => {
    const after = new Set(flashSet.value)
    ids.forEach((id) => after.delete(String(id)))
    flashSet.value = after
    flashTimers.delete(t)
  }, 1500)
  flashTimers.add(t)
}
watch(() => props.flashId, (id) => {
  if (!id) return
  flash([id])
  nextTick(() => {
    const el = document.querySelector(`.registry [data-rid="${id}"]`)
    el?.scrollIntoView({ behavior: props.reduced ? 'auto' : 'smooth', block: 'center' })
  })
})
watch(() => props.arrivalIds, (ids) => { if (ids?.length) flash(ids) })
onBeforeUnmount(() => flashTimers.forEach((t) => clearTimeout(t)))
</script>

<style scoped>
/* ══════════ THE REGISTRY — ruled board (sepia newsprint over --sd-inc-*) ══════════ */
.registry { padding: 8px 0 6px; }
.num { font-family: var(--sd-mono); font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; }
button { font: inherit; color: inherit; background: none; border: none; cursor: pointer; }
:focus-visible { outline: 2px solid var(--sd-inc-core); outline-offset: 3px; border-radius: 2px; }

.section-rule { display: flex; align-items: center; gap: 12px; font-weight: 700; font-size: 11px;
  letter-spacing: 0.26em; text-transform: uppercase; color: var(--df-ink-2);
  padding: 12px 0; border-bottom: 1px solid var(--df-rule); margin-bottom: 4px; }
.section-rule::after { content: ""; flex: 1; height: 1px; background: var(--df-rule); }
.section-rule .tag { font-family: var(--sd-mono); font-weight: 500; font-size: 9.5px;
  letter-spacing: 0.18em; color: var(--sd-inc-core); border: 1px solid var(--sd-inc-brd);
  padding: 3px 8px; border-radius: 2px; }

.reg-head { display: grid; grid-template-columns: 34px 96px 58px minmax(0, 1fr) 168px 160px 158px 104px;
  gap: 10px; padding: 10px 0 8px; border-bottom: 2px solid var(--df-rule-strong);
  font-family: var(--sd-mono); font-size: 9px; font-weight: 600; letter-spacing: 0.2em;
  text-transform: uppercase; color: var(--df-ink-3); }

.rowwrap { border-bottom: 1px solid var(--df-rule); transition: background 0.25s;
  animation: tdf-deal 0.5s var(--sd-spring) both; animation-delay: calc(var(--i, 0) * 0.05s); }
@keyframes tdf-deal { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.rowwrap:hover, .rowwrap.is-pinned { background: var(--df-goldwash); }
.rowwrap.row-flash { animation: tdf-rowflash 1.4s var(--sd-spring); }
@keyframes tdf-rowflash { 0% { background: color-mix(in srgb, var(--sd-inc-core) 28%, transparent); }
  100% { background: transparent; } }
.rowwrap.shim { height: 58px; border-bottom-style: dashed; position: relative; overflow: hidden; }
.rowwrap.shim::after { content: ''; position: absolute; inset: 0;
  background: linear-gradient(100deg, transparent 30%, var(--df-goldwash) 50%, transparent 70%);
  animation: tdf-shim 1.4s linear infinite; }
@keyframes tdf-shim { from { transform: translateX(-100%); } to { transform: translateX(100%); } }

.row { display: grid; grid-template-columns: 34px 96px 58px minmax(0, 1fr) 168px 160px 158px 104px;
  gap: 10px; align-items: center; padding: 14px 0; }
.row .mk { display: grid; place-items: center; height: 100%; }
.row .mk svg { width: 26px; height: 26px; overflow: visible; }
.row .mk .xmark { stroke: var(--sd-inc-arc); stroke-width: 2.2; fill: none; stroke-linecap: round;
  stroke-dasharray: 60; stroke-dashoffset: 60; animation: tdf-ink2 0.8s var(--sd-spring) forwards; }
@keyframes tdf-ink2 { to { stroke-dashoffset: 0; } }
.row .mk .lanedot { width: 8px; height: 8px; border-radius: 50%; background: var(--sd-inc-core);
  box-shadow: 0 0 0 3px var(--df-goldwash); }

.row .fid { font-size: 12.5px; font-weight: 700; color: var(--df-ink); letter-spacing: 0.04em; }
.mi-tick { display: block; font-family: var(--sd-mono); font-size: 8.5px; font-weight: 600;
  letter-spacing: 0.16em; color: var(--sd-inc-arc); margin-top: 3px; padding: 0; text-align: left; }
.mi-tick:hover { text-decoration: underline; }
.mi-tick.warn { color: var(--sd-inc-warn); cursor: default; }

.sev-badge { font-family: var(--sd-mono); font-size: 9.5px; font-weight: 700; letter-spacing: 0.16em;
  padding: 3px 8px; border-radius: 2px; }
.sev-badge.s1 { background: var(--sd-inc-arc); color: #fff; }
.sev-badge.s2 { background: transparent; color: var(--sd-inc-warn); border: 1px solid var(--sd-inc-warn); }

.row .subj { min-width: 0; }
.s-title { display: block; width: 100%; padding: 0; text-align: left; font-weight: 600;
  font-size: 14.5px; letter-spacing: -0.005em; line-height: 1.3; color: var(--df-ink);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.s-title:hover { color: var(--sd-inc-core); }
.subj .chips { display: flex; gap: 5px; margin-top: 6px; flex-wrap: wrap; }
.chip { font-family: var(--sd-mono); font-size: 8.5px; font-weight: 600; letter-spacing: 0.1em;
  text-transform: uppercase; padding: 2.5px 7px; border-radius: 2px;
  border: 1px solid var(--df-rule-strong); color: var(--df-ink-3); }
.chip.exp { border-color: var(--sd-inc-brd); color: var(--sd-inc-core); }
.chip.expred { border-color: var(--sd-inc-arc); color: var(--sd-inc-arc); border-style: dashed; }
.chip.link { border-style: dotted; }

.row .who { display: flex; align-items: center; gap: 9px; min-width: 0; }
.avatar { width: 26px; height: 26px; border-radius: 50%; flex: none; display: grid; place-items: center;
  font-size: 9px; font-weight: 700; letter-spacing: 0.05em; background: var(--df-paper-hi);
  border: 1px solid var(--sd-inc-brd); color: var(--sd-inc-core); }
.avatar.none { border: 1px dashed var(--sd-inc-arc); color: var(--sd-inc-arc); background: transparent; }
.who-txt { min-width: 0; }
.who .wn { display: block; font-size: 12.5px; font-weight: 600; line-height: 1.25;
  color: var(--df-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.who .wn.red { color: var(--sd-inc-arc); }
.me-tag { font-style: normal; color: var(--sd-inc-core); }
.who .wr { font-family: var(--sd-mono); font-size: 8.5px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--df-ink-3); display: block; margin-top: 2px; }
.who .wr.red { color: var(--sd-inc-arc); animation: tdf-overdue2 1.8s infinite; }

.cell-clock .cv { display: block; font-size: 13px; font-weight: 600; color: var(--df-ink); }
.cell-clock .cv.red { color: var(--sd-inc-arc); }
.cell-clock .cv.warn { color: var(--sd-inc-warn); }
.cell-clock .cv.live { color: var(--sd-inc-live); }
.cell-clock .cv.gold { color: var(--sd-inc-core); }
.cell-clock .cv.dim { color: var(--df-ink-3); }
.cell-clock .ck { font-family: var(--sd-mono); font-size: 8.5px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--df-ink-3); display: block; margin-top: 3px; }
.cell-clock .paused { font-family: var(--sd-mono); font-size: 10px; letter-spacing: 0.1em;
  color: var(--df-ink-3); border: 1px dashed var(--df-rule-strong); padding: 3px 7px; display: inline-block; }
.cell-clock .over { animation: tdf-overdue2 1.6s infinite; }
@keyframes tdf-overdue2 { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }

.pb { display: flex; flex-direction: column; gap: 5px; }
.pb .pbnum { font-size: 11px; font-weight: 600; color: var(--df-ink-2); }
.pb .pbnum.alldone, .pb .pbnum i { color: var(--sd-inc-live); font-style: normal; }
.pb .pbtrack { display: flex; gap: 2.5px; }
.pb .seg { width: 11px; height: 4px; border-radius: 1px; background: var(--df-rule); }
.pb .seg.on { background: var(--sd-inc-core); }
.pb .seg.on.all { background: var(--sd-inc-live); }
.pb .apply { font-family: var(--sd-mono); font-size: 8.5px; font-weight: 600; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--sd-inc-core); border: 1px dashed var(--sd-inc-brd);
  padding: 4px 8px; border-radius: 2px; text-align: left; display: inline-flex; align-items: center;
  gap: 5px; transition: background 0.2s; align-self: flex-start; }
.pb .apply:hover { background: var(--df-goldwash); }
.pb .apply svg { width: 11px; height: 11px; }

/* ── the pencil tray ── */
.tray { max-height: 0; overflow: hidden; transition: max-height 0.45s var(--sd-spring); }
.rowwrap:hover .tray, .rowwrap.is-pinned .tray, .rowwrap:focus-within .tray { max-height: 72px; }
.tray-inner { display: flex; gap: 6px; align-items: center; padding: 4px 0 13px 34px; flex-wrap: wrap;
  position: relative; }
.tray-inner::before { content: ""; position: absolute; left: 34px; right: 0; top: 0; height: 1px;
  background: repeating-linear-gradient(90deg, var(--df-rule-strong) 0 5px, transparent 5px 9px); }

/* the rail, re-set as the artifact's mono text verbs (labels from the rail's stable titles) */
.tray-inner :deep(.ivr) { gap: 6px; }
.tray-inner :deep(.ivr-btn) { width: auto; height: auto; padding: 6px 11px; border-radius: 2px;
  background: transparent; border: 1px solid transparent; color: var(--df-ink-2);
  display: inline-flex; align-items: center; gap: 6px; font-family: var(--sd-mono); font-size: 9.5px;
  font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
  transition: transform 0.25s var(--sd-spring), color 0.15s, border-color 0.15s, background 0.2s; }
.tray-inner :deep(.ivr-btn:hover) { color: var(--sd-inc-core); border-color: var(--sd-inc-brd);
  background: transparent; transform: translateY(-1px); }
.tray-inner :deep(.ivr-btn svg) { width: 12px; height: 12px; }
.tray-inner :deep(.ivr-btn)::after { font: inherit; }
.tray-inner :deep(.ivr-btn[title^="Acknowledge"])::after { content: "Ack"; }
.tray-inner :deep(.ivr-btn[title^="Post stakeholder"])::after { content: "Update"; }
.tray-inner :deep(.ivr-btn[title^="Response playbook"])::after { content: "Playbook"; }
.tray-inner :deep(.ivr-btn[title^="Staff the command"])::after { content: "Roster"; }
.tray-inner :deep(.ivr-btn[title^="Impact detail"])::after { content: "Impact"; }
.tray-inner :deep(.ivr-btn[title^="Log a command"])::after { content: "Decision"; }
.tray-inner :deep(.ivr-btn[title^="Link parent"])::after { content: "Link"; }
.tray-inner :deep(.ivr-btn[title^="Declare major"])::after { content: "Declare MI"; }
.tray-inner :deep(.ivr-btn[title^="Propose major"])::after { content: "Propose MI"; }
.tray-inner :deep(.ivr-btn[title^="MI candidate"])::after { content: "MI Candidate"; }
.tray-inner :deep(.ivr-btn[title^="Join the war-room"])::after { content: "Bridge"; }
.tray-inner :deep(.ivr-btn[title^="Promote to SEV2"])::after { content: "Promote SEV2"; }
.tray-inner :deep(.ivr-btn[title^="De-escalate"])::after { content: "De-escalate"; }
/* Ack = the hot verb (only rendered while unacked) — gradient + the ack-pulse ring */
.tray-inner :deep(.ivr-btn.live) { background: var(--sd-inc-grad); color: #1c1206; font-weight: 700;
  border-color: transparent; position: relative; animation: tdf-ackring 1.8s var(--sd-spring) infinite; }
.tray-inner :deep(.ivr-btn.live:hover) { color: #1c1206; transform: translateY(-2px); }
@keyframes tdf-ackring { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-inc-core) 55%, transparent); }
  100% { box-shadow: 0 0 0 9px transparent; } }
.tray-inner :deep(.ivr-btn.warn) { color: var(--df-ink-2); }
.tray-inner :deep(.ivr-btn.warn:hover) { color: var(--sd-inc-warn); border-color: var(--sd-inc-warn); }

.verb-open { font-family: var(--sd-mono); font-size: 9.5px; font-weight: 600; letter-spacing: 0.1em;
  text-transform: uppercase; padding: 6px 11px; border-radius: 2px; color: var(--df-ink-2);
  border: 1px solid transparent;
  transition: transform 0.25s var(--sd-spring), color 0.15s, border-color 0.15s; }
.verb-open:hover { color: var(--sd-inc-core); border-color: var(--sd-inc-brd); transform: translateY(-1px); }
.tray-note { margin-left: auto; font-family: var(--df-serif); font-style: italic; font-size: 12px;
  color: var(--df-ink-3); }

/* inline playbook — printed checklist skin over SdIncPlaybook */
.row-playbook { padding: 4px 0 16px 34px; }
.row-playbook :deep(.pbk) { --pbk-accent: var(--sd-inc-core); }
.row-playbook :deep(.pbk-row) { background: transparent; border: 0; border-bottom: 1px dotted var(--df-rule);
  border-radius: 0; padding: 8px 0; font-family: var(--df-serif); }
.row-playbook :deep(.pr-body b) { font-family: var(--df-serif); font-size: 13.5px; font-weight: 400;
  color: var(--df-ink-2); }
.row-playbook :deep(.pbk-row.done .pr-body b) { color: var(--df-ink); }
.row-playbook :deep(.pr-state) { border-radius: 2px; background: transparent;
  border: 1.5px solid var(--df-rule-strong); color: var(--sd-inc-live); }
.row-playbook :deep(.pbk-add input), .row-playbook :deep(.pr-note input) {
  background: var(--df-paper-hi); border-radius: 2px; border-color: var(--df-rule-strong); }
.row-playbook :deep(.pbk-btn) { border-radius: 2px; }
.row-playbook :deep(.pbk-btn.ghost) { background: transparent; border-color: var(--df-rule-strong); }

/* empty sheet */
.reg-empty { padding: 34px 0 30px; text-align: center; border-bottom: 1px solid var(--df-rule); }
.re-head { margin: 0; font-family: var(--sd-mono); font-size: 11px; font-weight: 700;
  letter-spacing: 0.22em; color: var(--df-ink); }
.re-sub { margin: 8px 0 0; font-family: var(--df-serif); font-style: italic; font-size: 13.5px;
  color: var(--df-ink-3); }
.re-clear { margin-top: 14px; font-family: var(--sd-mono); font-size: 9.5px; font-weight: 600;
  letter-spacing: 0.14em; padding: 8px 14px; border: 1px solid var(--sd-inc-brd); border-radius: 2px;
  color: var(--sd-inc-core); transition: background 0.2s; }
.re-clear:hover { background: var(--df-goldwash); }

/* responsive — collapse like the artifact */
@media (max-width: 1380px) {
  .reg-head { display: none; }
  .row { grid-template-columns: 34px 96px 58px minmax(0, 1fr) 160px; grid-auto-rows: auto; }
  .row .cell-clock { grid-column: 2 / span 2; }
  .row .pb { grid-column: 4; }
}

/* ═════ LIGHT THEME OVERRIDES ═════ */
[data-theme="light"] .sev-badge.s1 { color: #fff8ec; }
[data-theme="light"] .tray-inner :deep(.ivr-btn.live) { color: #fff8ec; }
[data-theme="light"] .tray-inner :deep(.ivr-btn.live:hover) { color: #fff8ec; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .rowwrap { animation: none; }
  html:not([data-cinematic="on"]) .rowwrap.shim::after,
  html:not([data-cinematic="on"]) .rowwrap.row-flash,
  html:not([data-cinematic="on"]) .who .wr.red,
  html:not([data-cinematic="on"]) .cell-clock .over,
  html:not([data-cinematic="on"]) .tray-inner :deep(.ivr-btn.live) { animation: none !important; }
  html:not([data-cinematic="on"]) .row .mk .xmark { animation: none; stroke-dashoffset: 0; }
  html:not([data-cinematic="on"]) .tray { transition: none; }
}
</style>
