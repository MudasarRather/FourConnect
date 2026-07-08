<template>
  <!-- ░ MOMENTUM PIPELINE — the Open/In-Progress signature instrument ░
       A horizontal aggregate stage-flow (Open → In-Progress → Pending → Hold) that
       feeds a pulsing RESOLUTION GATE. Rails flow, packets travel (density = throughput),
       breaching packets flare red, escalated is a spur alert. Lives in a dark inset
       "display panel" (both themes) so the additive glow always reads. Clickable nodes:
       in-scope stages filter locally, adjacent stages cross-navigate. -->
  <div class="fp" :class="{ reduced }" ref="root">
    <div class="fp-bg" aria-hidden="true">
      <span class="fp-grid" />
      <span class="fp-mote m1" /><span class="fp-mote m2" /><span class="fp-mote m3" />
      <span class="fp-aura" />
    </div>

    <div class="fp-topbar">
      <span class="fp-tag sd-mono"><Waypoints :size="12" /> MOMENTUM PIPELINE</span>
      <span class="fp-velo" :title="`Average resolution ≈ ${veloLabel}`">
        <TrendingUp :size="13" />
        <b><SdCountUp :value="stats.resolved_today || 0" /></b> resolved today
        <i class="fp-velo-sep" />
        <span class="fp-velo-cyc sd-mono">{{ veloLabel }} cycle</span>
      </span>
    </div>

    <!-- escalated spur alert -->
    <button
      v-if="escalated > 0" type="button" class="fp-spur" :class="{ hot: escalated > 0 }"
      @click="$emit('pick', { key: 'escalated', action: 'nav', navTab: 'escalated' })"
      :title="`${escalated} escalated — jump to the Escalated queue`"
    >
      <Flame :size="13" />
      <b><SdCountUp :value="escalated" /></b>
      <span>escalated</span>
      <ArrowUpRight :size="12" class="fp-spur-go" />
    </button>

    <!-- the flow -->
    <div class="fp-flow">
      <template v-for="(s, i) in flow" :key="s.key">
        <!-- connector rail (before every node except the first) -->
        <span
          v-if="i > 0" class="fp-link" :class="{ hot: linkHot(i) }"
          :style="{ '--seg': i }" aria-hidden="true"
        >
          <span class="fp-rail" />
          <span v-for="p in 3" :key="p" class="pkt" :style="pktStyle(i, p)" />
          <span v-if="linkHot(i)" class="pkt hot" :style="pktStyle(i, 4)" />
        </span>

        <!-- stage node -->
        <button
          type="button" class="fp-node" :class="{ active: activeStage === s.key, empty: !count(s), nav: s.action === 'nav' }"
          :style="{ '--nc': s.color }"
          @click="$emit('pick', { key: s.key, action: s.action, filter: s.filter, navTab: s.navTab })"
          :title="s.action === 'nav' ? `${count(s)} ${s.label} — open the ${s.label} queue` : `Filter to ${s.label}`"
        >
          <span class="node-ring" :style="{ '--deg': share(s) }">
            <span class="node-core"><component :is="s.icon" :size="16" /></span>
          </span>
          <span class="node-val"><SdCountUp :value="count(s)" /></span>
          <span class="node-lbl">{{ s.label }}<ArrowUpRight v-if="s.action === 'nav'" :size="10" class="node-go" /></span>
        </button>
      </template>

      <!-- one last flowing link into the gate -->
      <span class="fp-link to-gate" :class="{ hot: breaching > 0 }" :style="{ '--seg': flow.length }" aria-hidden="true">
        <span class="fp-rail" />
        <span v-for="p in 3" :key="p" class="pkt" :style="pktStyle(flow.length, p)" />
        <span v-if="breaching > 0" class="pkt hot" :style="pktStyle(flow.length, 4)" />
      </span>

      <!-- RESOLUTION GATE -->
      <div class="fp-gate" :title="`${stats.resolved_today || 0} resolved today`">
        <span class="gate-glow" />
        <span class="gate-beam" />
        <span class="gate-core"><CircleCheck :size="20" /></span>
        <span class="gate-lbl sd-mono">RESOLVE</span>
      </div>
    </div>

    <!-- frontier readout -->
    <div class="fp-foot">
      <span class="fp-chip" :class="{ live: breaching > 0 }">
        <i class="dot danger" /> <b>{{ breaching }}</b> breaching
      </span>
      <span class="fp-chip">
        <i class="dot warn" /> <b>{{ stats.due_soon ?? stats.sla_risk ?? 0 }}</b> due soon
      </span>
      <span class="fp-chip">
        <i class="dot crit" /> <b>{{ stats.critical || 0 }}</b> critical
      </span>
      <span class="fp-flowline">
        <i class="fl-run" /> <b>{{ activeTotal }}</b> in flight
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Activity, PlayCircle, Hourglass, Pause, Flame, CircleCheck, Waypoints, TrendingUp, ArrowUpRight } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  stats: { type: Object, default: () => ({}) },
  activeStage: { type: String, default: '' },   // which in-scope stage is filtered (open|in_progress)
  reduced: { type: Boolean, default: false },
})
defineEmits(['pick'])

