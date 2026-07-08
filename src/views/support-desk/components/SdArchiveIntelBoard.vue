<template>
  <Motion as="section" class="aib" :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }">
    <!-- ═══ REASON SPECTRUM — why records left circulation (click = server filter) ═══ -->
    <div class="aib-cell span2">
      <div class="aib-h sd-mono"><Archive :size="12" /> WHY THEY LEFT CIRCULATION</div>
      <div class="aib-spectrum" role="group" aria-label="Archive reasons">
        <Motion v-for="(seg, i) in spectrum" :key="seg.code" as="button" class="aib-seg"
          :class="{ on: activeReason === seg.code }" :style="{ flex: `${seg.n} 1 0%`, '--sc': seg.color }"
          :initial="{ scaleY: 0 }" :animate="{ scaleY: 1 }"
          :transition="{ duration: 0.45, delay: 0.15 + i * 0.05, ease: [0.16, 1, 0.3, 1] }"
          :title="`${seg.label} — ${seg.n} record${seg.n === 1 ? '' : 's'}`"
          @click="$emit('reason', seg.code)" />
      </div>
      <div class="aib-legend">
        <button v-for="seg in spectrum" :key="seg.code" class="aib-lg" :class="{ on: activeReason === seg.code }"
          :style="{ '--sc': seg.color }" @click="$emit('reason', seg.code)">
          <i /><span>{{ seg.label }}</span><b class="sd-mono">{{ seg.n }}</b>
        </button>
      </div>
    </div>

    <!-- ═══ AGE STRATA — how deep the shelf runs ═══ -->
    <div class="aib-cell">
      <div class="aib-h sd-mono"><Layers :size="12" /> AGE STRATA</div>
      <div class="aib-strata">
        <div v-for="(s, i) in strata" :key="s.key" class="aib-stratum">
          <span class="st-lb sd-mono">{{ s.label }}</span>
          <span class="st-track"><Motion as="i" :style="{ '--d': i }" :initial="{ scaleX: 0 }"
            :animate="{ scaleX: maxStrata ? s.n / maxStrata : 0 }"
            :transition="{ duration: 0.6, delay: 0.2 + i * 0.08, ease: [0.16, 1, 0.3, 1] }" /></span>
          <b class="st-n sd-mono">{{ s.n }}</b>
        </div>
      </div>
      <p class="aib-foot sd-mono" v-if="stats.dormancy_p50_minutes != null">MEDIAN DORMANCY {{ fmtMin(stats.dormancy_p50_minutes) }}</p>
    </div>

    <!-- ═══ RETENTION & GOVERNANCE ═══ -->
    <div class="aib-cell">
      <div class="aib-h sd-mono"><TimerOff :size="12" /> RETENTION &amp; GOVERNANCE</div>
      <div class="aib-minis">
        <button class="aib-mini purge" @click="$emit('purge')">
          <b class="sd-mono">{{ stats.purge_eligible_count ?? 0 }}</b><span>purge-eligible</span>
        </button>
        <button class="aib-mini warn" @click="$emit('purge')">
          <b class="sd-mono">{{ stats.expiring_soon_count ?? 0 }}</b><span>expiring ≤14d</span>
        </button>
        <button class="aib-mini hold" @click="$emit('hold')">
          <b class="sd-mono">{{ stats.legal_hold_count ?? 0 }}</b><span>⚖ legal hold</span>
        </button>
      </div>
      <p class="aib-foot sd-mono">POLICY · CLOSED +{{ stats.autoarchive_days ?? 120 }}D → SHELF · +{{ stats.retention_days ?? 180 }}D → ELIGIBLE</p>
    </div>

    <!-- ═══ CHRONICLE OF STORAGE — 12-month shelved vs restored (stepped area) ═══ -->
    <div class="aib-cell span2">
      <div class="aib-h sd-mono"><CalendarClock :size="12" /> THE CHRONICLE OF STORAGE
        <span class="aib-key"><i class="k-arc" /> shelved <i class="k-res" /> restored</span>
      </div>
      <svg class="aib-chron" :viewBox="`0 0 ${CW} ${CH}`" preserveAspectRatio="none" aria-hidden="true">
        <line v-for="g in 3" :key="'g' + g" :x1="0" :x2="CW" :y1="(CH - 14) * g / 3" :y2="(CH - 14) * g / 3" class="ch-grid" />
        <path :d="archArea" class="ch-area" />
        <path :d="archLine" class="ch-line" />
        <path :d="resLine" class="ch-resline" />
        <g v-for="(b, i) in buckets" :key="'m' + i">
          <rect class="ch-hit" :x="x(i) - stepW / 2" y="0" :width="stepW" :height="CH"
            @click="$emit('month', b)"><title>{{ b.label }} — {{ b.n }} shelved · {{ b.r }} restored</title></rect>
          <text class="ch-mon" :x="x(i)" :y="CH - 3" text-anchor="middle">{{ b.short }}</text>
        </g>
      </svg>
    </div>

    <!-- ═══ RESTORED — what came back ═══ -->
    <div class="aib-cell">
      <div class="aib-h sd-mono"><ArchiveRestore :size="12" /> PULLED BACK · 30D</div>
      <div class="aib-big restore sd-mono">{{ stats.restored_30d ?? 0 }}</div>
      <div v-if="restorers.length" class="aib-people">
        <span v-for="r in restorers" :key="r.name" class="aib-person">
          <i class="p-dot restore" />{{ r.name }} <b class="sd-mono">{{ r.n }}</b>
        </span>
      </div>
      <p v-else class="aib-foot sd-mono">NOTHING RESTORED THIS MONTH</p>
    </div>

    <!-- ═══ TOP ARCHIVERS (click = client filter) ═══ -->
    <div class="aib-cell">
      <div class="aib-h sd-mono"><Users :size="12" /> TOP ARCHIVERS</div>
      <div v-if="(stats.top_archivers || []).length" class="aib-archivers">
        <button v-for="a in stats.top_archivers.slice(0, 6)" :key="String(a.agent_id)" class="aib-arch"
          :class="{ on: activeArchiver === String(a.agent_id) }" @click="$emit('archiver', a.agent_id)">
          <span class="aa-ini">{{ initials(a.name) }}</span>
          <span class="aa-name">{{ a.name || 'Agent' }}</span>
          <b class="sd-mono">{{ a.archived_total }}</b>
        </button>
        <div v-if="(stats.auto_archived_30d || 0) > 0" class="aib-arch sys">
          <span class="aa-ini">SYS</span>
          <span class="aa-name">Retention sweep</span>
          <b class="sd-mono">{{ stats.auto_archived_30d }}</b>
        </div>
      </div>
      <p v-else class="aib-foot sd-mono">NO MANUAL ARCHIVES ON THE SHELF</p>
    </div>
  </Motion>
