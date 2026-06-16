<template>
  <Teleport to="body">
    <div class="rmb-overlay ca-overlay" @mousedown.self="$emit('close')">
      <Motion as="div" class="rmb-modal rmb-receipt ca-modal" :style="{ '--ca': cfg.accent }"
              :initial="{ opacity: 0, scale: 0.94, y: 20 }"
              :animate="{ opacity: 1, scale: 1, y: 0 }"
              :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }">

        <!-- ── header ── -->
        <header class="ca-head" ref="headRef">
          <span class="ca-aura" aria-hidden="true" />
          <span class="ca-grid" aria-hidden="true" />
          <span class="rmb-spotlight" aria-hidden="true" />
          <span class="rmb-grain" aria-hidden="true" />
          <div class="ca-head-row">
            <span class="ca-eyebrow rmb-mono"><component :is="cfg.icon" :size="12" /> {{ cfg.eyebrow }}</span>
            <button class="x" @click="$emit('close')" aria-label="Close"><X :size="17" /></button>
          </div>
          <h3>{{ cfg.title }}</h3>

          <!-- claim context strip -->
          <div class="ca-ctx">
            <span class="ca-ctx-cat" :style="{ '--c': catMeta.hex }"><component :is="catMeta.icon" :size="12" /> {{ claim.category_name || catMeta.label }}</span>
            <span class="ca-ctx-num rmb-mono">{{ claim.claim_number }}</span>
            <span class="ca-ctx-amt money"><RmbMoneyValue :value="claim.amount" :decimals="0" /></span>
            <span v-if="claim.employee_name" class="ca-ctx-emp">{{ claim.employee_name }}</span>
          </div>
        </header>

        <div class="ca-body">
          <!-- state transition -->
          <Motion as="div" class="ca-flow" v-bind="reveal(0)">
            <RmbStatusStamp :status="claim.status" />
            <span class="ca-arrow" aria-hidden="true"><ArrowRight :size="16" /></span>
            <RmbStatusStamp :status="cfg.target" fresh />
          </Motion>

          <!-- approve: optional reduced amount -->
          <Motion v-if="action === 'approve'" as="label" class="ca-fld" v-bind="reveal(1)">
            <span>Approve amount <i class="opt">— blank keeps the full ₹{{ fmt(claim.amount) }}</i></span>
            <span class="ca-amt-input" :class="{ over: amountOver }">
              <span class="ca-amt-cur">₹</span>
              <input type="number" min="0" class="ca-amt-field" v-model="amount" :placeholder="String(claim.amount)" />
            </span>
            <small v-if="amountOver" class="ca-amt-warn"><AlertTriangle :size="11" /> Can't approve more than the ₹{{ fmt(claim.amount) }} claimed.</small>
          </Motion>

          <!-- quick reasons -->
          <Motion v-if="cfg.quick.length" as="div" class="ca-quick" v-bind="reveal(action === 'approve' ? 2 : 1)">
            <span class="ca-quick-lbl">Quick {{ action === 'reject' ? 'reasons' : 'asks' }}</span>
            <div class="ca-chips">
              <button v-for="qr in cfg.quick" :key="qr" type="button" class="ca-chip"
                      :class="{ on: note.includes(qr) }" @click="addQuick(qr)">{{ qr }}</button>
            </div>
          </Motion>

          <!-- note / reason -->
          <Motion as="label" class="ca-fld" v-bind="reveal(action === 'approve' ? 3 : 2)">
            <span>{{ cfg.noteLabel }}<i v-if="cfg.noteRequired" class="req">*</i></span>
            <textarea class="rmb-input" rows="3" v-model="note" maxlength="1000" :placeholder="cfg.notePlaceholder"></textarea>
          </Motion>

          <Transition name="ca-err">
            <p v-if="err" class="ca-err-msg"><AlertTriangle :size="14" /> {{ err }}</p>
          </Transition>
        </div>

        <footer class="ca-foot">
          <button class="rmb-btn rmb-btn-ghost" @click="$emit('close')" :disabled="busy">Cancel</button>
          <Motion as="button" class="rmb-btn ca-go" :class="{ ready: canSubmit }"
                  :whileHover="canSubmit ? { y: -2 } : {}" :whileTap="canSubmit ? { scale: 0.96 } : {}"
                  :disabled="busy || !canSubmit" @click="confirm">
            <component :is="cfg.icon" :size="15" /> {{ busy ? 'Working…' : cfg.cta }}
          </Motion>
        </footer>
      </Motion>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import { X, CheckCircle2, XCircle, Undo2, ArrowRight, AlertTriangle } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { decideClaim, decideMyClaim, requestClarification, categoryMeta, errText } from '@/composables/useReimbursements'
