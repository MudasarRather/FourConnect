<template>
  <section class="att-exc" data-anim="att-exc">
    <!-- ═══════════════════ HERO BANNER ═══════════════════ -->
    <Motion as="header" class="att-section-banner tone-warm exc-banner"
      :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }"
    >
      <span class="att-banner-glow" />
      <span class="exc-banner-grid" aria-hidden="true" />

      <!-- Anomaly radar motif on the right -->
      <div class="exc-radar" aria-hidden="true">
        <span class="exc-radar-ring r1" />
        <span class="exc-radar-ring r2" />
        <span class="exc-radar-ring r3" />
        <span class="exc-radar-crosshair x" />
        <span class="exc-radar-crosshair y" />
        <span class="exc-radar-sweep" />
        <span class="exc-radar-blip b1" />
        <span class="exc-radar-blip b2" />
        <span class="exc-radar-blip b3" />
        <span class="exc-radar-core">
          <AlertOctagon :size="16" />
        </span>
      </div>

      <div class="att-banner-text">
        <span class="att-banner-eyebrow">
          <span class="att-banner-eyebrow-dot" />
          Anomaly intelligence · Live triage · Audit signals
        </span>
        <h2 class="att-banner-title">
          <span>Exceptions</span>
          <span class="att-banner-divider">·</span>
          <span>Violations</span>
        </h2>
        <p class="att-banner-sub">
          Flagged punches, fake-GPS suspicion, excessive late patterns, unauthorised WFH and shift violations
          triaged from the audit + flagged-row signals. <strong>Tap a bucket</strong> to filter the feed.
        </p>
      </div>

      <div class="att-banner-aside">
        <Motion as="button" class="exc-btn exc-btn-ghost"
          :disabled="loading"
          :whileHover="!loading ? { y: -1, scale: 1.02 } : {}"
          :whileTap="!loading ? { scale: 0.96 } : {}"
          @click="reload"
        >
          <RefreshCw :size="13" :class="{ spinning: loading }" />
          {{ loading ? 'Refreshing…' : 'Refresh' }}
        </Motion>
      </div>
    </Motion>

    <!-- ═══════════════════ TOTALS RIBBON ═══════════════════ -->
    <Motion as="div" class="exc-ribbon"
      :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.45, delay: 0.08 }"
    >
      <div class="ribbon-cell">
        <span class="ribbon-label"><Activity :size="11" />Total scanned</span>
        <span class="ribbon-value">{{ rows.length }}</span>
      </div>
      <span class="ribbon-divider" />
      <div class="ribbon-cell">
        <span class="ribbon-label"><AlertTriangle :size="11" />Flagged today</span>
        <span class="ribbon-value tone-red">{{ flaggedToday.length }}</span>
      </div>
      <span class="ribbon-divider" />
      <div class="ribbon-cell">
        <span class="ribbon-label"><ShieldAlert :size="11" />High severity</span>
        <span class="ribbon-value tone-orange">{{ highSeverityCount }}</span>
      </div>
      <span class="ribbon-divider" />
      <div class="ribbon-cell">
        <span class="ribbon-label"><Sparkles :size="11" />Clean rate</span>
        <span class="ribbon-value tone-teal">{{ cleanRate }}%</span>
      </div>
    </Motion>

    <!-- ═══════════════════ KPI BUCKET STRIP ═══════════════════ -->
    <div class="exc-grid">
      <Motion v-for="(b, i) in buckets" :key="b.key" as="article"
        :class="['exc-bucket', `tone-${b.tone}`, { active: bucketFilter === b.key, alert: b.count > 0 }]"
        :initial="{ opacity: 0, y: 14 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.42, delay: 0.08 * i + 0.1, ease: [0.22, 1, 0.36, 1] }"
        :whileHover="{ y: -3 }"
        @click="toggleBucket(b.key)"
      >
        <span class="bucket-scan" aria-hidden="true" />
        <span class="bucket-rule" aria-hidden="true" />
        <span class="bucket-aurora" aria-hidden="true" />

        <header class="bucket-head">
          <span class="bucket-eyebrow">
            <component :is="b.icon" :size="11" />
            <span>{{ b.eyebrow }}</span>
          </span>
          <span v-if="b.count > 0" class="bucket-badge">live</span>
        </header>

        <Motion as="span" class="bucket-count"
          :initial="{ opacity: 0, y: 8 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.45, delay: 0.18 + 0.08 * i }"
        >{{ b.count }}</Motion>

        <h3 class="bucket-name">{{ b.title }}</h3>
        <p class="bucket-desc">{{ b.desc }}</p>

        <div class="bucket-foot">
          <span class="bucket-foot-dot" />
          <span class="bucket-foot-label">{{ bucketFilter === b.key ? 'Filtering' : 'Tap to filter' }}</span>
          <ArrowUpRight :size="11" class="bucket-foot-arrow" />
        </div>
      </Motion>
    </div>

    <!-- ═══════════════════ FILTER PILL ROW ═══════════════════ -->
    <Motion as="div" class="exc-pill-row"
      :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.4, delay: 0.36 }"
    >
      <span class="exc-pill-label"><Filter :size="11" />FILTER</span>
      <button v-for="f in pillFilters" :key="f.key || 'all'"
        :class="['exc-pill', `tone-${f.tone}`, { active: bucketFilter === f.key }]"
        @click="bucketFilter = f.key"
      >
        <span class="exc-pill-dot" />
        {{ f.label }}
        <span class="exc-pill-count">{{ f.count }}</span>
      </button>
    </Motion>

    <!-- ═══════════════════ ANOMALY FEED ═══════════════════ -->
    <Motion as="article" class="exc-feed"
      :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }"
    >
      <header class="exc-feed-head">
        <h3>
          <AlertTriangle :size="13" />
          {{ feedHeading }}
          <span class="exc-feed-count">{{ filteredRows.length }}</span>
        </h3>
        <span class="exc-feed-live">
          <span class="exc-feed-live-dot" />Live audit
        </span>
      </header>

      <ul class="exc-list" v-if="filteredRows.length">
        <Motion v-for="(r, i) in filteredRows" :key="r.id" as="li"
          :class="['exc-row', `is-${rowSeverity(r)}`]"
          :initial="{ opacity: 0, x: -10 }"
          :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.34, delay: 0.03 * i, ease: [0.22, 1, 0.36, 1] }"
          :whileHover="{ x: 3 }"
        >
          <span class="exc-row-aurora" aria-hidden="true" />
          <span class="exc-row-rail" aria-hidden="true" />

          <!-- Severity icon block -->
          <div class="exc-icon">
            <span class="exc-icon-ring" />
            <component :is="rowIcon(r)" :size="14" />
          </div>

          <!-- Identity + flags -->
          <div class="exc-main">
            <div class="exc-name">
              {{ r.employee_name || 'Unknown' }}
              <span v-if="r.employee_code" class="exc-code">{{ r.employee_code }}</span>
            </div>
            <div class="exc-meta">
              <span v-if="r.status" :class="['exc-flag', r.status?.toLowerCase()]">
                <span class="exc-flag-dot" />{{ r.status }}
              </span>
              <span v-if="r.geo_verified === false" class="exc-flag is-geo">
                <MapPin :size="9" />Geo unverified
              </span>
              <span v-if="r.late_minutes > 30" class="exc-flag is-late">
                <Clock4 :size="9" />{{ r.late_minutes }}m late
              </span>
              <span v-if="r.is_flagged" class="exc-flag is-flagged">
                <Flag :size="9" />Flagged
              </span>
            </div>
          </div>

          <!-- Time stamp -->
          <div class="exc-time-block">
            <span class="exc-time-label">Punched in</span>
            <span class="exc-time exc-mono">{{ formatTime(r.check_in_time) }}</span>
          </div>
        </Motion>
      </ul>

      <!-- Empty state -->
      <Motion v-else as="div" class="exc-empty"
        :initial="{ opacity: 0, scale: 0.94 }" :animate="{ opacity: 1, scale: 1 }"
        :transition="{ duration: 0.5 }"
      >
        <span class="exc-empty-aurora" />
        <div class="exc-empty-illu">
          <span class="exc-empty-ring r1" />
          <span class="exc-empty-ring r2" />
          <span class="exc-empty-ring r3" />
          <Motion class="exc-empty-icon"
            :animate="{ rotate: [-3, 3] }"
            :transition="{ duration: 4.2, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' }"
          >
            <ShieldCheck :size="38" />
          </Motion>
        </div>
        <h3>{{ emptyHeading }}</h3>
        <p>{{ emptyMessage }}</p>
        <div class="exc-empty-meta">
          <span class="exc-empty-meta-dot" />Floor is clean · auto-refresh on next punch
        </div>
      </Motion>
    </Motion>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  RefreshCw, AlertTriangle, MapPin, CheckCircle2, Clock4, Home, ScanFace, FileWarning,
  AlertOctagon, Flag, ShieldAlert, ShieldCheck, Filter, Activity, Sparkles, ArrowUpRight,
} from 'lucide-vue-next'
import { fetchTodayAttendance, fetchCorrections } from '../composables/useAttendance'
import { useToast } from 'vue-toastification'

