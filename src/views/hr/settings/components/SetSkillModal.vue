<template>
  <SetModal :open="open" :title="isEdit ? 'Edit skill' : 'New skill'"
    :subtitle="isEdit ? (form.name || 'Competency') : 'A competency in your learning catalog'"
    :icon="Layers" :accent-color="accent" :width="780"
    :mode="isEdit ? 'edit' : 'create'" aside-placement="side" @close="$emit('close')">

    <!-- FORM -->
    <div class="skm-form">
      <Motion as="div" class="skm-block" v-bind="fT(0)">
        <label class="skm-lab">Skill name <i>*</i></label>
        <HrInput v-model="form.name" placeholder="e.g. Python, Negotiation, ISO 27001…"
          :error="!!err.name" :error-text="err.name" />
      </Motion>

      <div class="skm-row">
        <Motion as="div" class="skm-block" v-bind="fT(1)">
          <label class="skm-lab">Code</label>
          <HrInput v-model="form.code" placeholder="Optional — e.g. SK-PY" />
        </Motion>
        <Motion as="div" class="skm-block" v-bind="fT(2)">
          <label class="skm-lab">Category <i>*</i></label>
          <SetSelect v-model="form.category" :options="categoryOptions" :accent-color="accent" placeholder="Pick a category" />
        </Motion>
      </div>

      <div class="skm-row">
        <Motion as="div" class="skm-block" v-bind="fT(3)">
          <label class="skm-lab">Scope</label>
          <SetSelect v-model="form.department_id" :options="deptOptions" :accent-color="accent" placeholder="Org-wide" />
        </Motion>
        <Motion as="div" class="skm-block" v-bind="fT(4)">
          <label class="skm-lab">Max proficiency level</label>
          <div class="skm-stepper">
            <button type="button" :disabled="form.max_level <= 2" @click="bump(-1)" aria-label="Decrease"><Minus :size="15" /></button>
            <div class="skm-stepper-val"><b>{{ form.max_level }}</b><span>levels</span></div>
            <button type="button" :disabled="form.max_level >= 10" @click="bump(1)" aria-label="Increase"><Plus :size="15" /></button>
          </div>
        </Motion>
      </div>

      <Motion as="div" class="skm-block" v-bind="fT(5)">
        <label class="skm-lab">Description</label>
        <HrTextarea v-model="form.description" :rows="2" placeholder="What does this competency cover? Helps assessors rate consistently." />
      </Motion>

      <Motion as="div" class="skm-block" v-bind="fT(6)">
        <label class="skm-lab">Status</label>
        <div class="skm-seg">
          <button type="button" :class="{ on: form.is_active }" @click="form.is_active = true"><CircleDot :size="13" /> Active</button>
          <button type="button" :class="{ on: !form.is_active }" @click="form.is_active = false"><Pause :size="13" /> Inactive</button>
        </div>
        <span class="skm-hint">Inactive skills stay on the matrix for history but drop out of new requirements & assessments.</span>
      </Motion>
    </div>

    <!-- LIVE PREVIEW -->
    <template #aside>
      <div class="skm-prev">
        <span class="skm-prev-eyebrow"><Sparkles :size="11" /> Live preview</span>
        <div class="skm-card" :class="{ off: !form.is_active }" :style="{ '--acc': accent }">
          <span class="skm-card-spine" aria-hidden="true" />
          <div class="skm-card-top">
            <span class="skm-card-ic"><component :is="cat.icon" :size="15" /></span>
            <div class="skm-card-titles">
              <b>{{ form.name || 'Untitled skill' }}</b>
              <span>{{ form.code || cat.label }}</span>
            </div>
            <span class="skm-card-led" :class="form.is_active ? 'on' : 'idle'" />
          </div>
          <div class="skm-card-rungs">
            <i v-for="n in form.max_level" :key="n" :style="{ '--h': (38 + (n / form.max_level) * 62) + '%' }" />
          </div>
          <div class="skm-card-chips">
            <span class="cat"><component :is="cat.icon" :size="10" />{{ cat.label }}</span>
            <span><component :is="deptName ? Building2 : Globe" :size="10" />{{ deptName || 'Org-wide' }}</span>
            <span>1–{{ form.max_level }}</span>
          </div>
          <span class="skm-card-stamp" :class="form.is_active ? 'ok' : 'idle'">{{ form.is_active ? 'ACTIVE' : 'INACTIVE' }}</span>
        </div>
        <p class="skm-note">
          <Info :size="12" />
          Skills power the matrix, gap analysis, and the requirements you pin to designations & grades.
        </p>
      </div>
    </template>

    <template #footer>
      <button class="set-btn set-btn-ghost" type="button" @click="$emit('close')">Cancel</button>
      <button class="set-btn set-btn-primary" type="button" :disabled="saving" @click="submit">
        <Loader2 v-if="saving" :size="14" class="set-spin" />
        <component v-else :is="isEdit ? Check : Plus" :size="14" />
        {{ isEdit ? 'Save changes' : 'Create skill' }}
      </button>
    </template>
  </SetModal>
