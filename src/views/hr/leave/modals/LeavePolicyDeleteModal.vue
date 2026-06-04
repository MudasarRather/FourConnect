<template>
  <Teleport to="body">
    <transition name="pd">
      <div v-if="open && policy" class="pd-scrim" @click.self="close">
        <Motion class="pd-card" as="div" role="dialog"
          :initial="{ opacity: 0, y: 18, scale: 0.96 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }"
        >
          <span class="pd-aura" aria-hidden="true" />

          <!-- ── Head ── -->
          <header class="pd-head">
            <div class="pd-head-ic"><AlertTriangle :size="18" /></div>
            <div class="pd-head-titles">
              <span class="leave-mono pd-eye">GOVERNANCE / DECOMMISSION</span>
              <h3 class="pd-title">Delete {{ policy.label || typeLabel }} policy</h3>
            </div>
            <button class="pd-close" @click="close"><X :size="14" /></button>
          </header>

          <div class="pd-body">
            <!-- ── Impact report ── -->
            <section class="pd-impact" :class="{ inuse: usage && usage.in_use, danger: hasActive }">
              <header class="pd-impact-head">
                <span class="leave-mono">IMPACT ON EMPLOYEES</span>
                <span v-if="usageLoading" class="pd-impact-load"><Loader2 :size="12" class="spin" /> Checking…</span>
                <span v-else-if="usage && usage.in_use" class="pd-impact-flag">
                  <Users :size="12" /> In use
                </span>
                <span v-else-if="usage" class="pd-impact-flag ok"><Check :size="12" /> Not in use</span>
              </header>

              <div v-if="usageLoading" class="pd-metrics">
                <div v-for="i in 4" :key="i" class="leave-skel pd-metric-skel" />
              </div>

              <template v-else-if="usage">
                <div class="pd-metrics">
                  <div class="pd-metric" :data-warn="usage.employee_count > 0">
                    <span class="pd-metric-val leave-mono">{{ usage.employee_count }}</span>
                    <span class="pd-metric-lbl">Employees with a balance</span>
                  </div>
                  <div class="pd-metric" :data-warn="usage.nonzero_balance_count > 0">
                    <span class="pd-metric-val leave-mono">{{ usage.nonzero_balance_count }}</span>
                    <span class="pd-metric-lbl">Holding days &gt; 0</span>
                  </div>
                  <div class="pd-metric" :data-warn="usage.active_requests > 0">
                    <span class="pd-metric-val leave-mono">{{ usage.active_requests }}</span>
                    <span class="pd-metric-lbl">Active requests</span>
                  </div>
                  <div class="pd-metric">
                    <span class="pd-metric-val leave-mono">{{ usage.total_requests }}</span>
                    <span class="pd-metric-lbl">Requests all-time</span>
                  </div>
                </div>

                <p v-if="usage.in_use" class="pd-verdict">
                  <strong>This policy is implemented for employees.</strong>
                  <template v-if="usage.upcoming_approved > 0">
                    {{ usage.upcoming_approved }} approved leave(s) are still upcoming.
                  </template>
                  Deleting is a <b>soft-delete</b> — existing balances and the leave ledger are
                  preserved, but the type is removed from the booking wizard, quota spectrum and
                  future accruals. Employees can no longer apply for it.
                </p>
                <p v-else class="pd-verdict ok">
                  No employee currently relies on this policy. It's safe to remove — it will be
                  hidden from the booking wizard and quota spectrum.
                </p>
              </template>

              <p v-else-if="usageError" class="pd-verdict warn">{{ usageError }}</p>
            </section>

            <!-- ── Reason ── -->
            <div class="pd-field">
              <label class="pd-flabel">Reason category</label>
              <div class="pd-cats">
                <button v-for="c in REASONS" :key="c" type="button"
                  class="pd-cat" :class="{ on: reasonCategory === c }"
                  @click="reasonCategory = c">{{ c }}</button>
              </div>
            </div>

            <label class="pd-field">
              <span class="pd-flabel">Reason <span class="req">*</span> <em class="pd-hint">(recorded in the audit log)</em></span>
              <textarea v-model="reason" rows="2" maxlength="2000"
                placeholder="Why is this leave type being decommissioned?" />
              <span class="pd-counter" :class="{ short: reason.trim().length < 6 }">{{ reason.trim().length }} / min 6</span>
            </label>

            <!-- ── Typed confirmation when in use ── -->
            <label v-if="usage && usage.in_use" class="pd-field">
              <span class="pd-flabel">Type <code>{{ policy.leave_type }}</code> to confirm <span class="req">*</span></span>
              <input v-model="confirmText" type="text" :placeholder="policy.leave_type"
                class="pd-confirm-input" autocomplete="off" />
            </label>
          </div>

          <!-- ── Foot ── -->
          <footer class="pd-foot">
            <button class="leave-btn leave-btn-sm" @click="close" :disabled="deleting">Cancel</button>
            <button class="leave-btn leave-btn-sm pd-del-btn" :disabled="!canDelete || deleting" @click="confirmDelete">
              <Trash2 :size="13" /> {{ deleting ? 'Deleting…' : 'Delete policy' }}
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
import { X, AlertTriangle, Trash2, Users, Check, Loader2 } from 'lucide-vue-next'
import {
  fetchLeavePolicyUsage, deleteLeavePolicy, LEAVE_TYPE_BY_KEY,
} from '@/composables/useLeaves'
import { useToast } from 'vue-toastification'

