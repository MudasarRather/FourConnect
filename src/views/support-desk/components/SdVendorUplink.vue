<template>
  <div class="upl" ref="rootRef" :style="{ '--upl-h': height + 'px' }">
    <canvas v-show="mode === 'webgl'" ref="canvasRef" class="upl-canvas" aria-hidden="true" />

    <!-- CSS/SVG fallback: a sweeping dish + range rings + pings -->
    <div v-if="mode === 'css'" class="upl-css" aria-hidden="true">
      <svg class="upl-svg" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="uplBeam" cx="50%" cy="100%" r="80%">
            <stop offset="0%" :stop-color="hot ? 'var(--sd-vendor-overdue)' : 'var(--sd-vendor-return)'" stop-opacity="0.45" />
            <stop offset="100%" stop-color="transparent" />
          </radialGradient>
        </defs>
        <g transform="translate(200,180)">
          <ellipse rx="150" ry="46" fill="none" stroke="var(--sd-vendor-steel)" stroke-opacity="0.12" />
          <ellipse rx="100" ry="30" fill="none" stroke="var(--sd-vendor-steel)" stroke-opacity="0.16" />
          <ellipse rx="52" ry="16" fill="none" stroke="var(--sd-vendor-steel)" stroke-opacity="0.2" />
          <g class="upl-sweep"><path d="M0,0 L120,-150 L150,-120 Z" fill="url(#uplBeam)" /></g>
          <path d="M-42,-8 A46,46 0 0 1 42,-8" fill="none" stroke="var(--sd-vendor-steel)" stroke-width="3" transform="rotate(-18)" />
          <line x1="0" y1="-8" x2="0" y2="-40" stroke="var(--sd-vendor-signal)" stroke-width="2" transform="rotate(-18)" />
          <circle cx="0" cy="-40" r="3.5" fill="var(--sd-vendor-signal)" transform="rotate(-18)" />
        </g>
      </svg>
    </div>

    <!-- HUD -->
    <div class="upl-hud" aria-hidden="true">
      <div class="upl-tag" :class="{ hot }"><span class="upl-pip" /> AWAITING RETURN SIGNAL<span class="upl-dots"><i /><i /><i /></span></div>
      <div class="upl-readout">
        <span class="upl-ro-k">OLDEST WAIT</span>
        <span class="upl-ro-v sd-mono">{{ latencyLabel }}</span>
      </div>
      <div class="upl-bars"><span v-for="n in 5" :key="n" class="upl-bar" :style="{ '--d': n * 0.12 + 's' }" /></div>
      <div class="upl-lanes sd-mono">
        <span class="upl-lane">{{ pending }} awaiting</span>
        <span v-if="overdue > 0" class="upl-lane hot">{{ overdue }} overdue</span>
        <span v-if="reactivatedToday > 0" class="upl-lane back">{{ reactivatedToday }} returned</span>
      </div>
    </div>

    <div class="upl-veil" aria-hidden="true" />
  </div>
</template>

<script setup>
/*
  SdVendorUplink — Pending Vendor signature instrument ("Ground-Station Uplink", concept 03).
  A 3D parabolic dish sweeps the night sky listening for the vendor's RETURN SIGNAL. A
  volumetric search beam rotates; emerald pings streak down into the dish when hand-offs come
  back; range rings + a radar sweep-line map the ground; overdue tips the whole station red.
  ALWAYS ALIVE — ambient sweep + starfield + baseline pings run even at zero data (data only
  modulates intensity), so the stage never reads as "empty/broken". Raw three.js, disposed on
  unmount, paused offscreen/tab-hidden, re-tints on theme flip; SVG dish fallback.
*/
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  pending: { type: Number, default: 0 },
  overdue: { type: Number, default: 0 },
  reactivatedToday: { type: Number, default: 0 },
  oldestWaitMs: { type: Number, default: 0 },
  height: { type: Number, default: 340 },
  reduced: { type: Boolean, default: false },
})

const rootRef = ref(null)
const canvasRef = ref(null)
const mode = ref('css')
const hot = computed(() => (props.overdue || 0) > 0)

const readVar = (name, fb) => {
  try { const v = getComputedStyle(rootRef.value).getPropertyValue(name).trim(); return v || fb } catch { return fb }
}
const latencyLabel = computed(() => {
  const ms = Number(props.oldestWaitMs) || 0
  if (ms <= 0) return 'CLEAR'
  const h = ms / 3600000
  if (h < 1) return `${Math.max(1, Math.round(ms / 60000))}m`
  if (h < 48) return `${h.toFixed(1)}h`
  return `${Math.floor(h / 24)}d ${Math.round(h % 24)}h`
})

