<!--
  ExArchiveModal — "Consign to the Archive", the ceremonial archival of a
  relieved (COMPLETED) separation. Replaces the old one-click generic confirm
  with a proper corporate workflow:

    1. Verify     — pre-archive readiness attestations (relieved · F&F settled ·
                    clearance · records). Each attestation charges the vault.
    2. Reason     — archival category + remarks (written to the employee history
                    reason and the exit audit trail).
    3. Authorize  — review + "what happens" + where it goes + an acknowledgement
                    gate → the vault-locking ceremony.

  Signature instrument: a circular ARCHIVE VAULT door — a charging conic rim,
  a rotating combination dial + 3-spoke handle, rim bolts that throw on seal,
  and a cold steel wash + emboss "FILED" when the record is consigned. Distinct
  from the F&F close modal's padlock-seal (emerald) and the reckoning reactor.

  Emits `submit` with { category, notes } — the parent owns the API call.
  Emits `view-archive` — deep-link to HR → Employees → Archived.
-->
<template>
  <Teleport to="body">
    <AnimatePresence>
      <div v-if="open" class="exa-overlay" @mousedown.self="$emit('close')">
        <Motion as="div" class="exa ex-grain" :class="{ sealed }"
          :initial="reduced ? false : { opacity: 0, y: 26, scale: 0.96 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 16, scale: 0.98 }"
          :transition="{ duration: 0.34, ease: [0.16,1,0.3,1] }">
          <span class="exa-sheen" aria-hidden="true" />
          <span class="exa-aura" aria-hidden="true" />

          <!-- ── Header ── -->
          <header class="exa-head">
            <span class="exa-ico"><Archive :size="18" /></span>
            <div class="exa-htxt">
              <h3 class="exa-title">Consign to the archive</h3>
              <p class="exa-sub"><span class="ex-mono">{{ caseNumber }}</span> · {{ employeeName }}</p>
            </div>
            <button class="exa-x" type="button" @click="$emit('close')"><X :size="17" /></button>
          </header>

          <!-- ── Vault hero (persistent, charges with verification) ── -->
          <div class="vault-stage">
            <div class="vault" :class="{ ready: allVerified, sealed }" :style="{ '--vault-p': ringAngle, '--dial': dialAngle }">
              <span class="vault-rim" aria-hidden="true" />
              <span class="vault-reticle" aria-hidden="true" />
              <span class="vault-bolts" aria-hidden="true"><i v-for="n in 6" :key="n" :style="{ '--b': n }" /></span>
              <span class="vault-dial" aria-hidden="true">
                <span class="vault-tick" v-for="n in 12" :key="n" :style="{ '--t': n }" />
                <span class="vault-spokes"><i /><i /><i /></span>
              </span>
              <span v-if="sealed" class="vault-burst" aria-hidden="true" />
              <span class="vault-core">
                <component :is="sealed ? Lock : allVerified ? ShieldCheck : Archive" :size="24" class="vault-glyph" />
                <span class="vault-pct ex-mono">{{ sealed ? 'FILED' : verifyPct + '%' }}</span>
              </span>
            </div>
            <div class="vault-meta">
              <span class="vm-eyebrow">{{ sealed ? 'Consigned' : 'Permanent record' }}</span>
              <span class="vm-name">{{ employeeName }}</span>
              <div class="vm-tags">
                <span class="vm-tag" :class="relievedOk ? 'ok' : 'warn'"><BadgeCheck :size="11" /> {{ relievedOk ? 'Relieved' : 'Not relieved' }}</span>
                <span v-if="ffNet != null" class="vm-tag"><Scale :size="11" /> {{ fmtINR(Math.abs(ffNet)) }}</span>
                <span class="vm-tag"><ClipboardCheck :size="11" /> {{ clrPct }}%</span>
              </div>
            </div>
          </div>

          <!-- ── Stepper ── -->
          <nav class="exa-steps" aria-label="Archive steps">
            <span class="exa-steps-rail"><span class="exa-steps-fill" :style="{ width: fillPct }" /></span>
            <button v-for="(st, i) in STEPS" :key="st.key" type="button" class="exa-step"
              :class="{ on: i === step, done: i < step }" :disabled="i > maxStep" @click="goStep(i)">
              <span class="exa-step-dot"><Check v-if="i < step" :size="12" /><component v-else :is="st.icon" :size="12" /></span>
              <span class="exa-step-lbl">{{ st.label }}</span>
            </button>
          </nav>

          <!-- ── Body ── -->
          <div class="exa-body">
            <transition :name="slideName" mode="out-in">
              <div :key="step" class="exa-pane">

                <!-- STEP 1 — Verify -->
                <template v-if="step === 0">
                  <p class="exa-lead">Confirm this separation is fully concluded. Each attestation charges the vault.</p>
                  <div class="recon">
                    <Motion v-for="(c, i) in CHECKS" :key="c.key" as="button" type="button"
                      class="recon-row" :class="{ on: checks[c.key] }" @click="checks[c.key] = !checks[c.key]"
                      :initial="reduced ? false : { opacity: 0, x: -8 }" :animate="{ opacity: 1, x: 0 }"
                      :transition="{ duration: 0.3, delay: 0.04 + i * 0.06, ease: [0.16,1,0.3,1] }">
                      <component :is="checks[c.key] ? CheckCircle2 : Circle" :size="18" class="recon-ic" />
                      <span class="recon-txt">
                        <b>{{ c.label }}</b>
                        <small>{{ c.detail }}</small>
                      </span>
                      <span class="recon-flag" :class="c.ok ? 'ok' : 'warn'">
                        <component :is="c.ok ? Check : AlertTriangle" :size="10" /> {{ c.ok ? 'on file' : 'review' }}
                      </span>
                    </Motion>
                  </div>
                  <p v-if="anyMissing" class="exa-note warn"><AlertTriangle :size="13" /> Some items aren't confirmed on file. Archiving is reversible, but review before consigning.</p>
                </template>

                <!-- STEP 2 — Reason -->
                <template v-else-if="step === 1">
                  <p class="exa-lead">Record why this case is being archived. The category and remarks are written to the employee history &amp; exit audit trail.</p>
                  <div class="cat-grid">
                    <button v-for="c in CATS" :key="c.key" type="button" class="cat" :class="{ on: category === c.label }"
                      @click="category = c.label">
                      <component :is="c.icon" :size="15" />
                      <span>{{ c.label }}</span>
                    </button>
                  </div>
                  <label class="exa-fld">
                    <span class="exa-fld-lbl">Archival remarks <i>(recommended)</i></span>
                    <textarea v-model="notes" rows="3"
                      placeholder="e.g. Exit fully concluded; F&amp;F closed; all records filed. Archived per retention policy." />
                  </label>
                </template>

                <!-- STEP 3 — Authorize -->
                <template v-else>
                  <p class="exa-lead">Review and authorize. Archiving consigns the record to the permanent store.</p>
                  <div class="sumcard">
                    <div class="sum-row"><span>Case</span><b class="ex-mono">{{ caseNumber }}</b></div>
                    <div class="sum-row"><span>Employee</span><b>{{ employeeName }}</b></div>
                    <div v-if="exitedOn" class="sum-row"><span>Relieved</span><b>{{ fmtDate(exitedOn) }}</b></div>
                    <div v-if="ffNet != null" class="sum-row"><span>Full &amp; Final</span><b class="ex-mono">{{ fmtINR(Math.abs(ffNet)) }} · {{ settlement?.status }}</b></div>
                    <div class="sum-row"><span>Archival</span><b>{{ category || '—' }}</b></div>
                    <div class="sum-row reck"><span>Verified</span><b class="ok"><ShieldCheck :size="13" /> {{ verifyCount }}/{{ CHECKS.length }} attested</b></div>
                  </div>

                  <div class="conseq">
                    <span class="cq-h"><Archive :size="13" /> What happens</span>
                    <ul>
                      <li><span class="cq-dot" /><span class="cq-tx">This separation's records are consigned to the permanent archive, retained for audit.</span></li>
                      <li><span class="cq-dot" /><span class="cq-tx"><b>{{ employeeName }}</b>'s record moves to <b>ARCHIVED</b> — it leaves active directories, rosters &amp; dashboards.</span></li>
                      <li><span class="cq-dot" /><span class="cq-tx">The exit case stays on file as <b>Relieved</b> for reporting.</span></li>
                      <li><span class="cq-dot reverts" /><span class="cq-tx">Reversible — an archived record can be <b>restored</b> or the person <b>rehired</b> later.</span></li>
                    </ul>
                  </div>

                  <button type="button" class="exa-where" @click="$emit('view-archive')">
                    <span class="where-ic"><Archive :size="14" /></span>
                    <span class="where-tx"><b>Where it goes</b><small>HR → Employees → Archived</small></span>
                    <ArrowRight :size="15" class="where-go" />
                  </button>

                  <button type="button" class="exa-ack" :class="{ on: ack }" @click="ack = !ack">
                    <span class="exa-ack-box"><Check v-if="ack" :size="12" /></span>
                    <span class="exa-ack-txt">I confirm this separation is concluded and authorize archiving <b>{{ employeeName }}</b>'s record. It moves to ARCHIVED and leaves active rosters — <b class="restore">restorable later</b>.</span>
                  </button>
                </template>

              </div>
            </transition>
          </div>

          <!-- ── Footer ── -->
          <footer class="exa-foot">
            <button v-if="step > 0" class="exa-btn ghost" :disabled="busy" type="button" @click="back"><ChevronLeft :size="15" /> Back</button>
            <button v-else class="exa-btn ghost" :disabled="busy" type="button" @click="$emit('close')">Cancel</button>
            <span class="exa-count">Step {{ step + 1 }} of {{ STEPS.length }}</span>
            <Motion v-if="step < STEPS.length - 1" as="button" type="button" class="exa-btn primary"
              :disabled="!canNext" :whileHover="canNext ? { y: -2 } : {}" :whileTap="{ scale: 0.97 }" @click="next">
              Continue <ChevronRight :size="15" />
            </Motion>
            <Motion v-else as="button" type="button" class="exa-btn seal-btn"
              :disabled="!canConfirm || busy" :whileHover="(canConfirm && !busy) ? { y: -2 } : {}" :whileTap="{ scale: 0.97 }" @click="onConfirm">
              <Loader2 v-if="busy" :size="15" class="spin" /><Archive v-else :size="15" />
              {{ busy ? 'Consigning…' : 'Archive & seal' }}
            </Motion>
          </footer>
        </Motion>
      </div>
    </AnimatePresence>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Motion, AnimatePresence } from 'motion-v'
