<template>
  <section class="sh" ref="heroRef">
    <!-- bespoke flowing aurora (canvas) — unique to self-service -->
    <canvas class="sh-aurora" ref="canvasRef" aria-hidden="true" />
    <div class="sh-veil" aria-hidden="true" />
    <span class="sh-scan" aria-hidden="true" />

    <div class="sh-inner">
      <!-- left: identity + intent -->
      <div class="sh-lead">
        <Motion as="span" class="sh-eyebrow"
          :initial="reduced ? false : { opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
          <span class="sh-dot" /> {{ greeting }}{{ firstName ? ', ' + firstName : '' }}
        </Motion>
        <h1 class="sh-title">
          <Motion as="span" class="sh-line"
            :initial="reduced ? false : { opacity: 0, y: 26, rotate: 2 }" :animate="{ opacity: 1, y: 0, rotate: 0 }"
            :transition="{ duration: 0.8, delay: 0.06, ease: [0.16, 1, 0.3, 1] }">Your learning,</Motion>
          <Motion as="span" class="sh-line"
            :initial="reduced ? false : { opacity: 0, y: 26, rotate: 2 }" :animate="{ opacity: 1, y: 0, rotate: 0 }"
            :transition="{ duration: 0.8, delay: 0.16, ease: [0.16, 1, 0.3, 1] }"><span class="grad">in motion.</span></Motion>
        </h1>
        <Motion as="p" class="sh-sub"
          :initial="reduced ? false : { opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }">
          Track every program, build your skills, and keep your credentials current — your personal growth studio.
        </Motion>
        <Motion as="div" class="sh-cta"
          :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.6, delay: 0.42, ease: [0.16, 1, 0.3, 1] }">
          <Motion as="button" type="button" class="trn-btn trn-btn-primary"
            :whileHover="reduced ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('request')">
            <Inbox :size="15" /> <span>Request a training</span>
          </Motion>
          <Motion as="button" type="button" class="trn-btn trn-btn-ghost"
            :whileHover="reduced ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('go', 'reports')">
            <FileBarChart2 :size="15" /> <span>My reports</span>
          </Motion>
        </Motion>
      </div>

      <!-- right: instrument cluster (multi-ring radial + distribution) -->
      <Motion as="div" class="sh-cluster"
        :initial="reduced ? false : { opacity: 0, scale: 0.9 }" :animate="{ opacity: 1, scale: 1 }"
        :transition="{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }">
        <SstMultiRing :rings="rings" :size="176" :stroke="10" :gap="7"
          :center="{ value: completionPct, suffix: '%', label: 'complete' }" />
        <div class="sh-legend">
          <span class="shl"><i style="--lc: var(--trn-st-completed-hex)" /> Completed <b>{{ done }}</b></span>
          <span class="shl"><i style="--lc: var(--trn-amber)" /> In progress <b>{{ prog }}</b></span>
          <span class="shl"><i style="--lc: var(--trn-st-not-started-hex)" /> To start <b>{{ todo }}</b></span>
        </div>
      </Motion>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Motion } from 'motion-v'
import { Inbox, FileBarChart2 } from 'lucide-vue-next'
import SstMultiRing from './SstMultiRing.vue'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  summary: { type: Object, default: () => ({}) },
  completionPct: { type: Number, default: 0 },
  statusCounts: { type: Object, default: () => ({}) },
  name: { type: String, default: '' },
  greeting: { type: String, default: 'Welcome' },
})
defineEmits(['request', 'go'])

const reduced = prefersReduced()
const s = computed(() => props.summary || {})
const firstName = computed(() => (props.name || '').trim().split(/\s+/)[0] || '')

const assigned = computed(() => Math.max(0, Number(s.value.assigned) || 0))
const done = computed(() => Number(s.value.completed) || 0)
const prog = computed(() => Number(s.value.in_progress) || 0)
const todo = computed(() => Math.max(0, assigned.value - done.value - prog.value))
const pctOf = (n) => (assigned.value > 0 ? (n / assigned.value) * 100 : 0)
const rings = computed(() => [
  { pct: pctOf(done.value), color: 'var(--trn-st-completed-hex)', label: 'Completed' },
  { pct: pctOf(prog.value), color: 'var(--trn-amber)', label: 'In progress' },
  { pct: pctOf(todo.value), color: 'var(--trn-st-not-started-hex)', label: 'To start' },
])