defineEmits([])
const toast = useToast()

const rows = ref([])
const pendingCorrections = ref(0)
const loading = ref(false)
const bucketFilter = ref(null)

const reload = async () => {
  if (loading.value) return
  loading.value = true
  try {
    const today = new Date().toISOString().slice(0, 10)
    const [att, cor] = await Promise.all([
      fetchTodayAttendance({ date: today, limit: 200 }),
      fetchCorrections({ status: 'PENDING' }),
    ])
    rows.value = att.items || []
    pendingCorrections.value = (cor.items || []).length
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load')
  } finally {
    loading.value = false
  }
}
onMounted(reload)

const flaggedToday = computed(() =>
  rows.value.filter(r => r.is_flagged || r.geo_verified === false || (r.late_minutes || 0) > 30)
)

const highSeverityCount = computed(() =>
  rows.value.filter(r => (r.late_minutes || 0) > 60 || r.geo_verified === false).length
)

const cleanRate = computed(() => {
  if (!rows.value.length) return 100
  const clean = rows.value.length - flaggedToday.value.length
  return Math.round((clean / rows.value.length) * 100)
})

const buckets = computed(() => {
  const ab = rows.value.filter(r => r.status === 'ABSENT').length
  const lt = rows.value.filter(r => (r.late_minutes || 0) > 30).length
  const gf = rows.value.filter(r => r.is_flagged || r.geo_verified === false).length
  const mp = rows.value.filter(r =>
    r.check_in_time && !r.check_out_time &&
    new Date(r.check_in_time).getDate() !== new Date().getDate()
  ).length
  return [
    { key: 'missing', eyebrow: 'PUNCHES', title: 'Missing punches', desc: 'In-time without matching out-time.', count: mp, icon: ScanFace,    tone: 'orange' },
    { key: 'geo',     eyebrow: 'LOCATION',  title: 'Geo anomalies',  desc: 'Outside-radius or no-GPS punches.', count: gf, icon: MapPin,      tone: 'amber' },
    { key: 'late',    eyebrow: 'TIMING',    title: 'Excessive late', desc: '>30 min past grace window.',         count: lt, icon: Clock4,      tone: 'red' },
    { key: 'corr',    eyebrow: 'INBOX',     title: 'Pending corrections', desc: 'Awaiting approval.',            count: pendingCorrections.value, icon: FileWarning, tone: 'cyan' },
    { key: 'absent',  eyebrow: 'ROSTER',    title: 'Unauthorised absent', desc: 'No WFH, no leave, no punch.',   count: ab, icon: AlertTriangle, tone: 'purple' },
  ]
})

const pillFilters = computed(() => {
  const byKey = Object.fromEntries(buckets.value.map(b => [b.key, b.count]))
  return [
    { key: null,      label: 'All',     tone: 'gold',   count: flaggedToday.value.length },
    { key: 'geo',     label: 'Geo',     tone: 'amber',  count: byKey.geo || 0 },
    { key: 'late',    label: 'Late',    tone: 'red',    count: byKey.late || 0 },
    { key: 'missing', label: 'Missing', tone: 'orange', count: byKey.missing || 0 },
    { key: 'absent',  label: 'Absent',  tone: 'purple', count: byKey.absent || 0 },
    { key: 'corr',    label: 'Corrections', tone: 'cyan', count: byKey.corr || 0 },
  ]
})

