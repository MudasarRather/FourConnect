<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal-content glass-panel">

          <!-- Header -->
          <div class="modal-header">
            <div class="header-text">
              <h2>{{ form.status === 'Pending' ? 'Review & Approve SLA' : form.status === 'Approved' ? 'Edit Approved SLA' : 'Edit SLA Draft' }}</h2>
              <p class="task-code">{{ form.contract_reference || 'SLA-DRAFT' }}</p>
            </div>
            <div style="display:flex;align-items:center;gap:12px;">
              <button v-if="form.status !== 'Pending' && form.status !== 'Approved'" class="btn-ghost sm" :disabled="isSubmitting" @click="saveDraft('Draft')">
                <Loader2 v-if="isSubmitting" :size="14" class="spin" />
                <Save v-else :size="14" />
                <span>Save Draft</span>
              </button>
              <button class="close-btn" @click="close"><X :size="20" /></button>
            </div>
          </div>

          <!-- Progress Steps -->
          <div class="progress-container">
            <div class="step-indicators slim">
              <div
                v-for="(step, index) in steps"
                :key="index"
                class="step-dot"
                :class="{ active: currentStep === index, completed: currentStep > index }"
                @click="goToStep(index)"
                :title="step.label"
              >
                <Check v-if="currentStep > index" :size="12" />
                <component v-else :is="step.icon" :size="14" />
                <span class="step-label" v-if="currentStep === index">{{ step.label }}</span>
              </div>
            </div>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
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
            <button v-if="currentStep > 0" class="btn-text secondary" @click="prevStep">
              <ArrowLeft :size="16" /><span>Back</span>
            </button>
            <button v-else class="btn-text secondary" @click="close">Cancel</button>
            <div class="footer-right">
              <button v-if="currentStep < steps.length - 1" class="btn-pill primary" @click="nextStep">
                <span>Continue</span><ArrowRight :size="16" />
              </button>
              <button v-else class="btn-pill primary" :disabled="isSubmitting" @click="saveDraft(form.status === 'Pending' ? 'Approved' : (form.status === 'Approved' ? 'Approved' : 'Pending'))">
                <Loader2 v-if="isSubmitting" :size="16" class="spin" />
                <span v-else-if="form.status === 'Pending'" style="display:flex;align-items:center;gap:8px;">Approve SLA <Check :size="16" /></span>
                <span v-else-if="form.status === 'Approved'" style="display:flex;align-items:center;gap:8px;">Update SLA <Check :size="16" /></span>
                <span v-else style="display:flex;align-items:center;gap:8px;">Submit Document <FileText :size="16" /></span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import axios from 'axios'
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
  services: [],
  escalations: [],
  penalties: [],
  signatories: [],
  status: 'Draft'
})

const progressPercent = computed(() => ((currentStep.value) / (steps.length - 1)) * 100)

