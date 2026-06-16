<template>
  <Motion as="header" class="rmb-hero" ref="heroRef"
    :initial="{ opacity: 0, y: -16, filter: 'blur(10px)' }"
    :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
    :transition="{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }">
    <!-- thermal-tape perforation edge -->
    <span class="hero-tape" aria-hidden="true" />

    <!-- volumetric atmosphere (parallax depth layers) -->
    <span class="hero-aurora a1" aria-hidden="true" />
    <span class="hero-aurora a2" aria-hidden="true" />
    <span class="hero-aurora a3" aria-hidden="true" />
    <span class="hero-glow" aria-hidden="true" />
    <span class="hero-mesh" aria-hidden="true" />
    <span class="rmb-spotlight" aria-hidden="true" />
    <span class="hero-scan" aria-hidden="true" />
    <span class="hero-sheen" aria-hidden="true" />
    <span class="rmb-grain" aria-hidden="true" />

    <!-- rising ledger sparks -->
    <span class="hero-sparks" aria-hidden="true">
      <i v-for="n in 7" :key="n" :style="sparkStyle(n)" />
    </span>

    <!-- 3D-tilted content plane -->
    <div class="hero-plane">
      <!-- left: settlement pipeline gauge -->
      <div class="hero-gauge">
        <RmbFlowGauge :size="190" :segments="cfg.gaugeSegs"
          :center-number="cfg.centerNum" :center-suffix="cfg.centerSuffix ?? '%'"
          :center-label="cfg.centerLabel" :center-sub="cfg.centerSub" />
        <span class="hero-gauge-halo" aria-hidden="true" />
        <span class="hero-gauge-ring" aria-hidden="true" />
      </div>

      <!-- mid: lead + money (re-skins per active tab) -->
      <div class="hero-lead">
        <transition name="hero-swap" mode="out-in">
          <div class="hero-lead-in" :key="context">
            <span class="eyebrow rmb-mono"><span class="eyebrow-dot" />{{ cfg.eyebrow }}</span>
            <h1 class="hero-title">{{ cfg.titlePre }} <span class="ink">{{ cfg.titleInk }}</span></h1>
            <p class="hero-sub">{{ cfg.sub }}</p>
            <div class="hero-total">
              <span class="total-lbl">{{ cfg.totalLabel }}</span>
              <div class="total-val"><RmbMoneyValue :value="cfg.totalValue" :decimals="0" :tone="cfg.totalTone" /></div>
              <!-- live clearance tape -->
              <div class="hero-bar" role="presentation">
                <span class="hero-bar-fill" :style="{ width: cfg.rate + '%' }"><i class="hero-bar-glow" /></span>
                <span class="hero-bar-flag rmb-mono">{{ cfg.rate }}% {{ cfg.rateLabel }}</span>
              </div>
            </div>
          </div>
        </transition>
      </div>

      <!-- right: live ticker tiles -->
      <div class="hero-ticker">
        <Motion v-for="(t, i) in cfg.tiles" :key="t.key" as="button" class="ht" :data-tone="t.tone"
          :initial="{ opacity: 0, y: 18, rotateX: -18 }" :animate="{ opacity: 1, y: 0, rotateX: 0 }"
          :transition="{ delay: 0.3 + i * 0.09, duration: 0.55, ease: [0.16, 1, 0.3, 1] }"
          :whileHover="{ y: -4, scale: 1.025 }" :whileTap="{ scale: 0.95 }"
          @click="t.go && $emit('go', t.go)">
          <span class="ht-sweep" aria-hidden="true" />
          <span class="ht-ic"><component :is="t.icon" :size="15" /></span>
          <span class="ht-meta">
            <b class="rmb-mono">
              <RmbMoneyValue v-if="t.money" :value="t.value" :decimals="0" />
              <RmbCountUp v-else :value="t.value" :decimals="t.decimals || 0" :suffix="t.suffix || ''" />
            </b>
            <small>{{ t.label }}</small>
          </span>
          <ArrowUpRight v-if="t.go" :size="13" class="ht-arr" />
        </Motion>
      </div>
    </div>
  </Motion>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Motion } from 'motion-v'
