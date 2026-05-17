// Animated number counter — ease-out-cubic over a duration.
// Drives KpiChip and any place where a number should roll up from 0.
//
// Usage:
//   const { current } = useCounter(targetRef, { duration: 800 })
//
import { ref, watch, onUnmounted } from 'vue'

export function useCounter(target, options = {}) {
  const duration = options.duration ?? 800
  const startValue = options.start ?? 0
  const current = ref(startValue)

  let rafId = null
  let startTs = null
  let from = startValue
  let to = startValue

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)

  const tick = (ts) => {
    if (startTs === null) startTs = ts
    const elapsed = ts - startTs
    const progress = Math.min(1, elapsed / duration)
    const eased = easeOutCubic(progress)
    const value = from + (to - from) * eased
    current.value = Math.round(value)
    if (progress < 1) {
      rafId = requestAnimationFrame(tick)
    } else {
      current.value = to
      rafId = null
    }
  }

  const stop = () => {
    if (rafId) cancelAnimationFrame(rafId)
    rafId = null
    startTs = null
  }

  const animateTo = (nextTarget) => {
    if (typeof nextTarget !== 'number' || Number.isNaN(nextTarget)) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      stop()
      current.value = nextTarget
      return
    }
    stop()
    from = current.value
    to = nextTarget
    rafId = requestAnimationFrame(tick)
  }

  watch(
    () => (typeof target === 'function' ? target() : target?.value ?? target),
    (newVal) => animateTo(newVal),
    { immediate: true }
  )

  onUnmounted(stop)

  return { current, animateTo, stop }
}
