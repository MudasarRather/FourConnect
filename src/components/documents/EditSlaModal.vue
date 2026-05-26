<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <Motion
          as="div"
          class="modal-content glass-panel"
          :initial="{ opacity: 0, scale: 0.94, y: 24, rotateX: 4 }"
          :animate="{ opacity: 1, scale: 1, y: 0, rotateX: 0 }"
          :exit="{ opacity: 0, scale: 0.96, y: 12 }"
          :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }"
        >
          <!-- Ambient gradient aura behind content -->
          <div class="ambient-aura" aria-hidden="true"></div>

          <!-- Header -->
          <div class="modal-header">
            <div class="header-text">
              <Motion
                as="h2"
                :initial="{ opacity: 0, y: -8 }"
                :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.4, delay: 0.15 }"
              >
                {{ form.status === 'Pending' ? 'Review & Approve SLA' : form.status === 'Approved' ? 'Edit Approved SLA' : 'Edit SLA Draft' }}
              </Motion>
              <Motion
                as="p"
                class="task-code"
                :initial="{ opacity: 0 }"
                :animate="{ opacity: 1 }"
                :transition="{ duration: 0.4, delay: 0.25 }"
              >
                {{ form.contract_reference || 'SLA-DRAFT' }}
              </Motion>
            </div>
            <div style="display:flex;align-items:center;gap:12px;">
              <Motion
                v-if="form.status !== 'Pending' && form.status !== 'Approved'"
                as="button"
                class="btn-ghost sm"
                :disabled="isSubmitting"
                @click="saveDraft('Draft')"
                :whileHover="{ y: -2 }"
                :whileTap="{ scale: 0.96 }"
              >
                <Loader2 v-if="isSubmitting" :size="14" class="spin" />
                <Save v-else :size="14" />
                <span>Save Draft</span>
              </Motion>
              <Motion
                as="button"
                class="close-btn"
                @click="close"
                :whileHover="{ rotate: 90, scale: 1.06 }"
                :whileTap="{ scale: 0.92 }"
                :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }"
              >
                <X :size="20" />
              </Motion>
            </div>
          </div>

          <!-- Progress Steps -->
          <div class="progress-container">
            <div class="step-indicators slim">
              <Motion
                v-for="(step, index) in steps"
                :key="index"
                as="div"
                class="step-dot"
                :class="{ active: currentStep === index, completed: currentStep > index }"
                @click="goToStep(index)"
                :title="step.label"
                :initial="{ opacity: 0, y: 12 }"
                :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.4, delay: 0.05 + index * 0.03, ease: [0.16, 1, 0.3, 1] }"
                :whileHover="currentStep !== index ? { y: -3, scale: 1.05 } : {}"
                :whileTap="{ scale: 0.94 }"
              >
                <span class="dot-icon-wrap">
                  <Check v-if="currentStep > index" :size="12" />
                  <component v-else :is="step.icon" :size="14" />
                </span>
                <Motion
                  v-if="currentStep === index"
                  as="span"
                  class="step-label"
                  :initial="{ opacity: 0, width: 0 }"
                  :animate="{ opacity: 1, width: 'auto' }"
                  :transition="{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }"
                >
                  {{ step.label }}
                </Motion>
              </Motion>
            </div>
            <div class="progress-track">
              <Motion
                as="div"
                class="progress-fill"
                :animate="{ width: progressPercent + '%' }"
                :transition="{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }"
              />
            </div>
          </div>

          <!-- Body -->
          <div class="modal-body">
            <Transition :name="slideDirection" mode="out-in">
                <component :key="currentStep" :is="steps[currentStep].component" :form="form" :errors="errors" @updateForm="updateForm" />
            </Transition>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <Motion
              v-if="currentStep > 0"
              as="button"
              class="btn-text secondary"
              @click="prevStep"
              :whileHover="{ x: -3 }"
              :whileTap="{ scale: 0.96 }"
            >
              <ArrowLeft :size="16" /><span>Back</span>
            </Motion>
            <Motion
              v-else
              as="button"
              class="btn-text secondary"
              @click="close"
              :whileHover="{ x: -3 }"
              :whileTap="{ scale: 0.96 }"
            >
              Cancel
            </Motion>
            <div class="footer-right">
              <Motion
                v-if="currentStep < steps.length - 1"
                as="button"
                class="btn-pill primary"
                @click="nextStep"
                :whileHover="{ y: -2, scale: 1.02 }"
                :whileTap="{ scale: 0.97 }"
                :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }"
              >
                <span>Continue</span><ArrowRight :size="16" />
              </Motion>
              <Motion
                v-else
                as="button"
                class="btn-pill primary"
                :disabled="isSubmitting"
                @click="saveDraft(form.status === 'Pending' ? 'Approved' : (form.status === 'Approved' ? 'Approved' : 'Pending'))"
                :whileHover="!isSubmitting ? { y: -2, scale: 1.02 } : {}"
                :whileTap="!isSubmitting ? { scale: 0.97 } : {}"
                :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }"
              >
                <Loader2 v-if="isSubmitting" :size="16" class="spin" />
                <span v-else-if="form.status === 'Pending'" style="display:flex;align-items:center;gap:8px;">Approve SLA <Check :size="16" /></span>
                <span v-else-if="form.status === 'Approved'" style="display:flex;align-items:center;gap:8px;">Update SLA <Check :size="16" /></span>
                <span v-else style="display:flex;align-items:center;gap:8px;">Submit Document <FileText :size="16" /></span>
              </Motion>
            </div>
          </div>

        </Motion>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import axios from 'axios'
import { Motion } from 'motion-v'
import {
  X, Check, ArrowLeft, ArrowRight, Loader2, Save,
  UserCircle, FileText, Layers, BarChart3, HeadphonesIcon, Activity,
  Shield, CreditCard, Scale, PenTool, ClipboardCheck
} from 'lucide-vue-next'
import { useToast } from '../../composables/useToast'

// Import Step Components
import SlaClientInfo from '../../views/documents/sla-steps/SlaClientInfo.vue'
import SlaOverview from '../../views/documents/sla-steps/SlaOverview.vue'
import SlaServiceScope from '../../views/documents/sla-steps/SlaServiceScope.vue'
import SlaServiceLevels from '../../views/documents/sla-steps/SlaServiceLevels.vue'
import SlaSupportEscalation from '../../views/documents/sla-steps/SlaSupportEscalation.vue'
import SlaMonitoring from '../../views/documents/sla-steps/SlaMonitoring.vue'
import SlaSecurity from '../../views/documents/sla-steps/SlaSecurity.vue'
import SlaPayment from '../../views/documents/sla-steps/SlaPayment.vue'
import SlaLegal from '../../views/documents/sla-steps/SlaLegal.vue'
import SlaSignatories from '../../views/documents/sla-steps/SlaSignatories.vue'
import SlaReview from '../../views/documents/sla-steps/SlaReview.vue'
import { API } from '@/utils/api'

