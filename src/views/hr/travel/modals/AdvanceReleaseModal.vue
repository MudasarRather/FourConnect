<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open && a" as="div" class="rm-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.25 }" @click.self="$emit('close')">
        <Motion as="div" class="rm"
          :initial="{ opacity: 0, y: 24, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 16, scale: 0.97 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
          <span class="rm-aura" aria-hidden="true" />
          <header class="rm-head">
            <div>
              <span class="rm-eyebrow"><Wallet :size="12" /> Advance · disburse</span>
              <h3>{{ isPayroll ? 'Release to payroll' : `Disburse · ${methodMeta.label}` }}</h3>
            </div>
            <button class="rm-x" @click="$emit('close')"><X :size="18" /></button>
          </header>

          <div class="rm-body">
            <!-- payout receipt preview -->
            <div class="rm-receipt">
              <span class="rr-seam" aria-hidden="true" />
              <div class="rr-top">
                <span class="rr-tag">{{ isPayroll ? 'TRAVEL_ADVANCE · non-taxable' : `DIRECT · ${methodMeta.label}` }}</span>
                <span class="rr-ref trv-mono">{{ a.travel_reference_number }}</span>
              </div>
              <div class="rr-amt trv-mono">{{ fmtINR(amount) }}</div>
              <div class="rr-to">to <b>{{ a.employee_name || '—' }}</b> · {{ isPayroll ? `${periodLabel} payroll` : `via ${methodMeta.label.toLowerCase()}` }}</div>
              <span class="rr-barcode" aria-hidden="true" />
            </div>

            <!-- disbursement rail -->
            <div class="rm-methods">
              <button v-for="m in METHODS" :key="m.key" type="button" class="rmm" :class="{ on: method === m.key }"
                :style="{ '--mc': m.hex }" @click="method = m.key">
                <component :is="m.icon" :size="14" /> {{ m.label }}
              </button>
            </div>

            <!-- payroll: period selector -->
            <template v-if="isPayroll">
              <div class="rm-seg">
                <button class="seg" :class="{ on: mode === 'next' }" @click="mode = 'next'"><Zap :size="13" /> Next run</button>
                <button class="seg" :class="{ on: mode === 'pick' }" @click="mode = 'pick'"><CalendarDays :size="13" /> Choose period</button>
              </div>
              <Motion v-if="mode === 'pick'" class="rm-period" :initial="{ opacity: 0, y: -6 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.3 }">
                <div class="fld"><label>Month</label><HrSelect v-model="month" :options="monthOpts" /></div>
                <div class="fld"><label>Year</label><HrSelect v-model="year" :options="yearOpts" /></div>
              </Motion>
            </template>

            <!-- direct disbursement: reference -->
            <div v-else class="fld">
              <label>{{ refLabel }} <span class="opt">(optional)</span></label>
              <input v-model="reference" class="inp" :placeholder="refPlaceholder" maxlength="120" />
            </div>

            <div class="fld">
              <label>Note <span class="opt">(optional)</span></label>
              <textarea v-model="note" class="inp ta" rows="2" placeholder="e.g. urgent field disbursal" />
            </div>

            <div class="rm-hint"><Info :size="12" /> {{ hint }}</div>
          </div>

          <footer class="rm-foot">
            <button class="btn ghost" @click="$emit('close')">Cancel</button>
            <Motion as="button" class="btn primary" :disabled="busy"
              :whileHover="!busy ? { y: -2 } : {}" :whileTap="!busy ? { scale: 0.97 } : {}" @click="submit">
              <Loader2 v-if="busy" :size="15" class="spin" /><Wallet v-else :size="15" /> {{ isPayroll ? 'Release' : 'Disburse' }} {{ fmtCompactINR(amount) }}
            </Motion>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X, Wallet, Zap, CalendarDays, Info, Loader2 } from 'lucide-vue-next'
import HrSelect from '@/components/hr/forms/HrSelect.vue'
import { useToast } from 'vue-toastification'
import { fmtINR, fmtCompactINR, errText, releaseAdvance, advanceEffective, SETTLEMENT_METHODS, settlementMethodMeta } from '@/composables/useTravel'

