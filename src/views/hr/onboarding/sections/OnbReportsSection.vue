<template>
  <section class="onb-rep">
    <Motion as="header" class="onb-section-banner rp-banner"
      :initial="{ opacity: 0, y: -10 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }"
    >
      <span class="onb-section-banner-glow" />
      <div class="onb-section-banner-text">
        <span class="onb-eyebrow"><span class="onb-eyebrow-dot" /> Five operational lenses</span>
        <h2 class="onb-banner-title">
          <span class="id-title-word">Onboarding</span>
          <span class="banner-divider">·</span>
          <span class="id-title-word" style="animation-delay: 80ms">Reports</span>
        </h2>
        <p class="onb-banner-sub">Trends, missing docs, asset coverage, and probation gates — five operational reports to keep the joining motion accountable.</p>
      </div>
      <div class="onb-banner-aside">
        <div class="onb-banner-stat">
          <span class="onb-banner-stat-value">{{ pending.length }}</span>
          <span class="onb-banner-stat-label">Pending</span>
        </div>
        <div class="onb-banner-stat">
          <span class="onb-banner-stat-value">{{ probation.length }}</span>
          <span class="onb-banner-stat-label">Probation</span>
        </div>
        <button class="onb-btn-ghost rp-banner-refresh" @click="reload"><RefreshCw :size="13" />Refresh</button>
      </div>
    </Motion>

    <div class="rp-grid">
      <!-- Joining trend -->
      <Motion as="article" class="rp-card rp-trend"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }"
      >
        <header class="rp-card-head">
          <div>
            <h3 class="rp-card-title">Joining trend</h3>
            <p class="rp-card-sub">last 6 months · total {{ trendTotal }}</p>
          </div>
          <span class="rp-card-pill">{{ trendMax }} peak</span>
        </header>
        <div class="rp-trend-body">
          <!-- background grid -->
          <div class="rp-grid-lines" aria-hidden="true">
            <span v-for="n in 4" :key="n" />
          </div>
          <Motion v-for="(m, i) in joiningSummary" :key="m.label" as="div" class="bar" :class="{ 'is-zero': !m.count }"
            :initial="{ scaleY: 0, opacity: 0 }" :animate="{ scaleY: 1, opacity: 1 }"
            :transition="{ duration: 0.7, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] }"
          >
            <div class="bar-count" :class="{ 'is-zero': !m.count }">{{ m.count }}</div>
            <div class="bar-track">
              <div class="bar-fill" :style="{ height: barHeight(m.count) + '%' }"></div>
            </div>
            <div class="bar-label">{{ m.label }}</div>
          </Motion>
        </div>
      </Motion>

      <!-- Missing documents -->
      <Motion as="article" class="rp-card rp-docs"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.45, delay: 0.06, ease: [0.22, 1, 0.36, 1] }"
      >
        <header class="rp-card-head">
          <h3 class="rp-card-title">Missing documents</h3>
        </header>
        <ul class="rp-list">
          <Motion v-for="(r, i) in missingDocs" :key="r.document" as="li"
            :initial="{ opacity: 0, x: -6 }" :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.3, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }"
          >
            <span class="rp-name">{{ r.document }}</span>
            <span class="rp-bar"><span class="rp-bar-fill" :style="{ width: missingPct(r.count) + '%' }"></span></span>
            <span class="rp-count">{{ r.count }}</span>
          </Motion>
          <li v-if="!missingDocs.length" class="rp-empty">All documents collected.</li>
        </ul>
      </Motion>

      <!-- Asset allocation -->
      <Motion as="article" class="rp-card rp-stat"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.45, delay: 0.12, ease: [0.22, 1, 0.36, 1] }"
      >
        <header class="rp-card-head">
          <h3 class="rp-card-title">Asset allocations</h3>
        </header>
        <div class="rp-stat-body">
          <div class="rp-stat-value">{{ assets.total_allocated || 0 }}</div>
          <div class="rp-stat-label">Currently allocated</div>
        </div>
      </Motion>

      <!-- Pending onboarding (table) -->
      <Motion as="article" class="rp-card rp-table"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.45, delay: 0.18, ease: [0.22, 1, 0.36, 1] }"
      >
        <header class="rp-card-head">
          <h3 class="rp-card-title">Pending onboarding</h3>
          <p class="rp-card-sub">All in-progress processes</p>
        </header>
        <ul class="rp-rows">
          <li class="rp-row rp-row-head">
            <span>Employee</span><span>Department</span><span>Stage</span><span>Progress</span><span>Joining</span>
          </li>
          <Motion v-for="(p, i) in pending" :key="p.id" as="li" class="rp-row"
            :initial="{ opacity: 0, x: -6 }" :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.3, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }"
          >
            <span>{{ p.employee_name }}</span>
            <span>{{ p.department || '—' }}</span>
            <span class="onb-mono">{{ p.current_stage }}</span>
            <span class="rp-pg">
              <span class="rp-pg-bar"><span class="rp-pg-fill" :style="{ width: p.progress_pct + '%' }"></span></span>
              <span class="rp-pg-pct">{{ p.progress_pct }}%</span>
            </span>
            <span class="onb-mono">{{ p.target_joining_date || '—' }}</span>
          </Motion>
          <li v-if="!pending.length" class="rp-empty">No pending onboardings.</li>
        </ul>
      </Motion>

      <!-- Probation list -->
      <Motion as="article" class="rp-card rp-prob"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.45, delay: 0.24, ease: [0.22, 1, 0.36, 1] }"
      >
        <header class="rp-card-head">
          <h3 class="rp-card-title">Probation employees</h3>
        </header>
        <ul class="rp-list-2">
          <Motion v-for="(e, i) in probation" :key="e.id" as="li"
            :initial="{ opacity: 0, x: -6 }" :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.3, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }"
          >
            <div>
              <div class="rp-name">{{ e.name }}</div>
              <div class="onb-mono">{{ e.employee_id }}</div>
            </div>
            <span class="onb-mono">{{ e.confirmation_date || 'TBD' }}</span>
          </Motion>
          <li v-if="!probation.length" class="rp-empty">Nobody on probation.</li>
        </ul>
      </Motion>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { RefreshCw } from 'lucide-vue-next'
