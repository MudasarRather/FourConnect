<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open && a" as="div" class="am-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.25 }" @click.self="$emit('close')">
        <Motion as="div" class="am"
          :initial="{ opacity: 0, y: 24, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 16, scale: 0.97 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
          <span class="am-aura" aria-hidden="true" />
          <header class="am-head">
            <div>
              <span class="am-eyebrow"><CheckCircle2 :size="12" /> Advance · approve</span>
              <h3>Approve cash advance</h3>
            </div>
            <button class="am-x" @click="$emit('close')"><X :size="18" /></button>
          </header>

          <div class="am-body">
            <div class="am-who">
              <span class="aw-name">{{ a.employee_name || '—' }}</span>
              <span class="aw-ref trv-mono">{{ a.travel_reference_number }}</span>
              <span class="aw-req trv-mono">asked {{ fmtINR(a.advance_amount) }}</span>
            </div>

            <!-- live vault preview -->
            <div class="am-meter">
              <div class="am-gauge">
                <span class="amg-fill" :style="{ height: fillPct + '%' }"><span class="amg-men" /></span>
                <span v-if="approved < requested" class="amg-ghost" />
              </div>
              <div class="am-mid">
                <span class="am-big trv-mono">{{ fmtINR(approved) }}</span>
                <span class="am-of">of {{ fmtINR(requested) }} requested · {{ Math.round(pct) }}%</span>
              </div>
            </div>

            <div class="fld">
              <label>Approved amount</label>
              <div class="am-amt">
                <span class="cur">₹</span>
                <input v-model.number="approved" type="number" min="0" :max="requested" class="inp" />
              </div>
              <input class="am-slider" type="range" min="0" :max="requested" step="1" v-model.number="approved" :style="sliderStyle" />
              <div class="am-quick">
                <button class="qk" :class="{ on: approved === requested }" @click="approved = requested">Full</button>
                <button class="qk" @click="approved = Math.round(requested * 0.75)">75%</button>
                <button class="qk" @click="approved = Math.round(requested * 0.5)">50%</button>
              </div>
            </div>

            <div v-if="approved < requested" class="am-delta">
              <TrendingDown :size="13" /> Trimming <b>{{ fmtINR(requested - approved) }}</b> below the request
            </div>

            <div class="fld">
              <label>How will it be paid?</label>
              <div class="am-methods">
                <button v-for="m in METHODS" :key="m.key" type="button" class="amm" :class="{ on: method === m.key }"
                  :style="{ '--mc': m.hex }" @click="method = m.key">
                  <component :is="m.icon" :size="15" /> {{ m.label }}
                </button>
              </div>
              <p class="am-mhint"><Info :size="12" /> {{ methodHint }}</p>
            </div>

            <div class="fld">
              <label>Note <span class="opt">(optional)</span></label>
              <textarea v-model="note" class="inp ta" rows="2" placeholder="Reason for any adjustment…" />
            </div>
          </div>

          <footer class="am-foot">
            <button class="btn ghost" @click="$emit('close')">Cancel</button>
            <Motion as="button" class="btn primary" :disabled="busy || approved <= 0"
              :whileHover="!busy ? { y: -2 } : {}" :whileTap="!busy ? { scale: 0.97 } : {}" @click="submit">
              <Loader2 v-if="busy" :size="15" class="spin" /><Check v-else :size="15" /> Approve advance
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
import { X, Check, CheckCircle2, Loader2, TrendingDown, Info } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { fmtINR, errText, approveAdvance, SETTLEMENT_METHODS } from '@/composables/useTravel'

const props = defineProps({ open: Boolean, advance: { type: Object, default: null } })
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const a = computed(() => props.advance)
const requested = computed(() => Math.round(Number(props.advance?.advance_amount ?? 0)))
const approved = ref(0)
const note = ref('')
const busy = ref(false)

