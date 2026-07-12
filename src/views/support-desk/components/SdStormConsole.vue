<template>
  <Presence>
    <Motion v-if="ticket" as="section" class="sbc" :initial="{ opacity: 0, y: 12 }"
      :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: 12 }"
      :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
      <!-- isoline sweep across the top of the desk -->
      <div class="sbc-sweep" aria-hidden="true" />

      <div class="sbc-grid">
        <!-- ── left: time panel ── -->
        <div class="sbc-time">
          <p class="sbc-eyebrow sd-mono"><CloudLightning :size="11" /> ON THE DESK</p>
          <p class="sbc-clock sd-mono">{{ stopwatch }}</p>
          <p class="sbc-clock-sub sd-mono">TIME ON TICKET</p>
          <svg class="sbc-baro" viewBox="0 0 160 34" preserveAspectRatio="none" aria-hidden="true">
            <polyline :points="baroPoints" />
          </svg>
          <div class="sbc-stint sd-mono">
            <span>Today: <b>{{ stint.served }}</b> served</span>
            <span><b>{{ stint.resolved }}</b> resolved</span>
            <span><b>{{ stint.skips }}</b> skips</span>
            <span><b>{{ loggedLabel }}</b> logged</span>
          </div>
        </div>

        <!-- ── right: the current system ── -->
        <div class="sbc-case">
          <header class="sbc-head">
            <p class="sbc-eyebrow sd-mono">NOW SERVING · {{ remaining }} IN QUEUE</p>
            <div class="sbc-idrow">
              <button class="sbc-num sd-mono" title="Open the console" @click="$emit('open')">{{ ticket.ticket_number }}</button>
              <SdPill kind="priority" :value="ticket.priority" />
              <SdPill kind="status" :value="ticket.status" />
              <span v-if="lane" class="sbc-lane sd-mono"><MapPin :size="10" /> {{ lane }}</span>
              <span class="sbc-sla sd-mono" :class="slaTone">{{ slaDelta }}</span>
            </div>
            <button class="sbc-subj" :title="ticket.subject" @click="$emit('open')">{{ ticket.subject }}</button>
          </header>

          <div class="sbc-mid">
            <!-- impact × urgency matrix readout -->
            <div class="sbc-matrix" :title="`Impact ${ticket.impact || '—'} × Urgency ${ticket.urgency || '—'}`">
              <p class="sbc-mx-t sd-mono">IMPACT × URGENCY</p>
              <div class="sbc-mx-grid" aria-hidden="true">
                <i v-for="c in 9" :key="c" :class="{ lit: c === matrixCell }" />
              </div>
              <p class="sbc-mx-v sd-mono">{{ matrixLabel }}</p>
            </div>

            <!-- lane setup sheet -->
            <div class="sbc-skills">
              <p class="sbc-mx-t sd-mono">LANE SKILLS</p>
              <div class="sbc-skill-row">
                <span v-for="s in skills" :key="s.id" class="sbc-skill sd-mono" :class="{ ok: s.mine }">
                  <Check v-if="s.mine" :size="10" /><X v-else :size="10" /> {{ s.name }}
                </span>
                <span v-if="!skills.length" class="sbc-skill none sd-mono">No skill gate on this lane</span>
              </div>
              <!-- quick actions -->
              <div class="sbc-quick">
                <Motion as="button" class="sbc-q" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.96 }"
                  title="Log time on this ticket" @click="$emit('worklog')">
                  <Timer :size="12" /> Log time <kbd>L</kbd>
                </Motion>
                <Motion as="button" class="sbc-q" :class="{ on: watching }" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.96 }"
                  :title="watching ? 'Stop following this ticket' : 'Follow — get pinged on status moves'" @click="$emit('watch')">
                  <Eye :size="12" /> {{ watching ? 'Watching' : 'Watch' }} <kbd>W</kbd>
                </Motion>
                <Motion as="button" class="sbc-q" :class="{ on: swarmActive }" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.96 }"
                  :title="swarmActive ? (swarmJoined ? 'You are in this swarm' : 'Join the swarm') : 'Call a swarm — pull colleagues onto this ticket'"
                  @click="$emit('swarm')">
                  <Users :size="12" /> {{ swarmActive ? (swarmJoined ? 'Swarming' : 'Join swarm') : 'Swarm' }} <kbd>G</kbd>
                </Motion>
                <Motion as="button" class="sbc-q" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.96 }"
                  title="Reply to the requester" @click="$emit('crew', 'reply')">
                  <Reply :size="12" /> Reply
                </Motion>
                <Motion as="button" class="sbc-q" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.96 }"
                  title="Ask the requester for info — stops the SLA clock" @click="$emit('crew', 'pending')">
                  <MessageCircleQuestion :size="12" /> Request info
                </Motion>
                <Motion v-if="needsAck" as="button" class="sbc-q ack" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.96 }"
                  title="Acknowledge the escalation — stops the ACK clock" @click="$emit('ack')">
                  <BellRing :size="12" /> Acknowledge
                </Motion>
              </div>
            </div>
          </div>

          <!-- verbs -->
          <div class="sbc-verbs">
            <Motion as="button" class="sbc-v go" :while-hover="{ y: -2, scale: 1.01 }" :while-tap="{ scale: 0.97 }"
              @click="$emit('resolve')"><CheckCheck :size="15" /> Resolve &amp; next <kbd>R</kbd></Motion>
            <Motion as="button" class="sbc-v" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }"
              @click="$emit('skip')"><SkipForward :size="15" /> Skip — reason <kbd>S</kbd></Motion>
            <Motion as="button" class="sbc-v up" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }"
              title="Hand off to engineering with a diagnosis dossier" @click="$emit('escalate')">
              <ArrowUpRight :size="15" /> Escalate L3 <kbd>E</kbd></Motion>
            <Motion as="button" class="sbc-v down" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }"
              title="Send back to frontline with a reason" @click="$emit('sendback')">
              <ArrowDownLeft :size="15" /> Send back L1</Motion>
            <span class="sbc-minis">
              <button class="sbc-mini" title="Serve the next ticket without closing this one" @click="$emit('next')"><FastForward :size="13" /></button>
              <button class="sbc-mini" title="Stop the watch" @click="$emit('stop')"><Square :size="13" /></button>
            </span>
          </div>
        </div>
      </div>
    </Motion>
  </Presence>
