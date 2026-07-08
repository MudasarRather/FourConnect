<template>
  <Motion as="section" class="arh" :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
    <!-- ── full-bleed signature stage (the instrument IS the hero backdrop) ── -->
    <div class="arh-bleed">
      <slot name="instrument">
        <div class="arh-stage-idle" aria-hidden="true">
          <span class="arh-idle-shelf s1" /><span class="arh-idle-shelf s2" /><span class="arh-idle-shelf s3" />
          <span class="arh-idle-shelf s4" /><span class="arh-idle-shelf s5" />
          <Archive :size="42" class="arh-idle-core" />
        </div>
      </slot>
    </div>
    <div class="arh-grain" aria-hidden="true" />
    <div class="arh-scrim" aria-hidden="true" />

    <!-- ── glass console over the calm left air ── -->
    <div class="arh-console">
      <div class="arh-eyebrow">
        <span class="arh-live" :class="{ hot: (stats.purge_eligible_count || 0) > 0 }" aria-hidden="true" />
        ARCHIVED · DEEP STORAGE
      </div>
      <h2 class="arh-title">Out of circulation. <em>Never out of reach.</em></h2>
      <p class="arh-sub">
        Every archived ticket keeps its story — who shelved it, why, and how long it has
        slept. Pull a mistake back in one click, shield a record under legal hold, or let
        retention run its course.
      </p>

      <div class="arh-ctas">
        <Motion v-if="agent" as="button" class="arh-btn primary" :class="{ on: reviewOn }" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
          :disabled="loading" title="Step through likely-mistake tombstones — restore them or confirm they belong here" @click="$emit('review')">
          <ArchiveRestore :size="15" /> {{ reviewOn ? 'Recovery review · on' : 'Start recovery review' }}
          <span v-if="!reviewOn && mistakeCount > 0" class="arh-cta-n">{{ mistakeCount }}</span>
        </Motion>
        <Motion v-if="(stats.expiring_soon_count || 0) > 0" as="button" class="arh-btn purge"
          :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
          title="Records entering purge eligibility within the fortnight — last call to restore or hold them" @click="$emit('expiring')">
          <TimerOff :size="15" /> {{ stats.expiring_soon_count }} expiring soon
        </Motion>
        <Motion v-if="(stats.legal_hold_count || 0) > 0" as="button" class="arh-btn hold"
          :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }"
          title="Records under legal hold — retention is suspended; only a superuser can release them" @click="$emit('hold')">
          <Scale :size="15" /> {{ stats.legal_hold_count }} on legal hold
        </Motion>
        <Motion as="button" class="arh-btn icon ghost" title="Refresh" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.95 }" @click="$emit('refresh')">
          <RefreshCw :size="14" :class="{ 'arh-spin': loading }" />
        </Motion>
        <Motion as="button" class="arh-btn icon ghost" :class="{ on: advCount > 0 }" title="Filters"
          :while-hover="{ y: -2 }" :while-tap="{ scale: 0.95 }" @click="$emit('filters')">
          <SlidersHorizontal :size="14" /><span v-if="advCount" class="arh-fb">{{ advCount }}</span>
        </Motion>
      </div>

      <!-- deep-storage readouts -->
      <div class="arh-readouts sd-mono">
        <span class="arh-ro bone"><i>IN DEEP STORAGE</i><b><SdCountUp :value="stats.total_archived ?? 0" /></b></span>
        <span class="arh-ro"><i>SHELVED · 30D</i><b>{{ stats.archived_30d ?? 0 }}</b></span>
        <span class="arh-ro restore"><i>RESTORED · 30D</i><b>{{ stats.restored_30d ?? 0 }}</b></span>
        <span class="arh-ro"><i>DORMANCY · P50</i><b>{{ fmtMin(stats.dormancy_p50_minutes) }}</b></span>
        <span class="arh-ro" :class="{ purge: (stats.purge_eligible_count || 0) > 0 }"><i>PURGE-ELIGIBLE</i><b>{{ stats.purge_eligible_count ?? 0 }}</b></span>
        <span v-if="teamLine" class="arh-ro teams"><i>SCOPE</i><b>{{ teamLine }}</b></span>
      </div>
    </div>

    <!-- ── telemetry lenses docked along the stacks' floor ── -->
    <div class="arh-lensdock" role="tablist" aria-label="Deep-storage lenses">
      <Motion v-for="(l, i) in lenses" :key="l.key" as="button" class="arh-lens"
        :class="{ on: activeLens === l.key, stat: l.stat }" :style="{ '--lc': l.color }"
        role="tab" :aria-selected="activeLens === l.key"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.18 + i * 0.045, ease: [0.16, 1, 0.3, 1] }"
        :while-hover="l.stat ? undefined : { y: -3 }" :while-tap="l.stat ? undefined : { scale: 0.97 }"
        @click="$emit('pick', l)">
        <span class="al-ic"><component :is="l.icon" :size="14" /></span>
        <span class="al-body">
          <span class="al-val"><SdCountUp v-if="typeof l.value === 'number'" :value="l.value" /><template v-else>{{ l.value }}</template></span>
          <span class="al-lb">{{ l.label }}</span>
        </span>
        <span class="al-bar" aria-hidden="true" />
      </Motion>
    </div>
  </Motion>
