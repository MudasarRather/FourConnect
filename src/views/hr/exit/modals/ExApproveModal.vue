<!--
  ExApproveModal — "The Authorization Gate" (final F&F sign-off).
  ─────────────────────────────────────────────────────────────────────────────
  Replaces the old one-line Approve modal. Approval is the last authorization gate
  before money can be released, so this models it as a real corporate sign-off:

    • a signature "Authorization Seal" instrument that CHARGES as the authorising
      officer confirms each obligation, then strikes/seals on approve,
    • the maker-checker trail (Verified → You approve),
    • what's being authorised (net + earnings/recoveries split),
    • a gating authorization checklist (the "process") — Approve stays locked
      until every item is confirmed,
    • a reason / remark (presets + free text) recorded to the audit trail.

  Backend contract unchanged: emits { notes }. The notes now persist to the exit
  audit log (approve_settlement writes note=body.notes).
-->
<template>
  <Teleport to="body">
    <Presence>
      <div v-if="open" class="ap-overlay" @mousedown.self="$emit('close')">
        <Motion as="div" class="ap ex-grain"
          :initial="reduced ? false : { opacity: 0, y: 28, scale: 0.965 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18, scale: 0.98 }"
          :transition="{ duration: 0.34, ease: [0.16,1,0.3,1] }">
          <span class="ap-sheen" aria-hidden="true" />

          <header class="ap-head">
            <span class="ap-ico"><ShieldCheck :size="19" /></span>
            <div class="ap-htxt">
              <h3 class="ap-title">Approve Full &amp; Final</h3>
              <p class="ap-sub"><span class="ex-mono">{{ settlement?.settlement_number }}</span>
                <span class="ap-dot">·</span> final authorization before disbursement</p>
            </div>
            <button class="ap-x" type="button" @click="$emit('close')"><X :size="17" /></button>
          </header>

          <div class="ap-body">
            <!-- ════ SIGNATURE INSTRUMENT — the Authorization Seal ════ -->
            <div class="seal-wrap">
              <div class="seal" :class="{ charged: allChecked, sealing: busy }" :style="{ '--ap': ringAngle }">
                <span class="seal-aura" aria-hidden="true" />
                <span class="seal-ring" aria-hidden="true" />
                <span class="seal-reticle" aria-hidden="true" />
                <span v-for="n in 3" :key="n" class="seal-pulse" :style="{ animationDelay: (n - 1) * 1.1 + 's' }" aria-hidden="true" />
                <span class="seal-orbit" aria-hidden="true"><i /><i /><i /></span>
                <span class="seal-core">
                  <Presence mode="wait">
                    <Motion v-if="busy" key="lock" as="span" class="seal-glyph" :initial="{ scale: 0.5, opacity: 0 }" :animate="{ scale: 1, opacity: 1 }"><Loader2 :size="30" class="ap-spin" /></Motion>
                    <Motion v-else-if="allChecked" key="ok" as="span" class="seal-glyph on" :initial="reduced ? false : { scale: 0.4, rotate: -20 }" :animate="{ scale: 1, rotate: 0 }" :transition="{ type: 'spring', stiffness: 260, damping: 14 }"><BadgeCheck :size="32" /></Motion>
                    <Motion v-else key="dim" as="span" class="seal-glyph" :initial="false"><ShieldCheck :size="30" /></Motion>
                  </Presence>
                </span>
              </div>
              <div class="seal-read">
                <span class="seal-pct ex-mono">{{ Math.round(progress * 100) }}<small>%</small></span>
                <span class="seal-lbl">{{ allChecked ? 'Cleared to authorise' : `${checkedCount} of ${CHECKS.length} confirmed` }}</span>
              </div>
            </div>

            <!-- what's being authorised -->
            <div class="ap-amount" :class="dir">
              <div class="ap-amt-main">
                <span class="ap-amt-eyebrow">{{ dirLabel }}</span>
                <span class="ap-amt-v ex-mono">{{ fmtINR(netAbs) }}</span>
              </div>
              <div class="ap-split">
                <div class="ap-split-bar"><span class="seg earn" :style="{ width: earnShare + '%' }" /><span class="seg rec" :style="{ width: recShare + '%' }" /></div>
                <div class="ap-split-leg">
                  <span class="lg earn"><ArrowUpRight :size="11" /> Earnings <b class="ex-mono">{{ fmtINR(earnings) }}</b></span>
                  <span class="lg rec"><ArrowDownRight :size="11" /> Recoveries <b class="ex-mono">{{ fmtINR(recoveries) }}</b></span>
                </div>
              </div>
            </div>

            <!-- maker-checker trail -->
            <div class="ap-chain">
              <div class="ap-node done"><BadgeCheck :size="14" /><div><span class="cl">Verified</span><span class="cd">{{ settlement?.verified_at ? fmtDate(settlement.verified_at) : 'Finance' }}</span></div></div>
              <span class="ap-link"><i /><i /><i /></span>
              <div class="ap-node live"><ShieldCheck :size="14" /><div><span class="cl">Approving</span><span class="cd">You · now</span></div></div>
              <span class="ap-link pend"><i /><i /><i /></span>
              <div class="ap-node next"><Banknote :size="14" /><div><span class="cl">Disburse</span><span class="cd">next step</span></div></div>
            </div>

            <!-- authorization checklist (the process — gates Approve) -->
            <div class="ap-checks">
              <span class="ap-eyebrow"><ClipboardCheck :size="12" /> Authorization checklist</span>
              <Motion v-for="(c, i) in CHECKS" :key="c.k" as="button" type="button" class="ap-chk" :class="{ on: checks[c.k] }"
                @click="checks[c.k] = !checks[c.k]"
                :initial="reduced ? false : { opacity: 0, x: -8 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.3, delay: 0.04 + i * 0.06, ease: [0.16,1,0.3,1] }">
                <component :is="checks[c.k] ? CheckCircle2 : Circle" :size="17" class="ap-chk-ic" />
                <span class="ap-chk-l">{{ c.label }}</span>
              </Motion>
            </div>

            <!-- reason / remark -->
            <div class="ap-reason">
              <span class="ap-eyebrow"><PenLine :size="12" /> Approval remark <i>(recorded to the audit log)</i></span>
              <div class="ap-presets">
                <button v-for="p in PRESETS" :key="p" type="button" class="ap-pill" :class="{ on: remark === p }" @click="remark = remark === p ? '' : p">{{ p }}</button>
              </div>
              <textarea v-model="remark" rows="2" class="ap-ta" placeholder="Optional — basis for approval, conditions, sign-off reference…" />
            </div>

            <p class="ap-note"><Lock :size="13" /> <span>Approval <b>locks the figures</b>. The next step is <b>Disburse</b> — which posts the payout (payroll arrear or a bank/cash advice). It can still be reversed after payment if needed.</span></p>
          </div>

          <footer class="ap-foot">
            <button class="ap-btn ghost" type="button" :disabled="busy" @click="$emit('close')">Cancel</button>
            <button class="ap-btn go" type="button" :disabled="busy || !allChecked" @click="submit"
              :title="allChecked ? 'Authorise this settlement' : 'Confirm all checklist items first'">
              <Loader2 v-if="busy" :size="16" class="ap-spin" /><ShieldCheck v-else :size="16" />
              {{ busy ? 'Authorising…' : allChecked ? 'Authorise & Approve' : `Confirm all (${checkedCount}/${CHECKS.length})` }}
            </button>
          </footer>
        </Motion>
      </div>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  ShieldCheck, BadgeCheck, Banknote, X, Check, CheckCircle2, Circle, Lock, Loader2,
  ClipboardCheck, PenLine, ArrowUpRight, ArrowDownRight,
} from 'lucide-vue-next'
import { fmtINR, fmtDate } from '@/composables/useExit'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  open: { type: Boolean, default: false },
  settlement: { type: Object, default: null },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'approve'])
