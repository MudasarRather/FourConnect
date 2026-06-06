<template>
  <Motion as="header" class="pay-console"
    :initial="{ opacity: 0, y: -14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.6, ease: [0.16,1,0.3,1] }">
    <div class="pc-bg" aria-hidden="true">
      <span class="pc-glow" />
      <span class="pc-aurora" />
      <span class="pc-rays" />
      <span class="pc-grid" />
      <span class="pc-sheen" />
      <span class="pc-spark" v-for="s in SPARKS" :key="s.i" :style="s.style" />
    </div>

    <div class="pc-main">
      <!-- LEFT — period + figures -->
      <div class="pc-left">
        <div class="pc-toprow">
          <span class="pc-eyebrow"><span class="eb-dot" /><Coins :size="13" /> Pay Run Console</span>
          <div class="pc-month">
            <button class="pm-btn" @click="shift(-1)" aria-label="Previous month"><ChevronLeft :size="15" /></button>
            <div class="pm-label"><span>{{ monthName }}</span><b>{{ period.year }}</b></div>
            <button class="pm-btn" @click="shift(1)" aria-label="Next month"><ChevronRight :size="15" /></button>
          </div>
        </div>

        <Motion as="div" class="pc-headline"
          :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, delay: 0.12 }">
          <span class="ph-lbl">Monthly net cost</span>
          <PayMoneyValue class="ph-val" :value="stats?.current_net || 0" :duration="900" />
          <span class="ph-underline"><i /></span>
        </Motion>

        <div class="pc-figs">
          <Motion v-for="(f, i) in figs" :key="f.key" as="button" class="fig-card" :class="{ clickable: f.go }"
            :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.45, delay: 0.18 + i * 0.06, ease: [0.16,1,0.3,1] }"
            :whileHover="f.go ? { y: -3 } : {}" :whileTap="f.go ? { scale: 0.97 } : {}"
            @click="f.go && $emit('go', f.go)">
            <span class="fc-bar" :style="{ background: f.bar }" />
            <span class="fc-lbl">{{ f.label }}</span>
            <PayMoneyValue v-if="f.money" class="fc-val" :value="f.value" :tone="f.tone" :short="f.short" :duration="800" />
            <span v-else class="fc-val mono">{{ f.value }}</span>
          </Motion>
        </div>
      </div>

      <!-- RIGHT — 3D mint / coin -->
      <div class="pc-coin">
        <span class="coin-aura" aria-hidden="true" />
        <ClientCanvas v-if="use3d" :reduced="false" />
        <svg v-else class="coin-svg" viewBox="0 0 200 200" aria-hidden="true">
          <defs>
            <radialGradient id="pcCoinG" cx="40%" cy="35%">
              <stop offset="0%" stop-color="#fff4d6" /><stop offset="55%" stop-color="#f59e0b" /><stop offset="100%" stop-color="#9a6a08" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="72" fill="url(#pcCoinG)" />
          <circle cx="100" cy="100" r="72" fill="none" stroke="#fff4d6" stroke-width="4" opacity="0.7" />
          <text x="100" y="128" text-anchor="middle" font-size="78" font-weight="800" fill="#5a3c05">₹</text>
        </svg>
      </div>
    </div>

    <!-- ── cinematic mint-flow pipeline ── -->
    <div class="pc-flow">
      <span class="pf-lbl">{{ monthName }} run</span>
      <div class="pf-track">
        <div v-for="(st, i) in PIPELINE" :key="st" class="pf-node" :class="{ done: i < curIdx, active: i === curIdx }">
          <span v-if="i < PIPELINE.length - 1" class="pf-link" :class="{ flow: i < curIdx }" aria-hidden="true"><i /></span>
          <span class="pf-dot"><span class="pf-core" /></span>
          <span class="pf-name">{{ statusMeta(st).label }}</span>
        </div>
      </div>
      <span class="pf-state" v-if="currentBatch">
        <PayStatusChip :status="currentBatch.status" :pulse="['GENERATED','VERIFIED','APPROVED'].includes(currentBatch.status)" />
      </span>
      <Motion v-else as="button" class="pf-cta" @click="$emit('go','processing')"
        :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }">
        <Play :size="13" /> Start this run
      </Motion>
    </div>
  </Motion>
