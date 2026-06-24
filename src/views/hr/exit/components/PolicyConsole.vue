<template>
  <Motion as="section" class="pc ex-grain" :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
    <span class="pc-aura" aria-hidden="true" />
    <span class="pc-floor" aria-hidden="true" />
    <span class="pc-motif" aria-hidden="true"><Scale :size="320" /></span>

    <!-- lead -->
    <div class="pc-lead">
      <span class="pc-eyebrow"><FileBadge :size="12" /> Exit Management · Governance</span>
      <h1 class="pc-title">The Separation <span class="accent">Charter</span></h1>
      <p class="pc-sub">The rulebook that governs every exit — notice, clearance gates, gratuity &amp; the settlement approval chain. Per grade, or the organisation default.</p>
      <div class="pc-cta">
        <Motion as="button" type="button" class="pc-btn primary" :whileHover="reduced ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('new')">
          <Plus :size="15" /> Draft a policy
        </Motion>
        <Motion as="button" type="button" class="pc-btn ghost" :whileHover="reduced ? {} : { y: -2 }" :whileTap="{ scale: 0.97 }" @click="$emit('refresh')">
          <RotateCcw :size="14" :class="{ spin: loading }" /> Refresh
        </Motion>
      </div>
    </div>

    <!-- telemetry lenses -->
    <div class="pc-lenses">
      <button v-for="l in lenses" :key="l.key" type="button" class="lens" :class="{ on: activeLens === l.key, stat: l.stat }"
        @click="!l.stat && $emit('pick', l.key)">
        <span class="lens-ico" :style="{ '--c': l.hex }"><component :is="l.icon" :size="15" /></span>
        <span class="lens-v ex-mono"><ExCountUp :value="l.value" :suffix="l.suffix || ''" /></span>
        <span class="lens-l">{{ l.label }}</span>
        <span class="lens-bar" :style="{ '--c': l.hex }" />
      </button>
    </div>

    <!-- ─── signature instrument: Governance Blueprint ─── -->
    <div class="blueprint">
      <span class="bp-cross" aria-hidden="true" />
      <span class="bp-corner tl" aria-hidden="true" /><span class="bp-corner tr" aria-hidden="true" />
      <span class="bp-corner bl" aria-hidden="true" /><span class="bp-corner br" aria-hidden="true" />

      <header class="bp-head">
        <span class="bp-tag"><Ruler :size="12" /> Governing blueprint</span>
        <div class="bp-title">
          <Stamp :size="14" :class="focus ? 'lit' : ''" />
          <b>{{ focus ? focus.policy_name : 'No policy in force' }}</b>
          <span v-if="focus" class="bp-scope">{{ focus.grade_id ? focus.grade_name : 'Organisation default' }}</span>
          <span v-if="focus && focus.is_active" class="bp-inforce"><ShieldCheck :size="11" /> in force</span>
        </div>
        <span class="bp-hint">click a stage to open it →</span>
      </header>

      <!-- rail -->
      <div class="bp-rail" :class="{ ghost: !focus }">
        <span class="bp-line" aria-hidden="true">
          <span class="bp-line-fill" /><span class="bp-pulse" />
        </span>

        <button v-for="(s, i) in stages" :key="s.key" type="button" class="bp-node" :style="{ '--d': i }"
          :class="{ term: !s.tab }" :disabled="!s.tab" @click="s.tab && $emit('go', { tab: s.tab })">
          <span class="bp-medal"><component :is="s.icon" :size="16" /></span>
          <span class="bp-name">{{ s.label }}</span>

          <!-- per-stage annotation -->
          <span class="bp-ann">
            <template v-if="s.key === 'resignation'">intake &amp; review</template>

            <template v-else-if="s.key === 'notice'">
              <span class="caliper" :class="{ go: mounted }">
                <span class="cal-jaw l" /><span class="cal-beam" /><span class="cal-jaw r" />
                <span class="cal-read ex-mono">{{ focus ? focus.notice_period_days : '—' }}<i>d</i></span>
              </span>
              <span class="ann-sub">probation {{ focus ? focus.probation_notice_days : '—' }}d · buyout {{ focus ? (focus.buyout_allowed ? 'on' : 'off') : '—' }}</span>
            </template>

            <template v-else-if="s.key === 'clearance'">
              <span class="gates">
                <i v-for="g in gateTicks" :key="g" class="gate-tick" :style="{ '--g': g }" />
              </span>
              <span class="ann-sub">{{ focus ? (gateCount || 'default') : '—' }} {{ gateCount === 1 ? 'gate' : 'gates' }}</span>
            </template>

            <template v-else-if="s.key === 'settlement'">
              <span class="set-chips">
                <span class="set-chip" :class="focus && focus.gratuity_enabled ? 'on' : ''"><Coins :size="10" /> {{ focus ? (focus.gratuity_enabled ? `≥${gratYears}y` : 'no gratuity') : '—' }}</span>
                <span class="set-chip"><Workflow :size="10" /> {{ chainLen }}-stage</span>
              </span>
              <span class="ann-sub">basis · {{ focus ? (focus.buyout_basis || 'BASIC').toLowerCase() : '—' }}</span>
            </template>

            <template v-else>lifecycle → exited</template>
          </span>
        </button>
      </div>

      <p v-if="!focus" class="bp-empty">Draft an organisation-default policy to put a governing charter in force.</p>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  FileBadge, Plus, RotateCcw, Scale, Ruler, Stamp, ShieldCheck, NotebookPen,
  CalendarClock, DoorOpen, Coins, Workflow, Layers, CircleSlash, Building2, GraduationCap, Flag,
} from 'lucide-vue-next'
import ExCountUp from './ExCountUp.vue'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  stats: { type: Object, default: () => ({}) },
  activeLens: { type: String, default: '' },
  focus: { type: Object, default: null },
  loading: { type: Boolean, default: false },
})
defineEmits(['pick', 'new', 'refresh', 'go'])
const reduced = prefersReduced()

