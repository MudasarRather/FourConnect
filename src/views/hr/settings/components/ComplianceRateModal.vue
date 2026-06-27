<template>
  <SetModal :open="open" :title="editTarget ? 'Edit statutory rate' : 'New statutory rate'"
    subtitle="Pay & Statutory · Compliance" :icon="ShieldCheck" accent-color="var(--set-ok)" :width="940"
    aside-placement="side" :mode="editTarget ? 'edit' : 'create'" @close="$emit('close')">
    <div class="crm">
      <!-- live statute-plate preview -->
      <Motion as="div" class="crm-pv" :data-ready="canSave" :style="{ '--c': hex }"
        :initial="{ opacity: 0, y: 12, scale: 0.98 }" :animate="{ opacity: 1, y: 0, scale: 1 }" :transition="{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }">
        <span class="crm-pv-grid" aria-hidden="true" />
        <span class="crm-pv-spine" aria-hidden="true" />
        <span class="crm-pv-seal"><component :is="familyIcon" :size="17" /></span>
        <div class="crm-pv-id">
          <span class="crm-pv-eyebrow">{{ cat ? familyLabel : 'Statutory rate' }}</span>
          <b>{{ cat ? cat.label : (form.key || '— select a key —') }}</b>
          <span class="crm-pv-scope set-mono">{{ form.state_code ? form.state_code : 'National' }} · FY {{ form.fiscal_year || '—' }}</span>
        </div>
        <div class="crm-pv-right">
          <span class="crm-pv-stamp" :data-ready="canSave">{{ canSave ? 'Ready' : 'Draft' }}</span>
          <span class="crm-pv-val">{{ previewValue }}</span>
          <span class="crm-pv-engine"><Plug :size="10" /> Engine-read</span>
        </div>
      </Motion>

      <div class="crm-form">
        <!-- key -->
        <div class="crm-field">
          <span class="crm-lab">Statutory key<i>*</i></span>
          <HrSelect v-if="!editTarget" v-model="form.key" :options="keyOpts" placeholder="Select what the engine reads" />
          <div v-else class="crm-key-locked set-mono"><Lock :size="11" /> {{ form.key }}</div>
          <span v-if="cat" class="crm-hint">{{ cat.hint || `${kind} value the payroll engine reads for ${familyLabel}.` }}</span>
        </div>

        <!-- scope -->
        <div class="crm-grid2">
          <div class="crm-field">
            <span class="crm-lab">Financial year<i>*</i></span>
            <HrInput v-if="!editTarget" v-model="form.fiscal_year" mono placeholder="2026-27" />
            <div v-else class="crm-ro set-mono">{{ form.fiscal_year }}</div>
          </div>
          <div class="crm-field">
            <span class="crm-lab">State code <i class="opt">{{ scopeRequired ? 'PT is state-scoped' : 'optional · national' }}</i></span>
            <HrInput v-if="!editTarget" v-model="form.state_code" mono :placeholder="scopeRequired ? 'e.g. KA' : '(national)'" />
            <div v-else class="crm-ro set-mono">{{ form.state_code || 'National' }}</div>
          </div>
        </div>

        <!-- value (kind-aware) -->
        <div v-if="kind === 'rate' || kind === 'money'" class="crm-field">
          <span class="crm-lab">{{ kind === 'rate' ? 'Rate' : 'Amount' }}<i>*</i></span>
          <div class="crm-num" :data-kind="kind">
            <span v-if="kind === 'money'" class="crm-num-affix">₹</span>
            <input type="number" inputmode="decimal" v-model="form.num" :placeholder="kind === 'rate' ? 'e.g. 12' : 'e.g. 15000'" />
            <span v-if="kind === 'rate'" class="crm-num-affix end">%</span>
          </div>
          <span v-if="kind === 'rate'" class="crm-hint">Shown as a percent; stored as the fraction the engine multiplies ({{ ((Number(form.num) || 0) / 100).toFixed(4) }}).</span>
        </div>

        <div v-else-if="kind === 'bool'" class="crm-field">
          <span class="crm-lab">{{ cat?.label || 'Toggle' }}</span>
          <button type="button" class="crm-switch" :class="{ on: form.bool }" @click="form.bool = !form.bool">
            <span class="crm-switch-knob" /><span class="crm-switch-lab">{{ form.bool ? 'On' : 'Off' }}</span>
          </button>
        </div>

        <!-- slab editor -->
        <div v-else-if="kind === 'slabs'" class="crm-field">
          <span class="crm-lab">{{ slabTitle }}<i>*</i></span>
          <div class="crm-slabs">
            <div class="crm-slab-head">
              <span>{{ slabCols[0] }}</span><span>{{ slabCols[1] }}</span><span />
            </div>
            <div v-for="(s, i) in slabs" :key="i" class="crm-slab-row">
              <input type="number" inputmode="decimal" v-model="s.a" :placeholder="i === slabs.length - 1 && slabKind !== 'surcharge' ? '∞ (and above)' : '0'" />
              <div class="crm-num" :data-kind="slabValKind">
                <span v-if="slabValKind === 'money'" class="crm-num-affix">₹</span>
                <input type="number" inputmode="decimal" v-model="s.b" placeholder="0" />
                <span v-if="slabValKind === 'rate'" class="crm-num-affix end">%</span>
              </div>
              <button type="button" class="crm-slab-x" @click="slabs.splice(i, 1)" title="Remove"><X :size="13" /></button>
            </div>
            <button type="button" class="crm-slab-add" @click="slabs.push({ a: '', b: '' })"><Plus :size="13" /> Add slab</button>
          </div>
        </div>

        <!-- dates -->
        <div class="crm-grid2">
          <div class="crm-field">
            <span class="crm-lab">Effective from<i>*</i></span>
            <HrDatePicker v-if="!editTarget" v-model="form.effective_from" placeholder="dd / mm / yyyy" />
            <div v-else class="crm-ro">{{ form.effective_from || '—' }}</div>
          </div>
          <div v-if="editTarget" class="crm-field">
            <span class="crm-lab">Effective to <i class="opt">optional · retires the rate</i></span>
            <HrDatePicker v-model="form.effective_to" placeholder="dd / mm / yyyy" />
          </div>
        </div>

        <!-- status (edit only — create is always active) -->
        <div v-if="editTarget" class="crm-field">
          <span class="crm-lab">Status</span>
          <div class="crm-seg">
            <button type="button" class="crm-seg-btn" :class="{ on: form.is_active }" @click="form.is_active = true"><Power :size="13" /> Active</button>
            <button type="button" class="crm-seg-btn" :class="{ on: !form.is_active }" @click="form.is_active = false"><PowerOff :size="13" /> Off</button>
          </div>
        </div>

        <div class="crm-field">
          <span class="crm-lab">Description <i class="opt">optional</i></span>
          <HrInput v-model="form.description" placeholder="e.g. Union Budget 2025 revision" />
        </div>
      </div>
    </div>

    <template #aside>
      <SetWorkflowRail accent="var(--set-ok)" :icon="ShieldCheck" title="How the engine reads this"
        :summary="wfSummary" :steps="wfSteps" :affects="wfAffects" :actor="actor" :mode="editTarget ? 'edit' : 'create'"
        note="Rates are effective-dated. For each pay run the engine resolves the latest active rate in scope (state rows override national) and freezes it into the batch — back-dated edits never silently rewrite processed payslips." />
    </template>

    <template #footer>
      <button class="set-btn set-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="set-btn set-btn-primary" :class="{ disabled: !canSave || saving }"
        :whileHover="(!canSave || saving) ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" :disabled="!canSave || saving" @click="submit">
        <Loader v-if="saving" :size="14" class="set-spin" /><Check v-else :size="14" /> {{ editTarget ? 'Save rate' : 'Create rate' }}
      </Motion>
    </template>
  </SetModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { ShieldCheck, Check, Loader, Lock, Plus, X, Power, PowerOff, Plug,
  PiggyBank, HeartPulse, Landmark, Receipt, ShieldQuestion, CalendarRange, SlidersHorizontal, Wallet, Share2 } from 'lucide-vue-next'
