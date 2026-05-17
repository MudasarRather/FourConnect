/**
 * useSpotlight — cursor-following radial gradient.
 *
 * Wires `mousemove` on the passed ref'd element and writes `--mx`/`--my` CSS
 * custom properties (in percentages). Combine with the `.hr-spotlight` class
 * in `styles/hr-theme.css` (or any custom background that reads these vars).
 *
 * Honours `prefers-reduced-motion: reduce` — no listener attached.
 */
import { onMounted, onBeforeUnmount, watch } from 'vue'

export function useSpotlight(targetRef, { active = true } = {}) {
  let el = null
  let raf = 0
  let lastX = 0
  let lastY = 0
  let pending = false

  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const apply = () => {
    pending = false
    if (!el) return
    el.style.setProperty('--mx', lastX + '%')
    el.style.setProperty('--my', lastY + '%')
  }

  const onMove = (e) => {
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    lastX = ((e.clientX - rect.left) / rect.width) * 100
    lastY = ((e.clientY - rect.top) / rect.height) * 100
    if (!pending) {
      pending = true
      raf = requestAnimationFrame(apply)
    }
  }

  const onEnter = () => {
    if (el) el.setAttribute('data-spotlight-active', 'true')
  }
  const onLeave = () => {
    if (el) el.setAttribute('data-spotlight-active', 'false')
  }

  const attach = (target) => {
    if (!target || target === el) return
    detach()
    if (reduce || !active) {
      el = target
      return
    }
    el = target
    el.addEventListener('mousemove', onMove, { passive: true })
    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mouseleave', onLeave)
    el.setAttribute('data-spotlight', 'true')
  }

  const detach = () => {
    if (!el) return
    el.removeEventListener('mousemove', onMove)
    el.removeEventListener('mouseenter', onEnter)
    el.removeEventListener('mouseleave', onLeave)
    if (raf) cancelAnimationFrame(raf)
    el = null
  }

  onMounted(() => attach(targetRef.value))
  watch(() => targetRef.value, (v) => attach(v))
  onBeforeUnmount(detach)
}
