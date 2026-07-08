<template>
  <!-- SdTeamInstrument — "THE STRIP BOARD" (gallery pick 04).
       An air-traffic-control flight-progress board: every ticket is a physical strip,
       unowned work waits in the HOLDING rack, and each crew member owns a bay. Strips
       are REAL (live queue rows keyed by ticket id, absolutely positioned) — when data
       changes (take-next / handoff / distribute / refresh) they FLY to their new seat
       via a transform transition. A dashed GHOST strip periodically previews routing
       from the rack to the calmest bay. Fills SdTeamOpsHero's #instrument slot;
       decorative (aria-hidden, no pointer events); theme-native; reduced-motion safe. -->
  <div ref="stageEl" class="sb" aria-hidden="true">
    <!-- board furniture -->
    <div class="sb-sweep" />
    <div class="sb-clock sd-mono">{{ clock }}<i>LOCAL</i></div>

    <!-- holding rack -->
    <div class="sb-rack" :style="rectStyle(rack)" :class="{ hot: rackStrips.length > 0 }">
      <span class="sb-rack-tag sd-mono">HOLDING · {{ stats.unassigned ?? rackStrips.length }}</span>
    </div>
    <div v-if="rackOverflow > 0" class="sb-more sd-mono" :style="posStyle(rackMorePos)">+{{ rackOverflow }}</div>

    <!-- bays -->
    <template v-for="(b, ci) in bays" :key="'bay' + String(b.agent_id)">
      <div class="sb-bay" :style="rectStyle(bayRect(ci))" :class="{ strain: (b.breaching || 0) > 0 }">
        <span class="sb-bay-head">
          <i class="sb-led" :class="ledOf(b)" />
          <b class="sd-mono">{{ ini(b.name) }}</b>
          <em class="sd-mono">{{ b.open }}</em>
        </span>
      </div>
      <div v-if="bayOverflow(ci) > 0" class="sb-more sd-mono" :style="posStyle(bayMorePos(ci))">+{{ bayOverflow(ci) }}</div>
    </template>

    <!-- the strips (single absolute layer → reassignments glide across the board) -->
    <div v-for="s in strips" :key="s.id" class="sb-strip sd-mono"
      :class="{ rose: s.rose, crit: s.crit }"
      :style="{ transform: `translate(${s.x}px, ${s.y}px) rotate(${s.tilt}deg)`, width: stripW + 'px' }">
      <i class="sb-spine" />{{ s.label }}
    </div>

    <!-- ghost routing preview (dashed, additive, dissolves — never real state) -->
    <div v-if="ghost" class="sb-strip ghost sd-mono"
      :style="{ transform: `translate(${ghost.x}px, ${ghost.y}px)`, width: stripW + 'px', opacity: ghost.o }">
      <i class="sb-spine" />ROUTE?
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  stats: { type: Object, default: () => ({}) },   // TeamQueueStats — roster + unassigned drive the furniture
  tickets: { type: Array, default: () => [] },    // live queue rows — the strips themselves
  now: { type: Number, default: () => Date.now() },
  reduced: { type: Boolean, default: false },
})

/* ── stage geometry (the console owns the left third; the board owns the rest) ── */
const stageEl = ref(null)
const W = ref(1100)
const H = ref(520)
let ro = null
onMounted(() => {
  ro = new ResizeObserver(([e]) => { W.value = e.contentRect.width; H.value = e.contentRect.height })
  if (stageEl.value) ro.observe(stageEl.value)
  if (!props.reduced) ghostTimer = setInterval(fireGhost, 6200)
})
onBeforeUnmount(() => { ro?.disconnect(); clearInterval(ghostTimer); clearTimeout(ghostFade) })

const narrow = computed(() => W.value < 760)
const x0 = computed(() => (narrow.value ? 0.05 : 0.40) * W.value)     // board left edge
const x1 = computed(() => 0.975 * W.value)
const stripH = 26
const stripGap = 7
const stripW = computed(() => Math.max(88, Math.min(128, colW.value - 18)))

const bays = computed(() => (props.stats.roster || []).filter(r => r.role !== 'collaborator').slice(0, 6))
const colW = computed(() => (x1.value - x0.value) / Math.max(1, bays.value.length))

const rack = computed(() => ({ x: x0.value, y: 0.075 * H.value, w: x1.value - x0.value, h: stripH + 26 }))
const bayTop = computed(() => rack.value.y + rack.value.h + 0.05 * H.value)
// the lens dock glasses over the hero's bottom ~90px — the board ends above it
const bayBottom = computed(() => H.value - 96)
const BAY_CAP = computed(() => Math.max(3, Math.floor((bayBottom.value - bayTop.value - 40) / (stripH + stripGap))))
const RACK_CAP = computed(() => Math.max(2, Math.floor((rack.value.w - 130) / (stripW.value + 10))))

