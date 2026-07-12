<template>
  <SdModalShell :open="!!problem" eyebrow="L3 WORKBENCH · CASCADE SOLVE" title="Close the case — resolve every string"
    width="660px" @close="$emit('close')">
    <div v-if="problem" class="csm">
      <div class="csm-ctx sd-mono">
        <span class="csm-no">{{ problem.problem_number || 'PROBLEM' }}</span>
        <span class="csm-subj">{{ problem.title }}</span>
        <span class="csm-n">{{ (problem.linked_ticket_ids || []).length }} STRUNG</span>
      </div>

      <!-- results phase -->
      <template v-if="results">
        <div class="csm-verdict sd-mono" :class="{ ok: results.resolved > 0 }">
          <CheckCheck :size="14" /> RESOLVED {{ results.resolved }} · SKIPPED {{ results.skipped }} ·
          CASE {{ (results.problem_status || '').toUpperCase() }}
        </div>
        <div class="csm-results">
          <div v-for="r in results.results" :key="String(r.ticket_id)" class="csm-res" :class="{ ok: r.ok }">
            <component :is="r.ok ? Check : X" :size="12" />
            <b class="sd-mono">{{ r.ticket_number || shortId(r.ticket_id) }}</b>
            <span>{{ r.ok ? 'Resolved with the shared resolution.' : r.reason }}</span>
          </div>
          <p v-if="!results.results.length" class="csm-dim sd-mono">NO LINKED TICKETS TO ACT ON.</p>
        </div>
      </template>

      <!-- compose phase -->
      <template v-else>
        <p class="csm-hint">One shared resolution lands on <b>every linked, still-open ticket you can act on</b> —
          each one is checked individually and reported back. Already-resolved or out-of-scope tickets are skipped,
          never touched.</p>

        <label class="csm-f"><span>Shared resolution <i>· sent to every requester</i></span>
          <textarea v-model="summary" class="csm-inp" rows="3"
            placeholder="What was broken, what fixed it, what the requester should see now…" /></label>

        <div class="csm-f"><span>Resolution code</span>
          <div class="csm-chips">
            <button v-for="c in CODES" :key="c.value" class="csm-chip" :class="{ on: code === c.value }"
              @click="code = c.value">{{ c.label }}</button>
          </div>
        </div>
        <div class="csm-row">
          <div class="csm-f"><span>Cause category</span>
            <SdSelect v-model="category" :options="catOpts" placeholder="(uncategorised)" class="csm-sel" />
          </div>
        </div>
        <label class="csm-f"><span>Root cause on the case file <i>· optional</i></span>
          <textarea v-model="rootCause" class="csm-inp" rows="2"
            placeholder="Stamped onto the problem record…" /></label>
        <label class="csm-check">
          <input v-model="markResolved" type="checkbox" />
          <span>Mark the problem <b>RESOLVED</b> as the strings close</span>
        </label>
      </template>
    </div>
    <template #footer>
      <template v-if="results">
        <button class="csm-btn primary" @click="$emit('done')">Back to the wall</button>
      </template>
      <template v-else>
        <button class="csm-btn" @click="$emit('close')">Cancel</button>
        <button class="csm-btn primary" :disabled="busy || !valid" @click="fire">
          <Loader v-if="busy" :size="13" class="csm-spin" />
          Resolve {{ (problem.linked_ticket_ids || []).length }} linked ticket{{ (problem.linked_ticket_ids || []).length === 1 ? '' : 's' }}
        </button>
      </template>
    </template>
  </SdModalShell>
</template>

<script setup>
/* SdCascadeModal — the Zendesk problem→incident cascade. POST /problems/{pid}/resolve-linked
   resolves each linked, non-terminal, in-scope ticket with one shared resolution and returns
   per-ticket verdicts, which render as the second phase of this modal. Unowned tickets are
   taken over by the caller server-side (no owner ⇒ no resolution rule). */
import { ref, computed, watch } from 'vue'
import { CheckCheck, Check, X, Loader } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import SdModalShell from '../components/SdModalShell.vue'
import SdSelect from '../components/SdSelect.vue'
import { resolveLinkedProblemTickets, RESOLUTION_CODES, ROOT_CAUSES } from '@/composables/useSupportDesk'

const props = defineProps({ problem: { type: Object, default: null } })
const emit = defineEmits(['close', 'done'])
const toast = useToast()

// the codes that make sense for a cascade (a problem fix is never "duplicate"/"cancelled")
const CODES = RESOLUTION_CODES.filter(c => ['solved', 'workaround', 'known_error', 'configuration'].includes(c.value))
const catOpts = [{ value: '', label: '(uncategorised)' }, ...ROOT_CAUSES]

