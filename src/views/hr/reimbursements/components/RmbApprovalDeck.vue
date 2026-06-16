<template>
  <Motion as="section" class="rad" ref="deckRef"
    :initial="{ opacity: 0, y: -16, filter: 'blur(10px)' }"
    :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
    :transition="{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }">

    <!-- atmosphere -->
    <span class="rad-tape" aria-hidden="true" />
    <span class="rad-orb a1" aria-hidden="true" />
    <span class="rad-orb a2" aria-hidden="true" />
    <span class="rad-orb a3" aria-hidden="true" />
    <span class="rad-mesh" aria-hidden="true" />
    <span class="rmb-spotlight" aria-hidden="true" />
    <span class="rad-scan" aria-hidden="true" />
    <span class="rmb-grain" aria-hidden="true" />
    <span class="rad-sparks" aria-hidden="true"><i v-for="n in 7" :key="n" :style="spark(n)" /></span>

    <div class="rad-grid">
      <!-- lead -->
      <div class="rad-lead">
        <Motion as="span" class="rad-eye rmb-mono"
          :initial="{ opacity: 0, x: -12 }" :animate="{ opacity: 1, x: 0 }" :transition="{ delay: 0.12, duration: 0.55 }">
          <span class="rad-dot" />APPROVALS · DECISION DESK
        </Motion>
        <Motion as="h1" class="rad-title"
          :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }" :transition="{ delay: 0.18, duration: 0.65, ease: [0.16, 1, 0.3, 1] }">
          <template v-if="pendingCount">{{ pendingCount }} claim{{ pendingCount === 1 ? '' : 's' }}<br /><span class="ink">await your stamp</span></template>
          <template v-else>Desk clear —<br /><span class="ink">nothing to approve</span></template>
        </Motion>
        <Motion as="p" class="rad-sub" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :transition="{ delay: 0.32, duration: 0.6 }">
          Claims from your direct reports land here for your stage. Approve to forward to Finance, return for a fix, or reject with a reason.
        </Motion>

        <!-- live clearance tape -->
        <Motion as="div" class="rad-bar-row" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :transition="{ delay: 0.46, duration: 0.6 }">
          <div class="rad-bar"><span class="rad-bar-fill" :style="{ width: clearedPct + '%' }"><i /></span></div>
          <span class="rad-bar-flag rmb-mono"><RmbCountUp :value="clearedPct" suffix="%" /> cleared this session</span>
        </Motion>
      </div>

      <!-- gauge -->
      <div class="rad-gauge">
        <span class="rad-gauge-halo" aria-hidden="true" />
        <RmbFlowGauge :size="170" :segments="gaugeSegs" :center-number="pendingCount" center-suffix=""
          center-label="Awaiting" :center-sub="pendingCount ? 'your call' : 'all clear'" />
      </div>
    </div>

    <!-- stat tiles -->
    <div class="rad-stats">
      <Motion v-for="(t, i) in tiles" :key="t.key" as="article" class="rad-stat" :data-tone="t.tone"
        :initial="{ opacity: 0, y: 16, rotateX: -16 }" :animate="{ opacity: 1, y: 0, rotateX: 0 }"
        :transition="{ delay: 0.4 + i * 0.08, duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
        <span class="rad-stat-sweep" aria-hidden="true" />
        <span class="rad-stat-ic"><component :is="t.icon" :size="15" /></span>
        <span class="rad-stat-eye rmb-mono">{{ t.label }}</span>
        <span class="rad-stat-val">
          <RmbMoneyValue v-if="t.money" :value="t.value" :decimals="0" :tone="t.moneyTone" />
          <template v-else-if="t.split">
            <span class="sp ok"><RmbCountUp :value="session.approved" /></span><span class="sp-sep">/</span><span class="sp warn"><RmbCountUp :value="session.returned" /></span><span class="sp-sep">/</span><span class="sp bad"><RmbCountUp :value="session.rejected" /></span>
          </template>
          <template v-else><RmbCountUp :value="t.value" />{{ t.suffix || '' }}</template>
        </span>
        <span class="rad-stat-sub rmb-mono">{{ t.sub }}</span>
        <span v-if="t.tone === 'warn' && pendingCount" class="rad-stat-pulse" aria-hidden="true" />
      </Motion>
    </div>
  </Motion>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Motion } from 'motion-v'
