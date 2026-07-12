<template>
  <SdModalShell :open="open" eyebrow="L3 WORKBENCH · CASE FILE"
    :title="editMode ? 'Edit the case file' : 'String this ticket to a problem'" width="640px" @close="$emit('close')">
    <div v-if="open" class="plm">
      <!-- context strip -->
      <div v-if="ticket" class="plm-ctx sd-mono">
        <span class="plm-no">{{ ticket.ticket_number }}</span>
        <span class="plm-subj">{{ ticket.subject }}</span>
        <span class="plm-pin"><Fingerprint :size="11" /> STRING IT</span>
      </div>

      <!-- mode tabs (link flow only) -->
      <div v-if="!editMode" class="plm-tabs" role="tablist">
        <button class="plm-tab" :class="{ on: tab === 'link' }" role="tab" :aria-selected="tab === 'link'"
          @click="tab = 'link'"><Search :size="12" /> Link an existing case</button>
        <button class="plm-tab" :class="{ on: tab === 'new' }" role="tab" :aria-selected="tab === 'new'"
          @click="tab = 'new'"><Plus :size="12" /> Open a new file</button>
      </div>

      <!-- ═══ link existing (KEDB lookup) ═══ -->
      <template v-if="!editMode && tab === 'link'">
        <div class="plm-search">
          <Search :size="12" />
          <input v-model.trim="q" placeholder="Search the archive — title, number, root cause, workaround…"
            @input="debouncedSearch" />
        </div>
        <p v-if="searching" class="plm-dim sd-mono">SEARCHING THE ARCHIVE…</p>
        <p v-else-if="!hits.length" class="plm-dim sd-mono">NO MATCHING CASE FILES — OPEN A NEW ONE.</p>
        <div v-else class="plm-hits">
          <button v-for="p in hits" :key="p.id" class="plm-hit" :class="{ on: pick === String(p.id) }"
            @click="pick = pick === String(p.id) ? '' : String(p.id)">
            <span class="plm-hit-top sd-mono">
              <b>{{ p.problem_number || 'PROBLEM' }}</b>
              <i v-if="p.status === 'known_error' || p.workaround_published" class="ke">KNOWN ERROR</i>
              <i class="st">{{ statusLabel(p.status) }}</i>
              <em>{{ (p.linked_ticket_ids || []).length }} STRUNG</em>
            </span>
            <span class="plm-hit-title">{{ p.title }}</span>
            <span v-if="p.workaround" class="plm-hit-wk"><b class="sd-mono">WORKAROUND ·</b> {{ p.workaround }}</span>
          </button>
        </div>
      </template>

      <!-- ═══ new / edit form ═══ -->
      <template v-else>
        <label class="plm-f"><span>Case title <i>· required</i></span>
          <input v-model.trim="form.title" class="plm-inp" placeholder="Name the underlying problem, not the symptom" /></label>
        <label class="plm-f"><span>What is actually going wrong?</span>
          <textarea v-model="form.description" class="plm-inp" rows="2"
            placeholder="The recurring failure this case explains…" /></label>
        <div class="plm-row">
          <div class="plm-f"><span>Severity</span>
            <div class="plm-seg">
              <button v-for="s in PROBLEM_SEVERITIES" :key="s.value" class="plm-seg-b"
                :class="{ on: form.severity === s.value }" @click="form.severity = s.value">{{ s.label }}</button>
            </div>
          </div>
          <div v-if="editMode" class="plm-f"><span>Status</span>
            <div class="plm-seg">
              <button v-for="s in PROBLEM_STATUSES" :key="s.value" class="plm-seg-b"
                :class="{ on: form.status === s.value }" @click="form.status = s.value">{{ s.label }}</button>
            </div>
          </div>
        </div>
        <label v-if="editMode" class="plm-f"><span>Root cause</span>
          <textarea v-model="form.root_cause" class="plm-inp" rows="2" placeholder="The established cause…" /></label>
        <label class="plm-f"><span>Workaround <i>· the interim fix lower tiers can apply</i></span>
          <textarea v-model="form.workaround" class="plm-inp" rows="2"
            placeholder="Steps that unblock the requester while the permanent fix ships…" /></label>
        <label v-if="editMode" class="plm-f"><span>Lessons learned</span>
          <textarea v-model="form.lessons_learned" class="plm-inp" rows="2" placeholder="What the desk should remember…" /></label>
        <label class="plm-check">
          <input v-model="form.workaround_published" type="checkbox" :disabled="!form.workaround" />
          <span>Publish the workaround to every tier <em>(files it in the Known-Error archive)</em></span>
        </label>
      </template>
    </div>
    <template #footer>
      <button class="plm-btn" @click="$emit('close')">Cancel</button>
      <button class="plm-btn primary" :disabled="busy || !valid" @click="confirm">
        <Loader v-if="busy" :size="13" class="plm-spin" />
        {{ editMode ? 'Save the file' : tab === 'link' ? 'Tie the string' : 'Open file & string it' }}
      </button>
    </template>
  </SdModalShell>