const filteredRows = computed(() => {
  const f = bucketFilter.value
  if (!f) return flaggedToday.value
  if (f === 'geo')     return rows.value.filter(r => r.is_flagged || r.geo_verified === false)
  if (f === 'late')    return rows.value.filter(r => (r.late_minutes || 0) > 30)
  if (f === 'missing') return rows.value.filter(r =>
    r.check_in_time && !r.check_out_time &&
    new Date(r.check_in_time).getDate() !== new Date().getDate()
  )
  if (f === 'absent') return rows.value.filter(r => r.status === 'ABSENT')
  if (f === 'corr')   return []
  return flaggedToday.value
})

const feedHeading = computed(() => {
  if (!bucketFilter.value) return "Today's flagged punches"
  const map = { geo: 'Geo anomalies', late: 'Excessive late', missing: 'Missing punches', absent: 'Unauthorised absent', corr: 'Pending corrections' }
  return map[bucketFilter.value] || 'Flagged punches'
})

const emptyHeading = computed(() => {
  if (bucketFilter.value === 'corr') return 'No pending corrections'
  if (bucketFilter.value) return 'No anomalies in this bucket'
  return 'No flagged punches today'
})
const emptyMessage = computed(() => {
  if (bucketFilter.value === 'corr') return 'Every correction request has been triaged. The inbox is empty.'
  return 'Every punch is clean — geo verified, on-time, and within shift. The floor looks healthy.'
})

const toggleBucket = (key) => {
  bucketFilter.value = bucketFilter.value === key ? null : key
}

const rowSeverity = (r) => {
  if (r.geo_verified === false) return 'high'
  if ((r.late_minutes || 0) > 60) return 'high'
  if ((r.late_minutes || 0) > 30) return 'med'
  if (r.is_flagged) return 'med'
  return 'low'
}
const rowIcon = (r) => {
  if (r.geo_verified === false) return MapPin
  if ((r.late_minutes || 0) > 30) return Clock4
  if (r.status === 'ABSENT') return AlertTriangle
  return Flag
}

const formatTime = (iso) => {
  if (!iso) return '—:—'
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
</script>

<style scoped>
@import '../../../../styles/attendance-theme.css';

.att-exc {
  display: flex; flex-direction: column; gap: 16px;
  padding-top: 18px;
}

/* ═══════════════════════════════════════════════════════════════════════
   BANNER MOTIF — anomaly radar
   ═══════════════════════════════════════════════════════════════════════ */
.exc-banner { position: relative; overflow: hidden; }
.exc-banner-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(251, 146, 60, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(251, 146, 60, 0.06) 1px, transparent 1px);
  background-size: 24px 24px;
  pointer-events: none; z-index: 0;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.45));
}
[data-theme="light"] .exc-banner-grid {
  background-image:
    linear-gradient(rgba(180, 83, 9, 0.10) 1px, transparent 1px),
    linear-gradient(90deg, rgba(180, 83, 9, 0.10) 1px, transparent 1px);
}

/* Radar cluster — 3 concentric rings + sweeping line + blip dots */
.exc-radar {
  position: absolute;
  right: 36px; top: 50%;
  transform: translateY(-50%);
  width: 156px; height: 156px;
  z-index: 1; pointer-events: none;
}
.exc-radar-ring {
  position: absolute; left: 50%; top: 50%;
  border-radius: 50%; transform: translate(-50%, -50%);
  border: 1.4px dashed rgba(251, 146, 60, 0.42);
}
.exc-radar-ring.r1 { width: 156px; height: 156px; animation: att-ring-rotate 38s linear infinite; }
.exc-radar-ring.r2 { width: 108px; height: 108px; animation: att-ring-rotate 26s linear infinite reverse; border-color: rgba(239, 68, 68, 0.38); border-style: solid; opacity: 0.55; }
.exc-radar-ring.r3 { width: 62px;  height: 62px;  animation: att-ring-rotate 18s linear infinite; border-color: rgba(251, 191, 36, 0.45); }
[data-theme="light"] .exc-radar-ring.r1 { border-color: rgba(194, 65, 12, 0.50); }
[data-theme="light"] .exc-radar-ring.r2 { border-color: rgba(153, 27, 27, 0.42); }
[data-theme="light"] .exc-radar-ring.r3 { border-color: rgba(180, 83, 9, 0.48); }

.exc-radar-crosshair {
  position: absolute; left: 50%; top: 50%;
  background: rgba(251, 146, 60, 0.30);
  transform: translate(-50%, -50%);
}
.exc-radar-crosshair.x { width: 156px; height: 1px; }
.exc-radar-crosshair.y { width: 1px; height: 156px; }
[data-theme="light"] .exc-radar-crosshair { background: rgba(194, 65, 12, 0.35); }

