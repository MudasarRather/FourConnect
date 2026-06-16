<template>
  <Teleport to="body">
    <div class="rmb-overlay pd-overlay" @mousedown.self="$emit('close')">
      <Motion as="div" class="rmb-modal rmb-receipt pd-modal"
              :initial="{ opacity: 0, scale: 0.94, y: 20 }"
              :animate="{ opacity: 1, scale: 1, y: 0 }"
              :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }">

        <header class="pd-head" ref="headRef">
          <span class="pd-aura" aria-hidden="true" />
          <span class="pd-grid" aria-hidden="true" />
          <span class="rmb-spotlight" aria-hidden="true" />
          <span class="rmb-grain" aria-hidden="true" />
          <div class="pd-head-row">
            <span class="pd-eyebrow rmb-mono"><ShieldOff :size="12" /> Remove governance</span>
            <button class="x" @click="$emit('close')" aria-label="Close"><X :size="17" /></button>
          </div>
          <h3>Drop the <span class="ink">{{ policy.category_name || 'category' }}</span> policy</h3>
          <p class="pd-sub">This doesn't delete the category — it just lifts its custom limits &amp; chain. The category falls back to platform defaults.</p>
        </header>

        <div class="pd-body">
          <!-- before → after -->
          <Motion as="div" class="pd-shift" v-bind="reveal(0)">
            <div class="pd-state cur">
              <span class="pd-state-lbl">Now · governed</span>
              <ul class="pd-rules">
                <li><b class="rmb-mono">{{ cap(policy.max_amount_per_claim) }}</b> per claim</li>
                <li><b class="rmb-mono">{{ chainLen }}</b>-stage chain</li>
              </ul>
            </div>
            <span class="pd-arrow" aria-hidden="true"><ArrowRight :size="16" /></span>
            <div class="pd-state def">
              <span class="pd-state-lbl">After · defaults</span>
              <ul class="pd-rules">
                <li><b class="rmb-mono">∞</b> no caps</li>
                <li>Manager → Finance → HR</li>
              </ul>
            </div>
          </Motion>

          <Motion as="div" class="pd-note" v-bind="reveal(1)">
            <Info :size="15" />
            <span>Reversible — you can configure a fresh policy for this category any time. In-flight claims keep the chain they were submitted under.</span>
          </Motion>

          <Motion as="label" class="pd-fld" v-bind="reveal(2)">
            <span>Reason <i class="opt">— optional, logged to the audit trail</i></span>
            <textarea class="rmb-input" rows="2" v-model="reason" maxlength="1000"
                      placeholder="e.g. Consolidating travel & local-conveyance under one policy"></textarea>
          </Motion>

          <Transition name="pd-err">
            <p v-if="err" class="pd-err-msg"><AlertTriangle :size="14" /> {{ err }}</p>
          </Transition>
        </div>

        <footer class="pd-foot">
          <button class="rmb-btn rmb-btn-ghost" @click="$emit('close')" :disabled="busy">Cancel</button>
          <Motion as="button" class="rmb-btn pd-btn" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }"
                  :disabled="busy" @click="confirm">
            <Trash2 :size="15" /> {{ busy ? 'Removing…' : 'Remove policy' }}
          </Motion>
        </footer>
      </Motion>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import { X, ShieldOff, Trash2, ArrowRight, Info, AlertTriangle } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { deletePolicy, errText } from '@/composables/useReimbursements'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({ policy: { type: Object, required: true } })
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const headRef = ref(null)
usePointerSpotlight(headRef)

const reason = ref('')
const busy = ref(false)
const err = ref('')

const chainLen = computed(() => (props.policy.approval_chain || []).length || 0)
const short = (n) => {
  const v = Number(n) || 0
  if (v >= 1e7) return (v / 1e7).toFixed(1).replace(/\.0$/, '') + 'Cr'
  if (v >= 1e5) return (v / 1e5).toFixed(1).replace(/\.0$/, '') + 'L'
  if (v >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(Math.round(v))
}
const cap = (n) => (n == null || n === '') ? '∞' : '₹' + short(n)

const reveal = (i) => ({
  initial: { opacity: 0, y: 14, filter: 'blur(5px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { delay: 0.1 + i * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
})

async function confirm() {
  err.value = ''
  busy.value = true
  try {
    await deletePolicy(props.policy.id, reason.value.trim() || undefined)
    toast.success('Policy removed — category reverted to defaults')
    emit('done'); emit('close')
  } catch (e) { err.value = errText(e, 'Remove failed') }
  finally { busy.value = false }
}

const onKey = (e) => { if (e.key === 'Escape' && !busy.value) emit('close') }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.pd-overlay { position: fixed; inset: 0; z-index: 4000; display: grid; place-items: center; padding: 24px;
  background: radial-gradient(120% 120% at 50% 0%, rgba(80,20,20,0.4), rgba(0,0,0,0.6)); backdrop-filter: blur(9px); }
[data-theme="light"] .pd-overlay { background: radial-gradient(120% 120% at 50% 0%, rgba(185,28,28,0.16), rgba(40,25,10,0.34)); }

.pd-modal { --pd: var(--rmb-st-rejected); width: min(500px, 96vw); max-height: 92vh; display: flex; flex-direction: column; overflow: hidden;
  background: var(--rmb-glass-deep); backdrop-filter: var(--rmb-glass-blur);
  border: 1px solid color-mix(in srgb, var(--pd) 28%, var(--rmb-border-strong));
  box-shadow: 0 40px 90px -42px color-mix(in srgb, var(--pd) 38%, rgba(0,0,0,0.7)), var(--rmb-glass-shadow); border-radius: 20px; }

.pd-head { position: relative; flex: 0 0 auto; padding: 20px 22px 18px; overflow: hidden; border-bottom: 1px solid var(--rmb-border-soft);
  background: radial-gradient(130% 130% at 100% 0%, color-mix(in srgb, var(--pd) 18%, transparent), transparent 62%),
    linear-gradient(160deg, var(--rmb-paper-elevated), var(--rmb-paper)); }
.pd-head > :not(.pd-aura):not(.pd-grid):not(.rmb-grain):not(.rmb-spotlight) { position: relative; z-index: 2; }
.pd-aura { position: absolute; top: -90px; right: -70px; width: 240px; height: 240px; border-radius: 50%; z-index: 0;
  background: radial-gradient(circle, color-mix(in srgb, var(--pd) 50%, transparent), transparent 68%); filter: blur(40px); opacity: 0.45; animation: rmb-aura-breathe 6s ease-in-out infinite; }
.pd-grid { position: absolute; inset: 0; z-index: 0; opacity: 0.42;
  background-image: linear-gradient(var(--rmb-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--rmb-grid-line) 1px, transparent 1px);
  background-size: 28px 28px; -webkit-mask: radial-gradient(110% 90% at 80% 0%, #000, transparent 72%); mask: radial-gradient(110% 90% at 80% 0%, #000, transparent 72%); }
.pd-head-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 11px; }
.pd-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--pd); }
.x { background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); color: var(--rmb-text-muted);
  width: 32px; height: 32px; border-radius: 10px; cursor: pointer; display: grid; place-items: center; transition: 0.2s; }
