<template>
  <TresAmbientLight :intensity="0.4" />
  <TresPointLight :position="[3, 3, 4]" :intensity="1.4" color="#fde68a" />
  <TresPointLight :position="[-3, -2, 2]" :intensity="0.8" color="#ea580c" />
  <TresSpotLight :position="[0, 4, 3]" :intensity="1.0" color="#fbbf24" />

  <TresGroup ref="groupRef">
    <!-- Minted ₹ coin -->
    <TresMesh :rotation="[Math.PI / 2, 0, 0]">
      <TresCylinderGeometry :args="[1.15, 1.15, 0.13, 56]" />
      <TresMeshStandardMaterial color="#f4af2a" :metalness="0.88" :roughness="0.26"
        emissive="#b8860b" :emissive-intensity="0.22" />
    </TresMesh>
    <!-- raised rim -->
    <TresMesh :rotation="[Math.PI / 2, 0, 0]">
      <TresTorusGeometry :args="[1.13, 0.05, 12, 64]" />
      <TresMeshStandardMaterial color="#fde68a" :metalness="0.9" :roughness="0.2"
        emissive="#f59e0b" :emissive-intensity="0.4" />
    </TresMesh>

    <!-- cashflow particle stream -->
    <TresMesh v-for="(p, i) in particles" :key="i" :position="p.position" :scale="p.scale">
      <TresSphereGeometry :args="[0.035, 8, 8]" />
      <TresMeshStandardMaterial :color="p.color" :emissive="p.color"
        :emissive-intensity="0.7" :roughness="0.5" :metalness="0.3" />
    </TresMesh>

    <!-- orbit rings -->
    <TresMesh :rotation="[Math.PI / 2.1, 0.35, 0]">
      <TresTorusGeometry :args="[1.9, 0.005, 8, 80]" />
      <TresMeshBasicMaterial color="#fbbf24" :transparent="true" :opacity="0.32" />
    </TresMesh>
    <TresMesh :rotation="[Math.PI / 1.8, -0.4, 0.2]">
      <TresTorusGeometry :args="[2.25, 0.004, 8, 80]" />
      <TresMeshBasicMaterial color="#fb923c" :transparent="true" :opacity="0.2" />
    </TresMesh>
  </TresGroup>
</template>

<script setup>
// Scene component — rendered INSIDE <TresCanvas>, so the Tres context exists here
// and useLoop()/useTres() are valid. (They throw if called in the canvas host.)
import { ref, onBeforeUnmount, computed } from 'vue'
import { useLoop } from '@tresjs/core'
import { useMouse, useWindowSize } from '@vueuse/core'

const props = defineProps({ reduced: { type: Boolean, default: false } })

const groupRef = ref(null)
const { x: mx, y: my } = useMouse()
const { width: ww, height: wh } = useWindowSize()

const particles = computed(() => {
  const COUNT = 64
  const PALETTE = ['#fbbf24', '#f59e0b', '#fb923c', '#fde68a', '#b8860b']
  const phi = Math.PI * (3 - Math.sqrt(5))
  const out = []
  for (let i = 0; i < COUNT; i++) {
    const y = 1 - (i / (COUNT - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const th = phi * i
    const rad = 2.0 + Math.sin(i * 0.6) * 0.25
    out.push({
      position: [Math.cos(th) * r * rad, y * rad, Math.sin(th) * r * rad],
      scale: 0.5 + (i % 5) * 0.16,
      color: PALETTE[i % PALETTE.length],
    })
  }
  return out
})

const { onBeforeRender, pause } = useLoop()
let parX = 0, parY = 0
const stopLoop = onBeforeRender(({ delta }) => {
  if (!groupRef.value || props.reduced) return
  const g = groupRef.value
  g.rotation.y += delta * 0.4   // coin spin
  const nx = (mx.value / ww.value) * 2 - 1
  const ny = (my.value / wh.value) * 2 - 1
  parX += (nx * 0.15 - parX) * 0.05
  parY += (ny * 0.1 - parY) * 0.05
  g.position.x = parX
  g.position.y = -parY
})
onBeforeUnmount(() => { try { stopLoop?.() } catch {} try { pause?.() } catch {} })
</script>
