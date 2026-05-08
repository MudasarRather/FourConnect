<template>
  <div class="sla-generator-wrapper">
    <!-- Header -->
    <header class="sla-header">
      <div class="header-left">
        <button class="back-btn" @click="goBack">
          <ArrowLeft :size="20"/>
          <span>Back</span>
        </button>
        <div class="header-title">
          <h1>SLA Generator</h1>
          <span class="badge">Advanced Engine</span>
        </div>
      </div>
      <div class="header-actions">
        <div class="project-selector">
          <label>Target Project</label>
          <SlaSelect 
            v-model="form.project_id" 
            :options="projectOptions"
            placeholder="Select a Project"
            class="design-select"
          />
        </div>
        <div class="template-selector">
          <label>Base Template</label>
          <SlaSelect 
            v-model="form.template_id" 
            :options="templateOptions"
            class="design-select"
          />
        </div>
        <button class="action-btn save-draft" @click="() => saveDraft(false)">
          <Save :size="16" />
          <span>Save Draft</span>
        </button>
      </div>
    </header>

    <div class="wizard-container">
      <!-- Sidebar Stepper -->
      <aside class="wizard-sidebar">
        <nav class="steps-nav">
          <div 
            v-for="(step, index) in steps" 
            :key="index"
            class="step-item"
            :class="{ active: currentStep === index, completed: index < currentStep }"
            @click="goToStep(index)"
          >
            <div class="step-indicator">
              <span v-if="index < currentStep"><Check :size="14"/></span>
              <span v-else>{{ index + 1 }}</span>
            </div>
            <div class="step-label">
              <span class="step-title">Step {{ index + 1 }}</span>
              <span class="step-desc">{{ step.title }}</span>
            </div>
            <div v-if="currentStep === index" class="active-glow"></div>
          </div>
        </nav>
      </aside>

      <!-- Main Form Area -->
      <main class="wizard-content">
        <transition name="slide-fade" mode="out-in">
          <component :is="activeStepComponent" :form="form" :errors="errors" @updateForm="updateForm"></component>
        </transition>

        <div class="wizard-footer">
          <button class="nav-btn btn-prev" @click="prevStep" :disabled="currentStep === 0">
            <ChevronLeft :size="18" /> Previous Step
          </button>
          <div class="progress-indicator">
            <span>{{ currentStep + 1 }} / {{ steps.length }}</span>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: ((currentStep + 1) / steps.length * 100) + '%' }"></div>
            </div>
          </div>
          <button v-if="currentStep < steps.length - 1" class="nav-btn btn-next" @click="nextStep">
            Next Step <ChevronRight :size="18" />
          </button>
          <button v-else class="nav-btn btn-finish" :disabled="isSubmitting" @click="submitSla">
            <Loader2 v-if="isSubmitting" :size="18" class="spin" />
            <span v-else style="display:flex;align-items:center;gap:8px;">Submit Document <FileText :size="18" /></span>
          </button>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { useToast } from '../../composables/useToast'
import { generateSlaPdf } from '../../utils/slaPdfGenerator'
import { 
  ArrowLeft, Save, Check, ChevronLeft, ChevronRight, FileText, Loader2
} from 'lucide-vue-next'

// Import Step Components
import SlaClientInfo from './sla-steps/SlaClientInfo.vue'
import SlaOverview from './sla-steps/SlaOverview.vue'
import SlaServiceScope from './sla-steps/SlaServiceScope.vue'
import SlaServiceLevels from './sla-steps/SlaServiceLevels.vue'
import SlaSupportEscalation from './sla-steps/SlaSupportEscalation.vue'
import SlaMonitoring from './sla-steps/SlaMonitoring.vue'
import SlaSecurity from './sla-steps/SlaSecurity.vue'
import SlaPayment from './sla-steps/SlaPayment.vue'
import SlaLegal from './sla-steps/SlaLegal.vue'
import SlaSignatories from './sla-steps/SlaSignatories.vue'
import SlaReview from './sla-steps/SlaReview.vue'
import SlaSelect from '../../components/ui/SlaSelect.vue'

