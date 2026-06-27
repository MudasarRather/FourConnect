<template>
  <SetModal :open="open" :title="isEdit ? 'Edit checklist template' : 'New checklist template'"
    :subtitle="isEdit ? (form.task_name || 'Onboarding task blueprint') : 'Stamped onto every new hire'"
    :icon="ListChecks" accent-color="var(--set-amber)" :width="760"
    :mode="isEdit ? 'edit' : 'create'" aside-placement="side" @close="$emit('close')">

    <div class="ct-form">
      <Motion as="div" class="ct-block" v-bind="fT(0)">
        <label class="ct-lab">Task name <i>*</i></label>
        <HrInput v-model="form.task_name" placeholder="e.g. Issue laptop & peripherals" :error="!!err.name" :error-text="err.name" />
      </Motion>

      <Motion as="div" class="ct-block" v-bind="fT(1)">
        <label class="ct-lab">Ownership lane</label>
        <div class="ct-cats">
          <button v-for="c in CHECKLIST_CATEGORIES" :key="c.value" type="button" class="ct-cat"
            :class="{ on: form.category === c.value }" :style="{ '--c': toneColor(c.tone) }" @click="form.category = c.value">
            <component :is="c.icon" :size="14" /> {{ c.label }}
          </button>
        </div>
      </Motion>

      <Motion as="div" class="ct-block" v-bind="fT(2)">
        <label class="ct-lab">Description</label>
        <HrTextarea v-model="form.description" :rows="2" placeholder="What needs to happen, and any context the assignee needs." />
      </Motion>

      <div class="ct-row">
        <Motion as="div" class="ct-block" v-bind="fT(3)">
          <label class="ct-lab">Due date</label>
          <div class="ct-stepper">
            <button type="button" @click="bump(-1)" aria-label="Earlier"><Minus :size="14" /></button>
            <span class="ct-stepper-val">{{ offsetLabel }}</span>
            <button type="button" @click="bump(1)" aria-label="Later"><Plus :size="14" /></button>
          </div>
          <span class="ct-hint">Relative to the joining date</span>
        </Motion>
        <Motion as="div" class="ct-block" v-bind="fT(4)">
          <label class="ct-lab">Owner role</label>
          <SetSelect v-model="form.default_assignee_role" :options="ASSIGNEE_ROLE_SUGGESTIONS"
            placeholder="Unassigned" accent-color="var(--set-amber)" />
        </Motion>
      </div>

      <Motion as="div" class="ct-toggles" v-bind="fT(5)">
        <button type="button" class="ct-toggle" :class="{ on: form.is_mandatory }" @click="form.is_mandatory = !form.is_mandatory">
          <span class="ct-toggle-sw" /><span class="ct-toggle-txt"><b>Mandatory</b><i>Must complete before joining</i></span>
        </button>
        <button type="button" class="ct-toggle" :class="{ on: form.is_active }" @click="form.is_active = !form.is_active">
          <span class="ct-toggle-sw" /><span class="ct-toggle-txt"><b>Active</b><i>Seeds new joiners</i></span>
        </button>
      </Motion>
    </div>

    <template #aside>
      <div class="ct-prev">
        <span class="ct-prev-eyebrow"><Sparkles :size="11" /> Live preview</span>
        <div class="ct-card" :class="{ off: !form.is_active }" :style="{ '--c': cat.color }">
          <span class="ct-card-spine" aria-hidden="true" />
          <div class="ct-card-head">
            <span class="ct-card-cat"><component :is="cat.icon" :size="12" />{{ cat.label }}</span>
            <span class="ct-card-led" :class="form.is_active ? 'on' : 'idle'" />
          </div>
          <b class="ct-card-title">{{ form.task_name || 'Untitled task' }}</b>
          <p v-if="form.description" class="ct-card-desc">{{ form.description }}</p>
          <div class="ct-card-meta">
            <span :class="{ must: form.is_mandatory }">{{ form.is_mandatory ? 'Mandatory' : 'Optional' }}</span>
            <span>{{ offsetLabel }}</span>
            <span v-if="form.default_assignee_role">{{ form.default_assignee_role }}</span>
          </div>
        </div>
        <p class="ct-note"><Info :size="12" /> Every new hire's checklist is stamped from the active templates the moment their record is created.</p>
      </div>
    </template>

    <template #footer>
      <button class="set-btn set-btn-ghost" type="button" @click="$emit('close')">Cancel</button>
      <button class="set-btn set-btn-primary" type="button" :disabled="saving" @click="submit">
        <Loader2 v-if="saving" :size="14" class="set-spin" />
        <component v-else :is="isEdit ? Check : Plus" :size="14" />
        {{ isEdit ? 'Save changes' : 'Create template' }}
      </button>
    </template>
  </SetModal>
