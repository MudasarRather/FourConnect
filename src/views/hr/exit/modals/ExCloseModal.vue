<!--
  ExCloseModal — "Sealing the Ledger", the ceremonial close-of-books for a PAID
  Full & Final settlement. Replaces the old one-click Close confirm with a proper
  corporate workflow:

    1. Reconcile  — final-account snapshot + a gated reconciliation attestation
                    checklist (charges the seal).
    2. Closure    — closure category + remarks (written to the exit audit trail).
    3. Authorize  — review + acknowledgement → the vault-seal ceremony.

  Signature instrument: a charging conic "vault seal" whose ring fills as the
  reconciliation checklist completes, whose padlock flips closed when the books
  balance, and which snaps + washes emerald on the final seal. Distinct from the
  Reckoning reactor (dual-arc balance) and the letter mint-die / iris motifs.

  Emits `confirm` with { notes, category } — the parent owns the API call.
-->
<template>
  <Teleport to="body">
    <AnimatePresence>
      <div v-if="open" class="exc-overlay" @mousedown.self="$emit('close')">
        <Motion as="div" class="exc ex-grain" :class="{ sealed }"
          :initial="reduced ? false : { opacity: 0, y: 26, scale: 0.96 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 16, scale: 0.98 }"
          :transition="{ duration: 0.34, ease: [0.16,1,0.3,1] }">
          <span class="exc-sheen" aria-hidden="true" />
          <span class="exc-aura" aria-hidden="true" />

          <!-- ── Header ── -->
          <header class="exc-head">
            <span class="exc-ico"><Lock :size="18" /></span>
            <div class="exc-htxt">
              <h3 class="exc-title">Close the books</h3>
              <p class="exc-sub"><span class="ex-mono">{{ settlement?.settlement_number }}</span> · {{ employeeName || 'final account' }}</p>
            </div>
            <button class="exc-x" type="button" @click="$emit('close')"><X :size="17" /></button>
          </header>

          <!-- ── Seal hero (persistent, charges with reconciliation) ── -->
          <div class="seal-stage">
            <div class="seal" :class="[dir, { ready: allReconciled, sealed }]">
              <span class="seal-reticle" aria-hidden="true" />
              <span class="seal-orbit" aria-hidden="true"><i /><i /><i /></span>
              <span class="seal-ring" :style="{ '--seal-p': ringAngle }" aria-hidden="true" />
              <span class="seal-sheen" aria-hidden="true" />
              <span v-if="sealed" class="seal-burst" aria-hidden="true" />
              <span class="seal-core">
                <component :is="sealed || allReconciled ? Lock : LockOpen" :size="26" class="seal-lock" />
                <span class="seal-pct ex-mono">{{ sealed ? 'SEALED' : reconPct + '%' }}</span>
              </span>
            </div>
            <div class="seal-meta">
              <span class="sm-eyebrow" :class="dir">{{ dirLabel }}</span>
              <ReckonOdometer class="sm-net" :value="absNet" :color="netColor" />
              <span class="sm-paid"><Banknote :size="12" /> Paid via {{ method }}<template v-if="paidOn"> · {{ paidOn }}</template></span>
            </div>
          </div>

          <!-- ── Stepper ── -->
          <nav class="exc-steps" aria-label="Close steps">
            <span class="exc-steps-rail"><span class="exc-steps-fill" :style="{ width: fillPct }" /></span>
            <button v-for="(st, i) in STEPS" :key="st.key" type="button" class="exc-step"
              :class="{ on: i === step, done: i < step }" :disabled="i > maxStep" @click="goStep(i)">
              <span class="exc-step-dot"><Check v-if="i < step" :size="12" /><component v-else :is="st.icon" :size="12" /></span>
              <span class="exc-step-lbl">{{ st.label }}</span>
            </button>
          </nav>

          <!-- ── Body ── -->
          <div class="exc-body">
            <transition :name="slideName" mode="out-in">
              <div :key="step" class="exc-pane">

                <!-- STEP 1 — Reconcile -->
                <template v-if="step === 0">
                  <p class="exc-lead">Confirm the final account is settled and reconciled. Each attestation charges the seal.</p>
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
                    </Motion>
                  </div>
                </template>

                <!-- STEP 2 — Closure record -->
                <template v-else-if="step === 1">
                  <p class="exc-lead">Record how this F&amp;F concluded. The category and remarks are written to the exit audit trail.</p>
                  <div class="cat-grid">
                    <button v-for="c in CATS" :key="c.key" type="button" class="cat" :class="{ on: category === c.label }"
                      @click="category = c.label">
                      <component :is="c.icon" :size="15" />
                      <span>{{ c.label }}</span>
                    </button>
                  </div>
                  <label class="exc-fld">
                    <span class="exc-fld-lbl">Closure remarks <i>(recommended)</i></span>
                    <textarea v-model="notes" rows="3"
                      placeholder="e.g. All dues cleared; gratuity paid; laptop recovered. Closed per finance sign-off." />
                  </label>
                </template>

                <!-- STEP 3 — Authorize -->
                <template v-else>
                  <p class="exc-lead">Review and authorize. Closing locks this as the final account for the exit.</p>
                  <div class="sumcard">
                    <div class="sum-row"><span>Settlement</span><b class="ex-mono">{{ settlement?.settlement_number }}</b></div>
                    <div class="sum-row"><span>Employee</span><b>{{ employeeName || '—' }}</b></div>
                    <div class="sum-row"><span>{{ dirLabel }}</span><b class="ex-mono" :class="dir">{{ fmtINR(absNet) }}</b></div>
                    <div class="sum-row"><span>Disbursed via</span><b>{{ method }}</b></div>
                    <div class="sum-row"><span>Closure</span><b>{{ category || '—' }}</b></div>
                    <div class="sum-row reck"><span>Reconciliation</span><b class="ok"><ShieldCheck :size="13" /> {{ reconCount }}/{{ CHECKS.length }} attested</b></div>
                  </div>
                  <button type="button" class="exc-ack" :class="{ on: ack }" @click="ack = !ack">
                    <span class="exc-ack-box"><Check v-if="ack" :size="12" /></span>
                    <span class="exc-ack-txt">I confirm the Full &amp; Final account is reconciled and authorize closing it. Reopening afterward requires a formal <b>reversal</b>.</span>
                  </button>
                </template>

              </div>
            </transition>
          </div>

          <!-- ── Footer ── -->
          <footer class="exc-foot">
            <button v-if="step > 0" class="exc-btn ghost" :disabled="busy" type="button" @click="back"><ChevronLeft :size="15" /> Back</button>
            <button v-else class="exc-btn ghost" :disabled="busy" type="button" @click="$emit('close')">Cancel</button>
            <span class="exc-count">Step {{ step + 1 }} of {{ STEPS.length }}</span>
            <Motion v-if="step < STEPS.length - 1" as="button" type="button" class="exc-btn primary"
              :disabled="!canNext" :whileHover="canNext ? { y: -2 } : {}" :whileTap="{ scale: 0.97 }" @click="next">
              Continue <ChevronRight :size="15" />
            </Motion>
            <Motion v-else as="button" type="button" class="exc-btn seal-btn"
              :disabled="!canConfirm || busy" :whileHover="(canConfirm && !busy) ? { y: -2 } : {}" :whileTap="{ scale: 0.97 }" @click="onConfirm">
              <Loader2 v-if="busy" :size="15" class="spin" /><Lock v-else :size="15" />
              {{ busy ? 'Sealing…' : 'Close & seal' }}
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
  Lock, LockOpen, X, Loader2, Check, CheckCircle2, Circle, ChevronLeft, ChevronRight,
  ShieldCheck, Scale, TrendingDown, Archive, Banknote, FileText,
} from 'lucide-vue-next'
import ReckonOdometer from '../components/ReckonOdometer.vue'
import { fmtINR } from '@/composables/useExit'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  open: { type: Boolean, default: false },
  settlement: { type: Object, default: null },
  busy: { type: Boolean, default: false },
  employeeName: { type: String, default: '' },
})
const emit = defineEmits(['close', 'confirm'])
const reduced = prefersReduced()

