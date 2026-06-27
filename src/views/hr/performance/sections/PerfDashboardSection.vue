<template>
  <div class="pd-sec">
    <PerfHero eyebrow="People · Performance" title="Performance" accent="Arena" :icon="Gauge"
      sub="Run reviews against your appraisal rubrics — self-assessment, manager scoring, calibration and sign-off, all scored on the weights you set in Settings.">
      <template #actions>
        <button class="perf-btn perf-btn-steel" type="button" @click="openModal('launch')"><Rocket :size="15" /> Launch cycle</button>
        <button class="perf-btn perf-btn-primary" type="button" @click="openModal('single')"><Plus :size="15" /> New review</button>
      </template>
      <template #lenses>
        <div class="pd-lenses">
          <button v-for="(l, i) in lenses" :key="l.key" class="pd-lens" type="button" :style="{ '--acc': l.color, '--i': i }"
            @click="$emit('go', l.go)">
            <span class="pd-lens-ic"><component :is="l.icon" :size="15" /></span>
            <span class="pd-lens-val"><SetCountUp :value="l.value" :decimals="l.decimals || 0" :suffix="l.suffix || ''" /></span>
            <span class="pd-lens-lab">{{ l.label }}</span>
            <span class="pd-lens-spark" aria-hidden="true" />
            <span class="pd-lens-bar" />
          </button>
        </div>
      </template>
    </PerfHero>

    <!-- ═══ The signature instrument ═══ -->
    <PerfObservatory :stats="stats" :max="5" @pick="onObsPick" />

    <!-- ═══ Command grid ═══ -->
    <div class="pd-grid2">
      <!-- Workflow pipeline -->
      <div class="pd-panel">
        <div class="pd-panel-head"><Workflow :size="14" /> Review pipeline <span class="pd-head-tail">{{ total }} in motion</span></div>

        <div class="pd-relay">
          <span class="pd-relay-track"><i class="pd-relay-pulse" /></span>
          <button v-for="(p, i) in PIPELINE" :key="p.key" class="pd-relay-st" type="button" :style="{ '--c': statusMeta(p.key).color, '--i': i }"
            @click="$emit('go', 'reviews')">
            <span class="pd-relay-node" :class="{ on: count(p.key) > 0 }">
              <component :is="p.icon" :size="14" />
              <b v-if="count(p.key)">{{ count(p.key) }}</b>
            </span>
            <span class="pd-relay-lab">{{ p.label }}</span>
          </button>
        </div>

        <div class="pd-dist">
          <div class="pd-dist-eyebrow">Status distribution</div>
          <div class="pd-dist-bar">
            <span v-for="s in distSegs" :key="s.key" class="pd-dist-seg" :style="{ width: ready ? s.pct + '%' : '0%', '--c': s.color }"
              :title="`${s.label}: ${s.count}`" />
            <span v-if="!total" class="pd-dist-empty" />
          </div>
          <div class="pd-dist-legend">
            <span v-for="s in distSegs" :key="'l' + s.key" class="pd-dist-leg" :style="{ '--c': s.color }">
              <i /><b>{{ s.label }}</b><em>{{ s.count }}</em>
            </span>
            <span v-if="!total" class="pd-dist-leg muted"><i style="--c: var(--perf-unset)" />No reviews yet</span>
          </div>
        </div>
      </div>

      <!-- Score calibration ridge -->
      <div class="pd-panel pd-panel-flush">
        <PerfScoreRidge :bands="stats.score_bands || []" :avg="stats.avg_overall ?? null" :max="5" />
      </div>
    </div>

    <div class="pd-grid2">
      <!-- Recent activity -->
      <div class="pd-panel">
        <div class="pd-panel-head"><History :size="14" /> Recent activity</div>
        <div v-if="(stats.recent || []).length" class="pd-recent">
          <button v-for="(r, i) in stats.recent" :key="r.id" class="pd-rrow" type="button" :style="{ '--i': i }" @click="$emit('go', 'reviews')">
            <span class="pd-rav">{{ initials(r.employee_name) }}<i v-if="i === 0" class="pd-rlive" /></span>
            <span class="pd-rtxt"><b>{{ r.employee_name }}</b><span>{{ r.period_label || cycleLabel(r.cycle) }}</span></span>
            <span v-if="r.overall_score != null" class="pd-rscore" :style="{ color: scoreTone(r.overall_score, r.rating_max) }">{{ r.overall_score.toFixed(1) }}</span>
            <PerfStatusStamp :status="r.status" size="sm" />
          </button>
        </div>
        <p v-else class="pd-empty">No reviews yet — launch a cycle to begin.</p>
      </div>

      <!-- By cycle -->
      <div class="pd-panel">
        <div class="pd-panel-head"><CalendarRange :size="14" /> By cycle</div>
        <div v-if="(stats.by_cycle || []).length" class="pd-cycles">
          <button v-for="(c, i) in stats.by_cycle" :key="c.cycle" class="pd-crow" type="button" :style="{ '--i': i }" @click="$emit('go', 'cycles')">
            <span class="pd-clab">{{ cycleLabel(c.cycle) }}</span>
            <span class="pd-cbar"><i :style="{ width: ready ? Math.min(100, c.count / maxCycle * 100) + '%' : '0%' }" /></span>
            <b class="pd-cn">{{ c.count }}</b>
            <span v-if="c.avg != null" class="pd-cavg">avg {{ c.avg.toFixed(1) }}</span>
          </button>
        </div>
        <p v-else class="pd-empty">No cycles run yet.</p>
      </div>
    </div>

    <!-- ═══ Module launchpad — every Performance surface, one click away ═══ -->
    <div class="pd-deck">
      <div class="pd-deck-head"><Compass :size="14" /> Performance modules <span class="pd-head-tail">jump anywhere in the Arena</span></div>
      <div class="pd-deck-grid">
        <div v-for="(m, i) in modules" :key="m.key" class="pd-tile-shell" :style="{ '--i': i }">
          <button class="pd-tile" type="button" v-tilt="{ max: 6, scale: 1.03 }" :style="{ '--acc': m.color }" @click="$emit('go', m.key)">
            <span class="pd-tile-glare" aria-hidden="true" />
            <span class="pd-tile-ic" data-tilt-depth="22"><component :is="m.icon" :size="18" /></span>
            <span class="pd-tile-body" data-tilt-depth="12">
              <b class="pd-tile-lab">{{ m.label }}</b>
              <span class="pd-tile-sub">{{ m.sub }}</span>
            </span>
            <span class="pd-tile-foot">
              <span v-if="m.metric != null" class="pd-tile-metric">{{ m.metric }}</span>
              <ArrowUpRight :size="15" class="pd-tile-arrow" />
            </span>
          </button>
        </div>
      </div>
    </div>

    <transition name="pd-fade">
      <button v-if="stats.overdue" class="pd-overdue" type="button" @click="$emit('go', 'reviews')">
        <TriangleAlert :size="15" /> <b>{{ stats.overdue }}</b> review{{ stats.overdue > 1 ? 's' : '' }} past due — nudge reviewers from the Reviews tab.
        <ArrowRight :size="14" class="pd-overdue-go" />
      </button>
    </transition>

    <!-- direct launch from Command -->
    <PerfReviewModal :open="modalOpen" :mode="modalMode" :templates="templates" :saving="saving"
      @close="modalOpen = false" @save="onSave" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import {
  Gauge, Plus, Rocket, Workflow, History, CalendarRange, TriangleAlert, Compass, ArrowUpRight, ArrowRight,
  ClipboardList, PencilRuler, UserCheck, BadgeCheck, BarChart3, Grid3x3, Target, Orbit, LifeBuoy,
} from 'lucide-vue-next'
import PerfHero from '../components/PerfHero.vue'
import PerfObservatory from '../components/PerfObservatory.vue'
import PerfScoreRidge from '../components/PerfScoreRidge.vue'
import PerfStatusStamp from '../components/PerfStatusStamp.vue'
import PerfReviewModal from '../components/PerfReviewModal.vue'
import SetCountUp from '@/views/hr/settings/components/SetCountUp.vue'
import { fetchPerformanceStats, createReview, bulkCreateReviews, PIPELINE, statusMeta, scoreTone } from '@/composables/usePerformance'
import { listAppraisalTemplates } from '@/views/hr/settings/composables/useHrSettings'
import { cycleMeta } from '@/views/hr/settings/composables/appraisalVocab'

