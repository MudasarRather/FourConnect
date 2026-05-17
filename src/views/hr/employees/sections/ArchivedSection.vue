<template>
  <FilteredListSection
    title="Archived Employees"
    subtitle="Records retained for audit and statutory reasons. Use Restore to bring an employee back."
    :employees="employees"
    :total="total"
    :loading="loading"
    :page="filters.page"
    :total-pages="totalPages"
    :search-value="filters.search || ''"
    :department-id="filters.department_id"
    :departments="reference?.departments || []"
    :inline-action="{ key: 'unarchive', label: 'Restore', icon: Undo2, tone: 'green' }"
    empty-text="No archived employees."
    :empty-icon="Archive"
    tone="violet"
    eyebrow="Cold storage"
    :accent-icon="Archive"
    @open-profile="(id) => $emit('open-profile', id)"
    @inline-action="onInline"
    @set-page="(p) => $emit('set-page', p)"
    @update:search="(v) => $emit('set-filters', { search: v })"
    @update:department="(v) => $emit('set-filters', { department_id: v })"
    @clear-filters="$emit('set-filters', { search: '', department_id: null })"
  />
</template>

<script setup>
import { Archive, Undo2 } from 'lucide-vue-next'
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
