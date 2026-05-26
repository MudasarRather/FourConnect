<template>
  <section class="onb-app">
    <Motion as="header" class="onb-section-banner app-banner"
      :initial="{ opacity: 0, y: -10 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }"
    >
      <span class="onb-section-banner-glow" />
      <div class="onb-section-banner-text">
        <span class="onb-eyebrow"><span class="onb-eyebrow-dot" /> Pre-docs sign-off gate</span>
        <h2 class="onb-banner-title">
          <span class="id-title-word">Joining</span>
          <span class="banner-divider">·</span>
          <span class="id-title-word" style="animation-delay: 80ms">Approvals</span>
        </h2>
        <p class="onb-banner-sub">Optional pre-docs gate. Configure approvers per joiner; everyone has to sign-off before docs are collected.</p>
      </div>
      <div class="onb-banner-aside">
        <button class="onb-btn-primary" :disabled="!processId" @click="showAdd = true">
          <Plus :size="13" /> Add approver
        </button>
      </div>
    </Motion>

    <OnbProcessPicker v-model="processId" @change="reload" />

    <div v-if="!processId" class="onb-empty-card">
      <div class="onb-empty-mark"><ShieldCheck :size="22" /></div>
      <p>Pick a joiner to view the approval queue.</p>
    </div>

    <template v-else>
      <!-- Approval pipeline — ultra-modern timeline -->
      <Motion
        v-if="approvals.length"
        class="app-pipe"
        :initial="{ opacity: 0 }"
        :animate="{ opacity: 1 }"
        :transition="{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }"
      >
        <!-- Pipe summary -->
        <div class="app-pipe-summary">
          <div class="aps-stat">
            <span class="aps-stat-num">{{ approvedCount }}</span>
            <span class="aps-stat-label">Approved</span>
          </div>
          <div class="aps-stat-divider" />
          <div class="aps-stat">
            <span class="aps-stat-num">{{ pendingCount }}</span>
            <span class="aps-stat-label">Pending</span>
          </div>
          <div class="aps-stat-divider" />
          <div class="aps-stat">
            <span class="aps-stat-num">{{ rejectedCount }}</span>
            <span class="aps-stat-label">Rejected</span>
          </div>
          <div class="aps-progress">
            <div class="aps-progress-track">
              <div class="aps-progress-fill" :style="{ width: `${pipeProgress}%` }"></div>
            </div>
            <span class="aps-progress-text">{{ pipeProgress }}% complete</span>
          </div>
        </div>

        <!-- Timeline rail -->
        <div class="app-rail">
          <div class="app-rail-line" aria-hidden="true">
            <div class="app-rail-line-fill" :style="{ height: `${pipeProgress}%` }" />
          </div>

          <Motion v-for="(a, i) in approvals" :key="a.id"
            as="article" class="app-node" :data-status="a.status"
            :initial="{ opacity: 0, x: 16 }"
            :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.42, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] }"
            :whileHover="{ x: 2 }"
          >
            <!-- Pulse + status mark -->
            <div class="app-node-side">
              <Motion
                class="app-node-mark" :data-status="a.status"
                :initial="{ scale: 0.5, rotate: -18 }"
                :animate="{ scale: 1, rotate: 0 }"
                :transition="{ duration: 0.5, delay: 0.08 * i + 0.06, ease: [0.34, 1.56, 0.64, 1] }"
              >
                <CheckCircle2 v-if="a.status === 'APPROVED'" :size="18" />
                <XCircle      v-else-if="a.status === 'REJECTED'" :size="18" />
                <CircleSlash  v-else-if="a.status === 'WAIVED'" :size="18" />
                <Clock        v-else :size="18" />
                <span class="app-node-pulse" v-if="a.status === 'PENDING'" aria-hidden="true" />
              </Motion>
              <span class="app-node-step">Step {{ i + 1 }}</span>
            </div>

            <!-- Body -->
            <div class="app-node-card">
              <div class="app-node-header">
                <div class="app-node-role-block">
                  <div class="app-node-role">{{ a.approver_role.replace('_', ' ') }}</div>
                  <div class="app-node-name">{{ a.approver_name || 'Unassigned approver' }}</div>
                </div>
                <div class="app-node-header-tools">
                  <span class="app-node-status-pill" :data-status="a.status">
                    <span class="app-node-status-dot" />
                    {{ statusLabel(a.status) }}
                  </span>
                  <button
                    class="node-del"
                    type="button"
                    title="Remove approver"
                    @click="openRemoveApprover(a)"
                  >
                    <Trash2 :size="13" />
                  </button>
                </div>
              </div>

              <div v-if="a.decision_at || a.decision_notes" class="app-node-decision">
                <div class="app-node-decision-icon">
                  <component :is="a.status === 'APPROVED' ? CheckCircle2 : a.status === 'REJECTED' ? XCircle : CircleSlash" :size="12" />
                </div>
                <div class="app-node-decision-body">
                  <div v-if="a.decision_at" class="app-node-decision-time">
                    <Calendar :size="10" /> {{ formatDate(a.decision_at) }}
                  </div>
                  <div v-if="a.decision_notes" class="app-node-decision-notes">"{{ a.decision_notes }}"</div>
                </div>
              </div>

              <div v-if="a.status === 'PENDING'" class="app-node-actions">
                <Motion
                  as="button"
                  type="button"
                  class="app-node-btn is-approve"
                  :whileHover="{ y: -1 }"
                  :whileTap="{ scale: 0.97 }"
                  @click="decide(a, 'APPROVED')"
                >
                  <CheckCircle2 :size="13" /> Approve
                </Motion>
                <Motion
                  as="button"
                  type="button"
                  class="app-node-btn is-reject"
                  :whileHover="{ y: -1 }"
                  :whileTap="{ scale: 0.97 }"
                  @click="decide(a, 'REJECTED')"
                >
                  <XCircle :size="13" /> Reject
                </Motion>
              </div>
            </div>
          </Motion>
        </div>
      </Motion>

      <div v-else class="app-empty-inline">
        No approvers configured yet. Click <strong>Add approver</strong> above to start.
      </div>
    </template>

    <!-- Delete approver modal -->
    <OnbDeleteModal
      :open="!!pendingDelete"
      title="Remove approver?"
      :subtitle="pendingDelete ? `Permanently remove ${pendingDelete.approver_role.replace('_', ' ')} from this joiner's approval gate.` : ''"
      :target-label="pendingDelete?.approver_name || pendingDelete?.approver_role.replace('_', ' ')"
      :target-meta="pendingDelete ? `${pendingDelete.approver_role.replace('_', ' ')} approver` : ''"
      :target-tag="pendingDelete?.status"
      :target-icon="ShieldCheck"
      :presets="APPROVER_PRESETS"
      warning="The approver will be removed from this joiner's sign-off chain. They will not be notified."
      confirm-label="Remove approver"
      submitting-label="Removing…"
      :submitting="removingApprover"
      @close="pendingDelete = null"
      @confirm="confirmRemoveApprover"
    />

    <!-- Add approver dialog -->
    <OnbModal :open="showAdd" title="Add approver" subtitle="Add a sign-off role to this joiner's gate" :icon="ShieldCheck" :width="460" @close="showAdd = false">
      <div class="form-grid">
        <OnbField
          v-model="newRole"
          label="Role"
          type="select"
          full
          :options="ROLES.map(r => ({ value: r, label: r.replace('_', ' ') }))"
        />
        <OnbField
          v-model="newNotes"
          label="Notes (optional)"
          placeholder="Why this approver is needed"
          full
        />
      </div>
      <template #footer>
        <button class="onb-btn-ghost" @click="showAdd = false">Cancel</button>
        <button class="onb-btn-primary" @click="add"><Plus :size="13" />Add approver</button>
      </template>
    </OnbModal>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Plus, ShieldCheck, CheckCircle2, XCircle, CircleSlash, Clock, Calendar, Trash2 } from 'lucide-vue-next'
