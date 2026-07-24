<template>
  <!-- SdIncPlaybook — the response-playbook block (placement-neutral: desks decide
       inline-expand vs side panel; hosts retint via the --pbk-accent custom prop
       or :deep()). readonly renders meters + list with no write controls. -->
  <div class="pbk" :class="{ readonly }">
    <header class="pbk-head">
      <p class="pbk-eyebrow sd-mono">
        <ListChecks :size="11" /> RESPONSE PLAYBOOK
        <em v-if="board && trackTotal">· {{ board.done }}/{{ trackTotal }} DONE · {{ pct }}%</em>
        <em v-else-if="board">· NO TASKS STAGED</em>
      </p>
      <button class="pbk-refresh" title="Refresh tasks" :disabled="loading" @click="load">
        <RefreshCw :size="12" :class="{ spin: loading }" /></button>
    </header>

    <!-- segmented progress meter — one cell per tracked task, skipped ride dim -->
    <div v-if="tasks.length" class="pbk-meter" role="img"
      :aria-label="`${board.done} of ${trackTotal} tasks done`">
      <i v-for="t in tasks" :key="t.id" class="seg" :class="t.status" :title="`${t.title} — ${t.status}`" />
    </div>

    <!-- the task list -->
    <div class="pbk-list">
      <template v-if="loading && !tasks.length">
        <div v-for="i in 3" :key="i" class="pbk-row shim" :style="{ '--i': i }" aria-hidden="true" />
      </template>
      <p v-else-if="loadError" class="pbk-empty">
        Couldn’t load the task board — <button class="pbk-retry" @click="load">retry</button>
      </p>
      <p v-else-if="!tasks.length" class="pbk-empty">
        No response tasks yet{{ readonly ? '.' : ' — apply a playbook below or add the first step.' }}
      </p>
      <div v-for="t in tasks" v-else :key="t.id" class="pbk-row" :class="t.status">
        <span class="pr-state" aria-hidden="true">
          <Check v-if="t.status === 'done'" :size="11" />
          <CircleSlash v-else-if="t.status === 'skipped'" :size="11" />
          <i v-else class="pr-open" />
        </span>
        <div class="pr-body">
          <b :class="{ struck: t.status === 'skipped' }">{{ t.title }}</b>
          <span class="pr-meta sd-mono">
            <em v-if="t.owner_name">{{ t.owner_name }}</em>
            <em v-if="t.template_key" class="tpl">{{ t.template_key }}</em>
            <em v-if="t.status_note" class="note" :title="t.status_note">“{{ t.status_note }}”</em>
          </span>
        </div>
        <div v-if="!readonly && prompt.id !== t.id" class="pr-verbs">
          <template v-if="t.status === 'open'">
            <button class="pr-btn ok" title="Mark done" :disabled="busyTask === t.id" @click="act(t, 'done')">
              <Check :size="12" /></button>
            <button class="pr-btn" title="Skip — a note is required" :disabled="busyTask === t.id"
              @click="askNote(t, 'skipped')"><SkipForward :size="12" /></button>
          </template>
          <button v-else-if="t.status === 'done'" class="pr-btn" title="Reopen — a correction note is required"
            :disabled="busyTask === t.id" @click="askNote(t, 'open')"><Undo2 :size="12" /></button>
          <button v-else class="pr-btn" title="Reopen the skipped task" :disabled="busyTask === t.id"
            @click="act(t, 'open')"><Undo2 :size="12" /></button>
        </div>
        <!-- inline required-note prompt (skip / reopen-from-done) — backend 422s without it -->
        <div v-if="prompt.id === t.id" class="pr-note">
          <input ref="noteRef" v-model="prompt.note" type="text" maxlength="300"
            :placeholder="prompt.target === 'skipped' ? 'Why is this step skipped? (required)' : 'Why does this reopen? (required)'"
            @keydown.enter="confirmNote" @keydown.esc="cancelNote" />
          <button class="pr-btn ok" :disabled="!prompt.note.trim() || busyTask === t.id"
            title="Confirm" @click="confirmNote"><Check :size="12" /></button>
          <button class="pr-btn" title="Cancel" @click="cancelNote"><X :size="12" /></button>
        </div>
      </div>
    </div>

    <!-- write controls -->
    <div v-if="!readonly" class="pbk-controls">
      <template v-if="!sealed">
        <div class="pbk-apply">
          <SdSelect v-model="pickedTpl" :options="tplOptions" placeholder="Apply a playbook…" class="pbk-sel" />
          <Motion as="button" class="pbk-btn" :disabled="!pickedTpl || applying"
            :while-hover="{ y: -2 }" :while-tap="{ scale: 0.96 }" @click="applyTpl">
            <Loader v-if="applying" :size="12" class="spin" /><Sparkles v-else :size="12" /> Apply
          </Motion>
        </div>
        <div class="pbk-add">
          <input v-model="quickTitle" type="text" maxlength="300" placeholder="Add a task…"
            @keydown.enter="addQuick" />
          <Motion as="button" class="pbk-btn ghost" :disabled="!quickTitle.trim() || adding"
            :while-hover="{ y: -2 }" :while-tap="{ scale: 0.96 }" @click="addQuick">
            <Loader v-if="adding" :size="12" class="spin" /><Plus v-else :size="12" />
          </Motion>
        </div>
      </template>
      <p v-else class="pbk-hint sd-mono">
        INCIDENT SEALED — existing tasks stay checkable (follow-through); new tasks and playbooks are closed.
      </p>
    </div>
  </div>
