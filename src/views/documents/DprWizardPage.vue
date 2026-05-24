<template>
  <div class="dpr-wizard-wrapper">
    <!-- === TOP COMMAND BAR (Glassified) === -->
    <header class="dpr-command-bar glass-panel">
      <div class="cmd-left">
        <button class="cmd-back" @click="goBack">
          <ChevronLeft :size="18" />
        </button>
        <div class="cmd-title">
          <div class="cmd-badge">DPR PROPOSAL</div>
          <h1>{{ form.title || 'New DPR Proposal' }}</h1>
          <span class="cmd-version">{{ form.version }}</span>
        </div>
      </div>
      <div class="cmd-right">
        <button v-if="currentStep > 1" class="cmd-btn cmd-save ripple" @click="saveDraft" :disabled="isSaving">
          <Loader2 v-if="isSaving" :size="16" class="spin" />
          <Save v-else :size="16" /> 
          <span>{{ isSaving ? 'Saving Draft...' : 'Save Progress' }}</span>
        </button>
      </div>
    </header>

    <div class="dpr-body">
      <!-- LEFT: Creative Neon Stepper (Floating) -->
      <aside class="dpr-stepper-container">
        <div class="floating-stepper glass-panel">
          <div class="stepper-scroll nano-scroll">
            <div class="neon-trace" :style="{ transform: `translateY(${(currentStep - 1) * 56}px)` }"></div>
            <div
              v-for="step in steps"
              :key="step.id"
              class="step-node"
              :class="{ active: step.id === currentStep, done: step.id < currentStep }"
              @click="goToStep(step.id)"
            >
              <div class="step-icon-wrapper">
                <component :is="getStepIcon(step.id)" :size="14" />
                <div class="node-pulse" v-if="step.id === currentStep"></div>
              </div>
              <div class="step-info">
                <span class="step-label">Step {{ String(step.id).padStart(2, '0') }}</span>
                <span class="step-title">{{ step.title }}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- RIGHT: Content Area (Transparent) -->
      <main class="dpr-content-area unboxed">
        <div class="content-header">
          <div class="ch-badge">Module {{ currentStep }}/15</div>
          <h2>{{ steps[currentStep - 1].title }}</h2>
          <p class="ch-subtitle">{{ steps[currentStep - 1].subtitle }}</p>
        </div>

        <div class="form-wrapper">
          
          <!-- Step 1: Project Overview -->
          <section v-if="currentStep === 1" class="step-section animate-slide-in">
            <div class="sec-header mb-12">
              <div class="sec-icon large-glow"><FileText :size="32" /></div>
              <div class="sec-info">
                <h2 class="step-title-hero">Project Overview & Identity</h2>
                <p class="step-desc-hero">Define the high-level vision, core identity, and timeline boundaries of the project proposal.</p>
              </div>
            </div>
            <div class="grid-2 mt-8">
              <div class="input-card-group animate-float-math">
                <div class="icg-icon"><FileText :size="20" /></div>
                <div class="icg-content">
                  <label :class="{ 'error-label': errors.title }">Proposal Title <span class="required">*</span> <span v-if="errors.title" class="error-msg">- Required</span></label>
                  <input v-model="form.title" placeholder="e.g. Smart City Infrastructure Expansion" :class="{ 'error-border': errors.title }" />
                </div>
              </div>
              <div class="input-card-group animate-float-math" style="animation-delay: 0.2s">
                <div class="icg-icon"><Layers :size="20" /></div>
                <div class="icg-content">
                  <label>DPR Ref Code (Auto-generated)</label>
                  <input :value="form.dpr_code || 'TBD (Generated on Submission)'" readonly class="dimmed" />
                </div>
              </div>
              <div class="input-card-group animate-float-math" style="animation-delay: 0.4s">
                <div class="icg-icon"><Clock :size="20" /></div>
                <div class="icg-content">
                  <label :class="{ 'error-label': errors.start_date }">Estimated Start Date <span class="required">*</span> <span v-if="errors.start_date" class="error-msg">- Required</span></label>
                  <CompactDatePicker v-model="form.overview.start_date" :class="{ 'error-border': errors.start_date }" />
                </div>
              </div>
              <div class="input-card-group animate-float-math" style="animation-delay: 0.6s">
                <div class="icg-icon"><Clock :size="20" /></div>
                <div class="icg-content">
                  <label :class="{ 'error-label': errors.end_date }">Estimated End Date <span class="required">*</span> <span v-if="errors.end_date" class="error-msg">- Required</span></label>
                  <CompactDatePicker v-model="form.overview.end_date" :class="{ 'error-border': errors.end_date }" />
                </div>
              </div>
            </div>
            <div class="input-card-group mt-6">
              <div class="icg-icon"><Activity :size="20" /></div>
              <div class="icg-content">
                <label :class="{ 'error-label': errors.description }">Project Description & Executive Summary <span class="required">*</span> <span v-if="errors.description" class="error-msg">- Required</span></label>
                <textarea v-model="form.overview.description" rows="5" placeholder="Provide a high-level summary of the project..." :class="{ 'error-border': errors.description }"></textarea>
              </div>
            </div>
          </section>

          <!-- Step 2: Client Details -->
          <section v-if="currentStep === 2" class="step-section animate-slide-in">
            <div class="sec-header">
              <div class="sec-icon"><Users :size="24" /></div>
              <div class="sec-info">
                <h3>Client Details</h3>
                <p>Who is the target organization or client for this proposal?</p>
              </div>
            </div>
            <div class="grid-2 mt-8">
              <div class="input-card-group animate-row">
                <div class="icg-icon"><Users :size="20" /></div>
                <div class="icg-content">
                  <label :class="{ 'error-label': errors.client_name }">Client Name <span class="required">*</span> <span v-if="errors.client_name" class="error-msg">- Required</span></label>
                  <input v-model="form.client.client_name" placeholder="John Doe" :class="{ 'error-border': errors.client_name }" />
                </div>
              </div>
              <div class="input-card-group animate-row">
                <div class="icg-icon"><Building2 :size="20" /></div>
                <div class="icg-content">
                  <label :class="{ 'error-label': errors.organization }">Organization <span class="required">*</span> <span v-if="errors.organization" class="error-msg">- Required</span></label>
                  <input v-model="form.client.organization" placeholder="ACME Corp" :class="{ 'error-border': errors.organization }" />
                </div>
              </div>
              <div class="input-card-group animate-row">
                <div class="icg-icon"><Activity :size="20" /></div>
                <div class="icg-content">
                  <label :class="{ 'error-label': errors.email }">Email Address <span class="required">*</span> <span v-if="errors.email" class="error-msg">- Required</span></label>
                  <input v-model="form.client.email" placeholder="client@example.com" :class="{ 'error-border': errors.email }" />
                </div>
              </div>
              <div class="input-card-group animate-row">
                <div class="icg-icon"><Activity :size="20" /></div>
                <div class="icg-content">
                  <label :class="{ 'error-label': errors.phone }">Phone Number <span class="required">*</span> <span v-if="errors.phone" class="error-msg">- Required</span></label>
                  <input :value="form.client.phone" @input="form.client.phone = $event.target.value.replace(/[^0-9]/g, '')" placeholder="e.g. 1234567890" :class="{ 'error-border': errors.phone }" />
                </div>
              </div>
            </div>
            <div class="input-card-group mt-6">
               <div class="icg-icon"><Building2 :size="20" /></div>
               <div class="icg-content">
                  <label :class="{ 'error-label': errors.address }">Billing Address <span class="required">*</span> <span v-if="errors.address" class="error-msg">- Required</span></label>
                  <textarea v-model="form.client.address" rows="3" :class="{ 'error-border': errors.address }"></textarea>
               </div>
            </div>
          </section>

          <!-- Step 3: Problem Statement -->
          <section v-if="currentStep === 3" class="step-section animate-slide-in">
             <div class="sec-header">
                <div class="sec-icon"><AlertTriangle :size="24" /></div>
                <div class="sec-info">
                  <h3>Problem Statement</h3>
                  <p>Describe the current challenges this project aims to solve.</p>
                </div>
              </div>
              <div class="input-card-group mt-8 animate-row">
                <div class="icg-icon"><AlertTriangle :size="20" /></div>
                <div class="icg-content">
                  <label :class="{ 'error-label': errors.statement }">Core Problem Statement <span class="required">*</span> <span v-if="errors.statement" class="error-msg">- Required</span></label>
                  <textarea v-model="form.problem_statement.statement" rows="4" :class="{ 'error-border': errors.statement }"></textarea>
                </div>
              </div>
              <div class="input-card-group mt-6 animate-row">
                <div class="icg-icon"><Activity :size="20" /></div>
                <div class="icg-content">
                  <label :class="{ 'error-label': errors.current_challenges }">Current Challenges <span class="required">*</span> <span v-if="errors.current_challenges" class="error-msg">- Required</span></label>
                  <textarea v-model="form.problem_statement.current_challenges" rows="4" :class="{ 'error-border': errors.current_challenges }"></textarea>
                </div>
              </div>
          </section>

          <!-- Step 4: Objectives -->
          <section v-if="currentStep === 4" class="step-section animate-slide-in">
              <div class="sec-header flex-between">
                <div class="sec-title-group">
                  <div class="sec-icon"><Target :size="24" /></div>
                  <div class="sec-info">
                    <h3 :class="{ 'error-label': errors.objectives }">Project Objectives <span v-if="errors.objectives" class="error-msg" style="font-size:12px; margin-left:8px; text-transform:none; font-weight:normal;">- Minimum 1 required (fill all fields)</span></h3>
                    <p>What are the key goals and KPIs?</p>
                  </div>
                </div>
                <button class="add-btn-premium" @click="addObjective"><Plus :size="16" /> Add Objective</button>
              </div>
              <div class="item-list-editor mt-6">
                 <div v-for="(obj, i) in form.objectives" :key="i" class="item-row glass-card">
                    <div class="row-header">
                       <span class="row-num">Objective #{{ i + 1 }}</span>
                       <button class="row-del" @click="removeObjective(i)"><Trash2 :size="14" /></button>
                    </div>
                    <div class="grid-2">
                       <input v-model="obj.title" placeholder="Objective Title" :class="{ 'error-border': errors.objectives && !obj.title }" />
                       <SlaSelect 
                         v-model="obj.priority" 
                         :options="[
                           { value: 'High', label: 'High' },
                           { value: 'Medium', label: 'Medium' },
                           { value: 'Low', label: 'Low' }
                         ]"
                       />
                    </div>
                    <textarea v-model="obj.description" placeholder="Description/KPI..." class="mt-2" :class="{ 'error-border': errors.objectives && !obj.description }"></textarea>
                 </div>
              </div>
          </section>

          <!-- Step 5: Scope of Work -->
          <section v-if="currentStep === 5" class="step-section animate-slide-in">
              <div class="sec-header">
                <div class="sec-icon"><Layers :size="24" /></div>
                <div class="sec-info">
                  <h3>Scope of Work</h3>
                  <p>In-Scope vs Out-of-Scope boundaries.</p>
                </div>
              </div>
              <div class="grid-2 mt-8">
              <div class="input-card-group animate-row">
                <div class="icg-icon"><CheckCircle :size="20" /></div>
                <div class="icg-content">
                  <label :class="{ 'error-label': errors.in_scope }">In-Scope Deliverables <span class="required">*</span> <span v-if="errors.in_scope" class="error-msg">- Required</span></label>
                  <textarea v-model="form.scope.in_scope" rows="6" :class="{ 'error-border': errors.in_scope }"></textarea>
                </div>
              </div>
              <div class="input-card-group animate-row">
                <div class="icg-icon"><X :size="20" /></div>
                <div class="icg-content">
                  <label>Out-of-Scope (Exclusions)</label>
                  <textarea v-model="form.scope.out_of_scope" rows="6"></textarea>
                </div>
              </div>
            </div>
          </section>

          <!-- Step 6: Tech Architecture -->
          <section v-if="currentStep === 6" class="step-section animate-slide-in">
              <div class="sec-header">
                <div class="sec-icon"><Cpu :size="24" /></div>
                <div class="sec-info">
                  <h3>Technical Architecture</h3>
                  <p>Stack details and implementation logic.</p>
                </div>
              </div>
              <!-- Modular Tech Stack JSON approach -->
               <div class="grid-3 mt-8">
                <div class="input-card-group animate-row">
                  <div class="icg-icon"><Cpu :size="20" /></div>
                  <div class="icg-content">
                    <label>Backend Stack</label>
                    <input v-model="form.architecture.tech_stack.backend" placeholder="e.g. FastAPI, Python" />
                  </div>
                </div>
                <div class="input-card-group animate-row">
                  <div class="icg-icon"><Activity :size="20" /></div>
                  <div class="icg-content">
                    <label>Frontend Stack</label>
                    <input v-model="form.architecture.tech_stack.frontend" placeholder="e.g. Vue 3, Tailwind" />
                  </div>
                </div>
                <div class="input-card-group animate-row">
                  <div class="icg-icon"><Layers :size="20" /></div>
                  <div class="icg-content">
                    <label>Database/Infrastructure</label>
                    <input v-model="form.architecture.tech_stack.database" placeholder="e.g. PostgreSQL, AWS" />
                  </div>
                </div>
              </div>
              <div class="input-card-group mt-6 animate-row">
                <div class="icg-icon"><Activity :size="20" /></div>
                <div class="icg-content">
                  <label>Architecture Description</label>
                  <textarea v-model="form.architecture.description" rows="5"></textarea>
                </div>
              </div>
          </section>


          <!-- Step 7: Implementation Plan -->
          <section v-if="currentStep === 7" class="step-section animate-slide-in">
              <div class="sec-header">
                <div class="sec-icon"><Activity :size="24" /></div>
                <div class="sec-info">
                  <h3>Implementation Plan</h3>
                  <p>Define the execution methodology and deployment roadmap.</p>
                </div>
              </div>
              <div class="grid-1 mt-8">
                <div class="input-card-group animate-row">
                  <div class="icg-icon"><Activity :size="20" /></div>
                  <div class="icg-content">
                    <label>Methodology</label>
                    <SlaSelect 
                      v-model="form.implementation.methodology" 
                      :options="[
                        { value: 'Agile (Scrum/Kanban)', label: 'Agile (Scrum/Kanban)' },
                        { value: 'Waterfall', label: 'Waterfall' },
                        { value: 'Hybrid / V-Model', label: 'Hybrid / V-Model' },
                        { value: 'DevOps / Iterative', label: 'DevOps / Iterative' }
                      ]"
                    />
                  </div>
                </div>
                <div class="input-card-group mt-6 animate-row">
                  <div class="icg-icon"><Layers :size="20" /></div>
                  <div class="icg-content">
                    <label>Execution Phases</label>
                    <textarea v-model="form.implementation.phases" rows="5" placeholder="Phase 1: Discovery, Phase 2: Design..."></textarea>
                  </div>
                </div>
                <div class="input-card-group mt-6 animate-row">
                  <div class="icg-icon"><Target :size="20" /></div>
                  <div class="icg-content">
                    <label>Deployment Strategy</label>
                    <textarea v-model="form.implementation.deployment_strategy" rows="4" placeholder="How will the solution be rolled out?"></textarea>
                  </div>
                </div>
              </div>
          </section>

          <!-- Step 8: Timeline / Milestones -->
          <section v-if="currentStep === 8" class="step-section animate-slide-in">
              <div class="sec-header flex-between">
                <div class="sec-title-group">
                  <div class="sec-icon"><CheckCircle :size="24" /></div>
                  <div class="sec-info">
                    <h3>Timeline & Milestones</h3>
                    <p>Critical path deliverables and significant project events.</p>
                  </div>
                </div>
                <button class="add-btn-premium" @click="addMilestone"><Plus :size="16" /> Add Milestone</button>
              </div>
              <div class="item-list-editor mt-6">
                 <div v-for="(ms, i) in form.milestones" :key="i" class="item-row glass-card">
                    <div class="row-header">
                       <span class="row-num">Milestone #{{ i + 1 }}</span>
                       <button class="row-del" @click="removeMilestone(i)"><Trash2 :size="14" /></button>
                    </div>
                    <div class="grid-2">
                       <div class="input-group">
                          <label>Milestone Title</label>
                          <input v-model="ms.title" />
                       </div>
                       <div class="input-card-group animate-row">
                          <div class="icg-icon"><Calendar :size="16" /></div>
                          <div class="icg-content">
                             <label>Target Date</label>
                             <CompactDatePicker v-model="ms.due_date" />
                          </div>
                       </div>
                    </div>
                    <div class="input-group mt-3">
                       <label>Deliverables</label>
                       <textarea v-model="ms.deliverables" rows="2" placeholder="What will be handed over?"></textarea>
                    </div>
                 </div>
                 <div v-if="!form.milestones.length" class="empty-hint">Click the + icon to add your first milestone.</div>
              </div>
          </section>

          <!-- Step 9: Team Structure -->
          <section v-if="currentStep === 9" class="step-section animate-slide-in">
              <div class="sec-header flex-between">
                <div class="sec-title-group">
                   <div class="sec-icon"><Users :size="24" /></div>
                   <div class="sec-info">
                     <h3>Team Structure</h3>
                     <p>Identify key resource roles and their responsibilities.</p>
                   </div>
                </div>
                <button class="add-btn-premium" @click="addTeamMember"><Plus :size="16" /> Add Member</button>
              </div>
              <div class="item-list-editor mt-6">
                 <div v-for="(tm, i) in form.team" :key="i" class="item-row glass-card">
                    <div class="row-header">
                       <span class="row-num">Member #{{ i + 1 }}</span>
                       <button class="row-del" @click="removeTeamMember(i)"><Trash2 :size="14" /></button>
                    </div>
                    <div class="grid-2">
                       <input v-model="tm.name" placeholder="Full Name (or Role Title)" />
                       <input v-model="tm.role" placeholder="e.g. Lead Architect" />
                    </div>
                    <textarea v-model="tm.responsibility" placeholder="Primary responsibilities..." class="mt-2" rows="2"></textarea>
                 </div>
              </div>
          </section>

          <!-- Step 10: Budget & Costing -->
          <section v-if="currentStep === 10" class="step-section animate-slide-in">
              <div class="sec-header flex-between">
                <div class="sec-title-group">
                  <div class="sec-icon"><DollarSign :size="24" /></div>
                  <div class="sec-info">
                    <h3 :class="{ 'error-label': errors.budget_items }">Budget & Costing <span v-if="errors.budget_items" class="error-msg" style="font-size:12px; margin-left:8px; text-transform:none; font-weight:normal;">- Minimum 1 required (fill all fields)</span></h3>
                    <p>Detailed financial breakdown and estimation.</p>
                  </div>
                </div>
                <button class="add-btn-premium" @click="addBudgetItem">
                  <Plus :size="16" /> Add Item
                </button>
              </div>
              
              <div class="budget-card-container mt-6">
                 <div class="budget-items-list">
                    <div v-for="(item, i) in form.budget_items" :key="i" class="budget-item-card glass-card animate-row">
                       <div class="bic-grid">
                          <div class="input-group">
                             <label>Category</label>
                             <SlaSelect 
                               v-model="item.category" 
                               :options="[
                                 { value: 'Software/SaaS', label: 'Software/SaaS' },
                                 { value: 'Hardware', label: 'Hardware' },
                                 { value: 'Infrastructure', label: 'Infrastructure' },
                                 { value: 'Consulting', label: 'Consulting' },
                                 { value: 'Training', label: 'Training' },
                                 { value: 'Support', label: 'Support' }
                               ]"
                             />
                          </div>
                          <div class="input-group">
                             <label>Description</label>
                             <input v-model="item.description" placeholder="Item details..." :class="{ 'error-border': errors.budget_items && !item.description }" />
                          </div>
                          <div class="input-group">
                             <label>Amount (₹)</label>
                             <div class="amount-field-wrapper">
                                <span class="currency-symbol">₹</span>
                                <input type="text" inputmode="numeric" :value="item.amount" @input="item.amount = Number($event.target.value.replace(/[^0-9]/g, '')); calculateTotal()" class="no-spinner" :class="{ 'error-border': errors.budget_items && !item.amount }" />
                             </div>
                          </div>
                          <div class="action-group">
                            <button @click="removeBudgetItem(i)" class="btn-row-del"><Trash2 :size="16" /></button>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div v-if="form.budget_items.length" class="budget-summary-card glass-card mt-8">
                    <div class="bsc-info">
                       <h4>Grand Total Estimated Budget</h4>
                       <p>Aggregated cost across all identified financial segments.</p>
                    </div>
                    <div class="bsc-total">
                       <span class="sym">₹</span>
                       <span class="val">{{ formatNumber(form.budget.total_amount) }}</span>
                    </div>
                 </div>
              </div>
          </section>

          <!-- Step 11: Risk Assessment -->
          <section v-if="currentStep === 11" class="step-section animate-slide-in">
              <div class="sec-header flex-between">
                <div class="sec-title-group">
                   <div class="sec-icon"><AlertTriangle :size="24" /></div>
                   <div class="sec-info">
                     <h3>Risk Assessment</h3>
                     <p>Proactive identification of potential bottlenecks and mitigations.</p>
                   </div>
                </div>
                <button class="add-btn-premium" @click="addRisk"><Plus :size="16" /> Add Risk</button>
              </div>
              <div class="item-list-editor mt-6">
                 <div v-for="(risk, i) in form.risks" :key="i" class="item-row glass-card">
                    <div class="row-header">
                       <span class="row-num">Risk #{{ i + 1 }}</span>
                       <button class="row-del" @click="removeRisk(i)"><Trash2 :size="14" /></button>
                    </div>
                    <div class="grid-2">
                       <input v-model="risk.risk_description" placeholder="Risk Title/Description" />
                       <SlaSelect 
                         v-model="risk.impact" 
                         :options="[
                           { value: 'High', label: 'High' },
                           { value: 'Medium', label: 'Medium' },
                           { value: 'Low', label: 'Low' }
                         ]"
                       />
                    </div>
                    <textarea v-model="risk.mitigation_plan" placeholder="Proposed mitigation strategy..." class="mt-2" rows="2"></textarea>
                 </div>
              </div>
          </section>

          <!-- Step 12: Compliance -->
          <section v-if="currentStep === 12" class="step-section animate-slide-in">
              <div class="sec-header">
                <div class="sec-icon"><ShieldCheck :size="24" /></div>
                <div class="sec-info">
                  <h3>Compliance & Standards</h3>
                  <p>Legal standards, security policies, and regulatory requirements.</p>
                </div>
              </div>
              <div class="input-card-group mt-8 animate-row">
                <div class="icg-icon"><ShieldCheck :size="20" /></div>
                <div class="icg-content">
                  <label>Legal Requirements</label>
                  <textarea v-model="form.compliance.legal_requirements" rows="3"></textarea>
                </div>
              </div>
              <div class="input-card-group mt-6 animate-row">
                <div class="icg-icon"><FileText :size="20" /></div>
                <div class="icg-content">
                  <label>Regulatory Standards (ISO, HIPAA, etc.)</label>
                  <textarea v-model="form.compliance.regulatory_standards" rows="3"></textarea>
                </div>
              </div>
              <div class="input-card-group mt-6 animate-row">
                <div class="icg-icon"><Lock :size="20" /></div>
                <div class="icg-content">
                  <label>Security & Data Privacy Policies</label>
                  <textarea v-model="form.compliance.security_policies" rows="3"></textarea>
                </div>
              </div>
          </section>

          <!-- Step 13: Expected Outcomes -->
          <section v-if="currentStep === 13" class="step-section animate-slide-in">
               <div class="sec-header">
                <div class="sec-icon"><Activity :size="24" /></div>
                <div class="sec-info">
                  <h3>Expected Outcomes</h3>
                  <p>Defining the tangible and intangible ROI of the project.</p>
                </div>
              </div>
              <div class="grid-2 mt-8">
                <div class="input-card-group animate-row">
                  <div class="icg-icon"><Activity :size="20" /></div>
                  <div class="icg-content">
                    <label>Tangible Benefits (Quantitative)</label>
                    <textarea v-model="form.outcomes.tangible_benefits" rows="5"></textarea>
                  </div>
                </div>
                <div class="input-card-group animate-row">
                  <div class="icg-icon"><Heart :size="20" /></div>
                  <div class="icg-content">
                    <label>Intangible Benefits (Qualitative)</label>
                    <textarea v-model="form.outcomes.intangible_benefits" rows="5"></textarea>
                  </div>
                </div>
              </div>
              <div class="input-card-group mt-6 animate-row">
                <div class="icg-icon"><Target :size="20" /></div>
                <div class="icg-content">
                  <label>Success KPIs (Key Performance Indicators)</label>
                  <textarea v-model="form.outcomes.kpis" rows="3"></textarea>
                </div>
              </div>
          </section>

          <section v-if="currentStep === 14" class="step-section animate-slide-in">
              <div class="sec-header flex-between">
                <div class="sec-title-group">
                  <div class="sec-icon"><Package :size="24" /></div>
                  <div class="sec-info">
                    <h3>Supporting Attachments</h3>
                    <p>Upload diagrams, quotes, or reference documents.</p>
                  </div>
                </div>
                <button class="add-btn-premium" @click="addAttachment"><Plus :size="16" /> Add Attachment</button>
              </div>
              <div class="attachments-list mt-6">
                 <div v-for="(att, i) in form.attachments" :key="i" class="att-card glass-card animate-row">
                    <div class="att-grid">
                       <div class="input-group">
                          <label>File Display Name</label>
                          <input v-model="att.file_name" placeholder="e.g. Architecture Diagram" />
                       </div>
                       <div class="input-group">
                          <label>Type</label>
                          <SlaSelect 
                            v-model="att.file_type" 
                             :options="[
                               { value: 'PDF', label: 'PDF' },
                               { value: 'DOCX', label: 'DOCX' },
                               { value: 'Image (PNG/JPG)', label: 'Image (PNG/JPG)' },
                               { value: 'Link', label: 'External Resource' }
                             ]"
                          />
                       </div>
                       <div class="input-group">
                          <label>File / URL</label>
                          <div class="upload-field-wrapper">
                             <input v-model="att.file_url" placeholder="Paste URL or upload file..." />
                             <input type="file" :id="'file-upload-' + i" class="hidden-input" @change="e => handleFileUpload(e, i)" />
                             <button class="btn-icon-upload" @click="triggerUpload(i)" :disabled="att.isUploading">
                                <Loader2 v-if="att.isUploading" :size="14" class="spin" />
                                <Package v-else :size="14" />
                             </button>
                          </div>
                       </div>
                       <button @click="removeAttachment(i)" class="btn-row-del"><Trash2 :size="16" /></button>
                    </div>
                 </div>
              </div>
              <div v-if="!form.attachments.length" class="empty-hint text-center py-12">Click + to list supporting documents.</div>
          </section>

          <!-- Step 15: Review & Submit -->
          <section v-if="currentStep === 15" class="step-section animate-slide-in">
              <div class="sec-header">
                <div class="sec-icon"><ShieldCheck :size="24" /></div>
                <div class="sec-info">
                  <h3>Review & Finalize</h3>
                  <p>Comprehensive summary of your enterprise proposal.</p>
                </div>
              </div>
              <div class="review-grid mt-8">
                <div class="review-card"><div class="rc-label">Project</div><div class="rc-val">{{ form.title || 'Untitled Proposal' }}</div></div>
                <div class="review-card"><div class="rc-label">Client</div><div class="rc-val">{{ form.client.organization || '—' }}</div></div>
                <div class="review-card"><div class="rc-label">Timeline</div><div class="rc-val">{{ form.overview.start_date ? 'Detailed' : '—' }}</div></div>
                <div class="review-card"><div class="rc-label">Objectives</div><div class="rc-val">{{ form.objectives.length }} items</div></div>
                <div class="review-card"><div class="rc-label">Scope</div><div class="rc-val">{{ form.scope.in_scope ? 'Defined' : '—' }}</div></div>
                <div class="review-card"><div class="rc-label">Architecture</div><div class="rc-val">{{ form.architecture.tech_stack.backend ? 'Detailed' : 'Base' }}</div></div>
                <div class="review-card"><div class="rc-label">Implementation</div><div class="rc-val">{{ form.implementation.methodology }}</div></div>
                <div class="review-card"><div class="rc-label">Milestones</div><div class="rc-val">{{ form.milestones.length }} peaks</div></div>
                <div class="review-card"><div class="rc-label">Team Size</div><div class="rc-val">{{ form.team.length }} members</div></div>
                <div class="review-card highlight"><div class="rc-label">Financial</div><div class="rc-val">₹ {{ formatNumber(form.budget.total_amount) }}</div></div>
                <div class="review-card"><div class="rc-label">Risks Identified</div><div class="rc-val">{{ form.risks.length }} risks</div></div>
                <div class="review-card"><div class="rc-label">Attachments</div><div class="rc-val">{{ (form.attachments || []).length }} files</div></div>
              </div>
              <div class="submission-check mt-8 glass-card text-center p-12">
                 <div class="confetti-icon mb-6"><Sparkles :size="64" class="color-amber animate-pulse" /></div>
                 <h2 class="step-title-hero" style="font-size: 32px; margin-bottom: 16px;">Ready for Submission?</h2>
                 <p class="step-desc-hero mx-auto" style="font-size: 15px; max-width: 450px;">Once submitted, this proposal will be routed to the internal review committee for formal approval.</p>
              </div>
          </section>

        </div>

        <!-- Action Footer -->
        <footer class="content-footer glass-panel">
          <button class="footer-btn prev" @click="prevStep" :disabled="currentStep === 1">
            <ChevronLeft :size="18" /> Previous Section
          </button>
          <div class="step-dots">
            <div v-for="i in 15" :key="i" class="dot" :class="{ active: i === currentStep, done: i < currentStep }" @click="goToStep(i)"></div>
          </div>
          <button class="footer-btn next" @click="nextStep" v-if="currentStep < 15">
            Next Section <ChevronRight :size="18" />
          </button>
          <button class="footer-btn submit" @click="submitProposal" v-else :disabled="isSaving">
            <Loader2 v-if="isSaving" :size="18" class="spin" />
            <Sparkles v-else :size="18" /> Finalize & Submit Proposal
          </button>
        </footer>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import {
  ChevronLeft, ChevronRight, Save, Send, Check, ClipboardList, Users, 
  AlertTriangle, Target, Layers, Cpu, Package, DollarSign, Activity, 
  Settings, ShieldCheck, Sparkles, Plus, Trash2, X, Loader2, ArrowLeft,
  CheckCircle, FileText, Lock, Heart, Building2, Calendar, Clock
} from 'lucide-vue-next'

