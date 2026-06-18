<template>
  <Motion as="section" class="ach" ref="rootRef"
    :initial="reduced ? false : { opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
    <span class="ach-aurora" aria-hidden="true" />
    <span class="trn-spotlight" aria-hidden="true" />
    <span class="trn-grain" aria-hidden="true" />

    <div class="ach-top">
      <!-- lead + tools -->
      <div class="ach-lead">
        <span class="ach-eyebrow"><Radio :size="13" /> Activity Recorder</span>
        <h1 class="ach-title">Audit Logs</h1>
        <p class="ach-sub">Every mutation across the observatory — who touched what, and how the orbit changed. Immutable, time-ordered, traceable.</p>

        <div class="ach-tools">
          <div class="ach-search">
            <Search :size="15" />
            <input :value="search" @input="$emit('update:search', $event.target.value)" placeholder="Filter by note, actor or entity…" />
            <button v-if="search" class="ach-search-x" @click="$emit('update:search', '')" aria-label="Clear"><X :size="14" /></button>
          </div>
          <div class="ach-sel"><TrnSelect :model-value="entityType" @update:modelValue="$emit('update:entityType', $event)" :options="entityOptions" searchable search-placeholder="Find entity…" placeholder="All entities" /></div>
          <div class="ach-sel"><TrnSelect :model-value="action" @update:modelValue="$emit('update:action', $event)" :options="actionOptions" searchable search-placeholder="Find action…" placeholder="All actions" /></div>
          <div class="ach-range">
            <button v-for="r in RANGES" :key="r.value" class="ach-range-btn" :class="{ on: range === r.value }" @click="$emit('update:range', r.value)">{{ r.label }}</button>
          </div>
          <Motion as="button" type="button" class="ach-refresh" :whileHover="reduced ? {} : { rotate: 90 }" :whileTap="{ scale: 0.9 }"
            @click="$emit('refresh')" aria-label="Refresh"><RefreshCw :size="15" /></Motion>
        </div>
      </div>

      <!-- activity pulse equalizer -->
      <div class="ach-pulse">
        <header class="ach-pulse-head">
          <span class="ach-pulse-lab"><span class="ach-live" :class="{ on: windowTotal > 0 }" />Recent activity</span>
          <span class="ach-pulse-sub trn-mono">{{ windowTotal }} events · {{ PULSE_DAYS }}d</span>
        </header>
        <div class="ach-bars">
          <span v-for="(b, i) in pulse" :key="b.key" class="ach-bar" :class="{ today: b.isToday, zero: !b.count }"
            :style="{ height: visible ? Math.max(b.pct, b.count ? 8 : 3) + '%' : '0%', transitionDelay: (i * 0.03) + 's' }"
            :title="`${b.label}: ${b.count} event${b.count === 1 ? '' : 's'}`" />
        </div>
        <div class="ach-axis"><span>{{ pulse[0]?.short }}</span><span>Today</span></div>
      </div>
    </div>

    <!-- KPI capsules -->
    <div class="ach-kpis">
      <div v-for="(k, i) in kpis" :key="k.key" class="ach-kpi" :style="{ '--c': k.color }">
        <span class="ach-kpi-ic"><component :is="k.icon" :size="15" /></span>
        <div class="ach-kpi-body">
          <strong class="ach-kpi-val"><TrnCountUp :value="k.value" :duration="1.2" /></strong>
          <span class="ach-kpi-lab">{{ k.label }}</span>
        </div>
      </div>
    </div>

    <!-- family distribution -->
    <div class="ach-fam" ref="famRef" :class="{ 'is-in': famIn }">
      <div class="ach-fam-bar">
        <span v-for="(f, i) in famSegments" :key="f.key" class="ach-fam-seg" v-show="f.value"
          :style="{ width: famIn ? f.pct + '%' : '0%', background: f.color, transitionDelay: (i * 0.1) + 's' }"
          :title="`${f.label}: ${f.value}`" />
        <span v-if="!windowTotal" class="ach-fam-empty" />
      </div>
      <ul class="ach-fam-legend">
        <li v-for="f in famSegments" :key="f.key">
          <span class="ach-fam-dot" :style="{ background: f.color }" />
          <span class="ach-fam-name">{{ f.label }}</span>
          <span class="ach-fam-n trn-mono">{{ f.value }}</span>
        </li>
      </ul>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Radio, Search, X, RefreshCw, Layers, Activity, Users, Boxes } from 'lucide-vue-next'
