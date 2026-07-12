<template>
  <Motion as="section" class="qsh" :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
    <!-- ── full-bleed signature stage (the Switchyard IS the hero backdrop) ── -->
    <div class="qsh-bleed">
      <slot name="instrument">
        <div class="qsh-stage-idle" aria-hidden="true">
          <span class="qsh-idle-rail r1" /><span class="qsh-idle-rail r2" /><span class="qsh-idle-rail r3" />
          <Inbox :size="42" class="qsh-idle-core" />
        </div>
      </slot>
    </div>
    <div class="qsh-grain" aria-hidden="true" />
    <div class="qsh-scrim" aria-hidden="true" />

    <!-- ── glass console over the calm upper-left air ── -->
    <div class="qsh-console">
      <div class="qsh-eyebrow">
        <span class="qsh-live" :class="{ hot: (totals.red || 0) > 0 }" aria-hidden="true" />
        QUEUES · THE SWITCHYARD
      </div>
      <h2 class="qsh-title">Every ticket <em>finds its rail.</em></h2>
      <p class="qsh-sub">
        Inbound work rides the mainline, the routing rules throw the switches, and each
        queue is a classification lane. Watch the yard breathe — depth, health and
        coverage per lane, live.
      </p>

      <div class="qsh-ctas">
        <Motion v-if="isAdmin" as="button" class="qsh-btn primary" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
          title="Open the Interlocking Tower — queues, routing rules, SLAs, skills, hours" @click="$emit('config')">
          <SlidersHorizontal :size="15" /> Interlocking Tower
        </Motion>
        <Motion v-for="t in tierChips" :key="t.tier" as="button" class="qsh-btn tier" :style="{ '--tc': t.accent }"
          :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
          :title="`Work the ${t.short} platform — ${t.open} open`" @click="$emit('tier', t.tier)">
          <Layers :size="14" /> {{ t.short }} <b>{{ t.open }}</b>
        </Motion>
        <Motion as="button" class="qsh-btn icon ghost" title="Refresh" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.95 }" @click="$emit('refresh')">
          <RefreshCw :size="14" :class="{ 'qsh-spin': loading }" />
        </Motion>
      </div>

      <!-- yard readouts + my availability lever -->
      <div class="qsh-readouts sd-mono">
        <span class="qsh-ro"><i>AUTO-ROUTED TODAY</i><b>{{ overview.auto_routed_today ?? 0 }}</b></span>
        <span class="qsh-ro"><i>AGENTS ON SHIFT</i><b>{{ totals.agents_online ?? 0 }}/{{ totals.agents_total ?? 0 }}</b></span>
        <span class="qsh-ro ok"><i>RESOLVED · 7D</i><b>{{ totals.resolved_7d ?? 0 }}</b></span>
        <span v-if="me" class="qsh-ro me">
          <i>MY SIGNAL</i>
          <span class="qsh-status">
            <button v-for="(m, k) in AGENT_STATUS_META" :key="k" class="qsh-st" :class="{ on: me.status === k }"
              :style="{ '--sc': m.color }" :title="`${m.label} — ${m.blurb}`" @click="$emit('status', k)">
              <span class="qsh-st-dot" />{{ m.label }}
            </button>
          </span>
        </span>
      </div>
    </div>

    <!-- ── telemetry lenses docked along the yard apron ── -->
    <div class="qsh-lensdock" role="tablist" aria-label="Queue lenses">
      <Motion v-for="(l, i) in lenses" :key="l.key" as="button" class="qsh-lens"
        :class="{ on: activeLens === l.key, stat: l.stat }" :style="{ '--lc': l.color }"
        role="tab" :aria-selected="activeLens === l.key"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.18 + i * 0.045, ease: [0.16, 1, 0.3, 1] }"
        :while-hover="l.stat ? undefined : { y: -3 }" :while-tap="l.stat ? undefined : { scale: 0.97 }"
        @click="$emit('pick', l)">
        <span class="ql-ic"><component :is="l.icon" :size="14" /></span>
        <span class="ql-body">
          <span class="ql-val"><SdCountUp v-if="typeof l.value === 'number'" :value="l.value" /><template v-else>{{ l.value }}</template></span>
          <span class="ql-lb">{{ l.label }}</span>
        </span>
        <span class="ql-bar" aria-hidden="true" />
      </Motion>
    </div>
  </Motion>
</template>