// ── bespoke aurora canvas ──────────────────────────────────────────────────
const heroRef = ref(null)
const canvasRef = ref(null)
let raf = null, ro = null, themeObs = null, cleanupPtr = null
let px = 0.5, py = 0.5
const isLight = ref((document.documentElement.getAttribute('data-theme') || 'dark') === 'light')

const RIBBONS = [
  { color: '#fde68a', baseY: 0.30, amp: 22, freq: 0.0065, speed: 0.00050, phase: 0.0 },
  { color: '#fbbf24', baseY: 0.46, amp: 30, freq: 0.0090, speed: 0.00072, phase: 1.7 },
  { color: '#fb923c', baseY: 0.64, amp: 26, freq: 0.0075, speed: 0.00060, phase: 3.1 },
  { color: '#ea580c', baseY: 0.82, amp: 34, freq: 0.0055, speed: 0.00044, phase: 4.6 },
]
const hexA = (hex, a) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

onMounted(() => {
  const cv = canvasRef.value
  if (!cv) return
  const ctx = cv.getContext('2d')
  let w = 0, h = 0
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const resize = () => {
    const r = cv.getBoundingClientRect()
    w = Math.max(1, r.width); h = Math.max(1, r.height)
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  const draw = (time) => {
    ctx.clearRect(0, 0, w, h)
    ctx.globalCompositeOperation = 'lighter'
    const baseAlpha = isLight.value ? 0.16 : 0.26
    const drift = reduced ? 0 : 1
    for (const rb of RIBBONS) {
      const baseY = h * rb.baseY + (py - 0.5) * 16 * drift
      const phase = rb.phase + time * rb.speed * drift + (px - 0.5) * 0.7
      ctx.beginPath()
      ctx.moveTo(0, baseY)
      for (let x = 0; x <= w; x += 12) {
        const y = baseY + Math.sin(x * rb.freq + phase) * rb.amp + Math.sin(x * rb.freq * 0.5 + phase * 1.3) * rb.amp * 0.4
        ctx.lineTo(x, y)
      }
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath()
      const g = ctx.createLinearGradient(0, baseY - rb.amp, 0, h)
      g.addColorStop(0, hexA(rb.color, baseAlpha))
      g.addColorStop(0.4, hexA(rb.color, baseAlpha * 0.45))
      g.addColorStop(1, hexA(rb.color, 0))
      ctx.fillStyle = g
      ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'
  }
  resize()
  if (reduced) {
    draw(0)
  } else {
    const loop = (t) => { draw(t); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
  }
  ro = new ResizeObserver(() => { resize(); if (reduced) draw(0) })
  ro.observe(cv)

  // pointer parallax (+ depth on the cluster)
  if (!reduced) {
    const el = heroRef.value
    const onMove = (e) => {
      const r = el.getBoundingClientRect(); if (!r.width) return
      px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
      py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
      el.style.setProperty('--px', ((px - 0.5) * 2).toFixed(3))
      el.style.setProperty('--py', ((py - 0.5) * 2).toFixed(3))
    }
    const onLeave = () => { px = 0.5; py = 0.5; el.style.setProperty('--px', '0'); el.style.setProperty('--py', '0') }
    el.addEventListener('pointermove', onMove, { passive: true })
    el.addEventListener('pointerleave', onLeave, { passive: true })
    cleanupPtr = () => { el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerleave', onLeave) }
  }

  themeObs = new MutationObserver(() => {
    isLight.value = (document.documentElement.getAttribute('data-theme') || 'dark') === 'light'
    if (reduced) draw(0)
  })
  themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
})
onUnmounted(() => {
  if (raf) cancelAnimationFrame(raf)
  ro?.disconnect(); themeObs?.disconnect(); cleanupPtr?.()
})
</script>

<style scoped>
.sh { position: relative; overflow: hidden; border-radius: 28px; min-height: 380px; isolation: isolate;
  background:
    radial-gradient(130% 100% at 12% 8%, color-mix(in srgb, var(--trn-amber) 12%, transparent), transparent 55%),
    var(--trn-dome);
  border: 1px solid var(--trn-border-soft); box-shadow: var(--trn-card-shadow); }
.sh-aurora { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0; display: block; }
/* legibility veil — fade from the lower-left so the headline reads */
.sh-veil { position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background:
    linear-gradient(105deg, var(--trn-canvas) 0%, color-mix(in srgb, var(--trn-canvas) 55%, transparent) 34%, transparent 64%),
    linear-gradient(0deg, color-mix(in srgb, var(--trn-canvas) 50%, transparent), transparent 40%); }
/* a slow vertical scan-sheen — a different ambient tic than the admin starfield */
.sh-scan { position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: 0.5; mix-blend-mode: overlay;
  background: linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--trn-amber-bright) 22%, transparent) 50%, transparent 100%);
  background-size: 100% 220px; animation: sh-scan 7s linear infinite; }

.sh-inner { position: relative; z-index: 2; height: 100%; min-height: 380px; padding: 38px 40px;
  display: grid; grid-template-columns: minmax(0, 1.25fr) auto; align-items: center; gap: 32px; }
.sh-lead { transform: translate3d(calc(var(--px, 0) * -6px), calc(var(--py, 0) * -5px), 0); transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); }

