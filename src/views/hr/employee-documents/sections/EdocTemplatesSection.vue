<template>
  <div class="edoc-section">
    <div class="edoc-toolbar">
      <div class="vq-title"><LayoutTemplate :size="16" /> <span>Document Templates</span></div>
      <div style="flex:1" />
      <button class="edoc-btn edoc-btn-primary" @click="openEditor()"><Plus :size="15" /> New Template</button>
    </div>

    <div v-if="tpl.loading.value" class="tpl-grid">
      <div v-for="i in 3" :key="i" class="edoc-skel" style="height:150px" />
    </div>
    <EdocEmptyState v-else-if="!tpl.items.value.length" :icon="LayoutTemplate"
      title="No templates yet" body="Create reusable, placeholder-driven templates to auto-generate letters and certificates."
      cta-label="New Template" :cta-icon="Plus" @cta="openEditor()" />
    <div v-else class="tpl-grid">
      <Motion v-for="(t, i) in tpl.items.value" :key="t.id"
        as="article" class="tpl-card edoc-card is-hoverable"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: i * 0.05, ease: EASE }" :whileHover="{ y: -4 }">
        <div class="tpl-top">
          <span class="tpl-ic"><FileText :size="16" /></span>
          <span class="tpl-type">{{ typeLabel(t.template_type) }}</span>
        </div>
        <h4 class="tpl-name">{{ t.name }}</h4>
        <div class="tpl-ph">
          <span v-for="p in (t.placeholders || []).slice(0,4)" :key="p" class="ph-chip">{{ p }}</span>
          <span v-if="(t.placeholders||[]).length > 4" class="ph-more">+{{ t.placeholders.length - 4 }}</span>
        </div>
        <div class="tpl-actions">
          <button class="edoc-btn edoc-btn-sm edoc-btn-primary" @click="openGenerate(t)"><Sparkles :size="13" /> Generate</button>
          <button class="edoc-btn edoc-btn-sm" @click="openEditor(t)"><Pencil :size="13" /></button>
          <button class="edoc-btn edoc-btn-sm" @click="del(t)"><Trash2 :size="13" /></button>
        </div>
      </Motion>
    </div>

    <!-- Editor modal — type-aware placeholder bank, grouped by section. -->
    <EdocModal :open="editor.open" :title="editor.id ? 'Edit Template' : 'New Template'" subtitle="Use {{placeholder}} tokens" :icon="LayoutTemplate" :width="720" @close="editor.open = false">
      <div class="ed-form">
        <div class="grid-2">
          <div class="field"><HrFieldLabel label="Name" required /><HrInput v-model="editor.name" placeholder="e.g. Standard Experience Letter" /></div>
          <div class="field"><HrFieldLabel label="Type" required /><HrSelect v-model="editor.template_type" :options="typeOptions" /></div>
        </div>
        <div class="field">
          <HrFieldLabel :label="`Placeholders for ${typeLabel(editor.template_type)}`" />
          <div class="ph-groups">
            <div v-for="(items, group) in groupedPlaceholders" :key="group" class="ph-group">
              <span class="ph-group-name">{{ group }}</span>
              <div class="ph-bank">
                <button v-for="p in items" :key="p" class="ph-chip ins" @click="insertPlaceholder(p)" type="button">+ {{ p }}</button>
              </div>
            </div>
          </div>
        </div>
        <div class="field">
          <HrFieldLabel label="Custom body (optional)" />
          <HrTextarea v-model="editor.body" :rows="6" placeholder="Optional — type custom clauses to inject into the standard structure. Leave empty to use the canonical corporate template." />
          <span class="hint">The canonical multi-page corporate letter is generated automatically from the type. Any text typed here is inserted as an additional paragraph; leave empty for the default.</span>
        </div>
        <div class="field" v-if="previewText">
          <HrFieldLabel label="Live preview (custom body only)" />
          <div class="preview">{{ previewText }}</div>
        </div>
      </div>
      <template #footer>
        <button class="edoc-btn" @click="editor.open = false">Cancel</button>
        <div style="flex:1" />
        <button class="edoc-btn edoc-btn-primary" :disabled="!canSaveTpl || editor.saving" @click="saveTpl">
          <Loader2 v-if="editor.saving" :size="14" class="spin" /><Save v-else :size="14" /> Save Template
        </button>
      </template>
    </EdocModal>

    <!-- Generate modal — structured form per template type + live preview. -->
    <EdocModal :open="gen.open" :title="`Generate ${typeLabel(gen.template?.template_type)}`" :subtitle="gen.template?.name" :icon="Sparkles" :width="980" @close="closeGenerate">
      <div class="gen-layout">
        <!-- Left: Form -->
        <div class="gen-form">
          <div class="field">
            <HrFieldLabel label="Employee / Recipient" required />
            <HrSelect v-model="gen.employee_id" :options="employeeOptions" placeholder="Select employee…" @change="onEmployeeChange" searchable />
          </div>

          <!-- Type-specific structured fields -->
          <div v-if="formFields.length" class="form-section">
            <div class="sec-head">
              <FileSignature :size="13" />
              <span>Document Particulars</span>
            </div>
            <div class="form-grid">
              <div v-for="f in formFields" :key="f.key" class="field" :class="{ 'span-2': f.kind === 'textarea' || f.kind === 'address' }">
                <HrFieldLabel :label="f.label" />
                <HrTextarea v-if="f.kind === 'textarea' || f.kind === 'address'" v-model="gen.fields[f.key]" :rows="3" :placeholder="f.helper || ''" />
                <HrDatePicker v-else-if="f.kind === 'date'" v-model="gen.fields[f.key]" />
                <HrNumberInput v-else-if="f.kind === 'number'" v-model="gen.fields[f.key]" :min="0" :step-by="f.key === 'annual_ctc' ? 50000 : 1" />
                <HrInput v-else v-model="gen.fields[f.key]" :placeholder="f.helper || ''" />
                <span v-if="f.helper && f.kind === 'text'" class="hint">{{ f.helper }}</span>
              </div>
            </div>
          </div>

          <!-- Custom placeholders from the template body -->
          <div v-if="gen.vars.length" class="form-section">
            <div class="sec-head">
              <Layers :size="13" />
              <span>Custom Placeholders</span>
            </div>
            <div class="var-grid">
              <div v-for="v in gen.vars" :key="v.key" class="var-row">
                <span class="var-k">{{ v.key }}</span>
                <HrInput v-model="v.value" :placeholder="v.key" />
              </div>
            </div>
          </div>

          <div class="gen-actions">
            <button class="edoc-btn" @click="regeneratePreview" :disabled="!gen.employee_id">
              <RefreshCw :size="13" /> Refresh Preview
            </button>
            <div style="flex:1" />
            <button class="edoc-btn" @click="downloadPreview" :disabled="!gen.previewUrl">
              <Download :size="13" /> Download (no upload)
            </button>
          </div>
        </div>

        <!-- Right: Live PDF preview -->
        <div class="gen-preview">
          <div class="prev-head">
            <Sparkles :size="13" />
            <span>Live Preview</span>
            <span v-if="gen.previewPages" class="prev-meta edoc-mono">{{ gen.previewPages }} pp · {{ gen.previewSize }}</span>
            <button
              v-if="quickEditFields.length"
              type="button"
              class="prev-edit-btn"
              :class="{ active: gen.quickEditOpen }"
              @click="gen.quickEditOpen = !gen.quickEditOpen"
            >
              <Pencil :size="11" /> <span>{{ gen.quickEditOpen ? 'Close' : 'Edit on preview' }}</span>
            </button>
          </div>
          <div class="prev-body">
            <iframe v-if="gen.previewUrl" :src="gen.previewUrl" class="prev-frame" />
            <div v-else class="prev-empty">
              <FilePlus :size="32" />
              <span>Select an employee to generate a live PDF preview.</span>
            </div>

            <!-- Inline edit panel — floats over the preview so the user can correct
                 header / party details without losing context. Auto-regenerate picks
                 up the changes via the debounced watcher. -->
            <transition name="quick-edit">
              <div v-if="gen.quickEditOpen && quickEditFields.length" class="quick-edit-card" @click.stop>
                <div class="qe-head">
                  <Wand2 :size="13" />
                  <span>Inline Edit</span>
                  <span class="qe-hint">Changes apply to the preview instantly</span>
                  <button class="qe-close" @click="gen.quickEditOpen = false" aria-label="Close inline editor">
                    <X :size="13" />
                  </button>
                </div>
                <div class="qe-body">
                  <div v-for="f in quickEditFields" :key="f.key" class="qe-field" :class="{ 'span-2': f.kind === 'textarea' || f.kind === 'address' }">
                    <HrFieldLabel :label="f.label" />
                    <HrTextarea
                      v-if="f.kind === 'textarea' || f.kind === 'address'"
                      v-model="gen.fields[f.key]"
                      :rows="2"
                    />
                    <HrInput v-else v-model="gen.fields[f.key]" :placeholder="f.helper || ''" />
                  </div>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="edoc-btn" @click="closeGenerate">Cancel</button>
        <div style="flex:1" />
        <button class="edoc-btn edoc-btn-primary" :disabled="!gen.employee_id || gen.saving" @click="generateAndFile">
          <Loader2 v-if="gen.saving" :size="14" class="spin" /><FileDown v-else :size="14" /> Save &amp; File
        </button>
      </template>
    </EdocModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import {
  LayoutTemplate, FileText, Plus, Pencil, Trash2, Sparkles, Save, Loader2, FileDown,
  FileSignature, Layers, RefreshCw, Download, FilePlus, Wand2, X,
} from 'lucide-vue-next'
import EdocModal from '../components/EdocModal.vue'
import EdocEmptyState from '../components/EdocEmptyState.vue'
import HrFieldLabel from '@/components/hr/forms/HrFieldLabel.vue'
import HrInput from '@/components/hr/forms/HrInput.vue'
import HrSelect from '@/components/hr/forms/HrSelect.vue'
import HrTextarea from '@/components/hr/forms/HrTextarea.vue'
import HrNumberInput from '@/components/hr/forms/HrNumberInput.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import {
  useEdocTemplates, useEmployeeDocuments, TEMPLATE_TYPES,
  TEMPLATE_PLACEHOLDERS, TEMPLATE_FORM_FIELDS, COMMON_PLACEHOLDERS,
} from '@/composables/useEmployeeDocuments'
import { useEmployees } from '@/composables/useEmployees'
import { useToast } from '@/composables/useToast'
import { renderTemplate, generateLetterByType, docToFile } from '@/utils/edocPdfGenerator'

