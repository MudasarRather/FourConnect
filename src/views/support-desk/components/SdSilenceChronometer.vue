<template>
  <div class="chr" ref="rootRef" :class="{ imminent: imminent > 0 }" :style="{ '--chr-h': height + 'px' }">
    <!-- luminous vitrine frame (NOT a dark obsidian panel — a lit museum showcase) -->
    <span class="chr-tag sd-mono"><Hourglass :size="11" /> SILENCE CHRONOMETER</span>
    <span class="chr-tick t-tl" /><span class="chr-tick t-tr" /><span class="chr-tick t-bl" /><span class="chr-tick t-br" />

    <!-- WebGL hourglass -->
    <canvas v-show="mode === 'webgl'" ref="canvasRef" class="chr-canvas" aria-hidden="true" />

    <!-- CSS fallback (no-WebGL / reduced motion): a plotted glass hourglass -->
    <div v-if="mode === 'css'" class="chr-css" aria-hidden="true">
      <div class="cg-frame">
        <span class="cg-cap top" /><span class="cg-cap bot" />
        <span class="cg-post p1" /><span class="cg-post p2" />
        <div class="cg-glass">
          <span class="cg-bulb top"><span class="cg-sand" :style="{ height: (58 - fillPct * 0.4) + '%' }" /></span>
          <span class="cg-neck"><span class="cg-stream" /></span>
          <span class="cg-bulb bot"><span class="cg-sand grow" :style="{ height: (18 + fillPct * 0.4) + '%' }" /><span class="cg-thresh" /></span>
        </div>
      </div>
    </div>

    <span class="chr-pedestal" aria-hidden="true" />
    <span class="chr-aura" aria-hidden="true" />

    <!-- HUD readout -->
    <div class="chr-hud">
      <div class="hud-core">
        <span class="hud-n"><SdCountUp :value="pending" /></span>
        <span class="hud-lbl">awaiting a reply</span>
      </div>
      <div class="hud-chips">
        <span class="hud-chip"><Clock3 :size="11" /> oldest <b>{{ oldestLabel }}</b> silent</span>
        <span class="hud-chip danger" :class="{ live: imminent > 0 }"><Flame :size="11" /> <b>{{ imminent }}</b> auto-close &lt;24h</span>
        <span class="hud-chip good" :class="{ live: reactivatedToday > 0 }"><CornerUpLeft :size="11" /> <b>{{ reactivatedToday }}</b> came back</span>
      </div>
    </div>
  </div>
</template>

<script setup>
/*
  SdSilenceChronometer — the "Pending Customer" signature instrument (blender-level).
  A refractive-glass HOURGLASS in a warm bronze frame: pending tickets are opaque amber
  sand that perpetually funnels top → neck → bottom pile; a red AUTO-CLOSE threshold ring
  glows/pulses as tickets near the silence cliff; a few EMERALD grains rise UP against
  gravity = tickets a customer reply reactivated (back to active work). Opaque sand +
  source-over (NOT additive) so it reads on the CREAM light theme too — staged in a
  luminous, theme-adaptive VITRINE (never the recurring dark obsidian panel). Real three.js,
  disposed on unmount, paused offscreen, CSS glass-hourglass fallback for no-WebGL / reduce.
  Fresh motif — vertical falling-particle timekeeper, unlike any Support Desk sibling
  (≠ radar sonar / momentum pipeline / claim conveyor / workload gauge / command globe / basin).
*/
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { Hourglass, Clock3, Flame, CornerUpLeft } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  pending: { type: Number, default: 0 },          // grains in play (fill level)
  oldestSilenceMs: { type: Number, default: 0 },  // drives the HUD + urgency
  imminent: { type: Number, default: 0 },         // auto-close < 24h → threshold pulse
  reactivatedToday: { type: Number, default: 0 }, // emerald up-risers
  height: { type: Number, default: 300 },
  reduced: { type: Boolean, default: false },
})

