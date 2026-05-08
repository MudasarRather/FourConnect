<template>
  <div class="step-container slide-up-enter">
    <div class="step-header">
      <h2>Step 11: Final Review</h2>
      <p>Verify the SLA payload before compiling the final document.</p>
    </div>

    <div class="review-grid">
      <!-- Summary Card -->
      <div class="review-section">
        <div class="section-top">
          <FileText :size="20" class="icon-yellow"/>
          <h3>Document Summary</h3>
        </div>
        <div class="data-grid">
          <div class="data-item">
            <label>Title</label>
            <span>{{ form.title || 'Untitled SLA' }}</span>
          </div>
          <div class="data-item">
            <label>Type</label>
            <span>{{ form.agreement_type }}</span>
          </div>
          <div class="data-item">
            <label>Provider</label>
            <span>{{ form.provider_name || 'Fourconnect' }}</span>
          </div>
          <div class="data-item">
            <label>Client</label>
            <span>{{ form.client_organization_name || 'Not specified' }}</span>
          </div>
          <div class="data-item">
            <label>Start Date</label>
            <span>{{ form.start_date || 'N/A' }}</span>
          </div>
          <div class="data-item">
            <label>Value</label>
            <span class="text-green">{{ form.currency }} {{ form.agreement_value || '0.00' }} / {{ form.billing_frequency }}</span>
          </div>
        </div>
      </div>

      <!-- Scope Architecture -->
      <div class="review-section">
        <div class="section-top">
          <Server :size="20" class="icon-yellow"/>
          <h3>Service Architecture Outline</h3>
        </div>
        <div class="scope-list">
          <div v-if="!form.services || form.services.length === 0" class="empty-msg">No services mapped.</div>
          <div v-for="(svc, i) in form.services" :key="i" class="scope-row">
            <div class="scope-left">
              <span class="badge">{{ svc.service_category || 'Misc' }}</span>
              <span class="sv-name">{{ svc.service_name || 'Unnamed' }}</span>
            </div>
            <div class="scope-right">
              <span class="metric-count">{{ svc.metrics?.length || 0 }} Metrics Attached</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Compliance Matrix -->
      <div class="review-section">
        <div class="section-top">
          <ShieldCheck :size="20" class="icon-yellow"/>
          <h3>Compliance Profile</h3>
        </div>
        <div class="tags-container">
          <div v-if="!form.compliance_standards || form.compliance_standards.length === 0" class="empty-msg">Standard compliance only.</div>
          <span v-for="std in form.compliance_standards" :key="std" class="compl-tag">{{ std }}</span>
          <span v-for="sec in form.security_measures" :key="sec" class="sec-tag">{{ sec }}</span>
        </div>
      </div>
      
    </div>
    
     <div class="generation-warning">
      <AlertTriangle :size="24" class="warn-icon"/>
      <div class="warn-text">
        <h4>Ready for Compilation</h4>
        <p>Generating the document will lock the initial payload to version 1.0 and construct the PDF/DOCX files. Ensure all signatories are accurate.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { FileText, Server, ShieldCheck, AlertTriangle } from 'lucide-vue-next'

const props = defineProps({
  form: { type: Object, required: true }
})
</script>

<style scoped>
.step-container { max-width: 900px; margin: 0 auto; }
.step-header { margin-bottom: 32px; text-align: center; }
.step-header h2 { font-size: 28px; font-weight: 600; margin: 0 0 8px 0; letter-spacing: -1px; text-shadow: 0 0 20px rgba(255, 255, 255, 0.1); }
.step-header p { color: rgba(255, 255, 255, 0.6); font-size: 15px; margin: 0; }

.review-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.review-section {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 24px 32px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.section-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.icon-yellow { color: #ffeb3b; }
.section-top h3 { margin: 0; font-size: 16px; font-weight: 600; color: #fff; }

.data-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.data-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.data-item label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.4);
}

.data-item span {
  font-size: 14px;
  font-weight: 500;
  color: #fff;
}

.text-green { color: #4caf50 !important; font-weight: 600 !important; }

.scope-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.scope-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03); /* Removed black background here */
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05); /* Slight border bump */
}

.scope-left { display: flex; align-items: center; gap: 12px; }
.badge { background: rgba(255, 255, 255, 0.15); color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
.sv-name { font-size: 14px; font-weight: 600; color: #fff; }
.metric-count { font-size: 12px; color: #ffeb3b; }

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.compl-tag { background: rgba(76, 175, 80, 0.1); color: #4caf50; border: 1px solid rgba(76, 175, 80, 0.2); padding: 6px 12px; border-radius: 20px; font-size: 12px; }
.sec-tag { background: rgba(255, 255, 255, 0.05); color: rgba(255, 255, 255, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); padding: 6px 12px; border-radius: 20px; font-size: 12px; }
.empty-msg { font-size: 13px; color: rgba(255, 255, 255, 0.3); font-style: italic;}

.generation-warning {
  margin-top: 32px;
  background: rgba(255, 152, 0, 0.1);
  border: 1px solid rgba(255, 152, 0, 0.2);
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 20px;
}

.warn-icon { color: #ff9800; }
.warn-text h4 { margin: 0 0 4px 0; font-size: 15px; color: #ff9800; }
.warn-text p { margin: 0; font-size: 13px; color: rgba(255, 255, 255, 0.7); }

.slide-up-enter { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes slideUp { from { opacity: 0; transform: translateY(30px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
</style>
