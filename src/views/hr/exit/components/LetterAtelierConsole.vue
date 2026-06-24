<template>
  <!-- ════════════════════════════════════════════════════════════════════
       The Atelier — console hero for the Credential Mint. An ambient
       engraving-hall backdrop (slow guilloché rosette, drifting gold motes,
       a foil sweep) behind the title, a queue ribbon, and clickable
       telemetry lenses that filter the roster. RM-guarded.
       ════════════════════════════════════════════════════════════════════ -->
  <Motion as="section" class="atl ex-grain" :initial="anim({ opacity: 0, y: 14 })" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
    <!-- ambient atelier scene -->
    <div class="atl-scene" aria-hidden="true">
      <span class="atl-aura" />
      <svg class="atl-rose" viewBox="0 0 300 300"><g class="atl-spin"><path :d="rose" /></g></svg>
      <span class="atl-foil" />
      <span v-for="m in 9" :key="m" class="atl-mote" :style="moteStyle(m)" />
    </div>

    <div class="atl-lead">
      <span class="atl-eyebrow"><Gem :size="12" /> Exit Management · Credential Atelier</span>
      <h2 class="atl-title">{{ isRelieving ? 'Relieving Letter' : 'Experience Letter' }}
        <span class="grad">{{ isRelieving ? 'Release' : 'Mint' }}</span></h2>
      <p class="atl-sub">{{ isRelieving
        ? 'The official release — struck once clearance is complete and the full & final settlement is closed.'
        : 'The service certificate — engraved, sealed and verifiable, struck after the employee has formally exited.' }}</p>
      <div class="atl-cta">
        <Motion as="button" class="atl-btn" type="button" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="$emit('refresh')">
          <RotateCcw :size="13" :class="{ spin: loading }" /> Refresh queue
        </Motion>
      </div>
    </div>

    <!-- telemetry lenses -->
    <div class="atl-lenses">
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
import { Gem, RotateCcw, Layers, PenLine, BadgeCheck, FileX, Lock } from 'lucide-vue-next'
import ExCountUp from './ExCountUp.vue'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  letterType: { type: String, default: 'experience-letter' },
  counts: { type: Object, default: () => ({ total: 0, eligible: 0, drafted: 0, issued: 0, revoked: 0, blocked: 0 }) },
  activeLens: { type: String, default: '' },
  loading: { type: Boolean, default: false },
})
defineEmits(['pick', 'refresh'])

const reduced = prefersReduced()
const anim = (o) => (reduced ? false : o)
const isRelieving = computed(() => props.letterType === 'relieving-letter')

const lensList = computed(() => {
  const c = props.counts || {}
  return [
    { key: 'total', label: 'In queue', value: c.total || 0, icon: Layers, tone: 'steel', stat: true },
    { key: 'eligible', label: 'Ready to mint', value: c.eligible || 0, icon: Gem, tone: 'amber' },
    { key: 'drafted', label: 'Drafted', value: c.drafted || 0, icon: PenLine, tone: 'pending' },
    { key: 'issued', label: 'Issued', value: c.issued || 0, icon: BadgeCheck, tone: 'cleared' },
    { key: 'revoked', label: 'Revoked', value: c.revoked || 0, icon: FileX, tone: 'blocked' },
    { key: 'blocked', label: 'Awaiting', value: c.blocked || 0, icon: Lock, tone: 'steel' },
  ]
})

const rose = (() => {
  let d = ''
  for (let i = 0; i <= 260; i++) {
    const t = (i / 260) * Math.PI * 2
    const r = 120 + 14 * Math.sin(16 * t)
    const x = 150 + r * Math.cos(t), y = 150 + r * Math.sin(t)
    d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)
  }
  return d + 'Z'
})()
const moteStyle = (m) => {
  const seed = (m * 73) % 100
  return { left: (8 + seed * 0.9) + '%', top: (12 + ((m * 37) % 70)) + '%',
    animationDelay: (m * 0.7) + 's', animationDuration: (7 + (m % 4)) + 's' }
}
</script>

<style scoped>
.atl { position: relative; overflow: hidden; padding: 22px 24px; border-radius: 22px; margin-bottom: 16px;
  background: var(--ex-surface-elevated); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow); }

.atl-scene { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.atl-aura { position: absolute; inset: -40% 30% 30% -10%;
  background: radial-gradient(62% 80% at 22% 0%, rgba(251,146,60,0.18), transparent 70%); animation: atl-drift 11s ease-in-out infinite; }
.atl-rose { position: absolute; right: -60px; top: 50%; transform: translateY(-50%); width: 320px; height: 320px; opacity: 0.16; }
.atl-rose path { fill: none; stroke: var(--ex-ember); stroke-width: 0.8; }
.atl-spin { transform-origin: 150px 150px; animation: atl-spin 72s linear infinite; }
.atl-foil { position: absolute; inset: 0; mix-blend-mode: overlay;
  background: linear-gradient(112deg, transparent 42%, rgba(255,220,150,0.4) 50%, transparent 58%); transform: translateX(-120%); animation: atl-foil 9s ease-in-out infinite 2s; }
.atl-mote { position: absolute; width: 4px; height: 4px; border-radius: 50%; background: var(--ex-amber-bright);
  box-shadow: 0 0 8px var(--ex-amber); opacity: 0.5; animation: atl-mote 8s ease-in-out infinite; }

.atl-lead { position: relative; }
.atl-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ex-violet); padding: 4px 10px; border-radius: 999px; background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.atl-title { font-size: clamp(21px, 3vw, 30px); font-weight: 850; margin: 11px 0 4px; color: var(--ex-text); line-height: 1.08; }
.atl-title .grad { background: var(--ex-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.atl-sub { font-size: 13px; color: var(--ex-text-secondary); margin: 0; max-width: 560px; }
.atl-cta { margin-top: 13px; }
.atl-btn { display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 11px; cursor: pointer; font-size: 12.5px; font-weight: 700; font-family: inherit;
  background: var(--ex-surface); border: 1px solid var(--ex-border-strong); color: var(--ex-text-secondary); }
.atl-btn .spin { animation: ex-spin-slow 0.8s linear infinite; }

.atl-lenses { position: relative; display: grid; grid-template-columns: repeat(6, 1fr); gap: 9px; margin-top: 18px; }
.lens { position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 11px 12px 13px; border-radius: 14px; cursor: pointer; text-align: left;
  background: var(--ex-surface); border: 1px solid var(--ex-border); font-family: inherit; transition: transform 0.2s, border-color 0.2s, background 0.2s; }
.lens:hover:not(.stat) { transform: translateY(-2px); border-color: var(--ex-violet-border); }
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

@keyframes atl-spin { to { transform: rotate(360deg); } }
@keyframes atl-drift { 0%, 100% { transform: translate(0,0) scale(1); opacity: 0.55; } 50% { transform: translate(2%, -3%) scale(1.06); opacity: 0.8; } }
@keyframes atl-foil { 0% { transform: translateX(-120%); } 40%, 100% { transform: translateX(160%); } }
@keyframes atl-mote { 0%, 100% { transform: translateY(0); opacity: 0.2; } 50% { transform: translateY(-22px); opacity: 0.7; } }

@media (max-width: 920px) { .atl-lenses { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 520px) { .atl-lenses { grid-template-columns: repeat(2, 1fr); } }
@media (prefers-reduced-motion: reduce) {
  .atl-aura, .atl-spin, .atl-foil, .atl-mote, .atl-btn .spin { animation: none; }
}
</style>