/* ── WebGL ── */
let three = null, renderer = null, scene = null, camera = null
let dishGroup = null, dish = null, dishWire = null, mast = null, beam = null
let stars = null, rings = [], sweepLine = null, alertRing = null, groundGroup = null
let pingGeo = null, pingMat = null, pingPts = null
let pings = []           // {ox,oy,oz, life, ttl, active}
let spawnAcc = 0
let spriteTex = null
let raf = 0, running = false, t0 = 0, last = 0, io = null, themeObs = null
const pointer = { x: 0, y: 0, tx: 0, ty: 0 }
const FOCUS = { x: 0, y: 0.25, z: 0.35 }
const MAX_PINGS = 30

function makeSprite() {
  const c = document.createElement('canvas'); c.width = c.height = 64
  const g = c.getContext('2d')
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.4, 'rgba(255,255,255,0.7)'); grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd; g.beginPath(); g.arc(32, 32, 32, 0, Math.PI * 2); g.fill()
  return new three.CanvasTexture(c)
}

async function initWebGL() {
  try {
    three = await import('three')
    const canvas = canvasRef.value; if (!canvas) return false
    renderer = new three.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

    scene = new three.Scene()
    scene.fog = new three.FogExp2(new three.Color(readVar('--sd-vendor-deep', '#2c333b')).getHex(), 0.12)
    camera = new three.PerspectiveCamera(45, 1, 0.1, 100)
    camera.position.set(0, 1.05, 4.2)

    spriteTex = makeSprite()
    const steel = new three.Color(readVar('--sd-vendor-steel', '#9aa3ac'))
    const signal = new three.Color(readVar('--sd-vendor-signal', '#fb923c'))

    // starfield
    const N = 380, sp = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) { const r = 8 + Math.random() * 10, a = Math.random() * 6.28, e = (Math.random() - 0.2) * 3.14; sp[i * 3] = Math.cos(a) * r; sp[i * 3 + 1] = Math.abs(Math.sin(e)) * r * 0.7 + 0.5; sp[i * 3 + 2] = Math.sin(a) * r - 4 }
    const sg = new three.BufferGeometry(); sg.setAttribute('position', new three.BufferAttribute(sp, 3))
    stars = new three.Points(sg, new three.PointsMaterial({ color: steel, size: 0.05, map: spriteTex, transparent: true, opacity: 0.5, depthWrite: false, blending: three.AdditiveBlending }))
    scene.add(stars)

    // ground rings + radar sweep
    groundGroup = new three.Group(); groundGroup.position.y = -0.62; scene.add(groundGroup)
    for (let r = 1; r <= 3; r++) {
      const seg = 64, arr = new Float32Array((seg + 1) * 3)
      for (let i = 0; i <= seg; i++) { const a = i / seg * 6.283; arr[i * 3] = Math.cos(a) * r * 0.85; arr[i * 3 + 1] = 0; arr[i * 3 + 2] = Math.sin(a) * r * 0.85 }
      const g = new three.BufferGeometry(); g.setAttribute('position', new three.BufferAttribute(arr, 3))
      const ring = new three.Line(g, new three.LineBasicMaterial({ color: steel, transparent: true, opacity: 0.16 }))
      groundGroup.add(ring); rings.push(ring)
    }
    const slArr = new Float32Array([0, 0, 0, 2.55, 0, 0])
    const slg = new three.BufferGeometry(); slg.setAttribute('position', new three.BufferAttribute(slArr, 3))
    sweepLine = new three.Line(slg, new three.LineBasicMaterial({ color: signal, transparent: true, opacity: 0.5 })); groundGroup.add(sweepLine)

    // dish (parabolic lathe) + wireframe + mast
    dishGroup = new three.Group(); scene.add(dishGroup)
    const prof = []; const R = 1.05, depth = 0.4
    for (let i = 0; i <= 14; i++) { const u = i / 14; prof.push(new three.Vector2(u * R, depth * u * u)) }
    const dgeo = new three.LatheGeometry(prof, 40)
    dish = new three.Mesh(dgeo, new three.MeshBasicMaterial({ color: new three.Color(readVar('--sd-vendor-deep', '#2c333b')), transparent: true, opacity: 0.55, side: three.DoubleSide }))
    dishWire = new three.LineSegments(new three.WireframeGeometry(dgeo), new three.LineBasicMaterial({ color: steel, transparent: true, opacity: 0.35 }))
    dish.add(dishWire)
    mast = new three.Mesh(new three.CylinderGeometry(0.015, 0.015, 0.42, 8), new three.MeshBasicMaterial({ color: signal }))
    mast.position.y = 0.24
    const feed = new three.Mesh(new three.SphereGeometry(0.05, 12, 12), new three.MeshBasicMaterial({ color: signal }))
    feed.position.y = 0.45
    dish.add(mast); dish.add(feed)
    dish.rotation.x = -Math.PI * 0.34
    dishGroup.add(dish)
    // pedestal
    const ped = new three.Mesh(new three.CylinderGeometry(0.12, 0.2, 0.5, 12), new three.MeshBasicMaterial({ color: new three.Color(readVar('--sd-vendor-deep', '#2c333b')), transparent: true, opacity: 0.8 }))
    ped.position.y = -0.4; dishGroup.add(ped)

    // volumetric search beam (open cone) from the feed, along the dish axis
    const bgeo = new three.ConeGeometry(0.85, 3.2, 36, 1, true)
    beam = new three.Mesh(bgeo, new three.MeshBasicMaterial({ color: signal, transparent: true, opacity: 0.07, side: three.DoubleSide, blending: three.AdditiveBlending, depthWrite: false }))
    // orient cone to point up-forward like the dish
    beam.position.set(0, 0.5, 0.55); beam.rotation.x = Math.PI * 0.16 * -1 + Math.PI // point outward
    dishGroup.add(beam)

    // overdue alert ring (hidden unless hot)
    alertRing = new three.Mesh(new three.TorusGeometry(1.3, 0.02, 8, 80), new three.MeshBasicMaterial({ color: new three.Color(readVar('--sd-vendor-overdue', '#ef4444')), transparent: true, opacity: 0, blending: three.AdditiveBlending }))
    alertRing.rotation.x = Math.PI / 2; alertRing.position.y = -0.6; scene.add(alertRing)

    // pings buffer
    const pp = new Float32Array(MAX_PINGS * 3)
    pingGeo = new three.BufferGeometry(); pingGeo.setAttribute('position', new three.BufferAttribute(pp, 3))
    pingMat = new three.PointsMaterial({ color: new three.Color(readVar('--sd-vendor-return', '#34d399')), size: 0.22, map: spriteTex, transparent: true, opacity: 0.95, depthWrite: false, blending: three.AdditiveBlending })
    pingPts = new three.Points(pingGeo, pingMat); scene.add(pingPts)
    for (let i = 0; i < MAX_PINGS; i++) pings.push({ active: false, x: 0, y: -99, z: 0, life: 0, ttl: 1 })

    resize()
    return true
  } catch (e) { console.warn('[SdVendorUplink] WebGL init failed; SVG fallback', e); return false }
}

