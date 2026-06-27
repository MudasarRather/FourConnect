<template>
  <!-- ═══════════════════ THE VERDICT LINE · Review Flux Pipeline ═══════════════════
       Reviews flow left→right through the 4 lifecycle stages (Reflection → Manager
       review → Completed → Signed-off) as score-tinted capsules riding flowing
       conduits between luminous stage reactors. A merit SPUR drops off the Completed
       node into a pay-uplift coil — the literal Reviews→Merit→Pay connection made
       visible. Overdue reviews glow as an ember zone under the in-flight stages.
       Unique within Performance (vs the dashboard orrery, insights bell-curve,
       merit oscilloscope). Continuous motion, 3-tier parallax, dark+light, a11y. -->
  <div ref="rootEl" class="rfp" :class="{ lit }">
    <!-- ambient backdrop -->
    <span class="rfp-floor" aria-hidden="true" />
    <span class="rfp-aura" aria-hidden="true" />
    <span class="rfp-scan" aria-hidden="true" />
    <div class="rfp-motes" aria-hidden="true">
      <span v-for="m in motes" :key="m.i" class="rfp-mote" :style="{ left: m.x + '%', top: m.y + '%', '--d': m.d + 's', '--dl': m.dl + 's', '--sz': m.sz + 'px' }" />
    </div>

    <!-- conduit network -->
    <svg class="rfp-net" viewBox="0 0 1000 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <linearGradient id="rfpFlow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="var(--perf-gold)" stop-opacity="0" />
          <stop offset="50%" stop-color="var(--perf-gold)" stop-opacity="0.9" />
          <stop offset="100%" stop-color="var(--perf-orange)" stop-opacity="0" />
        </linearGradient>
      </defs>
      <!-- base track -->
      <path v-for="(s, i) in segPaths" :key="'b' + i" :d="s.d" class="rfp-track" />
      <path :d="spurPath" class="rfp-track" />
      <!-- energised flow -->
      <path v-for="(s, i) in segPaths" :key="'f' + i" :d="s.d" class="rfp-flow" :class="{ on: s.flow > 0 }" :style="{ '--fd': (5 + i) + 's' }" />
      <path :d="spurPath" class="rfp-flow spur" :class="{ on: eligible > 0 }" />
    </svg>

    <!-- riding capsules -->
    <div class="rfp-capsules" aria-hidden="true">
      <template v-for="(s, si) in stages.slice(0, 3)" :key="'seg' + si">
        <span v-for="c in capsules(si)" :key="'c' + si + '-' + c.k" class="rfp-cap"
          :style="{ '--x0': s.left + '%', '--x1': stages[si + 1].left + '%', '--c': stages[si + 1].color, '--dur': c.dur + 's', '--dl': c.dl + 's' }" />
      </template>
      <!-- merit spur drops -->
      <span v-for="d in spurDrops" :key="'d' + d.k" class="rfp-drop"
        :style="{ left: stages[2].left + '%', '--dur': d.dur + 's', '--dl': d.dl + 's' }" />
    </div>

    <!-- stage reactors -->
    <button v-for="(s, i) in stages" :key="s.key" class="rfp-node" :class="{ active: s.count > 0, flight: s.flight, picked: s.key === activeStatus }"
      :style="{ left: s.left + '%', '--c': s.color, '--p': s.deg + 'deg', '--i': i }"
      type="button" @click="$emit('pick', s.key)" :title="`${s.label} — ${s.count}`">
      <span class="rfp-node-pulse" aria-hidden="true" />
      <span class="rfp-node-ring">
        <span class="rfp-node-core"><component :is="s.icon" :size="17" /></span>
      </span>
      <span class="rfp-node-count"><SetCountUp :value="s.count" /></span>
      <span class="rfp-node-lab">{{ s.label }}</span>
      <span v-if="i === 0 && drafts > 0" class="rfp-node-feed">+{{ drafts }} draft</span>
    </button>

    <!-- merit spur emblem (Reviews → Merit → Pay) -->
    <button class="rfp-merit" :class="{ live: eligible > 0 }" type="button"
      :style="{ left: stages[2].left + '%' }" @click="$emit('go', 'merit')"
      :title="`${eligible} review${eligible === 1 ? '' : 's'} can drive a merit increment`">
      <span class="rfp-merit-emit" aria-hidden="true" />
      <span class="rfp-merit-emit two" aria-hidden="true" />
      <span class="rfp-merit-disc"><TrendingUp :size="15" /></span>
      <span class="rfp-merit-txt">Merit&nbsp;&amp;&nbsp;pay <i><SetCountUp :value="eligible" /></i></span>
    </button>

    <!-- voided side chip -->
    <button v-if="cancelled > 0" class="rfp-void" type="button" @click="$emit('pick', 'CANCELLED')" title="Cancelled reviews">
      <CircleSlash :size="11" /> {{ cancelled }} voided
    </button>

    <!-- floating HUD -->
    <div class="rfp-hud rfp-hud-tl">
      <span class="rfp-hud-k"><Activity :size="12" /> In flight</span>
      <b><SetCountUp :value="inFlight" /></b>
    </div>
    <div class="rfp-hud rfp-hud-tr">
      <span class="rfp-hud-k"><Gauge :size="12" /> Avg score</span>
      <b v-if="avg != null" :style="{ color: avgColor }"><SetCountUp :value="avg" :decimals="1" /><i>/{{ max }}</i></b>
      <b v-else class="dim">—</b>
    </div>
    <div class="rfp-hud rfp-hud-bl" :class="{ ember: overdue > 0 }">
      <span class="rfp-hud-k"><TriangleAlert :size="12" /> Overdue</span>
      <b><SetCountUp :value="overdue" /></b>
    </div>
    <div class="rfp-hud rfp-hud-br">
      <span class="rfp-hud-k"><ShieldCheck :size="12" /> Completion</span>
      <b><SetCountUp :value="completion" :decimals="0" suffix="%" /></b>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Activity, Gauge, TriangleAlert, ShieldCheck, TrendingUp, CircleSlash, PencilRuler, UserCheck, CheckCircle2, BadgeCheck } from 'lucide-vue-next'