import {
  Archive, Lock, X, Loader2, Check, CheckCircle2, Circle, ChevronLeft, ChevronRight,
  ShieldCheck, Scale, ClipboardCheck, BadgeCheck, AlertTriangle, ArrowRight, Clock, FileText,
} from 'lucide-vue-next'
import { fmtINR, fmtDate } from '@/composables/useExit'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  open: { type: Boolean, default: false },
  caseInfo: { type: Object, default: null },   // full case detail from the drawer
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'submit', 'view-archive'])
const reduced = prefersReduced()

const STEPS = [
  { key: 'verify', label: 'Verify', icon: CheckCircle2 },
  { key: 'reason', label: 'Reason', icon: FileText },
  { key: 'authorize', label: 'Authorize', icon: ShieldCheck },
]
const step = ref(0)
const maxStep = ref(0)
const slideName = ref('exa-next')

// ── derived case facts ──
const num = (v) => Number(v || 0)
const d = computed(() => props.caseInfo || {})
const employeeName = computed(() => d.value.employee_name || d.value.employee_code || 'this employee')
const caseNumber = computed(() => d.value.case_number || '—')
const settlement = computed(() => d.value.settlement || null)
const ffNet = computed(() => (settlement.value ? num(settlement.value.net_amount) : null))
const ffOk = computed(() => { const s = settlement.value; return !s || ['PAID', 'CLOSED'].includes(s.status) })
const clrPct = computed(() => Math.round(num(d.value.clearance_progress_pct)))
const clrOk = computed(() => clrPct.value >= 100)
const relievedOk = computed(() => d.value.status === 'COMPLETED')
const lettersOk = computed(() => (d.value.documents || []).some(x =>
  ['RELIEVING_LETTER', 'EXPERIENCE_LETTER'].includes(x.doc_type) &&
  ['ISSUED', 'GENERATED', 'SENT', 'VERIFIED'].includes(String(x.status || '').toUpperCase())))