const props = defineProps({
  modelValue: Boolean,
  sla: { type: Object, default: null },
  isAdmin: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue', 'submitted'])
const { success: toastSuccess, error: toastError } = useToast()

const close = () => emit('update:modelValue', false)

const steps = [
  { label: 'Client', component: SlaClientInfo, icon: UserCircle },
  { label: 'Overview', component: SlaOverview, icon: FileText },
  { label: 'Scope', component: SlaServiceScope, icon: Layers },
  { label: 'Levels', component: SlaServiceLevels, icon: BarChart3 },
  { label: 'Escalation', component: SlaSupportEscalation, icon: HeadphonesIcon },
  { label: 'Monitoring', component: SlaMonitoring, icon: Activity },
  { label: 'Security', component: SlaSecurity, icon: Shield },
  { label: 'Payment', component: SlaPayment, icon: CreditCard },
  { label: 'Legal', component: SlaLegal, icon: Scale },
  { label: 'Signatories', component: SlaSignatories, icon: PenTool },
  { label: 'Review', component: SlaReview, icon: ClipboardCheck }
]

const currentStep = ref(0)
const isSubmitting = ref(false)
const slideDirection = ref('slide-left')
const errors = ref({})

const form = reactive({
  id: '',
  project_id: null,
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
  services: [],
  escalations: [],
  penalties: [],
  signatories: [],
  status: 'Draft'
})

const progressPercent = computed(() => ((currentStep.value) / (steps.length - 1)) * 100)

// Keep form.id in sync with props.sla.id whenever the parent swaps the SLA
// reference (e.g. polling refetch on the parent replaces the array).
watch(() => props.sla?.id, (newId) => {
  if (newId && newId !== form.id) form.id = newId
}, { immediate: true })

watch(() => props.modelValue, (isOpen) => {
  if (isOpen && props.sla) {
    currentStep.value = 0
    slideDirection.value = 'slide-left'
    errors.value = {}
    const e = props.sla
    Object.assign(form, {
        id: e.id,
        project_id: e.project_id || null,
        template_id: e.template_id || 'standard',
        client_organization_name: e.client_organization_name || '',
        client_address: e.client_address || '',
        client_contact_person: e.client_contact_person || '',
        client_email: e.client_email || '',
        client_phone: e.client_phone || '',
        provider_name: e.provider_name || 'Fourconnect Solutions',
        provider_address: e.provider_address || '',
        provider_registration_number: e.provider_registration_number || '',
        provider_tax_id: e.provider_tax_id || '',
        title: e.title || '',
        description: e.description || '',
        services_covered: e.services_covered || '',
        agreement_type: e.agreement_type || 'Support SLA',
        start_date: e.start_date || '',
        end_date: e.end_date || '',
        renewal_type: e.renewal_type || 'Auto Renewal',
        version: e.version || '1.0',
        contract_reference: e.contract_reference || '',
        monitoring_tools: Array.isArray(e.monitoring_tools) ? e.monitoring_tools : [],
        reporting_frequency: e.reporting_frequency || 'Monthly',
        report_delivery_method: e.report_delivery_method || 'Email',
        monitoring_dashboard_url: e.monitoring_dashboard_url || '',
        alert_notification_email: e.alert_notification_email || '',
        security_measures: Array.isArray(e.security_measures) ? e.security_measures : [],
        compliance_standards: Array.isArray(e.compliance_standards) ? e.compliance_standards : [],
        data_retention_policy: e.data_retention_policy || '',
        incident_reporting_time: e.incident_reporting_time || '',
        agreement_value: e.agreement_value || null,
        currency: e.currency || 'INR',
        billing_frequency: e.billing_frequency || 'Monthly',
        payment_method: e.payment_method || 'Bank Transfer',
        liability_limit: e.liability_limit || '',
        termination_conditions: e.termination_conditions || '',
        force_majeure_clause: e.force_majeure_clause || '',
        confidentiality_clause: e.confidentiality_clause || '',
        intellectual_property_clause: e.intellectual_property_clause || '',
        services: e.services?.length ? JSON.parse(JSON.stringify(e.services)) : [],
        escalations: e.escalations?.length ? JSON.parse(JSON.stringify(e.escalations)) : [],
        penalties: e.penalties?.length ? JSON.parse(JSON.stringify(e.penalties)) : [],
        signatories: e.signatories?.length ? JSON.parse(JSON.stringify(e.signatories)) : [],
        status: e.status || 'Draft'
    })
  }
})

const updateForm = (key, value) => { form[key] = value }

const validateStep = (stepIdx) => {
  const f = form
  
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
    setTimeout(() => {
      errors.value = newErrors
    }, 10)
  }
  
  return isValid
}

// Navigation
const goToStep = (idx) => {
  if (idx > currentStep.value) {
    let canProceed = true
    for (let i = currentStep.value; i < idx; i++) {
        if (!validateStep(i)) {
            canProceed = false
            currentStep.value = i
            break
        }
    }
    if (canProceed) {
        slideDirection.value = 'slide-left'
        currentStep.value = idx
    }
  } else {
    slideDirection.value = 'slide-right'
    currentStep.value = idx
  }
}
const prevStep = () => { if (currentStep.value > 0) { slideDirection.value = 'slide-right'; currentStep.value-- } }
const nextStep = () => {
    if (!validateStep(currentStep.value)) return
    slideDirection.value = 'slide-left'; currentStep.value++ 
}

const saveDraft = async (targetStatus = 'Draft') => {
    // Resolve the SLA id robustly: prefer the live form.id, fall back to the
    // prop's id. If neither is present we can't issue a PUT — bail out with a
    // clear error rather than hitting POST /api/sla/ and getting a 405.
    const slaId = form.id || props.sla?.id
    if (!slaId) {
        toastError("Cannot save — SLA id is missing. Close and reopen the editor.")
        return
    }
    if (!form.id) form.id = slaId

    isSubmitting.value = true
    try {
        // Build payload from form, then sanitize for Pydantic.
        // Backend schema treats project_id as Optional[UUID]: empty string fails
        // validation (must be a valid UUID or null). agreement_value is
        // Optional[float]: empty string fails — must be a number or null.
        const payload = { ...form, status: targetStatus }
        delete payload.id  // id lives in the URL, not the body

        const blankToNull = ['project_id', 'start_date', 'end_date']
        for (const k of blankToNull) {
            if (payload[k] === '' || payload[k] === undefined) payload[k] = null
        }

        // agreement_value: coerce text-input strings to number (or null)
        if (payload.agreement_value === '' || payload.agreement_value === undefined) {
            payload.agreement_value = null
        } else if (typeof payload.agreement_value === 'string') {
            const n = parseFloat(payload.agreement_value)
            payload.agreement_value = Number.isFinite(n) ? n : null
        }

        // Filter out skeleton service rows that haven't been filled in
        // (backend requires service_name to be non-empty on SlaServiceScopeCreate).
        if (Array.isArray(payload.services)) {
            payload.services = payload.services
                .filter(s => s && typeof s.service_name === 'string' && s.service_name.trim().length > 0)
                .map(s => ({
                    ...s,
                    metrics: Array.isArray(s.metrics) ? s.metrics : []
                }))
        }

        const token = props.isAdmin ? localStorage.getItem('admin_token') : localStorage.getItem('user_token')
        const res = await axios.put(`${API}/sla/${slaId}`, payload, {
            headers: { Authorization: `Bearer ${token}` }
        })

        // Rehydrate the form from server response so re-opens reflect saved state
        if (res?.data) {
            const e = res.data
            Object.assign(form, {
                title: e.title ?? form.title,
                description: e.description ?? form.description,
                contract_reference: e.contract_reference ?? form.contract_reference,
                version: e.version ?? form.version,
                start_date: e.start_date ?? form.start_date,
                end_date: e.end_date ?? form.end_date,
                status: e.status ?? targetStatus,
                services: Array.isArray(e.services) ? JSON.parse(JSON.stringify(e.services)) : form.services,
                escalations: Array.isArray(e.escalations) ? JSON.parse(JSON.stringify(e.escalations)) : form.escalations,
                penalties: Array.isArray(e.penalties) ? JSON.parse(JSON.stringify(e.penalties)) : form.penalties,
                signatories: Array.isArray(e.signatories) ? JSON.parse(JSON.stringify(e.signatories)) : form.signatories,
            })
        }

        let msg = "Draft saved"
        if (targetStatus === 'Pending') msg = "SLA Submitted successfully"
        if (targetStatus === 'Approved') msg = "SLA Approved successfully"
        toastSuccess(msg)

        emit('submitted')

        // Only close on terminal status transitions; Save Draft keeps user editing.
        if (targetStatus !== 'Draft') close()
    } catch (e) {
        console.error(e)
        let errMsg = "Failed to update draft"
        if (targetStatus === 'Pending') errMsg = "Failed to submit SLA"
        if (targetStatus === 'Approved') errMsg = "Failed to approve SLA"
        toastError(errMsg)
    } finally {
        isSubmitting.value = false
    }
}
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

/* ═══════════════════════════════════════════════════════════════════════════
   LIGHT-THEME RESCUE — non-scoped so we pierce every SLA step component's
   own scoped dark styles. Each rule is anchored on .modal-content.glass-panel
   to scope these overrides to the Edit SLA modal only.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Step container headings */
[data-theme="light"] .modal-content.glass-panel .step-header h2 {
  color: #1a1410 !important;
}
[data-theme="light"] .modal-content.glass-panel .step-header p {
  color: #6b5840 !important;
}

/* Form section frames */
[data-theme="light"] .modal-content.glass-panel .form-section {
  background: rgba(255, 250, 240, 0.55) !important;
  border: 1px solid rgba(217, 119, 6, 0.18) !important;
}
[data-theme="light"] .modal-content.glass-panel .form-section.provider-section {
  background: rgba(245, 158, 11, 0.10) !important;
  border-color: rgba(217, 119, 6, 0.28) !important;
}

/* Section titles ("CLIENT DETAILS" etc.) */
[data-theme="light"] .modal-content.glass-panel .section-title {
  color: #b45309 !important;
  border-bottom-color: rgba(217, 119, 6, 0.22) !important;
}
[data-theme="light"] .modal-content.glass-panel .text-yellow {
  color: #b45309 !important;
}

/* Field labels — the things that were nearly invisible before */
[data-theme="light"] .modal-content.glass-panel .input-group label,
[data-theme="light"] .modal-content.glass-panel label {
  color: #78350f !important;
  font-weight: 600 !important;
}
[data-theme="light"] .modal-content.glass-panel .required,
[data-theme="light"] .modal-content.glass-panel .error-label,
[data-theme="light"] .modal-content.glass-panel .error-msg {
  color: #b91c1c !important;
}

/* INPUTS — solid cream background, dark text, gold border */
[data-theme="light"] .modal-content.glass-panel input,
[data-theme="light"] .modal-content.glass-panel textarea,
[data-theme="light"] .modal-content.glass-panel select,
[data-theme="light"] .modal-content.glass-panel .premium-input,
[data-theme="light"] .modal-content.glass-panel .premium-textarea,
[data-theme="light"] .modal-content.glass-panel .text-input,
[data-theme="light"] .modal-content.glass-panel .table-input,
[data-theme="light"] .modal-content.glass-panel .design-select .select-selected {
  background: rgba(255, 250, 240, 0.92) !important;
  border: 1px solid rgba(217, 119, 6, 0.22) !important;
  color: #1a1410 !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6) !important;
}

[data-theme="light"] .modal-content.glass-panel input::placeholder,
[data-theme="light"] .modal-content.glass-panel textarea::placeholder {
  color: rgba(120, 53, 15, 0.45) !important;
}

[data-theme="light"] .modal-content.glass-panel input:focus,
[data-theme="light"] .modal-content.glass-panel textarea:focus,
[data-theme="light"] .modal-content.glass-panel select:focus {
  border-color: #d97706 !important;
  background: #fffaf0 !important;
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.18) !important;
  outline: none !important;
}

/* Highlighted input (Provider Name) */
[data-theme="light"] .modal-content.glass-panel .premium-input.highlighted {
  color: #b45309 !important;
  font-weight: 600 !important;
}

/* Select options */
[data-theme="light"] .modal-content.glass-panel select option {
  background: #fffaf0 !important;
  color: #1a1410 !important;
}

/* Custom dropdown (design-select) options list */
[data-theme="light"] .modal-content.glass-panel .design-select .select-options,
[data-theme="light"] .modal-content.glass-panel .design-select .select-option {
  background: rgba(255, 250, 240, 0.96) !important;
  color: #1a1410 !important;
  border-color: rgba(217, 119, 6, 0.22) !important;
}
[data-theme="light"] .modal-content.glass-panel .design-select .select-option:hover,
[data-theme="light"] .modal-content.glass-panel .design-select .select-option.is-selected {
  background: rgba(245, 158, 11, 0.18) !important;
  color: #78350f !important;
}

/* Tags / chips inside steps */
[data-theme="light"] .modal-content.glass-panel .tag {
  background: rgba(245, 158, 11, 0.16) !important;
  color: #92400e !important;
  border: 1px solid rgba(217, 119, 6, 0.28) !important;
}

/* Glass / ghost buttons inside steps (Add Service, Add Metric, Add Tier) */
[data-theme="light"] .modal-content.glass-panel .btn-glass {
  background: rgba(245, 158, 11, 0.16) !important;
  border-color: rgba(217, 119, 6, 0.32) !important;
  color: #78350f !important;
}
[data-theme="light"] .modal-content.glass-panel .btn-glass:hover {
  background: rgba(245, 158, 11, 0.28) !important;
  border-color: rgba(217, 119, 6, 0.55) !important;
}

/* Services table */
[data-theme="light"] .modal-content.glass-panel .services-table,
[data-theme="light"] .modal-content.glass-panel .table-wrapper {
  background: rgba(255, 250, 240, 0.45) !important;
  border-color: rgba(217, 119, 6, 0.16) !important;
}
[data-theme="light"] .modal-content.glass-panel .services-table th {
  background: rgba(245, 158, 11, 0.10) !important;
  color: #92400e !important;
  border-bottom-color: rgba(217, 119, 6, 0.22) !important;
}
[data-theme="light"] .modal-content.glass-panel .services-table td {
  border-color: rgba(217, 119, 6, 0.10) !important;
  color: #1a1410 !important;
}

/* Review step cards */
[data-theme="light"] .modal-content.glass-panel .review-card {
  background: rgba(255, 250, 240, 0.62) !important;
  border-color: rgba(217, 119, 6, 0.18) !important;
}
[data-theme="light"] .modal-content.glass-panel .review-grid .detail-item label {
  color: #92400e !important;
}
[data-theme="light"] .modal-content.glass-panel .review-grid .detail-item p {
  color: #1a1410 !important;
}

