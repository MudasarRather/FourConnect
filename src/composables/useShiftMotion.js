// Shift-module motion primitives — kept tiny and dependency-free so every
// Control-Tower component can share the same pointer-reactive behaviour.
// All helpers are reduced-motion aware and clean up after themselves.
import { onMounted, onBeforeUnmount, unref, ref } from 'vue'

export const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

/**
 * Pointer-tracked spotlight. Writes `--mx` / `--my` (0..1 within the element)
 * and `--spot` (0|1 hover flag) onto the bound element so CSS can drive a
 * glare highlight + parallax with zero per-frame style thrash (rAF-batched).
 *
 * @param {import('vue').Ref<HTMLElement>} elRef  template ref to the surface
 * @param {{ idle?: number }} [opts]  resting position for --mx/--my (default 0.5)
 */
export function usePointerSpotlight(elRef, { idle = 0.5 } = {}) {
  let el = null
  let raf = null
  let pending = null

  const flush = () => {
    raf = null
    if (!el || !pending) return
    el.style.setProperty('--mx', pending.x.toFixed(3))
    el.style.setProperty('--my', pending.y.toFixed(3))
  }
  const onMove = (e) => {
    if (!el) return
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) return
    pending = {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    }
    if (!raf) raf = requestAnimationFrame(flush)
  }
  const onEnter = () => el && el.style.setProperty('--spot', '1')
  const onLeave = () => {
    if (!el) return
    el.style.setProperty('--spot', '0')
    el.style.setProperty('--mx', String(idle))
    el.style.setProperty('--my', String(idle))
  }

  onMounted(() => {
    const raw = unref(elRef)
    el = raw && raw.$el ? raw.$el : raw // resolve a <Motion>/component ref to its DOM node
    if (!el || !el.style || prefersReduced()) return
    el.style.setProperty('--mx', String(idle))
    el.style.setProperty('--my', String(idle))
    el.style.setProperty('--spot', '0')
    el.addEventListener('pointermove', onMove, { passive: true })
    el.addEventListener('pointerenter', onEnter, { passive: true })
    el.addEventListener('pointerleave', onLeave, { passive: true })
  })
  onBeforeUnmount(() => {
    if (raf) cancelAnimationFrame(raf)
    if (!el) return
    el.removeEventListener('pointermove', onMove)
    el.removeEventListener('pointerenter', onEnter)
    el.removeEventListener('pointerleave', onLeave)
  })
}

/**
 * Fires once when the bound element scrolls into view — returns a reactive
 * `visible` flag handy for kicking off draw-on / count-up choreography that
 * should wait until the surface is actually on screen. Falls back to true
 * immediately when IntersectionObserver is unavailable or motion is reduced.
 */
export function useInView(elRef, { threshold = 0.2, once = true } = {}) {
  const visible = ref(false)
  let io = null
  onMounted(() => {
    const raw = unref(elRef)
    const el = raw && raw.$el ? raw.$el : raw   // resolve a <Motion>/component ref to its DOM node
    if (!el || !(el instanceof Element) || typeof IntersectionObserver === 'undefined' || prefersReduced()) {
      visible.value = true
      return
    }
    io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          visible.value = true
          if (once) { io.disconnect(); io = null }
        } else if (!once) {
          visible.value = false
        }
      }
    }, { threshold })
    io.observe(el)
  })
  onBeforeUnmount(() => io?.disconnect())
  return { visible }
}

/** Deterministic 0..1 pseudo-noise — stable sparkline shapes without Math.random. */
export const seededWave = (seed, n = 12) => {
  const out = []
  let s = (seed * 9301 + 49297) % 233280
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280
    const base = Math.sin((i / (n - 1)) * Math.PI * 1.6 + seed) * 0.5 + 0.5
    out.push(Math.min(1, Math.max(0, base * 0.7 + (s / 233280) * 0.3)))
  }
  return out
}
