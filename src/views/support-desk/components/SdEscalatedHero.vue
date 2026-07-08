<template>
  <Motion as="section" class="euh" :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
    <!-- ── full-bleed signature stage (the Thermal Updraft IS the hero backdrop) ── -->
    <div class="euh-bleed">
      <slot name="instrument">
        <div class="euh-stage-idle" aria-hidden="true">
          <span class="euh-idle-flame f1" /><span class="euh-idle-flame f2" /><span class="euh-idle-flame f3" />
          <ChevronsUp :size="42" class="euh-idle-core" />
        </div>
      </slot>
    </div>
    <div class="euh-grain" aria-hidden="true" />
    <div class="euh-scrim" aria-hidden="true" />

    <!-- ── glass console over the calm left air ── -->
    <div class="euh-console">
      <div class="euh-eyebrow">
        <span class="euh-live" :class="{ hot: (stats.esc_response_overdue || 0) > 0 }" aria-hidden="true" />
        CHAIN OF COMMAND · ESCALATED OPS
      </div>
      <h2 class="euh-title">What rises, <em>burns</em>.</h2>
      <p class="euh-sub">
        Every escalation your team carries, riding the thermal — the longer it waits at a tier,
        the higher and hotter it climbs. Acknowledge fast, route it right, bring it back down.
      </p>

      <div class="euh-ctas">
        <Motion as="button" class="euh-btn primary" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
          :disabled="loading" @click="$emit('ack-next')">
          <ShieldCheck :size="15" /> Acknowledge next
        </Motion>
        <Motion as="button" class="euh-btn ember" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
          title="Serve the hottest escalation, one at a time" :class="{ on: guided }" @click="$emit('guided')">
          <Crosshair :size="15" /> {{ guided ? 'Guided · on' : 'Guided sweep' }}
        </Motion>
        <Motion v-if="(stats.sla_breach_candidates || 0) > 0" as="button" class="euh-btn ghost warn"
          :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }"
          title="Breached tickets not yet escalated — review them on the Breached tab" @click="$emit('candidates')">
          <Flame :size="15" /> {{ stats.sla_breach_candidates }} breach candidate{{ stats.sla_breach_candidates === 1 ? '' : 's' }}
        </Motion>
        <Motion as="button" class="euh-btn icon ghost" title="Refresh" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.95 }" @click="$emit('refresh')">
          <RefreshCw :size="14" :class="{ 'euh-spin': loading }" />
        </Motion>
        <Motion as="button" class="euh-btn icon ghost" :class="{ on: advCount > 0 }" title="Filters"
          :while-hover="{ y: -2 }" :while-tap="{ scale: 0.95 }" @click="$emit('filters')">
          <SlidersHorizontal :size="14" /><span v-if="advCount" class="euh-fb">{{ advCount }}</span>
        </Motion>
      </div>

      <!-- mission readouts -->
      <div class="euh-readouts sd-mono">
        <span class="euh-ro"><i>eMTTA</i><b>{{ fmtMin(stats.emtta_minutes) }}</b></span>
        <span class="euh-ro"><i>AVG DWELL</i><b>{{ fmtMin(stats.avg_dwell_minutes) }}</b></span>
        <span class="euh-ro" :class="{ warn: (stats.ack_coverage ?? 100) < 70 }"><i>ACK COVERAGE</i><b>{{ stats.ack_coverage ?? 100 }}%</b></span>
        <span v-if="teamLine" class="euh-ro teams"><i>SCOPE</i><b>{{ teamLine }}</b></span>
      </div>
    </div>

    <!-- ── telemetry lenses docked along the bed ── -->
    <div class="euh-lensdock" role="tablist" aria-label="Escalation lenses">
      <Motion v-for="(l, i) in lenses" :key="l.key" as="button" class="euh-lens"
        :class="{ on: activeLens === l.key, stat: l.stat }" :style="{ '--lc': l.color }"
        role="tab" :aria-selected="activeLens === l.key"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.18 + i * 0.045, ease: [0.16, 1, 0.3, 1] }"
        :while-hover="l.stat ? undefined : { y: -3 }" :while-tap="l.stat ? undefined : { scale: 0.97 }"
        @click="$emit('pick', l)">
        <span class="el-ic"><component :is="l.icon" :size="14" /></span>
        <span class="el-body">
          <span class="el-val"><SdCountUp v-if="typeof l.value === 'number'" :value="l.value" /><template v-else>{{ l.value }}</template></span>
          <span class="el-lb">{{ l.label }}</span>
        </span>
        <span class="el-bar" aria-hidden="true" />
      </Motion>
    </div>
  </Motion>
