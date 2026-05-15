import { ref, onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Flip } from 'gsap/Flip'

let pluginsRegistered = false
let routerHookAttached = false

function registerPluginsOnce() {
  if (pluginsRegistered) return
  gsap.registerPlugin(ScrollTrigger, Flip)
  ScrollTrigger.config({ ignoreMobileResize: true })
  gsap.ticker.lagSmoothing(1000, 16)
  pluginsRegistered = true
}

export async function attachRouterCleanup() {
  if (routerHookAttached) return
  try {
    const mod = await import('../router/index.js')
    const router = mod.default
    if (router && typeof router.afterEach === 'function') {
      router.afterEach(() => {
        ScrollTrigger.getAll().forEach((t) => t.kill())
        requestAnimationFrame(() => ScrollTrigger.refresh())
      })
      routerHookAttached = true
    }
  } catch (e) {
    // Router not available; ignore
  }
}

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useGsapAnim(rootRef) {
  registerPluginsOnce()
  attachRouterCleanup()

  const ctx = ref(null)
  const reducedMotion = prefersReducedMotion()

  const run = (fn) => {
    onMounted(() => {
      const scope = rootRef && rootRef.value ? rootRef.value : undefined
      ctx.value = gsap.context(() => {
        try {
          fn({ gsap, ScrollTrigger, Flip, reducedMotion })
        } catch (err) {
          console.warn('[useGsapAnim] callback error', err)
        }
      }, scope)
    })
    onUnmounted(() => {
      ctx.value?.revert()
      ctx.value = null
    })
  }

  return { run, reducedMotion, gsap, ScrollTrigger, Flip }
}

export { gsap, ScrollTrigger, Flip }
