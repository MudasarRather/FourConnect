<template>
  <div class="ap">
    <!-- ═══ instrument bar ═══ -->
    <header class="ap-bar">
      <span class="ap-bar-sig sd-mono"
        title="Time-based escalation policies plotted as burn events on the ticket's flight profile — the older an open ticket gets, the further it travels along the trajectory; each burn it crosses fires once.">
        <Rocket :size="12" /> ASCENT PROFILE
      </span>
      <span class="ap-bar-note sd-mono">TIME-BASED BURNS · SWEPT ON BOARD-OPEN + CRON · ONCE PER TICKET · PAUSED TICKETS SIT OUT</span>
      <span class="ap-sp" />
      <span class="ap-bar-tele sd-mono" aria-label="Escalation telemetry">
        <em><b><SdCountUp :value="policies.length" /></b> BURNS</em>
        <em class="go"><b><SdCountUp :value="liveCount" /></b> ARMED</em>
        <em class="fire"><b><SdCountUp :value="totalFires" /></b> FIRINGS</em>
        <em class="dim"><b>2</b> BUILT-IN</em>
      </span>
      <Motion as="button" class="ap-new" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.96 }" @click="$emit('new')">
        <Plus :size="13" /> Plot a burn
      </Motion>
    </header>

    <!-- ═══ the flight profile ═══ -->
    <div class="ap-stage" @pointerleave="hovId = ''">
      <span class="ap-floor" aria-hidden="true" />
      <svg class="ap-svg" viewBox="0 0 1000 300" role="img"
        aria-label="Escalation timeline — policies plotted by how long a ticket has been open">
        <defs>
          <linearGradient :id="uid + '-tr-d'" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stop-color="#f2b64d" /><stop offset="1" stop-color="#fb7185" />
          </linearGradient>
          <linearGradient :id="uid + '-tr-l'" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stop-color="#a8791b" /><stop offset="1" stop-color="#be123c" />
          </linearGradient>
          <linearGradient :id="uid + '-ar-d'" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="rgba(242,182,77,0.14)" /><stop offset="1" stop-color="rgba(242,182,77,0)" />
          </linearGradient>
          <linearGradient :id="uid + '-ar-l'" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="rgba(168,121,27,0.16)" /><stop offset="1" stop-color="rgba(168,121,27,0)" />
          </linearGradient>
        </defs>

        <!-- ground line + launch pad -->
        <line class="ap-ground" x1="30" y1="250" x2="970" y2="250" />
        <g class="ap-pad">
          <rect x="56" y="244" width="28" height="6" rx="2" />
          <text class="ap-axis-lb" x="70" y="272" text-anchor="middle">T+0</text>
          <text class="ap-axis-sub" x="70" y="285" text-anchor="middle">TICKET CREATED</text>
        </g>

        <!-- trajectory -->
        <path :d="areaD" :fill="`url(#${uid}${isLight ? '-ar-l' : '-ar-d'})`" />
        <path :id="uid + '-path'" class="ap-traj" :d="pathD"
          :stroke="`url(#${uid}${isLight ? '-tr-l' : '-tr-d'})`" pathLength="100" />

        <!-- built-in breach gate at the end of the profile -->
        <g class="ap-gate" :class="{ hl: hovId === 'gate' }"
          @pointerenter="hovId = 'gate'">
          <line x1="920" y1="30" x2="920" y2="250" />
          <text class="ap-gate-lb" x="932" y="140" transform="rotate(90 932 140)" text-anchor="middle">SLA BREACH · AUTO-LIFT</text>
          <text class="ap-axis-sub" x="920" y="272" text-anchor="middle">BUILT-IN</text>
        </g>

        <!-- burn nodes -->
        <g v-for="(n, i) in nodes" :key="n.id" class="ap-node"
          :class="{ off: !n.isActive, hl: hovId === n.id }" :style="{ '--nd': n.flareDelay }"
          role="button" tabindex="0" :aria-label="`Edit policy ${n.name} at T+${n.tLabel}`"
          @pointerenter="hovId = n.id" @click="$emit('edit', n.id)" @keydown.enter="$emit('edit', n.id)">
          <line class="ap-tick" :x1="n.x" :y1="n.y + 12" :x2="n.x" :y2="250" />
          <text class="ap-axis-lb" :x="n.x" :y="i % 2 ? 284 : 270" text-anchor="middle">T+{{ n.tLabel }}</text>
          <circle class="ap-halo" :cx="n.x" :cy="n.y" r="14" />
          <circle class="ap-ring" :cx="n.x" :cy="n.y" r="10" />
          <circle class="ap-core" :cx="n.x" :cy="n.y" r="5.5" />
          <text v-if="n.tier" class="ap-node-tier" :x="n.x" :y="n.y - 20" text-anchor="middle">→ L{{ n.tier }}</text>
        </g>

        <!-- the capsule (an ageing ticket riding the profile) -->
        <g v-if="!reduced && nodes.length">
          <circle class="ap-cap-trail" r="9">
            <animateMotion :dur="DUR + 's'" repeatCount="indefinite" :begin="'-0.35s'"><mpath :href="`#${uid}-path`" /></animateMotion>
          </circle>
          <circle class="ap-cap" r="4.5">
            <animateMotion :dur="DUR + 's'" repeatCount="indefinite"><mpath :href="`#${uid}-path`" /></animateMotion>
          </circle>
        </g>
      </svg>

      <!-- hover dossier -->
      <div v-if="hovNode" class="ap-tip" :style="{ left: (hovNode.x / 10) + '%', top: (hovNode.y / 3) + '%' }">
        <b>{{ hovNode.name }}</b>
        <span class="sd-mono">T+{{ hovNode.tLabel }} OPEN · {{ hovNode.isActive ? 'ARMED' : 'STANDBY' }} · ×{{ hovNode.runs }}</span>
        <span v-if="hovNode.acts.length" class="ap-tip-act">{{ hovNode.acts.map(a => a.label + (a.value ? ` → ${a.value}` : '')).join(' · ') }}</span>
      </div>
      <div v-else-if="hovId === 'gate'" class="ap-tip gate" :style="{ left: '86%', top: '12%' }">
        <b>SLA-breach auto-lift</b>
        <span class="sd-mono">BUILT-IN · ALWAYS ON</span>
        <span class="ap-tip-act">A resolution-breached, owned, actively-worked ticket is lifted one tier exactly once — no policy needed.</span>
      </div>

      <!-- empty profile -->
      <div v-if="!nodes.length" class="ap-stage-empty">
        <p class="sd-mono">NO BURNS PLOTTED</p>
        <span>Tickets coast along the profile untouched — only the built-in SLA-breach auto-lift fires.
          Plot the first burn: “still open past 4h at critical → lift to L2.”</span>
        <Motion as="button" class="ap-new ghost" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.96 }" @click="$emit('new')">
          <Plus :size="13" /> Plot the first burn
        </Motion>
      </div>
    </div>

    <!-- ═══ the burn manifest ═══ -->
    <div v-if="policies.length" class="ap-burns">
      <article v-for="(p, i) in policies" :key="p.id" class="ap-burn" :class="{ off: !p.isActive, hl: hovId === p.id }"
        :style="{ '--i': i }" @pointerenter="hovId = p.id" @pointermove="glare" @pointerleave="unglare"
        @click="$emit('edit', p.id)">
        <span class="ap-burn-glare" aria-hidden="true" />
        <div class="ap-burn-t sd-mono">
          <i class="ap-burn-dot" aria-hidden="true" />
          <em>T+</em><b>{{ p.tLabel }}</b>
          <span>OPEN</span>
        </div>
        <div class="ap-burn-body">
          <header class="ap-burn-h">
            <b class="ap-burn-name">{{ p.name }}</b>
            <span class="ap-join sd-mono" :title="p.matchType === 'any' ? 'ANY condition ignites the burn' : 'ALL conditions must hold'">
              {{ p.matchType === 'any' ? 'ANY' : 'ALL' }}</span>
            <span class="ap-sp" />
            <span class="ap-runs sd-mono" :title="p.lastRunAt ? `Fired ×${p.runs} · last ${ago(p.lastRunAt)}` : 'Never fired yet'">
              ×<SdCountUp :value="p.runs" /><i v-if="p.lastRunAt"> · {{ ago(p.lastRunAt) }}</i></span>
          </header>
          <div class="ap-logic">
            <span class="ap-kw sd-mono">WHEN</span>
            <span v-if="!p.conds.length" class="ap-chip cond dim">any open ticket this old</span>
            <template v-for="(c, ci) in p.conds" :key="'c' + ci">
              <span v-if="ci" class="ap-op sd-mono">{{ p.matchType === 'any' ? 'OR' : 'AND' }}</span>
              <span class="ap-chip cond"><b>{{ c.f }}</b><i>{{ c.o }}</i><em v-if="c.v">{{ c.v }}</em></span>
            </template>
            <span class="ap-kw then sd-mono"><Flame :size="9" /> BURN</span>
            <span v-for="(a, ai) in p.acts" :key="'a' + ai" class="ap-chip act">
              <b>{{ a.label }}</b><em v-if="a.value">→ {{ a.value }}</em>
            </span>
          </div>
        </div>
        <div class="ap-burn-side" @click.stop>
          <button class="ap-arm" :class="{ on: p.isActive }" role="switch" :aria-checked="p.isActive"
            :title="p.isActive ? 'Armed — stand it down' : 'On standby — arm it'"
            @click="$emit('toggle', p.id, !p.isActive)">
            <i class="kn" aria-hidden="true" /><span class="sd-mono">{{ p.isActive ? 'ARMED' : 'STANDBY' }}</span>
          </button>
          <div class="ap-acts">
            <button class="ap-ic" title="Version history" @click="$emit('history', p.id)"><History :size="12" /></button>
            <button class="ap-ic" title="Edit" @click="$emit('edit', p.id)"><Pencil :size="12" /></button>
            <button class="ap-ic danger" title="Delete" @click="$emit('delete', p.id)"><Trash2 :size="12" /></button>
          </div>
        </div>
      </article>
    </div>

    <!-- ═══ always-on systems (the built-ins no policy can turn off) ═══ -->
    <div class="ap-systems">
      <Motion v-for="(s, i) in SYSTEMS" :key="s.key" as="article" class="ap-sys"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.45, delay: 0.15 + i * 0.08, ease: [0.16, 1, 0.3, 1] }">
        <span class="ap-sys-lamp" aria-hidden="true" />
        <header class="sd-mono"><component :is="s.icon" :size="11" /> {{ s.title }} <em>BUILT-IN · ALWAYS ON</em></header>
        <p>{{ s.body }}</p>
        <div v-if="s.key === 'clock'" class="ap-sys-chips">
          <span v-for="c in ACK_CLOCKS" :key="c.p" class="ap-clock sd-mono" :class="c.p">
            <i aria-hidden="true" />{{ c.p.toUpperCase() }} <b>{{ c.t }}</b>
          </span>
        </div>
      </Motion>
    </div>
  </div>
