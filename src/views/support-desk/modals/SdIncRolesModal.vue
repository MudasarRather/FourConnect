<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" class="irm-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.22 }"
        @mousedown.self="!busy && $emit('close')">
        <Motion class="irm" role="dialog" aria-modal="true" aria-label="Staff the incident response"
          :initial="{ opacity: 0, y: 28, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18, scale: 0.98 }" :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }">
          <span class="irm-accent" aria-hidden="true" />
          <span class="irm-aura" aria-hidden="true" />
          <button class="irm-x" :disabled="busy" aria-label="Close" @click="$emit('close')"><X :size="17" /></button>

          <p class="irm-eyebrow sd-mono">INCIDENT COMMAND · RESPONSE ROSTER</p>
          <h2 class="irm-title">Staff <em>{{ ticket?.ticket_number }}</em></h2>
          <p class="irm-sub">The roster coordinates the response — the assignee keeps working the fault.
            <b v-if="teamName">Pool sealed to {{ teamName }};</b> everyone staffed gets pinged and lands
            on the war-room strip. Replacing a seated responder asks for a handoff reason.</p>

          <div class="irm-scroll">
            <!-- sealed / merged plate: a dead incident has no active response to staff -->
            <Motion v-if="sealed" class="irm-seal"
              :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(0)">
              <span class="seal-ring"><component :is="sealKind === 'merged' ? GitMerge : Lock" :size="22" /></span>
              <p class="seal-t sd-mono">ROSTER SEALED</p>
              <p class="seal-d" v-if="sealKind === 'merged'">
                This ticket was merged — staff the surviving incident instead. The command
                chain below remains part of the permanent record.</p>
              <p class="seal-d" v-else>
                This incident is {{ statusLabel }} — there's no active response to staff.
                Reopen it first if the roster needs to change.</p>
            </Motion>

            <div v-if="!sealed" class="irm-grid">
              <!-- ░░ LEFT — THE COMMAND CHAIN ░░ -->
              <section class="irm-chain" aria-label="Command chain">
                <span class="chain-line" aria-hidden="true"><i class="chain-pulse" /></span>

                <Motion v-for="(r, i) in ROLES" :key="r.field" as="button" type="button" class="seat"
                  :class="[r.tone, { focus: focusSeat === r.field, filled: !!form[r.field], changed: isChanged(r.field) }]"
                  :initial="{ opacity: 0, x: -14 }" :animate="{ opacity: 1, x: 0 }" :transition="fT(i)"
                  :aria-pressed="focusSeat === r.field" @click="focusSeat = r.field">
                  <span class="seat-glyph"><component :is="r.icon" :size="15" /></span>
                  <span class="seat-body">
                    <span class="seat-k">{{ r.label }} <i>{{ r.desc }}</i></span>
                    <Transition name="swap" mode="out-in">
                      <span v-if="form[r.field]" :key="form[r.field]" class="seat-holder">
                        <span class="seat-ava sd-mono">{{ initials(nameOf(form[r.field])) }}</span>
                        <span class="seat-who">
                          <b>{{ nameOf(form[r.field]) }}</b>
                          <small v-if="isChanged(r.field)" class="pend">PENDING — saves on staff</small>
                          <small v-else-if="sinceOf(r.field)">{{ sinceOf(r.field) }}</small>
                          <small v-else>{{ emailOf(form[r.field]) || 'holding the seat' }}</small>
                        </span>
                        <span class="seat-clear" role="button" tabindex="0"
                          :aria-label="`Stand down the ${r.label.toLowerCase()}`"
                          @click.stop="clearSeat(r.field)" @keydown.enter.stop="clearSeat(r.field)">
                          <X :size="12" />
                        </span>
                      </span>
                      <span v-else key="empty" class="seat-empty">
                        <span class="seat-slot sd-mono">UNSTAFFED</span>
                        <span class="seat-cta">pick from the bay <ArrowRight :size="11" /></span>
                      </span>
                    </Transition>
                  </span>
                  <span class="seat-led" :class="{ on: !!form[r.field], pend: isChanged(r.field) }" aria-hidden="true" />
                </Motion>

                <Transition name="rise">
                  <p v-if="dualHat" class="chain-warn"><TriangleAlert :size="12" /> {{ dualHat }}</p>
                </Transition>
              </section>

              <!-- ░░ RIGHT — THE PERSONNEL BAY ░░ -->
              <section class="irm-bay" aria-label="Personnel bay">
                <div class="bay-top">
                  <p class="bay-k sd-mono">PERSONNEL BAY <em v-if="teamName">· {{ teamName.toUpperCase() }}</em></p>
                  <span class="bay-count sd-mono">{{ shownPeople.length }}</span>
                </div>
                <div class="bay-search" :class="{ live: searching }">
                  <Search :size="13" />
                  <input v-model="q" type="text" :placeholder="`Filter the pool — 2+ letters searches the whole directory…`"
                    aria-label="Search people" @keydown.esc.stop="q = ''" />
                  <Loader v-if="searching" :size="12" class="irm-spin" />
                </div>

                <div class="bay-list" role="listbox" :aria-label="`Assign the ${focusLabel}`">
                  <template v-if="loadingPool">
                    <span v-for="i in 4" :key="`sk${i}`" class="bay-skel" :style="{ '--i': i }" />
                  </template>

                  <template v-else-if="shownPeople.length">
                    <Motion v-for="(p, i) in shownPeople" :key="p.id" as="button" type="button" class="crew"
                      :class="{ picked: seatsOf(p.id).length }"
                      :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="rT(i)"
                      :while-hover="{ x: 3 }" :while-tap="{ scale: 0.985 }"
                      :aria-label="`Assign ${p.name} as ${focusLabel}`" @click="assign(p)">
                      <span class="crew-ava sd-mono" :class="{ dim: !p.on_team }">{{ initials(p.name) }}</span>
                      <span class="crew-body">
                        <span class="crew-name">
                          <b>{{ p.name }}</b>
                          <em v-if="p.is_you" class="tag you">YOU</em>
                          <em v-if="p.is_lead" class="tag lead">LEAD</em>
                          <em v-if="p.is_assignee" class="tag">ASSIGNEE</em>
                          <em v-if="!p.on_team" class="tag dir">DIRECTORY</em>
                        </span>
                        <span class="crew-sub">{{ crewSub(p) }}</span>
                      </span>
                      <span class="crew-right">
                        <span v-for="s in seatsOf(p.id)" :key="s" class="crew-seat sd-mono">{{ s }}</span>
                        <span v-if="p.command_load" class="crew-load sd-mono" :class="{ hot: p.command_load >= 2 }"
                          :title="`Already commanding ${p.command_load} live incident${p.command_load > 1 ? 's' : ''}`">
                          <Flame :size="10" /> {{ p.command_load }}
                        </span>
                        <span class="crew-go" aria-hidden="true"><ArrowRight :size="12" /></span>
                      </span>
                    </Motion>
                  </template>

                  <p v-else class="bay-empty">
                    <Users :size="15" />
                    {{ q ? `No one matches “${q}” — type 2+ letters to search the whole directory.`
                         : 'No staffing pool on this fault yet — search the directory above.' }}
                  </p>
                </div>
              </section>
            </div>

            <!-- ░░ HANDOFF REASON (drop-gate — mirrors the backend 422) ░░ -->
            <div v-if="!sealed" class="irm-reason" :class="{ open: needsReason }" :aria-hidden="!needsReason">
              <div class="reason-clip">
                <div class="reason-inner">
                  <p class="reason-k sd-mono"><FileSignature :size="12" /> HANDOFF REASON
                    <em class="req">required — {{ handoffLabel }}</em></p>
                  <div class="reason-chips">
                    <button v-for="c in REASONS" :key="c" type="button" class="rchip"
                      :class="{ on: note === c }" @click="note = note === c ? '' : c">{{ c }}</button>
                  </div>
                  <textarea v-model="note" class="reason-ta" rows="2" maxlength="500"
                    placeholder="Why the baton is passing — shift change, escalation, availability…" />
                </div>
              </div>
            </div>

            <!-- ░░ CHAIN OF COMMAND — the roster's own audit trail ░░ -->
            <section v-if="history.length" class="irm-log">
              <button type="button" class="log-head" @click="logOpen = !logOpen">
                <History :size="12" /> <span class="sd-mono">CHAIN OF COMMAND <em>· {{ history.length }} MOVES</em></span>
                <ChevronDown :size="13" class="log-chev" :class="{ up: logOpen }" />
              </button>
              <div class="log-body" :class="{ open: logOpen }">
                <div class="log-clip">
                  <div class="log-inner">
                    <div v-for="(h, i) in history" :key="i" class="log-row">
                      <span class="log-t sd-mono">{{ agoOf(h.at) }}</span>
                      <span class="log-line"><b>{{ h.actor || 'System' }}</b> — {{ summarize(h.changes) }}
                        <i v-if="h.note" class="log-note">“{{ h.note }}”</i></span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div class="irm-foot">
            <span v-if="sealed" class="irm-stamp"><Lock :size="13" /> ROSTER SEALED</span>
            <span v-else class="irm-stamp" :class="{ ready: dirty && canSave, hold: dirty && !canSave }">
              <UserCog v-if="!dirty" :size="13" /><FileSignature v-else-if="!canSave" :size="13" /><Check v-else :size="13" />
              {{ stampText }}
            </span>
            <div class="irm-actions">
              <button type="button" class="irm-btn ghost" :disabled="busy" @click="$emit('close')">
                {{ sealed ? 'Close' : 'Cancel' }}</button>
              <Motion v-if="!sealed" as="button" type="button" class="irm-btn primary" :disabled="!canSave || busy"
                :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }" @click="save">
                <Loader v-if="busy" :size="14" class="irm-spin" /><Crown v-else :size="14" />
                Staff the response
              </Motion>
            </div>
          </div>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
