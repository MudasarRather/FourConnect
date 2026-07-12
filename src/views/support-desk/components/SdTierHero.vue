<template>
  <Motion as="section" class="tph" :style="{ '--tc': meta.accent }" :initial="{ opacity: 0, y: 14 }"
    :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
    <!-- ── the platform stage: rails converging into THIS tier's berth ── -->
    <div class="tph-stage" aria-hidden="true">
      <span class="tph-platform" />
      <span v-for="i in 4" :key="`r${i}`" class="tph-rail" :class="`r${i}`" />
      <span v-for="i in 6" :key="`p${i}`" class="tph-spark" :class="`p${i}`" />
      <span class="tph-beacon" :class="{ hot: (stats.breached || 0) > 0 }" />
      <span class="tph-tiermark sd-mono">{{ meta.short }}</span>
    </div>
    <div class="tph-grain" aria-hidden="true" />
    <div class="tph-scrim" aria-hidden="true" />

    <!-- ── glass console ── -->
    <div class="tph-console">
      <div class="tph-eyebrow">
        <span class="tph-live" :class="{ hot: (stats.breached || 0) > 0 }" aria-hidden="true" />
        QUEUES · {{ meta.label.toUpperCase() }} PLATFORM
      </div>
      <h2 class="tph-title">{{ titleLead }} <em>{{ titleAccent }}</em></h2>
      <p class="tph-sub">{{ meta.blurb }} {{ subLine }}</p>

      <div class="tph-ctas">
        <Motion as="button" class="tph-btn primary" :class="{ on: playing }" :disabled="loading || stats.no_queues"
          :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
          :title="playing ? 'Play mode is live — serving by queue order' : 'Claim the next ticket per serve order (skips ones being viewed)'"
          @click="$emit('serve')">
          <Play :size="15" /> {{ playing ? 'Serving · on' : 'Serve next' }}
        </Motion>
        <Motion v-if="(stats.unassigned || 0) > 0" as="button" class="tph-btn tinted"
          :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
          title="Jump to the unowned pool on this platform" @click="$emit('unowned')">
          <HandHelping :size="15" /> {{ stats.unassigned }} unowned
        </Motion>
        <Motion as="button" class="tph-btn icon ghost" title="Refresh" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.95 }" @click="$emit('refresh')">
          <RefreshCw :size="14" :class="{ 'tph-spin': loading }" />
        </Motion>
      </div>

      <div class="tph-readouts sd-mono">
        <span class="tph-ro"><i>OLDEST WAIT</i><b>{{ fmtMin(stats.oldest_wait_mins) }}</b></span>
        <span class="tph-ro"><i>MY LOAD</i><b>{{ stats.my_load ?? 0 }}</b></span>
        <span class="tph-ro" :class="{ warn: (stats.skips_today || 0) > 3 }"><i>MY SKIPS TODAY</i><b>{{ stats.skips_today ?? 0 }}</b></span>
        <span v-if="laneLine" class="tph-ro lanes"><i>LANES</i><b>{{ laneLine }}</b></span>
      </div>
    </div>

    <!-- ── telemetry lenses ── -->
    <div class="tph-lensdock" role="tablist" :aria-label="`${meta.short} lenses`">
      <Motion v-for="(l, i) in lenses" :key="l.key" as="button" class="tph-lens"
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
/* SdTierHero — one platform of the Switchyard, zoomed in: CSS-only stage (converging
   rails, platform edge strip, drifting coupling sparks, the tier beacon) so the three
   tier tabs stay light while the overview owns the full canvas yard. Tier accent
   rides --tc (from TIER_META); everything else mirrors the SdQueueHero contract. */
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Play, RefreshCw, HandHelping } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'
import { TIER_META } from '@/composables/useSupportDesk'

const props = defineProps({
  tier: { type: Number, required: true },
  lenses: { type: Array, default: () => [] },
  activeLens: { type: String, default: 'all' },
  stats: { type: Object, default: () => ({}) },
  queues: { type: Array, default: () => [] },
  playing: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  reduced: { type: Boolean, default: false },
})
defineEmits(['pick', 'serve', 'unowned', 'refresh'])

const meta = computed(() => TIER_META[props.tier] || TIER_META[1])
const TITLES = {
  1: ['First touch,', 'fast hands.'],
  2: ['Where the hard ones', 'change hands.'],
  3: ['Last stop before', 'the drawing board.'],
}
const titleLead = computed(() => TITLES[props.tier]?.[0] || 'Work the')
const titleAccent = computed(() => TITLES[props.tier]?.[1] || 'platform.')
const subLine = computed(() => (props.stats.no_queues
  ? 'No lanes are laid at this tier yet — an admin can add one in the Interlocking Tower.'
  : 'Serve in order, skip with a reason, escalate with a record.'))

