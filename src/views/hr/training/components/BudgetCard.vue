<template>
  <Motion as="article" class="bgc" :class="[`h-${health.key}`, { archived: budget.is_active === false, expanded }]"
    :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.42, delay: Math.min(index * 0.05, 0.34), ease: [0.16, 1, 0.3, 1] }">
    <span class="bgc-rail-accent" aria-hidden="true" />

    <div class="bgc-head">
      <div class="bgc-id">
        <h3>{{ budget.name }}</h3>
        <div class="bgc-badges">
          <span class="bgc-badge"><CalendarRange :size="11" /> {{ periodLabel }} · FY{{ String(budget.fiscal_year).slice(-2) }}</span>
          <span class="bgc-badge"><Building2 :size="11" /> {{ budget.department_name || 'Org-wide' }}</span>
          <span v-if="budget.is_active === false" class="bgc-badge muted">Archived</span>
        </div>
      </div>
      <div class="bgc-util">
        <span class="bgc-util-v trn-mono">{{ util }}<small>%</small></span>
        <span class="bgc-util-l"><span class="bgc-health-dot" /> {{ health.label }}</span>
      </div>
    </div>

    <!-- stacked fuel rail -->
    <div class="bgc-rail" :class="{ over }">
      <span class="bgc-seg spent" :style="{ width: shown ? segPct(budget.spent_amount) + '%' : '0%' }" />
      <span class="bgc-seg committed" :style="{ width: shown ? segPct(budget.committed_amount) + '%' : '0%', transitionDelay: '0.1s' }" />
      <span v-if="!over" class="bgc-rail-cap" :style="{ left: shown ? Math.min(100, segPct(budget.spent_amount) + segPct(budget.committed_amount)) + '%' : '0%' }" />
    </div>

    <Presence>
      <Motion v-if="over" as="div" class="bgc-alert"
        :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }" :transition="{ duration: 0.3 }">
        <TriangleAlert :size="13" /> Over budget by <b>₹{{ inr(Math.abs(num(budget.remaining))) }}</b>
      </Motion>
    </Presence>

    <div class="bgc-amounts">
      <div><b><TrnCountUp :value="num(budget.allocated_amount)" prefix="₹" /></b><span>Allocated</span></div>
      <div><b class="spent"><TrnCountUp :value="num(budget.spent_amount)" prefix="₹" /></b><span>Spent</span></div>
      <div><b class="committed"><TrnCountUp :value="num(budget.committed_amount)" prefix="₹" /></b><span>Committed</span></div>
      <div><b class="remaining" :class="{ neg: num(budget.remaining) < 0 }"><TrnCountUp :value="num(budget.remaining)" prefix="₹" /></b><span>Remaining</span></div>
    </div>

    <div class="bgc-foot">
      <button class="bgc-act" :class="{ on: expanded }" @click="$emit('toggle-items', budget)">
        <ListTree :size="14" /> Cost lines
        <span class="bgc-act-n">{{ budget.item_count || 0 }}</span>
        <ChevronDown :size="13" class="bgc-chev" :class="{ up: expanded }" />
      </button>
      <button class="bgc-act" @click="$emit('edit', budget)"><Pencil :size="14" /> Edit</button>
      <button class="bgc-act icon" :title="budget.is_active === false ? 'Restore' : 'Archive'" @click="$emit('toggle-active', budget)">
        <component :is="budget.is_active === false ? ArchiveRestore : Archive" :size="14" />
      </button>
      <button class="bgc-act icon danger" title="Delete" @click="$emit('delete', budget)"><Trash2 :size="14" /></button>
    </div>

    <!-- cost lines -->
    <Transition name="bgc-exp">
      <div v-if="expanded" class="bgc-items">
        <div v-if="itemsLoading" class="bgc-items-load"><span class="trn-skel" style="height:42px" /><span class="trn-skel" style="height:42px" /></div>
        <template v-else>
          <!-- per-budget category mix -->
          <div v-if="catMix.length" class="bgc-mix">
            <div class="bgc-mix-bar">
              <span v-for="c in catMix" :key="c.key" class="bgc-mix-seg" :style="{ '--c': c.color, width: c.pct + '%' }" :title="`${c.label}: ₹${inr(c.amount)}`" />
            </div>
            <div class="bgc-mix-tags">
              <span v-for="c in catMix" :key="c.key" class="bgc-mix-tag" :style="{ '--c': c.color }"><span class="bgc-mix-dot" /> {{ c.label }}</span>
            </div>
          </div>

          <div v-if="!items.length" class="bgc-noitems">No cost lines yet — add the first spend or commitment.</div>

          <TransitionGroup name="bgc-row" tag="div" class="bgc-itemlist">
            <div v-for="(it, i) in items" :key="it.id" class="bgc-item" :style="{ '--d': (i * 0.04) + 's' }">
              <span class="bgc-item-ic" :style="{ '--c': meta(it).color }"><component :is="meta(it).icon" :size="13" /></span>
              <div class="bgc-item-main">
                <span class="bgc-item-title">{{ it.title || meta(it).label }}</span>
                <span class="bgc-item-sub">
                  <span class="bgc-item-type">{{ meta(it).label }}</span>
                  <button v-if="it.program_name" class="bgc-link" @click="$emit('go', 'programs')"><BookOpen :size="10" /> {{ it.program_name }}</button>
                  <button v-if="it.trainer_name" class="bgc-link" @click="$emit('go', 'trainers')"><Presentation :size="10" /> {{ it.trainer_name }}</button>
                  <span v-if="it.incurred_date" class="bgc-item-date">{{ fmtDate(it.incurred_date) }}</span>
                </span>
              </div>
              <span class="bgc-item-tag" :class="{ committed: it.is_committed }">{{ it.is_committed ? 'Committed' : 'Spent' }}</span>
              <span class="bgc-item-amt trn-mono">₹{{ inr(it.amount) }}</span>
              <div class="bgc-item-del">
                <template v-if="confirmingId === it.id">
                  <button class="bgc-confirm yes" @click="doRemove(it)"><Check :size="13" /></button>
                  <button class="bgc-confirm no" @click="confirmingId = null"><X :size="13" /></button>
                </template>
                <button v-else class="bgc-item-x" @click="confirmingId = it.id"><Trash2 :size="13" /></button>
              </div>
            </div>
          </TransitionGroup>

          <Motion as="button" type="button" class="bgc-additem" :whileHover="{ y: -1 }" :whileTap="{ scale: 0.97 }" @click="$emit('add-item', budget)">
            <Plus :size="14" /> Add cost line
          </Motion>
        </template>
      </div>
    </Transition>
  </Motion>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  CalendarRange, Building2, ListTree, Pencil, Trash2, ChevronDown, Plus, Check, X,
  TriangleAlert, Archive, ArchiveRestore, BookOpen, Presentation,
} from 'lucide-vue-next'
import TrnCountUp from './TrnCountUp.vue'
import { budgetCostMeta } from '@/composables/useTraining'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  budget: { type: Object, required: true },
  index: { type: Number, default: 0 },
  expanded: { type: Boolean, default: false },
  items: { type: Array, default: () => [] },
  itemsLoading: { type: Boolean, default: false },
})
const emit = defineEmits(['edit', 'delete', 'toggle-items', 'add-item', 'remove-item', 'toggle-active', 'go'])
const reduced = prefersReduced()

