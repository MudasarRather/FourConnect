<template>
  <Motion as="section" class="brh" :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
    <!-- ── full-bleed signature stage (the Time-Debt Meter IS the hero backdrop) ── -->
    <div class="brh-bleed">
      <slot name="instrument">
        <div class="brh-stage-idle" aria-hidden="true">
          <span class="brh-idle-tick t1" /><span class="brh-idle-tick t2" /><span class="brh-idle-tick t3" />
          <Timer :size="42" class="brh-idle-core" />
        </div>
      </slot>
    </div>
    <div class="brh-grain" aria-hidden="true" />
    <div class="brh-scrim" aria-hidden="true" />

    <!-- ── glass console over the calm left air ── -->
    <div class="brh-console">
      <div class="brh-eyebrow">
        <span class="brh-live" :class="{ hot: (stats.imminent || 0) > 0 }" aria-hidden="true" />
        SLA BREACHED · TIME-DEBT LEDGER
      </div>
      <h2 class="brh-title">Every minute owed, <em>on the meter</em>.</h2>
      <p class="brh-sub">
        Each missed target accrues debt in real time. Repair the worst first, file the root
        cause on every breach, and catch the next one before the meter rolls again.
      </p>

      <div class="brh-ctas">
        <Motion as="button" class="brh-btn primary" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
          :disabled="loading" title="Open the worst breach with no root cause on record" @click="$emit('rca-next')">
          <FileSearch :size="15" /> Capture next root cause
        </Motion>
        <Motion as="button" class="brh-btn debt" :class="{ on: guided }" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
          title="Serve the deepest debt, one ticket at a time" @click="$emit('guided')">
          <Crosshair :size="15" /> {{ guided ? 'Guided · on' : 'Guided triage' }}
        </Motion>
        <Motion v-if="(stats.at_risk || 0) > 0" as="button" class="brh-btn ghost risk"
          :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }"
          title="Open tickets within 2h of their target — prevent the next breach" @click="$emit('at-risk')">
          <ShieldAlert :size="15" /> {{ stats.at_risk }} at risk<template v-if="stats.imminent"> · {{ stats.imminent }} imminent</template>
        </Motion>
        <Motion as="button" class="brh-btn icon ghost" title="Refresh" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.95 }" @click="$emit('refresh')">
          <RefreshCw :size="14" :class="{ 'brh-spin': loading }" />
        </Motion>
        <Motion as="button" class="brh-btn icon ghost" :class="{ on: advCount > 0 }" title="Filters"
          :while-hover="{ y: -2 }" :while-tap="{ scale: 0.95 }" @click="$emit('filters')">
          <SlidersHorizontal :size="14" /><span v-if="advCount" class="brh-fb">{{ advCount }}</span>
        </Motion>
      </div>

      <!-- mission readouts -->
      <div class="brh-readouts sd-mono">
        <span class="brh-ro"><i>TOTAL DEBT</i><b>{{ fmtMin(stats.total_debt_minutes) }}</b></span>
        <span class="brh-ro"><i>AVG OVERAGE</i><b>{{ fmtMin(stats.avg_overage_minutes) }}</b></span>
        <span class="brh-ro"><i>WORST</i><b>{{ fmtMin(stats.max_overage_minutes) }}</b></span>
        <span class="brh-ro" :class="{ warn: (stats.rca_coverage ?? 100) < 70 }"><i>RCA COVERAGE</i><b>{{ stats.rca_coverage ?? 100 }}%</b></span>
        <span v-if="teamLine" class="brh-ro teams"><i>SCOPE</i><b>{{ teamLine }}</b></span>
      </div>
    </div>

    <!-- ── telemetry lenses docked along the ledger bed ── -->
    <div class="brh-lensdock" role="tablist" aria-label="Breach lenses">
      <Motion v-for="(l, i) in lenses" :key="l.key" as="button" class="brh-lens"
        :class="{ on: activeLens === l.key, stat: l.stat }" :style="{ '--lc': l.color }"
        role="tab" :aria-selected="activeLens === l.key"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.18 + i * 0.045, ease: [0.16, 1, 0.3, 1] }"
        :while-hover="l.stat ? undefined : { y: -3 }" :while-tap="l.stat ? undefined : { scale: 0.97 }"
        @click="$emit('pick', l)">
        <span class="bl-ic"><component :is="l.icon" :size="14" /></span>
        <span class="bl-body">
          <span class="bl-val"><SdCountUp v-if="typeof l.value === 'number'" :value="l.value" /><template v-else>{{ l.value }}</template></span>
          <span class="bl-lb">{{ l.label }}</span>
        </span>
        <span class="bl-bar" aria-hidden="true" />
      </Motion>
    </div>
  </Motion>
