<template>
  <!-- machined-hangar lighting (≤6 lights total) -->
  <TresAmbientLight :intensity="light ? 0.55 : 0.32" />
  <TresPointLight :position="[0, 3.4, 2.2]" :intensity="light ? 1.0 : 1.5" color="#fde68a" :distance="14" :decay="1.2" />
  <TresPointLight :position="[3.6, 1.8, 3]" :intensity="0.9" color="#fb923c" />
  <TresPointLight :position="[-3.8, 1.4, 2]" :intensity="0.7" color="#f59e0b" />
  <TresDirectionalLight :position="[2, 5, 4]" :intensity="light ? 0.6 : 0.4" color="#ffffff" />

  <TresGroup ref="rootRef">
    <!-- blueprint floor grid -->
    <primitive :object="floorGrid" />

    <!-- instanced machined asset bezels (single draw call — the perf backbone) -->
    <primitive :object="fleet" />

    <!-- brushed-steel hero ring with a thin amber inlay -->
    <TresGroup ref="ringRef" :position="[0, 1.7, 0]">
      <TresMesh :rotation="[Math.PI / 2.2, 0, 0]">
        <TresTorusGeometry :args="[1.15, 0.07, 18, 90]" />
        <TresMeshStandardMaterial color="#c9ced6" :metalness="0.95" :roughness="0.22" />
      </TresMesh>
      <TresMesh :rotation="[Math.PI / 2.2, 0, 0]" :scale="1.001">
        <TresTorusGeometry :args="[1.15, 0.018, 12, 90]" />
        <TresMeshBasicMaterial color="#fbbf24" :transparent="true" :opacity="light ? 0.7 : 0.95"
          :blending="AdditiveBlending" :depth-write="false" />
      </TresMesh>
    </TresGroup>

    <!-- drifting dust motes (foreground sparkle) -->
    <primitive :object="dust" />
  </TresGroup>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
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
const ringRef = ref(null)
const { x: mx, y: my } = useMouse()
const { width: ww, height: wh } = useWindowSize()

const STATUS_HEX = {
  AVAILABLE: 0x34d399, ALLOCATED: 0xfbbf24, RESERVED: 0xfb923c,
  MAINTENANCE: 0x9aa1ab, RETIRED: 0x6b7280,
}

// ── instanced fleet: machined bezels arranged in a hangar bay grid ──
const COLS = 8
const CAP = 48
const SPACING = 0.62
const boxGeo = new THREE.BoxGeometry(0.4, 0.12, 0.4)
const boxMat = new THREE.MeshStandardMaterial({ metalness: 0.85, roughness: 0.35 })
const fleet = new THREE.InstancedMesh(boxGeo, boxMat, CAP)
fleet.position.y = 0.06
const dummy = new THREE.Object3D()

function layout(count) {
  const n = Math.max(8, Math.min(CAP, count || 12))
  const rows = Math.ceil(n / COLS)
  const xOff = ((COLS - 1) * SPACING) / 2
  const zOff = ((rows - 1) * SPACING) / 2
  for (let i = 0; i < CAP; i++) {
    if (i < n) {
      const c = i % COLS, r = Math.floor(i / COLS)
      dummy.position.set(c * SPACING - xOff, ((i * 37) % 11) * 0.012, r * SPACING - zOff)
      dummy.rotation.set(0, ((i * 53) % 7) * 0.04 - 0.12, 0)
      dummy.scale.setScalar(1)
    } else {
      dummy.scale.setScalar(0.0001) // hide unused instances
    }
    dummy.updateMatrix()
    fleet.setMatrixAt(i, dummy.matrix)
  }
  fleet.instanceMatrix.needsUpdate = true
  fleet.count = CAP
}

