<template>
  <SdModalShell :open="!!ticket" eyebrow="L3 WORKBENCH · ROOT CAUSE" title="Record the root cause" width="620px"
    @close="$emit('close')">
    <div v-if="ticket" class="rcm">
      <div class="rcm-ctx sd-mono">
        <span class="rcm-no">{{ ticket.ticket_number }}</span>
        <span class="rcm-subj">{{ ticket.subject }}</span>
        <span class="rcm-mark"><FileSearch :size="11" /> CASE NOTES</span>
      </div>
      <p class="rcm-hint">The RCA outlives the ticket — it feeds the breach ledger, the problem file and the
        next engineer who meets this failure. Write it once, properly.</p>

      <label class="rcm-f"><span>Root cause <i>· what actually failed</i></span>
        <textarea v-model="summary" class="rcm-inp" rows="3"
          placeholder="The underlying cause, not the symptom…" /></label>

      <div class="rcm-f"><span>Cause category</span>
        <div class="rcm-chips">
          <button v-for="c in ROOT_CAUSES" :key="c.value" class="rcm-chip" :class="{ on: category === c.value }"
            @click="category = category === c.value ? '' : c.value">{{ c.label }}</button>
        </div>
      </div>

      <div v-if="isBreached" class="rcm-f"><span>Why did the SLA breach? <i>· goes to the breach ledger</i></span>
        <div class="rcm-chips">
          <button v-for="b in BREACH_REASONS" :key="b.value" class="rcm-chip warn" :class="{ on: breach === b.value }"
            @click="breach = breach === b.value ? '' : b.value">{{ b.label }}</button>
        </div>
      </div>

      <label class="rcm-f"><span>Corrective action <i>· what stopped the bleeding</i></span>
        <textarea v-model="corrective" class="rcm-inp" rows="2" placeholder="What was done right now…" /></label>
      <label class="rcm-f"><span>Preventive action <i>· what stops the recurrence</i></span>
        <textarea v-model="preventive" class="rcm-inp" rows="2" placeholder="The permanent measure…" /></label>

      <!-- promote to the problem file -->
      <div v-if="ticket.linked_problem_id" class="rcm-promote">
        <label class="rcm-check">
          <input v-model="promote" type="checkbox" />
          <span>Copy into the linked problem file <em>— root cause + the corrective action as its workaround</em></span>
        </label>
        <label v-if="promote" class="rcm-check sub">
          <input v-model="publish" type="checkbox" />
          <span>…and publish it as a <b>KNOWN ERROR</b> for every tier</span>
        </label>
      </div>
      <p v-else class="rcm-nolink sd-mono"><Fingerprint :size="10" /> NO PROBLEM ON THE STRING — LINK ONE (P) TO FILE THIS IN THE ARCHIVE.</p>
    </div>
    <template #footer>
      <button class="rcm-btn" @click="$emit('close')">Cancel</button>
      <button class="rcm-btn primary" :disabled="busy || !valid" @click="confirm">
        <Loader v-if="busy" :size="13" class="rcm-spin" /> Seal the record
      </button>
    </template>
  </SdModalShell>
</template>

<script setup>
/* SdRcaModal — the L3 root-cause console. Writes the ticket's structured RCA record
   (POST /rca: summary + corrective + preventive + coded breach reason) and can promote
   the finding straight into the linked problem file (root_cause + workaround, optionally
   published as a KNOWN ERROR) — closing the "resolution learns nothing" loophole. */
import { ref, computed, watch } from 'vue'
import { FileSearch, Fingerprint, Loader } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import SdModalShell from '../components/SdModalShell.vue'
import {
  setTicketRca, updateProblem, updateTicket, BREACH_REASONS, ROOT_CAUSES,
} from '@/composables/useSupportDesk'

const props = defineProps({ ticket: { type: Object, default: null } })
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const summary = ref('')
const category = ref('')
const breach = ref('')
const corrective = ref('')
const preventive = ref('')
const promote = ref(false)
const publish = ref(false)
const busy = ref(false)

const isBreached = computed(() =>
  (props.ticket?.sla_resolution_state || props.ticket?.sla_response_state) === 'breached')

watch(() => props.ticket, (t) => {
  summary.value = t?.rca_summary || ''
  category.value = t?.resolution_category || ''
  breach.value = t?.breach_reason || ''
  corrective.value = ''
  preventive.value = ''
  promote.value = false
  publish.value = false
  busy.value = false
})

