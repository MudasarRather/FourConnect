<template>
  <Motion as="section" class="ab sd-card" :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }">
    <div class="ab-head">
      <span class="ab-eyebrow sd-mono"><ScrollText :size="13" /> CLOSURE INTELLIGENCE · 30 DAYS</span>
      <span class="ab-sub">How records get sealed, how long they lived, and whether the seal holds.</span>
    </div>

    <div class="ab-grid">
      <!-- ── PROVENANCE SPECTRUM — how the archive gets its records ── -->
      <div class="ab-cell span2">
        <div class="ab-cell-h sd-mono">PROVENANCE — HOW RECORDS WERE SEALED</div>
        <div class="ab-spectrum" role="img" :aria-label="`Closure sources over 30 days: ${srcTotal} records`">
          <Motion v-for="(seg, i) in spectrum" :key="seg.key" class="ab-seg" :style="{ background: seg.color, flexGrow: seg.n || 0.001 }"
            :initial="{ scaleX: 0 }" :animate="{ scaleX: 1 }"
            :transition="{ duration: 0.7, delay: 0.2 + i * 0.08, ease: [0.16, 1, 0.3, 1] }"
            :title="`${seg.label}: ${seg.n}`" />
        </div>
        <div class="ab-legend">
          <button v-for="seg in spectrum" :key="seg.key" class="ab-lg" :class="{ on: activeSource === seg.key, zero: !seg.n }"
            @click="$emit('source', seg.key)">
            <i :style="{ background: seg.color }" /> {{ seg.label }} <b class="sd-mono">{{ seg.n }}</b>
          </button>
        </div>
      </div>

      <!-- ── PERMANENCE — does the seal hold? ── -->
      <div class="ab-cell">
        <div class="ab-cell-h sd-mono">PERMANENCE</div>
        <div class="ab-perm">
          <svg viewBox="0 0 84 84" class="ab-dial" aria-hidden="true">
            <circle cx="42" cy="42" r="35" fill="none" stroke="var(--sd-cls-soft)" stroke-width="7" />
            <circle cx="42" cy="42" r="35" fill="none" :stroke="permColor" stroke-width="7" stroke-linecap="round"
              :stroke-dasharray="`${permArc} 999`" transform="rotate(-90 42 42)" class="ab-dial-arc" />
            <text x="42" y="40" text-anchor="middle" class="ab-dial-v">{{ stats.closure_survival_pct_30d != null ? stats.closure_survival_pct_30d + '%' : '—' }}</text>
            <text x="42" y="53" text-anchor="middle" class="ab-dial-l">HELD</text>
          </svg>
          <div class="ab-perm-side">
            <button class="ab-mini" :class="{ risk: (stats.reopened_from_closed_30d || 0) > 0 }" @click="$emit('exhumed')">
              <Shovel :size="12" /><b>{{ stats.reopened_from_closed_30d ?? 0 }}</b><span>exhumed</span>
            </button>
            <div class="ab-mini quiet"><Landmark :size="12" /><b><SdCountUp :value="stats.closed_total ?? 0" /></b><span>lifetime</span></div>
          </div>
        </div>
      </div>

      <!-- ── THE CHRONICLE — 12 monthly closure cohorts ── -->
      <div class="ab-cell span2">
        <div class="ab-cell-h sd-mono">THE CHRONICLE — 12 MONTHS OF CLOSURE</div>
        <div class="ab-trend">
          <Motion v-for="(b, i) in trendBars" :key="b.key" as="button" class="ab-tb" :class="{ hot: b.current }"
            :initial="{ scaleY: 0 }" :animate="{ scaleY: 1 }"
            :transition="{ duration: 0.55, delay: 0.25 + i * 0.045, ease: [0.16, 1, 0.3, 1] }"
            :style="{ height: b.pct + '%' }" :title="`${b.label}: ${b.n} sealed`"
            @click="$emit('month', b)" />
        </div>
        <div class="ab-trend-x sd-mono"><span v-for="b in trendBars" :key="b.key">{{ b.tick }}</span></div>
      </div>

      <!-- ── CSAT OF RECORD ── -->
      <div class="ab-cell">
        <div class="ab-cell-h sd-mono">CSAT OF RECORD</div>
        <div class="ab-csat">
          <div class="ab-csat-avg">
            <b>{{ stats.csat_avg != null ? stats.csat_avg.toFixed(1) : '—' }}</b>
            <Star :size="15" class="lit" />
            <span class="sd-mono">{{ stats.csat_count ?? 0 }} verdicts · {{ stats.csat_coverage_pct != null ? stats.csat_coverage_pct + '%' : '—' }} coverage</span>
          </div>
          <div class="ab-csat-dist">
            <div v-for="s in [5, 4, 3, 2, 1]" :key="s" class="ab-cd-row">
              <span class="sd-mono">{{ s }}★</span>
              <div class="ab-cd-track">
                <Motion class="ab-cd-fill" :class="{ low: s <= 2 }"
                  :initial="{ scaleX: 0 }" :animate="{ scaleX: 1 }" :transition="{ duration: 0.6, delay: 0.3 + (5 - s) * 0.07, ease: [0.16, 1, 0.3, 1] }"
                  :style="{ width: distPct(s) + '%' }" />
              </div>
              <b class="sd-mono">{{ (stats.csat_dist || {})[String(s)] || 0 }}</b>
            </div>
          </div>
        </div>
      </div>

      <!-- ── LIFESPAN — created → sealed, pause-credited ── -->
      <div class="ab-cell">
        <div class="ab-cell-h sd-mono">RECORD LIFESPAN</div>
        <div class="ab-life sd-mono">
          <div class="ab-lf"><i>P50</i><b>{{ fmtMin(stats.lifespan_p50_minutes) }}</b></div>
          <div class="ab-lf"><i>P90</i><b>{{ fmtMin(stats.lifespan_p90_minutes) }}</b></div>
          <div class="ab-lf"><i>AVG</i><b>{{ fmtMin(stats.lifespan_avg_minutes) }}</b></div>
        </div>
        <div class="ab-life-pri">
          <div v-for="p in lifeByPriority" :key="p.key" class="ab-lp-row">
            <span class="sd-mono">{{ p.key.toUpperCase() }}</span>
            <div class="ab-lp-track"><span class="ab-lp-fill" :style="{ width: p.pct + '%', background: p.color }" /></div>
            <b class="sd-mono">{{ fmtMin(p.v) }}</b>
          </div>
        </div>
      </div>

      <!-- ── KNOWLEDGE & FOLLOW-THROUGH ── -->
      <div class="ab-cell">
        <div class="ab-cell-h sd-mono">KNOWLEDGE &amp; FOLLOW-THROUGH</div>
        <div class="ab-kb">
          <button class="ab-mini seal" :class="{ pulse: (stats.kb_candidates_30d || 0) > 0 }" @click="$emit('kb')">
            <BookMarked :size="12" /><b>{{ stats.kb_candidates_30d ?? 0 }}</b><span>KB candidates</span>
          </button>
          <div class="ab-mini quiet"><BookOpenCheck :size="12" /><b>{{ stats.kb_promoted_total ?? 0 }}</b><span>harvested</span></div>
          <button class="ab-mini" @click="$emit('followups')">
            <Link2 :size="12" /><b>{{ stats.follow_ups_30d ?? 0 }}</b><span>follow-ups</span>
          </button>
          <div class="ab-mini quiet"><Activity :size="12" /><b>{{ stats.open_follow_ups ?? 0 }}</b><span>still live</span></div>
        </div>
      </div>

      <!-- ── TOP CLOSERS ── -->
      <div v-if="(stats.leaderboard || []).length" class="ab-cell span3 closers">
        <div class="ab-cell-h sd-mono">WHO SEALS THE RECORD · 30D</div>
        <div class="ab-closers">
          <Motion v-for="(c, i) in stats.leaderboard" :key="String(c.agent_id)" as="button" class="ab-closer"
            :class="{ on: activeCloser === String(c.agent_id) }"
            :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.4, delay: 0.2 + i * 0.05, ease: [0.16, 1, 0.3, 1] }"
            :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }"
            @click="$emit('closer', String(c.agent_id))">
            <span class="ab-cl-rank sd-mono">{{ i + 1 }}</span>
            <span class="ab-cl-av">{{ initials(c.name) }}</span>
            <span class="ab-cl-body">
              <b>{{ c.name || 'Agent' }}</b>
              <span class="sd-mono">{{ c.closed_30d }} sealed · {{ c.csat_avg != null ? c.csat_avg.toFixed(1) + '★' : 'unrated' }}</span>
            </span>
          </Motion>
          <div v-if="(stats.auto_closed_30d || 0) > 0" class="ab-closer sys">
            <span class="ab-cl-rank sd-mono">·</span>
            <span class="ab-cl-av sys"><Timer :size="13" /></span>
            <span class="ab-cl-body">
              <b>The sweep</b>
              <span class="sd-mono">{{ stats.auto_closed_30d }} auto-sealed</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </Motion>
