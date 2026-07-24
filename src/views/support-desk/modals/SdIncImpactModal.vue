<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" class="iim-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.22 }"
        @mousedown.self="!busy && $emit('close')">
        <Motion class="iim" role="dialog" aria-modal="true" aria-label="Incident impact assessment"
          :initial="{ opacity: 0, y: 30, scale: 0.955 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18, scale: 0.98 }" :transition="{ duration: 0.46, ease: [0.16, 1, 0.3, 1] }">
          <span class="iim-accent" aria-hidden="true" />
          <button class="iim-x" :disabled="busy" aria-label="Close" @click="$emit('close')"><X :size="17" /></button>

          <!-- ░░ HEADER ░░ -->
          <header class="iim-head">
            <p class="iim-eyebrow sd-mono"><Target :size="11" /> IMPACT ASSESSMENT · BLAST RADIUS</p>
            <div class="iim-tr">
              <h2 class="iim-title">Blast radius — <em>{{ ticket?.ticket_number }}</em></h2>
              <SdIncSevBadge :sev="sev" />
              <span v-if="ticket?.is_major_incident" class="iim-mi sd-mono">MAJOR</span>
              <span class="iim-st sd-mono" :class="{ dead: merged }">{{ statusLabel }}</span>
            </div>
            <p v-if="ticket?.subject" class="iim-subj">{{ ticket.subject }}</p>
            <p class="iim-sub">What's hit, since when, and what it exposes. First stamps are free —
              <b>revising a number already on record asks for a reason</b>, and the diff lands on the timeline.</p>
          </header>

          <div class="iim-scroll">
            <!-- merged plate: assessment moves to the surviving incident -->
            <Motion v-if="merged" class="iim-seal"
              :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(0)">
              <span class="seal-ring"><GitMerge :size="22" /></span>
              <p class="seal-t sd-mono">ASSESSMENT SEALED</p>
              <p class="seal-d">This ticket was merged — record impact on the surviving incident.
                The stamps below remain part of the permanent record.</p>
            </Motion>

            <div class="iim-grid">
              <!-- ░░ LEFT — THE COMPOSER ░░ -->
              <div class="iim-main">
                <template v-if="!merged">
                  <!-- §0 SIGNATURE -->
                  <Motion as="section" class="iim-sig" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(0)">
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
                      <em class="sd-mono">STAMP {{ stampNo != null ? '№ ' + stampNo : '№ —' }}</em>
                    </span>
                  </Motion>

                  <!-- refinement ribbon: terminal incidents stay editable BY DESIGN -->
                  <Motion v-if="terminal" as="p" class="iim-wire refine"
                    :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :transition="fT(1)">
                    <FileSearch :size="12" /> This incident is {{ statusLabel }} — you're refining
                    <b>post-incident numbers</b> for the review, not working a live fault.
                  </Motion>
                  <!-- witness wire: exposure declarations ping the commander -->
                  <Motion as="p" class="iim-wire" :class="{ warn: !ticket?.incident_commander_id }"
                    :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :transition="fT(1)">
                    <component :is="ticket?.incident_commander_id ? Radio : TriangleAlert" :size="12" />
                    <template v-if="ticket?.incident_commander_id">Declaring new <b>exposure</b>
                      (security · compliance · public) notifies the incident commander the moment it lands.</template>
                    <template v-else>No commander staffed — exposure declarations will land <b>unwitnessed</b>.</template>
                  </Motion>

                  <!-- §1 AFFECTED SERVICES -->
                  <Motion as="section" class="iim-f" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(2)">
                    <label class="iim-k">Affected services / systems
                      <span class="cnt sd-mono" :class="{ hot: form.affected_services.length >= 18 }">{{ form.affected_services.length }}/20</span>
                    </label>
                    <div class="svc-input" @click="svcEl?.focus()">
                      <TransitionGroup name="svc-pop">
                        <span v-for="s in form.affected_services" :key="s" class="svc-tag">
                          {{ s }} <button type="button" :aria-label="`Remove ${s}`" @click.stop="removeSvc(s)"><X :size="10" /></button>
                        </span>
                      </TransitionGroup>
                      <input ref="svcEl" v-model="svcDraft" type="text" maxlength="120"
                        :placeholder="form.affected_services.length ? '' : 'ERP · Email · VPN · Database…'"
                        @keydown.enter.prevent="addSvc" @keydown.,.prevent="addSvc" @blur="addSvc" />
                    </div>
                  </Motion>

                  <!-- §2 REACH -->
                  <Motion as="section" class="iim-f two" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(3)">
                    <div>
                      <label class="iim-k">Affected users
                        <i v-if="usersEcho">≈ {{ usersEcho }}</i></label>
                      <input v-model.number="form.affected_users" type="number" min="0" max="100000000"
                        class="iim-in" placeholder="e.g. 240" />
                    </div>
                    <div>
                      <label class="iim-k">Revenue impact <i>free text</i></label>
                      <input v-model="form.revenue_impact" type="text" maxlength="160" class="iim-in"
                        placeholder="e.g. checkout down ≈ ₹2L/hr" />
                    </div>
                  </Motion>

                  <!-- §3 BUSINESS IMPACT -->
                  <Motion as="section" class="iim-f" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(4)">
                    <label class="iim-k">Business impact</label>
                    <div class="iim-seg">
                      <Motion v-for="b in BUSINESS_IMPACTS" :key="b.value" as="button" type="button" class="seg"
                        :class="[`t-${b.value}`, { on: form.business_impact === b.value }]"
                        :while-tap="{ scale: 0.96 }"
                        @click="form.business_impact = form.business_impact === b.value ? '' : b.value">
                        {{ b.label }}
                        <Motion v-if="form.business_impact === b.value" class="seg-tick"
                          :initial="{ scale: 0, rotate: -30 }" :animate="{ scale: 1, rotate: 0 }"
                          :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }"><Check :size="10" /></Motion>
                      </Motion>
                    </div>
                  </Motion>

                  <!-- §4 EXPOSURE -->
                  <Motion as="section" class="iim-f" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(5)">
                    <label class="iim-k">Exposure <i>each declaration is command-relevant</i></label>
                    <div class="iim-flags">
                      <button v-for="fl in FLAGS" :key="fl.field" type="button" class="flag"
                        :class="[fl.tone, { on: form[fl.field] }]" @click="form[fl.field] = !form[fl.field]">
                        <component :is="fl.icon" :size="13" /> {{ fl.label }}
                        <i class="flag-led" />
                      </button>
                    </div>
                  </Motion>

                  <!-- §5 CLOCKS — the house calendar + a time dial per clock -->
                  <Motion as="section" class="iim-f two" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(6)">
                    <div>
                      <label class="iim-k">Disruption started <i>can predate the ticket</i></label>
                      <div class="clk">
                        <SdDatePicker v-model="clocks.started_d" :max="todayIso" placeholder="dd / mm / yyyy" />
                        <input v-model="clocks.started_t" type="time" class="iim-in tm" :disabled="!clocks.started_d" />
                      </div>
                    </div>
                    <div>
                      <label class="iim-k">Detected <i v-if="lagLabel" class="lag">{{ lagLabel }}</i></label>
                      <div class="clk">
                        <SdDatePicker v-model="clocks.detected_d" :min="clocks.started_d || ''" :max="todayIso" placeholder="dd / mm / yyyy" />
                        <input v-model="clocks.detected_t" type="time" class="iim-in tm" :disabled="!clocks.detected_d" />
                      </div>
                    </div>
                  </Motion>
                  <Transition name="rise">
                    <p v-if="clockError" class="iim-clkerr"><TriangleAlert :size="12" /> {{ clockError }}</p>
                  </Transition>
                  <p v-if="startedVsTicket" class="iim-clkhint sd-mono">{{ startedVsTicket }}</p>

                  <!-- §6 REVISION REASON — drop-gate mirrors the backend 422 -->
                  <div class="iim-reason" :class="{ open: needsReason }" :aria-hidden="!needsReason">
                    <div class="reason-clip">
                      <div class="reason-inner">
                        <p class="reason-k sd-mono"><FileSignature :size="12" /> REVISION REASON
                          <em class="req">required — {{ revisedLabel }} already on record</em></p>
                        <div class="reason-chips">
                          <button v-for="c in REASONS" :key="c" type="button" class="rchip"
                            :class="{ on: reason === c }" @click="reason = reason === c ? '' : c">{{ c }}</button>
                        </div>
                        <textarea v-model="reason" class="reason-ta" rows="2" maxlength="500"
                          placeholder="Why the numbers moved — better telemetry, scope change, PIR correction…" />
                      </div>
                    </div>
                  </div>
                </template>
              </div>

              <!-- ░░ RIGHT — RADIUS PLOT + ASSESSMENT LOG ░░ -->
              <aside class="iim-rail">
                <Motion class="rp-card" :initial="{ opacity: 0, x: 14 }" :animate="{ opacity: 1, x: 0 }" :transition="fT(1)">
                  <p class="rail-k sd-mono">RADIUS PLOT <em>· LIVE</em></p>
                  <svg class="rp" viewBox="0 0 200 200" aria-hidden="true">
                    <circle class="rp-grid" cx="100" cy="100" r="30" />
                    <circle class="rp-grid" cx="100" cy="100" r="52" />
                    <circle class="rp-grid" cx="100" cy="100" r="74" />
                    <line class="rp-grid" x1="100" y1="10" x2="100" y2="190" />
                    <line class="rp-grid" x1="10" y1="100" x2="190" y2="100" />
                    <!-- users reach arc (log scale) -->
                    <circle class="rp-arc" cx="100" cy="100" r="52" pathLength="100"
                      :stroke-dasharray="`${usersArc} ${100 - usersArc}`" :class="toneClass" />
                    <!-- service dots on the inner ring -->
                    <circle v-for="(d, i) in svcDots" :key="`s${i}`" class="rp-svc" :cx="d.x" :cy="d.y" r="3"
                      :style="{ transitionDelay: `${i * 40}ms` }" />
                    <!-- exposure markers on the outer ring -->
                    <g v-for="m in expoMarks" :key="m.key">
                      <circle class="rp-expo" :class="[m.tone, { lit: form[m.key] }]" :cx="m.x" :cy="m.y" r="5" />
                    </g>
                    <circle class="rp-core" :class="toneClass" cx="100" cy="100" r="6" />
                    <circle class="rp-pulse" :class="toneClass" cx="100" cy="100" r="6" />
                  </svg>
                  <div class="rp-read">
                    <p><b>{{ form.affected_services.length || '—' }}</b><span>services</span></p>
                    <p><b>{{ usersEcho || '—' }}</b><span>users</span></p>
                    <p><b :class="`bi-${form.business_impact || 'none'}`">{{ biLabel }}</b><span>business</span></p>
                    <p><b>{{ expoCount }}</b><span>exposure</span></p>
                  </div>
                </Motion>

                <Motion class="log-card" :initial="{ opacity: 0, x: 14 }" :animate="{ opacity: 1, x: 0 }" :transition="fT(2)">
                  <p class="rail-k sd-mono">ASSESSMENT LOG <em v-if="history.length">· {{ history.length }}</em></p>
                  <div class="log-list">
                    <template v-if="histState === 'loading'">
                      <span v-for="i in 3" :key="`hs${i}`" class="log-skel" :style="{ '--i': i }" />
                    </template>
                    <template v-else-if="history.length">
                      <Motion v-for="(h, i) in history" :key="h.id || i" class="log-row"
                        :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="rT(i)">
                        <span class="log-t sd-mono">{{ ago(h.at) }}</span>
                        <div class="log-body">
                          <p class="log-actor"><b>{{ h.actor }}</b></p>
                          <p v-for="(d, j) in h.diffs" :key="j" class="log-diff">
                            <em class="sd-mono">{{ d.label }}</em>
                            <template v-if="d.from !== null"><s>{{ d.from }}</s> → </template><b>{{ d.to }}</b>
                          </p>
                          <p v-if="h.note" class="log-note">“{{ h.note }}”</p>
                        </div>
                      </Motion>
                    </template>
                    <p v-else-if="histState === 'ready'" class="log-empty">First assessment — nothing stamped yet.</p>
                    <p v-else class="log-empty">Couldn't load the log.</p>
                  </div>
                </Motion>
              </aside>
            </div>
          </div>

          <div class="iim-foot">
            <span class="iim-stamp" :class="stampTone">
              <component :is="merged ? GitMerge : (!dirty ? Target : (canSave ? Check : FileSignature))" :size="13" />
              {{ stampText }}
            </span>
            <div class="iim-actions">
              <button type="button" class="iim-btn ghost" :disabled="busy" @click="$emit('close')">Cancel</button>
              <Motion as="button" type="button" class="iim-btn primary" :disabled="!canSave || busy"
                :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }" @click="save">
                <Loader v-if="busy" :size="14" class="iim-spin" /><Target v-else :size="14" />
                Stamp impact
              </Motion>
            </div>
          </div>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
