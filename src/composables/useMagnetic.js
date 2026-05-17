/**
 * useMagnetic — magnetic cursor follow for CTAs.
 *
 * Transforms the target with `translate(dx, dy)` where (dx, dy) is the cursor
 * offset from the element's centre, scaled by `strength` (default 0.2).
 *
 * Usage:
 *   const btnRef = ref(null)
 *   useMagnetic(btnRef, { strength: 0.22 })
 *   <button ref="btnRef">…</button>
 *
 * Honours `prefers-reduced-motion: reduce` — listener not attached.
 */
import { onMounted, onBeforeUnmount, watch } from 'vue'

export function useMagnetic(targetRef, { strength = 0.2, maxOffset = 14 } = {}) {
  let el = null
  let raf = 0
  let lastDx = 0
  let lastDy = 0
  let pending = false

  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const apply = () => {
    pending = false
    if (!el) return
    el.style.transform = `translate(${lastDx}px, ${lastDy}px)`
  }

  const onMove = (e) => {
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = (e.clientX - cx) * strength
    const dy = (e.clientY - cy) * strength
    lastDx = Math.max(-maxOffset, Math.min(maxOffset, dx))
    lastDy = Math.max(-maxOffset, Math.min(maxOffset, dy))
    if (!pending) {
      pending = true
      raf = requestAnimationFrame(apply)
    }
  }

  const onLeave = () => {
    if (!el) return
    lastDx = 0
    lastDy = 0
    el.style.transform = 'translate(0,0)'
  }

  const attach = (target) => {
    if (!target || target === el) return
    detach()
    if (reduce) {
      el = target
      return
    }
    el = target
    el.setAttribute('data-magnetic', 'true')
    el.addEventListener('mousemove', onMove, { passive: true })
    el.addEventListener('mouseleave', onLeave)
  }

  const detach = () => {
    if (!el) return
    el.removeEventListener('mousemove', onMove)
    el.removeEventListener('mouseleave', onLeave)
    if (raf) cancelAnimationFrame(raf)
    el = null
  }

  onMounted(() => attach(targetRef.value))
  watch(() => targetRef.value, (v) => attach(v))
  onBeforeUnmount(detach)
}