function spawnPing() {
  const p = pings.find(p => !p.active); if (!p) return
  const a = Math.random() * 6.283, r = 3 + Math.random() * 4
  p.ox = Math.cos(a) * r; p.oy = 3.2 + Math.random() * 2.4; p.oz = Math.sin(a) * r - 3
  p.x = p.ox; p.y = p.oy; p.z = p.oz
  p.life = 0; p.ttl = 1.3 + Math.random() * 0.7; p.active = true
}

function resize() {
  if (!renderer || !rootRef.value) return
  const w = rootRef.value.clientWidth || 1, h = props.height || 340
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix()
}

function frame(ts) {
  if (!running) return
  if (!t0) { t0 = ts; last = ts }
  const t = (ts - t0) / 1000, dt = Math.min(0.05, (ts - last) / 1000); last = ts

  // camera parallax
  pointer.x += (pointer.tx - pointer.x) * 0.05; pointer.y += (pointer.ty - pointer.y) * 0.05
  camera.position.x = pointer.x * 0.7; camera.position.y = 1.05 + pointer.y * 0.4; camera.lookAt(0, 0.1, 0)

  const sweepSpeed = hot.value ? 0.9 : 0.42
  if (dishGroup) dishGroup.rotation.y = Math.sin(t * sweepSpeed) * 0.7          // dish scans azimuth
  if (dish) dish.rotation.z = Math.sin(t * 0.5) * 0.04
  if (beam) beam.material.opacity = 0.05 + 0.04 * (0.5 + 0.5 * Math.sin(t * 2.2)) + Math.min(0.05, props.pending * 0.004)
  if (sweepLine) { sweepLine.rotation.y = -t * (hot.value ? 1.6 : 0.9) }
  if (stars) stars.material.opacity = 0.4 + 0.15 * (0.5 + 0.5 * Math.sin(t * 1.3))
  if (alertRing) { const tgt = hot.value ? 0.5 + 0.4 * (0.5 + 0.5 * Math.sin(t * 4)) : 0; alertRing.material.opacity += (tgt - alertRing.material.opacity) * 0.1; alertRing.scale.setScalar(1 + (hot.value ? 0.04 * Math.sin(t * 4) : 0)) }

  // ping spawning — always ambient, faster with returns/pending
  const rate = 0.5 + (props.reactivatedToday || 0) * 0.5 + Math.min(2, (props.pending || 0) * 0.15)
  spawnAcc += dt * rate
  while (spawnAcc >= 1) { spawnPing(); spawnAcc -= 1 }

  // advance pings toward the focus
  const arr = pingGeo.attributes.position.array
  for (let i = 0; i < pings.length; i++) {
    const p = pings[i]
    if (!p.active) { arr[i * 3 + 1] = -99; continue }
    p.life += dt / p.ttl
    if (p.life >= 1) { p.active = false; arr[i * 3 + 1] = -99; continue }
    const e = p.life * p.life * (3 - 2 * p.life) // smoothstep
    arr[i * 3] = p.ox + (FOCUS.x - p.ox) * e
    arr[i * 3 + 1] = p.oy + (FOCUS.y - p.oy) * e
    arr[i * 3 + 2] = p.oz + (FOCUS.z - p.oz) * e
  }
  pingGeo.attributes.position.needsUpdate = true
  pingMat.size = 0.18 + 0.05 * (0.5 + 0.5 * Math.sin(t * 6))

  renderer.render(scene, camera)
  raf = requestAnimationFrame(frame)
}
function start() { if (running || mode.value !== 'webgl' || props.reduced) return; running = true; t0 = 0; raf = requestAnimationFrame(frame) }
function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0 }

