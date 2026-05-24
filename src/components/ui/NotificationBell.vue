<template>
  <div class="notification-wrapper" ref="wrapper">
    <!-- Bell Button -->
    <button class="notification-btn" @click="togglePanel" :class="{ active: isOpen }">
      <Bell :size="18" />
      <span v-if="unreadCount > 0" class="badge">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
    </button>

    <!-- Dropdown Panel -->
    <transition name="dropdown">
      <div v-if="isOpen" class="notification-panel">
        <div class="panel-header">
          <span class="header-title">Notifications</span>
          <button v-if="unreadCount > 0" class="mark-all-btn" @click="markAllRead">
            <CheckCheck :size="14" />
            Mark all read
          </button>
        </div>

        <div class="notification-list">
          <div v-if="isLoading" class="loading-state">
            <Loader2 :size="18" class="spin" />
          </div>

          <div v-else-if="notifications.length === 0" class="empty-state">
            <BellOff :size="24" />
            <span>No notifications</span>
          </div>

          <div 
            v-for="notif in notifications" 
            :key="notif.id"
            class="notification-item"
            :class="{ unread: !notif.is_read }"
            @click="handleNotificationClick(notif)"
          >
            <div class="notif-icon" :class="getIconClass(notif.type)">
              <component :is="getIcon(notif.type)" :size="16" />
            </div>
            <div class="notif-content">
              <span class="notif-title">{{ notif.title }}</span>
              <span class="notif-message">{{ notif.message }}</span>
              <span class="notif-time">{{ formatTime(notif.created_at) }}</span>
            </div>

            <!-- Actions for team invites -->
            <div v-if="notif.type === 'team_invite' && notif.related_team_member_id" class="notif-actions">
              <button class="action-accept" @click.stop="respondToInvite(notif, true)">
                <Check :size="14" />
              </button>
              <button 
                class="action-decline" 
                @click.stop="respondToInvite(notif, false)"
              >
                <X :size="14" />
              </button>
            </div>

            <button class="dismiss-btn" @click.stop="dismissNotification(notif.id)">
              <X :size="12" />
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Decline Reason Modal -->
    <teleport to="body">
      <div v-if="showDeclineModal" class="decline-modal-backdrop" @click.self="cancelDecline">
        <div class="decline-modal">
          <div class="decline-modal-header">
            <div class="decline-icon">
              <UserX :size="20" />
            </div>
            <div class="decline-header-text">
              <h3>Decline Invitation</h3>
              <p>{{ declineNotif?.related_project_name || 'Project' }}</p>
            </div>
          </div>
          <div class="decline-modal-body">
            <label class="decline-label">Reason for declining <span class="required">*</span></label>
            <textarea 
              v-model="declineReason" 
              class="decline-textarea"
              :class="{ 'has-error': declineError }"
              placeholder="Please provide a reason for declining this invitation..."
              rows="3"
            ></textarea>
            <span v-if="declineError" class="decline-error">Reason is required</span>
          </div>
          <div class="decline-modal-footer">
            <button class="btn-cancel" @click="cancelDecline">Cancel</button>
            <button class="btn-decline" @click="confirmDecline" :disabled="declining">
              {{ declining ? 'Declining...' : 'Decline Invitation' }}
            </button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import { API } from '@/utils/api'
