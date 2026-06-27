<template>
  <div class="pf-sec perf-scope">
    <PerfHero eyebrow="People · 360°" title="360°" accent="Feedback" :icon="Orbit"
      sub="Multi-rater feedback from self, manager, peers and reports — collected anonymously, rolled up into perception themes that feed the review and calibration.">
      <template #actions>
        <button class="perf-btn perf-btn-primary" type="button" @click="modalOpen = true"><Plus :size="15" /> New 360° request</button>
      </template>
      <template #lenses>
        <div class="pf-lenses">
          <button v-for="l in lenses" :key="l.key" class="pf-lens" type="button" :style="{ '--acc': l.color }"
            :class="{ on: l.status && fStatus === l.status }" @click="l.status ? setStatus(l.status) : null">
            <span class="pf-lens-ic"><component :is="l.icon" :size="15" /></span>
            <span class="pf-lens-val"><SetCountUp :value="l.value" :decimals="0" :suffix="l.suffix || ''" /></span>
            <span class="pf-lens-lab">{{ l.label }}</span>
            <span class="pf-lens-bar" />
          </button>
        </div>
      </template>
    </PerfHero>

    <!-- ─── signature: Perception Atrium ─── -->
    <FeedbackConvergence :relationships="relAgg" :competencies="orgComps"
      :invited="stats.invited || 0" :submitted="stats.submitted || 0" :response-rate="stats.response_rate || 0"
      :open-requests="stats.open || 0" :overall-avg="orgOverall" :rating-max="5" />

    <!-- ─── command grid ─── -->
    <div class="pf-command">
      <div class="pf-main">
        <div class="pf-toolbar">
          <div class="pf-chips">
            <button class="pf-chip" :class="{ on: !fStatus }" @click="setStatus(null)">All <b>{{ total }}</b></button>
            <button v-for="s in STATUS_KEYS" :key="s" class="pf-chip" :class="{ on: fStatus === s }"
              :style="{ '--c': feedbackReqMeta(s).color }" @click="setStatus(s)">
              <component :is="feedbackReqMeta(s).icon" :size="12" />{{ feedbackReqMeta(s).label }}
            </button>
          </div>
        </div>

        <div v-if="loading" class="pf-loading"><Loader2 :size="20" class="perf-spin" /> Loading requests…</div>
        <div v-else-if="!requests.length" class="pf-empty">
          <span class="pf-empty-ic"><Orbit :size="26" /></span>
          <b>{{ fStatus ? 'No requests match' : 'No 360° requests yet' }}</b>
          <p>Open a request, nominate raters and gather a rounded, multi-perspective view of an employee.</p>
          <button class="perf-btn perf-btn-primary" type="button" @click="modalOpen = true"><Plus :size="14" /> New request</button>
        </div>
        <div v-else class="pf-grid">
          <Motion v-for="(req, i) in requests" :key="req.id" as="article" class="pf-card" :style="{ '--c': feedbackReqMeta(req.status).color }"
            :initial="reduced ? false : { opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.42, delay: Math.min(i * 0.04, 0.32), ease: [0.16, 1, 0.3, 1] }"
            @mousemove="onCardMove" @mouseleave="onCardLeave" @click="openDrawer(req)">
            <span class="pf-card-glare" aria-hidden="true" />
            <span class="pf-card-spine" />
            <div class="pf-card-head">
              <span class="pf-card-avwrap" :style="{ '--perf-p': respRate(req) / 100 * 360 + 'deg' }">
                <span class="pf-card-av">{{ initials(req.employee_name) }}</span>
              </span>
              <div class="pf-card-id">
                <b>{{ req.employee_name }}</b>
                <span>{{ req.designation_name || req.period_label || cycleLabel(req.cycle) }}</span>
              </div>
              <span class="pf-card-stamp"><component :is="feedbackReqMeta(req.status).icon" :size="11" />{{ feedbackReqMeta(req.status).label }}</span>
            </div>
            <div class="pf-card-prog">
              <div class="pf-card-track"><i :style="{ width: respRate(req) + '%' }" /></div>
              <span class="pf-card-prog-lab">{{ req.rollup?.submitted || 0 }}/{{ req.rollup?.invited || 0 }} responded · {{ respRate(req) }}%</span>
            </div>
            <div class="pf-card-foot">
              <span class="pf-card-raters">
                <span v-for="r in cardRels(req)" :key="r.key" class="pf-card-rdot" :style="{ '--c': r.color }" :title="`${r.label}: ${r.count}`">
                  <component :is="r.icon" :size="9" />
                </span>
                <span v-if="!cardRels(req).length" class="pf-card-anon"><component :is="req.anonymous ? Eye : Users" :size="11" />{{ req.anonymous ? 'Anonymous' : 'Named' }}</span>
              </span>
              <span v-if="req.rollup?.overall_avg != null" class="pf-card-avg">{{ req.rollup.overall_avg.toFixed(1) }}<i>/{{ Math.round(req.rating_max) }}</i></span>
            </div>
          </Motion>
        </div>
      </div>

      <!-- ─── perception signal panel ─── -->
      <aside class="pf-side">
        <div class="pf-panel">
          <div class="pf-panel-head"><Radar :size="14" /> Perception signal</div>
          <FeedbackRadar v-if="orgComps.length" :competencies="orgComps" :max="5" />
          <div v-else class="pf-radar-idle">
            <span class="pf-radar-idle-ic"><Radar :size="22" /></span>
            <p>Launch a 360° request to start charting perception.</p>
          </div>
        </div>

        <div class="pf-panel">
          <div class="pf-panel-head"><Users :size="14" /> Voices by relationship</div>
          <div class="pf-mix">
            <div v-for="r in relAggMeta" :key="r.key" class="pf-mix-row" :style="{ '--c': r.color }">
              <span class="pf-mix-ic"><component :is="r.icon" :size="12" /></span>
              <span class="pf-mix-lab">{{ r.label }}</span>
              <div class="pf-mix-bar"><i :style="{ width: ready ? (maxRel ? r.count / maxRel * 100 : 0) + '%' : '0%' }" /></div>
              <span class="pf-mix-n">{{ r.count }}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- ─── connectivity: rubric → review → reward ─── -->
    <div class="pf-flow">
      <div class="pf-flow-head"><GitBranch :size="13" /> Where 360° fits <small>perception feeds the review, calibration and pay — not a dead end</small></div>
      <div class="pf-flow-rail">
        <span class="pf-flow-track"><span class="pf-flow-pulse" /></span>
        <button v-for="(st, i) in flow" :key="st.key" class="pf-flow-stn" :class="{ here: st.here }" :style="{ '--si': i }" type="button" @click="st.go && st.go()">
          <span class="pf-flow-ic"><component :is="st.icon" :size="14" /></span>
          <b>{{ st.label }}</b>
          <span class="pf-flow-sub">{{ st.sub }}</span>
          <ChevronRight v-if="i < flow.length - 1" :size="12" class="pf-flow-chev" />
          <span v-if="st.here" class="pf-flow-now">You are here</span>
        </button>
      </div>
    </div>

    <FeedbackRequestModal :open="modalOpen" :saving="saving" @close="modalOpen = false" @save="onSave" />
    <FeedbackDrawer :open="drawerOpen" :request-id="selectedId" @close="drawerOpen = false" @mutated="reload" @deleted="reload" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Motion } from 'motion-v'
