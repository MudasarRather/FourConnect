<template>
  <Teleport to="body">
    <Presence>
      <Motion
        v-if="ticketId"
        class="sd-drawer-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.22 }"
        @mousedown.self="$emit('close')"
      >
        <Motion
          class="sd-drawer"
          :initial="{ x: '100%' }" :animate="{ x: 0 }" :exit="{ x: '100%' }"
          :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }"
        >
          <div v-if="loading" class="sd-drawer-loading">Loading ticket…</div>
          <template v-else-if="ticket">
            <!-- Header -->
            <div class="sd-drawer-head">
              <div class="sd-dh-top">
                <span class="sd-dh-no sd-mono">{{ ticket.ticket_number }}</span>
                <button class="sd-dh-x" @click="$emit('close')"><X :size="18" /></button>
              </div>
              <h2 class="sd-dh-subject">{{ ticket.subject }}</h2>
              <div class="sd-dh-pills">
                <SdPill kind="priority" :value="ticket.priority" />
                <SdPill kind="status" :value="ticket.status" />
                <SdPill v-if="ticket.sla_resolution_state" kind="sla" :value="ticket.sla_resolution_state" />
              </div>
            </div>

            <!-- Action bar -->
            <div class="sd-actionbar">
              <div class="sd-action-status">
                <SdSelect v-model="nextStatus" :options="TICKET_STATUSES" />
                <button class="sd-btn sd-btn-sm sd-btn-primary" :disabled="busy || nextStatus === ticket.status" @click="applyStatus">Apply</button>
              </div>
              <button class="sd-btn sd-btn-sm" :disabled="busy" @click="assignMe"><UserCheck :size="14" /> Assign to me</button>
              <button class="sd-btn sd-btn-sm sd-btn-warn" :disabled="busy" @click="escalate"><Flame :size="14" /> Escalate</button>
              <button class="sd-btn sd-btn-sm" :disabled="busy" @click="createTask"><ListChecks :size="14" /> Create task</button>
            </div>
            <p v-if="linkMsg" class="sd-link-msg">{{ linkMsg }}</p>

            <!-- Tabs -->
            <div class="sd-drawer-tabs">
              <button v-for="t in TABS" :key="t" :class="{ active: tab === t }" @click="tab = t">{{ t }}</button>
            </div>

            <div class="sd-drawer-body">
              <!-- Conversation -->
              <div v-show="tab === 'Conversation'" class="sd-convo">
                <div v-if="ticket.description" class="sd-msg sd-msg--desc">
                  <div class="sd-msg-head"><strong>{{ ticket.contact_name || ticket.raised_by_name || 'Reporter' }}</strong><span>opened this ticket</span></div>
                  <p class="sd-msg-body">{{ ticket.description }}</p>
                </div>
                <div
                  v-for="c in ticket.comments"
                  :key="c.id"
                  class="sd-msg"
                  :class="{ 'sd-msg--internal': c.is_internal, 'sd-msg--staff': c.author_kind === 'staff' }"
                >
                  <div class="sd-msg-head">
                    <strong>{{ c.author_name || 'User' }}</strong>
                    <span v-if="c.is_internal" class="sd-internal-tag">internal note</span>
                    <span class="sd-msg-time">{{ ago(c.created_at) }}</span>
                  </div>
                  <p class="sd-msg-body">{{ c.body }}</p>
                </div>
                <p v-if="!ticket.comments?.length && !ticket.description" class="sd-empty">No conversation yet.</p>

                <!-- Composer -->
                <div class="sd-composer">
                  <textarea v-model="commentBody" rows="3" placeholder="Write a reply…" />
                  <div class="sd-composer-foot">
                    <label class="sd-internal-toggle">
                      <input type="checkbox" v-model="commentInternal" /> Internal note
                    </label>
                    <button class="sd-btn sd-btn-sm sd-btn-primary" :disabled="busy || !commentBody.trim()" @click="sendComment">
                      <Send :size="14" /> {{ commentInternal ? 'Add note' : 'Reply' }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Timeline -->
              <div v-show="tab === 'Timeline'" class="sd-timeline">
                <div v-for="a in ticket.activities" :key="a.id" class="sd-tl-item">
                  <span class="sd-tl-dot" />
                  <div class="sd-tl-body">
                    <span class="sd-tl-action">{{ a.action.replace('_', ' ') }}</span>
                    <span class="sd-tl-actor">{{ a.actor_name || 'System' }} · {{ ago(a.created_at) }}</span>
                  </div>
                </div>
                <p v-if="!ticket.activities?.length" class="sd-empty">No activity yet.</p>
              </div>

              <!-- SLA & Details -->
              <div v-show="tab === 'Details'" class="sd-details">
                <div class="sd-detail-grid">
                  <div class="sd-dt"><span>Response due</span><b>{{ fmt(ticket.response_due_at) }}</b></div>
                  <div class="sd-dt"><span>Resolution due</span><b>{{ fmt(ticket.resolution_due_at) }}</b></div>
                  <div class="sd-dt"><span>First responded</span><b>{{ fmt(ticket.first_responded_at) }}</b></div>
                  <div class="sd-dt"><span>Resolved</span><b>{{ fmt(ticket.resolved_at) }}</b></div>
                  <div class="sd-dt"><span>Organization</span><b>{{ ticket.organization_name || '—' }}</b></div>
                  <div class="sd-dt"><span>Category</span><b>{{ ticket.category_name || '—' }}</b></div>
                  <div class="sd-dt"><span>Assignee</span><b>{{ ticket.assigned_agent_name || 'Unassigned' }}</b></div>
                  <div class="sd-dt"><span>Type</span><b>{{ ticket.ticket_type }}</b></div>
                  <div class="sd-dt"><span>Source</span><b>{{ ticket.source }}</b></div>
                  <div class="sd-dt"><span>Created</span><b>{{ fmt(ticket.created_at) }}</b></div>
                </div>
                <div v-if="ticket.csat_score" class="sd-csat">CSAT: {{ ticket.csat_score }}/5 <span v-if="ticket.csat_comment">— {{ ticket.csat_comment }}</span></div>
                <p v-if="err" class="sd-form-error">{{ err }}</p>
              </div>
            </div>
          </template>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X, UserCheck, Flame, Send, ListChecks } from 'lucide-vue-next'
