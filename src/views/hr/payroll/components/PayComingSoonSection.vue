<template>
  <div class="pcs-wrap">
    <Motion class="pcs-card" as="div"
      :initial="{ opacity: 0, y: 24, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
      :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
      <div class="pcs-orbit" aria-hidden="true">
        <span class="ring r1" /><span class="ring r2" /><span class="ring r3" />
        <div class="pcs-icon"><component :is="meta.icon" :size="30" /></div>
      </div>
      <span class="pcs-eyebrow">{{ meta.phase }}</span>
      <h2>{{ meta.title }}</h2>
      <p>{{ meta.blurb }}</p>
      <ul class="pcs-feats">
        <li v-for="f in meta.features" :key="f"><Check :size="13" /> {{ f }}</li>
      </ul>
      <div class="pcs-foundation">
        <ShieldCheck :size="13" />
        Data model is already in place — this surface activates without a rebuild.
      </div>
    </Motion>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import {
  Check, ShieldCheck, BadgePercent, Landmark, FileSpreadsheet, ScrollText, TrendingUp,
} from 'lucide-vue-next'

const props = defineProps({ sectionKey: { type: String, required: true } })

const META = {
  revisions: { title: 'Salary Revisions', icon: TrendingUp, phase: 'Phase B — Compensation',
    blurb: 'Annual increments, promotions, grade changes and market adjustments with full effective-date history.',
    features: ['Increment & promotion workflows', 'Retroactive & future-dated revisions', 'Revision audit trail'] },
  arrears: { title: 'Arrears', icon: BadgePercent, phase: 'Phase B — Compensation',
    blurb: 'Backdated salary differences from delayed increments, promotions and attendance corrections.',
    features: ['Auto-computed arrear windows', 'Posts into the next pay run', 'Per-employee arrear ledger'] },
  bonus: { title: 'Bonus Management', icon: BadgePercent, phase: 'Phase B — Compensation',
    blurb: 'Festival, performance, joining, retention and project-completion bonuses with approval gates.',
    features: ['Configurable bonus types', 'Taxable / non-taxable handling', 'Bulk grant + approval'] },
  incentives: { title: 'Incentives', icon: BadgePercent, phase: 'Phase B — Compensation',
    blurb: 'Sales, recruitment, attendance and referral incentives — formula-driven or KPI-based.',
    features: ['Formula & KPI engines', 'Manual entry override', 'Feeds the pay run automatically'] },
  'variable-pay': { title: 'Variable Pay', icon: BadgePercent, phase: 'Phase B — Compensation',
    blurb: 'Performance pay, commissions and quarterly incentives keyed to KPI scores.',
    features: ['KPI-linked payout', 'Quarterly / monthly cadence', 'Commission tiers'] },
  tax: { title: 'Tax Computation', icon: Landmark, phase: 'Phase C — Statutory',
    blurb: 'Old vs new regime projection with 80C / 80D / HRA exemption and standard deduction.',
    features: ['Annual tax projection', 'Regime comparison', 'Declaration capture'] },
  tds: { title: 'TDS Management', icon: Landmark, phase: 'Phase C — Statutory',
    blurb: 'Monthly & annual TDS tracking, PAN validation and balance-TDS reconciliation.',
    features: ['Monthly / annual TDS', 'PAN validation', 'Form-16 ready data'] },
  statutory: { title: 'Statutory Compliance', icon: Landmark, phase: 'Phase C — Statutory',
    blurb: 'EPF, ESI, Professional Tax and LWF returns with government-format exports.',
    features: ['Auto rate calculations', 'Government report formats', 'Filing support'] },
  'bank-files': { title: 'Bank Transfer Files', icon: FileSpreadsheet, phase: 'Phase C — Payout',
    blurb: 'NEFT / bank-specific salary disbursement files generated straight from a released run.',
    features: ['CSV / XLSX / NEFT formats', 'Bank-specific layouts', 'Per-batch export'] },
  reports: { title: 'Payroll Reports', icon: FileSpreadsheet, phase: 'Phase C — Reports',
    blurb: 'Payroll register, salary sheet, cost-centre, variance and compliance reports.',
    features: ['Monthly register & salary sheet', 'Cost & variance analysis', 'PDF / Excel exports'] },
  'audit-logs': { title: 'Payroll Audit Logs', icon: ScrollText, phase: 'Phase C — System',
    blurb: 'Every salary change, pay-run transition, tax edit and payslip download — already being recorded.',
    features: ['Full transition history', 'Config-change tracking', 'Payslip access log'] },
}
const meta = computed(() => META[props.sectionKey] || {
  title: 'Coming soon', icon: ScrollText, phase: 'Roadmap', blurb: 'This surface is on the payroll roadmap.', features: [],
})
</script>

<style scoped>
.pcs-wrap { display: grid; place-items: center; min-height: 60vh; padding: 32px; }
.pcs-card { max-width: 540px; text-align: center; padding: 40px 36px;
  background: var(--pay-glass); backdrop-filter: var(--pay-glass-blur);
  border: 1px solid var(--pay-border); border-radius: 26px;
  box-shadow: 0 30px 80px -40px rgba(0,0,0,0.6); }
.pcs-orbit { position: relative; width: 120px; height: 120px; margin: 0 auto 18px; }
.pcs-orbit .ring { position: absolute; inset: 0; border-radius: 50%; border: 1px solid var(--pay-border);
  animation: pay-glow-breathe 4s ease-in-out infinite; }
.ring.r2 { inset: 12px; opacity: 0.7; animation-delay: 0.5s; }
.ring.r3 { inset: 24px; opacity: 0.45; animation-delay: 1s; }
.pcs-icon { position: absolute; inset: 36px; border-radius: 50%; display: grid; place-items: center;
  color: var(--pay-treasury); background: radial-gradient(circle, rgba(251,191,36,0.18), transparent 70%); }
.pcs-eyebrow { font-family: var(--pay-mono); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--pay-treasury); }
.pcs-card h2 { margin: 8px 0 6px; font-size: 24px; font-weight: 800; color: var(--pay-text); letter-spacing: -0.02em; }
.pcs-card p { margin: 0 auto 18px; color: var(--pay-text-2); font-size: 14px; line-height: 1.55; max-width: 420px; }
.pcs-feats { list-style: none; padding: 0; margin: 0 auto 18px; display: inline-flex; flex-direction: column;
  gap: 8px; text-align: left; }
.pcs-feats li { display: flex; align-items: center; gap: 8px; color: var(--pay-text-2); font-size: 13px; }
.pcs-feats li svg { color: var(--pay-net); flex-shrink: 0; }
.pcs-foundation { display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 999px;
  background: var(--pay-net-soft); color: var(--pay-net); font-size: 11.5px; font-weight: 600; }
</style>
