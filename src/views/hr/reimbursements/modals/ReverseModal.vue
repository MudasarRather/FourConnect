<template>
  <Teleport to="body">
    <div class="rmb-overlay rev-overlay" @mousedown.self="$emit('close')">
      <Motion as="div" class="rmb-modal rev-modal"
              :initial="{ opacity: 0, scale: 0.94, y: 22 }"
              :animate="{ opacity: 1, scale: 1, y: 0 }"
              :transition="{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }">

        <!-- ── header w/ clawback atmosphere ── -->
        <header class="rev-head" ref="headRef">
          <span class="rev-aura" aria-hidden="true" />
          <span class="rev-grid" aria-hidden="true" />
          <span class="rmb-spotlight" aria-hidden="true" />
          <span class="rmb-grain" aria-hidden="true" />

          <div class="rev-head-row">
            <span class="rev-eyebrow rmb-mono"><RotateCcw :size="12" /> Reverse · clawback</span>
            <button class="x" @click="$emit('close')" aria-label="Close"><X :size="17" /></button>
          </div>
          <h3>Reverse <span class="num rmb-mono">{{ claim.claim_number }}</span></h3>
          <p class="rev-sub">Unwinds the disbursement and stamps the claim <b>Reversed</b>. The employee is notified and the action is audit-logged.</p>
        </header>

        <div class="rev-body">
          <!-- state-machine transition -->
          <Motion as="div" class="rev-flow" v-bind="reveal(0)">
            <RmbStatusStamp :status="claim.status" />
            <span class="rev-arrow" :class="{ go: busy }" aria-hidden="true">
              <span class="rev-arrow-ring" />
              <RotateCcw :size="17" />
            </span>
            <RmbStatusStamp status="REVERSED" fresh />
          </Motion>

          <!-- amount being clawed back -->
          <Motion as="div" class="rev-amount" v-bind="reveal(1)">
            <div class="rev-amt-l">
              <span class="rev-amt-lbl">Amount to claw back</span>
              <div class="rev-amt-val">
                <RmbMoneyValue :value="clawAmount" :decimals="0" />
                <span class="rev-void">VOID</span>
              </div>
            </div>
            <span class="rev-amt-meta" v-if="claim.employee_name">
              {{ claim.employee_name }}
              <template v-if="methodLabel"> · {{ methodLabel }}</template>
            </span>
          </Motion>

          <!-- clawback consequence preview -->
          <Motion as="div" class="rev-claw" :class="clawback.tone" v-bind="reveal(2)">
            <span class="rev-claw-ic"><component :is="clawback.icon" :size="17" /></span>
            <div class="rev-claw-txt">
              <b>{{ clawback.title }}</b>
              <p>{{ clawback.detail }}</p>
            </div>
          </Motion>

          <!-- reason -->
          <Motion as="label" class="rev-fld" v-bind="reveal(3)">
            <span>Reversal reason <i class="req">*</i></span>
            <textarea class="rmb-input" rows="3" v-model="reason" maxlength="1000"
                      placeholder="Why is this claim being reversed? (audit-logged & shared with the employee)"></textarea>
            <small class="rev-count" :class="{ short: reason.trim().length > 0 && reason.trim().length < 3 }">
              {{ reason.length }}/1000
            </small>
          </Motion>

          <!-- authorisation toggle -->
          <Motion as="button" type="button" class="rev-ack" :class="{ on: ack }" v-bind="reveal(4)"
                  @click="ack = !ack">
            <span class="rev-ack-box"><Check :size="13" /></span>
            <span class="rev-ack-txt">I authorise this clawback and understand the action cannot be undone.</span>
          </Motion>

          <Transition name="rev-err">
            <p v-if="err" class="rev-err-msg"><AlertTriangle :size="14" /> {{ err }}</p>
          </Transition>
        </div>

        <footer class="rev-foot">
          <button class="rmb-btn rmb-btn-ghost" @click="$emit('close')" :disabled="busy">Cancel</button>
          <Motion as="button" class="rmb-btn rev-btn" :class="{ armed: canSubmit }"
                  :whileHover="canSubmit ? { y: -2 } : {}" :whileTap="canSubmit ? { scale: 0.96 } : {}"
                  :disabled="busy || !canSubmit" @click="confirm">
            <RotateCcw :size="15" class="rev-btn-ic" /> {{ busy ? 'Reversing…' : 'Reverse claim' }}
          </Motion>
        </footer>
      </Motion>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import { X, RotateCcw, Check, AlertTriangle, ShieldCheck, Clock, Wallet, Landmark } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { reverseClaim, errText, SETTLEMENT_MODES } from '@/composables/useReimbursements'
