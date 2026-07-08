<template>
  <Teleport to="body">
    <Presence>
      <Motion
        v-if="open" class="wdm-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.22 }"
        @mousedown.self="!busy && $emit('close')"
      >
        <Motion
          class="wdm" role="dialog" aria-modal="true"
          :initial="{ opacity: 0, y: 26, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18, scale: 0.98 }" :transition="{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }"
        >
          <span class="wdm-grain" aria-hidden="true" />
          <button class="wdm-x" :disabled="busy" @click="$emit('close')"><X :size="17" /></button>

          <!-- morphing seal -->
          <div class="wdm-seal" :class="{ done }">
            <span class="seal-ring" /><span class="seal-ring r2" />
            <span class="seal-core"><component :is="done ? Check : Ban" :size="26" /></span>
          </div>

          <p class="wdm-eyebrow sd-mono">WITHDRAW REQUEST</p>
          <h2 class="wdm-title">{{ done ? 'Request withdrawn' : 'Withdraw this ticket?' }}</h2>
          <p class="wdm-sub" v-if="!done">This recalls the request from support. It stays in your history and can be reopened later — nothing is deleted.</p>
          <p class="wdm-sub" v-else>{{ ticket?.ticket_number }} has been withdrawn. Support has been notified.</p>

          <template v-if="!done">
            <div class="wdm-chip">
              <span class="wc-no sd-mono">{{ ticket?.ticket_number }}</span>
              <span class="wc-subj">{{ ticket?.subject }}</span>
            </div>

            <p class="wdm-q">Why are you withdrawing it?</p>
            <div class="wdm-reasons">
              <Motion
                as="button" v-for="(r, i) in REASONS" :key="r" type="button"
                class="wreason" :class="{ on: preset === r }"
                :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.3, delay: 0.04 * i }"
                :whileTap="{ scale: 0.96 }" @click="pick(r)"
              >{{ r }}</Motion>
            </div>

            <textarea
              v-model="reason" rows="3" class="wdm-note" maxlength="500"
              :placeholder="preset === 'Other' ? 'Tell support why (required)…' : 'Add any detail (required)…'"
            />
            <p class="wdm-counter sd-mono">{{ reason.length }}/500</p>

            <ul class="wdm-flow">
              <li><span class="wf-dot" /> Closed as <b>Withdrawn</b> — not deleted</li>
              <li><span class="wf-dot" /> Kept in your ticket history</li>
              <li><span class="wf-dot" /> Reopenable by you or support</li>
            </ul>

            <p v-if="err" class="wdm-err"><AlertTriangle :size="13" /> {{ err }}</p>

            <div class="wdm-foot">
              <button class="wdm-btn ghost" :disabled="busy" @click="$emit('close')">Keep ticket</button>
              <button class="wdm-btn danger" :disabled="busy || reason.trim().length < 2" @click="confirm">
                <component :is="busy ? LoaderCircle : Ban" :size="15" :class="{ spin: busy }" />
                {{ busy ? 'Withdrawing…' : 'Withdraw ticket' }}
              </button>
            </div>
          </template>
          <div v-else class="wdm-foot center">
            <button class="wdm-btn primary" @click="$emit('close')"><Check :size="15" /> Done</button>
          </div>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X, Ban, Check, LoaderCircle, AlertTriangle } from 'lucide-vue-next'
import { withdrawMyTicket } from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  ticket: { type: Object, default: null },
})
const emit = defineEmits(['close', 'done'])

const REASONS = ['Resolved it myself', 'Duplicate ticket', 'Created by mistake', 'No longer needed', 'Other']
const preset = ref('')
const reason = ref('')
const busy = ref(false)
const done = ref(false)
const err = ref('')

const pick = (r) => {
  preset.value = r
  reason.value = r === 'Other' ? '' : r
}

watch(() => props.open, (v) => {
  if (v) { preset.value = ''; reason.value = ''; busy.value = false; done.value = false; err.value = '' }
})

const confirm = async () => {
  if (reason.value.trim().length < 2 || !props.ticket?.id) return
  busy.value = true; err.value = ''
  try {
    await withdrawMyTicket(props.ticket.id, { reason: reason.value.trim() })
    done.value = true
    setTimeout(() => emit('done'), 900)
  } catch (e) {
    err.value = e?.response?.data?.detail || 'Could not withdraw the ticket.'
  } finally { busy.value = false }
}
</script>

<style scoped>
.wdm-overlay { position: fixed; inset: 0; z-index: 2700; display: grid; place-items: center; padding: 24px; background: rgba(4,5,6,0.66); backdrop-filter: blur(12px) saturate(140%); }
[data-theme="light"] .wdm-overlay { background: rgba(40,25,10,0.4); }
.wdm { position: relative; width: min(460px, 94vw); max-height: 92vh; overflow-y: auto; padding: 30px 28px 24px; text-align: center;
  background: var(--sd-surface-elevated); border: 1px solid var(--sd-border-strong); border-radius: 24px; box-shadow: var(--sd-shadow-hover); }