const bayRect = (ci) => ({
  x: x0.value + ci * colW.value + 5, y: bayTop.value,
  w: colW.value - 10, h: bayBottom.value - bayTop.value,
})
const rectStyle = (r) => ({ left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' })
const posStyle = (p) => ({ left: p.x + 'px', top: p.y + 'px' })

/* ── strips from LIVE rows (keyed by ticket id → moves animate) ── */
const tilt = (id) => (parseInt(String(id).replace(/[^0-9a-f]/gi, '').slice(-4) || '0', 16) % 13 - 6) * 0.16
const grouped = computed(() => {
  const rackList = []
  const byBay = new Map(bays.value.map(b => [String(b.agent_id), []]))
  for (const t of props.tickets) {
    const key = t.assigned_agent_id ? String(t.assigned_agent_id) : null
    if (!key) rackList.push(t)
    else if (byBay.has(key)) byBay.get(key).push(t)
  }
  return { rackList, byBay }
})
const rackStrips = computed(() => grouped.value.rackList)
const strips = computed(() => {
  const out = []
  const { rackList, byBay } = grouped.value
  rackList.slice(0, RACK_CAP.value).forEach((t, i) => out.push({
    id: String(t.id), label: t.ticket_number, tilt: tilt(t.id),
    rose: !!(t.sla_response_breached || t.sla_resolution_breached),
    crit: t.priority === 'critical' || t.is_major_incident,
    x: rack.value.x + 118 + i * (stripW.value + 10),
    y: rack.value.y + 13,
  }))
  bays.value.forEach((b, ci) => {
    const r = bayRect(ci)
    ;(byBay.get(String(b.agent_id)) || []).slice(0, BAY_CAP.value).forEach((t, ri) => out.push({
      id: String(t.id), label: t.ticket_number, tilt: tilt(t.id),
      rose: !!(t.sla_response_breached || t.sla_resolution_breached),
      crit: t.priority === 'critical' || t.is_major_incident,
      x: r.x + (r.w - stripW.value) / 2,
      y: r.y + 36 + ri * (stripH + stripGap),
    }))
  })
  return out
})
const rackOverflow = computed(() => Math.max(0, grouped.value.rackList.length - RACK_CAP.value))
const rackMorePos = computed(() => ({ x: rack.value.x + rack.value.w - 44, y: rack.value.y + 18 }))
const bayOverflow = (ci) => {
  // the bay header already shows the TRUE open load; the +N chip only covers
  // strips of the CURRENT working set that don't fit on the board
  const b = bays.value[ci]
  const list = grouped.value.byBay.get(String(b.agent_id)) || []
  return Math.max(0, list.length - BAY_CAP.value)
}
const bayMorePos = (ci) => {
  const r = bayRect(ci)
  return { x: r.x + r.w / 2 - 16, y: r.y + 36 + BAY_CAP.value * (stripH + stripGap) - 2 }
}

/* ── bay furniture ── */
const ini = (n) => (n || '·').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
const ledOf = (b) => (b.breaching || 0) > 0 ? 'rose' : (b.open || 0) >= 5 ? 'gold' : 'sync'

/* ── clock ── */
const clock = computed(() => {
  const d = new Date(props.now)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
})

/* ── ghost routing preview: rack → calmest bay, dashed, dissolves ── */
const ghost = ref(null)
let ghostTimer = null
let ghostFade = null
const fireGhost = () => {
  if (props.reduced || document.hidden) return
  const { rackList, byBay } = grouped.value
  if (!rackList.length || !bays.value.length) return
  let ci = 0, best = Infinity
  bays.value.forEach((b, i) => {
    const n = (byBay.get(String(b.agent_id)) || []).length
    if (n < best) { best = n; ci = i }
  })
  const r = bayRect(ci)
  ghost.value = { x: rack.value.x + 118, y: rack.value.y + 13, o: 0.9 }
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (!ghost.value) return
    ghost.value = {
      x: r.x + (r.w - stripW.value) / 2,
      y: r.y + 36 + Math.min(best, BAY_CAP.value) * (stripH + stripGap),
      o: 0.9,
    }
    ghostFade = setTimeout(() => { if (ghost.value) ghost.value.o = 0; ghostFade = setTimeout(() => { ghost.value = null }, 450) }, 1100)
  }))
}
watch(() => props.reduced, (r) => { clearInterval(ghostTimer); if (!r) ghostTimer = setInterval(fireGhost, 6200) })
</script>

<style scoped>
.sb { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }

/* fluorescent sweep traversing the board */
.sb-sweep { position: absolute; top: 0; bottom: 0; width: 180px; left: -220px;
  background: linear-gradient(90deg, transparent, var(--sd-team-hi-soft), transparent);
  animation: sb-sweep 9s ease-in-out infinite; }
@keyframes sb-sweep { 0%, 12% { left: -220px; } 62%, 100% { left: 110%; } }

/* zulu clock */
.sb-clock { position: absolute; top: 12px; right: 18px; display: flex; align-items: baseline; gap: 7px;
  font-size: clamp(13px, 1.4vw, 17px); font-weight: 800; letter-spacing: 0.1em;
  color: var(--sd-team-hi); text-shadow: 0 0 14px var(--sd-team-soft); animation: sb-flicker 7s steps(1) infinite; }
