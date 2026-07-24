<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" class="ilm-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.22 }"
        @mousedown.self="requestClose">
        <Motion class="ilm" role="dialog" aria-modal="true" aria-label="Roll up under a master incident"
          :initial="{ opacity: 0, y: 30, scale: 0.955 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18, scale: 0.98 }" :transition="{ duration: 0.46, ease: [0.16, 1, 0.3, 1] }">
          <span class="ilm-beam" aria-hidden="true" />
          <button class="ilm-x" :disabled="busy" aria-label="Close" @click="requestClose"><X :size="17" /></button>

          <!-- ░░ HEADER ░░ -->
          <header class="ilm-head">
            <p class="ilm-eyebrow sd-mono"><GitMerge :size="11" /> INCIDENT COMMAND · ROLLUP</p>
            <div class="ilm-tr">
              <h2 class="ilm-title">The coupling bay — <em>{{ ticket?.ticket_number }}</em></h2>
              <SdIncSevBadge :sev="sev" />
              <span v-if="ticket?.is_major_incident" class="ilm-mi sd-mono">MAJOR</span>
              <span class="ilm-st sd-mono" :class="{ dead: sealReason }">{{ statusLabel }}</span>
            </div>
            <p v-if="ticket?.subject" class="ilm-subj">{{ ticket.subject }}</p>
            <p class="ilm-sub">Children stay live, separately-worked faults — the master carries the rollup.
              When the master resolves, every child's owner is <b>nudged to verify their own fix</b>.</p>
          </header>

          <!-- ░░ MAIN (left) — state-driven workflow ░░ -->
          <div class="ilm-main">
            <!-- SEALED — linking is off the table, say exactly why -->
            <Motion v-if="mode === 'sealed'" class="ilm-seal"
              :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(0)">
              <span class="seal-ring"><component :is="sealReason === 'notIncident' ? TriangleAlert : Lock" :size="22" /></span>
              <p class="seal-t sd-mono">COUPLING SEALED</p>
              <p class="seal-d" v-if="sealReason === 'merged'">
                This ticket was merged — rollups belong on the <b>surviving incident</b>.</p>
              <p class="seal-d" v-else-if="sealReason === 'terminal'">
                This incident is {{ statusLabel }} — <b>reopen it</b> before rolling it under a master.
                A rollup coordinates a live response.</p>
              <p class="seal-d" v-else>
                Parent links are for <b>incidents</b> — this ticket is a
                {{ ticket?.ticket_type || 'request' }} and not a declared major incident.</p>
            </Motion>

            <!-- MASTER — this fault commands children; it cannot become a child -->
            <template v-else-if="mode === 'master'">
              <Motion class="ilm-note" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(0)">
                <Crown :size="13" />
                <span>This fault is a <b>master</b> — {{ kids.length }}
                  {{ kids.length === 1 ? 'child rides' : 'children ride' }} its rollup. Masters can't nest
                  under another master; release every child first.</span>
              </Motion>
              <div class="ilm-flist">
                <Motion v-for="(c, i) in kids" :key="c.id" class="ilm-row"
                  :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(i * 0.6 + 1)">
                  <SdIncSevBadge :sev="c.sev" />
                  <span class="row-body">
                    <b>{{ c.ticket_number }} <i v-if="c.is_major_incident" class="row-mi">MI</i></b>
                    <em>{{ c.subject }}</em>
                    <small>{{ c.assigned_agent_name || 'Unowned' }} · {{ String(c.status || '').replace(/_/g, ' ') }}</small>
                  </span>
                  <Motion as="button" class="ilm-btn micro danger" :disabled="busy"
                    :while-hover="{ y: -1 }" :while-tap="{ scale: 0.96 }" @click="release(c)">
                    <Loader v-if="busy === String(c.id)" :size="11" class="ilm-spin" /><Unlink v-else :size="11" />
                    Release
                  </Motion>
                </Motion>
              </div>
              <section class="ilm-f">
                <label class="ilm-k">Why release <i>recorded on each child's timeline</i></label>
                <div class="ilm-rchips">
                  <button v-for="r in UNLINK_REASONS" :key="r" type="button" class="rchip"
                    :class="{ on: note === r }" @click="pickReason(r)">{{ r }}</button>
                </div>
                <div class="ilm-inrow">
                  <input v-model="note" class="ilm-in" type="text" maxlength="300"
                    placeholder="Or state the rationale in your own words…" />
                  <span class="cnt sd-mono" :class="{ hot: note.length > 270 }">{{ note.length }}/300</span>
                </div>
              </section>
            </template>

            <!-- LINKED — show the standing coupling, its siblings, and the way out -->
            <template v-else-if="mode === 'linked'">
              <Motion class="ilm-note amber" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(0)">
                <Link2 :size="13" />
                <span><b class="sd-mono">{{ ticket?.parent_incident_number || 'A master incident' }}</b>
                  currently carries this fault's rollup. Unlinking is recorded on this timeline.</span>
              </Motion>
              <p class="ilm-flabel sd-mono">RIDING THE SAME MASTER</p>
              <div class="ilm-flist">
                <p v-if="sibState === 'loading'" class="ilm-none">Reading the rollup…</p>
                <p v-else-if="sibState === 'blocked'" class="ilm-none">
                  The master sits beyond your scope seal — its other children aren't visible from here.</p>
                <p v-else-if="!siblings.length" class="ilm-none">No sibling faults — this is the only child.</p>
                <Motion v-else v-for="(c, i) in siblings" :key="c.id" class="ilm-row still"
                  :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(i * 0.6 + 1)">
                  <SdIncSevBadge :sev="c.sev" />
                  <span class="row-body">
                    <b>{{ c.ticket_number }} <i v-if="c.is_major_incident" class="row-mi">MI</i></b>
                    <em>{{ c.subject }}</em>
                    <small>{{ c.assigned_agent_name || 'Unowned' }} · {{ String(c.status || '').replace(/_/g, ' ') }}</small>
                  </span>
                </Motion>
              </div>
              <section class="ilm-f">
                <label class="ilm-k">Why unlink <i>recorded on the timeline beside the break</i></label>
                <div class="ilm-rchips">
                  <button v-for="r in UNLINK_REASONS" :key="r" type="button" class="rchip"
                    :class="{ on: note === r }" @click="pickReason(r)">{{ r }}</button>
                </div>
                <div class="ilm-inrow">
                  <input v-model="note" class="ilm-in" type="text" maxlength="300"
                    placeholder="Or state the rationale in your own words…" />
                  <span class="cnt sd-mono" :class="{ hot: note.length > 270 }">{{ note.length }}/300</span>
                </div>
              </section>
            </template>

            <!-- PICK — search the live desk for a master, say why, couple -->
            <template v-else>
              <Motion class="ilm-search" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(0)">
                <Search :size="14" />
                <input ref="searchRef" v-model="q" type="text"
                  placeholder="Search live incidents by number or subject…" @input="debouncedFetch" />
                <Loader v-if="searching" :size="13" class="ilm-spin" />
              </Motion>

              <div class="ilm-flist grow">
                <p v-if="!candidates.length && !searching" class="ilm-none">
                  No linkable live incidents{{ q ? ' match this search' : '' }} — a master must be a live,
                  non-child incident on your desk.</p>
                <Motion v-for="(c, i) in candidates" :key="c.id" as="button" type="button" class="ilm-row cand"
                  :class="{ on: picked === String(c.id) }"
                  :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(i * 0.6 + 1)"
                  @click="pick(c)">
                  <SdIncSevBadge :sev="c.sev" />
                  <span class="row-body">
                    <b>{{ c.ticket_number }} <i v-if="c.is_major_incident" class="row-mi">MI</i></b>
                    <em>{{ c.subject }}</em>
                    <small>
                      {{ c.assigned_agent_name || 'Unowned' }}
                      <template v-if="c.incident_commander_name"> · CMDR {{ c.incident_commander_name }}</template>
                      · {{ String(c.status || '').replace(/_/g, ' ') }}
                    </small>
                  </span>
                  <span v-if="c.child_count" class="row-kids sd-mono" title="Children already rolled up">
                    <GitMerge :size="11" /> {{ c.child_count }}</span>
                  <span class="row-led" :class="{ on: picked === String(c.id) }" aria-hidden="true" />
                </Motion>
              </div>

              <section class="ilm-f">
                <label class="ilm-k">Why couple <i>recorded on both timelines</i></label>
                <div class="ilm-rchips">
                  <button v-for="r in LINK_REASONS" :key="r" type="button" class="rchip"
                    :class="{ on: note === r }" @click="pickReason(r)">{{ r }}</button>
                </div>
                <div class="ilm-inrow">
                  <input v-model="note" class="ilm-in" type="text" maxlength="300"
                    placeholder="Or state the rationale in your own words…" />
                  <span class="cnt sd-mono" :class="{ hot: note.length > 270 }">{{ note.length }}/300</span>
                </div>
              </section>
            </template>
          </div>

          <!-- ░░ RAIL (right) — THE COUPLING: the linkage draws itself ░░ -->
          <aside class="ilm-rail">
            <p class="rail-h sd-mono"><Link2 :size="11" /> THE COUPLING</p>

            <div class="cpl">
              <!-- master slot -->
              <div class="cpl-node master" :class="{ ghost: mode === 'pick' && !pickedRow, hot: !!masterCard }">
                <em class="sd-mono">MASTER</em>
                <template v-if="masterCard">
                  <b class="sd-mono">{{ masterCard.number }}</b>
                  <span v-if="masterCard.subject" :title="masterCard.subject">{{ masterCard.subject }}</span>
                </template>
                <span v-else class="cpl-empty">{{ mode === 'sealed' ? 'coupling sealed' : 'select a master' }}</span>
              </div>

              <!-- the connector — flows when a coupling is live or armed -->
              <div class="cpl-wire" :class="{ live: wireLive, cut: mode === 'sealed' }" aria-hidden="true">
                <i v-for="n in 3" :key="n" class="cpl-pulse" :style="{ '--n': n }" />
              </div>

              <!-- child slot -->
              <div v-if="mode === 'master'" class="cpl-node kids-fan hot">
                <em class="sd-mono">CHILDREN · {{ kids.length }}</em>
                <span class="fan">
                  <b v-for="c in kids.slice(0, 3)" :key="c.id" class="sd-mono">{{ c.ticket_number }}</b>
                  <b v-if="kids.length > 3" class="sd-mono more">+{{ kids.length - 3 }}</b>
                </span>
              </div>
              <div v-else class="cpl-node child hot">
                <em class="sd-mono">CHILD · THIS FAULT</em>
                <b class="sd-mono">{{ ticket?.ticket_number }}</b>
              </div>
            </div>

            <!-- signature — who is coupling, on what clock -->
            <div class="ilm-sig">
              <i class="sig-dot">{{ initials(meName) }}</i>
              <span class="sig-tx"><em class="sd-mono">COUPLED BY</em><b>{{ meName }}</b></span>
              <b class="sig-clock sd-mono">{{ utcClock }}</b>
            </div>

            <!-- witness wire -->
            <p v-if="mode === 'pick'" class="ilm-wire" :class="{ warn: pickedRow && !pickedRow.incident_commander_id }">
              <component :is="!pickedRow || pickedRow.incident_commander_id ? Radio : TriangleAlert" :size="12" />
              <template v-if="!pickedRow">The master's commander is notified the moment the coupling lands.</template>
              <template v-else-if="pickedRow.incident_commander_id">Commander
                <b>{{ pickedRow.incident_commander_name || 'of the master' }}</b> is notified on link.</template>
              <template v-else>That master has <b>no commander staffed</b> — the rollup logs unwitnessed.</template>
            </p>

            <!-- house rules — the workflow contract, pinned to the rail floor -->
            <div class="ilm-rules">
              <p class="rules-h sd-mono"><ScrollText :size="10" /> HOUSE RULES</p>
              <ul>
                <li>One level deep — masters never nest.</li>
                <li>A master must be a live, non-child incident on your desk.</li>
                <li>Children resolve on their own evidence.</li>
                <li>Master resolve nudges every child's owner to verify.</li>
              </ul>
            </div>
          </aside>

          <!-- ░░ FOOTER ░░ -->
          <footer class="ilm-foot">
            <span class="ilm-stamp sd-mono" :class="stampTone">
              <component :is="mode === 'sealed' ? Lock : Link2" :size="13" /> {{ stampLabel }}
            </span>
            <em class="ilm-oath sd-mono">EVERY COUPLING RIDES THE TIMELINE</em>
            <div class="ilm-actions">
              <button class="ilm-btn ghost" :disabled="!!busy" @click="requestClose">
                {{ mode === 'pick' || mode === 'linked' ? 'Cancel' : 'Close' }}</button>
              <Motion v-if="mode === 'pick'" as="button" class="ilm-btn primary" :disabled="!picked || !!busy"
                :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }" @click="link">
                <Loader v-if="busy" :size="14" class="ilm-spin" /><Link2 v-else :size="14" />
                Roll under master
              </Motion>
              <Motion v-else-if="mode === 'linked'" as="button" class="ilm-btn primary cut" :disabled="!!busy"
                :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }" @click="unlink">
                <Loader v-if="busy" :size="14" class="ilm-spin" /><Unlink v-else :size="14" />
                Unlink from master
              </Motion>
            </div>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