/* SdIncRolesModal — the "Command Chain" console. Staffs the MI response roster
   (commander / comms lead / ops lead) → PATCH /tickets/{id}/incident-roles.
   Self-hydrates from GET /tickets/{id}/roster-candidates: the handling team's pool
   with directory info + live command load, who holds each seat (and since when),
   and the chain-of-command log. Replacing/standing down a seated holder opens the
   handoff-reason gate (the backend 422s without a note — the UI never lets it).
   The `assignees` prop survives as a fallback pool if the sealed read fails. */
import { reactive, ref, computed, watch, onBeforeUnmount } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  X, Check, Loader, Crown, Megaphone, Wrench, UserCog, Search, ArrowRight,
  Users, Flame, TriangleAlert, FileSignature, History, ChevronDown, Lock, GitMerge,
} from 'lucide-vue-next'
import { setIncidentRoles, fetchRosterCandidates } from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  ticket: { type: Object, default: null },
  assignees: { type: Array, default: () => [] },   // legacy fallback pool [{value,label}]
})
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const ROLES = [
  { field: 'incident_commander_id', label: 'Incident commander', icon: Crown, tone: 'cmd',
    desc: 'owns the response end-to-end' },
  { field: 'comms_lead_id', label: 'Comms lead', icon: Megaphone, tone: 'comms',
    desc: 'owns stakeholder updates & the cadence' },
  { field: 'ops_lead_id', label: 'Ops lead', icon: Wrench, tone: 'ops',
    desc: 'owns the technical bridge' },
]
const SEAT_SHORT = { incident_commander_id: 'CMDR', comms_lead_id: 'COMMS', ops_lead_id: 'OPS' }
const REASONS = ['Shift change', 'Escalation', 'Availability', 'Expertise fit', 'Stand-down', 'Fatigue rotation']
const fT = (i) => ({ duration: 0.4, delay: 0.05 + i * 0.06, ease: [0.16, 1, 0.3, 1] })
const rT = (i) => ({ duration: 0.3, delay: Math.min(i, 12) * 0.03, ease: [0.16, 1, 0.3, 1] })