</template>

<script setup>
/* SdArchiveBoard — the Closed desk's closure-intelligence bento (provenance spectrum,
   permanence dial, 12-month chronicle, CSAT-of-record, lifespan, knowledge harvest,
   top closers). Everything clickable emits a refinement back to the section so the
   board and the list always tell the same story. Accent = --sd-cls-*. */
import { computed } from 'vue'
import { Motion } from 'motion-v'
import {
  ScrollText, Star, Landmark, Shovel, BookMarked, BookOpenCheck, Link2, Activity, Timer,
} from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'
import { CLOSE_SOURCES } from '@/composables/useSupportDesk'

const props = defineProps({
  stats: { type: Object, default: () => ({}) },
  activeSource: { type: String, default: '' },
  activeCloser: { type: String, default: '' },
  reduced: { type: Boolean, default: false },
})
defineEmits(['source', 'month', 'exhumed', 'kb', 'followups', 'closer'])

const SRC_COLORS = {
  manual: 'var(--sd-cls-seal)',
  auto_sweep: 'var(--sd-cls-frost)',
  merged: 'var(--sd-cls-deep)',
  withdrawn: 'var(--sd-text-dim)',
  no_response: 'var(--sd-warning)',
}
const spectrum = computed(() => CLOSE_SOURCES.map(s => ({
  key: s.value, label: s.label.split(' (')[0], color: SRC_COLORS[s.value],
  n: (props.stats.by_close_source || {})[s.value] || 0,
})))
const srcTotal = computed(() => spectrum.value.reduce((a, s) => a + s.n, 0))

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const trendBars = computed(() => {
  const t = props.stats.trend || []
  const max = Math.max(1, ...t.map(b => b.closed || 0))
  return t.map((b, i) => {
    const d = new Date(b.month)
    return {
      key: b.month, n: b.closed || 0,
      pct: Math.max(4, Math.round(((b.closed || 0) / max) * 100)),
      label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
      tick: MONTHS[d.getMonth()][0],
      month: b.month,
      current: i === t.length - 1,
    }
  })
})