const root = ref(null)

/* stage definitions in workflow order → the gate.
   open / in_progress are IN THIS TAB (filter locally); pending / hold live on sibling
   tabs (cross-navigate) — surfacing them here closes the "hidden adjacent work" loophole. */
const flow = [
  { key: 'open', label: 'Open', icon: Activity, color: 'var(--sd-st-open)', action: 'filter', filter: 'open', statuses: ['open'] },
  { key: 'in_progress', label: 'In Progress', icon: PlayCircle, color: 'var(--sd-st-progress)', action: 'filter', filter: 'in_progress', statuses: ['in_progress'] },
  { key: 'pending', label: 'Pending', icon: Hourglass, color: 'var(--sd-st-pending)', action: 'nav', navTab: 'pending-customer', statuses: ['pending_customer', 'pending_vendor'] },
  { key: 'on_hold', label: 'On Hold', icon: Pause, color: 'var(--sd-st-hold)', action: 'nav', navTab: 'on-hold', statuses: ['on_hold'] },
]

const num = (v) => Number(v) || 0
const count = (s) => {
  const st = props.stats || {}
  if (s.key === 'pending') return num(st.pending_total) || (num(st.pending_customer) + num(st.pending_vendor))
  if (s.key === 'open') return num(st.open)
  if (s.key === 'in_progress') return num(st.in_progress)
  if (s.key === 'on_hold') return num(st.on_hold)
  return 0
}
const activeTotal = computed(() => flow.reduce((a, s) => a + count(s), 0))
const share = (s) => {
  const tot = activeTotal.value || 1
  return Math.round((count(s) / tot) * 360)
}
const escalated = computed(() => num(props.stats?.escalated))
const breaching = computed(() => num(props.stats?.breaching) || num(props.stats?.sla_breached))
const veloLabel = computed(() => {
  const m = num(props.stats?.avg_resolution_minutes)
  if (!m) return '—'
  if (m < 60) return `${Math.round(m)}m`
  if (m < 1440) return `${(m / 60).toFixed(1)}h`
  return `${(m / 1440).toFixed(1)}d`
})

/* a link glows hot when there's breach pressure feeding the downstream */
const linkHot = (i) => breaching.value > 0 && i >= 2
const pktStyle = (seg, p) => ({
  '--d': `${(seg * 0.5 + p * 0.9).toFixed(2)}s`,
  '--dur': `${(3.4 + (p % 3) * 0.6).toFixed(2)}s`,
})
</script>

