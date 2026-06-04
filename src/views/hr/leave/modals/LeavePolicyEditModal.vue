<template>
  <Teleport to="body">
    <transition name="pe">
      <div v-if="open && p" class="pe-scrim" @click.self="$emit('cancel')">
        <Motion class="pe-card" as="div" role="dialog"
          :initial="{ opacity: 0, y: 16, scale: 0.97 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.42 }"
        >
          <header class="pe-head">
            <LeaveTypeIcon :type="p.leave_type" :size="18" ambient />
            <div>
              <h3 class="pe-title">{{ p.label || p.leave_type }}</h3>
              <p class="pe-sub">Edit quota, accrual, carry-forward and approval constraints.</p>
            </div>
            <button class="pe-close" @click="$emit('cancel')"><X :size="14" /></button>
          </header>

          <div class="pe-body">
            <div class="pe-row">
              <label class="pe-field">
                <span>Annual quota (days)</span>
                <input v-model.number="form.annual_quota" type="number" min="0" step="0.5" />
              </label>
              <label class="pe-field">
                <span>Monthly accrual</span>
                <input v-model.number="form.monthly_accrual" type="number" min="0" step="0.5" />
              </label>
              <label class="pe-field">
                <span>Max carry-forward</span>
                <input v-model.number="form.max_carry_forward" type="number" min="0" step="0.5" />
              </label>
            </div>

            <div class="pe-row">
              <label class="pe-field">
                <span>Max consecutive (days)</span>
                <input v-model.number="form.max_consecutive_days" type="number" min="0" placeholder="No limit" />
              </label>
              <label class="pe-field">
                <span>Notice required (days)</span>
                <input v-model.number="form.requires_notice_days" type="number" min="0" />
              </label>
              <label class="pe-field">
                <span>Advance booking (days)</span>
                <input v-model.number="form.advance_book_days" type="number" min="0" placeholder="No limit" />
              </label>
            </div>

            <div class="pe-toggles">
              <label class="pe-toggle">
                <input type="checkbox" v-model="form.requires_attachment" />
                <span class="t-knob"><span class="t-dot" /></span>
                <span>Document attachment required</span>
              </label>
              <label class="pe-toggle">
                <input type="checkbox" v-model="form.count_holidays_weekoffs" />
                <span class="t-knob"><span class="t-dot" /></span>
                <span>Count holidays & week-offs within range</span>
              </label>
              <label class="pe-toggle">
                <input type="checkbox" v-model="form.encashment_allowed" />
                <span class="t-knob"><span class="t-dot" /></span>
                <span>Encashment allowed (Phase 2)</span>
              </label>
              <label class="pe-toggle">
                <input type="checkbox" v-model="form.is_active" />
                <span class="t-knob"><span class="t-dot" /></span>
                <span>Policy is active</span>
              </label>
            </div>

            <div class="pe-preview">
              <span class="leave-mono">Preview</span>
              <p>
                <b>{{ form.annual_quota || 0 }}</b> {{ pluralD(form.annual_quota) }} per year
                <span v-if="form.monthly_accrual"> · <b>{{ form.monthly_accrual }}</b> {{ pluralD(form.monthly_accrual) }} accrued monthly</span>
                <span v-if="form.max_carry_forward"> · up to <b>{{ form.max_carry_forward }}</b> {{ pluralD(form.max_carry_forward) }} carried over</span>.
                <br />
                <span v-if="form.requires_notice_days">Notice required: {{ form.requires_notice_days }} {{ pluralD(form.requires_notice_days) }}. </span>
                <span v-if="form.max_consecutive_days">Max {{ form.max_consecutive_days }} consecutive {{ pluralD(form.max_consecutive_days) }}. </span>
                <span v-if="form.requires_attachment">Attachment is mandatory. </span>
                <span v-if="!form.count_holidays_weekoffs">Holidays & weekends don't count against balance.</span>
              </p>
            </div>

            <!-- ═══ Phase 4 — Approval chain editor ═══ -->
            <section class="pe-chain">
              <header class="pe-chain-head">
                <div>
                  <h4>Approval chain</h4>
                  <p>Each stage gates the leave request before the next. Leave on the default for a two-tier <b>Manager → HR</b> flow.</p>
                </div>
                <button v-if="usingDefault" class="leave-btn leave-btn-xs leave-btn-primary" type="button" @click="customizeChain">
                  <Settings2 :size="11" /> Customize
                </button>
                <button v-else class="leave-btn leave-btn-xs" type="button" @click="resetChainToDefault">
                  <RotateCcw :size="11" /> Reset to default
                </button>
              </header>

              <div v-if="usingDefault" class="pe-chain-default">
                <span class="pe-chain-tag" data-type="MANAGER">1 · Manager</span>
                <ChevronRight :size="12" class="pe-chain-arrow" />
                <span class="pe-chain-tag" data-type="HR">2 · HR</span>
              </div>

              <ol v-else class="pe-chain-list">
                <li v-for="(stage, i) in form.approval_chain" :key="i" class="pe-chain-row" :data-type="stage.approver_type">
                  <span class="pe-chain-num">{{ i + 1 }}</span>
                  <div class="pe-chain-fields">
                    <select v-model="stage.approver_type" class="pe-mini-input" @change="onTypeChange(stage)">
                      <option v-for="t in APPROVER_TYPES" :key="t.key" :value="t.key">{{ t.label }}</option>
                    </select>
                    <input v-model="stage.label" type="text" placeholder="Stage label" maxlength="60" class="pe-mini-input" />
                    <div v-if="stage.approver_type === 'USER'" class="pe-user-wrap">
                      <input
                        type="text"
                        :value="stage._userQuery ?? userLabelFor(stage.approver_user_id)"
                        @input="onUserInput(stage, $event)"
                        @focus="onUserFocus(stage)"
                        placeholder="Search by name or email…"
                        class="pe-mini-input"
                      />
                      <div v-if="stage._showPicker && (stage._candidates?.length || stage._loadingPicker)" class="pe-user-pop">
                        <div v-if="stage._loadingPicker" class="pe-user-empty">Searching…</div>
                        <button v-for="u in (stage._candidates || [])" :key="u.id" type="button"
                          class="pe-user-row" @click="pickUser(stage, u)">
                          <span class="pe-user-name">{{ u.full_name || u.email || u.id }}</span>
                          <span v-if="u.email" class="pe-user-email">{{ u.email }}</span>
                          <span v-if="u.is_superuser" class="pe-user-badge">SUPER</span>
                        </button>
                        <div v-if="!stage._loadingPicker && !(stage._candidates || []).length" class="pe-user-empty">No matches</div>
                      </div>
                    </div>
                  </div>
                  <div class="pe-chain-actions">
                    <button type="button" class="pe-mini-btn" :disabled="i === 0" @click="moveStage(i, -1)" title="Move up"><ArrowUp :size="11" /></button>
                    <button type="button" class="pe-mini-btn" :disabled="i === form.approval_chain.length - 1" @click="moveStage(i, 1)" title="Move down"><ArrowDown :size="11" /></button>
                    <button type="button" class="pe-mini-btn danger" :disabled="form.approval_chain.length <= 1" @click="removeStage(i)" title="Remove"><Trash2 :size="11" /></button>
                  </div>
                </li>
              </ol>
              <button v-if="!usingDefault && form.approval_chain.length < 8" type="button" class="leave-btn leave-btn-xs pe-chain-add" @click="addStage">
                <Plus :size="11" /> Add stage
              </button>
              <p v-if="chainError" class="pe-chain-err">{{ chainError }}</p>
            </section>
          </div>

          <footer class="pe-foot">
            <button class="leave-btn leave-btn-sm" @click="$emit('cancel')">Cancel</button>
            <button class="leave-btn leave-btn-sm leave-btn-primary" :disabled="saving" @click="save">
              <Save :size="13" /> Save policy
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
  X, Save, Settings2, RotateCcw, Plus, Trash2,
  ArrowUp, ArrowDown, ChevronRight,
} from 'lucide-vue-next'
import LeaveTypeIcon from '../components/LeaveTypeIcon.vue'
import {
  updateLeavePolicy, APPROVER_TYPES, DEFAULT_APPROVAL_CHAIN, fetchApproverCandidates,
} from '@/composables/useLeaves'
import { useToast } from 'vue-toastification'

