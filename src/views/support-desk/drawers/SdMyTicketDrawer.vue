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
          <div v-if="loading" class="sd-drawer-loading">Loading…</div>
          <template v-else-if="ticket">
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

            <div class="sd-drawer-body">
              <div v-if="ticket.description" class="sd-msg sd-msg--desc">
                <div class="sd-msg-head"><strong>You</strong><span>opened this ticket</span></div>
                <p class="sd-msg-body">{{ ticket.description }}</p>
              </div>
              <div v-for="c in ticket.comments" :key="c.id" class="sd-msg" :class="{ 'sd-msg--staff': c.author_kind === 'staff' }">
                <div class="sd-msg-head">
                  <strong>{{ c.author_kind === 'staff' ? (c.author_name || 'Support') : 'You' }}</strong>
                  <span class="sd-msg-time">{{ ago(c.created_at) }}</span>
                </div>
                <p class="sd-msg-body">{{ c.body }}</p>
              </div>

              <!-- CSAT prompt on resolved/closed -->
              <div v-if="canRate" class="sd-csat-box">
                <p class="sd-csat-q">How was your support experience?</p>
                <div class="sd-stars">
                  <button v-for="n in 5" :key="n" type="button" :class="{ lit: n <= (rating || 0) }" @click="rating = n"><Star :size="22" /></button>
                </div>
                <textarea v-model="csatComment" rows="2" placeholder="Optional comment…" class="sd-input" />
                <button class="sd-btn sd-btn-primary" :disabled="busy || !rating" @click="submitRating">Submit rating</button>
              </div>
              <div v-else-if="ticket.csat_score" class="sd-csat-done">You rated this {{ ticket.csat_score }}/5 — thank you!</div>

              <!-- Reply composer (open tickets) -->
              <div v-if="!isTerminal" class="sd-composer">
                <textarea v-model="reply" rows="3" placeholder="Add a reply…" />
                <div class="sd-composer-foot">
                  <span class="sd-hint">Support will be notified</span>
                  <button class="sd-btn sd-btn-sm sd-btn-primary" :disabled="busy || !reply.trim()" @click="send"><Send :size="14" /> Reply</button>
                </div>
              </div>
              <p v-if="err" class="sd-form-error">{{ err }}</p>
            </div>
          </template>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X, Send, Star } from 'lucide-vue-next'
import SdPill from '../components/SdPill.vue'
import { getMyTicket, replyMyTicket, rateMyTicket } from '@/composables/useSupportDesk'

const props = defineProps({ ticketId: { type: String, default: null } })
const emit = defineEmits(['close', 'changed'])

const ticket = ref(null)
const loading = ref(false)
const busy = ref(false)
const err = ref('')
const reply = ref('')
const rating = ref(0)
const csatComment = ref('')

const isTerminal = computed(() => ['resolved', 'closed'].includes(ticket.value?.status))
const canRate = computed(() => isTerminal.value && !ticket.value?.csat_score)

const load = async (id) => {
  loading.value = true; err.value = ''
  try { ticket.value = await getMyTicket(id); rating.value = 0; csatComment.value = '' }
  catch (e) { err.value = e?.response?.data?.detail || 'Failed to load ticket.'; ticket.value = null }
  finally { loading.value = false }
}
watch(() => props.ticketId, (id) => { if (id) load(id); else ticket.value = null })

