<template>
  <div class="rlp sd-card">
    <div class="rlp-scale sd-mono" aria-hidden="true">
      <span class="sc prev">FAILED FIX</span>
      <span class="sc kick">KICK-BACK</span>
      <span class="sc now">THIS CYCLE · NOW</span>
    </div>
    <div class="rlp-rows">
      <Motion v-for="(t, i) in tickets" :key="t.id" as="button" class="rlp-row"
        :initial="{ opacity: 0, x: -14 }" :animate="{ opacity: 1, x: 0 }"
        :transition="{ duration: 0.4, delay: Math.min(i * 0.04, 0.5), ease: [0.16, 1, 0.3, 1] }"
        :title="t.subject" @click="$emit('open', t.id)">
        <span class="r-id">
          <span class="r-no sd-mono">{{ t.ticket_number }}</span>
          <span class="r-subj">{{ t.subject }}</span>
          <span class="r-cycles sd-mono">×{{ t.reopened_count }}</span>
        </span>

        <!-- the cycle strip: prev fix ──▶ reopened pin ──▶ now -->
        <span class="r-strip">
          <span class="st prev" :title="t.prev_resolution_summary || 'No summary recorded on the failed fix'">
            <i class="st-dot" />
            <b class="sd-mono">{{ (t.prev_resolution_code || 'fixed').replace(/_/g, ' ').toUpperCase() }}</b>
            <em class="sd-mono">{{ rel(t.prev_resolved_at) }}</em>
          </span>
          <span class="st-link" aria-hidden="true"><i class="lk" /></span>
          <span class="st kick">
            <i class="st-dot" />
            <b class="sd-mono">{{ reopenSourceLabel(t.reopen_source).toUpperCase() }}</b>
            <em v-if="t.reopen_reason_code" class="sd-mono code">{{ reopenReasonShort(t.reopen_reason_code) }}</em>
            <em class="sd-mono">{{ latency(t) }}</em>
          </span>
          <span class="st-link" aria-hidden="true"><i class="lk" /></span>
          <span class="st now" :class="nowTone(t)">
            <i class="st-dot" />
            <b class="sd-mono">{{ nowLabel(t) }}</b>
            <em class="sd-mono">{{ dueLabel(t) }}</em>
          </span>
        </span>

        <span class="r-who sd-mono" :class="{ none: !t.assigned_agent_name }">{{ t.assigned_agent_name || 'UNOWNED' }}</span>
      </Motion>
      <div v-if="!tickets.length && !loading" class="rlp-empty sd-mono">NOTHING UNDER THIS LENS — THE BAND RUNS EMPTY</div>
    </div>
  </div>
</template>

<script setup>
/* SdReopenLoop — the Reopened desk's "Loop" view: one cycle strip per ticket reading
   left→right as the story of the bounce — the FAILED FIX (preserved prev_resolution_*),
   the KICK-BACK (who reopened it, the coded verdict, how long the fix survived), and
   THIS CYCLE (time back on the desk vs the FRESH re-resolution deadline; re-breached
   turns the station hot). The per-desk analytical view, sibling of Breached's SLA
   Anatomy and Overdue's Horizon. */
import { Motion } from 'motion-v'
import { reopenSourceLabel, reopenReasonShort } from '@/composables/useSupportDesk'

const props = defineProps({
  tickets: { type: Array, default: () => [] },   // paged rows
  now: { type: Number, default: () => Date.now() },
  loading: { type: Boolean, default: false },
  reduced: { type: Boolean, default: false },
})
defineEmits(['open'])

