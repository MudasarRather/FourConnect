<template>
  <div class="vrs" ref="rootRef" :style="{ '--vrs-h': height + 'px' }">
    <!-- WebGL deep-space relay -->
    <canvas v-show="mode === 'webgl'" ref="canvasRef" class="vrs-canvas" aria-hidden="true" />

    <!-- CSS/SVG fallback (no-WebGL / reduced-motion): a 2-node relay bridge -->
    <div v-if="mode === 'css'" class="vrs-css" aria-hidden="true">
      <svg class="vrs-svg" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="vrsHub" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="var(--sd-vendor-signal)" stop-opacity="1" />
            <stop offset="100%" stop-color="var(--sd-vendor-signal)" stop-opacity="0" />
          </radialGradient>
          <radialGradient id="vrsVen" cx="50%" cy="50%" r="50%">
            <stop offset="0%" :stop-color="overdue > 0 ? 'var(--sd-vendor-overdue)' : 'var(--sd-vendor-steel)'" stop-opacity="1" />
            <stop offset="100%" :stop-color="overdue > 0 ? 'var(--sd-vendor-overdue)' : 'var(--sd-vendor-steel)'" stop-opacity="0" />
          </radialGradient>
        </defs>
        <path d="M70,130 C160,40 240,40 330,90" fill="none" stroke="var(--sd-vendor-steel)" stroke-opacity="0.28" stroke-width="1.5" />
        <path class="vrs-flow" d="M70,130 C160,40 240,40 330,90" fill="none"
              stroke="var(--sd-vendor-signal)" stroke-width="2" stroke-linecap="round"
              stroke-dasharray="4 18" />
        <path class="vrs-flow-return" d="M330,90 C240,40 160,40 70,130" fill="none"
              stroke="var(--sd-vendor-return)" stroke-width="2" stroke-linecap="round"
              stroke-dasharray="3 26" stroke-opacity="0.85" />
        <circle cx="70" cy="130" r="26" fill="url(#vrsHub)" />
        <circle cx="70" cy="130" r="9" fill="var(--sd-vendor-signal)" class="vrs-node-core" />
        <circle cx="330" cy="90" r="24" fill="url(#vrsVen)" />
        <circle cx="330" cy="90" r="8" :fill="overdue > 0 ? 'var(--sd-vendor-overdue)' : 'var(--sd-vendor-steel)'"
                class="vrs-node-core" :class="{ hot: overdue > 0 }" />
      </svg>
    </div>

    <!-- HUD overlay (crisp, theme-aware; over both webgl + css) -->
    <div class="vrs-hud" aria-hidden="true">
      <div class="vrs-tag vrs-tag--desk"><span class="vrs-dot" /> DESK</div>
      <div class="vrs-tag vrs-tag--vendor" :class="{ hot: overdue > 0 }"><span class="vrs-dot" /> VENDOR</div>
      <div class="vrs-readout">
        <span class="vrs-ro-k">ROUND-TRIP</span>
        <span class="vrs-ro-v sd-mono">{{ latencyLabel }}</span>
      </div>
      <div class="vrs-lanes sd-mono">
        <span class="vrs-lane">{{ pending }} in flight</span>
        <span v-if="overdue > 0" class="vrs-lane hot">{{ overdue }} overdue</span>
        <span v-if="reactivatedToday > 0" class="vrs-lane back">{{ reactivatedToday }} back today</span>
      </div>
    </div>

    <div class="vrs-veil" aria-hidden="true" />
    <div class="vrs-aura" :class="{ hot: overdue > 0 }" aria-hidden="true" />
  </div>
</template>