/* SdIncLinkModal — "THE COUPLING BAY".
   PATCH /tickets/{id}/incident-parent { parent_id | clear, note? } — one level deep.
   State-driven: PICK (search live masters, reason, couple) · LINKED (standing master +
   sibling roster + reasoned unlink) · MASTER (children roster + per-child release —
   pre-empts the backend's "has children" 422) · SEALED (merged / terminal / non-incident —
   pre-empts the 409/422). Every fetch is stale-guarded; dirty per-child releases surface
   as 'done' on close so both hosts (section + drawer) refresh. */
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  X, Search, Loader, Link2, Unlink, GitMerge, Crown, Lock, Radio, ScrollText, TriangleAlert,
} from 'lucide-vue-next'
import SdIncSevBadge from '../components/SdIncSevBadge.vue'
import {
  listIncidents, listIncidentChildren, setIncidentParent, fetchMe, sevOf,
} from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  ticket: { type: Object, default: null },   // the fault being coupled (child, unless it's a master)
})
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const LINK_REASONS = [
  'Same root cause suspected', 'Duplicate symptom stream',
  'Downstream of the master fault', 'One commander should coordinate the set',
]
const UNLINK_REASONS = [
  'Divergent root cause confirmed', 'Resolves independently of the master', 'Linked in error',
]

