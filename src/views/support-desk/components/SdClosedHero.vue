<template>
  <Motion as="section" class="clh" :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
    <!-- ── full-bleed signature stage (the instrument IS the hero backdrop) ── -->
    <div class="clh-bleed">
      <slot name="instrument">
        <div class="clh-stage-idle" aria-hidden="true">
          <span class="clh-idle-ring r1" /><span class="clh-idle-ring r2" /><span class="clh-idle-ring r3" />
          <Landmark :size="42" class="clh-idle-core" />
        </div>
      </slot>
    </div>
    <div class="clh-grain" aria-hidden="true" />
    <div class="clh-scrim" aria-hidden="true" />

    <!-- ── glass console over the calm left air ── -->
    <div class="clh-console">
      <div class="clh-eyebrow">
        <span class="clh-live" :class="{ hot: (stats.reopened_from_closed_30d || 0) > 0 }" aria-hidden="true" />
        CLOSED · ARCHIVE OF RECORD
      </div>
      <h2 class="clh-title">Sealed. <em>On the record.</em></h2>
      <p class="clh-sub">
        Every finished ticket lands here with its provenance — who sealed it, how, and the
        customer's verdict. The record is permanent: continue a story with a follow-up,
        harvest the fix into knowledge, or exhume it if support must reopen the case.
      </p>

      <div class="clh-ctas">
        <Motion v-if="agent" as="button" class="clh-btn primary" :class="{ on: harvestOn }" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
          :disabled="loading" title="Step through promotable fixes and turn them into draft knowledge articles" @click="$emit('harvest')">
          <BookMarked :size="15" /> {{ harvestOn ? 'Knowledge harvest · on' : 'Start knowledge harvest' }}
          <span v-if="!harvestOn && (stats.kb_candidates_30d || 0) > 0" class="clh-cta-n">{{ stats.kb_candidates_30d }}</span>
        </Motion>
        <Motion v-if="(stats.open_follow_ups || 0) > 0" as="button" class="clh-btn seal"
          :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
          title="Continuation cases spawned from sealed records that are still being worked" @click="$emit('followups')">
          <Link2 :size="15" /> {{ stats.open_follow_ups }} live follow-up{{ stats.open_follow_ups === 1 ? '' : 's' }}
        </Motion>
        <Motion v-if="(stats.reopened_from_closed_30d || 0) > 0" as="button" class="clh-btn ghost risk"
          :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }"
          title="Records reopened from CLOSED in the last 30 days — the seal did not hold" @click="$emit('exhumed')">
          <Shovel :size="15" /> {{ stats.reopened_from_closed_30d }} exhumed
        </Motion>
        <Motion as="button" class="clh-btn icon ghost" title="Refresh" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.95 }" @click="$emit('refresh')">
          <RefreshCw :size="14" :class="{ 'clh-spin': loading }" />
        </Motion>
        <Motion as="button" class="clh-btn icon ghost" :class="{ on: advCount > 0 }" title="Filters"
          :while-hover="{ y: -2 }" :while-tap="{ scale: 0.95 }" @click="$emit('filters')">
          <SlidersHorizontal :size="14" /><span v-if="advCount" class="clh-fb">{{ advCount }}</span>
        </Motion>
      </div>

      <!-- archive readouts -->
      <div class="clh-readouts sd-mono">
        <span class="clh-ro frost"><i>LIFETIME RECORDS</i><b><SdCountUp :value="stats.closed_total ?? 0" /></b></span>
        <span class="clh-ro"><i>SEALED · 30D</i><b>{{ stats.closed_30d ?? 0 }}</b></span>
        <span class="clh-ro"><i>LIFESPAN · P50</i><b>{{ fmtMin(stats.lifespan_p50_minutes) }}</b></span>
        <span class="clh-ro seal"><i>CSAT OF RECORD</i><b>{{ stats.csat_avg != null ? stats.csat_avg.toFixed(1) + '★' : '—' }}</b></span>
        <span class="clh-ro"><i>SEALS THAT HELD</i><b>{{ stats.closure_survival_pct_30d != null ? stats.closure_survival_pct_30d + '%' : '—' }}</b></span>
        <span v-if="teamLine" class="clh-ro teams"><i>SCOPE</i><b>{{ teamLine }}</b></span>
      </div>
    </div>

    <!-- ── telemetry lenses docked along the vault's edge ── -->
    <div class="clh-lensdock" role="tablist" aria-label="Archive lenses">
      <Motion v-for="(l, i) in lenses" :key="l.key" as="button" class="clh-lens"
        :class="{ on: activeLens === l.key, stat: l.stat }" :style="{ '--lc': l.color }"
        role="tab" :aria-selected="activeLens === l.key"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.18 + i * 0.045, ease: [0.16, 1, 0.3, 1] }"
        :while-hover="l.stat ? undefined : { y: -3 }" :while-tap="l.stat ? undefined : { scale: 0.97 }"
        @click="$emit('pick', l)">
        <span class="cl-ic"><component :is="l.icon" :size="14" /></span>
        <span class="cl-body">
          <span class="cl-val"><SdCountUp v-if="typeof l.value === 'number'" :value="l.value" /><template v-else>{{ l.value }}</template></span>
          <span class="cl-lb">{{ l.label }}</span>
        </span>
        <span class="cl-bar" aria-hidden="true" />
      </Motion>
    </div>
  </Motion>
