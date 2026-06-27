<template>
  <div class="sp-portal">
    <div class="sp-toggle"><ThemeToggle /></div>

    <div class="sp-shell">
      <SdLiquidBasin
        eyebrow="CLIENT SUPPORT PORTAL"
        title="Your request"
        subtitle="Track status, read replies and respond — no login required."
        variant="user"
        :metrics="[]"
        :actions="[]"
        :priority-counts="ambient"
      />

      <div v-if="loading" class="sp-state sd-card">Loading your ticket…</div>

      <div v-else-if="errorState" class="sp-state sd-card">
        <span class="sp-state-ico"><AlertCircle :size="30" /></span>
        <h3>{{ errorState === 'expired' ? 'This link has expired' : 'Ticket not found' }}</h3>
        <p>{{ errorState === 'expired' ? 'Please contact support for a fresh tracking link.' : 'Check the link, or raise a new request.' }}</p>
        <router-link class="sp-submit" to="/support/portal">Raise a new ticket</router-link>
      </div>

      <Motion
        v-else-if="ticket"
        as="div" class="sp-ticket sd-card"
        :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }"
      >
        <div class="sp-ticket-head">
          <span class="sp-tkt-no sd-mono">{{ ticket.ticket_number }}</span>
          <div class="sp-tkt-pills">
            <SdPill kind="priority" :value="ticket.priority" />
            <SdPill kind="status" :value="ticket.status" />
            <SdPill v-if="ticket.resolution_state" kind="sla" :value="ticket.resolution_state" />
          </div>
        </div>
        <h2 class="sp-tkt-subject">{{ ticket.subject }}</h2>
        <p class="sp-tkt-meta">
          <span v-if="ticket.organization_name">{{ ticket.organization_name }}</span>
          <span>· opened {{ fmt(ticket.created_at) }}</span>
        </p>

        <div class="sp-thread">
          <div v-if="ticket.description" class="sp-msg sp-msg--you">
            <div class="sp-msg-head"><strong>You</strong><span>opened this ticket</span></div>
            <p class="sp-msg-body">{{ ticket.description }}</p>
          </div>
          <div v-for="(c, i) in ticket.comments" :key="i" class="sp-msg" :class="c.author_kind === 'staff' ? 'sp-msg--staff' : 'sp-msg--you'">
            <div class="sp-msg-head">
              <strong>{{ c.author_kind === 'staff' ? (c.author_name || 'Support') : 'You' }}</strong>
              <span class="sp-msg-time">{{ fmt(c.created_at) }}</span>
            </div>
            <p class="sp-msg-body">{{ c.body }}</p>
          </div>
        </div>

        <div v-if="!isTerminal" class="sp-reply">
          <textarea v-model="reply" rows="3" placeholder="Add a reply…" />
          <div class="sp-reply-foot">
            <button class="sp-submit sp-submit--sm" :disabled="busy || !reply.trim()" @click="sendReply"><Send :size="14" /> {{ busy ? 'Sending…' : 'Reply' }}</button>
          </div>
        </div>
        <p v-else class="sp-closed-note">This ticket is {{ ticket.status }}. Need more help? <router-link to="/support/portal">Raise a new request</router-link>.</p>
        <p v-if="replyErr" class="sp-error">{{ replyErr }}</p>
      </Motion>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Motion } from 'motion-v'
import { Send, AlertCircle } from 'lucide-vue-next'
import SdLiquidBasin from '../support-desk/components/SdLiquidBasin.vue'
import SdPill from '../support-desk/components/SdPill.vue'
import ThemeToggle from '@/components/common/ThemeToggle.vue'
import { publicGetTicket, publicReplyTicket } from '@/composables/useSupportDesk'
import '../../styles/support-desk-theme.css'  // global token + keyframe injection (public page)

const route = useRoute()
const token = route.params.token
const ambient = { critical: 0, urgent: 1, high: 1, medium: 2, low: 2 }

const ticket = ref(null)
const loading = ref(true)
const errorState = ref(null) // 'expired' | 'notfound' | null
const reply = ref('')
const busy = ref(false)
const replyErr = ref('')

const isTerminal = computed(() => ['resolved', 'closed'].includes(ticket.value?.status))

