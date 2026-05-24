<template>
  <div class="dpr-wizard-wrapper">
    <!-- === TOP COMMAND BAR === -->
    <header class="dpr-command-bar">
      <div class="cmd-left">
        <button class="cmd-back" @click="goBack">
          <ArrowLeft :size="18" />
        </button>
        <div class="cmd-title">
          <div class="cmd-badge">DPR</div>
          <h1>Project Handover Document</h1>
          <span class="cmd-version">{{ form.version }}</span>
        </div>
      </div>
      <div class="cmd-right">
        <div class="cmd-project-select">
          <Layers :size="14" />
          <SlaSelect 
            v-model="form.project_id" 
            :options="projectOptions"
            @update:modelValue="onProjectSelect"
            class="cmd-select"
            placeholder="Select Project..."
          />
        </div>
        <button v-if="!isInitialLoading && form.status !== 'Approved' && !(isAdmin && form.status === 'Internal Review')" class="cmd-btn cmd-save" @click="saveDraft">
          <Save :size="15" /> Save Draft
        </button>
      </div>
    </header>

    <!-- === WIZARD BODY === -->
    <div class="dpr-body">

      <!-- LEFT: Timeline Stepper -->
      <aside class="dpr-timeline">
        <div class="tl-progress-track">
          <div class="tl-fill" :style="{ height: `${(currentStep / (steps.length - 1)) * 100}%` }"></div>
        </div>
        <div
          v-for="(step, i) in steps"
          :key="i"
          class="tl-node"
          :class="{ active: i === currentStep, completed: i < currentStep, future: i > currentStep }"
          @click="goToStep(i)"
        >
          <div class="tl-dot">
            <component :is="step.icon" :size="12" />
          </div>
          <div class="tl-label">
            <span class="tl-num">{{ String(i + 1).padStart(2, '0') }}</span>
            <span class="tl-name">{{ step.title }}</span>
          </div>
        </div>
      </aside>

      <!-- RIGHT: Content Area -->
      <main class="dpr-content">
        <!-- Step Header -->
        <div class="step-header-bar">
          <div class="shb-left">
            <div class="shb-step-badge">Step {{ currentStep + 1 }}</div>
            <h2>{{ steps[currentStep].title }}</h2>
          </div>
          <div class="shb-right">
            <span class="shb-progress">{{ Math.round(((currentStep + 1) / steps.length) * 100) }}% Complete</span>
          </div>
        </div>

        <!-- Step Content -->
        <transition :name="transitionDirection" mode="out-in">
          <div :key="currentStep" class="step-content-area">
            <!-- ====== STEP 1: PROJECT OVERVIEW ====== -->
            <div v-if="currentStep === 0" class="step-panel">
              <div class="field-grid two-col">
                <div class="field-group">
                  <label :class="{ 'error-label': errors.project_name }">Project Name <span v-if="errors.project_name" class="error-msg">- Required</span></label>
                  <input v-model="form.project_name" placeholder="Project Name (Required)..." />
                </div>
                <div class="field-group">
                  <label :class="{ 'error-label': errors.project_code }">Project Code <span v-if="errors.project_code" class="error-msg">- Required</span></label>
                  <input v-model="form.project_code" placeholder="PRJ-001 (Required)" />
                </div>
                <div class="field-group">
                  <label :class="{ 'error-label': errors.client_organization }">Client Organization <span v-if="errors.client_organization" class="error-msg">- Required</span></label>
                  <input v-model="form.client_organization" placeholder="Client Corp. (Required)" />
                </div>
                <div class="field-group">
                  <label :class="{ 'error-label': errors.department }">Department <span v-if="errors.department" class="error-msg">- Required</span></label>
                  <input v-model="form.department" placeholder="IT / Engineering (Required)" />
                </div>
                <div class="field-group">
                  <label :class="{ 'error-label': errors.start_date }">Start Date <span v-if="errors.start_date" class="error-msg">- Required</span></label>
                  <CompactDatePicker v-model="form.start_date" />
                </div>
                <div class="field-group">
                  <label :class="{ 'error-label': errors.completion_date }">Completion Date <span v-if="errors.completion_date" class="error-msg">- Required</span></label>
                  <CompactDatePicker v-model="form.completion_date" />
                </div>
                <div class="field-group"><label>Project Manager (Optional)</label><input v-model="form.project_manager" placeholder="Manager Name (Optional)" /></div>
                <div class="field-group"><label>Duration</label><input :value="computedDuration" disabled class="computed-field" /></div>
              </div>
              <div class="field-group full"><label>Project Summary (Optional)</label><textarea v-model="form.project_summary" rows="4" placeholder="Describe the project scope, objectives, and key deliverables..."></textarea></div>
            </div>

            <!-- ====== STEP 2: STAKEHOLDERS ====== -->
            <div v-if="currentStep === 1" class="step-panel">
              <div class="dpr-table-section">
                <div class="dts-header">
                  <h3 :class="{ 'error-label': errors.stakeholders }">Stakeholders & Contacts <span v-if="errors.stakeholders" class="error-msg">- Missing details</span></h3>
                  <button class="add-row-btn" @click="addStakeholder"><Plus :size="14" /> Add</button>
                </div>
                <div class="dpr-table grid-stakeholders">
                  <div class="dt-header-row"><span>Role *</span><span>Name *</span><span>Organization *</span><span>Phone (Digits Only) *</span><span>Email *</span><span></span></div>
                  <div class="dt-row" v-for="(s, i) in form.stakeholders" :key="i">
                    <SlaSelect v-model="s.role" :options="stakeholderRoles" />
                    <input v-model="s.name" placeholder="Name (Required)" />
                    <input v-model="s.organization" placeholder="Org (Required)" />
                    <input type="tel" inputmode="numeric" pattern="[0-9]*" v-model="s.phone" placeholder="91... (Digits Only)" @input="s.phone = s.phone.replace(/[^0-9]/g, '')" />
                    <input v-model="s.email" placeholder="email@... (Required)" />
                    <button class="rm-btn" @click="form.stakeholders.splice(i, 1)"><X :size="12" /></button>
                  </div>
                  <div v-if="form.stakeholders.length === 0" class="dt-empty">No stakeholders added yet. Click "Add" to begin.</div>
                </div>
              </div>
            </div>

            <!-- ====== STEP 3: DELIVERED SCOPE ====== -->
            <div v-if="currentStep === 2" class="step-panel">
              <div class="dpr-table-section">
                <div class="dts-header">
                  <h3 :class="{ 'error-label': errors.modules }">Modules Delivered <span v-if="errors.modules" class="error-msg">- Missing details</span></h3>
                  <button class="add-row-btn" @click="addModule"><Plus :size="14" /> Add</button>
                </div>
                <div class="dpr-table grid-modules">
                  <div class="dt-header-row"><span>Module *</span><span>Description *</span><span>Status *</span><span>Delivery Date *</span><span></span></div>
                  <div class="dt-row" v-for="(m, i) in form.modules" :key="i">
                    <input v-model="m.module_name" placeholder="Module (Required)" />
                    <input v-model="m.description" placeholder="Description (Required)" />
                    <SlaSelect v-model="m.status" :options="['Delivered', 'Partial', 'Pending']" />
                    <CompactDatePicker v-model="m.delivery_date" />
                    <button class="rm-btn" @click="form.modules.splice(i, 1)"><X :size="12" /></button>
                  </div>
                  <div v-if="form.modules.length === 0" class="dt-empty">No modules added.</div>
                </div>
              </div>
            </div>

            <!-- ====== STEP 4: TECHNICAL ARCHITECTURE ====== -->
            <div v-if="currentStep === 3" class="step-panel">
              <div class="field-grid two-col">
                <div class="field-group"><label>Backend</label><input v-model="form.tech_stack_backend" placeholder="Python, Node.js..." /></div>
                <div class="field-group"><label>Frontend</label><input v-model="form.tech_stack_frontend" placeholder="Vue.js, React..." /></div>
                <div class="field-group"><label>Database</label><input v-model="form.tech_stack_database" placeholder="PostgreSQL, MongoDB..." /></div>
                <div class="field-group"><label>Architecture Diagram URL</label><input v-model="form.architecture_diagram_url" placeholder="https://drive.google.com/..." /></div>
              </div>
              <div class="field-group full"><label>Architecture Description</label><textarea v-model="form.architecture_description" rows="5" placeholder="Describe the system architecture, data flow, and integration points..."></textarea></div>
            </div>

            <!-- ====== STEP 5: INFRASTRUCTURE ====== -->
            <div v-if="currentStep === 4" class="step-panel">
              <div class="dpr-table-section">
                <div class="dts-header"><h3>Server Infrastructure</h3><button class="add-row-btn" @click="addServer"><Plus :size="14" /> Add</button></div>
                <div class="dpr-table grid-servers">
                  <div class="dt-header-row"><span>Server Name</span><span>IP Address</span><span>Role</span><span>OS</span><span>Location</span><span></span></div>
                  <div class="dt-row" v-for="(s, i) in form.servers" :key="i">
                    <input v-model="s.server_name" placeholder="web-srv-01" />
                    <input v-model="s.ip_address" placeholder="192.168.x.x" />
                    <input v-model="s.role" placeholder="App Server" />
                    <input v-model="s.os" placeholder="Ubuntu 22" />
                    <SlaSelect v-model="s.location" :options="['AWS', 'Azure', 'GCP', 'On-Premise']" />
                    <button class="rm-btn" @click="form.servers.splice(i, 1)"><X :size="12" /></button>
                  </div>
                  <div v-if="form.servers.length === 0" class="dt-empty">No servers added.</div>
                </div>
              </div>
            </div>

            <!-- ====== STEP 6: ASSETS ====== -->
            <div v-if="currentStep === 5" class="step-panel">
              <div class="dpr-table-section">
                <div class="dts-header">
                  <h3 :class="{ 'error-label': errors.assets }">Hardware Inventory <span v-if="errors.assets" class="error-msg">- Missing details</span></h3>
                  <button class="add-row-btn" @click="addAsset"><Plus :size="14" /> Add</button>
                </div>
                <div class="dpr-table grid-assets">
                  <div class="dt-header-row"><span>Asset *</span><span>Model *</span><span>Serial No. *</span><span>Qty *</span><span>Assigned To *</span><span>Location *</span><span></span></div>
                  <div class="dt-row" v-for="(a, i) in form.assets" :key="i">
                    <input v-model="a.asset_name" placeholder="Asset (Required)" />
                    <input v-model="a.model" placeholder="Model (Required)" />
                    <input v-model="a.serial_number" placeholder="SN-XXX (Required)" />
                    <input type="number" v-model="a.quantity" min="1" onkeypress="return event.charCode >= 48 && event.charCode <= 57" />
                    <input v-model="a.assigned_to" placeholder="Person (Required)" />
                    <input v-model="a.location" placeholder="Office (Required)" />
                    <button class="rm-btn" @click="form.assets.splice(i, 1)"><X :size="12" /></button>
                  </div>
                  <div v-if="form.assets.length === 0" class="dt-empty">No assets added.</div>
                </div>
              </div>
            </div>

            <!-- ====== STEP 7: CREDENTIALS ====== -->
            <div v-if="currentStep === 6" class="step-panel">
              <div class="secure-notice"><ShieldAlert :size="16" /> <span>Sensitive section — please ensure all required system credentials and their access levels are accurately recorded for operational transition.</span></div>
              <div class="dpr-table-section">
                <div class="dts-header">
                  <h3 :class="{ 'error-label': errors.credentials }">Access Credentials <span v-if="errors.credentials" class="error-msg">- Missing details</span></h3>
                  <button class="add-row-btn" @click="addCredential"><Plus :size="14" /> Add</button>
                </div>
                <div class="dpr-table grid-credentials">
                  <div class="dt-header-row"><span>System *</span><span>Username *</span><span>Access Level *</span><span>Password *</span><span>Delivered To *</span><span></span></div>
                  <div class="dt-row" v-for="(c, i) in form.credentials" :key="i">
                    <input v-model="c.system" placeholder="System (Required)" />
                    <input v-model="c.username" placeholder="Username (Required)" />
                    <SlaSelect v-model="c.access_level" :options="['Admin', 'Read-Write', 'Read-Only']" />
                    <input v-model="c.password" placeholder="Password (Required)" />
                    <input v-model="c.delivered_to" placeholder="Recipient (Required)" />
                    <button class="rm-btn" @click="form.credentials.splice(i, 1)"><X :size="12" /></button>
                  </div>
                  <div v-if="form.credentials.length === 0" class="dt-empty">No credentials entries.</div>
                </div>
              </div>
            </div>

            <!-- ====== STEP 8: DOCUMENTATION ====== -->
            <div v-if="currentStep === 7" class="step-panel">
              <div class="dpr-table-section">
                <div class="dts-header"><h3>Documentation Delivered</h3><button class="add-row-btn" @click="addDocument"><Plus :size="14" /> Add</button></div>
                <div class="dpr-table grid-documents">
                  <div class="dt-header-row"><span>Document Name</span><span>Type</span><span>Version</span><span>Link / URL</span><span></span></div>
                  <div class="dt-row" v-for="(d, i) in form.documents" :key="i">
                    <input v-model="d.document_name" placeholder="User Manual" />
                    <SlaSelect v-model="d.doc_type" :options="['User Manual', 'Admin Manual', 'API Documentation', 'Installation Guide', 'Other']" />
                    <input v-model="d.version" placeholder="v1.0" />
                    <input v-model="d.link_url" placeholder="https://..." />
                    <button class="rm-btn" @click="form.documents.splice(i, 1)"><X :size="12" /></button>
                  </div>
                  <div v-if="form.documents.length === 0" class="dt-empty">No documents added.</div>
                </div>
              </div>
            </div>

            <!-- ====== STEP 9: OPERATIONS & MAINTENANCE ====== -->
            <div v-if="currentStep === 8" class="step-panel">
              <h3 class="section-sub-title">Backup Configuration</h3>
              <div class="field-grid three-col">
                <div class="field-group"><label>Backup Frequency</label><SlaSelect v-model="form.backup_frequency" :options="['Daily', 'Weekly', 'Monthly']" /></div>
                <div class="field-group"><label>Backup Location</label><input v-model="form.backup_location" placeholder="S3, NAS..." /></div>
                <div class="field-group"><label>Backup Type</label><SlaSelect v-model="form.backup_type" :options="['Full', 'Incremental', 'Differential']" /></div>
              </div>
              <h3 class="section-sub-title" style="margin-top:24px;">Monitoring</h3>
              <div class="field-grid three-col">
                <div class="field-group"><label>Monitoring Tools</label><input v-model="form.monitoring_tools" placeholder="Grafana, Prometheus..." /></div>
                <div class="field-group"><label>Alert System</label><input v-model="form.alert_system" placeholder="PagerDuty, Email..." /></div>
                <div class="field-group"><label>Dashboard URL</label><input v-model="form.dashboard_url" placeholder="https://..." /></div>
              </div>
              <h3 class="section-sub-title" style="margin-top:24px;">Maintenance</h3>
              <div class="field-grid two-col">
                <div class="field-group"><label>Maintenance Schedule</label><input v-model="form.maintenance_schedule" placeholder="Every Sunday 2 AM" /></div>
                <div class="field-group"><label>Patch Management</label><input v-model="form.patch_management_plan" placeholder="Monthly security patches" /></div>
              </div>
            </div>

            <!-- ====== STEP 10: SUPPORT & SLA ====== -->
            <div v-if="currentStep === 9" class="step-panel">
              <div class="field-grid two-col">
                <div class="field-group"><label>Linked SLA</label>
                  <SlaSelect v-model="form.sla_id" :options="slaOptions" @update:modelValue="onSlaSelect" />
                </div>
                <div class="field-group"><label>Support Type</label><SlaSelect v-model="form.support_type" :options="['24x7', 'Business Hours', 'Custom']" :disabled="!!form.sla_id" /></div>
                <div class="field-group"><label>Support Start Date</label><CompactDatePicker v-model="form.support_start_date" :disabled="true" /></div>
                <div class="field-group"><label>Support End Date</label><CompactDatePicker v-model="form.support_end_date" :disabled="true" /></div>
              </div>
            </div>

            <!-- ====== STEP 11: TRAINING ====== -->
            <div v-if="currentStep === 10" class="step-panel">
              <div class="dpr-table-section">
                <div class="dts-header">
                  <h3 :class="{ 'error-label': errors.training }">Training Sessions <span v-if="errors.training" class="error-msg">- Missing details</span></h3>
                  <button class="add-row-btn" @click="addTraining"><Plus :size="14" /> Add</button>
                </div>
                <div class="dpr-table grid-training">
                  <div class="dt-header-row"><span>Topic *</span><span>Trainer *</span><span>Date *</span><span>Participants *</span><span>Mode *</span><span>Status *</span><span></span></div>
                  <div class="dt-row" v-for="(t, i) in form.training" :key="i">
                    <input v-model="t.topic" placeholder="Topic (Required)" />
                    <input v-model="t.trainer" placeholder="Trainer (Required)" />
                    <CompactDatePicker v-model="t.training_date" />
                    <input v-model="t.participants" placeholder="Participants (Required)" />
                    <SlaSelect v-model="t.training_mode" :options="['Online', 'Offline']" />
                    <SlaSelect v-model="t.completion_status" :options="['Pending', 'Completed']" />
                    <button class="rm-btn" @click="form.training.splice(i, 1)"><X :size="12" /></button>
                  </div>
                  <div v-if="form.training.length === 0" class="dt-empty">No training sessions added.</div>
                </div>
              </div>
            </div>

            <!-- ====== STEP 12: FINANCIAL CLOSURE ====== -->
            <div v-if="currentStep === 11" class="step-panel">
              <div class="field-grid three-col">
                <div class="field-group">
                  <label :class="{ 'error-label': errors.total_project_value }">Total Project Value <span v-if="errors.total_project_value" class="error-msg">- Required</span></label>
                  <input type="number" v-model="form.total_project_value" placeholder="0" />
                </div>
                <div class="field-group">
                  <label :class="{ 'error-label': errors.amount_received }">Amount Received <span v-if="errors.amount_received" class="error-msg">- Required</span></label>
                  <input type="number" v-model="form.amount_received" placeholder="0" />
                </div>
                <div class="field-group"><label>Pending Amount</label><input :value="computedPending" disabled class="computed-field" /></div>
              </div>
              <div class="dpr-table-section" style="margin-top:24px;">
                <div class="dts-header"><h3>Invoice References <span class="sub-req">(All fields mandatory)</span></h3><button class="add-row-btn" @click="addInvoice"><Plus :size="14" /> Add</button></div>
                <div class="dpr-table grid-invoices">
                  <div class="dt-header-row"><span>Invoice No *</span><span>Date *</span><span>Amount *</span><span>Status *</span><span></span></div>
                  <div class="dt-row" v-for="(f, i) in form.financial_invoices" :key="i">
                    <input v-model="f.invoice_no" placeholder="INV-001 (Required)" />
                    <CompactDatePicker v-model="f.invoice_date" />
                    <input type="number" v-model="f.amount" placeholder="0 (Required)" />
                    <SlaSelect v-model="f.status" :options="['Paid', 'Pending']" />
                    <button class="rm-btn" @click="form.financial_invoices.splice(i, 1)"><X :size="12" /></button>
                  </div>
                  <div v-if="form.financial_invoices.length === 0" class="dt-empty">No invoices added.</div>
                </div>
              </div>
            </div>

            <!-- ====== STEP 13: RISKS ====== -->
            <div v-if="currentStep === 12" class="step-panel">
              <div class="dpr-table-section">
                <div class="dts-header"><h3>Risks & Pending Items</h3><button class="add-row-btn" @click="addIssue"><Plus :size="14" /> Add</button></div>
                <div class="dpr-table grid-risks">
                  <div class="dt-header-row"><span>Type</span><span>Description</span><span>Impact</span><span>Owner</span><span>Resolution</span><span></span></div>
                  <div class="dt-row" v-for="(r, i) in form.issues" :key="i">
                    <SlaSelect v-model="r.issue_type" :options="['Pending Deliverable', 'Known Bug', 'Future Enhancement']" />
                    <input v-model="r.issue_desc" placeholder="Issue description" />
                    <SlaSelect v-model="r.impact" :options="['High', 'Medium', 'Low']" />
                    <input v-model="r.owner" placeholder="Owner" />
                    <input v-model="r.expected_resolution" placeholder="ETA" />
                    <button class="rm-btn" @click="form.issues.splice(i, 1)"><X :size="12" /></button>
                  </div>
                  <div v-if="form.issues.length === 0" class="dt-empty">No issues added.</div>
                </div>
              </div>
            </div>

            <!-- ====== STEP 14: SIGN-OFF ====== -->
            <div v-if="currentStep === 13" class="step-panel">
              <div class="dpr-table-section">
                <div class="dts-header">
                  <h3 :class="{ 'error-label': errors.approvals }">Digital Execution & Sign-off <span v-if="errors.approvals" class="error-msg">- Required</span></h3>
                  <button class="add-row-btn" @click="addApproval"><Plus :size="14" /> Add</button>
                </div>
                <div class="dpr-table grid-approvals">
                  <div class="dt-header-row"><span>Party *</span><span>Name *</span><span>Designation *</span><span>Date *</span><span>Signed *</span><span></span></div>
                  <div class="dt-row" v-for="(a, i) in form.approvals" :key="i">
                    <SlaSelect v-model="a.party" :options="['Project Manager', 'Company Director', 'Client Representative']" />
                    <input v-model="a.name" placeholder="Name (Required)" />
                    <input v-model="a.designation" placeholder="Title (Required)" />
                    <CompactDatePicker v-model="a.signature_date" />
                    <label class="toggle-check"><input type="checkbox" v-model="a.has_signed" /><span>{{ a.has_signed ? '✓ Signed' : 'Pending' }}</span></label>
                    <button class="rm-btn" @click="form.approvals.splice(i, 1)"><X :size="12" /></button>
                  </div>
                  <div v-if="form.approvals.length === 0" class="dt-empty">No signatories added.</div>
                </div>
              </div>
            </div>

            <!-- ====== STEP 15: REVIEW & GENERATE ====== -->
            <div v-if="currentStep === 14" class="step-panel review-panel">
              <div class="review-grid">
                <div class="review-card"><div class="rc-label">Project</div><div class="rc-val">{{ form.project_name || '—' }}</div></div>
                <div class="review-card"><div class="rc-label">Client</div><div class="rc-val">{{ form.client_organization || '—' }}</div></div>
                <div class="review-card"><div class="rc-label">Duration</div><div class="rc-val">{{ computedDuration }}</div></div>
                <div class="review-card"><div class="rc-label">Stakeholders</div><div class="rc-val">{{ form.stakeholders.length }}</div></div>
                <div class="review-card"><div class="rc-label">Modules</div><div class="rc-val">{{ form.modules.length }}</div></div>
                <div class="review-card"><div class="rc-label">Servers</div><div class="rc-val">{{ form.servers.length }}</div></div>
                <div class="review-card"><div class="rc-label">Assets</div><div class="rc-val">{{ form.assets.length }}</div></div>
                <div class="review-card"><div class="rc-label">Documents</div><div class="rc-val">{{ form.documents.length }}</div></div>
                <div class="review-card"><div class="rc-label">Training</div><div class="rc-val">{{ form.training.length }}</div></div>
                <div class="review-card highlight"><div class="rc-label">Financial</div><div class="rc-val">{{ form.currency }} {{ Number(form.total_project_value || 0).toLocaleString('en-IN') }}</div></div>
                <div class="review-card"><div class="rc-label">Issues</div><div class="rc-val">{{ form.issues.length }}</div></div>
                <div class="review-card"><div class="rc-label">Approvals</div><div class="rc-val">{{ form.approvals.filter(a => a.has_signed).length }}/{{ form.approvals.length }}</div></div>
              </div>
              <div class="review-actions" v-if="!isInitialLoading">
                <button v-if="form.status !== 'Approved' && !(isAdmin && form.status === 'Internal Review')" class="cmd-btn cmd-save" @click="saveDraft"><Save :size="15" /> Save Draft</button>
                <button class="cmd-btn cmd-submit" @click="submitHandover" :disabled="isSubmitting">
                  <Loader2 v-if="isSubmitting" :size="15" class="spin" />
                  <span v-else style="display:flex;align-items:center;gap:8px;">
                    <FileText :size="15" /> 
                    {{ (isAdmin && form.status === 'Internal Review') ? 'Approve Handover' : (form.status === 'Approved' ? 'Update Handover' : 'Submit for Approval') }}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </transition>

        <!-- Navigation Dock -->
        <div class="nav-dock">
          <button class="dock-btn dock-prev" @click="prevStep" :disabled="currentStep === 0">
            <ChevronLeft :size="16" /> Previous
          </button>
          <div class="dock-dots">
            <div v-for="(_, i) in steps" :key="i" class="dock-dot" :class="{ active: i === currentStep, done: i < currentStep }" @click="goToStep(i)"></div>
          </div>
          <button v-if="currentStep < steps.length - 1" class="dock-btn dock-next" @click="nextStep">
            Next <ChevronRight :size="16" />
          </button>
        </div>
      </main>
    </div>

    <!-- === DUPLICATE WARNING DIALOG === -->
    <transition name="fade">
      <div v-if="duplicateHandoverWarning" class="nano-modal-overlay">
        <div class="nano-modal-card slide-up">
          <div class="nano-modal-icon warning">
            <AlertTriangle :size="32" />
          </div>
          <div class="nano-modal-content">
            <h3>Active Handover Detected</h3>
            <p>A handover document already exists for this project in our system.</p>
            
            <div class="duplicate-info-box" v-if="existingHandover">
              <div class="dib-row"><span class="dib-l">Project:</span> <span class="dib-v">{{ existingHandover.project_name }}</span></div>
              <div class="dib-row"><span class="dib-l">Code:</span> <span class="dib-v">{{ existingHandover.project_code }}</span></div>
              <div class="dib-row"><span class="dib-l">Status:</span> <span class="dib-v status-pill" :class="existingHandover.status.toLowerCase().replace(' ', '-')">{{ existingHandover.status }}</span></div>
            </div>

            <p class="nano-modal-subtext">Creating a new document will start a fresh 15-step protocol. Any existing drafts for this project will not be merged or imported.</p>
          </div>
          <div class="nano-modal-actions">
            <button class="nano-btn secondary" @click="duplicateHandoverWarning = false">Cancel & Change Project</button>
            <button class="nano-btn primary" @click="duplicateHandoverWarning = false">Understood, Proceed</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import {
  ArrowLeft, Save, Layers, Plus, X, ChevronLeft, ChevronRight, FileText, Loader2,
  ShieldAlert, ClipboardList, Users, Package, Cpu, Server, HardDrive, KeyRound,
  BookOpen, Settings, Link2, GraduationCap, DollarSign, AlertTriangle, PenTool, Eye
} from 'lucide-vue-next'
import SlaSelect from '../../components/ui/SlaSelect.vue'
import CompactDatePicker from '../../components/ui/CompactDatePicker.vue'
import { useToast } from '../../composables/useToast'

