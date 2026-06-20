<template>
  <Motion as="section" class="rc" ref="root"
    :initial="reduced ? false : { opacity: 0, y: 16 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
    <span class="as-grain" aria-hidden="true" />
    <span class="rc-aura" aria-hidden="true" />
    <span class="rc-arc" aria-hidden="true" />

    <div class="rc-top">
      <div class="rc-lead">
        <span class="rc-eyebrow"><Undo2 :size="13" /> Recovery Bay · Re-entry Control</span>
        <h1 class="rc-title">Bring It <span class="rc-title-accent">Home</span></h1>
        <p class="rc-sub">Track every asset still in the field, recover it before it drifts overdue, and route it back to the bay — live.</p>
        <div class="rc-cta">
          <Motion as="button" type="button" class="as-btn as-btn-steel"
            :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('go', 'allocations')">
            <Send :size="14" /> Deployment bay
          </Motion>
          <Motion as="button" type="button" class="as-btn as-btn-ghost"
            :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('go', 'history')">
            <History :size="14" /> Movement log
          </Motion>
        </div>
      </div>

      <div class="rc-lenses" ref="lensesEl">
        <Motion v-for="(l, i) in lenses" :key="l.key" as="button" type="button" class="rc-lens" :data-tone="l.tone"
          :initial="reduced ? false : { opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.4, delay: 0.06 * i, ease: [0.16, 1, 0.3, 1] }"
          :whileHover="{ y: -3 }" :whileTap="{ scale: 0.97 }"
          :title="l.hint" @click="$emit('pick', l.pick)">
          <span class="rc-lens-ic"><component :is="l.icon" :size="15" /></span>
          <span class="rc-lens-val">
            <AssetCountUp :value="l.value" :start="lensesIn" :duration="1.1 + i * 0.08" :suffix="l.suffix || ''" />
          </span>
          <span class="rc-lens-lab">{{ l.label }}</span>
          <span v-if="l.alert && l.value" class="rc-lens-alert" aria-hidden="true" />
        </Motion>
      </div>
    </div>

    <!-- Re-entry horizon -->
    <div class="rc-horizon-wrap">
      <div class="rc-horizon" :class="{ idle: reduced }">
        <span class="rc-zone-over" :style="{ width: gatePct }" aria-hidden="true" />
        <span class="rc-ticks" aria-hidden="true" />
        <span class="rc-gate" :style="{ left: gatePct }" aria-hidden="true"><span class="rc-gate-dot" /></span>
        <span v-if="!reduced && markers.length" class="rc-sweep" aria-hidden="true" />
        <Motion v-for="(m, i) in markers" :key="m.id" class="rc-mark" :data-tone="m.tone"
          :style="{ left: `${m.x * 100}%`, '--off': `${m.off}px` }"
          :initial="reduced ? false : { opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }"
          :transition="{ duration: 0.5, delay: 0.5 + Math.min(i * 0.025, 0.6), ease: [0.16, 1, 0.3, 1] }"
          :title="m.label" />
        <span v-if="!markers.length" class="rc-horizon-idle">{{ openEnded ? `${openEnded} open-ended · no return window` : 'no assets in the field' }}</span>
      </div>
      <div class="rc-axis">
        <span class="rc-axis-over"><TriangleAlert :size="11" /> overdue</span>
        <span class="rc-axis-now" :style="{ left: gatePct }">now</span>
        <span class="rc-axis-up">upcoming <ArrowRight :size="11" /></span>
      </div>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Undo2, Send, History, PackageOpen, TriangleAlert, Hourglass, RotateCcw, Gauge, ArrowRight, Hand } from 'lucide-vue-next'
import AssetCountUp from './AssetCountUp.vue'
import { prefersReduced, useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  outstanding: { type: Number, default: 0 },
  overdue: { type: Number, default: 0 },
  dueSoon: { type: Number, default: 0 },
  recovered: { type: Number, default: 0 },
  onTimeRate: { type: Number, default: 0 },
  openEnded: { type: Number, default: 0 },
  requested: { type: Number, default: 0 },
  markers: { type: Array, default: () => [] }, // [{ id, x:0..1, tone, off, label }]
  gate: { type: Number, default: 0.32 },        // x position of "now" on the horizon
})
defineEmits(['go', 'pick'])

const root = ref(null)
const lensesEl = ref(null)
const reduced = prefersReduced()
const { visible: lensesIn } = useInView(lensesEl, { threshold: 0.25 })

const gatePct = computed(() => `${(props.gate * 100).toFixed(1)}%`)