import { usePointerSpotlight } from '@/composables/useShiftMotion'
import RmbStatusStamp from '../components/RmbStatusStamp.vue'
import RmbMoneyValue from '../components/RmbMoneyValue.vue'

const props = defineProps({
  claim: { type: Object, required: true },
  action: { type: String, required: true },    // approve | reject | return
  surface: { type: String, default: 'admin' }, // admin | manager
})
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const headRef = ref(null)
usePointerSpotlight(headRef)

const CFG = {
  approve: {
    eyebrow: 'Approve · sign-off', title: 'Approve this claim', target: 'APPROVED',
    icon: CheckCircle2, cta: 'Approve', accent: 'var(--rmb-st-approved)',
    noteLabel: 'Note', noteRequired: false, notePlaceholder: 'Optional note for the trail',
    quick: [],
  },
  reject: {
    eyebrow: 'Reject · decline', title: 'Reject this claim', target: 'REJECTED',
    icon: XCircle, cta: 'Reject', accent: 'var(--rmb-st-rejected)',
    noteLabel: 'Reason', noteRequired: true, notePlaceholder: 'Why is this being rejected? (shown to the employee)',
    quick: ['Out of policy', 'Invalid / missing receipt', 'Duplicate claim', 'Exceeds limit', 'Not business-related'],
  },
  return: {
    eyebrow: 'Return · for correction', title: 'Return for correction', target: 'RETURNED',
    icon: Undo2, cta: 'Return', accent: 'var(--rmb-st-returned)',
    noteLabel: 'What needs fixing?', noteRequired: true, notePlaceholder: 'Tell the employee exactly what to correct',
    quick: ['Attach a valid receipt', 'Clarify the amount', 'Wrong category', 'Add a description', 'Itemise the expense'],
  },
}
const cfg = computed(() => CFG[props.action] || CFG.approve)
const catMeta = computed(() => categoryMeta(props.claim?.category_code))

const note = ref('')
const amount = ref('')
const busy = ref(false)
const err = ref('')

const fmt = (n) => Number(n || 0).toLocaleString('en-IN')
const amountOver = computed(() => props.action === 'approve' && amount.value !== '' && Number(amount.value) > Number(props.claim.amount))
const canSubmit = computed(() => {
  if (cfg.value.noteRequired && note.value.trim().length < 3) return false
  if (amountOver.value) return false
  return true
})

