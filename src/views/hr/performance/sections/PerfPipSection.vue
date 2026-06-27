<template>
  <!-- ═══════════════════════════ IMPROVEMENT PLANS · The Recovery Monitor ═══════════════════════════
       PIPs as a clinical recovery ward. The signature PipRecoveryMonitor plots every active plan
       as a vital node (time × objectives-recovered) on a live cardiograph; the roster drives the
       support loop — open → check in → record an outcome. Honest connectivity: a below-expectations
       merit band (Settings) AUTO-SPAWNS a draft PIP off the triggering review; this page surfaces
       that provenance and cross-links the rubric, the review, and the merit policy. -->
  <div class="pp-sec">
    <PerfHero eyebrow="People · Improvement" title="Improvement" accent="Plans" :icon="LifeBuoy"
      sub="Structured, time-boxed plans that bring an underperformer back to standard — clear expectations, measurable objectives, scheduled check-ins and a recorded outcome.">
      <template #actions>
        <button class="perf-btn" type="button" :disabled="loading" @click="reload"><RefreshCw :size="14" :class="{ 'perf-spin': loading }" /></button>
        <button class="perf-btn perf-btn-primary" type="button" @click="openCreate"><Plus :size="15" /> New plan</button>
      </template>
      <template #lenses>
        <div class="pp-lenses">
          <button v-for="l in lenses" :key="l.key" class="pp-lens" type="button" :style="{ '--acc': l.color }"
            :class="{ on: l.status !== undefined && fStatus === l.status, stat: l.status === undefined }"
            @click="l.status !== undefined ? setStatus(l.status) : null">
            <span class="pp-lens-ic"><component :is="l.icon" :size="15" /></span>
            <span class="pp-lens-val"><SetCountUp :value="l.value" :decimals="0" /></span>
            <span class="pp-lens-lab">{{ l.label }}</span>
            <span class="pp-lens-bar" />
          </button>
        </div>
      </template>
    </PerfHero>

    <!-- signature instrument -->
    <PipRecoveryMonitor :pips="pips" :stats="stats" @focus="openManage" />

    <!-- command strip: recovery sentiment + outcomes -->
    <div class="pp-command">
      <section class="pp-panel">
        <header class="pp-panel-h"><HeartPulse :size="14" /> Recovery sentiment <span>latest check-in across {{ sentiment.activeCount }} active plan{{ sentiment.activeCount === 1 ? '' : 's' }}</span></header>
        <div v-if="sentiment.activeCount" class="pp-sent">
          <div class="pp-sent-bar">
            <span v-for="s in sentSegments" :key="s.key" class="pp-sent-seg" :style="{ flexGrow: s.count, background: s.color }" :title="`${s.label}: ${s.count}`" />
          </div>
          <div class="pp-sent-legend">
            <div v-for="s in sentSegments" :key="s.key" class="pp-sent-item" :class="{ dim: !s.count }">
              <component :is="s.icon" :size="13" :style="{ color: s.color }" />
              <b>{{ s.count }}</b><span>{{ s.label }}</span>
            </div>
          </div>
          <p v-if="sentBuckets.Unmonitored" class="pp-sent-warn"><AlertTriangle :size="12" /> {{ sentBuckets.Unmonitored }} active plan{{ sentBuckets.Unmonitored === 1 ? '' : 's' }} with no rated check-in — going dark.</p>
        </div>
        <p v-else class="pp-panel-empty">No plans in flight. Recovery sentiment appears once a plan is active.</p>
      </section>

      <section class="pp-panel">
        <header class="pp-panel-h"><Trophy :size="14" /> Outcomes <span>closed plans</span></header>
        <div class="pp-outcome">
          <div class="pp-ring" :style="{ '--perf-p': (successRate / 100 * 360) + 'deg' }">
            <span class="pp-ring-in"><b><SetCountUp :value="successRate" :decimals="0" suffix="%" /></b><i>recovered</i></span>
          </div>
          <div class="pp-outcome-rows">
            <div class="pp-out-row"><span class="pp-out-dot ok" /> Recovered <b>{{ byStatus.SUCCESSFUL || 0 }}</b></div>
            <div class="pp-out-row"><span class="pp-out-dot conflict" /> Unsuccessful <b>{{ byStatus.UNSUCCESSFUL || 0 }}</b></div>
            <div class="pp-out-row"><span class="pp-out-dot steel" /> Cancelled <b>{{ byStatus.CANCELLED || 0 }}</b></div>
          </div>
        </div>
      </section>
    </div>

    <!-- toolbar -->
    <div class="pp-toolbar">
      <div class="pp-chips">
        <button class="pp-chip" :class="{ on: !fStatus }" @click="setStatus(null)">All <b>{{ total }}</b></button>
        <button v-for="s in STATUS_KEYS" :key="s" class="pp-chip" :class="{ on: fStatus === s }"
          :style="{ '--c': pipStatusMeta(s).color }" @click="setStatus(s)">
          <component :is="pipStatusMeta(s).icon" :size="12" />{{ pipStatusMeta(s).label }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="pp-loading"><Loader2 :size="20" class="perf-spin" /> Loading plans…</div>
    <div v-else-if="!pips.length" class="pp-empty">
      <span class="pp-empty-ic"><LifeBuoy :size="26" /></span>
      <b>{{ fStatus ? 'No plans match' : 'No improvement plans' }}</b>
      <p>{{ fStatus ? 'Try clearing the filter.' : 'Open a structured plan to support an employee back to standard — objectives, check-ins and a clear outcome.' }}</p>
      <button v-if="fStatus" class="perf-btn perf-btn-steel" type="button" @click="setStatus(null)">Clear filter</button>
      <button v-else class="perf-btn perf-btn-primary" type="button" @click="openCreate"><Plus :size="14" /> New plan</button>
    </div>
    <div v-else class="pp-grid">
      <PipCard v-for="(p, i) in pips" :key="p.id" :pip="p" :index="i" @open="openManage" @go-review="$emit('go', 'reviews')" />
    </div>

    <!-- connectivity bus -->
    <div class="pp-bus">
      <span class="pp-bus-h"><GitMerge :size="13" /> From rating to recovery</span>
      <div class="pp-bus-row">
        <button class="pp-wire settings" type="button" @click="goSettings('appraisal-templates')"><FileText :size="13" /><b>Appraisal Rubric</b><i>scores the review</i></button>
        <ArrowRight :size="14" class="pp-wire-arr" />
        <button class="pp-wire" type="button" @click="$emit('go', 'reviews')"><ClipboardList :size="13" /><b>Reviews</b><i>a low score lands a band</i></button>
        <ArrowRight :size="14" class="pp-wire-arr" />
        <button class="pp-wire settings" type="button" @click="goSettings('merit-policy')"><Coins :size="13" /><b>Merit band</b><i>auto-PIP trigger</i></button>
        <ArrowRight :size="14" class="pp-wire-arr" />
        <button class="pp-wire here" type="button"><LifeBuoy :size="13" /><b>Plans · here</b><i>support to standard</i></button>
        <ArrowRight :size="14" class="pp-wire-arr" />
        <button class="pp-wire flagged" type="button" :title="'An unsuccessful outcome is the documented basis for further action — it is NOT auto-wired to the Exit module.'"><DoorOpen :size="13" /><b>Outcome</b><i>manual · not auto-exit</i></button>
      </div>
    </div>

    <PipModal :open="modalOpen" :pip="selected" @close="modalOpen = false"
      @save="onChanged" @mutated="onChanged" @deleted="onChanged" @go-review="$emit('go', 'reviews')" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  LifeBuoy, Plus, Loader2, RefreshCw, Activity, CheckCircle2, MinusCircle, AlertTriangle, HeartPulse,
  Trophy, Smile, Meh, Frown, CircleQuestionMark, GitMerge, ArrowRight, FileText, ClipboardList, Coins, DoorOpen,
} from 'lucide-vue-next'
import PerfHero from '../components/PerfHero.vue'
import PipModal from '../components/PipModal.vue'
import PipCard from '../components/PipCard.vue'
import PipRecoveryMonitor from '../components/PipRecoveryMonitor.vue'
import SetCountUp from '@/views/hr/settings/components/SetCountUp.vue'
import { fetchPipStats, fetchPips, pipStatusMeta, PIP_STATUS_META } from '@/composables/usePerformance'