</template>

<script setup>
/* SdStormConsole — the forecaster's desk: the served ticket under the glass, with the
   L2 workbench verbs (worklog / watch / swarm / ACK) beside the classic serve verbs. */
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  CloudLightning, MapPin, Check, X, Timer, Eye, Users, Reply, MessageCircleQuestion,
  CheckCheck, SkipForward, ArrowUpRight, ArrowDownLeft, FastForward, Square, BellRing,
} from 'lucide-vue-next'
import SdPill from './SdPill.vue'
import { priorityFromMatrix } from '@/composables/useSupportDesk'

const props = defineProps({
  ticket: { type: Object, default: null },
  remaining: { type: Number, default: 0 },
  serving: { type: Boolean, default: false },
  now: { type: Number, default: () => Date.now() },
  stint: { type: Object, default: () => ({ served: 0, resolved: 0, skips: 0 }) },
  skills: { type: Array, default: () => [] },
  lane: { type: String, default: '' },
  watching: { type: Boolean, default: false },
  swarmActive: { type: Boolean, default: false },
  swarmJoined: { type: Boolean, default: false },
  loggedMinutes: { type: Number, default: 0 },
  reduced: { type: Boolean, default: false },
})
defineEmits(['open', 'skip', 'escalate', 'sendback', 'next', 'stop', 'resolve', 'crew',
  'worklog', 'watch', 'swarm', 'ack'])

/* ── stopwatch (hundredths) + barograph trace built from elapsed seconds ── */
const elapsed = ref(0)
let raf = 0
let startAt = 0
const runWatch = () => {
  elapsed.value = performance.now() - startAt
  if (!props.reduced) raf = requestAnimationFrame(runWatch)
}
watch(() => props.ticket?.id, (id) => {
  cancelAnimationFrame(raf)
  if (id) { startAt = performance.now(); elapsed.value = 0; runWatch() }
}, { immediate: true })
onBeforeUnmount(() => cancelAnimationFrame(raf))
const stopwatch = computed(() => {
  const ms = elapsed.value
  const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000), hh = Math.floor((ms % 1000) / 10)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(hh).padStart(2, '0')}`
})
/* the little barograph: a deterministic pen line that lengthens with time on ticket */
const baroPoints = computed(() => {
  const n = 40
  const secs = elapsed.value / 1000
  const pts = []
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * 160
    const y = 20 + 7 * Math.sin(i * 0.55 + secs * 0.35) * Math.sin(i * 0.13)
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return pts.join(' ')
})

const loggedLabel = computed(() => {
  const m = props.loggedMinutes || 0
  const h = Math.floor(m / 60)
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`
})

