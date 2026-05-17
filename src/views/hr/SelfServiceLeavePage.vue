<template>
  <div class="ss-leave">
    <header class="page-header">
      <div class="header-title">
        <div class="title-icon"><CalendarOff :size="28" /></div>
        <div>
          <h1>My Leave</h1>
          <p class="header-subtitle">Coming in Phase 2 — Time Management</p>
        </div>
      </div>
    </header>

    <div class="phase-banner">
      <Info :size="16" />
      <div>
        <strong>Phase 2 will activate this page.</strong>
        <span>
          You will be able to apply for leave, view balances by leave type
          (Casual / Sick / Earned / Maternity / Paternity / Comp-off / LOP),
          track approval status, and cancel pending requests. Leave types,
          accrual rules, and approval workflows arrive in Phase 2.
        </span>
      </div>
    </div>

    <section class="balance-grid">
      <div v-for="t in previewBalances" :key="t.name" class="balance-card">
        <div class="card-head">
          <component :is="t.icon" :size="16" />
          <span>{{ t.name }}</span>
        </div>
        <div class="balance-row">
          <span class="balance-num">—</span>
          <span class="balance-key">/ — days</span>
        </div>
        <div class="muted">{{ t.note }}</div>
      </div>
    </section>

    <section class="history-card">
      <div class="card-head">
        <History :size="16" />
        <span>Recent Leave Requests</span>
      </div>
      <p class="muted">Your applied, approved, and rejected leave requests will appear here once the Leave module is live.</p>
    </section>
  </div>
</template>

<script setup>
import { CalendarOff, Info, History, Sun, Stethoscope, Plane, Baby, Coffee } from 'lucide-vue-next'

const previewBalances = [
  { name: 'Casual Leave', icon: Sun, note: 'Annual quota, monthly accrual' },
  { name: 'Sick Leave', icon: Stethoscope, note: 'Medical certificate after 3 days' },
  { name: 'Earned Leave', icon: Plane, note: 'Carry-forward eligible' },
  { name: 'Maternity / Paternity', icon: Baby, note: 'As per company policy' },
  { name: 'Comp-off', icon: Coffee, note: 'Earned by working on holidays' }
]
</script>

<style scoped>
.ss-leave { padding: 32px 40px; max-width: 1100px; margin: 0 auto; }

.page-header { margin-bottom: 20px; }
.header-title { display: flex; align-items: flex-start; gap: 16px; }
.title-icon {
  width: 48px; height: 48px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  color: #fb7185;
}
.header-title h1 { font-size: 26px; font-weight: 700; color: #f5f5f5; margin-bottom: 4px; }
.header-subtitle { color: #8e8e93; font-size: 13px; }

.phase-banner {
  display: flex; gap: 10px; align-items: flex-start;
  background: rgba(251, 191, 36, 0.06);
  border: 1px solid rgba(251, 191, 36, 0.2);
  color: #fbbf24;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 13px;
  margin-bottom: 20px;
  line-height: 1.5;
}
.phase-banner strong { color: #fde68a; display: block; margin-bottom: 4px; }
.phase-banner span { color: #c5c5c8; }

.balance-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}
.balance-card {
  background: rgba(26, 26, 28, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 18px;
}
.card-head {
  display: flex; align-items: center; gap: 8px;
  color: #8e8e93;
  font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.5px;
  margin-bottom: 10px;
}
.balance-row { display: flex; align-items: baseline; gap: 6px; margin-bottom: 6px; }
.balance-num { font-size: 26px; font-weight: 700; color: #38383a; }
.balance-key { color: #6b6b70; font-size: 12px; }
.muted { color: #6b6b70; font-size: 12px; line-height: 1.5; }

.history-card {
  background: rgba(26, 26, 28, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 20px;
}
</style>
