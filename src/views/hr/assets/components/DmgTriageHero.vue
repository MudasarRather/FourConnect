<template>
  <Motion as="section" class="dh" ref="root"
    :initial="reduced ? false : { opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
    <span class="as-grain" aria-hidden="true" />
    <span class="dh-aura" :data-critical="!!s.critical" aria-hidden="true" />
    <span class="as-spotlight" aria-hidden="true" />

    <div class="dh-top">
      <div class="dh-lead">
        <span class="dh-eyebrow"><Siren :size="13" /> Incident Response · Triage Bay</span>
        <h1 class="dh-title">Damage <span class="dh-title-accent">Triage</span></h1>
        <p class="dh-sub">
          <template v-if="s.open"><b class="dh-open-n">{{ s.open }}</b> open incident{{ s.open === 1 ? '' : 's' }} on the monitor<span v-if="s.critical"> · <span class="dh-crit"><TriangleAlert :size="12" /> {{ s.critical }} critical</span></span></template>
          <template v-else>All assets healthy — no open damage on the board.</template>
        </p>
        <div class="dh-cta">
          <Motion as="button" type="button" class="as-btn as-btn-danger"
            :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('log')">
            <ShieldAlert :size="14" /> Log damage
          </Motion>
          <Motion as="button" type="button" class="as-btn as-btn-ghost"
            :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('go', 'maintenance')">
            <Wrench :size="14" /> Maintenance bay
          </Motion>
        </div>
      </div>

      <div class="dh-lenses" ref="lensEl">
        <Motion v-for="(l, i) in lenses" :key="l.key" as="button" type="button" class="dh-lens"
          :class="{ on: activeStatus === l.key }" :style="{ '--c': l.color }"
          :initial="reduced ? false : { opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.4, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }"
          :whileHover="{ y: -3 }" :whileTap="{ scale: 0.96 }" @click="$emit('pick-status', l.key)">
          <span class="dh-lens-ic"><component :is="l.icon" :size="14" /></span>
          <span class="dh-lens-val"><AssetCountUp :value="l.value" :start="lensIn" :duration="1 + i * 0.08" /></span>
          <span class="dh-lens-lab">{{ l.label }}</span>
          <span v-if="l.alert && l.value" class="dh-lens-alert" aria-hidden="true" />
        </Motion>
      </div>
    </div>

    <!-- impact ECG monitor -->
    <div class="dh-monitor" :style="{ '--ecg': toneColor }">
      <div class="dh-mon-readout">
        <span class="dh-mon-tag"><Activity :size="12" /> Impact monitor</span>
        <span class="dh-mon-stat as-mono"><b>{{ s.open || 0 }}</b> active</span>
        <span class="dh-mon-stat as-mono dh-mon-load"><b>{{ Math.round(load * 100) }}%</b> severity load</span>
      </div>
      <div class="dh-ecg" :class="{ flat: !s.open }">
        <svg viewBox="0 0 600 64" preserveAspectRatio="none">
          <polyline class="dh-ecg-ghost" :points="ecg" />
          <polyline class="dh-ecg-line" :points="ecg" />
        </svg>
        <span v-if="!reduced && s.open" class="dh-ecg-sweep" aria-hidden="true" />
        <span class="dh-ecg-base" aria-hidden="true" />
      </div>
    </div>

    <!-- severity spectrum -->
    <div class="dh-spectrum" ref="specEl">
      <div class="dh-spec-head">
        <span class="dh-spec-t">Open severity spectrum</span>
        <span v-if="s.recovery" class="dh-spec-rec"><CircleDollarSign :size="12" /> {{ fmtRec(s.recovery) }} recoverable</span>
      </div>
      <div class="dh-spec-bars">
        <Motion v-for="(b, i) in spectrum" :key="b.key" as="button" type="button" class="dh-spec-bar"
          :class="{ on: activeSeverity === b.key, empty: !b.value }" :style="{ '--c': b.color }"
          :whileHover="b.value ? { y: -2 } : {}" :whileTap="b.value ? { scale: 0.97 } : {}"
          @click="b.value && $emit('pick-severity', b.key)">
          <span class="dh-spec-fill" :style="{ height: specIn ? `${8 + b.pct * 86}%` : '0%', transitionDelay: `${0.1 + i * 0.08}s` }" />
          <span class="dh-spec-n">{{ b.value }}</span>
          <span class="dh-spec-lab">{{ b.label }}</span>
        </Motion>
      </div>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Siren, Search, Wrench, ShieldCheck, Archive, ShieldAlert, Activity, TriangleAlert, CircleDollarSign } from 'lucide-vue-next'
import AssetCountUp from './AssetCountUp.vue'
import { sevMeta, SEVERITIES, ecgPoints } from './dmgMeta.js'
import { prefersReduced, usePointerSpotlight, useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  summary: { type: Object, default: () => ({}) },
  activeStatus: { type: String, default: '' },
  activeSeverity: { type: String, default: '' },
})
defineEmits(['log', 'go', 'pick-status', 'pick-severity'])