import { Clock, BadgeCheck, Wallet, Timer, ArrowUpRight, Inbox, CheckCircle2, XCircle, IndianRupee, Tags, ScrollText } from 'lucide-vue-next'
import RmbFlowGauge from './RmbFlowGauge.vue'
import RmbMoneyValue from './RmbMoneyValue.vue'
import RmbCountUp from './RmbCountUp.vue'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  metrics: { type: Object, default: () => ({}) },
  fyLabel: { type: String, default: '' },
  context: { type: String, default: 'dashboard' },   // dashboard | approvals
})
defineEmits(['go'])

const heroRef = ref(null)
usePointerSpotlight(heroRef)

const m = computed(() => props.metrics || {})
const pendingN = computed(() => Number(m.value.pending) || 0)
const toSettleN = computed(() => Number(m.value.approved_unsettled) || 0)
const settledN = computed(() => Number(m.value.settled_count) || 0)
const rejectedN = computed(() => Number(m.value.rejected_count) || 0)
const approvedN = computed(() => toSettleN.value + settledN.value)
const pendingAmount = computed(() => Number(m.value.pending_amount) || 0)
const approvedAmount = computed(() => Number(m.value.approved_amount) || 0)
const settledAmount = computed(() => Number(m.value.settled_amount) || 0)
const categoryCount = computed(() => Number(m.value.category_count) || 0)

const pipelineTotal = computed(() => pendingN.value + toSettleN.value + settledN.value)
const settlementRate = computed(() =>
  pipelineTotal.value > 0 ? Math.round((settledN.value / pipelineTotal.value) * 100) : 0)
const approvalRate = computed(() => {
  const denom = approvedN.value + rejectedN.value
  return denom > 0 ? Math.round((approvedN.value / denom) * 100) : 0
})

