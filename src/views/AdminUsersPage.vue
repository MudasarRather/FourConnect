<template>
  <div class="admin-page">
    <!-- Enhanced Header -->
    <div class="admin-header">
      <div class="header-content">
        <div class="header-title">
          <div class="title-icon">
            <ShieldCheck :size="28" />
          </div>
          <div>
            <h1>User Management</h1>
            <p class="header-subtitle">Generate and manage activation codes for new users</p>
          </div>
        </div>
        <div class="header-stats" v-if="!isLoading">
          <div class="stat-card">
            <span class="stat-value">{{ users.length }}</span>
            <span class="stat-label">Total Users</span>
          </div>
          <div class="stat-card active">
            <span class="stat-value">{{ activeUsers }}</span>
            <span class="stat-label">Activated</span>
          </div>
          <div class="stat-card pending">
            <span class="stat-value">{{ pendingUsers }}</span>
            <span class="stat-label">Pending</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Users Table -->
    <div class="users-table-container">
      <div class="table-header">
        <h3>All Users</h3>
        <span class="table-count">{{ users.length }} users</span>
      </div>
      
      <div v-if="isLoading" class="loading-state">
        <Loader2 class="spin" :size="32" />
        <p>Loading users...</p>
      </div>
      
      <table v-else class="users-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Employee Code</th>
            <th>Phone</th>
            <th>Status</th>
            <th>Activation Code</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id" class="user-row">
            <td>
              <div class="user-info">
                <div class="user-avatar" :class="{ 'avatar-admin': user.is_superuser }">
                  {{ getInitials(user.full_name) }}
                </div>
                <div>
                  <div class="user-name">
                    {{ user.full_name }}
                    <span v-if="user.is_superuser" class="crown-badge">👑</span>
                  </div>
                  <div class="user-email">{{ user.email }}</div>
                </div>
              </div>
            </td>
            <td><span class="emp-code">{{ user.employee_code || '—' }}</span></td>
            <td>{{ user.phone || '—' }}</td>
            <td>
              <span class="status-badge" :class="{ active: user.is_activated, pending: !user.is_activated }">
                <span class="status-dot"></span>
                {{ user.is_activated ? 'Active' : 'Pending' }}
              </span>
            </td>
            <td>
              <div v-if="user.activation_code" class="code-container">
                <span class="activation-code">{{ user.activation_code }}</span>
                <button class="copy-btn" @click="copyCode(user.activation_code)" title="Copy">
                  <Copy :size="12" />
                </button>
              </div>
              <span v-else class="no-code">—</span>
            </td>
            <td>
              <button 
                v-if="!user.is_activated && !user.is_superuser"
                class="generate-btn"
                @click="generateCode(user)"
                :disabled="generatingFor === user.id"
              >
                <KeyRound v-if="generatingFor !== user.id" :size="14" />
                <Loader2 v-else class="spin" :size="14" />
                {{ user.activation_code ? 'Regenerate' : 'Generate' }}
              </button>
              <span v-else-if="user.is_superuser" class="admin-badge">
                <Shield :size="12" />
                Admin
              </span>
              <span v-else class="activated-text">
                <CheckCircle :size="14" />
                Activated
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div v-if="!isLoading && users.length === 0" class="empty-state">
        <Users :size="48" />
        <p>No users found</p>
      </div>
    </div>

    <!-- Toast for copied code -->
    <transition name="toast">
      <div v-if="copiedCode" class="copy-toast">
        <CheckCircle :size="16" />
        <span>Code copied: <strong>{{ copiedCode }}</strong></span>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { Users, KeyRound, Loader2, ShieldCheck, Shield, Copy, CheckCircle } from 'lucide-vue-next'
import { useToast } from '../composables/useToast'
import { API } from '@/utils/api'

const { success, error } = useToast()

const users = ref([])
const isLoading = ref(true)
const generatingFor = ref(null)
const copiedCode = ref('')

const activeUsers = computed(() => users.value.filter(u => u.is_activated).length)
const pendingUsers = computed(() => users.value.filter(u => !u.is_activated).length)