import { Inbox, IndianRupee, Timer, BadgeCheck } from 'lucide-vue-next'
import RmbFlowGauge from './RmbFlowGauge.vue'
import RmbMoneyValue from './RmbMoneyValue.vue'
import RmbCountUp from './RmbCountUp.vue'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  queue: { type: Array, default: () => [] },
  session: { type: Object, default: () => ({ approved: 0, returned: 0, rejected: 0 }) },
})

const deckRef = ref(null)
usePointerSpotlight(deckRef)

const pendingCount = computed(() => props.queue.length)
const pendingValue = computed(() => props.queue.reduce((a, c) => a + (Number(c.amount) || 0), 0))
const decidedCount = computed(() => (props.session.approved || 0) + (props.session.returned || 0) + (props.session.rejected || 0))
const clearedPct = computed(() => {
  const total = pendingCount.value + decidedCount.value
  return total > 0 ? Math.round((decidedCount.value / total) * 100) : 0
})

const oldestAge = computed(() => {
  if (!props.queue.length) return { v: 0, u: '', note: 'all clear' }
  const times = props.queue
    .map(c => new Date(c.created_at || c.submitted_at || c.expense_date).getTime())
    .filter(t => !Number.isNaN(t))
  if (!times.length) return { v: 0, u: '', note: 'just in' }
  const h = (Date.now() - Math.min(...times)) / 3600000
  if (h < 1) return { v: Math.max(1, Math.floor(h * 60)), u: 'm', note: 'just now' }
  if (h < 48) return { v: Math.floor(h), u: 'h', note: h >= 24 ? 'over a day' : 'today' }
  return { v: Math.floor(h / 24), u: 'd', note: 'overdue' }
})

const gaugeSegs = computed(() => [
  { key: 'pending', label: 'Pending', value: pendingCount.value, color: 'var(--rmb-st-pending)' },
  { key: 'approved', label: 'Approved', value: props.session.approved || 0, color: 'var(--rmb-st-approved)' },
  { key: 'returned', label: 'Returned', value: props.session.returned || 0, color: 'var(--rmb-st-returned)' },
  { key: 'rejected', label: 'Rejected', value: props.session.rejected || 0, color: 'var(--rmb-st-rejected)' },
])

const tiles = computed(() => [
  { key: 'await', label: 'AWAITING YOU', icon: Inbox, value: pendingCount.value, tone: 'warn', sub: 'pending decisions' },
  { key: 'value', label: 'VALUE TO CLEAR', icon: IndianRupee, value: pendingValue.value, money: true, moneyTone: 'pending', tone: 'neutral', sub: 'across the queue' },
  { key: 'oldest', label: 'OLDEST OPEN', icon: Timer, value: oldestAge.value.v, suffix: oldestAge.value.u, tone: 'bad', sub: oldestAge.value.note },
  { key: 'session', label: 'CLEARED · SESSION', icon: BadgeCheck, split: true, tone: 'ok', sub: 'appr · ret · rej' },
])

const spark = (n) => {
  const left = (n * 13.3) % 92 + 4
  const delay = ((n * 0.6) % 4).toFixed(2)
  const dur = (4.5 + (n % 4)).toFixed(1)
  const scale = (0.55 + (n % 3) * 0.28).toFixed(2)
  return { left: left + '%', animationDelay: delay + 's', animationDuration: dur + 's', '--sp-scale': scale }
}
</script>

<style scoped>
.rad { position: relative; padding: 26px 30px 24px; border-radius: 24px; overflow: hidden;
  background: linear-gradient(150deg, var(--rmb-paper-elevated), var(--rmb-paper));
  border: 1px solid var(--rmb-border-soft);
  box-shadow: 0 40px 100px -52px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.05); }

.rad-tape { position: absolute; top: 0; left: 0; right: 0; height: 5px; z-index: 3; pointer-events: none;
  background: var(--hr-gradient-ambient); background-size: 220% 100%; animation: rmb-perforation-shimmer 6s linear infinite; opacity: 0.9; }
