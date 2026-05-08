<template>
  <Teleport to="body">
    <Transition name="slide-fade">
      <div v-if="isOpen" class="drawer-overlay" @click="close">
        <div class="drawer-panel" @click.stop>
          
          <!-- Header -->
          <div class="drawer-header">
            <div class="header-top">
              <div class="id-badge">
                <span class="label">PAYMENT ID</span>
                <span class="value">{{ payment.payment_id || '—' }}</span>
              </div>
              
              <div style="display: flex; align-items: center;">
                  <button 
                    class="delete-btn" 
                    :class="{ 'confirm': showDeleteConfirm }"
                    @click="handleDeleteClick"
                    :disabled="isDeleting"
                  >
                    <Loader2 v-if="isDeleting" :size="14" class="spin" />
                    <Trash2 v-else :size="14" />
                    <span v-if="showDeleteConfirm && !isDeleting">Confirm?</span>
                    <span v-else-if="!isDeleting">Delete</span>
                  </button>
                  
                  <button class="close-btn" @click="close">
                    <X :size="20" />
                  </button>
              </div>
            </div>
            
            <div class="header-main">
              <div class="vendor-group">
                <div class="vendor-avatar">
                  {{ getInitials(payment.vendor_name) }}
                </div>
                <div class="vendor-info">
                  <h2>{{ payment.vendor_name }}</h2>
                  <span class="category">{{ project.project_type || '—' }}</span>
                </div>
              </div>
              
              <div class="amount-display">
                <span class="currency">{{ payment.currency }}</span>
                <span class="amount">{{ formatAmount(payment.net_receivable_amount || payment.amount_paid) }}</span>
              </div>
            </div>

            <!-- Status Bar -->
            <div class="status-bar" :class="payment.status?.toLowerCase()">
              <component :is="getStatusIcon(payment.status)" :size="16" />
              <span>{{ payment.status }}</span>
              <span class="date">Paid on {{ formatDate(payment.payment_date) }}</span>
            </div>
          </div>

          <!-- Scrollable Content -->
          <div class="drawer-content">
            
            <!-- Section: Transaction Details -->
            <div class="detail-section">
              <h3>Transaction Details</h3>
              <div class="detail-grid">
                <div class="field">
                  <label>Payment Mode</label>
                  <div class="value-pill">
                    <CreditCard :size="14" />
                    {{ payment.payment_mode || 'Standard' }}
                  </div>
                </div>
                <div class="field">
                  <label>Reference / UTR</label>
                  <div class="value font-mono">{{ payment.transaction_ref || payment.utr_transaction_ref || '—' }}</div>
                </div>
                <div class="field">
                  <label>Invoice Number</label>
                  <div class="value font-mono">{{ payment.invoice_number || '—' }}</div>
                </div>
                <div class="field">
                  <label>Invoice Date</label>
                  <div class="value">{{ formatDate(payment.invoice_date) }}</div>
                </div>
              </div>
            </div>

            <!-- Section: Bank & Account -->
            <div class="detail-section">
              <h3>Beneficiary Details</h3>
              <div class="detail-card">
                <div class="bank-row">
                  <Landmark :size="18" class="icon" />
                  <div class="bank-info">
                    <span class="bank-name">{{ payment.bank_name || 'Bank Not Specified' }}</span>
                    <span class="ifsc">IFSC: {{ payment.ifsc_swift_code || '—' }}</span>
                  </div>
                </div>
                <div class="account-row">
                  <div class="field-mini">
                    <label>Account Holder</label>
                    <div class="val">{{ payment.account_holder_name || '—' }}</div>
                  </div>
                  <div class="field-mini" v-if="payment.cheque_no">
                     <label>Cheque No</label>
                     <div class="val font-mono">{{ payment.cheque_no }}</div>
                  </div>
                  <div class="field-mini">
                    <label>Account Number</label>
                    <div class="val font-mono">{{ payment.account_number || '—' }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Section: Cost Breakdown -->
            <div class="detail-section">
              <h3>Cost Breakdown</h3>
              <div class="breakdown-list">

                <div class="break-row">
                  <span>Gross Amount</span>
                  <span>{{ formatCurrency(payment.invoice_amount_gross, payment.currency) }}</span>
                </div>
                <div class="break-row sub" v-if="payment.gst_percent > 0">
                  <span>GST ({{ payment.gst_percent }}%)</span>
                  <span class="text-green-400">+ {{ formatCurrency(payment.invoice_amount_gross * payment.gst_percent / 100, payment.currency) }}</span>
                </div>
                <div class="break-row sub" v-if="payment.tds_percent > 0">
                  <span>TDS Deduction ({{ payment.tds_percent }}%)</span>
                  <span class="negative">- {{ formatCurrency(payment.invoice_amount_gross * payment.tds_percent / 100, payment.currency) }}</span>
                </div>
                 <div class="break-row sub" v-if="payment.other_deductions > 0">
                  <span>Other Deductions {{ payment.other_deductions_desc ? `(${payment.other_deductions_desc})` : '' }} ({{ payment.other_deductions }}%)</span>
                  <span class="negative">- {{ formatCurrency(payment.invoice_amount_gross * payment.other_deductions / 100, payment.currency) }}</span>
                </div>
                <div class="divider"></div>
                <div class="break-row total">
                  <span>Net Payable</span>
                  <span class="highlight">{{ formatCurrency(payment.net_receivable_amount, payment.currency) }}</span>
                </div>
              </div>
            </div>

              <!-- Section: Linked Milestones -->
            <div class="detail-section" v-if="linkedMilestones.length">
              <h3>Linked Milestones</h3>
              <div class="milestone-list">
                 <div v-for="m in linkedMilestones" :key="m.id" class="ms-pill">
                    <span class="ms-name">{{ m.name }}</span>
                    <span class="ms-amt">{{ formatCurrency(m.budget_amount_converted || m.budget_amount, project.currency || m.currency) }}</span>
                 </div>
              </div>
            </div>

            <!-- Section: Attachments -->
            <div class="detail-section">
              <h3>Attachments ({{ payment.attachments?.length || 0 }})</h3>
              <div class="attachment-grid" v-if="payment.attachments?.length">
                <div 
                  v-for="(file, idx) in payment.attachments" 
                  :key="idx"
                  class="file-card"
                  @click="openFile(file.file_url)"
                >
                  <div class="file-icon">
                    <FileText :size="20" />
                  </div>
                  <div class="file-info">
                    <span class="name">{{ file.file_name || 'Document' }}</span>
                    <span class="meta">{{ formatSize(file.file_size_bytes) }} • {{ file.category || 'Attachment' }}</span>
                  </div>
                  <ExternalLink :size="14" class="link-icon" />
                </div>
              </div>
              <div v-else class="empty-files">
                No attachments
              </div>
            </div>

             <!-- Section: Ledger & Audit -->
            <div class="detail-section">
               <h3>Audit Trail</h3>
               <div class="audit-info">
                  <p>Recorded by <span class="user-highlight">{{ creatorName }}</span></p>
                  <p class="time">{{ new Date(payment.created_at).toLocaleString() }}</p>
               </div>
            </div>

          </div>

          <!-- Footer Actions -->
          <div class="drawer-footer">
             <button class="btn-custom secondary" @click="edit">
                <Edit2 :size="16" /> Edit Payment
             </button>
             <button class="btn-custom primary" @click="handleDownloadReceipt">
               <Download :size="16" /> Download Receipt
             </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, ref } from 'vue'
