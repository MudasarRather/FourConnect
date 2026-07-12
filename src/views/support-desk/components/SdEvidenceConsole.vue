<template>
  <Motion v-if="ticket" as="section" class="ewc" :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
    <!-- ═══ left: time on case ═══ -->
    <div class="ewc-time">
      <span class="ewc-time-lbl sd-mono">TIME ON CASE</span>
      <b class="ewc-watch sd-mono">{{ caseClock }}</b>
      <span class="ewc-stint sd-mono">Today: {{ stint.served }} served · {{ stint.resolved }} resolved · {{ stint.skips }} skipped</span>
      <span class="ewc-remaining sd-mono">{{ remaining }} MORE IN SERVE ORDER</span>
    </div>

    <!-- ═══ middle: the case ═══ -->
    <div class="ewc-case">
      <span class="ewc-eyebrow sd-mono">NOW ON THE DESK</span>
      <div class="ewc-head">
        <button class="ewc-no sd-mono" title="Open the full case file" @click="$emit('open')">{{ ticket.ticket_number }}</button>
        <span v-if="lane" class="ewc-lane sd-mono">{{ lane }}</span>
        <SdPill kind="priority" :value="ticket.priority" />
        <span v-if="ticket.is_major_incident" class="ewc-mi sd-mono">MAJOR INCIDENT</span>
        <span class="ewc-sla sd-mono" :class="slaTone">{{ slaLive }}</span>
      </div>
      <p class="ewc-subj">{{ ticket.subject }}</p>
      <div class="ewc-meta sd-mono">
        <span><User :size="10" /> {{ ticket.contact_name || ticket.requester_name || 'Requester' }}</span>
        <span v-if="(ticket.reopened_count || 0) > 0" class="warn"><RotateCcw :size="10" /> REOPENED ×{{ ticket.reopened_count }}</span>
        <span v-if="skills.length" :class="{ warn: skills.some(s => !s.mine) }">
          <Wrench :size="10" /> {{ skills.filter(s => s.mine).length }}/{{ skills.length }} SKILLS</span>
        <span v-if="loggedMinutes"><Timer :size="10" /> {{ loggedMinutes }}M LOGGED</span>
      </div>

      <!-- ═══ the handoff dossier — what the lower tiers already know ═══ -->
      <div class="ewc-dossier" :class="{ empty: !dossier }">
        <header class="ewc-dz-head">
          <span class="sd-mono"><FileSearch :size="11" /> HANDOFF DOSSIER</span>
          <span v-if="dossierLoading" class="ewc-dz-load sd-mono">READING…</span>
          <template v-else-if="dossier && dossier.is_escalated">
            <span v-if="!dossier.acknowledged_at" class="ewc-ack-due sd-mono" :class="{ over: ackOverdue }">
              <AlarmClock :size="10" /> ACK {{ ackClock }}</span>
            <span v-else class="ewc-acked sd-mono"><Check :size="10" /> ACK’D {{ dossier.acknowledged_by_name ? '· ' + dossier.acknowledged_by_name : '' }}</span>
          </template>
        </header>
        <template v-if="dossier">
          <div class="ewc-dz-body">
            <p v-if="dossier.is_escalated" class="ewc-dz-esc">
              <b>{{ escLabel }}</b> — {{ dossier.escalation_reason || 'no reason recorded' }}
              <em v-if="dossier.escalated_by_name"> · raised by {{ dossier.escalated_by_name }}</em>
              <em v-if="dossier.auto_escalated" class="auto"> · AUTO</em>
            </p>
            <blockquote v-for="(d, i) in dossier.diagnoses" :key="i" class="ewc-memo">
              <span class="ewc-memo-h sd-mono">TECHNICAL DIAGNOSIS · {{ d.author_name || 'Agent' }}</span>
              <p>{{ d.body }}</p>
            </blockquote>
            <p v-if="!dossier.diagnoses.length && dossier.is_escalated" class="ewc-dz-none">
              No technical diagnosis on file — this case arrived without a written handoff.</p>
            <div v-if="dossier.tier_path.length" class="ewc-trail sd-mono">
              <span v-for="(m, i) in dossier.tier_path" :key="i" class="ewc-hop" :class="m.direction">
                {{ m.direction === 'descend' ? '↓' : '↑' }} L{{ m.tier }} · {{ m.queue }}
              </span>
              <span v-if="dossier.worklog_minutes" class="ewc-hop time">{{ dossier.worklog_minutes }}M WORKED BELOW</span>
            </div>
            <div class="ewc-links">
              <button v-if="dossier.problem" class="ewc-link prb" title="Jump to the problem case file" @click="$emit('problem')">
                <Fingerprint :size="11" /> {{ dossier.problem.problem_number }} · {{ dossier.problem.title }}
                <em v-if="dossier.problem.workaround_published" class="sd-mono">KNOWN ERROR</em>
              </button>
              <button v-else class="ewc-link ghost" @click="$emit('problem')">
                <Fingerprint :size="11" /> No problem on the string yet — link one <kbd>P</kbd></button>
              <button v-if="dossier.change" class="ewc-link chg" title="The permanent fix riding a change request" @click="$emit('change')">
                <GitPullRequest :size="11" /> {{ dossier.change.change_number }} · {{ changeLabel(dossier.change.status) }}</button>
            </div>
          </div>
          <Motion v-if="dossier.is_escalated && !dossier.acknowledged_at" as="button" class="ewc-ack-btn"
            :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.96 }" @click="$emit('ack')">
            <Stamp :size="14" /> Acknowledge receipt <kbd>A</kbd>
          </Motion>
        </template>
      </div>

      <!-- quick verbs -->
      <div class="ewc-quick">
        <button class="ewc-q" title="Log time against this case" @click="$emit('worklog')"><Timer :size="12" /> Log time <kbd>L</kbd></button>
        <button class="ewc-q" :class="{ on: watching }" title="Follow status moves on this case" @click="$emit('watch')">
          <Eye :size="12" /> {{ watching ? 'Watching' : 'Watch' }} <kbd>W</kbd></button>
        <button class="ewc-q" :class="{ on: swarmActive }" title="Call colleagues onto this case" @click="$emit('swarm')">
          <Users :size="12" /> {{ swarmActive ? (swarmJoined ? 'In swarm' : 'Join swarm') : 'Swarm' }} <kbd>G</kbd></button>
        <button class="ewc-q" title="Link or create the problem record" @click="$emit('problem')"><Fingerprint :size="12" /> Problem <kbd>P</kbd></button>
        <button class="ewc-q" title="Record the root cause" @click="$emit('rca')"><FileSearch :size="12" /> RCA <kbd>D</kbd></button>
        <button class="ewc-q" title="Attach the permanent fix to a change request" @click="$emit('change')"><GitPullRequest :size="12" /> Change <kbd>C</kbd></button>
        <button class="ewc-q" title="Reply to the requester in the console" @click="$emit('crew', 'reply')"><MessageSquare :size="12" /> Reply</button>
        <button class="ewc-q" title="Stop the clock — waiting on the requester" @click="$emit('crew', 'pending')"><PauseCircle :size="12" /> Await info</button>
      </div>

      <!-- big verbs -->
      <div class="ewc-verbs">
        <Motion as="button" class="ewc-v primary" :while-hover="{ y: -2, scale: 1.01 }" :while-tap="{ scale: 0.97 }"
          @click="$emit('resolve')"><CheckCheck :size="15" /> CASE CLOSED — RESOLVE &amp; NEXT <kbd>R</kbd></Motion>
        <Motion as="button" class="ewc-v" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }"
          @click="$emit('skip')"><SkipForward :size="14" /> SKIP — REASON <kbd>S</kbd></Motion>
        <Motion as="button" class="ewc-v down" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }"
          @click="$emit('sendback')"><ArrowDownLeft :size="14" /> SEND BACK L2/L1 <kbd>B</kbd></Motion>
        <span class="ewc-minis">
          <button class="ewc-mini" :disabled="serving" title="Skip ahead without acting" @click="$emit('next')"><ChevronsRight :size="13" /></button>
          <button class="ewc-mini" title="Leave the desk" @click="$emit('stop')"><X :size="13" /></button>
        </span>
      </div>
    </div>
  </Motion>