import { Orbit, Plus, Loader2, Eye, Users, CheckCircle2, Send, Radar, GitBranch, ChevronRight, Layers, ClipboardCheck, Grid3x3, TrendingUp } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import PerfHero from '../components/PerfHero.vue'
import FeedbackConvergence from '../components/FeedbackConvergence.vue'
import FeedbackRadar from '../components/FeedbackRadar.vue'
import FeedbackRequestModal from '../components/FeedbackRequestModal.vue'
import FeedbackDrawer from '../components/FeedbackDrawer.vue'
import SetCountUp from '@/views/hr/settings/components/SetCountUp.vue'
import {
  fetchFeedbackStats, fetchFeedbackRequests, createFeedbackRequest,
  feedbackReqMeta, feedbackRelMeta, FEEDBACK_REQ_STATUS, FEEDBACK_RELATIONSHIPS,
} from '@/composables/usePerformance'
import { cycleMeta } from '@/views/hr/settings/composables/appraisalVocab'
import { prefersReduced } from '@/composables/useShiftMotion'

const emit = defineEmits(['go'])
const router = useRouter()
const toast = useToast()
const reduced = prefersReduced()
const STATUS_KEYS = Object.keys(FEEDBACK_REQ_STATUS)

const stats = ref({})
const requests = ref([])
const total = ref(0)
const loading = ref(false)
const saving = ref(false)
const fStatus = ref(null)
const ready = ref(false)

