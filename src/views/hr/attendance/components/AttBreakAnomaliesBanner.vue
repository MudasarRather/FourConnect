<template>
  <Motion as="section" class="bran" v-if="show" data-anim="bran"
    :initial="{ opacity: 0, y: -8 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }"
  >
    <!-- ═════════════ COMPACT BANNER ═════════════ -->
    <header class="bran-banner" :class="`tone-${headlineTone}`" :data-empty="!summary?.total_flagged">
      <span class="bran-glow" aria-hidden="true" />
      <span class="bran-grid" aria-hidden="true" />

      <!-- Pulse cluster on the left -->
      <div class="bran-pulse-cluster" aria-hidden="true">
        <span class="bran-pulse-ring r1" />
        <span class="bran-pulse-ring r2" />
        <span class="bran-pulse-icon">
          <Coffee :size="18" />
        </span>
      </div>

      <!-- Headline + severity counters -->
      <div class="bran-headline">
        <span class="bran-eyebrow">
          <span class="bran-eyebrow-dot" />
          Break-time watch · daily compliance
        </span>
        <h3 class="bran-title">
          <template v-if="summary?.total_flagged">
            <span class="bran-num">{{ summary.total_flagged }}</span>
            <span>{{ summary.total_flagged === 1 ? 'employee' : 'employees' }} over the cap</span>
          </template>
          <template v-else>
            <span>All breaks within policy</span>
          </template>
        </h3>
        <p class="bran-sub" v-if="summary?.total_flagged">
          <strong>{{ formatMin(summary.total_excess_minutes) }}</strong> of excess time accumulated ·
          avg overage <strong>{{ Math.round(summary.avg_overage_ratio * 100) }}%</strong> of cap
        </p>
        <p class="bran-sub" v-else>
          No employees exceeded their shift's break cap today. Logged breaks are compared against
          <strong>shift.break_minutes</strong> daily.
        </p>
      </div>

      <!-- Severity chips + toggle -->
      <div class="bran-meta">
        <div class="bran-sev-chips" v-if="summary?.total_flagged">
          <Motion as="span" class="bran-sev-chip is-critical" v-if="summary.critical_count"
            :whileHover="{ y: -1, scale: 1.04 }"
          >
            <span class="bran-sev-dot" />
            <span class="bran-sev-num">{{ summary.critical_count }}</span>
            <span class="bran-sev-label">Critical</span>
          </Motion>
          <Motion as="span" class="bran-sev-chip is-severe" v-if="summary.severe_count"
            :whileHover="{ y: -1, scale: 1.04 }"
          >
            <span class="bran-sev-dot" />
            <span class="bran-sev-num">{{ summary.severe_count }}</span>
            <span class="bran-sev-label">Severe</span>
          </Motion>
          <Motion as="span" class="bran-sev-chip is-mild" v-if="summary.mild_count"
            :whileHover="{ y: -1, scale: 1.04 }"
          >
            <span class="bran-sev-dot" />
            <span class="bran-sev-num">{{ summary.mild_count }}</span>
            <span class="bran-sev-label">Mild</span>
          </Motion>
        </div>
        <Motion as="button" class="bran-toggle"
          :class="{ open: expanded }"
          :disabled="!summary?.total_flagged"
          :whileHover="summary?.total_flagged ? { y: -1, scale: 1.03 } : {}"
          :whileTap="summary?.total_flagged ? { scale: 0.96 } : {}"
          @click="expanded = !expanded"
        >
          <component :is="expanded ? ChevronUp : ChevronDown" :size="13" />
          <span>{{ expanded ? 'Hide' : 'Investigate' }}</span>
        </Motion>
        <Motion as="button" class="bran-detail-btn"
          :whileHover="{ y: -1, scale: 1.03 }" :whileTap="{ scale: 0.96 }"
          @click="openDetailedPage"
          title="Open the full Excess-Breaks workspace (includes within-cap & open-break employees)"
        >
          <ArrowUpRight :size="13" />
          <span>Detailed view</span>
        </Motion>
      </div>
    </header>

    <!-- ═════════════ EXPANDABLE DETAIL PANEL ═════════════ -->
    <transition name="bran-expand">
      <div v-if="expanded && summary?.total_flagged" class="bran-panel">
        <!-- Severity filter pills -->
        <div class="bran-filter-row">
          <div class="bran-filters">
            <button v-for="f in SEV_FILTERS" :key="f.key || 'all'"
              :class="['bran-filter-pill', { active: severityFilter === f.key }]"
              @click="severityFilter = f.key"
            >
              <span class="bran-filter-dot" :style="{ background: f.dot }" />
              {{ f.label }}
              <span class="bran-filter-count">{{ f.count }}</span>
            </button>
          </div>
          <span class="bran-filter-meta" v-if="summary">
            <Hourglass :size="11" />
            {{ filteredItems.length }} {{ filteredItems.length === 1 ? 'row' : 'rows' }} ·
            {{ formatMin(filteredExcess) }} excess
          </span>
        </div>

        <!-- Anomaly cards -->
        <div class="bran-cards">
          <Motion v-for="(r, i) in filteredItems" :key="r.employee_id + '-' + i" as="article"
            :class="['bran-card', `is-${r.severity.toLowerCase()}`]"
            :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.36, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }"
            :whileHover="{ y: -2 }"
          >
            <span class="bran-card-aurora" aria-hidden="true" />

            <!-- Header strip: employee + severity badge -->
            <header class="bran-card-head">
              <div class="bran-card-emp">
                <span class="bran-card-avatar">{{ initials(r.employee_name) }}</span>
                <div class="bran-card-emp-text">
                  <div class="bran-card-emp-name">{{ r.employee_name || 'Unknown' }}</div>
                  <div class="bran-card-emp-sub">
                    <span v-if="r.employee_code" class="att-mono">{{ r.employee_code }}</span>
                    <span v-if="r.department_name" class="bran-dept-pill">{{ r.department_name }}</span>
                  </div>
                </div>
              </div>
              <span :class="['bran-sev-badge', `is-${r.severity.toLowerCase()}`]">
                <span class="bran-sev-badge-dot" />
                {{ r.severity }}
              </span>
            </header>

            <!-- Gauge: cap vs actual -->
            <div class="bran-gauge">
              <div class="bran-gauge-meta">
                <div class="bran-gauge-num">
                  <span class="gauge-actual">{{ formatMin(r.break_actual_minutes) }}</span>
                  <span class="gauge-slash">/</span>
                  <span class="gauge-cap">{{ formatMin(r.break_cap_minutes) }} cap</span>
                </div>
                <div class="bran-gauge-tag">
                  <TrendingUp :size="11" />
                  <span><strong>{{ formatMin(r.excess_minutes) }}</strong> over · {{ Math.round(r.overage_ratio * 100) }}% of cap</span>
                </div>
              </div>
              <div class="bran-gauge-bar">
                <Motion class="bran-gauge-fill"
                  :initial="{ width: '0%' }"
                  :animate="{ width: gaugePct(r) + '%' }"
                  :transition="{ duration: 0.85, delay: 0.12 + 0.04 * i, ease: [0.22, 1, 0.36, 1] }"
                />
                <span class="bran-gauge-cap-mark" :style="{ left: capMarkPct(r) + '%' }" />
              </div>
              <div class="bran-gauge-scale">
                <span>0</span>
                <span class="cap-label" :style="{ left: capMarkPct(r) + '%' }">cap</span>
                <span>{{ Math.max(r.break_actual_minutes, r.break_cap_minutes * 2) }}m</span>
              </div>
            </div>

            <!-- Break-segment timeline -->
            <div class="bran-timeline" v-if="r.segments?.length">
              <div class="bran-timeline-head">
                <Coffee :size="10" />
                <span>Break segments</span>
                <span class="bran-timeline-count">{{ r.segments.length }}</span>
              </div>
              <ul class="bran-segments">
                <li v-for="(s, si) in r.segments" :key="si"
                  :class="['bran-segment', { 'is-long': s.minutes > r.break_cap_minutes, 'is-over-window': s.is_over_window, 'is-open': s.is_open }]"
                  :style="{ '--seg-width': Math.min(100, (s.minutes / Math.max(r.break_actual_minutes, 1)) * 100) + '%' }"
                >
                  <span class="seg-bar">
                    <span class="seg-fill" :style="{ width: 'var(--seg-width)' }" />
                  </span>
                  <span class="seg-time att-mono">{{ formatTime(s.start) }}<span v-if="s.end"> → {{ formatTime(s.end) }}</span><span v-else> · open</span></span>
                  <span class="seg-dur att-mono">{{ Math.round(s.minutes) }}m</span>
                </li>
              </ul>
            </div>
          </Motion>
        </div>
      </div>
    </transition>
  </Motion>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Motion } from 'motion-v'