</template>

<script setup>
import { reactive, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { ListChecks, Sparkles, Info, Plus, Minus, Check, Loader2 } from 'lucide-vue-next'
import SetModal from './SetModal.vue'
import SetSelect from './SetSelect.vue'
import HrInput from '@/components/hr/forms/HrInput.vue'
import HrTextarea from '@/components/hr/forms/HrTextarea.vue'
import { prefersReduced } from '@/composables/useShiftMotion'
import { CHECKLIST_CATEGORIES, ASSIGNEE_ROLE_SUGGESTIONS, toneColor, categoryMeta } from '../composables/onboardingVocab'

const props = defineProps({
  open: { type: Boolean, default: false },
  initial: { type: Object, default: null },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'save'])

const isEdit = computed(() => !!props.initial)
const reduced = prefersReduced()
const fT = (i) => reduced ? {} : ({
  initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: 0.05 + i * 0.06, ease: [0.16, 1, 0.3, 1] },
})

const blank = () => ({ task_name: '', category: 'HR', description: '', default_assignee_role: '', default_due_offset_days: 0, is_mandatory: true, is_active: true })
const form = reactive(blank())
const err = reactive({ name: '' })

const cat = computed(() => categoryMeta(form.category))
const offsetLabel = computed(() => {
  const d = form.default_due_offset_days
  if (d === 0) return 'Join day'
  return d > 0 ? `Join + ${d}d` : `Join − ${Math.abs(d)}d`
})
const bump = (dir) => { form.default_due_offset_days = Math.max(-30, Math.min(120, form.default_due_offset_days + dir)) }

const reset = () => {
  Object.assign(form, blank())
  if (props.initial) {
    form.task_name = props.initial.task_name || ''
    form.category = props.initial.category || 'HR'
    form.description = props.initial.description || ''
    form.default_assignee_role = props.initial.default_assignee_role || ''
    form.default_due_offset_days = props.initial.default_due_offset_days ?? 0
    form.is_mandatory = props.initial.is_mandatory !== false
    form.is_active = props.initial.is_active !== false
  }
  err.name = ''
}
watch(() => props.open, (v) => { if (v) reset() })

const submit = () => {
  err.name = form.task_name.trim() ? '' : 'Task name is required'
  if (err.name) return
  emit('save', {
    task_name: form.task_name.trim(),
    category: form.category,
    description: form.description?.trim() || null,
    default_assignee_role: form.default_assignee_role || null,
    default_due_offset_days: form.default_due_offset_days,
    is_mandatory: form.is_mandatory,
    is_active: form.is_active,
  })
}
</script>