// The hero re-skins itself to the active workspace tab.
const cfg = computed(() => {
  if (props.context === 'reports') {
    return {
      eyebrow: 'REPORTS · EXPORT FOUNDRY',
      titlePre: 'Report', titleInk: 'Foundry',
      sub: 'Branded PDF, Excel & CSV exports — every report cast with its own identity, for finance & audit.',
      totalLabel: 'Total reimbursed (FY)', totalValue: Number(m.value.total) || 0, totalTone: 'positive',
      rate: settlementRate.value, rateLabel: 'cleared',
      gaugeSegs: [
        { key: 'settled', label: 'Settled', value: settledN.value, color: 'var(--rmb-st-settled)' },
        { key: 'to-settle', label: 'To settle', value: toSettleN.value, color: 'var(--rmb-st-approved)' },
        { key: 'pending', label: 'Pending', value: pendingN.value, color: 'var(--rmb-st-pending)' },
      ],
      centerNum: Number(m.value.total_claims) || 0, centerSuffix: '', centerLabel: 'Claims', centerSub: 'exportable',
      tiles: [
        { key: 'claims', label: 'Claims tracked', icon: ScrollText, value: Number(m.value.total_claims) || 0, tone: 'ok', go: 'claims' },
        { key: 'settled', label: 'Settled (FY)', icon: BadgeCheck, value: settledAmount.value, money: true, tone: 'ok', go: 'settlement' },
        { key: 'cats', label: 'Spend categories', icon: Tags, value: categoryCount.value, tone: 'neutral', go: 'categories' },
        { key: 'tat', label: 'Avg cycle (days)', icon: Timer, value: Number(m.value.avg_days) || 0, decimals: 1, tone: 'neutral' },
      ],
    }
  }
  if (props.context === 'audit-logs') {
    return {
      eyebrow: 'AUDIT · IMMUTABLE RECORDER',
      titlePre: 'Event', titleInk: 'Recorder',
      sub: 'Every claim, category & policy mutation — captured, timestamped & immutable.',
      totalLabel: 'Claims on record (FY)', totalValue: Number(m.value.total) || 0, totalTone: 'positive',
      rate: settlementRate.value, rateLabel: 'cleared',
      gaugeSegs: [
        { key: 'settled', label: 'Settled', value: settledN.value, color: 'var(--rmb-st-settled)' },
        { key: 'to-settle', label: 'To settle', value: toSettleN.value, color: 'var(--rmb-st-approved)' },
        { key: 'pending', label: 'Pending', value: pendingN.value, color: 'var(--rmb-st-pending)' },
      ],
      centerNum: Number(m.value.total_claims) || 0, centerSuffix: '', centerLabel: 'Claims', centerSub: 'on record',
      tiles: [
        { key: 'claims', label: 'Claims tracked', icon: ScrollText, value: Number(m.value.total_claims) || 0, tone: 'ok', go: 'claims' },
        { key: 'settled', label: 'Settled (FY)', icon: BadgeCheck, value: settledAmount.value, money: true, tone: 'ok', go: 'settlement' },
        { key: 'cats', label: 'Spend categories', icon: Tags, value: categoryCount.value, tone: 'neutral', go: 'categories' },
        { key: 'tat', label: 'Avg cycle (days)', icon: Timer, value: Number(m.value.avg_days) || 0, decimals: 1, tone: 'neutral' },
      ],
    }
  }
  if (props.context === 'policies') {
    return {
      eyebrow: 'POLICY & LIMITS · GOVERNANCE',
      titlePre: 'Rules &', titleInk: 'Limits',
      sub: 'Spend caps, receipt rules & approval routes — the governance layer for every claim.',
      totalLabel: 'Reimbursed under policy (FY)', totalValue: Number(m.value.total) || 0, totalTone: 'positive',
      rate: settlementRate.value, rateLabel: 'cleared',
      gaugeSegs: [
        { key: 'settled', label: 'Settled', value: settledN.value, color: 'var(--rmb-st-settled)' },
        { key: 'to-settle', label: 'To settle', value: toSettleN.value, color: 'var(--rmb-st-approved)' },
        { key: 'pending', label: 'Pending', value: pendingN.value, color: 'var(--rmb-st-pending)' },
      ],
      centerNum: categoryCount.value, centerSuffix: '', centerLabel: 'Categories', centerSub: 'spend buckets',
      tiles: [
        { key: 'cats', label: 'Spend categories', icon: Tags, value: categoryCount.value, tone: 'neutral', go: 'categories' },
        { key: 'claims', label: 'Claims governed', icon: ScrollText, value: Number(m.value.total_claims) || 0, tone: 'ok', go: 'claims' },
        { key: 'approved', label: 'Approved · to settle', icon: Wallet, value: toSettleN.value, tone: toSettleN.value > 0 ? 'go' : 'ok', go: 'settlement' },
        { key: 'tat', label: 'Avg cycle (days)', icon: Timer, value: Number(m.value.avg_days) || 0, decimals: 1, tone: 'neutral' },
      ],
    }
  }
  if (props.context === 'settlement') {
    return {
      eyebrow: 'SETTLEMENT · DISBURSEMENT DESK',
      titlePre: 'Settlement', titleInk: 'Desk',
      sub: 'Disburse approved claims — payroll, bank or cash, on one ledger.',
      totalLabel: 'Approved · awaiting payout', totalValue: approvedAmount.value, totalTone: 'pending',
      rate: settlementRate.value, rateLabel: 'settled',
      gaugeSegs: [
        { key: 'settled', label: 'Settled', value: settledN.value, color: 'var(--rmb-st-settled)' },
        { key: 'to-settle', label: 'To settle', value: toSettleN.value, color: 'var(--rmb-st-approved)' },
        { key: 'pending', label: 'Pending', value: pendingN.value, color: 'var(--rmb-st-pending)' },
      ],
      centerNum: settlementRate.value, centerLabel: 'Settled', centerSub: `${toSettleN.value} to settle`,
      tiles: [
        { key: 'tosettle', label: 'Approved · to settle', icon: Wallet, value: toSettleN.value, tone: toSettleN.value > 0 ? 'go' : 'ok', go: 'settlement' },
        { key: 'todisburse', label: 'Value to disburse', icon: IndianRupee, value: approvedAmount.value, money: true, tone: toSettleN.value > 0 ? 'go' : 'ok', go: 'settlement' },
        { key: 'settledfy', label: 'Settled (FY)', icon: BadgeCheck, value: settledAmount.value, money: true, tone: 'ok', go: 'reports' },
        { key: 'tat', label: 'Avg cycle (days)', icon: Timer, value: Number(m.value.avg_days) || 0, decimals: 1, tone: 'neutral' },
      ],
    }
  }
  if (props.context === 'categories') {
    return {
      eyebrow: 'CATEGORIES · SPEND TAXONOMY',
      titlePre: 'Category', titleInk: 'Studio',
      sub: 'Design every spend bucket and its dynamic fields — the live taxonomy behind each claim.',
      totalLabel: 'Reimbursed under taxonomy (FY)', totalValue: Number(m.value.total) || 0, totalTone: 'positive',
      rate: settlementRate.value, rateLabel: 'cleared',
      gaugeSegs: [
        { key: 'settled', label: 'Settled', value: settledN.value, color: 'var(--rmb-st-settled)' },
        { key: 'to-settle', label: 'To settle', value: toSettleN.value, color: 'var(--rmb-st-approved)' },
        { key: 'pending', label: 'Pending', value: pendingN.value, color: 'var(--rmb-st-pending)' },
      ],
      centerNum: categoryCount.value, centerSuffix: '', centerLabel: 'Buckets', centerSub: 'spend categories',
      tiles: [
        { key: 'cats', label: 'Spend categories', icon: Tags, value: categoryCount.value, tone: 'neutral', go: 'categories' },
        { key: 'claims', label: 'Claims governed', icon: ScrollText, value: Number(m.value.total_claims) || 0, tone: 'ok', go: 'claims' },
        { key: 'month', label: 'Claims this month', icon: BadgeCheck, value: Number(m.value.settled_month) || 0, tone: 'ok', go: 'claims' },
        { key: 'tat', label: 'Avg cycle (days)', icon: Timer, value: Number(m.value.avg_days) || 0, decimals: 1, tone: 'neutral' },
      ],
    }
  }
  if (props.context === 'approvals') {
    return {
      eyebrow: 'APPROVALS · DECISION DESK',
      titlePre: 'Approval', titleInk: 'Desk',
      sub: 'Every claim awaiting your call — routed, stamped & cleared.',
      totalLabel: 'Pending your approval', totalValue: pendingAmount.value, totalTone: 'pending',
      rate: approvalRate.value, rateLabel: 'cleared',
      gaugeSegs: [
        { key: 'approved', label: 'Approved', value: approvedN.value, color: 'var(--rmb-st-approved)' },
        { key: 'pending', label: 'Pending', value: pendingN.value, color: 'var(--rmb-st-pending)' },
        { key: 'rejected', label: 'Rejected', value: rejectedN.value, color: 'var(--rmb-st-rejected)' },
      ],
      centerNum: approvalRate.value, centerLabel: 'Cleared', centerSub: `${pendingN.value} awaiting`,
      tiles: [
        { key: 'await', label: 'Awaiting your call', icon: Inbox, value: pendingN.value, tone: pendingN.value > 0 ? 'warn' : 'ok', go: 'approvals' },
        { key: 'pendval', label: 'Pending value', icon: IndianRupee, value: pendingAmount.value, money: true, tone: 'warn', go: 'approvals' },
        { key: 'approved', label: 'Approved claims', icon: CheckCircle2, value: approvedN.value, tone: 'go', go: 'settlement' },
        { key: 'rejected', label: 'Rejected', icon: XCircle, value: rejectedN.value, tone: 'bad' },
      ],
    }
  }
  return {
    eyebrow: `REIMBURSEMENTS · FY ${props.fyLabel}`,
    titlePre: 'Claims', titleInk: 'Ledger',
    sub: 'Raise, route & settle every business expense — on one live tape.',
    totalLabel: 'Total reimbursed this FY', totalValue: Number(m.value.total) || 0, totalTone: 'positive',
    rate: settlementRate.value, rateLabel: 'cleared',
    gaugeSegs: [
      { key: 'settled', label: 'Settled', value: settledN.value, color: 'var(--rmb-st-settled)' },
      { key: 'to-settle', label: 'To settle', value: toSettleN.value, color: 'var(--rmb-st-approved)' },
      { key: 'pending', label: 'Pending', value: pendingN.value, color: 'var(--rmb-st-pending)' },
    ],
    centerNum: settlementRate.value, centerLabel: 'Settled', centerSub: `${pipelineTotal.value} in pipeline`,
    tiles: [
      { key: 'pending', label: 'Awaiting approval', icon: Clock, value: pendingN.value, tone: pendingN.value > 0 ? 'warn' : 'ok', go: 'approvals' },
      { key: 'unsettled', label: 'Approved · to settle', icon: Wallet, value: toSettleN.value, tone: toSettleN.value > 0 ? 'go' : 'ok', go: 'settlement' },
      { key: 'month', label: 'Claims this month', icon: BadgeCheck, value: Number(m.value.settled_month) || 0, tone: 'ok', go: 'claims' },
      { key: 'tat', label: 'Avg cycle (days)', icon: Timer, value: Number(m.value.avg_days) || 0, decimals: 1, tone: 'neutral' },
    ],
  }
})