/* ── draft state — `base` is the SERVER truth the diff/handoff math runs against ── */
const form = reactive({ incident_commander_id: '', comms_lead_id: '', ops_lead_id: '' })
const base = reactive({ incident_commander_id: '', comms_lead_id: '', ops_lead_id: '' })
const note = ref('')
const focusSeat = ref('incident_commander_id')
const busy = ref(false)

/* ── the bay ── */
const people = ref([])
const holders = ref({})
const history = ref([])
const teamName = ref('')
const loadingPool = ref(false)
const searching = ref(false)
const q = ref('')
const logOpen = ref(false)
let qTimer = null

const seedFromTicket = () => {
  for (const r of ROLES) {
    form[r.field] = props.ticket?.[r.field] ? String(props.ticket[r.field]) : ''
    base[r.field] = form[r.field]
  }
}

const hydrate = async () => {
  loadingPool.value = true
  try {
    const res = await fetchRosterCandidates(props.ticket.id)
    people.value = res.candidates || []
    holders.value = res.holders || {}
    history.value = res.history || []
    teamName.value = res.team?.name || ''
    for (const r of ROLES) {   // server truth beats a possibly-stale row prop
      const h = res.holders?.[r.field]
      form[r.field] = h ? String(h.id) : ''
      base[r.field] = form[r.field]
    }
  } catch {
    people.value = (props.assignees || []).map(a => ({
      id: String(a.value), name: a.label, email: null, department: null, designation: null,
      is_agent: true, is_lead: false, on_team: true, is_you: false, is_assignee: false, command_load: 0,
    }))
  } finally {
    loadingPool.value = false
    const empty = ROLES.find(r => !form[r.field])
    focusSeat.value = empty ? empty.field : 'incident_commander_id'
  }
}

watch(() => props.open, (v) => {
  if (!v || !props.ticket) return
  note.value = ''; q.value = ''; logOpen.value = false
  people.value = []; holders.value = {}; history.value = []; teamName.value = ''
  seedFromTicket()
  hydrate()
})

/* directory typeahead — merges results into the pool (never replaces it) */
watch(q, (v) => {
  clearTimeout(qTimer)
  const term = (v || '').trim()
  if (term.length < 2 || !props.ticket) return
  qTimer = setTimeout(async () => {
    searching.value = true
    try {
      const res = await fetchRosterCandidates(props.ticket.id, { q: term })
      const have = new Set(people.value.map(p => p.id))
      people.value = [...people.value, ...(res.candidates || []).filter(p => !have.has(p.id))]
    } catch { /* typeahead is best-effort — the local filter still works */ }
    finally { searching.value = false }
  }, 350)
})