const router = useRouter()
const route = useRoute()
const { success: toastSuccess, error: toastError } = useToast()
const isAdmin = computed(() => route.path.startsWith('/admin'))
const currentStep = ref(0)
const isSubmitting = ref(false)
const isInitialLoading = ref(!!route.query.edit)
const transitionDirection = ref('slide-left')
const errors = ref({})

const duplicateHandoverWarning = ref(false)
const existingHandover = ref(null)

const steps = [
  { title: 'Project Overview', icon: ClipboardList },
  { title: 'Stakeholders & Contacts', icon: Users },
  { title: 'Delivered Scope', icon: Package },
  { title: 'Technical Architecture', icon: Cpu },
  { title: 'Infrastructure', icon: Server },
  { title: 'Assets Handover', icon: HardDrive },
  { title: 'Credentials & Access', icon: KeyRound },
  { title: 'Documentation', icon: BookOpen },
  { title: 'Operations & Maintenance', icon: Settings },
  { title: 'Support & SLA', icon: Link2 },
  { title: 'Training', icon: GraduationCap },
  { title: 'Financial Closure', icon: DollarSign },
  { title: 'Risks / Pending', icon: AlertTriangle },
  { title: 'Final Sign-off', icon: PenTool },
  { title: 'Review & Generate', icon: Eye },
]