</template>

<script setup>
import { reactive, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { Layers, Minus, Plus, Check, Loader2, Sparkles, CircleDot, Pause, Building2, Globe, Info } from 'lucide-vue-next'
import SetModal from './SetModal.vue'
import SetSelect from './SetSelect.vue'
import HrInput from '@/components/hr/forms/HrInput.vue'
import HrTextarea from '@/components/hr/forms/HrTextarea.vue'
import { prefersReduced } from '@/composables/useShiftMotion'
import { SKILL_CATEGORY_ORDER, SKILL_CATEGORY_META, skillCategoryMeta, toneColor } from '../composables/trainingVocab'

const props = defineProps({
  open: { type: Boolean, default: false },
  initial: { type: Object, default: null },
  departments: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'save'])

const isEdit = computed(() => !!props.initial)
const reduced = prefersReduced()
const fT = (i) => reduced ? {} : ({
  initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: 0.05 + i * 0.05, ease: [0.16, 1, 0.3, 1] },
})

const blank = () => ({ name: '', code: '', category: 'TECHNICAL', department_id: null, max_level: 5, description: '', is_active: true })
const form = reactive(blank())
const err = reactive({ name: '' })

const cat = computed(() => skillCategoryMeta(form.category))
const accent = computed(() => toneColor(cat.value.tone))

const categoryOptions = computed(() => SKILL_CATEGORY_ORDER.map(k => ({
  value: k, label: SKILL_CATEGORY_META[k].label, icon: SKILL_CATEGORY_META[k].icon, dot: toneColor(SKILL_CATEGORY_META[k].tone),
})))
const deptOptions = computed(() => [
  { value: null, label: 'Org-wide', icon: Globe },
  ...props.departments.map(d => ({ value: d.id, label: d.name, icon: Building2 })),
])
const deptName = computed(() => props.departments.find(d => String(d.id) === String(form.department_id))?.name || '')

const bump = (d) => { form.max_level = Math.max(2, Math.min(10, form.max_level + d)) }

const reset = () => {
  if (props.initial) {
    form.name = props.initial.name || ''
    form.code = props.initial.code || ''
    form.category = props.initial.category || 'TECHNICAL'
    form.department_id = props.initial.department_id ?? null
    form.max_level = Math.max(2, Math.min(10, props.initial.max_level || 5))
    form.description = props.initial.description || ''
    form.is_active = props.initial.is_active !== false
  } else {
    Object.assign(form, blank())
  }
  err.name = ''
}
watch(() => props.open, (v) => { if (v) reset() })

const submit = () => {
  err.name = form.name.trim() ? '' : 'Skill name is required'
  if (err.name) return
  emit('save', {
    name: form.name.trim(),
    code: form.code?.trim() || null,
    category: form.category,
    department_id: form.department_id || null,
    max_level: form.max_level,
    description: form.description?.trim() || null,
    is_active: form.is_active,
  })
}
</script>

