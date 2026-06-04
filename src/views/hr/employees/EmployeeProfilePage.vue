<template>
  <div class="emp-profile-page">
    <!-- ────────────── Page header ────────────── -->
    <header class="page-head" ref="headerRef">
      <div class="head-aurora" aria-hidden="true" />
      <div class="head-grid" aria-hidden="true" />

      <div class="head-row crumb-row">
        <button class="back-btn" @click="goBack">
          <ArrowLeft :size="14" /> Back to employees
        </button>
        <span class="head-status">
          <LifecycleBadge v-if="emp?.lifecycle_state" :state="emp.lifecycle_state" size="md" />
        </span>
      </div>

      <div class="head-row identity-row">
        <div class="identity-left">
          <EmployeeAvatar
            v-if="emp"
            :name="displayName"
            :avatar-url="emp?.user?.avatar_url"
            :seed="emp?.employee_id"
            size="xxl"
            aurora
          />
          <div v-else class="identity-skeleton" />
          <div class="identity-text">
            <span class="identity-eyebrow">
              <span class="dot" /> Employee Profile
            </span>
            <h1 class="identity-name">{{ displayName }}</h1>
            <div class="identity-meta">
              <span class="mono">{{ emp?.employee_id || '—' }}</span>
              <span v-if="emp?.designation?.name" class="sep">·</span>
              <span v-if="emp?.designation?.name">{{ emp.designation.name }}</span>
              <span v-if="emp?.department?.name" class="sep">·</span>
              <span v-if="emp?.department?.name">{{ emp.department.name }}</span>
            </div>
          </div>
        </div>

        <!-- Lifecycle actions -->
        <div class="identity-actions">
          <button
            v-for="a in availableActions"
            :key="a.key"
            type="button"
            class="action-btn"
            :class="`tone-${a.tone}`"
            @click="openActionModal(a.key)"
          >
            <component :is="a.icon" :size="13" />
            <span>{{ a.label }}</span>
          </button>
          <button
            v-if="emp"
            type="button"
            class="action-btn tone-danger"
            @click="openDeleteModal"
            title="Permanently delete this employee"
          >
            <Trash2 :size="13" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      <!-- Tour-style KPI strip -->
      <div class="head-row kpi-row">
        <div class="kpi">
          <span class="kpi-label">Tenure</span>
          <span class="kpi-value">{{ tenure }}</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">Joined</span>
          <span class="kpi-value">{{ fmtDate(emp?.joining_date) || '—' }}</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">Employment</span>
          <span class="kpi-value">{{ fmtEmploymentType(emp?.employment_type) }}</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">Category</span>
          <span class="kpi-value">{{ fmtCategory(emp?.employee_category) }}</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">Reports To</span>
          <span class="kpi-value">{{ emp?.reporting_manager?.full_name || '—' }}</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">Location</span>
          <span class="kpi-value">{{ emp?.work_location_text || emp?.work_location?.name || '—' }}</span>
        </div>
      </div>

      <!-- Tab strip -->
      <nav class="tab-strip">
        <button
          v-for="(t, idx) in tabs"
          :key="t.key"
          ref="tabBtns"
          class="tab-btn"
          :class="{ active: activeTab === t.key }"
          @click="setTab(t.key, idx)"
        >
          <component :is="t.icon" :size="14" />
          <span>{{ t.label }}</span>
        </button>
        <span class="tab-underline" :style="underlineStyle" />
      </nav>
    </header>

    <!-- ────────────── Loading / empty ────────────── -->
    <div v-if="loading" class="page-loading">
      <Loader2 class="spin" :size="22" />
      <p>Loading profile…</p>
    </div>
    <div v-else-if="!emp" class="page-empty">
      <UserX :size="32" />
      <p>Employee not found.</p>
      <button class="ghost-cta" @click="goBack">← Back</button>
    </div>

    <!-- ────────────── Body ────────────── -->
    <main v-else class="page-body">
      <transition :name="`tab-${slideDir}`" mode="out-in">
        <section :key="activeTab" class="tab-pane">

          <!-- ════════ Basic Info ════════ -->
          <div v-if="activeTab === 'basic'" class="card-grid">
            <ProfileCard title="Identity" :icon="IdCard" :editing="editing.basic" @edit="startEdit('basic')" @cancel="cancelEdit('basic')" @save="saveSection('basic')" :saving="saving">
              <template v-if="!editing.basic">
                <DataPair label="Full Name" :value="displayName" />
                <DataPair label="Employee ID" :value="emp.employee_id" mono />
                <DataPair label="Employee Code" :value="emp.employee_code" mono />
                <DataPair label="Email" :value="emp.user?.email" />
                <DataPair label="Date of Birth" :value="emp.dob ? `${fmtDate(emp.dob)} · age ${age}` : '—'" />
                <DataPair label="Gender" :value="emp.gender" />
                <DataPair label="Marital Status" :value="fmtTitle(emp.marital_status)" />
                <DataPair label="Blood Group" :value="emp.blood_group" />
                <DataPair label="Nationality" :value="emp.nationality" />
                <DataPair label="Religion" :value="emp.religion" />
              </template>
              <template v-else>
                <!-- Employee ID is auto-generated (locked). Employee Code is
                     a manual external identifier (payroll/biometric/etc.) and
                     is editable. Full Name + Email + employee_code live on
                     the linked User; backend mirrors employee_code to the
                     Employee row for fast queries. -->
                <div class="readonly-strip">
                  <div class="ro-cell"><span class="ro-label">Employee ID</span><span class="ro-value mono">{{ emp.employee_id }}</span></div>
                </div>
                <div class="edit-grid">
                  <div class="field-block"><HrFieldLabel label="Employee Code" helper="Optional external code — must be unique across employees" /><HrInput v-model="form.employee_code" mono placeholder="e.g. PAY-4421" /></div>
                  <div class="field-block"><HrFieldLabel label="Email" required /><HrInput v-model="form.email" type="email" placeholder="employee@company.com" /></div>
                  <div class="field-block full"><HrFieldLabel label="Full Name" required /><HrInput v-model="form.full_name" placeholder="As per official records" /></div>
                  <div class="field-block"><HrFieldLabel label="Gender" /><HrSelect v-model="form.gender" :options="genderOpts" placeholder="—" /></div>
                  <div class="field-block"><HrFieldLabel label="Date of Birth" /><HrDatePicker v-model="form.dob" /></div>
                  <div class="field-block"><HrFieldLabel label="Marital Status" /><HrSelect v-model="form.marital_status" :options="maritalOpts" placeholder="—" /></div>
                  <div class="field-block"><HrFieldLabel label="Blood Group" /><HrInput v-model="form.blood_group" placeholder="e.g. B+" /></div>
                  <div class="field-block"><HrFieldLabel label="Nationality" /><HrInput v-model="form.nationality" /></div>
                  <div class="field-block"><HrFieldLabel label="Religion" /><HrInput v-model="form.religion" placeholder="e.g. Hindu, Muslim, Christian…" /></div>
                </div>
              </template>
            </ProfileCard>

            <ProfileCard title="Statutory IDs" :icon="ShieldCheck" :editing="editing.basic_ids" @edit="startEdit('basic_ids')" @cancel="cancelEdit('basic_ids')" @save="saveSection('basic_ids')" :saving="saving">
              <template v-if="!editing.basic_ids">
                <DataPair label="Aadhaar" :value="emp.aadhaar_last_4 ? `XXXX XXXX ${emp.aadhaar_last_4}` : '—'" mono />
                <DataPair label="PAN" :value="emp.pan" mono />
                <DataPair label="Passport No." :value="emp.passport_number" />
                <DataPair label="Passport Expiry" :value="fmtDate(emp.passport_expiry)" />
                <DataPair label="Driving License" :value="emp.driving_license" />
              </template>
              <template v-else>
                <div class="edit-grid">
                  <div class="field-block full">
                    <HrFieldLabel label="Aadhaar Number" helper="12 digits — only the last 4 are persisted server-side" />
                    <HrInput
                      v-model="form.aadhaar_full"
                      :maxlength="14"
                      mono
                      placeholder="1234 5678 9012"
                      @update:modelValue="onAadhaarInput"
                    />
                  </div>
                  <div class="field-block"><HrFieldLabel label="PAN" /><HrInput v-model="form.pan" :maxlength="10" mono placeholder="ABCDE1234F" @blur="form.pan = form.pan ? form.pan.toUpperCase() : ''" /></div>
                  <div class="field-block"><HrFieldLabel label="Passport No." /><HrInput v-model="form.passport_number" /></div>
                  <div class="field-block"><HrFieldLabel label="Passport Expiry" /><HrDatePicker v-model="form.passport_expiry" /></div>
                  <div class="field-block full"><HrFieldLabel label="Driving License" /><HrInput v-model="form.driving_license" /></div>
                </div>
              </template>
            </ProfileCard>
          </div>

          <!-- ════════ Contact ════════ -->
          <div v-else-if="activeTab === 'contact'" class="card-grid">
            <ProfileCard title="Direct Contact" :icon="Phone" :editing="editing.contact" @edit="startEdit('contact')" @cancel="cancelEdit('contact')" @save="saveSection('contact')" :saving="saving">
              <template v-if="!editing.contact">
                <DataPair label="Mobile" :value="emp.mobile" mono />
                <DataPair label="Email" :value="emp.user?.email" />
              </template>
              <template v-else>
                <div class="readonly-strip">
                  <div class="ro-cell"><span class="ro-label">Email</span><span class="ro-value">{{ emp.user?.email || '—' }}</span></div>
                  <div class="ro-cell"><span class="ro-label">Employee ID</span><span class="ro-value mono">{{ emp.employee_id }}</span></div>
                </div>
                <div class="edit-grid">
                  <div class="field-block full"><HrFieldLabel label="Mobile" helper="10-digit number" /><HrInput v-model="form.mobile" digits :maxlength="10" inputmode="numeric" placeholder="9876543210" /></div>
                </div>
              </template>
            </ProfileCard>

            <ProfileCard title="Emergency Contact" :icon="AlertOctagon" :editing="editing.contact_emergency" @edit="startEdit('contact_emergency')" @cancel="cancelEdit('contact_emergency')" @save="saveSection('contact_emergency')" :saving="saving">
              <template v-if="!editing.contact_emergency">
                <DataPair label="Name" :value="emp.emergency_contact_name" />
                <DataPair label="Phone" :value="emp.emergency_contact_phone" mono />
                <DataPair label="Relation" :value="emp.emergency_contact_relation" />
              </template>
              <template v-else>
                <div class="edit-grid">
                  <div class="field-block"><HrFieldLabel label="Name" /><HrInput v-model="form.emergency_contact_name" /></div>
                  <div class="field-block"><HrFieldLabel label="Phone" helper="10-digit" /><HrInput v-model="form.emergency_contact_phone" digits :maxlength="10" inputmode="numeric" /></div>
                  <div class="field-block full"><HrFieldLabel label="Relation" /><HrSelect v-model="form.emergency_contact_relation" :options="relationOpts" placeholder="Select relation" /></div>
                </div>
              </template>
            </ProfileCard>

            <ProfileCard class="card-wide" title="Addresses" :icon="Home" :editing="editing.contact_address" @edit="startEdit('contact_address')" @cancel="cancelEdit('contact_address')" @save="saveSection('contact_address')" :saving="saving">
              <template v-if="!editing.contact_address">
                <DataPair label="Permanent" :value="emp.permanent_address || '—'" multiline />
                <DataPair label="Current" :value="emp.current_same_as_permanent ? '(same as permanent)' : (emp.current_address || '—')" multiline />
              </template>
              <template v-else>
                <div class="edit-grid">
                  <div class="field-block full"><HrFieldLabel label="Permanent Address" /><HrTextarea v-model="form.permanent_address" :rows="2" /></div>
                  <div class="field-block full"><HrCheckbox v-model="form.current_same_as_permanent" label="Current address same as permanent" /></div>
                  <div v-if="!form.current_same_as_permanent" class="field-block full"><HrFieldLabel label="Current Address" /><HrTextarea v-model="form.current_address" :rows="2" /></div>
                </div>
              </template>
            </ProfileCard>
          </div>

          <!-- ════════ Employment ════════ -->
          <div v-else-if="activeTab === 'employment'" class="card-grid">
            <ProfileCard title="Role" :icon="Briefcase" :editing="editing.employment_role" @edit="startEdit('employment_role')" @cancel="cancelEdit('employment_role')" @save="saveSection('employment_role')" :saving="saving">
              <template v-if="!editing.employment_role">
                <DataPair label="Department" :value="emp.department?.name" />
                <DataPair label="Designation" :value="emp.designation?.name" />
                <DataPair label="Employment Type" :value="fmtEmploymentType(emp.employment_type)" />
                <DataPair label="Category" :value="fmtCategory(emp.employee_category)" />
                <DataPair label="Grade" :value="emp.grade?.name" />
                <DataPair label="Pay Level" :value="emp.pay_level" />
              </template>
              <template v-else>
                <div class="readonly-strip">
                  <div class="ro-cell"><span class="ro-label">Employee</span><span class="ro-value">{{ displayName }}</span></div>
                  <div class="ro-cell"><span class="ro-label">Joined</span><span class="ro-value">{{ fmtDate(emp.joining_date) || '—' }}</span></div>
                </div>
                <div class="edit-grid">
                  <div class="field-block full"><HrFieldLabel label="Department" /><HrSelect v-model="form.department_id" :options="departmentOpts" placeholder="Select department" /></div>
                  <div class="field-block full"><HrFieldLabel label="Designation" /><HrSelect v-model="form.designation_id" :options="designationOpts" placeholder="Select designation" /></div>
                  <div class="field-block full"><HrFieldLabel label="Employment Type" /><HrRadio v-model="form.employment_type" :options="employmentTypeOpts" /></div>
                  <div class="field-block full"><HrFieldLabel label="Employee Category" /><HrRadio v-model="form.employee_category" :options="categoryOpts" /></div>
                  <div class="field-block"><HrFieldLabel label="Grade" /><HrSelect v-model="form.grade_id" :options="gradeOpts" placeholder="Select grade" /></div>
                  <div class="field-block"><HrFieldLabel label="Pay Level" /><HrInput v-model="form.pay_level" /></div>
                </div>
              </template>
            </ProfileCard>

            <ProfileCard title="Tenure & Reporting" :icon="Calendar" :editing="editing.employment_tenure" @edit="startEdit('employment_tenure')" @cancel="cancelEdit('employment_tenure')" @save="saveSection('employment_tenure')" :saving="saving">
              <template v-if="!editing.employment_tenure">
                <DataPair label="Joining Date" :value="fmtDate(emp.joining_date)" />
                <DataPair label="Confirmation Date" :value="fmtDate(emp.confirmation_date)" />
                <DataPair label="Probation (months)" :value="emp.probation_months" />
                <DataPair label="Notice Period" :value="emp.notice_period_days ? `${emp.notice_period_days} days` : '—'" />
                <DataPair label="Reporting Manager" :value="emp.reporting_manager?.full_name" />
                <DataPair label="HR Manager" :value="emp.hr_manager?.full_name" />
                <DataPair label="Work Location" :value="emp.work_location_text || emp.work_location?.name" />
              </template>
              <template v-else>
                <div class="edit-grid">
                  <div class="field-block"><HrFieldLabel label="Joining Date" /><HrDatePicker v-model="form.joining_date" /></div>
                  <div class="field-block"><HrFieldLabel label="Confirmation Date" /><HrDatePicker v-model="form.confirmation_date" /></div>
                  <div class="field-block"><HrFieldLabel label="Probation (months)" /><HrNumberInput v-model="form.probation_months" :min="0" :max="36" /></div>
                  <div class="field-block"><HrFieldLabel label="Notice Period (days)" /><HrNumberInput v-model="form.notice_period_days" :min="0" :max="365" /></div>
                  <div class="field-block full">
                    <HrFieldLabel label="Reporting Manager" />
                    <HrSearchCombobox
                      v-model="form.reporting_manager_id"
                      :search="searchUsers"
                      :selected-label="form._reportingManagerLabel"
                      placeholder="Search by name or email…"
                      @change="(u) => onUserPicked('_reportingManagerLabel', u)"
                    />
                  </div>
                  <div class="field-block full">
                    <HrFieldLabel label="HR Manager" helper="Optional" />
                    <HrSearchCombobox
                      v-model="form.hr_manager_id"
                      :search="searchUsers"
                      :selected-label="form._hrManagerLabel"
                      placeholder="Search HR managers…"
                      @change="(u) => onUserPicked('_hrManagerLabel', u)"
                    />
                  </div>
                  <div class="field-block full"><HrFieldLabel label="Work Location" helper="Type freely (e.g. HQ — Mumbai)" /><HrInput v-model="form.work_location_text" placeholder="Type a location…" /></div>
                </div>
              </template>
            </ProfileCard>
          </div>

          <!-- ════════ Bank & Salary ════════ -->
          <div v-else-if="activeTab === 'bank'" class="card-grid">
            <ProfileCard
              title="Banking"
              :icon="Banknote"
              :editing="editing.bank_main"
              danger
              @edit="onEditBank"
              @cancel="cancelEdit('bank_main')"
              @save="saveSection('bank_main')"
              :saving="saving"
            >
              <template v-if="!editing.bank_main">
                <DataPair label="Bank Name" :value="emp.bank_name" />
                <DataPair label="Account No.">
                  <template #value>
                    <span class="mono">{{ revealBank ? unmaskedAccount : maskedAccount }}</span>
                  </template>
                </DataPair>
                <div class="reveal-row">
                  <button class="ghost-mini" @click="toggleRevealBank">
                    <component :is="revealBank ? EyeOff : Eye" :size="12" />
                    {{ revealBank ? 'Hide' : 'Reveal' }} account number
                  </button>
                </div>
                <DataPair label="IFSC" :value="emp.ifsc" mono />
              </template>
              <template v-else>
                <div class="warn-banner">
                  <ShieldAlert :size="14" />
                  <span>You are editing sensitive bank information.</span>
                </div>
                <div class="readonly-strip">
                  <div class="ro-cell"><span class="ro-label">Employee</span><span class="ro-value">{{ displayName }}</span></div>
                  <div class="ro-cell"><span class="ro-label">Employee ID</span><span class="ro-value mono">{{ emp.employee_id }}</span></div>
                  <div class="ro-cell"><span class="ro-label">Current IFSC</span><span class="ro-value mono">{{ emp.ifsc || '—' }}</span></div>
                </div>
                <div class="edit-grid">
                  <div class="field-block full"><HrFieldLabel label="Bank Name" /><HrInput v-model="form.bank_name" /></div>
                  <div class="field-block full"><HrFieldLabel label="Account Number" /><HrInput v-model="form.account_number" digits :maxlength="18" mono placeholder="Enter new account number to update" /></div>
                  <div class="field-block"><HrFieldLabel label="IFSC" /><HrInput v-model="form.ifsc" :maxlength="11" mono @blur="form.ifsc = form.ifsc ? form.ifsc.toUpperCase() : ''" /></div>
                </div>
              </template>
            </ProfileCard>

            <ProfileCard
              title="Statutory"
              :icon="Stamp"
              :editing="editing.bank_statutory"
              @edit="startEdit('bank_statutory')"
              @cancel="cancelEdit('bank_statutory')"
              @save="saveSection('bank_statutory')"
              :saving="saving"
            >
              <template v-if="!editing.bank_statutory">
                <DataPair label="UAN" :value="emp.uan" mono />
                <DataPair label="PF Number" :value="emp.pf_number" mono />
                <DataPair label="ESI Number" :value="emp.esic_number" mono />
                <DataPair label="Tax Regime" :value="emp.tax_regime === 'OLD' ? 'Old Regime' : (emp.tax_regime === 'NEW' ? 'New Regime' : '')" />
              </template>
              <template v-else>
                <div class="edit-grid">
                  <div class="field-block"><HrFieldLabel label="UAN" helper="12-digit UAN" /><HrInput v-model="form.uan" digits :maxlength="12" mono /></div>
                  <div class="field-block"><HrFieldLabel label="PF Number" /><HrInput v-model="form.pf_number" mono /></div>
                  <div class="field-block full"><HrFieldLabel label="ESI Number" /><HrInput v-model="form.esic_number" mono /></div>
                  <div class="field-block full"><HrFieldLabel label="Tax Regime" /><HrRadio v-model="form.tax_regime" :options="taxRegimeOpts" /></div>
                </div>
              </template>
            </ProfileCard>

            <ProfileCard
              class="card-wide"
              title="Compensation"
              :icon="Wallet"
              :editing="editing.bank_ctc"
              @edit="startEdit('bank_ctc')"
              @cancel="cancelEdit('bank_ctc')"
              @save="saveSection('bank_ctc')"
              :saving="saving"
            >
              <template v-if="!editing.bank_ctc">
                <div class="ctc-grid">
                  <div class="ctc-cell">
                    <span class="ctc-label">Monthly CTC</span>
                    <span class="ctc-value">{{ formatINR(emp.monthly_ctc) || '—' }}</span>
                  </div>
                  <div class="ctc-cell highlight">
                    <span class="ctc-label">Annual CTC</span>
                    <span class="ctc-value gold">{{ formatINR(emp.annual_ctc) || '—' }}</span>
                  </div>
                </div>
                <!-- Indian salary structure preview (read-only mode) -->
                <div v-if="salaryStructure" class="ss-preview">
                  <div class="ss-preview-head">
                    <span class="ss-preview-eye">SALARY STRUCTURE · INDIAN STANDARD</span>
                    <span class="ss-preview-net">Take-Home ≈ ₹{{ salaryStructure.monthly.net.toLocaleString('en-IN') }}/mo</span>
                  </div>
                  <table class="ss-mini">
                    <thead><tr><th>Component</th><th class="num">Monthly</th><th class="num">Annual</th></tr></thead>
                    <tbody>
                      <tr><td>Basic</td><td class="num">{{ salaryStructure.monthly.basic.toLocaleString('en-IN') }}</td><td class="num">{{ salaryStructure.basic.toLocaleString('en-IN') }}</td></tr>
                      <tr><td>HRA</td><td class="num">{{ salaryStructure.monthly.hra.toLocaleString('en-IN') }}</td><td class="num">{{ salaryStructure.hra.toLocaleString('en-IN') }}</td></tr>
                      <tr><td>Special</td><td class="num">{{ salaryStructure.monthly.special.toLocaleString('en-IN') }}</td><td class="num">{{ salaryStructure.special.toLocaleString('en-IN') }}</td></tr>
                      <tr><td>Conveyance + Medical + LTA + Telephone + Meal</td><td class="num">{{ (salaryStructure.monthly.conveyance + salaryStructure.monthly.medical + salaryStructure.monthly.lta + salaryStructure.monthly.telephone + salaryStructure.monthly.food).toLocaleString('en-IN') }}</td><td class="num">{{ (salaryStructure.conveyance + salaryStructure.medical + salaryStructure.lta + salaryStructure.telephone + salaryStructure.food).toLocaleString('en-IN') }}</td></tr>
                      <tr class="r-total"><td>Gross Salary</td><td class="num">{{ salaryStructure.monthly.gross.toLocaleString('en-IN') }}</td><td class="num">{{ salaryStructure.gross.toLocaleString('en-IN') }}</td></tr>
                      <tr><td>Employer PF + Gratuity</td><td class="num">{{ (salaryStructure.monthly.employerPf + salaryStructure.monthly.gratuity).toLocaleString('en-IN') }}</td><td class="num">{{ (salaryStructure.employerPf + salaryStructure.gratuity).toLocaleString('en-IN') }}</td></tr>
                      <tr class="r-ded"><td>Employee PF + Professional Tax (-)</td><td class="num">{{ (salaryStructure.monthly.employeePf + salaryStructure.monthly.profTax).toLocaleString('en-IN') }}</td><td class="num">{{ (salaryStructure.employeePf + salaryStructure.profTax).toLocaleString('en-IN') }}</td></tr>
                      <tr class="r-net"><td>Net Take-Home (indicative)</td><td class="num">{{ salaryStructure.monthly.net.toLocaleString('en-IN') }}</td><td class="num">{{ salaryStructure.netAnnual.toLocaleString('en-IN') }}</td></tr>
                    </tbody>
                  </table>
                </div>
                <p class="muted-note" v-else>Set the Annual CTC to see the auto-derived Indian salary structure.</p>
              </template>
              <template v-else>
                <div class="edit-grid">
                  <div class="field-block"><HrFieldLabel label="Annual CTC (₹)" :helper="form.annual_ctc ? `Monthly ≈ ₹${Number(form.annual_ctc / 12).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : 'Required'" /><HrNumberInput v-model="form.annual_ctc" :min="0" :step-by="50000" /></div>
                  <div class="field-block"><HrFieldLabel label="Monthly CTC (₹)" :helper="autoAnnual ? `Auto · Annual ₹${autoAnnual}` : 'Auto-derived'" /><HrNumberInput v-model="form.monthly_ctc" :min="0" :step-by="1000" /></div>
                </div>
              </template>
            </ProfileCard>
          </div>

          <!-- ════════ History ════════ -->
          <div v-else-if="activeTab === 'history'" class="history-pane">
            <div class="history-head">
              <h3>Lifecycle Events</h3>
              <p>Chronological audit trail for this employee.</p>
            </div>
            <div v-if="historyLoading" class="loading-row">
              <Loader2 class="spin" :size="16" /> Loading…
            </div>
            <ol v-else-if="historyRows.length" class="timeline">
              <li v-for="(row, idx) in historyRows" :key="row.id" class="timeline-item" :style="{ '--i': idx }">
                <div class="t-marker" :class="`type-${row.change_type.toLowerCase()}`">
                  <component :is="historyIcon(row.change_type)" :size="14" />
                </div>
                <div class="t-content">
                  <div class="t-head">
                    <strong>{{ formatChangeType(row.change_type) }}</strong>
                    <span class="t-date">{{ fmtDate(row.effective_date) || fmtDate(row.created_at) }}</span>
                  </div>
                  <p v-if="row.reason" class="t-reason">{{ row.reason }}</p>
                  <p v-if="row.actioned_by_name" class="t-actor">by {{ row.actioned_by_name }}</p>
                </div>
              </li>
            </ol>
            <p v-else class="muted-note">No lifecycle events yet.</p>
          </div>

        </section>
      </transition>
    </main>

    <LifecycleActionModal
      :open="actionModalOpen"
      :action="actionModalKey"
      :employee="emp"
      :reference="reference"
      :submitting="lifecycleSubmitting"
      @close="onModalClose"
      @confirm="submitAction"
    />

    <!-- Delete Employee — type-to-confirm safeguard -->
    <transition name="del-modal">
      <div v-if="deleteOpen" class="del-backdrop" @click.self="closeDeleteModal" @keydown.esc="closeDeleteModal">
        <div class="del-card hr-spotlight" ref="deleteCardRef">
          <header class="del-head">
            <span class="del-icon"><AlertTriangle :size="16" /></span>
            <div>
              <h4>Delete Employee</h4>
              <p>This action is irreversible. Any history rows tied to this employee will also be removed.</p>
            </div>
            <button class="close-x" @click="closeDeleteModal" aria-label="Close"><X :size="16" /></button>
          </header>

          <div class="del-body">
            <div class="del-target">
              <EmployeeAvatar :name="displayName" :seed="emp?.employee_id" size="md" />
              <div>
                <strong>{{ displayName }}</strong>
                <span class="mono">{{ emp?.employee_id }}</span>
              </div>
            </div>

            <p class="del-prompt">Type <code>DELETE</code> below to confirm permanent removal:</p>
            <input
              v-model="deleteConfirmText"
              class="del-input"
              placeholder="Type DELETE here"
              autocomplete="off"
            />
            <label class="del-soft">
              <input type="checkbox" v-model="deleteSoftOnly" />
              <span>Soft-delete only (move to Archive — recoverable later)</span>
            </label>
          </div>

          <footer class="del-foot">
            <button class="ghost" @click="closeDeleteModal">Cancel</button>
            <button
              class="primary danger"
              :disabled="!canConfirmDelete || deletingEmp"
              @click="confirmDelete"
            >
              <Loader2 v-if="deletingEmp" class="spin" :size="13" />
              <Trash2 v-else :size="13" />
              {{ deleteSoftOnly ? 'Archive Employee' : 'Permanently Delete' }}
            </button>
          </footer>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, nextTick, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft, Loader2, UserX,
  IdCard, Phone, Briefcase, Banknote, History, ShieldCheck, ShieldAlert, AlertOctagon, Home, Calendar, Stamp, Wallet,
  Edit, Check, X, Eye, EyeOff,
  Plus, ArrowUp, ArrowRight, CheckCircle, Pause, Play, LogOut, Archive, Undo2,
  Trash2, AlertTriangle,
} from 'lucide-vue-next'
import axios from 'axios'
import '../../../styles/hr-theme.css'

