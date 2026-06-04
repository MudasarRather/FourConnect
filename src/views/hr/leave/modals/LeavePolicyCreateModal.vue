<template>
  <Teleport to="body">
    <transition name="pc">
      <div v-if="open" class="pc-scrim" @click.self="close">
        <Motion class="pc-card" as="div" role="dialog"
          :initial="{ opacity: 0, y: 18, scale: 0.96 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }"
        >
          <!-- blueprint ambience -->
          <span class="pc-paper" aria-hidden="true" />
          <span class="pc-beam" aria-hidden="true" />

          <!-- ── Head ── -->
          <header class="pc-head">
            <div class="pc-head-ic"><LayoutGrid :size="18" /></div>
            <div class="pc-head-titles">
              <span class="leave-mono pc-eye">GOVERNANCE / NEW MODULE</span>
              <h3 class="pc-title">Configure a leave policy</h3>
            </div>
            <button class="pc-close" @click="close"><X :size="14" /></button>
          </header>

          <!-- ── Step rail ── -->
          <div v-if="creatableTypes.length" class="pc-steps">
            <div v-for="(s, i) in STEPS" :key="s.key" class="pc-step"
              :class="{ active: step === i, done: step > i }">
              <span class="pc-step-dot">
                <Check v-if="step > i" :size="11" />
                <span v-else>{{ i + 1 }}</span>
              </span>
              <span class="pc-step-label">{{ s.label }}</span>
              <span v-if="i < STEPS.length - 1" class="pc-step-line" />
            </div>
          </div>

          <!-- ── Empty: every type already configured ── -->
          <div v-if="!creatableTypes.length" class="pc-empty">
            <div class="pc-empty-ic"><ShieldCheck :size="30" /></div>
            <h4>Every leave type is configured</h4>
            <p>
              All {{ TOTAL_TYPES }} leave types in the taxonomy already have a live policy.
              To free a slot, delete an existing policy first — its slot then becomes
              available here.
            </p>
            <button class="leave-btn leave-btn-sm" @click="close">Got it</button>
          </div>

          <!-- ── Body ── -->
          <div v-else class="pc-body">
            <!-- STEP 0 · Identity -->
            <section v-show="step === 0" class="pc-pane">
              <label class="pc-flabel">Leave type <span class="req">*</span></label>
              <div class="pc-type-grid">
                <button v-for="t in creatableMeta" :key="t.key" type="button"
                  class="pc-type" :class="{ on: form.leave_type === t.key }"
                  :style="{ '--tc': t.hex }" @click="pickType(t.key)">
                  <LeaveTypeIcon :type="t.key" :size="18" ambient />
                  <span class="pc-type-name">{{ t.label }}</span>
                  <Check v-if="form.leave_type === t.key" :size="13" class="pc-type-check" />
                </button>
              </div>

              <div class="pc-row two">
                <label class="pc-field">
                  <span>Display label</span>
                  <input v-model="form.label" type="text" maxlength="60"
                    :placeholder="defaultLabel || 'e.g. Casual Leave'" />
                </label>
                <label class="pc-field">
                  <span>Accent colour</span>
                  <div class="pc-color">
                    <input v-model="form.color_hex" type="color" class="pc-color-swatch" />
                    <input v-model="form.color_hex" type="text" maxlength="9"
                      class="pc-color-hex" placeholder="#fbbf24" />
                  </div>
                </label>
              </div>

              <label class="pc-field">
                <span>Description</span>
                <textarea v-model="form.description" rows="2" maxlength="400"
                  placeholder="Short note shown to admins (optional)" />
              </label>
            </section>

            <!-- STEP 1 · Quota & limits -->
            <section v-show="step === 1" class="pc-pane">
              <div class="pc-row three">
                <label class="pc-field">
                  <span>Annual quota (days)</span>
                  <input v-model.number="form.annual_quota" type="number" min="0" max="365" step="0.5" />
                </label>
                <label class="pc-field">
                  <span>Monthly accrual</span>
                  <input v-model.number="form.monthly_accrual" type="number" min="0" max="31" step="0.5" />
                </label>
                <label class="pc-field">
                  <span>Max carry-forward</span>
                  <input v-model.number="form.max_carry_forward" type="number" min="0" max="365" step="0.5" />
                </label>
              </div>
              <div class="pc-row three">
                <label class="pc-field">
                  <span>Max consecutive (days)</span>
                  <input v-model.number="form.max_consecutive_days" type="number" min="0" max="365" placeholder="No limit" />
                </label>
                <label class="pc-field">
                  <span>Notice required (days)</span>
                  <input v-model.number="form.requires_notice_days" type="number" min="0" max="90" />
                </label>
                <label class="pc-field">
                  <span>Advance booking (days)</span>
                  <input v-model.number="form.advance_book_days" type="number" min="0" max="365" placeholder="No limit" />
                </label>
              </div>

              <div class="pc-preview">
                <span class="leave-mono">Preview</span>
                <p>
                  <b>{{ form.annual_quota || 0 }}</b> {{ pluralD(form.annual_quota) }} per year
                  <span v-if="form.monthly_accrual"> · <b>{{ form.monthly_accrual }}</b> accrued monthly</span>
                  <span v-if="form.max_carry_forward"> · up to <b>{{ form.max_carry_forward }}</b> carried over</span>.
                  <template v-if="form.requires_notice_days"> Notice: <b>{{ form.requires_notice_days }}</b> {{ pluralD(form.requires_notice_days) }}.</template>
                  <template v-if="form.max_consecutive_days"> Max <b>{{ form.max_consecutive_days }}</b> consecutive {{ pluralD(form.max_consecutive_days) }}.</template>
                </p>
              </div>
            </section>

            <!-- STEP 2 · Rules & approval -->
            <section v-show="step === 2" class="pc-pane">
              <div class="pc-toggles">
                <label class="pc-toggle">
                  <input type="checkbox" v-model="form.requires_attachment" />
                  <span class="t-knob"><span class="t-dot" /></span>
                  <span>Document attachment required</span>
                </label>
                <label class="pc-toggle">
                  <input type="checkbox" v-model="form.count_holidays_weekoffs" />
                  <span class="t-knob"><span class="t-dot" /></span>
                  <span>Count holidays &amp; week-offs within range</span>
                </label>
                <label class="pc-toggle">
                  <input type="checkbox" v-model="form.encashment_allowed" />
                  <span class="t-knob"><span class="t-dot" /></span>
                  <span>Encashment allowed</span>
                </label>
                <label class="pc-toggle">
                  <input type="checkbox" v-model="form.is_active" />
                  <span class="t-knob"><span class="t-dot" /></span>
                  <span>Activate immediately (employees can book this type)</span>
                </label>
              </div>

              <!-- Approval chain -->
              <section class="pc-chain">
                <header class="pc-chain-head">
                  <div>
                    <h4>Approval chain</h4>
                    <p>Each stage gates the request before the next. Default is a two-tier <b>Manager → HR</b> flow.</p>
                  </div>
                  <button v-if="usingDefault" class="leave-btn leave-btn-xs leave-btn-primary" type="button" @click="customizeChain">
                    <Settings2 :size="11" /> Customize
                  </button>
                  <button v-else class="leave-btn leave-btn-xs" type="button" @click="resetChainToDefault">
                    <RotateCcw :size="11" /> Reset to default
                  </button>
                </header>

                <div v-if="usingDefault" class="pc-chain-default">
                  <span class="pc-chain-tag" data-type="MANAGER">1 · Manager</span>
                  <ChevronRight :size="12" class="pc-chain-arrow" />
                  <span class="pc-chain-tag" data-type="HR">2 · HR</span>
                </div>

                <ol v-else class="pc-chain-list">
                  <li v-for="(stage, i) in form.approval_chain" :key="i" class="pc-chain-row" :data-type="stage.approver_type">
                    <span class="pc-chain-num">{{ i + 1 }}</span>
                    <div class="pc-chain-fields">
                      <select v-model="stage.approver_type" class="pc-mini-input" @change="onTypeChange(stage)">
                        <option v-for="t in APPROVER_TYPES" :key="t.key" :value="t.key">{{ t.label }}</option>
                      </select>
                      <input v-model="stage.label" type="text" placeholder="Stage label" maxlength="60" class="pc-mini-input" />
                      <div v-if="stage.approver_type === 'USER'" class="pc-user-wrap">
                        <input type="text"
                          :value="stage._userQuery ?? ''"
                          @input="onUserInput(stage, $event)"
                          @focus="onUserFocus(stage)"
                          placeholder="Search by name or email…" class="pc-mini-input" />
                        <div v-if="stage._showPicker && (stage._candidates?.length || stage._loadingPicker)" class="pc-user-pop">
                          <div v-if="stage._loadingPicker" class="pc-user-empty">Searching…</div>
                          <button v-for="u in (stage._candidates || [])" :key="u.id" type="button"
                            class="pc-user-row" @click="pickUser(stage, u)">
                            <span class="pc-user-name">{{ u.full_name || u.email || u.id }}</span>
                            <span v-if="u.email" class="pc-user-email">{{ u.email }}</span>
                          </button>
                          <div v-if="!stage._loadingPicker && !(stage._candidates || []).length" class="pc-user-empty">No matches</div>
                        </div>
                      </div>
                    </div>
                    <div class="pc-chain-actions">
                      <button type="button" class="pc-mini-btn" :disabled="i === 0" @click="moveStage(i, -1)"><ArrowUp :size="11" /></button>
                      <button type="button" class="pc-mini-btn" :disabled="i === form.approval_chain.length - 1" @click="moveStage(i, 1)"><ArrowDown :size="11" /></button>
                      <button type="button" class="pc-mini-btn danger" :disabled="form.approval_chain.length <= 1" @click="removeStage(i)"><Trash2 :size="11" /></button>
                    </div>
                  </li>
                </ol>
                <button v-if="!usingDefault && form.approval_chain.length < 8" type="button" class="leave-btn leave-btn-xs pc-chain-add" @click="addStage">
                  <Plus :size="11" /> Add stage
                </button>
                <p v-if="chainError" class="pc-err">{{ chainError }}</p>
              </section>
            </section>
          </div>

          <!-- ── Foot ── -->
          <footer v-if="creatableTypes.length" class="pc-foot">
            <button v-if="step > 0" class="leave-btn leave-btn-sm" @click="step--">
              <ArrowLeft :size="13" /> Back
            </button>
            <span class="pc-foot-spacer" />
            <button class="leave-btn leave-btn-sm" @click="close">Cancel</button>
            <button v-if="step < STEPS.length - 1" class="leave-btn leave-btn-sm leave-btn-primary"
              :disabled="!canAdvance" @click="next">
              Next <ArrowRight :size="13" />
            </button>
            <button v-else class="leave-btn leave-btn-sm leave-btn-primary" :disabled="saving || !form.leave_type" @click="create">
              <Sparkles :size="13" /> {{ saving ? 'Creating…' : 'Create policy' }}
            </button>
          </footer>
        </Motion>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  X, Check, Settings2, RotateCcw, Plus, Trash2, ArrowUp, ArrowDown,
  ArrowLeft, ArrowRight, ChevronRight, Sparkles, LayoutGrid, ShieldCheck,
} from 'lucide-vue-next'
import LeaveTypeIcon from '../components/LeaveTypeIcon.vue'
import {
  createLeavePolicy, APPROVER_TYPES, DEFAULT_APPROVAL_CHAIN, fetchApproverCandidates,
  LEAVE_TYPE_BY_KEY, LEAVE_TYPES,
} from '@/composables/useLeaves'
import { useToast } from 'vue-toastification'