</template>

<script setup>
import { computed, ref, onMounted, defineAsyncComponent } from 'vue'
import { Motion } from 'motion-v'
import { Coins, ChevronLeft, ChevronRight, Play } from 'lucide-vue-next'
import PayMoneyValue from './PayMoneyValue.vue'
import PayStatusChip from './PayStatusChip.vue'
import { statusMeta, BATCH_PIPELINE, monthLabel } from '@/composables/usePayroll'

const props = defineProps({
  stats: { type: Object, default: null },
  fyLabel: { type: String, default: '' },
  period: { type: Object, required: true },
  currentBatch: { type: Object, default: null },
  compact: { type: Boolean, default: false },
})
const emit = defineEmits(['go', 'month-change'])

const PIPELINE = BATCH_PIPELINE
const monthName = computed(() => monthLabel(props.period.month))

// Rising coin-spark particles (deterministic, index-seeded).
const SPARKS = Array.from({ length: 14 }, (_, i) => {
  const left = (i * 37 + 6) % 94
  const delay = (i * 0.83) % 8
  const dur = 6 + (i % 5) * 1.3
  const size = 2 + (i % 3)
  return { i, style: {
    left: left + '%', width: size + 'px', height: size + 'px',
    animationDelay: '-' + delay.toFixed(2) + 's', animationDuration: dur.toFixed(1) + 's',
  } }
})
const curIdx = computed(() => {
  if (!props.currentBatch) return -1
  const i = PIPELINE.indexOf(props.currentBatch.status)
  return i < 0 ? -1 : i
})

const figs = computed(() => {
  const s = props.stats || {}
  return [
    { key: 'gross', label: 'Gross earnings', value: s.current_gross || 0, money: true, short: true, bar: 'linear-gradient(180deg,#fbbf24,#b8860b)' },
    { key: 'ded', label: 'Deductions', value: s.current_deductions || 0, money: true, short: true, tone: 'deduction', bar: 'linear-gradient(180deg,#fb923c,#c2410c)' },
    { key: 'employer', label: 'Employer cost', value: s.current_employer_cost || 0, money: true, short: true, bar: 'linear-gradient(180deg,#fde68a,#92400e)' },
    { key: 'head', label: 'On payroll', value: s.employees_on_payroll ?? '—', money: false, bar: 'linear-gradient(180deg,#34d399,#047857)' },
    ...((s.pending_approvals || 0) > 0
      ? [{ key: 'pend', label: 'Pending approval', value: s.pending_approvals, money: false, go: 'approval', bar: 'linear-gradient(180deg,#f59e0b,#ea580c)' }]
      : []),
  ]
})

const shift = (d) => {
  let m = props.period.month + d, y = props.period.year
  if (m < 1) { m = 12; y -= 1 }
  if (m > 12) { m = 1; y += 1 }
  emit('month-change', { year: y, month: m })
}

const use3d = ref(false)
const ClientCanvas = defineAsyncComponent(() => import('./PayHero3DCanvas.vue'))
onMounted(() => {
  try {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const cv = document.createElement('canvas')
    const gl = cv.getContext('webgl') || cv.getContext('experimental-webgl')
    use3d.value = !reduced && !!gl
  } catch { use3d.value = false }
})
</script>

<style scoped>
/* ════════════════════════════════════════════════════════════════════
   PAY RUN CONSOLE — cinematic command banner (sits atop the canvas, to
   the right of the vault rail). Distinct from the module hero pattern:
   denomination figure-cards + a flowing "mint pipeline".
   ════════════════════════════════════════════════════════════════════ */