const confirmingId = ref(null)
watch(() => props.expanded, (v) => { if (!v) confirmingId.value = null })

const num = (v) => Number(v || 0)
const inr = (v) => num(v).toLocaleString('en-IN')
const meta = (it) => budgetCostMeta(it.cost_type)

const util = computed(() => Math.round(num(props.budget.utilization_pct) || 0))
const over = computed(() => util.value > 100)
const segPct = (v) => {
  const a = num(props.budget.allocated_amount)
  return a > 0 ? Math.min(100, (num(v) / a) * 100) : 0
}
const health = computed(() => {
  if (over.value) return { key: 'over', label: 'Over' }
  if (!num(props.budget.allocated_amount)) return { key: 'none', label: '—' }
  if (util.value >= 90) return { key: 'tight', label: 'Tight' }
  if (util.value >= 70) return { key: 'watch', label: 'Watch' }
  return { key: 'healthy', label: 'Healthy' }
})

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const periodLabel = computed(() => {
  const t = props.budget.period_type, idx = props.budget.period_index
  if (t === 'ANNUAL') return 'Annual'
  if (t === 'QUARTERLY') return idx ? `Q${idx}` : 'Quarterly'
  if (t === 'MONTHLY') return (idx >= 1 && idx <= 12) ? MONTHS[idx - 1] : 'Monthly'
  return t || '—'
})

