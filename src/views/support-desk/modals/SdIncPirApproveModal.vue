<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" class="ipa-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.22 }"
        @mousedown.self="!busy && $emit('close')">
        <Motion class="ipa" :class="mode" role="dialog" aria-modal="true" aria-label="Post-incident report sign-off"
          :initial="{ opacity: 0, y: 28, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18, scale: 0.98 }" :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }">
          <span class="ipa-accent" aria-hidden="true" />
          <button class="ipa-x" :disabled="busy" @click="$emit('close')"><X :size="17" /></button>

          <p class="ipa-eyebrow sd-mono">{{ mode === 'approve' ? 'SIGN-OFF · ONE-SHOT' : 'RETURN TO DRAFT' }}</p>
          <h2 class="ipa-title">
            <template v-if="mode === 'approve'">Approve <em>{{ pir?.report_number }}</em>?</template>
            <template v-else>Reject <em>{{ pir?.report_number }}</em> back to draft</template>
          </h2>
          <p class="ipa-sub">
            <template v-if="mode === 'approve'">Approval seals the document — no further edits without a
              reject. Your name and note land on the sign-off trail.</template>
            <template v-else>The author gets the report back in draft with your note. A rejection
              without a reason gives them nothing to fix — the note is required.</template>
          </p>

          <div class="ipa-doc">
            <b>{{ pir?.title }}</b>
            <span class="sd-mono">incident {{ pir?.ticket_number }} · by {{ pir?.created_by_name || '—' }}</span>
          </div>

          <label class="ipa-k">{{ mode === 'approve' ? 'Sign-off note (optional)' : 'What must change' }}
            <em v-if="mode === 'reject'" class="req">*</em></label>
          <textarea v-model="note" class="ipa-ta" rows="3" maxlength="1000"
            :placeholder="mode === 'approve' ? 'e.g. Solid five-why chain; actions tracked.' : 'e.g. Root cause conflates trigger with cause; corrective #2 has no owner…'" />

          <div class="ipa-foot">
            <button class="ipa-btn ghost" :disabled="busy" @click="$emit('close')">Cancel</button>
            <Motion as="button" class="ipa-btn primary" :disabled="busy || (mode === 'reject' && !note.trim())"
              :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }" @click="confirm">
              <Loader v-if="busy" :size="14" class="ipa-spin" />
              <component v-else :is="mode === 'approve' ? Stamp : Undo2" :size="14" />
              {{ mode === 'approve' ? 'Approve & seal' : 'Reject to draft' }}
            </Motion>
          </div>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
/* SdIncPirApproveModal — the ADMIN one-shot sign-off (approve seals; reject requires
   a note and returns the report to draft). 409 from the backend if the report left
   in_review meanwhile. */
import { ref, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import { X, Loader, Stamp, Undo2 } from 'lucide-vue-next'
import { approvePir, rejectPir } from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  pir: { type: Object, default: null },
  mode: { type: String, default: 'approve' },   // approve | reject
})
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const note = ref('')
const busy = ref(false)
watch(() => props.open, (v) => { if (v) note.value = '' })

const confirm = async () => {
  if (!props.pir) return
  busy.value = true
  try {
    if (props.mode === 'approve') {
      await approvePir(props.pir.id, { note: note.value.trim() || null })
      toast.success(`${props.pir.report_number} approved`)
    } else {
      await rejectPir(props.pir.id, { note: note.value.trim() })
      toast.info(`${props.pir.report_number} returned to draft`)
    }
    emit('done')
    emit('close')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Sign-off failed')
  } finally { busy.value = false }
}
</script>

<style scoped>
.ipa-overlay { position: fixed; inset: 0; z-index: 2700; display: grid; place-items: center;
  padding: 20px; background: rgba(5, 4, 2, 0.62); backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px); }
.ipa { position: relative; width: min(500px, 96vw); border-radius: 22px; padding: 24px 24px 20px;
  overflow: hidden; background: linear-gradient(180deg, var(--sd-surface-elevated), var(--sd-surface));
  border: 1px solid var(--sd-fun-brd); box-shadow: var(--sd-shadow-hover); }
[data-theme="light"] .ipa { background: linear-gradient(180deg, rgba(255, 250, 240, 0.92), rgba(255, 250, 240, 0.85)); }
.ipa-accent { position: absolute; inset: 0 0 auto 0; height: 3px; background: var(--sd-fun-grad); }
.ipa.reject .ipa-accent { background: linear-gradient(90deg, #ff9d94, var(--sd-fun-esc)); }
.ipa-x { position: absolute; top: 14px; right: 14px; display: grid; place-items: center; width: 30px;
  height: 30px; border-radius: 50%; cursor: pointer; background: var(--sd-surface);
  border: 1px solid var(--sd-border); color: var(--sd-text-muted); }
.ipa-eyebrow { margin: 0 0 6px; font-size: 9.5px; letter-spacing: 0.18em; color: var(--sd-fun-core); }
.ipa.reject .ipa-eyebrow { color: var(--sd-fun-esc); }
.ipa-title { margin: 0 0 4px; font-size: 20px; font-weight: 800; color: var(--sd-text); }
.ipa-title em { font-style: normal; background: var(--sd-fun-grad); -webkit-background-clip: text;
  background-clip: text; color: transparent; }
.ipa.reject .ipa-title em { background: linear-gradient(122deg, #ff9d94, var(--sd-fun-esc));
  -webkit-background-clip: text; background-clip: text; }
.ipa-sub { margin: 0 0 14px; font-size: 12px; line-height: 1.55; color: var(--sd-text-secondary); }
.ipa-doc { display: flex; flex-direction: column; gap: 3px; padding: 11px 14px; border-radius: 14px;
  margin-bottom: 14px; background: var(--sd-fun-soft); border: 1px solid var(--sd-fun-brd); }
.ipa-doc b { font-size: 13px; color: var(--sd-text); }
.ipa-doc span { font-size: 10px; color: var(--sd-text-muted); }
.ipa-k { display: block; margin-bottom: 7px; font-size: 11.5px; font-weight: 800; color: var(--sd-text); }
.req { color: var(--sd-fun-esc); font-style: normal; }
.ipa-ta { width: 100%; resize: vertical; padding: 10px 12px; border-radius: 12px; font: inherit;
  font-size: 12.5px; color: var(--sd-text); background: var(--sd-surface);
  border: 1px solid var(--sd-border); outline: none; }
.ipa-ta:focus { border-color: var(--sd-fun-brd); box-shadow: 0 0 0 3px var(--sd-fun-soft); }
.ipa-foot { display: flex; justify-content: flex-end; gap: 9px; margin-top: 16px; }
.ipa-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 20px;
  cursor: pointer; font-size: 12.5px; font-weight: 800; border: 1px solid transparent; }
.ipa-btn.ghost { color: var(--sd-text-secondary); background: var(--sd-surface); border-color: var(--sd-border); }
.ipa-btn.primary { color: #1a1206; background: var(--sd-fun-grad); box-shadow: 0 8px 20px var(--sd-fun-soft); }
[data-theme="light"] .ipa-btn.primary { color: #fff8ec; }
.ipa.reject .ipa-btn.primary { color: #fff4f0;
  background: linear-gradient(122deg, #ff8a7e, var(--sd-fun-esc) 60%, #a02c22); }
.ipa-btn:disabled { opacity: 0.55; cursor: default; }
.ipa-spin { animation: sd-spin-slow 1s linear infinite; }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .ipa-spin { animation: none !important; }
}
</style>
