<template>
  <!-- cinematic warm lighting -->
  <TresAmbientLight :intensity="light ? 0.5 : 0.3" />
  <TresPointLight :position="[0, 0, 0]" :intensity="light ? 1.1 : 1.7" color="#fde68a" :distance="10" :decay="1.3" />
  <TresPointLight :position="[3.6, 2.6, 3.2]" :intensity="1.1" color="#fbbf24" />
  <TresPointLight :position="[-3.8, -2.2, 1.4]" :intensity="0.7" color="#ea580c" />

  <TresGroup ref="rootRef">
    <!-- soft bokeh starfield (far depth) -->
    <primitive :object="starField" />

    <!-- the sun-core: faceted gold body wrapped in additive bloom shells -->
    <TresGroup ref="coreRef">
      <TresMesh>
        <TresIcosahedronGeometry :args="[0.5, 2]" />
        <TresMeshStandardMaterial color="#f6b431" :metalness="0.62" :roughness="0.24"
          emissive="#f59e0b" :emissive-intensity="light ? 0.8 : 1.25" :flat-shading="true" />
      </TresMesh>
      <TresMesh v-for="(g, i) in glowShells" :key="i" :scale="g.s">
        <TresSphereGeometry :args="[0.5, 24, 24]" />
        <TresMeshBasicMaterial :color="g.c" :transparent="true" :opacity="g.o"
          :blending="AdditiveBlending" :depth-write="false" />
      </TresMesh>
    </TresGroup>

    <!-- orbiting bodies on tilted rings, each with a glow halo -->
    <TresGroup v-for="(o, i) in orbits" :key="i" :rotation="o.tilt">
      <TresMesh :rotation="[Math.PI / 2, 0, 0]">
        <TresTorusGeometry :args="[o.r, 0.0045, 8, 150]" />
        <TresMeshBasicMaterial :color="o.ring" :transparent="true" :opacity="o.ringO"
          :blending="AdditiveBlending" :depth-write="false" />
      </TresMesh>
      <TresGroup :ref="el => setSpin(el, i)">
        <TresMesh :position="[o.r, 0, 0]">
          <TresSphereGeometry :args="[o.size, 22, 22]" />
          <TresMeshStandardMaterial :color="o.color" :emissive="o.color"
            :emissive-intensity="light ? 0.5 : 0.95" :roughness="0.38" :metalness="0.32" />
        </TresMesh>
        <TresMesh :position="[o.r, 0, 0]" :scale="2.6">
          <TresSphereGeometry :args="[o.size, 16, 16]" />
          <TresMeshBasicMaterial :color="o.color" :transparent="true" :opacity="0.16"
            :blending="AdditiveBlending" :depth-write="false" />
        </TresMesh>
      </TresGroup>
    </TresGroup>

    <!-- near drifting dust motes (foreground sparkle) -->
    <primitive :object="dust" />
  </TresGroup>
</template>

<script setup>
import { ref, onBeforeUnmount, computed } from 'vue'
import * as THREE from 'three'
import { AdditiveBlending } from 'three'
import { useLoop } from '@tresjs/core'
import { useMouse, useWindowSize } from '@vueuse/core'

const props = defineProps({
  reduced: { type: Boolean, default: false },
  light: { type: Boolean, default: false },
  statusCounts: { type: Object, default: () => ({}) },
})

const rootRef = ref(null)
const coreRef = ref(null)
const spins = []
const setSpin = (el, i) => { const o = el?.$el || el; if (o) spins[i] = o }
const { x: mx, y: my } = useMouse()
const { width: ww, height: wh } = useWindowSize()

const glowShells = [
  { s: 1.55, c: '#f59e0b', o: 0.22 },
  { s: 2.5, c: '#fb923c', o: 0.10 },
  { s: 3.7, c: '#ea580c', o: 0.05 },
]