.pay-console {
  position: relative; border-radius: 24px; overflow: hidden;
  padding: 22px 24px 16px;
  background: var(--pay-surface); border: 1px solid var(--pay-border);
  box-shadow: 0 28px 70px -46px rgba(0,0,0,0.7);
}
.pc-bg { position: absolute; inset: 0; pointer-events: none; overflow: hidden; border-radius: 24px; }
.pc-glow { position: absolute; inset: 0; background: var(--pay-grad-hero); }
/* drifting mesh aurora */
.pc-aurora { position: absolute; inset: -30%;
  background:
    radial-gradient(34% 50% at 22% 30%, rgba(251,191,36,0.22), transparent 60%),
    radial-gradient(40% 55% at 80% 18%, rgba(245,158,11,0.20), transparent 62%),
    radial-gradient(36% 50% at 65% 95%, rgba(234,88,12,0.16), transparent 60%);
  filter: blur(14px); animation: pay-aurora-drift 18s ease-in-out infinite; }
/* slow rotating conic light rays behind the coin */
.pc-rays { position: absolute; top: 50%; right: 5%; width: 460px; height: 460px; transform: translateY(-50%);
  background: conic-gradient(from 0deg, transparent 0deg, rgba(251,191,36,0.16) 22deg, transparent 50deg,
    rgba(245,158,11,0.13) 130deg, transparent 165deg, rgba(253,230,138,0.14) 250deg, transparent 290deg);
  border-radius: 50%; opacity: 0.7;
  -webkit-mask-image: radial-gradient(circle, #000 12%, transparent 70%); mask-image: radial-gradient(circle, #000 12%, transparent 70%);
  animation: pay-dial-spin 44s linear infinite; }
.pc-grid { position: absolute; inset: 0; opacity: 0.4;
  background-image: radial-gradient(rgba(251,191,36,0.10) 1px, transparent 1px); background-size: 22px 22px; }
.pc-sheen { position: absolute; top: 0; bottom: 0; left: 0; width: 26%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent);
  animation: pay-ingot-sheen 9s ease-in-out infinite; }
/* rising bullion sparks */
.pc-spark { position: absolute; bottom: 8%; border-radius: 50%;
  background: radial-gradient(circle, #fde68a, rgba(245,158,11,0.25));
  box-shadow: 0 0 6px rgba(251,191,36,0.9); animation: pay-spark-rise linear infinite; }

.pc-main { position: relative; z-index: 2; display: grid; grid-template-columns: 1fr auto; gap: 18px; align-items: center; }
.pc-left { display: flex; flex-direction: column; gap: 14px; min-width: 0; }

.pc-toprow { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.pc-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--pay-mono);
  font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--pay-treasury); }
.eb-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--pay-net);
  box-shadow: 0 0 8px var(--pay-net); animation: pay-dot-pulse 2s ease-in-out infinite; }
.pc-month { display: inline-flex; align-items: center; gap: 4px;
  background: var(--pay-surface-2); border: 1px solid var(--pay-border); border-radius: 999px; padding: 3px; }
.pm-btn { width: 28px; height: 28px; border-radius: 50%; border: none; cursor: pointer; display: grid; place-items: center;
  background: transparent; color: var(--pay-text-2); transition: 0.2s; }
.pm-btn:hover { background: rgba(251,191,36,0.16); color: var(--pay-treasury); }
.pm-label { display: flex; flex-direction: column; align-items: center; min-width: 86px; line-height: 1.05; }
.pm-label span { font-size: 12.5px; font-weight: 700; color: var(--pay-text); }
.pm-label b { font-family: var(--pay-mono); font-size: 10px; color: var(--pay-text-muted); }