/* ── lookups ── */
const personOf = (id) => people.value.find(p => p.id === String(id)) || null
const nameOf = (id) => {
  const p = personOf(id)
  if (p) return p.name
  for (const r of ROLES) {   // holder names survive even when the user is outside the pool
    if (holders.value[r.field]?.id === String(id) && holders.value[r.field]?.name) return holders.value[r.field].name
    if (props.ticket?.[r.field] && String(props.ticket[r.field]) === String(id) && props.ticket[`${r.field.replace('_id', '')}_name`])
      return props.ticket[`${r.field.replace('_id', '')}_name`]
  }
  const a = (props.assignees || []).find(x => String(x.value) === String(id))
  return a?.label || '—'
}
const emailOf = (id) => personOf(id)?.email || ''
const initials = (name) => (name || '—').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
const crewSub = (p) => [p.email, [p.department, p.designation].filter(Boolean).join(' · ')]
  .filter(Boolean).join('  ·  ') || (p.is_agent ? 'Support agent' : 'Employee')

const agoOf = (iso) => {
  if (!iso) return '—'
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 90) return 'just now'
  if (s < 5400) return `${Math.round(s / 60)}m ago`
  if (s < 129600) return `${Math.round(s / 3600)}h ago`
  return `${Math.round(s / 86400)}d ago`
}
const sinceOf = (field) => {
  const h = holders.value[field]
  if (!h?.since) return ''
  return `since ${agoOf(h.since).replace(' ago', '')}${h.staffed_by ? ` · by ${h.staffed_by}` : ''}`
}

/* ── sealed pre-emption: a resolved/closed/archived or merged incident has no active
   response to staff — the backend 409s (see incident-roles guards). Pre-empt with a
   read-only plate so the roster never looks editable on a dead incident. ── */
const statusLabel = computed(() => String(props.ticket?.status || '').replace(/_/g, ' ') || '—')
const sealed = computed(() => {
  const t = props.ticket
  if (!t) return false
  return ['resolved', 'closed', 'archived'].includes(String(t.status || '')) || !!t.merged_into_id
})
const sealKind = computed(() => (props.ticket?.merged_into_id ? 'merged' : 'terminal'))

/* ── diff / gates ── */
const isChanged = (f) => (form[f] || '') !== (base[f] || '')
const dirty = computed(() => ROLES.some(r => isChanged(r.field)))
const handoffSeats = computed(() => ROLES.filter(r => base[r.field] && isChanged(r.field)))
const needsReason = computed(() => handoffSeats.value.length > 0)
const canSave = computed(() => !sealed.value && dirty.value
  && (!needsReason.value || note.value.trim().length >= 3))
const handoffLabel = computed(() => handoffSeats.value.map(r => r.label.toLowerCase()).join(' + '))
const focusLabel = computed(() => ROLES.find(r => r.field === focusSeat.value)?.label || 'role')
const stampText = computed(() => {
  if (!dirty.value) return 'NO CHANGES'
  const n = ROLES.filter(r => isChanged(r.field)).length
  const h = handoffSeats.value.length
  if (!canSave.value) return `${h} HANDOFF${h > 1 ? 'S' : ''} — REASON REQUIRED`
  return `${n} CHANGE${n > 1 ? 'S' : ''}${h ? ` · ${h} HANDOFF${h > 1 ? 'S' : ''}` : ''}`
})
const dualHat = computed(() => {
  const count = {}
  for (const r of ROLES) if (form[r.field]) count[form[r.field]] = (count[form[r.field]] || 0) + 1
  const id = Object.keys(count).find(k => count[k] >= 2)
  return id ? `${nameOf(id)} holds ${count[id]} seats — dual-hatting slows a large response.` : ''
})

/* ── bay interactions ── */
const shownPeople = computed(() => {
  const term = (q.value || '').trim().toLowerCase()
  const list = !term ? people.value : people.value.filter(p =>
    [p.name, p.email, p.department, p.designation].filter(Boolean).some(s => s.toLowerCase().includes(term)))
  return [...list].sort((a, b) =>
    (a.is_lead !== b.is_lead) ? (a.is_lead ? -1 : 1)
      : (a.on_team !== b.on_team) ? (a.on_team ? -1 : 1)
        : (a.is_agent !== b.is_agent) ? (a.is_agent ? -1 : 1)
          : (a.name || '').localeCompare(b.name || ''))
})
const seatsOf = (id) => ROLES.filter(r => form[r.field] === String(id)).map(r => SEAT_SHORT[r.field])
const assign = (p) => {
  form[focusSeat.value] = String(p.id)
  const next = ROLES.find(r => !form[r.field])   // speed: hop the focus to the next empty seat
  if (next) focusSeat.value = next.field
}
const clearSeat = (f) => { form[f] = ''; focusSeat.value = f }

/* ── save ── */
const save = async () => {
  if (!props.ticket || !canSave.value || busy.value) return
  busy.value = true
  try {
    const payload = { clear: [] }
    for (const r of ROLES) {
      if (!isChanged(r.field)) continue
      if (form[r.field]) payload[r.field] = form[r.field]
      else payload.clear.push(r.field)
    }
    if (note.value.trim()) payload.note = note.value.trim()
    await setIncidentRoles(props.ticket.id, payload)
    const h = handoffSeats.value.length
    toast.success(h ? `Roster updated — ${h} handoff${h > 1 ? 's' : ''} logged to the chain`
      : 'Response roster staffed')
    emit('done')
    emit('close')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not update the roster')
  } finally { busy.value = false }
}

