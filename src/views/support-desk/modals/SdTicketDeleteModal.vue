<template>
  <Teleport to="body">
    <Presence>
      <Motion
        v-if="open" class="dlm-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.22 }"
        @mousedown.self="!busy && $emit('close')"
      >
        <Motion
          class="dlm" role="dialog" aria-modal="true"
          :initial="{ opacity: 0, y: 26, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18, scale: 0.98 }" :transition="{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }"
        >
          <span class="dlm-grain" aria-hidden="true" />
          <button class="dlm-x" :disabled="busy" @click="$emit('close')"><X :size="17" /></button>

          <div class="dlm-seal" :class="{ done }">
            <span class="seal-ring" /><span class="seal-ring r2" />
            <span class="seal-core"><component :is="done ? Check : Archive" :size="25" /></span>
          </div>

          <p class="dlm-eyebrow sd-mono">ARCHIVE TICKET</p>
          <h2 class="dlm-title">{{ done ? 'Ticket archived' : 'Archive this ticket?' }}</h2>
          <p class="dlm-sub" v-if="!done">It is removed from active queues but fully restorable. The record and its history are preserved — this is a soft delete, never destructive.</p>
          <p class="dlm-sub" v-else>{{ ticket?.ticket_number }} moved to the archive. Restore it any time from the Archived view.</p>

          <template v-if="!done">
            <div class="dlm-chip">
              <span class="dc-no sd-mono">{{ ticket?.ticket_number }}</span>
              <span class="dc-subj">{{ ticket?.subject }}</span>
            </div>

            <p class="dlm-q">Reason for archiving <em>*</em></p>
            <div class="dlm-reasons">
              <Motion
                as="button" v-for="(r, i) in REASONS" :key="r.value" type="button"
                class="dreason" :class="{ on: preset === r.value }"
                :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.3, delay: 0.04 * i }"
                :whileTap="{ scale: 0.96 }" @click="pick(r)"
              >{{ r.label }}</Motion>
            </div>

            <textarea v-model="reason" rows="3" class="dlm-note" maxlength="500" placeholder="Add context for the audit trail (required)…" />
            <p class="dlm-counter sd-mono">{{ reason.length }}/500</p>

            <ul class="dlm-flow">
              <li><span class="df-dot warn" /> Hidden from all active lists &amp; boards</li>
              <li><span class="df-dot good" /> Restorable from the Archived view</li>
              <li><span class="df-dot good" /> Logged to the audit trail with your reason</li>
            </ul>

            <p v-if="err" class="dlm-err"><AlertTriangle :size="13" /> {{ err }}</p>

            <div class="dlm-foot">
              <button class="dlm-btn ghost" :disabled="busy" @click="$emit('close')">Cancel</button>
              <button class="dlm-btn danger" :disabled="busy || reason.trim().length < 2" @click="confirm">
                <component :is="busy ? LoaderCircle : Archive" :size="15" :class="{ spin: busy }" />
                {{ busy ? 'Archiving…' : 'Archive ticket' }}
              </button>
            </div>
          </template>
          <div v-else class="dlm-foot center">
            <button class="dlm-btn primary" @click="$emit('close')"><Check :size="15" /> Done</button>
          </div>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X, Archive, Check, LoaderCircle, AlertTriangle } from 'lucide-vue-next'
import { deleteTicket, ARCHIVE_REASON_CODES } from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  ticket: { type: Object, default: null },
})
const emit = defineEmits(['close', 'done'])

// Coded presets mirror the backend ArchiveReason taxonomy — the code drives the Deep
// Storage desk's analytics; the free text stays the human context on the audit trail.
// 'auto_retention' is sweep-only and 'compliance' is deliberately offered here too.
const REASONS = ARCHIVE_REASON_CODES.filter(r => r.value !== 'auto_retention')
const preset = ref('')
const reason = ref('')
const busy = ref(false)
const done = ref(false)
const err = ref('')

const pick = (r) => { preset.value = r.value; if (r.value !== 'other') reason.value = r.label }
watch(() => props.open, (v) => { if (v) { preset.value = ''; reason.value = ''; busy.value = false; done.value = false; err.value = '' } })

const confirm = async () => {
  if (reason.value.trim().length < 2 || !props.ticket?.id) return
  busy.value = true; err.value = ''
  try {
    await deleteTicket(props.ticket.id, reason.value.trim(), preset.value || 'other')
    done.value = true
    setTimeout(() => emit('done'), 900)
  } catch (e) {
    err.value = e?.response?.data?.detail || 'Could not archive the ticket.'
  } finally { busy.value = false }
}
</script>

<style scoped>
.dlm-overlay { position: fixed; inset: 0; z-index: 2700; display: grid; place-items: center; padding: 24px; background: rgba(4,5,6,0.66); backdrop-filter: blur(12px) saturate(140%); }
[data-theme="light"] .dlm-overlay { background: rgba(40,25,10,0.4); }
.dlm { position: relative; width: min(460px, 94vw); max-height: 92vh; overflow-y: auto; padding: 30px 28px 24px; text-align: center;
  background: var(--sd-surface-elevated); border: 1px solid var(--sd-border-strong); border-radius: 24px; box-shadow: var(--sd-shadow-hover); }