const EASE = [0.16, 1, 0.3, 1]
const tpl = useEdocTemplates()
const docs = useEmployeeDocuments()
const emp = useEmployees()
const { success, error } = useToast()

const typeOptions = TEMPLATE_TYPES.map(t => ({ label: t.label, value: t.key }))
const typeLabel = (k) => TEMPLATE_TYPES.find(t => t.key === k)?.label || k
const TYPE_CATEGORY = {
  EXPERIENCE_LETTER: 'EXPERIENCE_LETTER',
  RELIEVING_LETTER: 'EXPERIENCE_LETTER',
  CONFIRMATION_LETTER: 'EXPERIENCE_LETTER',
  APPOINTMENT_LETTER: 'CONTRACT',
  OFFER_LETTER: 'CONTRACT',
  NDA: 'CONTRACT',
  SALARY_CERTIFICATE: 'SALARY_SLIP',
}

// ── Editor ──
const editor = ref({ open: false, id: null, name: '', template_type: 'EXPERIENCE_LETTER', body: '', saving: false })
const openEditor = (t = null) => {
  editor.value = t
    ? { open: true, id: t.id, name: t.name, template_type: t.template_type, body: t.body || '', saving: false }
    : { open: true, id: null, name: '', template_type: 'EXPERIENCE_LETTER', body: '', saving: false }
}
const insertPlaceholder = (p) => { editor.value.body = `${editor.value.body || ''}{{${p}}}` }
const detectPlaceholders = (body) => [...new Set([...String(body).matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)].map(m => m[1].trim()))]