</template>

<script setup>
/*
  SdIncPlaybook — ServiceNow-style incident tasks over the pinned contract:
    GET  /tickets/{id}/tasks                 → { total, open, done, skipped, progress_pct, items }
    POST /tickets/{id}/tasks                 → quick-add ({ title })
    POST /tickets/{id}/tasks/apply-template  → { template_key } (409 = already applied)
    PATCH /tickets/{id}/tasks/{taskId}       → { status, status_note? }
  Transition rules mirrored client-side: open→done free · open→skipped NOTE REQUIRED ·
  done→open NOTE REQUIRED (correction) · skipped→open free — the inline prompt only
  appears on the two note-gated moves. Progress = done/(open+done); skipped rows are
  the tombstone (no delete). Status moves stay allowed post-resolution, so a sealed
  incident hides only the add/apply controls.
*/
import { ref, reactive, computed, watch, nextTick, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  ListChecks, RefreshCw, Check, CircleSlash, SkipForward, Undo2, X, Plus, Sparkles, Loader,
} from 'lucide-vue-next'
import SdSelect from './SdSelect.vue'
import {
  listIncidentTasks, addIncidentTask, applyIncidentTaskTemplate, patchIncidentTask,
  listIncidentPlaybooks,
} from '@/composables/useSupportDesk'

const props = defineProps({
  ticket: { type: Object, default: null },
  readonly: { type: Boolean, default: false },
})
const emit = defineEmits(['changed'])
const toast = useToast()

const board = ref(null)
const loading = ref(false)
const loadError = ref(false)
const busyTask = ref(null)
const prompt = reactive({ id: null, target: null, note: '' })
const noteRef = ref(null)
const templates = ref([])
const pickedTpl = ref('')
const quickTitle = ref('')
const applying = ref(false)
const adding = ref(false)
let loadSeq = 0

const tasks = computed(() => board.value?.items || [])
const trackTotal = computed(() => (board.value ? (board.value.open || 0) + (board.value.done || 0) : 0))
const pct = computed(() => {
  if (!board.value) return 0
  if (board.value.progress_pct != null) return Math.round(board.value.progress_pct)
  return trackTotal.value ? Math.round(((board.value.done || 0) / trackTotal.value) * 100) : 0
})
const sealed = computed(() => {
  const t = props.ticket
  if (!t) return false
  return ['resolved', 'closed', 'archived'].includes(String(t.status || '')) || !!t.merged_into_id
})
const tplOptions = computed(() => templates.value.map((p) => ({
  value: p.key, label: `${p.label} · ${p.task_count} steps`,
})))

const load = async () => {
  const id = props.ticket?.id
  if (!id) { board.value = null; return }
  const seq = ++loadSeq
  loading.value = true
  loadError.value = false
  try {
    const res = await listIncidentTasks(id)
    if (seq !== loadSeq) return
    board.value = res
  } catch {
    if (seq !== loadSeq) return
    board.value = null
    loadError.value = true
  } finally { if (seq === loadSeq) loading.value = false }
}
watch(() => props.ticket?.id, () => {
  prompt.id = null; prompt.target = null; prompt.note = ''
  quickTitle.value = ''; pickedTpl.value = ''
  board.value = null
  load()
}, { immediate: true })

