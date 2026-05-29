<template>
  <section class="att-daily">
    <Motion as="header" class="daily-banner"
      :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }"
    >
      <span class="banner-glow" />
      <div class="banner-text">
        <span class="att-eyebrow"><span class="att-eyebrow-dot" />Floor roster</span>
        <h2 class="banner-title">
          <span>Daily</span><span class="banner-divider">·</span><span>Attendance</span>
        </h2>
        <p class="banner-sub">Every employee, every punch, every shift — for any date. Status, geo, biometric, hours — all on one row.</p>
      </div>
      <div class="banner-aside">
        <CompactDatePicker v-model="filterDate" placeholder="Pick a date" class="daily-date-picker" />
        <input type="search" v-model="filterQ" placeholder="Search name or code…" class="att-input att-search" @keyup.enter="reload" />
        <button class="onb-btn-ghost" @click="reload" :disabled="loading"><RefreshCw :size="13" />Refresh</button>
      </div>
    </Motion>

    <!-- Break-time watch — surfaces employees over their shift's break cap -->
    <AttBreakAnomaliesBanner ref="bran" :date="filterDate" />

    <div class="daily-table" v-if="rows.length || loading">
      <header class="daily-row daily-row-head">
        <span>Employee</span><span>Status</span><span>In</span><span>Out</span><span>Hours</span><span>Late</span><span>Source</span><span>Geo</span><span class="th-actions">Actions</span>
      </header>
      <Motion v-for="(r, i) in rows" :key="r.id" as="div" class="daily-row"
        :initial="{ opacity: 0, x: -8 }" :animate="{ opacity: 1, x: 0 }"
        :transition="{ duration: 0.34, delay: 0.03 * i, ease: [0.22, 1, 0.36, 1] }"
      >
        <div class="emp-cell">
          <span class="emp-avatar">{{ initials(r.employee_name) }}</span>
          <div class="emp-text">
            <div class="emp-name">{{ r.employee_name || '—' }}</div>
            <div class="emp-code">{{ r.employee_code || r.department || '' }}</div>
          </div>
        </div>
        <div><AttStatusPill :status="r.status" /></div>
        <div class="onb-mono">{{ formatTime(r.check_in_time) }}</div>
        <div class="onb-mono">{{ formatTime(r.check_out_time) }}</div>
        <div class="onb-mono">{{ (r.working_hours || 0).toFixed(2) }}h</div>
        <div class="late-cell" :class="{ late: r.late_minutes > 0 }">
          {{ r.late_minutes ? `${r.late_minutes}m` : '—' }}
        </div>
        <div class="source-cell">
          <component :is="iconForSource(r.source)" :size="12" /> {{ r.source }}
        </div>
        <div class="geo-cell" :class="{ verified: r.geo_verified, flagged: r.is_flagged }">
          <MapPin :size="12" />
          {{ r.geo_verified ? 'Verified' : (r.is_flagged ? 'Flagged' : '—') }}
        </div>
        <div class="row-actions">
          <button v-if="!r.check_in_time"
            class="row-btn punch-in"
            :disabled="punchingId === r.id"
            @click="adminPunch(r, 'IN')"
            title="Mark present (on behalf)"
          ><Fingerprint :size="11" /> Punch in</button>
          <button v-else-if="!r.check_out_time"
            class="row-btn punch-out"
            :disabled="punchingId === r.id"
            @click="adminPunch(r, 'OUT')"
            title="Clock out (on behalf)"
          ><LogOut :size="11" /> Punch out</button>
          <button v-else class="row-btn ghost" disabled>—</button>
        </div>
      </Motion>
      <AttEmptyState
        v-if="!rows.length && !loading"
        tone="gold"
        :icon="Fingerprint"
        title="No attendance records for this date"
        sub="Punches roll up here as employees check in throughout the day. Pick a different date or wait for the floor to start logging in."
        meta="Live · auto-refresh every minute"
      />
    </div>

    <div class="daily-pager" v-if="totalPages > 1">
      <button class="onb-btn-ghost" :disabled="page <= 1" @click="page--; reload()">← Prev</button>
      <span>Page {{ page }} / {{ totalPages }}</span>
      <button class="onb-btn-ghost" :disabled="page >= totalPages" @click="page++; reload()">Next →</button>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { Motion } from 'motion-v'