// Type-aware placeholder groups for the editor's chip bank.
const groupedPlaceholders = computed(() => TEMPLATE_PLACEHOLDERS[editor.value.template_type] || { General: COMMON_PLACEHOLDERS })

const previewText = computed(() => {
  if (!editor.value.body) return ''
  return renderTemplate(editor.value.body, {
    employee_name: 'Jordan Rivera', employee_code: 'EMP0007', designation: 'Senior Engineer',
    department: 'Engineering', joining_date: '12 Jan 2023',
    issue_date: new Date().toLocaleDateString('en-IN'), company: 'Fourreck',
  })
})
// Body is now optional — canonical structure is generated from type.
const canSaveTpl = computed(() => !!(editor.value.name && editor.value.template_type))
const saveTpl = async () => {
  editor.value.saving = true
  try {
    const payload = { name: editor.value.name, template_type: editor.value.template_type, body: editor.value.body, placeholders: detectPlaceholders(editor.value.body) }
    if (editor.value.id) await tpl.update(editor.value.id, payload)
    else await tpl.create(payload)
    success('Template saved'); editor.value.open = false; await tpl.fetchList()
  } catch (e) { error(e?.response?.data?.detail || 'Save failed') }
  finally { editor.value.saving = false }
}
const del = async (t) => { try { await tpl.remove(t.id); success('Template deleted'); await tpl.fetchList() } catch { error('Delete failed') } }