/* SdIncImpactModal — "THE BLAST RADIUS" console. PATCH /tickets/{id}/incident-impact
   with a MINIMAL diff payload: affected services, reach (users/revenue), business-impact
   scale, exposure flags, and the started/detected clocks (SdDatePicker — the house
   calendar in the desk's skin — + a time dial). First stamps are free; REVISING a value already on record
   opens the reason gate (mirrors the backend 422). The rail shows a live radius-plot
   instrument and the per-ticket assessment log (before→after diffs + notes) from
   `incident_impact_set` activity. Merged tickets get a sealed plate; terminal ones get
   a "post-incident refinement" ribbon (editing stays allowed BY DESIGN — PIR refines). */
import { reactive, ref, computed, watch, onBeforeUnmount } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  X, Loader, Target, Scale, ShieldAlert, Globe, Check, TriangleAlert, Radio,
  FileSignature, FileSearch, GitMerge,
} from 'lucide-vue-next'
import SdDatePicker from '../components/SdDatePicker.vue'
import SdIncSevBadge from '../components/SdIncSevBadge.vue'
import {
  setIncidentImpact, listTicketActivities, fetchMe, sevOf, BUSINESS_IMPACTS,
} from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  ticket: { type: Object, default: null },
})
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const FLAGS = [
  { field: 'security_impact', label: 'Security', icon: ShieldAlert, tone: 'arc' },
  { field: 'compliance_impact', label: 'Compliance', icon: Scale, tone: 'warn' },
  { field: 'public_impact', label: 'Public', icon: Globe, tone: 'amber' },
]
const REASONS = ['PIR refinement', 'Better telemetry', 'Scope grew', 'Scope shrank', 'Correction']
const LABELS = {
  affected_services: 'Services', affected_users: 'Users', revenue_impact: 'Revenue',
  business_impact: 'Business', compliance_impact: 'Compliance', security_impact: 'Security',
  public_impact: 'Public', incident_started_at: 'Started', incident_detected_at: 'Detected',
}
const fT = (i) => ({ duration: 0.4, delay: 0.05 + i * 0.06, ease: [0.16, 1, 0.3, 1] })
const rT = (i) => ({ duration: 0.3, delay: Math.min(i, 10) * 0.04, ease: [0.16, 1, 0.3, 1] })

