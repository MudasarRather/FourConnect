<template>
  <EmployeeHistorySection
    fixed-change-type="PROMOTED"
    title="Promotions"
    subtitle="Every change of designation, grade, or pay level — newest first."
    empty-text="No promotions recorded yet."
    tone="gold"
    eyebrow="Career growth"
    :accent-icon="TrendingUp"
    @open-profile="(id) => $emit('open-profile', id)"
  />
</template>

<script setup>
import { TrendingUp } from 'lucide-vue-next'
import EmployeeHistorySection from './EmployeeHistorySection.vue'
defineEmits(['open-profile'])
</script>