<style scoped>
/* ── dark display panel (both themes) ── */
.fp {
  position: relative; overflow: hidden; border-radius: 18px; padding: 16px 20px 15px;
  min-height: 236px; display: flex; flex-direction: column;
  background: linear-gradient(160deg, #0a0d11 0%, #070a0d 60%, #0b0806 100%);
  border: 1px solid rgba(251, 146, 60, 0.16);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 18px 44px rgba(0, 0, 0, 0.5);
  isolation: isolate;
}
[data-theme="light"] .fp { border-color: rgba(120, 70, 20, 0.4); box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 14px 34px rgba(60, 35, 10, 0.28); }

.fp-bg { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.fp-grid { position: absolute; inset: 0; opacity: 0.5;
  background-image: linear-gradient(rgba(251, 146, 60, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(251, 146, 60, 0.05) 1px, transparent 1px);
  background-size: 30px 30px; -webkit-mask-image: radial-gradient(120% 100% at 50% 40%, #000 40%, transparent 100%); mask-image: radial-gradient(120% 100% at 50% 40%, #000 40%, transparent 100%); }
.fp-aura { position: absolute; width: 320px; height: 320px; right: -60px; top: 50%; transform: translateY(-50%); border-radius: 50%; filter: blur(60px);
  background: radial-gradient(circle, rgba(52, 211, 153, 0.22), transparent 66%); }
.fp-mote { position: absolute; width: 4px; height: 4px; border-radius: 50%; background: rgba(251, 191, 36, 0.6); box-shadow: 0 0 8px rgba(251, 191, 36, 0.7); }
.fp-mote.m1 { top: 30%; left: 14%; animation: fp-drift 9s ease-in-out infinite; }
.fp-mote.m2 { top: 62%; left: 40%; animation: fp-drift 12s ease-in-out infinite reverse; }
.fp-mote.m3 { top: 24%; left: 68%; animation: fp-drift 10.5s ease-in-out infinite; }

/* ── topbar ── */
.fp-topbar { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.fp-tag { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.2em; color: rgba(251, 191, 36, 0.82); }
.fp-velo { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; color: rgba(226, 232, 240, 0.66); }
.fp-velo svg { color: var(--sd-success); }
.fp-velo b { color: #eef2f6; font-weight: 800; font-family: var(--sd-mono); }
.fp-velo-sep { width: 1px; height: 11px; background: rgba(255, 255, 255, 0.14); }
.fp-velo-cyc { font-size: 10.5px; color: rgba(226, 232, 240, 0.5); }

/* ── escalated spur ── */
.fp-spur { position: absolute; z-index: 3; top: 44px; left: 50%; transform: translateX(-30%); display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 11px; border-radius: 999px; cursor: pointer; font-family: inherit; font-size: 11px; font-weight: 700;
  color: var(--sd-st-escalated); background: rgba(249, 115, 22, 0.14); border: 1px solid rgba(249, 115, 22, 0.42); transition: transform 0.2s var(--sd-spring); }
.fp-spur:hover { transform: translateX(-30%) translateY(-2px); }
.fp-spur b { font-family: var(--sd-mono); }
.fp-spur.hot { animation: fp-spur-pulse 2.2s ease-in-out infinite; }
.fp-spur-go { opacity: 0.7; }

/* ── the flow row ── */
.fp-flow { position: relative; z-index: 2; flex: 1; display: flex; align-items: center; gap: 0; margin: 18px 0 8px; }

.fp-node { position: relative; flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; gap: 7px; width: 88px;
  padding: 6px 2px; border: none; background: none; cursor: pointer; font-family: inherit; border-radius: 14px; transition: transform 0.22s var(--sd-spring); }
.fp-node:hover { transform: translateY(-3px); }
.fp-node.nav { cursor: alias; }
.node-ring { position: relative; width: 54px; height: 54px; border-radius: 50%; display: grid; place-items: center;
  background: conic-gradient(var(--nc) calc(var(--deg, 0) * 1deg), rgba(255, 255, 255, 0.08) 0); transition: background 0.6s var(--sd-spring); }
.node-ring::after { content: ''; position: absolute; inset: 4px; border-radius: 50%; background: #0a0d11; }
[data-theme="light"] .node-ring::after { background: #14100b; }
.node-core { position: relative; z-index: 1; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; color: var(--nc);
  background: color-mix(in srgb, var(--nc) 15%, #0a0d11); box-shadow: 0 0 16px color-mix(in srgb, var(--nc) 32%, transparent); }
.fp-node.active .node-core { box-shadow: 0 0 22px color-mix(in srgb, var(--nc) 55%, transparent); animation: fp-node-flare 2s ease-in-out infinite; }
.fp-node.empty .node-core { color: rgba(226, 232, 240, 0.4); box-shadow: none; }
.node-val { font-size: 20px; font-weight: 850; color: #eef2f6; letter-spacing: -0.02em; line-height: 1; font-variant-numeric: tabular-nums; }
.node-lbl { display: inline-flex; align-items: center; gap: 3px; font-size: 10.5px; font-weight: 600; color: rgba(226, 232, 240, 0.62); white-space: nowrap; }
.node-go { opacity: 0.6; }
.fp-node:hover .node-lbl { color: #eef2f6; }
.fp-node.active .node-lbl { color: var(--nc); }

/* ── connector rails + packets ── */
.fp-link { position: relative; flex: 1 1 auto; height: 40px; min-width: 26px; display: flex; align-items: center; }
.fp-rail { position: absolute; left: 0; right: 0; top: 50%; height: 2px; transform: translateY(-50%);
  background: linear-gradient(90deg, rgba(251, 191, 36, 0.28), rgba(251, 146, 60, 0.45), rgba(251, 191, 36, 0.28));
  background-size: 220% 100%; animation: fp-rail-flow 3.6s linear infinite; }
.fp-link.hot .fp-rail { background: linear-gradient(90deg, rgba(239, 68, 68, 0.3), rgba(239, 68, 68, 0.6), rgba(239, 68, 68, 0.3)); background-size: 220% 100%; }
.pkt { position: absolute; top: 50%; width: 6px; height: 6px; border-radius: 50%; margin-top: -3px; left: -4%;
  background: var(--sd-amber); box-shadow: 0 0 10px var(--sd-amber); animation: fp-pkt var(--dur, 3.8s) linear infinite; animation-delay: var(--d, 0s); }
.pkt.hot { background: var(--sd-danger); box-shadow: 0 0 12px var(--sd-danger); width: 7px; height: 7px; margin-top: -3.5px; }

/* ── resolution gate ── */
.fp-gate { position: relative; flex: 0 0 auto; width: 72px; height: 118px; margin-left: 6px; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  background: linear-gradient(180deg, rgba(52, 211, 153, 0.16), rgba(5, 150, 105, 0.08)); border: 1px solid rgba(52, 211, 153, 0.4); overflow: hidden; }
.gate-glow { position: absolute; inset: 0; background: radial-gradient(circle at 50% 40%, rgba(52, 211, 153, 0.3), transparent 68%); animation: fp-gate-pulse 2.6s ease-in-out infinite; }
.gate-beam { position: absolute; left: -30%; top: 0; bottom: 0; width: 40%; background: linear-gradient(90deg, transparent, rgba(52, 211, 153, 0.34), transparent); transform: skewX(-16deg); animation: fp-gate-beam 3.2s ease-in-out infinite; }
.gate-core { position: relative; z-index: 1; width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; color: #fff;
  background: linear-gradient(140deg, var(--sd-success), #059669); box-shadow: 0 0 20px rgba(52, 211, 153, 0.5); }
.gate-lbl { position: relative; z-index: 1; font-size: 9px; font-weight: 800; letter-spacing: 0.16em; color: rgba(52, 211, 153, 0.9); }

/* ── footer chips ── */
.fp-foot { position: relative; z-index: 2; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: auto; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.06); }
.fp-chip { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: rgba(226, 232, 240, 0.66); }
.fp-chip b { color: #eef2f6; font-weight: 800; font-family: var(--sd-mono); }
.fp-chip .dot { width: 7px; height: 7px; border-radius: 50%; }
.fp-chip .dot.danger { background: var(--sd-danger); box-shadow: 0 0 7px var(--sd-danger); }
.fp-chip .dot.warn { background: var(--sd-warning); box-shadow: 0 0 7px var(--sd-warning); }
.fp-chip .dot.crit { background: var(--sd-pri-critical); box-shadow: 0 0 7px var(--sd-pri-critical); }
.fp-chip.live { animation: fp-spur-pulse 2s ease-in-out infinite; }
.fp-flowline { display: inline-flex; align-items: center; gap: 6px; margin-left: auto; font-size: 11px; color: rgba(226, 232, 240, 0.66); }
.fp-flowline b { color: #eef2f6; font-weight: 800; font-family: var(--sd-mono); }
.fl-run { width: 16px; height: 2px; border-radius: 2px; background: linear-gradient(90deg, transparent, var(--sd-amber)); background-size: 200% 100%; animation: fp-rail-flow 2.4s linear infinite; }

/* ── keyframes ── */
@keyframes fp-pkt { 0% { left: -4%; opacity: 0; } 12% { opacity: 1; } 88% { opacity: 1; } 100% { left: 104%; opacity: 0; } }
@keyframes fp-rail-flow { to { background-position: -220% 0; } }
@keyframes fp-drift { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(14px, -10px); } }
@keyframes fp-node-flare { 0%, 100% { box-shadow: 0 0 22px color-mix(in srgb, var(--nc) 55%, transparent); } 50% { box-shadow: 0 0 34px color-mix(in srgb, var(--nc) 78%, transparent); } }
@keyframes fp-gate-pulse { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
@keyframes fp-gate-beam { 0% { left: -40%; } 55%, 100% { left: 120%; } }
@keyframes fp-spur-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }

/* ── responsive ── */
@media (max-width: 560px) {
  .fp-flow { flex-wrap: wrap; gap: 8px; justify-content: center; }
  .fp-link { display: none; }
  .fp-gate { width: 100%; height: 56px; flex-direction: row; margin: 4px 0 0; }
  .fp-spur { position: static; transform: none; margin: 8px auto 0; }
}

/* ── reduced motion ── */
.fp.reduced .pkt, .fp.reduced .fp-rail, .fp.reduced .gate-glow, .fp.reduced .gate-beam,
.fp.reduced .fp-mote, .fp.reduced .node-core, .fp.reduced .fp-spur, .fp.reduced .fp-chip, .fp.reduced .fl-run { animation: none !important; }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .pkt,
  html:not([data-cinematic="on"]) .fp-rail,
  html:not([data-cinematic="on"]) .gate-glow,
  html:not([data-cinematic="on"]) .gate-beam,
  html:not([data-cinematic="on"]) .fp-mote,
  html:not([data-cinematic="on"]) .node-core,
  html:not([data-cinematic="on"]) .fp-spur,
  html:not([data-cinematic="on"]) .fp-chip,
  html:not([data-cinematic="on"]) .fl-run { animation: none !important; }
}
</style>
