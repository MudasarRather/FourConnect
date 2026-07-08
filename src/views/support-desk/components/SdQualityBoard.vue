<template>
  <section class="qb sd-card" aria-label="Resolution quality board">
    <div class="qb-head">
      <span class="qb-eyebrow sd-mono"><Gem :size="13" /> QUALITY GATE — 30-DAY RECORD</span>
      <span class="qb-count sd-mono">{{ stats.resolved_30d ?? 0 }} RESOLVED · {{ stats.reopens_30d ?? 0 }} BOUNCED</span>
    </div>

    <div class="qb-grid">
      <!-- ── CSAT ── -->
      <div class="qb-cell">
        <div class="qb-big brass">
          <b>{{ stats.csat_avg != null ? stats.csat_avg.toFixed(1) : '—' }}</b>
          <span class="qb-stars" aria-hidden="true">
            <Star v-for="n in 5" :key="n" :size="13" :class="{ lit: (stats.csat_avg || 0) >= n - 0.5 }" />
          </span>
          <i class="sd-mono">CSAT · {{ stats.csat_count ?? 0 }} RATED · {{ stats.csat_coverage_pct != null ? stats.csat_coverage_pct + '% COVERAGE' : 'NO COVERAGE' }}</i>
        </div>
        <div class="qb-dist" aria-label="Rating distribution">
          <div v-for="n in [5, 4, 3, 2, 1]" :key="n" class="qb-dl">
            <span class="dl-lb sd-mono">{{ n }}★</span>
            <span class="dl-bar"><i :class="{ low: n <= 2 }" :style="{ width: distPct(n) + '%' }" /></span>
            <span class="dl-n sd-mono">{{ dist[n] || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- ── quality meters ── -->
      <div class="qb-cell">
        <div v-for="m in meters" :key="m.key" class="qb-meter">
          <div class="qm-top">
            <span class="qm-lb sd-mono">{{ m.label }}</span>
            <b class="qm-val" :style="{ color: m.color }">{{ m.value != null ? m.value + '%' : '—' }}</b>
          </div>
          <div class="qm-track" aria-hidden="true">
            <i v-for="s in 24" :key="s" :class="{ on: m.value != null && (s / 24) * 100 <= m.value }" :style="{ '--mc': m.color }" />
          </div>
          <span class="qm-hint">{{ m.hint }}</span>
        </div>
      </div>

      <!-- ── speed ── -->
      <div class="qb-cell">
        <div class="qb-big">
          <b>{{ fmtMin(stats.mttr_p50_minutes) }}</b>
          <i class="sd-mono">MEDIAN TIME-TO-RESOLVE · PAUSE-CREDITED</i>
        </div>
        <div class="qb-chips sd-mono">
          <span class="chip"><i>P90</i><b>{{ fmtMin(stats.mttr_p90_minutes) }}</b></span>
          <span class="chip"><i>AVG</i><b>{{ fmtMin(stats.mttr_avg_minutes) }}</b></span>
          <span class="chip"><i>HANDS-ON</i><b>{{ fmtMin(stats.avg_time_spent_minutes) }}</b></span>
        </div>
        <div class="qb-pri">
          <div v-for="p in priRows" :key="p.key" class="pri-row">
            <span class="pri-lb sd-mono" :style="{ color: p.color }">{{ p.key.toUpperCase() }}</span>
            <span class="pri-bar"><i :style="{ width: p.pct + '%', background: p.color }" /></span>
            <span class="pri-v sd-mono">{{ fmtMin(p.min) }}</span>
          </div>
        </div>
      </div>

      <!-- ── 14-day trend: landed vs bounced ── -->
      <div class="qb-cell trend">
        <div class="qb-tr-head sd-mono">
          <span class="tr-lg"><i class="sw res" /> LANDED</span>
          <span class="tr-lg"><i class="sw rop" /> BOUNCED</span>
          <span class="tr-tag">LAST 14 DAYS</span>
        </div>
        <svg class="qb-trend" :viewBox="`0 0 ${TW} ${TH}`" preserveAspectRatio="none" role="img" aria-label="Resolution trend, last 14 days">
          <line class="tr-base" :x1="0" :y1="TH - 14" :x2="TW" :y2="TH - 14" />
          <g v-for="(b, i) in trendBars" :key="i">
            <rect class="tr-bar" :x="b.x" :y="b.y" :width="b.w" :height="b.h" rx="2" />
            <circle v-if="b.rop > 0" class="tr-dot" :cx="b.x + b.w / 2" :cy="b.ry" r="2.6" />
          </g>
        </svg>
        <div class="qb-tr-axis sd-mono"><span>{{ axisStart }}</span><span>TODAY</span></div>
      </div>
    </div>
  </section>
</template>

<script setup>
/* SdQualityBoard — the Resolved desk's 30-day quality panel: CSAT average + star
   distribution, the three gate meters (one-touch FCR / fixes-that-held survival /
   SLA-met), MTTR median + p90 + per-priority speed bars, and the 14-day landed-vs-
   bounced trend. Pure presentational off the sealed /resolved/stats payload. */
import { computed } from 'vue'
import { Gem, Star } from 'lucide-vue-next'

const props = defineProps({
  stats: { type: Object, default: () => ({}) },
  reduced: { type: Boolean, default: false },
})

const dist = computed(() => props.stats.csat_dist || {})
const distMax = computed(() => Math.max(1, ...Object.values(dist.value).map(Number)))
const distPct = (n) => Math.round(100 * (Number(dist.value[n]) || 0) / distMax.value)

const meters = computed(() => [
  { key: 'fcr', label: 'ONE-TOUCH (FCR)', value: props.stats.fcr_30d_pct, color: 'var(--sd-res-hi)',
    hint: 'Resolved with a single reply and never sent back' },
  { key: 'hold', label: 'FIXES THAT HELD', value: props.stats.reopen_rate_30d != null
      ? Math.max(0, Math.round((100 - props.stats.reopen_rate_30d) * 10) / 10) : null,
    color: 'var(--sd-res-core)', hint: 'Resolutions that were not reopened' },
  { key: 'sla', label: 'SLA MET', value: props.stats.sla_met_pct_30d, color: 'var(--sd-res-brass)',
    hint: 'Resolved with the resolution target intact' },
])

const PRI_COLOR = { critical: 'var(--sd-pri-critical)', urgent: 'var(--sd-pri-urgent)', high: 'var(--sd-pri-high)', medium: 'var(--sd-pri-medium)', low: 'var(--sd-pri-low)' }
const priRows = computed(() => {
  const by = props.stats.mttr_by_priority || {}
  const keys = ['critical', 'urgent', 'high', 'medium', 'low'].filter(k => by[k] != null)
  const max = Math.max(1, ...keys.map(k => by[k]))
  return keys.map(k => ({ key: k, min: by[k], pct: Math.max(6, Math.round(100 * by[k] / max)), color: PRI_COLOR[k] }))
})

/* trend chart geometry */
const TW = 280, TH = 84
const trendBars = computed(() => {
  const rows = props.stats.trend || []
  if (!rows.length) return []
  const max = Math.max(1, ...rows.map(r => r.resolved || 0))
  const gap = 4
  const w = (TW - gap * (rows.length + 1)) / rows.length
  return rows.map((r, i) => {
    const h = Math.max(2, ((r.resolved || 0) / max) * (TH - 26))
    return {
      x: gap + i * (w + gap), w,
      y: TH - 14 - h, h,
      rop: r.reopened || 0,
      ry: Math.max(8, TH - 20 - ((r.reopened || 0) / max) * (TH - 26)),
    }
  })
})
const axisStart = computed(() => {
  const rows = props.stats.trend || []
  if (!rows.length) return ''
  const d = new Date(rows[0].day)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()
})

const fmtMin = (m) => {
  if (m == null) return '—'
  if (m < 60) return `${Math.round(m)}m`
  if (m < 1440) return `${(m / 60).toFixed(1)}h`
  return `${(m / 1440).toFixed(1)}d`
}
</script>

<style scoped>
.qb { padding: 14px 16px 16px; border-color: var(--sd-res-brd); }
.qb-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.qb-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: 10px; font-weight: 800;
  letter-spacing: 0.2em; color: var(--sd-res-core); }
.qb-count { font-size: 10px; font-weight: 800; letter-spacing: 0.14em; color: var(--sd-text-dim); }

.qb-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px; }
.qb-cell { display: flex; flex-direction: column; gap: 10px; padding: 13px 14px; border-radius: 14px;
  border: 1px solid var(--sd-border); background: var(--sd-surface-glass); min-width: 0; }

