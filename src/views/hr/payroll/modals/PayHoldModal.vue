<template>
  <Teleport to="body">
    <transition name="paym-fade">
      <div v-if="open" class="paym-overlay hold-overlay" @mousedown.self="$emit('close')">
        <Motion class="paym-modal confirm" as="div"
          :initial="{ opacity: 0, y: 30, scale: 0.95 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.5, ease: [0.16,1,0.3,1] }">
          <span class="paym-foil" />
          <button class="paym-x" @click="$emit('close')"><X :size="18" /></button>

          <header class="paym-hero">
            <div class="paym-coin"><span class="paym-coin-ring" /><span class="paym-coin-halo" /><Pause :size="22" /></div>
            <div class="paym-hero-txt">
              <p class="paym-eyebrow"><ReceiptText :size="11" /> Payslip · {{ payslip?.payslip_no }}</p>
              <h2 class="paym-title">Place payslip on hold</h2>
              <p class="paym-sub">Holding excludes this payslip from the bank disbursement file until it's released. Pick a reason — it's written to the audit trail.</p>
            </div>
          </header>

          <div class="paym-stats">
            <div class="paym-stat" :style="{'--i':0}"><span>Employee</span><b class="emp">{{ payslip?.employee_name || payslip?.employee_code || '—' }}</b></div>
            <div class="paym-stat" :style="{'--i':1}"><span>Net pay</span><b><PayMoneyValue tone="net" :value="payslip?.net_pay" :animate="false" /></b></div>
          </div>

          <div class="paym-body">
            <div class="hold-field">
              <span class="paym-label">Reason for hold <b class="paym-req">*</b></span>
              <div class="hold-reasons">
                <Motion v-for="(r, i) in REASONS" :key="r.key" as="button" type="button" class="hold-r"
                  :class="{ on: sel === r.key }"
                  :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
                  :transition="{ duration: 0.34, delay: 0.12 + i*0.04, ease: [0.16,1,0.3,1] }"
                  :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="sel = r.key">
                  <span class="hold-r-ico"><component :is="r.icon" :size="15" /></span>
                  <span class="hold-r-lbl">{{ r.label }}</span>
                  <span class="hold-r-check"><Check :size="13" /></span>
                </Motion>
              </div>
            </div>

            <label class="paym-field" :style="{'--i':6}">
              <span>{{ sel === 'OTHER' ? 'Describe the reason' : 'Additional notes' }}
                <b v-if="sel === 'OTHER'" class="paym-req">*</b>
                <em v-else class="hold-opt">optional</em></span>
              <textarea v-model="details" rows="3"
                :placeholder="sel === 'OTHER' ? 'Explain why this payslip is being held…' : 'Add any context for the record…'" />
            </label>

            <div class="paym-note danger">
              <AlertTriangle :size="15" />
              <span>The employee will not see this payslip as paid, and it's <b>excluded from the next bank file</b> until released. Released payslips can't be held — return the run first.</span>
            </div>
          </div>

          <footer class="paym-foot">
            <button class="paym-btn ghost" @click="$emit('close')">Cancel</button>
            <button class="paym-btn danger" :disabled="!valid || busy" @click="submit">
              <Pause :size="14" style="margin-right:6px;vertical-align:-2px" />{{ busy ? 'Holding…' : 'Hold payslip' }}
            </button>
          </footer>
        </Motion>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  X, Pause, Check, AlertTriangle, ReceiptText,
  CreditCard, CalendarClock, ShieldCheck, Clock, User, MoreHorizontal,
} from 'lucide-vue-next'
import PayMoneyValue from '../components/PayMoneyValue.vue'

const props = defineProps({
  open: Boolean,
  payslip: { type: Object, default: null },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'confirm'])

const REASONS = [
  { key: 'BANK',       label: 'Bank details mismatch',  icon: CreditCard },
  { key: 'ATTENDANCE', label: 'Attendance / LOP dispute', icon: CalendarClock },
  { key: 'COMPLIANCE', label: 'Compliance review',       icon: ShieldCheck },
  { key: 'APPROVAL',   label: 'Pending approval',        icon: Clock },
  { key: 'EMPLOYEE',   label: 'Employee request',        icon: User },
  { key: 'OTHER',      label: 'Other',                   icon: MoreHorizontal },
]
const LABEL = Object.fromEntries(REASONS.map(r => [r.key, r.label]))

const sel = ref('')
const details = ref('')
watch(() => props.open, (o) => { if (o) { sel.value = ''; details.value = '' } })

const valid = computed(() => {
  if (!sel.value) return false
  if (sel.value === 'OTHER') return details.value.trim().length >= 3
  return true
})

const submit = () => {
  if (!valid.value) return
  const note = details.value.trim()
  const reason = sel.value === 'OTHER' ? note : LABEL[sel.value]
  emit('confirm', { reason, note: sel.value === 'OTHER' ? undefined : (note || undefined) })
}
</script>

<style scoped>
/* hold modal sits above the payslip drawer (both teleport to body @ z 4000) */
.hold-overlay { z-index: 4200; }
.paym-stat .emp { font-size: 14px; font-family: inherit; }

.hold-field { display: flex; flex-direction: column; gap: 8px;
  animation: pay-rise 0.5s var(--pay-ease) both; animation-delay: 0.12s; }
.hold-reasons { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
@media (max-width: 480px) { .hold-reasons { grid-template-columns: 1fr; } }
.hold-r { position: relative; display: flex; align-items: center; gap: 10px; text-align: left;
  padding: 11px 13px; border-radius: 12px; cursor: pointer; overflow: hidden;
  border: 1px solid var(--pay-border-soft); background: var(--hr-input-bg); color: var(--pay-text-2);
  transition: border-color 0.18s var(--pay-ease), background 0.18s var(--pay-ease), color 0.18s var(--pay-ease); }
.hold-r:hover { border-color: var(--pay-border); color: var(--pay-text); }
.hold-r-ico { flex-shrink: 0; width: 28px; height: 28px; border-radius: 9px; display: grid; place-items: center;
  background: var(--pay-deduction-soft); color: var(--pay-deduction); transition: background 0.18s, color 0.18s; }
.hold-r-lbl { flex: 1; font-size: 12.5px; font-weight: 600; line-height: 1.25; }
.hold-r-check { flex-shrink: 0; opacity: 0; transform: scale(0.4); color: var(--pay-deduction);
  transition: opacity 0.22s var(--pay-spring), transform 0.22s var(--pay-spring); }
.hold-r.on { border-color: var(--pay-deduction); color: var(--pay-text);
  background: var(--pay-deduction-soft); box-shadow: 0 8px 22px -14px rgba(194,65,12,0.7); }
.hold-r.on .hold-r-ico { background: linear-gradient(135deg, #f59e0b, #ea580c, #c2410c); color: #fff; }
.hold-r.on .hold-r-check { opacity: 1; transform: scale(1); }

.hold-opt { font-style: normal; font-weight: 600; text-transform: none; letter-spacing: 0; color: var(--pay-text-muted); margin-left: 4px; }

@media (prefers-reduced-motion: reduce) { .hold-field, .hold-r-check { animation: none !important; transition: none !important; } }
</style>