const props = defineProps({
  open: { type: Boolean, default: false },
  creatableTypes: { type: Array, default: () => [] },
})
const emit = defineEmits(['cancel', 'created'])
const toast = useToast()

const TOTAL_TYPES = LEAVE_TYPES.length
const STEPS = [
  { key: 'identity', label: 'Type & identity' },
  { key: 'quota', label: 'Quota & limits' },
  { key: 'rules', label: 'Rules & approval' },
]
// Warm-only accents (mirror LeavePoliciesSection.TYPE_HEX).
const TYPE_HEX = {
  CASUAL: '#fde047', SICK: '#e34a0a', EARNED: '#f59e0b', MATERNITY: '#fdba74',
  PATERNITY: '#b45309', BEREAVEMENT: '#854d0e', COMP_OFF: '#f97316', LWP: '#ea580c',
  STUDY: '#ca8a04', SPECIAL: '#fb923c',
}

const step = ref(0)
const saving = ref(false)
const chainError = ref('')
const userCache = ref({})

const blankForm = () => ({
  leave_type: null,
  label: '',
  description: '',
  color_hex: '#fbbf24',
  annual_quota: 0,
  monthly_accrual: 0,
  max_carry_forward: 0,
  max_consecutive_days: null,
  requires_notice_days: 0,
  advance_book_days: null,
  requires_attachment: false,
  count_holidays_weekoffs: true,
  encashment_allowed: false,
  is_active: true,
  approval_chain: null,
})
const form = ref(blankForm())