/* summarize an incident_roles_set detail row → "Commander → Aisha · stood down Comms" */
const SHORT = { incident_commander_id: 'Commander', comms_lead_id: 'Comms', ops_lead_id: 'Ops' }
const summarize = (changes) => Object.entries(changes || {})
  .map(([k, v]) => (v == null ? `stood down ${SHORT[k] || k}` : `${SHORT[k] || k} → ${v}`))
  .join(' · ') || 'roster touched'

/* Esc closes (the bay search stops its own Esc so clearing the filter never closes) */
const onKey = (e) => { if (e.key === 'Escape' && props.open && !busy.value) emit('close') }
watch(() => props.open, (v) => {
  if (v) window.addEventListener('keydown', onKey)
  else window.removeEventListener('keydown', onKey)
})
onBeforeUnmount(() => { window.removeEventListener('keydown', onKey); clearTimeout(qTimer) })
</script>

<style scoped>
.irm-overlay { position: fixed; inset: 0; z-index: 2700; display: grid; place-items: center;
  padding: 20px; background: rgba(5, 4, 2, 0.6); backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px); }
.irm { position: relative; width: min(880px, 96vw); max-height: 90vh; display: flex; flex-direction: column;
  border-radius: 20px; padding: 24px 24px 18px; overflow: hidden;
  background: linear-gradient(180deg, var(--sd-surface-elevated), var(--sd-surface));
  border: 1px solid var(--sd-inc-brd); box-shadow: var(--sd-shadow-hover); }
.irm-accent { position: absolute; inset: 0 0 auto 0; height: 3px; background: var(--sd-inc-grad); }
.irm-aura { position: absolute; top: -120px; left: -80px; width: 380px; height: 320px; pointer-events: none;
  background: radial-gradient(closest-side, var(--sd-inc-soft), transparent 72%); opacity: 0.7; }
.irm-x { position: absolute; top: 14px; right: 14px; z-index: 2; display: grid; place-items: center; width: 30px;
  height: 30px; border-radius: 10px; cursor: pointer; background: var(--sd-surface);
  border: 1px solid var(--sd-border); color: var(--sd-text-muted); }
.irm-eyebrow { margin: 0 0 6px; font-size: 9.5px; letter-spacing: 0.18em; color: var(--sd-inc-core); }
.irm-title { margin: 0 0 4px; font-size: 20px; font-weight: 800; color: var(--sd-text); }
.irm-title em { font-style: normal; background: var(--sd-inc-grad); -webkit-background-clip: text;
  background-clip: text; color: transparent; }
.irm-sub { margin: 0 0 16px; font-size: 12px; line-height: 1.55; color: var(--sd-text-secondary); }
.irm-sub b { color: var(--sd-text); font-weight: 700; }
.irm-scroll { display: flex; flex-direction: column; gap: 12px; overflow-y: auto; padding-right: 2px; }
/* sealed / merged read-only plate (mirrors SdIncDecisionModal.idm-seal) */
.irm-seal { display: flex; flex-direction: column; align-items: center; gap: 9px; text-align: center;
  margin: 8px 0; padding: 34px 22px; border: 1px dashed var(--sd-border); border-radius: 16px;
  background: var(--sd-surface); }
.seal-ring { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 50%;
  color: var(--sd-inc-dim); background: var(--sd-inc-dim-soft);
  border: 1px solid color-mix(in srgb, var(--sd-inc-dim) 40%, transparent); }
.seal-t { margin: 0; font-size: 11px; font-weight: 800; letter-spacing: 0.2em; color: var(--sd-text-secondary); }
.seal-d { margin: 0; max-width: 380px; font-size: 12px; line-height: 1.55; color: var(--sd-text-muted); }
.seal-d b { color: var(--sd-text-secondary); }

.irm-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.12fr); gap: 12px; }