const emit = defineEmits(['go'])
const toast = useToast()
const stats = ref({})
const ready = ref(false)

const lenses = computed(() => [
  { key: 'tot', label: 'Reviews', value: stats.value.total || 0, color: 'var(--perf-gold)', icon: ClipboardList, go: 'reviews' },
  { key: 'self', label: 'Self review', value: stats.value.in_self || 0, color: 'var(--perf-amber)', icon: PencilRuler, go: 'reviews' },
  { key: 'mgr', label: 'Manager review', value: stats.value.in_manager || 0, color: 'var(--perf-orange)', icon: UserCheck, go: 'reviews' },
  { key: 'done', label: 'Completed', value: stats.value.completed || 0, color: 'var(--perf-ok)', icon: BadgeCheck, go: 'reviews' },
  { key: 'avg', label: 'Avg score', value: stats.value.avg_overall || 0, color: 'var(--perf-ember)', icon: Gauge, decimals: 1, go: 'insights' },
  { key: 'od', label: 'Overdue', value: stats.value.overdue || 0, color: 'var(--perf-conflict)', icon: TriangleAlert, go: 'reviews' },
])

const byStatus = computed(() => stats.value.by_status || {})
const count = (k) => byStatus.value[k] || 0
const total = computed(() => stats.value.total || 0)
const maxCycle = computed(() => Math.max(1, ...(stats.value.by_cycle || []).map(c => c.count)))
const cycleLabel = (c) => cycleMeta(c).label || c
const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'

