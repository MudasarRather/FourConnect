<template>
  <div class="drawer-overlay" :class="{ 'is-open': isOpen }" @click.self="$emit('close')">
    <div class="drawer-panel" :class="{ 'is-open': isOpen }">
      <div v-if="dpr" class="drawer-content-wrapper">

        <!-- Header -->
        <div class="drawer-header">
          <div class="header-top">
            <div class="id-badge">
              <span class="label">DPR REF</span>
              <span class="value">{{ dpr.project_code || 'DRAFT' }}</span>
            </div>

            <div style="display: flex; align-items: center; gap: 8px;">
                <template v-if="isAdminMode && dpr.status === 'Internal Review'">
                  <button class="approve-btn" @click="$emit('approve', dpr)">
                    <Check :size="14" />
                    <span>Approve</span>
                  </button>
                  <button class="reject-btn" @click="$emit('reject', dpr)">
                    <XSquare :size="14" />
                    <span>Reject</span>
                  </button>
                </template>

                <button 
                  v-if="(isAdminMode || (dpr.status !== 'Approved' && dpr.status !== 'Rejected')) && (!isAdminMode || dpr.status !== 'Internal Review')" 
                  class="delete-btn" 
                  :class="{ 'confirm': showDeleteConfirm }"
                  @click="handleDeleteClick"
                  :disabled="isDeleting"
                >
                  <Trash2 v-if="!isDeleting" :size="14" />
                  <Clock v-else :size="14" class="spin" />
                  <span v-if="showDeleteConfirm && !isDeleting">Confirm?</span>
                  <span v-else-if="!isDeleting">Delete</span>
                  <span v-else>Deleting...</span>
                </button>
                
                <button class="close-btn" @click="$emit('close')">
                  <X :size="20" />
                </button>
            </div>
          </div>

          <div class="header-main">
            <div class="vendor-group">
              <div class="vendor-avatar">
                {{ getInitials(dpr.project_name || 'HD') }}
              </div>
              <div class="vendor-info">
                <h2>{{ dpr.project_name || 'Untitled Handover' }}</h2>
                <span class="category">{{ dpr.client_organization || 'No Client' }} &bull; {{ dpr.department || 'General' }}</span>
              </div>
            </div>
          </div>

          <!-- Status Bar -->
          <div class="status-bar" :class="(dpr.status === 'Internal Review' ? 'pending' : (dpr.status || 'draft').toLowerCase())">
            <component :is="getStatusIcon(dpr.status)" :size="16" />
            <span>{{ dpr.status === 'Internal Review' ? 'Pending' : (dpr.status || 'Draft') }}</span>
            <span class="date">Recorded on {{ formatDate(dpr.created_at) }}</span>
          </div>
        </div>

        <!-- Scrollable Content -->
        <div class="drawer-content nano-scroll">

          <!-- Rejection Feedback -->
          <div v-if="dpr.status === 'Rejected' && dpr.rejection_reason" class="rejection-alert">
            <div class="alert-icon">
              <XCircle :size="20" />
            </div>
            <div class="alert-content">
              <h4>Rejection Feedback</h4>
              <p>{{ dpr.rejection_reason }}</p>
            </div>
          </div>

          <!-- Section: Project Overview -->
          <div class="detail-section">
            <h3><ClipboardList :size="16" /> Project Overview</h3>
            <div class="detail-grid">
              <div class="field">
                <label>Project Manager</label>
                <div class="value">{{ dpr.project_manager || '—' }}</div>
              </div>
              <div class="field">
                <label>Department</label>
                <div class="value">{{ dpr.department || '—' }}</div>
              </div>
              <div class="field">
                <label>Start Date</label>
                <div class="value">{{ formatDate(dpr.start_date) }}</div>
              </div>
              <div class="field">
                <label>Completion Date</label>
                <div class="value">{{ formatDate(dpr.completion_date) }}</div>
              </div>
              <div class="field" v-if="dpr.version">
                <label>Version</label>
                <div class="value font-mono">{{ dpr.version }}</div>
              </div>
            </div>
            <div class="notes-box mt-3" v-if="dpr.project_summary">
              <strong>Summary:</strong>
              <p>{{ dpr.project_summary }}</p>
            </div>
          </div>

          <!-- Section: Technical Architecture -->
          <div class="detail-section" v-if="dpr.architecture_description || dpr.tech_stack_backend">
            <h3><Cpu :size="16" /> Technical Architecture</h3>
            <div class="detail-grid">
              <div class="field">
                <label>Backend</label>
                <div class="value-pill">{{ dpr.tech_stack_backend || '—' }}</div>
              </div>
              <div class="field">
                <label>Frontend</label>
                <div class="value-pill">{{ dpr.tech_stack_frontend || '—' }}</div>
              </div>
              <div class="field">
                <label>Database</label>
                <div class="value-pill">{{ dpr.tech_stack_database || '—' }}</div>
              </div>
            </div>
            <div class="notes-box mt-3" v-if="dpr.architecture_description">
              <strong>Architecture:</strong>
              <p>{{ dpr.architecture_description }}</p>
            </div>
          </div>

          <!-- Section: Stakeholders -->
          <div class="detail-section" v-if="dpr.stakeholders?.length">
            <h3><Users :size="16" /> Stakeholders ({{ dpr.stakeholders.length }})</h3>
            <div class="items-list">
              <div class="item-card" v-for="(s, i) in dpr.stakeholders" :key="i">
                <div class="item-avatar">{{ getInitials(s.name) }}</div>
                <div class="item-info">
                  <span class="name">{{ s.name }}</span>
                  <span class="sub">{{ s.role }} · {{ s.organization || '—' }}</span>
                </div>
                <div class="item-meta" v-if="s.email">{{ s.email }}</div>
              </div>
            </div>
          </div>

          <!-- Section: Modules -->
          <div class="detail-section" v-if="dpr.modules?.length">
            <h3><Package :size="16" /> Delivered Modules ({{ dpr.modules.length }})</h3>
            <div class="items-list">
              <div class="item-card" v-for="(m, i) in dpr.modules" :key="i">
                <div class="item-dot" :style="{ background: m.status === 'Delivered' ? '#4ade80' : '#fbbf24' }"></div>
                <div class="item-info">
                  <span class="name">{{ m.module_name }}</span>
                  <span class="sub">{{ m.description || 'No description' }}</span>
                </div>
                <div class="item-badge" :class="m.status === 'Delivered' ? 'green' : 'amber'">{{ m.status }}</div>
              </div>
            </div>
          </div>

          <!-- Section: Servers -->
          <div class="detail-section" v-if="dpr.servers?.length">
            <h3><Server :size="16" /> Infrastructure ({{ dpr.servers.length }})</h3>
            <div class="items-list compact">
              <div class="item-card" v-for="(s, i) in dpr.servers" :key="i">
                <div class="item-info">
                  <span class="name">{{ s.server_name }}</span>
                  <span class="sub">{{ s.ip_address || '—' }} · {{ s.os || '—' }} · {{ s.hosting_type || '—' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Section: Assets -->
          <div class="detail-section" v-if="dpr.assets?.length">
            <h3><HardDrive :size="16" /> Assets ({{ dpr.assets.length }})</h3>
            <div class="items-list compact">
              <div class="item-card" v-for="(a, i) in dpr.assets" :key="i">
                <div class="item-info">
                  <span class="name">{{ a.asset_name }} <span class="qty">×{{ a.quantity || 1 }}</span></span>
                  <span class="sub">{{ a.model || '—' }} · S/N: {{ a.serial_number || '—' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Section: Credentials -->
          <div class="detail-section" v-if="dpr.credentials?.length">
            <h3><KeyRound :size="16" /> Credentials ({{ dpr.credentials.length }})</h3>
            <div class="items-list compact">
              <div class="item-card" v-for="(c, i) in dpr.credentials" :key="i">
                <div class="item-info">
                  <span class="name">{{ c.system }}</span>
                  <span class="sub">{{ c.username || '—' }} · {{ c.access_level || '—' }} · {{ c.password || '—' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Section: Documents -->
          <div class="detail-section" v-if="dpr.documents?.length">
            <h3><BookOpen :size="16" /> Documents ({{ dpr.documents.length }})</h3>
            <div class="items-list compact">
              <div class="item-card" v-for="(d, i) in dpr.documents" :key="i">
                <div class="item-info">
                  <span class="name">{{ d.document_name }}</span>
                  <span class="sub">{{ d.doc_type || '—' }} · {{ d.version || '—' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Section: Operations -->
          <div class="detail-section" v-if="dpr.backup_frequency || dpr.monitoring_tools">
            <h3><Settings :size="16" /> Operations & Maintenance</h3>
            <div class="detail-grid">
              <div class="field">
                <label>Backup</label>
                <div class="value">{{ dpr.backup_frequency || '—' }} · {{ dpr.backup_type || '—' }}</div>
              </div>
              <div class="field">
                <label>Monitoring</label>
                <div class="value">{{ dpr.monitoring_tools || '—' }}</div>
              </div>
              <div class="field">
                <label>Maintenance</label>
                <div class="value">{{ dpr.maintenance_schedule || '—' }}</div>
              </div>
            </div>
          </div>

          <!-- Section: Training -->
          <div class="detail-section" v-if="dpr.training?.length">
            <h3><GraduationCap :size="16" /> Training ({{ dpr.training.length }})</h3>
            <div class="items-list compact">
              <div class="item-card" v-for="(t, i) in dpr.training" :key="i">
                <div class="item-dot" :style="{ background: t.completion_status === 'Completed' ? '#4ade80' : '#fbbf24' }"></div>
                <div class="item-info">
                  <span class="name">{{ t.topic }}</span>
                  <span class="sub">{{ t.trainer || '—' }} · {{ t.training_mode || '—' }} · {{ formatDate(t.training_date) }}</span>
                </div>
                <div class="item-badge" :class="t.completion_status === 'Completed' ? 'green' : 'amber'">{{ t.completion_status }}</div>
              </div>
            </div>
          </div>

          <!-- Section: Financial -->
          <div class="detail-section" v-if="dpr.total_project_value || dpr.financial_invoices?.length">
            <h3><DollarSign :size="16" /> Financial Summary</h3>
            <div class="finance-summary">
              <div class="fs-item">
                <span class="fs-label">Total Value</span>
                <span class="fs-val highlight">{{ dpr.currency || '₹' }} {{ formatNumber(dpr.total_project_value) }}</span>
              </div>
              <div class="fs-item">
                <span class="fs-label">Received</span>
                <span class="fs-val green">{{ dpr.currency || '₹' }} {{ formatNumber(dpr.amount_received) }}</span>
              </div>
              <div class="fs-item">
                <span class="fs-label">Pending</span>
                <span class="fs-val amber">{{ dpr.currency || '₹' }} {{ formatNumber((dpr.pending_amount === 0 && dpr.total_project_value > 0) ? (dpr.total_project_value - (dpr.amount_received || 0)) : dpr.pending_amount) }}</span>
              </div>
            </div>
            <div class="items-list compact mt-3" v-if="dpr.financial_invoices?.length">
              <div class="item-card" v-for="(inv, i) in dpr.financial_invoices" :key="i">
                <div class="item-dot" :style="{ background: inv.status === 'Paid' ? '#4ade80' : '#fbbf24' }"></div>
                <div class="item-info">
                  <span class="name">{{ inv.invoice_no }}</span>
                  <span class="sub">{{ formatDate(inv.invoice_date) }} · {{ dpr.currency || '₹' }} {{ formatNumber(inv.amount) }}</span>
                </div>
                <div class="item-badge" :class="inv.status === 'Paid' ? 'green' : 'amber'">{{ inv.status }}</div>
              </div>
            </div>
          </div>

          <!-- Section: Risks -->
          <div class="detail-section" v-if="dpr.issues?.length">
            <h3><AlertTriangle :size="16" /> Risks & Pending ({{ dpr.issues.length }})</h3>
            <div class="items-list">
              <div class="item-card" v-for="(iss, i) in dpr.issues" :key="i">
                <div class="item-dot" :style="{ background: iss.impact === 'High' ? '#ef4444' : iss.impact === 'Medium' ? '#fbbf24' : '#4ade80' }"></div>
                <div class="item-info">
                  <span class="name">{{ iss.issue_desc }}</span>
                  <span class="sub">{{ iss.issue_type || '—' }} · Owner: {{ iss.owner || '—' }}</span>
                </div>
                <div class="item-badge" :class="iss.impact === 'High' ? 'red' : iss.impact === 'Medium' ? 'amber' : 'green'">{{ iss.impact }}</div>
              </div>
            </div>
          </div>

          <!-- Section: Approvals -->
          <div class="detail-section" v-if="dpr.approvals?.length">
            <h3><PenTool :size="16" /> Sign-off ({{ dpr.approvals.length }})</h3>
            <div class="items-list">
              <div class="item-card" v-for="(a, i) in dpr.approvals" :key="i">
                <div class="item-avatar" :class="{ signed: a.has_signed }">{{ getInitials(a.name) }}</div>
                <div class="item-info">
                  <span class="name">{{ a.name }}</span>
                  <span class="sub">{{ a.party }} · {{ a.designation || '—' }}</span>
                </div>
                <div class="item-badge" :class="a.has_signed ? 'green' : 'amber'">{{ a.has_signed ? 'Signed' : 'Pending' }}</div>
              </div>
            </div>
          </div>

          <!-- Created by -->
          <div class="detail-section" v-if="dpr.created_by">
            <h3><Users :size="16" /> Created By</h3>
            <div class="items-list">
              <div class="item-card">
                <div class="item-avatar">{{ getInitials(dpr.created_by?.full_name || 'U') }}</div>
                <div class="item-info">
                  <span class="name">{{ dpr.created_by?.full_name || 'Unknown' }}</span>
                  <span class="sub">{{ formatDate(dpr.created_at) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div v-if="isAdminMode || dpr.status !== 'Rejected'" class="drawer-footer" :style="(dpr.status === 'Approved' && !isAdminMode) ? { gridTemplateColumns: '1fr' } : {}">
             <button v-if="isAdminMode || (dpr.status !== 'Approved' && dpr.status !== 'Rejected')" class="btn-custom secondary" @click="$emit('edit', dpr)">
                <Pencil :size="16" /> Edit Handover
             </button>
             <button 
               v-if="isAdminMode || dpr.status !== 'Rejected'" 
               class="btn-custom primary" 
               @click="$emit('generate', dpr)"
             >
                <Download v-if="dpr.status === 'Approved' && !isAdminMode" :size="16" />
                <FileText v-else :size="16" />
                {{ (dpr.status === 'Approved' && !isAdminMode) ? 'Download PDF' : 'Download Document' }}
             </button>
        </div>
      </div>
    </div>
    

    
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'
import {
  Clock, X, Pencil, Trash2, FileText, Download, CheckCircle, XCircle, ChevronRight, Check, XSquare, AlertCircle,
  FolderDot, CheckSquare, Settings, Activity, Server, Users, HardDrive, KeyRound, Cpu, Package, ClipboardList, Building2, Calendar, BookOpen
} from 'lucide-vue-next'

const props = defineProps({
  isOpen: Boolean,
  dpr: Object,
  isAdminMode: Boolean
})

const emit = defineEmits(['close', 'edit', 'approve', 'reject', 'deleted', 'generate'])
const isDeleting = ref(false)
const showDeleteConfirm = ref(false)


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
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const getStatusIcon = (status) => {
  if (status === 'Approved') return CheckCircle
  if (status === 'Internal Review') return Clock
  return FileText
}

const handleDeleteClick = async () => {
    if (!showDeleteConfirm.value) {
        showDeleteConfirm.value = true
        setTimeout(() => { showDeleteConfirm.value = false }, 3000)
        return
    }
    
    // Confirmed
    isDeleting.value = true
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token')
        await axios.delete(`http://localhost:8000/api/handover/${props.dpr.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
        emit('deleted')
    } catch(err) {
        console.error(err)
    } finally {
        isDeleting.value = false
        showDeleteConfirm.value = false
    }
}
</script>

<style scoped>
/* === DRAWER OVERLAY & PANEL === */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  z-index: 1000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-overlay.is-open {
  opacity: 1;
  pointer-events: auto;
}

.drawer-panel {
  position: fixed;
  top: 0; right: 0; bottom: 0;
  width: 520px;
  max-width: 90vw;
  background: #111113;
  border-left: 1px solid rgba(255,255,255,0.06);
  transform: translateX(100%);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  z-index: 1001;
}
.drawer-panel.is-open {
  transform: translateX(0);
}

.drawer-content-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* ── HEADER ── */
.drawer-header {
  padding: 24px 32px; border-bottom: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.01);
}
.header-top {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 24px;
}
.id-badge {
  display: flex; align-items: center; gap: 8px;
  background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.05);
}
.id-badge .label { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.4); letter-spacing: 0.05em; margin-top:2px; }
.id-badge .value { font-size: 11px; font-family: 'SF Mono', monospace; font-weight: 600; color: #f59e0b; }

.close-btn {
  background: transparent; border: none; color: rgba(255,255,255,0.5);
  cursor: pointer; padding: 4px; border-radius: 6px; transition: all 0.2s;
  display: flex; align-items: center; justify-content: center;
}
.close-btn:hover { background: rgba(255,255,255,0.08); color: white; }

.approve-btn {
  background: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.2); color: #4ade80;
  height: 32px; padding: 0 12px; border-radius: 16px;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  cursor: pointer; transition: all 0.2s;
  font-size: 11px; font-weight: 600; margin-right: 8px;
}
.approve-btn:hover:not(:disabled) { background: rgba(74, 222, 128, 0.2); border-color: #4ade80; }

.reject-btn {
  background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444;
  height: 32px; padding: 0 12px; border-radius: 16px;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  cursor: pointer; transition: all 0.2s;
  font-size: 11px; font-weight: 600; margin-right: 8px;
}
.reject-btn:hover:not(:disabled) { background: rgba(239, 68, 68, 0.2); border-color: #ef4444; }

.delete-btn {
  background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444;
  height: 32px; padding: 0 12px; border-radius: 16px;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  cursor: pointer; transition: all 0.2s;
  font-size: 11px; font-weight: 600; margin-right: 8px;
}
.delete-btn:hover { background: rgba(239, 68, 68, 0.2); border-color: #ef4444; }

.header-main { margin-bottom: 24px; }
.vendor-group { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.vendor-avatar {
  width: 48px; height: 48px; border-radius: 12px;
  background: rgba(245, 158, 11, 0.15); color: #f59e0b;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; font-weight: 600; border: 1px solid rgba(245, 158, 11, 0.2);
}
.vendor-info h2 { font-size: 20px; font-weight: 600; color: white; margin: 0 0 4px; line-height: 1.2; }
.vendor-info .category { font-size: 13px; color: rgba(255,255,255,0.5); text-transform: capitalize; }

.status-bar {
  display: flex; align-items: center; gap: 8px; padding: 10px 14px;
  border-radius: 8px; font-size: 12px; font-weight: 600; text-transform: capitalize;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.05); color: white;
}
.status-bar.draft { background: rgba(113, 113, 122, 0.1); border-color: rgba(113, 113, 122, 0.2); color: #a1a1aa; }
.status-bar.pending { background: rgba(251, 191, 36, 0.1); border-color: rgba(251, 191, 36, 0.2); color: #fbbf24; }
.status-bar.approved { background: rgba(74, 222, 128, 0.1); border-color: rgba(74, 222, 128, 0.2); color: #4ade80; }
.status-bar.rejected { background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.2); color: #ef4444; }
.status-bar .date { margin-left: auto; font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.4); text-transform: none; }

/* === REJECTION ALERT === */
.rejection-alert {
  margin-bottom: 24px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.15);
  border-radius: 16px;
  padding: 16px 20px;
  display: flex;
  gap: 16px;
  animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.rejection-alert .alert-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.alert-content h4 {
  font-size: 13px;
  font-weight: 700;
  color: #ef4444;
  margin: 0 0 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.alert-content p {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
  margin: 0;
}

/* === SCROLLABLE CONTENT === */
.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px 40px;
}
.drawer-content::-webkit-scrollbar { width: 4px; }
.drawer-content::-webkit-scrollbar-track { background: transparent; }
.drawer-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

/* === SECTIONS === */
.detail-section {
  margin-bottom: 24px;
  animation: sectionIn 0.4s ease forwards;
  opacity: 0;
}
.detail-section:nth-child(1) { animation-delay: 0.05s; }
.detail-section:nth-child(2) { animation-delay: 0.1s; }
.detail-section:nth-child(3) { animation-delay: 0.15s; }
.detail-section:nth-child(4) { animation-delay: 0.2s; }
.detail-section:nth-child(5) { animation-delay: 0.25s; }
.detail-section:nth-child(n+6) { animation-delay: 0.3s; }

@keyframes sectionIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.detail-section h3 {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255,255,255,0.4);
  margin: 0 0 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.detail-grid .field label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255,255,255,0.35);
  margin-bottom: 4px;
  display: block;
}
.detail-grid .field .value {
  font-size: 14px;
  color: #fff;
  font-weight: 500;
}
.detail-grid .field .value-pill {
  display: inline-block;
  padding: 4px 10px;
  background: rgba(74, 222, 128, 0.08);
  border: 1px solid rgba(74, 222, 128, 0.15);
  border-radius: 8px;
  font-size: 13px;
  color: #4ade80;
  font-weight: 500;
}
.font-mono { font-family: 'JetBrains Mono', monospace; }
.mt-3 { margin-top: 12px; }

.notes-box {
  padding: 12px 16px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  font-size: 13px;
  color: rgba(255,255,255,0.7);
  line-height: 1.6;
}
.notes-box strong {
  color: rgba(255,255,255,0.5);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.notes-box p { margin: 4px 0 0; }

/* === ITEMS LIST === */
.items-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.item-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 12px;
  transition: all 0.2s;
}
.item-card:hover {
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.1);
}

.item-avatar {
  width: 36px; height: 36px;
  border-radius: 10px;
  background: rgba(74, 222, 128, 0.1);
  color: #4ade80;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
  border: 1px solid rgba(74, 222, 128, 0.15);
}
.item-avatar.signed {
  background: rgba(74, 222, 128, 0.2);
  border-color: rgba(74, 222, 128, 0.4);
}

.item-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  min-width: 0;
}
.item-info .name {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item-info .name .qty {
  font-size: 11px;
  color: rgba(255,255,255,0.4);
  font-weight: 400;
}
.item-info .sub {
  display: block;
  font-size: 11px;
  color: rgba(255,255,255,0.4);
  margin-top: 2px;
}

.item-meta {
  font-size: 11px;
  color: rgba(255,255,255,0.4);
  flex-shrink: 0;
}

.item-badge {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 3px 8px;
  border-radius: 6px;
  flex-shrink: 0;
}
.item-badge.green { background: rgba(74, 222, 128, 0.12); color: #4ade80; }
.item-badge.amber { background: rgba(251, 191, 36, 0.12); color: #fbbf24; }
.item-badge.red { background: rgba(239, 68, 68, 0.12); color: #ef4444; }

/* === FINANCE SUMMARY === */
.finance-summary {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
}
.fs-item {
  padding: 14px;
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  text-align: center;
}
.fs-label {
  display: block;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255,255,255,0.35);
  margin-bottom: 6px;
}
.fs-val {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  font-family: 'JetBrains Mono', monospace;
}
.fs-val.highlight { color: #4ade80; }
.fs-val.green { color: #4ade80; }
.fs-val.amber { color: #fbbf24; }

.delete-btn.confirm { background: #ef4444; color: white; border-color: #ef4444; }

/* Spin animation */
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.drawer-footer {
  padding: 24px 32px; border-top: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.01); display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
}
.btn-custom {
  height: 44px; border-radius: 8px; font-size: 14px; font-weight: 600;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  cursor: pointer; transition: all 0.2s; border: none;
}
.btn-custom.secondary { background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); }
.btn-custom.secondary:hover { background: rgba(255,255,255,0.1); color: #f59e0b; border-color: rgba(245, 158, 11, 0.3); }
.btn-custom.primary { background: #f59e0b; color: #18181b; }
.btn-custom.primary:hover { background: #fcd34d; }

@media (max-width: 768px) { .drawer-panel { width: 100%; top: auto; bottom: 0; min-height: 80vh; transform: translateY(100%); } .drawer-panel.is-open { transform: translateY(0); } }
</style>
