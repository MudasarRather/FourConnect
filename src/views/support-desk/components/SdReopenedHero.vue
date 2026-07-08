<template>
  <Motion as="section" class="rph" :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
    <!-- ── full-bleed signature stage (the Möbius band IS the hero backdrop) ── -->
    <div class="rph-bleed">
      <slot name="instrument">
        <div class="rph-stage-idle" aria-hidden="true">
          <span class="rph-idle-loop l1" /><span class="rph-idle-loop l2" /><span class="rph-idle-loop l3" />
          <RotateCcw :size="42" class="rph-idle-core" />
        </div>
      </slot>
    </div>
    <div class="rph-grain" aria-hidden="true" />
    <div class="rph-scrim" aria-hidden="true" />

    <!-- ── glass console over the calm left air ── -->
    <div class="rph-console">
      <div class="rph-eyebrow">
        <span class="rph-live" :class="{ hot: (stats.re_breached || 0) > 0 }" aria-hidden="true" />
        REOPENED · RETURNS DESK
      </div>
      <h2 class="rph-title">Resolved once. <em>Back again.</em></h2>
      <p class="rph-sub">
        A Möbius band has one surface — cross RESOLVE and you're still on the same side.
        Every ticket here rode the loop back to the desk. Read the failed fix, break the
        loop, and walk it off for good.
      </p>

      <div class="rph-ctas">
        <Motion as="button" class="rph-btn primary" :class="{ on: guided }" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
          :disabled="loading" title="Step through the ranked loop-breaker queue — most cycles and hottest first" @click="$emit('run')">
          <Repeat2 :size="15" /> {{ guided ? 'Loop run · on' : 'Start loop run' }}
        </Motion>
        <Motion v-if="(stats.chronic_open || 0) > 0" as="button" class="rph-btn magenta"
          :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
          title="Jump to the chronic rail — tickets reopened 2+ times" @click="$emit('chronic')">
          <History :size="15" /> {{ stats.chronic_open }} chronic rider{{ stats.chronic_open === 1 ? '' : 's' }}
        </Motion>
        <Motion v-if="(stats.re_breached || 0) > 0" as="button" class="rph-btn ghost risk"
          :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }"
          title="Back on the desk AND missing the fresh re-resolution deadline again" @click="$emit('rebreach')">
          <ShieldAlert :size="15" /> {{ stats.re_breached }} re-breached
        </Motion>
        <Motion as="button" class="rph-btn icon ghost" title="Refresh" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.95 }" @click="$emit('refresh')">
          <RefreshCw :size="14" :class="{ 'rph-spin': loading }" />
        </Motion>
        <Motion as="button" class="rph-btn icon ghost" :class="{ on: advCount > 0 }" title="Filters"
          :while-hover="{ y: -2 }" :while-tap="{ scale: 0.95 }" @click="$emit('filters')">
          <SlidersHorizontal :size="14" /><span v-if="advCount" class="rph-fb">{{ advCount }}</span>
        </Motion>
      </div>

      <!-- loop readouts -->
      <div class="rph-readouts sd-mono">
        <span class="rph-ro"><i>REOPEN RATE · 30D</i><b>{{ stats.reopen_rate_30d != null ? stats.reopen_rate_30d + '%' : '—' }}</b></span>
        <span class="rph-ro"><i>AVG TIME-TO-REOPEN</i><b>{{ fmtMin(stats.avg_time_to_reopen_minutes) }}</b></span>
        <span class="rph-ro"><i>AVG CYCLE AGE</i><b>{{ fmtMin(stats.avg_cycle_age_minutes) }}</b></span>
        <span class="rph-ro ok"><i>RE-RESOLVED TODAY</i><b>{{ stats.re_resolved_today ?? 0 }}</b></span>
        <span v-if="(stats.worst || {}).ticket_number" class="rph-ro worst" :title="stats.worst.subject">
          <i>STUCK RIDER</i><b>{{ stats.worst.ticket_number }} · ×{{ stats.worst.reopened_count }}</b></span>
        <span v-if="teamLine" class="rph-ro teams"><i>SCOPE</i><b>{{ teamLine }}</b></span>
      </div>
    </div>

    <!-- ── telemetry lenses docked along the band's edge ── -->
    <div class="rph-lensdock" role="tablist" aria-label="Reopened lenses">
      <Motion v-for="(l, i) in lenses" :key="l.key" as="button" class="rph-lens"
        :class="{ on: activeLens === l.key, stat: l.stat }" :style="{ '--lc': l.color }"
        role="tab" :aria-selected="activeLens === l.key"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.18 + i * 0.045, ease: [0.16, 1, 0.3, 1] }"
        :while-hover="l.stat ? undefined : { y: -3 }" :while-tap="l.stat ? undefined : { scale: 0.97 }"
        @click="$emit('pick', l)">
        <span class="rl-ic"><component :is="l.icon" :size="14" /></span>
        <span class="rl-body">
          <span class="rl-val"><SdCountUp v-if="typeof l.value === 'number'" :value="l.value" /><template v-else>{{ l.value }}</template></span>
          <span class="rl-lb">{{ l.label }}</span>
        </span>
        <span class="rl-bar" aria-hidden="true" />
      </Motion>
    </div>
  </Motion>