<script setup>
/* SdQueueHero — the Switchyard banner (full-bleed instrument backdrop, glass console
   over the calm upper-left air, lens dock along the yard apron). Accent = --sd-qs-*.
   Same layout contract as SdReopenedHero / SdOverdueHero with the routing identity:
   brass = the signal lanterns, steel = the rails, semaphore go/warn/halt = lane health.
   Unique here: the MY SIGNAL lever — the agent's own availability status (gates
   auto-assignment) lives right on the yard console. */
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Inbox, Layers, RefreshCw, SlidersHorizontal } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'
import { AGENT_STATUS_META, TIER_META } from '@/composables/useSupportDesk'

const props = defineProps({
  lenses: { type: Array, default: () => [] },
  activeLens: { type: String, default: 'all' },
  overview: { type: Object, default: () => ({}) },
  me: { type: Object, default: null },           // my AgentStatusEntry (null = unknown)
  isAdmin: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  reduced: { type: Boolean, default: false },
})
defineEmits(['pick', 'tier', 'config', 'refresh', 'status'])

const totals = computed(() => props.overview.totals || {})
const tierChips = computed(() => [1, 2, 3].map(t => ({
  tier: t, ...TIER_META[t],
  open: (props.overview.tier_rollup || {})[String(t)]?.open ?? 0,
})))
</script>

<style scoped>
.qsh { position: relative; overflow: hidden; isolation: isolate; border: 1px solid var(--sd-qs-brd); border-radius: 22px;
  background: var(--sd-qs-deep-bg); min-height: clamp(470px, 43vw, 580px);
  display: flex; flex-direction: column; justify-content: flex-end; }