function syncTheme() {
  if (mode.value !== 'webgl' || !three) return
  const steel = new three.Color(readVar('--sd-vendor-steel', '#9aa3ac'))
  const signal = new three.Color(readVar('--sd-vendor-signal', '#fb923c'))
  const ret = new three.Color(readVar('--sd-vendor-return', '#34d399'))
  const red = new three.Color(readVar('--sd-vendor-overdue', '#ef4444'))
  if (dishWire) dishWire.material.color = steel
  if (mast) mast.material.color = signal
  if (beam) beam.material.color = hot.value ? red : signal
  if (sweepLine) sweepLine.material.color = hot.value ? red : signal
  rings.forEach(r => (r.material.color = steel))
  if (stars) stars.material.color = steel
  if (pingMat) pingMat.color = ret
  if (alertRing) alertRing.material.color = red
  if (scene?.fog) scene.fog.color = new three.Color(readVar('--sd-vendor-deep', '#2c333b'))
}

const onResize = () => resize()
const onVis = () => { if (document.hidden) stop(); else start() }
const onPointer = (e) => { const r = rootRef.value?.getBoundingClientRect(); if (!r) return; pointer.tx = ((e.clientX - r.left) / r.width - 0.5) * 2; pointer.ty = -((e.clientY - r.top) / r.height - 0.5) * 2 }
const onLeave = () => { pointer.tx = 0; pointer.ty = 0 }

onMounted(async () => {
  if (!props.reduced && (window.WebGLRenderingContext || window.WebGL2RenderingContext)) {
    const ok = await initWebGL(); if (ok) mode.value = 'webgl'
  }
  if (mode.value === 'webgl') {
    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVis)
    rootRef.value?.addEventListener('pointermove', onPointer)
    rootRef.value?.addEventListener('pointerleave', onLeave)
    if (typeof IntersectionObserver !== 'undefined' && rootRef.value) {
      io = new IntersectionObserver((es) => es.forEach(e => (e.isIntersecting ? start() : stop())), { threshold: 0.05 }); io.observe(rootRef.value)
    } else start()
    themeObs = new MutationObserver(() => syncTheme()); themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  }
})
onBeforeUnmount(() => {
  stop()
  window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVis)
  rootRef.value?.removeEventListener('pointermove', onPointer); rootRef.value?.removeEventListener('pointerleave', onLeave)
  io?.disconnect(); themeObs?.disconnect()
  try {
    pingGeo?.dispose(); pingMat?.dispose(); spriteTex?.dispose()
    dish?.geometry?.dispose(); dish?.material?.dispose(); dishWire?.geometry?.dispose(); dishWire?.material?.dispose()
    beam?.geometry?.dispose(); beam?.material?.dispose(); alertRing?.geometry?.dispose(); alertRing?.material?.dispose()
    stars?.geometry?.dispose(); stars?.material?.dispose()
    rings.forEach(r => { r.geometry.dispose(); r.material.dispose() })
    renderer?.dispose()
  } catch { /* noop */ }
})
watch(() => [props.overdue, props.pending, props.reactivatedToday], syncTheme)
</script>

