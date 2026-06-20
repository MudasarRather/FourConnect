<template>
  <Motion as="section" class="mc" ref="root"
    :initial="reduced ? false : { opacity: 0, y: 16 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
    <span class="as-grain" aria-hidden="true" />
    <span class="mc-aura" aria-hidden="true" />
    <span class="as-blueprint-floor" aria-hidden="true" />
    <!-- ambient backdrop cog -->
    <span class="mc-bgcog" aria-hidden="true"><MaintGear :size="320" :teeth="20" color="var(--as-steel-dark)" :duration="60" /></span>

    <div class="mc-top">
      <div class="mc-lead">
        <span class="mc-eyebrow"><Wrench :size="13" /> Service Bay · Maintenance Control</span>
        <h1 class="mc-title">Back to <span class="mc-title-accent">Spec</span></h1>
        <p class="mc-sub">Every repair, inspection and preventive job — routed through the bay, tracked on the lift, and released to spec. Live.</p>
        <div class="mc-cta">
          <Motion as="button" type="button" class="as-btn as-btn-primary"
            :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('new')">
            <Plus :size="14" /> Schedule job
          </Motion>
          <Motion as="button" type="button" class="as-btn as-btn-steel"
            :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('go', 'damage')">
            <ShieldAlert :size="14" /> Damage log
          </Motion>
          <Motion as="button" type="button" class="as-btn as-btn-ghost"
            :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('go', 'history')">
            <History :size="14" /> Movement log
          </Motion>
        </div>
      </div>

      <div class="mc-lenses" ref="lensesEl">
        <Motion v-for="(l, i) in lenses" :key="l.key" as="button" type="button" class="mc-lens"
          :class="{ on: l.status && activeStatus === l.status, stat: !l.status }" :data-tone="l.tone"
          :initial="reduced ? false : { opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.4, delay: 0.06 * i, ease: [0.16, 1, 0.3, 1] }"
          :whileHover="l.status ? { y: -3 } : {}" :whileTap="l.status ? { scale: 0.97 } : {}"
          :title="l.hint" @click="l.status && $emit('pick', l.status)">
          <span class="mc-lens-ic"><component :is="l.icon" :size="15" /></span>
          <span class="mc-lens-val">
            <AssetCountUp :value="l.value" :start="lensesIn" :duration="1.0 + i * 0.07" :prefix="l.prefix || ''" />
          </span>
          <span class="mc-lens-lab">{{ l.label }}</span>
          <span v-if="l.live && l.value" class="mc-lens-live" aria-hidden="true" />
        </Motion>
      </div>
    </div>

    <!-- ════ The Service Line — gear-driven throughput pipeline ════ -->
    <div class="mc-line" ref="lineEl">
      <button v-for="(st, i) in stations" :key="st.key" type="button" class="mc-station"
        :class="{ on: activeStatus === st.status }" :data-tone="st.tone" @click="$emit('pick', st.status)" :title="`Filter · ${st.label}`">
        <span class="mc-st-gears" :data-load="st.value > 0">
          <MaintGear class="g-a" :size="st.big" :teeth="12" :color="st.color" :duration="st.dur" :spin="st.value > 0" />
          <MaintGear class="g-b" :size="st.small" :teeth="9" :color="st.color2" :duration="st.dur * 0.7" :spin="st.value > 0" reverse />
        </span>
        <span class="mc-st-meta">
          <span class="mc-st-val"><AssetCountUp :value="st.value" :start="lineIn" :duration="1.1" /></span>
          <span class="mc-st-lab">{{ st.label }}</span>
          <span class="mc-st-sub">{{ st.sub }}</span>
        </span>
        <span class="mc-st-flag" aria-hidden="true" />
        <span v-if="i < stations.length - 1" class="mc-conveyor" aria-hidden="true">
          <span class="mc-conv-belt" />
          <span v-if="!reduced && flowOn(i)" class="mc-conv-part"><Wrench :size="9" /></span>
        </span>
      </button>

      <!-- throughput output meter -->
      <div class="mc-meter" :title="`Throughput · ${throughputPct}% of resolved jobs completed`">
        <span class="mc-meter-ring" :style="{ '--p': ringDeg }">
          <span class="mc-meter-core">
            <b><AssetCountUp :value="throughput" :start="lineIn" :duration="1.4" suffix="%" /></b>
            <small>throughput</small>
          </span>
        </span>
        <span class="mc-meter-spend"><IndianRupee :size="11" />{{ spendShort }} serviced</span>
      </div>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import {
  Wrench, Plus, ShieldAlert, History, CalendarClock, Cog,
  CircleCheck, Ban, IndianRupee,
} from 'lucide-vue-next'
import MaintGear from './MaintGear.vue'
import AssetCountUp from './AssetCountUp.vue'
import { prefersReduced, useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  counts: { type: Object, default: () => ({ scheduled: 0, inProgress: 0, completed: 0, cancelled: 0, total: 0 }) },
  spend: { type: Number, default: 0 },
  throughput: { type: Number, default: 0 }, // 0..100 completion rate of resolved jobs
  activeStatus: { type: String, default: '' },
})
defineEmits(['pick', 'reset', 'new', 'go'])

