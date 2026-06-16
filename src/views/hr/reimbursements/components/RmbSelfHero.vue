<template>
  <Motion as="header" class="rsh" ref="heroRef"
    :initial="{ opacity: 0, y: -18, filter: 'blur(12px)' }"
    :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
    :transition="{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }">

    <!-- ── volumetric atmosphere ── -->
    <span class="rsh-tape" aria-hidden="true" />
    <span class="rsh-aurora a1" aria-hidden="true" />
    <span class="rsh-aurora a2" aria-hidden="true" />
    <span class="rsh-aurora a3" aria-hidden="true" />
    <span class="rsh-glow" aria-hidden="true" />
    <span class="rsh-mesh" aria-hidden="true" />
    <span class="rmb-spotlight" aria-hidden="true" />
    <span class="rsh-scan" aria-hidden="true" />
    <span class="rsh-sheen" aria-hidden="true" />
    <span class="rmb-grain" aria-hidden="true" />
    <span class="rsh-sparks" aria-hidden="true"><i v-for="n in 9" :key="n" :style="sparkStyle(n)" /></span>

    <div class="rsh-plane">
      <!-- LEFT · editorial lead + CTA + live clearance tape -->
      <div class="rsh-lead">
        <Motion as="span" class="rsh-eyebrow rmb-mono"
          :initial="{ opacity: 0, x: -14 }" :animate="{ opacity: 1, x: 0 }"
          :transition="{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
          <span class="eb-dot" aria-hidden="true" />{{ eyebrow }}
        </Motion>
        <h1 class="rsh-title">
          <Motion as="span" class="t-line" :initial="{ opacity: 0, y: 24 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ delay: 0.2, duration: 0.7, ease: [0.16, 1, 0.3, 1] }">Your claims,</Motion>
          <Motion as="span" class="t-line ink" :initial="{ opacity: 0, y: 24 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ delay: 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }">on the tape</Motion>
        </h1>
        <Motion as="p" class="rsh-sub" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
          :transition="{ delay: 0.42, duration: 0.6 }">
          Raise a business expense, route it through approval, and watch every rupee settle — live.
        </Motion>

        <Motion as="div" class="rsh-cta-row" :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ delay: 0.5, duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
          <Motion as="button" class="rmb-btn rmb-btn-primary rsh-cta"
            :whileHover="{ y: -3, scale: 1.03 }" :whileTap="{ scale: 0.96 }"
            :disabled="unlinked" @click="$emit('raise')">
            <span class="cta-sheen" aria-hidden="true" />
            <Plus :size="16" /> Raise a claim
          </Motion>
          <Motion as="button" class="rsh-ghost"
            :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="$emit('scroll-ledger')">
            <ScrollText :size="15" /> View ledger
          </Motion>
        </Motion>

        <!-- live clearance tape -->
        <Motion as="div" class="rsh-tape-row" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
          :transition="{ delay: 0.62, duration: 0.6 }">
          <div class="rsh-bar" role="presentation">
            <span class="rsh-bar-fill" :style="{ width: settledPct + '%' }"><i class="rsh-bar-glow" /></span>
            <span class="rsh-bar-ticks" aria-hidden="true" />
          </div>
          <span class="rsh-bar-flag rmb-mono">
            <RmbCountUp :value="settledPct" suffix="%" /> settled · {{ inFlight }} in flight
          </span>
        </Motion>
      </div>

      <!-- MIDDLE · live pipeline conduit (data-driven, animated) -->
      <div class="rsh-flow">
        <span class="flow-eyebrow rmb-mono"><Activity :size="12" /> LIVE PIPELINE</span>
        <ol class="flow-track">
          <span class="flow-spine" aria-hidden="true"><i class="flow-spark" /></span>
          <Motion v-for="(st, i) in flowStages" :key="st.key" as="li" class="flow-node" :data-tone="st.tone"
            :initial="{ opacity: 0, x: 18 }" :animate="{ opacity: 1, x: 0 }"
            :transition="{ delay: 0.55 + i * 0.12, duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
            <span class="fn-dot"><component :is="st.icon" :size="14" /></span>
            <span class="fn-meta">
              <b class="rmb-mono"><RmbCountUp :value="st.count" /></b>
              <small>{{ st.label }}</small>
            </span>
            <span class="fn-pip" :style="{ width: st.pct + '%' }" aria-hidden="true" />
          </Motion>
        </ol>
      </div>

      <!-- RIGHT · cash-register statement roll -->
      <div class="rsh-roll-wrap">
        <span class="roll-aura" aria-hidden="true" />
        <Motion as="article" class="rsh-roll"
          :initial="{ opacity: 0, y: 28, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ delay: 0.32, duration: 0.72, ease: [0.16, 1, 0.3, 1] }">
          <span class="roll-feed" aria-hidden="true" />
          <header class="roll-head">
            <span class="roll-brand rmb-mono"><Receipt :size="13" /> STATEMENT</span>
            <span class="roll-live rmb-mono"><span class="lv" aria-hidden="true" />{{ fyLabel }}</span>
          </header>

          <div class="roll-gauge">
            <RmbFlowGauge :size="148" :segments="gaugeSegs"
              :center-number="settledPct" center-suffix="%" center-label="Settled"
              :center-sub="`${total} on tape`" />
          </div>

          <hr class="rmb-perf-line" />

          <div class="roll-rows">
            <Motion v-for="(r, i) in rows" :key="r.key" as="button" class="roll-row" :data-tone="r.tone"
              :initial="{ opacity: 0, x: 14 }" :animate="{ opacity: 1, x: 0 }"
              :transition="{ delay: 0.5 + i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }"
              :whileHover="{ x: 2 }" @click="r.go && $emit('scroll-ledger')">
              <span class="rr-ic"><component :is="r.icon" :size="13" /></span>
              <span class="rr-lbl">{{ r.label }}</span>
              <span class="rr-bar"><i :style="{ width: r.pct + '%' }" /></span>
              <RmbMoneyValue :value="r.value" :decimals="0" :tone="r.moneyTone" class="rr-val" />
            </Motion>
          </div>

          <hr class="rmb-perf-line" />
          <footer class="roll-foot">
            <span class="roll-barcode" aria-hidden="true"><i v-for="b in 42" :key="b" :style="barStyle(b)" /></span>
            <span class="roll-code rmb-mono">{{ codeLabel }}</span>
          </footer>
        </Motion>
      </div>
    </div>
  </Motion>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Motion } from 'motion-v'