import SetModal from './SetModal.vue'
import SetWorkflowRail from './SetWorkflowRail.vue'
import HrInput from '@/components/hr/forms/HrInput.vue'
import HrSelect from '@/components/hr/forms/HrSelect.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import { MODULES } from './connectivity'
import { useActor } from '../composables/useActor'
import { catalogFor, keyOptionsForSelect, FAMILY_HEX, familyMeta, uiToStorage, storageToUi } from './complianceCatalog'

const props = defineProps({
  open: { type: Boolean, default: false },
  editTarget: { type: Object, default: null },
  saving: { type: Boolean, default: false },
  defaultFy: { type: String, default: '' },
  prefillKey: { type: String, default: '' },
})
const emit = defineEmits(['close', 'save'])

const actor = useActor()
const ICONS = { pf: PiggyBank, esi: HeartPulse, pt: Landmark, tax: Receipt }
const keyOpts = keyOptionsForSelect()

const today = () => new Date().toISOString().slice(0, 10)
const blank = () => ({ key: '', fiscal_year: props.defaultFy, state_code: '', num: '', bool: true, effective_from: today(), effective_to: '', is_active: true, description: '' })
const form = ref(blank())
const slabs = ref([])

const cat = computed(() => catalogFor(form.value.key))
const kind = computed(() => cat.value?.kind || 'money')
const family = computed(() => cat.value?.family || null)
const hex = computed(() => FAMILY_HEX[family.value] || 'var(--set-ok)')
const familyIcon = computed(() => ICONS[family.value] || ShieldQuestion)
const familyLabel = computed(() => (family.value ? familyMeta(family.value).label : ''))
const scopeRequired = computed(() => cat.value?.scope === 'state')
const slabKind = computed(() => cat.value?.slabKind || 'tds')
const slabValKind = computed(() => (slabKind.value === 'pt' ? 'money' : 'rate'))
const slabTitle = computed(() => ({ tds: 'Tax slabs', pt: 'PT slabs', surcharge: 'Surcharge bands' }[slabKind.value] || 'Slabs'))
const slabCols = computed(() => ({
  tds: ['Up to (₹) · blank = & above', 'Rate'], pt: ['Up to (₹) · blank = & above', 'Amount'], surcharge: ['Over (₹)', 'Rate'],
}[slabKind.value] || ['Up to', 'Value']))