import SdPill from '../components/SdPill.vue'
import SdSelect from '../components/SdSelect.vue'
import {
  getTicket, changeTicketStatus, escalateTicket, assignTicket, addTicketComment, getMe,
  ticketToTask, TICKET_STATUSES,
} from '@/composables/useSupportDesk'

const props = defineProps({ ticketId: { type: String, default: null } })
const emit = defineEmits(['close', 'changed'])

const TABS = ['Conversation', 'Timeline', 'Details']
const tab = ref('Conversation')
const ticket = ref(null)
const loading = ref(false)
const busy = ref(false)
const err = ref('')
const nextStatus = ref('open')
const commentBody = ref('')
const commentInternal = ref(false)
const linkMsg = ref('')
let myId = null

const load = async (id) => {
  loading.value = true
  err.value = ''
  linkMsg.value = ''
  try {
    ticket.value = await getTicket(id)
    nextStatus.value = ticket.value.status
    tab.value = 'Conversation'
  } catch (e) {
    err.value = e?.response?.data?.detail || 'Failed to load ticket.'
    ticket.value = null
  } finally {
    loading.value = false
  }
}

watch(() => props.ticketId, (id) => {
  if (id) { load(id); if (!myId) getMe().then(u => { myId = u.id }).catch(() => {}) }
  else { ticket.value = null }
})

const refresh = async () => { if (props.ticketId) { await load(props.ticketId); emit('changed') } }

const applyStatus = async () => {
  busy.value = true; err.value = ''
  try { await changeTicketStatus(props.ticketId, { status: nextStatus.value }); await refresh() }
  catch (e) { err.value = e?.response?.data?.detail || 'Status change failed.' }
  finally { busy.value = false }
}
const escalate = async () => {
  busy.value = true; err.value = ''
  try { await escalateTicket(props.ticketId); await refresh() }
  catch (e) { err.value = e?.response?.data?.detail || 'Escalation failed.' }
  finally { busy.value = false }
}
const createTask = async () => {
  busy.value = true; err.value = ''
  try {
    const r = await ticketToTask(props.ticketId, {})
    await refresh()
    linkMsg.value = `Project task created${r.task_code ? ` (${r.task_code})` : ''} from this ticket.`
  } catch (e) { err.value = e?.response?.data?.detail || 'Could not create task.' }
  finally { busy.value = false }
}
const assignMe = async () => {
  if (!myId) { err.value = 'Could not resolve your user id.'; return }
  busy.value = true; err.value = ''
  try { await assignTicket(props.ticketId, { assigned_agent_id: myId }); await refresh() }
  catch (e) { err.value = e?.response?.data?.detail || 'Assignment failed.' }
  finally { busy.value = false }
}
const sendComment = async () => {
  if (!commentBody.value.trim()) return
  busy.value = true; err.value = ''
  try {
    await addTicketComment(props.ticketId, { body: commentBody.value.trim(), is_internal: commentInternal.value })
    commentBody.value = ''; commentInternal.value = false
    await refresh()
  } catch (e) { err.value = e?.response?.data?.detail || 'Reply failed.' }
  finally { busy.value = false }
}

const ago = (iso) => {
  if (!iso) return ''
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : '—')
</script>

<style scoped>
.sd-drawer-overlay {
  position: fixed; inset: 0; z-index: 2100; display: flex; justify-content: flex-end;
  background: rgba(4, 5, 6, 0.55); backdrop-filter: blur(6px);
}
[data-theme="light"] .sd-drawer-overlay { background: rgba(40, 25, 10, 0.3); }
.sd-drawer {
  width: min(560px, 100vw); height: 100%; display: flex; flex-direction: column;
  background: var(--sd-surface-elevated); border-left: 1px solid var(--sd-border-strong);
  box-shadow: -20px 0 60px rgba(0,0,0,0.5); overflow: hidden;
}
.sd-drawer-loading { padding: 40px; color: var(--sd-text-muted); }

