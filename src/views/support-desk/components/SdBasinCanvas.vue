<template>
  <div class="sd-basin" ref="rootRef" :style="{ '--basin-h': height + 'px' }">
    <!-- Premium WebGL fluid/metaball layer -->
    <canvas v-show="mode === 'webgl'" ref="canvasRef" class="sd-basin-canvas" aria-hidden="true" />

    <!-- CSS-gooey fallback (also the no-WebGL / reduced-motion mode) -->
    <div v-if="mode === 'css'" class="sd-basin-css" aria-hidden="true">
      <svg class="sd-goo-defs" width="0" height="0" focusable="false">
        <defs>
          <filter :id="gooId">
            <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="b" />
            <feColorMatrix in="b" mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" result="goo" />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
      <div class="sd-goo-stage" :style="{ filter: `url(#${gooId})` }">
        <span
          v-for="(b, i) in cssBlobs"
          :key="i"
          class="sd-goo-blob"
          :class="{ 'sd-anim': !reduced }"
          :style="blobStyle(b)"
        />
      </div>
    </div>

    <!-- Surface treatments: depth veil, rim light, fluid line -->
    <div class="sd-basin-veil" aria-hidden="true" />
    <div class="sd-basin-rim" aria-hidden="true" />
    <div class="sd-basin-surface" :class="{ 'sd-anim': !reduced }" aria-hidden="true" />
  </div>
</template>

<script setup>
/*
  SdBasinCanvas — the "Liquid Triage Basin" renderer.
  Tickets are luminous droplets suspended in an obsidian basin; the fluid surface
  ripples and droplets drift / glow by priority. WebGL metaball shader is the
  premium path; a CSS-gooey filter is the graceful fallback (no-WebGL or
  prefers-reduced-motion). Self-contained: raw three.js, disposed on unmount,
  paused when offscreen or tab-hidden.

  Priority colors are read from the live --sd-pri-* CSS vars so dark/light themes
  drive the fluid tint without re-instantiating the renderer.
*/
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  // counts by priority — drives droplet population
  priorityCounts: {
    type: Object,
    default: () => ({ critical: 0, urgent: 0, high: 0, medium: 0, low: 0 }),
  },
  breach: { type: Number, default: 0 },      // # of SLA-breached tickets (red pulse)
  intensity: { type: Number, default: 1 },   // 0..1 overall fluid opacity
  height: { type: Number, default: 300 },
})

const PRIORITY_KEYS = ['critical', 'urgent', 'high', 'medium', 'low']
const MAX_DROPLETS = 40

const rootRef = ref(null)
const canvasRef = ref(null)
const mode = ref('css')           // 'webgl' | 'css'
const reduced = ref(false)
const gooId = `sd-goo-${Math.floor(Math.random() * 1e6)}`

// ── Droplet population derived from counts (capped, with a calm baseline) ──
function buildDroplets() {
  const counts = props.priorityCounts || {}
  const raw = []
  PRIORITY_KEYS.forEach((k, pi) => {
    const n = Math.max(0, Math.min(12, Math.round(Number(counts[k]) || 0)))
    for (let i = 0; i < n; i++) raw.push(pi)
  })
  // ensure the basin never looks empty — seed a few ambient low-priority motes
  if (raw.length < 6) for (let i = raw.length; i < 6; i++) raw.push(4)
  const drops = raw.slice(0, MAX_DROPLETS).map((pi) => ({
    x: 0.08 + Math.random() * 0.84,
    y: 0.1 + Math.random() * 0.6,
    r: 0.05 + (4 - pi) * 0.012 + Math.random() * 0.03,  // higher priority = larger
    pi,
    phase: Math.random() * Math.PI * 2,
    speed: 0.25 + Math.random() * 0.5,
    bob: 0.012 + Math.random() * 0.02,
  }))
  return drops
}

