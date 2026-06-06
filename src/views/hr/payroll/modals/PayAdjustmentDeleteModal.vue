<template>
  <Teleport to="body">
    <transition name="paym-fade">
      <div v-if="open" class="paym-overlay del-overlay" @mousedown.self="$emit('close')">
        <Motion class="paym-modal danger" as="div"
          :initial="{ opacity: 0, y: 30, scale: 0.95 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.5, ease: [0.16,1,0.3,1] }">
          <span class="paym-foil" />
          <button class="paym-x" @click="$emit('close')"><X :size="18" /></button>

          <header class="paym-hero">
            <div class="eject-coin">
              <span class="eject-ticket" aria-hidden="true"><Trash2 :size="20" /></span>
              <span v-for="d in 5" :key="d" class="shred" :style="{ '--n': d }" aria-hidden="true" />
            </div>
            <div class="paym-hero-txt">
              <p class="paym-eyebrow"><Ban :size="11" /> Eject ticket · {{ kindLabel }}</p>
              <h2 class="paym-title">Eject ticket from the line?</h2>
              <p class="paym-sub">This {{ kindLabel.toLowerCase() }} is soft-deleted — it will <b>never post</b> to a pay run. It's kept in the audit history with your reason.</p>
            </div>
          </header>

          <!-- workflow steps -->
          <div class="steps">
            <div class="step" :class="{ on: !reasonOk, done: reasonOk }"><span class="s-n">1</span> Reason</div>
            <span class="s-sep" />
            <div class="step" :class="{ on: reasonOk && !confirmOk, done: confirmOk }"><span class="s-n">2</span> Confirm</div>
            <span class="s-sep" />
            <div class="step"><span class="s-n">3</span> Ejected</div>
          </div>

          <div class="paym-stats">
            <div class="paym-stat" :style="{'--i':0}"><span>Employee</span><b class="ell">{{ item?.employee_name || item?.employee_code || '—' }}</b></div>
            <div class="paym-stat" :style="{'--i':1}"><span>Type</span><b class="ell">{{ item?.sub_type || kindLabel }}</b></div>
            <div class="paym-stat" :style="{'--i':2}"><span>Amount</span><b><PayMoneyValue :tone="item?.is_deduction ? 'deduction' : 'net'" :value="item?.amount" :animate="false" /></b></div>
            <div class="paym-stat" :style="{'--i':3}"><span>Pay-run</span><b>{{ periodLabel }}</b></div>
          </div>

          <div class="paym-body">
            <div class="del-field">
              <span class="paym-label">Why eject this ticket? <b class="paym-req">*</b></span>
              <div class="del-reasons">
                <Motion v-for="(r, i) in REASONS" :key="r.key" as="button" type="button" class="del-r"
                  :class="{ on: sel === r.key }"
                  :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
                  :transition="{ duration: 0.32, delay: 0.08 + i*0.04, ease: [0.16,1,0.3,1] }"
                  :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="sel = r.key">
                  <span class="del-r-ico"><component :is="r.icon" :size="15" /></span>
                  <span class="del-r-lbl">{{ r.label }}</span>
                  <span class="del-r-check"><Check :size="13" /></span>
                </Motion>
              </div>
            </div>

            <label class="paym-field" :style="{'--i':6}">
              <span>{{ sel === 'OTHER' ? 'Describe the reason' : 'Additional notes' }}
                <b v-if="sel === 'OTHER'" class="paym-req">*</b><em v-else class="del-opt">optional</em></span>
              <textarea v-model="details" rows="2"
                :placeholder="sel === 'OTHER' ? 'Explain why this ticket is being ejected…' : 'Add context for the audit log…'" />
            </label>

            <div class="paym-note danger">
              <ShieldAlert :size="15" />
              <ul class="del-list">
                <li>The adjustment is <b>soft-deleted</b> — removed from the line but retained in the audit log.</li>
                <li>Only <b>draft</b> tickets can be ejected. <b>Paid</b> items are locked.</li>
                <li>Your <b>reason &amp; identity</b> are written to the payroll audit trail.</li>
              </ul>
            </div>

            <label class="paym-field" :style="{'--i':7}">
              <span>Type <b class="cf">{{ item?.employee_code }}</b> to confirm</span>
              <input v-model="confirmText" :placeholder="item?.employee_code" class="mono" autocomplete="off" />
            </label>
          </div>

          <footer class="paym-foot">
            <button class="paym-btn ghost" @click="$emit('close')">Keep on line</button>
            <button class="paym-btn danger" :disabled="!valid || busy" @click="submit">
              <Trash2 :size="14" style="margin-right:6px;vertical-align:-2px" />{{ busy ? 'Ejecting…' : 'Eject ticket' }}
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
  X, Trash2, Ban, Check, ShieldAlert,
  AlertTriangle, Copy, UserX, Calculator, RefreshCw, MoreHorizontal,
} from 'lucide-vue-next'
import PayMoneyValue from '../components/PayMoneyValue.vue'
import { monthLabel } from '@/composables/usePayroll'