const lenses = computed(() => [
  { key: 'out', label: 'In field', value: props.outstanding, tone: 'field', icon: PackageOpen, pick: 'all', hint: 'Assets still out with employees' },
  { key: 'req', label: 'Requested', value: props.requested, tone: 'req', icon: Hand, pick: 'requested', alert: true, hint: 'Employees have asked to return these — action first' },
  { key: 'over', label: 'Overdue', value: props.overdue, tone: 'over', icon: TriangleAlert, pick: 'overdue', alert: true, hint: 'Past expected return date' },
  { key: 'soon', label: 'Due ≤3d', value: props.dueSoon, tone: 'soon', icon: Hourglass, pick: 'soon', hint: 'Returning within three days' },
  { key: 'rec', label: 'Recovered', value: props.recovered, tone: 'rec', icon: RotateCcw, pick: 'all', hint: 'Returned to the bay' },
  { key: 'rate', label: 'On-time', value: props.onTimeRate, suffix: '%', tone: 'rate', icon: Gauge, pick: 'all', hint: 'Share of returns made on or before the due date' },
])
</script>

<style scoped>
.rc { position: relative; overflow: hidden; border-radius: 24px; padding: 24px 26px 20px;
  border: 1px solid var(--as-border-soft); background: var(--as-dome); box-shadow: var(--as-card-shadow); }
.rc-aura { position: absolute; inset: -45% -15% auto -15%; height: 85%; pointer-events: none; z-index: 0;
  background: var(--as-grad-hero); filter: blur(10px); }
/* re-entry arc — a faint descending orbital ring, bottom-left */
.rc-arc { position: absolute; bottom: -260px; left: -120px; width: 540px; height: 540px; border-radius: 50%; pointer-events: none; z-index: 0; opacity: 0.5;
  border: 1px dashed color-mix(in srgb, var(--as-amber) 26%, transparent);
  -webkit-mask: radial-gradient(closest-side, transparent 78%, #000 79%); mask: radial-gradient(closest-side, transparent 78%, #000 79%);
  animation: rc-arc-spin 26s linear infinite; }

.rc-top { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 26px; flex-wrap: wrap; }
.rc-lead { max-width: 460px; min-width: 260px; flex: 1; }
.rc-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--as-amber); padding: 5px 11px; border-radius: 999px; background: color-mix(in srgb, var(--as-amber) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--as-amber) 26%, transparent); }
.rc-title { margin: 14px 0 0; font-size: clamp(26px, 3.4vw, 38px); font-weight: 850; letter-spacing: -0.02em; color: var(--as-text); line-height: 1.04; }
.rc-title-accent { background: var(--as-grad-rail); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.rc-sub { margin: 9px 0 0; font-size: 13.5px; line-height: 1.6; color: var(--as-text-muted); max-width: 430px; }
.rc-cta { display: flex; gap: 9px; margin-top: 16px; flex-wrap: wrap; }

.rc-lenses { display: grid; grid-template-columns: repeat(6, minmax(68px, 1fr)); gap: 9px; min-width: 0; }
.rc-lens { position: relative; display: flex; flex-direction: column; gap: 2px; padding: 12px 12px 11px; border-radius: 15px; cursor: pointer; text-align: left;
  background: var(--as-panel); border: 1px solid var(--as-border-soft); backdrop-filter: blur(8px);
  transition: border-color 0.25s, box-shadow 0.25s; overflow: hidden; }
.rc-lens::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 2px; opacity: 0.85;
  background: linear-gradient(90deg, transparent, var(--lc, var(--as-amber)), transparent); }
.rc-lens:hover { border-color: var(--as-border-strong); box-shadow: var(--as-card-shadow-hover); }
.rc-lens[data-tone="field"] { --lc: var(--as-st-allocated); }
.rc-lens[data-tone="req"]   { --lc: var(--as-amber); }
.rc-lens[data-tone="over"]  { --lc: var(--as-al-lost); }
.rc-lens[data-tone="soon"]  { --lc: var(--as-st-reserved); }
.rc-lens[data-tone="rec"]   { --lc: var(--as-st-available); }
.rc-lens[data-tone="rate"]  { --lc: var(--as-steel); }
.rc-lens-ic { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; color: var(--lc);
  background: color-mix(in srgb, var(--lc) 14%, transparent); }
.rc-lens-val { font-size: 22px; font-weight: 850; color: var(--as-text); margin-top: 7px; line-height: 1; }
.rc-lens-lab { font-size: 10px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-dim); margin-top: 3px; }
.rc-lens-alert { position: absolute; top: 11px; right: 11px; width: 7px; height: 7px; border-radius: 50%; color: var(--lc, var(--as-al-lost)); background: currentColor;
  box-shadow: 0 0 0 0 color-mix(in srgb, currentColor 60%, transparent); animation: rc-alert 1.7s ease-in-out infinite; }