// status distribution (DRAFT → … → ACKNOWLEDGED), only non-zero bands
const DIST_ORDER = ['DRAFT', 'SELF_ASSESSMENT', 'MANAGER_ASSESSMENT', 'COMPLETED', 'ACKNOWLEDGED']
const distSegs = computed(() => {
  const t = total.value || 1
  return DIST_ORDER.map(k => ({ key: k, label: statusMeta(k).label, color: statusMeta(k).color, count: count(k), pct: count(k) / t * 100 }))
    .filter(s => s.count > 0)
})

// module launchpad — closes the connectivity loophole: every Performance tab reachable from Command
const modules = computed(() => [
  { key: 'insights',    label: 'Insights',       sub: 'Trends & analytics',   icon: BarChart3,     color: 'var(--perf-gold)',     metric: null },
  { key: 'reviews',     label: 'Reviews',        sub: 'Every review in flight', icon: ClipboardList, color: 'var(--perf-amber)',  metric: total.value || null },
  { key: 'cycles',      label: 'Cycles',         sub: 'Cohort review cycles', icon: CalendarRange,   color: 'var(--perf-orange)',   metric: (stats.value.by_cycle || []).length || null },
  { key: 'calibration', label: 'Calibration',    sub: '9-box talent grid',    icon: Grid3x3,         color: 'var(--perf-ember)',    metric: null },
  { key: 'goals',       label: 'Goals & OKRs',   sub: 'Objectives & key results', icon: Target,      color: 'var(--perf-ok)',       metric: null },
  { key: 'feedback',    label: '360° Feedback',  sub: 'Multi-rater feedback', icon: Orbit,           color: 'var(--perf-rust)',     metric: null },
  { key: 'pips',        label: 'Improvement',    sub: 'Performance plans',    icon: LifeBuoy,        color: 'var(--perf-conflict)', metric: null },
])

const onObsPick = (k) => emit('go', 'reviews')