const exitedOn = computed(() => d.value.exit_date || d.value.updated_at || null)

// ── verification attestations (charge the vault) ──
const CHECKS = computed(() => [
  { key: 'relieved', label: 'Employee relieved', ok: relievedOk.value,
    detail: relievedOk.value ? 'Case is COMPLETED — the exit is concluded' : 'Case is not yet marked relieved' },
  { key: 'ff', label: 'Full & Final settled', ok: ffOk.value,
    detail: settlement.value ? `F&F ${settlement.value.status} · ${fmtINR(Math.abs(ffNet.value))}` : 'No settlement attached' },
  { key: 'clearance', label: 'Clearance complete', ok: clrOk.value,
    detail: `${clrPct.value}% of departments cleared` },
  { key: 'records', label: 'Records & letters in order', ok: lettersOk.value,
    detail: lettersOk.value ? 'Exit letters issued & on file' : 'No issued exit letters found — verify before archiving' },
])
const checks = reactive({ relieved: false, ff: false, clearance: false, records: false })
const verifyCount = computed(() => CHECKS.value.filter(c => checks[c.key]).length)
const allVerified = computed(() => verifyCount.value === CHECKS.value.length)
const verifyPct = computed(() => Math.round((verifyCount.value / CHECKS.value.length) * 100))
const anyMissing = computed(() => CHECKS.value.some(c => !c.ok))