import { ChevronDown, ChevronUp, Coffee, TrendingUp, Hourglass, ArrowUpRight } from 'lucide-vue-next'
import { fetchBreakAnomalies } from '../composables/useAttendance'

const router = useRouter()
const openDetailedPage = () => {
  router.push({ name: 'HrAttendanceTab', params: { tab: 'excess-breaks' } })
}

const props = defineProps({
  date: { type: String, default: '' },  // YYYY-MM-DD
  show: { type: Boolean, default: true },
})

const summary = ref(null)
const items = ref([])
const expanded = ref(false)
const severityFilter = ref(null)
const loading = ref(false)

const SEV_FILTERS = computed(() => [
  { key: null,       label: 'All',      dot: '#94a3b8', count: items.value.length },
  { key: 'CRITICAL', label: 'Critical', dot: '#ef4444', count: items.value.filter(r => r.severity === 'CRITICAL').length },
  { key: 'SEVERE',   label: 'Severe',   dot: '#f59e0b', count: items.value.filter(r => r.severity === 'SEVERE').length },
  { key: 'MILD',     label: 'Mild',     dot: '#fbbf24', count: items.value.filter(r => r.severity === 'MILD').length },
])

const filteredItems = computed(() => {
  if (!severityFilter.value) return items.value
  return items.value.filter(r => r.severity === severityFilter.value)
})

const filteredExcess = computed(() => filteredItems.value.reduce((a, r) => a + (r.excess_minutes || 0), 0))

