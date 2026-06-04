<template>
  <Teleport to="body">
    <transition name="ep">
      <div v-if="open && request" class="ep-scrim" @click.self="close">
        <Motion class="ep-voucher" as="div" role="dialog"
          :initial="{ opacity: 0, y: 22, rotateX: -8 }"
          :animate="{ opacity: 1, y: 0, rotateX: 0 }"
          :transition="{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }"
        >
          <!-- guilloché security watermark -->
          <span class="ep-guilloche" aria-hidden="true" />
          <span class="ep-perf" aria-hidden="true" />

          <header class="ep-head">
            <div class="ep-brand">
              <span class="ep-brand-mark"><Banknote :size="16" /></span>
              <div>
                <span class="ep-brand-eye leave-mono">DISBURSEMENT VOUCHER</span>
                <span class="ep-brand-ref leave-mono">{{ request.reference_no }}</span>
              </div>
            </div>
            <button class="ep-close" @click="close"><X :size="14" /></button>
          </header>

          <div class="ep-body">
            <p class="ep-payto">
              Pay to <b>{{ request.employee_name }}</b><span v-if="request.department_name"> · {{ request.department_name }}</span>
            </p>

            <!-- the cheque amount -->
            <div class="ep-amount">
              <span class="ep-cur">₹</span>
              <span class="ep-amt-num leave-mono">{{ inr(request.amount) }}</span>
            </div>
            <p class="ep-words">{{ amountInWords }}</p>

            <div class="ep-line">
              <div class="ep-line-cell">
                <span class="ep-line-eye leave-mono">DAYS</span>
                <span class="ep-line-val leave-mono">{{ request.days_requested }}</span>
              </div>
              <span class="ep-line-x">×</span>
              <div class="ep-line-cell">
                <span class="ep-line-eye leave-mono">BASIC / MO</span>
                <span class="ep-line-val leave-mono">₹{{ inr(request.basic_salary_snapshot) }}</span>
              </div>
              <span class="ep-line-x">→</span>
              <div class="ep-line-cell pay">
                <span class="ep-line-eye leave-mono">PAYOUT</span>
                <span class="ep-line-val leave-mono">₹{{ inr(request.amount) }}</span>
              </div>
            </div>

            <label class="ep-field">
              <span class="ep-flabel">Payroll reference <em>(recommended — ties this payout to a payroll batch)</em></span>
              <input v-model.trim="payrollRef" type="text" maxlength="80"
                placeholder="e.g. PAYRUN-2026-06 / UTR / voucher no." class="ep-input" />
            </label>

            <div class="ep-warn">
              <Info :size="13" />
              <span>Marking <b>PAID</b> records this as disbursed and stamps the payroll reference. The leave balance was already debited at sanction. This step is the payroll touchpoint.</span>
            </div>
          </div>

          <footer class="ep-foot">
            <button class="leave-btn leave-btn-sm" @click="close" :disabled="paying">Cancel</button>
            <button class="ep-pay-btn" :disabled="paying"
              @click="confirm" @mouseenter="stamping = true" @mouseleave="stamping = false">
              <CheckCheck :size="14" /> {{ paying ? 'Disbursing…' : 'Confirm & mark paid' }}
            </button>
          </footer>

          <!-- wax PAID stamp that slams in on hover/confirm -->
          <span class="ep-stamp" :class="{ show: stamping || paying }" aria-hidden="true">PAID</span>
        </Motion>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { X, Banknote, CheckCheck, Info } from 'lucide-vue-next'
import { payEncashment } from '@/composables/useLeaves'
import { useToast } from 'vue-toastification'

const props = defineProps({
  open: { type: Boolean, default: false },
  request: { type: Object, default: null },
})
const emit = defineEmits(['cancel', 'paid'])
const toast = useToast()

const payrollRef = ref('')
const paying = ref(false)
const stamping = ref(false)

watch(() => props.open, (o) => { if (o) { payrollRef.value = ''; stamping.value = false } })

const inr = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })

// Indian-system number-to-words for the cheque "amount in words" line.
const amountInWords = computed(() => {
  let n = Math.floor(Number(props.request?.amount || 0))
  if (!n) return 'Zero rupees only'
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
  const two = (x) => x < 20 ? ones[x] : `${tens[Math.floor(x / 10)]}${x % 10 ? ' ' + ones[x % 10] : ''}`
  const three = (x) => `${x >= 100 ? ones[Math.floor(x / 100)] + ' hundred' + (x % 100 ? ' ' : '') : ''}${x % 100 ? two(x % 100) : ''}`
  const parts = []
  const crore = Math.floor(n / 10000000); n %= 10000000
  const lakh = Math.floor(n / 100000); n %= 100000
  const thou = Math.floor(n / 1000); n %= 1000
  if (crore) parts.push(`${two(crore)} crore`)
  if (lakh) parts.push(`${two(lakh)} lakh`)
  if (thou) parts.push(`${two(thou)} thousand`)
  if (n) parts.push(three(n))
  const s = parts.join(' ').replace(/\s+/g, ' ').trim()
  return s.charAt(0).toUpperCase() + s.slice(1) + ' rupees only'
})

const close = () => { if (!paying.value) emit('cancel') }

const confirm = async () => {
  if (!props.request) return
  paying.value = true
  try {
    await payEncashment(props.request.id, { payroll_ref: payrollRef.value || null })
    toast.success(`Disbursed · ${props.request.reference_no}`)
    emit('paid')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Mark-paid failed')
  } finally { paying.value = false }
}
</script>

<style scoped>
@import '@/styles/leave-theme.css';