const mounted = ref(false)
onMounted(() => { requestAnimationFrame(() => { mounted.value = true }) })

const lenses = computed(() => {
  const s = props.stats
  return [
    { key: 'all', label: 'Policies', icon: Layers, hex: '#fb923c', value: s.total || 0 },
    { key: 'active', label: 'Active', icon: ShieldCheck, hex: '#34d399', value: s.active || 0 },
    { key: 'inactive', label: 'Inactive', icon: CircleSlash, hex: '#9ca3af', value: s.inactive || 0 },
    { key: 'default', label: 'Org default', icon: Building2, hex: '#fbbf24', value: s.default || 0 },
    { key: 'scoped', label: 'Grade-scoped', icon: GraduationCap, hex: '#ea580c', value: s.scoped || 0 },
    { key: 'avg', label: 'Avg notice', icon: CalendarClock, hex: '#f59e0b', value: s.avgNotice || 0, suffix: 'd', stat: true },
  ]
})

const stages = [
  { key: 'resignation', tab: 'resignation', label: 'Resignation', icon: NotebookPen },
  { key: 'notice', tab: 'notice', label: 'Notice', icon: CalendarClock },
  { key: 'clearance', tab: 'clearance', label: 'Clearance', icon: DoorOpen },
  { key: 'settlement', tab: 'settlement', label: 'Settlement', icon: Scale },
  { key: 'exit', tab: null, label: 'Exit', icon: Flag },
]

const gateCount = computed(() => (props.focus?.clearance_template || []).length || 0)
const gateTicks = computed(() => Array.from({ length: Math.min(8, gateCount.value || 5) }, (_, i) => i))
const chainLen = computed(() => (props.focus?.approval_levels || []).length || 0)
const gratYears = computed(() => Number(props.focus?.gratuity_min_years ?? 0))
</script>

<style scoped>
.pc { position: relative; overflow: hidden; margin-bottom: 16px; padding: 22px 22px 20px; border-radius: 22px;
  background: var(--ex-surface); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow); }
.pc-aura { position: absolute; inset: -40% 30% 40% -10%; pointer-events: none; animation: ex-aura-drift 13s ease-in-out infinite;
  background: radial-gradient(60% 80% at 24% 0%, rgba(251,146,60,0.16), transparent 70%); }
