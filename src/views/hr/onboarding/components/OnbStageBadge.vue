<template>
  <span class="onb-stage-chip" :data-stage="stage">
    <span class="dot"></span>
    <span>{{ label || labelMap[stage] || stage }}</span>
  </span>
</template>

<script setup>
defineProps({
  stage: { type: String, required: true },
  label: { type: String, default: '' },
})
const labelMap = {
  PRE_JOIN: 'Pre-Join',
  APPROVAL: 'Approval',
  DOCS: 'Documents',
  IDENTITY: 'Identity',
  ASSETS: 'Assets',
  TRAINING: 'Training',
  ACTIVE: 'Active',
}
</script>

<style scoped>
/* Styles defined globally in onboarding-theme.css */
</style>