const reduced = prefersReduced()

const CHECKS = [
  { k: 'recon', label: 'Earnings & recoveries reconciled against the verified figures' },
  { k: 'statutory', label: 'Statutory dues (PF / ESI / TDS / gratuity) correctly accounted' },
  { k: 'recoveries', label: 'Recoveries, notice & advance adjustments authorized' },
  { k: 'authority', label: 'Net amount is within my delegated approval authority' },
]
const PRESETS = ['Figures verified & correct', 'Approved per F&F policy', 'Recoveries confirmed', 'Senior sign-off obtained']

const checks = reactive({})
const remark = ref('')

const num = (v) => Number(v || 0)
const earnings = computed(() => num(props.settlement?.total_earnings))
const recoveries = computed(() => num(props.settlement?.total_recoveries))
const net = computed(() => num(props.settlement?.net_amount))
const netAbs = computed(() => Math.abs(net.value))
const dir = computed(() => (net.value > 0 ? 'payable' : net.value < 0 ? 'recoverable' : 'balanced'))
const dirLabel = computed(() => (dir.value === 'recoverable' ? 'Net recoverable' : dir.value === 'payable' ? 'Net payable' : 'Balanced'))
const earnShare = computed(() => { const t = earnings.value + recoveries.value; return t > 0 ? Math.round((earnings.value / t) * 100) : 100 })
const recShare = computed(() => 100 - earnShare.value)

