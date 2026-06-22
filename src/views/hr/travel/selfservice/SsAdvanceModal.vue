<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" as="div" class="ov" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.24 }" @click.self="$emit('close')">
        <Motion as="div" class="ad" :initial="{ opacity: 0, y: 24, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 14 }" :transition="{ duration: 0.42, ease: [0.16,1,0.3,1] }">
          <span class="ad-aura" aria-hidden="true" />
          <header class="ad-head">
            <div><span class="ad-eyebrow"><Coins :size="12" /> Travel advance · {{ trip?.travel_reference_number }}</span><h3>Request an advance</h3></div>
            <button class="ad-x" @click="$emit('close')"><X :size="18" /></button>
          </header>

          <div class="ad-body">
            <!-- amount dial -->
            <div class="ad-dial" :style="fT(0)">
              <svg viewBox="0 0 120 78" class="dial-svg" aria-hidden="true">
                <path d="M10,64 A54,54 0 0,1 110,64" fill="none" stroke="var(--trv-steel-soft)" stroke-width="8" stroke-linecap="round" />
                <path d="M10,64 A54,54 0 0,1 110,64" fill="none" stroke="url(#ad-g)" stroke-width="8" stroke-linecap="round"
                  :stroke-dasharray="dialLen" :stroke-dashoffset="dialOffset" class="dial-fill" />
                <defs><linearGradient id="ad-g" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="var(--trv-amber)" /><stop offset="100%" stop-color="var(--trv-ember)" /></linearGradient></defs>
              </svg>
              <div class="dial-c">
                <span v-if="!reduced" class="dial-pulse" aria-hidden="true" />
                <b class="trv-mono">{{ fmtINR(form.advance_amount) }}</b><span>{{ pctOfEst }}% of est. {{ fmtCompactINR(estTotal) }}</span>
              </div>
            </div>

            <!-- reason -->
            <div class="fld" :style="fT(1)">
              <label>What's the advance for? <span class="req">*</span></label>
              <div class="reasons">
                <Motion v-for="r in REASONS" :key="r.key" as="button" class="reason" :class="{ on: reason === r.key }"
                  :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }" @click="pickReason(r)">
                  <component :is="r.icon" :size="13" /> {{ r.label }}
                </Motion>
              </div>
              <Presence>
                <Motion v-if="reason === 'other'" as="textarea" v-model="note" class="inp note" rows="2"
                  :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }"
                  :transition="{ duration: 0.3, ease: [0.16,1,0.3,1] }" placeholder="Describe what the advance covers…" />
              </Presence>
            </div>

            <!-- cost-basis breakdown -->
            <div class="fld" :style="fT(2)">
              <label>Build it from your estimate <em>(tap to include)</em></label>
              <div class="basis">
                <button v-for="c in COMPONENTS" :key="c.key" class="bcomp" :class="{ on: picked[c.key] }" :disabled="!Number(trip?.[c.key])" @click="toggleComp(c.key)">
                  <span class="bc-tick"><Check v-if="picked[c.key]" :size="11" /></span>
                  <component :is="c.icon" :size="13" class="bc-ic" />
                  <span class="bc-lab">{{ c.label }}</span>
                  <span class="bc-amt trv-mono">{{ fmtCompactINR(trip?.[c.key]) }}</span>
                </button>
              </div>
            </div>

            <!-- amount + quick -->
            <div class="fld amt-row" :style="fT(3)">
              <div><label>Advance amount (₹)</label><input v-model.number="form.advance_amount" type="number" min="0" class="inp big trv-mono" placeholder="0" @input="reason && reason !== 'other' && (reason = manualReason)" /></div>
              <div class="quick">
                <button v-for="q in quicks" :key="q.pct" class="qbtn" :class="{ on: form.advance_amount === q.val }" @click="form.advance_amount = q.val">{{ q.label }}</button>
              </div>
            </div>

            <p class="ad-hint" :style="fT(4)"><ArrowLeftRight :size="13" /> Released after approval and <b>netted off in your final settlement</b> — if you spend less, the balance is recovered automatically.</p>
          </div>

          <footer class="ad-foot">
            <button class="btn ghost" @click="$emit('close')">Cancel</button>
            <Motion as="button" class="btn primary" :disabled="!valid || busy" :whileHover="(valid && !busy) ? { y: -2 } : {}" :whileTap="(valid && !busy) ? { scale: 0.97 } : {}" @click="submit">
              <Loader2 v-if="busy" :size="15" class="spin" /><Send v-else :size="14" /> Request {{ fmtCompactINR(form.advance_amount) }}
            </Motion>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { reactive, computed, ref, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X, Coins, Send, Loader2, ArrowLeftRight, Check, Plane, Hotel, Car, Utensils, Wallet, Receipt, Globe, PenLine } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { fmtINR, fmtCompactINR, errText, requestMyAdvance } from '@/composables/useTravel'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({ open: Boolean, trip: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved'])
const toast = useToast()
const reduced = prefersReduced()

const manualReason = 'custom'
const REASONS = [
  { key: 'travel', label: 'Flights & travel', icon: Plane, comps: ['est_travel_cost'] },
  { key: 'stay', label: 'Hotel & stay', icon: Hotel, comps: ['est_accommodation_cost'] },
  { key: 'ground', label: 'Local & meals', icon: Car, comps: ['est_local_cost', 'est_food_cost'] },
  { key: 'fees', label: 'Registration / fees', icon: Receipt, comps: ['est_misc_cost'] },
  { key: 'forex', label: 'Visa & forex', icon: Globe, comps: ['est_misc_cost'] },
  { key: 'float', label: 'Full trip float', icon: Wallet, comps: ['est_travel_cost', 'est_accommodation_cost', 'est_local_cost', 'est_food_cost', 'est_misc_cost'] },
  { key: 'other', label: 'Other', icon: PenLine, comps: [] },
]
const COMPONENTS = [
  { key: 'est_travel_cost', label: 'Travel', icon: Plane },
  { key: 'est_accommodation_cost', label: 'Hotel', icon: Hotel },
  { key: 'est_local_cost', label: 'Local', icon: Car },
  { key: 'est_food_cost', label: 'Food', icon: Utensils },
  { key: 'est_misc_cost', label: 'Misc', icon: Wallet },
]
const REASON_LABEL = Object.fromEntries(REASONS.map(r => [r.key, r.label]))

const form = reactive({ advance_amount: 0 })
const reason = ref('')
const note = ref('')
const picked = reactive({})
const busy = ref(false)

const fT = (i) => ({ animation: `trv-fade-up 0.4s ${0.05 + i * 0.07}s var(--trv-spring) backwards` })
const estTotal = computed(() => Number(props.trip?.est_total_cost || 0))
const pickedTotal = computed(() => COMPONENTS.reduce((a, c) => a + (picked[c.key] ? Number(props.trip?.[c.key] || 0) : 0), 0))
const quicks = computed(() => [0.5, 0.75, 1].map(p => ({ pct: p, label: `${p * 100}%`, val: Math.round(estTotal.value * p) })))
const pctOfEst = computed(() => estTotal.value ? Math.min(100, Math.round((Number(form.advance_amount) || 0) / estTotal.value * 100)) : 0)
const dialLen = 157
const dialOffset = computed(() => dialLen - (dialLen * Math.min(100, pctOfEst.value) / 100))
const valid = computed(() => Number(form.advance_amount) > 0 && !!reason.value && (reason.value !== 'other' || note.value.trim().length >= 3))

const pickReason = (r) => {
  reason.value = r.key
  if (r.key === 'other') return
  COMPONENTS.forEach(c => { picked[c.key] = r.comps.includes(c.key) && Number(props.trip?.[c.key]) > 0 })
  form.advance_amount = Math.round(pickedTotal.value) || form.advance_amount
}
const toggleComp = (key) => {
  if (!Number(props.trip?.[key])) return
  picked[key] = !picked[key]
  form.advance_amount = Math.round(pickedTotal.value)
  if (!reason.value || reason.value === manualReason) reason.value = 'float'
}

watch(() => props.open, (v) => {
  if (!v) return
  form.advance_amount = Math.round(estTotal.value * 0.75) || 0
  reason.value = ''; note.value = ''
  COMPONENTS.forEach(c => { picked[c.key] = false })
})

const submit = async () => {
  if (!valid.value || !props.trip) return
  busy.value = true
  const label = reason.value === 'other' ? note.value.trim()
    : (REASON_LABEL[reason.value] + (note.value.trim() ? ` — ${note.value.trim()}` : ''))
  try {
    await requestMyAdvance(props.trip.id, { travel_request_id: props.trip.id, advance_amount: Number(form.advance_amount), purpose: label })
    toast.success('Advance requested — awaiting approval'); emit('saved'); emit('close')
  } catch (e) { toast.error(errText(e, 'Could not request advance')) } finally { busy.value = false }
}
</script>

<style scoped>
.ov { position: fixed; inset: 0; z-index: 1460; display: grid; place-items: center; padding: 18px; background: rgba(6,5,4,0.64); backdrop-filter: blur(9px); }
.ad { position: relative; width: min(480px, 96vw); max-height: 94vh; overflow: hidden; display: flex; flex-direction: column; border-radius: 22px; background: var(--trv-surface-elevated); border: 1px solid var(--trv-border-strong); box-shadow: var(--trv-shadow); }
.ad-aura { position: absolute; inset: -40% 30% 70% -10%; pointer-events: none; background: radial-gradient(55% 70% at 30% 0%, rgba(251,146,60,0.16), transparent 70%); animation: trv-aura-drift 9s ease-in-out infinite; }
.ad-head { position: relative; display: flex; align-items: center; justify-content: space-between; padding: 18px 22px 6px; }
.ad-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trv-ember); }
.ad-head h3 { font-size: 18px; font-weight: 850; margin: 5px 0 0; color: var(--trv-text); }
.ad-x { background: var(--trv-panel); border: 1px solid var(--trv-border); border-radius: 9px; padding: 6px; color: var(--trv-text-dim); cursor: pointer; }
.ad-x:hover { color: var(--trv-text); }
.ad-body { padding: 6px 22px 4px; overflow-y: auto; display: flex; flex-direction: column; gap: 13px; }
.ad-dial { position: relative; width: 188px; margin: 4px auto 0; }
.dial-svg { width: 100%; display: block; }
.dial-fill { transition: stroke-dashoffset 0.7s var(--trv-spring); }
.dial-c { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 4px; }
.dial-pulse { position: absolute; bottom: 22px; width: 8px; height: 8px; border-radius: 50%; background: var(--trv-amber); box-shadow: 0 0 12px var(--trv-amber); animation: trv-beacon 1.9s ease-in-out infinite; }
.dial-c b { font-size: 23px; font-weight: 850; color: var(--trv-amber-bright); line-height: 1; }
.dial-c span { font-size: 9.5px; color: var(--trv-text-dim); margin-top: 2px; }
.fld label { display: block; font-size: 11px; font-weight: 650; color: var(--trv-text-muted); margin-bottom: 7px; }
.fld label em { color: var(--trv-text-dim); font-style: normal; }
.req { color: var(--trv-ember); }
.inp { width: 100%; padding: 9px 11px; border-radius: 10px; font-size: 13px; font-family: inherit; resize: vertical; background: rgba(0,0,0,0.3); border: 1px solid var(--trv-border); color: var(--trv-text); transition: border-color 0.2s; }
.inp:focus { outline: none; border-color: var(--trv-amber-border); }
.inp.note { margin-top: 8px; }
.inp.big { font-size: 19px; font-weight: 800; text-align: center; padding: 9px; }
.reasons { display: flex; flex-wrap: wrap; gap: 6px; }
.reason { display: inline-flex; align-items: center; gap: 5px; padding: 7px 11px; border-radius: 999px; font-size: 11.5px; font-weight: 600; cursor: pointer; color: var(--trv-text-muted); background: var(--trv-panel); border: 1px solid var(--trv-border); transition: color 0.2s, border-color 0.2s, background 0.2s; }
.reason:hover { color: var(--trv-text-secondary); }
.reason.on { color: var(--trv-ember); border-color: color-mix(in srgb, var(--trv-ember) 45%, transparent); background: color-mix(in srgb, var(--trv-ember) 13%, transparent); }
.basis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
.bcomp { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 9px 4px; border-radius: 11px; cursor: pointer; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); transition: all 0.2s; position: relative; }
.bcomp:disabled { opacity: 0.4; cursor: not-allowed; }
.bcomp.on { color: var(--trv-amber); border-color: var(--trv-amber-border); background: var(--trv-amber-soft); }
.bc-tick { position: absolute; top: 5px; right: 5px; display: grid; place-items: center; width: 14px; height: 14px; border-radius: 5px; border: 1px solid var(--trv-border-strong); color: #1a1205; }
.bcomp.on .bc-tick { background: var(--trv-grad-hero); border-color: var(--trv-amber); }
.bc-lab { font-size: 10px; font-weight: 600; }
.bc-amt { font-size: 10px; font-weight: 750; color: var(--trv-text-secondary); }
.bcomp.on .bc-amt { color: var(--trv-amber-bright); }
.amt-row { display: grid; grid-template-columns: 1.1fr 1.4fr; gap: 12px; align-items: end; }
.amt-row > div:first-child { } .amt-row label { margin-bottom: 5px; }
.quick { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.qbtn { padding: 9px 4px; border-radius: 9px; font-size: 11.5px; font-weight: 700; cursor: pointer; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); transition: all 0.2s; }
.qbtn.on, .qbtn:hover { color: var(--trv-amber); border-color: var(--trv-amber-border); background: var(--trv-amber-soft); }
.ad-hint { display: flex; align-items: flex-start; gap: 7px; margin: 2px 0 0; font-size: 11px; color: var(--trv-text-muted); line-height: 1.5; }
.ad-hint svg { color: var(--trv-amber); flex-shrink: 0; margin-top: 1px; } .ad-hint b { color: var(--trv-text-secondary); }
.ad-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 22px; border-top: 1px solid var(--trv-border); }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 17px; border-radius: 11px; font-size: 13px; font-weight: 750; cursor: pointer; border: 1px solid transparent; }
.btn.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.btn.primary { background: var(--trv-grad-hero); color: #1a1205; box-shadow: var(--trv-amber-glow); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.spin { animation: trv-spin-slow 0.8s linear infinite; }
@media (max-width: 460px) { .amt-row { grid-template-columns: 1fr; } .basis { grid-template-columns: repeat(3, 1fr); } }
[data-theme="light"] .ov { background: rgba(60,40,15,0.32); }
[data-theme="light"] .inp { background: rgba(255,250,240,0.72); }
@media (prefers-reduced-motion: reduce) { .ad-aura, .dial-pulse, .spin, [style*="trv-fade-up"] { animation: none !important; } .dial-fill { transition: none; } }
</style>
