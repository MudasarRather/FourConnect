<template>
  <div class="hr-dept-select">
    <!-- Primary: top-level departments only -->
    <HrSelect
      :model-value="parentId"
      :options="topLevelOptions"
      :placeholder="placeholder"
      :error="error"
      :error-text="errorText"
      :disabled="disabled"
      @update:model-value="onParent"
    />

    <!-- Dependent: only appears when the chosen department has sub-departments -->
    <transition name="hrds-reveal">
      <div v-if="subOptions.length" class="hrds-sub">
        <HrFieldLabel :label="subLabel" :helper="subHelper" />
        <HrSelect
          :model-value="childId"
          :options="subOptions"
          :placeholder="subPlaceholder"
          :disabled="disabled"
          @update:model-value="onChild"
        />
      </div>
    </transition>
  </div>
</template>

<script setup>
// Cascading department picker. The org tree is configured in HR Settings
// (departments can carry a parent_department_id). This renders a primary
// "Department" dropdown of TOP-LEVEL departments, and — only when the chosen
// department actually has children — reveals a dependent "Sub-department"
// dropdown listing those children.
//
// `modelValue` is the single effective department id the form submits: the
// sub-department when one is picked, otherwise the parent department itself
// (assigning to the whole department stays valid). Everything is derived from
// `modelValue` + `departments`, so there's no internal state to keep in sync.
//
// Two-level model: deeper nesting (3+ levels) collapses to the nearest
// parent/child pair, which is sufficient for the current org structures.
import { computed } from 'vue'
import HrSelect from './HrSelect.vue'
import HrFieldLabel from './HrFieldLabel.vue'

const props = defineProps({
  modelValue: { type: [String, Number, null], default: null },
  departments: { type: Array, default: () => [] }, // [{ id, name, parent_department_id }]
  placeholder: { type: String, default: 'Select department' },
  subLabel: { type: String, default: 'Sub-department' },
  subHelper: { type: String, default: 'Optional — a team within this department' },
  subPlaceholder: { type: String, default: 'Whole department — pick a sub-department' },
  error: { type: Boolean, default: false },
  errorText: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const key = (v) => (v == null ? '' : String(v))

const byId = computed(() => {
  const m = new Map()
  for (const d of props.departments || []) m.set(key(d.id), d)
  return m
})
const hasParent = (d) => !!(d && d.parent_department_id != null && byId.value.has(key(d.parent_department_id)))

const topLevelOptions = computed(() =>
  (props.departments || [])
    .filter(d => !hasParent(d))
    .map(d => ({ value: d.id, label: d.name }))
    .sort((a, b) => String(a.label).localeCompare(String(b.label)))
)

const selected = computed(() => byId.value.get(key(props.modelValue)) || null)

// Primary reflects the chosen top-level dept, or — when a sub-department is the
// live value — that sub-department's parent.
const parentId = computed(() => {
  const s = selected.value
  if (!s) return null
  return hasParent(s) ? s.parent_department_id : s.id
})
// Sub holds the live value only when it is actually a child.
const childId = computed(() => {
  const s = selected.value
  return s && hasParent(s) ? s.id : null
})

const subOptions = computed(() => {
  const pid = key(parentId.value)
  if (!pid) return []
  return (props.departments || [])
    .filter(d => key(d.parent_department_id) === pid)
    .map(d => ({ value: d.id, label: d.name }))
    .sort((a, b) => String(a.label).localeCompare(String(b.label)))
})

const onParent = (val) => emit('update:modelValue', val ?? null)
// Selecting a child sets it as the effective value; a falsy pick falls back to
// the parent so the field always resolves to a real department.
const onChild = (val) => emit('update:modelValue', val || parentId.value || null)
</script>

<style scoped>
.hr-dept-select { display: flex; flex-direction: column; gap: 12px; }

/* Nested sub-department block — an L-connector communicates the hierarchy. */
.hrds-sub {
  position: relative;
  margin-left: 12px;
  padding-left: 16px;
  border-left: 2px solid var(--hr-border-strong);
}
.hrds-sub::before {
  content: '';
  position: absolute;
  left: -2px;
  top: 12px;
  width: 12px;
  height: 2px;
  background: var(--hr-border-strong);
}

.hrds-reveal-enter-active,
.hrds-reveal-leave-active {
  transition: opacity 240ms var(--hr-spring), transform 240ms var(--hr-spring);
}
.hrds-reveal-enter-from,
.hrds-reveal-leave-to { opacity: 0; transform: translateY(-4px); }
@media (prefers-reduced-motion: reduce) {
  .hrds-reveal-enter-active, .hrds-reveal-leave-active { transition: none; }
}
</style>