import { Plus, ScrollText, Receipt, Send, Clock, CheckCircle2, BadgeCheck, Activity } from 'lucide-vue-next'
import RmbFlowGauge from './RmbFlowGauge.vue'
import RmbMoneyValue from './RmbMoneyValue.vue'
import RmbCountUp from './RmbCountUp.vue'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  summary: { type: Object, default: () => ({}) },
  buckets: { type: Object, default: () => ({ review: 0, approved: 0, settled: 0, closed: 0 }) },
  fyLabel: { type: String, default: '' },
  unlinked: { type: Boolean, default: false },
})
defineEmits(['raise', 'scroll-ledger'])

const heroRef = ref(null)
usePointerSpotlight(heroRef)

const s = computed(() => props.summary || {})
const submittedAmt = computed(() => Number(s.value.submitted_amount) || 0)
const approvedAmt = computed(() => Number(s.value.approved_amount) || 0)
const settledAmt = computed(() => Number(s.value.settled_amount) || 0)
const inFlight = computed(() => Number(s.value.in_flight) || 0)
const total = computed(() => Number(s.value.total_claims) || 0)

// approved_amount already includes settled+paid, so settled/approved is the true clearance ratio
const settledPct = computed(() =>
  approvedAmt.value > 0 ? Math.round((settledAmt.value / approvedAmt.value) * 100) : 0)