import { fetchReport } from '../composables/useOnbMisc'
import { useToast } from 'vue-toastification'

const toast = useToast()
const joiningSummary = ref([])
const missingDocs = ref([])
const pending = ref([])
const probation = ref([])
const assets = ref({ total_allocated: 0 })

const reload = async () => {
  try {
    const [a, b, c, d, e] = await Promise.all([
      fetchReport('joining-summary'), fetchReport('missing-documents'),
      fetchReport('pending-onboarding'), fetchReport('probation'),
      fetchReport('asset-allocation'),
    ])
    joiningSummary.value = a.months || []
    missingDocs.value = b.items || []
    pending.value = c.items || []
    probation.value = d.items || []
    assets.value = e
  } catch { toast.error('Could not load reports') }
}
onMounted(reload)

const trendMax = computed(() => Math.max(1, ...joiningSummary.value.map(m => m.count)))
const trendTotal = computed(() => joiningSummary.value.reduce((sum, m) => sum + (m.count || 0), 0))
const barHeight = (c) => {
  if (!c) return 4  // visible "empty" baseline
  return Math.max(14, Math.round((c / trendMax.value) * 92))
}
const docsMax = computed(() => Math.max(1, ...missingDocs.value.map(r => r.count)))
const missingPct = (c) => Math.round((c / docsMax.value) * 100)
</script>

<style scoped>
@import '../../../../styles/onboarding-theme.css';

.onb-rep { display: flex; flex-direction: column; gap: 16px; }

.rp-banner .banner-divider {
  display: inline-block; margin: 0 6px;
  color: var(--hr-text-dim); font-weight: 400;
  -webkit-text-fill-color: var(--hr-text-dim);
}
.rp-banner-refresh { align-self: flex-end; }

