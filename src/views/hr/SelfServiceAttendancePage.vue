<template>
  <div class="ss-attendance">
    <header class="page-header">
      <div class="header-title">
        <div class="title-icon"><Fingerprint :size="28" /></div>
        <div>
          <h1>My Attendance</h1>
          <p class="header-subtitle">Coming in Phase 2 — Time Management</p>
        </div>
      </div>
    </header>

    <div class="phase-banner">
      <Info :size="16" />
      <div>
        <strong>Phase 2 will activate this page.</strong>
        <span>
          You will be able to punch in/out (web, mobile, or geofence), view your history,
          regularize missed punches, and see overtime totals. The backend models, routes, and
          shift/roster engine arrive together in Phase 2.
        </span>
      </div>
    </div>

    <section class="preview-grid">
      <div class="preview-card">
        <div class="card-head"><Clock :size="16" /> <span>Today</span></div>
        <div class="today-status">—</div>
        <div class="muted">Awaiting Phase 2 wiring</div>
      </div>
      <div class="preview-card">
        <div class="card-head"><CalendarClock :size="16" /> <span>This Month</span></div>
        <div class="stats-row">
          <div><span class="stat-num">—</span><span class="stat-key">Present</span></div>
          <div><span class="stat-num">—</span><span class="stat-key">Leave</span></div>
          <div><span class="stat-num">—</span><span class="stat-key">WFH</span></div>
        </div>
      </div>
      <div class="preview-card">
        <div class="card-head"><History :size="16" /> <span>Recent Punches</span></div>
        <p class="muted">Your last 7 days of in/out timings will appear here.</p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { Fingerprint, Info, Clock, CalendarClock, History } from 'lucide-vue-next'
</script>

<style scoped>
.ss-attendance { padding: 32px 40px; max-width: 1100px; margin: 0 auto; }
.page-header { margin-bottom: 20px; }
.header-title { display: flex; align-items: flex-start; gap: 16px; }
.title-icon {
  width: 48px; height: 48px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  color: #a5b4fc;
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

.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}
.preview-card {
  background: rgba(26, 26, 28, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 20px;
  min-height: 130px;
}
.card-head {
  display: flex; align-items: center; gap: 8px;
  color: #8e8e93;
  font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.5px;
  margin-bottom: 12px;
}
.today-status {
  font-size: 28px; font-weight: 700; color: #38383a;
}
.muted { color: #6b6b70; font-size: 12px; }
.stats-row { display: flex; gap: 18px; }
.stats-row div { display: flex; flex-direction: column; }
.stat-num { font-size: 22px; font-weight: 700; color: #38383a; }
.stat-key { font-size: 11px; color: #8e8e93; text-transform: uppercase; }
</style>