/* Checkbox cards (security measures, compliance, monitoring tools) */
[data-theme="light"] .modal-content.glass-panel .checkbox-card,
[data-theme="light"] .modal-content.glass-panel .check-card,
[data-theme="light"] .modal-content.glass-panel .tool-chip,
[data-theme="light"] .modal-content.glass-panel .compliance-chip,
[data-theme="light"] .modal-content.glass-panel .multi-card {
  background: rgba(255, 250, 240, 0.78) !important;
  border-color: rgba(217, 119, 6, 0.22) !important;
  color: #1a1410 !important;
}
[data-theme="light"] .modal-content.glass-panel .checkbox-card.active,
[data-theme="light"] .modal-content.glass-panel .check-card.active,
[data-theme="light"] .modal-content.glass-panel .tool-chip.active,
[data-theme="light"] .modal-content.glass-panel .compliance-chip.active,
[data-theme="light"] .modal-content.glass-panel .multi-card.active,
[data-theme="light"] .modal-content.glass-panel .checkbox-card.is-selected,
[data-theme="light"] .modal-content.glass-panel .tool-chip.is-selected {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.20), rgba(217, 119, 6, 0.15)) !important;
  border-color: rgba(217, 119, 6, 0.45) !important;
  color: #78350f !important;
}
[data-theme="light"] .modal-content.glass-panel .checkbox-label {
  color: #1a1410 !important;
}

/* Signatory party cards */
[data-theme="light"] .modal-content.glass-panel .signatory-card,
[data-theme="light"] .modal-content.glass-panel .party-card {
  background: rgba(255, 250, 240, 0.78) !important;
  border-color: rgba(217, 119, 6, 0.22) !important;
}

/* E-Signature notice box */
[data-theme="light"] .modal-content.glass-panel .info-banner,
[data-theme="light"] .modal-content.glass-panel .e-signature-banner,
[data-theme="light"] .modal-content.glass-panel .signature-info {
  background: rgba(245, 158, 11, 0.10) !important;
  border: 1px solid rgba(217, 119, 6, 0.28) !important;
  color: #78350f !important;
}

/* Trash / delete row buttons */
[data-theme="light"] .modal-content.glass-panel .delete-btn,
[data-theme="light"] .modal-content.glass-panel .trash-btn {
  color: #b91c1c !important;
}

/* ════════════════════════════════════════════════════════════════════════
   LAYOUT FIXES (both themes)
   ════════════════════════════════════════════════════════════════════════ */

/* Phone/email overflow + label-wrap row alignment.
   Force each .input-group inside an .input-row to allow shrink-to-fit
   and align its input to the bottom so wrapped labels don't push it down. */
.modal-content.glass-panel .input-row {
  align-items: end;
}
.modal-content.glass-panel .input-row .input-group {
  min-width: 0;
}
.modal-content.glass-panel .input-row .input-group label {
  min-height: 32px;
  display: flex;
  align-items: flex-start;
  line-height: 1.3;
}
.modal-content.glass-panel input,
.modal-content.glass-panel textarea,
.modal-content.glass-panel .premium-input,
.modal-content.glass-panel .premium-textarea {
  width: 100%;
  box-sizing: border-box;
  max-width: 100%;
}

/* Tables: NO horizontal scroll — every table fits the modal width. */
.modal-content.glass-panel .premium-table-wrapper,
.modal-content.glass-panel .metrics-table-wrapper {
  width: 100%;
  overflow: hidden;
  border-radius: 12px;
}
.modal-content.glass-panel .premium-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
}
.modal-content.glass-panel .premium-table th,
.modal-content.glass-panel .premium-table td {
  padding: 8px 8px;
  vertical-align: middle;
  word-break: break-word;
  min-width: 0;
}
.modal-content.glass-panel .premium-table .table-input,
.modal-content.glass-panel .premium-table .sla-select-trigger {
  font-size: 12px !important;
  padding: 6px 8px !important;
  min-width: 0 !important;
  width: 100% !important;
  box-sizing: border-box !important;
}
.modal-content.glass-panel .premium-table .table-input::placeholder {
  text-overflow: ellipsis;
}

/* ════════════════════════════════════════════════════════════════════════
   ADD BUTTONS — visible in BOTH themes
   ════════════════════════════════════════════════════════════════════════ */
.modal-content.glass-panel .add-btn,
.modal-content.glass-panel .add-metric-btn,
.modal-content.glass-panel .text-add-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.20), rgba(245, 158, 11, 0.14)) !important;
  border: 1px solid rgba(251, 191, 36, 0.45) !important;
  color: #fde047 !important;
  box-shadow:
    0 2px 8px rgba(245, 158, 11, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
  transition: background 0.2s, border-color 0.2s, color 0.2s, box-shadow 0.2s;
}
.modal-content.glass-panel .add-btn:hover,
.modal-content.glass-panel .add-metric-btn:hover,
.modal-content.glass-panel .text-add-btn:hover {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.30), rgba(245, 158, 11, 0.22)) !important;
  border-color: rgba(251, 191, 36, 0.70) !important;
  color: #fef9c3 !important;
}

[data-theme="light"] .modal-content.glass-panel .add-btn,
[data-theme="light"] .modal-content.glass-panel .add-metric-btn,
[data-theme="light"] .modal-content.glass-panel .text-add-btn {
  background: linear-gradient(135deg, #f59e0b, #d97706) !important;
  border: 1px solid rgba(217, 119, 6, 0.55) !important;
  color: #fffaf0 !important;
  box-shadow:
    0 4px 12px rgba(217, 119, 6, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.40) !important;
}
[data-theme="light"] .modal-content.glass-panel .add-btn:hover,
[data-theme="light"] .modal-content.glass-panel .add-metric-btn:hover,
[data-theme="light"] .modal-content.glass-panel .text-add-btn:hover {
  background: linear-gradient(135deg, #d97706, #b45309) !important;
  color: #fffaf0 !important;
}

/* ════════════════════════════════════════════════════════════════════════
   TABLE STRUCTURE — modern, structured, readable on cream
   ════════════════════════════════════════════════════════════════════════ */

/* Dark-theme baseline polish */
.modal-content.glass-panel .premium-table-wrapper,
.modal-content.glass-panel .metrics-table-wrapper {
  background: rgba(0, 0, 0, 0.20) !important;
  border: 1px solid rgba(255, 255, 255, 0.06) !important;
}
.modal-content.glass-panel .premium-table th {
  background: rgba(255, 255, 255, 0.04) !important;
  color: rgba(251, 191, 36, 0.78) !important;
  border-bottom: 1px solid rgba(251, 191, 36, 0.16) !important;
  text-align: left !important;
  font-size: 10px !important;
  font-weight: 700 !important;
  letter-spacing: 0.06em !important;
  text-transform: uppercase !important;
  padding: 12px 12px !important;
}
.modal-content.glass-panel .premium-table td {
  border-top: 1px solid rgba(255, 255, 255, 0.04) !important;
  color: rgba(255, 255, 255, 0.9) !important;
}
.modal-content.glass-panel .premium-table tr:first-child td {
  border-top: none !important;
}
.modal-content.glass-panel .premium-table tr:hover td {
  background: rgba(251, 191, 36, 0.04) !important;
}

/* Light-theme tables — cream cards with gold rules */
[data-theme="light"] .modal-content.glass-panel .premium-table-wrapper,
[data-theme="light"] .modal-content.glass-panel .metrics-table-wrapper {
  background: rgba(255, 250, 240, 0.78) !important;
  border: 1px solid rgba(217, 119, 6, 0.22) !important;
  box-shadow:
    0 6px 20px rgba(180, 83, 9, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.55) !important;
}
[data-theme="light"] .modal-content.glass-panel .premium-table th {
  background: rgba(245, 158, 11, 0.12) !important;
  color: #92400e !important;
  border-bottom-color: rgba(217, 119, 6, 0.28) !important;
}
[data-theme="light"] .modal-content.glass-panel .premium-table td {
  border-top-color: rgba(217, 119, 6, 0.12) !important;
  color: #1a1410 !important;
}
[data-theme="light"] .modal-content.glass-panel .premium-table tr:hover td {
  background: rgba(245, 158, 11, 0.10) !important;
}

/* Table inputs (inline cell editors) */
.modal-content.glass-panel .table-input {
  background: rgba(255, 255, 255, 0.03) !important;
  border: 1px solid transparent !important;
  border-radius: 8px !important;
  padding: 8px 10px !important;
  color: #fff !important;
  font-size: 13px !important;
  width: 100% !important;
  box-sizing: border-box !important;
}
.modal-content.glass-panel .table-input:focus {
  outline: none !important;
  border-color: rgba(245, 158, 11, 0.50) !important;
  background: rgba(255, 255, 255, 0.06) !important;
}
[data-theme="light"] .modal-content.glass-panel .table-input {
  background: rgba(255, 250, 240, 0.85) !important;
  border-color: rgba(217, 119, 6, 0.22) !important;
  color: #1a1410 !important;
}
[data-theme="light"] .modal-content.glass-panel .table-input:focus {
  background: #fffaf0 !important;
  border-color: #d97706 !important;
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.18) !important;
}
[data-theme="light"] .modal-content.glass-panel .table-input::placeholder {
  color: rgba(120, 53, 15, 0.45) !important;
}

/* Metrics service card (Step 4) — visible badge + clean header */
.modal-content.glass-panel .service-metrics-card {
  background: rgba(0, 0, 0, 0.18) !important;
  border: 1px solid rgba(255, 255, 255, 0.06) !important;
  border-radius: 12px !important;
  margin-bottom: 16px !important;
  overflow: hidden !important;
}
.modal-content.glass-panel .svc-badge {
  display: inline-flex !important;
  padding: 4px 10px !important;
  border-radius: 6px !important;
  background: rgba(251, 191, 36, 0.18) !important;
  color: #fde047 !important;
  font-size: 10px !important;
  font-weight: 700 !important;
  letter-spacing: 0.06em !important;
  text-transform: uppercase !important;
  border: 1px solid rgba(251, 191, 36, 0.30) !important;
}
[data-theme="light"] .modal-content.glass-panel .service-metrics-card {
  background: rgba(255, 250, 240, 0.62) !important;
  border-color: rgba(217, 119, 6, 0.20) !important;
}
[data-theme="light"] .modal-content.glass-panel .svc-badge {
  background: rgba(217, 119, 6, 0.16) !important;
  color: #92400e !important;
  border-color: rgba(217, 119, 6, 0.32) !important;
}

/* ════════════════════════════════════════════════════════════════════════
   STEP 7 (SECURITY) — checkbox grid + compliance chips
   ════════════════════════════════════════════════════════════════════════ */
.modal-content.glass-panel .checkbox-grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)) !important;
  gap: 10px !important;
  background: transparent !important;
  padding: 0 !important;
}
.modal-content.glass-panel .custom-checkbox-wrapper {
  background: rgba(255, 255, 255, 0.03) !important;
  border: 1px solid rgba(255, 255, 255, 0.06) !important;
  border-radius: 10px !important;
  padding: 12px 14px !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  transition: background 0.2s, border-color 0.2s !important;
}
.modal-content.glass-panel .custom-checkbox-wrapper:hover {
  background: rgba(251, 191, 36, 0.08) !important;
  border-color: rgba(251, 191, 36, 0.30) !important;
}
.modal-content.glass-panel .custom-checkbox-wrapper.is-selected,
.modal-content.glass-panel .custom-checkbox-wrapper.active {
  background: rgba(251, 191, 36, 0.12) !important;
  border-color: rgba(251, 191, 36, 0.50) !important;
}
.modal-content.glass-panel .checkbox-label {
  color: rgba(255, 255, 255, 0.92) !important;
  font-size: 13px !important;
  font-weight: 500 !important;
}
.modal-content.glass-panel .checkbox-box {
  width: 18px !important; height: 18px !important;
  border-radius: 5px !important;
  border: 1.5px solid rgba(255, 255, 255, 0.30) !important;
  background: transparent !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-shrink: 0 !important;
}
.modal-content.glass-panel .checkbox-box.checked,
.modal-content.glass-panel .checkbox-box.active {
  background: #fbbf24 !important;
  border-color: #fbbf24 !important;
  color: #1a1410 !important;
}