const summary = ref('')
const code = ref('solved')
const category = ref('')
const rootCause = ref('')
const markResolved = ref(true)
const busy = ref(false)
const results = ref(null)

watch(() => props.problem, (p) => {
  summary.value = ''
  code.value = p?.workaround_published ? 'known_error' : 'solved'
  category.value = ''
  rootCause.value = p?.root_cause || ''
  markResolved.value = true
  busy.value = false
  results.value = null
})

const valid = computed(() => summary.value.trim().length >= 8)
const shortId = (v) => String(v).slice(0, 8).toUpperCase()

const fire = async () => {
  if (!props.problem || !valid.value) return
  busy.value = true
  try {
    results.value = await resolveLinkedProblemTickets(props.problem.id, {
      resolution_summary: summary.value.trim(),
      resolution_code: code.value,
      resolution_category: category.value || null,
      root_cause: rootCause.value.trim() || null,
      mark_problem_resolved: markResolved.value,
    })
    toast.success(`Cascade fired — ${results.value.resolved} resolved, ${results.value.skipped} skipped.`)
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Cascade failed')
  } finally { busy.value = false }
}
</script>

<style scoped>
.csm { display: flex; flex-direction: column; gap: 12px; }
.csm-ctx { display: flex; align-items: center; gap: 9px; padding: 10px 12px; border-radius: 11px;
  border: 1px dashed var(--sd-border-strong); background: var(--sd-l3-soft); }
.csm-no { font-size: 11px; font-weight: 800; color: var(--sd-l3-core); }
.csm-subj { flex: 1; font-size: 12px; color: var(--sd-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.csm-n { font-size: 9px; font-weight: 800; letter-spacing: 0.12em; color: var(--sd-l3-string); }
.csm-hint { margin: 0; font-size: 11.5px; line-height: 1.55; color: var(--sd-text-muted); }
.csm-hint b { color: var(--sd-text); }
.csm-f { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 0; }
.csm-f span { font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; color: var(--sd-text-muted); }
.csm-f span i { font-style: normal; color: var(--sd-l3-warn); }
.csm-inp { padding: 9px 11px; border-radius: 10px; resize: vertical; font-family: inherit; font-size: 12.5px;
  border: 1px solid var(--sd-border-strong); background: var(--sd-input-bg, var(--sd-surface)); color: var(--sd-text); }
.csm-inp:focus { outline: none; border-color: var(--sd-l3-core); }
.csm-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.csm-chip { padding: 7px 11px; border-radius: 9px; font-size: 11px; font-weight: 700; cursor: pointer;
  font-family: inherit; border: 1px solid var(--sd-border); background: var(--sd-surface); color: var(--sd-text-muted); }
.csm-chip.on { border-color: var(--sd-l3-core); color: var(--sd-l3-core); background: var(--sd-l3-soft); }
.csm-row { display: flex; gap: 12px; flex-wrap: wrap; }
.csm-sel { width: 240px; flex: 0 0 auto; }
.csm-check { display: flex; align-items: flex-start; gap: 9px; font-size: 12px; color: var(--sd-text-secondary); cursor: pointer; }
.csm-check input { margin-top: 2px; accent-color: var(--sd-l3-core); }
.csm-check b { color: var(--sd-l3-go); }

.csm-verdict { display: flex; align-items: center; gap: 8px; padding: 11px 13px; border-radius: 11px;
  font-size: 10px; font-weight: 800; letter-spacing: 0.12em; color: var(--sd-text-muted);
  border: 1px solid var(--sd-border-strong); }
.csm-verdict.ok { color: var(--sd-l3-go); border-color: color-mix(in srgb, var(--sd-l3-go) 40%, transparent);
  background: color-mix(in srgb, var(--sd-l3-go) 8%, transparent); }
.csm-results { display: flex; flex-direction: column; gap: 6px; max-height: 260px; overflow-y: auto; }
.csm-res { display: flex; align-items: center; gap: 9px; padding: 8px 11px; border-radius: 9px;
  border: 1px solid var(--sd-border); font-size: 11.5px; color: var(--sd-text-muted); }
.csm-res b { color: var(--sd-text-secondary); font-size: 10px; letter-spacing: 0.06em; }
.csm-res svg { color: var(--sd-l3-warn); flex: 0 0 auto; }
.csm-res.ok svg { color: var(--sd-l3-go); }
.csm-dim { margin: 0; font-size: 9px; letter-spacing: 0.16em; color: var(--sd-text-dim); }

.csm-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 15px; border-radius: 11px;
  font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: transparent; color: var(--sd-text-secondary); }
.csm-btn.primary { border-color: transparent; color: #221604; background: var(--sd-l3-grad); }
.csm-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.csm-spin { animation: csm-rot 0.9s linear infinite; }
@keyframes csm-rot { to { transform: rotate(360deg); } }
</style>
