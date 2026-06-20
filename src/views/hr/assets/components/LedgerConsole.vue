<template>
  <Motion as="section" class="lc" ref="root"
    :initial="reduced ? false : { opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
    <span class="as-grain" aria-hidden="true" />
    <span class="lc-aura" aria-hidden="true" />
    <span class="as-blueprint-floor" aria-hidden="true" />
    <span class="as-spotlight" aria-hidden="true" />

    <!-- Integrity seal — chain-of-custody completeness gauge (ambient motif) -->
    <div class="lc-seal" aria-hidden="true">
      <span class="lc-seal-ring r1" /><span class="lc-seal-ring r2" />
      <span class="lc-seal-gauge" :style="{ '--p': integrityPct }" />
      <span class="lc-seal-core">
        <ShieldCheck :size="18" />
        <b class="as-mono">{{ integrityPct }}%</b>
      </span>
      <span class="lc-seal-cap">chain of custody</span>
    </div>

    <!-- lead -->
    <div class="lc-lead">
      <span class="lc-eyebrow"><Binary :size="13" /> Forensic Ledger · Tamper-Evident</span>
      <h1 class="lc-title">Event <span class="lc-title-accent">Ledger</span></h1>
      <p class="lc-sub">Every asset event, sealed in an append-only stream — registrations, deployments, transfers, repairs and disposals, replayed as one living signal.</p>
      <div class="lc-cta">
        <Motion as="button" type="button" class="as-btn as-btn-steel" :class="{ busy: loading }"
          :whileHover="reduced ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('refresh')">
          <RefreshCw :size="14" :class="{ spin: loading }" /> Re-pull stream
        </Motion>
        <span class="lc-onrecord">
          <Database :size="13" />
          <b class="as-mono"><AssetCountUp :value="total" /></b> entries on record
        </span>
      </div>
    </div>

    <!-- signature instrument -->
    <div class="lc-ribbon">
      <LedgerPulseRibbon :buckets="buckets" :max-count="maxCount" :min-time="minTime" :max-time="maxTime" :loading="loading" />
    </div>

    <!-- telemetry lenses -->
    <div class="lc-lenses">
      <Motion v-for="(f, i) in LENS_FAMILIES" :key="f.key" as="button" type="button" class="lc-lens"
        :class="{ on: active === f.key, stat: f.key === 'all' }" :style="{ '--c': f.color }"
        :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.45, delay: 0.1 + i * 0.05, ease: [0.16, 1, 0.3, 1] }"
        :whileHover="reduced ? {} : { y: -3 }" :whileTap="{ scale: 0.97 }" @click="$emit('pick', f.key)">
        <span class="lc-lens-ic"><component :is="f.icon" :size="15" /></span>
        <span class="lc-lens-body">
          <span class="lc-lens-val"><AssetCountUp :value="countFor(f.key)" /></span>
          <span class="lc-lens-lab">{{ f.label }}</span>
        </span>
        <span class="lc-lens-bar" aria-hidden="true" />
      </Motion>
    </div>
    <p class="lc-foot as-mono">
      <CircleDot :size="10" /> reading recent {{ sampleSize }} of {{ total }} events
      <template v-if="todayCount"> · {{ todayCount }} today</template>
      <template v-if="distinctAssets"> · {{ distinctAssets }} assets touched</template>
    </p>
  </Motion>
</template>

<script setup>
import { ref } from 'vue'
import { Motion } from 'motion-v'
import { Binary, RefreshCw, ShieldCheck, Database, CircleDot } from 'lucide-vue-next'
import AssetCountUp from './AssetCountUp.vue'
import LedgerPulseRibbon from './LedgerPulseRibbon.vue'
import { LENS_FAMILIES } from './ledgerMeta.js'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  active: { type: String, default: 'all' },
  lensCounts: { type: Object, default: () => ({}) },
  total: { type: Number, default: 0 },
  sampleSize: { type: Number, default: 0 },
  todayCount: { type: Number, default: 0 },
  distinctAssets: { type: Number, default: 0 },
  integrityPct: { type: Number, default: 0 },
  buckets: { type: Array, default: () => [] },
  maxCount: { type: Number, default: 0 },
  minTime: { type: Number, default: 0 },
  maxTime: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
})
defineEmits(['pick', 'refresh'])

const root = ref(null)
const reduced = prefersReduced()
usePointerSpotlight(root)

// 'All' mirrors the recent-sample size so the family lenses sum to it; the true
// grand total lives in the "entries on record" CTA stat above.
const countFor = (key) => key === 'all' ? props.sampleSize : (props.lensCounts[key] || 0)
</script>

<style scoped>
@property --p { syntax: '<number>'; inherits: false; initial-value: 0; }

.lc { position: relative; overflow: hidden; border-radius: 24px; padding: 24px 26px 20px;
  border: 1px solid var(--as-border-soft); background: var(--as-dome); box-shadow: var(--as-card-shadow); }
.lc-aura { position: absolute; inset: -45% -10% auto -10%; height: 85%; pointer-events: none; z-index: 0; background: var(--as-grad-hero); filter: blur(10px); }
.lc > * { position: relative; z-index: 1; }