.x:hover { color: var(--pd); border-color: color-mix(in srgb, var(--pd) 45%, transparent); transform: rotate(90deg); }
.pd-head h3 { margin: 0; font-size: 18px; font-weight: 800; letter-spacing: -0.02em; color: var(--rmb-text); }
.pd-head h3 .ink { color: var(--pd); }
.pd-sub { margin: 6px 0 0; font-size: 12px; line-height: 1.5; color: var(--rmb-text-muted); }

.pd-body { flex: 1; overflow-y: auto; padding: 16px 22px 18px; display: flex; flex-direction: column; gap: 13px; }

.pd-shift { display: flex; align-items: stretch; gap: 10px; }
.pd-state { flex: 1; padding: 11px 13px; border-radius: 12px; background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); }
.pd-state.cur { border-color: color-mix(in srgb, var(--pd) 28%, var(--rmb-border-soft)); }
.pd-state.def { border-style: dashed; }
.pd-state-lbl { font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--rmb-text-muted); }
.pd-rules { list-style: none; margin: 7px 0 0; padding: 0; display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--rmb-text-secondary); }
.pd-rules b { color: var(--rmb-text); }
.pd-arrow { display: grid; place-items: center; color: var(--pd); flex: 0 0 auto; }
.pd-note { display: flex; gap: 9px; padding: 11px 13px; border-radius: 12px; font-size: 11.5px; line-height: 1.5; color: var(--rmb-text-muted);
  background: var(--rmb-surf-card); border: 1px solid var(--rmb-border-soft); }
.pd-note > svg { flex: 0 0 auto; margin-top: 1px; color: var(--rmb-st-submitted); }

.pd-fld { display: flex; flex-direction: column; gap: 6px; }
.pd-fld > span { font-size: 12px; font-weight: 600; color: var(--rmb-text-secondary); }
.opt { font-style: normal; font-weight: 400; color: var(--rmb-text-muted); }
.rmb-input { width: 100%; box-sizing: border-box; background: var(--hr-input-bg); color: var(--rmb-text); resize: vertical;
  border: 1px solid var(--hr-input-border); border-radius: 10px; padding: 10px 12px; font-size: 13px; font-family: inherit; line-height: 1.5; }
.rmb-input:focus { outline: none; border-color: var(--pd); box-shadow: 0 0 0 3px color-mix(in srgb, var(--pd) 14%, transparent); }
[data-theme="light"] .rmb-input { background: rgba(40,25,10,0.04); border-color: rgba(40,25,10,0.14); }

.pd-err-msg { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 12px; color: var(--rmb-st-rejected); }
.pd-err-enter-active, .pd-err-leave-active { transition: opacity 0.25s, transform 0.25s; }
.pd-err-enter-from, .pd-err-leave-to { opacity: 0; transform: translateY(-4px); }

.pd-foot { flex: 0 0 auto; display: flex; justify-content: flex-end; gap: 10px; padding: 14px 22px 18px;
  border-top: 1px solid var(--rmb-border-soft); background: var(--rmb-glass-deep); }
.pd-btn { color: #fff; border: none; background: linear-gradient(135deg, var(--pd), color-mix(in srgb, var(--pd) 70%, #7f1d1d));
  box-shadow: 0 14px 30px -14px color-mix(in srgb, var(--pd) 70%, transparent); }
.pd-btn:disabled { opacity: 0.6; cursor: not-allowed; }

@media (prefers-reduced-motion: reduce) { .pd-aura { animation: none !important; } }
@media (max-width: 460px) { .pd-shift { flex-direction: column; } .pd-arrow { transform: rotate(90deg); } }
</style>
