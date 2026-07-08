<template>
  <Motion as="section" class="ovh" :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
    <!-- ── full-bleed signature stage (the Gravity Well IS the hero backdrop) ── -->
    <div class="ovh-bleed">
      <slot name="instrument">
        <div class="ovh-stage-idle" aria-hidden="true">
          <span class="ovh-idle-orbit o1" /><span class="ovh-idle-orbit o2" /><span class="ovh-idle-orbit o3" />
          <AlarmClock :size="42" class="ovh-idle-core" />
        </div>
      </slot>
    </div>
    <div class="ovh-grain" aria-hidden="true" />
    <div class="ovh-scrim" aria-hidden="true" />

    <!-- ── glass console over the calm left air ── -->
    <div class="ovh-console">
      <div class="ovh-eyebrow">
        <span class="ovh-live" :class="{ hot: (stats.imminent || 0) > 0 }" aria-hidden="true" />
        OVERDUE · RECOVERY OPERATIONS
      </div>
      <h2 class="ovh-title">Past the deadline, <em>still in orbit</em>.</h2>
      <p class="ovh-sub">
        Every ticket here is open, late, and falling toward the horizon — the longer it waits,
        the deeper the orbit. Rank the worst, own the unowned, and pull them out.
      </p>

      <div class="ovh-ctas">
        <Motion as="button" class="ovh-btn primary" :class="{ on: guided }" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
          :disabled="loading" title="Step through the ranked recovery queue, one ticket at a time" @click="$emit('run')">
          <Orbit :size="15" /> {{ guided ? 'Recovery run · on' : 'Start recovery run' }}
        </Motion>
        <Motion as="button" class="ovh-btn rose" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
          title="Ping the owner of every nudgeable overdue ticket (24h throttle per ticket)" @click="$emit('nudge')">
          <BellRing :size="15" /> Nudge owners
        </Motion>
        <Motion v-if="(stats.at_risk || 0) > 0" as="button" class="ovh-btn ghost risk"
          :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }"
          title="Open tickets within 2h of their target — catch them before they fall in" @click="$emit('tipping')">
          <ShieldAlert :size="15" /> {{ stats.at_risk }} at the tipping point<template v-if="stats.imminent"> · {{ stats.imminent }} imminent</template>
        </Motion>
        <Motion as="button" class="ovh-btn icon ghost" title="Refresh" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.95 }" @click="$emit('refresh')">
          <RefreshCw :size="14" :class="{ 'ovh-spin': loading }" />
        </Motion>
        <Motion as="button" class="ovh-btn icon ghost" :class="{ on: advCount > 0 }" title="Filters"
          :while-hover="{ y: -2 }" :while-tap="{ scale: 0.95 }" @click="$emit('filters')">
          <SlidersHorizontal :size="14" /><span v-if="advCount" class="ovh-fb">{{ advCount }}</span>
        </Motion>
      </div>

      <!-- mission readouts -->
      <div class="ovh-readouts sd-mono">
        <span class="ovh-ro"><i>TIME OWED</i><b>{{ fmtMin(stats.total_late_minutes) }}</b></span>
        <span class="ovh-ro"><i>AVG LATE</i><b>{{ fmtMin(stats.avg_late_minutes) }}</b></span>
        <span class="ovh-ro"><i>DEEPEST</i><b>{{ fmtMin(stats.max_late_minutes) }}</b></span>
        <span class="ovh-ro ok"><i>RECOVERED TODAY</i><b>{{ stats.recovered_today ?? 0 }}</b></span>
        <span v-if="(stats.frozen_excluded || 0) > 0" class="ovh-ro frozen" title="Past-due on paper but the clock is legitimately frozen (pending / on hold) — not counted here">
          <i>FROZEN · EXCLUDED</i><b>❄ {{ stats.frozen_excluded }}</b></span>
        <span v-if="teamLine" class="ovh-ro teams"><i>SCOPE</i><b>{{ teamLine }}</b></span>
      </div>
    </div>

    <!-- ── telemetry lenses docked along the well's edge ── -->
    <div class="ovh-lensdock" role="tablist" aria-label="Overdue lenses">
      <Motion v-for="(l, i) in lenses" :key="l.key" as="button" class="ovh-lens"
        :class="{ on: activeLens === l.key, stat: l.stat }" :style="{ '--lc': l.color }"
        role="tab" :aria-selected="activeLens === l.key"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.18 + i * 0.045, ease: [0.16, 1, 0.3, 1] }"
        :while-hover="l.stat ? undefined : { y: -3 }" :while-tap="l.stat ? undefined : { scale: 0.97 }"
        @click="$emit('pick', l)">
        <span class="ol-ic"><component :is="l.icon" :size="14" /></span>
        <span class="ol-body">
          <span class="ol-val"><SdCountUp v-if="typeof l.value === 'number'" :value="l.value" /><template v-else>{{ l.value }}</template></span>
          <span class="ol-lb">{{ l.label }}</span>
        </span>
        <span class="ol-bar" aria-hidden="true" />
      </Motion>
    </div>
  </Motion>
