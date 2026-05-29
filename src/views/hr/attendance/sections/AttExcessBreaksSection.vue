<template>
  <section class="att-eb" data-anim="att-eb">
    <!-- ═══════════════════ HERO BANNER ═══════════════════ -->
    <Motion as="header" class="eb-banner"
      :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }"
    >
      <span class="eb-banner-grid" aria-hidden="true" />
      <span class="eb-banner-glow" />

      <!-- Animated stopwatch + steaming coffee cup motif on the right -->
      <div class="eb-cluster" aria-hidden="true">
        <span class="eb-cluster-ring r1" />
        <span class="eb-cluster-ring r2" />
        <span class="eb-cluster-ring r3" />

        <div class="eb-stopwatch">
          <span class="eb-stopwatch-crown" />
          <div class="eb-stopwatch-face">
            <span v-for="i in 12" :key="`t-${i}`" class="eb-tick" :style="{ transform: `rotate(${i * 30}deg)` }" />
            <span class="eb-hand eb-hand-second" />
            <span class="eb-hand eb-hand-minute" />
            <span class="eb-hand-center" />
          </div>
        </div>

        <div class="eb-coffee">
          <span class="eb-steam s1" />
          <span class="eb-steam s2" />
          <span class="eb-steam s3" />
          <Coffee :size="22" />
        </div>
      </div>

      <div class="eb-banner-text">
        <span class="eb-eyebrow">
          <span class="eb-eyebrow-dot" />
          Break-time intelligence · Shift cap vs actual · Live audit
        </span>
        <h2 class="eb-banner-title">
          <span>Excess</span>
          <span class="eb-banner-divider">·</span>
          <span>Breaks</span>
        </h2>
        <p class="eb-banner-sub">
          Every employee's break time today, measured against <strong>shift.break_minutes</strong>.
          Toggle <em>"Within cap"</em> to see employees inside policy — useful when you suspect
          someone took a long break that didn't trip the cap.
        </p>
      </div>
    </Motion>

    <!-- ═══════════════════ KPI STRIP ═══════════════════ -->
    <div class="eb-kpis">
      <Motion v-for="(t, i) in kpiTiles" :key="t.key" as="article"
        :class="['eb-kpi', `tone-${t.tone}`, { active: severityFilter === t.filter }]"
        :initial="{ opacity: 0, y: 14 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.42, delay: 0.06 * i + 0.1, ease: [0.22, 1, 0.36, 1] }"
        :whileHover="{ y: -3 }"
        @click="t.filter !== undefined ? toggleSeverity(t.filter) : null"
      >
        <span class="kpi-scan" aria-hidden="true" />
        <span class="kpi-rule" aria-hidden="true" />
        <div class="kpi-head">
          <span class="kpi-eyebrow">
            <component :is="t.icon" :size="11" />
            <span>{{ t.label }}</span>
          </span>
          <span v-if="t.badge" class="kpi-badge">{{ t.badge }}</span>
        </div>
        <Motion as="span" class="kpi-num"
          :initial="{ opacity: 0, y: 8 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.4, delay: 0.18 + 0.06 * i }"
        >{{ t.value }}</Motion>
        <span class="kpi-foot">{{ t.foot }}</span>
      </Motion>
    </div>

    <!-- ═══════════════════ FILTER + SEARCH TOOLBAR ═══════════════════ -->
    <Motion as="div" class="eb-toolbar"
      :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.4, delay: 0.32 }"
    >
      <div class="eb-toolbar-row">
        <div class="eb-toolbar-left">
          <label class="eb-date">
            <Calendar :size="11" />
            <input type="date" v-model="filterDate" @change="reload" class="eb-date-input" />
          </label>

          <div class="eb-toolbar-divider" />

          <Motion as="label" class="eb-toggle"
            :class="{ active: includeWithinCap }"
            :whileHover="{ y: -1, scale: 1.02 }" :whileTap="{ scale: 0.96 }"
          >
            <input type="checkbox" v-model="includeWithinCap" @change="reload" />
            <span class="eb-toggle-knob"><span class="eb-toggle-knob-dot" /></span>
            <span class="eb-toggle-label">
              <Eye :size="11" />Show within-cap
            </span>
          </Motion>

          <Motion as="label" class="eb-toggle"
            :class="{ active: showOpenOnly }"
            :whileHover="{ y: -1, scale: 1.02 }" :whileTap="{ scale: 0.96 }"
          >
            <input type="checkbox" v-model="showOpenOnly" />
            <span class="eb-toggle-knob"><span class="eb-toggle-knob-dot" /></span>
            <span class="eb-toggle-label">
              <Pause :size="11" />Open breaks only
            </span>
          </Motion>
        </div>

        <div class="eb-toolbar-right">
          <label class="eb-search">
            <Search :size="11" />
            <input type="text" v-model="searchQ" placeholder="Search by name / code…" />
            <button v-if="searchQ" class="eb-search-clear" @click="searchQ = ''">
              <X :size="11" />
            </button>
          </label>
          <Motion as="button" class="eb-btn eb-btn-ghost"
            :disabled="loading"
            :whileHover="!loading ? { y: -1, scale: 1.02 } : {}"
            :whileTap="!loading ? { scale: 0.96 } : {}"
            @click="reload"
          >
            <RefreshCw :size="13" :class="{ spinning: loading }" />
            {{ loading ? 'Loading…' : 'Refresh' }}
          </Motion>
          <Motion as="button" class="eb-btn eb-btn-primary"
            :disabled="recomputing"
            :whileHover="!recomputing ? { y: -1, scale: 1.02 } : {}"
            :whileTap="!recomputing ? { scale: 0.96 } : {}"
            @click="recomputeToday"
            title="Recompute today's break_hours for every employee. Helpful when a recent BREAK_END hasn't been rolled up yet."
          >
            <Zap :size="13" />
            {{ recomputing ? 'Recomputing…' : 'Recompute today' }}
          </Motion>
        </div>
      </div>

      <!-- Severity pill row -->
      <div class="eb-pill-row">
        <span class="eb-pill-row-label">
          <Filter :size="11" />SEVERITY
        </span>
        <button v-for="f in SEV_FILTERS" :key="f.key || 'all'"
          :class="['eb-pill', `tone-${f.tone}`, { active: severityFilter === f.key }]"
          @click="severityFilter = f.key"
        >
          <span class="eb-pill-dot" />
          {{ f.label }}
          <span class="eb-pill-count">{{ f.count }}</span>
        </button>
      </div>
    </Motion>

    <!-- ═══════════════════ ROW LIST ═══════════════════ -->
    <div class="eb-list" v-if="filteredItems.length">
      <Motion v-for="(r, i) in filteredItems" :key="r.employee_id + '-' + i" as="article"
        :class="['eb-row', `is-${r.severity.toLowerCase()}`, { 'has-open': r.has_open_break }]"
        :initial="{ opacity: 0, y: 12 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }"
        :whileHover="{ y: -2 }"
      >
        <span class="eb-row-aurora" aria-hidden="true" />

        <!-- IDENTITY -->
        <div class="eb-identity">
          <div class="eb-avatar">
            <span class="eb-avatar-ring" />
            <span class="eb-avatar-text">{{ initials(r.employee_name) }}</span>
          </div>
          <div class="eb-id-meta">
            <div class="eb-emp-name">
              {{ r.employee_name || 'Unknown' }}
              <span v-if="r.has_open_break" class="eb-on-break-flag" title="Currently on break">
                <span class="eb-on-break-dot" />ON BREAK
              </span>
            </div>
            <div class="eb-emp-sub">
              <span v-if="r.employee_code" class="eb-mono">{{ r.employee_code }}</span>
              <span v-if="r.department_name" class="eb-dept">{{ r.department_name }}</span>
              <span v-if="r.shift_name" class="eb-shift">{{ r.shift_name }}</span>
            </div>
          </div>
        </div>

        <!-- GAUGE -->
        <div class="eb-gauge">
          <div class="eb-gauge-meta">
            <span class="eb-gauge-actual">{{ formatMin(r.break_actual_minutes) }}</span>
            <span class="eb-gauge-slash">/</span>
            <span class="eb-gauge-cap">{{ formatMin(r.break_cap_minutes) }} cap</span>
            <span :class="['eb-gauge-delta', `is-${r.severity.toLowerCase()}`]">
              <component :is="r.severity === 'WITHIN_CAP' ? Check : TrendingUp" :size="11" />
              <template v-if="r.severity === 'WITHIN_CAP'">
                {{ formatMin(r.break_cap_minutes - r.break_actual_minutes) }} headroom
              </template>
              <template v-else>
                {{ formatMin(r.excess_minutes) }} over · {{ Math.round(r.overage_ratio * 100) }}% of cap
              </template>
            </span>
          </div>
          <div class="eb-gauge-bar">
            <Motion class="eb-gauge-fill"
              :initial="{ width: '0%' }"
              :animate="{ width: gaugePct(r) + '%' }"
              :transition="{ duration: 0.85, delay: 0.12 + 0.04 * i, ease: [0.22, 1, 0.36, 1] }"
            />
            <span class="eb-gauge-cap-mark" :style="{ left: capMarkPct(r) + '%' }" />
          </div>
          <div class="eb-gauge-scale">
            <span>0</span>
            <span class="eb-cap-label" :style="{ left: capMarkPct(r) + '%' }">cap · {{ r.break_cap_minutes }}m</span>
            <span>{{ scaleMax(r) }}m</span>
          </div>
        </div>

        <!-- SEVERITY BADGE -->
        <div class="eb-sev-cell">
          <span :class="['eb-sev-badge', `is-${r.severity.toLowerCase()}`]">
            <span class="eb-sev-badge-dot" />
            {{ severityLabel(r.severity) }}
          </span>
          <span class="eb-segments-tag" :title="`${r.break_count} break ${r.break_count === 1 ? 'segment' : 'segments'}`">
            <Coffee :size="10" />{{ r.break_count }}
          </span>
        </div>

        <!-- TIMELINE -->
        <div class="eb-timeline" v-if="r.segments?.length">
          <div class="eb-timeline-head">
            <Clock :size="10" />
            <span>Break tape</span>
            <span class="eb-timeline-count">{{ r.segments.length }}</span>
          </div>
          <ul class="eb-segments">
            <li v-for="(s, si) in r.segments" :key="si"
              :class="['eb-segment', { 'is-long': s.minutes > r.break_cap_minutes, 'is-over-window': s.is_over_window, 'is-open': s.is_open }]"
              :style="{ '--seg-pct': Math.min(100, (s.minutes / Math.max(r.break_actual_minutes, r.break_cap_minutes, 1)) * 100) + '%' }"
            >
              <span class="eb-seg-bar">
                <span class="eb-seg-fill" :style="{ width: 'var(--seg-pct)' }" />
              </span>
              <span class="eb-seg-time eb-mono">
                {{ formatTime(s.start) }}<template v-if="s.end"> → {{ formatTime(s.end) }}</template>
                <span v-if="s.is_open" class="eb-seg-open-flag">· open</span>
              </span>
              <span class="eb-seg-dur eb-mono">{{ Math.round(s.minutes) }}m</span>
            </li>
          </ul>
        </div>
        <div v-else class="eb-timeline eb-timeline-empty">
          <Hourglass :size="10" />
          <span>No break segments recorded yet — rollup may be pending.</span>
        </div>
      </Motion>
    </div>

    <!-- ═══════════════════ EMPTY STATE ═══════════════════ -->
    <Motion v-else as="div" class="eb-empty"
      :initial="{ opacity: 0, scale: 0.95 }" :animate="{ opacity: 1, scale: 1 }"
      :transition="{ duration: 0.45 }"
    >
      <span class="eb-empty-aurora" />
      <div class="eb-empty-illustration">
        <span class="eb-empty-grid-bg" aria-hidden="true" />
        <Motion class="eb-empty-icon"
          :animate="{ rotate: [-3, 3] }"
          :transition="{ duration: 4, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' }"
        >
          <Coffee :size="42" />
        </Motion>
        <span class="eb-empty-ring r1" />
        <span class="eb-empty-ring r2" />
        <span class="eb-empty-ring r3" />
      </div>
      <h3>{{ emptyTitle }}</h3>
      <p>{{ emptySub }}</p>
      <div class="eb-empty-actions">
        <Motion as="button" class="eb-btn eb-btn-ghost"
          :whileHover="{ y: -1, scale: 1.03 }" :whileTap="{ scale: 0.96 }"
          @click="severityFilter = null; includeWithinCap = true; showOpenOnly = false; searchQ = ''; reload()"
        >
          <Filter :size="13" />Show every employee
        </Motion>
        <Motion as="button" class="eb-btn eb-btn-primary"
          :whileHover="{ y: -1, scale: 1.03 }" :whileTap="{ scale: 0.96 }"
          @click="recomputeToday"
        >
          <Zap :size="13" />Recompute today
        </Motion>
      </div>
      <div class="eb-empty-meta">
        <span class="eb-empty-meta-dot" />Live · auto-refresh when a break closes
      </div>
    </Motion>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  Coffee, RefreshCw, TrendingUp, Hourglass, Filter, Calendar, Search,
  Zap, Clock, Pause, Eye, Check, X, AlertTriangle, Flame, ShieldCheck,
} from 'lucide-vue-next'
import { fetchBreakAnomalies, recomputeAttendance, fetchTodayAttendance } from '../composables/useAttendance'
import { useToast } from 'vue-toastification'