const root = ref(null)
const lensesEl = ref(null)
const lineEl = ref(null)
const reduced = prefersReduced()
const { visible: lensesIn } = useInView(lensesEl, { threshold: 0.2 })
const { visible: lineIn } = useInView(lineEl, { threshold: 0.18 })

const c = computed(() => props.counts || {})

const lenses = computed(() => [
  { key: 'sched', status: 'SCHEDULED',   label: 'Scheduled', value: c.value.scheduled || 0,  tone: 'sched', icon: CalendarClock, hint: 'Queued for the bay' },
  { key: 'prog',  status: 'IN_PROGRESS', label: 'On the lift', value: c.value.inProgress || 0, tone: 'prog', icon: Cog, live: true, hint: 'Currently being serviced' },
  { key: 'done',  status: 'COMPLETED',   label: 'Released', value: c.value.completed || 0,  tone: 'done', icon: CircleCheck, hint: 'Back to spec' },
  { key: 'canc',  status: 'CANCELLED',   label: 'Stood down', value: c.value.cancelled || 0, tone: 'canc', icon: Ban, hint: 'Cancelled jobs' },
  { key: 'spend', status: '',            label: 'Serviced', value: props.spend || 0, prefix: '₹', tone: 'spend', icon: IndianRupee, hint: 'Total cost across jobs' },
])

// Gear speed scales with station load; floor keeps it readable, cap keeps it calm.
const dur = (n, fast = false) => {
  if (!n) return 14
  const base = fast ? 5.5 : 9
  return Math.max(fast ? 1.8 : 2.6, base - Math.min(n, 12) * 0.55)
}
const stations = computed(() => [
  { key: 'intake', status: 'SCHEDULED', label: 'Intake', sub: 'queued', tone: 'sched',
    value: c.value.scheduled || 0, big: 50, small: 34, color: 'var(--as-steel)', color2: 'var(--as-st-reserved)', dur: dur(c.value.scheduled) },
  { key: 'lift', status: 'IN_PROGRESS', label: 'On the lift', sub: 'servicing', tone: 'prog',
    value: c.value.inProgress || 0, big: 58, small: 40, color: 'var(--as-amber)', color2: 'var(--as-steel)', dur: dur(c.value.inProgress, true) },
  { key: 'release', status: 'COMPLETED', label: 'Released', sub: 'to spec', tone: 'done',
    value: c.value.completed || 0, big: 50, small: 34, color: 'var(--as-st-available)', color2: 'var(--as-steel-dim)', dur: dur(c.value.completed) },
])
const flowOn = (i) => {
  // a part travels a conveyor only when both adjacent stations imply movement
  if (i === 0) return (c.value.scheduled || 0) > 0 || (c.value.inProgress || 0) > 0
  return (c.value.inProgress || 0) > 0 || (c.value.completed || 0) > 0
}

const throughputPct = computed(() => Math.round(props.throughput || 0))
const ringDeg = computed(() => `${Math.max(0, Math.min(100, props.throughput || 0)) * 3.6}deg`)
const spendShort = computed(() => {
  const v = Number(props.spend || 0)
  if (v >= 1e7) return (v / 1e7).toFixed(1) + 'Cr'
  if (v >= 1e5) return (v / 1e5).toFixed(1) + 'L'
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'k'
  return String(v)
})
</script>

<style scoped>
.mc { position: relative; overflow: hidden; border-radius: 24px; padding: 24px 26px 22px;
  border: 1px solid var(--as-border-soft); background: var(--as-dome); box-shadow: var(--as-card-shadow); }