const router = useRouter()
const { info, error: showError, success } = useToast()

const currentStep = ref(0)
const isSubmitting = ref(false)
const errors = ref({})
const projects = ref([])

const steps = [
  { title: 'Client Information', component: SlaClientInfo },
  { title: 'Agreement Overview', component: SlaOverview },
  { title: 'Service Scope', component: SlaServiceScope },
  { title: 'Service Levels', component: SlaServiceLevels },
  { title: 'Support & Escalation', component: SlaSupportEscalation },
  { title: 'Monitoring & Reporting', component: SlaMonitoring },
  { title: 'Security & Compliance', component: SlaSecurity },
  { title: 'Payment & Penalties', component: SlaPayment },
  { title: 'Legal Terms', component: SlaLegal },
  { title: 'Signatories', component: SlaSignatories },
  { title: 'Review & Generate', component: SlaReview }
]

const activeStepComponent = computed(() => {
  return steps[currentStep.value].component
})

const isAdmin = computed(() => router.currentRoute.value.path.startsWith('/admin'))
const token = computed(() => isAdmin.value ? localStorage.getItem('admin_token') : localStorage.getItem('user_token'))
const basePath = computed(() => isAdmin.value ? '/admin' : '/user')

const projectOptions = computed(() => {
  return projects.value.map(p => ({ label: `${p.code} - ${p.name}`, value: p.id }))
})

const templateOptions = [
  { label: 'Standard SLA', value: 'standard' },
  { label: 'Enterprise SLA', value: 'enterprise' },
  { label: 'Government SLA', value: 'gov' },
  { label: 'Custom SLA', value: 'custom' }
]

// Massive Form Payload State
const form = ref({
  project_id: '',
  template_id: 'standard',
  client_organization_name: '',
  client_address: '',
  client_contact_person: '',
  client_email: '',
  client_phone: '',
  provider_name: 'Fourconnect Solutions',
  provider_address: '',
  provider_registration_number: '',
  provider_tax_id: '',
  title: '',
  description: '',
  services_covered: '',
  agreement_type: 'Support SLA',
  start_date: '',
  end_date: '',
  renewal_type: 'Auto Renewal',
  version: '1.0',
  contract_reference: '',
  monitoring_tools: [],
  reporting_frequency: 'Monthly',
  report_delivery_method: 'Email',
  monitoring_dashboard_url: '',
  alert_notification_email: '',
  security_measures: [],
  compliance_standards: [],
  data_retention_policy: '',
  incident_reporting_time: '',
  agreement_value: null,
  currency: 'INR',
  billing_frequency: 'Monthly',
  payment_method: 'Bank Transfer',
  liability_limit: '',
  termination_conditions: '',
  force_majeure_clause: '',
  confidentiality_clause: '',
  intellectual_property_clause: '',
  
  // Nested Arrays
  services: [],
  escalations: [],
  penalties: [],
  signatories: []
})

const goBack = () => {
  router.push(`${basePath.value}/documents/sla`)
}

const goToStep = (index) => {
  if (index > currentStep.value) {
    let canProceed = true
    for (let i = currentStep.value; i < index; i++) {
       if (!validateStep(i)) {
          canProceed = false
          currentStep.value = i
          break
       }
    }
    if (canProceed) {
      currentStep.value = index
    }
  } else {
    currentStep.value = index
  }
}

