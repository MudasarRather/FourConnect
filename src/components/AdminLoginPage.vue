<template>
  <div class="page-container">
    <div class="auth-theme-toggle">
      <ThemeToggle />
    </div>
    <div class="auth-container fade-in">
      
      <!-- Header -->
      <div class="auth-header">
        <Logo class="brand-icon" />
        <h1 class="brand-name">Fourconnect</h1>
        <div class="admin-badge">
          <Shield :size="14" />
          <span>Admin Portal</span>
        </div>
        <p class="auth-subtitle">Sign in to admin dashboard</p>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleLogin" class="auth-form" novalidate>
        
        <div class="input-wrapper" :class="{ 'has-error': errors.email }">
          <label class="floating-label">Email</label>
          <Mail class="input-icon" :size="16" />
          <input 
            type="email" 
            v-model="email" 
            placeholder="admin@company.com" 
            @input="clearError('email')"
            class="minimal-input"
          />
           <span v-if="errors.email" class="error-text">{{ errors.email }}</span>
        </div>
        
        <div class="input-wrapper" :class="{ 'has-error': errors.password }">
          <label class="floating-label">Password</label>
          <Lock class="input-icon" :size="16" />
          <input 
            :type="showPassword ? 'text' : 'password'" 
            v-model="password" 
            placeholder="Enter password" 
            @input="clearError('password')"
            class="minimal-input"
          />
          <button type="button" class="eye-btn" @click="showPassword = !showPassword">
            <Eye v-if="!showPassword" :size="16" />
            <EyeOff v-else :size="16" />
          </button>
           <span v-if="errors.password" class="error-text">{{ errors.password }}</span>
        </div>

        <button type="submit" class="btn-primary" :disabled="isLoading">
          <span v-if="!isLoading">Sign In as Admin</span>
          <span v-else class="flex-center"><Loader2 class="spin" :size="16"/> Processing...</span>
        </button>

      </form>

      <!-- Footer -->
      <div class="auth-footer">
        <p>Not an admin? <router-link to="/authentication/user/login">User Login</router-link></p>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import Logo from './icons/Logo.vue'
import ThemeToggle from './common/ThemeToggle.vue'
import { Mail, Lock, Eye, EyeOff, Loader2, Shield } from 'lucide-vue-next'
import { useToast } from '../composables/useToast'

const router = useRouter()
const { success, error } = useToast()
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const errors = ref({})

const clearError = (field) => {
  if (errors.value[field]) delete errors.value[field]
}

const validate = () => {
    const newErrors = {}
    if(!email.value) newErrors.email = 'Email required'
    if(!password.value) newErrors.password = 'Password required'
    errors.value = newErrors
    return Object.keys(newErrors).length === 0
}

const handleLogin = async () => {
  if(!validate()) {
      error('Please check field errors')
      return
  }

  isLoading.value = true
  try {
    // Clear only admin token to prevent stale token issues
    // Do NOT clear user_token - allow concurrent admin+user sessions
    localStorage.removeItem('admin_token')
    
    const response = await axios.post('http://localhost:8000/api/auth/login', {
       email: email.value,
       password: password.value
    })
    
    // Check if user is superuser/admin
    if (!response.data.is_superuser) {
      error('Access denied. Admin privileges required.')
      return
    }
    
    localStorage.setItem('admin_token', response.data.access_token)
    localStorage.setItem('admin_user', JSON.stringify(response.data.user))
    // Admin is always activated and superuser
    // localStorage.setItem('panel_type', 'admin')
    
    success('Welcome, Administrator!')
    
    setTimeout(() => router.push('/admin/dashboard'), 1000)
    
  } catch (e) {
    if (e.response && e.response.data.detail) {
        error('Invalid email or password')
    } else {
        error('Invalid email or password')
    }
  } finally {
    isLoading.value = false
  }
}

</script>

<style scoped>
.page-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--bg-color);
  padding: 20px;
  transition: background-color 240ms var(--ease);
}

.auth-theme-toggle {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 5;
}

.auth-container {
  width: 100%;
  max-width: 400px;
  background: var(--auth-card-bg);
  border-radius: 16px;
  padding: 40px 32px;
  box-shadow: var(--auth-card-shadow);
  border: 1px solid var(--card-border);
  transition: background-color 240ms var(--ease), border-color 240ms var(--ease);
}

.auth-header {
  text-align: center;
  margin-bottom: 32px;
}

.brand-icon {
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
}

.brand-name {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.admin-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(220, 38, 38, 0.15);
  border: 1px solid rgba(220, 38, 38, 0.3);
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  color: #ef4444;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}
[data-theme="light"] .admin-badge {
  background: rgba(220, 38, 38, 0.10);
  border-color: rgba(220, 38, 38, 0.40);
  color: #b91c1c;
}

.auth-subtitle {
  color: var(--text-secondary);
  font-size: 14px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.input-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.floating-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.input-icon {
  position: absolute;
  left: 12px;
  top: 36px;
  color: var(--text-placeholder);
}

.minimal-input {
  width: 100%;
  height: 44px;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 8px;
  padding: 0 12px 0 40px;
  font-size: 14px;
  color: var(--text-primary);
  transition: all 0.2s;
}

.minimal-input::placeholder { color: var(--text-placeholder); }
.minimal-input:focus { border-color: #ef4444; background: var(--input-bg-focus); outline: none; }
.has-error .minimal-input { border-color: var(--accent-danger); }

.eye-btn {
  position: absolute;
  right: 12px;
  top: 36px;
  background: none;
  border: none;
  color: var(--text-placeholder);
  cursor: pointer;
}

.error-text {
  font-size: 11px;
  color: var(--accent-danger);
}

.btn-primary {
  height: 44px;
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-primary:hover { background: linear-gradient(135deg, #b91c1c, #991b1b); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.flex-center { display: flex; align-items: center; gap: 8px; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.auth-footer {
  text-align: center;
  margin-top: 24px;
  color: var(--text-secondary);
  font-size: 13px;
}

.auth-footer a {
  color: var(--accent-noir);
  text-decoration: none;
}

.fade-in {
  opacity: 1;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
