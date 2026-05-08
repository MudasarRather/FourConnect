<template>
  <Teleport to="body">
    <Transition name="slide-fade">
      <div v-if="isOpen" class="drawer-overlay" @click="close">
        <div class="drawer-panel" @click.stop>
          
          <!-- Header -->
          <div class="drawer-header">
            <div class="header-top">
              <div class="id-badge">
                <span class="label">EXPENSE ID</span>
                <span class="value">{{ expense.id ? expense.id.substring(0,8).toUpperCase() : '—' }}</span>
              </div>
              
              <div style="display: flex; align-items: center; gap: 8px;">
                  <!-- Approve & Reject: only for admin, submitted expenses >= 50k -->
                  <template v-if="isAdmin && (expense.total_after_tax >= 50000 || expense.amount >= 50000) && expense.expense_status?.toLowerCase() === 'submitted'">
                    <button 
                      class="approve-btn" 
                      @click="handleApproveClick"
                      :disabled="isApproving"
                    >
                      <Loader2 v-if="isApproving" :size="14" class="spin" />
                      <Check v-else :size="14" />
                      <span>Approve</span>
                    </button>

                    <button 
                      class="reject-btn" 
                      @click="isRejectModalOpen = true"
                    >
                      <XSquare :size="14" />
                      <span>Reject</span>
                    </button>
                  </template>

                  <!-- Delete: show when NOT submitted, respecting hideUserDelete and viewOnly -->
                  <button 
                    v-if="!viewOnly && expense.expense_status?.toLowerCase() !== 'submitted' && (isAdmin || !hideUserDelete)"
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

                  <!-- Reverse: Admin or user within 24h of creation (hidden if viewOnly) -->
                  <button 
                    v-if="!viewOnly && canReverseExpense && expense.expense_status?.toLowerCase() === 'approved' && !expense.is_fully_reversed"
                    class="reverse-btn" 
                    @click="openReverseModal"
                  >
                    <RotateCcw :size="14" />
                    <span>Reverse</span>
                  </button>
                  
                  <button class="close-btn" @click="close">
                    <X :size="20" />
                  </button>
              </div>
            </div>
            
            <div class="header-main">
              <div class="vendor-group">
                <div class="vendor-avatar">
                  {{ getInitials(expense.vendor_name || expense.title) }}
                </div>
                <div class="vendor-info">
                  <h2>{{ expense.title || 'Untitled Expense' }}</h2>
                  <span class="category">{{ expense.vendor_name || 'No Vendor' }} &bull; {{ expense.category || '—' }}</span>
                </div>
              </div>
              
              <div class="amount-display">
                <span class="currency">{{ expense.currency || 'INR' }}</span>
                <span class="amount">{{ formatAmount(expense.total_after_tax || expense.amount) }}</span>
              </div>
            </div>

            <!-- Status Bar -->
            <div class="status-bar" :class="expense.expense_status?.toLowerCase() || 'draft'">
              <component :is="getStatusIcon(expense.expense_status)" :size="16" />
              <span>{{ expense.expense_status || 'Draft' }}</span>
              <span class="date">Recorded on {{ formatDate(expense.expense_date) }}</span>
            </div>
          </div>

          <!-- Scrollable Content -->
          <div class="drawer-content">
            
            <!-- Section: Transaction Details -->
            <div class="detail-section">
              <h3>Expense Details</h3>
              <div class="detail-grid">
                <div class="field">
                  <label>Payment Method</label>
                  <div class="value-pill">
                    <CreditCard :size="14" />
                    {{ expense.payment_method || 'Standard' }}
                  </div>
                </div>
                <div class="field">
                  <label>Payment Status</label>
                  <div class="value-pill" :class="{'paid-pill': expense.payment_status?.toLowerCase() === 'paid'}">
                    {{ expense.payment_status || 'Unpaid' }}
                  </div>
                </div>
                <div class="field">
                  <label>Invoice Number</label>
                  <div class="value font-mono">{{ expense.invoice_number || '—' }}</div>
                </div>
                <div class="field">
                  <label>Invoice Date</label>
                  <div class="value">{{ formatDate(expense.invoice_date) }}</div>
                </div>
              </div>
            </div>

            <!-- Section: Vendor & Tax -->
            <div class="detail-section">
              <h3>Vendor & Tax Info</h3>
              <div class="detail-card">
                <div class="bank-row">
                  <Building2 :size="18" class="icon" />
                  <div class="bank-info">
                    <span class="bank-name">{{ expense.vendor_name || 'Vendor Not Specified' }}</span>
                    <span class="ifsc" v-if="expense.vendor_tax_id">Tax ID: {{ expense.vendor_tax_id }}</span>
                  </div>
                </div>
                <div class="account-row" v-if="expense.vendor_contact || expense.vendor_type">
                  <div class="field-mini" v-if="expense.vendor_contact">
                    <label>Contact</label>
                    <div class="val">{{ expense.vendor_contact }}</div>
                  </div>
                  <div class="field-mini" v-if="expense.vendor_type">
                     <label>Type</label>
                     <div class="val">{{ expense.vendor_type }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Section: Cost Breakdown -->
            <div class="detail-section">
              <h3>Cost Breakdown</h3>
              <div class="breakdown-list">

                <div class="break-row">
                  <span>Base Amount</span>
                  <span>{{ formatCurrency(expense.base_amount || expense.amount, expense.currency) }}</span>
                </div>
                <div class="break-row sub" v-if="expense.tax_applicable && expense.tax_amount > 0">
                  <span>Tax ({{ expense.tax_type }} {{ expense.tax_percentage }}%)</span>
                  <span class="text-amber-400">+ {{ formatCurrency(expense.tax_amount, expense.currency) }}</span>
                </div>
                <div class="divider" style="height: 1px; background: rgba(255,255,255,0.08); margin: 4px 0;"></div>
                <div class="break-row total">
                  <span>Total Amount</span>
                  <span class="highlight">{{ formatCurrency(expense.total_after_tax || expense.amount, expense.currency) }}</span>
                </div>
              </div>
            </div>

            <!-- Section: Allocation -->
            <div class="detail-section">
              <h3>Allocation ({{ expense.allocation_type }})</h3>
              <div class="breakdown-list" v-if="expense.allocations && expense.allocations.length">
                 <div v-for="(alloc, idx) in expense.allocations" :key="idx" class="break-row sub" style="justify-content: space-between;">
                    <div style="display:flex; flex-direction:column; gap:2px;">
                        <span style="color:white">{{ alloc.category || 'Uncategorized' }}</span>
                        <span v-if="alloc.cost_center" style="font-size:10px; opacity:0.6;">{{ alloc.cost_center }}</span>
                    </div>
                    <span>{{ alloc.percentage }}% ({{ formatCurrency(alloc.amount, expense.currency) }})</span>
                 </div>
              </div>
              <div class="empty-state" v-else style="font-size:13px; color:rgba(255,255,255,0.4); font-style:italic;">
                 100% allocated to primary category
              </div>
            </div>

            <!-- Section: Description & Notes -->
            <div class="detail-section" v-if="expense.description || expense.notes">
               <h3>Notes</h3>
               <div class="notes-box" v-if="expense.description">
                  <strong>Description:</strong>
                  <p>{{ expense.description }}</p>
               </div>
               <div class="notes-box mt-2" v-if="expense.notes">
                  <strong>Additional Notes:</strong>
                  <p>{{ expense.notes }}</p>
               </div>
            </div>

            <!-- Section: Reversal Details -->
            <div class="detail-section warning-section" v-if="(expense.is_reversal || expense.expense_status?.toLowerCase() === 'reversed')">
               <h3>Reversal Details</h3>
               <div class="notes-box warning-box">
                  <div class="detail-grid" style="margin-top:0;">
                    <div class="field">
                      <label>Reversal Type</label>
                      <div class="val" style="color:#f59e0b; font-weight:700;">{{ expense.reversal_type || 'FULL' }}</div>
                    </div>
                    <div class="field">
                      <label>Reversed Amount</label>
                      <div class="val font-mono" style="color:#ef4444;">-{{ formatCurrency(expense.reversed_amount || expense.amount, expense.currency) }}</div>
                    </div>
                  </div>
                  <div v-if="expense.reversal_reason || expense.notes" style="margin-top:12px; padding-top:12px; border-top:1px solid rgba(245,158,11,0.1);">
                    <strong style="font-size:11px; color:rgba(255,180,0,0.8); text-transform:uppercase;">Reason:</strong>
                    <p style="margin-top:4px; font-size:13px; color:rgba(255,255,255,0.8);">{{ expense.reversal_reason || expense.notes }}</p>
                  </div>
               </div>
            </div>

            <!-- Section: Rejection Reason -->
            <div class="detail-section danger-section" v-if="expense.expense_status?.toLowerCase() === 'rejected' && expense.rejection_reason">
               <h3>Rejection Reason</h3>
               <div class="notes-box danger-box">
                  <p>{{ expense.rejection_reason }}</p>
               </div>
            </div>

            <!-- Section: Attachments -->
            <div class="detail-section">
              <h3>Attachments ({{ expense.attachments?.length || 0 }})</h3>
              <div class="attachment-grid" v-if="expense.attachments?.length">
                <a 
                  v-for="(file, idx) in expense.attachments" 
                  :key="idx"
                  :href="resolveFileUrl(file.file_url || file.file_path)"
                  target="_blank"
                  class="file-card"
                  style="text-decoration: none;"
                  @click.prevent="openAttachment(file)"
                >
                  <div class="file-icon">
                    <FileText :size="20" />
                  </div>
                  <div class="file-info">
                    <span class="name">{{ file.file_name || 'Document' }}</span>
                    <span class="meta">{{ formatSize(file.size) }}</span>
                  </div>
                  <ExternalLink :size="14" class="link-icon" />
                </a>
              </div>
              <div v-else class="empty-files">
                No attachments
              </div>
            </div>

          </div>

          <!-- Audit Trail -->
          <div class="detail-section" style="padding: 0 32px 32px;">
             <h3>Audit Trail</h3>
             <div class="audit-card">
                <div class="audit-avatar">{{ getInitials(creatorName) }}</div>
                <div class="audit-info">
                   <span class="audit-action">Recorded Expense</span>
                   <span class="audit-user">by {{ creatorName }}</span>
                   <span class="audit-time">{{ formatDate(expense.created_at || new Date()) }} at {{ formatTime(expense.created_at || new Date()) }}</span>
                </div>
             </div>
          </div>

          <!-- Footer Actions -->
          <div class="drawer-footer">
             <!-- If Draft, only show Submit button -->
             <template v-if="canSubmitDraft">
                <button class="btn-custom secondary" @click="$emit('edit', expense)">
                   <Edit2 :size="16" /> Edit Draft
                </button>
                <button class="btn-custom primary" @click="handleSubmitDraft" :disabled="isApproving">
                   <Clock v-if="!isApproving" :size="16" />
                   <Loader2 v-else :size="16" class="animate-spin" />
                   {{ isApproving ? 'Submitting...' : 'Submit Draft' }}
                </button>
             </template>
             <template v-else-if="viewOnly || expense.expense_status?.toLowerCase() === 'rejected' || expense.expense_status?.toLowerCase() === 'reversed' || expense.is_reversal || (!canEdit && !isAdmin)">
                 <div class="view-only-footer">
                    <Lock :size="13" />
                    <span>View Only</span>
                 </div>
             </template>
             <template v-else>
                 <button v-if="canEdit" class="btn-custom secondary" @click="$emit('edit', expense)">
                    <Edit2 :size="16" /> Edit Expense
                 </button>
                 <button class="btn-custom primary" @click="handleDownloadReceipt">
                   <Download :size="16" /> Download Receipt
                 </button>
             </template>
          </div>

        </div>
      </div>
    </Transition>
    <RejectExpenseModal 
      :is-open="isRejectModalOpen" 
      :loading="isRejecting" 
      @close="isRejectModalOpen = false" 
      @confirm="handleRejectConfirm" 
    />
    <ReverseExpenseModal
      :is-open="isReverseModalOpen"
      :preview="reversalPreview"
      :loading="isReversing"
      @close="isReverseModalOpen = false"
      @confirm="handleReverseConfirm"
    />
  </Teleport>
</template>

<script setup>
import { 
  X, Check, Clock, AlertCircle, FileText, 
  ExternalLink, Edit2, Download, CreditCard,
  Building2, Trash2, Loader2, XSquare, Lock, RotateCcw
} from 'lucide-vue-next'
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { useToast } from '../../composables/useToast'
import RejectExpenseModal from './RejectExpenseModal.vue'
import ReverseExpenseModal from './ReverseExpenseModal.vue'

const props = defineProps({
  isOpen: Boolean,
  expense: { type: Object, default: () => ({}) },
  hideUserDelete: { type: Boolean, default: false },
  viewOnly: { type: Boolean, default: false }
})

const currentUser = ref(null)
try {
  const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token')
  if (token) {
     const b64Url = token.split('.')[1]
     const b64 = b64Url.replace(/-/g, '+').replace(/_/g, '/')
     currentUser.value = JSON.parse(decodeURIComponent(atob(b64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')))
  }
} catch (e) {}

const creatorName = computed(() => {
    if (props.expense.created_by?.full_name) {
         return props.expense.created_by.full_name
    }
    if (currentUser.value && props.expense.created_by_id === currentUser.value.id) {
        return `${currentUser.value.full_name || 'User'} (You)`
    }
    return 'System'
})

const route = useRoute()
const isAdmin = computed(() => route.path.startsWith('/admin'))
const { success: toastSuccess, error: toastError } = useToast()

const canReverseExpense = computed(() => {
  if (isAdmin.value) return true
  if (!props.expense.created_at) return false
  const diffHours = (new Date() - new Date(props.expense.created_at)) / (1000 * 60 * 60)
  return diffHours <= 24
})

const emit = defineEmits(['close', 'edit', 'deleted', 'approved', 'rejected'])

const close = () => { emit('close') }

const canEdit = computed(() => {
    if (isAdmin.value) return true;
    if (!props.expense || !props.expense.created_at) return false;
    
    // Drafts can always be edited
    if ((props.expense.expense_status?.value || props.expense.expense_status || '').toLowerCase() === 'draft') return true;

    const now = new Date();
    const created = new Date(props.expense.created_at);
    const diffHours = (now - created) / (1000 * 60 * 60);
    
    return diffHours <= 24;
})

const canSubmitDraft = computed(() => {
    if (!props.expense) return false;
    const s = (props.expense.expense_status?.value || props.expense.expense_status || '').toLowerCase()
    return s === 'draft' && !isAdmin.value
})

const handleSubmitDraft = async () => {
    isApproving.value = true
    try {
        const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token')
        
        // Auto-approve if total after tax is less than 50,000
        const totalAmount = Number(props.expense.total_after_tax || props.expense.amount || 0)
        const newStatus = totalAmount < 50000 ? 'approved' : 'submitted'
        
        const payload = { ...props.expense, expense_status: newStatus }
        
        // Remove nested objects that cause payload errors on simple update
        delete payload.created_by
        delete payload.updated_by
        delete payload.project
        
        await axios.put(`http://localhost:8000/api/expenses/${props.expense.id}`, payload, {
             headers: { Authorization: `Bearer ${token}` }
        })
        
        if (newStatus === 'approved') {
            toastSuccess('Draft approved automatically (under ₹50,000)')
        } else {
            toastSuccess('Draft submitted for approval (₹50,000 or above)')
        }
        emit('approved', props.expense.id) // Re-use approved event to refresh
        close()
        
    } catch (e) {
        console.error(e)
        // Check for specific error body
        const errDetail = e.response?.data?.detail
        let msg = 'Failed to submit draft'
        if (typeof errDetail === 'string') msg = errDetail
        else if (Array.isArray(errDetail)) msg = errDetail[0]?.msg || msg
        toastError(msg)
    } finally {
        isApproving.value = false
    }
}

// Approve Logic
const isApproving = ref(false)
const handleApproveClick = async () => {
    isApproving.value = true
    try {
        const token = isAdmin.value ? (localStorage.getItem('admin_token') || localStorage.getItem('user_token')) : (localStorage.getItem('user_token') || localStorage.getItem('admin_token'))
        await axios.post(`http://localhost:8000/api/expenses/${props.expense.id}/approve`, {}, {
             headers: { Authorization: `Bearer ${token}` }
        })
        
        toastSuccess('Expense approved successfully')
        emit('approved', props.expense.id)
        close()
        
    } catch (e) {
        console.error(e)
        const msg = e.response?.data?.detail || 'Failed to approve expense'
        toastError(msg)
    } finally {
        isApproving.value = false
    }
}

// Reject Logic
const isRejectModalOpen = ref(false)
const isRejecting = ref(false)

const handleRejectConfirm = async (reason) => {
    isRejecting.value = true
    try {
        const token = isAdmin.value ? (localStorage.getItem('admin_token') || localStorage.getItem('user_token')) : (localStorage.getItem('user_token') || localStorage.getItem('admin_token'))
        await axios.post(`http://localhost:8000/api/expenses/${props.expense.id}/reject`, 
          { reason: reason }, 
          { headers: { Authorization: `Bearer ${token}` } }
        )
        
        toastSuccess('Expense rejected successfully')
        emit('rejected', props.expense.id)
        isRejectModalOpen.value = false
        close()
        
    } catch (e) {
        console.error(e)
        const msg = e.response?.data?.detail || 'Failed to reject expense'
        toastError(msg)
    } finally {
        isRejecting.value = false
    }
}

// Reverse Logic
const isReverseModalOpen = ref(false)
const isReversing = ref(false)
const reversalPreview = ref(null)

const openReverseModal = async () => {
    try {
        const token = isAdmin.value ? (localStorage.getItem('admin_token') || localStorage.getItem('user_token')) : (localStorage.getItem('user_token') || localStorage.getItem('admin_token'))
        const { data } = await axios.get(`http://localhost:8000/api/expenses/${props.expense.id}/reversal-preview`, {
            headers: { Authorization: `Bearer ${token}` }
        })
        reversalPreview.value = data
        isReverseModalOpen.value = true
    } catch (e) {
        console.error(e)
        toastError(e.response?.data?.detail || 'Failed to load reversal preview')
    }
}

const handleReverseConfirm = async (formData) => {
    isReversing.value = true
    try {
        const token = isAdmin.value ? (localStorage.getItem('admin_token') || localStorage.getItem('user_token')) : (localStorage.getItem('user_token') || localStorage.getItem('admin_token'))
        await axios.post(`http://localhost:8000/api/expenses/${props.expense.id}/reverse`, formData, {
            headers: { Authorization: `Bearer ${token}` }
        })
        toastSuccess('Expense reversed successfully')
        isReverseModalOpen.value = false
        emit('approved', props.expense.id) // Re-use to refresh parent
        close()
    } catch (e) {
        console.error(e)
        toastError(e.response?.data?.detail || 'Failed to reverse expense')
    } finally {
        isReversing.value = false
    }
}
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
    
    // Mock delete for dummy expenses
    if (String(props.expense.id).includes('dummy')) {
        setTimeout(() => {
            toastSuccess('Dummy expense deleted successfully')
            emit('deleted', props.expense.id)
            close()
            isDeleting.value = false
            showDeleteConfirm.value = false
        }, 300)
        return
    }

    try {
        const token = isAdmin.value ? localStorage.getItem('admin_token') : localStorage.getItem('user_token')
        await axios.delete(`http://localhost:8000/api/expenses/${props.expense.id}`, {
             headers: { Authorization: `Bearer ${token}` }
        })
        
        toastSuccess('Expense deleted successfully')
        emit('deleted', props.expense.id)
        close()
        
    } catch (e) {
        console.error(e)
        toastError('Failed to delete expense')
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

const formatCurrency = (amount, currencyCode = 'INR') => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currencyCode }).format(amount || 0)
}

const formatDate = (dateString) => {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  })
}

