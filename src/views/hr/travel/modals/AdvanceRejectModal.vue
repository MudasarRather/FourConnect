<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open && a" as="div" class="jm-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.25 }" @click.self="$emit('close')">
        <Motion as="div" class="jm"
          :initial="{ opacity: 0, y: 24, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 16, scale: 0.97 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
          <span class="jm-aura" aria-hidden="true" />
          <header class="jm-head">
            <div>
              <span class="jm-eyebrow"><Ban :size="12" /> Advance · reject</span>
              <h3>Reject cash advance</h3>
            </div>
            <button class="jm-x" @click="$emit('close')"><X :size="18" /></button>
          </header>

          <div class="jm-body">
            <div class="jm-who">
              <span class="jw-amt trv-mono">{{ fmtINR(a.approved_amount ?? a.advance_amount) }}</span>
              <div class="jw-meta">
                <span class="jw-name">{{ a.employee_name || '—' }}</span>
                <span class="jw-ref trv-mono">{{ a.travel_reference_number }} · {{ a.advance_number }}</span>
              </div>
            </div>

            <div class="fld">
              <label>Reason <span class="req">*</span></label>
              <textarea v-model="reason" class="inp ta" rows="3" placeholder="Why is this advance being declined? The traveller sees this." />
              <span class="jm-count" :class="{ ok: reason.trim().length >= 3 }">{{ reason.trim().length }} chars · min 3</span>
            </div>

            <div class="jm-warn"><TriangleAlert :size="13" /> Rejection is final — the traveller must raise a fresh advance request if still needed.</div>
          </div>

          <footer class="jm-foot">
            <button class="btn ghost" @click="$emit('close')">Cancel</button>
            <Motion as="button" class="btn danger" :disabled="busy || reason.trim().length < 3"
              :whileHover="canSubmit ? { y: -2 } : {}" :whileTap="canSubmit ? { scale: 0.97 } : {}" @click="submit">
              <Loader2 v-if="busy" :size="15" class="spin" /><Ban v-else :size="15" /> Reject advance
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
import { X, Ban, TriangleAlert, Loader2 } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { fmtINR, errText, rejectAdvance } from '@/composables/useTravel'

const props = defineProps({ open: Boolean, advance: { type: Object, default: null } })
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const a = computed(() => props.advance)
const reason = ref('')
const busy = ref(false)
const canSubmit = computed(() => !busy.value && reason.value.trim().length >= 3)

watch(() => props.open, (o) => { if (o) reason.value = '' })

const submit = async () => {
  if (!canSubmit.value) return
  busy.value = true
  try {
    await rejectAdvance(props.advance.id, reason.value.trim())
    toast.success('Advance rejected')
    emit('done'); emit('close')
  } catch (e) { toast.error(errText(e, 'Could not reject advance')) }
  finally { busy.value = false }
}
</script>

<style scoped>
.jm-overlay { position: fixed; inset: 0; z-index: 1445; display: grid; place-items: center; padding: 18px; background: rgba(6,5,4,0.64); backdrop-filter: blur(9px); }
.jm { position: relative; width: min(420px, 96vw); overflow: hidden; display: flex; flex-direction: column; border-radius: 20px; background: var(--trv-surface-elevated); border: 1px solid var(--trv-border-strong); box-shadow: var(--trv-shadow); }
.jm-aura { position: absolute; inset: -50% 30% 60% -20%; pointer-events: none; background: radial-gradient(55% 70% at 30% 0%, rgba(239,68,68,0.16), transparent 70%); animation: trv-aura-drift 10s ease-in-out infinite; }
.jm-head { position: relative; display: flex; align-items: center; justify-content: space-between; padding: 16px 18px 12px; }
.jm-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trv-st-rejected); }
.jm-head h3 { font-size: 17px; font-weight: 850; margin: 5px 0 0; color: var(--trv-text); }
.jm-x { background: var(--trv-panel); border: 1px solid var(--trv-border); border-radius: 9px; padding: 6px; color: var(--trv-text-dim); cursor: pointer; }
.jm-body { position: relative; padding: 6px 18px 14px; display: flex; flex-direction: column; gap: 13px; }
.jm-who { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.jw-amt { font-size: 24px; font-weight: 850; color: var(--trv-text); }
.jw-meta { display: flex; flex-direction: column; gap: 2px; }
.jw-name { font-size: 13px; font-weight: 700; color: var(--trv-text); }
.jw-ref { font-size: 10.5px; color: var(--trv-amber-bright); }
.fld label { display: block; font-size: 11px; font-weight: 650; color: var(--trv-text-muted); margin-bottom: 6px; }
.req { color: var(--trv-st-rejected); }
.inp { width: 100%; padding: 9px 11px; border-radius: 9px; font-size: 13px; font-family: inherit; background: rgba(0,0,0,0.3); border: 1px solid var(--trv-border); color: var(--trv-text); }
.inp:focus { outline: none; border-color: color-mix(in srgb, var(--trv-st-rejected) 45%, transparent); }
.ta { resize: vertical; }
.jm-count { display: block; margin-top: 5px; font-size: 10px; color: var(--trv-text-dim); }
.jm-count.ok { color: var(--trv-st-approved); }
.jm-warn { display: flex; align-items: flex-start; gap: 7px; font-size: 11px; line-height: 1.5; color: var(--trv-st-rejected); padding: 9px 11px; border-radius: 9px; background: var(--trv-st-rejected-soft); }
.jm-warn svg { flex-shrink: 0; margin-top: 1px; }
.jm-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 13px 18px; border-top: 1px solid var(--trv-border); }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 18px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.btn.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.btn.danger { background: var(--trv-st-rejected); color: #fff; }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.spin { animation: jm-spin 0.8s linear infinite; }
@keyframes jm-spin { to { transform: rotate(360deg); } }
[data-theme="light"] .jm-overlay { background: rgba(60,40,15,0.32); }
[data-theme="light"] .inp { background: rgba(255,250,240,0.72); }
@media (prefers-reduced-motion: reduce) { .jm-aura { animation: none; } .spin { animation: none; } }
</style>
