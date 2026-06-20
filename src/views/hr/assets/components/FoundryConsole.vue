<template>
  <Motion as="section" class="fdy" ref="root"
    :initial="reduced ? false : { opacity: 0, y: 16 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
    <span class="as-grain" aria-hidden="true" />
    <span class="fdy-aura" aria-hidden="true" />
    <span class="as-blueprint-floor" aria-hidden="true" />
    <span class="fdy-emberbg" aria-hidden="true" />

    <!-- ════ lead + crucible ════ -->
    <div class="fdy-top">
      <div class="fdy-lead">
        <span class="fdy-eyebrow"><Flame :size="13" /> Decommission Foundry · End-of-Life Control</span>
        <h1 class="fdy-title">End of <span class="fdy-title-accent">Line</span></h1>
        <p class="fdy-sub">Retire spent assets through a guarded approval workflow — and reclaim every rupee of residual value the foundry can pour back.</p>
        <div class="fdy-cta">
          <Motion as="button" type="button" class="as-btn as-btn-primary"
            :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('new')">
            <Plus :size="14" /> Request disposal
          </Motion>
          <Motion as="button" type="button" class="as-btn as-btn-steel"
            :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('go', 'history')">
            <History :size="14" /> Movement log
          </Motion>
          <Motion as="button" type="button" class="as-btn as-btn-ghost"
            :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('go', 'maintenance')">
            <Wrench :size="14" /> Service bay
          </Motion>
        </div>
      </div>

      <div class="fdy-gauge" ref="gaugeEl">
        <DisposalCrucible :recovery="recovery" :intensity="(counts.requested || 0) + (counts.approved || 0)" :start="gaugeIn" :size="208" />
        <div class="fdy-ledger">
          <div class="fdy-pour" :title="`${recovery}% of retired book value recovered`">
            <span class="fdy-pour-fill" :style="{ width: poured }" />
          </div>
          <div class="fdy-ledger-stats">
            <span class="fdy-ls">
              <b class="as-mono"><AssetCountUp :value="bookRetired" :start="gaugeIn" :duration="1.3" prefix="₹" /></b>
              <small>book retired</small>
            </span>
            <span class="fdy-ls gain">
              <b class="as-mono"><AssetCountUp :value="recovered" :start="gaugeIn" :duration="1.4" prefix="₹" /></b>
              <small>recovered</small>
            </span>
            <span class="fdy-ls" :class="writeDown >= 0 ? 'loss' : 'gain'">
              <b class="as-mono">
                <component :is="writeDown >= 0 ? TrendingDown : TrendingUp" :size="12" />
                <AssetCountUp :value="Math.abs(writeDown)" :start="gaugeIn" :duration="1.5" prefix="₹" />
              </b>
              <small>{{ writeDown >= 0 ? 'written down' : 'net gain' }}</small>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- ════ status lenses (filterable) ════ -->
    <div class="fdy-lenses" ref="lensEl">
      <Motion v-for="(l, i) in lenses" :key="l.key" as="button" type="button" class="fdy-lens"
        :class="{ on: activeStatus === l.status }" :data-tone="l.tone"
        :initial="reduced ? false : { opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }"
        :whileHover="{ y: -3 }" :whileTap="{ scale: 0.97 }"
        :title="l.hint" @click="$emit('pick', l.status)">
        <span class="fdy-lens-ic"><component :is="l.icon" :size="15" /></span>
        <span class="fdy-lens-val"><AssetCountUp :value="l.value" :start="lensIn" :duration="1 + i * 0.06" /></span>
        <span class="fdy-lens-lab">{{ l.label }}</span>
      </Motion>
    </div>

    <!-- ════ the decommission line ════ -->
    <div class="fdy-line" ref="lineEl">
      <button v-for="(st, i) in stations" :key="st.key" type="button" class="fdy-station"
        :class="{ on: activeStatus === st.status }" :data-tone="st.tone"
        @click="$emit('pick', st.status)" :title="`Filter · ${st.label}`">
        <span class="fdy-st-node">
          <span class="fdy-st-ic"><component :is="st.icon" :size="17" /></span>
          <span v-if="st.last && st.value && !reduced" class="fdy-st-flame"><Flame :size="13" /></span>
        </span>
        <span class="fdy-st-meta">
          <span class="fdy-st-val"><AssetCountUp :value="st.value" :start="lineIn" :duration="1.1" /></span>
          <span class="fdy-st-lab">{{ st.label }}</span>
          <span class="fdy-st-sub">{{ st.sub }}</span>
        </span>
        <span v-if="i < stations.length - 1" class="fdy-rail" aria-hidden="true">
          <span class="fdy-rail-belt" :data-flow="flowOn(i)" />
          <span v-if="!reduced && flowOn(i)" class="fdy-ingot"><PackageMinus :size="9" /></span>
        </span>
      </button>

      <!-- diverted vent (rejected + cancelled) -->
      <div class="fdy-vent" :class="{ has: diverted > 0 }" :title="`${counts.rejected || 0} rejected · ${counts.cancelled || 0} cancelled`">
        <span class="fdy-vent-ic"><Ban :size="14" /></span>
        <span class="fdy-vent-meta">
          <b><AssetCountUp :value="diverted" :start="lineIn" :duration="1.2" /></b>
          <small>diverted</small>
        </span>
      </div>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import {
  Flame, Plus, History, Wrench, Ban, PackageMinus, ShieldCheck,
  ClipboardList, CircleCheck, XCircle, TrendingDown, TrendingUp,
} from 'lucide-vue-next'
import DisposalCrucible from './DisposalCrucible.vue'
import AssetCountUp from './AssetCountUp.vue'
import { prefersReduced, useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  counts: { type: Object, default: () => ({ requested: 0, approved: 0, completed: 0, rejected: 0, cancelled: 0, total: 0 }) },
  recovery: { type: Number, default: 0 },
  bookRetired: { type: Number, default: 0 },
  recovered: { type: Number, default: 0 },
  activeStatus: { type: String, default: '' },
})
defineEmits(['pick', 'reset', 'new', 'go'])