import SetCountUp from '@/views/hr/settings/components/SetCountUp.vue'
import { usePointerSpotlight } from '@/composables/useShiftMotion'
import { scoreTone } from '@/composables/usePerformance'

const props = defineProps({
  stats: { type: Object, default: () => ({}) },
  max: { type: Number, default: 5 },
  activeStatus: { type: String, default: null },
})
defineEmits(['pick', 'go'])

const rootEl = ref(null)
usePointerSpotlight(rootEl)   // sets --mx / --my (0..1, idle 0.5) on the element for parallax
const lit = ref(false)
onMounted(() => { requestAnimationFrame(() => { lit.value = true }) })

const byStatus = computed(() => props.stats.by_status || {})
const total = computed(() => props.stats.total || 0)
const avg = computed(() => props.stats.avg_overall ?? null)
const avgColor = computed(() => avg.value != null ? scoreTone(avg.value, props.max) : 'var(--perf-unset)')
const completion = computed(() => Math.round(props.stats.completion_rate || 0))
const overdue = computed(() => props.stats.overdue || 0)
const drafts = computed(() => byStatus.value.DRAFT || 0)
const cancelled = computed(() => byStatus.value.CANCELLED || 0)
const acknowledged = computed(() => byStatus.value.ACKNOWLEDGED || 0)
const completed = computed(() => byStatus.value.COMPLETED || 0)
const inFlight = computed(() => (byStatus.value.SELF_ASSESSMENT || 0) + (byStatus.value.MANAGER_ASSESSMENT || 0) + drafts.value)
const eligible = computed(() => completed.value + acknowledged.value)

// 4 lifecycle stages along the rail (viewBox x → left%)
const NODE_X = [130, 360, 590, 820]
const DEF = [
  { key: 'SELF_ASSESSMENT', label: 'Reflection', color: 'var(--perf-amber)', icon: PencilRuler, flight: true },
  { key: 'MANAGER_ASSESSMENT', label: 'Manager review', color: 'var(--perf-orange)', icon: UserCheck, flight: true },
  { key: 'COMPLETED', label: 'Completed', color: 'var(--perf-gold)', icon: CheckCircle2, flight: false },
  { key: 'ACKNOWLEDGED', label: 'Signed off', color: 'var(--perf-ok)', icon: BadgeCheck, flight: false },
]
const stages = computed(() => DEF.map((d, i) => {
  const count = byStatus.value[d.key] || 0
  const share = total.value ? count / total.value : 0
  return { ...d, count, left: +(NODE_X[i] / 1000 * 100).toFixed(2), deg: Math.round(share * 360),
    flow: i < 3 ? (byStatus.value[DEF[i + 1].key] || 0) : 0 }
}))

