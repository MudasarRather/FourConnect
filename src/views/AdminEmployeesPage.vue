<template>
  <div class="admin-page">
    <div class="admin-header">
      <div class="header-content">
        <div class="header-title">
          <div class="title-icon">
            <UserPlus :size="28" />
          </div>
          <div>
            <h1>Employee Whitelist</h1>
            <p class="header-subtitle">Add verified employee codes and phone numbers for signup</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Employee Form -->
    <div class="add-employee-card">
      <h3>Add Verified Employee</h3>
      <form @submit.prevent="addEmployee" class="add-form">
        <div class="form-row">
          <div class="input-group">
            <label>Employee Code</label>
            <input 
              v-model="newEmployee.code" 
              type="text" 
              placeholder="e.g. EMP002" 
              required
              class="minimal-input"
            />
          </div>
          <div class="input-group">
            <label>Phone Number</label>
            <input 
              v-model="newEmployee.phone" 
              type="text" 
              placeholder="e.g. +1 555-0102" 
              required
              class="minimal-input"
            />
          </div>
          <button type="submit" class="add-btn" :disabled="isAdding">
            <Plus v-if="!isAdding" :size="16" />
            <Loader2 v-else class="spin" :size="16" />
            Add to Whitelist
          </button>
        </div>
      </form>
    </div>

    <!-- Employees List -->
    <div class="users-table-container">
      <div class="table-header">
        <h3>Whitelisted Employees</h3>
        <span class="table-count">{{ employees.length }} records</span>
      </div>
      
      <div v-if="isLoading" class="loading-state">
        <Loader2 class="spin" :size="32" />
        <p>Loading records...</p>
      </div>
      
      <table v-else class="users-table">
        <thead>
          <tr>
            <th>Employee Code</th>
            <th>Phone Number</th>
            <th>Status</th>
            <th>Added Date</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="emp in employees" :key="emp.id" class="user-row">
            <td><span class="emp-code">{{ emp.employee_code }}</span></td>
            <td>{{ emp.phone }}</td>
            <td>
              <span class="status-badge" :class="{ active: emp.is_registered, pending: !emp.is_registered }">
                <span class="status-dot"></span>
                {{ emp.is_registered ? 'Registered' : 'Pending Signup' }}
              </span>
            </td>
            <td class="date-cell">{{ formatDate(emp.created_at) }}</td>
          </tr>
        </tbody>
      </table>
      
      <div v-if="!isLoading && employees.length === 0" class="empty-state">
        <Users :size="48" />
        <p>No employees whitelisted yet</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { UserPlus, Plus, Loader2, Users } from 'lucide-vue-next'
import { useToast } from '../composables/useToast'
import { API } from '@/utils/api'

const { success, error } = useToast()
const employees = ref([])
const isLoading = ref(true)
const isAdding = ref(false)
const newEmployee = ref({ code: '', phone: '' })

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString()
}

const fetchEmployees = async () => {
  isLoading.value = true
  try {
    const token = localStorage.getItem('admin_token')
    const response = await axios.get(`${API}/admin/employees/`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    employees.value = response.data
  } catch (e) {
    error('Failed to load employees')
  } finally {
    isLoading.value = false
  }
}

const addEmployee = async () => {
  isAdding.value = true
  try {
    const token = localStorage.getItem('admin_token')
    await axios.post(`${API}/admin/employees/`, {
      employee_code: newEmployee.value.code,
      phone: newEmployee.value.phone
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    success(`Employee ${newEmployee.value.code} added to whitelist`)
    newEmployee.value = { code: '', phone: '' }
    await fetchEmployees()
  } catch (e) {
    if (e.response?.data?.detail) {
      error(e.response.data.detail)
    } else {
      error('Failed to add employee')
    }
  } finally {
    isAdding.value = false
  }
}

onMounted(fetchEmployees)
</script>

<style scoped>
.admin-page {
  padding: 32px 40px;
  max-width: 1300px;
  margin: 0 auto;
}

.admin-header { margin-bottom: 28px; }
.header-content { display: flex; align-items: flex-start; }
.header-title { display: flex; align-items: flex-start; gap: 16px; }

.title-icon {
  width: 48px; height: 48px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  color: #10b981;
}

.header-title h1 { font-size: 26px; font-weight: 700; color: #f5f5f5; margin-bottom: 4px; }
.header-subtitle { color: #8e8e93; font-size: 13px; }

.add-employee-card {
  background: rgba(26, 26, 28, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 24px;
  margin-bottom: 32px;
}

.add-employee-card h3 {
  font-size: 16px; font-weight: 600; color: #f5f5f5; margin-bottom: 16px;
}

.add-form { display: flex; flex-direction: column; gap: 16px; }
.form-row { display: flex; align-items: flex-end; gap: 16px; }

.input-group { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.input-group label { font-size: 11px; font-weight: 600; color: #8e8e93; text-transform: uppercase; }

.minimal-input {
  height: 42px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0 12px;
  color: #f5f5f5;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
}
.minimal-input:focus { border-color: #3b82f6; background: rgba(0, 0, 0, 0.4); }

.add-btn {
  height: 42px;
  padding: 0 24px;
  background: #3b82f6;
  border: none; border-radius: 8px;
  color: white; font-weight: 600; font-size: 13px;
  cursor: pointer;
  display: flex; align-items: center; gap: 8px;
  transition: all 0.2s;
}
.add-btn:hover:not(:disabled) { background: #2563eb; transform: translateY(-1px); }
.add-btn:disabled { opacity: 0.6; cursor: wait; }

/* Table Styles (Reused) */
.users-table-container {
  background: rgba(26, 26, 28, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px; overflow: hidden;
}
.table-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.table-header h3 { font-size: 14px; font-weight: 600; color: #f5f5f5; }
.table-count { font-size: 12px; color: #8e8e93; }

.users-table { width: 100%; border-collapse: collapse; }
.users-table th {
  background: rgba(255, 255, 255, 0.02);
  padding: 12px 16px; text-align: left;
  font-size: 10px; font-weight: 600; color: #8e8e93; text-transform: uppercase; letter-spacing: 0.5px;
}
.users-table td {
  padding: 14px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: #e5e5e5; font-size: 13px;
}
.user-row:hover { background: rgba(255, 255, 255, 0.02); }

.emp-code { font-family: monospace; color: #a5b4fc; font-weight: 600; }
.date-cell { color: #8e8e93; font-size: 12px; font-family: monospace; }

.status-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px; border-radius: 20px;
  font-size: 11px; font-weight: 600;
}
.status-dot { width: 6px; height: 6px; border-radius: 50%; }

.status-badge.active { background: rgba(52, 211, 153, 0.12); color: #34d399; }
.status-badge.active .status-dot { background: #34d399; }

.status-badge.pending { background: rgba(251, 191, 36, 0.12); color: #fbbf24; }
.status-badge.pending .status-dot { background: #fbbf24; }

.loading-state, .empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 60px 20px; color: #8e8e93; gap: 12px;
}
.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }
</style>