.rad-orb { position: absolute; border-radius: 50%; pointer-events: none; filter: blur(58px); opacity: 0.5; }
.rad-orb.a1 { width: 360px; height: 360px; top: -150px; right: 4%;
  background: radial-gradient(circle, rgba(251,191,36,0.55), transparent 68%); animation: rad-drift-a 19s ease-in-out infinite;
  transform: translate3d(calc((var(--mx,0.5) - 0.5) * -34px), calc((var(--my,0.5) - 0.5) * -22px), 0); }
.rad-orb.a2 { width: 300px; height: 300px; bottom: -150px; left: 6%;
  background: radial-gradient(circle, rgba(45,212,191,0.4), transparent 70%); animation: rad-drift-b 24s ease-in-out infinite;
  transform: translate3d(calc((var(--mx,0.5) - 0.5) * 30px), calc((var(--my,0.5) - 0.5) * 22px), 0); }
.rad-orb.a3 { width: 240px; height: 240px; top: 30%; left: 48%; opacity: 0.34;
  background: radial-gradient(circle, rgba(251,146,60,0.46), transparent 70%); animation: rad-drift-a 27s ease-in-out infinite reverse; }
.rad-mesh { position: absolute; inset: 0; pointer-events: none; opacity: 0.4;
  background-image: linear-gradient(var(--rmb-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--rmb-grid-line) 1px, transparent 1px);
  background-size: 34px 34px; -webkit-mask: radial-gradient(130% 120% at 24% 0%, #000, transparent 72%); mask: radial-gradient(130% 120% at 24% 0%, #000, transparent 72%);
  transform: translate3d(calc((var(--mx,0.5) - 0.5) * 12px), calc((var(--my,0.5) - 0.5) * 8px), 0); transition: transform 0.5s ease; }
.rad-scan { position: absolute; left: 0; right: 0; top: 0; height: 42%; pointer-events: none; background: linear-gradient(180deg, transparent, rgba(251,191,36,0.05), transparent); }
.rad-sparks { position: absolute; inset: 0; pointer-events: none; z-index: 1; }
.rad-sparks i { position: absolute; bottom: 14%; width: 3px; height: 3px; border-radius: 50%;
  background: var(--rmb-amber-bright); box-shadow: 0 0 8px 1px color-mix(in srgb, var(--rmb-amber) 70%, transparent);
  transform: scale(var(--sp-scale, 1)); animation: rmb-spark-rise linear infinite; opacity: 0; }

.rad-grid { position: relative; z-index: 2; display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 30px; }

.rad-lead { min-width: 0; }
.rad-eye { display: inline-flex; align-items: center; gap: 8px; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--rmb-st-returned); margin-bottom: 10px; }
.rad-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--rmb-st-approved); animation: rmb-pulse-dot 2.4s ease-in-out infinite; }
.rad-title { margin: 0; font-size: 38px; line-height: 1.02; font-weight: 800; letter-spacing: -1.4px; color: var(--rmb-text); }
.rad-title .ink { background: var(--hr-gradient-hero); background-size: 220% auto; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; animation: rad-ink 6s linear infinite; }
@keyframes rad-ink { to { background-position: 220% center; } }
.rad-sub { margin: 12px 0 0; font-size: 13.5px; line-height: 1.55; color: var(--rmb-text-secondary); max-width: 470px; }

.rad-bar-row { display: flex; align-items: center; gap: 12px; margin-top: 18px; flex-wrap: wrap; }
.rad-bar { position: relative; flex: 1; min-width: 150px; max-width: 280px; height: 8px; border-radius: 999px; overflow: hidden; background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); }
.rad-bar-fill { position: absolute; inset: 0 auto 0 0; min-width: 4px; border-radius: inherit; background: linear-gradient(90deg, var(--rmb-st-approved), var(--rmb-st-settled)); box-shadow: 0 0 12px -2px var(--rmb-st-settled); transition: width 1.1s var(--rmb-spring); }
.rad-bar-fill i { position: absolute; inset: 0; opacity: 0.6; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent); background-size: 220% 100%; animation: rmb-amount-shimmer 2.6s linear infinite; }
.rad-bar-flag { font-size: 11px; color: var(--rmb-text-muted); white-space: nowrap; }