defineEmits(['refresh-stats'])
const toast = useToast()

// ── State ──────────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10)
const filterDate = ref(today)
const includeWithinCap = ref(true)  // default ON — surfaces every employee
const showOpenOnly = ref(false)
const searchQ = ref('')
const severityFilter = ref(null)
const summary = ref(null)
const items = ref([])
const loading = ref(false)
const recomputing = ref(false)

// ── KPI tiles ──────────────────────────────────────────────────────────
const kpiTiles = computed(() => {
  const s = summary.value || {}
  return [
    {
      key: 'total', label: 'OVER CAP', icon: TrendingUp, tone: 'red',
      filter: null,
      value: s.total_flagged || 0,
      foot: s.total_flagged ? `${formatMin(s.total_excess_minutes || 0)} total excess` : 'within policy',
      badge: s.critical_count > 0 ? 'critical' : null,
    },
    {
      key: 'critical', label: 'CRITICAL', icon: Flame, tone: 'red',
      filter: 'CRITICAL',
      value: s.critical_count || 0,
      foot: '>2× of cap',
    },
    {
      key: 'severe', label: 'SEVERE', icon: AlertTriangle, tone: 'orange',
      filter: 'SEVERE',
      value: s.severe_count || 0,
      foot: '1.5×–2× of cap',
    },
    {
      key: 'mild', label: 'MILD', icon: Hourglass, tone: 'amber',
      filter: 'MILD',
      value: s.mild_count || 0,
      foot: '1×–1.5× of cap',
    },
    {
      key: 'within', label: 'WITHIN CAP', icon: ShieldCheck, tone: 'teal',
      filter: 'WITHIN_CAP',
      value: s.within_cap_count || 0,
      foot: 'inside policy',
    },
    {
      key: 'open', label: 'ON BREAK NOW', icon: Pause, tone: 'gold',
      filter: undefined, // not a click filter — represented by the toggle
      value: s.open_break_count || 0,
      foot: 'BREAK_END not yet punched',
    },
  ]
})

const SEV_FILTERS = computed(() => {
  const baseCount = items.value.length
  return [
    { key: null,         label: 'All',         tone: 'gold',   count: baseCount, dot: '#fbbf24' },
    { key: 'CRITICAL',   label: 'Critical',    tone: 'red',    count: items.value.filter(r => r.severity === 'CRITICAL').length },
    { key: 'SEVERE',     label: 'Severe',      tone: 'orange', count: items.value.filter(r => r.severity === 'SEVERE').length },
    { key: 'MILD',       label: 'Mild',        tone: 'amber',  count: items.value.filter(r => r.severity === 'MILD').length },
    { key: 'WITHIN_CAP', label: 'Within cap',  tone: 'teal',   count: items.value.filter(r => r.severity === 'WITHIN_CAP').length },
  ]
})

const filteredItems = computed(() => {
  let out = items.value
  if (severityFilter.value) out = out.filter(r => r.severity === severityFilter.value)
  if (showOpenOnly.value)   out = out.filter(r => r.has_open_break)
  if (searchQ.value.trim()) {
    const q = searchQ.value.trim().toLowerCase()
    out = out.filter(r =>
      (r.employee_name || '').toLowerCase().includes(q) ||
      (r.employee_code || '').toLowerCase().includes(q)
    )
  }
  return out
})

