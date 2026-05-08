<template>
  <div class="drawer-overlay" :class="{ 'is-open': isOpen }" @click.self="$emit('close')">
    <div class="drawer-panel" :class="{ 'is-open': isOpen }">
      <div v-if="sla" class="drawer-content-wrapper">
          
        <!-- Header -->
        <div class="drawer-header">
          <div class="header-top">
            <div class="id-badge">
              <span class="label">SLA REF</span>
              <span class="value">{{ sla.contract_reference || 'SLA-DRAFT' }}</span>
            </div>
            
            <div style="display: flex; align-items: center; gap: 8px;">
                <template v-if="isAdminMode && sla.status === 'Pending'">
                  <button class="approve-btn" @click="$emit('approve', sla)">
                    <Check :size="14" />
                    <span>Approve</span>
                  </button>
                  <button class="reject-btn" @click="$emit('reject', sla)">
                    <XSquare :size="14" />
                    <span>Reject</span>
                  </button>
                </template>

                <button 
                  v-if="(isAdminMode || (sla.status !== 'Approved' && sla.status !== 'Rejected')) && (!isAdminMode || sla.status !== 'Pending')" 
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
                {{ getInitials(sla.client_organization_name || 'CL') }}
              </div>
              <div class="vendor-info">
                <h2>{{ sla.title || 'Untitled Agreement' }}</h2>
                <span class="category">{{ sla.client_organization_name || 'No Client' }} &bull; {{ sla.agreement_type || 'General SLA' }}</span>
              </div>
            </div>
            
            <div class="amount-display">
              <span class="currency">{{ sla.currency || 'INR' }}</span>
              <span class="amount">{{ formatAmount(sla.agreement_value) }}</span>
            </div>
          </div>

          <!-- Status Bar -->
          <div class="status-bar" :class="(sla.status || 'draft').toLowerCase()">
            <component :is="getStatusIcon(sla.status)" :size="16" />
            <span>{{ sla.status || 'Draft' }}</span>
            <span class="date">Recorded on {{ formatDate(sla.created_at) }}</span>
          </div>
        </div>

        <!-- Scrollable Content -->
        <div class="drawer-content nano-scroll">
          
          <!-- Rejection Reason (Critical Feedback) -->
          <div v-if="sla.status === 'Rejected' && sla.rejection_reason" class="detail-section rejection-section animation-pulse-red">
             <div class="notes-box rejection-box">
                <div class="rejection-header">
                    <XCircle :size="14" />
                    <strong>Admin Feedback</strong>
                </div>
                <p>{{ sla.rejection_reason }}</p>
             </div>
          </div>
          
          <!-- Section: Core Details -->
          <div class="detail-section">
            <h3>SLA Details</h3>
            <div class="detail-grid">
              <div class="field">
                <label>Billing Frequency</label>
                <div class="value-pill">
                  <Calendar :size="14" />
                  {{ sla.billing_frequency || 'Monthly' }}
                </div>
              </div>
              <div class="field">
                <label>Payment Method</label>
                <div class="value-pill paid-pill">
                  <CreditCard :size="14" />
                  {{ sla.payment_method || 'Bank Transfer' }}
                </div>
              </div>
              <div class="field">
                <label>Start Date</label>
                <div class="value font-mono">{{ formatDate(sla.start_date) || '—' }}</div>
              </div>
              <div class="field">
                <label>End Date</label>
                <div class="value font-mono">{{ formatDate(sla.end_date) || '—' }}</div>
              </div>
              <div class="field">
                <label>Renewal Type</label>
                <div class="value">{{ sla.renewal_type || 'Auto Renewal' }}</div>
              </div>
              <div class="field">
                <label>Version</label>
                <div class="value font-mono">v{{ sla.version || '1.0' }}</div>
              </div>
            </div>
            
            <div class="notes-box mt-3" v-if="sla.description">
               <strong>Description:</strong>
               <p>{{ sla.description }}</p>
            </div>
          </div>

          <!-- Section: Client & Provider Info -->
          <div class="detail-section">
            <h3>Client & Provider</h3>
            <div class="detail-card">
              <!-- Client -->
              <div class="bank-row">
                <Building2 :size="18" class="icon" />
                <div class="bank-info">
                  <span class="bank-name">{{ sla.client_organization_name || 'Not Provided' }}</span>
                  <span class="ifsc" v-if="sla.client_address">{{ sla.client_address }}</span>
                </div>
              </div>
              <div class="account-row" v-if="sla.client_contact_person || sla.client_email">
                <div class="field-mini" v-if="sla.client_contact_person">
                  <label>Contact Person</label>
                  <div class="val">{{ sla.client_contact_person }}</div>
                </div>
                <div class="field-mini" v-if="sla.client_email">
                   <label>Email</label>
                   <div class="val">{{ sla.client_email }}</div>
                </div>
                <div class="field-mini" v-if="sla.client_phone">
                   <label>Phone</label>
                   <div class="val">{{ sla.client_phone }}</div>
                </div>
              </div>
              
              <div class="divider"></div>
              
              <!-- Provider -->
              <div class="bank-row">
                <Server :size="18" class="icon" />
                <div class="bank-info">
                  <span class="bank-name">{{ sla.provider_name || 'Fourconnect Solutions' }}</span>
                  <span class="ifsc" v-if="sla.provider_tax_id">Tax ID: {{ sla.provider_tax_id }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Section: Scope & Services -->
          <div class="detail-section" v-if="sla.services_covered">
             <h3>Service Scope</h3>
             <div class="notes-box">
                <p>{{ sla.services_covered }}</p>
             </div>
          </div>

          <!-- Section: Monitoring & Reporting -->
          <div class="detail-section">
            <h3>Monitoring & Telemetry</h3>
            <div class="detail-card">
                <div class="detail-grid" style="margin-bottom:0px;">
                    <div class="field">
                        <label>Reporting Freq.</label>
                        <div class="value-pill">
                            <Activity :size="12" /> {{ sla.reporting_frequency || 'Monthly' }}
                        </div>
                    </div>
                    <div class="field">
                        <label>Delivery Method</label>
                        <div class="value">{{ sla.report_delivery_method || 'Email' }}</div>
                    </div>
                </div>
                
                <div class="account-row" v-if="sla.monitoring_dashboard_url || sla.alert_notification_email">
                    <div class="field-mini" v-if="sla.monitoring_dashboard_url">
                        <label>Dashboard URL</label>
                        <div class="val font-mono"><a :href="sla.monitoring_dashboard_url" target="_blank" style="color:#60a5fa; text-decoration:none;">Link <ExternalLink :size="10"/></a></div>
                    </div>
                     <div class="field-mini" v-if="sla.alert_notification_email">
                        <label>Alert Email</label>
                        <div class="val">{{ sla.alert_notification_email }}</div>
                    </div>
                </div>
                
                <div class="account-row" v-if="sla.monitoring_tools && sla.monitoring_tools.length">
                    <div class="field-mini" style="width:100%">
                        <label>Tools Used</label>
                        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:4px;">
                            <span v-for="(tool, i) in sla.monitoring_tools" :key="i" class="tool-tag">{{ tool }}</span>
                        </div>
                    </div>
                </div>
            </div>
          </div>

          <!-- Section: Compliance & Security -->
          <div class="detail-section">
             <h3>Security & Legal</h3>
             <div class="breakdown-list">
                 <div class="break-row sub" style="justify-content: space-between;">
                     <span style="color:white; font-size:13px;">Data Retention</span>
                     <span class="font-mono text-amber-400">{{ sla.data_retention_policy || '365 Days' }}</span>
                 </div>
                 <div class="break-row sub" style="justify-content: space-between;">
                     <span style="color:white; font-size:13px;">Incident Reporting</span>
                     <span class="font-mono text-amber-400">{{ sla.incident_reporting_time || '24 Hours' }}</span>
                 </div>
                 <div class="divider" style="height: 1px; background: rgba(255,255,255,0.08); margin: 4px 0;"></div>
                 
                 <div v-if="sla.security_measures && sla.security_measures.length" style="padding: 12px 16px;">
                     <label style="font-size:10px; color:rgba(255,255,255,0.4); text-transform:uppercase; margin-bottom:8px; display:block;">Security Measures</label>
                     <div style="display:flex; gap:6px; flex-wrap:wrap;">
                         <span v-for="(sec, i) in sla.security_measures" :key="i" class="tool-tag sec-tag"><Shield :size="10"/> {{ sec }}</span>
                     </div>
                 </div>
                 <div v-if="sla.compliance_standards && sla.compliance_standards.length" style="padding: 0 16px 16px;">
                     <label style="font-size:10px; color:rgba(255,255,255,0.4); text-transform:uppercase; margin-bottom:8px; display:block;">Compliance</label>
                     <div style="display:flex; gap:6px; flex-wrap:wrap;">
                         <span v-for="(cmp, i) in sla.compliance_standards" :key="i" class="tool-tag sec-tag"><FileCheck :size="10"/> {{ cmp }}</span>
                     </div>
                 </div>
             </div>
             
             <div class="notes-box mt-3 warning-box" v-if="sla.liability_limit">
                 <strong>Liability Limit:</strong>
                 <p>{{ sla.liability_limit }}</p>
             </div>
          </div>

          <!-- Audit Trail -->
          <div class="detail-section" style="padding-bottom: 32px">
             <h3>Audit Trail</h3>
             <div class="audit-card">
                <div class="audit-avatar">{{ getInitials(sla.created_by?.full_name || 'U') }}</div>
                <div class="audit-info">
                   <span class="audit-action">Recorded SLA</span>
                   <span class="audit-user">by {{ sla.created_by?.full_name || 'Unknown User' }}</span>
                   <span class="audit-time">{{ formatDate(sla.created_at) }}</span>
                </div>
             </div>
          </div>

        </div>

        <!-- Footer Actions -->
        <div v-if="isAdminMode || (sla.status !== 'Rejected')" class="drawer-footer" :style="(sla.status === 'Approved' && !isAdminMode) ? { gridTemplateColumns: '1fr' } : {}">
             <button v-if="isAdminMode || (sla.status !== 'Approved' && sla.status !== 'Rejected')" class="btn-custom secondary" @click="$emit('edit', sla)">
                <Edit2 :size="16" /> Edit SLA
             </button>
             <button v-if="isAdminMode || sla.status !== 'Rejected'" class="btn-custom primary" @click="$emit('generate', sla)">
                <Download v-if="sla.status === 'Approved' && !isAdminMode" :size="16" />
                <FileText v-else :size="16" />
                {{ (sla.status === 'Approved' && !isAdminMode) ? 'Download SLA Document' : (isAdminMode ? 'View Document' : 'View Document') }}
             </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Clock, X, Edit2, Trash2, FileText, Check, XSquare, CheckCircle, AlertCircle, Calendar, Building2, CreditCard, Server, Activity, ExternalLink, Shield, FileCheck, Download, Loader2 } from 'lucide-vue-next'
