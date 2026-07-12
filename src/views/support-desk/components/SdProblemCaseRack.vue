<template>
  <section class="pcr">
    <header class="pcr-head">
      <div class="pcr-title">
        <h3><Fingerprint :size="15" /> Problem workbench</h3>
        <span class="sd-mono">CASE FILES · THE KNOWN-ERROR ARCHIVE</span>
      </div>
      <div class="pcr-tools">
        <div class="pcr-search">
          <Search :size="12" />
          <input v-model.trim="q" placeholder="Has this been seen before? Search the archive…"
            @keyup.enter="reload()" />
          <button v-if="q" class="pcr-x" aria-label="Clear search" @click="q = ''; reload()"><X :size="11" /></button>
        </div>
        <button class="pcr-toggle sd-mono" :class="{ on: knownOnly }" title="Only known errors with a documented workaround"
          @click="knownOnly = !knownOnly; reload()"><BookMarked :size="11" /> KNOWN ERRORS</button>
        <Motion as="button" class="pcr-new" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.96 }"
          @click="$emit('new')"><Plus :size="13" /> Open a case file</Motion>
      </div>
    </header>

    <div v-if="loading" class="pcr-loading sd-mono">OPENING THE ARCHIVE…</div>
    <div v-else-if="!problems.length" class="pcr-empty">
      <FolderOpen :size="22" />
      <p>{{ q || knownOnly ? 'Nothing in the archive matches — widen the search.'
        : 'No case files yet. Open one from a recurring ticket (P on the desk) and start stringing evidence.' }}</p>
    </div>

    <TransitionGroup v-else name="pcr-file" tag="div" class="pcr-rack">
      <article v-for="(p, i) in problems" :key="p.id" class="pcr-file" :class="{ open: expanded === p.id }"
        :style="{ '--i': i }" :data-pid="p.id">
        <button class="pcr-tab" @click="expanded = expanded === p.id ? '' : p.id">
          <span class="pcr-ring" :style="{ '--pp': lifecyclePct(p) }" :data-n="(p.linked_ticket_ids || []).length"
            :title="`${(p.linked_ticket_ids || []).length} tickets strung to this case`" />
          <span class="pcr-id">
            <b class="sd-mono">{{ p.problem_number || 'PROBLEM' }}</b>
            <em>{{ p.title }}</em>
          </span>
          <span class="pcr-chips">
            <i class="pcr-sev sd-mono" :class="p.severity">{{ (p.severity || '').toUpperCase() }}</i>
            <i v-if="p.status === 'known_error' || p.workaround_published" class="pcr-ke sd-mono">KNOWN ERROR</i>
            <i v-else-if="p.workaround" class="pcr-wk sd-mono">WORKAROUND DRAFTED</i>
            <i v-if="p.owner_name" class="pcr-own sd-mono" :title="'Owned by ' + p.owner_name">{{ mono(p.owner_name) }}</i>
          </span>
          <span class="pcr-steps" aria-hidden="true">
            <i v-for="s in STATUSES" :key="s.value" class="pcr-step"
              :class="{ done: stageIdx(p) >= idx(s.value), cur: p.status === s.value }" :title="s.label" />
          </span>
          <ChevronDown :size="14" class="pcr-caret" :class="{ open: expanded === p.id }" />
        </button>

        <div class="pcr-body" :class="{ open: expanded === p.id }">
          <div class="pcr-body-in">
            <div class="pcr-cols">
              <div class="pcr-col">
                <h5 class="sd-mono">ROOT CAUSE</h5>
                <p>{{ p.root_cause || 'Not established yet — the investigation is open.' }}</p>
                <h5 class="sd-mono">WORKAROUND {{ p.workaround_published ? '· PUBLISHED TO ALL TIERS' : p.workaround ? '· DRAFT' : '' }}</h5>
                <p :class="{ ke: p.workaround_published }">{{ p.workaround || 'No interim fix documented.' }}</p>
              </div>
              <div class="pcr-col">
                <h5 class="sd-mono">STRUNG TO THIS CASE · {{ (p.linked_ticket_ids || []).length }}</h5>
                <div class="pcr-strung">
                  <button v-for="t in strungRows(p)" :key="t.id" class="pcr-tkt sd-mono" @click="$emit('open', t)">
                    {{ t.ticket_number }} <i :class="{ done: ['resolved', 'closed'].includes(t.status) }">{{ t.status }}</i>
                  </button>
                  <span v-if="(p.linked_ticket_ids || []).length > strungRows(p).length" class="pcr-more sd-mono">
                    +{{ (p.linked_ticket_ids || []).length - strungRows(p).length }} off this page</span>
                  <span v-if="!(p.linked_ticket_ids || []).length" class="pcr-more sd-mono">NO STRINGS YET</span>
                </div>
                <p v-if="p.lessons_learned" class="pcr-lessons"><b class="sd-mono">LESSONS · </b>{{ p.lessons_learned }}</p>
              </div>
            </div>
            <div class="pcr-verbs">
              <Motion v-if="canCascade(p)" as="button" class="pcr-v primary" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.96 }"
                title="Resolve every linked, still-open ticket with one shared resolution"
                @click="$emit('cascade', p)"><CheckCheck :size="13" /> Cascade solve {{ openCount(p) }} linked</Motion>
              <template v-if="canCommandProblem(p)">
                <button v-if="!p.workaround_published && p.workaround" class="pcr-v" @click="publish(p)">
                  <BookMarked :size="12" /> Publish workaround</button>
                <button v-if="p.status !== 'known_error' && p.workaround" class="pcr-v" @click="markKnown(p)">
                  <Stamp :size="12" /> Mark known error</button>
                <button class="pcr-v" @click="$emit('edit', p)"><PenLine :size="12" /> Edit the file</button>
              </template>
              <span v-else class="pcr-readonly sd-mono" title="You're not working a ticket on this case — read-only">
                <Fingerprint :size="11" /> Read-only · owned by another team</span>
            </div>
          </div>
        </div>
      </article>
    </TransitionGroup>
  </section>
