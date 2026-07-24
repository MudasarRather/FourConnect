<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" class="ium-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.22 }"
        @mousedown.self="!busy && $emit('close')">
        <!-- sd-scroll = the module's amber pill scrollbar (theme opt-in) — the shell is
             teleported to <body>, so it sits outside .sd-tw and must opt in itself. -->
        <Motion class="ium sd-scroll" role="dialog" aria-modal="true" aria-label="Post a stakeholder update"
          :initial="{ opacity: 0, y: 30, scale: 0.955 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18, scale: 0.98 }" :transition="{ duration: 0.46, ease: [0.16, 1, 0.3, 1] }">
          <span class="ium-accent" aria-hidden="true" />
          <button class="ium-x" :disabled="busy" aria-label="Close" @click="$emit('close')"><X :size="17" /></button>

          <!-- ░░ HEADER ░░ -->
          <header class="ium-head">
            <p class="ium-eyebrow sd-mono"><RadioTower :size="11" /> INCIDENT COMMAND · STAKEHOLDER UPDATE</p>
            <div class="ium-tr">
              <h2 class="ium-title">Cadence console — <em>{{ ticket?.ticket_number }}</em></h2>
              <SdIncSevBadge :sev="sev" />
              <span v-if="ticket?.is_major_incident" class="ium-mi sd-mono">MAJOR</span>
              <span class="ium-st sd-mono" :class="{ dead: sealed }">{{ statusLabel }}</span>
            </div>
            <p v-if="ticket?.subject" class="ium-subj">{{ ticket.subject }}</p>
            <p class="ium-sub">Every update is a promise kept — posting re-arms the cadence clock and clears
              the board's <b>update-overdue</b> lens. <b>Standing an armed cadence down asks for a reason.</b></p>
          </header>

          <div class="ium-scroll">
            <div class="ium-grid">
              <!-- ░░ LEFT — THE COMPOSER ░░ -->
              <div class="ium-main">
                <!-- sealed plate: comms move elsewhere -->
                <Motion v-if="sealed" class="ium-seal"
                  :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(0)">
                  <span class="seal-ring"><component :is="sealKind === 'merged' ? GitMerge : Lock" :size="22" /></span>
                  <p class="seal-t sd-mono">COMMS CLOSED</p>
                  <p class="seal-d" v-if="sealKind === 'merged'">This ticket was merged — post updates
                    on the surviving ticket. The log below remains part of the record.</p>
                  <p class="seal-d" v-else>This incident is {{ statusLabel }} — the update channel is closed.
                    Reopen the fault or record follow-ups in the <b>post-incident report</b>.</p>
                </Motion>

                <template v-else>
                  <!-- §0 SIGNATURE -->
                  <Motion as="section" class="ium-sig" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(0)">
                    <span class="sig-av" aria-hidden="true">
                      <svg viewBox="0 0 48 48"><circle class="sig-ring" cx="24" cy="24" r="21" pathLength="100" /></svg>
                      <i>{{ initials(meName) }}</i>
                    </span>
                    <span class="sig-meta">
                      <b>{{ meName }}</b>
                      <span class="sig-roles">
                        <em v-for="r in myRoles" :key="r" class="sd-mono" :class="{ hot: r === 'COMMANDER' }">{{ r }}</em>
                      </span>
                    </span>
                    <span class="sig-right">
                      <b class="sd-mono">{{ utcClock }}</b>
                      <em class="sd-mono">UPDATE {{ updateNo != null ? '№ ' + updateNo : '№ —' }}</em>
                    </span>
                  </Motion>

                  <!-- audience wire — who hears this, and what it does to the clocks -->
                  <Motion as="p" class="ium-wire" :class="{ pub: !isInternal }"
                    :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :transition="fT(1)">
                    <component :is="isInternal ? Lock : Radio" :size="12" />
                    <template v-if="!isInternal"><b>Public reply</b> — {{ requesterName }} is notified the moment
                      this posts<template v-if="!ticket?.first_responded_at"> and the <b>response clock stops</b>
                      (this counts as first reply)</template>.</template>
                    <template v-else><b>Internal work-note</b> — the war-room strip and the team see it;
                      the requester never does.</template>
                  </Motion>

                  <!-- §1 LIFECYCLE PHASE TRACK -->
                  <section class="ium-f">
                    <label class="ium-k">Lifecycle phase <i>optional — tags the update & drafts the copy</i></label>
                    <div class="ph-track">
                      <span class="ph-line" aria-hidden="true" />
                      <Motion v-for="(p, i) in PHASES" :key="p.key" as="button" type="button" class="ph"
                        :class="[p.tone, { on: phase === p.key, passed: phaseIdx > i }]"
                        :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
                        :transition="{ duration: 0.35, delay: 0.1 + i * 0.05, ease: [0.16, 1, 0.3, 1] }"
                        :while-tap="{ scale: 0.95 }" :disabled="busy" @click="pickPhase(p)">
                        <span class="ph-dot"><component :is="p.icon" :size="12" /></span>
                        <b>{{ p.label }}</b>
                        <Motion v-if="phase === p.key" class="ph-tick"
                          :initial="{ scale: 0, rotate: -30 }" :animate="{ scale: 1, rotate: 0 }"
                          :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }"><Check :size="9" /></Motion>
                      </Motion>
                    </div>
                  </section>

                  <!-- §2 THE UPDATE -->
                  <Motion as="section" class="ium-f" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(3)">
                    <label class="ium-k">The update <em class="req">*</em></label>
                    <textarea ref="taRef" v-model="body" rows="4" class="ium-body" maxlength="4000"
                      placeholder="What changed? What's the impact now? What happens next?" />
                    <div class="ium-inrow">
                      <span class="hint sd-mono" :class="{ ok: bodyOk }">{{ bodyOk ? 'STATEMENT COMPLETE' : 'MIN 3 CHARACTERS' }}</span>
                      <span class="cnt sd-mono" :class="{ hot: body.length > 3600 }">{{ body.length }}/4000</span>
                    </div>
                  </Motion>

                  <!-- §3 + §4 VISIBILITY / CADENCE -->
                  <Motion as="section" class="ium-f" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(4)">
                    <label class="ium-k">Visibility</label>
                    <div class="seg">
                      <button type="button" class="seg-b" :class="{ on: !isInternal }" :disabled="busy" @click="isInternal = false">
                        <Globe :size="12" /> Public reply</button>
                      <button type="button" class="seg-b" :class="{ on: isInternal }" :disabled="busy" @click="isInternal = true">
                        <Lock :size="12" /> Internal note</button>
                    </div>
                  </Motion>

                  <Motion as="section" class="ium-f" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(5)">
                    <label class="ium-k">Update cadence <i>the promise you're making next</i></label>
                    <div class="cad-chips">
                      <button type="button" class="cchip" :class="{ on: cadence === 'keep' }" :disabled="busy"
                        @click="cadence = 'keep'">{{ armedInterval ? `Keep · ${ivLabel(armedInterval)}` : 'No cadence' }}</button>
                      <button v-for="o in UPDATE_CADENCE_OPTIONS" :key="o.value" type="button" class="cchip"
                        :class="{ on: cadence === String(o.value) }" :disabled="busy"
                        @click="cadence = String(o.value)">{{ o.label }}</button>
                      <button v-if="armedInterval" type="button" class="cchip stop" :class="{ on: cadence === 'stop' }"
                        :disabled="busy" @click="cadence = 'stop'"><OctagonMinus :size="11" /> Stand down</button>
                    </div>
                    <Transition name="rise" mode="out-in">
                      <p v-if="cadence === 'stop'" key="stop" class="cad-promise down sd-mono">
                        <OctagonMinus :size="10" /> CADENCE STANDS DOWN — NO FURTHER PROMISED UPDATES</p>
                      <p v-else-if="promisedAt" :key="promisedAt" class="cad-promise sd-mono">
                        <Timer :size="10" /> NEXT UPDATE PROMISED {{ promisedAt }}</p>
                    </Transition>
                  </Motion>

                  <!-- §5 STAND-DOWN REASON — drop-gate mirrors the backend 422 -->
                  <div class="ium-reason" :class="{ open: needsReason }" :aria-hidden="!needsReason">
                    <div class="reason-clip">
                      <div class="reason-inner">
                        <p class="reason-k sd-mono"><FileSignature :size="12" /> STAND-DOWN REASON
                          <em class="req">required — stakeholders were promised the next update</em></p>
                        <div class="reason-chips">
                          <button v-for="c in STOP_REASONS" :key="c" type="button" class="rchip"
                            :class="{ on: reason === c }" @click="reason = reason === c ? '' : c">{{ c }}</button>
                        </div>
                        <textarea v-model="reason" class="reason-ta" rows="2" maxlength="500"
                          placeholder="Why the cadence is standing down — resolved, downgraded, handed off…" />
                      </div>
                    </div>
                  </div>
                </template>
              </div>

              <!-- ░░ RIGHT — CADENCE DIAL + COMMS LOG ░░ -->
              <aside class="ium-rail">
                <Motion class="dial-card" :initial="{ opacity: 0, x: 14 }" :animate="{ opacity: 1, x: 0 }" :transition="fT(1)">
                  <p class="rail-k sd-mono">CADENCE DIAL <em v-if="overdueMin">· OVERDUE</em></p>
                  <div class="dial-wrap">
                    <svg class="dial" viewBox="0 0 120 120" aria-hidden="true">
                      <circle class="dial-track" cx="60" cy="60" r="50" pathLength="100" />
                      <circle v-if="armedInterval && !overdueMin" class="dial-arc" cx="60" cy="60" r="50" pathLength="100"
                        :stroke-dasharray="`${remainPct} ${100 - remainPct}`" />
                      <circle v-if="overdueMin" class="dial-over" cx="60" cy="60" r="50" pathLength="100" />
                      <circle v-if="ghostPct != null" class="dial-ghost" cx="60" cy="60" r="44" pathLength="100"
                        :stroke-dasharray="`${ghostPct} ${100 - ghostPct}`" />
                    </svg>
                    <div class="dial-core">
                      <template v-if="overdueMin">
                        <b class="over sd-mono">+{{ overdueMin }}m</b><span>OVERDUE</span>
                      </template>
                      <template v-else-if="armedInterval">
                        <b class="sd-mono">{{ countdown }}</b><span>NEXT DUE</span>
                      </template>
                      <template v-else>
                        <b class="dorm sd-mono">—</b><span>NO CADENCE</span>
                      </template>
                    </div>
                  </div>
                  <p class="dial-sub sd-mono">
                    <template v-if="armedInterval">ARMED · {{ ivLabel(armedInterval).toUpperCase() }}
                      <em v-if="lastPosted"> · LAST {{ lastPosted }}</em></template>
                    <template v-else>POSTING WITH A CADENCE ARMS THE CLOCK</template>
                  </p>
                </Motion>

                <Motion class="log-card" :initial="{ opacity: 0, x: 14 }" :animate="{ opacity: 1, x: 0 }" :transition="fT(2)">
                  <p class="rail-k sd-mono">COMMS LOG <em v-if="history.length">· {{ history.length }}</em></p>
                  <div class="log-list">
                    <template v-if="histState === 'loading'">
                      <span v-for="i in 3" :key="`sk${i}`" class="log-skel" :style="{ '--i': i }" />
                    </template>
                    <template v-else-if="history.length">
                      <Motion v-for="(h, i) in history" :key="h.id || i" class="log-row"
                        :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="rT(i)">
                        <span class="log-t sd-mono">{{ ago(h.at) }}</span>
                        <div class="log-body">
                          <p class="log-actor"><b>{{ h.actor }}</b>
                            <em class="log-vis sd-mono" :class="{ pub: !h.internal }">{{ h.internal ? 'INTERNAL' : 'PUBLIC' }}</em>
                            <em v-if="h.phase" class="log-ph sd-mono">{{ h.phase.toUpperCase() }}</em>
                          </p>
                          <p v-if="h.preview" class="log-prev">{{ h.preview }}</p>
                          <p v-else class="log-prev dim">update posted · {{ h.chars }} chars</p>
                          <p v-if="h.cadence" class="log-cad sd-mono">{{ h.cadence }}</p>
                          <p v-if="h.note" class="log-note">“{{ h.note }}”</p>
                        </div>
                      </Motion>
                    </template>
                    <p v-else-if="histState === 'ready'" class="log-empty">No updates yet — this one opens the channel.</p>
                    <p v-else class="log-empty">Couldn't load the log.</p>
                  </div>
                </Motion>
              </aside>
            </div>
          </div>

          <div class="ium-foot">
            <span class="ium-stamp" :class="stampTone">
              <component :is="sealed ? Lock : (canPost ? Check : (needsReason && bodyOk ? FileSignature : MessageSquare))" :size="13" />
              {{ stampText }}
            </span>
            <div class="ium-actions">
              <button type="button" class="ium-btn ghost" :disabled="busy" @click="$emit('close')">Cancel</button>
              <Motion as="button" type="button" class="ium-btn primary" :disabled="!canPost || busy"
                :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }" @click="post">
                <Loader v-if="busy" :size="14" class="ium-spin" /><Send v-else :size="14" />
                Post update
              </Motion>
            </div>
          </div>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