.dlm::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 3px; background: linear-gradient(90deg, var(--sd-steel), var(--sd-danger)); }
.dlm-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.4; border-radius: 24px; background-image: radial-gradient(rgba(156,163,175,0.05) 1px, transparent 1px); background-size: 18px 18px; }
.dlm-x { position: absolute; top: 16px; right: 16px; width: 32px; height: 32px; display: grid; place-items: center; border-radius: 9px; cursor: pointer; background: transparent; border: 1px solid var(--sd-border); color: var(--sd-text-muted); }
.dlm-x:hover:not(:disabled) { color: var(--sd-text); border-color: var(--sd-border-strong); }
.dlm-x:disabled { opacity: 0.4; cursor: not-allowed; }

.dlm-seal { position: relative; width: 74px; height: 74px; margin: 6px auto 16px; display: grid; place-items: center; }
.seal-ring { position: absolute; inset: 0; border-radius: 50%; border: 1.5px solid color-mix(in srgb, var(--sd-danger) 40%, transparent); animation: dlm-ping 2.4s ease-out infinite; }
.seal-ring.r2 { animation-delay: 1.2s; }
.seal-core { position: relative; width: 56px; height: 56px; border-radius: 50%; display: grid; place-items: center; color: #fff; background: linear-gradient(140deg, var(--sd-danger), #7c2d12); box-shadow: 0 0 26px color-mix(in srgb, var(--sd-danger) 36%, transparent); transition: background 0.4s; }
.dlm-seal.done .seal-core { background: linear-gradient(140deg, var(--sd-success), #059669); box-shadow: 0 0 26px color-mix(in srgb, var(--sd-success) 40%, transparent); }
.dlm-seal.done .seal-ring { border-color: color-mix(in srgb, var(--sd-success) 45%, transparent); }

.dlm-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.22em; color: var(--sd-danger); margin: 0 0 6px; }
.dlm-title { font-size: 21px; font-weight: 800; color: var(--sd-text); margin: 0 0 8px; letter-spacing: -0.02em; }
.dlm-sub { font-size: 13px; line-height: 1.5; color: var(--sd-text-secondary); margin: 0 auto 18px; max-width: 38ch; }

.dlm-chip { display: flex; flex-direction: column; gap: 4px; text-align: left; padding: 12px 14px; border-radius: 13px; background: var(--sd-surface); border: 1px solid var(--sd-border); margin-bottom: 18px; }
.dc-no { font-size: 11px; font-weight: 700; color: var(--sd-amber); }
.dc-subj { font-size: 13.5px; font-weight: 650; color: var(--sd-text); line-height: 1.3; }

.dlm-q { text-align: left; font-size: 12.5px; font-weight: 700; color: var(--sd-text-secondary); margin: 0 0 9px; }
.dlm-q em { color: var(--sd-danger); font-style: normal; }
.dlm-reasons { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 13px; }
.dreason { padding: 8px 13px; border-radius: 999px; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border); transition: all 0.16s var(--sd-spring); }
.dreason:hover { border-color: var(--sd-border-strong); color: var(--sd-text); }
.dreason.on { color: var(--sd-danger); background: var(--sd-danger-soft); border-color: color-mix(in srgb, var(--sd-danger) 40%, transparent); }

.dlm-note { width: 100%; padding: 12px 13px; border-radius: 12px; font-size: 13.5px; font-family: inherit; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text); resize: vertical; }
.dlm-note:focus { outline: none; border-color: color-mix(in srgb, var(--sd-danger) 40%, transparent); box-shadow: 0 0 0 3px var(--sd-danger-soft); }
.dlm-counter { text-align: right; font-size: 10px; color: var(--sd-text-dim); margin: 4px 2px 0; }

.dlm-flow { list-style: none; margin: 14px 0 0; padding: 13px 15px; border-radius: 13px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); text-align: left; display: flex; flex-direction: column; gap: 8px; }
.dlm-flow li { display: flex; align-items: center; gap: 9px; font-size: 12.5px; color: var(--sd-text-secondary); }
.df-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.df-dot.warn { background: var(--sd-warning); box-shadow: 0 0 8px var(--sd-warning); }
.df-dot.good { background: var(--sd-success); box-shadow: 0 0 8px var(--sd-success); }

.dlm-err { display: flex; align-items: center; justify-content: center; gap: 7px; margin: 13px 0 0; font-size: 12.5px; color: var(--sd-danger); }

.dlm-foot { display: flex; gap: 10px; margin-top: 20px; }
.dlm-foot.center { justify-content: center; }
.dlm-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 12px 18px; border-radius: 12px; font-size: 13.5px; font-weight: 700; cursor: pointer; font-family: inherit; border: 1px solid transparent; }
.dlm-foot.center .dlm-btn { flex: none; padding: 12px 32px; }
.dlm-btn.ghost { color: var(--sd-text-secondary); background: var(--sd-surface); border-color: var(--sd-border-strong); }
.dlm-btn.ghost:hover:not(:disabled) { color: var(--sd-text); }
.dlm-btn.danger { color: #fff; background: linear-gradient(135deg, var(--sd-danger), #7c2d12); box-shadow: 0 10px 24px color-mix(in srgb, var(--sd-danger) 28%, transparent); }
.dlm-btn.primary { color: #1a1206; background: var(--sd-grad-hero); }
[data-theme="light"] .dlm-btn.primary { color: #fff8ec; }
.dlm-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.dlm-btn .spin { animation: dlm-spin 1s linear infinite; }

@keyframes dlm-ping { 0% { transform: scale(0.8); opacity: 0.8; } 100% { transform: scale(1.5); opacity: 0; } }
@keyframes dlm-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .seal-ring, html:not([data-cinematic="on"]) .dlm-btn .spin { animation: none !important; }
}
</style>