const fT = (i) => ({ duration: 0.35, delay: 0.05 + i * 0.05, ease: [0.16, 1, 0.3, 1] })
const q = ref('')
const candidates = ref([])
const picked = ref(null)
const note = ref('')
const kids = ref([])
const kidsState = ref('idle')      // idle | loading | ready
const siblings = ref([])
const sibState = ref('idle')       // idle | loading | ready | blocked
const busy = ref(false)            // false | true (main verbs) | child-id string (release)
const searching = ref(false)
const dirty = ref(false)           // per-child releases happened — close must refresh the host
const me = ref(null)
const nowTick = ref(Date.now())
const searchRef = ref(null)
let timer = null
let clockTimer = null
let fetchSeq = 0                   // stale-response guard shared by every async load

/* ── derived context ── */
const sev = computed(() => props.ticket?.sev ?? sevOf(props.ticket))
const statusLabel = computed(() => String(props.ticket?.status || '').replace(/_/g, ' ') || '—')
const isIncident = computed(() => {
  const t = props.ticket
  return !!t && (t.ticket_type === 'incident' || !!t.is_major_incident)
})
const sealReason = computed(() => {
  const t = props.ticket
  if (!t) return null
  if (t.merged_into_id) return 'merged'
  if (!isIncident.value) return 'notIncident'
  // terminal + already linked stays workable: the backend allows a reasoned unlink
  if (['resolved', 'closed', 'archived'].includes(String(t.status || '')) && !t.parent_incident_id) return 'terminal'
  return null
})
const mode = computed(() => {
  if (sealReason.value) return 'sealed'
  if (kidsState.value === 'ready' && kids.value.length) return 'master'
  if (props.ticket?.parent_incident_id) return 'linked'
  return 'pick'
})