const ep = (v) => (v ? new Date(v).getTime() : 0)
const fmt = (m) => (m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h`)
const rel = (v) => {
  const at = ep(v)
  if (!at) return '—'
  return `${fmt(Math.max(0, Math.floor((props.now - at) / 60000)))} ago`
}
const latency = (t) => (t.reopen_latency_ms != null ? `fix held ${fmt(Math.floor(t.reopen_latency_ms / 60000))}` : '—')
const isTerminal = (t) => ['resolved', 'closed'].includes(t.status)
const reBreached = (t) => !isTerminal(t) && !!t.sla_resolution_breached
const nowTone = (t) => (isTerminal(t) ? 'done' : reBreached(t) ? 'hot' : '')
const nowLabel = (t) => {
  if (isTerminal(t)) return 'RE-RESOLVED'
  if (reBreached(t)) return 'RE-BREACHED'
  const at = ep(t.last_reopened_at)
  return at ? `${fmt(Math.max(0, Math.floor((props.now - at) / 60000)))} ON CYCLE` : 'ON CYCLE'
}
const dueLabel = (t) => {
  if (isTerminal(t)) return 'off the loop'
  const due = ep(t.resolution_due_at)
  if (!due) return 'no clock'
  const m = Math.floor((due - props.now) / 60000)
  return m >= 0 ? `due in ${fmt(m)}` : `${fmt(-m)} past due`
}
</script>

<style scoped>
.rlp { padding: 18px 18px 14px; }
.rlp-scale { position: relative; display: grid; grid-template-columns: 1fr 1fr 1fr; margin: 0 120px 8px 372px; }
.sc { font-size: 9px; font-weight: 800; letter-spacing: 0.14em; }
.sc.prev { color: var(--sd-text-dim); }
.sc.kick { color: var(--sd-rop-band); text-align: center; }
.sc.now { color: var(--sd-rop-hi); text-align: right; }

.rlp-rows { display: flex; flex-direction: column; }
.rlp-row { display: grid; grid-template-columns: 360px minmax(0, 1fr) 110px; gap: 12px; align-items: center;
  width: 100%; text-align: left; padding: 9px 6px; border: none; border-radius: 10px; cursor: pointer;
  background: transparent; font-family: inherit; color: var(--sd-text); transition: background 0.18s; }
.rlp-row + .rlp-row { border-top: 1px solid var(--sd-border); }
.rlp-row:hover { background: var(--sd-rop-soft); }

.r-id { display: flex; align-items: center; gap: 9px; min-width: 0; }
.r-no { flex-shrink: 0; font-size: 10.5px; font-weight: 800; color: var(--sd-rop-hi); }
.r-subj { font-size: 12.5px; font-weight: 650; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.r-cycles { flex-shrink: 0; padding: 1px 7px; border-radius: 999px; font-size: 10px; font-weight: 800; color: var(--sd-rop-core);
  border: 1px solid color-mix(in srgb, var(--sd-rop-core) 45%, transparent); background: var(--sd-rop-soft); }

.r-strip { display: flex; align-items: center; gap: 6px; min-width: 0; }
.st { display: inline-flex; align-items: center; gap: 6px; min-width: 0; padding: 5px 9px; border-radius: 9px;
  border: 1px solid var(--sd-border); background: var(--sd-surface-glass); }
.st b { font-size: 9px; font-weight: 800; letter-spacing: 0.08em; white-space: nowrap; }
.st em { font-style: normal; font-size: 9px; font-weight: 700; color: var(--sd-text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.st-dot { flex-shrink: 0; width: 7px; height: 7px; border-radius: 50%; }
.st.prev .st-dot { background: var(--sd-text-dim); }
.st.prev b { color: var(--sd-text-muted); text-decoration: line-through; text-decoration-color: var(--sd-rop-core); text-decoration-thickness: 1.5px; }
.st.kick { border-color: color-mix(in srgb, var(--sd-rop-band) 40%, transparent); }
.st.kick .st-dot { background: var(--sd-rop-band); box-shadow: 0 0 8px var(--sd-rop-band); }
.st.kick b { color: var(--sd-rop-band); }
.st.kick em.code { color: var(--sd-rop-hi); }
.st.now { border-color: color-mix(in srgb, var(--sd-rop-core) 42%, transparent); }
.st.now .st-dot { background: var(--sd-rop-core); animation: rlp-ping 1.8s ease-out infinite; }
.st.now b { color: var(--sd-rop-hi); }
.st.now.hot { border-color: var(--sd-danger); background: color-mix(in srgb, var(--sd-danger) 10%, transparent); }
.st.now.hot .st-dot { background: var(--sd-danger); }
.st.now.hot b { color: var(--sd-danger); }
.st.now.done { border-color: color-mix(in srgb, var(--sd-rop-offramp) 45%, transparent); }
.st.now.done .st-dot { background: var(--sd-rop-offramp); animation: none; }
.st.now.done b { color: var(--sd-rop-offramp); }

.st-link { flex: 1 0 14px; display: flex; align-items: center; min-width: 14px; }
.st-link .lk { width: 100%; height: 0; border-top: 1.5px dashed color-mix(in srgb, var(--sd-rop-core) 50%, transparent);
  animation: rlp-flow 1.1s linear infinite; }

.r-who { font-size: 10px; font-weight: 700; color: var(--sd-text-muted); text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.r-who.none { color: var(--sd-warning); }
.rlp-empty { padding: 36px 0; text-align: center; font-size: 10.5px; font-weight: 800; letter-spacing: 0.18em; color: var(--sd-text-dim); }

@keyframes rlp-ping { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-rop-core) 55%, transparent); } 100% { box-shadow: 0 0 0 8px transparent; } }
@keyframes rlp-flow { to { transform: translateX(10px); } }

@media (max-width: 1100px) {
  .rlp-scale { display: none; }
  .rlp-row { grid-template-columns: 260px minmax(0, 1fr); }
  .r-who { display: none; }
}
@media (max-width: 760px) {
  .rlp-row { grid-template-columns: minmax(0, 1fr); }
  .r-strip { flex-wrap: wrap; }
  .st-link { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .st-link .lk, html:not([data-cinematic="on"]) .st.now .st-dot { animation: none; }
}
</style>
