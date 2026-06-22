<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open && s" as="div" class="vm-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.25 }" @click.self="$emit('close')">
        <Motion as="div" class="vm"
          :initial="{ opacity: 0, y: 24, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 16, scale: 0.97 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
          <span class="vm-aura" aria-hidden="true" />
          <header class="vm-head">
            <div>
              <span class="vm-eyebrow"><ClipboardCheck :size="12" /> Settlement · verify</span>
              <h3>Verify expenses</h3>
            </div>
            <button class="vm-x" @click="$emit('close')"><X :size="18" /></button>
          </header>

          <div class="vm-body">
            <div class="vm-who">
              <span class="w-name">{{ s.employee_name || '—' }}</span>
              <span class="w-ref trv-mono">{{ s.travel_reference_number }}</span>
              <span class="w-num trv-mono">{{ s.settlement_number }}</span>
            </div>

            <!-- live net result -->
            <div class="vm-result" :style="{ '--c': prev.direction === 'payable' ? 'var(--trv-st-approved)' : prev.direction === 'recoverable' ? 'var(--trv-st-rejected)' : 'var(--trv-steel)' }">
              <span class="vr-lab"><component :is="resIcon" :size="13" /> {{ resLabel }}</span>
              <span class="vr-val trv-mono">{{ fmtINR(prev.direction === 'recoverable' ? prev.recoverable : prev.payable) }}</span>
              <span class="vr-formula trv-mono">{{ fmtCompactINR(approved) }} exp + {{ fmtCompactINR(da) }} DA − {{ fmtCompactINR(advance) }} adv</span>
            </div>

            <div v-if="daCovered > 0 || unsupportedCount" class="vm-breakdown">
              <span class="bk-item">Filed <b class="trv-mono">{{ fmtINR(filed) }}</b></span>
              <span v-if="daCovered > 0" class="bk-item cov">− Covered by DA <b class="trv-mono">{{ fmtINR(daCovered) }}</b></span>
              <span v-if="unsupportedCount" class="bk-item unsup"><ReceiptText :size="10" /> {{ unsupportedCount }} no receipt</span>
            </div>

            <div class="fld">
              <label>Approved expense <span class="opt">· filed {{ fmtINR(filed) }}</span></label>
              <div class="vm-amt">
                <span class="cur">₹</span>
                <input v-model.number="approved" type="number" min="0" :max="filed" class="inp" />
              </div>
              <input class="vm-slider" type="range" min="0" :max="filed || 1" step="1" v-model.number="approved" :style="sliderStyle" />
              <div class="vm-quick">
                <button class="qk" :class="{ on: approved === filed }" @click="approved = filed">Approve full</button>
                <button class="qk" @click="approved = Math.round(filed * 0.9)">90%</button>
                <button class="qk" @click="approved = Math.round(filed * 0.75)">75%</button>
              </div>
            </div>

            <div v-if="approved < filed" class="vm-delta">
              <TrendingDown :size="13" />
              <span v-if="daCovered > 0">Excluding {{ fmtINR(filed - approved) }}<template v-if="filed - approved - daCovered > 0"> — {{ fmtINR(daCovered) }} covered by DA + {{ fmtINR(filed - approved - daCovered) }} disallowed</template><template v-else> (covered by DA)</template></span>
              <span v-else>Disallowing {{ fmtINR(filed - approved) }} of filed expenses</span>
            </div>

            <div class="fld">
              <label>Verification note <span class="opt">(optional)</span></label>
              <textarea v-model="note" class="inp ta" rows="2" placeholder="Reason for any disallowance…" />
            </div>
          </div>

          <footer class="vm-foot">
            <button class="btn ghost" @click="$emit('close')">Cancel</button>
            <Motion as="button" class="btn primary" :disabled="busy"
              :whileHover="!busy ? { y: -2 } : {}" :whileTap="!busy ? { scale: 0.97 } : {}" @click="submit">
              <Loader2 v-if="busy" :size="15" class="spin" /><ClipboardCheck v-else :size="15" /> Verify settlement
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
import { X, ClipboardCheck, Loader2, TrendingDown, TrendingUp, Scale, ReceiptText } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { fmtINR, fmtCompactINR, errText, verifySettlement, reconcilePreview, sumDaCovered, countUnsupported, RECEIPT_THRESHOLD } from '@/composables/useTravel'

const props = defineProps({ open: Boolean, s: { type: Object, default: null } })
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const approved = ref(0)
const note = ref('')
const busy = ref(false)

const filed = computed(() => Math.round(Number(props.s?.total_expense) || 0))
const da = computed(() => Number(props.s?.da_amount) || 0)
const advance = computed(() => Number(props.s?.advance_received) || 0)
const daCovered = computed(() => Math.round(sumDaCovered(props.s?.expense_lines, props.s?.da_amount)))
const unsupportedCount = computed(() => countUnsupported(props.s?.expense_lines))

watch(() => [props.open, props.s], () => {
  if (props.open && props.s) {
    approved.value = Math.round(Number(props.s.approved_expense || props.s.total_expense) || 0)
    note.value = ''
  }
})

const prev = computed(() => reconcilePreview({ advance: advance.value, da: da.value, approvedExpense: approved.value }))
const resIcon = computed(() => prev.value.direction === 'payable' ? TrendingUp : prev.value.direction === 'recoverable' ? TrendingDown : Scale)
const resLabel = computed(() => prev.value.direction === 'payable' ? 'Net payable to traveller' : prev.value.direction === 'recoverable' ? 'Net recoverable from traveller' : 'Net balanced')

