<template>
  <div ref="rootEl" class="sp" :class="{ reduced }">
    <span class="sp-grain" aria-hidden="true" />
    <span class="sp-aura" aria-hidden="true" />
    <span v-for="m in 7" :key="'mote'+m" class="sp-mote" :style="moteStyle(m)" aria-hidden="true" />

    <header class="sp-cap">
      <span class="sp-cap-key"><Waypoints :size="13" /> Reporting hierarchy</span>
      <span class="sp-cap-meta">{{ tierMode === 'level' ? 'ranked by level' : tierMode === 'depth' ? 'ranked by reporting depth' : 'flat — wire reporting lines to stratify' }}</span>
    </header>

    <svg class="sp-svg" :viewBox="`0 0 1000 ${vbH}`" preserveAspectRatio="xMidYMin meet" role="img"
      aria-label="Designation reporting hierarchy">
      <defs>
        <linearGradient id="spSpine" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="var(--set-ember)" stop-opacity="0.25" />
          <stop offset="55%" stop-color="var(--set-gold)" stop-opacity="0.9" />
          <stop offset="100%" stop-color="var(--set-gold-bright)" />
        </linearGradient>
        <radialGradient id="spApex" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="var(--set-gold-bright)" stop-opacity="0.55" />
          <stop offset="70%" stop-color="var(--set-gold)" stop-opacity="0.08" />
          <stop offset="100%" stop-color="var(--set-gold)" stop-opacity="0" />
        </radialGradient>
      </defs>

      <!-- central energy spine -->
      <line class="sp-spine" x1="500" :y1="vbH - 24" x2="500" :y2="56" />
      <line class="sp-spine-flux" x1="500" :y1="vbH - 24" x2="500" :y2="56" />

      <!-- reporting filaments (child → parent / apex) -->
      <path v-for="f in filaments" :key="f.key" class="sp-fil"
        :class="{ lit: f.lit, dim: hoverId && !f.lit }" :d="f.d" />
      <path v-for="f in fluxFilaments" :key="'flux'+f.key" class="sp-fil-flux"
        :class="{ on: f.lit }" :d="f.d" />

      <!-- apex crown -->
      <g class="sp-apex" :transform="`translate(500 ${APEX_Y})`">
        <circle class="sp-apex-halo" r="46" fill="url(#spApex)" />
        <circle class="sp-apex-ring" r="26" />
        <circle class="sp-apex-core" r="17" />
        <g class="sp-apex-ic" transform="translate(-8 -8)"><Crown :size="16" /></g>
        <text class="sp-apex-lab" y="44" text-anchor="middle">ORG APEX</text>
      </g>

      <!-- tier guide rails + labels (own header row, above each plate row) -->
      <g v-for="(s, ti) in strata" :key="'tier'+s.key" class="sp-tier">
        <line class="sp-tier-rail" x1="64" :x2="936" :y1="headerY(ti)" :y2="headerY(ti)" />
        <text class="sp-tier-lab" x="66" :y="headerY(ti) - 8">{{ s.label }}</text>
        <text class="sp-tier-sub" x="934" :y="headerY(ti) - 8" text-anchor="end">{{ tierCountLabel(s) }}</text>
      </g>

      <!-- title plates -->
      <g v-for="p in plates" :key="p.id" class="sp-node"
        :class="{ lit: lit.has(p.id), dim: hoverId && !lit.has(p.id) }"
        :transform="`translate(${p.x} ${p.y})`" tabindex="0"
        @mouseenter="hoverId = p.id" @mouseleave="hoverId = null"
        @focus="hoverId = p.id" @blur="hoverId = null"
        @click="$emit('select', p.raw)" @keydown.enter="$emit('select', p.raw)">
        <title>{{ p.full }}{{ p.code ? ` · ${p.code}` : '' }}</title>
        <rect class="sp-plate" :x="-PW/2" :y="-PH/2" :width="PW" :height="PH" rx="10" />
        <rect class="sp-plate-edge" :x="-PW/2" :y="PH/2 - 3" :width="PW" height="3" rx="1.5" />
        <circle class="sp-plate-dot" :cx="-PW/2 + 14" :cy="-PH/2 + 14" r="4" :style="{ fill: p.dot }" />
        <text class="sp-plate-name" :x="-PW/2 + 26" :y="-PH/2 + 18">{{ p.name }}</text>
        <text class="sp-plate-code" :x="-PW/2 + 26" :y="-PH/2 + 34">{{ p.code }}</text>
        <g v-if="p.head > 0" class="sp-plate-hc" :transform="`translate(${PW/2 - 32} ${-PH/2 + 10})`">
          <rect x="0" y="0" width="26" height="16" rx="8" />
          <text x="13" y="11.5" text-anchor="middle">{{ p.head }}</text>
        </g>
      </g>
    </svg>

    <footer class="sp-foot">
      <span class="sp-foot-hint"><MousePointerClick :size="11" /> Hover to trace a reporting line · click a plate to edit</span>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Crown, Waypoints, MousePointerClick } from 'lucide-vue-next'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  designations: { type: Array, default: () => [] },
  usageById: { type: Object, default: () => ({}) }, // id → { employees, reporting_children }
  gradeById: { type: Object, default: () => ({}) }, // id → { name, code }
})
defineEmits(['select'])

