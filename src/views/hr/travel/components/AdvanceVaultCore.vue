<template>
  <Motion as="section" class="vault trv-grain" ref="rootEl"
    :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
    <span class="vault-aura" aria-hidden="true" />
    <span class="vault-floor" aria-hidden="true" />

    <div class="vault-inner">
      <!-- ── LEFT · the treasury standpipe ─────────────────────────────── -->
      <div class="standpipe">
        <div class="sp-glass" :class="{ empty: pool <= 0 }">
          <!-- denomination ticks -->
          <span v-for="t in 4" :key="t" class="sp-tick" :style="{ bottom: (t * 20) + '%' }" />

          <!-- pending capital (committed but not yet poured) -->
          <div class="sp-pending" :style="{ height: drawn ? pendingPct + '%' : '0%' }">
            <span class="sp-pending-tag" v-if="pending > 0 && pendingPct > 9">to pour</span>
          </div>

          <!-- the actual liquid: closed (calm) + released (glowing float) -->
          <div class="sp-liquid" :style="{ height: drawn ? liquidPct + '%' : '0%' }">
            <div class="sp-released" :style="{ height: drawn ? releasedShare + '%' : '0%' }">
              <span class="sp-caustic" aria-hidden="true" />
              <i v-for="b in 5" :key="b" class="sp-bubble" :style="bubbleStyle(b)" />
            </div>
            <div class="sp-closed" :style="{ height: drawn ? closedShare + '%' : '0%' }">
              <span v-if="closed > 0 && closedFillPct >= 15" class="sp-closed-tag trv-mono">
                <Lock :size="9" /> {{ fmtCompactINR(closed) }} vaulted
              </span>
            </div>
            <span class="sp-meniscus" />
          </div>

          <!-- float line — the surface of money actually in the field -->
          <div v-if="released > 0" class="sp-floatline" :style="{ bottom: drawn ? liquidPct + '%' : '0%' }">
            <span class="fl-dot" />
            <span class="fl-tag">FLOAT · <b class="trv-mono">{{ fmtCompactINR(released) }}</b></span>
          </div>

          <!-- recovery drain at the base -->
          <div class="sp-drain" :class="{ active: recovered > 0 }" :title="recovered > 0 ? 'Capital recovered' : 'No recovery'">
            <Droplets :size="13" />
          </div>
        </div>
        <span class="sp-label"><Vault :size="11" /> Reservoir</span>
      </div>

      <!-- ── RIGHT · treasury readout ──────────────────────────────────── -->
      <div class="vault-read">
        <span class="vr-eyebrow"><HandCoins :size="12" /> Capital in flight</span>
        <div class="vr-head">
          <span class="vr-big trv-mono"><TrvCountUp :value="released" :format="fmtINR" /></span>
          <span class="vr-chip" :class="exposureTone">
            <component :is="exposureIcon" :size="12" /> {{ exposureLabel }}
          </span>
        </div>
        <p class="vr-sub">
          <b>{{ counts.RELEASED || 0 }}</b> advance{{ (counts.RELEASED || 0) === 1 ? '' : 's' }} outstanding with travellers ·
          <b>{{ fmtCompactINR(recovered) }}</b> recovered · <b>{{ recoveryRate }}%</b> clawback on closure
        </p>

        <!-- stacked capital ladder -->
        <div class="vr-bar" :class="{ lit: drawn }">
          <span v-for="seg in segments" :key="seg.key" class="vr-seg" :class="seg.key.toLowerCase()"
            :style="{ width: drawn ? Math.max(seg.val > 0 ? 2 : 0, seg.pct) + '%' : '0%' }"
            :title="`${seg.label}: ${fmtINR(seg.val)}`" />
          <span v-if="pool <= 0" class="vr-bar-empty">No capital committed</span>
        </div>
        <div class="vr-legend">
          <button v-for="seg in segments" :key="seg.key" class="lg" :class="{ on: activeFilter === seg.filter }"
            :style="{ '--c': seg.dot }" @click="$emit('pick', activeFilter === seg.filter ? '' : seg.filter)">
            <i class="lg-dot" /><span class="lg-lab">{{ seg.label }}</span>
            <b class="trv-mono">{{ fmtCompactINR(seg.val) }}</b>
          </button>
        </div>

        <!-- readout tiles -->
        <div class="vr-tiles">
          <div v-for="t in tiles" :key="t.key" class="vt" :style="{ '--c': t.hex }">
            <span class="vt-ic"><component :is="t.icon" :size="14" /></span>
            <div class="vt-c">
              <span class="vt-val trv-mono"><TrvCountUp :value="t.value" :format="fmtCompactINR" /></span>
              <span class="vt-lab">{{ t.label }} <em v-if="t.count != null">· {{ t.count }}</em></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Motion } from 'motion-v'