</template>

<script setup>
/* SdArchivedHero — the Deep Storage banner (full-bleed instrument backdrop, glass
   console over the calm left air, lens dock along the bottom). Accent = --sd-arc-*.
   Same layout contract as SdClosedHero / SdResolvedHero with the archive identity:
   bone/parchment = the sleeping record, bronze = the shelf hardware, statute gold =
   legal hold, ember = retention running out, emerald = a restore. THEME-NATIVE stage:
   sepia-night on dark, parchment on light. */
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Archive, ArchiveRestore, Scale, TimerOff, RefreshCw, SlidersHorizontal } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  lenses: { type: Array, default: () => [] },
  activeLens: { type: String, default: 'all' },
  stats: { type: Object, default: () => ({}) },
  agent: { type: Boolean, default: false },
  reviewOn: { type: Boolean, default: false },
  mistakeCount: { type: Number, default: 0 },
  advCount: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
  reduced: { type: Boolean, default: false },
})
defineEmits(['pick', 'review', 'expiring', 'hold', 'refresh', 'filters'])

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
.arh { position: relative; overflow: hidden; isolation: isolate; border: 1px solid var(--sd-arc-brd); border-radius: 22px;
  background: var(--sd-arc-stage); min-height: clamp(470px, 43vw, 570px);
  display: flex; flex-direction: column; justify-content: flex-end; }