.pc-floor { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(var(--ex-border) 1px, transparent 1px), linear-gradient(90deg, var(--ex-border) 1px, transparent 1px);
  background-size: 34px 34px; mask: radial-gradient(120% 120% at 80% -10%, #000, transparent 70%); -webkit-mask: radial-gradient(120% 120% at 80% -10%, #000, transparent 70%); }
.pc-motif { position: absolute; right: -70px; top: -90px; color: var(--ex-violet); opacity: 0.05; pointer-events: none; animation: ex-spin-slow 90s linear infinite; }

.pc-lead { position: relative; max-width: 640px; }
.pc-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); padding: 4px 11px; border-radius: 999px; }
.pc-title { margin: 12px 0 0; font-size: clamp(26px, 4vw, 38px); font-weight: 880; line-height: 1.04; letter-spacing: -0.02em; color: var(--ex-text); }
.pc-title .accent { background: var(--ex-grad-hero); -webkit-background-clip: text; background-clip: text; color: transparent; }
.pc-sub { margin: 9px 0 0; font-size: 13.5px; line-height: 1.5; color: var(--ex-text-secondary); max-width: 560px; }
.pc-cta { display: flex; gap: 9px; margin-top: 16px; }
.pc-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 12px; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 760; }
.pc-btn.primary { border: none; background: var(--ex-grad-hero); color: #1a1206; box-shadow: 0 10px 26px -12px color-mix(in srgb, var(--ex-amber) 70%, transparent); }
.pc-btn.ghost { background: var(--ex-surface); border: 1px solid var(--ex-border-strong); color: var(--ex-text-secondary); }
.spin { animation: ex-spin-slow 0.8s linear infinite; }

/* lenses */
.pc-lenses { position: relative; display: grid; grid-template-columns: repeat(6, 1fr); gap: 9px; margin-top: 18px; }
.lens { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 3px; padding: 12px 12px 13px; border-radius: 14px; cursor: pointer; text-align: left; font-family: inherit;
  background: var(--ex-panel); border: 1px solid var(--ex-border); transition: transform 0.25s var(--ex-spring), border-color 0.25s, background 0.25s; }
.lens.stat { cursor: default; }
.lens:hover:not(.stat) { transform: translateY(-2px); border-color: color-mix(in srgb, var(--c) 40%, transparent); }
.lens.on { border-color: var(--c); background: color-mix(in srgb, var(--c) 12%, transparent); }
.lens-ico { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 28%, transparent); }
.lens-v { font-size: 21px; font-weight: 850; color: var(--ex-text); line-height: 1; margin-top: 7px; }
.lens-l { font-size: 10px; font-weight: 750; letter-spacing: 0.03em; text-transform: uppercase; color: var(--ex-text-muted); }
.lens-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--c); transform: scaleX(0); transform-origin: left; transition: transform 0.3s var(--ex-spring); }
.lens.on .lens-bar { transform: scaleX(1); }

/* ─── Governance Blueprint ─── */
.blueprint { position: relative; overflow: hidden; margin-top: 16px; padding: 16px 18px 20px; border-radius: 18px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--ex-violet) 6%, transparent), transparent 60%), var(--ex-panel);
  border: 1px solid var(--ex-border-strong); }