import { RefreshCw, MapPin, Fingerprint, MousePointer2, Smartphone, Globe, Server, LogOut } from 'lucide-vue-next'
import AttStatusPill from '../components/AttStatusPill.vue'
import AttEmptyState from '../components/AttEmptyState.vue'
import AttBreakAnomaliesBanner from '../components/AttBreakAnomaliesBanner.vue'
import CompactDatePicker from '@/components/ui/CompactDatePicker.vue'
import { fetchTodayAttendance } from '../composables/useAttendance'
import { adminPunchOnBehalf } from '../composables/useAttendance'
import { useToast } from 'vue-toastification'

const emit = defineEmits(['refresh-stats'])
const toast = useToast()

const filterDate = ref(new Date().toISOString().slice(0, 10))
const filterQ = ref('')
const rows = ref([])
const loading = ref(false)
const page = ref(1)
const limit = ref(25)
const totalPages = ref(1)
const punchingId = ref(null)

// CompactDatePicker is v-model only (no @change event) — watch instead.
watch(filterDate, () => reload())

const adminPunch = async (row, type) => {
  punchingId.value = row.id
  try {
    // Pass the row's date so the backend routes past-date OUT punches through
    // the orphan-finalizer instead of refusing with "Not clocked in".
    await adminPunchOnBehalf(row.employee_id, type, filterDate.value)
    toast.success(type === 'IN' ? `Punched in ${row.employee_name || ''}` : `Punched out ${row.employee_name || ''}`)
    await reload()
    emit('refresh-stats')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Punch failed')
  } finally {
    punchingId.value = null
  }
}

const bran = ref(null)

const reload = async () => {
  loading.value = true
  try {
    const data = await fetchTodayAttendance({
      date: filterDate.value, q: filterQ.value || undefined,
      page: page.value, limit: limit.value,
    })
    rows.value = data.items || []
    totalPages.value = data.total_pages || 1
    // Refresh the break-anomaly banner too — finalize-on-list may have
    // updated break_hours for any newly auto-closed rows.
    if (bran.value?.reload) bran.value.reload()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load attendance')
  } finally { loading.value = false }
}
onMounted(reload)

const initials = (n) => (n || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'
const formatTime = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
const iconForSource = (s) => ({
  BIOMETRIC: Fingerprint, MANUAL: MousePointer2, MOBILE: Smartphone,
  WEB: Globe, KIOSK: Server, SYSTEM: Server,
}[s] || Globe)
</script>

<style scoped>
@import '../../../../styles/attendance-theme.css';

.att-daily { display: flex; flex-direction: column; gap: 16px; padding-top: 18px; }

.daily-banner {
  position: relative; overflow: hidden;
  padding: 22px 24px;
  border-radius: 20px;
  background:
    radial-gradient(120% 100% at 100% 0%, rgba(20, 184, 166, 0.12), transparent 65%),
    var(--att-glass);
  border: var(--att-glass-stroke);
  display: grid; grid-template-columns: 1fr auto; gap: 18px;
  backdrop-filter: var(--att-glass-blur);
  -webkit-backdrop-filter: var(--att-glass-blur);
}
.banner-glow {
  position: absolute; top: -40%; right: -10%; width: 60%; height: 200%;
  background: radial-gradient(50% 50% at 50% 50%, rgba(234, 179, 8, 0.22), transparent 70%);
  filter: blur(50px);
  animation: att-aurora 14s ease-in-out infinite;
  pointer-events: none;
}
.banner-text { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.att-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 1.8px;
  text-transform: uppercase; color: var(--att-teal-100);
}
.att-eyebrow-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--att-orange-200);
  animation: att-live-pulse 2.2s ease-in-out infinite;
}
.banner-title {
  margin: 4px 0 0; font-size: 28px; font-weight: 800; letter-spacing: -0.02em;
  background: var(--att-gradient-hero);
  background-size: 200% 200%;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: att-title-shimmer 7s ease-in-out infinite;
  display: inline-flex; gap: 8px; align-items: baseline;
}
.banner-divider { color: var(--hr-text-dim); -webkit-text-fill-color: var(--hr-text-dim); font-weight: 400; }
.banner-sub { margin: 6px 0 0; font-size: 12.5px; color: var(--hr-text-muted); line-height: 1.5; }
.banner-aside { display: flex; flex-wrap: wrap; gap: 8px; align-self: flex-start; justify-content: flex-end; align-items: center; }