import TrnSelect from './TrnSelect.vue'
import TrnCountUp from './TrnCountUp.vue'
import { ENTITY_TYPES, ACTIONS, FAMILIES, entityIcon, familyOf, familyColor, prettyLabel, dayKey } from './auditMeta.js'
import { prefersReduced, usePointerSpotlight, useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  total: { type: Number, default: 0 },
  sample: { type: Array, default: () => [] },
  search: { type: String, default: '' },
  entityType: { type: String, default: '' },
  action: { type: String, default: '' },
  range: { type: String, default: 'all' },
})
defineEmits(['update:search', 'update:entityType', 'update:action', 'update:range', 'refresh'])

const reduced = prefersReduced()
const rootRef = ref(null)
usePointerSpotlight(rootRef)
const { visible } = useInView(rootRef, { threshold: 0.15 })
const famRef = ref(null)
const { visible: famIn } = useInView(famRef, { threshold: 0.3 })

const RANGES = [
  { value: 'all', label: 'All' },
  { value: '30d', label: '30d' },
  { value: '7d', label: '7d' },
]

const PULSE_DAYS = 14
const pad = (n) => String(n).padStart(2, '0')
const localISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const pulse = computed(() => {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const buckets = []
  for (let i = PULSE_DAYS - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i)
    buckets.push({
      key: localISO(d), count: 0, isToday: i === 0,
      label: d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }),
      short: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
    })
  }
  const idx = {}; buckets.forEach((b, j) => { idx[b.key] = j })
  for (const e of props.sample) { const k = dayKey(e.created_at); if (k in idx) buckets[idx[k]].count++ }
  const max = Math.max(1, ...buckets.map(b => b.count))
  return buckets.map(b => ({ ...b, pct: Math.round((b.count / max) * 100) }))
})
const windowTotal = computed(() => props.sample.length)

const todayStr = localISO(new Date())
const todayCount = computed(() => props.sample.filter(e => dayKey(e.created_at) === todayStr).length)
const actorCount = computed(() => new Set(props.sample.filter(e => e.actor_name).map(e => e.actor_name)).size)
const entityCount = computed(() => new Set(props.sample.map(e => e.entity_type)).size)
const kpis = computed(() => [
  { key: 'total', label: 'Total events', value: props.total, icon: Layers, color: 'var(--trn-amber)' },
  { key: 'today', label: 'Today', value: todayCount.value, icon: Activity, color: 'var(--trn-amber-strong)' },
  { key: 'actors', label: 'Actors', value: actorCount.value, icon: Users, color: 'var(--trn-ember)' },
  { key: 'entities', label: 'Entities', value: entityCount.value, icon: Boxes, color: 'var(--trn-star)' },
])

const famCounts = computed(() => {
  const c = {}
  for (const e of props.sample) { const f = familyOf(e.action); c[f] = (c[f] || 0) + 1 }
  return c
})
const famSegments = computed(() => {
  const total = windowTotal.value || 1
  return FAMILIES.map(f => ({ ...f, value: famCounts.value[f.key] || 0, pct: ((famCounts.value[f.key] || 0) / total) * 100 }))
})

