<template>
  <ProfileDrawer :model-value="open" wide @update:model-value="closeWizard" :aria-label="'Add Employee'">
    <header class="wiz-header hr-spotlight" ref="headerRef">
      <div class="aurora-bg" aria-hidden="true" />
      <button class="close-btn" @click="closeWizard" aria-label="Close"><X :size="18" /></button>
      <div class="wiz-title-row">
        <div class="title-icon"><UserPlus :size="20" /></div>
        <div>
          <h2>Add Employee</h2>
          <p>Onboard a new team member · <span class="step-tag">{{ stepCfg[stepIdx].label }}</span></p>
        </div>
      </div>
      <WizardStepper :steps="stepCfg" :current-index="stepIdx" @step="goTo" />
      <Confetti :fire="confettiTick" />
    </header>

    <!-- ════════ Offer prefill banner ════════ -->
    <section class="offer-banner" v-if="!form._offer_id">
      <div class="ob-icon"><Sparkles :size="16" /></div>
      <div class="ob-body">
        <div class="ob-title">Hiring from a signed offer?</div>
        <div class="ob-sub">Pick an accepted offer — we'll prefill name, contact, role and compensation.</div>
        <HrSearchCombobox
          v-model="offerPickerId"
          :search="searchAcceptedOffers"
          placeholder="Search accepted offers by candidate name…"
          @change="onOfferPicked"
        />
      </div>
    </section>
    <section class="offer-banner offer-banner-linked" v-else>
      <div class="ob-icon ob-icon-on"><CheckCircle :size="16" /></div>
      <div class="ob-body">
        <div class="ob-title">Linked to {{ form._offer_code }}</div>
        <div class="ob-sub">
          {{ form.create_full_name || '—' }}
          <span v-if="form._offer_position_title"> · {{ form._offer_position_title }}</span>
          <span v-if="form._offer_offered_salary" class="ob-money"> · CTC {{ formatCtc(form._offer_offered_salary) }}</span>
        </div>
      </div>
      <button type="button" class="ob-unlink" @click="unlinkOffer">
        <X :size="13" /> Unlink prefill
      </button>
    </section>

    <div class="wiz-body">
      <transition :name="`wiz-${slideDir}`" mode="out-in">
        <section :key="stepIdx" class="wiz-step">

          <!-- ════════ Step 1: Basic Info ════════ -->
          <div v-if="stepIdx === 0" class="grid">
            <div class="field-block full">
              <HrFieldLabel label="Link to existing user OR create new" />
              <HrRadio
                v-model="form.linkMode"
                :options="[
                  { value: 'existing', label: 'Link existing User' },
                  { value: 'new', label: 'Create new User' },
                ]"
              />
            </div>

            <template v-if="form.linkMode === 'existing'">
              <div class="field-block full">
                <HrFieldLabel label="Search existing user" :error="!!errors.user_id" />
                <HrSearchCombobox
                  v-model="form.user_id"
                  :search="searchUsers"
                  :selected-label="form._pickedUserLabel"
                  placeholder="Search by name, email, or employee code…"
                  :error="!!errors.user_id"
                  :error-text="errors.user_id"
                  @change="onUserPicked"
                />
              </div>
            </template>
            <template v-else>
              <div class="field-block full">
                <HrFieldLabel label="Email" required :error="!!errors.create_email" />
                <HrInput v-model="form.create_email" type="email" placeholder="employee@company.com" :error="!!errors.create_email" :error-text="errors.create_email" />
              </div>
              <div class="field-block full">
                <HrFieldLabel label="Full Name" required :error="!!errors.create_full_name" />
                <HrInput v-model="form.create_full_name" placeholder="As per official records" :error="!!errors.create_full_name" :error-text="errors.create_full_name" />
              </div>
            </template>

            <div class="field-block">
              <HrFieldLabel label="Employee Code" required helper="Auto-assigned from HR Settings → Numbering Series — editable if needed" :error="!!errors.employee_code" />
              <HrInput v-model="form.employee_code" :placeholder="nextCodeLoading ? 'Generating…' : 'Auto-generated'" mono :error="!!errors.employee_code" :error-text="errors.employee_code" />
            </div>
            <div class="field-block">
              <HrFieldLabel label="Gender" required :error="!!errors.gender" />
              <HrSelect v-model="form.gender" :options="genderOptions" placeholder="Select gender" :error="!!errors.gender" :error-text="errors.gender" />
            </div>
            <div class="field-block">
              <HrFieldLabel label="Date of Birth" required :error="!!errors.dob" />
              <HrDatePicker v-model="form.dob" :max="todayIso" :error="!!errors.dob" :error-text="errors.dob" />
            </div>
            <div class="field-block">
              <HrFieldLabel label="Marital Status" required :error="!!errors.marital_status" />
              <HrSelect v-model="form.marital_status" :options="maritalOptions" placeholder="Select status" :error="!!errors.marital_status" :error-text="errors.marital_status" />
            </div>
            <div class="field-block">
              <HrFieldLabel label="Blood Group" required :error="!!errors.blood_group" />
              <HrInput v-model="form.blood_group" placeholder="e.g. B+" :error="!!errors.blood_group" :error-text="errors.blood_group" />
            </div>
            <div class="field-block">
              <HrFieldLabel label="Nationality" required :error="!!errors.nationality" />
              <HrInput v-model="form.nationality" placeholder="e.g. Indian" :error="!!errors.nationality" :error-text="errors.nationality" />
            </div>
            <div class="field-block full">
              <HrFieldLabel label="Religion" required :error="!!errors.religion" />
              <HrInput v-model="form.religion" :error="!!errors.religion" :error-text="errors.religion" />
            </div>

            <h4 class="subheader full">Statutory IDs</h4>
            <div class="field-block">
              <HrFieldLabel label="Aadhaar" required helper="12-digit Aadhaar number" :error="!!errors.aadhaar_full" />
              <HrInput
                v-model="form.aadhaar_full"
                placeholder="1234 5678 9012"
                :maxlength="14"
                mono
                :error="!!errors.aadhaar_full"
                :error-text="errors.aadhaar_full"
                @update:modelValue="onAadhaarInput"
              />
            </div>
            <div class="field-block">
              <HrFieldLabel label="PAN" required :error="!!errors.pan" />
              <HrInput
                v-model="form.pan"
                placeholder="ABCDE1234F"
                :maxlength="10"
                mono
                :error="!!errors.pan"
                :error-text="errors.pan"
                @blur="form.pan = form.pan ? form.pan.toUpperCase() : ''"
              />
            </div>
            <div class="field-block">
              <HrFieldLabel label="Passport No." helper="Optional" />
              <HrInput v-model="form.passport_number" />
            </div>
            <div class="field-block">
              <HrFieldLabel label="Passport Expiry" helper="Optional" />
              <HrDatePicker v-model="form.passport_expiry" />
            </div>
            <div class="field-block full">
              <HrFieldLabel label="Driving License" helper="Optional" />
              <HrInput v-model="form.driving_license" />
            </div>
          </div>

          <!-- ════════ Step 2: Contact ════════ -->
          <div v-else-if="stepIdx === 1" class="grid">
            <div class="field-block full">
              <HrFieldLabel label="Mobile" required helper="10-digit mobile number" :error="!!errors.mobile" />
              <HrInput
                v-model="form.mobile"
                placeholder="9876543210"
                digits
                :maxlength="10"
                inputmode="numeric"
                :error="!!errors.mobile"
                :error-text="errors.mobile"
              />
            </div>

            <h4 class="subheader full">Emergency Contact</h4>
            <div class="field-block">
              <HrFieldLabel label="Name" required :error="!!errors.emergency_contact_name" />
              <HrInput v-model="form.emergency_contact_name" :error="!!errors.emergency_contact_name" :error-text="errors.emergency_contact_name" />
            </div>
            <div class="field-block">
              <HrFieldLabel label="Phone" required helper="10-digit number" :error="!!errors.emergency_contact_phone" />
              <HrInput
                v-model="form.emergency_contact_phone"
                placeholder="9876543210"
                digits
                :maxlength="10"
                inputmode="numeric"
                :error="!!errors.emergency_contact_phone"
                :error-text="errors.emergency_contact_phone"
              />
            </div>
            <div class="field-block full">
              <HrFieldLabel label="Relation" required :error="!!errors.emergency_contact_relation" />
              <HrSelect v-model="form.emergency_contact_relation" :options="relationOptions" placeholder="Select relation" :error="!!errors.emergency_contact_relation" :error-text="errors.emergency_contact_relation" />
            </div>

            <h4 class="subheader full">Addresses</h4>
            <div class="field-block full">
              <HrFieldLabel label="Permanent Address" required :error="!!errors.permanent_address" />
              <HrTextarea v-model="form.permanent_address" :rows="2" :error="!!errors.permanent_address" :error-text="errors.permanent_address" />
            </div>
            <div class="field-block full">
              <HrCheckbox v-model="form.current_same_as_permanent" label="Current address same as permanent" />
            </div>
            <div v-if="!form.current_same_as_permanent" class="field-block full">
              <HrFieldLabel label="Current Address" helper="Optional — leave empty to skip" />
              <HrTextarea v-model="form.current_address" :rows="2" />
            </div>
          </div>

          <!-- ════════ Step 3: Employment ════════ -->
          <div v-else-if="stepIdx === 2" class="grid">
            <div class="field-block">
              <HrFieldLabel label="Department" required :error="!!errors.department_id" />
              <HrDepartmentSelect
                v-model="form.department_id"
                :departments="departmentSource"
                :error="!!errors.department_id"
                :error-text="errors.department_id"
                placeholder="Select department"
              />
            </div>
            <div class="field-block">
              <HrFieldLabel label="Designation" required :error="!!errors.designation_id" />
              <HrSelect
                v-model="form.designation_id"
                :options="designationOptions"
                :error="!!errors.designation_id"
                :error-text="errors.designation_id"
                placeholder="Select designation"
              />
            </div>
            <div class="field-block full">
              <HrFieldLabel label="Employment Type" required :error="!!errors.employment_type" />
              <HrRadio v-model="form.employment_type" :options="employmentTypeOptions" />
              <span v-if="errors.employment_type" class="err">{{ errors.employment_type }}</span>
            </div>
            <div class="field-block full">
              <HrFieldLabel label="Employee Category" required :error="!!errors.employee_category" />
              <HrRadio v-model="form.employee_category" :options="categoryOptions" />
              <span v-if="errors.employee_category" class="err">{{ errors.employee_category }}</span>
            </div>
            <div class="field-block">
              <HrFieldLabel label="Joining Date" required :error="!!errors.joining_date" />
              <HrDatePicker v-model="form.joining_date" :error="!!errors.joining_date" :error-text="errors.joining_date" />
            </div>
            <div v-if="form.employee_category === 'CONTRACT'" class="field-block">
              <HrFieldLabel label="Contract End Date" required helper="Drives contract-expiry alerts" :error="!!errors.contract_end_date" />
              <HrDatePicker v-model="form.contract_end_date" :error="!!errors.contract_end_date" :error-text="errors.contract_end_date" />
            </div>
            <div class="field-block">
              <HrFieldLabel label="Probation (months)" helper="Optional" />
              <HrNumberInput v-model="form.probation_months" :min="0" :max="36" />
            </div>
            <div class="field-block">
              <HrFieldLabel label="Notice Period (days)" required :error="!!errors.notice_period_days" />
              <HrNumberInput v-model="form.notice_period_days" :min="0" :max="365" :error="!!errors.notice_period_days" :error-text="errors.notice_period_days" />
            </div>
            <div class="field-block">
              <HrFieldLabel label="Pay Level" required :error="!!errors.pay_level" />
              <HrInput v-model="form.pay_level" placeholder="e.g. P3" :error="!!errors.pay_level" :error-text="errors.pay_level" />
            </div>
            <div class="field-block">
              <HrFieldLabel label="Reporting Manager" required :error="!!errors.reporting_manager_id" />
              <HrSearchCombobox
                v-model="form.reporting_manager_id"
                :search="searchUsers"
                :selected-label="form._reportingManagerLabel"
                placeholder="Search a manager…"
                :error="!!errors.reporting_manager_id"
                :error-text="errors.reporting_manager_id"
                @change="onReportingManagerPicked"
              />
            </div>
            <div class="field-block">
              <HrFieldLabel label="HR Manager" helper="Optional" />
              <HrSearchCombobox
                v-model="form.hr_manager_id"
                :search="searchUsers"
                :selected-label="form._hrManagerLabel"
                placeholder="Search a HR manager…"
                @change="onHrManagerPicked"
              />
            </div>
            <div class="field-block">
              <HrFieldLabel label="Grade" helper="Optional" />
              <HrSelect v-model="form.grade_id" :options="gradeOptions" placeholder="Select grade" @change="onGradePicked" />
            </div>
            <div class="field-block full">
              <HrFieldLabel label="Work Location" helper="Optional · Pick a configured site to inherit its timezone" />
              <HrLocationSelect
                v-model="form.work_location_id"
                v-model:customText="form.work_location_text"
                :locations="reference.locations"
              />
            </div>
            <div class="note phase-tag full">
              Shift assignment becomes available with Phase 2 — Time Management.
            </div>
          </div>

          <!-- ════════ Step 4: Bank & Salary ════════ -->
          <div v-else-if="stepIdx === 3" class="grid">
            <div class="field-block full">
              <HrFieldLabel label="Bank Name" required :error="!!errors.bank_name" />
              <HrInput
                v-model="form.bank_name"
                placeholder="e.g. HDFC Bank"
                :error="!!errors.bank_name"
                :error-text="errors.bank_name"
              />
            </div>
            <div class="field-block">
              <HrFieldLabel label="Account Number" required :error="!!errors.account_number" />
              <HrInput
                v-model="form.account_number"
                mono
                digits
                :maxlength="18"
                inputmode="numeric"
                placeholder="Digits only"
                :error="!!errors.account_number"
                :error-text="errors.account_number"
              />
            </div>
            <div class="field-block">
              <HrFieldLabel label="Confirm Account Number" required :error="!!errors.account_confirm" />
              <HrInput
                v-model="form._account_confirm"
                mono
                digits
                :maxlength="18"
                inputmode="numeric"
                placeholder="Re-enter account number"
                :error="!!errors.account_confirm"
                :error-text="errors.account_confirm"
              />
            </div>
            <div class="field-block">
              <HrFieldLabel label="IFSC" required :error="!!errors.ifsc" />
              <HrInput
                v-model="form.ifsc"
                placeholder="HDFC0001234"
                :maxlength="11"
                mono
                :error="!!errors.ifsc"
                :error-text="errors.ifsc"
                @blur="form.ifsc = form.ifsc ? form.ifsc.toUpperCase() : ''"
              />
            </div>
            <div class="field-block full">
              <HrFieldLabel label="Tax Regime" required :error="!!errors.tax_regime" />
              <HrRadio v-model="form.tax_regime" :options="taxRegimeOptions" />
            </div>
            <div class="field-block">
              <HrFieldLabel label="UAN" required helper="12-digit UAN" :error="!!errors.uan" />
              <HrInput
                v-model="form.uan"
                mono
                digits
                :maxlength="12"
                inputmode="numeric"
                :error="!!errors.uan"
                :error-text="errors.uan"
              />
            </div>
            <div class="field-block">
              <HrFieldLabel label="PF Number" required :error="!!errors.pf_number" />
              <HrInput
                v-model="form.pf_number"
                mono
                :maxlength="22"
                :error="!!errors.pf_number"
                :error-text="errors.pf_number"
              />
            </div>
            <div class="field-block full">
              <HrFieldLabel label="ESI Number" required helper="17 characters" :error="!!errors.esic_number" />
              <HrInput
                v-model="form.esic_number"
                mono
                :maxlength="17"
                :error="!!errors.esic_number"
                :error-text="errors.esic_number"
              />
            </div>

            <div class="field-block">
              <HrFieldLabel label="Annual CTC (₹)" required :error="!!errors.annual_ctc">
                Annual CTC (₹)
                <span v-if="form.annual_ctc" class="ctc-auto-chip">Monthly ≈ ₹{{ Number(form.annual_ctc / 12).toLocaleString('en-IN', { maximumFractionDigits: 0 }) }}</span>
              </HrFieldLabel>
              <HrNumberInput
                v-model="form.annual_ctc"
                :min="0"
                :step-by="50000"
                :error="!!errors.annual_ctc"
                :error-text="errors.annual_ctc"
              />
            </div>
            <div class="field-block">
              <HrFieldLabel label="Monthly CTC (₹)" :error="!!errors.monthly_ctc">
                Monthly CTC (₹)
                <span class="ctc-auto-chip" v-if="autoAnnualCtc">
                  <svg viewBox="0 0 14 14" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="2,8 6,11 12,3" />
                  </svg>
                  Auto · Annual ₹{{ autoAnnualCtcFormatted }}
                </span>
              </HrFieldLabel>
              <HrNumberInput
                v-model="form.monthly_ctc"
                :min="0"
                :step-by="1000"
                :error="!!errors.monthly_ctc"
                :error-text="errors.monthly_ctc"
              />
            </div>

            <div v-if="ctcBand.status === 'below' || ctcBand.status === 'above'" class="ctc-band-row full warn">
              ⚠ {{ ctcBand.message }} — grade band {{ fmtBand(ctcBand) }}
            </div>
            <div v-else-if="ctcBand.min != null || ctcBand.max != null" class="ctc-band-row full">
              Grade band {{ fmtBand(ctcBand) }}
            </div>

            <!-- ════════ Indian Salary Structure Preview ════════ -->
            <div v-if="salaryStructure" class="salary-structure full">
              <div class="ss-head">
                <div class="ss-title">
                  <span class="ss-eyebrow">SALARY STRUCTURE · INDIAN STANDARD</span>
                  <span class="ss-sub">Auto-derived from annual CTC. Read-only preview.</span>
                </div>
                <div class="ss-net">
                  <span class="ss-net-label">Take-Home (Monthly)</span>
                  <span class="ss-net-value">₹{{ salaryStructure.monthly.net.toLocaleString('en-IN') }}</span>
                </div>
              </div>
              <table class="ss-table">
                <thead>
                  <tr><th>Component</th><th class="num">Monthly (₹)</th><th class="num">Annual (₹)</th></tr>
                </thead>
                <tbody>
                  <tr><td>Basic</td><td class="num">{{ salaryStructure.monthly.basic.toLocaleString('en-IN') }}</td><td class="num">{{ salaryStructure.basic.toLocaleString('en-IN') }}</td></tr>
                  <tr><td>HRA</td><td class="num">{{ salaryStructure.monthly.hra.toLocaleString('en-IN') }}</td><td class="num">{{ salaryStructure.hra.toLocaleString('en-IN') }}</td></tr>
                  <tr><td>Special Allowance</td><td class="num">{{ salaryStructure.monthly.special.toLocaleString('en-IN') }}</td><td class="num">{{ salaryStructure.special.toLocaleString('en-IN') }}</td></tr>
                  <tr><td>Conveyance</td><td class="num">{{ salaryStructure.monthly.conveyance.toLocaleString('en-IN') }}</td><td class="num">{{ salaryStructure.conveyance.toLocaleString('en-IN') }}</td></tr>
                  <tr><td>Medical</td><td class="num">{{ salaryStructure.monthly.medical.toLocaleString('en-IN') }}</td><td class="num">{{ salaryStructure.medical.toLocaleString('en-IN') }}</td></tr>
                  <tr><td>LTA</td><td class="num">{{ salaryStructure.monthly.lta.toLocaleString('en-IN') }}</td><td class="num">{{ salaryStructure.lta.toLocaleString('en-IN') }}</td></tr>
                  <tr><td>Telephone / Internet</td><td class="num">{{ salaryStructure.monthly.telephone.toLocaleString('en-IN') }}</td><td class="num">{{ salaryStructure.telephone.toLocaleString('en-IN') }}</td></tr>
                  <tr><td>Meal Allowance</td><td class="num">{{ salaryStructure.monthly.food.toLocaleString('en-IN') }}</td><td class="num">{{ salaryStructure.food.toLocaleString('en-IN') }}</td></tr>
                  <tr class="ss-row-total"><td>Gross Salary (A)</td><td class="num">{{ salaryStructure.monthly.gross.toLocaleString('en-IN') }}</td><td class="num">{{ salaryStructure.gross.toLocaleString('en-IN') }}</td></tr>
                  <tr><td>Employer PF</td><td class="num">{{ salaryStructure.monthly.employerPf.toLocaleString('en-IN') }}</td><td class="num">{{ salaryStructure.employerPf.toLocaleString('en-IN') }}</td></tr>
                  <tr><td>Gratuity (accrual)</td><td class="num">{{ salaryStructure.monthly.gratuity.toLocaleString('en-IN') }}</td><td class="num">{{ salaryStructure.gratuity.toLocaleString('en-IN') }}</td></tr>
                  <tr class="ss-row-grand"><td>Total Annual CTC</td><td class="num">—</td><td class="num">{{ salaryStructure.annualCtc.toLocaleString('en-IN') }}</td></tr>
                  <tr class="ss-row-deduction"><td>Employee PF (-)</td><td class="num">{{ salaryStructure.monthly.employeePf.toLocaleString('en-IN') }}</td><td class="num">{{ salaryStructure.employeePf.toLocaleString('en-IN') }}</td></tr>
                  <tr class="ss-row-deduction"><td>Professional Tax (-)</td><td class="num">{{ salaryStructure.monthly.profTax.toLocaleString('en-IN') }}</td><td class="num">{{ salaryStructure.profTax.toLocaleString('en-IN') }}</td></tr>
                  <tr class="ss-row-net"><td>Net Take-Home (indicative)</td><td class="num">{{ salaryStructure.monthly.net.toLocaleString('en-IN') }}</td><td class="num">{{ salaryStructure.netAnnual.toLocaleString('en-IN') }}</td></tr>
                </tbody>
              </table>
              <div class="ss-foot">
                <span>* Indicative split as per typical Indian payroll convention (Basic 50%, HRA 40% of Basic, employer PF capped at ₹21,600/yr, Gratuity at 4.81% of Basic). Final payslip may vary based on tax declarations and Income Tax (TDS).</span>
              </div>
            </div>
          </div>
        </section>
      </transition>
    </div>

    <footer class="wiz-footer">
      <button class="ghost" @click="closeWizard">Cancel</button>
      <div class="grow" />
      <button v-if="stepIdx > 0" class="ghost" @click="prev">
        <ArrowLeft :size="14" /> Back
      </button>
      <button
        v-if="stepIdx < stepCfg.length - 1"
        class="primary"
        ref="nextBtnRef"
        @click="next"
        :disabled="!isStepValid"
      >
        Next <ArrowRight :size="14" />
      </button>
      <button
        v-else
        class="primary"
        ref="submitBtnRef"
        @click="submit"
        :disabled="submitting || !isStepValid"
      >
        <Loader2 v-if="submitting" class="spin" :size="14" />
        <Check v-else :size="14" />
        Create Employee
      </button>
    </footer>
  </ProfileDrawer>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import {
  X, UserPlus, ArrowLeft, ArrowRight, Check, Loader2, Sparkles, CheckCircle,
} from 'lucide-vue-next'

