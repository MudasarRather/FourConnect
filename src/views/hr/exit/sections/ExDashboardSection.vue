<template>
  <div ref="sectionRef" class="ex-dash">
    <ExSectionHead :icon="DoorOpen" eyebrow="Exit Management · Command" title="The" accent="Threshold"
      subtitle="A respectful, auditable send-off — every separation walks the ceremonial gateway from resignation to relieving.">
      <template #actions>
        <Motion as="button" class="ex-btn ghost" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }"
          @click="$emit('refresh')" type="button"><RefreshCw :size="15" /> Refresh</Motion>
        <Motion as="button" class="ex-btn primary" :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }"
          @click="$emit('go', 'resignation')" type="button"><Plus :size="15" /> New separation</Motion>
      </template>
    </ExSectionHead>

    <ThresholdGate :stats="stats" @go="$emit('go', $event)" />

    <!-- Lifecycle procession (full width) -->
    <Motion as="div" class="dash-card ex-card ex-grain proc-card" :initial="reduced ? false : { opacity: 0, y: 16 }"
      :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, delay: 0.06, ease: [0.16, 1, 0.3, 1] }">
      <div class="dc-head">
        <span class="dc-eyebrow"><Waypoints :size="13" /> Lifecycle procession</span>
        <span class="dc-hint">cases by stage · click to open</span>
      </div>
      <ExitProcession mode="cohort" :counts="stageCounts" @pick="onStagePick" />
    </Motion>

    <div class="dash-grid">
      <!-- Exit reasons -->
      <Motion as="div" class="dash-card ex-card ex-grain" :initial="reduced ? false : { opacity: 0, y: 16 }"
        :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, delay: 0.12, ease: [0.16, 1, 0.3, 1] }">
        <div class="dc-head"><span class="dc-eyebrow"><Compass :size="13" /> Exit reasons</span>
          <span class="dc-hint">why people leave</span></div>
        <div v-if="reasonRows.length" class="reason-bars">
          <button v-for="(r, i) in reasonRows" :key="r.key" class="reason-row" @click="$emit('go', 'reports')" type="button"
            :style="{ '--i': i }">
            <span class="rr-ico" :style="{ '--c': r.hex }"><component :is="r.icon" :size="13" /></span>
            <span class="rr-lab">{{ r.label }}</span>
            <span class="rr-track"><span class="rr-fill" :style="{ width: (revealed ? r.pct : 0) + '%', '--c': r.hex }" /></span>
            <span class="rr-val"><ExCountUp :value="r.count" /></span>
          </button>
        </div>
        <div v-else class="dc-empty"><Compass :size="22" /><span>No exit reasons recorded yet.</span></div>
      </Motion>

      <!-- Separation type donut -->
      <Motion as="div" class="dash-card ex-card ex-grain type-card" :initial="reduced ? false : { opacity: 0, y: 16 }"
        :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, delay: 0.18, ease: [0.16, 1, 0.3, 1] }">
        <div class="dc-head"><span class="dc-eyebrow"><ChartPie :size="13" /> Separation type</span>
          <span class="dc-hint">{{ donut.total }} total</span></div>
        <div v-if="donut.segs.length" class="type-body">
          <div class="donut-wrap" :class="{ in: revealed }">
            <span v-if="!reduced" class="donut-sheen" aria-hidden="true" />
            <svg class="donut-svg" viewBox="0 0 120 120" role="img" aria-label="Separation type breakdown">
              <circle class="donut-track" cx="60" cy="60" r="46" />
              <g transform="rotate(-90 60 60)">
                <circle v-for="s in donut.segs" :key="s.key" class="donut-arc" cx="60" cy="60" r="46"
                  :stroke="s.hex" :stroke-dasharray="s.dash" :stroke-dashoffset="s.offset"
                  :style="{ strokeWidth: hovered === s.key ? 18 : (hovered && hovered !== s.key ? 11 : 14), opacity: hovered && hovered !== s.key ? 0.4 : 1 }"
                  @mouseenter="hovered = s.key" @mouseleave="hovered = null"
                  @click="$emit('go', 'reports')" role="button" tabindex="0" />
              </g>
            </svg>
            <div class="donut-core">
              <span class="dn-val"><ExCountUp :value="activeDonutVal" /></span>
              <span class="dn-lab">{{ hoveredLabel }}</span>
            </div>
          </div>
          <div class="type-legend">
            <button v-for="s in donut.segs" :key="s.key" class="tl-row" :class="{ on: hovered === s.key }"
              @mouseenter="hovered = s.key" @mouseleave="hovered = null" @click="$emit('go', 'reports')" type="button">
              <span class="tl-dot" :style="{ background: s.hex }" />
              <span class="tl-lab">{{ s.label }}</span>
              <span class="tl-pct">{{ s.pct }}%</span>
              <span class="tl-val">{{ s.count }}</span>
            </button>
          </div>
        </div>
        <div v-else class="dc-empty"><ChartPie :size="22" /><span>No separations recorded yet.</span></div>
      </Motion>
    </div>

    <!-- Gateway launchpad -->
    <Motion as="div" class="dash-deck ex-card ex-grain" :initial="reduced ? false : { opacity: 0, y: 16 }"
      :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, delay: 0.24, ease: [0.16, 1, 0.3, 1] }">
      <div class="dc-head"><span class="dc-eyebrow"><LayoutGrid :size="13" /> Gateway modules</span>
        <button class="deck-link" @click="goEmployees" type="button">Lifecycle board <ArrowUpRight :size="13" /></button></div>
      <div class="deck-grid">
        <GatewayTile v-for="(m, i) in modules" :key="m.key" :icon="m.icon" :label="m.label" :hex="m.hex"
          :count="m.count" :alert="m.alert" :index="i" @activate="$emit('go', m.key)" />
      </div>
    </Motion>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Motion } from 'motion-v'