const rootEl = ref(null)
usePointerSpotlight(rootEl)
const reduced = prefersReduced()
const hoverId = ref(null)

// ── geometry constants (viewBox units) ──────────────────────────────────────
// Each tier owns a HEADER row (rail + labels) at headerY, and a PLATE row
// PLATE_OFFSET below it — so labels never sit on top of the edge plates.
const APEX_Y = 56
const BAND_TOP = 150     // first tier's header rail Y
const TIER_GAP = 150     // header-to-header spacing
const PLATE_OFFSET = 46  // plate-row centre below its tier header
const SIDE = 70
const PW = 150           // plate width
const PH = 46            // plate height
const MAX_PER_TIER = 5

const byId = computed(() => Object.fromEntries(props.designations.map(d => [String(d.id), d])))

// depth of each node via its reporting chain (cycle-safe)
const depthOf = computed(() => {
  const map = {}
  const resolve = (id, guard) => {
    const sid = String(id)
    if (sid in map) return map[sid]
    const d = byId.value[sid]
    const pid = d?.reporting_to_designation_id ? String(d.reporting_to_designation_id) : null
    if (!pid || !byId.value[pid] || guard.has(sid)) { map[sid] = 0; return 0 }
    guard.add(sid)
    const v = resolve(pid, guard) + 1
    map[sid] = v
    return v
  }
  for (const d of props.designations) resolve(d.id, new Set())
  return map
})

const hasReporting = computed(() => props.designations.some(d => d.reporting_to_designation_id && byId.value[String(d.reporting_to_designation_id)]))
const hasLevels = computed(() => props.designations.some(d => d.level != null && d.level !== ''))
const tierMode = computed(() => hasReporting.value ? 'depth' : (hasLevels.value ? 'level' : 'flat'))

// ── stratify into ordered tiers (top → bottom) ──────────────────────────────
const strata = computed(() => {
  const list = props.designations
  if (!list.length) return []
  const groups = new Map()
  const push = (key, label, sortVal, d) => {
    if (!groups.has(key)) groups.set(key, { key, label, sort: sortVal, nodes: [] })
    groups.get(key).nodes.push(d)
  }
  if (tierMode.value === 'depth') {
    for (const d of list) {
      const dep = depthOf.value[String(d.id)] || 0
      push('d' + dep, dep === 0 ? 'Top of chain' : `Reports up · tier ${dep + 1}`, dep, d)
    }
  } else if (tierMode.value === 'level') {
    for (const d of list) {
      const lv = (d.level == null || d.level === '') ? -1 : Number(d.level)
      push('l' + lv, lv < 0 ? 'Unranked' : `Level ${lv}`, lv < 0 ? 9999 : -lv, d)
    }
  } else {
    for (const d of list) push('all', 'All titles', 0, d)
  }
  const arr = [...groups.values()].sort((a, b) => a.sort - b.sort)
  for (const g of arr) g.nodes.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
  return arr
})

