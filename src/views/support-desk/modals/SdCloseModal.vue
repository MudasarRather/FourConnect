<template>
  <Teleport to="body">
    <Presence>
      <Motion
        v-if="open" class="clm-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.22 }"
        @mousedown.self="!busy && $emit('close')"
      >
        <Motion
          class="clm" role="dialog" aria-modal="true"
          :initial="{ opacity: 0, y: 28, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18, scale: 0.98 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }"
        >
          <span class="clm-grain" aria-hidden="true" />
          <button class="clm-x" :disabled="busy" @click="$emit('close')"><X :size="17" /></button>

          <div class="clm-seal" :class="{ done }">
            <span class="seal-ring" /><span class="seal-ring r2" />
            <span class="seal-core"><component :is="done ? Check : Archive" :size="24" /></span>
          </div>

          <p class="clm-eyebrow sd-mono">CLOSE TICKET</p>
          <h2 class="clm-title">{{ done ? 'Ticket closed' : 'Close this ticket?' }}</h2>
          <p v-if="!done" class="clm-sub">{{ subText }}</p>
          <p v-else class="clm-sub">{{ ticket?.ticket_number }} is closed and archived in the record.</p>

          <template v-if="!done">
            <div class="clm-chip">
              <span class="cc-no sd-mono">{{ ticket?.ticket_number }}</span>
              <span class="cc-subj">{{ ticket?.subject }}</span>
            </div>

            <!-- early-close warning: ticket opened < 3 days ago -->
            <Presence>
              <Motion v-if="closingSoon" class="clm-warn"
                :initial="{ opacity: 0, y: -8, height: 0 }" :animate="{ opacity: 1, y: 0, height: 'auto' }"
                :exit="{ opacity: 0, height: 0 }" :transition="{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }">
                <span class="clm-warn-ic"><AlertTriangle :size="15" /></span>
                <span class="clm-warn-tx"><b>Opened {{ ageLabel }} ago</b> — under 3 days. {{ warnTail }}</span>
              </Motion>
            </Presence>

            <div class="clm-scroll">
            <p class="clm-q">Reason for closing</p>
            <div class="clm-reasons">
              <Motion as="button" v-for="(r, i) in REASONS" :key="r.code" type="button"
                class="creason" :class="{ on: chosen === r.code }"
                :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.28, delay: 0.04 * i }"
                :whileTap="{ scale: 0.96 }" @click="chosen = r.code">
                <component :is="r.icon" :size="14" /> {{ r.label }}
              </Motion>
            </div>

            <textarea v-model="note" rows="3" class="clm-note" maxlength="600"
              :placeholder="placeholder" />
            <p class="clm-counter sd-mono">{{ note.length }}/600</p>

            <div class="clm-proof" @click="pickFiles">
              <input ref="fileInput" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.gif,.webp" class="dz-input" @change="onFiles" />
              <component :is="uploading ? LoaderCircle : Paperclip" :size="15" :class="{ spin: uploading }" />
              <span>{{ uploading ? 'Uploading…' : 'Attach proof (optional)' }}</span>
              <span v-if="attachments.length" class="proof-n">{{ attachments.length }}</span>
            </div>
            <div v-if="attachments.length" class="att-list">
              <span v-for="(a, i) in attachments" :key="i" class="att"><Paperclip :size="11" /> <i>{{ a.name }}</i><button @click.stop="attachments.splice(i,1)"><X :size="10" /></button></span>
            </div>

            <button type="button" class="clm-notify" :class="{ on: notify }" @click="notify = !notify">
              <span class="cn-ic"><component :is="notify ? Bell : BellOff" :size="14" /></span>
              <span class="cn-tx">
                <b>Notify the requester</b>
                <i>{{ notify ? "They'll be emailed when this closes" : "They won't be notified" }}</i>
              </span>
              <span class="cn-switch"><span class="cn-knob" /></span>
            </button>
            </div>

            <ul class="clm-flow">
              <li><span class="wf-dot" /> Status becomes <b>Closed</b> (final)</li>
              <li><span class="wf-dot" /> SLA clock stops</li>
              <li><span class="wf-dot" /> {{ agent ? 'Reopening restarts the resolution SLA' : 'Reopening needs a support agent' }}</li>
              <li><span class="wf-dot" /> Kept in the permanent record</li>
            </ul>

            <p v-if="err" class="clm-err"><AlertTriangle :size="13" /> {{ err }}</p>

            <div class="clm-foot">
              <button class="clm-btn ghost" :disabled="busy" @click="$emit('close')">Keep open</button>
              <button class="clm-btn solid" :disabled="busy || note.trim().length < 3" @click="confirm">
                <component :is="busy ? LoaderCircle : Archive" :size="15" :class="{ spin: busy }" />
                {{ busy ? 'Closing…' : 'Close ticket' }}
              </button>
            </div>
          </template>
          <div v-else class="clm-foot center">
            <button class="clm-btn solid" @click="$emit('close')"><Check :size="15" /> Done</button>
          </div>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  X, Archive, Check, LoaderCircle, AlertTriangle, Paperclip,
  ShieldCheck, Copy, SearchX, Ban, History, Bell, BellOff,
} from 'lucide-vue-next'
import { resolveTicket, resolveMyTicket, uploadSupportFile } from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  ticket: { type: Object, default: null },
  agent: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'done'])