const emptyTitle = computed(() => {
  if (showOpenOnly.value) return 'Nobody is currently on break'
  if (severityFilter.value === 'CRITICAL') return 'No critical break overages today'
  if (severityFilter.value === 'SEVERE')   return 'No severe break overages today'
  if (severityFilter.value === 'MILD')     return 'No mild break overages today'
  if (severityFilter.value === 'WITHIN_CAP') return 'No employees have break activity within cap'
  if (!includeWithinCap.value)             return 'All breaks within policy today'
  return 'No break data for this date'
})
const emptySub = computed(() => {
  if (!includeWithinCap.value) {
    return 'No employees exceeded their shift\'s break cap. Toggle "Show within-cap" to see every employee who took a break today — useful when you suspect someone but they\'re technically inside policy.'
  }
  return 'If you\'re expecting a specific employee here, they may have an open break (BREAK_END not yet punched) or the daily rollup hasn\'t run since their last BREAK_END. Use "Recompute today" to refresh.'
})

const toggleSeverity = (key) => {
  severityFilter.value = severityFilter.value === key ? null : key
}

// ── Data fetch ─────────────────────────────────────────────────────────
const reload = async () => {
  if (loading.value) return
  loading.value = true
  try {
    const data = await fetchBreakAnomalies({
      on_date: filterDate.value,
      include_within_cap: includeWithinCap.value,
      limit: 200,
    })
    summary.value = data.summary
    items.value = data.items || []
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load break data')
    summary.value = null
    items.value = []
  } finally {
    loading.value = false
  }
}
onMounted(reload)

watch(filterDate, () => { reload() })

// Recompute today's attendance rollup for every employee that has a row in
// `today`. This is the fix for "umran took a long break but isn't showing
// up" — the rollup hasn't run yet so break_hours is stale.
const recomputeToday = async () => {
  if (recomputing.value) return
  recomputing.value = true
  try {
    // /today accepts `date` (aliased) — passing `on_date` is silently ignored.
    const todays = await fetchTodayAttendance({ limit: 200, date: filterDate.value })
    const list = todays.items || todays || []
    let done = 0
    for (const a of list) {
      if (!a.employee_id) continue
      try {
        await recomputeAttendance(a.employee_id, filterDate.value)
        done += 1
      } catch { /* keep going — one bad row shouldn't abort the rest */ }
    }
    toast.success(`Recomputed break_hours for ${done} ${done === 1 ? 'row' : 'rows'}`)
    await reload()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Recompute failed')
  } finally {
    recomputing.value = false
  }
}