import { useToast } from '../../composables/useToast'
import SlaSelect from '../../components/ui/SlaSelect.vue'
import CompactDatePicker from '../../components/ui/CompactDatePicker.vue'
import { API } from '@/utils/api'

const router = useRouter()
const route = useRoute()
const { success: toastSuccess, error: toastError } = useToast()
const panelBase = computed(() => route.path.startsWith('/admin') ? '/admin' : '/user')
const isAdmin = computed(() => route.path.startsWith('/admin'))

const goBack = () => router.push(`${panelBase.value}/documents/dpr`)

const stepIcons = [
  ClipboardList, Users, AlertTriangle, Target, Layers, 
  Cpu, Activity, CheckCircle, Users, DollarSign, 
  AlertTriangle, ShieldCheck, Activity, Package, ShieldCheck
]

const getStepIcon = (idx) => stepIcons[idx - 1] || Settings

const currentStep = ref(1)
const isSaving = ref(false)
const dprId = ref(null)
const projectOptions = ref([])

const steps = [
  { id: 1, title: 'Project Overview', subtitle: 'Base Details' },
  { id: 2, title: 'Client Details', subtitle: 'Stakeholder Entity' },
  { id: 3, title: 'Problem Statement', subtitle: 'Executive Focus' },
  { id: 4, title: 'Project Objectives', subtitle: 'KPIs & Goals' },
  { id: 5, title: 'Scope of Work', subtitle: 'Boundaries' },
  { id: 6, title: 'Technical Architecture', subtitle: 'System Stack' },
  { id: 7, title: 'Implementation Plan', subtitle: 'Phasing Logic' },
  { id: 8, title: 'Timeline / Milestones', subtitle: 'Key Events' },
  { id: 9, title: 'Team Structure', subtitle: 'Resource Allocation' },
  { id: 10, title: 'Budget & Costing', subtitle: 'Financial Sheet' },
  { id: 11, title: 'Risk Assessment', subtitle: 'Mitigation' },
  { id: 12, title: 'Compliance', subtitle: 'Legal Standards' },
  { id: 13, title: 'Expected Outcomes', subtitle: 'ROI Analysis' },
  { id: 14, title: 'Attachments', subtitle: 'Legal Documents' },
  { id: 15, title: 'Review & Approvals', subtitle: 'Final Submission' }
]