const validateStep = (stepIdx) => {
  const f = form.value
  
  // Clear errors to force unmount of error spans
  errors.value = {}
  
  let isValid = true
  let newErrors = {}

  const check = (field, customCondition = false) => {
    if (customCondition || !f[field] || (Array.isArray(f[field]) && f[field].length === 0)) {
      newErrors[field] = true
      isValid = false
    }
  }

  if (stepIdx === 0) {
    ['client_organization_name', 'client_contact_person', 'client_email', 'client_phone', 'client_address', 'provider_name', 'provider_registration_number', 'provider_tax_id', 'provider_address'].forEach(k => check(k))
  }
  
  if (stepIdx === 1) {
    ['title', 'agreement_type', 'contract_reference', 'description', 'start_date', 'end_date', 'renewal_type'].forEach(k => check(k))
  }
  
  if (stepIdx === 2) {
    if (!f.services || f.services.length === 0) {
      newErrors['services'] = true
      isValid = false
    } else {
      for (const svc of f.services) {
        if (!svc.service_name || !svc.description || !svc.service_category) {
          newErrors['services'] = true
          isValid = false
        }
      }
    }
  }
  
  if (stepIdx === 3) {
    if (!f.services || f.services.length === 0) {
      newErrors['metrics'] = true
      isValid = false
    } else {
      for (const svc of f.services) {
        if (!svc.metrics || svc.metrics.length === 0) {
          newErrors['metrics'] = true
          isValid = false
        } else {
          for (const m of svc.metrics) {
             if (!m.priority_level || !m.response_time || !m.resolution_time || !m.uptime_commitment || !m.measurement_method) {
               newErrors['metrics'] = true
               isValid = false
             }
          }
        }
      }
    }
  }
  
  if (stepIdx === 4) {
    if (!f.escalations || f.escalations.length === 0) {
      newErrors['escalations'] = true
      isValid = false
    } else {
      const globalSettings = f.escalations[0]
      if (!globalSettings.support_availability || !globalSettings.timezone) {
        newErrors['escalations'] = true
        isValid = false
      }
      if (globalSettings.support_availability !== '24x7') {
        if (!globalSettings.support_start_time || !globalSettings.support_end_time) {
          newErrors['escalations'] = true
          isValid = false
        }
      }
      for (const esc of f.escalations) {
        if (!esc.level || !esc.role || !esc.contact_person || !esc.email || !esc.phone || !esc.response_time) {
          newErrors['escalations'] = true
          isValid = false
        }
      }
    }
  }

  if (stepIdx === 7) {
    check('agreement_value', f.agreement_value === null || f.agreement_value === undefined || f.agreement_value === '')
    check('currency')
    check('billing_frequency')
    check('payment_method')
  }
  
  if (stepIdx === 8) {
    ['liability_limit', 'termination_conditions', 'confidentiality_clause', 'force_majeure_clause', 'intellectual_property_clause'].forEach(k => check(k))
  }
  
  if (stepIdx === 9) {
    if (!f.signatories || f.signatories.length < 2) {
      newErrors['signatories'] = true
      isValid = false
    } else {
      for (const sig of f.signatories) {
        if (!sig.party || !sig.name || !sig.designation || !sig.email) {
          newErrors['signatories'] = true
          isValid = false
        }
      }
    }
  }

  if (!isValid) {
    // Delay setting the errors so Vue unmounts and remounts the elements, retriggering the CSS animation
    setTimeout(() => {
      errors.value = newErrors
    }, 10)
  }
  
  return isValid
}

const nextStep = () => {
  if (!validateStep(currentStep.value)) {
    return
  }
  if (currentStep.value < steps.length - 1) currentStep.value++
}

const prevStep = () => {
  if (currentStep.value > 0) currentStep.value--
}

const updateForm = (key, value) => {
  form.value[key] = value
}

const fetchProjects = async () => {
  try {
    const response = await axios.get('http://localhost:8000/api/projects/', {
      headers: { Authorization: `Bearer ${token.value}` },
      params: { limit: 100 } // fetch many to ensure we have options
    })
    projects.value = response.data.items || []
  } catch (err) {
    showError('Failed to load projects')
  }
}

