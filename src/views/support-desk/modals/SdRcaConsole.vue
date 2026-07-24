<template>
  <Teleport to="body">
    <Presence>
      <Motion
        v-if="open" class="rca-overlay" :style="{ zIndex: z }"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.22 }"
        @mousedown.self="!busy && $emit('close')"
      >
        <Motion
          class="rca" role="dialog" aria-modal="true" aria-label="Root cause console"
          :initial="{ opacity: 0, y: 28, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18, scale: 0.98 }" :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }"
        >
          <span class="rca-accent" aria-hidden="true" />
          <button class="rca-x" :disabled="busy" @click="$emit('close')"><X :size="17" /></button>

          <!-- ══ header: identity + review state ══ -->
          <header class="rca-head">
            <p class="rca-eyebrow sd-mono">{{ isBreach ? 'BREACH AUTOPSY · ROOT CAUSE' : 'ROOT CAUSE CONSOLE · POST-INCIDENT' }}</p>
            <h2 class="rca-title">
              <template v-if="isBreach">Why did <em>{{ ticket?.ticket_number }}</em> miss its target?</template>
              <template v-else>Root cause for <em>{{ ticket?.ticket_number }}</em></template>
            </h2>
            <p v-if="ticket?.subject" class="rca-subj">{{ ticket.subject }}</p>
            <div class="rca-idrow">
              <SdIncSevBadge :sev="sev" />
              <SdRcaStatusStamp :row="ticket" :inherited="!!ticket?.rca_inherited_from_problem_id" />
              <span v-if="isBreach" class="rca-breachflag sd-mono"><Siren :size="10" /> SLA BREACHED</span>
            </div>
          </header>

          <div class="rca-scroll">
            <!-- ══ returned-for-revision plate — the respond-to-return loop ══ -->
            <Motion v-if="status === 'returned'" as="section" class="rca-plate returned"
              :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(0)">
              <span class="plate-rail" aria-hidden="true" />
              <p class="plate-eyebrow sd-mono"><CornerUpLeft :size="10" /> RETURNED FOR REVISION</p>
              <p class="plate-note">{{ ticket?.rca_review_note || 'The reviewer sent this filing back without a note.' }}</p>
              <p class="plate-meta sd-mono">{{ reviewerLine }} — address the note above, then re-file for review.</p>
            </Motion>

            <!-- ══ stale plate — reopen wiped the filing's authority ══ -->
            <Motion v-else-if="status === 'stale'" as="section" class="rca-plate stale"
              :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(0)">
              <span class="plate-rail" aria-hidden="true" />
              <p class="plate-eyebrow sd-mono"><History :size="10" /> WENT STALE ON REOPEN</p>
              <p class="plate-note">The ticket reopened after this root cause was written — the finding no longer
                covers the full story. Review it against what happened since, then re-file.</p>
            </Motion>

            <!-- ══ evidence fold: the SLA anatomy (breached tickets only) ══ -->
            <Motion v-if="isBreach && ticket" as="section" class="rca-fold"
              :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(1)">
              <button type="button" class="fold-t sd-mono" @click="evidenceOpen = !evidenceOpen">
                <FileSearch :size="12" /> EVIDENCE — SLA ANATOMY
                <ChevronDown :size="13" class="fold-ic" :class="{ open: evidenceOpen }" />
              </button>
              <div v-show="evidenceOpen" class="fold-body">
                <SdSlaAnatomy :ticket="ticket" :now="now" />
              </div>
            </Motion>

            <!-- ══ 1 · coded breach reason — owed ONLY when the ticket actually breached ══ -->
            <Motion v-if="isBreach" as="section" class="rca-f" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(2)">
              <label class="rca-k">Breach reason <em class="req">*</em> <i>coded — drives the breach-composition analytics</i></label>
              <div class="rca-chips">
                <button v-for="r in BREACH_REASONS" :key="r.value" type="button" class="rca-chip"
                  :class="{ on: form.breach_reason === r.value }"
                  @click="form.breach_reason = form.breach_reason === r.value ? '' : r.value">{{ r.label }}</button>
              </div>
            </Motion>

            <!-- ══ 2 · root-cause category (always required) ══ -->
            <Motion as="section" class="rca-f" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(3)">
              <label class="rca-k">Cause category <em class="req">*</em> <i>what class of failure was this</i></label>
              <div class="rca-chips">
                <button v-for="c in ROOT_CAUSES" :key="c.value" type="button" class="rca-chip cat"
                  :class="{ on: form.rca_category === c.value }"
                  @click="form.rca_category = form.rca_category === c.value ? '' : c.value">{{ c.label }}</button>
              </div>
            </Motion>

            <!-- ══ 3 · the finding ══ -->
            <Motion as="section" class="rca-f" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(4)">
              <label class="rca-k">What happened <em class="req">*</em>
                <span class="rca-count sd-mono" :class="{ short: summaryLen < 10 }">{{ summaryLen }}<b>/ 10 min</b></span>
              </label>
              <textarea v-model="form.rca_summary" class="rca-ta" rows="3"
                placeholder="The sequence of events that led here — facts, not blame…" />
            </Motion>

            <!-- ══ 4 · five whys — drill from symptom to cause ══ -->
            <Motion as="section" class="rca-f" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(5)">
              <label class="rca-k">Five whys <i>drill from the symptom to the cause — stop when a fix appears</i></label>
              <div class="rca-whys">
                <Motion v-for="(w, i) in whys" :key="i" class="why" :style="{ '--wi': i }"
                  :initial="{ opacity: 0, x: -12 }" :animate="{ opacity: 1, x: 0 }"
                  :transition="{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }">
                  <span class="why-tag sd-mono">WHY {{ i + 1 }}</span>
                  <input v-model="whys[i]" class="why-inp" type="text" maxlength="500"
                    :placeholder="i === 0 ? 'Why did it happen?' : 'And why was that?'" />
                  <button v-if="whys.length > 1" type="button" class="why-x" title="Remove this why" @click="removeWhy(i)">
                    <X :size="12" />
                  </button>
                </Motion>
                <p v-if="whys.length >= 5" class="why-cap sd-mono">FIVE DEEP — THAT'S THE FLOOR OF THE MINE.</p>
              </div>
            </Motion>

            <!-- ══ 5 · contributing factors ══ -->
            <Motion as="section" class="rca-f" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(6)">
              <label class="rca-k">Contributing factors <i>conditions that let it happen — Enter adds each · max 10</i></label>
              <div class="rca-facs">
                <span v-for="(f, i) in factors" :key="`${f}-${i}`" class="fac">
                  {{ f }}
                  <button type="button" class="fac-x" :title="`Remove '${f}'`" @click="removeFactor(i)"><X :size="10" /></button>
                </span>
                <input v-if="factors.length < 10" v-model="factorDraft" class="fac-inp" type="text" maxlength="240"
                  :placeholder="factors.length ? 'Add another…' : 'e.g. no alert on the queue depth…'"
                  @keydown.enter.prevent="addFactor" />
                <span v-else class="fac-full sd-mono">10 / 10</span>
              </div>
            </Motion>

            <!-- ══ 6 · corrective / preventive ══ -->
            <Motion as="section" class="rca-f two" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(7)">
              <div>
                <label class="rca-k">Corrective action</label>
                <textarea v-model="form.rca_corrective" class="rca-ta" rows="3" placeholder="What was done to repair THIS ticket…" />
              </div>
              <div>
                <label class="rca-k">Preventive action</label>
                <textarea v-model="form.rca_preventive" class="rca-ta" rows="3" placeholder="What stops the NEXT one — rota, routing, monitoring…" />
              </div>
            </Motion>

            <!-- ══ 7 · promote into the problem file ══ -->
            <Motion as="section" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(8)">
              <div v-if="ticket?.linked_problem_id" class="rca-promote">
                <p class="promote-eyebrow sd-mono"><Link2 :size="10" /> LINKED PROBLEM FILE</p>
                <label class="rca-check">
                  <input v-model="promote" type="checkbox" />
                  <span>Copy this finding into the problem file <em>— root cause + the corrective action as its workaround</em></span>
                </label>
                <label v-if="promote" class="rca-check sub">
                  <input v-model="publish" type="checkbox" />
                  <span>…and publish it as a <b>KNOWN ERROR</b> for every tier</span>
                </label>
              </div>
              <p v-else class="rca-nolink sd-mono">
                <Fingerprint :size="10" /> NO PROBLEM FILE ON THIS RECORD — LINK ONE FROM THE L3 WORKBENCH TO PROMOTE.
              </p>
            </Motion>
          </div>

          <!-- ══ backend rejection strip (422/409 detail — the console stays open) ══ -->
          <Presence>
            <Motion v-if="err" class="rca-err" role="alert"
              :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0 }"
              :transition="{ duration: 0.24 }">
              <CircleAlert :size="13" /> <span>{{ err }}</span>
              <button type="button" class="err-x" @click="err = ''"><X :size="12" /></button>
            </Motion>
          </Presence>

          <!-- ══ footer: live stamp + verdict ══ -->
          <div class="rca-foot">
            <span class="rca-stamp" :class="{ ready: canFile }">
              <FileSearch v-if="!canFile" :size="13" /><Check v-else :size="13" />
              {{ canFile ? 'READY TO FILE' : 'UNEXAMINED' }}
            </span>
            <span v-if="!canFile" class="rca-missing">{{ missingHint }}</span>
            <div class="rca-actions">
              <button class="rca-btn ghost" :disabled="busy" @click="$emit('close')">Cancel</button>
              <Motion as="button" class="rca-btn primary" :disabled="!canFile || busy"
                :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }" @click="save">
                <Loader v-if="busy" :size="14" class="rca-spin" /><FileCheck2 v-else :size="14" />
                {{ fileLabel }}
              </Motion>
            </div>
          </div>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