[data-theme="light"] .qsh { background: #f6efe0; }

.qsh-bleed { position: absolute; inset: 0; z-index: 0; }
.qsh-grain { position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: 0.45; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E"); }
/* console-legibility scrim: calm upper-left air + docked-lens footing */
.qsh-scrim { position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background:
    linear-gradient(112deg, rgba(8, 6, 3, 0.66) 0%, rgba(8, 6, 3, 0.34) 36%, transparent 60%),
    linear-gradient(0deg, rgba(8, 6, 3, 0.66) 0%, transparent 26%); }
[data-theme="light"] .qsh-scrim {
  background:
    linear-gradient(112deg, rgba(8, 6, 3, 0.56) 0%, rgba(8, 6, 3, 0.3) 36%, transparent 60%),
    linear-gradient(0deg, rgba(8, 6, 3, 0.58) 0%, transparent 26%); }

/* ── glass console ── */
.qsh-console { position: absolute; z-index: 2; left: 22px; top: 22px; width: min(470px, calc(100% - 44px));
  padding: 20px 22px; border-radius: 18px; border: 1px solid var(--sd-border-strong);
  background: rgba(9, 7, 4, 0.56); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
/* the yard night stays dark in BOTH themes, so the console stays dark-glass too —
   text inside uses literal light ink, not the theme tokens */
.qsh-console, [data-theme="light"] .qsh-console { color: #f6efdf; }

.qsh-eyebrow { display: inline-flex; align-items: center; gap: 9px; font-size: 10.5px; font-weight: 800;
  letter-spacing: 0.22em; color: var(--sd-qs-hi); font-family: var(--sd-font-mono, ui-monospace); }
.qsh-live { width: 8px; height: 8px; border-radius: 50%; background: var(--sd-qs-go); }
.qsh-live.hot { background: var(--sd-qs-halt); animation: qsh-live-pulse 1.4s ease-out infinite; }
/* !important defeats theme-light-rescue's `[class*="page"] h2` catch-all — this console
   sits on the dark yard air in BOTH themes, so its ink stays light. */
.qsh-title { margin: 11px 0 7px; font-size: clamp(26px, 3vw, 38px); line-height: 1.04; font-weight: 800;
  letter-spacing: -0.02em; color: #f8f2e2 !important; }
.qsh-title em { font-style: normal; background: var(--sd-qs-grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
[data-theme="light"] .qsh-title em { background: linear-gradient(122deg, #ffe3a8 0%, #ffd98a 48%, #edb249 100%); -webkit-background-clip: text; background-clip: text; }
.qsh-sub { margin: 0 0 15px; max-width: 47ch; font-size: 13px; line-height: 1.55; color: rgba(246, 239, 223, 0.72); }

.qsh-ctas { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.qsh-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 12px;
  font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid rgba(246, 239, 223, 0.2); background: rgba(246, 239, 223, 0.06); color: #f6efdf; position: relative; }
.qsh-btn.primary { border-color: transparent; color: #241703; background: linear-gradient(135deg, #ffd98a, var(--sd-qs-core)); box-shadow: 0 8px 22px -10px var(--sd-qs-core); }
.qsh-btn.tier { border-color: color-mix(in srgb, var(--tc) 55%, transparent); color: var(--tc); background: color-mix(in srgb, var(--tc) 12%, transparent); }
.qsh-btn.tier b { font-variant-numeric: tabular-nums; }
.qsh-btn.ghost { background: transparent; }
.qsh-btn.icon { padding: 9px 10px; }
.qsh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.qsh-spin { animation: qsh-rot 0.9s linear infinite; }

.qsh-readouts { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 15px; align-items: flex-end; }
.qsh-ro { display: flex; flex-direction: column; gap: 3px; }
.qsh-ro i { font-style: normal; font-size: 9px; font-weight: 700; letter-spacing: 0.18em; color: rgba(246, 239, 223, 0.45); }
.qsh-ro b { font-size: 15px; font-weight: 800; color: #f6efdf; font-variant-numeric: tabular-nums; }
.qsh-ro.ok b { color: var(--sd-qs-go); }

/* my availability lever */
.qsh-status { display: inline-flex; gap: 4px; flex-wrap: wrap; }
.qsh-st { display: inline-flex; align-items: center; gap: 5px; padding: 4px 8px; border-radius: 9px;
  font-size: 10px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid rgba(246, 239, 223, 0.16); background: transparent; color: rgba(246, 239, 223, 0.6);
  transition: border-color 0.2s, color 0.2s, background 0.2s; }
.qsh-st-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--sc); opacity: 0.5; }
.qsh-st.on { border-color: var(--sc); color: #f6efdf; background: color-mix(in srgb, var(--sc) 16%, transparent); }
.qsh-st.on .qsh-st-dot { opacity: 1; box-shadow: 0 0 8px var(--sc); }

/* ── docked telemetry lenses ── */
.qsh-lensdock { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
  gap: 8px; margin: 14px 16px 14px; }
.qsh-lens { position: relative; overflow: hidden; display: flex; align-items: center; gap: 8px; text-align: left;
  padding: 9px 11px; border-radius: 12px; cursor: pointer; font-family: inherit;
  border: 1px solid rgba(246, 239, 223, 0.16); color: #f6efdf;
  background: rgba(9, 7, 4, 0.6); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  transition: border-color 0.2s, background 0.2s; }
.qsh-lens:hover { border-color: color-mix(in srgb, var(--lc) 55%, transparent); }
.qsh-lens.on { border-color: var(--lc); background: color-mix(in srgb, var(--lc) 16%, rgba(9, 7, 4, 0.62)); }
.qsh-lens.stat { cursor: default; }
.ql-ic { flex-shrink: 0; display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px;
  color: var(--lc); background: color-mix(in srgb, var(--lc) 16%, transparent); }
.ql-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.ql-val { font-size: 16px; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
.ql-lb { font-size: 9px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: rgba(246, 239, 223, 0.55);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ql-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--lc); opacity: 0.4;
  transform-origin: left; transform: scaleX(0.25); transition: transform 0.3s var(--sd-spring), opacity 0.3s; }
.qsh-lens.on .ql-bar, .qsh-lens:hover .ql-bar { transform: scaleX(1); opacity: 0.9; }

/* idle stage (until the instrument mounts) — three converging rails */
.qsh-stage-idle { position: absolute; inset: 0; display: grid; place-items: center; background: var(--sd-qs-deep-bg); }
.qsh-idle-core { color: var(--sd-qs-core); opacity: 0.85; }
.qsh-idle-rail { position: absolute; left: 10%; right: 10%; height: 1px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--sd-qs-rail) 50%, transparent), transparent);
  animation: qsh-rail-drift 5s ease-in-out infinite alternate; }
.qsh-idle-rail.r1 { top: 42%; }
.qsh-idle-rail.r2 { top: 52%; animation-duration: 7s; }
.qsh-idle-rail.r3 { top: 62%; animation-duration: 9s; }

@keyframes qsh-live-pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-qs-halt) 55%, transparent); } 100% { box-shadow: 0 0 0 10px transparent; } }
@keyframes qsh-rail-drift { from { transform: translateX(-12px); opacity: 0.4; } to { transform: translateX(12px); opacity: 0.9; } }
@keyframes qsh-rot { to { transform: rotate(360deg); } }

@media (max-width: 940px) {
  .qsh { min-height: 0; }
  .qsh-console { position: relative; left: 0; top: 0; margin: 16px 16px 0; width: auto; }
  .qsh-bleed { min-height: 230px; }
  .qsh-scrim { background: linear-gradient(0deg, rgba(8, 6, 3, 0.74) 0%, rgba(8, 6, 3, 0.32) 60%, transparent 100%); }
}

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .qsh-live.hot, html:not([data-cinematic="on"]) .qsh-idle-rail { animation: none; }
}
</style>