const stakeholderRoles = ['Client IT Head', 'Operations Manager', 'System Admin', 'Vendor Contact', 'Support Team', 'Other']

const projects = ref([])
const slaList = ref([])

const projectOptions = computed(() => {
  return [{ label: 'Select Project...', value: '' }, ...projects.value.map(p => ({ label: p.name, value: p.id }))]
})

const slaOptions = computed(() => {
  return [{ label: 'None', value: '' }, ...slaList.value.map(s => ({ label: s.title, value: s.id }))]
})

const form = ref({
  project_id: '', project_name: '', project_code: '', client_organization: '', department: '',
  start_date: '', completion_date: '', project_manager: '', project_summary: '',
  architecture_description: '', tech_stack_backend: '', tech_stack_frontend: '', tech_stack_database: '', architecture_diagram_url: '',
  backup_frequency: 'Daily', backup_location: '', backup_type: 'Full', monitoring_tools: '', alert_system: '', dashboard_url: '',
  maintenance_schedule: '', patch_management_plan: '',
  sla_id: '', support_start_date: '', support_end_date: '', support_type: 'Business Hours',
  total_project_value: null, amount_received: 0, pending_amount: 0, currency: 'INR',
  status: 'Draft', version: 'v1.0',
  stakeholders: [], modules: [], assets: [], servers: [], credentials: [],
  documents: [], training: [], financial_invoices: [], issues: [], approvals: [],
})