.exc-radar-sweep {
  position: absolute; left: 50%; top: 50%;
  width: 78px; height: 78px;
  margin-left: -78px; margin-top: -39px;
  background: conic-gradient(from 0deg at 100% 50%,
    rgba(251, 146, 60, 0) 0deg,
    rgba(251, 146, 60, 0.35) 30deg,
    rgba(239, 68, 68, 0.55) 50deg,
    rgba(251, 146, 60, 0) 60deg);
  transform-origin: 100% 50%;
  animation: exc-radar-sweep 4.2s linear infinite;
  border-radius: 78px 0 0 78px;
  filter: blur(0.3px);
}
[data-theme="light"] .exc-radar-sweep {
  background: conic-gradient(from 0deg at 100% 50%,
    rgba(194, 65, 12, 0) 0deg,
    rgba(194, 65, 12, 0.30) 30deg,
    rgba(153, 27, 27, 0.42) 50deg,
    rgba(194, 65, 12, 0) 60deg);
}
@keyframes exc-radar-sweep {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* Anomaly blip dots */
.exc-radar-blip {
  position: absolute;
  width: 6px; height: 6px; border-radius: 50%;
  background: #ef4444;
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.7);
  opacity: 0;
  animation: exc-blip 4.2s linear infinite;
}
.exc-radar-blip.b1 { left: calc(50% + 32px); top: calc(50% - 22px); animation-delay: 0.6s; }
.exc-radar-blip.b2 { left: calc(50% - 38px); top: calc(50% + 14px); animation-delay: 1.8s; background: #fb923c; box-shadow: 0 0 10px rgba(251, 146, 60, 0.7); }
.exc-radar-blip.b3 { left: calc(50% + 18px); top: calc(50% + 32px); animation-delay: 3.0s; background: #fbbf24; box-shadow: 0 0 10px rgba(251, 191, 36, 0.7); }
[data-theme="light"] .exc-radar-blip { background: #991b1b; box-shadow: 0 0 10px rgba(153, 27, 27, 0.5); }
[data-theme="light"] .exc-radar-blip.b2 { background: #c2410c; box-shadow: 0 0 10px rgba(194, 65, 12, 0.5); }
[data-theme="light"] .exc-radar-blip.b3 { background: #b45309; box-shadow: 0 0 10px rgba(180, 83, 9, 0.5); }
@keyframes exc-blip {
  0%, 10%  { opacity: 0; transform: scale(0.6); }
  20%, 30% { opacity: 1; transform: scale(1.4); }
  50%, 100% { opacity: 0; transform: scale(0.6); }
}

.exc-radar-core {
  position: absolute; left: 50%; top: 50%;
  width: 30px; height: 30px;
  margin-left: -15px; margin-top: -15px;
  border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: radial-gradient(closest-side, rgba(254, 215, 170, 0.25), rgba(20, 16, 14, 0.65));
  border: 1.5px solid rgba(251, 146, 60, 0.65);
  color: #fb923c;
  box-shadow: 0 0 18px rgba(251, 146, 60, 0.45);
  animation: exc-core-pulse 2.4s ease-in-out infinite;
}
[data-theme="light"] .exc-radar-core {
  background: radial-gradient(closest-side, rgba(255, 255, 255, 0.96), rgba(254, 215, 170, 0.55));
  border-color: rgba(194, 65, 12, 0.70);
  color: #c2410c;
  box-shadow: 0 0 18px rgba(194, 65, 12, 0.35);
}
@keyframes exc-core-pulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 18px rgba(251, 146, 60, 0.45); }
  50%      { transform: scale(1.08); box-shadow: 0 0 24px rgba(251, 146, 60, 0.70); }
}

.exc-banner .att-banner-text { padding-right: 200px; }
.exc-banner .att-banner-sub strong { color: #fcd34d; font-weight: 700; }
[data-theme="light"] .exc-banner .att-banner-sub strong { color: #b45309; }

/* Refresh button local to banner */
.exc-btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 12px; font-weight: 700; letter-spacing: 0.2px;
  cursor: pointer;
  transition: transform .22s var(--att-spring), border-color .22s, color .22s, background .22s;
  font-family: inherit;
}
.exc-btn-ghost {
  background: rgba(20, 16, 14, 0.55);
  border: 1px solid rgba(251, 146, 60, 0.42);
  color: #fde68a;
}
.exc-btn-ghost:hover {
  border-color: rgba(251, 146, 60, 0.78);
  color: #fff7ed;
  background: rgba(28, 20, 14, 0.78);
}
[data-theme="light"] .exc-btn-ghost {
  background: rgba(255, 250, 240, 0.88);
  border-color: rgba(194, 65, 12, 0.45);
  color: #7c2d12;
}
[data-theme="light"] .exc-btn-ghost:hover {
  border-color: rgba(194, 65, 12, 0.72);
  background: rgba(255, 250, 240, 1);
  color: #431407;
}
.exc-btn .spinning { animation: exc-spin 1.1s linear infinite; }
@keyframes exc-spin { to { transform: rotate(360deg); } }

/* ═══════════════════════════════════════════════════════════════════════
   TOTALS RIBBON — quick-glance counts
   ═══════════════════════════════════════════════════════════════════════ */
.exc-ribbon {
  display: flex; align-items: stretch;
  gap: 0;
  padding: 12px 6px;
  border-radius: 14px;
  background:
    radial-gradient(120% 100% at 0% 50%, rgba(251, 146, 60, 0.10), transparent 60%),
    var(--att-glass);
  border: 1px solid rgba(251, 146, 60, 0.34);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 8px 22px -16px rgba(0, 0, 0, 0.40),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
[data-theme="light"] .exc-ribbon {
  background:
    radial-gradient(120% 100% at 0% 50%, rgba(194, 65, 12, 0.10), transparent 60%),
    rgba(255, 250, 240, 0.92);
  border-color: rgba(194, 65, 12, 0.36);
  box-shadow:
    0 8px 22px -16px rgba(40, 25, 10, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.ribbon-cell {
  flex: 1;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 4px 14px;
  min-width: 0;
}
.ribbon-label {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 1.4px;
  text-transform: uppercase;
  color: var(--hr-text-muted);
}
[data-theme="light"] .ribbon-label { color: #6b5840; }
.ribbon-label svg { color: #fcd34d; }
[data-theme="light"] .ribbon-label svg { color: #b45309; }
.ribbon-value {
  font-size: 22px; font-weight: 900;
  letter-spacing: -0.4px;
  font-variant-numeric: tabular-nums;
  color: var(--hr-text);
  line-height: 1.05;
}
.ribbon-value.tone-red { color: #ef4444; }
.ribbon-value.tone-orange { color: #fb923c; }
.ribbon-value.tone-teal { color: #2dd4bf; }
[data-theme="light"] .ribbon-value.tone-red { color: #991b1b; }
[data-theme="light"] .ribbon-value.tone-orange { color: #c2410c; }
[data-theme="light"] .ribbon-value.tone-teal { color: #0f766e; }
.ribbon-divider {
  width: 1px;
  background: linear-gradient(180deg, transparent, rgba(251, 146, 60, 0.32), transparent);
}
[data-theme="light"] .ribbon-divider {
  background: linear-gradient(180deg, transparent, rgba(194, 65, 12, 0.30), transparent);
}

/* ═══════════════════════════════════════════════════════════════════════
   BUCKET GRID — KPI tiles, click-to-filter
   ═══════════════════════════════════════════════════════════════════════ */
.exc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(218px, 1fr));
  gap: 12px;
}
.exc-bucket {
  position: relative;
  padding: 16px 18px 14px 22px;
  border-radius: 16px;
  background: var(--att-glass);
  border: 1px solid rgba(251, 146, 60, 0.42);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 8px 22px -14px rgba(0, 0, 0, 0.40),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  cursor: pointer;
  isolation: isolate; overflow: hidden;
  transition: border-color .3s, box-shadow .3s, transform .25s var(--att-spring);
  display: flex; flex-direction: column;
}
[data-theme="light"] .exc-bucket {
  background: rgba(255, 250, 240, 0.92);
  border-color: rgba(194, 65, 12, 0.40);
  box-shadow:
    0 8px 22px -14px rgba(40, 25, 10, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.exc-bucket.active {
  border-color: var(--accent, #fb923c);
  box-shadow: 0 22px 44px -20px var(--accent-shadow, rgba(251, 146, 60, 0.55));
}
[data-theme="light"] .exc-bucket.active {
  border-color: var(--accent-light, #c2410c);
  box-shadow: 0 22px 44px -20px var(--accent-shadow-light, rgba(194, 65, 12, 0.45));
}

.bucket-rule {
  position: absolute; left: 0; top: 14px; bottom: 14px;
  width: 3px;
  border-radius: 0 2px 2px 0;
  background: linear-gradient(180deg, var(--accent, #fb923c), transparent);
}
[data-theme="light"] .bucket-rule {
  background: linear-gradient(180deg, var(--accent-light, #c2410c), transparent);
}

.bucket-scan {
  position: absolute; inset: 0;
  background: linear-gradient(115deg, transparent 40%, rgba(255, 255, 255, 0.10) 50%, transparent 60%);
  transform: translateX(-110%);
  pointer-events: none;
  transition: transform 0.85s var(--att-spring);
}
.exc-bucket:hover .bucket-scan { transform: translateX(110%); }
[data-theme="light"] .bucket-scan {
  background: linear-gradient(115deg, transparent 40%, rgba(180, 83, 9, 0.10) 50%, transparent 60%);
}

.bucket-aurora {
  position: absolute; right: -40%; top: -50%;
  width: 80%; height: 200%;
  background: radial-gradient(50% 50% at 50% 50%, var(--accent-glow, rgba(251, 146, 60, 0.30)), transparent 70%);
  filter: blur(40px);
  pointer-events: none;
  opacity: 0.40;
  transition: opacity .3s;
}
.exc-bucket:hover .bucket-aurora { opacity: 0.85; }

.bucket-head {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  position: relative; z-index: 1;
}
.bucket-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9px; font-weight: 800; letter-spacing: 1.4px;
  text-transform: uppercase;
  color: var(--hr-text-muted);
}
[data-theme="light"] .bucket-eyebrow { color: #6b5840; }
.bucket-eyebrow svg { color: var(--accent, #fb923c); }
[data-theme="light"] .bucket-eyebrow svg { color: var(--accent-light, #c2410c); }

.bucket-badge {
  display: inline-flex; padding: 2px 7px;
  border-radius: 6px;
  font-size: 8.5px; letter-spacing: 1.2px;
  font-weight: 800; text-transform: uppercase;
  background: linear-gradient(135deg, var(--accent, #fb923c), var(--accent-deep, #c2410c));
  color: #fff;
  box-shadow: 0 4px 10px -4px var(--accent-shadow, rgba(251, 146, 60, 0.65));
  animation: exc-badge-pulse 2.2s ease-in-out infinite;
}
@keyframes exc-badge-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.07); } }

.bucket-count {
  display: block;
  margin: 10px 0 4px;
  font-size: 34px; font-weight: 900;
  letter-spacing: -0.6px;
  color: var(--accent, #fb923c);
  font-variant-numeric: tabular-nums;
  line-height: 1;
  text-shadow: 0 2px 22px var(--accent-glow, rgba(251, 146, 60, 0.32));
  position: relative; z-index: 1;
}
[data-theme="light"] .bucket-count {
  color: var(--accent-light, #c2410c);
  text-shadow: 0 2px 12px color-mix(in srgb, var(--accent-light, #c2410c) 18%, transparent);
}
.bucket-name {
  margin: 4px 0 0;
  font-size: 13.5px; font-weight: 800;
  color: var(--hr-text);
  letter-spacing: -0.01em;
  position: relative; z-index: 1;
}
.bucket-desc {
  margin: 2px 0 0;
  font-size: 11px; line-height: 1.45;
  color: var(--hr-text-muted);
  position: relative; z-index: 1;
}
.bucket-foot {
  margin-top: 12px;
  display: flex; align-items: center; gap: 6px;
  padding-top: 10px;
  border-top: 1px dashed rgba(251, 146, 60, 0.22);
  position: relative; z-index: 1;
}
[data-theme="light"] .bucket-foot { border-top-color: rgba(194, 65, 12, 0.26); }
.bucket-foot-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--accent, #fb923c);
  box-shadow: 0 0 6px var(--accent-glow, rgba(251, 146, 60, 0.6));
}
[data-theme="light"] .bucket-foot-dot {
  background: var(--accent-light, #c2410c);
}
.bucket-foot-label {
  font-size: 9.5px; font-weight: 700; letter-spacing: 1.1px;
  text-transform: uppercase;
  color: var(--hr-text-muted);
  flex: 1;
}
[data-theme="light"] .bucket-foot-label { color: #6b5840; }
.bucket-foot-arrow {
  color: var(--accent, #fb923c);
  transition: transform .25s var(--att-spring);
}
.exc-bucket:hover .bucket-foot-arrow { transform: translate(2px, -2px); }
[data-theme="light"] .bucket-foot-arrow { color: var(--accent-light, #c2410c); }

/* Tones */
.exc-bucket.tone-red    { --accent: #ef4444; --accent-deep: #b91c1c; --accent-light: #991b1b; --accent-glow: rgba(239, 68, 68, 0.30); --accent-shadow: rgba(185, 28, 28, 0.55); --accent-shadow-light: rgba(153, 27, 27, 0.45); }
.exc-bucket.tone-orange { --accent: #fb923c; --accent-deep: #c2410c; --accent-light: #c2410c; --accent-glow: rgba(251, 146, 60, 0.30); --accent-shadow: rgba(234, 88, 12, 0.55); --accent-shadow-light: rgba(194, 65, 12, 0.45); }
.exc-bucket.tone-amber  { --accent: #fbbf24; --accent-deep: #b45309; --accent-light: #b45309; --accent-glow: rgba(251, 191, 36, 0.30); --accent-shadow: rgba(217, 119, 6, 0.55); --accent-shadow-light: rgba(180, 83, 9, 0.45); }
.exc-bucket.tone-cyan   { --accent: #38bdf8; --accent-deep: #0369a1; --accent-light: #0369a1; --accent-glow: rgba(56, 189, 248, 0.30); --accent-shadow: rgba(3, 105, 161, 0.55); --accent-shadow-light: rgba(3, 105, 161, 0.45); }
.exc-bucket.tone-purple { --accent: #c084fc; --accent-deep: #7c3aed; --accent-light: #6d28d9; --accent-glow: rgba(192, 132, 252, 0.30); --accent-shadow: rgba(124, 58, 237, 0.55); --accent-shadow-light: rgba(109, 40, 217, 0.45); }
.exc-bucket.tone-gold   { --accent: #fcd34d; --accent-deep: #b45309; --accent-light: #b45309; --accent-glow: rgba(252, 211, 77, 0.32); --accent-shadow: rgba(217, 119, 6, 0.55); --accent-shadow-light: rgba(180, 83, 9, 0.45); }

/* ═══════════════════════════════════════════════════════════════════════
   FILTER PILL ROW
   ═══════════════════════════════════════════════════════════════════════ */
.exc-pill-row {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 10px 14px;
  border-radius: 14px;
  background:
    radial-gradient(120% 100% at 100% 50%, rgba(251, 191, 36, 0.08), transparent 60%),
    var(--att-glass);
  border: 1px solid rgba(251, 146, 60, 0.36);
  backdrop-filter: var(--att-glass-blur);
}
[data-theme="light"] .exc-pill-row {
  background:
    radial-gradient(120% 100% at 100% 50%, rgba(180, 83, 9, 0.08), transparent 60%),
    rgba(255, 250, 240, 0.90);
  border-color: rgba(194, 65, 12, 0.38);
}
.exc-pill-label {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 2px 8px 2px 4px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 1.6px;
  text-transform: uppercase;
  color: var(--hr-text-muted);
  border-right: 1px solid rgba(251, 146, 60, 0.30);
  margin-right: 4px;
}
[data-theme="light"] .exc-pill-label { color: #6b5840; border-right-color: rgba(194, 65, 12, 0.30); }
.exc-pill-label svg { color: #fcd34d; }
[data-theme="light"] .exc-pill-label svg { color: #b45309; }

.exc-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 11px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(251, 146, 60, 0.32);
  color: var(--hr-text-muted);
  font: inherit; font-size: 11px; font-weight: 700;
  cursor: pointer;
  transition: transform .22s var(--att-spring), background .22s, color .22s, border-color .22s;
}
.exc-pill:hover { transform: translateY(-1px); color: var(--hr-text); border-color: rgba(251, 146, 60, 0.55); }
.exc-pill.active {
  background: linear-gradient(135deg, color-mix(in srgb, var(--accent, #fb923c) 22%, transparent), color-mix(in srgb, var(--accent, #fb923c) 14%, transparent));
  border-color: var(--accent, #fb923c);
  color: var(--accent, #fb923c);
  box-shadow: 0 8px 18px -10px var(--accent-shadow, rgba(251, 146, 60, 0.60));
}
.exc-pill-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: currentColor;
  opacity: 0.55;
}
.exc-pill.active .exc-pill-dot { opacity: 1; box-shadow: 0 0 6px currentColor; }
.exc-pill-count {
  font-variant-numeric: tabular-nums;
  font-size: 10.5px;
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.32);
  color: inherit;
  font-weight: 800;
}
.exc-pill.active .exc-pill-count { background: color-mix(in srgb, var(--accent, #fb923c) 22%, transparent); }
[data-theme="light"] .exc-pill {
  background: rgba(255, 250, 240, 0.65);
  border-color: rgba(194, 65, 12, 0.34);
  color: #6b5840;
}
[data-theme="light"] .exc-pill:hover { color: var(--hr-text); border-color: rgba(194, 65, 12, 0.55); }
[data-theme="light"] .exc-pill.active {
  background: linear-gradient(135deg, color-mix(in srgb, var(--accent-light, #c2410c) 18%, transparent), color-mix(in srgb, var(--accent-light, #c2410c) 12%, transparent));
  border-color: var(--accent-light, #c2410c);
  color: var(--accent-light, #c2410c);
}
[data-theme="light"] .exc-pill-count { background: rgba(124, 45, 18, 0.10); }
[data-theme="light"] .exc-pill.active .exc-pill-count { background: color-mix(in srgb, var(--accent-light, #c2410c) 18%, transparent); }

.exc-pill.tone-red    { --accent: #ef4444; --accent-light: #991b1b; --accent-shadow: rgba(185, 28, 28, 0.50); }
.exc-pill.tone-orange { --accent: #fb923c; --accent-light: #c2410c; --accent-shadow: rgba(234, 88, 12, 0.50); }
.exc-pill.tone-amber  { --accent: #fbbf24; --accent-light: #b45309; --accent-shadow: rgba(217, 119, 6, 0.50); }
.exc-pill.tone-cyan   { --accent: #38bdf8; --accent-light: #0369a1; --accent-shadow: rgba(3, 105, 161, 0.50); }
.exc-pill.tone-purple { --accent: #c084fc; --accent-light: #6d28d9; --accent-shadow: rgba(124, 58, 237, 0.50); }
.exc-pill.tone-gold   { --accent: #fcd34d; --accent-light: #b45309; --accent-shadow: rgba(180, 83, 9, 0.50); }

/* ═══════════════════════════════════════════════════════════════════════
   ANOMALY FEED
   ═══════════════════════════════════════════════════════════════════════ */
.exc-feed {
  position: relative;
  border-radius: 18px;
  background:
    radial-gradient(80% 60% at 100% 0%, rgba(239, 68, 68, 0.10), transparent 65%),
    var(--att-glass);
  border: 1px solid rgba(251, 146, 60, 0.38);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 14px 36px -22px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
[data-theme="light"] .exc-feed {
  background:
    radial-gradient(80% 60% at 100% 0%, rgba(194, 65, 12, 0.08), transparent 65%),
    rgba(255, 250, 240, 0.92);
  border-color: rgba(194, 65, 12, 0.40);
  box-shadow:
    0 14px 36px -22px rgba(40, 25, 10, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

.exc-feed-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 22px;
  border-bottom: 1px solid rgba(251, 146, 60, 0.22);
}
[data-theme="light"] .exc-feed-head { border-bottom-color: rgba(194, 65, 12, 0.24); }
.exc-feed-head h3 {
  margin: 0;
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 13.5px; font-weight: 800; color: var(--hr-text);
  letter-spacing: -0.01em;
}
.exc-feed-head svg { color: #fb923c; }
[data-theme="light"] .exc-feed-head svg { color: #c2410c; }
.exc-feed-count {
  display: inline-flex; padding: 2px 10px;
  border-radius: 999px;
  background: rgba(251, 146, 60, 0.20);
  border: 1px solid rgba(251, 146, 60, 0.40);
  color: #fb923c;
  font-size: 10.5px; font-weight: 800;
  font-variant-numeric: tabular-nums;
}
[data-theme="light"] .exc-feed-count {
  background: rgba(194, 65, 12, 0.10);
  border-color: rgba(194, 65, 12, 0.42);
  color: #c2410c;
}
.exc-feed-live {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--hr-text-muted);
}
[data-theme="light"] .exc-feed-live { color: #6b5840; }
.exc-feed-live-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #2dd4bf;
  box-shadow: 0 0 6px rgba(45, 212, 191, 0.7);
  animation: att-live-pulse 2.2s ease-in-out infinite;
}
[data-theme="light"] .exc-feed-live-dot { background: #0f766e; box-shadow: 0 0 6px rgba(15, 118, 110, 0.45); }

.exc-list { list-style: none; margin: 0; padding: 0; }
.exc-row {
  position: relative;
  display: grid;
  grid-template-columns: 44px 1fr auto;
  align-items: center;
  gap: 14px;
  padding: 14px 22px 14px 28px;
  border-top: 1px solid rgba(251, 146, 60, 0.10);
  isolation: isolate; overflow: hidden;
  transition: background .22s var(--att-spring);
}
[data-theme="light"] .exc-row { border-top-color: rgba(194, 65, 12, 0.12); }
.exc-row:first-child { border-top: 0; }
.exc-row:hover { background: rgba(251, 146, 60, 0.05); }
[data-theme="light"] .exc-row:hover { background: rgba(194, 65, 12, 0.04); }

.exc-row-rail {
  position: absolute; left: 14px; top: 14px; bottom: 14px;
  width: 3px; border-radius: 2px;
  background: linear-gradient(180deg, var(--sev-accent, #fb923c), transparent);
}
.exc-row.is-high { --sev-accent: #ef4444; --sev-glow: rgba(239, 68, 68, 0.35); }
.exc-row.is-med  { --sev-accent: #fb923c; --sev-glow: rgba(251, 146, 60, 0.32); }
.exc-row.is-low  { --sev-accent: #fbbf24; --sev-glow: rgba(251, 191, 36, 0.28); }
[data-theme="light"] .exc-row.is-high { --sev-accent: #991b1b; }
[data-theme="light"] .exc-row.is-med  { --sev-accent: #c2410c; }
[data-theme="light"] .exc-row.is-low  { --sev-accent: #b45309; }

.exc-row-aurora {
  position: absolute; inset: 0;
  background: radial-gradient(60% 80% at 0% 50%, var(--sev-glow, rgba(251, 146, 60, 0.16)), transparent 60%);
  opacity: 0;
  transition: opacity .25s;
  pointer-events: none;
  z-index: -1;
}
.exc-row:hover .exc-row-aurora { opacity: 1; }

.exc-icon {
  position: relative;
  width: 38px; height: 38px;
  border-radius: 11px;
  display: inline-flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--sev-accent, #fb923c) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--sev-accent, #fb923c) 42%, transparent);
  color: var(--sev-accent, #fb923c);
  flex-shrink: 0;
}
.exc-icon-ring {
  position: absolute; inset: -3px;
  border-radius: 13px;
  border: 1px solid var(--sev-accent, #fb923c);
  opacity: 0;
  transition: opacity .25s, transform .35s var(--att-spring);
}
.exc-row:hover .exc-icon-ring { opacity: 0.42; transform: scale(1.05); }
.exc-row.is-high .exc-icon { animation: exc-row-pulse 2s ease-in-out infinite; }
@keyframes exc-row-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.45); }
  50%      { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0.00); }
}

.exc-main { min-width: 0; }
.exc-name {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  font-size: 13px; font-weight: 800; color: var(--hr-text);
  letter-spacing: -0.01em;
  margin-bottom: 4px;
}
.exc-code {
  display: inline-flex; padding: 1px 7px;
  border-radius: 5px;
  background: rgba(251, 191, 36, 0.14);
  border: 1px solid rgba(251, 191, 36, 0.30);
  color: #fcd34d;
  font-family: var(--hr-mono);
  font-size: 9.5px; font-weight: 700;
  letter-spacing: 0.4px;
}
[data-theme="light"] .exc-code {
  background: rgba(180, 83, 9, 0.10);
  border-color: rgba(180, 83, 9, 0.30);
  color: #92400e;
}
.exc-meta {
  display: flex; gap: 6px; flex-wrap: wrap;
}
.exc-flag {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(148, 163, 184, 0.16);
  border: 1px solid rgba(148, 163, 184, 0.28);
  color: var(--hr-text-secondary);
  font-size: 10px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase;
}
[data-theme="light"] .exc-flag {
  background: rgba(120, 113, 108, 0.12);
  border-color: rgba(120, 113, 108, 0.26);
  color: #57534e;
}
.exc-flag-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: currentColor; opacity: 0.7;
}
.exc-flag.absent {
  background: rgba(234, 88, 12, 0.18);
  border-color: rgba(234, 88, 12, 0.38);
  color: #fb923c;
}
.exc-flag.late, .exc-flag.is-late {
  background: rgba(234, 179, 8, 0.18);
  border-color: rgba(234, 179, 8, 0.38);
  color: #fde047;
}
.exc-flag.is-geo {
  background: rgba(251, 146, 60, 0.18);
  border-color: rgba(251, 146, 60, 0.38);
  color: #fdba74;
}
.exc-flag.is-flagged {
  background: rgba(239, 68, 68, 0.18);
  border-color: rgba(239, 68, 68, 0.40);
  color: #fca5a5;
}
[data-theme="light"] .exc-flag.absent { background: rgba(194, 65, 12, 0.12); border-color: rgba(194, 65, 12, 0.34); color: #9a3412; }
[data-theme="light"] .exc-flag.late, [data-theme="light"] .exc-flag.is-late { background: rgba(202, 138, 4, 0.14); border-color: rgba(202, 138, 4, 0.34); color: #854d0e; }
[data-theme="light"] .exc-flag.is-geo { background: rgba(194, 65, 12, 0.12); border-color: rgba(194, 65, 12, 0.34); color: #9a3412; }
[data-theme="light"] .exc-flag.is-flagged { background: rgba(153, 27, 27, 0.12); border-color: rgba(153, 27, 27, 0.34); color: #7f1d1d; }

.exc-time-block {
  display: flex; flex-direction: column; align-items: flex-end; gap: 2px;
  flex-shrink: 0;
}
.exc-time-label {
  font-size: 9px; font-weight: 800; letter-spacing: 1.2px;
  text-transform: uppercase;
  color: var(--hr-text-muted);
}
[data-theme="light"] .exc-time-label { color: #6b5840; }
.exc-time {
  font-family: var(--hr-mono);
  font-size: 14px; font-weight: 800;
  color: var(--sev-accent, #fb923c);
  letter-spacing: 0.2px;
  font-variant-numeric: tabular-nums;
}
.exc-mono { font-family: var(--hr-mono); }

/* ═══════════════════════════════════════════════════════════════════════
   EMPTY STATE
   ═══════════════════════════════════════════════════════════════════════ */
.exc-empty {
  position: relative;
  padding: 56px 32px;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  text-align: center;
  overflow: hidden;
}
.exc-empty-aurora {
  position: absolute; inset: -50% -10% auto auto;
  width: 70%; height: 240%;
  background: radial-gradient(50% 50% at 50% 50%, rgba(45, 212, 191, 0.22), transparent 60%);
  filter: blur(60px);
  pointer-events: none;
  animation: att-aurora 14s ease-in-out infinite;
}
[data-theme="light"] .exc-empty-aurora { background: radial-gradient(50% 50% at 50% 50%, rgba(13, 148, 136, 0.18), transparent 60%); }

.exc-empty-illu {
  position: relative;
  width: 130px; height: 130px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 4px;
}
.exc-empty-ring {
  position: absolute; left: 50%; top: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 1.5px dashed rgba(45, 212, 191, 0.38);
}
.exc-empty-ring.r1 { width: 130px; height: 130px; animation: att-ring-rotate 38s linear infinite; }
.exc-empty-ring.r2 { width: 92px;  height: 92px;  animation: att-ring-rotate 22s linear infinite reverse; border-color: rgba(94, 234, 212, 0.30); }
.exc-empty-ring.r3 { width: 58px;  height: 58px;  animation: att-ring-rotate 14s linear infinite; border-color: rgba(45, 212, 191, 0.50); border-style: solid; opacity: 0.55; }
[data-theme="light"] .exc-empty-ring.r1 { border-color: rgba(13, 148, 136, 0.42); }
[data-theme="light"] .exc-empty-ring.r2 { border-color: rgba(15, 118, 110, 0.34); }
[data-theme="light"] .exc-empty-ring.r3 { border-color: rgba(13, 148, 136, 0.50); }
.exc-empty-icon {
  position: relative;
  width: 60px; height: 60px;
  border-radius: 18px;
  display: inline-flex; align-items: center; justify-content: center;
  background: radial-gradient(closest-side, rgba(94, 234, 212, 0.22), rgba(20, 16, 14, 0.55));
  border: 1.5px solid rgba(45, 212, 191, 0.55);
  color: #5eead4;
  box-shadow: 0 0 22px -4px rgba(45, 212, 191, 0.55);
}
[data-theme="light"] .exc-empty-icon {
  background: radial-gradient(closest-side, rgba(255, 255, 255, 0.96), rgba(204, 251, 241, 0.55));
  border-color: rgba(15, 118, 110, 0.55);
  color: #0f766e;
  box-shadow: 0 0 22px -4px rgba(13, 148, 136, 0.45);
}

.exc-empty h3 {
  margin: 4px 0 0;
  font-size: 16px; font-weight: 800;
  color: var(--hr-text);
  letter-spacing: -0.02em;
}
.exc-empty p {
  margin: 0;
  font-size: 12.5px; line-height: 1.5;
  color: var(--hr-text-muted);
  max-width: 460px;
}
.exc-empty-meta {
  margin-top: 8px;
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(45, 212, 191, 0.10);
  border: 1px solid rgba(45, 212, 191, 0.30);
  color: #5eead4;
  font-size: 9.5px; font-weight: 800; letter-spacing: 1.4px;
  text-transform: uppercase;
}
[data-theme="light"] .exc-empty-meta {
  background: rgba(15, 118, 110, 0.08);
  border-color: rgba(15, 118, 110, 0.30);
  color: #0f766e;
}
.exc-empty-meta-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 6px currentColor;
  animation: att-live-pulse 2.2s ease-in-out infinite;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .exc-radar-sweep,
  .exc-radar-ring,
  .exc-radar-blip,
  .exc-radar-core,
  .exc-empty-ring,
  .bucket-badge,
  .exc-row.is-high .exc-icon,
  .att-banner-eyebrow-dot,
  .exc-feed-live-dot,
  .exc-empty-meta-dot { animation: none !important; }
  .exc-bucket:hover { transform: none; }
}

/* Responsive */
@media (max-width: 720px) {
  .exc-banner .att-banner-text { padding-right: 0; }
  .exc-radar { display: none; }
  .exc-row { grid-template-columns: 38px 1fr; }
  .exc-time-block { grid-column: 2; align-items: flex-start; }
  .exc-ribbon { flex-wrap: wrap; }
  .ribbon-divider { display: none; }
  .ribbon-cell { flex: 1 1 45%; }
}
</style>