const eyebrow = computed(() => `MY REIMBURSEMENTS · ${props.fyLabel || 'LIVE TAPE'}`)

const gaugeSegs = computed(() => {
  const b = props.buckets || {}
  return [
    { key: 'settled', label: 'Settled', value: Number(b.settled) || 0, color: 'var(--rmb-st-settled)' },
    { key: 'approved', label: 'To settle', value: Number(b.approved) || 0, color: 'var(--rmb-st-approved)' },
    { key: 'review', label: 'In review', value: Number(b.review) || 0, color: 'var(--rmb-st-pending)' },
  ]
})

// middle conduit — pipeline counts per stage
const flowStages = computed(() => {
  const b = props.buckets || {}
  const review = Number(b.review) || 0
  const approved = Number(b.approved) || 0
  const settled = Number(b.settled) || 0
  const max = Math.max(total.value, 1)
  const pct = (v) => Math.max(8, Math.round((v / max) * 100))
  return [
    { key: 'submitted', label: 'Submitted', icon: Send, count: total.value, pct: 100, tone: 'neutral' },
    { key: 'review', label: 'In review', icon: Clock, count: review, pct: pct(review), tone: 'warn' },
    { key: 'approved', label: 'Approved', icon: CheckCircle2, count: approved + settled, pct: pct(approved + settled), tone: 'go' },
    { key: 'settled', label: 'Settled', icon: BadgeCheck, count: settled, pct: pct(settled), tone: 'ok' },
  ]
})

const rows = computed(() => {
  const max = Math.max(submittedAmt.value, approvedAmt.value, settledAmt.value, 1)
  const pct = (v) => Math.max(4, Math.round((v / max) * 100))
  return [
    { key: 'submitted', label: 'Submitted', icon: Send, value: submittedAmt.value, pct: pct(submittedAmt.value), tone: 'neutral', moneyTone: '', go: true },
    { key: 'approved', label: 'Approved', icon: CheckCircle2, value: approvedAmt.value, pct: pct(approvedAmt.value), tone: 'go', moneyTone: 'pending', go: true },
    { key: 'settled', label: 'Settled', icon: BadgeCheck, value: settledAmt.value, pct: pct(settledAmt.value), tone: 'ok', moneyTone: 'positive', go: true },
  ]
})

const codeLabel = computed(() =>
  `RMB·${String(total.value).padStart(3, '0')}·${String(settledPct.value).padStart(2, '0')}PCT`)

// deterministic choreography — no Math.random (stable across renders / SSR-safe)
const sparkStyle = (n) => {
  const left = (n * 11.7) % 92 + 4
  const delay = ((n * 0.53) % 4.2).toFixed(2)
  const dur = (4.5 + (n % 4)).toFixed(1)
  const scale = (0.55 + (n % 3) * 0.28).toFixed(2)
  return { left: left + '%', animationDelay: delay + 's', animationDuration: dur + 's', '--sp-scale': scale }
}
const barStyle = (b) => ({ width: ((b * 13) % 4 === 0 ? 3 : (b % 2 ? 1 : 2)) + 'px' })
</script>

<style scoped>
.rsh {
  position: relative; padding: 30px 34px; border-radius: 24px; overflow: hidden;
  will-change: transform, opacity, filter;
  background: linear-gradient(150deg, var(--rmb-paper-elevated), var(--rmb-paper));
  border: 1px solid var(--rmb-border-soft);
  box-shadow: 0 40px 100px -50px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

/* balanced 3-zone layout — lead · live pipeline · register roll (no 3D tilt) */
.rsh-plane {
  position: relative; z-index: 2;
  display: grid; grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.62fr) clamp(258px, 21vw, 300px);
  align-items: center; gap: 30px;
}

/* thermal-tape shimmer along the top edge */
.rsh-tape { position: absolute; top: 0; left: 0; right: 0; height: 5px; z-index: 3; pointer-events: none;
  background: var(--hr-gradient-ambient); background-size: 220% 100%;
  animation: rmb-perforation-shimmer 6s linear infinite; opacity: 0.9; }