const form = reactive({
  title: '',
  project_id: null,
  dpr_code: '',
  version: 'v1.0',
  status: 'Draft',
  overview: {
    project_name: '',
    project_code: '',
    start_date: '',
    end_date: '',
    description: ''
  },
  client: {
    client_name: '',
    organization: '',
    email: '',
    phone: '',
    address: ''
  },
  problem_statement: {
    statement: '',
    current_challenges: '',
    impact_analysis: ''
  },
  objectives: [],
  scope: {
    in_scope: '',
    out_of_scope: '',
    assumptions: '',
    constraints: ''
  },
  architecture: {
    description: '',
    tech_stack: { backend: '', frontend: '', database: '' },
    diagram_url: ''
  },
  implementation: {
    methodology: 'Agile',
    phases: '',
    deployment_strategy: ''
  },
  milestones: [],
  team: [],
  budget: {
    total_amount: 0,
    currency: 'INR',
    notes: ''
  },
  budget_items: [],
  risks: [],
  compliance: {
    legal_requirements: '',
    regulatory_standards: '',
    security_policies: ''
  },
  outcomes: {
    tangible_benefits: '',
    intangible_benefits: '',
    kpis: ''
  },
  attachments: [],
  approvals: []
})

const errors = ref({})

const validateStep = (stepIdx) => {
  const f = form
  errors.value = {}
  let isValid = true
  let newErrors = {}

  if (stepIdx === 1) {
    if (!f.title) { newErrors['title'] = true; isValid = false }
    if (!f.overview.start_date) { newErrors['start_date'] = true; isValid = false }
    if (!f.overview.end_date) { newErrors['end_date'] = true; isValid = false }
    if (!f.overview.description) { newErrors['description'] = true; isValid = false }
  }
  
  if (stepIdx === 2) {
    if (!f.client.client_name) { newErrors['client_name'] = true; isValid = false }
    if (!f.client.organization) { newErrors['organization'] = true; isValid = false }
    if (!f.client.email) { newErrors['email'] = true; isValid = false }
    if (!f.client.phone) { newErrors['phone'] = true; isValid = false }
    if (!f.client.address) { newErrors['address'] = true; isValid = false }
  }
  
  if (stepIdx === 3) {
    if (!f.problem_statement.statement) { newErrors['statement'] = true; isValid = false }
    if (!f.problem_statement.current_challenges) { newErrors['current_challenges'] = true; isValid = false }
  }
  
  if (stepIdx === 4) {
    if (!f.objectives || f.objectives.length === 0) {
      newErrors['objectives'] = true
      isValid = false
    } else {
      for (const obj of f.objectives) {
        if (!obj.title || !obj.description || !obj.priority) {
          newErrors['objectives'] = true
          isValid = false
        }
      }
    }
  }
  
  if (stepIdx === 5) {
    if (!f.scope.in_scope) { newErrors['in_scope'] = true; isValid = false }
  }
  
  if (stepIdx === 10) {
    if (!f.budget_items || f.budget_items.length === 0) {
      newErrors['budget_items'] = true
      isValid = false
    } else {
      for (const item of f.budget_items) {
        if (!item.category || !item.description || !item.amount) {
          newErrors['budget_items'] = true
          isValid = false
        }
      }
    }
  }

  if (!isValid) {
    setTimeout(() => { errors.value = newErrors }, 10)
  }
  return isValid
}

