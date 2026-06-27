// Merit-policy band helpers — shared by SetMeritPolicySection + MeritCurve.
// NOTE: the page lives in the SETTINGS scope, where the performance theme's
// --perf-* vars do NOT resolve. So band colours are mapped to --set-* tokens
// here (the old code reused usePerformance.bandTone → invisible bands). Keep all
// colour + geometry maths in one place so the curve, cards and modal agree.

const num = (v) => Number(v) || 0
const clamp01 = (v) => Math.max(0, Math.min(1, v))

// Canonical 5-tier taxonomy (best → worst), coloured on the settings palette.
export const BAND_KEY_COLOR = {
  EXCEPTIONAL: 'var(--set-ok)',
  EXCEEDS:     'var(--set-gold)',
  MEETS:       'var(--set-amber)',
  PARTIAL:     'var(--set-orange)',
  BELOW:       'var(--set-conflict)',
}
// Positional fallback for custom / un-keyed bands (top band greenest).
const BAND_PALETTE = ['var(--set-ok)', 'var(--set-gold)', 'var(--set-amber)', 'var(--set-orange)', 'var(--set-conflict)', 'var(--set-ember)', 'var(--set-rust)']

/** Colour for a band. `rankFromTop` = its index when sorted high→low score. */
export function bandColor(band, rankFromTop = 0) {
  if (band?.key && BAND_KEY_COLOR[band.key]) return BAND_KEY_COLOR[band.key]
  return BAND_PALETTE[Math.min(rankFromTop, BAND_PALETTE.length - 1)]
}

// Tier dropdown options (SetSelect) — picking one sets key (→ colour) + label.
export const TIER_OPTIONS = [
  { value: 'EXCEPTIONAL', label: 'Exceptional',        dot: 'var(--set-ok)' },
  { value: 'EXCEEDS',     label: 'Exceeds',            dot: 'var(--set-gold)' },
  { value: 'MEETS',       label: 'Meets expectations', dot: 'var(--set-amber)' },
  { value: 'PARTIAL',     label: 'Partially meets',    dot: 'var(--set-orange)' },
  { value: 'BELOW',       label: 'Below expectations', dot: 'var(--set-conflict)' },
  { value: 'CUSTOM',      label: 'Custom band',        dot: 'var(--set-text-muted)' },
]
export const TIER_DEFAULT_LABEL = {
  EXCEPTIONAL: 'Exceptional', EXCEEDS: 'Exceeds', MEETS: 'Meets expectations',
  PARTIAL: 'Partially meets', BELOW: 'Below expectations',
}

/** Normalised, score-descending view of bands for rendering. */
export function sortedBands(bands) {
  return [...(bands || [])]
    .map((b) => ({
      key: b.key || null,
      label: b.label || b.key || 'Band',
      lo: clamp01(num(b.frac_min)),
      hi: clamp01(num(b.frac_max) > 1 ? 1 : num(b.frac_max)),
      hmin: num(b.hike_min_pct),
      hmax: num(b.hike_max_pct),
      auto_pip: !!b.auto_pip,
    }))
    .sort((a, b) => b.lo - a.lo)
}

/**
 * Governance analysis of a band set — the "is this policy sound?" check that
 * makes the page corporate-grade. Returns coverage gaps, overlaps, a
 * monotonicity smell (a higher score earning a lower hike) and a verdict.
 */
export function analyzeBands(bands) {
  const asc = [...(bands || [])]
    .map((b) => ({
      key: b.key || null, label: b.label || b.key || 'Band',
      lo: clamp01(num(b.frac_min)), hi: clamp01(num(b.frac_max) > 1 ? 1 : num(b.frac_max)),
      hmin: num(b.hike_min_pct), hmax: num(b.hike_max_pct),
    }))
    .sort((a, b) => a.lo - b.lo || a.hi - b.hi)

  const gaps = []
  const overlaps = []
  let cursor = 0
  for (const s of asc) {
    if (s.lo > cursor + 1e-4) gaps.push({ lo: cursor, hi: s.lo })
    if (s.lo < cursor - 1e-4) overlaps.push({ lo: s.lo, hi: Math.min(cursor, s.hi) })
    cursor = Math.max(cursor, s.hi)
  }
  if (cursor < 1 - 1e-4) gaps.push({ lo: cursor, hi: 1 })

  // monotonic: ascending score should never earn a strictly lower max hike
  let monotonicWarn = false
  for (let i = 1; i < asc.length; i++) {
    if (asc[i].hmax < asc[i - 1].hmax - 1e-4) monotonicWarn = true
  }
  // ranges where hike_min > hike_max (invalid clamp window)
  const invalidRange = asc.some((s) => s.hmax < s.hmin - 1e-4)

  const full = gaps.length === 0 && overlaps.length === 0
  const topHike = asc.length ? Math.max(...asc.map((s) => s.hmax)) : 0
  return { asc, gaps, overlaps, full, monotonicWarn, invalidRange, topHike }
}

/** Resolve which band a fractional score (0..1) lands in — mirrors backend. */
export function bandAtFrac(bands, frac) {
  const f = clamp01(frac)
  const desc = sortedBands(bands)
  for (const b of desc) {
    if (f >= b.lo && (f < b.hi || b.hi >= 1)) return b
  }
  return desc.length ? desc[desc.length - 1] : null
}

export const fmtPct = (v) => {
  const n = num(v)
  return Number.isInteger(n) ? `${n}%` : `${n.toFixed(1)}%`
}
export const hikeRangeLabel = (b) =>
  (b.hmin === b.hmax) ? fmtPct(b.hmin) : `${fmtPct(b.hmin)}–${fmtPct(b.hmax)}`
