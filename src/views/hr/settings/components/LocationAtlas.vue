<template>
  <div ref="root" class="atl" :class="{ reduced }">
    <!-- ambient -->
    <span class="atl-grain" aria-hidden="true" />
    <span class="atl-aura" aria-hidden="true" />

    <!-- header readout -->
    <header class="atl-head">
      <div class="atl-title">
        <span class="atl-title-ic"><Globe2 :size="14" /></span>
        <div class="atl-title-tx">
          <b>The Meridian</b>
          <span>Live world clock · offices plotted by timezone</span>
        </div>
      </div>
      <div class="atl-readout">
        <div class="atl-utc">
          <span class="atl-utc-lab">UTC</span>
          <b class="set-mono">{{ utcLabel }}</b>
        </div>
        <button class="atl-stat" :class="{ on: openHi }" @mouseenter="openHi = true" @mouseleave="openHi = false" title="Offices currently inside 9–18 local business hours">
          <span class="atl-stat-dot" /><b>{{ openCount }}</b><span>open now</span>
        </button>
        <div class="atl-stat ghost"><Clock3 :size="12" /><b>{{ tzCount }}</b><span>zone{{ tzCount === 1 ? '' : 's' }}</span></div>
        <div class="atl-stat ghost"><Flag :size="12" /><b>{{ countryCount }}</b><span>countr{{ countryCount === 1 ? 'y' : 'ies' }}</span></div>
      </div>
    </header>

    <!-- world band -->
    <div ref="band" class="atl-band">
      <!-- night base + stars -->
      <span class="atl-night" aria-hidden="true" />
      <span class="atl-stars" aria-hidden="true">
        <i v-for="s in stars" :key="s.k" :style="{ left: s.x + '%', top: s.y + '%', '--d': s.d + 's', '--o': s.o }" />
      </span>

      <!-- day zones (lit hemisphere) -->
      <span v-for="(z, i) in day.zones" :key="'day' + i" class="atl-day" :style="{ left: z.left + '%', width: z.width + '%' }" aria-hidden="true" />
      <!-- sun glow at solar noon -->
      <span class="atl-sun" :style="{ left: day.noonPct + '%' }" aria-hidden="true"><i /></span>
      <!-- terminator dawn/dusk lines -->
      <span v-for="(t, i) in terminators" :key="'t' + i" class="atl-term" :class="t.kind" :style="{ left: t.x + '%' }" aria-hidden="true" />

      <!-- graticule -->
      <span class="atl-equator" aria-hidden="true" />
      <span v-for="g in gridlines" :key="'g' + g.x" class="atl-grid" :class="{ prime: g.prime }" :style="{ left: g.x + '%' }" aria-hidden="true">
        <em v-if="g.label">{{ g.label }}</em>
      </span>

      <!-- beacons -->
      <button
        v-for="b in plotted" :key="b.id" class="atl-beacon" :class="[b.typeKey, { open: b.open, hot: hovered === b.id }]"
        :style="{ left: b.x + '%', '--h': b.h + 'px', '--c': b.color }"
        @mouseenter="hovered = b.id" @mouseleave="hovered = null" @click="$emit('select', b.loc)"
        :title="`${b.loc.name} · ${b.local || '—'}`">
        <span class="atl-beam" aria-hidden="true" />
        <span class="atl-head-dot">
          <Crown v-if="b.typeKey === 'hq'" :size="9" />
          <span v-else class="atl-pip" />
        </span>
      </button>

      <!-- hover tooltip -->
      <transition name="atl-fade">
        <div v-if="hoveredB" class="atl-tip" :style="{ left: clampTip(hoveredB.x) + '%' }">
          <span class="atl-tip-type" :style="{ '--c': hoveredB.color }">{{ hoveredB.typeLabel }}</span>
          <b>{{ hoveredB.loc.name }}</b>
          <div class="atl-tip-meta">
            <span class="set-mono">{{ hoveredB.local || '—' }}</span>
            <span :class="hoveredB.open ? 'ok' : 'off'">{{ hoveredB.open ? 'Open' : (hoveredB.isDay ? 'Daytime' : 'After hours') }}</span>
          </div>
          <span v-if="hoveredB.place" class="atl-tip-place">{{ hoveredB.place }}</span>
        </div>
      </transition>

      <!-- empty -->
      <div v-if="!plotted.length && !offGrid.length" class="atl-empty">
        <MapPinned :size="22" />
        <p>No locations yet — add an office and it lights up on the world band.</p>
      </div>
    </div>

    <!-- off-grid tray (no timezone → can't be plotted) -->
    <transition name="atl-fade">
      <div v-if="offGrid.length" class="atl-offgrid">
        <span class="atl-offgrid-lab"><AlertTriangle :size="12" /> {{ offGrid.length }} off the grid — no timezone set</span>
        <button v-for="o in offGrid.slice(0, 6)" :key="o.id" class="atl-offchip" @click="$emit('select', o)">
          <MapPin :size="11" /> {{ o.name }}
        </button>
        <span v-if="offGrid.length > 6" class="atl-offmore">+{{ offGrid.length - 6 }}</span>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Globe2, Clock3, Flag, Crown, MapPin, MapPinned, AlertTriangle } from 'lucide-vue-next'
