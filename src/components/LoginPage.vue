<template>
  <div class="page-container">
    <div class="auth-container fade-in">
      
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
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import Logo from './icons/Logo.vue'
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-vue-next'

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
    const response = await axios.post('http://localhost:8000/api/auth/login', {
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
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #000000;
  padding: 20px;
}

.auth-container {
  width: 100%;
  max-width: 400px;
  background: #121214;
  border-radius: 16px;
  padding: 40px 32px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 24px;
  opacity: 1;
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
  background: #232325;
  border-color: var(--input-focus);
}

.minimal-input::placeholder {
  color: var(--text-placeholder);
}

/* Error State */
.input-wrapper.has-error .minimal-input {
  border-color: #ff453a;
  background: rgba(255, 69, 58, 0.05);
}
.input-wrapper.has-error .input-icon {
  color: #ff453a;
}
.error-text {
  font-size: 11px;
  color: #ff453a;
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
  background: #2c2c2e;
  border-color: var(--text-secondary);
}

.auth-footer {
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
}
</style>