// disbursement rail — PAYROLL (recovered from salary) vs direct bank/cash
const METHODS = SETTLEMENT_METHODS
const method = ref('PAYROLL')
const METHOD_HINTS = {
  PAYROLL: 'Added to a salary run as a non-taxable advance, then recovered at final settlement.',
  BANK_TRANSFER: 'Paid directly by treasury (NEFT/IMPS). You capture the reference when you release it.',
  CASH: 'Handed over at the desk. You capture the voucher when you release it.',
}
const methodHint = computed(() => METHOD_HINTS[method.value] || 'Recovered against the traveller’s final settlement.')

watch(() => [props.open, props.advance], () => {
  if (props.open && props.advance) {
    approved.value = Math.round(Number(props.advance.approved_amount ?? props.advance.advance_amount ?? 0))
    method.value = props.advance.disbursement_method || 'PAYROLL'
    note.value = ''
  }
})

const pct = computed(() => requested.value ? Math.min(100, Math.max(0, (approved.value / requested.value) * 100)) : 0)
const fillPct = computed(() => Math.max(6, pct.value))
const sliderStyle = computed(() => ({ background: `linear-gradient(90deg, var(--trv-amber) ${pct.value}%, var(--trv-steel-soft) ${pct.value}%)` }))

const submit = async () => {
  busy.value = true
  try {
    const body = { approved_amount: Number(approved.value), disbursement_method: method.value }
    if (note.value.trim()) body.note = note.value.trim()
    await approveAdvance(props.advance.id, body)
    toast.success('Advance approved')
    emit('done'); emit('close')
  } catch (e) { toast.error(errText(e, 'Could not approve advance')) }
  finally { busy.value = false }
}
</script>