import { 
  Bell, BellOff, Loader2, CheckCheck, Check, X,
  UserPlus, UserCheck, UserX, ShieldCheck, Mail, AtSign, Flag, CheckCircle, XCircle, Trash2, Wallet
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()

const isOpen = ref(false)
const isLoading = ref(false)
const notifications = ref([])
const unreadCount = ref(0)
const wrapper = ref(null)
let pollInterval = null

// Decline Modal State
const showDeclineModal = ref(false)
const declineNotif = ref(null)
const declineReason = ref('')
const declineError = ref(false)
const declining = ref(false)

const getToken = () => {
  const isAdminRoute = route.path.startsWith('/admin')
  const adminToken = localStorage.getItem('admin_token')
  const userToken = localStorage.getItem('user_token')
  
  // Prioritize the token corresponding to the current route context, 
  // but fall back to the other if the primary is missing.
  if (isAdminRoute) {
    return adminToken || userToken
  }
  return userToken || adminToken
}

const fetchNotifications = async () => {
  try {
    const token = getToken()
    if (!token) return
    
    const res = await axios.get(`${API}/notifications/`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    notifications.value = res.data.items || []
    unreadCount.value = res.data.unread_count || 0
    console.log('Fetched notifications:', notifications.value.length)
  } catch (e) {
    console.error('Failed to fetch notifications:', e)
  }
}

const fetchUnreadCount = async () => {
  try {
    const token = getToken()
    if (!token) return
    
    const res = await axios.get(`${API}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    unreadCount.value = res.data.count
  } catch (e) {
    // Silently fail for polling
  }
}

const togglePanel = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    fetchNotifications()
  }
}

const markAllRead = async () => {
  try {
    const token = getToken()
    await axios.put(`${API}/notifications/read-all`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
    notifications.value.forEach(n => n.is_read = true)
    unreadCount.value = 0
  } catch (e) {
    console.error('Failed to mark all read:', e)
  }
}

const markAsRead = async (notifId) => {
  try {
    const token = getToken()
    await axios.put(`${API}/notifications/${notifId}/read`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const notif = notifications.value.find(n => n.id === notifId)
    if (notif && !notif.is_read) {
      notif.is_read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
  } catch (e) {
    // Silently fail
  }
}

const dismissNotification = async (notifId) => {
  try {
    const token = getToken()
    await axios.delete(`${API}/notifications/${notifId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const idx = notifications.value.findIndex(n => n.id === notifId)
    if (idx >= 0) {
      if (!notifications.value[idx].is_read) {
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }
      notifications.value.splice(idx, 1)
    }
  } catch (e) {
    console.error('Failed to dismiss notification:', e)
  }
}

const handleNotificationClick = async (notif) => {
  await markAsRead(notif.id)
  if (notif.action_url) {
    router.push(notif.action_url)
    isOpen.value = false
  }
}

const respondToInvite = async (notif, accept) => {
  // If declining, show the reason modal instead of directly declining
  if (!accept) {
    declineNotif.value = notif
    declineReason.value = ''
    declineError.value = false
    showDeclineModal.value = true
    return
  }
  
  try {
    const token = getToken()
    await axios.post(
      `${API}/team/${notif.related_team_member_id}/respond`,
      { accept: true },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    // Remove from list
    dismissNotification(notif.id)
  } catch (e) {
    console.error('Failed to respond:', e)
  }
}

const cancelDecline = () => {
  showDeclineModal.value = false
  declineNotif.value = null
  declineReason.value = ''
  declineError.value = false
}

const confirmDecline = async () => {
  if (!declineReason.value.trim()) {
    declineError.value = true
    return
  }
  declineError.value = false
  declining.value = true
  
  try {
    const token = getToken()
    await axios.post(
      `${API}/team/${declineNotif.value.related_team_member_id}/respond`,
      { accept: false, reason: declineReason.value.trim() },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    // Remove from list
    dismissNotification(declineNotif.value.id)
    showDeclineModal.value = false
    declineNotif.value = null
    declineReason.value = ''
  } catch (e) {
    console.error('Failed to decline:', e)
  } finally {
    declining.value = false
  }
}

const getIcon = (type) => {
  const icons = {
    'team_invite': UserPlus,
    'team_accepted': UserCheck,
    'team_declined': UserX,
    'admin_override': ShieldCheck,
    'team_submitted': Mail,
    'admin_notice': ShieldCheck,
    'mention': AtSign,
    'milestone_assigned': Flag,
    'milestone_accepted': CheckCircle,
    'milestone_declined': XCircle,
    'milestone_deleted': Trash2,
    'expense_approval': Wallet,
    'expense_approved': CheckCircle,
    'handover_submitted': Mail,
    'handover_approved': CheckCircle,
    'handover_rejected': XCircle,
    'sla_submitted': Mail,
    'sla_rejected': XCircle
  }
  return icons[type] || Bell
}

const getIconClass = (type) => {
  const classes = {
    'team_invite': 'invite',
    'team_accepted': 'accepted',
    'team_declined': 'declined',
    'admin_override': 'override',
    'team_submitted': 'submitted',
    'admin_notice': 'override',
    'mention': 'mention',
    'milestone_assigned': 'milestone',
    'milestone_accepted': 'accepted',
    'milestone_declined': 'declined',
    'milestone_deleted': 'declined',
    'expense_approval': 'expense',
    'expense_approved': 'accepted',
    'handover_submitted': 'submitted',
    'handover_approved': 'accepted',
    'handover_rejected': 'declined',
    'sla_submitted': 'submitted',
    'sla_rejected': 'declined'
  }
  return classes[type] || ''
}

const formatTime = (dateStr) => {
  if (!dateStr) return ''
  
  // Parse date: handle Naive UTC (backend default) vs Aware UTC
  let dateString = dateStr
  // If no timezone info (Z or +), assume UTC
  if (!dateStr.endsWith('Z') && !dateStr.includes('+')) {
      dateString += 'Z'
  }
  
  const date = new Date(dateString)
  
  // Check if date is valid
  if (isNaN(date.getTime())) return ''
  
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  // Handle future dates or invalid dates
  if (diff < 0) return 'Just now'
  
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (seconds < 60) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago` // logic check: 23 hours is fine.
  if (days < 7) return `${days}d ago`
  
  // Fallback: Show full Date AND Time
  return date.toLocaleString(undefined, { 
      month: 'short', day: 'numeric', year: 'numeric', 
      hour: 'numeric', minute: '2-digit' 
  })
}

// Click outside
const handleClickOutside = (e) => {
  // Don't close panel if decline modal is open
  if (showDeclineModal.value) return
  
  if (wrapper.value && !wrapper.value.contains(e.target)) {
    isOpen.value = false
  }
}

onMounted(() => {
  fetchUnreadCount()
  // Poll every 10 seconds for near real-time updates
  pollInterval = setInterval(() => {
    fetchUnreadCount()
    // Also refresh notifications if panel is open
    if (isOpen.value) {
      fetchNotifications()
    }
  }, 10000)
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.notification-wrapper {
  position: relative;
}

.notification-btn {
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  width: 36px;
  height: 36px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8e8e93;
  cursor: pointer;
  transition: all 0.2s;
}

.notification-btn:hover, .notification-btn.active {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

.notification-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 360px;
  max-height: 480px;
  background: #1c1c1e;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  z-index: 1000;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.header-title {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}

.mark-all-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: #3b82f6;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.mark-all-btn:hover {
  text-decoration: underline;
}

.notification-list {
  max-height: 400px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: background 0.2s;
  position: relative;
}

.notification-item:hover {
  background: rgba(255, 255, 255, 0.03);
}

.notification-item.unread {
  background: rgba(59, 130, 246, 0.05);
}

.notification-item.unread::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  background: #3b82f6;
  border-radius: 50%;
}

.notif-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.05);
  color: #8e8e93;
}

.notif-icon.invite { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.notif-icon.accepted { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.notif-icon.declined { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.notif-icon.override { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.notif-icon.submitted { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
.notif-icon.mention { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.notif-icon.milestone { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.notif-icon.expense { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }

.notif-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.notif-title {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}

.notif-message {
  font-size: 12px;
  color: #8e8e93;
  line-height: 1.4;
}

.notif-time {
  font-size: 10px;
  color: #6e6e73;
  margin-top: 2px;
}

.notif-actions {
  display: flex;
  gap: 6px;
  margin-left: auto;
}

.action-accept, .action-decline {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.action-accept {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.action-accept:hover {
  background: #10b981;
  color: #fff;
}

.action-decline {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.action-decline:hover {
  background: #ef4444;
  color: #fff;
}

.dismiss-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: none;
  border: none;
  color: #6e6e73;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
  padding: 4px;
}

.notification-item:hover .dismiss-btn {
  opacity: 1;
}

.dismiss-btn:hover {
  color: #ef4444;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px;
  color: #6e6e73;
  font-size: 13px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Dropdown animation */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Scrollbar */
.notification-list::-webkit-scrollbar {
  width: 6px;
}

.notification-list::-webkit-scrollbar-thumb {
  background: #3a3a3c;
  border-radius: 3px;
}

/* Decline Modal Styles */
.decline-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.decline-modal {
  width: 400px;
  max-width: 90vw;
  background: linear-gradient(180deg, #1a1a1d 0%, #141417 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  overflow: hidden;
}

.decline-modal-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.decline-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ef4444;
}

.decline-header-text h3 {
  font-size: 16px;
  font-weight: 600;
  color: #f5f5f7;
  margin: 0;
}

.decline-header-text p {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  margin: 2px 0 0 0;
}

.decline-modal-body {
  padding: 20px;
}

.decline-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 8px;
}

.decline-label .required {
  color: #ef4444;
}

.decline-textarea {
  width: 100%;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px;
  font-size: 13px;
  color: #fff;
  resize: none;
  font-family: inherit;
}

.decline-textarea:focus {
  outline: none;
  border-color: rgba(239, 68, 68, 0.5);
}

.decline-textarea.has-error {
  border-color: #ef4444;
}

.decline-error {
  display: block;
  font-size: 11px;
  color: #ef4444;
  margin-top: 6px;
}

.decline-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.btn-cancel {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.2);
}

.btn-decline {
  background: #ef4444;
  border: none;
  color: #fff;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-decline:hover:not(:disabled) {
  background: #dc2626;
}

.btn-decline:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ─── Light theme overrides ───────────────────────────────────────────────
   Cream notification panel + warm decline modal. Decline modal is teleported
   to <body>, but [data-theme] sits on <html> so this still cascades.
   Note: this is a scoped <style> block; selectors get the scope attribute.
   The teleported decline modal still gets the scope attribute because Vue
   propagates it to teleported children, so [data-theme="light"] works.
   ────────────────────────────────────────────────────────────────────── */
[data-theme="light"] .notification-panel {
  background: rgba(255, 250, 240, 0.96);
  border-color: rgba(40, 25, 10, 0.10);
  box-shadow: 0 20px 50px rgba(40, 25, 10, 0.18);
}
[data-theme="light"] .header-title { color: var(--text-primary); }
[data-theme="light"] .panel-header { border-bottom-color: var(--divider-color); }
[data-theme="light"] .mark-all-btn { color: var(--accent-noir); }
[data-theme="light"] .notification-item { border-bottom-color: var(--divider-color); }
[data-theme="light"] .notification-item:hover { background: rgba(40, 25, 10, 0.04); }
[data-theme="light"] .notification-item.unread { background: rgba(29, 78, 216, 0.06); }
[data-theme="light"] .notification-item.unread::before { background: var(--accent-noir); }
[data-theme="light"] .notif-title { color: var(--text-primary); }
[data-theme="light"] .notif-message { color: var(--text-secondary); }
[data-theme="light"] .notif-time { color: var(--text-tertiary); }
[data-theme="light"] .notif-icon { color: var(--text-secondary); }
[data-theme="light"] .dismiss-btn { color: var(--text-tertiary); }
[data-theme="light"] .dismiss-btn:hover {
  background: rgba(40, 25, 10, 0.06);
  color: var(--text-primary);
}
[data-theme="light"] .empty-state { color: var(--text-secondary); }

[data-theme="light"] .decline-modal-backdrop { background: rgba(26, 20, 16, 0.45); }
[data-theme="light"] .decline-modal {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.98) 0%, rgba(252, 245, 232, 0.98) 100%);
  border-color: rgba(40, 25, 10, 0.12);
  box-shadow: 0 30px 80px rgba(40, 25, 10, 0.28);
}
[data-theme="light"] .decline-modal-header { border-bottom-color: var(--divider-color); }
[data-theme="light"] .decline-label { color: var(--text-secondary); }
[data-theme="light"] .decline-textarea {
  background: var(--input-bg);
  border-color: var(--input-border);
  color: var(--text-primary);
}
[data-theme="light"] .decline-modal-footer { border-top-color: var(--divider-color); }
[data-theme="light"] .btn-cancel {
  border-color: var(--input-border);
  color: var(--text-secondary);
}
[data-theme="light"] .btn-cancel:hover {
  background: rgba(40, 25, 10, 0.06);
  color: var(--text-primary);
}
[data-theme="light"] .btn-decline { color: #fff; background: var(--accent-danger); }
</style>
