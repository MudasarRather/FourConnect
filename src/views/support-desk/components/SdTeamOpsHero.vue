<template>
  <Motion as="section" class="toh" :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
    <!-- ── full-bleed signature stage (the Squad Command instrument IS the backdrop) ── -->
    <div class="toh-bleed">
      <slot name="instrument">
        <div class="toh-stage-idle" aria-hidden="true">
          <span class="toh-idle-ring r1" /><span class="toh-idle-ring r2" />
          <UsersRound :size="42" class="toh-idle-core" />
        </div>
      </slot>
    </div>
    <div class="toh-grain" aria-hidden="true" />
    <div class="toh-scrim" aria-hidden="true" />

    <!-- ── glass console over the calm left air ── -->
    <div class="toh-console">
      <div class="toh-eyebrow">
        <span class="toh-live" :class="{ hot: (stats.breached_active || 0) > 0 }" aria-hidden="true" />
        TEAM OPS · SQUAD COMMAND
      </div>
      <h2 class="toh-title">One queue. <em>One crew.</em></h2>
      <p class="toh-sub">
        Every ticket routed to your team, every teammate's load, live on one deck.
        Take the next most-urgent, hand off with a reason, keep the cadence.
      </p>

      <div class="toh-ctas">
        <Motion as="button" class="toh-btn primary" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
          :disabled="taking || loading" title="Claim the single most urgent unowned ticket in this queue (breached first, then soonest due)"
          @click="$emit('take-next')">
          <Zap :size="15" /> {{ taking ? 'Claiming…' : 'Take next' }}
        </Motion>
        <Motion v-if="stats.can_distribute" as="button" class="toh-btn sync" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
          :disabled="distributing || !(stats.unassigned > 0)"
          :title="stats.team_id ? `Spread the ${stats.unassigned || 0} unowned ticket(s) across the crew (${stats.assignment_method === 'load_balanced' ? 'load-balanced' : 'round-robin'})` : 'Pick a single team chip first — distribution runs per team'"
          @click="$emit('distribute')">
          <Shuffle :size="15" /> {{ distributing ? 'Distributing…' : `Distribute${stats.unassigned ? ' · ' + stats.unassigned : ''}` }}
        </Motion>
        <Motion as="button" class="toh-btn ghost" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }"
          title="Raise a ticket" @click="$emit('new-ticket')">
          <Plus :size="15" /> New ticket
        </Motion>
        <Motion as="button" class="toh-btn icon ghost" title="Refresh" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.95 }" @click="$emit('refresh')">
          <RefreshCw :size="14" :class="{ 'toh-spin': loading }" />
        </Motion>
      </div>

      <!-- mission readouts -->
      <div class="toh-readouts sd-mono">
        <span class="toh-ro"><i>MTTR P50 · 7D</i><b>{{ fmtMin(stats.mttr_p50_7d) }}</b></span>
        <span class="toh-ro"><i>1st REPLY P50</i><b>{{ fmtMin(stats.frt_p50_7d) }}</b></span>
        <span class="toh-ro"><i>SHIPPED TODAY</i><b>{{ stats.resolved_today ?? 0 }}</b></span>
        <span v-if="teamLine" class="toh-ro teams"><i>CREW</i><b>{{ teamLine }}</b></span>
      </div>
    </div>

    <!-- ── telemetry lenses docked along the deck bed ── -->
    <div class="toh-lensdock" role="tablist" aria-label="Team queue lenses">
      <Motion v-for="(l, i) in lenses" :key="l.key" as="button" class="toh-lens"
        :class="{ on: activeLens === l.key, stat: l.stat }" :style="{ '--lc': l.color }"
        role="tab" :aria-selected="activeLens === l.key"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.18 + i * 0.045, ease: [0.16, 1, 0.3, 1] }"
        :while-hover="l.stat ? undefined : { y: -3 }" :while-tap="l.stat ? undefined : { scale: 0.97 }"
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
/* SdTeamOpsHero — the Squad Command banner (full-bleed instrument backdrop, glass
   console over the calm left air, lens dock along the deck bed). Accent = --sd-team-*.
   Same layout contract as SdBreachedHero / SdClosedHero with the crew identity. */
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { UsersRound, Zap, Shuffle, Plus, RefreshCw } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  lenses: { type: Array, default: () => [] },
  activeLens: { type: String, default: 'all' },
  stats: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
  taking: { type: Boolean, default: false },
  distributing: { type: Boolean, default: false },
})
defineEmits(['pick', 'take-next', 'distribute', 'new-ticket', 'refresh'])