const lenses = computed(() => [
  { key: 'tot', label: 'Requests', value: stats.value.total || 0, color: 'var(--perf-gold)', icon: Orbit },
  { key: 'open', label: 'Collecting', value: stats.value.open || 0, color: 'var(--perf-amber)', icon: Send, status: 'OPEN' },
  { key: 'closed', label: 'Closed', value: stats.value.closed || 0, color: 'var(--perf-ok)', icon: CheckCircle2, status: 'CLOSED' },
  { key: 'inv', label: 'Invited', value: stats.value.invited || 0, color: 'var(--perf-ember)', icon: Users },
  { key: 'rate', label: 'Response', value: stats.value.response_rate || 0, color: 'var(--perf-orange)', icon: CheckCircle2, suffix: '%' },
])

const cycleLabel = (c) => cycleMeta(c).label
const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
const respRate = (req) => { const r = req.rollup || {}; return r.invited ? Math.round((r.submitted || 0) / r.invited * 100) : 0 }
const cardRels = (req) => {
  const br = req.rollup?.by_relationship || {}
  return Object.keys(br).filter(k => br[k]).map(k => ({ key: k, ...feedbackRelMeta(k), count: br[k] })).slice(0, 5)
}

// org-wide aggregate competency radar (weighted by response count per competency)
const orgComps = computed(() => {
  const agg = {}
  for (const req of requests.value) {
    for (const c of (req.rollup?.by_competency || [])) {
      const slot = agg[c.key] || (agg[c.key] = { key: c.key, label: c.label, sum: 0, count: 0 })
      slot.sum += (Number(c.avg) || 0) * (c.count || 1); slot.count += (c.count || 1)
    }
  }
  return Object.values(agg).filter(a => a.count).map(a => ({ key: a.key, label: a.label, avg: a.sum / a.count, count: a.count })).slice(0, 8)
})
const orgOverall = computed(() => {
  let sum = 0, n = 0
  for (const req of requests.value) { const r = req.rollup; if (r && r.overall_avg != null && r.submitted) { sum += Number(r.overall_avg) * r.submitted; n += r.submitted } }
  return n ? +(sum / n).toFixed(2) : null
})
const relAgg = computed(() => {
  const acc = {}
  for (const req of requests.value) { const br = req.rollup?.by_relationship || {}; for (const k in br) acc[k] = (acc[k] || 0) + (br[k] || 0) }
  return Object.keys(FEEDBACK_RELATIONSHIPS).map(k => ({ key: k, count: acc[k] || 0 }))
})
const relAggMeta = computed(() => relAgg.value.map(r => ({ ...r, ...feedbackRelMeta(r.key) })))
const maxRel = computed(() => Math.max(1, ...relAgg.value.map(r => r.count)))

