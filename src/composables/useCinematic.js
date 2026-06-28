// useCinematic — a global "Cinematic mode" switch.
//
// WHY THIS EXISTS: every animation in this app is wrapped in
// `@media (prefers-reduced-motion: reduce)` guards, so if the user's OS has
// "Reduce motion" turned on, the whole app renders static — which reads as
// "there are no animations" even though there are many. This composable lets
// the user OVERRIDE that per-app: when Cinematic mode is ON we stamp
// `data-cinematic="on"` on <html>, and components author their reduce-motion
// guard as `html:not([data-cinematic="on"]) .x { … }` so the full motion plays
// regardless of the OS setting. When OFF (the default) the OS preference is
// respected — accessibility-correct.
//
// Singleton state (module-scoped ref) so every consumer shares one switch.
import { ref, watch } from 'vue'

const KEY = 'fc.cinematic'

const read = () => {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}

const cinematic = ref(read())

const apply = (on) => {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-cinematic', on ? 'on' : 'off')
}

// Stamp the initial value as early as a consumer imports this module.
apply(cinematic.value)

let wired = false
const wire = () => {
  if (wired) return
  wired = true
  watch(cinematic, (on) => {
    apply(on)
    try { localStorage.setItem(KEY, on ? '1' : '0') } catch { /* private mode */ }
  })
}

export function useCinematic() {
  wire()
  const toggle = () => { cinematic.value = !cinematic.value }
  const set = (v) => { cinematic.value = !!v }
  return { cinematic, toggle, set }
}