/* ── state ── */
const form = reactive({
  affected_services: [], affected_users: null, revenue_impact: '', business_impact: '',
  compliance_impact: false, security_impact: false, public_impact: false,
})
const clocks = reactive({ started_d: '', started_t: '', detected_d: '', detected_t: '' })
const reason = ref('')
const svcDraft = ref('')
const svcEl = ref(null)
const busy = ref(false)
const me = ref(null)
const history = ref([])
const histState = ref('idle')
const nowTick = ref(0)
let clockTimer = null
let fetchSeq = 0
let base = {}

/* ── time helpers (backend timestamps can arrive naive UTC — pin the zone) ── */
const asUtc = (iso) => new Date(/Z$|[+-]\d\d:?\d\d$/.test(String(iso)) ? iso : String(iso).replace(' ', 'T') + 'Z')
const pad = (n) => String(n).padStart(2, '0')
const splitLocal = (iso) => {
  if (!iso) return { d: '', t: '' }
  const dt = asUtc(iso)
  if (Number.isNaN(dt.getTime())) return { d: '', t: '' }
  return { d: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`,
           t: `${pad(dt.getHours())}:${pad(dt.getMinutes())}` }
}
const joinLocal = (d, t) => (d ? new Date(`${d}T${t || '00:00'}`) : null)
const todayIso = (() => { const n = new Date(); return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}` })()
const ago = (iso) => {
  if (!iso) return '—'
  const s = Math.max(0, (nowTick.value - asUtc(iso).getTime()) / 1000)
  if (s < 90) return 'just now'
  if (s < 5400) return `${Math.round(s / 60)}m`
  if (s < 129600) return `${Math.round(s / 3600)}h`
  return `${Math.round(s / 86400)}d`
}

