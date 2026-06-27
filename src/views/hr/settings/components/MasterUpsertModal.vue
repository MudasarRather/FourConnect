<template>
  <SetModal :open="open" :title="editTarget ? `Edit ${domain.noun}` : `New ${domain.noun}`"
    :subtitle="domain.eyebrow" :icon="domain.icon" :accent-color="domain.accent"
    :width="placement === 'side' ? 920 : 660" :aside-placement="placement"
    :mode="editTarget ? 'edit' : 'create'" @close="$emit('close')">
    <div class="mf">
      <!-- live preview -->
      <Motion as="div" class="mf-pv" :data-ready="ready" :style="{ '--acc': domain.accent }"
        :initial="{ opacity: 0, y: 12, scale: 0.98 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
        :transition="{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }">
        <span class="mf-pv-grid" aria-hidden="true" />
        <span class="mf-pv-aura" aria-hidden="true" />
        <span class="mf-pv-spine" aria-hidden="true" />
        <span class="mf-pv-ic"><component :is="domain.icon" :size="18" /></span>
        <div class="mf-pv-id">
          <span class="mf-pv-eyebrow">{{ domain.eyebrow }}</span>
          <b>{{ pv.title || `— ${domain.noun} name —` }}</b>
          <span v-if="pv.code" class="set-mono mf-pv-code"><Hash :size="9" />{{ pv.code }}</span>
        </div>
        <div class="mf-pv-right">
          <span class="mf-pv-stamp" :data-ready="ready">{{ ready ? 'Ready' : 'Draft' }}</span>
          <span v-if="pv.sub" class="mf-pv-sub">{{ pv.sub }}</span>
        </div>
      </Motion>

      <!-- fields -->
      <div class="mf-grid">
        <Motion v-for="(f, i) in domain.fields" :key="f.key" as="div" class="mf-field"
          :class="{ full: f.full || f.type === 'textarea' }"
          :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.4, delay: 0.05 + i * 0.05, ease: [0.16, 1, 0.3, 1] }">
          <span class="mf-lab">{{ f.label }}<i v-if="f.required">*</i></span>

          <HrInput v-if="f.type === 'text' || f.type === 'number'" v-model="form[f.key]"
            :type="f.type" :mono="f.mono" :placeholder="f.placeholder"
            :inputmode="f.type === 'number' ? 'decimal' : undefined"
            :disabled="lockCode && f.key === 'code'" />
          <span v-if="lockCode && f.key === 'code'" class="mf-locknote"><Lock :size="10" /> Built-in code is locked</span>

          <HrDatePicker v-else-if="f.type === 'date'" v-model="form[f.key]"
            :placeholder="f.placeholder || 'dd / mm / yyyy'" :min="f.min || ''" :max="f.max || ''" />

          <HrSelect v-else-if="f.type === 'select'" v-model="form[f.key]"
            :options="optionsFor(f)" :placeholder="f.placeholder || '(none)'" />

          <div v-else-if="f.type === 'segment'" class="mf-seg">
            <button v-for="o in f.options" :key="String(o.value)" type="button" class="mf-seg-btn"
              :class="{ on: form[f.key] === o.value }" @click="form[f.key] = o.value">{{ o.label }}</button>
          </div>

          <textarea v-else-if="f.type === 'textarea'" v-model="form[f.key]" class="mf-textarea" rows="2"
            :placeholder="f.placeholder" />
        </Motion>
      </div>
    </div>

    <template #aside>
      <SetWorkflowRail :accent="domain.accent" :icon="domain.icon"
        :title="`The ${domain.noun} lifecycle`" :summary="summary" :steps="steps" :affects="affects"
        :note="lockCode ? domain.systemHint : ''" :actor="actor" :mode="editTarget ? 'edit' : 'create'"
        :orientation="placement === 'side' ? 'vertical' : 'horizontal'" />
    </template>

    <template #footer>
      <button class="set-btn set-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="set-btn set-btn-primary" :class="{ disabled: !ready || saving }"
        :whileHover="(!ready || saving) ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }"
        :disabled="!ready || saving" @click="submit">
        <Loader v-if="saving" :size="14" class="set-spin" /><Check v-else :size="14" />
        {{ editTarget ? 'Save changes' : `Create ${domain.noun}` }}
      </Motion>
    </template>
  </SetModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { Hash, Check, Loader, Lock, PencilLine, ShieldCheck, Database, Share2 } from 'lucide-vue-next'