function applyColors(counts) {
  // Build a weighted bag of statuses, then colour instances by it.
  const entries = Object.entries(counts || {}).filter(([, v]) => Number(v) > 0)
  const total = entries.reduce((a, [, v]) => a + Number(v), 0)
  const c = new THREE.Color()
  for (let i = 0; i < CAP; i++) {
    let hex = 0xfbbf24
    if (total > 0) {
      const frac = (i % Math.max(1, total)) / total
      let acc = 0
      for (const [k, v] of entries) {
        acc += Number(v) / total
        if (frac <= acc) { hex = STATUS_HEX[k] ?? 0xfbbf24; break }
      }
    } else {
      hex = [0x34d399, 0xfbbf24, 0xfb923c, 0x9aa1ab][i % 4]
    }
    c.setHex(hex)
    if (props.light) c.multiplyScalar(0.82)
    fleet.setColorAt(i, c)
  }
  if (fleet.instanceColor) fleet.instanceColor.needsUpdate = true
}

const totalAssets = () => Object.values(props.statusCounts || {}).reduce((a, b) => a + (Number(b) || 0), 0)
layout(totalAssets())
applyColors(props.statusCounts)
watch(() => props.statusCounts, (v) => { layout(totalAssets()); applyColors(v) }, { deep: true })

// ── blueprint floor grid ──
const floorGrid = new THREE.GridHelper(11, 22, 0xfbbf24, 0xfb923c)
floorGrid.position.y = -0.02
floorGrid.material.transparent = true
floorGrid.material.opacity = props.light ? 0.14 : 0.10
watch(() => props.light, (l) => { floorGrid.material.opacity = l ? 0.14 : 0.10 })

// ── dust motes ──
function makeSprite() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64
  const ctx = cv.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.3, 'rgba(255,238,200,0.9)')
  g.addColorStop(1, 'rgba(251,191,36,0)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64)
  const t = new THREE.CanvasTexture(cv); t.needsUpdate = true; return t
}
const sprite = makeSprite()
function buildDust(count) {
  const geo = new THREE.BufferGeometry()
  const pos = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 8
    pos[i * 3 + 1] = Math.random() * 3.4
    pos[i * 3 + 2] = (Math.random() - 0.5) * 6
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const mat = new THREE.PointsMaterial({
    size: 0.11, map: sprite, color: 0xfbbf24, transparent: true, opacity: 0.55,
    blending: AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  })
  return new THREE.Points(geo, mat)
}
const dust = buildDust(40)

// ── animation loop: group intro + gentle drift + pointer parallax ──
const { onBeforeRender, pause } = useLoop()
let t = 0, parX = 0, parY = 0, intro = 0
const stopLoop = onBeforeRender(({ delta }) => {
  if (props.reduced) return
  t += delta
  if (intro < 1) {
    intro = Math.min(1, intro + delta * 0.9)
    if (rootRef.value) {
      const e = 1 - Math.pow(1 - intro, 3)
      rootRef.value.scale.setScalar(0.86 + 0.14 * e)
    }
  }
  if (ringRef.value) ringRef.value.rotation.z += delta * 0.25
  if (dust) { dust.rotation.y += delta * 0.02 }
  if (rootRef.value) {
    const nx = (mx.value / ww.value) * 2 - 1
    const ny = (my.value / wh.value) * 2 - 1
    parX += (nx * 0.2 - parX) * 0.045
    parY += (ny * 0.12 - parY) * 0.045
    rootRef.value.rotation.y = 0.35 + parX * 0.22 + t * 0.04
    rootRef.value.rotation.x = -0.18 - parY * 0.1
  }
})

onBeforeUnmount(() => {
  try { stopLoop?.() } catch {}
  try { pause?.() } catch {}
  try { boxGeo.dispose(); boxMat.dispose() } catch {}
  try { fleet.dispose() } catch {}
  try { dust.geometry.dispose(); dust.material.dispose() } catch {}
  try { floorGrid.geometry.dispose(); floorGrid.material.dispose() } catch {}
  try { sprite.dispose() } catch {}
})
</script>