import { usePointerSpotlight } from '@/composables/useShiftMotion'
import RmbStatusStamp from '../components/RmbStatusStamp.vue'
import RmbMoneyValue from '../components/RmbMoneyValue.vue'

const props = defineProps({ claim: { type: Object, required: true } })
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const headRef = ref(null)
usePointerSpotlight(headRef)

const reason = ref('')
const ack = ref(false)
const busy = ref(false)
const err = ref('')

const reveal = (i) => ({
  initial: { opacity: 0, y: 16, filter: 'blur(5px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { delay: 0.1 + i * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
})

const clawAmount = computed(() => props.claim.approved_amount ?? props.claim.amount ?? 0)
const methodLabel = computed(() =>
  SETTLEMENT_MODES.find(m => m.key === props.claim.settlement_method)?.label || props.claim.settlement_method || '')

// Mirrors the backend /reverse clawback behaviour (status × settlement method).
const clawback = computed(() => {
  const { status, settlement_method } = props.claim
  const isPayroll = settlement_method === 'PAYROLL'
  if (status === 'APPROVED') {
    return {
      tone: 'neutral', icon: ShieldCheck,
      title: 'Nothing disbursed yet',
      detail: 'This claim was approved but never settled. Reversing voids the approval — no funds are recovered and no payslip is touched.',
    }
  }
  if (status === 'SETTLED' && isPayroll) {
    return {
      tone: 'warn', icon: Clock,
      title: 'Pending payroll line will be cancelled',
      detail: 'The reimbursement is queued on an upcoming payslip but not yet released. Reversing cancels that pending payroll adjustment before it pays out.',
    }
  }
  if (status === 'PAID' && isPayroll) {
    return {
      tone: 'danger', icon: Wallet,
      title: 'A compensating deduction will be posted',
      detail: "Already released through payroll. A matching deduction is posted to the employee's next payslip to recover the amount — the released payslip is left untouched.",
    }
  }
  return {
    tone: 'danger', icon: Landmark,
    title: 'Funds already disbursed',
    detail: `Paid out${methodLabel.value ? ` via ${methodLabel.value}` : ''}. Reversing flags the settlement as reversed and notifies the employee — recover the amount offline.`,
  }
})

const canSubmit = computed(() => reason.value.trim().length >= 3 && ack.value)

async function confirm() {
  err.value = ''
  if (reason.value.trim().length < 3) { err.value = 'A reversal reason of at least 3 characters is required.'; return }
  if (!ack.value) { err.value = 'Please authorise the clawback to continue.'; return }
  busy.value = true
  try {
    await reverseClaim(props.claim.id, { reason: reason.value.trim() })
    toast.success(`${props.claim.claim_number} reversed`)
    emit('done'); emit('close')
  } catch (e) {
    err.value = errText(e, 'Reverse failed')
  } finally { busy.value = false }
}

const onKey = (e) => { if (e.key === 'Escape' && !busy.value) emit('close') }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.rev-overlay { position: fixed; inset: 0; z-index: 4000; display: grid; place-items: center; padding: 24px;
  background: radial-gradient(120% 120% at 50% 0%, rgba(60,20,80,0.42), rgba(0,0,0,0.6)); backdrop-filter: blur(9px); }
[data-theme="light"] .rev-overlay { background: radial-gradient(120% 120% at 50% 0%, rgba(80,40,120,0.22), rgba(40,25,10,0.34)); }

.rev-modal { --rev: var(--rmb-st-reversed); --rev-soft: var(--rmb-st-reversed-soft);
  width: min(500px, 96vw); max-height: 92vh; overflow: hidden; display: flex; flex-direction: column;
  background: var(--rmb-glass-deep); backdrop-filter: var(--rmb-glass-blur);
  border: 1px solid color-mix(in srgb, var(--rev) 34%, var(--rmb-border-strong));
  box-shadow: 0 40px 90px -40px color-mix(in srgb, var(--rev) 45%, rgba(0,0,0,0.7)), var(--rmb-glass-shadow);
  border-radius: 20px; }

/* ── header ── */
.rev-head { position: relative; flex: 0 0 auto; padding: 20px 22px 18px; overflow: hidden;
  border-bottom: 1px solid var(--rmb-border-soft);
  background:
    radial-gradient(130% 130% at 100% 0%, color-mix(in srgb, var(--rev) 22%, transparent), transparent 62%),
    linear-gradient(160deg, var(--rmb-paper-elevated), var(--rmb-paper)); }
.rev-head > :not(.rev-aura):not(.rev-grid):not(.rmb-grain):not(.rmb-spotlight) { position: relative; z-index: 2; }
.rev-aura { position: absolute; top: -90px; right: -70px; width: 250px; height: 250px; border-radius: 50%; z-index: 0;
  background: conic-gradient(from 0deg, color-mix(in srgb, var(--rev) 60%, transparent), transparent 55%, color-mix(in srgb, var(--rev) 60%, transparent));
  filter: blur(40px); opacity: 0.5; animation: rev-spin 16s linear infinite; }
.rev-grid { position: absolute; inset: 0; z-index: 0; opacity: 0.45;
  background-image: linear-gradient(var(--rmb-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--rmb-grid-line) 1px, transparent 1px);
  background-size: 28px 28px; -webkit-mask: radial-gradient(110% 90% at 80% 0%, #000, transparent 72%); mask: radial-gradient(110% 90% at 80% 0%, #000, transparent 72%); }

.rev-head-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.rev-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--rev); }
.rev-eyebrow :deep(svg) { animation: rev-spin 4.5s linear infinite; }
.x { background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); color: var(--rmb-text-muted);
  width: 32px; height: 32px; border-radius: 10px; cursor: pointer; display: grid; place-items: center; transition: 0.2s; }