const root = ref(null)
const gaugeEl = ref(null)
const lensEl = ref(null)
const lineEl = ref(null)
const reduced = prefersReduced()
const { visible: gaugeIn } = useInView(gaugeEl, { threshold: 0.2 })
const { visible: lensIn } = useInView(lensEl, { threshold: 0.2 })
const { visible: lineIn } = useInView(lineEl, { threshold: 0.15 })

const c = computed(() => props.counts || {})
const writeDown = computed(() => (props.bookRetired || 0) - (props.recovered || 0))
const diverted = computed(() => (c.value.rejected || 0) + (c.value.cancelled || 0))
const poured = computed(() => {
  const b = props.bookRetired || 0
  if (!b) return '0%'
  return Math.max(0, Math.min(100, (props.recovered / b) * 100)) + '%'
})

const lenses = computed(() => [
  { key: 'req', status: 'REQUESTED', label: 'Requested', value: c.value.requested || 0, tone: 'req', icon: ClipboardList, hint: 'Awaiting approval' },
  { key: 'app', status: 'APPROVED',  label: 'Cleared',   value: c.value.approved || 0,  tone: 'app', icon: ShieldCheck,   hint: 'Approved for disposal' },
  { key: 'cmp', status: 'COMPLETED', label: 'Retired',   value: c.value.completed || 0, tone: 'cmp', icon: CircleCheck,   hint: 'Decommissioned' },
  { key: 'rej', status: 'REJECTED',  label: 'Rejected',  value: c.value.rejected || 0,  tone: 'rej', icon: XCircle,       hint: 'Request denied' },
  { key: 'can', status: 'CANCELLED', label: 'Cancelled', value: c.value.cancelled || 0, tone: 'can', icon: Ban,           hint: 'Stood down' },
])

const stations = computed(() => [
  { key: 'intake',  status: 'REQUESTED', label: 'Intake',  sub: 'awaiting review', tone: 'req', value: c.value.requested || 0, icon: PackageMinus },
  { key: 'cleared', status: 'APPROVED',  label: 'Cleared', sub: 'approved',        tone: 'app', value: c.value.approved || 0,  icon: ShieldCheck },
  { key: 'foundry', status: 'COMPLETED', label: 'Foundry', sub: 'retired',         tone: 'cmp', value: c.value.completed || 0, icon: Flame, last: true },
])
const flowOn = (i) => {
  if (i === 0) return (c.value.requested || 0) > 0 || (c.value.approved || 0) > 0
  return (c.value.approved || 0) > 0 || (c.value.completed || 0) > 0
}
</script>

<style scoped>
.fdy { position: relative; overflow: hidden; border-radius: 24px; padding: 24px 26px 22px;
  border: 1px solid var(--as-border-soft); background: var(--as-dome); box-shadow: var(--as-card-shadow); }
.fdy-aura { position: absolute; inset: -45% -15% auto -15%; height: 90%; pointer-events: none; z-index: 0; background: var(--as-grad-hero); filter: blur(10px); }
.fdy-emberbg { position: absolute; right: -8%; bottom: -30%; width: 60%; height: 90%; pointer-events: none; z-index: 0;
  background: radial-gradient(60% 60% at 70% 100%, color-mix(in srgb, var(--as-ember) 16%, transparent), transparent 70%); filter: blur(20px); }