const catMix = computed(() => {
  const total = props.items.reduce((s, it) => s + num(it.amount), 0) || 1
  const by = {}
  for (const it of props.items) {
    const k = it.cost_type || 'OTHER'
    by[k] = (by[k] || 0) + num(it.amount)
  }
  return Object.entries(by).map(([k, amount]) => {
    const m = budgetCostMeta(k)
    return { key: k, label: m.label, color: m.color, amount, pct: Math.round((amount / total) * 100) }
  }).sort((a, b) => b.amount - a.amount)
})

const fmtDate = (d) => {
  if (!d) return ''
  const dt = new Date(d)
  return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

const doRemove = (it) => { emit('remove-item', { item: it, budget: props.budget }); confirmingId.value = null }

const shown = ref(false)
onMounted(() => nextTick(() => { shown.value = true }))
</script>

<style scoped>
.bgc { --hc: var(--trn-st-completed); position: relative; overflow: hidden; padding: 16px 18px 16px 20px; border-radius: 18px;
  border: 1px solid var(--trn-border-soft); background: var(--trn-surf-card); box-shadow: var(--trn-card-shadow);
  display: flex; flex-direction: column; gap: 13px; transition: box-shadow 0.3s, border-color 0.3s; }
.bgc:hover { box-shadow: var(--trn-card-shadow-hover); border-color: color-mix(in srgb, var(--hc) 28%, transparent); }
.bgc.h-watch { --hc: var(--trn-amber-strong); } .bgc.h-tight { --hc: var(--trn-ember); }
.bgc.h-over { --hc: var(--trn-st-failed); } .bgc.h-none { --hc: var(--trn-star-dim); }
.bgc.archived { opacity: 0.7; }
.bgc-rail-accent { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: linear-gradient(180deg, var(--hc), color-mix(in srgb, var(--hc) 30%, transparent)); }
.bgc.h-over .bgc-rail-accent { box-shadow: 0 0 12px -1px var(--hc); }

.bgc-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.bgc-id { min-width: 0; }
.bgc-id h3 { margin: 0 0 7px; font-size: 15.5px; font-weight: 750; color: var(--trn-text); line-height: 1.25; }
.bgc-badges { display: flex; flex-wrap: wrap; gap: 6px; }
.bgc-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 600; color: var(--trn-text-muted);
  padding: 3px 8px; border-radius: 7px; background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.bgc-badge :deep(svg) { color: var(--trn-text-dim); }
.bgc-badge.muted { color: var(--trn-text-dim); }
.bgc-util { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
.bgc-util-v { font-size: 26px; font-weight: 850; line-height: 1; color: var(--hc); }
.bgc-util-v small { font-size: 13px; font-weight: 700; }
.bgc-util-l { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--trn-text-dim); margin-top: 3px; }
.bgc-health-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--hc); }