const creatableMeta = computed(() =>
  props.creatableTypes.map(k => ({
    key: k,
    label: LEAVE_TYPE_BY_KEY[k]?.label || k,
    hex: TYPE_HEX[k] || '#fbbf24',
  })),
)
const defaultLabel = computed(() =>
  form.value.leave_type ? (LEAVE_TYPE_BY_KEY[form.value.leave_type]?.label || '') : '')

// Reset whenever the modal opens.
watch(() => props.open, (o) => {
  if (!o) return
  step.value = 0
  chainError.value = ''
  form.value = blankForm()
  // Pre-select if exactly one type is creatable.
  if (props.creatableTypes.length === 1) pickType(props.creatableTypes[0])
})

const pluralD = (n) => Number(n) === 1 ? 'day' : 'days'

const pickType = (k) => {
  form.value.leave_type = k
  if (TYPE_HEX[k]) form.value.color_hex = TYPE_HEX[k]
}

const canAdvance = computed(() => {
  if (step.value === 0) return !!form.value.leave_type
  return true
})
const next = () => { if (canAdvance.value && step.value < STEPS.length - 1) step.value++ }

// ── Approval chain (mirrors LeavePolicyEditModal) ──
const usingDefault = computed(() => form.value.approval_chain == null)
const customizeChain = () => {
  form.value.approval_chain = DEFAULT_APPROVAL_CHAIN().map(s => ({
    ...s, _userQuery: null, _candidates: [], _showPicker: false, _loadingPicker: false,
  }))
}
const resetChainToDefault = () => { form.value.approval_chain = null; chainError.value = '' }
const addStage = () => {
  form.value.approval_chain.push({
    approver_type: 'USER', approver_user_id: null, label: 'Additional approver',
    _userQuery: null, _candidates: [], _showPicker: false, _loadingPicker: false,
  })
}
const removeStage = (i) => {
  form.value.approval_chain.splice(i, 1)
  if (form.value.approval_chain.length === 0) form.value.approval_chain = null
}
const moveStage = (i, dir) => {
  const n = i + dir
  if (n < 0 || n >= form.value.approval_chain.length) return
  const [m] = form.value.approval_chain.splice(i, 1)
  form.value.approval_chain.splice(n, 0, m)
}
const onTypeChange = (stage) => {
  if (stage.approver_type !== 'USER') {
    stage.approver_user_id = null
    stage._userQuery = null
    stage._showPicker = false
  }
}
let pickerSeq = 0
const onUserInput = async (stage, ev) => {
  stage._userQuery = ev.target.value
  stage._showPicker = true
  stage._loadingPicker = true
  const seq = ++pickerSeq
  try {
    const { items } = await fetchApproverCandidates(ev.target.value, 15)
    if (seq !== pickerSeq) return
    for (const u of items) userCache.value[u.id] = u
    stage._candidates = items
  } catch { stage._candidates = [] } finally { stage._loadingPicker = false }
}
const onUserFocus = async (stage) => {
  stage._showPicker = true
  if (!stage._candidates || !stage._candidates.length) {
    stage._loadingPicker = true
    try {
      const { items } = await fetchApproverCandidates('', 15)
      for (const u of items) userCache.value[u.id] = u
      stage._candidates = items
    } finally { stage._loadingPicker = false }
  }
}
const pickUser = (stage, u) => {
  stage.approver_user_id = u.id
  userCache.value[u.id] = u
  stage._userQuery = u.full_name || u.email || u.id
  stage._showPicker = false
}
const validateChain = () => {
  chainError.value = ''
  if (form.value.approval_chain == null) return true
  if (!form.value.approval_chain.length) { chainError.value = 'Add a stage or reset to default'; return false }
  for (let i = 0; i < form.value.approval_chain.length; i++) {
    const s = form.value.approval_chain[i]
    if (!s.label || !s.label.trim()) { chainError.value = `Stage ${i + 1} needs a label`; return false }
    if (s.approver_type === 'USER' && !s.approver_user_id) {
      chainError.value = `Stage ${i + 1}: pick a named user or change the approver type`
      return false
    }
  }
  return true
}