import { X, CreditCard, Landmark, FileText, ExternalLink, Download, Check, Clock, AlertCircle, Edit2, Trash2, Loader2 } from 'lucide-vue-next'

const props = defineProps({
  isOpen: Boolean,
  payment: { type: Object, default: () => ({}) },
  milestones: { type: Array, default: () => [] },
  currentUser: { type: Object, default: () => ({}) },
  project: { type: Object, default: () => ({}) }
})

// Linked Milestones
const linkedMilestones = computed(() => {
    if (!props.payment.milestone_ids || !props.milestones.length) return []
    return props.milestones.filter(m => props.payment.milestone_ids.includes(m.id))
})

// Creator Name
const creatorName = computed(() => {
    // Priority: Use the backend provided user details (which includes full name)
    if (props.payment.created_by?.full_name) {
         return props.payment.created_by.full_name
    }
    
    // Fallback: Check ID match with current user
    if (props.payment.created_by_id === props.currentUser.id) {
        return `${props.currentUser.full_name || 'User'} (You)`
    }
    
    return 'System'
})

const emit = defineEmits(['close', 'edit'])

const close = () => emit('close')
const edit = () => emit('edit', props.payment)

const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()
}

const formatAmount = (val) => {
  return new Intl.NumberFormat('en-US').format(val || 0)
}

const formatCurrency = (val, curr) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: curr || 'USD' }).format(val || 0)
}

const formatDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
}

const formatSize = (bytes) => {
  if (!bytes) return '0 KB'
  return Math.round(bytes / 1024) + ' KB'
}

