<template>
  <Teleport to="body">
    <div class="rmb-overlay" @mousedown.self="$emit('close')">
      <Motion as="div" class="rmb-modal rmb-receipt"
              :initial="{ opacity: 0, scale: 0.95, y: 18 }"
              :animate="{ opacity: 1, scale: 1, y: 0 }"
              :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
        <header class="m-head">
          <div><div class="eyebrow rmb-mono">SETTLE</div><h3>Disburse {{ claim.claim_number }}</h3></div>
          <button class="x" @click="$emit('close')"><X :size="18" /></button>
        </header>

        <div class="m-body">
          <div class="mode-tabs">
            <button v-for="m in modes" :key="m.key" class="mode" :class="{ on: mode === m.key }" @click="mode = m.key">
              <component :is="m.icon" :size="15" /> {{ m.label }}
            </button>
          </div>

          <label class="fld">
            <span>Amount (₹)</span>
            <input type="number" class="rmb-input" v-model="amount" :placeholder="String(defaultAmount)" />
            <small>Approved: ₹{{ Number(defaultAmount).toLocaleString('en-IN') }} (cannot exceed)</small>
          </label>

          <template v-if="mode === 'PAYROLL'">
            <div class="row2">
              <label class="fld"><span>Pay month</span>
                <select class="rmb-input" v-model.number="period_month">
                  <option :value="null">Next run</option>
                  <option v-for="(mn, i) in months" :key="i" :value="i + 1">{{ mn }}</option>
                </select>
              </label>
              <label class="fld"><span>Pay year</span>
                <input type="number" class="rmb-input" v-model.number="period_year" :placeholder="String(thisYear)" />
              </label>
            </div>
            <p class="note">Folds into the employee's next payslip as a reimbursement line and is marked paid on release.</p>
          </template>
          <template v-else>
            <div class="row2">
              <label class="fld"><span>Settlement date</span>
                <input type="date" class="rmb-input" v-model="settlement_date" :max="today" />
              </label>
              <label class="fld"><span>Reference (UTR / cheque #)</span>
                <input type="text" class="rmb-input" v-model="reference" placeholder="Optional" />
              </label>
            </div>
          </template>
          <p v-if="err" class="err">{{ err }}</p>
        </div>

        <footer class="m-foot">
          <button class="rmb-btn rmb-btn-ghost" @click="$emit('close')">Cancel</button>
          <Motion as="button" class="rmb-btn rmb-btn-primary" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }"
                  :disabled="busy" @click="confirm">
            <BadgeCheck :size="15" /> {{ busy ? 'Settling…' : 'Settle' }}
          </Motion>
        </footer>
      </Motion>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { X, BadgeCheck } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { SETTLEMENT_MODES, settleViaPayroll, settleDirect, errText } from '@/composables/useReimbursements'

const props = defineProps({ claim: { type: Object, required: true } })
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const modes = SETTLEMENT_MODES
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const mode = ref('PAYROLL')
const defaultAmount = computed(() => props.claim.approved_amount ?? props.claim.amount)
const amount = ref('')
const today = new Date().toISOString().slice(0, 10)
const thisYear = new Date().getFullYear()
const period_month = ref(null)
const period_year = ref(null)
const settlement_date = ref(today)
const reference = ref('')
const busy = ref(false)
const err = ref('')

async function confirm() {
  err.value = ''
  busy.value = true
  try {
    if (mode.value === 'PAYROLL') {
      await settleViaPayroll(props.claim.id, {
        approved_amount: amount.value ? Number(amount.value) : null,
        period_month: period_month.value, period_year: period_year.value,
      })
    } else {
      await settleDirect(props.claim.id, {
        method: mode.value, amount: amount.value ? Number(amount.value) : null,
        settlement_date: settlement_date.value || null, reference: reference.value || null,
      })
    }
    toast.success('Claim settled')
    emit('done'); emit('close')
  } catch (e) {
    err.value = errText(e, 'Settlement failed')
  } finally { busy.value = false }
}
</script>

<style scoped>
.rmb-overlay { position: fixed; inset: 0; z-index: 4000; display: grid; place-items: center; padding: 24px;
  background: rgba(0,0,0,0.55); backdrop-filter: blur(8px); }
[data-theme="light"] .rmb-overlay { background: rgba(40,25,10,0.32); }
.rmb-modal { width: min(500px, 96vw); background: var(--rmb-glass-deep); backdrop-filter: var(--rmb-glass-blur);
  border: 1px solid var(--rmb-border-strong); box-shadow: var(--rmb-glass-shadow); border-radius: 18px; overflow: hidden; }
.m-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 18px 20px 6px; }
.eyebrow { font-size: 10px; letter-spacing: 2.5px; color: var(--rmb-st-settled); }
.m-head h3 { margin: 3px 0 0; font-size: 18px; color: var(--rmb-text); }
.x { background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); color: var(--rmb-text-muted);
  width: 30px; height: 30px; border-radius: 9px; cursor: pointer; display: grid; place-items: center; }
.m-body { padding: 14px 20px 16px; }
.mode-tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
.mode { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 9px; font-size: 12px; font-weight: 600;
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); color: var(--rmb-text-muted); cursor: pointer; }
.mode.on { background: var(--rmb-st-settled-soft); color: var(--rmb-st-settled); border-color: var(--rmb-st-settled); }
.fld { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.fld span { font-size: 12px; font-weight: 600; color: var(--rmb-text-secondary); }
.fld small { font-size: 10.5px; color: var(--rmb-text-muted); }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.rmb-input { width: 100%; box-sizing: border-box; background: var(--hr-input-bg); color: var(--rmb-text);
  border: 1px solid var(--hr-input-border); border-radius: 9px; padding: 9px 11px; font-size: 13px; font-family: inherit; }
.rmb-input:focus { outline: none; border-color: var(--rmb-st-settled); }
[data-theme="light"] .rmb-input { background: rgba(40,25,10,0.04); border-color: rgba(40,25,10,0.14); }
.note { font-size: 11.5px; color: var(--rmb-text-muted); margin: 4px 0 0; }
.err { color: var(--rmb-st-rejected); font-size: 12px; margin: 4px 0 0; }
.m-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 12px 20px 18px; border-top: 1px solid var(--rmb-border-soft); }
</style>