const permArc = computed(() => {
  const p = props.stats.closure_survival_pct_30d
  return p == null ? 0 : Math.round((p / 100) * 220)   // 2π·35 ≈ 220
})
const permColor = computed(() => {
  const p = props.stats.closure_survival_pct_30d
  if (p == null) return 'var(--sd-cls-frost)'
  return p >= 90 ? 'var(--sd-cls-seal)' : p >= 70 ? 'var(--sd-cls-frost)' : 'var(--sd-cls-risk)'
})

const distPct = (s) => {
  const dist = props.stats.csat_dist || {}
  const max = Math.max(1, ...Object.values(dist).map(v => v || 0))
  return Math.round(((dist[String(s)] || 0) / max) * 100)
}

const PRI_COLORS = { critical: 'var(--sd-pri-critical, #f87171)', urgent: 'var(--sd-pri-urgent, #fb923c)', high: 'var(--sd-pri-high, #fbbf24)', medium: 'var(--sd-cls-frost)', low: 'var(--sd-cls-deep)' }
const lifeByPriority = computed(() => {
  const by = props.stats.lifespan_by_priority || {}
  const entries = ['critical', 'urgent', 'high', 'medium', 'low'].filter(k => by[k] != null)
  const max = Math.max(1, ...entries.map(k => by[k]))
  return entries.map(k => ({ key: k, v: by[k], pct: Math.max(6, Math.round((by[k] / max) * 100)), color: PRI_COLORS[k] }))
})

const fmtMin = (m) => {
  if (m == null) return '—'
  if (m < 60) return `${Math.round(m)}m`
  if (m < 1440) return `${(m / 60).toFixed(1)}h`
  return `${(m / 1440).toFixed(1)}d`
}
const initials = (n) => n ? n.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() : '—'
</script>