const getStatusIcon = (status) => {
  if (status === 'Completed' || status === 'Received') return Check
  if (status === 'Pending') return Clock
  return AlertCircle
}

const openFile = (url) => {
  if (!url) return
  // Handle relative vs absolute paths
  const fullUrl = url.startsWith('http') ? url : `http://localhost:8000/${url}`
  window.open(fullUrl, '_blank')
}

// Delete Logic
const isDeleting = ref(false)
const showDeleteConfirm = ref(false)
import axios from 'axios'
import { useToast } from 'vue-toastification'
const { success: showSuccess, error: showError } = useToast()

const handleDeleteClick = async () => {
    if (!showDeleteConfirm.value) {
        showDeleteConfirm.value = true
        // Auto-reset confirmation after 3s
        setTimeout(() => { showDeleteConfirm.value = false }, 3000)
        return
    }
    
    // Confirmed
    isDeleting.value = true
    try {
        const token = localStorage.getItem('user_token')
        await axios.delete(`http://localhost:8000/api/project-financials/payments/${props.payment.id}`, {
             headers: { Authorization: `Bearer ${token}` }
        })
        
        showSuccess('Payment deleted successfully')
        emit('deleted', props.payment.id)
        close()
        
    } catch (e) {
        console.error(e)
        showError('Failed to delete payment')
    } finally {
        isDeleting.value = false
        showDeleteConfirm.value = false
    }
}

import { generatePaymentReceipt } from '../../../utils/receiptGenerator'

const handleDownloadReceipt = () => {
    try {
        generatePaymentReceipt(props.payment, props.project, props.milestones, props.currentUser)
        showSuccess('Receipt downloaded')
    } catch (e) {
        console.error(e)
        showError('Failed to generate receipt')
    }
}
</script>