import LifecycleBadge from '../../../components/hr/LifecycleBadge.vue'
import EmployeeAvatar from '../../../components/hr/EmployeeAvatar.vue'

import HrFieldLabel from '../../../components/hr/forms/HrFieldLabel.vue'
import HrInput from '../../../components/hr/forms/HrInput.vue'
import HrNumberInput from '../../../components/hr/forms/HrNumberInput.vue'
import HrTextarea from '../../../components/hr/forms/HrTextarea.vue'
import HrSelect from '../../../components/hr/forms/HrSelect.vue'
import HrDatePicker from '../../../components/hr/forms/HrDatePicker.vue'
import HrCheckbox from '../../../components/hr/forms/HrCheckbox.vue'
import HrRadio from '../../../components/hr/forms/HrRadio.vue'
import HrSearchCombobox from '../../../components/hr/forms/HrSearchCombobox.vue'
import LifecycleActionModal from '../../../components/hr/LifecycleActionModal.vue'

import { useEmployees, useHrReference } from '../../../composables/useEmployees'
import { useToast } from '../../../composables/useToast'
import { useSpotlight } from '../../../composables/useSpotlight'
import { API } from '@/utils/api'
import { deriveSalaryStructure } from '@/utils/edocPdfGenerator'

// ─── Small inline display components ───
const DataPair = {
  props: {
    label: { type: String, required: true },
    value: { type: [String, Number, null], default: '' },
    mono: { type: Boolean, default: false },
    multiline: { type: Boolean, default: false },
  },
  setup(p, { slots }) {
    return () => h('div', { class: ['data-pair', { multiline: p.multiline }] }, [
      h('span', { class: 'dp-label' }, p.label),
      slots.value
        ? slots.value()
        : h('span', { class: ['dp-value', { mono: p.mono, muted: !p.value }] }, p.value || '—'),
    ])
  },
}