import { defineProps, defineEmits, ref } from 'vue'
import axios from 'axios'
import { useToast } from '../../composables/useToast'

const props = defineProps({
  isOpen: Boolean,
  sla: Object,
  isAdminMode: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'edit', 'generate', 'deleted', 'approve', 'reject'])
const { info, success, error: showError } = useToast()

const isDeleting = ref(false)
const showDeleteConfirm = ref(false)

const handleDeleteClick = async () => {
    if (!showDeleteConfirm.value) {
        showDeleteConfirm.value = true
        setTimeout(() => { showDeleteConfirm.value = false }, 3000)
        return
    }
    
    // Confirmed
    isDeleting.value = true
    
    try {
        const token = props.isAdminMode ? localStorage.getItem('admin_token') : localStorage.getItem('user_token')
        await axios.delete(`http://localhost:8000/api/sla/${props.sla.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
        success("SLA Deleted")
        emit('deleted')
    } catch(err) {
        showError("Failed to delete SLA")
        console.error(err)
    } finally {
        isDeleting.value = false
        showDeleteConfirm.value = false
    }
}

const getInitials = (name) => {
  if (!name) return 'EX'
  return name.substring(0, 2).toUpperCase()
}

const formatAmount = (amt) => {
  return Number(amt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const getStatusIcon = (status) => {
  const s = (status || '').toLowerCase()
  if (s === 'approved') return CheckCircle
  if (s === 'rejected') return AlertCircle
  return Clock // pending, submitted, draft
}

const formatDate = (d) => {
  if (!d) return ''
  const dt = new Date(d)
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<style scoped>
.drawer-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  backdrop-filter: blur(2px); z-index: 1000;
  display: flex; justify-content: flex-end;
  opacity: 0; pointer-events: none; transition: opacity 0.3s ease;
}
.drawer-overlay.is-open { opacity: 1; pointer-events: auto; }

/* Header */
.drawer-panel {
  width: 100%; max-width: 500px; height: 100%;
  background: rgba(24, 24, 27, 0.7); backdrop-filter: blur(24px);
  border-left: 1px solid rgba(255,255,255,0.08);
  display: flex; flex-direction: column;
  box-shadow: -10px 0 40px rgba(0,0,0,0.5);
  transform: translateX(100%); transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-panel.is-open { transform: translateX(0); }

.drawer-content-wrapper { display: flex; flex-direction: column; height: 100%; }

/* Header */
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
  font-size: 11px; font-weight: 600;
  margin-right: 8px;
}
.approve-btn:hover:not(:disabled) { background: rgba(74, 222, 128, 0.2); border-color: #4ade80; }
.approve-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.reject-btn {
  background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444;
  height: 32px; padding: 0 12px; border-radius: 16px;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  cursor: pointer; transition: all 0.2s;
  font-size: 11px; font-weight: 600;
  margin-right: 8px;
}
.reject-btn:hover:not(:disabled) { background: rgba(239, 68, 68, 0.2); border-color: #ef4444; }
.reject-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.delete-btn {
  background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444;
  height: 32px; padding: 0 12px; border-radius: 16px;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  cursor: pointer; transition: all 0.2s;
  font-size: 11px; font-weight: 600;
  margin-right: 8px;
}
.delete-btn:hover { background: rgba(239, 68, 68, 0.2); border-color: #ef4444; }
.delete-btn.confirm { background: #ef4444; color: white; border-color: #ef4444; }
.delete-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

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

.amount-display { display: flex; align-items: baseline; gap: 6px; }
.amount-display .currency { font-size: 16px; color: rgba(255,255,255,0.5); font-weight: 500; }
.amount-display .amount { font-size: 32px; font-weight: 700; color: white; font-family: 'SF Mono', monospace; letter-spacing: -0.02em; }

.status-bar {
  display: flex; align-items: center; gap: 8px; padding: 10px 14px;
  border-radius: 8px; font-size: 12px; font-weight: 600; text-transform: capitalize;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.05); color: white;
}
.status-bar.draft { background: rgba(113, 113, 122, 0.1); border-color: rgba(113, 113, 122, 0.2); color: #a1a1aa; }
.status-bar.pending { background: rgba(251, 191, 36, 0.1); border-color: rgba(251, 191, 36, 0.2); color: #fbbf24; }
.status-bar.approved { background: rgba(74, 222, 128, 0.1); border-color: rgba(74, 222, 128, 0.2); color: #4ade80; }
.status-bar.rejected { background: rgba(248, 113, 113, 0.1); border-color: rgba(248, 113, 113, 0.2); color: #f87171; }
.status-bar .date { margin-left: auto; font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.4); text-transform: none; }

/* Content */
.drawer-content {
  flex: 1; overflow-y: auto; padding: 24px 32px; display: flex; flex-direction: column; gap: 32px;
}
.nano-scroll::-webkit-scrollbar { width: 6px; }
.nano-scroll::-webkit-scrollbar-track { background: transparent; }
.nano-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

.detail-section h3 {
  font-size: 12px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.08em; color: rgba(255,255,255,0.4); margin: 0 0 16px;
}

.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px 16px; }
.field label { display: block; font-size: 11px; color: rgba(255,255,255,0.4); margin-bottom: 6px; }
.field .value { font-size: 14px; color: #e4e4e7; font-weight: 500; }
.font-mono { font-family: 'SF Mono', monospace; }
.value-pill {
  display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px;
  background: rgba(255,255,255,0.05); border-radius: 6px;
  font-size: 12px; font-weight: 500; color: #e4e4e7; text-transform: capitalize;
}
.paid-pill { background: rgba(74, 222, 128, 0.1); color: #4ade80; }

.notes-box { background: rgba(255,255,255,0.03); border-radius: 8px; padding: 12px 16px; border-left: 3px solid rgba(255,255,255,0.2); }
.notes-box strong { font-size: 11px; color: rgba(255,255,255,0.5); text-transform: uppercase; margin-bottom: 4px; display: block; }
.notes-box p { font-size: 13px; color: rgba(255,255,255,0.8); margin: 0; line-height: 1.5; white-space: pre-wrap; }
.warning-box { border-left-color: #f59e0b; background: rgba(245, 158, 11, 0.05); }
.rejection-box { border-left-color: #ef4444; background: rgba(239, 68, 68, 0.05); }
.rejection-header { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; color: #ef4444; }
.rejection-header strong { font-size: 11px; text-transform: uppercase; margin-bottom: 0; }

.animation-pulse-red { animation: pulseRed 2s infinite; }
@keyframes pulseRed {
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

.warning-box strong { color: rgba(245, 158, 11, 0.8); }

.mt-3 { margin-top: 16px; }

.detail-card {
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 16px;
}
.bank-row { display: flex; gap: 12px; align-items: flex-start; }
.bank-row .icon { color: rgba(255,255,255,0.4); margin-top: 2px; }
.bank-info { display: flex; flex-direction: column; gap: 4px; }
.bank-name { font-size: 14px; font-weight: 600; color: white; }
.ifsc { font-size: 12px; color: rgba(255,255,255,0.6); }
.account-row { display: flex; gap: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.06); }
.field-mini label { font-size: 10px; color: rgba(255,255,255,0.4); margin-bottom: 4px; display: block; text-transform: uppercase; }
.field-mini .val { font-size: 13px; color: #e4e4e7; font-weight: 500; }
.divider { height: 1px; background: rgba(255,255,255,0.06); width: 100%; margin: 8px 0; }

.breakdown-list {
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
}
.break-row { display: flex; padding: 12px 16px; font-size: 14px; }
.break-row.sub { padding: 10px 16px; font-size: 13px; color: rgba(255,255,255,0.7); }
.text-amber-400 { color: #fbbf24; }

.tool-tag {
    display: inline-flex; padding: 4px 8px; font-size: 11px; font-family: 'SF Mono', monospace;
    background: rgba(255,255,255,0.1); border-radius: 4px; color: rgba(255,255,255,0.8);
}
.sec-tag { align-items: center; gap: 4px; background: rgba(74, 222, 128, 0.1); color: #4ade80; }

.audit-card {
  display: flex; gap: 16px; align-items: center; background: rgba(255,255,255,0.02);
  padding: 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06);
}
.audit-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: rgba(245, 158, 11, 0.15); color: #f59e0b;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 600; border: 1px solid rgba(245, 158, 11, 0.2);
}
.audit-info { display: flex; flex-direction: column; }
.audit-action { font-size: 14px; color: white; font-weight: 500; margin-bottom: 2px; }
.audit-user { font-size: 13px; color: #f59e0b; font-weight: 500; margin-bottom: 4px; }
.audit-time { font-size: 11px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.05em; }

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