/* integrity seal */
.lc-seal { position: absolute; top: 20px; right: 24px; width: 104px; height: 104px; z-index: 1; display: grid; place-items: center; }
.lc-seal-ring { position: absolute; border-radius: 50%; border: 1px solid color-mix(in srgb, var(--as-amber) 22%, transparent); }
.lc-seal-ring.r1 { inset: -2px; border-style: dashed; animation: as-spin 26s linear infinite; }
.lc-seal-ring.r2 { inset: 8px; border-color: color-mix(in srgb, var(--as-amber) 14%, transparent); animation: as-spin 16s linear infinite reverse; }
.lc-seal-gauge { position: absolute; inset: 14px; border-radius: 50%; transition: --p 1.4s var(--as-ease);
  background: conic-gradient(from -90deg, var(--as-st-available) calc(var(--p) * 1%), color-mix(in srgb, var(--as-steel-dark) 55%, transparent) 0);
  -webkit-mask: radial-gradient(closest-side, transparent 70%, #000 72%); mask: radial-gradient(closest-side, transparent 70%, #000 72%); }
.lc-seal-core { position: relative; display: grid; place-items: center; gap: 0; width: 58px; height: 58px; border-radius: 50%; color: var(--as-st-available);
  background: radial-gradient(circle at 40% 30%, color-mix(in srgb, var(--as-st-available) 22%, transparent), color-mix(in srgb, var(--as-st-available) 4%, transparent) 70%);
  border: 1px solid color-mix(in srgb, var(--as-st-available) 30%, transparent); }
.lc-seal-core b { font-size: 11px; font-weight: 800; color: var(--as-text); }
.lc-seal-cap { position: absolute; bottom: -4px; font-size: 8.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--as-text-dim); white-space: nowrap; }
@media (max-width: 720px) { .lc-seal { display: none; } }

/* lead */
.lc-lead { max-width: 600px; }
.lc-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--as-amber); padding: 5px 11px; border-radius: 999px; background: color-mix(in srgb, var(--as-amber) 12%, transparent); border: 1px solid color-mix(in srgb, var(--as-amber) 26%, transparent); }
.lc-title { margin: 13px 0 0; font-size: clamp(26px, 3.4vw, 38px); font-weight: 850; letter-spacing: -0.02em; line-height: 1.04; color: var(--as-text); }
.lc-title-accent { background: var(--as-grad-rail); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.lc-sub { margin: 9px 0 0; font-size: 13.5px; line-height: 1.6; color: var(--as-text-muted); max-width: 520px; }
.lc-cta { display: flex; align-items: center; gap: 14px; margin-top: 15px; flex-wrap: wrap; }
.as-btn-steel.busy { opacity: 0.7; pointer-events: none; }
.spin { animation: as-spin 0.9s linear infinite; }
.lc-onrecord { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--as-text-muted); }
.lc-onrecord :deep(svg) { color: var(--as-steel); }
.lc-onrecord b { color: var(--as-text); font-weight: 800; }

/* signature ribbon */
.lc-ribbon { margin-top: 20px; }

/* lenses */
.lc-lenses { display: grid; grid-template-columns: repeat(6, 1fr); gap: 9px; margin-top: 18px; }
@media (max-width: 880px) { .lc-lenses { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 460px) { .lc-lenses { grid-template-columns: repeat(2, 1fr); } }
.lc-lens { position: relative; overflow: hidden; display: flex; align-items: center; gap: 9px; padding: 11px 12px; border-radius: 14px; cursor: pointer; text-align: left; font: inherit;
  background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: border-color 0.22s, background 0.22s, box-shadow 0.22s; }
.lc-lens.stat { cursor: pointer; }
.lc-lens:hover { border-color: color-mix(in srgb, var(--c) 40%, transparent); background: var(--as-surface-elevated); }
.lc-lens.on { border-color: color-mix(in srgb, var(--c) 55%, transparent); background: color-mix(in srgb, var(--c) 10%, transparent); box-shadow: 0 0 0 1px color-mix(in srgb, var(--c) 26%, transparent); }
.lc-lens-ic { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0; color: var(--c);
  background: color-mix(in srgb, var(--c) 13%, transparent); border: 1px solid color-mix(in srgb, var(--c) 26%, transparent); }
.lc-lens-body { display: flex; flex-direction: column; min-width: 0; }
.lc-lens-val { font-size: 17px; font-weight: 850; line-height: 1; color: var(--as-text); }
.lc-lens-lab { font-size: 10.5px; font-weight: 600; letter-spacing: 0.03em; color: var(--as-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lc-lens-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--c); transform: scaleX(0); transform-origin: left; transition: transform 0.3s var(--as-spring); }
.lc-lens.on .lc-lens-bar, .lc-lens:hover .lc-lens-bar { transform: scaleX(1); }

.lc-foot { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin: 12px 0 0; font-size: 10.5px; color: var(--as-text-dim); letter-spacing: 0.03em; }
.lc-foot :deep(svg) { color: var(--as-amber); }

@media (prefers-reduced-motion: reduce) {
  .lc-seal-ring { animation: none; }
}
</style>
