// Per-domain configuration for the reusable MasterManager. Each entry declares
// the API base, the upsert-modal field schema, search keys, and presentation
// copy — so all master sections share one cinematic engine while staying themed.
//
// field types: text | number | textarea | select | segment
//   select.optionsFrom: 'self' | 'grades' | 'departments'  → resolved at runtime
//   from sibling reference lists loaded by MasterManager.
import { DOMAIN_BY_SLUG } from './connectivity'

const meta = (slug) => DOMAIN_BY_SLUG[slug] || {}

const ACTIVE_SEG = { key: 'is_active', label: 'Status', type: 'segment', default: true,
  options: [{ value: true, label: 'Active' }, { value: false, label: 'Inactive' }] }

export const MASTER_DOMAINS = {
  departments: {
    ...meta('departments'),
    base: 'departments', mode: 'rest', hasActive: false, noun: 'department', nounPlural: 'departments',
    searchKeys: ['name', 'code', 'cost_center'],
    fields: [
      { key: 'name', label: 'Department name', type: 'text', required: true, placeholder: 'e.g. Finance' },
      { key: 'code', label: 'Code', type: 'text', required: true, mono: true, placeholder: 'e.g. FIN' },
      { key: 'parent_department_id', label: 'Parent department', type: 'select', optionsFrom: 'self', placeholder: 'No parent (top level)' },
      { key: 'head_employee_id', label: 'Department head', type: 'select', optionsFrom: 'employees', placeholder: 'No head assigned' },
      { key: 'cost_center', label: 'Cost center', type: 'text', mono: true, placeholder: 'e.g. CC-1001' },
    ],
    preview: (f) => ({ title: f.name, code: f.code, sub: f.cost_center ? `CC ${f.cost_center}` : (f.parent_department_id ? 'Sub-department' : 'Top-level') }),
    emptyTitle: 'No departments yet',
    emptySub: 'Departments form the org tree and feed every employee record, attendance roster and payroll cost centre.',
  },

  designations: {
    ...meta('designations'),
    base: 'designations', mode: 'rest', hasActive: false, noun: 'designation', nounPlural: 'designations',
    searchKeys: ['name', 'code'],
    fields: [
      { key: 'name', label: 'Designation', type: 'text', required: true, placeholder: 'e.g. Senior Engineer' },
      { key: 'code', label: 'Code', type: 'text', required: true, mono: true, placeholder: 'e.g. SR-ENG' },
      { key: 'grade_id', label: 'Grade', type: 'select', optionsFrom: 'grades', placeholder: '(no grade)' },
      { key: 'department_id', label: 'Department', type: 'select', optionsFrom: 'departments', placeholder: '(any department)' },
      { key: 'reporting_to_designation_id', label: 'Reports to', type: 'select', optionsFrom: 'self', placeholder: '(none)' },
      { key: 'level', label: 'Hierarchy level', type: 'number', placeholder: 'e.g. 3', min: 0 },
    ],
    preview: (f) => ({ title: f.name, code: f.code, sub: f.level != null && f.level !== '' ? `Level ${f.level}` : 'Title' }),
    emptyTitle: 'No designations yet',
    emptySub: 'Titles classify roles, map to pay grades and drive reporting lines + recruitment requisitions.',
  },

  grades: {
    ...meta('grades'),
    base: 'grades', mode: 'rest', hasActive: false, noun: 'grade', nounPlural: 'grades',
    searchKeys: ['name', 'code', 'band'],
    fields: [
      { key: 'name', label: 'Grade name', type: 'text', required: true, placeholder: 'e.g. Grade 4' },
      { key: 'code', label: 'Code', type: 'text', required: true, mono: true, placeholder: 'e.g. G4' },
      { key: 'band', label: 'Band', type: 'text', placeholder: 'e.g. Management' },
      { key: 'level', label: 'Level', type: 'number', placeholder: 'e.g. 4', min: 0 },
      { key: 'default_pay_level', label: 'Default pay level', type: 'text', mono: true, placeholder: 'e.g. P4' },
      { key: 'min_ctc', label: 'Min CTC (annual ₹)', type: 'number', placeholder: 'e.g. 600000', min: 0 },
      { key: 'max_ctc', label: 'Max CTC (annual ₹)', type: 'number', placeholder: 'e.g. 1200000', min: 0 },
    ],
    preview: (f) => ({ title: f.name, code: f.code,
      sub: (f.min_ctc || f.max_ctc) ? `₹${f.min_ctc || 0}–${f.max_ctc || 0}` : (f.band || 'Pay band') }),
    emptyTitle: 'No grades yet',
    emptySub: 'Grades define salary ranges and unlock travel, DA and hotel eligibility across the org.',
  },

  'work-locations': {
    ...meta('work-locations'),
    base: 'locations', mode: 'rest', hasActive: false, noun: 'location', nounPlural: 'locations',
    searchKeys: ['name', 'code', 'city', 'state', 'country'],
    fields: [
      { key: 'name', label: 'Location name', type: 'text', required: true, placeholder: 'e.g. Head Office' },
      { key: 'code', label: 'Code', type: 'text', mono: true, placeholder: 'e.g. HO' },
      { key: 'type', label: 'Type', type: 'segment', default: 'HQ', options: [
        { value: 'HQ', label: 'HQ' }, { value: 'BRANCH', label: 'Branch' },
        { value: 'REMOTE', label: 'Remote' }, { value: 'CLIENT_SITE', label: 'Client Site' },
      ] },
      { key: 'city', label: 'City', type: 'text', placeholder: 'e.g. Bengaluru' },
      { key: 'state', label: 'State', type: 'text', placeholder: 'e.g. Karnataka' },
      { key: 'country', label: 'Country', type: 'text', placeholder: 'e.g. India' },
      { key: 'timezone', label: 'Timezone', type: 'text', mono: true, placeholder: 'e.g. Asia/Kolkata' },
      { key: 'address', label: 'Address', type: 'textarea', placeholder: 'Street address', full: true },
    ],
    preview: (f) => ({ title: f.name, code: f.code || f.type || 'HQ',
      sub: [f.city, f.state, f.country].filter(Boolean).join(', ') || 'Work location' }),
    emptyTitle: 'No work locations yet',
    emptySub: 'Locations anchor attendance geo-fences, shift calendars, timezones and travel destinations.',
  },

  'asset-categories': {
    ...meta('asset-categories'),
    base: 'asset-categories', mode: 'rest', hasActive: true, noun: 'category', nounPlural: 'categories',
    searchKeys: ['name', 'code'],
    fields: [
      { key: 'name', label: 'Category name', type: 'text', required: true, placeholder: 'e.g. Laptops' },
      { key: 'code', label: 'Code', type: 'text', required: true, mono: true, placeholder: 'e.g. LAP' },
      { key: 'parent_category_id', label: 'Parent category', type: 'select', optionsFrom: 'self', placeholder: 'No parent (top level)' },
      { key: 'useful_life_months', label: 'Useful life (months)', type: 'number', placeholder: 'e.g. 36', min: 0 },
      ACTIVE_SEG,
      { key: 'description', label: 'Description', type: 'textarea', placeholder: 'What belongs in this category?', full: true },
    ],
    preview: (f) => ({ title: f.name, code: f.code, sub: f.useful_life_months ? `${f.useful_life_months}mo useful life` : 'Asset class' }),
    emptyTitle: 'No asset categories yet',
    emptySub: 'Categories group assets and drive depreciation + useful-life across the fleet.',
    crossNote: { label: 'Open full taxonomy in Assets', to: '/admin/hr/assets/categories' },
  },

  // ── Configurable workforce-taxonomy masters (Phase B — real CRUD) ──────────
  'employment-types': {
    ...meta('employment-types'),
    base: 'settings/masters/employment-types', mode: 'rest', hasActive: true,
    noun: 'employment type', nounPlural: 'employment types', searchKeys: ['label', 'code'],
    fields: [
      { key: 'label', label: 'Label', type: 'text', required: true, placeholder: 'e.g. Full Time' },
      { key: 'code', label: 'Code', type: 'text', required: true, mono: true, placeholder: 'e.g. FULL_TIME' },
      ACTIVE_SEG,
      { key: 'description', label: 'Description', type: 'textarea', placeholder: 'When does this engagement model apply?', full: true },
    ],
    preview: (f) => ({ title: f.label, code: f.code, sub: f.is_active === false ? 'Inactive' : 'Engagement model' }),
    emptyTitle: 'No employment types', emptySub: 'Permanent, contract, intern — the engagement models employees can be hired under.',
    systemHint: 'Built-in types back live employee records — their code is locked and they can’t be deleted (deactivate instead).',
  },
  'employee-categories': {
    ...meta('employee-categories'),
    base: 'settings/masters/employee-categories', mode: 'rest', hasActive: true,
    noun: 'employee category', nounPlural: 'employee categories', searchKeys: ['label', 'code'],
    fields: [
      { key: 'label', label: 'Label', type: 'text', required: true, placeholder: 'e.g. Permanent' },
      { key: 'code', label: 'Code', type: 'text', required: true, mono: true, placeholder: 'e.g. PERMANENT' },
      ACTIVE_SEG,
      { key: 'description', label: 'Description', type: 'textarea', placeholder: 'How is this classification used?', full: true },
    ],
    preview: (f) => ({ title: f.label, code: f.code, sub: f.is_active === false ? 'Inactive' : 'Classification' }),
    emptyTitle: 'No employee categories', emptySub: 'Staff classifications that scope leave, payroll, travel and training rules.',
    systemHint: 'Built-in categories back live employee records — their code is locked and they can’t be deleted (deactivate instead).',
  },
  'separation-reasons': {
    ...meta('separation-reasons'),
    base: 'settings/masters/separation-reasons', mode: 'rest', hasActive: true,
    noun: 'separation reason', nounPlural: 'separation reasons', searchKeys: ['label', 'code', 'category'],
    fields: [
      { key: 'label', label: 'Label', type: 'text', required: true, placeholder: 'e.g. Better Opportunity' },
      { key: 'code', label: 'Code', type: 'text', required: true, mono: true, placeholder: 'e.g. BETTER_OPPORTUNITY' },
      { key: 'category', label: 'Vocabulary', type: 'segment', default: 'EXIT_REASON', options: [
        { value: 'EXIT_REASON', label: 'Exit reason' }, { value: 'RESIGNATION_TYPE', label: 'Resignation type' },
      ] },
      { key: 'is_voluntary', label: 'Nature', type: 'segment', default: true, options: [
        { value: true, label: 'Voluntary' }, { value: false, label: 'Involuntary' },
      ] },
      ACTIVE_SEG,
      { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Optional notes', full: true },
    ],
    preview: (f) => ({ title: f.label, code: f.code, sub: f.category === 'RESIGNATION_TYPE' ? 'Resignation type' : 'Exit reason' }),
    emptyTitle: 'No separation reasons', emptySub: 'The vocabulary of why people leave — consumed by Exit Management.',
    systemHint: 'Built-in reasons back live exit cases — their code is locked and they can’t be deleted (deactivate instead).',
  },
}

export const MASTER_SLUGS = Object.keys(MASTER_DOMAINS)