import ProfileDrawer from '../../../components/hr/ProfileDrawer.vue'
import WizardStepper from '../../../components/hr/WizardStepper.vue'
import Confetti from '../../../components/hr/Confetti.vue'

import HrFieldLabel from '../../../components/hr/forms/HrFieldLabel.vue'
import HrInput from '../../../components/hr/forms/HrInput.vue'
import HrNumberInput from '../../../components/hr/forms/HrNumberInput.vue'
import HrTextarea from '../../../components/hr/forms/HrTextarea.vue'
import HrSelect from '../../../components/hr/forms/HrSelect.vue'
import HrDepartmentSelect from '../../../components/hr/forms/HrDepartmentSelect.vue'
import HrLocationSelect from '../../../components/hr/forms/HrLocationSelect.vue'
import HrDatePicker from '../../../components/hr/forms/HrDatePicker.vue'
import HrCheckbox from '../../../components/hr/forms/HrCheckbox.vue'
import HrRadio from '../../../components/hr/forms/HrRadio.vue'
import HrSearchCombobox from '../../../components/hr/forms/HrSearchCombobox.vue'

import { useEmployees, useHrReference, payLevelForGrade, gradeCtcBand,
  employmentTypeOptions as buildEmploymentTypeOptions, employeeCategoryOptions as buildEmployeeCategoryOptions } from '../../../composables/useEmployees'
