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
      <!-- LEFT: Premium 15-Step Stepper (Re-imagined)
           Design language:
             - Layered glass shell with ambient drifting gold glow
             - Circular SVG progress ring in the header (animated dash-offset)
             - Vertical timeline rail that fills with a gold gradient as the
               user advances (animated height via motion-v)
             - Each step node is a motion-v <Motion> with reactive scale +
               magnetic hover, plus a check-mark morph when it moves to "done"
             - Active node has two outward-pulsing rings for a "live" pulse
             - Footer mini-stats (Done / Left) animate in last
           All motion uses motion-v reactive props so transitions are physics-
           based, not CSS keyframe stutter. -->
      <aside class="dpr-stepper-container">
        <div class="stepper-shell">

          <!-- ── Header: counter + circular progress ring ── -->
          <Motion class="stepper-header"
            :initial="{ opacity: 0, y: -8 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }"
          >
            <div class="header-text">
              <span class="header-eyebrow">DPR Proposal</span>
              <div class="header-counter">
                <span class="counter-current">{{ String(currentStep).padStart(2, '0') }}</span>
                <span class="counter-divider">/</span>
                <span class="counter-total">15</span>
              </div>
            </div>
            <div class="progress-ring">
              <svg viewBox="0 0 44 44" width="44" height="44" aria-hidden="true">
                <defs>
                  <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%"  stop-color="#fbbf24"/>
                    <stop offset="100%" stop-color="#f97316"/>
                  </linearGradient>
                </defs>
                <circle class="ring-bg" cx="22" cy="22" r="18" />
                <!-- SVG attribute transitions via CSS — more bulletproof than
                     wrapping <circle> in <Motion>; the dash offset animates the
                     ring fill smoothly via a CSS transition declared in the
                     .ring-fill rule below. -->
                <circle class="ring-fill" cx="22" cy="22" r="18"
                  :stroke-dashoffset="113.1 - (113.1 * currentStep / 15)" />
              </svg>
              <span class="ring-percent">{{ Math.round((currentStep / 15) * 100) }}<small>%</small></span>
            </div>
          </Motion>

          <!-- ── Rail with steps ── -->
          <div class="stepper-rail nano-scroll">
            <!-- Wrapper sizes to content so absolute lines extend through all
                 15 nodes even when the rail scrolls. -->
            <div class="rail-content">
              <!-- Background track -->
              <div class="rail-line"></div>
              <!-- Filled track — animated height -->
              <Motion class="rail-line-fill"
                :initial="{ height: '0%' }"
                :animate="{ height: `${((currentStep - 1) / 14) * 100}%` }"
                :transition="{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }"
              />

              <div class="rail-nodes">
              <Motion v-for="(step, idx) in steps" :key="step.id"
                as="div"
                class="rail-node"
                :class="{
                  active: step.id === currentStep,
                  done: step.id < currentStep,
                  future: step.id > currentStep
                }"
                :initial="{ opacity: 0, x: -14 }"
                :animate="{ opacity: 1, x: 0 }"
                :transition="{ delay: 0.08 + idx * 0.035, duration: 0.5, ease: [0.16, 1, 0.3, 1] }"
                :whileHover="step.id === currentStep ? { x: 0 } : { x: 4 }"
                :whileTap="{ scale: 0.97 }"
                @click="goToStep(step.id)"
              >
                <!-- Node circle with morphing icon -->
                <div class="node-circle-wrap">
                  <Motion as="div" class="node-circle"
                    :animate="{ scale: step.id === currentStep ? 1.18 : 1 }"
                    :transition="{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }"
                  >
                    <Transition name="node-icon" mode="out-in">
                      <Check v-if="step.id < currentStep" :key="'done-' + step.id" :size="13" />
                      <component v-else :is="getStepIcon(step.id)" :key="'step-' + step.id" :size="12" />
                    </Transition>
                  </Motion>
                  <!-- Twin pulse rings on active -->
                  <template v-if="step.id === currentStep">
                    <div class="node-pulse-ring"></div>
                    <div class="node-pulse-ring node-pulse-ring-2"></div>
                  </template>
                </div>

                <!-- Label content -->
                <div class="node-content">
                  <span class="node-eyebrow">Step {{ String(step.id).padStart(2, '0') }}</span>
                  <span class="node-title">{{ step.title }}</span>
                </div>

                <!-- Hover chevron -->
                <ChevronRight v-if="step.id !== currentStep" class="node-chev" :size="14" />
              </Motion>
              </div>
            </div>
          </div>

          <!-- ── Footer mini-stats ── -->
          <Motion class="stepper-footer"
            :initial="{ opacity: 0, y: 8 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ delay: 0.65, duration: 0.5, ease: [0.16, 1, 0.3, 1] }"
          >
            <div class="footer-stat">
              <span class="stat-num">{{ Math.max(currentStep - 1, 0) }}</span>
              <span class="stat-label">Done</span>
            </div>
            <div class="footer-stat">
              <span class="stat-num">{{ Math.max(15 - currentStep + 1, 0) }}</span>
              <span class="stat-label">Left</span>
            </div>
          </Motion>

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

          <!-- Step 15: Review & Submit — redesigned with staggered card entrance,
               warm gold accent on the highlighted Financial card, and an
               animated "Ready for Submission" hero with a pulsing glow ring. -->
          <section v-if="currentStep === 15" class="step-section animate-slide-in">
              <div class="sec-header">
                <div class="sec-icon"><ShieldCheck :size="24" /></div>
                <div class="sec-info">
                  <h3>Review &amp; Finalize</h3>
                  <p>Comprehensive summary of your enterprise proposal.</p>
                </div>
              </div>
              <div class="review-grid review-grid-modern mt-8">
                <div class="review-card review-card-modern" style="--rc-i:0"><div class="rc-label">Project</div><div class="rc-val">{{ form.title || 'Untitled Proposal' }}</div></div>
                <div class="review-card review-card-modern" style="--rc-i:1"><div class="rc-label">Client</div><div class="rc-val">{{ form.client.organization || '—' }}</div></div>
                <div class="review-card review-card-modern" style="--rc-i:2"><div class="rc-label">Timeline</div><div class="rc-val">{{ form.overview.start_date ? 'Detailed' : '—' }}</div></div>
                <div class="review-card review-card-modern" style="--rc-i:3"><div class="rc-label">Objectives</div><div class="rc-val">{{ form.objectives.length }} items</div></div>
                <div class="review-card review-card-modern" style="--rc-i:4"><div class="rc-label">Scope</div><div class="rc-val">{{ form.scope.in_scope ? 'Defined' : '—' }}</div></div>
                <div class="review-card review-card-modern" style="--rc-i:5"><div class="rc-label">Architecture</div><div class="rc-val">{{ form.architecture.tech_stack.backend ? 'Detailed' : 'Base' }}</div></div>
                <div class="review-card review-card-modern" style="--rc-i:6"><div class="rc-label">Implementation</div><div class="rc-val">{{ form.implementation.methodology }}</div></div>
                <div class="review-card review-card-modern" style="--rc-i:7"><div class="rc-label">Milestones</div><div class="rc-val">{{ form.milestones.length }} peaks</div></div>
                <div class="review-card review-card-modern" style="--rc-i:8"><div class="rc-label">Team Size</div><div class="rc-val">{{ form.team.length }} members</div></div>
                <div class="review-card review-card-modern highlight" style="--rc-i:9"><div class="rc-label">Financial</div><div class="rc-val">₹ {{ formatNumber(form.budget.total_amount) }}</div></div>
                <div class="review-card review-card-modern" style="--rc-i:10"><div class="rc-label">Risks Identified</div><div class="rc-val">{{ form.risks.length }} risks</div></div>
                <div class="review-card review-card-modern" style="--rc-i:11"><div class="rc-label">Attachments</div><div class="rc-val">{{ (form.attachments || []).length }} files</div></div>
              </div>
              <div class="submission-check submission-check-modern mt-8">
                 <div class="submission-ring"></div>
                 <div class="confetti-icon"><Sparkles :size="64" class="color-amber" /></div>
                 <h2 class="submission-hero">Ready for Submission?</h2>
                 <p class="submission-sub">Once submitted, this proposal will be routed to the internal review committee for formal approval.</p>
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
import { Motion } from 'motion-v'
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
  background: transparent;
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

