<template>
  <Teleport to="body">
    <transition name="paym-fade">
      <div v-if="open" class="paym-overlay" @mousedown.self="$emit('close')">
        <Motion class="paym-modal build" as="div"
          :initial="{ opacity: 0, y: 28, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.5, ease: [0.16,1,0.3,1] }">
          <span class="paym-foil" />
          <button class="paym-x" @click="$emit('close')"><X :size="18" /></button>

          <header class="paym-hero">
            <div class="paym-coin"><span class="paym-coin-ring" /><Calculator :size="22" /></div>
            <div class="paym-hero-txt">
              <p class="paym-eyebrow">Salary · Component</p>
              <h2 class="paym-title">{{ isEdit ? 'Edit component' : 'New component' }}</h2>
              <p class="paym-sub">Define how this earning, deduction or statutory line is calculated and which wage bases it affects.</p>
            </div>
          </header>

          <div class="paym-body">
            <div v-if="isEdit && f.is_system" class="cmp-locked">
              <Lock :size="15" />
              <span><b>Core component.</b> Code, category &amp; calculation type are locked — the payroll engine and existing salary structures depend on them. You can still change the percent/amount, sequence and wage‑treatment flags below.</span>
            </div>

            <div class="paym-grid2">
              <label class="paym-field" :style="{'--i':0}"><span>Name <span class="paym-req">*</span></span>
                <input v-model="f.name" type="text" placeholder="House Rent Allowance" /></label>
              <label class="paym-field" :style="{'--i':1}"><span>Code <span class="paym-req">*</span><Lock v-if="isEdit && f.is_system" :size="11" class="cmp-lock-ic" /></span>
                <input v-model="f.code" :disabled="isEdit && f.is_system"
                  :title="isEdit && f.is_system ? 'Locked — a core component\'s code cannot change' : ''"
                  type="text" placeholder="HRA" @input="upCode" /></label>
            </div>

            <div class="paym-grid2">
              <label class="paym-field" :style="{'--i':2}"><span>Category<Lock v-if="isEdit && f.is_system" :size="11" class="cmp-lock-ic" /></span>
                <select v-model="f.component_type" :disabled="isEdit && f.is_system" @change="applyCategoryPreset"
                  :title="isEdit && f.is_system ? 'Locked — changing a core component\'s category would break the engine' : ''">
                  <option v-for="c in COMPONENT_CATEGORIES" :key="c.key" :value="c.key">{{ c.label }}</option>
                </select>
                <em v-if="CATEGORY_HINT[f.component_type]" class="paym-hint">{{ CATEGORY_HINT[f.component_type] }}</em></label>
              <label class="paym-field" :style="{'--i':3}"><span>Calculation<Lock v-if="isEdit && f.is_system" :size="11" class="cmp-lock-ic" /></span>
                <select v-model="f.calc_type" :disabled="isEdit && f.is_system"
                  :title="isEdit && f.is_system ? 'Locked — changing how a core component is calculated would break payroll' : ''">
                  <option v-for="c in CALC_TYPES" :key="c.key" :value="c.key">{{ c.label }}</option>
                </select></label>
            </div>

            <label v-if="f.calc_type === 'FLAT' || f.calc_type === 'ATTENDANCE_PRORATED'" class="paym-field" :style="{'--i':4}">
              <span>Flat amount (₹)</span><input v-model.number="f.flat_amount" type="number" min="0" /></label>

            <div v-if="f.calc_type === 'PERCENT_OF'" class="paym-grid2">
              <label class="paym-field" :style="{'--i':4}"><span>Percent (%)</span>
                <input v-model.number="f.percent_pct" type="number" min="0" step="0.5" /></label>
              <label class="paym-field" :style="{'--i':5}"><span>Of base</span>
                <input v-model="f.percent_of_code" type="text" placeholder="BASIC" /></label>
            </div>

            <label v-if="f.calc_type === 'FORMULA'" class="paym-field" :style="{'--i':4}">
              <span>Formula</span><input v-model="f.formula" class="mono" type="text" placeholder="min(0.40 * BASIC, 200000)" />
              <em class="paym-hint">Tokens: BASIC, GROSS, CTC, PAID_DAYS, WORKING_DAYS, LOP_DAYS · funcs min/max/round/abs</em></label>

            <label v-if="f.calc_type === 'STATUTORY'" class="paym-field" :style="{'--i':4}">
              <span>Statutory kind</span>
              <select v-model="f.statutory_kind">
                <option v-for="k in STATUTORY_KINDS" :key="k" :value="k">{{ k.replace(/_/g,' ') }}</option>
              </select></label>

            <label class="paym-field" :style="{'--i':6}"><span>Sequence (order)</span>
              <input v-model.number="f.sequence" type="number" /></label>

            <span class="cmp-flabel">Wage treatment</span>
            <div class="paym-toggles">
              <label v-for="(t, ti) in TOGGLES" :key="t.key" class="paym-tg" :style="{'--i': 7 + ti}">
                <input type="checkbox" v-model="f[t.key]" /> <span>{{ t.label }}</span>
              </label>
            </div>

            <!-- live "how it's treated" preview (mirrors the payroll engine) -->
            <div class="cmp-treat">
              <span class="ct-lead">In a pay run →</span>
              <span class="ct-pill" :class="treatment.target.cls">{{ treatment.target.label }}</span>
              <span class="ct-pill" :class="treatment.taxable ? 'tx' : 'ntx'">{{ treatment.taxable ? 'Taxable' : 'Tax-free' }}</span>
              <span v-if="treatment.prorate" class="ct-pill mut">Pro-rated on LOP</span>
            </div>

            <!-- active status -->
            <label class="cmp-status" :class="{ off: !f.is_active }">
              <span class="cs-meta"><b>{{ f.is_active ? 'Active' : 'Inactive' }}</b>
                <small>{{ f.is_active ? 'Available to add to structures & pay runs' : 'Hidden from new structures & runs' }}</small></span>
              <button type="button" class="cs-switch" :class="{ on: f.is_active }" role="switch" :aria-checked="f.is_active"
                @click="f.is_active = !f.is_active"><span /></button>
            </label>

            <div v-if="!calcValid" class="paym-note warn"><AlertTriangle :size="15" /><span>{{ calcHint }}</span></div>
            <div v-else class="paym-note"><Info :size="15" /><span>Sequence sets the calculation order. <b>Part of gross</b> lines roll into gross pay before statutory deductions.</span></div>
          </div>

          <footer class="paym-foot">
            <button class="paym-btn ghost" @click="$emit('close')">Cancel</button>
            <button class="paym-btn primary" :disabled="saving || !canSave" @click="save">
              {{ saving ? 'Saving…' : (isEdit ? 'Save changes' : 'Create component') }}</button>
          </footer>
        </Motion>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { Motion } from 'motion-v'