<script setup>
/*
  SdVendorRelayStation — the Pending Vendor "Vendor Relay Station" signature instrument.
  A deep-space uplink: a warm amber DESK hub tethered across 3D space to cold steel VENDOR
  satellites. Data-packet sprites stream hub→vendor along curved relay conduits (TubeGeometry
  on CatmullRom curves); emerald return pulses fire vendor→hub when a hand-off comes back.
  One in-flight packet per waiting ticket; overdue packets burn red. Depth fog + additive
  bloom + pointer-parallax camera. Raw three.js, disposed on unmount, paused offscreen /
  tab-hidden, re-tints on theme flip. SVG bridge fallback for no-WebGL / OS reduce-motion.
  Distinct from every sibling (globe/radar/hourglass/gravity-well/pipeline/conveyor).
*/
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  pending: { type: Number, default: 0 },          // in-flight packets (waiting tickets)
  overdue: { type: Number, default: 0 },          // packets past vendor ETA → burn red
  dispatchedToday: { type: Number, default: 0 },
  reactivatedToday: { type: Number, default: 0 }, // return pulses
  oldestWaitMs: { type: Number, default: 0 },     // round-trip latency read-out
  vendors: { type: Array, default: () => [] },    // [{vendor_name, open, overdue}] → satellites
  height: { type: Number, default: 300 },
  reduced: { type: Boolean, default: false },
})

const MAX_PACKETS = 44
const MAX_LANES = 4

const rootRef = ref(null)
const canvasRef = ref(null)
const mode = ref('css')

const readVar = (name, fb) => {
  try { const v = getComputedStyle(rootRef.value).getPropertyValue(name).trim(); return v || fb } catch { return fb }
}

/* ── round-trip latency label ── */
const latencyLabel = computed(() => {
  const ms = Number(props.oldestWaitMs) || 0
  if (ms <= 0) return '—'
  const h = ms / 3600000
  if (h < 1) return `${Math.max(1, Math.round(ms / 60000))}m`
  if (h < 48) return `${h.toFixed(1)}h`
  return `${Math.floor(h / 24)}d ${Math.round(h % 24)}h`
})

/* ── lanes = distinct vendor satellites (1-4). Falls back to one generic satellite. ── */
function laneModel() {
  const vs = (props.vendors || []).filter(v => (v.open || 0) > 0).slice(0, MAX_LANES)
  if (vs.length) return vs.map(v => ({ open: v.open || 0, overdue: v.overdue || 0 }))
  return [{ open: Math.max(1, props.pending || 1), overdue: props.overdue || 0 }]
}

/* ── WebGL ── */
let three = null, renderer = null, scene = null, camera = null, group = null
let raf = 0, running = false, t0 = 0, io = null, themeObs = null
let spriteTex = null
let hub = null, hubShell = null
const sats = []          // { mesh, shell, curve, tube }
let packetGeo = null, packetMat = null, packets = null
let packetMeta = []      // { lane, u0, speed, overdue }
let returnGeo = null, returnMat = null, returns = null
let returnMeta = []
let _v = null   // reusable Vector3 target for curve sampling (created once three loads)
const pointer = { x: 0, y: 0, tx: 0, ty: 0 }

function makeSprite() {
  const c = document.createElement('canvas'); c.width = c.height = 64
  const g = c.getContext('2d')
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.4, 'rgba(255,255,255,0.75)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd; g.beginPath(); g.arc(32, 32, 32, 0, Math.PI * 2); g.fill()
  return new three.CanvasTexture(c)
}

