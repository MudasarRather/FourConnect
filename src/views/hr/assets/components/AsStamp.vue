<template>
  <span class="as-stamp" :data-status="value"><span class="dot" />{{ label || titleCase(value) }}</span>
</template>

<script setup>
import { titleCase } from '@/composables/useAssets'
defineProps({ value: { type: String, required: true }, label: { type: String, default: '' } })
</script>

<style scoped>
.dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; box-shadow: 0 0 6px currentColor; }
</style>