.x:hover { color: var(--rev); border-color: color-mix(in srgb, var(--rev) 45%, transparent); transform: rotate(90deg); }
.rev-head h3 { margin: 0; font-size: 19px; font-weight: 800; letter-spacing: -0.02em; color: var(--rmb-text); }
.rev-head h3 .num { color: var(--rev); font-weight: 700; }
.rev-sub { margin: 6px 0 0; font-size: 12px; line-height: 1.5; color: var(--rmb-text-muted); }
.rev-sub b { color: var(--rmb-text-secondary); font-weight: 700; }

/* ── body ── */
.rev-body { flex: 1; overflow-y: auto; padding: 18px 22px 20px; display: flex; flex-direction: column; gap: 14px; }
.rev-body::-webkit-scrollbar { width: 8px; }
.rev-body::-webkit-scrollbar-thumb { background: var(--rmb-border-strong); border-radius: 8px; }

/* state transition */
.rev-flow { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 4px 0 2px; }
.rev-arrow { position: relative; width: 38px; height: 38px; flex: 0 0 auto; display: grid; place-items: center; border-radius: 50%;
  color: var(--rev); background: var(--rev-soft); border: 1px solid color-mix(in srgb, var(--rev) 36%, transparent); }
.rev-arrow :deep(svg) { animation: rev-spin 7s linear infinite; }
.rev-arrow.go :deep(svg) { animation: rev-spin 0.7s linear infinite; }
.rev-arrow-ring { position: absolute; inset: -4px; border-radius: 50%; border: 1px solid var(--rev); opacity: 0;
  animation: rev-ping 2.4s ease-out infinite; }

/* amount */
.rev-amount { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  padding: 14px 16px; border-radius: 14px; background: var(--rev-soft);
  border: 1px solid color-mix(in srgb, var(--rev) 28%, transparent); }
.rev-amt-lbl { display: block; font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--rmb-text-muted); margin-bottom: 3px; }
.rev-amt-val { display: flex; align-items: center; gap: 10px; }
.rev-amt-val :deep(.rmb-money-value) { font-size: 27px; color: var(--rev);
  text-decoration: line-through; text-decoration-color: color-mix(in srgb, var(--rev) 55%, transparent); text-decoration-thickness: 2px; }
.rev-void { font-family: var(--rmb-mono); font-size: 10px; font-weight: 700; letter-spacing: 0.12em; color: var(--rev);
  padding: 3px 7px; border-radius: 6px; border: 1px dashed color-mix(in srgb, var(--rev) 55%, transparent);
  transform: rotate(-7deg); animation: rev-stamp 0.5s var(--rmb-spring) 0.35s both; }
.rev-amt-meta { font-size: 11.5px; color: var(--rmb-text-muted); text-align: right; }

/* clawback preview */
.rev-claw { display: flex; gap: 12px; padding: 13px 15px; border-radius: 13px;
  background: var(--rmb-surf-card); border: 1px solid var(--rmb-border-soft); }
