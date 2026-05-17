// Simple focus trap for drawers/modals. Cycles focus within a container's
// tabbable descendants. Tab → next, Shift+Tab → previous.
//
// Usage:
//   const containerRef = ref(null)
//   const { activate, deactivate } = useFocusTrap(containerRef)
//
import { onBeforeUnmount } from 'vue'

const TABBABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function useFocusTrap(containerRef) {
  let previousActive = null
  let active = false

  const tabbable = () => {
    const root = containerRef.value
    if (!root) return []
    return Array.from(root.querySelectorAll(TABBABLE_SELECTOR)).filter(
      (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
    )
  }

  const onKey = (e) => {
    if (!active || e.key !== 'Tab') return
    const items = tabbable()
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    const current = document.activeElement
    if (e.shiftKey && current === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && current === last) {
      e.preventDefault()
      first.focus()
    }
  }

  const activate = () => {
    if (active) return
    previousActive = document.activeElement
    active = true
    window.addEventListener('keydown', onKey)
    requestAnimationFrame(() => {
      const items = tabbable()
      if (items.length > 0) items[0].focus()
    })
  }

  const deactivate = () => {
    if (!active) return
    active = false
    window.removeEventListener('keydown', onKey)
    if (previousActive && typeof previousActive.focus === 'function') {
      try {
        previousActive.focus()
      } catch (_) { /* ignore */ }
    }
    previousActive = null
  }

  onBeforeUnmount(deactivate)

  return { activate, deactivate }
}