.mc-aura { position: absolute; inset: -45% -15% auto -15%; height: 85%; pointer-events: none; z-index: 0; background: var(--as-grad-hero); filter: blur(10px); }
.mc-bgcog { position: absolute; top: -90px; right: -90px; pointer-events: none; z-index: 0; opacity: 0.12; }
[data-theme="light"] .mc-bgcog { opacity: 0.16; }

.mc-top { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 26px; flex-wrap: wrap; }
.mc-lead { max-width: 470px; min-width: 270px; flex: 1; }
.mc-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--as-amber); padding: 5px 11px; border-radius: 999px; background: color-mix(in srgb, var(--as-amber) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--as-amber) 26%, transparent); }
.mc-title { margin: 14px 0 0; font-size: clamp(26px, 3.4vw, 38px); font-weight: 850; letter-spacing: -0.02em; color: var(--as-text); line-height: 1.04; }
.mc-title-accent { background: var(--as-grad-rail); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.mc-sub { margin: 9px 0 0; font-size: 13.5px; line-height: 1.6; color: var(--as-text-muted); max-width: 440px; }
.mc-cta { display: flex; gap: 9px; margin-top: 16px; flex-wrap: wrap; }

.mc-lenses { display: grid; grid-template-columns: repeat(5, minmax(74px, 1fr)); gap: 9px; min-width: 0; }
.mc-lens { position: relative; display: flex; flex-direction: column; gap: 2px; padding: 12px 12px 11px; border-radius: 15px; text-align: left; cursor: pointer;
  background: var(--as-panel); border: 1px solid var(--as-border-soft); backdrop-filter: blur(8px); transition: border-color 0.25s, box-shadow 0.25s, transform 0.25s; overflow: hidden; }
.mc-lens.stat { cursor: default; }
.mc-lens::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 2px; opacity: 0.85; background: linear-gradient(90deg, transparent, var(--lc, var(--as-amber)), transparent); }
.mc-lens:hover { border-color: var(--as-border-strong); box-shadow: var(--as-card-shadow-hover); }
.mc-lens.on { border-color: color-mix(in srgb, var(--lc) 55%, transparent); box-shadow: 0 0 0 1px color-mix(in srgb, var(--lc) 30%, transparent), var(--as-card-shadow-hover); }
.mc-lens[data-tone="sched"] { --lc: var(--as-st-reserved); }
.mc-lens[data-tone="prog"]  { --lc: var(--as-amber); }
.mc-lens[data-tone="done"]  { --lc: var(--as-st-available); }
.mc-lens[data-tone="canc"]  { --lc: var(--as-st-retired); }
.mc-lens[data-tone="spend"] { --lc: var(--as-steel); }
.mc-lens-ic { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; color: var(--lc); background: color-mix(in srgb, var(--lc) 14%, transparent); }
.mc-lens-val { font-size: 22px; font-weight: 850; color: var(--as-text); margin-top: 7px; line-height: 1; }
.mc-lens-lab { font-size: 10px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-dim); margin-top: 3px; }
.mc-lens-live { position: absolute; top: 11px; right: 11px; width: 7px; height: 7px; border-radius: 50%; background: var(--as-amber);
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--as-amber) 60%, transparent); animation: mc-live 1.7s ease-in-out infinite; }

/* ════ Service line ════ */
.mc-line { position: relative; z-index: 1; margin-top: 24px; display: flex; align-items: stretch; gap: 0; padding: 16px 18px; border-radius: 18px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--as-surface-elevated) 70%, transparent), var(--as-surface));
  border: 1px solid var(--as-border-soft); overflow: hidden; }
.mc-station { position: relative; flex: 1 1 0; min-width: 0; display: flex; align-items: center; gap: 12px; padding: 6px 8px; cursor: pointer;
  background: transparent; border: 0; border-radius: 14px; font: inherit; text-align: left; transition: background 0.25s; }