.bp-cross { position: absolute; inset: 0; pointer-events: none; opacity: 0.35;
  background-image: linear-gradient(var(--ex-border) 1px, transparent 1px), linear-gradient(90deg, var(--ex-border) 1px, transparent 1px); background-size: 20px 20px;
  -webkit-mask: radial-gradient(80% 80% at 50% 50%, #000, transparent 75%); mask: radial-gradient(80% 80% at 50% 50%, #000, transparent 75%); }
.bp-corner { position: absolute; width: 14px; height: 14px; border: 1.5px solid var(--ex-violet-border); pointer-events: none; }
.bp-corner.tl { top: 9px; left: 9px; border-right: none; border-bottom: none; }
.bp-corner.tr { top: 9px; right: 9px; border-left: none; border-bottom: none; }
.bp-corner.bl { bottom: 9px; left: 9px; border-right: none; border-top: none; }
.bp-corner.br { bottom: 9px; right: 9px; border-left: none; border-top: none; }

.bp-head { position: relative; display: flex; align-items: center; gap: 11px; flex-wrap: wrap; margin-bottom: 18px; }
.bp-tag { display: inline-flex; align-items: center; gap: 5px; font-size: 9.5px; font-weight: 850; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ex-text-dim); }
.bp-title { display: inline-flex; align-items: center; gap: 8px; font-size: 13.5px; color: var(--ex-text); min-width: 0; }
.bp-title svg { color: var(--ex-text-dim); }
.bp-title svg.lit { color: var(--ex-violet); }
.bp-title b { font-weight: 820; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bp-scope { font-size: 10.5px; color: var(--ex-text-muted); padding: 2px 8px; border-radius: 999px; background: var(--ex-surface); border: 1px solid var(--ex-border); }
.bp-inforce { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 800; color: var(--ex-cleared); background: var(--ex-cleared-soft); padding: 2px 8px; border-radius: 999px; }
.bp-hint { margin-left: auto; font-size: 10.5px; color: var(--ex-text-dim); }

.bp-rail { position: relative; display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; min-height: 132px; }
.bp-rail.ghost { opacity: 0.5; }
.bp-line { position: absolute; left: 9%; right: 9%; top: 22px; height: 2px; pointer-events: none;
  background: repeating-linear-gradient(90deg, var(--ex-border-strong) 0 7px, transparent 7px 13px); }
.bp-line-fill { position: absolute; inset: 0; background: var(--ex-grad-hero); transform: scaleX(0); transform-origin: left; animation: bp-draw 1.5s var(--ex-spring) 0.2s forwards; box-shadow: 0 0 8px color-mix(in srgb, var(--ex-amber) 50%, transparent); }
.bp-pulse { position: absolute; top: 50%; left: 0; width: 9px; height: 9px; margin-top: -4.5px; border-radius: 50%; background: #fff; box-shadow: 0 0 10px 2px var(--ex-amber); animation: bp-travel 3.4s linear 1.6s infinite; opacity: 0; }
@keyframes bp-draw { to { transform: scaleX(1); } }
@keyframes bp-travel { 0% { left: 0; opacity: 0; } 8% { opacity: 1; } 92% { opacity: 1; } 100% { left: 100%; opacity: 0; } }

.bp-node { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 7px; padding: 0 4px; background: none; border: none; cursor: pointer; font-family: inherit;
  animation: bp-rise 0.5s var(--ex-spring) backwards; animation-delay: calc(var(--d) * 0.1s + 0.25s); }
.bp-node.term { cursor: default; }
.bp-medal { position: relative; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 13px; flex-shrink: 0;
  color: var(--ex-violet); background: var(--ex-surface); border: 1.5px solid var(--ex-violet-border); transition: transform 0.25s var(--ex-spring), box-shadow 0.25s; }
.bp-medal::after { content: ''; position: absolute; inset: -4px; border-radius: 16px; border: 1px solid var(--ex-violet-border); opacity: 0; animation: bp-glow 4s ease-in-out infinite; animation-delay: calc(var(--d) * 0.5s); }
.bp-node:not(.term):hover .bp-medal { transform: translateY(-3px) scale(1.06); box-shadow: var(--ex-violet-glow); }
.bp-node.term .bp-medal { color: var(--ex-cleared); border-color: color-mix(in srgb, var(--ex-cleared) 34%, transparent); background: var(--ex-cleared-soft); }
.bp-name { font-size: 11.5px; font-weight: 800; color: var(--ex-text); }
.bp-ann { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 10px; color: var(--ex-text-muted); text-align: center; }
.ann-sub { font-size: 9px; color: var(--ex-text-dim); }
@keyframes bp-rise { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: none; } }
@keyframes bp-glow { 0%, 100% { opacity: 0; } 50% { opacity: 0.6; } }

/* caliper (notice) */
.caliper { position: relative; display: inline-flex; align-items: center; height: 18px; }
.cal-beam { height: 2px; width: 0; background: var(--ex-amber-strong); transition: width 0.9s var(--ex-spring) 0.6s; }
.caliper.go .cal-beam { width: 46px; }
.cal-jaw { width: 2px; height: 11px; background: var(--ex-amber-strong); border-radius: 1px; }
.cal-read { position: absolute; left: 50%; top: -3px; transform: translateX(-50%); font-size: 11px; font-weight: 850; color: var(--ex-text); background: var(--ex-panel); padding: 0 4px; }
.cal-read i { font-size: 8px; font-weight: 700; color: var(--ex-text-muted); font-style: normal; }

/* gates (clearance) */
.gates { display: inline-flex; gap: 3px; height: 14px; align-items: flex-end; }
.gate-tick { width: 4px; height: 12px; border-radius: 1px; background: var(--ex-ember); transform: scaleY(0); transform-origin: bottom;
  animation: gate-pop 0.4s var(--ex-spring) backwards; animation-delay: calc(var(--g) * 0.06s + 0.8s); }
@keyframes gate-pop { to { transform: scaleY(1); } }

/* settlement chips */
.set-chips { display: inline-flex; gap: 4px; flex-wrap: wrap; justify-content: center; }
.set-chip { display: inline-flex; align-items: center; gap: 3px; font-size: 9px; font-weight: 750; padding: 2px 6px; border-radius: 999px; color: var(--ex-text-muted); background: var(--ex-surface); border: 1px solid var(--ex-border); }
.set-chip.on { color: var(--ex-cleared); background: var(--ex-cleared-soft); border-color: color-mix(in srgb, var(--ex-cleared) 26%, transparent); }

.bp-empty { position: relative; margin: 14px 0 0; text-align: center; font-size: 12px; color: var(--ex-text-muted); }

@media (max-width: 860px) {
  .pc-lenses { grid-template-columns: repeat(3, 1fr); }
  .bp-rail { grid-template-columns: 1fr; gap: 14px; min-height: 0; }
  .bp-line { display: none; }
  .bp-node { flex-direction: row; justify-content: flex-start; gap: 12px; }
  .bp-ann { align-items: flex-start; }
}
@media (prefers-reduced-motion: reduce) {
  .pc-aura, .pc-motif, .bp-line-fill, .bp-pulse, .bp-node, .bp-medal::after, .gate-tick { animation: none; }
  .bp-line-fill { transform: scaleX(1); } .gate-tick { transform: scaleY(1); } .caliper .cal-beam { transition: none; width: 46px; }
}
</style>