const computedDuration = computed(() => {
  if (!form.value.start_date || !form.value.completion_date) return '—'
  const s = new Date(form.value.start_date)
  const e = new Date(form.value.completion_date)
  const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24))
  return diff > 0 ? `${diff} days` : '—'
})

const computedPending = computed(() => {
  return ((form.value.total_project_value || 0) - (form.value.amount_received || 0)).toFixed(2)
})

const goBack = () => router.back()

// ─── Step Validation ───
const validateStep = (stepIndex) => {
  const f = form.value
  const missing = []
  errors.value = {}
  const newErrs = {}

  const check = (key, label) => {
    if (f[key] === null || f[key] === undefined || (typeof f[key] === 'string' && !f[key].trim())) {
      missing.push(label)
      newErrs[key] = true
      return false
    }
    return true
  }

  if (stepIndex === 0) {
    // Step 1: Project Overview
    check('project_name', 'Project Name')
    check('project_code', 'Project Code')
    check('client_organization', 'Client Organization')
    check('department', 'Department')
    check('start_date', 'Start Date')
    check('completion_date', 'Completion Date')
  } else if (stepIndex === 1) {
    // Step 2: Stakeholders
    if (f.stakeholders.length === 0) { missing.push('At least one stakeholder'); newErrs.stakeholders = true; }
    f.stakeholders.forEach((s, i) => {
      const n = i + 1
      if (!s.role) { missing.push(`Stakeholder ${n}: Role`); newErrs[`stakeholder_${i}_role`] = true; newErrs.get_stk_err = true; }
      if (!s.name?.trim()) { missing.push(`Stakeholder ${n}: Name`); newErrs[`stakeholder_${i}_name`] = true; newErrs.get_stk_err = true; }
      if (!s.organization?.trim()) { missing.push(`Stakeholder ${n}: Organization`); newErrs[`stakeholder_${i}_org`] = true; newErrs.get_stk_err = true; }
      if (!s.phone?.toString().trim()) { missing.push(`Stakeholder ${n}: Phone`); newErrs[`stakeholder_${i}_phone`] = true; newErrs.get_stk_err = true; }
      if (!s.email?.trim()) { missing.push(`Stakeholder ${n}: Email`); newErrs[`stakeholder_${i}_email`] = true; newErrs.get_stk_err = true; }
    })
    if (newErrs.get_stk_err) newErrs.stakeholders = true;
  } else if (stepIndex === 2) {
    // Step 3: Modules / Delivered Scope
    if (f.modules.length === 0) { missing.push('At least one module'); newErrs.modules = true; }
    f.modules.forEach((m, i) => {
      const n = i + 1
      if (!m.module_name?.trim()) { missing.push(`Module ${n}: Name`); newErrs[`module_${i}_name`] = true; newErrs.get_modules_err = true; }
      if (!m.description?.trim()) { missing.push(`Module ${n}: Description`); newErrs[`module_${i}_desc`] = true; newErrs.get_modules_err = true; }
      if (!m.status) { missing.push(`Module ${n}: Status`); newErrs[`module_${i}_status`] = true; newErrs.get_modules_err = true; }
      if (!m.delivery_date) { missing.push(`Module ${n}: Delivery Date`); newErrs[`module_${i}_date`] = true; newErrs.get_modules_err = true; }
    })
    if (newErrs.get_modules_err) newErrs.modules = true;
  } else if (stepIndex === 5) {
    // Step 6: Assets
    if (f.assets.length === 0) { missing.push('At least one asset'); newErrs.assets = true; }
    f.assets.forEach((a, i) => {
      const n = i + 1
      if (!a.asset_name?.trim()) { missing.push(`Asset ${n}: Name`); newErrs[`asset_${i}_name`] = true; newErrs.get_assets_err = true; }
      if (!a.model?.trim()) { missing.push(`Asset ${n}: Model`); newErrs[`asset_${i}_model`] = true; newErrs.get_assets_err = true; }
      if (!a.serial_number?.trim()) { missing.push(`Asset ${n}: Serial No.`); newErrs[`asset_${i}_sn`] = true; newErrs.get_assets_err = true; }
      if (!a.quantity || a.quantity < 1) { missing.push(`Asset ${n}: Quantity`); newErrs[`asset_${i}_qty`] = true; newErrs.get_assets_err = true; }
      if (!a.assigned_to?.trim()) { missing.push(`Asset ${n}: Assigned To`); newErrs[`asset_${i}_to`] = true; newErrs.get_assets_err = true; }
      if (!a.location?.trim()) { missing.push(`Asset ${n}: Location`); newErrs[`asset_${i}_loc`] = true; newErrs.get_assets_err = true; }
    })
    if (newErrs.get_assets_err) newErrs.assets = true;
  } else if (stepIndex === 6) {
    // Step 7: Credentials
    if (f.credentials.length === 0) { missing.push('At least one credential'); newErrs.credentials = true; }
    f.credentials.forEach((c, i) => {
      const n = i + 1
      if (!c.system?.trim()) { missing.push(`Credential ${n}: System`); newErrs[`credential_${i}_system`] = true; newErrs.get_creds_err = true; }
      if (!c.username?.trim()) { missing.push(`Credential ${n}: Username`); newErrs[`credential_${i}_user`] = true; newErrs.get_creds_err = true; }
      if (!c.access_level) { missing.push(`Credential ${n}: Access Level`); newErrs[`credential_${i}_lvl`] = true; newErrs.get_creds_err = true; }
      if (!c.password?.trim()) { missing.push(`Credential ${n}: Password`); newErrs[`credential_${i}_pass`] = true; newErrs.get_creds_err = true; }
      if (!c.delivered_to?.trim()) { missing.push(`Credential ${n}: Delivered To`); newErrs[`credential_${i}_to`] = true; newErrs.get_creds_err = true; }
    })
    if (newErrs.get_creds_err) newErrs.credentials = true;
  } else if (stepIndex === 10) {
    // Step 11: Training
    if (f.training.length === 0) { missing.push('At least one training session'); newErrs.training = true; }
    f.training.forEach((t, i) => {
      const n = i + 1
      if (!t.topic?.trim()) { missing.push(`Training ${n}: Topic`); newErrs[`training_${i}_topic`] = true; newErrs.get_training_err = true; }
      if (!t.trainer?.trim()) { missing.push(`Training ${n}: Trainer`); newErrs[`training_${i}_trainer`] = true; newErrs.get_training_err = true; }
      if (!t.training_date) { missing.push(`Training ${n}: Date`); newErrs[`training_${i}_date`] = true; newErrs.get_training_err = true; }
      if (!t.participants) { missing.push(`Training ${n}: Participants`); newErrs[`training_${i}_parts`] = true; newErrs.get_training_err = true; }
      if (!t.training_mode) { missing.push(`Training ${n}: Mode`); newErrs[`training_${i}_mode`] = true; newErrs.get_training_err = true; }
      if (!t.completion_status) { missing.push(`Training ${n}: Status`); newErrs[`training_${i}_status`] = true; newErrs.get_training_err = true; }
    })
    if (newErrs.get_training_err) newErrs.training = true;
  } else if (stepIndex === 11) {
    // Step 12: Financial Closure
    check('total_project_value', 'Total Project Value')
    check('amount_received', 'Amount Received')
  } else if (stepIndex === 13) {
    // Step 14: Approvals / Sign-off
    if (f.approvals.length < 2) { 
      toastError('Minimum 2 signatories are required to proceed.')
      missing.push('Signatories (Min 2)') 
      newErrs.approvals = true
    }
    f.approvals.forEach((a, i) => {
      const n = i + 1
      if (!a.party) { missing.push(`Approval ${n}: Party`); newErrs[`approval_${i}_party`] = true; newErrs.get_appr_err = true; }
      if (!a.name?.trim()) { missing.push(`Approval ${n}: Name`); newErrs[`approval_${i}_name`] = true; newErrs.get_appr_err = true; }
      if (!a.designation?.trim()) { missing.push(`Approval ${n}: Designation`); newErrs[`approval_${i}_designation`] = true; newErrs.get_appr_err = true; }
      if (!a.signature_date) { missing.push(`Approval ${n}: Date`); newErrs[`approval_${i}_date`] = true; newErrs.get_appr_err = true; }
    })
    if (newErrs.get_appr_err) newErrs.approvals = true;
  }

  if (missing.length > 0) {
    const maxShow = 4
    const display = missing.slice(0, maxShow).join(', ')
    const extra = missing.length > maxShow ? ` and ${missing.length - maxShow} more` : ''
    toastError(`Please fill required fields: ${display}${extra}`)
    setTimeout(() => { errors.value = newErrs }, 10)
    return false
  }
  return true
}