const REASONS = [
  { code: 'solved', label: 'Resolved & verified', icon: ShieldCheck },
  { code: 'duplicate', label: 'Duplicate', icon: Copy },
  { code: 'no_fault_found', label: 'No action needed', icon: SearchX },
  { code: 'cancelled', label: 'Cancelled', icon: Ban },
  { code: 'known_error', label: 'Superseded', icon: History },
]
const chosen = ref('solved')
const note = ref('')
const notify = ref(true)
const attachments = ref([])
const busy = ref(false)
const done = ref(false)
const err = ref('')
const uploading = ref(false)
const fileInput = ref(null)

/* Early-close guard — warn when closing a ticket opened under 3 days ago. */
const CLOSE_WARN_DAYS = 3
const ticketAgeMs = computed(() => {
  const c = props.ticket?.created_at
  return c ? Date.now() - new Date(c).getTime() : null
})
const closingSoon = computed(() => ticketAgeMs.value != null && ticketAgeMs.value < CLOSE_WARN_DAYS * 86400000)

/* Copy is agent-framed on the agent/admin portals (props.agent), requester-framed only on
   the end-client portal. /user/support is the AGENT portal — never address the closer as a
   requester here. */
const subText = computed(() => props.agent
  ? 'Closing finalises the ticket — the SLA clock stops and it stays on the permanent record. Record why for the audit trail.'
  : 'Closing finalises the ticket. The SLA clock stops and reopening it afterward needs a support agent — so record why.')
const warnTail = computed(() => props.agent
  ? 'Make sure it’s genuinely resolved before closing, or it’s likely to come back as a reopen.'
  : 'Confirm it’s genuinely resolved before closing; reopening afterward needs a support agent.')