const close = () => { if (!saving.value) emit('cancel') }

const create = async () => {
  if (!form.value.leave_type) { step.value = 0; return }
  if (!validateChain()) { step.value = 2; return }
  saving.value = true
  try {
    const payload = { ...form.value }
    payload.label = payload.label?.trim() || null
    payload.description = payload.description?.trim() || null
    payload.max_consecutive_days = payload.max_consecutive_days || null
    payload.advance_book_days = payload.advance_book_days || null
    if (Array.isArray(payload.approval_chain)) {
      payload.approval_chain = payload.approval_chain.map(s => ({
        approver_type: s.approver_type,
        approver_user_id: s.approver_user_id || null,
        label: s.label,
      }))
    }
    const created = await createLeavePolicy(payload)
    toast.success(`${created.label || created.leave_type} policy created`)
    emit('created', created)
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to create policy')
  } finally { saving.value = false }
}
</script>

<style scoped>
@import '@/styles/leave-theme.css';

.pc-scrim {
  position: fixed; inset: 0; z-index: 1200;
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(60% 60% at 50% 40%, rgba(251, 191, 36, 0.25), rgba(6, 10, 8, 0.55));
  backdrop-filter: blur(10px); padding: 20px;
}
.pc-card {
  position: relative; overflow: hidden auto; isolation: isolate;
  width: 600px; max-width: calc(100vw - 32px); max-height: calc(100vh - 40px);
  border-radius: 22px;
  background:
    radial-gradient(120% 70% at 100% 0%, rgba(251, 191, 36, 0.12), transparent 55%),
    linear-gradient(180deg, rgba(20, 16, 16, 0.97), rgba(14, 12, 12, 0.97));
  border: 1px solid rgba(251, 191, 36, 0.30);
  box-shadow: 0 50px 110px -40px rgba(0,0,0,0.85);
}
[data-theme="light"] .pc-card {
  background:
    radial-gradient(120% 70% at 100% 0%, rgba(251, 191, 36, 0.16), transparent 55%),
    rgba(255, 250, 240, 0.97);
  border-color: rgba(180, 83, 9, 0.24);
}
.pc-paper {
  position: absolute; inset: 0; z-index: -1; pointer-events: none; opacity: 0.5;
  background-image:
    linear-gradient(to right, var(--leave-grid-line) 1px, transparent 1px),
    linear-gradient(to bottom, var(--leave-grid-line) 1px, transparent 1px);
  background-size: 26px 26px;
  mask-image: radial-gradient(120% 90% at 100% 0%, #000 30%, transparent 85%);
  -webkit-mask-image: radial-gradient(120% 90% at 100% 0%, #000 30%, transparent 85%);
}
.pc-beam {
  position: absolute; top: 0; bottom: 0; left: 0; width: 140px; z-index: -1; pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(251,191,36,0.12) 50%, transparent);
  filter: blur(2px); animation: pc-scan 7s ease-in-out infinite;
}
@keyframes pc-scan { 0%{transform:translateX(-160px);opacity:0;} 20%{opacity:1;} 80%{opacity:1;} 100%{transform:translateX(620px);opacity:0;} }

.pc-head { position: relative; display: flex; align-items: center; gap: 12px; padding: 20px 20px 12px; }
.pc-head-ic {
  display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
  background: color-mix(in srgb, var(--leave-brand) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--leave-brand) 36%, transparent); color: var(--leave-brand);
}
.pc-head-titles { flex: 1; min-width: 0; }
.pc-eye { font-size: 8.5px; font-weight: 800; letter-spacing: 0.14em; color: var(--leave-text-muted); }
.pc-title { margin: 2px 0 0; font-size: 17px; font-weight: 800; letter-spacing: -0.012em; color: var(--hr-text); }
.pc-close {
  position: absolute; top: 14px; right: 14px; display: grid; place-items: center;
  width: 26px; height: 26px; border-radius: 8px; border: 1px solid var(--hr-border);
  background: transparent; color: var(--hr-text-muted); cursor: pointer; transition: transform .25s, color .2s;
}
.pc-close:hover { transform: rotate(90deg); color: var(--leave-rejected); border-color: var(--leave-rejected); }