/* Light theme — keep text dark on hover (the bug they reported).
   NOTE: the actual class name is .cb-label in SlaSecurity.vue (not .checkbox-label).
   Covering both so existing + future markup is safe. */
[data-theme="light"] .modal-content.glass-panel .custom-checkbox-wrapper {
  background: rgba(255, 250, 240, 0.72) !important;
  border-color: rgba(217, 119, 6, 0.22) !important;
}
[data-theme="light"] .modal-content.glass-panel .custom-checkbox-wrapper:hover {
  background: rgba(245, 158, 11, 0.16) !important;
  border-color: rgba(217, 119, 6, 0.45) !important;
}
[data-theme="light"] .modal-content.glass-panel .custom-checkbox-wrapper:hover .checkbox-label,
[data-theme="light"] .modal-content.glass-panel .custom-checkbox-wrapper:hover .cb-label,
[data-theme="light"] .modal-content.glass-panel .custom-checkbox-wrapper.is-selected .checkbox-label,
[data-theme="light"] .modal-content.glass-panel .custom-checkbox-wrapper.is-selected .cb-label,
[data-theme="light"] .modal-content.glass-panel .custom-checkbox-wrapper.active .checkbox-label,
[data-theme="light"] .modal-content.glass-panel .custom-checkbox-wrapper.active .cb-label,
[data-theme="light"] .modal-content.glass-panel .checkbox-label,
[data-theme="light"] .modal-content.glass-panel .cb-label {
  color: #1a1410 !important;
  font-weight: 500 !important;
}

/* Section description paragraph below the section title */
[data-theme="light"] .modal-content.glass-panel .section-desc {
  color: #6b5840 !important;
}

/* tool-tags-container (Step 6 Monitoring) has rgba(0,0,0,0.3) bg in source */
[data-theme="light"] .modal-content.glass-panel .tool-tags-container {
  background: rgba(255, 250, 240, 0.55) !important;
  border: 1px solid rgba(217, 119, 6, 0.20) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55) !important;
}
.modal-content.glass-panel .tool-tags-container {
  background: rgba(0, 0, 0, 0.18) !important;
  border-color: rgba(255, 255, 255, 0.06) !important;
}

/* tags-grid (Step 7 Compliance) is just a flex wrapper — keep transparent */
[data-theme="light"] .modal-content.glass-panel .tags-grid {
  background: transparent !important;
}

/* Compliance .tag-btn.active uses green in source — make it warm gold on cream */
[data-theme="light"] .modal-content.glass-panel .form-section.standards-section .tag-btn.active {
  background: linear-gradient(135deg, #f59e0b, #d97706) !important;
  border-color: rgba(217, 119, 6, 0.65) !important;
  color: #fffaf0 !important;
  box-shadow: 0 0 12px rgba(217, 119, 6, 0.35) !important;
}
[data-theme="light"] .modal-content.glass-panel .custom-checkbox-wrapper.is-selected,
[data-theme="light"] .modal-content.glass-panel .custom-checkbox-wrapper.active {
  background: rgba(245, 158, 11, 0.22) !important;
  border-color: rgba(217, 119, 6, 0.55) !important;
}
[data-theme="light"] .modal-content.glass-panel .checkbox-box {
  border-color: rgba(120, 53, 15, 0.40) !important;
  background: rgba(255, 250, 240, 0.92) !important;
}
[data-theme="light"] .modal-content.glass-panel .checkbox-box.checked,
[data-theme="light"] .modal-content.glass-panel .checkbox-box.active {
  background: #d97706 !important;
  border-color: #d97706 !important;
  color: #fffaf0 !important;
}

/* Standards section (compliance) */
.modal-content.glass-panel .standards-section {
  background: rgba(255, 255, 255, 0.02) !important;
  border: 1px solid rgba(255, 255, 255, 0.05) !important;
  border-radius: 12px !important;
  padding: 24px !important;
}
.modal-content.glass-panel .standards-section .section-subtitle,
.modal-content.glass-panel .standards-section p {
  color: rgba(255, 255, 255, 0.75) !important;
}
.modal-content.glass-panel .tag-btn,
.modal-content.glass-panel .compl-tag,
.modal-content.glass-panel .sec-tag {
  background: rgba(255, 255, 255, 0.05) !important;
  color: rgba(255, 255, 255, 0.85) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  padding: 8px 14px !important;
  border-radius: 999px !important;
  font-size: 13px !important;
  cursor: pointer !important;
  transition: background 0.2s, border-color 0.2s, color 0.2s !important;
}
.modal-content.glass-panel .tag-btn:hover,
.modal-content.glass-panel .compl-tag:hover {
  background: rgba(251, 191, 36, 0.10) !important;
  border-color: rgba(251, 191, 36, 0.32) !important;
  color: #fde047 !important;
}
.modal-content.glass-panel .tag-btn.is-selected,
.modal-content.glass-panel .tag-btn.active,
.modal-content.glass-panel .compl-tag.is-selected,
.modal-content.glass-panel .compl-tag.active {
  background: rgba(251, 191, 36, 0.18) !important;
  border-color: rgba(251, 191, 36, 0.55) !important;
  color: #fde047 !important;
}

[data-theme="light"] .modal-content.glass-panel .standards-section {
  background: rgba(255, 250, 240, 0.62) !important;
  border-color: rgba(217, 119, 6, 0.22) !important;
}
[data-theme="light"] .modal-content.glass-panel .standards-section .section-subtitle,
[data-theme="light"] .modal-content.glass-panel .standards-section p {
  color: #6b5840 !important;
}
[data-theme="light"] .modal-content.glass-panel .tag-btn,
[data-theme="light"] .modal-content.glass-panel .compl-tag,
[data-theme="light"] .modal-content.glass-panel .sec-tag {
  background: rgba(255, 250, 240, 0.85) !important;
  color: #78350f !important;
  border-color: rgba(217, 119, 6, 0.30) !important;
}
[data-theme="light"] .modal-content.glass-panel .tag-btn:hover,
[data-theme="light"] .modal-content.glass-panel .compl-tag:hover {
  background: rgba(245, 158, 11, 0.18) !important;
  border-color: rgba(217, 119, 6, 0.55) !important;
  color: #78350f !important;
}
[data-theme="light"] .modal-content.glass-panel .tag-btn.is-selected,
[data-theme="light"] .modal-content.glass-panel .tag-btn.active,
[data-theme="light"] .modal-content.glass-panel .compl-tag.is-selected,
[data-theme="light"] .modal-content.glass-panel .compl-tag.active {
  background: linear-gradient(135deg, #f59e0b, #d97706) !important;
  border-color: rgba(217, 119, 6, 0.65) !important;
  color: #fffaf0 !important;
}

/* ════════════════════════════════════════════════════════════════════════
   STEP 9 (LEGAL) — properly structured form sections + textareas
   ════════════════════════════════════════════════════════════════════════ */
.modal-content.glass-panel .form-grid {
  display: flex !important;
  flex-direction: column !important;
  gap: 20px !important;
}
.modal-content.glass-panel textarea,
.modal-content.glass-panel .premium-textarea {
  min-height: 110px !important;
  line-height: 1.55 !important;
  resize: vertical !important;
}

/* ════════════════════════════════════════════════════════════════════════
   STEP 10 (SIGNATORIES) — ultra-modern provider/client cards
   ════════════════════════════════════════════════════════════════════════ */
.modal-content.glass-panel .cards-grid {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 16px !important;
}
.modal-content.glass-panel .signatory-card {
  background: rgba(255, 255, 255, 0.02) !important;
  border: 1px solid rgba(255, 255, 255, 0.06) !important;
  border-radius: 14px !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
  position: relative !important;
}
.modal-content.glass-panel .signatory-card.provider-card {
  border-top: 3px solid #fbbf24 !important;
}
.modal-content.glass-panel .signatory-card.client-card {
  border-top: 3px solid #34d399 !important;
}
.modal-content.glass-panel .signatory-card .card-title {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  padding: 14px 18px !important;
  background: rgba(255, 255, 255, 0.04) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  color: #fff !important;
}
.modal-content.glass-panel .signatory-card .card-body {
  padding: 16px 18px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 14px !important;
}

[data-theme="light"] .modal-content.glass-panel .signatory-card {
  background: rgba(255, 250, 240, 0.78) !important;
  border-color: rgba(217, 119, 6, 0.22) !important;
  box-shadow:
    0 6px 20px rgba(180, 83, 9, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.55) !important;
}
[data-theme="light"] .modal-content.glass-panel .signatory-card.provider-card {
  border-top: 3px solid #d97706 !important;
}
[data-theme="light"] .modal-content.glass-panel .signatory-card.client-card {
  border-top: 3px solid #15803d !important;
}
[data-theme="light"] .modal-content.glass-panel .signatory-card .card-title {
  background: rgba(245, 158, 11, 0.10) !important;
  border-bottom-color: rgba(217, 119, 6, 0.22) !important;
  color: #1a1410 !important;
}

/* Digital signature panel — replace BLUE with AMBER (per design system) */
.modal-content.glass-panel .digital-sig-panel {
  background: rgba(251, 191, 36, 0.08) !important;
  border: 1px solid rgba(251, 191, 36, 0.32) !important;
  border-left: 4px solid #fbbf24 !important;
  border-radius: 12px !important;
  padding: 16px 18px !important;
  display: flex !important;
  align-items: flex-start !important;
  gap: 14px !important;
  color: rgba(255, 255, 255, 0.92) !important;
}
.modal-content.glass-panel .digital-sig-panel h4,
.modal-content.glass-panel .digital-sig-panel strong {
  color: #fde047 !important;
  font-weight: 600 !important;
}
.modal-content.glass-panel .digital-sig-panel p {
  color: rgba(255, 255, 255, 0.75) !important;
  margin: 4px 0 0 !important;
  font-size: 13px !important;
}
.modal-content.glass-panel .digital-sig-panel svg {
  color: #fbbf24 !important;
}

[data-theme="light"] .modal-content.glass-panel .digital-sig-panel {
  background: rgba(245, 158, 11, 0.12) !important;
  border-color: rgba(217, 119, 6, 0.38) !important;
  border-left-color: #d97706 !important;
  color: #1a1410 !important;
}
[data-theme="light"] .modal-content.glass-panel .digital-sig-panel h4,
[data-theme="light"] .modal-content.glass-panel .digital-sig-panel strong {
  color: #92400e !important;
}
[data-theme="light"] .modal-content.glass-panel .digital-sig-panel p {
  color: #6b5840 !important;
}
[data-theme="light"] .modal-content.glass-panel .digital-sig-panel svg {
  color: #b45309 !important;
}

/* ════════════════════════════════════════════════════════════════════════
   STEP 11 (REVIEW) — proper structure
   ════════════════════════════════════════════════════════════════════════ */
.modal-content.glass-panel .review-grid {
  display: flex !important;
  flex-direction: column !important;
  gap: 16px !important;
}
.modal-content.glass-panel .review-section {
  background: rgba(255, 255, 255, 0.03) !important;
  border: 1px solid rgba(255, 255, 255, 0.06) !important;
  border-radius: 14px !important;
  padding: 20px !important;
}
.modal-content.glass-panel .review-section h3,
.modal-content.glass-panel .review-section .section-heading,
.modal-content.glass-panel .review-section .review-title {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  font-size: 15px !important;
  font-weight: 600 !important;
  color: #fff !important;
  margin: 0 0 14px !important;
}
.modal-content.glass-panel .data-grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)) !important;
  gap: 14px !important;
}
.modal-content.glass-panel .data-item {
  display: flex !important;
  flex-direction: column !important;
  gap: 4px !important;
}
.modal-content.glass-panel .data-item label,
.modal-content.glass-panel .data-item .data-label {
  font-size: 10px !important;
  font-weight: 700 !important;
  letter-spacing: 0.06em !important;
  text-transform: uppercase !important;
  color: rgba(251, 191, 36, 0.75) !important;
}
.modal-content.glass-panel .data-item p,
.modal-content.glass-panel .data-item .data-value {
  font-size: 14px !important;
  color: #fff !important;
  margin: 0 !important;
  font-weight: 500 !important;
}
.modal-content.glass-panel .scope-list {
  display: flex !important;
  flex-direction: column !important;
  gap: 8px !important;
}
.modal-content.glass-panel .scope-row {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  background: rgba(255, 255, 255, 0.03) !important;
  border: 1px solid rgba(255, 255, 255, 0.05) !important;
  border-radius: 10px !important;
  padding: 10px 14px !important;
}
.modal-content.glass-panel .generation-warning {
  background: rgba(251, 191, 36, 0.10) !important;
  border: 1px solid rgba(251, 191, 36, 0.35) !important;
  border-left: 4px solid #fbbf24 !important;
  border-radius: 12px !important;
  padding: 14px 18px !important;
  color: rgba(255, 255, 255, 0.92) !important;
  display: flex !important;
  align-items: flex-start !important;
  gap: 12px !important;
}
.modal-content.glass-panel .generation-warning h4,
.modal-content.glass-panel .generation-warning strong {
  color: #fde047 !important;
}
.modal-content.glass-panel .generation-warning p {
  color: rgba(255, 255, 255, 0.78) !important;
  font-size: 13px !important;
  margin: 4px 0 0 !important;
}