const props = defineProps({
  open: { type: Boolean, default: false },
  policy: { type: Object, default: null },
})
const emit = defineEmits(['cancel', 'saved'])
const toast = useToast()

const p = ref(null)
const form = ref({})
const saving = ref(false)
const chainError = ref('')

// Cache of resolved user records by id — populates the inline "user picked"
// label so we don't show bare UUIDs after a save.
const userCache = ref({})

watch(() => [props.open, props.policy], () => {
  if (!props.open || !props.policy) return
  p.value = props.policy
  // The backend treats null approval_chain as the default. Mirror that here.
  const chainIn = Array.isArray(props.policy.approval_chain) && props.policy.approval_chain.length
    ? props.policy.approval_chain.map((s, i) => ({
        approver_type: s.approver_type,
        approver_user_id: s.approver_user_id || null,
        label: s.label,
        _userQuery: null,
        _candidates: [],
        _showPicker: false,
        _loadingPicker: false,
      }))
    : null
  form.value = {
    annual_quota: Number(props.policy.annual_quota) || 0,
    monthly_accrual: Number(props.policy.monthly_accrual) || 0,
    max_carry_forward: Number(props.policy.max_carry_forward) || 0,
    max_consecutive_days: props.policy.max_consecutive_days ?? null,
    requires_notice_days: Number(props.policy.requires_notice_days) || 0,
    advance_book_days: props.policy.advance_book_days ?? null,
    requires_attachment: !!props.policy.requires_attachment,
    count_holidays_weekoffs: !!props.policy.count_holidays_weekoffs,
    encashment_allowed: !!props.policy.encashment_allowed,
    is_active: props.policy.is_active !== false,
    approval_chain: chainIn,
  }
  chainError.value = ''
}, { immediate: true })