import { Vault, HandCoins, Droplets, Send, Wallet, BadgeCheck, RotateCcw, TrendingUp, ShieldCheck, Lock } from 'lucide-vue-next'
import TrvCountUp from './TrvCountUp.vue'
import { fmtINR, fmtCompactINR, advanceEffective } from '@/composables/useTravel'
import { useInView, prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  items: { type: Array, default: () => [] },
  activeFilter: { type: String, default: '' },   // parent status filter — lights the legend
})
defineEmits(['pick'])

const rootEl = ref(null)
const drawn = ref(false)
const { visible } = useInView(rootEl, { threshold: 0.2 })
watch(visible, (v) => { if (v) requestAnimationFrame(() => requestAnimationFrame(() => { drawn.value = true })) })
onMounted(() => { if (prefersReduced()) drawn.value = true })

// ── money buckets by lifecycle ────────────────────────────────────────────
const sumWhere = (statuses, field = null) => props.items
  .filter(a => statuses.includes(a.status))
  .reduce((acc, a) => acc + (field ? Number(a[field] || 0) : advanceEffective(a)), 0)

const requested = computed(() => sumWhere(['REQUESTED']))
const approved = computed(() => sumWhere(['APPROVED']))
const released = computed(() => sumWhere(['RELEASED']))
const closed = computed(() => sumWhere(['SETTLED', 'RECOVERED']))
const recovered = computed(() => sumWhere(['RECOVERED'], 'recovered_amount'))
const pending = computed(() => requested.value + approved.value)
const pool = computed(() => requested.value + approved.value + released.value + closed.value)

const counts = computed(() => {
  const c = {}
  for (const a of props.items) c[a.status] = (c[a.status] || 0) + 1
  return c
})
const closedCount = computed(() => (counts.value.SETTLED || 0) + (counts.value.RECOVERED || 0))
const recoveryRate = computed(() => closedCount.value ? Math.round(((counts.value.RECOVERED || 0) / closedCount.value) * 100) : 0)

// ── standpipe geometry (% of column height) ───────────────────────────────
const pct = (v) => pool.value > 0 ? Math.max(0, Math.min(100, (v / pool.value) * 100)) : 0
const liquidPct = computed(() => pct(released.value + closed.value))
const pendingPct = computed(() => pct(pending.value))
// shares WITHIN the liquid band
const releasedShare = computed(() => {
  const liq = released.value + closed.value
  return liq > 0 ? (released.value / liq) * 100 : 0
})
const closedShare = computed(() => {
  const liq = released.value + closed.value
  return liq > 0 ? (closed.value / liq) * 100 : 0
})
// actual height of the closed band as a % of the whole glass — gates the in-band label
const closedFillPct = computed(() => liquidPct.value * closedShare.value / 100)

// ── exposure verdict chip ─────────────────────────────────────────────────
const exposureTone = computed(() => {
  if (released.value <= 0) return 'calm'
  if (recoveryRate.value > 0) return 'watch'
  return 'live'
})
const exposureLabel = computed(() =>
  released.value <= 0 ? 'No live exposure'
    : `${counts.value.RELEASED || 0} in field`)
const exposureIcon = computed(() => released.value <= 0 ? ShieldCheck : TrendingUp)