defineEmits(['go'])
const router = useRouter()
const STATUS_KEYS = Object.keys(PIP_STATUS_META)
const stats = ref({})
const pips = ref([])
const total = ref(0)
const loading = ref(false)
const fStatus = ref(null)

const lenses = computed(() => [
  { key: 'tot', label: 'Total', value: stats.value.total || 0, color: 'var(--perf-gold)', icon: LifeBuoy },
  { key: 'active', label: 'Active', value: stats.value.active || 0, color: 'var(--perf-amber)', icon: Activity, status: 'ACTIVE' },
  { key: 'ok', label: 'Recovered', value: stats.value.successful || 0, color: 'var(--perf-ok)', icon: CheckCircle2, status: 'SUCCESSFUL' },
  { key: 'no', label: 'Unsuccessful', value: stats.value.unsuccessful || 0, color: 'var(--perf-conflict)', icon: MinusCircle, status: 'UNSUCCESSFUL' },
  { key: 'od', label: 'Overdue', value: stats.value.overdue || 0, color: 'var(--perf-conflict)', icon: AlertTriangle },
])

const byStatus = computed(() => stats.value.by_status || {})
const successRate = computed(() => {
  const ok = stats.value.successful || 0, no = stats.value.unsuccessful || 0
  return ok + no ? Math.round(ok / (ok + no) * 100) : 0
})

