<template>
  <SdModalShell :open="!!ticket" eyebrow="PLAY MODE · SKIP" title="Skip this ticket" width="480px" @close="$emit('close')">
    <div v-if="ticket" class="skm">
      <div class="skm-ticket sd-mono">
        <span class="skm-no">{{ ticket.ticket_number }}</span>
        <span class="skm-subj">{{ ticket.subject }}</span>
      </div>
      <p class="skm-hint">A skip needs a reason — it returns the ticket to the pool for someone else, leaves a note in
        the timeline, and stays out of <em>your</em> rotation for the rest of the day. Supervisors see the skip report.</p>

      <div class="skm-reasons">
        <Motion v-for="(r, i) in SKIP_REASONS" :key="r.value" as="button" class="skm-r" :class="{ on: reason === r.value }"
          :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.3, delay: 0.04 + i * 0.05, ease: [0.16, 1, 0.3, 1] }"
          :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }" @click="reason = r.value">
          <SkipForward :size="13" /> {{ r.label }}
        </Motion>
      </div>

      <label class="skm-f">
        <span>Note <i v-if="reason === 'other'">· required for “Other”</i></span>
        <textarea v-model="note" class="skm-inp" rows="2" placeholder="What would the next agent want to know?" />
      </label>
    </div>
    <template #footer>
      <button class="skm-btn" @click="$emit('close')">Cancel</button>
      <button class="skm-btn primary" :disabled="busy || !valid" @click="confirm">
        <Loader v-if="busy" :size="13" class="skm-spin" /> Skip &amp; next
      </button>
    </template>
  </SdModalShell>
</template>

<script setup>
/* SdSkipModal — the Zendesk-style skip governor: reason REQUIRED, note required for
   'other'. On confirm it calls POST /tickets/{id}/skip and emits done so the play
   loop can serve the next ticket. */
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { SkipForward, Loader } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import SdModalShell from '../components/SdModalShell.vue'
import { skipTicket, SKIP_REASONS } from '@/composables/useSupportDesk'

const props = defineProps({ ticket: { type: Object, default: null } })
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const reason = ref('not_my_skill')
const note = ref('')
const busy = ref(false)
watch(() => props.ticket, () => { reason.value = 'not_my_skill'; note.value = ''; busy.value = false })

const valid = computed(() => !!reason.value && (reason.value !== 'other' || note.value.trim().length >= 4))
const confirm = async () => {
  if (!props.ticket || !valid.value) return
  busy.value = true
  try {
    await skipTicket(props.ticket.id, { reason_code: reason.value, note: note.value.trim() || null })
    emit('done', props.ticket)
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not skip this ticket')
  } finally { busy.value = false }
}
</script>

<style scoped>
.skm { display: flex; flex-direction: column; gap: 13px; }
.skm-ticket { display: flex; align-items: baseline; gap: 9px; padding: 10px 12px; border-radius: 11px;
  border: 1px dashed var(--sd-border-strong); background: color-mix(in srgb, var(--sd-qs-core) 5%, transparent); }
.skm-no { font-size: 11px; font-weight: 800; color: var(--sd-qs-core); }
.skm-subj { font-size: 12px; color: var(--sd-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.skm-hint { margin: 0; font-size: 11.5px; line-height: 1.5; color: var(--sd-text-muted); }
.skm-hint em { font-style: normal; color: var(--sd-text); }

.skm-reasons { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 7px; }
.skm-r { display: inline-flex; align-items: center; gap: 7px; padding: 9px 11px; border-radius: 11px;
  font-size: 11.5px; font-weight: 700; cursor: pointer; text-align: left; font-family: inherit;
  border: 1px solid var(--sd-border); background: var(--sd-surface); color: var(--sd-text-secondary);
  transition: border-color 0.2s, color 0.2s, background 0.2s; }
.skm-r.on { border-color: var(--sd-qs-core); color: var(--sd-qs-core); background: color-mix(in srgb, var(--sd-qs-core) 10%, transparent); }

.skm-f { display: flex; flex-direction: column; gap: 5px; }
.skm-f span { font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; color: var(--sd-text-muted); }
.skm-f i { font-style: normal; color: var(--sd-qs-warn); }
.skm-inp { padding: 9px 11px; border-radius: 10px; resize: vertical; font-family: inherit; font-size: 12.5px;
  border: 1px solid var(--sd-border-strong); background: var(--sd-input-bg, var(--sd-surface)); color: var(--sd-text); }
.skm-inp:focus { outline: none; border-color: var(--sd-qs-core); }

.skm-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 15px; border-radius: 11px;
  font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: transparent; color: var(--sd-text-secondary); }
.skm-btn.primary { border-color: transparent; color: #241703; background: linear-gradient(135deg, #ffd98a, var(--sd-qs-core)); }
.skm-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.skm-spin { animation: skm-rot 0.9s linear infinite; }
@keyframes skm-rot { to { transform: rotate(360deg); } }
</style>