const STEPS = [
  { key: 'reconcile', label: 'Reconcile', icon: CheckCircle2 },
  { key: 'closure', label: 'Closure', icon: FileText },
  { key: 'authorize', label: 'Authorize', icon: ShieldCheck },
]
const step = ref(0)
const maxStep = ref(0)
const slideName = ref('exc-next')

const num = (v) => Number(v || 0)
const net = computed(() => num(props.settlement?.net_amount))
const absNet = computed(() => Math.abs(net.value))
const recoveries = computed(() => num(props.settlement?.total_recoveries))
const dir = computed(() => (net.value > 0 ? 'payable' : net.value < 0 ? 'recoverable' : 'balanced'))
const dirLabel = computed(() => (dir.value === 'payable' ? 'Net payable' : dir.value === 'recoverable' ? 'Net recoverable' : 'Balanced'))
const netColor = computed(() => (dir.value === 'payable' ? 'var(--ex-cleared)' : dir.value === 'recoverable' ? 'var(--ex-blocked)' : 'var(--ex-text-secondary)'))
const method = computed(() => (props.settlement?.settlement_method || 'PAYROLL').replace('_', ' '))
const paidOn = computed(() => {
  const d = props.settlement?.paid_at
  if (!d) return ''
  const dt = new Date(d)
  return isNaN(dt) ? '' : dt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
})