<style scoped>
.ct-form { display: flex; flex-direction: column; gap: 15px; }
.ct-row { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
.ct-block { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.ct-lab { font-size: 11.5px; font-weight: 700; color: var(--set-text-secondary); }
.ct-lab i { color: var(--set-conflict); font-style: normal; }
.ct-hint { font-size: 10.5px; color: var(--set-text-dim); }

.ct-cats { display: flex; flex-wrap: wrap; gap: 7px; }
.ct-cat { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 10px; cursor: pointer; font: inherit;
  font-size: 12px; font-weight: 700; color: var(--set-text-muted); background: var(--set-surface); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.ct-cat:hover { color: var(--set-text-secondary); }
.ct-cat.on { color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border-color: color-mix(in srgb, var(--c) 38%, transparent); }
.ct-cat.on :deep(svg) { color: var(--c); }

.ct-stepper { display: flex; align-items: center; justify-content: space-between; height: 42px; padding: 0 6px; border-radius: 11px;
  background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); }
.ct-stepper button { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; cursor: pointer;
  color: var(--set-amber); background: color-mix(in srgb, var(--set-amber) 12%, transparent); border: 1px solid color-mix(in srgb, var(--set-amber) 26%, transparent); transition: all 0.18s; }
.ct-stepper button:hover { background: color-mix(in srgb, var(--set-amber) 22%, transparent); }
.ct-stepper-val { font-size: 12.5px; font-weight: 800; color: var(--set-text); font-variant-numeric: tabular-nums; }

.ct-toggles { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; }
.ct-toggle { display: flex; align-items: center; gap: 11px; padding: 11px 13px; border-radius: 12px; cursor: pointer; text-align: left;
  background: var(--set-surface); border: 1px solid var(--set-border); transition: all 0.22s var(--set-spring); }
.ct-toggle.on { border-color: color-mix(in srgb, var(--set-amber) 36%, transparent); background: color-mix(in srgb, var(--set-amber) 8%, transparent); }
.ct-toggle-sw { position: relative; width: 34px; height: 19px; border-radius: 999px; flex-shrink: 0; background: var(--set-unset-soft); border: 1px solid var(--set-border-strong); transition: all 0.25s var(--set-spring); }
.ct-toggle-sw::after { content: ''; position: absolute; top: 1.5px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background: var(--set-text-muted); transition: all 0.25s var(--set-spring); }
.ct-toggle.on .ct-toggle-sw { background: color-mix(in srgb, var(--set-amber) 30%, transparent); border-color: color-mix(in srgb, var(--set-amber) 50%, transparent); }
.ct-toggle.on .ct-toggle-sw::after { left: 16px; background: var(--set-amber); box-shadow: 0 0 8px color-mix(in srgb, var(--set-amber) 60%, transparent); }
.ct-toggle-txt { display: flex; flex-direction: column; gap: 1px; }
.ct-toggle-txt b { font-size: 12.5px; font-weight: 750; color: var(--set-text); }
.ct-toggle-txt i { font-size: 10px; font-style: normal; color: var(--set-text-muted); }

/* preview */
.ct-prev { display: flex; flex-direction: column; gap: 13px; }
.ct-prev-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--set-text-muted); }
.ct-prev-eyebrow :deep(svg) { color: var(--set-amber); }
.ct-card { position: relative; overflow: hidden; padding: 14px 15px; border-radius: 15px; background: var(--set-surface); border: 1px solid var(--set-border-strong); display: flex; flex-direction: column; gap: 8px; }
.ct-card.off { opacity: 0.7; }
.ct-card-spine { position: absolute; left: 0; top: 12px; bottom: 12px; width: 3px; border-radius: 0 3px 3px 0; background: var(--c); box-shadow: 0 0 12px color-mix(in srgb, var(--c) 50%, transparent); }
.ct-card-head { display: flex; align-items: center; justify-content: space-between; }
.ct-card-cat { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 7px; font-size: 10px; font-weight: 750; color: var(--c); background: color-mix(in srgb, var(--c) 12%, transparent); border: 1px solid color-mix(in srgb, var(--c) 24%, transparent); }
.ct-card-led { width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
.ct-card-led.idle { background: var(--set-unset); }
.ct-card-title { font-size: 13.5px; font-weight: 800; color: var(--set-text); line-height: 1.3; }
.ct-card-desc { margin: 0; font-size: 11px; line-height: 1.45; color: var(--set-text-muted); }
.ct-card-meta { display: flex; flex-wrap: wrap; gap: 6px; }
.ct-card-meta span { padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 650; color: var(--set-text-secondary); background: var(--set-surface-elevated); border: 1px solid var(--set-border); }
.ct-card-meta span.must { color: var(--set-gold); background: color-mix(in srgb, var(--set-gold) 11%, transparent); border-color: color-mix(in srgb, var(--set-gold) 22%, transparent); }
.ct-note { display: flex; gap: 7px; margin: 0; font-size: 11px; line-height: 1.5; color: var(--set-text-muted); }
.ct-note :deep(svg) { color: var(--set-amber); flex-shrink: 0; margin-top: 1px; }

@media (max-width: 720px) { .ct-row, .ct-toggles { grid-template-columns: 1fr; } }
</style>