const headlineTone = computed(() => {
  if (!summary.value || summary.value.total_flagged === 0) return 'calm'
  if (summary.value.critical_count > 0) return 'critical'
  if (summary.value.severe_count > 0) return 'severe'
  return 'mild'
})

const reload = async () => {
  if (!props.date) return
  loading.value = true
  try {
    const data = await fetchBreakAnomalies({ on_date: props.date, limit: 200 })
    summary.value = data.summary
    items.value = data.items || []
  } catch (e) {
    // Silent — banner just won't render if the call fails. Don't toast since
    // this is auxiliary info, not a primary action surface.
    summary.value = null
    items.value = []
  } finally { loading.value = false }
}

watch(() => props.date, reload, { immediate: true })

const initials = (n) => (n || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'
const formatMin = (m) => {
  const n = Math.round(m || 0)
  if (n < 60) return `${n}m`
  const h = Math.floor(n / 60), r = n % 60
  return r ? `${h}h ${r}m` : `${h}h`
}
const formatTime = (iso) => {
  if (!iso) return '--:--'
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
// Gauge fill: actual / max(2x cap, actual) — keeps the cap-mark always visible
// before the end of the bar even when the user is way over.
const gaugePct = (r) => {
  const max = Math.max(r.break_cap_minutes * 2, r.break_actual_minutes || 0, 1)
  return Math.min(100, (r.break_actual_minutes / max) * 100)
}
const capMarkPct = (r) => {
  const max = Math.max(r.break_cap_minutes * 2, r.break_actual_minutes || 0, 1)
  return Math.min(100, (r.break_cap_minutes / max) * 100)
}

defineExpose({ reload })
</script>

<style scoped>
@import '../../../../styles/attendance-theme.css';

/* ═════════════════════════════════════════════════════════════════════
   BANNER SHELL
   ═════════════════════════════════════════════════════════════════════ */
.bran { display: flex; flex-direction: column; gap: 12px; }

.bran-banner {
  position: relative; isolation: isolate; overflow: hidden;
  display: grid; grid-template-columns: auto 1fr auto;
  gap: 18px;
  align-items: center;
  padding: 16px 20px;
  border-radius: 18px;
  background:
    radial-gradient(120% 110% at 100% 0%, rgba(239, 68, 68, 0.14), transparent 60%),
    radial-gradient(100% 110% at 0% 110%, rgba(251, 191, 36, 0.14), transparent 65%),
    var(--att-glass);
  border: 1px solid rgba(239, 68, 68, 0.45);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 14px 36px -18px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  transition: border-color .4s var(--att-spring), box-shadow .4s;
}
.bran-banner.tone-calm {
  background:
    radial-gradient(120% 110% at 100% 0%, rgba(16, 185, 129, 0.12), transparent 60%),
    radial-gradient(100% 110% at 0% 110%, rgba(20, 184, 166, 0.10), transparent 65%),
    var(--att-glass);
  border-color: rgba(16, 185, 129, 0.42);
}
.bran-banner.tone-mild { border-color: rgba(251, 191, 36, 0.55); }
.bran-banner.tone-severe { border-color: rgba(245, 158, 11, 0.60); }
.bran-banner.tone-critical { border-color: rgba(239, 68, 68, 0.65); }

[data-theme="light"] .bran-banner {
  background:
    radial-gradient(120% 110% at 100% 0%, rgba(220, 38, 38, 0.10), transparent 60%),
    radial-gradient(100% 110% at 0% 110%, rgba(217, 119, 6, 0.10), transparent 65%),
    rgba(255, 250, 240, 0.92);
  border-color: rgba(220, 38, 38, 0.42);
  box-shadow:
    0 14px 30px -18px rgba(120, 53, 15, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.50);
}
[data-theme="light"] .bran-banner.tone-calm {
  background:
    radial-gradient(120% 110% at 100% 0%, rgba(13, 148, 136, 0.10), transparent 60%),
    radial-gradient(100% 110% at 0% 110%, rgba(15, 118, 110, 0.08), transparent 65%),
    rgba(255, 250, 240, 0.92);
  border-color: rgba(13, 148, 136, 0.42);
}
[data-theme="light"] .bran-banner.tone-mild { border-color: rgba(217, 119, 6, 0.50); }
[data-theme="light"] .bran-banner.tone-severe { border-color: rgba(194, 65, 12, 0.55); }
[data-theme="light"] .bran-banner.tone-critical { border-color: rgba(185, 28, 28, 0.55); }

.bran-glow {
  position: absolute; inset: -40% -10% auto -10%;
  height: 140%;
  background: radial-gradient(50% 50% at 50% 50%, rgba(239, 68, 68, 0.16), transparent 60%);
  filter: blur(50px);
  z-index: 0; pointer-events: none;
  animation: att-aurora 14s ease-in-out infinite;
}
.bran-banner.tone-calm .bran-glow { background: radial-gradient(50% 50% at 50% 50%, rgba(16, 185, 129, 0.12), transparent 60%); }
.bran-banner.tone-mild .bran-glow { background: radial-gradient(50% 50% at 50% 50%, rgba(251, 191, 36, 0.16), transparent 60%); }
.bran-banner.tone-severe .bran-glow { background: radial-gradient(50% 50% at 50% 50%, rgba(245, 158, 11, 0.18), transparent 60%); }

.bran-grid {
  position: absolute; inset: 0;
  background-image: radial-gradient(rgba(239, 68, 68, 0.08) 0.8px, transparent 1px);
  background-size: 16px 16px;
  mask-image: linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.15) 70%);
  z-index: 0; pointer-events: none; opacity: 0.6;
}
[data-theme="light"] .bran-grid {
  background-image: radial-gradient(rgba(180, 83, 9, 0.10) 0.8px, transparent 1px);
}