/*
  SdRcaConsole v2 — THE unified RCA capture surface. One crimson autopsy console
  shared by the Breached desk, the ticket drawer, the war-room and the RCA desks;
  it absorbed the three scattered forms (v1 console, the L3 SdRcaModal promote
  block, the drawer inline form). Captures the full structured record — coded
  breach reason (breached tickets ONLY — v1 wrongly gated non-breached SEV1/2),
  cause category, summary, five-whys drill, contributing factors, corrective /
  preventive — and can promote the finding into the linked problem file
  (optionally published as a KNOWN ERROR). POST /tickets/{id}/rca sets
  rca_status='filed'; the review loop (validate / return) lives with the leads —
  the RETURNED plate here closes that loop from the filer's side.
*/
import { reactive, ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  X, Check, Loader, FileSearch, FileCheck2, CornerUpLeft, ChevronDown,
  CircleAlert, Fingerprint, Link2, History, Siren,
} from 'lucide-vue-next'
import SdSlaAnatomy from '../components/SdSlaAnatomy.vue'
import SdIncSevBadge from '../components/SdIncSevBadge.vue'
import SdRcaStatusStamp from '../components/SdRcaStatusStamp.vue'
import {
  setTicketRca, updateProblem, BREACH_REASONS, ROOT_CAUSES, rcaStatusOf, sevOf,
} from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  ticket: { type: Object, default: null },
  now: { type: Number, default: () => Date.now() },
  // stack rung — default matches v1's fixed rung so every existing call site is
  // untouched; war-room-launched contexts (console at z5200) pass 5300.
  z: { type: Number, default: 3000 },
})
const emit = defineEmits(['close', 'saved'])
const toast = useToast()

