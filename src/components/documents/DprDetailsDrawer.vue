<template>
  <div class="drawer-overlay" :class="{ 'is-open': isOpen }" @click.self="$emit('close')">
    <Transition name="drawer-slide">
      <div v-if="isOpen && dpr" class="drawer-panel">
        
        <!-- Header -->
        <header class="drawer-header">
          <div class="header-top">
            <div class="dpr-badge">
              <span class="badge-dot"></span>
              <span class="badge-label">DPR REF</span>
              <span class="badge-value">{{ dpr.dpr_code || 'TBD-REF' }}</span>
            </div>

            <div class="action-group">
                <template v-if="isAdminMode && dpr.status === 'Internal Review'">
                  <button class="action-pill approve" @click="$emit('approve', dpr)">
                    <Check :size="14" /><span>Approve</span>
                  </button>
                  <button class="action-pill reject" @click="$emit('reject', dpr)">
                    <XSquare :size="14" /><span>Reject</span>
                  </button>
                </template>

                <!-- Delete: Admin only OR user drafts -->
                <button 
                  v-if="canDelete" 
                  class="action-pill delete" 
                  :class="{ 'confirming': showDeleteConfirm }"
                  @click="handleDeleteClick"
                  :disabled="isDeleting"
                >
                  <Trash2 v-if="!isDeleting" :size="14" />
                  <Loader2 v-else :size="14" class="spin" />
                  <span v-if="showDeleteConfirm && !isDeleting">Confirm?</span>
                  <span v-else-if="!isDeleting">Delete</span>
                </button>
                
                <button class="close-circle" @click="$emit('close')">
                  <X :size="18" />
                </button>
            </div>
          </div>

          <div class="header-identity">
            <div class="identity-avatar">
              {{ getInitials(dpr.title) }}
            </div>
            <div class="identity-text">
              <h1>{{ dpr.title || 'Untitled Project Report' }}</h1>
              <div class="identity-meta">
                <Building2 :size="13" />
                <span>{{ dpr.client?.organization || 'Enterprise Stakeholder' }}</span>
              </div>
            </div>
          </div>

          <div class="status-ribbon" :class="statusClass">
            <div class="sr-left">
              <component :is="getStatusIcon(dpr.status)" :size="14" />
              <span>{{ dpr.status }}</span>
            </div>
            <div class="sr-right">
              <Calendar :size="12" />
              <span>{{ formatDate(dpr.created_at) }}</span>
            </div>
          </div>
        </header>

        <!-- Scrollable Content -->
        <main class="drawer-body nano-scroll">
          
          <!-- 01. Overview -->
          <section class="sec" v-if="dpr.overview">
            <div class="sec-head"><ClipboardList :size="16" /><h3>Project Overview</h3></div>
            <div class="sec-grid">
              <div class="sec-field">
                <span class="sf-label">Project Title</span>
                <span class="sf-value">{{ dpr.title || dpr.overview?.project_name || '—' }}</span>
              </div>
              <div class="sec-field">
                <span class="sf-label">DPR Reference</span>
                <span class="sf-value sf-amber">{{ dpr.dpr_code || '—' }}</span>
              </div>
              <div class="sec-field">
                <span class="sf-label">Start Date</span>
                <span class="sf-value">{{ dpr.overview.start_date || 'N/A' }}</span>
              </div>
              <div class="sec-field">
                <span class="sf-label">End Date</span>
                <span class="sf-value">{{ dpr.overview.end_date || 'N/A' }}</span>
              </div>
            </div>
            <div class="sec-box" v-if="dpr.overview.description">
              <span class="sb-label">Executive Summary</span>
              <p class="sb-text">{{ dpr.overview.description }}</p>
            </div>
          </section>

          <!-- 02. Stakeholders -->
          <section class="sec" v-if="dpr.client">
            <div class="sec-head"><Users :size="16" /><h3>Stakeholder Details</h3></div>
            <div class="sec-grid">
              <div class="sec-field">
                <span class="sf-label">Organization</span>
                <span class="sf-value">{{ dpr.client.organization || '—' }}</span>
              </div>
              <div class="sec-field">
                <span class="sf-label">Contact Person</span>
                <span class="sf-value">{{ dpr.client.client_name || '—' }}</span>
              </div>
              <div class="sec-field">
                <span class="sf-label">Email</span>
                <span class="sf-value">{{ dpr.client.email || '—' }}</span>
              </div>
              <div class="sec-field">
                <span class="sf-label">Phone</span>
                <span class="sf-value">{{ dpr.client.phone || '—' }}</span>
              </div>
            </div>
            <div class="sec-box" v-if="dpr.client.address">
              <span class="sb-label">Address</span>
              <p class="sb-text">{{ dpr.client.address }}</p>
            </div>
          </section>

          <!-- 03. Problem Statement -->
          <section class="sec" v-if="dpr.problem_statement">
            <div class="sec-head"><AlertCircle :size="16" /><h3>Context & Challenges</h3></div>
            <div class="sec-box" v-if="dpr.problem_statement.statement">
              <span class="sb-label">Core Problem</span>
              <p class="sb-text">{{ dpr.problem_statement.statement }}</p>
            </div>
            <div class="sec-box" v-if="dpr.problem_statement.current_challenges">
              <span class="sb-label">Current Challenges</span>
              <p class="sb-text">{{ dpr.problem_statement.current_challenges }}</p>
            </div>
            <div class="sec-box" v-if="dpr.problem_statement.impact_analysis">
              <span class="sb-label">Projected Impact</span>
              <p class="sb-text">{{ dpr.problem_statement.impact_analysis }}</p>
            </div>
          </section>

          <!-- 04. Objectives -->
          <section class="sec" v-if="dpr.objectives?.length">
            <div class="sec-head"><Target :size="16" /><h3>Strategic Objectives</h3></div>
            <div class="obj-list">
              <div v-for="(obj, i) in dpr.objectives" :key="i" class="obj-card">
                <div class="obj-num">{{ String(i+1).padStart(2, '0') }}</div>
                <div class="obj-body">
                  <div class="obj-title">{{ obj.title }}</div>
                  <div class="obj-desc">{{ obj.description }}</div>
                </div>
                <span class="obj-badge" :class="(obj.priority || '').toLowerCase()">{{ obj.priority }}</span>
              </div>
            </div>
          </section>

          <!-- 05. Scope -->
          <section class="sec" v-if="dpr.scope">
            <div class="sec-head"><Maximize :size="16" /><h3>Scope of Work</h3></div>
            <div class="sec-box" v-if="dpr.scope.in_scope">
              <span class="sb-label">In-Scope Deliverables</span>
              <p class="sb-text">{{ dpr.scope.in_scope }}</p>
            </div>
            <div class="sec-box" v-if="dpr.scope.out_of_scope">
              <span class="sb-label">Out of Scope</span>
              <p class="sb-text">{{ dpr.scope.out_of_scope }}</p>
            </div>
            <div class="sec-grid" v-if="dpr.scope.assumptions || dpr.scope.constraints">
              <div class="sec-field" v-if="dpr.scope.assumptions">
                <span class="sf-label">Assumptions</span>
                <span class="sf-value sf-small">{{ dpr.scope.assumptions }}</span>
              </div>
              <div class="sec-field" v-if="dpr.scope.constraints">
                <span class="sf-label">Constraints</span>
                <span class="sf-value sf-small">{{ dpr.scope.constraints }}</span>
              </div>
            </div>
          </section>

          <!-- 06. Architecture -->
          <section class="sec" v-if="dpr.architecture">
            <div class="sec-head"><Cpu :size="16" /><h3>Technical Architecture</h3></div>
            <div class="sec-grid sec-grid-3">
              <div class="sec-field" v-if="dpr.architecture.tech_stack?.backend">
                <span class="sf-label">Backend</span>
                <span class="sf-value sf-mono sf-small">{{ dpr.architecture.tech_stack.backend }}</span>
              </div>
              <div class="sec-field" v-if="dpr.architecture.tech_stack?.frontend">
                <span class="sf-label">Frontend</span>
                <span class="sf-value sf-mono sf-small">{{ dpr.architecture.tech_stack.frontend }}</span>
              </div>
              <div class="sec-field" v-if="dpr.architecture.tech_stack?.database">
                <span class="sf-label">Database</span>
                <span class="sf-value sf-mono sf-small">{{ dpr.architecture.tech_stack.database }}</span>
              </div>
            </div>
            <div class="sec-box" v-if="dpr.architecture.description">
              <span class="sb-label">Infrastructure Strategy</span>
              <p class="sb-text">{{ dpr.architecture.description }}</p>
            </div>
          </section>

          <!-- 07. Implementation -->
          <section class="sec" v-if="dpr.implementation">
            <div class="sec-head"><Activity :size="16" /><h3>Implementation Strategy</h3></div>
            <div class="sec-grid">
              <div class="sec-field">
                <span class="sf-label">Methodology</span>
                <span class="sf-value sf-pill">{{ dpr.implementation.methodology || 'Agile' }}</span>
              </div>
            </div>
            <div class="sec-box" v-if="dpr.implementation.phases">
              <span class="sb-label">Phase Breakdown</span>
              <p class="sb-text">{{ dpr.implementation.phases }}</p>
            </div>
            <div class="sec-box" v-if="dpr.implementation.deployment_strategy">
              <span class="sb-label">Deployment Strategy</span>
              <p class="sb-text">{{ dpr.implementation.deployment_strategy }}</p>
            </div>
          </section>

          <!-- 08. Milestones -->
          <section class="sec" v-if="dpr.milestones?.length">
            <div class="sec-head"><Calendar :size="16" /><h3>Milestones & Timeline</h3></div>
            <div class="ms-list">
              <div v-for="(m, i) in dpr.milestones" :key="i" class="ms-card">
                <div class="ms-dot"></div>
                <div class="ms-body">
                  <div class="ms-title">{{ m.title }}</div>
                  <div class="ms-meta">
                    <Clock :size="12" />
                    <span>{{ m.due_date || 'TBD' }}</span>
                  </div>
                  <div class="ms-desc" v-if="m.deliverables">{{ m.deliverables }}</div>
                </div>
              </div>
            </div>
          </section>

          <!-- 09. Team -->
          <section class="sec" v-if="dpr.team?.length">
            <div class="sec-head"><Users :size="16" /><h3>Team Structure</h3></div>
            <div class="team-list">
              <div v-for="(t, i) in dpr.team" :key="i" class="team-card">
                <div class="tc-avatar">{{ getInitials(t.name) }}</div>
                <div class="tc-body">
                  <div class="tc-name">{{ t.name }}</div>
                  <div class="tc-role">{{ t.role }}</div>
                  <div class="tc-resp" v-if="t.responsibility">{{ t.responsibility }}</div>
                </div>
              </div>
            </div>
          </section>

          <!-- 10. Budget -->
          <section class="sec" v-if="dpr.budget">
            <div class="sec-head"><DollarSign :size="16" /><h3>Financial Projections</h3></div>
            <div class="finance-card">
              <div class="fc-label">Estimated Total Investment</div>
              <div class="fc-amount">
                <span class="fc-currency">{{ dpr.budget.currency || 'INR' }}</span>
                <span class="fc-number">{{ formatNumber(dpr.budget.total_amount) }}</span>
              </div>
            </div>
            <div class="budget-list" v-if="dpr.budget_items?.length">
              <div v-for="(b, i) in dpr.budget_items" :key="i" class="bl-item">
                <div class="bl-info">
                  <span class="bl-cat">{{ b.category }}</span>
                  <span class="bl-desc" v-if="b.description">{{ b.description }}</span>
                </div>
                <span class="bl-amt">{{ dpr.budget.currency || 'INR' }} {{ b.amount?.toLocaleString() }}</span>
              </div>
            </div>
          </section>

          <!-- 11. Risks -->
          <section class="sec" v-if="dpr.risks?.length">
            <div class="sec-head"><ShieldAlert :size="16" /><h3>Risk Assessment</h3></div>
            <div class="risk-list">
              <div v-for="(r, i) in dpr.risks" :key="i" class="risk-card" :class="'risk-' + (r.impact || '').toLowerCase()">
                <div class="rc-top">
                  <span class="rc-desc">{{ r.risk_description }}</span>
                  <span class="rc-impact" :class="(r.impact || '').toLowerCase()">{{ r.impact }}</span>
                </div>
                <div class="rc-mitigation" v-if="r.mitigation_plan">
                  <span class="rc-mlabel">Mitigation:</span> {{ r.mitigation_plan }}
                </div>
              </div>
            </div>
          </section>

          <!-- 12. Compliance -->
          <section class="sec" v-if="dpr.compliance">
            <div class="sec-head"><BookOpen :size="16" /><h3>Compliance & Standards</h3></div>
            <div class="sec-box" v-if="dpr.compliance.legal_requirements">
              <span class="sb-label">Legal Requirements</span>
              <p class="sb-text">{{ dpr.compliance.legal_requirements }}</p>
            </div>
            <div class="sec-box" v-if="dpr.compliance.regulatory_standards">
              <span class="sb-label">Regulatory Standards</span>
              <p class="sb-text">{{ dpr.compliance.regulatory_standards }}</p>
            </div>
            <div class="sec-box" v-if="dpr.compliance.security_policies">
              <span class="sb-label">Security Policies</span>
              <p class="sb-text">{{ dpr.compliance.security_policies }}</p>
            </div>
          </section>

          <!-- 13. Outcomes -->
          <section class="sec" v-if="dpr.outcomes">
            <div class="sec-head"><TrendingUp :size="16" /><h3>Anticipated Outcomes</h3></div>
            <div class="sec-box" v-if="dpr.outcomes.kpis">
              <span class="sb-label">Success KPIs</span>
              <p class="sb-text">{{ dpr.outcomes.kpis }}</p>
            </div>
            <div class="sec-box" v-if="dpr.outcomes.tangible_benefits">
              <span class="sb-label">Tangible Benefits</span>
              <p class="sb-text">{{ dpr.outcomes.tangible_benefits }}</p>
            </div>
            <div class="sec-box" v-if="dpr.outcomes.intangible_benefits">
              <span class="sb-label">Strategic Value</span>
              <p class="sb-text">{{ dpr.outcomes.intangible_benefits }}</p>
            </div>
          </section>

          <!-- 14. Attachments -->
          <section class="sec" v-if="dpr.attachments?.length">
            <div class="sec-head"><FileText :size="16" /><h3>Attachments</h3></div>
            <div class="att-list">
              <div v-for="(a, i) in dpr.attachments" :key="i" class="att-card">
                <FileText :size="16" class="att-icon" />
                <div class="att-info">
                  <span class="att-name">{{ a.file_name }}</span>
                  <span class="att-type">{{ a.file_type }} Document</span>
                </div>
              </div>
            </div>
          </section>

          <!-- 15. Approvals -->
          <section class="sec" v-if="dpr.approvals?.length">
            <div class="sec-head"><PenTool :size="16" /><h3>Approvals & Sign-off</h3></div>
            <div class="team-list">
              <div v-for="(ap, i) in dpr.approvals" :key="i" class="team-card">
                <div class="tc-avatar">{{ getInitials(ap.approver_name) }}</div>
                <div class="tc-body">
                  <div class="tc-name">{{ ap.approver_name }}</div>
                  <div class="tc-role">{{ ap.approver_role }} &bull; {{ ap.approval_status || 'Pending' }}</div>
                </div>
              </div>
            </div>
          </section>

          <!-- Audit -->
          <section class="sec audit-section" v-if="dpr.created_by">
            <div class="audit-card">
              <div class="ac-avatar">{{ getInitials(dpr.created_by?.full_name) }}</div>
              <div class="ac-info">
                <span class="ac-label">Prepared by</span>
                <span class="ac-name">{{ dpr.created_by?.full_name || 'System User' }}</span>
                <span class="ac-email">{{ dpr.created_by?.email }} &bull; {{ formatDate(dpr.created_at) }}</span>
              </div>
            </div>
          </section>
        </main>

        <!-- Footer -->
        <footer class="drawer-footer" v-if="showFooter">
            <button v-if="isAdminMode" class="footer-btn secondary" @click="$emit('edit', dpr)">
              <Pencil :size="16" /><span>Edit Proposal</span>
            </button>
            <button v-if="showDownload" class="footer-btn primary" @click="$emit('generate', dpr)">
              <Download :size="16" /><span>Download DPR</span>
            </button>
            <div v-if="!isAdminMode && isPending" class="view-only-notice">
              <Clock :size="14" /><span>Pending Review — View Only</span>
            </div>
        </footer>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import axios from 'axios'