const reveal = (i) => ({
  initial: { opacity: 0, y: 14, filter: 'blur(5px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { delay: 0.1 + i * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
})

function addQuick(text) {
  const cur = note.value.trim()
  if (cur.includes(text)) {
    note.value = cur.split(' · ').filter(p => p !== text).join(' · ')
  } else {
    note.value = cur ? `${cur} · ${text}` : text
  }
}

async function confirm() {
  err.value = ''
  if (cfg.value.noteRequired && note.value.trim().length < 3) { err.value = 'A note of at least 3 characters is required.'; return }
  if (amountOver.value) { err.value = `Approve amount can't exceed the ₹${fmt(props.claim.amount)} claimed.`; return }
  busy.value = true
  try {
    if (props.action === 'return' && props.surface === 'admin') {
      await requestClarification(props.claim.id, { note: note.value })
    } else {
      const decision = props.action === 'approve' ? 'APPROVED' : props.action === 'reject' ? 'REJECTED' : 'RETURNED'
      const body = { decision, notes: note.value || null }
      if (props.action === 'approve' && amount.value) body.approved_amount = Number(amount.value)
      if (props.surface === 'manager') await decideMyClaim(props.claim.id, body)
      else await decideClaim(props.claim.id, body)
    }
    toast.success(`${cfg.value.cta} done`)
    emit('done'); emit('close')
  } catch (e) {
    err.value = errText(e, 'Action failed')
  } finally { busy.value = false }
}

const onKey = (e) => { if (e.key === 'Escape' && !busy.value) emit('close') }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.ca-overlay { position: fixed; inset: 0; z-index: 4000; display: grid; place-items: center; padding: 24px;
  background: rgba(0,0,0,0.55); backdrop-filter: blur(9px); }
[data-theme="light"] .ca-overlay { background: rgba(40,25,10,0.32); }

.ca-modal { width: min(480px, 96vw); max-height: 92vh; display: flex; flex-direction: column; overflow: hidden;
  background: var(--rmb-glass-deep); backdrop-filter: var(--rmb-glass-blur);
  border: 1px solid color-mix(in srgb, var(--ca) 30%, var(--rmb-border-strong));
  box-shadow: 0 40px 90px -42px color-mix(in srgb, var(--ca) 40%, rgba(0,0,0,0.7)), var(--rmb-glass-shadow); border-radius: 20px; }

/* header */
.ca-head { position: relative; flex: 0 0 auto; padding: 20px 22px 16px; overflow: hidden; border-bottom: 1px solid var(--rmb-border-soft);
  background: radial-gradient(130% 130% at 100% 0%, color-mix(in srgb, var(--ca) 20%, transparent), transparent 62%),
    linear-gradient(160deg, var(--rmb-paper-elevated), var(--rmb-paper)); }
.ca-head > :not(.ca-aura):not(.ca-grid):not(.rmb-grain):not(.rmb-spotlight) { position: relative; z-index: 2; }
.ca-aura { position: absolute; top: -90px; right: -70px; width: 240px; height: 240px; border-radius: 50%; z-index: 0;
  background: radial-gradient(circle, color-mix(in srgb, var(--ca) 52%, transparent), transparent 68%); filter: blur(40px); opacity: 0.5; animation: rmb-aura-breathe 6s ease-in-out infinite; }
.ca-grid { position: absolute; inset: 0; z-index: 0; opacity: 0.42;
  background-image: linear-gradient(var(--rmb-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--rmb-grid-line) 1px, transparent 1px);
  background-size: 28px 28px; -webkit-mask: radial-gradient(110% 90% at 80% 0%, #000, transparent 72%); mask: radial-gradient(110% 90% at 80% 0%, #000, transparent 72%); }
.ca-head-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.ca-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ca); }
.x { background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); color: var(--rmb-text-muted);
  width: 32px; height: 32px; border-radius: 10px; cursor: pointer; display: grid; place-items: center; transition: 0.2s; }
.x:hover { color: var(--ca); border-color: color-mix(in srgb, var(--ca) 45%, transparent); transform: rotate(90deg); }
.ca-head h3 { margin: 0 0 12px; font-size: 18px; font-weight: 800; letter-spacing: -0.02em; color: var(--rmb-text); }