const pluralD = (n) => Number(n) === 1 ? 'day' : 'days'

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
  const next = i + dir
  if (next < 0 || next >= form.value.approval_chain.length) return
  const [moved] = form.value.approval_chain.splice(i, 1)
  form.value.approval_chain.splice(next, 0, moved)
}
const onTypeChange = (stage) => {
  // Clear named user when switching away from USER. Keep label as-is so
  // admins don't lose their custom wording.
  if (stage.approver_type !== 'USER') {
    stage.approver_user_id = null
    stage._userQuery = null
    stage._showPicker = false
  }
}

const userLabelFor = (id) => {
  if (!id) return ''
  const u = userCache.value[id]
  if (u) return u.full_name || u.email || id
  return id
}

let pickerSeq = 0
const onUserInput = async (stage, ev) => {
  const q = ev.target.value
  stage._userQuery = q
  stage._showPicker = true
  stage._loadingPicker = true
  const seq = ++pickerSeq
  try {
    const { items } = await fetchApproverCandidates(q, 15)
    if (seq !== pickerSeq) return  // stale response
    for (const u of items) userCache.value[u.id] = u
    stage._candidates = items
  } catch (e) {
    stage._candidates = []
  } finally {
    stage._loadingPicker = false
  }
}
const onUserFocus = async (stage) => {
  stage._showPicker = true
  if (!stage._candidates || stage._candidates.length === 0) {
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
  if (form.value.approval_chain.length === 0) {
    chainError.value = 'Add at least one stage or reset to the default'
    return false
  }
  for (let i = 0; i < form.value.approval_chain.length; i++) {
    const s = form.value.approval_chain[i]
    if (!s.label || !s.label.trim()) {
      chainError.value = `Stage ${i + 1} needs a label`
      return false
    }
    if (s.approver_type === 'USER' && !s.approver_user_id) {
      chainError.value = `Stage ${i + 1}: pick a named user or change the approver type`
      return false
    }
  }
  return true
}

const save = async () => {
  if (!validateChain()) return
  saving.value = true
  try {
    // Strip the transient UI-only fields before sending.
    const payload = { ...form.value }
    if (Array.isArray(payload.approval_chain)) {
      payload.approval_chain = payload.approval_chain.map(s => ({
        approver_type: s.approver_type,
        approver_user_id: s.approver_user_id || null,
        label: s.label,
      }))
    }
    await updateLeavePolicy(p.value.leave_type, payload)
    toast.success(`${p.value.label || p.value.leave_type} policy saved`)
    emit('saved')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to save')
  } finally { saving.value = false }
}
</script>

<style scoped>
.pe-scrim {
  position: fixed; inset: 0; z-index: 1200;
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(60% 60% at 50% 40%, rgba(251, 191, 36, 0.25), rgba(6, 10, 8, 0.55));
  backdrop-filter: blur(10px);
  padding: 20px;
}
.pe-card {
  width: 560px; max-width: calc(100vw - 32px); max-height: calc(100vh - 40px);
  border-radius: 20px;
  background:
    radial-gradient(120% 70% at 100% 0%, rgba(251, 191, 36, 0.12), transparent 55%),
    linear-gradient(180deg, rgba(20, 16, 16, 0.96), rgba(14, 12, 12, 0.96));
  border: 1px solid rgba(251, 191, 36, 0.30);
  overflow: hidden auto;
  box-shadow: 0 50px 110px -40px rgba(0,0,0,0.85);
}
[data-theme="light"] .pe-card {
  background:
    radial-gradient(120% 70% at 100% 0%, rgba(251, 191, 36, 0.14), transparent 55%),
    rgba(255, 250, 240, 0.96);
}

.pe-head {
  position: relative;
  display: flex; align-items: center; gap: 12px;
  padding: 20px 20px 14px;
}
.pe-title { margin: 0; font-size: 17px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.012em; }
.pe-sub { margin: 4px 0 0; font-size: 11.5px; color: var(--hr-text-muted); }
.pe-close {
  position: absolute; top: 12px; right: 12px;
  display: grid; place-items: center; width: 26px; height: 26px;
  border-radius: 8px; border: 1px solid var(--hr-border); background: transparent;
  color: var(--hr-text-muted); cursor: pointer; transition: transform .25s;
}
.pe-close:hover { transform: rotate(90deg); color: var(--leave-approved); border-color: var(--leave-approved); }

.pe-body { display: flex; flex-direction: column; gap: 12px; padding: 4px 20px 16px; }

.pe-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
@media (max-width: 640px) { .pe-row { grid-template-columns: 1fr 1fr; } }
.pe-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.pe-field > span { font-size: 9.5px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--hr-text-muted); }
.pe-field > input {
  padding: 8px 10px; border-radius: 9px;
  background: rgba(251, 191, 36, 0.05);
  border: 1px solid rgba(251, 191, 36, 0.22);
  color: var(--hr-text); font: inherit; font-size: 13px; font-variant-numeric: tabular-nums;
  outline: none; transition: border-color .22s, box-shadow .22s, background .22s;
}
[data-theme="light"] .pe-field > input { background: rgba(255, 250, 240, 0.85); border-color: rgba(180, 83, 9, 0.20); }
.pe-field > input:focus { border-color: var(--leave-approved); box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.12); }