// conduit geometry — gentle alternating bow between node centres
const segPaths = computed(() => {
  const out = []
  for (let i = 0; i < 3; i++) {
    const x0 = NODE_X[i] + 34, x1 = NODE_X[i + 1] - 34
    const mxp = (x0 + x1) / 2, bow = i % 2 === 0 ? 130 : 172
    out.push({ d: `M ${x0} 150 Q ${mxp} ${bow} ${x1} 150`, flow: stages.value[i].flow })
  }
  return out
})
const spurPath = `M ${NODE_X[2]} 184 C ${NODE_X[2] + 46} 214, ${NODE_X[2] + 40} 236, ${NODE_X[2]} 254`

// riding capsules per segment (always ≥2 so the line is never dead)
const seed = (n) => ((Math.sin(n * 12.9898) * 43758.5453) % 1 + 1) % 1
function capsules(si) {
  const flow = stages.value[si]?.flow || 0
  const n = Math.min(5, Math.max(2, flow))
  return Array.from({ length: n }, (_, k) => ({ k, dur: (3.6 + seed(si * 9 + k) * 2.4).toFixed(2), dl: (-(k / n) * (3.6 + si)).toFixed(2) }))
}
const spurDrops = computed(() => {
  const n = eligible.value > 0 ? Math.min(3, Math.max(1, eligible.value)) : 0
  return Array.from({ length: n }, (_, k) => ({ k, dur: (2.6 + seed(k * 5) * 1.2).toFixed(2), dl: (-(k / Math.max(1, n)) * 2.6).toFixed(2) }))
})

// data-independent ambient motes (never empty)
const motes = Array.from({ length: 22 }, (_, i) => ({
  i,
  x: Math.round(seed(i * 3.1) * 100),
  y: Math.round(seed(i * 5.7) * 100),
  d: (5 + seed(i * 2.3) * 6).toFixed(1),
  dl: (seed(i * 8.9) * 6).toFixed(1),
  sz: (1 + Math.round(seed(i) * 2)),
}))
</script>

<style scoped>
.rfp { position: relative; overflow: hidden; height: clamp(228px, 30vw, 300px); border-radius: 20px;
  background:
    radial-gradient(130% 120% at 82% 110%, color-mix(in srgb, var(--perf-ok) 9%, transparent), transparent 55%),
    radial-gradient(120% 130% at 8% -10%, color-mix(in srgb, var(--perf-gold) 12%, transparent), transparent 60%),
    var(--perf-panel);
  border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow); }

/* ── backdrop ── */
.rfp-floor { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0.45;
  background-image: linear-gradient(color-mix(in srgb, var(--perf-gold) 7%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--perf-gold) 7%, transparent) 1px, transparent 1px);
  background-size: 38px 38px; mask-image: radial-gradient(130% 130% at 50% 60%, #000 30%, transparent 86%);
  -webkit-mask-image: radial-gradient(130% 130% at 50% 60%, #000 30%, transparent 86%);
  transform: translate(calc((var(--mx, 0.5) - 0.5) * -16px), calc((var(--my, 0.5) - 0.5) * -12px)); }
.rfp-aura { position: absolute; inset: -40% 30% auto -10%; height: 110%; z-index: 0; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--perf-gold) 16%, transparent), transparent 70%); filter: blur(46px);
  transform: translate(calc((var(--mx, 0.5) - 0.5) * 22px), calc((var(--my, 0.5) - 0.5) * 16px)); }
.rfp-scan { position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: 0.5;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--perf-gold) 9%, transparent), transparent);
  width: 36%; animation: rfp-scan 9s linear infinite; }
@keyframes rfp-scan { 0% { transform: translateX(-140%); } 100% { transform: translateX(360%); } }

.rfp-motes { position: absolute; inset: 0; z-index: 1; pointer-events: none;
  transform: translate(calc((var(--mx, 0.5) - 0.5) * 26px), calc((var(--my, 0.5) - 0.5) * 20px)); }
.rfp-mote { position: absolute; width: var(--sz); height: var(--sz); border-radius: 50%; background: var(--perf-gold);
  box-shadow: 0 0 6px var(--perf-gold); opacity: 0; animation: rfp-mote var(--d) ease-in-out var(--dl) infinite; }
@keyframes rfp-mote { 0%, 100% { opacity: 0; transform: translateY(6px); } 50% { opacity: 0.6; transform: translateY(-8px); } }

/* ── conduits ── */
.rfp-net { position: absolute; inset: 0; z-index: 2; width: 100%; height: 100%; pointer-events: none;
  transform: translate(calc((var(--mx, 0.5) - 0.5) * 8px), calc((var(--my, 0.5) - 0.5) * 6px)); }