.ca-ctx { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ca-ctx-cat { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; color: var(--c);
  padding: 3px 9px; border-radius: 999px; background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.ca-ctx-num { font-size: 11px; color: var(--rmb-text-muted); }
.ca-ctx-amt { margin-left: auto; font-size: 14px; }
.ca-ctx-amt :deep(.rmb-money-value) { font-size: 15px; }
.ca-ctx-emp { width: 100%; font-size: 11px; color: var(--rmb-text-muted); }

/* body */
.ca-body { flex: 1; overflow-y: auto; padding: 16px 22px 18px; display: flex; flex-direction: column; gap: 13px; }
.ca-body::-webkit-scrollbar { width: 8px; }
.ca-body::-webkit-scrollbar-thumb { background: var(--rmb-border-strong); border-radius: 8px; }

.ca-flow { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 2px 0; }
.ca-arrow { display: grid; place-items: center; color: var(--ca); flex: 0 0 auto; }

.ca-fld { display: flex; flex-direction: column; gap: 6px; }
.ca-fld > span { font-size: 12px; font-weight: 600; color: var(--rmb-text-secondary); }
.opt { font-style: normal; font-weight: 400; color: var(--rmb-text-muted); }
.req { color: var(--rmb-st-rejected); margin-left: 2px; font-style: normal; }
.rmb-input { width: 100%; box-sizing: border-box; background: var(--hr-input-bg); color: var(--rmb-text); resize: vertical;
  border: 1px solid var(--hr-input-border); border-radius: 10px; padding: 10px 12px; font-size: 13px; font-family: inherit; line-height: 1.5; }
.rmb-input:focus { outline: none; border-color: var(--ca); box-shadow: 0 0 0 3px color-mix(in srgb, var(--ca) 14%, transparent); }
[data-theme="light"] .rmb-input { background: rgba(40,25,10,0.04); border-color: rgba(40,25,10,0.14); }

.ca-amt-input { display: flex; align-items: center; gap: 7px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border);
  border-radius: 10px; padding: 0 12px; transition: border-color 0.2s, box-shadow 0.2s; }
[data-theme="light"] .ca-amt-input { background: rgba(40,25,10,0.04); border-color: rgba(40,25,10,0.14); }
.ca-amt-input:focus-within { border-color: var(--ca); box-shadow: 0 0 0 3px color-mix(in srgb, var(--ca) 14%, transparent); }
.ca-amt-input.over { border-color: var(--rmb-st-rejected); box-shadow: 0 0 0 3px var(--rmb-st-rejected-soft); }
.ca-amt-cur { font-family: var(--rmb-mono); font-size: 13px; color: var(--ca); flex: 0 0 auto; }
.ca-amt-field { flex: 1; min-width: 0; background: none; border: none; outline: none; padding: 10px 0; font-size: 14px; color: var(--rmb-text); font-family: var(--rmb-mono); }
.ca-amt-warn { display: flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--rmb-st-rejected); }

.ca-quick { display: flex; flex-direction: column; gap: 7px; }
.ca-quick-lbl { font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--rmb-text-muted); }
.ca-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.ca-chip { font-size: 11px; font-weight: 600; padding: 5px 11px; border-radius: 999px; cursor: pointer;
  color: var(--rmb-text-secondary); background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); transition: all 0.2s var(--rmb-spring); }
.ca-chip:hover { border-color: var(--rmb-border-strong); transform: translateY(-1px); }
.ca-chip.on { color: var(--ca); background: color-mix(in srgb, var(--ca) 14%, transparent); border-color: color-mix(in srgb, var(--ca) 45%, transparent); }

.ca-err-msg { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 12px; color: var(--rmb-st-rejected); }
.ca-err-enter-active, .ca-err-leave-active { transition: opacity 0.25s, transform 0.25s; }
.ca-err-enter-from, .ca-err-leave-to { opacity: 0; transform: translateY(-4px); }

/* footer */
.ca-foot { flex: 0 0 auto; display: flex; justify-content: flex-end; gap: 10px; padding: 14px 22px 18px;
  border-top: 1px solid var(--rmb-border-soft); background: var(--rmb-glass-deep); }
.ca-go { color: #fff; border: none; opacity: 0.55; cursor: not-allowed;
  background: linear-gradient(135deg, var(--ca), color-mix(in srgb, var(--ca) 68%, #000)); transition: opacity 0.3s; }
.ca-go.ready { opacity: 1; cursor: pointer; box-shadow: 0 14px 30px -14px color-mix(in srgb, var(--ca) 70%, transparent); }

@media (prefers-reduced-motion: reduce) { .ca-aura { animation: none !important; } }
</style>
