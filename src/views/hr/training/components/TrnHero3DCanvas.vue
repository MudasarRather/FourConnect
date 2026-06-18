<template>
  <TresCanvas alpha :clear-alpha="0" :antialias="true" :dpr="[1, 1.75]"
    :renderer-options="{ powerPreference: 'low-power' }">
    <TresPerspectiveCamera :position="[0, 0.35, 6.2]" :fov="40" :look-at="[0, 0, 0]" />
    <!-- Scene lives in a child so useLoop()/useTres() have the Tres context. -->
    <TrnObservatoryScene :reduced="reduced" :light="light" :status-counts="statusCounts" />
  </TresCanvas>
</template>

<script setup>
import { TresCanvas } from '@tresjs/core'
import TrnObservatoryScene from './TrnObservatoryScene.vue'

defineProps({
  reduced: { type: Boolean, default: false },
  light: { type: Boolean, default: false },
  statusCounts: { type: Object, default: () => ({}) },
})
</script>

<style scoped>
:deep(canvas) { display: block; width: 100%; height: 100%; }
</style>