.rsh-glow { position: absolute; inset: 0; background: var(--rmb-grad-hero); pointer-events: none;
  transform: translate3d(calc((var(--mx, 0.5) - 0.5) * 26px), calc((var(--my, 0.5) - 0.5) * 18px), 0); transition: transform 0.5s ease; }
.rsh-aurora { position: absolute; border-radius: 50%; pointer-events: none; filter: blur(54px); opacity: 0.5; }
.rsh-aurora.a1 { width: 360px; height: 360px; top: -160px; left: 2%;
  background: radial-gradient(circle, rgba(251,191,36,0.55), transparent 68%); animation: rsh-drift-a 18s ease-in-out infinite;
  transform: translate3d(calc((var(--mx, 0.5) - 0.5) * -32px), calc((var(--my, 0.5) - 0.5) * -22px), 0); }
.rsh-aurora.a2 { width: 320px; height: 320px; bottom: -170px; right: 24%;
  background: radial-gradient(circle, rgba(45,212,191,0.42), transparent 70%); animation: rsh-drift-b 23s ease-in-out infinite;
  transform: translate3d(calc((var(--mx, 0.5) - 0.5) * 28px), calc((var(--my, 0.5) - 0.5) * 20px), 0); }
.rsh-aurora.a3 { width: 300px; height: 300px; top: 24%; left: 46%; opacity: 0.35;
  background: radial-gradient(circle, rgba(251,146,60,0.46), transparent 70%); animation: rsh-drift-a 27s ease-in-out infinite reverse;
  transform: translate3d(calc((var(--mx, 0.5) - 0.5) * 16px), calc((var(--my, 0.5) - 0.5) * -12px), 0); }
.rsh-mesh { position: absolute; inset: 0; pointer-events: none; opacity: 0.4;
  background-image: linear-gradient(var(--rmb-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--rmb-grid-line) 1px, transparent 1px);
  background-size: 34px 34px; -webkit-mask: radial-gradient(130% 120% at 25% 0%, #000, transparent 72%); mask: radial-gradient(130% 120% at 25% 0%, #000, transparent 72%);
  transform: translate3d(calc((var(--mx, 0.5) - 0.5) * 10px), calc((var(--my, 0.5) - 0.5) * 8px), 0); transition: transform 0.5s ease; }
.rsh-scan { position: absolute; left: 0; right: 0; top: 0; height: 42%; pointer-events: none;
  background: linear-gradient(180deg, transparent, rgba(251,191,36,0.05), transparent); }
.rsh-sheen { position: absolute; inset: 0; pointer-events: none; opacity: 0; z-index: 3;
  background: linear-gradient(110deg, transparent 42%, rgba(255,255,255,0.10) 50%, transparent 58%);
  background-size: 240% 100%; background-position: 130% 0; animation: rsh-sheen 9s ease-in-out 1.6s infinite; }

.rsh-sparks { position: absolute; inset: 0; pointer-events: none; z-index: 1; }
.rsh-sparks i { position: absolute; bottom: 12%; width: 3px; height: 3px; border-radius: 50%;
  background: var(--rmb-amber-bright); box-shadow: 0 0 8px 1px color-mix(in srgb, var(--rmb-amber) 70%, transparent);
  transform: scale(var(--sp-scale, 1)); animation: rmb-spark-rise linear infinite; opacity: 0; }

/* ── LEAD ── */
.rsh-lead { position: relative; z-index: 1; min-width: 0; }
.rsh-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: 11px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--rmb-st-returned); margin-bottom: 10px; }
.eb-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--rmb-st-approved); animation: rmb-pulse-dot 2.4s ease-in-out infinite; }
.rsh-title { font-size: 52px; line-height: 0.98; margin: 0; font-weight: 800; letter-spacing: -2px; color: var(--rmb-text); display: flex; flex-direction: column; }
.rsh-title .t-line { display: block; }
.rsh-title .ink { background: var(--hr-gradient-hero); background-size: 220% auto; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  animation: rsh-ink 6s linear infinite; }
@keyframes rsh-ink { to { background-position: 220% center; } }
.rsh-sub { margin: 14px 0 0; font-size: 14px; line-height: 1.5; color: var(--rmb-text-secondary); max-width: 410px; }