// ── Generate ──
// State holds the structured form (`fields`), the legacy custom placeholders
// (`vars`), the cached employee detail, and the live preview bloburl.
const gen = ref({
  open: false,
  template: null,
  employee_id: '',
  detail: null,       // full EmployeeDetailResponse for the picked employee
  vars: [],           // custom placeholder values from the template body
  fields: {},         // structured form values for this template type
  previewUrl: '',
  previewPages: 0,
  previewSize: '',
  saving: false,
  quickEditOpen: false, // toggles the inline edit overlay on the preview pane
})

// Header / party fields that the inline-edit overlay exposes. We keep the
// list narrow so the overlay never overflows the preview pane — the full form
// remains the canonical source of truth.
const QUICK_EDIT_KEYS = new Set([
  'company_name', 'company_address',
  'recipient_address', 'governing_law', 'execution_city',
  'effective_date', 'expiry_date', 'joining_date',
  'work_location', 'reporting_manager', 'designation', 'department',
])
const quickEditFields = computed(() =>
  (formFields.value || []).filter(f => QUICK_EDIT_KEYS.has(f.key))
)

const employeeOptions = computed(() => (emp.employees.value || []).map(e => ({
  label: `${e.employee_name || e.full_name || 'Employee'}${e.employee_code ? ` · ${e.employee_code}` : ''}`,
  value: e.id,
})))

const formFields = computed(() => TEMPLATE_FORM_FIELDS[gen.value.template?.template_type] || [])

const openGenerate = async (t) => {
  const blankFields = {}
  for (const f of TEMPLATE_FORM_FIELDS[t.template_type] || []) blankFields[f.key] = null
  gen.value = {
    open: true, template: t, employee_id: '', detail: null,
    vars: detectPlaceholders(t.body).map(k => ({ key: k, value: '' })),
    fields: blankFields,
    previewUrl: '', previewPages: 0, previewSize: '', saving: false,
    quickEditOpen: false,
  }
  if (!emp.employees.value?.length) { emp.setFilters({ limit: 100 }); await emp.fetchList() }
}

const closeGenerate = () => {
  // Revoke any blob URL we created for the live preview so we don't leak memory.
  if (gen.value.previewUrl) {
    try { URL.revokeObjectURL(gen.value.previewUrl) } catch {}
  }
  gen.value.open = false
}

const onEmployeeChange = async () => {
  const lite = (emp.employees.value || []).find(x => x.id === gen.value.employee_id)
  if (!lite) return
  try {
    gen.value.detail = await emp.getOne(lite.id)
  } catch {
    gen.value.detail = lite
  }
  // Prefill structured fields with sensible defaults from the employee record.
  const d = gen.value.detail || lite
  const f = gen.value.fields
  const setIf = (k, v) => { if ((f[k] == null || f[k] === '') && v != null && v !== '') f[k] = v }
  setIf('joining_date', d.joining_date)
  setIf('confirmation_date', d.confirmation_date)
  setIf('probation_months', d.probation_months || 6)
  setIf('notice_period_days', d.notice_period_days || 60)
  setIf('work_location', d.work_location?.name || d.work_location_text || '')
  setIf('reporting_manager', d.reporting_manager?.full_name || d.reporting_manager?.email || '')
  setIf('annual_ctc', d.annual_ctc != null ? Number(d.annual_ctc) : null)
  setIf('designation', d.designation?.title || d.designation_name || '')
  setIf('department', d.department?.name || d.department_name || '')
  setIf('recipient_address', d.current_address || d.permanent_address || '')
  setIf('term_years', 3)
  setIf('execution_city', 'Hyderabad')
  setIf('governing_law', 'Hyderabad, Telangana, India')
  setIf('company_name', 'Fourreck Technologies Pvt. Ltd.')
  setIf('company_address', '4th Floor, Innovation Tower, Hyderabad, Telangana 500032, India')
  // Also prefill legacy custom placeholders from employee data.
  const known = {
    employee_name: d.full_name || lite.employee_name || lite.full_name || '',
    employee_code: d.employee_code || lite.employee_code || '',
    designation: d.designation?.title || d.designation_name || '',
    department: d.department?.name || d.department_name || '',
    joining_date: d.joining_date ? new Date(d.joining_date).toLocaleDateString('en-IN') : '',
    issue_date: new Date().toLocaleDateString('en-IN'),
    company: 'Fourreck',
  }
  gen.value.vars = gen.value.vars.map(v => ({ ...v, value: v.value || known[v.key] || '' }))
  // Regenerate preview now that we have data.
  await regeneratePreview()
}

const genVarsObj = computed(() => Object.fromEntries(gen.value.vars.map(v => [v.key, v.value])))