/* ── hydrate on open ── */
watch(() => props.open, (v) => {
  if (v && props.ticket) {
    const t = props.ticket
    form.affected_services = [...(t.affected_services || [])]
    form.affected_users = t.affected_users ?? null
    form.revenue_impact = t.revenue_impact || ''
    form.business_impact = t.business_impact || ''
    form.compliance_impact = !!t.compliance_impact
    form.security_impact = !!t.security_impact
    form.public_impact = !!t.public_impact
    const st = splitLocal(t.incident_started_at); clocks.started_d = st.d; clocks.started_t = st.t
    const de = splitLocal(t.incident_detected_at); clocks.detected_d = de.d; clocks.detected_t = de.t
    svcDraft.value = ''; reason.value = ''
    base = snapshot()
    me.value = null
    fetchMe().then((u) => { me.value = u })
    loadHistory()
    nowTick.value = Date.now()
    clockTimer = setInterval(() => { nowTick.value = Date.now() }, 1000)
    window.addEventListener('keydown', onKey)
  } else {
    fetchSeq++
    if (clockTimer) { clearInterval(clockTimer); clockTimer = null }
    window.removeEventListener('keydown', onKey)
  }
})
const onKey = (e) => { if (e.key === 'Escape' && props.open && !busy.value) emit('close') }
onBeforeUnmount(() => { if (clockTimer) clearInterval(clockTimer); window.removeEventListener('keydown', onKey) })

/* ── the diff engine — one snapshot shape for baseline + current ── */
const snapshot = () => ({
  affected_services: [...form.affected_services],
  affected_users: (form.affected_users === '' || form.affected_users == null) ? null
    : Math.max(0, Math.min(100_000_000, Math.round(Number(form.affected_users) || 0))),
  revenue_impact: form.revenue_impact.trim() || null,
  business_impact: form.business_impact || null,
  compliance_impact: form.compliance_impact,
  security_impact: form.security_impact,
  public_impact: form.public_impact,
  incident_started_at: joinLocal(clocks.started_d, clocks.started_t)?.toISOString() || null,
  incident_detected_at: joinLocal(clocks.detected_d, clocks.detected_t)?.toISOString() || null,
})
const changedFields = computed(() => {
  const cur = snapshot()
  return Object.keys(cur).filter((k) => JSON.stringify(cur[k]) !== JSON.stringify(base[k]))
})
const dirty = computed(() => changedFields.value.length > 0)
const isStamped = (v) => !(v == null || v === false || v === '' || (Array.isArray(v) && !v.length))
const revised = computed(() => changedFields.value.filter((k) => isStamped(base[k])))
const needsReason = computed(() => revised.value.length > 0)
const revisedLabel = computed(() => revised.value.map((k) => LABELS[k] || k).join(' · '))

/* ── clock discipline (mirrors the backend 422s so they never fire) ── */
const startedAt = computed(() => joinLocal(clocks.started_d, clocks.started_t))
const detectedAt = computed(() => joinLocal(clocks.detected_d, clocks.detected_t))
const clockError = computed(() => {
  void nowTick.value
  if (startedAt.value && detectedAt.value && detectedAt.value < startedAt.value)
    return "Detected time can't be before the disruption started."
  const horizon = Date.now() + 5 * 60000
  if (startedAt.value && startedAt.value.getTime() > horizon) return "The start clock can't be in the future."
  if (detectedAt.value && detectedAt.value.getTime() > horizon) return "The detection clock can't be in the future."
  return ''
})
const lagLabel = computed(() => {
  if (!startedAt.value || !detectedAt.value || detectedAt.value < startedAt.value) return ''
  const m = Math.round((detectedAt.value - startedAt.value) / 60000)
  if (m < 1) return 'detected instantly'
  if (m < 90) return `detected ${m}m after start`
  if (m < 2880) return `detected ${Math.round(m / 60)}h after start`
  return `detected ${Math.round(m / 1440)}d after start`
})
const startedVsTicket = computed(() => {
  if (!startedAt.value || !props.ticket?.created_at) return ''
  const m = Math.round((asUtc(props.ticket.created_at).getTime() - startedAt.value.getTime()) / 60000)
  if (m <= 0) return ''
  if (m < 90) return `RUNNING ${m}M BEFORE THE TICKET WAS RAISED`
  if (m < 2880) return `RUNNING ${Math.round(m / 60)}H BEFORE THE TICKET WAS RAISED`
  return `RUNNING ${Math.round(m / 1440)}D BEFORE THE TICKET WAS RAISED`
})

/* ── header / gates ── */
const sev = computed(() => props.ticket?.sev ?? sevOf(props.ticket))
const statusLabel = computed(() => String(props.ticket?.status || '').replace(/_/g, ' ') || '—')
const merged = computed(() => !!props.ticket?.merged_into_id)
const terminal = computed(() => ['resolved', 'closed', 'archived'].includes(String(props.ticket?.status || '')))
const canSave = computed(() => !merged.value && dirty.value && !clockError.value
  && (!needsReason.value || reason.value.trim().length >= 3))
const stampText = computed(() => {
  if (merged.value) return 'SEALED — MERGED'
  if (!dirty.value) return 'NO CHANGES'
  if (clockError.value) return 'FIX THE CLOCKS'
  if (!canSave.value) return `${revised.value.length} REVISION${revised.value.length > 1 ? 'S' : ''} — REASON REQUIRED`
  const n = changedFields.value.length
  const r = revised.value.length
  return `${n} FIELD${n > 1 ? 'S' : ''}${r ? ` · ${r} REVISED` : ' · FIRST STAMP'}`
})
const stampTone = computed(() => merged.value ? 'dead'
  : (dirty.value && canSave.value) ? 'ready' : dirty.value ? 'hold' : '')

/* ── signature ── */
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
const stampNo = computed(() => (histState.value === 'ready' ? history.value.length + 1 : null))

/* ── services chips ── */
const addSvc = () => {
  const v = svcDraft.value.trim().replace(/,$/, '')
  if (!v) return
  if (!form.affected_services.some((s) => s.toLowerCase() === v.toLowerCase())
      && form.affected_services.length < 20) form.affected_services.push(v)
  svcDraft.value = ''
}
const removeSvc = (s) => { form.affected_services = form.affected_services.filter((x) => x !== s) }