[data-theme="light"] .modal-content.glass-panel .review-section {
  background: rgba(255, 250, 240, 0.78) !important;
  border-color: rgba(217, 119, 6, 0.22) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55) !important;
}
[data-theme="light"] .modal-content.glass-panel .review-section h3,
[data-theme="light"] .modal-content.glass-panel .review-section .section-heading,
[data-theme="light"] .modal-content.glass-panel .review-section .review-title {
  color: #1a1410 !important;
}
[data-theme="light"] .modal-content.glass-panel .data-item label,
[data-theme="light"] .modal-content.glass-panel .data-item .data-label {
  color: #b45309 !important;
}
[data-theme="light"] .modal-content.glass-panel .data-item p,
[data-theme="light"] .modal-content.glass-panel .data-item .data-value {
  color: #1a1410 !important;
}
[data-theme="light"] .modal-content.glass-panel .scope-row {
  background: rgba(255, 250, 240, 0.85) !important;
  border-color: rgba(217, 119, 6, 0.20) !important;
  color: #1a1410 !important;
}
[data-theme="light"] .modal-content.glass-panel .generation-warning {
  background: rgba(245, 158, 11, 0.16) !important;
  border-color: rgba(217, 119, 6, 0.45) !important;
  border-left-color: #d97706 !important;
  color: #1a1410 !important;
}
[data-theme="light"] .modal-content.glass-panel .generation-warning h4,
[data-theme="light"] .modal-content.glass-panel .generation-warning strong {
  color: #92400e !important;
}
[data-theme="light"] .modal-content.glass-panel .generation-warning p {
  color: #6b5840 !important;
}

/* ════════════════════════════════════════════════════════════════════════
   REVIEW STEP — actual class names used in SlaReview.vue
   ════════════════════════════════════════════════════════════════════════ */

/* Yellow icons (#ffeb3b) are invisible on cream — re-tone to deep amber */
.modal-content.glass-panel .icon-yellow {
  color: #fbbf24 !important;
}
[data-theme="light"] .modal-content.glass-panel .icon-yellow,
[data-theme="light"] .modal-content.glass-panel .lucide-shield,
[data-theme="light"] .modal-content.glass-panel .lucide-shield-check,
[data-theme="light"] .modal-content.glass-panel .lucide-file-text.icon-yellow,
[data-theme="light"] .modal-content.glass-panel .lucide-server.icon-yellow {
  color: #b45309 !important;
}

/* Section header inside a review-section (FileText/Server/ShieldCheck + h3) */
.modal-content.glass-panel .section-top {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  margin-bottom: 18px !important;
  padding-bottom: 14px !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
}
.modal-content.glass-panel .section-top h3 {
  margin: 0 !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  color: #fff !important;
}
[data-theme="light"] .modal-content.glass-panel .section-top {
  border-bottom-color: rgba(217, 119, 6, 0.20) !important;
}
[data-theme="light"] .modal-content.glass-panel .section-top h3 {
  color: #1a1410 !important;
}

/* data-item uses <span> not <p>, plus .text-green needs amber treatment */
.modal-content.glass-panel .data-item span {
  font-size: 14px !important;
  font-weight: 500 !important;
  color: #fff !important;
}
.modal-content.glass-panel .data-item .text-green {
  color: #34d399 !important;
  font-weight: 600 !important;
}
[data-theme="light"] .modal-content.glass-panel .data-item span {
  color: #1a1410 !important;
}
[data-theme="light"] .modal-content.glass-panel .data-item .text-green {
  color: #15803d !important;
}

/* scope-row internals — service category badge, name, metric count */
.modal-content.glass-panel .scope-row .badge {
  background: rgba(251, 191, 36, 0.16) !important;
  color: #fde047 !important;
  border: 1px solid rgba(251, 191, 36, 0.30) !important;
  padding: 4px 10px !important;
  border-radius: 6px !important;
  font-size: 10px !important;
  font-weight: 700 !important;
  letter-spacing: 0.06em !important;
  text-transform: uppercase !important;
}
.modal-content.glass-panel .scope-row .sv-name {
  font-size: 14px !important;
  font-weight: 600 !important;
  color: #fff !important;
}
.modal-content.glass-panel .scope-row .metric-count {
  font-size: 12px !important;
  color: #fbbf24 !important;
  font-weight: 600 !important;
}
[data-theme="light"] .modal-content.glass-panel .scope-row .badge {
  background: rgba(217, 119, 6, 0.16) !important;
  color: #92400e !important;
  border-color: rgba(217, 119, 6, 0.32) !important;
}
[data-theme="light"] .modal-content.glass-panel .scope-row .sv-name {
  color: #1a1410 !important;
}
[data-theme="light"] .modal-content.glass-panel .scope-row .metric-count {
  color: #b45309 !important;
}

/* Compliance + security tag chips (already styled above but tighten) */
.modal-content.glass-panel .compl-tag {
  background: rgba(52, 211, 153, 0.10) !important;
  color: #34d399 !important;
  border: 1px solid rgba(52, 211, 153, 0.22) !important;
}
[data-theme="light"] .modal-content.glass-panel .compl-tag {
  background: rgba(34, 134, 58, 0.12) !important;
  color: #15803d !important;
  border-color: rgba(34, 134, 58, 0.30) !important;
}
.modal-content.glass-panel .empty-msg {
  color: rgba(255, 255, 255, 0.5) !important;
  font-style: italic !important;
}
[data-theme="light"] .modal-content.glass-panel .empty-msg {
  color: #8a6d4a !important;
}