// Build the employee object passed into the PDF generator from cached detail.
function buildEmployeePayload() {
  const d = gen.value.detail || {}
  const lite = (emp.employees.value || []).find(x => x.id === gen.value.employee_id) || {}
  return {
    name: d.full_name || d.employee_name || lite.employee_name || lite.full_name || 'Employee',
    code: d.employee_code || lite.employee_code || '',
    designation: d.designation?.title || d.designation_name || lite.designation_name || '',
    department: d.department?.name || d.department_name || lite.department_name || '',
    email: d.user?.email || d.email || lite.email || '',
    gender: d.gender || '',
    employmentType: d.employment_type || lite.employment_type || '',
    joiningDate: d.joining_date || lite.joining_date || null,
    confirmationDate: d.confirmation_date || null,
    probationMonths: d.probation_months || null,
    noticePeriodDays: d.notice_period_days || null,
    workLocation: d.work_location?.name || d.work_location_text || lite.work_location_text || '',
    reportingManager: d.reporting_manager?.full_name || d.reporting_manager?.email || '',
    annualCtc: d.annual_ctc != null ? Number(d.annual_ctc) : null,
    monthlyGross: d.monthly_ctc != null ? Number(d.monthly_ctc) : null,
    currentAddress: d.current_address || '',
    permanentAddress: d.permanent_address || '',
  }
}

// Map structured form fields → generator extras
function buildExtras() {
  const f = gen.value.fields || {}
  const num = (v) => (v == null || v === '' ? undefined : Number(v))
  const dt = (v) => (v ? new Date(v) : undefined)
  return {
    lastWorkingDate: dt(f.last_working_date),
    resignationDate: dt(f.resignation_date),
    confirmationDate: dt(f.confirmation_date),
    joiningDate: dt(f.joining_date),
    expiryDate: dt(f.expiry_date),
    probationMonths: num(f.probation_months),
    noticePeriodDays: num(f.notice_period_days),
    workLocation: f.work_location || undefined,
    reportingManager: f.reporting_manager || undefined,
    ctc: num(f.annual_ctc),
    annualCtc: num(f.annual_ctc),
    designation: f.designation || undefined,
    department: f.department || undefined,
    purpose: f.purpose || undefined,
    // NDA-specific
    term: num(f.term_years),
    executionCity: f.execution_city || undefined,
    governingLaw: f.governing_law || undefined,
    companyName: f.company_name || undefined,
    companyAddress: f.company_address || undefined,
    recipientAddress: f.recipient_address || undefined,
    issueDate: new Date(),
  }
}

function buildPdf() {
  const t = gen.value.template
  if (!t || !gen.value.employee_id) return null
  const employee = buildEmployeePayload()
  // Override employee.currentAddress with the form's recipient_address if set.
  if (gen.value.fields.recipient_address) employee.currentAddress = gen.value.fields.recipient_address
  const extras = buildExtras()
  // Render any user-typed body with placeholder substitutions.
  const extraBody = t.body ? renderTemplate(t.body, { ...genVarsObj.value, employee_name: employee.name, employee_code: employee.code }) : ''
  // Append free-form additional clauses from the form (if any).
  const additional = gen.value.fields.additional_clauses
  const merged = [extraBody, additional].filter(s => s && String(s).trim()).join('\n\n')
  return generateLetterByType(t.template_type, { employee, extraBody: merged, ...extras })
}

let _previewTimer = null
async function regeneratePreview() {
  if (!gen.value.employee_id) return
  try {
    const pdf = buildPdf()
    if (!pdf) return
    const blob = pdf.output('blob')
    const url = URL.createObjectURL(blob)
    if (gen.value.previewUrl) { try { URL.revokeObjectURL(gen.value.previewUrl) } catch {} }
    gen.value.previewUrl = url
    gen.value.previewPages = pdf.getNumberOfPages()
    gen.value.previewSize = blob.size > 1024 * 1024
      ? `${(blob.size / 1024 / 1024).toFixed(2)} MB`
      : `${Math.round(blob.size / 1024)} KB`
  } catch (e) {
    error('Preview generation failed: ' + (e?.message || ''))
  }
}

// Debounced auto-regenerate on any field/var change.
watch(
  () => [JSON.stringify(gen.value.fields), JSON.stringify(gen.value.vars), gen.value.employee_id],
  () => {
    if (!gen.value.employee_id) return
    clearTimeout(_previewTimer)
    _previewTimer = setTimeout(regeneratePreview, 350)
  },
  { deep: true },
)