const saveDraft = async (silent = false, statusOverwrite = null) => {
  if (!form.value.project_id) {
    showError("Please select a target project first")
    return false
  }
  try {
    const payload = { ...form.value }
    if (statusOverwrite) payload.status = statusOverwrite
    
    // Clean empty strings for nested arrays to prevent Pydantic errors
    if(payload.start_date === '') payload.start_date = null;
    if(payload.end_date === '') payload.end_date = null;

    // if (!silent) info("Saving draft...") // Removed as per request
    const res = await axios.post('http://localhost:8000/api/sla/', payload, {
      headers: { Authorization: `Bearer ${token.value}` }
    })
    if (!silent) {
      success("Draft saved successfully!")
      router.push({ path: `${basePath.value}/documents/sla`, query: { tab: 'draft' } })
    }
    return true
  } catch (err) {
    showError("Failed to save Draft")
    console.error(err)
    return false
  }
}

const LOCAL_STORAGE_KEY = 'sla_wizard_draft_data'

const submitSla = async () => {
  isSubmitting.value = true
  const isSaved = await saveDraft(true, 'Pending')
  if (isSaved) {
    localStorage.removeItem(LOCAL_STORAGE_KEY)
    success("SLA Document Submitted successfully!")
    setTimeout(() => {
      router.push(`${basePath.value}/documents/sla`)
    }, 1500)
  }
  isSubmitting.value = false
}

onMounted(() => {
  fetchProjects()
  
  // Restore draft from local storage if available
  const savedData = localStorage.getItem(LOCAL_STORAGE_KEY)
  if (savedData) {
    try {
      const parsed = JSON.parse(savedData)
      form.value = { ...form.value, ...parsed }
      info("Draft restored from local storage")
    } catch (e) {
      console.error("Failed to parse saved draft")
    }
  }
})

// Auto-save to local storage on any change
import { watch } from 'vue'
watch(form, (newVal) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newVal))
}, { deep: true })
</script>

<style>
.error-msg {
  display: inline-block;
  animation: errorShake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  transform: translate3d(0, 0, 0);
  backface-visibility: hidden;
}

@keyframes errorShake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
}
</style>