// ── vault visual state ──
const sealing = ref(false)
const sealed = computed(() => sealing.value && props.busy)
const ringAngle = computed(() => `${(sealed.value ? 1 : verifyCount.value / CHECKS.value.length) * 360}deg`)
const dialAngle = computed(() => `${(sealed.value ? 1 : verifyCount.value / CHECKS.value.length) * 150}deg`)

// ── archival category ──
const CATS = [
  { key: 'routine', label: 'Routine post-exit archival', icon: Archive },
  { key: 'retention', label: 'Records retention / compliance', icon: ShieldCheck },
  { key: 'cleanup', label: 'Cleanup — dormant record', icon: Clock },
  { key: 'minimisation', label: 'Data minimisation', icon: FileText },
]
const category = ref('')
const notes = ref('')
const ack = ref(false)

const fillPct = computed(() => `${(step.value / (STEPS.length - 1)) * 100}%`)
const canNext = computed(() => {
  if (step.value === 0) return allVerified.value
  if (step.value === 1) return !!category.value
  return true
})
const canConfirm = computed(() => allVerified.value && !!category.value && ack.value)

const goStep = (i) => {
  if (i > maxStep.value) return
  slideName.value = i > step.value ? 'exa-next' : 'exa-prev'
  step.value = i
}
const next = () => {
  if (!canNext.value || step.value >= STEPS.length - 1) return
  slideName.value = 'exa-next'
  step.value++
  maxStep.value = Math.max(maxStep.value, step.value)
}
const back = () => { if (step.value === 0) return; slideName.value = 'exa-prev'; step.value-- }

const onConfirm = () => {
  if (!canConfirm.value || props.busy) return
  sealing.value = true
  emit('submit', { notes: notes.value.trim() || null, category: category.value || null })
}

const reset = () => {
  step.value = 0; maxStep.value = 0; slideName.value = 'exa-next'
  checks.relieved = false; checks.ff = false; checks.clearance = false; checks.records = false
  notes.value = ''; ack.value = false; sealing.value = false
  category.value = 'Routine post-exit archival'
}
watch(() => props.open, (o) => { if (o) reset() }, { immediate: true })
// If the archive call errors out (modal stays open), un-seal so the user can retry.
watch(() => props.busy, (b) => { if (!b && props.open) sealing.value = false })
</script>

<style scoped>
.exa-overlay { position: fixed; inset: 0; z-index: 1440; display: grid; place-items: center; padding: 20px;
  background: rgba(6,5,10,0.66); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
[data-theme="light"] .exa-overlay { background: rgba(60,45,20,0.32); }

.exa { position: relative; overflow: hidden; width: min(560px, 96vw); max-height: 92vh; display: flex; flex-direction: column;
  border-radius: 22px; background: var(--ex-surface-elevated); border: 1px solid var(--ex-border-strong); box-shadow: var(--ex-shadow); }
.exa-sheen { position: absolute; inset: 0 0 auto; height: 2px; pointer-events: none;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--ex-amber) 70%, transparent), transparent); transition: background 0.5s; }
.exa.sealed .exa-sheen { background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--ex-steel) 85%, #fff), transparent); }
.exa-aura { position: absolute; inset: 0; pointer-events: none; opacity: 0.8;
  background: radial-gradient(70% 50% at 50% 0%, color-mix(in srgb, var(--ex-amber) 12%, transparent), transparent 70%); transition: background 0.6s; }
.exa.sealed .exa-aura { background: radial-gradient(80% 60% at 50% 30%, color-mix(in srgb, var(--ex-steel) 18%, transparent), transparent 72%); }

/* header */
.exa-head { position: relative; display: flex; align-items: flex-start; gap: 12px; padding: 18px 20px 10px; }
.exa-ico { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
  color: var(--ex-amber); background: var(--ex-amber-soft); border: 1px solid var(--ex-amber-border); }
