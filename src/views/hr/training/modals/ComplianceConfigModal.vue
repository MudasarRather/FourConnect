<template>
  <TrnModal :open="open" wide :title="config ? 'Edit compliance rule' : 'New compliance rule'"
    subtitle="A recurring mandate — keeps an eligible cohort certified on cadence." :icon="ShieldCheck" @close="$emit('close')">

    <div class="cf-stack">
      <!-- ── program ── -->
      <Motion as="section" class="cf-block"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.04, ease: [0.16, 1, 0.3, 1] }">
        <h4 class="cf-h"><BookOpen :size="13" /> Program</h4>
        <div v-if="config" class="cf-locked"><BookOpen :size="14" /> {{ lockedProgramName }}<span class="cf-locked-tag">locked</span></div>
        <template v-else>
          <TrnSelect v-if="programOptions.length" v-model="form.program_id" searchable
            search-placeholder="Search programs…" :options="programOptions" placeholder="Select a program…" />
          <div v-else class="cf-noprog">
            <Sparkles :size="14" />
            <span>Every program already has a rule, or none exist yet. Add a program first.</span>
            <button class="cf-noprog-cta" @click="goPrograms">Go to programs</button>
          </div>
        </template>
      </Motion>

      <!-- ── cadence ── -->
      <Motion as="section" class="cf-block"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }">
        <h4 class="cf-h"><Repeat :size="13" /> Cadence</h4>
        <div class="cf-freqs">
          <Motion v-for="(f, i) in COMPLIANCE_FREQUENCIES" :key="f" as="button" type="button" class="cf-freq" :class="{ on: form.frequency === f }"
            :initial="{ opacity: 0, scale: 0.92 }" :animate="{ opacity: 1, scale: 1 }" :transition="{ duration: 0.3, delay: 0.14 + i * 0.04, ease: [0.16, 1, 0.3, 1] }"
            :whileTap="{ scale: 0.95 }" @click="form.frequency = f">
            <span class="cf-freq-dot" />
            <span class="cf-freq-name">{{ freqLabel(f) }}</span>
            <span class="cf-freq-sub">{{ freqDesc(f) }}</span>
          </Motion>
        </div>
        <div class="cf-nums">
          <TrnField v-model.number="form.validity_months" label="Validity (months)" type="number" placeholder="e.g. 12" />
          <TrnField v-model.number="form.grace_period_days" label="Grace period (days)" type="number" placeholder="e.g. 15" />
          <TrnField v-model.number="form.due_days_after_assign" label="Due after assign (days)" type="number" placeholder="e.g. 30" />
        </div>
        <div class="cf-switches">
          <button type="button" class="cf-switch" :class="{ on: form.auto_reassign }" @click="form.auto_reassign = !form.auto_reassign">
            <span class="cf-switch-knob" />
            <span class="cf-switch-body"><b><Zap :size="12" /> Auto re-assign when due</b><i>Re-enrols lapsed employees automatically each cycle.</i></span>
          </button>
          <button v-if="config" type="button" class="cf-switch" :class="{ on: form.is_active }" @click="form.is_active = !form.is_active">
            <span class="cf-switch-knob" />
            <span class="cf-switch-body"><b><Power :size="12" /> Rule active</b><i>Paused rules stop all tracking and sweeps.</i></span>
          </button>
        </div>
      </Motion>

      <!-- ── eligibility ── -->
      <Motion as="section" class="cf-block"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.16, ease: [0.16, 1, 0.3, 1] }">
        <div class="cf-elig-top">
          <h4 class="cf-h"><Users :size="13" /> Eligibility</h4>
          <span class="cf-cohort" :class="{ all: !totalScoped }">{{ totalScoped ? `${totalScoped} filter${totalScoped === 1 ? '' : 's'}` : 'Whole organisation' }}</span>
        </div>
        <p class="cf-elig-sub">Narrow the cohort by any combination below. Leave everything empty to mandate it org-wide.</p>

        <div v-for="dim in scopeDims" :key="dim.key" class="cf-dim">
          <div class="cf-dim-head">
            <span class="cf-dim-label">{{ dim.label }}</span>
            <span v-if="scope[dim.key].length" class="cf-dim-n trn-mono">{{ scope[dim.key].length }}</span>
          </div>
          <div v-if="dim.items.length" class="cf-chip-grid">
            <button v-for="it in dim.items" :key="it.id" type="button" class="cf-chip" :class="{ on: scope[dim.key].includes(it.id) }" @click="toggleScope(dim.key, it.id)">
              <span class="cf-chip-tick"><Check :size="11" /></span>{{ it.name }}
            </button>
          </div>
          <div v-else class="cf-dim-empty">No {{ dim.label.toLowerCase() }} configured.</div>
        </div>
      </Motion>
    </div>

    <template #footer>
      <button class="trn-btn trn-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" class="trn-btn trn-btn-primary" :disabled="!canSave || saving" :whileTap="{ scale: 0.97 }" @click="save">
        <Loader v-if="saving" :size="14" class="spin" /><Check v-else :size="15" />
        {{ config ? 'Save changes' : 'Create rule' }}
      </Motion>
    </template>
  </TrnModal>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import { ShieldCheck, Loader, Check, BookOpen, Repeat, Zap, Power, Users, Sparkles } from 'lucide-vue-next'