const rootRef = ref(null)
const canvasRef = ref(null)
const mode = ref('css')
const reducedM = ref(false)

/* ── HUD ── */
const HOUR = 3600000, DAY = 86400000
const oldestLabel = computed(() => {
  const m = props.oldestSilenceMs
  if (!m || m < 60000) return '—'
  if (m < HOUR) return `${Math.round(m / 60000)}m`
  if (m < DAY) return `${Math.round(m / HOUR)}h`
  return `${Math.round(m / DAY)}d`
})
const fillPct = computed(() => Math.max(6, Math.min(100, props.pending * 6)))

/* ── small math ── */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const lerp = (a, b, t) => a + (b - a) * t
const fract = (x) => x - Math.floor(x)
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t) }
const readVar = (name, fb) => { try { const v = getComputedStyle(rootRef.value).getPropertyValue(name).trim(); return v || fb } catch { return fb } }

/* glass silhouette radius for a normalized height ny∈[-1,1] (0 = neck).
   Slender, elegant profile — narrow neck, graceful widening, softly-rounded rims. */
const shellR = (ny) => { const a = Math.abs(ny); let r = 0.05 + 0.75 * smooth(0.0, 0.62, a); r *= 1 - 0.32 * smooth(0.8, 1, a); return r }
const H = 1.34

/* grain trajectory: top pile (funneling down) → long thin neck stream → spreading bottom pile */
function grainPos(p, seed) {
  const ang = fract(seed * 12.9898) * Math.PI * 2
  let ny, rr
  if (p < 0.44) { const u = p / 0.44; ny = lerp(0.9, 0.05, u * u); rr = shellR(ny) * 0.78 * (1 - u * 0.58) * Math.sqrt(fract(seed * 3.7)) }
  else if (p < 0.56) { const u = (p - 0.44) / 0.12; ny = lerp(0.05, -0.05, u); rr = 0.022 * (0.4 + 0.6 * fract(seed * 7.1)) }
  else { const u = (p - 0.56) / 0.44; ny = lerp(-0.05, -0.86, 1 - (1 - u) * (1 - u)); rr = shellR(ny) * 0.78 * (0.32 + 0.68 * u) * Math.sqrt(fract(seed * 5.3)) }
  return [Math.cos(ang) * rr, ny * H, Math.sin(ang) * rr]
}

/* ── three.js ── */
let three = null, renderer = null, scene = null, camera = null, group = null
let sand = null, sandGeo = null, sandMat = null, sprite = null
let glass = null, thresh = null, caps = [], posts = []
let grains = [], raf = 0, running = false, clock0 = 0, io = null, themeObs = null

function makeSprite() {
  const c = document.createElement('canvas'); c.width = c.height = 48
  const g = c.getContext('2d'); const gr = g.createRadialGradient(24, 24, 0, 24, 24, 24)
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = gr; g.beginPath(); g.arc(24, 24, 24, 0, Math.PI * 2); g.fill()
  return new three.CanvasTexture(c)
}

function grainCount() { return clamp(Math.round(130 + (Number(props.pending) || 0) * 6), 150, 460) }

function buildGrains() {
  const N = grainCount()
  const risers = clamp(1 + Math.round(Number(props.reactivatedToday) || 0), 1, 7)
  grains = []
  for (let i = 0; i < N; i++) {
    grains.push({ p: fract(i * 0.6180339887), seed: (i * 97 + 13) % 1000 / 1000 + 0.01, sp: 0, riser: i < risers })
  }
}

function paintColors() {
  if (!sandGeo) return
  const N = grains.length
  const col = new Float32Array(N * 3)
  // fine gold glitter — bias to bright amber/gold with a few ember grains for warmth
  const bright = new three.Color(readVar('--sd-amber-bright', '#fcd34d'))
  const gold = new three.Color(readVar('--sd-gold', '#ffb900'))
  const amber = new three.Color(readVar('--sd-amber', '#fbbf24'))
  const ember = new three.Color(readVar('--sd-ember', '#fb923c'))
  const emer = new three.Color(readVar('--sd-st-resolved', '#34d399'))
  for (let i = 0; i < N; i++) {
    const g = grains[i]
    const r = fract(g.seed * 4.3)
    const c = g.riser ? emer : (r > 0.88 ? ember : r > 0.5 ? bright : r > 0.2 ? gold : amber)
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b
  }
  sandGeo.setAttribute('color', new three.BufferAttribute(col, 3))
}