import {
  RefreshCw, Plus, Waypoints, Compass, ChartPie, LayoutGrid, ArrowUpRight,
  DoorOpen, CalendarClock, MessagesSquare, ClipboardCheck, PackageCheck, Scale,
  ScrollText, BadgeCheck, FileBadge, FileBarChart2, History,
} from 'lucide-vue-next'
import ExSectionHead from '../components/ExSectionHead.vue'
import ThresholdGate from '../components/ThresholdGate.vue'
import ExitProcession from '../components/ExitProcession.vue'
import GatewayTile from '../components/GatewayTile.vue'
import ExCountUp from '../components/ExCountUp.vue'
import { reasonMeta, RESIGNATION_TYPES } from '@/composables/useExit'
import { prefersReduced, useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  stats: { type: Object, default: null },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['go', 'refresh'])
const router = useRouter()
const reduced = prefersReduced()

const sectionRef = ref(null)
const { visible: revealed } = useInView(sectionRef, { threshold: 0.12 })
const hovered = ref(null)

const TYPE_PALETTE = ['#fbbf24', '#fb923c', '#ea580c', '#34d399', '#d97706', '#f59e0b', '#9ca3af']
const REASON_PALETTE = ['#fbbf24', '#fb923c', '#ea580c', '#f59e0b', '#d97706', '#34d399', '#60d394']

// Map by_status counts into the procession stage buckets.
// A COMPLETED case = employee RELIEVED (lifecycle EXITED); only an explicit,
// separate archive action moves them to ARCHIVED. The backend splits the
// COMPLETED bucket accordingly (completed_relieved / completed_archived). Fall
// back to treating COMPLETED as relieved if those fields aren't present, so a
// relieved person never shows under "Archive" just because the case is done.
const stageCounts = computed(() => {
  const s = props.stats?.by_status || {}
  const relievedRaw = props.stats?.completed_relieved
  const archivedRaw = props.stats?.completed_archived
  const hasSplit = relievedRaw != null || archivedRaw != null
  return {
    resignation: Number(s.DRAFT || 0),
    approval: Number(s.SUBMITTED || 0) + Number(s.MANAGER_REVIEW || 0),
    notice: Number(s.ACCEPTED || 0) + Number(s.NOTICE_PERIOD || 0),
    handover: 0, interview: 0,
    clearance: Number(s.CLEARANCE || 0),
    assets: 0,
    settlement: Number(s.SETTLEMENT || 0),
    experience: 0,
    relieving: hasSplit ? Number(relievedRaw || 0) : Number(s.COMPLETED || 0),
    archived: hasSplit ? Number(archivedRaw || 0) : 0,
  }
})