const meName = computed(() => me.value?.full_name || me.value?.email || 'You')
const initials = (name) => String(name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?'
const utcClock = computed(() => { void nowTick.value; return new Date().toISOString().slice(11, 19) + ' UTC' })

const pickedRow = computed(() => candidates.value.find((c) => String(c.id) === picked.value) || null)
const masterCard = computed(() => {
  if (mode.value === 'master') return { number: props.ticket?.ticket_number, subject: null }
  if (mode.value === 'linked') return { number: props.ticket?.parent_incident_number || 'MASTER', subject: null }
  if (mode.value === 'pick' && pickedRow.value) {
    return { number: pickedRow.value.ticket_number, subject: pickedRow.value.subject }
  }
  return null
})
const wireLive = computed(() => mode.value === 'linked' || mode.value === 'master'
  || (mode.value === 'pick' && !!pickedRow.value))

const stampLabel = computed(() => {
  if (mode.value === 'sealed') return 'COUPLING SEALED'
  if (mode.value === 'master') return `COMMANDING ${kids.value.length} ${kids.value.length === 1 ? 'CHILD' : 'CHILDREN'}`
  if (mode.value === 'linked') return 'COUPLED — LIVE ROLLUP'
  return picked.value ? 'READY TO COUPLE' : 'PICK A MASTER'
})
const stampTone = computed(() => {
  if (mode.value === 'sealed') return 'dead'
  if (mode.value === 'master' || mode.value === 'linked') return 'hot'
  return picked.value ? 'ready' : ''
})

/* ── loads (each captures the seq; superseded responses are dropped) ── */
const fetchCandidates = async () => {
  const t = props.ticket
  if (!t?.id) return
  const seq = fetchSeq
  searching.value = true
  try {
    const r = await listIncidents({ lens: 'active', q: q.value || undefined, limit: 12 })
    if (seq !== fetchSeq) return
    candidates.value = (r.items || []).filter((c) =>
      String(c.id) !== String(t.id) && !c.parent_incident_id)
    // a refreshed list may no longer carry the picked row — never link blind
    if (picked.value && !candidates.value.some((c) => String(c.id) === picked.value)) picked.value = null
  } catch { if (seq === fetchSeq) candidates.value = [] }
  finally { if (seq === fetchSeq) searching.value = false }
}
const debouncedFetch = () => { clearTimeout(timer); timer = setTimeout(fetchCandidates, 300) }

const loadKids = async () => {
  const t = props.ticket
  if (!t?.id) { kidsState.value = 'ready'; return }
  const seq = fetchSeq
  kidsState.value = 'loading'
  try {
    const r = await listIncidentChildren(t.id)
    if (seq !== fetchSeq) return
    kids.value = r.items || []
    kidsState.value = 'ready'
  } catch { if (seq === fetchSeq) { kids.value = []; kidsState.value = 'ready' } }
}

const loadSiblings = async () => {
  const t = props.ticket
  if (!t?.parent_incident_id) return
  const seq = fetchSeq
  sibState.value = 'loading'
  try {
    const r = await listIncidentChildren(t.parent_incident_id)
    if (seq !== fetchSeq) return
    siblings.value = (r.items || []).filter((c) => String(c.id) !== String(t.id))
    sibState.value = 'ready'
  } catch { if (seq === fetchSeq) { siblings.value = []; sibState.value = 'blocked' } }
}

/* ── open/close lifecycle — hydrate everything, tear everything down ── */
const onKey = (e) => { if (e.key === 'Escape' && !busy.value) requestClose() }
watch(() => props.open, (v) => {
  if (v) {
    fetchSeq++
    q.value = ''; picked.value = null; note.value = ''; dirty.value = false
    candidates.value = []; kids.value = []; kidsState.value = 'idle'
    siblings.value = []; sibState.value = 'idle'
    fetchMe().then((u) => { me.value = u })
    if (!sealReason.value) {
      loadKids()
      if (props.ticket?.parent_incident_id) loadSiblings()
      else fetchCandidates()
    } else { kidsState.value = 'ready' }
    nowTick.value = Date.now()
    clockTimer = setInterval(() => { nowTick.value = Date.now() }, 1000)
    window.addEventListener('keydown', onKey)
    nextTick(() => setTimeout(() => searchRef.value?.focus?.(), 380))
  } else {
    fetchSeq++
    clearTimeout(timer)
    if (clockTimer) { clearInterval(clockTimer); clockTimer = null }
    window.removeEventListener('keydown', onKey)
  }
})
onBeforeUnmount(() => {
  clearTimeout(timer)
  if (clockTimer) clearInterval(clockTimer)
  window.removeEventListener('keydown', onKey)
})

const pickReason = (r) => { note.value = note.value === r ? '' : r }
const pick = (c) => { picked.value = picked.value === String(c.id) ? null : String(c.id) }
const requestClose = () => { if (busy.value) return; emit(dirty.value ? 'done' : 'close') }

/* ── verbs ── */
const payloadNote = () => { const n = note.value.trim(); return n ? { note: n } : {} }

const link = async () => {
  if (!picked.value || !props.ticket || busy.value) return
  busy.value = true
  try {
    await setIncidentParent(props.ticket.id, { parent_id: picked.value, ...payloadNote() })
    toast.success('Rolled under the master incident')
    emit('done')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not link the incidents')
  } finally { busy.value = false }
}

const unlink = async () => {
  if (!props.ticket || busy.value) return
  busy.value = true
  try {
    await setIncidentParent(props.ticket.id, { clear: true, ...payloadNote() })
    toast.success('Unlinked from the master incident')
    emit('done')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not unlink')
  } finally { busy.value = false }
}

/* release one child from THIS master — actor-gated per child server-side */
const release = async (c) => {
  if (busy.value) return
  busy.value = String(c.id)
  try {
    await setIncidentParent(c.id, { clear: true, ...payloadNote() })
    toast.success(`${c.ticket_number} released from the rollup`)
    dirty.value = true
    kids.value = kids.value.filter((k) => String(k.id) !== String(c.id))
    if (!kids.value.length) fetchCandidates()   // an emptied master may now couple as a child
  } catch (e) {
    toast.error(e?.response?.data?.detail || `Could not release ${c.ticket_number}`)
  } finally { busy.value = false }
}
</script>

<style scoped>
.ilm-overlay { position: fixed; inset: 0; z-index: 2700; display: grid; place-items: center;
  padding: 20px; background: rgba(5, 4, 2, 0.6); backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px); }