.rad-gauge { position: relative; display: grid; place-items: center; flex: 0 0 auto; }
.rad-gauge-halo { position: absolute; width: 200px; height: 200px; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--rmb-amber) 18%, transparent), transparent 62%); animation: rmb-aura-breathe 5.5s ease-in-out infinite; }

/* stat tiles */
.rad-stats { position: relative; z-index: 2; margin-top: 22px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; perspective: 900px; }
.rad-stat { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 3px; padding: 14px 15px; border-radius: 15px;
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); transition: border-color 0.3s, box-shadow 0.3s, transform 0.3s; }
.rad-stat:hover { transform: translateY(-3px); border-color: var(--rmb-border-strong); box-shadow: 0 18px 36px -22px rgba(0,0,0,0.6); }
.rad-stat-sweep { position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.3s; background: radial-gradient(120% 90% at 0% 0%, color-mix(in srgb, var(--rmb-amber) 16%, transparent), transparent 60%); }
.rad-stat:hover .rad-stat-sweep { opacity: 1; }
.rad-stat-ic { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; margin-bottom: 4px;
  background: rgba(251,191,36,0.12); color: var(--rmb-amber); transition: transform 0.3s var(--rmb-spring); }
.rad-stat:hover .rad-stat-ic { transform: scale(1.1) rotate(-5deg); }
.rad-stat[data-tone="warn"] .rad-stat-ic { background: var(--rmb-st-pending-soft); color: var(--rmb-st-pending); }
.rad-stat[data-tone="bad"] .rad-stat-ic { background: var(--rmb-st-rejected-soft); color: var(--rmb-st-rejected); }
.rad-stat[data-tone="ok"] .rad-stat-ic { background: var(--rmb-st-approved-soft); color: var(--rmb-st-approved); }
.rad-stat-eye { font-size: 9px; letter-spacing: 0.12em; color: var(--rmb-text-muted); }
.rad-stat-val { font-size: 27px; font-weight: 800; color: var(--rmb-text); line-height: 1; display: inline-flex; align-items: baseline; gap: 2px; }
.rad-stat-val :deep(.rmb-money-value) { font-size: 24px; }
.rad-stat-sub { font-size: 9.5px; letter-spacing: 0.04em; color: var(--rmb-text-muted); margin-top: 3px; }
.sp.ok { color: var(--rmb-st-approved); } .sp.warn { color: var(--rmb-st-returned); } .sp.bad { color: var(--rmb-st-rejected); }
.sp-sep { color: var(--rmb-text-muted); opacity: 0.5; font-weight: 500; margin: 0 1px; }
.rad-stat-pulse { position: absolute; right: -30px; top: -30px; width: 100px; height: 100px; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, var(--rmb-st-pending-soft), transparent 70%); animation: rmb-aura-breathe 3.2s ease-in-out infinite; }

@keyframes rad-drift-a { 0%,100% { translate: 0 0; opacity: 0.45; } 50% { translate: 38px 28px; opacity: 0.68; } }
@keyframes rad-drift-b { 0%,100% { translate: 0 0; opacity: 0.4; } 50% { translate: -34px -22px; opacity: 0.6; } }

:root[data-theme="light"] .rad-orb.a1 { opacity: 0.32; }
:root[data-theme="light"] .rad-orb.a2 { opacity: 0.24; }
:root[data-theme="light"] .rad-orb.a3 { opacity: 0.2; }
:root[data-theme="light"] .rad-sparks i { background: var(--rmb-amber-strong); box-shadow: 0 0 7px 1px color-mix(in srgb, var(--rmb-amber-strong) 55%, transparent); }

@media (max-width: 920px) {
  .rad-grid { grid-template-columns: 1fr; }
  .rad-gauge { justify-self: center; }
  .rad-stats { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 520px) { .rad-stats { grid-template-columns: 1fr; } .rad-title { font-size: 30px; } }

@media (prefers-reduced-motion: reduce) {
  .rad-tape, .rad-orb, .rad-gauge-halo, .rad-dot, .rad-sparks i, .rad-bar-fill i, .rad-title .ink, .rmb-grain, .rad-stat-pulse { animation: none !important; }
  .rad-orb, .rad-mesh { transform: none !important; }
  .rad-sparks { display: none; }
}
</style>
