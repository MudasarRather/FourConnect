<template>
  <Teleport to="body">
    <div class="rmb-overlay" @mousedown.self="$emit('close')">
      <Motion as="div" class="rmb-modal rmb-receipt pe-modal"
              :initial="{ opacity: 0, scale: 0.95, y: 20 }"
              :animate="{ opacity: 1, scale: 1, y: 0 }"
              :transition="{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }">

        <!-- ── header ── -->
        <header class="pe-head" ref="headRef">
          <span class="pe-aura" aria-hidden="true" />
          <span class="pe-grid" aria-hidden="true" />
          <span class="rmb-spotlight" aria-hidden="true" />
          <span class="rmb-grain" aria-hidden="true" />
          <div class="pe-head-row">
            <span class="pe-eyebrow rmb-mono"><ShieldCheck :size="12" /> Policy · {{ categoryName || 'Category' }}</span>
            <button class="x" @click="$emit('close')" aria-label="Close"><X :size="17" /></button>
          </div>
          <h3>Limits &amp; <span class="ink">approval chain</span></h3>
          <p class="pe-sub">Caps gate what employees can claim; the chain decides who signs off, in order.</p>
        </header>

        <div class="pe-body">
          <!-- ── limits ── -->
          <Motion as="section" class="pe-card" v-bind="reveal(0)">
            <div class="pe-card-head"><span class="pe-num">01</span><h5>Spend limits</h5></div>
            <div class="lim-grid">
              <label v-for="(l, i) in limitFields" :key="l.key" class="lim" :class="{ filled: form[l.key] !== '' && form[l.key] != null }">
                <span class="lim-lbl">{{ l.label }}</span>
                <span class="lim-input">
                  <span class="lim-adorn">{{ l.adorn }}</span>
                  <input type="number" min="0" class="lim-field" v-model="form[l.key]" :placeholder="l.placeholder" />
                </span>
                <small class="lim-hint">{{ (form[l.key] === '' || form[l.key] == null) ? l.empty : l.note }}</small>
              </label>
            </div>
          </Motion>

          <!-- ── approval chain ── -->
          <Motion as="section" class="pe-card" v-bind="reveal(1)">
            <div class="pe-card-head">
              <span class="pe-num">02</span><h5>Approval chain</h5>
              <Motion as="button" type="button" class="add-stage" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }" @click="addStage">
                <Plus :size="13" /> Add stage
              </Motion>
            </div>

            <!-- live route preview -->
            <div class="route-preview">
              <span class="rp-start">Submitted</span>
              <template v-for="(s, i) in form.approval_chain" :key="'rp' + i">
                <span class="rp-link" aria-hidden="true" />
                <Motion as="span" class="rp-pill"
                  :initial="{ opacity: 0, scale: 0.7 }" :animate="{ opacity: 1, scale: 1 }"
                  :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }">
                  <component :is="approverIcon(s.approver_type)" :size="11" />
                  {{ s.label || labelFor(s.approver_type) }}
                  <i v-if="numOrNull(s.min_amount)" class="rp-thr rmb-mono">≥₹{{ short(s.min_amount) }}</i>
                </Motion>
              </template>
              <span class="rp-link" aria-hidden="true" />
              <span class="rp-end"><BadgeCheck :size="11" /> Approved</span>
            </div>

            <!-- editable stages -->
            <TransitionGroup name="stage" tag="div" class="stages">
              <div v-for="(s, i) in form.approval_chain" :key="s._k" class="stage rmb-receipt">
                <span class="stage-idx rmb-mono">{{ i + 1 }}</span>
                <div class="stage-main">
                  <RmbSelect class="stage-sel" :model-value="s.approver_type" :options="APPROVER_OPTS"
                             @update:model-value="(v) => onType(s, v)" placeholder="Approver" />
                  <input class="stage-input" v-model="s.label" placeholder="Display label" />
                  <span class="stage-thr">
                    <span class="thr-pre">≥₹</span>
                    <input type="number" min="0" class="thr-field" v-model="s.min_amount" placeholder="0" title="Only triggers above this amount" />
                  </span>
                </div>
                <button class="stage-rm" @click="removeStage(i)" :disabled="form.approval_chain.length === 1" aria-label="Remove stage"><X :size="14" /></button>
              </div>
            </TransitionGroup>
            <div v-if="!form.approval_chain.length" class="stage-empty">
              <ShieldOff :size="20" /><span>No stages — claims in this category would auto-approve. Add at least one.</span>
            </div>
            <p class="hint"><Info :size="12" /> Stages run top → bottom. A “≥ ₹” threshold makes a stage trigger only above that amount; a Manager stage auto-skips when the employee has no manager.</p>
          </Motion>

          <Transition name="pe-err">
            <p v-if="err" class="pe-err"><AlertTriangle :size="14" /> {{ err }}</p>
          </Transition>
        </div>

        <footer class="pe-foot">
          <button class="rmb-btn rmb-btn-ghost" @click="$emit('close')" :disabled="busy">Cancel</button>
          <Motion as="button" class="rmb-btn rmb-btn-primary" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }"
                  :disabled="busy" @click="save">
            <ShieldCheck :size="15" /> {{ busy ? 'Saving…' : (editing ? 'Save policy' : 'Activate policy') }}
          </Motion>
        </footer>
      </Motion>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { Motion } from 'motion-v'