.pc-headline { display: flex; flex-direction: column; gap: 2px; }
.ph-lbl { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--pay-text-muted); }
.ph-val { font-size: clamp(30px, 4.6vw, 46px); font-weight: 800; letter-spacing: -0.02em;
  background: linear-gradient(100deg, #fff6e0 5%, #fbbf24 38%, #fff6e0 52%, #f59e0b 88%);
  background-size: 220% 100%; -webkit-background-clip: text; background-clip: text; color: transparent;
  animation: pay-foil-text 6s linear infinite; }
.ph-underline { display: block; height: 3px; width: clamp(150px, 22vw, 230px); margin-top: 7px; border-radius: 3px;
  background: var(--pay-border-soft); overflow: hidden; transform-origin: left;
  animation: pay-underline-grow 0.9s var(--pay-ease) 0.4s both; }
.ph-underline i { display: block; height: 100%; width: 45%;
  background: linear-gradient(90deg, transparent, var(--pay-treasury), transparent);
  animation: pay-foil-sweep 2.6s linear infinite 1.2s; }

.pc-figs { display: flex; flex-wrap: wrap; gap: 10px; }
.fig-card { position: relative; display: flex; flex-direction: column; gap: 3px; text-align: left;
  padding: 9px 14px 9px 16px; border-radius: 13px; border: 1px solid var(--pay-border-soft);
  background: var(--pay-surface-2); cursor: default; min-width: 116px; overflow: hidden;
  transition: border-color 0.25s, box-shadow 0.25s; }
.fig-card.clickable { cursor: pointer; }
.fig-card.clickable:hover { border-color: var(--pay-border); box-shadow: 0 10px 26px -16px rgba(245,158,11,0.6); }
/* foil sweep across each card on hover */
.fig-card::after { content: ''; position: absolute; top: 0; bottom: 0; left: 0; width: 40%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent);
  transform: translateX(-200%); transition: none; }
.fig-card.clickable:hover::after { animation: pay-foil-sweep 0.9s var(--pay-ease); }
.fc-bar { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; border-radius: 4px 0 0 4px;
  box-shadow: 0 0 10px -2px currentColor; }
.fc-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--pay-text-muted); }
.fc-val { font-size: 18px; color: var(--pay-text); position: relative; z-index: 1; }
.fc-val.mono { font-family: var(--pay-mono); font-weight: 700; }

.pc-coin { position: relative; width: clamp(140px, 18vw, 196px); height: clamp(140px, 18vw, 196px); justify-self: center; }
.coin-aura { position: absolute; inset: 8%; border-radius: 50%;
  background: radial-gradient(circle, rgba(245,158,11,0.35), transparent 68%); filter: blur(14px);
  animation: pay-glow-breathe 4.5s ease-in-out infinite; }
.coin-svg { position: relative; width: 100%; height: 100%; filter: drop-shadow(0 14px 34px rgba(184,134,11,0.45));
  animation: pay-coin-flip 9s ease-in-out infinite; transform-style: preserve-3d; }

/* ── mint-flow pipeline ── */
.pc-flow { position: relative; z-index: 2; display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  margin-top: 16px; padding: 12px 16px; border-radius: 16px;
  background: var(--pay-surface-2); border: 1px solid var(--pay-border-soft); }
.pf-lbl { font-family: var(--pay-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--pay-text-muted); white-space: nowrap; }
.pf-track { display: flex; align-items: center; flex: 1; min-width: 300px; }
.pf-node { position: relative; display: flex; align-items: center; gap: 8px; flex: 1; }
.pf-link { position: absolute; left: -50%; right: 50%; top: 6px; height: 3px; border-radius: 3px;
  background: var(--pay-border); overflow: hidden; transform: translateX(7px); }
.pf-node:first-child .pf-link { display: none; }
.pf-link i { position: absolute; inset: 0; display: block; }
.pf-link.flow { background: linear-gradient(90deg, var(--pay-net-strong), var(--pay-net)); }
.pf-link.flow i { position: absolute; top: 0; bottom: 0; left: 0; width: 45%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.75), transparent);
  animation: pay-foil-sweep 1.8s linear infinite; }
