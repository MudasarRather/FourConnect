<template>
  <TresCanvas
    clear-color="#0a0a0c"
    :clear-alpha="0"
    alpha
    :antialias="true"
    :dpr="[1, 1.5]"
    :renderer-options="{ powerPreference: 'low-power' }"
  >
    <TresPerspectiveCamera :position="[0, 0, 5]" :fov="45" />
    <TresAmbientLight :intensity="0.35" />
    <TresPointLight :position="[3, 3, 3]" :intensity="1.2" color="#fbbf24" />
    <TresPointLight :position="[-3, -2, 2]" :intensity="0.7" color="#fb923c" />

    <!-- Particle constellation -->
    <TresGroup ref="groupRef">
      <TresMesh v-for="(p, i) in particles" :key="i" :position="p.position" :scale="p.scale">
        <TresSphereGeometry :args="[0.04, 8, 8]" />
        <TresMeshStandardMaterial
          :color="p.color"
          :emissive="p.color"
          :emissive-intensity="0.6"
          :roughness="0.5"
          :metalness="0.2"
        />
      </TresMesh>

      <!-- Orbit rings -->
      <TresMesh :rotation="[Math.PI / 2, 0, 0]">
        <TresTorusGeometry :args="[1.6, 0.005, 8, 64]" />
        <TresMeshBasicMaterial color="#fbbf24" :transparent="true" :opacity="0.35" />
      </TresMesh>
      <TresMesh :rotation="[Math.PI / 2.3, 0.4, 0]">
        <TresTorusGeometry :args="[1.95, 0.004, 8, 64]" />
        <TresMeshBasicMaterial color="#fb923c" :transparent="true" :opacity="0.22" />
      </TresMesh>
    </TresGroup>
  </TresCanvas>
</template>

<script setup>
import { ref, shallowRef, onMounted, onBeforeUnmount, computed } from 'vue'
import { TresCanvas, useLoop } from '@tresjs/core'
import { useMouse, useWindowSize } from '@vueuse/core'

const props = defineProps({
  reduced: { type: Boolean, default: false },
})

const groupRef = ref(null)
const { x: mx, y: my } = useMouse()
const { width: ww, height: wh } = useWindowSize()

// Generate a fixed cloud of particles (Fibonacci sphere distribution).
const particles = computed(() => {
  const COUNT = 80
  const PALETTE = ['#fbbf24', '#f59e0b', '#fb923c', '#fde68a']
  const phi = Math.PI * (3 - Math.sqrt(5))
  const out = []
  for (let i = 0; i < COUNT; i++) {
    const y = 1 - (i / (COUNT - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const th = phi * i
    const x = Math.cos(th) * r
    const z = Math.sin(th) * r
    // Vary radius slightly for depth
    const rad = 1.6 + Math.sin(i * 0.7) * 0.2
    out.push({
      position: [x * rad, y * rad, z * rad],
      scale: 0.6 + (i % 5) * 0.15,
      color: PALETTE[i % PALETTE.length],
    })
  }
  return out
})

// Drive a slow auto-rotation plus subtle parallax to mouse position.
const { onBeforeRender, pause } = useLoop()

let parX = 0, parY = 0
const stopLoop = onBeforeRender(({ delta }) => {
  if (!groupRef.value) return
  const g = groupRef.value
  if (props.reduced) return

  // Auto-spin
  g.rotation.y += delta * 0.18
  g.rotation.x += delta * 0.06

  // Smooth mouse parallax (small)
  const nx = (mx.value / ww.value) * 2 - 1
  const ny = (my.value / wh.value) * 2 - 1
  parX += (nx * 0.18 - parX) * 0.06
  parY += (ny * 0.12 - parY) * 0.06
  g.position.x = parX
  g.position.y = -parY
})

onBeforeUnmount(() => {
  try { stopLoop?.() } catch {}
  try { pause?.() } catch {}
})
</script>

<style scoped>
:deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