</template>

<script setup>
/* SdProblemLinkModal — two duties on one manila form:
   · LINK flow (ticket prop): KEDB search over /problems?q= with workaround previews →
     PATCH ticket.linked_problem_id + append the ticket onto problem.linked_ticket_ids;
     or open a NEW case file (created linked + owned by me) in one stroke.
   · EDIT flow (problem prop): the case file's own fields incl. root cause, workaround,
     publish flag, lessons. */
import { ref, computed, watch } from 'vue'
import { Fingerprint, Search, Plus, Loader } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import SdModalShell from '../components/SdModalShell.vue'
import {
  listProblems, createProblem, updateProblem, updateTicket,
  PROBLEM_STATUSES, PROBLEM_SEVERITIES,
} from '@/composables/useSupportDesk'

const props = defineProps({
  ticket: { type: Object, default: null },     // link flow
  problem: { type: Object, default: null },    // edit flow
  me: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const open = computed(() => !!(props.ticket || props.problem))
const editMode = computed(() => !!props.problem && !props.ticket)

const tab = ref('link')
const q = ref('')
const hits = ref([])
const searching = ref(false)
const pick = ref('')
const busy = ref(false)
const form = ref({})

const statusLabel = (v) => PROBLEM_STATUSES.find(s => s.value === v)?.label?.toUpperCase() || (v || '').toUpperCase()

const search = async () => {
  searching.value = true
  try {
    const params = { limit: 30 }
    if (q.value) params.q = q.value
    const r = await listProblems(params)
    hits.value = (Array.isArray(r) ? r : (r?.items || [])).filter(p => p.status !== 'closed')
  } catch { hits.value = [] } finally { searching.value = false }
}
let deb = null
const debouncedSearch = () => { clearTimeout(deb); deb = setTimeout(search, 320) }

watch(open, (v) => {
  if (!v) return
  busy.value = false
  pick.value = props.ticket?.linked_problem_id ? String(props.ticket.linked_problem_id) : ''
  tab.value = 'link'
  q.value = ''
  const p = props.problem
  form.value = {
    title: p?.title || props.ticket?.subject || '',
    description: p?.description || '',
    severity: p?.severity || (props.ticket?.priority === 'critical' ? 'high' : 'medium'),
    status: p?.status || 'open',
    root_cause: p?.root_cause || '',
    workaround: p?.workaround || '',
    lessons_learned: p?.lessons_learned || '',
    workaround_published: !!p?.workaround_published,
  }
  if (props.ticket) search()
})

const valid = computed(() => {
  if (!editMode.value && tab.value === 'link') return !!pick.value
  return (form.value.title || '').trim().length >= 4
})

const confirm = async () => {
  if (!valid.value) return
  busy.value = true
  try {
    if (editMode.value) {
      const f = form.value
      await updateProblem(props.problem.id, {
        title: f.title.trim(), description: f.description || null, severity: f.severity,
        status: f.status, root_cause: f.root_cause || null, workaround: f.workaround || null,
        lessons_learned: f.lessons_learned || null,
        workaround_published: !!(f.workaround && f.workaround_published),
      })
      toast.success(`${props.problem.problem_number || 'Case file'} updated.`)
    } else if (tab.value === 'link') {
      const p = hits.value.find(x => String(x.id) === pick.value)
      await updateTicket(props.ticket.id, { linked_problem_id: pick.value })
      // keep the problem's own string ledger in sync (idempotent client-side merge)
      const ids = new Set((p?.linked_ticket_ids || []).map(String))
      if (p && !ids.has(String(props.ticket.id))) {
        await updateProblem(p.id, { linked_ticket_ids: [...ids, String(props.ticket.id)] })
      }
      toast.success(`${props.ticket.ticket_number} strung to ${p?.problem_number || 'the case'}.`)
    } else {
      const f = form.value
      const p = await createProblem({
        title: f.title.trim(), description: f.description || null, severity: f.severity,
        workaround: f.workaround || null,
        workaround_published: !!(f.workaround && f.workaround_published),
        owner_id: props.me?.id || null,
        linked_ticket_ids: [String(props.ticket.id)],
      })
      await updateTicket(props.ticket.id, { linked_problem_id: String(p.id) })
      toast.success(`${p.problem_number} opened — ${props.ticket.ticket_number} is its first string.`)
    }
    emit('done')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not save the case file')
  } finally { busy.value = false }
}
</script>

<style scoped>
.plm { display: flex; flex-direction: column; gap: 12px; }
.plm-ctx { display: flex; align-items: center; gap: 9px; padding: 10px 12px; border-radius: 11px;
  border: 1px dashed var(--sd-border-strong); background: var(--sd-l3-soft); }
.plm-no { font-size: 11px; font-weight: 800; color: var(--sd-l3-core); }
.plm-subj { flex: 1; font-size: 12px; color: var(--sd-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.plm-pin { display: inline-flex; align-items: center; gap: 5px; font-size: 8.5px; font-weight: 800;
  letter-spacing: 0.14em; color: var(--sd-l3-string); }

.plm-tabs { display: flex; gap: 6px; }
.plm-tab { display: inline-flex; align-items: center; gap: 7px; padding: 8px 13px; border-radius: 10px;
  font-size: 11.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border); background: var(--sd-surface); color: var(--sd-text-muted); }
.plm-tab.on { border-color: var(--sd-l3-core); color: var(--sd-l3-core); background: var(--sd-l3-soft); }

.plm-search { display: flex; align-items: center; gap: 7px; padding: 9px 12px; border-radius: 10px;
  border: 1px solid var(--sd-border-strong); background: var(--sd-input-bg, var(--sd-surface)); color: var(--sd-text-dim); }
.plm-search input { flex: 1; border: none; background: none; outline: none; font-family: inherit; font-size: 12.5px; color: var(--sd-text); }
.plm-dim { margin: 0; font-size: 9px; letter-spacing: 0.16em; color: var(--sd-text-dim); }
.plm-hits { display: flex; flex-direction: column; gap: 7px; max-height: 300px; overflow-y: auto; padding-right: 2px; }
.plm-hit { display: flex; flex-direction: column; gap: 4px; padding: 10px 12px; border-radius: 11px; cursor: pointer;
  text-align: left; font-family: inherit; border: 1px solid var(--sd-border); background: var(--sd-surface); }
.plm-hit.on { border-color: var(--sd-l3-core); background: var(--sd-l3-soft);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--sd-l3-core) 18%, transparent); }
.plm-hit-top { display: flex; align-items: center; gap: 8px; font-size: 9px; }
.plm-hit-top b { color: var(--sd-l3-core); letter-spacing: 0.08em; }
.plm-hit-top i { font-style: normal; padding: 1px 5px; border-radius: 4px; font-size: 7.5px; font-weight: 800;
  letter-spacing: 0.1em; border: 1px solid currentColor; }
.plm-hit-top .ke { color: var(--sd-l3-halt); }
.plm-hit-top .st { color: var(--sd-text-muted); }
.plm-hit-top em { font-style: normal; margin-left: auto; color: var(--sd-text-dim); letter-spacing: 0.1em; }
.plm-hit-title { font-size: 12.5px; font-weight: 700; color: var(--sd-text); }
.plm-hit-wk { font-size: 11px; color: var(--sd-text-muted); line-height: 1.5;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.plm-hit-wk b { font-size: 7.5px; letter-spacing: 0.14em; color: var(--sd-l3-core); }

.plm-f { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 0; }
.plm-f span { font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; color: var(--sd-text-muted); }
.plm-f span i { font-style: normal; color: var(--sd-l3-warn); }
.plm-inp { padding: 9px 11px; border-radius: 10px; resize: vertical; font-family: inherit; font-size: 12.5px;
  border: 1px solid var(--sd-border-strong); background: var(--sd-input-bg, var(--sd-surface)); color: var(--sd-text); }
.plm-inp:focus { outline: none; border-color: var(--sd-l3-core); }
.plm-row { display: flex; gap: 12px; flex-wrap: wrap; }
.plm-seg { display: flex; gap: 5px; flex-wrap: wrap; }
.plm-seg-b { padding: 7px 11px; border-radius: 9px; font-size: 11px; font-weight: 700; cursor: pointer;
  font-family: inherit; border: 1px solid var(--sd-border); background: var(--sd-surface); color: var(--sd-text-muted); }
.plm-seg-b.on { border-color: var(--sd-l3-core); color: var(--sd-l3-core); background: var(--sd-l3-soft); }
.plm-check { display: flex; align-items: flex-start; gap: 9px; font-size: 12px; color: var(--sd-text-secondary);
  cursor: pointer; }
.plm-check input { margin-top: 2px; accent-color: var(--sd-l3-core); }
.plm-check em { font-style: normal; color: var(--sd-text-dim); }

.plm-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 15px; border-radius: 11px;
  font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: transparent; color: var(--sd-text-secondary); }
.plm-btn.primary { border-color: transparent; color: #221604; background: var(--sd-l3-grad); }
.plm-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.plm-spin { animation: plm-rot 0.9s linear infinite; }
@keyframes plm-rot { to { transform: rotate(360deg); } }
</style>