const ProfileCard = {
  props: {
    title: { type: String, required: true },
    icon: { type: [Object, Function], default: null },
    editing: { type: Boolean, default: false },
    saving: { type: Boolean, default: false },
    danger: { type: Boolean, default: false },
  },
  emits: ['edit', 'cancel', 'save'],
  setup(p, { slots, emit }) {
    return () => h('div', { class: ['profile-card', { 'is-editing': p.editing, danger: p.danger }] }, [
      h('header', { class: 'pc-head' }, [
        h('span', { class: 'pc-title' }, [
          p.icon ? h(p.icon, { size: 14, class: 'pc-icon' }) : null,
          p.title,
        ]),
        h('div', { class: 'pc-tools' },
          p.editing
            ? [
                h('button', { class: 'cancel-btn', onClick: () => emit('cancel') }, 'Cancel'),
                h('button', {
                  class: 'save-btn',
                  disabled: p.saving,
                  onClick: () => emit('save'),
                }, [p.saving ? h(Loader2, { size: 12, class: 'spin' }) : h(Check, { size: 12 }), ' Save']),
              ]
            : [h('button', { class: 'edit-btn', onClick: () => emit('edit') }, [h(Edit, { size: 12 }), ' Edit'])],
        ),
      ]),
      h('div', { class: 'pc-body' }, slots.default?.()),
    ])
  },
}

