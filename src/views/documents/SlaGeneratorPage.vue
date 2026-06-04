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
            @update:modelValue="onProjectSelect"
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

    <!-- === DUPLICATE-SLA WARNING DIALOG ===
         Teleported to <body> so the overlay's backdrop-filter blur is computed
         against the full viewport. Without Teleport, ancestor elements with
         border-radius / overflow / transform create rectangular "boxed blur"
         regions visible behind the card. Also fixes the modal being positioned
         relative to the wizard's scroll container (user had to scroll to see it). -->
    <Teleport to="body">
      <transition name="fade">
        <div v-if="duplicateSlaWarning" class="nano-modal-overlay">
          <div class="nano-modal-card slide-up">
            <div class="nano-modal-icon warning">
              <AlertTriangle :size="32" />
            </div>
            <div class="nano-modal-content">
              <h3>Active SLA Detected</h3>
              <p>An SLA agreement already exists for this project in our system.</p>

              <div class="duplicate-info-box" v-if="existingSla">
                <div class="dib-row"><span class="dib-l">Title:</span> <span class="dib-v">{{ existingSla.title || existingSla.client_organization_name || '—' }}</span></div>
                <div class="dib-row"><span class="dib-l">Version:</span> <span class="dib-v">{{ existingSla.version || '—' }}</span></div>
                <div class="dib-row"><span class="dib-l">Status:</span> <span class="dib-v status-pill" :class="(existingSla.status || '').toLowerCase().replace(' ', '-')">{{ existingSla.status }}</span></div>
              </div>

              <p class="nano-modal-subtext">Creating a new agreement will start a fresh 11-step protocol. Any existing drafts for this project will not be merged or imported.</p>
            </div>
            <div class="nano-modal-actions">
              <button class="nano-btn secondary" @click="duplicateSlaWarning = false">Cancel &amp; Change Project</button>
              <button class="nano-btn primary" @click="duplicateSlaWarning = false">Understood, Proceed</button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { useToast } from '../../composables/useToast'
import { generateSlaPdf } from '../../utils/slaPdfGenerator'
import {
  ArrowLeft, Save, Check, ChevronLeft, ChevronRight, FileText, Loader2, AlertTriangle
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
    const response = await axios.get(`${API}/projects/`, {
      headers: { Authorization: `Bearer ${token.value}` },
      params: { limit: 100 } // fetch many to ensure we have options
    })
    projects.value = response.data.items || []
  } catch (err) {
    showError('Failed to load projects')
  }
}