<style scoped>
.am-overlay { position: fixed; inset: 0; z-index: 1445; display: grid; place-items: center; padding: 18px; background: rgba(6,5,4,0.64); backdrop-filter: blur(9px); }
.am { position: relative; width: min(440px, 96vw); overflow: hidden; display: flex; flex-direction: column; border-radius: 20px; background: var(--trv-surface-elevated); border: 1px solid var(--trv-border-strong); box-shadow: var(--trv-shadow); }
.am-aura { position: absolute; inset: -50% 30% 60% -20%; pointer-events: none; background: radial-gradient(55% 70% at 30% 0%, rgba(52,211,153,0.16), transparent 70%); animation: trv-aura-drift 10s ease-in-out infinite; }
.am-head { position: relative; display: flex; align-items: center; justify-content: space-between; padding: 16px 18px 12px; }
.am-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trv-st-approved); }
.am-head h3 { font-size: 17px; font-weight: 850; margin: 5px 0 0; color: var(--trv-text); }
.am-x { background: var(--trv-panel); border: 1px solid var(--trv-border); border-radius: 9px; padding: 6px; color: var(--trv-text-dim); cursor: pointer; }
.am-body { position: relative; padding: 6px 18px 14px; display: flex; flex-direction: column; gap: 13px; }
.am-who { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.aw-name { font-size: 14px; font-weight: 700; color: var(--trv-text); }
.aw-ref { font-size: 11px; color: var(--trv-amber-bright); }
.aw-req { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 6px; margin-left: auto; color: var(--trv-text-muted); background: var(--trv-panel); border: 1px solid var(--trv-border); }

.am-meter { display: flex; align-items: center; gap: 16px; padding: 16px; border-radius: 14px; background: linear-gradient(180deg, var(--trv-flap), color-mix(in srgb, var(--trv-flap) 84%, #000)); border: 1px solid var(--trv-border-strong); }
.am-gauge { position: relative; width: 34px; height: 64px; border-radius: 9px; overflow: hidden; flex-shrink: 0; background: linear-gradient(100deg, rgba(0,0,0,0.45), rgba(255,255,255,0.04) 50%, rgba(0,0,0,0.45)); border: 1px solid var(--trv-border-strong); }
.amg-fill { position: absolute; left: 0; right: 0; bottom: 0; transition: height 0.5s var(--trv-spring);
  background: linear-gradient(180deg, rgba(251,191,36,0.85), rgba(245,158,11,0.5)); box-shadow: inset 0 0 12px rgba(251,191,36,0.5); }
.amg-men { position: absolute; top: -1px; left: 0; right: 0; height: 2px; background: rgba(255,237,180,0.95); box-shadow: 0 0 6px rgba(251,191,36,0.9); }
.amg-ghost { position: absolute; left: 0; right: 0; top: 0; height: 1px; border-top: 1px dashed var(--trv-amber-border); }
.am-mid { display: flex; flex-direction: column; gap: 3px; }
.am-big { font-size: 30px; font-weight: 860; color: var(--trv-amber-bright); line-height: 1; }
.am-of { font-size: 11px; color: var(--trv-text-muted); }

.fld label { display: block; font-size: 11px; font-weight: 650; color: var(--trv-text-muted); margin-bottom: 6px; }
.opt { color: var(--trv-text-dim); font-weight: 500; }
.am-amt { display: flex; align-items: center; gap: 6px; padding: 0 11px; border-radius: 9px; background: rgba(0,0,0,0.3); border: 1px solid var(--trv-border); }
.am-amt .cur { color: var(--trv-text-muted); font-weight: 700; }
.am-amt .inp { border: none; background: none; padding: 10px 0; }
.inp { width: 100%; padding: 9px 11px; border-radius: 9px; font-size: 13px; font-family: inherit; background: rgba(0,0,0,0.3); border: 1px solid var(--trv-border); color: var(--trv-text); }
.inp:focus { outline: none; border-color: var(--trv-amber-border); }
.ta { resize: vertical; }
.am-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 6px; border-radius: 999px; margin: 12px 0 10px; cursor: pointer; }
.am-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: var(--trv-amber-bright); border: 2px solid #1a1205; box-shadow: 0 0 8px rgba(251,191,36,0.6); cursor: pointer; }
.am-slider::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: var(--trv-amber-bright); border: 2px solid #1a1205; cursor: pointer; }
.am-quick { display: flex; gap: 6px; }
.qk { padding: 5px 12px; border-radius: 8px; font-size: 11px; font-weight: 650; cursor: pointer; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); }
.qk.on, .qk:hover { color: var(--trv-amber); border-color: var(--trv-amber-border); }
.am-delta { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--trv-st-returned); padding: 7px 11px; border-radius: 9px; background: var(--trv-st-returned-soft); border: 1px solid color-mix(in srgb, var(--trv-st-returned) 28%, transparent); }
.am-delta b { color: var(--trv-text); }
.am-methods { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.amm { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 6px; border-radius: 9px; font-size: 11.5px; font-weight: 650; cursor: pointer; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); transition: all 0.18s; }
.amm:hover { color: var(--trv-text-secondary); border-color: var(--trv-border-strong); }
.amm.on { color: var(--mc); border-color: var(--mc); background: color-mix(in srgb, var(--mc) 13%, transparent); }
.am-mhint { display: flex; align-items: flex-start; gap: 6px; margin: 8px 0 0; font-size: 11px; line-height: 1.45; color: var(--trv-text-dim); }
.am-mhint svg { color: var(--trv-amber); flex-shrink: 0; margin-top: 1px; }
.am-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 13px 18px; border-top: 1px solid var(--trv-border); }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 18px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.btn.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.btn.primary { background: var(--trv-grad-hero); color: #1a1205; box-shadow: var(--trv-amber-glow); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.spin { animation: am-spin 0.8s linear infinite; }
@keyframes am-spin { to { transform: rotate(360deg); } }
[data-theme="light"] .am-overlay { background: rgba(60,40,15,0.32); }
[data-theme="light"] .inp, [data-theme="light"] .am-amt { background: rgba(255,250,240,0.72); }
[data-theme="light"] .am-meter { background: linear-gradient(180deg, #2a2620, #1f1c16); }
[data-theme="light"] .am-big { color: var(--trv-amber-strong); }
@media (prefers-reduced-motion: reduce) { .am-aura { animation: none; } .spin { animation: none; } .amg-fill { transition: none; } }
</style>