// deterministic spark choreography (no Math.random — stable across renders)
const sparkStyle = (n) => {
  const left = (n * 13.7) % 92 + 4
  const delay = ((n * 0.61) % 4).toFixed(2)
  const dur = (5 + (n % 4)).toFixed(1)
  const scale = (0.6 + (n % 3) * 0.25).toFixed(2)
  return { left: left + '%', animationDelay: delay + 's', animationDuration: dur + 's', '--sp-scale': scale }
}
</script>

<style scoped>
.rmb-hero { position: relative; padding: 24px 28px; border-radius: 22px; overflow: hidden; perspective: 1200px; will-change: transform, opacity, filter;
  background: linear-gradient(150deg, var(--rmb-paper-elevated), var(--rmb-paper));
  border: 1px solid var(--rmb-border-soft);
  box-shadow: 0 34px 90px -46px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.05); }

/* the 3D content plane — tilts toward the pointer */
.hero-plane { position: relative; z-index: 2; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 30px;
  transform-style: preserve-3d; transition: transform 0.45s var(--rmb-ease);
  transform: rotateX(calc((var(--my, 0.5) - 0.5) * -5deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 7deg)); }

/* thermal-tape perforated top edge */
.hero-tape { position: absolute; top: 0; left: 0; right: 0; height: 5px; z-index: 3;
  background: var(--hr-gradient-ambient); background-size: 220% 100%;
  animation: rmb-perforation-shimmer 6s linear infinite; opacity: 0.85; }