import { X, Calculator, Info, AlertTriangle, Lock } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { COMPONENT_CATEGORIES, CALC_TYPES, STATUTORY_KINDS, createComponent, updateComponent } from '@/composables/usePayroll'

const props = defineProps({ open: Boolean, component: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved'])
const toast = useToast()

const TOGGLES = [
  { key: 'is_taxable', label: 'Taxable' }, { key: 'is_part_of_gross', label: 'Part of gross' },
  { key: 'affects_pf_wage', label: 'Affects PF wage' }, { key: 'affects_esi_wage', label: 'Affects ESI wage' },
  { key: 'prorate_on_lop', label: 'Prorate on LOP' }, { key: 'is_employer_cost', label: 'Employer cost' },
]

// Corporate-correct defaults per category — mirrors how the payroll engine
// classifies each head so a new component behaves right out of the box.
//  • EARNING            → taxable, part of gross, pro-rated on LOP
//  • REIMBURSEMENT      → paid on top of gross, NOT taxable, NOT in gross/statutory base
//  • DEDUCTION          → reduces net, never in gross
//  • STATUTORY_DEDUCTION→ delegated to the statutory engine (PF/ESI/PT/TDS…)
//  • EMPLOYER_CONTRIBUTION → adds to CTC only, never to net pay
const CATEGORY_PRESETS = {
  EARNING:               { calc_type: 'PERCENT_OF', is_taxable: true,  is_part_of_gross: true,  affects_pf_wage: false, affects_esi_wage: false, prorate_on_lop: true,  is_employer_cost: false },
  REIMBURSEMENT:         { calc_type: 'FLAT',       is_taxable: false, is_part_of_gross: false, affects_pf_wage: false, affects_esi_wage: false, prorate_on_lop: false, is_employer_cost: false },
  DEDUCTION:             { calc_type: 'FLAT',       is_taxable: false, is_part_of_gross: false, affects_pf_wage: false, affects_esi_wage: false, prorate_on_lop: false, is_employer_cost: false },
  STATUTORY_DEDUCTION:   { calc_type: 'STATUTORY',  is_taxable: false, is_part_of_gross: false, affects_pf_wage: false, affects_esi_wage: false, prorate_on_lop: false, is_employer_cost: false, statutory_kind: 'PF_EMPLOYEE' },
  EMPLOYER_CONTRIBUTION: { calc_type: 'STATUTORY',  is_taxable: false, is_part_of_gross: false, affects_pf_wage: false, affects_esi_wage: false, prorate_on_lop: false, is_employer_cost: true,  statutory_kind: 'PF_EMPLOYER' },
}

const CATEGORY_HINT = {
  EARNING: 'A pay head that builds gross salary (Basic, HRA, allowances).',
  REIMBURSEMENT: 'Paid against bills — added to net but kept out of gross & statutory wage bases. Usually non-taxable.',
  DEDUCTION: 'A voluntary/recovery deduction from net pay (advance, loan EMI, fines).',
  STATUTORY_DEDUCTION: 'Compliance deduction computed by the statutory engine (PF, ESI, PT, TDS).',
  EMPLOYER_CONTRIBUTION: "Employer's share — adds to cost-to-company but never to take-home pay.",
}

const blank = () => ({
  name: '', code: '', component_type: 'EARNING', calc_type: 'FLAT', statutory_kind: null,
  formula: '', percent_pct: 0, percent_of_code: 'BASIC', flat_amount: 0, sequence: 100,
  is_taxable: true, is_part_of_gross: true, affects_pf_wage: false, affects_esi_wage: false,
  prorate_on_lop: true, is_employer_cost: false, is_system: false, is_active: true,
})
const f = ref(blank())
const saving = ref(false)
const isEdit = computed(() => !!props.component)
const upCode = () => { f.value.code = (f.value.code || '').toUpperCase().replace(/\s+/g, '_') }

// Applied only on a deliberate category change (not on load) so it never
// silently rewrites a head the admin is mid-editing.
const applyCategoryPreset = () => {
  const p = CATEGORY_PRESETS[f.value.component_type]
  if (p) Object.assign(f.value, p)
}

// Calc-type inputs must be complete before the head can be saved.
const calcValid = computed(() => {
  switch (f.value.calc_type) {
    case 'PERCENT_OF': return Number(f.value.percent_pct) > 0 && !!(f.value.percent_of_code || '').trim()
    case 'FORMULA': return !!(f.value.formula || '').trim()
    case 'STATUTORY': return !!f.value.statutory_kind
    case 'FLAT':
    case 'ATTENDANCE_PRORATED': return f.value.flat_amount != null && Number(f.value.flat_amount) >= 0
    default: return true
  }
})
const canSave = computed(() => !!(f.value.name || '').trim() && !!(f.value.code || '').trim() && calcValid.value)
const calcHint = computed(() => ({
  PERCENT_OF: 'Enter a percentage greater than 0 and the base code (e.g. BASIC).',
  FORMULA: 'Enter a formula expression.',
  STATUTORY: 'Pick the statutory kind this head computes.',
  FLAT: 'Enter a flat amount (0 or more).',
  ATTENDANCE_PRORATED: 'Enter the full-month amount (0 or more).',
}[f.value.calc_type] || 'Complete the calculation inputs to continue.'))

// Live "how it will be treated" preview — same rules the engine applies.
const treatment = computed(() => {
  const t = f.value
  const isEarn = ['EARNING', 'REIMBURSEMENT'].includes(t.component_type)
  const isEmpr = t.is_employer_cost || t.component_type === 'EMPLOYER_CONTRIBUTION'
  const isDed = ['DEDUCTION', 'STATUTORY_DEDUCTION'].includes(t.component_type)
  let target
  if (isEmpr) target = { label: 'Employer cost · adds to CTC, not net', cls: 'employer' }
  else if (isDed) target = { label: 'Deducted from net pay', cls: 'deduction' }
  else if (isEarn && t.is_part_of_gross) target = { label: 'Adds to gross & net pay', cls: 'earning' }
  else if (isEarn) target = { label: 'Paid on top · net only, off gross', cls: 'earning' }
  else target = { label: '—', cls: '' }
  return { target, taxable: !!t.is_taxable, prorate: !!t.prorate_on_lop, gross: isEarn && !!t.is_part_of_gross }
})

watch(() => props.open, (o) => {
  if (!o) return
  if (props.component) {
    const c = props.component
    f.value = { ...blank(), ...c, percent_pct: c.percent_value != null ? Number(c.percent_value) * 100 : 0 }
  } else f.value = blank()
})

const save = async () => {
  saving.value = true
  try {
    const body = {
      name: f.value.name, component_type: f.value.component_type, calc_type: f.value.calc_type,
      statutory_kind: f.value.calc_type === 'STATUTORY' ? f.value.statutory_kind : null,
      formula: f.value.calc_type === 'FORMULA' ? f.value.formula : null,
      percent_value: f.value.calc_type === 'PERCENT_OF' ? Number(f.value.percent_pct) / 100 : null,
      percent_of_code: f.value.calc_type === 'PERCENT_OF' ? f.value.percent_of_code : null,
      flat_amount: ['FLAT', 'ATTENDANCE_PRORATED'].includes(f.value.calc_type) ? f.value.flat_amount : null,
      sequence: f.value.sequence, is_taxable: f.value.is_taxable, is_part_of_gross: f.value.is_part_of_gross,
      affects_pf_wage: f.value.affects_pf_wage, affects_esi_wage: f.value.affects_esi_wage,
      prorate_on_lop: f.value.prorate_on_lop, is_employer_cost: f.value.is_employer_cost,
      is_active: f.value.is_active,
    }
    if (isEdit.value) await updateComponent(props.component.id, body)
    else await createComponent({ ...body, code: f.value.code })
    toast.success(isEdit.value ? 'Component updated' : 'Component created')
    emit('saved'); emit('close')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Save failed') }
  finally { saving.value = false }
}
</script>

<style scoped>
/* Modal-specific: monospace styling for the formula input only. */
.paym-field input.mono { font-family: var(--pay-mono); }

.cmp-flabel { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--pay-text-muted); margin: 4px 0 -4px; }

/* core-component locked banner + per-field lock glyph */
.cmp-locked { display: flex; gap: 9px; align-items: flex-start; padding: 11px 13px; border-radius: 12px;
  background: rgba(184,134,11,0.10); border: 1px solid var(--pay-border);
  font-size: 12px; line-height: 1.5; color: var(--pay-text-2); }
.cmp-locked svg { color: var(--pay-treasury); flex-shrink: 0; margin-top: 1px; }
.cmp-locked b { color: var(--pay-text); font-weight: 700; }
.cmp-lock-ic { color: var(--pay-treasury); opacity: 0.85; margin-left: 4px; vertical-align: -1px; }
.paym-field input:disabled, .paym-field select:disabled { cursor: not-allowed; }
[data-theme="light"] .cmp-locked { background: rgba(245,158,11,0.12); }

/* live treatment preview */
.cmp-treat { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
.ct-lead { font-family: var(--pay-mono); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--pay-text-muted); }
.ct-pill { font-size: 11px; font-weight: 700; padding: 4px 11px; border-radius: 999px;
  border: 1px solid var(--pay-border-soft); background: var(--pay-surface); color: var(--pay-text-2); }
.ct-pill.earning { color: var(--pay-net); background: var(--pay-net-soft); border-color: rgba(52,211,153,0.3); }
.ct-pill.deduction { color: var(--pay-deduction); background: var(--pay-deduction-soft); border-color: rgba(194,65,12,0.3); }
.ct-pill.employer { color: var(--pay-treasury); background: rgba(184,134,11,0.14); border-color: rgba(184,134,11,0.3); }
.ct-pill.tx { color: var(--pay-deduction); background: var(--pay-deduction-soft); }
.ct-pill.ntx { color: var(--pay-net); background: var(--pay-net-soft); }
.ct-pill.mut { color: var(--pay-text-muted); }

/* active status switch */
.cmp-status { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-top: 4px;
  padding: 11px 14px; border-radius: 13px; border: 1px solid var(--pay-border-soft); background: var(--pay-surface);
  transition: border-color 0.25s, opacity 0.25s; cursor: pointer; }
.cmp-status.off { opacity: 0.7; }
.cs-meta { display: flex; flex-direction: column; line-height: 1.2; }
.cs-meta b { font-size: 13px; color: var(--pay-text); }
.cs-meta small { font-size: 11px; color: var(--pay-text-muted); }
.cs-switch { position: relative; width: 42px; height: 24px; flex-shrink: 0; border-radius: 999px; cursor: pointer;
  border: 1px solid var(--pay-border-soft); background: var(--pay-surface-2); transition: background 0.25s, border-color 0.25s; }
.cs-switch.on { background: var(--pay-net-soft); border-color: rgba(52,211,153,0.45); }
.cs-switch span { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%;
  background: var(--pay-text-muted); transition: transform 0.28s var(--pay-spring), background 0.25s; }
.cs-switch.on span { transform: translateX(18px); background: var(--pay-net); }

.paym-note.warn { color: var(--pay-deduction); }
[data-theme="light"] .ct-pill { background: rgba(255,250,240,0.85); }
[data-theme="light"] .cmp-status,
[data-theme="light"] .cs-switch { background: rgba(255,250,240,0.85); }
</style>