</template>

<script setup>
/* SdOverdueHero — the Gravity Well banner (full-bleed instrument backdrop, glass console
   over the calm left air, lens dock along the well's edge). Accent = --sd-ovd-*.
   Same layout contract as SdBreachedHero / SdEscalatedHero with the recovery identity:
   emerald = the act of recovery, rose = the pull of the well. */
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { AlarmClock, Orbit, BellRing, RefreshCw, SlidersHorizontal, ShieldAlert } from 'lucide-vue-next'
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
defineEmits(['pick', 'run', 'nudge', 'tipping', 'refresh', 'filters'])

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
.ovh { position: relative; overflow: hidden; isolation: isolate; border: 1px solid var(--sd-ovd-brd); border-radius: 22px;
  background: var(--sd-ovd-deep-bg); min-height: clamp(470px, 43vw, 570px);
  display: flex; flex-direction: column; justify-content: flex-end; }
[data-theme="light"] .ovh { background: #f6ecef; }

.ovh-bleed { position: absolute; inset: 0; z-index: 0; }
.ovh-grain { position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: 0.45; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E"); }
/* console-legibility scrim: calm left air + docked-lens footing */
.ovh-scrim { position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background:
    linear-gradient(90deg, rgba(8, 3, 6, 0.64) 0%, rgba(8, 3, 6, 0.36) 34%, transparent 58%),
    linear-gradient(0deg, rgba(8, 3, 6, 0.68) 0%, transparent 26%); }
[data-theme="light"] .ovh-scrim {
  background:
    linear-gradient(90deg, rgba(8, 3, 6, 0.55) 0%, rgba(8, 3, 6, 0.3) 34%, transparent 58%),
    linear-gradient(0deg, rgba(8, 3, 6, 0.6) 0%, transparent 26%); }

/* ── glass console ── */
.ovh-console { position: absolute; z-index: 2; left: 22px; top: 22px; width: min(452px, calc(100% - 44px));
  padding: 20px 22px; border-radius: 18px; border: 1px solid var(--sd-border-strong);
  background: rgba(10, 4, 8, 0.56); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
/* the void stays dark in BOTH themes, so the console stays dark-glass too —
   text inside uses literal light ink, not the theme tokens */
.ovh-console, [data-theme="light"] .ovh-console { color: #f5eee9; }

.ovh-eyebrow { display: inline-flex; align-items: center; gap: 9px; font-size: 10.5px; font-weight: 800;
  letter-spacing: 0.22em; color: var(--sd-ovd-hi); font-family: var(--sd-font-mono, ui-monospace); }
.ovh-live { width: 8px; height: 8px; border-radius: 50%; background: var(--sd-ovd-escape); }
.ovh-live.hot { background: var(--sd-ovd-hi); animation: ovh-live-pulse 1.4s ease-out infinite; }
/* !important defeats theme-light-rescue's `[class*="page"] h2` catch-all — this console
   sits on the dark void in BOTH themes, so its ink stays light. */
.ovh-title { margin: 11px 0 7px; font-size: clamp(26px, 3vw, 38px); line-height: 1.04; font-weight: 800;
  letter-spacing: -0.02em; color: #f7f0ea !important; }
.ovh-title em { font-style: normal; background: var(--sd-ovd-grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
[data-theme="light"] .ovh-title em { background: linear-gradient(122deg, #fda4af 0%, #fb7185 48%, #e11d48 100%); -webkit-background-clip: text; background-clip: text; }
.ovh-sub { margin: 0 0 15px; max-width: 46ch; font-size: 13px; line-height: 1.55; color: rgba(245, 238, 230, 0.72); }

.ovh-ctas { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.ovh-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 12px;
  font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid rgba(245, 238, 230, 0.2); background: rgba(245, 238, 230, 0.06); color: #f5eee9; position: relative; }
.ovh-btn.primary { border-color: transparent; color: #052e1f; background: linear-gradient(135deg, #6ee7b7, var(--sd-ovd-escape)); box-shadow: 0 8px 22px -10px var(--sd-ovd-escape); }
.ovh-btn.primary.on { box-shadow: 0 0 0 2px color-mix(in srgb, var(--sd-ovd-escape) 60%, transparent), 0 8px 22px -10px var(--sd-ovd-escape); }
.ovh-btn.rose { border-color: color-mix(in srgb, var(--sd-ovd-core) 60%, transparent); color: var(--sd-ovd-hi); background: rgba(225, 29, 72, 0.12); }
.ovh-btn.ghost { background: transparent; }
.ovh-btn.ghost.risk { border-color: color-mix(in srgb, var(--sd-ovd-risk) 60%, transparent); color: var(--sd-ovd-risk); }
.ovh-btn.icon { padding: 9px 10px; }
.ovh-btn.icon.on { border-color: var(--sd-ovd-hi); color: var(--sd-ovd-hi); background: rgba(225, 29, 72, 0.14); }
.ovh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.ovh-fb { position: absolute; top: -5px; right: -5px; display: grid; place-items: center; min-width: 15px; height: 15px;
  padding: 0 4px; border-radius: 8px; background: var(--sd-ovd-core); color: #fff; font-size: 9px; font-weight: 800; }
.ovh-spin { animation: ovh-rot 0.9s linear infinite; }

.ovh-readouts { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 15px; }
.ovh-ro { display: flex; flex-direction: column; gap: 3px; }
.ovh-ro i { font-style: normal; font-size: 9px; font-weight: 700; letter-spacing: 0.18em; color: rgba(245, 238, 230, 0.45); }
.ovh-ro b { font-size: 15px; font-weight: 800; color: #f5eee9; font-variant-numeric: tabular-nums; }
.ovh-ro.ok b { color: var(--sd-ovd-escape); }
.ovh-ro.frozen b { color: var(--sd-ovd-dust); font-size: 13px; }
.ovh-ro.teams b { font-size: 12px; font-weight: 700; color: rgba(245, 238, 230, 0.72); }

/* ── docked telemetry lenses ── */
.ovh-lensdock { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
  gap: 8px; margin: 14px 16px 14px; }
.ovh-lens { position: relative; overflow: hidden; display: flex; align-items: center; gap: 8px; text-align: left;
  padding: 9px 11px; border-radius: 12px; cursor: pointer; font-family: inherit;
  border: 1px solid rgba(245, 238, 230, 0.16); color: #f5eee9;
  background: rgba(10, 4, 8, 0.6); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  transition: border-color 0.2s, background 0.2s; }
.ovh-lens:hover { border-color: color-mix(in srgb, var(--lc) 55%, transparent); }
.ovh-lens.on { border-color: var(--lc); background: color-mix(in srgb, var(--lc) 16%, rgba(10, 4, 8, 0.62)); }
.ovh-lens.stat { cursor: default; }
.ol-ic { flex-shrink: 0; display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px;
  color: var(--lc); background: color-mix(in srgb, var(--lc) 16%, transparent); }
.ol-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.ol-val { font-size: 16px; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
.ol-lb { font-size: 9px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: rgba(245, 238, 230, 0.55);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ol-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--lc); opacity: 0.4;
  transform-origin: left; transform: scaleX(0.25); transition: transform 0.3s var(--sd-spring), opacity 0.3s; }
.ovh-lens.on .ol-bar, .ovh-lens:hover .ol-bar { transform: scaleX(1); opacity: 0.9; }

/* idle stage (until the instrument mounts) — three decaying orbit rings */
.ovh-stage-idle { position: absolute; inset: 0; display: grid; place-items: center; background: var(--sd-ovd-deep-bg); }
.ovh-idle-core { color: var(--sd-ovd-core); opacity: 0.85; }
.ovh-idle-orbit { position: absolute; border: 1px dashed color-mix(in srgb, var(--sd-ovd-core) 40%, transparent);
  border-radius: 50%; animation: ovh-orbit 6s linear infinite; }
.ovh-idle-orbit.o1 { width: 120px; height: 110px; }
.ovh-idle-orbit.o2 { width: 190px; height: 174px; animation-duration: 9s; animation-direction: reverse; }
.ovh-idle-orbit.o3 { width: 264px; height: 242px; animation-duration: 13s; }

@keyframes ovh-live-pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-ovd-core) 55%, transparent); } 100% { box-shadow: 0 0 0 10px transparent; } }
@keyframes ovh-orbit { to { transform: rotate(360deg); } }
@keyframes ovh-rot { to { transform: rotate(360deg); } }

@media (max-width: 940px) {
  .ovh { min-height: 0; }
  .ovh-console { position: relative; left: 0; top: 0; margin: 16px 16px 0; width: auto; }
  .ovh-bleed { min-height: 220px; }
  .ovh-scrim { background: linear-gradient(0deg, rgba(8, 3, 6, 0.74) 0%, rgba(8, 3, 6, 0.32) 60%, transparent 100%); }
}

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .ovh-live.hot, html:not([data-cinematic="on"]) .ovh-idle-orbit { animation: none; }
}
</style>
