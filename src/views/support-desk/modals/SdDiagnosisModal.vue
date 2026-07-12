<template>
  <SdModalShell :open="!!ticket" eyebrow="L2 WORKBENCH · HANDOFF" title="Diagnosis dossier — escalate to L3" width="620px"
    @close="$emit('close')">
    <div v-if="ticket" class="dgm">
      <div class="dgm-ticket sd-mono">
        <span class="dgm-no">{{ ticket.ticket_number }}</span>
        <span class="dgm-subj">{{ ticket.subject }}</span>
        <span class="dgm-ladder">L2 <ArrowRight :size="11" /> <b>L3</b></span>
      </div>
      <p class="dgm-hint">Engineering takes over with what <em>you</em> already know. The dossier lands as an internal
        note on the ticket; the receiving lane's lead is notified.</p>

      <!-- diagnosis (the L3 gate) -->
      <label class="dgm-f">
        <span>Technical diagnosis <i>· required</i></span>
        <textarea v-model="diagnosis" class="dgm-inp" rows="4"
          placeholder="What was tried, what was ruled out, and the suspected root cause…" />
      </label>

      <!-- reason -->
      <div class="dgm-reasons">
        <Motion v-for="(r, i) in REASONS" :key="r.value" as="button" class="dgm-r" :class="{ on: reason === r.value }"
          :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.3, delay: 0.04 + i * 0.04, ease: [0.16, 1, 0.3, 1] }"
          :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }" @click="reason = r.value">
          {{ r.label }}
        </Motion>
      </div>

      <!-- optional: root-cause record -->
      <button class="dgm-fold" @click="showRca = !showRca">
        <ChevronRight :size="13" :class="{ open: showRca }" /> Root-cause record <em>· optional, saved with the ticket</em>
      </button>
      <Presence>
        <Motion v-if="showRca" as="div" class="dgm-rca" :initial="{ opacity: 0, height: 0 }"
          :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }" :transition="{ duration: 0.28 }">
          <label class="dgm-f"><span>Root cause so far</span>
            <textarea v-model="rcaSummary" class="dgm-inp" rows="2" placeholder="What is actually failing?" /></label>
          <label class="dgm-f"><span>Corrective action tried</span>
            <textarea v-model="rcaCorrective" class="dgm-inp" rows="2" placeholder="What was done to stop the bleeding?" /></label>
        </Motion>
      </Presence>

      <!-- optional: pin to a problem record -->
      <label class="dgm-f">
        <span>Link to a problem record <i>· optional — recurring incidents belong on a problem</i></span>
        <SdSelect v-model="problemId" :options="problemOpts" placeholder="(no problem link)" />
      </label>
    </div>
    <template #footer>
      <button class="dgm-btn" @click="$emit('close')">Cancel</button>
      <button class="dgm-btn primary" :disabled="busy || !valid" @click="confirm">
        <Loader v-if="busy" :size="13" class="dgm-spin" /> Hand off to L3
      </button>
    </template>
  </SdModalShell>
</template>

<script setup>
/* SdDiagnosisModal — the L2→L3 handoff dossier. Wraps the backend's diagnosis gate
   (tier-escalate to L3 422s without one) in a proper workbench: diagnosis + reason,
   optional RCA fields (POST /rca) and an optional problem link (PATCH linked_problem_id).
   The tier move itself rides the same tierEscalate the tier-move modal uses. */
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { ArrowRight, ChevronRight, Loader } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import SdModalShell from '../components/SdModalShell.vue'
import SdSelect from '../components/SdSelect.vue'
import { tierEscalate, setTicketRca, updateTicket, listProblems } from '@/composables/useSupportDesk'

const props = defineProps({ ticket: { type: Object, default: null } })
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const REASONS = [
  { value: 'complexity', label: 'Beyond L2 depth' },
  { value: 'needs_engineering', label: 'Needs a code / infra change' },
  { value: 'vendor_dependency', label: 'Vendor-level defect' },
  { value: 'recurring_problem', label: 'Recurring — needs root-cause work' },
  { value: 'security', label: 'Security implication' },
]

const diagnosis = ref('')
const reason = ref('complexity')
const showRca = ref(false)
const rcaSummary = ref('')
const rcaCorrective = ref('')
const problemId = ref('')
const problems = ref([])
const busy = ref(false)

const problemOpts = computed(() => [
  { value: '', label: '(no problem link)' },
  ...problems.value.map(p => ({ value: String(p.id), label: `${p.problem_number || p.code || ''} ${p.title || p.subject || ''}`.trim() })),
])