const goToStep = (i) => {
  // Going backward is always allowed
  if (i < currentStep.value) {
    transitionDirection.value = 'slide-right'
    currentStep.value = i
    return
  }
  // Going forward: validate all steps from current to target
  for (let s = currentStep.value; s < i; s++) {
    if (!validateStep(s)) return
  }
  transitionDirection.value = 'slide-left'
  currentStep.value = i
}

const nextStep = () => {
  if (currentStep.value < steps.length - 1) {
    if (!validateStep(currentStep.value)) return
    transitionDirection.value = 'slide-left'
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 0) {
    transitionDirection.value = 'slide-right'
    currentStep.value--
  }
}

const addStakeholder = () => form.value.stakeholders.push({ role: 'Client IT Head', name: '', organization: '', phone: '', email: '' })
const addModule = () => form.value.modules.push({ module_name: '', description: '', status: 'Delivered', delivery_date: '' })
const addServer = () => form.value.servers.push({ server_name: '', ip_address: '', role: '', os: '', location: 'AWS', hosting_type: 'Cloud' })
const addAsset = () => form.value.assets.push({ asset_name: '', model: '', serial_number: '', quantity: 1, assigned_to: '', location: '' })
const addCredential = () => form.value.credentials.push({ system: '', username: '', access_level: 'Admin', password: '', delivered_to: '' })
const addDocument = () => form.value.documents.push({ document_name: '', doc_type: 'User Manual', version: 'v1.0', link_url: '' })
const addTraining = () => form.value.training.push({ topic: '', trainer: '', training_date: '', participants: '', training_mode: 'Online', completion_status: 'Pending' })
const addInvoice = () => form.value.financial_invoices.push({ invoice_no: '', invoice_date: '', amount: 0, status: 'Pending' })
const addIssue = () => form.value.issues.push({ issue_type: 'Pending Deliverable', issue_desc: '', impact: 'Medium', owner: '', expected_resolution: '' })
const addApproval = () => form.value.approvals.push({ party: 'Project Manager', name: '', designation: '', signature_date: '', has_signed: false })

const getToken = () => isAdmin.value ? localStorage.getItem('admin_token') : localStorage.getItem('user_token')