</template>

<script setup>
/* SdEvidenceConsole — the detective's desk for the served L3 case. Self-hydrates the
   HANDOFF DOSSIER (one sealed read: escalation record + esc-ACK clock + every lower-tier
   diagnosis memo + the tier path + linked problem/change) whenever the served ticket
   changes, and exposes the workbench verbs (worklog/watch/swarm from L2, plus the L3
   problem/RCA/change actions). Purely presentational otherwise — the section owns state. */
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  User, Wrench, Timer, Eye, Users, Fingerprint, FileSearch, GitPullRequest, MessageSquare,
  PauseCircle, CheckCheck, SkipForward, ArrowDownLeft, ChevronsRight, X, AlarmClock, Check,
  Stamp, RotateCcw,
} from 'lucide-vue-next'
import SdPill from './SdPill.vue'
import { getHandoffDossier, CHANGE_STATUSES } from '@/composables/useSupportDesk'

const props = defineProps({
  ticket: { type: Object, default: null },
  remaining: { type: Number, default: 0 },
  serving: { type: Boolean, default: false },
  now: { type: Number, default: Date.now() },
  stint: { type: Object, default: () => ({ served: 0, resolved: 0, skips: 0 }) },
  skills: { type: Array, default: () => [] },
  lane: { type: String, default: '' },
  watching: { type: Boolean, default: false },
  swarmActive: { type: Boolean, default: false },
  swarmJoined: { type: Boolean, default: false },
  loggedMinutes: { type: Number, default: 0 },
  dossierBump: { type: Number, default: 0 },   // section increments to force a re-read (after ack/link)
  reduced: { type: Boolean, default: false },
})
defineEmits(['open', 'skip', 'sendback', 'next', 'stop', 'resolve', 'crew', 'worklog',
  'watch', 'swarm', 'ack', 'problem', 'rca', 'change'])