.ilm { position: relative; width: min(880px, 96vw); max-height: 90vh; overflow: hidden;
  display: grid; grid-template-columns: minmax(0, 1fr) 296px;
  grid-template-rows: auto minmax(0, 1fr) auto;
  grid-template-areas: 'head head' 'main rail' 'foot foot';
  border-radius: 20px; border: 1px solid var(--sd-inc-brd); box-shadow: var(--sd-shadow-hover);
  background:
    radial-gradient(620px 300px at 10% -10%, var(--sd-inc-soft), transparent 70%),
    linear-gradient(180deg, var(--sd-surface-elevated), var(--sd-surface)); }
[data-theme="light"] .ilm { background:
  radial-gradient(620px 300px at 10% -10%, var(--sd-inc-soft), transparent 70%),
  linear-gradient(180deg, rgba(255, 250, 240, 0.94), rgba(255, 250, 240, 0.86)); }

/* the beam riding the top edge — same family signature as the Command Ledger */
.ilm-beam { position: absolute; inset: 0 0 auto 0; height: 3px; overflow: hidden;
  background: var(--sd-inc-grad); z-index: 2; }
.ilm-beam::after { content: ''; position: absolute; inset: 0; width: 38%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.85), transparent);
  animation: ilm-beam-sweep 3.4s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
@keyframes ilm-beam-sweep { from { transform: translateX(-110%); } to { transform: translateX(380%); } }

.ilm-x { position: absolute; top: 14px; right: 14px; z-index: 3; display: grid; place-items: center;
  width: 30px; height: 30px; border-radius: 10px; cursor: pointer; background: var(--sd-surface);
  border: 1px solid var(--sd-border); color: var(--sd-text-muted);
  transition: color 0.2s, border-color 0.2s; }
.ilm-x:hover { color: var(--sd-text); border-color: var(--sd-inc-brd); }

/* ── header ── */
.ilm-head { grid-area: head; padding: 22px 52px 14px 24px; border-bottom: 1px solid var(--sd-border); }
.ilm-eyebrow { display: inline-flex; align-items: center; gap: 6px; margin: 0 0 7px;
  font-size: 9.5px; letter-spacing: 0.18em; color: var(--sd-inc-core); }
.ilm-tr { display: flex; align-items: center; flex-wrap: wrap; gap: 9px; }
.ilm-title { margin: 0; font-size: 20px; font-weight: 800; color: var(--sd-text); }
.ilm-title em { font-style: normal; background: var(--sd-inc-grad); -webkit-background-clip: text;
  background-clip: text; color: transparent; }
.ilm-mi { padding: 2px 8px; border-radius: 20px; font-size: 9px; font-weight: 800; letter-spacing: 0.12em;
  color: var(--sd-inc-arc); background: var(--sd-inc-arc-soft);
  border: 1px solid color-mix(in srgb, var(--sd-inc-arc) 40%, transparent); }
.ilm-st { padding: 2px 8px; border-radius: 20px; font-size: 9px; font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--sd-text-secondary); background: var(--sd-surface-elevated);
  border: 1px solid var(--sd-border); }
