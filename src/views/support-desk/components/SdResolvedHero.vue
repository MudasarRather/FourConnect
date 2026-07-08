<template>
  <Motion as="section" class="rsh" :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
    <!-- ── full-bleed signature stage (the instrument IS the hero backdrop) ── -->
    <div class="rsh-bleed">
      <slot name="instrument">
        <div class="rsh-stage-idle" aria-hidden="true">
          <span class="rsh-idle-halo h1" /><span class="rsh-idle-halo h2" /><span class="rsh-idle-halo h3" />
          <CircleCheck :size="42" class="rsh-idle-core" />
        </div>
      </slot>
    </div>
    <div class="rsh-grain" aria-hidden="true" />
    <div class="rsh-scrim" aria-hidden="true" />

    <!-- ── glass console over the calm left air ── -->
    <div class="rsh-console">
      <div class="rsh-eyebrow">
        <span class="rsh-live" :class="{ hot: (stats.overdue_close || 0) > 0 }" aria-hidden="true" />
        RESOLVED · CLOSEOUT DESK
      </div>
      <h2 class="rsh-title">The work held. <em>Now seal it.</em></h2>
      <p class="rsh-sub">
        Every fix here is inside its {{ windowDays }}-day proving window — the customer can still
        send it back. Verify the resolution, collect the rating, and walk it through the
        quality gate into the archive.
      </p>

      <div class="rsh-ctas">
        <Motion as="button" class="rsh-btn primary" :class="{ on: guided }" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
          :disabled="loading" title="Step through the ranked closeout queue — lowest CSAT and oldest shelf first" @click="$emit('run')">
          <BadgeCheck :size="15" /> {{ guided ? 'Closeout run · on' : 'Start closeout run' }}
        </Motion>
        <Motion v-if="(stats.due_close_24h || 0) > 0" as="button" class="rsh-btn brass"
          :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
          title="Jump to the auto-close rail — these seal themselves within 24h" @click="$emit('pendingclose')">
          <Timer :size="15" /> {{ stats.due_close_24h }} closing in 24h
        </Motion>
        <Motion v-if="(stats.csat_low || 0) > 0" as="button" class="rsh-btn ghost risk"
          :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }"
          title="Rated 2★ or below in the last 30 days — review before they bounce" @click="$emit('lowcsat')">
          <Star :size="15" /> {{ stats.csat_low }} low rating{{ stats.csat_low === 1 ? '' : 's' }}
        </Motion>
        <Motion as="button" class="rsh-btn icon ghost" title="Refresh" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.95 }" @click="$emit('refresh')">
          <RefreshCw :size="14" :class="{ 'rsh-spin': loading }" />
        </Motion>
        <Motion as="button" class="rsh-btn icon ghost" :class="{ on: advCount > 0 }" title="Filters"
          :while-hover="{ y: -2 }" :while-tap="{ scale: 0.95 }" @click="$emit('filters')">
          <SlidersHorizontal :size="14" /><span v-if="advCount" class="rsh-fb">{{ advCount }}</span>
        </Motion>
      </div>

      <!-- closeout readouts -->
      <div class="rsh-readouts sd-mono">
        <span class="rsh-ro ok"><i>RESOLVED TODAY</i><b>{{ stats.resolved_today ?? 0 }}</b></span>
        <span class="rsh-ro"><i>MTTR · P50</i><b>{{ fmtMin(stats.mttr_p50_minutes) }}</b></span>
        <span class="rsh-ro brass"><i>CSAT · 30D</i><b>{{ stats.csat_avg != null ? stats.csat_avg.toFixed(1) + '★' : '—' }}</b></span>
        <span class="rsh-ro"><i>ONE-TOUCH</i><b>{{ stats.fcr_30d_pct != null ? stats.fcr_30d_pct + '%' : '—' }}</b></span>
        <span class="rsh-ro"><i>FIXES THAT HELD</i><b>{{ survivalPct }}</b></span>
        <span v-if="teamLine" class="rsh-ro teams"><i>SCOPE</i><b>{{ teamLine }}</b></span>
      </div>
    </div>

    <!-- ── telemetry lenses docked along the gate's edge ── -->
    <div class="rsh-lensdock" role="tablist" aria-label="Resolved lenses">
      <Motion v-for="(l, i) in lenses" :key="l.key" as="button" class="rsh-lens"
        :class="{ on: activeLens === l.key, stat: l.stat }" :style="{ '--lc': l.color }"
        role="tab" :aria-selected="activeLens === l.key"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.18 + i * 0.045, ease: [0.16, 1, 0.3, 1] }"
        :while-hover="l.stat ? undefined : { y: -3 }" :while-tap="l.stat ? undefined : { scale: 0.97 }"
        @click="$emit('pick', l)">
        <span class="rs-ic"><component :is="l.icon" :size="14" /></span>
        <span class="rs-body">
          <span class="rs-val"><SdCountUp v-if="typeof l.value === 'number'" :value="l.value" /><template v-else>{{ l.value }}</template></span>
          <span class="rs-lb">{{ l.label }}</span>
        </span>
        <span class="rs-bar" aria-hidden="true" />
      </Motion>
    </div>
  </Motion>