import { useNow, tzOffsetMinutes, tzLocal, lonFromOffset, lonToPct, dayZones, isBusinessHours, isDaylight } from '../composables/useLocationClock'
import { usePointerSpotlight, prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({ locations: { type: Array, default: () => [] } })
defineEmits(['select'])

const reduced = prefersReduced()
const root = ref(null)
const band = ref(null)
usePointerSpotlight(band)

const now = useNow()
const hovered = ref(null)
const openHi = ref(false)

const TYPE = {
  HQ: { key: 'hq', label: 'Headquarters', color: 'var(--set-gold)' },
  BRANCH: { key: 'branch', label: 'Branch', color: 'var(--set-orange)' },
  REMOTE: { key: 'remote', label: 'Remote', color: 'var(--set-ok)' },
  CLIENT_SITE: { key: 'client', label: 'Client site', color: 'var(--set-deep)' },
}
const typeOf = (t) => TYPE[t] || TYPE.HQ

// ── stars (deterministic, computed once) ─────────────────────────────────────
const stars = (() => {
  const out = []
  let s = 99173
  for (let i = 0; i < 46; i++) {
    s = (s * 9301 + 49297) % 233280
    const x = (s / 233280) * 100
    s = (s * 9301 + 49297) % 233280
    const y = 8 + (s / 233280) * 78
    s = (s * 9301 + 49297) % 233280
    out.push({ k: i, x, y, d: (2 + (s / 233280) * 4).toFixed(2), o: (0.25 + (s / 233280) * 0.55).toFixed(2) })
  }
  return out
})()

// ── gridlines (every 60°) ────────────────────────────────────────────────────
const gridlines = computed(() => {
  const out = []
  for (let lon = -180; lon <= 180; lon += 30) {
    const prime = lon === 0
    out.push({ x: lonToPct(lon), prime, label: lon % 60 === 0 ? (lon === 0 ? '0°' : `${lon > 0 ? '+' : ''}${lon / 15}h`) : '' })
  }
  return out
})

// ── day / night ──────────────────────────────────────────────────────────────
const day = computed(() => dayZones(now.value))
const terminators = computed(() => {
  const noon = day.value.noonPct
  // dawn = left edge of day (sun rising), dusk = right edge
  const dawn = (noon - 25 + 100) % 100
  const dusk = (noon + 25) % 100
  return [{ x: dawn, kind: 'dawn' }, { x: dusk, kind: 'dusk' }]
})

// ── plotted beacons ──────────────────────────────────────────────────────────
const enriched = computed(() => props.locations.map((loc) => {
  const off = tzOffsetMinutes(loc.timezone, now.value)
  const local = tzLocal(loc.timezone, now.value)
  const t = typeOf(loc.type)
  return {
    id: loc.id, loc, off, local: local?.label || '', minutes: local?.minutes ?? null,
    isDay: local ? isDaylight(local.hh) : false,
    open: local ? isBusinessHours(local.minutes) : false,
    typeKey: t.key, typeLabel: t.label, color: t.color,
    place: [loc.city, loc.country].filter(Boolean).join(', '),
  }
}))

const plotted = computed(() => {
  const list = enriched.value.filter((e) => e.off != null)
    .map((e) => ({ ...e, lon: lonFromOffset(e.off), x: lonToPct(lonFromOffset(e.off)) }))
    .sort((a, b) => a.x - b.x)
  // stagger pillar height when beacons cluster on the same longitude bucket
  const buckets = {}
  return list.map((e) => {
    const key = Math.round(e.x / 4)
    const lane = (buckets[key] = (buckets[key] || 0) + 1) - 1
    return { ...e, h: 64 + lane * 22 }
  })
})
const offGrid = computed(() => enriched.value.filter((e) => e.off == null).map((e) => e.loc))
const hoveredB = computed(() => plotted.value.find((b) => b.id === hovered.value) || null)

const openCount = computed(() => plotted.value.filter((b) => b.open).length)
const tzCount = computed(() => new Set(enriched.value.filter((e) => e.off != null).map((e) => e.off)).size)
const countryCount = computed(() => new Set(props.locations.map((l) => (l.country || '').trim().toLowerCase()).filter(Boolean)).size)

const utcLabel = computed(() => {
  const d = new Date(now.value)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`
})

const clampTip = (x) => Math.max(12, Math.min(88, x))
</script>

<style scoped>
.atl { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 13px; padding: 16px 18px;
  border-radius: 18px; border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow);
  background:
    radial-gradient(130% 80% at 80% -10%, color-mix(in srgb, var(--set-ok) 9%, transparent), transparent 60%),
    var(--set-panel); }
.atl-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.4; z-index: 0;
  background-image: linear-gradient(color-mix(in srgb, var(--set-ok) 6%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--set-ok) 6%, transparent) 1px, transparent 1px);
  background-size: 28px 28px; mask-image: radial-gradient(120% 120% at 100% 0%, #000 10%, transparent 70%);
  -webkit-mask-image: radial-gradient(120% 120% at 100% 0%, #000 10%, transparent 70%); }
.atl-aura { position: absolute; inset: -40% 20% auto -10%; height: 70%; z-index: 0; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--set-gold) 16%, transparent), transparent 70%); filter: blur(40px); }

/* header */
.atl-head { position: relative; z-index: 2; display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.atl-title { display: flex; align-items: center; gap: 10px; }
.atl-title-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; color: var(--set-ok);
  background: var(--set-ok-soft); border: 1px solid color-mix(in srgb, var(--set-ok) 30%, transparent); }
.atl-title-tx { display: flex; flex-direction: column; line-height: 1.3; }
.atl-title-tx b { font-size: 14px; font-weight: 850; color: var(--set-text); }
.atl-title-tx span { font-size: 10.5px; color: var(--set-text-muted); }
.atl-readout { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.atl-utc { display: flex; flex-direction: column; align-items: flex-end; line-height: 1.1; padding: 5px 11px; border-radius: 10px;
  background: var(--set-surface-elevated); border: 1px solid var(--set-border); }
.atl-utc-lab { font-size: 8px; font-weight: 850; letter-spacing: 0.14em; color: var(--set-text-dim); }
.atl-utc b { font-size: 14px; font-weight: 800; color: var(--set-gold); }
.atl-stat { display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px; border-radius: 999px; cursor: pointer; font: inherit;
  background: var(--set-surface-elevated); border: 1px solid var(--set-border); color: var(--set-text-muted); transition: all 0.2s var(--set-spring); }
.atl-stat b { font-size: 13px; font-weight: 850; color: var(--set-text); }
.atl-stat span { font-size: 10px; }
.atl-stat.ghost { cursor: default; }
.atl-stat.on { border-color: color-mix(in srgb, var(--set-ok) 40%, transparent); color: var(--set-ok); }
.atl-stat :deep(svg) { color: var(--set-text-muted); }
.atl-stat-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--set-ok); box-shadow: 0 0 8px var(--set-ok); animation: set-led-pulse 1.8s ease-in-out infinite; }

/* band */
.atl-band { position: relative; overflow: hidden; height: 248px; border-radius: 14px;
  border: 1px solid var(--set-border-strong); z-index: 1;
  background: linear-gradient(180deg, #0b0a08 0%, #100d09 55%, #08070a 100%); }
.atl-night { position: absolute; inset: 0; background:
    radial-gradient(140% 120% at 50% -20%, rgba(60,42,18,0.5), transparent 60%),
    linear-gradient(180deg, rgba(8,6,4,0.2), rgba(4,3,5,0.6)); }
.atl-stars { position: absolute; inset: 0; pointer-events: none; }
.atl-stars i { position: absolute; width: 2px; height: 2px; border-radius: 50%; background: rgba(255,238,205,var(--o, 0.5));
  box-shadow: 0 0 4px rgba(255,230,190,0.5); animation: atl-twinkle var(--d, 3s) ease-in-out infinite; }
@keyframes atl-twinkle { 0%, 100% { opacity: 0.2; transform: scale(0.7); } 50% { opacity: 1; transform: scale(1.2); } }

.atl-day { position: absolute; top: 0; bottom: 0;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--set-gold) 18%, transparent) 25%,
    color-mix(in srgb, var(--set-gold-bright) 26%, transparent) 50%, color-mix(in srgb, var(--set-gold) 18%, transparent) 75%, transparent);
  mix-blend-mode: screen; pointer-events: none; }
.atl-sun { position: absolute; top: 0; bottom: 0; width: 0; pointer-events: none; }
.atl-sun i { position: absolute; top: 16%; left: 0; width: 120px; height: 120px; transform: translateX(-50%);
  border-radius: 50%; background: radial-gradient(circle, rgba(255,221,150,0.55), rgba(255,200,110,0.15) 45%, transparent 70%);
  filter: blur(4px); animation: atl-sun-breathe 6s ease-in-out infinite; }
@keyframes atl-sun-breathe { 0%, 100% { opacity: 0.8; transform: translateX(-50%) scale(1); } 50% { opacity: 1; transform: translateX(-50%) scale(1.08); } }
.atl-term { position: absolute; top: 0; bottom: 0; width: 2px; pointer-events: none; opacity: 0.8; }
.atl-term.dawn { background: linear-gradient(180deg, transparent, rgba(255,196,120,0.85), transparent); box-shadow: 0 0 14px rgba(255,180,90,0.6); }
.atl-term.dusk { background: linear-gradient(180deg, transparent, rgba(217,119,6,0.7), transparent); box-shadow: 0 0 14px rgba(180,83,9,0.5); }

.atl-equator { position: absolute; left: 0; right: 0; top: 58%; height: 1px; background: rgba(255,238,205,0.12); pointer-events: none; }
.atl-grid { position: absolute; top: 0; bottom: 0; width: 1px; background: rgba(255,238,205,0.06); pointer-events: none; }
.atl-grid.prime { background: rgba(255,238,205,0.16); }
.atl-grid em { position: absolute; bottom: 4px; left: 3px; font-style: normal; font-size: 8px; font-family: var(--set-mono); color: rgba(255,238,205,0.3); white-space: nowrap; }

/* beacons */
.atl-beacon { position: absolute; bottom: 26px; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
  height: var(--h, 70px); padding: 0; background: none; border: 0; cursor: pointer; z-index: 3; }
.atl-beam { width: 2px; flex: 1; border-radius: 2px;
  background: linear-gradient(180deg, var(--c), color-mix(in srgb, var(--c) 6%, transparent));
  box-shadow: 0 0 10px -1px var(--c); opacity: 0.55; transition: opacity 0.25s, box-shadow 0.25s; }
.atl-beacon.open .atl-beam { opacity: 1; box-shadow: 0 0 16px 0 var(--c); }
.atl-beacon.hot .atl-beam { opacity: 1; }
.atl-head-dot { position: relative; margin-bottom: -4px; display: grid; place-items: center; width: 17px; height: 17px; border-radius: 50%; flex-shrink: 0;
  color: #1a1206; background: var(--c); border: 2px solid color-mix(in srgb, var(--c) 50%, #000);
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--c) 60%, transparent); transition: transform 0.25s var(--set-spring); }
.atl-beacon.open .atl-head-dot { animation: atl-ping 2.4s ease-out infinite; }
.atl-beacon.hot .atl-head-dot { transform: scale(1.28); }
.atl-pip { width: 5px; height: 5px; border-radius: 50%; background: #1a1206; }
@keyframes atl-ping { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--c) 55%, transparent); } 70%, 100% { box-shadow: 0 0 0 11px transparent; } }

/* tooltip */
.atl-tip { position: absolute; bottom: 96px; transform: translateX(-50%); z-index: 6; pointer-events: none; min-width: 130px;
  padding: 8px 11px; border-radius: 11px; background: var(--set-surface-elevated); border: 1px solid var(--set-border-strong);
  box-shadow: 0 16px 34px -18px rgba(0,0,0,0.8); }
.atl-tip-type { font-size: 8px; font-weight: 850; letter-spacing: 0.1em; text-transform: uppercase; color: var(--c); }
.atl-tip b { display: block; font-size: 12.5px; font-weight: 800; color: var(--set-text); margin: 1px 0 3px; }
.atl-tip-meta { display: flex; align-items: center; gap: 8px; }
.atl-tip-meta .set-mono { font-size: 12px; font-weight: 800; color: var(--set-gold); }
.atl-tip-meta span { font-size: 9.5px; font-weight: 700; }
.atl-tip-meta .ok { color: var(--set-ok); } .atl-tip-meta .off { color: var(--set-text-dim); }
.atl-tip-place { display: block; margin-top: 3px; font-size: 9.5px; color: var(--set-text-muted); }

.atl-empty { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--set-text-dim); text-align: center; }
.atl-empty :deep(svg) { color: var(--set-ok); }
.atl-empty p { margin: 0; font-size: 12px; max-width: 30ch; }

/* off-grid */
.atl-offgrid { position: relative; z-index: 2; display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.atl-offgrid-lab { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; color: var(--set-partial); }
.atl-offgrid-lab :deep(svg) { color: var(--set-partial); }
.atl-offchip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; cursor: pointer; font: inherit;
  font-size: 10.5px; font-weight: 600; color: var(--set-text-secondary); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s; }
.atl-offchip:hover { color: var(--set-partial); border-color: color-mix(in srgb, var(--set-partial) 36%, transparent); }
.atl-offchip :deep(svg) { color: var(--set-partial); }
.atl-offmore { font-size: 10px; color: var(--set-text-dim); }

.atl-fade-enter-active, .atl-fade-leave-active { transition: opacity 0.2s; }
.atl-fade-enter-from, .atl-fade-leave-to { opacity: 0; }

/* light theme: warm dawn band, not screen-blended washout */
[data-theme="light"] .atl-band { border-color: rgba(40,25,10,0.18);
  background: linear-gradient(180deg, #2a2118 0%, #1f1812 55%, #181009 100%); }
[data-theme="light"] .atl-day { mix-blend-mode: normal;
  background: linear-gradient(90deg, transparent, rgba(245,180,90,0.28) 25%, rgba(255,205,120,0.4) 50%, rgba(245,180,90,0.28) 75%, transparent); }

@media (prefers-reduced-motion: reduce) {
  .atl-stars i, .atl-sun i, .atl-stat-dot, .atl-beacon.open .atl-head-dot { animation: none !important; }
}
.atl.reduced .atl-beam { transition: none; }
</style>
