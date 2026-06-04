<template>
  <Teleport to="body">
    <transition name="enq">
      <div v-if="open" class="enq-scrim" @click.self="$emit('cancel')">
        <Motion class="enq-card" as="div" role="dialog"
          :initial="{ opacity: 0, y: 22, scale: 0.95 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }"
        >
          <!-- ambient coin rain + mint grid -->
          <span class="enq-mintgrid" aria-hidden="true" />
          <span class="enq-coinrain" aria-hidden="true"><i v-for="n in 10" :key="n" :style="coinStyle(n)" /></span>

          <header class="enq-head">
            <div class="enq-icon">
              <span class="enq-icon-ring" aria-hidden="true" />
              <IndianRupee :size="20" />
            </div>
            <div>
              <h3 class="enq-title">Encash your leave</h3>
              <p class="enq-sub">Convert eligible balance into salary. We use the company formula on your current basic pay — HR sanctions, Finance disburses.</p>
            </div>
            <button class="enq-close" @click="$emit('cancel')"><X :size="14" /></button>
          </header>

          <div class="enq-body">
            <!-- ── Leave type chips (policy-driven) ── -->
            <div class="enq-field">
              <span class="enq-flabel">Leave type</span>
              <div v-if="loadingTypes" class="enq-type-grid">
                <span v-for="i in 2" :key="i" class="leave-skel enq-type-skel" />
              </div>
              <div v-else-if="encashableTypes.length" class="enq-type-grid">
                <button v-for="t in encashableTypes" :key="t.key" type="button"
                  class="enq-type" :class="{ on: form.leave_type === t.key }" :style="{ '--tc': t.hex }"
                  @click="selectType(t.key)">
                  <LeaveTypeIcon :type="t.key" :size="16" ambient />
                  <span class="enq-type-name">{{ t.label }}</span>
                  <Check v-if="form.leave_type === t.key" :size="13" class="enq-type-check" />
                </button>
              </div>
              <div v-else class="enq-none">
                <AlertTriangle :size="13" /> No leave types are encashable right now. Contact HR.
              </div>
            </div>

            <!-- ── Days to encash — stepper + slider, capped at available ── -->
            <div v-if="encashableTypes.length" class="enq-field">
              <div class="enq-days-head">
                <span class="enq-flabel">Days to encash</span>
                <span class="enq-avail leave-mono" :class="{ none: available <= 0 }">
                  {{ available }} day{{ available === 1 ? '' : 's' }} available
                </span>
              </div>

              <div class="enq-stepper" :class="{ over: overLimit }">
                <button type="button" class="enq-step-btn" :disabled="form.days_requested <= 0.5" @click="bump(-0.5)"><Minus :size="15" /></button>
                <div class="enq-step-val">
                  <input type="number" min="0.5" step="0.5" v-model.number="form.days_requested" @input="onDaysInput" />
                  <span class="enq-step-unit">days</span>
                </div>
                <button type="button" class="enq-step-btn" :disabled="form.days_requested + 0.5 > maxDays" @click="bump(0.5)"><Plus :size="15" /></button>
              </div>

              <div class="enq-slider-wrap">
                <input type="range" class="enq-slider" :class="{ over: overLimit }"
                  min="0.5" :max="sliderMax" step="0.5"
                  v-model.number="form.days_requested" @input="refreshPreview"
                  :style="{ '--fill': sliderFill + '%' }" :disabled="available <= 0" />
                <div class="enq-quick">
                  <button type="button" @click="setDays(0.5)">½ day</button>
                  <button type="button" @click="setDays(Math.min(5, maxDays))" :disabled="maxDays < 1">5</button>
                  <button type="button" class="max" @click="setDays(maxDays)" :disabled="available <= 0">Max · {{ maxDays }}</button>
                </div>
              </div>

              <transition name="enq-warn">
                <p v-if="overLimit" class="enq-error">
                  <AlertTriangle :size="12" /> You requested <b>{{ form.days_requested }}</b> but only have <b>{{ available }}</b> {{ form.leave_type }} day{{ available === 1 ? '' : 's' }}. Reduce to continue.
                </p>
                <p v-else-if="available <= 0 && form.leave_type" class="enq-error">
                  <AlertTriangle :size="12" /> You have no {{ form.leave_type }} balance to encash.
                </p>
              </transition>
            </div>

            <label v-if="encashableTypes.length" class="enq-field">
              <span class="enq-flabel">Note <em>(optional)</em></span>
              <textarea v-model.trim="form.request_notes" rows="2" maxlength="2000"
                placeholder="Why are you encashing? Optional context for HR + Finance." />
            </label>

            <!-- ── Live payout preview ── -->
            <Motion v-if="preview && encashableTypes.length" class="enq-preview"
              :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.32 }">
              <span class="enq-prev-shine" aria-hidden="true" />
              <div class="prv-grid">
                <div class="prv-row"><span class="prv-lbl">Basic salary · monthly</span><span class="prv-val leave-mono">₹ {{ inr(preview.basic_salary) }}</span></div>
                <div class="prv-row"><span class="prv-lbl">Formula</span><code class="prv-formula leave-mono">{{ preview.formula_used }}</code></div>
              </div>
              <div class="prv-amount">
                <span class="amt-eye leave-mono">YOU GET</span>
                <span class="amt-val leave-mono" :class="{ over: overLimit }">₹ {{ inr(animatedAmount) }}</span>
              </div>
              <div v-if="!preview.encashment_allowed" class="prv-warn">
                <AlertTriangle :size="12" /> Policy for {{ form.leave_type }} no longer allows encashment.
              </div>
            </Motion>
          </div>

          <footer class="enq-foot">
            <button class="leave-btn leave-btn-sm" @click="$emit('cancel')" :disabled="submitting">Cancel</button>
            <button class="enq-submit" :disabled="!canSubmit || submitting" @click="submit">
              <Send :size="13" /> {{ submitting ? 'Submitting…' : 'Submit request' }}
            </button>
          </footer>
        </Motion>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import { IndianRupee, X, Send, AlertTriangle, Check, Plus, Minus } from 'lucide-vue-next'