</template>

<script setup>
/* SdBreachedHero — the Time-Debt Meter banner (full-bleed instrument backdrop, glass
   console over the calm left air, lens dock along the ledger bed). Accent = --sd-brc-*.
   Same layout contract as SdEscalatedHero / SdCriticalHero with the debt identity. */
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Timer, FileSearch, Crosshair, RefreshCw, SlidersHorizontal, ShieldAlert } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  lenses: { type: Array, default: () => [] },
  activeLens: { type: String, default: 'active' },
  stats: { type: Object, default: () => ({}) },
  guided: { type: Boolean, default: false },
  advCount: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
  reduced: { type: Boolean, default: false },
})
defineEmits(['pick', 'rca-next', 'guided', 'at-risk', 'refresh', 'filters'])

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
.brh { position: relative; overflow: hidden; isolation: isolate; border: 1px solid var(--sd-brc-brd); border-radius: 22px;
  background: var(--sd-brc-deep-bg); min-height: clamp(470px, 43vw, 570px);
  display: flex; flex-direction: column; justify-content: flex-end; }
[data-theme="light"] .brh { background: #f6ecec; }

.brh-bleed { position: absolute; inset: 0; z-index: 0; }
.brh-grain { position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: 0.45; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E"); }
/* console-legibility scrim: calm left air + docked-lens footing */
.brh-scrim { position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background:
    linear-gradient(90deg, rgba(10, 5, 6, 0.64) 0%, rgba(10, 5, 6, 0.36) 34%, transparent 58%),
    linear-gradient(0deg, rgba(10, 5, 6, 0.68) 0%, transparent 26%); }
[data-theme="light"] .brh-scrim {
  background:
    linear-gradient(90deg, rgba(10, 5, 6, 0.55) 0%, rgba(10, 5, 6, 0.3) 34%, transparent 58%),
    linear-gradient(0deg, rgba(10, 5, 6, 0.6) 0%, transparent 26%); }

/* ── glass console ── */
.brh-console { position: absolute; z-index: 2; left: 22px; top: 22px; width: min(444px, calc(100% - 44px));
  padding: 20px 22px; border-radius: 18px; border: 1px solid var(--sd-border-strong);
  background: rgba(12, 6, 7, 0.56); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
/* the vault backdrop stays dark in BOTH themes, so the console stays dark-glass too —
   text inside uses literal light ink, not the theme tokens */
.brh-console, [data-theme="light"] .brh-console { color: #f5eee9; }

.brh-eyebrow { display: inline-flex; align-items: center; gap: 9px; font-size: 10.5px; font-weight: 800;
  letter-spacing: 0.22em; color: var(--sd-brc-hi); font-family: var(--sd-font-mono, ui-monospace); }
.brh-live { width: 8px; height: 8px; border-radius: 50%; background: var(--sd-brc-repair); }
.brh-live.hot { background: var(--sd-brc-hi); animation: brh-live-pulse 1.4s ease-out infinite; }
/* !important defeats theme-light-rescue's `[class*="page"] h2 { color: var(--text-primary) }`
   catch-all — this console sits on the dark vault in BOTH themes, so its ink stays light. */
.brh-title { margin: 11px 0 7px; font-size: clamp(26px, 3vw, 38px); line-height: 1.04; font-weight: 800;
  letter-spacing: -0.02em; color: #f7f0ea !important; }
.brh-title em { font-style: normal; background: var(--sd-brc-grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
[data-theme="light"] .brh-title em { background: linear-gradient(122deg, #fca5a5 0%, #ef4444 48%, #dc2626 100%); -webkit-background-clip: text; background-clip: text; }
.brh-sub { margin: 0 0 15px; max-width: 46ch; font-size: 13px; line-height: 1.55; color: rgba(245, 238, 230, 0.72); }

.brh-ctas { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.brh-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 12px;
  font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid rgba(245, 238, 230, 0.2); background: rgba(245, 238, 230, 0.06); color: #f5eee9; position: relative; }
.brh-btn.primary { border-color: transparent; color: #052e1f; background: linear-gradient(135deg, #6ee7b7, var(--sd-brc-repair)); box-shadow: 0 8px 22px -10px var(--sd-brc-repair); }
.brh-btn.debt { border-color: color-mix(in srgb, var(--sd-brc-core) 60%, transparent); color: var(--sd-brc-hi); background: rgba(220, 38, 38, 0.12); }
.brh-btn.ghost { background: transparent; }
.brh-btn.ghost.risk { border-color: color-mix(in srgb, var(--sd-brc-risk) 60%, transparent); color: var(--sd-brc-risk); }
.brh-btn.icon { padding: 9px 10px; }
.brh-btn.on { border-color: var(--sd-brc-hi); color: var(--sd-brc-hi); background: rgba(220, 38, 38, 0.14); }
.brh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.brh-fb { position: absolute; top: -5px; right: -5px; display: grid; place-items: center; min-width: 15px; height: 15px;
  padding: 0 4px; border-radius: 8px; background: var(--sd-brc-core); color: #fff; font-size: 9px; font-weight: 800; }
.brh-spin { animation: brh-rot 0.9s linear infinite; }

.brh-readouts { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 15px; }
.brh-ro { display: flex; flex-direction: column; gap: 3px; }
.brh-ro i { font-style: normal; font-size: 9px; font-weight: 700; letter-spacing: 0.18em; color: rgba(245, 238, 230, 0.45); }
.brh-ro b { font-size: 15px; font-weight: 800; color: #f5eee9; font-variant-numeric: tabular-nums; }
.brh-ro.warn b { color: var(--sd-brc-risk); }
.brh-ro.teams b { font-size: 12px; font-weight: 700; color: rgba(245, 238, 230, 0.72); }

/* ── docked telemetry lenses ── */
.brh-lensdock { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
  gap: 8px; margin: 14px 16px 14px; }
.brh-lens { position: relative; overflow: hidden; display: flex; align-items: center; gap: 8px; text-align: left;
  padding: 9px 11px; border-radius: 12px; cursor: pointer; font-family: inherit;
  border: 1px solid rgba(245, 238, 230, 0.16); color: #f5eee9;
  background: rgba(12, 6, 7, 0.6); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  transition: border-color 0.2s, background 0.2s; }
.brh-lens:hover { border-color: color-mix(in srgb, var(--lc) 55%, transparent); }
.brh-lens.on { border-color: var(--lc); background: color-mix(in srgb, var(--lc) 16%, rgba(12, 6, 7, 0.62)); }
.brh-lens.stat { cursor: default; }
.bl-ic { flex-shrink: 0; display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px;
  color: var(--lc); background: color-mix(in srgb, var(--lc) 16%, transparent); }
.bl-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.bl-val { font-size: 16px; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
.bl-lb { font-size: 9px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: rgba(245, 238, 230, 0.55);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bl-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--lc); opacity: 0.4;
  transform-origin: left; transform: scaleX(0.25); transition: transform 0.3s var(--sd-spring), opacity 0.3s; }
.brh-lens.on .bl-bar, .brh-lens:hover .bl-bar { transform: scaleX(1); opacity: 0.9; }

/* idle stage (until the instrument mounts) */
.brh-stage-idle { position: absolute; inset: 0; display: grid; place-items: center; background: var(--sd-brc-deep-bg); }
.brh-idle-core { color: var(--sd-brc-core); opacity: 0.85; }
.brh-idle-tick { position: absolute; width: 8px; height: 8px; border-radius: 2px; background: var(--sd-brc-core);
  opacity: 0; animation: brh-fall 2.6s ease-in infinite; }
.brh-idle-tick.t2 { animation-delay: 0.85s; margin-left: 26px; }
.brh-idle-tick.t3 { animation-delay: 1.7s; margin-left: -26px; }

@keyframes brh-live-pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-brc-core) 55%, transparent); } 100% { box-shadow: 0 0 0 10px transparent; } }
@keyframes brh-fall { 0% { transform: translateY(-56px) rotate(0deg); opacity: 0.85; } 100% { transform: translateY(56px) rotate(70deg); opacity: 0; } }
@keyframes brh-rot { to { transform: rotate(360deg); } }

@media (max-width: 940px) {
  .brh { min-height: 0; }
  .brh-console { position: relative; left: 0; top: 0; margin: 16px 16px 0; width: auto; }
  .brh-bleed { min-height: 220px; }
  .brh-scrim { background: linear-gradient(0deg, rgba(10, 5, 6, 0.74) 0%, rgba(10, 5, 6, 0.32) 60%, transparent 100%); }
}

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .brh-live.hot, html:not([data-cinematic="on"]) .brh-idle-tick { animation: none; }
}
</style>
