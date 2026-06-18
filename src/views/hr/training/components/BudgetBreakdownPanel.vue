<template>
  <Motion as="section" class="bbp" ref="rootRef"
    :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
    <!-- ── by category ── -->
    <div class="bbp-col">
      <div class="bbp-head">
        <h3><ChartPie :size="14" /> Spend by category</h3>
        <span class="bbp-total trn-mono">₹{{ inr(catTotal) }}</span>
      </div>
      <template v-if="categories.length">
        <div class="bbp-cat-bar" :class="{ 'is-in': inView }">
          <span v-for="(c, i) in categories" :key="c.key" class="bbp-cat-seg" :style="{ '--c': c.color, width: inView ? c.pct + '%' : '0%', transitionDelay: (i * 0.08) + 's' }" :title="`${c.label}: ₹${inr(c.amount)}`" />
        </div>
        <div class="bbp-cat-legend">
          <div v-for="(c, i) in categories" :key="c.key" class="bbp-cat-row" :style="{ '--c': c.color, '--d': (0.1 + i * 0.05) + 's' }">
            <span class="bbp-cat-ic"><component :is="c.icon" :size="13" /></span>
            <span class="bbp-cat-name">{{ c.label }}</span>
            <span class="bbp-cat-pct trn-mono">{{ c.pct }}%</span>
            <span class="bbp-cat-amt trn-mono">₹{{ inr(c.amount) }}</span>
          </div>
        </div>
      </template>
      <div v-else class="bbp-empty"><Coins :size="20" /><span>No cost lines logged this year yet.</span></div>
    </div>

    <!-- ── by department ── -->
    <div class="bbp-col">
      <div class="bbp-head">
        <h3><Building2 :size="14" /> By department</h3>
        <span class="bbp-total trn-mono">{{ departments.length }} {{ departments.length === 1 ? 'unit' : 'units' }}</span>
      </div>
      <template v-if="departments.length">
        <div class="bbp-depts">
          <div v-for="(d, i) in departments" :key="d.key" class="bbp-dept" :style="{ '--d': (0.1 + i * 0.06) + 's' }">
            <div class="bbp-dept-top">
              <span class="bbp-dept-name">{{ d.name }}</span>
              <span class="bbp-dept-util trn-mono" :class="{ over: d.over }">{{ d.util }}%</span>
            </div>
            <div class="bbp-dept-bar" :class="{ 'is-in': inView, over: d.over }">
              <span class="bbp-dseg spent" :style="{ width: inView ? d.spentPct + '%' : '0%', transitionDelay: (0.15 + i * 0.05) + 's' }" />
              <span class="bbp-dseg committed" :style="{ width: inView ? d.commPct + '%' : '0%', transitionDelay: (0.2 + i * 0.05) + 's' }" />
            </div>
            <div class="bbp-dept-foot">
              <span><b class="trn-mono">₹{{ inr(d.allocated) }}</b> allocated</span>
              <span class="bbp-dept-rem" :class="{ neg: d.remaining < 0 }"><b class="trn-mono">₹{{ inr(d.remaining) }}</b> left</span>
            </div>
          </div>
        </div>
      </template>
      <div v-else class="bbp-empty"><Building2 :size="20" /><span>No departmental allocations yet.</span></div>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { ChartPie, Building2, Coins } from 'lucide-vue-next'
import { budgetCostMeta } from '@/composables/useTraining'
import { prefersReduced, useInView } from '@/composables/useShiftMotion'

const props = defineProps({ summary: { type: Object, default: null } })
const reduced = prefersReduced()
const rootRef = ref(null)
const { visible: inView } = useInView(rootRef, { threshold: 0.2 })

const n = (v) => Number(v || 0)
const inr = (v) => n(v).toLocaleString('en-IN')

const catTotal = computed(() => (props.summary?.by_cost_type || []).reduce((s, r) => s + n(r.amount), 0))
const categories = computed(() => {
  const total = catTotal.value || 1
  return (props.summary?.by_cost_type || [])
    .filter(r => n(r.amount) > 0)
    .map(r => {
      const m = budgetCostMeta(r.cost_type)
      return { key: r.cost_type, label: m.label, icon: m.icon, color: m.color, amount: n(r.amount), pct: Math.round((n(r.amount) / total) * 100) }
    })
})

const departments = computed(() => (props.summary?.by_department || []).map(d => {
  const alloc = n(d.allocated), spent = n(d.spent), comm = n(d.committed)
  const used = spent + comm
  return {
    key: d.department_id || '__org__', name: d.department_name || 'Org-wide',
    allocated: alloc, spent, committed: comm, remaining: n(d.remaining),
    util: alloc > 0 ? Math.round((used / alloc) * 100) : 0,
    spentPct: alloc > 0 ? Math.min(100, (spent / alloc) * 100) : 0,
    commPct: alloc > 0 ? Math.min(100 - (spent / alloc) * 100, (comm / alloc) * 100) : 0,
    over: used > alloc && alloc > 0,
  }
}).sort((a, b) => b.allocated - a.allocated))
</script>