const reasonRows = computed(() => {
  const r = props.stats?.by_reason || {}
  const rows = Object.entries(r).map(([key, count]) => {
    const m = reasonMeta(key)
    return { key, count: Number(count), label: m.label, icon: m.icon }
  }).sort((a, b) => b.count - a.count).slice(0, 7)
  const max = Math.max(1, ...rows.map(x => x.count))
  return rows.map((x, i) => ({ ...x, hex: REASON_PALETTE[i % REASON_PALETTE.length], pct: Math.round((x.count / max) * 100) }))
})

const C = 2 * Math.PI * 46
const donut = computed(() => {
  const t = props.stats?.by_type || {}
  const rows = RESIGNATION_TYPES.map(rt => ({ key: rt.key, label: rt.label, count: Number(t[rt.key] || 0) }))
    .filter(x => x.count > 0)
  const total = rows.reduce((a, b) => a + b.count, 0)
  let cum = 0
  const segs = rows.map((r, idx) => {
    const share = total ? r.count / total : 0
    const len = Math.max(0, share * C - 1.5)
    const seg = {
      ...r, pct: Math.round(share * 100), hex: TYPE_PALETTE[idx % TYPE_PALETTE.length],
      dash: `${len.toFixed(2)} ${(C - len).toFixed(2)}`, offset: (-cum).toFixed(2),
    }
    cum += share * C
    return seg
  })
  return { segs, total }
})

const hoveredLabel = computed(() => {
  if (!hovered.value) return 'separations'
  return donut.value.segs.find(s => s.key === hovered.value)?.label || 'separations'
})
const activeDonutVal = computed(() => {
  if (!hovered.value) return donut.value.total
  return donut.value.segs.find(s => s.key === hovered.value)?.count || donut.value.total
})

const modules = computed(() => {
  const kp = props.stats?.kpis || {}
  return [
    { key: 'resignation', label: 'Resignations', icon: DoorOpen, hex: '#fbbf24', count: Number(kp.active_resignations || 0), alert: false },
    { key: 'notice', label: 'Notice period', icon: CalendarClock, hex: '#fb923c', count: Number(kp.serving_notice || 0), alert: false },
    { key: 'interviews', label: 'Exit interviews', icon: MessagesSquare, hex: '#fb923c', count: Number(kp.pending_interviews || 0), alert: Number(kp.pending_interviews || 0) > 0 },
    { key: 'clearance', label: 'Clearance', icon: ClipboardCheck, hex: '#d97706', count: Number(kp.pending_clearances || 0), alert: Number(kp.pending_clearances || 0) > 0 },
    { key: 'asset-return', label: 'Asset return', icon: PackageCheck, hex: '#fb923c', count: 0, alert: false },
    { key: 'settlement', label: 'Final settlement', icon: Scale, hex: '#34d399', count: Number(kp.pending_settlements || 0), alert: Number(kp.pending_settlements || 0) > 0 },
    { key: 'experience-letter', label: 'Experience letter', icon: ScrollText, hex: '#fcd34d', count: 0, alert: false },
    { key: 'relieving-letter', label: 'Relieving letter', icon: BadgeCheck, hex: '#60d394', count: 0, alert: false },
    { key: 'policies', label: 'Policies', icon: FileBadge, hex: '#f59e0b', count: 0, alert: false },
    { key: 'reports', label: 'Reports', icon: FileBarChart2, hex: '#9ca3af', count: 0, alert: false },
    { key: 'audit-logs', label: 'Audit logs', icon: History, hex: '#9ca3af', count: 0, alert: false },
  ]
})

const onStagePick = (key) => {
  const map = { resignation: 'resignation', approval: 'resignation', notice: 'notice',
    handover: 'clearance', interview: 'interviews', clearance: 'clearance', assets: 'asset-return',
    settlement: 'settlement', experience: 'experience-letter', relieving: 'relieving-letter', archived: 'reports' }
  emit('go', map[key] || 'resignation')
}
const goEmployees = () => router.push('/admin/hr/employees/lifecycle')
</script>

<style scoped>
.ex-dash { color: var(--ex-text); }
.ex-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 11px;
  font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid var(--ex-border-strong); background: var(--ex-surface); color: var(--ex-text); }
.ex-btn.primary { border: none; background: var(--ex-grad-hero); color: #1a1206; }
.ex-btn.ghost { background: transparent; }

.dash-card { position: relative; overflow: hidden; padding: 16px; background-image: var(--ex-grad-card); }
.proc-card { margin-top: 14px; }
.dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px; }
.dc-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.dc-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ex-violet); }
.dc-hint { font-size: 11px; color: var(--ex-text-muted); }
.dc-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 28px; color: var(--ex-text-dim); font-size: 12px; }