/* ═══ THE COMMAND CHAIN ═══ */
.irm-chain { position: relative; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.chain-line { position: absolute; left: 30px; top: 22px; bottom: 26px; width: 2px; z-index: 0;
  background: linear-gradient(180deg, var(--sd-inc-core), var(--sd-inc-warn), var(--sd-inc-live));
  opacity: 0.32; transform-origin: top; animation: irm-draw 0.9s var(--sd-spring) both; }
.chain-pulse { position: absolute; left: -2px; top: 0; width: 6px; height: 6px; border-radius: 50%;
  background: var(--sd-inc-core); box-shadow: 0 0 10px var(--sd-inc-core);
  animation: irm-travel 3.2s ease-in-out infinite; }
@keyframes irm-draw { from { transform: scaleY(0); } to { transform: scaleY(1); } }
@keyframes irm-travel { 0% { top: 0; opacity: 0; } 12% { opacity: 1; } 88% { opacity: 1; }
  100% { top: calc(100% - 6px); opacity: 0; } }

.seat { position: relative; z-index: 1; display: flex; align-items: flex-start; gap: 12px; width: 100%;
  padding: 12px 13px; border-radius: 14px; text-align: left; cursor: pointer; font: inherit;
  background: var(--sd-surface); border: 1px solid var(--sd-border);
  transition: border-color 0.25s var(--sd-spring), box-shadow 0.3s var(--sd-spring),
    transform 0.25s var(--sd-spring); }
.seat:hover { transform: translateY(-1px); border-color: var(--sd-inc-brd); }
.seat.focus { border-color: color-mix(in srgb, var(--sd-inc-core) 55%, transparent);
  box-shadow: 0 0 0 3px var(--sd-inc-soft), 0 10px 26px rgba(0, 0, 0, 0.22); }
.seat-glyph { flex-shrink: 0; display: grid; place-items: center; width: 34px; height: 34px;
  border-radius: 10px; color: var(--sd-inc-core); background: var(--sd-inc-soft);
  border: 1px solid var(--sd-inc-brd); transition: transform 0.25s var(--sd-spring); }
.seat.focus .seat-glyph { transform: scale(1.06); }
.seat.comms .seat-glyph { color: var(--sd-inc-warn); background: var(--sd-inc-warn-soft); }
.seat.ops .seat-glyph { color: var(--sd-inc-live); background: var(--sd-inc-live-soft); }
.seat-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 7px; }
.seat-k { font-size: 12px; font-weight: 800; color: var(--sd-text); }
.seat-k i { display: block; margin-top: 1px; font-style: normal; font-size: 10.5px; font-weight: 600;
  color: var(--sd-text-muted); }
.seat-holder { display: flex; align-items: center; gap: 9px; min-width: 0; }
.seat-ava { flex-shrink: 0; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 9px;
  font-size: 10px; font-weight: 800; letter-spacing: 0.04em; color: var(--sd-inc-core);
  background: var(--sd-inc-soft); border: 1px solid var(--sd-inc-brd); }