const route = useRoute()
const router = useRouter()
const { success, error } = useToast()
const { reference, loadReferenceData } = useHrReference()
const { getOne, update, history, lifecycle } = useEmployees()

const headerRef = ref(null)
useSpotlight(headerRef)

const emp = ref(null)
const loading = ref(false)
const saving = ref(false)
const revealBank = ref(false)
const unmaskedAccount = ref('')

const tabs = [
  { key: 'basic',      label: 'Basic Info',    icon: IdCard },
  { key: 'contact',    label: 'Contact',       icon: Phone },
  { key: 'employment', label: 'Employment',    icon: Briefcase },
  { key: 'bank',       label: 'Bank & Salary', icon: Banknote },
  { key: 'history',    label: 'History',       icon: History },
]
const activeTab = ref('basic')
const slideDir = ref('right')
const tabBtns = ref([])
const underlineStyle = ref({ left: '0px', width: '0px', opacity: 0 })

const editing = reactive({
  basic: false, basic_ids: false,
  contact: false, contact_emergency: false, contact_address: false,
  employment_role: false, employment_tenure: false,
  bank_main: false, bank_statutory: false, bank_ctc: false,
})
const form = reactive({})

const historyRows = ref([])
const historyLoading = ref(false)

// ─── Static options ───
const genderOpts = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
]
const maritalOpts = [
  { value: 'SINGLE', label: 'Single' },
  { value: 'MARRIED', label: 'Married' },
  { value: 'DIVORCED', label: 'Divorced' },
  { value: 'WIDOWED', label: 'Widowed' },
  { value: 'OTHER', label: 'Other' },
]
const employmentTypeOpts = [
  { value: 'FULL_TIME', label: 'Full-Time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'INTERN', label: 'Intern' },
  { value: 'CONSULTANT', label: 'Consultant' },
  { value: 'PART_TIME', label: 'Part-Time' },
]
const taxRegimeOpts = [
  { value: 'OLD', label: 'Old Regime' },
  { value: 'NEW', label: 'New Regime' },
]
const relationOpts = [
  { value: 'Spouse', label: 'Spouse' },
  { value: 'Parent', label: 'Parent' },
  { value: 'Sibling', label: 'Sibling' },
  { value: 'Child', label: 'Child' },
  { value: 'Guardian', label: 'Guardian' },
  { value: 'Other', label: 'Other' },
]
const categoryOpts = [
  { value: 'PERMANENT',    label: 'Permanent' },
  { value: 'PROBATIONARY', label: 'Probationary' },
  { value: 'CONTRACT',     label: 'Contract' },
  { value: 'TRAINEE',      label: 'Trainee' },
]

const departmentOpts = computed(() => reference.departments.map(d => ({ value: d.id, label: d.name })))
const designationOpts = computed(() => reference.designations.map(d => ({ value: d.id, label: d.name })))
const gradeOpts = computed(() => reference.grades.map(g => ({ value: g.id, label: `${g.code} — ${g.name}` })))

const displayName = computed(() => emp.value?.user?.full_name || emp.value?.full_name || '—')

const age = computed(() => {
  if (!emp.value?.dob) return ''
  const d = new Date(emp.value.dob); const now = new Date()
  let a = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--
  return a
})
const tenure = computed(() => {
  if (!emp.value?.joining_date) return '—'
  const start = new Date(emp.value.joining_date)
  const end = emp.value.exit_date ? new Date(emp.value.exit_date) : new Date()
  const ms = end - start
  const days = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
  const years = Math.floor(days / 365)
  const months = Math.floor((days % 365) / 30)
  if (years > 0) return `${years}y ${months}m`
  return `${months}m`
})

const fmtDate = (d) => {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) } catch { return d }
}
const fmtTitle = (s) => s ? String(s).charAt(0).toUpperCase() + String(s).slice(1).toLowerCase() : ''
const fmtEmploymentType = (s) => ({ FULL_TIME: 'Full-Time', CONTRACT: 'Contract', INTERN: 'Intern', CONSULTANT: 'Consultant', PART_TIME: 'Part-Time' }[s] || s || '—')
const fmtCategory = (s) => ({ PERMANENT: 'Permanent', PROBATIONARY: 'Probationary', CONTRACT: 'Contract', TRAINEE: 'Trainee' }[s] || s || '—')

const formatINR = (n) => {
  if (n === null || n === undefined || n === '') return ''
  const num = Number(n)
  if (!Number.isFinite(num)) return ''
  return num.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
}

const autoAnnual = computed(() => {
  const m = Number(form.monthly_ctc)
  return m > 0 ? (m * 12).toLocaleString('en-IN') : ''
})

// Live Indian salary structure — derived from the saved annual_ctc on the employee record.
const salaryStructure = computed(() => {
  const annual = Number(emp.value?.annual_ctc)
  return Number.isFinite(annual) && annual > 0 ? deriveSalaryStructure(annual) : null
})

const maskedAccount = computed(() => emp.value?.account_number || '—')

// Tabs
const setTab = (key, idx) => {
  const prev = tabs.findIndex(t => t.key === activeTab.value)
  slideDir.value = idx >= prev ? 'right' : 'left'
  activeTab.value = key
  nextTick(() => positionUnderline())
}
const positionUnderline = () => {
  const refs = tabBtns.value
  if (!refs?.length) return
  const idx = tabs.findIndex(t => t.key === activeTab.value)
  const btn = refs[idx]
  if (!btn) return
  underlineStyle.value = { left: `${btn.offsetLeft}px`, width: `${btn.offsetWidth}px`, opacity: 1 }
}

// Edit
const SECTION_FIELDS = {
  // Identity now also patches the linked User's full_name + email +
  // employee_code (backend mirrors employee_code to the Employee row).
  basic: ['full_name','email','employee_code','gender','dob','marital_status','blood_group','nationality','religion'],
  // aadhaar_full is the on-screen field — we extract last-4 on save below.
  basic_ids: ['aadhaar_full','pan','passport_number','passport_expiry','driving_license'],
  contact: ['mobile'],
  contact_emergency: ['emergency_contact_name','emergency_contact_phone','emergency_contact_relation'],
  contact_address: ['permanent_address','current_address','current_same_as_permanent'],
  employment_role: ['department_id','designation_id','employment_type','employee_category','grade_id','pay_level'],
  employment_tenure: ['joining_date','confirmation_date','probation_months','notice_period_days','reporting_manager_id','hr_manager_id','work_location_text'],
  bank_main: ['bank_name','account_number','ifsc'],
  bank_statutory: ['uan','pf_number','esic_number','tax_regime'],
  bank_ctc: ['monthly_ctc','annual_ctc'],
}

const collectFormFromEmp = () => {
  if (!emp.value) return
  Object.keys(form).forEach(k => delete form[k])
  // Hydrate the visible 12-digit aadhaar input from the stored last-4 so the
  // user sees the masked context; they can replace it entirely on edit.
  const lastFour = emp.value.aadhaar_last_4 || ''
  const aadhaarFullDisplay = lastFour ? `XXXX XXXX ${lastFour}` : ''
  Object.assign(form, {
    full_name: emp.value.user?.full_name || '',
    email: emp.value.user?.email || '',
    employee_code: emp.value.employee_code || emp.value.user?.employee_code || '',
    gender: emp.value.gender || '',
    dob: emp.value.dob || '',
    marital_status: emp.value.marital_status || '',
    blood_group: emp.value.blood_group || '',
    nationality: emp.value.nationality || '',
    religion: emp.value.religion || '',
    aadhaar_full: aadhaarFullDisplay,
    aadhaar_last_4: lastFour,
    pan: emp.value.pan || '',
    passport_number: emp.value.passport_number || '',
    passport_expiry: emp.value.passport_expiry || '',
    driving_license: emp.value.driving_license || '',
    mobile: emp.value.mobile || '',
    emergency_contact_name: emp.value.emergency_contact_name || '',
    emergency_contact_phone: emp.value.emergency_contact_phone || '',
    emergency_contact_relation: emp.value.emergency_contact_relation || '',
    permanent_address: emp.value.permanent_address || '',
    current_address: emp.value.current_address || '',
    current_same_as_permanent: !!emp.value.current_same_as_permanent,
    department_id: emp.value.department?.id || null,
    designation_id: emp.value.designation?.id || null,
    employment_type: emp.value.employment_type || '',
    employee_category: emp.value.employee_category || '',
    joining_date: emp.value.joining_date || '',
    confirmation_date: emp.value.confirmation_date || '',
    probation_months: emp.value.probation_months ?? null,
    notice_period_days: emp.value.notice_period_days ?? null,
    reporting_manager_id: emp.value.reporting_manager?.id || null,
    hr_manager_id: emp.value.hr_manager?.id || null,
    _reportingManagerLabel: emp.value.reporting_manager?.full_name || '',
    _hrManagerLabel: emp.value.hr_manager?.full_name || '',
    grade_id: emp.value.grade?.id || null,
    pay_level: emp.value.pay_level || '',
    work_location_text: emp.value.work_location_text || emp.value.work_location?.name || '',
    bank_name: emp.value.bank_name || '',
    account_number: '',
    ifsc: emp.value.ifsc || '',
    uan: emp.value.uan || '',
    pf_number: emp.value.pf_number || '',
    esic_number: emp.value.esic_number || '',
    tax_regime: emp.value.tax_regime || '',
    monthly_ctc: emp.value.monthly_ctc ?? null,
    annual_ctc: emp.value.annual_ctc ?? null,
  })
}

// Format the 12-digit aadhaar input — digits only, grouped as "1234 5678 9012".
const onAadhaarInput = (raw) => {
  const digits = String(raw || '').replace(/\D/g, '').slice(0, 12)
  const parts = []
  for (let i = 0; i < digits.length; i += 4) parts.push(digits.slice(i, i + 4))
  form.aadhaar_full = parts.join(' ')
}