.rev-claw-ic { flex: 0 0 auto; width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; }
.rev-claw-txt b { display: block; font-size: 13px; font-weight: 700; color: var(--rmb-text); margin-bottom: 3px; }
.rev-claw-txt p { margin: 0; font-size: 12px; line-height: 1.55; color: var(--rmb-text-muted); }
.rev-claw.neutral { border-color: color-mix(in srgb, var(--rmb-st-approved) 26%, var(--rmb-border-soft)); }
.rev-claw.neutral .rev-claw-ic { color: var(--rmb-st-approved); background: var(--rmb-st-approved-soft); }
.rev-claw.warn { border-color: color-mix(in srgb, var(--rmb-st-returned) 30%, var(--rmb-border-soft)); }
.rev-claw.warn .rev-claw-ic { color: var(--rmb-st-returned); background: var(--rmb-st-returned-soft); }
.rev-claw.danger { border-color: color-mix(in srgb, var(--rmb-st-rejected) 30%, var(--rmb-border-soft)); }
.rev-claw.danger .rev-claw-ic { color: var(--rmb-st-rejected); background: var(--rmb-st-rejected-soft); }

/* reason */
.rev-fld { display: flex; flex-direction: column; gap: 6px; position: relative; }
.rev-fld > span { font-size: 12px; font-weight: 600; color: var(--rmb-text-secondary); }
.req { color: var(--rmb-st-rejected); margin-left: 2px; font-style: normal; }
.rmb-input { width: 100%; box-sizing: border-box; background: var(--hr-input-bg); color: var(--rmb-text); resize: vertical;
  border: 1px solid var(--hr-input-border); border-radius: 10px; padding: 10px 12px; font-size: 13px; font-family: inherit; line-height: 1.5; }
.rmb-input:focus { outline: none; border-color: var(--rev); box-shadow: 0 0 0 3px var(--rev-soft); }
[data-theme="light"] .rmb-input { background: rgba(40,25,10,0.04); border-color: rgba(40,25,10,0.14); }
.rev-count { align-self: flex-end; font-size: 10px; color: var(--rmb-text-muted); font-family: var(--rmb-mono); }
.rev-count.short { color: var(--rmb-st-rejected); }

/* authorise toggle */
.rev-ack { display: flex; align-items: center; gap: 11px; text-align: left; width: 100%; cursor: pointer;
  padding: 11px 13px; border-radius: 12px; background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft);
  color: var(--rmb-text-secondary); transition: all 0.25s var(--rmb-spring); }
.rev-ack:hover { border-color: var(--rmb-border-strong); }
.rev-ack.on { background: var(--rev-soft); border-color: color-mix(in srgb, var(--rev) 45%, transparent); color: var(--rmb-text); }
.rev-ack-box { flex: 0 0 auto; width: 22px; height: 22px; border-radius: 7px; display: grid; place-items: center;
  border: 1.5px solid var(--rmb-border-strong); color: transparent; transition: all 0.25s var(--rmb-spring); }
.rev-ack.on .rev-ack-box { background: var(--rev); border-color: var(--rev); color: #fff; transform: scale(1.05); }
.rev-ack-txt { font-size: 12px; line-height: 1.45; }

/* error */
.rev-err-msg { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 12px; color: var(--rmb-st-rejected); }
.rev-err-enter-active, .rev-err-leave-active { transition: opacity 0.25s, transform 0.25s; }
.rev-err-enter-from, .rev-err-leave-to { opacity: 0; transform: translateY(-4px); }

/* footer */
.rev-foot { flex: 0 0 auto; display: flex; justify-content: flex-end; gap: 10px; padding: 14px 22px 18px;
  border-top: 1px solid var(--rmb-border-soft); background: var(--rmb-glass-deep); }
.rev-btn { background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); color: var(--rmb-text-muted);
  opacity: 0.7; transition: all 0.3s var(--rmb-spring); }
.rev-btn.armed { opacity: 1; color: #fff; border-color: transparent;
  background: linear-gradient(135deg, var(--rev), color-mix(in srgb, var(--rev) 70%, #7c3aed));
  box-shadow: 0 14px 30px -14px color-mix(in srgb, var(--rev) 75%, transparent); }
.rev-btn:disabled { cursor: not-allowed; }
.rev-btn.armed:hover .rev-btn-ic { animation: rev-spin 0.7s linear infinite; }

/* ── keyframes ── */
@keyframes rev-spin { to { transform: rotate(-360deg); } }
@keyframes rev-ping { 0% { transform: scale(0.7); opacity: 0.55; } 70%, 100% { transform: scale(1.5); opacity: 0; } }
@keyframes rev-stamp { 0% { transform: scale(1.6) rotate(-7deg); opacity: 0; } 60% { transform: scale(0.92) rotate(-7deg); opacity: 1; } 100% { transform: scale(1) rotate(-7deg); } }

@media (prefers-reduced-motion: reduce) {
  .rev-aura, .rev-arrow :deep(svg), .rev-arrow-ring, .rev-void, .rev-eyebrow :deep(svg),
  .rev-btn.armed:hover .rev-btn-ic { animation: none !important; }
}
</style>