<style scoped>
.upl { position: relative; width: 100%; height: var(--upl-h, 340px); overflow: hidden; border-radius: inherit; }
.upl-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }

.upl-css { position: absolute; inset: 0; display: grid; place-items: center; }
.upl-svg { width: 100%; height: 100%; }
.upl-sweep { transform-origin: 0 0; animation: upl-scan 4s ease-in-out infinite; }
@keyframes upl-scan { 0%, 100% { transform: rotate(-30deg); } 50% { transform: rotate(30deg); } }

.upl-hud { position: absolute; inset: 0; pointer-events: none; }
.upl-tag { position: absolute; top: 16px; left: 16px; display: inline-flex; align-items: center; gap: 7px; font-family: var(--sd-mono); font-size: 10px; font-weight: 800; letter-spacing: 0.16em; color: var(--sd-vendor-return); background: var(--sd-surface-glass); border: 1px solid var(--sd-border); padding: 5px 11px; border-radius: 999px; backdrop-filter: blur(6px); }
.upl-tag.hot { color: var(--sd-vendor-overdue); border-color: var(--sd-vendor-overdue-soft); }
.upl-pip { width: 7px; height: 7px; border-radius: 50%; background: currentColor; box-shadow: 0 0 9px currentColor; animation: upl-pip 1.6s ease-in-out infinite; }
.upl-dots { display: inline-flex; gap: 3px; }
.upl-dots i { width: 3px; height: 3px; border-radius: 50%; background: currentColor; opacity: 0.4; animation: upl-dot 1.4s ease-in-out infinite; }
.upl-dots i:nth-child(2) { animation-delay: 0.2s; } .upl-dots i:nth-child(3) { animation-delay: 0.4s; }
.upl-readout { position: absolute; top: 15px; right: 16px; text-align: right; display: flex; flex-direction: column; gap: 1px; }
.upl-ro-k { font-size: 8.5px; font-weight: 800; letter-spacing: 0.2em; color: var(--sd-text-dim); font-family: var(--sd-mono); }
.upl-ro-v { font-size: 17px; font-weight: 800; color: var(--sd-vendor-signal); text-shadow: 0 0 16px var(--sd-vendor-signal-soft); }
.upl-bars { position: absolute; right: 16px; top: 52px; display: flex; align-items: flex-end; gap: 3px; height: 22px; }
.upl-bar { width: 4px; border-radius: 2px; background: var(--sd-vendor-return); opacity: 0.7; animation: upl-eq 1.2s ease-in-out infinite; animation-delay: var(--d); height: 40%; }
.upl-lanes { position: absolute; left: 16px; bottom: 14px; display: flex; gap: 7px; flex-wrap: wrap; }
.upl-lane { font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 999px; color: var(--sd-text-muted); background: var(--sd-surface-glass); border: 1px solid var(--sd-border); backdrop-filter: blur(6px); }
.upl-lane.hot { color: var(--sd-vendor-overdue); border-color: var(--sd-vendor-overdue-soft); }
.upl-lane.back { color: var(--sd-vendor-return); border-color: color-mix(in srgb, var(--sd-vendor-return) 30%, transparent); }

.upl-veil { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(80% 70% at 50% 60%, transparent 45%, color-mix(in srgb, var(--sd-canvas) 55%, transparent) 100%); }

@keyframes upl-pip { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(0.7); opacity: 0.5; } }
@keyframes upl-dot { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
@keyframes upl-eq { 0%, 100% { height: 30%; } 50% { height: 95%; } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .upl-sweep,
  html:not([data-cinematic="on"]) .upl-pip,
  html:not([data-cinematic="on"]) .upl-dots i,
  html:not([data-cinematic="on"]) .upl-bar { animation: none; }
}
</style>