import {
  Clock, X, Pencil, Trash2, FileText, Download, CheckCircle, XCircle, Check, XSquare, AlertCircle,
  Activity, Users, Cpu, ClipboardList, Building2, Calendar, BookOpen, Target, Maximize,
  DollarSign, ShieldAlert, TrendingUp, PenTool, Layers, Loader2
} from 'lucide-vue-next'

const props = defineProps({ isOpen: Boolean, dpr: Object, isAdminMode: Boolean })
const emit = defineEmits(['close', 'edit', 'approve', 'reject', 'deleted', 'generate'])

const isDeleting = ref(false)
const showDeleteConfirm = ref(false)

const isPending = computed(() => props.dpr?.status === 'Internal Review' || props.dpr?.status === 'Draft')
const statusClass = computed(() => (props.dpr?.status || 'draft').toLowerCase().replace(' ', '-'))

// Users: hide delete for pending DPRs. Admins always see delete.
const canDelete = computed(() => {
  if (!props.dpr) return false
  if (props.isAdminMode) return true
  return props.dpr.status === 'Draft'
})

// Users: hide download for pending DPRs. Admins always see download.
const showDownload = computed(() => {
  if (props.isAdminMode) return true
  return !isPending.value
})

const showFooter = computed(() => {
  return props.isAdminMode || showDownload.value || isPending.value
})