</template>

<script setup>
/* SdArchiveIntelBoard — the Deep Storage intelligence bento. Parchment cells, bronze
   rules, engraved mono headers — deliberately WARMER than the Closed desk's frost
   dials, and with a stepped-area chronicle instead of its bar chronicle. Every cell
   emits a refinement so the board and the list always tell the same story. */
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Archive, ArchiveRestore, Layers, TimerOff, CalendarClock, Users } from 'lucide-vue-next'
import { archiveReasonLabel } from '@/composables/useSupportDesk'

const props = defineProps({
  stats: { type: Object, default: () => ({}) },
  reduced: { type: Boolean, default: false },
  activeReason: { type: String, default: '' },
  activeArchiver: { type: String, default: '' },
})
defineEmits(['reason', 'month', 'mistakes', 'hold', 'purge', 'restored', 'archiver'])

const TONE = {
  spam: 'var(--sd-arc-purge)', duplicate: 'var(--sd-arc-bronze)', test_ticket: 'var(--sd-arc-deep)',
  created_in_error: 'var(--sd-arc-hold)', resolved_off_platform: 'var(--sd-arc-restore)',
  obsolete: 'var(--sd-arc-core)', compliance: 'var(--sd-arc-hold)', auto_retention: 'var(--sd-arc-deep)',
  other: 'var(--sd-arc-core)', uncoded: 'var(--sd-text-dim)',
}
const spectrum = computed(() => Object.entries(props.stats.by_reason_code || {})
  .map(([code, n]) => ({ code, n: n || 0, label: archiveReasonLabel(code), color: TONE[code] || 'var(--sd-arc-core)' }))
  .filter(s => s.n > 0)
  .sort((a, b) => b.n - a.n))