const formatTime = (dateString) => {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit'
  })
}

const formatSize = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const resolveFileUrl = (url) => {
  if (!url || url === '#') return '#'
  // Already a full URL
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url
  // Root-relative path (e.g., /storage/expenses/xxx.pdf)
  if (url.startsWith('/')) return `http://localhost:8000${url}`
  // Relative path (e.g., storage/expenses/xxx.pdf)
  return `http://localhost:8000/${url}`
}

const openAttachment = (file) => {
  const url = resolveFileUrl(file.file_url || file.file_path)
  if (url && url !== '#') {
    window.open(url, '_blank')
  }
}

const getStatusIcon = (status) => {
  const s = (status || '').toLowerCase()
  if (s === 'approved') return Check
  if (s === 'rejected') return AlertCircle
  return Clock // pending, submitted, draft
}

import { generateExpenseReceipt } from '../../utils/expenseReceiptGenerator'

const getCurrentUserFromToken = () => {
    try {
        const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token')
        if (!token) return { full_name: 'System User' }
        const base64Url = token.split('.')[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        }).join(''))
        const parsed = JSON.parse(jsonPayload)
        
        return {
           full_name: parsed.full_name || parsed.name || (parsed.first_name ? `${parsed.first_name} ${parsed.last_name||''}`.trim() : 'System User')
        }
    } catch(e) {
        return { full_name: 'System User' }
    }
}