const root = ref(null)
const lensEl = ref(null)
const specEl = ref(null)
const reduced = prefersReduced()
usePointerSpotlight(root)
const { visible: lensIn } = useInView(lensEl, { threshold: 0.25 })
const { visible: specIn } = useInView(specEl, { threshold: 0.3 })

const s = computed(() => props.summary || {})

const lenses = computed(() => [
  { key: 'REPORTED', label: 'Reported', value: s.value.reported || 0, color: 'var(--as-st-reserved)', icon: Siren, alert: true },
  { key: 'UNDER_REVIEW', label: 'Review', value: s.value.review || 0, color: 'var(--as-st-allocated)', icon: Search },
  { key: 'IN_REPAIR', label: 'In repair', value: s.value.repair || 0, color: 'var(--as-st-maintenance)', icon: Wrench },
  { key: 'RESOLVED', label: 'Resolved', value: s.value.resolved || 0, color: 'var(--as-st-available)', icon: ShieldCheck },
  { key: 'WRITE_OFF', label: 'Written off', value: s.value.writeoff || 0, color: 'var(--as-st-retired)', icon: Archive },
])

// severity load = weighted mean amplitude of OPEN incidents (0..1)
const load = computed(() => {
  const c = s.value.severityCounts || {}
  let sum = 0, n = 0
  for (const k of SEVERITIES) { const v = c[k] || 0; sum += v * sevMeta(k).amp; n += v }
  return n ? sum / n : 0
})
const beats = computed(() => Math.max(2, Math.min(7, s.value.open || 2)))
const ecg = computed(() => ecgPoints(600, 64, beats.value, s.value.open ? Math.max(0.28, load.value) : 0.06))
const toneColor = computed(() => {
  const l = load.value
  if (!s.value.open) return 'var(--as-st-retired)'
  if (l >= 0.85) return 'var(--as-al-lost)'
  if (l >= 0.65) return 'var(--as-cond-poor)'
  if (l >= 0.4) return 'var(--as-cond-fair)'
  return 'var(--as-cond-good)'
})

const spectrum = computed(() => {
  const c = s.value.severityCounts || {}
  const max = Math.max(1, ...SEVERITIES.map(k => c[k] || 0))
  return SEVERITIES.map(k => ({ key: k, label: sevMeta(k).label, color: sevMeta(k).color, value: c[k] || 0, pct: (c[k] || 0) / max }))
})

const fmtRec = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })
</script>

<style scoped>
.dh { position: relative; overflow: hidden; border-radius: 24px; padding: 24px 26px 22px;
  border: 1px solid var(--as-border-soft); background: var(--as-dome); box-shadow: var(--as-card-shadow); }
.dh-aura { position: absolute; inset: -45% -10% auto -10%; height: 80%; pointer-events: none; z-index: 0;
  background: radial-gradient(120% 120% at 18% -10%, color-mix(in srgb, var(--as-al-damaged) 22%, transparent), transparent 56%),
    radial-gradient(95% 95% at 88% 110%, color-mix(in srgb, var(--as-al-lost) 12%, transparent), transparent 60%); filter: blur(8px); }
.dh-aura[data-critical="true"] { animation: dh-aura-pulse 3.4s ease-in-out infinite; }
.dh > * { position: relative; z-index: 1; }

.dh-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 26px; flex-wrap: wrap; }
.dh-lead { max-width: 460px; min-width: 250px; flex: 1; }
.dh-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--as-al-damaged); padding: 5px 11px; border-radius: 999px; background: color-mix(in srgb, var(--as-al-damaged) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--as-al-damaged) 26%, transparent); }
.dh-eyebrow :deep(svg) { animation: dh-siren 2.4s ease-in-out infinite; }
.dh-title { margin: 13px 0 0; font-size: clamp(26px, 3.4vw, 38px); font-weight: 850; letter-spacing: -0.02em; line-height: 1.04; color: var(--as-text); }
.dh-title-accent { background: linear-gradient(120deg, var(--as-al-damaged), var(--as-al-lost)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.dh-sub { margin: 9px 0 0; font-size: 13.5px; line-height: 1.6; color: var(--as-text-muted); }
.dh-open-n { color: var(--as-text); font-weight: 800; }
.dh-crit { display: inline-flex; align-items: center; gap: 4px; color: var(--as-al-lost); font-weight: 700; }
.dh-cta { display: flex; gap: 9px; margin-top: 16px; flex-wrap: wrap; }

.dh-lenses { display: grid; grid-template-columns: repeat(5, minmax(72px, 1fr)); gap: 9px; min-width: 0; }
.dh-lens { position: relative; display: flex; flex-direction: column; gap: 2px; padding: 12px 12px 11px; border-radius: 15px; cursor: pointer; text-align: left;
  background: var(--as-panel); border: 1px solid var(--as-border-soft); backdrop-filter: blur(8px); overflow: hidden; transition: border-color 0.25s, box-shadow 0.25s; }
.dh-lens::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 2px; opacity: 0.85; background: linear-gradient(90deg, transparent, var(--c), transparent); }
.dh-lens:hover { border-color: var(--as-border-strong); box-shadow: var(--as-card-shadow-hover); }
.dh-lens.on { border-color: color-mix(in srgb, var(--c) 50%, transparent); background: color-mix(in srgb, var(--c) 10%, var(--as-panel)); }
.dh-lens-ic { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); }
.dh-lens-val { font-size: 22px; font-weight: 850; color: var(--as-text); margin-top: 7px; line-height: 1; }
.dh-lens-lab { font-size: 10px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-dim); margin-top: 3px; }
.dh-lens-alert { position: absolute; top: 11px; right: 11px; width: 7px; height: 7px; border-radius: 50%; background: var(--c); animation: dh-alert 1.7s ease-in-out infinite; }