const STRATA_META = [
  { key: 'lt_7d', label: '< 7d' }, { key: 'd7_30', label: '7–30d' },
  { key: 'd30_90', label: '30–90d' }, { key: 'gt_90', label: '> 90d' },
]
const strata = computed(() => STRATA_META.map(m => ({ ...m, n: (props.stats.age_cohorts || {})[m.key] || 0 })))
const maxStrata = computed(() => Math.max(1, ...strata.value.map(s => s.n)))

/* chronicle geometry — stepped area over 12 monthly buckets */
const CW = 560, CH = 96
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const buckets = computed(() => (props.stats.trend || []).map(b => {
  const d = new Date(b.month)
  return { month: b.month, n: b.archived || 0, r: b.restored || 0,
    label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, short: MONTHS[d.getMonth()][0] }
}))
const stepW = computed(() => (buckets.value.length ? CW / buckets.value.length : CW))
const x = (i) => stepW.value * i + stepW.value / 2
const maxN = computed(() => Math.max(1, ...buckets.value.map(b => Math.max(b.n, b.r))))
const y = (n) => (CH - 18) * (1 - n / maxN.value) + 4
const steppedPath = (get) => {
  const bs = buckets.value
  if (!bs.length) return ''
  let d = `M 0 ${y(get(bs[0]))}`
  bs.forEach((b, i) => {
    d += ` L ${stepW.value * i} ${y(get(b))} L ${stepW.value * (i + 1)} ${y(get(b))}`
  })
  return d
}
const archLine = computed(() => steppedPath(b => b.n))
const resLine = computed(() => steppedPath(b => b.r))
const archArea = computed(() => {
  const l = archLine.value
  return l ? `${l} L ${CW} ${CH - 14} L 0 ${CH - 14} Z` : ''
})

const restorers = computed(() => Object.entries(props.stats.restored_by_30d || {})
  .map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n).slice(0, 4))
const initials = (n) => (n ? n.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() : '—')
const fmtMin = (m) => {
  if (m == null) return '—'
  if (m < 60) return `${Math.round(m)}M`
  if (m < 1440) return `${(m / 60).toFixed(1)}H`
  return `${(m / 1440).toFixed(1)}D`
}
</script>

<style scoped>
.aib { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.aib-cell { position: relative; display: flex; flex-direction: column; gap: 10px; padding: 14px 16px;
  border-radius: 16px; border: 1px solid var(--sd-arc-brd);
  background: linear-gradient(160deg, var(--sd-arc-soft), transparent 55%), var(--sd-panel); }
.aib-cell.span2 { grid-column: span 2; }
.aib-h { display: flex; align-items: center; gap: 7px; font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.2em; color: var(--sd-arc-bronze); }
.aib-key { display: inline-flex; align-items: center; gap: 6px; margin-left: auto; letter-spacing: 0.08em; color: var(--sd-text-dim); }
.aib-key i { display: inline-block; width: 14px; height: 3px; border-radius: 2px; }
.aib-key .k-arc { background: var(--sd-arc-core); }
.aib-key .k-res { background: var(--sd-arc-restore); }

/* reason spectrum */
.aib-spectrum { display: flex; gap: 3px; height: 34px; border-radius: 8px; overflow: hidden; }
.aib-seg { border: none; min-width: 10px; cursor: pointer; background: color-mix(in srgb, var(--sc) 72%, transparent);
  transform-origin: bottom; transition: filter 0.18s, box-shadow 0.18s; }
.aib-seg:hover { filter: brightness(1.2); }
.aib-seg.on { box-shadow: inset 0 0 0 2px var(--sc); filter: brightness(1.25); }
.aib-legend { display: flex; flex-wrap: wrap; gap: 6px; }
.aib-lg { display: inline-flex; align-items: center; gap: 6px; padding: 4px 9px; border-radius: 999px;
  font-size: 10.5px; font-weight: 600; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border); background: transparent; color: var(--sd-text-muted); }
.aib-lg i { width: 8px; height: 8px; border-radius: 3px; background: var(--sc); }
.aib-lg b { color: var(--sd-text); }
.aib-lg.on { border-color: var(--sc); color: var(--sd-text); background: color-mix(in srgb, var(--sc) 12%, transparent); }