const flow = computed(() => [
  { key: 'rubric', label: 'Appraisal rubric', sub: 'Settings', icon: Layers, go: () => router.push('/admin/hr/settings/appraisal-templates') },
  { key: 'fb', label: '360° feedback', sub: 'Perception', icon: Orbit, here: true },
  { key: 'review', label: 'Review', sub: 'Scored outcome', icon: ClipboardCheck, go: () => emit('go', 'reviews') },
  { key: 'calib', label: 'Calibration', sub: '9-box', icon: Grid3x3, go: () => emit('go', 'calibration') },
  { key: 'merit', label: 'Merit', sub: 'Reward', icon: TrendingUp, go: () => emit('go', 'merit') },
])

async function reload() {
  loading.value = true; ready.value = false
  try {
    const params = { limit: 60 }
    if (fStatus.value) params.status = fStatus.value
    const [s, list] = await Promise.all([fetchFeedbackStats(), fetchFeedbackRequests(params)])
    stats.value = s; requests.value = list.items || []; total.value = list.total || 0
  } catch { requests.value = [] }
  finally { loading.value = false; requestAnimationFrame(() => { ready.value = true }) }
}
const setStatus = (s) => { fStatus.value = fStatus.value === s ? null : s; reload() }

const modalOpen = ref(false)
async function onSave(payload) {
  saving.value = true
  try { await createFeedbackRequest(payload); toast.success('360° request launched'); modalOpen.value = false; await reload() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed to create request') }
  finally { saving.value = false }
}

const drawerOpen = ref(false)
const selectedId = ref(null)
const openDrawer = (req) => { selectedId.value = req.id; drawerOpen.value = true }

// per-card pointer tilt + glare
function onCardMove(e) {
  const el = e.currentTarget; const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', ((e.clientX - r.left) / r.width).toFixed(3))
  el.style.setProperty('--my', ((e.clientY - r.top) / r.height).toFixed(3))
  el.style.setProperty('--spot', '1')
}
function onCardLeave(e) { const el = e.currentTarget; el.style.setProperty('--spot', '0'); el.style.setProperty('--mx', '0.5'); el.style.setProperty('--my', '0.5') }

onMounted(reload)
</script>

<style scoped>
.pf-sec { display: flex; flex-direction: column; gap: 18px; }
.pf-lenses { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
.pf-lens { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 3px; cursor: pointer; text-align: left; padding: 12px 13px 14px; border-radius: 14px;
  background: var(--perf-surface); border: 1px solid var(--perf-border); transition: transform 0.25s var(--perf-spring), border-color 0.25s; --acc: var(--perf-gold); }
.pf-lens:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--acc) 42%, transparent); }
.pf-lens.on { border-color: color-mix(in srgb, var(--acc) 55%, transparent); background: color-mix(in srgb, var(--acc) 9%, var(--perf-surface)); }
.pf-lens-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; color: var(--acc); background: color-mix(in srgb, var(--acc) 13%, transparent); border: 1px solid color-mix(in srgb, var(--acc) 26%, transparent); }
.pf-lens-val { margin-top: 7px; font-size: 21px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; line-height: 1; }
.pf-lens-lab { font-size: 10.5px; font-weight: 650; color: var(--perf-text-muted); }
.pf-lens-bar { position: absolute; left: 0; bottom: 0; height: 2px; width: 100%; transform: scaleX(0); transform-origin: left; background: var(--acc); transition: transform 0.3s var(--perf-spring); }
.pf-lens:hover .pf-lens-bar, .pf-lens.on .pf-lens-bar { transform: scaleX(1); }

/* command grid */
.pf-command { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); gap: 14px; align-items: start; }
.pf-main { min-width: 0; display: flex; flex-direction: column; gap: 13px; }
.pf-side { display: flex; flex-direction: column; gap: 14px; }
.pf-panel { padding: 15px 16px; border-radius: 18px; background: var(--perf-surface); border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow); }
.pf-panel-head { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--perf-text-secondary); margin-bottom: 12px; }
.pf-panel-head :deep(svg) { color: var(--perf-gold); }
.pf-radar-idle { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 26px; }
.pf-radar-idle-ic { display: grid; place-items: center; width: 50px; height: 50px; border-radius: 15px; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 11%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 24%, transparent); }
.pf-radar-idle p { margin: 0; text-align: center; font-size: 12px; color: var(--perf-text-muted); }