// orbit bodies — tint the lead body emerald when the org skews "completed"
const orbits = computed(() => {
  const c = props.statusCounts || {}
  const total = Object.values(c).reduce((a, b) => a + (Number(b) || 0), 0)
  const done = Number(c.COMPLETED || 0)
  const leadColor = total > 0 && done / total > 0.45 ? '#34d399' : '#fde68a'
  return [
    { r: 1.15, size: 0.085, tilt: [1.15, 0.2, 0], color: leadColor, ring: '#fbbf24', ringO: 0.30, speed: 0.5 },
    { r: 1.7, size: 0.115, tilt: [1.38, -0.4, 0.3], color: '#fbbf24', ring: '#fb923c', ringO: 0.24, speed: 0.34 },
    { r: 2.28, size: 0.07, tilt: [1.0, 0.7, -0.2], color: '#fb923c', ring: '#ea580c', ringO: 0.18, speed: 0.24 },
  ]
})

// ── soft round sprite for bokeh particles ──
function makeSprite() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64
  const ctx = cv.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,238,200,0.92)')
  g.addColorStop(0.6, 'rgba(251,191,36,0.28)')
  g.addColorStop(1, 'rgba(251,191,36,0)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64)
  const t = new THREE.CanvasTexture(cv); t.needsUpdate = true; return t
}
const sprite = makeSprite()
const PALETTE = [[0.98, 0.85, 0.46], [1, 0.96, 0.74], [0.98, 0.6, 0.26]]

function buildPoints(count, radius, flatten, size, opacity) {
  const geo = new THREE.BufferGeometry()
  const pos = new Float32Array(count * 3)
  const col = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const u = Math.random(), v = Math.random()
    const theta = u * Math.PI * 2
    const phi = Math.acos(2 * v - 1)
    const rr = radius * (0.55 + Math.random() * 0.6)
    pos[i * 3] = rr * Math.sin(phi) * Math.cos(theta)
    pos[i * 3 + 1] = rr * Math.sin(phi) * Math.sin(theta) * flatten
    pos[i * 3 + 2] = rr * Math.cos(phi)
    const p = PALETTE[(Math.random() * PALETTE.length) | 0]
    col[i * 3] = p[0]; col[i * 3 + 1] = p[1]; col[i * 3 + 2] = p[2]
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  const mat = new THREE.PointsMaterial({
    size, map: sprite, vertexColors: true, transparent: true, opacity,
    blending: AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  })
  return new THREE.Points(geo, mat)
}
const starField = buildPoints(340, 3.2, 0.72, 0.055, 0.9)
const dust = buildPoints(46, 2.7, 0.85, 0.12, 0.65)

const { onBeforeRender, pause } = useLoop()
let t = 0, parX = 0, parY = 0
const stopLoop = onBeforeRender(({ delta }) => {
  if (props.reduced) return
  t += delta
  if (coreRef.value) {
    coreRef.value.rotation.y += delta * 0.18
    coreRef.value.rotation.x += delta * 0.05
    const b = 1 + Math.sin(t * 0.9) * 0.04
    coreRef.value.scale.set(b, b, b)
  }
  for (let i = 0; i < spins.length; i++) {
    if (spins[i]) spins[i].rotation.y += delta * (orbits.value[i]?.speed || 0.3)
  }
  if (starField) starField.rotation.y += delta * 0.012
  if (dust) { dust.rotation.y -= delta * 0.03; dust.rotation.x += delta * 0.015 }
  if (rootRef.value) {
    const nx = (mx.value / ww.value) * 2 - 1
    const ny = (my.value / wh.value) * 2 - 1
    parX += (nx * 0.26 - parX) * 0.045
    parY += (ny * 0.18 - parY) * 0.045
    rootRef.value.position.x = parX
    rootRef.value.position.y = -parY
    rootRef.value.rotation.y = parX * 0.2
    rootRef.value.rotation.x = -parY * 0.12
  }
})

onBeforeUnmount(() => {
  try { stopLoop?.() } catch {}
  try { pause?.() } catch {}
  for (const obj of [starField, dust]) {
    try { obj.geometry.dispose(); obj.material.dispose() } catch {}
  }
  try { sprite.dispose() } catch {}
})
</script>