<style scoped>
.ab { padding: 16px 18px; border-color: var(--sd-cls-brd); }
.ab-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.ab-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.18em; color: var(--sd-cls-frost); }
.ab-sub { font-size: 12px; color: var(--sd-text-dim); }

.ab-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.ab-cell { display: flex; flex-direction: column; gap: 10px; padding: 13px 14px; border-radius: 14px;
  border: 1px solid var(--sd-border); background: var(--sd-surface-glass); min-width: 0; }
.ab-cell.span2 { grid-column: span 2; }
.ab-cell.span3 { grid-column: span 3; }
.ab-cell-h { font-size: 9.5px; font-weight: 800; letter-spacing: 0.16em; color: var(--sd-text-dim); }

/* provenance spectrum */
.ab-spectrum { display: flex; height: 14px; border-radius: 8px; overflow: hidden; gap: 2px; }
.ab-seg { transform-origin: left; min-width: 2px; border-radius: 2px; }
.ab-legend { display: flex; flex-wrap: wrap; gap: 6px; }
.ab-lg { display: inline-flex; align-items: center; gap: 6px; padding: 4px 9px; border-radius: 999px; font-size: 11px; font-weight: 600;
  cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border); background: transparent; color: var(--sd-text-muted);
  transition: border-color 0.18s, color 0.18s; }
.ab-lg:hover { border-color: var(--sd-cls-core); color: var(--sd-text); }
.ab-lg.on { border-color: var(--sd-cls-seal); color: var(--sd-text); background: var(--sd-cls-seal-soft); }
.ab-lg.zero { opacity: 0.45; }
.ab-lg i { width: 8px; height: 8px; border-radius: 3px; }
.ab-lg b { font-size: 10.5px; }

/* permanence dial */
.ab-perm { display: flex; align-items: center; gap: 12px; }
.ab-dial { width: 84px; height: 84px; flex-shrink: 0; }
.ab-dial-arc { transition: stroke-dasharray 0.8s var(--sd-spring); }
.ab-dial-v { font-size: 15px; font-weight: 800; fill: var(--sd-text); font-family: var(--sd-mono); }
.ab-dial-l { font-size: 7px; font-weight: 800; letter-spacing: 0.2em; fill: var(--sd-text-dim); font-family: var(--sd-mono); }
.ab-perm-side { display: flex; flex-direction: column; gap: 7px; min-width: 0; }

.ab-mini { display: inline-flex; align-items: center; gap: 7px; padding: 6px 10px; border-radius: 10px; font-family: inherit;
  border: 1px solid var(--sd-border); background: transparent; color: var(--sd-text-muted); font-size: 11px; cursor: pointer;
  transition: border-color 0.18s, color 0.18s; }
.ab-mini b { font-size: 13px; font-weight: 800; color: var(--sd-text); font-variant-numeric: tabular-nums; }
.ab-mini:hover { border-color: var(--sd-cls-core); }
.ab-mini.quiet { cursor: default; }
.ab-mini.quiet:hover { border-color: var(--sd-border); }
.ab-mini.risk { border-color: color-mix(in srgb, var(--sd-cls-risk) 45%, transparent); color: var(--sd-cls-risk); }
.ab-mini.risk b { color: var(--sd-cls-risk); }
.ab-mini.seal { border-color: color-mix(in srgb, var(--sd-cls-seal) 45%, transparent); color: var(--sd-cls-seal); }
.ab-mini.seal b { color: var(--sd-cls-seal); }
.ab-mini.pulse { animation: ab-pulse 2.6s ease-in-out infinite; }

/* chronicle */
.ab-trend { display: flex; align-items: flex-end; gap: 6px; height: 74px; }
.ab-tb { flex: 1; min-width: 8px; border: none; cursor: pointer; border-radius: 5px 5px 2px 2px; transform-origin: bottom;
  background: linear-gradient(180deg, var(--sd-cls-core), var(--sd-cls-deep)); opacity: 0.65; transition: opacity 0.18s, filter 0.18s; }