const laneLine = computed(() => {
  if (!props.queues.length) return ''
  return props.queues.length <= 2 ? props.queues.map(q => q.name).join(' · ') : `${props.queues.length} lanes`
})
const fmtMin = (m) => (m == null ? '—' : m < 60 ? `${Math.round(m)}m` : m < 1440 ? `${(m / 60).toFixed(1)}h` : `${(m / 1440).toFixed(1)}d`)
</script>

<style scoped>
.tph { position: relative; overflow: hidden; isolation: isolate; border: 1px solid color-mix(in srgb, var(--tc) 32%, transparent);
  border-radius: 22px; background: var(--sd-qs-deep-bg); min-height: clamp(360px, 33vw, 430px);
  display: flex; flex-direction: column; justify-content: flex-end; }
[data-theme="light"] .tph { background: #16110a; }

/* ── CSS platform stage ── */
.tph-stage { position: absolute; inset: 0; z-index: 0; overflow: hidden; }
.tph-platform { position: absolute; right: -4%; top: 12%; bottom: 12%; width: 34%; border-radius: 18px 0 0 18px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--tc) 10%, transparent), color-mix(in srgb, var(--tc) 3%, transparent));
  border-left: 2px solid color-mix(in srgb, var(--tc) 45%, transparent);
  box-shadow: -18px 0 46px -22px color-mix(in srgb, var(--tc) 55%, transparent); }
.tph-rail { position: absolute; left: -4%; height: 2px; border-radius: 2px;
  background: linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--sd-qs-rail) 55%, transparent) 30%, color-mix(in srgb, var(--tc) 70%, transparent) 100%);
  animation: tph-hum 4.5s ease-in-out infinite alternate; }
.tph-rail.r1 { top: 30%; right: 32%; }
.tph-rail.r2 { top: 45%; right: 30%; animation-duration: 6s; }
.tph-rail.r3 { top: 60%; right: 32%; animation-duration: 7.5s; }
.tph-rail.r4 { top: 75%; right: 34%; animation-duration: 5.2s; }
.tph-spark { position: absolute; width: 5px; height: 5px; border-radius: 50%; background: var(--tc);
  box-shadow: 0 0 10px var(--tc); opacity: 0; animation: tph-ride 6s linear infinite; }
.tph-spark.p1 { top: calc(30% - 2px); animation-delay: 0s; }
.tph-spark.p2 { top: calc(45% - 2px); animation-delay: 1.4s; animation-duration: 7.5s; }
.tph-spark.p3 { top: calc(60% - 2px); animation-delay: 2.6s; animation-duration: 8s; }
.tph-spark.p4 { top: calc(75% - 2px); animation-delay: 0.9s; animation-duration: 6.8s; }
.tph-spark.p5 { top: calc(45% - 2px); animation-delay: 4.2s; animation-duration: 9s; }
.tph-spark.p6 { top: calc(60% - 2px); animation-delay: 5.1s; animation-duration: 7s; }
.tph-beacon { position: absolute; right: 12%; top: 20%; width: 10px; height: 10px; border-radius: 50%;
  background: var(--sd-qs-go); box-shadow: 0 0 14px var(--sd-qs-go); animation: tph-beacon 2.6s ease-in-out infinite; }
.tph-beacon.hot { background: var(--sd-qs-halt); box-shadow: 0 0 14px var(--sd-qs-halt); animation-duration: 1.1s; }
.tph-tiermark { position: absolute; right: 6%; bottom: 8%; font-size: clamp(64px, 9vw, 120px); font-weight: 800;
  letter-spacing: -0.04em; color: color-mix(in srgb, var(--tc) 16%, transparent); user-select: none; }