import LeaveTypeIcon from '../components/LeaveTypeIcon.vue'
import {
  previewEncashment, requestMyEncashment, fetchMyEncashmentOptions, LEAVE_TYPE_BY_KEY,
} from '@/composables/useLeaves'
import { useToast } from 'vue-toastification'

const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(['cancel', 'submitted'])
const toast = useToast()

// Warm-only accents mirror the leave module palette.
const TYPE_HEX = {
  EARNED: '#f59e0b', CASUAL: '#fde047', COMP_OFF: '#f97316', SICK: '#e34a0a',
  MATERNITY: '#fdba74', PATERNITY: '#b45309', BEREAVEMENT: '#854d0e', LWP: '#ea580c',
  STUDY: '#ca8a04', SPECIAL: '#fb923c',
}

const blank = () => ({ leave_type: null, days_requested: 1, request_notes: '' })
const form = ref(blank())
const preview = ref(null)
const submitting = ref(false)
const encashableTypes = ref([])     // [{ key, label, hex }] — policy-driven
const loadingTypes = ref(false)

// ── load encashable types via the employee-scoped options endpoint ──
// (the admin /policies route is superuser-only, so self-service uses this).
const loadTypes = async () => {
  loadingTypes.value = true
  try {
    const opts = await fetchMyEncashmentOptions()
    encashableTypes.value = (opts || []).map(o => ({
      key: o.leave_type,
      label: o.label || LEAVE_TYPE_BY_KEY[o.leave_type]?.label || o.leave_type,
      hex: TYPE_HEX[o.leave_type] || '#fbbf24',
    }))
  } catch { encashableTypes.value = [] }
  finally { loadingTypes.value = false }
}

watch(() => props.open, async (v) => {
  if (!v) return
  form.value = blank()
  preview.value = null
  await loadTypes()
  // Prefer EARNED, else first encashable type.
  const earned = encashableTypes.value.find(t => t.key === 'EARNED')
  form.value.leave_type = earned ? 'EARNED' : (encashableTypes.value[0]?.key || null)
  if (form.value.leave_type) await refreshPreview()
})