/* ═══════════════════════════════════════════
   STEPPER v2 — Premium 15-step rail with motion-v.
   See template comments for design intent. Old .floating-stepper / .neon-trace
   / .step-node selectors are intentionally removed — they're not referenced
   anymore in the markup.
   ═══════════════════════════════════════════ */

.dpr-stepper-container {
  width: 280px !important;
  flex-shrink: 0;
  padding: 16px 8px 16px 16px;
  display: flex;
  flex-direction: column;
}

.stepper-shell {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 22px 16px 18px;
  border-radius: 28px;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(255,255,255,0.028) 0%, rgba(255,255,255,0.008) 100%);
  border: 1px solid rgba(255,255,255,0.06);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 10px 40px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04);
}
/* Ambient drifting gold aura — purely decorative, fixed in shell coordinate space */
.stepper-shell::before {
  content: '';
  position: absolute;
  top: -40%;
  left: -20%;
  width: 240px;
  height: 240px;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.08) 0%, transparent 60%);
  pointer-events: none;
  animation: stepperAura 11s ease-in-out infinite;
  z-index: 0;
}
.stepper-shell::after {
  content: '';
  position: absolute;
  bottom: -30%;
  right: -20%;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.06) 0%, transparent 65%);
  pointer-events: none;
  animation: stepperAura 14s ease-in-out -3s infinite reverse;
  z-index: 0;
}
@keyframes stepperAura {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50%      { transform: translate(28px, 40px) scale(1.18); }
}

