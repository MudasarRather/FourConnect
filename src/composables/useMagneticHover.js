import { onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'
import { prefersReducedMotion } from './useGsapAnim'

export function useMagneticHover(elRef, options = {}) {
  const {
    strength = 0.35,
    radius = 40,
    ease = 'power3.out',
    press = true
  } = options

  let el = null
  let rect = null
  let frame = null
  const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window)

  const updateRect = () => {
    if (!el) return
    rect = el.getBoundingClientRect()
  }

  const onMove = (e) => {
    if (!rect) return
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = e.clientX - cx
    const dy = e.clientY - cy
    const dist = Math.hypot(dx, dy)
    const reach = Math.max(rect.width, rect.height) / 2 + radius
    if (dist > reach) {
      release()
      return
    }
    if (frame) cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      gsap.to(el, {
        x: dx * strength,
        y: dy * strength,
        duration: 0.4,
        ease
      })
    })
  }

  const release = () => {
    if (!el) return
    if (frame) cancelAnimationFrame(frame)
    gsap.to(el, { x: 0, y: 0, duration: 0.42, ease: 'power3.out' })
  }

  const onDown = () => {
    if (!press || !el) return
    gsap.to(el, { scale: 0.96, duration: 0.10, ease: 'power2.out' })
  }
  const onUp = () => {
    if (!press || !el) return
    gsap.to(el, { scale: 1, duration: 0.28, ease: 'expo.out' })
  }

  onMounted(() => {
    if (isTouch || prefersReducedMotion()) return
    el = elRef && elRef.value
    if (!el) return
    updateRect()
    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('scroll', updateRect, { passive: true })
    window.addEventListener('resize', updateRect, { passive: true })
    if (press) {
      el.addEventListener('mousedown', onDown)
      el.addEventListener('mouseup', onUp)
      el.addEventListener('mouseleave', onUp)
    }
  })

  onUnmounted(() => {
    if (!el) return
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
    el = null
  })
}