</template>

<script setup>
/* SdEscalatedHero — the Thermal Updraft banner (full-bleed instrument backdrop, glass
   console over the calm left air, lens dock along the fire-bed). Accent = --sd-esc-*.
   Same layout contract as SdCriticalHero (the seismograph shell) with the ember identity. */
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { ChevronsUp, ShieldCheck, Crosshair, RefreshCw, SlidersHorizontal, Flame } from 'lucide-vue-next'
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
defineEmits(['pick', 'ack-next', 'guided', 'candidates', 'refresh', 'filters'])

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
.euh { position: relative; overflow: hidden; isolation: isolate; border: 1px solid var(--sd-esc-brd); border-radius: 22px;
  background: var(--sd-esc-deep-bg); min-height: clamp(470px, 43vw, 570px);
  display: flex; flex-direction: column; justify-content: flex-end; }
[data-theme="light"] .euh { background: #f6efe0; }

.euh-bleed { position: absolute; inset: 0; z-index: 0; }
.euh-grain { position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: 0.45; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E"); }
/* console-legibility scrim: calm left air + docked-lens footing */
.euh-scrim { position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background:
    linear-gradient(90deg, rgba(10, 8, 5, 0.62) 0%, rgba(10, 8, 5, 0.34) 34%, transparent 58%),
    linear-gradient(0deg, rgba(10, 8, 5, 0.66) 0%, transparent 26%); }
[data-theme="light"] .euh-scrim {
  background:
    linear-gradient(90deg, rgba(248, 241, 228, 0.74) 0%, rgba(248, 241, 228, 0.4) 34%, transparent 58%),
    linear-gradient(0deg, rgba(248, 241, 228, 0.78) 0%, transparent 26%); }

/* ── glass console ── */
.euh-console { position: absolute; z-index: 2; left: 22px; top: 22px; width: min(444px, calc(100% - 44px));
  padding: 20px 22px; border-radius: 18px; border: 1px solid var(--sd-border-strong);
  background: rgba(13, 10, 6, 0.52); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
[data-theme="light"] .euh-console { background: rgba(252, 247, 238, 0.62); }

.euh-eyebrow { display: inline-flex; align-items: center; gap: 9px; font-size: 10.5px; font-weight: 800;
  letter-spacing: 0.22em; color: var(--sd-esc-core); font-family: var(--sd-font-mono, ui-monospace); }
.euh-live { width: 8px; height: 8px; border-radius: 50%; background: var(--sd-esc-ack); }
.euh-live.hot { background: var(--sd-esc-core); animation: euh-live-pulse 1.4s ease-out infinite; }
.euh-title { margin: 11px 0 7px; font-size: clamp(26px, 3vw, 38px); line-height: 1.04; font-weight: 800;
  letter-spacing: -0.02em; color: var(--sd-text); }
.euh-title em { font-style: normal; background: var(--sd-esc-grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
.euh-sub { margin: 0 0 15px; max-width: 46ch; font-size: 13px; line-height: 1.55; color: var(--sd-text-secondary); }

.euh-ctas { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.euh-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 12px;
  font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); position: relative; }
.euh-btn.primary { border-color: transparent; color: #052e1f; background: linear-gradient(135deg, #6ee7b7, var(--sd-esc-ack)); box-shadow: 0 8px 22px -10px var(--sd-esc-ack); }
[data-theme="light"] .euh-btn.primary { color: #064e3b; }
.euh-btn.ember { border-color: color-mix(in srgb, var(--sd-esc-core) 55%, transparent); color: var(--sd-esc-core); background: var(--sd-esc-soft); }
.euh-btn.ghost { background: transparent; }
.euh-btn.ghost.warn { border-color: color-mix(in srgb, var(--sd-esc-auto) 55%, transparent); color: var(--sd-esc-auto); }
.euh-btn.icon { padding: 9px 10px; }
.euh-btn.on { border-color: var(--sd-esc-core); color: var(--sd-esc-core); background: var(--sd-esc-soft); }
.euh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.euh-fb { position: absolute; top: -5px; right: -5px; display: grid; place-items: center; min-width: 15px; height: 15px;
  padding: 0 4px; border-radius: 8px; background: var(--sd-esc-core); color: #fff; font-size: 9px; font-weight: 800; }
.euh-spin { animation: euh-rot 0.9s linear infinite; }

.euh-readouts { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 15px; }
.euh-ro { display: flex; flex-direction: column; gap: 3px; }
.euh-ro i { font-style: normal; font-size: 9px; font-weight: 700; letter-spacing: 0.18em; color: var(--sd-text-dim); }
.euh-ro b { font-size: 15px; font-weight: 800; color: var(--sd-text); font-variant-numeric: tabular-nums; }
.euh-ro.warn b { color: var(--sd-warning); }
.euh-ro.teams b { font-size: 12px; font-weight: 700; color: var(--sd-text-secondary); }

/* ── docked telemetry lenses ── */
.euh-lensdock { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
  gap: 8px; margin: 14px 16px 14px; }
.euh-lens { position: relative; overflow: hidden; display: flex; align-items: center; gap: 8px; text-align: left;
  padding: 9px 11px; border-radius: 12px; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); color: var(--sd-text);
  background: rgba(13, 10, 6, 0.55); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  transition: border-color 0.2s, background 0.2s; }
[data-theme="light"] .euh-lens { background: rgba(252, 247, 238, 0.68); }
.euh-lens:hover { border-color: color-mix(in srgb, var(--lc) 55%, transparent); }
.euh-lens.on { border-color: var(--lc); background: color-mix(in srgb, var(--lc) 14%, rgba(13, 10, 6, 0.6)); }
[data-theme="light"] .euh-lens.on { background: color-mix(in srgb, var(--lc) 12%, rgba(252, 247, 238, 0.78)); }
.euh-lens.stat { cursor: default; }
.el-ic { flex-shrink: 0; display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px;
  color: var(--lc); background: color-mix(in srgb, var(--lc) 14%, transparent); }
.el-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.el-val { font-size: 16px; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
.el-lb { font-size: 9px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--sd-text-muted);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.el-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--lc); opacity: 0.4;
  transform-origin: left; transform: scaleX(0.25); transition: transform 0.3s var(--sd-spring), opacity 0.3s; }
.euh-lens.on .el-bar, .euh-lens:hover .el-bar { transform: scaleX(1); opacity: 0.9; }

/* idle stage (until the instrument mounts) */
.euh-stage-idle { position: absolute; inset: 0; display: grid; place-items: center; background: var(--sd-esc-deep-bg); }
.euh-idle-core { color: var(--sd-esc-core); opacity: 0.85; }
.euh-idle-flame { position: absolute; width: 8px; height: 8px; border-radius: 50%; background: var(--sd-esc-core);
  opacity: 0; animation: euh-rise 2.6s ease-out infinite; }
.euh-idle-flame.f2 { animation-delay: 0.85s; margin-left: 26px; }
.euh-idle-flame.f3 { animation-delay: 1.7s; margin-left: -26px; }

@keyframes euh-live-pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-esc-core) 55%, transparent); } 100% { box-shadow: 0 0 0 10px transparent; } }
@keyframes euh-rise { 0% { transform: translateY(46px) scale(1); opacity: 0.85; } 100% { transform: translateY(-64px) scale(0.4); opacity: 0; } }
@keyframes euh-rot { to { transform: rotate(360deg); } }

@media (max-width: 940px) {
  .euh { min-height: 0; }
  .euh-console { position: relative; left: 0; top: 0; margin: 16px 16px 0; width: auto; }
  .euh-bleed { min-height: 220px; }
  .euh-scrim { background: linear-gradient(0deg, rgba(10, 8, 5, 0.72) 0%, rgba(10, 8, 5, 0.3) 60%, transparent 100%); }
  [data-theme="light"] .euh-scrim { background: linear-gradient(0deg, rgba(248, 241, 228, 0.8) 0%, rgba(248, 241, 228, 0.35) 60%, transparent 100%); }
}

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .euh-live.hot, html:not([data-cinematic="on"]) .euh-idle-flame { animation: none; }
}
</style>