.rsh-cta-row { display: flex; align-items: center; gap: 12px; margin-top: 22px; flex-wrap: wrap; }
.rsh-cta { position: relative; overflow: hidden; font-size: 14px; padding: 12px 22px; z-index: 2; }
.cta-sheen { position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: 0.9;
  background: linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.45) 50%, transparent 60%);
  background-size: 240% 100%; background-position: 130% 0; animation: rsh-sheen 4.5s ease-in-out 1s infinite; }
.rsh-ghost { display: inline-flex; align-items: center; gap: 7px; cursor: pointer; font-size: 13px; font-weight: 600;
  padding: 11px 18px; border-radius: 10px; color: var(--rmb-text-secondary);
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); transition: color 0.2s, border-color 0.2s, background 0.2s; }
.rsh-ghost:hover { color: var(--rmb-text); border-color: var(--rmb-border-strong); background: var(--rmb-surface-elevated); }

.rsh-tape-row { display: flex; align-items: center; gap: 12px; margin-top: 22px; flex-wrap: wrap; }
.rsh-bar { position: relative; flex: 1; min-width: 160px; max-width: 300px; height: 9px; border-radius: 999px; overflow: hidden;
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); }
.rsh-bar-fill { position: absolute; inset: 0 auto 0 0; border-radius: inherit; min-width: 5px;
  background: linear-gradient(90deg, var(--rmb-st-approved), var(--rmb-st-settled));
  box-shadow: 0 0 14px -2px var(--rmb-st-settled); transition: width 1.2s var(--rmb-spring); }
.rsh-bar-glow { position: absolute; inset: 0; border-radius: inherit; opacity: 0.65;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent); background-size: 220% 100%;
  animation: rmb-amount-shimmer 2.6s linear infinite; }
.rsh-bar-ticks { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: repeating-linear-gradient(90deg, transparent 0 19px, var(--rmb-border-soft) 19px 20px); }
.rsh-bar-flag { font-size: 11px; letter-spacing: 0.04em; color: var(--rmb-text-muted); white-space: nowrap; }

/* ── MIDDLE · LIVE PIPELINE CONDUIT ── */
.rsh-flow { position: relative; z-index: 1; align-self: stretch; display: flex; flex-direction: column; justify-content: center; padding: 4px 0; min-width: 0; }
.flow-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--rmb-text-muted); margin-bottom: 14px; }
.flow-track { position: relative; list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 16px; }
/* flowing conduit threading the nodes */
.flow-spine { position: absolute; left: 17px; top: 18px; bottom: 18px; width: 2px; border-radius: 2px; overflow: visible;
  background: linear-gradient(180deg, var(--rmb-st-pending), var(--rmb-st-approved), var(--rmb-st-settled));
  background-size: 100% 240%; animation: rmb-flow-down 2.4s linear infinite; opacity: 0.55; }
.flow-spark { position: absolute; left: 50%; top: 0; width: 7px; height: 7px; margin-left: -3.5px; border-radius: 50%;
  background: #fff; box-shadow: 0 0 10px 2px var(--rmb-amber-bright); animation: flow-spark 3.2s ease-in-out infinite; }
@keyframes flow-spark { 0% { top: 0; opacity: 0; } 12% { opacity: 1; } 88% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
.flow-node { position: relative; display: grid; grid-template-columns: 36px 1fr; align-items: center; gap: 12px; }
.fn-dot { position: relative; z-index: 1; width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center;
  background: var(--rmb-surface-elevated); border: 1px solid var(--rmb-border-soft); color: var(--rmb-text-muted);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--rmb-canvas) 60%, transparent); transition: transform 0.3s var(--rmb-spring); }
