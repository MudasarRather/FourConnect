<template>
  <main class="page-container">
    <div class="auth-theme-toggle">
      <ThemeToggle />
    </div>
    <div class="auth-container fade-in">
      
      <!-- Header -->
      <div class="auth-header">
        <Logo class="brand-icon" />
        <h1 class="brand-name">Fourconnect</h1>
        <p class="auth-subtitle">Create your enterprise identity</p>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSignup" class="auth-form" novalidate>
        
        <!-- Row 1: Name & Employee Code -->
        <div class="form-grid">
          <div class="input-wrapper" :class="{ 'has-error': errors.fullName }">
            <label class="floating-label" for="fullName">Full Name</label>
            <User class="input-icon" :size="16" />
            <input 
              id="fullName"
              type="text" 
              v-model="fullName" 
              placeholder="Ex. John Doe" 
              @input="clearError('fullName')"
              class="minimal-input"
              required
              aria-required="true"
            />
            <span v-if="errors.fullName" class="error-text">{{ errors.fullName }}</span>
          </div>

          <div class="input-wrapper" :class="{ 'has-error': errors.employeeCode }">
            <label class="floating-label" for="employeeCode">Employee Code</label>
            <Hash class="input-icon" :size="16" />
            <input 
              id="employeeCode"
              type="text" 
              v-model="employeeCode" 
              placeholder="EMP001" 
              @input="clearError('employeeCode')"
              class="minimal-input"
              required
              aria-required="true"
            />
            <span v-if="errors.employeeCode" class="error-text">{{ errors.employeeCode }}</span>
          </div>
        </div>

        <!-- Row 1b: Phone -->
        <div class="form-grid">
          <div class="input-wrapper" :class="{ 'has-error': errors.phone }">
            <label class="floating-label">Phone Number</label>
            <PhoneInput 
              v-model="phone" 
              v-model:countryCode="phoneCountryCode"
              :error="!!errors.phone"
            />
            <span v-if="errors.phone" class="error-text">{{ errors.phone }}</span>
          </div>
          <div class="input-wrapper" :class="{ 'has-error': errors.gender }">
            <label class="floating-label">Gender <span class="required">*</span></label>
            <Users class="input-icon" :size="14" />
            <CustomSelect 
              v-model="gender" 
              :options="genderOptions" 
              placeholder="Select Gender"
              valueKey="id"
              :error="!!errors.gender"
              @change="clearError('gender')"
            />
            <span v-if="errors.gender" class="error-text">{{ errors.gender }}</span>
          </div>
        </div>

        <!-- Row 2: Email -->
        <!-- Row 2: Email -->
        <div class="form-grid">
          <div class="input-wrapper span-full" :class="{ 'has-error': errors.email }">
            <label class="floating-label" for="email">Work Email</label>
            <Mail class="input-icon" :size="16" />
            <input 
              id="email"
              type="email" 
              v-model="email" 
              placeholder="name@company.com" 
              @input="clearError('email')"
              class="minimal-input"
              required
              aria-required="true"
            />
            <span v-if="errors.email" class="error-text">{{ errors.email }}</span>
          </div>
        </div>

        <!-- Row 3: Location (Country, State, City) -->
        <div class="form-grid three-col">
           <div class="input-wrapper" :class="{ 'has-error': errors.country }">
            <label class="floating-label">Country <span class="required">*</span></label>
            <CustomSelect 
              v-model="country" 
              :options="countries" 
              placeholder="Select Country"
              labelKey="name"
              valueKey="isoCode"
              searchable
              :error="!!errors.country"
              @change="onCountryChange"
            />
            <span v-if="errors.country" class="error-text">{{ errors.country }}</span>
          </div>

          <div class="input-wrapper" :class="{ 'has-error': errors.state }">
            <label class="floating-label">State <span class="required">*</span></label>
            <CustomSelect 
              v-model="state" 
              :options="states" 
              placeholder="Select State"
              labelKey="name"
              valueKey="isoCode"
              searchable
              :error="!!errors.state"
              @change="onStateChange"
              :disabled="!country"
            />
            <span v-if="errors.state" class="error-text">{{ errors.state }}</span>
          </div>

          <div class="input-wrapper" :class="{ 'has-error': errors.city }">
            <label class="floating-label">District/City <span class="required">*</span></label>
            <CustomSelect 
              v-model="city" 
              :options="cities" 
              placeholder="Select City"
              labelKey="name"
              valueKey="name"
              searchable
              :error="!!errors.city"
              @change="clearError('city')"
              :disabled="!state"
            />
            <span v-if="errors.city" class="error-text">{{ errors.city }}</span>
          </div>
        </div>
        <span v-if="errors.location" class="error-text centered-error">{{ errors.location }}</span>

        <!-- Row 4: Address -->
        <!-- Row 4: Address -->
        <div class="form-grid">
          <div class="input-wrapper span-full" :class="{ 'has-error': errors.address }">
            <label class="floating-label" for="address">Address</label>
            <MapPin class="input-icon" :size="16" />
            <input 
              id="address"
              type="text" 
              v-model="address" 
              placeholder="Full street address" 
              @input="clearError('address')"
              class="minimal-input"
              required
              aria-required="true"
            />
            <span v-if="errors.address" class="error-text">{{ errors.address }}</span>
          </div>
        </div>

        <!-- Row 4: Passwords -->
        <div class="password-section">
          <div class="form-grid">
            <div class="input-wrapper" :class="{ 'has-error': errors.password }">
              <label class="floating-label" for="password">Password <span class="required">*</span></label>
              <Lock class="input-icon" :size="16" />
              <input 
                id="password"
                :type="showPassword ? 'text' : 'password'" 
                v-model="password" 
                placeholder="Create password" 
                @input="updatePasswordStrength"
                class="minimal-input"
                required
                aria-required="true"
              />
              <button type="button" class="eye-btn" @click="showPassword = !showPassword" aria-label="Toggle password visibility">
                <Eye v-if="!showPassword" :size="16" />
                <EyeOff v-else :size="16" />
              </button>
            </div>

            <div class="input-wrapper" :class="{ 'has-error': errors.confirmPassword }">
              <label class="floating-label" for="confirmPassword">Confirm Password <span class="required">*</span></label>
              <CheckCircle class="input-icon" :size="16" />
              <input 
                id="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'" 
                v-model="confirmPassword" 
                placeholder="Repeat password" 
                @input="clearError('confirmPassword')"
                class="minimal-input"
                required
                aria-required="true"
              />
               <button type="button" class="eye-btn" @click="showConfirmPassword = !showConfirmPassword" aria-label="Toggle confirm password visibility">
                <Eye v-if="!showConfirmPassword" :size="16" />
                <EyeOff v-else :size="16" />
              </button>
            </div>
          </div>
          
           <!-- Strength Meter -->
           <div class="strength-meter-container" v-if="password">
             <div class="strength-meter">
              <div class="bar" :class="{ active: strength >= 1, weak: strength === 1 }"></div>
              <div class="bar" :class="{ active: strength >= 2, medium: strength === 2 }"></div>
              <div class="bar" :class="{ active: strength >= 3, strong: strength === 3 }"></div>
              <div class="bar" :class="{ active: strength >= 4, secure: strength === 4 }"></div>
            </div>
            <span class="strength-text">{{ strengthLabel }}</span>
           </div>
           
           <!-- Password Requirements -->
           <!-- Password Requirements (Single Line) -->
           <ul class="password-requirements horizontal" v-if="password">
             <li :class="{ met: hasMinLength }">8+ chars</li>
             <li :class="{ met: hasUppercase }">Uppercase</li>
             <li :class="{ met: hasNumber }">Number</li>
             <li :class="{ met: hasSpecial }">Special char</li>
           </ul>
           
           <div v-if="errors.password || errors.confirmPassword" class="password-errors">
             <span v-if="errors.password" class="error-text">{{ errors.password }}</span>
             <span v-if="errors.confirmPassword" class="error-text">{{ errors.confirmPassword }}</span>
           </div>
        </div>

        <button type="submit" class="btn-primary" :disabled="isLoading">
          <span v-if="!isLoading">Create Account</span>
          <span v-else class="flex-center"><Loader2 class="spin" :size="16"/> Creating...</span>
        </button>

      </form>



      <!-- Footer -->
      <div class="auth-footer">
        <p>Already a member? <router-link to="/login">Sign In</router-link></p>
      </div>

    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import Logo from './icons/Logo.vue'