/* SdIncUpdateModal — "THE CADENCE CONSOLE". POST /tickets/{id}/status-update.
   Two-pane: composer (signature card, audience wire, lifecycle phase track that drafts
   the copy AND tags the payload, body, visibility, cadence chips w/ live promise line,
   stand-down reason gate mirroring the backend 422) + rail (live cadence dial with
   countdown / overdue pulse / ghost preview of the new promise, and the comms log —
   `status_update` activities w/ preview text, phase, visibility and cadence effects).
   Deliberately NOT SdWarRoomConsole (that drags the presence heartbeat + MI panels onto
   a fast triage floor). 409 (went terminal mid-poll) surfaces as toast + done(null). */
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  X, Send, Loader, Globe, Lock, MessageSquare, Check, Radio, RadioTower, Timer,
  FileSignature, GitMerge, OctagonMinus, Search, Lightbulb, Wrench, Eye, CircleCheck,
} from 'lucide-vue-next'
import SdIncSevBadge from '../components/SdIncSevBadge.vue'
import {
  postStatusUpdate, listTicketActivities, fetchMe, sevOf,
  CRITICAL_UPDATE_TEMPLATES, UPDATE_CADENCE_OPTIONS,
} from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  ticket: { type: Object, default: null },
})
const emit = defineEmits(['close', 'done'])
const toast = useToast()

