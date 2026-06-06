<template>
  <div v-tilt="{ max: 6, scale: 1.015 }" class="bpass" role="button" tabindex="0"
    @click="$emit('open')" @keyup.enter="$emit('open')">
    <!-- gold-foil sweep -->
    <span class="foil" aria-hidden="true" />

    <!-- left stub: period + net -->
    <div class="stub" data-tilt-depth="14">
      <span class="eyebrow">Net credited</span>
      <PayMoneyValue class="stub-net" tone="net" :value="slip?.net_pay" />
      <div class="stub-period">
        <strong>{{ monthLabel(slip?.period_month) }}</strong>
        <span>{{ slip?.period_year }}</span>
      </div>
      <span class="stub-tag">PAY STATEMENT</span>
    </div>

    <!-- perforated tear-line -->
    <div class="tear" aria-hidden="true">
      <span class="notch top" />
      <span class="notch bottom" />
    </div>

    <!-- right: payslip no + figures + barcode -->
    <div class="counter" data-tilt-depth="22">
      <div class="row top-row">
        <div>
          <span class="mini-lbl">Payslip no.</span>
          <span class="psno">{{ slip?.payslip_no || '—' }}</span>
        </div>
        <PayStatusChip v-if="slip?.status" :status="slip.status" />
      </div>
      <div class="figures">
        <div class="fig">
          <span class="mini-lbl">Gross</span>
          <PayMoneyValue class="fig-v" :value="slip?.gross_earnings" short />
        </div>
        <div class="fig">
          <span class="mini-lbl">Deductions</span>
          <PayMoneyValue class="fig-v" tone="deduction" :value="slip?.total_deductions" short />
        </div>
      </div>
      <div class="barcode" aria-hidden="true">
        <span v-for="(w, i) in bars" :key="i" class="bar" :style="{ width: w + 'px' }" />
      </div>
      <span class="boarding">VIEW STATEMENT →</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import PayMoneyValue from '../payroll/components/PayMoneyValue.vue'
import PayStatusChip from '../payroll/components/PayStatusChip.vue'
import { monthLabel } from '@/composables/usePayroll'

const props = defineProps({ slip: { type: Object, default: null } })
defineEmits(['open'])

// deterministic faux barcode seeded by payslip no
const bars = computed(() => {
  const seed = (props.slip?.payslip_no || 'FC-PAYSLIP').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return Array.from({ length: 42 }, (_, i) => 1 + ((seed * (i + 3)) % 5))
})
</script>

<style scoped>
.bpass {
  position: relative; display: grid; grid-template-columns: 1fr 26px 1.25fr;
  min-height: 188px; border-radius: 20px; overflow: hidden; cursor: pointer;
  background: var(--pay-surface-2); border: 1px solid var(--pay-border);
  box-shadow: 0 30px 70px -40px rgba(0,0,0,0.75), inset 0 0 0 1px rgba(251,191,36,0.04);
  transition: box-shadow 0.4s var(--pay-ease);
}
.bpass:hover { box-shadow: 0 40px 90px -38px rgba(0,0,0,0.85), 0 0 0 1px rgba(251,191,36,0.22); }
.bpass:focus-visible { outline: 2px solid var(--pay-mint); outline-offset: 3px; }

.foil {
  position: absolute; inset: 0; z-index: 4; pointer-events: none;
  background: linear-gradient(110deg, transparent 35%, rgba(253,230,138,0.30) 50%, transparent 65%);
  transform: translateX(-120%);
}
.bpass:hover .foil { animation: pay-foil-sweep 0.95s var(--pay-ease); }

/* left stub */
.stub {
  position: relative; z-index: 2; padding: 20px 22px; display: flex; flex-direction: column; gap: 4px;
  background: var(--pay-grad-hero), linear-gradient(160deg, rgba(184,134,11,0.16), transparent 70%);
}
.eyebrow { font-family: var(--pay-mono); font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--pay-treasury); }
.stub-net { font-size: clamp(26px, 4vw, 34px); line-height: 1.05; }
.stub-period { margin-top: auto; display: flex; align-items: baseline; gap: 8px; }
.stub-period strong { font-size: 20px; color: var(--pay-text); }
.stub-period span { font-family: var(--pay-mono); font-size: 13px; color: var(--pay-text-muted); }
.stub-tag { font-family: var(--pay-mono); font-size: 9px; letter-spacing: 0.22em; color: var(--pay-text-muted); margin-top: 6px; }

/* tear line */
.tear {
  position: relative; z-index: 2;
  border-left: 2px dashed var(--pay-border);
  margin: 14px 0; justify-self: center;
}
.notch { position: absolute; left: -8px; width: 16px; height: 16px; border-radius: 50%;
  background: var(--pay-canvas); border: 1px solid var(--pay-border); }
.notch.top { top: -22px; }
.notch.bottom { bottom: -22px; }

/* right counter */
.counter { position: relative; z-index: 2; padding: 20px 22px; display: flex; flex-direction: column; gap: 12px; }
.row { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.mini-lbl { display: block; font-family: var(--pay-mono); font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--pay-text-muted); }
.psno { font-family: var(--pay-mono); font-size: 15px; font-weight: 700; color: var(--pay-text); letter-spacing: 0.02em; }
.figures { display: flex; gap: 24px; }
.fig-v { font-size: 16px; }
.barcode { display: flex; align-items: flex-end; gap: 2px; height: 38px; margin-top: auto; }
.bar { display: block; height: 100%; background: var(--pay-text-2); opacity: 0.55; border-radius: 1px; }
.boarding { font-family: var(--pay-mono); font-size: 10px; letter-spacing: 0.18em; color: var(--pay-treasury); }

@media (max-width: 560px) {
  .bpass { grid-template-columns: 1fr; }
  .tear { display: none; }
  .counter { border-top: 2px dashed var(--pay-border); }
}

[data-theme="light"] .bpass {
  box-shadow: 0 24px 56px -36px rgba(120,80,20,0.40), inset 0 0 0 1px rgba(184,134,11,0.06);
}
[data-theme="light"] .notch { background: var(--pay-canvas); }
[data-theme="light"] .bar { opacity: 0.42; }
</style>
