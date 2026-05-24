import { ref, computed, watch } from 'vue'

const STORAGE_KEY = 'theme_preference'
const VALID = ['dark', 'light', 'system']

const preference = ref(loadPreference())
const systemDark = ref(prefersDark())
const resolved = computed(() =>
  preference.value === 'system' ? (systemDark.value ? 'dark' : 'light') : preference.value
)

let mediaQuery = null
let bound = false

function loadPreference() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return VALID.includes(stored) ? stored : 'dark'
  } catch {
    return 'dark'
  }
}

function prefersDark() {
  if (typeof window === 'undefined' || !window.matchMedia) return true
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function applyToDocument(theme) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

function bindSystemListener() {
  if (bound || typeof window === 'undefined' || !window.matchMedia) return
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = (e) => { systemDark.value = e.matches }
  mediaQuery.addEventListener ? mediaQuery.addEventListener('change', handler) : mediaQuery.addListener(handler)
  bound = true
}

export function initTheme() {
  applyToDocument(resolved.value)
  bindSystemListener()
  watch(resolved, applyToDocument)
}

function runSweep(originEl, mutate) {
  if (prefersReducedMotion() || !document.startViewTransition) {
    mutate()
    return
  }

  const rect = originEl?.getBoundingClientRect?.()
  const cx = rect ? rect.left + rect.width / 2 : window.innerWidth - 32
  const cy = rect ? rect.top + rect.height / 2 : 32
  const radius = Math.hypot(
    Math.max(cx, window.innerWidth - cx),
    Math.max(cy, window.innerHeight - cy),
  )

  const transition = document.startViewTransition(mutate)
  transition.ready.then(() => {
    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${cx}px ${cy}px)`,
          `circle(${radius}px at ${cx}px ${cy}px)`,
        ],
      },
      {
        duration: 480,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        pseudoElement: '::view-transition-new(root)',
      },
    )
  }).catch(() => {})
}

export function useTheme() {
  function setPreference(next, originEl) {
    if (!VALID.includes(next)) return
    runSweep(originEl, () => {
      preference.value = next
      try { localStorage.setItem(STORAGE_KEY, next) } catch {}
    })
  }

  function toggle(originEl) {
    setPreference(resolved.value === 'dark' ? 'light' : 'dark', originEl)
  }

  function cycle(originEl) {
    const order = ['dark', 'light', 'system']
    const next = order[(order.indexOf(preference.value) + 1) % order.length]
    setPreference(next, originEl)
  }

  return {
    preference,
    resolved,
    isDark: computed(() => resolved.value === 'dark'),
    isLight: computed(() => resolved.value === 'light'),
    setPreference,
    toggle,
    cycle,
  }
}