/* steps */
.pc-steps { display: flex; align-items: center; gap: 0; padding: 4px 22px 14px; }
.pc-step { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
.pc-step-dot {
  display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0;
  font-size: 11px; font-weight: 800; font-variant-numeric: tabular-nums;
  background: rgba(255,255,255,0.05); border: 1px solid var(--hr-border); color: var(--hr-text-muted);
  transition: all .25s;
}
[data-theme="light"] .pc-step-dot { background: rgba(120,53,15,0.08); }
.pc-step.active .pc-step-dot { background: color-mix(in srgb, var(--leave-brand) 22%, transparent); border-color: var(--leave-brand); color: var(--leave-brand); box-shadow: 0 0 12px -2px color-mix(in srgb, var(--leave-brand) 60%, transparent); }
.pc-step.done .pc-step-dot { background: color-mix(in srgb, var(--leave-approved) 24%, transparent); border-color: var(--leave-approved); color: var(--leave-approved); }
.pc-step-label { font-size: 11px; font-weight: 700; color: var(--hr-text-muted); white-space: nowrap; }
.pc-step.active .pc-step-label { color: var(--hr-text); }
.pc-step-line { flex: 1; height: 1.5px; min-width: 14px; background: var(--hr-border); margin: 0 4px; }
.pc-step.done .pc-step-line { background: color-mix(in srgb, var(--leave-approved) 50%, transparent); }
@media (max-width: 560px) { .pc-step-label { display: none; } }

/* empty state */
.pc-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 26px 30px 34px; }
.pc-empty-ic {
  display: grid; place-items: center; width: 64px; height: 64px; border-radius: 18px;
  background: color-mix(in srgb, var(--leave-approved) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--leave-approved) 32%, transparent); color: var(--leave-approved);
}
.pc-empty h4 { margin: 6px 0 0; font-size: 15px; font-weight: 800; color: var(--hr-text); }
.pc-empty p { margin: 0; max-width: 42ch; font-size: 12.5px; line-height: 1.6; color: var(--hr-text-muted); }