/* generation-warning: uses .warn-icon + .warn-text in SlaReview */
.modal-content.glass-panel .warn-icon { color: #fbbf24 !important; }
.modal-content.glass-panel .warn-text h4 {
  color: #fde047 !important; margin: 0 0 4px !important; font-size: 15px !important;
}
.modal-content.glass-panel .warn-text p {
  color: rgba(255, 255, 255, 0.78) !important; margin: 0 !important; font-size: 13px !important;
}
[data-theme="light"] .modal-content.glass-panel .warn-icon { color: #b45309 !important; }
[data-theme="light"] .modal-content.glass-panel .warn-text h4 { color: #92400e !important; }
[data-theme="light"] .modal-content.glass-panel .warn-text p { color: #6b5840 !important; }

/* ════════════════════════════════════════════════════════════════════════
   MONITORING STEP — tool-tags-container
   ════════════════════════════════════════════════════════════════════════ */
.modal-content.glass-panel .tool-tags-container {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
  background: transparent !important;
  padding: 0 !important;
}
.modal-content.glass-panel .help-text {
  font-size: 11px !important;
  color: rgba(255, 255, 255, 0.45) !important;
  margin-left: 6px !important;
  font-weight: 400 !important;
  text-transform: none !important;
  letter-spacing: normal !important;
}
[data-theme="light"] .modal-content.glass-panel .help-text {
  color: #8a6d4a !important;
}

/* ════════════════════════════════════════════════════════════════════════
   GLOBAL FORM-SECTION TEXT — never let it stay white on cream
   ════════════════════════════════════════════════════════════════════════ */
[data-theme="light"] .modal-content.glass-panel .form-section,
[data-theme="light"] .modal-content.glass-panel .form-section p,
[data-theme="light"] .modal-content.glass-panel .form-section span:not(.required):not(.error-msg):not(.badge):not(.sv-name):not(.metric-count):not(.help-text),
[data-theme="light"] .modal-content.glass-panel .form-section h2,
[data-theme="light"] .modal-content.glass-panel .form-section h3,
[data-theme="light"] .modal-content.glass-panel .form-section h4 {
  color: #1a1410 !important;
}

/* Header descriptive paragraph under each step heading */
[data-theme="light"] .modal-content.glass-panel .step-header h2 {
  color: #1a1410 !important;
  text-shadow: none !important;
}
[data-theme="light"] .modal-content.glass-panel .step-header p {
  color: #6b5840 !important;
}

/* ════════════════════════════════════════════════════════════════════════
   LEGAL TERMS STEP — ultra-modern card stack with subtle entry animation
   ════════════════════════════════════════════════════════════════════════ */

/* The whole step's form-grid acts as a flat container; we make each input-group
   into a discrete "clause card" with a gold left-rail + animated entrance. */
.modal-content.glass-panel:has(.lucide-scale) .form-grid,
.modal-content.glass-panel .step-container .form-grid {
  /* Layout already handled — make sure padding doesn't double-up */
}

/* Detect Legal step by structural pattern: form-grid containing 3+ textareas */
.modal-content.glass-panel .form-grid > .input-group:has(textarea.premium-textarea) {
  position: relative;
  padding: 18px 20px 18px 26px;
  background: linear-gradient(135deg,
      rgba(251, 191, 36, 0.05) 0%,
      rgba(255, 255, 255, 0.02) 35%) !important;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  transition: border-color 0.25s, background 0.25s, box-shadow 0.25s;
  animation: clauseSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.modal-content.glass-panel .form-grid > .input-group:has(textarea.premium-textarea)::before {
  content: '';
  position: absolute;
  top: 16px;
  bottom: 16px;
  left: 0;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, #fbbf24, #d97706);
  opacity: 0.65;
  transition: opacity 0.25s, box-shadow 0.25s;
}
.modal-content.glass-panel .form-grid > .input-group:has(textarea.premium-textarea):focus-within {
  border-color: rgba(251, 191, 36, 0.35);
  background: linear-gradient(135deg,
      rgba(251, 191, 36, 0.10) 0%,
      rgba(255, 255, 255, 0.04) 40%) !important;
  box-shadow: 0 6px 20px rgba(245, 158, 11, 0.15);
}
.modal-content.glass-panel .form-grid > .input-group:has(textarea.premium-textarea):focus-within::before {
  opacity: 1;
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.55);
}

/* Stagger the cards */
.modal-content.glass-panel .form-grid > .input-group:has(textarea.premium-textarea):nth-of-type(1) { animation-delay: 0.05s; }
.modal-content.glass-panel .form-grid > .input-group:has(textarea.premium-textarea):nth-of-type(2) { animation-delay: 0.12s; }
.modal-content.glass-panel .form-grid > .input-group:has(textarea.premium-textarea):nth-of-type(3) { animation-delay: 0.19s; }
.modal-content.glass-panel .form-grid > .input-group:has(textarea.premium-textarea):nth-of-type(4) { animation-delay: 0.26s; }

@keyframes clauseSlideIn {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Inside input-row in Legal step, each clause is split into two columns */
.modal-content.glass-panel .form-grid .input-row > .input-group:has(textarea.premium-textarea) {
  /* Inherits the card treatment from the rule above */
}

/* Light theme — clause cards on cream */
[data-theme="light"] .modal-content.glass-panel .form-grid > .input-group:has(textarea.premium-textarea) {
  background: linear-gradient(135deg,
      rgba(245, 158, 11, 0.10) 0%,
      rgba(255, 250, 240, 0.65) 35%) !important;
  border-color: rgba(217, 119, 6, 0.18) !important;
  box-shadow: 0 4px 16px rgba(180, 83, 9, 0.06);
}
[data-theme="light"] .modal-content.glass-panel .form-grid > .input-group:has(textarea.premium-textarea)::before {
  background: linear-gradient(180deg, #d97706, #b45309);
}
[data-theme="light"] .modal-content.glass-panel .form-grid > .input-group:has(textarea.premium-textarea):focus-within {
  border-color: rgba(217, 119, 6, 0.45) !important;
  background: linear-gradient(135deg,
      rgba(245, 158, 11, 0.16) 0%,
      rgba(255, 250, 240, 0.85) 40%) !important;
  box-shadow: 0 6px 22px rgba(217, 119, 6, 0.22);
}

/* The wrapping form-grid in Legal had its own dark background — kill it on light */
[data-theme="light"] .modal-content.glass-panel .form-grid {
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
}

/* Force Majeure and Intellectual Property sit inside an .input-row, so they
   are grandchildren of .form-grid (not direct children). Extend the clause-card
   treatment to those too. */
.modal-content.glass-panel .form-grid .input-row > .input-group:has(textarea.premium-textarea) {
  position: relative;
  padding: 18px 20px 18px 26px;
  background: linear-gradient(135deg,
      rgba(251, 191, 36, 0.05) 0%,
      rgba(255, 255, 255, 0.02) 35%) !important;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  transition: border-color 0.25s, background 0.25s, box-shadow 0.25s;
  animation: clauseSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 0.28s;
}
.modal-content.glass-panel .form-grid .input-row > .input-group:has(textarea.premium-textarea):nth-of-type(2) {
  animation-delay: 0.34s;
}
.modal-content.glass-panel .form-grid .input-row > .input-group:has(textarea.premium-textarea)::before {
  content: '';
  position: absolute;
  top: 16px;
  bottom: 16px;
  left: 0;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, #fbbf24, #d97706);
  opacity: 0.65;
  transition: opacity 0.25s, box-shadow 0.25s;
}
.modal-content.glass-panel .form-grid .input-row > .input-group:has(textarea.premium-textarea):focus-within {
  border-color: rgba(251, 191, 36, 0.35);
  background: linear-gradient(135deg,
      rgba(251, 191, 36, 0.10) 0%,
      rgba(255, 255, 255, 0.04) 40%) !important;
  box-shadow: 0 6px 20px rgba(245, 158, 11, 0.15);
}
.modal-content.glass-panel .form-grid .input-row > .input-group:has(textarea.premium-textarea):focus-within::before {
  opacity: 1;
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.55);
}

[data-theme="light"] .modal-content.glass-panel .form-grid .input-row > .input-group:has(textarea.premium-textarea) {
  background: linear-gradient(135deg,
      rgba(245, 158, 11, 0.10) 0%,
      rgba(255, 250, 240, 0.65) 35%) !important;
  border-color: rgba(217, 119, 6, 0.18) !important;
  box-shadow: 0 4px 16px rgba(180, 83, 9, 0.06);
}
[data-theme="light"] .modal-content.glass-panel .form-grid .input-row > .input-group:has(textarea.premium-textarea)::before {
  background: linear-gradient(180deg, #d97706, #b45309);
}
[data-theme="light"] .modal-content.glass-panel .form-grid .input-row > .input-group:has(textarea.premium-textarea):focus-within {
  border-color: rgba(217, 119, 6, 0.45) !important;
  background: linear-gradient(135deg,
      rgba(245, 158, 11, 0.16) 0%,
      rgba(255, 250, 240, 0.85) 40%) !important;
  box-shadow: 0 6px 22px rgba(217, 119, 6, 0.22);
}

/* ════════════════════════════════════════════════════════════════════════
   REVIEW STEP — kill the centered header (uses .step-header { text-align:center }
   in SlaReview.vue scoped style). Force left-align to match every other step.
   ════════════════════════════════════════════════════════════════════════ */
.modal-content.glass-panel .step-header,
.modal-content.glass-panel .step-container .step-header {
  text-align: left !important;
}
.modal-content.glass-panel .step-header h2 {
  text-shadow: none !important;
  letter-spacing: -0.5px !important;
}

/* ════════════════════════════════════════════════════════════════════════
   STEP 3 SERVICES TABLE — keep the trash/delete button inside the card
   ════════════════════════════════════════════════════════════════════════ */

/* Pad the table wrapper so the action column never sits flush against the
   card's right edge. Also widen the ACTION column header text. */
.modal-content.glass-panel .premium-table-wrapper {
  padding: 0 !important;
}
.modal-content.glass-panel .premium-table th:last-child,
.modal-content.glass-panel .premium-table td:last-child {
  width: 56px !important;
  text-align: center !important;
  padding-right: 12px !important;
  padding-left: 4px !important;
}
.modal-content.glass-panel .premium-table th:last-child {
  white-space: nowrap !important;
  letter-spacing: 0.05em !important;
}

/* Delete/trash icon buttons inside table rows — confine and centre them */
.modal-content.glass-panel .premium-table .delete-btn,
.modal-content.glass-panel .premium-table .icon-btn,
.modal-content.glass-panel .premium-table .trash-btn,
.modal-content.glass-panel .premium-table button[aria-label*="elete" i],
.modal-content.glass-panel .premium-table button[title*="elete" i] {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 32px !important;
  height: 32px !important;
  padding: 0 !important;
  margin: 0 auto !important;
  border-radius: 8px !important;
  background: rgba(239, 68, 68, 0.10) !important;
  border: 1px solid rgba(239, 68, 68, 0.20) !important;
  color: #f87171 !important;
  cursor: pointer !important;
  transition: background 0.2s, border-color 0.2s, transform 0.15s !important;
}
.modal-content.glass-panel .premium-table .delete-btn:hover,
.modal-content.glass-panel .premium-table .icon-btn:hover,
.modal-content.glass-panel .premium-table .trash-btn:hover {
  background: rgba(239, 68, 68, 0.20) !important;
  border-color: rgba(239, 68, 68, 0.45) !important;
  transform: scale(1.05) !important;
}

[data-theme="light"] .modal-content.glass-panel .premium-table .delete-btn,
[data-theme="light"] .modal-content.glass-panel .premium-table .icon-btn,
[data-theme="light"] .modal-content.glass-panel .premium-table .trash-btn {
  background: rgba(185, 28, 28, 0.10) !important;
  border-color: rgba(185, 28, 28, 0.25) !important;
  color: #b91c1c !important;
}
[data-theme="light"] .modal-content.glass-panel .premium-table .delete-btn:hover,
[data-theme="light"] .modal-content.glass-panel .premium-table .icon-btn:hover,
[data-theme="light"] .modal-content.glass-panel .premium-table .trash-btn:hover {
  background: rgba(185, 28, 28, 0.20) !important;
  border-color: rgba(185, 28, 28, 0.50) !important;
}

/* ════════════════════════════════════════════════════════════════════════
   ALERT / ERROR BOX (Step 4 missing services etc.)
   ════════════════════════════════════════════════════════════════════════ */
.modal-content.glass-panel .alert-box {
  background: rgba(239, 68, 68, 0.10) !important;
  border: 1px solid rgba(239, 68, 68, 0.30) !important;
  border-left: 4px solid #ef4444 !important;
  border-radius: 10px !important;
  padding: 12px 16px !important;
  color: #fca5a5 !important;
}
[data-theme="light"] .modal-content.glass-panel .alert-box {
  background: rgba(185, 28, 28, 0.10) !important;
  border-color: rgba(185, 28, 28, 0.30) !important;
  border-left-color: #b91c1c !important;
  color: #7f1d1d !important;
}

/* ════════════════════════════════════════════════════════════════════════
   SlaSelect dropdown TRIGGER (used inside the modal as form fields).
   The dropdown POPUP itself is teleported to body — overrides for that
   live in SlaSelect.vue directly.
   ════════════════════════════════════════════════════════════════════════ */
[data-theme="light"] .modal-content.glass-panel .sla-select-trigger {
  background: rgba(255, 250, 240, 0.92) !important;
  border: 1px solid rgba(217, 119, 6, 0.22) !important;
  color: #1a1410 !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55) !important;
}
[data-theme="light"] .modal-content.glass-panel .sla-select-trigger:hover {
  border-color: rgba(217, 119, 6, 0.40) !important;
}
[data-theme="light"] .modal-content.glass-panel .sla-select-trigger.is-open {
  border-color: #d97706 !important;
  background: #fffaf0 !important;
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.18) !important;
}
[data-theme="light"] .modal-content.glass-panel .sla-select-trigger .selected-text {
  color: #1a1410 !important;
}
[data-theme="light"] .modal-content.glass-panel .sla-select-trigger .is-placeholder {
  color: rgba(120, 53, 15, 0.45) !important;
}
[data-theme="light"] .modal-content.glass-panel .sla-select-trigger .chevron {
  color: #92400e !important;
}
[data-theme="light"] .modal-content.glass-panel .table-select .sla-select-trigger {
  background: rgba(255, 250, 240, 0.85) !important;
  color: #1a1410 !important;
}
</style>

<style scoped>
/* ────────────────────────────────────────────────────────────────────────
   ULTRA-MODERN GLASS MODAL — Edit SLA Wizard
   Brand palette: warm orange / amber / gold. No blue, no purple.
   ──────────────────────────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(22px) saturate(160%);
  -webkit-backdrop-filter: blur(22px) saturate(160%);
  z-index: 2000;
  display: flex; align-items: center; justify-content: center;
  perspective: 1400px;
}

.modal-content.glass-panel {
  width: 780px; max-width: 96vw; height: 88vh; max-height: 88vh;
  display: flex; flex-direction: column;
  background: linear-gradient(135deg, rgba(30, 30, 33, 0.72) 0%, rgba(22, 22, 26, 0.78) 100%);
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  box-shadow:
    0 28px 60px rgba(0, 0, 0, 0.55),
    0 8px 20px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  overflow: hidden;
  position: relative;
  isolation: isolate;
}

/* Subtle ambient — only a faint top corner glow, no full-panel wash */
.ambient-aura {
  position: absolute;
  top: -120px; left: -120px;
  width: 320px; height: 320px;
  background: radial-gradient(closest-side, rgba(251, 191, 36, 0.16), transparent 70%);
  filter: blur(20px);
  z-index: -1;
  animation: auraDrift 14s ease-in-out infinite alternate;
  pointer-events: none;
}
@keyframes auraDrift {
  0%   { transform: translate(0, 0); opacity: 0.85; }
  100% { transform: translate(40px, 40px); opacity: 1; }
}

/* Top hairline gold accent */
.modal-content.glass-panel::before {
  content: '';
  position: absolute; top: 0; left: 18%; right: 18%; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.45), transparent);
  z-index: 1; pointer-events: none;
}

/* Header */
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 24px 32px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, transparent 100%);
  position: relative; z-index: 2;
}
.modal-header h2 {
  font-size: 22px; font-weight: 600; margin: 0; letter-spacing: -0.5px;
  background: linear-gradient(120deg, #fef3c7 0%, #fbbf24 55%, #f59e0b 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.task-code {
  font-size: 11px; color: #fbbf24; font-family: 'SF Mono', 'Monaco', monospace;
  margin: 6px 0 0; letter-spacing: 0.05em; text-transform: uppercase; font-weight: 600;
}
.close-btn {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px; width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  color: rgba(255, 255, 255, 0.65); cursor: pointer;
}
.close-btn:hover {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.32);
  color: #fbbf24;
}

/* Save Draft ghost button */
.btn-ghost {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: 10px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.22);
  color: #fbbf24; font-size: 12px; font-weight: 600;
  cursor: pointer; transition: background 0.25s, border-color 0.25s, color 0.25s;
}
.btn-ghost:hover {
  background: rgba(245, 158, 11, 0.16);
  border-color: rgba(245, 158, 11, 0.45);
  color: #fde047;
}