.ep-scrim {
  position: fixed; inset: 0; z-index: 1200; perspective: 1200px;
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(60% 60% at 50% 40%, rgba(251, 191, 36, 0.22), rgba(8, 10, 8, 0.6));
  backdrop-filter: blur(10px); padding: 20px;
}
.ep-voucher {
  position: relative; overflow: hidden; isolation: isolate;
  width: 500px; max-width: calc(100vw - 32px); max-height: calc(100vh - 40px);
  border-radius: 18px; padding-left: 16px;
  background:
    repeating-linear-gradient(45deg, rgba(251,191,36,0.03) 0 12px, transparent 12px 24px),
    linear-gradient(180deg, rgba(22, 18, 8, 0.97), rgba(15, 12, 7, 0.97));
  border: 1px solid rgba(251, 191, 36, 0.34);
  box-shadow: 0 50px 110px -40px rgba(0,0,0,0.85);
}
[data-theme="light"] .ep-voucher {
  background:
    repeating-linear-gradient(45deg, rgba(180,83,9,0.03) 0 12px, transparent 12px 24px),
    linear-gradient(180deg, #fffdf6, #fff6e4);
  border-color: rgba(180, 83, 9, 0.26);
}
/* security guilloché */
.ep-guilloche {
  position: absolute; inset: 0; z-index: -1; pointer-events: none; opacity: 0.5;
  background:
    radial-gradient(circle at 18% 30%, transparent 38px, rgba(251,191,36,0.06) 39px, transparent 40px),
    radial-gradient(circle at 82% 70%, transparent 50px, rgba(234,88,12,0.05) 51px, transparent 52px),
    radial-gradient(circle at 50% 50%, transparent 70px, rgba(251,191,36,0.04) 71px, transparent 72px);
}
/* left perforation strip */
.ep-perf {
  position: absolute; left: 8px; top: 12px; bottom: 12px; width: 0; z-index: 1;
  border-left: 2px dashed color-mix(in srgb, var(--leave-approved) 40%, transparent);
}

.ep-head { position: relative; display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 10px; }
.ep-brand { display: flex; align-items: center; gap: 11px; }
.ep-brand-mark {
  display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px;
  background: linear-gradient(135deg, rgba(251,191,36,0.3), rgba(217,119,6,0.2));
  border: 1px solid rgba(251,191,36,0.45); color: #fef3c7;
}
[data-theme="light"] .ep-brand-mark { color: #78350f; }
.ep-brand-eye { display: block; font-size: 8.5px; font-weight: 800; letter-spacing: 0.16em; color: var(--leave-text-muted); }
.ep-brand-ref { display: block; font-size: 13px; font-weight: 800; color: var(--hr-text); margin-top: 2px; }
.ep-close { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; border: 1px solid var(--hr-border); background: transparent; color: var(--hr-text-muted); cursor: pointer; transition: transform .25s, color .2s; }
.ep-close:hover { transform: rotate(90deg); color: var(--leave-rejected); border-color: var(--leave-rejected); }

.ep-body { position: relative; padding: 6px 22px 14px; }
.ep-payto { margin: 0 0 8px; font-size: 13px; color: var(--hr-text-secondary); }
.ep-payto b { color: var(--hr-text); font-weight: 800; }

.ep-amount { display: flex; align-items: baseline; gap: 6px; padding: 8px 0 2px; }
.ep-cur { font-size: 26px; font-weight: 800; color: var(--leave-approved); }
.ep-amt-num {
  font-size: 44px; font-weight: 900; letter-spacing: -0.03em; line-height: 1; font-variant-numeric: tabular-nums;
  background: linear-gradient(135deg, #fde047, #f59e0b 60%, #ea580c);
  background-clip: text; -webkit-background-clip: text; color: transparent;
}
.ep-words { margin: 4px 0 0; font-size: 11.5px; font-style: italic; color: var(--hr-text-muted); border-bottom: 1px dashed var(--hr-border); padding-bottom: 12px; }

.ep-line { display: flex; align-items: center; gap: 8px; margin: 14px 0; }
.ep-line-cell { flex: 1; display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; border-radius: 10px; background: rgba(255,255,255,0.04); border: 1px solid var(--hr-border); }
[data-theme="light"] .ep-line-cell { background: rgba(255,255,255,0.6); }
.ep-line-cell.pay { background: rgba(251,191,36,0.12); border-color: color-mix(in srgb, var(--leave-approved) 40%, transparent); }
.ep-line-eye { font-size: 8px; font-weight: 800; letter-spacing: 0.12em; color: var(--hr-text-muted); }
.ep-line-val { font-size: 14px; font-weight: 800; color: var(--hr-text); font-variant-numeric: tabular-nums; }
.ep-line-cell.pay .ep-line-val { color: var(--leave-approved); }
.ep-line-x { color: var(--hr-text-muted); font-weight: 700; }

.ep-field { display: flex; flex-direction: column; gap: 5px; }
.ep-flabel { font-size: 9.5px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--hr-text-muted); }
.ep-flabel em { font-style: normal; text-transform: none; letter-spacing: 0; font-weight: 600; opacity: 0.85; }
.ep-input { padding: 10px 12px; border-radius: 10px; background: rgba(255,255,255,0.04); border: 1px solid var(--hr-border); color: var(--hr-text); font: inherit; font-size: 13px; outline: none; transition: border-color .2s, box-shadow .2s; }
[data-theme="light"] .ep-input { background: rgba(255,250,240,0.88); border-color: rgba(180,83,9,0.2); }
.ep-input:focus { border-color: var(--leave-approved); box-shadow: 0 0 0 3px rgba(251,191,36,0.12); }

.ep-warn { display: flex; gap: 8px; align-items: flex-start; margin-top: 12px; padding: 10px 12px; border-radius: 10px; background: rgba(251,191,36,0.08); border: 1px solid color-mix(in srgb, var(--leave-approved) 26%, transparent); font-size: 11.5px; line-height: 1.5; color: var(--hr-text-secondary); }
.ep-warn svg { color: var(--leave-approved); flex-shrink: 0; margin-top: 1px; }
.ep-warn b { color: var(--hr-text); font-weight: 800; }

.ep-foot { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 22px 18px; border-top: 1px solid rgba(251,191,36,0.14); }
.ep-pay-btn {
  display: inline-flex; align-items: center; gap: 7px; height: 30px; padding: 0 16px; border-radius: 8px;
  font-size: 11.5px; font-weight: 800; cursor: pointer; color: #2a1100;
  background: var(--leave-grad-cta); background-size: 240% 100%;
  border: 1px solid rgba(251,146,60,0.45);
  box-shadow: 0 12px 32px -10px rgba(234,88,12,0.55);
  transition: background-position .3s, transform .2s, box-shadow .2s;
}
.ep-pay-btn:hover:not(:disabled) { background-position: 100% 50%; transform: translateY(-1px); box-shadow: 0 16px 40px -10px rgba(234,88,12,0.7); }
.ep-pay-btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* wax PAID stamp */
.ep-stamp {
  position: absolute; top: 40%; right: 26px; z-index: 5; pointer-events: none;
  font-size: 40px; font-weight: 900; letter-spacing: 0.08em;
  color: rgba(234, 88, 12, 0.0); border: 4px solid rgba(234, 88, 12, 0);
  padding: 4px 16px; border-radius: 10px; transform: rotate(-14deg) scale(2); opacity: 0;
  transition: opacity .35s, transform .35s, color .35s, border-color .35s;
}
.ep-stamp.show {
  color: rgba(234, 88, 12, 0.55); border-color: rgba(234, 88, 12, 0.5);
  opacity: 1; transform: rotate(-14deg) scale(1);
}

.ep-enter-active, .ep-leave-active { transition: opacity .25s; }
.ep-enter-from, .ep-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) { .ep-stamp { transition: opacity .2s; transform: rotate(-14deg) scale(1); } }
</style>