const goToStep = (s) => {
  if (s > currentStep.value) {
    let canProceed = true
    for (let i = currentStep.value; i < s; i++) {
       if (!validateStep(i)) {
          canProceed = false
          currentStep.value = i
          break
       }
    }
    if (canProceed) currentStep.value = s
  } else {
    currentStep.value = s
  }
}

const nextStep = () => {
  if (!validateStep(currentStep.value)) return
  if (currentStep.value < 15) currentStep.value++
}

const prevStep = () => { if (currentStep.value > 1) currentStep.value-- }

const addObjective = () => form.objectives.push({ title: '', description: '', priority: 'Medium' })
const removeObjective = (i) => form.objectives.splice(i, 1)

const addMilestone = () => form.milestones.push({ title: '', due_date: '', deliverables: '' })
const removeMilestone = (i) => form.milestones.splice(i, 1)

const addTeamMember = () => form.team.push({ name: '', role: '', responsibility: '' })
const removeTeamMember = (i) => form.team.splice(i, 1)

const addRisk = () => form.risks.push({ risk_description: '', impact: 'Medium', mitigation_plan: '' })
const removeRisk = (i) => form.risks.splice(i, 1)

const addAttachment = () => form.attachments.push({ file_name: '', file_url: '', file_type: 'PDF', isUploading: false })
const removeAttachment = (i) => form.attachments.splice(i, 1)

