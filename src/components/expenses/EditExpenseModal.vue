<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <Motion
          class="modal-content glass-panel"
          :initial="{ opacity: 0, y: 32, scale: 0.94 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 20, scale: 0.96 }"
          :transition="{ duration: 0.50, ease: [0.16, 1, 0.3, 1] }"
        >
          <!-- Aura accent -->
          <div class="panel-aura" aria-hidden="true"></div>

          <!-- Header -->
          <Motion
            class="modal-header"
            :initial="{ opacity: 0, y: 8 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.36, delay: 0.12, ease: [0.16, 1, 0.3, 1] }"
          >
            <div class="header-text">
              <h2>Edit Expense</h2>
              <p class="expense-id">{{ expense?.id ? `EXP-${String(expense.id).substring(0,8).toUpperCase()}` : '' }}</p>
            </div>
            <Motion
              as="button"
              type="button"
              class="close-btn"
              :whileHover="{ rotate: 90, scale: 1.05 }"
              :whileTap="{ scale: 0.94 }"
              :transition="{ duration: 0.30, ease: [0.16, 1, 0.3, 1] }"
              @click="close"
            >
              <X :size="20" />
            </Motion>
          </Motion>

          <!-- Progress Steps -->
          <div class="progress-container">
            <div class="step-indicators">
              <div
                v-for="(step, index) in steps"
                :key="index"
                class="step-dot"
                :class="{ active: currentStep === index, completed: currentStep > index }"
                @click="goToStep(index)"
              >
                <Check v-if="currentStep > index" :size="12" />
                <component v-else :is="step.icon" :size="14" />
                <span class="step-label">{{ step.label }}</span>
              </div>
            </div>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
            </div>
          </div>

          <!-- Body -->
          <div class="modal-body">
            <Transition :name="slideDirection" mode="out-in">

              <!-- Step 1: Basic Info -->
              <div v-if="currentStep === 0" key="s0" class="step-content">
                <div class="step-header"><ClipboardList :size="20" /><span>Basic Information</span></div>
                <div class="form-grid">
                  <div class="form-group">
                    <label>Expense Title <span class="req">*</span></label>
                    <input v-model="form.title" type="text" placeholder="e.g. Travel to Client Site" class="text-input" :class="{ 'has-error': v.title }" />
                    <span v-if="v.title" class="field-error"><AlertTriangle :size="11" /> Title is required</span>
                  </div>
                  <div class="form-group">
                    <label>Category <span class="req">*</span></label>
                    <CustomSelect v-model="form.category" :options="categoryOptions" placeholder="Select category" labelKey="label" valueKey="value" :error="v.category" />
                    <span v-if="v.category" class="field-error"><AlertTriangle :size="11" /> Category is required</span>
                  </div>
                  <div class="form-group">
                    <label>Expense Date <span class="req">*</span></label>
                    <DatePicker v-model="form.expense_date" placeholder="Select date" :error="v.expense_date" :maxDate="todayStr" />
                    <span v-if="v.expense_date" class="field-error"><AlertTriangle :size="11" /> Date required</span>
                  </div>
                  <div class="form-group">
                    <label>Expense Type <span class="req">*</span></label>
                    <CustomSelect v-model="form.expense_type" :options="typeOptions" placeholder="Select type" labelKey="label" valueKey="value" :error="v.expense_type" />
                    <span v-if="v.expense_type" class="field-error"><AlertTriangle :size="11" /> Type required</span>
                  </div>
                  <div class="form-group">
                    <label>Department</label>
                    <input v-model="form.department" type="text" placeholder="e.g. Engineering" class="text-input" />
                  </div>
                  <div class="form-group">
                    <label>Cost Center</label>
                    <input v-model="form.cost_center" type="text" placeholder="e.g. CC-100" class="text-input" />
                  </div>
                  <div class="form-group">
                    <label>Priority</label>
                    <div class="chip-row">
                      <button v-for="p in ['low','medium','high','critical']" :key="p" class="chip" :class="{ active: form.priority === p, [p]: form.priority === p }" @click="form.priority = p">{{ p }}</button>
                    </div>
                  </div>
                  <div class="form-group full">
                    <label>Description <span class="req">*</span></label>
                    <textarea v-model="form.description" rows="3" placeholder="Brief description..." class="text-input" :class="{ 'has-error': v.description }"></textarea>
                    <span v-if="v.description" class="field-error"><AlertTriangle :size="11" /> Description required</span>
                  </div>
                </div>
              </div>

              <!-- Step 2: Financial -->
              <div v-else-if="currentStep === 1" key="s1" class="step-content">
                <div class="step-header"><DollarSign :size="20" /><span>Financial Details</span></div>
                <div class="form-grid">
                  <div class="form-group">
                    <label>Amount <span class="req">*</span></label>
                    <div class="input-with-prefix" :class="{ 'has-error': v.amount }">
                      <span class="prefix">{{ currencySymbol }}</span>
                      <input v-model.number="form.amount" type="text" inputmode="decimal" placeholder="0.00" class="text-input mono no-arrows" @keypress="onlyNumeric" />
                    </div>
                    <span v-if="v.amount" class="field-error"><AlertTriangle :size="11" /> Amount required</span>
                  </div>
                  <div class="form-group">
                    <label>Currency</label>
                    <CustomSelect v-model="form.currency" :options="currencyOptions" placeholder="Currency" labelKey="label" valueKey="value" />
                  </div>
                  <div class="form-group">
                    <label>Payment Method</label>
                    <div class="chip-row">
                      <button v-for="m in ['cash','bank','card','online']" :key="m" class="chip" :class="{ active: form.payment_method === m }" @click="form.payment_method = m">
                        <component :is="paymentIcons[m]" :size="13" /> {{ m }}
                      </button>
                    </div>
                  </div>
                  <div class="form-group">
                    <label>Payment Status</label>
                    <div class="chip-row">
                      <button v-for="s in ['paid','unpaid','partial']" :key="s" class="chip" :class="{ active: form.payment_status === s }" @click="form.payment_status = s">{{ s }}</button>
                    </div>
                  </div>
                  <div class="form-group full">
                    <label class="switch-label" @click="form.is_recurring = !form.is_recurring">
                      <span class="switch-track" :class="{ on: form.is_recurring }"><span class="switch-thumb"></span></span>
                      Recurring Expense
                    </label>
                  </div>
                  <div v-if="form.is_recurring" class="form-group">
                    <label>Installments</label>
                    <input v-model.number="form.installment_count" type="text" inputmode="numeric" placeholder="Number of installments" class="text-input no-arrows" />
                  </div>
                </div>
              </div>

              <!-- Step 3: Vendor -->
              <div v-else-if="currentStep === 2" key="s2" class="step-content">
                <div class="step-header"><Building2 :size="20" /><span>Vendor & Invoice Info</span></div>
                <div class="form-grid">
                  <div class="form-group">
                    <label>Vendor Name <span class="req">*</span></label>
                    <input v-model="form.vendor_name" type="text" placeholder="e.g. Acme Corp" class="text-input" :class="{ 'has-error': v.vendor_name }" />
                    <span v-if="v.vendor_name" class="field-error"><AlertTriangle :size="11" /> Required</span>
                  </div>
                  <div class="form-group">
                    <label>Vendor Type <span class="req">*</span></label>
                    <div class="chip-row" :class="{ 'chip-error': v.vendor_type }">
                      <button class="chip" :class="{ active: form.vendor_type === 'internal' }" @click="form.vendor_type = 'internal'"><Building2 :size="13" /> Internal</button>
                      <button class="chip" :class="{ active: form.vendor_type === 'external' }" @click="form.vendor_type = 'external'"><Globe :size="13" /> External</button>
                    </div>
                    <span v-if="v.vendor_type" class="field-error"><AlertTriangle :size="11" /> Select type</span>
                  </div>
                  <div class="form-group">
                    <label>Vendor Contact</label>
                    <input v-model="form.vendor_contact" type="text" placeholder="Phone or email" class="text-input" />
                  </div>
                  <div class="form-group">
                    <label>Vendor Tax ID</label>
                    <input v-model="form.vendor_tax_id" type="text" placeholder="GSTIN / TIN" class="text-input" />
                  </div>
                  <div class="form-group">
                    <label>Invoice Number</label>
                    <input v-model="form.invoice_number" type="text" placeholder="INV-001" class="text-input" />
                  </div>
                  <div class="form-group">
                    <label>Invoice Date</label>
                    <DatePicker v-model="form.invoice_date" placeholder="Select date" />
                  </div>
                  <div class="form-group full">
                    <label>Purchase Order Ref</label>
                    <input v-model="form.purchase_order_ref" type="text" placeholder="PO-2025-001" class="text-input" />
                  </div>
                </div>
              </div>

              <!-- Step 4: Tax -->
              <div v-else-if="currentStep === 3" key="s3" class="step-content">
                <div class="step-header"><Receipt :size="20" /><span>Tax Calculations</span></div>
                <div class="form-grid">
                  <div class="form-group full">
                    <label class="switch-label" @click="form.tax_applicable = !form.tax_applicable">
                      <span class="switch-track" :class="{ on: form.tax_applicable }"><span class="switch-thumb"></span></span>
                      Tax Applicable
                    </label>
                  </div>
                  <template v-if="form.tax_applicable">
                    <div class="form-group">
                      <label>Tax Type <span class="req">*</span></label>
                      <CustomSelect v-model="form.tax_type" :options="[{label:'GST',value:'GST'},{label:'VAT',value:'VAT'},{label:'Custom',value:'custom'}]" placeholder="Select type" labelKey="label" valueKey="value" :error="v.tax_type" @update:modelValue="onTaxTypeChange" />
                      <span v-if="v.tax_type" class="field-error"><AlertTriangle :size="11" /> Required</span>
                    </div>
                    <div class="form-group">
                      <label>Tax Percentage <span class="req">*</span></label>
                      <CustomSelect v-model="form.tax_percentage" :options="taxPercentageOptions" placeholder="Select rate" labelKey="label" valueKey="value" :key="form.tax_type" :error="v.tax_percentage" />
                      <span v-if="v.tax_percentage" class="field-error"><AlertTriangle :size="11" /> Required</span>
                    </div>
                    <div class="form-group">
                      <label>Tax Amount</label>
                      <div class="readonly-value">{{ currencySymbol }}{{ taxAmount.toFixed(2) }}</div>
                    </div>

                    <div class="form-group full">
                      <label>Total After Tax</label>
                      <div class="readonly-value accent">{{ currencySymbol }}{{ totalAfterTax.toFixed(2) }}</div>
                    </div>
                  </template>
                </div>
              </div>

              <!-- Step 5: Allocation -->
              <div v-else-if="currentStep === 4" key="s4" class="step-content">
                <div class="step-header"><PieChart :size="20" /><span>Cost Allocation</span></div>
                <div class="alloc-section">
                  <div class="alloc-choice-row">
                    <div class="alloc-choice-card" :class="{ active: form.allocation_type === 'full' }" @click="form.allocation_type = 'full'">
                      <div class="alloc-choice-icon"><Target :size="22" /></div>
                      <div class="alloc-choice-text">
                        <span class="alloc-choice-title">Full Allocation</span>
                        <span class="alloc-choice-desc">Single cost center</span>
                      </div>
                      <div class="alloc-choice-check" v-if="form.allocation_type === 'full'"><Check :size="16" /></div>
                    </div>
                    <div class="alloc-choice-card" :class="{ active: form.allocation_type === 'split' }" @click="form.allocation_type = 'split'">
                      <div class="alloc-choice-icon"><Split :size="22" /></div>
                      <div class="alloc-choice-text">
                        <span class="alloc-choice-title">Split Allocation</span>
                        <span class="alloc-choice-desc">Multiple cost centers</span>
                      </div>
                      <div class="alloc-choice-check" v-if="form.allocation_type === 'split'"><Check :size="16" /></div>
                    </div>
                  </div>
                  <div v-if="form.allocation_type === 'full'" class="alloc-full-info">
                    <div class="alloc-full-card">
                      <div class="alloc-full-icon"><PieChart :size="20" /></div>
                      <div class="alloc-full-body">
                        <span class="alloc-full-label">100% allocated to primary cost center</span>
                        <span class="alloc-full-value">{{ currencySymbol }}{{ allocDisplayAmount.toFixed(2) }}</span>
                      </div>
                    </div>
                  </div>
                  <div v-if="form.allocation_type === 'split'" class="alloc-split-section">
                    <div class="alloc-table">
                      <div class="alloc-head"><span>Category</span><span>Cost Center</span><span>%</span><span>Amount</span><span></span></div>
                      <div v-for="(row, i) in form.allocations" :key="i" class="alloc-row">
                        <input v-model="row.category" placeholder="Category" class="text-input sm" />
                        <input v-model="row.cost_center" placeholder="CC" class="text-input sm" />
                        <input v-model.number="row.percentage" type="text" inputmode="numeric" class="text-input sm mono no-arrows" @input="updateAllocAmount(i)" @keypress="onlyNumeric" />
                        <div class="readonly-value sm">{{ currencySymbol }}{{ (row.amount || 0).toFixed(2) }}</div>
                        <button class="icon-btn" @click="removeAlloc(i)"><X :size="14" /></button>
                      </div>
                      <button class="add-row-btn" @click="addAlloc"><Plus :size="14" /> Add Row</button>
                    </div>
                    <div class="alloc-summary" :class="{ error: allocTotal !== 100 }">
                      <PieChart :size="14" /> Total: {{ allocTotal.toFixed(1) }}%
                      <span v-if="allocTotal !== 100"> — Must equal 100%</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Step 6: Attachments -->
              <div v-else-if="currentStep === 5" key="s5" class="step-content">
                <div class="step-header"><Paperclip :size="20" /><span>Attachments</span></div>
                <div class="drop-zone" :class="{ active: dragActive }" @dragover.prevent="dragActive = true" @dragleave.prevent="dragActive = false" @drop.prevent="onFileDrop">
                  <UploadCloud :size="28" class="drop-icon" />
                  <p class="drop-title">Drag & drop files here</p>
                  <span class="drop-or">or</span>
                  <label class="browse-btn">Browse Files<input type="file" multiple hidden accept=".pdf,image/*" @change="onFileSelect" /></label>
                  <p class="drop-hint">PDF or Image — max 5 MB each</p>
                </div>
                <div v-if="form.attachments && form.attachments.length" class="file-list">
                  <div v-for="(f, i) in form.attachments" :key="i" class="file-row">
                    <div class="file-meta"><FileText :size="15" /><span>{{ f.file_name }}</span><span class="file-size">{{ ((f.size || 0) / 1024 / 1024).toFixed(2) }} MB</span></div>
                    <button class="icon-btn" @click="removeFile(i)"><X :size="14" /></button>
                  </div>
                </div>
              </div>

              <!-- Step 7: Notes -->
              <div v-else-if="currentStep === 6" key="s6" class="step-content">
                <div class="step-header"><StickyNote :size="20" /><span>Additional Notes</span></div>
                <div class="notes-section">
                  <div class="notes-card">
                    <div class="notes-card-header"><StickyNote :size="16" /><span>Expense Notes</span></div>
                    <textarea v-model="form.notes" rows="8" placeholder="Add any notes, comments, or justifications..." class="notes-textarea"></textarea>
                  </div>

                  <div class="notes-switch-card">
                    <div class="notes-switch-left">
                      <div class="notes-switch-icon"><ShieldCheck :size="16" /></div>
                      <div class="notes-switch-text">
                        <span class="notes-switch-title">Internal Note</span>
                        <span class="notes-switch-desc">Not visible to approvers</span>
                      </div>
                    </div>
                    <button class="modern-switch" :class="{ on: form.is_internal_note }" @click="form.is_internal_note = !form.is_internal_note">
                      <span class="modern-switch-thumb"></span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Step 8: Review (ultra-modern redesign) -->
              <div v-else-if="currentStep === 7" key="s7" class="step-content rev-step">
                <div class="step-header"><ShieldCheck :size="20" /><span>Review & Update</span></div>

                <!-- Hero amount card -->
                <Motion
                  class="rev-hero"
                  :initial="{ opacity: 0, y: 18, scale: 0.96 }"
                  :animate="{ opacity: 1, y: 0, scale: 1 }"
                  :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }"
                >
                  <div class="rev-hero__aura" aria-hidden="true"></div>
                  <div class="rev-hero__grid" aria-hidden="true"></div>
                  <div class="rev-hero__content">
                    <Motion
                      class="rev-hero__eyebrow"
                      :initial="{ opacity: 0, x: -8 }"
                      :animate="{ opacity: 1, x: 0 }"
                      :transition="{ duration: 0.4, delay: 0.18, ease: [0.16, 1, 0.3, 1] }"
                    >
                      <Sparkles :size="11" /> FINAL AMOUNT
                    </Motion>
                    <Motion
                      class="rev-hero__total"
                      :initial="{ opacity: 0, y: 14 }"
                      :animate="{ opacity: 1, y: 0 }"
                      :transition="{ duration: 0.55, delay: 0.22, ease: [0.16, 1, 0.3, 1] }"
                    >
                      <span class="rev-hero__currency">{{ currencySymbol }}</span>
                      <span class="rev-hero__value">{{ totalAfterTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                    </Motion>
                    <Motion
                      class="rev-hero__meta"
                      :initial="{ opacity: 0, y: 8 }"
                      :animate="{ opacity: 1, y: 0 }"
                      :transition="{ duration: 0.42, delay: 0.30, ease: [0.16, 1, 0.3, 1] }"
                    >
                      <span class="rev-hero__title">{{ form.title || 'Untitled expense' }}</span>
                      <span class="rev-hero__dot" v-if="form.category">·</span>
                      <span class="rev-hero__cat" v-if="form.category">{{ form.category }}</span>
                    </Motion>
                  </div>
                  <Motion
                    class="rev-hero__badge"
                    :initial="{ scale: 0.4, rotate: -25, opacity: 0 }"
                    :animate="{ scale: 1, rotate: 0, opacity: 1 }"
                    :transition="{ duration: 0.62, delay: 0.32, ease: [0.34, 1.56, 0.64, 1] }"
                    aria-hidden="true"
                  >
                    <ShieldCheck :size="22" />
                  </Motion>
                </Motion>

                <!-- Quick chips strip -->
                <Motion
                  class="rev-chips"
                  :initial="{ opacity: 0, y: 12 }"
                  :animate="{ opacity: 1, y: 0 }"
                  :transition="{ duration: 0.4, delay: 0.36, ease: [0.16, 1, 0.3, 1] }"
                >
                  <Motion
                    class="rev-chip"
                    :initial="{ opacity: 0, scale: 0.8 }"
                    :animate="{ opacity: 1, scale: 1 }"
                    :transition="{ duration: 0.32, delay: 0.40, ease: [0.34, 1.56, 0.64, 1] }"
                    :whileHover="{ y: -2, scale: 1.04 }"
                  >
                    <Calendar :size="12" />
                    <span>{{ formatRevDate(form.expense_date) }}</span>
                  </Motion>
                  <Motion
                    class="rev-chip"
                    :class="`rev-chip--priority rev-chip--${form.priority}`"
                    :initial="{ opacity: 0, scale: 0.8 }"
                    :animate="{ opacity: 1, scale: 1 }"
                    :transition="{ duration: 0.32, delay: 0.44, ease: [0.34, 1.56, 0.64, 1] }"
                    :whileHover="{ y: -2, scale: 1.04 }"
                  >
                    <Circle :size="8" :fill="'currentColor'" />
                    <span>{{ form.priority || 'medium' }}</span>
                  </Motion>
                  <Motion
                    class="rev-chip"
                    :initial="{ opacity: 0, scale: 0.8 }"
                    :animate="{ opacity: 1, scale: 1 }"
                    :transition="{ duration: 0.32, delay: 0.48, ease: [0.34, 1.56, 0.64, 1] }"
                    :whileHover="{ y: -2, scale: 1.04 }"
                  >
                    <component :is="paymentIcons[form.payment_method] || Banknote" :size="12" />
                    <span>{{ form.payment_method || 'cash' }}</span>
                  </Motion>
                  <Motion
                    class="rev-chip rev-chip--status"
                    :class="`rev-chip--${form.payment_status}`"
                    :initial="{ opacity: 0, scale: 0.8 }"
                    :animate="{ opacity: 1, scale: 1 }"
                    :transition="{ duration: 0.32, delay: 0.52, ease: [0.34, 1.56, 0.64, 1] }"
                    :whileHover="{ y: -2, scale: 1.04 }"
                  >
                    <span class="rev-status-dot"></span>
                    <span>{{ form.payment_status || 'paid' }}</span>
                  </Motion>
                </Motion>

                <!-- Detail cards grid -->
                <div class="rev-grid">
                  <!-- Financial breakdown -->
                  <Motion
                    class="rev-card"
                    :initial="{ opacity: 0, y: 18 }"
                    :animate="{ opacity: 1, y: 0 }"
                    :transition="{ duration: 0.42, delay: 0.56, ease: [0.16, 1, 0.3, 1] }"
                    :whileHover="{ y: -3 }"
                  >
                    <div class="rev-card__bar" aria-hidden="true"></div>
                    <div class="rev-card__head">
                      <div class="rev-card__icon"><TrendingUp :size="13" /></div>
                      <span>Financial Breakdown</span>
                    </div>
                    <div class="rev-card__body">
                      <div class="rev-line">
                        <span class="rev-line__label">Subtotal</span>
                        <span class="rev-line__value mono">{{ currencySymbol }}{{ (form.amount || 0).toFixed(2) }}</span>
                      </div>
                      <div class="rev-line" v-if="form.tax_applicable">
                        <span class="rev-line__label">Tax · {{ form.tax_type || 'GST' }} {{ form.tax_percentage }}%</span>
                        <span class="rev-line__value mono accent">+{{ currencySymbol }}{{ taxAmount.toFixed(2) }}</span>
                      </div>
                      <div class="rev-line rev-line--divider" v-if="form.tax_applicable"></div>
                      <div class="rev-line rev-line--total">
                        <span class="rev-line__label">Total</span>
                        <span class="rev-line__value mono">{{ currencySymbol }}{{ totalAfterTax.toFixed(2) }}</span>
                      </div>
                    </div>
                  </Motion>

                  <!-- Vendor -->
                  <Motion
                    class="rev-card"
                    v-if="form.vendor_name"
                    :initial="{ opacity: 0, y: 18 }"
                    :animate="{ opacity: 1, y: 0 }"
                    :transition="{ duration: 0.42, delay: 0.62, ease: [0.16, 1, 0.3, 1] }"
                    :whileHover="{ y: -3 }"
                  >
                    <div class="rev-card__bar" aria-hidden="true"></div>
                    <div class="rev-card__head">
                      <div class="rev-card__icon"><Building2 :size="13" /></div>
                      <span>Vendor</span>
                    </div>
                    <div class="rev-card__body">
                      <div class="rev-line">
                        <span class="rev-line__label">Name</span>
                        <span class="rev-line__value">{{ form.vendor_name }}</span>
                      </div>
                      <div class="rev-line" v-if="form.vendor_type">
                        <span class="rev-line__label">Type</span>
                        <span class="rev-line__value capitalize">{{ form.vendor_type }}</span>
                      </div>
                      <div class="rev-line" v-if="form.invoice_number">
                        <span class="rev-line__label">Invoice #</span>
                        <span class="rev-line__value mono">{{ form.invoice_number }}</span>
                      </div>
                    </div>
                  </Motion>

                  <!-- Allocation -->
                  <Motion
                    class="rev-card"
                    :initial="{ opacity: 0, y: 18 }"
                    :animate="{ opacity: 1, y: 0 }"
                    :transition="{ duration: 0.42, delay: 0.68, ease: [0.16, 1, 0.3, 1] }"
                    :whileHover="{ y: -3 }"
                  >
                    <div class="rev-card__bar" aria-hidden="true"></div>
                    <div class="rev-card__head">
                      <div class="rev-card__icon"><PieChart :size="13" /></div>
                      <span>Allocation</span>
                    </div>
                    <div class="rev-card__body">
                      <div class="rev-line">
                        <span class="rev-line__label">Type</span>
                        <span class="rev-line__value capitalize">{{ form.allocation_type === 'split' ? 'Split allocation' : 'Full allocation' }}</span>
                      </div>
                      <div class="rev-line" v-if="form.allocation_type === 'split'">
                        <span class="rev-line__label">Segments</span>
                        <span class="rev-line__value">{{ (form.allocations || []).length }}</span>
                      </div>
                      <div class="rev-line" v-if="form.department">
                        <span class="rev-line__label">Department</span>
                        <span class="rev-line__value">{{ form.department }}</span>
                      </div>
                      <div class="rev-line" v-if="form.cost_center">
                        <span class="rev-line__label">Cost Center</span>
                        <span class="rev-line__value mono">{{ form.cost_center }}</span>
                      </div>
                    </div>
                  </Motion>

                  <!-- Attachments -->
                  <Motion
                    class="rev-card"
                    :initial="{ opacity: 0, y: 18 }"
                    :animate="{ opacity: 1, y: 0 }"
                    :transition="{ duration: 0.42, delay: 0.74, ease: [0.16, 1, 0.3, 1] }"
                    :whileHover="{ y: -3 }"
                  >
                    <div class="rev-card__bar" aria-hidden="true"></div>
                    <div class="rev-card__head">
                      <div class="rev-card__icon"><Paperclip :size="13" /></div>
                      <span>Attachments</span>
                      <span class="rev-card__count">{{ (form.attachments || []).length }}</span>
                    </div>
                    <div class="rev-card__body">
                      <div v-if="!(form.attachments || []).length" class="rev-empty">No files attached</div>
                      <div v-else class="rev-files">
                        <div v-for="(f, i) in form.attachments.slice(0, 3)" :key="i" class="rev-file">
                          <FileText :size="11" />
                          <span class="rev-file__name">{{ f.file_name }}</span>
                        </div>
                        <span v-if="form.attachments.length > 3" class="rev-file__more">+{{ form.attachments.length - 3 }} more</span>
                      </div>
                    </div>
                  </Motion>
                </div>

                <!-- Description -->
                <Motion
                  class="rev-desc"
                  v-if="form.description"
                  :initial="{ opacity: 0, y: 14 }"
                  :animate="{ opacity: 1, y: 0 }"
                  :transition="{ duration: 0.42, delay: 0.80, ease: [0.16, 1, 0.3, 1] }"
                >
                  <div class="rev-desc__head">
                    <ClipboardList :size="12" />
                    <span>Description</span>
                  </div>
                  <p class="rev-desc__body">{{ form.description }}</p>
                </Motion>
              </div>

            </Transition>
          </div>

          <!-- Footer -->
          <Motion
            class="modal-footer"
            :initial="{ opacity: 0, y: 8 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.36, delay: 0.20, ease: [0.16, 1, 0.3, 1] }"
          >
            <Motion
              v-if="currentStep > 0"
              as="button"
              type="button"
              class="btn-text secondary"
              :whileHover="{ x: -2 }"
              :whileTap="{ scale: 0.97 }"
              @click="prevStep"
            >
              <ArrowLeft :size="16" /><span>Back</span>
            </Motion>
            <Motion
              v-else
              as="button"
              type="button"
              class="btn-text secondary"
              :whileHover="{ y: -1 }"
              :whileTap="{ scale: 0.97 }"
              @click="close"
            >
              Cancel
            </Motion>
            <div class="footer-right">
              <Motion
                v-if="currentStep < steps.length - 1"
                as="button"
                type="button"
                class="btn-pill primary"
                :whileHover="{ y: -2, scale: 1.02 }"
                :whileTap="{ scale: 0.97 }"
                :transition="{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }"
                @click="nextStep"
              >
                <span>Continue</span><ArrowRight :size="16" />
              </Motion>
              <Motion
                v-else
                as="button"
                type="button"
                class="btn-pill primary"
                :whileHover="isSubmitting ? {} : { y: -2, scale: 1.02 }"
                :whileTap="isSubmitting ? {} : { scale: 0.97 }"
                :transition="{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }"
                :disabled="isSubmitting"
                @click="handleSubmit"
              >
                <Loader2 v-if="isSubmitting" :size="16" class="spin" />
                <span>{{ isSubmitting ? 'Updating...' : 'Update Expense' }}</span>
              </Motion>
            </div>
          </Motion>

        </Motion>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import {
  X, Check, ArrowLeft, ArrowRight, Loader2, AlertTriangle, Plus, Circle,
  ClipboardList, DollarSign, Building2, Receipt, PieChart, Paperclip, StickyNote, ShieldCheck,
  Globe, Target, Split, Banknote, Landmark, CreditCard, Wifi, UploadCloud, FileText, ExternalLink,
  Calendar, Sparkles, TrendingUp, Hash, Layers
} from 'lucide-vue-next'
import { Motion } from 'motion-v'
import CustomSelect from '../ui/CustomSelect.vue'
import DatePicker from '../ui/DatePicker.vue'
import { useToast } from '../../composables/useToast'
import { API } from '@/utils/api'

const props = defineProps({
  modelValue: Boolean,
  expense: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'updated'])
const route = useRoute()
const { success: toastSuccess, error: toastError } = useToast()

const close = () => emit('update:modelValue', false)

const tzOffset = new Date().getTimezoneOffset() * 60000
const todayStr = (new Date(Date.now() - tzOffset)).toISOString().split('T')[0]

const paymentIcons = { cash: Banknote, bank: Landmark, card: CreditCard, online: Wifi }

const steps = [
  { label: 'Basic Info', icon: ClipboardList },
  { label: 'Financial', icon: DollarSign },
  { label: 'Vendor', icon: Building2 },
  { label: 'Tax', icon: Receipt },
  { label: 'Allocation', icon: PieChart },
  { label: 'Attachments', icon: Paperclip },
  { label: 'Notes', icon: StickyNote },
  { label: 'Review', icon: ShieldCheck },
]

const currentStep = ref(0)
const isSubmitting = ref(false)
const dragActive = ref(false)
const slideDirection = ref('slide-left')
const categories = ref([])
const expenseTypes = ref([])

const form = reactive({
  title: '', category: '', expense_date: '', project_id: '', task_id: '',
  department: '', cost_center: '', expense_type: '', priority: 'medium', description: '',
  amount: null, currency: 'INR', exchange_rate: 1.0, payment_method: 'cash',
  payment_status: 'paid', is_recurring: false, installment_count: null,
  vendor_name: '', vendor_type: '', vendor_contact: '', vendor_tax_id: '',
  invoice_number: '', invoice_date: '', purchase_order_ref: '',
  tax_applicable: false, tax_type: '', tax_percentage: 0, withholding_tax: 0,
  allocation_type: 'full', allocations: [{ category: '', cost_center: '', percentage: 100, amount: 0 }],
  attachments: [],
  notes: '', is_internal_note: false,
})

const v = reactive({ title: false, category: false, expense_date: false, amount: false, expense_type: false, description: false, vendor_name: false, vendor_type: false, tax_type: false, tax_percentage: false })

// Fetch categories and types
const fetchMeta = async () => {
  try {
    const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token')
    const headers = { Authorization: `Bearer ${token}` }
    const [catRes, typeRes] = await Promise.all([
      axios.get(`${API}/expenses/categories`, { headers }).catch(() => ({ data: [] })),
      axios.get(`${API}/expenses/types`, { headers }).catch(() => ({ data: [] }))
    ])
    categories.value = catRes.data?.length ? catRes.data : ['Travel', 'Office Supplies', 'Software', 'Marketing', 'Utilities', 'Meals', 'Equipment', 'Training', 'Professional Services', 'Miscellaneous']
    expenseTypes.value = typeRes.data?.length ? typeRes.data : ['Reimbursement', 'Direct Payment', 'Petty Cash', 'Corporate Card', 'Advance']
  } catch { /* use defaults */ }
}

const categoryOptions = computed(() => categories.value.map(c => ({ label: c, value: c })))
const typeOptions = computed(() => expenseTypes.value.map(t => ({ label: t, value: t })))
const currencyOptions = [
  { label: 'USD ($)', value: 'USD' }, { label: 'EUR (€)', value: 'EUR' },
  { label: 'GBP (£)', value: 'GBP' }, { label: 'INR (₹)', value: 'INR' }, { label: 'AED (د.إ)', value: 'AED' },
]
const taxRates = { GST: [0, 5, 12, 18, 28], VAT: [0, 5, 10, 20] }
const taxPercentageOptions = computed(() => {
  const type = form.tax_type || 'GST'
  const rates = taxRates[type] || taxRates.GST
  return rates.map(r => ({ label: `${r}%`, value: r }))
})

const currencySymbol = computed(() => ({ USD: '$', EUR: '€', GBP: '£', INR: '₹', AED: 'د.إ' }[form.currency] || '$'))
const taxAmount = computed(() => form.tax_applicable ? (form.amount || 0) * ((form.tax_percentage || 0) / 100) : 0)
const totalAfterTax = computed(() => (form.amount || 0) + taxAmount.value)
const allocDisplayAmount = computed(() => form.tax_applicable ? totalAfterTax.value : (form.amount || 0))
const allocTotal = computed(() => (form.allocations || []).reduce((s, r) => s + (r.percentage || 0), 0))
const progressPercent = computed(() => ((currentStep.value) / (steps.length - 1)) * 100)

// Watch for modal open — populate form from expense prop
watch(() => props.modelValue, (isOpen) => {
  if (isOpen && props.expense) {
    currentStep.value = 0
    fetchMeta()
    const e = props.expense
    Object.assign(form, {
      title: e.title || '', category: e.category || '', expense_date: e.expense_date || '',
      project_id: e.project_id || '', task_id: e.task_id || '',
      department: e.department || '', cost_center: e.cost_center || '',
      expense_type: e.expense_type || '', priority: (e.priority || 'medium').toLowerCase(),
      description: e.description || '',
      amount: e.amount || null, currency: e.currency || 'INR', exchange_rate: e.exchange_rate || 1.0,
      payment_method: (e.payment_method || 'cash').toLowerCase(),
      payment_status: (e.payment_status || 'paid').toLowerCase(),
      is_recurring: e.is_recurring || false, installment_count: e.installment_count || null,
      vendor_name: e.vendor_name || '', vendor_type: (e.vendor_type || '').toLowerCase(),
      vendor_contact: e.vendor_contact || '', vendor_tax_id: e.vendor_tax_id || '',
      invoice_number: e.invoice_number || '', invoice_date: e.invoice_date || '',
      purchase_order_ref: e.purchase_order_ref || '',
      tax_applicable: e.tax_applicable || false, tax_type: e.tax_type || '',
      tax_percentage: e.tax_percentage || 0, withholding_tax: e.withholding_tax || 0,
      allocation_type: (e.allocation_type || 'full').toLowerCase(),
      allocations: e.allocations && e.allocations.length ? JSON.parse(JSON.stringify(e.allocations)) : [{ category: '', cost_center: '', percentage: 100, amount: 0 }],
      attachments: e.attachments && e.attachments.length ? JSON.parse(JSON.stringify(e.attachments)) : [],
      notes: e.notes || '', is_internal_note: e.is_internal_note || false,
    })
    // Reset validation
    Object.keys(v).forEach(k => v[k] = false)
  }
})

const onlyNumeric = (e) => { if (!/[0-9.]/.test(e.key)) e.preventDefault() }
const onTaxTypeChange = () => { form.tax_percentage = 0; v.tax_percentage = false }

// Navigation
const goToStep = (idx) => { if (idx <= currentStep.value) { slideDirection.value = idx < currentStep.value ? 'slide-right' : 'slide-left'; currentStep.value = idx } }
const prevStep = () => { if (currentStep.value > 0) { slideDirection.value = 'slide-right'; currentStep.value-- } }
const nextStep = () => {
  if (currentStep.value === 0) {
    v.title = !form.title?.trim(); v.category = !form.category; v.expense_date = !form.expense_date; v.expense_type = !form.expense_type; v.description = !form.description?.trim()
    if (v.title || v.category || v.expense_date || v.expense_type || v.description) return
  }
  if (currentStep.value === 1) { v.amount = !form.amount || form.amount <= 0; if (v.amount) return }
  if (currentStep.value === 2) { v.vendor_name = !form.vendor_name?.trim(); v.vendor_type = !form.vendor_type; if (v.vendor_name || v.vendor_type) return }
  if (currentStep.value === 3 && form.tax_applicable) {
    v.tax_type = !form.tax_type; v.tax_percentage = !form.tax_percentage || form.tax_percentage <= 0
    if (v.tax_type || v.tax_percentage) return
  }
  slideDirection.value = 'slide-left'
  currentStep.value++
}

// Allocation
const updateAllocAmount = (i) => { form.allocations[i].amount = ((form.amount || 0) * (form.allocations[i].percentage || 0)) / 100 }
const addAlloc = () => form.allocations.push({ category: '', cost_center: '', percentage: 0, amount: 0 })
const removeAlloc = (i) => form.allocations.splice(i, 1)

// File helpers
const onFileDrop = (e) => { dragActive.value = false; Array.from(e.dataTransfer.files).forEach(addFileToList) }
const onFileSelect = (e) => { Array.from(e.target.files).forEach(addFileToList); e.target.value = '' }
const addFileToList = (file) => {
  if (file.size > 5 * 1024 * 1024) { toastError(`${file.name} exceeds 5 MB`); return }
  form.attachments.push({ file_name: file.name, size: file.size, file_url: URL.createObjectURL(file), doc_type: 'other' })
}
const removeFile = (i) => form.attachments.splice(i, 1)

const formatSize = (bytes) => {
  if (!bytes) return '0 B'
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB'
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return bytes + ' B'
}

const formatRevDate = (d) => {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return d }
}

// Submit
const handleSubmit = async () => {
  isSubmitting.value = true
  try {
    const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token')
    const isAdmin = route.path.startsWith('/admin')
    if (isAdmin) {
      // Use admin token if on admin route
      var authToken = localStorage.getItem('admin_token') || token
    } else {
      var authToken = token
    }
    const payload = {
      title: form.title, category: form.category, expense_date: form.expense_date,
      expense_type: form.expense_type, priority: form.priority, description: form.description,
      amount: form.amount, currency: form.currency, exchange_rate: form.exchange_rate,
      payment_method: form.payment_method, payment_status: form.payment_status,
      is_recurring: form.is_recurring, installment_count: form.installment_count,
      vendor_name: form.vendor_name, vendor_type: form.vendor_type || null,
      vendor_contact: form.vendor_contact, vendor_tax_id: form.vendor_tax_id,
      invoice_number: form.invoice_number, invoice_date: form.invoice_date || null,
      purchase_order_ref: form.purchase_order_ref,
      tax_applicable: form.tax_applicable, tax_type: form.tax_type || null,
      tax_percentage: form.tax_percentage, withholding_tax: form.withholding_tax,
      tax_amount: taxAmount.value, total_after_tax: totalAfterTax.value,
      allocation_type: form.allocation_type,
      allocations: form.allocation_type === 'split' ? form.allocations : null,
      attachments: form.attachments, notes: form.notes, is_internal_note: form.is_internal_note,
      department: form.department, cost_center: form.cost_center,
    }
    await axios.put(`${API}/expenses/${props.expense.id}`, payload, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
    toastSuccess('Expense updated successfully')
    emit('updated')
    close()
  } catch (e) {
    console.error(e)
    toastError(e.response?.data?.detail || 'Failed to update expense')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
/* Modal Overlay & Glass Panel */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.55); backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  z-index: 2000; display: flex; align-items: center; justify-content: center;
}
.modal-content.glass-panel {
  position: relative;
  width: 660px; max-width: 95vw; max-height: 90vh; display: flex; flex-direction: column;
  background: linear-gradient(135deg, rgba(28, 26, 22, 0.92) 0%, rgba(20, 18, 14, 0.95) 100%);
  backdrop-filter: blur(28px) saturate(140%);
  -webkit-backdrop-filter: blur(28px) saturate(140%);
  border: 1px solid rgba(245, 158, 11, 0.18);
  border-radius: 22px;
  box-shadow:
    0 32px 80px rgba(0,0,0,0.6),
    0 12px 28px rgba(245, 158, 11, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  overflow: hidden;
  isolation: isolate;
}
/* Subtle radial aura behind the panel */
.panel-aura {
  position: absolute;
  inset: 0;
  border-radius: 22px;
  background:
    radial-gradient(60% 40% at 0% 0%, rgba(245, 158, 11, 0.10), transparent 60%),
    radial-gradient(55% 45% at 100% 100%, rgba(249, 115, 22, 0.08), transparent 65%);
  z-index: -1;
  pointer-events: none;
}

/* Header */
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 24px 28px 16px; border-bottom: 1px solid rgba(255,255,255,0.06);
}
.modal-header .header-text h2 { font-size: 18px; font-weight: 700; color: #f5f5f7; margin: 0; }
.expense-id { font-size: 11px; color: #f59e0b; font-family: 'SF Mono', monospace; margin-top: 4px; }
.close-btn {
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; width: 36px; height: 36px; display: flex; align-items: center;
  justify-content: center; color: #8e8e93; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.close-btn:hover { 
  background: rgba(245,158,11,0.15); 
  border-color: rgba(245,158,11,0.4);
  color: #f59e0b; 
  transform: rotate(90deg) scale(1.05); 
}

/* Progress */
.progress-container { padding: 16px 28px 12px; }
.step-indicators { display: flex; gap: 4px; justify-content: space-between; margin-bottom: 10px; }
.step-dot {
  display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer;
  color: rgba(255,255,255,0.3); transition: all 0.2s; flex: 1;
}
.step-dot.active { color: #f59e0b; }
.step-dot.completed { color: #10b981; }
.step-label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
.progress-track { height: 3px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #f59e0b, #f97316); border-radius: 2px; transition: width 0.4s ease; }

/* Body */
.modal-body { flex: 1; overflow-y: auto; padding: 20px 28px; }
.step-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; color: #f5f5f7; font-size: 15px; font-weight: 600; }
.step-content { min-height: 200px; }

/* Form Grid */
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 16px; }
.form-group {
  display: flex; flex-direction: column; gap: 8px;
  position: relative;
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.form-group.full { grid-column: 1 / -1; }
.form-group label {
  font-size: 10.5px; font-weight: 700;
  color: rgba(255, 255, 255, 0.55);
  text-transform: uppercase; letter-spacing: 0.10em;
  display: inline-flex; align-items: center; gap: 8px;
  margin-left: 2px;
  transition: color 0.2s ease;
}
/* Refined leading dot before each label — orange in active, fades with field */
.form-group label::before {
  content: '';
  width: 4px; height: 4px; border-radius: 50%;
  background: rgba(245, 158, 11, 0.55);
  flex-shrink: 0;
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.35);
  transition: background 0.25s, box-shadow 0.25s, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.form-group:focus-within label { color: #f59e0b; }
.form-group:focus-within label::before {
  background: #f59e0b;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.65);
  transform: scale(1.4);
}
.req { color: #ef4444; }

/* Inputs */
.text-input {
  background: linear-gradient(135deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.025) 100%);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 11px; padding: 11px 14px; color: #f5f5f7; font-size: 14px;
  transition: background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
  outline: none; width: 100%; font-family: inherit;
}
.text-input:hover {
  background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.035) 100%);
  border-color: rgba(255,255,255,0.16);
}
.text-input:focus {
  background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(245,158,11,0.05) 100%);
  border-color: rgba(245, 158, 11, 0.55);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.14), 0 4px 14px -4px rgba(245, 158, 11, 0.22);
}
.text-input.has-error {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
}
.text-input.mono { font-family: 'SF Mono', 'Fira Code', monospace; }
.no-arrows::-webkit-inner-spin-button, .no-arrows::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
textarea.text-input { resize: vertical; min-height: 70px; }

.input-with-prefix {
  display: flex; align-items: center;
  background: linear-gradient(135deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.025) 100%);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 11px; overflow: hidden;
  transition: background 0.25s, border-color 0.25s, box-shadow 0.25s;
}
.input-with-prefix:focus-within {
  border-color: rgba(245, 158, 11, 0.55);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.14);
  background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(245,158,11,0.05) 100%);
}
.input-with-prefix.has-error { border-color: #ef4444; }
.input-with-prefix .prefix { padding: 0 12px; color: #f59e0b; font-weight: 700; font-size: 16px; border-right: 1px solid rgba(255,255,255,0.08); }
.input-with-prefix .text-input { border: none; background: transparent; border-radius: 0; box-shadow: none; }
.input-with-prefix .text-input:focus { background: transparent; box-shadow: none; }

.field-error { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #ef4444; }

/* Chips */
.chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
.chip-error .chip { border-color: rgba(239,68,68,0.3); }
.chip {
  display: flex; align-items: center; gap: 5px; padding: 7px 14px; border-radius: 20px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.6); font-size: 12px; font-weight: 500; cursor: pointer;
  transition: all 0.2s; text-transform: capitalize;
}
.chip:hover { border-color: rgba(255,255,255,0.15); color: #fff; }
.chip.active { background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.3); color: #f59e0b; }
.chip.active.low { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3); color: #10b981; }
.chip.active.high { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); color: #ef4444; }
.chip.active.critical { background: rgba(168,85,247,0.1); border-color: rgba(168,85,247,0.3); color: #a855f7; }

/* Switch */
.switch-label { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 13px; color: rgba(255,255,255,0.7); }
.switch-track { width: 40px; height: 22px; border-radius: 11px; background: rgba(255,255,255,0.1); position: relative; transition: background 0.3s; flex-shrink: 0; }
.switch-track.on { background: #f59e0b; }
.switch-thumb { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: transform 0.3s; }
.switch-track.on .switch-thumb { transform: translateX(18px); }

/* Readonly */
.readonly-value { padding: 10px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; color: rgba(255,255,255,0.5); font-size: 14px; font-family: 'SF Mono', monospace; }
.readonly-value.accent { color: #f59e0b; font-weight: 700; }
.readonly-value.sm { padding: 6px 10px; font-size: 12px; }

/* Allocation */
.alloc-section { display: flex; flex-direction: column; gap: 16px; }
.alloc-choice-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.alloc-choice-card { display: flex; align-items: center; gap: 12px; padding: 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; cursor: pointer; transition: all 0.2s; }
.alloc-choice-card:hover { border-color: rgba(255,255,255,0.12); }
.alloc-choice-card.active { background: rgba(245,158,11,0.06); border-color: rgba(245,158,11,0.25); }
.alloc-choice-icon { color: rgba(255,255,255,0.4); }
.alloc-choice-card.active .alloc-choice-icon { color: #f59e0b; }
.alloc-choice-text { flex: 1; display: flex; flex-direction: column; }
.alloc-choice-title { font-size: 13px; font-weight: 600; color: #f5f5f7; }
.alloc-choice-desc { font-size: 11px; color: rgba(255,255,255,0.4); }
.alloc-choice-check { color: #f59e0b; }
.alloc-full-info { margin-top: 4px; }
.alloc-full-card { display: flex; align-items: center; gap: 14px; padding: 16px; background: rgba(245,158,11,0.04); border: 1px solid rgba(245,158,11,0.12); border-radius: 12px; }
.alloc-full-icon { color: #f59e0b; }
.alloc-full-body { display: flex; flex-direction: column; }
.alloc-full-label { font-size: 12px; color: rgba(255,255,255,0.5); }
.alloc-full-value { font-size: 16px; font-weight: 700; color: #f59e0b; font-family: 'SF Mono', monospace; }
.alloc-split-section { display: flex; flex-direction: column; gap: 10px; }
.alloc-table { display: flex; flex-direction: column; gap: 6px; }
.alloc-head, .alloc-row { display: grid; grid-template-columns: 2fr 1.5fr 0.7fr 1.2fr 30px; gap: 6px; align-items: center; }
.alloc-head span { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.35); text-transform: uppercase; }
.alloc-row .text-input.sm { padding: 6px 8px; font-size: 12px; }
.icon-btn { background: none; border: none; color: rgba(255,255,255,0.3); cursor: pointer; padding: 4px; }
.icon-btn:hover { color: #ef4444; }
.add-row-btn { display: flex; align-items: center; gap: 6px; color: #f59e0b; background: none; border: 1px dashed rgba(245,158,11,0.2); border-radius: 8px; padding: 8px 14px; font-size: 12px; font-weight: 600; cursor: pointer; margin-top: 4px; }
.alloc-summary { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #10b981; font-weight: 600; }
.alloc-summary.error { color: #ef4444; }

/* Attachments */
.drop-zone { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 32px; border: 2px dashed rgba(255,255,255,0.08); border-radius: 14px; background: rgba(255,255,255,0.02); transition: all 0.2s; text-align: center; }
.drop-zone.active { border-color: #f59e0b; background: rgba(245,158,11,0.04); }
.drop-icon { color: rgba(255,255,255,0.25); }
.drop-title { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.6); margin: 0; }
.drop-or { font-size: 12px; color: rgba(255,255,255,0.3); }
.browse-btn { color: #f59e0b; font-weight: 600; font-size: 13px; cursor: pointer; text-decoration: underline; }
.drop-hint { font-size: 11px; color: rgba(255,255,255,0.3); margin: 0; }
.file-list { display: flex; flex-direction: column; gap: 6px; margin-top: 14px; }
.file-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; }
.file-meta { display: flex; align-items: center; gap: 8px; font-size: 13px; color: rgba(255,255,255,0.7); overflow: hidden; }
.file-size { font-size: 11px; color: rgba(255,255,255,0.35); }

/* Notes */
.notes-section { display: flex; flex-direction: column; gap: 14px; }
.notes-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; overflow: hidden; }
.notes-card-header { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); color: rgba(255,255,255,0.6); font-size: 13px; font-weight: 600; }
.notes-textarea { width: 100%; background: transparent; border: none; padding: 14px 16px; color: #f5f5f7; font-size: 14px; resize: none; outline: none; font-family: inherit; }
.notes-switch-card { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; }
.notes-switch-left { display: flex; align-items: center; gap: 12px; }
.notes-switch-icon { width: 36px; height: 36px; border-radius: 10px; background: rgba(245,158,11,0.08); display: flex; align-items: center; justify-content: center; color: #f59e0b; }
.notes-switch-text { display: flex; flex-direction: column; }
.notes-switch-title { font-size: 13px; font-weight: 600; color: #f5f5f7; }
.notes-switch-desc { font-size: 11px; color: rgba(255,255,255,0.4); }
.modern-switch { width: 44px; height: 24px; border-radius: 12px; background: rgba(255,255,255,0.1); border: none; cursor: pointer; position: relative; transition: background 0.3s; }
.modern-switch.on { background: #f59e0b; }
.modern-switch-thumb { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: transform 0.3s; }
.modern-switch.on .modern-switch-thumb { transform: translateX(20px); }

/* Summary */
.summary-preview { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 20px; }
.summary-preview h4 { font-size: 14px; font-weight: 700; color: #f5f5f7; margin: 0 0 14px; }
.summary-grid { display: flex; flex-direction: column; gap: 10px; }
.summary-row { display: flex; justify-content: space-between; font-size: 13px; }
.summary-row span:first-child { color: rgba(255,255,255,0.5); }
.summary-row span:last-child { color: #f5f5f7; font-weight: 500; }
.summary-row.total span { font-weight: 700; color: #f59e0b; font-size: 15px; }
.summary-divider { height: 1px; background: rgba(255,255,255,0.06); margin: 4px 0; }
.mono { font-family: 'SF Mono', 'Fira Code', monospace; }
.priority-chip { display: flex; align-items: center; gap: 4px; text-transform: capitalize; }
.priority-chip.low { color: #10b981; }
.priority-chip.medium { color: #f59e0b; }
.priority-chip.high { color: #ef4444; }
.priority-chip.critical { color: #a855f7; }

/* Footer */
.modal-footer {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 28px; border-top: 1px solid rgba(255,255,255,0.06);
}
.btn-text { display: flex; align-items: center; gap: 6px; background: none; border: none; color: rgba(255,255,255,0.6); font-size: 13px; font-weight: 500; cursor: pointer; }
.btn-text:hover { color: #fff; }
.footer-right { display: flex; gap: 10px; }
.btn-pill {
  display: flex; align-items: center; gap: 6px; padding: 10px 22px; border-radius: 12px;
  font-size: 13px; font-weight: 600; border: none; cursor: pointer; transition: all 0.2s;
}
.btn-pill.primary { background: linear-gradient(135deg, #f59e0b, #f97316); color: #fff; }
.btn-pill.primary:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
.btn-pill.primary:disabled { opacity: 0.5; cursor: not-allowed; }

/* Animations */
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.3s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.slide-left-enter-active, .slide-left-leave-active, .slide-right-enter-active, .slide-right-leave-active { transition: all 0.25s ease; }
.slide-left-enter-from { opacity: 0; transform: translateX(30px); }
.slide-left-leave-to { opacity: 0; transform: translateX(-30px); }
.slide-right-enter-from { opacity: 0; transform: translateX(-30px); }
.slide-right-leave-to { opacity: 0; transform: translateX(30px); }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Scrollbar */
.modal-body::-webkit-scrollbar { width: 5px; }
.modal-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

/* ═════════════════════════════════════════════════════════════════════
   REVIEW STEP — Ultra-modern redesign
   ═════════════════════════════════════════════════════════════════════ */
.rev-step { display: flex; flex-direction: column; gap: 16px; }

/* Hero */
.rev-hero {
  position: relative;
  padding: 22px 24px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.10) 0%, rgba(249, 115, 22, 0.04) 60%, rgba(20, 18, 14, 0.6) 100%);
  border: 1px solid rgba(245, 158, 11, 0.28);
  overflow: hidden;
  isolation: isolate;
  box-shadow:
    0 18px 40px -16px rgba(245, 158, 11, 0.30),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
.rev-hero__aura {
  position: absolute; inset: -40%;
  background: radial-gradient(50% 50% at 70% 30%, rgba(245, 158, 11, 0.28), transparent 70%);
  z-index: -2;
  pointer-events: none;
  filter: blur(20px);
  animation: rev-aura 8s ease-in-out infinite alternate;
}
@keyframes rev-aura {
  0%   { transform: translate(0, 0) scale(1); opacity: 0.85; }
  100% { transform: translate(-4%, -3%) scale(1.06); opacity: 1; }
}
.rev-hero__grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
  background-size: 24px 24px;
  mask-image: linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 80%);
  -webkit-mask-image: linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 80%);
  z-index: -1;
  pointer-events: none;
}
.rev-hero__content { display: flex; flex-direction: column; gap: 6px; position: relative; z-index: 1; }
.rev-hero__eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.14em;
  color: #fbbf24;
  text-shadow: 0 0 14px rgba(251, 191, 36, 0.35);
}
.rev-hero__total {
  display: flex; align-items: baseline; gap: 6px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  line-height: 1;
}
.rev-hero__currency {
  font-size: 22px; font-weight: 600;
  color: #fbbf24;
  opacity: 0.85;
}
.rev-hero__value {
  font-size: 40px; font-weight: 800;
  background: linear-gradient(120deg, #fffaf0 0%, #fde68a 60%, #fbbf24 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  letter-spacing: -0.02em;
}
.rev-hero__meta {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
  margin-top: 2px;
}
.rev-hero__title { font-weight: 600; color: #f5f5f7; }
.rev-hero__dot { color: rgba(255, 255, 255, 0.30); }
.rev-hero__cat { font-weight: 500; }
.rev-hero__badge {
  position: absolute; top: 18px; right: 18px;
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.30), rgba(217, 119, 6, 0.20));
  border: 1px solid rgba(245, 158, 11, 0.45);
  color: #fef3c7;
  box-shadow: 0 0 24px rgba(245, 158, 11, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

/* Chips strip */
.rev-chips {
  display: flex; flex-wrap: wrap; gap: 8px;
}
.rev-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 12px;
  font-size: 11.5px; font-weight: 600;
  text-transform: capitalize;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.72);
  cursor: default;
  transition: border-color 0.22s ease, background 0.22s ease;
  will-change: transform;
}
.rev-chip:hover { border-color: rgba(245, 158, 11, 0.30); }

.rev-chip--priority.rev-chip--low      { color: #34d399; border-color: rgba(52, 211, 153, 0.30); background: rgba(52, 211, 153, 0.08); }
.rev-chip--priority.rev-chip--medium   { color: #fbbf24; border-color: rgba(251, 191, 36, 0.32); background: rgba(251, 191, 36, 0.08); }
.rev-chip--priority.rev-chip--high     { color: #f87171; border-color: rgba(248, 113, 113, 0.32); background: rgba(248, 113, 113, 0.08); }
.rev-chip--priority.rev-chip--critical { color: #c084fc; border-color: rgba(192, 132, 252, 0.32); background: rgba(192, 132, 252, 0.08); }

.rev-chip--status .rev-status-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  box-shadow: 0 0 8px currentColor;
}
.rev-chip--paid    { color: #34d399; border-color: rgba(52, 211, 153, 0.32); background: rgba(52, 211, 153, 0.08); }
.rev-chip--paid    .rev-status-dot { background: #34d399; }
.rev-chip--unpaid  { color: #f87171; border-color: rgba(248, 113, 113, 0.32); background: rgba(248, 113, 113, 0.08); }
.rev-chip--unpaid  .rev-status-dot { background: #f87171; }
.rev-chip--partial { color: #fbbf24; border-color: rgba(251, 191, 36, 0.32); background: rgba(251, 191, 36, 0.08); }
.rev-chip--partial .rev-status-dot { background: #fbbf24; animation: rev-pulse 1.8s ease-in-out infinite; }
@keyframes rev-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%      { transform: scale(1.45); opacity: 0.55; }
}

/* Detail grid */
.rev-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.rev-card {
  position: relative;
  padding: 14px 16px 14px 18px;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.035) 0%, rgba(255, 255, 255, 0.015) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
  transition: border-color 0.22s ease, background 0.22s ease, box-shadow 0.25s ease;
  will-change: transform;
}
.rev-card:hover {
  border-color: rgba(245, 158, 11, 0.30);
  background: linear-gradient(180deg, rgba(245, 158, 11, 0.04) 0%, rgba(255, 255, 255, 0.015) 100%);
  box-shadow: 0 14px 28px -16px rgba(245, 158, 11, 0.30);
}
.rev-card__bar {
  position: absolute;
  top: 14px; left: 0;
  width: 3px; height: calc(100% - 28px);
  background: linear-gradient(180deg, #f59e0b, #c2410c);
  border-radius: 0 2px 2px 0;
  opacity: 0.6;
  transition: opacity 0.22s ease;
}
.rev-card:hover .rev-card__bar { opacity: 1; }

.rev-card__head {
  display: flex; align-items: center; gap: 8px;
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.10em;
  color: rgba(255, 255, 255, 0.55);
}
.rev-card__icon {
  width: 22px; height: 22px;
  border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.22);
  color: #fbbf24;
  flex-shrink: 0;
}
.rev-card__count {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 7px;
  font-size: 10.5px; font-weight: 700;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.22);
  color: #fbbf24;
}

.rev-card__body { display: flex; flex-direction: column; gap: 7px; }
.rev-line {
  display: flex; justify-content: space-between; align-items: center;
  gap: 12px;
  font-size: 12.5px;
}
.rev-line__label {
  color: rgba(255, 255, 255, 0.50);
  font-weight: 500;
}
.rev-line__value {
  color: #f5f5f7;
  font-weight: 600;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60%;
}
.rev-line__value.mono { font-family: 'SF Mono', 'Fira Code', monospace; font-variant-numeric: tabular-nums; }
.rev-line__value.accent { color: #fbbf24; }
.rev-line__value.capitalize { text-transform: capitalize; }
.rev-line--divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.25), transparent);
  margin: 2px 0;
}
.rev-line--total .rev-line__label {
  color: #fbbf24;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 10.5px;
  letter-spacing: 0.10em;
}
.rev-line--total .rev-line__value {
  font-size: 16px;
  color: #fbbf24;
  font-weight: 800;
}

.rev-empty {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.40);
  font-style: italic;
}
.rev-files { display: flex; flex-direction: column; gap: 6px; }
.rev-file {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 7px;
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.70);
}
.rev-file__name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}
.rev-file svg { color: #fbbf24; flex-shrink: 0; }
.rev-file__more {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.50);
  padding-left: 4px;
}

/* Description */
.rev-desc {
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.rev-desc__head {
  display: flex; align-items: center; gap: 6px;
  font-size: 10.5px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.10em;
  color: rgba(255, 255, 255, 0.50);
  margin-bottom: 8px;
}
.rev-desc__head svg { color: #fbbf24; }
.rev-desc__body {
  margin: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.78);
  line-height: 1.55;
}

/* Small-width fallback */
@media (max-width: 560px) {
  .rev-grid { grid-template-columns: 1fr; }
  .rev-hero__value { font-size: 32px; }
  .rev-hero__currency { font-size: 18px; }
}


/* ═════════════════════════════════════════════════════════════════════
   LIGHT THEME — warm cream frosted glass (matches EditTaskModal palette)
   ═════════════════════════════════════════════════════════════════════ */
[data-theme="light"] .modal-overlay {
  background: rgba(26, 20, 16, 0.32);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
[data-theme="light"] .modal-content.glass-panel {
  background: linear-gradient(135deg, rgba(255, 250, 240, 0.92) 0%, rgba(252, 240, 220, 0.96) 100%);
  border: 1px solid rgba(217, 119, 6, 0.28);
  box-shadow:
    0 40px 80px rgba(40, 25, 10, 0.26),
    0 12px 24px rgba(40, 25, 10, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
  color: var(--text-primary);
}
[data-theme="light"] .panel-aura {
  background:
    radial-gradient(60% 40% at 0% 0%, rgba(217, 119, 6, 0.10), transparent 60%),
    radial-gradient(55% 45% at 100% 100%, rgba(180, 83, 9, 0.08), transparent 65%);
}

/* Header */
[data-theme="light"] .modal-header { border-bottom-color: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .modal-header .header-text h2 {
  background: linear-gradient(120deg, #92400e 0%, #d97706 60%, #b45309 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
[data-theme="light"] .expense-id { color: #b45309; }
[data-theme="light"] .close-btn {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(40, 25, 10, 0.12);
  color: #6b5840;
}
[data-theme="light"] .close-btn:hover {
  background: rgba(217, 119, 6, 0.16);
  border-color: rgba(217, 119, 6, 0.40);
  color: #92400e;
}

/* Progress strip */
[data-theme="light"] .progress-track { background: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .step-dot { color: rgba(40, 25, 10, 0.40); }
[data-theme="light"] .step-dot.active { color: #b45309; }
[data-theme="light"] .step-dot.completed { color: #15803d; }

/* Step header */
[data-theme="light"] .step-header { color: var(--text-primary); }
[data-theme="light"] .step-header svg {
  filter: drop-shadow(0 0 6px rgba(217, 119, 6, 0.30));
  color: #b45309;
}

/* Form labels + inputs */
[data-theme="light"] .form-group label { color: #b45309; }
[data-theme="light"] .form-group label::before {
  background: rgba(217, 119, 6, 0.55);
  box-shadow: 0 0 6px rgba(217, 119, 6, 0.35);
}
[data-theme="light"] .form-group:focus-within label { color: #92400e; }
[data-theme="light"] .form-group:focus-within label::before {
  background: #d97706;
  box-shadow: 0 0 10px rgba(217, 119, 6, 0.65);
}
[data-theme="light"] .req { color: #dc2626; }
[data-theme="light"] .text-input,
[data-theme="light"] .input-with-prefix {
  background: linear-gradient(135deg, rgba(255, 250, 240, 0.70) 0%, rgba(255, 250, 240, 0.45) 100%);
  border-color: rgba(217, 119, 6, 0.22);
  color: var(--text-primary);
}
[data-theme="light"] .text-input:hover {
  background: linear-gradient(135deg, rgba(255, 250, 240, 0.85) 0%, rgba(255, 250, 240, 0.55) 100%);
  border-color: rgba(217, 119, 6, 0.35);
}
[data-theme="light"] .text-input::placeholder { color: rgba(26, 20, 16, 0.40); }
[data-theme="light"] .text-input:focus {
  background: linear-gradient(135deg, rgba(255, 246, 226, 0.95) 0%, rgba(255, 240, 210, 0.85) 100%);
  border-color: rgba(217, 119, 6, 0.60);
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.14), 0 4px 14px -4px rgba(217, 119, 6, 0.22);
}
[data-theme="light"] .input-with-prefix:focus-within {
  border-color: rgba(217, 119, 6, 0.60);
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.14);
  background: linear-gradient(135deg, rgba(255, 246, 226, 0.95) 0%, rgba(255, 240, 210, 0.85) 100%);
}
[data-theme="light"] .text-input.has-error { border-color: #dc2626; }
[data-theme="light"] .field-error { color: #dc2626; }
[data-theme="light"] .input-with-prefix .prefix {
  background: transparent;
  color: #b45309;
  border-right-color: rgba(40, 25, 10, 0.10);
}

/* Chips */
[data-theme="light"] .chip {
  background: rgba(40, 25, 10, 0.05);
  border-color: rgba(40, 25, 10, 0.10);
  color: #6b5840;
}
[data-theme="light"] .chip:hover { background: rgba(40, 25, 10, 0.10); color: var(--text-primary); }
[data-theme="light"] .chip.active { background: rgba(245, 158, 11, 0.14); border-color: rgba(245, 158, 11, 0.40); color: #b45309; }
[data-theme="light"] .chip.active.low { background: rgba(16, 185, 129, 0.10); border-color: rgba(16, 185, 129, 0.40); color: #047857; }
[data-theme="light"] .chip.active.high { background: rgba(239, 68, 68, 0.10); border-color: rgba(239, 68, 68, 0.40); color: #b91c1c; }
[data-theme="light"] .chip.active.critical { background: rgba(168, 85, 247, 0.10); border-color: rgba(168, 85, 247, 0.40); color: #6b21a8; }

/* Switch (recurring expense) */
[data-theme="light"] .switch-label { color: var(--text-primary); }
[data-theme="light"] .switch-track { background: rgba(40, 25, 10, 0.14); }
[data-theme="light"] .switch-track.on { background: #d97706; }

/* Readonly */
[data-theme="light"] .readonly-value {
  background: rgba(40, 25, 10, 0.04);
  border-color: rgba(40, 25, 10, 0.10);
  color: var(--text-secondary);
}
[data-theme="light"] .readonly-value.accent { color: #b45309; }

/* Allocation cards */
[data-theme="light"] .alloc-choice-card {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .alloc-choice-card:hover { border-color: rgba(40, 25, 10, 0.18); }
[data-theme="light"] .alloc-choice-card.active {
  background: rgba(217, 119, 6, 0.10);
  border-color: rgba(217, 119, 6, 0.40);
}
[data-theme="light"] .alloc-choice-icon { color: rgba(40, 25, 10, 0.45); }
[data-theme="light"] .alloc-choice-card.active .alloc-choice-icon { color: #b45309; }
[data-theme="light"] .alloc-choice-title { color: var(--text-primary); }
[data-theme="light"] .alloc-choice-desc { color: #6b5840; }
[data-theme="light"] .alloc-choice-check { color: #b45309; }
[data-theme="light"] .alloc-full-card {
  background: rgba(217, 119, 6, 0.06);
  border-color: rgba(217, 119, 6, 0.22);
}
[data-theme="light"] .alloc-full-icon { color: #b45309; }
[data-theme="light"] .alloc-full-label { color: #6b5840; }
[data-theme="light"] .alloc-full-value { color: #b45309; }
[data-theme="light"] .alloc-head span { color: #6b5840; }
[data-theme="light"] .icon-btn { color: rgba(40, 25, 10, 0.40); }
[data-theme="light"] .icon-btn:hover { color: #b91c1c; }
[data-theme="light"] .add-row-btn { color: #b45309; border-color: rgba(217, 119, 6, 0.30); }
[data-theme="light"] .alloc-summary { color: #047857; }
[data-theme="light"] .alloc-summary.error { color: #b91c1c; }

/* Attachments / drop zone */
[data-theme="light"] .drop-zone {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(40, 25, 10, 0.18);
}
[data-theme="light"] .drop-zone.active {
  background: rgba(217, 119, 6, 0.08);
  border-color: #d97706;
}
[data-theme="light"] .drop-icon { color: rgba(40, 25, 10, 0.35); }
[data-theme="light"] .drop-title { color: #6b5840; }
[data-theme="light"] .drop-or { color: rgba(40, 25, 10, 0.40); }
[data-theme="light"] .browse-btn { color: #b45309; }
[data-theme="light"] .drop-hint { color: rgba(40, 25, 10, 0.40); }
[data-theme="light"] .file-row {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .file-meta { color: var(--text-primary); }
[data-theme="light"] .file-meta svg { color: #b45309; }
[data-theme="light"] .file-size { color: rgba(40, 25, 10, 0.45); }

/* Notes section */
[data-theme="light"] .notes-card {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .notes-card-header {
  border-bottom-color: rgba(40, 25, 10, 0.08);
  color: #6b5840;
}
[data-theme="light"] .notes-textarea { color: var(--text-primary); }
[data-theme="light"] .notes-textarea::placeholder { color: rgba(26, 20, 16, 0.40); }
[data-theme="light"] .notes-switch-card {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .notes-switch-icon {
  background: rgba(217, 119, 6, 0.14);
  color: #b45309;
}
[data-theme="light"] .notes-switch-title { color: var(--text-primary); }
[data-theme="light"] .notes-switch-desc { color: #6b5840; }
[data-theme="light"] .modern-switch { background: rgba(40, 25, 10, 0.14); }
[data-theme="light"] .modern-switch.on { background: #d97706; }

/* Review summary (legacy — kept for fallback) */
[data-theme="light"] .summary-preview {
  background: rgba(40, 25, 10, 0.04);
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .summary-preview h4 { color: var(--text-primary); }
[data-theme="light"] .summary-row span:first-child { color: #6b5840; }
[data-theme="light"] .summary-row span:last-child { color: var(--text-primary); }
[data-theme="light"] .summary-row.total span { color: #b45309; }
[data-theme="light"] .summary-divider { background: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .priority-chip.low { color: #047857; }
[data-theme="light"] .priority-chip.medium { color: #b45309; }
[data-theme="light"] .priority-chip.high { color: #b91c1c; }
[data-theme="light"] .priority-chip.critical { color: #6b21a8; }

/* Review redesign — light overrides */
[data-theme="light"] .rev-hero {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(217, 119, 6, 0.08) 60%, rgba(255, 250, 240, 0.65) 100%);
  border-color: rgba(217, 119, 6, 0.35);
  box-shadow:
    0 18px 40px -16px rgba(217, 119, 6, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
}
[data-theme="light"] .rev-hero__aura {
  background: radial-gradient(50% 50% at 70% 30%, rgba(217, 119, 6, 0.32), transparent 70%);
}
[data-theme="light"] .rev-hero__grid {
  background-image:
    linear-gradient(rgba(146, 64, 14, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(146, 64, 14, 0.05) 1px, transparent 1px);
}
[data-theme="light"] .rev-hero__eyebrow {
  color: #b45309;
  text-shadow: 0 0 14px rgba(217, 119, 6, 0.20);
}
[data-theme="light"] .rev-hero__currency { color: #b45309; }
[data-theme="light"] .rev-hero__value {
  background: linear-gradient(120deg, #92400e 0%, #d97706 50%, #b45309 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
[data-theme="light"] .rev-hero__meta { color: #6b5840; }
[data-theme="light"] .rev-hero__title { color: var(--text-primary); }
[data-theme="light"] .rev-hero__dot { color: rgba(40, 25, 10, 0.30); }
[data-theme="light"] .rev-hero__badge {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.30), rgba(180, 83, 9, 0.25));
  border-color: rgba(180, 83, 9, 0.50);
  color: #fff;
  box-shadow: 0 0 24px rgba(217, 119, 6, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.30);
}

/* Chips light */
[data-theme="light"] .rev-chip {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(40, 25, 10, 0.10);
  color: #6b5840;
}
[data-theme="light"] .rev-chip:hover { border-color: rgba(217, 119, 6, 0.35); }

[data-theme="light"] .rev-chip--priority.rev-chip--low      { color: #047857; border-color: rgba(4, 120, 87, 0.30); background: rgba(4, 120, 87, 0.08); }
[data-theme="light"] .rev-chip--priority.rev-chip--medium   { color: #b45309; border-color: rgba(180, 83, 9, 0.32); background: rgba(245, 158, 11, 0.10); }
[data-theme="light"] .rev-chip--priority.rev-chip--high     { color: #b91c1c; border-color: rgba(185, 28, 28, 0.32); background: rgba(185, 28, 28, 0.08); }
[data-theme="light"] .rev-chip--priority.rev-chip--critical { color: #6b21a8; border-color: rgba(107, 33, 168, 0.32); background: rgba(107, 33, 168, 0.08); }

[data-theme="light"] .rev-chip--paid    { color: #047857; border-color: rgba(4, 120, 87, 0.30); background: rgba(4, 120, 87, 0.08); }
[data-theme="light"] .rev-chip--unpaid  { color: #b91c1c; border-color: rgba(185, 28, 28, 0.32); background: rgba(185, 28, 28, 0.08); }
[data-theme="light"] .rev-chip--partial { color: #b45309; border-color: rgba(180, 83, 9, 0.32); background: rgba(245, 158, 11, 0.10); }

/* Cards light */
[data-theme="light"] .rev-card {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.70) 0%, rgba(255, 250, 240, 0.40) 100%);
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .rev-card:hover {
  border-color: rgba(217, 119, 6, 0.35);
  background: linear-gradient(180deg, rgba(245, 158, 11, 0.06) 0%, rgba(255, 250, 240, 0.55) 100%);
  box-shadow: 0 14px 28px -16px rgba(217, 119, 6, 0.35);
}
[data-theme="light"] .rev-card__bar {
  background: linear-gradient(180deg, #d97706, #b45309);
}
[data-theme="light"] .rev-card__head { color: #6b5840; }
[data-theme="light"] .rev-card__icon {
  background: rgba(217, 119, 6, 0.12);
  border-color: rgba(217, 119, 6, 0.28);
  color: #b45309;
}
[data-theme="light"] .rev-card__count {
  background: rgba(217, 119, 6, 0.12);
  border-color: rgba(217, 119, 6, 0.28);
  color: #b45309;
}

[data-theme="light"] .rev-line__label { color: #6b5840; }
[data-theme="light"] .rev-line__value { color: var(--text-primary); }
[data-theme="light"] .rev-line__value.accent { color: #b45309; }
[data-theme="light"] .rev-line--divider {
  background: linear-gradient(90deg, transparent, rgba(217, 119, 6, 0.30), transparent);
}
[data-theme="light"] .rev-line--total .rev-line__label { color: #b45309; }
[data-theme="light"] .rev-line--total .rev-line__value { color: #b45309; }

[data-theme="light"] .rev-empty { color: rgba(40, 25, 10, 0.45); }
[data-theme="light"] .rev-file {
  background: rgba(255, 250, 240, 0.60);
  border-color: rgba(40, 25, 10, 0.10);
  color: var(--text-primary);
}
[data-theme="light"] .rev-file svg { color: #b45309; }
[data-theme="light"] .rev-file__more { color: #6b5840; }

[data-theme="light"] .rev-desc {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .rev-desc__head { color: #6b5840; }
[data-theme="light"] .rev-desc__head svg { color: #b45309; }
[data-theme="light"] .rev-desc__body { color: var(--text-primary); }

/* Footer */
[data-theme="light"] .modal-footer { border-top-color: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .btn-text { color: #6b5840; }
[data-theme="light"] .btn-text:hover { color: #92400e; }
[data-theme="light"] .btn-pill.primary {
  background: linear-gradient(135deg, #d97706, #b45309);
  color: #fff;
  box-shadow: 0 6px 18px rgba(217, 119, 6, 0.30);
}
[data-theme="light"] .btn-pill.primary:hover:not(:disabled) {
  box-shadow: 0 12px 28px rgba(217, 119, 6, 0.42);
}
[data-theme="light"] .btn-pill.primary:disabled {
  background: rgba(40, 25, 10, 0.10);
  color: rgba(40, 25, 10, 0.40);
  box-shadow: none;
}
</style>