.mc-station:hover { background: color-mix(in srgb, var(--lc, var(--as-amber)) 8%, transparent); }
.mc-station[data-tone="sched"] { --lc: var(--as-st-reserved); }
.mc-station[data-tone="prog"]  { --lc: var(--as-amber); }
.mc-station[data-tone="done"]  { --lc: var(--as-st-available); }
.mc-station.on { background: color-mix(in srgb, var(--lc) 12%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--lc) 34%, transparent); }
.mc-st-gears { position: relative; flex-shrink: 0; width: 64px; height: 60px; display: grid; place-items: center; }
.mc-st-gears .g-a { position: absolute; top: 2px; left: 0; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35)); }
.mc-st-gears .g-b { position: absolute; bottom: 0; right: 0; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.3)); }
.mc-st-gears[data-load="false"] { opacity: 0.5; }
.mc-st-meta { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.mc-st-val { font-size: 24px; font-weight: 850; color: var(--as-text); line-height: 1; }
.mc-st-lab { font-size: 11.5px; font-weight: 700; color: var(--as-text); margin-top: 3px; }
.mc-st-sub { font-size: 9.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--lc); }
.mc-st-flag { position: absolute; left: 8px; bottom: 4px; width: 26px; height: 2px; border-radius: 2px; background: var(--lc); opacity: 0.55; }

.mc-conveyor { position: absolute; right: -22px; top: 50%; transform: translateY(-50%); width: 44px; height: 14px; pointer-events: none; z-index: 2;
  display: flex; align-items: center; overflow: hidden; }
.mc-conv-belt { position: absolute; inset: 5px 0; border-radius: 3px;
  background: repeating-linear-gradient(90deg, color-mix(in srgb, var(--as-steel) 40%, transparent) 0 6px, transparent 6px 12px);
  background-size: 24px 100%; opacity: 0.5; animation: as-convey 1.1s linear infinite; }
.mc-conv-part { position: absolute; top: 50%; left: 0; width: 16px; height: 16px; margin-top: -8px; border-radius: 5px; display: grid; place-items: center;
  color: var(--as-amber); background: var(--as-surface-elevated); border: 1px solid color-mix(in srgb, var(--as-amber) 36%, transparent);
  box-shadow: 0 2px 8px -2px color-mix(in srgb, var(--as-amber) 60%, transparent); animation: mc-part 2.4s ease-in-out infinite; }

/* throughput meter */
.mc-meter { flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; gap: 8px; padding-left: 16px; margin-left: 8px;
  border-left: 1px dashed var(--as-border-strong); }
.mc-meter-ring { position: relative; width: 74px; height: 74px; border-radius: 50%; display: grid; place-items: center;
  background: conic-gradient(var(--as-st-available) var(--p, 0deg), color-mix(in srgb, var(--as-steel) 22%, transparent) 0);
  transition: --p 1s var(--as-ease); }
.mc-meter-ring::before { content: ''; position: absolute; inset: 6px; border-radius: 50%; background: var(--as-surface-elevated); border: 1px solid var(--as-border-soft); }
.mc-meter-core { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; line-height: 1; }
.mc-meter-core b { font-size: 17px; font-weight: 850; color: var(--as-text); }
.mc-meter-core small { font-size: 8px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--as-text-dim); margin-top: 2px; }
.mc-meter-spend { display: inline-flex; align-items: center; gap: 2px; font-size: 10px; font-weight: 700; color: var(--as-text-muted); }
.mc-meter-spend :deep(svg) { color: var(--as-steel); }

@keyframes mc-live { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--as-amber) 55%, transparent); } 50% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--as-amber) 0%, transparent); } }
@keyframes mc-part { 0% { left: 0; opacity: 0; } 14% { opacity: 1; } 86% { opacity: 1; } 100% { left: calc(100% - 16px); opacity: 0; } }

/* @property enables the conic --p to actually animate (graceful no-op otherwise) */
@property --p { syntax: '<angle>'; inherits: false; initial-value: 0deg; }

@media (max-width: 1080px) {
  .mc-lenses { grid-template-columns: repeat(5, 1fr); width: 100%; }
  .mc-line { flex-wrap: wrap; gap: 12px; }
  .mc-station { flex: 1 1 30%; }
  .mc-conveyor { display: none; }
  .mc-meter { flex: 1 1 100%; flex-direction: row; justify-content: center; border-left: 0; border-top: 1px dashed var(--as-border-strong); padding: 12px 0 0; margin: 4px 0 0; }
}
@media (max-width: 620px) {
  .mc-lenses { grid-template-columns: repeat(3, 1fr); }
  .mc-station { flex: 1 1 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .mc-lens-live, .mc-conv-belt, .mc-conv-part { animation: none; }
}
</style>