/* impact ECG monitor */
.dh-monitor { position: relative; margin-top: 22px; padding: 12px 14px 6px; border-radius: 16px; background: var(--as-surface); border: 1px solid var(--as-border-soft); overflow: hidden; }
.dh-mon-readout { display: flex; align-items: center; gap: 14px; margin-bottom: 4px; }
.dh-mon-tag { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--as-text-dim); }
.dh-mon-tag :deep(svg) { color: var(--ecg); }
.dh-mon-stat { font-size: 11px; color: var(--as-text-dim); }
.dh-mon-stat b { color: var(--ecg); font-weight: 800; }
.dh-mon-load { margin-left: auto; }
.dh-ecg { position: relative; height: 66px; }
.dh-ecg svg { width: 100%; height: 100%; display: block; overflow: visible; }
.dh-ecg-ghost { fill: none; stroke: var(--ecg); stroke-width: 1.4; opacity: 0.16; }
.dh-ecg-line { fill: none; stroke: var(--ecg); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round;
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--ecg) 60%, transparent));
  stroke-dasharray: 2400; stroke-dashoffset: 2400; animation: dh-draw 1.7s cubic-bezier(0.16,1,0.3,1) forwards; }
.dh-ecg.flat .dh-ecg-line { filter: none; opacity: 0.5; }
.dh-ecg-sweep { position: absolute; top: 0; bottom: 0; width: 70px; pointer-events: none;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--ecg) 26%, transparent), transparent); animation: dh-sweep 3.2s linear infinite; }
.dh-ecg-base { position: absolute; left: 0; right: 0; top: 56%; height: 1px; background: var(--as-border-soft); }

/* severity spectrum */
.dh-spectrum { margin-top: 14px; }
.dh-spec-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 9px; }
.dh-spec-t { font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--as-text-dim); }
.dh-spec-rec { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; color: var(--as-amber); }
.dh-spec-bars { display: grid; grid-template-columns: repeat(4, 1fr); gap: 9px; align-items: end; }
.dh-spec-bar { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 5px; height: 96px; padding: 8px 6px; border-radius: 13px; cursor: pointer;
  background: var(--as-surface); border: 1px solid var(--as-border-soft); overflow: hidden; transition: border-color 0.22s; font: inherit; }
.dh-spec-bar.empty { cursor: default; opacity: 0.6; }
.dh-spec-bar:not(.empty):hover { border-color: color-mix(in srgb, var(--c) 45%, transparent); }
.dh-spec-bar.on { border-color: color-mix(in srgb, var(--c) 55%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 30%, transparent); }
.dh-spec-fill { position: absolute; left: 0; right: 0; bottom: 0; border-radius: 13px 13px 0 0;
  background: linear-gradient(180deg, color-mix(in srgb, var(--c) 55%, transparent), color-mix(in srgb, var(--c) 12%, transparent));
  transition: height 0.7s cubic-bezier(0.16,1,0.3,1); }
.dh-spec-fill::after { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 2px; background: var(--c); box-shadow: 0 0 8px var(--c); }
.dh-spec-n { position: relative; font-size: 18px; font-weight: 850; color: var(--as-text); z-index: 1; }
.dh-spec-lab { position: relative; font-size: 9.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--as-text-dim); z-index: 1; }

@keyframes dh-draw { to { stroke-dashoffset: 0; } }
@keyframes dh-sweep { 0% { left: -70px; } 100% { left: 100%; } }
@keyframes dh-alert { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--c) 55%, transparent); } 50% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--c) 0%, transparent); } }
@keyframes dh-aura-pulse { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
@keyframes dh-siren { 0%, 100% { transform: rotate(-8deg); } 50% { transform: rotate(8deg); } }

@media (max-width: 940px) { .dh-lenses { grid-template-columns: repeat(5, 1fr); width: 100%; } .dh-lens-val { font-size: 19px; } }
@media (max-width: 560px) { .dh-lenses { grid-template-columns: repeat(3, 1fr); } }
@media (prefers-reduced-motion: reduce) {
  .dh-aura, .dh-eyebrow :deep(svg), .dh-lens-alert, .dh-ecg-sweep { animation: none; }
  .dh-ecg-line { animation: none; stroke-dashoffset: 0; }
  .dh-spec-fill { transition: none; }
}
</style>
