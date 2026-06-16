<template>
  <TresCanvas clear-color="#060504" :clear-alpha="0" alpha :antialias="true" :dpr="[1, 1.5]"
    :renderer-options="{ powerPreference: 'low-power' }">
    <TresPerspectiveCamera :position="[0, 0, 5.2]" :fov="42" />
    <!-- Scene lives in a child so useLoop()/useTres() have the Tres context.
         (They throw if called in the canvas host component.) -->
    <PayCoinScene :reduced="reduced" />
  </TresCanvas>
</template>

<script setup>
import { TresCanvas } from '@tresjs/core'
import PayCoinScene from './PayCoinScene.vue'

defineProps({ reduced: { type: Boolean, default: false } })
</script>

<style scoped>
:deep(canvas) { display: block; width: 100%; height: 100%; }
</style>