/* Pulse cluster (left) */
.bran-pulse-cluster {
  position: relative; z-index: 2;
  width: 56px; height: 56px;
  display: grid; place-items: center;
  flex-shrink: 0;
}
.bran-pulse-icon {
  position: relative; z-index: 3;
  width: 38px; height: 38px;
  border-radius: 50%;
  display: grid; place-items: center;
  background: linear-gradient(135deg, #fbbf24 0%, #ef4444 100%);
  color: #fff;
  box-shadow:
    0 6px 16px -4px rgba(239, 68, 68, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.35);
}
.bran-banner.tone-calm .bran-pulse-icon { background: linear-gradient(135deg, #2dd4bf 0%, #14b8a6 100%); box-shadow: 0 6px 16px -4px rgba(13, 148, 136, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.35); }
.bran-banner.tone-mild .bran-pulse-icon { background: linear-gradient(135deg, #fde68a 0%, #fbbf24 100%); color: #422006; }
.bran-banner.tone-severe .bran-pulse-icon { background: linear-gradient(135deg, #fbbf24 0%, #ea580c 100%); }
.bran-banner.tone-critical .bran-pulse-icon { background: linear-gradient(135deg, #ef4444 0%, #991b1b 100%); }

.bran-pulse-ring {
  position: absolute; inset: 0;
  border-radius: 50%;
  border: 1.5px solid rgba(239, 68, 68, 0.65);
  opacity: 0;
  pointer-events: none;
  animation: bran-pulse 2.4s ease-out infinite;
}
.bran-pulse-ring.r2 { animation-delay: 1.2s; }
.bran-banner.tone-calm .bran-pulse-ring { border-color: rgba(20, 184, 166, 0.60); }
.bran-banner.tone-mild .bran-pulse-ring { border-color: rgba(251, 191, 36, 0.60); }
.bran-banner.tone-severe .bran-pulse-ring { border-color: rgba(245, 158, 11, 0.65); }
@keyframes bran-pulse {
  0%   { transform: scale(0.8); opacity: 0.65; }
  100% { transform: scale(2.0); opacity: 0; }
}

/* Headline */
.bran-headline { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.bran-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; letter-spacing: 1.7px; text-transform: uppercase;
  font-weight: 800;
  color: #fca5a5;
}
.bran-banner.tone-calm .bran-eyebrow { color: #5eead4; }
.bran-banner.tone-mild .bran-eyebrow { color: #fde68a; }
.bran-banner.tone-severe .bran-eyebrow { color: #fdba74; }
[data-theme="light"] .bran-eyebrow { color: #991b1b; }
[data-theme="light"] .bran-banner.tone-calm .bran-eyebrow { color: #0f766e; }
[data-theme="light"] .bran-banner.tone-mild .bran-eyebrow { color: #92400e; }
[data-theme="light"] .bran-banner.tone-severe .bran-eyebrow { color: #9a3412; }
.bran-eyebrow-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 6px currentColor;
  animation: att-live-pulse 2s ease-in-out infinite;
}

.bran-title {
  margin: 0;
  font-size: 18px; font-weight: 900; letter-spacing: -0.3px;
  color: var(--hr-text);
  display: inline-flex; align-items: baseline; gap: 8px;
}
.bran-num {
  font-size: 26px; font-weight: 900;
  letter-spacing: -0.6px;
  background: linear-gradient(135deg, #fca5a5, #ef4444, #991b1b);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  font-variant-numeric: tabular-nums;
}
.bran-banner.tone-calm .bran-num { background: linear-gradient(135deg, #5eead4, #14b8a6); -webkit-background-clip: text; background-clip: text; }
.bran-banner.tone-mild .bran-num { background: linear-gradient(135deg, #fde68a, #fbbf24); -webkit-background-clip: text; background-clip: text; }
.bran-banner.tone-severe .bran-num { background: linear-gradient(135deg, #fdba74, #ea580c); -webkit-background-clip: text; background-clip: text; }
[data-theme="light"] .bran-num { background: linear-gradient(135deg, #b91c1c, #7f1d1d); -webkit-background-clip: text; background-clip: text; }
[data-theme="light"] .bran-banner.tone-calm .bran-num { background: linear-gradient(135deg, #0d9488, #0f766e); -webkit-background-clip: text; background-clip: text; }
[data-theme="light"] .bran-banner.tone-mild .bran-num { background: linear-gradient(135deg, #d97706, #b45309); -webkit-background-clip: text; background-clip: text; }
[data-theme="light"] .bran-banner.tone-severe .bran-num { background: linear-gradient(135deg, #ea580c, #9a3412); -webkit-background-clip: text; background-clip: text; }

.bran-sub {
  margin: 0;
  font-size: 12px; line-height: 1.5;
  color: var(--hr-text-muted);
}
.bran-sub strong { color: var(--hr-text); font-weight: 700; }
[data-theme="light"] .bran-sub { color: #6b5840; }
[data-theme="light"] .bran-sub strong { color: #1a1410; }

/* Severity chips cluster (right) */
.bran-meta {
  position: relative; z-index: 2;
  display: flex; align-items: center; gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.bran-sev-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.bran-sev-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 10.5px; font-weight: 800; letter-spacing: 0.3px;
  border: 1px solid;
  cursor: default;
}
.bran-sev-chip.is-mild { background: rgba(251, 191, 36, 0.18); color: #fde68a; border-color: rgba(251, 191, 36, 0.45); }
.bran-sev-chip.is-severe { background: rgba(245, 158, 11, 0.20); color: #fdba74; border-color: rgba(245, 158, 11, 0.50); }
.bran-sev-chip.is-critical {
  background: rgba(239, 68, 68, 0.20); color: #fca5a5; border-color: rgba(239, 68, 68, 0.55);
  animation: bran-critical-throb 2.2s ease-in-out infinite;
}
[data-theme="light"] .bran-sev-chip.is-mild { background: rgba(251, 191, 36, 0.24); color: #92400e; border-color: rgba(217, 119, 6, 0.45); }
[data-theme="light"] .bran-sev-chip.is-severe { background: rgba(245, 158, 11, 0.24); color: #9a3412; border-color: rgba(194, 65, 12, 0.55); }
[data-theme="light"] .bran-sev-chip.is-critical { background: rgba(239, 68, 68, 0.20); color: #7f1d1d; border-color: rgba(185, 28, 28, 0.55); }
@keyframes bran-critical-throb {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.45); }
  50%      { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
}
.bran-sev-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; box-shadow: 0 0 6px currentColor; }
.bran-sev-num { font-size: 12px; font-weight: 900; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.bran-sev-label { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.8px; }

.bran-toggle {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 13px;
  border-radius: 10px;
  background: linear-gradient(135deg, #fca5a5 0%, #ef4444 50%, #991b1b 100%);
  background-size: 200% 200%;
  color: #fff;
  font: inherit; font-size: 11.5px; font-weight: 800; letter-spacing: 0.3px;
  border: 1px solid rgba(185, 28, 28, 0.60);
  cursor: pointer;
  box-shadow: 0 8px 18px -8px rgba(239, 68, 68, 0.65);
  transition: background-position .35s, box-shadow .25s;
}
.bran-toggle:hover:not(:disabled) { background-position: 100% 50%; box-shadow: 0 14px 26px -10px rgba(239, 68, 68, 0.85); }
.bran-toggle:disabled {
  background: rgba(148, 163, 184, 0.16);
  color: var(--hr-text-muted);
  border-color: rgba(148, 163, 184, 0.32);
  cursor: not-allowed; box-shadow: none;
}
.bran-banner.tone-calm .bran-toggle:disabled { background: rgba(16, 185, 129, 0.16); color: #5eead4; border-color: rgba(16, 185, 129, 0.40); }

/* Secondary CTA — opens the full Excess-Breaks workspace page. */
.bran-detail-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 7px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(251, 191, 36, 0.40);
  color: var(--hr-text-secondary);
  font: inherit; font-size: 11px; font-weight: 800; letter-spacing: 0.3px;
  cursor: pointer;
  transition: background .2s, color .2s, border-color .2s, box-shadow .25s;
}
.bran-detail-btn:hover {
  background: rgba(251, 191, 36, 0.14);
  border-color: rgba(251, 191, 36, 0.65);
  color: #fcd34d;
  box-shadow: 0 6px 16px -8px rgba(251, 191, 36, 0.50);
}
[data-theme="light"] .bran-detail-btn {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(180, 83, 9, 0.40);
  color: #6b5840;
}
[data-theme="light"] .bran-detail-btn:hover {
  background: rgba(251, 191, 36, 0.18);
  border-color: rgba(180, 83, 9, 0.65);
  color: #b45309;
}
.bran-banner.tone-mild .bran-toggle { background: linear-gradient(135deg, #fde68a, #fbbf24 55%, #d97706); color: #422006; border-color: rgba(217, 119, 6, 0.60); }
.bran-banner.tone-severe .bran-toggle { background: linear-gradient(135deg, #fdba74, #f59e0b 55%, #c2410c); color: #fff; }
[data-theme="light"] .bran-toggle { background: linear-gradient(135deg, #ef4444, #b91c1c 55%, #7f1d1d); color: #fff; border-color: rgba(153, 27, 27, 0.55); }
[data-theme="light"] .bran-banner.tone-calm .bran-toggle:disabled { background: rgba(13, 148, 136, 0.14); color: #0f766e; border-color: rgba(13, 148, 136, 0.35); }
[data-theme="light"] .bran-banner.tone-mild .bran-toggle { background: linear-gradient(135deg, #fbbf24, #d97706 55%, #92400e); color: #fff; }
[data-theme="light"] .bran-banner.tone-severe .bran-toggle { background: linear-gradient(135deg, #f59e0b, #c2410c 55%, #7c2d12); color: #fff; }

/* ═════════════════════════════════════════════════════════════════════
   EXPANDABLE PANEL
   ═════════════════════════════════════════════════════════════════════ */
.bran-panel {
  display: flex; flex-direction: column; gap: 12px;
  padding: 14px 16px;
  border-radius: 16px;
  background:
    radial-gradient(100% 70% at 100% 0%, rgba(239, 68, 68, 0.06), transparent 65%),
    var(--att-glass);
  border: 1px solid rgba(239, 68, 68, 0.32);
  backdrop-filter: var(--att-glass-blur);
}
[data-theme="light"] .bran-panel {
  background:
    radial-gradient(100% 70% at 100% 0%, rgba(220, 38, 38, 0.06), transparent 65%),
    rgba(255, 250, 240, 0.92);
  border-color: rgba(220, 38, 38, 0.32);
  box-shadow: 0 14px 30px -18px rgba(120, 53, 15, 0.20);
}

.bran-filter-row {
  display: flex; justify-content: space-between; align-items: center;
  gap: 10px; flex-wrap: wrap;
  padding-bottom: 4px;
  border-bottom: 1px dashed rgba(239, 68, 68, 0.20);
}
[data-theme="light"] .bran-filter-row { border-bottom-color: rgba(220, 38, 38, 0.25); }
.bran-filters { display: flex; gap: 5px; flex-wrap: wrap; }
.bran-filter-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(239, 68, 68, 0.24);
  color: var(--hr-text-muted);
  font: inherit; font-size: 11px; font-weight: 700;
  cursor: pointer;
  transition: background .2s, border-color .2s, color .2s, transform .18s;
}
.bran-filter-pill:hover { transform: translateY(-1px); color: var(--hr-text); }
.bran-filter-pill.active {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.20), rgba(185, 28, 28, 0.18));
  color: var(--hr-text);
  border-color: rgba(239, 68, 68, 0.55);
}
[data-theme="light"] .bran-filter-pill {
  background: rgba(255, 250, 240, 0.65);
  border-color: rgba(220, 38, 38, 0.26);
  color: #6b5840;
}
[data-theme="light"] .bran-filter-pill.active {
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.18), rgba(153, 27, 27, 0.14));
  color: #7f1d1d;
  border-color: rgba(185, 28, 28, 0.55);
}
.bran-filter-dot { width: 6px; height: 6px; border-radius: 50%; }
.bran-filter-count {
  margin-left: 4px;
  padding: 1px 6px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.20);
  font-size: 10px; font-weight: 800;
}
[data-theme="light"] .bran-filter-count { background: rgba(255, 255, 255, 0.50); }

.bran-filter-meta {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.3px; text-transform: uppercase;
  color: var(--hr-text-muted);
}
.bran-filter-meta svg { color: #fca5a5; }
[data-theme="light"] .bran-filter-meta { color: #6b5840; }
[data-theme="light"] .bran-filter-meta svg { color: #b91c1c; }

/* ═════════════════════════════════════════════════════════════════════
   CARDS
   ═════════════════════════════════════════════════════════════════════ */
.bran-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
  gap: 12px;
}
.bran-card {
  position: relative;
  display: flex; flex-direction: column; gap: 10px;
  padding: 14px;
  border-radius: 14px;
  background:
    linear-gradient(165deg, rgba(28, 22, 18, 0.78), rgba(20, 16, 14, 0.92));
  border: 1px solid rgba(239, 68, 68, 0.40);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 10px 26px -16px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  isolation: isolate; overflow: hidden;
  transition: border-color .3s, box-shadow .3s, transform .25s;
}
.bran-card.is-mild { border-color: rgba(251, 191, 36, 0.45); border-left: 3px solid #fbbf24; }
.bran-card.is-severe { border-color: rgba(245, 158, 11, 0.55); border-left: 3px solid #f59e0b; }
.bran-card.is-critical { border-color: rgba(239, 68, 68, 0.60); border-left: 3px solid #ef4444; }
.bran-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 36px -16px rgba(0, 0, 0, 0.6);
}
[data-theme="light"] .bran-card {
  background:
    linear-gradient(165deg, rgba(255, 250, 240, 0.96), rgba(255, 243, 224, 0.78));
  box-shadow:
    0 10px 26px -16px rgba(120, 53, 15, 0.20),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
[data-theme="light"] .bran-card.is-mild { border-color: rgba(217, 119, 6, 0.55); }
[data-theme="light"] .bran-card.is-severe { border-color: rgba(194, 65, 12, 0.55); }
[data-theme="light"] .bran-card.is-critical { border-color: rgba(185, 28, 28, 0.60); }

.bran-card-aurora {
  position: absolute; inset: -40% 60% -40% -20%;
  background: radial-gradient(40% 80% at 30% 50%, rgba(239, 68, 68, 0.20), transparent 70%);
  filter: blur(40px); z-index: -1; opacity: 0;
  transition: opacity .35s; pointer-events: none;
}
.bran-card.is-mild .bran-card-aurora { background: radial-gradient(40% 80% at 30% 50%, rgba(251, 191, 36, 0.18), transparent 70%); }
.bran-card.is-severe .bran-card-aurora { background: radial-gradient(40% 80% at 30% 50%, rgba(245, 158, 11, 0.20), transparent 70%); }
.bran-card:hover .bran-card-aurora { opacity: 1; }

.bran-card-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px;
}
.bran-card-emp { display: flex; align-items: center; gap: 10px; min-width: 0; }
.bran-card-avatar {
  width: 36px; height: 36px;
  border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #fbbf24 0%, #ea580c 100%);
  color: #1f0c02; font-size: 12px; font-weight: 800;
  border: 1.5px solid rgba(234, 88, 12, 0.55);
  box-shadow: 0 5px 14px -4px rgba(234, 88, 12, 0.55);
  flex-shrink: 0;
}
.bran-card.is-critical .bran-card-avatar { background: linear-gradient(135deg, #fca5a5 0%, #b91c1c 100%); color: #fff; border-color: rgba(185, 28, 28, 0.55); }
[data-theme="light"] .bran-card-avatar { color: #fff; background: linear-gradient(135deg, #d97706 0%, #c2410c 100%); }
[data-theme="light"] .bran-card.is-critical .bran-card-avatar { background: linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%); }
.bran-card-emp-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.bran-card-emp-name { font-size: 13.5px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.1px; }
.bran-card-emp-sub { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; font-size: 10.5px; color: var(--hr-text-muted); }
.bran-dept-pill {
  font-size: 9.5px; padding: 1px 7px; border-radius: 999px;
  background: rgba(251, 191, 36, 0.14); color: var(--att-yellow-200, #fcd34d);
  border: 1px solid rgba(251, 191, 36, 0.32);
  font-weight: 700; letter-spacing: 0.3px; text-transform: uppercase;
}
[data-theme="light"] .bran-dept-pill { background: rgba(251, 191, 36, 0.20); color: #92400e; border-color: rgba(217, 119, 6, 0.40); }

.bran-sev-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;
  border: 1px solid;
  flex-shrink: 0;
}
.bran-sev-badge-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; box-shadow: 0 0 6px currentColor; }
.bran-sev-badge.is-mild { background: rgba(251, 191, 36, 0.18); color: #fde68a; border-color: rgba(251, 191, 36, 0.50); }
.bran-sev-badge.is-severe { background: rgba(245, 158, 11, 0.22); color: #fdba74; border-color: rgba(245, 158, 11, 0.55); }
.bran-sev-badge.is-critical { background: rgba(239, 68, 68, 0.22); color: #fca5a5; border-color: rgba(239, 68, 68, 0.60); }
[data-theme="light"] .bran-sev-badge.is-mild { background: rgba(251, 191, 36, 0.24); color: #92400e; border-color: rgba(217, 119, 6, 0.55); }
[data-theme="light"] .bran-sev-badge.is-severe { background: rgba(245, 158, 11, 0.22); color: #9a3412; border-color: rgba(194, 65, 12, 0.55); }
[data-theme="light"] .bran-sev-badge.is-critical { background: rgba(239, 68, 68, 0.22); color: #7f1d1d; border-color: rgba(185, 28, 28, 0.55); }

/* Gauge */
.bran-gauge { display: flex; flex-direction: column; gap: 6px; }
.bran-gauge-meta { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.bran-gauge-num {
  display: inline-flex; align-items: baseline; gap: 6px;
  font-family: var(--hr-mono, monospace);
  font-variant-numeric: tabular-nums;
}
.gauge-actual { font-size: 18px; font-weight: 900; color: var(--hr-text); letter-spacing: -0.4px; }
.gauge-slash { font-size: 12px; color: var(--hr-text-muted); }
.gauge-cap { font-size: 11px; color: var(--hr-text-muted); }
.bran-gauge-tag {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 10.5px; color: var(--hr-text-muted);
}
.bran-gauge-tag strong { color: #fca5a5; font-weight: 800; }
.bran-gauge-tag svg { color: #fca5a5; }
.bran-card.is-mild .bran-gauge-tag strong, .bran-card.is-mild .bran-gauge-tag svg { color: #fcd34d; }
.bran-card.is-severe .bran-gauge-tag strong, .bran-card.is-severe .bran-gauge-tag svg { color: #fdba74; }
[data-theme="light"] .bran-gauge-tag strong, [data-theme="light"] .bran-gauge-tag svg { color: #b91c1c; }
[data-theme="light"] .bran-card.is-mild .bran-gauge-tag strong, [data-theme="light"] .bran-card.is-mild .bran-gauge-tag svg { color: #92400e; }
[data-theme="light"] .bran-card.is-severe .bran-gauge-tag strong, [data-theme="light"] .bran-card.is-severe .bran-gauge-tag svg { color: #9a3412; }

.bran-gauge-bar {
  position: relative;
  height: 10px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
  border: 1px solid rgba(148, 163, 184, 0.30);
  overflow: visible;
}
[data-theme="light"] .bran-gauge-bar { background: rgba(120, 53, 15, 0.10); border-color: rgba(120, 53, 15, 0.18); }
.bran-gauge-fill {
  position: absolute; left: 0; top: 0; bottom: 0;
  border-radius: 999px;
  background: linear-gradient(90deg, #fcd34d, #fb923c 50%, #ef4444);
  box-shadow: 0 0 14px rgba(239, 68, 68, 0.65);
  display: block;
}
.bran-card.is-mild .bran-gauge-fill { background: linear-gradient(90deg, #fde68a, #fbbf24, #f59e0b); box-shadow: 0 0 14px rgba(251, 191, 36, 0.5); }
.bran-card.is-severe .bran-gauge-fill { background: linear-gradient(90deg, #fde68a, #fb923c, #ea580c); box-shadow: 0 0 14px rgba(245, 158, 11, 0.55); }
.bran-card.is-critical .bran-gauge-fill { background: linear-gradient(90deg, #fbbf24, #ef4444 60%, #7f1d1d); box-shadow: 0 0 14px rgba(239, 68, 68, 0.7); }
.bran-gauge-cap-mark {
  position: absolute; top: -3px; bottom: -3px;
  width: 2px;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 1px;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.45);
}
[data-theme="light"] .bran-gauge-cap-mark { background: rgba(40, 25, 10, 0.85); box-shadow: 0 0 6px rgba(255, 255, 255, 0.85); }

.bran-gauge-scale {
  position: relative;
  display: flex; justify-content: space-between;
  font-size: 9px; font-weight: 700; letter-spacing: 0.4px;
  text-transform: uppercase;
  color: var(--hr-text-muted);
  height: 12px;
}
.cap-label {
  position: absolute;
  transform: translateX(-50%);
  color: var(--hr-text-secondary);
  font-weight: 800;
}
[data-theme="light"] .cap-label { color: #6b5840; }

/* Break-segment timeline */
.bran-timeline {
  margin-top: 4px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px dashed rgba(239, 68, 68, 0.28);
}
[data-theme="light"] .bran-timeline { background: rgba(255, 250, 240, 0.55); border-color: rgba(220, 38, 38, 0.30); }
.bran-timeline-head {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;
  color: var(--hr-text-muted);
  margin-bottom: 5px;
}
.bran-timeline-head svg { color: #fca5a5; }
[data-theme="light"] .bran-timeline-head svg { color: #b91c1c; }
.bran-timeline-count {
  margin-left: auto;
  padding: 1px 6px; border-radius: 6px;
  background: rgba(239, 68, 68, 0.18);
  color: #fca5a5;
  font-size: 9.5px; font-weight: 800;
}
[data-theme="light"] .bran-timeline-count { background: rgba(220, 38, 38, 0.18); color: #7f1d1d; }

.bran-segments { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
.bran-segment {
  display: grid; grid-template-columns: 1fr auto auto;
  gap: 8px;
  align-items: center;
  font-size: 10.5px;
}
.seg-bar {
  position: relative;
  height: 6px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
  overflow: hidden;
}
.seg-fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #fcd34d, #f59e0b);
  border-radius: 999px;
  transition: width 0.6s var(--att-spring);
}
.bran-segment.is-long .seg-fill { background: linear-gradient(90deg, #fb923c, #ef4444); }
.bran-segment.is-over-window .seg-fill { background: linear-gradient(90deg, #ef4444, #7f1d1d); }
.bran-segment.is-open .seg-fill { background: repeating-linear-gradient(45deg, #f59e0b, #f59e0b 4px, #fbbf24 4px, #fbbf24 8px); animation: bran-stripe-shift 1.4s linear infinite; }
@keyframes bran-stripe-shift {
  from { background-position: 0 0; }
  to   { background-position: 16px 0; }
}
[data-theme="light"] .seg-bar { background: rgba(120, 53, 15, 0.10); }
.seg-time { color: var(--hr-text); font-size: 10px; }
.seg-dur { color: var(--hr-text-muted); font-size: 10px; font-weight: 800; }
.bran-segment.is-long .seg-dur { color: #fca5a5; }
.bran-segment.is-over-window .seg-dur { color: #fca5a5; }
[data-theme="light"] .bran-segment.is-long .seg-dur { color: #b91c1c; }
[data-theme="light"] .bran-segment.is-over-window .seg-dur { color: #7f1d1d; }

.att-mono { font-family: var(--hr-mono, monospace); font-variant-numeric: tabular-nums; }

/* Expand/collapse transition */
.bran-expand-enter-active, .bran-expand-leave-active {
  transition: opacity 0.32s var(--att-spring), max-height 0.32s var(--att-spring), transform 0.32s var(--att-spring);
  overflow: hidden;
}
.bran-expand-enter-from, .bran-expand-leave-to {
  opacity: 0; max-height: 0; transform: translateY(-4px);
}
.bran-expand-enter-to, .bran-expand-leave-from {
  opacity: 1; max-height: 2000px;
}

@media (max-width: 720px) {
  .bran-banner { grid-template-columns: 1fr; }
  .bran-meta { justify-content: flex-start; }
  .bran-cards { grid-template-columns: 1fr; }
}
</style>