import TrnModal from '../components/TrnModal.vue'
import TrnField from '../components/TrnField.vue'
import TrnSelect from '../components/TrnSelect.vue'
import { createCompliance, patchCompliance, COMPLIANCE_FREQUENCIES } from '@/composables/useTraining'
import { useHrReference } from '@/composables/useEmployees'

const props = defineProps({
  open: { type: Boolean, default: false },
  config: { type: Object, default: null },
  programs: { type: Array, default: () => [] },
  usedProgramIds: { type: Array, default: () => [] },
})
const emit = defineEmits(['close', 'saved', 'go'])
const toast = useToast()
const saving = ref(false)

const { reference, loadReferenceData } = useHrReference()

const FREQ_LABELS = {
  ONE_TIME: 'One-time', MONTHLY: 'Monthly', QUARTERLY: 'Quarterly',
  HALF_YEARLY: 'Half-yearly', ANNUAL: 'Annual', BIENNIAL: 'Biennial',
}
const FREQ_DESC = {
  ONE_TIME: 'once, ever', MONTHLY: 'every month', QUARTERLY: 'every 3 months',
  HALF_YEARLY: 'every 6 months', ANNUAL: 'every year', BIENNIAL: 'every 2 years',
}
const freqLabel = (f) => FREQ_LABELS[f] || f
const freqDesc = (f) => FREQ_DESC[f] || ''

const usedSet = computed(() => new Set((props.usedProgramIds || []).map(String)))
const programOptions = computed(() => (props.programs || [])
  .filter(p => !usedSet.value.has(String(p.id)))
  .map(p => ({ value: p.id, label: p.name })))
const lockedProgramName = computed(() => {
  if (!props.config) return ''
  if (props.config.program_name) return props.config.program_name
  return (props.programs || []).find(p => p.id === props.config.program_id)?.name || '—'
})

const scope = reactive({ dept: [], desig: [], grade: [] })
const scopeDims = computed(() => [
  { key: 'dept', label: 'Departments', items: reference.departments || [] },
  { key: 'desig', label: 'Designations', items: reference.designations || [] },
  { key: 'grade', label: 'Grades', items: reference.grades || [] },
])
const toggleScope = (dim, id) => {
  const arr = scope[dim]
  const i = arr.indexOf(id)
  if (i === -1) arr.push(id); else arr.splice(i, 1)
}
const goPrograms = () => { emit('close'); emit('go', 'programs') }
const totalScoped = computed(() => scope.dept.length + scope.desig.length + scope.grade.length)

const blank = () => ({
  program_id: '', frequency: 'ANNUAL', validity_months: null,
  grace_period_days: null, due_days_after_assign: 30, auto_reassign: true, is_active: true,
})
const form = ref(blank())

const canSave = computed(() => !!(props.config || form.value.program_id))

