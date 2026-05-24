<template>
  <div class="profile-page">
    <header class="page-header">
      <div class="header-title">
        <div class="avatar-large">
          <img v-if="form.avatar_url" :src="form.avatar_url" alt="Avatar" />
          <span v-else>{{ initials }}</span>
        </div>
        <div>
          <h1>My Profile</h1>
          <p class="header-subtitle">{{ form.email || 'Loading…' }}</p>
        </div>
      </div>
      <div class="header-actions">
        <button class="ghost-btn" @click="reset" :disabled="!dirty || saving">
          <RotateCcw :size="14" /> Revert
        </button>
        <button class="primary-btn" @click="save" :disabled="!dirty || saving">
          <Loader2 v-if="saving" class="spin" :size="14" />
          <Save v-else :size="14" />
          Save Changes
        </button>
      </div>
    </header>

    <div v-if="loading" class="loading-block">
      <Loader2 class="spin" :size="32" /> <p>Loading profile…</p>
    </div>

    <form v-else class="profile-form" @submit.prevent="save">
      <!-- READ-ONLY IDENTITY -->
      <section class="form-section">
        <h2 class="section-title">Identity</h2>
        <p class="section-hint">These fields are managed by the system and your HR administrator.</p>
        <div class="grid-2">
          <div class="field">
            <label>Email</label>
            <input :value="form.email" readonly class="input readonly" />
          </div>
          <div class="field">
            <label>Employee Code</label>
            <input :value="form.employee_code || '—'" readonly class="input readonly" />
          </div>
          <div class="field">
            <label>Organisation</label>
            <input :value="form.organisation || '—'" readonly class="input readonly" />
          </div>
          <div class="field">
            <label>Account Status</label>
            <input :value="statusLabel" readonly class="input readonly" />
          </div>
        </div>
      </section>

      <!-- EDITABLE PERSONAL INFO -->
      <section class="form-section">
        <h2 class="section-title">Personal Information</h2>
        <div class="grid-2">
          <div class="field">
            <label>Full Name <span class="required">*</span></label>
            <input v-model="form.full_name" required class="input" />
          </div>
          <div class="field">
            <label>Gender</label>
            <select v-model="form.gender" class="input">
              <option value="">Prefer not to say</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div class="field">
            <label>Job Title</label>
            <input v-model="form.job_title" class="input" placeholder="e.g. Senior Engineer" />
          </div>
          <div class="field">
            <label>Department</label>
            <input v-model="form.department" class="input" placeholder="e.g. Engineering" />
          </div>
          <div class="field grid-col-2">
            <label>Bio</label>
            <textarea v-model="form.bio" rows="3" class="input textarea" placeholder="A short bio for your profile" />
          </div>
        </div>
      </section>

      <!-- CONTACT -->
      <section class="form-section">
        <h2 class="section-title">Contact</h2>
        <div class="grid-2">
          <div class="field">
            <label>Country Code</label>
            <input v-model="form.country_code" class="input" placeholder="e.g. IN" />
          </div>
          <div class="field">
            <label>Phone</label>
            <input v-model="form.phone" class="input" placeholder="e.g. 9876543210" />
          </div>
          <div class="field grid-col-2">
            <label>Address</label>
            <input v-model="form.address" class="input" placeholder="Street, area" />
          </div>
          <div class="field">
            <label>City</label>
            <input v-model="form.city" class="input" />
          </div>
          <div class="field">
            <label>State</label>
            <input v-model="form.state" class="input" />
          </div>
          <div class="field">
            <label>Country</label>
            <input v-model="form.country" class="input" />
          </div>
          <div class="field">
            <label>Current Location</label>
            <input v-model="form.location" class="input" placeholder="e.g. Bangalore, IN" />
          </div>
        </div>
      </section>

      <!-- AVATAR -->
      <section class="form-section">
        <h2 class="section-title">Profile Photo</h2>
        <div class="avatar-row">
          <div class="avatar-preview">
            <img v-if="form.avatar_url" :src="form.avatar_url" alt="Avatar" />
            <span v-else>{{ initials }}</span>
          </div>
          <div class="avatar-actions">
            <label class="ghost-btn upload-btn">
              <Upload :size="14" />
              <span>{{ uploading ? 'Uploading…' : 'Upload Image' }}</span>
              <input type="file" accept="image/*" @change="onFileChange" hidden :disabled="uploading" />
            </label>
            <button v-if="form.avatar_url" type="button" class="ghost-btn danger" @click="form.avatar_url = ''">
              <Trash2 :size="14" /> Remove
            </button>
            <span class="hint">Max 5MB. JPG or PNG recommended.</span>
          </div>
        </div>
      </section>

      <!-- BANK / STATUTORY (PLACEHOLDER FOR PHASE 1) -->
      <section class="form-section disabled-section">
        <h2 class="section-title">Bank & Statutory IDs <span class="phase-tag">Phase 1</span></h2>
        <p class="section-hint">PAN, Aadhaar (last 4), UAN, PF number, ESIC number, bank account, and IFSC will be editable here once the Employee lifecycle module ships.</p>
      </section>

      <p v-if="errorMsg" class="error-text">{{ errorMsg }}</p>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import axios from 'axios'