</template>

<script setup>
/* SdReopenedHero — the Möbius Loop banner (full-bleed instrument backdrop, glass console
   over the calm left air, lens dock along the band's edge). Accent = --sd-rop-*.
   Same layout contract as SdOverdueHero / SdBreachedHero with the returns identity:
   emerald = the off-ramp (re-resolution), orchid-magenta = the pull of the loop,
   amber = the desk crossing. */
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { RotateCcw, Repeat2, History, RefreshCw, SlidersHorizontal, ShieldAlert } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  lenses: { type: Array, default: () => [] },
  activeLens: { type: String, default: 'all' },
  stats: { type: Object, default: () => ({}) },
  guided: { type: Boolean, default: false },
  advCount: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
  reduced: { type: Boolean, default: false },
})
defineEmits(['pick', 'run', 'chronic', 'rebreach', 'refresh', 'filters'])

const fmtMin = (m) => {
  if (m == null) return '—'
  if (m < 60) return `${Math.round(m)}m`
  if (m < 1440) return `${(m / 60).toFixed(1)}h`
  return `${(m / 1440).toFixed(1)}d`
}
const teamLine = computed(() => {
  const names = props.stats.team_names || []
  if (!names.length) return ''
  return names.length <= 2 ? names.join(' · ') : `${names.length} teams`
})
</script>

<style scoped>
.rph { position: relative; overflow: hidden; isolation: isolate; border: 1px solid var(--sd-rop-brd); border-radius: 22px;
  background: var(--sd-rop-deep-bg); min-height: clamp(470px, 43vw, 570px);
  display: flex; flex-direction: column; justify-content: flex-end; }
