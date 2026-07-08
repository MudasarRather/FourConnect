<template>
  <SdModalShell :open="open" eyebrow="RUN SLIDE · MACRO" :title="t ? `Run “${t.name}” on a ticket` : 'Run on ticket'"
    width="920px" @close="$emit('close')">
    <div v-if="t" class="ur">
      <!-- ── left: pick the target ticket ── -->
      <div class="ur-left">
        <div class="ur-lb sd-mono">1 · TARGET — TICKETS I'M WORKING</div>
        <div class="ur-search">
          <Search :size="13" />
          <input v-model="tq" type="text" placeholder="Search my open tickets…" />
        </div>
        <div class="ur-list">
          <div v-if="ticketsLoading" class="ur-note sd-mono">SCANNING MY QUEUE…</div>
          <div v-else-if="!shownTickets.length" class="ur-note sd-mono">NO OPEN TICKETS ASSIGNED TO YOU MATCH.</div>
          <button v-for="tk in shownTickets" :key="tk.id" class="ur-ticket" :class="{ on: target?.id === tk.id }"
            @click="pickTicket(tk)">
            <span class="ur-tk-num sd-mono">{{ tk.ticket_number }}</span>
            <span class="ur-tk-sub">{{ tk.subject }}</span>
            <span class="ur-tk-meta"><SdPill kind="status" :value="tk.status" /><SdPill kind="priority" :value="tk.priority" /></span>
          </button>
        </div>
      </div>

      <!-- ── right: mode + preview + switches ── -->
      <div class="ur-right">
        <div class="ur-lb sd-mono">2 · DELIVERY</div>
        <div class="ur-modes">
          <button class="ur-mode" :class="{ on: mode === 'internal_note' }" @click="mode = 'internal_note'">
            <EyeOff :size="13" />
            <span><b>Internal note</b><i>Only the desk sees it — the requester is never notified.</i></span>
          </button>
          <button class="ur-mode" :class="{ on: mode === 'reply' }" @click="mode = 'reply'">
            <MessageSquare :size="13" />
            <span><b>Public reply</b><i>Posts to the requester, notifies them, stops the response-SLA clock.</i></span>
          </button>
        </div>

        <div class="ur-lb sd-mono">3 · RENDERED BODY <em class="ur-dim">— variables resolved from the picked ticket; edit freely</em></div>
        <textarea v-model="body" rows="7" class="ur-body" :placeholder="target ? 'Rendered template body…' : 'Pick a ticket first — the template renders against it.'" />
        <p v-if="unknown.length" class="ur-warn sd-mono">⚠ Unresolved: {{ unknown.join(' ') }} — fill by hand before running.</p>

        <div class="ur-switches">
          <label class="ur-sw" :class="{ off: !t.priority }">
            <input v-model="applyPriority" type="checkbox" :disabled="!t.priority" />
            <span>Adopt priority <b v-if="t.priority">→ {{ t.priority }}</b><b v-else>— none on slide</b></span>
          </label>
          <label class="ur-sw" :class="{ off: !(t.tags || []).length }">
            <input v-model="mergeTags" type="checkbox" :disabled="!(t.tags || []).length" />
            <span>Merge tags <b v-if="(t.tags || []).length">→ {{ t.tags.slice(0, 4).map((x) => '#' + x).join(' ') }}</b><b v-else>— none on slide</b></span>
          </label>
          <label class="ur-sw" :class="{ off: !(t.checklist || []).length }">
            <input v-model="appendChecklist" type="checkbox" :disabled="!(t.checklist || []).length" />
            <span>Append checklist to the note <b v-if="(t.checklist || []).length">→ {{ t.checklist.length }} step(s)</b><b v-else>— none on slide</b></span>
          </label>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="ur-foot">
        <span class="ur-foot-note sd-mono">{{ target ? `${target.ticket_number} · ${mode === 'reply' ? 'PUBLIC REPLY' : 'INTERNAL NOTE'}` : 'PICK A TICKET' }}</span>
        <span class="ur-foot-gap" />
        <button class="ur-btn ghost" @click="$emit('close')">Cancel</button>
        <button class="ur-btn primary" :disabled="!canRun || busy" @click="run">
          <LoaderCircle v-if="busy" :size="14" class="ur-spin" /><Zap v-else :size="14" />
          Run macro
        </button>
      </div>
    </template>
  </SdModalShell>
</template>

<script setup>
/* SdUtplRunModal — the Zendesk-macro moment of the Projection Room: run a slide
   onto an EXISTING ticket the agent works. Picker = my assigned open tickets
   (scope 'my', active only); the body renders CLIENT-SIDE against the PICKED
   ticket's real context (single substitution engine; unresolved tokens stay
   visible and editable), then ships to the owner-tier-gated run-template
   endpoint — which counts the use as kind='macro' (never call /apply here). */
