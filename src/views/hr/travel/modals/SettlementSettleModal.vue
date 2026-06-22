<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open && s" as="div" class="sm-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.25 }" @click.self="$emit('close')">
        <Motion as="div" class="sm"
          :initial="{ opacity: 0, y: 24, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 16, scale: 0.97 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
          <span class="sm-aura" aria-hidden="true" />
          <header class="sm-head">
            <div>
              <span class="sm-eyebrow"><Wallet :size="12" /> Settlement · disburse</span>
              <h3>Settle to payroll</h3>
            </div>
            <button class="sm-x" @click="$emit('close')"><X :size="18" /></button>
          </header>

          <div class="sm-body">
            <div class="sm-who">
              <span class="w-name">{{ s.employee_name || '—' }}</span>
              <span class="w-ref trv-mono">{{ s.travel_reference_number }}</span>
              <span class="w-num trv-mono">{{ s.settlement_number }}</span>
            </div>

            <!-- posting preview -->
            <div class="sm-post" :style="{ '--c': postHex }">
              <div class="sp-top">
                <span class="sp-lab"><component :is="postIcon" :size="13" /> {{ postLabel }}</span>
                <span class="sp-val trv-mono">{{ fmtINR(netAmount) }}</span>
              </div>
              <p class="sp-desc">{{ postDesc }}</p>
            </div>

            <!-- method -->
            <div class="fld">
              <label>Disbursement method</label>
              <div class="seg">
                <button v-for="m in SETTLEMENT_METHODS" :key="m.key" class="seg-b" :class="{ on: method === m.key }"
                  :style="{ '--c': m.hex }" @click="method = m.key">
                  <component :is="m.icon" :size="14" /> {{ m.label }}
                </button>
              </div>
              <span class="seg-hint">{{ activeMethod.hint }}</span>
            </div>

            <!-- payroll period -->
            <div class="fld">
              <label>Payroll period <span class="opt">· which salary run absorbs it</span></label>
              <div class="period">
                <select v-model.number="month" class="psel">
                  <option v-for="(mn, i) in MONTHS" :key="i" :value="i + 1">{{ mn }}</option>
                </select>
                <select v-model.number="year" class="psel">
                  <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
                </select>
                <CalendarClock :size="14" class="p-ic" />
              </div>
            </div>

            <div class="fld">
              <label>Note <span class="opt">(optional)</span></label>
              <textarea v-model="note" class="inp ta" rows="2" placeholder="Posting reference / remark…" />
            </div>
          </div>

          <footer class="sm-foot">
            <button class="btn ghost" @click="$emit('close')">Cancel</button>
            <Motion as="button" class="btn primary" :disabled="busy"
              :whileHover="!busy ? { y: -2 } : {}" :whileTap="!busy ? { scale: 0.97 } : {}" @click="submit">
              <Loader2 v-if="busy" :size="15" class="spin" /><Wallet v-else :size="15" />
              Settle {{ netAmount ? fmtINR(netAmount) : '' }}
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
import { X, Wallet, Loader2, CalendarClock, TrendingUp, TrendingDown, Scale } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { fmtINR, errText, settleSettlement, SETTLEMENT_METHODS, settlementMethodMeta } from '@/composables/useTravel'

const props = defineProps({ open: Boolean, s: { type: Object, default: null } })
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const now = new Date()
const method = ref('PAYROLL')
const month = ref(now.getMonth() + 1)
const year = ref(now.getFullYear())
const note = ref('')
const busy = ref(false)
const years = computed(() => { const y = now.getFullYear(); return [y - 1, y, y + 1] })

watch(() => [props.open, props.s], () => {
  if (props.open && props.s) { method.value = 'PAYROLL'; month.value = now.getMonth() + 1; year.value = now.getFullYear(); note.value = '' }
})

const activeMethod = computed(() => settlementMethodMeta(method.value))
const payable = computed(() => Number(props.s?.payable_amount) || 0)
const recoverable = computed(() => Number(props.s?.recoverable_amount) || 0)
const dir = computed(() => payable.value > 0 ? 'payable' : recoverable.value > 0 ? 'recoverable' : 'balanced')
const netAmount = computed(() => payable.value > 0 ? payable.value : recoverable.value)
const postHex = computed(() => dir.value === 'payable' ? 'var(--trv-st-approved)' : dir.value === 'recoverable' ? 'var(--trv-st-rejected)' : 'var(--trv-steel)')
const postIcon = computed(() => dir.value === 'payable' ? TrendingUp : dir.value === 'recoverable' ? TrendingDown : Scale)
const postLabel = computed(() => dir.value === 'payable' ? 'Credit — earning' : dir.value === 'recoverable' ? 'Recovery — deduction' : 'Balanced — no posting')
const empName = computed(() => props.s?.employee_name || 'the traveller')
const postDesc = computed(() => {
  if (dir.value === 'payable') return `Credits ${fmtINR(payable.value)} to ${empName.value} as a travel reimbursement earning in the selected period.`
  if (dir.value === 'recoverable') return `Recovers ${fmtINR(recoverable.value)} from ${empName.value} as a deduction in the selected period.`
  return `Advance fully covers approved expenses — nothing posts to payroll. Marks the settlement closed and releases the linked advance & DA.`
})