const props = defineProps({
  open: Boolean,
  item: { type: Object, default: null },
  kindLabel: { type: String, default: 'Adjustment' },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'confirm'])

const REASONS = [
  { key: 'ERROR',      label: 'Entered in error',       icon: AlertTriangle },
  { key: 'DUPLICATE',  label: 'Duplicate adjustment',   icon: Copy },
  { key: 'WRONG_EMP',  label: 'Wrong employee',         icon: UserX },
  { key: 'WRONG_AMT',  label: 'Incorrect amount/period',icon: Calculator },
  { key: 'SUPERSEDED', label: 'Superseded by revision', icon: RefreshCw },
  { key: 'OTHER',      label: 'Other',                  icon: MoreHorizontal },
]
const LABEL = Object.fromEntries(REASONS.map(r => [r.key, r.label]))

const sel = ref(''); const details = ref(''); const confirmText = ref('')
watch(() => props.open, (o) => { if (o) { sel.value = ''; details.value = ''; confirmText.value = '' } })

const periodLabel = computed(() => props.item?.period_month ? `${monthLabel(props.item.period_month)} ${props.item.period_year}` : 'Next run')
const reasonOk = computed(() => !!sel.value && (sel.value !== 'OTHER' || details.value.trim().length >= 3))
const confirmOk = computed(() => !!props.item && confirmText.value.trim() === props.item.employee_code)
const valid = computed(() => reasonOk.value && confirmOk.value)

const submit = () => {
  if (!valid.value) return
  const note = details.value.trim()
  const reason = sel.value === 'OTHER' ? note : LABEL[sel.value]
  emit('confirm', { reason, note: sel.value === 'OTHER' ? undefined : (note || undefined) })
}
</script>

<style scoped>
.del-overlay { z-index: 4200; }
.paym-stats { grid-template-columns: repeat(2, 1fr); }
@media (max-width: 420px) { .paym-stats { grid-template-columns: 1fr; } }
.paym-stat b.ell { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; max-width: 100%; }
.paym-field span .cf { font-family: var(--pay-mono); color: var(--pay-deduction); font-weight: 800; }
.paym-field input.mono { font-family: var(--pay-mono); letter-spacing: 0.04em; }
.del-opt { font-style: normal; font-weight: 600; text-transform: none; letter-spacing: 0; color: var(--pay-text-muted); margin-left: 4px; }

/* eject hero — ticket lifts off + paper shreds fall */
.eject-coin { position: relative; flex-shrink: 0; width: 54px; height: 54px; border-radius: 16px;
  display: grid; place-items: center; }
