<template>
  <!-- SIGNAL FORGE — the hero's signature instrument, a real WebGL (three.js) scene.
       Raw support "signals" (a depth-sorted particle stream) sweep in from the left,
       caught by a forge core's gravity, and spiral through tilted orbiting rings into a
       luminous accretion vortex where they're forged into the ticket. Additive bloom +
       perspective depth + pointer parallax = game/blender-grade. The core charges with
       `completion` and LOCKS emerald (+ shock ring) on `ready`. Renders inside a dark
       display panel so the additive glow is brilliant on BOTH themes. -->
  <div class="sd-forge" ref="wrapEl" @pointermove="onMove" @pointerleave="onLeave">
    <canvas ref="cv" class="forge-cv" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'

const props = defineProps({
  completion: { type: Number, default: 0 },
  ready: { type: Boolean, default: false },
})

const wrapEl = ref(null)
const cv = ref(null)
let renderer, scene, cam, group, raf = 0, ro = null, io = null
let geo, posArr, vel, seedY, pcol, points, mat
let coreSprite, glowTex, rings = [], shock = null, shockMat = null
let W = 0, H = 0, VH = 1, xHalf = 1, readyAt = -1, t0 = 0
const N = 2200
const core = new THREE.Vector3(0, 0, 0)
let px = 0.5, py = 0.5, tx = 0.5, ty = 0.5  // pointer parallax (smoothed)

const AMBER = [new THREE.Color('#ffb347'), new THREE.Color('#f59e0b'), new THREE.Color('#fb923c'), new THREE.Color('#ffd27a')]
const EMER = [new THREE.Color('#34d399'), new THREE.Color('#10b981'), new THREE.Color('#6ee7b7'), new THREE.Color('#a7f3d0')]

const reduced = () => document.documentElement.getAttribute('data-cinematic') !== 'on'
  && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function glowTexture() {
  const s = 64, c = document.createElement('canvas'); c.width = c.height = s
  const x = c.getContext('2d')
  const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.65)')
  g.addColorStop(0.55, 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = g; x.fillRect(0, 0, s, s)
  const t = new THREE.CanvasTexture(c); return t
}

function spawn(i, fresh) {
  // enter from the left band; bias toward mid-height
  posArr[i * 3] = -xHalf * (0.9 + Math.random() * 0.5)
  posArr[i * 3 + 1] = (Math.random() - 0.5) * VH * 1.7
  posArr[i * 3 + 2] = (Math.random() - 0.5) * 1.5
  vel[i * 3] = 0.004 + Math.random() * 0.006
  vel[i * 3 + 1] = (Math.random() - 0.5) * 0.004
  vel[i * 3 + 2] = (Math.random() - 0.5) * 0.002
  if (fresh) {
    const c = AMBER[(Math.random() * AMBER.length) | 0]
    pcol[i * 3] = c.r; pcol[i * 3 + 1] = c.g; pcol[i * 3 + 2] = c.b
    seedY[i] = 0.5 + Math.random() * 1.2  // per-particle size weight
  }
}

function build() {
  const el = wrapEl.value, c = cv.value
  W = el.clientWidth; H = el.clientHeight
  renderer = new THREE.WebGLRenderer({ canvas: c, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
  renderer.setSize(W, H, false)

  scene = new THREE.Scene()
  group = new THREE.Group(); scene.add(group)
  const fov = 42, D = 6
  cam = new THREE.PerspectiveCamera(fov, W / H, 0.1, 100)
  cam.position.z = D
  VH = Math.tan((fov * Math.PI) / 360) * D
  xHalf = VH * (W / H)
  core.set(xHalf * 0.52, 0, 0)

  // particles
  posArr = new Float32Array(N * 3); vel = new Float32Array(N * 3); pcol = new Float32Array(N * 3); seedY = new Float32Array(N)
  for (let i = 0; i < N; i++) spawn(i, true)
  geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(pcol, 3))
  glowTex = glowTexture()
  mat = new THREE.PointsMaterial({ size: 0.085, map: glowTex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, opacity: 0.95 })
  points = new THREE.Points(geo, mat); group.add(points)

  // forge core (additive glow sprite)
  coreSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffc24d, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }))
  coreSprite.position.copy(core); coreSprite.scale.setScalar(1.1); group.add(coreSprite)

  // tilted orbiting rings
  const ringDefs = [{ r: 0.9, tube: 0.012, rx: 1.15, ry: 0.4 }, { r: 1.35, tube: 0.009, rx: -0.7, ry: 1.0 }, { r: 1.8, tube: 0.007, rx: 0.5, ry: -0.6 }]
  rings = ringDefs.map(d => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(d.r, d.tube, 8, 96), new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }))
    m.position.copy(core); m.rotation.x = d.rx; m.rotation.y = d.ry; m.userData.spin = (0.002 + Math.random() * 0.004) * (Math.random() < 0.5 ? -1 : 1)
    group.add(m); return m
  })

  // ready shock ring
  shockMat = new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  shock = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.02, 8, 96), shockMat)
  shock.position.copy(core); shock.rotation.x = Math.PI / 2.2; group.add(shock)
}

