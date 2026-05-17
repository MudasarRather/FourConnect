<template>
  <FilteredListSection
    title="Inactive Employees"
    subtitle="Long-term hold — typically extended leave-without-pay or temporary deactivation."
    :employees="employees"
    :total="total"
    :loading="loading"
    :page="filters.page"
    :total-pages="totalPages"
    :search-value="filters.search || ''"
    :department-id="filters.department_id"
    :departments="reference?.departments || []"
    empty-text="No inactive employees."
    :empty-icon="UserX"
    tone="gray"
    eyebrow="On hold"
    :accent-icon="Moon"
    @open-profile="(id) => $emit('open-profile', id)"
    @set-page="(p) => $emit('set-page', p)"
    @update:search="(v) => $emit('set-filters', { search: v })"
    @update:department="(v) => $emit('set-filters', { department_id: v })"
    @clear-filters="$emit('set-filters', { search: '', department_id: null })"
  />
</template>

<script setup>
import { UserX, Moon } from 'lucide-vue-next'
import FilteredListSection from './_FilteredListSection.vue'

defineProps({
  employees: { type: Array, required: true },
  total: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
  filters: { type: Object, required: true },
  totalPages: { type: Number, default: 1 },
  reference: { type: Object, default: () => ({}) },
})
defineEmits(['open-profile', 'set-page', 'set-filters'])
</script>