.bgc-rail { position: relative; display: flex; height: 9px; border-radius: 999px; overflow: hidden;
  background: color-mix(in srgb, var(--trn-st-completed) 15%, var(--trn-surface)); border: 1px solid var(--trn-border-soft); }
.bgc-rail.over { background: var(--trn-st-failed-soft); }
.bgc-seg { display: block; height: 100%; transition: width 1s var(--trn-spring); }
.bgc-seg.spent { background: linear-gradient(90deg, color-mix(in srgb, var(--trn-amber) 55%, transparent), var(--trn-amber)); }
.bgc-seg.committed { background: repeating-linear-gradient(45deg, var(--trn-ember) 0, var(--trn-ember) 4px, color-mix(in srgb, var(--trn-ember) 55%, transparent) 4px, color-mix(in srgb, var(--trn-ember) 55%, transparent) 8px); }
.bgc-rail-cap { position: absolute; top: -2px; bottom: -2px; width: 2px; background: #fff; box-shadow: 0 0 6px var(--trn-amber); transition: left 1s var(--trn-spring); }
[data-theme="light"] .bgc-rail-cap { background: var(--trn-amber-strong); }

.bgc-alert { display: flex; align-items: center; gap: 6px; overflow: hidden; font-size: 12px; font-weight: 600; color: var(--trn-st-failed);
  padding: 8px 11px; border-radius: 10px; background: var(--trn-st-failed-soft); border: 1px solid color-mix(in srgb, var(--trn-st-failed) 28%, transparent); }
.bgc-alert b { font-family: var(--trn-mono); }

.bgc-amounts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.bgc-amounts div { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.bgc-amounts b { font-family: var(--trn-mono); font-size: 13.5px; font-weight: 800; color: var(--trn-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bgc-amounts b.spent { color: var(--trn-amber-strong); } .bgc-amounts b.committed { color: var(--trn-ember); }
.bgc-amounts b.remaining { color: var(--trn-st-completed); } .bgc-amounts b.remaining.neg { color: var(--trn-st-failed); }
.bgc-amounts span { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--trn-text-dim); }

.bgc-foot { display: flex; align-items: center; gap: 6px; border-top: 1px solid var(--trn-border-soft); padding-top: 12px; }
.bgc-act { display: inline-flex; align-items: center; gap: 5px; font: inherit; font-size: 12px; font-weight: 600; padding: 7px 11px; border-radius: 9px;
  border: 1px solid var(--trn-border-soft); background: var(--trn-surface); color: var(--trn-text-secondary); cursor: pointer; transition: all 0.2s; }
.bgc-act:hover { color: var(--trn-text); background: var(--trn-surface-elevated); }
.bgc-act.on { color: var(--trn-amber-strong); border-color: color-mix(in srgb, var(--trn-amber) 38%, transparent); background: color-mix(in srgb, var(--trn-amber) 12%, transparent); }
.bgc-act-n { font-family: var(--trn-mono); font-size: 10px; font-weight: 800; padding: 1px 6px; border-radius: 999px; background: color-mix(in srgb, var(--trn-amber) 16%, transparent); color: var(--trn-amber-strong); }
.bgc-chev { transition: transform 0.3s var(--trn-spring); }
.bgc-chev.up { transform: rotate(180deg); }
.bgc-act.icon { margin-left: 0; padding: 7px 9px; }
.bgc-act.icon.danger { margin-left: auto; color: var(--trn-st-failed); }
.bgc-act.icon.danger:hover { background: var(--trn-st-failed-soft); }

/* cost lines */
.bgc-items { display: flex; flex-direction: column; gap: 10px; border-top: 1px dashed var(--trn-border-soft); padding-top: 12px; }
.bgc-items-load { display: flex; flex-direction: column; gap: 6px; }
.bgc-mix { display: flex; flex-direction: column; gap: 7px; }
.bgc-mix-bar { display: flex; height: 7px; border-radius: 999px; overflow: hidden; background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.bgc-mix-seg { display: block; height: 100%; background: var(--c); }
.bgc-mix-seg + .bgc-mix-seg { box-shadow: inset 1px 0 0 var(--trn-canvas); }
.bgc-mix-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.bgc-mix-tag { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 600; color: var(--trn-text-muted); }
.bgc-mix-dot { width: 8px; height: 8px; border-radius: 3px; background: var(--c); }
.bgc-noitems { font-size: 12px; color: var(--trn-text-dim); padding: 2px 0; }
.bgc-itemlist { display: flex; flex-direction: column; gap: 6px; position: relative; }
.bgc-item { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 11px; background: var(--trn-surface); border: 1px solid var(--trn-border-soft);
  animation: bgc-item-in 0.4s var(--trn-spring) both; animation-delay: var(--d); }
.bgc-item-ic { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); }
.bgc-item-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.bgc-item-title { font-size: 12.5px; font-weight: 600; color: var(--trn-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bgc-item-sub { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 10.5px; color: var(--trn-text-dim); }
.bgc-item-type { font-family: var(--trn-mono); font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--trn-text-muted); }
.bgc-link { display: inline-flex; align-items: center; gap: 3px; font: inherit; font-size: 10.5px; padding: 0; border: 0; background: transparent; cursor: pointer; color: var(--trn-amber-strong); }
.bgc-link:hover { text-decoration: underline; }
.bgc-item-date { font-style: italic; }
.bgc-item-tag { flex-shrink: 0; font-size: 9px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; padding: 2px 7px; border-radius: 999px; color: var(--trn-amber-strong); background: color-mix(in srgb, var(--trn-amber) 13%, transparent); }
.bgc-item-tag.committed { color: var(--trn-ember); background: color-mix(in srgb, var(--trn-ember) 13%, transparent); }
.bgc-item-amt { font-size: 13px; font-weight: 800; color: var(--trn-text); flex-shrink: 0; }
.bgc-item-del { display: flex; align-items: center; gap: 3px; flex-shrink: 0; }
.bgc-item-x { display: inline-flex; padding: 4px; border-radius: 7px; border: 0; background: transparent; color: var(--trn-text-dim); cursor: pointer; transition: all 0.2s; }
.bgc-item-x:hover { color: var(--trn-st-failed); background: var(--trn-st-failed-soft); }
.bgc-confirm { display: inline-flex; padding: 4px; border-radius: 7px; border: 0; cursor: pointer; }
.bgc-confirm.yes { color: #fff; background: var(--trn-st-failed); }
.bgc-confirm.no { color: var(--trn-text-muted); background: var(--trn-surface-elevated); }
.bgc-additem { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; font: inherit; font-size: 12px; font-weight: 600; padding: 7px 13px; border-radius: 10px;
  border: 1px dashed color-mix(in srgb, var(--trn-amber) 40%, transparent); background: color-mix(in srgb, var(--trn-amber) 8%, transparent); color: var(--trn-amber-strong); cursor: pointer; }
.bgc-additem:hover { background: color-mix(in srgb, var(--trn-amber) 14%, transparent); }

.bgc-exp-enter-active, .bgc-exp-leave-active { transition: all 0.34s var(--trn-ease); overflow: hidden; }
.bgc-exp-enter-from, .bgc-exp-leave-to { opacity: 0; max-height: 0; padding-top: 0; }
.bgc-exp-enter-to, .bgc-exp-leave-from { opacity: 1; max-height: 800px; }
.bgc-row-enter-active { transition: all 0.3s var(--trn-spring); }
.bgc-row-leave-active { transition: all 0.25s var(--trn-spring); position: absolute; width: 100%; }
.bgc-row-enter-from { opacity: 0; transform: translateX(8px); }
.bgc-row-leave-to { opacity: 0; transform: scale(0.97); }

@keyframes bgc-item-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) {
  .bgc-seg, .bgc-rail-cap, .bgc-chev { transition: none !important; }
  .bgc-item { animation: none; }
}
</style>