.qb-big { display: flex; flex-direction: column; gap: 3px; }
.qb-big b { font-size: 27px; font-weight: 800; line-height: 1; color: var(--sd-text); font-variant-numeric: tabular-nums; }
.qb-big.brass b { color: var(--sd-res-brass); }
.qb-big i { font-style: normal; font-size: 9px; font-weight: 700; letter-spacing: 0.14em; color: var(--sd-text-dim); }
.qb-stars { display: inline-flex; gap: 2px; margin: 3px 0 1px; color: var(--sd-border-strong); }
.qb-stars .lit { color: var(--sd-res-brass); fill: var(--sd-res-brass); }

.qb-dist { display: flex; flex-direction: column; gap: 5px; }
.qb-dl { display: grid; grid-template-columns: 24px 1fr 26px; align-items: center; gap: 8px; }
.dl-lb { font-size: 9.5px; font-weight: 800; color: var(--sd-text-dim); }
.dl-bar { position: relative; height: 7px; border-radius: 4px; overflow: hidden; background: color-mix(in srgb, var(--sd-res-core) 10%, transparent); }
.dl-bar i { position: absolute; inset: 0 auto 0 0; border-radius: 4px; background: var(--sd-res-core);
  transition: width 0.8s var(--sd-spring); }
.dl-bar i.low { background: var(--sd-res-risk); }
.dl-n { font-size: 10px; font-weight: 800; text-align: right; color: var(--sd-text-muted); }