/* ── the radius plot ── */
const usersEcho = computed(() => {
  const n = Number(form.affected_users)
  if (!Number.isFinite(n) || n <= 0) return ''
  if (n >= 1e6) return `${(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 ? 1 : 0)}k`
  return String(Math.round(n))
})
const usersArc = computed(() => {
  const n = Number(form.affected_users)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.min(100, Math.round((Math.log10(n + 1) / 8) * 100))   // log scale to 10^8
})
const svcDots = computed(() => Array.from({ length: Math.min(form.affected_services.length, 12) }, (_, i) => {
  const a = (i / 12) * Math.PI * 2 - Math.PI / 2
  return { x: +(100 + 30 * Math.cos(a)).toFixed(1), y: +(100 + 30 * Math.sin(a)).toFixed(1) }
}))
const expoMarks = FLAGS.map((f, i) => {
  const a = (i / 3) * Math.PI * 2 - Math.PI / 2
  return { key: f.field, tone: f.tone, x: +(100 + 74 * Math.cos(a)).toFixed(1), y: +(100 + 74 * Math.sin(a)).toFixed(1) }
})
const toneClass = computed(() => `bi-${form.business_impact || 'none'}`)
const biLabel = computed(() => (BUSINESS_IMPACTS.find((b) => b.value === form.business_impact)?.label || '—'))
const expoCount = computed(() => FLAGS.filter((f) => form[f.field]).length || '—')