// seed value inputs whenever the key changes (create) or on open (edit)
function seedValue() {
  const c = cat.value
  if (!c) { form.value.num = ''; slabs.value = []; return }
  if (c.kind === 'rate' || c.kind === 'money') {
    if (props.editTarget) form.value.num = storageToUi(c.kind, props.editTarget.value_num)
    else form.value.num = c.kind === 'rate' ? +(c.def * 100).toFixed(4) : c.def
  } else if (c.kind === 'bool') {
    form.value.bool = props.editTarget ? Number(props.editTarget.value_num) !== 0 : !!c.def
  } else if (c.kind === 'slabs') {
    const src = props.editTarget?.value_json
    slabs.value = buildSlabRows(Array.isArray(src) ? src : defaultSlabs(c.slabKind), c.slabKind)
  }
}
function defaultSlabs(sk) {
  if (sk === 'pt') return [{ upto: 24999, amount: 0 }, { upto: null, amount: 200 }]
  if (sk === 'surcharge') return [{ over: 5000000, rate: 0.10 }, { over: 10000000, rate: 0.15 }]
  return [{ upto: 400000, rate: 0 }, { upto: 800000, rate: 0.05 }, { upto: null, rate: 0.30 }]
}
function buildSlabRows(arr, sk) {
  return arr.map((s) => {
    if (sk === 'pt') return { a: s.upto == null ? '' : s.upto, b: s.amount ?? '' }
    if (sk === 'surcharge') return { a: s.over ?? '', b: s.rate != null ? +(s.rate * 100).toFixed(4) : '' }
    return { a: s.upto == null ? '' : s.upto, b: s.rate != null ? +(s.rate * 100).toFixed(4) : '' }
  })
}
function slabsToJson() {
  const sk = slabKind.value
  return slabs.value.filter(r => r.a !== '' || r.b !== '' || sk !== 'surcharge').map((r) => {
    const aNum = r.a === '' || r.a == null ? null : Number(r.a)
    if (sk === 'pt') return { upto: aNum, amount: Number(r.b) || 0 }
    if (sk === 'surcharge') return { over: Number(r.a) || 0, rate: (Number(r.b) || 0) / 100 }
    return { upto: aNum, rate: (Number(r.b) || 0) / 100 }
  })
}

watch(() => props.open, (v) => {
  if (!v) return
  if (props.editTarget) {
    const t = props.editTarget
    form.value = {
      key: t.key, fiscal_year: t.fiscal_year, state_code: t.state_code || '',
      num: '', bool: true, effective_from: (t.effective_from || '').slice(0, 10),
      effective_to: (t.effective_to || '').slice(0, 10), is_active: t.is_active !== false, description: t.description || '',
    }
  } else {
    form.value = blank()
    if (props.prefillKey) form.value.key = props.prefillKey
  }
  seedValue()
}, { immediate: true })
watch(() => form.value.key, () => { if (!props.editTarget) seedValue() })

const previewValue = computed(() => {
  if (!cat.value) return '—'
  if (kind.value === 'slabs') return `${slabs.value.length} slab${slabs.value.length === 1 ? '' : 's'}`
  if (kind.value === 'bool') return form.value.bool ? 'On' : 'Off'
  if (form.value.num === '' || form.value.num == null) return '—'
  return kind.value === 'rate' ? `${form.value.num}%` : `₹${Number(form.value.num).toLocaleString('en-IN')}`
})