const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const fetchUsers = async () => {
  isLoading.value = true
  try {
    const token = localStorage.getItem('admin_token')
    const response = await axios.get(`${API}/auth/admin/users`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    users.value = response.data
  } catch (e) {
    error('Failed to load users. Check if you have admin access.')
    console.error(e)
  } finally {
    isLoading.value = false
  }
}

const generateCode = async (user) => {
  generatingFor.value = user.id
  try {
    const token = localStorage.getItem('admin_token')
    const response = await axios.post(
      `${API}/auth/admin/generate-code/${user.id}`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    )
    
    // Update user in list
    const idx = users.value.findIndex(u => u.id === user.id)
    if (idx >= 0) {
      users.value[idx].activation_code = response.data.activation_code
    }
    
    // Copy to clipboard
    await navigator.clipboard.writeText(response.data.activation_code)
    copiedCode.value = response.data.activation_code
    setTimeout(() => copiedCode.value = '', 3000)
    
    success(`Activation code generated and copied for ${user.email}`)
  } catch (e) {
    error('Failed to generate code')
    console.error(e)
  } finally {
    generatingFor.value = null
  }
}

const copyCode = async (code) => {
  await navigator.clipboard.writeText(code)
  copiedCode.value = code
  setTimeout(() => copiedCode.value = '', 3000)
  success('Code copied to clipboard')
}

onMounted(fetchUsers)
</script>

<style scoped>
.admin-page {
  padding: 32px 40px;
  max-width: 1300px;
  margin: 0 auto;
}

.admin-header {
  margin-bottom: 28px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-title {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.title-icon {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
}

.header-title h1 {
  font-size: 26px;
  font-weight: 700;
  color: #f5f5f5;
  margin-bottom: 4px;
}

.header-subtitle {
  color: #8e8e93;
  font-size: 13px;
}

.header-stats {
  display: flex;
  gap: 12px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 12px 20px;
  text-align: center;
  min-width: 90px;
}

.stat-card.active { border-color: rgba(52, 211, 153, 0.3); }
.stat-card.pending { border-color: rgba(251, 191, 36, 0.3); }

.stat-value {
  display: block;
  font-size: 22px;
  font-weight: 700;
  color: #f5f5f5;
}

.stat-card.active .stat-value { color: #34d399; }
.stat-card.pending .stat-value { color: #fbbf24; }

.stat-label {
  font-size: 11px;
  color: #8e8e93;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.users-table-container {
  background: rgba(26, 26, 28, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.table-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: #f5f5f5;
}

.table-count {
  font-size: 12px;
  color: #8e8e93;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
}

.users-table th {
  background: rgba(255, 255, 255, 0.02);
  padding: 12px 16px;
  text-align: left;
  font-size: 10px;
  font-weight: 600;
  color: #8e8e93;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.users-table td {
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: #e5e5e5;
  font-size: 13px;
}

.user-row {
  transition: background 0.2s;
}

.user-row:hover {
  background: rgba(255, 255, 255, 0.02);
}

.users-table tr:last-child td {
  border-bottom: none;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: white;
}

.avatar-admin {
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
}

.user-name {
  font-weight: 500;
  color: #f5f5f5;
  display: flex;
  align-items: center;
  gap: 6px;
}

.crown-badge {
  font-size: 12px;
}

.user-email {
  font-size: 12px;
  color: #8e8e93;
  margin-top: 1px;
}

.emp-code {
  font-family: monospace;
  color: #a5b4fc;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-badge.active {
  background: rgba(52, 211, 153, 0.12);
  color: #34d399;
}
.status-badge.active .status-dot { background: #34d399; }

.status-badge.pending {
  background: rgba(251, 191, 36, 0.12);
  color: #fbbf24;
}
.status-badge.pending .status-dot { background: #fbbf24; }

.code-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.activation-code {
  font-family: 'SF Mono', monospace;
  font-size: 13px;
  font-weight: 600;
  color: #60a5fa;
  background: rgba(59, 130, 246, 0.1);
  padding: 5px 10px;
  border-radius: 6px;
  letter-spacing: 2px;
}

.copy-btn {
  background: rgba(255, 255, 255, 0.05);
  border: none;
  border-radius: 4px;
  padding: 4px;
  cursor: pointer;
  color: #8e8e93;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f5f5f5;
}

.no-code {
  color: #6b7280;
}

.generate-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.generate-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.generate-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.admin-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(139, 92, 246, 0.12);
  color: #a78bfa;
}

.activated-text {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #34d399;
  font-size: 12px;
  font-weight: 500;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #8e8e93;
  gap: 12px;
}

.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

.copy-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
  border: 1px solid rgba(52, 211, 153, 0.2);
  color: #f5f5f5;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  z-index: 1000;
}

.copy-toast svg { color: #34d399; }
.copy-toast strong { color: #60a5fa; font-family: monospace; letter-spacing: 1px; }

.toast-enter-active, .toast-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-enter-from, .toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}
</style>