// recovery sentiment over active plans
const SENT_DEFS = [
  { key: 'Improving', label: 'Improving', color: 'var(--perf-ok)', icon: Smile },
  { key: 'On-track', label: 'On-track', color: 'var(--perf-amber)', icon: Meh },
  { key: 'No change', label: 'No change', color: 'var(--perf-conflict)', icon: Frown },
  { key: 'Unmonitored', label: 'Unmonitored', color: 'var(--perf-unset)', icon: CircleQuestionMark },
]
const sentBuckets = computed(() => {
  const b = { Improving: 0, 'On-track': 0, 'No change': 0, Unmonitored: 0 }
  pips.value.filter(p => ['ACTIVE', 'EXTENDED'].includes(p.status)).forEach(p => {
    const rated = (p.check_ins || []).filter(c => c.rating)
    const last = rated.length ? rated[rated.length - 1].rating : null
    if (last && b[last] !== undefined) b[last]++
    else b.Unmonitored++
  })
  return b
})
const sentiment = computed(() => ({ activeCount: pips.value.filter(p => ['ACTIVE', 'EXTENDED'].includes(p.status)).length }))
const sentSegments = computed(() => SENT_DEFS.map(d => ({ ...d, count: sentBuckets.value[d.key] || 0 })))

async function reload() {
  loading.value = true
  try {
    const params = { limit: 100 }
    if (fStatus.value) params.status = fStatus.value
    const [s, list] = await Promise.all([fetchPipStats(), fetchPips(params)])
    stats.value = s; pips.value = list.items || []; total.value = list.total || 0
  } catch { pips.value = [] }
  finally { loading.value = false }
}
const setStatus = (s) => { fStatus.value = fStatus.value === s ? null : s; reload() }

const modalOpen = ref(false)
const selected = ref(null)
const openCreate = () => { selected.value = null; modalOpen.value = true }
const openManage = (p) => { selected.value = p; modalOpen.value = true }
const onChanged = () => { modalOpen.value = false; reload() }
function goSettings(t) { router.push(`/admin/hr/settings/${t}`) }