const props = defineProps({
  open: { type: Boolean, default: false },
  policy: { type: Object, default: null },
})
const emit = defineEmits(['cancel', 'deleted'])
const toast = useToast()

const REASONS = ['Duplicate', 'Policy change', 'No longer offered', 'Replaced', 'Other']

const usage = ref(null)
const usageLoading = ref(false)
const usageError = ref('')
const reason = ref('')
const reasonCategory = ref('Policy change')
const confirmText = ref('')
const deleting = ref(false)

const typeLabel = computed(() =>
  props.policy ? (LEAVE_TYPE_BY_KEY[props.policy.leave_type]?.label || props.policy.leave_type) : '')
const hasActive = computed(() => usage.value && usage.value.active_requests > 0)

const confirmed = computed(() => {
  if (!usage.value || !usage.value.in_use) return true
  return confirmText.value.trim().toUpperCase() === String(props.policy?.leave_type || '').toUpperCase()
})
const canDelete = computed(() =>
  !usageLoading.value && reason.value.trim().length >= 6 && confirmed.value)

const loadUsage = async () => {
  if (!props.policy) return
  usageLoading.value = true; usageError.value = ''; usage.value = null
  try {
    usage.value = await fetchLeavePolicyUsage(props.policy.leave_type)
  } catch (e) {
    usageError.value = e?.response?.data?.detail || 'Could not load impact — proceed with caution.'
  } finally { usageLoading.value = false }
}

watch(() => props.open, (o) => {
  if (!o) return
  reason.value = ''
  reasonCategory.value = 'Policy change'
  confirmText.value = ''
  loadUsage()
})

const close = () => { if (!deleting.value) emit('cancel') }

const confirmDelete = async () => {
  if (!canDelete.value || !props.policy) return
  deleting.value = true
  try {
    const res = await deleteLeavePolicy(props.policy.leave_type, {
      reason: reason.value.trim(),
      reason_category: reasonCategory.value,
      acknowledge_impact: true,
    })
    toast.success(`${props.policy.label || props.policy.leave_type} policy deleted`)
    emit('deleted', res)
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to delete policy')
  } finally { deleting.value = false }
}
</script>

<style scoped>
@import '@/styles/leave-theme.css';

