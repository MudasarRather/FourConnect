/**
 * useTheatre — thin wrapper around @theatre/core for declarative animation timelines.
 *
 * Pattern: one Project named "Recruitment" hosts one Sheet per choreographed
 * scene ("HeroEntrance", "DashboardEntrance", "PipelineEntrance"). Each sheet
 * exposes Objects whose properties (opacity, y, scale, etc.) you bind to via
 * `onValuesChange`. The play() helper drives the sheet's sequence forward.
 *
 * In dev, @theatre/studio is initialized so you can author keyframes live in
 * the browser. The dev-only branch is guarded by `import.meta.env.DEV` so
 * Studio is tree-shaken from production builds.
 */
import { onBeforeUnmount, onMounted } from 'vue'
import { getProject, types } from '@theatre/core'

let _studioReady = false

async function initStudioIfDev() {
  // Studio is opt-in via ?theatre=1 query param. Without this guard the
  // Outline + Properties panels overlay the app in dev and obscure the UI.
  if (!import.meta.env.DEV || _studioReady) return
  if (typeof window === 'undefined') return
  const enabled = new URLSearchParams(window.location.search).get('theatre') === '1'
  if (!enabled) return
  _studioReady = true
  try {
    const studio = (await import('@theatre/studio')).default
    studio.initialize()
  } catch (e) {
    console.warn('[Theatre] studio init skipped:', e?.message || e)
  }
}

const _projects = new Map()
export function getRecruitmentProject() {
  if (!_projects.has('Recruitment')) {
    _projects.set('Recruitment', getProject('Recruitment'))
  }
  return _projects.get('Recruitment')
}

/**
 * Reduced-motion guard. When true, callers should snap to end state instead
 * of animating.
 */
export function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * useTheatreSheet(sheetName, schema) → { sheet, play, reset, addObject }
 *
 * schema: optional default Object schemas, eg.
 *   { title: { opacity: 0, y: 12 }, subtitle: { opacity: 0, y: 8 } }
 * Pass via `addObject(name, schema)` instead if you need to construct dynamically.
 */
export function useTheatreSheet(sheetName, schema = {}) {
  initStudioIfDev()
  const project = getRecruitmentProject()
  const sheet = project.sheet(sheetName)

  // Pre-register schema-driven objects so Studio can find them on first mount.
  const objects = {}
  for (const [name, props] of Object.entries(schema)) {
    objects[name] = sheet.object(name, _wrapPropTypes(props))
  }

  const addObject = (name, props) => {
    if (objects[name]) return objects[name]
    objects[name] = sheet.object(name, _wrapPropTypes(props))
    return objects[name]
  }

  const play = (opts = {}) => {
    if (prefersReducedMotion()) {
      // Jump to end state instantly.
      try { sheet.sequence.position = sheet.sequence.length || 0 } catch {}
      return Promise.resolve()
    }
    return sheet.sequence.play({ iterationCount: 1, ...opts })
  }
  const reset = () => {
    try { sheet.sequence.position = 0 } catch {}
  }

  onBeforeUnmount(() => {
    // Theatre keeps state attached to the project; we just stop playback.
    try { sheet.sequence.pause() } catch {}
  })

  return { sheet, objects, addObject, play, reset }
}

// Wrap raw numbers/strings in Theatre type helpers so Studio gets a nice
// editing UI. Callers can also pass already-wrapped types and we leave them.
function _wrapPropTypes(props) {
  const out = {}
  for (const [k, v] of Object.entries(props)) {
    if (v && typeof v === 'object' && v.__type) {
      out[k] = v
    } else if (typeof v === 'number') {
      out[k] = types.number(v, { range: [-300, 300] })
    } else if (typeof v === 'string') {
      out[k] = types.string(v)
    } else if (typeof v === 'boolean') {
      out[k] = types.boolean(v)
    } else {
      out[k] = v
    }
  }
  return out
}

/**
 * Tiny convenience: bind a Theatre Object's values into a Vue ref's nested
 * fields. Caller owns the ref's shape. Returns a teardown function (also
 * auto-called on unmount when used inside setup()).
 */
export function bindObjectToRef(object, refTarget) {
  const unsub = object.onValuesChange((values) => {
    if (!refTarget?.value) return
    for (const [k, v] of Object.entries(values)) {
      refTarget.value[k] = v
    }
  })
  onBeforeUnmount(() => unsub?.())
  return unsub
}

/**
 * Run a simple time-based stagger using requestAnimationFrame when Theatre is
 * overkill (eg. a single fade-up sequence). This is a fallback used by some
 * components that want choreography without a full Theatre sheet.
 */
export function stagger(items, fn, { delay = 60, start = 0 } = {}) {
  if (prefersReducedMotion()) {
    items.forEach((it, i) => fn(it, i, 1))
    return
  }
  items.forEach((it, i) => {
    setTimeout(() => fn(it, i, 1), start + i * delay)
  })
}