/* ── form state ── */
const form = reactive({
  breach_reason: '', rca_category: '', rca_summary: '', rca_corrective: '', rca_preventive: '',
})
const whys = ref([''])
const factors = ref([])
const factorDraft = ref('')
const promote = ref(false)
const publish = ref(false)
const evidenceOpen = ref(true)
const err = ref('')
const busy = ref(false)

watch(() => props.open, (v) => {
  if (!v || !props.ticket) return
  const t = props.ticket
  form.breach_reason = t.breach_reason || ''         // kept even when the block is hidden
  form.rca_category = t.rca_category || ''
  form.rca_summary = t.rca_summary || ''
  form.rca_corrective = t.rca_corrective || ''
  form.rca_preventive = t.rca_preventive || ''
  const w = Array.isArray(t.rca_five_whys) ? t.rca_five_whys.map(x => String(x ?? '')).filter(x => x.trim()).slice(0, 5) : []
  whys.value = w.length ? [...w] : ['']
  factors.value = Array.isArray(t.rca_factors) ? t.rca_factors.map(x => String(x ?? '')).filter(x => x.trim()).slice(0, 10) : []
  factorDraft.value = ''
  promote.value = false
  publish.value = false
  evidenceOpen.value = true
  err.value = ''
})

/* ── derived ── */
const status = computed(() => (props.ticket ? rcaStatusOf(props.ticket) : 'owed'))
const sev = computed(() => sevOf(props.ticket))
const isBreach = computed(() => !!(props.ticket?.sla_response_breached || props.ticket?.sla_resolution_breached))
const summaryLen = computed(() => form.rca_summary.trim().length)