const vbH = computed(() => BAND_TOP + Math.max(0, strata.value.length - 1) * TIER_GAP + PLATE_OFFSET + PH / 2 + 44)
const headerY = (ti) => BAND_TOP + ti * TIER_GAP
const bandY = (ti) => headerY(ti) + PLATE_OFFSET
const tierCountLabel = (s) => s.nodes.length > MAX_PER_TIER
  ? `${MAX_PER_TIER} of ${s.nodes.length} titles`
  : `${s.nodes.length} ${s.nodes.length === 1 ? 'title' : 'titles'}`

// amber ramp by tier depth — altitude reads as colour temperature
const TIER_DOT = ['var(--set-gold-bright)', 'var(--set-gold)', 'var(--set-amber)', 'var(--set-ember)', 'var(--set-rust)']
const tierColor = (ti) => TIER_DOT[Math.min(ti, TIER_DOT.length - 1)]

const trunc = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s }

// ── plate coordinates ───────────────────────────────────────────────────────
const plates = computed(() => {
  const out = []
  strata.value.forEach((s, ti) => {
    const shown = s.nodes.slice(0, MAX_PER_TIER)
    const n = shown.length
    const span = 1000 - 2 * SIDE - PW
    shown.forEach((d, k) => {
      const x = n === 1 ? 500 : (SIDE + PW / 2) + k * (span / (n - 1))
      const u = props.usageById[String(d.id)] || {}
      const g = props.gradeById[String(d.grade_id)]
      out.push({
        id: String(d.id), raw: d, x, y: bandY(ti),
        name: trunc(d.name, 13), full: d.name || '—', code: g?.code ? trunc(g.code, 8) : trunc(d.code, 9),
        head: Number(u.employees || 0), dot: tierColor(ti),
      })
    })
  })
  return out
})
const plateById = computed(() => Object.fromEntries(plates.value.map(p => [p.id, p])))

// ── reporting filaments ─────────────────────────────────────────────────────
const chainUp = (id) => {
  const set = new Set()
  let cur = String(id); let guard = 0
  while (cur && byId.value[cur] && guard < 40) {
    set.add(cur)
    const pid = byId.value[cur].reporting_to_designation_id
    cur = pid ? String(pid) : null
    guard++
  }
  return set
}
const lit = computed(() => hoverId.value ? chainUp(hoverId.value) : new Set())

const filaments = computed(() => {
  const out = []
  const mode = tierMode.value
  for (const p of plates.value) {
    const d = byId.value[p.id]
    const pid = d?.reporting_to_designation_id ? String(d.reporting_to_designation_id) : null
    const parent = pid ? plateById.value[pid] : null
    if (parent) {
      // real reporting line → curve up to the parent plate
      const c = { x: p.x, y: p.y - PH / 2 }
      const t = { x: parent.x, y: parent.y + PH / 2 }
      const dy = Math.max(26, (c.y - t.y) * 0.42)
      out.push({ key: p.id, d: `M ${c.x} ${c.y} C ${c.x} ${c.y - dy}, ${t.x} ${t.y + dy}, ${t.x} ${t.y}`, lit: lit.value.has(p.id) && lit.value.has(pid) })
    } else if (mode === 'depth') {
      // genuine top-of-chain (reporting lines exist) → rise to the apex
      const c = { x: p.x, y: p.y - PH / 2 }
      const t = { x: 500, y: APEX_Y + 22 }
      const dy = Math.max(26, (c.y - t.y) * 0.42)
      out.push({ key: p.id, d: `M ${c.x} ${c.y} C ${c.x} ${c.y - dy}, ${t.x} ${t.y + dy}, ${t.x} ${t.y}`, lit: lit.value.has(p.id) })
    } else {
      // flat / level-ranked: dock the plate to the central spine (short stub,
      // no long lines crossing other tiers)
      const innerX = p.x < 500 ? p.x + PW / 2 : (p.x > 500 ? p.x - PW / 2 : p.x)
      const mid = (innerX + 500) / 2
      out.push({ key: p.id, d: `M ${innerX} ${p.y} C ${mid} ${p.y}, ${mid} ${p.y}, 500 ${p.y}`, lit: lit.value.has(p.id) })
    }
  }
  return out
})