const handleDownloadReceipt = () => {
    try {
        const user = getCurrentUserFromToken()
        generateExpenseReceipt(props.expense, user)
        toastSuccess('Expense receipt downloaded')
    } catch (e) {
        console.error('Failed to generate receipt:', e)
        toastError('Failed to generate receipt')
    }
}
</script>

<style scoped>
.drawer-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  backdrop-filter: blur(2px); z-index: 1000;
  display: flex; justify-content: flex-end;
}
/* Header */
.drawer-panel {
  width: 100%; max-width: 500px; height: 100%;
  background: rgba(24, 24, 27, 0.7); backdrop-filter: blur(24px);
  border-left: 1px solid rgba(255,255,255,0.08);
  display: flex; flex-direction: column;
  box-shadow: -10px 0 40px rgba(0,0,0,0.5);
  transform-origin: right center;
}

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

.reverse-btn {
  background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); color: #f59e0b;
  height: 32px; padding: 0 12px; border-radius: 16px;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  cursor: pointer; transition: all 0.2s;
  font-size: 11px; font-weight: 600;
  margin-right: 8px;
}
.reverse-btn:hover { background: rgba(245, 158, 11, 0.2); border-color: #f59e0b; }

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
.status-bar.submitted, .status-bar.pending { background: rgba(251, 191, 36, 0.1); border-color: rgba(251, 191, 36, 0.2); color: #fbbf24; }
.status-bar.approved { background: rgba(74, 222, 128, 0.1); border-color: rgba(74, 222, 128, 0.2); color: #4ade80; }
.status-bar.rejected { background: rgba(248, 113, 113, 0.1); border-color: rgba(248, 113, 113, 0.2); color: #f87171; }
.status-bar .date { margin-left: auto; font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.4); text-transform: none; }

/* Content */
.drawer-content {
  flex: 1; overflow-y: auto; padding: 24px 32px; display: flex; flex-direction: column; gap: 32px;
}
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

.detail-card {
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 16px;
}
.bank-row { display: flex; gap: 12px; align-items: flex-start; }
.bank-row .icon { color: rgba(255,255,255,0.4); margin-top: 2px; }
.bank-info { display: flex; flex-direction: column; gap: 4px; }
.bank-name { font-size: 14px; font-weight: 600; color: white; }
.ifsc { font-size: 12px; color: rgba(255,255,255,0.5); font-family: 'SF Mono', monospace; }
.account-row { display: flex; gap: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.06); }
.field-mini label { font-size: 10px; color: rgba(255,255,255,0.4); margin-bottom: 4px; display: block; text-transform: uppercase; }
.field-mini .val { font-size: 13px; color: #e4e4e7; font-weight: 500; }

.breakdown-list {
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 12px;
}
.break-row { display: flex; justify-content: space-between; font-size: 14px; color: #e4e4e7; }
.break-row.sub { font-size: 13px; color: rgba(255,255,255,0.5); }
.text-amber-400 { color: #fbbf24; }
.break-row.total { font-size: 15px; font-weight: 600; color: white; padding-top: 4px; }
.break-row.total .highlight { color: #f59e0b; font-family: 'SF Mono', monospace; font-size: 16px; }

.notes-box {
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 8px; padding: 12px;
}
.notes-box strong { font-size: 11px; color: rgba(255,255,255,0.4); text-transform: uppercase; display: block; margin-bottom: 6px; }
.notes-box p { font-size: 13px; color: rgba(255,255,255,0.7); line-height: 1.5; margin: 0; }
.mt-2 { margin-top: 8px; }

.danger-section h3 { color: #ef4444 !important; }
.danger-box { background: rgba(239, 68, 68, 0.05); border-color: rgba(239, 68, 68, 0.2); }
.notes-box.danger-box p { color: #fecaca; margin: 0; }
.notes-box.warning-box { background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.15); }
.detail-section.warning-section h3 { color: #f59e0b; }

.attachment-grid { display: grid; grid-template-columns: 1fr; gap: 8px; }
.file-card {
  display: flex; align-items: center; gap: 12px; padding: 12px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
  border-radius: 10px; cursor: pointer; transition: all 0.2s;
}
.file-card:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.1); }
.file-icon {
  width: 36px; height: 36px; border-radius: 8px;
  background: rgba(245, 158, 11, 0.1); color: #f59e0b;
  display: flex; align-items: center; justify-content: center;
}
.file-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.file-info .name { font-size: 13px; font-weight: 500; color: #e4e4e7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px; }
.file-info .meta { font-size: 11px; color: rgba(255,255,255,0.4); }
.link-icon { color: rgba(255,255,255,0.3); }
.file-card:hover .link-icon { color: white; }
.empty-files { font-size: 13px; color: rgba(255,255,255,0.4); font-style: italic; }

/* Audit */
.audit-card {
  display: flex; gap: 14px; padding: 16px; align-items: center;
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
}
.audit-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.05));
  border: 1px solid rgba(245,158,11,0.3); color: #f59e0b;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; font-family: 'SF Mono', monospace;
}
.audit-info { display: flex; flex-direction: column; gap: 2px; }
.audit-action { font-size: 13px; font-weight: 600; color: white; }
.audit-user { font-size: 12px; color: #f59e0b; font-weight: 500; }
.audit-time { font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; margin-top: 2px; }

/* Footer */
.drawer-footer {
  padding: 24px 32px; border-top: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.01); display: flex; gap: 12px;
}
.btn-custom {
  flex: 1; height: 44px; border-radius: 10px; font-size: 13px; font-weight: 600;
  display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;
  transition: all 0.2s; border: none;
}
.btn-custom.primary { background: #f59e0b; color: #1c1917; }
.btn-custom.primary:hover { background: #fbbf24; transform: translateY(-1px); }
.btn-custom.secondary { background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); }
.btn-custom.secondary:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); }

.view-only-footer {
  flex: 1; display: flex; align-items: center; justify-content: flex-start; gap: 6px;
  color: rgba(255,255,255,0.3); font-size: 13px; font-weight: 500;
  padding: 8px 0;
}

/* Animations */
.slide-fade-enter-active, .slide-fade-leave-active { transition: opacity 0.3s ease; }
.slide-fade-enter-active .drawer-panel, .slide-fade-leave-active .drawer-panel { transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-fade-enter-from, .slide-fade-leave-to { opacity: 0; }
.slide-fade-enter-from .drawer-panel, .slide-fade-leave-to .drawer-panel { transform: translateX(100%); }
</style>