const fmtMin = (m) => {
  if (m == null) return '—'
  if (m < 60) return `${Math.round(m)}m`
  if (m < 1440) return `${(m / 60).toFixed(1)}h`
  return `${(m / 1440).toFixed(1)}d`
}
const teamLine = computed(() => {
  if (props.stats.team_name) return props.stats.team_name
  const names = props.stats.team_names || []
  if (!names.length) return ''
  return names.length <= 2 ? names.join(' · ') : `${names.length} teams`
})
</script>

<style scoped>
.toh { position: relative; overflow: hidden; isolation: isolate; border: 1px solid var(--sd-team-brd); border-radius: 22px;
  background: var(--sd-team-stage); min-height: clamp(470px, 43vw, 570px);
  display: flex; flex-direction: column; justify-content: flex-end; }

.toh-bleed { position: absolute; inset: 0; z-index: 0; }
.toh-grain { position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: 0.45; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E"); }
/* console-legibility scrim: calm left air + docked-lens footing */
.toh-scrim { position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background:
    linear-gradient(90deg, rgba(9, 7, 3, 0.62) 0%, rgba(9, 7, 3, 0.34) 34%, transparent 58%),
    linear-gradient(0deg, rgba(9, 7, 3, 0.66) 0%, transparent 26%); }
[data-theme="light"] .toh-scrim {
  background:
    linear-gradient(90deg, rgba(46, 34, 12, 0.52) 0%, rgba(46, 34, 12, 0.26) 34%, transparent 58%),
    linear-gradient(0deg, rgba(46, 34, 12, 0.56) 0%, transparent 26%); }

/* idle stage (only until the signature instrument mounts) */
.toh-stage-idle { position: absolute; inset: 0; display: grid; place-items: center; }
.toh-idle-core { color: var(--sd-team-deep); opacity: 0.5; }
.toh-idle-ring { position: absolute; width: 120px; height: 120px; border-radius: 50%; border: 1px solid var(--sd-team-brd); animation: toh-ring 3.2s ease-out infinite; }
.toh-idle-ring.r2 { animation-delay: 1.6s; }
@keyframes toh-ring { 0% { transform: scale(0.6); opacity: 0.8; } 100% { transform: scale(2.4); opacity: 0; } }

/* ── glass console ── */
.toh-console { position: absolute; z-index: 2; left: 22px; top: 22px; width: min(452px, calc(100% - 44px));
  padding: 20px 22px; border-radius: 18px; border: 1px solid var(--sd-border-strong);
  background: rgba(10, 8, 3, 0.56); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
/* the console sits on the scrimmed stage in BOTH themes — its ink stays light */
.toh-console, [data-theme="light"] .toh-console { color: #f6efe3; }
[data-theme="light"] .toh-console { background: rgba(44, 33, 12, 0.5); }

.toh-eyebrow { display: inline-flex; align-items: center; gap: 9px; font-size: 10.5px; font-weight: 800;
  letter-spacing: 0.22em; color: var(--sd-team-hi); font-family: var(--sd-mono); }
[data-theme="light"] .toh-eyebrow { color: #ffd98a; }
.toh-live { width: 8px; height: 8px; border-radius: 50%; background: var(--sd-team-sync); }
.toh-live.hot { background: var(--sd-team-strain); animation: toh-live-pulse 1.4s ease-out infinite; }
@keyframes toh-live-pulse { 0% { box-shadow: 0 0 0 0 rgba(251, 113, 133, 0.45); } 70% { box-shadow: 0 0 0 9px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
/* !important defeats theme-light-rescue's page h2 catch-all — this console keeps light ink */
.toh-title { margin: 11px 0 7px; font-size: clamp(26px, 3vw, 38px); line-height: 1.04; font-weight: 800;
  letter-spacing: -0.02em; color: #f8f1e4 !important; }
.toh-title em { font-style: normal; background: linear-gradient(122deg, #ffd98a 0%, #e8b04b 48%, #34d399 130%); -webkit-background-clip: text; background-clip: text; color: transparent; }
.toh-sub { margin: 0 0 14px; font-size: 13px; line-height: 1.55; color: rgba(246, 239, 227, 0.78); }

.toh-ctas { display: flex; flex-wrap: wrap; align-items: center; gap: 9px; }
.toh-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 15px; border-radius: 12px;
  font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid rgba(246, 239, 227, 0.2); background: rgba(246, 239, 227, 0.06); color: #f6efe3; }
.toh-btn.primary { border: none; background: var(--sd-team-grad); color: #1c1204; box-shadow: var(--sd-team-glow); }
.toh-btn.sync { border-color: color-mix(in srgb, var(--sd-team-sync) 55%, transparent); color: #b7f7dd;
  background: color-mix(in srgb, var(--sd-team-sync) 14%, transparent); }
.toh-btn.icon { padding: 10px 11px; }
.toh-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.toh-spin { animation: toh-rot 1s linear infinite; }
@keyframes toh-rot { to { transform: rotate(360deg); } }

.toh-readouts { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 16px; }
.toh-ro { display: flex; flex-direction: column; gap: 2px; }
.toh-ro i { font-style: normal; font-size: 9px; font-weight: 800; letter-spacing: 0.16em; color: rgba(246, 239, 227, 0.5); }
.toh-ro b { font-size: 15px; font-weight: 800; color: #ffd98a; }
.toh-ro.teams b { color: var(--sd-team-sync); }

/* ── lens dock ── */
.toh-lensdock { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
  gap: 8px; padding: 14px 16px 16px; }
.toh-lens { position: relative; display: flex; align-items: center; gap: 9px; padding: 10px 12px; border-radius: 13px;
  text-align: left; cursor: pointer; font-family: inherit; overflow: hidden;
  border: 1px solid rgba(246, 239, 227, 0.14); background: rgba(9, 7, 3, 0.5);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); color: #f6efe3; transition: border-color 0.2s; }
[data-theme="light"] .toh-lens { background: rgba(44, 33, 12, 0.44); }
.toh-lens:hover { border-color: color-mix(in srgb, var(--lc, var(--sd-team-core)) 55%, transparent); }
.toh-lens.on { border-color: var(--lc, var(--sd-team-core)); box-shadow: 0 0 0 1px var(--lc, var(--sd-team-core)), 0 0 22px color-mix(in srgb, var(--lc, var(--sd-team-core)) 25%, transparent); }
.toh-lens.stat { cursor: default; }
.tl-ic { width: 28px; height: 28px; flex: 0 0 28px; display: grid; place-items: center; border-radius: 9px;
  color: var(--lc, var(--sd-team-core)); background: color-mix(in srgb, var(--lc, var(--sd-team-core)) 14%, transparent); }
.tl-body { display: flex; flex-direction: column; min-width: 0; }
.tl-val { font-size: 16.5px; font-weight: 800; line-height: 1.1; font-variant-numeric: tabular-nums; }
.tl-lb { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(246, 239, 227, 0.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tl-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--lc, var(--sd-team-core)); opacity: 0; transition: opacity 0.2s; }
.toh-lens.on .tl-bar { opacity: 1; }

@media (max-width: 860px) {
  .toh-console { position: relative; left: 0; top: 0; margin: 16px; width: auto; }
  .toh { min-height: 0; }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .toh-idle-ring,
  html:not([data-cinematic="on"]) .toh-live.hot,
  html:not([data-cinematic="on"]) .toh-spin { animation: none; }
}
</style>