<style scoped>
.sla-generator-wrapper {
  background: transparent;
  min-height: 100vh;
  color: #fff;
  display: flex;
  flex-direction: column;
  font-family: 'Inter', sans-serif;
  animation: pageEntry 1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

/* Header */
.sla-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 32px;
  background: rgba(18, 18, 18, 0.6);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.back-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.back-btn:hover {
  color: #fff;
}

.header-title h1 {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.5px;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.badge {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 4px 8px;
  background: rgba(255, 235, 59, 0.1);
  color: #ffeb3b;
  border-radius: 4px;
  border: 1px solid rgba(255, 235, 59, 0.2);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.design-select {
  min-width: 200px;
}

.project-selector label, .template-selector label {
  display: block;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.action-btn {
  height: 38px;
  padding: 0 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 18px; /* align with select inputs */
  transition: all 0.2s;
}

.save-draft {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
}

.save-draft:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* Wizard Layout */
.wizard-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Sidebar Stepper */
.wizard-sidebar {
  width: 280px;
  background: rgba(10, 10, 10, 0.5);
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  padding: 32px 0;
  overflow-y: auto;
}

.steps-nav {
  display: flex;
  flex-direction: column;
}

.step-item {
  display: flex;
  align-items: flex-start;
  padding: 16px 32px;
  cursor: pointer;
  position: relative;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0;
  transform: translateX(-20px);
  animation: slideInRight 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

/* Stagger sidebar items */
.step-item:nth-child(1) { animation-delay: 0.1s; }
.step-item:nth-child(2) { animation-delay: 0.15s; }
.step-item:nth-child(3) { animation-delay: 0.2s; }
.step-item:nth-child(4) { animation-delay: 0.25s; }
.step-item:nth-child(5) { animation-delay: 0.3s; }
.step-item:nth-child(6) { animation-delay: 0.35s; }
.step-item:nth-child(7) { animation-delay: 0.4s; }
.step-item:nth-child(8) { animation-delay: 0.45s; }
.step-item:nth-child(9) { animation-delay: 0.5s; }
.step-item:nth-child(10) { animation-delay: 0.55s; }
.step-item:nth-child(11) { animation-delay: 0.6s; }

@keyframes slideInRight {
  to { opacity: 0.5; transform: translateX(0); }
}

.step-item:hover {
  opacity: 0.8 !important;
  background: rgba(255, 255, 255, 0.02);
  transform: translateX(4px);
}

.step-item.active {
  opacity: 1 !important;
  background: rgba(255, 235, 59, 0.03);
  transform: translateX(8px);
}

.step-item.completed {
  opacity: 0.9 !important;
}

.step-indicator {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  margin-right: 16px;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.step-item.active .step-indicator {
  border-color: #ffeb3b;
  color: #ffeb3b;
  box-shadow: 0 0 10px rgba(255, 235, 59, 0.2);
}

.step-item.completed .step-indicator {
  background: #ffeb3b;
  color: #000;
  border-color: #ffeb3b;
}

.step-label {
  display: flex;
  flex-direction: column;
}

.step-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 4px;
}

.step-desc {
  font-size: 14px;
  font-weight: 500;
  color: #fff;
}

.step-item.active .step-desc {
  color: #ffeb3b;
}

.active-glow {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #ffeb3b;
  box-shadow: 0 0 10px rgba(255, 235, 59, 0.5);
}

/* Connective Line */
.step-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 46px; /* 32px padding + 14px (half of indicator) */
  top: 44px; /* below indicator */
  bottom: -16px; /* to next item */
  width: 1px;
  background: rgba(255, 255, 255, 0.1);
}

.step-item.completed:not(:last-child)::after {
  background: rgba(255, 235, 59, 0.3);
}

/* Main Content Area */
.wizard-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 40px 40px 120px 40px; /* Enhanced bottom padding to prevent footer overlapping */
  overflow-y: auto;
  position: relative;
  scroll-behavior: smooth;
}

/* Footer Navigation */
.wizard-footer {
  margin-top: auto;
  padding-top: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 50%, transparent 100%);
  position: absolute; /* Stick to bottom of flex container */
  bottom: 0;
  left: 0;
  right: 0;
  padding: 32px 40px;
  z-index: 10;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-prev {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
}

.btn-prev:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}

.btn-prev:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.btn-next {
  background: #ffeb3b;
  color: #000;
  border: none;
}

.btn-next:hover {
  background: #fdd835;
  transform: translateY(-1px);
}

.btn-finish {
  background: #4caf50;
  color: #fff;
  border: none;
}

.btn-finish:hover {
  background: #43a047;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.progress-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
  max-width: 300px;
}

.progress-indicator span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 1px;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #ffeb3b;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Advanced Animations */
.slide-fade-enter-active {
  transition: all 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-fade-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-enter-from {
  transform: translateY(40px) scale(0.95);
  opacity: 0;
  filter: blur(8px);
}

.slide-fade-leave-to {
  transform: translateY(-40px) scale(1.05);
  opacity: 0;
  filter: blur(8px);
}

/* Page Entry Animation */
@keyframes pageEntry {
  0% { opacity: 0; transform: scale(0.98); filter: blur(10px); }
  100% { opacity: 1; transform: scale(1); filter: blur(0); }
}

.wizard-footer {
  animation: slideUpFooter 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: 0.6s;
  opacity: 0;
  transform: translateY(100%);
}

@keyframes slideUpFooter {
  to { opacity: 1; transform: translateY(0); }
}

.nav-btn.btn-next, .nav-btn.btn-finish {
  position: relative;
  overflow: hidden;
}

.nav-btn.btn-next::after, .nav-btn.btn-finish::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.3), transparent);
  transform: skewX(-20deg);
  animation: shine 3s infinite;
}

@keyframes shine {
  0% { left: -100%; }
  20% { left: 200%; }
  100% { left: 200%; }
}
</style>