</template>

<script setup>
/* SdResolvedHero — the Closeout banner (full-bleed instrument backdrop, glass console over
   the calm left air, lens dock along the bottom). Accent = --sd-res-*.
   Same layout contract as SdReopenedHero / SdOverdueHero with the quality-gate identity:
   emerald = the fix that held, brass = the seal / CSAT voice, amber = the auto-close
   countdown, rose = a low rating / bounced fix. */
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { CircleCheck, BadgeCheck, Timer, Star, RefreshCw, SlidersHorizontal } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'
import { SUPPORT_AUTOCLOSE_DAYS } from '@/composables/useSupportDesk'

const props = defineProps({
  lenses: { type: Array, default: () => [] },
  activeLens: { type: String, default: 'all' },
  stats: { type: Object, default: () => ({}) },
  guided: { type: Boolean, default: false },
  advCount: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
  reduced: { type: Boolean, default: false },
})
defineEmits(['pick', 'run', 'pendingclose', 'lowcsat', 'refresh', 'filters'])

const windowDays = SUPPORT_AUTOCLOSE_DAYS
const fmtMin = (m) => {
  if (m == null) return '—'
  if (m < 60) return `${Math.round(m)}m`
  if (m < 1440) return `${(m / 60).toFixed(1)}h`
  return `${(m / 1440).toFixed(1)}d`
}
const survivalPct = computed(() => {
  const r = props.stats.reopen_rate_30d
  if (r == null) return '—'
  return `${Math.max(0, Math.round((100 - r) * 10) / 10)}%`
})
const teamLine = computed(() => {
  const names = props.stats.team_names || []
  if (!names.length) return ''
  return names.length <= 2 ? names.join(' · ') : `${names.length} teams`
})
</script>

<style scoped>
.rsh { position: relative; overflow: hidden; isolation: isolate; border: 1px solid var(--sd-res-brd); border-radius: 22px;
  background: var(--sd-res-deep-bg); min-height: clamp(470px, 43vw, 570px);
  display: flex; flex-direction: column; justify-content: flex-end; }