.rp-grid {
  display: grid; grid-template-columns: 1.4fr 1fr 0.8fr; gap: 16px;
}
@media (max-width: 1200px) { .rp-grid { grid-template-columns: 1fr 1fr; } .rp-stat { grid-column: span 2; } }
@media (max-width: 800px) { .rp-grid { grid-template-columns: 1fr; } .rp-stat { grid-column: 1; } }

.rp-card {
  position: relative;
  background: var(--onb-glass);
  border: var(--onb-glass-stroke);
  border-radius: 22px;
  overflow: hidden;
  display: flex; flex-direction: column;
  backdrop-filter: var(--onb-glass-blur);
  -webkit-backdrop-filter: var(--onb-glass-blur);
  box-shadow: var(--onb-glass-shadow);
  isolation: isolate;
  transition: border-color .3s var(--hr-spring), box-shadow .3s var(--hr-spring), transform .3s var(--hr-spring);
}
.rp-card::before {
  content: ''; position: absolute; inset: 0;
  background:
    linear-gradient(160deg, rgba(255,255,255,0.06), transparent 35%),
    radial-gradient(60% 50% at 100% 0%, rgba(251, 146, 60, 0.08), transparent 70%);
  pointer-events: none; z-index: -1;
}
.rp-card:hover { border-color: rgba(251, 191, 36, 0.28); box-shadow: var(--onb-glass-shadow-hi); }
.rp-card-head {
  display: flex; justify-content: space-between; align-items: flex-end;
  padding: 18px 22px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  gap: 14px;
}
.rp-card-title { margin: 0; font-size: 15px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.01em; }
.rp-card-sub { margin: 4px 0 0; font-size: 11.5px; color: var(--hr-text-muted); }
.rp-card-pill {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: 999px;
  background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold);
  border: 1px solid var(--hr-border-warm);
  font-size: 10px; font-weight: 800; letter-spacing: 0.6px;
}

/* Trend chart — premium bars */
.rp-trend { grid-column: span 2; }
.rp-trend-body {
  position: relative;
  display: flex; gap: 18px;
  align-items: flex-end;
  padding: 28px 28px 18px;
  height: 280px;
}
.rp-grid-lines {
  position: absolute;
  left: 28px; right: 28px;
  top: 28px; bottom: 50px;
  display: flex; flex-direction: column; justify-content: space-between;
  pointer-events: none;
}
.rp-grid-lines span {
  display: block; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.07), transparent);
}
.bar {
  position: relative;
  flex: 1; min-width: 0;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  transform-origin: bottom;
}
.bar-count {
  font-size: 14px; font-weight: 800; color: var(--hr-text);
  font-variant-numeric: tabular-nums; letter-spacing: -0.02em;
  background: linear-gradient(180deg, #fde68a, #fb923c);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
.bar-count.is-zero {
  background: none;
  -webkit-text-fill-color: var(--hr-text-dim);
  color: var(--hr-text-dim);
}
.bar-track {
  position: relative;
  width: 100%; max-width: 56px;
  height: 200px;
  display: flex; align-items: flex-end;
}
.bar-fill {
  width: 100%; min-height: 4px;
  background: linear-gradient(180deg, #fde68a 0%, #fbbf24 45%, #fb923c 100%);
  border-radius: 14px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.35),
    0 -10px 24px rgba(251, 146, 60, 0.45),
    0 6px 14px -4px rgba(251, 191, 36, 0.35);
  position: relative; overflow: hidden;
  transition: height 1.1s var(--hr-ease-quint);
}
.bar-fill::after {
  /* Glossy highlight */
  content: ''; position: absolute;
  inset: 4px 4px auto 4px;
  height: 30%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.35), transparent);
  border-radius: 10px 10px 50% 50%;
  filter: blur(2px);
}
.bar.is-zero .bar-fill {
  background: rgba(255, 255, 255, 0.06);
  border: 1px dashed rgba(255, 255, 255, 0.08);
  box-shadow: none;
}
.bar.is-zero .bar-fill::after { display: none; }
.bar-label {
  font-size: 10.5px; font-weight: 600; letter-spacing: 0.5px;
  color: var(--hr-text-muted);
  text-transform: uppercase;
}
.bar:hover .bar-fill { filter: brightness(1.08); }