const entCounts = computed(() => {
  const c = {}
  for (const e of props.sample) c[e.entity_type] = (c[e.entity_type] || 0) + 1
  return c
})
const entityOptions = computed(() => [
  { value: '', label: 'All entities' },
  ...ENTITY_TYPES.map(e => ({ value: e, label: prettyLabel(e), icon: entityIcon(e), hint: entCounts.value[e] ? `${entCounts.value[e]} recent` : undefined })),
])
const actionOptions = computed(() => [
  { value: '', label: 'All actions' },
  ...ACTIONS.map(a => ({ value: a, label: prettyLabel(a), dot: familyColor(familyOf(a)) })),
])
</script>

<style scoped>
.ach { position: relative; overflow: hidden; isolation: isolate; border-radius: 24px; padding: 26px 28px 22px;
  border: 1px solid var(--trn-border-soft); background: var(--trn-grad-hero), var(--trn-surf-card); box-shadow: var(--trn-card-shadow); }
.ach-aurora { position: absolute; inset: -45% -20% auto -20%; height: 100%; z-index: 0; pointer-events: none;
  background: radial-gradient(54% 66% at 20% 0%, color-mix(in srgb, var(--trn-amber) 20%, transparent), transparent 60%),
    radial-gradient(56% 68% at 84% 8%, color-mix(in srgb, var(--trn-ember) 13%, transparent), transparent 60%);
  filter: blur(14px); opacity: 0.82; animation: ach-drift 19s ease-in-out infinite alternate; }
.ach-top { position: relative; z-index: 1; display: flex; align-items: stretch; justify-content: space-between; gap: 26px; }
.ach-lead { min-width: 0; flex: 1; }
.ach-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--trn-mono); font-size: 11px; font-weight: 600;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--trn-amber-strong); }
.ach-eyebrow :deep(svg) { color: var(--trn-amber); }
.ach-title { margin: 9px 0 0; font-size: 34px; font-weight: 850; letter-spacing: -0.03em; line-height: 1; color: var(--trn-text);
  background: linear-gradient(120deg, var(--trn-text) 38%, var(--trn-amber-strong)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.ach-sub { margin: 10px 0 0; font-size: 13px; color: var(--trn-text-muted); max-width: 56ch; }

.ach-tools { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 18px; }
.ach-search { display: flex; align-items: center; gap: 8px; padding: 0 10px 0 12px; border-radius: 12px; flex: 1; min-width: 220px;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); transition: border-color 0.2s, box-shadow 0.2s; }
.ach-search:focus-within { border-color: color-mix(in srgb, var(--trn-amber) 50%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--trn-amber) 14%, transparent); }
.ach-search :deep(svg) { color: var(--trn-text-dim); flex-shrink: 0; }
.ach-search input { flex: 1; min-width: 0; border: 0; background: transparent; padding: 9px 0; font: inherit; font-size: 13px; color: var(--trn-text); }
.ach-search input:focus { outline: none; }
.ach-search input::placeholder { color: var(--trn-text-dim); }
.ach-search-x { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; border: 0; cursor: pointer;
  background: var(--trn-surface-elevated); color: var(--trn-text-muted); flex-shrink: 0; }
.ach-search-x:hover { color: var(--trn-text); }
.ach-sel { width: 168px; }
.ach-range { display: inline-flex; padding: 3px; border-radius: 11px; background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.ach-range-btn { font: inherit; font-size: 12px; font-weight: 600; padding: 6px 11px; border: 0; border-radius: 8px; cursor: pointer;
  background: transparent; color: var(--trn-text-muted); transition: all 0.2s; }
.ach-range-btn.on { background: color-mix(in srgb, var(--trn-amber) 16%, transparent); color: var(--trn-amber-strong); }
.ach-refresh { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; cursor: pointer; flex-shrink: 0;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); color: var(--trn-text-secondary); }
.ach-refresh:hover { color: var(--trn-amber-strong); border-color: color-mix(in srgb, var(--trn-amber) 38%, transparent); }