const canSave = computed(() => {
  if (!form.value.key || !form.value.fiscal_year || !form.value.effective_from) return false
  if (kind.value === 'slabs') return slabs.value.length > 0
  if (kind.value === 'bool') return true
  return form.value.num !== '' && form.value.num != null
})

const wfSummary = computed(() => `You are setting ${cat.value?.label || 'a statutory rate'} for FY ${form.value.fiscal_year || '—'}${form.value.state_code ? ` · ${form.value.state_code}` : ' · national'}.`)
const wfAffects = ['payroll', 'payslips'].map(s => MODULES[s]).filter(Boolean).map(m => ({ icon: m.icon, label: m.label }))
const wfSteps = [
  { icon: CalendarRange, title: 'Scope', text: 'Pin the rate to a financial year, optional state, and an effective date.' },
  { icon: SlidersHorizontal, title: 'Define', text: 'Single value (% or ₹) for scalars, or a slab table for PT / TDS / surcharge.' },
  { icon: Plug, title: 'Wire', text: 'The key matches exactly what load_config() reads — no silent mismatch.' },
  { icon: Wallet, title: 'Compute', text: 'It drives PF, ESI, PT and TDS on every affected payslip this year.' },
]

function submit() {
  if (!canSave.value || props.saving) return
  const k = kind.value
  const payload = {
    fiscal_year: form.value.fiscal_year, state_code: form.value.state_code || null, key: form.value.key,
    effective_from: form.value.effective_from, description: form.value.description || null,
    value_num: k === 'slabs' ? null : uiToStorage(k, k === 'bool' ? (form.value.bool ? 1 : 0) : form.value.num),
    value_json: k === 'slabs' ? slabsToJson() : null,
  }
  // PATCH-only fields (ignored on create by the schema)
  const patch = { value_num: payload.value_num, value_json: payload.value_json, description: payload.description,
    is_active: form.value.is_active, effective_to: form.value.effective_to || null }
  emit('save', { create: !props.editTarget, id: props.editTarget?.id, payload, patch })
}
</script>

<style scoped>
.crm { display: flex; flex-direction: column; gap: 16px; }

.crm-pv { position: relative; overflow: hidden; display: flex; align-items: center; gap: 12px; padding: 15px 16px; border-radius: 15px;
  background: var(--set-panel); border: 1px solid var(--set-border); transition: border-color 0.3s, box-shadow 0.3s; }
.crm-pv[data-ready="true"] { border-color: color-mix(in srgb, var(--c) 42%, transparent); box-shadow: 0 0 26px -10px color-mix(in srgb, var(--c) 60%, transparent); }
.crm-pv-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.5; background-image: linear-gradient(color-mix(in srgb, var(--c) 8%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--c) 8%, transparent) 1px, transparent 1px); background-size: 22px 22px; mask-image: radial-gradient(110% 100% at 100% 0%, #000 18%, transparent 78%); -webkit-mask-image: radial-gradient(110% 100% at 100% 0%, #000 18%, transparent 78%); }
.crm-pv-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: linear-gradient(180deg, var(--c), color-mix(in srgb, var(--c) 30%, transparent)); box-shadow: 0 0 14px -2px var(--c); }
.crm-pv-seal { position: relative; display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0; color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); border: 1px solid color-mix(in srgb, var(--c) 28%, transparent); }
.crm-pv-id { position: relative; flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.crm-pv-eyebrow { font-size: 8.5px; font-weight: 800; letter-spacing: 0.09em; text-transform: uppercase; color: color-mix(in srgb, var(--c) 62%, var(--set-text-dim)); }
.crm-pv-id b { font-size: 14.5px; font-weight: 850; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.crm-pv-scope { font-size: 10.5px; color: var(--set-text-muted); }
.crm-pv-right { position: relative; display: flex; flex-direction: column; align-items: flex-end; gap: 3px; flex-shrink: 0; }
.crm-pv-stamp { font-size: 9px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; padding: 3px 9px; border-radius: 999px; color: var(--set-unset); background: var(--set-unset-soft); }
.crm-pv-stamp[data-ready="true"] { color: var(--set-ok); background: var(--set-ok-soft); }
.crm-pv-val { font-size: 18px; font-weight: 850; color: var(--set-text); }
.crm-pv-engine { display: inline-flex; align-items: center; gap: 4px; font-size: 8.5px; font-weight: 750; color: var(--set-ok); }
.crm-pv-engine :deep(svg) { color: var(--set-ok); }

.crm-form { display: flex; flex-direction: column; gap: 13px; }
.crm-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.crm-field { display: flex; flex-direction: column; gap: 6px; }
.crm-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--set-text-dim); }
.crm-lab i { color: var(--set-conflict); font-style: normal; margin-left: 2px; }
.crm-lab i.opt { color: var(--set-text-dim); text-transform: none; letter-spacing: 0; font-weight: 600; }
.crm-hint { font-size: 10px; color: var(--set-text-dim); }
.crm-key-locked, .crm-ro { display: inline-flex; align-items: center; gap: 6px; padding: 9px 12px; border-radius: 10px; font-size: 13px; color: var(--set-text-secondary); background: var(--set-surface); border: 1px solid var(--set-border); }
.crm-key-locked :deep(svg), .crm-ro :deep(svg) { color: var(--set-text-dim); }