watch(() => props.open, (o) => {
  if (!o) return
  loadReferenceData()
  scope.dept = []; scope.desig = []; scope.grade = []
  if (props.config) {
    const c = props.config
    form.value = {
      program_id: c.program_id || '',
      frequency: c.frequency || 'ANNUAL',
      validity_months: c.validity_months ?? null,
      grace_period_days: c.grace_period_days ?? null,
      due_days_after_assign: c.due_days_after_assign ?? 30,
      auto_reassign: c.auto_reassign !== false,
      is_active: c.is_active !== false,
    }
    const a = c.applies_to || {}
    scope.dept = Array.isArray(a.department_ids) ? [...a.department_ids] : []
    scope.desig = Array.isArray(a.designation_ids) ? [...a.designation_ids] : []
    scope.grade = Array.isArray(a.grade_ids) ? [...a.grade_ids] : []
  } else {
    form.value = blank()
  }
})

const buildAppliesTo = () => {
  const out = {}
  if (scope.dept.length) out.department_ids = [...scope.dept]
  if (scope.desig.length) out.designation_ids = [...scope.desig]
  if (scope.grade.length) out.grade_ids = [...scope.grade]
  return Object.keys(out).length ? out : null
}

const save = async () => {
  if (!canSave.value) return
  saving.value = true
  try {
    const payload = {
      frequency: form.value.frequency,
      validity_months: form.value.validity_months,
      grace_period_days: form.value.grace_period_days,
      due_days_after_assign: form.value.due_days_after_assign,
      auto_reassign: form.value.auto_reassign,
      applies_to: buildAppliesTo(),
    }
    if (props.config) {
      payload.is_active = form.value.is_active
      await patchCompliance(props.config.id, payload)
    } else {
      payload.program_id = form.value.program_id
      await createCompliance(payload)
    }
    toast.success(props.config ? 'Compliance rule updated' : 'Compliance rule created')
    emit('saved')
    emit('close')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not save compliance rule')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.cf-stack { display: flex; flex-direction: column; gap: 16px; }
.cf-block { display: flex; flex-direction: column; gap: 11px; }
.cf-h { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 11px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: var(--trn-amber-strong); }
.spin { animation: trn-orbit-spin 0.9s linear infinite; }

.cf-locked { display: flex; align-items: center; gap: 9px; font-size: 13.5px; font-weight: 600; color: var(--trn-text);
  padding: 11px 13px; border-radius: 12px; background: var(--trn-surface); border: 1px dashed var(--trn-border-strong); }
.cf-locked :deep(svg) { color: var(--trn-amber); flex-shrink: 0; }
.cf-locked-tag { margin-left: auto; font-family: var(--trn-mono); font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--trn-text-dim); }
.cf-noprog { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; padding: 12px 14px; border-radius: 12px;
  background: var(--trn-surface); border: 1px dashed color-mix(in srgb, var(--trn-amber) 38%, var(--trn-border-strong)); font-size: 12px; color: var(--trn-text-muted); }
.cf-noprog :deep(svg) { color: var(--trn-amber-strong); }
.cf-noprog-cta { margin-left: auto; font: inherit; font-size: 12px; font-weight: 600; color: var(--trn-amber-strong); background: transparent; border: 0; cursor: pointer; }

/* cadence */
.cf-freqs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }
.cf-freq { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 11px 13px; border-radius: 13px; cursor: pointer;
  text-align: left; font: inherit; border: 1px solid var(--trn-border-soft); background: var(--trn-surface); transition: border-color 0.2s, background 0.2s; }
.cf-freq:hover { border-color: color-mix(in srgb, var(--trn-amber) 34%, transparent); }
.cf-freq.on { border-color: color-mix(in srgb, var(--trn-amber) 55%, transparent); background: color-mix(in srgb, var(--trn-amber) 11%, transparent); box-shadow: 0 0 18px -8px var(--trn-amber); }
.cf-freq-dot { position: absolute; top: 12px; right: 12px; width: 8px; height: 8px; border-radius: 50%; border: 1.5px solid var(--trn-border-strong); transition: all 0.2s; }
.cf-freq.on .cf-freq-dot { border-color: var(--trn-amber); background: var(--trn-amber); box-shadow: 0 0 8px var(--trn-amber); }
.cf-freq-name { font-size: 13px; font-weight: 700; color: var(--trn-text); }
.cf-freq.on .cf-freq-name { color: var(--trn-amber-strong); }
.cf-freq-sub { font-size: 10.5px; color: var(--trn-text-dim); }