.exa-htxt { flex: 1; min-width: 0; }
.exa-title { font-size: 16px; font-weight: 850; margin: 0; color: var(--ex-text); letter-spacing: -0.01em; }
.exa-sub { font-size: 12px; color: var(--ex-text-muted); margin: 2px 0 0; }
.exa-x { margin-left: auto; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; cursor: pointer;
  background: transparent; border: 1px solid var(--ex-border); color: var(--ex-text-muted); transition: color 0.2s, border-color 0.2s, transform 0.2s; }
.exa-x:hover { color: var(--ex-text); border-color: var(--ex-border-strong); transform: rotate(90deg); }

/* ── vault hero ── */
.vault-stage { position: relative; display: flex; align-items: center; gap: 20px; padding: 6px 22px 16px; }
.vault { position: relative; width: 132px; height: 132px; flex-shrink: 0; display: grid; place-items: center; }
/* charging conic rim */
.vault-rim { position: absolute; inset: 0; border-radius: 50%;
  background: conic-gradient(from -90deg, var(--ex-amber-bright), var(--ex-ember) var(--vault-p, 0deg), transparent var(--vault-p, 0deg) 360deg);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 9px), #000 calc(100% - 8px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 9px), #000 calc(100% - 8px));
  transition: --vault-p 0.7s var(--ex-spring), filter 0.4s; filter: drop-shadow(0 0 8px color-mix(in srgb, var(--ex-amber) 42%, transparent)); }