.pf-dot { position: relative; z-index: 2; width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0;
  background: var(--pay-surface); border: 2px solid var(--pay-text-muted); display: grid; place-items: center; transition: 0.3s; }
.pf-core { width: 6px; height: 6px; border-radius: 50%; background: transparent; transition: 0.3s; }
.pf-node.done .pf-dot { border-color: var(--pay-net); }
.pf-node.done .pf-core { background: var(--pay-net); }
.pf-node.active .pf-dot { border-color: var(--pay-mint-bright); background: var(--pay-treasury); animation: pay-node-halo 1.8s ease-out infinite; }
.pf-node.active .pf-core { background: #fff4d6; }
.pf-name { font-size: 11px; color: var(--pay-text-muted); white-space: nowrap; }
.pf-node.done .pf-name, .pf-node.active .pf-name { color: var(--pay-text-2); }
.pf-cta { display: inline-flex; align-items: center; gap: 6px; padding: 8px 15px; border-radius: 999px;
  border: none; cursor: pointer; background: var(--pay-grad-cta); color: #1a1206; font-weight: 700; font-size: 12px; }

@media (max-width: 760px) {
  .pc-main { grid-template-columns: 1fr; }
  .pc-coin { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .pc-sheen, .ph-val, .coin-aura, .coin-svg, .pf-link.flow i, .pf-node.active .pf-dot,
  .pc-aurora, .pc-rays, .pc-spark, .eb-dot, .ph-underline, .ph-underline i { animation: none !important; }
  .ph-underline { transform: scaleX(1); }
}

/* ════════════════════════════════ LIGHT THEME ════════════════════════════════
   On cream, white sheens vanish — swap them for warm gold/amber tints and
   raise opacities so the motion stays legible. */
[data-theme="light"] .ph-val {
  background: linear-gradient(100deg, #92400e 5%, #d97706 32%, #f59e0b 48%, #b45309 70%, #92400e 92%);
  background-size: 220% 100%; -webkit-background-clip: text; background-clip: text; color: transparent;
}
[data-theme="light"] .fc-val { color: var(--pay-text); }
[data-theme="light"] .pc-aurora {
  background:
    radial-gradient(34% 50% at 22% 30%, rgba(245,158,11,0.30), transparent 60%),
    radial-gradient(40% 55% at 80% 18%, rgba(217,119,6,0.26), transparent 62%),
    radial-gradient(36% 50% at 65% 95%, rgba(234,88,12,0.20), transparent 60%);
}
[data-theme="light"] .pc-rays {
  background: conic-gradient(from 0deg, transparent 0deg, rgba(217,119,6,0.22) 22deg, transparent 50deg,
    rgba(245,158,11,0.18) 130deg, transparent 165deg, rgba(180,83,9,0.18) 250deg, transparent 290deg);
}
[data-theme="light"] .pc-grid { background-image: radial-gradient(rgba(180,83,9,0.16) 1px, transparent 1px); }
[data-theme="light"] .pc-sheen { background: linear-gradient(90deg, transparent, rgba(217,119,6,0.16), transparent); }
[data-theme="light"] .pc-spark {
  background: radial-gradient(circle, #f59e0b, rgba(180,83,9,0.3)); box-shadow: 0 0 6px rgba(217,119,6,0.7);
}
[data-theme="light"] .fig-card.clickable:hover::after {
  background: linear-gradient(90deg, transparent, rgba(217,119,6,0.18), transparent);
}
[data-theme="light"] .ph-underline i { background: linear-gradient(90deg, transparent, #d97706, transparent); }
[data-theme="light"] .pf-link.flow i { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent); }
[data-theme="light"] .coin-aura { background: radial-gradient(circle, rgba(217,119,6,0.4), transparent 68%); }
</style>