import { X, Plus, ShieldCheck, ShieldOff, BadgeCheck, Info, AlertTriangle, UserCheck, Landmark, Users } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { createPolicy, updatePolicy, errText } from '@/composables/useReimbursements'
import { usePointerSpotlight } from '@/composables/useShiftMotion'
import RmbSelect from '../components/RmbSelect.vue'

const props = defineProps({
  policy: { type: Object, default: null },
  categoryId: { type: String, required: true },
  categoryName: { type: String, default: '' },
})
const emit = defineEmits(['close', 'saved'])
const toast = useToast()
const editing = !!props.policy?.id

const headRef = ref(null)
usePointerSpotlight(headRef)

const LABELS = { MANAGER: 'Reporting Manager', FINANCE: 'Finance', HR: 'HR' }
const APPROVER_OPTS = [
  { value: 'MANAGER', label: 'Reporting Manager', icon: UserCheck, hint: 'Employee’s line manager' },
  { value: 'FINANCE', label: 'Finance', icon: Landmark, hint: 'Finance / accounts desk' },
  { value: 'HR', label: 'HR', icon: Users, hint: 'People team' },
]
const APPROVER_ICON = { MANAGER: UserCheck, FINANCE: Landmark, HR: Users }
const approverIcon = (t) => APPROVER_ICON[t] || UserCheck
const labelFor = (t) => LABELS[t] || t

let _k = 0
const withKey = (s) => ({ approver_type: 'FINANCE', label: 'Finance', min_amount: null, ...s, _k: ++_k })

const form = reactive({
  max_amount_per_claim: props.policy?.max_amount_per_claim ?? '',
  max_amount_per_month: props.policy?.max_amount_per_month ?? '',
  max_claims_per_month: props.policy?.max_claims_per_month ?? '',
  attachment_required_above: props.policy?.attachment_required_above ?? '',
  approval_chain: (props.policy?.approval_chain || [
    { approver_type: 'MANAGER', label: 'Reporting Manager', min_amount: null },
    { approver_type: 'FINANCE', label: 'Finance', min_amount: null },
    { approver_type: 'HR', label: 'HR', min_amount: null },
  ]).map(withKey),
})

const limitFields = [
  { key: 'max_amount_per_claim', label: 'Max per claim', adorn: '₹', placeholder: '0', empty: 'No cap — any amount', note: 'Per-claim ceiling' },
  { key: 'max_amount_per_month', label: 'Max per month', adorn: '₹', placeholder: '0', empty: 'No monthly cap', note: 'Rolling monthly ceiling' },
  { key: 'max_claims_per_month', label: 'Max claims / month', adorn: '#', placeholder: '0', empty: 'Unlimited count', note: 'Submission count cap' },
  { key: 'attachment_required_above', label: 'Receipt required above', adorn: '₹', placeholder: '0', empty: 'Always require receipt', note: 'Receipt mandatory beyond this' },
]

const busy = ref(false)
const err = ref('')