/* ── re-entry horizon ── */
.rc-horizon-wrap { position: relative; z-index: 1; margin-top: 22px; }
.rc-horizon { position: relative; height: 64px; border-radius: 16px; overflow: hidden;
  background: linear-gradient(90deg, color-mix(in srgb, var(--as-al-lost) 6%, var(--as-surface)), var(--as-surface) 40%, color-mix(in srgb, var(--as-st-available) 7%, var(--as-surface)));
  border: 1px solid var(--as-border-soft); }
.rc-zone-over { position: absolute; left: 0; top: 0; bottom: 0; pointer-events: none;
  background: linear-gradient(90deg, color-mix(in srgb, var(--as-al-lost) 22%, transparent), transparent);
  border-right: 1px dashed color-mix(in srgb, var(--as-al-lost) 40%, transparent); animation: rc-zone-breathe 4s ease-in-out infinite; }
.rc-ticks { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: repeating-linear-gradient(90deg, var(--as-border-soft) 0 1px, transparent 1px 9%);
  -webkit-mask: linear-gradient(180deg, transparent, #000 40%, transparent); mask: linear-gradient(180deg, transparent, #000 40%, transparent); }
.rc-gate { position: absolute; top: -2px; bottom: -2px; width: 2px; transform: translateX(-1px);
  background: linear-gradient(180deg, transparent, var(--as-amber), transparent); box-shadow: 0 0 12px 1px color-mix(in srgb, var(--as-amber) 70%, transparent); }
.rc-gate-dot { position: absolute; top: 50%; left: 50%; width: 9px; height: 9px; margin: -4.5px 0 0 -4.5px; border-radius: 50%;
  background: var(--as-amber); box-shadow: 0 0 0 0 color-mix(in srgb, var(--as-amber) 60%, transparent); animation: rc-gate-pulse 2s ease-in-out infinite; }
.rc-sweep { position: absolute; top: 0; bottom: 0; width: 120px; pointer-events: none;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--as-amber) 16%, transparent), transparent); animation: rc-sweep-move 5.5s linear infinite; }
.rc-mark { position: absolute; top: calc(50% + var(--off, 0px)); width: 11px; height: 11px; margin: -5.5px 0 0 -5.5px; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff, var(--mc) 65%, transparent); box-shadow: 0 0 9px 1px color-mix(in srgb, var(--mc) 70%, transparent); }
.rc-mark[data-tone="over"] { --mc: var(--as-al-lost); animation: rc-mark-pulse 1.8s ease-in-out infinite; }
.rc-mark[data-tone="soon"] { --mc: var(--as-st-reserved); }
.rc-mark[data-tone="ok"]   { --mc: var(--as-st-available); }
.rc-horizon-idle { position: absolute; inset: 0; display: grid; place-items: center; font-size: 11.5px; letter-spacing: 0.04em; color: var(--as-text-dim); }

.rc-axis { position: relative; margin-top: 7px; height: 14px; }
.rc-axis span { position: absolute; display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; }
.rc-axis-over { left: 2px; color: var(--as-al-lost); }
.rc-axis-now { transform: translateX(-50%); color: var(--as-amber); }
.rc-axis-up { right: 2px; color: var(--as-st-available); }

@keyframes rc-arc-spin { to { transform: rotate(360deg); } }
@keyframes rc-alert { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, currentColor 55%, transparent); } 50% { box-shadow: 0 0 0 6px color-mix(in srgb, currentColor 0%, transparent); } }
@keyframes rc-zone-breathe { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
@keyframes rc-gate-pulse { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--as-amber) 55%, transparent); } 50% { box-shadow: 0 0 0 7px color-mix(in srgb, var(--as-amber) 0%, transparent); } }
@keyframes rc-sweep-move { 0% { left: -120px; } 100% { left: 100%; } }
@keyframes rc-mark-pulse { 0%, 100% { box-shadow: 0 0 9px 1px color-mix(in srgb, var(--as-al-lost) 60%, transparent); transform: scale(1); } 50% { box-shadow: 0 0 14px 3px color-mix(in srgb, var(--as-al-lost) 75%, transparent); transform: scale(1.18); } }

@media (max-width: 980px) { .rc-lenses { grid-template-columns: repeat(3, 1fr); width: 100%; } .rc-lens-val { font-size: 19px; } }
@media (max-width: 620px) { .rc-lenses { grid-template-columns: repeat(2, 1fr); } }
@media (prefers-reduced-motion: reduce) {
  .rc-arc, .rc-zone-over, .rc-gate-dot, .rc-sweep, .rc-lens-alert, .rc-mark[data-tone="over"] { animation: none; }
}
</style>