const onProjectSelect = async () => {
  const proj = projects.value.find(p => p.id === form.value.project_id)
  if (proj) {
    form.value.project_name = proj.name || ''
    form.value.project_code = proj.code || ''
    form.value.client_organization = proj.organization || proj.client_name || ''
    
    // Safely format dates to YYYY-MM-DD for the date inputs
    if (proj.start_date) form.value.start_date = new Date(proj.start_date).toISOString().split('T')[0]
    else form.value.start_date = ''
    
    if (proj.end_date) form.value.completion_date = new Date(proj.end_date).toISOString().split('T')[0]
    else form.value.completion_date = ''

    // Assume whoever creates it might be the PM, or leave blank to fill
    if (proj.project_manager) form.value.project_manager = proj.project_manager

    // FETCH FINANCIALS & INVOICES
    try {
      const headers = { Authorization: `Bearer ${getToken()}` }
      const [sumRes, payRes] = await Promise.all([
        axios.get(`${API}/project-financials/${proj.id}/financials/summary`, { headers }).catch(() => ({ data: null })),
        axios.get(`${API}/project-financials/${proj.id}/payments`, { headers }).catch(() => ({ data: [] }))
      ])

      if (sumRes.data) {
        form.value.total_project_value = sumRes.data.total_budget || 0
        form.value.amount_received = sumRes.data.total_spent || 0
        form.value.currency = sumRes.data.currency || 'INR'
      }

      if (Array.isArray(payRes.data)) {
        form.value.financial_invoices = payRes.data.map(p => ({
          invoice_no: p.invoice_number || p.payment_id || 'N/A',
          invoice_date: p.invoice_date || (p.payment_date ? new Date(p.payment_date).toISOString().split('T')[0] : null),
          amount: parseFloat(p.amount_paid) || 0,
          status: ['Completed', 'Paid', 'Success', 'Approved'].includes(p.status) ? 'Paid' : 'Pending'
        }))
      }
    } catch (e) {
      console.warn('Failed to fetch project financials:', e)
    }

    // CHECK FOR DUPLICATES (Existing Pending/Approved Handovers)
    try {
      const headers = { Authorization: `Bearer ${getToken()}` }
      const res = await axios.get(`${API}/handover/?limit=100`, { headers })
      const allDprs = Array.isArray(res.data) ? res.data : (res.data.items || [])
      const match = allDprs.find(d => d.project_id === proj.id && (d.status === 'Approved' || d.status === 'Internal Review'))
      if (match) {
        existingHandover.value = match
        duplicateHandoverWarning.value = true
      }
    } catch (e) {
      console.error('Failed to check for duplicate handovers:', e)
    }
  }
}

const onSlaSelect = async () => {
  if (!form.value.sla_id) return
  try {
    const res = await axios.get(`${API}/sla/${form.value.sla_id}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    const sla = res.data
    if (sla) {
      form.value.support_type = sla.agreement_type || 'Business Hours'
      if (sla.start_date) form.value.support_start_date = new Date(sla.start_date).toISOString().split('T')[0]
      if (sla.end_date) form.value.support_end_date = new Date(sla.end_date).toISOString().split('T')[0]
    }
  } catch (e) {
    console.error('Failed to fetch SLA details:', e)
  }
}

const handoverId = ref(null)

const cleanPayload = (rawForm) => {
  const payload = { ...rawForm }

  // Convert empty strings to null for UUID fields
  if (!payload.project_id) payload.project_id = null
  if (!payload.sla_id) payload.sla_id = null

  // Ensure computed Pending Amount is saved
  payload.pending_amount = parseFloat(computedPending.value) || 0

  // Sanitize numeric fields to prevent 422 float parsing errors
  payload.total_project_value = parseFloat(payload.total_project_value) || 0
  payload.amount_received = parseFloat(payload.amount_received) || 0

  // Clean empty date strings on top-level fields
  for (const key of ['start_date', 'completion_date', 'support_start_date', 'support_end_date']) {
    if (!payload[key]) payload[key] = null
  }

  // Clean empty string fields on all nested arrays (dates, required strings)
  const dateFields = ['delivery_date', 'training_date', 'invoice_date', 'signature_date']
  const nestedKeys = ['stakeholders', 'modules', 'assets', 'servers', 'credentials',
    'documents', 'training', 'financial_invoices', 'issues', 'approvals']

  for (const arrKey of nestedKeys) {
    if (Array.isArray(payload[arrKey])) {
      payload[arrKey] = payload[arrKey].map(item => {
        const cleaned = { ...item }
        for (const df of dateFields) {
          if (df in cleaned && !cleaned[df]) cleaned[df] = null
        }
        return cleaned
      })
    }
  }

  return payload
}

const LOCAL_STORAGE_KEY = 'handover_wizard_draft_data'

const saveDraft = async () => {
  if (!form.value.project_id) {
    toastError('Please select a project before saving draft.')
    return
  }
  try {
    const payload = cleanPayload(form.value)
    const headers = { Authorization: `Bearer ${getToken()}` }

    if (handoverId.value) {
      // Update existing
      await axios.put(`${API}/handover/${handoverId.value}`, payload, { headers })
    } else {
      // Create new
      const res = await axios.post(`${API}/handover/`, payload, { headers })
      handoverId.value = res.data.id
    }
    localStorage.removeItem(LOCAL_STORAGE_KEY)
    toastSuccess('Draft saved successfully!')
    router.push(`${isAdmin.value ? '/admin' : '/user'}/documents/handover?tab=draft`)
  } catch (e) {
    console.error('Save draft failed:', e)
    if (e.response && e.response.data) {
      console.error('Validation errors:', JSON.stringify(e.response.data, null, 2))
    }
    toastError('Failed to save draft.')
  }
}

const submitHandover = async () => {
  isSubmitting.value = true
  try {
    let toastMsg = 'Handover submitted for approval!'
    
    if (form.value.status === 'Approved') {
      toastMsg = 'Handover updated successfully!'
    } else if (isAdmin.value && form.value.status === 'Internal Review') {
      form.value.status = 'Approved'
      toastMsg = 'Handover approved successfully!'
    } else {
      form.value.status = 'Internal Review'
    }

    const payload = cleanPayload(form.value)
    const headers = { Authorization: `Bearer ${getToken()}` }

    if (handoverId.value) {
      await axios.put(`${API}/handover/${handoverId.value}`, payload, { headers })
    } else {
      const res = await axios.post(`${API}/handover/`, payload, { headers })
      handoverId.value = res.data.id
    }
    localStorage.removeItem(LOCAL_STORAGE_KEY)
    toastSuccess(toastMsg)
    router.back()
  } catch (e) {
    console.error('Submit failed:', e)
    if (e.response && e.response.data) {
      console.error('Validation errors:', JSON.stringify(e.response.data, null, 2))
    }
    form.value.status = 'Draft'
    toastError('Failed to submit handover.')
  } finally {
    isSubmitting.value = false
  }
}

const fetchProjects = async () => {
  try {
    const res = await axios.get(`${API}/projects/?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } })
    projects.value = Array.isArray(res.data) ? res.data : (res.data.items || [])
  } catch (e) { console.error(e) }
}

const fetchSlaList = async () => {
  try {
    const res = await axios.get(`${API}/sla/?status=Approved&limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } })
    slaList.value = Array.isArray(res.data) ? res.data : (res.data.items || [])
  } catch (e) { console.error(e) }
}

const loadExistingDpr = async (id) => {
  try {
    const res = await axios.get(`${API}/handover/${id}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    const data = res.data
    handoverId.value = data.id

    Object.keys(form.value).forEach(key => {
      if (data[key] !== undefined && !Array.isArray(data[key])) {
         form.value[key] = data[key] === null ? '' : data[key]
      }
    })

    const nestedKeys = ['stakeholders', 'modules', 'assets', 'servers', 'credentials',
                        'documents', 'training', 'financial_invoices', 'issues', 'approvals']
    nestedKeys.forEach(k => {
      if (Array.isArray(data[k])) {
        form.value[k] = [...data[k]]
      }
    })

    const topDates = ['start_date', 'completion_date', 'support_start_date', 'support_end_date']
    topDates.forEach(k => {
      if (form.value[k] && typeof form.value[k] === 'string') {
        form.value[k] = form.value[k].split('T')[0]
      }
    })
  } catch (e) {
    toastError('Failed to load existing handover')
    console.error('loadExistingDpr Error:', e)
  } finally {
    isInitialLoading.value = false
  }
}

onMounted(() => {
  fetchProjects()
  fetchSlaList()
  if (route.query.edit) {
    loadExistingDpr(route.query.edit)
  } else {
    // Restore draft from local storage if available
    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        form.value = { ...form.value, ...parsed }
      } catch (e) {
        console.error("Failed to parse saved draft")
      }
    }
  }
})

// Auto-save to local storage on any change
import { watch } from 'vue'
import { API } from '@/utils/api'
watch(form, (newVal) => {
  if (!route.query.edit) { // Don't auto-save to local storage if editing existing DB record
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newVal))
  }
}, { deep: true })
</script>