const submit = async () => {
  busy.value = true
  try {
    const body = { settlement_method: method.value, period_month: month.value, period_year: year.value }
    if (note.value.trim()) body.note = note.value.trim()
    await settleSettlement(props.s.id, body)
    toast.success('Settled' + (dir.value === 'recoverable' ? ' — recovery posted' : dir.value === 'payable' ? ' — reimbursement posted' : ''))
    emit('done'); emit('close')
  } catch (e) { toast.error(errText(e, 'Could not settle')) }
  finally { busy.value = false }
}
</script>

<style scoped>
.sm-overlay { position: fixed; inset: 0; z-index: 1445; display: grid; place-items: center; padding: 18px; background: rgba(6,5,4,0.64); backdrop-filter: blur(9px); }
.sm { position: relative; width: min(460px, 96vw); overflow: hidden; display: flex; flex-direction: column; border-radius: 20px; background: var(--trv-surface-elevated); border: 1px solid var(--trv-border-strong); box-shadow: var(--trv-shadow); }
.sm-aura { position: absolute; inset: -50% 30% 60% -20%; pointer-events: none; background: radial-gradient(55% 70% at 30% 0%, rgba(251,191,36,0.18), transparent 70%); animation: trv-aura-drift 10s ease-in-out infinite; }
.sm-head { position: relative; display: flex; align-items: center; justify-content: space-between; padding: 16px 18px 12px; }
.sm-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trv-amber); }
.sm-head h3 { font-size: 17px; font-weight: 850; margin: 5px 0 0; color: var(--trv-text); }
.sm-x { background: var(--trv-panel); border: 1px solid var(--trv-border); border-radius: 9px; padding: 6px; color: var(--trv-text-dim); cursor: pointer; }
.sm-body { position: relative; padding: 6px 18px 14px; display: flex; flex-direction: column; gap: 13px; }
.sm-who { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.w-name { font-size: 14px; font-weight: 700; color: var(--trv-text); }
.w-ref { font-size: 11px; color: var(--trv-amber-bright); }
.w-num { font-size: 11px; color: var(--trv-text-muted); margin-left: auto; }

.sm-post { padding: 13px 15px; border-radius: 14px; color: var(--c); background: color-mix(in srgb, var(--c) 11%, var(--trv-surface)); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.sp-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.sp-lab { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; }
.sp-val { font-size: 22px; font-weight: 850; }
.sp-desc { margin: 6px 0 0; font-size: 11.5px; line-height: 1.5; color: var(--trv-text-secondary); }

.fld label { display: block; font-size: 11px; font-weight: 650; color: var(--trv-text-muted); margin-bottom: 7px; }
.opt { color: var(--trv-text-dim); font-weight: 500; }
.seg { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; }
.seg-b { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 8px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); transition: all 0.2s; }
.seg-b.on { color: var(--c); border-color: color-mix(in srgb, var(--c) 45%, transparent); background: color-mix(in srgb, var(--c) 12%, transparent); }
.seg-hint { display: block; margin-top: 6px; font-size: 10.5px; color: var(--trv-text-dim); }

.period { position: relative; display: flex; gap: 8px; }
.psel { flex: 1; padding: 10px 11px; border-radius: 9px; font-size: 13px; font-family: inherit; background: rgba(0,0,0,0.3); border: 1px solid var(--trv-border); color: var(--trv-text); cursor: pointer; appearance: none; }
.psel:focus { outline: none; border-color: var(--trv-amber-border); }
.p-ic { position: absolute; right: 11px; top: 50%; transform: translateY(-50%); color: var(--trv-text-dim); pointer-events: none; }
.inp { width: 100%; padding: 9px 11px; border-radius: 9px; font-size: 13px; font-family: inherit; background: rgba(0,0,0,0.3); border: 1px solid var(--trv-border); color: var(--trv-text); }
.inp:focus { outline: none; border-color: var(--trv-amber-border); }
.ta { resize: vertical; }
.sm-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 13px 18px; border-top: 1px solid var(--trv-border); }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 18px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.btn.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.btn.primary { background: var(--trv-grad-hero); color: #1a1205; box-shadow: var(--trv-amber-glow); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.spin { animation: sm-spin 0.8s linear infinite; }
@keyframes sm-spin { to { transform: rotate(360deg); } }
[data-theme="light"] .sm-overlay { background: rgba(60,40,15,0.32); }
[data-theme="light"] .inp, [data-theme="light"] .psel { background: rgba(255,250,240,0.72); }
@media (prefers-reduced-motion: reduce) { .sm-aura { animation: none; } .spin { animation: none; } }
</style>