function buildLanes() {
  // dispose any prior lanes
  sats.forEach(s => {
    group.remove(s.mesh); group.remove(s.shell); group.remove(s.tube)
    s.mesh.geometry.dispose(); s.mesh.material.dispose()
    s.shell.geometry.dispose(); s.shell.material.dispose()
    s.tube.geometry.dispose(); s.tube.material.dispose()
  })
  sats.length = 0
  const model = laneModel()
  const n = model.length
  const steel = new three.Color(readVar('--sd-vendor-steel', '#9aa3ac'))
  const overdueC = new three.Color(readVar('--sd-vendor-overdue', '#ef4444'))
  for (let i = 0; i < n; i++) {
    // vendor node position — right side, fanned vertically by lane
    const spread = n > 1 ? (i / (n - 1) - 0.5) : 0
    const vp = new three.Vector3(1.75, spread * 1.35, spread * -0.5)
    const hot = (model[i].overdue || 0) > 0
    const col = hot ? overdueC : steel
    const mesh = new three.Mesh(
      new three.IcosahedronGeometry(0.16 + Math.min(0.12, (model[i].open || 0) * 0.01), 1),
      new three.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.92 }),
    )
    mesh.position.copy(vp)
    group.add(mesh)
    const shell = new three.Mesh(
      new three.SphereGeometry(0.34, 20, 20),
      new three.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.08, blending: three.AdditiveBlending, side: three.BackSide }),
    )
    shell.position.copy(vp)
    group.add(shell)
    // relay conduit — a CatmullRom arc bowing up toward deep space
    const hubP = new three.Vector3(-1.75, -0.15, 0)
    const mid = new three.Vector3((hubP.x + vp.x) / 2, Math.max(hubP.y, vp.y) + 0.95, (hubP.z + vp.z) / 2 + 0.4)
    const curve = new three.CatmullRomCurve3([hubP, mid, vp])
    const tube = new three.Mesh(
      new three.TubeGeometry(curve, 60, 0.012, 6, false),
      new three.MeshBasicMaterial({ color: steel, transparent: true, opacity: 0.14, blending: three.AdditiveBlending }),
    )
    group.add(tube)
    sats.push({ mesh, shell, curve, hot })
  }
}

function buildPackets() {
  if (packets) { group.remove(packets); packetGeo.dispose(); packetMat.dispose() }
  const total = Math.min(MAX_PACKETS, Math.max(0, Math.round(props.pending || 0)))
  const N = Math.max(1, total)
  const pos = new Float32Array(N * 3)
  const col = new Float32Array(N * 3)
  packetMeta = []
  const steel = new three.Color(readVar('--sd-vendor-steel', '#9aa3ac'))
  const signal = new three.Color(readVar('--sd-vendor-signal', '#fb923c'))
  const overdueC = new three.Color(readVar('--sd-vendor-overdue', '#ef4444'))
  const nLanes = Math.max(1, sats.length)
  const overdueN = Math.min(N, Math.round(props.overdue || 0))
  for (let i = 0; i < N; i++) {
    const lane = i % nLanes
    const isOverdue = i < overdueN
    const u0 = (i / N + (i % 3) * 0.11) % 1
    packetMeta.push({ lane, u0, speed: 0.05 + (i % 5) * 0.012, overdue: isOverdue })
    let c
    if (isOverdue) c = overdueC
    else { const f = i / N; c = steel.clone().lerp(signal, 0.25 + f * 0.6) }
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b
    pos[i * 3] = -1.75; pos[i * 3 + 1] = -0.15; pos[i * 3 + 2] = 0
  }
  packetGeo = new three.BufferGeometry()
  packetGeo.setAttribute('position', new three.BufferAttribute(pos, 3))
  packetGeo.setAttribute('color', new three.BufferAttribute(col, 3))
  packetMat = new three.PointsMaterial({
    size: 0.15, map: spriteTex, vertexColors: true, transparent: true,
    depthWrite: false, blending: three.AdditiveBlending, sizeAttenuation: true,
    opacity: total > 0 ? 1 : 0,
  })
  packets = new three.Points(packetGeo, packetMat)
  group.add(packets)
}