import { Save, RotateCcw, Loader2, Upload, Trash2 } from 'lucide-vue-next'
import { useToast } from '../../composables/useToast'
import { API, API_BASE } from '@/utils/api'

const { success, error } = useToast()

const EDITABLE_FIELDS = [
  'full_name', 'phone', 'country_code', 'address',
  'job_title', 'department', 'bio',
  'location', 'country', 'state', 'city',
  'gender', 'avatar_url'
]

const loading = ref(true)
const saving = ref(false)
const uploading = ref(false)
const errorMsg = ref('')

const form = reactive({
  email: '', employee_code: '', organisation: '',
  full_name: '', phone: '', country_code: '', address: '',
  job_title: '', department: '', bio: '',
  location: '', country: '', state: '', city: '',
  gender: '', avatar_url: '',
  is_active: true, is_activated: false
})
const originalForm = ref({})

const initials = computed(() =>
  (form.full_name || form.email || '?').split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
)

const statusLabel = computed(() => {
  if (!form.is_active) return 'Disabled'
  if (!form.is_activated) return 'Awaiting Activation'
  return 'Active'
})

const dirty = computed(() => {
  for (const f of EDITABLE_FIELDS) {
    if ((form[f] || '') !== (originalForm.value[f] || '')) return true
  }
  return false
})

const buildPayload = () => {
  const payload = {}
  for (const f of EDITABLE_FIELDS) {
    if ((form[f] || '') !== (originalForm.value[f] || '')) {
      payload[f] = form[f] === '' ? null : form[f]
    }
  }
  return payload
}

const fetchProfile = async () => {
  loading.value = true
  errorMsg.value = ''
  try {
    const token = localStorage.getItem('user_token')
    const res = await axios.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    Object.keys(form).forEach(k => {
      if (k in res.data) form[k] = res.data[k] ?? (typeof form[k] === 'boolean' ? form[k] : '')
    })
    originalForm.value = { ...form }
  } catch (e) {
    errorMsg.value = 'Could not load your profile.'
    error('Failed to load profile')
  } finally {
    loading.value = false
  }
}

const save = async () => {
  if (!form.full_name || !form.full_name.trim()) {
    error('Full name is required')
    return
  }
  const payload = buildPayload()
  if (Object.keys(payload).length === 0) return
  saving.value = true
  errorMsg.value = ''
  try {
    const token = localStorage.getItem('user_token')
    const res = await axios.patch(`${API}/auth/me`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    })
    Object.keys(form).forEach(k => {
      if (k in res.data) form[k] = res.data[k] ?? (typeof form[k] === 'boolean' ? form[k] : '')
    })
    originalForm.value = { ...form }
    success('Profile updated')
  } catch (e) {
    errorMsg.value = e.response?.data?.detail || 'Failed to save profile'
    error(errorMsg.value)
  } finally {
    saving.value = false
  }
}

const reset = () => {
  Object.assign(form, originalForm.value)
}

