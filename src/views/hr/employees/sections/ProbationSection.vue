<template>
  <FilteredListSection
    title="Probation Tracker"
    subtitle="Employees currently on probation. Confirm them once their period is complete."
    :employees="employees"
    :total="total"
    :loading="loading"
    :page="filters.page"
    :total-pages="totalPages"
    :search-value="filters.search || ''"
    :department-id="filters.department_id"
    :departments="reference?.departments || []"
    :inline-action="{ key: 'confirm', label: 'Confirm', icon: CheckCircle, tone: 'green' }"
    empty-text="No probationary employees right now."
    :empty-icon="Hourglass"
    tone="amber"
    eyebrow="Probation period"
    :accent-icon="Hourglass"
    @open-profile="(id) => $emit('open-profile', id)"
    @inline-action="onInline"
    @set-page="(p) => $emit('set-page', p)"
    @update:search="(v) => $emit('set-filters', { search: v })"
    @update:department="(v) => $emit('set-filters', { department_id: v })"
    @clear-filters="$emit('set-filters', { search: '', department_id: null })"
  />
</template>

<script setup>
import { CheckCircle, Hourglass } from 'lucide-vue-next'
import FilteredListSection from './_FilteredListSection.vue'

defineProps({
  employees: { type: Array, required: true },
  total: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
  filters: { type: Object, required: true },
  totalPages: { type: Number, default: 1 },
  reference: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['open-profile', 'set-page', 'set-filters', 'lifecycle-action'])

const onInline = ({ employee, action }) => {
  emit('lifecycle-action', { action, employee })
}
</script>