const checkedCount = computed(() => CHECKS.filter(c => checks[c.k]).length)
const progress = computed(() => checkedCount.value / CHECKS.length)
const allChecked = computed(() => checkedCount.value === CHECKS.length)
const ringAngle = computed(() => `${progress.value * 360}deg`)

watch(() => props.open, (o) => {
  if (!o) return
  CHECKS.forEach(c => { checks[c.k] = false })
  remark.value = ''
}, { immediate: true })

const submit = () => {
  if (!allChecked.value || props.busy) return
  emit('approve', { notes: remark.value.trim() || 'Approved — authorization checklist confirmed' })
}
</script>

<style scoped>
/* animatable conic angle for the seal's progress ring */
@property --ap { syntax: '<angle>'; inherits: false; initial-value: 0deg; }

.ap-overlay { position: fixed; inset: 0; z-index: 1440; display: grid; place-items: center; padding: 20px;
  background: rgba(6,5,10,0.66); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
[data-theme="light"] .ap-overlay { background: rgba(60,45,20,0.32); }
.ap { position: relative; overflow: hidden; width: min(540px, 96vw); max-height: 92vh; display: flex; flex-direction: column;
  border-radius: 22px; background: var(--ex-surface-elevated); border: 1px solid var(--ex-border-strong); box-shadow: var(--ex-shadow); }
.ap-sheen { position: absolute; inset: 0 0 auto; height: 2px; pointer-events: none;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--ex-cleared) 70%, transparent), transparent); }

.ap-head { display: flex; align-items: flex-start; gap: 12px; padding: 18px 20px 12px; flex-shrink: 0; }
.ap-ico { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
  color: var(--ex-cleared); background: color-mix(in srgb, var(--ex-cleared) 13%, transparent); border: 1px solid color-mix(in srgb, var(--ex-cleared) 30%, transparent); }
.ap-htxt { flex: 1; min-width: 0; }
.ap-title { font-size: 16px; font-weight: 830; margin: 0; color: var(--ex-text); }
.ap-sub { font-size: 12px; color: var(--ex-text-muted); margin: 3px 0 0; }
.ap-dot { opacity: 0.4; margin: 0 2px; }
.ap-x { margin-left: auto; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; cursor: pointer; flex-shrink: 0;
  background: transparent; border: 1px solid var(--ex-border); color: var(--ex-text-muted); transition: color 0.2s, border-color 0.2s; }
.ap-x:hover { color: var(--ex-text); border-color: var(--ex-border-strong); }