watch(() => props.ticket, async (t) => {
  diagnosis.value = ''; reason.value = 'complexity'; showRca.value = false
  rcaSummary.value = ''; rcaCorrective.value = ''; busy.value = false
  problemId.value = t?.linked_problem_id ? String(t.linked_problem_id) : ''
  if (t && !problems.value.length) {
    try {
      const r = await listProblems({ page: 1, limit: 50 })
      problems.value = r?.items || (Array.isArray(r) ? r : [])
    } catch { problems.value = [] }
  }
})

const valid = computed(() => diagnosis.value.trim().length >= 12)

const confirm = async () => {
  if (!props.ticket || !valid.value) return
  busy.value = true
  try {
    // Optional extras first — losing them shouldn't block the handoff, but the
    // handoff must not fire twice, so extras are best-effort.
    if (rcaSummary.value.trim() || rcaCorrective.value.trim()) {
      try {
        await setTicketRca(props.ticket.id, {
          rca_summary: rcaSummary.value.trim() || null,
          rca_corrective: rcaCorrective.value.trim() || null,
        })
      } catch { /* non-fatal */ }
    }
    const wantLink = problemId.value || null
    const hadLink = props.ticket.linked_problem_id ? String(props.ticket.linked_problem_id) : null
    if (wantLink !== hadLink) {
      try { await updateTicket(props.ticket.id, { linked_problem_id: wantLink }) } catch { /* non-fatal */ }
    }
    await tierEscalate(props.ticket.id, {
      to_tier: 3, reason_code: reason.value, diagnosis: diagnosis.value.trim(),
    })
    toast.success(`${props.ticket.ticket_number} handed off to L3 with the dossier.`)
    emit('done', props.ticket)
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Handoff failed')
  } finally { busy.value = false }
}
</script>

<style scoped>
.dgm { display: flex; flex-direction: column; gap: 13px; }
.dgm-ticket { display: flex; align-items: center; gap: 9px; padding: 10px 12px; border-radius: 11px;
  border: 1px dashed var(--sd-border-strong); background: var(--sd-l2-soft); }
.dgm-no { font-size: 11px; font-weight: 800; color: var(--sd-l2-core); }
.dgm-subj { flex: 1; font-size: 12px; color: var(--sd-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dgm-ladder { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 800;
  letter-spacing: 0.1em; color: var(--sd-text-dim); }
.dgm-ladder b { color: var(--sd-l2-core); }
.dgm-hint { margin: 0; font-size: 11.5px; line-height: 1.5; color: var(--sd-text-muted); }
.dgm-hint em { font-style: normal; color: var(--sd-text); }

.dgm-f { display: flex; flex-direction: column; gap: 5px; }
.dgm-f span { font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; color: var(--sd-text-muted); }
.dgm-f i { font-style: normal; color: var(--sd-l2-warn); }
.dgm-inp { padding: 9px 11px; border-radius: 10px; resize: vertical; font-family: inherit; font-size: 12.5px;
  border: 1px solid var(--sd-border-strong); background: var(--sd-input-bg, var(--sd-surface)); color: var(--sd-text); }
.dgm-inp:focus { outline: none; border-color: var(--sd-l2-core); }

.dgm-reasons { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 7px; }
.dgm-r { padding: 9px 11px; border-radius: 11px; font-size: 11.5px; font-weight: 700; cursor: pointer;
  text-align: left; font-family: inherit; border: 1px solid var(--sd-border); background: var(--sd-surface);
  color: var(--sd-text-secondary); transition: border-color 0.2s, color 0.2s, background 0.2s; }
.dgm-r.on { border-color: var(--sd-l2-core); color: var(--sd-l2-core); background: var(--sd-l2-soft); }

.dgm-fold { display: inline-flex; align-items: center; gap: 6px; padding: 0; border: none; background: none;
  cursor: pointer; font-family: inherit; font-size: 11.5px; font-weight: 800; color: var(--sd-text-secondary); }
.dgm-fold em { font-style: normal; font-weight: 600; color: var(--sd-text-dim); }
.dgm-fold svg { transition: transform 0.2s; }
.dgm-fold svg.open { transform: rotate(90deg); }
.dgm-rca { display: flex; flex-direction: column; gap: 10px; overflow: hidden; }

.dgm-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 15px; border-radius: 11px;
  font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: transparent; color: var(--sd-text-secondary); }
.dgm-btn.primary { border-color: transparent; color: #26120a; background: var(--sd-l2-grad); }
.dgm-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.dgm-spin { animation: dgm-rot 0.9s linear infinite; }
@keyframes dgm-rot { to { transform: rotate(360deg); } }
</style>
