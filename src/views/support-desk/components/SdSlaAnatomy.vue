<template>
  <div class="ana" :class="{ compact }">
    <!-- header strip -->
    <div v-if="!compact" class="ana-head">
      <span class="ana-no sd-mono">{{ ticket.ticket_number }}</span>
      <span class="ana-subj">{{ ticket.subject }}</span>
      <span class="ana-owner sd-mono">{{ ticket.assigned_agent_name || 'Unassigned' }}</span>
      <span v-if="overage > 0" class="ana-owe sd-mono" :class="{ frozen: frozen && !repaired }">+{{ fmtMin(overage) }} over target</span>
      <span v-else class="ana-owe ok sd-mono">on target</span>
    </div>

    <!-- the timeline -->
    <div class="ana-rail" role="img" :aria-label="`SLA anatomy for ${ticket.ticket_number}`">
      <!-- zones -->
      <span class="ana-zone target" :style="{ left: '0%', width: pct(resoDue) + '%' }" />
      <span v-if="overage > 0" class="ana-zone breach" :style="{ left: pct(resoDue) + '%', width: Math.max(0, pct(endAt) - pct(resoDue)) + '%' }" />
      <!-- response marker -->
      <span v-if="respDue" class="ana-mark resp" :class="respState" :style="{ left: pct(respDue) + '%' }">
        <i class="ana-pin" /><b class="ana-lb top sd-mono">RESP {{ respState === 'met' ? '✓' : respState === 'missed' ? '✗' : '' }}</b>
      </span>
      <!-- created -->
      <span class="ana-mark created" :style="{ left: '0%' }"><i class="ana-pin" /><b class="ana-lb sd-mono">OPENED {{ ago(createdAt) }}</b></span>
      <!-- resolution target (the breach line) -->
      <span v-if="resoDue" class="ana-mark due" :style="{ left: pct(resoDue) + '%' }">
        <i class="ana-flag" /><b class="ana-lb sd-mono">TARGET</b>
      </span>
      <!-- end: now / repaired / frozen -->
      <span class="ana-mark end" :class="endKind" :style="{ left: pct(endAt) + '%' }">
        <i class="ana-pin" :class="{ pulse: endKind === 'now' }" />
        <b class="ana-lb top sd-mono">{{ endKind === 'repaired' ? 'REPAIRED' : endKind === 'frozen' ? '❄ FROZEN' : 'NOW' }}</b>
      </span>
    </div>

    <!-- meta chips -->
    <div class="ana-meta">
      <span class="ana-chip" :class="respState">
        <MessageSquare :size="11" />
        {{ respDue ? (respState === 'met' ? `Response met ${respDelta}` : respState === 'missed' ? `Response ${respDelta} late` : 'Response pending') : 'No response target' }}
      </span>
      <span class="ana-chip" :class="overage > 0 ? 'missed' : 'ok'">
        <Timer :size="11" />
        {{ resoDue ? (repaired ? (overage > 0 ? `Repaired ${fmtMin(overage)} late` : 'Repaired in target') : overage > 0 ? `Resolution +${fmtMin(overage)} over` : `Due in ${fmtMin(remain)}`) : 'No resolution target' }}
      </span>
      <span v-if="bankedMin" class="ana-chip banked"><PauseCircle :size="11" /> {{ fmtMin(bankedMin) }} paused (banked)</span>
      <span v-if="frozen && !repaired" class="ana-chip banked"><Snowflake :size="11" /> Clock frozen — debt not accruing</span>
    </div>
  </div>
</template>

<script setup>
/* SdSlaAnatomy — the per-ticket SLA autopsy timeline (Breached desk / "Time-Debt Meter").
   One glance = the whole story: opened → response target (met/missed) → resolution target
   (the breach line) → crimson overage zone → NOW / REPAIRED / FROZEN. Pause-aware: while
   the clock is stopped the end pin freezes at sla_paused_since and the banked chip shows
   the total stop-the-clock time. Used in the Anatomy view, the RCA console and guided. */
import { computed } from 'vue'
import { MessageSquare, Timer, PauseCircle, Snowflake } from 'lucide-vue-next'