.arh-bleed { position: absolute; inset: 0; z-index: 0; }
.arh-grain { position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: 0.45; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E"); }
[data-theme="light"] .arh-grain { opacity: 0.28; }
/* console-legibility scrim: calm left air + docked-lens footing — THEME-NATIVE
   (sepia-night stacks on dark, parchment reading-room on cream) */
.arh-scrim { position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background:
    linear-gradient(90deg, rgba(11, 9, 5, 0.66) 0%, rgba(11, 9, 5, 0.38) 34%, transparent 58%),
    linear-gradient(0deg, rgba(11, 9, 5, 0.7) 0%, transparent 26%); }
[data-theme="light"] .arh-scrim {
  background:
    linear-gradient(90deg, rgba(243, 237, 222, 0.8) 0%, rgba(243, 237, 222, 0.45) 34%, transparent 58%),
    linear-gradient(0deg, rgba(240, 232, 214, 0.82) 0%, transparent 26%); }

/* ── glass console — dark glass in the night stacks, frosted cream in the reading room ── */
.arh-console { position: absolute; z-index: 2; left: 22px; top: 22px; width: min(452px, calc(100% - 44px));
  padding: 20px 22px; border-radius: 18px; border: 1px solid var(--sd-border-strong);
  background: rgba(12, 10, 6, 0.56); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  color: #f2eee2; }
[data-theme="light"] .arh-console { background: rgba(255, 250, 240, 0.68); color: #2c2617;
  border-color: rgba(60, 45, 20, 0.16); }

.arh-eyebrow { display: inline-flex; align-items: center; gap: 9px; font-size: 10.5px; font-weight: 800;
  letter-spacing: 0.22em; color: var(--sd-arc-hi); font-family: var(--sd-font-mono, ui-monospace); }
.arh-live { width: 8px; height: 8px; border-radius: 50%; background: var(--sd-arc-core); }
.arh-live.hot { background: var(--sd-arc-purge); animation: arh-live-pulse 1.4s ease-out infinite; }
/* !important defeats theme-light-rescue's `[class*="page"] h2` catch-all — ink is
   theme-native: bone on the night stacks, dark sepia in the reading room. */
.arh-title { margin: 11px 0 7px; font-size: clamp(26px, 3vw, 38px); line-height: 1.04; font-weight: 800;
  letter-spacing: -0.02em; color: #f4f0e4 !important; }
[data-theme="light"] .arh-title { color: #2c2617 !important; }
.arh-title em { font-style: normal; background: linear-gradient(122deg, #efe6d0 0%, #cbbfa4 44%, #b08d57 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent; }
[data-theme="light"] .arh-title em { background: linear-gradient(122deg, #57492f 0%, #7a6a4f 44%, #8a6a3b 100%);
  -webkit-background-clip: text; background-clip: text; }
.arh-sub { margin: 0 0 15px; max-width: 47ch; font-size: 13px; line-height: 1.55; color: rgba(242, 238, 226, 0.72); }
[data-theme="light"] .arh-sub { color: rgba(44, 38, 23, 0.72); }

.arh-ctas { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.arh-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 12px;
  font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid rgba(242, 238, 226, 0.2); background: rgba(242, 238, 226, 0.06); color: #f2eee2; position: relative; }
[data-theme="light"] .arh-btn { border-color: rgba(50, 40, 20, 0.22); background: rgba(50, 40, 20, 0.05); color: #2c2617; }
.arh-btn.primary { border-color: transparent; color: #04231a; background: linear-gradient(135deg, #9df0cd, var(--sd-arc-restore)); box-shadow: 0 8px 22px -10px var(--sd-arc-restore); }
.arh-btn.primary.on { box-shadow: 0 0 0 2px color-mix(in srgb, var(--sd-arc-restore) 60%, transparent), 0 8px 22px -10px var(--sd-arc-restore); }
.arh-btn.purge { border-color: color-mix(in srgb, var(--sd-arc-purge) 60%, transparent); color: #ffc59d; background: rgba(249, 115, 22, 0.12); }
[data-theme="light"] .arh-btn.purge { color: #9a3412; }
.arh-btn.hold { border-color: color-mix(in srgb, var(--sd-arc-hold) 60%, transparent); color: #f4d878; background: rgba(234, 179, 8, 0.1); }
[data-theme="light"] .arh-btn.hold { color: #854d0e; }
.arh-btn.ghost { background: transparent; }
.arh-btn.icon { padding: 9px 10px; }
.arh-btn.icon.on { border-color: var(--sd-arc-hi); color: var(--sd-arc-hi); background: rgba(203, 191, 164, 0.14); }
.arh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.arh-cta-n { display: inline-grid; place-items: center; min-width: 17px; height: 17px; padding: 0 5px; border-radius: 9px;
  background: rgba(4, 35, 26, 0.28); font-size: 10px; font-weight: 800; }
.arh-fb { position: absolute; top: -5px; right: -5px; display: grid; place-items: center; min-width: 15px; height: 15px;
  padding: 0 4px; border-radius: 8px; background: var(--sd-arc-bronze); color: #241a03; font-size: 9px; font-weight: 800; }
.arh-spin { animation: arh-rot 0.9s linear infinite; }

.arh-readouts { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 15px; }
.arh-ro { display: flex; flex-direction: column; gap: 3px; }
.arh-ro i { font-style: normal; font-size: 9px; font-weight: 700; letter-spacing: 0.18em; color: rgba(242, 238, 226, 0.45); }
[data-theme="light"] .arh-ro i { color: rgba(44, 38, 23, 0.5); }
.arh-ro b { font-size: 15px; font-weight: 800; color: #f2eee2; font-variant-numeric: tabular-nums; }
[data-theme="light"] .arh-ro b { color: #2c2617; }
.arh-ro.bone b { color: var(--sd-arc-hi); }
.arh-ro.restore b { color: var(--sd-arc-restore); }
.arh-ro.purge b { color: var(--sd-arc-purge); }
.arh-ro.teams b { font-size: 12px; font-weight: 700; color: rgba(242, 238, 226, 0.72); }
[data-theme="light"] .arh-ro.teams b { color: rgba(44, 38, 23, 0.72); }

/* ── docked telemetry lenses ── */
.arh-lensdock { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
  gap: 8px; margin: 14px 16px 14px; }
.arh-lens { position: relative; overflow: hidden; display: flex; align-items: center; gap: 8px; text-align: left;
  padding: 9px 11px; border-radius: 12px; cursor: pointer; font-family: inherit;
  border: 1px solid rgba(242, 238, 226, 0.16); color: #f2eee2;
  background: rgba(12, 10, 6, 0.6); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  transition: border-color 0.2s, background 0.2s; }
[data-theme="light"] .arh-lens { border-color: rgba(50, 40, 20, 0.16); color: #2c2617;
  background: rgba(255, 252, 244, 0.72); }
.arh-lens:hover { border-color: color-mix(in srgb, var(--lc) 55%, transparent); }
.arh-lens.on { border-color: var(--lc); background: color-mix(in srgb, var(--lc) 16%, rgba(12, 10, 6, 0.62)); }
[data-theme="light"] .arh-lens.on { background: color-mix(in srgb, var(--lc) 14%, rgba(255, 252, 244, 0.75)); }
.arh-lens.stat { cursor: default; }
.al-ic { flex-shrink: 0; display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px;
  color: var(--lc); background: color-mix(in srgb, var(--lc) 16%, transparent); }
.al-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.al-val { font-size: 16px; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
.al-lb { font-size: 9px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: rgba(242, 238, 226, 0.55);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
[data-theme="light"] .al-lb { color: rgba(44, 38, 23, 0.55); }
.al-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--lc); opacity: 0.4;
  transform-origin: left; transform: scaleX(0.25); transition: transform 0.3s var(--sd-spring), opacity 0.3s; }
.arh-lens.on .al-bar, .arh-lens:hover .al-bar { transform: scaleX(1); opacity: 0.9; }

/* idle stage (until the instrument mounts) — faint breathing shelf rules */
.arh-stage-idle { position: absolute; inset: 0; display: grid; place-items: center; background: var(--sd-arc-stage); }
.arh-idle-core { color: var(--sd-arc-core); opacity: 0.85; }
.arh-idle-shelf { position: absolute; left: 12%; right: 12%; height: 1px;
  background: color-mix(in srgb, var(--sd-arc-core) 30%, transparent);
  animation: arh-shelf-breathe 6s ease-in-out infinite; }
.arh-idle-shelf.s1 { top: 22%; } .arh-idle-shelf.s2 { top: 37%; animation-delay: 0.7s; }
.arh-idle-shelf.s3 { top: 52%; animation-delay: 1.4s; } .arh-idle-shelf.s4 { top: 67%; animation-delay: 2.1s; }
.arh-idle-shelf.s5 { top: 82%; animation-delay: 2.8s; }

@keyframes arh-live-pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-arc-purge) 55%, transparent); } 100% { box-shadow: 0 0 0 10px transparent; } }
@keyframes arh-shelf-breathe { 0%, 100% { opacity: 0.25; transform: scaleX(0.92); } 50% { opacity: 0.7; transform: scaleX(1); } }
@keyframes arh-rot { to { transform: rotate(360deg); } }

@media (max-width: 940px) {
  .arh { min-height: 0; }
  .arh-console { position: relative; left: 0; top: 0; margin: 16px 16px 0; width: auto; }
  .arh-bleed { min-height: 220px; }
  .arh-scrim { background: linear-gradient(0deg, rgba(11, 9, 5, 0.76) 0%, rgba(11, 9, 5, 0.34) 60%, transparent 100%); }
  [data-theme="light"] .arh-scrim { background: linear-gradient(0deg, rgba(243, 237, 222, 0.85) 0%, rgba(243, 237, 222, 0.4) 60%, transparent 100%); }
}

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .arh-live.hot, html:not([data-cinematic="on"]) .arh-idle-shelf { animation: none; }
}
</style>
