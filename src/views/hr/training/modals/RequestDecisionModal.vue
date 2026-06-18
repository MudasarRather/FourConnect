<template>
  <TrnModal :open="open" title="Decide request"
    subtitle="Act on this stage of the approval chain." :icon="Gavel" @close="$emit('close')">
    <div class="rd-root">
    <!-- accent aura responds to the chosen decision -->
    <span class="rd-aura" :class="`tone-${activeDef.tone}`" aria-hidden="true" />

    <div v-if="request" class="rd-stack">
      <!-- summary -->
      <Motion as="div" class="rd-summary"
        :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.35, delay: 0.04 }">
        <div class="rd-sum-top">
          <span class="rd-num trn-mono">{{ request.request_number || '—' }}</span>
          <TrnStatusStamp :status="request.status" kind="request" />
        </div>
        <h3 class="rd-title">{{ request.title || 'Untitled request' }}</h3>
        <div class="rd-emp">
          <span class="rd-avatar" aria-hidden="true">{{ initials(request.employee_name) }}</span>
          <span class="rd-emp-txt">{{ request.employee_name || '—' }}
            <template v-if="request.employee_code"> · <span class="trn-mono">{{ request.employee_code }}</span></template>
          </span>
          <span v-if="request.estimated_cost != null" class="rd-cost trn-mono">{{ fmtCost(request.estimated_cost, request.currency) }}</span>
        </div>

        <!-- stage map -->
        <div v-if="stageMap.length" class="rd-stages">
          <template v-for="(s, i) in stageMap" :key="i">
            <span class="rd-stage" :class="{ done: s.done, current: s.current, skipped: s.skipped }">
              <span class="rd-stage-dot" aria-hidden="true"><component :is="s.icon" :size="11" /></span>
              <span class="rd-stage-lab">{{ s.label }}</span>
            </span>
            <span v-if="i < stageMap.length - 1" class="rd-stage-link" :class="{ done: s.done }" aria-hidden="true" />
          </template>
        </div>
      </Motion>

      <!-- decision picker -->
      <Motion as="div" class="rd-pick"
        :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.35, delay: 0.1 }">
        <span class="rd-label">Your decision</span>
        <div class="rd-seg" :style="{ '--idx': activeIdx, '--count': DECISIONS.length }">
          <span class="rd-seg-ind" :class="`tone-${activeDef.tone}`" aria-hidden="true" />
          <button v-for="d in DECISIONS" :key="d.value" type="button" class="rd-seg-btn"
            :class="[`tone-${d.tone}`, { on: decision === d.value }]" @click="decision = d.value">
            <component :is="d.icon" :size="15" /> {{ d.label }}
          </button>
        </div>

        <!-- what-happens-next preview -->
        <Presence>
          <Motion :key="decision" as="div" class="rd-next" :class="`tone-${activeDef.tone}`"
            :initial="{ opacity: 0, x: 8 }" :animate="{ opacity: 1, x: 0 }" :exit="{ opacity: 0, x: -8 }"
            :transition="{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }">
            <component :is="activeDef.icon" :size="14" class="rd-next-ic" />
            <span><strong>{{ activeDef.label }}</strong> — {{ nextEffect }}</span>
          </Motion>
        </Presence>
      </Motion>

      <!-- notes -->
      <Motion as="div"
        :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.35, delay: 0.16 }">
        <div class="rd-notes-head">
          <span class="rd-label">{{ notesRequired ? 'Reason' : 'Notes' }}<i v-if="notesRequired" class="req">*</i></span>
          <span class="rd-count trn-mono" :class="{ over: notes.length > 400 }">{{ notes.length }}/400</span>
        </div>
        <textarea class="rd-textarea" :class="{ invalid: notesRequired && touched && !notes.trim() }" rows="4"
          maxlength="400" :placeholder="notesPlaceholder" v-model="notes" @blur="touched = true" />
        <Presence>
          <Motion v-if="notesRequired && touched && !notes.trim()" as="span" class="rd-err"
            :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }">
            A reason is required to {{ decision.toLowerCase() }} this request.
          </Motion>
        </Presence>
      </Motion>
    </div>
    </div>

    <template #footer>
      <button class="trn-btn trn-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="trn-btn rd-submit" :class="`tone-${activeDef.tone}`"
        :whileHover="canSubmit ? { y: -2 } : {}" :whileTap="canSubmit ? { scale: 0.97 } : {}"
        :disabled="saving || !canSubmit" @click="save">
        <Loader v-if="saving" :size="15" class="spin" /><component v-else :is="activeDef.icon" :size="15" />
        {{ submitLabel }}
      </Motion>
    </template>
  </TrnModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  Gavel, User, Check, CornerUpLeft, X, Loader, ShieldCheck, GraduationCap, SkipForward,
} from 'lucide-vue-next'
import TrnModal from '../components/TrnModal.vue'
import TrnStatusStamp from '../components/TrnStatusStamp.vue'
import { decideRequest } from '@/composables/useTraining'