.att-input {
  background: rgba(8, 14, 18, 0.55);
  border: 1px solid rgba(20, 184, 166, 0.22);
  color: var(--hr-text);
  border-radius: 10px; padding: 8px 12px;
  font: inherit; font-size: 12px;
  color-scheme: dark;
}
.att-search { min-width: 220px; }
.att-input:focus {
  border-color: var(--att-teal-200);
  outline: none;
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.15);
}

/* Table */
.daily-table {
  display: flex; flex-direction: column;
  background:
    radial-gradient(80% 60% at 100% 0%, rgba(20, 184, 166, 0.08), transparent 65%),
    linear-gradient(180deg, rgba(8, 14, 18, 0.45), rgba(8, 14, 18, 0.65));
  border: 1px solid rgba(20, 184, 166, 0.22);
  border-radius: 18px;
  backdrop-filter: var(--att-glass-blur);
  overflow: hidden;
  box-shadow: 0 24px 60px -28px rgba(0, 0, 0, 0.55);
}
.daily-row {
  display: grid; grid-template-columns: 2fr 0.9fr 0.65fr 0.65fr 0.6fr 0.5fr 0.7fr 0.8fr 0.9fr;
  gap: 12px; align-items: center;
  padding: 14px 18px;
  border-top: 1px solid rgba(20, 184, 166, 0.10);
  font-size: 12.5px; color: var(--hr-text);
  transition: background .18s var(--att-spring);
}
.daily-row:first-child { border-top: 0; }
.daily-row-head {
  font-size: 9.5px; font-weight: 800; letter-spacing: 1.4px;
  text-transform: uppercase; color: var(--hr-text-muted);
  background: rgba(20, 184, 166, 0.05);
  padding: 12px 18px;
}
.daily-row:not(.daily-row-head):hover {
  background: rgba(20, 184, 166, 0.05);
}

.emp-cell { display: inline-flex; align-items: center; gap: 10px; min-width: 0; }
.emp-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #fde68a 0%, #fbbf24 50%, #fb923c 100%);
  color: #1f1408;
  font-size: 11px; font-weight: 800; letter-spacing: 0.3px;
  border: 1.6px solid rgba(251, 191, 36, 0.65);
  box-shadow:
    0 6px 18px -6px rgba(234, 88, 12, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.30);
  flex-shrink: 0;
}
.emp-text { display: flex; flex-direction: column; min-width: 0; }
.emp-name { font-weight: 700; color: var(--hr-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.emp-code { font-size: 10.5px; font-family: var(--hr-mono); color: var(--hr-text-muted); }

.onb-mono { font-family: var(--hr-mono); font-variant-numeric: tabular-nums; }

.late-cell { font-family: var(--hr-mono); }
.late-cell.late { color: var(--att-yellow-200); font-weight: 700; }

.source-cell {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10.5px; color: var(--hr-text-muted);
  text-transform: uppercase; letter-spacing: 0.4px;
}
.source-cell svg { color: var(--att-teal-100); }

.geo-cell {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10.5px;
  padding: 3px 8px; border-radius: 999px;
  background: rgba(148, 163, 184, 0.12);
  color: var(--hr-text-muted);
}
.geo-cell.verified { background: var(--att-teal-soft); color: var(--att-teal-100); }
.geo-cell.flagged { background: var(--att-status-absent-bg); color: var(--att-status-absent-fg); }

.daily-empty { padding: 40px; text-align: center; color: var(--hr-text-dim); font-size: 13px; }

/* Row actions */
.th-actions { text-align: right; }
.row-actions { display: flex; gap: 6px; justify-content: flex-end; }
.row-btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 5px 10px;
  border-radius: 8px;
  font: inherit; font-size: 10.5px; font-weight: 700; letter-spacing: 0.3px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all .2s var(--att-spring);
}
.row-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.row-btn.punch-in {
  background: linear-gradient(135deg, var(--att-teal-200), var(--att-teal-400));
  color: #fff;
  box-shadow: 0 6px 16px -6px rgba(20, 184, 166, 0.55);
}
.row-btn.punch-in:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 22px -8px rgba(20, 184, 166, 0.65); }
.row-btn.punch-out {
  background: linear-gradient(135deg, #fbbf24 0%, #fb923c 55%, #ea580c 100%);
  color: #1f1408;
  border: 1px solid rgba(251, 191, 36, 0.65);
  box-shadow:
    0 6px 16px -6px rgba(234, 88, 12, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.30);
  font-weight: 800;
}
.row-btn.punch-out:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 22px -8px rgba(234, 88, 12, 0.75); filter: brightness(1.05); }
.row-btn.ghost { background: rgba(148, 163, 184, 0.10); color: var(--hr-text-dim); border-color: rgba(148, 163, 184, 0.16); }