import { ref, computed, watch } from 'vue'
import { useToast } from 'vue-toastification'
import { Search, EyeOff, MessageSquare, Zap, LoaderCircle } from 'lucide-vue-next'
import SdModalShell from '../components/SdModalShell.vue'
import SdPill from '../components/SdPill.vue'
import { listMyTickets, runTemplateOnTicket } from '@/composables/useSupportDesk'
import { substituteTemplate, detectUnknownTokens } from '../templateVariables'

const props = defineProps({
  open: { type: Boolean, default: false },
  t: { type: Object, default: null },          // the template
  me: { type: Object, default: () => ({}) },   // { id, name }
  presetTicket: { type: Object, default: null },
})
const emit = defineEmits(['close', 'done'])

const toast = useToast()
const tickets = ref([])
const ticketsLoading = ref(false)
const tq = ref('')
const target = ref(null)
const mode = ref('internal_note')
const body = ref('')
const applyPriority = ref(false)
const mergeTags = ref(false)
const appendChecklist = ref(false)
const busy = ref(false)

const loadTickets = async () => {
  ticketsLoading.value = true
  try {
    const r = await listMyTickets({ scope: 'my', active_only: true, limit: 50, sort_by: 'updated_at', sort_dir: 'desc' })
    tickets.value = r?.items || r || []
  } catch { tickets.value = [] } finally { ticketsLoading.value = false }
}

watch(() => props.open, (o) => {
  if (!o) return
  tq.value = ''
  mode.value = 'internal_note'
  busy.value = false
  applyPriority.value = false
  mergeTags.value = false
  appendChecklist.value = false
  target.value = props.presetTicket || null
  body.value = ''
  loadTickets().then(() => { if (target.value) renderBody() })
  if (target.value) renderBody()
})

const shownTickets = computed(() => {
  const s = tq.value.trim().toLowerCase()
  if (!s) return tickets.value.slice(0, 30)
  return tickets.value.filter((tk) =>
    (tk.subject || '').toLowerCase().includes(s) || (tk.ticket_number || '').toLowerCase().includes(s)).slice(0, 30)
})

const ctxFor = (tk) => ({
  'requester.name': tk?.requester_name || tk?.raised_by_name || tk?.contact_name || '',
  'requester.email': tk?.requester_email || tk?.contact_email || '',
  'requester.department': tk?.department || '',
  'org.name': tk?.organization_name || '',
  'team.name': tk?.team_name || '',
  'agent.name': props.me?.name || '',
  'ticket.number': tk?.ticket_number || '',
  'ticket.subject': tk?.subject || '',
  date: new Date().toLocaleDateString(),
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
})

const renderBody = () => {
  let text = substituteTemplate(props.t?.body || '', ctxFor(target.value))
  if (appendChecklist.value && (props.t?.checklist || []).length) {
    const steps = props.t.checklist.map((c) => `- [ ] ${c.text || c}`).join('\n')
    text = `${text ? text + '\n\n' : ''}Checklist:\n${steps}`
  }
  body.value = text
}
const pickTicket = (tk) => { target.value = tk; renderBody() }
watch(appendChecklist, () => { if (target.value) renderBody() })

const unknown = computed(() => detectUnknownTokens(body.value))
const canRun = computed(() => !!target.value && !!body.value.trim())

const run = async () => {
  if (!canRun.value) return
  busy.value = true
  try {
    await runTemplateOnTicket(target.value.id, props.t.id, {
      mode: mode.value, body: body.value,
      apply_priority: applyPriority.value, merge_tags: mergeTags.value,
    })
    toast.success(`Macro run on ${target.value.ticket_number} — ${mode.value === 'reply' ? 'reply posted' : 'note added'}`)
    emit('done', { ticket: target.value, template: props.t, mode: mode.value })
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'The macro could not run.')
  } finally { busy.value = false }
}
</script>

<style scoped>
.ur { display: grid; grid-template-columns: 300px 1fr; gap: 18px; }
@media (max-width: 760px) { .ur { grid-template-columns: 1fr; } }
.ur-left, .ur-right { min-width: 0; display: flex; flex-direction: column; gap: 9px; }

.ur-lb { font-size: 8.5px; letter-spacing: 0.2em; color: var(--sd-text-muted); }
.ur-dim { font-style: normal; letter-spacing: 0.02em; opacity: 0.8; }

