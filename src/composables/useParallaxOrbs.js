import { onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'
import { prefersReducedMotion } from './useGsapAnim'

export function useParallaxOrbs(rootRef, options = {}) {
  const {
    selector = '.forge-orb, .atlas-orb, [data-orb]',
    strength = 30,
    lerp = 0.08
  } = options

  let root = null
  let orbs = []
  let targetX = 0
  let targetY = 0
  let activeX = 0
  let activeY = 0
  let frame = null
  let running = false

  const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window)

  const tick = () => {
    activeX += (targetX - activeX) * lerp
    activeY += (targetY - activeY) * lerp
    orbs.forEach((o, i) => {
      const depth = parseFloat(o.getAttribute('data-orb-depth') || (i === 0 ? '1' : '0.6'))
      gsap.set(o, {
        x: `+=${0}`,
        '--orb-px': `${activeX * strength * depth}px`,
        '--orb-py': `${activeY * strength * depth}px`
      })
      // Direct transform layer that composes with looping animations:
      o.style.setProperty('--orb-parallax-x', `${activeX * strength * depth}px`)
      o.style.setProperty('--orb-parallax-y', `${activeY * strength * depth}px`)
    })
    if (Math.abs(targetX - activeX) > 0.001 || Math.abs(targetY - activeY) > 0.001) {
      frame = requestAnimationFrame(tick)
    } else {
      running = false
      frame = null
    }
  }

  const onMove = (e) => {
    const w = window.innerWidth
    const h = window.innerHeight
    targetX = (e.clientX / w - 0.5) * 2
    targetY = (e.clientY / h - 0.5) * 2
    if (!running) {
      running = true
      frame = requestAnimationFrame(tick)
    }
  }

  onMounted(() => {
    if (isTouch || prefersReducedMotion()) return
    root = (rootRef && rootRef.value) || document
    orbs = Array.from(root.querySelectorAll(selector))
    if (!orbs.length) return
    window.addEventListener('mousemove', onMove, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('mousemove', onMove)
    if (frame) cancelAnimationFrame(frame)
    orbs = []
    root = null
  })
}