// Duplicate SLA detection (mirrors Handover wizard's onProjectSelect pattern).
// Warns the user when the chosen project already has a non-Draft / non-Rejected
// SLA so they don't accidentally start a parallel agreement. Fires whenever
// project_id changes in the header SlaSelect.
const duplicateSlaWarning = ref(false)
const existingSla = ref(null)
const onProjectSelect = async () => {
  if (!form.value.project_id) return
  try {
    const headers = { Authorization: `Bearer ${token.value}` }
    const res = await axios.get(`${API}/sla/?limit=100`, { headers })
    const allSlas = Array.isArray(res.data) ? res.data : (res.data.items || [])
    const match = allSlas.find(s =>
      s.project_id === form.value.project_id &&
      (s.status === 'Approved' || s.status === 'Pending')
    )
    if (match) {
      existingSla.value = match
      duplicateSlaWarning.value = true
    }
  } catch (e) {
    console.error('Failed to check for duplicate SLAs:', e)
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
    const res = await axios.post(`${API}/sla/`, payload, {
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
import { API } from '@/utils/api'
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

/* ════════════════════════════════════════════════════════════════════════
   LIGHT-THEME RESCUE for the SLA wizard's nested step components.
   Same pattern as the Edit SLA modal — non-scoped, anchored on
   .sla-generator-wrapper so it only applies to this page.
   ════════════════════════════════════════════════════════════════════════ */

/* Step headings */
[data-theme="light"] .sla-generator-wrapper .step-header h2 {
  color: #1a1410 !important;
  text-shadow: none !important;
}
[data-theme="light"] .sla-generator-wrapper .step-header p {
  color: #6b5840 !important;
}

/* Form sections — frosted cream cards instead of near-invisible dark glass */
[data-theme="light"] .sla-generator-wrapper .form-section {
  background: rgba(255, 250, 240, 0.62) !important;
  border: 1px solid rgba(217, 119, 6, 0.20) !important;
  border-radius: 14px !important;
  box-shadow:
    0 6px 20px rgba(180, 83, 9, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.50) !important;
}
[data-theme="light"] .sla-generator-wrapper .form-section.provider-section {
  background: rgba(245, 158, 11, 0.12) !important;
  border-color: rgba(217, 119, 6, 0.32) !important;
}
[data-theme="light"] .sla-generator-wrapper .form-section.timeline-section {
  background: rgba(255, 250, 240, 0.62) !important;
}
[data-theme="light"] .sla-generator-wrapper .form-section.timeline-section::before {
  background: linear-gradient(180deg, #d97706, #b45309) !important;
  box-shadow: 0 0 10px rgba(217, 119, 6, 0.40) !important;
}

/* Section titles + form labels */
[data-theme="light"] .sla-generator-wrapper .section-title {
  color: #b45309 !important;
}
[data-theme="light"] .sla-generator-wrapper .text-yellow {
  color: #b45309 !important;
}
[data-theme="light"] .sla-generator-wrapper .input-group label,
[data-theme="light"] .sla-generator-wrapper label {
  color: #78350f !important;
  font-weight: 600 !important;
}
[data-theme="light"] .sla-generator-wrapper .required,
[data-theme="light"] .sla-generator-wrapper .error-label,
[data-theme="light"] .sla-generator-wrapper .error-msg {
  color: #b91c1c !important;
}

/* Inputs / textareas / selects — cream pad with dark text + amber focus */
[data-theme="light"] .sla-generator-wrapper input,
[data-theme="light"] .sla-generator-wrapper textarea,
[data-theme="light"] .sla-generator-wrapper select,
[data-theme="light"] .sla-generator-wrapper .premium-input,
[data-theme="light"] .sla-generator-wrapper .premium-textarea,
[data-theme="light"] .sla-generator-wrapper .text-input,
[data-theme="light"] .sla-generator-wrapper .table-input,
[data-theme="light"] .sla-generator-wrapper .design-select .select-selected {
  background: rgba(255, 250, 240, 0.92) !important;
  border: 1px solid rgba(217, 119, 6, 0.22) !important;
  color: #1a1410 !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55) !important;
}
[data-theme="light"] .sla-generator-wrapper input::placeholder,
[data-theme="light"] .sla-generator-wrapper textarea::placeholder {
  color: rgba(120, 53, 15, 0.45) !important;
}
[data-theme="light"] .sla-generator-wrapper input:focus,
[data-theme="light"] .sla-generator-wrapper textarea:focus,
[data-theme="light"] .sla-generator-wrapper select:focus {
  background: #fffaf0 !important;
  border-color: #d97706 !important;
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.18) !important;
  outline: none !important;
}
[data-theme="light"] .sla-generator-wrapper .premium-input.highlighted {
  color: #b45309 !important;
  font-weight: 600 !important;
}

/* SlaSelect trigger styled as form field (the dropdown popup itself is teleported
   to body and already handled in SlaSelect.vue's non-scoped block) */
[data-theme="light"] .sla-generator-wrapper .sla-select-trigger {
  background: rgba(255, 250, 240, 0.92) !important;
  border: 1px solid rgba(217, 119, 6, 0.22) !important;
  color: #1a1410 !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55) !important;
}
[data-theme="light"] .sla-generator-wrapper .sla-select-trigger:hover {
  border-color: rgba(217, 119, 6, 0.40) !important;
}
[data-theme="light"] .sla-generator-wrapper .sla-select-trigger.is-open {
  background: #fffaf0 !important;
  border-color: #d97706 !important;
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.18) !important;
}
[data-theme="light"] .sla-generator-wrapper .sla-select-trigger .selected-text {
  color: #1a1410 !important;
}
[data-theme="light"] .sla-generator-wrapper .sla-select-trigger .is-placeholder {
  color: rgba(120, 53, 15, 0.45) !important;
}
[data-theme="light"] .sla-generator-wrapper .sla-select-trigger .chevron {
  color: #92400e !important;
}
/* Header's design-select variant */
[data-theme="light"] .sla-generator-wrapper .design-select .sla-select-trigger {
  background: rgba(255, 250, 240, 0.85) !important;
}

/* Tables (services scope, metrics, escalation, penalty) */
[data-theme="light"] .sla-generator-wrapper .premium-table-wrapper,
[data-theme="light"] .sla-generator-wrapper .metrics-table-wrapper {
  background: rgba(255, 250, 240, 0.78) !important;
  border: 1px solid rgba(217, 119, 6, 0.22) !important;
  box-shadow:
    0 6px 20px rgba(180, 83, 9, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.55) !important;
  overflow: hidden !important;
}
[data-theme="light"] .sla-generator-wrapper .premium-table th {
  background: rgba(245, 158, 11, 0.12) !important;
  color: #92400e !important;
  border-bottom: 1px solid rgba(217, 119, 6, 0.28) !important;
}
[data-theme="light"] .sla-generator-wrapper .premium-table td {
  border-top: 1px solid rgba(217, 119, 6, 0.12) !important;
  color: #1a1410 !important;
}
[data-theme="light"] .sla-generator-wrapper .premium-table tr:hover td {
  background: rgba(245, 158, 11, 0.10) !important;
}

/* Add buttons (Add Service, Add Metric, Add Tier) — gold gradient on cream */
[data-theme="light"] .sla-generator-wrapper .add-btn,
[data-theme="light"] .sla-generator-wrapper .add-metric-btn,
[data-theme="light"] .sla-generator-wrapper .text-add-btn {
  background: linear-gradient(135deg, #f59e0b, #d97706) !important;
  border: 1px solid rgba(217, 119, 6, 0.55) !important;
  color: #fffaf0 !important;
  box-shadow:
    0 4px 12px rgba(217, 119, 6, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.40) !important;
}
[data-theme="light"] .sla-generator-wrapper .add-btn:hover,
[data-theme="light"] .sla-generator-wrapper .add-metric-btn:hover,
[data-theme="light"] .sla-generator-wrapper .text-add-btn:hover {
  background: linear-gradient(135deg, #d97706, #b45309) !important;
}

/* Service badge (Step 4 metrics card "INFRASTRUCTURE") */
[data-theme="light"] .sla-generator-wrapper .svc-badge {
  background: rgba(217, 119, 6, 0.16) !important;
  color: #92400e !important;
  border: 1px solid rgba(217, 119, 6, 0.32) !important;
}
[data-theme="light"] .sla-generator-wrapper .service-metrics-card {
  background: rgba(255, 250, 240, 0.62) !important;
  border-color: rgba(217, 119, 6, 0.20) !important;
}

/* Delete/trash buttons inside table rows */
[data-theme="light"] .sla-generator-wrapper .premium-table .delete-btn,
[data-theme="light"] .sla-generator-wrapper .premium-table .icon-btn,
[data-theme="light"] .sla-generator-wrapper .premium-table .trash-btn {
  background: rgba(185, 28, 28, 0.10) !important;
  border: 1px solid rgba(185, 28, 28, 0.25) !important;
  color: #b91c1c !important;
  border-radius: 8px !important;
}
[data-theme="light"] .sla-generator-wrapper .premium-table .delete-btn:hover {
  background: rgba(185, 28, 28, 0.20) !important;
  border-color: rgba(185, 28, 28, 0.50) !important;
}

/* Checkbox grid (Step 7 Security Measures) */
[data-theme="light"] .sla-generator-wrapper .custom-checkbox-wrapper {
  background: rgba(255, 250, 240, 0.72) !important;
  border: 1px solid rgba(217, 119, 6, 0.22) !important;
}
[data-theme="light"] .sla-generator-wrapper .custom-checkbox-wrapper:hover,
[data-theme="light"] .sla-generator-wrapper .custom-checkbox-wrapper:hover .checkbox-label,
[data-theme="light"] .sla-generator-wrapper .custom-checkbox-wrapper.is-selected .checkbox-label,
[data-theme="light"] .sla-generator-wrapper .custom-checkbox-wrapper.active .checkbox-label,
[data-theme="light"] .sla-generator-wrapper .checkbox-label {
  color: #1a1410 !important;
}
[data-theme="light"] .sla-generator-wrapper .custom-checkbox-wrapper:hover {
  background: rgba(245, 158, 11, 0.16) !important;
  border-color: rgba(217, 119, 6, 0.45) !important;
}
[data-theme="light"] .sla-generator-wrapper .custom-checkbox-wrapper.is-selected,
[data-theme="light"] .sla-generator-wrapper .custom-checkbox-wrapper.active {
  background: rgba(245, 158, 11, 0.22) !important;
  border-color: rgba(217, 119, 6, 0.55) !important;
}
[data-theme="light"] .sla-generator-wrapper .checkbox-box {
  border-color: rgba(120, 53, 15, 0.40) !important;
  background: rgba(255, 250, 240, 0.92) !important;
}
[data-theme="light"] .sla-generator-wrapper .checkbox-box.checked,
[data-theme="light"] .sla-generator-wrapper .checkbox-box.active {
  background: #d97706 !important;
  border-color: #d97706 !important;
  color: #fffaf0 !important;
}

/* Standards section + compliance/security chips */
[data-theme="light"] .sla-generator-wrapper .standards-section {
  background: rgba(255, 250, 240, 0.62) !important;
  border: 1px solid rgba(217, 119, 6, 0.22) !important;
}
[data-theme="light"] .sla-generator-wrapper .tag-btn,
[data-theme="light"] .sla-generator-wrapper .compl-tag,
[data-theme="light"] .sla-generator-wrapper .sec-tag {
  background: rgba(255, 250, 240, 0.85) !important;
  color: #78350f !important;
  border: 1px solid rgba(217, 119, 6, 0.30) !important;
}
[data-theme="light"] .sla-generator-wrapper .tag-btn:hover,
[data-theme="light"] .sla-generator-wrapper .compl-tag:hover {
  background: rgba(245, 158, 11, 0.18) !important;
  border-color: rgba(217, 119, 6, 0.55) !important;
}
[data-theme="light"] .sla-generator-wrapper .tag-btn.active,
[data-theme="light"] .sla-generator-wrapper .compl-tag.active,
[data-theme="light"] .sla-generator-wrapper .tag-btn.is-selected,
[data-theme="light"] .sla-generator-wrapper .compl-tag.is-selected {
  background: linear-gradient(135deg, #f59e0b, #d97706) !important;
  border-color: rgba(217, 119, 6, 0.65) !important;
  color: #fffaf0 !important;
}

/* Signatory cards (Step 10) */
[data-theme="light"] .sla-generator-wrapper .signatory-card {
  background: rgba(255, 250, 240, 0.78) !important;
  border: 1px solid rgba(217, 119, 6, 0.22) !important;
  box-shadow:
    0 6px 20px rgba(180, 83, 9, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.55) !important;
}
[data-theme="light"] .sla-generator-wrapper .signatory-card.provider-card {
  border-top: 3px solid #d97706 !important;
}
[data-theme="light"] .sla-generator-wrapper .signatory-card.client-card {
  border-top: 3px solid #15803d !important;
}
[data-theme="light"] .sla-generator-wrapper .signatory-card .card-title {
  background: rgba(245, 158, 11, 0.10) !important;
  border-bottom: 1px solid rgba(217, 119, 6, 0.22) !important;
  color: #1a1410 !important;
}
[data-theme="light"] .sla-generator-wrapper .digital-sig-panel {
  background: rgba(245, 158, 11, 0.12) !important;
  border: 1px solid rgba(217, 119, 6, 0.38) !important;
  border-left: 4px solid #d97706 !important;
  color: #1a1410 !important;
}
[data-theme="light"] .sla-generator-wrapper .digital-sig-panel h4,
[data-theme="light"] .sla-generator-wrapper .digital-sig-panel strong {
  color: #92400e !important;
}
[data-theme="light"] .sla-generator-wrapper .digital-sig-panel p {
  color: #6b5840 !important;
}
[data-theme="light"] .sla-generator-wrapper .digital-sig-panel svg {
  color: #b45309 !important;
}

/* Review step (Step 11) */
[data-theme="light"] .sla-generator-wrapper .review-section {
  background: rgba(255, 250, 240, 0.78) !important;
  border: 1px solid rgba(217, 119, 6, 0.22) !important;
}
[data-theme="light"] .sla-generator-wrapper .review-section .section-top {
  border-bottom: 1px solid rgba(217, 119, 6, 0.20) !important;
}
[data-theme="light"] .sla-generator-wrapper .review-section .section-top h3 {
  color: #1a1410 !important;
}
[data-theme="light"] .sla-generator-wrapper .icon-yellow,
[data-theme="light"] .sla-generator-wrapper .lucide-shield,
[data-theme="light"] .sla-generator-wrapper .lucide-shield-check {
  color: #b45309 !important;
}
[data-theme="light"] .sla-generator-wrapper .data-item label {
  color: #b45309 !important;
}
[data-theme="light"] .sla-generator-wrapper .data-item span {
  color: #1a1410 !important;
}
[data-theme="light"] .sla-generator-wrapper .data-item .text-green {
  color: #15803d !important;
}
[data-theme="light"] .sla-generator-wrapper .scope-row {
  background: rgba(255, 250, 240, 0.85) !important;
  border: 1px solid rgba(217, 119, 6, 0.20) !important;
}
[data-theme="light"] .sla-generator-wrapper .scope-row .badge {
  background: rgba(217, 119, 6, 0.16) !important;
  color: #92400e !important;
  border: 1px solid rgba(217, 119, 6, 0.32) !important;
}
[data-theme="light"] .sla-generator-wrapper .scope-row .sv-name {
  color: #1a1410 !important;
}
[data-theme="light"] .sla-generator-wrapper .scope-row .metric-count {
  color: #b45309 !important;
}
[data-theme="light"] .sla-generator-wrapper .compl-tag {
  background: rgba(34, 134, 58, 0.12) !important;
  color: #15803d !important;
  border-color: rgba(34, 134, 58, 0.30) !important;
}
[data-theme="light"] .sla-generator-wrapper .generation-warning {
  background: rgba(245, 158, 11, 0.16) !important;
  border: 1px solid rgba(217, 119, 6, 0.45) !important;
  border-left: 4px solid #d97706 !important;
  color: #1a1410 !important;
}
[data-theme="light"] .sla-generator-wrapper .warn-icon { color: #b45309 !important; }
[data-theme="light"] .sla-generator-wrapper .warn-text h4 { color: #92400e !important; }
[data-theme="light"] .sla-generator-wrapper .warn-text p { color: #6b5840 !important; }
[data-theme="light"] .sla-generator-wrapper .empty-msg { color: #8a6d4a !important; }

/* Monitoring step tag chips + help text */
[data-theme="light"] .sla-generator-wrapper .help-text {
  color: #8a6d4a !important;
}

/* tool-tags-container has rgba(0,0,0,0.3) background in source — kill it */
[data-theme="light"] .sla-generator-wrapper .tool-tags-container {
  background: rgba(255, 250, 240, 0.55) !important;
  border: 1px solid rgba(217, 119, 6, 0.20) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55) !important;
}
/* And in dark mode lighten it slightly so the chips don't sink */
.sla-generator-wrapper .tool-tags-container {
  background: rgba(0, 0, 0, 0.18) !important;
  border-color: rgba(255, 255, 255, 0.06) !important;
}

/* Description paragraph under each section title ("Select the specific...") */
[data-theme="light"] .sla-generator-wrapper .section-desc {
  color: #6b5840 !important;
}

/* Actual checkbox text class is .cb-label (NOT .checkbox-label) */
[data-theme="light"] .sla-generator-wrapper .cb-label {
  color: #1a1410 !important;
  font-weight: 500 !important;
}
[data-theme="light"] .sla-generator-wrapper .custom-checkbox-wrapper:hover .cb-label,
[data-theme="light"] .sla-generator-wrapper .custom-checkbox-wrapper.active .cb-label {
  color: #1a1410 !important;
}
[data-theme="light"] .sla-generator-wrapper .custom-checkbox-wrapper.active {
  background: linear-gradient(135deg,
      rgba(245, 158, 11, 0.20),
      rgba(217, 119, 6, 0.14)) !important;
  border-color: rgba(217, 119, 6, 0.55) !important;
}
[data-theme="light"] .sla-generator-wrapper .custom-checkbox-wrapper.active .checkbox-box {
  background: #d97706 !important;
  border-color: #d97706 !important;
  color: #fffaf0 !important;
}

/* Compliance tags grid (Step 7 uses .tags-grid, Step 6 uses .tool-tags-container) */
[data-theme="light"] .sla-generator-wrapper .tags-grid {
  background: transparent !important;
}

/* Compliance tag-btn active state uses green in source — make it warm gold on cream */
[data-theme="light"] .sla-generator-wrapper .form-section.standards-section .tag-btn.active {
  background: linear-gradient(135deg, #f59e0b, #d97706) !important;
  border-color: rgba(217, 119, 6, 0.65) !important;
  color: #fffaf0 !important;
  box-shadow: 0 0 12px rgba(217, 119, 6, 0.35) !important;
}

/* ════════════════════════════════════════════════════════════════════════
   STEP 9 LEGAL TERMS — same clause-card treatment as Edit SLA modal
   ════════════════════════════════════════════════════════════════════════ */

/* The Legal step's .form-grid is itself a card-padding container in the
   source. Strip its outer chrome so each clause becomes the visual card. */
[data-theme="light"] .sla-generator-wrapper .step-container .form-grid:has(textarea.premium-textarea) {
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
}
.sla-generator-wrapper .step-container .form-grid:has(textarea.premium-textarea) {
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
  gap: 18px !important;
}

/* Top-level clause cards (Liability, Termination, Confidentiality) */
.sla-generator-wrapper .step-container .form-grid > .input-group:has(textarea.premium-textarea) {
  position: relative;
  padding: 18px 22px 18px 28px;
  background: linear-gradient(135deg,
      rgba(251, 191, 36, 0.06) 0%,
      rgba(255, 255, 255, 0.02) 40%) !important;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  transition: border-color 0.25s, background 0.25s, box-shadow 0.25s;
  animation: clauseCardSlide 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.sla-generator-wrapper .step-container .form-grid > .input-group:has(textarea.premium-textarea)::before {
  content: '';
  position: absolute;
  top: 16px;
  bottom: 16px;
  left: 0;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, #fbbf24, #d97706);
  opacity: 0.68;
  transition: opacity 0.25s, box-shadow 0.25s;
}
.sla-generator-wrapper .step-container .form-grid > .input-group:has(textarea.premium-textarea):focus-within {
  border-color: rgba(251, 191, 36, 0.40);
  background: linear-gradient(135deg,
      rgba(251, 191, 36, 0.12) 0%,
      rgba(255, 255, 255, 0.05) 45%) !important;
  box-shadow: 0 6px 22px rgba(245, 158, 11, 0.18);
}
.sla-generator-wrapper .step-container .form-grid > .input-group:has(textarea.premium-textarea):focus-within::before {
  opacity: 1;
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.60);
}

/* Force Majeure + IP — grandchildren via .input-row */
.sla-generator-wrapper .step-container .form-grid .input-row > .input-group:has(textarea.premium-textarea) {
  position: relative;
  padding: 18px 22px 18px 28px;
  background: linear-gradient(135deg,
      rgba(251, 191, 36, 0.06) 0%,
      rgba(255, 255, 255, 0.02) 40%) !important;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  transition: border-color 0.25s, background 0.25s, box-shadow 0.25s;
  animation: clauseCardSlide 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 0.28s;
}
.sla-generator-wrapper .step-container .form-grid .input-row > .input-group:has(textarea.premium-textarea):nth-of-type(2) {
  animation-delay: 0.34s;
}
.sla-generator-wrapper .step-container .form-grid .input-row > .input-group:has(textarea.premium-textarea)::before {
  content: '';
  position: absolute;
  top: 16px;
  bottom: 16px;
  left: 0;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, #fbbf24, #d97706);
  opacity: 0.68;
  transition: opacity 0.25s, box-shadow 0.25s;
}
.sla-generator-wrapper .step-container .form-grid .input-row > .input-group:has(textarea.premium-textarea):focus-within {
  border-color: rgba(251, 191, 36, 0.40);
  background: linear-gradient(135deg,
      rgba(251, 191, 36, 0.12) 0%,
      rgba(255, 255, 255, 0.05) 45%) !important;
  box-shadow: 0 6px 22px rgba(245, 158, 11, 0.18);
}
.sla-generator-wrapper .step-container .form-grid .input-row > .input-group:has(textarea.premium-textarea):focus-within::before {
  opacity: 1;
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.60);
}

/* Stagger entries 1-3 (top-level) */
.sla-generator-wrapper .step-container .form-grid > .input-group:has(textarea.premium-textarea):nth-of-type(1) { animation-delay: 0.06s; }
.sla-generator-wrapper .step-container .form-grid > .input-group:has(textarea.premium-textarea):nth-of-type(2) { animation-delay: 0.14s; }
.sla-generator-wrapper .step-container .form-grid > .input-group:has(textarea.premium-textarea):nth-of-type(3) { animation-delay: 0.22s; }

@keyframes clauseCardSlide {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Light-theme variants for the clause cards */
[data-theme="light"] .sla-generator-wrapper .step-container .form-grid > .input-group:has(textarea.premium-textarea),
[data-theme="light"] .sla-generator-wrapper .step-container .form-grid .input-row > .input-group:has(textarea.premium-textarea) {
  background: linear-gradient(135deg,
      rgba(245, 158, 11, 0.12) 0%,
      rgba(255, 250, 240, 0.62) 40%) !important;
  border-color: rgba(217, 119, 6, 0.22) !important;
  box-shadow: 0 4px 16px rgba(180, 83, 9, 0.08);
}
[data-theme="light"] .sla-generator-wrapper .step-container .form-grid > .input-group:has(textarea.premium-textarea)::before,
[data-theme="light"] .sla-generator-wrapper .step-container .form-grid .input-row > .input-group:has(textarea.premium-textarea)::before {
  background: linear-gradient(180deg, #d97706, #b45309);
}
[data-theme="light"] .sla-generator-wrapper .step-container .form-grid > .input-group:has(textarea.premium-textarea):focus-within,
[data-theme="light"] .sla-generator-wrapper .step-container .form-grid .input-row > .input-group:has(textarea.premium-textarea):focus-within {
  border-color: rgba(217, 119, 6, 0.50) !important;
  background: linear-gradient(135deg,
      rgba(245, 158, 11, 0.18) 0%,
      rgba(255, 250, 240, 0.85) 45%) !important;
  box-shadow: 0 6px 22px rgba(217, 119, 6, 0.22);
}
[data-theme="light"] .sla-generator-wrapper .step-container .form-grid > .input-group:has(textarea.premium-textarea):focus-within::before,
[data-theme="light"] .sla-generator-wrapper .step-container .form-grid .input-row > .input-group:has(textarea.premium-textarea):focus-within::before {
  opacity: 1;
  box-shadow: 0 0 14px rgba(217, 119, 6, 0.65);
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
  position: relative;
  isolation: isolate;
}

/* Subtle ambient gold glows pinned to corners — give the page warmth without
   imposing a solid background. Visible in both themes; deeper in light. */
.sla-generator-wrapper::before,
.sla-generator-wrapper::after {
  content: '';
  position: absolute;
  pointer-events: none;
  z-index: -1;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.5;
  animation: auraDrift 24s ease-in-out infinite alternate;
}
.sla-generator-wrapper::before {
  top: -160px; left: -160px;
  width: 480px; height: 480px;
  background: radial-gradient(closest-side, rgba(251, 191, 36, 0.18), transparent 70%);
}
.sla-generator-wrapper::after {
  bottom: -200px; right: -200px;
  width: 560px; height: 560px;
  background: radial-gradient(closest-side, rgba(217, 119, 6, 0.16), transparent 70%);
  animation-delay: -6s;
}
@keyframes auraDrift {
  0%   { transform: translate(0, 0); }
  100% { transform: translate(40px, 30px); }
}

/* Header — transparent in both modes with subtle gold underline + animated rail */
.sla-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 40px 22px;
  background: transparent;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  position: sticky;
  top: 0;
  z-index: 100;
  animation: headerSlideIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.sla-header::after {
  content: '';
  position: absolute;
  left: 8%; right: 8%; bottom: -1px; height: 1px;
  background: linear-gradient(90deg,
      transparent 0%,
      rgba(251, 191, 36, 0.55) 50%,
      transparent 100%);
  background-size: 200% 100%;
  animation: railShimmer 5s ease-in-out infinite;
}
@keyframes railShimmer {
  0%, 100% { background-position: 0 0; opacity: 0.6; }
  50%      { background-position: 200% 0; opacity: 1; }
}
@keyframes headerSlideIn {
  from { opacity: 0; transform: translateY(-12px); }
  to   { opacity: 1; transform: translateY(0); }
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.back-btn {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: background 0.25s, border-color 0.25s, color 0.25s, transform 0.25s;
}

.back-btn:hover {
  color: #fff;
  background: rgba(251, 191, 36, 0.10);
  border-color: rgba(251, 191, 36, 0.35);
  transform: translateX(-2px);
}

.header-title h1 {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.5px;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 14px;
  background: linear-gradient(120deg, #fef3c7 0%, #fbbf24 55%, #f59e0b 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.badge {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 5px 10px;
  background: rgba(251, 191, 36, 0.14);
  color: #fde047;
  border-radius: 999px;
  border: 1px solid rgba(251, 191, 36, 0.35);
  font-weight: 700;
  position: relative;
  overflow: hidden;
  -webkit-text-fill-color: #fde047; /* override the gradient text-fill from h1 */
}
.badge::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 30%, rgba(255, 255, 255, 0.25) 50%, transparent 70%);
  background-size: 200% 100%;
  animation: badgeShimmer 4s ease-in-out infinite;
}
@keyframes badgeShimmer {
  0%, 100% { background-position: -100% 0; }
  50%      { background-position: 200% 0; }
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
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.30);
  color: #fde047;
  font-weight: 600;
  border-radius: 999px;
  padding: 0 18px;
  height: 40px;
}

.save-draft:hover {
  background: rgba(251, 191, 36, 0.20);
  border-color: rgba(251, 191, 36, 0.55);
  color: #fef3c7;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(245, 158, 11, 0.22);
}

/* Wizard Layout */
.wizard-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Sidebar Stepper — transparent in both themes, gold-tinted rail divider */
.wizard-sidebar {
  width: 280px;
  flex-shrink: 0;
  background: transparent;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  padding: 32px 0;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}
.wizard-sidebar::-webkit-scrollbar { width: 6px; }
.wizard-sidebar::-webkit-scrollbar-thumb { background: rgba(251, 191, 36, 0.30); border-radius: 3px; }
.wizard-sidebar::-webkit-scrollbar-thumb:hover { background: rgba(251, 191, 36, 0.50); }
.wizard-sidebar::before {
  content: '';
  position: absolute;
  top: 12%;
  bottom: 12%;
  right: -1px;
  width: 1px;
  background: linear-gradient(180deg,
      transparent 0%,
      rgba(251, 191, 36, 0.35) 50%,
      transparent 100%);
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
  background: linear-gradient(90deg,
      rgba(251, 191, 36, 0.12) 0%,
      rgba(251, 191, 36, 0.02) 80%);
  transform: translateX(6px);
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
  background: linear-gradient(135deg, #fbbf24, #d97706);
  border-color: rgba(255, 255, 255, 0.45);
  color: #1a1410;
  box-shadow:
    0 0 0 3px rgba(251, 191, 36, 0.18),
    0 4px 12px rgba(217, 119, 6, 0.40);
  animation: indicatorPulse 2.4s ease-in-out infinite;
}

@keyframes indicatorPulse {
  0%, 100% {
    box-shadow:
      0 0 0 3px rgba(251, 191, 36, 0.18),
      0 4px 12px rgba(217, 119, 6, 0.40);
  }
  50% {
    box-shadow:
      0 0 0 6px rgba(251, 191, 36, 0.10),
      0 6px 18px rgba(217, 119, 6, 0.55);
  }
}

.step-item.completed .step-indicator {
  background: rgba(251, 191, 36, 0.18);
  color: #fbbf24;
  border-color: rgba(251, 191, 36, 0.50);
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
  color: #fbbf24;
}

.active-glow {
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, #fbbf24, #d97706);
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.55);
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

/* Footer Navigation — transparent fade, no opaque rectangle */
.wizard-footer {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: transparent;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24px 40px;
  z-index: 10;
}
/* Soft top-edge fade so step content scrolling under the footer doesn't read
   as harsh — uses theme-aware token via the page bg. */
.wizard-footer::before {
  content: '';
  position: absolute;
  left: 0; right: 0; bottom: 100%;
  height: 64px;
  background: linear-gradient(to top,
      var(--bg-color, #000) 0%,
      transparent 100%);
  pointer-events: none;
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
  border: 1px solid rgba(255, 255, 255, 0.10);
  color: #fff;
  border-radius: 999px;
}

.btn-prev:hover:not(:disabled) {
  background: rgba(251, 191, 36, 0.10);
  border-color: rgba(251, 191, 36, 0.30);
  color: #fde047;
  transform: translateX(-2px);
}

.btn-prev:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.btn-next {
  background: linear-gradient(135deg, #fde047 0%, #fbbf24 50%, #f59e0b 100%);
  color: #1a1410;
  border: none;
  border-radius: 999px;
  font-weight: 700;
  box-shadow:
    0 6px 18px rgba(245, 158, 11, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.50);
}

.btn-next:hover {
  background: linear-gradient(135deg, #fef08a 0%, #fde047 50%, #fbbf24 100%);
  transform: translateY(-2px) scale(1.02);
  box-shadow:
    0 10px 26px rgba(245, 158, 11, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.60);
}

.btn-finish {
  background: linear-gradient(135deg, #34d399, #15803d);
  color: #fff;
  border: none;
  border-radius: 999px;
  font-weight: 700;
  box-shadow:
    0 6px 18px rgba(21, 128, 61, 0.40),
    inset 0 1px 0 rgba(255, 255, 255, 0.30);
}

.btn-finish:hover {
  background: linear-gradient(135deg, #6ee7b7, #34d399);
  transform: translateY(-2px) scale(1.02);
  box-shadow:
    0 10px 26px rgba(21, 128, 61, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.40);
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
  background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 50%, #fde047 100%);
  background-size: 200% 100%;
  border-radius: 999px;
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.55);
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  animation: progressShimmer 4s linear infinite;
}
@keyframes progressShimmer {
  0%   { background-position: 0 0; }
  100% { background-position: 200% 0; }
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

/* ════════════════════════════════════════════════════════════════════════
   LIGHT THEME — page on cream, transparent surfaces, gold accents.
   Preserves the yellow/orange/golden palette and transparency throughout.
   ════════════════════════════════════════════════════════════════════════ */
[data-theme="light"] .sla-generator-wrapper {
  color: var(--text-primary, #1a1410);
}

/* Stronger ambient glow on cream so the warm gold is visible */
[data-theme="light"] .sla-generator-wrapper::before {
  background: radial-gradient(closest-side, rgba(251, 191, 36, 0.28), transparent 70%);
  opacity: 0.7;
}
[data-theme="light"] .sla-generator-wrapper::after {
  background: radial-gradient(closest-side, rgba(217, 119, 6, 0.24), transparent 70%);
  opacity: 0.7;
}

/* Header */
[data-theme="light"] .sla-header {
  border-bottom-color: rgba(217, 119, 6, 0.18);
}
[data-theme="light"] .sla-header::after {
  background: linear-gradient(90deg,
      transparent 0%,
      rgba(217, 119, 6, 0.55) 50%,
      transparent 100%);
}
[data-theme="light"] .back-btn {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(217, 119, 6, 0.22);
  color: #6b5840;
}
[data-theme="light"] .back-btn:hover {
  background: rgba(245, 158, 11, 0.16);
  border-color: rgba(217, 119, 6, 0.50);
  color: #78350f;
}
[data-theme="light"] .header-title h1 {
  background: linear-gradient(120deg, #92400e 0%, #d97706 60%, #b45309 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
[data-theme="light"] .badge {
  background: rgba(217, 119, 6, 0.14);
  color: #92400e;
  border-color: rgba(217, 119, 6, 0.42);
  -webkit-text-fill-color: #92400e;
}
[data-theme="light"] .project-selector label,
[data-theme="light"] .template-selector label {
  color: #b45309;
}
[data-theme="light"] .save-draft {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border-color: rgba(217, 119, 6, 0.55);
  color: #fffaf0;
  box-shadow:
    0 4px 12px rgba(217, 119, 6, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.40);
}
[data-theme="light"] .save-draft:hover {
  background: linear-gradient(135deg, #d97706, #b45309);
  color: #fffaf0;
  box-shadow:
    0 6px 18px rgba(217, 119, 6, 0.50),
    inset 0 1px 0 rgba(255, 255, 255, 0.50);
}

/* Sidebar */
[data-theme="light"] .wizard-sidebar {
  border-right-color: rgba(217, 119, 6, 0.18);
}
[data-theme="light"] .wizard-sidebar::before {
  background: linear-gradient(180deg,
      transparent 0%,
      rgba(217, 119, 6, 0.45) 50%,
      transparent 100%);
}
[data-theme="light"] .step-item:hover {
  background: rgba(245, 158, 11, 0.10);
}
[data-theme="light"] .step-item.active {
  background: linear-gradient(90deg,
      rgba(245, 158, 11, 0.20) 0%,
      rgba(255, 250, 240, 0.05) 80%);
}
[data-theme="light"] .step-indicator {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(217, 119, 6, 0.28);
  color: #92400e;
}
[data-theme="light"] .step-item.active .step-indicator {
  background: linear-gradient(135deg, #d97706, #b45309);
  border-color: rgba(255, 255, 255, 0.65);
  color: #fffaf0;
  box-shadow:
    0 0 0 3px rgba(217, 119, 6, 0.20),
    0 4px 12px rgba(180, 83, 9, 0.45);
  animation-name: indicatorPulseLight;
}
/* A selector cannot prefix @keyframes — the light variant is its own named
   keyframe, switched in via animation-name on the light-mode selector above. */
@keyframes indicatorPulseLight {
  0%, 100% {
    box-shadow:
      0 0 0 3px rgba(217, 119, 6, 0.20),
      0 4px 12px rgba(180, 83, 9, 0.45);
  }
  50% {
    box-shadow:
      0 0 0 6px rgba(217, 119, 6, 0.12),
      0 6px 18px rgba(180, 83, 9, 0.60);
  }
}
[data-theme="light"] .step-item.completed .step-indicator {
  background: rgba(217, 119, 6, 0.18);
  color: #b45309;
  border-color: rgba(217, 119, 6, 0.45);
}
[data-theme="light"] .step-title { color: #92400e; }
[data-theme="light"] .step-desc { color: #1a1410; }
[data-theme="light"] .step-item.active .step-desc { color: #b45309; }
[data-theme="light"] .active-glow {
  background: linear-gradient(180deg, #d97706, #b45309);
  box-shadow: 0 0 14px rgba(217, 119, 6, 0.55);
}
[data-theme="light"] .step-item:not(:last-child)::after {
  background: rgba(217, 119, 6, 0.16);
}
[data-theme="light"] .step-item.completed:not(:last-child)::after {
  background: rgba(217, 119, 6, 0.40);
}

/* Footer */
[data-theme="light"] .wizard-footer {
  border-top-color: rgba(217, 119, 6, 0.18);
}
/* The fade above the footer uses var(--bg-color) which resolves to #faf7f0 in light */
[data-theme="light"] .btn-prev {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(217, 119, 6, 0.22);
  color: #6b5840;
}
[data-theme="light"] .btn-prev:hover:not(:disabled) {
  background: rgba(245, 158, 11, 0.18);
  border-color: rgba(217, 119, 6, 0.55);
  color: #78350f;
}
[data-theme="light"] .btn-next {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%);
  color: #fffaf0;
  box-shadow:
    0 6px 18px rgba(217, 119, 6, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.40);
}
[data-theme="light"] .btn-next:hover {
  background: linear-gradient(135deg, #d97706 0%, #b45309 50%, #92400e 100%);
  box-shadow:
    0 10px 26px rgba(217, 119, 6, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.50);
}
[data-theme="light"] .btn-finish {
  background: linear-gradient(135deg, #15803d, #166534);
}
[data-theme="light"] .btn-finish:hover {
  background: linear-gradient(135deg, #16a34a, #15803d);
}
[data-theme="light"] .progress-indicator span { color: #92400e; }
[data-theme="light"] .progress-bar {
  background: rgba(217, 119, 6, 0.16);
}
[data-theme="light"] .progress-fill {
  background: linear-gradient(90deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%);
  box-shadow: 0 0 12px rgba(217, 119, 6, 0.55);
}

/* ═══════════════════════════════════════════
   DUPLICATE-SLA WARNING MODAL
   Mirrors HandoverWizardPage's .nano-modal-* design exactly so the two
   wizards look identical when the duplicate dialog appears. Dark base
   first, then light-theme overrides below.
   ═══════════════════════════════════════════ */

.nano-modal-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.nano-modal-card {
  width: 100%; max-width: 440px;
  background: #121214; border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px; padding: 32px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.6);
  text-align: center;
}
.slide-up { animation: nano-slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes nano-slide-up {
  from { opacity: 0; transform: translateY(20px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.nano-modal-icon {
  width: 64px; height: 64px; border-radius: 20px;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 24px;
}
.nano-modal-icon.warning { background: rgba(251, 191, 36, 0.1); color: #fbbf24; }
.nano-modal-content h3 { font-size: 20px; font-weight: 700; color: #fff; margin: 0 0 12px; }
.nano-modal-content p { font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.6; margin-bottom: 24px; }
.duplicate-info-box {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px; padding: 20px; margin-bottom: 24px; text-align: left;
}
.dib-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
.dib-row:last-child { margin-bottom: 0; }
.dib-l { color: rgba(255,255,255,0.4); }
.dib-v { color: #fff; font-weight: 500; }
.status-pill {
  padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase;
  background: rgba(167, 139, 250, 0.1); color: #a78bfa;
}
.status-pill.approved { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.status-pill.pending { background: rgba(251, 191, 36, 0.1); color: #fbbf24; }
.status-pill.rejected { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.status-pill.draft { background: rgba(113, 113, 122, 0.12); color: #a1a1aa; }
.nano-modal-subtext { font-size: 11px !important; color: rgba(255,255,255,0.3) !important; font-style: italic; }
.nano-modal-actions { display: flex; gap: 12px; }
.nano-btn {
  flex: 1; padding: 12px; border-radius: 12px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;
}
.nano-btn.primary { background: #fbbf24; color: #000; border: none; }
.nano-btn.primary:hover { background: #fcd34d; transform: translateY(-2px); }
.nano-btn.secondary { background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); }
.nano-btn.secondary:hover { background: rgba(255,255,255,0.1); }

/* Fade transition for the overlay */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ─── Light theme overrides for the duplicate-SLA modal ─── */
[data-theme="light"] .nano-modal-overlay {
  background: rgba(26, 20, 16, 0.42);
  backdrop-filter: blur(8px);
}
[data-theme="light"] .nano-modal-card {
  background: rgba(255, 250, 240, 0.96);
  border: 1px solid rgba(180, 110, 30, 0.22);
  box-shadow: 0 30px 70px rgba(120, 80, 20, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.6);
}
[data-theme="light"] .nano-modal-icon.warning {
  background: rgba(245, 158, 11, 0.18);
  color: #b45309;
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.18);
}
[data-theme="light"] .nano-modal-content h3 { color: var(--text-primary); }
[data-theme="light"] .nano-modal-content p { color: #6b5840; }
[data-theme="light"] .duplicate-info-box {
  background: rgba(245, 158, 11, 0.07);
  border-color: rgba(245, 158, 11, 0.22);
}
[data-theme="light"] .dib-l { color: #6b5840 !important; }
[data-theme="light"] .dib-v { color: var(--text-primary) !important; }
[data-theme="light"] .status-pill {
  background: rgba(167, 139, 250, 0.16);
  color: #6d28d9;
}
[data-theme="light"] .status-pill.approved {
  background: rgba(16, 185, 129, 0.16);
  color: #047857;
}
[data-theme="light"] .status-pill.pending {
  background: rgba(245, 158, 11, 0.18);
  color: #b45309;
}
[data-theme="light"] .status-pill.rejected {
  background: rgba(239, 68, 68, 0.16);
  color: #b91c1c;
}
[data-theme="light"] .status-pill.draft {
  background: rgba(113, 113, 122, 0.16);
  color: #52525b;
}
[data-theme="light"] .nano-modal-subtext { color: rgba(107, 88, 64, 0.6) !important; }
[data-theme="light"] .nano-btn.primary {
  background: linear-gradient(135deg, #f59e0b, #fb923c);
  color: #fff;
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.3);
}
[data-theme="light"] .nano-btn.primary:hover {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  box-shadow: 0 8px 22px rgba(245, 158, 11, 0.45);
}
[data-theme="light"] .nano-btn.secondary {
  background: rgba(26, 20, 16, 0.05);
  color: var(--text-primary);
  border: 1px solid rgba(26, 20, 16, 0.14);
}
[data-theme="light"] .nano-btn.secondary:hover {
  background: rgba(245, 158, 11, 0.1);
  color: #b45309;
  border-color: rgba(245, 158, 11, 0.35);
}
</style>