.pe-toggles { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
.pe-toggle {
  display: flex; align-items: center; gap: 10px;
  padding: 6px 10px; border-radius: 9px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--hr-border);
  font-size: 12px; color: var(--hr-text); cursor: pointer;
  transition: border-color .22s, background .22s;
}
[data-theme="light"] .pe-toggle { background: rgba(255, 250, 240, 0.65); border-color: rgba(180, 83, 9, 0.16); }
.pe-toggle:hover { border-color: var(--leave-approved); }
.pe-toggle input { display: none; }
.t-knob {
  position: relative; width: 30px; height: 16px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.08); border: 1px solid var(--hr-border);
  transition: background .22s, border-color .22s;
}
.t-dot { position: absolute; top: 2px; left: 2px; width: 10px; height: 10px; border-radius: 50%; background: var(--hr-text-muted); transition: transform .22s, background .22s; }
.pe-toggle input:checked + .t-knob { background: color-mix(in srgb, var(--leave-approved) 28%, transparent); border-color: var(--leave-approved); }
.pe-toggle input:checked + .t-knob .t-dot { background: var(--leave-approved); transform: translateX(14px); box-shadow: 0 0 8px var(--leave-approved); }

.pe-preview {
  padding: 12px 14px; border-radius: 12px;
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid color-mix(in srgb, var(--leave-approved) 28%, transparent);
}
.pe-preview > .leave-mono {
  font-size: 9px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--leave-approved);
}
.pe-preview p { margin: 6px 0 0; font-size: 12px; line-height: 1.55; color: var(--hr-text-secondary); }
.pe-preview b { color: var(--hr-text); font-weight: 800; }