// ── stacked capital ladder ────────────────────────────────────────────────
const segments = computed(() => ([
  { key: 'REQUESTED', label: 'Requested', val: requested.value, dot: '#fcd34d', filter: 'REQUESTED' },
  { key: 'APPROVED', label: 'Approved', val: approved.value, dot: '#fbbf24', filter: 'APPROVED' },
  { key: 'RELEASED', label: 'Released', val: released.value, dot: '#fb923c', filter: 'RELEASED' },
  { key: 'CLOSED', label: 'Closed', val: closed.value, dot: '#34d399', filter: 'CLOSED' },
].map(s => ({ ...s, pct: pct(s.val) }))))

const tiles = computed(() => ([
  { key: 'awaiting', label: 'Awaiting', value: pending.value, count: (counts.value.REQUESTED || 0) + (counts.value.APPROVED || 0), icon: Send, hex: '#fbbf24' },
  { key: 'field', label: 'In field', value: released.value, count: counts.value.RELEASED || 0, icon: Wallet, hex: '#fb923c' },
  { key: 'recovered', label: 'Recovered', value: recovered.value, count: counts.value.RECOVERED || 0, icon: RotateCcw, hex: '#c084fc' },
  { key: 'closed', label: 'Closed', value: closed.value, count: closedCount.value, icon: BadgeCheck, hex: '#34d399' },
]))

// deterministic bubble choreography (no Math.random — keeps SSR/resume stable)
const bubbleStyle = (i) => {
  const left = 14 + ((i * 67) % 70)
  const delay = (i * 0.9) % 4
  const dur = 3.4 + ((i * 1.3) % 2.6)
  const size = 3 + (i % 3)
  return { left: left + '%', width: size + 'px', height: size + 'px', animationDelay: delay + 's', animationDuration: dur + 's' }
}
</script>

<style scoped>
.vault {
  position: relative; overflow: hidden; border-radius: 22px; margin-bottom: 16px;
  padding: 22px 24px;
  background: var(--trv-surface-elevated); border: 1px solid var(--trv-border);
  box-shadow: var(--trv-shadow);
}
.vault-aura { position: absolute; inset: -40% 30% 30% -10%; pointer-events: none;
  background: radial-gradient(58% 78% at 18% 6%, rgba(251,146,60,0.16), transparent 70%);
  animation: trv-aura-drift 11s ease-in-out infinite; }
.vault-floor { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(rgba(251,191,36,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(251,191,36,0.05) 1px, transparent 1px);
  background-size: 40px 40px; mask-image: radial-gradient(80% 80% at 70% 30%, #000, transparent 75%); }

.vault-inner { position: relative; display: grid; grid-template-columns: 132px 1fr; gap: 26px; align-items: stretch; }

/* ── standpipe ───────────────────────────────────────────────────────────── */
.standpipe { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.sp-glass {
  position: relative; width: 86px; flex: 1; min-height: 196px;
  border-radius: 16px 16px 13px 13px;
  background: linear-gradient(100deg, rgba(0,0,0,0.42), rgba(255,255,255,0.03) 45%, rgba(0,0,0,0.42));
  border: 1px solid var(--trv-border-strong);
  box-shadow: inset 0 2px 10px rgba(0,0,0,0.5), inset 0 -2px 8px rgba(0,0,0,0.4);
  overflow: hidden;
}
.sp-glass::after {   /* vertical glass highlight */
  content: ""; position: absolute; top: 6px; bottom: 6px; left: 14px; width: 9px; border-radius: 999px;
  background: linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.02)); filter: blur(1px); pointer-events: none;
}
.sp-tick { position: absolute; left: 0; width: 7px; height: 1px; background: var(--trv-border-strong); }
.sp-tick::after { content: ""; position: absolute; right: 0; top: 0; width: 4px; height: 1px; }

.sp-pending {
  position: absolute; left: 0; right: 0; top: 0; z-index: 1;
  border-bottom: 1px dashed var(--trv-amber-border);
  background: repeating-linear-gradient(135deg, rgba(251,191,36,0.07) 0 6px, transparent 6px 12px);
  transition: height 1.1s var(--trv-spring);
}
.sp-pending-tag { position: absolute; bottom: 4px; left: 0; right: 0; text-align: center;
  font-size: 8px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--trv-amber); opacity: 0.7; }

.sp-liquid {
  position: absolute; left: 0; right: 0; bottom: 0; z-index: 2;
  display: flex; flex-direction: column;   /* released (glowing surface) on top, closed settled at the base */
  transition: height 1.25s var(--trv-spring);
}
.sp-closed { position: relative; width: 100%; overflow: hidden;
  background: linear-gradient(180deg, rgba(52,211,153,0.5), rgba(16,185,129,0.34));
  box-shadow: inset 0 1px 6px rgba(52,211,153,0.4); transition: height 1.1s var(--trv-spring) 0.15s; }
/* stacked-bullion texture — reads as stored / vaulted capital */
.sp-closed::before { content: ""; position: absolute; inset: 0; pointer-events: none; opacity: 0.55;
  background: repeating-linear-gradient(180deg, rgba(255,255,255,0.1) 0 1px, transparent 1px 9px); }
/* settled surface line */
.sp-closed::after { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent, rgba(212,255,236,0.85) 50%, transparent); }
.sp-closed-tag { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 1;
  display: inline-flex; align-items: center; gap: 3px; white-space: nowrap;
  font-size: 8.5px; font-weight: 800; letter-spacing: 0.03em; color: #05281d;
  background: rgba(222,255,240,0.88); padding: 2px 8px; border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.25); }