/* ── assessment log (sealed reuse of the activities read) ── */
const fmtVal = (k, v) => {
  if (v == null || v === '') return null
  if (k === 'incident_started_at' || k === 'incident_detected_at') {
    const d = asUtc(v)
    return Number.isNaN(d.getTime()) ? String(v)
      : `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  if (Array.isArray(v)) return v.length ? v.join(', ') : null
  if (typeof v === 'boolean' || v === 'True' || v === 'False')
    return (v === true || v === 'True') ? 'ON' : 'OFF'
  return String(v)
}
const loadHistory = async () => {
  const t = props.ticket
  if (!t?.id) { histState.value = 'ready'; history.value = []; return }
  const seq = ++fetchSeq
  histState.value = 'loading'
  try {
    const rows = await listTicketActivities(t.id)
    if (seq !== fetchSeq) return
    history.value = (rows || [])
      .filter((r) => r.action === 'incident_impact_set')
      .map((r) => {
        const ch = r.detail?.changes
        const diffs = ch
          ? Object.entries(ch).map(([k, d]) => ({
              label: LABELS[k] || k, from: fmtVal(k, d?.from), to: fmtVal(k, d?.to) ?? '—' }))
          : (r.detail?.fields || []).map((k) => ({ label: LABELS[k] || k, from: null, to: 'stamped' }))
        return { id: r.id, at: r.created_at, actor: r.actor_name || 'System',
                 diffs, note: r.detail?.note || null }
      })
      .reverse()   // newest first
    histState.value = 'ready'
  } catch { if (seq === fetchSeq) histState.value = 'error' }
}

/* ── save: MINIMAL diff payload ── */
const save = async () => {
  if (!props.ticket || !canSave.value || busy.value) return
  busy.value = true
  try {
    const cur = snapshot()
    const payload = {}
    for (const k of changedFields.value) payload[k] = cur[k]
    if (reason.value.trim()) payload.note = reason.value.trim()
    await setIncidentImpact(props.ticket.id, payload)
    toast.success(revised.value.length
      ? `Assessment revised — ${revised.value.length} correction${revised.value.length > 1 ? 's' : ''} logged`
      : 'Impact assessment stamped')
    emit('done')
    emit('close')
  } catch (e) {
    const d = e?.response?.data?.detail
    toast.error(Array.isArray(d) ? (d[0]?.msg || 'Validation failed') : (d || 'Could not stamp the impact'))
  } finally { busy.value = false }
}
</script>

<style scoped>
.iim-overlay { position: fixed; inset: 0; z-index: 2700; display: grid; place-items: center;
  padding: 20px; background: rgba(5, 4, 2, 0.6); backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px); }
.iim { position: relative; width: min(920px, 96vw); max-height: 92vh; display: flex; flex-direction: column;
  border-radius: 20px; padding: 24px 24px 18px; overflow: hidden;
  background: linear-gradient(180deg, var(--sd-surface-elevated), var(--sd-surface));
  border: 1px solid var(--sd-inc-brd); box-shadow: var(--sd-shadow-hover); }
.iim-accent { position: absolute; inset: 0 0 auto 0; height: 3px; background: var(--sd-inc-grad); }
.iim-x { position: absolute; top: 14px; right: 14px; z-index: 2; display: grid; place-items: center; width: 30px;
  height: 30px; border-radius: 10px; cursor: pointer; background: var(--sd-surface);
  border: 1px solid var(--sd-border); color: var(--sd-text-muted); }

.iim-head { margin-bottom: 14px; }
.iim-eyebrow { display: flex; align-items: center; gap: 6px; margin: 0 0 6px; font-size: 9.5px;
  letter-spacing: 0.18em; color: var(--sd-inc-core); }
.iim-tr { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.iim-title { margin: 0; font-size: 20px; font-weight: 800; color: var(--sd-text); }
.iim-title em { font-style: normal; background: var(--sd-inc-grad); -webkit-background-clip: text;
  background-clip: text; color: transparent; }
.iim-mi { padding: 2px 8px; border-radius: 8px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.12em;
  color: var(--sd-inc-arc); background: var(--sd-inc-arc-soft);
  border: 1px solid color-mix(in srgb, var(--sd-inc-arc) 40%, transparent); }
.iim-st { padding: 2px 8px; border-radius: 8px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--sd-text-muted); background: var(--sd-inc-dim-soft);
  border: 1px solid var(--sd-border); }
.iim-st.dead { color: var(--sd-inc-arc); }
.iim-subj { margin: 5px 0 0; font-size: 12.5px; font-weight: 650; color: var(--sd-text-secondary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.iim-sub { margin: 4px 0 0; font-size: 12px; line-height: 1.55; color: var(--sd-text-secondary); }
.iim-sub b { color: var(--sd-text); }

.iim-scroll { overflow-y: auto; padding-right: 2px; }
.iim-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(250px, 1fr); gap: 14px; }
.iim-main { display: flex; flex-direction: column; gap: 13px; min-width: 0; }

/* seal plate (merged) */
.iim-seal { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 20px;
  margin-bottom: 12px; text-align: center; border-radius: 16px;
  background: color-mix(in srgb, var(--sd-inc-dim-soft) 70%, transparent); border: 1px dashed var(--sd-border); }
.seal-ring { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 50%;
  color: var(--sd-text-muted); background: var(--sd-surface); border: 1px solid var(--sd-border); }
.seal-t { margin: 2px 0 0; font-size: 10px; font-weight: 800; letter-spacing: 0.16em; color: var(--sd-text); }
.seal-d { margin: 0; max-width: 460px; font-size: 11.5px; line-height: 1.55; color: var(--sd-text-secondary); }

/* signature */
.iim-sig { display: flex; align-items: center; gap: 11px; padding: 10px 12px; border-radius: 14px;
  background: var(--sd-surface); border: 1px solid var(--sd-border); }
.sig-av { position: relative; flex-shrink: 0; display: grid; place-items: center; width: 38px; height: 38px; }
.sig-av svg { position: absolute; inset: 0; }
.sig-ring { fill: none; stroke: var(--sd-inc-core); stroke-width: 2; stroke-dasharray: 100;
  stroke-dashoffset: 100; stroke-linecap: round; transform: rotate(-90deg); transform-origin: center;
  animation: iim-sigring 1s var(--sd-spring) 0.2s forwards; }
@keyframes iim-sigring { to { stroke-dashoffset: 0; } }
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

/* wires */
.iim-wire { display: flex; align-items: flex-start; gap: 7px; margin: 0; padding: 8px 11px;
  border-radius: 11px; font-size: 11px; font-weight: 600; line-height: 1.45; color: var(--sd-text-secondary);
  background: color-mix(in srgb, var(--sd-inc-soft) 45%, transparent);
  border: 1px solid var(--sd-inc-brd); }
.iim-wire svg { flex-shrink: 0; margin-top: 1px; color: var(--sd-inc-core); }
.iim-wire b { color: var(--sd-text); }
.iim-wire.warn { background: var(--sd-inc-warn-soft);
  border-color: color-mix(in srgb, var(--sd-inc-warn) 35%, transparent); }
.iim-wire.warn svg { color: var(--sd-inc-warn); }
.iim-wire.refine { background: var(--sd-inc-warn-soft);
  border-color: color-mix(in srgb, var(--sd-inc-warn) 30%, transparent); }
.iim-wire.refine svg { color: var(--sd-inc-warn); }

/* fields */
.iim-f { display: flex; flex-direction: column; gap: 7px; }
.iim-f.two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.iim-f.two > div { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
.iim-k { display: flex; align-items: baseline; gap: 7px; font-size: 11.5px; font-weight: 800;
  letter-spacing: 0.03em; color: var(--sd-text); }
.iim-k i { font-style: normal; font-weight: 600; color: var(--sd-text-muted); }
.iim-k i.lag { color: var(--sd-inc-core); }
.iim-k .cnt { margin-left: auto; }
.cnt { font-size: 9px; font-weight: 700; color: var(--sd-text-muted); }
.cnt.hot { color: var(--sd-inc-warn); }
.iim-in { width: 100%; padding: 9px 12px; border-radius: 11px; font: inherit; font-size: 12.5px;
  color: var(--sd-text); background: var(--sd-surface); border: 1px solid var(--sd-border); outline: none;
  color-scheme: dark; }
.iim-in:focus { border-color: var(--sd-inc-brd); box-shadow: 0 0 0 3px var(--sd-inc-soft); }
.iim-in:disabled { opacity: 0.45; }

.svc-input { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; min-height: 42px;
  padding: 7px 10px; border-radius: 12px; cursor: text;
  background: var(--sd-surface); border: 1px solid var(--sd-border); }
.svc-input:focus-within { border-color: var(--sd-inc-brd); box-shadow: 0 0 0 3px var(--sd-inc-soft); }
.svc-input input { flex: 1; min-width: 120px; background: none; border: 0; outline: 0;
  color: var(--sd-text); font-size: 12.5px; font-family: inherit; }
.svc-tag { display: inline-flex; align-items: center; gap: 5px; padding: 4px 6px 4px 10px;
  border-radius: 16px; font-size: 11px; font-weight: 700; color: var(--sd-inc-core);
  background: var(--sd-inc-soft); border: 1px solid var(--sd-inc-brd); }
.svc-tag button { display: grid; place-items: center; width: 16px; height: 16px; border-radius: 50%;
  border: 0; cursor: pointer; color: inherit; background: transparent; }
.svc-tag button:hover { background: var(--sd-inc-arc-soft); color: var(--sd-inc-arc); }
.svc-pop-enter-active { transition: all 0.28s var(--sd-spring); }
.svc-pop-enter-from { opacity: 0; transform: scale(0.7); }
.svc-pop-leave-active { transition: all 0.18s ease; }
.svc-pop-leave-to { opacity: 0; transform: scale(0.7); }

.iim-seg { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.seg { position: relative; padding: 8px 6px; border-radius: 11px; cursor: pointer; font-size: 11.5px;
  font-weight: 800; color: var(--sd-text-secondary); background: var(--sd-surface);
  border: 1px solid var(--sd-border); transition: all 0.2s var(--sd-spring); }
.seg:hover { border-color: var(--sd-inc-brd); }
.seg-tick { position: absolute; top: -5px; right: -5px; display: grid; place-items: center; width: 15px;
  height: 15px; border-radius: 50%; color: #1a1206; background: currentColor; }
.seg-tick :deep(svg) { color: var(--sd-surface); }
.seg.on.t-low { color: var(--sd-inc-live); border-color: var(--sd-inc-live); background: var(--sd-inc-live-soft); }
.seg.on.t-medium { color: var(--sd-inc-warn); border-color: var(--sd-inc-warn); background: var(--sd-inc-warn-soft); }
.seg.on.t-high { color: var(--sd-inc-core); border-color: var(--sd-inc-core); background: var(--sd-inc-soft); }
.seg.on.t-critical { color: var(--sd-inc-arc); border-color: var(--sd-inc-arc); background: var(--sd-inc-arc-soft); }

.iim-flags { display: flex; gap: 8px; flex-wrap: wrap; }
.flag { position: relative; display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px;
  border-radius: 12px; cursor: pointer; font-size: 12px; font-weight: 700;
  color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border);
  transition: all 0.2s var(--sd-spring); }
.flag:hover { border-color: var(--sd-inc-brd); }
.flag-led { width: 7px; height: 7px; border-radius: 50%; background: var(--sd-inc-dim-soft);
  border: 1px solid var(--sd-border); transition: all 0.22s var(--sd-spring); }
.flag.on.warn { color: var(--sd-inc-warn); border-color: color-mix(in srgb, var(--sd-inc-warn) 45%, transparent); background: var(--sd-inc-warn-soft); }
.flag.on.arc { color: var(--sd-inc-arc); border-color: color-mix(in srgb, var(--sd-inc-arc) 45%, transparent); background: var(--sd-inc-arc-soft); }
.flag.on.amber { color: var(--sd-inc-core); border-color: var(--sd-inc-brd); background: var(--sd-inc-soft); }
.flag.on .flag-led { background: currentColor; border-color: transparent; box-shadow: 0 0 8px currentColor; }

/* clocks */
.clk { display: grid; grid-template-columns: minmax(0, 1fr) 92px; gap: 7px; align-items: center; }
.iim-in.tm { padding: 8px 9px; font-family: var(--sd-mono); font-size: 11.5px; }
.iim-clkerr { display: flex; align-items: center; gap: 7px; margin: -4px 0 0; padding: 8px 11px;
  border-radius: 11px; font-size: 11px; font-weight: 650; color: var(--sd-inc-arc);
  background: var(--sd-inc-arc-soft);
  border: 1px solid color-mix(in srgb, var(--sd-inc-arc) 35%, transparent); }
.iim-clkhint { margin: -4px 0 0; padding-left: 2px; font-size: 8.5px; font-weight: 700;
  letter-spacing: 0.1em; color: var(--sd-inc-warn); }

/* revision reason gate */
.iim-reason { display: grid; grid-template-rows: 0fr; opacity: 0;
  transition: grid-template-rows 0.4s var(--sd-spring), opacity 0.3s ease; }
.iim-reason.open { grid-template-rows: 1fr; opacity: 1; }
.reason-clip { overflow: hidden; min-height: 0; }
.reason-inner { display: flex; flex-direction: column; gap: 8px; padding: 12px 13px; border-radius: 14px;
  background: color-mix(in srgb, var(--sd-inc-warn-soft) 60%, transparent);
  border: 1px solid color-mix(in srgb, var(--sd-inc-warn) 30%, transparent); }
.reason-k { display: flex; align-items: center; gap: 6px; margin: 0; font-size: 9px; font-weight: 800;
  letter-spacing: 0.14em; color: var(--sd-inc-warn); }
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
.iim-rail { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.rail-k { margin: 0 0 8px; font-size: 9px; font-weight: 800; letter-spacing: 0.16em;
  color: var(--sd-text-muted); }
.rail-k em { font-style: normal; color: var(--sd-inc-core); }
.rp-card, .log-card { padding: 12px; border-radius: 14px;
  background: color-mix(in srgb, var(--sd-surface) 72%, transparent); border: 1px solid var(--sd-border); }

.rp { display: block; width: 100%; max-width: 210px; margin: 0 auto; }
.rp-grid { fill: none; stroke: var(--sd-inc-grid-line, var(--sd-border)); stroke-width: 1; opacity: 0.55; }
.rp-arc { fill: none; stroke-width: 4; stroke-linecap: round; transform: rotate(-90deg);
  transform-origin: center; transition: stroke-dasharray 0.7s var(--sd-spring), stroke 0.4s ease; }
.rp-svc { fill: var(--sd-inc-core); opacity: 0.9; transition: all 0.35s var(--sd-spring); }
.rp-expo { fill: var(--sd-inc-dim-soft); stroke: var(--sd-border); stroke-width: 1;
  transition: all 0.3s var(--sd-spring); }
.rp-expo.lit.arc { fill: var(--sd-inc-arc); stroke: transparent; filter: drop-shadow(0 0 5px var(--sd-inc-arc)); }
.rp-expo.lit.warn { fill: var(--sd-inc-warn); stroke: transparent; filter: drop-shadow(0 0 5px var(--sd-inc-warn)); }
.rp-expo.lit.amber { fill: var(--sd-inc-core); stroke: transparent; filter: drop-shadow(0 0 5px var(--sd-inc-core)); }
.rp-core { transition: fill 0.4s ease; }
.rp-pulse { fill: none; stroke-width: 1.5; opacity: 0; animation: iim-pulse 2.6s ease-out infinite; }
@keyframes iim-pulse { 0% { opacity: 0.7; transform: scale(1); } 100% { opacity: 0; transform: scale(6); } }
.rp-pulse, .rp-core { transform-origin: center; }
.bi-none { fill: var(--sd-text-muted); stroke: var(--sd-text-muted); color: var(--sd-text-muted); }
.bi-low { fill: var(--sd-inc-live); stroke: var(--sd-inc-live); color: var(--sd-inc-live); }
.bi-medium { fill: var(--sd-inc-warn); stroke: var(--sd-inc-warn); color: var(--sd-inc-warn); }
.bi-high { fill: var(--sd-inc-core); stroke: var(--sd-inc-core); color: var(--sd-inc-core); }
.bi-critical { fill: var(--sd-inc-arc); stroke: var(--sd-inc-arc); color: var(--sd-inc-arc); }

.rp-read { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 10px; }
.rp-read p { display: flex; flex-direction: column; align-items: center; gap: 1px; margin: 0; }
.rp-read b { font-size: 13px; font-weight: 800; color: var(--sd-text); font-family: var(--sd-mono);
  max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rp-read span { font-size: 8px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--sd-text-muted); }

.log-card { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.log-list { display: flex; flex-direction: column; gap: 9px; overflow-y: auto; max-height: 300px;
  padding-right: 2px; scrollbar-width: thin; }
.log-row { display: flex; align-items: flex-start; gap: 9px; }
.log-t { flex-shrink: 0; width: 44px; padding-top: 1px; font-size: 9px; font-weight: 700;
  letter-spacing: 0.05em; color: var(--sd-text-muted); text-align: right; }
.log-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;
  padding-bottom: 8px; border-bottom: 1px dashed var(--sd-border); }
.log-row:last-child .log-body { border-bottom: 0; }
.log-actor { margin: 0; font-size: 11px; }
.log-actor b { color: var(--sd-text); font-weight: 750; }
.log-diff { margin: 0; font-size: 10.5px; line-height: 1.45; color: var(--sd-text-secondary); }
.log-diff em { font-style: normal; font-size: 8.5px; font-weight: 800; letter-spacing: 0.08em;
  color: var(--sd-inc-core); margin-right: 5px; }
.log-diff s { color: var(--sd-text-muted); }
.log-diff b { color: var(--sd-text); font-weight: 700; }
.log-note { margin: 1px 0 0; font-size: 10.5px; font-style: italic; color: var(--sd-inc-core); }
.log-empty { margin: 0; padding: 10px 2px; font-size: 11px; color: var(--sd-text-muted); }
.log-skel { height: 34px; border-radius: 10px; background: linear-gradient(100deg,
  var(--sd-inc-dim-soft) 40%, color-mix(in srgb, var(--sd-inc-soft) 50%, transparent) 50%,
  var(--sd-inc-dim-soft) 60%); background-size: 220% 100%;
  animation: iim-shimmer 1.3s linear infinite; animation-delay: calc(var(--i) * 0.09s); }
@keyframes iim-shimmer { from { background-position: 130% 0; } to { background-position: -60% 0; } }

/* footer */
.iim-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px;
  margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--sd-border); }
.iim-stamp { display: inline-flex; align-items: center; gap: 6px; padding: 4px 11px; border-radius: 20px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.12em; font-family: var(--sd-mono);
  color: var(--sd-text-muted); background: var(--sd-surface-elevated); border: 1px solid var(--sd-border);
  transition: all 0.25s var(--sd-spring); }
.iim-stamp.ready { color: var(--sd-inc-live); background: var(--sd-inc-live-soft);
  border-color: color-mix(in srgb, var(--sd-inc-live) 40%, transparent); }
.iim-stamp.hold { color: var(--sd-inc-warn); background: var(--sd-inc-warn-soft);
  border-color: color-mix(in srgb, var(--sd-inc-warn) 40%, transparent); }
.iim-stamp.dead { color: var(--sd-inc-arc); }
.iim-actions { display: flex; gap: 9px; }
.iim-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 15px; border-radius: 11px;
  cursor: pointer; font-size: 12.5px; font-weight: 800; border: 1px solid transparent; }
.iim-btn.ghost { color: var(--sd-text-secondary); background: var(--sd-surface); border-color: var(--sd-border); }
.iim-btn.primary { color: #1a1206; background: var(--sd-inc-grad); box-shadow: 0 8px 20px var(--sd-inc-soft); }
.iim-btn:disabled { opacity: 0.55; cursor: default; }
.iim-spin { animation: sd-spin-slow 1s linear infinite; }

.rise-enter-active, .rise-leave-active { transition: opacity 0.28s ease, transform 0.28s var(--sd-spring); }
.rise-enter-from, .rise-leave-to { opacity: 0; transform: translateY(6px); }

@media (max-width: 820px) {
  .iim { padding: 20px 16px 14px; }
  .iim-grid { grid-template-columns: 1fr; }
  .iim-rail { flex-direction: column-reverse; }
  .log-list { max-height: 180px; }
}
@media (max-width: 560px) { .iim-f.two { grid-template-columns: 1fr; } .iim-seg { grid-template-columns: repeat(2, 1fr); } }

/* ═════ LIGHT THEME OVERRIDES ═════ */
[data-theme="light"] .iim { background: linear-gradient(180deg, rgba(255, 250, 240, 0.92), rgba(255, 250, 240, 0.85)); }
[data-theme="light"] .iim-in { color-scheme: light; }
[data-theme="light"] .iim-btn.primary { color: #fff8ec; }
[data-theme="light"] .rchip.on { color: #fff8ec; }
[data-theme="light"] .seg-tick :deep(svg) { color: #fff8ec; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .iim-spin,
  html:not([data-cinematic="on"]) .sig-ring,
  html:not([data-cinematic="on"]) .rp-pulse,
  html:not([data-cinematic="on"]) .log-skel { animation: none !important; }
}
</style>