// ── derived caps / validation ──
const available = computed(() => Number(preview.value?.available_balance || 0))
const maxDays = computed(() => Math.max(0, Math.floor(available.value * 2) / 2))
const sliderMax = computed(() => Math.max(0.5, maxDays.value))
const sliderFill = computed(() => {
  const max = sliderMax.value || 1
  return Math.min(100, Math.max(0, (Number(form.value.days_requested || 0) / max) * 100))
})
const overLimit = computed(() =>
  preview.value != null && Number(form.value.days_requested) > available.value && available.value >= 0)

const selectType = (k) => { form.value.leave_type = k; refreshPreview() }
const setDays = (d) => { form.value.days_requested = Math.max(0.5, d); refreshPreview() }
const bump = (delta) => {
  const next = Math.round((Number(form.value.days_requested || 0) + delta) * 2) / 2
  form.value.days_requested = Math.max(0.5, next)
  refreshPreview()
}
const onDaysInput = () => {
  if (form.value.days_requested && form.value.days_requested < 0) form.value.days_requested = 0.5
  refreshPreview()
}

let debouncer = null
async function refreshPreview() {
  if (debouncer) clearTimeout(debouncer)
  debouncer = setTimeout(async () => {
    if (!form.value.leave_type || !form.value.days_requested || form.value.days_requested <= 0) { return }
    try {
      preview.value = await previewEncashment({
        leave_type: form.value.leave_type,
        days_requested: form.value.days_requested,
      })
    } catch { preview.value = null }
  }, 200)
}

const canSubmit = computed(() =>
  !!form.value.leave_type && preview.value && preview.value.encashment_allowed &&
  Number(form.value.days_requested) >= 0.5 &&
  Number(form.value.days_requested) <= available.value)

const inr = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })

// ── animated count-up for the payout amount ──
const animatedAmount = ref(0)
let raf = null
const targetAmount = computed(() => Number(preview.value?.amount || 0))
watch(targetAmount, (to) => {
  if (raf) cancelAnimationFrame(raf)
  const from = animatedAmount.value
  const start = performance.now()
  const dur = 600
  const step = (now) => {
    const t = Math.min(1, (now - start) / dur)
    const e = 1 - Math.pow(1 - t, 3)
    animatedAmount.value = from + (to - from) * e
    if (t < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
})
onBeforeUnmount(() => { if (raf) cancelAnimationFrame(raf); if (debouncer) clearTimeout(debouncer) })

const coinStyle = (n) => ({
  left: `${(n * 41) % 94}%`,
  animationDuration: `${4 + (n % 4)}s`,
  animationDelay: `-${n * 0.6}s`,
  width: `${5 + (n % 3) * 2}px`, height: `${5 + (n % 3) * 2}px`,
})

const submit = async () => {
  submitting.value = true
  try {
    const out = await requestMyEncashment({
      leave_type: form.value.leave_type,
      days_requested: form.value.days_requested,
      request_notes: form.value.request_notes || null,
    })
    toast.success(`Submitted · ${out.reference_no}`)
    emit('submitted', out)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Submit failed') }
  finally { submitting.value = false }
}
</script>

<style scoped>
@import '@/styles/leave-theme.css';

.enq-scrim {
  position: fixed; inset: 0; z-index: 1200;
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(60% 60% at 50% 40%, rgba(251, 191, 36, 0.26), rgba(8, 8, 6, 0.6));
  backdrop-filter: blur(10px); padding: 20px;
}
.enq-card {
  position: relative; overflow: hidden auto; isolation: isolate;
  width: 560px; max-width: calc(100vw - 32px); max-height: calc(100vh - 40px);
  border-radius: 22px;
  background:
    radial-gradient(120% 70% at 100% 0%, rgba(251, 191, 36, 0.14), transparent 55%),
    radial-gradient(80% 60% at 0% 100%, rgba(234, 88, 12, 0.1), transparent 60%),
    linear-gradient(180deg, rgba(20, 15, 7, 0.97), rgba(13, 10, 6, 0.97));
  border: 1px solid rgba(251, 191, 36, 0.32);
  box-shadow: 0 50px 110px -40px rgba(0,0,0,0.85);
}
[data-theme="light"] .enq-card {
  background:
    radial-gradient(120% 70% at 100% 0%, rgba(251, 191, 36, 0.16), transparent 55%),
    rgba(255, 250, 240, 0.97);
  border-color: rgba(180, 83, 9, 0.24);
}

/* ambient */
.enq-mintgrid {
  position: absolute; inset: 0; z-index: -1; pointer-events: none; opacity: 0.4;
  background-image: linear-gradient(var(--leave-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--leave-grid-line) 1px, transparent 1px);
  background-size: 26px 26px; mask-image: radial-gradient(120% 90% at 100% 0%, #000 30%, transparent 85%);
  -webkit-mask-image: radial-gradient(120% 90% at 100% 0%, #000 30%, transparent 85%);
}
.enq-coinrain { position: absolute; inset: 0; z-index: -1; pointer-events: none; }
.enq-coinrain i { position: absolute; top: -10px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fde047, #d97706 70%); box-shadow: 0 0 8px rgba(251,191,36,0.5); opacity: 0; animation: enq-coin-fall linear infinite; }
@keyframes enq-coin-fall { 0% { transform: translateY(0) rotate(0); opacity: 0; } 12% { opacity: 0.7; } 88% { opacity: 0.4; } 100% { transform: translateY(560px) rotate(360deg); opacity: 0; } }

.enq-head { position: relative; display: flex; gap: 12px; align-items: flex-start; padding: 20px 20px 14px; }
.enq-icon {
  position: relative; display: inline-grid; place-items: center; width: 46px; height: 46px; border-radius: 14px; flex-shrink: 0;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.32), rgba(217, 119, 6, 0.22));
  border: 1px solid rgba(251, 191, 36, 0.45); color: #fef3c7;
}
[data-theme="light"] .enq-icon { color: #78350f; }
.enq-icon-ring { position: absolute; inset: -5px; border-radius: 18px; border: 1.5px dashed rgba(251,191,36,0.4); animation: enq-ring-spin 9s linear infinite; }
@keyframes enq-ring-spin { to { transform: rotate(360deg); } }
.enq-title { margin: 0; font-size: 18px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.012em; }
.enq-sub { margin: 5px 0 0; font-size: 11.5px; line-height: 1.5; color: var(--hr-text-muted); max-width: 420px; }
.enq-close { position: absolute; top: 14px; right: 14px; display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; border: 1px solid var(--hr-border); background: transparent; color: var(--hr-text-muted); cursor: pointer; transition: transform .25s, color .25s, border-color .25s; }
.enq-close:hover { transform: rotate(90deg); color: var(--leave-approved); border-color: var(--leave-approved); }

.enq-body { position: relative; padding: 4px 20px 14px; display: flex; flex-direction: column; gap: 14px; }
.enq-field { display: flex; flex-direction: column; gap: 7px; }
.enq-flabel { font-size: 9.5px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--hr-text-muted); }
.enq-flabel em { font-style: normal; text-transform: none; letter-spacing: 0; font-weight: 600; opacity: 0.8; }

/* type chips */
.enq-type-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
.enq-type-skel { height: 48px; border-radius: 12px; }
.enq-type {
  position: relative; display: flex; align-items: center; gap: 9px; padding: 11px 12px; border-radius: 12px; cursor: pointer; text-align: left;
  background: rgba(255,255,255,0.03); border: 1px solid var(--hr-border); color: var(--hr-text); transition: border-color .2s, background .2s, transform .15s;
}
[data-theme="light"] .enq-type { background: rgba(255,250,240,0.7); border-color: rgba(180,83,9,0.16); }
.enq-type:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--tc) 55%, transparent); }
.enq-type.on { border-color: var(--tc); background: color-mix(in srgb, var(--tc) 14%, transparent); box-shadow: 0 8px 22px -12px color-mix(in srgb, var(--tc) 70%, transparent); }
.enq-type-name { flex: 1; font-size: 13px; font-weight: 700; }
.enq-type-check { color: var(--tc); }
.enq-none { display: flex; align-items: center; gap: 8px; padding: 12px; border-radius: 12px; font-size: 12px; color: var(--leave-rejected); background: var(--leave-rejected-soft); border: 1px solid color-mix(in srgb, var(--leave-rejected) 30%, transparent); }

/* days stepper + slider */
.enq-days-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.enq-avail { font-size: 10.5px; font-weight: 700; color: var(--leave-approved); }
.enq-avail.none { color: var(--leave-rejected); }

.enq-stepper { display: flex; align-items: stretch; gap: 8px; }
.enq-step-btn {
  display: grid; place-items: center; width: 44px; border-radius: 11px; flex-shrink: 0;
  background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.28); color: var(--leave-approved); cursor: pointer;
  transition: background .18s, transform .15s, border-color .18s;
}
.enq-step-btn:hover:not(:disabled) { background: rgba(251,191,36,0.18); transform: translateY(-1px); }
.enq-step-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.enq-step-val { flex: 1; position: relative; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; border-radius: 11px; background: rgba(255,255,255,0.04); border: 1px solid var(--hr-border); }
[data-theme="light"] .enq-step-val { background: rgba(255,250,240,0.86); border-color: rgba(180,83,9,0.2); }
.enq-stepper.over .enq-step-val { border-color: color-mix(in srgb, var(--leave-rejected) 55%, transparent); background: var(--leave-rejected-soft); }
.enq-step-val input {
  width: 78px; border: 0; background: transparent; outline: none; text-align: right;
  font-size: 30px; font-weight: 900; letter-spacing: -0.02em; color: var(--hr-text); font-variant-numeric: tabular-nums;
  -moz-appearance: textfield;
}
.enq-step-val input::-webkit-outer-spin-button, .enq-step-val input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.enq-step-unit { font-size: 11px; font-weight: 700; color: var(--hr-text-muted); }