<style scoped>
/* ====================================================================
   DPR WIZARD — APPLE/MICROSOFT PREMIER FLUENT DESIGN
   Solid Black Background, Ultra-smooth Animations, Glassmorphism
   ==================================================================== */
 
 .error-msg {
   color: #ff5252;
   font-size: 11px;
   margin-left: 8px;
   font-weight: 500;
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

.dpr-wizard-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100vh;
  color: #f5f5f7;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background: #000000; /* True black background as requested */
  -webkit-font-smoothing: antialiased;
}

/* === COMMAND BAR === */
.dpr-command-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 32px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  position: sticky;
  top: 0;
  z-index: 100;
}
.cmd-left { display: flex; align-items: center; gap: 20px; }
.cmd-back {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.8);
  width: 38px; height: 38px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
}
.cmd-back:hover { 
  background: rgba(255,255,255,0.12); 
  color: #fff; 
  transform: scale(1.05);
}
.cmd-title { display: flex; align-items: center; gap: 14px; }
.cmd-badge {
  background: linear-gradient(135deg, #f59e0b, #fb923c);
  color: #000;
  font-size: 10px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 8px;
  letter-spacing: 1px;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}
.cmd-title h1 { 
  font-size: 19px; 
  font-weight: 600; 
  margin: 0; 
  letter-spacing: -0.4px; 
  color: #fff;
}
.cmd-version {
  font-size: 12px;
  color: rgba(255,255,255,0.4);
  background: rgba(255,255,255,0.05);
  padding: 3px 10px;
  border-radius: 6px;
  font-weight: 500;
}
.cmd-right { display: flex; align-items: center; gap: 16px; }
.cmd-project-select {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 0 14px;
  color: rgba(255,255,255,0.6);
  transition: all 0.3s ease;
}
.cmd-project-select:hover {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.15);
}
.cmd-select {
  background: transparent;
  border: none;
  color: #fff;
  min-width: 200px;
}
.cmd-select :deep(.sla-select-trigger) {
  background: transparent !important;
  border: none !important;
}
/* Fix for dropdown option visibility */
.cmd-select option { 
  background: #1c1c1e; 
  color: #fff; 
  font-weight: 500;
  padding: 10px;
}
.cmd-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  padding: 10px 24px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.cmd-save {
  background: rgba(255,255,255,0.08);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.1);
}
.cmd-save:hover { 
  background: rgba(255,255,255,0.15); 
  transform: translateY(-1px); 
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}
.cmd-submit {
  background: linear-gradient(135deg, #f59e0b, #fb923c);
  color: #000;
}
.cmd-submit:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(245,158,11,0.3); }
.cmd-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

/* === BODY LAYOUT === */
.dpr-body { display: flex; flex: 1; overflow: hidden; background: #000; }

/* === TIMELINE SIDEBAR === */
.dpr-timeline {
  width: 280px;
  background: rgba(10, 10, 12, 0.4);
  border-right: 1px solid rgba(255,255,255,0.06);
  padding: 32px 0 32px 0;
  overflow-y: auto;
  position: relative;
}
.tl-progress-track {
  position: absolute;
  left: 32px;
  top: 48px;
  bottom: 48px;
  width: 2px;
  background: rgba(255,255,255,0.06);
  border-radius: 4px;
}
.tl-fill {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  background: linear-gradient(180deg, #f59e0b, #fb923c);
  border-radius: 4px;
  transition: height 0.6s cubic-bezier(0.25, 1, 0.5, 1);
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.5);
}
.tl-node {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 24px 12px 22px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}
.tl-node:hover { background: rgba(255,255,255,0.03); padding-left: 26px; }
.tl-dot {
  width: 22px; height: 22px;
  border-radius: 50%;
  background: rgba(255,255,255,0.05);
  border: 2px solid rgba(255,255,255,0.1);
  display: flex; align-items: center; justify-content: center;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  z-index: 2;
  color: rgba(255,255,255,0.4);
  flex-shrink: 0;
}
.tl-node.active .tl-dot {
  background: #f59e0b;
  border-color: #f59e0b;
  color: #000;
  box-shadow: 0 0 16px rgba(245,158,11,0.5);
  transform: scale(1.15);
}
.tl-node.completed .tl-dot {
  background: rgba(245,158,11,0.2);
  border-color: #f59e0b;
  color: #f59e0b;
}
.tl-label { display: flex; align-items: center; gap: 10px; }
.tl-num {
  font-size: 11px;
  font-weight: 700;
  color: rgba(255,255,255,0.25);
  font-variant-numeric: tabular-nums;
  transition: color 0.3s;
}
.tl-node.active .tl-num { color: #f59e0b; }
.tl-node.completed .tl-num { color: rgba(245,158,11,0.7); }
.tl-name { font-size: 13px; color: rgba(255,255,255,0.5); font-weight: 500; transition: color 0.3s; }
.tl-node.active .tl-name { color: #fff; font-weight: 600; }
.tl-node.completed .tl-name { color: rgba(255,255,255,0.8); }

/* === MAIN CONTENT === */
.dpr-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 36px 48px;
}

.step-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.shb-left { display: flex; align-items: center; gap: 16px; }
.shb-step-badge {
  background: rgba(245,158,11,0.15);
  color: #f59e0b;
  font-size: 12px;
  font-weight: 800;
  padding: 5px 14px;
  border-radius: 8px;
  letter-spacing: 0.5px;
  border: 1px solid rgba(245,158,11,0.3);
}
.shb-left h2 { font-size: 24px; font-weight: 600; margin: 0; letter-spacing: -0.5px; }
.shb-progress {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255,255,255,0.5);
  background: rgba(255,255,255,0.05);
  padding: 6px 16px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.08);
}

/* === STEP CONTENT === */
.step-content-area { flex: 1; display: flex; flex-direction: column; }
.step-panel { animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; flex: 1; }

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Transitions */
.slide-left-enter-active, .slide-left-leave-active,
.slide-right-enter-active, .slide-right-leave-active {
  transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
}
.slide-left-enter-from { opacity: 0; transform: translateX(40px); }
.slide-left-leave-to { opacity: 0; transform: translateX(-40px); }
.slide-right-enter-from { opacity: 0; transform: translateX(-40px); }
.slide-right-leave-to { opacity: 0; transform: translateX(40px); }

/* === FORM FIELDS === */
.field-grid { display: grid; gap: 20px; margin-bottom: 24px; }
.field-grid.two-col { grid-template-columns: 1fr 1fr; }
.field-grid.three-col { grid-template-columns: 1fr 1fr 1fr; }
.field-group { display: flex; flex-direction: column; gap: 8px; }
.field-group.full { grid-column: 1 / -1; }
.field-group label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,0.5);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}
.field-group input,
.field-group select,
.field-group textarea {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 12px 16px;
  color: #fff;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.field-group input:focus,
.field-group select:focus,
.field-group textarea:focus {
  border-color: rgba(245,158,11,0.5);
  background: rgba(245,158,11,0.05);
  box-shadow: 0 0 0 4px rgba(245,158,11,0.1);
}
.field-group textarea { resize: vertical; min-height: 100px; line-height: 1.5; }
.computed-field { 
  color: #f59e0b !important; 
  background: rgba(245,158,11,0.08) !important; 
  border-color: rgba(245,158,11,0.2) !important;
  font-weight: 600;
}
.field-group select option { background: #1c1c1e; color: #fff; padding: 10px; }

.section-sub-title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(255,255,255,0.8);
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

/* === TABLE COMPONENT === */
.dpr-table-section { margin-bottom: 32px; }
.dts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.dts-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}
.add-row-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(245,158,11,0.15);
  color: #f59e0b;
  border: 1px solid rgba(245,158,11,0.3);
  border-radius: 10px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}
.add-row-btn:hover {
  background: rgba(245,158,11,0.25);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
}
.dpr-table {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  overflow: hidden;
}

