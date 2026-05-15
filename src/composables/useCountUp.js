import { ref, watch, onMounted } from 'vue'
import gsap from 'gsap'
import { prefersReducedMotion } from './useGsapAnim'

const defaultFormat = (n) => {
  if (!isFinite(n)) return '0'
  return Math.round(n).toLocaleString()
}

export function useCountUp(target, options = {}) {
  const {
    duration = 1.4,
    ease = 'expo.out',
    format = defaultFormat,
    startOnMount = true,
    from = 0
  } = options

  const display = ref(format(from))
  const inner = { value: from }
  let tween = null
  let lastTarget = null

  const getTarget = () => {
    if (typeof target === 'function') return Number(target()) || 0
    if (target && typeof target.value !== 'undefined') return Number(target.value) || 0
    return Number(target) || 0
  }

  const play = () => {
    const next = getTarget()
    if (next === lastTarget) return
    lastTarget = next
    if (tween) tween.kill()
    if (prefersReducedMotion()) {
      inner.value = next
      display.value = format(next)
      return
    }
    tween = gsap.to(inner, {
      value: next,
      duration,
      ease,
      onUpdate: () => {
        display.value = format(inner.value)
      }
    })
  }

  onMounted(() => {
    if (startOnMount) play()
  })

  if (target && typeof target.value !== 'undefined') {
    watch(target, () => play())
  }

  return { display, play }
}