.sd-drawer-head { padding: 22px 24px 16px; border-bottom: 1px solid var(--sd-border); }
.sd-dh-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.sd-dh-no { font-size: 13px; font-weight: 700; color: var(--sd-amber); }
.sd-dh-x { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 9px; cursor: pointer; background: transparent; border: 1px solid var(--sd-border); color: var(--sd-text-muted); }
.sd-dh-x:hover { color: var(--sd-text); }
.sd-dh-subject { font-size: 18px; font-weight: 800; color: var(--sd-text); margin: 0 0 10px; line-height: 1.25; }
.sd-dh-pills { display: flex; flex-wrap: wrap; gap: 7px; }

.sd-actionbar { display: flex; flex-wrap: wrap; gap: 9px; padding: 14px 24px; border-bottom: 1px solid var(--sd-border); background: var(--sd-surface-glass); }
.sd-action-status { display: flex; gap: 7px; align-items: center; flex: 1; min-width: 180px; }
.sd-action-status .sd-select { flex: 1; }
.sd-link-msg { margin: 0; padding: 8px 24px; font-size: 12.5px; color: var(--sd-success); background: var(--sd-success-soft); border-bottom: 1px solid var(--sd-border); }

.sd-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 10px; font-size: 12.5px; font-weight: 600; cursor: pointer; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); white-space: nowrap; }
.sd-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.sd-btn-sm { padding: 8px 12px; }
.sd-btn-primary { border: none; background: var(--sd-grad-hero); color: #1a1206; }
[data-theme="light"] .sd-btn-primary { color: #fff8ec; }
.sd-btn-warn { color: var(--sd-st-escalated); border-color: color-mix(in srgb, var(--sd-st-escalated) 35%, transparent); }

.sd-drawer-tabs { display: flex; gap: 4px; padding: 10px 24px 0; border-bottom: 1px solid var(--sd-border); }
.sd-drawer-tabs button { padding: 9px 14px; background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-size: 13px; font-weight: 600; color: var(--sd-text-muted); }
.sd-drawer-tabs button.active { color: var(--sd-text); border-bottom-color: var(--sd-amber); }

.sd-drawer-body { flex: 1; overflow-y: auto; padding: 18px 24px; }

.sd-convo { display: flex; flex-direction: column; gap: 12px; }
.sd-msg { padding: 12px 14px; border-radius: 13px; background: var(--sd-surface); border: 1px solid var(--sd-border); }
.sd-msg--staff { background: var(--sd-amber-soft); border-color: var(--sd-amber-border); }
.sd-msg--internal { background: var(--sd-warning-soft); border-color: color-mix(in srgb, var(--sd-warning) 30%, transparent); }
.sd-msg--desc { background: var(--sd-surface-glass); }
.sd-msg-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 12.5px; color: var(--sd-text-secondary); }
.sd-msg-head strong { color: var(--sd-text); }
.sd-msg-time { margin-left: auto; font-size: 11px; color: var(--sd-text-dim); }
.sd-internal-tag { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--sd-warning); padding: 2px 6px; border-radius: 5px; background: var(--sd-warning-soft); }
.sd-msg-body { margin: 0; font-size: 13.5px; color: var(--sd-text); line-height: 1.5; white-space: pre-wrap; }

.sd-composer { margin-top: 6px; border: 1px solid var(--sd-border-strong); border-radius: 13px; overflow: hidden; background: var(--sd-surface-glass); }
.sd-composer textarea { width: 100%; padding: 12px 14px; background: none; border: none; outline: none; color: var(--sd-text); font-size: 13.5px; font-family: inherit; resize: vertical; }
.sd-composer-foot { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-top: 1px solid var(--sd-border); }
.sd-internal-toggle { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--sd-text-muted); cursor: pointer; }

.sd-timeline { display: flex; flex-direction: column; gap: 0; }
.sd-tl-item { display: flex; gap: 12px; padding: 10px 0; position: relative; }
.sd-tl-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--sd-amber); margin-top: 4px; flex-shrink: 0; box-shadow: 0 0 8px var(--sd-fluid-glow); }
.sd-tl-body { display: flex; flex-direction: column; gap: 2px; }
.sd-tl-action { font-size: 13px; font-weight: 600; color: var(--sd-text); text-transform: capitalize; }
.sd-tl-actor { font-size: 11.5px; color: var(--sd-text-muted); }

.sd-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.sd-dt { display: flex; flex-direction: column; gap: 3px; }
.sd-dt span { font-size: 11px; color: var(--sd-text-muted); }
.sd-dt b { font-size: 13px; color: var(--sd-text); font-weight: 600; }
.sd-csat { margin-top: 16px; padding: 12px; border-radius: 11px; background: var(--sd-success-soft); color: var(--sd-success); font-size: 13px; font-weight: 600; }

.sd-empty { text-align: center; color: var(--sd-text-dim); font-size: 12.5px; padding: 20px; margin: 0; }
.sd-form-error { color: var(--sd-danger); font-size: 12.5px; margin: 12px 0 0; }
</style>