/* ── lead + crucible ── */
.fdy-top { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 30px; flex-wrap: wrap; }
.fdy-lead { max-width: 480px; min-width: 280px; flex: 1; }
.fdy-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--as-ember); padding: 5px 11px; border-radius: 999px; background: color-mix(in srgb, var(--as-ember) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--as-ember) 26%, transparent); }
.fdy-title { margin: 14px 0 0; font-size: clamp(28px, 3.6vw, 42px); font-weight: 850; letter-spacing: -0.025em; color: var(--as-text); line-height: 1.02; }
.fdy-title-accent { background: linear-gradient(180deg, var(--as-amber-bright), var(--as-ember)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.fdy-sub { margin: 9px 0 0; font-size: 13.5px; line-height: 1.6; color: var(--as-text-muted); max-width: 450px; }
.fdy-cta { display: flex; gap: 9px; margin-top: 17px; flex-wrap: wrap; }

.fdy-gauge { display: flex; flex-direction: column; align-items: center; gap: 14px; flex-shrink: 0; }
.fdy-ledger { width: 224px; display: flex; flex-direction: column; gap: 9px; }
.fdy-pour { position: relative; height: 8px; border-radius: 999px; overflow: hidden;
  background: color-mix(in srgb, var(--as-steel) 18%, transparent); border: 1px solid var(--as-border-soft); }
.fdy-pour-fill { position: absolute; inset: 0 auto 0 0; border-radius: 999px; transition: width 1.4s var(--as-ease);
  background: linear-gradient(90deg, var(--as-ember-deep), var(--as-amber), var(--as-amber-bright));
  box-shadow: 0 0 10px color-mix(in srgb, var(--as-amber) 60%, transparent); }
.fdy-pour-fill::after { content: ''; position: absolute; inset: 0; border-radius: inherit; opacity: 0.7;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent); background-size: 200% 100%; animation: fdy-flow 2.4s linear infinite; }
.fdy-ledger-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.fdy-ls { display: flex; flex-direction: column; gap: 1px; padding: 8px 9px; border-radius: 11px; min-width: 0;
  background: var(--as-panel); border: 1px solid var(--as-border-soft); }
.fdy-ls b { display: inline-flex; align-items: center; gap: 3px; font-size: 13px; font-weight: 800; color: var(--as-text); white-space: nowrap; }
.fdy-ls small { font-size: 8.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--as-text-dim); }
.fdy-ls.gain b { color: var(--as-st-available); }
.fdy-ls.loss b { color: var(--as-cond-poor); }

/* ── status lenses ── */
.fdy-lenses { position: relative; z-index: 1; margin-top: 22px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 9px; }
.fdy-lens { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 2px; padding: 12px 13px 11px; border-radius: 15px; text-align: left; cursor: pointer;
  background: var(--as-panel); border: 1px solid var(--as-border-soft); backdrop-filter: blur(8px); transition: border-color 0.25s, box-shadow 0.25s; }
.fdy-lens::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 2px; opacity: 0.85; background: linear-gradient(90deg, transparent, var(--lc, var(--as-amber)), transparent); }
.fdy-lens:hover { border-color: var(--as-border-strong); box-shadow: var(--as-card-shadow-hover); }
.fdy-lens.on { border-color: color-mix(in srgb, var(--lc) 55%, transparent); box-shadow: 0 0 0 1px color-mix(in srgb, var(--lc) 30%, transparent), var(--as-card-shadow-hover); }
.fdy-lens[data-tone="req"] { --lc: var(--as-st-reserved); }
.fdy-lens[data-tone="app"] { --lc: var(--as-st-allocated); }
.fdy-lens[data-tone="cmp"] { --lc: var(--as-st-available); }
.fdy-lens[data-tone="rej"] { --lc: var(--as-cond-poor); }
.fdy-lens[data-tone="can"] { --lc: var(--as-st-retired); }
.fdy-lens-ic { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; color: var(--lc); background: color-mix(in srgb, var(--lc) 14%, transparent); }
.fdy-lens-val { font-size: 22px; font-weight: 850; color: var(--as-text); margin-top: 7px; line-height: 1; }
.fdy-lens-lab { font-size: 10px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-dim); margin-top: 3px; }

/* ── decommission line ── */
.fdy-line { position: relative; z-index: 1; margin-top: 20px; display: flex; align-items: stretch; gap: 0; padding: 16px 18px; border-radius: 18px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--as-surface-elevated) 70%, transparent), var(--as-surface));
  border: 1px solid var(--as-border-soft); overflow: hidden; }
.fdy-station { position: relative; flex: 1 1 0; min-width: 0; display: flex; align-items: center; gap: 12px; padding: 6px 8px; cursor: pointer;
  background: transparent; border: 0; border-radius: 14px; font: inherit; text-align: left; transition: background 0.25s; }