</template>

<script setup>
/*
  SdAscentProfile — "THE ASCENT PROFILE", the Queue-Config Escalation panel's
  signature instrument. A flight-dynamics board: the x-axis is how long a ticket
  has been open, the trajectory is its climb through the desk, and every
  time-based policy is a BURN EVENT plotted at its threshold (log time scale).
  A capsule rides the path (SMIL animateMotion); each armed burn node fires a
  thruster flare exactly as the capsule passes (arc-length-synced CSS delays).
  Below: the burn manifest (per-policy dossier cards with an ARM/STANDBY switch,
  live fire counters and version history) and the two built-in engines no policy
  can switch off (SLA-breach auto-lift + the esc-ACK response clock).
  Theme-aware surfaces (hero owns the only dark stage) — SVG gradient stops are
  literal hexes per theme (var() is unreliable inside SVG defs), toggled by
  observing data-theme. Distinct from every sibling: the only time-axis
  trajectory motif in the module.
*/
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import {
  Rocket, Flame, Plus, Pencil, Trash2, History, Siren, Timer,
} from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  /* display-ready, threshold-ASC sorted:
     { id, name, mins, tLabel, isActive, matchType, runs, lastRunAt, conds:[{f,o,v}], acts:[{label,value}], tier } */
  policies: { type: Array, default: () => [] },
})
defineEmits(['new', 'edit', 'delete', 'history', 'toggle'])