function tint(ready) {
  const pal = ready ? EMER : AMBER
  for (let i = 0; i < N; i++) { const c = pal[(seedY[i] * 7 | 0) % pal.length]; pcol[i * 3] = c.r; pcol[i * 3 + 1] = c.g; pcol[i * 3 + 2] = c.b }
  geo.attributes.color.needsUpdate = true
  coreSprite.material.color.set(ready ? 0x6ee7b7 : 0xffc24d)
  rings.forEach(r => r.material.color.set(ready ? 0x10b981 : 0xf59e0b))
}

function frame(now) {
  raf = requestAnimationFrame(frame)
  const dt = Math.min(2.2, (now - (t0 || now)) / 16.67); t0 = now
  const speed = (0.7 + props.completion * 1.1) * dt
  const swirl = (0.05 + props.completion * 0.06)
  // smooth parallax
  px += (tx - px) * 0.06; py += (ty - py) * 0.06
  group.rotation.y = (px - 0.5) * 0.5
  group.rotation.x = (py - 0.5) * -0.3

  for (let i = 0; i < N; i++) {
    const ix = i * 3
    let x = posArr[ix], y = posArr[ix + 1], z = posArr[ix + 2]
    const dx = core.x - x, dy = core.y - y, dz = core.z - z
    const d = Math.hypot(dx, dy, dz) || 1
    // gravity inward
    const pull = 0.0016 / Math.max(d * d, 0.05)
    vel[ix] += (dx / d) * pull; vel[ix + 1] += (dy / d) * pull; vel[ix + 2] += (dz / d) * pull * 0.5
    // tangential swirl (around Z axis) → accretion spiral, stronger near core
    const sw = swirl * (1 - Math.min(1, d / (xHalf * 1.4)))
    vel[ix] += (-dy / d) * sw; vel[ix + 1] += (dx / d) * sw
    // integrate
    vel[ix] *= 0.965; vel[ix + 1] *= 0.965; vel[ix + 2] *= 0.96
    x += vel[ix] * speed * 26; y += vel[ix + 1] * speed * 26; z += vel[ix + 2] * speed * 26
    if (d < 0.16 || x > xHalf * 1.2 || Math.abs(y) > VH * 1.6) { spawn(i, false); continue }
    posArr[ix] = x; posArr[ix + 1] = y; posArr[ix + 2] = z
  }
  geo.attributes.position.needsUpdate = true

  // core pulse + rings
  const pulse = 1 + Math.sin(now * 0.004) * 0.12 + props.completion * 0.5
  coreSprite.scale.setScalar((props.ready ? 1.5 : 1.05) * pulse)
  rings.forEach(r => { r.rotation.z += r.userData.spin * dt; r.material.opacity = 0.32 + props.completion * 0.3 })

  // shock on ready
  if (props.ready && readyAt > 0) {
    const age = (now - readyAt) / 850
    if (age <= 1) { const s = 1 + age * 3.2; shock.scale.setScalar(s); shockMat.opacity = 0.7 * (1 - age) }
    else shockMat.opacity = 0
  } else shockMat.opacity = 0

  renderer.render(scene, cam)
}

function start() { cancelAnimationFrame(raf); if (reduced()) { renderer && renderer.render(scene, cam); return } t0 = 0; raf = requestAnimationFrame(frame) }
function stop() { cancelAnimationFrame(raf) }

function resize() {
  if (!renderer) return
  W = wrapEl.value.clientWidth; H = wrapEl.value.clientHeight
  renderer.setSize(W, H, false)
  cam.aspect = W / H; cam.updateProjectionMatrix()
  xHalf = VH * (W / H); core.set(xHalf * 0.52, 0, 0)
  coreSprite.position.copy(core); rings.forEach(r => r.position.copy(core)); shock.position.copy(core)
}

const onMove = (e) => { const r = wrapEl.value.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width; ty = (e.clientY - r.top) / r.height }
const onLeave = () => { tx = 0.5; ty = 0.5 }

watch(() => props.ready, (v) => { if (!geo) return; tint(v); if (v) readyAt = performance.now() })

onMounted(() => {
  build()
  if ('ResizeObserver' in window) { ro = new ResizeObserver(resize); ro.observe(wrapEl.value) }
  if ('IntersectionObserver' in window) { io = new IntersectionObserver(([e]) => { e.isIntersecting ? start() : stop() }, { threshold: 0.01 }); io.observe(wrapEl.value) }
  start()
})
onBeforeUnmount(() => {
  stop(); ro?.disconnect(); io?.disconnect()
  geo?.dispose(); mat?.dispose(); glowTex?.dispose()
  rings.forEach(r => { r.geometry.dispose(); r.material.dispose() })
  shock?.geometry.dispose(); shockMat?.dispose(); coreSprite?.material.dispose()
  renderer?.dispose()
})
</script>

<style scoped>
.sd-forge { position: absolute; inset: 0; pointer-events: auto; }
.forge-cv { display: block; width: 100%; height: 100%; }
</style>