.ur-search {
  display: flex; align-items: center; gap: 7px; padding: 8px 11px; border-radius: 10px;
  background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text-muted);
}
.ur-search:focus-within { border-color: var(--sd-utpl-brd); }
.ur-search input { flex: 1; background: transparent; border: none; outline: none; font-size: 12.5px; color: var(--sd-text); }

.ur-list { display: flex; flex-direction: column; gap: 6px; max-height: 330px; overflow-y: auto; padding-right: 2px; }
.ur-note { font-size: 9px; letter-spacing: 0.16em; color: var(--sd-text-muted); padding: 14px 6px; }
.ur-ticket {
  display: flex; flex-direction: column; align-items: flex-start; gap: 4px; cursor: pointer; text-align: left;
  padding: 9px 11px; border-radius: 11px;
  background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text);
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s var(--sd-spring);
}
.ur-ticket:hover { transform: translateY(-1px); border-color: color-mix(in srgb, var(--sd-utpl-core) 40%, var(--sd-border)); }
.ur-ticket.on { border-color: var(--sd-utpl-core); box-shadow: 0 0 16px color-mix(in srgb, var(--sd-utpl-core) 18%, transparent); background: color-mix(in srgb, var(--sd-utpl-soft) 60%, var(--sd-surface)); }
.ur-tk-num { font-size: 9px; letter-spacing: 0.14em; color: var(--sd-utpl-hi); }
[data-theme="light"] .ur-tk-num { color: var(--sd-utpl-deep); }
.ur-tk-sub { font-size: 12px; font-weight: 650; line-height: 1.3; color: var(--sd-text); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.ur-tk-meta { display: flex; gap: 5px; }

.ur-modes { display: flex; flex-direction: column; gap: 7px; }
.ur-mode {
  display: flex; align-items: flex-start; gap: 10px; cursor: pointer; text-align: left;
  padding: 10px 12px; border-radius: 11px;
  background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text-secondary);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.ur-mode.on { border-color: var(--sd-utpl-core); color: var(--sd-text); box-shadow: 0 0 16px color-mix(in srgb, var(--sd-utpl-core) 16%, transparent); background: color-mix(in srgb, var(--sd-utpl-soft) 55%, var(--sd-surface)); }
.ur-mode svg { flex: 0 0 auto; margin-top: 2px; color: var(--sd-utpl-hi); }
[data-theme="light"] .ur-mode svg { color: var(--sd-utpl-core); }
.ur-mode span { display: flex; flex-direction: column; gap: 2px; }
.ur-mode b { font-size: 12.5px; font-weight: 800; }
.ur-mode i { font-style: normal; font-size: 10.5px; color: var(--sd-text-muted); line-height: 1.4; }

.ur-body {
  width: 100%; padding: 11px 13px; border-radius: 11px; font-size: 13px; line-height: 1.55;
  background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text);
  outline: none; resize: vertical; transition: border-color 0.2s, box-shadow 0.2s;
}
.ur-body:focus { border-color: var(--sd-utpl-brd); box-shadow: 0 0 14px color-mix(in srgb, var(--sd-utpl-core) 12%, transparent); }
.ur-warn { margin: 0; font-size: 10px; color: var(--sd-utpl-risk); }

.ur-switches { display: flex; flex-direction: column; gap: 7px; margin-top: 2px; }
.ur-sw {
  display: flex; align-items: center; gap: 9px; cursor: pointer;
  font-size: 12px; color: var(--sd-text-secondary);
  padding: 8px 11px; border-radius: 10px;
  background: var(--sd-surface); border: 1px solid var(--sd-border);
}
.ur-sw.off { opacity: 0.55; cursor: not-allowed; }
.ur-sw input { accent-color: var(--sd-utpl-core); }
.ur-sw b { font-weight: 700; color: var(--sd-utpl-hi); }
[data-theme="light"] .ur-sw b { color: var(--sd-utpl-deep); }

.ur-foot { display: flex; align-items: center; gap: 9px; width: 100%; }
.ur-foot-note { font-size: 9px; letter-spacing: 0.16em; color: var(--sd-text-muted); }
.ur-foot-gap { flex: 1; }
.ur-btn {
  display: inline-flex; align-items: center; gap: 7px; cursor: pointer;
  padding: 10px 16px; border-radius: 11px; font-size: 12.5px; font-weight: 800;
  border: 1px solid var(--sd-border); background: var(--sd-surface); color: var(--sd-text-secondary);
}
.ur-btn.primary { border: none; background: var(--sd-utpl-grad); color: #1b0f04; box-shadow: var(--sd-utpl-glow); }
[data-theme="light"] .ur-btn.primary { color: #fff7e9; }
.ur-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.ur-spin { animation: sd-spin-slow 1s linear infinite; }
</style>