/* === CSS GRID-BASED TABLE LAYOUT === */
.dt-header-row {
  display: grid;
  gap: 8px;
  background: rgba(255,255,255,0.04);
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  align-items: center;
}
.dt-header-row span {
  min-width: 0;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: rgba(255,255,255,0.4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dt-row {
  display: grid;
  gap: 8px;
  padding: 6px 16px;
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.03);
  transition: background 0.2s;
  animation: rowSlideIn 0.3s ease forwards;
}
@keyframes rowSlideIn {
  from { opacity: 0; transform: translateX(-12px); }
  to { opacity: 1; transform: translateX(0); }
}
.dt-row:hover { background: rgba(255,255,255,0.04); }

/* All child elements fill their grid cell */
.dt-row > * {
  min-width: 0;
  box-sizing: border-box;
}

/* Compact inputs inside table rows */
.dt-row > input, .dt-row > select {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 8px 10px;
  color: #fff;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
  height: 36px;
  width: 100%;
}
.dt-row > input:focus, .dt-row > select:focus {
  border-color: rgba(245,158,11,0.4);
  background: rgba(245,158,11,0.05);
}
.dt-row select option { background: #1c1c1e; padding: 10px; }

/* Compact SlaSelect & CompactDatePicker inside table rows */
.dt-row :deep(.sla-select-wrapper) { width: 100%; }
.dt-row :deep(.sla-select-trigger) {
  background: transparent;
  border: 1px solid transparent;
  min-height: 36px;
  height: 36px;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 13px;
  box-sizing: border-box;
}
.dt-row :deep(.sla-select-trigger:hover) {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255,255,255,0.08);
}
.dt-row :deep(.sla-select-trigger.is-open) {
  background: rgba(245,158,11,0.05);
  border-color: rgba(245,158,11,0.4);
}

.dt-row :deep(.compact-date-picker) {
  width: 100%;
  display: block;
}
.dt-row :deep(.compact-input) {
  height: 36px;
  padding: 6px 10px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid transparent;
  box-sizing: border-box;
}
.dt-row :deep(.compact-input:hover) {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255,255,255,0.08);
}
.dt-row :deep(.compact-input.is-open) {
  background: rgba(245,158,11,0.05);
  border-color: rgba(245,158,11,0.4);
}

/* === PER-STEP GRID TEMPLATES === */
/* Step 2: Stakeholders — 5 cols + delete */
.grid-stakeholders .dt-header-row,
.grid-stakeholders .dt-row { grid-template-columns: 2fr 2fr 2fr 1.5fr 2fr 36px; }

/* Step 3: Modules — 4 cols + delete */
.grid-modules .dt-header-row,
.grid-modules .dt-row { grid-template-columns: 2fr 3fr 1.5fr 1.5fr 36px; }

/* Step 5: Servers — 5 cols + delete */
.grid-servers .dt-header-row,
.grid-servers .dt-row { grid-template-columns: 2fr 1.5fr 1.5fr 1fr 1.5fr 36px; }

/* Step 6: Assets — 6 cols + delete */
.grid-assets .dt-header-row,
.grid-assets .dt-row { grid-template-columns: 1.5fr 1.5fr 1.5fr 0.7fr 1.5fr 1.5fr 36px; }

/* Step 7: Credentials — 5 cols + delete */
.grid-credentials .dt-header-row,
.grid-credentials .dt-row { grid-template-columns: 2fr 2fr 1.5fr 1.5fr 2fr 36px; }

/* Step 8: Documents — 4 cols + delete */
.grid-documents .dt-header-row,
.grid-documents .dt-row { grid-template-columns: 2fr 2fr 1fr 2fr 36px; }

/* Step 11: Training — 6 cols + delete */
.grid-training .dt-header-row,
.grid-training .dt-row { grid-template-columns: 2fr 1.5fr 1.5fr 1.5fr 1fr 1fr 36px; }

/* Step 12: Invoices — 4 cols + delete */
.grid-invoices .dt-header-row,
.grid-invoices .dt-row { grid-template-columns: 2fr 1.5fr 1.5fr 1.5fr 36px; }

/* Step 13: Risks — 5 cols + delete */
.grid-risks .dt-header-row,
.grid-risks .dt-row { grid-template-columns: 1.5fr 3fr 1fr 1.5fr 1.5fr 36px; }

/* Step 14: Approvals — 5 cols + delete */
.grid-approvals .dt-header-row,
.grid-approvals .dt-row { grid-template-columns: 1.5fr 2fr 1.5fr 1.5fr 1.2fr 36px; }

/* Remove number arrows */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type="number"] {
  -moz-appearance: textfield;
}

/* Custom Toggle Checkbox */
.dt-row .toggle-check {
  display: flex !important;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  min-width: 0;
  height: 36px;
}
.dt-row .toggle-check input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  width: 20px !important;
  height: 20px !important;
  flex: 0 0 20px;
  border: 1px solid rgba(255,255,255,0.2) !important;
  border-radius: 4px !important;
  background: rgba(0,0,0,0.5) !important;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
  padding: 0 !important;
  margin: 0 !important;
}
.dt-row .toggle-check input[type="checkbox"]:checked {
  background: #ffeb3b !important;
  border-color: #ffeb3b !important;
}
.dt-row .toggle-check input[type="checkbox"]:checked::after {
  content: '';
  position: absolute;
  left: 6px;
  top: 2px;
  width: 5px;
  height: 10px;
  border: solid #000;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
.dt-row .toggle-check span {
  font-size: 13px;
  color: rgba(255,255,255,0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rm-btn {
  width: 32px;
  height: 32px;
  background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: 8px;
  color: rgba(239,68,68,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}
.rm-btn:hover { background: rgba(239,68,68,0.2); color: #ef4444; transform: scale(1.05); }
.dt-empty {
  text-align: center;
  padding: 40px;
  color: rgba(255,255,255,0.3);
  font-size: 14px;
  font-weight: 500;
}

/* Secure Notice */
.secure-notice {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(245,158,11,0.08);
  border: 1px solid rgba(245,158,11,0.2);
  border-radius: 12px;
  padding: 14px 20px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255,255,255,0.8);
  margin-bottom: 24px;
}
.secure-notice svg { color: #f59e0b; flex-shrink: 0; }

/* Toggle Check */
.toggle-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255,255,255,0.7);
  cursor: pointer;
}
.toggle-check input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #f59e0b;
  cursor: pointer;
}

/* === REVIEW PANEL === */
.review-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 40px;
}
.review-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  padding: 20px;
  transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
}
.review-card:hover { 
  background: rgba(255,255,255,0.06); 
  transform: translateY(-4px); 
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}
.review-card.highlight {
  background: rgba(245,158,11,0.08);
  border-color: rgba(245,158,11,0.25);
}
.rc-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: rgba(255,255,255,0.4); margin-bottom: 8px; font-weight: 600; }
.rc-val { font-size: 20px; font-weight: 700; color: #fff; }
.review-card.highlight .rc-val { color: #f59e0b; }
.review-actions {
  display: flex;
  gap: 16px;
  justify-content: flex-end;
}

/* === NAVIGATION DOCK === */
.nav-dock {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0 0;
  margin-top: auto;
  border-top: 1px solid rgba(255,255,255,0.06);
}
.dock-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.8);
  border-radius: 12px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
}
.dock-btn:hover:not(:disabled) { 
  background: rgba(255,255,255,0.12); 
  color: #fff; 
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.dock-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }
.dock-next {
  background: #ffeb3b; border-color: #ffeb3b; color: #000;
}
.dock-next:hover:not(:disabled) { 
  background: #fde047; color: #000; transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(255, 235, 59, 0.3);
}
.dock-dots { display: flex; gap: 8px; align-items: center; }
.dock-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.dock-dot.active { background: #f59e0b; width: 24px; border-radius: 4px; box-shadow: 0 0 8px rgba(245,158,11,0.4); }
.dock-dot.done { background: rgba(245,158,11,0.4); }

/* Spinner */
.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* === NANO MODAL DIALOG === */
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
.status-pill.internal-review { background: rgba(251, 191, 36, 0.1); color: #fbbf24; }

.nano-modal-subtext { font-size: 11px !important; color: rgba(255,255,255,0.3) !important; font-style: italic; }

.nano-modal-actions { display: flex; gap: 12px; }
.nano-btn {
  flex: 1; padding: 12px; border-radius: 12px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;
}
.nano-btn.primary { background: #fbbf24; color: #000; border: none; }
.nano-btn.primary:hover { background: #fcd34d; transform: translateY(-2px); }
.nano-btn.secondary { background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); }
.nano-btn.secondary:hover { background: rgba(255,255,255,0.1); }

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-up-enter-active { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

/* Requirement Indicators */
.req { color: #f87171; margin-left: 2px; }
.sub-req { font-size: 10px; color: #f87171; text-transform: none; letter-spacing: 0; font-weight: 500; margin-left: 8px; opacity: 0.8; }
</style>
