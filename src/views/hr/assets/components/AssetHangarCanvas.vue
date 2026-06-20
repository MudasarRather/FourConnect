<template>
  <TresCanvas alpha :clear-alpha="0" :antialias="true" :dpr="dpr"
    :renderer-options="{ powerPreference: 'low-power' }">
    <TresPerspectiveCamera :position="[0, 2.6, 6.4]" :fov="42" :look-at="[0, 0.6, 0]" />
    <AssetHangarScene :reduced="reduced" :light="light" :status-counts="statusCounts" />
  </TresCanvas>
</template>

<script setup>
import { computed } from 'vue'
import { TresCanvas } from '@tresjs/core'
import AssetHangarScene from './AssetHangarScene.vue'

const props = defineProps({
  reduced: { type: Boolean, default: false },
  light: { type: Boolean, default: false },
  statusCounts: { type: Object, default: () => ({}) },
  lowPower: { type: Boolean, default: false },
})
// Throttle resolution on low-power devices.
const dpr = computed(() => (props.lowPower ? [1, 1] : [1, 1.75]))
</script>

<style scoped>
:deep(canvas) { display: block; width: 100%; height: 100%; }
</style>