/* ── Header ── */
.stepper-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 1;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.header-text { display: flex; flex-direction: column; gap: 6px; }
.header-eyebrow {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.35);
}
.header-counter {
  display: flex;
  align-items: baseline;
  gap: 3px;
  font-family: 'SF Mono', 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
}
.counter-current {
  font-size: 30px;
  font-weight: 900;
  line-height: 1;
  background: linear-gradient(135deg, #ffffff 0%, #fbbf24 60%, #f97316 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -1.5px;
}
.counter-divider {
  font-size: 18px;
  color: rgba(255,255,255,0.22);
  font-weight: 700;
}
.counter-total {
  font-size: 16px;
  color: rgba(255,255,255,0.35);
  font-weight: 700;
}

.progress-ring {
  position: relative;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
}
.progress-ring svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
  filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.35));
}
.ring-bg {
  fill: none;
  stroke: rgba(255,255,255,0.08);
  stroke-width: 3;
}
.ring-fill {
  fill: none;
  stroke: url(#ringGrad);
  stroke-width: 3.5;
  stroke-linecap: round;
  stroke-dasharray: 113.1; /* 2π × 18 */
  transition: stroke-dashoffset 0.9s cubic-bezier(0.16, 1, 0.3, 1);
}
.ring-percent {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  color: #fbbf24;
  font-family: 'SF Mono', monospace;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.3px;
}
.ring-percent small { font-size: 7px; opacity: 0.7; margin-left: 1px; }

/* ── Rail ── */
.stepper-rail {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 6px 4px 6px 0;
  z-index: 1;
}
.stepper-rail::-webkit-scrollbar { width: 3px; }
.stepper-rail::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.08);
  border-radius: 2px;
}
/* Inner wrapper sizes to content height (sum of all nodes), so the absolute
   rail-line and rail-line-fill extend through every step even when the parent
   scrolls. Without this, top/bottom absolute positioning would clamp to the
   rail's visible height (clipping the last few steps' line). */
.rail-content {
  position: relative;
  min-height: 100%;
}

/* Timeline track (background + fill) */
.rail-line {
  position: absolute;
  left: 27px;
  top: 18px;
  bottom: 12px;
  width: 2px;
  background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%);
  border-radius: 2px;
  z-index: 0;
}
.rail-line-fill {
  position: absolute;
  left: 27px;
  top: 18px;
  width: 2px;
  background: linear-gradient(180deg, #f97316 0%, #fbbf24 50%, #f59e0b 100%);
  border-radius: 2px;
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.7), 0 0 24px rgba(245, 158, 11, 0.35);
  z-index: 1;
  max-height: calc(100% - 30px);
}

.rail-nodes {
  display: flex;
  flex-direction: column;
  gap: 2px;
  position: relative;
  z-index: 2;
}

/* Node row */
.rail-node {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px 8px 0;
  border-radius: 14px;
  cursor: pointer;
  position: relative;
  user-select: none;
}
.rail-node.active {
  background: linear-gradient(90deg, rgba(245, 158, 11, 0.14) 0%, rgba(245, 158, 11, 0.02) 75%, transparent 100%);
}
.rail-node:hover:not(.active) {
  background: rgba(255,255,255,0.025);
}
.rail-node.future .node-circle { opacity: 0.85; }