/* age strata */
.aib-strata { display: flex; flex-direction: column; gap: 8px; }
.aib-stratum { display: grid; grid-template-columns: 52px 1fr 36px; align-items: center; gap: 9px; }
.st-lb { font-size: 10px; letter-spacing: 0.08em; color: var(--sd-text-dim); }
.st-track { position: relative; height: 12px; border-radius: 6px; background: var(--sd-arc-deep-soft); overflow: hidden; }
.st-track i { position: absolute; inset: 0; border-radius: 6px; transform-origin: left;
  background: linear-gradient(90deg, var(--sd-arc-deep), var(--sd-arc-core)); }
.st-n { font-size: 12px; font-weight: 800; text-align: right; color: var(--sd-text); }
.aib-foot { margin: auto 0 0; font-size: 9px; letter-spacing: 0.14em; color: var(--sd-text-dim); }

/* governance minis */
.aib-minis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.aib-mini { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 10px 6px;
  border-radius: 12px; cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border);
  background: var(--sd-surface-glass); color: var(--sd-text-muted); transition: border-color 0.18s, transform 0.15s; }
.aib-mini:hover { transform: translateY(-2px); }
.aib-mini b { font-size: 18px; font-weight: 800; color: var(--sd-text); }
.aib-mini span { font-size: 9px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
.aib-mini.purge:hover, .aib-mini.warn:hover { border-color: var(--sd-arc-purge); }
.aib-mini.purge b { color: var(--sd-arc-purge); }
.aib-mini.warn b { color: var(--sd-arc-purge); opacity: 0.85; }
.aib-mini.hold:hover { border-color: var(--sd-arc-hold); }
.aib-mini.hold b { color: var(--sd-arc-hold); }

/* chronicle */
.aib-chron { width: 100%; height: 96px; display: block; }
.ch-grid { stroke: var(--sd-border); stroke-width: 0.5; opacity: 0.6; }
.ch-area { fill: color-mix(in srgb, var(--sd-arc-core) 14%, transparent); stroke: none; }
.ch-line { fill: none; stroke: var(--sd-arc-core); stroke-width: 1.6; }
.ch-resline { fill: none; stroke: var(--sd-arc-restore); stroke-width: 1.4; stroke-dasharray: 3 3; }
.ch-hit { fill: transparent; cursor: pointer; }
.ch-hit:hover { fill: color-mix(in srgb, var(--sd-arc-bronze) 10%, transparent); }
.ch-mon { fill: var(--sd-text-dim); font-size: 7px; font-family: var(--sd-mono); }

/* restored + archivers */
.aib-big { font-size: 34px; font-weight: 800; line-height: 1; }
.aib-big.restore { color: var(--sd-arc-restore); }
.aib-people { display: flex; flex-direction: column; gap: 5px; }
.aib-person { display: flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--sd-text-muted); }
.aib-person b { margin-left: auto; color: var(--sd-text); }
.p-dot { width: 7px; height: 7px; border-radius: 50%; }
.p-dot.restore { background: var(--sd-arc-restore); }
.aib-archivers { display: flex; flex-direction: column; gap: 5px; }
.aib-arch { display: flex; align-items: center; gap: 8px; padding: 5px 8px; border-radius: 9px;
  font-size: 11.5px; font-weight: 600; cursor: pointer; font-family: inherit; text-align: left;
  border: 1px solid transparent; background: transparent; color: var(--sd-text-muted); }
.aib-arch:hover { border-color: var(--sd-arc-brd); }
.aib-arch.on { border-color: var(--sd-arc-bronze); color: var(--sd-text); background: var(--sd-arc-bronze-soft); }
.aib-arch.sys { cursor: default; opacity: 0.75; }
.aa-ini { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; flex: none;
  font-size: 9px; font-weight: 800; color: var(--sd-arc-bronze); background: var(--sd-arc-bronze-soft); }
.aa-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.aib-arch b { margin-left: auto; color: var(--sd-text); }

@media (max-width: 1100px) { .aib { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px) { .aib { grid-template-columns: 1fr; } .aib-cell.span2 { grid-column: span 1; } }
</style>
