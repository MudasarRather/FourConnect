import { onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'
import { prefersReducedMotion } from './useGsapAnim'

export function useTilt(elRef, options = {}) {
  const {
    max = 8,
    perspective = 800,
    scale = 1.02,
    parallaxSelector = '[data-tilt-depth]',
    glare = false
  } = options

  let el = null
  let layers = []
  let rect = null
  let rafId = null
  let activeX = 0
  let activeY = 0
  let targetX = 0
  let targetY = 0
  let hovering = false

  const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window)

  const updateRect = () => {
    if (!el) return
    rect = el.getBoundingClientRect()
  }

  const setBase = () => {
    if (!el) return
    el.style.transformStyle = 'preserve-3d'
    el.style.perspective = `${perspective}px`
    el.style.willChange = 'transform'
  }

  const setLayers = () => {
    if (!el || !parallaxSelector) return
    layers = Array.from(el.querySelectorAll(parallaxSelector))
    layers.forEach((l) => {
      l.style.transformStyle = 'preserve-3d'
      l.style.willChange = 'transform'
    })
  }

  const tick = () => {
    activeX += (targetX - activeX) * 0.18
    activeY += (targetY - activeY) * 0.18
    if (el) {
      gsap.set(el, {
        rotationX: -activeY,
        rotationY: activeX,
        scale: hovering ? scale : 1,
        force3D: true,
        transformPerspective: perspective
      })
    }
    layers.forEach((l) => {
      const depth = parseFloat(l.getAttribute('data-tilt-depth') || '0')
      gsap.set(l, {
        x: activeX * depth * 0.15,
        y: -activeY * depth * 0.15,
        z: hovering ? depth : 0
      })
    })
    if (hovering || Math.abs(activeX - targetX) > 0.05 || Math.abs(activeY - targetY) > 0.05) {
      rafId = requestAnimationFrame(tick)
    } else {
      rafId = null
    }
  }

  const onMove = (e) => {
    if (!rect) return
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    targetX = (px - 0.5) * 2 * max
    targetY = (py - 0.5) * 2 * max
    if (!rafId) rafId = requestAnimationFrame(tick)
  }

  const onEnter = () => {
    if (!el) return
    hovering = true
    updateRect()
    if (!rafId) rafId = requestAnimationFrame(tick)
  }

  const onLeave = () => {
    hovering = false
    targetX = 0
    targetY = 0
    if (!rafId) rafId = requestAnimationFrame(tick)
  }

  onMounted(() => {
    if (isTouch || prefersReducedMotion()) return
    el = elRef && elRef.value
    if (!el) return
    setBase()
    setLayers()
    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    window.addEventListener('resize', updateRect, { passive: true })
  })

  onUnmounted(() => {
    if (!el) return
    el.removeEventListener('mouseenter', onEnter)
    el.removeEventListener('mousemove', onMove)
    el.removeEventListener('mouseleave', onLeave)
    window.removeEventListener('resize', updateRect)
    if (rafId) cancelAnimationFrame(rafId)
    gsap.set(el, { clearProps: 'all' })
    layers.forEach((l) => gsap.set(l, { clearProps: 'all' }))
    el = null
    layers = []
  })
}
