<template>
  <section class="lv-soon">
    <Motion class="soon-card"
      :initial="{ opacity: 0, y: 12, scale: 0.98 }"
      :animate="{ opacity: 1, y: 0, scale: 1 }"
      :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }"
    >
      <div class="soon-glow" aria-hidden="true" />
      <div class="soon-orbit" aria-hidden="true">
        <span class="orbit-ring r1" /><span class="orbit-ring r2" /><span class="orbit-ring r3" />
      </div>
      <div class="soon-icon"><component :is="meta.icon" :size="38" /></div>
      <div class="soon-eyebrow leave-mono"><span class="dot" />Phase 2 · Coming soon</div>
      <h2 class="soon-title">{{ meta.title }}</h2>
      <p class="soon-body">{{ meta.body }}</p>
      <ul class="soon-features">
        <li v-for="f in meta.features" :key="f"><span class="ftick" /> {{ f }}</li>
      </ul>
    </Motion>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Coffee, IndianRupee, BarChart3, ScrollText } from 'lucide-vue-next'

const props = defineProps({ sectionKey: { type: String, required: true } })

const META = {
  'comp-off': {
    icon: Coffee, title: 'Compensatory Off',
    body: 'When an employee works on a Holiday or Weekly-Off (≥ half-shift), a Comp-Off credit is auto-generated. Admin override stays available.',
    features: [
      'Auto-detect from daily_rollup',
      'Admin manual grant with reason',
      'Expiry tracking (configurable per policy)',
      'Pending → Approved → Used → Expired',
    ],
  },
  'encashment': {
    icon: IndianRupee, title: 'Leave Encashment',
    body: 'Convert unused Earned Leave into salary. Default formula stored in system_settings.leave_encashment_formula — payroll hookup ships in Phase 3.',
    features: [
      'Encashment request workflow',
      'Configurable per-policy max-encash days',
      'Calculation preview (basic × days / 30)',
      'Payroll posting (Phase 3)',
    ],
  },
  'reports': {
    icon: BarChart3, title: 'Leave Reports',
    body: 'Branded PDFs (WeasyPrint) + colour-coded Excel workbooks (xlsxwriter), mirroring the Attendance Reports Studio.',
    features: [
      'Employee leave report',
      'Department-wise leave report',
      'Leave liability report',
      'Comp-Off + Encashment reports',
    ],
  },
  'audit-logs': {
    icon: ScrollText, title: 'Leave Audit Logs',
    body: 'Read-only view of every LEAVE_* action recorded in hr_attendance_logs — requests, approvals, balance adjustments, carry-forward.',
    features: [
      'Filter by action, employee, date',
      'Drill-down to the originating request',
      'CSV export',
      'Tamper-proof append-only ledger',
    ],
  },
}

const meta = computed(() => META[props.sectionKey] || {
  icon: Coffee, title: 'Coming soon', body: 'This module is on the Phase 2 roadmap.', features: [],
})
</script>

<style scoped>
.lv-soon { padding: 24px 4px; }
.soon-card {
  position: relative;
  display: flex; flex-direction: column; gap: 12px;
  padding: 36px 32px 32px;
  border-radius: 22px;
  background: var(--leave-grad-hero);
  border: 1px solid var(--hr-border);
  overflow: hidden; isolation: isolate;
}
.soon-glow {
  position: absolute; inset: -30% -10% auto -10%;
  height: 200%;
  background: radial-gradient(40% 40% at 50% 10%, rgba(251, 191, 36, 0.28), transparent 70%);
  filter: blur(50px); animation: leave-glow-breathe 6s ease-in-out infinite;
  z-index: -1;
}
.soon-orbit { position: absolute; right: -60px; top: -40px; width: 360px; height: 360px; z-index: -1; opacity: 0.5; }
.orbit-ring {
  position: absolute; inset: 0;
  border: 1px dashed rgba(251, 191, 36, 0.32);
  border-radius: 50%;
  animation: leave-orb-spin 60s linear infinite;
}
.orbit-ring.r2 { inset: 22%; animation: leave-orb-spin-r 40s linear infinite; border-color: rgba(250, 204, 21, 0.32); }
.orbit-ring.r3 { inset: 44%; animation: leave-orb-spin 28s linear infinite; border-color: rgba(251, 146, 60, 0.28); }

.soon-icon {
  display: inline-grid; place-items: center;
  width: 64px; height: 64px; border-radius: 18px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.25), rgba(251, 146, 60, 0.18));
  border: 1px solid rgba(251, 191, 36, 0.42);
  color: #fef3c7;
  box-shadow: 0 10px 30px -10px rgba(251, 191, 36, 0.45);
}
[data-theme="light"] .soon-icon { color: #78350f; }
.soon-eyebrow {
  display: inline-flex; align-items: center; gap: 6px; width: max-content;
  font-size: 10px; font-weight: 800;
  letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--leave-approved);
}
.soon-eyebrow .dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--leave-approved); box-shadow: 0 0 8px var(--leave-approved);
  animation: leave-eyebrow-pulse 2s ease-in-out infinite;
}
.soon-title {
  margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.02em;
  color: var(--hr-text);
}
.soon-body {
  margin: 0; max-width: 620px; font-size: 13px; line-height: 1.55;
  color: var(--hr-text-secondary);
}
.soon-features {
  list-style: none; margin: 8px 0 0; padding: 0;
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 18px;
}
.soon-features li {
  display: flex; align-items: center; gap: 8px;
  font-size: 12.5px; color: var(--hr-text-secondary);
}
.ftick {
  display: inline-grid; place-items: center;
  width: 14px; height: 14px; border-radius: 4px;
  background: var(--leave-approved-soft);
  border: 1px solid color-mix(in srgb, var(--leave-approved) 45%, transparent);
}
.ftick::before {
  content: '✓'; font-size: 9px; font-weight: 800; color: var(--leave-approved);
}
@media (max-width: 720px) {
  .soon-features { grid-template-columns: 1fr; }
}
</style>