.rfp-track { fill: none; stroke: var(--perf-border-strong); stroke-width: 2.4; stroke-linecap: round; opacity: 0.5; }
.rfp-flow { fill: none; stroke: url(#rfpFlow); stroke-width: 3; stroke-linecap: round; opacity: 0; stroke-dasharray: 26 220;
  animation: rfp-dash var(--fd, 6s) linear infinite; transition: opacity 0.5s; }
.rfp-flow.on { opacity: 0.85; }
.rfp-flow.spur { stroke-dasharray: 16 120; animation-duration: 3.4s; }
@keyframes rfp-dash { to { stroke-dashoffset: -246; } }

/* ── riding capsules ── */
.rfp-capsules { position: absolute; inset: 0; z-index: 3; pointer-events: none;
  transform: translate(calc((var(--mx, 0.5) - 0.5) * 10px), calc((var(--my, 0.5) - 0.5) * 7px)); }
.rfp-cap { position: absolute; top: 50%; width: 9px; height: 9px; border-radius: 50%; background: var(--c);
  box-shadow: 0 0 10px var(--c), 0 0 3px #fff inset; opacity: 0;
  animation: rfp-ride var(--dur) linear var(--dl) infinite; }
@keyframes rfp-ride {
  0% { left: var(--x0); opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
  14% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  86% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  100% { left: var(--x1); opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
}
.rfp-drop { position: absolute; top: 50%; width: 8px; height: 8px; border-radius: 50%; background: var(--perf-ok);
  box-shadow: 0 0 10px var(--perf-ok); opacity: 0; animation: rfp-drop var(--dur) ease-in var(--dl) infinite; }
@keyframes rfp-drop {
  0% { top: 52%; opacity: 0; } 18% { opacity: 1; } 82% { opacity: 1; } 100% { top: 86%; opacity: 0; }
}

/* ── stage reactors ── */
.rfp-node { position: absolute; top: 50%; z-index: 5; display: flex; flex-direction: column; align-items: center; gap: 3px;
  transform: translate(-50%, -50%); cursor: pointer; background: none; border: none; font: inherit; padding: 0;
  animation: rfp-pop 0.6s var(--perf-spring) both; animation-delay: calc(0.15s + var(--i) * 0.08s); }
@keyframes rfp-pop { from { opacity: 0; transform: translate(-50%, -38%) scale(0.7); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
.rfp-node-ring { position: relative; display: grid; place-items: center; width: 60px; height: 60px; border-radius: 50%;
  background: conic-gradient(var(--c) var(--p, 0deg), var(--perf-track) 0); transition: --p 0.9s var(--perf-spring); }
.rfp-node-ring::after { content: ''; position: absolute; inset: 4px; border-radius: 50%; background: var(--perf-surface-elevated); }
.rfp-node-core { position: relative; z-index: 1; display: grid; place-items: center; width: 42px; height: 42px; border-radius: 50%;
  color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); transition: all 0.3s; }
.rfp-node.active .rfp-node-core { color: var(--c); background: color-mix(in srgb, var(--c) 20%, transparent); box-shadow: 0 0 18px -2px color-mix(in srgb, var(--c) 55%, transparent); }
.rfp-node-pulse { position: absolute; top: 4px; left: 50%; width: 60px; height: 60px; margin-left: -30px; border-radius: 50%;
  border: 1.5px solid var(--c); opacity: 0; }
.rfp-node.active.flight .rfp-node-pulse { animation: rfp-ring 2.6s ease-out infinite; }
@keyframes rfp-ring { 0% { opacity: 0.5; transform: scale(0.8); } 100% { opacity: 0; transform: scale(1.7); } }
.rfp-node-count { font-size: 16px; font-weight: 900; color: var(--perf-text); font-variant-numeric: tabular-nums; line-height: 1; margin-top: 2px; }
.rfp-node-lab { font-size: 9.5px; font-weight: 750; letter-spacing: 0.03em; color: var(--perf-text-muted); white-space: nowrap; }
.rfp-node-feed { position: absolute; top: -16px; font-size: 8.5px; font-weight: 800; color: var(--perf-text-dim); white-space: nowrap; }
.rfp-node:hover .rfp-node-ring { filter: brightness(1.12); }
.rfp-node:hover .rfp-node-lab { color: var(--perf-text); }
.rfp-node.picked .rfp-node-core { box-shadow: 0 0 0 2px var(--c), 0 0 20px -2px color-mix(in srgb, var(--c) 60%, transparent); }
.rfp-node.picked .rfp-node-lab { color: var(--c); font-weight: 850; }

/* ── merit spur emblem ── */
.rfp-merit { position: absolute; top: 84%; z-index: 5; display: flex; align-items: center; gap: 7px; transform: translate(-50%, -50%);
  padding: 5px 11px 5px 5px; border-radius: 999px; cursor: pointer; font: inherit;
  background: var(--perf-surface-elevated); border: 1px solid var(--perf-border-strong); transition: all 0.25s var(--perf-spring); }
.rfp-merit:hover { border-color: color-mix(in srgb, var(--perf-ok) 45%, transparent); transform: translate(-50%, -52%); }
.rfp-merit-disc { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0; color: #06281c;
  background: var(--perf-ok); box-shadow: 0 0 14px -2px var(--perf-ok); }
.rfp-merit.live .rfp-merit-disc { animation: rfp-merit-beat 2.4s ease-in-out infinite; }
@keyframes rfp-merit-beat { 0%, 100% { box-shadow: 0 0 12px -2px var(--perf-ok); } 50% { box-shadow: 0 0 22px 1px var(--perf-ok); } }
.rfp-merit-txt { font-size: 10.5px; font-weight: 750; color: var(--perf-text-secondary); white-space: nowrap; }
.rfp-merit-txt i { font-style: normal; font-weight: 900; color: var(--perf-ok); margin-left: 2px; }
.rfp-merit-emit { position: absolute; left: 15px; top: 50%; width: 30px; height: 30px; margin-top: -15px; border-radius: 50%; border: 1.5px solid var(--perf-ok); opacity: 0; }
.rfp-merit.live .rfp-merit-emit { animation: rfp-ring 2.8s ease-out infinite; }
.rfp-merit.live .rfp-merit-emit.two { animation-delay: 1.4s; }

/* ── voided chip ── */
.rfp-void { position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); z-index: 5;
  display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; cursor: pointer; font: inherit;
  font-size: 10px; font-weight: 750; color: var(--perf-conflict); background: var(--perf-conflict-soft);
  border: 1px solid color-mix(in srgb, var(--perf-conflict) 28%, transparent); transition: all 0.2s; }
.rfp-void:hover { background: color-mix(in srgb, var(--perf-conflict) 20%, transparent); }

/* ── HUD ── */
.rfp-hud { position: absolute; z-index: 6; display: flex; flex-direction: column; gap: 2px; padding: 8px 11px; border-radius: 12px;
  background: var(--perf-glass); border: 1px solid var(--perf-border); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 10px 26px -18px rgba(0,0,0,0.6); }
.rfp-hud-tl { top: 12px; left: 12px; } .rfp-hud-tr { top: 12px; right: 12px; align-items: flex-end; }
.rfp-hud-bl { bottom: 12px; left: 12px; } .rfp-hud-br { bottom: 12px; right: 12px; align-items: flex-end; }
.rfp-hud-k { display: inline-flex; align-items: center; gap: 5px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--perf-text-muted); }
.rfp-hud-k :deep(svg) { color: var(--perf-gold); }
.rfp-hud b { font-size: 18px; font-weight: 900; color: var(--perf-text); font-variant-numeric: tabular-nums; line-height: 1; }
.rfp-hud b.dim { color: var(--perf-text-dim); }
.rfp-hud b i { font-size: 10px; font-weight: 600; font-style: normal; color: var(--perf-text-muted); }
.rfp-hud-bl.ember .rfp-hud-k, .rfp-hud-bl.ember b { color: var(--perf-conflict); }
.rfp-hud-bl.ember .rfp-hud-k :deep(svg) { color: var(--perf-conflict); }
.rfp-hud-bl.ember { border-color: color-mix(in srgb, var(--perf-conflict) 30%, transparent); animation: rfp-ember 2.4s ease-in-out infinite; }
@keyframes rfp-ember { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--perf-conflict) 0%, transparent); } 50% { box-shadow: 0 0 16px -3px color-mix(in srgb, var(--perf-conflict) 55%, transparent); } }

@media (max-width: 720px) {
  .rfp-node-lab { display: none; }
  .rfp-hud-br, .rfp-hud-tr { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .rfp-scan, .rfp-mote, .rfp-flow, .rfp-cap, .rfp-drop, .rfp-node, .rfp-node-pulse, .rfp-merit-disc, .rfp-merit-emit, .rfp-hud-bl.ember { animation: none !important; }
  .rfp-flow.on { opacity: 0.4; }
  .rfp-cap, .rfp-drop { display: none; }
}
</style>