.enq-slider-wrap { display: flex; flex-direction: column; gap: 8px; }
.enq-slider {
  -webkit-appearance: none; appearance: none; width: 100%; height: 8px; border-radius: 8px; outline: none; cursor: pointer;
  background: linear-gradient(90deg, var(--leave-approved) 0%, #ea580c var(--fill), transparent var(--fill));
  background-color: rgba(255,255,255,0.08);
}
[data-theme="light"] .enq-slider { background-color: rgba(120,53,15,0.12); }
.enq-slider.over { background: linear-gradient(90deg, var(--leave-rejected) 0%, var(--leave-rejected) var(--fill), transparent var(--fill)); }
.enq-slider::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none; width: 20px; height: 20px; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff7e6, #f59e0b 65%); border: 2px solid #fff7e6;
  box-shadow: 0 0 12px rgba(251,191,36,0.7); cursor: pointer; transition: transform .15s;
}
.enq-slider::-webkit-slider-thumb:hover { transform: scale(1.15); }
.enq-slider::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: #f59e0b; border: 2px solid #fff7e6; box-shadow: 0 0 12px rgba(251,191,36,0.7); cursor: pointer; }
.enq-slider:disabled { opacity: 0.4; cursor: not-allowed; }
.enq-quick { display: flex; gap: 6px; }
.enq-quick button { flex: 1; height: 28px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; background: rgba(255,255,255,0.04); border: 1px solid var(--hr-border); color: var(--hr-text-secondary); transition: all .18s; }
[data-theme="light"] .enq-quick button { background: rgba(255,250,240,0.7); border-color: rgba(180,83,9,0.16); }
.enq-quick button:hover:not(:disabled) { border-color: var(--leave-approved); color: var(--hr-text); }
.enq-quick button.max { background: rgba(251,191,36,0.12); border-color: color-mix(in srgb, var(--leave-approved) 40%, transparent); color: var(--leave-approved); }
.enq-quick button:disabled { opacity: 0.4; cursor: not-allowed; }