/* the 5-phase lifecycle track — same vocabulary as CRITICAL_UPDATE_TEMPLATES */
const PHASE_ICONS = { investigating: Search, identified: Lightbulb, mitigating: Wrench,
  monitoring: Eye, resolved: CircleCheck }
const PHASE_TONES = { investigating: 'arc', identified: 'warn', mitigating: 'warn',
  monitoring: 'amber', resolved: 'live' }
const PHASES = CRITICAL_UPDATE_TEMPLATES.map((t) => ({
  key: t.key, label: t.label, text: t.text, icon: PHASE_ICONS[t.key], tone: PHASE_TONES[t.key] }))
const STOP_REASONS = ['Resolved — monitoring complete', 'Incident downgraded',
  'Comms handed to the comms lead', 'Cadence merged into the bridge call']
const fT = (i) => ({ duration: 0.4, delay: 0.05 + i * 0.06, ease: [0.16, 1, 0.3, 1] })
const rT = (i) => ({ duration: 0.3, delay: Math.min(i, 10) * 0.04, ease: [0.16, 1, 0.3, 1] })

/* ── state ── */
const body = ref('')
const phase = ref(null)
const isInternal = ref(true)
const cadence = ref('keep')
const reason = ref('')
const busy = ref(false)
const taRef = ref(null)
const me = ref(null)
const history = ref([])
const histState = ref('idle')
const nowTick = ref(0)
let clockTimer = null
let fetchSeq = 0

/* ── time helpers (backend timestamps can arrive naive UTC — pin the zone) ── */
const asUtc = (iso) => new Date(/Z$|[+-]\d\d:?\d\d$/.test(String(iso)) ? iso : String(iso).replace(' ', 'T') + 'Z')
const pad = (n) => String(n).padStart(2, '0')
const ago = (iso) => {
  if (!iso) return '—'
  const s = Math.max(0, (nowTick.value - asUtc(iso).getTime()) / 1000)
  if (s < 90) return 'just now'
  if (s < 5400) return `${Math.round(s / 60)}m`
  if (s < 129600) return `${Math.round(s / 3600)}h`
  return `${Math.round(s / 86400)}d`
}
const ivLabel = (m) => (m >= 60 ? `every ${m / 60}h` : `every ${m}m`)