const short = (n) => {
  const v = Number(n) || 0
  if (v >= 1e7) return (v / 1e7).toFixed(1).replace(/\.0$/, '') + 'Cr'
  if (v >= 1e5) return (v / 1e5).toFixed(1).replace(/\.0$/, '') + 'L'
  if (v >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(Math.round(v))
}
const numOrNull = (v) => (v === '' || v === null || v === undefined) ? null : Number(v)

const reveal = (i) => ({
  initial: { opacity: 0, y: 16, filter: 'blur(5px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { delay: 0.08 + i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
})

function onType(s, v) {
  // Mirror the original behaviour: switching the approver retitles the stage label.
  if (!s.label || Object.values(LABELS).includes(s.label)) s.label = labelFor(v)
  s.approver_type = v
}
function addStage() { form.approval_chain.push(withKey({ approver_type: 'FINANCE', label: 'Finance' })) }
function removeStage(i) { if (form.approval_chain.length > 1) form.approval_chain.splice(i, 1) }

async function save() {
  err.value = ''
  busy.value = true
  try {
    const payload = {
      max_amount_per_claim: numOrNull(form.max_amount_per_claim),
      max_amount_per_month: numOrNull(form.max_amount_per_month),
      max_claims_per_month: numOrNull(form.max_claims_per_month),
      attachment_required_above: numOrNull(form.attachment_required_above),
      approval_chain: form.approval_chain.map(s => ({
        approver_type: s.approver_type, label: s.label || labelFor(s.approver_type),
        approver_user_id: null, min_amount: numOrNull(s.min_amount),
      })),
    }
    if (editing) await updatePolicy(props.policy.id, payload)
    else await createPolicy({ ...payload, category_id: props.categoryId })
    toast.success('Policy saved')
    emit('saved'); emit('close')
  } catch (e) { err.value = errText(e, 'Save failed') }
  finally { busy.value = false }
}
</script>

<style scoped>
.rmb-overlay { position: fixed; inset: 0; z-index: 4000; display: grid; place-items: center; padding: 24px;
  background: radial-gradient(120% 120% at 50% 0%, rgba(60,40,8,0.42), rgba(0,0,0,0.6)); backdrop-filter: blur(9px); }
[data-theme="light"] .rmb-overlay { background: radial-gradient(120% 120% at 50% 0%, rgba(180,120,20,0.14), rgba(40,25,10,0.34)); }

.pe-modal { --pe: var(--rmb-amber); width: min(580px, 96vw); max-height: 92vh; display: flex; flex-direction: column; overflow: hidden;
  background: var(--rmb-glass-deep); backdrop-filter: var(--rmb-glass-blur);
  border: 1px solid color-mix(in srgb, var(--pe) 30%, var(--rmb-border-strong));
  box-shadow: 0 40px 90px -42px color-mix(in srgb, var(--pe) 40%, rgba(0,0,0,0.7)), var(--rmb-glass-shadow); border-radius: 20px; }

/* header */
.pe-head { position: relative; flex: 0 0 auto; padding: 20px 22px 18px; overflow: hidden; border-bottom: 1px solid var(--rmb-border-soft);
  background: radial-gradient(130% 130% at 100% 0%, color-mix(in srgb, var(--pe) 20%, transparent), transparent 62%),
    linear-gradient(160deg, var(--rmb-paper-elevated), var(--rmb-paper)); }
.pe-head > :not(.pe-aura):not(.pe-grid):not(.rmb-grain):not(.rmb-spotlight) { position: relative; z-index: 2; }
.pe-aura { position: absolute; top: -90px; right: -70px; width: 250px; height: 250px; border-radius: 50%; z-index: 0;
  background: radial-gradient(circle, color-mix(in srgb, var(--pe) 55%, transparent), transparent 68%); filter: blur(38px);
  opacity: 0.55; animation: rmb-aura-breathe 6s ease-in-out infinite; }
.pe-grid { position: absolute; inset: 0; z-index: 0; opacity: 0.45;
  background-image: linear-gradient(var(--rmb-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--rmb-grid-line) 1px, transparent 1px);
  background-size: 28px 28px; -webkit-mask: radial-gradient(110% 90% at 80% 0%, #000, transparent 72%); mask: radial-gradient(110% 90% at 80% 0%, #000, transparent 72%); }
.pe-head-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 11px; }
.pe-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--pe); }
.x { background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); color: var(--rmb-text-muted);
  width: 32px; height: 32px; border-radius: 10px; cursor: pointer; display: grid; place-items: center; transition: 0.2s; }
