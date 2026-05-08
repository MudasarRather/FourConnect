<template>
  <div class="step-container slide-up-enter">
    <div class="step-header">
      <h2>Step 10: Signatories</h2>
      <p>Identify the authorized executives responsible for executing this agreement.</p>
    </div>

    <div class="cards-grid">
      <!-- Provider Signatory -->
      <div class="signatory-card provider-card">
        <div class="card-title">
          <div class="card-icon"><Shield :size="18"/></div>
          <h3 :class="{ 'error-label': errors.signatories }">Service Provider Signatory <span v-if="errors.signatories" class="error-msg" style="text-transform: none; margin-left:8px; font-size:11px">- Please fill out all mandatory fields for signatories</span></h3>
        </div>
        
        <div class="card-body">
           <div class="input-group">
            <label>Provider Party <span class="required">*</span></label>
            <input 
              type="text" 
              v-model="providerSig.party" 
              disabled
              class="premium-input disabled-input"
            />
          </div>
          
          <div class="input-group">
            <label>Authorized Name <span class="required">*</span></label>
            <input 
              type="text" 
              v-model="providerSig.name" 
              placeholder="e.g. John Doe"
              class="premium-input"
              @blur="syncToParent"
            />
          </div>
          
          <div class="input-group">
            <label>Job Designation <span class="required">*</span></label>
            <input 
              type="text" 
              v-model="providerSig.designation" 
              placeholder="e.g. Chief Executive Officer"
              class="premium-input"
              @blur="syncToParent"
            />
          </div>
          
          <div class="input-group">
            <label>Official Email <span class="required">*</span></label>
            <input 
              type="email" 
              v-model="providerSig.email" 
              placeholder="ceo@fourconnect.com"
              class="premium-input"
              @blur="syncToParent"
            />
          </div>
        </div>
      </div>

      <!-- Client Signatory -->
      <div class="signatory-card client-card">
        <div class="card-title">
          <div class="card-icon"><Briefcase :size="18"/></div>
          <h3 :class="{ 'error-label': errors.signatories }">Client Signatory <span v-if="errors.signatories" class="error-msg" style="text-transform: none; margin-left:8px; font-size:11px">- Please fill out all mandatory fields for signatories</span></h3>
        </div>
        
        <div class="card-body">
           <div class="input-group">
            <label>Client Party <span class="required">*</span></label>
            <input 
              type="text" 
              v-model="clientSig.party" 
              disabled
              class="premium-input disabled-input"
            />
          </div>
          
          <div class="input-group">
            <label>Authorized Name <span class="required">*</span></label>
            <input 
              type="text" 
              v-model="clientSig.name" 
              placeholder="e.g. Jane Smith"
              class="premium-input"
              @blur="syncToParent"
            />
          </div>
          
          <div class="input-group">
            <label>Job Designation <span class="required">*</span></label>
            <input 
              type="text" 
              v-model="clientSig.designation" 
              placeholder="e.g. VP of Procurement"
              class="premium-input"
              @blur="syncToParent"
            />
          </div>
          
          <div class="input-group">
            <label>Official Email <span class="required">*</span></label>
            <input 
              type="email" 
              v-model="clientSig.email" 
              placeholder="jane@clientorg.com"
              class="premium-input"
              @blur="syncToParent"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Digital Signature placeholder -->
    <div class="digital-sig-panel">
      <div class="sig-content">
        <PenTool :size="32" class="pen-icon"/>
        <div class="sig-text">
          <h3>E-Signature Workflows Enabled</h3>
          <p>Upon generating the document, DocuSign integrations will trigger routing to the specified emails automatically.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { Shield, Briefcase, PenTool } from 'lucide-vue-next'

const props = defineProps({
  form: { type: Object, required: true },
  errors: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['updateForm'])

// Local state for the two mandatory signatories
const providerSig = ref({ party: props.form.provider_name || 'Service Provider', name: '', designation: '', email: '' })
const clientSig = ref({ party: props.form.client_organization_name || 'Client', name: '', designation: '', email: '' })

watch(() => props.form.provider_name, (newVal) => {
  if (providerSig.value.party === 'Service Provider' || providerSig.value.party === '') {
    providerSig.value.party = newVal || 'Service Provider'
    syncToParent()
  }
})

watch(() => props.form.client_organization_name, (newVal) => {
    clientSig.value.party = newVal || 'Client'
    syncToParent()
})

onMounted(() => {
  // If editing an existing draft
  if (props.form.signatories && props.form.signatories.length > 0) {
    const p = props.form.signatories.find(s => s.party === providerSig.value.party || s.party === 'Service Provider' || s.party === props.form.provider_name)
    if (p) providerSig.value = { ...p, party: props.form.provider_name || 'Service Provider' }
    
    const c = props.form.signatories.find(s => s.party === clientSig.value.party || s.party === 'Client' || s.party === props.form.client_organization_name)
    if (c) clientSig.value = { ...c, party: props.form.client_organization_name || 'Client' }
  }
  syncToParent()
})

const syncToParent = () => {
  emit('updateForm', 'signatories', [providerSig.value, clientSig.value])
}
</script>

<style scoped>
.step-container { max-width: 900px; margin: 0 auto; }
.step-header { margin-bottom: 32px; }
.step-header h2 { font-size: 24px; font-weight: 600; margin: 0 0 8px 0; letter-spacing: -0.5px; }
.step-header p { color: rgba(255, 255, 255, 0.6); font-size: 14px; margin: 0; }

.cards-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  margin-bottom: 32px;
}

.signatory-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  overflow: hidden;
}

.provider-card { border-top: 3px solid #ffeb3b; }
.client-card { border-top: 3px solid #4caf50; }

.card-title {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.provider-card .card-icon { color: #ffeb3b; }
.client-card .card-icon { color: #4caf50; }

.card-title h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.card-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.input-group { display: flex; flex-direction: column; gap: 8px; }
.input-group label { font-size: 12px; font-weight: 500; color: rgba(255, 255, 255, 0.7); }
.required { color: #f44336; margin-left: 2px; }
.error-label { color: #ff5252 !important; }
.error-msg { color: #ff5252; font-size: 11px; margin-left: 4px; text-transform: none; font-weight: normal; }

.premium-input { background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(255, 255, 255, 0.1); color: #fff; padding: 12px 16px; border-radius: 8px; font-size: 14px; transition: all 0.2s; width: 100%; box-sizing: border-box; }
.premium-input:focus { outline: none; border-color: #ffeb3b; box-shadow: 0 0 0 3px rgba(255, 235, 59, 0.1); }
.disabled-input { background: rgba(255, 255, 255, 0.05); color: rgba(255, 255, 255, 0.4); cursor: not-allowed; border-color: transparent;}

.digital-sig-panel {
  background: rgba(33, 150, 243, 0.05);
  border: 1px dashed rgba(33, 150, 243, 0.3);
  border-radius: 12px;
  padding: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sig-content {
  display: flex;
  align-items: center;
  gap: 24px;
}

.pen-icon {
  color: #2196f3;
  opacity: 0.8;
}

.sig-text h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  color: #fff;
}

.sig-text p {
  margin: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  max-width: 400px;
}

.slide-up-enter { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>