/* ── open/close lifecycle ── */
watch(() => props.open, (v) => {
  if (v) {
    body.value = ''; phase.value = null; isInternal.value = true; cadence.value = 'keep'; reason.value = ''
    me.value = null
    fetchMe().then((u) => { me.value = u })
    loadHistory()
    nowTick.value = Date.now()
    clockTimer = setInterval(() => { nowTick.value = Date.now() }, 1000)
    window.addEventListener('keydown', onKey)
    if (!sealed.value) nextTick(() => setTimeout(() => taRef.value?.focus?.(), 380))
  } else {
    fetchSeq++
    if (clockTimer) { clearInterval(clockTimer); clockTimer = null }
    window.removeEventListener('keydown', onKey)
  }
})
const onKey = (e) => { if (e.key === 'Escape' && props.open && !busy.value) emit('close') }
onBeforeUnmount(() => { if (clockTimer) clearInterval(clockTimer); window.removeEventListener('keydown', onKey) })

/* ── header / gates ── */
const sev = computed(() => props.ticket?.sev ?? sevOf(props.ticket))
const statusLabel = computed(() => String(props.ticket?.status || '').replace(/_/g, ' ') || '—')
const sealed = computed(() => {
  const t = props.ticket
  if (!t) return false
  return ['resolved', 'closed', 'archived'].includes(String(t.status || '')) || !!t.merged_into_id
})
const sealKind = computed(() => (props.ticket?.merged_into_id ? 'merged' : 'terminal'))
const armedInterval = computed(() => props.ticket?.update_interval_minutes || null)
const needsReason = computed(() => cadence.value === 'stop' && !!armedInterval.value)
const bodyOk = computed(() => body.value.trim().length >= 3)
const canPost = computed(() => !sealed.value && bodyOk.value
  && (!needsReason.value || reason.value.trim().length >= 3))
const stampText = computed(() => {
  if (sealed.value) return 'COMMS CLOSED'
  if (!bodyOk.value) return 'WRITE THE UPDATE'
  if (!canPost.value) return 'STAND-DOWN — REASON REQUIRED'
  return isInternal.value ? 'READY — INTERNAL NOTE' : 'READY — PUBLIC REPLY'
})
const stampTone = computed(() => sealed.value ? 'dead'
  : canPost.value ? 'ready' : bodyOk.value ? 'hold' : '')

