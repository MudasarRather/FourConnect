<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open && rec" as="div" class="am-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.25 }" @click.self="$emit('close')">
        <Motion as="div" class="am"
          :initial="{ opacity: 0, y: 24, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 16, scale: 0.97 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
          <span class="am-aura" aria-hidden="true" />
          <header class="am-head">
            <div>
              <span class="am-eyebrow"><CheckCircle2 :size="12" /> Per-diem · approve</span>
              <h3>Approve daily allowance</h3>
            </div>
            <button class="am-x" @click="$emit('close')"><X :size="18" /></button>
          </header>

          <div class="am-body">
            <div class="am-who">
              <span class="aw-name">{{ rec.employee_name || '—' }}</span>
              <span class="aw-ref trv-mono">{{ rec.travel_reference_number }}</span>
              <span class="aw-tier" :style="{ '--c': cityMeta(rec.city_category).hex }">{{ cityMeta(rec.city_category).label }}</span>
            </div>

            <div class="am-meter">
              <DaOdometer :value="approved" class="am-odo" />
              <div class="am-calc trv-mono">{{ rec.travel_days }}d × {{ fmtINR(rec.daily_rate) }} · eligible {{ fmtINR(eligible) }}</div>
            </div>

            <div class="fld">
              <label>Approved amount</label>
              <div class="am-amt">
                <span class="cur">₹</span>
                <input v-model.number="approved" type="number" min="0" :max="eligible" class="inp" />
              </div>
              <input class="am-slider" type="range" min="0" :max="eligible" step="1" v-model.number="approved" :style="sliderStyle" />
              <div class="am-quick">
                <button class="qk" :class="{ on: approved === eligible }" @click="approved = eligible">Full</button>
                <button class="qk" @click="approved = Math.round(eligible * 0.75)">75%</button>
                <button class="qk" @click="approved = Math.round(eligible * 0.5)">50%</button>
              </div>
            </div>

            <div v-if="approved < eligible" class="am-delta">
              <TrendingDown :size="13" /> Settling ₹{{ (eligible - approved).toLocaleString('en-IN') }} below eligible
            </div>

            <div class="fld">
              <label>Note <span class="opt">(optional)</span></label>
              <textarea v-model="note" class="inp ta" rows="2" placeholder="Reason for any adjustment…" />
            </div>
          </div>

          <footer class="am-foot">
            <button class="btn ghost" @click="$emit('close')">Cancel</button>
            <Motion as="button" class="btn primary" :disabled="busy || approved < 0"
              :whileHover="!busy ? { y: -2 } : {}" :whileTap="!busy ? { scale: 0.97 } : {}" @click="submit">
              <Loader2 v-if="busy" :size="15" class="spin" /><Check v-else :size="15" /> Approve DA
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
import { X, Check, CheckCircle2, Loader2, TrendingDown } from 'lucide-vue-next'
import DaOdometer from '../components/DaOdometer.vue'
import { useToast } from 'vue-toastification'
import { fmtINR, cityMeta, errText, approveDa } from '@/composables/useTravel'

const props = defineProps({ open: Boolean, rec: { type: Object, default: null } })
const emit = defineEmits(['close', 'approved'])
const toast = useToast()

const approved = ref(0)
const note = ref('')
const busy = ref(false)

const eligible = computed(() => Math.round(Number(props.rec?.eligible_da ?? 0)))
watch(() => [props.open, props.rec], () => {
  if (props.open && props.rec) { approved.value = Math.round(Number(props.rec.approved_da ?? props.rec.eligible_da ?? 0)); note.value = '' }
})

const sliderStyle = computed(() => {
  const pct = eligible.value ? Math.min(100, Math.max(0, (approved.value / eligible.value) * 100)) : 0
  return { background: `linear-gradient(90deg, var(--trv-amber) ${pct}%, var(--trv-steel-soft) ${pct}%)` }
})

const submit = async () => {
  busy.value = true
  try {
    const body = { approved_da: Number(approved.value) }
    if (note.value.trim()) body.note = note.value.trim()
    await approveDa(props.rec.id, body)
    toast.success('DA approved')
    emit('approved'); emit('close')
  } catch (e) { toast.error(errText(e, 'Could not approve DA')) }
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
.aw-tier { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 6px; margin-left: auto; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.am-meter { text-align: center; padding: 16px; border-radius: 14px; background: linear-gradient(180deg, var(--trv-flap), color-mix(in srgb, var(--trv-flap) 84%, #000)); border: 1px solid var(--trv-border-strong); display: flex; flex-direction: column; gap: 6px; }
.am-odo { font-size: 34px; justify-content: center; }
.am-calc { font-size: 11px; color: var(--trv-text-muted); }
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
@media (prefers-reduced-motion: reduce) { .am-aura { animation: none; } .spin { animation: none; } }
</style>