// ── New review / launch cycle, straight from Command ──
const templates = ref([])
const modalOpen = ref(false)
const modalMode = ref('single')
const saving = ref(false)
const openModal = (mode) => { modalMode.value = mode; modalOpen.value = true }
async function onSave(payload) {
  saving.value = true
  try {
    if (modalMode.value === 'launch') {
      const res = await bulkCreateReviews(payload)
      toast.success(`Launched ${res.created} review${res.created === 1 ? '' : 's'}${res.skipped ? ` · ${res.skipped} skipped` : ''}`)
    } else {
      await createReview(payload)
      toast.success('Review created')
    }
    modalOpen.value = false
    await refresh()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to create') }
  finally { saving.value = false }
}

async function refresh() { try { stats.value = await fetchPerformanceStats() } catch { /* zeros */ } }

onMounted(async () => {
  await refresh()
  requestAnimationFrame(() => { ready.value = true })
  try {
    const t = await listAppraisalTemplates()
    templates.value = (t || []).filter(x => x.is_active !== false && (x.sections || []).length)
  } catch { templates.value = [] }
})
</script>

<style scoped>
.pd-sec { display: flex; flex-direction: column; gap: 16px; }

/* ── hero lenses ── */
.pd-lenses { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }
.pd-lens { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 3px; cursor: pointer; text-align: left; padding: 12px 13px 14px; border-radius: 14px;
  background: var(--perf-surface); border: 1px solid var(--perf-border); transition: transform 0.25s var(--perf-spring), border-color 0.25s, box-shadow 0.3s; --acc: var(--perf-gold);
  animation: perf-deal 0.5s var(--perf-spring) both; animation-delay: calc(var(--i) * 0.05s); }
.pd-lens:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--acc) 42%, transparent); box-shadow: 0 14px 30px -20px color-mix(in srgb, var(--acc) 60%, transparent); }
.pd-lens-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; color: var(--acc); background: color-mix(in srgb, var(--acc) 13%, transparent); border: 1px solid color-mix(in srgb, var(--acc) 26%, transparent); }
.pd-lens-val { margin-top: 7px; font-size: 21px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; line-height: 1; }
.pd-lens-lab { font-size: 10.5px; font-weight: 650; color: var(--perf-text-muted); }
.pd-lens-spark { position: absolute; top: -40%; right: -30%; width: 60%; height: 120%; pointer-events: none; opacity: 0;
  background: radial-gradient(circle, color-mix(in srgb, var(--acc) 22%, transparent), transparent 70%); transition: opacity 0.35s; }
.pd-lens:hover .pd-lens-spark { opacity: 1; }
.pd-lens-bar { position: absolute; left: 0; bottom: 0; height: 2px; width: 100%; transform: scaleX(0); transform-origin: left; background: var(--acc); transition: transform 0.3s var(--perf-spring); }
.pd-lens:hover .pd-lens-bar { transform: scaleX(1); }

/* ── panels ── */
.pd-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.pd-panel { padding: 16px 17px; border-radius: 18px; background: var(--perf-surface); border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow); display: flex; flex-direction: column; gap: 14px; }
.pd-panel-flush { padding: 0; background: transparent; border: none; box-shadow: none; }
.pd-panel-head { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--perf-text-secondary); }
.pd-panel-head :deep(svg) { color: var(--perf-gold); }
.pd-head-tail { margin-left: auto; font-size: 10px; font-weight: 650; letter-spacing: 0.02em; text-transform: none; color: var(--perf-text-dim); }

/* relay rail */
.pd-relay { position: relative; display: grid; grid-template-columns: repeat(4, 1fr); padding: 6px 4px 2px; }
.pd-relay-track { position: absolute; left: 12%; right: 12%; top: 21px; height: 2px; border-radius: 999px; background: var(--perf-track); overflow: hidden; }
.pd-relay-pulse { position: absolute; top: 0; left: 0; width: 30%; height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, transparent, var(--perf-gold), transparent); animation: pd-travel 3.2s ease-in-out infinite; }
@keyframes pd-travel { 0% { transform: translateX(-110%); } 100% { transform: translateX(360%); } }
.pd-relay-st { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 7px; cursor: pointer; background: none; border: none; font: inherit;
  animation: perf-deal 0.5s var(--perf-spring) both; animation-delay: calc(0.1s + var(--i) * 0.08s); }
.pd-relay-node { position: relative; display: grid; place-items: center; width: 42px; height: 42px; border-radius: 13px; color: var(--c);
  background: var(--perf-surface-elevated); border: 1px solid var(--perf-border); transition: transform 0.22s var(--perf-spring), border-color 0.22s, box-shadow 0.25s; }