const props = defineProps({
  open: { type: Boolean, default: false },
  request: { type: Object, default: null },
})
const emit = defineEmits(['close', 'saved'])
const toast = useToast()
const saving = ref(false)
const touched = ref(false)

const DECISIONS = [
  { value: 'APPROVE', label: 'Approve', icon: Check, tone: 'ok' },
  { value: 'RETURN', label: 'Return', icon: CornerUpLeft, tone: 'warn' },
  { value: 'REJECT', label: 'Reject', icon: X, tone: 'danger' },
]
const decision = ref('APPROVE')
const notes = ref('')

const activeIdx = computed(() => DECISIONS.findIndex(d => d.value === decision.value))
const activeDef = computed(() => DECISIONS[activeIdx.value] || DECISIONS[0])

const notesRequired = computed(() => decision.value === 'REJECT' || decision.value === 'RETURN')
const canSubmit = computed(() => !(notesRequired.value && !notes.value.trim()))
const notesPlaceholder = computed(() =>
  decision.value === 'REJECT' ? 'Explain why this request is being rejected…'
    : decision.value === 'RETURN' ? 'Tell the employee what to revise before resubmitting…'
      : 'Optional note for the approval trail…')
const submitLabel = computed(() =>
  decision.value === 'REJECT' ? 'Reject request'
    : decision.value === 'RETURN' ? 'Return for revision'
      : 'Approve request')

// ── stage map ────────────────────────────────────────────────────────────────
const steps = computed(() => Array.isArray(props.request?.approval_steps) ? props.request.approval_steps : [])
const stageMap = computed(() => {
  const cur = props.request?.current_step ?? 0
  const map = steps.value.map((s, i) => {
    const dec = (s.decision || '').toString().toUpperCase()
    const skipped = dec.includes('SKIP')
    return {
      label: s.label || `Stage ${i + 1}`,
      icon: s.approver_type === 'HR' ? ShieldCheck : User,
      done: dec.includes('APPROV') || (i < cur && !skipped),
      current: i === cur && !skipped,
      skipped,
    }
  })
  map.push({ label: 'Enrol', icon: GraduationCap, done: props.request?.status === 'FULFILLED', current: false, skipped: false })
  return map
})

const nextStageLabel = computed(() => {
  const cur = props.request?.current_step ?? 0
  for (let i = cur + 1; i < steps.value.length; i++) {
    const dec = (steps.value[i].decision || '').toString().toUpperCase()
    if (!dec.includes('SKIP')) return steps.value[i].label || `Stage ${i + 1}`
  }
  return null
})
const isLastStage = computed(() => !nextStageLabel.value)

const nextEffect = computed(() => {
  if (decision.value === 'APPROVE') {
    return isLastStage.value
      ? 'request becomes Approved and is ready for HR to fulfil & enrol the employee.'
      : `request advances to the next approver: ${nextStageLabel.value}.`
  }
  if (decision.value === 'RETURN') {
    return `request goes back to ${props.request?.employee_name || 'the employee'} to revise and resubmit.`
  }
  return 'request is closed as Rejected. The employee is notified — this is final.'
})

watch(() => props.open, (o) => {
  if (o) { decision.value = 'APPROVE'; notes.value = ''; touched.value = false }
})

const initials = (name) => name ? name.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() : '—'
const fmtCost = (v, ccy) => {
  if (v == null) return ''
  try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: ccy || 'INR', maximumFractionDigits: 0 }).format(v) }
  catch { return `${ccy || 'INR'} ${v}` }
}

