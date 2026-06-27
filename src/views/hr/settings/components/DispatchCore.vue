<template>
  <div class="dc" ref="sceneEl" :class="{ live: !reduced }">
    <span class="dc-grain" aria-hidden="true" />
    <span class="dc-aura" aria-hidden="true" />
    <span class="dc-floor" aria-hidden="true" />
    <div class="dc-motes" aria-hidden="true"><i v-for="n in 14" :key="n" class="dc-mote" :style="moteStyle(n)" /></div>

    <div class="dc-hud">
      <span class="dc-hud-dot" /><span class="dc-hud-lab">Dispatch deck</span>
      <span class="dc-hud-sep">·</span><span class="dc-hud-val">{{ activeCount }} live rules</span>
    </div>
    <div class="dc-clock"><span class="dc-clock-live">● LIVE</span><b class="set-mono">{{ clock }}</b></div>

    <div v-if="loading" class="dc-skel"><span class="dc-skel-beam" /></div>

    <div v-else class="dc-stage">
      <!-- beam layer: core → each channel -->
      <svg class="dc-beams" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <g v-for="(ch, i) in CHANNELS" :key="ch.key" class="dc-beam" :class="{ fire: isFiring(ch.key) }" :style="{ '--cc': ch.color }">
          <path class="dc-beam-base" :d="beamPath(i)" />
          <path class="dc-beam-live" :d="beamPath(i)" pathLength="100" />
          <path class="dc-beam-live b2" :d="beamPath(i)" pathLength="100" />
        </g>
      </svg>

      <!-- emitter core -->
      <div class="dc-core">
        <span class="dc-core-sweep" aria-hidden="true" />
        <span class="dc-orbit o1" aria-hidden="true"><i /></span>
        <span class="dc-orbit o2" aria-hidden="true"><i /></span>
        <span class="dc-orbit o3" aria-hidden="true"><i /></span>
        <span v-for="r in 3" :key="'ring' + r + cycle" class="dc-ring" :style="{ '--rd': r }" aria-hidden="true" />
        <span class="dc-core-orb" :key="'orb' + cycle">
          <component :is="moduleIcon(active?.module)" :size="24" />
        </span>
      </div>

      <!-- broadcast readout -->
      <div class="dc-readout" :key="'bc' + cycle">
        <span class="dc-readout-lab">{{ hasActive ? 'Broadcasting' : 'Default · in-app' }}</span>
        <b class="dc-readout-ev">{{ active?.label || '—' }}</b>
        <span class="dc-readout-aud"><component :is="audMeta(active?.audience).icon || Users" :size="11" /> to {{ audMeta(active?.audience).label }}</span>
        <span class="dc-eq" aria-hidden="true"><i v-for="b in 5" :key="b" :style="{ '--b': b }" /></span>
      </div>

      <!-- channel transceivers -->
      <div v-for="(ch, i) in CHANNELS" :key="ch.key" class="dc-ch" :class="{ fire: isFiring(ch.key), off: !ch.live }"
        :style="{ top: chY(i) + '%', '--cc': ch.color }">
        <span class="dc-ch-node">
          <component :is="ch.icon" :size="15" />
          <span v-if="isFiring(ch.key)" :key="'dl' + ch.key + cycle" class="dc-ch-deliver" />
        </span>
        <div class="dc-ch-meta">
          <b>{{ ch.label }}</b>
          <span v-if="!ch.live" class="dc-ch-soon">transport soon</span>
          <span v-else class="dc-ch-state">{{ isFiring(ch.key) ? 'delivering' : 'in-app live' }}</span>
        </div>
        <span class="dc-ch-reach">{{ reach[ch.key] || 0 }}</span>
      </div>
    </div>

    <!-- transmission ticker -->
    <div v-if="!loading && ticker.length" class="dc-ticker" aria-hidden="true">
      <div class="dc-ticker-track">
        <span v-for="(t, i) in tickerLoop" :key="i" class="dc-tx" :class="{ now: t.now }">
          <Send :size="10" /> {{ t.label }}
          <em>{{ t.chs }}</em>
          <span class="dc-tx-aud">· {{ t.aud }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Users, Send } from 'lucide-vue-next'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'