// ── reconciliation attestations (charge the seal) ──
const CHECKS = computed(() => [
  { key: 'released', label: 'Full & Final amount released', detail: `${dirLabel.value} ${fmtINR(absNet.value)} · paid via ${method.value}` },
  { key: 'recoveries', label: 'Recoveries & dues collected', detail: recoveries.value > 0 ? `${fmtINR(recoveries.value)} recovered & reconciled` : 'No outstanding recoveries' },
  { key: 'clearance', label: 'Clearance & asset return reconciled', detail: 'No outstanding company property or access' },
  { key: 'claims', label: 'No pending claims or disputes', detail: 'Reimbursements & expenses settled' },
])
const checks = reactive({ released: false, recoveries: false, clearance: false, claims: false })
const reconCount = computed(() => CHECKS.value.filter(c => checks[c.key]).length)
const allReconciled = computed(() => reconCount.value === CHECKS.value.length)
const reconPct = computed(() => Math.round((reconCount.value / CHECKS.value.length) * 100))
const sealing = ref(false)
const sealed = computed(() => sealing.value && props.busy)
const ringAngle = computed(() => `${(sealed.value ? 1 : reconCount.value / CHECKS.value.length) * 360}deg`)

// ── closure category ──
const CATS = [
  { key: 'full', label: 'Settled in full', icon: CheckCircle2 },
  { key: 'waiver', label: 'Settled with waiver', icon: Scale },
  { key: 'recovered', label: 'Net recovered', icon: TrendingDown },
  { key: 'admin', label: 'Closed administratively', icon: Archive },
]
const category = ref('')
const notes = ref('')
const ack = ref(false)

const fillPct = computed(() => `${(step.value / (STEPS.length - 1)) * 100}%`)
const canNext = computed(() => {
  if (step.value === 0) return allReconciled.value
  if (step.value === 1) return !!category.value
  return true
})
const canConfirm = computed(() => allReconciled.value && !!category.value && ack.value)

const goStep = (i) => {
  if (i > maxStep.value) return
  slideName.value = i > step.value ? 'exc-next' : 'exc-prev'
  step.value = i
}
const next = () => {
  if (!canNext.value || step.value >= STEPS.length - 1) return
  slideName.value = 'exc-next'
  step.value++
  maxStep.value = Math.max(maxStep.value, step.value)
}
const back = () => { if (step.value === 0) return; slideName.value = 'exc-prev'; step.value-- }

const onConfirm = () => {
  if (!canConfirm.value || props.busy) return
  sealing.value = true
  emit('confirm', { notes: notes.value.trim() || null, category: category.value || null })
}