.qb-meter { display: flex; flex-direction: column; gap: 5px; }
.qm-top { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.qm-lb { font-size: 9px; font-weight: 800; letter-spacing: 0.16em; color: var(--sd-text-dim); }
.qm-val { font-size: 16px; font-weight: 800; font-variant-numeric: tabular-nums; }
.qm-track { display: flex; gap: 2.5px; }
.qm-track i { flex: 1; height: 9px; border-radius: 2px; background: color-mix(in srgb, var(--mc, var(--sd-res-core)) 12%, transparent);
  transition: background 0.5s; }
.qm-track i.on { background: var(--mc, var(--sd-res-core)); }
.qm-hint { font-size: 10px; color: var(--sd-text-dim); }

.qb-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.chip { display: inline-flex; flex-direction: column; gap: 1px; padding: 6px 10px; border-radius: 10px;
  border: 1px solid var(--sd-border); background: var(--sd-surface); }
.chip i { font-style: normal; font-size: 8px; font-weight: 800; letter-spacing: 0.14em; color: var(--sd-text-dim); }
.chip b { font-size: 12.5px; font-weight: 800; color: var(--sd-text); }

.qb-pri { display: flex; flex-direction: column; gap: 5px; }
.pri-row { display: grid; grid-template-columns: 62px 1fr 44px; align-items: center; gap: 8px; }
.pri-lb { font-size: 8.5px; font-weight: 800; letter-spacing: 0.08em; }
.pri-bar { position: relative; height: 6px; border-radius: 4px; overflow: hidden; background: var(--sd-surface); }
.pri-bar i { position: absolute; inset: 0 auto 0 0; border-radius: 4px; opacity: 0.85; transition: width 0.8s var(--sd-spring); }
.pri-v { font-size: 10px; font-weight: 800; text-align: right; color: var(--sd-text-muted); }

.qb-cell.trend { justify-content: space-between; }
.qb-tr-head { display: flex; align-items: center; gap: 12px; font-size: 9px; font-weight: 800; letter-spacing: 0.12em; color: var(--sd-text-dim); }
.tr-lg { display: inline-flex; align-items: center; gap: 5px; }
.tr-lg .sw { width: 9px; height: 9px; border-radius: 3px; }
.tr-lg .sw.res { background: var(--sd-res-core); }
.tr-lg .sw.rop { background: var(--sd-res-risk); border-radius: 50%; }
.tr-tag { margin-left: auto; }
.qb-trend { width: 100%; height: 92px; }
.tr-base { stroke: var(--sd-border-strong); stroke-width: 1; }
.tr-bar { fill: var(--sd-res-core); opacity: 0.75; }
.tr-dot { fill: var(--sd-res-risk); }
.qb-tr-axis { display: flex; justify-content: space-between; font-size: 8.5px; font-weight: 800;
  letter-spacing: 0.12em; color: var(--sd-text-dim); }
</style>