import SetModal from './SetModal.vue'
import SetWorkflowRail from './SetWorkflowRail.vue'
import HrInput from '@/components/hr/forms/HrInput.vue'
import HrSelect from '@/components/hr/forms/HrSelect.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import { MODULES } from './connectivity'
import { useActor } from '../composables/useActor'

const props = defineProps({
  open: { type: Boolean, default: false },
  domain: { type: Object, required: true },
  editTarget: { type: Object, default: null },
  refData: { type: Object, default: () => ({}) },
  saving: { type: Boolean, default: false },
  lockCode: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'save'])

const actor = useActor()
const form = ref({})

const blank = () => {
  const o = {}
  for (const f of props.domain.fields) {
    if (f.type === 'segment') o[f.key] = f.default !== undefined ? f.default : (f.options?.[0]?.value ?? null)
    else if (f.type === 'number') o[f.key] = null
    else o[f.key] = ''
  }
  return o
}

watch(() => props.open, (v) => {
  if (!v) return
  if (props.editTarget) {
    const o = blank()
    for (const f of props.domain.fields) {
      const val = props.editTarget[f.key]
      o[f.key] = val === null || val === undefined ? o[f.key] : val
    }
    form.value = o
  } else {
    form.value = blank()
  }
}, { immediate: true })

const optionsFor = (f) => {
  let list = []
  if (f.optionsFrom === 'self') {
    list = (props.refData.self || [])
      .filter(r => !props.editTarget || r.id !== props.editTarget.id)
      .map(r => ({ value: r.id, label: r.name }))
  } else if (f.optionsFrom === 'grades') {
    list = (props.refData.grades || []).map(r => ({ value: r.id, label: `${r.name}${r.code ? ` · ${r.code}` : ''}` }))
  } else if (f.optionsFrom === 'departments') {
    list = (props.refData.departments || []).map(r => ({ value: r.id, label: r.name }))
  } else if (f.optionsFrom === 'employees') {
    list = (props.refData.employees || []).map(r => ({ value: String(r.id), label: r.name || r.full_name || r.employee_id || 'Employee' }))
  } else if (f.options) {
    list = f.options
  }
  if (!f.required) list = [{ value: '', label: f.placeholder || '(none)' }, ...list]
  return list
}

const requiredFields = computed(() => props.domain.fields.filter(f => f.required))
const ready = computed(() => requiredFields.value.every(f => {
  const v = form.value[f.key]
  return v !== null && v !== undefined && String(v).trim() !== ''
}))
const pv = computed(() => {
  try { return props.domain.preview ? props.domain.preview(form.value) : { title: form.value.name, code: form.value.code } }
  catch { return { title: form.value.name, code: form.value.code } }
})

// ── workflow rail content ──────────────────────────────────────────────────
// Decide rail placement by estimated form HEIGHT, not raw field count: paired
// text inputs share a row, so a 6-field form can still be short. Only forms
// tall enough to balance the rail keep it on the side; shorter forms move it to
// a full-width horizontal strip at the bottom (no empty column next to a tall rail).
const placement = computed(() => {
  let rows = 0, pair = 0
  for (const f of (props.domain.fields || [])) {
    const full = f.type === 'textarea' || f.full
    if (full) { if (pair) { rows += 1; pair = 0 } rows += f.type === 'textarea' ? 1.6 : 1 }
    else { pair += 1; if (pair === 2) { rows += 1; pair = 0 } }
  }
  if (pair) rows += 1
  return rows >= 5 ? 'side' : 'bottom'
})
const affects = computed(() => (props.domain.governs || [])
  .map(s => MODULES[s]).filter(Boolean).map(m => ({ icon: m.icon, label: m.label })))
const affectsLabels = computed(() => affects.value.map(a => a.label).join(', '))
const summary = computed(() => props.domain.blurb || props.domain.emptySub || `A reusable ${props.domain.noun} master used across HR.`)

const steps = computed(() => {
  const noun = props.domain.noun
  const label = props.domain.label || `${noun} registry`
  const reach = affects.value.length ? affectsLabels.value : 'every HR module that references it'
  if (props.editTarget) {
    return [
      { icon: PencilLine, title: 'Adjust', text: `Update the fields below — existing records keep pointing to this ${noun}.` },
      { icon: ShieldCheck, title: 'Validate', text: 'Required fields and code uniqueness are re-checked before the change is committed.' },
      { icon: Database, title: 'Update', text: `The ${label} entry is rewritten in place and the change is sealed into the audit ledger.` },
      { icon: Share2, title: 'Reflect', text: `Dropdowns and reports across ${reach} show the new values live — no re-save needed downstream.` },
    ]
  }
  return [
    { icon: PencilLine, title: 'Define', text: `Name the ${noun} and give it a short, unique code that other modules will reference.` },
    { icon: ShieldCheck, title: 'Validate', text: 'Required fields are enforced and the code is checked for duplicates at the API boundary.' },
    { icon: Database, title: 'Register', text: `It joins the ${label} and the creation is written to the immutable audit ledger.` },
    { icon: Share2, title: 'Propagate', text: `It becomes instantly selectable across ${reach}.` },
  ]
})