.flow-node:hover .fn-dot { transform: scale(1.1); }
.flow-node[data-tone="warn"] .fn-dot { color: var(--rmb-st-pending); border-color: color-mix(in srgb, var(--rmb-st-pending) 45%, transparent); background: var(--rmb-st-pending-soft); }
.flow-node[data-tone="go"] .fn-dot { color: var(--rmb-st-approved); border-color: color-mix(in srgb, var(--rmb-st-approved) 45%, transparent); background: var(--rmb-st-approved-soft); }
.flow-node[data-tone="ok"] .fn-dot { color: var(--rmb-st-settled); border-color: color-mix(in srgb, var(--rmb-st-settled) 45%, transparent); background: var(--rmb-st-settled-soft); }
.fn-meta { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.fn-meta b { font-size: 22px; font-weight: 800; color: var(--rmb-text); line-height: 1; }
.fn-meta small { font-size: 11px; color: var(--rmb-text-muted); white-space: nowrap; }
.fn-pip { position: absolute; left: 48px; right: 0; bottom: -5px; height: 2px; border-radius: 2px; max-width: 92%;
  background: linear-gradient(90deg, color-mix(in srgb, var(--rmb-amber) 60%, transparent), transparent); opacity: 0.5; }

/* ── REGISTER ROLL ── */
.rsh-roll-wrap { position: relative; z-index: 1; justify-self: end; }
.roll-aura { position: absolute; inset: -24px; border-radius: 30px; pointer-events: none; z-index: -1;
  background: radial-gradient(circle at 50% 36%, color-mix(in srgb, var(--rmb-amber) 22%, transparent), transparent 66%);
  animation: rmb-aura-breathe 6s ease-in-out infinite; }
.rsh-roll { position: relative; width: 100%; max-width: 300px; padding: 16px 18px 14px; border-radius: 14px; overflow: hidden;
  background: linear-gradient(180deg, var(--rmb-paper-elevated), var(--rmb-paper));
  border: 1px solid var(--rmb-border-strong);
  box-shadow: 0 30px 60px -32px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06); }
.roll-feed { position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: 0.5;
  background: repeating-linear-gradient(180deg, transparent 0 25px, color-mix(in srgb, var(--rmb-text) 3%, transparent) 25px 26px); }
.roll-head { position: relative; display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.roll-brand { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; letter-spacing: 0.14em; color: var(--rmb-text); font-weight: 700; }
.roll-live { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; letter-spacing: 0.1em; color: var(--rmb-text-muted); }
.roll-live .lv { width: 6px; height: 6px; border-radius: 50%; background: var(--rmb-st-approved); animation: rmb-pulse-dot 2.2s ease-out infinite; }
.roll-gauge { position: relative; display: grid; place-items: center; padding: 4px 0 8px; }

.roll-rows { position: relative; display: flex; flex-direction: column; gap: 4px; }
.roll-row { display: grid; grid-template-columns: 24px 1fr; grid-template-areas: "ic lbl" "ic bar" "val val"; column-gap: 9px; row-gap: 3px;
  align-items: center; padding: 7px 8px; border-radius: 9px; cursor: pointer; text-align: left;
  background: transparent; border: 1px solid transparent; transition: background 0.2s, border-color 0.2s; }
.roll-row:hover { background: var(--rmb-surface); border-color: var(--rmb-border-soft); }
.rr-ic { grid-area: ic; width: 24px; height: 24px; border-radius: 7px; display: grid; place-items: center;
  background: rgba(251,191,36,0.12); color: var(--rmb-amber); }
.roll-row[data-tone="go"] .rr-ic { background: var(--rmb-st-approved-soft); color: var(--rmb-st-approved); }
.roll-row[data-tone="ok"] .rr-ic { background: var(--rmb-st-settled-soft); color: var(--rmb-st-settled); }
.rr-lbl { grid-area: lbl; font-size: 11.5px; font-weight: 600; color: var(--rmb-text-secondary); }
.rr-bar { grid-area: bar; height: 3px; border-radius: 999px; background: var(--rmb-grid-line); overflow: hidden; }
.rr-bar i { display: block; height: 100%; border-radius: 999px; background: var(--rmb-amber); transition: width 1.1s var(--rmb-ease); }
.roll-row[data-tone="go"] .rr-bar i { background: var(--rmb-st-approved); }
.roll-row[data-tone="ok"] .rr-bar i { background: var(--rmb-st-settled); }
.rr-val { grid-area: val; justify-self: end; font-size: 15px; margin-top: 1px; white-space: nowrap; }

.roll-foot { position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; padding-top: 4px; }
.roll-barcode { display: flex; align-items: flex-end; gap: 2px; height: 26px; opacity: 0.78;
  -webkit-mask: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent); mask: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent); }