const load = async () => {
  loading.value = true; errorState.value = null
  try { ticket.value = await publicGetTicket(token) }
  catch (e) {
    const code = e?.response?.status
    errorState.value = code === 410 ? 'expired' : 'notfound'
    ticket.value = null
  } finally { loading.value = false }
}
const sendReply = async () => {
  if (!reply.value.trim()) return
  busy.value = true; replyErr.value = ''
  try { await publicReplyTicket(token, { body: reply.value.trim() }); reply.value = ''; await load() }
  catch (e) { replyErr.value = e?.response?.data?.detail || 'Reply failed.' }
  finally { busy.value = false }
}
const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : '')
onMounted(load)
</script>

<style scoped>
@import '../../styles/support-desk-theme.css';

.sp-portal { min-height: 100vh; background: radial-gradient(120% 90% at 50% -10%, rgba(251, 146, 60, 0.08), transparent 55%), var(--sd-canvas); color: var(--sd-text); padding: 40px 20px 64px; }
.sp-toggle { position: fixed; top: 18px; right: 20px; z-index: 10; }
.sp-shell { max-width: 760px; margin: 0 auto; }

.sp-state { margin-top: 18px; padding: 40px 26px; text-align: center; color: var(--sd-text-muted); }
.sp-state-ico { display: inline-grid; place-items: center; width: 58px; height: 58px; border-radius: 16px; color: var(--sd-danger); background: var(--sd-danger-soft); margin-bottom: 14px; }
.sp-state h3 { font-size: 18px; font-weight: 800; color: var(--sd-text); margin: 0 0 8px; }
.sp-state p { margin: 0 0 18px; }

.sp-ticket { margin-top: 18px; padding: 26px; }
.sp-ticket-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; flex-wrap: wrap; }
.sp-tkt-no { font-size: 14px; font-weight: 700; color: var(--sd-amber); }
.sp-tkt-pills { display: flex; gap: 7px; flex-wrap: wrap; }
.sp-tkt-subject { font-size: 19px; font-weight: 800; color: var(--sd-text); margin: 0 0 5px; }
.sp-tkt-meta { font-size: 12.5px; color: var(--sd-text-muted); margin: 0 0 20px; display: flex; gap: 6px; flex-wrap: wrap; }

.sp-thread { display: flex; flex-direction: column; gap: 11px; margin-bottom: 18px; }
.sp-msg { padding: 12px 14px; border-radius: 13px; border: 1px solid var(--sd-border); }
.sp-msg--staff { background: var(--sd-amber-soft); border-color: var(--sd-amber-border); }
.sp-msg--you { background: var(--sd-surface-glass); }
.sp-msg-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 12.5px; color: var(--sd-text-secondary); }
.sp-msg-head strong { color: var(--sd-text); }
.sp-msg-time { margin-left: auto; font-size: 11px; color: var(--sd-text-dim); }
.sp-msg-body { margin: 0; font-size: 13.5px; color: var(--sd-text); line-height: 1.5; white-space: pre-wrap; }

.sp-reply { border: 1px solid var(--sd-border-strong); border-radius: 13px; overflow: hidden; background: var(--sd-surface-glass); }
.sp-reply textarea { width: 100%; padding: 12px 14px; background: none; border: none; outline: none; color: var(--sd-text); font-size: 13.5px; font-family: inherit; resize: vertical; }
.sp-reply-foot { display: flex; justify-content: flex-end; padding: 8px 12px; border-top: 1px solid var(--sd-border); }
.sp-closed-note { font-size: 13px; color: var(--sd-text-muted); text-align: center; margin: 0; }
.sp-closed-note a, .sp-state a { color: var(--sd-amber); }

.sp-submit { display: inline-flex; align-items: center; gap: 8px; padding: 11px 20px; border-radius: 12px; border: none; cursor: pointer; background: var(--sd-grad-hero); color: #1a1206; font-size: 14px; font-weight: 700; text-decoration: none; }
.sp-submit--sm { padding: 9px 15px; font-size: 13px; }
.sp-submit:disabled { opacity: 0.5; cursor: not-allowed; }
[data-theme="light"] .sp-submit { color: #fff8ec; }
.sp-error { font-size: 12.5px; color: var(--sd-danger); margin: 12px 0 0; }
</style>