import { CHANNELS, CHANNEL_BY_KEY, AUDIENCE_BY_VALUE, moduleIcon, eventDefaultTitle } from '../composables/notifyMeta'

const props = defineProps({
  rules: { type: Array, default: () => [] },
  events: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const sceneEl = ref(null)
const reduced = prefersReduced()
usePointerSpotlight(sceneEl)

const eventMeta = computed(() => Object.fromEntries(props.events.map(e => [e.event, e])))
const audMeta = (a) => AUDIENCE_BY_VALUE[a] || AUDIENCE_BY_VALUE.EMPLOYEE
const activeCount = computed(() => props.rules.filter(r => r.is_active && (r.channels || []).length).length)

const reach = computed(() => {
  const r = {}; for (const c of CHANNELS) r[c.key] = 0
  for (const rule of props.rules) { if (!rule.is_active) continue; for (const ch of (rule.channels || [])) if (r[ch] != null) r[ch]++ }
  return r
})

const hasActive = computed(() => activeCount.value > 0)
const queue = computed(() => {
  const active = props.rules.filter(r => r.is_active && (r.channels || []).length)
  if (active.length) {
    return active.map(r => {
      const m = eventMeta.value[r.event]
      return { event: r.event, label: m?.label || eventDefaultTitle(r.event), module: m?.module, audience: r.audience, channels: r.channels || [] }
    })
  }
  return (props.events.slice(0, 6)).map(e => ({ event: e.event, label: e.label, module: e.module, audience: 'EMPLOYEE', channels: ['IN_APP'] }))
})

const cycle = ref(0)
const active = computed(() => (queue.value.length ? queue.value[cycle.value % queue.value.length] : null))
const isFiring = (chKey) => (active.value?.channels || []).includes(chKey)

// geometry — core at (20,46); channel endpoints fan to x≈64
const chY = (i) => [14, 31, 48, 65, 82][i] ?? 48
const beamPath = (i) => `M20,46 C44,46 46,${chY(i)} 64,${chY(i)}`

// transmission ticker — recent broadcasts (continuous marquee)
const ticker = computed(() => queue.value.slice(0, 8).map((q, i) => ({
  label: q.label,
  chs: (q.channels || []).map(k => CHANNEL_BY_KEY[k]?.short || k).join(' · '),
  aud: audMeta(q.audience).label,
  now: i === (cycle.value % Math.max(1, queue.value.length)),
})))
const tickerLoop = computed(() => [...ticker.value, ...ticker.value])

const clock = ref('--:--:--')
function tick() { try { clock.value = new Date().toLocaleTimeString('en-GB', { hour12: false }) } catch { /* noop */ } }

let timer = null, clockTimer = null
onMounted(() => {
  tick(); clockTimer = setInterval(tick, 1000)
  if (reduced) return
  timer = setInterval(() => { cycle.value = queue.value.length ? (cycle.value + 1) % Math.max(1, queue.value.length) : cycle.value + 1 }, 3400)
})
onBeforeUnmount(() => { if (timer) clearInterval(timer); if (clockTimer) clearInterval(clockTimer) })

function moteStyle(n) {
  const x = (n * 53) % 100
  return { left: x + '%', '--d': (n % 6) * 0.8 + 's', '--dur': (7 + (n % 4)) + 's', width: (2 + (n % 2)) + 'px', height: (2 + (n % 2)) + 'px' }
}
</script>

<style scoped>
.dc { position: relative; overflow: hidden; border-radius: 20px; background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow); }
.dc-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.5; z-index: 0;
  background-image: linear-gradient(color-mix(in srgb, var(--set-gold) 6%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--set-gold) 6%, transparent) 1px, transparent 1px);
  background-size: 30px 30px; mask-image: radial-gradient(130% 120% at 18% 46%, #000 14%, transparent 78%); -webkit-mask-image: radial-gradient(130% 120% at 18% 46%, #000 14%, transparent 78%); }
.dc-aura { position: absolute; inset: -30% auto -30% -6%; width: 52%; pointer-events: none; z-index: 0;
  background: radial-gradient(circle, color-mix(in srgb, var(--set-gold) 26%, transparent), transparent 70%); filter: blur(42px); transform: translateX(calc((var(--mx, 0.5) - 0.5) * -22px)); }
.dc-floor { position: absolute; inset: auto 0 0 0; height: 42%; pointer-events: none; z-index: 0; opacity: 0.4;
  background-image: linear-gradient(color-mix(in srgb, var(--set-gold) 9%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--set-gold) 7%, transparent) 1px, transparent 1px);
  background-size: 40px 22px; transform: perspective(420px) rotateX(60deg); transform-origin: bottom; mask-image: linear-gradient(to top, #000, transparent); -webkit-mask-image: linear-gradient(to top, #000, transparent); }
.dc-motes { position: absolute; inset: 0; pointer-events: none; z-index: 1; transform: translateX(calc((var(--mx, 0.5) - 0.5) * 14px)); }
.dc-mote { position: absolute; bottom: 14%; border-radius: 50%; background: var(--set-gold-bright); box-shadow: 0 0 8px var(--set-gold); opacity: 0; animation: dc-rise var(--dur, 8s) linear infinite; animation-delay: var(--d, 0s); }
@keyframes dc-rise { 0% { transform: translateY(0) scale(0.6); opacity: 0; } 20% { opacity: 0.8; } 80% { opacity: 0.4; } 100% { transform: translateY(-200px) scale(1.1); opacity: 0; } }

.dc-hud { position: absolute; top: 13px; left: 16px; z-index: 5; display: inline-flex; align-items: center; gap: 7px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--set-text-dim); }
.dc-hud-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--set-ok); box-shadow: 0 0 8px var(--set-ok); animation: set-led-pulse 1.8s ease-in-out infinite; }
.dc-hud-lab { color: var(--set-gold); } .dc-hud-val { color: var(--set-text-secondary); } .dc-hud-sep { color: var(--set-text-dim); }
.dc-clock { position: absolute; top: 11px; right: 16px; z-index: 5; display: inline-flex; align-items: center; gap: 9px; }
.dc-clock-live { font-size: 8.5px; font-weight: 850; letter-spacing: 0.1em; color: var(--set-ok); }
.dc-clock b { font-size: 13px; font-weight: 800; letter-spacing: 0.14em; color: var(--set-text-secondary);
  padding: 3px 9px; border-radius: 8px; background: var(--set-panel); border: 1px solid var(--set-border); }

