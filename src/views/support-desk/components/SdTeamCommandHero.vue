<template>
  <Motion as="section" class="tch" :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
    <!-- ── full-bleed signature stage (the Team Command instrument IS the backdrop) ── -->
    <div class="tch-bleed">
      <slot name="instrument">
        <div class="tch-stage-idle" aria-hidden="true">
          <span class="tch-idle-ring r1" /><span class="tch-idle-ring r2" /><span class="tch-idle-ring r3" />
          <Landmark :size="42" class="tch-idle-core" />
        </div>
      </slot>
    </div>
    <div class="tch-grain" aria-hidden="true" />
    <div class="tch-scrim" aria-hidden="true" />

    <!-- ── glass console over the calm left air ── -->
    <div class="tch-console">
      <div class="tch-eyebrow">
        <span class="tch-live" :class="{ hot: (stats.breached || 0) > 0 }" aria-hidden="true" />
        SUPPORT · TEAM COMMAND
      </div>

      <template v-if="!onboarding">
        <h2 class="tch-title">Every crew. <em>One command.</em></h2>
        <p class="tch-sub">
          The whole support fleet on one deck — every team's load, coverage, breaches and
          cadence. Raise crews, seat agents, rebalance work, and catch a stranded desk
          before it strands a customer.
        </p>
      </template>
      <template v-else>
        <h2 class="tch-title">No crews yet. <em>Raise the first.</em></h2>
        <p class="tch-sub">
          A support team is a sealed desk: its own queue, roster, routing rules, business
          hours and SLA. Build one and every matching ticket starts flowing to it.
        </p>
        <div class="tch-primer" aria-hidden="true">
          <span class="tch-step"><i>1</i> Identity</span><span class="tch-arrow">→</span>
          <span class="tch-step"><i>2</i> Scope</span><span class="tch-arrow">→</span>
          <span class="tch-step"><i>3</i> Crew</span><span class="tch-arrow">→</span>
          <span class="tch-step"><i>4</i> Service</span>
        </div>
      </template>

      <div class="tch-ctas">
        <Motion as="button" class="tch-btn primary" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
          title="Create a support team — identity, routing scope, crew, service profile" @click="$emit('new-team')">
          <Plus :size="15" /> New team
        </Motion>
        <Motion v-if="!onboarding" as="button" class="tch-btn icon ghost" title="Refresh the fleet"
          :while-hover="{ y: -2 }" :while-tap="{ scale: 0.95 }" @click="$emit('refresh')">
          <RefreshCw :size="14" :class="{ 'tch-spin': loading }" />
        </Motion>
      </div>

      <!-- mission readouts -->
      <div v-if="!onboarding" class="tch-readouts sd-mono">
        <span class="tch-ro"><i>TEAMS</i><b>{{ stats.teams ?? teamsCount ?? 0 }}</b></span>
        <span class="tch-ro"><i>AGENTS ON DECK</i><b>{{ stats.agents_on_deck ?? 0 }}</b></span>
        <span class="tch-ro"><i>FLEET MTTR P50 · 7D</i><b>{{ fmtMin(stats.mttr_p50_7d) }}</b></span>
        <span class="tch-ro sync"><i>CSAT · 7D</i><b>{{ stats.csat_7d != null ? stats.csat_7d.toFixed(1) : '—' }}</b></span>
      </div>
    </div>

    <!-- ── telemetry lenses docked along the deck bed ── -->
    <div v-if="!onboarding" class="tch-lensdock" role="tablist" aria-label="Fleet lenses">
      <Motion v-for="(l, i) in lenses" :key="l.key" as="button" class="tch-lens"
        :class="{ on: activeLens === l.key }" :style="{ '--lc': l.color }"
        role="tab" :aria-selected="activeLens === l.key" :title="l.hint"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.18 + i * 0.045, ease: [0.16, 1, 0.3, 1] }"
        :while-hover="{ y: -3 }" :while-tap="{ scale: 0.97 }"
        @click="$emit('pick', l)">
        <span class="tl-ic"><component :is="l.icon" :size="14" /></span>
        <span class="tl-body">
          <span class="tl-val"><SdCountUp v-if="typeof l.value === 'number'" :value="l.value" /><template v-else>{{ l.value }}</template></span>
          <span class="tl-lb">{{ l.label }}</span>
        </span>
        <span class="tl-bar" aria-hidden="true" />
      </Motion>
    </div>
  </Motion>
