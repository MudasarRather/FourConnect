<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open && s" as="div" class="rm-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.25 }" @click.self="$emit('close')">
        <Motion as="div" class="rm"
          :initial="{ opacity: 0, y: 24, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 16, scale: 0.97 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
          <span class="rm-aura" aria-hidden="true" />
          <header class="rm-head">
            <div>
              <span class="rm-eyebrow"><RotateCcw :size="12" /> Settlement · reverse</span>
              <h3>Reverse settlement</h3>
            </div>
            <button class="rm-x" @click="$emit('close')"><X :size="18" /></button>
          </header>

          <div class="rm-body">
            <div class="rm-who">
              <span class="w-name">{{ s.employee_name || '—' }}</span>
              <span class="w-ref trv-mono">{{ s.travel_reference_number }}</span>
              <span class="w-num trv-mono">{{ s.settlement_number }}</span>
            </div>

            <div class="rm-warn">
              <AlertTriangle :size="16" />
              <div>
                <b>This raises a counter-adjustment in payroll.</b>
                <p>{{ warnDesc }} The settlement is marked <span class="trv-mono">REVERSED</span> and the action is logged in the audit trail.</p>
              </div>
            </div>

            <div class="fld">
              <label>Reason for reversal <span class="req">*</span></label>
              <textarea v-model="reason" class="inp ta" rows="3" placeholder="Why is this settlement being clawed back?" />
              <span class="cnt" :class="{ ok: reason.trim().length >= 3 }">{{ reason.trim().length }} / min 3</span>
            </div>
          </div>

          <footer class="rm-foot">
            <button class="btn ghost" @click="$emit('close')">Cancel</button>
            <Motion as="button" class="btn danger" :disabled="busy || reason.trim().length < 3"
              :whileHover="canSubmit ? { y: -2 } : {}" :whileTap="canSubmit ? { scale: 0.97 } : {}" @click="submit">
              <Loader2 v-if="busy" :size="15" class="spin" /><RotateCcw v-else :size="15" /> Reverse settlement
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
import { X, RotateCcw, Loader2, AlertTriangle } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { fmtINR, errText, reverseSettlement } from '@/composables/useTravel'

const props = defineProps({ open: Boolean, s: { type: Object, default: null } })
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const reason = ref('')
const busy = ref(false)
const canSubmit = computed(() => !busy.value && reason.value.trim().length >= 3)

watch(() => [props.open, props.s], () => { if (props.open) reason.value = '' })

const warnDesc = computed(() => {
  const p = Number(props.s?.payable_amount) || 0
  const r = Number(props.s?.recoverable_amount) || 0
  if (p > 0) return `The ${fmtINR(p)} reimbursement posted to ${props.s?.employee_name || 'the traveller'} will be reversed.`
  if (r > 0) return `The ${fmtINR(r)} recovery deducted from ${props.s?.employee_name || 'the traveller'} will be reversed.`
  return 'Any payroll posting linked to this settlement will be reversed.'
})

const submit = async () => {
  if (!canSubmit.value) return
  busy.value = true
  try {
    await reverseSettlement(props.s.id, reason.value.trim())
    toast.success('Settlement reversed')
    emit('done'); emit('close')
  } catch (e) { toast.error(errText(e, 'Could not reverse settlement')) }
  finally { busy.value = false }
}
</script>

<style scoped>
.rm-overlay { position: fixed; inset: 0; z-index: 1445; display: grid; place-items: center; padding: 18px; background: rgba(6,5,4,0.64); backdrop-filter: blur(9px); }
.rm { position: relative; width: min(440px, 96vw); overflow: hidden; display: flex; flex-direction: column; border-radius: 20px; background: var(--trv-surface-elevated); border: 1px solid var(--trv-border-strong); box-shadow: var(--trv-shadow); }
.rm-aura { position: absolute; inset: -50% 30% 60% -20%; pointer-events: none; background: radial-gradient(55% 70% at 30% 0%, rgba(239,68,68,0.16), transparent 70%); animation: trv-aura-drift 10s ease-in-out infinite; }
.rm-head { position: relative; display: flex; align-items: center; justify-content: space-between; padding: 16px 18px 12px; }
.rm-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trv-st-rejected); }
.rm-head h3 { font-size: 17px; font-weight: 850; margin: 5px 0 0; color: var(--trv-text); }
.rm-x { background: var(--trv-panel); border: 1px solid var(--trv-border); border-radius: 9px; padding: 6px; color: var(--trv-text-dim); cursor: pointer; }
.rm-body { position: relative; padding: 6px 18px 14px; display: flex; flex-direction: column; gap: 13px; }
.rm-who { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.w-name { font-size: 14px; font-weight: 700; color: var(--trv-text); }
.w-ref { font-size: 11px; color: var(--trv-amber-bright); }
.w-num { font-size: 11px; color: var(--trv-text-muted); margin-left: auto; }
.rm-warn { display: flex; gap: 11px; padding: 12px 14px; border-radius: 12px; background: var(--trv-st-rejected-soft); border: 1px solid color-mix(in srgb, var(--trv-st-rejected) 26%, transparent); color: var(--trv-st-rejected); }
.rm-warn b { font-size: 12.5px; color: var(--trv-text); }
.rm-warn p { margin: 4px 0 0; font-size: 11.5px; line-height: 1.5; color: var(--trv-text-secondary); }
.fld label { display: block; font-size: 11px; font-weight: 650; color: var(--trv-text-muted); margin-bottom: 6px; }
.req { color: var(--trv-st-rejected); }
.inp { width: 100%; padding: 9px 11px; border-radius: 9px; font-size: 13px; font-family: inherit; background: rgba(0,0,0,0.3); border: 1px solid var(--trv-border); color: var(--trv-text); }
.inp:focus { outline: none; border-color: var(--trv-amber-border); }
.ta { resize: vertical; }
.cnt { display: block; text-align: right; margin-top: 5px; font-size: 10px; color: var(--trv-text-dim); }
.cnt.ok { color: var(--trv-st-approved); }
.rm-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 13px 18px; border-top: 1px solid var(--trv-border); }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 18px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.btn.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.btn.danger { background: linear-gradient(135deg, #ef4444, #b91c1c); color: #fff; }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.spin { animation: rm-spin 0.8s linear infinite; }
@keyframes rm-spin { to { transform: rotate(360deg); } }
[data-theme="light"] .rm-overlay { background: rgba(60,40,15,0.32); }
[data-theme="light"] .inp { background: rgba(255,250,240,0.72); }
@media (prefers-reduced-motion: reduce) { .rm-aura { animation: none; } .spin { animation: none; } }
</style>