const reset = () => {
  step.value = 0; maxStep.value = 0; slideName.value = 'exc-next'
  checks.released = false; checks.recoveries = false; checks.clearance = false; checks.claims = false
  notes.value = ''; ack.value = false; sealing.value = false
  // pre-pick a sensible default category from the net direction
  category.value = dir.value === 'recoverable' ? 'Net recovered' : dir.value === 'balanced' ? 'Closed administratively' : 'Settled in full'
}
watch(() => props.open, (o) => { if (o) reset() }, { immediate: true })
// If the close call errors out (modal stays open), un-seal so the user can retry.
watch(() => props.busy, (b) => { if (!b && props.open) sealing.value = false })
</script>

<style scoped>
.exc-overlay { position: fixed; inset: 0; z-index: 1440; display: grid; place-items: center; padding: 20px;
  background: rgba(6,5,10,0.66); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
[data-theme="light"] .exc-overlay { background: rgba(60,45,20,0.32); }

.exc { position: relative; overflow: hidden; width: min(560px, 96vw); max-height: 92vh; display: flex; flex-direction: column;
  border-radius: 22px; background: var(--ex-surface-elevated); border: 1px solid var(--ex-border-strong); box-shadow: var(--ex-shadow); }
.exc-sheen { position: absolute; inset: 0 0 auto; height: 2px; pointer-events: none;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--ex-amber) 70%, transparent), transparent); transition: background 0.5s; }
.exc.sealed .exc-sheen { background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--ex-cleared) 80%, transparent), transparent); }
.exc-aura { position: absolute; inset: 0; pointer-events: none; opacity: 0.8;
  background: radial-gradient(70% 50% at 50% 0%, color-mix(in srgb, var(--ex-amber) 12%, transparent), transparent 70%); transition: background 0.6s; }
.exc.sealed .exc-aura { background: radial-gradient(80% 60% at 50% 30%, color-mix(in srgb, var(--ex-cleared) 16%, transparent), transparent 72%); }

/* header */
.exc-head { position: relative; display: flex; align-items: flex-start; gap: 12px; padding: 18px 20px 10px; }
.exc-ico { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
  color: var(--ex-cleared); background: color-mix(in srgb, var(--ex-cleared) 13%, transparent); border: 1px solid color-mix(in srgb, var(--ex-cleared) 30%, transparent); }
.exc-htxt { flex: 1; min-width: 0; }
.exc-title { font-size: 16px; font-weight: 850; margin: 0; color: var(--ex-text); letter-spacing: -0.01em; }
.exc-sub { font-size: 12px; color: var(--ex-text-muted); margin: 2px 0 0; }
.exc-x { margin-left: auto; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; cursor: pointer;
  background: transparent; border: 1px solid var(--ex-border); color: var(--ex-text-muted); transition: color 0.2s, border-color 0.2s, transform 0.2s; }
.exc-x:hover { color: var(--ex-text); border-color: var(--ex-border-strong); transform: rotate(90deg); }

/* ── seal hero ── */
.seal-stage { position: relative; display: flex; align-items: center; gap: 20px; padding: 6px 22px 16px; }
.seal { position: relative; width: 132px; height: 132px; flex-shrink: 0; display: grid; place-items: center; }
.seal-ring { position: absolute; inset: 0; border-radius: 50%;
  background: conic-gradient(from -90deg, var(--ex-amber-bright), var(--ex-ember) var(--seal-p, 0deg), transparent var(--seal-p, 0deg) 360deg);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 10px), #000 calc(100% - 9px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 10px), #000 calc(100% - 9px));
  transition: --seal-p 0.7s var(--ex-spring), filter 0.4s; filter: drop-shadow(0 0 8px color-mix(in srgb, var(--ex-amber) 45%, transparent)); }