async function initWebGL() {
  try {
    three = await import('three')
    const canvas = canvasRef.value; if (!canvas) return false
    renderer = new three.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

    scene = new three.Scene()
    camera = new three.PerspectiveCamera(36, 1, 0.1, 100)
    camera.position.set(0, 0.16, 5.6)

    // slender + raised so it sits elegantly with breathing room and clears the HUD readout
    group = new three.Group(); scene.add(group)
    group.scale.setScalar(0.78)
    group.position.y = 0.28

    scene.add(new three.AmbientLight(0xfff1da, 0.68))
    const key = new three.DirectionalLight(0xffffff, 1.2); key.position.set(2.4, 3.2, 3.2); scene.add(key)
    const rim = new three.PointLight(0xffb900, 0.95, 14); rim.position.set(-2.6, -1.2, 2.4); scene.add(rim)

    // glass shell (lathe of the hourglass profile) — translucent, clearcoat, double-sided
    const prof = []
    for (let i = 0; i <= 44; i++) { const ny = -1 + (2 * i / 44); prof.push(new three.Vector2(Math.max(0.02, shellR(ny)), ny * H)) }
    const glassMat = new three.MeshPhysicalMaterial({
      color: new three.Color(readVar('--chr-glass', '#fff3e0')), metalness: 0, roughness: 0.06,
      transparent: true, opacity: 0.12, clearcoat: 1, clearcoatRoughness: 0.04,
      side: three.DoubleSide, depthWrite: false,
    })
    glass = new three.Mesh(new three.LatheGeometry(prof, 64), glassMat); group.add(glass)

    // refined bronze frame — slim two-tier caps + thin posts with spherical finials
    const bronze = new three.MeshStandardMaterial({ color: new three.Color(readVar('--chr-frame', '#c98a3c')), metalness: 0.8, roughness: 0.28 })
    for (const yy of [H + 0.05, -H - 0.05]) {
      const cap = new three.Mesh(new three.CylinderGeometry(0.7, 0.8, 0.06, 56), bronze); cap.position.y = yy; group.add(cap); caps.push(cap)
      const lip = new three.Mesh(new three.CylinderGeometry(0.56, 0.56, 0.03, 56), bronze); lip.position.y = yy + (yy > 0 ? -0.045 : 0.045); group.add(lip); caps.push(lip)
    }
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.52, pr = 0.74
      const post = new three.Mesh(new three.CylinderGeometry(0.022, 0.022, 2 * H + 0.08, 16), bronze)
      post.position.set(Math.cos(a) * pr, 0, Math.sin(a) * pr); group.add(post); posts.push(post)
      for (const fy of [H + 0.02, -H - 0.02]) {
        const fin = new three.Mesh(new three.SphereGeometry(0.045, 18, 12), bronze)
        fin.position.set(Math.cos(a) * pr, fy, Math.sin(a) * pr); group.add(fin); posts.push(fin)
      }
    }

    // red auto-close threshold ring in the lower bulb (thin, elegant)
    const ty = -0.62
    thresh = new three.Mesh(
      new three.TorusGeometry(shellR(ty) * 0.78, 0.008, 8, 80),
      new three.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.38 }))
    thresh.position.y = ty * H; thresh.rotation.x = Math.PI / 2; group.add(thresh)

    // sand
    sprite = makeSprite()
    buildGrains()
    const N = grains.length
    sandGeo = new three.BufferGeometry()
    sandGeo.setAttribute('position', new three.BufferAttribute(new Float32Array(N * 3), 3))
    paintColors()
    sandMat = new three.PointsMaterial({ size: 0.052, map: sprite, vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true, blending: three.NormalBlending })
    sand = new three.Points(sandGeo, sandMat); group.add(sand)

    resize()
    return true
  } catch (e) { console.warn('[SdSilenceChronometer] WebGL init failed; CSS fallback', e); return false }
}