// Combobox search for Reporting / HR Manager pickers.
const searchUsers = async (term) => {
  if (!term || term.length < 2) return []
  try {
    const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token')
    const res = await axios.get(`${API}/auth/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const t = term.toLowerCase()
    return (res.data || [])
      .filter(u => !u.is_superuser)
      .filter(u =>
        (u.full_name || '').toLowerCase().includes(t) ||
        (u.email || '').toLowerCase().includes(t) ||
        (u.employee_code || '').toLowerCase().includes(t)
      )
      .slice(0, 10)
      .map(u => ({
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        employee_id: u.employee_code,
        avatar_url: u.avatar_url,
      }))
  } catch {
    return []
  }
}

const onUserPicked = (labelKey, user) => {
  form[labelKey] = user ? (user.full_name || user.email || '') : ''
}

const startEdit = (section) => {
  collectFormFromEmp()
  editing[section] = true
}
const cancelEdit = (section) => { editing[section] = false }
const onEditBank = () => {
  if (!confirm('Editing bank info is sensitive. Continue?')) return
  startEdit('bank_main')
}

const saveSection = async (section) => {
  if (!emp.value) return
  saving.value = true
  try {
    const patch = {}
    for (const k of SECTION_FIELDS[section]) {
      const v = form[k]
      patch[k] = (v === '' || v === undefined) ? null : v
    }
    if (patch.pan) patch.pan = String(patch.pan).toUpperCase()
    if (patch.ifsc) patch.ifsc = String(patch.ifsc).toUpperCase()

    // Aadhaar: backend only persists the last 4. Strip non-digits and only
    // forward if the user typed a fresh 12-digit number (don't push the
    // masked placeholder back). Drop the synthetic aadhaar_full key.
    if (section === 'basic_ids') {
      const digits = String(patch.aadhaar_full || '').replace(/\D/g, '')
      if (digits.length === 12) {
        patch.aadhaar_last_4 = digits.slice(-4)
      }
      delete patch.aadhaar_full
    }

    // Bank: don't accidentally wipe the stored account number if the user
    // never typed a new one (the field is intentionally blank in edit mode).
    if (section === 'bank_main' && (!form.account_number || form.account_number.startsWith('X'))) {
      delete patch.account_number
    }

    const updated = await update(emp.value.id, patch)
    emp.value = updated
    editing[section] = false
    success('Profile updated')
  } catch (e) {
    error(e.response?.data?.detail || 'Failed to save')
  } finally {
    saving.value = false
  }
}

const toggleRevealBank = async () => {
  if (revealBank.value) { revealBank.value = false; return }
  try {
    const fresh = await getOne(emp.value.id, { revealBank: true })
    unmaskedAccount.value = fresh.account_number
    revealBank.value = true
  } catch {
    error('Failed to reveal account number')
  }
}

// History
const loadHistoryRows = async () => {
  if (!emp.value) return
  historyLoading.value = true
  try { historyRows.value = await history(emp.value.id) }
  catch { historyRows.value = [] }
  finally { historyLoading.value = false }
}
const formatChangeType = (t) => ({
  HIRED: 'Hired', PROFILE_UPDATED: 'Profile Updated', PROMOTED: 'Promoted',
  TRANSFERRED: 'Transferred', CONFIRMED: 'Confirmed', SUSPENDED: 'Suspended',
  REINSTATED: 'Reinstated', NOTICE_SERVED: 'Notice Served', EXITED: 'Exited',
  ARCHIVED: 'Archived',
}[t] || t)
const historyIcon = (t) => ({
  HIRED: Plus, PROFILE_UPDATED: Edit, PROMOTED: ArrowUp, TRANSFERRED: ArrowRight,
  CONFIRMED: CheckCircle, SUSPENDED: Pause, REINSTATED: Play,
  NOTICE_SERVED: Briefcase, EXITED: LogOut, ARCHIVED: Archive,
}[t] || History)

// Lifecycle action chips
const availableActions = computed(() => {
  if (!emp.value) return []
  const s = emp.value.lifecycle_state
  const out = []
  if (s === 'ON_PROBATION') out.push({ key: 'confirm', label: 'Confirm', icon: CheckCircle, tone: 'gold' })
  if (['ACTIVE','ON_PROBATION'].includes(s)) {
    out.push({ key: 'promote', label: 'Promote', icon: ArrowUp, tone: 'gold' })
    out.push({ key: 'transfer', label: 'Transfer', icon: ArrowRight, tone: 'neutral' })
    out.push({ key: 'give-notice', label: 'Give Notice', icon: Briefcase, tone: 'orange' })
    out.push({ key: 'suspend', label: 'Suspend', icon: Pause, tone: 'red' })
  }
  if (s === 'SUSPENDED') out.push({ key: 'reinstate', label: 'Reinstate', icon: Play, tone: 'green' })
  if (['ON_NOTICE','ACTIVE','SUSPENDED'].includes(s)) out.push({ key: 'exit', label: 'Exit', icon: LogOut, tone: 'red' })
  if (s === 'ARCHIVED') out.push({ key: 'unarchive', label: 'Restore', icon: Undo2, tone: 'green' })
  if (s !== 'ARCHIVED') out.push({ key: 'archive', label: 'Archive', icon: Archive, tone: 'neutral' })
  return out
})

// ─── Lifecycle action modal (local to this page) ───
const actionModalOpen = ref(false)
const actionModalKey = ref('')
const lifecycleSubmitting = ref(false)

const openActionModal = (action) => {
  if (!emp.value) return
  actionModalKey.value = action
  actionModalOpen.value = true
}
const onModalClose = () => {
  actionModalOpen.value = false
  actionModalKey.value = ''
}
const submitAction = async ({ action, employee, body }) => {
  lifecycleSubmitting.value = true
  try {
    await lifecycle(employee.id, action, body)
    success('Action applied')
    onModalClose()
    await reload()
  } catch (e) {
    error(e.response?.data?.detail || 'Failed')
  } finally {
    lifecycleSubmitting.value = false
  }
}

// ─── Delete modal ───
const deleteOpen = ref(false)
const deleteConfirmText = ref('')
const deleteSoftOnly = ref(false)
const deletingEmp = ref(false)
const deleteCardRef = ref(null)
useSpotlight(deleteCardRef)

const openDeleteModal = () => {
  deleteConfirmText.value = ''
  deleteSoftOnly.value = false
  deleteOpen.value = true
}
const closeDeleteModal = () => {
  if (deletingEmp.value) return
  deleteOpen.value = false
}
const canConfirmDelete = computed(() => deleteConfirmText.value.trim().toUpperCase() === 'DELETE')

const { remove } = useEmployees()
const confirmDelete = async () => {
  if (!emp.value || !canConfirmDelete.value) return
  deletingEmp.value = true
  try {
    await remove(emp.value.id, { force: !deleteSoftOnly.value })
    success(deleteSoftOnly.value ? 'Employee archived' : 'Employee permanently deleted')
    deleteOpen.value = false
    router.push('/admin/hr/employees/all')
  } catch (e) {
    error(e.response?.data?.detail || 'Delete failed')
  } finally {
    deletingEmp.value = false
  }
}

// ─── Props and load ───
const props = defineProps({ id: { type: String, default: '' } })

const reload = async () => {
  const id = props.id || route.params.id
  if (!id) return
  loading.value = true
  revealBank.value = false
  try {
    await loadReferenceData()
    const data = await getOne(id)
    emp.value = data
    if (activeTab.value === 'history') await loadHistoryRows()
  } catch {
    emp.value = null
    error('Failed to load profile')
  } finally {
    loading.value = false
    nextTick(() => positionUnderline())
  }
}

const goBack = () => {
  if (window.history.length > 1) router.go(-1)
  else router.push('/admin/hr/employees/all')
}

watch(() => props.id || route.params.id, reload)
watch(activeTab, (t) => { if (t === 'history') loadHistoryRows() })

onMounted(reload)
</script>

<style scoped>
@import '../../../styles/hr-theme.css';

.emp-profile-page {
  min-height: calc(100vh - 100px);
  display: flex;
  flex-direction: column;
  background: transparent;
  animation: hr-fade-up 320ms var(--hr-spring);
}

/* ────────────── Page Head ────────────── */
.page-head {
  position: relative;
  padding: 24px 32px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  /* No painted surface — the page header sits directly on the dashboard. */
  background: transparent;
  overflow: visible;
}
/* Aurora + grid layers retained as no-ops so existing markup keeps working;
   they no longer paint anything visible. */
.head-aurora,
.head-grid {
  display: none;
}

.head-row { position: relative; }
.crumb-row {
  display: flex; align-items: center; justify-content: space-between;
  padding-bottom: 18px;
}
.back-btn {
  display: inline-flex; align-items: center; gap: 6px;
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  color: var(--hr-text-secondary);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 200ms var(--hr-spring);
}
.back-btn:hover {
  border-color: var(--hr-accent-gold-border);
  color: var(--hr-accent-gold);
  transform: translateX(-2px);
}

.identity-row {
  display: flex; justify-content: space-between; align-items: flex-end;
  gap: 24px;
  padding-bottom: 22px;
  flex-wrap: wrap;
}
.identity-left {
  display: flex; align-items: flex-end; gap: 22px;
  min-width: 0;
}
.identity-skeleton {
  width: 112px; height: 112px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.identity-text { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.identity-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10.5px;
  font-weight: 700;
  color: var(--hr-accent-gold);
  text-transform: uppercase;
  letter-spacing: 1.2px;
}
.identity-eyebrow .dot {
  width: 6px; height: 6px;
  background: var(--hr-accent-gold);
  border-radius: 50%;
  box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.55);
  animation: hr-pulse-dot-gold 2.4s ease-in-out infinite;
}
.identity-name {
  margin: 0;
  font-size: 34px;
  font-weight: 800;
  color: var(--hr-text);
  letter-spacing: -0.03em;
  background: linear-gradient(180deg, #ffffff 0%, #cdcdcf 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1.05;
}
.identity-meta {
  font-size: 13px;
  color: var(--hr-text-muted);
  display: flex; gap: 6px; flex-wrap: wrap;
}
.identity-meta .mono {
  font-family: var(--hr-mono);
  color: var(--hr-accent-gold);
  font-weight: 600;
  letter-spacing: 0.3px;
}
.identity-meta .sep { color: var(--hr-text-dim); }

.identity-actions {
  display: flex; flex-wrap: wrap; gap: 6px;
  max-width: 50%;
  justify-content: flex-end;
}
.action-btn {
  display: inline-flex; align-items: center; gap: 6px;
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: var(--hr-text-secondary);
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.2px;
  cursor: pointer;
  transition: all 200ms var(--hr-spring);
}
.action-btn:hover { transform: translateY(-1px); }
.action-btn.tone-gold { background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold); border-color: var(--hr-accent-gold-border); }
.action-btn.tone-gold:hover { background: rgba(251, 191, 36, 0.18); }
.action-btn.tone-green { background: rgba(52, 211, 153, 0.12); color: var(--hr-active); border-color: rgba(52, 211, 153, 0.32); }
.action-btn.tone-orange { background: rgba(251, 146, 60, 0.12); color: var(--hr-orange); border-color: rgba(251, 146, 60, 0.32); }
.action-btn.tone-red { background: rgba(248, 113, 113, 0.10); color: var(--hr-suspended); border-color: rgba(248, 113, 113, 0.30); }
.action-btn.tone-danger {
  background: linear-gradient(180deg, rgba(220, 38, 38, 0.18), rgba(127, 29, 29, 0.18));
  border-color: rgba(248, 113, 113, 0.45);
  color: #fecaca;
}
.action-btn.tone-danger:hover {
  background: linear-gradient(180deg, rgba(220, 38, 38, 0.32), rgba(127, 29, 29, 0.32));
  border-color: rgba(248, 113, 113, 0.7);
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 8px 22px -10px rgba(220, 38, 38, 0.65);
}

/* ───── Delete confirmation modal ───── */
.del-backdrop {
  position: fixed; inset: 0;
  z-index: 1500;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.62);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
}
.del-card {
  width: 100%;
  max-width: 480px;
  background: linear-gradient(180deg, rgba(36, 14, 14, 0.96), rgba(20, 10, 10, 0.96));
  border: 1px solid rgba(248, 113, 113, 0.32);
  border-radius: 20px;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.05) inset,
    0 30px 90px -20px rgba(0, 0, 0, 0.8),
    0 0 28px rgba(248, 113, 113, 0.12);
  display: flex; flex-direction: column;
  overflow: hidden;
}
.del-head {
  position: relative;
  display: flex; align-items: center; gap: 12px;
  padding: 18px 22px 14px;
  border-bottom: 1px solid rgba(248, 113, 113, 0.16);
}
.del-icon {
  width: 36px; height: 36px;
  border-radius: 11px;
  background: rgba(248, 113, 113, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.32);
  color: var(--hr-suspended);
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  animation: del-icon-pulse 1.6s ease-in-out infinite;
}
@keyframes del-icon-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(248, 113, 113, 0); }
  50% { box-shadow: 0 0 0 6px rgba(248, 113, 113, 0); box-shadow: 0 0 0 0 rgba(248, 113, 113, 0.35); }
}
.del-head h4 { margin: 0; font-size: 16px; font-weight: 700; color: var(--hr-text); }
.del-head p { margin: 3px 0 0; font-size: 12px; color: var(--hr-text-muted); }
.del-head .close-x {
  width: 30px; height: 30px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--hr-text-muted);
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer;
  margin-left: auto;
}
.del-head .close-x:hover { background: rgba(255, 255, 255, 0.08); color: var(--hr-text); }

.del-body { padding: 16px 22px; display: flex; flex-direction: column; gap: 14px; }
.del-target {
  display: flex; align-items: center; gap: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}
.del-target strong { display: block; font-size: 14px; color: var(--hr-text); }
.del-target .mono { font-family: var(--hr-mono); color: var(--hr-suspended); font-size: 11.5px; font-weight: 600; }
.del-prompt { margin: 0; font-size: 12.5px; color: var(--hr-text-secondary); }
.del-prompt code {
  background: rgba(248, 113, 113, 0.12);
  color: var(--hr-suspended);
  padding: 1px 6px;
  border-radius: 4px;
  font-family: var(--hr-mono);
}
.del-input {
  height: 38px;
  background: rgba(0, 0, 0, 0.34);
  border: 1px solid rgba(248, 113, 113, 0.32);
  border-radius: 10px;
  padding: 0 12px;
  color: var(--hr-text);
  font-size: 13px;
  font-family: var(--hr-mono);
  outline: none;
  transition: border-color 200ms var(--hr-spring), box-shadow 200ms var(--hr-spring);
}
.del-input:focus { border-color: var(--hr-suspended); box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.18); }
.del-soft {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px;
  color: var(--hr-text-muted);
  cursor: pointer;
}
.del-soft input[type="checkbox"] { accent-color: var(--hr-accent-gold); width: 14px; height: 14px; }

.del-foot {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 14px 22px;
  border-top: 1px solid rgba(248, 113, 113, 0.16);
  background: rgba(8, 4, 4, 0.45);
}
.del-foot .ghost {
  display: inline-flex; align-items: center; gap: 6px;
  height: 36px; padding: 0 14px;
  border-radius: 10px;
  font-size: 12.5px; font-weight: 700;
  background: transparent;
  color: var(--hr-text-secondary);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
}
.del-foot .ghost:hover { background: rgba(255, 255, 255, 0.04); color: var(--hr-text); }
.del-foot .primary.danger {
  display: inline-flex; align-items: center; gap: 6px;
  height: 36px; padding: 0 14px;
  border-radius: 10px;
  font-size: 12.5px; font-weight: 700;
  background: linear-gradient(180deg, #ef4444, #b91c1c);
  border: 1px solid rgba(239, 68, 68, 0.7);
  color: #ffffff;
  cursor: pointer;
  box-shadow: 0 8px 22px -8px rgba(239, 68, 68, 0.6);
  transition: all 220ms var(--hr-spring);
}
.del-foot .primary.danger:hover:not(:disabled) {
  box-shadow: 0 12px 28px -8px rgba(239, 68, 68, 0.75), 0 0 30px rgba(239, 68, 68, 0.32);
  transform: translateY(-1px);
}
.del-foot .primary.danger:disabled { opacity: 0.45; cursor: not-allowed; }

.del-modal-enter-active, .del-modal-leave-active {
  transition: opacity 220ms var(--hr-spring);
}
.del-modal-enter-active .del-card,
.del-modal-leave-active .del-card {
  transition: transform 320ms var(--hr-spring), opacity 220ms var(--hr-spring);
}
.del-modal-enter-from, .del-modal-leave-to { opacity: 0; }
.del-modal-enter-from .del-card,
.del-modal-leave-to .del-card { opacity: 0; transform: translateY(12px) scale(0.96); }

.kpi-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0;
  padding: 16px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.kpi {
  display: flex; flex-direction: column; gap: 4px;
  padding: 4px 16px;
  border-right: 1px solid rgba(255, 255, 255, 0.04);
}
.kpi:last-child { border-right: 0; }
.kpi-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--hr-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.7px;
}
.kpi-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--hr-text);
  letter-spacing: -0.005em;
}

/* Tab strip */
.tab-strip {
  position: relative;
  display: flex;
  gap: 4px;
  padding-top: 16px;
}
.tab-btn {
  display: inline-flex; align-items: center; gap: 6px;
  background: transparent;
  border: 0;
  padding: 10px 14px;
  color: var(--hr-text-muted);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: color 200ms var(--hr-spring);
  font-family: inherit;
  letter-spacing: 0.2px;
}
.tab-btn:hover { color: var(--hr-text-secondary); }
.tab-btn.active { color: var(--hr-accent-gold); }
.tab-underline {
  position: absolute;
  bottom: -1px;
  height: 2px;
  background: linear-gradient(90deg, var(--hr-accent-gold), var(--hr-orange));
  border-radius: 2px 2px 0 0;
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.55);
  transition: left 280ms var(--hr-spring), width 280ms var(--hr-spring), opacity 200ms;
}

/* ────────────── Body ────────────── */
.page-body {
  flex: 1;
  padding: 26px 32px 48px;
  overflow-x: hidden;
}
.tab-pane { animation: hr-fade-up 280ms var(--hr-spring); }

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 18px;
}
.card-grid :deep(.profile-card.card-wide) { grid-column: 1 / -1; }

/* Profile card */
:deep(.profile-card) {
  position: relative;
  background: linear-gradient(180deg, rgba(28, 28, 32, 0.65) 0%, rgba(18, 18, 22, 0.55) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 18px;
  padding: 0;
  overflow: hidden;
  backdrop-filter: blur(22px) saturate(160%);
  -webkit-backdrop-filter: blur(22px) saturate(160%);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04) inset, 0 16px 36px -20px rgba(0, 0, 0, 0.6);
  transition: border-color 240ms var(--hr-spring), transform 240ms var(--hr-spring), box-shadow 240ms var(--hr-spring);
  animation: hr-fade-up 320ms var(--hr-spring);
}
:deep(.profile-card:hover) {
  border-color: rgba(255, 255, 255, 0.10);
  transform: translateY(-1px);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.06) inset, 0 24px 48px -22px rgba(0, 0, 0, 0.7);
}
:deep(.profile-card.is-editing) {
  border-color: var(--hr-accent-gold-border);
  box-shadow: 0 0 0 1px var(--hr-accent-gold-border) inset, 0 24px 48px -22px rgba(0, 0, 0, 0.7), 0 0 28px rgba(251, 191, 36, 0.12);
}
:deep(.profile-card.danger.is-editing) {
  border-color: rgba(248, 113, 113, 0.4);
  box-shadow: 0 0 0 1px rgba(248, 113, 113, 0.4) inset, 0 24px 48px -22px rgba(0, 0, 0, 0.7), 0 0 28px rgba(248, 113, 113, 0.18);
}

:deep(.pc-head) {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 18px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(0, 0, 0, 0.18);
}
:deep(.pc-title) {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--hr-text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
}
:deep(.pc-icon) {
  color: var(--hr-accent-gold);
}
:deep(.pc-tools) { display: flex; gap: 6px; }
:deep(.pc-body) {
  padding: 16px 18px 18px;
  display: flex; flex-direction: column; gap: 4px;
}

:deep(.edit-btn), :deep(.save-btn), :deep(.cancel-btn) {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.1);
  letter-spacing: 0.2px;
  transition: all 180ms var(--hr-spring);
  font-family: inherit;
}
:deep(.edit-btn) {
  background: rgba(255, 255, 255, 0.03);
  color: var(--hr-text-secondary);
}
:deep(.edit-btn:hover) {
  background: var(--hr-accent-gold-soft);
  border-color: var(--hr-accent-gold-border);
  color: var(--hr-accent-gold);
}
:deep(.cancel-btn) { background: transparent; color: var(--hr-text-secondary); }
:deep(.cancel-btn:hover) { background: rgba(255, 255, 255, 0.04); }
:deep(.save-btn) {
  background: var(--hr-gradient-rail-active);
  border-color: var(--hr-accent-gold);
  color: #1a1a1c;
}
:deep(.save-btn:disabled) { opacity: 0.6; cursor: wait; }

:deep(.data-pair) {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 10px;
  align-items: center;
  padding: 7px 0;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.03);
}
:deep(.data-pair:last-child) { border-bottom: 0; }
:deep(.data-pair.multiline) { align-items: start; }
:deep(.dp-label) {
  font-size: 10px;
  font-weight: 700;
  color: var(--hr-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.6px;
}
:deep(.dp-value) {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--hr-text);
  word-break: break-word;
}
:deep(.dp-value.mono) {
  font-family: var(--hr-mono);
  letter-spacing: 0.3px;
}
:deep(.dp-value.muted) { color: var(--hr-text-dim); }

.edit-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  min-width: 0;
}
.edit-grid .field-block { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.edit-grid .field-block.full { grid-column: 1 / -1; }

/* Read-only context strip — shows immutable identity info during edit so
   the user always sees who/what they're editing without losing context. */
.readonly-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px 14px;
  padding: 10px 12px;
  margin-bottom: 14px;
  background: rgba(0, 0, 0, 0.18);
  border: 1px dashed rgba(255, 255, 255, 0.06);
  border-radius: 10px;
}
.ro-cell { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.ro-label {
  font-size: 9.5px;
  font-weight: 700;
  color: var(--hr-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.6px;
}
.ro-value {
  font-size: 12px;
  color: var(--hr-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ro-value.mono { font-family: var(--hr-mono); color: var(--hr-accent-gold); font-weight: 600; }

.warn-banner {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 10px;
  padding: 9px 12px;
  background: rgba(248, 113, 113, 0.10);
  border: 1px solid rgba(248, 113, 113, 0.32);
  border-radius: 10px;
  color: var(--hr-suspended);
  font-size: 11.5px;
}

/* Compensation card */
.ctc-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 4px 0 10px;
}
.ctc-cell {
  display: flex; flex-direction: column; gap: 4px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.ctc-cell.highlight {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.10), rgba(251, 146, 60, 0.06));
  border-color: var(--hr-accent-gold-border);
}
.ctc-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--hr-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.7px;
}
.ctc-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--hr-text);
  font-family: var(--hr-mono);
  letter-spacing: -0.01em;
}
.ctc-value.gold {
  background: linear-gradient(180deg, var(--hr-accent-gold), var(--hr-orange));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.muted-note { color: var(--hr-text-dim); font-size: 11.5px; margin: 2px 0 0; }

/* ── Indian salary structure preview (read-only) ── */
.ss-preview {
  margin-top: 12px;
  border-radius: 12px;
  border: 1px solid var(--hr-accent-gold-border);
  background: linear-gradient(180deg, rgba(251,191,36,0.05), rgba(251,191,36,0.01));
  overflow: hidden;
}
.ss-preview-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--hr-accent-gold-border);
  background: rgba(251,191,36,0.04);
}
.ss-preview-eye {
  font-family: var(--hr-mono); font-size: 9.5px; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--hr-accent-gold);
}
.ss-preview-net {
  font-size: 12px; font-weight: 700; color: #10b981;
  padding: 3px 9px; border-radius: 999px;
  background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.3);
}
.ss-mini { width: 100%; border-collapse: collapse; font-size: 12px; }
.ss-mini thead th {
  text-align: left; padding: 7px 14px;
  font-family: var(--hr-mono);
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--hr-text-muted);
  border-bottom: 1px solid var(--hr-border);
}
.ss-mini thead th.num { text-align: right; }
.ss-mini tbody td {
  padding: 6px 14px;
  border-bottom: 1px solid var(--hr-border);
  color: var(--hr-text-secondary);
}
.ss-mini tbody td.num { text-align: right; font-family: var(--hr-mono); color: var(--hr-text); }
.ss-mini tr.r-total td { background: rgba(251,191,36,0.06); font-weight: 700; color: var(--hr-text); }
.ss-mini tr.r-ded td, .ss-mini tr.r-ded td.num { color: #f87171; }
.ss-mini tr.r-net td { background: rgba(52,211,153,0.06); color: #10b981; font-weight: 800; }

[data-theme="light"] .ss-preview { border-color: rgba(180,83,9,0.3); background: linear-gradient(180deg, rgba(255,250,240,0.8), rgba(255,246,232,0.6)); }
[data-theme="light"] .ss-preview-head { border-bottom-color: rgba(180,83,9,0.2); background: rgba(217,119,6,0.08); }
[data-theme="light"] .ss-preview-eye { color: #b45309; }
[data-theme="light"] .ss-preview-net { color: #047857; background: rgba(5,150,105,0.1); border-color: rgba(5,150,105,0.32); }
[data-theme="light"] .ss-mini thead th { color: #8a6f4b; border-bottom-color: rgba(40,25,10,0.1); }
[data-theme="light"] .ss-mini tbody td { color: #44362a; border-bottom-color: rgba(40,25,10,0.08); }
[data-theme="light"] .ss-mini tbody td.num { color: #1a1410; }
[data-theme="light"] .ss-mini tr.r-total td { background: rgba(217,119,6,0.12); color: #1a1410; }
[data-theme="light"] .ss-mini tr.r-ded td, [data-theme="light"] .ss-mini tr.r-ded td.num { color: #b91c1c; }
[data-theme="light"] .ss-mini tr.r-net td { color: #047857; background: rgba(5,150,105,0.08); }

.reveal-row { display: flex; justify-content: flex-end; padding: 2px 0; }
.ghost-mini {
  background: transparent;
  border: 0;
  color: var(--hr-text-muted);
  font-size: 11px;
  cursor: pointer;
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 2px;
}
.ghost-mini:hover { color: var(--hr-accent-gold); }

/* History pane */
.history-pane {
  background: rgba(28, 28, 32, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 18px;
  padding: 22px 28px 26px;
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
}
.history-head h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--hr-text);
  letter-spacing: -0.02em;
}
.history-head p { margin: 4px 0 16px; color: var(--hr-text-muted); font-size: 12.5px; }
.timeline {
  list-style: none;
  padding: 0;
  margin: 0;
  position: relative;
}
.timeline::before {
  content: '';
  position: absolute;
  top: 0; bottom: 0;
  left: 13px;
  width: 1px;
  background: linear-gradient(180deg, transparent, var(--hr-accent-gold-border) 14%, var(--hr-accent-gold-border) 86%, transparent);
}
.timeline-item {
  display: flex; gap: 14px;
  padding: 12px 0;
  position: relative;
  animation: hr-fade-up 360ms var(--hr-spring) backwards;
  animation-delay: calc(var(--i, 0) * 50ms);
}
.t-marker {
  width: 28px; height: 28px;
  border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--hr-surface-elevated);
  border: 1px solid var(--hr-border-strong);
  color: var(--hr-text-muted);
  flex-shrink: 0;
  z-index: 1;
}
.t-marker.type-hired,
.t-marker.type-confirmed { color: var(--hr-active); border-color: rgba(52, 211, 153, 0.4); }
.t-marker.type-promoted { color: var(--hr-accent-gold); border-color: var(--hr-accent-gold-border); }
.t-marker.type-suspended { color: var(--hr-suspended); border-color: rgba(248, 113, 113, 0.4); }
.t-marker.type-exited { color: var(--hr-exited); border-color: rgba(192, 132, 252, 0.4); }
.t-marker.type-archived { color: var(--hr-inactive); }
.t-marker.type-notice_served { color: var(--hr-notice); border-color: rgba(251, 146, 60, 0.4); }

.t-content { flex: 1; min-width: 0; }
.t-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.t-head strong { color: var(--hr-text); font-size: 13px; }
.t-date { color: var(--hr-text-muted); font-size: 11px; font-family: var(--hr-mono); }
.t-reason { color: var(--hr-text-secondary); font-size: 12px; margin: 4px 0 0; line-height: 1.5; }
.t-actor { color: var(--hr-text-dim); font-size: 11px; margin: 2px 0 0; }

/* Loading / empty */
.page-loading, .page-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 80px 20px; gap: 12px; color: var(--hr-text-muted);
}
.ghost-cta {
  margin-top: 8px;
  padding: 7px 14px;
  border-radius: 999px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--hr-text-secondary);
  font-size: 12px;
  cursor: pointer;
}
.ghost-cta:hover { color: var(--hr-accent-gold); border-color: var(--hr-accent-gold-border); }
.loading-row { display: flex; align-items: center; gap: 8px; color: var(--hr-text-muted); font-size: 12px; padding: 10px 0; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

/* Tab transitions */
.tab-right-enter-active, .tab-right-leave-active,
.tab-left-enter-active, .tab-left-leave-active {
  transition: opacity 220ms var(--hr-spring), transform 220ms var(--hr-spring);
}
.tab-right-enter-from { opacity: 0; transform: translateX(16px); }
.tab-right-leave-to   { opacity: 0; transform: translateX(-12px); }
.tab-left-enter-from  { opacity: 0; transform: translateX(-16px); }
.tab-left-leave-to    { opacity: 0; transform: translateX(12px); }

@media (max-width: 800px) {
  .page-head { padding: 18px 16px 0; }
  .page-body { padding: 18px 16px 36px; }
  .identity-row { gap: 14px; }
  .identity-actions { max-width: 100%; }
  .edit-grid { grid-template-columns: 1fr; }
  .edit-grid .field-block.full { grid-column: span 1; }
  .ctc-grid { grid-template-columns: 1fr; }
  .identity-name { font-size: 26px; }
}

/* ═════════ LIGHT THEME OVERRIDES — warm cream + amber palette ═════════
   Preserve the orange/gold accent palette; only neutrals invert.
   Frosted-glass cards keep their translucent feel. */
[data-theme="light"] .page-head {
  border-bottom-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .back-btn {
  background: rgba(255, 250, 240, 0.62);
  border-color: rgba(40, 25, 10, 0.14);
  color: #44362a;
}
[data-theme="light"] .back-btn:hover {
  border-color: rgba(217, 119, 6, 0.42);
  color: #b45309;
}
[data-theme="light"] .identity-skeleton {
  background: rgba(255, 250, 240, 0.62);
  border-color: rgba(40, 25, 10, 0.12);
}
[data-theme="light"] .identity-eyebrow { color: #b45309; }
[data-theme="light"] .identity-eyebrow .dot { background: #d97706; }
/* The default identity-name gradient is white→cream → invisible on cream.
   Switch to a warm amber/brown gradient so the name reads at full weight. */
[data-theme="light"] .identity-name {
  background: linear-gradient(120deg, #1a1410 0%, #92400e 70%, #b45309 100%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
[data-theme="light"] .identity-meta { color: #6b5840; }
[data-theme="light"] .identity-meta .mono { color: #b45309; }
[data-theme="light"] .identity-meta .sep { color: #92400e; }

[data-theme="light"] .action-btn {
  background: rgba(255, 250, 240, 0.62);
  border-color: rgba(40, 25, 10, 0.14);
  color: #44362a;
}
[data-theme="light"] .action-btn.tone-gold {
  background: rgba(217, 119, 6, 0.14);
  color: #b45309;
  border-color: rgba(217, 119, 6, 0.42);
}
[data-theme="light"] .action-btn.tone-gold:hover { background: rgba(217, 119, 6, 0.22); }
[data-theme="light"] .action-btn.tone-green {
  background: rgba(16, 185, 129, 0.14);
  color: #047857;
  border-color: rgba(16, 185, 129, 0.42);
}
[data-theme="light"] .action-btn.tone-orange {
  background: rgba(251, 146, 60, 0.16);
  color: #c2410c;
  border-color: rgba(251, 146, 60, 0.42);
}
[data-theme="light"] .action-btn.tone-red {
  background: rgba(220, 38, 38, 0.10);
  color: #b91c1c;
  border-color: rgba(220, 38, 38, 0.36);
}
[data-theme="light"] .action-btn.tone-danger {
  background: linear-gradient(180deg, rgba(220, 38, 38, 0.14), rgba(127, 29, 29, 0.10));
  border-color: rgba(220, 38, 38, 0.42);
  color: #991b1b;
}
[data-theme="light"] .action-btn.tone-danger:hover {
  background: linear-gradient(180deg, rgba(220, 38, 38, 0.22), rgba(127, 29, 29, 0.18));
  border-color: rgba(220, 38, 38, 0.62);
  color: #7f1d1d;
  box-shadow: 0 8px 22px -10px rgba(220, 38, 38, 0.45);
}

[data-theme="light"] .kpi-row {
  border-top-color: rgba(40, 25, 10, 0.10);
  border-bottom-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .kpi { border-right-color: rgba(40, 25, 10, 0.08); }
[data-theme="light"] .kpi-label { color: #92400e; }
[data-theme="light"] .kpi-value { color: #1a1410; }

[data-theme="light"] .tab-btn { color: #6b5840; }
[data-theme="light"] .tab-btn:hover { color: #44362a; }
[data-theme="light"] .tab-btn.active { color: #b45309; }
[data-theme="light"] .tab-underline {
  background: linear-gradient(90deg, #d97706, #ea580c);
  box-shadow: 0 0 12px rgba(217, 119, 6, 0.45);
}

/* ───── Profile cards — frosted cream surface ─────
   The dark-mode rule uses `saturate(160%)` which on the cream page
   amplifies underlying tones into a muddy olive-brown. Drop the saturate
   filter for light mode and lift the gradient opacity so the warm cream
   reads clearly while still feeling frosted. */
[data-theme="light"] .emp-profile-page :deep(.profile-card) {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.92) 0%, rgba(255, 244, 220, 0.85) 100%) !important;
  border-color: rgba(40, 25, 10, 0.10);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.55) inset,
              0 14px 32px -22px rgba(40, 25, 10, 0.28);
}
[data-theme="light"] .emp-profile-page :deep(.profile-card:hover) {
  border-color: rgba(40, 25, 10, 0.16);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.45) inset,
              0 20px 42px -22px rgba(40, 25, 10, 0.32);
}
[data-theme="light"] .emp-profile-page :deep(.profile-card.is-editing) {
  border-color: rgba(217, 119, 6, 0.45);
  box-shadow: 0 0 0 1px rgba(217, 119, 6, 0.45) inset,
              0 20px 42px -22px rgba(40, 25, 10, 0.32),
              0 0 28px rgba(217, 119, 6, 0.18);
}
[data-theme="light"] .emp-profile-page :deep(.profile-card.danger.is-editing) {
  border-color: rgba(220, 38, 38, 0.42);
  box-shadow: 0 0 0 1px rgba(220, 38, 38, 0.42) inset,
              0 20px 42px -22px rgba(40, 25, 10, 0.32),
              0 0 28px rgba(220, 38, 38, 0.18);
}
[data-theme="light"] .emp-profile-page :deep(.pc-head) {
  background: rgba(255, 244, 220, 0.55);
  border-bottom-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .emp-profile-page :deep(.pc-title) { color: #44362a; }
[data-theme="light"] .emp-profile-page :deep(.pc-icon) { color: #b45309; }

[data-theme="light"] .emp-profile-page :deep(.edit-btn), [data-theme="light"] .emp-profile-page :deep(.save-btn), [data-theme="light"] .emp-profile-page :deep(.cancel-btn) {
  border-color: rgba(40, 25, 10, 0.14);
}
[data-theme="light"] .emp-profile-page :deep(.edit-btn) {
  background: rgba(255, 250, 240, 0.62);
  color: #44362a;
}
[data-theme="light"] .emp-profile-page :deep(.edit-btn:hover) {
  background: rgba(217, 119, 6, 0.14);
  border-color: rgba(217, 119, 6, 0.42);
  color: #b45309;
}
[data-theme="light"] .emp-profile-page :deep(.cancel-btn) { color: #44362a; }
[data-theme="light"] .emp-profile-page :deep(.cancel-btn:hover) { background: rgba(217, 119, 6, 0.10); }
[data-theme="light"] .emp-profile-page :deep(.save-btn) {
  border-color: #d97706;
  color: #fff;
}

[data-theme="light"] .emp-profile-page :deep(.data-pair) { border-bottom-color: rgba(40, 25, 10, 0.06); }
[data-theme="light"] .emp-profile-page :deep(.dp-label) { color: #92400e; }
[data-theme="light"] .emp-profile-page :deep(.dp-value) { color: #1a1410; }
[data-theme="light"] .emp-profile-page :deep(.dp-value.muted) { color: #8d7b62; }

[data-theme="light"] .readonly-strip {
  background: rgba(255, 244, 220, 0.58);
  border-color: rgba(40, 25, 10, 0.12);
}
[data-theme="light"] .ro-label { color: #92400e; }
[data-theme="light"] .ro-value { color: #44362a; }
[data-theme="light"] .ro-value.mono { color: #b45309; }

[data-theme="light"] .warn-banner {
  background: rgba(220, 38, 38, 0.10);
  border-color: rgba(220, 38, 38, 0.36);
  color: #b91c1c;
}

[data-theme="light"] .ctc-cell {
  background: rgba(255, 250, 240, 0.62);
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .ctc-cell.highlight {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.18), rgba(251, 146, 60, 0.10));
  border-color: rgba(217, 119, 6, 0.40);
}
[data-theme="light"] .ctc-label { color: #92400e; }
[data-theme="light"] .ctc-value { color: #1a1410; }
[data-theme="light"] .ctc-value.gold {
  background: linear-gradient(180deg, #d97706, #ea580c);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
[data-theme="light"] .muted-note { color: #8d7b62; }
[data-theme="light"] .ghost-mini { color: #6b5840; }
[data-theme="light"] .ghost-mini:hover { color: #b45309; }

/* ───── History pane ───── */
[data-theme="light"] .history-pane {
  background: rgba(255, 250, 240, 0.72);
  border-color: rgba(40, 25, 10, 0.10);
  box-shadow: 0 14px 36px -22px rgba(40, 25, 10, 0.28);
}
[data-theme="light"] .history-head h3 { color: #1a1410; }
[data-theme="light"] .history-head p { color: #6b5840; }
[data-theme="light"] .timeline::before {
  background: linear-gradient(180deg, transparent, rgba(217, 119, 6, 0.45) 14%, rgba(217, 119, 6, 0.45) 86%, transparent);
}
[data-theme="light"] .t-marker {
  background: rgba(255, 244, 220, 0.85);
  border-color: rgba(40, 25, 10, 0.16);
  color: #6b5840;
}
[data-theme="light"] .t-marker.type-hired,
[data-theme="light"] .t-marker.type-confirmed { color: #047857; border-color: rgba(16, 185, 129, 0.42); }
[data-theme="light"] .t-marker.type-promoted { color: #b45309; border-color: rgba(217, 119, 6, 0.42); }
[data-theme="light"] .t-marker.type-suspended { color: #b91c1c; border-color: rgba(220, 38, 38, 0.42); }
[data-theme="light"] .t-marker.type-exited { color: #7e22ce; border-color: rgba(168, 85, 247, 0.42); }
[data-theme="light"] .t-marker.type-archived { color: #6b5840; }
[data-theme="light"] .t-marker.type-notice_served { color: #c2410c; border-color: rgba(251, 146, 60, 0.42); }
[data-theme="light"] .t-head strong { color: #1a1410; }
[data-theme="light"] .t-date { color: #6b5840; }
[data-theme="light"] .t-reason { color: #44362a; }
[data-theme="light"] .t-actor { color: #8d7b62; }

[data-theme="light"] .page-loading, [data-theme="light"] .page-empty { color: #6b5840; }
[data-theme="light"] .ghost-cta {
  border-color: rgba(40, 25, 10, 0.16);
  color: #44362a;
}
[data-theme="light"] .ghost-cta:hover {
  color: #b45309;
  border-color: rgba(217, 119, 6, 0.45);
}
[data-theme="light"] .loading-row { color: #6b5840; }

/* ───── Delete confirmation modal — softer red on cream ───── */
[data-theme="light"] .del-backdrop {
  background: rgba(40, 25, 10, 0.32);
}
[data-theme="light"] .del-card {
  background: linear-gradient(180deg, rgba(254, 226, 226, 0.96), rgba(255, 237, 213, 0.92));
  border-color: rgba(220, 38, 38, 0.36);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.5) inset,
              0 30px 90px -20px rgba(40, 25, 10, 0.45),
              0 0 28px rgba(220, 38, 38, 0.18);
}
[data-theme="light"] .del-head {
  border-bottom-color: rgba(220, 38, 38, 0.22);
}
[data-theme="light"] .del-icon {
  background: rgba(220, 38, 38, 0.16);
  border-color: rgba(220, 38, 38, 0.42);
  color: #b91c1c;
}
[data-theme="light"] .del-head h4 { color: #1a1410; }
[data-theme="light"] .del-head p { color: #44362a; }
[data-theme="light"] .del-head .close-x {
  background: rgba(255, 250, 240, 0.62);
  border-color: rgba(40, 25, 10, 0.16);
  color: #6b5840;
}
[data-theme="light"] .del-head .close-x:hover {
  background: rgba(220, 38, 38, 0.12);
  color: #b91c1c;
}
[data-theme="light"] .del-target {
  background: rgba(255, 250, 240, 0.65);
  border-color: rgba(40, 25, 10, 0.12);
}
[data-theme="light"] .del-target strong { color: #1a1410; }
[data-theme="light"] .del-target .mono { color: #b91c1c; }
[data-theme="light"] .del-prompt { color: #44362a; }
[data-theme="light"] .del-prompt code {
  background: rgba(220, 38, 38, 0.14);
  color: #b91c1c;
}
[data-theme="light"] .del-input {
  background: rgba(255, 250, 240, 0.72);
  border-color: rgba(220, 38, 38, 0.36);
  color: #1a1410;
}
[data-theme="light"] .del-input::placeholder { color: rgba(26, 20, 16, 0.42); }
[data-theme="light"] .del-input:focus {
  border-color: #b91c1c;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.16);
}
[data-theme="light"] .del-soft { color: #44362a; }
[data-theme="light"] .del-foot {
  background: rgba(255, 244, 220, 0.62);
  border-top-color: rgba(220, 38, 38, 0.22);
}
[data-theme="light"] .del-foot .ghost {
  border-color: rgba(40, 25, 10, 0.16);
  color: #44362a;
}
[data-theme="light"] .del-foot .ghost:hover {
  background: rgba(217, 119, 6, 0.10);
  color: #b45309;
}
[data-theme="light"] .del-foot .primary.danger {
  background: linear-gradient(180deg, #ef4444, #b91c1c);
  border-color: rgba(220, 38, 38, 0.65);
  color: #fff;
  box-shadow: 0 8px 22px -8px rgba(220, 38, 38, 0.55);
}
[data-theme="light"] .del-foot .primary.danger:hover:not(:disabled) {
  box-shadow: 0 12px 28px -8px rgba(220, 38, 38, 0.70),
              0 0 28px rgba(220, 38, 38, 0.28);
}
</style>
