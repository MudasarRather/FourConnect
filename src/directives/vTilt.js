import gsap from 'gsap'
import { prefersReducedMotion } from '../composables/useGsapAnim'

const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window)

function setup(el, options) {
  const max = options.max ?? 8
  const perspective = options.perspective ?? 800
  const scale = options.scale ?? 1.02
  const depthSelector = '[data-tilt-depth]'

  el.style.transformStyle = 'preserve-3d'
  el.style.perspective = `${perspective}px`
  el.style.willChange = 'transform'

  let rect = null
  let rafId = null
  let active = { x: 0, y: 0 }
  let target = { x: 0, y: 0 }
  let hovering = false
  let layers = Array.from(el.querySelectorAll(depthSelector))
  layers.forEach((l) => { l.style.transformStyle = 'preserve-3d'; l.style.willChange = 'transform' })

  const updateRect = () => { rect = el.getBoundingClientRect() }

  const tick = () => {
    active.x += (target.x - active.x) * 0.18
    active.y += (target.y - active.y) * 0.18
    gsap.set(el, {
      rotationX: -active.y,
      rotationY: active.x,
      scale: hovering ? scale : 1,
      force3D: true,
      transformPerspective: perspective
    })
    layers.forEach((l) => {
      const depth = parseFloat(l.getAttribute('data-tilt-depth') || '0')
      gsap.set(l, {
        x: active.x * depth * 0.15,
        y: -active.y * depth * 0.15,
        z: hovering ? depth : 0
      })
    })
    if (hovering || Math.abs(active.x - target.x) > 0.05 || Math.abs(active.y - target.y) > 0.05) {
      rafId = requestAnimationFrame(tick)
    } else {
      rafId = null
    }
  }

  const onMove = (e) => {
    if (!rect) return
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    target.x = (px - 0.5) * 2 * max
    target.y = (py - 0.5) * 2 * max
    if (!rafId) rafId = requestAnimationFrame(tick)
  }
  const onEnter = () => { hovering = true; updateRect(); if (!rafId) rafId = requestAnimationFrame(tick) }
  const onLeave = () => { hovering = false; target.x = 0; target.y = 0; if (!rafId) rafId = requestAnimationFrame(tick) }

  el.addEventListener('mouseenter', onEnter)
  el.addEventListener('mousemove', onMove)
  el.addEventListener('mouseleave', onLeave)
  window.addEventListener('resize', updateRect, { passive: true })

  return () => {
    el.removeEventListener('mouseenter', onEnter)
    el.removeEventListener('mousemove', onMove)
    el.removeEventListener('mouseleave', onLeave)
    window.removeEventListener('resize', updateRect)
    if (rafId) cancelAnimationFrame(rafId)
    gsap.set(el, { clearProps: 'all' })
    layers.forEach((l) => gsap.set(l, { clearProps: 'all' }))
  }
}

const vTilt = {
  mounted(el, binding) {
    if (isTouch || prefersReducedMotion()) return
    const options = binding.value || {}
    el._tiltCleanup = setup(el, options)
  },
  beforeUnmount(el) {
    if (el._tiltCleanup) { el._tiltCleanup(); el._tiltCleanup = null }
  }
}

export default vTilt