function resize() {
  if (!renderer || !rootRef.value) return
  const w = rootRef.value.clientWidth || 1, h = props.height || 300
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix()
}

function frame(ts) {
  if (!running) return
  if (!clock0) clock0 = ts
  const t = (ts - clock0) / 1000, dt = 0.016
  group.rotation.y = Math.sin(t * 0.28) * 0.12
  group.position.y = 0.28 + Math.sin(t * 0.6) * 0.01
  // sand physics
  const base = 0.05 + 0.006 * Math.min(Number(props.imminent) || 0, 10)
  const pos = sandGeo.attributes.position.array
  for (let i = 0; i < grains.length; i++) {
    const g = grains[i]
    if (!g.sp) g.sp = base * (0.7 + 0.6 * fract(g.seed * 9.1))
    g.p += g.sp * dt * (g.riser ? 0.8 : 1)
    if (g.p >= 1) g.p -= 1
    const [x, y, z] = g.riser ? grainPos(1 - g.p, g.seed) : grainPos(g.p, g.seed)
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z
  }
  sandGeo.attributes.position.needsUpdate = true
  if (thresh) { const hot = Math.min(1, (Number(props.imminent) || 0) / 4); thresh.material.opacity = 0.3 + hot * (0.4 + 0.3 * (0.5 + 0.5 * Math.sin(t * 4))); thresh.scale.setScalar(1 + hot * 0.03) }
  renderer.render(scene, camera)
  raf = requestAnimationFrame(frame)
}
function start() { if (running || mode.value !== 'webgl' || reducedM.value) { if (mode.value === 'webgl' && !running) { renderer?.render(scene, camera) } return } running = true; clock0 = 0; raf = requestAnimationFrame(frame) }
function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0 }

function syncData() {
  if (mode.value !== 'webgl' || !sandGeo) return
  const want = grainCount()
  if (want !== grains.length) { buildGrains(); sandGeo.setAttribute('position', new three.BufferAttribute(new Float32Array(want * 3), 3)) }
  else { const risers = clamp(1 + Math.round(Number(props.reactivatedToday) || 0), 1, 7); grains.forEach((g, i) => (g.riser = i < risers)) }
  paintColors()
  if (glass) glass.material.color = new three.Color(readVar('--chr-glass', '#fff3e0'))
  caps.concat(posts).forEach(m => (m.material.color = new three.Color(readVar('--chr-frame', '#c98a3c'))))
  if (!running) renderer?.render(scene, camera)
}

const onResize = () => resize()
const onVis = () => { if (document.hidden) stop(); else start() }

onMounted(async () => {
  reducedM.value = props.reduced || (!!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) && document.documentElement.getAttribute('data-cinematic') !== 'on')
  if (!reducedM.value && (window.WebGLRenderingContext || window.WebGL2RenderingContext)) {
    const ok = await initWebGL()
    if (ok) mode.value = 'webgl'
  }
  if (mode.value === 'webgl') {
    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVis)
    if (typeof IntersectionObserver !== 'undefined' && rootRef.value) {
      io = new IntersectionObserver((es) => es.forEach(e => (e.isIntersecting ? start() : stop())), { threshold: 0.04 }); io.observe(rootRef.value)
    } else { start() }
    if (reducedM.value) { renderer?.render(scene, camera) }  // one static frame
    themeObs = new MutationObserver(() => syncData())
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  }
})