.pf-mix { display: flex; flex-direction: column; gap: 9px; }
.pf-mix-row { display: grid; grid-template-columns: auto 86px 1fr auto; align-items: center; gap: 9px; --c: var(--perf-gold); }
.pf-mix-ic { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); }
.pf-mix-lab { font-size: 11.5px; font-weight: 650; color: var(--perf-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pf-mix-bar { height: 7px; border-radius: 999px; background: var(--perf-track); overflow: hidden; }
.pf-mix-bar i { display: block; height: 100%; border-radius: 999px; background: var(--c); transition: width 0.9s var(--perf-spring); }
.pf-mix-n { font-size: 12px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; min-width: 16px; text-align: right; }

.pf-toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.pf-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.pf-chip { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 650;
  color: var(--perf-text-muted); background: var(--perf-surface); border: 1px solid var(--perf-border); transition: all 0.2s var(--perf-spring); --c: var(--perf-gold); }
.pf-chip :deep(svg) { color: var(--c); }
.pf-chip b { font-weight: 850; color: var(--perf-text-secondary); }
.pf-chip:hover { color: var(--perf-text); border-color: var(--perf-border-strong); }
.pf-chip.on { color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); border-color: color-mix(in srgb, var(--c) 36%, transparent); }

.pf-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(248px, 1fr)); gap: 13px; }
.pf-card { position: relative; overflow: hidden; cursor: pointer; display: flex; flex-direction: column; gap: 11px; padding: 14px 15px 13px 17px; border-radius: 16px;
  background: var(--perf-surface); border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow); transition: transform 0.25s var(--perf-spring), border-color 0.25s, box-shadow 0.3s; }
.pf-card:hover { border-color: var(--perf-border-warm); box-shadow: var(--perf-card-shadow-hover); }
.pf-card-glare { position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.3s;
  background: radial-gradient(160px 160px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), color-mix(in srgb, var(--c) 22%, transparent), transparent 70%); }
.pf-card-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--c); }
.pf-card-head { position: relative; z-index: 1; display: flex; align-items: center; gap: 10px; }
.pf-card-avwrap { position: relative; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
  background: conic-gradient(from -90deg, var(--perf-gold) var(--perf-p, 0deg), var(--perf-track) 0); }
