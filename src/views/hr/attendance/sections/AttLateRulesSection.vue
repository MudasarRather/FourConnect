<template>
  <AttPoliciesSection filter-type="LATE_RULE" @refresh-stats="$emit('refresh-stats')" />
</template>

<script setup>
import AttPoliciesSection from './AttPoliciesSection.vue'
defineEmits(['refresh-stats'])
</script>