</template>

<script setup>
/* SdTeamCommandHero — the admin oversight banner (full-bleed instrument backdrop, glass
   console, fleet lens dock). Accent = --sd-team-* (same desk family as the agent Squad
   Command — the two panels are siblings; the INSTRUMENT differentiates them). Swaps to
   an onboarding voice when the fleet is empty. */
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Landmark, Plus, RefreshCw } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  lenses: { type: Array, default: () => [] },
  activeLens: { type: String, default: 'fleet' },
  stats: { type: Object, default: () => ({}) },       // /teams/overview `totals` rollup
  loading: { type: Boolean, default: false },
  teamsCount: { type: Number, default: 0 },
})
defineEmits(['pick', 'new-team', 'refresh'])

const onboarding = computed(() => !props.loading && props.teamsCount === 0)
const fmtMin = (m) => {
  if (m == null) return '—'
  if (m < 60) return `${Math.round(m)}m`
  if (m < 1440) return `${(m / 60).toFixed(1)}h`
  return `${(m / 1440).toFixed(1)}d`
}
</script>

<style scoped>
.tch { position: relative; overflow: hidden; isolation: isolate; border: 1px solid var(--sd-team-brd); border-radius: 22px;
  background: var(--sd-team-stage); min-height: clamp(470px, 43vw, 570px);
  display: flex; flex-direction: column; justify-content: flex-end; }

