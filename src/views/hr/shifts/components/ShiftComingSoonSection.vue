<template>
  <div class="scs-wrap">
    <Motion class="scs-card" as="div"
      :initial="{ opacity: 0, y: 24, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
      :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
      <div class="scs-dial" aria-hidden="true">
        <span class="ring r1" /><span class="ring r2" /><span class="ring r3" />
        <span class="sweep" />
        <div class="scs-icon"><component :is="meta.icon" :size="28" /></div>
      </div>
      <span class="scs-eyebrow">{{ meta.phase }}</span>
      <h2>{{ meta.title }}</h2>
      <p>{{ meta.blurb }}</p>
      <ul class="scs-feats">
        <li v-for="f in meta.features" :key="f"><Check :size="13" /> {{ f }}</li>
      </ul>
      <div class="scs-foundation">
        <ShieldCheck :size="13" />
        {{ meta.foundation }}
      </div>
    </Motion>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import {
  Check, ShieldCheck, ArrowLeftRight, TrendingUp, Moon, Palmtree, Timer,
} from 'lucide-vue-next'

const props = defineProps({ sectionKey: { type: String, required: true } })

const META = {
  workforce: {
    title: 'Workforce Planning', icon: TrendingUp, phase: 'Roadmap — Forecasting',
    blurb: 'Forecast staffing demand against assigned capacity per shift and skill, surfacing shortfalls before they happen.',
    features: ['Demand vs. assigned capacity', 'Skill-coverage forecasting', 'Shortfall projection by shift'],
    foundation: 'Reads the same assignment + coverage tables already in place.',
  },
  swap: {
    title: 'Shift Swap Requests', icon: ArrowLeftRight, phase: 'Roadmap — Self-service',
    blurb: 'Peer-to-peer shift exchange: an employee requests a swap, a colleague accepts, then a manager approves and the roster updates automatically.',
    features: ['Request → accept → manager approval flow', 'Conflict + coverage guardrails on approve', 'Self-service surface under /user/self-service'],
    foundation: 'Builds on the existing assignment + conflict engine — no rebuild needed when this activates.',
  },
  workforce: {
    title: 'Workforce Planning', icon: TrendingUp, phase: 'Roadmap — Forecasting',
    blurb: 'Forecast staffing demand against assigned capacity per shift and skill, surfacing shortfalls before they happen.',
    features: ['Demand vs. assigned capacity', 'Skill-coverage forecasting', 'Shortfall projection by shift'],
    foundation: 'Reads the same assignment + coverage tables already in place.',
  },
  night: {
    title: 'Night Shift Operations', icon: Moon, phase: 'Roadmap — Operations',
    blurb: 'A dedicated console for night-shift staff: allowance tracking, transport & meal eligibility, and safety-compliance checks.',
    features: ['Night-allowance & differential pay', 'Transport / meal eligibility', 'Safety-compliance roster'],
    foundation: 'Night shifts already flow through the Shift model (shift_type=NIGHT + night_allowance) into payroll.',
  },
  holidays: {
    title: 'Holiday Shifts', icon: Palmtree, phase: 'Roadmap — Operations',
    blurb: 'Manage essential staff working on holidays with double-pay, comp-off and holiday-allowance compensation rules.',
    features: ['Holiday duty assignment', 'Double-pay / comp-off rules', 'Feeds the monthly pay run'],
    foundation: 'The holiday calendar (hr_holidays) and assignment engine already exist.',
  },
  'overtime-rules': {
    title: 'Overtime Rules', icon: Timer, phase: 'Roadmap — Compensation',
    blurb: 'Configure OT thresholds, multipliers and caps (daily / weekly / holiday / night) that drive automatic overtime computation.',
    features: ['Threshold + multiplier per OT type', 'Max-OT caps & approval gates', 'Drives the existing OT request engine'],
    foundation: 'Overtime requests + approval already live under Attendance — this adds the rules layer that scores them.',
  },
}
const meta = computed(() => META[props.sectionKey] || {
  title: 'Coming soon', icon: Timer, phase: 'Roadmap',
  blurb: 'This surface is on the Shifts & Rosters roadmap.', features: [],
  foundation: 'The data model is being prepared.',
})
</script>

<style scoped>
.scs-wrap { display: grid; place-items: center; min-height: 56vh; padding: 32px; }
.scs-card { max-width: 560px; text-align: center; padding: 40px 36px;
  background: var(--shift-glass); backdrop-filter: var(--shift-glass-blur);
  border: 1px solid var(--shift-border); border-radius: 26px;
  box-shadow: 0 30px 80px -40px rgba(0,0,0,0.6); }
.scs-dial { position: relative; width: 124px; height: 124px; margin: 0 auto 18px; }
.scs-dial .ring { position: absolute; inset: 0; border-radius: 50%; border: 1px solid var(--shift-border); }
.ring.r2 { inset: 14px; opacity: 0.7; } .ring.r3 { inset: 28px; opacity: 0.45; }
.scs-dial .sweep { position: absolute; inset: 0; border-radius: 50%;
  background: var(--shift-grad-sweep); -webkit-mask: radial-gradient(transparent 54%, #000 55%); mask: radial-gradient(transparent 54%, #000 55%);
  animation: shift-sweep 4.5s linear infinite; }
.scs-icon { position: absolute; inset: 40px; border-radius: 50%; display: grid; place-items: center;
  color: var(--shift-amber); background: radial-gradient(circle, rgba(251,191,36,0.2), transparent 70%); }
.scs-eyebrow { font-family: var(--shift-mono); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--shift-amber-strong); }
.scs-card h2 { margin: 8px 0 6px; font-size: 24px; font-weight: 800; color: var(--shift-text); letter-spacing: -0.02em; }
.scs-card p { margin: 0 auto 18px; color: var(--shift-text-2); font-size: 14px; line-height: 1.55; max-width: 440px; }
.scs-feats { list-style: none; padding: 0; margin: 0 auto 18px; display: inline-flex; flex-direction: column; gap: 8px; text-align: left; }
.scs-feats li { display: flex; align-items: center; gap: 8px; color: var(--shift-text-2); font-size: 13px; }
.scs-feats li svg { color: var(--shift-ok); flex-shrink: 0; }
.scs-foundation { display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 999px;
  background: var(--shift-ok-soft); color: var(--shift-ok); font-size: 11.5px; font-weight: 600; }
</style>