.cf-nums { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.cf-switches { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.cf-switch { display: flex; align-items: flex-start; gap: 11px; padding: 12px 13px; border-radius: 13px; cursor: pointer; text-align: left; font: inherit;
  border: 1px solid var(--trn-border-soft); background: var(--trn-surface); transition: border-color 0.2s; }
.cf-switch:hover { border-color: var(--trn-border-strong); }
.cf-switch.on { border-color: color-mix(in srgb, var(--trn-amber) 42%, transparent); background: color-mix(in srgb, var(--trn-amber) 8%, transparent); }
.cf-switch-knob { position: relative; flex-shrink: 0; width: 38px; height: 22px; border-radius: 999px; background: var(--trn-surface-elevated); border: 1px solid var(--trn-border-strong); transition: background 0.25s, border-color 0.25s; margin-top: 2px; }
.cf-switch-knob::after { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: var(--trn-text-muted); transition: transform 0.25s var(--trn-spring), background 0.25s; }
.cf-switch.on .cf-switch-knob { background: color-mix(in srgb, var(--trn-amber) 30%, transparent); border-color: var(--trn-amber); }
.cf-switch.on .cf-switch-knob::after { transform: translateX(16px); background: var(--trn-amber-bright); }
.cf-switch-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.cf-switch-body b { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 700; color: var(--trn-text); }
.cf-switch-body b :deep(svg) { color: var(--trn-amber-strong); }
.cf-switch-body i { font-style: normal; font-size: 10.5px; line-height: 1.45; color: var(--trn-text-dim); }

/* eligibility */
.cf-elig-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.cf-cohort { font-family: var(--trn-mono); font-size: 10.5px; font-weight: 700; padding: 3px 10px; border-radius: 999px;
  color: var(--trn-amber-strong); background: color-mix(in srgb, var(--trn-amber) 13%, transparent); border: 1px solid color-mix(in srgb, var(--trn-amber) 28%, transparent); }
.cf-cohort.all { color: var(--trn-st-completed); background: var(--trn-st-completed-soft); border-color: color-mix(in srgb, var(--trn-st-completed) 26%, transparent); }
.cf-elig-sub { margin: -4px 0 4px; font-size: 11px; color: var(--trn-text-dim); line-height: 1.5; }
.cf-dim { display: flex; flex-direction: column; gap: 7px; padding: 12px 13px; border-radius: 13px; background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.cf-dim-head { display: flex; align-items: center; gap: 8px; }
.cf-dim-label { font-size: 11.5px; font-weight: 600; color: var(--trn-text-secondary); }
.cf-dim-n { font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 999px; color: var(--trn-amber); background: color-mix(in srgb, var(--trn-amber) 16%, transparent); }
.cf-chip-grid { display: flex; flex-wrap: wrap; gap: 7px; max-height: 132px; overflow-y: auto; }
.cf-chip { display: inline-flex; align-items: center; gap: 0; font: inherit; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 999px; cursor: pointer;
  color: var(--trn-text-muted); background: var(--trn-surface-elevated); border: 1px solid var(--trn-border-soft); transition: color 0.2s, background 0.2s, border-color 0.2s; }
.cf-chip:hover { color: var(--trn-text); border-color: var(--trn-border-strong); }
.cf-chip.on { color: var(--trn-amber-strong); background: color-mix(in srgb, var(--trn-amber) 13%, transparent); border-color: color-mix(in srgb, var(--trn-amber) 38%, transparent); }
.cf-chip-tick { display: inline-grid; place-items: center; width: 0; height: 13px; overflow: hidden; opacity: 0; transition: width 0.22s var(--trn-spring), opacity 0.2s, margin 0.22s; }
.cf-chip.on .cf-chip-tick { width: 13px; opacity: 1; margin-right: 5px; }
.cf-dim-empty { font-size: 11.5px; color: var(--trn-text-dim); }

@media (max-width: 600px) {
  .cf-freqs, .cf-nums { grid-template-columns: 1fr 1fr; }
  .cf-switches { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) { .cf-switch-knob::after { transition: none; } }
</style>