.pd-scrim {
  position: fixed; inset: 0; z-index: 1200;
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(60% 60% at 50% 40%, rgba(220, 38, 38, 0.22), rgba(6, 10, 8, 0.6));
  backdrop-filter: blur(10px); padding: 20px;
}
.pd-card {
  position: relative; overflow: hidden auto; isolation: isolate;
  width: 540px; max-width: calc(100vw - 32px); max-height: calc(100vh - 40px);
  border-radius: 22px;
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(239, 68, 68, 0.12), transparent 55%),
    linear-gradient(180deg, rgba(22, 15, 15, 0.97), rgba(14, 11, 11, 0.97));
  border: 1px solid rgba(239, 68, 68, 0.30);
  box-shadow: 0 50px 110px -40px rgba(0,0,0,0.85);
}
[data-theme="light"] .pd-card {
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(239, 68, 68, 0.10), transparent 55%),
    rgba(255, 250, 240, 0.97);
  border-color: rgba(185, 28, 28, 0.26);
}
.pd-aura {
  position: absolute; inset: -50% 30% auto -20%; width: 60%; height: 130%; z-index: -1; pointer-events: none;
  background: radial-gradient(50% 50% at 50% 50%, rgba(239, 68, 68, 0.18), transparent 70%);
  filter: blur(40px);
}

.pd-head { position: relative; display: flex; align-items: center; gap: 12px; padding: 20px 20px 12px; }
.pd-head-ic {
  display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
  background: rgba(239, 68, 68, 0.14); border: 1px solid rgba(239, 68, 68, 0.36); color: #f87171;
}
.pd-head-titles { flex: 1; min-width: 0; }
.pd-eye { font-size: 8.5px; font-weight: 800; letter-spacing: 0.14em; color: var(--leave-rejected); }
.pd-title { margin: 2px 0 0; font-size: 16.5px; font-weight: 800; letter-spacing: -0.012em; color: var(--hr-text); }
.pd-close {
  position: absolute; top: 14px; right: 14px; display: grid; place-items: center;
  width: 26px; height: 26px; border-radius: 8px; border: 1px solid var(--hr-border);
  background: transparent; color: var(--hr-text-muted); cursor: pointer; transition: transform .25s, color .2s;
}
.pd-close:hover { transform: rotate(90deg); color: var(--leave-rejected); border-color: var(--leave-rejected); }

.pd-body { display: flex; flex-direction: column; gap: 13px; padding: 4px 20px 14px; }

