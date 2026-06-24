<template>
  <!-- ════════════════════════════════════════════════════════════════════
       The Passage — console hero for the Relieving Letter. A horizon of
       opening light-gates: concentric thresholds expanding outward, a beam
       streaming through the central arch, and motes drifting OUT (the act of
       being released). Deliberately distinct from the Experience atelier's
       engraving-hall rosette. Telemetry lenses filter the release queue.
       ════════════════════════════════════════════════════════════════════ -->
  <Motion as="section" class="rgc ex-grain" :initial="anim({ opacity: 0, y: 14 })" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
    <!-- ambient passage scene -->
    <div class="rgc-scene" aria-hidden="true">
      <span class="rgc-aura" />
      <!-- expanding threshold arches -->
      <span v-for="n in 3" :key="'g' + n" class="rgc-gate" :style="{ animationDelay: (n * 1.6) + 's' }" />
      <!-- the central beam streaming out -->
      <span class="rgc-beam" />
      <!-- outward-drifting motes -->
      <span v-for="m in 10" :key="'m' + m" class="rgc-mote" :style="moteStyle(m)" />
      <Aperture class="rgc-ghost" :size="220" :stroke-width="0.5" />
    </div>

    <div class="rgc-lead">
      <span class="rgc-eyebrow"><DoorOpen :size="12" /> Exit Management · The Passage</span>
      <h2 class="rgc-title">Relieving Letter <span class="grad">Release</span></h2>
      <p class="rgc-sub">The final clearance. Once every gate is cleared and the full &amp; final settlement is closed,
        the aperture opens — the employee is formally relieved and free to go.</p>
      <div class="rgc-cta">
        <Motion as="button" class="rgc-btn" type="button" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="$emit('refresh')">
          <RotateCcw :size="13" :class="{ spin: loading }" /> Refresh queue
        </Motion>
      </div>
    </div>

    <!-- telemetry lenses -->
    <div class="rgc-lenses">
      <button v-for="l in lensList" :key="l.key" type="button" class="lens" :class="[`tone-${l.tone}`, { on: activeLens === l.key, stat: l.stat }]"
        @click="l.stat ? null : $emit('pick', l.key)">
        <span class="lens-ic"><component :is="l.icon" :size="14" /></span>
        <span class="lens-v"><ExCountUp :value="l.value" /></span>
        <span class="lens-l">{{ l.label }}</span>
        <span class="lens-bar" aria-hidden="true" />
      </button>
    </div>
  </Motion>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { DoorOpen, RotateCcw, Layers, Gem, PenLine, BadgeCheck, FileX, Lock, Aperture } from 'lucide-vue-next'
import ExCountUp from './ExCountUp.vue'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  counts: { type: Object, default: () => ({ total: 0, eligible: 0, drafted: 0, issued: 0, revoked: 0, blocked: 0 }) },
  activeLens: { type: String, default: '' },
  loading: { type: Boolean, default: false },
})
defineEmits(['pick', 'refresh'])

const reduced = prefersReduced()
const anim = (o) => (reduced ? false : o)

const lensList = computed(() => {
  const c = props.counts || {}
  return [
    { key: 'total', label: 'In queue', value: c.total || 0, icon: Layers, tone: 'steel', stat: true },
    { key: 'eligible', label: 'Cleared to release', value: c.eligible || 0, icon: Gem, tone: 'amber' },
    { key: 'drafted', label: 'Drafted', value: c.drafted || 0, icon: PenLine, tone: 'pending' },
    { key: 'issued', label: 'Released', value: c.issued || 0, icon: BadgeCheck, tone: 'cleared' },
    { key: 'revoked', label: 'Revoked', value: c.revoked || 0, icon: FileX, tone: 'blocked' },
    { key: 'blocked', label: 'Held at gate', value: c.blocked || 0, icon: Lock, tone: 'steel' },
  ]
})

const moteStyle = (m) => {
  const seed = (m * 53) % 100
  return { left: (40 + (seed - 50) * 0.35) + '%', bottom: (10 + ((m * 29) % 30)) + '%',
    animationDelay: (m * 0.55) + 's', animationDuration: (6 + (m % 4)) + 's' }
}
</script>

<style scoped>
.rgc { position: relative; overflow: hidden; padding: 22px 24px; border-radius: 22px; margin-bottom: 16px;
  background: var(--ex-surface-elevated); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow); }

.rgc-scene { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.rgc-aura { position: absolute; inset: -50% 0 20% 30%;
  background: radial-gradient(50% 70% at 72% 30%, rgba(52,211,153,0.14), transparent 70%),
              radial-gradient(46% 66% at 80% 10%, rgba(251,146,60,0.16), transparent 72%); animation: rgc-drift 12s ease-in-out infinite; }
/* expanding threshold gates on the right */
.rgc-gate { position: absolute; right: 9%; top: 50%; width: 70px; height: 150px; transform: translateY(-50%) scale(0.4); opacity: 0;
  border: 1.4px solid color-mix(in srgb, var(--ex-cleared) 55%, transparent); border-radius: 40px 40px 6px 6px; border-bottom: none;
  animation: rgc-gate 4.8s ease-out infinite; }
.rgc-beam { position: absolute; right: calc(9% + 30px); top: 50%; width: 3px; height: 0; transform: translateY(-50%);
  background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--ex-cleared) 80%, transparent), transparent);
  filter: blur(0.4px); animation: rgc-beam 4.4s ease-in-out infinite; }