<style scoped>
/* Transition */
.slide-fade-enter-active, .slide-fade-leave-active { transition: opacity 0.3s ease; }
.slide-fade-enter-from, .slide-fade-leave-to { opacity: 0; }
.slide-fade-enter-active .drawer-panel, .slide-fade-leave-active .drawer-panel { transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-fade-enter-from .drawer-panel { transform: translateX(100%); }
.slide-fade-leave-to .drawer-panel { transform: translateX(100%); }

/* Layout */
.drawer-overlay {
  position: fixed; inset: 0; 
  background: rgba(0, 0, 0, 0.4); 
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex; justify-content: flex-end;
}

.drawer-panel {
  width: 100%; max-width: 480px;
  background: rgba(15, 15, 17, 0.85); /* Transparent Dark */
  backdrop-filter: blur(20px); /* Glassmorphism */
  -webkit-backdrop-filter: blur(20px);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: -20px 0 50px rgba(0,0,0,0.5);
  display: flex; flex-direction: column;
  height: 100vh;
}

/* Header */
.drawer-header {
  padding: 24px;
  background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.header-top {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 20px;
}
.id-badge {
  display: flex; flex-direction: column;
}
.id-badge .label { font-size: 10px; color: rgba(255,255,255,0.4); letter-spacing: 0.1em; font-weight: 700; }
.id-badge .value { font-family: 'SF Mono', monospace; font-size: 13px; color: rgba(255,255,255,0.7); }

.close-btn {
  background: rgba(255,255,255,0.05); border: none; color: rgba(255,255,255,0.6);
  width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.2s;
}
.close-btn:hover { background: rgba(255,255,255,0.1); color: white; }

.delete-btn {
  background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444;
  height: 32px; padding: 0 12px; border-radius: 16px;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  cursor: pointer; transition: all 0.2s;
  font-size: 11px; font-weight: 600;
  margin-right: 8px; /* Spacing from close btn */
}
.delete-btn:hover { background: rgba(239, 68, 68, 0.2); border-color: #ef4444; }
.delete-btn.confirm { background: #ef4444; color: white; border-color: #ef4444; }

.header-main {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 20px;
}

.vendor-group { display: flex; gap: 12px; align-items: center; }
.vendor-avatar {
  width: 48px; height: 48px; border-radius: 12px;
  background: linear-gradient(135deg, #F59E0B, #D97706);
  color: white; font-weight: 700; font-size: 16px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}
.vendor-info h2 { font-size: 18px; font-weight: 600; color: white; margin: 0; }
.vendor-info .category { font-size: 13px; color: rgba(255,255,255,0.5); }

.amount-display { text-align: right; }
.amount-display .currency { display: block; font-size: 12px; color: rgba(255,255,255,0.4); }
.amount-display .amount { font-size: 24px; font-weight: 700; color: white; letter-spacing: -0.02em; }

.status-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; border-radius: 8px;
  font-size: 13px; font-weight: 500;
}
.status-bar.completed, .status-bar.received { background: rgba(74, 222, 128, 0.1); color: #4ade80; }
.status-bar.pending { background: rgba(251, 191, 36, 0.1); color: #fbbf24; }
.status-bar.failed { background: rgba(248, 113, 113, 0.1); color: #f87171; }
.status-bar .date { margin-left: auto; color: inherit; opacity: 0.7; font-weight: 400; font-size: 12px; }

/* Content */
.drawer-content {
  flex: 1; overflow-y: auto; padding: 24px;
  display: flex; flex-direction: column; gap: 32px;
}

.detail-section h3 {
  font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.05em;
  margin-bottom: 16px;
}

.detail-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
}
.field label { display: block; font-size: 11px; color: rgba(255,255,255,0.4); margin-bottom: 4px; }
.field .value { font-size: 14px; color: #f5f5f7; }
.value-pill {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 6px;
  font-size: 13px; color: rgba(255,255,255,0.8);
}

.detail-card {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
  border-radius: 12px; padding: 16px;
}
.bank-row {
  display: flex; align-items: center; gap: 12px; margin-bottom: 16px; padding-bottom: 16px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.bank-row .icon { color: #F59E0B; }
.bank-name { display: block; font-weight: 600; color: white; font-size: 15px; }
.ifsc { display: block; font-size: 12px; color: rgba(255,255,255,0.4); font-family: 'SF Mono', monospace; }

.account-row { display: flex; justify-content: space-between; }
.field-mini label { display: block; font-size: 10px; color: rgba(255,255,255,0.4); }
.field-mini .val { font-size: 13px; color: #f5f5f7; }

/* Breakdown */
.breakdown-list {
  background: rgba(255,255,255,0.02); border-radius: 12px; padding: 16px;
}
.break-row { display: flex; justify-content: space-between; font-size: 13px; color: rgba(255,255,255,0.6); margin-bottom: 8px; }
.break-row.sub { font-size: 12px; padding-left: 12px; border-left: 2px solid rgba(255,255,255,0.05); }
.break-row .negative { color: #f87171; }
.divider { height: 1px; background: rgba(255,255,255,0.1); margin: 12px 0; }
.break-row.total { font-size: 16px; font-weight: 600; color: white; margin-bottom: 0; }

/* Attachments */
.attachment-grid { display: grid; grid-template-columns: 1fr; gap: 8px; }
.file-card {
  display: flex; align-items: center; gap: 12px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.05);
  padding: 12px; border-radius: 8px; cursor: pointer;
  transition: all 0.2s;
}
.file-card:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.1); }
.file-icon { color: #8b5cf6; }
.file-info { flex: 1; display: flex; flex-direction: column; }
.file-info .name { font-size: 13px; color: #f5f5f7; font-weight: 500; }
.file-info .meta { font-size: 11px; color: rgba(255,255,255,0.4); }
.link-icon { color: rgba(255,255,255,0.3); }

/* Audit */
.audit-info { font-size: 12px; color: rgba(255,255,255,0.4); }
.audit-info .time { color: rgba(255,255,255,0.2); margin-top: 2px; }

/* Footer */
/* Footer */
.drawer-footer {
  padding: 24px; border-top: 1px solid rgba(255,255,255,0.05);
  display: flex; gap: 12px;
}
.btn-custom {
  flex: 1; padding: 14px; border-radius: 12px; font-weight: 600; font-size: 13px;
  cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: all 0.2s; letter-spacing: 0.01em;
}
.btn-custom.secondary { 
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; 
}
.btn-custom.secondary:hover { background: rgba(255,255,255,0.1); transform: translateY(-1px); }

.btn-custom.primary { 
    background: #F59E0B; border: none; color: black; /* Removed shadow/glow defaults */
}
.btn-custom.primary:hover { background: #fbbf24; transform: translateY(-1px); }

/* Milestones */
.milestone-list { display: flex; flex-direction: column; gap: 8px; }
.ms-pill {
    display: flex; justify-content: space-between; align-items: center;
    background: rgba(255,255,255,0.03); padding: 10px 12px; border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.05);
}
.ms-name { font-size: 13px; color: #f5f5f7; }
.ms-amt { font-family: 'SF Mono', monospace; font-size: 12px; color: rgba(255,255,255,0.6); }

.user-highlight { color: #f5f5f7; font-weight: 500; }
</style>