.sh-eyebrow { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 999px;
  background: color-mix(in srgb, var(--trn-canvas) 50%, transparent); border: 1px solid var(--trn-border-strong);
  font-family: var(--trn-mono); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--trn-amber-strong);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
.sh-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--trn-amber); box-shadow: 0 0 10px var(--trn-amber); animation: trn-pulse-dot 2.4s ease-out infinite; }
.sh-title { margin: 16px 0 0; font-size: clamp(34px, 5vw, 56px); line-height: 0.98; font-weight: 850; letter-spacing: -0.045em; color: var(--trn-text); }
.sh-line { display: block; }
.sh-title .grad { background: linear-gradient(108deg, #fbbf24 0%, #fde68a 38%, #fb923c 72%, #fbbf24 100%);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; background-size: 240% auto; animation: trn-sheen 5.5s linear infinite; }
.sh-sub { margin: 18px 0 0; max-width: 440px; font-size: 14.5px; line-height: 1.62; color: var(--trn-text-secondary); }
.sh-cta { display: flex; gap: 10px; margin-top: 22px; flex-wrap: wrap; }

.sh-cluster { display: flex; flex-direction: column; align-items: center; gap: 16px; flex-shrink: 0;
  transform: translate3d(calc(var(--px, 0) * 10px), calc(var(--py, 0) * 8px), 0); transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.sh-legend { display: flex; flex-direction: column; gap: 7px; align-self: stretch; padding: 12px 16px; border-radius: 14px;
  background: color-mix(in srgb, var(--trn-canvas) 42%, transparent); border: 1px solid var(--trn-border-soft);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
.shl { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: var(--trn-text-secondary); }
.shl i { width: 9px; height: 9px; border-radius: 3px; background: var(--lc); box-shadow: 0 0 8px -1px var(--lc); }
.shl b { margin-left: auto; font-family: var(--trn-mono); font-size: 14px; font-weight: 800; color: var(--trn-text); }

@keyframes sh-scan { 0% { background-position: 0 -240px; } 100% { background-position: 0 460px; } }

@media (max-width: 860px) {
  .sh { min-height: 0; }
  .sh-inner { grid-template-columns: 1fr; padding: 28px 24px; gap: 24px; }
  .sh-cluster { align-self: flex-start; flex-direction: row; align-items: center; flex-wrap: wrap; }
  .sh-legend { align-self: auto; }
}
@media (prefers-reduced-motion: reduce) {
  .sh-scan, .sh-dot, .sh-title .grad { animation: none !important; }
  .sh-lead, .sh-cluster { transform: none !important; }
}
</style>