const props = defineProps({ open: Boolean, advance: { type: Object, default: null } })
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const a = computed(() => props.advance)
const amount = computed(() => advanceEffective(props.advance || {}))
const busy = ref(false)
const mode = ref('next')
const note = ref('')

// disbursement rail — carried from approval, adjustable here
const METHODS = SETTLEMENT_METHODS
const method = ref('PAYROLL')
const reference = ref('')
const isPayroll = computed(() => method.value === 'PAYROLL')
const methodMeta = computed(() => settlementMethodMeta(method.value))
const REF_META = {
  BANK_TRANSFER: { label: 'Transfer reference (UTR)', placeholder: 'e.g. NEFT / IMPS UTR number' },
  CASH: { label: 'Cash voucher no.', placeholder: 'e.g. voucher / receipt number' },
  CHEQUE: { label: 'Cheque no.', placeholder: 'e.g. cheque number' },
}
const refLabel = computed(() => (REF_META[method.value] || {}).label || 'Reference')
const refPlaceholder = computed(() => (REF_META[method.value] || {}).placeholder || 'Payment reference')
const hint = computed(() => isPayroll.value
  ? "Posts a non-taxable adjustment to the run. It's recovered automatically against the traveller's final expense settlement."
  : `Paid directly by treasury — no payroll posting. It's still recovered automatically at the traveller's final settlement.`)

const now = new Date()
const month = ref(now.getMonth() + 1)
const year = ref(now.getFullYear())

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const monthOpts = MONTHS.map((m, i) => ({ value: i + 1, label: m }))
const yearOpts = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => ({ value: y, label: String(y) }))

const periodLabel = computed(() => mode.value === 'next' ? 'next' : `${MONTHS[month.value - 1]} ${year.value}`)

watch(() => props.open, (o) => {
  if (!o) return
  mode.value = 'next'; note.value = ''; reference.value = ''
  month.value = now.getMonth() + 1; year.value = now.getFullYear()
  method.value = props.advance?.disbursement_method || 'PAYROLL'
})

const submit = async () => {
  busy.value = true
  try {
    const body = { disbursement_method: method.value }
    if (isPayroll.value) {
      if (mode.value === 'pick') { body.period_month = Number(month.value); body.period_year = Number(year.value) }
    } else if (reference.value.trim()) {
      body.disbursement_reference = reference.value.trim()
    }
    if (note.value.trim()) body.note = note.value.trim()
    await releaseAdvance(props.advance.id, body)
    toast.success(isPayroll.value ? 'Advance released to payroll' : `Advance disbursed via ${methodMeta.value.label.toLowerCase()}`)
    emit('done'); emit('close')
  } catch (e) { toast.error(errText(e, 'Could not release advance')) }
  finally { busy.value = false }
}
</script>

<style scoped>
.rm-overlay { position: fixed; inset: 0; z-index: 1445; display: grid; place-items: center; padding: 18px; background: rgba(6,5,4,0.64); backdrop-filter: blur(9px); }
.rm { position: relative; width: min(440px, 96vw); overflow: hidden; display: flex; flex-direction: column; border-radius: 20px; background: var(--trv-surface-elevated); border: 1px solid var(--trv-border-strong); box-shadow: var(--trv-shadow); }
.rm-aura { position: absolute; inset: -50% 30% 60% -20%; pointer-events: none; background: radial-gradient(55% 70% at 30% 0%, rgba(251,146,60,0.18), transparent 70%); animation: trv-aura-drift 10s ease-in-out infinite; }
.rm-head { position: relative; display: flex; align-items: center; justify-content: space-between; padding: 16px 18px 12px; }
.rm-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trv-ember); }
.rm-head h3 { font-size: 17px; font-weight: 850; margin: 5px 0 0; color: var(--trv-text); }
.rm-x { background: var(--trv-panel); border: 1px solid var(--trv-border); border-radius: 9px; padding: 6px; color: var(--trv-text-dim); cursor: pointer; }
.rm-body { position: relative; padding: 6px 18px 14px; display: flex; flex-direction: column; gap: 13px; }