const valid = computed(() => summary.value.trim().length >= 8)

const confirm = async () => {
  if (!props.ticket || !valid.value) return
  busy.value = true
  try {
    await setTicketRca(props.ticket.id, {
      rca_summary: summary.value.trim(),
      rca_corrective: corrective.value.trim() || null,
      rca_preventive: preventive.value.trim() || null,
      breach_reason: breach.value || null,
    })
    if (category.value) {
      // the cause taxonomy also rides the ticket's resolution_category for reporting
      try { await updateTicket(props.ticket.id, { resolution_category: category.value }) } catch { /* non-fatal */ }
    }
    if (promote.value && props.ticket.linked_problem_id) {
      const patch = { root_cause: summary.value.trim() }
      const wk = corrective.value.trim()
      if (wk) patch.workaround = wk
      if (publish.value) { patch.workaround_published = true; patch.status = 'known_error' }
      try { await updateProblem(props.ticket.linked_problem_id, patch) } catch { /* non-fatal */ }
    }
    toast.success(`Root cause sealed on ${props.ticket.ticket_number}${promote.value ? ' — copied to the case file.' : '.'}`)
    emit('done')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not save the RCA')
  } finally { busy.value = false }
}
</script>

<style scoped>
.rcm { display: flex; flex-direction: column; gap: 12px; }
.rcm-ctx { display: flex; align-items: center; gap: 9px; padding: 10px 12px; border-radius: 11px;
  border: 1px dashed var(--sd-border-strong); background: var(--sd-l3-soft); }
.rcm-no { font-size: 11px; font-weight: 800; color: var(--sd-l3-core); }
.rcm-subj { flex: 1; font-size: 12px; color: var(--sd-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rcm-mark { display: inline-flex; align-items: center; gap: 5px; font-size: 8.5px; font-weight: 800;
  letter-spacing: 0.14em; color: var(--sd-l3-core); }
.rcm-hint { margin: 0; font-size: 11.5px; line-height: 1.55; color: var(--sd-text-muted); }
.rcm-f { display: flex; flex-direction: column; gap: 5px; }
.rcm-f span { font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; color: var(--sd-text-muted); }
.rcm-f span i { font-style: normal; color: var(--sd-l3-warn); }
.rcm-inp { padding: 9px 11px; border-radius: 10px; resize: vertical; font-family: inherit; font-size: 12.5px;
  border: 1px solid var(--sd-border-strong); background: var(--sd-input-bg, var(--sd-surface)); color: var(--sd-text); }
.rcm-inp:focus { outline: none; border-color: var(--sd-l3-core); }
.rcm-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.rcm-chip { padding: 7px 11px; border-radius: 9px; font-size: 11px; font-weight: 700; cursor: pointer;
  font-family: inherit; border: 1px solid var(--sd-border); background: var(--sd-surface); color: var(--sd-text-muted); }
.rcm-chip.on { border-color: var(--sd-l3-core); color: var(--sd-l3-core); background: var(--sd-l3-soft); }
.rcm-chip.warn.on { border-color: var(--sd-l3-warn); color: var(--sd-l3-warn);
  background: color-mix(in srgb, var(--sd-l3-warn) 10%, transparent); }
.rcm-promote { display: flex; flex-direction: column; gap: 8px; padding: 11px 12px; border-radius: 11px;
  border: 1px dashed var(--sd-l3-brd); background: color-mix(in srgb, var(--sd-l3-core) 5%, transparent); }
.rcm-check { display: flex; align-items: flex-start; gap: 9px; font-size: 12px; color: var(--sd-text-secondary); cursor: pointer; }
.rcm-check.sub { margin-left: 22px; }
.rcm-check input { margin-top: 2px; accent-color: var(--sd-l3-core); }
.rcm-check em { font-style: normal; color: var(--sd-text-dim); }
.rcm-check b { color: var(--sd-l3-halt); }
.rcm-nolink { display: flex; align-items: center; gap: 6px; margin: 0; font-size: 8.5px; letter-spacing: 0.12em;
  color: var(--sd-text-dim); }
.rcm-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 15px; border-radius: 11px;
  font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: transparent; color: var(--sd-text-secondary); }
.rcm-btn.primary { border-color: transparent; color: #221604; background: var(--sd-l3-grad); }
.rcm-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.rcm-spin { animation: rcm-rot 0.9s linear infinite; }
@keyframes rcm-rot { to { transform: rotate(360deg); } }
</style>