[data-theme="light"] .rph { background: #f7ecf2; }

.rph-bleed { position: absolute; inset: 0; z-index: 0; }
.rph-grain { position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: 0.45; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E"); }
/* console-legibility scrim: calm left air + docked-lens footing */
.rph-scrim { position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background:
    linear-gradient(90deg, rgba(10, 3, 8, 0.64) 0%, rgba(10, 3, 8, 0.36) 34%, transparent 58%),
    linear-gradient(0deg, rgba(10, 3, 8, 0.68) 0%, transparent 26%); }
[data-theme="light"] .rph-scrim {
  background:
    linear-gradient(90deg, rgba(10, 3, 8, 0.55) 0%, rgba(10, 3, 8, 0.3) 34%, transparent 58%),
    linear-gradient(0deg, rgba(10, 3, 8, 0.6) 0%, transparent 26%); }

/* ── glass console ── */
.rph-console { position: absolute; z-index: 2; left: 22px; top: 22px; width: min(452px, calc(100% - 44px));
  padding: 20px 22px; border-radius: 18px; border: 1px solid var(--sd-border-strong);
  background: rgba(12, 4, 9, 0.56); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
/* the band air stays dark in BOTH themes, so the console stays dark-glass too —
   text inside uses literal light ink, not the theme tokens */
.rph-console, [data-theme="light"] .rph-console { color: #f7edf3; }

.rph-eyebrow { display: inline-flex; align-items: center; gap: 9px; font-size: 10.5px; font-weight: 800;
  letter-spacing: 0.22em; color: var(--sd-rop-hi); font-family: var(--sd-font-mono, ui-monospace); }
.rph-live { width: 8px; height: 8px; border-radius: 50%; background: var(--sd-rop-offramp); }
.rph-live.hot { background: var(--sd-rop-hi); animation: rph-live-pulse 1.4s ease-out infinite; }
/* !important defeats theme-light-rescue's `[class*="page"] h2` catch-all — this console
   sits on the dark band air in BOTH themes, so its ink stays light. */
.rph-title { margin: 11px 0 7px; font-size: clamp(26px, 3vw, 38px); line-height: 1.04; font-weight: 800;
  letter-spacing: -0.02em; color: #f8f0f4 !important; }
.rph-title em { font-style: normal; background: var(--sd-rop-grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
[data-theme="light"] .rph-title em { background: linear-gradient(122deg, #ffc2de 0%, #ff8fc6 48%, #e0509b 100%); -webkit-background-clip: text; background-clip: text; }
.rph-sub { margin: 0 0 15px; max-width: 46ch; font-size: 13px; line-height: 1.55; color: rgba(247, 237, 243, 0.72); }

.rph-ctas { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.rph-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 12px;
  font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid rgba(247, 237, 243, 0.2); background: rgba(247, 237, 243, 0.06); color: #f7edf3; position: relative; }
.rph-btn.primary { border-color: transparent; color: #052e1f; background: linear-gradient(135deg, #6ee7b7, var(--sd-rop-offramp)); box-shadow: 0 8px 22px -10px var(--sd-rop-offramp); }
.rph-btn.primary.on { box-shadow: 0 0 0 2px color-mix(in srgb, var(--sd-rop-offramp) 60%, transparent), 0 8px 22px -10px var(--sd-rop-offramp); }
.rph-btn.magenta { border-color: color-mix(in srgb, var(--sd-rop-core) 60%, transparent); color: var(--sd-rop-hi); background: rgba(224, 80, 155, 0.12); }
.rph-btn.ghost { background: transparent; }
.rph-btn.ghost.risk { border-color: color-mix(in srgb, var(--sd-rop-risk) 60%, transparent); color: var(--sd-rop-risk); }
.rph-btn.icon { padding: 9px 10px; }
.rph-btn.icon.on { border-color: var(--sd-rop-hi); color: var(--sd-rop-hi); background: rgba(224, 80, 155, 0.14); }
.rph-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.rph-fb { position: absolute; top: -5px; right: -5px; display: grid; place-items: center; min-width: 15px; height: 15px;
  padding: 0 4px; border-radius: 8px; background: var(--sd-rop-core); color: #fff; font-size: 9px; font-weight: 800; }
.rph-spin { animation: rph-rot 0.9s linear infinite; }

.rph-readouts { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 15px; }
.rph-ro { display: flex; flex-direction: column; gap: 3px; }
.rph-ro i { font-style: normal; font-size: 9px; font-weight: 700; letter-spacing: 0.18em; color: rgba(247, 237, 243, 0.45); }
.rph-ro b { font-size: 15px; font-weight: 800; color: #f7edf3; font-variant-numeric: tabular-nums; }
.rph-ro.ok b { color: var(--sd-rop-offramp); }
.rph-ro.worst b { color: var(--sd-rop-hi); font-size: 13px; }
.rph-ro.teams b { font-size: 12px; font-weight: 700; color: rgba(247, 237, 243, 0.72); }

/* ── docked telemetry lenses ── */
.rph-lensdock { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
  gap: 8px; margin: 14px 16px 14px; }
.rph-lens { position: relative; overflow: hidden; display: flex; align-items: center; gap: 8px; text-align: left;
  padding: 9px 11px; border-radius: 12px; cursor: pointer; font-family: inherit;
  border: 1px solid rgba(247, 237, 243, 0.16); color: #f7edf3;
  background: rgba(12, 4, 9, 0.6); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  transition: border-color 0.2s, background 0.2s; }
.rph-lens:hover { border-color: color-mix(in srgb, var(--lc) 55%, transparent); }
.rph-lens.on { border-color: var(--lc); background: color-mix(in srgb, var(--lc) 16%, rgba(12, 4, 9, 0.62)); }
.rph-lens.stat { cursor: default; }
.rl-ic { flex-shrink: 0; display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px;
  color: var(--lc); background: color-mix(in srgb, var(--lc) 16%, transparent); }
.rl-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.rl-val { font-size: 16px; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
.rl-lb { font-size: 9px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: rgba(247, 237, 243, 0.55);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rl-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--lc); opacity: 0.4;
  transform-origin: left; transform: scaleX(0.25); transition: transform 0.3s var(--sd-spring), opacity 0.3s; }
.rph-lens.on .rl-bar, .rph-lens:hover .rl-bar { transform: scaleX(1); opacity: 0.9; }

/* idle stage (until the instrument mounts) — three drifting loop rings */
.rph-stage-idle { position: absolute; inset: 0; display: grid; place-items: center; background: var(--sd-rop-deep-bg); }
.rph-idle-core { color: var(--sd-rop-core); opacity: 0.85; }
.rph-idle-loop { position: absolute; border: 1px dashed color-mix(in srgb, var(--sd-rop-core) 40%, transparent);
  border-radius: 50%; animation: rph-orbit 7s linear infinite; }
.rph-idle-loop.l1 { width: 130px; height: 92px; }
.rph-idle-loop.l2 { width: 200px; height: 142px; animation-duration: 10s; animation-direction: reverse; }
.rph-idle-loop.l3 { width: 276px; height: 196px; animation-duration: 14s; }

@keyframes rph-live-pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-rop-core) 55%, transparent); } 100% { box-shadow: 0 0 0 10px transparent; } }
@keyframes rph-orbit { to { transform: rotate(360deg); } }
@keyframes rph-rot { to { transform: rotate(360deg); } }

@media (max-width: 940px) {
  .rph { min-height: 0; }
  .rph-console { position: relative; left: 0; top: 0; margin: 16px 16px 0; width: auto; }
  .rph-bleed { min-height: 220px; }
  .rph-scrim { background: linear-gradient(0deg, rgba(10, 3, 8, 0.74) 0%, rgba(10, 3, 8, 0.32) 60%, transparent 100%); }
}

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .rph-live.hot, html:not([data-cinematic="on"]) .rph-idle-loop { animation: none; }
}
</style>