onBeforeUnmount(() => {
  stop(); window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVis)
  io?.disconnect(); themeObs?.disconnect()
  try {
    sandGeo?.dispose(); sandMat?.dispose(); sprite?.dispose()
    glass?.geometry?.dispose(); glass?.material?.dispose()
    thresh?.geometry?.dispose(); thresh?.material?.dispose()
    caps.concat(posts).forEach(m => { m.geometry?.dispose(); m.material?.dispose() })
    renderer?.dispose()
  } catch { /* noop */ }
})

watch(() => [props.pending, props.imminent, props.reactivatedToday], syncData)
</script>

<style scoped>
/* ── luminous, theme-adaptive VITRINE (a lit showcase, NOT a dark obsidian panel) ── */
.chr {
  --chr-glass: #fff3e0; --chr-frame: #c98a3c;
  position: relative; width: 100%; height: var(--chr-h, 300px); border-radius: 20px; overflow: hidden;
  background:
    radial-gradient(120% 92% at 50% 8%, rgba(84,60,32,0.5), transparent 62%),
    radial-gradient(140% 120% at 50% 120%, rgba(251,146,60,0.14), transparent 60%),
    linear-gradient(180deg, rgba(38,30,22,0.9), rgba(20,16,12,0.94));
  border: 1px solid var(--sd-amber-border); box-shadow: inset 0 1px 0 rgba(255,240,214,0.12), 0 20px 46px rgba(0,0,0,0.4);
}
[data-theme="light"] .chr {
  --chr-glass: #fffaf0; --chr-frame: #b06d24;
  background:
    radial-gradient(120% 92% at 50% 6%, #fdf6ea, transparent 60%),
    radial-gradient(140% 120% at 50% 122%, rgba(234,88,12,0.12), transparent 58%),
    linear-gradient(180deg, #fbf4e6, #f1e6d2);
  border-color: rgba(176,109,36,0.32); box-shadow: inset 0 1px 0 rgba(255,255,255,0.7), inset 0 0 44px rgba(176,109,36,0.08), 0 16px 40px rgba(120,80,30,0.14);
}
.chr-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }

.chr-tag { position: absolute; top: 11px; left: 13px; z-index: 3; display: inline-flex; align-items: center; gap: 6px; font-size: 9px; font-weight: 700; letter-spacing: 0.18em; color: var(--sd-amber); opacity: 0.82; }
[data-theme="light"] .chr-tag { color: #9a5a12; }
.chr-tick { position: absolute; width: 12px; height: 12px; z-index: 3; border: 1.4px solid var(--sd-amber-border); opacity: 0.6; }
.t-tl { top: 9px; left: 9px; border-right: none; border-bottom: none; }
.t-tr { top: 9px; right: 9px; border-left: none; border-bottom: none; }
.t-bl { bottom: 9px; left: 9px; border-right: none; border-top: none; }
.t-br { bottom: 9px; right: 9px; border-left: none; border-top: none; }

.chr-pedestal { position: absolute; left: 50%; bottom: 52px; width: 220px; height: 26px; transform: translateX(-50%); z-index: 0; border-radius: 50%;
  background: radial-gradient(ellipse, rgba(0,0,0,0.4), transparent 70%); filter: blur(6px); pointer-events: none; }
[data-theme="light"] .chr-pedestal { background: radial-gradient(ellipse, rgba(120,80,30,0.22), transparent 70%); }
.chr-aura { position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background: radial-gradient(60% 46% at 50% 40%, rgba(251,146,60,0.16), transparent 70%); opacity: 0.8; transition: opacity 0.4s; }
.chr.imminent .chr-aura { background: radial-gradient(60% 46% at 50% 52%, rgba(239,68,68,0.18), transparent 68%); opacity: 1; }

/* HUD */
.chr-hud { position: absolute; left: 0; right: 0; bottom: 12px; z-index: 3; display: flex; flex-direction: column; align-items: center; gap: 8px; pointer-events: none; }
.hud-core { display: flex; flex-direction: column; align-items: center; line-height: 1; }
.hud-n { font-size: 30px; font-weight: 850; color: var(--sd-text); letter-spacing: -0.02em; text-shadow: 0 2px 12px rgba(0,0,0,0.4); }
[data-theme="light"] .hud-n { text-shadow: 0 1px 2px rgba(255,255,255,0.7); }
.hud-lbl { font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--sd-text-muted); margin-top: 4px; }
.hud-chips { display: inline-flex; flex-wrap: wrap; justify-content: center; gap: 7px; }
.hud-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 999px; font-size: 10.5px; color: var(--sd-text-secondary);
  background: color-mix(in srgb, var(--sd-canvas) 62%, transparent); border: 1px solid var(--sd-border); backdrop-filter: blur(6px); }
