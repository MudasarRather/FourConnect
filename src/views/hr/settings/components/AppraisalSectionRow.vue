<template>
  <Motion as="div" class="sr" :class="{ hot: active }" :style="{ '--c': meta.color }"
    :initial="reduced ? false : { opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, scale: 0.96 }"
    :transition="{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }"
    @pointerenter="$emit('hover', index)" @pointerleave="$emit('hover', null)">
    <span class="sr-spine" aria-hidden="true" />

    <div class="sr-main">
      <span class="sr-idx">{{ index + 1 }}</span>
      <span class="sr-ic"><component :is="meta.icon" :size="14" /></span>
      <HrInput class="sr-title" :model-value="section.title" placeholder="Section title"
        @update:model-value="v => $emit('patch', { title: v })" />

      <div class="sr-type">
        <SetSelect :model-value="section.section_type" :options="typeOptions" accent-color="var(--set-deep)"
          @update:model-value="v => $emit('patch', { section_type: v })" />
      </div>

      <div class="sr-weight">
        <button type="button" :disabled="section.weight <= 0" @click="bump(-5)" aria-label="Less weight"><Minus :size="13" /></button>
        <span class="sr-weight-val">{{ section.weight }}<i>%</i></span>
        <button type="button" :disabled="section.weight >= 100" @click="bump(5)" aria-label="More weight"><Plus :size="13" /></button>
      </div>

      <div class="sr-ctl">
        <button type="button" :class="{ act: expanded }" :title="`${(section.criteria || []).length} criteria`" @click="expanded = !expanded">
          <ListChecks :size="13" /><b v-if="(section.criteria || []).length">{{ (section.criteria || []).length }}</b>
        </button>
        <button type="button" :disabled="index === 0" @click="$emit('move', -1)" aria-label="Move up"><ArrowUp :size="13" /></button>
        <button type="button" :disabled="index === count - 1" @click="$emit('move', 1)" aria-label="Move down"><ArrowDown :size="13" /></button>
        <button type="button" class="danger" @click="$emit('remove')" aria-label="Remove"><Trash2 :size="13" /></button>
      </div>
    </div>

    <Presence>
      <Motion v-if="expanded" as="div" class="sr-crit" key="crit"
        :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }"
        :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }">
        <div class="sr-crit-inner">
          <span class="sr-crit-lab">{{ meta.label }} criteria <em>— what raters look for</em></span>
          <div v-if="(section.criteria || []).length" class="sr-crit-chips">
            <span v-for="(c, ci) in section.criteria" :key="ci" class="sr-crit-chip">
              {{ c }}<button type="button" @click="removeCriterion(ci)"><X :size="10" /></button>
            </span>
          </div>
          <HrInput :model-value="draft" placeholder="Add a criterion — Enter to add"
            @update:model-value="v => draft = v" @keydown="onKey" />
        </div>
      </Motion>
    </Presence>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { Minus, Plus, ArrowUp, ArrowDown, Trash2, ListChecks, X } from 'lucide-vue-next'
import SetSelect from './SetSelect.vue'
import HrInput from '@/components/hr/forms/HrInput.vue'
import { prefersReduced } from '@/composables/useShiftMotion'
import { SECTION_TYPES, SECTION_TYPE_META, sectionMeta } from '../composables/appraisalVocab'

const props = defineProps({
  section: { type: Object, required: true },
  index: { type: Number, default: 0 },
  count: { type: Number, default: 1 },
  active: { type: Boolean, default: false },
})
const emit = defineEmits(['patch', 'move', 'remove', 'hover'])

const reduced = prefersReduced()
const expanded = ref(false)
const draft = ref('')

const meta = computed(() => sectionMeta(props.section.section_type))
const typeOptions = SECTION_TYPES.map(k => ({
  value: k, label: SECTION_TYPE_META[k].label, icon: SECTION_TYPE_META[k].icon, dot: SECTION_TYPE_META[k].color,
}))

const bump = (d) => emit('patch', { weight: Math.max(0, Math.min(100, (Number(props.section.weight) || 0) + d)) })

const addCriterion = () => {
  const v = draft.value.trim()
  if (!v) return
  const list = [...(props.section.criteria || [])]
  if (!list.includes(v)) list.push(v)
  emit('patch', { criteria: list })
  draft.value = ''
}
const removeCriterion = (i) => {
  const list = [...(props.section.criteria || [])]
  list.splice(i, 1)
  emit('patch', { criteria: list })
}
const onKey = (e) => {
  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addCriterion() }
  else if (e.key === 'Backspace' && !draft.value && (props.section.criteria || []).length) removeCriterion(props.section.criteria.length - 1)
}
</script>