function buildReturns() {
  if (returns) { group.remove(returns); returnGeo.dispose(); returnMat.dispose() }
  const N = Math.min(10, Math.max(1, Math.round(props.reactivatedToday || 0)))
  const pos = new Float32Array(N * 3)
  returnMeta = []
  for (let i = 0; i < N; i++) {
    returnMeta.push({ lane: i % Math.max(1, sats.length), u0: (i / N) % 1, speed: 0.14 + (i % 3) * 0.03 })
    pos[i * 3] = 1.75; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = 0
  }
  returnGeo = new three.BufferGeometry()
  returnGeo.setAttribute('position', new three.BufferAttribute(pos, 3))
  const ret = new three.Color(readVar('--sd-vendor-return', '#34d399'))
  returnMat = new three.PointsMaterial({
    size: 0.24, map: spriteTex, color: ret, transparent: true,
    depthWrite: false, blending: three.AdditiveBlending, sizeAttenuation: true,
    opacity: (props.reactivatedToday || 0) > 0 ? 0.95 : 0,
  })
  returns = new three.Points(returnGeo, returnMat)
  group.add(returns)
}

async function initWebGL() {
  try {
    three = await import('three')
    const canvas = canvasRef.value; if (!canvas) return false
    renderer = new three.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

    _v = new three.Vector3()
    scene = new three.Scene()
    scene.fog = new three.FogExp2(new three.Color(readVar('--sd-vendor-deep', '#2c333b')).getHex(), 0.14)
    camera = new three.PerspectiveCamera(46, 1, 0.1, 100)
    camera.position.set(0, 0.2, 4.4)

    group = new three.Group(); scene.add(group)

    spriteTex = makeSprite()

    // DESK hub (amber core + additive shell)
    const signal = new three.Color(readVar('--sd-vendor-signal', '#fb923c'))
    hub = new three.Mesh(
      new three.IcosahedronGeometry(0.28, 2),
      new three.MeshBasicMaterial({ color: signal, transparent: true, opacity: 0.95 }),
    )
    hub.position.set(-1.75, -0.15, 0)
    group.add(hub)
    hubShell = new three.Mesh(
      new three.SphereGeometry(0.52, 24, 24),
      new three.MeshBasicMaterial({ color: signal, transparent: true, opacity: 0.1, blending: three.AdditiveBlending, side: three.BackSide }),
    )
    hubShell.position.copy(hub.position)
    group.add(hubShell)

    buildLanes()
    buildPackets()
    buildReturns()

    resize()
    return true
  } catch (e) {
    console.warn('[SdVendorRelayStation] WebGL init failed; SVG fallback', e)
    return false
  }
}

function resize() {
  if (!renderer || !rootRef.value) return
  const w = rootRef.value.clientWidth || 1
  const h = props.height || 300
  renderer.setSize(w, h, false)
  camera.aspect = w / h; camera.updateProjectionMatrix()
}

function frame(ts) {
  if (!running) return
  if (!t0) t0 = ts
  const t = (ts - t0) / 1000

  // pointer-parallax camera drift
  pointer.x += (pointer.tx - pointer.x) * 0.05
  pointer.y += (pointer.ty - pointer.y) * 0.05
  camera.position.x = pointer.x * 0.6
  camera.position.y = 0.2 + pointer.y * 0.4
  camera.lookAt(0, 0, 0)

  // hub breathing + slow spin
  if (hub) { hub.rotation.y = t * 0.4; const p = 0.9 + 0.1 * Math.sin(t * 2.2); hub.scale.setScalar(p) }
  if (hubShell) hubShell.material.opacity = 0.08 + 0.05 * (0.5 + 0.5 * Math.sin(t * 1.6))
  sats.forEach((s, i) => {
    s.mesh.rotation.y = t * 0.3
    s.mesh.position.y += Math.sin(t * 1.2 + i) * 0.0009
    s.shell.position.copy(s.mesh.position)
    if (s.hot) s.shell.material.opacity = 0.08 + 0.08 * (0.5 + 0.5 * Math.sin(t * 4 + i))
  })

  // outbound packets ride the lane curves hub→vendor
  if (packets && packetGeo) {
    const arr = packetGeo.attributes.position.array
    for (let i = 0; i < packetMeta.length; i++) {
      const m = packetMeta[i]
      const s = sats[m.lane] || sats[0]
      const u = (m.u0 + t * m.speed) % 1
      s.curve.getPointAt(u, _v)
      arr[i * 3] = _v.x; arr[i * 3 + 1] = _v.y; arr[i * 3 + 2] = _v.z
    }
    packetGeo.attributes.position.needsUpdate = true
    packetMat.size = 0.15 + 0.03 * (0.5 + 0.5 * Math.sin(t * 3))
  }
  // return pulses ride the curves in reverse vendor→hub
  if (returns && returnGeo && (props.reactivatedToday || 0) > 0) {
    const arr = returnGeo.attributes.position.array
    for (let i = 0; i < returnMeta.length; i++) {
      const m = returnMeta[i]
      const s = sats[m.lane] || sats[0]
      const u = 1 - ((m.u0 + t * m.speed) % 1)
      s.curve.getPointAt(u, _v)
      arr[i * 3] = _v.x; arr[i * 3 + 1] = _v.y; arr[i * 3 + 2] = _v.z
    }
    returnGeo.attributes.position.needsUpdate = true
  }

  group.rotation.y = Math.sin(t * 0.12) * 0.06
  renderer.render(scene, camera)
  raf = requestAnimationFrame(frame)
}
function start() { if (running || mode.value !== 'webgl' || props.reduced) return; running = true; t0 = 0; raf = requestAnimationFrame(frame) }
function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0 }