.sp-released {
  position: relative; width: 100%; overflow: hidden;
  background: linear-gradient(180deg, rgba(251,146,60,0.85), rgba(245,158,11,0.55));
  box-shadow: inset 0 0 18px rgba(251,191,36,0.45); transition: height 1.1s var(--trv-spring) 0.05s;
}
.sp-caustic { position: absolute; inset: 0; opacity: 0.5;
  background: radial-gradient(60% 40% at 30% 20%, rgba(255,255,255,0.4), transparent 60%),
    radial-gradient(50% 30% at 75% 60%, rgba(255,237,180,0.35), transparent 60%);
  background-size: 160% 160%; animation: vault-caustic 7s ease-in-out infinite; }
.sp-bubble { position: absolute; bottom: -6px; border-radius: 50%; background: rgba(255,247,220,0.85);
  box-shadow: 0 0 4px rgba(255,237,180,0.8); animation: vault-bubble linear infinite; }
.sp-meniscus { position: absolute; top: -2px; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, transparent, rgba(255,237,180,0.95) 50%, transparent);
  box-shadow: 0 0 10px rgba(251,191,36,0.9); animation: vault-shimmer 3.5s ease-in-out infinite; }

.sp-floatline { position: absolute; left: 0; right: -4px; z-index: 4; display: flex; align-items: center; gap: 5px;
  transform: translateY(50%); transition: bottom 1.25s var(--trv-spring); pointer-events: none; }
.fl-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--trv-amber-bright); box-shadow: 0 0 8px var(--trv-amber); animation: trv-blip 2.4s ease-in-out infinite; flex-shrink: 0; }
.fl-tag { font-size: 8px; font-weight: 700; letter-spacing: 0.06em; color: var(--trv-amber-bright); white-space: nowrap;
  padding: 2px 6px; border-radius: 6px; background: var(--trv-flap); border: 1px solid var(--trv-amber-border); }
.fl-tag b { font-size: 9px; }

.sp-drain { position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%); z-index: 5;
  display: inline-flex; color: var(--trv-text-dim); opacity: 0.5; }
.sp-drain.active { color: #c084fc; opacity: 1; animation: vault-drain 2.6s ease-in-out infinite; }

.sp-glass.empty { background: repeating-linear-gradient(135deg, rgba(255,255,255,0.02) 0 8px, transparent 8px 16px); }
.sp-label { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--trv-text-dim); }