const props = defineProps({
  ticket: { type: Object, required: true },
  now: { type: Number, default: () => Date.now() },
  compact: { type: Boolean, default: false },
})

const ep = (v) => (v ? new Date(v).getTime() : 0)
const createdAt = computed(() => ep(props.ticket.created_at))
const respDue = computed(() => ep(props.ticket.response_due_at))
const respAt = computed(() => ep(props.ticket.first_responded_at))
const resoDue = computed(() => ep(props.ticket.resolution_due_at))
const repaired = computed(() => !!props.ticket.resolved_at)
const frozen = computed(() => !!props.ticket.sla_paused_since)
const endAt = computed(() => ep(props.ticket.resolved_at) || ep(props.ticket.sla_paused_since) || props.now)
const endKind = computed(() => repaired.value ? 'repaired' : frozen.value ? 'frozen' : 'now')

/* span with 5% breathing room on both sides */
const span = computed(() => {
  const hi = Math.max(endAt.value, resoDue.value || 0, respDue.value || 0)
  return Math.max(60000, hi - createdAt.value) * 1.05
})
const pct = (t) => {
  if (!t) return 0
  return Math.min(97.5, Math.max(0, ((t - createdAt.value) / span.value) * 100 + 1))
}

const respState = computed(() => {
  if (!respDue.value) return 'none'
  if (respAt.value) return respAt.value <= respDue.value ? 'met' : 'missed'
  return endAt.value > respDue.value ? 'missed' : 'pending'
})
const respDelta = computed(() => {
  if (!respDue.value) return ''
  const at = respAt.value || endAt.value
  return fmtMin(Math.abs(Math.floor((at - respDue.value) / 60000)))
})
const overage = computed(() => (resoDue.value ? Math.max(0, Math.floor((endAt.value - resoDue.value) / 60000)) : 0))
const remain = computed(() => (resoDue.value ? Math.max(0, Math.floor((resoDue.value - endAt.value) / 60000)) : 0))
const bankedMin = computed(() => Math.floor((props.ticket.sla_paused_ms || 0) / 60000))