/* impact */
.pd-impact { padding: 13px 14px; border-radius: 14px; background: rgba(255,255,255,0.03); border: 1px solid var(--hr-border); }
[data-theme="light"] .pd-impact { background: rgba(255,250,240,0.6); border-color: rgba(180,83,9,0.14); }
.pd-impact.inuse { background: rgba(245, 158, 11, 0.07); border-color: rgba(245, 158, 11, 0.30); }
.pd-impact.danger { background: rgba(239, 68, 68, 0.07); border-color: rgba(239, 68, 68, 0.30); }
.pd-impact-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.pd-impact-head .leave-mono { font-size: 9px; font-weight: 800; letter-spacing: 0.16em; color: var(--hr-text-muted); }
.pd-impact-load { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--hr-text-muted); }
.pd-impact-flag { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 800; letter-spacing: 0.04em; padding: 3px 9px; border-radius: 999px; background: rgba(245,158,11,0.16); color: #f59e0b; border: 1px solid rgba(245,158,11,0.34); }
.pd-impact-flag.ok { background: color-mix(in srgb, var(--leave-approved) 16%, transparent); color: var(--leave-approved); border-color: color-mix(in srgb, var(--leave-approved) 36%, transparent); }

.pd-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
@media (max-width: 520px) { .pd-metrics { grid-template-columns: repeat(2, 1fr); } }
.pd-metric { display: flex; flex-direction: column; gap: 3px; padding: 9px 10px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid var(--hr-border); }
[data-theme="light"] .pd-metric { background: rgba(255,255,255,0.55); }
.pd-metric[data-warn="true"] { border-color: rgba(245,158,11,0.4); background: rgba(245,158,11,0.08); }
.pd-metric-val { font-size: 21px; font-weight: 800; line-height: 1; letter-spacing: -0.02em; color: var(--hr-text); font-variant-numeric: tabular-nums; }
.pd-metric[data-warn="true"] .pd-metric-val { color: #f59e0b; }
.pd-metric-lbl { font-size: 9px; font-weight: 700; letter-spacing: 0.02em; color: var(--hr-text-muted); line-height: 1.3; }
.pd-metric-skel { height: 56px; border-radius: 10px; }

.pd-verdict { margin: 11px 0 0; font-size: 12px; line-height: 1.6; color: var(--hr-text-secondary); }
.pd-verdict strong { color: #f59e0b; }
.pd-verdict b { color: var(--hr-text); font-weight: 800; }
.pd-verdict.ok { color: var(--hr-text-secondary); }
.pd-verdict.ok strong { color: var(--leave-approved); }
.pd-verdict.warn { color: var(--leave-rejected); }

/* fields */
.pd-field { display: flex; flex-direction: column; gap: 5px; position: relative; }
.pd-flabel { font-size: 9.5px; font-weight: 800; letter-spacing: 0.13em; text-transform: uppercase; color: var(--hr-text-muted); }
.pd-hint { font-style: normal; text-transform: none; letter-spacing: 0; font-weight: 600; color: var(--hr-text-muted); opacity: 0.8; }
.req { color: var(--leave-rejected); }
.pd-flabel code { font-family: monospace; background: rgba(239,68,68,0.14); color: #f87171; padding: 1px 6px; border-radius: 5px; letter-spacing: 0; }

.pd-cats { display: flex; flex-wrap: wrap; gap: 6px; }
.pd-cat { padding: 5px 11px; border-radius: 999px; font-size: 11px; font-weight: 700; cursor: pointer; background: transparent; border: 1px solid var(--hr-border); color: var(--hr-text-secondary); transition: all .18s; }
.pd-cat:hover { border-color: var(--leave-rejected); color: var(--hr-text); }
.pd-cat.on { background: rgba(239,68,68,0.14); border-color: rgba(239,68,68,0.5); color: #f87171; }

.pd-field textarea, .pd-confirm-input {
  padding: 9px 11px; border-radius: 9px;
  background: rgba(255,255,255,0.04); border: 1px solid var(--hr-border);
  color: var(--hr-text); font: inherit; font-size: 13px; outline: none; resize: vertical;
  transition: border-color .2s, box-shadow .2s;
}
[data-theme="light"] .pd-field textarea, [data-theme="light"] .pd-confirm-input { background: rgba(255,250,240,0.88); border-color: rgba(180,83,9,0.2); }
.pd-field textarea:focus, .pd-confirm-input:focus { border-color: var(--leave-rejected); box-shadow: 0 0 0 3px rgba(239,68,68,0.12); }
.pd-confirm-input { font-variant-numeric: tabular-nums; letter-spacing: 0.05em; font-weight: 700; }
.pd-counter { align-self: flex-end; font-size: 9.5px; font-weight: 700; color: var(--hr-text-muted); font-variant-numeric: tabular-nums; }
.pd-counter.short { color: var(--leave-rejected); }

.pd-foot { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px 18px; border-top: 1px solid rgba(239,68,68,0.14); }
.pd-del-btn { background: linear-gradient(135deg, #ef4444, #b91c1c); border: 1px solid rgba(239,68,68,0.5); color: #fff; }
.pd-del-btn:hover:not(:disabled) { box-shadow: 0 10px 26px -12px rgba(239,68,68,0.7); transform: translateY(-1px); }
.pd-del-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.spin { animation: pd-spin 0.9s linear infinite; }
@keyframes pd-spin { to { transform: rotate(360deg); } }
.pd-enter-active, .pd-leave-active { transition: opacity .25s; }
.pd-enter-from, .pd-leave-to { opacity: 0; }
</style>