const refresh = async () => { if (props.ticketId) { await load(props.ticketId); emit('changed') } }
const send = async () => {
  if (!reply.value.trim()) return
  busy.value = true; err.value = ''
  try { await replyMyTicket(props.ticketId, { body: reply.value.trim() }); reply.value = ''; await refresh() }
  catch (e) { err.value = e?.response?.data?.detail || 'Reply failed.' }
  finally { busy.value = false }
}
const submitRating = async () => {
  busy.value = true; err.value = ''
  try { await rateMyTicket(props.ticketId, { csat_score: rating.value, csat_comment: csatComment.value || null }); await refresh() }
  catch (e) { err.value = e?.response?.data?.detail || 'Rating failed.' }
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
</script>

<style scoped>
.sd-drawer-overlay { position: fixed; inset: 0; z-index: 2100; display: flex; justify-content: flex-end; background: rgba(4,5,6,0.55); backdrop-filter: blur(6px); }
[data-theme="light"] .sd-drawer-overlay { background: rgba(40,25,10,0.3); }
.sd-drawer { width: min(520px, 100vw); height: 100%; display: flex; flex-direction: column; background: var(--sd-surface-elevated); border-left: 1px solid var(--sd-border-strong); box-shadow: -20px 0 60px rgba(0,0,0,0.5); overflow: hidden; }
.sd-drawer-loading { padding: 40px; color: var(--sd-text-muted); }
.sd-drawer-head { padding: 22px 24px 16px; border-bottom: 1px solid var(--sd-border); }
.sd-dh-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.sd-dh-no { font-size: 13px; font-weight: 700; color: var(--sd-amber); }
.sd-dh-x { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 9px; cursor: pointer; background: transparent; border: 1px solid var(--sd-border); color: var(--sd-text-muted); }
.sd-dh-subject { font-size: 18px; font-weight: 800; color: var(--sd-text); margin: 0 0 10px; line-height: 1.25; }
.sd-dh-pills { display: flex; flex-wrap: wrap; gap: 7px; }
.sd-drawer-body { flex: 1; overflow-y: auto; padding: 18px 24px; display: flex; flex-direction: column; gap: 12px; }
.sd-msg { padding: 12px 14px; border-radius: 13px; background: var(--sd-surface); border: 1px solid var(--sd-border); }
.sd-msg--staff { background: var(--sd-amber-soft); border-color: var(--sd-amber-border); }
.sd-msg--desc { background: var(--sd-surface-glass); }
.sd-msg-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 12.5px; color: var(--sd-text-secondary); }
.sd-msg-head strong { color: var(--sd-text); }
.sd-msg-time { margin-left: auto; font-size: 11px; color: var(--sd-text-dim); }
.sd-msg-body { margin: 0; font-size: 13.5px; color: var(--sd-text); line-height: 1.5; white-space: pre-wrap; }
.sd-composer { border: 1px solid var(--sd-border-strong); border-radius: 13px; overflow: hidden; background: var(--sd-surface-glass); }
.sd-composer textarea { width: 100%; padding: 12px 14px; background: none; border: none; outline: none; color: var(--sd-text); font-size: 13.5px; font-family: inherit; resize: vertical; }
.sd-composer-foot { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-top: 1px solid var(--sd-border); }
.sd-hint { font-size: 11.5px; color: var(--sd-text-dim); }
.sd-csat-box { padding: 16px; border-radius: 13px; background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); display: flex; flex-direction: column; gap: 10px; }
.sd-csat-q { margin: 0; font-size: 14px; font-weight: 600; color: var(--sd-text); }
.sd-stars { display: flex; gap: 4px; }
.sd-stars button { background: none; border: none; cursor: pointer; color: var(--sd-text-dim); padding: 2px; }
.sd-stars button.lit { color: var(--sd-amber); }
.sd-csat-done { padding: 12px; border-radius: 11px; background: var(--sd-success-soft); color: var(--sd-success); font-size: 13px; font-weight: 600; text-align: center; }
.sd-input { width: 100%; padding: 10px 12px; border-radius: 10px; font-size: 13.5px; font-family: inherit; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text); resize: vertical; }
.sd-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 11px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; background: var(--sd-grad-hero); color: #1a1206; }
.sd-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.sd-btn-sm { padding: 8px 13px; }
[data-theme="light"] .sd-btn-primary { color: #fff8ec; }
.sd-form-error { color: var(--sd-danger); font-size: 12.5px; margin: 0; }
</style>
