// Listen for the Escape key and call `handler`. Auto-binds on mount,
// auto-cleans on unmount. Optionally pass a reactive `enabled` getter
// to gate the listener (e.g. only while a drawer is open).
import { onBeforeUnmount, onMounted, watch } from 'vue'

export function useEscape(handler, options = {}) {
  const enabled = options.enabled ?? (() => true)

  const onKey = (e) => {
    if (e.key !== 'Escape') return
    if (typeof enabled === 'function' ? !enabled() : !enabled?.value) return
    handler(e)
  }

  let attached = false

  const attach = () => {
    if (attached) return
    window.addEventListener('keydown', onKey)
    attached = true
  }
  const detach = () => {
    if (!attached) return
    window.removeEventListener('keydown', onKey)
    attached = false
  }

  onMounted(attach)
  onBeforeUnmount(detach)

  if (typeof enabled !== 'function' && enabled && 'value' in enabled) {
    watch(enabled, (v) => (v ? attach() : detach()))
  }

  return { attach, detach }
}