import OnbProcessPicker from '../components/OnbProcessPicker.vue'
import OnbModal from '../components/OnbModal.vue'
import OnbDeleteModal from '../components/OnbDeleteModal.vue'
import OnbField from '../components/OnbField.vue'
import { fetchApprovals, createApproval, decideApproval, deleteApproval } from '../composables/useOnbChecklist'
import { useToast } from 'vue-toastification'

defineEmits(['refresh-stats'])

const toast = useToast()
const ROLES = ['HR_HEAD','DEPT_HEAD','FINANCE','IT','SECURITY','OTHER']

const processId = ref('')
const approvals = ref([])
const showAdd = ref(false)
const newRole = ref('HR_HEAD')
const newNotes = ref('')

const reload = async () => {
  if (!processId.value) return
  try { approvals.value = await fetchApprovals(processId.value) }
  catch (e) { toast.error(e?.response?.data?.detail || 'Could not load approvals') }
}

const add = async () => {
  try {
    await createApproval({ process_id: processId.value, approver_role: newRole.value })
    showAdd.value = false
    newRole.value = 'HR_HEAD'
    newNotes.value = ''
    await reload()
    toast.success('Approver added')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Add failed') }
}

const decide = async (a, decision) => {
  try {
    const notes = decision === 'REJECTED' ? window.prompt('Reason for rejection (optional):') || '' : ''
    await decideApproval(a.id, { decision, notes })
    await reload()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Decision failed') }
}
// Delete-approver modal flow
const APPROVER_PRESETS = [
  'Approver no longer with the company',
  'Wrong approver role assigned',
  'Approval gate redesigned for this joiner',
  'Duplicate approver entry',
]
const pendingDelete = ref(null)
const removingApprover = ref(false)
const openRemoveApprover = (a) => { pendingDelete.value = a }
const confirmRemoveApprover = async (reason) => {
  if (!pendingDelete.value) return
  removingApprover.value = true
  try {
    await deleteApproval(pendingDelete.value.id)
    // Reason is captured client-side for audit; the backend delete endpoint
    // accepts no payload, so the reason is logged via toast for visibility.
    pendingDelete.value = null
    await reload()
    toast.success(reason ? `Approver removed — ${reason.split('\n')[0]}` : 'Approver removed')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not remove approver')
  } finally {
    removingApprover.value = false
  }
}

// Pipeline stats
const approvedCount = computed(() => approvals.value.filter(a => a.status === 'APPROVED').length)
const rejectedCount = computed(() => approvals.value.filter(a => a.status === 'REJECTED').length)
const pendingCount  = computed(() => approvals.value.filter(a => a.status === 'PENDING').length)
const pipeProgress = computed(() => {
  if (!approvals.value.length) return 0
  const decided = approvals.value.filter(a => a.status !== 'PENDING').length
  return Math.round((decided / approvals.value.length) * 100)
})

const statusLabel = (s) => {
  if (s === 'APPROVED') return 'Approved'
  if (s === 'REJECTED') return 'Rejected'
  if (s === 'WAIVED')   return 'Waived'
  return 'Awaiting'
}

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''
</script>

<style scoped>
@import '../../../../styles/onboarding-theme.css';

.onb-app { display: flex; flex-direction: column; gap: 16px; }

.app-banner .banner-divider {
  display: inline-block; margin: 0 6px;
  color: var(--hr-text-dim); font-weight: 400;
  -webkit-text-fill-color: var(--hr-text-dim);
}

.app-empty-inline {
  padding: 30px; text-align: center;
  border: 1px dashed rgba(251, 191, 36, 0.25); border-radius: 16px;
  background: rgba(20, 22, 28, 0.28);
  backdrop-filter: blur(16px);
  font-size: 12.5px; color: var(--hr-text-muted);
}
.app-empty-inline strong { color: var(--hr-accent-gold); }

/* ════════════════════════════════════════════════════════════════════
   APPROVAL PIPELINE — Ultra-modern timeline redesign
   ════════════════════════════════════════════════════════════════════ */
.app-pipe { display: flex; flex-direction: column; gap: 18px; }

/* ── Top summary strip ── */
.app-pipe-summary {
  display: flex; align-items: center; gap: 18px;
  padding: 14px 18px;
  border-radius: 16px;
  background:
    linear-gradient(135deg, rgba(251, 191, 36, 0.10), rgba(251, 146, 60, 0.04)),
    rgba(20, 16, 12, 0.40);
  border: 1px solid rgba(251, 191, 36, 0.18);
  backdrop-filter: blur(18px);
}
.aps-stat { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
.aps-stat-num {
  font-size: 22px; font-weight: 800; letter-spacing: -0.02em;
  color: var(--hr-text); font-variant-numeric: tabular-nums; line-height: 1;
}
.aps-stat-label {
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.8px;
  text-transform: uppercase; color: var(--hr-text-muted);
}
.aps-stat-divider {
  width: 1px; height: 28px;
  background: linear-gradient(180deg, transparent, rgba(251, 191, 36, 0.22), transparent);
}
.aps-progress {
  margin-left: auto;
  display: flex; flex-direction: column; align-items: flex-end; gap: 6px;
  min-width: 200px;
}
.aps-progress-track {
  width: 220px; height: 6px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 999px; overflow: hidden;
  box-shadow: inset 0 1px 0 rgba(0, 0, 0, 0.2);
}
.aps-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #fde68a, #fbbf24, #fb923c);
  border-radius: 999px;
  box-shadow: 0 0 12px rgba(251, 146, 60, 0.55);
  transition: width 0.9s var(--hr-ease-quint);
}
.aps-progress-text {
  font-size: 10px; font-weight: 700; letter-spacing: 0.6px;
  text-transform: uppercase; color: var(--hr-accent-gold);
}

/* ── Timeline rail ── */
.app-rail {
  position: relative;
  display: flex; flex-direction: column; gap: 14px;
  padding: 4px 0 4px 14px;
}
.app-rail-line {
  position: absolute;
  left: 39px; top: 32px; bottom: 32px; width: 2px;
  background: rgba(251, 191, 36, 0.18);
  border-radius: 999px;
}
.app-rail-line-fill {
  position: absolute; top: 0; left: 0; right: 0;
  background: linear-gradient(180deg, #fde68a, #fbbf24 50%, #fb923c);
  border-radius: 999px;
  box-shadow: 0 0 10px rgba(251, 146, 60, 0.50);
  transition: height 0.9s var(--hr-ease-quint);
}

/* ── Node ── */
.app-node {
  position: relative;
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 18px;
  align-items: stretch;
}
.app-node-side {
  position: relative; z-index: 1;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding-top: 14px;
}
.app-node-mark {
  position: relative;
  width: 50px; height: 50px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--hr-accent-gold-soft);
  color: var(--hr-accent-gold);
  border: 2px solid rgba(251, 191, 36, 0.40);
  box-shadow:
    0 8px 22px -10px rgba(251, 146, 60, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.10);
  transition: transform .25s var(--hr-spring), box-shadow .25s var(--hr-spring);
}
.app-node:hover .app-node-mark { transform: scale(1.08); }
.app-node-mark[data-status="APPROVED"] {
  background: rgba(52, 211, 153, 0.20);
  color: #34d399;
  border-color: rgba(52, 211, 153, 0.50);
  box-shadow: 0 8px 22px -10px rgba(52, 211, 153, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.10);
}
.app-node-mark[data-status="REJECTED"] {
  background: rgba(248, 113, 113, 0.20);
  color: #f87171;
  border-color: rgba(248, 113, 113, 0.50);
  box-shadow: 0 8px 22px -10px rgba(248, 113, 113, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.10);
}
.app-node-mark[data-status="WAIVED"] {
  background: rgba(156, 163, 175, 0.18);
  color: #9ca3af;
  border-color: rgba(156, 163, 175, 0.40);
}
.app-node-pulse {
  position: absolute; inset: -4px; border-radius: 50%;
  border: 2px solid rgba(251, 191, 36, 0.55);
  animation: app-pulse 2s ease-out infinite;
  pointer-events: none;
}
@keyframes app-pulse {
  0%   { transform: scale(1);   opacity: 0.85; }
  100% { transform: scale(1.6); opacity: 0; }
}
.app-node-step {
  font-size: 8.5px; font-weight: 800; letter-spacing: 1.2px;
  text-transform: uppercase; color: var(--hr-text-muted);
}

/* ── Card body ── */
.app-node-card {
  position: relative;
  background: var(--onb-glass);
  border: var(--onb-glass-stroke);
  border-radius: 18px;
  padding: 18px 22px;
  backdrop-filter: var(--onb-glass-blur);
  -webkit-backdrop-filter: var(--onb-glass-blur);
  box-shadow: var(--onb-glass-shadow);
  isolation: isolate;
  transition: border-color .25s var(--hr-spring), box-shadow .3s var(--hr-spring), transform .3s var(--hr-spring), background .25s var(--hr-spring);
  overflow: hidden;
}
.app-node-card::before {
  content: ''; position: absolute; inset: 0; pointer-events: none; z-index: -1;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.06), transparent 35%);
}
.app-node-card::after {
  content: ''; position: absolute; top: 0; left: 0; bottom: 0; width: 3px;
  background: linear-gradient(180deg, var(--hr-accent-gold), #fb923c);
  border-radius: 2px;
  opacity: 0.5;
  transition: opacity .25s var(--hr-spring);
}
.app-node:hover .app-node-card {
  box-shadow: var(--onb-glass-shadow-hi);
  border-color: rgba(251, 191, 36, 0.32);
}
.app-node:hover .app-node-card::after { opacity: 1; }
.app-node[data-status="APPROVED"] .app-node-card::after {
  background: linear-gradient(180deg, #34d399, #10b981);
}
.app-node[data-status="REJECTED"] .app-node-card::after {
  background: linear-gradient(180deg, #f87171, #ef4444);
}
.app-node[data-status="WAIVED"] .app-node-card::after {
  background: linear-gradient(180deg, #9ca3af, #6b7280);
}

.app-node-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 12px;
}
.app-node-header-tools {
  display: inline-flex; align-items: center; gap: 8px;
  flex-shrink: 0;
}
.app-node-role-block { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.app-node-role {
  font-size: 9.5px; font-weight: 800; letter-spacing: 1.4px;
  text-transform: uppercase; color: var(--hr-text-muted);
}
.app-node-name {
  font-size: 15.5px; font-weight: 700;
  color: var(--hr-text); letter-spacing: -0.01em;
}
.app-node-status-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.6px;
  text-transform: uppercase;
  border-radius: 999px;
  background: var(--hr-accent-gold-soft);
  color: var(--hr-accent-gold);
  border: 1px solid rgba(251, 191, 36, 0.32);
  flex-shrink: 0;
}
.app-node-status-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 6px currentColor;
}
.app-node-status-pill[data-status="APPROVED"] {
  background: rgba(52, 211, 153, 0.18);
  color: #34d399;
  border-color: rgba(52, 211, 153, 0.36);
}
.app-node-status-pill[data-status="REJECTED"] {
  background: rgba(248, 113, 113, 0.18);
  color: #f87171;
  border-color: rgba(248, 113, 113, 0.36);
}
.app-node-status-pill[data-status="WAIVED"] {
  background: rgba(156, 163, 175, 0.18);
  color: #9ca3af;
  border-color: rgba(156, 163, 175, 0.36);
}

/* Decision strip */
.app-node-decision {
  display: flex; align-items: flex-start; gap: 10px;
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.app-node-decision-icon {
  width: 22px; height: 22px; border-radius: 7px;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(251, 191, 36, 0.10);
  color: var(--hr-accent-gold);
  flex-shrink: 0;
}
.app-node-decision-body { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.app-node-decision-time {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.6px;
  text-transform: uppercase; color: var(--hr-text-muted);
}
.app-node-decision-notes {
  font-size: 12px; color: var(--hr-text-secondary);
  font-style: italic; line-height: 1.5;
}

/* Action buttons */
.app-node-actions { display: flex; gap: 8px; margin-top: 14px; }
.app-node-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px;
  font-size: 12px; font-weight: 700;
  border-radius: 10px;
  cursor: pointer;
  transition: background .18s var(--hr-spring), border-color .18s var(--hr-spring), box-shadow .18s var(--hr-spring);
}
.app-node-btn.is-approve {
  background: linear-gradient(135deg, rgba(52, 211, 153, 0.20), rgba(16, 185, 129, 0.16));
  border: 1px solid rgba(52, 211, 153, 0.40);
  color: #34d399;
}
.app-node-btn.is-approve:hover {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 8px 22px -8px rgba(16, 185, 129, 0.60);
}
.app-node-btn.is-reject {
  background: linear-gradient(135deg, rgba(248, 113, 113, 0.20), rgba(239, 68, 68, 0.16));
  border: 1px solid rgba(248, 113, 113, 0.40);
  color: #f87171;
}
.app-node-btn.is-reject:hover {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 8px 22px -8px rgba(239, 68, 68, 0.60);
}

/* Delete affordance — sits beside the status pill in the header */
.node-del {
  width: 28px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(248, 113, 113, 0.10);
  border: 1px solid rgba(248, 113, 113, 0.28);
  border-radius: 8px;
  color: #fca5a5;
  cursor: pointer;
  opacity: 0;
  flex-shrink: 0;
  transition: opacity .18s var(--hr-spring),
              background .18s var(--hr-spring),
              border-color .18s var(--hr-spring),
              color .18s var(--hr-spring),
              transform .15s var(--hr-spring);
}
.app-node:hover .node-del { opacity: 0.95; }
.node-del:hover {
  opacity: 1;
  background: rgba(248, 113, 113, 0.22);
  border-color: rgba(248, 113, 113, 0.60);
  color: #f87171;
  transform: rotate(-8deg) scale(1.08);
}
.node-del:active { transform: scale(0.92); }

/* ── Light theme overrides ── */
[data-theme="light"] .app-empty-inline {
  background: rgba(255, 250, 240, 0.7);
  border-color: rgba(217, 119, 6, 0.30);
  color: var(--hr-text-secondary);
}
[data-theme="light"] .app-empty-inline strong { color: #b45309; }
[data-theme="light"] .app-pipe-summary {
  background:
    linear-gradient(135deg, rgba(217, 119, 6, 0.10), rgba(251, 146, 60, 0.06)),
    rgba(255, 250, 240, 0.80);
  border-color: rgba(217, 119, 6, 0.28);
}
[data-theme="light"] .aps-stat-divider {
  background: linear-gradient(180deg, transparent, rgba(217, 119, 6, 0.25), transparent);
}
[data-theme="light"] .aps-progress-track {
  background: rgba(40, 25, 10, 0.10);
  box-shadow: inset 0 1px 0 rgba(40, 25, 10, 0.06);
}
[data-theme="light"] .aps-progress-fill {
  background: linear-gradient(90deg, #f59e0b, #d97706, #c2410c);
  box-shadow: 0 0 12px rgba(217, 119, 6, 0.50);
}
[data-theme="light"] .aps-progress-text { color: #b45309; }
[data-theme="light"] .app-rail-line { background: rgba(217, 119, 6, 0.22); }
[data-theme="light"] .app-rail-line-fill {
  background: linear-gradient(180deg, #f59e0b, #d97706 50%, #c2410c);
  box-shadow: 0 0 10px rgba(217, 119, 6, 0.45);
}
[data-theme="light"] .app-node-mark[data-status="APPROVED"] {
  background: rgba(4, 120, 87, 0.18);
  color: #047857;
  border-color: rgba(4, 120, 87, 0.50);
  box-shadow: 0 8px 22px -10px rgba(4, 120, 87, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.45);
}
[data-theme="light"] .app-node-mark[data-status="REJECTED"] {
  background: rgba(220, 38, 38, 0.16);
  color: #b91c1c;
  border-color: rgba(220, 38, 38, 0.50);
}
[data-theme="light"] .app-node-status-pill[data-status="APPROVED"] {
  background: rgba(4, 120, 87, 0.16);
  color: #047857;
  border-color: rgba(4, 120, 87, 0.36);
}
[data-theme="light"] .app-node-status-pill[data-status="REJECTED"] {
  background: rgba(220, 38, 38, 0.14);
  color: #b91c1c;
  border-color: rgba(220, 38, 38, 0.36);
}
[data-theme="light"] .app-node-decision {
  background: rgba(40, 25, 10, 0.04);
  border-color: rgba(40, 25, 10, 0.08);
}
[data-theme="light"] .app-node-decision-icon {
  background: rgba(217, 119, 6, 0.14);
  color: #b45309;
}
[data-theme="light"] .app-node-btn.is-approve {
  background: linear-gradient(135deg, rgba(4, 120, 87, 0.16), rgba(4, 120, 87, 0.10));
  border-color: rgba(4, 120, 87, 0.42);
  color: #047857;
}
[data-theme="light"] .app-node-btn.is-approve:hover {
  background: linear-gradient(135deg, #047857, #065f46);
  color: #fff;
}
[data-theme="light"] .app-node-btn.is-reject {
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.16), rgba(220, 38, 38, 0.10));
  border-color: rgba(220, 38, 38, 0.42);
  color: #b91c1c;
}
[data-theme="light"] .app-node-btn.is-reject:hover {
  background: linear-gradient(135deg, #dc2626, #991b1b);
  color: #fff;
}
[data-theme="light"] .node-del {
  background: rgba(220, 38, 38, 0.10);
  border-color: rgba(220, 38, 38, 0.30);
  color: #b91c1c;
}
[data-theme="light"] .node-del:hover {
  background: rgba(220, 38, 38, 0.22);
  border-color: rgba(220, 38, 38, 0.55);
  color: #7f1d1d;
}

.form-grid { display: grid; gap: 14px; }
</style>