.rgc-mote { position: absolute; width: 4px; height: 4px; border-radius: 50%; background: var(--ex-amber-bright);
  box-shadow: 0 0 8px var(--ex-ember); opacity: 0.5; animation: rgc-mote ease-in-out infinite; }
.rgc-ghost { position: absolute; right: -28px; top: 50%; transform: translateY(-50%); color: var(--ex-cleared); opacity: 0.07; animation: rgc-spin 80s linear infinite; }

.rgc-lead { position: relative; }
.rgc-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ex-cleared); padding: 4px 10px; border-radius: 999px; background: var(--ex-cleared-soft); border: 1px solid color-mix(in srgb, var(--ex-cleared) 28%, transparent); }
.rgc-title { font-size: clamp(21px, 3vw, 30px); font-weight: 850; margin: 11px 0 4px; color: var(--ex-text); line-height: 1.08; }
.rgc-title .grad { background: linear-gradient(120deg, #34d399 0%, #fb923c 70%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.rgc-sub { font-size: 13px; color: var(--ex-text-secondary); margin: 0; max-width: 580px; }
.rgc-cta { margin-top: 13px; }
.rgc-btn { display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 11px; cursor: pointer; font-size: 12.5px; font-weight: 700; font-family: inherit;
  background: var(--ex-surface); border: 1px solid var(--ex-border-strong); color: var(--ex-text-secondary); }
.rgc-btn .spin { animation: ex-spin-slow 0.8s linear infinite; }

.rgc-lenses { position: relative; display: grid; grid-template-columns: repeat(6, 1fr); gap: 9px; margin-top: 18px; }
.lens { position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 11px 12px 13px; border-radius: 14px; cursor: pointer; text-align: left;
  background: var(--ex-surface); border: 1px solid var(--ex-border); font-family: inherit; transition: transform 0.2s, border-color 0.2s, background 0.2s; }
.lens:hover:not(.stat) { transform: translateY(-2px); border-color: color-mix(in srgb, var(--lc) 50%, transparent); }
.lens.stat { cursor: default; }
.lens.on { border-color: color-mix(in srgb, var(--lc) 60%, transparent); background: color-mix(in srgb, var(--lc) 11%, transparent); }
.lens-ic { display: grid; place-items: center; width: 27px; height: 27px; border-radius: 9px; margin-bottom: 4px; color: var(--lc);
  background: color-mix(in srgb, var(--lc) 14%, transparent); }
.lens-v { font-size: 20px; font-weight: 850; color: var(--ex-text); font-variant-numeric: tabular-nums; line-height: 1; }
.lens-l { font-size: 10.5px; font-weight: 650; color: var(--ex-text-muted); }
.lens-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2.5px; background: var(--lc); transform: scaleX(0); transform-origin: left; transition: transform 0.3s var(--ex-spring); }
.lens.on .lens-bar, .lens:hover:not(.stat) .lens-bar { transform: scaleX(1); }
.tone-steel { --lc: var(--ex-steel); } .tone-amber { --lc: var(--ex-ember); } .tone-pending { --lc: var(--ex-amber); }
.tone-cleared { --lc: var(--ex-cleared); } .tone-blocked { --lc: var(--ex-blocked); }

@keyframes rgc-spin { to { transform: translateY(-50%) rotate(360deg); } }
@keyframes rgc-drift { 0%, 100% { transform: translate(0,0) scale(1); opacity: 0.7; } 50% { transform: translate(-2%, 2%) scale(1.05); opacity: 1; } }
@keyframes rgc-gate { 0% { transform: translateY(-50%) scale(0.35); opacity: 0; } 25% { opacity: 0.8; } 100% { transform: translateY(-50%) scale(1.5); opacity: 0; } }
@keyframes rgc-beam { 0%, 100% { height: 0; opacity: 0; } 50% { height: 120px; opacity: 0.85; } }
@keyframes rgc-mote { 0% { transform: translate(0,0); opacity: 0; } 18% { opacity: 0.7; } 100% { transform: translate(34px, -30px); opacity: 0; } }

@media (max-width: 920px) { .rgc-lenses { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 520px) { .rgc-lenses { grid-template-columns: repeat(2, 1fr); } }
@media (prefers-reduced-motion: reduce) {
  .rgc-aura, .rgc-gate, .rgc-beam, .rgc-mote, .rgc-ghost, .rgc-btn .spin { animation: none; }
  .rgc-gate, .rgc-mote { display: none; }
}
</style>