const submit = () => { if (ready.value && !props.saving) emit('save', { ...form.value }) }
</script>

<style scoped>
.mf { display: flex; flex-direction: column; gap: 16px; }

.mf-pv { position: relative; overflow: hidden; display: flex; align-items: center; gap: 12px; padding: 15px 16px;
  border-radius: 15px; background: var(--set-panel); border: 1px solid var(--set-border); transition: border-color 0.3s, box-shadow 0.3s; }
.mf-pv[data-ready="true"] { border-color: color-mix(in srgb, var(--acc) 40%, transparent); box-shadow: 0 0 26px -10px color-mix(in srgb, var(--acc) 60%, transparent); }
.mf-pv-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(color-mix(in srgb, var(--acc) 7%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--acc) 7%, transparent) 1px, transparent 1px);
  background-size: 22px 22px; mask-image: radial-gradient(110% 100% at 100% 0%, #000 18%, transparent 78%); -webkit-mask-image: radial-gradient(110% 100% at 100% 0%, #000 18%, transparent 78%); }
.mf-pv-aura { position: absolute; inset: -50% 30% auto -10%; height: 80%; background: radial-gradient(circle, color-mix(in srgb, var(--acc) 22%, transparent), transparent 70%); filter: blur(22px); pointer-events: none; }
.mf-pv-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: linear-gradient(180deg, var(--acc), color-mix(in srgb, var(--acc) 30%, transparent)); box-shadow: 0 0 14px -2px var(--acc); }
.mf-pv-ic { position: relative; display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0; color: var(--acc);
  background: color-mix(in srgb, var(--acc) 13%, transparent); border: 1px solid color-mix(in srgb, var(--acc) 28%, transparent); }
.mf-pv-id { position: relative; flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.mf-pv-eyebrow { font-size: 8.5px; font-weight: 800; letter-spacing: 0.09em; text-transform: uppercase; color: color-mix(in srgb, var(--acc) 60%, var(--set-text-dim)); }
.mf-pv-id b { font-size: 15px; font-weight: 850; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mf-pv-code { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; color: var(--set-text-muted); }
.mf-pv-right { position: relative; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
.mf-pv-stamp { font-size: 9px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; padding: 3px 9px; border-radius: 999px;
  color: var(--set-unset); background: var(--set-unset-soft); border: 1px solid var(--set-border); }
.mf-pv-stamp[data-ready="true"] { color: var(--set-ok); background: var(--set-ok-soft); border-color: color-mix(in srgb, var(--set-ok) 36%, transparent); }
.mf-pv-sub { font-size: 11px; color: var(--set-text-muted); max-width: 18ch; text-align: right; }

.mf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
@media (max-width: 520px) { .mf-grid { grid-template-columns: 1fr; } }
.mf-field { display: flex; flex-direction: column; gap: 6px; }
.mf-field.full { grid-column: 1 / -1; }
.mf-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--set-text-dim); }
.mf-lab i { color: var(--set-conflict); font-style: normal; margin-left: 2px; }
.mf-locknote { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; color: var(--set-text-dim); }
.mf-locknote :deep(svg) { color: var(--set-text-dim); }

.mf-seg { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 7px; }
.mf-seg-btn { padding: 9px 6px; border-radius: 10px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 700;
  color: var(--set-text-muted); background: var(--set-surface); border: 1px solid var(--set-border); transition: all 0.2s; }
.mf-seg-btn.on { color: var(--set-gold); background: color-mix(in srgb, var(--set-gold) 12%, transparent); border-color: color-mix(in srgb, var(--set-gold) 36%, transparent); }

.mf-textarea { width: 100%; resize: vertical; min-height: 64px; padding: 10px 12px; border-radius: 10px; font: inherit; font-size: 13px;
  color: var(--hr-input-text); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); transition: border-color 0.2s, background 0.2s; }
.mf-textarea:focus { outline: none; background: var(--hr-input-bg-focus); border-color: var(--hr-input-border-focus); }
.mf-textarea::placeholder { color: var(--hr-input-placeholder); }
</style>