const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
}
const formatDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
const formatNumber = (n) => {
  if (n == null) return '0'
  return Number(n).toLocaleString('en-IN')
}
const getStatusIcon = (status) => {
  if (status === 'Approved') return CheckCircle
  if (status === 'Internal Review') return Clock
  if (status === 'Rejected') return XCircle
  return FileText
}

const handleDeleteClick = async () => {
  if (!showDeleteConfirm.value) {
    showDeleteConfirm.value = true
    setTimeout(() => { showDeleteConfirm.value = false }, 3000)
    return
  }
  isDeleting.value = true
  try {
    const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token')
    await axios.delete(`http://localhost:8000/api/dpr/${props.dpr.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    emit('deleted')
  } catch(err) { console.error(err) }
  finally { isDeleting.value = false; showDeleteConfirm.value = false }
}
</script>

<style scoped>
/* ── OVERLAY ── */
.drawer-overlay {
  position: fixed; inset: 0; z-index: 2000;
  background: rgba(0,0,0,0.5); backdrop-filter: blur(0px);
  display: flex; justify-content: flex-end;
  opacity: 0; pointer-events: none; visibility: hidden;
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-overlay.is-open {
  opacity: 1; pointer-events: auto; visibility: visible;
  backdrop-filter: blur(6px);
}

/* ── PANEL ── */
.drawer-panel {
  width: 100%; max-width: 560px; height: 100%;
  background: rgba(18, 18, 20, 0.75);
  backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px);
  border-left: 1px solid rgba(255,255,255,0.07);
  display: flex; flex-direction: column;
  box-shadow: -20px 0 60px rgba(0,0,0,0.5);
}

/* ── TRANSITIONS ── */
.drawer-slide-enter-active, .drawer-slide-leave-active { transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1); }
.drawer-slide-enter-from, .drawer-slide-leave-to { transform: translateX(100%); }

/* ── HEADER ── */
.drawer-header { padding: 24px 28px; border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0; }
.header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }

.dpr-badge {
  display: flex; align-items: center; gap: 8px;
  background: rgba(255,255,255,0.04); padding: 5px 12px; border-radius: 100px;
  border: 1px solid rgba(255,255,255,0.06);
}
.badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #f59e0b; box-shadow: 0 0 8px #f59e0b; }
.badge-label { font-size: 9px; font-weight: 800; color: rgba(255,255,255,0.35); letter-spacing: 1px; }
.badge-value { font-size: 11px; font-family: 'SF Mono', monospace; font-weight: 700; color: #fff; }

.action-group { display: flex; align-items: center; gap: 8px; }
.action-pill {
  height: 32px; padding: 0 14px; border-radius: 16px;
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.25s; border: 1px solid transparent;
}
.action-pill.approve { background: rgba(34,197,94,0.1); color: #22c55e; border-color: rgba(34,197,94,0.2); }
.action-pill.reject { background: rgba(239,68,68,0.1); color: #ef4444; border-color: rgba(239,68,68,0.2); }
.action-pill.delete { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.5); border-color: rgba(255,255,255,0.08); }
.action-pill.delete.confirming { background: #ef4444; color: #fff; border-color: #ef4444; }
.action-pill:hover { transform: translateY(-1px); filter: brightness(1.15); }

.close-circle {
  width: 32px; height: 32px; border-radius: 50%;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.6); display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.25s;
}
.close-circle:hover { background: rgba(255,255,255,0.12); color: #fff; transform: rotate(90deg); }

.identity-avatar {
  width: 52px; height: 52px; border-radius: 16px; flex-shrink: 0;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; font-weight: 900; color: #000;
}
.header-identity { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
.identity-text h1 { font-size: 22px; font-weight: 800; color: #fff; margin: 0 0 6px; line-height: 1.15; letter-spacing: -0.5px; }
.identity-meta { display: flex; align-items: center; gap: 8px; color: rgba(255,255,255,0.4); font-size: 13px; }

.status-ribbon {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px; border-radius: 10px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
}
.status-ribbon.approved { border-color: rgba(34,197,94,0.3); }
.status-ribbon.approved .sr-left { color: #22c55e; }
.status-ribbon.rejected { border-color: rgba(239,68,68,0.3); }
.status-ribbon.rejected .sr-left { color: #ef4444; }
.status-ribbon.internal-review { border-color: rgba(245,158,11,0.3); }
.status-ribbon.internal-review .sr-left { color: #f59e0b; }
.status-ribbon.draft .sr-left { color: rgba(255,255,255,0.4); }
.sr-left, .sr-right { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; }
.sr-right { color: rgba(255,255,255,0.35); font-weight: 500; }

/* ── BODY ── */
.drawer-body { flex: 1; overflow-y: auto; padding: 28px; }

.sec { margin-bottom: 36px; }
.sec-head { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; color: #f59e0b; }
.sec-head h3 { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #fff; margin: 0; }

.sec-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 12px; }
.sec-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
.sec-field { display: flex; flex-direction: column; gap: 4px; }
.sf-label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: rgba(255,255,255,0.3); letter-spacing: 0.5px; }
.sf-value { font-size: 14px; font-weight: 600; color: #e4e4e7; word-break: break-word; }
.sf-amber { color: #f59e0b; }
.sf-mono { font-family: 'SF Mono', monospace; }
.sf-small { font-size: 12px; }
.sf-pill {
  display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px;
  background: rgba(245,158,11,0.1); color: #f59e0b; border: 1px solid rgba(245,158,11,0.2);
}

.sec-box {
  padding: 16px; background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05); border-radius: 14px;
  margin-bottom: 10px;
}
.sb-label { display: block; font-size: 9px; font-weight: 800; text-transform: uppercase; color: rgba(255,255,255,0.3); letter-spacing: 0.5px; margin-bottom: 8px; }
.sb-text { font-size: 13px; line-height: 1.65; color: rgba(255,255,255,0.65); margin: 0; }

/* ── OBJECTIVES ── */
.obj-list { display: flex; flex-direction: column; gap: 10px; }
.obj-card {
  display: flex; align-items: flex-start; gap: 14px; padding: 14px 16px;
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);
  border-radius: 14px; transition: background 0.2s;
}
.obj-card:hover { background: rgba(255,255,255,0.04); }
.obj-num { font-size: 11px; font-weight: 900; color: #f59e0b; min-width: 24px; padding-top: 2px; }
.obj-body { flex: 1; min-width: 0; }
.obj-title { font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 4px; }
.obj-desc { font-size: 12px; color: rgba(255,255,255,0.45); line-height: 1.4; }
.obj-badge {
  font-size: 9px; font-weight: 900; padding: 3px 10px; border-radius: 6px;
  text-transform: uppercase; letter-spacing: 0.5px; flex-shrink: 0;
}
.obj-badge.high { background: rgba(239,68,68,0.12); color: #ef4444; }
.obj-badge.medium { background: rgba(245,158,11,0.12); color: #f59e0b; }
.obj-badge.low { background: rgba(74,222,128,0.12); color: #4ade80; }

/* ── MILESTONES ── */
.ms-list { border-left: 2px solid rgba(255,255,255,0.06); margin-left: 6px; padding-left: 20px; display: flex; flex-direction: column; gap: 16px; }
.ms-card { position: relative; }
.ms-dot { position: absolute; left: -27px; top: 6px; width: 10px; height: 10px; border-radius: 50%; background: #f59e0b; border: 2px solid #121214; }
.ms-title { font-size: 14px; font-weight: 700; color: #fff; }
.ms-meta { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #f59e0b; margin-top: 4px; }
.ms-desc { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 4px; line-height: 1.4; }

/* ── TEAM ── */
.team-list { display: flex; flex-direction: column; gap: 10px; }
.team-card { display: flex; align-items: center; gap: 14px; padding: 12px 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; }
.tc-avatar { width: 36px; height: 36px; border-radius: 50%; background: rgba(245,158,11,0.1); color: #f59e0b; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0; }
.tc-body { flex: 1; min-width: 0; }
.tc-name { font-size: 14px; font-weight: 700; color: #fff; }
.tc-role { font-size: 11px; color: rgba(255,255,255,0.4); }
.tc-resp { font-size: 11px; color: rgba(255,255,255,0.3); margin-top: 2px; }

/* ── FINANCE ── */
.finance-card {
  padding: 24px; background: rgba(255,255,255,0.02); border: 1px solid rgba(245,158,11,0.15);
  border-radius: 16px; margin-bottom: 16px; position: relative; overflow: hidden;
}
.fc-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: rgba(255,255,255,0.35); margin-bottom: 8px; }
.fc-amount { display: flex; align-items: baseline; gap: 8px; }
.fc-currency { font-size: 16px; color: rgba(255,255,255,0.3); }
.fc-number { font-size: 36px; font-weight: 900; color: #f59e0b; letter-spacing: -1px; }

.budget-list { display: flex; flex-direction: column; gap: 8px; }
.bl-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: 12px; }
.bl-info { display: flex; flex-direction: column; gap: 2px; }
.bl-cat { font-size: 13px; font-weight: 700; color: #fff; }
.bl-desc { font-size: 11px; color: rgba(255,255,255,0.35); }
.bl-amt { font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.7); font-family: 'SF Mono', monospace; white-space: nowrap; }

/* ── RISKS ── */
.risk-list { display: flex; flex-direction: column; gap: 10px; }
.risk-card { padding: 14px 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; border-left: 3px solid rgba(255,255,255,0.1); }
.risk-card.risk-high { border-left-color: #ef4444; }
.risk-card.risk-medium { border-left-color: #f59e0b; }
.risk-card.risk-low { border-left-color: #22c55e; }
.rc-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.rc-desc { font-size: 13px; font-weight: 600; color: #fff; flex: 1; }
.rc-impact { font-size: 9px; font-weight: 900; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; flex-shrink: 0; }
.rc-impact.high { background: rgba(239,68,68,0.12); color: #ef4444; }
.rc-impact.medium { background: rgba(245,158,11,0.12); color: #f59e0b; }
.rc-impact.low { background: rgba(74,222,128,0.12); color: #4ade80; }
.rc-mitigation { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 8px; line-height: 1.4; }
.rc-mlabel { color: rgba(255,255,255,0.25); font-weight: 700; }

/* ── ATTACHMENTS ── */
.att-list { display: flex; flex-direction: column; gap: 8px; }
.att-card { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; }
.att-icon { color: rgba(255,255,255,0.3); flex-shrink: 0; }
.att-info { flex: 1; }
.att-name { display: block; font-size: 13px; font-weight: 600; color: #fff; }
.att-type { display: block; font-size: 10px; color: rgba(255,255,255,0.35); }

/* ── AUDIT ── */
.audit-section { margin-top: 20px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.05); }
.audit-card { display: flex; align-items: center; gap: 14px; padding: 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; }
.ac-avatar { width: 40px; height: 40px; border-radius: 50%; background: rgba(245,158,11,0.08); color: #f59e0b; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; flex-shrink: 0; border: 1px solid rgba(245,158,11,0.15); }
.ac-info { flex: 1; }
.ac-label { display: block; font-size: 9px; font-weight: 700; text-transform: uppercase; color: rgba(255,255,255,0.3); letter-spacing: 0.5px; }
.ac-name { display: block; font-size: 14px; font-weight: 700; color: #fff; }
.ac-email { display: block; font-size: 11px; color: rgba(255,255,255,0.35); margin-top: 2px; }

/* ── FOOTER ── */
.drawer-footer {
  padding: 20px 28px; border-top: 1px solid rgba(255,255,255,0.06);
  display: flex; gap: 12px; flex-shrink: 0;
  background: rgba(10,10,12,0.5); backdrop-filter: blur(10px);
}
.footer-btn {
  flex: 1; height: 48px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  font-size: 14px; font-weight: 700; cursor: pointer; border: none; transition: all 0.25s;
}
.footer-btn.primary { background: #f59e0b; color: #000; }
.footer-btn.primary:hover { background: #d97706; transform: translateY(-1px); }
.footer-btn.secondary { background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); }
.footer-btn.secondary:hover { background: rgba(255,255,255,0.1); }

.view-only-notice {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
  font-size: 12px; color: rgba(255,255,255,0.35); font-weight: 600;
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);
  border-radius: 14px; height: 48px;
}

/* ── UTILS ── */
.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.mt-4 { margin-top: 16px; }
.nano-scroll::-webkit-scrollbar { width: 4px; }
.nano-scroll::-webkit-scrollbar-track { background: transparent; }
.nano-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }
</style>