watch(() => props.modelValue, (isOpen) => {
  if (isOpen && props.sla) {
    currentStep.value = 0
    slideDirection.value = 'slide-left'
    errors.value = {}
    const e = props.sla
    Object.assign(form, {
        id: e.id,
        project_id: e.project_id || '',
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
    isSubmitting.value = true
    try {
        const payload = { ...form, status: targetStatus }
        if (payload.start_date === '') payload.start_date = null
        if (payload.end_date === '') payload.end_date = null
        const token = props.isAdmin ? localStorage.getItem('admin_token') : localStorage.getItem('user_token')
        await axios.put(`http://localhost:8000/api/sla/${form.id}`, payload, {
            headers: { Authorization: `Bearer ${token}` }
        })
        
        let msg = "Draft updated successfully"
        if (targetStatus === 'Pending') msg = "SLA Submitted successfully"
        if (targetStatus === 'Approved') msg = "SLA Approved successfully"
        toastSuccess(msg)
        
        emit('submitted')
        close()
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
</style>

<style scoped>
/* ── Ultra-Premium Apple-Grade Design Language ── */
.modal-overlay {
  position: fixed; inset: 0; 
  background: rgba(0,0,0,0.4); 
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  z-index: 2000; display: flex; align-items: center; justify-content: center;
  perspective: 1200px;
}
.modal-content.glass-panel {
  width: 950px; max-width: 96vw; height: 90vh; max-height: 90vh; display: flex; flex-direction: column;
  background: linear-gradient(135deg, rgba(30,30,34,0.4) 0%, rgba(22,22,26,0.6) 100%);
  backdrop-filter: blur(48px);
  -webkit-backdrop-filter: blur(48px);
  border: 1px solid rgba(255,255,255,0.12); 
  border-radius: 20px;
  box-shadow: 0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1); 
  overflow: hidden;
  animation: modalEnter 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  transform-style: preserve-3d;
}

@keyframes modalEnter {
  0% { opacity: 0; transform: scale(0.95) translateY(30px) rotateX(4deg); }
  100% { opacity: 1; transform: scale(1) translateY(0) rotateX(0deg); }
}

/* Header */
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 24px 32px 20px; border-bottom: 1px solid rgba(255,255,255,0.05);
  background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%);
}
.modal-header h2 { font-size: 22px; font-weight: 600; color: #fff; margin: 0; letter-spacing: -0.5px; }
.task-code { font-size: 11px; color: #60a5fa; font-family: 'SF Mono', monospace; margin-top: 6px; letter-spacing: 0.05em; text-transform: uppercase; }
.close-btn {
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px; width: 36px; height: 36px; display: flex; align-items: center;
  justify-content: center; color: rgba(255,255,255,0.6); cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.close-btn:hover { background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3); color: #ef4444; transform: rotate(90deg) scale(1.05); }

/* Save Draft Button */
.btn-ghost {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: 10px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.7); font-size: 12px; font-weight: 600;
  cursor: pointer; transition: all 0.2s;
}
.btn-ghost:hover { background: rgba(255,255,255,0.1); color: white; border-color: rgba(255,255,255,0.2); }

/* Progress */
.progress-container { padding: 20px 32px 16px; }
.step-indicators { display: flex; gap: 8px; justify-content: space-between; margin-bottom: 12px; }
.step-dot {
  display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer;
  color: rgba(255,255,255,0.25); transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); flex: 1;
}
.step-dot:hover { color: rgba(255,255,255,0.6); transform: translateY(-2px); }
.step-dot.active { color: #fff; flex: 1.5; text-shadow: 0 0 12px rgba(255,255,255,0.3); }
.step-dot.completed { color: #60a5fa; }
.step-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 2px; }
.progress-track { height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; margin-top: 8px; }
.progress-fill { height: 100%; background: #60a5fa; border-radius: 2px; transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1); box-shadow: 0 0 12px rgba(96, 165, 250, 0.6); }

/* Body Area */
.modal-body { flex: 1; overflow-x: hidden; overflow-y: auto; padding: 24px 32px; position: relative; }

/* Footer */
.modal-footer {
  display: flex; justify-content: space-between; align-items: center;
  padding: 20px 32px; border-top: 1px solid rgba(255,255,255,0.05);
  background: rgba(0,0,0,0.2);
}
.btn-text { display: flex; align-items: center; gap: 8px; background: none; border: none; color: rgba(255,255,255,0.5); font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-text:hover { color: #fff; transform: translateX(-2px); }
.footer-right { display: flex; gap: 12px; }
.btn-pill {
  display: flex; align-items: center; gap: 8px; padding: 12px 28px; border-radius: 100px; /* Fully rounded modern pill */
  font-size: 14px; font-weight: 600; border: none; cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.btn-pill.primary { background: #fff; color: #000; }
.btn-pill.primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(255,255,255,0.2); }
.btn-pill.primary:disabled { opacity: 0.5; cursor: not-allowed; }

/* Animations */
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.4s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.slide-left-enter-active, .slide-left-leave-active, .slide-right-enter-active, .slide-right-leave-active { 
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1); position: absolute; width: calc(100% - 64px); 
}
.slide-left-enter-from { opacity: 0; transform: translateX(60px) scale(0.96); }
.slide-left-leave-to { opacity: 0; transform: translateX(-60px) scale(0.96); }
.slide-right-enter-from { opacity: 0; transform: translateX(-60px) scale(0.96); }
.slide-right-leave-to { opacity: 0; transform: translateX(60px) scale(0.96); }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Scrollbar */
.modal-body::-webkit-scrollbar { width: 6px; }
.modal-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

/* =========================================================================
   DEEP CSS OVERRIDES FOR APPLE-GRADE GLASSMORPHISM
   This completely annihilates all black backgrounds in nested components
========================================================================= */
:deep(.step-header h2) { font-size: 24px !important; font-weight: 600 !important; color: #fff !important; margin-bottom: 8px !important; letter-spacing: -0.5px !important; }
:deep(.step-header p) { font-size: 14px !important; color: rgba(255,255,255,0.6) !important; margin-bottom: 32px !important; }

:deep(.form-section) { 
    background: rgba(255,255,255,0.02) !important; 
    border: 1px solid rgba(255,255,255,0.04) !important; 
    border-radius: 16px !important;
    padding: 24px !important; 
    margin-bottom: 24px !important;
}
:deep(.section-title) { 
    font-size: 12px !important; font-weight: 600 !important; color: rgba(255,255,255,0.5) !important; 
    text-transform: uppercase !important; letter-spacing: 1px !important; margin-bottom: 20px !important;
    border-bottom: 1px solid rgba(255,255,255,0.04) !important; padding-bottom: 12px !important;
}
:deep(.text-yellow) { color: #60a5fa !important; }

:deep(.input-group label) { 
    font-size: 13px !important; font-weight: 500 !important; 
    color: rgba(255,255,255,0.7) !important; text-transform: none !important; 
    letter-spacing: normal !important; margin-bottom: 8px !important; display: block !important;
}

/* The ultimate override to remove any black background or #000 */
:deep(input.premium-input), 
:deep(textarea.premium-textarea), 
:deep(input.table-input), 
:deep(input[type="text"]), 
:deep(input[type="number"]), 
:deep(input[type="email"]), 
:deep(select),
:deep(textarea), 
:deep(.design-select .select-selected) {
    background: rgba(255,255,255,0.03) !important; 
    border: 1px solid rgba(255,255,255,0.08) !important;
    border-radius: 8px !important; /* more compact */
    padding: 10px 14px !important; /* more compact */
    color: #fff !important; 
    font-size: 14px !important; /* slightly smaller font */
    font-weight: 400 !important;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important; 
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.1) !important;
    backdrop-filter: blur(10px) !important;
    font-family: 'Inter', sans-serif !important;
    height: auto !important;
}

/* Fix dropdown options and multi-select tags */
:deep(select option) {
    background: #1a1a1c !important; /* Must be solid for options */
    color: #fff !important;
}
:deep(.tag) { 
    background: rgba(255,255,255,0.1) !important;
    border-radius: 4px !important;
    padding: 4px 8px !important;
}
:deep(.checkbox-label) {
   color: rgba(255,255,255,0.8) !important;
}

:deep(input:focus), :deep(textarea:focus), :deep(select:focus), :deep(.design-select .select-selected:focus) { 
    border-color: rgba(245,158,11,0.4) !important; 
    background: rgba(255,255,255,0.06) !important;
    outline: none !important;
    box-shadow: 0 0 0 3px rgba(245,158,11,0.1), inset 0 2px 4px rgba(0,0,0,0.1) !important;
}

:deep(.input-row) { display: flex !important; gap: 16px !important; width: 100% !important; margin-bottom: 0 !important; }
:deep(.input-group) { flex: 1 !important; margin-bottom: 16px !important; }
:deep(.error-label) { color: #f87171 !important; }
:deep(.error-msg) { color: #f87171 !important; font-size: 11px !important; text-transform: none !important; font-weight: 500 !important;}
:deep(.required) { color: #f87171 !important; }

:deep(.table-wrapper), :deep(.services-table) { border-color: rgba(255,255,255,0.05) !important; background: transparent !important; border-radius: 8px !important; overflow: hidden !important;}
:deep(.services-table th) { background: rgba(255,255,255,0.03) !important; color: rgba(255,255,255,0.6) !important; font-weight: 500 !important; border-bottom: 1px solid rgba(255,255,255,0.05) !important; padding: 10px 14px !important; font-size: 12px !important; }
:deep(.services-table td) { border-color: rgba(255,255,255,0.03) !important; padding: 10px 14px !important; background: transparent !important;}
:deep(.services-table td input.table-input) { width: 100% !important; background: rgba(255,255,255,0.03) !important; border: 1px solid transparent !important; padding: 8px 12px !important;}
:deep(.services-table td input.table-input:focus) { border: 1px solid rgba(245,158,11,0.4) !important; background: rgba(255,255,255,0.06) !important;}
:deep(.btn-glass) { background: rgba(255,255,255,0.06) !important; border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 100px !important; color: white !important; padding: 8px 16px !important; font-weight: 500 !important; transition: all 0.3s ease !important;}
:deep(.btn-glass:hover) { background: rgba(255,255,255,0.12) !important; transform: translateY(-1px) !important;}

/* SlaReview specifics */
:deep(.review-card) { background: rgba(255,255,255,0.02) !important; border: 1px solid rgba(255,255,255,0.06) !important; border-radius: 12px !important; padding: 20px !important;}
:deep(.review-grid .detail-item label) { color: rgba(255,255,255,0.4) !important; font-size: 11px !important; text-transform: uppercase !important; }
:deep(.review-grid .detail-item p) { color: #f5f5f7 !important; font-size: 14px !important; }

/* Fix step heights */
:deep(.step-container) { max-width: 100% !important; padding: 0 !important; }
</style>