// ── Helpers ────────────────────────────────────────────────────────────
const initials = (n) => (n || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?'
const formatMin = (m) => {
  const n = Math.round(m || 0)
  if (n < 60) return `${n}m`
  const h = Math.floor(n / 60), r = n % 60
  return r ? `${h}h ${r}m` : `${h}h`
}
const formatTime = (iso) => {
  if (!iso) return '--:--'
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const gaugePct = (r) => {
  const max = Math.max(r.break_cap_minutes * 2, r.break_actual_minutes || 0, 1)
  return Math.min(100, (r.break_actual_minutes / max) * 100)
}
const capMarkPct = (r) => {
  const max = Math.max(r.break_cap_minutes * 2, r.break_actual_minutes || 0, 1)
  return Math.min(100, (r.break_cap_minutes / max) * 100)
}
const scaleMax = (r) => Math.max(r.break_actual_minutes, r.break_cap_minutes * 2)
const severityLabel = (s) => {
  if (s === 'WITHIN_CAP') return 'Within cap'
  return s.charAt(0) + s.slice(1).toLowerCase()
}
</script>

<style scoped>
@import '../../../../styles/attendance-theme.css';

.att-eb { display: flex; flex-direction: column; gap: 16px; padding-top: 18px; }

/* ═══════════════════════════════════════════════════════════════════════
   HERO BANNER — stopwatch + steaming-coffee motif
   ═══════════════════════════════════════════════════════════════════════ */
.eb-banner {
  position: relative; overflow: hidden;
  padding: 26px 28px;
  border-radius: 22px;
  background:
    radial-gradient(140% 110% at 100% -10%, rgba(251, 146, 60, 0.18), transparent 65%),
    radial-gradient(120% 110% at 0% 110%, rgba(251, 191, 36, 0.14), transparent 70%),
    var(--att-glass);
  border: 1px solid rgba(251, 146, 60, 0.45);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 22px 60px -32px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  display: block;
  isolation: isolate;
}
[data-theme="light"] .eb-banner {
  background:
    radial-gradient(140% 110% at 100% -10%, rgba(194, 65, 12, 0.16), transparent 65%),
    radial-gradient(120% 110% at 0% 110%, rgba(217, 119, 6, 0.10), transparent 70%),
    rgba(255, 250, 240, 0.92);
  border-color: rgba(194, 65, 12, 0.42);
  box-shadow:
    0 22px 50px -28px rgba(40, 25, 10, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.eb-banner-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(251, 146, 60, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(251, 146, 60, 0.06) 1px, transparent 1px);
  background-size: 24px 24px;
  z-index: 0; pointer-events: none;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.95), rgba(0, 0, 0, 0.50));
}
[data-theme="light"] .eb-banner-grid {
  background-image:
    linear-gradient(rgba(180, 83, 9, 0.10) 1px, transparent 1px),
    linear-gradient(90deg, rgba(180, 83, 9, 0.10) 1px, transparent 1px);
}
.eb-banner-glow {
  position: absolute; inset: -50% -10% auto auto;
  width: 60%; height: 240%;
  background: radial-gradient(50% 50% at 50% 50%, rgba(251, 146, 60, 0.22), transparent 60%);
  filter: blur(60px);
  z-index: 0; pointer-events: none;
  animation: att-aurora 14s ease-in-out infinite;
}

/* Stopwatch + coffee cluster on the right */
.eb-cluster {
  position: absolute;
  top: 50%; right: 36px;
  transform: translateY(-50%);
  width: 220px; height: 180px;
  z-index: 1; pointer-events: none;
}
.eb-cluster-ring {
  position: absolute; top: 50%; left: 50%;
  border-radius: 50%;
  border: 1.4px dashed rgba(251, 146, 60, 0.40);
  transform: translate(-50%, -50%);
  pointer-events: none;
}
.eb-cluster-ring.r1 { width: 180px; height: 180px; animation: att-ring-rotate 60s linear infinite; }
.eb-cluster-ring.r2 { width: 130px; height: 130px; animation: att-ring-rotate 42s linear infinite reverse; border-color: rgba(251, 191, 36, 0.32); }
.eb-cluster-ring.r3 { width: 90px;  height: 90px;  animation: att-ring-rotate 28s linear infinite; border-color: rgba(234, 88, 12, 0.30); }
[data-theme="light"] .eb-cluster-ring.r1 { border-color: rgba(194, 65, 12, 0.45); }
[data-theme="light"] .eb-cluster-ring.r2 { border-color: rgba(180, 83, 9, 0.35); }
[data-theme="light"] .eb-cluster-ring.r3 { border-color: rgba(154, 52, 18, 0.40); }

/* Stopwatch */
.eb-stopwatch {
  position: absolute;
  top: 16px; left: 26px;
  width: 78px; height: 86px;
}
.eb-stopwatch-crown {
  position: absolute; left: 50%; top: -6px;
  width: 12px; height: 10px;
  margin-left: -6px;
  border-radius: 4px 4px 1px 1px;
  background: linear-gradient(180deg, #fbbf24, #c2410c);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.35);
}
[data-theme="light"] .eb-stopwatch-crown { background: linear-gradient(180deg, #d97706, #9a3412); }
.eb-stopwatch-face {
  position: absolute; top: 6px; left: 0; right: 0; bottom: 0;
  width: 78px; height: 78px;
  border-radius: 50%;
  background:
    radial-gradient(closest-side, rgba(254, 243, 199, 0.18), rgba(20, 16, 14, 0.65));
  border: 2px solid rgba(251, 146, 60, 0.65);
  box-shadow:
    inset 0 2px 6px rgba(0, 0, 0, 0.35),
    0 0 16px -4px rgba(251, 146, 60, 0.65);
}
[data-theme="light"] .eb-stopwatch-face {
  background: radial-gradient(closest-side, rgba(255, 255, 255, 0.95), rgba(254, 230, 138, 0.55));
  border-color: rgba(194, 65, 12, 0.65);
  box-shadow:
    inset 0 2px 6px rgba(120, 53, 15, 0.18),
    0 0 16px -4px rgba(194, 65, 12, 0.45);
}
.eb-tick {
  position: absolute; top: 4px; left: calc(50% - 0.75px);
  width: 1.5px; height: 4px;
  border-radius: 1px;
  background: rgba(251, 146, 60, 0.55);
  transform-origin: 50% 35px;
}
[data-theme="light"] .eb-tick { background: rgba(194, 65, 12, 0.65); }
.eb-hand {
  position: absolute; left: 50%; top: 50%;
  background: #fb923c;
  border-radius: 999px;
  transform-origin: 0 50%;
  box-shadow: 0 0 6px rgba(251, 146, 60, 0.65);
}
[data-theme="light"] .eb-hand { background: #c2410c; box-shadow: 0 0 6px rgba(194, 65, 12, 0.45); }
.eb-hand-minute { width: 22px; height: 2px; margin-top: -1px; animation: eb-hand-tick-min 36s steps(60) infinite; }
.eb-hand-second { width: 26px; height: 1.6px; margin-top: -0.8px; animation: eb-hand-tick-sec 6s steps(60) infinite; background: #ef4444; box-shadow: 0 0 6px rgba(239, 68, 68, 0.6); }
[data-theme="light"] .eb-hand-second { background: #991b1b; box-shadow: 0 0 6px rgba(153, 27, 27, 0.45); }
@keyframes eb-hand-tick-min { from { transform: rotate(-90deg); } to { transform: rotate(270deg); } }
@keyframes eb-hand-tick-sec { from { transform: rotate(-90deg); } to { transform: rotate(270deg); } }
.eb-hand-center {
  position: absolute; left: calc(50% - 3px); top: calc(50% - 3px);
  width: 6px; height: 6px; border-radius: 50%;
  background: #fbbf24;
  box-shadow: 0 0 6px rgba(251, 191, 36, 0.7);
}
[data-theme="light"] .eb-hand-center { background: #b45309; box-shadow: 0 0 6px rgba(180, 83, 9, 0.45); }

/* Coffee cup with steam */
.eb-coffee {
  position: absolute;
  right: 14px; top: 30px;
  width: 60px; height: 60px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(closest-side, rgba(254, 243, 199, 0.18), rgba(20, 16, 14, 0.55));
  border: 1.5px solid rgba(251, 191, 36, 0.55);
  color: #fcd34d;
  box-shadow: 0 0 16px -4px rgba(251, 191, 36, 0.55);
  animation: eb-coffee-bob 4.2s ease-in-out infinite;
}
[data-theme="light"] .eb-coffee {
  background: radial-gradient(closest-side, rgba(255, 255, 255, 0.95), rgba(254, 230, 138, 0.55));
  border-color: rgba(180, 83, 9, 0.55);
  color: #b45309;
  box-shadow: 0 0 16px -4px rgba(217, 119, 6, 0.45);
}
@keyframes eb-coffee-bob {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-4px); }
}
.eb-steam {
  position: absolute;
  top: -16px;
  width: 3px; height: 16px;
  border-radius: 999px;
  background: linear-gradient(180deg, transparent, rgba(252, 211, 77, 0.55) 50%, rgba(252, 211, 77, 0.10));
  filter: blur(1px);
  opacity: 0;
}
.eb-steam.s1 { left: 16px; animation: eb-steam-rise 2.8s ease-in-out infinite 0s; }
.eb-steam.s2 { left: 28px; animation: eb-steam-rise 2.4s ease-in-out infinite 0.7s; }
.eb-steam.s3 { left: 40px; animation: eb-steam-rise 3.2s ease-in-out infinite 1.4s; }
[data-theme="light"] .eb-steam { background: linear-gradient(180deg, transparent, rgba(180, 83, 9, 0.55) 50%, rgba(180, 83, 9, 0.10)); }
@keyframes eb-steam-rise {
  0%   { transform: translateY(8px) scaleY(0.4); opacity: 0; }
  35%  { opacity: 0.85; }
  100% { transform: translateY(-20px) scaleY(1.4); opacity: 0; }
}

.eb-banner-text { position: relative; z-index: 2; min-width: 0; padding-right: 260px; }
.eb-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; letter-spacing: 1.7px; text-transform: uppercase;
  font-weight: 800;
  color: #fb923c;
}
[data-theme="light"] .eb-eyebrow { color: #9a3412; }
.eb-eyebrow-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #fb923c;
  box-shadow: 0 0 6px rgba(251, 146, 60, 0.7);
  animation: att-live-pulse 2.5s ease-in-out infinite;
}
[data-theme="light"] .eb-eyebrow-dot { background: #c2410c; box-shadow: 0 0 6px rgba(194, 65, 12, 0.55); }
.eb-banner-title {
  margin: 6px 0 4px;
  font-size: 28px; font-weight: 900; letter-spacing: -0.5px;
  display: flex; align-items: baseline; gap: 12px;
  background: linear-gradient(110deg, #fde68a 0%, #fb923c 30%, #ef4444 60%, #fde68a 100%);
  background-size: 220% 220%;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: eb-title-shimmer 8s ease-in-out infinite;
}
[data-theme="light"] .eb-banner-title {
  background: linear-gradient(110deg, #b45309 0%, #c2410c 30%, #991b1b 60%, #b45309 100%);
  background-size: 220% 220%;
  -webkit-background-clip: text; background-clip: text;
}
@keyframes eb-title-shimmer { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
.eb-banner-divider { -webkit-text-fill-color: var(--hr-text-dim); color: var(--hr-text-dim); font-weight: 400; }
.eb-banner-sub {
  margin: 0;
  font-size: 12.5px; line-height: 1.5;
  color: var(--hr-text-muted);
  max-width: 560px;
}
.eb-banner-sub strong { color: #fcd34d; font-weight: 700; }
.eb-banner-sub em { color: #5eead4; font-style: normal; font-weight: 600; }
[data-theme="light"] .eb-banner-sub strong { color: #b45309; }
[data-theme="light"] .eb-banner-sub em { color: #115e59; }

/* ═══════════════════════════════════════════════════════════════════════
   KPI STRIP
   ═══════════════════════════════════════════════════════════════════════ */
.eb-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}
.eb-kpi {
  position: relative;
  padding: 14px 18px 12px 22px;
  border-radius: 16px;
  background: var(--att-glass);
  border: 1px solid rgba(251, 146, 60, 0.42);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 8px 22px -14px rgba(0, 0, 0, 0.40),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  cursor: pointer;
  isolation: isolate; overflow: hidden;
  transition: border-color .3s, box-shadow .3s, transform .25s;
}
[data-theme="light"] .eb-kpi {
  border-color: rgba(194, 65, 12, 0.40);
  background: rgba(255, 250, 240, 0.92);
  box-shadow:
    0 8px 22px -14px rgba(40, 25, 10, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.eb-kpi.active {
  border-color: var(--accent, #fb923c);
  box-shadow: 0 18px 36px -18px var(--accent-shadow, rgba(251, 146, 60, 0.45));
}
[data-theme="light"] .eb-kpi.active {
  border-color: var(--accent-light, #c2410c);
  box-shadow: 0 18px 36px -18px var(--accent-shadow-light, rgba(194, 65, 12, 0.40));
}
.kpi-rule {
  position: absolute; left: 0; top: 12px; bottom: 12px; width: 3px;
  border-radius: 0 2px 2px 0;
  background: linear-gradient(180deg, var(--accent, #fb923c), transparent);
}
[data-theme="light"] .kpi-rule { background: linear-gradient(180deg, var(--accent-light, #c2410c), transparent); }
.kpi-scan {
  position: absolute; inset: 0;
  background: linear-gradient(115deg, transparent 40%, rgba(255, 255, 255, 0.10) 50%, transparent 60%);
  transform: translateX(-100%);
  pointer-events: none;
  transition: transform 0.85s var(--att-spring);
}
.eb-kpi:hover .kpi-scan { transform: translateX(100%); }
[data-theme="light"] .kpi-scan { background: linear-gradient(115deg, transparent 40%, rgba(180, 83, 9, 0.10) 50%, transparent 60%); }
.kpi-head { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.kpi-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9px; letter-spacing: 1.4px; text-transform: uppercase;
  font-weight: 800;
  color: var(--hr-text-muted);
}
[data-theme="light"] .kpi-eyebrow { color: #6b5840; }
.kpi-badge {
  display: inline-flex; padding: 1px 6px;
  border-radius: 5px;
  font-size: 8px; letter-spacing: 1.2px;
  font-weight: 800; text-transform: uppercase;
  background: linear-gradient(135deg, #ef4444, #b91c1c);
  color: #fff;
  box-shadow: 0 4px 10px -4px rgba(185, 28, 28, 0.7);
  animation: eb-badge-pulse 2.2s ease-in-out infinite;
}
@keyframes eb-badge-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
.kpi-num {
  display: block; margin: 8px 0 3px;
  font-size: 28px; font-weight: 900;
  letter-spacing: -0.5px;
  color: var(--accent, var(--hr-text));
  font-variant-numeric: tabular-nums;
  line-height: 1.05;
  text-shadow: 0 2px 18px var(--accent-glow, rgba(251, 146, 60, 0.20));
}
[data-theme="light"] .kpi-num { color: var(--accent-light, var(--hr-text)); text-shadow: none; }
.kpi-foot { display: block; font-size: 10px; color: var(--hr-text-muted); font-weight: 600; letter-spacing: 0.3px; }

.tone-red    { --accent: #ef4444; --accent-light: #991b1b; --accent-glow: rgba(239, 68, 68, 0.30);   --accent-shadow: rgba(185, 28, 28, 0.45);  --accent-shadow-light: rgba(153, 27, 27, 0.45); }
.tone-orange { --accent: #fb923c; --accent-light: #c2410c; --accent-glow: rgba(251, 146, 60, 0.30);  --accent-shadow: rgba(234, 88, 12, 0.45);  --accent-shadow-light: rgba(194, 65, 12, 0.45); }
.tone-amber  { --accent: #fbbf24; --accent-light: #b45309; --accent-glow: rgba(251, 191, 36, 0.30);  --accent-shadow: rgba(217, 119, 6, 0.45);  --accent-shadow-light: rgba(180, 83, 9, 0.45); }
.tone-gold   { --accent: #fcd34d; --accent-light: #d97706; --accent-glow: rgba(252, 211, 77, 0.32);  --accent-shadow: rgba(217, 119, 6, 0.45);  --accent-shadow-light: rgba(180, 83, 9, 0.45); }
.tone-teal   { --accent: #10b981; --accent-light: #047857; --accent-glow: rgba(16, 185, 129, 0.30);  --accent-shadow: rgba(5, 150, 105, 0.45);  --accent-shadow-light: rgba(4, 120, 87, 0.45); }

/* ═══════════════════════════════════════════════════════════════════════
   TOOLBAR (date · toggles · search · refresh · recompute · severity pills)
   ═══════════════════════════════════════════════════════════════════════ */
.eb-toolbar {
  display: flex; flex-direction: column; gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--att-glass);
  border: 1px solid rgba(251, 146, 60, 0.42);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 6px 16px -14px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
[data-theme="light"] .eb-toolbar {
  border-color: rgba(194, 65, 12, 0.40);
  background: rgba(255, 250, 240, 0.85);
  box-shadow:
    0 6px 16px -14px rgba(40, 25, 10, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.eb-toolbar-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap;
}
.eb-toolbar-left { display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.eb-toolbar-right { display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.eb-toolbar-divider {
  width: 1px; height: 22px;
  background: rgba(251, 146, 60, 0.32);
  margin: 0 4px;
}
[data-theme="light"] .eb-toolbar-divider { background: rgba(180, 83, 9, 0.32); }

.eb-date {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(251, 146, 60, 0.40);
  color: var(--hr-text);
  font: inherit; font-size: 11.5px; font-weight: 700;
  cursor: pointer;
}
.eb-date svg { color: #fcd34d; }
[data-theme="light"] .eb-date { background: rgba(255, 250, 240, 0.85); border-color: rgba(194, 65, 12, 0.40); color: var(--hr-text); }
[data-theme="light"] .eb-date svg { color: #b45309; }
.eb-date-input {
  border: 0; background: transparent;
  color: inherit; font: inherit;
  color-scheme: dark;
  outline: none;
  font-variant-numeric: tabular-nums;
}
[data-theme="light"] .eb-date-input { color-scheme: light; }

/* Toggle switch */
.eb-toggle {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(251, 146, 60, 0.32);
  color: var(--hr-text-muted);
  font: inherit; font-size: 11px; font-weight: 700;
  cursor: pointer;
  transition: background .2s, color .2s, border-color .2s;
}
.eb-toggle input { display: none; }
.eb-toggle:hover { color: var(--hr-text); border-color: rgba(251, 146, 60, 0.55); }
.eb-toggle.active {
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.20), rgba(234, 88, 12, 0.14));
  color: #fdba74;
  border-color: rgba(251, 146, 60, 0.65);
}
[data-theme="light"] .eb-toggle {
  background: rgba(255, 250, 240, 0.60);
  border-color: rgba(194, 65, 12, 0.30);
  color: #6b5840;
}
[data-theme="light"] .eb-toggle:hover { color: var(--hr-text); border-color: rgba(194, 65, 12, 0.55); }
[data-theme="light"] .eb-toggle.active {
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.22), rgba(194, 65, 12, 0.16));
  color: #9a3412;
  border-color: rgba(194, 65, 12, 0.65);
}
.eb-toggle-knob {
  position: relative;
  width: 28px; height: 14px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.30);
  border: 1px solid rgba(148, 163, 184, 0.45);
  transition: background .2s, border-color .2s;
}
[data-theme="light"] .eb-toggle-knob { background: rgba(120, 53, 15, 0.18); border-color: rgba(120, 53, 15, 0.30); }
.eb-toggle-knob-dot {
  position: absolute; top: 1px; left: 1px;
  width: 10px; height: 10px;
  border-radius: 50%;
  background: #fff;
  transition: transform .25s var(--att-spring), background .2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.30);
}
.eb-toggle.active .eb-toggle-knob {
  background: linear-gradient(135deg, #fbbf24, #ea580c);
  border-color: rgba(234, 88, 12, 0.55);
}
.eb-toggle.active .eb-toggle-knob-dot {
  transform: translateX(14px);
  background: #1f1408;
}
[data-theme="light"] .eb-toggle.active .eb-toggle-knob {
  background: linear-gradient(135deg, #d97706, #c2410c);
  border-color: rgba(180, 83, 9, 0.65);
}
[data-theme="light"] .eb-toggle.active .eb-toggle-knob-dot { background: #fff; }
.eb-toggle-label {
  display: inline-flex; align-items: center; gap: 5px;
  letter-spacing: 0.3px;
}

/* Search */
.eb-search {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(251, 146, 60, 0.40);
  font-size: 11.5px;
}
.eb-search svg { color: var(--hr-text-muted); }
.eb-search input {
  border: 0; background: transparent;
  color: var(--hr-text); font: inherit; font-size: 11.5px;
  outline: none;
  width: 180px;
}
.eb-search input::placeholder { color: var(--hr-text-muted); }
[data-theme="light"] .eb-search { background: rgba(255, 250, 240, 0.85); border-color: rgba(194, 65, 12, 0.40); }
[data-theme="light"] .eb-search svg { color: #6b5840; }
.eb-search-clear {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; border-radius: 4px;
  background: transparent; border: 0;
  color: var(--hr-text-muted); cursor: pointer;
}
.eb-search-clear:hover { background: rgba(239, 68, 68, 0.16); color: #fca5a5; }

/* Buttons */
.eb-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px;
  border-radius: 10px;
  font: inherit; font-size: 11.5px; font-weight: 800; letter-spacing: 0.3px;
  border: 1px solid;
  cursor: pointer;
  transition: background .2s, color .2s, border-color .2s, box-shadow .25s, transform .2s;
}
.eb-btn-primary {
  background: linear-gradient(135deg, #fdba74 0%, #fb923c 50%, #ea580c 100%);
  background-size: 200% 200%;
  color: #1f1408;
  border-color: rgba(194, 65, 12, 0.55);
  box-shadow: 0 8px 20px -10px rgba(234, 88, 12, 0.60);
}
.eb-btn-primary:hover:not(:disabled) {
  background-position: 100% 50%;
  box-shadow: 0 14px 30px -10px rgba(234, 88, 12, 0.75);
}
.eb-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
[data-theme="light"] .eb-btn-primary {
  background: linear-gradient(135deg, #fb923c, #ea580c 50%, #9a3412);
  background-size: 200% 200%;
  color: #fff;
  border-color: rgba(154, 52, 18, 0.65);
}
.eb-btn-ghost {
  background: rgba(255, 255, 255, 0.04);
  color: var(--hr-text-secondary);
  border-color: rgba(251, 146, 60, 0.40);
}
.eb-btn-ghost:hover:not(:disabled) {
  background: rgba(251, 146, 60, 0.10);
  border-color: rgba(251, 146, 60, 0.65);
  color: var(--hr-text);
}
.eb-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
[data-theme="light"] .eb-btn-ghost {
  background: rgba(255, 250, 240, 0.78);
  border-color: rgba(194, 65, 12, 0.40);
  color: var(--hr-text-secondary);
}
[data-theme="light"] .eb-btn-ghost:hover:not(:disabled) {
  background: rgba(251, 146, 60, 0.14);
  border-color: rgba(194, 65, 12, 0.65);
  color: var(--hr-text);
}
.spinning { animation: eb-spin 0.9s linear infinite; }
@keyframes eb-spin { to { transform: rotate(360deg); } }

/* Severity pill row */
.eb-pill-row {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding-top: 8px;
  border-top: 1px dashed rgba(251, 146, 60, 0.22);
}
[data-theme="light"] .eb-pill-row { border-top-color: rgba(194, 65, 12, 0.28); }
.eb-pill-row-label {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 9.5px; letter-spacing: 1.4px; text-transform: uppercase;
  font-weight: 800;
  color: var(--hr-text-muted);
}
.eb-pill-row-label svg { color: #fb923c; }
[data-theme="light"] .eb-pill-row-label svg { color: #c2410c; }
.eb-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(251, 146, 60, 0.28);
  color: var(--hr-text-muted);
  font: inherit; font-size: 10.5px; font-weight: 800;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: background .2s, color .2s, border-color .2s;
}
.eb-pill:hover { border-color: var(--accent, #fb923c); color: var(--accent, #fdba74); }
.eb-pill.active {
  background: linear-gradient(135deg, var(--accent, #fdba74), var(--accent-light, #fb923c));
  color: #1f1408;
  border-color: var(--accent, #fb923c);
  box-shadow: 0 4px 12px -4px var(--accent-shadow, rgba(234, 88, 12, 0.50));
}
[data-theme="light"] .eb-pill { background: rgba(255, 250, 240, 0.6); border-color: rgba(194, 65, 12, 0.28); color: #6b5840; }
[data-theme="light"] .eb-pill:hover { color: var(--accent-light, #c2410c); }
[data-theme="light"] .eb-pill.active {
  background: linear-gradient(135deg, var(--accent-light, #c2410c), var(--accent, #fb923c));
  color: #fff;
}
.eb-pill-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent, #fb923c); box-shadow: 0 0 4px currentColor; }
.eb-pill-count {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 16px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 9.5px; font-weight: 800;
  background: rgba(0, 0, 0, 0.22);
  color: inherit;
}
.eb-pill.active .eb-pill-count { background: rgba(31, 20, 8, 0.22); }
[data-theme="light"] .eb-pill-count { background: rgba(120, 53, 15, 0.10); }
[data-theme="light"] .eb-pill.active .eb-pill-count { background: rgba(255, 255, 255, 0.30); }

/* ═══════════════════════════════════════════════════════════════════════
   ROW LIST
   ═══════════════════════════════════════════════════════════════════════ */
.eb-list { display: flex; flex-direction: column; gap: 12px; }
.eb-row {
  position: relative;
  display: grid;
  grid-template-columns: 260px 1fr auto;
  grid-template-rows: auto auto;
  grid-template-areas:
    "identity gauge sev"
    "timeline timeline timeline";
  column-gap: 18px;
  row-gap: 10px;
  padding: 16px 20px;
  border-radius: 18px;
  background:
    linear-gradient(165deg, rgba(28, 22, 18, 0.85), rgba(20, 16, 14, 0.95));
  border: 1px solid rgba(251, 146, 60, 0.42);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 12px 32px -18px rgba(0, 0, 0, 0.50),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  isolation: isolate; overflow: hidden;
  transition: border-color .3s, box-shadow .3s, transform .25s;
}
[data-theme="light"] .eb-row {
  background:
    linear-gradient(165deg, rgba(255, 250, 240, 0.96), rgba(254, 243, 199, 0.55));
  border-color: rgba(194, 65, 12, 0.42);
  box-shadow:
    0 12px 32px -18px rgba(40, 25, 10, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.65);
}
.eb-row:hover {
  border-color: rgba(251, 146, 60, 0.75);
  box-shadow: 0 22px 44px -22px rgba(234, 88, 12, 0.45);
}
[data-theme="light"] .eb-row:hover {
  border-color: rgba(194, 65, 12, 0.65);
  box-shadow: 0 22px 44px -22px rgba(194, 65, 12, 0.30);
}
.eb-row.is-mild       { border-left: 4px solid #fbbf24; }
.eb-row.is-severe     { border-left: 4px solid #f59e0b; }
.eb-row.is-critical   { border-left: 4px solid #ef4444; }
.eb-row.is-within_cap { border-left: 4px solid #10b981; }
.eb-row.has-open {
  outline: 2px dashed rgba(252, 211, 77, 0.55);
  outline-offset: -4px;
}
.eb-row-aurora {
  position: absolute; inset: -30% 60% -30% -20%;
  background: radial-gradient(50% 80% at 30% 50%, rgba(251, 146, 60, 0.18), transparent 70%);
  filter: blur(40px); z-index: -1; opacity: 0;
  transition: opacity .35s; pointer-events: none;
}
.eb-row:hover .eb-row-aurora { opacity: 1; }
.eb-row.is-critical .eb-row-aurora { background: radial-gradient(50% 80% at 30% 50%, rgba(239, 68, 68, 0.22), transparent 70%); }
.eb-row.is-within_cap .eb-row-aurora { background: radial-gradient(50% 80% at 30% 50%, rgba(16, 185, 129, 0.18), transparent 70%); }
[data-theme="light"] .eb-row-aurora { background: radial-gradient(50% 80% at 30% 50%, rgba(194, 65, 12, 0.14), transparent 70%); }

/* Identity */
.eb-identity {
  grid-area: identity;
  display: flex; align-items: center; gap: 12px; min-width: 0;
}
.eb-avatar {
  position: relative;
  width: 44px; height: 44px;
  border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  background: linear-gradient(135deg, #fde68a 0%, #fb923c 50%, #ea580c 100%);
  color: #1f1408;
  font-size: 13px; font-weight: 900; letter-spacing: 0.3px;
  border: 2px solid rgba(234, 88, 12, 0.55);
  box-shadow: 0 6px 16px -6px rgba(234, 88, 12, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.55);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.30);
}
[data-theme="light"] .eb-avatar {
  background: linear-gradient(135deg, #fb923c 0%, #ea580c 50%, #9a3412 100%);
  color: #fff;
  border-color: rgba(154, 52, 18, 0.60);
  text-shadow: 0 1px 0 rgba(120, 53, 15, 0.40);
}
.eb-avatar-ring {
  position: absolute; inset: -4px;
  border-radius: 50%;
  border: 1px dashed rgba(251, 146, 60, 0.55);
  animation: att-ring-rotate 24s linear infinite;
}
[data-theme="light"] .eb-avatar-ring { border-color: rgba(194, 65, 12, 0.50); }
.eb-avatar-text { position: relative; z-index: 1; }

.eb-id-meta { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.eb-emp-name {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 13.5px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.1px;
}
.eb-on-break-flag {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 8.5px; font-weight: 900; letter-spacing: 1.2px;
  background: rgba(252, 211, 77, 0.16);
  border: 1px solid rgba(252, 211, 77, 0.55);
  color: #fde68a;
  animation: eb-on-break-throb 1.6s ease-in-out infinite;
}
[data-theme="light"] .eb-on-break-flag {
  background: rgba(252, 211, 77, 0.28);
  border-color: rgba(217, 119, 6, 0.55);
  color: #b45309;
}
@keyframes eb-on-break-throb {
  0%, 100% { box-shadow: 0 0 0 0 rgba(252, 211, 77, 0.45); }
  50%      { box-shadow: 0 0 0 6px rgba(252, 211, 77, 0); }
}
.eb-on-break-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #fcd34d;
  box-shadow: 0 0 6px #fcd34d;
}
.eb-emp-sub {
  display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap;
  font-size: 10.5px;
  color: var(--hr-text-muted);
}
.eb-mono { font-family: var(--hr-mono); font-variant-numeric: tabular-nums; }
.eb-dept, .eb-shift {
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.3px;
  text-transform: uppercase;
}
.eb-dept {
  background: rgba(251, 191, 36, 0.14);
  color: #fcd34d;
  border: 1px solid rgba(251, 191, 36, 0.32);
}
.eb-shift {
  background: rgba(20, 184, 166, 0.14);
  color: #5eead4;
  border: 1px solid rgba(13, 148, 136, 0.32);
}
[data-theme="light"] .eb-dept { background: rgba(251, 191, 36, 0.22); color: #92400e; border-color: rgba(180, 83, 9, 0.40); }
[data-theme="light"] .eb-shift { background: rgba(20, 184, 166, 0.20); color: #115e59; border-color: rgba(15, 118, 110, 0.40); }

/* Gauge */
.eb-gauge { grid-area: gauge; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.eb-gauge-meta {
  display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;
  font-family: var(--hr-mono); font-variant-numeric: tabular-nums;
}
.eb-gauge-actual { font-size: 20px; font-weight: 900; color: var(--hr-text); letter-spacing: -0.4px; }
.eb-gauge-slash { font-size: 13px; color: var(--hr-text-muted); }
.eb-gauge-cap { font-size: 11.5px; color: var(--hr-text-muted); }
.eb-gauge-delta {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 10.5px; font-weight: 800;
  border: 1px solid;
  font-family: inherit;
}
.eb-gauge-delta.is-mild       { background: rgba(251, 191, 36, 0.18); color: #fde68a; border-color: rgba(251, 191, 36, 0.50); }
.eb-gauge-delta.is-severe     { background: rgba(245, 158, 11, 0.20); color: #fdba74; border-color: rgba(245, 158, 11, 0.55); }
.eb-gauge-delta.is-critical   { background: rgba(239, 68, 68, 0.22); color: #fca5a5; border-color: rgba(239, 68, 68, 0.60); }
.eb-gauge-delta.is-within_cap { background: rgba(16, 185, 129, 0.18); color: #5eead4; border-color: rgba(16, 185, 129, 0.55); }
[data-theme="light"] .eb-gauge-delta.is-mild       { background: rgba(251, 191, 36, 0.26); color: #92400e; border-color: rgba(180, 83, 9, 0.55); }
[data-theme="light"] .eb-gauge-delta.is-severe     { background: rgba(245, 158, 11, 0.24); color: #9a3412; border-color: rgba(194, 65, 12, 0.55); }
[data-theme="light"] .eb-gauge-delta.is-critical   { background: rgba(239, 68, 68, 0.22); color: #7f1d1d; border-color: rgba(185, 28, 28, 0.55); }
[data-theme="light"] .eb-gauge-delta.is-within_cap { background: rgba(16, 185, 129, 0.20); color: #065f46; border-color: rgba(5, 150, 105, 0.55); }

.eb-gauge-bar {
  position: relative;
  height: 12px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
  border: 1px solid rgba(148, 163, 184, 0.32);
  overflow: visible;
}
[data-theme="light"] .eb-gauge-bar { background: rgba(120, 53, 15, 0.10); border-color: rgba(120, 53, 15, 0.18); }
.eb-gauge-fill {
  position: absolute; left: 0; top: 0; bottom: 0;
  border-radius: 999px;
  background: linear-gradient(90deg, #fcd34d, #fb923c 50%, #ef4444);
  background-size: 200% 100%;
  animation: eb-gauge-flow 3.5s linear infinite;
  box-shadow: 0 0 14px rgba(251, 146, 60, 0.55);
  display: block;
}
@keyframes eb-gauge-flow {
  0%   { background-position: 0% 0; }
  100% { background-position: 200% 0; }
}
.eb-row.is-mild       .eb-gauge-fill { background: linear-gradient(90deg, #fde68a, #fbbf24, #f59e0b); background-size: 200% 100%; box-shadow: 0 0 14px rgba(251, 191, 36, 0.55); }
.eb-row.is-severe     .eb-gauge-fill { background: linear-gradient(90deg, #fde68a, #fb923c, #ea580c); background-size: 200% 100%; box-shadow: 0 0 14px rgba(245, 158, 11, 0.55); }
.eb-row.is-critical   .eb-gauge-fill { background: linear-gradient(90deg, #fbbf24, #ef4444 60%, #7f1d1d); background-size: 200% 100%; box-shadow: 0 0 16px rgba(239, 68, 68, 0.70); }
.eb-row.is-within_cap .eb-gauge-fill { background: linear-gradient(90deg, #5eead4, #10b981, #047857); background-size: 200% 100%; box-shadow: 0 0 14px rgba(16, 185, 129, 0.55); }
.eb-gauge-cap-mark {
  position: absolute; top: -3px; bottom: -3px;
  width: 2px;
  background: rgba(255, 255, 255, 0.90);
  border-radius: 1px;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.45);
}
[data-theme="light"] .eb-gauge-cap-mark { background: rgba(40, 25, 10, 0.85); box-shadow: 0 0 6px rgba(255, 255, 255, 0.85); }
.eb-gauge-scale {
  position: relative;
  display: flex; justify-content: space-between;
  font-size: 9px; font-weight: 700; letter-spacing: 0.4px;
  text-transform: uppercase;
  color: var(--hr-text-muted);
  height: 14px;
}
.eb-cap-label {
  position: absolute;
  transform: translateX(-50%);
  color: var(--hr-text-secondary);
  font-weight: 800;
}
[data-theme="light"] .eb-cap-label { color: #6b5840; }

/* Severity badge column */
.eb-sev-cell {
  grid-area: sev;
  display: flex; flex-direction: column; align-items: flex-end; gap: 6px;
}
.eb-sev-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 11px;
  border-radius: 999px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;
  border: 1px solid;
}
.eb-sev-badge-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; box-shadow: 0 0 6px currentColor; }
.eb-sev-badge.is-mild       { background: rgba(251, 191, 36, 0.18); color: #fde68a; border-color: rgba(251, 191, 36, 0.50); }
.eb-sev-badge.is-severe     { background: rgba(245, 158, 11, 0.22); color: #fdba74; border-color: rgba(245, 158, 11, 0.55); }
.eb-sev-badge.is-critical   { background: rgba(239, 68, 68, 0.22); color: #fca5a5; border-color: rgba(239, 68, 68, 0.60); animation: eb-critical-throb 2.2s ease-in-out infinite; }
.eb-sev-badge.is-within_cap { background: rgba(16, 185, 129, 0.18); color: #5eead4; border-color: rgba(16, 185, 129, 0.55); }
[data-theme="light"] .eb-sev-badge.is-mild       { background: rgba(251, 191, 36, 0.26); color: #92400e; border-color: rgba(180, 83, 9, 0.55); }
[data-theme="light"] .eb-sev-badge.is-severe     { background: rgba(245, 158, 11, 0.24); color: #9a3412; border-color: rgba(194, 65, 12, 0.55); }
[data-theme="light"] .eb-sev-badge.is-critical   { background: rgba(239, 68, 68, 0.22); color: #7f1d1d; border-color: rgba(185, 28, 28, 0.55); }
[data-theme="light"] .eb-sev-badge.is-within_cap { background: rgba(16, 185, 129, 0.20); color: #065f46; border-color: rgba(5, 150, 105, 0.55); }
@keyframes eb-critical-throb {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.45); }
  50%      { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
}
.eb-segments-tag {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.4px;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.30);
  color: var(--hr-text-muted);
}
.eb-segments-tag svg { color: #fcd34d; }
[data-theme="light"] .eb-segments-tag { background: rgba(251, 191, 36, 0.18); border-color: rgba(180, 83, 9, 0.30); color: #6b5840; }
[data-theme="light"] .eb-segments-tag svg { color: #b45309; }

/* Timeline */
.eb-timeline {
  grid-area: timeline;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px dashed rgba(251, 146, 60, 0.28);
}
[data-theme="light"] .eb-timeline { background: rgba(255, 250, 240, 0.55); border-color: rgba(194, 65, 12, 0.30); }
.eb-timeline-empty {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 12px;
  font-size: 11px;
  color: var(--hr-text-muted);
  font-style: italic;
}
.eb-timeline-empty svg { color: #fcd34d; }
[data-theme="light"] .eb-timeline-empty svg { color: #b45309; }

.eb-timeline-head {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;
  color: var(--hr-text-muted);
  margin-bottom: 6px;
}
.eb-timeline-head svg { color: #fb923c; }
[data-theme="light"] .eb-timeline-head svg { color: #c2410c; }
.eb-timeline-count {
  margin-left: auto;
  padding: 1px 6px; border-radius: 6px;
  background: rgba(251, 146, 60, 0.18);
  color: #fdba74;
  font-size: 9.5px; font-weight: 800;
}
[data-theme="light"] .eb-timeline-count { background: rgba(194, 65, 12, 0.18); color: #9a3412; }

.eb-segments { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
.eb-segment {
  display: grid; grid-template-columns: 1fr auto auto;
  gap: 10px;
  align-items: center;
  font-size: 10.5px;
}
.eb-seg-bar {
  position: relative;
  height: 7px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
  overflow: hidden;
}
.eb-seg-fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #fcd34d, #f59e0b);
  border-radius: 999px;
  transition: width 0.6s var(--att-spring);
}
.eb-segment.is-long .eb-seg-fill { background: linear-gradient(90deg, #fb923c, #ef4444); }
.eb-segment.is-over-window .eb-seg-fill { background: linear-gradient(90deg, #ef4444, #7f1d1d); }
.eb-segment.is-open .eb-seg-fill {
  background: repeating-linear-gradient(45deg, #f59e0b, #f59e0b 4px, #fbbf24 4px, #fbbf24 8px);
  animation: eb-stripe-shift 1.4s linear infinite;
}
@keyframes eb-stripe-shift { from { background-position: 0 0; } to { background-position: 16px 0; } }
[data-theme="light"] .eb-seg-bar { background: rgba(120, 53, 15, 0.10); }
.eb-seg-time { color: var(--hr-text); font-size: 10.5px; }
.eb-seg-open-flag {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 9px; font-weight: 800; letter-spacing: 0.7px;
  background: rgba(252, 211, 77, 0.18);
  border: 1px solid rgba(252, 211, 77, 0.45);
  color: #fcd34d;
}
[data-theme="light"] .eb-seg-open-flag { background: rgba(252, 211, 77, 0.28); border-color: rgba(180, 83, 9, 0.45); color: #92400e; }
.eb-seg-dur { color: var(--hr-text-muted); font-size: 10.5px; font-weight: 800; }
.eb-segment.is-long .eb-seg-dur { color: #fca5a5; }
.eb-segment.is-over-window .eb-seg-dur { color: #fca5a5; }
[data-theme="light"] .eb-segment.is-long .eb-seg-dur { color: #b91c1c; }
[data-theme="light"] .eb-segment.is-over-window .eb-seg-dur { color: #7f1d1d; }

/* ═══════════════════════════════════════════════════════════════════════
   EMPTY STATE
   ═══════════════════════════════════════════════════════════════════════ */
.eb-empty {
  position: relative;
  padding: 56px 28px 44px;
  border-radius: 22px;
  background: var(--att-glass);
  border: 1px solid rgba(251, 146, 60, 0.42);
  backdrop-filter: var(--att-glass-blur);
  text-align: center;
  overflow: hidden;
  isolation: isolate;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
}
[data-theme="light"] .eb-empty {
  border-color: rgba(194, 65, 12, 0.42);
  background: rgba(255, 250, 240, 0.88);
  box-shadow: 0 22px 50px -28px rgba(40, 25, 10, 0.18);
}
.eb-empty-aurora {
  position: absolute; inset: -40%;
  background:
    radial-gradient(50% 30% at 50% 30%, rgba(251, 146, 60, 0.20), transparent 60%),
    radial-gradient(40% 25% at 30% 70%, rgba(20, 184, 166, 0.12), transparent 60%),
    radial-gradient(40% 25% at 70% 70%, rgba(251, 191, 36, 0.16), transparent 60%);
  filter: blur(40px);
  pointer-events: none;
  animation: att-warm-aurora 20s ease-in-out infinite;
  z-index: 0;
}
.eb-empty > *:not(.eb-empty-aurora) { position: relative; z-index: 1; }
.eb-empty-illustration {
  position: relative;
  width: 140px; height: 140px;
  display: flex; align-items: center; justify-content: center;
}
.eb-empty-grid-bg {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(251, 146, 60, 0.16) 1px, transparent 1px),
    linear-gradient(90deg, rgba(251, 146, 60, 0.16) 1px, transparent 1px);
  background-size: 14px 14px;
  mask-image: radial-gradient(70% 70% at 50% 50%, #000 30%, transparent 80%);
  border-radius: 50%;
  pointer-events: none;
}
[data-theme="light"] .eb-empty-grid-bg {
  background-image:
    linear-gradient(rgba(194, 65, 12, 0.18) 1px, transparent 1px),
    linear-gradient(90deg, rgba(194, 65, 12, 0.18) 1px, transparent 1px);
}
.eb-empty-icon {
  color: #fb923c;
  filter: drop-shadow(0 0 14px rgba(251, 146, 60, 0.55));
  z-index: 2;
}
[data-theme="light"] .eb-empty-icon { color: #c2410c; filter: drop-shadow(0 0 14px rgba(194, 65, 12, 0.45)); }
.eb-empty-ring {
  position: absolute; top: 50%; left: 50%;
  border-radius: 50%;
  border: 1.4px solid rgba(251, 146, 60, 0.45);
  transform: translate(-50%, -50%) scale(1);
  opacity: 0;
  animation: att-pulse-emanate 4s ease-out infinite;
  pointer-events: none;
}
.eb-empty-ring.r1 { width: 120px; height: 120px; animation-delay: 0s; }
.eb-empty-ring.r2 { width: 120px; height: 120px; animation-delay: 1.3s; }
.eb-empty-ring.r3 { width: 120px; height: 120px; animation-delay: 2.6s; }
[data-theme="light"] .eb-empty-ring { border-color: rgba(194, 65, 12, 0.45); }

.eb-empty h3 { margin: 6px 0 0; font-size: 17px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.2px; }
.eb-empty p  { margin: 0 0 6px; font-size: 12px; color: var(--hr-text-muted); max-width: 540px; line-height: 1.55; }
.eb-empty-actions { display: inline-flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin: 4px 0 6px; }
.eb-empty-meta {
  display: inline-flex; align-items: center; gap: 6px;
  margin-top: 6px;
  padding: 5px 12px; border-radius: 999px;
  background: rgba(20, 184, 166, 0.14);
  border: 1px solid rgba(13, 148, 136, 0.45);
  font-size: 10px; font-weight: 800; letter-spacing: 1.2px;
  color: #5eead4; text-transform: uppercase;
}
[data-theme="light"] .eb-empty-meta {
  background: rgba(13, 148, 136, 0.16);
  border-color: rgba(15, 118, 110, 0.55);
  color: #115e59;
}
.eb-empty-meta-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #5eead4;
  box-shadow: 0 0 6px #5eead4;
  animation: att-live-pulse 2.2s ease-in-out infinite;
}
[data-theme="light"] .eb-empty-meta-dot { background: #0f766e; box-shadow: 0 0 6px #0f766e; }

/* Responsive */
@media (max-width: 1100px) {
  .eb-banner-text { padding-right: 0; }
  .eb-cluster { position: relative; top: auto; right: auto; transform: none; margin: 18px auto 0; }
}
@media (max-width: 880px) {
  .eb-cluster { display: none; }
  .eb-row {
    grid-template-columns: 1fr;
    grid-template-areas:
      "identity"
      "sev"
      "gauge"
      "timeline";
  }
  .eb-sev-cell { align-items: flex-start; flex-direction: row; }
}
</style>