.seal.ready .seal-ring { filter: drop-shadow(0 0 12px color-mix(in srgb, var(--ex-amber) 70%, transparent)); }
.seal.sealed .seal-ring { background: conic-gradient(from -90deg, #6ee7b7, var(--ex-cleared) 360deg);
  filter: drop-shadow(0 0 16px color-mix(in srgb, var(--ex-cleared) 75%, transparent)); }
.seal-reticle { position: absolute; inset: 12px; border-radius: 50%; border: 1px dashed color-mix(in srgb, var(--ex-text) 16%, transparent);
  animation: seal-spin 26s linear infinite; }
.seal-orbit { position: absolute; inset: 0; animation: seal-spin 14s linear infinite reverse; }
.seal-orbit i { position: absolute; top: -2px; left: 50%; width: 4px; height: 4px; margin-left: -2px; border-radius: 50%; background: var(--ex-amber); box-shadow: 0 0 6px var(--ex-amber); }
.seal-orbit i:nth-child(2) { transform: rotate(120deg); transform-origin: 2px 68px; }
.seal-orbit i:nth-child(3) { transform: rotate(240deg); transform-origin: 2px 68px; }
.seal.sealed .seal-orbit i { background: var(--ex-cleared); box-shadow: 0 0 6px var(--ex-cleared); }
.seal-sheen { position: absolute; inset: 0; border-radius: 50%; pointer-events: none; mix-blend-mode: screen;
  background: conic-gradient(from 0deg, transparent 0 78%, color-mix(in srgb, #fff 55%, transparent) 88%, transparent 96%);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 11px), #000 calc(100% - 9px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 11px), #000 calc(100% - 9px));
  animation: seal-spin 4.5s linear infinite; }
[data-theme="light"] .seal-sheen { mix-blend-mode: normal; background: conic-gradient(from 0deg, transparent 0 80%, color-mix(in srgb, var(--ex-amber-bright) 80%, transparent) 89%, transparent 96%); }
.seal-burst { position: absolute; inset: 0; border-radius: 50%; border: 2px solid var(--ex-cleared); animation: seal-burst 0.9s ease-out forwards; }
.seal-core { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; width: 92px; height: 92px; border-radius: 50%;
  justify-content: center; background: var(--ex-panel); border: 1px solid var(--ex-border); transition: transform 0.4s var(--ex-spring), border-color 0.4s; }
.seal.ready .seal-core { border-color: color-mix(in srgb, var(--ex-amber) 40%, transparent); }
.seal.sealed .seal-core { border-color: color-mix(in srgb, var(--ex-cleared) 50%, transparent); animation: seal-snap 0.5s var(--ex-spring); }
.seal-lock { color: var(--ex-text-muted); transition: color 0.4s; }
.seal.ready .seal-lock { color: var(--ex-amber); }
.seal.sealed .seal-lock { color: var(--ex-cleared); }
.seal-pct { font-size: 11px; font-weight: 800; letter-spacing: 0.06em; color: var(--ex-text-muted); }
.seal.ready .seal-pct { color: var(--ex-amber); }
.seal.sealed .seal-pct { color: var(--ex-cleared); }

.seal-meta { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.sm-eyebrow { font-size: 10px; font-weight: 850; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ex-text-muted); }
.sm-eyebrow.payable { color: var(--ex-cleared); } .sm-eyebrow.recoverable { color: var(--ex-blocked); }
.sm-net { font-size: 30px; font-weight: 850; line-height: 1.05; }
.sm-paid { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--ex-text-muted); }
.sm-paid svg { color: var(--ex-cleared); flex-shrink: 0; }

/* ── stepper ── */
.exc-steps { position: relative; display: flex; justify-content: space-between; gap: 6px; padding: 4px 30px 14px; }
.exc-steps-rail { position: absolute; left: 46px; right: 46px; top: 14px; height: 2px; border-radius: 2px; overflow: hidden;
  background: color-mix(in srgb, var(--ex-text) 10%, transparent); }
.exc-steps-fill { display: block; height: 100%; border-radius: 2px; background: var(--ex-grad-hero); transition: width 0.5s var(--ex-spring); }
.exc-step { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1; min-width: 0;
  background: transparent; border: 0; cursor: pointer; }
.exc-step:disabled { cursor: default; }
.exc-step-dot { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%;
  background: var(--ex-surface-elevated); border: 1.5px solid var(--ex-border-strong); color: var(--ex-text-dim); transition: all 0.32s var(--ex-spring); }
.exc-step.on .exc-step-dot { color: #1a1206; border-color: transparent; background: var(--ex-grad-hero); box-shadow: 0 0 0 4px color-mix(in srgb, var(--ex-amber) 16%, transparent); }
.exc-step.done .exc-step-dot { color: var(--ex-cleared); border-color: color-mix(in srgb, var(--ex-cleared) 55%, transparent); background: color-mix(in srgb, var(--ex-cleared) 14%, transparent); }
.exc-step-lbl { font-size: 10px; font-weight: 800; letter-spacing: 0.03em; text-transform: uppercase; color: var(--ex-text-muted); white-space: nowrap; }
.exc-step.on .exc-step-lbl { color: var(--ex-amber); }
.exc-step.done .exc-step-lbl { color: var(--ex-text-secondary); }

/* ── body ── */
.exc-body { position: relative; flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 2px 20px 16px; }
.exc-pane { display: flex; flex-direction: column; gap: 12px; }
.exc-lead { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--ex-text-secondary); }

.recon { display: flex; flex-direction: column; gap: 8px; }
.recon-row { display: flex; align-items: center; gap: 11px; text-align: left; padding: 11px 13px; border-radius: 12px; cursor: pointer;
  background: var(--ex-panel); border: 1px solid var(--ex-border); transition: border-color 0.25s, background 0.25s; }
.recon-row:hover { border-color: var(--ex-border-strong); }
.recon-row.on { border-color: color-mix(in srgb, var(--ex-cleared) 40%, transparent); background: color-mix(in srgb, var(--ex-cleared) 9%, transparent); }
.recon-ic { flex-shrink: 0; color: var(--ex-text-dim); transition: color 0.25s; }
.recon-row.on .recon-ic { color: var(--ex-cleared); }
.recon-txt { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.recon-txt b { font-size: 12.5px; font-weight: 700; color: var(--ex-text); }
.recon-txt small { font-size: 11px; color: var(--ex-text-muted); }

.cat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.cat { display: flex; align-items: center; gap: 8px; padding: 11px 12px; border-radius: 11px; cursor: pointer; text-align: left;
  background: var(--ex-surface); border: 1px solid var(--ex-border); color: var(--ex-text-secondary); font-size: 12px; font-weight: 700; transition: all 0.2s; }
.cat:hover { border-color: var(--ex-border-strong); transform: translateY(-1px); }
.cat svg { color: var(--ex-text-muted); flex-shrink: 0; transition: color 0.2s; }
.cat.on { border-color: color-mix(in srgb, var(--ex-cleared) 45%, transparent); background: color-mix(in srgb, var(--ex-cleared) 12%, transparent); color: var(--ex-cleared); }
.cat.on svg { color: var(--ex-cleared); }

.exc-fld { display: flex; flex-direction: column; gap: 5px; }
.exc-fld-lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: var(--ex-text-muted); }
.exc-fld-lbl i { color: var(--ex-text-dim); font-style: normal; text-transform: none; letter-spacing: 0; }
.exc-fld textarea { width: 100%; padding: 10px 12px; border-radius: 10px; font-size: 13px; font-family: inherit; resize: vertical;
  background: rgba(0,0,0,0.3); border: 1px solid var(--ex-border); color: var(--ex-text); }
.exc-fld textarea:focus { outline: none; border-color: color-mix(in srgb, var(--ex-cleared) 45%, transparent); }
[data-theme="light"] .exc-fld textarea { background: rgba(255,250,242,0.72); }

.sumcard { display: flex; flex-direction: column; border-radius: 14px; overflow: hidden; border: 1px solid var(--ex-border); background: var(--ex-panel); }
.sum-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; font-size: 12.5px; border-top: 1px solid var(--ex-border); }
.sum-row:first-child { border-top: 0; }
.sum-row span { color: var(--ex-text-muted); }
.sum-row b { color: var(--ex-text); font-weight: 700; text-align: right; }
.sum-row b.payable { color: var(--ex-cleared); } .sum-row b.recoverable { color: var(--ex-blocked); }
.sum-row.reck b.ok { display: inline-flex; align-items: center; gap: 5px; color: var(--ex-cleared); }

.exc-ack { display: flex; align-items: flex-start; gap: 10px; text-align: left; padding: 12px 14px; border-radius: 13px; cursor: pointer;
  background: var(--ex-panel); border: 1px solid var(--ex-border); transition: border-color 0.2s, background 0.2s; }
.exc-ack:hover { border-color: var(--ex-border-strong); }
.exc-ack.on { border-color: color-mix(in srgb, var(--ex-cleared) 45%, transparent); background: color-mix(in srgb, var(--ex-cleared) 9%, transparent); }
.exc-ack-box { display: grid; place-items: center; width: 20px; height: 20px; flex-shrink: 0; margin-top: 1px; border-radius: 6px;
  border: 1.5px solid color-mix(in srgb, var(--ex-text) 24%, transparent); color: #04140d; transition: all 0.2s var(--ex-spring); }
.exc-ack.on .exc-ack-box { background: var(--ex-cleared); border-color: var(--ex-cleared); }
.exc-ack-txt { font-size: 11.5px; line-height: 1.5; color: var(--ex-text-secondary); }
.exc-ack-txt b { color: var(--ex-blocked); }

/* ── footer ── */
.exc-foot { position: relative; display: flex; align-items: center; gap: 10px; padding: 12px 20px 18px; border-top: 1px solid var(--ex-border); }
.exc-count { flex: 1; text-align: center; font-size: 11px; font-weight: 600; letter-spacing: 0.03em; color: var(--ex-text-dim); font-family: var(--ex-mono); }
.exc-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer;
  border: 1px solid transparent; transition: transform 0.18s, box-shadow 0.25s; }
.exc-btn.ghost { background: transparent; border-color: var(--ex-border-strong); color: var(--ex-text-secondary); }
.exc-btn.ghost:hover:not(:disabled) { transform: translateY(-1px); }
.exc-btn.primary { background: var(--ex-grad-hero); color: #1a1206; }
.exc-btn.seal-btn { background: linear-gradient(135deg, #34d399, #059669); color: #04140d; box-shadow: 0 8px 22px -8px color-mix(in srgb, var(--ex-cleared) 60%, transparent); }
.exc-btn.seal-btn:hover:not(:disabled) { box-shadow: 0 12px 28px -8px color-mix(in srgb, var(--ex-cleared) 75%, transparent); }
.exc-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.spin { animation: seal-spin 0.8s linear infinite; }

/* pane slide */
.exc-next-enter-active, .exc-next-leave-active, .exc-prev-enter-active, .exc-prev-leave-active { transition: opacity 0.24s var(--ex-spring), transform 0.28s var(--ex-spring); }
.exc-next-enter-from { opacity: 0; transform: translateX(20px); }
.exc-next-leave-to { opacity: 0; transform: translateX(-16px); }
.exc-prev-enter-from { opacity: 0; transform: translateX(-20px); }
.exc-prev-leave-to { opacity: 0; transform: translateX(16px); }

@property --seal-p { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
@keyframes seal-spin { to { transform: rotate(360deg); } }
@keyframes seal-snap { 0% { transform: scale(0.86); } 60% { transform: scale(1.06); } 100% { transform: scale(1); } }
@keyframes seal-burst { 0% { opacity: 0.8; transform: scale(0.7); } 100% { opacity: 0; transform: scale(1.5); } }

@media (max-width: 520px) {
  .seal-stage { flex-direction: column; text-align: center; }
  .cat-grid { grid-template-columns: 1fr; }
  .exc-step-lbl { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .seal-reticle, .seal-orbit, .seal-sheen, .seal-burst, .spin { animation: none !important; }
  .seal-ring, .seal-core, .exc-steps-fill { transition: none !important; }
  .exc-next-enter-active, .exc-next-leave-active, .exc-prev-enter-active, .exc-prev-leave-active { transition: none; }
}

/* ── light theme ── */
[data-theme="light"] .seal-core { background: rgba(255,250,242,0.8); }
[data-theme="light"] .recon-row, [data-theme="light"] .cat, [data-theme="light"] .sumcard, [data-theme="light"] .exc-ack { background: rgba(255,250,242,0.7); }
[data-theme="light"] .seal-reticle { border-color: color-mix(in srgb, var(--ex-ember-deep) 22%, transparent); }
</style>