onMounted(reload)
</script>

<style scoped>
.pp-sec { display: flex; flex-direction: column; gap: 16px; }
.pp-lenses { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
.pp-lens { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 3px; cursor: pointer; text-align: left; padding: 12px 13px 14px; border-radius: 14px;
  background: var(--perf-surface); border: 1px solid var(--perf-border); transition: transform 0.25s var(--perf-spring), border-color 0.25s; --acc: var(--perf-gold); }
.pp-lens:not(.stat):hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--acc) 42%, transparent); }
.pp-lens.stat { cursor: default; }
.pp-lens.on { border-color: color-mix(in srgb, var(--acc) 55%, transparent); background: color-mix(in srgb, var(--acc) 9%, var(--perf-surface)); }
.pp-lens-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; color: var(--acc); background: color-mix(in srgb, var(--acc) 13%, transparent); border: 1px solid color-mix(in srgb, var(--acc) 26%, transparent); }
.pp-lens-val { margin-top: 7px; font-size: 21px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; line-height: 1; }
.pp-lens-lab { font-size: 10.5px; font-weight: 650; color: var(--perf-text-muted); }
.pp-lens-bar { position: absolute; left: 0; bottom: 0; height: 2px; width: 100%; transform: scaleX(0); transform-origin: left; background: var(--acc); transition: transform 0.3s var(--perf-spring); }
.pp-lens:not(.stat):hover .pp-lens-bar, .pp-lens.on .pp-lens-bar { transform: scaleX(1); }

/* command strip */
.pp-command { display: grid; grid-template-columns: 1.5fr 1fr; gap: 14px; }
.pp-panel { padding: 15px 17px; border-radius: 16px; background: var(--perf-surface); border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow); }
.pp-panel-h { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--perf-text-secondary); margin-bottom: 14px; }
.pp-panel-h :deep(svg) { color: var(--perf-gold); }
.pp-panel-h span { text-transform: none; letter-spacing: 0; font-weight: 600; color: var(--perf-text-muted); margin-left: auto; font-size: 10.5px; }
.pp-panel-empty { margin: 0; font-size: 12px; color: var(--perf-text-dim); font-style: italic; }

.pp-sent { display: flex; flex-direction: column; gap: 12px; }
.pp-sent-bar { display: flex; height: 14px; border-radius: 999px; overflow: hidden; background: var(--perf-track); }
.pp-sent-seg { min-width: 0; transition: flex-grow 0.5s var(--perf-spring); }
.pp-sent-seg:not(:last-child) { border-right: 2px solid var(--perf-surface); }
.pp-sent-legend { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.pp-sent-item { display: flex; align-items: center; gap: 5px; font-size: 11px; }
.pp-sent-item.dim { opacity: 0.45; }
.pp-sent-item b { font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; }
.pp-sent-item span { color: var(--perf-text-muted); }
.pp-sent-warn { display: inline-flex; align-items: center; gap: 6px; margin: 0; font-size: 11px; color: var(--perf-conflict); }

.pp-outcome { display: flex; align-items: center; gap: 18px; }
.pp-ring { position: relative; width: 92px; height: 92px; flex-shrink: 0; border-radius: 50%;
  background: conic-gradient(var(--perf-ok) var(--perf-p, 0deg), var(--perf-track) 0deg); transition: --perf-p 0.9s var(--perf-spring); }
.pp-ring-in { position: absolute; inset: 8px; border-radius: 50%; background: var(--perf-surface); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.pp-ring-in b { font-size: 20px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; line-height: 1; }
.pp-ring-in i { font-size: 8.5px; font-style: normal; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--perf-text-muted); margin-top: 3px; }
.pp-outcome-rows { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 9px; }
.pp-out-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--perf-text-secondary); }
.pp-out-row b { margin-left: auto; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; }
.pp-out-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.pp-out-dot.ok { background: var(--perf-ok); } .pp-out-dot.conflict { background: var(--perf-conflict); } .pp-out-dot.steel { background: var(--perf-text-dim); }