.pf-card-av { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; font-size: 11px; font-weight: 800; color: #1a1206; background: var(--perf-grad-hero); box-shadow: 0 0 0 2px var(--perf-surface); }
.pf-card-id { flex: 1; min-width: 0; }
.pf-card-id b { font-size: 13px; font-weight: 800; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
.pf-card-id span { font-size: 10.5px; color: var(--perf-text-dim); }
.pf-card-stamp { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 999px; flex-shrink: 0; font-size: 10px; font-weight: 800;
  color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.pf-card-prog { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 5px; }
.pf-card-track { height: 6px; border-radius: 999px; background: var(--perf-track); overflow: hidden; }
.pf-card-track i { display: block; height: 100%; border-radius: 999px; background: var(--perf-grad-hero); transition: width 0.9s var(--perf-spring); }
.pf-card-prog-lab { font-size: 10.5px; font-weight: 650; color: var(--perf-text-muted); }
.pf-card-foot { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.pf-card-raters { display: flex; align-items: center; gap: 4px; }
.pf-card-rdot { display: grid; place-items: center; width: 19px; height: 19px; border-radius: 50%; flex-shrink: 0; color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); border: 1px solid color-mix(in srgb, var(--c) 32%, transparent); }
.pf-card-anon { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 700; color: var(--perf-text-muted); }
.pf-card-avg { font-size: 15px; font-weight: 850; color: var(--perf-gold); font-variant-numeric: tabular-nums; }
.pf-card-avg i { font-size: 9px; font-style: normal; color: var(--perf-text-muted); }

/* connectivity ribbon */
.pf-flow { padding: 16px 18px; border-radius: 18px; background: var(--perf-surface); border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow); }
.pf-flow-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 12px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--perf-text-secondary); margin-bottom: 16px; }
.pf-flow-head :deep(svg) { color: var(--perf-gold); }
.pf-flow-head small { font-size: 10.5px; font-weight: 600; letter-spacing: 0; text-transform: none; color: var(--perf-text-dim); }
.pf-flow-rail { position: relative; display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
.pf-flow-track { position: absolute; top: 22px; left: 7%; right: 7%; height: 2px; border-radius: 2px; overflow: hidden; background: var(--perf-track); }
.pf-flow-pulse { position: absolute; top: 0; left: -40%; width: 40%; height: 100%; background: linear-gradient(90deg, transparent, var(--perf-gold), transparent); animation: pf-rail 3s linear infinite; }
@keyframes pf-rail { to { left: 110%; } }
.pf-flow-stn { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 6px; border-radius: 13px; cursor: pointer; font: inherit; text-align: center;
  background: var(--perf-panel); border: 1px solid var(--perf-border); transition: transform 0.18s var(--perf-spring), border-color 0.18s, box-shadow 0.25s;
  opacity: 0; animation: pf-flow-in 0.5s var(--perf-spring) forwards; animation-delay: calc(var(--si) * 0.08s); }
@keyframes pf-flow-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.pf-flow-stn:hover { transform: translateY(-3px); border-color: var(--perf-border-warm); box-shadow: var(--perf-card-shadow-hover); }
.pf-flow-stn.here { border-color: color-mix(in srgb, var(--perf-gold) 50%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--perf-gold) 28%, transparent); cursor: default; }
.pf-flow-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 11px; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 12%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 26%, transparent); }
.pf-flow-stn.here .pf-flow-ic { color: #1a1206; background: var(--perf-grad-hero); border-color: transparent; box-shadow: 0 0 18px -4px var(--perf-gold); }
.pf-flow-stn b { font-size: 11.5px; font-weight: 800; color: var(--perf-text); }
.pf-flow-sub { font-size: 9.5px; color: var(--perf-text-muted); }
.pf-flow-chev { position: absolute; top: 16px; right: -16px; color: var(--perf-text-dim); }
.pf-flow-now { font-size: 8.5px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--perf-gold); }

.pf-loading { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 40px; color: var(--perf-text-muted); font-size: 13px; }
.pf-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 9px; padding: 44px 24px; border-radius: 18px; background: var(--perf-surface); border: 1px dashed var(--perf-border-strong); }
.pf-empty-ic { display: grid; place-items: center; width: 60px; height: 60px; border-radius: 18px; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 12%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 26%, transparent); }
.pf-empty b { font-size: 15px; font-weight: 800; color: var(--perf-text); margin-top: 4px; }
.pf-empty p { margin: 0; font-size: 12.5px; color: var(--perf-text-muted); max-width: 46ch; line-height: 1.5; }

@media (max-width: 1080px) { .pf-command { grid-template-columns: 1fr; } .pf-lenses { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 720px) { .pf-flow-rail { grid-template-columns: repeat(2, 1fr); } .pf-flow-track, .pf-flow-chev { display: none; } }
@media (max-width: 620px) { .pf-lenses { grid-template-columns: repeat(2, 1fr); } .pf-grid { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: no-preference) {
  .pf-card { transform: perspective(900px) rotateX(calc((var(--my, 0.5) - 0.5) * -4deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 5deg)); }
  .pf-card:hover { transform: perspective(900px) rotateX(calc((var(--my, 0.5) - 0.5) * -4deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 5deg)) translateY(-3px); }
  .pf-card:hover .pf-card-glare { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) { .pf-lens:hover { transform: none; } .pf-card-track i, .pf-mix-bar i { transition: none; } .pf-flow-pulse, .pf-flow-stn { animation: none; opacity: 1; } }
</style>