const downloadPreview = () => {
  const t = gen.value.template
  const pdf = buildPdf()
  if (!pdf) return
  const empCode = gen.value.detail?.employee_code || 'emp'
  pdf.save(`${t.template_type}_${empCode}.pdf`)
}

const generateAndFile = async () => {
  const t = gen.value.template
  const lite = (emp.employees.value || []).find(x => x.id === gen.value.employee_id)
  if (!t || !lite) return
  gen.value.saving = true
  try {
    const pdf = buildPdf()
    if (!pdf) throw new Error('Could not build PDF')
    const empCode = gen.value.detail?.employee_code || lite.employee_code || 'emp'
    const empName = gen.value.detail?.full_name || gen.value.detail?.employee_name || lite.employee_name || lite.full_name || 'Employee'
    const file = docToFile(pdf, `${t.template_type}_${empCode}.pdf`)
    const category = TYPE_CATEGORY[t.template_type] || 'OTHER'
    const created = await docs.create({ employee_id: lite.id, category, doc_type: t.template_type, title: `${typeLabel(t.template_type)} — ${empName}` })
    await docs.uploadFile(created.id, file)
    success(`${typeLabel(t.template_type)} generated & filed`)
    closeGenerate()
  } catch (err) { error(err?.response?.data?.detail || err?.message || 'Generation failed') }
  finally { gen.value.saving = false }
}

onBeforeUnmount(() => {
  if (gen.value.previewUrl) { try { URL.revokeObjectURL(gen.value.previewUrl) } catch {} }
  clearTimeout(_previewTimer)
})

onMounted(() => tpl.fetchList())
</script>

<style scoped>
.vq-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: var(--hr-text); }
.tpl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
.tpl-card { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.tpl-top { display: flex; align-items: center; gap: 10px; }
.tpl-ic { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; background: var(--hr-accent-gold-soft); border: 1px solid var(--hr-accent-gold-border); color: var(--hr-accent-gold); }
.tpl-type { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--hr-text-muted); }
.tpl-name { margin: 0; font-size: 15px; font-weight: 700; color: var(--hr-text); }
.tpl-ph { display: flex; flex-wrap: wrap; gap: 5px; min-height: 22px; }
.ph-chip { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 999px; background: rgba(255,255,255,0.05); border: 1px solid var(--hr-border); color: var(--hr-text-secondary); }
.ph-chip.ins { cursor: pointer; color: var(--hr-accent-gold); border-color: var(--hr-accent-gold-border); background: var(--hr-accent-gold-soft); }
.ph-more { font-size: 10px; color: var(--hr-text-muted); align-self: center; }
.tpl-actions { display: flex; gap: 6px; margin-top: auto; }
.ed-form { display: flex; flex-direction: column; gap: 14px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 5px; }
.ph-bank { display: flex; flex-wrap: wrap; gap: 6px; }
.preview { padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid var(--hr-border); font-size: 12.5px; line-height: 1.6; color: var(--hr-text-secondary); white-space: pre-wrap; max-height: 160px; overflow-y: auto; }
.var-grid { display: flex; flex-direction: column; gap: 8px; }
.var-row { display: grid; grid-template-columns: 130px 1fr; gap: 10px; align-items: center; }
.var-k { font-size: 11.5px; font-weight: 600; color: var(--hr-text-muted); font-family: monospace; }
.spin { animation: edoc-ring-rotate 1s linear infinite; }
.hint { font-size: 10.5px; color: var(--hr-text-muted); margin-top: 2px; line-height: 1.45; }

/* ── Grouped placeholder bank in the editor ── */
.ph-groups { display: flex; flex-direction: column; gap: 8px; }
.ph-group { display: flex; flex-direction: column; gap: 4px; padding: 8px 10px; border-radius: 10px; background: rgba(255,255,255,0.02); border: 1px solid var(--hr-border); }
.ph-group-name { font-family: var(--hr-mono); font-size: 9.5px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--hr-accent-gold); }

/* ── Generate modal two-column layout ──
   Grid items default to `min-width: auto`, which lets long select labels
   ("Razeya · 190 · Tech Lead") and full-width inputs push the column wider
   than 1fr — producing a horizontal scrollbar on `.gen-form` and visibly
   clipping `.hr-input-shell` / `.hr-dp-trigger` / `.hr-ta-shell`. The
   `min-width: 0` rules below force the children to shrink to the column.
   Use a fixed-height column so `overflow-y: auto` has a definite parent
   height to work against (the previous `max-height: 70vh` left the form
   un-scrollable on tall content / short viewports). */