/* ── readout ─────────────────────────────────────────────────────────────── */
.vault-read { display: flex; flex-direction: column; gap: 11px; min-width: 0; }
.vr-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.13em; text-transform: uppercase; color: var(--trv-ember); }
.vr-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.vr-big { font-size: clamp(28px, 4vw, 40px); font-weight: 860; line-height: 1; letter-spacing: -0.01em;
  background: var(--trv-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.vr-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; }
.vr-chip.live { color: var(--trv-ember); background: rgba(251,146,60,0.13); border: 1px solid rgba(251,146,60,0.32); }
.vr-chip.watch { color: #c084fc; background: rgba(192,132,252,0.12); border: 1px solid rgba(192,132,252,0.3); }
.vr-chip.calm { color: var(--trv-st-approved); background: var(--trv-st-approved-soft); border: 1px solid color-mix(in srgb, var(--trv-st-approved) 30%, transparent); }
.vr-sub { margin: -2px 0 2px; font-size: 12px; color: var(--trv-text-muted); }
.vr-sub b { color: var(--trv-text-secondary); }

.vr-bar { position: relative; display: flex; gap: 3px; height: 14px; border-radius: 8px; padding: 0; overflow: hidden;
  background: var(--trv-panel); border: 1px solid var(--trv-border); }
.vr-seg { height: 100%; border-radius: 5px; transition: width 1s var(--trv-spring); min-width: 0; }
.vr-seg.requested { background: linear-gradient(90deg, #fcd34d, #fbbf24); }
.vr-seg.approved { background: linear-gradient(90deg, #fbbf24, #f59e0b); }
.vr-seg.released { background: linear-gradient(90deg, #fb923c, #ea580c); box-shadow: 0 0 12px rgba(251,146,60,0.5); }
.vr-seg.closed { background: linear-gradient(90deg, #34d399, #60d394); }
.vr-bar-empty { position: absolute; inset: 0; display: grid; place-items: center; font-size: 9.5px; font-weight: 600; color: var(--trv-text-dim); }

.vr-legend { display: flex; flex-wrap: wrap; gap: 6px; }
.lg { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; cursor: pointer;
  font-size: 11px; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); transition: all 0.2s; }
.lg-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
.lg b { color: var(--trv-text); }
.lg:hover, .lg.on { border-color: color-mix(in srgb, var(--c) 50%, transparent); background: color-mix(in srgb, var(--c) 11%, transparent); color: var(--trv-text); }

.vr-tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 2px; }
.vt { display: flex; align-items: center; gap: 9px; padding: 9px 11px; border-radius: 12px; background: var(--trv-panel); border: 1px solid var(--trv-border); border-left: 3px solid var(--c); }
.vt-ic { display: inline-flex; padding: 6px; border-radius: 9px; color: var(--c); background: color-mix(in srgb, var(--c) 12%, transparent); }
.vt-c { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.vt-val { font-size: 15px; font-weight: 800; color: var(--trv-text); }
.vt-lab { font-size: 10px; color: var(--trv-text-muted); white-space: nowrap; }
.vt-lab em { font-style: normal; color: var(--trv-text-dim); }

/* ── keyframes ───────────────────────────────────────────────────────────── */
@keyframes vault-bubble {
  0% { transform: translateY(0) scale(0.7); opacity: 0; }
  18% { opacity: 0.9; }
  100% { transform: translateY(-120px) scale(1); opacity: 0; }
}
@keyframes vault-caustic { 0%, 100% { background-position: 0% 0%; } 50% { background-position: 100% 100%; } }
@keyframes vault-shimmer { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
@keyframes vault-drain { 0%, 100% { transform: translate(-50%, 0); opacity: 0.7; } 50% { transform: translate(-50%, 3px); opacity: 1; } }

/* ── light theme ─────────────────────────────────────────────────────────── */
[data-theme="light"] .sp-glass { background: linear-gradient(100deg, rgba(120,90,30,0.1), rgba(255,255,255,0.5) 45%, rgba(120,90,30,0.1)); }
[data-theme="light"] .fl-tag { background: #2a2620; }
[data-theme="light"] .vr-sub b { color: var(--trv-text); }

@media (max-width: 720px) {
  .vault-inner { grid-template-columns: 1fr; gap: 18px; }
  .standpipe { flex-direction: row; align-items: stretch; gap: 12px; }
  .sp-glass { width: 100%; min-height: 120px; }
  .vr-tiles { grid-template-columns: repeat(2, 1fr); }
}
@media (prefers-reduced-motion: reduce) {
  .vault-aura, .sp-caustic, .sp-bubble, .sp-meniscus, .sp-drain.active, .fl-dot { animation: none; }
  .sp-liquid, .sp-released, .sp-closed, .sp-pending, .sp-floatline, .vr-seg { transition: none; }
}
</style>