/* Circle */
.node-circle-wrap {
  position: relative;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  margin-left: 16px;
}
.node-circle {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(20, 18, 16, 0.9);
  border: 1.5px solid rgba(255,255,255,0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.4);
  position: relative;
  z-index: 2;
  transition: background 0.4s cubic-bezier(0.16, 1, 0.3, 1),
              border-color 0.4s,
              color 0.4s,
              box-shadow 0.4s;
}
.rail-node.active .node-circle {
  background: linear-gradient(135deg, #f97316 0%, #fbbf24 100%);
  border-color: #fbbf24;
  color: #1a1410;
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.65),
              0 4px 14px rgba(245, 158, 11, 0.35),
              inset 0 1px 0 rgba(255, 255, 255, 0.4);
}
.rail-node.done .node-circle {
  background: rgba(16, 185, 129, 0.18);
  border-color: rgba(16, 185, 129, 0.55);
  color: #34d399;
}
.rail-node.future .node-circle {
  background: rgba(20, 18, 16, 0.6);
  border-color: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.25);
}

/* Pulse rings on active node */
.node-pulse-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(245, 158, 11, 0.5);
  pointer-events: none;
  z-index: 1;
  animation: nodePulse 2.4s cubic-bezier(0.16, 1, 0.3, 1) infinite;
}
.node-pulse-ring-2 { animation-delay: 1.2s; }
@keyframes nodePulse {
  0%   { transform: scale(1);   opacity: 0.65; }
  100% { transform: scale(2.3); opacity: 0; }
}