.ap-body { padding: 4px 20px 14px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; flex: 1 1 auto; min-height: 0; }
.ap-body > * { flex-shrink: 0; }
.ap-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 850; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ex-text-muted); }
.ap-eyebrow i { font-style: normal; text-transform: none; letter-spacing: 0; font-weight: 600; color: var(--ex-text-dim); }

/* ════ Authorization Seal (signature instrument) ════ */
.seal-wrap { display: flex; flex-direction: column; align-items: center; gap: 9px; padding: 8px 0 2px; }
.seal { --c: var(--ex-cleared); position: relative; width: 116px; height: 116px; display: grid; place-items: center; }
.seal-aura { position: absolute; inset: -14px; border-radius: 50%; pointer-events: none; opacity: 0.5;
  background: radial-gradient(circle, color-mix(in srgb, var(--c) 26%, transparent), transparent 68%);
  animation: seal-breathe 4.5s ease-in-out infinite; }
.seal.charged .seal-aura { opacity: 0.9; }
/* conic progress ring (smooth via @property) */
.seal-ring { position: absolute; inset: 0; border-radius: 50%;
  background: conic-gradient(from -90deg, var(--c) 0 var(--ap, 0deg), color-mix(in srgb, var(--ex-text) 12%, transparent) var(--ap, 0deg) 360deg);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 7px), #000 calc(100% - 6px));
          mask: radial-gradient(farthest-side, transparent calc(100% - 7px), #000 calc(100% - 6px));
  transition: --ap 0.5s cubic-bezier(0.16,1,0.3,1); }
.seal-reticle { position: absolute; inset: 10px; border-radius: 50%; border: 1px dashed color-mix(in srgb, var(--c) 30%, transparent);
  animation: seal-spin 22s linear infinite; }
.seal.charged .seal-reticle { border-color: color-mix(in srgb, var(--c) 55%, transparent); }
.seal-pulse { position: absolute; inset: 4px; border-radius: 50%; border: 1px solid color-mix(in srgb, var(--c) 40%, transparent);
  opacity: 0; }
.seal.charged .seal-pulse { animation: seal-emit 3.3s ease-out infinite; }
.seal.sealing .seal-pulse { animation: seal-emit 1s ease-out infinite; }
.seal-orbit { position: absolute; inset: 0; animation: seal-spin 14s linear infinite reverse; }
.seal-orbit i { position: absolute; top: 50%; left: 50%; width: 5px; height: 5px; margin: -2.5px; border-radius: 50%;
  background: var(--c); box-shadow: 0 0 7px var(--c); opacity: 0.7; }
.seal-orbit i:nth-child(1) { transform: rotate(0deg) translateX(58px); }
.seal-orbit i:nth-child(2) { transform: rotate(120deg) translateX(58px); }
.seal-orbit i:nth-child(3) { transform: rotate(240deg) translateX(58px); }
.seal-core { position: relative; z-index: 2; display: grid; place-items: center; width: 76px; height: 76px; border-radius: 50%;
  background: radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--ex-surface-elevated) 92%, var(--c)), var(--ex-panel));
  border: 1px solid var(--ex-border-strong); transition: border-color 0.4s, box-shadow 0.4s; }
.seal.charged .seal-core { border-color: color-mix(in srgb, var(--c) 50%, transparent); box-shadow: 0 0 22px color-mix(in srgb, var(--c) 30%, transparent), inset 0 0 16px color-mix(in srgb, var(--c) 12%, transparent); }
.seal-glyph { display: grid; place-items: center; color: var(--ex-text-dim); transition: color 0.4s; }
.seal-glyph.on { color: var(--c); filter: drop-shadow(0 0 8px color-mix(in srgb, var(--c) 60%, transparent)); }
.seal-read { text-align: center; }
.seal-pct { display: block; font-size: 22px; font-weight: 850; line-height: 1; color: var(--ex-text); }
.seal-pct small { font-size: 12px; color: var(--ex-text-muted); font-weight: 700; }
.seal-lbl { font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ex-text-muted); }
.seal.charged + .seal-read .seal-lbl, .seal.charged ~ .seal-read .seal-lbl { color: var(--ex-cleared); }

