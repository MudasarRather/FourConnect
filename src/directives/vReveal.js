import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReducedMotion } from '../composables/useGsapAnim'

let registered = false
function ensureRegistered() {
  if (registered) return
  gsap.registerPlugin(ScrollTrigger)
  registered = true
}

function resolveOptions(binding) {
  const value = binding.value || {}
  const dir = binding.arg || null
  const mods = binding.modifiers || {}

  let x = 0
  let y = 30
  if (mods.right) { x = 60; y = 0 }
  if (mods.left)  { x = -60; y = 0 }
  if (mods.up)    { y = 40 }
  if (mods.down)  { y = -40 }

  return {
    y: value.y ?? y,
    x: value.x ?? x,
    scale: value.scale ?? 1,
    opacity: value.opacity ?? 0,
    duration: value.duration ?? 0.85,
    delay: value.delay ?? 0,
    ease: value.ease ?? 'expo.out',
    stagger: dir === 'stagger',
    start: value.start ?? 'top 88%',
    filter: value.filter ?? null
  }
}

const vReveal = {
  created(el) {
    el.style.willChange = 'transform, opacity'
    if (!prefersReducedMotion()) {
      el.style.opacity = '0'
    }
  },
  mounted(el, binding) {
    if (prefersReducedMotion()) {
      el.style.opacity = '1'
      return
    }
    ensureRegistered()
    const o = resolveOptions(binding)

    const fromVars = {
      opacity: o.opacity,
      y: o.y,
      x: o.x,
      scale: o.scale === 1 ? undefined : o.scale,
      filter: o.filter || undefined
    }
    const toVars = {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      filter: 'none',
      duration: o.duration,
      delay: o.delay,
      ease: o.ease,
      clearProps: 'will-change,filter'
    }

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: o.start,
      once: true,
      onEnter: () => {
        gsap.fromTo(el, fromVars, toVars)
      }
    })
    el._gsapRevealTrigger = trigger
  },
  beforeUnmount(el) {
    if (el._gsapRevealTrigger) {
      el._gsapRevealTrigger.kill()
      el._gsapRevealTrigger = null
    }
  }
}

export default vReveal