.dc-stage { position: relative; z-index: 2; height: 320px; }

/* beams */
.dc-beams { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; pointer-events: none; overflow: visible; }
.dc-beam-base { fill: none; stroke: var(--set-trace-idle); stroke-width: 1.4; vector-effect: non-scaling-stroke; opacity: 0.55; transition: stroke 0.4s, opacity 0.4s; }
.dc-beam.fire .dc-beam-base { stroke: color-mix(in srgb, var(--cc) 34%, var(--set-trace-idle)); opacity: 0.9; }
.dc-beam-live { fill: none; stroke: var(--cc); stroke-width: 2.4; stroke-linecap: round; vector-effect: non-scaling-stroke; opacity: 0; stroke-dasharray: 13 87; filter: drop-shadow(0 0 3px var(--cc)); }
.dc-beam.fire .dc-beam-live { opacity: 1; animation: dc-comet 1.4s linear infinite; }
.dc-beam.fire .dc-beam-live.b2 { animation-delay: 0.7s; opacity: 0.7; }
@keyframes dc-comet { from { stroke-dashoffset: 100; } to { stroke-dashoffset: 0; } }

/* emitter core */
.dc-core { position: absolute; left: 20%; top: 46%; width: 168px; height: 168px; transform: translate(-50%, -50%) translateX(calc((var(--mx, 0.5) - 0.5) * -8px)); z-index: 3; }
.dc-core-sweep { position: absolute; inset: 50%; width: 132px; height: 132px; transform: translate(-50%, -50%); border-radius: 50%;
  background: conic-gradient(from 0deg, transparent 0deg, color-mix(in srgb, var(--set-gold) 42%, transparent) 40deg, transparent 90deg);
  -webkit-mask: radial-gradient(circle, transparent 56%, #000 58%, #000 70%, transparent 72%); mask: radial-gradient(circle, transparent 56%, #000 58%, #000 70%, transparent 72%);
  animation: dc-spin 7s linear infinite; }
.dc-orbit { position: absolute; left: 50%; top: 50%; border-radius: 50%; border: 1px dashed color-mix(in srgb, var(--set-gold) 22%, transparent); transform: translate(-50%, -50%); }
.dc-orbit i { position: absolute; top: -3px; left: 50%; width: 6px; height: 6px; margin-left: -3px; border-radius: 50%; background: var(--set-gold-bright); box-shadow: 0 0 8px var(--set-gold); }
.dc-orbit.o1 { width: 96px; height: 96px; animation: dc-spin 9s linear infinite; }
.dc-orbit.o2 { width: 128px; height: 128px; animation: dc-spin 15s linear infinite reverse; }
.dc-orbit.o3 { width: 162px; height: 162px; animation: dc-spin 22s linear infinite; }
.dc-orbit.o2 i { background: var(--set-orange); box-shadow: 0 0 8px var(--set-orange); width: 5px; height: 5px; }
.dc-orbit.o3 i { background: var(--set-ok); box-shadow: 0 0 8px var(--set-ok); width: 4px; height: 4px; }
.dc-ring { position: absolute; left: 50%; top: 50%; width: 60px; height: 60px; margin: -30px 0 0 -30px; border-radius: 50%;
  border: 1.5px solid color-mix(in srgb, var(--set-gold) 55%, transparent); opacity: 0; animation: dc-ring-expand 3.4s ease-out infinite; animation-delay: calc((var(--rd) - 1) * 0.5s); }
@keyframes dc-ring-expand { 0% { opacity: 0; transform: scale(0.4); } 12% { opacity: 0.7; } 100% { opacity: 0; transform: scale(2.5); } }
.dc-core-orb { position: absolute; left: 50%; top: 50%; width: 62px; height: 62px; margin: -31px 0 0 -31px; display: grid; place-items: center; border-radius: 50%;
  color: #1a1206; background: var(--set-grad-hero); box-shadow: 0 0 34px -4px color-mix(in srgb, var(--set-gold) 75%, transparent), inset 0 1px 0 rgba(255,255,255,0.35); animation: dc-orb-pulse 3.4s ease-in-out infinite; }
@keyframes dc-orb-pulse { 0%, 100% { transform: scale(1); } 7% { transform: scale(1.14); } 22% { transform: scale(1); } }
@keyframes dc-spin { to { transform: translate(-50%, -50%) rotate(360deg); } }

/* readout */
.dc-readout { position: absolute; left: 20%; top: 76%; transform: translateX(-50%); width: 230px; display: flex; flex-direction: column; align-items: center; gap: 3px; text-align: center; z-index: 3; animation: dc-fade 0.5s var(--set-spring); }
@keyframes dc-fade { from { opacity: 0; transform: translateX(-50%) translateY(6px); } to { opacity: 1; transform: translateX(-50%); } }
.dc-readout-lab { font-size: 8.5px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: var(--set-gold); }
.dc-readout-ev { font-size: 17px; font-weight: 850; color: var(--set-text); letter-spacing: -0.01em; }
.dc-readout-aud { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; color: var(--set-text-muted); }
.dc-readout-aud :deep(svg) { color: var(--set-text-muted); }
.dc-eq { display: inline-flex; align-items: flex-end; gap: 3px; height: 12px; margin-top: 4px; }
.dc-eq i { width: 3px; border-radius: 2px; background: linear-gradient(180deg, var(--set-gold-bright), var(--set-orange)); animation: dc-eq 0.9s ease-in-out infinite; animation-delay: calc(var(--b) * 0.12s); }
@keyframes dc-eq { 0%, 100% { height: 3px; } 50% { height: 12px; } }

/* channels */
.dc-ch { position: absolute; left: 61%; right: 3.5%; transform: translateY(-50%); display: grid; grid-template-columns: 38px minmax(0,1fr) auto; align-items: center; gap: 10px;
  padding: 8px 12px 8px 6px; border-radius: 12px; background: color-mix(in srgb, var(--set-surface-elevated) 88%, transparent); border: 1px solid var(--set-border); z-index: 4;
  transition: border-color 0.3s, background 0.3s, opacity 0.3s, box-shadow 0.3s; }
.dc-ch.off { opacity: 0.62; }
.dc-ch.fire { border-color: color-mix(in srgb, var(--cc) 48%, transparent); background: color-mix(in srgb, var(--cc) 9%, var(--set-surface-elevated)); box-shadow: 0 8px 26px -16px var(--cc); }
.dc-ch-node { position: relative; display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; color: var(--set-text-muted); background: var(--set-surface); border: 1px solid var(--set-border); transition: all 0.3s var(--set-spring); }
.dc-ch.fire .dc-ch-node { color: var(--cc); border-color: color-mix(in srgb, var(--cc) 52%, transparent); box-shadow: 0 0 18px -3px var(--cc); transform: scale(1.06); }
.dc-ch-deliver { position: absolute; inset: -4px; border-radius: 14px; border: 2px solid var(--cc); opacity: 0; animation: dc-deliver 1.1s ease-out; }
@keyframes dc-deliver { 0% { opacity: 0; transform: scale(0.7); } 28% { opacity: 0.9; } 100% { opacity: 0; transform: scale(1.55); } }
.dc-ch-meta { min-width: 0; display: flex; flex-direction: column; line-height: 1.2; }
.dc-ch-meta b { font-size: 12.5px; font-weight: 750; color: var(--set-text); }
.dc-ch-soon { font-size: 8.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--set-text-dim); }
.dc-ch-state { font-size: 9px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--set-text-muted); }
.dc-ch.fire .dc-ch-state { color: var(--cc); }
.dc-ch-reach { font-family: var(--set-mono); font-size: 13px; font-weight: 800; color: var(--set-text-secondary); }
.dc-ch.fire .dc-ch-reach { color: var(--cc); }