.x:hover { color: var(--pe); border-color: color-mix(in srgb, var(--pe) 45%, transparent); transform: rotate(90deg); }
.pe-head h3 { margin: 0; font-size: 19px; font-weight: 800; letter-spacing: -0.02em; color: var(--rmb-text); }
.pe-head h3 .ink { background: linear-gradient(120deg, var(--rmb-amber), var(--rmb-st-settled)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.pe-sub { margin: 6px 0 0; font-size: 12px; line-height: 1.5; color: var(--rmb-text-muted); }

/* body */
.pe-body { flex: 1; overflow-y: auto; padding: 16px 22px 18px; display: flex; flex-direction: column; gap: 14px; }
.pe-body::-webkit-scrollbar { width: 8px; }
.pe-body::-webkit-scrollbar-thumb { background: var(--rmb-border-strong); border-radius: 8px; }

.pe-card { position: relative; padding: 15px 16px; border-radius: 14px;
  background: var(--rmb-surf-card); border: 1px solid var(--rmb-border-soft); box-shadow: var(--rmb-card-shadow); }
.pe-card-head { display: flex; align-items: center; gap: 9px; margin-bottom: 13px; padding-bottom: 11px; position: relative; }
.pe-card-head::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 1px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--pe) 45%, transparent), transparent 65%); }
.pe-num { font-family: var(--rmb-mono); font-size: 10px; color: var(--pe); opacity: 0.85; }
.pe-card-head h5 { margin: 0; flex: 1; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--rmb-text-muted); }

/* limits */
.lim-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; }
.lim { display: flex; flex-direction: column; gap: 5px; }
.lim-lbl { font-size: 11.5px; font-weight: 600; color: var(--rmb-text-secondary); }
.lim-input { display: flex; align-items: center; gap: 7px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border);
  border-radius: 9px; padding: 0 11px; transition: border-color 0.2s, box-shadow 0.2s; }
[data-theme="light"] .lim-input { background: rgba(40,25,10,0.04); border-color: rgba(40,25,10,0.14); }
.lim-input:focus-within { border-color: var(--pe); box-shadow: 0 0 0 3px color-mix(in srgb, var(--pe) 14%, transparent); }
.lim-adorn { font-family: var(--rmb-mono); font-size: 13px; color: var(--rmb-text-muted); flex: 0 0 auto; }
.lim.filled .lim-adorn { color: var(--pe); }
.lim-field { flex: 1; min-width: 0; background: none; border: none; outline: none; padding: 9px 0; font-size: 13px; color: var(--rmb-text); font-family: var(--rmb-mono); }
.lim-hint { font-size: 10px; color: var(--rmb-text-muted); }
.lim.filled .lim-hint { color: color-mix(in srgb, var(--pe) 70%, var(--rmb-text-muted)); }

/* route preview */
.route-preview { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; padding: 11px 12px; margin-bottom: 13px; border-radius: 12px;
  background: var(--rmb-surface); border: 1px dashed var(--rmb-border-strong); }
.rp-start, .rp-end { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.04em;
  padding: 4px 9px; border-radius: 999px; color: var(--rmb-text-muted); background: var(--rmb-surface-elevated); }
.rp-end { color: var(--rmb-st-approved); background: var(--rmb-st-approved-soft); }
.rp-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 600; padding: 4px 9px; border-radius: 999px;
  color: var(--rmb-text); background: color-mix(in srgb, var(--pe) 12%, var(--rmb-surface)); border: 1px solid color-mix(in srgb, var(--pe) 28%, transparent); }
.rp-pill > svg { color: var(--pe); }
.rp-thr { font-size: 8.5px; font-style: normal; padding: 1px 5px; border-radius: 5px; background: color-mix(in srgb, var(--pe) 18%, transparent); color: var(--pe); }
.rp-link { width: 12px; height: 2px; border-radius: 2px; flex: 0 0 auto;
  background: linear-gradient(90deg, color-mix(in srgb, var(--pe) 60%, transparent), color-mix(in srgb, var(--pe) 20%, transparent)); }