const reviewerLine = computed(() => {
  const who = props.ticket?.rca_reviewed_by_name || 'A reviewer'
  const at = props.ticket?.rca_reviewed_at
  return at ? `${who} · ${new Date(at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : who
})

/* required: summary ≥10 + category always; breach_reason ONLY when the ticket breached */
const canFile = computed(() =>
  summaryLen.value >= 10 && !!form.rca_category && (!isBreach.value || !!form.breach_reason))

const missingHint = computed(() => {
  const m = []
  if (summaryLen.value < 10) m.push('a summary (10+ chars)')
  if (!form.rca_category) m.push('a cause category')
  if (isBreach.value && !form.breach_reason) m.push('a breach reason')
  return m.length ? `Still needs ${m.join(' · ')}` : ''
})

const fileLabel = computed(() => {
  if (status.value === 'returned' || status.value === 'stale') return 'RE-FILE FOR REVIEW'
  if (status.value === 'filed' || status.value === 'validated') return 'REVISE FILING'
  return 'FILE ROOT CAUSE'
})

/* ── five whys — sequential drill: the next row surfaces once the previous holds ink ── */
watch(whys, (list) => {
  if (list.length < 5 && String(list[list.length - 1] || '').trim()) whys.value = [...list, '']
}, { deep: true })
const removeWhy = (i) => {
  whys.value.splice(i, 1)
  if (!whys.value.length) whys.value = ['']
}

/* ── contributing factors — tag builder ── */
const addFactor = () => {
  const v = factorDraft.value.trim().slice(0, 240)
  if (!v || factors.value.length >= 10) return
  if (!factors.value.some(f => f.toLowerCase() === v.toLowerCase())) factors.value.push(v)
  factorDraft.value = ''
}
const removeFactor = (i) => factors.value.splice(i, 1)

/* ── submit — minimal payload, backend detail surfaced inline ── */
const detailOf = (e) => {
  const d = e?.response?.data?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map(x => x?.msg || '').filter(Boolean).join(' · ')
  return ''
}
const save = async () => {
  if (!canFile.value || busy.value || !props.ticket) return
  busy.value = true
  err.value = ''
  const tid = props.ticket.ticket_id || props.ticket.id
  const payload = { rca_summary: form.rca_summary.trim(), rca_category: form.rca_category }
  if (form.breach_reason) payload.breach_reason = form.breach_reason
  const corr = form.rca_corrective.trim()
  const prev = form.rca_preventive.trim()
  if (corr) payload.rca_corrective = corr
  if (prev) payload.rca_preventive = prev
  const w = whys.value.map(x => String(x).trim()).filter(Boolean).slice(0, 5).map(x => x.slice(0, 500))
  if (w.length) payload.rca_five_whys = w
  const f = factors.value.map(x => String(x).trim()).filter(Boolean).slice(0, 10).map(x => x.slice(0, 240))
  if (f.length) payload.rca_factors = f

  try {
    await setTicketRca(tid, payload)
  } catch (e) {
    err.value = detailOf(e) || 'Could not file the root cause — try again.'
    busy.value = false
    return
  }
  // promote AFTER a successful filing — a problem-file hiccup must never sink the RCA
  if (promote.value && props.ticket.linked_problem_id) {
    const patch = { root_cause: payload.rca_summary }
    if (corr) patch.workaround = corr
    if (publish.value) { patch.status = 'known_error'; patch.workaround_published = true }
    try { await updateProblem(props.ticket.linked_problem_id, patch) }
    catch { toast.warning('Root cause filed — but the problem file could not be updated.') }
  }
  toast.success(`${props.ticket.ticket_number} — root cause ${status.value === 'owed' ? 'filed' : 're-filed'} for review`)
  busy.value = false
  emit('saved')
  emit('close')
}

/* ── escape closes (unless mid-flight) ── */
const onKey = (e) => { if (e.key === 'Escape' && props.open && !busy.value) emit('close') }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const fT = (i) => ({ duration: 0.4, delay: 0.05 + i * 0.05, ease: [0.16, 1, 0.3, 1] })
</script>

<style scoped>
/* ═══════════════ shell ═══════════════ */
.rca-overlay { position: fixed; inset: 0; z-index: 3000; display: grid; place-items: center; padding: 20px;
  background: rgba(8, 5, 4, 0.62); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
[data-theme="light"] .rca-overlay { background: rgba(60, 35, 20, 0.32); }

.rca { position: relative; width: min(680px, 100%); max-height: min(90vh, 820px); display: flex; flex-direction: column;
  border-radius: 20px; border: 1px solid var(--sd-brc-brd); background: var(--sd-surface);
  box-shadow: var(--sd-shadow), var(--sd-brc-glow); padding: 22px 24px 18px; overflow: hidden; }
.rca-accent { position: absolute; left: 0; right: 0; top: 0; height: 3px; background: var(--sd-brc-grad); }
.rca-x { position: absolute; right: 14px; top: 14px; display: grid; place-items: center; width: 30px; height: 30px;
  border-radius: 9px; border: 1px solid var(--sd-border-strong); background: var(--sd-surface-glass);
  color: var(--sd-text-muted); cursor: pointer; z-index: 2; }
.rca-x:hover { color: var(--sd-brc-core); border-color: var(--sd-brc-core); }

/* ═══════════════ header ═══════════════ */
.rca-head { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; padding-right: 36px; }
.rca-eyebrow { font-size: 10px; font-weight: 800; letter-spacing: 0.22em; color: var(--sd-brc-core); margin: 0; }
.rca-title { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.01em; color: var(--sd-text); }
.rca-title em { font-style: normal; background: var(--sd-brc-grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
.rca-subj { margin: 0; font-size: 12.5px; color: var(--sd-text-secondary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rca-idrow { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
.rca-breachflag { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 4px;
  font-size: 9px; font-weight: 800; letter-spacing: 0.14em; color: var(--sd-brc-core);
  border: 1px solid color-mix(in srgb, var(--sd-brc-core) 40%, transparent); background: var(--sd-brc-soft); }

/* ═══════════════ scroll body ═══════════════ */
.rca-scroll { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; padding-right: 4px; }

/* ═══════════════ review plates (returned / stale) ═══════════════ */
.rca-plate { position: relative; display: flex; flex-direction: column; gap: 6px;
  padding: 12px 14px 12px 18px; border-radius: 12px; overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--plate-ink) 34%, transparent);
  background: color-mix(in srgb, var(--plate-ink) 8%, transparent); }
.rca-plate.returned { --plate-ink: var(--sd-rcas-returned); }
.rca-plate.stale { --plate-ink: var(--sd-rcas-stale); }
.plate-rail { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--plate-ink); }
.rca-plate.returned .plate-rail { animation: rca-rail-pulse 2.4s ease-in-out infinite; }
@keyframes rca-rail-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
html:not([data-cinematic="on"]) .rca-plate.returned .plate-rail { animation: none; }
.plate-eyebrow { display: inline-flex; align-items: center; gap: 6px; margin: 0;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.18em; color: var(--plate-ink); }
.plate-note { margin: 0; font-size: 13px; line-height: 1.55; font-weight: 600; font-style: italic; color: var(--sd-text); }
.rca-plate.returned .plate-note { color: color-mix(in srgb, var(--plate-ink) 72%, var(--sd-text)); }
.plate-meta { margin: 0; font-size: 9.5px; letter-spacing: 0.08em; color: var(--sd-text-muted); }

/* ═══════════════ evidence fold ═══════════════ */
.rca-fold { display: flex; flex-direction: column; gap: 10px; }
.fold-t { display: inline-flex; align-items: center; gap: 7px; align-self: flex-start; padding: 6px 11px;
  border-radius: 8px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.16em; cursor: pointer;
  border: 1px dashed color-mix(in srgb, var(--sd-brc-core) 45%, transparent);
  background: transparent; color: var(--sd-brc-core); font-family: inherit; }
.fold-t:hover { background: var(--sd-brc-soft); }
.fold-ic { transition: transform 0.24s cubic-bezier(0.16, 1, 0.3, 1); }
.fold-ic.open { transform: rotate(180deg); }

/* ═══════════════ fields ═══════════════ */
.rca-f { display: flex; flex-direction: column; gap: 8px; }
.rca-f.two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.rca-f.two > div { display: flex; flex-direction: column; gap: 8px; }
.rca-k { display: flex; align-items: baseline; gap: 7px; flex-wrap: wrap;
  font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--sd-text-secondary); }
.rca-k i { font-weight: 600; text-transform: none; letter-spacing: 0; color: var(--sd-text-dim); font-style: normal; }
.rca-k .req { color: var(--sd-brc-core); font-style: normal; }
.rca-count { margin-left: auto; font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; color: var(--sd-brc-repair); }
.rca-count.short { color: var(--sd-brc-core); }
.rca-count b { font-weight: 600; color: var(--sd-text-dim); margin-left: 3px; }

.rca-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.rca-chip { padding: 7px 12px; border-radius: 999px; font-size: 11.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface-glass); color: var(--sd-text-secondary);
  transition: border-color 0.18s, color 0.18s, background 0.18s, transform 0.12s; }
.rca-chip:hover { border-color: var(--sd-brc-core); color: var(--sd-text); transform: translateY(-1px); }
.rca-chip:active { transform: scale(0.96); }
.rca-chip.on { border-color: var(--sd-brc-core); color: var(--sd-brc-core); background: var(--sd-brc-soft);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--sd-brc-core) 35%, transparent); }
.rca-chip.cat.on { border-color: var(--sd-brc-brass); color: var(--sd-brc-brass); background: var(--sd-brc-brass-soft);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--sd-brc-brass) 35%, transparent); }

.rca-ta { width: 100%; resize: vertical; min-height: 64px; padding: 10px 12px; border-radius: 11px;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface-glass); color: var(--sd-text);
  font-size: 13px; line-height: 1.5; font-family: inherit; }
.rca-ta:focus { outline: none; border-color: var(--sd-brc-core); box-shadow: 0 0 0 3px var(--sd-brc-soft); }
.rca-ta::placeholder { color: var(--sd-text-dim); }

/* ═══════════════ five whys drill ═══════════════ */
.rca-whys { position: relative; display: flex; flex-direction: column; gap: 7px; }
.why { display: flex; align-items: center; gap: 9px; margin-left: calc(var(--wi) * 14px); position: relative; }
.why::before { content: ""; position: absolute; left: -10px; top: 50%; width: 8px; height: 1px;
  background: color-mix(in srgb, var(--sd-brc-core) 40%, transparent); }
.why:first-child::before { display: none; }
.why-tag { flex: 0 0 auto; width: 48px; text-align: center; padding: 4px 0; border-radius: 6px;
  font-size: 8.5px; font-weight: 800; letter-spacing: 0.1em; color: var(--sd-brc-core);
  border: 1px solid color-mix(in srgb, var(--sd-brc-core) 38%, transparent); background: var(--sd-brc-soft); }
.why-inp { flex: 1; min-width: 0; padding: 8px 11px; border-radius: 9px; font-size: 12.5px; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface-glass); color: var(--sd-text); }
.why-inp:focus { outline: none; border-color: var(--sd-brc-core); box-shadow: 0 0 0 3px var(--sd-brc-soft); }
.why-inp::placeholder { color: var(--sd-text-dim); }
.why-x { flex: 0 0 auto; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 7px;
  border: 1px solid transparent; background: transparent; color: var(--sd-text-dim); cursor: pointer; }
.why-x:hover { color: var(--sd-brc-core); border-color: color-mix(in srgb, var(--sd-brc-core) 40%, transparent); }
.why-cap { margin: 2px 0 0; font-size: 8.5px; letter-spacing: 0.14em; color: var(--sd-text-dim); text-align: right; }

/* ═══════════════ contributing factors ═══════════════ */
.rca-facs { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; padding: 9px 11px;
  border-radius: 11px; border: 1px dashed var(--sd-border-strong); background: var(--sd-surface-glass); }
.rca-facs:focus-within { border-color: var(--sd-brc-core); }
.fac { display: inline-flex; align-items: center; gap: 6px; padding: 4px 6px 4px 10px; border-radius: 999px;
  font-size: 11px; font-weight: 700; color: var(--sd-text);
  border: 1px solid color-mix(in srgb, var(--sd-brc-core) 30%, transparent); background: var(--sd-brc-soft);
  animation: rca-fac-pop 0.26s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes rca-fac-pop { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
html:not([data-cinematic="on"]) .fac { animation: none; }
.fac-x { display: grid; place-items: center; width: 16px; height: 16px; border-radius: 50%;
  border: none; background: transparent; color: var(--sd-text-muted); cursor: pointer; padding: 0; }
.fac-x:hover { color: var(--sd-brc-core); background: color-mix(in srgb, var(--sd-brc-core) 18%, transparent); }
.fac-inp { flex: 1; min-width: 150px; border: none; background: transparent; color: var(--sd-text);
  font-size: 12.5px; font-family: inherit; padding: 4px 2px; }
.fac-inp:focus { outline: none; }
.fac-inp::placeholder { color: var(--sd-text-dim); }
.fac-full { font-size: 9px; font-weight: 800; letter-spacing: 0.12em; color: var(--sd-brc-core); }

/* ═══════════════ promote block ═══════════════ */
.rca-promote { display: flex; flex-direction: column; gap: 8px; padding: 12px 13px; border-radius: 12px;
  border: 1px dashed color-mix(in srgb, var(--sd-brc-brass) 45%, transparent);
  background: color-mix(in srgb, var(--sd-brc-brass) 6%, transparent); }
.promote-eyebrow { display: inline-flex; align-items: center; gap: 6px; margin: 0;
  font-size: 9px; font-weight: 800; letter-spacing: 0.18em; color: var(--sd-brc-brass); }
.rca-check { display: flex; align-items: flex-start; gap: 9px; font-size: 12px; color: var(--sd-text-secondary); cursor: pointer; }
.rca-check.sub { margin-left: 22px; }
.rca-check input { margin-top: 2px; accent-color: var(--sd-brc-brass); }
.rca-check em { font-style: normal; color: var(--sd-text-dim); }
.rca-check b { color: var(--sd-brc-core); }
.rca-nolink { display: flex; align-items: center; gap: 6px; margin: 0; font-size: 8.5px; letter-spacing: 0.12em;
  color: var(--sd-text-dim); }

/* ═══════════════ error strip ═══════════════ */
.rca-err { display: flex; align-items: center; gap: 8px; margin-top: 12px; padding: 9px 12px; border-radius: 10px;
  font-size: 12px; font-weight: 600; color: var(--sd-brc-hi);
  border: 1px solid color-mix(in srgb, var(--sd-brc-core) 45%, transparent);
  background: color-mix(in srgb, var(--sd-brc-core) 10%, transparent); }
[data-theme="light"] .rca-err { color: var(--sd-brc-core); }
.rca-err svg { flex: 0 0 auto; }
.rca-err span { flex: 1; min-width: 0; line-height: 1.4; }
.err-x { flex: 0 0 auto; display: grid; place-items: center; width: 20px; height: 20px; border-radius: 6px;
  border: none; background: transparent; color: currentColor; cursor: pointer; padding: 0; opacity: 0.7; }
.err-x:hover { opacity: 1; }

/* ═══════════════ footer ═══════════════ */
.rca-foot { display: flex; align-items: center; gap: 12px; padding-top: 14px;
  margin-top: 14px; border-top: 1px solid var(--sd-border); }
.rca-stamp { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 8px;
  font-size: 10px; font-weight: 800; letter-spacing: 0.12em; transform: rotate(-2deg);
  color: var(--sd-brc-core); border: 1.5px dashed color-mix(in srgb, var(--sd-brc-core) 55%, transparent);
  transition: color 0.25s, border-color 0.25s, transform 0.25s; white-space: nowrap; }
.rca-stamp.ready { color: var(--sd-brc-repair); border-style: solid; border-color: color-mix(in srgb, var(--sd-brc-repair) 55%, transparent);
  transform: rotate(0deg); background: var(--sd-brc-repair-soft);
  animation: rca-press 0.42s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes rca-press { 0% { transform: rotate(-3deg) scale(1.18); } 60% { transform: rotate(1deg) scale(0.97); } 100% { transform: rotate(0deg) scale(1); } }
html:not([data-cinematic="on"]) .rca-stamp.ready { animation: none; }
.rca-missing { flex: 1; min-width: 0; font-size: 10.5px; font-weight: 600; color: var(--sd-text-dim);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rca-actions { flex: 0 0 auto; display: flex; gap: 9px; margin-left: auto; }
.rca-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 12px;
  font-size: 12px; font-weight: 800; letter-spacing: 0.04em; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); }
.rca-btn.ghost { background: transparent; }
.rca-btn.primary { border-color: transparent; color: #fff; background: var(--sd-brc-grad); box-shadow: 0 8px 22px -10px var(--sd-brc-core); }
[data-theme="light"] .rca-btn.primary { color: #fff; }
.rca-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.rca-spin { animation: rca-rot 0.9s linear infinite; }
@keyframes rca-rot { to { transform: rotate(360deg); } }

@media (max-width: 620px) {
  .rca-f.two { grid-template-columns: 1fr; }
  .rca-missing { display: none; }
  .why { margin-left: 0; }
}
</style>