const ageLabel = computed(() => {
  const ms = ticketAgeMs.value
  if (ms == null) return ''
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${Math.max(1, mins)}m`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
})

const placeholder = computed(() => ({
  solved: 'Confirm the resolution and how it was verified…',
  duplicate: 'Which ticket is this a duplicate of, and why…',
  no_fault_found: 'Why no further action is needed…',
  cancelled: 'Why this is being cancelled…',
  known_error: 'What supersedes this ticket…',
}[chosen.value] || 'Explain why this ticket is being closed (required)…'))

watch(() => props.open, (v) => {
  if (v) { chosen.value = 'solved'; note.value = ''; notify.value = true; attachments.value = []; busy.value = false; done.value = false; err.value = '' }
})

const pickFiles = () => fileInput.value?.click()
const onFiles = async (e) => {
  const files = Array.from(e.target.files || [])
  if (!files.length) return
  uploading.value = true
  for (const f of files) {
    if (f.size > 5 * 1024 * 1024) continue
    try { attachments.value.push(await uploadSupportFile(f)) } catch { /* ignore */ }
  }
  uploading.value = false
  if (fileInput.value) fileInput.value.value = ''
}

const confirm = async () => {
  if (note.value.trim().length < 3 || !props.ticket?.id) return
  busy.value = true; err.value = ''
  const payload = {
    resolution_code: chosen.value,
    resolution_summary: note.value.trim(),
    note: note.value.trim(),
    attachments: attachments.value.length ? attachments.value : undefined,
    notify_customer: notify.value,
    close: true,
  }
  try {
    await (props.agent ? resolveTicket(props.ticket.id, payload) : resolveMyTicket(props.ticket.id, payload))
    done.value = true
    setTimeout(() => emit('done'), 900)
  } catch (e) {
    err.value = e?.response?.data?.detail || 'Could not close the ticket.'
  } finally { busy.value = false }
}
</script>

<style scoped>
.clm-overlay { position: fixed; inset: 0; z-index: 2700; display: grid; place-items: center; padding: 24px; background: rgba(4,5,6,0.66); backdrop-filter: blur(12px) saturate(140%); }
[data-theme="light"] .clm-overlay { background: rgba(40,25,10,0.4); }
/* Shell is a flex column that never scrolls itself (overflow:hidden keeps all four
   corners clipped to the radius + clips the ::before top bar). The seal/title/chip/warning
   header and the flow/buttons footer are flex-shrink:0; only .clm-scroll (the middle) scrolls
   — mirrors the resolve modal so the scroll is on the components, not the whole modal. */
.clm { position: relative; width: min(540px, 94vw); max-height: 92vh; display: flex; flex-direction: column; overflow: hidden; text-align: center; padding: 28px 32px 22px;
  background: var(--sd-surface-elevated); border: 1px solid var(--sd-border-strong); border-radius: 24px; box-shadow: var(--sd-shadow-hover); }
.clm-seal, .clm-chip, .clm-warn, .clm-flow, .clm-err, .clm-foot { flex-shrink: 0; }
.clm-scroll { overflow-y: auto; text-align: left; margin-right: -10px; padding-right: 10px;
  scrollbar-width: thin; scrollbar-color: var(--sd-steel) transparent; }
.clm-scroll::-webkit-scrollbar { width: 8px; }
.clm-scroll::-webkit-scrollbar-track { background: transparent; }
.clm-scroll::-webkit-scrollbar-thumb { border-radius: 999px; border: 2px solid transparent; background: var(--sd-steel); background-clip: padding-box; transition: background 0.2s; }
.clm-scroll::-webkit-scrollbar-thumb:hover { background: var(--sd-text-secondary); background-clip: padding-box; }
.clm::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 3px; z-index: 2; background: linear-gradient(90deg, var(--sd-steel), var(--sd-text-muted)); border-radius: 24px 24px 0 0; }
.clm-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.35; border-radius: 24px; background-image: radial-gradient(rgba(156,163,175,0.05) 1px, transparent 1px); background-size: 18px 18px; }
.clm-x { position: absolute; top: 16px; right: 16px; z-index: 3; width: 32px; height: 32px; display: grid; place-items: center; border-radius: 9px; cursor: pointer; background: transparent; border: 1px solid var(--sd-border); color: var(--sd-text-muted); }
.clm-x:hover:not(:disabled) { color: var(--sd-text); border-color: var(--sd-border-strong); }
.clm-x:disabled { opacity: 0.4; cursor: not-allowed; }

.clm-seal { position: relative; width: 66px; height: 66px; margin: 4px auto 14px; display: grid; place-items: center; }
.seal-ring { position: absolute; inset: 0; border-radius: 50%; border: 1.5px solid color-mix(in srgb, var(--sd-steel) 50%, transparent); animation: clm-ping 2.6s ease-out infinite; }
.seal-ring.r2 { animation-delay: 1.3s; }
.seal-core { position: relative; width: 52px; height: 52px; border-radius: 50%; display: grid; place-items: center; color: #fff; background: linear-gradient(140deg, #64748b, #475569); box-shadow: 0 0 24px rgba(100,116,139,0.4); transition: background 0.4s; }
.clm-seal.done .seal-core { background: linear-gradient(140deg, var(--sd-success), #059669); }
.clm-seal.done .seal-ring { border-color: color-mix(in srgb, var(--sd-success) 45%, transparent); }

.clm-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.22em; color: var(--sd-text-muted); margin: 0 0 6px; }
.clm-title { font-size: 21px; font-weight: 800; color: var(--sd-text); margin: 0 0 8px; letter-spacing: -0.02em; }
.clm-sub { font-size: 12.5px; line-height: 1.5; color: var(--sd-text-secondary); margin: 0 auto 16px; max-width: 38ch; }

.clm-chip { display: flex; flex-direction: column; gap: 4px; text-align: left; padding: 11px 14px; border-radius: 13px; background: var(--sd-surface); border: 1px solid var(--sd-border); margin-bottom: 16px; }
.cc-no { font-size: 11px; font-weight: 700; color: var(--sd-amber); }
.cc-subj { font-size: 13.5px; font-weight: 650; color: var(--sd-text); line-height: 1.3; }

.clm-q { text-align: left; font-size: 12.5px; font-weight: 700; color: var(--sd-text-secondary); margin: 0 0 9px; }
.clm-reasons { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 13px; }
.creason { display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border-radius: 999px; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border); transition: all 0.16s var(--sd-spring); }
.creason:hover { border-color: var(--sd-border-strong); color: var(--sd-text); }
.creason.on { color: var(--sd-text); background: var(--sd-surface-glass); border-color: var(--sd-text-muted); box-shadow: 0 0 0 1px var(--sd-text-muted) inset; }

.clm-note { width: 100%; padding: 12px 13px; border-radius: 12px; font-size: 13.5px; font-family: inherit; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text); resize: vertical;
  transition: border-color 0.22s var(--sd-spring), box-shadow 0.28s var(--sd-spring), background 0.22s; }
.clm-note::placeholder { color: var(--sd-text-dim); }
.clm-note:hover:not(:focus) { border-color: var(--sd-text-muted); }
.clm-note:focus { outline: none; border-color: var(--sd-text-muted); background: var(--sd-surface); box-shadow: 0 0 0 3px var(--sd-steel-soft), 0 8px 20px -10px rgba(100, 116, 139, 0.4); }

/* early-close warning callout */
.clm-warn { display: flex; align-items: flex-start; gap: 9px; overflow: hidden; text-align: left; margin: 0 0 14px; padding: 11px 13px; border-radius: 13px;
  color: var(--sd-warning); background: var(--sd-warning-soft); border: 1px solid var(--sd-amber-border); }
.clm-warn-ic { flex-shrink: 0; display: grid; place-items: center; margin-top: 1px; }
.clm-warn-tx { font-size: 12px; line-height: 1.5; color: var(--sd-text-secondary); }
.clm-warn-tx b { color: var(--sd-warning); font-weight: 800; }
.clm-counter { text-align: right; font-size: 10px; color: var(--sd-text-dim); margin: 4px 2px 10px; }

.clm-proof { display: inline-flex; align-items: center; gap: 8px; position: relative; padding: 9px 13px; border-radius: 10px; cursor: pointer; font-size: 12px; font-weight: 600; color: var(--sd-text-muted); background: var(--sd-surface-glass); border: 1px dashed var(--sd-border-strong); }
.clm-proof:hover { color: var(--sd-text-secondary); border-color: var(--sd-text-muted); }
.dz-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.proof-n { display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px; font-size: 10px; font-weight: 800; color: #fff; background: var(--sd-steel); }
.att-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 9px; }
.att { display: inline-flex; align-items: center; gap: 5px; padding: 4px 6px 4px 9px; border-radius: 9px; font-size: 11px; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border); }
.att i { font-style: normal; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.att button { display: grid; place-items: center; width: 15px; height: 15px; border-radius: 50%; border: none; cursor: pointer; color: var(--sd-text-muted); background: var(--sd-border-strong); }

/* ultra-modern notify switch — clearly reads on/off (icon + subtitle + sliding switch) */
.clm-notify { display: flex; align-items: center; gap: 11px; width: 100%; margin-top: 14px; padding: 11px 13px; border-radius: 13px; cursor: pointer; text-align: left; font-family: inherit;
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); transition: border-color 0.2s var(--sd-spring), background 0.2s var(--sd-spring); }
.clm-notify:hover { border-color: var(--sd-text-muted); }
.clm-notify.on { border-color: color-mix(in srgb, var(--sd-success) 45%, transparent); background: var(--sd-success-soft); }
.cn-ic { flex-shrink: 0; display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; color: var(--sd-text-muted); background: var(--sd-surface); border: 1px solid var(--sd-border); transition: all 0.2s var(--sd-spring); }
.clm-notify.on .cn-ic { color: #fff; background: linear-gradient(140deg, var(--sd-success), #059669); border-color: transparent; transform: scale(1.04); }
.cn-tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.cn-tx b { font-size: 12.5px; font-weight: 700; color: var(--sd-text); }
.cn-tx i { font-style: normal; font-size: 11px; color: var(--sd-text-muted); }
.cn-switch { flex-shrink: 0; position: relative; width: 40px; height: 22px; border-radius: 999px; background: var(--sd-border-strong); transition: background 0.24s var(--sd-spring); }
.clm-notify.on .cn-switch { background: var(--sd-success); }
.cn-knob { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.32); transition: transform 0.26s var(--sd-spring); }
.clm-notify.on .cn-knob { transform: translateX(18px); }

.clm-flow { list-style: none; margin: 14px 0 0; padding: 13px 15px; border-radius: 13px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); text-align: left; display: flex; flex-direction: column; gap: 8px; }
.clm-flow li { display: flex; align-items: center; gap: 9px; font-size: 12px; color: var(--sd-text-secondary); }
.clm-flow b { color: var(--sd-text); font-weight: 700; }
.wf-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--sd-steel); flex-shrink: 0; }

.clm-err { display: flex; align-items: center; justify-content: center; gap: 7px; margin: 12px 0 0; font-size: 12.5px; color: var(--sd-danger); }
.clm-foot { display: flex; gap: 10px; margin-top: 18px; }
.clm-foot.center { justify-content: center; }
.clm-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 12px 18px; border-radius: 12px; font-size: 13.5px; font-weight: 700; cursor: pointer; font-family: inherit; border: 1px solid transparent; }
.clm-foot.center .clm-btn { flex: none; padding: 12px 32px; }
.clm-btn.ghost { color: var(--sd-text-secondary); background: var(--sd-surface); border-color: var(--sd-border-strong); }
.clm-btn.ghost:hover:not(:disabled) { color: var(--sd-text); }
.clm-btn.solid { color: #fff; background: linear-gradient(135deg, #64748b, #475569); box-shadow: 0 10px 24px rgba(71,85,105,0.32); }
.clm-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.clm-btn .spin, .clm-proof .spin { animation: clm-spin 1s linear infinite; }

@keyframes clm-ping { 0% { transform: scale(0.85); opacity: 0.7; } 100% { transform: scale(1.5); opacity: 0; } }
@keyframes clm-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .seal-ring,
  html:not([data-cinematic="on"]) .clm-btn .spin,
  html:not([data-cinematic="on"]) .clm-proof .spin { animation: none !important; }
}
</style>