<style scoped>
.bbp { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; padding: 18px 20px; border-radius: 18px;
  border: 1px solid var(--trn-border-soft); background: var(--trn-surf-card); box-shadow: var(--trn-card-shadow); }
.bbp-col { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.bbp-col + .bbp-col { padding-left: 22px; border-left: 1px solid var(--trn-border-soft); }
.bbp-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.bbp-head h3 { display: inline-flex; align-items: center; gap: 7px; margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--trn-text-muted); }
.bbp-head h3 :deep(svg) { color: var(--trn-amber-strong); }
.bbp-total { font-size: 12px; font-weight: 700; color: var(--trn-text-secondary); }

/* category */
.bbp-cat-bar { display: flex; height: 12px; border-radius: 999px; overflow: hidden; background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.bbp-cat-seg { display: block; height: 100%; background: var(--c); transition: width 1s var(--trn-spring); }
.bbp-cat-seg + .bbp-cat-seg { box-shadow: inset 1px 0 0 var(--trn-canvas); }
.bbp-cat-legend { display: flex; flex-direction: column; gap: 7px; }
.bbp-cat-row { display: flex; align-items: center; gap: 9px; opacity: 0; transform: translateX(-6px); animation: bbp-in 0.45s var(--trn-spring) forwards; animation-delay: var(--d); }
.bbp-cat-ic { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 7px; flex-shrink: 0; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); }
.bbp-cat-name { flex: 1; min-width: 0; font-size: 12.5px; font-weight: 600; color: var(--trn-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bbp-cat-pct { font-size: 11px; color: var(--trn-text-dim); }
.bbp-cat-amt { font-size: 12.5px; font-weight: 700; color: var(--trn-text); }

/* department */
.bbp-depts { display: flex; flex-direction: column; gap: 12px; }
.bbp-dept { display: flex; flex-direction: column; gap: 5px; opacity: 0; transform: translateY(8px); animation: bbp-rise 0.45s var(--trn-spring) forwards; animation-delay: var(--d); }
.bbp-dept-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.bbp-dept-name { font-size: 13px; font-weight: 700; color: var(--trn-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bbp-dept-util { font-size: 11.5px; font-weight: 700; color: var(--trn-amber-strong); }
.bbp-dept-util.over { color: var(--trn-st-failed); }
.bbp-dept-bar { position: relative; display: flex; height: 8px; border-radius: 999px; overflow: hidden; background: color-mix(in srgb, var(--trn-st-completed) 14%, var(--trn-surface)); border: 1px solid var(--trn-border-soft); }
.bbp-dept-bar.over { background: var(--trn-st-failed-soft); }
.bbp-dseg { display: block; height: 100%; transition: width 0.95s var(--trn-spring); }
.bbp-dseg.spent { background: linear-gradient(90deg, color-mix(in srgb, var(--trn-amber) 55%, transparent), var(--trn-amber)); }
.bbp-dseg.committed { background: repeating-linear-gradient(45deg, var(--trn-ember) 0, var(--trn-ember) 4px, color-mix(in srgb, var(--trn-ember) 55%, transparent) 4px, color-mix(in srgb, var(--trn-ember) 55%, transparent) 8px); }
.bbp-dept-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 11px; color: var(--trn-text-muted); }
.bbp-dept-foot b { color: var(--trn-text-secondary); font-weight: 700; }
.bbp-dept-rem.neg b { color: var(--trn-st-failed); }

.bbp-empty { display: flex; flex-direction: column; align-items: center; gap: 7px; padding: 26px 12px; text-align: center; color: var(--trn-text-dim);
  border: 1.5px dashed var(--trn-border-strong); border-radius: 13px; }
.bbp-empty span { font-size: 12px; max-width: 26ch; }

@keyframes bbp-in { to { opacity: 1; transform: translateX(0); } }
@keyframes bbp-rise { to { opacity: 1; transform: translateY(0); } }

@media (max-width: 760px) {
  .bbp { grid-template-columns: 1fr; }
  .bbp-col + .bbp-col { padding-left: 0; border-left: 0; padding-top: 16px; border-top: 1px solid var(--trn-border-soft); }
}
@media (prefers-reduced-motion: reduce) {
  .bbp-cat-seg, .bbp-dseg { transition: none !important; }
  .bbp-cat-row, .bbp-dept { animation: none; opacity: 1; transform: none; }
}
</style>