function syncData() {
  if (mode.value === 'webgl' && three && group) {
    buildLanes(); buildPackets(); buildReturns()
    const signal = new three.Color(readVar('--sd-vendor-signal', '#fb923c'))
    if (hub) hub.material.color = signal
    if (hubShell) hubShell.material.color = signal
    if (scene.fog) scene.fog.color = new three.Color(readVar('--sd-vendor-deep', '#2c333b'))
  }
}

const onResize = () => resize()
const onVis = () => { if (document.hidden) stop(); else start() }
const onPointer = (e) => {
  const r = rootRef.value?.getBoundingClientRect(); if (!r) return
  pointer.tx = ((e.clientX - r.left) / r.width - 0.5) * 2
  pointer.ty = -((e.clientY - r.top) / r.height - 0.5) * 2
}
const onLeave = () => { pointer.tx = 0; pointer.ty = 0 }

onMounted(async () => {
  if (!props.reduced && (window.WebGLRenderingContext || window.WebGL2RenderingContext)) {
    const ok = await initWebGL()
    if (ok) mode.value = 'webgl'
  }
  if (mode.value === 'webgl') {
    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVis)
    rootRef.value?.addEventListener('pointermove', onPointer)
    rootRef.value?.addEventListener('pointerleave', onLeave)
    if (typeof IntersectionObserver !== 'undefined' && rootRef.value) {
      io = new IntersectionObserver((es) => es.forEach(e => (e.isIntersecting ? start() : stop())), { threshold: 0.05 })
      io.observe(rootRef.value)
    } else { start() }
    themeObs = new MutationObserver(() => syncData())
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  }
})

onBeforeUnmount(() => {
  stop()
  window.removeEventListener('resize', onResize)
  document.removeEventListener('visibilitychange', onVis)
  rootRef.value?.removeEventListener('pointermove', onPointer)
  rootRef.value?.removeEventListener('pointerleave', onLeave)
  io?.disconnect(); themeObs?.disconnect()
  try {
    packetGeo?.dispose(); packetMat?.dispose()
    returnGeo?.dispose(); returnMat?.dispose()
    spriteTex?.dispose()
    hub?.geometry?.dispose(); hub?.material?.dispose()
    hubShell?.geometry?.dispose(); hubShell?.material?.dispose()
    sats.forEach(s => {
      s.mesh.geometry.dispose(); s.mesh.material.dispose()
      s.shell.geometry.dispose(); s.shell.material.dispose()
    })
    renderer?.dispose()
  } catch { /* noop */ }
})

watch(() => [props.pending, props.overdue, props.reactivatedToday, props.vendors], syncData, { deep: true })
</script>

