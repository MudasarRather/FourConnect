<template>
  <FilteredListSection
    title="Suspended Employees"
    subtitle="Employees currently under suspension. Use Reinstate to return them to Active."
    :employees="employees"
    :total="total"
    :loading="loading"
    :page="filters.page"
    :total-pages="totalPages"
    :search-value="filters.search || ''"
    :department-id="filters.department_id"
    :departments="reference?.departments || []"
    :inline-action="{ key: 'reinstate', label: 'Reinstate', icon: Play, tone: 'green' }"
    empty-text="No suspended employees."
    :empty-icon="Pause"
    tone="red"
    eyebrow="Disciplinary hold"
    :accent-icon="Pause"
    @open-profile="(id) => $emit('open-profile', id)"
    @inline-action="onInline"
    @set-page="(p) => $emit('set-page', p)"
    @update:search="(v) => $emit('set-filters', { search: v })"
    @update:department="(v) => $emit('set-filters', { department_id: v })"
    @clear-filters="$emit('set-filters', { search: '', department_id: null })"
  />
</template>

<script setup>
import { Pause, Play } from 'lucide-vue-next'
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