const sliderStyle = computed(() => {
  const pct = filed.value ? Math.min(100, Math.max(0, (approved.value / filed.value) * 100)) : 0
  return { background: `linear-gradient(90deg, var(--trv-amber) ${pct}%, var(--trv-steel-soft) ${pct}%)` }
})

const submit = async () => {
  busy.value = true
  try {
    const body = { approved_expense: Number(approved.value) || 0 }
    if (note.value.trim()) body.note = note.value.trim()
    await verifySettlement(props.s.id, body)
    toast.success('Settlement verified')
    emit('done'); emit('close')
  } catch (e) { toast.error(errText(e, 'Could not verify settlement')) }
  finally { busy.value = false }
}
</script>

<style scoped>
.vm-overlay { position: fixed; inset: 0; z-index: 1445; display: grid; place-items: center; padding: 18px; background: rgba(6,5,4,0.64); backdrop-filter: blur(9px); }
.vm { position: relative; width: min(460px, 96vw); overflow: hidden; display: flex; flex-direction: column; border-radius: 20px; background: var(--trv-surface-elevated); border: 1px solid var(--trv-border-strong); box-shadow: var(--trv-shadow); }
.vm-aura { position: absolute; inset: -50% 30% 60% -20%; pointer-events: none; background: radial-gradient(55% 70% at 30% 0%, rgba(251,146,60,0.16), transparent 70%); animation: trv-aura-drift 10s ease-in-out infinite; }
.vm-head { position: relative; display: flex; align-items: center; justify-content: space-between; padding: 16px 18px 12px; }
.vm-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trv-ember); }
.vm-head h3 { font-size: 17px; font-weight: 850; margin: 5px 0 0; color: var(--trv-text); }
.vm-x { background: var(--trv-panel); border: 1px solid var(--trv-border); border-radius: 9px; padding: 6px; color: var(--trv-text-dim); cursor: pointer; }
.vm-body { position: relative; padding: 6px 18px 14px; display: flex; flex-direction: column; gap: 13px; }
.vm-who { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.w-name { font-size: 14px; font-weight: 700; color: var(--trv-text); }
.w-ref { font-size: 11px; color: var(--trv-amber-bright); }
.w-num { font-size: 11px; color: var(--trv-text-muted); margin-left: auto; }

.vm-result { display: grid; grid-template-columns: 1fr auto; gap: 4px 10px; align-items: baseline; padding: 14px 16px; border-radius: 14px; color: var(--c);
  background: color-mix(in srgb, var(--c) 11%, var(--trv-surface)); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.vr-lab { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; }
.vr-val { font-size: 26px; font-weight: 850; text-align: right; }
.vr-formula { grid-column: 1 / -1; font-size: 10.5px; color: var(--trv-text-muted); }

.fld label { display: block; font-size: 11px; font-weight: 650; color: var(--trv-text-muted); margin-bottom: 6px; }
.opt { color: var(--trv-text-dim); font-weight: 500; }
.vm-amt { display: flex; align-items: center; gap: 6px; padding: 0 11px; border-radius: 9px; background: rgba(0,0,0,0.3); border: 1px solid var(--trv-border); }
.vm-amt .cur { color: var(--trv-text-muted); font-weight: 700; }
.vm-amt .inp { border: none; background: none; padding: 10px 0; }
.inp { width: 100%; padding: 9px 11px; border-radius: 9px; font-size: 13px; font-family: inherit; background: rgba(0,0,0,0.3); border: 1px solid var(--trv-border); color: var(--trv-text); }
.inp:focus { outline: none; border-color: var(--trv-amber-border); }
.ta { resize: vertical; }
.vm-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 6px; border-radius: 999px; margin: 12px 0 10px; cursor: pointer; }
.vm-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: var(--trv-amber-bright); border: 2px solid #1a1205; box-shadow: 0 0 8px rgba(251,191,36,0.6); cursor: pointer; }
.vm-slider::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: var(--trv-amber-bright); border: 2px solid #1a1205; cursor: pointer; }
.vm-quick { display: flex; gap: 6px; }
.qk { padding: 5px 12px; border-radius: 8px; font-size: 11px; font-weight: 650; cursor: pointer; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); }
.qk.on, .qk:hover { color: var(--trv-amber); border-color: var(--trv-amber-border); }
.vm-breakdown { display: flex; flex-wrap: wrap; gap: 8px; }
.bk-item { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--trv-text-secondary); padding: 5px 10px; border-radius: 8px; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.bk-item b { color: var(--trv-text); }
.bk-item.cov { color: var(--trv-amber-strong); }
.bk-item.cov b { color: var(--trv-amber-strong); }
.bk-item.unsup { color: var(--trv-st-progress); background: var(--trv-st-progress-soft); border-color: color-mix(in srgb, var(--trv-st-progress) 28%, transparent); }
.vm-delta { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--trv-st-returned); padding: 7px 11px; border-radius: 9px; background: var(--trv-st-returned-soft); border: 1px solid color-mix(in srgb, var(--trv-st-returned) 28%, transparent); }
.vm-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 13px 18px; border-top: 1px solid var(--trv-border); }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 18px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.btn.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.btn.primary { background: var(--trv-grad-hero); color: #1a1205; box-shadow: var(--trv-amber-glow); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.spin { animation: vm-spin 0.8s linear infinite; }
@keyframes vm-spin { to { transform: rotate(360deg); } }
[data-theme="light"] .vm-overlay { background: rgba(60,40,15,0.32); }
[data-theme="light"] .inp, [data-theme="light"] .vm-amt { background: rgba(255,250,240,0.72); }
@media (prefers-reduced-motion: reduce) { .vm-aura { animation: none; } .spin { animation: none; } }
</style>