.eject-ticket { width: 54px; height: 54px; border-radius: 16px; display: grid; place-items: center; color: #1f0f04;
  background: linear-gradient(135deg, #f59e0b, #ea580c, #c2410c);
  box-shadow: 0 12px 32px -8px rgba(234,88,12,0.55), inset 0 1px 0 rgba(255,255,255,0.4);
  animation: ej-lift 1.4s var(--pay-ease) infinite; }
.shred { position: absolute; bottom: 6px; left: 50%; width: 4px; height: 6px; border-radius: 1px;
  background: var(--pay-ember); opacity: 0; animation: ej-shred 1.4s ease-in calc(var(--n) * 0.12s) infinite; }
@keyframes ej-lift { 0%,100% { transform: translateY(0) rotate(0); } 45% { transform: translateY(-5px) rotate(-4deg); } }
@keyframes ej-shred { 0% { opacity: 0; transform: translate(-50%, 0) scale(1); }
  30% { opacity: 0.9; } 100% { opacity: 0; transform: translate(calc(-50% + (var(--n) - 3) * 11px), 26px) rotate(120deg) scale(0.4); } }

/* workflow steps */
.steps { display: flex; align-items: center; justify-content: center; gap: 9px; padding: 2px 24px 4px; }
.step { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: var(--pay-text-muted);
  transition: color 0.3s var(--pay-ease); }
.step .s-n { width: 18px; height: 18px; border-radius: 50%; display: grid; place-items: center; font-family: var(--pay-mono);
  font-size: 10px; background: var(--pay-surface); border: 1px solid var(--pay-border-soft); transition: 0.3s var(--pay-ease); }
.step.on { color: var(--pay-text); } .step.on .s-n { border-color: var(--pay-deduction); color: var(--pay-deduction); }
.step.done .s-n { background: var(--pay-grad-cta); color: #1a1206; border-color: transparent; }
.s-sep { width: 20px; height: 1px; background: var(--pay-border-soft); }

.del-field { display: flex; flex-direction: column; gap: 8px; animation: pay-rise 0.5s var(--pay-ease) both; animation-delay: 0.1s; }
.del-reasons { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
@media (max-width: 480px) { .del-reasons { grid-template-columns: 1fr; } }
.del-r { position: relative; display: flex; align-items: center; gap: 10px; text-align: left;
  padding: 11px 13px; border-radius: 12px; cursor: pointer; overflow: hidden;
  border: 1px solid var(--pay-border-soft); background: var(--hr-input-bg); color: var(--pay-text-2);
  transition: border-color 0.18s var(--pay-ease), background 0.18s var(--pay-ease), color 0.18s var(--pay-ease); }
.del-r:hover { border-color: var(--pay-border); color: var(--pay-text); }
.del-r-ico { flex-shrink: 0; width: 28px; height: 28px; border-radius: 9px; display: grid; place-items: center;
  background: var(--pay-deduction-soft); color: var(--pay-deduction); transition: background 0.18s, color 0.18s; }
.del-r-lbl { flex: 1; font-size: 12.5px; font-weight: 600; line-height: 1.25; }
.del-r-check { flex-shrink: 0; opacity: 0; transform: scale(0.4); color: var(--pay-deduction);
  transition: opacity 0.22s var(--pay-spring), transform 0.22s var(--pay-spring); }
.del-r.on { border-color: var(--pay-deduction); color: var(--pay-text); background: var(--pay-deduction-soft);
  box-shadow: 0 8px 22px -14px rgba(194,65,12,0.7); }
.del-r.on .del-r-ico { background: linear-gradient(135deg, #f59e0b, #ea580c, #c2410c); color: #fff; }
.del-r.on .del-r-check { opacity: 1; transform: scale(1); }

.del-list { margin: 0; padding-left: 16px; display: flex; flex-direction: column; gap: 5px; }
.del-list li { line-height: 1.42; }

[data-theme="light"] .del-r.on .del-r-ico { color: #fff; }
@media (prefers-reduced-motion: reduce) {
  .del-field, .del-r-check, .eject-ticket, .shred { animation: none !important; transition: none !important; }
}
</style>
