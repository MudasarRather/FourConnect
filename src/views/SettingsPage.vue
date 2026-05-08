<template>
  <div class="settings-page">
    <div class="settings-header">
      <h1 class="page-title">Settings</h1>
      <p class="page-subtitle">Manage your account preferences</p>
    </div>

    <div class="settings-layout">
      <!-- Sidebar Navigation -->
      <aside class="settings-sidebar">
        <nav class="sidebar-nav">
          <button v-for="tab in displayTabs" :key="tab.id" 
                  @click="switchTab(tab.id)"
                  :class="['nav-tab', { active: activeTab === tab.id }]">
            <component :is="tab.icon" :size="16" class="tab-icon" />
            <span class="tab-label">{{ tab.label }}</span>
          </button>
        </nav>
      </aside>

      <!-- Main Content Area -->
      <main class="settings-content">
        <transition name="fade-slide" mode="out-in">
          <!-- Profile Tab -->
          <section v-if="activeTab === 'profile'" key="profile" class="settings-card">
            <!-- Welcome Message -->
            <div class="welcome-banner">
              <h2>Welcome back, {{ user.full_name || 'User' }}!</h2>
              <p v-if="user.employee_code">Employee Code: <strong>{{ user.employee_code }}</strong></p>
            </div>
            
            <h3 class="card-title">Profile Information</h3>
            <p class="card-desc">Update your personal details.</p>
            
            <div class="avatar-section">
              <div class="avatar-preview" @click="triggerFileInput">
                <img v-if="avatarPreview || user.avatar_url" :src="avatarPreview || user.avatar_url" class="avatar-img" />
                <User v-else :size="28" class="avatar-placeholder" />
                <div class="avatar-overlay">
                  <Camera :size="16" />
                </div>
              </div>
              <input type="file" ref="fileInput" @change="handleAvatarChange" accept="image/*" class="hidden-input" />
              <div class="avatar-info">
                <button @click="triggerFileInput" class="btn-sm">Change Photo</button>
                <p class="helper-text">JPG, PNG or GIF. Max 2MB.</p>
              </div>
            </div>

            <div class="form-grid">
              <div class="input-wrapper">
                <label class="floating-label">Full Name</label>
                <User class="input-icon" :size="14" />
                <input v-model="profileForm.full_name" type="text" placeholder="Your name" class="minimal-input" />
              </div>
              <div class="input-wrapper">
                <label class="floating-label">Employee Code</label>
                <Hash class="input-icon" :size="14" />
                <input v-model="profileForm.employee_code" type="text" placeholder="EMP001" class="minimal-input" />
              </div>
              <div class="input-wrapper">
                <label class="floating-label">Email Address</label>
                <Mail class="input-icon" :size="14" />
                <input :value="user.email" type="email" disabled class="minimal-input disabled" />
              </div>
              <div class="input-wrapper">
                <label class="floating-label">Job Title</label>
                <Briefcase class="input-icon" :size="14" />
                <input v-model="profileForm.job_title" type="text" placeholder="e.g. Software Engineer" class="minimal-input" />
              </div>
              <div class="input-wrapper">
                <label class="floating-label">Department</label>
                <Building class="input-icon" :size="14" />
                <input v-model="profileForm.department" type="text" placeholder="e.g. Engineering" class="minimal-input" />
              </div>
              <div class="input-wrapper">
                <label class="floating-label">Phone Number</label>
                <PhoneInput 
                  v-model="profileForm.phone" 
                  v-model:countryCode="profileForm.country_code"
                />
              </div>
              <div class="input-wrapper">
                <label class="floating-label">Gender</label>
                <CustomSelect 
                  v-model="profileForm.gender" 
                  :options="genderOptions" 
                  placeholder="Select"
                  valueKey="id"
                />
              </div>
              <div class="input-wrapper">
                <label class="floating-label">Country</label>
                <CustomSelect 
                  v-model="profileForm.country" 
                  :options="countries" 
                  placeholder="Country"
                  labelKey="name"
                  valueKey="isoCode"
                  searchable
                  @change="onCountryChange"
                />
              </div>
              <div class="input-wrapper">
                <label class="floating-label">State</label>
                <CustomSelect 
                  v-model="profileForm.state" 
                  :options="states" 
                  placeholder="State"
                  labelKey="name"
                  valueKey="isoCode"
                  searchable
                  @change="onStateChange"
                />
              </div>
              <div class="input-wrapper">
                <label class="floating-label">City / District</label>
                <CustomSelect 
                  v-model="profileForm.city" 
                  :options="cities" 
                  placeholder="City"
                  labelKey="name"
                  valueKey="name"
                  searchable
                />
              </div>
              <div class="input-wrapper span-full">
                <label class="floating-label">Address</label>
                <MapPin class="input-icon" :size="14" />
                <input v-model="profileForm.address" type="text" placeholder="Full street address" class="minimal-input" />
              </div>
              <div class="input-wrapper span-full">
                <label class="floating-label">About Me</label>
                <textarea v-model="profileForm.bio" rows="2" placeholder="Write a short bio..." class="minimal-textarea"></textarea>
              </div>
            </div>

            <footer class="card-footer">
              <button @click="saveProfile" :disabled="saving" class="btn-primary">
                {{ saving ? 'Saving...' : 'Save Changes' }}
              </button>
            </footer>
          </section>

          <!-- Security Tab -->
          <section v-else-if="activeTab === 'security'" key="security" class="settings-card">
            <h3 class="card-title">Password & Security</h3>
            <p class="card-desc">Keep your account secure with a strong password.</p>
            
            <div class="form-grid">
              <div class="input-wrapper">
                <label class="floating-label">Current Password <span class="required">*</span></label>
                <Lock class="input-icon" :size="14" />
                <input 
                  v-model="passwordForm.old_password" 
                  :type="showOldPassword ? 'text' : 'password'" 
                  placeholder="Enter current password" 
                  class="minimal-input"
                  :class="{ 'has-error': passwordErrors.old_password }"
                />
                <button type="button" class="eye-btn" @click="showOldPassword = !showOldPassword">
                  <Eye v-if="!showOldPassword" :size="14" />
                  <EyeOff v-else :size="14" />
                </button>
                <span v-if="passwordErrors.old_password" class="error-text">{{ passwordErrors.old_password }}</span>
              </div>
              <div class="input-wrapper">
                <label class="floating-label">New Password <span class="required">*</span></label>
                <Lock class="input-icon" :size="14" />
                <input 
                  v-model="passwordForm.new_password" 
                  :type="showNewPassword ? 'text' : 'password'" 
                  placeholder="Enter new password" 
                  class="minimal-input"
                  :class="{ 'has-error': passwordErrors.new_password }"
                  @input="updatePasswordStrength"
                />
                <button type="button" class="eye-btn" @click="showNewPassword = !showNewPassword">
                  <Eye v-if="!showNewPassword" :size="14" />
                  <EyeOff v-else :size="14" />
                </button>
                <span v-if="passwordErrors.new_password" class="error-text">{{ passwordErrors.new_password }}</span>
              </div>
              
              <!-- Password Strength Bar -->
              <div class="input-wrapper span-full" v-if="passwordForm.new_password">
                <div class="strength-meter-container">
                  <div class="strength-meter">
                    <div class="bar" :class="{ active: passwordStrength >= 1, weak: passwordStrength === 1 }"></div>
                    <div class="bar" :class="{ active: passwordStrength >= 2, medium: passwordStrength === 2 }"></div>
                    <div class="bar" :class="{ active: passwordStrength >= 3, strong: passwordStrength === 3 }"></div>
                    <div class="bar" :class="{ active: passwordStrength >= 4, secure: passwordStrength === 4 }"></div>
                  </div>
                  <span class="strength-text">{{ strengthLabel }}</span>
                </div>
                <ul class="password-requirements">
                  <li :class="{ met: hasMinLength }">At least 8 characters</li>
                  <li :class="{ met: hasUppercase }">One uppercase letter</li>
                  <li :class="{ met: hasNumber }">One number</li>
                  <li :class="{ met: hasSpecial }">One special character</li>
                </ul>
              </div>
              
              <div class="input-wrapper span-full">
                <label class="floating-label">Confirm Password <span class="required">*</span></label>
                <CheckCircle class="input-icon" :size="14" />
                <input 
                  v-model="passwordForm.confirm_password" 
                  :type="showConfirmPassword ? 'text' : 'password'" 
                  placeholder="Confirm new password" 
                  class="minimal-input"
                  :class="{ 'has-error': passwordErrors.confirm_password }"
                />
                <button type="button" class="eye-btn" @click="showConfirmPassword = !showConfirmPassword">
                  <Eye v-if="!showConfirmPassword" :size="14" />
                  <EyeOff v-else :size="14" />
                </button>
                <span v-if="passwordErrors.confirm_password" class="error-text">{{ passwordErrors.confirm_password }}</span>
              </div>
            </div>

            <footer class="card-footer">
              <button @click="changePassword" :disabled="changingPassword" class="btn-primary">
                {{ changingPassword ? 'Updating...' : 'Update Password' }}
              </button>
            </footer>
          </section>

          <!-- Notifications Tab -->
          <section v-else-if="activeTab === 'notifications'" key="notifications" class="settings-card">
            <h3 class="card-title">Notification Preferences</h3>
            <p class="card-desc">Choose how you receive updates.</p>
            
            <div class="toggle-list">
              <div class="toggle-item" v-for="(item, key) in notificationItems" :key="key">
                <div class="toggle-info">
                  <component :is="item.icon" :size="18" class="toggle-icon" />
                  <div>
                    <h4>{{ item.title }}</h4>
                    <p>{{ item.desc }}</p>
                  </div>
                </div>
                <label class="switch">
                  <input type="checkbox" :checked="notifications[key]" @change="toggleNotification(key)" />
                  <span class="slider"></span>
                </label>
              </div>
            </div>
          </section>

          <!-- Organization Tab -->
          <section v-else-if="activeTab === 'organization'" key="organization" class="settings-card">
            <h3 class="card-title">Organization</h3>
            <p class="card-desc">View your organization details.</p>
            
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Organization</span>
                <span class="info-value">Fourconnect</span>
              </div>
              <div class="info-item">
                <span class="info-label">Employee Code</span>
                <span class="info-value">{{ user.employee_code || 'Not assigned' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Role</span>
                <span class="info-value">{{ user.is_superuser ? 'Administrator' : 'Member' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Member Since</span>
                <span class="info-value">{{ formatFullDate(user.created_at) }}</span>
              </div>
            </div>
          </section>

          <!-- System Config Tab (Admin Only) -->
          <section v-else-if="activeTab === 'system' && user.is_superuser" key="system" class="settings-card">
            <h3 class="card-title">System Configuration</h3>
            <p class="card-desc">Global application settings.</p>
            
            <div class="toggle-list">
              <div class="toggle-item">
                <div class="toggle-info">
                  <Shield class="toggle-icon" :size="18" />
                  <div>
                    <h4>Allow Edit Expired Projects</h4>
                    <p>Enable admins to create milestones/tasks in projects past their due date.</p>
                  </div>
                </div>
                <label class="switch">
                  <input type="checkbox" :checked="systemSettings.allow_admin_edit_expired_project" @change="toggleSystemSetting('allow_admin_edit_expired_project')" />
                  <span class="slider"></span>
                </label>
              </div>
            </div>
          </section>




        </transition>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { Country, State, City } from 'country-state-city'
import { 
  User, Shield, Bell, Building, Palette, Camera, Mail, MessageSquare, Phone, Calendar, 
  Eye, EyeOff, Lock, CheckCircle, Briefcase, Hash, MapPin
} from 'lucide-vue-next'
import { useToast } from '../composables/useToast'
import CustomSelect from '../components/ui/CustomSelect.vue'
import PhoneInput from '../components/ui/PhoneInput.vue'

const { success, error, info } = useToast()
const route = useRoute()
const activeTab = ref('profile')
const user = ref({})
const saving = ref(false)
const changingPassword = ref(false)
const fileInput = ref(null)
const avatarPreview = ref(null)
const isInitialLoad = ref(true)

const showOldPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

const genderOptions = [
  { name: 'Male', id: 'male' }, 
  { name: 'Female', id: 'female' }, 
  { name: 'Other', id: 'other' }
]

const countries = ref([])
const states = ref([])
const cities = ref([])

const profileForm = ref({
  full_name: '',
  employee_code: '',
  job_title: '',
  department: '',
  phone: '',
  country_code: 'US',
  bio: '',
  gender: '',
  country: '',
  state: '',
  city: '',
  address: ''
})

const passwordForm = ref({
  old_password: '',
  new_password: '',
  confirm_password: ''
})

const passwordErrors = ref({})
const passwordStrength = ref(0)

const hasMinLength = computed(() => passwordForm.value.new_password.length >= 8)
const hasUppercase = computed(() => /[A-Z]/.test(passwordForm.value.new_password))
const hasNumber = computed(() => /[0-9]/.test(passwordForm.value.new_password))
const hasSpecial = computed(() => /[!@#$%^&*(),.?":{}|<>]/.test(passwordForm.value.new_password))

const strengthLabel = computed(() => {
  const labels = ['Weak', 'Weak', 'Good', 'Strong', 'Secure']
  return labels[passwordStrength.value]
})

const updatePasswordStrength = () => {
  let s = 0
  if (hasMinLength.value) s++
  if (hasUppercase.value) s++
  if (hasNumber.value) s++
  if (hasSpecial.value) s++
  passwordStrength.value = s
}

const notifications = ref({
  email: true,
  sms: false,
  whatsapp: false,
  push: true,
  digest: true
})

const notificationItems = {
  email: { title: 'Email Notifications', desc: 'Updates via email', icon: Mail },
  sms: { title: 'SMS Alerts', desc: 'Text message alerts', icon: MessageSquare },
  whatsapp: { title: 'WhatsApp Messages', desc: 'Notifications on WhatsApp', icon: Phone },
  push: { title: 'Push Notifications', desc: 'Browser notifications', icon: Bell },
  digest: { title: 'Weekly Digest', desc: 'Weekly activity summary', icon: Calendar }
}

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'organization', label: 'Organization', icon: Building }
]

const adminTabs = [
  ...tabs,
  { id: 'system', label: 'System Config', icon: Palette } // Using Palette generic icon for config
]

const displayTabs = computed(() => {
    return user.value?.is_superuser ? adminTabs : tabs
})

const switchTab = (tabId) => {
  activeTab.value = tabId
}

const onCountryChange = (opt) => {
  profileForm.value.state = ''
  profileForm.value.city = ''
  if (opt && opt.isoCode) {
    states.value = State.getStatesOfCountry(opt.isoCode).map(s => ({ name: s.name, isoCode: s.isoCode }))
  }
  cities.value = []
}

const onStateChange = (opt) => {
  profileForm.value.city = ''
  if (opt && opt.isoCode && profileForm.value.country) {
    cities.value = City.getCitiesOfState(profileForm.value.country, opt.isoCode).map(c => ({ name: c.name }))
  }
}

watch(() => profileForm.value.country, (newCountry) => {
  if (newCountry) {
    states.value = State.getStatesOfCountry(newCountry).map(s => ({ name: s.name, isoCode: s.isoCode }))
  }
}, { immediate: true })

watch(() => profileForm.value.state, (newState) => {
  if (newState && profileForm.value.country) {
    cities.value = City.getCitiesOfState(profileForm.value.country, newState).map(c => ({ name: c.name }))
  }
}, { immediate: true })

const fetchUser = async () => {
  try {
    const isAdmin = route.path.startsWith('/admin')
    const token = isAdmin ? localStorage.getItem('admin_token') : localStorage.getItem('user_token')
    
    if (!token) return
    
    const response = await axios.get('http://localhost:8000/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    user.value = response.data
    profileForm.value = {
      full_name: response.data.full_name || '',
      employee_code: response.data.employee_code || '',
      job_title: response.data.job_title || '',
      department: response.data.department || '',
      phone: response.data.phone || '',
      country_code: response.data.country_code || 'US',
      bio: response.data.bio || '',
      gender: response.data.gender || '',
      country: response.data.country || '',
      state: response.data.state || '',
      city: response.data.city || '',
      address: response.data.address || ''
    }
    if (response.data.notifications) {
      notifications.value = response.data.notifications
    }
    
    if (isInitialLoad.value) {
      info('Settings loaded')
      isInitialLoad.value = false
    }
  } catch (err) {
    error('Failed to load settings')
  }
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleAvatarChange = (e) => {
  const file = e.target.files[0]
  if (file) {
    if (file.size > 2 * 1024 * 1024) {
      error('Image must be less than 2MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      avatarPreview.value = event.target.result
      info('Photo selected')
    }
    reader.readAsDataURL(file)
  }
}

const saveProfile = async () => {
  saving.value = true
  try {
    const payload = { ...profileForm.value }
    if (avatarPreview.value) {
      payload.avatar_url = avatarPreview.value
    }
    const isAdmin = window.location.pathname.startsWith('/admin')
    const token = isAdmin ? localStorage.getItem('admin_token') : localStorage.getItem('user_token')

    if (!token) return

    await axios.put('http://localhost:8000/api/auth/me', payload, {
      headers: { Authorization: `Bearer ${token}` }
    })
    success('Profile saved successfully')

    const response = await axios.get('http://localhost:8000/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    user.value = response.data
  } catch (err) {
    error(err.response?.data?.detail || 'Failed to save profile')
  } finally {
    saving.value = false
  }
}

const validatePasswordForm = () => {
  passwordErrors.value = {}
  let valid = true
  
  if (!passwordForm.value.old_password) {
    passwordErrors.value.old_password = 'Current password is required'
    valid = false
  }
  if (!passwordForm.value.new_password) {
    passwordErrors.value.new_password = 'New password is required'
    valid = false
  } else if (!hasMinLength.value || !hasUppercase.value || !hasNumber.value || !hasSpecial.value) {
    passwordErrors.value.new_password = 'Password does not meet requirements'
    valid = false
  }
  if (!passwordForm.value.confirm_password) {
    passwordErrors.value.confirm_password = 'Please confirm password'
    valid = false
  } else if (passwordForm.value.new_password !== passwordForm.value.confirm_password) {
    passwordErrors.value.confirm_password = 'Passwords do not match'
    valid = false
  }
  
  return valid
}

const changePassword = async () => {
  if (!validatePasswordForm()) {
    error('Please fix the errors in the form')
    return
  }
  
  changingPassword.value = true
  try {
    const isAdmin = window.location.pathname.startsWith('/admin')
    const token = isAdmin ? localStorage.getItem('admin_token') : localStorage.getItem('user_token')

    await axios.put('http://localhost:8000/api/auth/password', {
      old_password: passwordForm.value.old_password,
      new_password: passwordForm.value.new_password
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    success('Password updated successfully')
    passwordForm.value = { old_password: '', new_password: '', confirm_password: '' }
    passwordErrors.value = {}
    passwordStrength.value = 0
  } catch (err) {
    error(err.response?.data?.detail || 'Failed to update password')
  } finally {
    changingPassword.value = false
  }
}

const toggleNotification = async (key) => {
  notifications.value[key] = !notifications.value[key]
  success(`${notificationItems[key].title} ${notifications.value[key] ? 'enabled' : 'disabled'}`)
}

const formatFullDate = (dateString) => {
  if (!dateString) return 'Recently joined'
  return new Date(dateString).toLocaleDateString('en-US', { 
    weekday: 'long',
    day: 'numeric',
    month: 'long', 
    year: 'numeric' 
  })
}

const systemSettings = ref({})

const fetchSystemSettings = async () => {
  if (!user.value.is_superuser) return
  try {
     const token = localStorage.getItem('admin_token')
     const response = await axios.get('http://localhost:8000/api/settings/', {
        headers: { Authorization: `Bearer ${token}` }
     })
     // Map array to object
     const map = {}
     response.data.forEach(s => {
        map[s.key] = s.value === 'true' // Convert string 'true' to boolean
     })
     systemSettings.value = map
  } catch (e) {
     console.error("Failed to fetch settings", e)
  }
}

const toggleSystemSetting = async (key) => {
   const currentVal = systemSettings.value[key]
   const newVal = !currentVal
   
   try {
      const token = localStorage.getItem('admin_token')
      await axios.put(`http://localhost:8000/api/settings/${key}`, { value: String(newVal) }, {
         headers: { Authorization: `Bearer ${token}` }
      })
      systemSettings.value[key] = newVal
      success('Setting updated')
   } catch(e) {
      error('Failed to update setting')
   }
}

watch(() => user.value, (u) => {
   if(u?.is_superuser) fetchSystemSettings()
})

onMounted(() => {
  countries.value = Country.getAllCountries().map(c => ({ name: c.name, isoCode: c.isoCode }))
  fetchUser()
})
</script>

<style scoped>
.settings-page {
  padding: 32px 48px;
  max-width: 1400px;
  margin: 0 auto;
}

.settings-header { margin-bottom: 32px; }

.page-title {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-bottom: 4px;
}

.page-subtitle { font-size: 13px; color: var(--text-secondary); }

.settings-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 48px;
}

.settings-sidebar { position: sticky; top: 90px; height: fit-content; }
.sidebar-nav { display: flex; flex-direction: column; gap: 4px; }

.nav-tab {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; border-radius: 12px; background: transparent;
  border: 1px solid transparent; color: var(--text-secondary); font-size: 14px;
  font-weight: 500; cursor: pointer; transition: all 0.2s ease; text-align: left;
}
.nav-tab:hover { background: rgba(255,255,255,0.03); color: #fff; }
.nav-tab.active { 
  background: rgba(255,255,255,0.08); 
  color: #fff; 
  border-color: rgba(255,255,255,0.08);
}
.tab-icon { opacity: 0.5; transition: all 0.2s; }
.nav-tab.active .tab-icon { opacity: 1; color: #fff; }

.settings-content { min-height: 500px; }

.settings-card {
  background: #141416; 
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px; 
  padding: 32px; 
  width: 100%;
}

.welcome-banner {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
  padding: 16px 20px; margin-bottom: 24px;
}
.welcome-banner h2 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
.welcome-banner p { font-size: 13px; color: var(--text-secondary); }
.welcome-banner strong { color: var(--input-focus); }

.card-title { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
.card-desc { font-size: 12px; color: var(--text-secondary); margin-bottom: 24px; }

.avatar-section {
  display: flex; align-items: center; gap: 16px; margin-bottom: 24px;
  padding-bottom: 24px; border-bottom: 1px solid var(--divider-color);
}
.avatar-preview {
  width: 64px; height: 64px; border-radius: 50%;
  background: rgba(255,255,255,0.05); display: flex;
  align-items: center; justify-content: center; cursor: pointer;
  position: relative; overflow: hidden; transition: all 0.3s ease; flex-shrink: 0;
}
.avatar-preview:hover { transform: scale(1.05); }
.avatar-preview:hover .avatar-overlay { opacity: 1; }
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar-placeholder { color: var(--text-tertiary); }
.avatar-overlay {
  position: absolute; inset: 0; background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.3s; color: #fff;
}
.hidden-input { display: none; }
.helper-text { font-size: 11px; color: var(--text-tertiary); margin-top: 4px; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; width: 100%; }
.span-full { grid-column: span 2; }

.input-wrapper { position: relative; display: flex; flex-direction: column; gap: 4px; width: 100%; }

.floating-label {
  font-size: 10px; color: var(--text-secondary); font-weight: 600;
  text-transform: uppercase; margin-left: 2px;
}
.floating-label .required { color: #ff453a; }

.input-icon {
  position: absolute; left: 12px; top: 28px;
  color: var(--text-placeholder); pointer-events: none; z-index: 2;
}

.minimal-input {
  width: 100%; height: 40px; background: var(--input-bg);
  border: 1px solid var(--input-border); border-radius: var(--radius-sm);
  padding: 0 12px 0 36px; font-size: 13px; color: var(--text-primary);
  transition: all 0.2s; outline: none;
}
.minimal-input:focus { background: #232325; border-color: var(--input-focus); }
.minimal-input.disabled { opacity: 0.5; cursor: not-allowed; }
.minimal-input.has-error { border-color: #ff453a; }

.minimal-textarea {
  width: 100%; background: var(--input-bg); border: 1px solid var(--input-border);
  border-radius: var(--radius-sm); padding: 10px 12px; font-size: 13px;
  color: var(--text-primary); resize: none; outline: none;
}
.minimal-textarea:focus { background: #232325; border-color: var(--input-focus); }

.error-text { font-size: 11px; color: #ff453a; margin-top: 2px; }

.eye-btn {
  position: absolute; right: 10px; top: 28px; background: none;
  border: none; color: var(--text-secondary); cursor: pointer; z-index: 2; padding: 4px;
}
.eye-btn:hover { color: var(--text-primary); }

.strength-meter-container { display: flex; align-items: center; gap: 10px; }
.strength-meter { flex: 1; display: flex; gap: 4px; height: 4px; }
.bar { flex: 1; background: var(--input-border); border-radius: 2px; transition: all 0.3s; }
.bar.active.weak { background: #ff453a; }
.bar.active.medium { background: #ff9f0a; }
.bar.active.strong { background: #32d74b; }
.bar.active.secure { background: #30d158; }
.strength-text { font-size: 11px; color: var(--text-secondary); min-width: 50px; text-align: right; }

.password-requirements { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-top: 8px; list-style: none; }
.password-requirements li {
  font-size: 11px; color: var(--text-tertiary); position: relative; padding-left: 16px;
}
.password-requirements li::before { content: '○'; position: absolute; left: 0; color: var(--text-tertiary); }
.password-requirements li.met { color: #30d158; }
.password-requirements li.met::before { content: '✓'; color: #30d158; }

.card-footer {
  margin-top: 24px; padding-top: 16px;
  border-top: 1px solid var(--divider-color); display: flex; justify-content: flex-end;
}

.btn-primary {
  background: var(--btn-primary); color: var(--btn-primary-text); border: none;
  padding: 10px 20px; border-radius: var(--radius-sm); font-size: 13px;
  font-weight: 600; cursor: pointer; transition: all 0.15s ease;
}
.btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

.btn-sm {
  background: transparent; border: 1px solid rgba(255,255,255,0.15);
  color: #fff; padding: 6px 14px; border-radius: var(--radius-sm);
  font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;
}
.btn-sm:hover { border-color: #fff; background: rgba(255,255,255,0.05); }

.toggle-list { display: flex; flex-direction: column; gap: 10px; }
.toggle-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 16px; background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; transition: all 0.2s ease;
}
.toggle-item:hover { border-color: rgba(255,255,255,0.12); }
.toggle-info { display: flex; align-items: center; gap: 12px; }
.toggle-icon { color: var(--text-secondary); }
.toggle-info h4 { font-size: 13px; font-weight: 600; margin-bottom: 2px; }
.toggle-info p { font-size: 11px; color: var(--text-tertiary); }

.switch { position: relative; display: inline-block; width: 44px; height: 24px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider {
  position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(255,255,255,0.1); transition: 0.3s cubic-bezier(0.16,1,0.3,1);
  border-radius: 24px; border: 1px solid rgba(255,255,255,0.08);
}
.slider:before {
  position: absolute; content: ""; height: 18px; width: 18px; left: 2px; bottom: 2px;
  background: #fff; transition: 0.3s cubic-bezier(0.16,1,0.3,1);
  border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
.switch input:checked + .slider { background: var(--input-focus); border-color: var(--input-focus); }
.switch input:checked + .slider:before { transform: translateX(20px); }

.info-grid { display: flex; flex-direction: column; }
.info-item {
  display: flex; justify-content: space-between; padding: 12px 0;
  border-bottom: 1px solid var(--divider-color);
}
.info-item:last-child { border-bottom: none; }
.info-label { font-size: 13px; color: var(--text-secondary); }
.info-value { font-size: 13px; font-weight: 600; }

.theme-selector { display: flex; gap: 12px; }
.theme-option {
  flex: 1; padding: 12px; background: rgba(255,255,255,0.02);
  border: 2px solid transparent; border-radius: 10px;
  text-align: center; cursor: pointer; transition: all 0.2s ease;
}
.theme-option:hover { border-color: rgba(255,255,255,0.1); }
.theme-option.active { border-color: var(--input-focus); background: rgba(59,130,246,0.1); }
.theme-preview { height: 40px; border-radius: 6px; margin-bottom: 8px; }
.theme-preview.dark { background: #1a1a1a; }
.theme-preview.light { background: #f5f5f5; }
.theme-preview.system { background: #2d2d2d; }
.theme-option span { font-size: 12px; font-weight: 500; }

.fade-slide-enter-active { transition: all 0.35s cubic-bezier(0.16,1,0.3,1); }
.fade-slide-leave-active { transition: all 0.2s cubic-bezier(0.4,0,0.2,1); }
.fade-slide-enter-from { opacity: 0; transform: translateY(12px); }
.fade-slide-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
