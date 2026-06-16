<template>
  <div class="rmb-soon">
    <RmbEmptyState :icon="Wrench" title="Coming soon" :subtitle="`The ${sectionKey} surface is on the roadmap.`" />
  </div>
</template>

<script setup>
import { Wrench } from 'lucide-vue-next'
import RmbEmptyState from './RmbEmptyState.vue'
defineProps({ sectionKey: { type: String, default: '' } })
</script>

<style scoped>
.rmb-soon { padding: 40px 0; }
</style>