/* ── SLA delta ── */
const slaDelta = computed(() => {
  const due = props.ticket?.resolution_due_at
  if (!due) return 'NO SLA'
  const ms = new Date(due).getTime() - props.now
  const neg = ms < 0
  const a = Math.abs(ms)
  const h = Math.floor(a / 3600000), m = Math.floor((a % 3600000) / 60000)
  return `${neg ? '−' : '+'}${h > 0 ? `${h}h ` : ''}${m}m ${neg ? 'OVER' : 'LEFT'}`
})
const slaTone = computed(() => {
  const due = props.ticket?.resolution_due_at
  if (!due) return 'dim'
  const ms = new Date(due).getTime() - props.now
  return ms < 0 ? 'bad' : ms < 4 * 3600000 ? 'warn' : 'ok'
})

/* ── impact × urgency matrix (rows = urgency high→low, cols = impact high→low) ── */
const RANK = { high: 0, medium: 1, low: 2 }
const matrixCell = computed(() => {
  const i = RANK[props.ticket?.impact], u = RANK[props.ticket?.urgency]
  if (i === undefined || u === undefined) return 0
  return u * 3 + i + 1
})
const matrixLabel = computed(() => {
  const p = priorityFromMatrix(props.ticket?.impact, props.ticket?.urgency)
  return p ? `→ ${p.toUpperCase()}` : 'NOT SET'
})

/* escalated + nobody acknowledged → surface the ACK verb */
const needsAck = computed(() =>
  !!props.ticket?.is_escalated && !props.ticket?.escalation_acknowledged_at)
</script>

<style scoped>
.sbc { position: relative; overflow: hidden; border-radius: 18px; border: 1px solid var(--sd-l2-brd);
  background: linear-gradient(150deg, color-mix(in srgb, var(--sd-l2-core) 7%, var(--sd-surface)), var(--sd-surface));
  color: var(--sd-text); }
.sbc-sweep { position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: repeating-linear-gradient(90deg, var(--sd-l2-core) 0 18px, transparent 18px 30px);
  animation: sbc-run 8s linear infinite; opacity: 0.7; }
@keyframes sbc-run { to { background-position: 240px 0; } }

.sbc-grid { display: grid; grid-template-columns: 250px 1fr; }
@media (max-width: 900px) { .sbc-grid { grid-template-columns: 1fr; } }

.sbc-eyebrow { display: inline-flex; align-items: center; gap: 6px; margin: 0 0 6px; font-size: 8.5px;
  font-weight: 800; letter-spacing: 0.2em; color: var(--sd-l2-core); }

.sbc-time { display: flex; flex-direction: column; gap: 4px; padding: 18px 20px;
  border-right: 1px solid var(--sd-border);
  background: color-mix(in srgb, var(--sd-l2-core) 8%, transparent); }
@media (max-width: 900px) { .sbc-time { border-right: none; border-bottom: 1px solid var(--sd-border); } }
.sbc-clock { margin: 2px 0 0; font-size: 38px; font-weight: 800; line-height: 1;
  font-variant-numeric: tabular-nums; color: var(--sd-text); }
.sbc-clock-sub { margin: 0 0 6px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.22em; color: var(--sd-text-dim); }
.sbc-baro { width: 100%; height: 34px; }
.sbc-baro polyline { fill: none; stroke: var(--sd-l2-core); stroke-width: 1.4; opacity: 0.75; }
.sbc-stint { display: flex; flex-wrap: wrap; gap: 5px 12px; margin-top: 8px; font-size: 9.5px;
  letter-spacing: 0.08em; color: var(--sd-text-dim); }
.sbc-stint b { color: var(--sd-text); }