const fluxFilaments = computed(() => reduced ? [] : filaments.value)

const moteStyle = (i) => {
  const seed = (i * 73) % 100
  return {
    left: `${8 + (seed % 84)}%`,
    bottom: '-6%',
    animationDelay: `${(i * 1.7) % 9}s`,
    animationDuration: `${11 + (seed % 7)}s`,
    '--mx': `${(seed % 30) - 15}px`,
  }
}
</script>

<style scoped>
.sp {
  position: relative; overflow: hidden;
  border-radius: 18px; padding: 14px 8px 8px;
  background:
    radial-gradient(120% 90% at 50% -10%, color-mix(in srgb, var(--set-gold) 9%, transparent), transparent 60%),
    var(--set-surface);
  border: 1px solid var(--set-border);
  box-shadow: var(--set-card-shadow);
}
.sp-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.4; z-index: 0;
  background-image: linear-gradient(color-mix(in srgb, var(--set-gold) 6%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--set-gold) 6%, transparent) 1px, transparent 1px);
  background-size: 30px 30px;
  mask-image: radial-gradient(120% 130% at 50% 0%, #000 8%, transparent 70%);
  -webkit-mask-image: radial-gradient(120% 130% at 50% 0%, #000 8%, transparent 70%); }
.sp-aura { position: absolute; inset: -30% 20% auto 20%; height: 60%; z-index: 0; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--set-gold) 22%, transparent), transparent 70%); filter: blur(40px); }
.sp-mote { position: absolute; width: 3px; height: 3px; border-radius: 50%; z-index: 1; pointer-events: none;
  background: var(--set-gold-bright); box-shadow: 0 0 8px var(--set-gold); opacity: 0;
  animation: sp-rise 13s linear infinite; }
@keyframes sp-rise {
  0% { transform: translate(0, 0); opacity: 0; }
  12% { opacity: 0.8; }
  88% { opacity: 0.6; }
  100% { transform: translate(var(--mx, 0), calc(-1 * var(--rise, 360px))); opacity: 0; }
}

.sp-cap { position: relative; z-index: 2; display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding: 0 10px 8px; flex-wrap: wrap; }
.sp-cap-key { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--set-gold); }
.sp-cap-key :deep(svg) { color: var(--set-gold); }
.sp-cap-meta { font-size: 10.5px; color: var(--set-text-dim); font-style: italic; }

.sp-svg { position: relative; z-index: 1; display: block; width: 100%; height: auto; }

