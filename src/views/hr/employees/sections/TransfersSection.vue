<template>
  <EmployeeHistorySection
    fixed-change-type="TRANSFERRED"
    title="Transfers"
    subtitle="Department, location, or reporting-manager moves."
    empty-text="No transfer events recorded."
    tone="orange"
    eyebrow="Org movement"
    :accent-icon="ArrowRightLeft"
    @open-profile="(id) => $emit('open-profile', id)"
  />
</template>

<script setup>
import { ArrowRightLeft } from 'lucide-vue-next'
import EmployeeHistorySection from './EmployeeHistorySection.vue'
defineEmits(['open-profile'])
</script>