<style scoped>
.vrs { position: relative; width: 100%; height: var(--vrs-h, 300px); overflow: hidden; border-radius: inherit; }
.vrs-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }

/* SVG fallback */
.vrs-css { position: absolute; inset: 0; display: grid; place-items: center; }
.vrs-svg { width: 100%; height: 100%; }
.vrs-flow { animation: sd-relay-flow 2.4s linear infinite; filter: drop-shadow(0 0 5px var(--sd-vendor-signal)); }
.vrs-flow-return { animation: sd-relay-return 3.6s linear infinite; }
.vrs-node-core { animation: sd-relay-pulse 3s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
.vrs-node-core.hot { animation-duration: 1.4s; }

/* HUD */
.vrs-hud { position: absolute; inset: 0; pointer-events: none; }
.vrs-tag { position: absolute; display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.16em; padding: 4px 9px; border-radius: 999px; background: var(--sd-surface-glass);
  border: 1px solid var(--sd-border); color: var(--sd-text-secondary); backdrop-filter: blur(6px); }
.vrs-tag .vrs-dot { width: 7px; height: 7px; border-radius: 50%; }
.vrs-tag--desk { left: 14px; bottom: 16px; }
.vrs-tag--desk .vrs-dot { background: var(--sd-vendor-signal); box-shadow: 0 0 9px var(--sd-vendor-signal); }
.vrs-tag--vendor { right: 14px; top: 16px; }
.vrs-tag--vendor .vrs-dot { background: var(--sd-vendor-steel); box-shadow: 0 0 9px var(--sd-vendor-steel); }
.vrs-tag--vendor.hot { color: var(--sd-vendor-overdue); border-color: var(--sd-vendor-overdue-soft); }
.vrs-tag--vendor.hot .vrs-dot { background: var(--sd-vendor-overdue); box-shadow: 0 0 12px var(--sd-vendor-overdue); animation: sd-relay-pulse 1.4s ease-in-out infinite; }

.vrs-readout { position: absolute; left: 50%; top: 14px; transform: translateX(-50%); text-align: center;
  display: flex; flex-direction: column; gap: 1px; }
.vrs-ro-k { font-size: 8.5px; font-weight: 800; letter-spacing: 0.22em; color: var(--sd-text-dim); }
.vrs-ro-v { font-size: 17px; font-weight: 800; color: var(--sd-vendor-signal); text-shadow: 0 0 16px var(--sd-vendor-signal-soft); }

.vrs-lanes { position: absolute; left: 50%; bottom: 12px; transform: translateX(-50%); display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.vrs-lane { font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 999px; color: var(--sd-text-muted);
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border); backdrop-filter: blur(6px); }
.vrs-lane.hot { color: var(--sd-vendor-overdue); border-color: var(--sd-vendor-overdue-soft); }
.vrs-lane.back { color: var(--sd-vendor-return); border-color: color-mix(in srgb, var(--sd-vendor-return) 30%, transparent); }

.vrs-veil { position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(75% 65% at 50% 45%, transparent 42%, color-mix(in srgb, var(--sd-canvas) 60%, transparent) 100%); }
.vrs-aura { position: absolute; inset: 0; pointer-events: none; opacity: 0.55;
  background: radial-gradient(60% 80% at 12% 82%, var(--sd-vendor-signal-soft), transparent 60%),
              radial-gradient(50% 70% at 90% 20%, var(--sd-vendor-steel-soft), transparent 62%); }
.vrs-aura.hot { background: radial-gradient(60% 80% at 12% 82%, var(--sd-vendor-signal-soft), transparent 60%),
              radial-gradient(52% 72% at 90% 20%, var(--sd-vendor-overdue-soft), transparent 60%); opacity: 0.8; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .vrs-flow,
  html:not([data-cinematic="on"]) .vrs-flow-return,
  html:not([data-cinematic="on"]) .vrs-node-core { animation: none; }
}
</style>