/* body */
.pc-body { padding: 2px 22px 8px; }
.pc-pane { display: flex; flex-direction: column; gap: 12px; }
.pc-flabel { font-size: 9.5px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--hr-text-muted); }
.req { color: var(--leave-rejected); }

.pc-type-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
.pc-type {
  position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 7px;
  padding: 12px; border-radius: 13px; cursor: pointer; text-align: left;
  background: rgba(255,255,255,0.03); border: 1px solid var(--hr-border); color: var(--hr-text);
  transition: border-color .2s, background .2s, transform .15s;
}
[data-theme="light"] .pc-type { background: rgba(255,250,240,0.7); border-color: rgba(180,83,9,0.16); }
.pc-type:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--tc) 55%, transparent); }
.pc-type.on { border-color: var(--tc); background: color-mix(in srgb, var(--tc) 14%, transparent); box-shadow: 0 8px 22px -12px color-mix(in srgb, var(--tc) 70%, transparent); }
.pc-type-name { font-size: 12.5px; font-weight: 700; }
.pc-type-check { position: absolute; top: 9px; right: 9px; color: var(--tc); }

.pc-row { display: grid; gap: 10px; }
.pc-row.two { grid-template-columns: 1fr 1fr; }
.pc-row.three { grid-template-columns: repeat(3, 1fr); }
@media (max-width: 560px) { .pc-row.two, .pc-row.three { grid-template-columns: 1fr 1fr; } }