/* ticker */
.dc-ticker { position: relative; z-index: 3; overflow: hidden; border-top: 1px solid var(--set-border); background: color-mix(in srgb, var(--set-panel) 70%, transparent);
  -webkit-mask: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent); mask: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent); }
.dc-ticker-track { display: inline-flex; align-items: center; gap: 26px; padding: 9px 0; white-space: nowrap; animation: dc-ticker 26s linear infinite; }
@keyframes dc-ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.dc-tx { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 600; color: var(--set-text-muted); }
.dc-tx :deep(svg) { color: var(--set-gold); }
.dc-tx em { font-style: normal; font-family: var(--set-mono); font-size: 10px; color: var(--set-gold); }
.dc-tx-aud { color: var(--set-text-dim); }
.dc-tx.now { color: var(--set-text); }
.dc-tx.now em { color: var(--set-gold-bright); }

.dc-skel { position: relative; height: 320px; overflow: hidden; border-radius: 14px; margin: 16px; background: var(--set-panel); }
.dc-skel-beam { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, color-mix(in srgb, var(--set-gold) 12%, transparent) 50%, transparent 70%); background-size: 220% 100%; animation: set-sheen 1.6s ease infinite; }

@media (max-width: 820px) {
  .dc-stage { height: auto; min-height: 540px; }
  .dc-beams { display: none; }
  .dc-core { left: 50%; top: 120px; }
  .dc-readout { left: 50%; top: 210px; }
  .dc-ch { position: relative; left: auto; right: auto; top: auto; transform: none; margin: 0 16px 8px; }
  .dc-ch:first-of-type { margin-top: 270px; }
}
@media (prefers-reduced-motion: reduce) {
  .dc-mote, .dc-core-sweep, .dc-orbit, .dc-ring, .dc-core-orb, .dc-eq i, .dc-hud-dot, .dc-readout, .dc-ticker-track, .dc-beam.fire .dc-beam-live, .dc-ch-deliver { animation: none; }
  .dc-beam.fire .dc-beam-live { opacity: 0.5; }
}
</style>