/* case clock — restarts when a new case lands on the desk */
const servedAt = ref(Date.now())
const caseClock = computed(() => {
  const s = Math.max(0, Math.floor((props.now - servedAt.value) / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
})

/* live SLA delta */
const slaLive = computed(() => {
  const due = props.ticket?.resolution_due_at
  if (!due) return 'NO SLA'
  const ms = new Date(due).getTime() - props.now
  const a = Math.abs(ms)
  const h = Math.floor(a / 3600000), m = Math.floor((a % 3600000) / 60000)
  const txt = h ? `${h}H ${String(m).padStart(2, '0')}M` : `${m}M`
  return ms < 0 ? `BREACHED ${txt} AGO` : `${txt} TO BREACH`
})
const slaTone = computed(() => {
  const due = props.ticket?.resolution_due_at
  if (!due) return 'dim'
  const ms = new Date(due).getTime() - props.now
  return ms < 0 ? 'bad' : ms < 4 * 3600000 ? 'warn' : 'ok'
})

/* ── dossier ── */
const dossier = ref(null)
const dossierLoading = ref(false)
const hydrate = async () => {
  dossier.value = null
  if (!props.ticket) return
  dossierLoading.value = true
  try { dossier.value = await getHandoffDossier(props.ticket.id) }
  catch { dossier.value = null }
  finally { dossierLoading.value = false }
}
watch(() => props.ticket?.id, (id, old) => { if (String(id) !== String(old)) servedAt.value = Date.now(); hydrate() },
  { immediate: true })
watch(() => props.dossierBump, hydrate)

const ESC_LABELS = {
  complexity: 'Beyond lower-tier depth', needs_engineering: 'Needs a code / infra change',
  vendor_dependency: 'Vendor-level defect', recurring_problem: 'Recurring — needs root-cause work',
  security: 'Security implication', sla_breach: 'Auto-raised on SLA breach',
}
const escLabel = computed(() => {
  const d = dossier.value
  if (!d) return ''
  return ESC_LABELS[d.escalation_reason_code] || `Escalated to L${d.escalation_level}`
})
const ackOverdue = computed(() => {
  const d = dossier.value
  return !!(d && d.ack_due_at && new Date(d.ack_due_at).getTime() < props.now)
})
const ackClock = computed(() => {
  const d = dossier.value
  if (!d || !d.ack_due_at) return 'PENDING'
  const ms = new Date(d.ack_due_at).getTime() - props.now
  const a = Math.abs(ms)
  const m = Math.floor(a / 60000), s = Math.floor((a % 60000) / 1000)
  return `${ms < 0 ? 'OVER ' : 'DUE '}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})
const changeLabel = (v) => CHANGE_STATUSES.find(c => c.value === v)?.label?.toUpperCase() || (v || '').toUpperCase()
</script>

<style scoped>
.ewc { display: grid; grid-template-columns: 200px 1fr; border: 1px solid var(--sd-l3-brd); border-radius: 16px;
  overflow: hidden; background: var(--sd-surface); }
@media (max-width: 800px) { .ewc { grid-template-columns: 1fr; } }

.ewc-time { display: flex; flex-direction: column; gap: 8px; padding: 16px 15px;
  background: linear-gradient(165deg, var(--sd-l3-soft), transparent 70%);
  border-right: 1px dashed var(--sd-border-strong); }
.ewc-time-lbl { font-size: 8.5px; letter-spacing: 0.22em; color: var(--sd-text-dim); }
.ewc-watch { font-size: 38px; font-weight: 800; line-height: 1; color: var(--sd-l3-core); }
.ewc-stint { font-size: 9px; letter-spacing: 0.06em; color: var(--sd-text-muted); line-height: 1.6; }
.ewc-remaining { margin-top: auto; font-size: 8.5px; letter-spacing: 0.14em; color: var(--sd-text-dim); }

.ewc-case { display: flex; flex-direction: column; gap: 9px; padding: 14px 16px; min-width: 0; }
.ewc-eyebrow { font-size: 8.5px; letter-spacing: 0.24em; color: var(--sd-l3-core); font-weight: 800; }
.ewc-head { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.ewc-no { padding: 0; border: none; background: none; cursor: pointer; font-family: inherit;
  font-size: 19px; font-weight: 800; letter-spacing: 0.03em; color: var(--sd-text); }
.ewc-no:hover { color: var(--sd-l3-core); }
.ewc-lane { padding: 3px 8px; border-radius: 6px; font-size: 9px; font-weight: 700; letter-spacing: 0.1em;
  color: var(--sd-l3-core); border: 1px solid var(--sd-l3-brd); background: var(--sd-l3-soft); }
.ewc-mi { padding: 3px 8px; border-radius: 6px; font-size: 9px; font-weight: 800; letter-spacing: 0.12em;
  color: var(--sd-l3-halt); border: 1px solid color-mix(in srgb, var(--sd-l3-halt) 45%, transparent); }
.ewc-sla { margin-left: auto; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; }
.ewc-sla.bad { color: var(--sd-l3-halt); } .ewc-sla.warn { color: var(--sd-l3-warn); }
.ewc-sla.ok { color: var(--sd-l3-go); } .ewc-sla.dim { color: var(--sd-text-dim); }
.ewc-subj { margin: 0; font-size: 14px; font-weight: 600; line-height: 1.4; color: var(--sd-text); }
.ewc-meta { display: flex; gap: 12px; flex-wrap: wrap; font-size: 9px; letter-spacing: 0.08em; color: var(--sd-text-muted); }
.ewc-meta span { display: inline-flex; align-items: center; gap: 5px; }
.ewc-meta .warn { color: var(--sd-l3-warn); }

/* dossier */
.ewc-dossier { border: 1px dashed var(--sd-border-strong); border-radius: 12px; overflow: hidden;
  background: color-mix(in srgb, var(--sd-l3-core) 4%, transparent); }
.ewc-dz-head { display: flex; align-items: center; gap: 10px; padding: 9px 12px;
  border-bottom: 1px dashed var(--sd-border); }
.ewc-dz-head > span:first-child { display: inline-flex; align-items: center; gap: 6px; font-size: 9px;
  font-weight: 800; letter-spacing: 0.2em; color: var(--sd-l3-core); }
.ewc-dz-load { font-size: 8.5px; letter-spacing: 0.16em; color: var(--sd-text-dim); animation: ewc-blink 1.2s infinite; }
@keyframes ewc-blink { 50% { opacity: 0.35; } }
.ewc-ack-due { margin-left: auto; display: inline-flex; align-items: center; gap: 5px; font-size: 9.5px;
  font-weight: 800; letter-spacing: 0.08em; color: var(--sd-l3-warn); }
.ewc-ack-due.over { color: var(--sd-l3-halt); animation: ewc-blink 1s infinite; }
.ewc-acked { margin-left: auto; display: inline-flex; align-items: center; gap: 5px; font-size: 9px;
  letter-spacing: 0.08em; color: var(--sd-l3-go); }
.ewc-dz-body { display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; }
.ewc-dz-esc { margin: 0; font-size: 11.5px; line-height: 1.5; color: var(--sd-text-secondary); }
.ewc-dz-esc b { color: var(--sd-text); }
.ewc-dz-esc em { font-style: normal; color: var(--sd-text-dim); }
.ewc-dz-esc .auto { color: var(--sd-l3-warn); font-weight: 700; }
.ewc-memo { margin: 0; padding: 8px 11px; border-left: 3px solid var(--sd-l3-core); border-radius: 0 9px 9px 0;
  background: color-mix(in srgb, var(--sd-l3-core) 7%, transparent); }
.ewc-memo-h { display: block; margin-bottom: 3px; font-size: 8px; font-weight: 800; letter-spacing: 0.16em;
  color: var(--sd-l3-core); }
.ewc-memo p { margin: 0; font-size: 12px; line-height: 1.55; color: var(--sd-text-secondary); white-space: pre-line; }
.ewc-dz-none { margin: 0; font-size: 11px; color: var(--sd-text-dim); font-style: italic; }
.ewc-trail { display: flex; gap: 6px; flex-wrap: wrap; }
.ewc-hop { padding: 3px 8px; border-radius: 6px; font-size: 8.5px; font-weight: 700; letter-spacing: 0.08em;
  color: var(--sd-text-muted); border: 1px solid var(--sd-border); }
.ewc-hop.escalate { color: var(--sd-l3-warn); border-color: color-mix(in srgb, var(--sd-l3-warn) 40%, transparent); }
.ewc-hop.descend { color: var(--sd-text-dim); }
.ewc-hop.time { color: var(--sd-l3-core); border-style: dashed; }
.ewc-links { display: flex; gap: 7px; flex-wrap: wrap; }
.ewc-link { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 9px;
  font-family: inherit; font-size: 10.5px; font-weight: 700; cursor: pointer; max-width: 100%;
  border: 1px solid var(--sd-l3-brd); background: var(--sd-l3-soft); color: var(--sd-text-secondary); }
.ewc-link em { font-style: normal; font-size: 7.5px; letter-spacing: 0.14em; color: var(--sd-l3-halt);
  border: 1px solid color-mix(in srgb, var(--sd-l3-halt) 45%, transparent); border-radius: 4px; padding: 1px 4px; }
.ewc-link.ghost { border-style: dashed; background: transparent; color: var(--sd-text-dim); }
.ewc-link kbd { font-size: 8px; border: 1px solid currentColor; border-radius: 3px; padding: 0 4px; opacity: 0.7; }
.ewc-link:hover { border-color: var(--sd-l3-core); color: var(--sd-text); }
.ewc-ack-btn { display: inline-flex; align-items: center; gap: 8px; margin: 0 12px 11px; padding: 9px 14px;
  align-self: flex-start; border-radius: 11px; border: none; cursor: pointer; font-family: inherit;
  font-size: 12px; font-weight: 800; letter-spacing: 0.04em; color: #221604; background: var(--sd-l3-grad);
  box-shadow: var(--sd-l3-glow); }
.ewc-ack-btn kbd { font-size: 8.5px; border: 1px solid rgba(34, 22, 4, 0.5); border-radius: 4px; padding: 1px 5px; font-family: inherit; }

/* quick + big verbs */
.ewc-quick { display: flex; gap: 6px; flex-wrap: wrap; }
.ewc-q { display: inline-flex; align-items: center; gap: 6px; padding: 7px 11px; border-radius: 9px;
  font-family: inherit; font-size: 10.5px; font-weight: 700; cursor: pointer;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text-secondary); }
.ewc-q kbd { font-size: 8px; border: 1px solid var(--sd-border-strong); border-radius: 3px; padding: 0 4px;
  color: var(--sd-text-dim); font-family: inherit; }
.ewc-q:hover { border-color: var(--sd-l3-core); color: var(--sd-text); }
.ewc-q.on { border-color: var(--sd-l3-core); color: var(--sd-l3-core); background: var(--sd-l3-soft); }
.ewc-verbs { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding-top: 3px; }
.ewc-v { display: inline-flex; align-items: center; gap: 8px; padding: 11px 16px; border-radius: 12px;
  font-family: inherit; font-size: 12px; font-weight: 800; letter-spacing: 0.04em; cursor: pointer;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text-secondary); }
.ewc-v.primary { border-color: transparent; background: var(--sd-l3-grad); color: #221604; box-shadow: var(--sd-l3-glow); }
.ewc-v.down { color: var(--sd-text-muted); }
.ewc-v:hover:not(.primary) { border-color: var(--sd-l3-core); color: var(--sd-text); }
.ewc-v kbd { font-size: 8.5px; border: 1px solid currentColor; border-radius: 4px; padding: 1px 5px; opacity: 0.6; font-family: inherit; }
.ewc-minis { display: inline-flex; gap: 5px; margin-left: auto; }
.ewc-mini { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; cursor: pointer;
  border: 1px solid var(--sd-border); background: var(--sd-surface); color: var(--sd-text-dim); }
.ewc-mini:hover { color: var(--sd-text); border-color: var(--sd-l3-core); }
.ewc-mini:disabled { opacity: 0.45; cursor: wait; }
</style>