.sbc-case { display: flex; flex-direction: column; gap: 12px; padding: 18px 20px; min-width: 0; }
.sbc-head { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.sbc-idrow { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.sbc-num { padding: 0; border: none; background: none; cursor: pointer; font-family: inherit;
  font-size: 20px; font-weight: 800; letter-spacing: 0.04em; color: var(--sd-l2-core); }
.sbc-lane { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 999px;
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; color: var(--sd-text-secondary);
  border: 1px solid var(--sd-border-strong); }
.sbc-sla { margin-left: auto; font-size: 12px; font-weight: 800; letter-spacing: 0.06em;
  font-variant-numeric: tabular-nums; }
.sbc-sla.ok { color: var(--sd-l2-go); } .sbc-sla.warn { color: var(--sd-l2-warn); }
.sbc-sla.bad { color: var(--sd-l2-halt); } .sbc-sla.dim { color: var(--sd-text-dim); }
.sbc-subj { padding: 0; border: none; background: none; cursor: pointer; text-align: left; font-family: inherit;
  font-size: 15px; font-weight: 700; color: var(--sd-text); line-height: 1.3;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.sbc-subj:hover { color: var(--sd-l2-hi); }

.sbc-mid { display: grid; grid-template-columns: auto 1fr; gap: 16px; align-items: start; }
@media (max-width: 720px) { .sbc-mid { grid-template-columns: 1fr; } }
.sbc-mx-t { margin: 0 0 6px; font-size: 8px; font-weight: 800; letter-spacing: 0.2em; color: var(--sd-text-dim); }
.sbc-matrix { padding: 10px 12px; border-radius: 12px; border: 1px solid var(--sd-border); }
.sbc-mx-grid { display: grid; grid-template-columns: repeat(3, 14px); gap: 3px; }
.sbc-mx-grid i { width: 14px; height: 14px; border-radius: 3px;
  background: color-mix(in srgb, var(--sd-text) 10%, transparent); }
.sbc-mx-grid i.lit { background: var(--sd-l2-core); box-shadow: 0 0 8px color-mix(in srgb, var(--sd-l2-core) 60%, transparent); }
.sbc-mx-v { margin: 6px 0 0; font-size: 9.5px; font-weight: 800; letter-spacing: 0.1em; color: var(--sd-l2-core); }

.sbc-skills { min-width: 0; }
.sbc-skill-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.sbc-skill { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 999px;
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em;
  border: 1px solid var(--sd-border-strong); color: var(--sd-text-dim); }
.sbc-skill.ok { color: var(--sd-l2-go); border-color: color-mix(in srgb, var(--sd-l2-go) 40%, transparent); }
.sbc-skill.none { border-style: dashed; }
.sbc-quick { display: flex; flex-wrap: wrap; gap: 7px; }
.sbc-q { display: inline-flex; align-items: center; gap: 6px; padding: 7px 11px; border-radius: 10px;
  font-family: inherit; font-size: 11px; font-weight: 700; cursor: pointer;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text-secondary); }
.sbc-q:hover { border-color: var(--sd-l2-core); color: var(--sd-text); }
.sbc-q.on { border-color: var(--sd-l2-core); color: var(--sd-l2-core);
  background: color-mix(in srgb, var(--sd-l2-core) 10%, transparent); }
.sbc-q.ack { color: var(--sd-l2-warn); border-color: color-mix(in srgb, var(--sd-l2-warn) 45%, transparent); }
.sbc-q kbd { padding: 0 4px; border-radius: 3px; font-size: 8.5px; font-weight: 800;
  border: 1px solid currentColor; opacity: 0.6; }

.sbc-verbs { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; padding-top: 4px; }
.sbc-v { display: inline-flex; align-items: center; gap: 8px; padding: 11px 16px; border-radius: 12px;
  font-family: inherit; font-size: 12.5px; font-weight: 800; cursor: pointer;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); }
.sbc-v.go { border-color: transparent; background: var(--sd-l2-grad); color: #26120a; box-shadow: var(--sd-l2-glow); }
.sbc-v.up { color: var(--sd-l2-core); border-color: color-mix(in srgb, var(--sd-l2-core) 45%, transparent); }
.sbc-v.down { color: var(--sd-text-secondary); }
.sbc-v kbd { padding: 1px 5px; border-radius: 4px; font-size: 9px; font-weight: 800;
  border: 1px solid currentColor; opacity: 0.6; }
.sbc-minis { display: inline-flex; gap: 6px; margin-left: auto; }
.sbc-mini { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; cursor: pointer;
  border: 1px solid var(--sd-border); background: var(--sd-surface); color: var(--sd-text-secondary); }
.sbc-mini:hover { border-color: var(--sd-l2-core); color: var(--sd-text); }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .sbc-sweep { animation: none; }
}
</style>