/* Lists */
.rp-list, .rp-list-2 { list-style: none; margin: 0; padding: 4px 6px 6px; }
.rp-list li {
  display: grid; grid-template-columns: 1.4fr 1fr 50px;
  gap: 12px; align-items: center;
  padding: 12px 18px; margin: 2px 0;
  border-radius: 12px;
  transition: background .25s var(--hr-spring), transform .25s var(--hr-spring);
}
.rp-list li:hover { background: rgba(255, 255, 255, 0.04); transform: translateX(2px); }
.rp-list-2 li {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 18px; margin: 2px 0;
  border-radius: 12px;
  transition: background .25s var(--hr-spring);
}
.rp-list-2 li:hover { background: rgba(255, 255, 255, 0.04); }
.rp-name { font-size: 12.5px; color: var(--hr-text); font-weight: 600; }
.onb-mono { font-family: var(--hr-mono); font-size: 11px; color: var(--hr-text-muted); }
.rp-bar { display: inline-block; height: 8px; background: rgba(255,255,255,0.06); border-radius: 999px; overflow: hidden; box-shadow: inset 0 1px 0 rgba(0,0,0,0.2); }
.rp-bar-fill { display: block; height: 100%; background: var(--hr-gradient-hero); border-radius: inherit; transition: width .9s var(--hr-ease-quint); box-shadow: 0 0 8px rgba(251, 146, 60, 0.5); }
.rp-count {
  font-size: 14px; font-weight: 800; text-align: right;
  color: var(--hr-accent-gold);
  font-variant-numeric: tabular-nums;
}
.rp-empty { padding: 26px; text-align: center; font-size: 11.5px; color: var(--hr-text-dim); }

/* Stat — big number */
.rp-stat-body {
  position: relative;
  padding: 36px 22px; text-align: center;
  overflow: hidden;
}
.rp-stat-body::before {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(60% 60% at 50% 50%, rgba(251, 146, 60, 0.18), transparent 70%);
  filter: blur(20px);
  pointer-events: none;
}
.rp-stat-value {
  font-size: 64px; font-weight: 800; letter-spacing: -0.03em;
  background: linear-gradient(180deg, #fde68a 0%, #fbbf24 60%, #fb923c 100%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  font-variant-numeric: tabular-nums; line-height: 1;
  filter: drop-shadow(0 8px 24px rgba(251, 146, 60, 0.3));
}
.rp-stat-label { font-size: 10.5px; color: var(--hr-text-muted); margin-top: 10px; letter-spacing: 1px; text-transform: uppercase; font-weight: 700; }

/* Table */
.rp-table { grid-column: 1 / -1; }
.rp-rows { list-style: none; margin: 0; padding: 4px 6px 6px; }
.rp-row {
  display: grid; grid-template-columns: 1.4fr 1fr 0.8fr 1.2fr 1fr;
  gap: 12px; align-items: center;
  padding: 12px 18px; margin: 2px 0;
  border-radius: 12px;
  font-size: 12.5px; color: var(--hr-text);
  transition: background .25s var(--hr-spring), transform .25s var(--hr-spring);
}
.rp-row:not(.rp-row-head):hover { background: rgba(255, 255, 255, 0.04); transform: translateX(2px); }
.rp-row-head {
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.8px;
  text-transform: uppercase; color: var(--hr-text-muted);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0;
  padding: 14px 18px;
}
.rp-row-head:hover { background: transparent; transform: none; }
.rp-pg { display: flex; align-items: center; gap: 10px; font-size: 11.5px; color: var(--hr-text); }
.rp-pg-bar { flex: 1; height: 6px; background: rgba(255,255,255,0.06); border-radius: 999px; overflow: hidden; }
.rp-pg-fill { display: block; height: 100%; background: var(--hr-gradient-hero); border-radius: inherit; transition: width .9s var(--hr-ease-quint); box-shadow: 0 0 6px rgba(251, 146, 60, 0.4); }
.rp-pg-pct { font-weight: 800; font-variant-numeric: tabular-nums; min-width: 36px; text-align: right; }

.rp-prob { grid-column: 1 / -1; }
</style>