import { useOffers } from '../../../composables/useRecruitment'
import { useToast } from '../../../composables/useToast'
import { useSpotlight } from '../../../composables/useSpotlight'
import { useMagnetic } from '../../../composables/useMagnetic'
import axios from 'axios'
import { API } from '@/utils/api'
import { deriveSalaryStructure } from '@/utils/edocPdfGenerator'

const props = defineProps({
  open: { type: Boolean, required: true },
})
const emit = defineEmits(['update:open', 'created'])

const { success, error } = useToast()
const { reference, loadReferenceData } = useHrReference()
const { create, peekNextCode } = useEmployees()
const { listAccepted: listAcceptedOffers, getOnboardingPrefill } = useOffers()

// Local state for the offer-prefill combobox (only the id is tracked here —
// once picked we transfer the offer data into `form._offer_*` and reset this).
const offerPickerId = ref(null)

const stepCfg = [
  { key: 'basic', label: 'Basic Info' },
  { key: 'contact', label: 'Contact' },
  { key: 'employment', label: 'Employment' },
  { key: 'bank', label: 'Bank & Salary' },
]

const stepIdx = ref(0)
const slideDir = ref('forward')
const submitting = ref(false)
const errors = reactive({})
const confettiTick = ref(0)

const headerRef = ref(null)
const nextBtnRef = ref(null)
const submitBtnRef = ref(null)
useSpotlight(headerRef)
useMagnetic(nextBtnRef, { strength: 0.18 })
useMagnetic(submitBtnRef, { strength: 0.18 })