/* pulse equalizer */
.ach-pulse { flex-shrink: 0; width: 320px; display: flex; flex-direction: column; gap: 8px; padding: 14px 16px; border-radius: 18px;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.ach-pulse-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ach-pulse-lab { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 700; color: var(--trn-text-secondary); }
.ach-live { width: 7px; height: 7px; border-radius: 50%; background: var(--trn-text-dim); }
.ach-live.on { background: var(--trn-st-completed); box-shadow: 0 0 0 0 color-mix(in srgb, var(--trn-st-completed) 60%, transparent); animation: ach-ping 2s ease-in-out infinite; }
.ach-pulse-sub { font-size: 10.5px; color: var(--trn-text-dim); }
.ach-bars { display: flex; align-items: flex-end; gap: 3px; height: 78px; padding: 4px 0; }
.ach-bar { flex: 1; min-height: 3px; border-radius: 3px 3px 2px 2px; align-self: flex-end;
  background: linear-gradient(180deg, var(--trn-amber-strong), color-mix(in srgb, var(--trn-amber) 35%, transparent));
  transition: height 0.7s var(--trn-spring); }
.ach-bar.zero { background: var(--trn-border-strong); opacity: 0.5; }
.ach-bar.today { background: linear-gradient(180deg, var(--trn-amber-bright), var(--trn-ember));
  box-shadow: 0 0 12px -2px var(--trn-amber); }
.ach-axis { display: flex; justify-content: space-between; font-size: 9.5px; color: var(--trn-text-dim); }

/* KPI capsules */
.ach-kpis { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 22px;
  padding-top: 20px; border-top: 1px solid var(--trn-border-soft); }
.ach-kpi { display: flex; align-items: center; gap: 11px; padding: 11px 14px; border-radius: 14px; border: 1px solid var(--trn-border-soft);
  background: var(--trn-surface); }
.ach-kpi-ic { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; flex-shrink: 0; color: var(--c);
  background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 26%, transparent); }
.ach-kpi-body { display: flex; flex-direction: column; gap: 0; min-width: 0; }
.ach-kpi-val { font-family: var(--trn-mono); font-size: 22px; font-weight: 850; line-height: 1.1; color: var(--trn-text); }
.ach-kpi-lab { font-size: 10.5px; color: var(--trn-text-muted); }

/* family distribution */
.ach-fam { position: relative; z-index: 1; margin-top: 16px; display: flex; flex-direction: column; gap: 10px; }
.ach-fam-bar { display: flex; height: 10px; border-radius: 999px; overflow: hidden; background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.ach-fam-seg { height: 100%; width: 0; transition: width 0.9s var(--trn-spring); }
.ach-fam-seg:not(:last-child) { border-right: 2px solid var(--trn-canvas); }
.ach-fam-empty { flex: 1; background: linear-gradient(90deg, var(--trn-border-soft), transparent); }
.ach-fam-legend { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px 20px; }
.ach-fam-legend li { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; }
.ach-fam-dot { width: 9px; height: 9px; border-radius: 3px; flex-shrink: 0; }
.ach-fam-name { color: var(--trn-text-secondary); }
.ach-fam-n { font-weight: 700; color: var(--trn-text); }

@keyframes ach-drift { 0% { transform: translate3d(-3%, -2%, 0) scale(1); } 100% { transform: translate3d(4%, 3%, 0) scale(1.07); } }
@keyframes ach-ping { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--trn-st-completed) 55%, transparent); } 50% { box-shadow: 0 0 0 5px transparent; } }

@media (max-width: 1000px) {
  .ach-top { flex-direction: column; }
  .ach-pulse { width: 100%; }
}
@media (max-width: 720px) {
  .ach-kpis { grid-template-columns: repeat(2, 1fr); }
  .ach-sel { width: 100%; flex: 1 1 140px; }
}
@media (prefers-reduced-motion: reduce) {
  .ach-aurora, .ach-live.on { animation: none !important; }
  .ach-bar, .ach-fam-seg { transition: none !important; }
}
</style>
