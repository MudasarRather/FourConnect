<template>
  <EmployeeHistorySection
    fixed-change-type="CONFIRMED"
    title="Confirmations"
    subtitle="Probationary employees who have been confirmed as permanent."
    empty-text="No confirmation events recorded."
    tone="green"
    eyebrow="Probation cleared"
    :accent-icon="BadgeCheck"
    @open-profile="(id) => $emit('open-profile', id)"
  />
</template>

<script setup>
import { BadgeCheck } from 'lucide-vue-next'
import EmployeeHistorySection from './EmployeeHistorySection.vue'
defineEmits(['open-profile'])
</script>