.pd-relay-node.on { border-color: color-mix(in srgb, var(--c) 45%, transparent); box-shadow: 0 0 18px -6px color-mix(in srgb, var(--c) 70%, transparent); }
.pd-relay-st:hover .pd-relay-node { transform: translateY(-2px) scale(1.06); }
.pd-relay-node b { position: absolute; top: -7px; right: -7px; min-width: 18px; height: 18px; padding: 0 4px; border-radius: 999px; display: grid; place-items: center;
  font-size: 10px; font-weight: 850; color: #1a1206; background: var(--c); font-variant-numeric: tabular-nums; }
.pd-relay-lab { font-size: 11px; font-weight: 650; color: var(--perf-text-muted); }

/* distribution tick-bar */
.pd-dist { display: flex; flex-direction: column; gap: 9px; padding-top: 13px; border-top: 1px solid var(--perf-border); }
.pd-dist-eyebrow { font-size: 10px; font-weight: 750; letter-spacing: 0.06em; text-transform: uppercase; color: var(--perf-text-dim); }
.pd-dist-bar { display: flex; height: 16px; border-radius: 8px; overflow: hidden; background: var(--perf-track); }
.pd-dist-seg { height: 100%; background: var(--c); position: relative; transition: width 1s var(--perf-spring); min-width: 0; }
.pd-dist-seg::after { content: ''; position: absolute; inset: 0; opacity: 0.55;
  background-image: repeating-linear-gradient(90deg, rgba(255,255,255,0.28) 0 1.5px, transparent 1.5px 6px); }
.pd-dist-empty { flex: 1; }
.pd-dist-legend { display: flex; flex-wrap: wrap; gap: 6px 14px; }
.pd-dist-leg { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--perf-text-muted); }
.pd-dist-leg i { width: 9px; height: 9px; border-radius: 3px; background: var(--c); }
.pd-dist-leg b { font-weight: 650; color: var(--perf-text-secondary); }
.pd-dist-leg em { font-style: normal; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; }
.pd-dist-leg.muted { color: var(--perf-text-dim); }

/* recent */
.pd-recent { display: flex; flex-direction: column; gap: 4px; }
.pd-rrow { display: flex; align-items: center; gap: 10px; padding: 8px 9px; border-radius: 10px; cursor: pointer; text-align: left; font: inherit; background: transparent; border: 1px solid transparent; transition: all 0.18s;
  animation: perf-deal 0.45s var(--perf-spring) both; animation-delay: calc(var(--i) * 0.05s); }
.pd-rrow:hover { background: var(--perf-surface-elevated); transform: translateX(2px); }
.pd-rav { position: relative; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0; font-size: 10.5px; font-weight: 800; color: #1a1206; background: var(--perf-grad-hero); }
.pd-rlive { position: absolute; bottom: -1px; right: -1px; width: 9px; height: 9px; border-radius: 50%; background: var(--perf-ok); border: 2px solid var(--perf-surface); animation: pd-live 1.8s ease-in-out infinite; }
@keyframes pd-live { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--perf-ok) 60%, transparent); } 50% { box-shadow: 0 0 0 4px transparent; } }
.pd-rtxt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.pd-rtxt b { font-size: 12.5px; font-weight: 700; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pd-rtxt span { font-size: 10px; color: var(--perf-text-dim); }
.pd-rscore { font-size: 13px; font-weight: 850; font-variant-numeric: tabular-nums; }

/* by cycle */
.pd-cycles { display: flex; flex-direction: column; gap: 8px; }
.pd-crow { display: grid; grid-template-columns: 88px 1fr 26px auto; align-items: center; gap: 9px; cursor: pointer; background: none; border: none; font: inherit; text-align: left; padding: 2px 0;
  animation: perf-deal 0.45s var(--perf-spring) both; animation-delay: calc(var(--i) * 0.06s); }
.pd-crow:hover .pd-clab { color: var(--perf-text); }
.pd-clab { font-size: 11.5px; font-weight: 650; color: var(--perf-text-secondary); transition: color 0.2s; }
.pd-cbar { height: 7px; border-radius: 999px; background: var(--perf-track); overflow: hidden; position: relative; }
.pd-cbar i { display: block; height: 100%; border-radius: 999px; background: var(--perf-grad-hero); transition: width 0.9s var(--perf-spring); position: relative; }
.pd-cbar i::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent); transform: translateX(-100%); animation: pd-shimmer 2.6s ease-in-out infinite; }
@keyframes pd-shimmer { 0% { transform: translateX(-100%); } 60%, 100% { transform: translateX(220%); } }
.pd-cn { font-size: 12px; font-weight: 850; color: var(--perf-text); text-align: right; font-variant-numeric: tabular-nums; }
.pd-cavg { font-size: 10px; font-weight: 700; color: var(--perf-text-muted); }