.crm-num { display: flex; align-items: center; gap: 0; border-radius: 10px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); overflow: hidden; transition: border-color 0.2s; }
.crm-num:focus-within { border-color: var(--set-ok); }
.crm-num input { flex: 1; min-width: 0; padding: 9px 11px; border: none; background: none; outline: none; font: inherit; font-size: 13px; color: var(--hr-input-text); }
.crm-num-affix { padding: 0 11px; font-size: 13px; font-weight: 700; color: var(--set-text-muted); }
.crm-num-affix.end { border-left: 1px solid var(--set-border); }

.crm-switch { display: inline-flex; align-items: center; gap: 10px; align-self: flex-start; padding: 6px 14px 6px 6px; border-radius: 999px; cursor: pointer; font: inherit; background: var(--set-surface); border: 1px solid var(--set-border); transition: all 0.2s; }
.crm-switch-knob { position: relative; width: 34px; height: 19px; border-radius: 999px; background: var(--set-unset-soft); flex-shrink: 0; transition: background 0.25s; }
.crm-switch-knob::after { content: ''; position: absolute; top: 2px; left: 2px; width: 13px; height: 13px; border-radius: 50%; background: var(--set-unset); transition: transform 0.25s var(--set-spring), background 0.25s; }
.crm-switch.on .crm-switch-knob { background: var(--set-ok-soft); } .crm-switch.on .crm-switch-knob::after { transform: translateX(15px); background: var(--set-ok); }
.crm-switch-lab { font-size: 12.5px; font-weight: 750; color: var(--set-text-muted); } .crm-switch.on .crm-switch-lab { color: var(--set-ok); }

.crm-slabs { display: flex; flex-direction: column; gap: 6px; padding: 11px; border-radius: 12px; background: var(--set-panel); border: 1px solid var(--set-border); }
.crm-slab-head, .crm-slab-row { display: grid; grid-template-columns: 1fr 1fr 30px; gap: 8px; align-items: center; }
.crm-slab-head { font-size: 9px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--set-text-dim); padding: 0 2px; }
.crm-slab-row > input { padding: 8px 10px; border-radius: 9px; font: inherit; font-size: 12.5px; color: var(--hr-input-text); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); }
.crm-slab-row > input:focus, .crm-slabs .crm-num input:focus { outline: none; }
.crm-slabs .crm-num { background: var(--hr-input-bg); }
.crm-slab-x { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; cursor: pointer; color: var(--set-text-muted); background: var(--set-surface); border: 1px solid var(--set-border); transition: all 0.2s; }
.crm-slab-x:hover { color: var(--set-conflict); border-color: color-mix(in srgb, var(--set-conflict) 36%, transparent); }
.crm-slab-add { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; margin-top: 2px; padding: 6px 12px; border-radius: 9px; cursor: pointer; font: inherit; font-size: 11.5px; font-weight: 700; color: var(--set-ok); background: var(--set-ok-soft); border: 1px solid color-mix(in srgb, var(--set-ok) 30%, transparent); transition: all 0.2s; }
.crm-slab-add:hover { background: color-mix(in srgb, var(--set-ok) 16%, transparent); }

.crm-seg { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.crm-seg-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 9px 6px; border-radius: 10px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 700; color: var(--set-text-muted); background: var(--set-surface); border: 1px solid var(--set-border); transition: all 0.2s; }
.crm-seg-btn.on { color: var(--set-ok); background: var(--set-ok-soft); border-color: color-mix(in srgb, var(--set-ok) 36%, transparent); }

@media (max-width: 560px) { .crm-grid2 { grid-template-columns: 1fr; } }
</style>