.fdy-station:hover { background: color-mix(in srgb, var(--lc, var(--as-amber)) 8%, transparent); }
.fdy-station[data-tone="req"] { --lc: var(--as-st-reserved); }
.fdy-station[data-tone="app"] { --lc: var(--as-st-allocated); }
.fdy-station[data-tone="cmp"] { --lc: var(--as-ember); }
.fdy-station.on { background: color-mix(in srgb, var(--lc) 12%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--lc) 34%, transparent); }
.fdy-st-node { position: relative; flex-shrink: 0; }
.fdy-st-ic { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 13px; color: var(--lc);
  background: color-mix(in srgb, var(--lc) 13%, transparent); border: 1px solid color-mix(in srgb, var(--lc) 28%, transparent); }
.fdy-st-flame { position: absolute; right: -5px; bottom: -5px; display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%;
  color: var(--as-amber-bright); background: var(--as-surface-elevated); border: 1px solid color-mix(in srgb, var(--as-ember) 40%, transparent);
  box-shadow: 0 0 10px color-mix(in srgb, var(--as-ember) 60%, transparent); animation: fdy-flicker 1.5s ease-in-out infinite; }
.fdy-st-meta { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.fdy-st-val { font-size: 24px; font-weight: 850; color: var(--as-text); line-height: 1; }
.fdy-st-lab { font-size: 11.5px; font-weight: 700; color: var(--as-text); margin-top: 3px; }
.fdy-st-sub { font-size: 9.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--lc); }

.fdy-rail { position: absolute; right: -22px; top: 50%; transform: translateY(-50%); width: 44px; height: 16px; pointer-events: none; z-index: 2; display: flex; align-items: center; overflow: hidden; }
.fdy-rail-belt { position: absolute; inset: 6px 0; border-radius: 3px;
  background: repeating-linear-gradient(90deg, color-mix(in srgb, var(--as-ember) 42%, transparent) 0 6px, transparent 6px 12px);
  background-size: 24px 100%; opacity: 0.45; }
.fdy-rail-belt[data-flow="true"] { animation: as-convey 1.1s linear infinite; opacity: 0.7; }
.fdy-ingot { position: absolute; top: 50%; left: 0; width: 16px; height: 16px; margin-top: -8px; border-radius: 4px; display: grid; place-items: center;
  color: var(--as-amber); background: var(--as-surface-elevated); border: 1px solid color-mix(in srgb, var(--as-amber) 38%, transparent);
  box-shadow: 0 2px 8px -2px color-mix(in srgb, var(--as-amber) 60%, transparent); animation: fdy-ingot 2.6s ease-in-out infinite; }

.fdy-vent { flex: 0 0 auto; display: flex; align-items: center; gap: 9px; padding: 8px 14px; margin-left: 12px; border-radius: 14px;
  border-left: 1px dashed var(--as-border-strong); padding-left: 18px; opacity: 0.55; }
.fdy-vent.has { opacity: 1; }
.fdy-vent-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; color: var(--as-st-retired); background: var(--as-st-retired-soft); }
.fdy-vent-meta { display: flex; flex-direction: column; line-height: 1; }
.fdy-vent-meta b { font-size: 18px; font-weight: 850; color: var(--as-text); }
.fdy-vent-meta small { font-size: 8.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--as-text-dim); margin-top: 3px; }

@keyframes fdy-flow { 0% { background-position: 180% 0; } 100% { background-position: -80% 0; } }
@keyframes fdy-flicker { 0%, 100% { transform: scale(1); opacity: 0.85; } 50% { transform: scale(1.12); opacity: 1; } }
@keyframes fdy-ingot { 0% { left: 0; opacity: 0; } 14% { opacity: 1; } 86% { opacity: 1; } 100% { left: calc(100% - 16px); opacity: 0; } }

@media (max-width: 1080px) {
  .fdy-lenses { grid-template-columns: repeat(5, 1fr); }
  .fdy-line { flex-wrap: wrap; gap: 12px; }
  .fdy-station { flex: 1 1 40%; }
  .fdy-rail { display: none; }
  .fdy-vent { flex: 1 1 100%; justify-content: center; border-left: 0; border-top: 1px dashed var(--as-border-strong); padding: 12px 0 0; margin: 4px 0 0; }
}
@media (max-width: 680px) {
  .fdy-lenses { grid-template-columns: repeat(3, 1fr); }
  .fdy-gauge { width: 100%; }
  .fdy-ledger { width: 100%; max-width: 320px; }
  .fdy-station { flex: 1 1 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .fdy-pour-fill::after, .fdy-st-flame, .fdy-rail-belt, .fdy-ingot { animation: none; }
  .fdy-pour-fill { transition: none; }
}
</style>