/* ── parallax atmosphere ── */
.hero-glow { position: absolute; inset: 0; background: var(--rmb-grad-hero); pointer-events: none;
  transform: translate3d(calc((var(--mx, 0.5) - 0.5) * 30px), calc((var(--my, 0.5) - 0.5) * 22px), 0); transition: transform 0.4s ease; }
.hero-aurora { position: absolute; border-radius: 50%; pointer-events: none; filter: blur(50px); opacity: 0.5; }
.hero-aurora.a1 { width: 340px; height: 340px; top: -150px; left: 6%;
  background: radial-gradient(circle, rgba(251,191,36,0.5), transparent 68%); animation: hero-drift-a 18s ease-in-out infinite;
  transform: translate3d(calc((var(--mx, 0.5) - 0.5) * -44px), calc((var(--my, 0.5) - 0.5) * -30px), 0); }
.hero-aurora.a2 { width: 320px; height: 320px; bottom: -170px; right: 16%;
  background: radial-gradient(circle, rgba(45,212,191,0.4), transparent 70%); animation: hero-drift-b 22s ease-in-out infinite;
  transform: translate3d(calc((var(--mx, 0.5) - 0.5) * 38px), calc((var(--my, 0.5) - 0.5) * 26px), 0); }
.hero-aurora.a3 { width: 260px; height: 260px; top: 30%; left: 44%; opacity: 0.32;
  background: radial-gradient(circle, rgba(251,146,60,0.4), transparent 70%); animation: hero-drift-a 26s ease-in-out infinite reverse;
  transform: translate3d(calc((var(--mx, 0.5) - 0.5) * 18px), calc((var(--my, 0.5) - 0.5) * -14px), 0); }