const todayIso = new Date().toISOString().slice(0, 10)

// ─── Static option lists ───
const genderOptions = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
]
const maritalOptions = [
  { value: 'SINGLE', label: 'Single' },
  { value: 'MARRIED', label: 'Married' },
  { value: 'DIVORCED', label: 'Divorced' },
  { value: 'WIDOWED', label: 'Widowed' },
  { value: 'OTHER', label: 'Other' },
]
const relationOptions = [
  { value: 'Spouse', label: 'Spouse' },
  { value: 'Parent', label: 'Parent' },
  { value: 'Sibling', label: 'Sibling' },
  { value: 'Child', label: 'Child' },
  { value: 'Guardian', label: 'Guardian' },
  { value: 'Other', label: 'Other' },
]
// Sourced from HR Settings masters — deactivated values are hidden from new hires.
const employmentTypeOptions = computed(() => buildEmploymentTypeOptions(form.employment_type))
const categoryOptions = computed(() => buildEmployeeCategoryOptions(form.employee_category))
const taxRegimeOptions = [
  { value: 'OLD', label: 'Old Regime' },
  { value: 'NEW', label: 'New Regime' },
]

// ─── Reactive options from reference data ───
// Hardcoded fallback lists so the wizard is usable before the backend
// reference tables are seeded. Live API data, when available, replaces these.
const FALLBACK_DEPARTMENTS = [
  { value: 'engineering',     label: 'Engineering' },
  { value: 'product',         label: 'Product' },
  { value: 'design',          label: 'Design' },
  { value: 'human-resources', label: 'Human Resources' },
  { value: 'finance',         label: 'Finance' },
  { value: 'marketing',       label: 'Marketing' },
  { value: 'sales',           label: 'Sales' },
  { value: 'operations',      label: 'Operations' },
  { value: 'customer-success',label: 'Customer Success' },
  { value: 'it',              label: 'IT & Infrastructure' },
  { value: 'legal',           label: 'Legal & Compliance' },
  { value: 'admin',           label: 'Administration' },
]
const FALLBACK_DESIGNATIONS = [
  { value: 'sde-1',                label: 'Software Engineer I' },
  { value: 'sde-2',                label: 'Software Engineer II' },
  { value: 'sde-3',                label: 'Senior Software Engineer' },
  { value: 'staff-engineer',       label: 'Staff Engineer' },
  { value: 'engineering-manager',  label: 'Engineering Manager' },
  { value: 'product-manager',      label: 'Product Manager' },
  { value: 'designer',             label: 'Designer' },
  { value: 'senior-designer',      label: 'Senior Designer' },
  { value: 'hr-executive',         label: 'HR Executive' },
  { value: 'hr-manager',           label: 'HR Manager' },
  { value: 'finance-executive',    label: 'Finance Executive' },
  { value: 'finance-manager',      label: 'Finance Manager' },
  { value: 'marketing-executive',  label: 'Marketing Executive' },
  { value: 'sales-executive',      label: 'Sales Executive' },
  { value: 'operations-lead',      label: 'Operations Lead' },
  { value: 'director',             label: 'Director' },
]
const FALLBACK_GRADES = [
  { value: 'g1', label: 'G1 — Entry' },
  { value: 'g2', label: 'G2 — Associate' },
  { value: 'g3', label: 'G3 — Mid' },
  { value: 'g4', label: 'G4 — Senior' },
  { value: 'g5', label: 'G5 — Lead' },
  { value: 'g6', label: 'G6 — Principal' },
  { value: 'g7', label: 'G7 — Director' },
  { value: 'g8', label: 'G8 — VP' },
]

// Department objects (not options) for the cascading HrDepartmentSelect. Falls
// back to a flat top-level list before the reference tables are seeded.
const departmentSource = computed(() => {
  const live = reference.departments || []
  if (live.length) return live
  return FALLBACK_DEPARTMENTS.map(d => ({ id: d.value, name: d.label, parent_department_id: null }))
})
const designationOptions = computed(() => {
  const live = reference.designations.map(d => ({ value: d.id, label: d.name }))
  return live.length ? live : FALLBACK_DESIGNATIONS
})
const gradeOptions = computed(() => {
  const live = reference.grades.map(g => ({ value: g.id, label: `${g.code} — ${g.name}` }))
  return live.length ? live : FALLBACK_GRADES
})

// Picking a grade pre-fills the pay level from that grade's default (editable).
const onGradePicked = (gradeId) => {
  const pl = payLevelForGrade(reference.grades, gradeId)
  if (pl) form.pay_level = pl
}

// Soft (non-blocking) CTC-band guidance against the selected grade.
const ctcBand = computed(() => {
  const g = (reference.grades || []).find(x => String(x.id) === String(form.grade_id))
  return gradeCtcBand(g, form.annual_ctc)
})
const _inr0 = (n) => (n == null ? '—' : `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`)
const fmtBand = (b) => `${_inr0(b.min)}–${_inr0(b.max)}/yr`

const initialForm = () => ({
  linkMode: 'new',
  user_id: null,
  _pickedUserLabel: '',
  _reportingManagerLabel: '',
  _hrManagerLabel: '',

  // Back-link to a recruitment Offer, set by the prefill banner. Only the
  // `_offer_id` value is sent to the backend; the rest are UI-only hints.
  _offer_id: null,
  _offer_code: '',
  _offer_position_title: '',
  _offer_offered_salary: null,

  create_email: '',
  create_full_name: '',
  employee_code: '',

  gender: '',
  dob: '',
  marital_status: '',
  blood_group: '',
  nationality: 'Indian',
  religion: '',

  aadhaar_full: '',  // 12 digits in UI; only last 4 sent to backend
  aadhaar_last_4: '',
  pan: '',
  passport_number: '',
  passport_expiry: '',
  driving_license: '',

  mobile: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relation: '',
  permanent_address: '',
  current_address: '',
  current_same_as_permanent: false,

  department_id: null,
  designation_id: null,
  employment_type: '',
  employee_category: 'PERMANENT',
  joining_date: todayIso,
  contract_end_date: '',
  probation_months: 6,
  notice_period_days: 30,
  reporting_manager_id: null,
  hr_manager_id: null,
  grade_id: null,
  pay_level: '',
  work_location_id: null,
  work_location_text: '',

  bank_name: '',
  account_number: '',
  _account_confirm: '',
  ifsc: '',
  uan: '',
  pf_number: '',
  esic_number: '',
  tax_regime: 'NEW',
  monthly_ctc: null,
  annual_ctc: null,
})
const form = reactive(initialForm())