/* spine */
.sp-spine { stroke: url(#spSpine); stroke-width: 3; stroke-linecap: round; opacity: 0.5; }
.sp-spine-flux { stroke: var(--set-gold-bright); stroke-width: 2; stroke-linecap: round;
  stroke-dasharray: 6 220; opacity: 0.9; filter: drop-shadow(0 0 4px var(--set-gold));
  animation: sp-spine-flow 3.4s linear infinite; }
@keyframes sp-spine-flow { from { stroke-dashoffset: 226; } to { stroke-dashoffset: 0; } }

/* filaments */
.sp-fil { fill: none; stroke: var(--set-trace-idle); stroke-width: 1.5; opacity: 0.6; transition: stroke 0.3s, opacity 0.3s; }
.sp-fil.lit { stroke: var(--set-gold); opacity: 1; stroke-width: 2; }
.sp-fil.dim { opacity: 0.2; }
.sp-fil-flux { fill: none; stroke: var(--set-trace); stroke-width: 1.5; stroke-dasharray: 4 14; opacity: 0.45;
  animation: sp-fil-flow 2.6s linear infinite; }
.sp-fil-flux.on { stroke: var(--set-gold-bright); opacity: 1; filter: drop-shadow(0 0 3px var(--set-gold)); }
@keyframes sp-fil-flow { to { stroke-dashoffset: -36; } }

/* apex */
.sp-apex-halo { animation: sp-breathe 4.6s ease-in-out infinite; transform-origin: center; }
.sp-apex-ring { fill: none; stroke: var(--set-gold); stroke-width: 1.5; stroke-dasharray: 4 6; opacity: 0.7;
  transform-origin: center; animation: sp-spin 26s linear infinite; }
.sp-apex-core { fill: color-mix(in srgb, var(--set-gold) 22%, var(--set-surface-elevated)); stroke: var(--set-gold); stroke-width: 1.5; }
.sp-apex-ic { color: var(--set-gold-bright); }
.sp-apex-ic :deep(svg) { color: var(--set-gold-bright); }
.sp-apex-lab { fill: var(--set-text-dim); font-size: 11px; font-weight: 800; letter-spacing: 0.16em; }
@keyframes sp-breathe { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.12); } }
@keyframes sp-spin { to { transform: rotate(360deg); } }

/* tier rails */
.sp-tier-rail { stroke: var(--set-border); stroke-width: 1; stroke-dasharray: 2 7; opacity: 0.8; }
.sp-tier-lab { fill: var(--set-text-muted); font-size: 11.5px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
.sp-tier-sub { fill: var(--set-text-dim); font-size: 10.5px; font-weight: 600; }

/* plates */
.sp-node { cursor: pointer; outline: none; transition: opacity 0.3s; }
.sp-node .sp-plate { fill: var(--set-surface-elevated); stroke: var(--set-border-strong); stroke-width: 1;
  transition: stroke 0.25s, filter 0.25s; }
.sp-plate-edge { fill: var(--set-gold); opacity: 0.55; transition: opacity 0.25s; }
.sp-plate-dot { stroke: rgba(0,0,0,0.25); stroke-width: 0.5; }
.sp-plate-name { fill: var(--set-text); font-size: 13px; font-weight: 750; }
.sp-plate-code { fill: var(--set-text-dim); font-size: 10px; font-family: var(--set-mono); letter-spacing: 0.3px; }
.sp-plate-hc rect { fill: color-mix(in srgb, var(--set-ok) 16%, transparent); stroke: color-mix(in srgb, var(--set-ok) 36%, transparent); stroke-width: 1; }
.sp-plate-hc text { fill: var(--set-ok); font-size: 10.5px; font-weight: 800; }
.sp-node:hover .sp-plate, .sp-node:focus .sp-plate, .sp-node.lit .sp-plate {
  stroke: var(--set-gold); filter: drop-shadow(0 4px 14px color-mix(in srgb, var(--set-gold) 40%, transparent)); }
.sp-node:hover .sp-plate-edge, .sp-node.lit .sp-plate-edge { opacity: 1; }
.sp-node.dim { opacity: 0.4; }

.sp-foot { position: relative; z-index: 2; display: flex; justify-content: center; padding: 8px 6px 4px; }
.sp-foot-hint { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; color: var(--set-text-dim); }
.sp-foot-hint :deep(svg) { color: var(--set-gold); }

.sp.reduced .sp-spine-flux, .sp.reduced .sp-apex-halo, .sp.reduced .sp-apex-ring, .sp.reduced .sp-mote { animation: none; }

@media (prefers-reduced-motion: reduce) {
  .sp-spine-flux, .sp-fil-flux, .sp-apex-halo, .sp-apex-ring, .sp-mote { animation: none; }
}
</style>