.daily-pager {
  display: flex; gap: 10px; justify-content: center; align-items: center;
  font-size: 11.5px; color: var(--hr-text-muted);
}

/* ════════════ LIGHT THEME ════════════ */
[data-theme="light"] .att-eyebrow { color: var(--att-teal-500); }
[data-theme="light"] .banner-title {
  background: linear-gradient(110deg, var(--att-teal-400), var(--att-yellow-500), var(--att-orange-500));
  -webkit-background-clip: text; background-clip: text;
}
[data-theme="light"] .att-input {
  background: rgba(255, 250, 240, 0.92);
  border-color: rgba(13, 148, 136, 0.36);
  color: var(--hr-text);
  color-scheme: light;
}
[data-theme="light"] .att-input:focus {
  border-color: var(--att-teal-400);
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.18);
}
[data-theme="light"] .daily-banner {
  background:
    radial-gradient(120% 100% at 100% 0%, rgba(13, 148, 136, 0.12), transparent 65%),
    rgba(255, 250, 240, 0.85);
  border-color: rgba(13, 148, 136, 0.28);
}
[data-theme="light"] .daily-table {
  background:
    radial-gradient(80% 60% at 100% 0%, rgba(13, 148, 136, 0.10), transparent 65%),
    rgba(255, 250, 240, 0.92);
  border-color: rgba(13, 148, 136, 0.28);
  box-shadow: 0 24px 60px -28px rgba(40, 25, 10, 0.20);
}
[data-theme="light"] .daily-row-head {
  background: rgba(13, 148, 136, 0.10);
}
[data-theme="light"] .daily-row { border-top-color: rgba(13, 148, 136, 0.14); }
[data-theme="light"] .daily-row:not(.daily-row-head):hover {
  background: rgba(13, 148, 136, 0.06);
}
[data-theme="light"] .emp-avatar {
  background: linear-gradient(135deg, #f59e0b 0%, #ea580c 55%, #c2410c 100%);
  color: #fff;
  border-color: rgba(180, 83, 9, 0.55);
  box-shadow:
    0 6px 18px -6px rgba(180, 83, 9, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
  text-shadow: 0 1px 0 rgba(120, 53, 15, 0.40);
}
[data-theme="light"] .row-btn.punch-out {
  background: linear-gradient(135deg, #fbbf24 0%, #ea580c 55%, #9a3412 100%);
  color: #fff;
  border-color: rgba(180, 83, 9, 0.65);
  text-shadow: 0 1px 0 rgba(120, 53, 15, 0.40);
  box-shadow:
    0 6px 16px -6px rgba(180, 83, 9, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.30);
}
[data-theme="light"] .row-btn.punch-in {
  background: linear-gradient(135deg, var(--att-teal-400) 0%, var(--att-teal-500) 100%);
  color: #fff;
  text-shadow: 0 1px 0 rgba(15, 118, 110, 0.45);
}
[data-theme="light"] .late-cell.late { color: var(--att-yellow-700); }
[data-theme="light"] .geo-cell { background: rgba(71, 85, 105, 0.10); }
[data-theme="light"] .geo-cell.verified { background: rgba(13, 148, 136, 0.14); color: var(--att-teal-500); }
[data-theme="light"] .geo-cell.flagged { background: rgba(194, 65, 12, 0.16); color: var(--att-orange-500); }
[data-theme="light"] .source-cell svg { color: var(--att-teal-500); }
</style>