// The library is static — one fetch per mount is plenty; failures degrade to quick-add only.
onMounted(async () => {
  if (props.readonly) return
  try { templates.value = (await listIncidentPlaybooks()) || [] } catch { templates.value = [] }
})

/* ── transitions ── */
const act = async (t, target, note) => {
  if (busyTask.value) return
  busyTask.value = t.id
  try {
    const payload = { status: target }
    if (note) payload.status_note = note
    await patchIncidentTask(props.ticket.id, t.id, payload)
    prompt.id = null; prompt.target = null; prompt.note = ''
    await load()
    emit('changed')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not update the task')
  } finally { busyTask.value = null }
}
const askNote = (t, target) => {
  prompt.id = t.id; prompt.target = target; prompt.note = ''
  nextTick(() => {
    const el = Array.isArray(noteRef.value) ? noteRef.value[0] : noteRef.value
    el?.focus?.()
  })
}
const confirmNote = () => {
  const note = prompt.note.trim()
  if (!note || !prompt.id) return
  const t = tasks.value.find((x) => String(x.id) === String(prompt.id))
  if (t) act(t, prompt.target, note)
}
const cancelNote = () => { prompt.id = null; prompt.target = null; prompt.note = '' }

/* ── apply-template + quick-add ── */
const applyTpl = async () => {
  if (!pickedTpl.value || applying.value) return
  applying.value = true
  try {
    const label = templates.value.find((p) => p.key === pickedTpl.value)?.label || 'Playbook'
    await applyIncidentTaskTemplate(props.ticket.id, { template_key: pickedTpl.value })
    toast.success(`${label} applied — steps staged on the incident`)
    pickedTpl.value = ''
    await load()
    emit('changed')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not apply the playbook')
  } finally { applying.value = false }
}
const addQuick = async () => {
  const title = quickTitle.value.trim()
  if (!title || adding.value) return
  adding.value = true
  try {
    await addIncidentTask(props.ticket.id, { title })
    quickTitle.value = ''
    await load()
    emit('changed')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not add the task')
  } finally { adding.value = false }
}
</script>

<style scoped>
.pbk { --pbk-accent: var(--sd-amber); display: flex; flex-direction: column; gap: 9px; min-width: 0; }

.pbk-head { display: flex; align-items: center; gap: 8px; }
.pbk-eyebrow { display: inline-flex; align-items: center; gap: 6px; margin: 0; flex: 1; min-width: 0;
  font-size: 9px; font-weight: 800; letter-spacing: 0.16em; color: var(--pbk-accent); }
.pbk-eyebrow em { font-style: normal; color: var(--sd-text-muted); letter-spacing: 0.08em; }
.pbk-refresh { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 8px;
  cursor: pointer; color: var(--sd-text-muted); background: transparent; border: 1px solid var(--sd-border); }
.pbk-refresh:hover { color: var(--pbk-accent); border-color: var(--sd-border-strong); }
.spin { animation: sd-spin-slow 1.1s linear infinite; }

/* segmented meter — one cell per task */
.pbk-meter { display: flex; gap: 3px; }
.seg { flex: 1; height: 5px; border-radius: 3px; background: var(--sd-border-strong); min-width: 6px; }
.seg.done { background: var(--pbk-accent); box-shadow: 0 0 6px color-mix(in srgb, var(--pbk-accent) 45%, transparent); }
.seg.skipped { background: transparent; border: 1px dashed var(--sd-border-strong); height: 3px; align-self: center; }

/* task rows */
.pbk-list { display: flex; flex-direction: column; gap: 5px; }
.pbk-row { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; padding: 7px 9px;
  border-radius: 10px; background: var(--sd-surface); border: 1px solid var(--sd-border); }
.pbk-row.done { border-color: color-mix(in srgb, var(--pbk-accent) 26%, var(--sd-border)); }
.pbk-row.skipped { opacity: 0.62; }
.pbk-row.shim { height: 34px; border-style: dashed; position: relative; overflow: hidden; }
.pbk-row.shim::after { content: ''; position: absolute; inset: 0;
  background: linear-gradient(100deg, transparent 30%, color-mix(in srgb, var(--pbk-accent) 10%, transparent) 50%, transparent 70%);
  animation: pbk-shim 1.4s linear infinite; }
@keyframes pbk-shim { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
.pr-state { flex: none; display: grid; place-items: center; width: 18px; height: 18px;
  border-radius: 50%; color: var(--pbk-accent); background: color-mix(in srgb, var(--pbk-accent) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--pbk-accent) 30%, transparent); }