.hud-chip b { color: var(--sd-text); font-family: var(--sd-mono); font-weight: 800; }
.hud-chip.danger { color: var(--sd-danger); border-color: color-mix(in srgb, var(--sd-danger) 34%, transparent); }
.hud-chip.danger b { color: var(--sd-danger); }
.hud-chip.good { color: var(--sd-success); border-color: color-mix(in srgb, var(--sd-success) 30%, transparent); }
.hud-chip.good b { color: var(--sd-success); }
.hud-chip.live { animation: chr-chip 2.2s ease-in-out infinite; }

/* ── CSS fallback hourglass ── */
.chr-css { position: absolute; inset: 0; display: grid; place-items: center; }
.cg-frame { position: relative; width: 132px; height: calc(var(--chr-h, 300px) - 96px); }
.cg-cap { position: absolute; left: 50%; transform: translateX(-50%); width: 118px; height: 12px; border-radius: 5px; background: linear-gradient(180deg, var(--chr-frame), color-mix(in srgb, var(--chr-frame) 60%, #000)); }
.cg-cap.top { top: -6px; } .cg-cap.bot { bottom: -6px; }
.cg-post { position: absolute; top: 0; bottom: 0; width: 5px; border-radius: 3px; background: linear-gradient(90deg, color-mix(in srgb, var(--chr-frame) 60%, #000), var(--chr-frame)); }
.cg-post.p1 { left: 10px; } .cg-post.p2 { right: 10px; }
.cg-glass { position: absolute; inset: 8px 20px; display: flex; flex-direction: column; }
.cg-bulb { position: relative; flex: 1; overflow: hidden; background: color-mix(in srgb, var(--chr-glass) 30%, transparent); border: 1px solid var(--sd-amber-border); }
.cg-bulb.top { border-radius: 8px 8px 46% 46%; clip-path: polygon(0 0, 100% 0, 54% 100%, 46% 100%); }
.cg-bulb.bot { border-radius: 46% 46% 8px 8px; clip-path: polygon(46% 0, 54% 0, 100% 100%, 0 100%); }
.cg-sand { position: absolute; left: 0; right: 0; bottom: 0; background: linear-gradient(180deg, var(--sd-amber), var(--sd-ember)); box-shadow: 0 0 14px color-mix(in srgb, var(--sd-ember) 40%, transparent); }
.cg-bulb.top .cg-sand { top: 0; bottom: auto; }
.cg-neck { position: relative; height: 14px; width: 8px; align-self: center; background: color-mix(in srgb, var(--chr-glass) 26%, transparent); }
.cg-stream { position: absolute; left: 50%; top: 0; bottom: 0; width: 2.5px; transform: translateX(-50%); background: linear-gradient(180deg, var(--sd-amber), transparent); animation: chr-stream 0.9s linear infinite; }
.cg-thresh { position: absolute; left: 8%; right: 8%; bottom: 26%; height: 2px; background: var(--sd-danger); box-shadow: 0 0 8px var(--sd-danger); opacity: 0.7; }

@keyframes chr-stream { 0% { opacity: 0.2; } 50% { opacity: 1; } 100% { opacity: 0.2; } }
@keyframes chr-chip { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .cg-stream, html:not([data-cinematic="on"]) .hud-chip.live { animation: none !important; }
}
</style>