.seat-who { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.seat-who b { font-size: 12.5px; font-weight: 750; color: var(--sd-text); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; }
.seat-who small { font-size: 10px; font-weight: 600; color: var(--sd-text-muted); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; }
.seat-who small.pend { color: var(--sd-inc-warn); font-family: var(--sd-mono); font-size: 9px;
  letter-spacing: 0.08em; }
.seat-clear { flex-shrink: 0; display: grid; place-items: center; width: 24px; height: 24px;
  border-radius: 8px; cursor: pointer; color: var(--sd-text-muted); background: transparent;
  border: 1px solid transparent; transition: all 0.2s var(--sd-spring); }
.seat-clear:hover { color: var(--sd-inc-arc); background: var(--sd-inc-arc-soft);
  border-color: color-mix(in srgb, var(--sd-inc-arc) 40%, transparent); }
.seat-empty { display: flex; align-items: center; gap: 9px; }
.seat-slot { padding: 4px 9px; border-radius: 8px; font-size: 9px; font-weight: 800; letter-spacing: 0.12em;
  color: var(--sd-text-muted); border: 1px dashed var(--sd-border); }
.seat-cta { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 650;
  color: var(--sd-text-muted); opacity: 0; transform: translateX(-4px);
  transition: all 0.25s var(--sd-spring); }
.seat.focus .seat-cta, .seat:hover .seat-cta { opacity: 1; transform: translateX(0);
  color: var(--sd-inc-core); }
.seat-led { position: absolute; top: 11px; right: 11px; width: 7px; height: 7px; border-radius: 50%;
  background: var(--sd-inc-dim-soft); border: 1px solid var(--sd-border);
  transition: all 0.25s var(--sd-spring); }
.seat-led.on { background: var(--sd-inc-live); border-color: transparent; box-shadow: 0 0 8px var(--sd-inc-live); }
.seat-led.on.pend { background: var(--sd-inc-warn); box-shadow: 0 0 8px var(--sd-inc-warn);
  animation: irm-led 1.4s ease-in-out infinite; }
@keyframes irm-led { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }

.chain-warn { display: flex; align-items: center; gap: 7px; margin: 0; padding: 8px 11px;
  border-radius: 11px; font-size: 11px; font-weight: 650; line-height: 1.4; color: var(--sd-inc-warn);
  background: var(--sd-inc-warn-soft);
  border: 1px solid color-mix(in srgb, var(--sd-inc-warn) 35%, transparent); }
.chain-warn svg { flex-shrink: 0; }

/* ═══ THE PERSONNEL BAY ═══ */
.irm-bay { display: flex; flex-direction: column; gap: 9px; min-width: 0; padding: 12px;
  border-radius: 14px; background: color-mix(in srgb, var(--sd-surface) 72%, transparent);
  border: 1px solid var(--sd-border); }
.bay-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.bay-k { margin: 0; font-size: 9px; font-weight: 800; letter-spacing: 0.16em; color: var(--sd-text-muted); }
.bay-k em { font-style: normal; color: var(--sd-inc-core); }
.bay-count { font-size: 9.5px; font-weight: 800; padding: 2px 8px; border-radius: 12px;
  color: var(--sd-inc-core); background: var(--sd-inc-soft); border: 1px solid var(--sd-inc-brd); }
.bay-search { display: flex; align-items: center; gap: 8px; padding: 8px 11px; border-radius: 11px;
  color: var(--sd-text-muted); background: var(--sd-surface); border: 1px solid var(--sd-border);
  transition: border-color 0.22s var(--sd-spring), box-shadow 0.28s var(--sd-spring); }
.bay-search:focus-within { border-color: var(--sd-inc-brd); box-shadow: 0 0 0 3px var(--sd-inc-soft); }
.bay-search input { flex: 1; min-width: 0; border: 0; outline: none; background: transparent;
  font: inherit; font-size: 12px; color: var(--sd-text); }
.bay-search input::placeholder { color: var(--sd-text-muted); }
.bay-list { display: flex; flex-direction: column; gap: 6px; max-height: 296px; overflow-y: auto;
  padding-right: 2px; scrollbar-width: thin; }

.crew { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px;
  border-radius: 12px; text-align: left; cursor: pointer; font: inherit;
  background: var(--sd-surface); border: 1px solid var(--sd-border);
  transition: border-color 0.22s var(--sd-spring), background-color 0.22s var(--sd-spring); }
.crew:hover { border-color: var(--sd-inc-brd);
  background: color-mix(in srgb, var(--sd-inc-soft) 40%, var(--sd-surface)); }
.crew.picked { border-color: color-mix(in srgb, var(--sd-inc-live) 45%, transparent); }
.crew-ava { flex-shrink: 0; display: grid; place-items: center; width: 30px; height: 30px;
  border-radius: 10px; font-size: 10px; font-weight: 800; letter-spacing: 0.04em;
  color: var(--sd-inc-core); background: var(--sd-inc-soft); border: 1px solid var(--sd-inc-brd); }
.crew-ava.dim { color: var(--sd-text-muted); background: var(--sd-inc-dim-soft);
  border-color: var(--sd-border); }
.crew-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.crew-name { display: flex; align-items: center; gap: 6px; min-width: 0; }
.crew-name b { font-size: 12.5px; font-weight: 750; color: var(--sd-text); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; }
.tag { flex-shrink: 0; padding: 1px 6px; border-radius: 7px; font-size: 8px; font-weight: 800;
  font-style: normal; letter-spacing: 0.1em; font-family: var(--sd-mono); color: var(--sd-text-muted);
  background: var(--sd-inc-dim-soft); border: 1px solid var(--sd-border); }
.tag.you { color: var(--sd-inc-live); background: var(--sd-inc-live-soft);
  border-color: color-mix(in srgb, var(--sd-inc-live) 40%, transparent); }
.tag.lead { color: var(--sd-inc-core); background: var(--sd-inc-soft); border-color: var(--sd-inc-brd); }
.tag.dir { color: var(--sd-inc-warn); background: var(--sd-inc-warn-soft);
  border-color: color-mix(in srgb, var(--sd-inc-warn) 35%, transparent); }
.crew-sub { font-size: 10px; font-weight: 600; color: var(--sd-text-muted); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; }
.crew-right { flex-shrink: 0; display: flex; align-items: center; gap: 6px; }
.crew-seat { padding: 2px 7px; border-radius: 8px; font-size: 8.5px; font-weight: 800;
  letter-spacing: 0.08em; color: var(--sd-inc-live); background: var(--sd-inc-live-soft);
  border: 1px solid color-mix(in srgb, var(--sd-inc-live) 40%, transparent); }
.crew-load { display: inline-flex; align-items: center; gap: 3px; padding: 2px 7px; border-radius: 8px;
  font-size: 9px; font-weight: 800; color: var(--sd-text-muted); background: var(--sd-inc-dim-soft);
  border: 1px solid var(--sd-border); }
.crew-load.hot { color: var(--sd-inc-arc); background: var(--sd-inc-arc-soft);
  border-color: color-mix(in srgb, var(--sd-inc-arc) 40%, transparent); }
.crew-go { display: grid; place-items: center; color: var(--sd-inc-core); opacity: 0;
  transform: translateX(-4px); transition: all 0.22s var(--sd-spring); }
.crew:hover .crew-go { opacity: 1; transform: translateX(0); }

.bay-skel { height: 46px; border-radius: 12px; background: linear-gradient(100deg,
  var(--sd-inc-dim-soft) 40%, color-mix(in srgb, var(--sd-inc-soft) 50%, transparent) 50%,
  var(--sd-inc-dim-soft) 60%); background-size: 220% 100%;
  animation: irm-shimmer 1.3s linear infinite; animation-delay: calc(var(--i) * 0.09s); }
@keyframes irm-shimmer { from { background-position: 130% 0; } to { background-position: -60% 0; } }
.bay-empty { display: flex; align-items: center; gap: 9px; margin: 0; padding: 18px 12px;
  font-size: 11.5px; line-height: 1.5; color: var(--sd-text-muted); }
.bay-empty svg { flex-shrink: 0; }

/* ═══ HANDOFF REASON — animated drop-gate ═══ */
.irm-reason { display: grid; grid-template-rows: 0fr; opacity: 0;
  transition: grid-template-rows 0.4s var(--sd-spring), opacity 0.3s ease; }
.irm-reason.open { grid-template-rows: 1fr; opacity: 1; }
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

/* ═══ CHAIN OF COMMAND log ═══ */
.irm-log { border-radius: 14px; border: 1px solid var(--sd-border);
  background: color-mix(in srgb, var(--sd-surface) 72%, transparent); }
.log-head { display: flex; align-items: center; gap: 7px; width: 100%; padding: 10px 13px;
  cursor: pointer; font: inherit; color: var(--sd-text-muted); background: transparent; border: 0; }
.log-head .sd-mono { flex: 1; text-align: left; font-size: 9px; font-weight: 800; letter-spacing: 0.14em; }
.log-head .sd-mono em { font-style: normal; color: var(--sd-inc-core); }
.log-chev { transition: transform 0.3s var(--sd-spring); }
.log-chev.up { transform: rotate(180deg); }
.log-body { display: grid; grid-template-rows: 0fr; opacity: 0;
  transition: grid-template-rows 0.4s var(--sd-spring), opacity 0.3s ease; }
.log-body.open { grid-template-rows: 1fr; opacity: 1; }
.log-clip { overflow: hidden; min-height: 0; }
.log-inner { display: flex; flex-direction: column; gap: 7px; padding: 2px 13px 12px; max-height: 170px;
  overflow-y: auto; scrollbar-width: thin; }
.log-row { display: flex; align-items: baseline; gap: 10px; }
.log-t { flex-shrink: 0; width: 66px; font-size: 9px; font-weight: 700; letter-spacing: 0.05em;
  color: var(--sd-text-muted); }
.log-line { flex: 1; min-width: 0; margin: 0; font-size: 11px; line-height: 1.5;
  color: var(--sd-text-secondary); }
.log-line b { color: var(--sd-text); font-weight: 750; }
.log-note { font-style: italic; color: var(--sd-inc-core); }

/* ═══ footer ═══ */
.irm-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px;
  margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--sd-border); }