const fmtMin = (m) => {
  if (m == null) return '—'
  if (m < 60) return `${Math.round(m)}m`
  if (m < 1440) return `${Math.floor(m / 60)}h ${String(Math.round(m % 60)).padStart(2, '0')}m`
  return `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h`
}
const ago = (t) => {
  if (!t) return ''
  const m = Math.floor((props.now - t) / 60000)
  return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`
}
</script>

<style scoped>
.ana { display: flex; flex-direction: column; gap: 26px; padding: 14px 16px 12px; border: 1px solid var(--sd-border);
  border-radius: 14px; background: var(--sd-surface); }
.ana.compact { padding: 10px 12px 8px; gap: 22px; border: none; background: transparent; }

.ana-head { display: flex; align-items: center; gap: 10px; min-width: 0; }
.ana-no { font-size: 11px; font-weight: 800; color: var(--sd-brc-core); flex-shrink: 0; }
.ana-subj { font-size: 13px; font-weight: 650; color: var(--sd-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ana-owner { margin-left: auto; font-size: 10.5px; font-weight: 700; color: var(--sd-text-muted); flex-shrink: 0; }
.ana-owe { font-size: 11px; font-weight: 800; color: var(--sd-brc-core); flex-shrink: 0; font-variant-numeric: tabular-nums; }
.ana-owe.ok { color: var(--sd-brc-repair); }
.ana-owe.frozen { color: var(--sd-brc-brass); }

/* ── the rail ── */
.ana-rail { position: relative; height: 10px; border-radius: 99px; background: var(--sd-surface-glass);
  border: 1px solid var(--sd-border); margin: 4px 6px; }
.ana-zone { position: absolute; top: 0; bottom: 0; border-radius: 99px; transform-origin: left;
  animation: ana-grow 0.9s var(--sd-spring) backwards; }
.ana-zone.target { background: linear-gradient(90deg, color-mix(in srgb, var(--sd-text-dim) 26%, transparent), color-mix(in srgb, var(--sd-brc-risk) 34%, transparent)); }
.ana-zone.breach { border-radius: 0 99px 99px 0;
  background: repeating-linear-gradient(-55deg, var(--sd-brc-core) 0 6px, color-mix(in srgb, var(--sd-brc-core) 55%, transparent) 6px 12px);
  background-size: 200% 100%; animation: ana-grow 0.9s var(--sd-spring) 0.25s backwards, ana-flow 2.6s linear infinite; }
@keyframes ana-grow { from { transform: scaleX(0); } }
@keyframes ana-flow { to { background-position: -34px 0; } }

.ana-mark { position: absolute; top: 50%; width: 0; }
.ana-pin { position: absolute; left: -4px; top: -4px; width: 8px; height: 8px; border-radius: 50%;
  background: var(--sd-text-muted); border: 1.5px solid var(--sd-surface); }
.ana-mark.created .ana-pin { background: var(--sd-text-dim); }
.ana-mark.resp .ana-pin { top: -12px; height: 16px; border-radius: 3px; width: 3px; left: -1.5px; border: none; background: var(--sd-text-dim); }
.ana-mark.resp.met .ana-pin { background: var(--sd-brc-repair); }
.ana-mark.resp.missed .ana-pin { background: var(--sd-brc-core); }
.ana-flag { position: absolute; left: -1px; top: -13px; width: 2px; height: 18px; background: var(--sd-brc-core);
  box-shadow: 0 0 8px color-mix(in srgb, var(--sd-brc-core) 60%, transparent); }
.ana-flag::after { content: ""; position: absolute; left: 2px; top: 0; border-style: solid; border-width: 4px 0 4px 7px;
  border-color: transparent transparent transparent var(--sd-brc-core); }
.ana-mark.end .ana-pin { background: var(--sd-brc-core); }
.ana-mark.end.repaired .ana-pin { background: var(--sd-brc-repair); }
.ana-mark.end.frozen .ana-pin { background: var(--sd-brc-brass); }
.ana-pin.pulse { animation: ana-pulse 1.5s ease-out infinite; }
@keyframes ana-pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-brc-core) 55%, transparent); } 100% { box-shadow: 0 0 0 9px transparent; } }

.ana-lb { position: absolute; top: 10px; left: 0; transform: translateX(-50%); font-size: 8.5px; font-weight: 800;
  letter-spacing: 0.1em; color: var(--sd-text-dim); white-space: nowrap; }
.ana-lb.top { top: auto; bottom: 12px; }
.ana-mark.due .ana-lb { color: var(--sd-brc-core); }
.ana-mark.end.repaired .ana-lb { color: var(--sd-brc-repair); }
.ana-mark.end.frozen .ana-lb { color: var(--sd-brc-brass); }
.ana-mark.end.now .ana-lb { color: var(--sd-brc-hi); }
.ana-mark.resp.met .ana-lb { color: var(--sd-brc-repair); }
.ana-mark.resp.missed .ana-lb { color: var(--sd-brc-core); }

/* ── meta chips ── */
.ana-meta { display: flex; flex-wrap: wrap; gap: 7px; }
.ana-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px;
  font-size: 10.5px; font-weight: 700; border: 1px solid var(--sd-border-strong); color: var(--sd-text-secondary); }
.ana-chip.met, .ana-chip.ok { color: var(--sd-brc-repair); border-color: color-mix(in srgb, var(--sd-brc-repair) 40%, transparent); background: var(--sd-brc-repair-soft); }
.ana-chip.missed { color: var(--sd-brc-core); border-color: color-mix(in srgb, var(--sd-brc-core) 40%, transparent); background: var(--sd-brc-soft); }
.ana-chip.banked { color: var(--sd-brc-brass); border-color: color-mix(in srgb, var(--sd-brc-brass) 45%, transparent); background: var(--sd-brc-brass-soft); }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .ana-zone, html:not([data-cinematic="on"]) .ana-zone.breach,
  html:not([data-cinematic="on"]) .ana-pin.pulse { animation: none; }
}
</style>