.hero-mesh { position: absolute; inset: 0; pointer-events: none; opacity: 0.4;
  background-image: linear-gradient(var(--rmb-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--rmb-grid-line) 1px, transparent 1px);
  background-size: 32px 32px; -webkit-mask: radial-gradient(120% 120% at 28% 0%, #000, transparent 70%); mask: radial-gradient(120% 120% at 28% 0%, #000, transparent 70%);
  transform: translate3d(calc((var(--mx, 0.5) - 0.5) * 14px), calc((var(--my, 0.5) - 0.5) * 10px), 0); transition: transform 0.5s ease; }
.hero-scan { position: absolute; left: 0; right: 0; top: 0; height: 40%; pointer-events: none;
  background: linear-gradient(180deg, transparent, rgba(251,191,36,0.05), transparent); }
.hero-sheen { position: absolute; inset: 0; pointer-events: none; opacity: 0; z-index: 3;
  background: linear-gradient(110deg, transparent 42%, rgba(255,255,255,0.10) 50%, transparent 58%);
  background-size: 240% 100%; background-position: 130% 0; animation: hero-sheen 9s ease-in-out 1.4s infinite; }

/* rising sparks */
.hero-sparks { position: absolute; inset: 0; pointer-events: none; z-index: 1; }
.hero-sparks i { position: absolute; bottom: 14%; width: 3px; height: 3px; border-radius: 50%;
  background: var(--rmb-amber-bright); box-shadow: 0 0 8px 1px color-mix(in srgb, var(--rmb-amber) 70%, transparent);
  transform: scale(var(--sp-scale, 1)); animation: rmb-spark-rise linear infinite; opacity: 0; }

/* ── gauge ── */
.hero-gauge { position: relative; z-index: 1; display: grid; place-items: center; transform: translateZ(46px);
  filter: drop-shadow(0 14px 28px rgba(0,0,0,0.45)); }
.hero-gauge-halo { position: absolute; width: 224px; height: 224px; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--rmb-amber) 18%, transparent), transparent 62%);
  animation: rmb-aura-breathe 5.5s ease-in-out infinite; }
.hero-gauge-ring { position: absolute; width: 210px; height: 210px; border-radius: 50%; pointer-events: none;
  border: 1px dashed color-mix(in srgb, var(--rmb-amber) 35%, transparent); opacity: 0.4;
  animation: rmb-orbit 36s linear infinite; }

/* ── lead ── */
.hero-lead { position: relative; z-index: 1; min-width: 0; transform: translateZ(20px); }
.eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--rmb-st-returned); margin-bottom: 6px; }
.eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--rmb-st-approved); animation: rmb-pulse-dot 2.4s ease-in-out infinite; }
.hero-title { font-size: 46px; line-height: 1; margin: 0; font-weight: 800; letter-spacing: -1.6px; color: var(--rmb-text); }
.hero-title .ink { background: var(--hr-gradient-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.hero-sub { margin: 10px 0 0; font-size: 13.5px; color: var(--rmb-text-secondary); }
.hero-total { margin-top: 16px; }
.total-lbl { display: block; font-size: 10.5px; letter-spacing: 1px; text-transform: uppercase; color: var(--rmb-text-muted); }
.total-val { font-size: 31px; margin-top: 2px; }

/* live settlement tape */
.hero-bar { position: relative; margin-top: 12px; height: 7px; border-radius: 999px; max-width: 300px; overflow: hidden;
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); }
.hero-bar-fill { position: absolute; inset: 0 auto 0 0; border-radius: inherit; min-width: 4px;
  background: linear-gradient(90deg, var(--rmb-st-approved), var(--rmb-st-settled));
  box-shadow: 0 0 12px -2px var(--rmb-st-settled); transition: width 1.1s var(--rmb-spring); }
.hero-bar-glow { position: absolute; inset: 0; border-radius: inherit; opacity: 0.6;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent); background-size: 220% 100%;
  animation: rmb-amount-shimmer 2.6s linear infinite; }
.hero-bar-flag { position: absolute; right: 0; top: -18px; font-size: 9.5px; letter-spacing: 0.06em; color: var(--rmb-text-muted); }

/* ── ticker ── */
.hero-ticker { position: relative; z-index: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; min-width: 300px; transform: translateZ(30px); }
.ht { position: relative; display: flex; align-items: center; gap: 10px; padding: 12px 13px; border-radius: 13px; cursor: pointer; overflow: hidden;
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); color: var(--rmb-text-secondary); text-align: left;
  transition: border-color 0.25s, box-shadow 0.3s; will-change: transform; }
.ht-sweep { position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.25s;
  background: radial-gradient(120% 90% at 0% 0%, color-mix(in srgb, var(--rmb-amber) 18%, transparent), transparent 60%); }