.irm-stamp { display: inline-flex; align-items: center; gap: 6px; padding: 4px 11px; border-radius: 20px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.12em; font-family: var(--sd-mono);
  color: var(--sd-text-muted); background: var(--sd-surface-elevated); border: 1px solid var(--sd-border);
  transition: all 0.25s var(--sd-spring); }
.irm-stamp.ready { color: var(--sd-inc-live); background: var(--sd-inc-live-soft);
  border-color: color-mix(in srgb, var(--sd-inc-live) 40%, transparent); }
.irm-stamp.hold { color: var(--sd-inc-warn); background: var(--sd-inc-warn-soft);
  border-color: color-mix(in srgb, var(--sd-inc-warn) 40%, transparent); }
.irm-actions { display: flex; gap: 9px; }
.irm-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 15px; border-radius: 11px;
  cursor: pointer; font-size: 12.5px; font-weight: 800; border: 1px solid transparent; }
.irm-btn.ghost { color: var(--sd-text-secondary); background: var(--sd-surface); border-color: var(--sd-border); }
.irm-btn.primary { color: #1a1206; background: var(--sd-inc-grad); box-shadow: 0 8px 20px var(--sd-inc-soft); }
.irm-btn:disabled { opacity: 0.55; cursor: default; }
.irm-spin { animation: sd-spin-slow 1s linear infinite; }

/* ═══ transitions ═══ */
.swap-enter-active, .swap-leave-active { transition: opacity 0.22s ease, transform 0.22s var(--sd-spring); }
.swap-enter-from { opacity: 0; transform: translateY(6px); }
.swap-leave-to { opacity: 0; transform: translateY(-6px); }
.rise-enter-active, .rise-leave-active { transition: opacity 0.28s ease, transform 0.28s var(--sd-spring); }
.rise-enter-from, .rise-leave-to { opacity: 0; transform: translateY(6px); }

@media (max-width: 760px) {
  .irm { padding: 20px 16px 14px; }
  .irm-grid { grid-template-columns: 1fr; }
  .bay-list { max-height: 220px; }
}

/* ═════ LIGHT THEME OVERRIDES ═════ */
[data-theme="light"] .irm { background: linear-gradient(180deg, rgba(255, 250, 240, 0.92), rgba(255, 250, 240, 0.85)); }
[data-theme="light"] .irm-btn.primary { color: #fff8ec; }
[data-theme="light"] .rchip.on { color: #fff8ec; }
[data-theme="light"] .seat.focus { box-shadow: 0 0 0 3px var(--sd-inc-soft), 0 10px 26px rgba(120, 90, 30, 0.14); }
[data-theme="light"] .irm-aura { opacity: 0.45; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .irm-spin,
  html:not([data-cinematic="on"]) .chain-line,
  html:not([data-cinematic="on"]) .chain-pulse,
  html:not([data-cinematic="on"]) .seat-led.on.pend,
  html:not([data-cinematic="on"]) .bay-skel { animation: none !important; }
}
</style>