.vault.ready .vault-rim { filter: drop-shadow(0 0 12px color-mix(in srgb, var(--ex-amber) 68%, transparent)); }
.vault.sealed .vault-rim { background: conic-gradient(from -90deg, color-mix(in srgb, var(--ex-steel) 80%, #fff), var(--ex-steel) 360deg);
  filter: drop-shadow(0 0 14px color-mix(in srgb, var(--ex-steel) 70%, transparent)); }
.vault-reticle { position: absolute; inset: 14px; border-radius: 50%; border: 1px dashed color-mix(in srgb, var(--ex-text) 15%, transparent);
  animation: vault-spin 30s linear infinite; }
/* rim bolts — throw (light) when sealed */
.vault-bolts { position: absolute; inset: 0; }
.vault-bolts i { position: absolute; top: 50%; left: 50%; width: 5px; height: 5px; margin: -2.5px; border-radius: 50%;
  background: color-mix(in srgb, var(--ex-text) 22%, transparent); transition: background 0.4s, box-shadow 0.4s;
  transform: rotate(calc(var(--b) * 60deg)) translateY(-58px); }
.vault.sealed .vault-bolts i { background: var(--ex-steel); box-shadow: 0 0 7px color-mix(in srgb, var(--ex-steel) 90%, transparent);
  transition-delay: calc(var(--b) * 0.05s); }
/* combination dial */
.vault-dial { position: absolute; inset: 22px; border-radius: 50%; background: var(--ex-panel); border: 1px solid var(--ex-border);
  transform: rotate(var(--dial, 0deg)); transition: transform 0.7s var(--ex-spring), border-color 0.4s; }
.vault.ready .vault-dial { border-color: color-mix(in srgb, var(--ex-amber) 38%, transparent); }
.vault.sealed .vault-dial { border-color: color-mix(in srgb, var(--ex-steel) 55%, transparent); animation: vault-snap 0.5s var(--ex-spring); }
.vault-tick { position: absolute; top: 3px; left: 50%; width: 1.5px; height: 6px; margin-left: -0.75px; border-radius: 1px;
  background: color-mix(in srgb, var(--ex-text) 20%, transparent); transform-origin: 50% calc(50px - 3px);
  transform: rotate(calc(var(--t) * 30deg)); }
.vault-spokes { position: absolute; inset: 0; display: grid; place-items: center; }
.vault-spokes i { position: absolute; width: 58px; height: 4px; border-radius: 3px;
  background: color-mix(in srgb, var(--ex-amber) 55%, transparent); transition: background 0.4s; }
.vault-spokes i:nth-child(2) { transform: rotate(60deg); }
.vault-spokes i:nth-child(3) { transform: rotate(120deg); }
.vault.sealed .vault-spokes i { background: color-mix(in srgb, var(--ex-steel) 75%, transparent); }
.vault-burst { position: absolute; inset: 0; border-radius: 50%; border: 2px solid var(--ex-steel); animation: vault-burst 0.9s ease-out forwards; }
.vault-core { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 3px;
  width: 64px; height: 64px; border-radius: 50%; justify-content: center;
  background: var(--ex-surface-elevated); border: 1px solid var(--ex-border); transition: border-color 0.4s; }
.vault.ready .vault-core { border-color: color-mix(in srgb, var(--ex-amber) 40%, transparent); }
.vault.sealed .vault-core { border-color: color-mix(in srgb, var(--ex-steel) 55%, transparent); }
.vault-glyph { color: var(--ex-text-muted); transition: color 0.4s; }
.vault.ready .vault-glyph { color: var(--ex-amber); }
.vault.sealed .vault-glyph { color: color-mix(in srgb, var(--ex-steel) 85%, #fff); }
.vault-pct { font-size: 10px; font-weight: 850; letter-spacing: 0.06em; color: var(--ex-text-muted); }
.vault.ready .vault-pct { color: var(--ex-amber); }
.vault.sealed .vault-pct { color: color-mix(in srgb, var(--ex-steel) 85%, #fff); }

.vault-meta { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.vm-eyebrow { font-size: 10px; font-weight: 850; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ex-text-muted); }
.exa.sealed .vm-eyebrow { color: color-mix(in srgb, var(--ex-steel) 85%, #fff); }
.vm-name { font-size: 18px; font-weight: 850; color: var(--ex-text); line-height: 1.15; }
.vm-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 2px; }
.vm-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 750; padding: 3px 8px; border-radius: 999px;
  color: var(--ex-text-secondary); background: var(--ex-surface); border: 1px solid var(--ex-border); }
.vm-tag.ok { color: var(--ex-cleared); border-color: color-mix(in srgb, var(--ex-cleared) 30%, transparent); }
.vm-tag.warn { color: var(--ex-amber); border-color: var(--ex-amber-border); }

/* ── stepper ── */
.exa-steps { position: relative; display: flex; justify-content: space-between; gap: 6px; padding: 4px 30px 14px; }
.exa-steps-rail { position: absolute; left: 46px; right: 46px; top: 14px; height: 2px; border-radius: 2px; overflow: hidden;
  background: color-mix(in srgb, var(--ex-text) 10%, transparent); }
.exa-steps-fill { display: block; height: 100%; border-radius: 2px; background: var(--ex-grad-hero); transition: width 0.5s var(--ex-spring); }
.exa-step { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1; min-width: 0;
  background: transparent; border: 0; cursor: pointer; }
.exa-step:disabled { cursor: default; }
.exa-step-dot { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%;
  background: var(--ex-surface-elevated); border: 1.5px solid var(--ex-border-strong); color: var(--ex-text-dim); transition: all 0.32s var(--ex-spring); }
.exa-step.on .exa-step-dot { color: #1a1206; border-color: transparent; background: var(--ex-grad-hero); box-shadow: 0 0 0 4px color-mix(in srgb, var(--ex-amber) 16%, transparent); }
.exa-step.done .exa-step-dot { color: var(--ex-cleared); border-color: color-mix(in srgb, var(--ex-cleared) 55%, transparent); background: color-mix(in srgb, var(--ex-cleared) 14%, transparent); }
.exa-step-lbl { font-size: 10px; font-weight: 800; letter-spacing: 0.03em; text-transform: uppercase; color: var(--ex-text-muted); white-space: nowrap; }
.exa-step.on .exa-step-lbl { color: var(--ex-amber); }
.exa-step.done .exa-step-lbl { color: var(--ex-text-secondary); }

/* ── body ── */
.exa-body { position: relative; flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 2px 20px 16px; }
.exa-pane { display: flex; flex-direction: column; gap: 12px; }
.exa-lead { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--ex-text-secondary); }
.exa-note { display: flex; align-items: flex-start; gap: 7px; margin: 0; font-size: 11.5px; line-height: 1.45; padding: 9px 11px; border-radius: 10px; }
.exa-note.warn { color: var(--ex-amber); background: var(--ex-amber-soft); border: 1px solid var(--ex-amber-border); }
.exa-note svg { flex-shrink: 0; margin-top: 1px; }

/* verify rows */
.recon { display: flex; flex-direction: column; gap: 8px; }
.recon-row { display: flex; align-items: center; gap: 11px; text-align: left; padding: 11px 13px; border-radius: 12px; cursor: pointer; font-family: inherit;
  background: var(--ex-panel); border: 1px solid var(--ex-border); transition: border-color 0.25s, background 0.25s; }
.recon-row:hover { border-color: var(--ex-border-strong); }
.recon-row.on { border-color: color-mix(in srgb, var(--ex-amber) 42%, transparent); background: var(--ex-amber-soft); }
.recon-ic { flex-shrink: 0; color: var(--ex-text-dim); transition: color 0.25s; }
.recon-row.on .recon-ic { color: var(--ex-amber); }
.recon-txt { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
.recon-txt b { font-size: 12.5px; font-weight: 700; color: var(--ex-text); }
.recon-txt small { font-size: 11px; color: var(--ex-text-muted); }
.recon-flag { display: inline-flex; align-items: center; gap: 3px; flex-shrink: 0; font-size: 9.5px; font-weight: 800; letter-spacing: 0.03em;
  text-transform: uppercase; padding: 3px 7px; border-radius: 999px; }
.recon-flag.ok { color: var(--ex-cleared); background: color-mix(in srgb, var(--ex-cleared) 13%, transparent); }
.recon-flag.warn { color: var(--ex-amber); background: var(--ex-amber-soft); }

/* category */
.cat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.cat { display: flex; align-items: center; gap: 8px; padding: 11px 12px; border-radius: 11px; cursor: pointer; text-align: left; font-family: inherit;
  background: var(--ex-surface); border: 1px solid var(--ex-border); color: var(--ex-text-secondary); font-size: 12px; font-weight: 700; transition: all 0.2s; }
.cat:hover { border-color: var(--ex-border-strong); transform: translateY(-1px); }
.cat svg { color: var(--ex-text-muted); flex-shrink: 0; transition: color 0.2s; }
.cat.on { border-color: var(--ex-amber-border); background: var(--ex-amber-soft); color: var(--ex-amber); }
.cat.on svg { color: var(--ex-amber); }

.exa-fld { display: flex; flex-direction: column; gap: 5px; }
.exa-fld-lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: var(--ex-text-muted); }
.exa-fld-lbl i { color: var(--ex-text-dim); font-style: normal; text-transform: none; letter-spacing: 0; }
.exa-fld textarea { width: 100%; padding: 10px 12px; border-radius: 10px; font-size: 13px; font-family: inherit; resize: vertical;
  background: rgba(0,0,0,0.3); border: 1px solid var(--ex-border); color: var(--ex-text); }
.exa-fld textarea:focus { outline: none; border-color: var(--ex-amber-border); box-shadow: 0 0 0 3px var(--ex-amber-soft); }
[data-theme="light"] .exa-fld textarea { background: rgba(255,250,242,0.72); }

/* summary */
.sumcard { display: flex; flex-direction: column; border-radius: 14px; overflow: hidden; border: 1px solid var(--ex-border); background: var(--ex-panel); }
.sum-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; font-size: 12.5px; border-top: 1px solid var(--ex-border); }
.sum-row:first-child { border-top: 0; }
.sum-row span { color: var(--ex-text-muted); }
.sum-row b { color: var(--ex-text); font-weight: 700; text-align: right; }
.sum-row.reck b.ok { display: inline-flex; align-items: center; gap: 5px; color: var(--ex-cleared); }

/* consequences */
.conseq { padding: 11px 13px; border-radius: 12px; background: var(--ex-amber-soft); border: 1px solid var(--ex-amber-border); }
.cq-h { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ex-amber); }
.conseq ul { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
.conseq li { display: flex; align-items: flex-start; gap: 8px; font-size: 12.5px; line-height: 1.45; color: var(--ex-text-secondary); }
.cq-tx { flex: 1; min-width: 0; }
.conseq li b { color: var(--ex-text); }
.cq-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--ex-amber); flex-shrink: 0; margin-top: 6px; }
.cq-dot.reverts { background: var(--ex-cleared); }

/* where it goes */
.exa-where { display: flex; align-items: center; gap: 11px; width: 100%; text-align: left; padding: 11px 13px; border-radius: 12px; cursor: pointer; font-family: inherit;
  background: var(--ex-surface); border: 1px solid var(--ex-border); transition: border-color 0.2s, transform 0.18s; }
.exa-where:hover { border-color: var(--ex-amber-border); transform: translateY(-1px); }
.where-ic { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0; color: var(--ex-amber); background: var(--ex-amber-soft); border: 1px solid var(--ex-amber-border); }
.where-tx { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; }
.where-tx b { font-size: 12.5px; font-weight: 750; color: var(--ex-text); }
.where-tx small { font-size: 11px; color: var(--ex-text-muted); }
.where-go { color: var(--ex-text-muted); flex-shrink: 0; }
.exa-where:hover .where-go { color: var(--ex-amber); }

/* ack gate */
.exa-ack { display: flex; align-items: flex-start; gap: 10px; text-align: left; padding: 12px 14px; border-radius: 13px; cursor: pointer; font-family: inherit;
  background: var(--ex-panel); border: 1px solid var(--ex-border); transition: border-color 0.2s, background 0.2s; }
.exa-ack:hover { border-color: var(--ex-border-strong); }
.exa-ack.on { border-color: var(--ex-amber-border); background: var(--ex-amber-soft); }
.exa-ack-box { display: grid; place-items: center; width: 20px; height: 20px; flex-shrink: 0; margin-top: 1px; border-radius: 6px;
  border: 1.5px solid color-mix(in srgb, var(--ex-text) 24%, transparent); color: #1a1206; transition: all 0.2s var(--ex-spring); }
.exa-ack.on .exa-ack-box { background: var(--ex-amber); border-color: var(--ex-amber); }
.exa-ack-txt { font-size: 11.5px; line-height: 1.5; color: var(--ex-text-secondary); }
.exa-ack-txt b { color: var(--ex-text); }
.exa-ack-txt b.restore { color: var(--ex-cleared); }

/* ── footer ── */
.exa-foot { position: relative; display: flex; align-items: center; gap: 10px; padding: 12px 20px 18px; border-top: 1px solid var(--ex-border); }
.exa-count { flex: 1; text-align: center; font-size: 11px; font-weight: 600; letter-spacing: 0.03em; color: var(--ex-text-dim); font-family: var(--ex-mono); }
.exa-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer;
  border: 1px solid transparent; font-family: inherit; transition: transform 0.18s, box-shadow 0.25s; }
.exa-btn.ghost { background: transparent; border-color: var(--ex-border-strong); color: var(--ex-text-secondary); }
.exa-btn.ghost:hover:not(:disabled) { transform: translateY(-1px); }
.exa-btn.primary { background: var(--ex-grad-hero); color: #1a1206; }
.exa-btn.seal-btn { background: linear-gradient(135deg, var(--ex-amber-bright), var(--ex-ember)); color: #1a1206; box-shadow: 0 8px 22px -8px color-mix(in srgb, var(--ex-ember) 60%, transparent); }
.exa-btn.seal-btn:hover:not(:disabled) { box-shadow: 0 12px 28px -8px color-mix(in srgb, var(--ex-ember) 75%, transparent); }
.exa-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.spin { animation: vault-spin 0.8s linear infinite; }

/* pane slide */
.exa-next-enter-active, .exa-next-leave-active, .exa-prev-enter-active, .exa-prev-leave-active { transition: opacity 0.24s var(--ex-spring), transform 0.28s var(--ex-spring); }
.exa-next-enter-from { opacity: 0; transform: translateX(20px); }
.exa-next-leave-to { opacity: 0; transform: translateX(-16px); }
.exa-prev-enter-from { opacity: 0; transform: translateX(-20px); }
.exa-prev-leave-to { opacity: 0; transform: translateX(16px); }

@property --vault-p { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
@keyframes vault-spin { to { transform: rotate(360deg); } }
@keyframes vault-snap { 0% { transform: rotate(var(--dial, 0deg)) scale(0.9); } 60% { transform: rotate(var(--dial, 0deg)) scale(1.05); } 100% { transform: rotate(var(--dial, 0deg)) scale(1); } }
@keyframes vault-burst { 0% { opacity: 0.8; transform: scale(0.7); } 100% { opacity: 0; transform: scale(1.5); } }

@media (max-width: 520px) {
  .vault-stage { flex-direction: column; text-align: center; }
  .vm-tags { justify-content: center; }
  .cat-grid { grid-template-columns: 1fr; }
  .exa-step-lbl { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .vault-reticle, .vault-burst, .spin { animation: none !important; }
  .vault-rim, .vault-dial, .vault-core, .exa-steps-fill, .vault-bolts i { transition: none !important; }
  .vault.sealed .vault-dial { animation: none !important; }
  .exa-next-enter-active, .exa-next-leave-active, .exa-prev-enter-active, .exa-prev-leave-active { transition: none; }
}

/* ── light theme ── */
[data-theme="light"] .vault-dial, [data-theme="light"] .vault-core { background: rgba(255,250,242,0.82); }
[data-theme="light"] .recon-row, [data-theme="light"] .cat, [data-theme="light"] .sumcard,
[data-theme="light"] .exa-ack, [data-theme="light"] .exa-where, [data-theme="light"] .vm-tag { background: rgba(255,250,242,0.72); }
[data-theme="light"] .vault-reticle { border-color: color-mix(in srgb, var(--ex-ember-deep) 22%, transparent); }
</style>