/* exit reasons */
.reason-bars { display: flex; flex-direction: column; gap: 9px; }
.reason-row { display: grid; grid-template-columns: 26px 1fr 90px 34px; align-items: center; gap: 9px; cursor: pointer; background: none; border: none; padding: 3px 4px; border-radius: 9px; transition: background 0.2s, transform 0.2s var(--ex-spring); }
.reason-row:hover { background: var(--ex-violet-soft); transform: translateX(2px); }
.rr-ico { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 7px; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); }
.rr-lab { font-size: 12px; color: var(--ex-text-secondary); text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rr-track { height: 8px; border-radius: 999px; background: var(--ex-steel-soft); overflow: hidden; }
.rr-fill { position: relative; display: block; height: 100%; border-radius: 999px; overflow: hidden;
  background: linear-gradient(90deg, color-mix(in srgb, var(--c) 55%, transparent), var(--c)); transition: width 1s var(--ex-spring); transition-delay: calc(var(--i) * 0.06s); }
.rr-fill::after { content: ""; position: absolute; inset: 0; background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.35), transparent); animation: ex-sheen-pass 3.4s ease-in-out infinite; }
.rr-val { font-family: var(--ex-mono); font-size: 13px; font-weight: 800; text-align: right; color: var(--ex-text); }

/* separation type donut */
.type-card { display: flex; flex-direction: column; }
.type-body { display: grid; grid-template-columns: 132px 1fr; gap: 14px; align-items: center; flex: 1; }
.donut-wrap { position: relative; width: 132px; height: 132px; }
.donut-svg { width: 132px; height: 132px; transform: scale(0.9); opacity: 0; transition: transform 0.6s var(--ex-spring), opacity 0.6s var(--ex-spring); transform-origin: center; }
.donut-wrap.in .donut-svg { transform: scale(1); opacity: 1; }
.donut-track { fill: none; stroke: var(--ex-steel-soft); stroke-width: 14; }
.donut-arc { fill: none; stroke-linecap: butt; cursor: pointer; transition: stroke-width 0.25s var(--ex-spring), opacity 0.25s; }
.donut-sheen { position: absolute; inset: 0; pointer-events: none; border-radius: 50%; z-index: 1;
  background: conic-gradient(from 0deg, transparent 0 68%, rgba(255, 240, 214, 0.28) 84%, transparent 100%);
  mask: radial-gradient(closest-side, transparent 56%, #000 60%, #000 78%, transparent 82%);
  -webkit-mask: radial-gradient(closest-side, transparent 56%, #000 60%, #000 78%, transparent 82%);
  animation: ex-spin-slow 12s linear infinite; }
.donut-core { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; }
.dn-val { font-family: var(--ex-mono); font-size: 26px; font-weight: 850; line-height: 1;
  background: var(--ex-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.dn-lab { font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ex-text-muted); margin-top: 2px; max-width: 90px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.type-legend { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.tl-row { display: grid; grid-template-columns: 10px 1fr 36px 26px; align-items: center; gap: 7px; cursor: pointer; background: none; border: none; padding: 4px 6px; border-radius: 8px; transition: background 0.2s; }
.tl-row:hover, .tl-row.on { background: var(--ex-violet-soft); }
.tl-dot { width: 9px; height: 9px; border-radius: 3px; }
.tl-lab { font-size: 11.5px; color: var(--ex-text-secondary); text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tl-pct { font-size: 10.5px; color: var(--ex-text-muted); text-align: right; font-family: var(--ex-mono); }
.tl-val { font-family: var(--ex-mono); font-size: 12px; font-weight: 800; text-align: right; color: var(--ex-text); }

/* gateway deck */
.dash-deck { margin-top: 14px; padding: 16px; position: relative; overflow: hidden; background-image: var(--ex-grad-card); }
.deck-link { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 700; color: var(--ex-violet); background: none; border: none; cursor: pointer; }
.deck-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 11px; }

@media (max-width: 900px) { .dash-grid { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) {
  .rr-fill, .rr-fill::after, .donut-svg, .donut-sheen { animation: none; transition: none; }
}
</style>
