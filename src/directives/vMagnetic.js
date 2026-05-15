import gsap from 'gsap'
import { prefersReducedMotion } from '../composables/useGsapAnim'

const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window)

function setup(el, options) {
  const strength = options.strength ?? 0.35
  const radius = options.radius ?? 40
  const ease = options.ease ?? 'power3.out'
  const press = options.press ?? true

  let rect = null
  let frame = null

  const updateRect = () => { rect = el.getBoundingClientRect() }

  const onMove = (e) => {
    if (!rect) return
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = e.clientX - cx
    const dy = e.clientY - cy
    const dist = Math.hypot(dx, dy)
    const reach = Math.max(rect.width, rect.height) / 2 + radius
    if (dist > reach) {
      if (frame) cancelAnimationFrame(frame)
      gsap.to(el, { x: 0, y: 0, duration: 0.42, ease: 'power3.out' })
      return
    }
    if (frame) cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      gsap.to(el, { x: dx * strength, y: dy * strength, duration: 0.4, ease })
    })
  }

  const onDown = () => { gsap.to(el, { scale: 0.96, duration: 0.10, ease: 'power2.out' }) }
  const onUp   = () => { gsap.to(el, { scale: 1, duration: 0.28, ease: 'expo.out' }) }

  updateRect()
  window.addEventListener('mousemove', onMove, { passive: true })
  window.addEventListener('scroll', updateRect, { passive: true })
  window.addEventListener('resize', updateRect, { passive: true })
  if (press) {
    el.addEventListener('mousedown', onDown)
    el.addEventListener('mouseup', onUp)
    el.addEventListener('mouseleave', onUp)
  }

  return () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('scroll', updateRect)
    window.removeEventListener('resize', updateRect)
    if (press) {
      el.removeEventListener('mousedown', onDown)
      el.removeEventListener('mouseup', onUp)
      el.removeEventListener('mouseleave', onUp)
    }
    if (frame) cancelAnimationFrame(frame)
    gsap.set(el, { clearProps: 'transform' })
  }
}

const vMagnetic = {
  mounted(el, binding) {
    if (isTouch || prefersReducedMotion()) return
    el._magCleanup = setup(el, binding.value || {})
  },
  beforeUnmount(el) {
    if (el._magCleanup) { el._magCleanup(); el._magCleanup = null }
  }
}

export default vMagnetic