import ThemeToggle from './common/ThemeToggle.vue'
import CustomSelect from './ui/CustomSelect.vue'
import PhoneInput from './ui/PhoneInput.vue'
import { Country, State, City } from 'country-state-city'
import { User, Users, Mail, Lock, Eye, EyeOff, CheckCircle, Loader2, Hash, MapPin } from 'lucide-vue-next'

import { useToast } from '../composables/useToast'
import { API } from '@/utils/api'

const router = useRouter()
const { success, error } = useToast()

// Data
const fullName = ref('')
const email = ref('')
const phone = ref('')
const phoneCountryCode = ref('US')
const employeeCode = ref('')
const gender = ref('')
const country = ref('')
const state = ref('')
const city = ref('')
const address = ref('')
const password = ref('')
const confirmPassword = ref('')

// Password validation computed
const hasMinLength = computed(() => password.value.length >= 8)
const hasUppercase = computed(() => /[A-Z]/.test(password.value))
const hasNumber = computed(() => /[0-9]/.test(password.value))
const hasSpecial = computed(() => /[!@#$%^&*(),.?":{}|<>]/.test(password.value))

const showPassword = ref(false)
const showConfirmPassword = ref(false)
const isLoading = ref(false)
const errors = ref({})
const strength = ref(0)

// Geo Data Options
const genderOptions = [
  { name: 'Male', id: 'male' }, 
  { name: 'Female', id: 'female' }, 
  { name: 'Other', id: 'other' }
]
const countries = ref([])
const states = ref([])
const cities = ref([])

onMounted(() => {
  countries.value = Country.getAllCountries().map(c => ({ name: c.name, isoCode: c.isoCode }))
})

const onCountryChange = (opt) => {
  clearError('country')
  state.value = ''
  city.value = ''
  states.value = State.getStatesOfCountry(opt.isoCode).map(s => ({ name: s.name, isoCode: s.isoCode }))
  cities.value = []
}

const onStateChange = (opt) => {
  clearError('state')
  city.value = ''
  cities.value = City.getCitiesOfState(country.value, opt.isoCode).map(c => ({ name: c.name }))
}

// Password Strength
const strengthLabel = computed(() => {
  const labels = ['Weak', 'Weak', 'Good', 'Strong', 'Secure']
  return labels[strength.value]
})

const updatePasswordStrength = () => {
  clearError('password')
  let s = 0
  if (hasMinLength.value) s++
  if (hasUppercase.value) s++
  if (hasNumber.value) s++
  if (hasSpecial.value) s++
  strength.value = s
}

// Utility functions
const clearError = (field) => {
  delete errors.value[field]
}

// Validation
const validate = () => {
  errors.value = {}
  let valid = true

  if (!fullName.value.trim()) {
    errors.value.fullName = 'Full name is required'
    valid = false
  }
  if (!employeeCode.value.trim()) {
    errors.value.employeeCode = 'Employee code is required'
    valid = false
  }
  if (!phone.value.trim()) {
    errors.value.phone = 'Phone number is required'
    valid = false
  }
  if (!gender.value) {
    errors.value.gender = 'Gender is required'
    valid = false
  }
  if (!email.value.trim()) {
    errors.value.email = 'Email is required'
    valid = false
  } else if (!/^\S+@\S+\.\S+$/.test(email.value)) {
    errors.value.email = 'Invalid email format'
    valid = false
  }
  if (!country.value) {
    errors.value.country = 'Country is required'
    valid = false
  }
  if (!state.value) {
    errors.value.state = 'State is required'
    valid = false
  }
  if (!city.value) {
    errors.value.city = 'City/District is required'
    valid = false
  }
  if (!address.value.trim()) {
    errors.value.address = 'Address is required'
    valid = false
  }
  if (!password.value) {
    errors.value.password = 'Password is required'
    valid = false
  } else if (!hasMinLength.value || !hasUppercase.value || !hasNumber.value || !hasSpecial.value) {
    errors.value.password = 'Password must meet all requirements'
    valid = false
  }
  if (!confirmPassword.value) {
    errors.value.confirmPassword = 'Please confirm password'
    valid = false
  } else if (password.value !== confirmPassword.value) {
    errors.value.confirmPassword = 'Passwords do not match'
    valid = false
  }

  return valid
}

const handleSignup = async () => {
  if (!validate()) {
    error('Please fix the errors in the form')
    return
  }

  isLoading.value = true
  
  try {
     const response = await axios.post(`${API}/auth/signup`, {
      email: email.value,
      full_name: fullName.value,
      password: password.value,
      employee_code: employeeCode.value || null,
      phone: phone.value,
      country_code: phoneCountryCode.value,
      address: address.value,
      country: country.value,
      state: state.value,
      city: city.value,
      gender: gender.value
    })
    // Don't store token - user must login to verify account
    success('Account created successfully! Please login to continue.')
    setTimeout(() => router.push('/login'), 1500)
  } catch (e) {
     if (e.response && e.response.data.detail) {
        // Detailed error handling
        const msg = e.response.data.detail.toLowerCase()
        if (msg.includes('employee code') || msg.includes('verification failed')) {
          errors.value.employeeCode = e.response.data.detail
        } else if (msg.includes('phone')) {
          errors.value.phone = e.response.data.detail
        } else {
          error(e.response.data.detail)
        }
     } else {
        error('Signup failed. Ensure backend is running.')
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
  max-width: 580px;
  background: var(--auth-card-bg);
  border-radius: 16px;
  padding: 40px 32px;
  box-shadow: var(--auth-card-shadow);
  border: 1px solid var(--card-border);
  display: flex;
  flex-direction: column;
  gap: 24px;
  transition: background-color 240ms var(--ease), border-color 240ms var(--ease);
}

.auth-header {
  text-align: center;
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.brand-icon { margin-bottom: 12px; }

.brand-name {
  font-size: 24px;
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

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-grid.three-col {
  grid-template-columns: 1fr 1fr 1fr;
}

.input-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
}


.span-full {
  grid-column: span 2;
}

/* Adjust span logic for Row 2 */
/* Actually, let's keep it simple: 1fr 1fr for Row 2 as well so Email and Gender are equal width, or Email 2/3 and Gender 1/3?
   Let's do standard 1fr 1fr for robustness. 
*/

.floating-label {
  font-size: 10px;
  color: var(--text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  margin-left: 2px;
  transition: color 0.2s;
}

.floating-label .required {
  color: var(--accent-danger);
}

.input-icon {
  position: absolute;
  left: 12px;
  top: 28px;
  color: var(--text-placeholder);
  pointer-events: none;
  transition: color 0.2s;
  z-index: 2;
}

.minimal-input {
  width: 100%;
  height: 40px;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: var(--radius-sm);
  padding: 0 12px 0 36px;
  font-size: 13px;
  color: var(--text-primary);
  transition: all 0.2s;
  outline: none;
}

.minimal-input:focus {
  background: var(--input-bg-focus);
  border-color: var(--input-focus);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.10);
}
.minimal-input::placeholder { color: var(--text-placeholder); }

/* Error Styling - Brighter and Readable */
.input-wrapper.has-error .minimal-input,
.input-wrapper.has-error :deep(.select-trigger),
.input-wrapper.has-error :deep(.phone-input-group) {
  border-color: var(--accent-danger);
  background: rgba(255, 69, 58, 0.08); /* Slightly more visible bg */
}
[data-theme="light"] .input-wrapper.has-error .minimal-input,
[data-theme="light"] .input-wrapper.has-error :deep(.select-trigger),
[data-theme="light"] .input-wrapper.has-error :deep(.phone-input-group) {
  background: rgba(220, 38, 38, 0.06);
}
.input-wrapper.has-error .floating-label {
  color: var(--accent-danger);
}
.input-wrapper.has-error .input-icon {
  color: var(--accent-danger);
}
.error-text {
  font-size: 11px;
  color: var(--accent-danger);
  margin-left: 4px;
  font-weight: 500;
  animation: slideDown 0.2s ease;
}
.centered-error {
  text-align: center;
  width: 100%;
  display: block;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
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
  z-index: 2;
}
.eye-btn:hover { color: var(--text-primary); }

/* Strength Meter */
.strength-meter-container {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}
.strength-meter {
  flex: 1;
  display: flex;
  gap: 4px;
  height: 4px;
}
.bar {
  flex: 1;
  background: var(--input-border);
  border-radius: 2px;
  transition: all 0.3s;
}
.bar.active.weak { background: var(--accent-danger); }
.bar.active.medium { background: #ff9f0a; }
.bar.active.strong { background: #32d74b; }
.bar.active.secure { background: var(--accent-emerald); }
[data-theme="light"] .bar.active.medium { background: #d97706; }
[data-theme="light"] .bar.active.strong { background: #059669; }
.strength-text {
  font-size: 11px;
  color: var(--text-secondary);
  min-width: 40px;
  text-align: right;
}

.password-errors {
  display: flex;
  flex-direction: column;
  gap: 2px;
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
  transition: transform 0.1s, opacity 0.2s;
  margin-top: 12px;
  position: relative;
  overflow: hidden;
}
.btn-primary:active { transform: scale(0.98); }
.btn-primary:hover { opacity: 0.9; }

.flex-center { display: flex; align-items: center; justify-content: center; gap: 8px; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

/* Social */
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

.social-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

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
.social-btn:hover { background: var(--card-bg); border-color: var(--text-secondary); }

.auth-footer {
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
}

/* Component animations */
.fade-in { animation: fadeIn 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; opacity: 0; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

/* Mobile */
@media (max-width: 600px) {
  .form-grid, .form-grid.three-col { grid-template-columns: 1fr; }
  .auth-container { max-width: 100%; }
}

/* Password Requirements Horizontal */
.password-requirements.horizontal {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  list-style: none;
  padding: 0;
  margin-top: 8px;
}

.password-requirements.horizontal li {
  font-size: 11px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.password-requirements.horizontal li::before {
  content: "•";
  color: var(--text-placeholder);
}

.password-requirements.horizontal li.met {
  color: var(--accent-emerald);
}
.password-requirements.horizontal li.met::before {
  color: #10b981;
}

.eye-btn {
  position: absolute;
  right: 10px;
  top: 26px; /* Adjusted alignment */
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 4px;
  z-index: 5;
}

.password-requirements li.met::before {
  content: '●';
}
</style>