.ab-tb:hover { opacity: 1; filter: brightness(1.15); }
.ab-tb.hot { background: linear-gradient(180deg, #ecd9a8, var(--sd-cls-seal)); opacity: 0.95; }
.ab-trend-x { display: flex; gap: 6px; }
.ab-trend-x span { flex: 1; text-align: center; font-size: 8.5px; color: var(--sd-text-dim); }

/* csat */
.ab-csat { display: flex; flex-direction: column; gap: 10px; }
.ab-csat-avg { display: flex; align-items: center; gap: 7px; }
.ab-csat-avg b { font-size: 24px; font-weight: 800; font-variant-numeric: tabular-nums; }
.ab-csat-avg .lit { color: var(--sd-cls-seal); }
.ab-csat-avg span { font-size: 10px; color: var(--sd-text-dim); }
.ab-csat-dist { display: flex; flex-direction: column; gap: 4px; }
.ab-cd-row { display: grid; grid-template-columns: 24px 1fr 26px; align-items: center; gap: 8px; font-size: 10px; color: var(--sd-text-dim); }
.ab-cd-track { height: 7px; border-radius: 4px; background: var(--sd-cls-soft); overflow: hidden; }
.ab-cd-fill { display: block; height: 100%; border-radius: 4px; background: var(--sd-cls-seal); transform-origin: left; }
.ab-cd-fill.low { background: var(--sd-cls-risk); }
.ab-cd-row b { text-align: right; color: var(--sd-text-muted); }

/* lifespan */
.ab-life { display: flex; gap: 14px; }
.ab-lf { display: flex; flex-direction: column; gap: 2px; }
.ab-lf i { font-style: normal; font-size: 9px; font-weight: 700; letter-spacing: 0.16em; color: var(--sd-text-dim); }
.ab-lf b { font-size: 17px; font-weight: 800; font-variant-numeric: tabular-nums; color: var(--sd-cls-hi); }
[data-theme="light"] .ab-lf b { color: var(--sd-cls-deep); }
.ab-life-pri { display: flex; flex-direction: column; gap: 4px; }
.ab-lp-row { display: grid; grid-template-columns: 56px 1fr 44px; align-items: center; gap: 8px; font-size: 8.5px; color: var(--sd-text-dim); }
.ab-lp-track { height: 6px; border-radius: 4px; background: var(--sd-cls-soft); overflow: hidden; }
.ab-lp-fill { display: block; height: 100%; border-radius: 4px; }
.ab-lp-row b { text-align: right; font-size: 10px; color: var(--sd-text-muted); }

/* knowledge */
.ab-kb { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }

/* closers */
.ab-closers { display: flex; flex-wrap: wrap; gap: 8px; }
.ab-closer { display: inline-flex; align-items: center; gap: 9px; padding: 7px 12px 7px 8px; border-radius: 12px; font-family: inherit;
  border: 1px solid var(--sd-border); background: var(--sd-surface); color: var(--sd-text); cursor: pointer; text-align: left;
  transition: border-color 0.18s; }
.ab-closer:hover { border-color: var(--sd-cls-seal); }
.ab-closer.on { border-color: var(--sd-cls-seal); background: var(--sd-cls-seal-soft); }
.ab-closer.sys { cursor: default; opacity: 0.75; }
.ab-cl-rank { font-size: 10px; font-weight: 800; color: var(--sd-cls-seal); width: 12px; text-align: center; }
.ab-cl-av { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 9px; font-size: 10px; font-weight: 800;
  background: var(--sd-cls-soft); color: var(--sd-cls-hi); }
[data-theme="light"] .ab-cl-av { color: var(--sd-cls-deep); }
.ab-cl-av.sys { color: var(--sd-cls-frost); }
.ab-cl-body { display: flex; flex-direction: column; gap: 1px; }
.ab-cl-body b { font-size: 12px; font-weight: 700; }
.ab-cl-body span { font-size: 9.5px; color: var(--sd-text-dim); }

@keyframes ab-pulse { 0%, 100% { box-shadow: 0 0 0 0 transparent; } 50% { box-shadow: 0 0 14px -2px var(--sd-cls-seal); } }

@media (max-width: 1080px) { .ab-grid { grid-template-columns: 1fr 1fr; } .ab-cell.span2, .ab-cell.span3 { grid-column: span 2; } }
@media (max-width: 640px) { .ab-grid { grid-template-columns: 1fr; } .ab-cell.span2, .ab-cell.span3 { grid-column: span 1; } }
@media (prefers-reduced-motion: reduce) { html:not([data-cinematic="on"]) .ab-mini.pulse { animation: none; } }
</style>