.gen-layout { display: grid; grid-template-columns: 1fr 1.2fr; gap: 14px; min-width: 0; height: 70vh; max-height: 70vh; min-height: 480px; }
.gen-form {
  display: flex; flex-direction: column; gap: 12px;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  min-width: 0;
  padding: 2px 10px 2px 0;
  /* Custom warm-gold scrollbar — bright enough to be obvious on the dark glass */
  scrollbar-width: thin;
  scrollbar-color: rgba(251, 191, 36, 0.85) rgba(255,255,255,0.05);
  scrollbar-gutter: stable;
  overscroll-behavior: contain;
}
.gen-form::-webkit-scrollbar { width: 10px; }
.gen-form::-webkit-scrollbar-track {
  background: rgba(255,255,255,0.04);
  border-radius: 999px;
  margin: 4px 0;
}
.gen-form::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #fbbf24, #fb923c);
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: padding-box;
  box-shadow: 0 0 8px rgba(251, 146, 60, 0.4);
}
.gen-form::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #fcd34d, #f97316);
  background-clip: padding-box;
}
.form-section { display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--hr-border); min-width: 0; }
.sec-head { display: inline-flex; align-items: center; gap: 6px; font-family: var(--hr-mono); font-size: 9.5px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--hr-accent-gold); }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; min-width: 0; }
.form-grid > .field, .form-grid > * { min-width: 0; }
.form-grid .field.span-2 { grid-column: span 2; min-width: 0; }
.field { min-width: 0; }
.gen-actions { display: flex; align-items: center; gap: 8px; padding-top: 6px; flex-wrap: wrap; }