.pc-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.pc-field > span { font-size: 9.5px; font-weight: 800; letter-spacing: 0.13em; text-transform: uppercase; color: var(--hr-text-muted); }
.pc-field input, .pc-field textarea, .pc-mini-input, .pc-color-hex {
  padding: 8px 10px; border-radius: 9px;
  background: rgba(251, 191, 36, 0.05); border: 1px solid rgba(251, 191, 36, 0.22);
  color: var(--hr-text); font: inherit; font-size: 13px; outline: none;
  transition: border-color .2s, box-shadow .2s;
}
.pc-field textarea { resize: vertical; }
[data-theme="light"] .pc-field input, [data-theme="light"] .pc-field textarea,
[data-theme="light"] .pc-mini-input, [data-theme="light"] .pc-color-hex {
  background: rgba(255, 250, 240, 0.88); border-color: rgba(180, 83, 9, 0.20);
}
.pc-field input:focus, .pc-field textarea:focus, .pc-mini-input:focus, .pc-color-hex:focus {
  border-color: var(--leave-approved); box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.12);
}
.pc-color { display: flex; gap: 6px; align-items: center; }
.pc-color-swatch { width: 38px; height: 36px; padding: 2px; border-radius: 9px; border: 1px solid var(--hr-border); background: transparent; cursor: pointer; }
.pc-color-hex { flex: 1; min-width: 0; font-variant-numeric: tabular-nums; }

.pc-toggles { display: flex; flex-direction: column; gap: 6px; }
.pc-toggle {
  display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: 9px;
  background: rgba(255,255,255,0.03); border: 1px solid var(--hr-border);
  font-size: 12px; color: var(--hr-text); cursor: pointer; transition: border-color .2s;
}
[data-theme="light"] .pc-toggle { background: rgba(255,250,240,0.65); border-color: rgba(180,83,9,0.16); }
.pc-toggle:hover { border-color: var(--leave-approved); }
.pc-toggle input { display: none; }
.t-knob { position: relative; width: 30px; height: 16px; border-radius: 999px; background: rgba(255,255,255,0.08); border: 1px solid var(--hr-border); flex-shrink: 0; transition: background .2s, border-color .2s; }
.t-dot { position: absolute; top: 2px; left: 2px; width: 10px; height: 10px; border-radius: 50%; background: var(--hr-text-muted); transition: transform .2s, background .2s; }
.pc-toggle input:checked + .t-knob { background: color-mix(in srgb, var(--leave-approved) 28%, transparent); border-color: var(--leave-approved); }
.pc-toggle input:checked + .t-knob .t-dot { background: var(--leave-approved); transform: translateX(14px); box-shadow: 0 0 8px var(--leave-approved); }

.pc-preview { padding: 12px 14px; border-radius: 12px; background: rgba(251,191,36,0.08); border: 1px solid color-mix(in srgb, var(--leave-approved) 28%, transparent); }
.pc-preview > .leave-mono { font-size: 9px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: var(--leave-approved); }
.pc-preview p { margin: 6px 0 0; font-size: 12px; line-height: 1.55; color: var(--hr-text-secondary); }
.pc-preview b { color: var(--hr-text); font-weight: 800; }