/* amount + split */
.ap-amount { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 13px 16px; border-radius: 14px;
  background: color-mix(in srgb, var(--ex-cleared) 8%, var(--ex-panel)); border: 1px solid color-mix(in srgb, var(--ex-cleared) 24%, transparent); }
.ap-amount.recoverable { background: color-mix(in srgb, var(--ex-blocked) 8%, var(--ex-panel)); border-color: color-mix(in srgb, var(--ex-blocked) 24%, transparent); }
.ap-amt-eyebrow { display: block; font-size: 9px; font-weight: 850; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ex-text-muted); }
.ap-amt-v { font-size: 24px; font-weight: 850; color: var(--ex-cleared); }
.ap-amount.recoverable .ap-amt-v { color: var(--ex-blocked); }
.ap-split { flex: 1; max-width: 56%; }
.ap-split-bar { display: flex; height: 7px; border-radius: 5px; overflow: hidden; background: color-mix(in srgb, var(--ex-text) 8%, transparent); }
.ap-split-bar .seg { height: 100%; transition: width 0.5s cubic-bezier(0.16,1,0.3,1); }
.ap-split-bar .seg.earn { background: linear-gradient(90deg, #34d399, #059669); }
.ap-split-bar .seg.rec { background: linear-gradient(90deg, #b91c1c, #f87171); }
.ap-split-leg { display: flex; justify-content: space-between; gap: 8px; margin-top: 6px; font-size: 10px; color: var(--ex-text-muted); }
.ap-split-leg .lg { display: inline-flex; align-items: center; gap: 4px; }
.ap-split-leg .lg.earn { color: var(--ex-cleared); } .ap-split-leg .lg.rec { color: var(--ex-blocked); }
.ap-split-leg b { color: var(--ex-text); }

/* maker-checker chain */
.ap-chain { display: flex; align-items: stretch; gap: 6px; }
.ap-node { flex: 1; display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 11px; background: var(--ex-panel); border: 1px solid var(--ex-border); }
.ap-node > svg { flex-shrink: 0; }
.ap-node div { display: flex; flex-direction: column; min-width: 0; }
.ap-node .cl { font-size: 11px; font-weight: 800; color: var(--ex-text); }
.ap-node .cd { font-size: 9.5px; color: var(--ex-text-muted); }
.ap-node.done { color: var(--ex-cleared); border-color: color-mix(in srgb, var(--ex-cleared) 28%, transparent); background: color-mix(in srgb, var(--ex-cleared) 8%, transparent); }
.ap-node.live { color: var(--ex-amber); border-color: var(--ex-violet-border); background: var(--ex-violet-soft); }
.ap-node.next { color: var(--ex-text-dim); opacity: 0.78; }
.ap-link { display: flex; align-items: center; gap: 3px; }
.ap-link i { width: 4px; height: 4px; border-radius: 50%; background: color-mix(in srgb, var(--ex-cleared) 60%, transparent); animation: ap-flow 1.5s ease-in-out infinite; }
.ap-link i:nth-child(2) { animation-delay: 0.2s; } .ap-link i:nth-child(3) { animation-delay: 0.4s; }
.ap-link.pend i { background: var(--ex-text-dim); animation: none; opacity: 0.4; }

/* checklist */
.ap-checks { display: flex; flex-direction: column; gap: 7px; }
.ap-chk { display: flex; align-items: center; gap: 10px; text-align: left; padding: 10px 12px; border-radius: 11px; cursor: pointer; font-size: 12px; font-weight: 600;
  color: var(--ex-text-secondary); background: var(--ex-panel); border: 1px solid var(--ex-border); transition: border-color 0.22s, background 0.22s, color 0.22s; }
.ap-chk:hover { border-color: var(--ex-border-strong); }
.ap-chk.on { color: var(--ex-text); border-color: color-mix(in srgb, var(--ex-cleared) 40%, transparent); background: color-mix(in srgb, var(--ex-cleared) 9%, transparent); }
.ap-chk-ic { flex-shrink: 0; color: var(--ex-text-dim); transition: color 0.22s; }
.ap-chk.on .ap-chk-ic { color: var(--ex-cleared); }
.ap-chk-l { line-height: 1.4; }

/* reason */
.ap-reason { display: flex; flex-direction: column; gap: 8px; }
.ap-presets { display: flex; flex-wrap: wrap; gap: 6px; }
.ap-pill { padding: 5px 11px; border-radius: 999px; font-size: 11px; font-weight: 650; cursor: pointer;
  background: var(--ex-surface); border: 1px solid var(--ex-border); color: var(--ex-text-secondary); transition: all 0.18s; }
.ap-pill:hover { border-color: var(--ex-border-strong); transform: translateY(-1px); }
.ap-pill.on { color: var(--ex-cleared); border-color: color-mix(in srgb, var(--ex-cleared) 45%, transparent); background: color-mix(in srgb, var(--ex-cleared) 11%, transparent); }
.ap-ta { width: 100%; padding: 10px 12px; border-radius: 10px; font-size: 12.5px; font-family: inherit; resize: vertical;
  background: rgba(0,0,0,0.3); border: 1px solid var(--ex-border); color: var(--ex-text); }
.ap-ta:focus { outline: none; border-color: color-mix(in srgb, var(--ex-cleared) 50%, transparent); }
[data-theme="light"] .ap-ta { background: rgba(255,250,242,0.72); }

.ap-note { display: flex; align-items: flex-start; gap: 8px; margin: 0; padding: 10px 13px; border-radius: 11px; font-size: 11.5px; line-height: 1.5;
  color: var(--ex-text-secondary); background: var(--ex-panel); border: 1px solid var(--ex-border); }
.ap-note svg { flex-shrink: 0; margin-top: 1px; color: var(--ex-cleared); }
.ap-note b { color: var(--ex-text); font-weight: 750; }

.ap-foot { display: flex; justify-content: space-between; gap: 8px; padding: 13px 20px 18px; flex-shrink: 0; border-top: 1px solid var(--ex-border); }
.ap-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: 12px; font-size: 13px; font-weight: 750; cursor: pointer; border: 1px solid transparent; transition: transform 0.18s, opacity 0.2s; }
.ap-btn:hover:not(:disabled) { transform: translateY(-1px); }
.ap-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.ap-btn.ghost { background: transparent; border-color: var(--ex-border-strong); color: var(--ex-text-secondary); }
.ap-btn.go { margin-left: auto; background: linear-gradient(135deg, #34d399, #059669); color: #04140d; box-shadow: 0 6px 18px color-mix(in srgb, var(--ex-cleared) 30%, transparent); }
.ap-spin { animation: ap-spin 0.8s linear infinite; }

@keyframes ap-spin { to { transform: rotate(360deg); } }
@keyframes seal-spin { to { transform: rotate(360deg); } }
@keyframes seal-breathe { 0%, 100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.08); opacity: 0.8; } }
@keyframes seal-emit { 0% { transform: scale(0.7); opacity: 0.7; } 100% { transform: scale(1.5); opacity: 0; } }
@keyframes ap-flow { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.15); } }

@media (max-width: 520px) { .ap-amount { flex-direction: column; align-items: flex-start; gap: 10px; } .ap-split { max-width: 100%; width: 100%; } }
@media (prefers-reduced-motion: reduce) {
  .seal-aura, .seal-reticle, .seal-pulse, .seal-orbit, .ap-link i { animation: none; }
  .ap-spin { animation: none; }
  .ap-btn, .ap-chk, .ap-pill, .seal-ring, .ap-split-bar .seg { transition: none; }
}
</style>
