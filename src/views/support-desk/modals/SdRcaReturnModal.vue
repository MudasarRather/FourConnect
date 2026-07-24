<template>
  <SdModalShell :open="open" :z="2700" eyebrow="RCA CLEARINGHOUSE · REVIEW" title="Return for revision"
    width="520px" @close="$emit('close')">
    <div v-if="ticket" class="rcr">
      <!-- record recap -->
      <div class="rcr-ctx">
        <span class="rcr-rail" aria-hidden="true" />
        <div class="rcr-ctx-body">
          <p class="rcr-line sd-mono"><b>{{ ticket.ticket_number }}</b>
            <span v-if="filerName" class="rcr-filer">FILED BY {{ filerName }}</span></p>
          <p class="rcr-subj">{{ ticket.subject }}</p>
          <p v-if="ticket.rca_summary" class="rcr-sum">"{{ ticket.rca_summary }}"</p>
        </div>
      </div>

      <p class="rcr-hint">A return bounces the filing back to its author with your note attached —
        the record stays on their desk until it comes back worth validating.</p>

      <!-- the mandatory note -->
      <label class="rcr-f">
        <span class="rcr-k">What must be fixed <em class="req">*</em>
          <i class="rcr-count sd-mono" :class="{ ok: noteLen >= 12 }">{{ noteLen }}<b>/ 12 min</b></i>
        </span>
        <textarea v-model="note" class="rcr-ta" rows="4"
          placeholder="Name the gap — e.g. 'Five-whys stops at the symptom; trace it to the config change that shipped on the 12th, and name the preventive control.'" />
      </label>

      <p v-if="err" class="rcr-err" role="alert"><CircleAlert :size="12" /> {{ err }}</p>
    </div>

    <template #footer>
      <button class="rcr-btn" :disabled="busy" @click="$emit('close')">Cancel</button>
      <Motion as="button" class="rcr-btn bounce" :disabled="busy || noteLen < 12"
        :while-hover="{ y: -2 }" :while-tap="{ scale: 0.96 }" @click="confirm">
        <Loader v-if="busy" :size="13" class="rcr-spin" /><CornerUpLeft v-else :size="13" />
        RETURN FOR REVISION
      </Motion>
    </template>
  </SdModalShell>
</template>

<script setup>
/*
  SdRcaReturnModal — the lead/admin bounce. A filed RCA that doesn't hold up is
  RETURNED with a mandatory note (backend requires ≥3 chars; we hold the line at
  ≥12 so the note actually says something). POST /tickets/{id}/rca/return flips
  rca_status → 'returned' and the filer sees the note on the console's red plate.
  Lead ∪ superuser only; 409 unless the filing is currently 'filed'.
*/
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import { CornerUpLeft, CircleAlert, Loader } from 'lucide-vue-next'
import SdModalShell from '../components/SdModalShell.vue'
import { returnTicketRca } from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  ticket: { type: Object, default: null },
})
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const note = ref('')
const err = ref('')
const busy = ref(false)

watch(() => props.open, (v) => { if (v) { note.value = ''; err.value = ''; busy.value = false } })

const noteLen = computed(() => note.value.trim().length)
const filerName = computed(() => props.ticket?.rca_filed_by_name || '')

const confirm = async () => {
  if (busy.value || noteLen.value < 12 || !props.ticket) return
  busy.value = true
  err.value = ''
  try {
    // board rows carry ticket_id; full tickets carry id — support both shapes
    await returnTicketRca(props.ticket.ticket_id || props.ticket.id, { note: note.value.trim() })
    toast.success(`${props.ticket.ticket_number} — filing returned to its author`)
    emit('done')
    emit('close')
  } catch (e) {
    const d = e?.response?.data?.detail
    err.value = typeof d === 'string' ? d : 'Could not return the filing — try again.'
  } finally { busy.value = false }
}
</script>

<style scoped>
.rcr { display: flex; flex-direction: column; gap: 13px; }

/* record recap */
.rcr-ctx { position: relative; display: flex; padding: 11px 13px 11px 17px; border-radius: 12px; overflow: hidden;
  border: 1px solid var(--sd-rcg-brd); background: var(--sd-rcg-soft); }
.rcr-rail { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--sd-rcg-bounce);
  animation: rcr-rail 2.4s ease-in-out infinite; }
@keyframes rcr-rail { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
html:not([data-cinematic="on"]) .rcr-rail { animation: none; }
.rcr-ctx-body { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.rcr-line { display: flex; align-items: baseline; gap: 9px; margin: 0; }
.rcr-line b { font-size: 12px; font-weight: 800; color: var(--sd-rcg-core); }
.rcr-filer { font-size: 8.5px; font-weight: 800; letter-spacing: 0.14em; color: var(--sd-rcg-dim); }
.rcr-subj { margin: 0; font-size: 12.5px; font-weight: 600; color: var(--sd-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rcr-sum { margin: 2px 0 0; font-size: 11.5px; font-style: italic; line-height: 1.5; color: var(--sd-text-muted);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.rcr-hint { margin: 0; font-size: 11.5px; line-height: 1.55; color: var(--sd-text-muted); }

/* the note */
.rcr-f { display: flex; flex-direction: column; gap: 6px; }
.rcr-k { display: flex; align-items: baseline; gap: 7px; font-size: 11px; font-weight: 800;
  letter-spacing: 0.05em; text-transform: uppercase; color: var(--sd-text-secondary); }
.rcr-k .req { color: var(--sd-rcg-bounce); font-style: normal; }
.rcr-count { margin-left: auto; font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em;
  font-style: normal; color: var(--sd-rcg-bounce); }
.rcr-count.ok { color: var(--sd-rcg-settle); }
.rcr-count b { font-weight: 600; color: var(--sd-text-dim); margin-left: 3px; }
.rcr-ta { width: 100%; resize: vertical; min-height: 84px; padding: 10px 12px; border-radius: 11px;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface-glass); color: var(--sd-text);
  font-size: 13px; line-height: 1.5; font-family: inherit; }
.rcr-ta:focus { outline: none; border-color: var(--sd-rcg-bounce); box-shadow: 0 0 0 3px var(--sd-rcg-bounce-soft); }
.rcr-ta::placeholder { color: var(--sd-text-dim); }

.rcr-err { display: flex; align-items: center; gap: 7px; margin: 0; padding: 8px 11px; border-radius: 9px;
  font-size: 11.5px; font-weight: 600; color: var(--sd-rcg-bounce);
  border: 1px solid color-mix(in srgb, var(--sd-rcg-bounce) 42%, transparent); background: var(--sd-rcg-bounce-soft); }

/* footer verbs */
.rcr-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 15px; border-radius: 11px;
  font-size: 11.5px; font-weight: 800; letter-spacing: 0.05em; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: transparent; color: var(--sd-text-secondary); }
.rcr-btn.bounce { border-color: transparent; color: #fff;
  background: linear-gradient(122deg, var(--sd-rcg-bounce) 0%, color-mix(in srgb, var(--sd-rcg-bounce) 70%, #000) 100%);
  box-shadow: 0 8px 20px -10px var(--sd-rcg-bounce); }
[data-theme="light"] .rcr-btn.bounce { color: #fff; }
.rcr-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.rcr-spin { animation: rcr-rot 0.9s linear infinite; }
@keyframes rcr-rot { to { transform: rotate(360deg); } }
</style>