/* chain (compact mirror of edit modal) */
.pc-chain { display: flex; flex-direction: column; gap: 10px; padding: 12px 14px; border-radius: 12px; background: rgba(245,158,11,0.06); border: 1px solid rgba(245,158,11,0.22); }
.pc-chain-head { display: flex; align-items: flex-start; gap: 10px; }
.pc-chain-head > div { flex: 1; min-width: 0; }
.pc-chain-head h4 { margin: 0; font-size: 12.5px; font-weight: 800; color: var(--hr-text); }
.pc-chain-head p { margin: 3px 0 0; font-size: 11px; line-height: 1.5; color: var(--hr-text-muted); }
.pc-chain-head p b { color: var(--hr-text); }
.pc-chain-default { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 6px 2px 0; }
.pc-chain-arrow { color: var(--hr-text-muted); opacity: 0.7; }
.pc-chain-tag { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 999px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; border: 1px solid rgba(251,191,36,0.36); background: rgba(251,191,36,0.10); }
.pc-chain-tag[data-type="MANAGER"] { color: #fbbf24; }
.pc-chain-tag[data-type="HR"] { color: var(--leave-approved); }
.pc-chain-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.pc-chain-row { display: grid; grid-template-columns: 22px 1fr auto; gap: 8px; align-items: center; padding: 8px 10px; border-radius: 10px; background: rgba(255,255,255,0.025); border: 1px solid var(--hr-border); }
[data-theme="light"] .pc-chain-row { background: rgba(255,250,240,0.65); border-color: rgba(180,83,9,0.16); }
.pc-chain-row[data-type="MANAGER"] { border-left: 3px solid #fbbf24; }
.pc-chain-row[data-type="HR"] { border-left: 3px solid var(--leave-approved); }
.pc-chain-row[data-type="USER"] { border-left: 3px solid #b45309; }
.pc-chain-num { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; background: rgba(255,255,255,0.06); color: var(--hr-text); font-weight: 800; font-size: 11px; }
[data-theme="light"] .pc-chain-num { background: rgba(120,53,15,0.10); }
.pc-chain-fields { display: grid; grid-template-columns: 150px 1fr; gap: 6px; min-width: 0; }
.pc-chain-fields .pc-user-wrap { grid-column: 1 / -1; position: relative; }
.pc-mini-input { width: 100%; min-width: 0; font-size: 12px; padding: 7px 9px; }
.pc-user-pop { position: absolute; left: 0; right: 0; top: calc(100% + 4px); z-index: 1300; max-height: 200px; overflow-y: auto; background: rgba(20,16,16,0.97); border: 1px solid var(--hr-border); border-radius: 9px; box-shadow: 0 20px 40px -20px rgba(0,0,0,0.7); }
[data-theme="light"] .pc-user-pop { background: rgba(255,250,240,0.98); border-color: rgba(180,83,9,0.22); }
.pc-user-row { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; padding: 7px 10px; width: 100%; text-align: left; background: transparent; border: 0; border-bottom: 1px solid var(--hr-border); cursor: pointer; color: var(--hr-text); font-size: 12px; transition: background .15s; }
.pc-user-row:last-child { border-bottom: 0; }
.pc-user-row:hover { background: rgba(251,191,36,0.10); }
.pc-user-name { font-weight: 700; }
.pc-user-email { font-size: 10.5px; color: var(--hr-text-muted); }
.pc-user-empty { padding: 9px 10px; font-size: 11px; font-style: italic; color: var(--hr-text-muted); }
.pc-chain-actions { display: flex; gap: 4px; }
.pc-mini-btn { width: 24px; height: 24px; display: grid; place-items: center; border-radius: 6px; background: rgba(255,255,255,0.05); border: 1px solid var(--hr-border); color: var(--hr-text-muted); cursor: pointer; transition: color .2s, border-color .2s; }
[data-theme="light"] .pc-mini-btn { background: rgba(255,250,240,0.85); border-color: rgba(180,83,9,0.18); }
.pc-mini-btn:hover:not(:disabled) { color: var(--leave-approved); border-color: var(--leave-approved); }
.pc-mini-btn.danger:hover:not(:disabled) { color: var(--leave-rejected); border-color: var(--leave-rejected); }
.pc-mini-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.pc-chain-add { align-self: flex-start; }
.pc-err { margin: 4px 0 0; padding: 6px 10px; border-radius: 7px; font-size: 11.5px; font-weight: 600; background: var(--leave-rejected-soft); color: var(--leave-rejected); border: 1px solid color-mix(in srgb, var(--leave-rejected) 25%, transparent); }

/* foot */
.pc-foot { display: flex; align-items: center; gap: 8px; padding: 14px 22px 20px; border-top: 1px solid rgba(251,191,36,0.14); margin-top: 8px; }
.pc-foot-spacer { flex: 1; }

.leave-btn-xs { font-size: 10.5px; padding: 5px 9px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; }

.pc-enter-active, .pc-leave-active { transition: opacity .25s; }
.pc-enter-from, .pc-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) { .pc-beam { animation: none !important; } }
</style>