.enq-error { display: flex; align-items: center; gap: 6px; margin: 0; padding: 8px 11px; border-radius: 9px; font-size: 11.5px; font-weight: 600; line-height: 1.4; background: var(--leave-rejected-soft); color: var(--leave-rejected); border: 1px solid color-mix(in srgb, var(--leave-rejected) 28%, transparent); }
.enq-error b { font-weight: 800; }
.enq-warn-enter-active, .enq-warn-leave-active { transition: opacity .25s, transform .25s; }
.enq-warn-enter-from, .enq-warn-leave-to { opacity: 0; transform: translateY(-4px); }

.enq-field textarea {
  padding: 9px 11px; border-radius: 9px; background: rgba(251, 191, 36, 0.05); border: 1px solid rgba(251, 191, 36, 0.24);
  color: var(--hr-text); font: inherit; font-size: 13px; outline: none; resize: vertical; min-height: 60px;
  transition: border-color .22s, box-shadow .22s;
}
[data-theme="light"] .enq-field textarea { background: rgba(255, 250, 240, 0.86); border-color: rgba(180, 83, 9, 0.22); }
.enq-field textarea:focus { border-color: var(--leave-approved); box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.14); }

/* preview */
.enq-preview {
  position: relative; overflow: hidden; padding: 14px; border-radius: 14px;
  background: rgba(251, 191, 36, 0.10); border: 1px solid color-mix(in srgb, var(--leave-approved) 30%, transparent);
  display: flex; flex-direction: column; gap: 8px;
}
.enq-prev-shine { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(115deg, transparent 40%, rgba(255,247,230,0.18) 50%, transparent 60%); background-size: 220% 100%; background-position: 200% 0; animation: enq-shine 3.4s ease-in-out infinite; }
@keyframes enq-shine { 0%,100% { background-position: 200% 0; } 50% { background-position: -40% 0; } }
.prv-grid { display: flex; flex-direction: column; gap: 6px; }
.prv-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--hr-text-secondary); }
.prv-lbl { flex: 1; }
.prv-val { color: var(--hr-text); font-weight: 700; }
.prv-formula { font-size: 10px; color: var(--hr-text-muted); }
.prv-amount { margin-top: 4px; padding-top: 10px; border-top: 1px dashed color-mix(in srgb, var(--leave-approved) 35%, transparent); display: flex; align-items: baseline; justify-content: space-between; }
.amt-eye { font-size: 9.5px; font-weight: 800; letter-spacing: 0.18em; color: var(--leave-approved); }
.amt-val { font-size: 30px; font-weight: 900; letter-spacing: -0.02em; font-variant-numeric: tabular-nums;
  background: linear-gradient(135deg, #fde047, #f59e0b 60%, #ea580c); background-clip: text; -webkit-background-clip: text; color: transparent; }
.amt-val.over { background: none; -webkit-text-fill-color: var(--leave-rejected); color: var(--leave-rejected); opacity: 0.7; }
.prv-warn { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--leave-rejected); font-weight: 700; }

.enq-foot { display: flex; gap: 8px; justify-content: flex-end; padding: 12px 20px 18px; border-top: 1px solid rgba(251, 191, 36, 0.14); }
.enq-submit {
  display: inline-flex; align-items: center; gap: 7px; height: 30px; padding: 0 16px; border-radius: 8px;
  font-size: 11.5px; font-weight: 800; cursor: pointer; color: #2a1100;
  background: var(--leave-grad-cta); background-size: 240% 100%; background-position: 0% 50%;
  border: 1px solid rgba(251, 146, 60, 0.45); box-shadow: 0 12px 32px -10px rgba(234, 88, 12, 0.55);
  transition: background-position .3s, transform .2s, box-shadow .2s;
}
.enq-submit:hover:not(:disabled) { background-position: 100% 50%; transform: translateY(-1px); box-shadow: 0 16px 40px -10px rgba(234, 88, 12, 0.72); }
.enq-submit:disabled { opacity: 0.5; cursor: not-allowed; }

.enq-enter-active, .enq-leave-active { transition: opacity .25s; }
.enq-enter-from, .enq-leave-to { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .enq-coinrain i, .enq-icon-ring, .enq-prev-shine { animation: none !important; }
}
</style>