/* Icon morph transition (between step-icon and Check on completion) */
.node-icon-enter-active,
.node-icon-leave-active {
  transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.node-icon-enter-from { opacity: 0; transform: scale(0.4) rotate(-120deg); }
.node-icon-leave-to   { opacity: 0; transform: scale(0.4) rotate(120deg); position: absolute; }

/* Content */
.node-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 1px;
}
.node-eyebrow {
  font-size: 8.5px;
  font-weight: 800;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.25);
  transition: color 0.3s;
}
.rail-node.active .node-eyebrow { color: #fbbf24; }
.rail-node.done .node-eyebrow { color: rgba(52, 211, 153, 0.7); }

.node-title {
  font-size: 12.5px;
  font-weight: 600;
  color: rgba(255,255,255,0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.1px;
  transition: color 0.3s, font-weight 0.3s;
}
.rail-node.active .node-title { color: #fff; font-weight: 700; }
.rail-node.done .node-title { color: rgba(255,255,255,0.75); }

/* Hover chevron */
.node-chev {
  color: rgba(255,255,255,0.2);
  opacity: 0;
  transform: translateX(-6px);
  transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
              color 0.3s;
  flex-shrink: 0;
}
.rail-node:hover .node-chev {
  opacity: 1;
  transform: translateX(0);
  color: #fbbf24;
}

/* Footer */
.stepper-footer {
  display: flex;
  align-items: stretch;
  padding: 14px 4px 0;
  border-top: 1px solid rgba(255,255,255,0.05);
  position: relative;
  z-index: 1;
  gap: 12px;
}
.footer-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.footer-stat:first-child {
  border-right: 1px solid rgba(255,255,255,0.05);
}
.stat-num {
  font-size: 22px;
  font-weight: 900;
  color: #fff;
  font-family: 'SF Mono', 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
  letter-spacing: -1px;
  line-height: 1;
}
.stat-label {
  font-size: 9px;
  font-weight: 700;
  color: rgba(255,255,255,0.4);
  text-transform: uppercase;
  letter-spacing: 0.8px;
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

/* Floating bottom action dock — was pinned to right with `right: 48px`,
   now horizontally centered via left:50% + translateX(-50%) so it sits at
   the visual midline regardless of viewport width. */
.content-footer {
  position: fixed;
  bottom: 32px;
  left: 50%;
  right: auto;
  transform: translateX(-50%);
  width: auto;
  min-width: 680px;
  max-width: calc(100vw - 96px);
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
  to   { transform: translateX(-50%) translateY(0); opacity: 1; }
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

/* ═══════════════════════════════════════════
   LIGHT THEME OVERRIDES — preserve gold/amber/orange palette + transparency.
   Wrapper, command bar, and body all sit on the page's cream background
   (no opaque dark fills). Stepper + field cards get warm frosted-glass
   surfaces with visible borders.
   ═══════════════════════════════════════════ */

[data-theme="light"] .dpr-wizard-wrapper { color: var(--text-primary); }
[data-theme="light"] .dpr-body { background: transparent; }
[data-theme="light"] .dpr-content-area { background: transparent; }

/* ─── Command bar — frosted cream, no opaque black ─── */
[data-theme="light"] .dpr-command-bar {
  background: rgba(255, 250, 240, 0.78);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid rgba(180, 110, 30, 0.16);
  box-shadow: 0 4px 18px rgba(120, 80, 20, 0.04);
}
[data-theme="light"] .cmd-back {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.3);
  color: #b45309;
}
[data-theme="light"] .cmd-back:hover {
  background: rgba(245, 158, 11, 0.2);
  color: #92400e;
}
[data-theme="light"] .cmd-title h1 { color: var(--text-primary); }
[data-theme="light"] .cmd-version { color: #6b5840; }
[data-theme="light"] .cmd-badge {
  background: linear-gradient(135deg, #f59e0b, #fb923c);
  color: #fff;
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);
}
[data-theme="light"] .cmd-project-select {
  background: rgba(255, 250, 240, 0.78);
  border: 1px solid rgba(217, 119, 6, 0.32);
}
[data-theme="light"] .cmd-project-select:hover {
  background: rgba(255, 250, 240, 0.95);
  border-color: #d97706;
}
[data-theme="light"] .cmd-project-select :deep(.sla-select-trigger),
[data-theme="light"] .cmd-project-select :deep(.sla-select-trigger:hover),
[data-theme="light"] .cmd-project-select :deep(.sla-select-trigger.is-open) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  color: var(--text-primary) !important;
}
[data-theme="light"] .cmd-project-select :deep(.chevron) { color: #b45309 !important; }
[data-theme="light"] .cmd-project-select svg { color: #b45309; }
[data-theme="light"] .cmd-save {
  background: rgba(245, 158, 11, 0.1);
  color: #b45309;
  border: 1px solid rgba(245, 158, 11, 0.3);
}
[data-theme="light"] .cmd-save:hover:not(:disabled) {
  background: rgba(245, 158, 11, 0.22);
  color: #92400e;
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.22);
}
[data-theme="light"] .cmd-save:hover span { color: #92400e !important; }

/* ─── Stepper v2 — light theme: warm cream shell, gold accents, emerald done state ─── */
[data-theme="light"] .stepper-shell {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.88) 0%, rgba(255, 250, 240, 0.55) 100%);
  border: 1px solid rgba(180, 110, 30, 0.22);
  box-shadow: 0 14px 36px rgba(180, 110, 30, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.7);
}
[data-theme="light"] .stepper-shell::before {
  background: radial-gradient(circle, rgba(245, 158, 11, 0.16) 0%, transparent 60%);
}
[data-theme="light"] .stepper-shell::after {
  background: radial-gradient(circle, rgba(251, 191, 36, 0.12) 0%, transparent 65%);
}
[data-theme="light"] .stepper-header {
  border-bottom-color: rgba(180, 110, 30, 0.16);
}
[data-theme="light"] .header-eyebrow { color: #6b5840; }
[data-theme="light"] .counter-current {
  background: linear-gradient(135deg, #1a1410 0%, #b45309 60%, #d97706 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
[data-theme="light"] .counter-divider { color: rgba(180, 110, 30, 0.35); }
[data-theme="light"] .counter-total { color: #6b5840; }
[data-theme="light"] .ring-bg { stroke: rgba(180, 110, 30, 0.18); }
[data-theme="light"] .ring-percent { color: #b45309; }

[data-theme="light"] .rail-line {
  background: linear-gradient(180deg, rgba(180, 110, 30, 0.12) 0%, rgba(180, 110, 30, 0.2) 50%, rgba(180, 110, 30, 0.12) 100%);
}
/* rail-line-fill keeps the same gold gradient on both themes — already brand */

[data-theme="light"] .rail-node.active {
  background: linear-gradient(90deg, rgba(245, 158, 11, 0.22) 0%, rgba(245, 158, 11, 0.04) 75%, transparent 100%);
}
[data-theme="light"] .rail-node:hover:not(.active) {
  background: rgba(245, 158, 11, 0.08);
}
[data-theme="light"] .node-circle {
  background: rgba(255, 250, 240, 0.95);
  border-color: rgba(180, 110, 30, 0.32);
  color: rgba(107, 88, 64, 0.65);
}
[data-theme="light"] .rail-node.active .node-circle {
  background: linear-gradient(135deg, #f97316 0%, #fbbf24 100%);
  border-color: #d97706;
  color: #ffffff;
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.45),
              0 4px 14px rgba(245, 158, 11, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
[data-theme="light"] .rail-node.done .node-circle {
  background: rgba(16, 185, 129, 0.18);
  border-color: #047857;
  color: #047857;
}
[data-theme="light"] .rail-node.future .node-circle {
  background: rgba(255, 250, 240, 0.6);
  border-color: rgba(180, 110, 30, 0.18);
  color: rgba(107, 88, 64, 0.45);
}
[data-theme="light"] .node-pulse-ring {
  border-color: rgba(217, 119, 6, 0.55);
}
[data-theme="light"] .node-eyebrow { color: rgba(107, 88, 64, 0.5); }
[data-theme="light"] .rail-node.active .node-eyebrow { color: #b45309; }
[data-theme="light"] .rail-node.done .node-eyebrow { color: rgba(4, 120, 87, 0.85); }
[data-theme="light"] .node-title { color: #6b5840; }
[data-theme="light"] .rail-node.active .node-title { color: var(--text-primary); }
[data-theme="light"] .rail-node.done .node-title { color: #2e4a3a; }
[data-theme="light"] .node-chev { color: rgba(107, 88, 64, 0.35); }
[data-theme="light"] .rail-node:hover .node-chev { color: #b45309; }

[data-theme="light"] .stepper-footer {
  border-top-color: rgba(180, 110, 30, 0.14);
}
[data-theme="light"] .footer-stat:first-child {
  border-right-color: rgba(180, 110, 30, 0.14);
}
[data-theme="light"] .stat-num { color: var(--text-primary); }
[data-theme="light"] .stat-label { color: #6b5840; }
[data-theme="light"] .stepper-rail::-webkit-scrollbar-thumb {
  background: rgba(180, 110, 30, 0.22);
}

/* ─── Section / content headers ─── */
[data-theme="light"] .content-header { border-bottom-color: rgba(180, 110, 30, 0.14); }
[data-theme="light"] .sec-icon {
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
}
[data-theme="light"] .sec-info h3 { color: var(--text-primary); }
[data-theme="light"] .sec-info p { color: #6b5840; }
[data-theme="light"] .flex-between { border-bottom-color: rgba(180, 110, 30, 0.14); }

/* ─── Generic <input> / <textarea> base
       The wizard has a top-level `input, textarea { border: rgba(255,255,255,0.15) }`
       rule (line 1332) that applies to EVERY input across all 15 steps —
       including the plain inputs inside Objective / Milestone / Team / Budget /
       Risk item-rows (no .input-card-group wrapper). On cream that white-alpha
       border is invisible. Replace with a warm brown border that reads at rest. */
[data-theme="light"] .dpr-wizard-wrapper input,
[data-theme="light"] .dpr-wizard-wrapper textarea {
  background: rgba(255, 250, 240, 0.7);
  border: 1px solid rgba(180, 110, 30, 0.34);
  color: var(--text-primary);
}
[data-theme="light"] .dpr-wizard-wrapper input::placeholder,
[data-theme="light"] .dpr-wizard-wrapper textarea::placeholder {
  color: rgba(107, 88, 64, 0.5);
}
[data-theme="light"] .dpr-wizard-wrapper input:focus,
[data-theme="light"] .dpr-wizard-wrapper textarea:focus {
  border-color: #d97706;
  background: #fffaf0;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.18);
}
/* Inputs that sit INSIDE an .input-card-group already get the card's border —
   strip their own border + background so we don't get a double pill. */
[data-theme="light"] .input-card-group input,
[data-theme="light"] .input-card-group textarea {
  background: transparent;
  border: none;
  box-shadow: none;
}
[data-theme="light"] .input-card-group input:focus,
[data-theme="light"] .input-card-group textarea:focus {
  background: transparent;
  border: none;
  box-shadow: none;
}

/* ─── Input card groups (the core form atom)
       Border at rest needs to be visible on cream — dark mode used a barely-
       there 0.03 alpha because the surrounding black gave contrast for free.
       On cream we bump to ~0.34 (warm brown) so each field reads as a discrete
       card before focus/hover. Inner inputs share the warm border so date
       pickers, selects, and textareas all sit consistently. ─── */
[data-theme="light"] .input-card-group {
  background: rgba(255, 250, 240, 0.78);
  border: 1px solid rgba(180, 110, 30, 0.34);
  box-shadow: 0 2px 8px rgba(180, 110, 30, 0.04);
}
[data-theme="light"] .input-card-group:hover,
[data-theme="light"] .input-card-group:focus-within {
  background: rgba(255, 250, 240, 0.96);
  border-color: #d97706;
  box-shadow: 0 12px 32px rgba(180, 110, 30, 0.16), 0 0 0 3px rgba(245, 158, 11, 0.14);
}
[data-theme="light"] .icg-icon {
  background: rgba(245, 158, 11, 0.1);
  color: #b45309;
}
[data-theme="light"] .input-card-group:focus-within .icg-icon {
  background: rgba(245, 158, 11, 0.2);
  color: #92400e;
}
[data-theme="light"] .icg-content label { color: #6b5840; }
[data-theme="light"] .icg-content input,
[data-theme="light"] .icg-content textarea,
[data-theme="light"] .icg-content select {
  color: var(--text-primary);
  background: transparent;
}
[data-theme="light"] .icg-content input::placeholder,
[data-theme="light"] .icg-content textarea::placeholder {
  color: rgba(107, 88, 64, 0.5);
}

/* ─── Glass cards & buttons inside steps ─── */
[data-theme="light"] .glass-card {
  background: rgba(255, 250, 240, 0.78);
  border: 1px solid rgba(180, 110, 30, 0.18);
}
[data-theme="light"] .glass-card:hover {
  background: rgba(255, 250, 240, 0.95);
}
[data-theme="light"] .add-btn-premium {
  background: rgba(245, 158, 11, 0.14);
  border-color: rgba(245, 158, 11, 0.4);
  color: #b45309;
}
[data-theme="light"] .add-btn-premium:hover,
[data-theme="light"] .btn-icon-add:hover,
[data-theme="light"] .add-btn:hover {
  background: linear-gradient(135deg, #f59e0b, #fb923c) !important;
  color: #fff !important;
  box-shadow: 0 6px 20px rgba(245, 158, 11, 0.45) !important;
}

/* Budget / amount tiles */
[data-theme="light"] .currency-symbol { color: #b45309; }
[data-theme="light"] .bsc-info h4 { color: var(--text-primary); }
[data-theme="light"] .bsc-info p { color: #6b5840; }
[data-theme="light"] .bsc-total .sym { color: #b45309; }
[data-theme="light"] .bsc-total .val { color: var(--text-primary); }

/* Upload icon button */
[data-theme="light"] .btn-icon-upload {
  background: rgba(245, 158, 11, 0.16);
  border-color: rgba(245, 158, 11, 0.4);
  color: #b45309;
}
[data-theme="light"] .btn-icon-upload:hover {
  background: linear-gradient(135deg, #f59e0b, #fb923c);
  color: #fff;
}

/* ─── Floating bottom dock (content-footer) ─── */
[data-theme="light"] .content-footer {
  background: rgba(255, 250, 240, 0.92);
  border: 1px solid rgba(180, 110, 30, 0.22);
  box-shadow: 0 20px 50px rgba(120, 80, 20, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.6);
}
[data-theme="light"] .footer-btn.prev {
  background: rgba(26, 20, 16, 0.05);
  color: var(--text-primary);
  border-color: rgba(26, 20, 16, 0.14);
}
[data-theme="light"] .footer-btn.prev:hover:not(:disabled) {
  background: rgba(245, 158, 11, 0.1);
  color: #b45309;
}
[data-theme="light"] .footer-btn.next,
[data-theme="light"] .footer-btn.submit {
  background: linear-gradient(135deg, #f59e0b, #fb923c) !important;
  color: #fff !important;
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35) !important;
}
[data-theme="light"] .footer-btn.next:hover:not(:disabled),
[data-theme="light"] .footer-btn.submit:hover {
  background: linear-gradient(135deg, #fbbf24, #f59e0b) !important;
  color: #fff !important;
  box-shadow: 0 8px 22px rgba(245, 158, 11, 0.5) !important;
}
[data-theme="light"] .dot {
  background: rgba(180, 110, 30, 0.2);
}
[data-theme="light"] .dot.active {
  background: #d97706;
  box-shadow: 0 0 12px rgba(217, 119, 6, 0.5);
}
[data-theme="light"] .dot.done {
  background: rgba(217, 119, 6, 0.45);
}

/* Scrollbar */
[data-theme="light"] .nano-scroll::-webkit-scrollbar-thumb {
  background: rgba(180, 110, 30, 0.22);
}

/* ═══════════════════════════════════════════
   STEP 15 — REVIEW & FINALIZE (modern redesign)
   Staggered card entrance, gold-tinted highlight tile, animated submission
   hero with pulsing glow ring. Works on both themes — the review-card-modern
   base uses brand-neutral surfaces, light-theme overrides flip text.
   ═══════════════════════════════════════════ */

.review-grid-modern {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 32px;
}
.review-card-modern {
  position: relative;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 18px 18px 20px;
  overflow: hidden;
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1),
              border-color 0.5s, background 0.5s, box-shadow 0.5s;
  animation: reviewCardIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(var(--rc-i, 0) * 60ms + 80ms);
}
.review-card-modern::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, transparent 60%, rgba(245, 158, 11, 0.06) 100%);
  opacity: 0;
  transition: opacity 0.4s;
  pointer-events: none;
}
.review-card-modern:hover {
  transform: translateY(-6px);
  border-color: rgba(245, 158, 11, 0.4);
  box-shadow: 0 16px 36px rgba(245, 158, 11, 0.16);
}
.review-card-modern:hover::before { opacity: 1; }
.review-card-modern.highlight {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.14) 0%, rgba(251, 191, 36, 0.08) 100%);
  border-color: rgba(245, 158, 11, 0.45);
  box-shadow: 0 10px 28px rgba(245, 158, 11, 0.22);
}
.review-card-modern.highlight .rc-val { color: #f59e0b; }
@keyframes reviewCardIn {
  from { opacity: 0; transform: translateY(20px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.submission-check-modern {
  position: relative;
  padding: 64px 40px 56px;
  border-radius: 28px;
  border: 1px solid rgba(245, 158, 11, 0.22);
  background: radial-gradient(circle at 50% 30%, rgba(245, 158, 11, 0.12) 0%, transparent 60%),
              rgba(255, 255, 255, 0.02);
  text-align: center;
  overflow: hidden;
  animation: submissionIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 0.9s;
}
.submission-ring {
  position: absolute;
  top: 56px;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.22) 0%, transparent 70%);
  animation: ringPulse 2.4s ease-in-out infinite;
  pointer-events: none;
}
.submission-check-modern .confetti-icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(251, 191, 36, 0.1));
  border: 1px solid rgba(245, 158, 11, 0.35);
  margin: 0 auto 28px;
  color: #f59e0b;
  filter: drop-shadow(0 0 24px rgba(245, 158, 11, 0.45));
  animation: confettiFloat 4s ease-in-out infinite;
}
.submission-hero {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.8px;
  margin: 0 0 14px;
  color: #fff;
  background: linear-gradient(120deg, #fff 0%, #fbbf24 50%, #fff 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: heroShimmer 5s linear infinite;
}
.submission-sub {
  font-size: 15px;
  max-width: 460px;
  margin: 0 auto;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.6;
}
@keyframes submissionIn {
  from { opacity: 0; transform: translateY(30px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ringPulse {
  0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.6; }
  50%      { transform: translateX(-50%) scale(1.18); opacity: 0.9; }
}
@keyframes confettiFloat {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-6px); }
}
@keyframes heroShimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}

/* ─── Light theme overrides for Step 15 ─── */
[data-theme="light"] .review-card-modern {
  background: rgba(255, 250, 240, 0.78);
  border: 1px solid rgba(180, 110, 30, 0.28);
  box-shadow: 0 4px 14px rgba(180, 110, 30, 0.06);
}
[data-theme="light"] .review-card-modern:hover {
  border-color: rgba(245, 158, 11, 0.55);
  box-shadow: 0 16px 36px rgba(245, 158, 11, 0.22);
}
[data-theme="light"] .review-card-modern .rc-label { color: #6b5840; }
[data-theme="light"] .review-card-modern .rc-val { color: var(--text-primary); }
[data-theme="light"] .review-card-modern.highlight {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(251, 191, 36, 0.1) 100%);
  border-color: rgba(217, 119, 6, 0.5);
}
[data-theme="light"] .review-card-modern.highlight .rc-val { color: #b45309; }

[data-theme="light"] .submission-check-modern {
  background: radial-gradient(circle at 50% 30%, rgba(245, 158, 11, 0.18) 0%, transparent 60%),
              rgba(255, 250, 240, 0.85);
  border-color: rgba(245, 158, 11, 0.35);
  box-shadow: 0 16px 40px rgba(180, 110, 30, 0.12);
}
[data-theme="light"] .submission-hero {
  background: linear-gradient(120deg, #1a1410 0%, #b45309 50%, #1a1410 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
[data-theme="light"] .submission-sub { color: #6b5840; }
[data-theme="light"] .submission-check-modern .confetti-icon {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(251, 191, 36, 0.14));
  border-color: rgba(217, 119, 6, 0.45);
  color: #b45309;
  filter: drop-shadow(0 0 28px rgba(245, 158, 11, 0.4));
}
</style>