const triggerUpload = (i) => {
  document.getElementById(`file-upload-${i}`).click()
}

const handleFileUpload = async (event, i) => {
  const file = event.target.files[0]
  if (!file) return
  
  const att = form.attachments[i]
  att.isUploading = true
  
  const formData = new FormData()
  formData.append('file', file)
  
  try {
    const res = await axios.post(`${API}/uploads/dpr-attachment`, formData, {
      headers: { 
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'multipart/form-data'
      }
    })
    
    if (res.data.success) {
      att.file_url = res.data.file_url
      if (!att.file_name) att.file_name = res.data.original_filename
      toastSuccess('File uploaded successfully')
    }
  } catch (e) {
    console.error('Upload failed:', e)
    toastError(e.response?.data?.detail || 'Upload failed')
  } finally {
    att.isUploading = false
  }
}

const addBudgetItem = () => form.budget_items.push({ category: '', description: '', amount: 0 })
const removeBudgetItem = (i) => {
  form.budget_items.splice(i, 1)
  calculateTotal()
}

const calculateTotal = () => {
  form.budget.total_amount = form.budget_items.reduce((sum, item) => sum + (item.amount || 0), 0)
}

const formatNumber = (n) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })
const formatDate = (d) => d ? new Date(d).toLocaleDateString() : 'N/A'