.ilm-st.dead { color: var(--sd-inc-dim); }
.ilm-subj { margin: 5px 0 0; font-size: 12px; font-weight: 600; color: var(--sd-text-secondary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 92%; }
.ilm-sub { margin: 6px 0 0; font-size: 11.5px; line-height: 1.5; color: var(--sd-text-muted); }
.ilm-sub b { color: var(--sd-text-secondary); font-weight: 700; }

/* ── main column ── */
.ilm-main { grid-area: main; min-height: 0; overflow-y: auto; display: flex; flex-direction: column;
  gap: 13px; padding: 16px 18px 16px 24px; }

/* custom scroll — thin amber line, no browser chrome */
.ilm-main, .ilm-flist { scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--sd-inc-core) 50%, transparent) transparent; }
.ilm-main::-webkit-scrollbar, .ilm-flist::-webkit-scrollbar { width: 6px; height: 6px; }
.ilm-main::-webkit-scrollbar-track, .ilm-flist::-webkit-scrollbar-track { background: transparent; }
.ilm-main::-webkit-scrollbar-thumb, .ilm-flist::-webkit-scrollbar-thumb { border-radius: 20px;
  background: color-mix(in srgb, var(--sd-inc-core) 45%, transparent); }
.ilm-main::-webkit-scrollbar-thumb:hover, .ilm-flist::-webkit-scrollbar-thumb:hover {
  background: var(--sd-inc-core); }

.ilm-f { display: flex; flex-direction: column; gap: 7px; }
.ilm-k { font-size: 11.5px; font-weight: 800; letter-spacing: 0.03em; color: var(--sd-text); }
.ilm-k i { font-style: normal; font-weight: 600; color: var(--sd-text-muted); }
.ilm-flabel { margin: 2px 0 -5px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.16em;
  color: var(--sd-text-muted); }

.ilm-note { display: flex; align-items: flex-start; gap: 9px; padding: 11px 13px; border-radius: 12px;
  font-size: 11.5px; line-height: 1.5; color: var(--sd-text-secondary);
  background: var(--sd-surface); border: 1px solid var(--sd-border); }
.ilm-note svg { flex: none; margin-top: 1px; color: var(--sd-inc-core); }
.ilm-note b { color: var(--sd-text); }
.ilm-note.amber { background: var(--sd-inc-soft); border-color: var(--sd-inc-brd); }

/* rows — candidates / children / siblings share one anatomy */
.ilm-flist { display: flex; flex-direction: column; gap: 8px; overflow-y: auto; min-height: 0;
  max-height: 224px; padding-right: 2px; }
.ilm-flist.grow { flex: 1; min-height: 130px; max-height: 300px; }
.ilm-none { margin: auto; padding: 18px 10px; font-size: 11.5px; color: var(--sd-text-muted);
  text-align: center; max-width: 44ch; }
.ilm-row { position: relative; display: flex; align-items: center; gap: 11px; padding: 10px 13px;
  border-radius: 13px; background: var(--sd-surface); border: 1px solid var(--sd-border);
  text-align: left; font-family: inherit; color: var(--sd-text); flex: none; }
.ilm-row.cand { cursor: pointer;
  transition: border-color 0.2s, background 0.2s, transform 0.25s var(--sd-spring); }