/* Progress */
.progress-container { padding: 20px 32px 16px; position: relative; z-index: 2; }
.step-indicators { display: flex; gap: 8px; justify-content: space-between; margin-bottom: 12px; }
.step-dot {
  display: flex; align-items: center; gap: 6px; cursor: pointer;
  color: rgba(255, 255, 255, 0.28);
  flex: 1; justify-content: center;
  padding: 6px 8px; border-radius: 999px;
  border: 1px solid transparent;
}
.dot-icon-wrap {
  width: 24px; height: 24px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: background 0.25s, border-color 0.25s, box-shadow 0.25s;
}
.step-dot.active {
  color: #fde68a; flex: 1.5;
  background: rgba(245, 158, 11, 0.10);
  border: 1px solid rgba(245, 158, 11, 0.28);
  box-shadow:
    0 6px 18px rgba(245, 158, 11, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.10);
}
.step-dot.active .dot-icon-wrap {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border-color: rgba(255, 255, 255, 0.30);
  color: #fff;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.18), 0 4px 12px rgba(217, 119, 6, 0.45);
}
.step-dot.completed { color: #fbbf24; }
.step-dot.completed .dot-icon-wrap {
  background: rgba(245, 158, 11, 0.18);
  border-color: rgba(245, 158, 11, 0.38);
  color: #fbbf24;
}
.step-label {
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
  white-space: nowrap; overflow: hidden;
}
.progress-track {
  height: 4px; background: rgba(255, 255, 255, 0.06);
  border-radius: 999px; overflow: hidden; margin-top: 8px;
  position: relative;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 50%, #fde047 100%);
  background-size: 200% 100%;
  border-radius: 999px;
  box-shadow: 0 0 14px rgba(251, 191, 36, 0.55);
  animation: progressShimmer 4s linear infinite;
}
@keyframes progressShimmer {
  0%   { background-position: 0% 0; }
  100% { background-position: 200% 0; }
}

/* Body Area */
.modal-body {
  flex: 1; overflow-x: hidden; overflow-y: auto;
  padding: 24px 32px; position: relative; z-index: 2;
}

/* Footer */
.modal-footer {
  display: flex; justify-content: space-between; align-items: center;
  padding: 20px 32px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.30), transparent);
  position: relative; z-index: 2;
}
.btn-text {
  display: inline-flex; align-items: center; gap: 8px;
  background: none; border: none;
  color: rgba(255, 255, 255, 0.55);
  font-size: 14px; font-weight: 600; cursor: pointer;
}
.btn-text:hover { color: #fff; }
.footer-right { display: flex; gap: 12px; }

.btn-pill {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 12px 28px; border-radius: 999px;
  font-size: 14px; font-weight: 700;
  border: none; cursor: pointer;
  transition: background 0.25s, box-shadow 0.25s, color 0.25s;
}
.btn-pill.primary {
  background: linear-gradient(135deg, #fde047 0%, #fbbf24 50%, #f59e0b 100%);
  color: #1c1410;
  box-shadow:
    0 6px 18px rgba(245, 158, 11, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.5),
    inset 0 -1px 0 rgba(120, 53, 15, 0.25);
}
.btn-pill.primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #fef08a 0%, #fde047 50%, #fbbf24 100%);
  box-shadow:
    0 10px 26px rgba(245, 158, 11, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
}
.btn-pill.primary:disabled { opacity: 0.5; cursor: not-allowed; }

/* Step slide transitions (kept for nested content) */
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.4s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.slide-left-enter-active, .slide-left-leave-active,
.slide-right-enter-active, .slide-right-leave-active {
  transition: all 0.55s cubic-bezier(0.16, 1, 0.3, 1);
  position: absolute; width: calc(100% - 64px);
}
.slide-left-enter-from { opacity: 0; transform: translateX(60px) scale(0.96); }
.slide-left-leave-to   { opacity: 0; transform: translateX(-60px) scale(0.96); }
.slide-right-enter-from { opacity: 0; transform: translateX(-60px) scale(0.96); }
.slide-right-leave-to   { opacity: 0; transform: translateX(60px) scale(0.96); }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Scrollbar */
.modal-body::-webkit-scrollbar { width: 6px; }
.modal-body::-webkit-scrollbar-thumb { background: rgba(251, 191, 36, 0.28); border-radius: 3px; }
.modal-body::-webkit-scrollbar-thumb:hover { background: rgba(251, 191, 36, 0.45); }

/* =========================================================================
   NESTED STEP COMPONENT OVERRIDES (dark theme baseline)
========================================================================= */
:deep(.step-header h2) { font-size: 24px !important; font-weight: 600 !important; color: #fff !important; margin-bottom: 8px !important; letter-spacing: -0.5px !important; }
:deep(.step-header p) { font-size: 14px !important; color: rgba(255, 255, 255, 0.6) !important; margin-bottom: 32px !important; }

:deep(.form-section) {
    background: rgba(255, 255, 255, 0.02) !important;
    border: 1px solid rgba(255, 255, 255, 0.05) !important;
    border-radius: 16px !important;
    padding: 24px !important;
    margin-bottom: 24px !important;
    backdrop-filter: blur(20px) !important;
}
:deep(.section-title) {
    font-size: 12px !important; font-weight: 700 !important; color: #fbbf24 !important;
    text-transform: uppercase !important; letter-spacing: 1px !important; margin-bottom: 20px !important;
    border-bottom: 1px solid rgba(245, 158, 11, 0.18) !important; padding-bottom: 12px !important;
}
/* Brand: amber, not blue */
:deep(.text-yellow) { color: #fbbf24 !important; }

:deep(.input-group label) {
    font-size: 13px !important; font-weight: 500 !important;
    color: rgba(255, 255, 255, 0.72) !important; text-transform: none !important;
    letter-spacing: normal !important; margin-bottom: 8px !important; display: block !important;
}

:deep(input.premium-input),
:deep(textarea.premium-textarea),
:deep(input.table-input),
:deep(input[type="text"]),
:deep(input[type="number"]),
:deep(input[type="email"]),
:deep(select),
:deep(textarea),
:deep(.design-select .select-selected) {
    background: rgba(255, 255, 255, 0.04) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: 10px !important;
    padding: 10px 14px !important;
    color: #fff !important;
    font-size: 14px !important;
    font-weight: 400 !important;
    transition: background 0.25s, border-color 0.25s, box-shadow 0.25s !important;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04) !important;
    font-family: 'Inter', sans-serif !important;
    height: auto !important;
}

:deep(select option) { background: #1a1a1c !important; color: #fff !important; }
:deep(.tag) {
    background: rgba(245, 158, 11, 0.10) !important;
    color: #fbbf24 !important;
    border: 1px solid rgba(245, 158, 11, 0.22) !important;
    border-radius: 6px !important;
    padding: 4px 8px !important;
}
:deep(.checkbox-label) { color: rgba(255, 255, 255, 0.8) !important; }

:deep(input:focus), :deep(textarea:focus), :deep(select:focus), :deep(.design-select .select-selected:focus) {
    border-color: rgba(245, 158, 11, 0.55) !important;
    background: rgba(255, 255, 255, 0.06) !important;
    outline: none !important;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.18) !important;
}

:deep(.input-row) { display: flex !important; gap: 16px !important; width: 100% !important; margin-bottom: 0 !important; }
:deep(.input-group) { flex: 1 !important; margin-bottom: 16px !important; }
:deep(.error-label) { color: #f87171 !important; }
:deep(.error-msg) { color: #f87171 !important; font-size: 11px !important; text-transform: none !important; font-weight: 500 !important; }
:deep(.required) { color: #f87171 !important; }

:deep(.table-wrapper), :deep(.services-table) { border-color: rgba(255, 255, 255, 0.06) !important; background: transparent !important; border-radius: 10px !important; overflow: hidden !important; }
:deep(.services-table th) { background: rgba(245, 158, 11, 0.06) !important; color: #fbbf24 !important; font-weight: 600 !important; border-bottom: 1px solid rgba(245, 158, 11, 0.16) !important; padding: 10px 14px !important; font-size: 12px !important; }
:deep(.services-table td) { border-color: rgba(255, 255, 255, 0.04) !important; padding: 10px 14px !important; background: transparent !important; }
:deep(.services-table td input.table-input) { width: 100% !important; background: rgba(255, 255, 255, 0.04) !important; border: 1px solid transparent !important; padding: 8px 12px !important; }
:deep(.services-table td input.table-input:focus) { border: 1px solid rgba(245, 158, 11, 0.45) !important; background: rgba(255, 255, 255, 0.06) !important; }
:deep(.btn-glass) { background: rgba(245, 158, 11, 0.10) !important; border: 1px solid rgba(245, 158, 11, 0.22) !important; border-radius: 999px !important; color: #fbbf24 !important; padding: 8px 16px !important; font-weight: 600 !important; transition: background 0.25s, border-color 0.25s !important; }
:deep(.btn-glass:hover) { background: rgba(245, 158, 11, 0.18) !important; border-color: rgba(245, 158, 11, 0.40) !important; }

/* SlaReview specifics */
:deep(.review-card) { background: rgba(255, 255, 255, 0.02) !important; border: 1px solid rgba(255, 255, 255, 0.06) !important; border-radius: 12px !important; padding: 20px !important; }
:deep(.review-grid .detail-item label) { color: rgba(255, 255, 255, 0.45) !important; font-size: 11px !important; text-transform: uppercase !important; }
:deep(.review-grid .detail-item p) { color: #f5f5f7 !important; font-size: 14px !important; }

:deep(.step-container) { max-width: 100% !important; padding: 0 !important; }

/* ════════════════════════════════════════════════════════════════════════
   LIGHT THEME OVERRIDES — frosted cream glass matching milestone modal
   ════════════════════════════════════════════════════════════════════════ */
[data-theme="light"] .modal-overlay {
  background: rgba(26, 20, 16, 0.34);
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
}
[data-theme="light"] .modal-content.glass-panel {
  background: rgba(255, 250, 240, 0.78);
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  border: 1px solid rgba(217, 119, 6, 0.18);
  box-shadow:
    0 30px 60px rgba(40, 25, 10, 0.22),
    0 8px 20px rgba(40, 25, 10, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
  color: var(--text-primary, #1a1410);
}
/* Hide the heavy gold aura entirely in light mode — keep modal calm */
[data-theme="light"] .ambient-aura { display: none; }
[data-theme="light"] .modal-content.glass-panel::before {
  background: linear-gradient(90deg, transparent, rgba(217, 119, 6, 0.45), transparent);
}

[data-theme="light"] .modal-header {
  border-bottom-color: rgba(40, 25, 10, 0.10);
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.30) 0%, transparent 100%);
}
[data-theme="light"] .modal-header h2 {
  background: linear-gradient(120deg, #92400e 0%, #d97706 60%, #b45309 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
[data-theme="light"] .task-code { color: #b45309; }

[data-theme="light"] .close-btn {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(217, 119, 6, 0.20);
  color: #6b5840;
}
[data-theme="light"] .close-btn:hover {
  background: rgba(217, 119, 6, 0.14);
  border-color: rgba(217, 119, 6, 0.40);
  color: #92400e;
}

[data-theme="light"] .btn-ghost {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(217, 119, 6, 0.30);
  color: #92400e;
}
[data-theme="light"] .btn-ghost:hover {
  background: rgba(245, 158, 11, 0.22);
  border-color: rgba(217, 119, 6, 0.55);
  color: #78350f;
}

/* Step dots — light theme */
[data-theme="light"] .step-dot { color: rgba(120, 53, 15, 0.45); }
[data-theme="light"] .dot-icon-wrap {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(217, 119, 6, 0.18);
  color: #92400e;
}
[data-theme="light"] .step-dot.active {
  color: #78350f;
  background: rgba(245, 158, 11, 0.16);
  border-color: rgba(217, 119, 6, 0.35);
  box-shadow:
    0 6px 18px rgba(217, 119, 6, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
[data-theme="light"] .step-dot.active .dot-icon-wrap {
  background: linear-gradient(135deg, #d97706, #b45309);
  border-color: rgba(255, 255, 255, 0.65);
  color: #fffaf0;
  box-shadow:
    0 0 0 3px rgba(217, 119, 6, 0.18),
    0 4px 12px rgba(180, 83, 9, 0.45);
}
[data-theme="light"] .step-dot.completed { color: #b45309; }
[data-theme="light"] .step-dot.completed .dot-icon-wrap {
  background: rgba(245, 158, 11, 0.22);
  border-color: rgba(217, 119, 6, 0.38);
  color: #b45309;
}

[data-theme="light"] .progress-track { background: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .progress-fill {
  background: linear-gradient(90deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%);
  box-shadow: 0 0 12px rgba(217, 119, 6, 0.55);
}

[data-theme="light"] .modal-footer {
  background: linear-gradient(0deg, rgba(255, 250, 240, 0.35), transparent);
  border-top-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .btn-text { color: #6b5840; }
[data-theme="light"] .btn-text:hover { color: #92400e; }

[data-theme="light"] .btn-pill.primary {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
  color: #fffaf0;
  box-shadow:
    0 6px 18px rgba(217, 119, 6, 0.42),
    inset 0 1px 0 rgba(255, 255, 255, 0.40);
}
[data-theme="light"] .btn-pill.primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #c2410c 0%, #92400e 100%);
  box-shadow:
    0 10px 24px rgba(217, 119, 6, 0.50),
    inset 0 1px 0 rgba(255, 255, 255, 0.50);
}

/* Nested step components — light theme */
[data-theme="light"] :deep(.step-header h2) { color: #1a1410 !important; }
[data-theme="light"] :deep(.step-header p) { color: #6b5840 !important; }

[data-theme="light"] :deep(.form-section) {
  background: rgba(255, 250, 240, 0.55) !important;
  border: 1px solid rgba(217, 119, 6, 0.18) !important;
}
[data-theme="light"] :deep(.section-title) {
  color: #b45309 !important;
  border-bottom-color: rgba(217, 119, 6, 0.22) !important;
}
[data-theme="light"] :deep(.text-yellow) { color: #b45309 !important; }

[data-theme="light"] :deep(.input-group label) { color: #92400e !important; }

[data-theme="light"] :deep(input.premium-input),
[data-theme="light"] :deep(textarea.premium-textarea),
[data-theme="light"] :deep(input.table-input),
[data-theme="light"] :deep(input[type="text"]),
[data-theme="light"] :deep(input[type="number"]),
[data-theme="light"] :deep(input[type="email"]),
[data-theme="light"] :deep(select),
[data-theme="light"] :deep(textarea),
[data-theme="light"] :deep(.design-select .select-selected) {
    background: rgba(255, 250, 240, 0.62) !important;
    border: 1px solid rgba(217, 119, 6, 0.22) !important;
    color: #1a1410 !important;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5) !important;
}
[data-theme="light"] :deep(input::placeholder),
[data-theme="light"] :deep(textarea::placeholder) {
    color: rgba(120, 53, 15, 0.5) !important;
}
[data-theme="light"] :deep(select option) { background: #fffaf0 !important; color: #1a1410 !important; }

[data-theme="light"] :deep(input:focus),
[data-theme="light"] :deep(textarea:focus),
[data-theme="light"] :deep(select:focus),
[data-theme="light"] :deep(.design-select .select-selected:focus) {
  border-color: rgba(217, 119, 6, 0.55) !important;
  background: rgba(255, 246, 226, 0.92) !important;
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.18) !important;
}

[data-theme="light"] :deep(.tag) {
  background: rgba(245, 158, 11, 0.15) !important;
  color: #92400e !important;
  border-color: rgba(217, 119, 6, 0.30) !important;
}
[data-theme="light"] :deep(.checkbox-label) { color: #1a1410 !important; }

[data-theme="light"] :deep(.error-label),
[data-theme="light"] :deep(.error-msg),
[data-theme="light"] :deep(.required) { color: #b91c1c !important; }

[data-theme="light"] :deep(.services-table th) {
  background: rgba(245, 158, 11, 0.10) !important;
  color: #92400e !important;
  border-bottom-color: rgba(217, 119, 6, 0.22) !important;
}
[data-theme="light"] :deep(.services-table td) { border-color: rgba(217, 119, 6, 0.10) !important; }
[data-theme="light"] :deep(.services-table td input.table-input) {
  background: rgba(255, 250, 240, 0.62) !important;
}
[data-theme="light"] :deep(.btn-glass) {
  background: rgba(245, 158, 11, 0.14) !important;
  border-color: rgba(217, 119, 6, 0.30) !important;
  color: #92400e !important;
}
[data-theme="light"] :deep(.btn-glass:hover) {
  background: rgba(245, 158, 11, 0.22) !important;
  border-color: rgba(217, 119, 6, 0.50) !important;
}

[data-theme="light"] :deep(.review-card) {
  background: rgba(255, 250, 240, 0.55) !important;
  border-color: rgba(217, 119, 6, 0.18) !important;
}
[data-theme="light"] :deep(.review-grid .detail-item label) { color: #92400e !important; }
[data-theme="light"] :deep(.review-grid .detail-item p) { color: #1a1410 !important; }

[data-theme="light"] .modal-body::-webkit-scrollbar-thumb { background: rgba(217, 119, 6, 0.30); }
[data-theme="light"] .modal-body::-webkit-scrollbar-thumb:hover { background: rgba(217, 119, 6, 0.50); }
</style>
