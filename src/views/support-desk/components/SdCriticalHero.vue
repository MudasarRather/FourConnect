<template>
  <Motion as="section" class="wrh" :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
    <!-- ── full-bleed signature stage (the Seismograph Wall IS the hero backdrop) ── -->
    <div class="wrh-bleed">
      <slot name="instrument">
        <div class="wrh-stage-idle" aria-hidden="true">
          <span class="wrh-idle-ring" /><span class="wrh-idle-ring r2" /><span class="wrh-idle-ring r3" />
          <Siren :size="42" class="wrh-idle-core" />
        </div>
      </slot>
    </div>
    <div class="wrh-grain" aria-hidden="true" />
    <div class="wrh-scrim" aria-hidden="true" />

    <!-- ── glass console over the calm left end ── -->
    <div class="wrh-console">
      <div class="wrh-eyebrow">
        <span class="wrh-live" :class="{ hot: (stats.major_incidents || 0) > 0 }" aria-hidden="true" />
        WAR ROOM · CRITICAL OPS
      </div>
      <h2 class="wrh-title">Hold the <em>line</em>.</h2>
      <p class="wrh-sub">
        Every critical and major incident your team owns — acknowledge fast, mobilize responders,
        keep stakeholders posted on cadence.
      </p>

      <div class="wrh-ctas">
        <Motion as="button" class="wrh-btn primary" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
          :disabled="loading" @click="$emit('ack-next')">
          <ShieldCheck :size="15" /> Acknowledge next
        </Motion>
        <Motion as="button" class="wrh-btn danger" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
          @click="$emit('declare')">
          <Siren :size="15" /> Declare major incident
        </Motion>
        <Motion as="button" class="wrh-btn ghost" :class="{ on: guided }" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }"
          :title="guided ? 'Exit guided mode' : 'Serve the most urgent critical, one at a time'" @click="$emit('guided')">
          <Crosshair :size="15" /> {{ guided ? 'Guided · on' : 'Guided mode' }}
        </Motion>
        <Motion as="button" class="wrh-btn icon ghost" title="Refresh" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.95 }" @click="$emit('refresh')">
          <RefreshCw :size="14" :class="{ 'wrh-spin': loading }" />
        </Motion>
        <Motion as="button" class="wrh-btn icon ghost" :class="{ on: advCount > 0 }" title="Filters"
          :while-hover="{ y: -2 }" :while-tap="{ scale: 0.95 }" @click="$emit('filters')">
          <SlidersHorizontal :size="14" /><span v-if="advCount" class="wrh-fb">{{ advCount }}</span>
        </Motion>
      </div>

      <!-- mission readouts -->
      <div class="wrh-readouts sd-mono">
        <span class="wrh-ro"><i>MTTA</i><b>{{ fmtMin(stats.mtta_minutes) }}</b></span>
        <span class="wrh-ro"><i>MTTR</i><b>{{ fmtMin(stats.mttr_minutes) }}</b></span>
        <span class="wrh-ro" :class="{ warn: (stats.ack_coverage ?? 100) < 70 }"><i>ACK COVERAGE</i><b>{{ stats.ack_coverage ?? 100 }}%</b></span>
        <span v-if="teamLine" class="wrh-ro teams"><i>SCOPE</i><b>{{ teamLine }}</b></span>
      </div>
    </div>

    <!-- ── telemetry lenses docked on the bottom ruling ── -->
    <div class="wrh-lensdock" role="tablist" aria-label="Critical lenses">
      <Motion v-for="(l, i) in lenses" :key="l.key" as="button" class="wrh-lens"
        :class="{ on: activeLens === l.key, stat: l.stat }" :style="{ '--lc': l.color }"
        role="tab" :aria-selected="activeLens === l.key"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.18 + i * 0.045, ease: [0.16, 1, 0.3, 1] }"
        :while-hover="l.stat ? undefined : { y: -3 }" :while-tap="l.stat ? undefined : { scale: 0.97 }"
        @click="$emit('pick', l)">
        <span class="wl-ic"><component :is="l.icon" :size="14" /></span>
        <span class="wl-body">
          <span class="wl-val"><SdCountUp v-if="typeof l.value === 'number'" :value="l.value" /><template v-else>{{ l.value }}</template></span>
          <span class="wl-lb">{{ l.label }}</span>
        </span>
        <span class="wl-bar" aria-hidden="true" />
      </Motion>
    </div>
  </Motion>