.wdm::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 3px; background: linear-gradient(90deg, var(--sd-danger), var(--sd-ember)); }
.wdm-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.4; border-radius: 24px; background-image: radial-gradient(rgba(239,68,68,0.05) 1px, transparent 1px); background-size: 18px 18px; }
.wdm-x { position: absolute; top: 16px; right: 16px; width: 32px; height: 32px; display: grid; place-items: center; border-radius: 9px; cursor: pointer; background: transparent; border: 1px solid var(--sd-border); color: var(--sd-text-muted); }
.wdm-x:hover:not(:disabled) { color: var(--sd-text); border-color: var(--sd-border-strong); }
.wdm-x:disabled { opacity: 0.4; cursor: not-allowed; }

.wdm-seal { position: relative; width: 74px; height: 74px; margin: 6px auto 16px; display: grid; place-items: center; }
.seal-ring { position: absolute; inset: 0; border-radius: 50%; border: 1.5px solid color-mix(in srgb, var(--sd-danger) 45%, transparent); animation: wdm-ping 2.4s ease-out infinite; }
.seal-ring.r2 { animation-delay: 1.2s; }
.seal-core { position: relative; width: 56px; height: 56px; border-radius: 50%; display: grid; place-items: center; color: #fff; background: linear-gradient(140deg, var(--sd-danger), var(--sd-ember-deep)); box-shadow: 0 0 26px color-mix(in srgb, var(--sd-danger) 40%, transparent); transition: background 0.4s; }
.wdm-seal.done .seal-core { background: linear-gradient(140deg, var(--sd-success), #059669); box-shadow: 0 0 26px color-mix(in srgb, var(--sd-success) 40%, transparent); }
.wdm-seal.done .seal-ring { border-color: color-mix(in srgb, var(--sd-success) 45%, transparent); }

.wdm-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.22em; color: var(--sd-danger); margin: 0 0 6px; }
.wdm-title { font-size: 21px; font-weight: 800; color: var(--sd-text); margin: 0 0 8px; letter-spacing: -0.02em; }
.wdm-sub { font-size: 13px; line-height: 1.5; color: var(--sd-text-secondary); margin: 0 auto 18px; max-width: 36ch; }

.wdm-chip { display: flex; flex-direction: column; gap: 4px; text-align: left; padding: 12px 14px; border-radius: 13px; background: var(--sd-surface); border: 1px solid var(--sd-border); margin-bottom: 18px; }
.wc-no { font-size: 11px; font-weight: 700; color: var(--sd-amber); }
.wc-subj { font-size: 13.5px; font-weight: 650; color: var(--sd-text); line-height: 1.3; }

.wdm-q { text-align: left; font-size: 12.5px; font-weight: 700; color: var(--sd-text-secondary); margin: 0 0 9px; }
.wdm-reasons { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 13px; }
.wreason { padding: 8px 13px; border-radius: 999px; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border); transition: all 0.16s var(--sd-spring); }
.wreason:hover { border-color: var(--sd-border-strong); color: var(--sd-text); }
.wreason.on { color: var(--sd-danger); background: var(--sd-danger-soft); border-color: color-mix(in srgb, var(--sd-danger) 40%, transparent); }

.wdm-note { width: 100%; padding: 12px 13px; border-radius: 12px; font-size: 13.5px; font-family: inherit; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text); resize: vertical; }
.wdm-note:focus { outline: none; border-color: color-mix(in srgb, var(--sd-danger) 40%, transparent); box-shadow: 0 0 0 3px var(--sd-danger-soft); }
.wdm-counter { text-align: right; font-size: 10px; color: var(--sd-text-dim); margin: 4px 2px 0; }

.wdm-flow { list-style: none; margin: 14px 0 0; padding: 13px 15px; border-radius: 13px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); text-align: left; display: flex; flex-direction: column; gap: 8px; }
.wdm-flow li { display: flex; align-items: center; gap: 9px; font-size: 12.5px; color: var(--sd-text-secondary); }
.wdm-flow b { color: var(--sd-text); font-weight: 700; }
.wf-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--sd-amber); flex-shrink: 0; box-shadow: 0 0 8px var(--sd-amber); }

.wdm-err { display: flex; align-items: center; justify-content: center; gap: 7px; margin: 13px 0 0; font-size: 12.5px; color: var(--sd-danger); }

.wdm-foot { display: flex; gap: 10px; margin-top: 20px; }
.wdm-foot.center { justify-content: center; }
.wdm-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 12px 18px; border-radius: 12px; font-size: 13.5px; font-weight: 700; cursor: pointer; font-family: inherit; border: 1px solid transparent; }
.wdm-foot.center .wdm-btn { flex: none; padding: 12px 32px; }
.wdm-btn.ghost { color: var(--sd-text-secondary); background: var(--sd-surface); border-color: var(--sd-border-strong); }
.wdm-btn.ghost:hover:not(:disabled) { color: var(--sd-text); }
.wdm-btn.danger { color: #fff; background: linear-gradient(135deg, var(--sd-danger), var(--sd-ember-deep)); box-shadow: 0 10px 24px color-mix(in srgb, var(--sd-danger) 30%, transparent); }
.wdm-btn.primary { color: #1a1206; background: var(--sd-grad-hero); }
[data-theme="light"] .wdm-btn.primary { color: #fff8ec; }
.wdm-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.wdm-btn .spin { animation: wdm-spin 1s linear infinite; }

@keyframes wdm-ping { 0% { transform: scale(0.8); opacity: 0.8; } 100% { transform: scale(1.5); opacity: 0; } }
@keyframes wdm-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .seal-ring, html:not([data-cinematic="on"]) .wdm-btn .spin { animation: none !important; }
}
</style>