.tch-bleed { position: absolute; inset: 0; z-index: 0; }
.tch-grain { position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: 0.45; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E"); }
/* console-legibility scrim: calm left air + docked-lens footing */
.tch-scrim { position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background:
    linear-gradient(90deg, rgba(9, 7, 3, 0.62) 0%, rgba(9, 7, 3, 0.34) 34%, transparent 58%),
    linear-gradient(0deg, rgba(9, 7, 3, 0.66) 0%, transparent 26%); }
[data-theme="light"] .tch-scrim {
  background:
    linear-gradient(90deg, rgba(46, 34, 12, 0.52) 0%, rgba(46, 34, 12, 0.26) 34%, transparent 58%),
    linear-gradient(0deg, rgba(46, 34, 12, 0.56) 0%, transparent 26%); }

/* idle stage (until the signature instrument mounts) */
.tch-stage-idle { position: absolute; inset: 0; display: grid; place-items: center; }
.tch-idle-core { color: var(--sd-team-deep); opacity: 0.5; }
.tch-idle-ring { position: absolute; width: 130px; height: 130px; border-radius: 50%; border: 1px solid var(--sd-team-brd); animation: tch-ring 3.6s ease-out infinite; }
.tch-idle-ring.r2 { animation-delay: 1.2s; }
.tch-idle-ring.r3 { animation-delay: 2.4s; }
@keyframes tch-ring { 0% { transform: scale(0.55); opacity: 0.8; } 100% { transform: scale(2.6); opacity: 0; } }

/* ── glass console ── */
.tch-console { position: absolute; z-index: 2; left: 22px; top: 22px; width: min(468px, calc(100% - 44px));
  padding: 20px 22px; border-radius: 18px; border: 1px solid var(--sd-border-strong);
  background: rgba(10, 8, 3, 0.56); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
/* the console sits on the scrimmed stage in BOTH themes — its ink stays light */
.tch-console, [data-theme="light"] .tch-console { color: #f6efe3; }
[data-theme="light"] .tch-console { background: rgba(44, 33, 12, 0.5); }

.tch-eyebrow { display: inline-flex; align-items: center; gap: 9px; font-size: 10.5px; font-weight: 800;
  letter-spacing: 0.22em; color: var(--sd-team-hi); font-family: var(--sd-mono); }
[data-theme="light"] .tch-eyebrow { color: #ffd98a; }
.tch-live { width: 8px; height: 8px; border-radius: 50%; background: var(--sd-team-sync); }
.tch-live.hot { background: var(--sd-team-strain); animation: tch-live-pulse 1.4s ease-out infinite; }
@keyframes tch-live-pulse { 0% { box-shadow: 0 0 0 0 rgba(251, 113, 133, 0.45); } 70% { box-shadow: 0 0 0 9px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
/* !important defeats theme-light-rescue's page h2 catch-all — this console keeps light ink */
.tch-title { margin: 11px 0 7px; font-size: clamp(26px, 3vw, 38px); line-height: 1.04; font-weight: 800;
  letter-spacing: -0.02em; color: #f8f1e4 !important; }
.tch-title em { font-style: normal; background: linear-gradient(122deg, #ffd98a 0%, #e8b04b 48%, #34d399 130%); -webkit-background-clip: text; background-clip: text; color: transparent; }
.tch-sub { margin: 0 0 14px; font-size: 13px; line-height: 1.55; color: rgba(246, 239, 227, 0.78); }

/* onboarding primer chips */
.tch-primer { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; margin: 0 0 14px; }
.tch-step { display: inline-flex; align-items: center; gap: 7px; padding: 6px 11px; border-radius: 999px;
  font-size: 11px; font-weight: 700; color: rgba(246, 239, 227, 0.85);
  border: 1px solid rgba(246, 239, 227, 0.18); background: rgba(246, 239, 227, 0.06); }
.tch-step i { font-style: normal; width: 16px; height: 16px; display: grid; place-items: center; border-radius: 50%;
  font-size: 9.5px; font-weight: 800; color: #1c1204; background: var(--sd-team-grad); }
.tch-arrow { color: rgba(246, 239, 227, 0.4); font-size: 12px; }

.tch-ctas { display: flex; flex-wrap: wrap; align-items: center; gap: 9px; }
.tch-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 15px; border-radius: 12px;
  font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid rgba(246, 239, 227, 0.2); background: rgba(246, 239, 227, 0.06); color: #f6efe3; }
.tch-btn.primary { border: none; background: var(--sd-team-grad); color: #1c1204; box-shadow: var(--sd-team-glow); }
.tch-btn.icon { padding: 10px 11px; }
.tch-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.tch-spin { animation: tch-rot 1s linear infinite; }
@keyframes tch-rot { to { transform: rotate(360deg); } }

.tch-readouts { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 16px; }
.tch-ro { display: flex; flex-direction: column; gap: 2px; }
.tch-ro i { font-style: normal; font-size: 9px; font-weight: 800; letter-spacing: 0.16em; color: rgba(246, 239, 227, 0.5); }
.tch-ro b { font-size: 15px; font-weight: 800; color: #ffd98a; }
.tch-ro.sync b { color: var(--sd-team-sync); }

/* ── lens dock ── */
.tch-lensdock { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
  gap: 8px; padding: 14px 16px 16px; }
.tch-lens { position: relative; display: flex; align-items: center; gap: 9px; padding: 10px 12px; border-radius: 13px;
  text-align: left; cursor: pointer; font-family: inherit; overflow: hidden;
  border: 1px solid rgba(246, 239, 227, 0.14); background: rgba(9, 7, 3, 0.5);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); color: #f6efe3; transition: border-color 0.2s; }
[data-theme="light"] .tch-lens { background: rgba(44, 33, 12, 0.44); }
.tch-lens:hover { border-color: color-mix(in srgb, var(--lc, var(--sd-team-core)) 55%, transparent); }
.tch-lens.on { border-color: var(--lc, var(--sd-team-core)); box-shadow: 0 0 0 1px var(--lc, var(--sd-team-core)), 0 0 22px color-mix(in srgb, var(--lc, var(--sd-team-core)) 25%, transparent); }
.tl-ic { width: 28px; height: 28px; flex: 0 0 28px; display: grid; place-items: center; border-radius: 9px;
  color: var(--lc, var(--sd-team-core)); background: color-mix(in srgb, var(--lc, var(--sd-team-core)) 14%, transparent); }
.tl-body { display: flex; flex-direction: column; min-width: 0; }
.tl-val { font-size: 16.5px; font-weight: 800; line-height: 1.1; font-variant-numeric: tabular-nums; }
.tl-lb { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(246, 239, 227, 0.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tl-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--lc, var(--sd-team-core)); opacity: 0; transition: opacity 0.2s; }
.tch-lens.on .tl-bar { opacity: 1; }

@media (max-width: 860px) {
  .tch-console { position: relative; left: 0; top: 0; margin: 16px; width: auto; }
  .tch { min-height: 0; }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .tch-idle-ring,
  html:not([data-cinematic="on"]) .tch-live.hot,
  html:not([data-cinematic="on"]) .tch-spin { animation: none; }
}
</style>