/* module launchpad */
.pd-deck { display: flex; flex-direction: column; gap: 13px; padding: 16px 17px; border-radius: 18px; background: var(--perf-surface); border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow); }
.pd-deck-head { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--perf-text-secondary); }
.pd-deck-head :deep(svg) { color: var(--perf-gold); }
.pd-deck-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(176px, 1fr)); gap: 11px; }
.pd-tile-shell { animation: perf-deal 0.5s var(--perf-spring) both; animation-delay: calc(var(--i) * 0.05s); }
.pd-tile { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 11px; width: 100%; padding: 14px; border-radius: 15px; cursor: pointer; text-align: left; font: inherit;
  background: var(--perf-surface-elevated); border: 1px solid var(--perf-border); transition: border-color 0.25s, box-shadow 0.3s; --acc: var(--perf-gold); }
.pd-tile:hover { border-color: color-mix(in srgb, var(--acc) 45%, transparent); box-shadow: 0 20px 40px -26px color-mix(in srgb, var(--acc) 70%, transparent); }
.pd-tile-glare { position: absolute; inset: 0; pointer-events: none; opacity: 0; background: radial-gradient(120% 100% at 80% 0%, color-mix(in srgb, var(--acc) 18%, transparent), transparent 60%); transition: opacity 0.3s; }
.pd-tile:hover .pd-tile-glare { opacity: 1; }
.pd-tile-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; color: var(--acc); background: color-mix(in srgb, var(--acc) 14%, transparent); border: 1px solid color-mix(in srgb, var(--acc) 28%, transparent); }
.pd-tile-body { display: flex; flex-direction: column; gap: 2px; }
.pd-tile-lab { font-size: 13.5px; font-weight: 800; color: var(--perf-text); }
.pd-tile-sub { font-size: 11px; color: var(--perf-text-muted); }
.pd-tile-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 2px; }
.pd-tile-metric { font-size: 14px; font-weight: 900; color: var(--acc); font-variant-numeric: tabular-nums; }
.pd-tile-arrow { margin-left: auto; color: var(--perf-text-dim); transition: transform 0.25s var(--perf-spring), color 0.25s; }
.pd-tile:hover .pd-tile-arrow { transform: translate(3px, -3px); color: var(--acc); }

/* overdue */
.pd-overdue { display: flex; align-items: center; gap: 8px; padding: 12px 15px; border-radius: 13px; font-size: 12.5px; cursor: pointer; text-align: left; font: inherit; width: 100%;
  color: var(--perf-text-secondary); background: var(--perf-conflict-soft); border: 1px solid color-mix(in srgb, var(--perf-conflict) 26%, transparent); transition: border-color 0.2s; }
.pd-overdue:hover { border-color: color-mix(in srgb, var(--perf-conflict) 45%, transparent); }
.pd-overdue :deep(svg) { color: var(--perf-conflict); }
.pd-overdue b { color: var(--perf-conflict); }
.pd-overdue-go { margin-left: auto; }
.pd-fade-enter-active, .pd-fade-leave-active { transition: opacity 0.4s; }
.pd-fade-enter-from, .pd-fade-leave-to { opacity: 0; }

.pd-empty { margin: 0; font-size: 12px; color: var(--perf-text-dim); font-style: italic; }

@media (max-width: 1080px) { .pd-grid2 { grid-template-columns: 1fr; } .pd-lenses { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 620px) { .pd-lenses { grid-template-columns: repeat(2, 1fr); } }
@media (prefers-reduced-motion: reduce) {
  .pd-lens, .pd-relay-st, .pd-rrow, .pd-crow, .pd-tile-shell { animation: none; }
  .pd-lens:hover, .pd-rrow:hover, .pd-relay-st:hover .pd-relay-node { transform: none; }
  .pd-relay-pulse, .pd-rlive, .pd-cbar i::after { animation: none; }
  .pd-dist-seg, .pd-cbar i { transition: none; }
}
</style>