<style scoped>
.sr { position: relative; overflow: hidden; border-radius: 13px; background: var(--set-panel); border: 1px solid var(--set-border);
  transition: border-color 0.25s, background 0.25s, box-shadow 0.25s; }
.sr.hot { border-color: color-mix(in srgb, var(--c) 50%, transparent); box-shadow: 0 0 0 1px color-mix(in srgb, var(--c) 22%, transparent); background: color-mix(in srgb, var(--c) 5%, var(--set-panel)); }
.sr-spine { position: absolute; left: 0; top: 8px; bottom: 8px; width: 3px; border-radius: 0 3px 3px 0; background: var(--c); box-shadow: 0 0 10px color-mix(in srgb, var(--c) 50%, transparent); }

.sr-main { display: grid; grid-template-columns: 22px 26px 1fr 138px auto auto; align-items: center; gap: 9px; padding: 8px 10px 8px 12px; }
.sr-idx { width: 22px; height: 22px; border-radius: 7px; display: grid; place-items: center; font-size: 11px; font-weight: 800; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); }
.sr-ic { display: grid; place-items: center; color: var(--c); }
.sr-title { min-width: 0; }
.sr-type { width: 138px; }

.sr-weight { display: inline-flex; align-items: center; gap: 2px; padding: 2px; border-radius: 10px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); }
.sr-weight button { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 7px; cursor: pointer; flex-shrink: 0;
  color: var(--set-text-secondary); background: transparent; border: none; transition: all 0.16s; }
.sr-weight button:hover:not(:disabled) { color: var(--c); background: var(--set-surface-elevated); }
.sr-weight button:disabled { opacity: 0.35; cursor: not-allowed; }
.sr-weight-val { min-width: 38px; text-align: center; font-size: 12.5px; font-weight: 800; color: var(--set-text); font-variant-numeric: tabular-nums; }
.sr-weight-val i { font-size: 9px; font-style: normal; color: var(--set-text-muted); }

.sr-ctl { display: inline-flex; gap: 3px; }
.sr-ctl button { position: relative; display: grid; place-items: center; width: 27px; height: 27px; border-radius: 7px; cursor: pointer;
  color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.16s; }
.sr-ctl button:hover:not(:disabled) { color: var(--set-text); border-color: var(--set-border-strong); }
.sr-ctl button:disabled { opacity: 0.35; cursor: not-allowed; }
.sr-ctl button.act { color: var(--set-deep); border-color: color-mix(in srgb, var(--set-deep) 40%, transparent); background: color-mix(in srgb, var(--set-deep) 12%, transparent); }
.sr-ctl button.danger:hover { color: var(--set-conflict); border-color: color-mix(in srgb, var(--set-conflict) 32%, transparent); }
.sr-ctl button b { position: absolute; top: -5px; right: -5px; min-width: 14px; height: 14px; padding: 0 3px; border-radius: 7px; display: grid; place-items: center;
  font-size: 8.5px; font-weight: 800; color: #1a1206; background: var(--set-deep); }

.sr-crit { overflow: hidden; }
.sr-crit-inner { display: flex; flex-direction: column; gap: 8px; padding: 4px 12px 12px 38px; }
.sr-crit-lab { font-size: 10.5px; font-weight: 700; color: var(--set-text-secondary); }
.sr-crit-lab em { font-style: normal; font-weight: 500; color: var(--set-text-dim); }
.sr-crit-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.sr-crit-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 6px 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 600;
  color: var(--set-text-secondary); background: color-mix(in srgb, var(--c) 9%, var(--set-surface-elevated)); border: 1px solid color-mix(in srgb, var(--c) 22%, transparent); }
.sr-crit-chip button { display: grid; place-items: center; width: 15px; height: 15px; border-radius: 5px; border: none; cursor: pointer;
  color: inherit; background: color-mix(in srgb, var(--c) 14%, transparent); transition: all 0.16s; }
.sr-crit-chip button:hover { color: var(--set-conflict); background: var(--set-conflict-soft); }

@media (max-width: 720px) { .sr-main { grid-template-columns: 22px 1fr auto; row-gap: 8px; } .sr-ic, .sr-type { display: none; } }
</style>