// ── Read priority colors from CSS custom props (theme-reactive) ──
function readColor(varName, fallback) {
  try {
    const v = getComputedStyle(rootRef.value).getPropertyValue(varName).trim()
    return v || fallback
  } catch { return fallback }
}
function hexToRgb(hex) {
  const m = hex.replace('#', '')
  const f = m.length === 3 ? m.split('').map(c => c + c).join('') : m
  const n = parseInt(f, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/* ───────────────────────── CSS fallback blobs ───────────────────────── */
const cssBlobs = ref([])
function rebuildCss() {
  cssBlobs.value = buildDroplets().map((d, i) => ({
    left: d.x * 100,
    bottom: d.y * 100,
    size: 40 + d.r * 520,
    pi: d.pi,
    delay: (i % 6) * -1.3,
    dur: 7 + (i % 5),
  }))
}
function blobStyle(b) {
  const colors = ['--sd-pri-critical', '--sd-pri-urgent', '--sd-pri-high', '--sd-pri-medium', '--sd-pri-low']
  return {
    left: `${b.left}%`,
    bottom: `${b.bottom}%`,
    width: `${b.size}px`,
    height: `${b.size}px`,
    background: `radial-gradient(circle at 38% 32%, var(${colors[b.pi]}), color-mix(in srgb, var(${colors[b.pi]}) 35%, transparent) 70%, transparent)`,
    animationDelay: `${b.delay}s`,
    animationDuration: `${b.dur}s`,
  }
}

/* ───────────────────────── WebGL metaball ───────────────────────── */
let three = null, renderer = null, scene = null, camera = null, mesh = null, material = null
let raf = 0, running = false, startT = 0
let drops = []
let io = null

const VERT = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`
const FRAG = `
  precision highp float;
  varying vec2 vUv;
  uniform vec2 uRes;
  uniform float uTime;
  uniform int uCount;
  uniform vec4 uDrops[${MAX_DROPLETS}];
  uniform vec3 uColors[5];
  uniform vec3 uDeep;
  uniform float uBreach;
  uniform float uIntensity;

  void main() {
    vec2 uv = vUv;
    float aspect = uRes.x / max(uRes.y, 1.0);
    float field = 0.0;
    vec3 col = vec3(0.0);
    float wsum = 0.0;
    for (int i = 0; i < ${MAX_DROPLETS}; i++) {
      if (i >= uCount) break;
      vec4 d = uDrops[i];
      vec2 diff = uv - d.xy;
      diff.x *= aspect;
      float dist2 = dot(diff, diff) + 0.0002;
      float f = (d.z * d.z) / dist2;
      field += f;
      int pi = int(d.w + 0.5);
      vec3 c = uColors[0];
      if (pi == 1) c = uColors[1];
      else if (pi == 2) c = uColors[2];
      else if (pi == 3) c = uColors[3];
      else if (pi == 4) c = uColors[4];
      col += c * f;
      wsum += f;
    }
    if (wsum > 0.0) col /= wsum;
    float t = smoothstep(0.55, 1.08, field);
    float glow = smoothstep(0.16, 0.72, field) * 0.5;
    vec3 base = mix(uDeep * 0.18, uDeep, uv.y * 0.5);
    vec3 fluid = mix(base, col, t);
    fluid += col * glow * 0.65;
    float pulse = 0.5 + 0.5 * sin(uTime * 3.0);
    fluid = mix(fluid, vec3(0.86, 0.16, 0.16), clamp(uBreach, 0.0, 1.0) * t * pulse);
    fluid += smoothstep(0.88, 1.0, uv.y) * 0.06;
    float alpha = clamp(t + glow * 0.4, 0.0, 1.0) * uIntensity;
    gl_FragColor = vec4(fluid, alpha);
  }
`

async function initWebGL() {
  try {
    three = await import('three')
    const canvas = canvasRef.value
    if (!canvas) return false
    renderer = new three.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: false })
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

    scene = new three.Scene()
    camera = new three.Camera()

    drops = buildDroplets()
    const dropVecs = Array.from({ length: MAX_DROPLETS }, () => new three.Vector4(0, 0, 0, 0))

    material = new three.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthTest: false,
      uniforms: {
        uRes: { value: new three.Vector2(1, 1) },
        uTime: { value: 0 },
        uCount: { value: drops.length },
        uDrops: { value: dropVecs },
        uColors: { value: priorityColorVecs() },
        uDeep: { value: new three.Vector3(...hexToRgb(readColor('--sd-fluid-deep', '#ea580c'))) },
        uBreach: { value: 0 },
        uIntensity: { value: props.intensity },
      },
    })
    mesh = new three.Mesh(new three.PlaneGeometry(2, 2), material)
    scene.add(mesh)
    resize()
    return true
  } catch (e) {
    console.warn('[SdBasinCanvas] WebGL init failed, using CSS fallback', e)
    return false
  }
}

function priorityColorVecs() {
  const vars = ['--sd-pri-critical', '--sd-pri-urgent', '--sd-pri-high', '--sd-pri-medium', '--sd-pri-low']
  const fb = ['#ef4444', '#f97316', '#fb923c', '#fbbf24', '#a8a29e']
  return vars.map((v, i) => new three.Vector3(...hexToRgb(readColor(v, fb[i]))))
}

function resize() {
  if (!renderer || !rootRef.value) return
  const w = rootRef.value.clientWidth || 1
  const h = props.height || 300
  renderer.setSize(w, h, false)
  material.uniforms.uRes.value.set(w, h)
}

function frame(ts) {
  if (!running) return
  if (!startT) startT = ts
  const t = (ts - startT) / 1000
  material.uniforms.uTime.value = t
  // drift droplets
  for (let i = 0; i < drops.length; i++) {
    const d = drops[i]
    const dx = Math.sin(t * d.speed + d.phase) * 0.018
    const dy = Math.cos(t * d.speed * 0.8 + d.phase) * d.bob
    material.uniforms.uDrops.value[i].set(d.x + dx, d.y + dy, d.r, d.pi)
  }
  renderer.render(scene, camera)
  raf = requestAnimationFrame(frame)
}

function start() {
  if (running || mode.value !== 'webgl' || reduced.value) return
  running = true
  startT = 0
  raf = requestAnimationFrame(frame)
}
function stop() {
  running = false
  if (raf) cancelAnimationFrame(raf)
  raf = 0
}

function syncData() {
  if (mode.value === 'webgl' && material) {
    drops = buildDroplets()
    material.uniforms.uCount.value = drops.length
    material.uniforms.uBreach.value = Math.min(1, (Number(props.breach) || 0) / 4)
    material.uniforms.uIntensity.value = props.intensity
    material.uniforms.uColors.value = priorityColorVecs()
    material.uniforms.uDeep.value.set(...hexToRgb(readColor('--sd-fluid-deep', '#ea580c')))
  } else {
    rebuildCss()
  }
}

const onResize = () => resize()
const onVisibility = () => { if (document.hidden) stop(); else start() }
let themeObserver = null

onMounted(async () => {
  reduced.value = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  rebuildCss()

  // Try WebGL unless reduced-motion (then keep the static CSS basin)
  if (!reduced.value && (window.WebGLRenderingContext || window.WebGL2RenderingContext)) {
    const ok = await initWebGL()
    if (ok) mode.value = 'webgl'
  }

  if (mode.value === 'webgl') {
    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVisibility)
    if (typeof IntersectionObserver !== 'undefined' && rootRef.value) {
      io = new IntersectionObserver((entries) => {
        entries.forEach(e => (e.isIntersecting ? start() : stop()))
      }, { threshold: 0.05 })
      io.observe(rootRef.value)
    } else {
      start()
    }
    // Re-tint when the app theme flips dark/light
    themeObserver = new MutationObserver(() => syncData())
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  }
})

onBeforeUnmount(() => {
  stop()
  window.removeEventListener('resize', onResize)
  document.removeEventListener('visibilitychange', onVisibility)
  io?.disconnect()
  themeObserver?.disconnect()
  try {
    mesh?.geometry?.dispose()
    material?.dispose()
    renderer?.dispose()
  } catch { /* noop */ }
})

watch(() => [props.priorityCounts, props.breach, props.intensity], syncData, { deep: true })
</script>

<style scoped>
.sd-basin {
  position: relative;
  width: 100%;
  height: var(--basin-h, 300px);
  overflow: hidden;
  border-radius: inherit;
  background:
    radial-gradient(140% 90% at 50% 118%, rgba(251, 146, 60, 0.10), transparent 60%),
    var(--sd-basin, #0a0c0e);
}
.sd-basin-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }

/* CSS gooey fallback */
.sd-basin-css { position: absolute; inset: 0; }
.sd-goo-defs { position: absolute; }
.sd-goo-stage { position: absolute; inset: 0; }
.sd-goo-blob {
  position: absolute;
  border-radius: 50%;
  transform: translate(-50%, 50%);
  filter: blur(2px);
  opacity: 0.9;
  will-change: transform;
}
.sd-goo-blob.sd-anim { animation: sd-droplet-drift 8s ease-in-out infinite; }

/* surface treatments */
.sd-basin-veil {
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(180deg, rgba(6, 7, 8, 0.55) 0%, transparent 28%, transparent 72%, rgba(6, 7, 8, 0.35) 100%);
}
.sd-basin-rim {
  position: absolute; inset: 0; pointer-events: none; border-radius: inherit;
  box-shadow: inset 0 1px 0 var(--sd-basin-rim, rgba(251, 191, 36, 0.22)),
              inset 0 -40px 60px rgba(0, 0, 0, 0.4);
}
.sd-basin-surface {
  position: absolute; left: 0; right: 0; bottom: 26%; height: 2px; pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--sd-basin-rim, rgba(251, 191, 36, 0.4)), transparent);
  opacity: 0.5;
}
.sd-basin-surface.sd-anim { animation: sd-basin-ripple 5s ease-in-out infinite; }

[data-theme="light"] .sd-basin {
  background:
    radial-gradient(140% 90% at 50% 118%, rgba(234, 88, 12, 0.12), transparent 60%),
    var(--sd-basin, #efe9df);
}
[data-theme="light"] .sd-basin-veil {
  background: linear-gradient(180deg, rgba(245, 241, 234, 0.5) 0%, transparent 30%, transparent 72%, rgba(245, 241, 234, 0.4) 100%);
}

@media (prefers-reduced-motion: reduce) {
  .sd-goo-blob, .sd-basin-surface { animation: none !important; }
}
</style>