.gen-preview { display: flex; flex-direction: column; gap: 8px; border: 1px solid var(--hr-border); border-radius: 12px; background: rgba(255,255,255,0.02); height: 100%; min-width: 0; overflow: hidden; }
.prev-head { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-bottom: 1px solid var(--hr-border); }
.prev-head span:first-of-type { font-family: var(--hr-mono); font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--hr-accent-gold); }
.prev-meta { margin-left: auto; font-size: 11px; color: var(--hr-text-muted); }
.prev-edit-btn {
  display: inline-flex; align-items: center; gap: 5px;
  margin-left: 8px;
  padding: 5px 10px;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.32);
  color: var(--hr-accent-gold);
  border-radius: 999px;
  font: inherit; font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em;
  cursor: pointer;
  transition: all 200ms cubic-bezier(0.16, 1, 0.3, 1);
}
.prev-edit-btn:hover { background: rgba(251, 191, 36, 0.18); transform: translateY(-1px); box-shadow: 0 4px 14px -6px rgba(251, 146, 60, 0.55); }
.prev-edit-btn.active { background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #1a1410; border-color: #f59e0b; box-shadow: 0 4px 14px -4px rgba(251, 146, 60, 0.7); }
.prev-body { flex: 1; position: relative; min-width: 0; overflow: hidden; }
.prev-frame { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: #2a2421; }
.prev-empty { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: var(--hr-text-muted); font-size: 12.5px; padding: 24px; text-align: center; }

/* ── Inline edit overlay on the preview ───────────────────────────────── */
.quick-edit-card {
  position: absolute;
  top: 10px; right: 10px;
  width: min(360px, calc(100% - 20px));
  max-height: calc(100% - 20px);
  display: flex; flex-direction: column;
  background: rgba(20, 16, 14, 0.85);
  backdrop-filter: blur(28px) saturate(170%);
  -webkit-backdrop-filter: blur(28px) saturate(170%);
  border: 1px solid rgba(251, 191, 36, 0.32);
  border-radius: 14px;
  box-shadow:
    0 24px 60px -18px rgba(0,0,0,0.65),
    0 0 0 1px rgba(251, 191, 36, 0.10),
    0 0 40px -8px rgba(251, 146, 60, 0.35);
  z-index: 3;
  overflow: hidden;
}
.quick-edit-card::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, #fbbf24, #fb923c, #fbbf24);
  background-size: 200% 100%;
  animation: qe-shimmer 3.4s linear infinite;
}
@keyframes qe-shimmer { to { background-position: -200% 0; } }
.qe-head {
  display: flex; align-items: center; gap: 7px;
  padding: 10px 12px;
  border-bottom: 1px dashed rgba(251, 191, 36, 0.20);
  color: var(--hr-accent-gold);
}
.qe-head > span:first-of-type {
  font-family: var(--hr-mono); font-size: 10px; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
}
.qe-hint {
  margin-left: auto;
  font-size: 9.5px; color: var(--hr-text-muted);
  font-style: italic;
}
.qe-close {
  display: grid; place-items: center;
  width: 22px; height: 22px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 7px;
  color: var(--hr-text-muted);
  cursor: pointer;
  transition: all 180ms;
}
.qe-close:hover { background: rgba(239, 68, 68, 0.18); color: #fca5a5; transform: rotate(90deg); }
.qe-body {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 12px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(251, 191, 36, 0.4) transparent;
}
.qe-body::-webkit-scrollbar { width: 6px; }
.qe-body::-webkit-scrollbar-thumb { background: rgba(251, 191, 36, 0.4); border-radius: 999px; }
.qe-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.qe-field.span-2 { grid-column: span 2; }

.quick-edit-enter-active, .quick-edit-leave-active {
  transition: opacity 260ms cubic-bezier(0.16, 1, 0.3, 1), transform 320ms cubic-bezier(0.16, 1, 0.3, 1), filter 320ms;
}
.quick-edit-enter-from, .quick-edit-leave-to {
  opacity: 0; transform: translateY(-12px) scale(0.96); filter: blur(6px);
}

@media (max-width: 980px) {
  /* On narrow screens the two columns stack — release the height lock so
     the modal-body becomes the single scrolling container. */
  .gen-layout { grid-template-columns: 1fr; height: auto; max-height: none; }
  .gen-form { height: auto; max-height: 56vh; }
  .gen-preview { height: auto; min-height: 400px; }
  .form-grid { grid-template-columns: 1fr; }
  .form-grid .field.span-2 { grid-column: auto; }
}
@media (max-width: 560px) { .grid-2, .var-row { grid-template-columns: 1fr; } }

[data-theme="light"] .vq-title, [data-theme="light"] .tpl-name { color: #1a1410; }
[data-theme="light"] .preview { background: rgba(255,250,240,0.6); color: #44362a; }
[data-theme="light"] .ph-group { background: rgba(255,250,240,0.6); border-color: rgba(40,25,10,0.12); }
[data-theme="light"] .ph-group-name { color: #b45309; }
[data-theme="light"] .form-section { background: rgba(255,250,240,0.6); border-color: rgba(40,25,10,0.12); }
[data-theme="light"] .sec-head { color: #b45309; }
[data-theme="light"] .gen-preview { background: rgba(255,250,240,0.55); border-color: rgba(40,25,10,0.14); }
[data-theme="light"] .prev-head { border-bottom-color: rgba(40,25,10,0.12); }
[data-theme="light"] .prev-head span:first-of-type { color: #b45309; }
[data-theme="light"] .prev-meta { color: #6b5840; }
[data-theme="light"] .prev-empty { color: #6b5840; }
[data-theme="light"] .hint { color: #6b5840; }

/* Warm-tone scrollbar in light mode */
[data-theme="light"] .gen-form { scrollbar-color: #d97706 rgba(40,25,10,0.06); }
[data-theme="light"] .gen-form::-webkit-scrollbar-track { background: rgba(40,25,10,0.06); }
[data-theme="light"] .gen-form::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #d97706, #ea580c);
  background-clip: padding-box;
  box-shadow: 0 0 6px rgba(234, 88, 12, 0.35);
}
[data-theme="light"] .gen-form::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #b45309, #c2410c);
  background-clip: padding-box;
}

[data-theme="light"] .prev-edit-btn { background: rgba(217, 119, 6, 0.12); border-color: rgba(217, 119, 6, 0.40); color: #b45309; }
[data-theme="light"] .prev-edit-btn:hover { background: rgba(217, 119, 6, 0.20); box-shadow: 0 4px 14px -6px rgba(234, 88, 12, 0.6); }
[data-theme="light"] .prev-edit-btn.active { background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #1a1410; }

[data-theme="light"] .quick-edit-card {
  background: rgba(255, 250, 240, 0.92);
  border-color: rgba(217, 119, 6, 0.32);
  box-shadow:
    0 24px 60px -18px rgba(40, 25, 10, 0.32),
    0 0 0 1px rgba(217, 119, 6, 0.16),
    0 0 40px -8px rgba(234, 88, 12, 0.28);
}
[data-theme="light"] .qe-head { border-bottom-color: rgba(217, 119, 6, 0.22); color: #b45309; }
[data-theme="light"] .qe-hint { color: #6b5840; }
[data-theme="light"] .qe-close { background: rgba(40,25,10,0.05); border-color: rgba(40,25,10,0.12); color: #6b5840; }
[data-theme="light"] .qe-close:hover { background: rgba(220, 38, 38, 0.16); color: #b91c1c; }
[data-theme="light"] .qe-body { scrollbar-color: rgba(217, 119, 6, 0.4) transparent; }
</style>