.pp-toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.pp-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.pp-chip { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 650;
  color: var(--perf-text-muted); background: var(--perf-surface); border: 1px solid var(--perf-border); transition: all 0.2s var(--perf-spring); --c: var(--perf-gold); }
.pp-chip :deep(svg) { color: var(--c); }
.pp-chip b { font-weight: 850; color: var(--perf-text-secondary); }
.pp-chip:hover { color: var(--perf-text); border-color: var(--perf-border-strong); }
.pp-chip.on { color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); border-color: color-mix(in srgb, var(--c) 36%, transparent); }

.pp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 14px; }
.pp-loading { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 40px; color: var(--perf-text-muted); font-size: 13px; }
.pp-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 9px; padding: 44px 24px; border-radius: 18px; background: var(--perf-surface); border: 1px dashed var(--perf-border-strong); }
.pp-empty-ic { display: grid; place-items: center; width: 60px; height: 60px; border-radius: 18px; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 12%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 26%, transparent); }
.pp-empty b { font-size: 15px; font-weight: 800; color: var(--perf-text); margin-top: 4px; }
.pp-empty p { margin: 0 0 4px; font-size: 12.5px; color: var(--perf-text-muted); max-width: 46ch; line-height: 1.5; }

/* connectivity bus */
.pp-bus { display: flex; flex-direction: column; gap: 11px; padding: 15px 17px; border-radius: 16px; background: var(--perf-surface); border: 1px solid var(--perf-border); }
.pp-bus-h { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--perf-text-secondary); }
.pp-bus-h :deep(svg) { color: var(--perf-gold); }
.pp-bus-row { display: flex; align-items: stretch; gap: 6px; flex-wrap: wrap; }
.pp-wire { flex: 1; min-width: 130px; display: flex; flex-direction: column; gap: 1px; padding: 9px 12px; border-radius: 12px; cursor: pointer; font: inherit; text-align: left;
  background: var(--perf-surface-elevated); border: 1px solid var(--perf-border); transition: all 0.18s var(--perf-spring); }
.pp-wire:hover { transform: translateY(-2px); border-color: var(--perf-border-warm); }
.pp-wire :deep(svg) { color: var(--perf-gold); }
.pp-wire b { font-size: 12px; font-weight: 750; color: var(--perf-text); margin-top: 3px; }
.pp-wire i { font-size: 9.5px; font-style: normal; color: var(--perf-text-dim); }
.pp-wire.settings { background: color-mix(in srgb, var(--perf-gold) 7%, var(--perf-surface-elevated)); border-style: dashed; border-color: var(--perf-border-warm); }
.pp-wire.here { background: color-mix(in srgb, var(--perf-gold) 13%, var(--perf-surface-elevated)); border-color: color-mix(in srgb, var(--perf-gold) 40%, transparent); cursor: default; }
.pp-wire.here:hover { transform: none; }
.pp-wire.flagged { border-style: dashed; cursor: default; }
.pp-wire.flagged:hover { transform: none; }
.pp-wire.flagged :deep(svg) { color: var(--perf-text-muted); }
.pp-wire-arr { align-self: center; color: var(--perf-text-dim); flex-shrink: 0; }

@media (max-width: 1080px) { .pp-lenses { grid-template-columns: repeat(3, 1fr); } .pp-command { grid-template-columns: 1fr; } .pp-wire-arr { display: none; } }
@media (max-width: 620px) { .pp-lenses { grid-template-columns: repeat(2, 1fr); } .pp-grid { grid-template-columns: 1fr; } .pp-sent-legend { grid-template-columns: repeat(2, 1fr); } }
@media (prefers-reduced-motion: reduce) { .pp-lens:hover, .pp-wire:hover { transform: none; } .pp-sent-seg, .pp-ring { transition: none; } }
</style>