.tph-grain { position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: 0.45; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E"); }
.tph-scrim { position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background:
    linear-gradient(105deg, rgba(8, 6, 3, 0.7) 0%, rgba(8, 6, 3, 0.36) 40%, transparent 66%),
    linear-gradient(0deg, rgba(8, 6, 3, 0.62) 0%, transparent 30%); }

/* ── console (dark-glass, literal light ink in BOTH themes — sits on the dark stage) ── */
.tph-console { position: absolute; z-index: 2; left: 22px; top: 22px; width: min(470px, calc(100% - 44px));
  padding: 18px 20px; border-radius: 18px; border: 1px solid var(--sd-border-strong);
  background: rgba(9, 7, 4, 0.56); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
.tph-console, [data-theme="light"] .tph-console { color: #f6efdf; }

.tph-eyebrow { display: inline-flex; align-items: center; gap: 9px; font-size: 10.5px; font-weight: 800;
  letter-spacing: 0.22em; color: var(--tc); font-family: var(--sd-font-mono, ui-monospace); }
.tph-live { width: 8px; height: 8px; border-radius: 50%; background: var(--sd-qs-go); }
.tph-live.hot { background: var(--sd-qs-halt); animation: tph-pulse 1.4s ease-out infinite; }
.tph-title { margin: 10px 0 6px; font-size: clamp(23px, 2.6vw, 33px); line-height: 1.06; font-weight: 800;
  letter-spacing: -0.02em; color: #f8f2e2 !important; }
.tph-title em { font-style: normal; background: linear-gradient(122deg, #fff3d4 0%, var(--tc) 70%); -webkit-background-clip: text; background-clip: text; color: transparent; }
.tph-sub { margin: 0 0 13px; max-width: 50ch; font-size: 12.5px; line-height: 1.55; color: rgba(246, 239, 223, 0.72); }

.tph-ctas { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.tph-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 12px;
  font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid rgba(246, 239, 223, 0.2); background: rgba(246, 239, 223, 0.06); color: #f6efdf; }
.tph-btn.primary { border-color: transparent; color: #052e1f; background: linear-gradient(135deg, #6ee7b7, var(--sd-qs-go)); box-shadow: 0 8px 22px -10px var(--sd-qs-go); }
.tph-btn.primary.on { box-shadow: 0 0 0 2px color-mix(in srgb, var(--sd-qs-go) 60%, transparent), 0 8px 22px -10px var(--sd-qs-go); }
.tph-btn.tinted { border-color: color-mix(in srgb, var(--tc) 60%, transparent); color: var(--tc); background: color-mix(in srgb, var(--tc) 12%, transparent); }
.tph-btn.ghost { background: transparent; }
.tph-btn.icon { padding: 9px 10px; }
.tph-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.tph-spin { animation: tph-rot 0.9s linear infinite; }

.tph-readouts { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 13px; }
.tph-ro { display: flex; flex-direction: column; gap: 3px; }
.tph-ro i { font-style: normal; font-size: 9px; font-weight: 700; letter-spacing: 0.18em; color: rgba(246, 239, 223, 0.45); }
.tph-ro b { font-size: 15px; font-weight: 800; color: #f6efdf; font-variant-numeric: tabular-nums; }
.tph-ro.warn b { color: var(--sd-qs-warn); }
.tph-ro.lanes b { font-size: 12px; font-weight: 700; color: rgba(246, 239, 223, 0.72); }

/* ── lenses (same contract as the yard hero) ── */
.tph-lensdock { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
  gap: 8px; margin: 14px 16px 14px; }
.tph-lens { position: relative; overflow: hidden; display: flex; align-items: center; gap: 8px; text-align: left;
  padding: 9px 11px; border-radius: 12px; cursor: pointer; font-family: inherit;
  border: 1px solid rgba(246, 239, 223, 0.16); color: #f6efdf;
  background: rgba(9, 7, 4, 0.6); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  transition: border-color 0.2s, background 0.2s; }
.tph-lens:hover { border-color: color-mix(in srgb, var(--lc) 55%, transparent); }
.tph-lens.on { border-color: var(--lc); background: color-mix(in srgb, var(--lc) 16%, rgba(9, 7, 4, 0.62)); }
.tph-lens.stat { cursor: default; }
.tl-ic { flex-shrink: 0; display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px;
  color: var(--lc); background: color-mix(in srgb, var(--lc) 16%, transparent); }
.tl-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.tl-val { font-size: 16px; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
.tl-lb { font-size: 9px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: rgba(246, 239, 223, 0.55);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tl-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--lc); opacity: 0.4;
  transform-origin: left; transform: scaleX(0.25); transition: transform 0.3s var(--sd-spring), opacity 0.3s; }
.tph-lens.on .tl-bar, .tph-lens:hover .tl-bar { transform: scaleX(1); opacity: 0.9; }

@keyframes tph-hum { from { opacity: 0.45; } to { opacity: 0.95; } }
@keyframes tph-ride { 0% { left: -2%; opacity: 0; } 8% { opacity: 1; } 88% { opacity: 1; } 100% { left: 66%; opacity: 0; } }
@keyframes tph-beacon { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
@keyframes tph-pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-qs-halt) 55%, transparent); } 100% { box-shadow: 0 0 0 10px transparent; } }
@keyframes tph-rot { to { transform: rotate(360deg); } }

@media (max-width: 940px) {
  .tph { min-height: 0; }
  .tph-console { position: relative; left: 0; top: 0; margin: 16px 16px 0; width: auto; }
  .tph-stage { min-height: 190px; }
}

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .tph-rail,
  html:not([data-cinematic="on"]) .tph-spark,
  html:not([data-cinematic="on"]) .tph-beacon,
  html:not([data-cinematic="on"]) .tph-live.hot { animation: none; }
  html:not([data-cinematic="on"]) .tph-spark { opacity: 0; }
}
</style>