.ilm-row.cand:hover { transform: translateY(-2px); border-color: var(--sd-inc-brd); }
.ilm-row.cand.on { border-color: var(--sd-inc-core); background: var(--sd-inc-soft); }
.row-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.row-body b { font-family: var(--sd-mono); font-size: 11.5px; color: var(--sd-text-secondary); }
.row-body em { font-style: normal; font-size: 12.5px; font-weight: 650; color: var(--sd-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row-body small { font-size: 10px; color: var(--sd-text-muted);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row-mi { font-style: normal; font-size: 8px; letter-spacing: 0.12em; font-weight: 800; padding: 1px 5px;
  border-radius: 4px; color: var(--sd-inc-arc); border: 1px solid var(--sd-inc-arc); margin-left: 4px; }
.row-kids { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px;
  color: var(--sd-inc-core); flex: none; }
.row-led { width: 7px; height: 7px; border-radius: 50%; background: var(--sd-inc-dim-soft);
  border: 1px solid var(--sd-border); transition: all 0.25s var(--sd-spring); flex-shrink: 0; }
.row-led.on { background: var(--sd-inc-live); border-color: transparent;
  box-shadow: 0 0 8px var(--sd-inc-live); }

/* search */
.ilm-search { display: flex; align-items: center; gap: 9px; padding: 10px 13px; border-radius: 12px;
  background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text-muted);
  flex: none; transition: border-color 0.2s, box-shadow 0.2s; }
.ilm-search input { flex: 1; min-width: 0; border: 0; outline: none; background: transparent;
  color: var(--sd-text); font: inherit; font-size: 12.5px; }
.ilm-search input::placeholder { color: var(--sd-text-muted); }
.ilm-search:focus-within { border-color: var(--sd-inc-brd); box-shadow: 0 0 0 3px var(--sd-inc-soft); }

/* reason chips + input */
.ilm-rchips { display: flex; flex-wrap: wrap; gap: 6px; }
.rchip { padding: 5px 11px; border-radius: 20px; cursor: pointer; font: inherit; font-size: 10.5px;
  font-weight: 700; color: var(--sd-text-secondary); background: var(--sd-surface);
  border: 1px solid var(--sd-border); transition: all 0.2s var(--sd-spring); }
.rchip:hover { color: var(--sd-text); border-color: var(--sd-inc-brd); transform: translateY(-1px); }
.rchip.on { color: #1a1206; background: var(--sd-inc-grad); border-color: transparent; }
[data-theme="light"] .rchip.on { color: #fff8ec; }
.ilm-inrow { display: flex; align-items: center; gap: 8px; }
.ilm-in { flex: 1; min-width: 0; padding: 8px 11px; border-radius: 11px; font: inherit; font-size: 12px;
  color: var(--sd-text); background: var(--sd-surface); border: 1px solid var(--sd-border); outline: none;
  transition: border-color 0.2s, box-shadow 0.2s; }
.ilm-in:focus { border-color: var(--sd-inc-brd); box-shadow: 0 0 0 3px var(--sd-inc-soft); }
.ilm-in::placeholder { color: var(--sd-text-muted); }
.cnt { font-size: 9px; letter-spacing: 0.06em; color: var(--sd-text-muted); font-variant-numeric: tabular-nums; }
.cnt.hot { color: var(--sd-inc-arc); }

/* sealed plate */
.ilm-seal { display: flex; flex-direction: column; align-items: center; gap: 9px; text-align: center;
  margin: auto 0; padding: 34px 22px; border: 1px dashed var(--sd-border); border-radius: 16px;
  background: var(--sd-surface); }
.seal-ring { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 50%;
  color: var(--sd-inc-dim); background: var(--sd-inc-dim-soft);
  border: 1px solid color-mix(in srgb, var(--sd-inc-dim) 40%, transparent); }
.seal-t { margin: 0; font-size: 11px; font-weight: 800; letter-spacing: 0.2em; color: var(--sd-text-secondary); }
.seal-d { margin: 0; max-width: 380px; font-size: 12px; line-height: 1.55; color: var(--sd-text-muted); }
.seal-d b { color: var(--sd-text-secondary); }

/* ── rail: the coupling diagram ── */
.ilm-rail { grid-area: rail; min-height: 0; display: flex; flex-direction: column; gap: 12px;
  padding: 16px 16px 12px; border-left: 1px solid var(--sd-border); overflow-y: auto;
  background: color-mix(in srgb, var(--sd-surface) 55%, transparent);
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--sd-inc-core) 50%, transparent) transparent; }
.ilm-rail::-webkit-scrollbar { width: 6px; }
.ilm-rail::-webkit-scrollbar-track { background: transparent; }
.ilm-rail::-webkit-scrollbar-thumb { border-radius: 20px;
  background: color-mix(in srgb, var(--sd-inc-core) 45%, transparent); }
.rail-h { display: flex; align-items: center; gap: 6px; margin: 0; font-size: 9px; font-weight: 800;
  letter-spacing: 0.18em; color: var(--sd-inc-core); flex: none; }

.cpl { display: flex; flex-direction: column; align-items: stretch; flex: none; }
.cpl-node { display: flex; flex-direction: column; gap: 3px; padding: 10px 12px; border-radius: 12px;
  border: 1px solid var(--sd-border); background: var(--sd-surface);
  transition: border-color 0.3s, background 0.3s; }
.cpl-node em { font-style: normal; font-size: 7.5px; font-weight: 800; letter-spacing: 0.14em;
  color: var(--sd-text-muted); }
.cpl-node b { font-size: 13px; font-weight: 800; color: var(--sd-text); letter-spacing: 0.02em; }
.cpl-node span { font-size: 10.5px; color: var(--sd-text-secondary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cpl-node.hot { border-color: var(--sd-inc-brd); background: var(--sd-inc-soft);
  animation: cpl-pop 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; }
.cpl-node.hot em { color: var(--sd-inc-core); }
@keyframes cpl-pop { from { opacity: 0; transform: scale(0.94) translateY(4px); } to { opacity: 1; transform: none; } }
.cpl-node.ghost { border-style: dashed; }
.cpl-empty { font-size: 11px; font-style: italic; color: var(--sd-text-muted); }
.fan { display: flex; flex-wrap: wrap; gap: 4px; }
.fan b { font-size: 9.5px; font-weight: 800; padding: 2px 7px; border-radius: 6px;
  color: var(--sd-inc-hi); background: var(--sd-surface); border: 1px solid var(--sd-inc-brd); }
[data-theme="light"] .fan b { color: var(--sd-inc-deep); }
.fan b.more { color: var(--sd-text-muted); border-color: var(--sd-border); }

/* the wire — three pulses ride it while the coupling is live */
.cpl-wire { position: relative; width: 2px; height: 40px; margin: 0 auto; overflow: visible;
  background: repeating-linear-gradient(180deg, var(--sd-inc-brd) 0 4px, transparent 4px 8px); }
.cpl-wire.live { background: linear-gradient(180deg, var(--sd-inc-hi), var(--sd-inc-core)); }
.cpl-wire.cut { opacity: 0.35; }
.cpl-pulse { position: absolute; left: 50%; top: 0; width: 6px; height: 6px; margin-left: -3px;
  border-radius: 50%; background: var(--sd-inc-hi); box-shadow: 0 0 8px var(--sd-inc-core);
  opacity: 0; }
.cpl-wire.live .cpl-pulse { animation: cpl-flow 1.6s linear infinite;
  animation-delay: calc(var(--n) * 0.5s); }
@keyframes cpl-flow {
  0% { transform: translateY(-4px); opacity: 0; }
  15% { opacity: 1; }
  85% { opacity: 1; }
  100% { transform: translateY(40px); opacity: 0; } }

/* signature strip */
.ilm-sig { display: flex; align-items: center; gap: 9px; padding: 9px 11px; border-radius: 12px;
  border: 1px solid var(--sd-border); background: var(--sd-surface); flex: none; }
.sig-dot { flex: none; display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%;
  font-style: normal; font-size: 9px; font-weight: 800; color: var(--sd-inc-hi);
  background: var(--sd-inc-soft); border: 1px solid var(--sd-inc-brd); }
[data-theme="light"] .sig-dot { color: var(--sd-inc-deep); }
.sig-tx { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
.sig-tx em { font-style: normal; font-size: 7px; font-weight: 800; letter-spacing: 0.16em;
  color: var(--sd-text-muted); }
.sig-tx b { font-size: 11.5px; font-weight: 800; color: var(--sd-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sig-clock { flex: none; font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em;
  color: var(--sd-text-secondary); font-variant-numeric: tabular-nums; }

/* witness wire */
.ilm-wire { display: flex; align-items: flex-start; gap: 7px; margin: 0; padding: 0 2px;
  font-size: 10.5px; line-height: 1.45; color: var(--sd-text-muted); flex: none; }
.ilm-wire svg { flex: none; margin-top: 1px; color: var(--sd-inc-core); }
.ilm-wire b { color: var(--sd-text-secondary); font-weight: 700; }
.ilm-wire.warn { color: color-mix(in srgb, var(--sd-inc-arc) 82%, var(--sd-text)); }
.ilm-wire.warn svg { color: var(--sd-inc-arc); }

/* house rules — pinned to the rail floor */
.ilm-rules { margin-top: auto; padding-top: 10px; border-top: 1px dashed var(--sd-border); flex: none; }
.rules-h { display: flex; align-items: center; gap: 6px; margin: 0 0 7px; font-size: 8.5px;
  font-weight: 800; letter-spacing: 0.16em; color: var(--sd-text-muted); }
.ilm-rules ul { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 5px; }
.ilm-rules li { position: relative; padding-left: 13px; font-size: 10px; line-height: 1.45;
  color: var(--sd-text-muted); }
.ilm-rules li::before { content: ''; position: absolute; left: 0; top: 5px; width: 5px; height: 5px;
  border-radius: 50%; background: var(--sd-inc-soft); border: 1px solid var(--sd-inc-brd); }

/* ── footer ── */
.ilm-foot { grid-area: foot; display: flex; align-items: center; gap: 10px;
  padding: 13px 18px 13px 24px; border-top: 1px solid var(--sd-border); }
.ilm-stamp { display: inline-flex; align-items: center; gap: 6px; padding: 4px 11px; border-radius: 20px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.12em; color: var(--sd-text-muted);
  background: var(--sd-surface-elevated); border: 1px solid var(--sd-border); white-space: nowrap; }
.ilm-stamp.ready { color: var(--sd-inc-live); background: var(--sd-inc-live-soft);
  border-color: color-mix(in srgb, var(--sd-inc-live) 40%, transparent); }
.ilm-stamp.hot { color: var(--sd-inc-core); background: var(--sd-inc-soft);
  border-color: var(--sd-inc-brd); }
.ilm-stamp.dead { color: var(--sd-inc-dim); }
.ilm-oath { flex: 1; text-align: center; font-size: 8px; font-weight: 700; letter-spacing: 0.22em;
  color: var(--sd-text-muted); opacity: 0.75; white-space: nowrap; overflow: hidden; }
.ilm-actions { display: flex; gap: 9px; }
.ilm-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 15px; border-radius: 11px;
  cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 800; border: 1px solid transparent; }
.ilm-btn.ghost { color: var(--sd-text-secondary); background: var(--sd-surface); border-color: var(--sd-border); }
.ilm-btn.primary { color: #1a1206; background: var(--sd-inc-grad); box-shadow: 0 8px 20px var(--sd-inc-soft); }
.ilm-btn.primary.cut { background: linear-gradient(122deg, #ff9d94, var(--sd-inc-arc)); color: #fff;
  box-shadow: 0 8px 20px var(--sd-inc-arc-soft); }
[data-theme="light"] .ilm-btn.primary { color: #fff8ec; }
.ilm-btn.micro { padding: 6px 11px; font-size: 10.5px; border-radius: 9px; flex: none; }
.ilm-btn.micro.danger { color: var(--sd-inc-arc); background: var(--sd-surface);
  border-color: color-mix(in srgb, var(--sd-inc-arc) 40%, transparent); }
.ilm-btn:disabled { opacity: 0.55; cursor: default; }
.ilm-spin { animation: sd-spin-slow 1s linear infinite; }

/* ── responsive: rail folds under ── */
@media (max-width: 840px) {
  .ilm { width: min(580px, 96vw); grid-template-columns: 1fr;
    grid-template-areas: 'head' 'main' 'rail' 'foot'; grid-template-rows: auto minmax(0, 1fr) auto auto; }
  .ilm-rail { border-left: none; border-top: 1px solid var(--sd-border); max-height: 260px; }
  .ilm-oath { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .ilm-beam::after { animation: none !important; }
  html:not([data-cinematic="on"]) .cpl-node.hot { animation: none !important; }
  html:not([data-cinematic="on"]) .cpl-wire.live .cpl-pulse { animation: none !important; opacity: 0; }
  html:not([data-cinematic="on"]) .ilm-spin { animation: none !important; }
}
</style>