</template>

<script setup>
/* SdClosedHero — the Archive of Record banner (full-bleed instrument backdrop, glass
   console over the calm left air, lens dock along the bottom). Accent = --sd-cls-*.
   Same layout contract as SdResolvedHero / SdReopenedHero with the archive identity:
   frost-silver = the preserved record, brass = the seal / knowledge harvest,
   rose = an exhumed record (agent reopen from closed). */
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Landmark, BookMarked, Link2, Shovel, RefreshCw, SlidersHorizontal } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  lenses: { type: Array, default: () => [] },
  activeLens: { type: String, default: 'all' },
  stats: { type: Object, default: () => ({}) },
  agent: { type: Boolean, default: false },
  harvestOn: { type: Boolean, default: false },
  advCount: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
  reduced: { type: Boolean, default: false },
})
defineEmits(['pick', 'harvest', 'followups', 'exhumed', 'refresh', 'filters'])

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
.clh { position: relative; overflow: hidden; isolation: isolate; border: 1px solid var(--sd-cls-brd); border-radius: 22px;
  background: var(--sd-cls-deep-bg); min-height: clamp(470px, 43vw, 570px);
  display: flex; flex-direction: column; justify-content: flex-end; }
[data-theme="light"] .clh { background: #f2f0ea; }

.clh-bleed { position: absolute; inset: 0; z-index: 0; }
.clh-grain { position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: 0.45; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E"); }
[data-theme="light"] .clh-grain { opacity: 0.28; }
/* console-legibility scrim: calm left air + docked-lens footing — THEME-NATIVE
   (the vault stage is night-steel on dark, porcelain on cream) */
.clh-scrim { position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background:
    linear-gradient(90deg, rgba(7, 8, 11, 0.66) 0%, rgba(7, 8, 11, 0.38) 34%, transparent 58%),
    linear-gradient(0deg, rgba(7, 8, 11, 0.7) 0%, transparent 26%); }
[data-theme="light"] .clh-scrim {
  background:
    linear-gradient(90deg, rgba(244, 242, 236, 0.8) 0%, rgba(244, 242, 236, 0.45) 34%, transparent 58%),
    linear-gradient(0deg, rgba(240, 237, 229, 0.82) 0%, transparent 26%); }

/* ── glass console — dark glass on the night vault, frosted cream on the porcelain one ── */
.clh-console { position: absolute; z-index: 2; left: 22px; top: 22px; width: min(452px, calc(100% - 44px));
  padding: 20px 22px; border-radius: 18px; border: 1px solid var(--sd-border-strong);
  background: rgba(8, 9, 12, 0.56); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  color: #f0f2f6; }
[data-theme="light"] .clh-console { background: rgba(255, 250, 240, 0.68); color: #232631;
  border-color: rgba(60, 45, 20, 0.16); }

.clh-eyebrow { display: inline-flex; align-items: center; gap: 9px; font-size: 10.5px; font-weight: 800;
  letter-spacing: 0.22em; color: var(--sd-cls-hi); font-family: var(--sd-font-mono, ui-monospace); }
.clh-live { width: 8px; height: 8px; border-radius: 50%; background: var(--sd-cls-core); }
.clh-live.hot { background: var(--sd-cls-risk); animation: clh-live-pulse 1.4s ease-out infinite; }
/* !important defeats theme-light-rescue's `[class*="page"] h2` catch-all — ink is
   theme-native: light on the night vault, dark slate on the porcelain one. */
.clh-title { margin: 11px 0 7px; font-size: clamp(26px, 3vw, 38px); line-height: 1.04; font-weight: 800;
  letter-spacing: -0.02em; color: #f3f5f8 !important; }
[data-theme="light"] .clh-title { color: #232631 !important; }
.clh-title em { font-style: normal; background: linear-gradient(122deg, #f4f6f9 0%, #c9cfd8 44%, #d9a441 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent; }
[data-theme="light"] .clh-title em { background: linear-gradient(122deg, #414a56 0%, #5c6674 44%, #a16207 100%);
  -webkit-background-clip: text; background-clip: text; }
.clh-sub { margin: 0 0 15px; max-width: 47ch; font-size: 13px; line-height: 1.55; color: rgba(240, 242, 246, 0.72); }
[data-theme="light"] .clh-sub { color: rgba(35, 38, 49, 0.72); }

.clh-ctas { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.clh-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 12px;
  font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid rgba(240, 242, 246, 0.2); background: rgba(240, 242, 246, 0.06); color: #f0f2f6; position: relative; }
[data-theme="light"] .clh-btn { border-color: rgba(40, 45, 60, 0.22); background: rgba(40, 45, 60, 0.05); color: #232631; }
.clh-btn.primary { border-color: transparent; color: #241703; background: linear-gradient(135deg, #ecd9a8, var(--sd-cls-seal)); box-shadow: 0 8px 22px -10px var(--sd-cls-seal); }
.clh-btn.primary.on { box-shadow: 0 0 0 2px color-mix(in srgb, var(--sd-cls-seal) 60%, transparent), 0 8px 22px -10px var(--sd-cls-seal); }
.clh-btn.seal { border-color: color-mix(in srgb, var(--sd-cls-seal) 60%, transparent); color: #ecd9a8; background: rgba(217, 164, 65, 0.12); }
[data-theme="light"] .clh-btn.seal { color: #8a5a06; }
.clh-btn.ghost { background: transparent; }
.clh-btn.ghost.risk { border-color: color-mix(in srgb, var(--sd-cls-risk) 60%, transparent); color: var(--sd-cls-risk); }
.clh-btn.icon { padding: 9px 10px; }
.clh-btn.icon.on { border-color: var(--sd-cls-hi); color: var(--sd-cls-hi); background: rgba(201, 207, 216, 0.14); }
.clh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.clh-cta-n { display: inline-grid; place-items: center; min-width: 17px; height: 17px; padding: 0 5px; border-radius: 9px;
  background: rgba(36, 23, 3, 0.28); font-size: 10px; font-weight: 800; }
.clh-fb { position: absolute; top: -5px; right: -5px; display: grid; place-items: center; min-width: 15px; height: 15px;
  padding: 0 4px; border-radius: 8px; background: var(--sd-cls-seal); color: #241703; font-size: 9px; font-weight: 800; }
.clh-spin { animation: clh-rot 0.9s linear infinite; }

.clh-readouts { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 15px; }
.clh-ro { display: flex; flex-direction: column; gap: 3px; }
.clh-ro i { font-style: normal; font-size: 9px; font-weight: 700; letter-spacing: 0.18em; color: rgba(240, 242, 246, 0.45); }
[data-theme="light"] .clh-ro i { color: rgba(35, 38, 49, 0.5); }
.clh-ro b { font-size: 15px; font-weight: 800; color: #f0f2f6; font-variant-numeric: tabular-nums; }
[data-theme="light"] .clh-ro b { color: #232631; }
.clh-ro.frost b { color: var(--sd-cls-hi); }
.clh-ro.seal b { color: var(--sd-cls-seal); }
.clh-ro.teams b { font-size: 12px; font-weight: 700; color: rgba(240, 242, 246, 0.72); }
[data-theme="light"] .clh-ro.teams b { color: rgba(35, 38, 49, 0.72); }

/* ── docked telemetry lenses ── */
.clh-lensdock { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
  gap: 8px; margin: 14px 16px 14px; }
.clh-lens { position: relative; overflow: hidden; display: flex; align-items: center; gap: 8px; text-align: left;
  padding: 9px 11px; border-radius: 12px; cursor: pointer; font-family: inherit;
  border: 1px solid rgba(240, 242, 246, 0.16); color: #f0f2f6;
  background: rgba(8, 9, 12, 0.6); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  transition: border-color 0.2s, background 0.2s; }
[data-theme="light"] .clh-lens { border-color: rgba(40, 45, 60, 0.16); color: #232631;
  background: rgba(255, 252, 246, 0.72); }
.clh-lens:hover { border-color: color-mix(in srgb, var(--lc) 55%, transparent); }
.clh-lens.on { border-color: var(--lc); background: color-mix(in srgb, var(--lc) 16%, rgba(8, 9, 12, 0.62)); }
[data-theme="light"] .clh-lens.on { background: color-mix(in srgb, var(--lc) 14%, rgba(255, 252, 246, 0.75)); }
.clh-lens.stat { cursor: default; }
.cl-ic { flex-shrink: 0; display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px;
  color: var(--lc); background: color-mix(in srgb, var(--lc) 16%, transparent); }
.cl-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.cl-val { font-size: 16px; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
.cl-lb { font-size: 9px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: rgba(240, 242, 246, 0.55);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
[data-theme="light"] .cl-lb { color: rgba(35, 38, 49, 0.55); }
.cl-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--lc); opacity: 0.4;
  transform-origin: left; transform: scaleX(0.25); transition: transform 0.3s var(--sd-spring), opacity 0.3s; }
.clh-lens.on .cl-bar, .clh-lens:hover .cl-bar { transform: scaleX(1); opacity: 0.9; }

/* idle stage (until the instrument mounts) — slow silver record rings */
.clh-stage-idle { position: absolute; inset: 0; display: grid; place-items: center; background: var(--sd-cls-deep-bg); }
[data-theme="light"] .clh-stage-idle { background: #f2f0ea; }
.clh-idle-core { color: var(--sd-cls-core); opacity: 0.85; }
.clh-idle-ring { position: absolute; border: 1px solid color-mix(in srgb, var(--sd-cls-core) 32%, transparent);
  border-radius: 50%; animation: clh-breathe 6s ease-in-out infinite; }
.clh-idle-ring.r1 { width: 120px; height: 120px; }
.clh-idle-ring.r2 { width: 190px; height: 190px; animation-delay: 0.8s; }
.clh-idle-ring.r3 { width: 268px; height: 268px; animation-delay: 1.6s; }

@keyframes clh-live-pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-cls-risk) 55%, transparent); } 100% { box-shadow: 0 0 0 10px transparent; } }
@keyframes clh-breathe { 0%, 100% { transform: scale(0.96); opacity: 0.35; } 50% { transform: scale(1.04); opacity: 0.85; } }
@keyframes clh-rot { to { transform: rotate(360deg); } }

@media (max-width: 940px) {
  .clh { min-height: 0; }
  .clh-console { position: relative; left: 0; top: 0; margin: 16px 16px 0; width: auto; }
  .clh-bleed { min-height: 220px; }
  .clh-scrim { background: linear-gradient(0deg, rgba(7, 8, 11, 0.76) 0%, rgba(7, 8, 11, 0.34) 60%, transparent 100%); }
  [data-theme="light"] .clh-scrim { background: linear-gradient(0deg, rgba(244, 242, 236, 0.85) 0%, rgba(244, 242, 236, 0.4) 60%, transparent 100%); }
}

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .clh-live.hot, html:not([data-cinematic="on"]) .clh-idle-ring { animation: none; }
}
</style>