/* add-stage */
.add-stage { display: inline-flex; align-items: center; gap: 5px; padding: 5px 11px; border-radius: 9px; cursor: pointer;
  font-size: 11.5px; font-weight: 600; color: var(--pe); background: color-mix(in srgb, var(--pe) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--pe) 30%, transparent); }

/* stages */
.stages { display: flex; flex-direction: column; gap: 8px; }
.stage { display: flex; align-items: center; gap: 8px; padding: 9px 10px; border-radius: 11px;
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); }
.stage-idx { width: 22px; height: 22px; border-radius: 7px; display: grid; place-items: center; flex: 0 0 auto;
  font-size: 11px; color: var(--pe); background: color-mix(in srgb, var(--pe) 14%, transparent); }
.stage-main { flex: 1; display: grid; grid-template-columns: 1.2fr 1.1fr auto; gap: 6px; min-width: 0; align-items: center; }
.stage-sel { min-width: 0; }
.stage-input { min-width: 0; box-sizing: border-box; background: var(--hr-input-bg); color: var(--rmb-text);
  border: 1px solid var(--hr-input-border); border-radius: 9px; padding: 8px 10px; font-size: 12.5px; font-family: inherit; }
[data-theme="light"] .stage-input { background: rgba(40,25,10,0.04); border-color: rgba(40,25,10,0.14); }
.stage-input:focus { outline: none; border-color: var(--pe); }
.stage-thr { display: inline-flex; align-items: center; gap: 2px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border);
  border-radius: 9px; padding: 0 8px; }
[data-theme="light"] .stage-thr { background: rgba(40,25,10,0.04); border-color: rgba(40,25,10,0.14); }
.stage-thr:focus-within { border-color: var(--pe); }
.thr-pre { font-family: var(--rmb-mono); font-size: 11px; color: var(--rmb-text-muted); }
.thr-field { width: 58px; background: none; border: none; outline: none; padding: 8px 0; font-size: 12px; color: var(--rmb-text); font-family: var(--rmb-mono); }
.stage-rm { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; cursor: pointer; flex: 0 0 auto;
  background: var(--rmb-surface-elevated); border: 1px solid var(--rmb-border-soft); color: var(--rmb-text-muted); transition: all 0.2s; }
.stage-rm:hover:not(:disabled) { color: var(--rmb-st-rejected); border-color: color-mix(in srgb, var(--rmb-st-rejected) 40%, transparent); }
.stage-rm:disabled { opacity: 0.35; cursor: not-allowed; }

.stage-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 22px; text-align: center;
  border: 1.5px dashed var(--rmb-border-strong); border-radius: 12px; color: var(--rmb-text-muted); font-size: 12px; }
.hint { display: flex; align-items: flex-start; gap: 6px; font-size: 11px; color: var(--rmb-text-muted); margin: 10px 0 0; line-height: 1.45; }
.hint > svg { flex: 0 0 auto; margin-top: 1px; }

.pe-err { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 12px; color: var(--rmb-st-rejected); }
.pe-err-enter-active, .pe-err-leave-active { transition: opacity 0.25s, transform 0.25s; }
.pe-err-enter-from, .pe-err-leave-to { opacity: 0; transform: translateY(-4px); }

/* footer */
.pe-foot { flex: 0 0 auto; display: flex; justify-content: flex-end; gap: 10px; padding: 14px 22px 18px;
  border-top: 1px solid var(--rmb-border-soft); background: var(--rmb-glass-deep); }
.pe-foot .rmb-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

/* transitions */
.stage-enter-active, .stage-leave-active { transition: all 0.34s var(--rmb-spring); }
.stage-enter-from { opacity: 0; transform: translateX(-16px); }
.stage-leave-to { opacity: 0; transform: translateX(24px); }
.stage-leave-active { position: relative; z-index: 0; }

@media (prefers-reduced-motion: reduce) { .pe-aura { animation: none !important; } }
@media (max-width: 540px) {
  .lim-grid { grid-template-columns: 1fr; }
  .stage-main { grid-template-columns: 1fr; }
}
</style>