.pbk-row.skipped .pr-state { color: var(--sd-text-muted); background: var(--sd-surface-elevated);
  border-color: var(--sd-border); }
.pr-open { width: 6px; height: 6px; border-radius: 50%; border: 1.5px solid var(--sd-text-muted); }
.pr-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.pr-body b { font-size: 11.5px; font-weight: 700; color: var(--sd-text); line-height: 1.35;
  overflow: hidden; text-overflow: ellipsis; }
.pr-body b.struck { text-decoration: line-through; color: var(--sd-text-muted); }
.pr-meta { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.pr-meta em { font-style: normal; font-size: 8.5px; font-weight: 700; letter-spacing: 0.06em;
  color: var(--sd-text-muted); }
.pr-meta em.tpl { text-transform: uppercase; color: var(--pbk-accent); opacity: 0.85; }
.pr-meta em.note { font-style: italic; letter-spacing: 0; max-width: 240px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pr-verbs { display: flex; gap: 4px; }
.pr-btn { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 8px;
  cursor: pointer; color: var(--sd-text-secondary); background: var(--sd-surface-elevated);
  border: 1px solid var(--sd-border); transition: color 0.2s, border-color 0.2s; }
.pr-btn:hover:not(:disabled) { color: var(--pbk-accent); border-color: var(--sd-border-strong); }
.pr-btn.ok { color: var(--sd-success); }
.pr-btn:disabled { opacity: 0.45; cursor: default; }
.pr-note { display: flex; align-items: center; gap: 5px; width: 100%; }
.pr-note input { flex: 1; min-width: 0; padding: 6px 9px; border-radius: 9px; font: inherit;
  font-size: 11px; color: var(--sd-text); background: var(--sd-surface-elevated);
  border: 1px solid color-mix(in srgb, var(--pbk-accent) 40%, var(--sd-border)); outline: none; }
.pr-note input::placeholder { color: var(--sd-text-muted); }
.pbk-empty { margin: 2px 0; font-size: 11px; line-height: 1.5; color: var(--sd-text-muted); }
.pbk-retry { padding: 0; cursor: pointer; font: inherit; font-size: 11px; font-weight: 700;
  color: var(--pbk-accent); background: none; border: 0; text-decoration: underline; }

/* controls */
.pbk-controls { display: flex; flex-direction: column; gap: 7px; }
.pbk-apply { display: flex; align-items: center; gap: 7px; }
.pbk-sel { flex: 1; min-width: 0; }
.pbk-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border-radius: 10px;
  cursor: pointer; font: inherit; font-size: 11px; font-weight: 800; color: #1a1206;
  background: linear-gradient(122deg, var(--pbk-accent), color-mix(in srgb, var(--pbk-accent) 65%, #7a4d00));
  border: 1px solid transparent; }
.pbk-btn.ghost { color: var(--sd-text-secondary); background: var(--sd-surface-elevated);
  border-color: var(--sd-border); }
.pbk-btn.ghost:hover:not(:disabled) { color: var(--pbk-accent); border-color: var(--sd-border-strong); }
.pbk-btn:disabled { opacity: 0.5; cursor: default; }
.pbk-add { display: flex; align-items: center; gap: 7px; }
.pbk-add input { flex: 1; min-width: 0; padding: 8px 11px; border-radius: 10px; font: inherit;
  font-size: 11.5px; color: var(--sd-text); background: var(--sd-surface);
  border: 1px solid var(--sd-border); outline: none; transition: border-color 0.2s; }
.pbk-add input:focus { border-color: color-mix(in srgb, var(--pbk-accent) 50%, transparent); }
.pbk-add input::placeholder { color: var(--sd-text-muted); }
.pbk-hint { margin: 0; font-size: 8.5px; letter-spacing: 0.1em; color: var(--sd-text-muted); }

/* ═════ LIGHT THEME OVERRIDES ═════ */
[data-theme="light"] .pbk-row { background: rgba(255, 250, 240, 0.65); }
[data-theme="light"] .pbk-btn { color: #fff8ec; }
[data-theme="light"] .pbk-add input,
[data-theme="light"] .pr-note input { background: rgba(255, 250, 240, 0.75); }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .spin,
  html:not([data-cinematic="on"]) .pbk-row.shim::after { animation: none !important; }
}
</style>