.ht:hover { border-color: var(--rmb-border-strong); box-shadow: 0 14px 30px -20px rgba(0,0,0,0.7); }
.ht:hover .ht-sweep { opacity: 1; }
.ht-ic { position: relative; z-index: 1; width: 31px; height: 31px; border-radius: 9px; display: grid; place-items: center; flex-shrink: 0;
  background: rgba(251,191,36,0.12); color: var(--rmb-amber); transition: transform 0.3s var(--rmb-spring); }
.ht:hover .ht-ic { transform: scale(1.12) rotate(-5deg); }
.ht[data-tone="warn"] .ht-ic { background: var(--rmb-st-pending-soft); color: var(--rmb-st-pending); }
.ht[data-tone="go"] .ht-ic { background: var(--rmb-st-approved-soft); color: var(--rmb-st-approved); }
.ht[data-tone="ok"] .ht-ic { background: var(--rmb-st-settled-soft); color: var(--rmb-st-settled); }
.ht[data-tone="bad"] .ht-ic { background: var(--rmb-st-rejected-soft); color: var(--rmb-st-rejected); }

/* context re-skin crossfade */
.hero-lead-in { will-change: transform, opacity; }
.hero-swap-enter-active, .hero-swap-leave-active { transition: opacity 0.4s var(--rmb-ease), transform 0.4s var(--rmb-ease); }
.hero-swap-enter-from { opacity: 0; transform: translateY(12px); }
.hero-swap-leave-to { opacity: 0; transform: translateY(-10px); }
.ht-meta { display: flex; flex-direction: column; min-width: 0; position: relative; z-index: 1; }
.ht-meta b { font-size: 17px; color: var(--rmb-text); line-height: 1.1; font-weight: 800; }
.ht-meta small { font-size: 10px; color: var(--rmb-text-muted); white-space: nowrap; }
.ht-arr { margin-left: auto; opacity: 0.45; flex-shrink: 0; position: relative; z-index: 1; transition: transform 0.25s, opacity 0.2s; }
.ht:hover .ht-arr { opacity: 1; transform: translate(2px, -2px); }

@keyframes hero-drift-a { 0%, 100% { translate: 0 0; opacity: 0.45; } 50% { translate: 38px 28px; opacity: 0.68; } }
@keyframes hero-drift-b { 0%, 100% { translate: 0 0; opacity: 0.4; } 50% { translate: -34px -22px; opacity: 0.6; } }
@keyframes hero-sheen { 0% { background-position: 130% 0; opacity: 0; } 12% { opacity: 1; } 28% { background-position: -40% 0; opacity: 0; } 100% { background-position: -40% 0; opacity: 0; } }

:root[data-theme="light"] .hero-aurora.a1 { opacity: 0.3; }
:root[data-theme="light"] .hero-aurora.a2 { opacity: 0.26; }
:root[data-theme="light"] .hero-aurora.a3 { opacity: 0.2; }
:root[data-theme="light"] .hero-sheen { background: linear-gradient(110deg, transparent 42%, rgba(255,255,255,0.5) 50%, transparent 58%); }
:root[data-theme="light"] .hero-sparks i { background: var(--rmb-amber-strong); box-shadow: 0 0 7px 1px color-mix(in srgb, var(--rmb-amber-strong) 55%, transparent); }

@media (prefers-reduced-motion: reduce) {
  .hero-aurora, .hero-gauge-halo, .hero-gauge-ring, .hero-sheen, .hero-tape, .eyebrow-dot,
  .hero-sparks i, .hero-bar-glow, .rmb-grain { animation: none !important; }
  .hero-glow, .hero-mesh, .hero-plane, .hero-gauge, .hero-lead, .hero-ticker, .hero-aurora { transform: none !important; }
  .hero-sparks { display: none; }
}

@media (max-width: 1080px) {
  .hero-plane { grid-template-columns: auto 1fr; }
  .hero-ticker { grid-column: 1 / -1; grid-template-columns: repeat(4, 1fr); min-width: 0; }
}
@media (max-width: 720px) {
  .hero-plane { grid-template-columns: 1fr; text-align: center; transform: none; }
  .hero-gauge { justify-self: center; transform: none; }
  .eyebrow, .hero-total, .hero-bar { margin-left: auto; margin-right: auto; }
  .eyebrow { justify-content: center; }
  .hero-title { font-size: 36px; }
  .hero-ticker { grid-template-columns: 1fr 1fr; transform: none; }
}
</style>