</template>

<script setup>
/* SdCriticalHero — the War Room banner (Seismograph Wall layout, gallery pick 01):
   the signature instrument runs FULL-BLEED as the hero backdrop, a glass console
   (eyebrow/title/CTAs/MTTA·MTTR readouts) floats over the calm left end, and the
   telemetry lenses dock along the bottom ruling. Accent = --sd-crit-*. */
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Siren, ShieldCheck, Crosshair, RefreshCw, SlidersHorizontal } from 'lucide-vue-next'
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
defineEmits(['pick', 'ack-next', 'declare', 'guided', 'refresh', 'filters'])

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
.wrh { position: relative; overflow: hidden; isolation: isolate; border: 1px solid var(--sd-crit-brd); border-radius: 22px;
  background: var(--sd-crit-deep-bg); min-height: clamp(470px, 43vw, 570px);
  display: flex; flex-direction: column; justify-content: flex-end; }
[data-theme="light"] .wrh { background: #f4eee0; }

.wrh-bleed { position: absolute; inset: 0; z-index: 0; }
.wrh-grain { position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: 0.45; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E"); }
/* console-legibility scrim: calm left end + docked-lens footing */
.wrh-scrim { position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background:
    linear-gradient(90deg, rgba(8, 9, 12, 0.62) 0%, rgba(8, 9, 12, 0.34) 34%, transparent 58%),
    linear-gradient(0deg, rgba(8, 9, 12, 0.66) 0%, transparent 26%); }
[data-theme="light"] .wrh-scrim {
  background:
    linear-gradient(90deg, rgba(247, 242, 232, 0.72) 0%, rgba(247, 242, 232, 0.4) 34%, transparent 58%),
    linear-gradient(0deg, rgba(247, 242, 232, 0.78) 0%, transparent 26%); }

/* ── glass console ── */
.wrh-console { position: absolute; z-index: 2; left: 22px; top: 22px; width: min(440px, calc(100% - 44px));
  padding: 20px 22px; border-radius: 18px; border: 1px solid var(--sd-border-strong);
  background: rgba(10, 11, 15, 0.52); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
[data-theme="light"] .wrh-console { background: rgba(250, 246, 238, 0.6); }

.wrh-eyebrow { display: inline-flex; align-items: center; gap: 9px; font-size: 10.5px; font-weight: 800;
  letter-spacing: 0.22em; color: var(--sd-crit-core); font-family: var(--sd-font-mono, ui-monospace); }
.wrh-live { width: 8px; height: 8px; border-radius: 50%; background: var(--sd-crit-ack); }
.wrh-live.hot { background: var(--sd-crit-core); animation: wrh-live-pulse 1.4s ease-out infinite; }
.wrh-title { margin: 11px 0 7px; font-size: clamp(26px, 3vw, 38px); line-height: 1.04; font-weight: 800;
  letter-spacing: -0.02em; color: var(--sd-text); }
.wrh-title em { font-style: normal; background: var(--sd-crit-grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
.wrh-sub { margin: 0 0 15px; max-width: 44ch; font-size: 13px; line-height: 1.55; color: var(--sd-text-secondary); }

.wrh-ctas { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.wrh-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 12px;
  font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); position: relative; }
.wrh-btn.primary { border-color: transparent; color: #052e1f; background: linear-gradient(135deg, #6ee7b7, var(--sd-crit-ack)); box-shadow: 0 8px 22px -10px var(--sd-crit-ack); }
[data-theme="light"] .wrh-btn.primary { color: #064e3b; }
.wrh-btn.danger { border-color: color-mix(in srgb, var(--sd-crit-core) 55%, transparent); color: var(--sd-crit-core); background: var(--sd-crit-soft); }
.wrh-btn.ghost { background: transparent; }
.wrh-btn.icon { padding: 9px 10px; }
.wrh-btn.on { border-color: var(--sd-crit-core); color: var(--sd-crit-core); background: var(--sd-crit-soft); }
.wrh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.wrh-fb { position: absolute; top: -5px; right: -5px; display: grid; place-items: center; min-width: 15px; height: 15px;
  padding: 0 4px; border-radius: 8px; background: var(--sd-crit-core); color: #fff; font-size: 9px; font-weight: 800; }
.wrh-spin { animation: wrh-rot 0.9s linear infinite; }

.wrh-readouts { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 15px; }
.wrh-ro { display: flex; flex-direction: column; gap: 3px; }
.wrh-ro i { font-style: normal; font-size: 9px; font-weight: 700; letter-spacing: 0.18em; color: var(--sd-text-dim); }
.wrh-ro b { font-size: 15px; font-weight: 800; color: var(--sd-text); font-variant-numeric: tabular-nums; }
.wrh-ro.warn b { color: var(--sd-warning); }
.wrh-ro.teams b { font-size: 12px; font-weight: 700; color: var(--sd-text-secondary); }

/* ── docked telemetry lenses ── */
.wrh-lensdock { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
  gap: 8px; margin: 14px 16px 14px; }
.wrh-lens { position: relative; overflow: hidden; display: flex; align-items: center; gap: 8px; text-align: left;
  padding: 9px 11px; border-radius: 12px; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); color: var(--sd-text);
  background: rgba(10, 11, 15, 0.55); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  transition: border-color 0.2s, background 0.2s; }
[data-theme="light"] .wrh-lens { background: rgba(250, 246, 238, 0.66); }
.wrh-lens:hover { border-color: color-mix(in srgb, var(--lc) 55%, transparent); }
.wrh-lens.on { border-color: var(--lc); background: color-mix(in srgb, var(--lc) 14%, rgba(10, 11, 15, 0.6)); }
[data-theme="light"] .wrh-lens.on { background: color-mix(in srgb, var(--lc) 12%, rgba(250, 246, 238, 0.75)); }
.wrh-lens.stat { cursor: default; }
.wl-ic { flex-shrink: 0; display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px;
  color: var(--lc); background: color-mix(in srgb, var(--lc) 14%, transparent); }
.wl-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.wl-val { font-size: 16px; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
.wl-lb { font-size: 9px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--sd-text-muted);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wl-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--lc); opacity: 0.4;
  transform-origin: left; transform: scaleX(0.25); transition: transform 0.3s var(--sd-spring), opacity 0.3s; }
.wrh-lens.on .wl-bar, .wrh-lens:hover .wl-bar { transform: scaleX(1); opacity: 0.9; }

/* idle stage (until the instrument mounts) */
.wrh-stage-idle { position: absolute; inset: 0; display: grid; place-items: center; background: var(--sd-crit-deep-bg); }
.wrh-idle-core { color: var(--sd-crit-core); opacity: 0.85; }
.wrh-idle-ring { position: absolute; width: 70px; height: 70px; border-radius: 50%; border: 1px solid var(--sd-crit-core);
  opacity: 0; animation: wrh-ring 2.8s ease-out infinite; }
.wrh-idle-ring.r2 { animation-delay: 0.9s; }
.wrh-idle-ring.r3 { animation-delay: 1.8s; }

@keyframes wrh-live-pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-crit-core) 55%, transparent); } 100% { box-shadow: 0 0 0 10px transparent; } }
@keyframes wrh-ring { 0% { transform: scale(0.6); opacity: 0.7; } 100% { transform: scale(3.4); opacity: 0; } }
@keyframes wrh-rot { to { transform: rotate(360deg); } }

@media (max-width: 940px) {
  .wrh { min-height: 0; }
  .wrh-console { position: relative; left: 0; top: 0; margin: 16px 16px 0; width: auto; }
  .wrh-bleed { min-height: 220px; }
  .wrh-scrim { background: linear-gradient(0deg, rgba(8, 9, 12, 0.72) 0%, rgba(8, 9, 12, 0.3) 60%, transparent 100%); }
  [data-theme="light"] .wrh-scrim { background: linear-gradient(0deg, rgba(247, 242, 232, 0.8) 0%, rgba(247, 242, 232, 0.35) 60%, transparent 100%); }
}

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .wrh-live.hot, html:not([data-cinematic="on"]) .wrh-idle-ring { animation: none; }
}
</style>
