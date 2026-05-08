<template>
  <div class="page-container">
    <div class="auth-container fade-in">
      
      <!-- Header -->
      <div class="auth-header">
        <Logo class="brand-icon" />
        <h1 class="brand-name">Fourconnect</h1>
        <p class="auth-subtitle">Enter your activation code</p>
      </div>

      <!-- Info Message -->
      <div class="info-box">
        <ShieldCheck :size="20" />
        <p>Your account requires activation. Please contact your administrator to receive your 8-digit activation code.</p>
      </div>

      <!-- Code Input -->
      <form @submit.prevent="handleActivate" class="auth-form">
        <div class="code-input-container">
          <input
            v-for="(digit, index) in 8"
            :key="index"
            :ref="el => codeInputs[index] = el"
            type="text"
            inputmode="numeric"
            maxlength="1"
            class="code-box"
            :class="{ 'has-value': code[index], 'error': hasError }"
            v-model="code[index]"
            @input="handleInput(index, $event)"
            @keydown="handleKeydown(index, $event)"
            @paste="handlePaste"
          />
        </div>

        <span v-if="errorMessage" class="error-text centered">{{ errorMessage }}</span>

        <button type="submit" class="btn-primary" :disabled="isLoading || !isComplete">
          <span v-if="!isLoading">Activate Account</span>
          <span v-else class="flex-center"><Loader2 class="spin" :size="16"/> Verifying...</span>
        </button>
      </form>

      <!-- Footer -->
      <div class="auth-footer">
        <button class="link-btn" @click="handleLogout">Sign out and use different account</button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import Logo from '../components/icons/Logo.vue'
import { ShieldCheck, Loader2 } from 'lucide-vue-next'
import { useToast } from '../composables/useToast'

const router = useRouter()
const { success, error } = useToast()

const code = ref(['', '', '', '', '', '', '', ''])
const codeInputs = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const hasError = ref(false)

const isComplete = computed(() => code.value.every(d => d !== ''))

const handleInput = (index, event) => {
  const value = event.target.value.replace(/\D/g, '')
  code.value[index] = value
  hasError.value = false
  errorMessage.value = ''
  
  // Move to next input
  if (value && index < 7) {
    codeInputs.value[index + 1]?.focus()
  }
}

const handleKeydown = (index, event) => {
  // Move to previous on backspace
  if (event.key === 'Backspace' && !code.value[index] && index > 0) {
    codeInputs.value[index - 1]?.focus()
  }
}

const handlePaste = (event) => {
  event.preventDefault()
  const pastedData = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 8)
  pastedData.split('').forEach((char, i) => {
    if (i < 8) code.value[i] = char
  })
  // Focus last filled or next empty
  const nextEmpty = code.value.findIndex(d => d === '')
  codeInputs.value[nextEmpty >= 0 ? nextEmpty : 7]?.focus()
}

const handleActivate = async () => {
  if (!isComplete.value) return
  
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    const token = localStorage.getItem('user_token')
    await axios.post('http://localhost:8000/api/auth/activate', {
      activation_code: code.value.join('')
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    success('Account activated! Welcome to Fourconnect.')
    router.push('/dashboard')
  } catch (e) {
    hasError.value = true
    if (e.response?.data?.detail) {
      errorMessage.value = e.response.data.detail
    } else {
      errorMessage.value = 'Activation failed. Please try again.'
    }
    error(errorMessage.value)
  } finally {
    isLoading.value = false
  }
}

const handleLogout = () => {
  localStorage.removeItem('user_token')
  localStorage.removeItem('user_is_activated')
  router.push('/authentication/user/login')
}
</script>

<style scoped>
:root {
  --bg-color: #0d0d0d;
  --card-bg: #1a1a1c;
  --text-primary: #f5f5f5;
  --text-secondary: #8e8e93;
  --accent-color: #3b82f6;
  --error-color: #ef4444;
  --success-color: #34d399;
  --radius-md: 12px;
}

.page-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
}

.auth-container {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.auth-header {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.brand-icon { margin-bottom: 12px; }
.brand-name { font-size: 22px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
.auth-subtitle { font-size: 14px; color: var(--text-secondary); }

.info-box {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: var(--radius-md);
  color: #93c5fd;
  font-size: 13px;
  line-height: 1.5;
}

.info-box svg {
  flex-shrink: 0;
  margin-top: 2px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.code-input-container {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.code-box {
  width: 44px;
  height: 56px;
  background: var(--card-bg);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  text-align: center;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  outline: none;
  transition: all 0.2s;
}

.code-box:focus {
  border-color: var(--accent-color);
  background: rgba(59, 130, 246, 0.05);
}

.code-box.has-value {
  border-color: rgba(255, 255, 255, 0.2);
}

.code-box.error {
  border-color: var(--error-color);
  animation: shake 0.4s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

.error-text {
  color: var(--error-color);
  font-size: 12px;
}

.error-text.centered {
  text-align: center;
}

.btn-primary {
  height: 48px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border: none;
  color: white;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s;
}

.btn-primary:hover:not(:disabled) { 
  opacity: 0.9; 
  transform: translateY(-1px);
}

.btn-primary:disabled { 
  opacity: 0.4; 
  cursor: not-allowed; 
}

.flex-center { display: flex; align-items: center; justify-content: center; gap: 8px; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

.auth-footer {
  text-align: center;
}

.link-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: color 0.2s;
}

.link-btn:hover {
  color: var(--accent-color);
}

.fade-in { animation: fadeIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; opacity: 0; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>