[data-theme="light"] .rsh { background: #eef5ef; }

.rsh-bleed { position: absolute; inset: 0; z-index: 0; }
.rsh-grain { position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: 0.45; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E"); }
/* console-legibility scrim: calm left air + docked-lens footing */
.rsh-scrim { position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background:
    linear-gradient(90deg, rgba(2, 12, 8, 0.64) 0%, rgba(2, 12, 8, 0.36) 34%, transparent 58%),
    linear-gradient(0deg, rgba(2, 12, 8, 0.68) 0%, transparent 26%); }
[data-theme="light"] .rsh-scrim {
  background:
    linear-gradient(90deg, rgba(2, 12, 8, 0.55) 0%, rgba(2, 12, 8, 0.3) 34%, transparent 58%),
    linear-gradient(0deg, rgba(2, 12, 8, 0.6) 0%, transparent 26%); }

/* ── glass console ── */
.rsh-console { position: absolute; z-index: 2; left: 22px; top: 22px; width: min(452px, calc(100% - 44px));
  padding: 20px 22px; border-radius: 18px; border: 1px solid var(--sd-border-strong);
  background: rgba(3, 12, 8, 0.56); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
/* the vault air stays dark in BOTH themes, so the console stays dark-glass too —
   text inside uses literal light ink, not the theme tokens */
.rsh-console, [data-theme="light"] .rsh-console { color: #edf7f1; }

.rsh-eyebrow { display: inline-flex; align-items: center; gap: 9px; font-size: 10.5px; font-weight: 800;
  letter-spacing: 0.22em; color: var(--sd-res-hi); font-family: var(--sd-font-mono, ui-monospace); }
.rsh-live { width: 8px; height: 8px; border-radius: 50%; background: var(--sd-res-core); }
.rsh-live.hot { background: var(--sd-res-close); animation: rsh-live-pulse 1.4s ease-out infinite; }
/* !important defeats theme-light-rescue's `[class*="page"] h2` catch-all — this console
   sits on the dark vault air in BOTH themes, so its ink stays light. */
.rsh-title { margin: 11px 0 7px; font-size: clamp(26px, 3vw, 38px); line-height: 1.04; font-weight: 800;
  letter-spacing: -0.02em; color: #f0f8f3 !important; }
.rsh-title em { font-style: normal; background: var(--sd-res-grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
[data-theme="light"] .rsh-title em { background: linear-gradient(122deg, #a7f3d0 0%, #5eead4 48%, #10b981 100%); -webkit-background-clip: text; background-clip: text; }
.rsh-sub { margin: 0 0 15px; max-width: 46ch; font-size: 13px; line-height: 1.55; color: rgba(237, 247, 241, 0.72); }

.rsh-ctas { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.rsh-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 12px;
  font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid rgba(237, 247, 241, 0.2); background: rgba(237, 247, 241, 0.06); color: #edf7f1; position: relative; }
.rsh-btn.primary { border-color: transparent; color: #052e1f; background: linear-gradient(135deg, #6ee7b7, var(--sd-res-core)); box-shadow: 0 8px 22px -10px var(--sd-res-core); }
.rsh-btn.primary.on { box-shadow: 0 0 0 2px color-mix(in srgb, var(--sd-res-core) 60%, transparent), 0 8px 22px -10px var(--sd-res-core); }
.rsh-btn.brass { border-color: color-mix(in srgb, var(--sd-res-brass) 60%, transparent); color: var(--sd-res-close); background: rgba(217, 164, 65, 0.12); }
.rsh-btn.ghost { background: transparent; }
.rsh-btn.ghost.risk { border-color: color-mix(in srgb, var(--sd-res-risk) 60%, transparent); color: var(--sd-res-risk); }
.rsh-btn.icon { padding: 9px 10px; }
.rsh-btn.icon.on { border-color: var(--sd-res-hi); color: var(--sd-res-hi); background: rgba(16, 185, 129, 0.14); }
.rsh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.rsh-fb { position: absolute; top: -5px; right: -5px; display: grid; place-items: center; min-width: 15px; height: 15px;
  padding: 0 4px; border-radius: 8px; background: var(--sd-res-core); color: #04120c; font-size: 9px; font-weight: 800; }
.rsh-spin { animation: rsh-rot 0.9s linear infinite; }

.rsh-readouts { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 15px; }
.rsh-ro { display: flex; flex-direction: column; gap: 3px; }
.rsh-ro i { font-style: normal; font-size: 9px; font-weight: 700; letter-spacing: 0.18em; color: rgba(237, 247, 241, 0.45); }
.rsh-ro b { font-size: 15px; font-weight: 800; color: #edf7f1; font-variant-numeric: tabular-nums; }
.rsh-ro.ok b { color: var(--sd-res-hi); }
.rsh-ro.brass b { color: var(--sd-res-brass); }
.rsh-ro.teams b { font-size: 12px; font-weight: 700; color: rgba(237, 247, 241, 0.72); }

/* ── docked telemetry lenses ── */
.rsh-lensdock { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
  gap: 8px; margin: 14px 16px 14px; }
.rsh-lens { position: relative; overflow: hidden; display: flex; align-items: center; gap: 8px; text-align: left;
  padding: 9px 11px; border-radius: 12px; cursor: pointer; font-family: inherit;
  border: 1px solid rgba(237, 247, 241, 0.16); color: #edf7f1;
  background: rgba(3, 12, 8, 0.6); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  transition: border-color 0.2s, background 0.2s; }
.rsh-lens:hover { border-color: color-mix(in srgb, var(--lc) 55%, transparent); }
.rsh-lens.on { border-color: var(--lc); background: color-mix(in srgb, var(--lc) 16%, rgba(3, 12, 8, 0.62)); }
.rsh-lens.stat { cursor: default; }
.rs-ic { flex-shrink: 0; display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px;
  color: var(--lc); background: color-mix(in srgb, var(--lc) 16%, transparent); }
.rs-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.rs-val { font-size: 16px; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
.rs-lb { font-size: 9px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: rgba(237, 247, 241, 0.55);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rs-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--lc); opacity: 0.4;
  transform-origin: left; transform: scaleX(0.25); transition: transform 0.3s var(--sd-spring), opacity 0.3s; }
.rsh-lens.on .rs-bar, .rsh-lens:hover .rs-bar { transform: scaleX(1); opacity: 0.9; }

/* idle stage (until the instrument mounts) — breathing emerald halos */
.rsh-stage-idle { position: absolute; inset: 0; display: grid; place-items: center; background: var(--sd-res-deep-bg); }
.rsh-idle-core { color: var(--sd-res-core); opacity: 0.85; }
.rsh-idle-halo { position: absolute; border: 1px solid color-mix(in srgb, var(--sd-res-core) 35%, transparent);
  border-radius: 50%; animation: rsh-breathe 5s ease-in-out infinite; }
.rsh-idle-halo.h1 { width: 120px; height: 120px; }
.rsh-idle-halo.h2 { width: 190px; height: 190px; animation-delay: 0.7s; }
.rsh-idle-halo.h3 { width: 268px; height: 268px; animation-delay: 1.4s; }

@keyframes rsh-live-pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-res-close) 55%, transparent); } 100% { box-shadow: 0 0 0 10px transparent; } }
@keyframes rsh-breathe { 0%, 100% { transform: scale(0.96); opacity: 0.4; } 50% { transform: scale(1.04); opacity: 0.9; } }
@keyframes rsh-rot { to { transform: rotate(360deg); } }

@media (max-width: 940px) {
  .rsh { min-height: 0; }
  .rsh-console { position: relative; left: 0; top: 0; margin: 16px 16px 0; width: auto; }
  .rsh-bleed { min-height: 220px; }
  .rsh-scrim { background: linear-gradient(0deg, rgba(2, 12, 8, 0.74) 0%, rgba(2, 12, 8, 0.32) 60%, transparent 100%); }
}

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .rsh-live.hot, html:not([data-cinematic="on"]) .rsh-idle-halo { animation: none; }
}
</style>