const save = async () => {
  if (!props.request) return
  touched.value = true
  if (!canSubmit.value) return
  saving.value = true
  try {
    await decideRequest(props.request.id, { decision: decision.value, notes: notes.value })
    toast.success(`Request ${decision.value.toLowerCase() === 'approve' ? 'approved' : decision.value.toLowerCase() + 'ed'}`)
    emit('saved')
    emit('close')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not record decision')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.rd-root { position: relative; }
.rd-aura { position: absolute; top: -10px; left: 0; right: 0; height: 170px; z-index: 0; pointer-events: none; filter: blur(40px); opacity: 0.5;
  transition: background 0.4s ease; }
.rd-aura.tone-ok { background: radial-gradient(50% 100% at 50% 0%, color-mix(in srgb, var(--trn-st-completed) 40%, transparent), transparent 70%); }
.rd-aura.tone-warn { background: radial-gradient(50% 100% at 50% 0%, color-mix(in srgb, var(--trn-st-waived) 40%, transparent), transparent 70%); }
.rd-aura.tone-danger { background: radial-gradient(50% 100% at 50% 0%, color-mix(in srgb, var(--trn-st-failed) 40%, transparent), transparent 70%); }

.rd-stack { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 18px; }

.rd-summary { padding: 14px 16px; border-radius: 16px; background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.rd-sum-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.rd-num { font-size: 12px; font-weight: 700; color: var(--trn-amber-strong); }
.rd-title { margin: 10px 0 0; font-size: 16px; font-weight: 750; color: var(--trn-text); line-height: 1.3; }
.rd-emp { display: flex; align-items: center; gap: 9px; margin-top: 10px; }
.rd-avatar { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; flex-shrink: 0;
  border-radius: 8px; font-family: var(--trn-mono); font-size: 11px; font-weight: 700; color: var(--trn-amber);
  background: color-mix(in srgb, var(--trn-amber) 14%, transparent); }
.rd-emp-txt { font-size: 12.5px; color: var(--trn-text-secondary); }
.rd-cost { margin-left: auto; font-size: 13px; font-weight: 800; color: var(--trn-text); }

.rd-stages { display: flex; align-items: center; gap: 4px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--trn-border-soft); flex-wrap: wrap; }
.rd-stage { display: inline-flex; align-items: center; gap: 6px; padding: 3px 4px; }
.rd-stage-dot { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
  color: var(--trn-text-dim); background: var(--trn-surface-elevated); border: 1.5px solid var(--trn-border-strong); transition: all 0.3s; }
.rd-stage.done .rd-stage-dot { color: #fff; background: var(--trn-st-completed); border-color: var(--trn-st-completed); }
[data-theme="light"] .rd-stage.done .rd-stage-dot { color: #fff; }
.rd-stage.current .rd-stage-dot { color: var(--trn-amber); border-color: var(--trn-amber); background: color-mix(in srgb, var(--trn-amber) 14%, transparent);
  animation: rd-pulse 1.9s ease-in-out infinite; }
.rd-stage.skipped { opacity: 0.5; }
.rd-stage-lab { font-size: 11.5px; font-weight: 600; color: var(--trn-text-muted); }
.rd-stage.current .rd-stage-lab { color: var(--trn-amber-strong); font-weight: 700; }
.rd-stage-link { flex: 1; min-width: 12px; height: 2px; border-radius: 999px; background: var(--trn-border-strong); }
.rd-stage-link.done { background: var(--trn-st-completed); }

.rd-pick { display: flex; flex-direction: column; gap: 12px; }
.rd-label { font-size: 12px; font-weight: 700; color: var(--trn-text-secondary); }
.rd-label .req { color: var(--trn-st-failed); margin-left: 2px; font-style: normal; }

.rd-seg { position: relative; display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; padding: 4px; border-radius: 14px;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.rd-seg-ind { position: absolute; top: 4px; bottom: 4px; left: 4px; width: calc((100% - 8px) / var(--count)); border-radius: 11px; z-index: 0;
  transform: translateX(calc(var(--idx) * 100%)); transition: transform 0.4s var(--trn-spring), background 0.3s, box-shadow 0.3s; }
.rd-seg-ind.tone-ok { background: var(--trn-st-completed-soft); box-shadow: inset 0 0 0 1px var(--trn-st-completed); }
.rd-seg-ind.tone-warn { background: var(--trn-st-waived-soft); box-shadow: inset 0 0 0 1px var(--trn-st-waived); }
.rd-seg-ind.tone-danger { background: var(--trn-st-failed-soft); box-shadow: inset 0 0 0 1px var(--trn-st-failed); }
.rd-seg-btn { position: relative; z-index: 1; display: inline-flex; align-items: center; justify-content: center; gap: 7px; font: inherit;
  font-size: 13px; font-weight: 600; padding: 10px 8px; border-radius: 11px; border: 0; background: transparent; cursor: pointer;
  color: var(--trn-text-muted); transition: color 0.25s; }
.rd-seg-btn:hover { color: var(--trn-text-secondary); }
.rd-seg-btn.on.tone-ok { color: var(--trn-st-completed); }
.rd-seg-btn.on.tone-warn { color: var(--trn-st-waived); }
.rd-seg-btn.on.tone-danger { color: var(--trn-st-failed); }

.rd-next { display: flex; align-items: flex-start; gap: 9px; padding: 11px 13px; border-radius: 12px; font-size: 12.5px; line-height: 1.5;
  color: var(--trn-text-secondary); background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.rd-next strong { color: var(--trn-text); }
.rd-next-ic { flex-shrink: 0; margin-top: 1px; }
.rd-next.tone-ok { border-color: color-mix(in srgb, var(--trn-st-completed) 30%, transparent); }
.rd-next.tone-ok .rd-next-ic { color: var(--trn-st-completed); }
.rd-next.tone-warn { border-color: color-mix(in srgb, var(--trn-st-waived) 30%, transparent); }
.rd-next.tone-warn .rd-next-ic { color: var(--trn-st-waived); }
.rd-next.tone-danger { border-color: color-mix(in srgb, var(--trn-st-failed) 30%, transparent); }
.rd-next.tone-danger .rd-next-ic { color: var(--trn-st-failed); }

.rd-notes-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.rd-count { font-size: 11px; color: var(--trn-text-dim); }
.rd-count.over { color: var(--trn-st-failed); }
.rd-textarea { width: 100%; font: inherit; font-size: 13.5px; color: var(--trn-text); resize: vertical; min-height: 80px;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); border-radius: 12px; padding: 11px 13px;
  transition: border-color 0.2s, box-shadow 0.2s; }
.rd-textarea:focus { outline: none; border-color: color-mix(in srgb, var(--trn-amber) 55%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--trn-amber) 14%, transparent); }
.rd-textarea.invalid { border-color: color-mix(in srgb, var(--trn-st-failed) 55%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--trn-st-failed) 14%, transparent); }
.rd-err { display: block; overflow: hidden; font-size: 11.5px; color: var(--trn-st-failed); margin-top: 6px; }

.rd-submit { color: #1a1206; border: none; }
.rd-submit.tone-ok { background: linear-gradient(120deg, var(--trn-st-completed), color-mix(in srgb, var(--trn-st-completed) 70%, #000)); color: #04261a; box-shadow: 0 8px 22px -10px color-mix(in srgb, var(--trn-st-completed) 70%, transparent); }
.rd-submit.tone-warn { background: var(--hr-gradient-hero); color: #2a1a06; box-shadow: 0 8px 22px -10px rgba(251, 146, 60, 0.6); }
.rd-submit.tone-danger { background: linear-gradient(120deg, var(--trn-st-failed), color-mix(in srgb, var(--trn-st-failed) 72%, #000)); color: #fff; box-shadow: 0 8px 22px -10px color-mix(in srgb, var(--trn-st-failed) 70%, transparent); }
[data-theme="light"] .rd-submit.tone-ok { color: #fff; }
.rd-submit:disabled { opacity: 0.5; cursor: not-allowed; }

.spin { animation: trn-orbit-spin 0.9s linear infinite; }
@keyframes rd-pulse { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--trn-amber) 55%, transparent); } 50% { box-shadow: 0 0 0 5px transparent; } }
@media (prefers-reduced-motion: reduce) { .spin, .rd-stage.current .rd-stage-dot { animation: none; } .rd-seg-ind { transition: none; } }
</style>