const getToken = () => isAdmin.value ? localStorage.getItem('admin_token') : localStorage.getItem('user_token')

const saveDraft = async () => {
  if (!form.title) {
     toastError('Please provide a title before saving.')
     return
  }
  isSaving.value = true
  try {
    const config = { headers: { Authorization: `Bearer ${getToken()}` } }
    
    // Sanitize milestone dates (prevent 422 on empty strings)
    const sanitizedMilestones = (form.milestones || []).map(ms => ({
      ...ms,
      due_date: ms.due_date && String(ms.due_date).trim() ? ms.due_date : null
    }))

    const payload = { ...form, milestones: sanitizedMilestones }

    if (dprId.value) {
      await axios.put(`${API}/dpr/${dprId.value}`, payload, config)
    } else {
      const res = await axios.post(`${API}/dpr/`, payload, config)
      dprId.value = res.data.id
    }
    
    if (form.status === 'Internal Review') {
       toastSuccess('Proposal submitted for internal review!')
    } else {
       toastSuccess('Draft saved successfully!')
    }
  } catch (e) {
    console.error(e)
    const detail = e.response?.data?.detail
    if (Array.isArray(detail) && detail.length > 0) {
       toastError(`Validation Error: ${detail[0].msg}`)
    } else {
       toastError(e.response?.data?.detail || 'Failed to sync with server.')
    }
  } finally {
    isSaving.value = false
  }
}

const submitProposal = async () => {
  form.status = 'Internal Review'
  await saveDraft()
  setTimeout(() => {
    router.push(`${panelBase.value}/documents/dpr`)
  }, 1000)
}