const onFileChange = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    error('Image must be 5MB or smaller')
    return
  }
  uploading.value = true
  try {
    const token = localStorage.getItem('user_token')
    const fd = new FormData()
    fd.append('file', file)
    const res = await axios.post(`${API}/uploads/`, fd, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
    })
    const url = res.data.url || res.data.file_url || res.data.path
    if (!url) throw new Error('Upload response missing URL')
    form.avatar_url = url.startsWith('http') ? url : `${API_BASE}${url}`
  } catch (err) {
    error('Image upload failed')
  } finally {
    uploading.value = false
    e.target.value = ''
  }
}

onMounted(fetchProfile)
</script>

<style scoped>
.profile-page { padding: 32px 40px; max-width: 1100px; margin: 0 auto; }

.page-header {
  display: flex; justify-content: space-between; align-items: center;
  gap: 16px; margin-bottom: 28px; flex-wrap: wrap;
}
.header-title { display: flex; align-items: center; gap: 16px; }
.avatar-large {
  width: 56px; height: 56px;
  border-radius: 16px;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  color: #fff; font-weight: 700; font-size: 22px;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.avatar-large img { width: 100%; height: 100%; object-fit: cover; }
.header-title h1 { font-size: 26px; font-weight: 700; color: #f5f5f5; margin: 0 0 4px 0; }
.header-subtitle { color: #8e8e93; font-size: 13px; }

.header-actions { display: flex; gap: 10px; }

.ghost-btn, .primary-btn {
  height: 38px; padding: 0 14px;
  border-radius: 8px; font-size: 13px; font-weight: 600;
  display: inline-flex; align-items: center; gap: 8px;
  cursor: pointer; transition: all 0.2s;
}
.ghost-btn {
  background: transparent; border: 1px solid rgba(255, 255, 255, 0.1); color: #c5c5c8;
}
.ghost-btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.04); }
.ghost-btn.danger { color: #ef4444; border-color: rgba(239, 68, 68, 0.3); }
.ghost-btn.danger:hover { background: rgba(239, 68, 68, 0.08); }

.primary-btn {
  background: #3b82f6; border: none; color: #fff;
}
.primary-btn:hover:not(:disabled) { background: #2563eb; }
.primary-btn:disabled, .ghost-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.loading-block {
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 80px; color: #8e8e93;
}

.profile-form { display: flex; flex-direction: column; gap: 16px; }

.form-section {
  background: rgba(26, 26, 28, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 22px 24px;
}
.section-title {
  font-size: 14px; font-weight: 600; color: #f5f5f5;
  margin: 0 0 4px 0;
  display: flex; align-items: center; gap: 10px;
}
.section-hint {
  font-size: 12px; color: #8e8e93;
  margin: 0 0 16px 0;
}
.phase-tag {
  background: rgba(251, 191, 36, 0.12);
  color: #fbbf24;
  font-size: 10px; font-weight: 700;
  padding: 2px 8px; border-radius: 999px;
  letter-spacing: 0.5px;
}
.disabled-section { opacity: 0.6; }

.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px 16px;
}
.grid-col-2 { grid-column: span 2; }
@media (max-width: 720px) {
  .grid-2 { grid-template-columns: 1fr; }
  .grid-col-2 { grid-column: span 1; }
}
.field { display: flex; flex-direction: column; gap: 6px; }
.field label {
  font-size: 11px; font-weight: 600; color: #8e8e93;
  text-transform: uppercase; letter-spacing: 0.5px;
}
.required { color: #ef4444; margin-left: 2px; }

.input {
  height: 40px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 0 12px;
  color: #f5f5f5; font-size: 13px;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
}
.input:focus { border-color: #3b82f6; background: rgba(0, 0, 0, 0.4); }
.input.readonly { color: #8e8e93; cursor: not-allowed; background: rgba(0, 0, 0, 0.1); }
.textarea { height: auto; padding: 10px 12px; resize: vertical; min-height: 70px; line-height: 1.5; }

.avatar-row { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
.avatar-preview {
  width: 80px; height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  color: #fff; font-weight: 700; font-size: 28px;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.avatar-preview img { width: 100%; height: 100%; object-fit: cover; }

.avatar-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.upload-btn { cursor: pointer; }
.upload-btn input { display: none; }
.hint { color: #6b6b70; font-size: 11px; }

.error-text { color: #ef4444; font-size: 13px; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }
</style>