const DUR = 16   // seconds per capsule flight
let _uidN = 0
const uid = `ap${++_uidN}${Date.now() % 10000}`

const hovId = ref('')
const hovNode = computed(() => nodes.value.find(n => n.id === hovId.value) || null)

const liveCount = computed(() => props.policies.filter(p => p.isActive).length)
const totalFires = computed(() => props.policies.reduce((n, p) => n + (p.runs || 0), 0))

/* ── reduced motion (OS setting, unless Cinematic mode forces on) ── */
const reduced = ref(false)
const readReduced = () => {
  try {
    const cine = document.documentElement.getAttribute('data-cinematic') === 'on'
    reduced.value = !cine && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch { reduced.value = false }
}

/* ── theme (SVG gradient stops need literal hexes — pick defs set by data-theme) ── */
const isLight = ref(false)
let themeObs = null
onMounted(() => {
  readReduced()
  isLight.value = document.documentElement.getAttribute('data-theme') === 'light'
  themeObs = new MutationObserver(() => {
    isLight.value = document.documentElement.getAttribute('data-theme') === 'light'
    readReduced()
  })
  themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-cinematic'] })
})
onBeforeUnmount(() => { if (themeObs) themeObs.disconnect() })

/* ── the trajectory: fast initial climb flattening out (gravity turn) ── */
const TOP = 42, GROUND = 250, X0 = 70, X1 = 880, SAMPLES = 48
const xOf = (t) => X0 + (X1 - X0) * t
const yOf = (t) => GROUND - (GROUND - TOP) * (1 - Math.pow(1 - t, 2.1))
const pts = Array.from({ length: SAMPLES + 1 }, (_, i) => {
  const t = i / SAMPLES
  return [xOf(t), yOf(t)]
})
const pathD = pts.map(([x, y], i) => `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
const areaD = `${pathD} L ${X1} ${GROUND} L ${X0} ${GROUND} Z`
/* cumulative arc length — used to sync node flares to the capsule's fly-by */
const cum = [0]
for (let i = 1; i < pts.length; i++) {
  const [ax, ay] = pts[i - 1], [bx, by] = pts[i]
  cum.push(cum[i - 1] + Math.hypot(bx - ax, by - ay))
}
const totalLen = cum[cum.length - 1]
const fracAt = (t) => {
  const i = Math.min(SAMPLES, Math.max(0, Math.round(t * SAMPLES)))
  return cum[i] / totalLen
}

/* ── plot the policies on a log time scale (5m .. max threshold) ── */
const nodes = computed(() => {
  const maxM = Math.max(...props.policies.map(p => p.mins || 5), 5)
  return props.policies.map((p) => {
    const t = maxM <= 5 ? 0.5 : Math.log((p.mins || 5) / 5 + 1) / Math.log(maxM / 5 + 1)
    const tt = 0.07 + t * 0.86
    return {
      ...p,
      x: +xOf(tt).toFixed(1), y: +yOf(tt).toFixed(1),
      flareDelay: `${(fracAt(tt) * DUR).toFixed(2)}s`,
    }
  })
})

/* ── pointer glare for the manifest cards ── */
const glare = (e) => {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', ((e.clientX - r.left) / r.width).toFixed(3))
  el.style.setProperty('--my', ((e.clientY - r.top) / r.height).toFixed(3))
  el.style.setProperty('--spot', '1')
}
const unglare = (e) => e.currentTarget.style.setProperty('--spot', '0')

const ago = (iso) => {
  if (!iso) return ''
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

/* the engines the sweep runs regardless of what's plotted (escalation.py) */
const SYSTEMS = [
  {
    key: 'lift', icon: Siren, title: 'SLA-BREACH AUTO-LIFT',
    body: 'A resolution-breached ticket that is owned and actively worked is lifted one tier automatically — exactly once, stamped so it can never double-fire. Response breaches deliberately don\'t auto-lift (they\'d flood the escalated desk); they surface as breach candidates for a manual call.',
  },
  {
    key: 'clock', icon: Timer, title: 'ESCALATION RESPONSE CLOCK',
    body: 'Every tier lift arms a fresh acknowledgement deadline scaled to priority. An escalation still unacknowledged past its deadline nudges the owner — at most once a day — and stays flagged OVERDUE until the receiving tier actually acks.',
  },
  {
    key: 'sweep', icon: Rocket, title: 'THE SWEEP',
    body: 'Burns are evaluated on board-open and on the cron tick, oldest tickets first. Paused and parked tickets sit out (their clock is stopped — lifting them would bypass hold bookkeeping), and a ticket already at or above a burn\'s target tier coasts straight past it.',
  },
]
/* ESCALATION_RESPONSE_MINUTES (constants.py) — per-priority esc-ACK deadlines */
const ACK_CLOCKS = [
  { p: 'critical', t: '30m' }, { p: 'urgent', t: '1h' }, { p: 'high', t: '2h' },
  { p: 'medium', t: '4h' }, { p: 'low', t: '8h' },
]
</script>

<style scoped>
/* ═══ theme-aware — the hero owns the page's only dark stage ═══ */
.ap {
  --ap-core: var(--sd-qc-core);
  --ap-hi: var(--sd-qc-hi);
  --ap-ink: var(--sd-text);
  --ap-dim: var(--sd-text-muted);
  --ap-line: var(--sd-border);
  --ap-brd: var(--sd-qc-brd);
  --ap-soft: var(--sd-qc-soft);
  --ap-go: var(--sd-qc-go);
  --ap-warn: var(--sd-qc-warn);
  --ap-halt: var(--sd-qc-halt);
  display: flex; flex-direction: column; gap: 12px;
}
.ap-sp { flex: 1; }

/* ═══ instrument bar ═══ */
.ap-bar {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 11px 16px; border-radius: 14px;
  background: var(--sd-surface-glass); border: 1px solid var(--ap-line);
  backdrop-filter: blur(10px);
}
.ap-bar-sig { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800;
  letter-spacing: 0.14em; color: var(--ap-core); cursor: help; }
.ap-bar-note { font-size: 9px; letter-spacing: 0.1em; color: var(--ap-dim); }
.ap-bar-tele { display: inline-flex; gap: 14px; font-size: 9px; letter-spacing: 0.08em; color: var(--ap-dim); }
.ap-bar-tele em { font-style: normal; display: inline-flex; align-items: baseline; gap: 5px; }
.ap-bar-tele b { font-size: 13px; color: var(--ap-ink); }
.ap-bar-tele .go b { color: var(--ap-go); }
.ap-bar-tele .fire b { color: var(--ap-warn); }
.ap-bar-tele .dim b { color: var(--ap-dim); }
.ap-new {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px;
  font-size: 12px; font-weight: 800; font-family: inherit; cursor: pointer; color: #fff;
  background: var(--sd-qc-grad); border: none;
  box-shadow: 0 4px 18px color-mix(in srgb, var(--ap-core) 30%, transparent);
}
.ap-new.ghost { background: transparent; color: var(--ap-core); border: 1px dashed var(--ap-brd); box-shadow: none; }

/* ═══ the stage ═══ */
.ap-stage {
  position: relative; border-radius: 16px; overflow: hidden;
  background: var(--sd-surface); border: 1px solid var(--ap-line);
}
.ap-floor {
  position: absolute; inset: 0; pointer-events: none; opacity: 0.55;
  background:
    radial-gradient(55% 60% at 78% 20%, color-mix(in srgb, var(--ap-halt) 6%, transparent), transparent 70%),
    radial-gradient(50% 55% at 10% 85%, color-mix(in srgb, var(--ap-core) 7%, transparent), transparent 70%),
    repeating-linear-gradient(0deg, transparent 0 34px, color-mix(in srgb, var(--ap-core) 4%, transparent) 34px 35px),
    repeating-linear-gradient(90deg, transparent 0 34px, color-mix(in srgb, var(--ap-core) 4%, transparent) 34px 35px);
}
.ap-svg { position: relative; display: block; width: 100%; height: auto; }

.ap-ground { stroke: color-mix(in srgb, var(--ap-core) 30%, transparent); stroke-width: 1;
  stroke-dasharray: 5 6; }
.ap-pad rect { fill: color-mix(in srgb, var(--ap-core) 45%, transparent); }
.ap-axis-lb { font-family: ui-monospace, monospace; font-size: 10px; font-weight: 700;
  letter-spacing: 0.08em; fill: var(--ap-ink); }
.ap-axis-sub { font-family: ui-monospace, monospace; font-size: 7.5px; letter-spacing: 0.14em;
  fill: var(--ap-dim); }

.ap-traj { fill: none; stroke-width: 2.5; stroke-linecap: round;
  stroke-dasharray: 100; stroke-dashoffset: 0;
  animation: ap-draw 1.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes ap-draw { from { stroke-dashoffset: 100; } to { stroke-dashoffset: 0; } }

/* built-in breach gate */
.ap-gate line { stroke: var(--ap-halt); stroke-width: 1.2; stroke-dasharray: 3 5; opacity: 0.55;
  animation: ap-gate-pulse 2.4s ease-in-out infinite; cursor: help; }
@keyframes ap-gate-pulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.8; } }
.ap-gate-lb { font-family: ui-monospace, monospace; font-size: 8px; font-weight: 800;
  letter-spacing: 0.16em; fill: var(--ap-halt); opacity: 0.85; cursor: help; }
.ap-gate.hl line { opacity: 1; }

/* burn nodes */
.ap-node { cursor: pointer; outline: none; }
.ap-tick { stroke: color-mix(in srgb, var(--ap-core) 22%, transparent); stroke-width: 1; stroke-dasharray: 2 5; }
.ap-halo { fill: none; stroke: var(--ap-core); stroke-width: 1; opacity: 0.35;
  animation: ap-breathe 3s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
@keyframes ap-breathe { 0%, 100% { transform: scale(0.9); opacity: 0.2; } 50% { transform: scale(1.1); opacity: 0.55; } }
.ap-ring { fill: none; stroke: var(--ap-core); stroke-width: 1.4; stroke-dasharray: 4 3;
  animation: ap-orbit 9s linear infinite; transform-origin: center; transform-box: fill-box; }
@keyframes ap-orbit { to { transform: rotate(360deg); } }
.ap-core { fill: var(--sd-surface-elevated); stroke: var(--ap-core); stroke-width: 2;
  animation: ap-flare v-bind('DUR + "s"') linear infinite; animation-delay: var(--nd); }
@keyframes ap-flare {
  0%, 5%, 100% { filter: none; }
  2.5% { filter: drop-shadow(0 0 8px var(--ap-hi)) drop-shadow(0 0 16px var(--ap-core)); }
}
.ap-node-tier { font-family: ui-monospace, monospace; font-size: 9px; font-weight: 800;
  letter-spacing: 0.1em; fill: var(--ap-core); }
.ap-node.hl .ap-core, .ap-node:focus-visible .ap-core { fill: var(--ap-core); }
.ap-node.hl .ap-halo { opacity: 0.8; }
.ap-node.off .ap-halo, .ap-node.off .ap-ring { animation: none; opacity: 0.18; }
.ap-node.off .ap-core { stroke-dasharray: 2 2; stroke: var(--ap-dim); animation: none; }
.ap-node.off .ap-node-tier { fill: var(--ap-dim); }

/* the capsule */
.ap-cap { fill: var(--ap-hi); filter: drop-shadow(0 0 6px var(--ap-core)); }
.ap-cap-trail { fill: color-mix(in srgb, var(--ap-core) 18%, transparent); }

/* hover dossier */
.ap-tip {
  position: absolute; z-index: 3; transform: translate(-50%, -130%);
  display: flex; flex-direction: column; gap: 3px; max-width: 300px;
  padding: 9px 12px; border-radius: 11px; pointer-events: none;
  background: var(--sd-surface-elevated); border: 1px solid var(--ap-brd);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  animation: ap-tip-in 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes ap-tip-in { from { opacity: 0; transform: translate(-50%, -120%) scale(0.94); } to { opacity: 1; transform: translate(-50%, -130%) scale(1); } }
.ap-tip b { font-size: 12px; color: var(--ap-ink); }
.ap-tip > span.sd-mono { font-size: 8.5px; letter-spacing: 0.1em; color: var(--ap-core); }
.ap-tip-act { font-size: 10.5px; line-height: 1.45; color: var(--sd-text-secondary); }
.ap-tip.gate b { color: var(--ap-halt); }

.ap-stage-empty {
  position: absolute; inset: 0; z-index: 2; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 8px; text-align: center;
  padding: 20px; color: var(--ap-dim);
  background: color-mix(in srgb, var(--sd-surface) 55%, transparent); backdrop-filter: blur(2px);
}
.ap-stage-empty p { margin: 0; font-size: 12px; font-weight: 800; letter-spacing: 0.16em; color: var(--ap-core); }
.ap-stage-empty > span { max-width: 460px; font-size: 12px; line-height: 1.55; }

/* ═══ the burn manifest ═══ */
.ap-burns { display: flex; flex-direction: column; gap: 10px; }
.ap-burn {
  position: relative; display: flex; gap: 14px; align-items: stretch; overflow: hidden;
  padding: 13px 15px; border-radius: 14px; cursor: pointer;
  background: var(--sd-surface-elevated); border: 1px solid var(--ap-line);
  animation: ap-rise 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(0.1s + var(--i) * 0.07s);
  transition: border-color 0.25s, box-shadow 0.25s, transform 0.25s;
}
@keyframes ap-rise { from { opacity: 0; transform: translateY(16px) scale(0.985); } to { opacity: 1; transform: none; } }
.ap-burn:hover, .ap-burn.hl { border-color: var(--ap-brd); box-shadow: var(--sd-qc-glow); transform: translateY(-2px); }
.ap-burn.off { opacity: 0.66; }
.ap-burn-glare {
  position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(300px circle at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%),
    color-mix(in srgb, var(--ap-core) 9%, transparent), transparent 65%);
}
.ap-burn-t {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
  min-width: 84px; padding: 6px 10px; border-radius: 11px; position: relative;
  background: var(--ap-soft); border: 1px solid var(--ap-brd);
}
.ap-burn-dot { position: absolute; top: -4px; left: 50%; width: 7px; height: 7px; border-radius: 50%;
  transform: translateX(-50%); background: var(--ap-core);
  box-shadow: 0 0 8px color-mix(in srgb, var(--ap-core) 70%, transparent); }
.ap-burn.off .ap-burn-dot { background: var(--ap-dim); box-shadow: none; }
.ap-burn-t em { font-style: normal; font-size: 8px; letter-spacing: 0.18em; color: var(--ap-dim); }
.ap-burn-t b { font-size: 19px; line-height: 1.05; color: var(--ap-core); letter-spacing: -0.01em; }
.ap-burn.off .ap-burn-t b { color: var(--ap-dim); }
.ap-burn-t span { font-size: 7px; letter-spacing: 0.2em; color: var(--ap-dim); }

.ap-burn-body { display: flex; flex-direction: column; gap: 8px; min-width: 0; flex: 1; }
.ap-burn-h { display: flex; align-items: center; gap: 9px; min-width: 0; }
.ap-burn-name { font-size: 13.5px; font-weight: 800; color: var(--ap-ink);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ap-join { font-size: 8px; font-weight: 800; letter-spacing: 0.14em; padding: 2px 7px; border-radius: 5px;
  color: var(--ap-core); border: 1px solid var(--ap-brd); }
.ap-runs { font-size: 10px; color: var(--ap-dim); }
.ap-runs i { font-style: normal; }
.ap-logic { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.ap-kw { font-size: 8px; font-weight: 800; letter-spacing: 0.16em; color: var(--ap-dim); }
.ap-kw.then { display: inline-flex; align-items: center; gap: 3px; color: var(--ap-warn); }
.ap-op { font-size: 7.5px; font-weight: 800; letter-spacing: 0.1em; color: var(--ap-dim); opacity: 0.8; }
.ap-chip {
  display: inline-flex; align-items: baseline; gap: 5px; padding: 3.5px 9px; border-radius: 8px;
  font-size: 10.5px; background: color-mix(in srgb, var(--ap-ink) 4%, transparent);
  border: 1px solid color-mix(in srgb, var(--ap-ink) 12%, transparent);
}
.ap-chip b { font-weight: 700; color: var(--ap-ink); }
.ap-chip i { font-style: normal; font-size: 9px; color: var(--ap-dim); }
.ap-chip em { font-style: normal; font-weight: 700; color: var(--ap-core); }
.ap-chip.act { border-color: color-mix(in srgb, var(--ap-warn) 35%, transparent);
  background: color-mix(in srgb, var(--ap-warn) 8%, transparent); }
.ap-chip.dim { opacity: 0.7; font-style: italic; }

.ap-burn-side { display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; gap: 8px; }
.ap-arm {
  display: inline-flex; align-items: center; gap: 7px; padding: 5px 9px 5px 6px; border-radius: 999px;
  font-family: inherit; cursor: pointer; background: color-mix(in srgb, var(--ap-ink) 4%, transparent);
  border: 1px solid color-mix(in srgb, var(--ap-ink) 14%, transparent);
  transition: border-color 0.25s, background 0.25s;
}
.ap-arm .kn { width: 14px; height: 14px; border-radius: 50%; background: var(--ap-dim);
  transition: background 0.25s, box-shadow 0.25s, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.ap-arm span { font-size: 8px; font-weight: 800; letter-spacing: 0.14em; color: var(--ap-dim); }
.ap-arm.on { border-color: color-mix(in srgb, var(--ap-go) 45%, transparent);
  background: color-mix(in srgb, var(--ap-go) 9%, transparent); }
.ap-arm.on .kn { background: var(--ap-go); transform: scale(1.05);
  box-shadow: 0 0 8px color-mix(in srgb, var(--ap-go) 70%, transparent); }
.ap-arm.on span { color: var(--ap-go); }
.ap-acts { display: flex; gap: 5px; }
.ap-ic {
  display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; cursor: pointer;
  background: transparent; border: 1px solid color-mix(in srgb, var(--ap-ink) 12%, transparent);
  color: var(--ap-dim); transition: color 0.2s, border-color 0.2s, transform 0.2s;
}
.ap-ic:hover { color: var(--ap-core); border-color: var(--ap-brd); transform: translateY(-1px); }
.ap-ic.danger:hover { color: var(--ap-halt); border-color: color-mix(in srgb, var(--ap-halt) 45%, transparent); }

/* ═══ always-on systems ═══ */
.ap-systems { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 10px; }
.ap-sys {
  position: relative; display: flex; flex-direction: column; gap: 7px; overflow: hidden;
  padding: 12px 14px 12px 20px; border-radius: 13px;
  background: var(--sd-surface-glass); border: 1px solid var(--ap-line); color: var(--ap-ink);
  transition: border-color 0.25s, transform 0.25s;
}
.ap-sys:hover { border-color: var(--ap-brd); transform: translateY(-2px); }
.ap-sys-lamp { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--ap-core);
  box-shadow: 0 0 10px color-mix(in srgb, var(--ap-core) 60%, transparent);
  animation: ap-lamp 2.8s ease-in-out infinite; }
@keyframes ap-lamp { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
.ap-sys header { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.13em; color: var(--ap-core); }
.ap-sys header em { font-style: normal; margin-left: auto; font-size: 7px; letter-spacing: 0.14em;
  padding: 2px 6px; border-radius: 5px; color: var(--ap-dim);
  border: 1px dashed color-mix(in srgb, var(--ap-ink) 20%, transparent); }
.ap-sys p { margin: 0; font-size: 11.5px; line-height: 1.55; color: var(--sd-text-secondary); }
.ap-sys-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.ap-clock {
  display: inline-flex; align-items: center; gap: 5px; padding: 3.5px 9px; border-radius: 999px;
  font-size: 8.5px; font-weight: 800; letter-spacing: 0.08em; color: var(--ap-dim);
  border: 1px solid color-mix(in srgb, var(--ap-ink) 14%, transparent);
}
.ap-clock b { font-size: 10px; color: var(--ap-ink); }
.ap-clock i { width: 6px; height: 6px; border-radius: 50%; background: var(--pc, var(--ap-dim)); }
.ap-clock.critical { --pc: var(--ap-halt); }
.ap-clock.urgent { --pc: #fb923c; }
.ap-clock.high { --pc: var(--ap-warn); }
.ap-clock.medium { --pc: var(--ap-core); }
.ap-clock.low { --pc: var(--ap-go); }

/* ═══ reduced motion — a still chart ═══ */
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .ap-traj,
  html:not([data-cinematic="on"]) .ap-halo,
  html:not([data-cinematic="on"]) .ap-ring,
  html:not([data-cinematic="on"]) .ap-core,
  html:not([data-cinematic="on"]) .ap-gate line,
  html:not([data-cinematic="on"]) .ap-sys-lamp,
  html:not([data-cinematic="on"]) .ap-tip { animation: none; }
  html:not([data-cinematic="on"]) .ap-burn { animation-duration: 0.01s; animation-delay: 0s; }
  html:not([data-cinematic="on"]) .ap-burn:hover { transform: none; }
}
</style>
