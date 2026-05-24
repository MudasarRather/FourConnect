<template>
  <div class="page-container">
    <div class="auth-theme-toggle">
      <ThemeToggle />
    </div>
    <div class="auth-container fade-in">

      <!-- Session-expired banner -->
      <div v-if="isExpired" class="auth-banner" role="alert">
        <ShieldAlert :size="14" class="banner-icon" />
        <span>Your session expired. Please sign in again to continue.</span>
      </div>

      <!-- Header -->
      <div class="auth-header">
        <Logo class="brand-icon" />
        <h1 class="brand-name">Fourconnect</h1>
        <p class="auth-subtitle">Sign in to your dashboard</p>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleLogin" class="auth-form" novalidate>
        
        <div class="input-wrapper" :class="{ 'has-error': errors.email }">
          <label class="floating-label">Email</label>
          <Mail class="input-icon" :size="16" />
          <input 
            type="email" 
            v-model="email" 
            placeholder="name@company.com" 
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

        <div class="form-actions">
           <a href="#" class="forgot-link">Forgot password?</a>
        </div>

        <button type="submit" class="btn-primary" :disabled="isLoading">
          <span v-if="!isLoading">Sign In</span>
          <span v-else class="flex-center"><Loader2 class="spin" :size="16"/> Processing...</span>
        </button>

      </form>

      <!-- Divider -->


      <!-- Footer -->
      <div class="auth-footer">
        <p>No account? <router-link to="/authentication/user/signup">Create One</router-link></p>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import Logo from './icons/Logo.vue'
import ThemeToggle from './common/ThemeToggle.vue'
import { Mail, Lock, Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-vue-next'

import { useToast } from '../composables/useToast'
import { API } from '@/utils/api'

const router = useRouter()
const route = useRoute()
const { success, error } = useToast()
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const errors = ref({})

const isExpired = computed(() => route.query.expired === '1')

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
    const response = await axios.post(`${API}/auth/login`, {
       email: email.value,
       password: password.value
    })
    
    // Block admin users from user panel
    if (response.data.is_superuser) {
      error('Invalid email or password')
      return
    }
    
    localStorage.setItem('user_token', response.data.access_token)
    localStorage.setItem('user_is_activated', response.data.is_activated ? 'true' : 'false')
    if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user))
    }
    // We don't need is_superuser for user session context strictly, but can keep for reference
    // localStorage.setItem('panel_type', 'user') // Panel type is now implied by route
    
    success('Welcome back!')
    
    // Redirect based on activation status
    if (response.data.is_activated) {
      setTimeout(() => router.push('/user/dashboard'), 1000)
    } else {
      setTimeout(() => router.push('/authentication/user/activation'), 1000)
    }
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
/* Scoped layout - duplicating typical styles for isolation/safety per vue pattern */
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

/* Theme toggle floats top-right of the page (no nav on auth surfaces) */
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
  display: flex;
  flex-direction: column;
  gap: 20px;
  opacity: 1;
  transition: background-color 240ms var(--ease), border-color 240ms var(--ease);
  /* Light theme on cream: layer a faint warm sheen + soft brass edge */
  position: relative;
}

[data-theme="light"] .auth-container::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(160deg, rgba(251, 191, 36, 0.06), transparent 40%);
  pointer-events: none;
}

/* Session-expired banner — warm warning, theme-aware */
.auth-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  font-size: 12.5px;
  font-weight: 500;
  border-radius: 10px;
  background: rgba(251, 146, 60, 0.10);
  border: 1px solid rgba(251, 146, 60, 0.32);
  color: var(--accent-gold);
}
.banner-icon { flex-shrink: 0; }
[data-theme="light"] .auth-banner {
  background: rgba(217, 119, 6, 0.10);
  border-color: rgba(217, 119, 6, 0.40);
  color: #92400e;
}

.auth-header {
  text-align: center;
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.brand-icon {
  margin-bottom: 12px;
}

.brand-name {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
  letter-spacing: -0.02em;
}

.auth-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.floating-label {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  margin-left: 4px;
}

.input-icon {
  position: absolute;
  left: 14px;
  top: 36px;
  color: var(--text-placeholder);
  pointer-events: none;
  transition: color 0.2s;
}

.minimal-input {
  width: 100%;
  height: 48px;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: var(--radius-md);
  padding: 0 16px 0 42px; /* icon padding */
  font-size: 14px;
  color: var(--text-primary);
  transition: all 0.2s;
  outline: none;
}

.minimal-input:focus {
  background: var(--input-bg-focus);
  border-color: var(--input-focus);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.10);
}

.minimal-input::placeholder {
  color: var(--text-placeholder);
}

/* Error State */
.input-wrapper.has-error .minimal-input {
  border-color: var(--accent-danger);
  background: rgba(255, 69, 58, 0.05);
}
[data-theme="light"] .input-wrapper.has-error .minimal-input {
  background: rgba(220, 38, 38, 0.05);
}
.input-wrapper.has-error .input-icon {
  color: var(--accent-danger);
}
.error-text {
  font-size: 11px;
  color: var(--accent-danger);
  margin-left: 4px;
}

/* Password Eye */
.eye-btn {
  position: absolute;
  right: 12px;
  top: 36px;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
}
.eye-btn:hover {
  color: var(--text-primary);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.forgot-link {
  font-size: 12px;
  color: var(--text-secondary);
}

.forgot-link:hover {
  color: var(--text-primary);
  text-decoration: none;
}

/* Buttons */
.btn-primary {
  height: 48px;
  background: var(--btn-primary);
  color: var(--btn-primary-text);
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.1s;
  margin-top: 8px;
}

.btn-primary:active {
  transform: scale(0.98);
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

.divider {
  text-align: center;
  border-top: 1px solid var(--divider-color);
  line-height: 0.1em;
  margin: 10px 0 20px; 
}

.divider span {
  background: var(--bg-color);
  padding: 0 10px;
  color: var(--text-placeholder);
  font-size: 12px;
}

.social-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.social-btn {
  height: 44px;
  border-radius: var(--radius-md);
  background: var(--card-bg);
  border: 1px solid var(--input-border);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  transition: background 0.2s;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
}

.fade-in {
  opacity: 1;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.social-btn:hover {
  background: var(--card-bg);
  border-color: var(--text-secondary);
}

.auth-footer {
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
}
</style>