const loadDpr = async (id) => {
  try {
    const res = await axios.get(`${API}/dpr/${id}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    Object.assign(form, res.data)
  } catch (e) {
    console.error('Failed to load DPR:', e)
  }
}

const mouseX = ref(0)
const mouseY = ref(0)
const handleMouseMove = (e) => {
  mouseX.value = (e.clientX / window.innerWidth - 0.5) * 20
  mouseY.value = (e.clientY / window.innerHeight - 0.5) * 20
  document.documentElement.style.setProperty('--mouse-x', `${mouseX.value}deg`)
  document.documentElement.style.setProperty('--mouse-y', `${mouseY.value}deg`)
}

onMounted(() => {
  const qId = route.query.edit
  if (qId) {
    dprId.value = qId
    loadDpr(qId)
  }
  window.addEventListener('mousemove', handleMouseMove)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
})
</script>

<style scoped>
/* === DESIGN SYSTEM TOKENS === */
:root {
  --accent-amber: #f59e0b;
  --accent-orange: #fb923c;
  --glass-bg: rgba(255, 255, 255, 0.03);
  --glass-border: rgba(255, 255, 255, 0.08);
  --deep-black: #050505;
}

/* === MAIN WRAPPER === */
.dpr-wizard-wrapper {
  position: relative;
  min-height: 100vh;
  background: #000 !important;
  color: #fff;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  display: flex;
  flex-direction: column;
}

/* === REMOVED SPATIAL BG PER USER REQUEST === */
.spatial-bg { display: none; }

@keyframes float {
  from { transform: translate(0, 0) scale(1); }
  to { transform: translate(50px, 100px) scale(1.1); }
}

.dpr-stepper-container { 
  width: 240px !important; 
  padding: 16px 0 16px 12px; 
  display: flex;
  flex-direction: column;
}
.floating-stepper {
  flex: 1;
  border-radius: 28px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: transparent; /* UNBOXED */
  border: none; /* UNBOXED */
}
.stepper-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
  max-height: calc(100vh - 120px);
  scrollbar-width: none; /* Hide for cleaner look */
}
.stepper-scroll::-webkit-scrollbar { display: none; }
.neon-trace {
  position: absolute;
  left: 28px;
  width: 2px;
  height: 32px;
  background: var(--accent-amber);
  box-shadow: 0 0 15px var(--accent-amber);
  transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 1;
}

/* === CARD-BASED INPUTS === */
.input-card-group {
  background: rgba(255,255,255,0.01);
  border: 1px solid rgba(255,255,255,0.03);
  border-radius: 12px;
  padding: 10px 16px;
  display: flex;
  gap: 12px;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
}
.input-card-group:hover, .input-card-group:focus-within {
  background: rgba(255,255,255,0.025);
  border-color: rgba(245, 158, 11, 0.25);
  transform: translateY(-1px);
  box-shadow: 0 10px 30px rgba(0,0,0,0.4);
}
.icg-icon {
  width: 48px; height: 48px; border-radius: 14px;
  background: rgba(255,255,255,0.03);
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.4);
  transition: all 0.3s;
}
.input-card-group:focus-within .icg-icon {
  background: rgba(245, 158, 11, 0.1);
  color: var(--accent-amber);
  transform: scale(1.05);
}
.icg-content { flex: 1; }
.icg-content label { 
  display: block; font-size: 10px; font-weight: 800; color: rgba(255,255,255,0.2); 
  text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;
}

/* === ADVANCED MATH ANIMATIONS === */
@keyframes floatDynamic {
  0% { transform: translateY(0) rotate(0); }
  25% { transform: translateY(-4px) rotate(0.2deg); }
  50% { transform: translateY(0) rotate(-0.2deg); }
  75% { transform: translateY(2px) rotate(0.1deg); }
  100% { transform: translateY(0) rotate(0); }
}
.animate-float-math { 
  animation: floatDynamic 8s infinite ease-in-out; 
  animation-delay: var(--float-delay, 0s);
}

@keyframes shimmerGlow {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
.shimmer-text {
  background: linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.2), transparent);
  background-size: 200% auto;
  animation: shimmerGlow 6s linear infinite;
}

.add-btn-premium {
  background: rgba(245, 158, 11, 0.05);
  border: 1px solid rgba(245, 158, 11, 0.2);
  color: var(--accent-amber);
  padding: 6px 14px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 11px;
  display: flex; align-items: center; gap: 4px;
  cursor: pointer; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.add-btn-premium:hover, .btn-icon-add:hover, .add-btn:hover {
  background: #fff !important;
  color: #000 !important;
  box-shadow: 0 0 30px rgba(255, 255, 255, 0.4) !important;
  transform: translateY(-1px) !important;
}
.flex-between { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.05); margin-bottom: 24px; }
.sec-title-group { display: flex; align-items: center; gap: 20px; }
.sec-icon { 
  width: 40px; height: 40px; border-radius: 10px; background: rgba(255,255,255,0.02); 
  display: flex; align-items: center; justify-content: center; color: var(--accent-amber);
}
.sec-info h3 { font-size: 18px; font-weight: 700; margin: 0 0 2px; letter-spacing: -0.3px; }
.sec-info p { font-size: 12px; color: rgba(255,255,255,0.3); margin: 0; }

/* === BUDGET UI OVERHAUL === */

/* FIX FOOTER VISIBILITY */
.dpr-body { height: calc(100vh - 100px); }
.dpr-content-area { 
  flex: 1; padding: 32px 48px; 
  display: flex; flex-direction: column; overflow-y: auto;
  scrollbar-gutter: stable;
}

.cmd-project-select.no-bg { background: transparent; border: none; padding-right: 0; }
.cmd-select.transparent select { background: transparent !important; border: none !important; }

/* === COMMAND BAR === */
.dpr-command-bar {
  height: 80px;
  padding: 0 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 100;
  background: rgba(10, 10, 10, 0.4);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.cmd-left { display: flex; align-items: center; gap: 20px; }
.cmd-back { 
  width: 40px; height: 40px; border-radius: 12px; background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1); color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.3s;
}
.cmd-back:hover { background: rgba(255,255,255,0.1); transform: scale(1.05); }
.cmd-title h1 { 
  font-size: 20px; 
  font-weight: 700; 
  margin: 0; 
  color: #fff;
  letter-spacing: -0.5px;
}
.cmd-badge {
  background: var(--accent-amber);
  color: #000;
  font-size: 9px;
  font-weight: 900;
  padding: 2px 8px;
  border-radius: 4px;
  letter-spacing: 1px;
  display: inline-block;
  margin-bottom: 4px;
}
.cmd-version { font-size: 11px; color: rgba(255,255,255,0.4); }

.cmd-save { 
  background: rgba(245, 158, 11, 0.08); 
  border: 1px solid rgba(245, 158, 11, 0.25); 
  color: var(--accent-amber);
  padding: 8px 20px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 13px;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
}
.cmd-save:hover:not(:disabled) { 
  background: #fff !important; 
  color: #000 !important; 
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(255, 255, 255, 0.4);
}
.cmd-save:hover span { color: #000 !important; }
.cmd-save:hover:not(:disabled) span { color: #000 !important; }
.cmd-save:disabled { opacity: 0.5; cursor: not-allowed; }

.dpr-body {
  flex: 1;
  display: grid;
  grid-template-columns: 240px 1fr !important;
  padding: 0 40px 120px;
  gap: 40px;
  z-index: 1;
}

/* === RESTORED UNBOXED STEPPER === */
.step-node {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  cursor: pointer;
  position: relative;
  z-index: 2;
  transition: all 0.3s;
}
.step-icon-wrapper {
  width: 22px; height: 22px; border-radius: 50%;
  background: rgba(255,255,255,0.03); 
  border: 1px solid rgba(255,255,255,0.05);
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.2); flex-shrink: 0;
}
.step-node.active .step-icon-wrapper {
  background: rgba(245, 158, 11, 0.1); 
  border-color: var(--accent-amber);
  color: var(--accent-amber);
}
.step-node.done .step-icon-wrapper {
  background: rgba(16, 185, 129, 0.1);
  border-color: #10b981;
  color: #10b981;
}
.step-info { display: flex; flex-direction: column; min-width: 0; }
.step-label { font-size: 8px; font-weight: 800; color: rgba(255,255,255,0.15); text-transform: uppercase; letter-spacing: 0.5px; }
.step-title { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.step-node.active .step-title { color: #fff; }
.step-node.active .step-label { color: var(--accent-amber); }

/* === CONTENT AREA === */
.dpr-content-area { 
  flex: 1; padding: 24px 0 120px;
  display: flex; flex-direction: column;
}
.content-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  animation: fadeInDown 0.6s backwards;
}
.ch-badge { font-size: 9px; font-weight: 800; color: var(--accent-amber); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1.5px; }
.content-header h2 { font-size: 24px; font-weight: 800; margin: 0 0 8px; letter-spacing: -0.5px; line-height: 1.1; }
.ch-subtitle { color: rgba(255,255,255,0.3); font-size: 13px; margin: 0; font-weight: 500; }

@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* === FORM PANELS === */
.step-section {
  animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.step-section .input-group:nth-child(1) { animation-delay: 0.1s; }
.step-section .input-group:nth-child(2) { animation-delay: 0.15s; }
.step-section .input-group:nth-child(3) { animation-delay: 0.2s; }
.step-section .input-group:nth-child(4) { animation-delay: 0.25s; }
.step-section .input-group:nth-child(5) { animation-delay: 0.3s; }
.step-section .grid-2 .input-group:nth-child(1) { animation-delay: 0.1s; }
.step-section .grid-2 .input-group:nth-child(2) { animation-delay: 0.15s; }
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.input-group { margin-bottom: 16px; opacity: 0; animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.input-group label { 
  display: block; font-size: 9px; font-weight: 800; color: rgba(255,255,255,0.2); 
  text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 6px; 
}
input, textarea {
  width: 100%;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.15); /* Hardened for visibility */
  border-radius: 16px;
  padding: 10px 16px;
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  outline: none;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
input:focus, textarea:focus {
  border-color: rgba(245, 158, 11, 0.3);
  background: rgba(255,255,255,0.04);
  box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.2);
}

.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }

.glass-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 16px;
  transition: all 0.3s;
}
.glass-card:hover { transform: translateY(-2px); background: rgba(255,255,255,0.04); }

.content-footer {
  position: fixed;
  bottom: 32px;
  right: 48px;
  left: auto;
  transform: none;
  width: auto;
  min-width: 680px;
  height: 64px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  background: rgba(10, 10, 10, 0.85);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 50px rgba(0,0,0,0.8);
  z-index: 1000;
  animation: slideUpFloat 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Budget Items (Step 10 Fix) */
.bic-grid { 
  display: grid; 
  grid-template-columns: 200px 1fr 180px 40px; 
  gap: 20px; 
  align-items: flex-end; 
}
.amount-field-wrapper { 
  position: relative; 
  display: flex; 
  align-items: center; 
}
.currency-symbol { 
  position: absolute; 
  left: 14px; 
  color: var(--accent-amber); 
  font-weight: 700; 
  font-size: 16px; 
}
.amount-field-wrapper input { padding-left: 32px !important; }

/* Attachment Card (Step 14 Fix) */
.att-grid { 
  display: grid; 
  grid-template-columns: 1fr 180px 1fr 40px; 
  gap: 16px; 
  align-items: flex-end; 
}
.upload-field-wrapper { position: relative; display: flex; align-items: center; }
.btn-icon-upload {
  position: absolute;
  right: 8px;
  width: 32px;
  height: 32px;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-amber);
  cursor: pointer;
  transition: all 0.3s;
}
.btn-icon-upload:hover { background: var(--accent-amber); color: #000; }
.hidden-input { display: none; }

.bsc-info h4 { font-size: 18px; margin: 0 0 4px; color: #fff; }
.bsc-info p { font-size: 12px; color: rgba(255,255,255,0.4); margin: 0; }
.bsc-total { text-align: right; }
.bsc-total .sym { font-size: 24px; color: var(--accent-amber); font-weight: 800; margin-right: 8px; }
.bsc-total .val { font-size: 32px; font-weight: 900; color: #fff; letter-spacing: -1px; }

@keyframes slideUpFloat {
  from { transform: translateX(-50%) translateY(100px); opacity: 0; }
  to { transform: translateX(-50%) translateY(0); opacity: 1; }
}

/* MATH ANIMATION HOVER */
.input-card-group {
  transform: perspective(1000px) rotateX(var(--input-rotate-x, 0)) rotateY(var(--input-rotate-y, 0));
}
.form-wrapper {
  flex: 1;
  padding-bottom: 40px;
}
.footer-btn {
  display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 8px; font-weight: 700; font-size: 11px; cursor: pointer; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); border: none;
}
.footer-btn.prev { background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.1); }
.footer-btn.next { 
   background: #f59e0b !important; /* HIGH CONTRAST AMBER */
   color: #000 !important; 
   box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4); 
   opacity: 1 !important;
}
.footer-btn.next:hover, .footer-btn.submit:hover { 
   background: #fff !important; 
   color: #000 !important; 
   box-shadow: 0 4px 40px rgba(255,255,255,0.5) !important; 
}
.footer-btn.submit { 
   background: #f59e0b !important; 
   color: #000 !important; 
   box-shadow: 0 4px 30px rgba(245, 158, 11, 0.4) !important; 
   opacity: 1 !important;
   visibility: visible !important;
}
.footer-btn:hover:not(:disabled) { transform: translateY(-2px); }
.footer-btn:disabled { opacity: 0.2; cursor: not-allowed; }

.step-dots { display: flex; gap: 8px; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.1); cursor: pointer; transition: all 0.4s; }
.dot.active { background: var(--accent-amber); width: 20px; border-radius: 4px; box-shadow: 0 0 10px rgba(245, 158, 11, 0.5); }
.dot.done { background: rgba(245, 158, 11, 0.4); }

/* SCROLLBAR */
.nano-scroll::-webkit-scrollbar { width: 4px; }
.nano-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* Responsive tweaks */
@media (max-width: 1200px) {
  .dpr-body { grid-template-columns: 80px 1fr; }
  .step-info { display: none; }
  .floating-stepper { padding: 32px 8px; }
}
/* === REVIEW PANEL (Handover Parity) === */
.review-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}
.review-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
}
.review-card:hover { 
  background: rgba(255,255,255,0.06); 
  transform: translateY(-2px); 
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.review-card.highlight {
  background: rgba(245,158,11,0.08);
  border-color: rgba(245,158,11,0.25);
}
.rc-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: rgba(255,255,255,0.4); margin-bottom: 4px; font-weight: 600; }
.rc-val { font-size: 16px; font-weight: 700; color: #fff; line-height: 1.2; }
.review-card.highlight .rc-val { color: #f59e0b; }

/* Dynamic Lists */
.dynamic-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.dynamic-item {
  padding: 24px;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.item-header span {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  color: #f59e0b;
  letter-spacing: 1px;
}
.remove-btn {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: none;
  width: 28px; height: 28px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}
.remove-btn:hover { background: #ef4444; color: #fff; }

/* Premium Buttons */
.tertiary {
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.7);
  justify-content: center;
  margin-top: 12px;
}
.tertiary:hover {
  background: rgba(245, 158, 11, 0.05);
  border-color: #f59e0b;
  color: #f59e0b;
}

/* Hide Spinners */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type=number] {
  -moz-appearance: textfield;
}

.mt-2 { margin-top: 8px; }
.mt-4 { margin-top: 16px; }
.mt-6 { margin-top: 24px; }
/* Hide Spinners */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type=number] {
  -moz-appearance: textfield;
}

/* Action Buttons Styles */
.btn-icon-add, .add-btn, .addItem {
  background: #fff !important;
  color: #000 !important;
  border: none !important;
  padding: 6px 14px !important;
  border-radius: 8px !important;
  font-weight: 700 !important;
  font-size: 11px !important;
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  cursor: pointer !important;
  transition: all 0.2s !important;
  box-shadow: 0 4px 15px rgba(255, 255, 255, 0.2) !important;
}
.btn-icon-add:hover, .add-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(245, 158, 11, 0.5) !important;
}

.sec-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 32px;
}
.sec-info h3 { font-size: 22px; font-weight: 700; color: #fff; margin: 0 0 4px; letter-spacing: -0.5px; }
.sec-info p { font-size: 15px; color: rgba(255, 255, 255, 0.5); margin: 0; }
.sec-icon { color: #f59e0b; filter: drop-shadow(0 0 10px rgba(245, 158, 11, 0.3)); }

.item-list-editor { display: flex; flex-direction: column; gap: 20px; }
.item-row { padding: 24px; border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 20px; }
.row-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.row-num { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #f59e0b; letter-spacing: 1px; }
.row-del { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: none; padding: 6px; border-radius: 8px; cursor: pointer; }
.row-del:hover { background: #ef4444; color: #fff; }

.mt-2 { margin-top: 4px; }
.mt-4 { margin-top: 8px; }
.mt-6 { margin-top: 12px; }
.mt-8 { margin-top: 16px; }
/* Shimmer Effect for Premium Buttons */
.ripple {
  position: relative;
  overflow: hidden;
}
.ripple::after {
  content: "";
  background: rgba(255, 255, 255, 0.3);
  display: block;
  position: absolute;
  border-radius: 50%;
  padding-top: 240%;
  padding-left: 240%;
  margin-top: -120%;
  margin-left: -120%;
  opacity: 0;
  transition: all 0.8s;
}
.ripple:active::after {
  padding-top: 0;
  padding-left: 0;
  margin-top: 0;
  margin-left: 0;
  opacity: 1;
  transition: 0s;
}

/* Glass Card Enhanced Borders */
.glass-card {
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: border-color 0.4s, transform 0.4s;
}
.glass-card:hover {
  border-color: rgba(245, 158, 11, 0.3);
}

/* Scrollbar Global (for the Content Area) */
.dpr-content-area::-webkit-scrollbar { width: 6px; }
.dpr-content-area::-webkit-scrollbar-track { background: transparent; }
.dpr-content-area::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
.dpr-content-area::-webkit-scrollbar-thumb:hover { background: rgba(245, 158, 11, 0.2); }

/* Nano Scroll for Sidebar */
.nano-scroll::-webkit-scrollbar { width: 2px; }
.nano-scroll::-webkit-scrollbar-thumb { background: rgba(245, 158, 11, 0.1); border-radius: 10px; }

.review-card { padding: 32px; border-radius: 28px; }
.card-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: rgba(255,255,255,0.3); letter-spacing: 1.5px; margin-bottom: 16px; }
.card-content h5 { font-size: 24px; font-weight: 800; margin: 0 0 8px; letter-spacing: -1px; }
.card-content span { font-size: 13px; color: rgba(255,255,255,0.4); font-weight: 500; }

.submission-check { padding: 64px 40px; border-radius: 32px; border: 1px solid rgba(245, 158, 11, 0.1); }
.submission-check h3 { font-size: 32px; font-weight: 800; margin: 24px 0 12px; letter-spacing: -1px; }
.submission-check p { font-size: 16px; color: rgba(255,255,255,0.5); max-width: 500px; margin: 0 auto; line-height: 1.6; }
.confetti-icon { color: #f59e0b; filter: drop-shadow(0 0 20px rgba(245, 158, 11, 0.4)); }

.btn-premium.wide { width: 100%; max-width: 400px; padding: 18px 0; font-size: 16px; }


.flex-center { display: flex; justify-content: center; align-items: center; }
.shadow-amber { box-shadow: 0 10px 40px rgba(245, 158, 11, 0.3) !important; }
.color-amber { color: var(--accent-amber) !important; }

/* Remove default arrows from inputs */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type=number] {
  -moz-appearance: textfield;
}
.shadow-amber-large { 
  box-shadow: 0 20px 60px rgba(245, 158, 11, 0.4), 0 0 100px rgba(245, 158, 11, 0.2) !important; 
}
.shadow-amber-large:hover { 
  box-shadow: 0 20px 80px rgba(245, 158, 11, 0.6), 0 0 120px rgba(245, 158, 11, 0.3) !important;
  transform: scale(1.02) translateY(-2px);
}

.icg-content :deep(.compact-datepicker-container) {
  background: transparent;
  border: none;
  padding: 0;
}
.icg-content :deep(.dp__input) {
  background: transparent;
  border: none;
  padding: 0;
  font-size: 16px;
  font-weight: 500;
  color: #fff;
}

/* === REVIEW CARDS === */
.review-card { padding: 24px; border-radius: 20px; }
.card-label { font-size: 10px; font-weight: 800; color: rgba(255,255,255,0.2); text-transform: uppercase; margin-bottom: 8px; }
.card-content h5 { font-size: 18px; margin: 0 0 4px; }
.prj-code { font-size: 12px; font-weight: 700; color: var(--accent-amber); opacity: 0.8; }

.btn-premium.wide { width: 100%; justify-content: center; padding: 12px; font-size: 14px; }

/* Validation Styles */
.error-msg {
  display: inline-block;
  animation: errorShake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  transform: translate3d(0, 0, 0);
  backface-visibility: hidden;
  color: #ff5252;
  font-size: 11px;
  margin-left: 4px;
}
@keyframes errorShake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
}
.required { color: #ff5252; text-shadow: 0 0 5px rgba(255,82,82,0.5); font-weight: bold; }
.error-label { color: #ff5252 !important; text-shadow: 0 0 5px rgba(255,82,82,0.5); }
.error-border { 
  border-color: #ff5252 !important; 
  box-shadow: 0 0 0 3px rgba(255,82,82,0.2) !important; 
  animation: errorShake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}
</style>