[data-theme="light"] .sb-clock { color: var(--sd-team-deep); text-shadow: none; }
.sb-clock i { font-style: normal; font-size: 8.5px; letter-spacing: 0.24em; color: var(--sd-team-core); opacity: 0.7; }
@keyframes sb-flicker { 0%, 93%, 100% { opacity: 1; } 94% { opacity: 0.75; } 95% { opacity: 1; } 97% { opacity: 0.85; } 98% { opacity: 1; } }

/* holding rack */
.sb-rack { position: absolute; border-radius: 12px; border: 1.5px dashed var(--sd-team-brd);
  background: color-mix(in srgb, var(--sd-team-core) 4%, transparent); }
.sb-rack.hot { animation: sb-rack-breathe 3.2s ease-in-out infinite; }
@keyframes sb-rack-breathe {
  0%, 100% { border-color: var(--sd-team-brd); box-shadow: none; }
  50% { border-color: color-mix(in srgb, var(--sd-team-core) 60%, transparent); box-shadow: 0 0 22px var(--sd-team-soft); } }
.sb-rack-tag { position: absolute; top: 50%; left: 12px; transform: translateY(-50%);
  font-size: 9px; font-weight: 800; letter-spacing: 0.2em; color: var(--sd-team-core); opacity: 0.9; width: 96px; }

/* bays */
.sb-bay { position: absolute; border-radius: 14px 14px 4px 4px;
  border: 1px solid var(--sd-team-brd); border-bottom: none;
  background: linear-gradient(180deg, color-mix(in srgb, var(--sd-team-core) 7%, transparent), transparent 70%); }
.sb-bay.strain { border-color: color-mix(in srgb, var(--sd-team-strain) 55%, transparent); }
.sb-bay-head { position: absolute; top: 8px; left: 50%; transform: translateX(-50%);
  display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; }
.sb-bay-head b { font-size: 11px; font-weight: 800; letter-spacing: 0.12em; color: var(--sd-team-hi); }
[data-theme="light"] .sb-bay-head b { color: var(--sd-team-deep); }
.sb-bay-head em { font-style: normal; font-size: 10px; font-weight: 700; color: var(--sd-team-core); opacity: 0.85; }
.sb-led { width: 7px; height: 7px; border-radius: 50%; }
.sb-led.sync { background: var(--sd-team-sync); box-shadow: 0 0 8px var(--sd-team-sync-soft); }
.sb-led.gold { background: var(--sd-team-core); box-shadow: 0 0 8px var(--sd-team-soft); }
.sb-led.rose { background: var(--sd-team-strain); animation: sb-led-blink 1.1s ease-in-out infinite; }
@keyframes sb-led-blink { 50% { opacity: 0.35; } }

/* strips — one absolute layer; transform transition = the flight */
.sb-strip { position: absolute; top: 0; left: 0; height: 26px; display: flex; align-items: center;
  padding: 0 8px 0 12px; border-radius: 6px; overflow: hidden; white-space: nowrap;
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.07em; color: var(--sd-team-hi);
  background: linear-gradient(90deg, color-mix(in srgb, var(--sd-team-core) 26%, transparent), color-mix(in srgb, var(--sd-team-core) 12%, transparent));
  border: 1px solid color-mix(in srgb, var(--sd-team-core) 45%, transparent);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.35);
  transition: transform 0.85s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease;
  animation: sb-print 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
[data-theme="light"] .sb-strip { color: var(--sd-team-deep); box-shadow: 0 3px 8px rgba(109, 74, 10, 0.18); }
.sb-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--sd-team-core); }
.sb-strip.crit .sb-spine { background: var(--sd-pri-critical, #ef4444); }
.sb-strip.rose { color: #ffd7de; border-color: color-mix(in srgb, var(--sd-team-strain) 55%, transparent);
  background: repeating-linear-gradient(135deg,
    color-mix(in srgb, var(--sd-team-strain) 26%, transparent) 0 9px,
    color-mix(in srgb, var(--sd-team-strain) 10%, transparent) 9px 18px); }
[data-theme="light"] .sb-strip.rose { color: var(--sd-team-strain); }
.sb-strip.rose .sb-spine { background: var(--sd-team-strain); }
@keyframes sb-print { from { opacity: 0; margin-top: -16px; } to { opacity: 1; margin-top: 0; } }

/* ghost routing preview */
.sb-strip.ghost { border-style: dashed; background: transparent; color: var(--sd-team-core);
  box-shadow: 0 0 18px var(--sd-team-soft); transition: transform 1.15s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.45s ease; }

/* overflow chips */
.sb-more { position: absolute; padding: 3px 8px; border-radius: 999px; font-size: 9px; font-weight: 800;
  color: var(--sd-team-core); background: var(--sd-team-soft); border: 1px solid var(--sd-team-brd); }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .sb-sweep,
  html:not([data-cinematic="on"]) .sb-clock,
  html:not([data-cinematic="on"]) .sb-rack.hot,
  html:not([data-cinematic="on"]) .sb-led.rose,
  html:not([data-cinematic="on"]) .sb-strip { animation: none; }
  html:not([data-cinematic="on"]) .sb-strip { transition: none; }
}
</style>
