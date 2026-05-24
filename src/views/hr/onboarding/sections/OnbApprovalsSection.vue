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
      <!-- Approval pipeline stepper -->
      <div class="app-pipe">
        <Motion v-for="(a, i) in approvals" :key="a.id"
          as="article" class="app-node" :data-status="a.status"
          :initial="{ opacity: 0, x: -10 }"
          :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.4, delay: 0.06 * i, ease: [0.22, 1, 0.36, 1] }"
        >
          <div class="node-mark" :data-status="a.status">
            <CheckCircle2 v-if="a.status === 'APPROVED'" :size="16" />
            <XCircle      v-else-if="a.status === 'REJECTED'" :size="16" />
            <CircleSlash  v-else-if="a.status === 'WAIVED'" :size="16" />
            <Clock        v-else :size="16" />
          </div>
          <div class="node-body">
            <div class="node-role">{{ a.approver_role.replace('_', ' ') }}</div>
            <div class="node-name">{{ a.approver_name || 'Unassigned' }}</div>
            <div class="node-meta" v-if="a.decision_at">
              <Calendar :size="10" />
              {{ formatDate(a.decision_at) }} · {{ a.decision_notes || 'no notes' }}
            </div>
            <div v-if="a.status === 'PENDING'" class="node-actions">
              <button class="onb-btn-primary" @click="decide(a, 'APPROVED')">Approve</button>
              <button class="onb-btn-danger"  @click="decide(a, 'REJECTED')">Reject</button>
            </div>
          </div>
          <span v-if="i < approvals.length - 1" class="node-connector"></span>
        </Motion>
        <div v-if="!approvals.length" class="app-empty-inline">
          No approvers configured yet. Click <strong>Add approver</strong> above to start.
        </div>
      </div>
    </template>

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
import { ref } from 'vue'
import { Motion } from 'motion-v'
import { Plus, ShieldCheck, CheckCircle2, XCircle, CircleSlash, Clock, Calendar } from 'lucide-vue-next'
import OnbProcessPicker from '../components/OnbProcessPicker.vue'
import OnbModal from '../components/OnbModal.vue'
import OnbField from '../components/OnbField.vue'
import { fetchApprovals, createApproval, decideApproval } from '../composables/useOnbChecklist'
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

.app-pipe {
  display: flex; flex-direction: column; gap: 16px;
}
.app-node {
  position: relative;
  display: grid; grid-template-columns: 56px 1fr; gap: 18px;
  background: var(--onb-glass);
  border: var(--onb-glass-stroke); border-radius: 20px;
  padding: 18px 22px;
  backdrop-filter: var(--onb-glass-blur);
  -webkit-backdrop-filter: var(--onb-glass-blur);
  box-shadow: var(--onb-glass-shadow);
  isolation: isolate;
  transition: border-color .25s var(--hr-spring), box-shadow .3s var(--hr-spring), transform .3s var(--hr-spring);
}
.app-node::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(160deg, rgba(255,255,255,0.05), transparent 35%);
  pointer-events: none; z-index: -1;
}
.app-node:hover { transform: translateX(3px); box-shadow: var(--onb-glass-shadow-hi); }
.app-node[data-status="APPROVED"] { border-color: rgba(52, 211, 153, 0.32); }
.app-node[data-status="REJECTED"] { border-color: rgba(248, 113, 113, 0.32); }
.app-node[data-status="WAIVED"]   { border-color: rgba(156, 163, 175, 0.32); }

.node-mark {
  width: 48px; height: 48px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold);
  border: 2px solid var(--hr-border-warm);
}
.node-mark[data-status="APPROVED"] { background: rgba(52, 211, 153, 0.18); color: #34d399; border-color: rgba(52, 211, 153, 0.32); }
.node-mark[data-status="REJECTED"] { background: rgba(248, 113, 113, 0.18); color: #f87171; border-color: rgba(248, 113, 113, 0.32); }
.node-mark[data-status="WAIVED"]   { background: rgba(156, 163, 175, 0.18); color: #9ca3af; border-color: rgba(156, 163, 175, 0.32); }
.node-body { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.node-role { font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--hr-text-muted); }
.node-name { font-size: 14.5px; font-weight: 700; color: var(--hr-text); }
.node-meta { font-size: 11px; color: var(--hr-text-muted); display: inline-flex; align-items: center; gap: 6px; }
.node-actions { display: flex; gap: 8px; margin-top: 8px; }

.node-connector {
  position: absolute; left: 41px; bottom: -14px; width: 2px; height: 14px;
  background: var(--hr-border-warm);
}

.form-grid { display: grid; gap: 14px; }
</style>