</template>

<script setup>
/* SdProblemCaseRack — the L3 problem workbench: a rack of expanding case files over
   /support-desk/problems (KEDB q-search + known_only), cross-lit by the live board
   rows (strung tickets that are on this page render as jump chips). Quick verbs:
   publish the workaround, stamp KNOWN ERROR, cascade-solve, edit. Self-contained
   loader — the section calls reload() (exposed) after any problem mutation. */
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  Fingerprint, Search, X, BookMarked, Plus, FolderOpen, ChevronDown, CheckCheck, Stamp, PenLine,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { listProblems, updateProblem, PROBLEM_STATUSES } from '@/composables/useSupportDesk'

const props = defineProps({
  boardRows: { type: Array, default: () => [] },
  focusId: { type: String, default: '' },
  me: { type: Object, default: () => ({}) },
  caps: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['new', 'edit', 'cascade', 'open', 'changed'])
const toast = useToast()

const STATUSES = PROBLEM_STATUSES
const problems = ref([])
const loading = ref(false)
const q = ref('')
const knownOnly = ref(false)
const expanded = ref('')

const reload = async () => {
  loading.value = true
  try {
    const params = { limit: 60 }
    if (q.value) params.q = q.value
    if (knownOnly.value) params.known_only = true
    const r = await listProblems(params)
    problems.value = Array.isArray(r) ? r : (r?.items || [])
  } catch { problems.value = [] } finally { loading.value = false }
}
onMounted(reload)
defineExpose({ reload, focus: (pid) => { expanded.value = String(pid) } })

const idx = (v) => STATUSES.findIndex(s => s.value === v)
const stageIdx = (p) => Math.max(0, idx(p.status))
const lifecyclePct = (p) => `${((stageIdx(p) + 1) / STATUSES.length) * 100}%`
const mono = (n) => (n || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

const strungRows = (p) => {
  const ids = new Set((p.linked_ticket_ids || []).map(String))
  return props.boardRows.filter(t => ids.has(String(t.id))).slice(0, 6)
}
const openCount = (p) => (p.linked_ticket_ids || []).length
// Mirror of the backend _require_problem_actor gate so the UI never advertises a mutation
// that will 403/404: an admin, the owner/creator, or an agent who commands a linked ticket
// (present on their team-sealed board ⇒ strungRows non-empty). A plain agent can still READ
// the case file (desk-wide KEDB) — they just don't see the mutating verbs.
const canCommandProblem = (p) => {
  if (props.caps?.isAdmin) return true
  const uid = String(props.me?.id || '')
  if (uid && (String(p.owner_id || '') === uid || String(p.created_by_id || '') === uid)) return true
  return strungRows(p).length > 0
}
const canCascade = (p) => canCommandProblem(p) && openCount(p) > 0 && p.status !== 'closed'

const publish = async (p) => {
  try {
    const r = await updateProblem(p.id, { workaround_published: true })
    Object.assign(p, r || { workaround_published: true })
    toast.success(`${p.problem_number} — workaround published. Lower tiers can apply it now.`)
    emit('changed')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not publish') }
}
const markKnown = async (p) => {
  try {
    const r = await updateProblem(p.id, { status: 'known_error', workaround_published: true })
    Object.assign(p, r || { status: 'known_error', workaround_published: true })
    toast.success(`${p.problem_number} filed as a KNOWN ERROR in the archive.`)
    emit('changed')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not update the case') }
}
</script>

<style scoped>
.pcr { display: flex; flex-direction: column; gap: 11px; }
.pcr-head { display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap; }
.pcr-title h3 { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 15px; font-weight: 800;
  color: var(--sd-text); }
.pcr-title h3 svg { color: var(--sd-l3-core); }
.pcr-title > span { font-size: 8.5px; letter-spacing: 0.2em; color: var(--sd-text-dim); }
.pcr-tools { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-left: auto; }
.pcr-search { display: flex; align-items: center; gap: 7px; min-width: 250px; padding: 8px 12px; border-radius: 11px;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text-dim); }
.pcr-search input { flex: 1; border: none; background: none; outline: none; font-family: inherit; font-size: 12px;
  color: var(--sd-text); }
.pcr-search input::placeholder { color: var(--sd-text-placeholder, var(--sd-text-dim)); }
.pcr-x { display: grid; place-items: center; border: none; background: none; cursor: pointer; color: var(--sd-text-dim); }
.pcr-toggle { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 11px;
  font-size: 9px; font-weight: 800; letter-spacing: 0.12em; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text-muted); }
.pcr-toggle.on { border-color: var(--sd-l3-core); color: var(--sd-l3-core); background: var(--sd-l3-soft); }
.pcr-new { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 11px;
  font-size: 11.5px; font-weight: 800; cursor: pointer; font-family: inherit; border: none;
  background: var(--sd-l3-grad); color: #221604; box-shadow: var(--sd-l3-glow); }

.pcr-loading { padding: 26px; text-align: center; font-size: 10px; letter-spacing: 0.2em; color: var(--sd-text-dim);
  animation: pcr-blink 1.2s infinite; }
@keyframes pcr-blink { 50% { opacity: 0.4; } }
.pcr-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 30px 18px;
  border: 1px dashed var(--sd-border-strong); border-radius: 14px; color: var(--sd-text-dim); text-align: center; }
.pcr-empty p { margin: 0; font-size: 12px; max-width: 56ch; line-height: 1.6; }

.pcr-rack { display: flex; flex-direction: column; gap: 9px; }
.pcr-file { border: 1px solid var(--sd-border-strong); border-radius: 14px; background: var(--sd-surface);
  overflow: hidden; animation: sd-deal 0.4s var(--sd-spring, ease) both; animation-delay: calc(var(--i) * 0.05s);
  transition: border-color 0.2s, box-shadow 0.2s; }
.pcr-file.open { border-color: var(--sd-l3-brd);
  box-shadow: 0 16px 34px -22px color-mix(in srgb, var(--sd-l3-core) 55%, transparent); }
.pcr-file-enter-active, .pcr-file-leave-active { transition: all 0.3s var(--sd-spring, ease); }
.pcr-file-enter-from, .pcr-file-leave-to { opacity: 0; transform: translateY(6px); }

.pcr-tab { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 14px; border: none;
  background: none; cursor: pointer; font-family: inherit; text-align: left; color: var(--sd-text); }
.pcr-ring { position: relative; width: 34px; height: 34px; border-radius: 50%; flex: 0 0 auto;
  background: conic-gradient(var(--sd-l3-core) var(--pp, 20%), color-mix(in srgb, var(--sd-text) 12%, transparent) 0); }
.pcr-ring::before { content: attr(data-n); position: absolute; inset: 3px; border-radius: 50%; display: grid;
  place-items: center; background: var(--sd-surface); font-size: 11px; font-weight: 800; color: var(--sd-l3-core);
  font-family: "Cascadia Mono", Consolas, ui-monospace, monospace; }
.pcr-id { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.pcr-id b { font-size: 10px; letter-spacing: 0.1em; color: var(--sd-l3-core); }
.pcr-id em { font-style: normal; font-size: 13px; font-weight: 700; color: var(--sd-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pcr-chips { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.pcr-chips i { font-style: normal; padding: 3px 7px; border-radius: 6px; font-size: 8px; font-weight: 800;
  letter-spacing: 0.12em; border: 1px solid currentColor; }
.pcr-sev.low { color: var(--sd-text-dim); } .pcr-sev.medium { color: var(--sd-l3-warn); }
.pcr-sev.high { color: var(--sd-l3-halt); }
.pcr-ke { color: var(--sd-l3-halt); } .pcr-wk { color: var(--sd-l3-core); }
.pcr-own { color: var(--sd-text-muted); border-style: dashed; }
.pcr-steps { display: inline-flex; gap: 4px; }
.pcr-step { width: 16px; height: 5px; border-radius: 3px; background: color-mix(in srgb, var(--sd-text) 14%, transparent); }
.pcr-step.done { background: var(--sd-l3-core); }
.pcr-step.cur { background: var(--sd-l3-core); box-shadow: 0 0 8px var(--sd-l3-core); }
.pcr-caret { color: var(--sd-text-dim); transition: transform 0.25s; }
.pcr-caret.open { transform: rotate(180deg); }

/* expand via the grid-rows 0fr→1fr trick */
.pcr-body { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.32s var(--sd-spring, ease); }
.pcr-body.open { grid-template-rows: 1fr; }
.pcr-body-in { overflow: hidden; display: flex; flex-direction: column; gap: 11px; padding: 0 14px; }
.pcr-body.open .pcr-body-in { padding: 2px 14px 14px; }
.pcr-cols { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 16px; }
@media (max-width: 760px) { .pcr-cols { grid-template-columns: 1fr; } }
.pcr-col h5 { margin: 8px 0 4px; font-size: 8.5px; letter-spacing: 0.2em; color: var(--sd-l3-core); }
.pcr-col p { margin: 0; font-size: 12px; line-height: 1.6; color: var(--sd-text-secondary); }
.pcr-col p.ke { padding: 8px 11px; border-radius: 9px; border: 1px dashed var(--sd-l3-brd);
  background: var(--sd-l3-soft); color: var(--sd-text); }
.pcr-strung { display: flex; gap: 6px; flex-wrap: wrap; }
.pcr-tkt { display: inline-flex; align-items: center; gap: 6px; padding: 5px 9px; border-radius: 8px;
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.05em; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text-secondary); }
.pcr-tkt:hover { border-color: var(--sd-l3-core); color: var(--sd-text); }
.pcr-tkt i { font-style: normal; font-size: 8px; letter-spacing: 0.08em; color: var(--sd-l3-warn); }
.pcr-tkt i.done { color: var(--sd-l3-go); }
.pcr-more { align-self: center; font-size: 8.5px; letter-spacing: 0.12em; color: var(--sd-text-dim); }
.pcr-lessons { margin-top: 8px !important; padding: 8px 11px; border-radius: 9px;
  background: color-mix(in srgb, var(--sd-l3-go) 8%, transparent); }
.pcr-lessons b { font-size: 8px; letter-spacing: 0.18em; color: var(--sd-l3-go); }
.pcr-verbs { display: flex; gap: 7px; flex-wrap: wrap; }
.pcr-v { display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border-radius: 10px;
  font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text-secondary); }
.pcr-v:hover { border-color: var(--sd-l3-core); color: var(--sd-text); }
.pcr-v.primary { border-color: transparent; background: var(--sd-l3-grad); color: #221604; font-weight: 800; }
.pcr-readonly { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 10px;
  font-size: 8.5px; letter-spacing: 0.1em; color: var(--sd-text-dim);
  border: 1px dashed var(--sd-border-strong); background: transparent; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .pcr-file { animation: none; }
}
</style>