// ─── User search (shared by 3 comboboxes) ───
const searchUsers = async (term) => {
  if (!term || term.length < 2) return []
  try {
    const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token')
    const res = await axios.get(`${API}/auth/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const all = res.data || []
    const t = term.toLowerCase()
    return all
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

const onUserPicked = (user) => {
  if (!user) {
    form._pickedUserLabel = ''
    form.create_email = ''
    form.create_full_name = ''
    return
  }
  form._pickedUserLabel = user.full_name
  form.create_email = user.email || ''
  form.create_full_name = user.full_name || ''
  if (!form.employee_code) form.employee_code = user.employee_id || ''
}

// ─── Offer prefill — fetches accepted, unlinked offers and applies the
//     picked offer's candidate/position/comp data into the wizard form.
const searchAcceptedOffers = async (term) => {
  try {
    const items = await listAcceptedOffers({ unlinkedOnly: true, limit: 50 })
    const t = (term || '').toLowerCase()
    const filtered = !t
      ? items
      : items.filter(o =>
          (o.candidate_name || '').toLowerCase().includes(t) ||
          (o.position_title || '').toLowerCase().includes(t) ||
          (o.offer_code || '').toLowerCase().includes(t)
        )
    // Shape into the HrSearchCombobox row format
    return filtered.slice(0, 10).map(o => ({
      id: o.id,
      full_name: o.candidate_name || '—',
      email: `${o.position_title || '—'} · ${o.offer_code}`,
      avatar_url: null,
      __raw: o,
    }))
  } catch {
    return []
  }
}

const onOfferPicked = async (item) => {
  if (!item) { return }
  await prefillFromOffer(item.id, item.__raw)
}

const prefillFromOffer = async (offerId, summary = null) => {
  try {
    const p = await getOnboardingPrefill(offerId)
    applyPrefill(p, summary)
    success(`Prefilled from offer ${p.offer_code}`)
  } catch (e) {
    const detail = e?.response?.data?.detail
    if (typeof detail === 'object' && detail?.employee_id) {
      error(`This offer is already linked to employee ${detail.employee_id}`)
    } else {
      error(typeof detail === 'string' ? detail : 'Could not load offer details')
    }
    // Reset the picker so user can try again
    offerPickerId.value = null
  }
}

const applyPrefill = (p, summary = null) => {
  // Always create a brand-new User shell when prefilling — the candidate
  // doesn't have a User account yet.
  form.linkMode = 'new'
  form.user_id = null
  form._pickedUserLabel = ''

  const c = p.candidate || {}
  const pos = p.position || {}
  const o = p.offer || {}

  // Identity (Step 1)
  if (c.full_name) form.create_full_name = c.full_name
  if (c.email)     form.create_email = c.email
  if (c.gender)    form.gender = c.gender
  if (c.dob)       form.dob = String(c.dob).slice(0, 10)

  // Contact (Step 2)
  if (c.mobile) {
    // Strip any non-digits & keep last 10 chars (10-digit national format)
    const digits = String(c.mobile).replace(/\D/g, '')
    form.mobile = digits.slice(-10)
  }
  if (c.current_city || c.current_state || c.current_country) {
    const addr = [c.current_city, c.current_state, c.current_country]
      .filter(Boolean).join(', ')
    if (addr && !form.current_address) form.current_address = addr
  }

  // Employment (Step 3) — prefer offer-level overrides over the position's defaults
  if (o.department_id || pos.department_id) form.department_id = o.department_id || pos.department_id
  if (pos.designation_id) form.designation_id = pos.designation_id
  if (o.grade_id || pos.grade_id) {
    form.grade_id = o.grade_id || pos.grade_id
    // Prefill from a grade set programmatically (not a user @change) — fill pay
    // level from the grade's default unless the offer already carried one.
    if (!form.pay_level) {
      const pl = payLevelForGrade(reference.grades, form.grade_id)
      if (pl) form.pay_level = pl
    }
  }
  const locId = o.location_id || pos.location_id
  if (locId) {
    // Link the managed work-location FK; HrLocationSelect renders the live name
    // + timezone from the reference directory, so no text resolution needed.
    form.work_location_id = locId
    form.work_location_text = ''
  }
  if (pos.employment_type) form.employment_type = pos.employment_type
  if (o.joining_date) form.joining_date = String(o.joining_date).slice(0, 10)
  if (c.notice_period_days != null) form.notice_period_days = c.notice_period_days
  if (o.reporting_manager_id) form.reporting_manager_id = o.reporting_manager_id

  // Bank & Salary (Step 4)
  // Offer.offered_salary is annual CTC (per project convention)
  if (o.offered_salary != null) {
    const annual = Number(o.offered_salary)
    form.annual_ctc = annual
    form.monthly_ctc = Math.round(annual / 12)
  }

  // Stash linkage + UI metadata
  form._offer_id = p.offer_id
  form._offer_code = p.offer_code
  form._offer_position_title = pos.job_title || summary?.position_title || ''
  form._offer_offered_salary = o.offered_salary ?? null
}

const unlinkOffer = () => {
  form._offer_id = null
  form._offer_code = ''
  form._offer_position_title = ''
  form._offer_offered_salary = null
  offerPickerId.value = null
  // Note: field values prefilled from the offer are intentionally retained
  // so the recruiter doesn't lose typed edits.
}

const formatCtc = (v) => {
  if (v == null) return ''
  const n = Number(v)
  if (!Number.isFinite(n)) return ''
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}
const onReportingManagerPicked = (user) => {
  form._reportingManagerLabel = user ? user.full_name : ''
}
const onHrManagerPicked = (user) => {
  form._hrManagerLabel = user ? user.full_name : ''
}

// ─── Aadhaar formatting: digits-only, auto-spaced "1234 5678 9012" ───
const onAadhaarInput = (raw) => {
  const digits = String(raw || '').replace(/\D/g, '').slice(0, 12)
  // Re-format with spaces for readability — driver of v-model
  const parts = []
  for (let i = 0; i < digits.length; i += 4) parts.push(digits.slice(i, i + 4))
  form.aadhaar_full = parts.join(' ')
}

// ─── Validation per the user's spec ───
//   Step 1 — all mandatory except passport_no / passport_expiry / driving_license
//   Step 2 — all mandatory except current_address (and the "same as permanent" checkbox controls visibility)
//   Step 3 — all mandatory except probation_months / hr_manager / grade
//   Step 4 — bank validations only (account confirm + IFSC regex)
const validateStep = (idx) => {
  for (const k of Object.keys(errors)) delete errors[k]
  if (idx === 0) {
    if (form.linkMode === 'new') {
      if (!form.create_email) errors.create_email = 'Email is required'
      if (!form.create_full_name) errors.create_full_name = 'Full name is required'
    } else {
      if (!form.user_id) errors.user_id = 'Please pick a user'
    }
    if (!form.employee_code) errors.employee_code = 'Required'
    if (!form.gender) errors.gender = 'Required'
    if (!form.dob) errors.dob = 'Required'
    if (!form.marital_status) errors.marital_status = 'Required'
    if (!form.blood_group) errors.blood_group = 'Required'
    if (!form.nationality) errors.nationality = 'Required'
    if (!form.religion) errors.religion = 'Required'

    const adhDigits = String(form.aadhaar_full || '').replace(/\D/g, '')
    if (!adhDigits) errors.aadhaar_full = 'Aadhaar is required'
    else if (adhDigits.length !== 12) errors.aadhaar_full = 'Must be exactly 12 digits'

    if (!form.pan) errors.pan = 'PAN is required'
    else if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(String(form.pan).toUpperCase())) errors.pan = 'Invalid PAN format'
  }
  if (idx === 1) {
    if (!form.mobile) errors.mobile = 'Required'
    else if (!/^\d{10}$/.test(String(form.mobile))) errors.mobile = 'Must be 10 digits'
    if (!form.emergency_contact_name) errors.emergency_contact_name = 'Required'
    if (!form.emergency_contact_phone) errors.emergency_contact_phone = 'Required'
    else if (!/^\d{10}$/.test(String(form.emergency_contact_phone))) errors.emergency_contact_phone = 'Must be 10 digits'
    if (!form.emergency_contact_relation) errors.emergency_contact_relation = 'Required'
    if (!form.permanent_address) errors.permanent_address = 'Required'
    // current_address optional — only required if the "same as" checkbox is unchecked AND user types something is fine
  }
  if (idx === 2) {
    if (!form.department_id) errors.department_id = 'Required'
    if (!form.designation_id) errors.designation_id = 'Required'
    if (!form.employment_type) errors.employment_type = 'Required'
    if (!form.employee_category) errors.employee_category = 'Required'
    if (!form.joining_date) errors.joining_date = 'Required'
    if (form.employee_category === 'CONTRACT' && !form.contract_end_date) errors.contract_end_date = 'Required for contract staff'
    if (form.notice_period_days === null || form.notice_period_days === undefined || form.notice_period_days === '') {
      errors.notice_period_days = 'Required'
    }
    if (!form.reporting_manager_id) errors.reporting_manager_id = 'Required'
    if (!form.pay_level) errors.pay_level = 'Required'
    // Optional per user spec: probation_months, hr_manager_id, grade_id, work_location_text
  }
  if (idx === 3) {
    if (!form.bank_name) errors.bank_name = 'Required'
    if (!form.account_number) errors.account_number = 'Required'
    if (!form._account_confirm) errors.account_confirm = 'Required'
    else if (form.account_number !== form._account_confirm) {
      errors.account_confirm = 'Account numbers do not match'
    }
    if (!form.ifsc) errors.ifsc = 'Required'
    else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(form.ifsc).toUpperCase())) {
      errors.ifsc = 'Invalid IFSC format'
    }
    if (!form.tax_regime) errors.tax_regime = 'Required'
    if (!form.uan) errors.uan = 'Required'
    else if (!/^\d{12}$/.test(String(form.uan))) errors.uan = 'Must be 12 digits'
    if (!form.pf_number) errors.pf_number = 'Required'
    if (!form.esic_number) errors.esic_number = 'Required'
    if (form.monthly_ctc === null || form.monthly_ctc === undefined || form.monthly_ctc === '' || Number(form.monthly_ctc) <= 0) {
      errors.monthly_ctc = 'Required'
    }
    if (form.annual_ctc === null || form.annual_ctc === undefined || form.annual_ctc === '' || Number(form.annual_ctc) <= 0) {
      errors.annual_ctc = 'Required'
    }
  }
  return Object.keys(errors).length === 0
}

const isStepValid = computed(() => validateStep(stepIdx.value))

// Live Annual-CTC preview chip — shows the computed monthly × 12 value
// next to the label so the user can see the auto-calc even when they have
// overridden the field manually.
const autoAnnualCtc = computed(() => {
  const m = Number(form.monthly_ctc)
  return m > 0 ? m * 12 : 0
})
const autoAnnualCtcFormatted = computed(() =>
  autoAnnualCtc.value ? autoAnnualCtc.value.toLocaleString('en-IN') : ''
)

// Annual CTC auto-compute (monthly → annual)
watch(() => form.monthly_ctc, (v) => {
  if (v && (!form.annual_ctc || form.annual_ctc === v * 12 || form.annual_ctc === (Number(v) - 1) * 12)) {
    form.annual_ctc = Number(v) * 12
  }
})
// Annual CTC change → recompute monthly (so the schedule reflects user edits to the annual field).
watch(() => form.annual_ctc, (v) => {
  const a = Number(v)
  if (!Number.isFinite(a) || a <= 0) return
  const computedMonthly = Math.round(a / 12)
  // Only overwrite monthly if it's empty or appears to be a stale auto-derived value.
  if (!form.monthly_ctc || Math.abs(Number(form.monthly_ctc) * 12 - a) > 24) {
    form.monthly_ctc = computedMonthly
  }
})

// Live Indian salary structure preview. Returns null when CTC is not set.
const salaryStructure = computed(() => deriveSalaryStructure(Number(form.annual_ctc) || 0))

// ─── Step nav ───
const goTo = (idx) => {
  if (idx === stepIdx.value) return
  slideDir.value = idx > stepIdx.value ? 'forward' : 'back'
  stepIdx.value = idx
}
const next = () => {
  if (!validateStep(stepIdx.value)) return
  if (stepIdx.value < stepCfg.length - 1) {
    slideDir.value = 'forward'
    stepIdx.value++
  }
}
const prev = () => {
  if (stepIdx.value > 0) {
    slideDir.value = 'back'
    stepIdx.value--
  }
}

const closeWizard = () => {
  Object.assign(form, initialForm())
  stepIdx.value = 0
  emit('update:open', false)
}

// ─── Submit payload ───
const buildPayload = () => {
  const payload = {}
  if (form.linkMode === 'existing') {
    payload.user_id = form.user_id
  } else {
    payload.create_email = form.create_email
    payload.create_full_name = form.create_full_name
  }
  // Derive aadhaar_last_4 from the 12-digit input (we never persist the full 12).
  const adhDigits = String(form.aadhaar_full || '').replace(/\D/g, '')
  if (adhDigits.length === 12) payload.aadhaar_last_4 = adhDigits.slice(-4)

  const carry = [
    'employee_code', 'gender', 'dob', 'marital_status', 'blood_group',
    'nationality', 'religion', 'pan', 'passport_number',
    'passport_expiry', 'driving_license', 'mobile', 'emergency_contact_name',
    'emergency_contact_phone', 'emergency_contact_relation',
    'permanent_address', 'current_address', 'current_same_as_permanent',
    'department_id', 'designation_id', 'employment_type', 'employee_category',
    'joining_date', 'contract_end_date', 'probation_months', 'notice_period_days',
    'reporting_manager_id', 'hr_manager_id', 'grade_id', 'pay_level',
    'work_location_id', 'work_location_text', 'bank_name', 'account_number', 'ifsc',
    'uan', 'pf_number', 'esic_number', 'tax_regime',
    'monthly_ctc', 'annual_ctc',
  ]
  for (const k of carry) {
    const v = form[k]
    if (v !== '' && v !== null && v !== undefined) payload[k] = v
  }
  if (payload.pan) payload.pan = String(payload.pan).toUpperCase()
  if (payload.ifsc) payload.ifsc = String(payload.ifsc).toUpperCase()

  // Back-link to the recruitment offer (UI-only fields stay client-side)
  if (form._offer_id) payload.offer_id = form._offer_id
  return payload
}

const submit = async () => {
  for (let i = 0; i < stepCfg.length; i++) {
    if (!validateStep(i)) {
      stepIdx.value = i
      error('Some fields need attention')
      return
    }
  }
  submitting.value = true
  try {
    const created = await create(buildPayload())
    success(`Employee ${created.employee_id} created`)
    confettiTick.value++
    setTimeout(() => {
      emit('created', created)
      closeWizard()
    }, 600)
  } catch (e) {
    error(e.response?.data?.detail || 'Failed to create employee')
  } finally {
    submitting.value = false
  }
}

// ─── Auto employee code ───
// The canonical employee id is minted server-side from HR Settings → Numbering
// Series (or the EMP#### sequence). Preview it so the code "comes automatically"
// rather than being hand-typed. Only auto-fills while the field is still
// untouched, so an explicit override is preserved.
const nextCodeLoading = ref(false)
const loadNextCode = async () => {
  if (form.employee_code) return
  nextCodeLoading.value = true
  try {
    const code = await peekNextCode()
    if (code && !form.employee_code) form.employee_code = code
  } finally {
    nextCodeLoading.value = false
  }
}

onMounted(async () => { await Promise.all([loadReferenceData(), loadNextCode()]) })
watch(() => props.open, async (v) => { if (v) { await Promise.all([loadReferenceData(), loadNextCode()]) } })
</script>

<style scoped>
.wiz-header {
  position: relative;
  padding: 18px 24px 14px;
  border-bottom: 1px solid var(--hr-border);
  overflow: hidden;
}
.aurora-bg {
  position: absolute; inset: 0;
  background:
    radial-gradient(80% 100% at 0% 0%, rgba(251, 191, 36, 0.18), transparent 60%),
    radial-gradient(60% 80% at 100% 30%, rgba(251, 146, 60, 0.18), transparent 60%);
  background-size: 200% 200%;
  animation: hr-aurora 14s ease-in-out infinite;
  pointer-events: none;
}
.close-btn {
  position: absolute; top: 14px; right: 14px;
  width: 32px; height: 32px;
  background: rgba(255,255,255,0.06);
  border: 1px solid var(--hr-border-strong);
  border-radius: 10px;
  color: var(--hr-text-secondary);
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  z-index: 2;
  transition: all 200ms var(--hr-spring);
}
.close-btn:hover { background: rgba(255,255,255,0.1); color: var(--hr-text); transform: rotate(90deg); }

.wiz-title-row { position: relative; display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.title-icon {
  width: 40px; height: 40px;
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid var(--hr-accent-gold-border);
  border-radius: 12px;
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--hr-accent-gold);
}
.wiz-title-row h2 { font-size: 19px; font-weight: 700; margin: 0; color: var(--hr-text); letter-spacing: -0.015em; }
.wiz-title-row p { font-size: 12px; color: var(--hr-text-muted); margin: 2px 0 0; }
.step-tag {
  background: var(--hr-accent-gold-soft);
  color: var(--hr-accent-gold);
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 6px;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  border: 1px solid var(--hr-accent-gold-border);
  margin-left: 4px;
}

/* ──────────────────────────── Offer prefill banner ──────────────────────── */
.offer-banner {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin: 16px 24px 0;
  padding: 14px 18px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.08), rgba(251, 146, 60, 0.04));
  border: 1px solid var(--hr-accent-gold-border);
  border-radius: 14px;
  box-shadow: 0 8px 26px -18px rgba(251, 146, 60, 0.45);
  animation: rec-banner-in 0.42s var(--hr-spring) both;
}
@keyframes rec-banner-in {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.offer-banner .ob-icon {
  display: grid; place-items: center;
  width: 34px; height: 34px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.18), rgba(251, 146, 60, 0.10));
  border: 1px solid var(--hr-accent-gold-border);
  color: var(--hr-accent-gold);
  flex-shrink: 0;
}
.offer-banner .ob-icon-on {
  background: linear-gradient(135deg, #fbbf24, #fb923c);
  color: #1a1a1c;
  border-color: rgba(251, 191, 36, 0.6);
}
.offer-banner .ob-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.offer-banner .ob-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--hr-text);
  letter-spacing: -0.01em;
}
.offer-banner .ob-sub {
  font-size: 11.5px;
  color: var(--hr-text-muted);
  line-height: 1.45;
}
.offer-banner .ob-money { color: var(--hr-accent-gold); font-weight: 600; }
.offer-banner .ob-unlink {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--hr-border-strong);
  border-radius: 8px;
  color: var(--hr-text-secondary);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 180ms var(--hr-spring);
  align-self: center;
}
.offer-banner .ob-unlink:hover {
  background: rgba(248, 113, 113, 0.10);
  color: #f87171;
  border-color: rgba(248, 113, 113, 0.32);
}
.offer-banner-linked {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.14), rgba(251, 146, 60, 0.07));
  border-color: rgba(251, 191, 36, 0.4);
}

.wiz-body {
  flex: 1;
  overflow-y: auto;
  padding: 22px 24px 28px;
}
.wiz-step { min-height: 100%; }

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.field-block { display: flex; flex-direction: column; gap: 2px; }
.field-block.full { grid-column: span 2; }

.subheader {
  grid-column: span 2;
  margin: 10px 0 -4px;
  font-size: 10.5px;
  font-weight: 800;
  color: var(--hr-orange);
  text-transform: uppercase;
  letter-spacing: 0.7px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.subheader::before {
  content: '';
  width: 14px;
  height: 2px;
  background: var(--hr-accent-gold);
  border-radius: 999px;
  box-shadow: 0 0 8px rgba(251, 191, 36, 0.5);
}

.note {
  grid-column: span 2;
  background: rgba(251, 191, 36, 0.06);
  border: 1px solid var(--hr-accent-gold-border);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 12px;
  color: var(--hr-text-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
}
.note.phase-tag { color: var(--hr-text-muted); }
.note.loading { background: rgba(255,255,255,0.03); border-color: var(--hr-border); }
.err {
  color: var(--hr-input-error);
  font-size: 11px;
  font-weight: 500;
  margin-top: 4px;
}

/* Auto-computed Annual CTC chip — sits inline with the field label. */
.ctc-auto-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  padding: 1px 8px 1px 6px;
  height: 18px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.18), rgba(251, 146, 60, 0.12));
  border: 1px solid var(--hr-accent-gold-border);
  color: var(--hr-accent-gold);
  font-family: var(--hr-mono);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.2px;
  text-transform: none;
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.18);
  animation: hr-fade-up 240ms var(--hr-spring);
}
.ctc-auto-chip svg {
  color: var(--hr-accent-gold);
  flex-shrink: 0;
}

.ctc-band-row { font-size: 11.5px; color: var(--hr-text-muted); font-family: var(--hr-mono); margin-top: -2px; }
.ctc-band-row.warn { color: var(--hr-orange); font-weight: 700; font-family: inherit; }
[data-theme="light"] .ctc-band-row { color: #6b5840; }
[data-theme="light"] .ctc-band-row.warn { color: #c2410c; }

/* ════════ Indian salary structure preview ════════ */
.salary-structure {
  margin-top: 8px;
  border-radius: 14px;
  border: 1px solid var(--hr-accent-gold-border);
  background:
    linear-gradient(180deg, rgba(251,191,36,0.06), rgba(251,191,36,0.02));
  overflow: hidden;
}
.ss-head {
  display: flex; align-items: flex-end; justify-content: space-between; gap: 12px;
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--hr-accent-gold-border);
}
.ss-title { display: flex; flex-direction: column; gap: 2px; }
.ss-eyebrow {
  font-family: var(--hr-mono); font-size: 10px; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--hr-accent-gold);
}
.ss-sub { font-size: 11.5px; color: var(--hr-text-muted); }
.ss-net {
  display: flex; flex-direction: column; align-items: flex-end; gap: 2px;
  padding: 6px 12px;
  border-radius: 10px;
  background: var(--hr-accent-gold-soft);
  border: 1px solid var(--hr-accent-gold-border);
}
.ss-net-label { font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--hr-accent-gold); }
.ss-net-value { font-size: 18px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.01em; }

.ss-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
  color: var(--hr-text);
}
.ss-table thead th {
  text-align: left;
  padding: 9px 16px;
  font-family: var(--hr-mono);
  font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--hr-accent-gold);
  background: rgba(251,191,36,0.06);
  border-bottom: 1px solid var(--hr-accent-gold-border);
}
.ss-table thead th.num { text-align: right; }
.ss-table tbody td {
  padding: 8px 16px;
  border-bottom: 1px solid var(--hr-border);
  color: var(--hr-text-secondary);
}
.ss-table tbody td.num { text-align: right; font-family: var(--hr-mono); color: var(--hr-text); }
.ss-table tr.ss-row-total td {
  background: rgba(251,191,36,0.08);
  font-weight: 700;
  color: var(--hr-text);
  border-top: 1px solid var(--hr-accent-gold-border);
  border-bottom: 1px solid var(--hr-accent-gold-border);
}
.ss-table tr.ss-row-grand td {
  background: linear-gradient(90deg, rgba(251,191,36,0.22), rgba(251,146,60,0.22));
  color: var(--hr-text);
  font-weight: 800;
  font-size: 13.5px;
  border-top: 1px solid var(--hr-accent-gold);
}
.ss-table tr.ss-row-deduction td { color: #f87171; }
.ss-table tr.ss-row-deduction td.num { color: #f87171; }
.ss-table tr.ss-row-net td {
  background: rgba(52,211,153,0.08);
  color: #10b981;
  font-weight: 800;
  font-size: 13.5px;
  border-top: 1px solid rgba(52,211,153,0.4);
}
.ss-foot {
  padding: 10px 16px 12px;
  font-size: 10.5px; line-height: 1.55;
  color: var(--hr-text-muted);
  background: rgba(251,191,36,0.03);
}

[data-theme="light"] .salary-structure {
  border-color: rgba(180,83,9,0.32);
  background: linear-gradient(180deg, rgba(255,250,240,0.85), rgba(255,246,232,0.7));
}
[data-theme="light"] .ss-head { border-bottom-color: rgba(180,83,9,0.2); }
[data-theme="light"] .ss-eyebrow { color: #b45309; }
[data-theme="light"] .ss-sub { color: #6b5840; }
[data-theme="light"] .ss-net { background: rgba(217,119,6,0.12); border-color: rgba(217,119,6,0.32); }
[data-theme="light"] .ss-net-label { color: #b45309; }
[data-theme="light"] .ss-net-value { color: #1a1410; }
[data-theme="light"] .ss-table thead th {
  background: rgba(217,119,6,0.10);
  color: #b45309;
  border-bottom-color: rgba(180,83,9,0.2);
}
[data-theme="light"] .ss-table tbody td { color: #44362a; border-bottom-color: rgba(40,25,10,0.08); }
[data-theme="light"] .ss-table tbody td.num { color: #1a1410; }
[data-theme="light"] .ss-table tr.ss-row-total td { background: rgba(217,119,6,0.12); color: #1a1410; border-color: rgba(180,83,9,0.32); }
[data-theme="light"] .ss-table tr.ss-row-grand td { color: #1a1410; }
[data-theme="light"] .ss-table tr.ss-row-deduction td,
[data-theme="light"] .ss-table tr.ss-row-deduction td.num { color: #b91c1c; }
[data-theme="light"] .ss-table tr.ss-row-net td { color: #047857; background: rgba(5,150,105,0.08); border-top-color: rgba(5,150,105,0.32); }
[data-theme="light"] .ss-foot { color: #6b5840; background: rgba(217,119,6,0.05); }

/* Footer */
.wiz-footer {
  display: flex; align-items: center; gap: 8px;
  padding: 14px 18px;
  border-top: 1px solid var(--hr-border);
  background: rgba(14, 14, 16, 0.85);
}
.grow { flex: 1; }
.ghost, .primary {
  display: inline-flex; align-items: center; gap: 6px;
  height: 38px;
  padding: 0 16px;
  border-radius: 10px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid var(--hr-border-strong);
  transition: all 0.22s var(--hr-spring);
}
.ghost { background: transparent; color: var(--hr-text-secondary); }
.ghost:hover { background: rgba(255,255,255,0.04); color: var(--hr-text); }
.primary {
  background: var(--hr-gradient-rail-active);
  border-color: var(--hr-accent-gold);
  color: #1a1a1c;
  box-shadow: 0 6px 18px -6px rgba(251, 146, 60, 0.5);
}
.primary:hover:not(:disabled) {
  box-shadow: 0 10px 24px -6px rgba(251, 146, 60, 0.7), 0 0 30px rgba(251, 191, 36, 0.35);
}
.primary:disabled, .ghost:disabled { opacity: 0.5; cursor: not-allowed; }

/* Wizard step slide */
.wiz-forward-enter-active, .wiz-forward-leave-active,
.wiz-back-enter-active, .wiz-back-leave-active {
  transition: opacity 0.24s var(--hr-spring), transform 0.24s var(--hr-spring);
}
.wiz-forward-enter-from { opacity: 0; transform: translateX(24px); }
.wiz-forward-leave-to   { opacity: 0; transform: translateX(-24px); }
.wiz-back-enter-from    { opacity: 0; transform: translateX(-24px); }
.wiz-back-leave-to      { opacity: 0; transform: translateX(24px); }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

@media (max-width: 700px) {
  .grid { grid-template-columns: 1fr; }
  .field-block.full, .subheader, .note { grid-column: span 1; }
}

/* ═════════ LIGHT THEME OVERRIDES — warm cream + amber palette ═════════ */
[data-theme="light"] .wiz-header {
  border-bottom-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .aurora-bg {
  background:
    radial-gradient(80% 100% at 0% 0%, rgba(251, 191, 36, 0.32), transparent 60%),
    radial-gradient(60% 80% at 100% 30%, rgba(251, 146, 60, 0.28), transparent 60%);
}
[data-theme="light"] .close-btn {
  background: rgba(255, 250, 240, 0.72);
  border-color: rgba(40, 25, 10, 0.16);
  color: #6b5840;
}
[data-theme="light"] .close-btn:hover {
  background: rgba(217, 119, 6, 0.12);
  color: #b45309;
}
[data-theme="light"] .title-icon {
  background: rgba(217, 119, 6, 0.14);
  border-color: rgba(217, 119, 6, 0.36);
  color: #b45309;
}
[data-theme="light"] .wiz-title-row h2 { color: #1a1410; }
[data-theme="light"] .wiz-title-row p { color: #6b5840; }
[data-theme="light"] .step-tag {
  background: rgba(217, 119, 6, 0.16);
  border-color: rgba(217, 119, 6, 0.40);
  color: #b45309;
}
[data-theme="light"] .offer-banner {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.18), rgba(251, 146, 60, 0.10));
  border-color: rgba(217, 119, 6, 0.36);
  box-shadow: 0 8px 26px -18px rgba(217, 119, 6, 0.45);
}
[data-theme="light"] .offer-banner .ob-icon {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.32), rgba(251, 146, 60, 0.16));
  border-color: rgba(217, 119, 6, 0.40);
  color: #b45309;
}
[data-theme="light"] .offer-banner .ob-title { color: #1a1410; }
[data-theme="light"] .offer-banner .ob-sub { color: #44362a; }
[data-theme="light"] .offer-banner .ob-money { color: #b45309; }
[data-theme="light"] .offer-banner .ob-unlink {
  background: rgba(255, 250, 240, 0.72);
  border-color: rgba(40, 25, 10, 0.16);
  color: #6b5840;
}
[data-theme="light"] .offer-banner .ob-unlink:hover {
  background: rgba(220, 38, 38, 0.10);
  color: #b91c1c;
  border-color: rgba(220, 38, 38, 0.36);
}
[data-theme="light"] .offer-banner-linked {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.22), rgba(251, 146, 60, 0.12));
  border-color: rgba(217, 119, 6, 0.42);
}
[data-theme="light"] .subheader { color: #b45309; }
[data-theme="light"] .subheader::before {
  background: #d97706;
  box-shadow: 0 0 6px rgba(217, 119, 6, 0.45);
}
[data-theme="light"] .note {
  background: rgba(251, 191, 36, 0.14);
  border-color: rgba(217, 119, 6, 0.32);
  color: #44362a;
}
[data-theme="light"] .note.phase-tag { color: #6b5840; }
[data-theme="light"] .note.loading {
  background: rgba(255, 250, 240, 0.62);
  border-color: rgba(40, 25, 10, 0.12);
}
[data-theme="light"] .err { color: #b91c1c; }
[data-theme="light"] .ctc-auto-chip {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.26), rgba(251, 146, 60, 0.16));
  border-color: rgba(217, 119, 6, 0.42);
  color: #b45309;
  box-shadow: 0 0 12px rgba(217, 119, 6, 0.18);
}
[data-theme="light"] .ctc-auto-chip svg { color: #b45309; }
[data-theme="light"] .wiz-footer {
  background: rgba(255, 250, 240, 0.78);
  border-top-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .ghost {
  border-color: rgba(40, 25, 10, 0.16);
  color: #44362a;
}
[data-theme="light"] .ghost:hover {
  background: rgba(217, 119, 6, 0.10);
  color: #b45309;
}
[data-theme="light"] .primary {
  color: #fff;
  box-shadow: 0 6px 18px -6px rgba(217, 119, 6, 0.45);
}
[data-theme="light"] .primary:hover:not(:disabled) {
  box-shadow: 0 10px 24px -6px rgba(217, 119, 6, 0.60),
              0 0 28px rgba(217, 119, 6, 0.28);
}
</style>