<style scoped>
.skm-form { display: flex; flex-direction: column; gap: 15px; }
.skm-row { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
.skm-block { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.skm-lab { font-size: 11.5px; font-weight: 700; color: var(--set-text-secondary); }
.skm-lab i { color: var(--set-conflict); font-style: normal; }
.skm-hint { font-size: 10.5px; color: var(--set-text-dim); line-height: 1.45; }

.skm-stepper { display: flex; align-items: center; gap: 8px; height: 42px; padding: 0 6px; border-radius: 11px;
  background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); }
.skm-stepper button { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; flex-shrink: 0;
  color: var(--set-text-secondary); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.18s var(--set-spring); }
.skm-stepper button:hover:not(:disabled) { color: var(--acc); border-color: color-mix(in srgb, var(--acc) 40%, transparent); }
.skm-stepper button:disabled { opacity: 0.4; cursor: not-allowed; }
.skm-stepper-val { flex: 1; display: flex; align-items: baseline; justify-content: center; gap: 5px; }
.skm-stepper-val b { font-size: 17px; font-weight: 850; color: var(--set-text); font-variant-numeric: tabular-nums; }
.skm-stepper-val span { font-size: 10.5px; color: var(--set-text-muted); }

.skm-seg { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.skm-seg button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 42px; border-radius: 11px; cursor: pointer;
  font: inherit; font-size: 12.5px; font-weight: 700; color: var(--set-text-muted); background: var(--set-surface); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.skm-seg button.on { color: var(--acc); background: color-mix(in srgb, var(--acc) 14%, transparent); border-color: color-mix(in srgb, var(--acc) 38%, transparent); }

/* live preview */
.skm-prev { display: flex; flex-direction: column; gap: 13px; }
.skm-prev-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--set-text-muted); }
.skm-prev-eyebrow :deep(svg) { color: var(--acc); }
.skm-card { position: relative; overflow: hidden; padding: 14px 15px; border-radius: 15px; display: flex; flex-direction: column; gap: 11px;
  background: var(--set-surface); border: 1px solid var(--set-border-strong); }
.skm-card.off { opacity: 0.7; }
.skm-card-spine { position: absolute; left: 0; top: 12px; bottom: 12px; width: 3px; border-radius: 0 3px 3px 0; background: var(--acc); box-shadow: 0 0 12px color-mix(in srgb, var(--acc) 50%, transparent); }
.skm-card-top { display: flex; align-items: center; gap: 10px; }
.skm-card-ic { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0;
  color: var(--acc); background: color-mix(in srgb, var(--acc) 14%, transparent); border: 1px solid color-mix(in srgb, var(--acc) 28%, transparent); }
.skm-card-titles { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.skm-card-titles b { font-size: 13.5px; font-weight: 800; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.skm-card-titles span { font-size: 10px; color: var(--set-text-dim); font-family: var(--set-mono); }
.skm-card-led { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; background: var(--set-unset); }
.skm-card-led.on { background: var(--set-ok); box-shadow: 0 0 9px var(--set-ok); }
.skm-card-rungs { display: flex; align-items: flex-end; gap: 4px; height: 28px; }
.skm-card-rungs i { width: 7px; height: var(--h); border-radius: 2px; background: linear-gradient(180deg, var(--acc), color-mix(in srgb, var(--acc) 30%, transparent)); box-shadow: 0 0 6px color-mix(in srgb, var(--acc) 35%, transparent); }
.skm-card-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.skm-card-chips span { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 7px; font-size: 10px; font-weight: 650;
  color: var(--set-text-secondary); background: var(--set-surface-elevated); border: 1px solid var(--set-border); }
.skm-card-chips span :deep(svg) { color: var(--set-text-dim); }
.skm-card-chips span.cat { color: var(--acc); background: color-mix(in srgb, var(--acc) 10%, transparent); border-color: color-mix(in srgb, var(--acc) 22%, transparent); }
.skm-card-chips span.cat :deep(svg) { color: var(--acc); }
.skm-card-stamp { align-self: flex-start; padding: 3px 9px; border-radius: 999px; font-size: 9px; font-weight: 850; letter-spacing: 0.1em; }
.skm-card-stamp.ok { color: var(--set-ok); background: var(--set-ok-soft); }
.skm-card-stamp.idle { color: var(--set-text-muted); background: var(--set-unset-soft); }
.skm-note { display: flex; gap: 7px; margin: 0; font-size: 11px; line-height: 1.5; color: var(--set-text-muted); }
.skm-note :deep(svg) { color: var(--acc); flex-shrink: 0; margin-top: 1px; }

@media (max-width: 720px) { .skm-row { grid-template-columns: 1fr; } }
</style>
