<template>
  <div class="sl ex-card ex-grain">
    <div class="sl-cols">
      <!-- earnings -->
      <div class="sl-col">
        <h4 class="sl-h earn"><TrendingUp :size="13" /> Earnings</h4>
        <Motion v-for="(ln, i) in earnLines" :key="ln.key" as="div" class="sl-row"
          :initial="reduced ? false : { opacity: 0, x: -10 }" :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.4, delay: 0.04 * i, ease: [0.16,1,0.3,1] }">
          <div class="sl-row-top">
            <span class="sl-lbl">{{ ln.label }}<i v-if="ln.hint">{{ ln.hint }}</i></span>
            <b class="ex-mono">{{ fmtINR(ln.val) }}</b>
          </div>
          <span class="sl-bar"><span class="sl-bar-fill earn" :style="{ width: pct(ln.val, maxEarn) + '%' }" /></span>
        </Motion>
        <div class="sl-total earn"><span>Total earnings</span><b class="ex-mono">{{ fmtINR(num(s.total_earnings)) }}</b></div>
      </div>

      <!-- recoveries -->
      <div class="sl-col">
        <h4 class="sl-h rec"><TrendingDown :size="13" /> Recoveries</h4>
        <Motion v-for="(ln, i) in recLines" :key="ln.key" as="div" class="sl-row"
          :initial="reduced ? false : { opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.4, delay: 0.04 * i, ease: [0.16,1,0.3,1] }">
          <div class="sl-row-top">
            <span class="sl-lbl">{{ ln.label }}<i v-if="ln.hint">{{ ln.hint }}</i></span>
            <b class="ex-mono">{{ fmtINR(ln.val) }}</b>
          </div>
          <span class="sl-bar"><span class="sl-bar-fill rec" :style="{ width: pct(ln.val, maxRec) + '%' }" /></span>
        </Motion>
        <div class="sl-total rec"><span>Total recoveries</span><b class="ex-mono">{{ fmtINR(num(s.total_recoveries)) }}</b></div>
      </div>
    </div>

    <!-- provenance -->
    <div v-if="provenance.length" class="sl-prov">
      <span class="sl-prov-h"><Sigma :size="12" /> How this was computed</span>
      <div class="sl-prov-chips">
        <span v-for="(p, i) in provenance" :key="i" class="sl-chip" :class="p.tone">
          <component :is="p.icon" :size="11" /> {{ p.text }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import {
  TrendingUp, TrendingDown, Sigma, CalendarCheck, Palmtree, Award, Receipt,
  CalendarClock, Plane, AlertTriangle,
} from 'lucide-vue-next'
import { fmtINR } from '@/composables/useExit'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({ s: { type: Object, required: true } })
const reduced = prefersReduced()
const num = (v) => Number(v || 0)
const pct = (v, max) => (max > 0 ? Math.max(0, Math.min(100, Math.round((num(v) / max) * 100))) : 0)
const snap = computed(() => props.s?.computation_snapshot || {})

const earnLines = computed(() => {
  const s = props.s
  const ps = snap.value.pending_salary || {}
  const le = snap.value.leave_encashment || {}
  let psHint = ''
  if (ps.basis === 'attendance_paid_days') psHint = `${num(ps.paid_days)}/${num(ps.month_days)} paid days`
  else if (ps.basis === 'already_paid_via_payslip') psHint = 'paid via payslip'
  else if (ps.basis === 'none') psHint = 'no LWD set'
  return [
    { key: 'pending_salary', label: 'Pending salary', val: num(s.pending_salary), hint: psHint },
    { key: 'leave', label: 'Leave encashment', val: num(s.leave_encashment_amount), hint: num(s.leave_encashment_days) ? `${num(s.leave_encashment_days)}d` : '' },
    { key: 'incentives', label: 'Incentives', val: num(s.incentives_amount), hint: '' },
    { key: 'bonus', label: 'Bonus', val: num(s.bonus_amount), hint: '' },
    { key: 'reimb', label: 'Reimbursements', val: num(s.reimbursements_amount), hint: num(s.reimbursements_amount) ? 'approved claims' : '' },
    { key: 'gratuity', label: 'Gratuity', val: num(s.gratuity_amount), hint: '' },
    { key: 'other_e', label: 'Other earnings', val: num(s.other_earnings), hint: '' },
  ]
})
const recLines = computed(() => {
  const s = props.s
  const adv = snap.value.advance_recovery || {}
  return [
    { key: 'notice', label: 'Notice recovery', val: num(s.notice_recovery), hint: '' },
    { key: 'loan', label: 'Loan recovery', val: num(s.loan_recovery), hint: '' },
    { key: 'advance', label: 'Advance recovery', val: num(s.advance_recovery), hint: num(adv.count) ? `${num(adv.count)} travel advance(s)` : '' },
    { key: 'asset', label: 'Asset recovery', val: num(s.asset_recovery), hint: num(s.asset_recovery) ? 'from clearance' : '' },
    { key: 'other_d', label: 'Other deductions', val: num(s.other_deductions), hint: '' },
  ]
})
const maxEarn = computed(() => Math.max(...earnLines.value.map(l => l.val), 1))
const maxRec = computed(() => Math.max(...recLines.value.map(l => l.val), 1))

const provenance = computed(() => {
  const out = []
  const ps = snap.value.pending_salary || {}
  if (ps.basis === 'attendance_paid_days') {
    const paid = num(ps.paid_days)
    out.push({ icon: CalendarCheck, tone: paid > 0 ? 'ok' : 'warn',
      text: `Salary · ${paid}/${num(ps.month_days)} paid days (attendance-gated)` })
  } else if (ps.basis === 'already_paid_via_payslip') {
    out.push({ icon: CalendarCheck, tone: 'mut', text: 'Salary · exit month already paid via payslip' })
  } else if (ps.basis === 'none') {
    out.push({ icon: CalendarClock, tone: 'mut', text: 'Salary · last-working-date not set' })
  }
  const le = snap.value.leave_encashment || {}
  if (num(le.days) > 0) out.push({ icon: Palmtree, tone: 'ok', text: `${num(le.days)}d earned leave @ ${fmtINR(num(le.per_day))}/day` })
  const gr = snap.value.gratuity || {}
  if (gr.eligible) out.push({ icon: Award, tone: 'ok', text: `Gratuity · ${num(gr.years)}y of service` })
  else if (gr.years) out.push({ icon: Award, tone: 'mut', text: `Gratuity · ${num(gr.years)}y (below minimum)` })
  const nr = snap.value.notice_recovery || {}
  if (nr.mode === 'shortfall') {
    out.push({ icon: CalendarClock, tone: num(nr.shortfall_days) > 0 ? 'warn' : 'ok',
      text: num(nr.shortfall_days) > 0 ? `Notice · ${num(nr.shortfall_days)}d shortfall (${num(nr.served)}/${num(nr.required)} served)` : `Notice · fully served (${num(nr.served)}/${num(nr.required)}d)` })
  } else if (nr.mode === 'buyout') {
    out.push({ icon: CalendarClock, tone: 'warn', text: `Notice · ${num(nr.shortfall_days)}d buyout` })
  }
  const adv = snap.value.advance_recovery || {}
  if (num(adv.count) > 0) out.push({ icon: Plane, tone: 'warn', text: `${num(adv.count)} outstanding travel advance(s)` })
  if (num(snap.value.asset_recovery) > 0) out.push({ icon: AlertTriangle, tone: 'warn', text: `${fmtINR(num(snap.value.asset_recovery))} asset/clearance recovery` })
  return out
})
</script>

<style scoped>
.sl { padding: 18px; }
.sl-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
.sl-h { display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; margin: 0 0 12px; }
.sl-h.earn { color: var(--ex-cleared); } .sl-h.rec { color: var(--ex-blocked); }
.sl-row { padding: 7px 0 8px; border-bottom: 1px dashed var(--ex-border); }
.sl-row-top { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.sl-lbl { font-size: 12.5px; color: var(--ex-text-secondary); }
.sl-lbl i { font-style: normal; font-size: 9.5px; color: var(--ex-text-dim); margin-left: 6px; padding: 1px 6px; border-radius: 999px;
  background: color-mix(in srgb, var(--ex-text) 6%, transparent); }
.sl-row b { font-size: 12.5px; color: var(--ex-text); white-space: nowrap; }
.sl-bar { display: block; height: 4px; margin-top: 6px; border-radius: 3px; overflow: hidden; background: color-mix(in srgb, var(--ex-text) 6%, transparent); }
.sl-bar-fill { position: relative; display: block; height: 100%; border-radius: 3px; overflow: hidden; transition: width 0.9s var(--ex-spring); }
.sl-bar-fill::after { content: ''; position: absolute; inset: 0; transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.45), transparent); animation: sl-shimmer 3.4s ease-in-out infinite; }
@keyframes sl-shimmer { 0%, 55% { transform: translateX(-100%); } 85%, 100% { transform: translateX(220%); } }
.sl-bar-fill.earn { background: linear-gradient(90deg, color-mix(in srgb, var(--ex-cleared) 55%, transparent), var(--ex-cleared)); }
.sl-bar-fill.rec { background: linear-gradient(90deg, color-mix(in srgb, var(--ex-blocked) 55%, transparent), var(--ex-blocked)); }
.sl-total { display: flex; justify-content: space-between; margin-top: 12px; padding-top: 9px; font-size: 13px; font-weight: 820; border-top: 2px solid var(--ex-border-strong); }
.sl-total.earn { color: var(--ex-cleared); } .sl-total.rec { color: var(--ex-blocked); }

.sl-prov { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--ex-border); }
.sl-prov-h { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ex-text-muted); margin-bottom: 9px; }
.sl-prov-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.sl-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 600;
  background: color-mix(in srgb, var(--ex-text) 6%, transparent); border: 1px solid var(--ex-border); color: var(--ex-text-secondary); }
.sl-chip.ok { color: var(--ex-cleared); background: color-mix(in srgb, var(--ex-cleared) 12%, transparent); border-color: color-mix(in srgb, var(--ex-cleared) 26%, transparent); }
.sl-chip.warn { color: var(--ex-ember); background: color-mix(in srgb, var(--ex-ember) 13%, transparent); border-color: color-mix(in srgb, var(--ex-ember) 28%, transparent); }
.sl-chip.mut { color: var(--ex-text-muted); }

@media (max-width: 760px) { .sl-cols { grid-template-columns: 1fr; gap: 14px; } }
@media (prefers-reduced-motion: reduce) { .sl-bar-fill { transition: none; } .sl-bar-fill::after { animation: none; display: none; } }
</style>