/* ── signature / audience ── */
const meName = computed(() => me.value?.full_name || me.value?.email || 'You')
const initials = (name) => String(name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?'
const myRoles = computed(() => {
  const t = props.ticket, m = me.value
  if (!t || !m) return ['RESPONDER']
  const id = String(m.id), out = []
  if (String(t.incident_commander_id || '') === id) out.push('COMMANDER')
  if (String(t.comms_lead_id || '') === id) out.push('COMMS LEAD')
  if (String(t.ops_lead_id || '') === id) out.push('OPS LEAD')
  if (String(t.assigned_agent_id || '') === id) out.push('OWNER')
  if (!out.length) out.push(m.is_superuser ? 'ADMIN' : 'RESPONDER')
  return out
})
const utcClock = computed(() => { void nowTick.value; return new Date().toISOString().slice(11, 19) + ' UTC' })
const updateNo = computed(() => (histState.value === 'ready' ? history.value.length + 1 : null))
const requesterName = computed(() =>
  props.ticket?.customer_name || props.ticket?.raised_by_name || 'the requester')

/* ── phase track ── */
const phaseIdx = computed(() => PHASES.findIndex((p) => p.key === phase.value))
const pickPhase = (p) => {
  if (phase.value === p.key) { phase.value = null; return }   // untag — the text stays editable
  phase.value = p.key
  body.value = p.text
}

/* ── cadence dial ── */
const nextDueMs = computed(() => {
  const d = props.ticket?.next_update_due_at
  return d ? asUtc(d).getTime() : null
})
const remainPct = computed(() => {
  if (!armedInterval.value || !nextDueMs.value) return 0
  const total = armedInterval.value * 60000
  return Math.max(0, Math.min(100, ((nextDueMs.value - nowTick.value) / total) * 100))
})
const overdueMin = computed(() => {
  if (!armedInterval.value || !nextDueMs.value) return 0
  const over = nowTick.value - nextDueMs.value
  return over > 0 ? Math.max(1, Math.round(over / 60000)) : 0
})
const countdown = computed(() => {
  if (!nextDueMs.value) return '—'
  const s = Math.max(0, Math.floor((nextDueMs.value - nowTick.value) / 1000))
  return s >= 3600 ? `${Math.floor(s / 3600)}h ${pad(Math.floor((s % 3600) / 60))}m`
    : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`
})
const lastPosted = computed(() => props.ticket?.last_status_update_at
  ? ago(props.ticket.last_status_update_at) + ' ago' : '')
/* ghost ring — the promise you're ABOUT to make (full ring at the new interval) */
const ghostPct = computed(() => {
  if (cadence.value === 'keep' || cadence.value === 'stop') return null
  return 100
})
const promisedAt = computed(() => {
  void nowTick.value
  let iv = null
  if (cadence.value === 'keep') iv = armedInterval.value
  else if (cadence.value !== 'stop') iv = Number(cadence.value)
  if (!iv) return ''
  const d = new Date(Date.now() + iv * 60000)
  return `${pad(d.getHours())}:${pad(d.getMinutes())} (in ${ivLabel(iv).replace('every ', '')})`
})

/* ── comms log — status_update activities, newest first ── */
const loadHistory = async () => {
  const t = props.ticket
  if (!t?.id) { histState.value = 'ready'; history.value = []; return }
  const seq = ++fetchSeq
  histState.value = 'loading'
  try {
    const rows = await listTicketActivities(t.id)
    if (seq !== fetchSeq) return
    history.value = (rows || [])
      .filter((r) => r.action === 'status_update')
      .map((r) => {
        const d = r.detail || {}
        let cad = ''
        if (d.stopped) cad = '→ CADENCE STOOD DOWN'
        else if (d.prev_interval_min != null && d.interval_min) cad = `→ RETIMED ${d.prev_interval_min}m → ${d.interval_min}m`
        else if (d.interval_min) cad = `→ RE-ARMED · ${ivLabel(d.interval_min).toUpperCase()}`
        return { id: r.id, at: r.created_at, actor: r.actor_name || 'System',
                 internal: d.internal !== false, phase: d.phase || null,
                 preview: d.preview || null, chars: d.chars || 0,
                 cadence: cad, note: d.note || null }
      })
      .reverse()
    histState.value = 'ready'
  } catch { if (seq === fetchSeq) histState.value = 'error' }
}

/* ── post ── */
const post = async () => {
  if (!canPost.value || !props.ticket || busy.value) return
  busy.value = true
  try {
    const payload = { body: body.value.trim(), is_internal: isInternal.value }
    if (phase.value) payload.phase = phase.value
    if (cadence.value === 'stop') payload.stop_cadence = true
    else if (cadence.value !== 'keep') payload.interval_minutes = Number(cadence.value)
    if (reason.value.trim()) payload.note = reason.value.trim()
    const t = await postStatusUpdate(props.ticket.id, payload)
    toast.success(cadence.value === 'stop' ? 'Update posted — cadence stood down'
      : isInternal.value ? 'Internal update posted' : 'Stakeholder update posted — cadence re-armed')
    emit('done', t)
    emit('close')
  } catch (e) {
    const d = e?.response?.data?.detail
    const detail = Array.isArray(d) ? (d[0]?.msg || 'Validation failed') : (d || 'Could not post the update')
    if (e?.response?.status === 409) { toast.info(detail); emit('done', null); emit('close') }
    else toast.error(detail)
  } finally { busy.value = false }
}
</script>

<style scoped>
.ium-overlay { position: fixed; inset: 0; z-index: 2700; display: grid; place-items: center;
  padding: 20px; background: rgba(5, 4, 2, 0.6); backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px); }
.ium { position: relative; width: min(880px, 96vw); max-height: 92vh; display: flex; flex-direction: column;
  border-radius: 20px; padding: 24px 24px 18px; overflow: hidden;
  background: linear-gradient(180deg, var(--sd-surface-elevated), var(--sd-surface));
  border: 1px solid var(--sd-inc-brd); box-shadow: var(--sd-shadow-hover); }
.ium-accent { position: absolute; inset: 0 0 auto 0; height: 3px; background: var(--sd-inc-grad); }
.ium-x { position: absolute; top: 14px; right: 14px; z-index: 2; display: grid; place-items: center; width: 30px;
  height: 30px; border-radius: 10px; cursor: pointer; background: var(--sd-surface);
  border: 1px solid var(--sd-border); color: var(--sd-text-muted); }

.ium-head { margin-bottom: 14px; }
.ium-eyebrow { display: flex; align-items: center; gap: 6px; margin: 0 0 6px; font-size: 9.5px;
  letter-spacing: 0.18em; color: var(--sd-inc-core); }
.ium-tr { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.ium-title { margin: 0; font-size: 20px; font-weight: 800; color: var(--sd-text); }
.ium-title em { font-style: normal; background: var(--sd-inc-grad); -webkit-background-clip: text;
  background-clip: text; color: transparent; }
.ium-mi { padding: 2px 8px; border-radius: 8px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.12em;
  color: var(--sd-inc-arc); background: var(--sd-inc-arc-soft);
  border: 1px solid color-mix(in srgb, var(--sd-inc-arc) 40%, transparent); }
.ium-st { padding: 2px 8px; border-radius: 8px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--sd-text-muted); background: var(--sd-inc-dim-soft);
  border: 1px solid var(--sd-border); }
.ium-st.dead { color: var(--sd-inc-arc); }
.ium-subj { margin: 5px 0 0; font-size: 12.5px; font-weight: 650; color: var(--sd-text-secondary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ium-sub { margin: 4px 0 0; font-size: 12px; line-height: 1.55; color: var(--sd-text-secondary); }
.ium-sub b { color: var(--sd-text); }

.ium-scroll { overflow-y: auto; padding-right: 2px; }
.ium-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(250px, 1fr); gap: 14px; }
.ium-main { display: flex; flex-direction: column; gap: 13px; min-width: 0; }

/* seal plate */
.ium-seal { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 20px;
  text-align: center; border-radius: 16px;
  background: color-mix(in srgb, var(--sd-inc-dim-soft) 70%, transparent); border: 1px dashed var(--sd-border); }
.seal-ring { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 50%;
  color: var(--sd-text-muted); background: var(--sd-surface); border: 1px solid var(--sd-border); }
.seal-t { margin: 2px 0 0; font-size: 10px; font-weight: 800; letter-spacing: 0.16em; color: var(--sd-text); }
.seal-d { margin: 0; max-width: 420px; font-size: 11.5px; line-height: 1.55; color: var(--sd-text-secondary); }
.seal-d b { color: var(--sd-text); }

/* signature (same family as the sibling command consoles) */
.ium-sig { display: flex; align-items: center; gap: 11px; padding: 10px 12px; border-radius: 14px;
  background: var(--sd-surface); border: 1px solid var(--sd-border); }
.sig-av { position: relative; flex-shrink: 0; display: grid; place-items: center; width: 38px; height: 38px; }
.sig-av svg { position: absolute; inset: 0; }
.sig-ring { fill: none; stroke: var(--sd-inc-core); stroke-width: 2; stroke-dasharray: 100;
  stroke-dashoffset: 100; stroke-linecap: round; transform: rotate(-90deg); transform-origin: center;
  animation: ium-sigring 1s var(--sd-spring) 0.2s forwards; }
@keyframes ium-sigring { to { stroke-dashoffset: 0; } }
.sig-av i { font-style: normal; font-size: 11px; font-weight: 800; letter-spacing: 0.04em;
  color: var(--sd-inc-core); font-family: var(--sd-mono); }
.sig-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.sig-meta b { font-size: 13px; font-weight: 750; color: var(--sd-text); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; }
.sig-roles { display: flex; gap: 5px; flex-wrap: wrap; }
.sig-roles em { padding: 1px 7px; border-radius: 7px; font-style: normal; font-size: 8px; font-weight: 800;
  letter-spacing: 0.1em; color: var(--sd-text-muted); background: var(--sd-inc-dim-soft);
  border: 1px solid var(--sd-border); }
.sig-roles em.hot { color: var(--sd-inc-core); background: var(--sd-inc-soft); border-color: var(--sd-inc-brd); }
.sig-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.sig-right b { font-size: 11px; font-weight: 800; color: var(--sd-text-secondary); }
.sig-right em { font-style: normal; font-size: 8.5px; font-weight: 700; letter-spacing: 0.1em;
  color: var(--sd-text-muted); }

/* audience wire */
.ium-wire { display: flex; align-items: flex-start; gap: 7px; margin: 0; padding: 8px 11px;
  border-radius: 11px; font-size: 11px; font-weight: 600; line-height: 1.45; color: var(--sd-text-secondary);
  background: color-mix(in srgb, var(--sd-inc-soft) 45%, transparent); border: 1px solid var(--sd-inc-brd);
  transition: background-color 0.3s ease, border-color 0.3s ease; }
.ium-wire svg { flex-shrink: 0; margin-top: 1px; color: var(--sd-inc-core); }
.ium-wire b { color: var(--sd-text); }
.ium-wire.pub { background: var(--sd-inc-live-soft);
  border-color: color-mix(in srgb, var(--sd-inc-live) 35%, transparent); }
.ium-wire.pub svg { color: var(--sd-inc-live); }

/* fields */
.ium-f { display: flex; flex-direction: column; gap: 7px; }
.ium-k { display: flex; align-items: baseline; gap: 7px; font-size: 11.5px; font-weight: 800;
  letter-spacing: 0.03em; color: var(--sd-text); }
.ium-k i { font-style: normal; font-weight: 600; color: var(--sd-text-muted); }
.req { color: var(--sd-inc-arc); font-style: normal; }

/* phase track */
.ph-track { position: relative; display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
.ph-line { position: absolute; top: 19px; left: 8%; right: 8%; height: 2px; z-index: 0;
  background: linear-gradient(90deg, var(--sd-inc-arc), var(--sd-inc-warn), var(--sd-inc-core), var(--sd-inc-live));
  opacity: 0.25; }
.ph { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 5px;
  padding: 8px 4px 7px; border-radius: 12px; cursor: pointer; font: inherit;
  background: var(--sd-surface); border: 1px solid var(--sd-border);
  transition: border-color 0.22s var(--sd-spring), background-color 0.22s var(--sd-spring),
    transform 0.22s var(--sd-spring); }
.ph:hover { transform: translateY(-2px); border-color: var(--sd-inc-brd); }
.ph b { font-size: 9.5px; font-weight: 800; letter-spacing: 0.02em; color: var(--sd-text-secondary); }
.ph-dot { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%;
  color: var(--sd-text-muted); background: var(--sd-inc-dim-soft); border: 1px solid var(--sd-border);
  transition: all 0.22s var(--sd-spring); }
.ph.on b { color: var(--sd-text); }
.ph.on.arc { border-color: color-mix(in srgb, var(--sd-inc-arc) 45%, transparent); background: var(--sd-inc-arc-soft); }
.ph.on.arc .ph-dot { color: var(--sd-inc-arc); background: transparent; border-color: currentColor; box-shadow: 0 0 8px var(--sd-inc-arc); }
.ph.on.warn { border-color: color-mix(in srgb, var(--sd-inc-warn) 45%, transparent); background: var(--sd-inc-warn-soft); }
.ph.on.warn .ph-dot { color: var(--sd-inc-warn); background: transparent; border-color: currentColor; box-shadow: 0 0 8px var(--sd-inc-warn); }
.ph.on.amber { border-color: var(--sd-inc-brd); background: var(--sd-inc-soft); }
.ph.on.amber .ph-dot { color: var(--sd-inc-core); background: transparent; border-color: currentColor; box-shadow: 0 0 8px var(--sd-inc-core); }
.ph.on.live { border-color: color-mix(in srgb, var(--sd-inc-live) 45%, transparent); background: var(--sd-inc-live-soft); }
.ph.on.live .ph-dot { color: var(--sd-inc-live); background: transparent; border-color: currentColor; box-shadow: 0 0 8px var(--sd-inc-live); }
.ph-tick { position: absolute; top: -5px; right: -5px; display: grid; place-items: center; width: 15px;
  height: 15px; border-radius: 50%; color: #1a1206; background: var(--sd-inc-grad); }
.ph:disabled { opacity: 0.55; cursor: default; }

/* body */
.ium-body { width: 100%; resize: vertical; min-height: 96px; border-radius: 13px; padding: 12px 14px;
  font: inherit; font-size: 13px; line-height: 1.55; color: var(--sd-text);
  background: var(--sd-surface); border: 1px solid var(--sd-border); outline: none; }
.ium-body:focus { border-color: var(--sd-inc-brd); box-shadow: 0 0 0 3px var(--sd-inc-soft); }
.ium-body::placeholder { color: var(--sd-text-placeholder, var(--sd-text-muted)); }
.ium-inrow { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.hint { font-size: 8.5px; font-weight: 800; letter-spacing: 0.12em; color: var(--sd-text-muted); }
.hint.ok { color: var(--sd-inc-live); }
.cnt { font-size: 9px; font-weight: 700; color: var(--sd-text-muted); }
.cnt.hot { color: var(--sd-inc-warn); }

/* visibility */
.seg { display: inline-flex; padding: 3px; border-radius: 11px; background: var(--sd-surface);
  border: 1px solid var(--sd-border); gap: 2px; align-self: flex-start; }
.seg-b { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 8px;
  border: 0; cursor: pointer; font: inherit; font-size: 11px; font-weight: 750;
  color: var(--sd-text-muted); background: transparent; transition: all 0.22s var(--sd-spring); }
.seg-b.on { color: var(--sd-inc-core); background: var(--sd-inc-soft); }
.seg-b:disabled { opacity: 0.55; cursor: default; }

/* cadence chips + promise */
.cad-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.cchip { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 999px;
  cursor: pointer; font: inherit; font-size: 10.5px; font-weight: 750; color: var(--sd-text-secondary);
  background: var(--sd-surface); border: 1px solid var(--sd-border); transition: all 0.22s var(--sd-spring); }
.cchip:hover { transform: translateY(-2px); color: var(--sd-text); border-color: var(--sd-inc-brd); }
.cchip.on { color: var(--sd-inc-core); background: var(--sd-inc-soft); border-color: var(--sd-inc-brd); }
.cchip.stop.on { color: var(--sd-inc-arc); background: var(--sd-inc-arc-soft);
  border-color: color-mix(in srgb, var(--sd-inc-arc) 45%, transparent); }
.cchip:disabled { opacity: 0.55; cursor: default; }
.cad-promise { display: flex; align-items: center; gap: 6px; margin: 2px 0 0; font-size: 8.5px;
  font-weight: 800; letter-spacing: 0.12em; color: var(--sd-inc-core); }
.cad-promise.down { color: var(--sd-inc-arc); }

/* stand-down reason gate */
.ium-reason { display: grid; grid-template-rows: 0fr; opacity: 0;
  transition: grid-template-rows 0.4s var(--sd-spring), opacity 0.3s ease; }
.ium-reason.open { grid-template-rows: 1fr; opacity: 1; }
.reason-clip { overflow: hidden; min-height: 0; }
.reason-inner { display: flex; flex-direction: column; gap: 8px; padding: 12px 13px; border-radius: 14px;
  background: color-mix(in srgb, var(--sd-inc-arc-soft) 60%, transparent);
  border: 1px solid color-mix(in srgb, var(--sd-inc-arc) 30%, transparent); }
.reason-k { display: flex; align-items: center; gap: 6px; margin: 0; font-size: 9px; font-weight: 800;
  letter-spacing: 0.14em; color: var(--sd-inc-arc); }
.reason-k .req { font-style: normal; letter-spacing: 0.04em; font-weight: 700;
  color: var(--sd-text-secondary); text-transform: none; }
.reason-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.rchip { padding: 4px 10px; border-radius: 16px; cursor: pointer; font-size: 10.5px; font-weight: 700;
  color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border);
  transition: all 0.2s var(--sd-spring); }
.rchip:hover { color: var(--sd-text); border-color: var(--sd-inc-brd); }
.rchip.on { color: #1a1206; background: var(--sd-inc-grad); border-color: transparent; }
.reason-ta { width: 100%; resize: vertical; padding: 9px 11px; border-radius: 11px; font: inherit;
  font-size: 12px; color: var(--sd-text); background: var(--sd-surface);
  border: 1px solid var(--sd-border); outline: none; }
.reason-ta:focus { border-color: var(--sd-inc-brd); box-shadow: 0 0 0 3px var(--sd-inc-soft); }

/* ═══ RIGHT RAIL ═══ */
.ium-rail { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.rail-k { margin: 0 0 8px; font-size: 9px; font-weight: 800; letter-spacing: 0.16em;
  color: var(--sd-text-muted); }
.rail-k em { font-style: normal; color: var(--sd-inc-arc); }
.dial-card, .log-card { padding: 12px; border-radius: 14px;
  background: color-mix(in srgb, var(--sd-surface) 72%, transparent); border: 1px solid var(--sd-border); }

.dial-wrap { position: relative; width: 132px; margin: 0 auto; }
.dial { display: block; width: 100%; }
.dial-track { fill: none; stroke: var(--sd-inc-dim-soft); stroke-width: 5; }
.dial-arc { fill: none; stroke: var(--sd-inc-core); stroke-width: 5; stroke-linecap: round;
  transform: rotate(-90deg); transform-origin: center;
  transition: stroke-dasharray 0.9s var(--sd-spring); filter: drop-shadow(0 0 4px var(--sd-inc-soft)); }
.dial-over { fill: none; stroke: var(--sd-inc-arc); stroke-width: 5; stroke-linecap: round;
  animation: ium-overpulse 1.6s ease-in-out infinite; filter: drop-shadow(0 0 6px var(--sd-inc-arc)); }
@keyframes ium-overpulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
.dial-ghost { fill: none; stroke: var(--sd-inc-live); stroke-width: 2.5; stroke-linecap: round;
  stroke-dasharray: 3 2; opacity: 0.65; transform: rotate(-90deg); transform-origin: center;
  animation: ium-ghostspin 8s linear infinite; }
@keyframes ium-ghostspin { to { transform: rotate(270deg); } }
.dial-core { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 2px; }
.dial-core b { font-size: 17px; font-weight: 800; color: var(--sd-text); }
.dial-core b.over { color: var(--sd-inc-arc); }
.dial-core b.dorm { color: var(--sd-text-muted); }
.dial-core span { font-size: 7.5px; font-weight: 800; letter-spacing: 0.16em; color: var(--sd-text-muted); }
.dial-sub { margin: 8px 0 0; text-align: center; font-size: 8.5px; font-weight: 700;
  letter-spacing: 0.1em; color: var(--sd-text-muted); }
.dial-sub em { font-style: normal; color: var(--sd-text-muted); }

/* comms log */
.log-card { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.log-list { display: flex; flex-direction: column; gap: 9px; overflow-y: auto; max-height: 280px;
  padding-right: 2px; scrollbar-width: thin; }
.log-row { display: flex; align-items: flex-start; gap: 9px; }
.log-t { flex-shrink: 0; width: 44px; padding-top: 1px; font-size: 9px; font-weight: 700;
  letter-spacing: 0.05em; color: var(--sd-text-muted); text-align: right; }
.log-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;
  padding-bottom: 8px; border-bottom: 1px dashed var(--sd-border); }
.log-row:last-child .log-body { border-bottom: 0; }
.log-actor { display: flex; align-items: center; gap: 6px; margin: 0; font-size: 11px; flex-wrap: wrap; }
.log-actor b { color: var(--sd-text); font-weight: 750; }
.log-vis { padding: 1px 6px; border-radius: 6px; font-style: normal; font-size: 7.5px; font-weight: 800;
  letter-spacing: 0.1em; color: var(--sd-text-muted); background: var(--sd-inc-dim-soft);
  border: 1px solid var(--sd-border); }
.log-vis.pub { color: var(--sd-inc-live); background: var(--sd-inc-live-soft);
  border-color: color-mix(in srgb, var(--sd-inc-live) 40%, transparent); }
.log-ph { padding: 1px 6px; border-radius: 6px; font-style: normal; font-size: 7.5px; font-weight: 800;
  letter-spacing: 0.1em; color: var(--sd-inc-core); background: var(--sd-inc-soft);
  border: 1px solid var(--sd-inc-brd); }
.log-prev { margin: 0; font-size: 10.5px; line-height: 1.5; color: var(--sd-text-secondary);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.log-prev.dim { color: var(--sd-text-muted); font-style: italic; }
.log-cad { margin: 0; font-size: 8px; font-weight: 800; letter-spacing: 0.08em; color: var(--sd-inc-warn); }
.log-note { margin: 1px 0 0; font-size: 10.5px; font-style: italic; color: var(--sd-inc-core); }
.log-empty { margin: 0; padding: 10px 2px; font-size: 11px; color: var(--sd-text-muted); }
.log-skel { height: 34px; border-radius: 10px; background: linear-gradient(100deg,
  var(--sd-inc-dim-soft) 40%, color-mix(in srgb, var(--sd-inc-soft) 50%, transparent) 50%,
  var(--sd-inc-dim-soft) 60%); background-size: 220% 100%;
  animation: ium-shimmer 1.3s linear infinite; animation-delay: calc(var(--i) * 0.09s); }
@keyframes ium-shimmer { from { background-position: 130% 0; } to { background-position: -60% 0; } }

/* footer */
.ium-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px;
  margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--sd-border); }
.ium-stamp { display: inline-flex; align-items: center; gap: 6px; padding: 4px 11px; border-radius: 20px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.12em; font-family: var(--sd-mono);
  color: var(--sd-text-muted); background: var(--sd-surface-elevated); border: 1px solid var(--sd-border);
  transition: all 0.25s var(--sd-spring); }
.ium-stamp.ready { color: var(--sd-inc-live); background: var(--sd-inc-live-soft);
  border-color: color-mix(in srgb, var(--sd-inc-live) 40%, transparent); }
.ium-stamp.hold { color: var(--sd-inc-arc); background: var(--sd-inc-arc-soft);
  border-color: color-mix(in srgb, var(--sd-inc-arc) 40%, transparent); }
.ium-stamp.dead { color: var(--sd-inc-arc); }
.ium-actions { display: flex; gap: 9px; }
.ium-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 15px; border-radius: 11px;
  cursor: pointer; font-size: 12.5px; font-weight: 800; border: 1px solid transparent; font-family: inherit; }
.ium-btn.ghost { color: var(--sd-text-secondary); background: var(--sd-surface); border-color: var(--sd-border); }
.ium-btn.primary { color: #1a1206; background: var(--sd-inc-grad); box-shadow: 0 8px 20px var(--sd-inc-soft); }
.ium-btn:disabled { opacity: 0.55; cursor: default; }
.ium-spin { animation: sd-spin-slow 1s linear infinite; }

.rise-enter-active, .rise-leave-active { transition: opacity 0.28s ease, transform 0.28s var(--sd-spring); }
.rise-enter-from, .rise-leave-to { opacity: 0; transform: translateY(6px); }

@media (max-width: 820px) {
  .ium { padding: 20px 16px 14px; }
  .ium-grid { grid-template-columns: 1fr; }
  .ium-rail { flex-direction: column-reverse; }
  .log-list { max-height: 180px; }
  .ph-track { grid-template-columns: repeat(2, 1fr); }
  .ph-line { display: none; }
}

/* ═════ LIGHT THEME OVERRIDES ═════ */
[data-theme="light"] .ium { background: linear-gradient(180deg, rgba(255, 250, 240, 0.92), rgba(255, 250, 240, 0.85)); }
[data-theme="light"] .ium-btn.primary { color: #fff8ec; }
[data-theme="light"] .rchip.on { color: #fff8ec; }
[data-theme="light"] .ph-tick { color: #fff8ec; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .ium-spin,
  html:not([data-cinematic="on"]) .sig-ring,
  html:not([data-cinematic="on"]) .dial-over,
  html:not([data-cinematic="on"]) .dial-ghost,
  html:not([data-cinematic="on"]) .log-skel { animation: none !important; }
}
</style>