/* receipt */
.rm-receipt { position: relative; padding: 16px 18px; border-radius: 14px; overflow: hidden;
  background: linear-gradient(155deg, var(--trv-pass), color-mix(in srgb, var(--trv-pass) 80%, #000));
  border: 1px solid var(--trv-pass-edge); }
.rr-seam { position: absolute; left: 0; right: 0; top: 50%; border-top: 1px dashed var(--trv-pass-edge); }
.rr-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
.rr-tag { font-size: 9px; font-weight: 700; letter-spacing: 0.08em; color: var(--trv-ember); padding: 2px 8px; border-radius: 6px; background: rgba(251,146,60,0.12); border: 1px solid rgba(251,146,60,0.28); }
.rr-ref { font-size: 11px; color: var(--trv-amber-bright); }
.rr-amt { font-size: 34px; font-weight: 860; color: var(--trv-text); line-height: 1.05; letter-spacing: -0.01em; }
.rr-to { font-size: 12px; color: var(--trv-text-muted); margin-top: 3px; }
.rr-to b { color: var(--trv-text-secondary); }
.rr-barcode { display: block; margin-top: 12px; height: 22px; border-radius: 4px;
  background: repeating-linear-gradient(90deg, var(--trv-barcode) 0 2px, transparent 2px 4px, var(--trv-barcode) 4px 5px, transparent 5px 9px); opacity: 0.5; }

.rm-methods { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.rmm { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 6px; border-radius: 9px; font-size: 11.5px; font-weight: 650; cursor: pointer; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); transition: all 0.18s; }
.rmm:hover { color: var(--trv-text-secondary); border-color: var(--trv-border-strong); }
.rmm.on { color: var(--mc); border-color: var(--mc); background: color-mix(in srgb, var(--mc) 13%, transparent); }
.rm-seg { display: flex; gap: 6px; padding: 4px; border-radius: 11px; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.seg { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; border-radius: 8px; font-size: 12px; font-weight: 650; cursor: pointer; background: none; border: none; color: var(--trv-text-muted); }
.seg.on { background: var(--trv-amber-soft); color: var(--trv-amber); }
.rm-period { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; overflow: hidden; }

.fld label { display: block; font-size: 11px; font-weight: 650; color: var(--trv-text-muted); margin-bottom: 6px; }
.opt { color: var(--trv-text-dim); font-weight: 500; }
.inp { width: 100%; padding: 9px 11px; border-radius: 9px; font-size: 13px; font-family: inherit; background: rgba(0,0,0,0.3); border: 1px solid var(--trv-border); color: var(--trv-text); }
.inp:focus { outline: none; border-color: var(--trv-amber-border); }
.ta { resize: vertical; }
.rm-hint { display: flex; align-items: flex-start; gap: 7px; font-size: 11px; line-height: 1.5; color: var(--trv-text-dim); }
.rm-hint svg { flex-shrink: 0; margin-top: 1px; }

.rm-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 13px 18px; border-top: 1px solid var(--trv-border); }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 18px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.btn.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.btn.primary { background: var(--trv-grad-hero); color: #1a1205; box-shadow: var(--trv-amber-glow); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.spin { animation: rm-spin 0.8s linear infinite; }
@keyframes rm-spin { to { transform: rotate(360deg); } }
[data-theme="light"] .rm-overlay { background: rgba(60,40,15,0.32); }
[data-theme="light"] .inp { background: rgba(255,250,240,0.72); }
[data-theme="light"] .rm-receipt { background: linear-gradient(155deg, #2a2620, #1f1c16); }
[data-theme="light"] .rr-amt, [data-theme="light"] .rr-to b { color: #f6f5f3; }
@media (prefers-reduced-motion: reduce) { .rm-aura { animation: none; } .spin { animation: none; } }
</style>