.roll-barcode i { display: block; height: 100%; background: var(--rmb-text); }
.roll-code { font-size: 9px; letter-spacing: 0.22em; color: var(--rmb-text-muted); }

/* ── keyframes ── */
@keyframes rsh-drift-a { 0%, 100% { translate: 0 0; opacity: 0.45; } 50% { translate: 40px 30px; opacity: 0.7; } }
@keyframes rsh-drift-b { 0%, 100% { translate: 0 0; opacity: 0.4; } 50% { translate: -36px -24px; opacity: 0.62; } }
@keyframes rsh-sheen { 0% { background-position: 130% 0; opacity: 0; } 12% { opacity: 1; } 30% { background-position: -40% 0; opacity: 0; } 100% { background-position: -40% 0; opacity: 0; } }

/* ── light-theme nudges ── */
:root[data-theme="light"] .rsh-aurora.a1 { opacity: 0.32; }
:root[data-theme="light"] .rsh-aurora.a2 { opacity: 0.26; }
:root[data-theme="light"] .rsh-aurora.a3 { opacity: 0.22; }
:root[data-theme="light"] .rsh-sheen { background: linear-gradient(110deg, transparent 42%, rgba(255,255,255,0.5) 50%, transparent 58%); }
:root[data-theme="light"] .cta-sheen { background: linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.6) 50%, transparent 60%); background-size: 240% 100%; }
:root[data-theme="light"] .rsh-sparks i { background: var(--rmb-amber-strong); box-shadow: 0 0 7px 1px color-mix(in srgb, var(--rmb-amber-strong) 55%, transparent); }
:root[data-theme="light"] .flow-spark { background: var(--rmb-amber-strong); box-shadow: 0 0 9px 2px color-mix(in srgb, var(--rmb-amber-strong) 60%, transparent); }

@media (prefers-reduced-motion: reduce) {
  .rsh-aurora, .roll-aura, .rsh-sheen, .rsh-tape, .eb-dot, .rsh-sparks i, .rsh-bar-glow, .rmb-grain, .cta-sheen, .roll-live .lv, .rsh-title .ink, .flow-spine, .flow-spark { animation: none !important; }
  .rsh-glow, .rsh-mesh, .rsh-aurora { transform: none !important; }
  .rsh-sparks { display: none; }
}

/* ── responsive ── */
@media (max-width: 1140px) {
  .rsh-plane { grid-template-columns: minmax(0, 1fr) clamp(258px, 30vw, 300px); }
  .rsh-flow { grid-row: 2; grid-column: 1 / -1; }
  .flow-track { flex-direction: row; flex-wrap: wrap; gap: 14px 24px; }
  .flow-spine { display: none; }
  .flow-node { grid-template-columns: 36px auto; }
}
@media (max-width: 720px) {
  .rsh { padding: 22px 18px; }
  .rsh-title { font-size: 40px; }
  .rsh-plane { grid-template-columns: 1fr; }
  .rsh-roll-wrap { justify-self: center; max-width: 320px; width: 100%; }
  .rsh-roll { max-width: none; }
}
</style>