.pe-foot {
  display: flex; gap: 8px; justify-content: flex-end;
  padding: 12px 20px 18px;
  border-top: 1px solid rgba(251, 191, 36, 0.14);
}

.pe-enter-active, .pe-leave-active { transition: opacity .25s; }
.pe-enter-from, .pe-leave-to { opacity: 0; }

/* ── Phase 4 — Approval chain editor ─────────────────────────────── */
.pe-chain {
  display: flex; flex-direction: column; gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(245, 158, 11, 0.06);
  border: 1px solid rgba(245, 158, 11, 0.22);
}
[data-theme="light"] .pe-chain {
  background: rgba(245, 158, 11, 0.07);
  border-color: rgba(2, 132, 199, 0.22);
}
.pe-chain-head { display: flex; align-items: flex-start; gap: 10px; }
.pe-chain-head > div { flex: 1; min-width: 0; }
.pe-chain-head h4 {
  margin: 0; font-size: 12.5px; font-weight: 800;
  color: var(--hr-text); letter-spacing: -0.01em;
}
.pe-chain-head p {
  margin: 3px 0 0; font-size: 11px; line-height: 1.5;
  color: var(--hr-text-muted);
}
.pe-chain-head p b { color: var(--hr-text); font-weight: 700; }

.pe-chain-default {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  padding: 8px 4px 2px;
}
.pe-chain-arrow { color: var(--hr-text-muted); opacity: 0.7; }
.pe-chain-tag {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: 999px;
  font-size: 10.5px; font-weight: 800; letter-spacing: 0.07em;
  border: 1px solid rgba(245, 158, 11, 0.32);
  background: rgba(245, 158, 11, 0.10);
  color: #f59e0b;
}
.pe-chain-tag[data-type="MANAGER"] { border-color: rgba(251, 191, 36, 0.36); background: rgba(251, 191, 36, 0.10); color: #fbbf24; }
.pe-chain-tag[data-type="HR"]      { border-color: rgba(251, 191, 36, 0.36); background: rgba(251, 191, 36, 0.10); color: var(--leave-approved); }
.pe-chain-tag[data-type="USER"]    { border-color: rgba(180, 83, 9, 0.36); background: rgba(180, 83, 9, 0.10); color: #b45309; }

.pe-chain-list {
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-direction: column; gap: 8px;
}
.pe-chain-row {
  display: grid; grid-template-columns: 22px 1fr auto; gap: 8px; align-items: center;
  padding: 8px 10px; border-radius: 10px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid var(--hr-border);
}
[data-theme="light"] .pe-chain-row {
  background: rgba(255, 250, 240, 0.65);
  border-color: rgba(180, 83, 9, 0.16);
}
.pe-chain-row[data-type="MANAGER"] { border-left: 3px solid #fbbf24; }
.pe-chain-row[data-type="HR"]      { border-left: 3px solid var(--leave-approved); }
.pe-chain-row[data-type="USER"]    { border-left: 3px solid #b45309; }

.pe-chain-num {
  width: 22px; height: 22px; border-radius: 50%;
  display: grid; place-items: center;
  background: rgba(255, 255, 255, 0.06);
  color: var(--hr-text); font-weight: 800; font-size: 11px;
  font-variant-numeric: tabular-nums;
}
[data-theme="light"] .pe-chain-num { background: rgba(120, 53, 15, 0.10); }

.pe-chain-fields { display: grid; grid-template-columns: 150px 1fr; gap: 6px; min-width: 0; }
.pe-chain-fields .pe-user-wrap { grid-column: 1 / -1; position: relative; }

.pe-mini-input {
  width: 100%; min-width: 0;
  padding: 7px 9px; border-radius: 7px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--hr-border);
  color: var(--hr-text); font: inherit; font-size: 12px;
  outline: none; transition: border-color .22s, box-shadow .22s;
}
[data-theme="light"] .pe-mini-input {
  background: rgba(255, 250, 240, 0.92);
  border-color: rgba(180, 83, 9, 0.18);
}
.pe-mini-input:focus { border-color: var(--leave-approved); box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.10); }

.pe-user-pop {
  position: absolute; left: 0; right: 0; top: calc(100% + 4px);
  z-index: 1300;
  max-height: 220px; overflow-y: auto;
  background: rgba(20, 16, 16, 0.96);
  border: 1px solid var(--hr-border);
  border-radius: 9px;
  box-shadow: 0 20px 40px -20px rgba(0, 0, 0, 0.7);
}
[data-theme="light"] .pe-user-pop {
  background: rgba(255, 250, 240, 0.98);
  border-color: rgba(180, 83, 9, 0.22);
}
.pe-user-row {
  display: flex; flex-direction: column; align-items: flex-start; gap: 1px;
  padding: 7px 10px; width: 100%; text-align: left;
  background: transparent; border: 0; cursor: pointer;
  color: var(--hr-text); font-size: 12px;
  border-bottom: 1px solid var(--hr-border);
  transition: background .18s;
  position: relative;
}
.pe-user-row:last-child { border-bottom: 0; }
.pe-user-row:hover { background: rgba(251, 191, 36, 0.10); }
.pe-user-name { font-weight: 700; }
.pe-user-email { font-size: 10.5px; color: var(--hr-text-muted); }
.pe-user-badge {
  position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
  font-size: 8.5px; font-weight: 800; letter-spacing: 0.08em;
  padding: 2px 5px; border-radius: 4px;
  background: rgba(180, 83, 9, 0.18); color: #b45309;
  border: 1px solid rgba(180, 83, 9, 0.32);
}
.pe-user-empty {
  padding: 9px 10px; font-size: 11px; font-style: italic;
  color: var(--hr-text-muted);
}

.pe-chain-actions { display: flex; gap: 4px; }
.pe-mini-btn {
  width: 24px; height: 24px; display: grid; place-items: center;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--hr-border);
  color: var(--hr-text-muted); cursor: pointer;
  transition: color .2s, background .2s, border-color .2s;
}
[data-theme="light"] .pe-mini-btn { background: rgba(255, 250, 240, 0.85); border-color: rgba(180, 83, 9, 0.18); }
.pe-mini-btn:hover:not(:disabled) { color: var(--leave-approved); border-color: var(--leave-approved); }
.pe-mini-btn.danger:hover:not(:disabled) { color: var(--leave-rejected); border-color: var(--leave-rejected); }
.pe-mini-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.pe-chain-add { align-self: flex-start; }
.pe-chain-err {
  margin: 4px 0 0; padding: 6px 10px;
  border-radius: 7px; font-size: 11.5px; font-weight: 600;
  background: var(--leave-rejected-soft); color: var(--leave-rejected);
  border: 1px solid color-mix(in srgb, var(--leave-rejected) 25%, transparent);
}

.leave-btn-xs {
  font-size: 10.5px;
  padding: 5px 9px;
  border-radius: 6px;
  display: inline-flex; align-items: center; gap: 4px;
}
</style>
