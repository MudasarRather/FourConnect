<template>
  <div class="tpp perf-scope" :data-reduced="reduced">
    <!-- ═══════════════ HERO ═══════════════ -->
    <header ref="heroEl" class="tpp-hero tpp-rise" @pointermove="onHeroMove" @pointerleave="resetHero">
      <span class="tpp-edge" aria-hidden="true" />
      <div class="tpp-hero-bg" aria-hidden="true" :style="heroParallax">
        <span class="tpp-orb o1" /><span class="tpp-orb o2" /><span class="tpp-orb o3" />
        <span class="tpp-bggrid" /><span class="tpp-scan" />
      </div>

      <div class="tpp-hero-in">
        <div class="tpp-deck">
          <div class="tpp-deck-lead">
            <span class="tpp-eyebrow"><span class="tpp-eyebrow-dot" /> Manager · Performance command</span>
            <h1 class="tpp-title">
              {{ greeting }}<template v-if="manager"> ,&nbsp;<span class="tpp-mgr">{{ managerFirst }}</span></template>
              <span class="tpp-title-2"><template v-if="actionable">— <em>{{ actionable }}</em> {{ actionable === 1 ? 'call' : 'calls' }} await you</template><template v-else>— your squad is all clear</template></span>
            </h1>
            <p class="tpp-sub">Your reports' ratings are yours to own and their increments yours to recommend. Score is final from you; every hike is bounded by company merit policy and routed to HR for budget approval.</p>
          </div>
          <div class="tpp-deck-instr" v-reveal>
            <SquadReactor :members="rows" :avg="avgScore" :reduced="reduced" />
          </div>
        </div>

        <!-- telemetry lenses (clickable filters) -->
        <div class="tpp-lenses">
          <button v-for="(l, i) in lenses" :key="l.key" type="button" class="tpp-lens" :class="{ on: filter === l.key, alert: l.alert }"
            :style="{ '--acc': l.color, '--i': i }" @click="filter = l.key">
            <span class="tpp-lens-ic"><component :is="l.icon" :size="16" /></span>
            <span class="tpp-lens-val"><SetCountUp :value="l.value" :decimals="l.decimals || 0" :suffix="l.suffix || ''" /></span>
            <span class="tpp-lens-lab">{{ l.label }}</span>
            <span class="tpp-lens-bar" />
          </button>
        </div>
      </div>
    </header>

    <!-- ═══════════════ ROSTER (the actionable cards — first thing under the hero) ═══════════════ -->
    <section class="tpp-roster tpp-rise tpp-d1">
      <div class="tpp-bar">
        <div class="tpp-bar-l">
          <span class="tpp-bar-lab">{{ filterLabel }}</span>
          <span class="tpp-bar-n">{{ filtered.length }}</span>
        </div>
        <button class="perf-btn perf-btn-ghost" :disabled="loading" @click="load"><RefreshCw :size="14" :class="{ 'perf-spin': loading }" /> Refresh</button>
      </div>

      <div v-if="loading" class="tpp-load"><Loader2 :size="20" class="perf-spin" /> Loading your squad…</div>
      <div v-else-if="!rows.length" class="tpp-empty">
        <span class="tpp-empty-ic"><Users :size="26" /></span>
        <b>No direct reports yet</b>
        <p>When employees are set to report to you, they'll appear here for you to review, score and recommend increments — even before HR opens a cycle.</p>
      </div>
      <div v-else-if="!filtered.length" class="tpp-none"><Inbox :size="22" /> Nothing in this view.</div>
      <div v-else class="tpp-grid">
        <TeamPerfReviewCard v-for="(it, i) in filtered" :key="it.employee_id" :item="it" :index="i"
          :dimmed="hoveredId && hoveredId !== it.employee_id" :lit="hoveredId === it.employee_id"
          @open="openConsole" @start="openLaunch" @hover="hoveredId = $event" />
      </div>
    </section>

    <!-- ═══════════════ SIGNATURE INSTRUMENT — the spotlight stage (sits right under the roster) ═══════════════ -->
    <section v-if="rows.length" v-reveal class="tpp-stage-panel">
      <div class="tpp-stage-head">
        <span class="tpp-stage-title"><Spotlight :size="14" /> Crew readiness stage</span>
        <span class="tpp-stage-meta">{{ rows.length }} on roster · beam height = score · click a pillar to open</span>
      </div>
      <SquadStage :members="rows" :lit-id="hoveredId" @hover="hoveredId = $event" @focus="onPodAction" />
    </section>

    <!-- ═══════════════ TEAM 360° FEEDBACK — give + view your reports' multi-rater feedback ═══════════════ -->
    <div v-if="rows.length || teamGiveDuties.length" v-reveal>
      <TeamFeedbackBoard :reports="feedbackOverview" :give-duties="teamGiveDuties" :loading="feedbackLoading" :reduced="reduced"
        @give="openGive" @view="openTeamFeedback" @refresh="loadFeedback" />
    </div>

    <!-- ═══════════════ IMPROVEMENT PLANS — run your reports' PIPs ═══════════════ -->
    <section v-if="teamPips.length" v-reveal class="tpp-pips">
      <div class="tpp-bar">
        <div class="tpp-bar-l">
          <span class="tpp-bar-lab"><LifeBuoy :size="15" /> Improvement plans</span>
          <span class="tpp-bar-n">{{ teamPips.length }}</span>
        </div>
        <span class="tpp-pip-hint">
          <template v-if="pipCounts.drafts">{{ pipCounts.drafts }} to set up · </template>{{ pipCounts.active }} active<template v-if="pipCounts.overdue"> · <em>{{ pipCounts.overdue }} overdue</em></template>
        </span>
      </div>
      <div class="tpp-grid">
        <SsPipMiniCard v-for="(p, i) in teamPips" :key="p.id" :pip="p" :index="i" mode="manager" @open="openPip" />
      </div>
    </section>

    <TeamPerfConsole :open="consoleOpen" :review="selected" @close="consoleOpen = false" @mutated="onMutated" />
    <TeamLaunchModal :open="launchOpen" :employee="launchEmp" :templates="templates" @close="launchOpen = false" @launched="onLaunched" />
    <SsPipDrawer :open="pipDrawerOpen" :pip="pipSelected" mode="manager" @close="pipDrawerOpen = false" @mutated="onPipMutated" />
    <SsGiveFeedbackModal :open="giveOpen" :req="giveReq" @close="giveOpen = false" @done="onGiveDone" />
    <TeamFeedbackModal :open="tfOpen" :employee="tfEmp" @close="tfOpen = false" />
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Users, Loader2, RefreshCw, Inbox, PencilRuler, Coins, Gauge, Sparkles, Orbit, ArrowRight, LifeBuoy,
} from 'lucide-vue-next'
// `Spotlight` may not exist in every lucide build — fall back to Gauge.
import { Lightbulb as Spotlight } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import '@/styles/performance-theme.css'
import SquadReactor from './performance/components/SquadReactor.vue'
import SquadStage from './performance/components/SquadStage.vue'
import TeamPerfReviewCard from './performance/components/TeamPerfReviewCard.vue'
import TeamPerfConsole from './performance/components/TeamPerfConsole.vue'
import TeamLaunchModal from './performance/components/TeamLaunchModal.vue'
import SsPipMiniCard from './performance/components/SsPipMiniCard.vue'
import SsPipDrawer from './performance/components/SsPipDrawer.vue'
import TeamFeedbackBoard from './performance/components/TeamFeedbackBoard.vue'
import TeamFeedbackModal from './performance/components/TeamFeedbackModal.vue'
import SsGiveFeedbackModal from './performance/components/SsGiveFeedbackModal.vue'
import SetCountUp from './settings/components/SetCountUp.vue'
import { prefersReduced } from '@/composables/useShiftMotion'
import { useGreeting } from '@/composables/useGreeting'
import { fetchTeamReviews, fetchTeamTemplates, fetchMyFeedbackToGive, fetchTeamPips, fetchTeamFeedbackOverview } from '@/composables/usePerformance'

const toast = useToast()
const reduced = prefersReduced()

// pointer-parallax depth on the hero atmosphere
const heroEl = ref(null)
const heroParallax = reactive({ transform: '' })
function onHeroMove(e) {
  if (reduced || !heroEl.value) return
  const r = heroEl.value.getBoundingClientRect()
  const dx = (e.clientX - r.left) / r.width - 0.5
  const dy = (e.clientY - r.top) / r.height - 0.5
  heroParallax.transform = `translate3d(${(dx * 22).toFixed(1)}px, ${(dy * 16).toFixed(1)}px, 0)`
}
const resetHero = () => { heroParallax.transform = '' }

const loading = ref(true)
const rows = ref([])
const counts = ref({ to_score: 0, to_recommend: 0, decided: 0, no_review: 0, total: 0 })
const avgScore = ref(null)
const manager = ref('')
const templates = ref([])
const filter = ref('all')
const hoveredId = ref(null)
const feedbackPending = ref(0)   // 360° responses this manager still owes (separate duty)
const feedbackOverview = ref([]) // per-report 360° feedback summary (the manager's VIEW)
const allGiveDuties = ref([])    // every feedback response assigned to me as a rater
const feedbackLoading = ref(false)
const teamGiveDuties = computed(() => allGiveDuties.value.filter(d => ['MANAGER', 'SKIP_LEVEL'].includes((d.relationship_type || '').toUpperCase())))
const teamPips = ref([])
const pipCounts = ref({ drafts: 0, active: 0, overdue: 0, successful: 0, total: 0 })

const managerFirst = computed(() => (manager.value || '').split(/\s+/)[0])
const { greeting } = useGreeting()
const actionable = computed(() => counts.value.to_score + counts.value.to_recommend)

const isScore = (it) => it.review && ['SELF_ASSESSMENT', 'MANAGER_ASSESSMENT', 'DRAFT'].includes(it.review.status)
const isRec = (it) => it.review && ['COMPLETED', 'ACKNOWLEDGED'].includes(it.review.status) && (!it.review.hike_status || it.review.hike_status === 'NONE')
const isDecided = (it) => it.review && ['RECOMMENDED', 'APPROVED', 'APPLIED'].includes(it.review.hike_status || 'NONE')
const isAwaiting = (it) => !it.review

const lenses = computed(() => [
  { key: 'all', label: 'Reports', value: rows.value.length, color: 'var(--perf-gold)', icon: Users },
  { key: 'score', label: 'To score', value: counts.value.to_score, color: 'var(--perf-orange)', icon: PencilRuler, alert: counts.value.to_score > 0 },
  { key: 'recommend', label: 'To recommend', value: counts.value.to_recommend, color: 'var(--perf-amber)', icon: Coins, alert: counts.value.to_recommend > 0 },
  { key: 'awaiting', label: 'No review', value: counts.value.no_review, color: 'var(--perf-unset)', icon: Sparkles },
  { key: 'avg', label: 'Avg score', value: avgScore.value || 0, decimals: 1, color: 'var(--perf-ok)', icon: Gauge },
])

const FILTER_LABELS = { all: 'Full roster', score: 'Awaiting your score', recommend: 'Awaiting a hike recommendation', decided: 'Decided', awaiting: 'No review opened yet', avg: 'Full roster' }
const filterLabel = computed(() => FILTER_LABELS[filter.value] || 'Roster')

const filtered = computed(() => {
  if (filter.value === 'score') return rows.value.filter(isScore)
  if (filter.value === 'recommend') return rows.value.filter(isRec)
  if (filter.value === 'decided') return rows.value.filter(isDecided)
  if (filter.value === 'awaiting') return rows.value.filter(isAwaiting)
  return rows.value
})

async function load() {
  loading.value = true
  try {
    const d = await fetchTeamReviews()
    rows.value = d.items || []
    counts.value = d.counts || { to_score: 0, to_recommend: 0, decided: 0, no_review: 0, total: 0 }
    avgScore.value = d.avg_score
    manager.value = d.manager_name || ''
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load your team') }
  finally { loading.value = false }
  try { const t = await fetchTeamTemplates(); templates.value = t.items || [] } catch { templates.value = [] }
  // 360° feedback now lives HERE on the team surface — both the manager's give-duties
  // about their reports AND the collected perception per report (the Team Feedback board).
  await loadFeedback()
  // improvement plans for my direct reports — managers run them here
  try { const pp = await fetchTeamPips(); teamPips.value = pp.items || []; pipCounts.value = pp.counts || pipCounts.value } catch { teamPips.value = [] }
}
onMounted(load)

// ── Team 360° feedback (give + view) ──
async function loadFeedback() {
  feedbackLoading.value = true
  try { const ov = await fetchTeamFeedbackOverview(); feedbackOverview.value = ov.items || [] } catch { feedbackOverview.value = [] }
  try { const f = await fetchMyFeedbackToGive(); allGiveDuties.value = f.items || []; feedbackPending.value = f.pending || 0 } catch { allGiveDuties.value = []; feedbackPending.value = 0 }
  feedbackLoading.value = false
}
const giveOpen = ref(false)
const giveReq = ref(null)
const openGive = (d) => { giveReq.value = d; giveOpen.value = true }
function onGiveDone() { giveOpen.value = false; loadFeedback() }
const tfOpen = ref(false)
const tfEmp = ref(null)
const openTeamFeedback = (r) => { tfEmp.value = r; tfOpen.value = true }

// improvement plan (manager run)
const pipDrawerOpen = ref(false)
const pipSelected = ref(null)
const openPip = (p) => { pipSelected.value = p; pipDrawerOpen.value = true }
function onPipMutated() { load() }

// console (score / recommend)
const consoleOpen = ref(false)
const selected = ref(null)
const openConsole = (review) => { selected.value = review; consoleOpen.value = true }
function onMutated() { load() }

// launch (no-review report)
const launchOpen = ref(false)
const launchEmp = ref(null)
const openLaunch = (item) => {
  if (!templates.value.length) { toast.info('No active appraisal templates — ask HR to publish one first.'); return }
  launchEmp.value = item; launchOpen.value = true
}
function onLaunched(review) { launchOpen.value = false; load(); if (review) { selected.value = review; consoleOpen.value = true } }

// stage pillar click → open or launch
const onPodAction = (item) => { if (item.review) openConsole(item.review); else openLaunch(item) }
</script>

<style scoped>
.tpp { display: flex; flex-direction: column; gap: 18px; color: var(--perf-text); }
/* Each section is its own normal-flow block (no transform wrappers that could
   pull a sibling out of flow). CSS entrance with `backwards` fill = never stuck. */
.tpp > * { position: relative; z-index: 1; }
.tpp-rise { animation: tpp-rise 0.5s var(--perf-spring) backwards; }
.tpp-d1 { animation-delay: 0.07s; }
.tpp-d2 { animation-delay: 0.13s; }
@keyframes tpp-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }

/* ── hero ── */
.tpp-hero { position: relative; overflow: hidden; border-radius: 24px; border: 1px solid var(--perf-border); background: var(--perf-surface); }
.tpp-edge { position: absolute; top: 0; left: 0; right: 0; height: 3px; z-index: 2;
  background: linear-gradient(90deg, transparent, var(--perf-gold), var(--perf-orange), var(--perf-gold), transparent);
  background-size: 200% 100%; animation: tpp-edge 5s linear infinite; }
/* command-deck: lead text + live reactor instrument */
.tpp-deck { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: clamp(16px, 3vw, 40px); align-items: center; }
.tpp-deck-lead { min-width: 0; }
.tpp-deck-instr { flex-shrink: 0; }
@media (max-width: 880px) { .tpp-deck { grid-template-columns: 1fr; } .tpp-deck-instr { justify-self: center; order: -1; } }
.tpp-hero-bg { position: absolute; inset: 0; pointer-events: none; transition: transform 0.4s var(--perf-ease); will-change: transform; }
.tpp[data-reduced="true"] .tpp-hero-bg { transition: none; }
.tpp-orb { position: absolute; border-radius: 50%; filter: blur(64px); }
.tpp-orb.o1 { width: 360px; height: 360px; top: -140px; right: -50px; background: radial-gradient(circle, color-mix(in srgb, var(--perf-orange) 55%, transparent), transparent 70%); opacity: 0.5; animation: tpp-drift 16s var(--perf-ease) infinite alternate; }
.tpp-orb.o2 { width: 300px; height: 300px; bottom: -160px; left: 6%; background: radial-gradient(circle, color-mix(in srgb, var(--perf-gold) 55%, transparent), transparent 70%); opacity: 0.45; animation: tpp-drift 22s var(--perf-ease) infinite alternate-reverse; }
.tpp-orb.o3 { width: 220px; height: 220px; top: 30%; left: 44%; background: radial-gradient(circle, color-mix(in srgb, var(--perf-ember) 45%, transparent), transparent 70%); opacity: 0.3; animation: tpp-drift 19s var(--perf-ease) infinite alternate; }
.tpp-bggrid { position: absolute; inset: 0; opacity: 0.4; background-image: linear-gradient(var(--perf-border) 1px, transparent 1px), linear-gradient(90deg, var(--perf-border) 1px, transparent 1px); background-size: 46px 46px; mask-image: radial-gradient(circle at 72% 16%, #000, transparent 78%); }
.tpp-scan { position: absolute; left: 0; right: 0; height: 2px; top: 0; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--perf-gold) 50%, transparent), transparent); animation: tpp-scanline 8s linear infinite; }
.tpp-hero-in { position: relative; z-index: 1; padding: 20px 24px; }
.tpp-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.09em; text-transform: uppercase; color: var(--perf-gold); }
.tpp-eyebrow-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--perf-gold); box-shadow: 0 0 10px var(--perf-gold); animation: tpp-pulse 2s ease-in-out infinite; }
.tpp-title { margin: 8px 0 6px; font-size: clamp(20px, 3vw, 27px); font-weight: 850; letter-spacing: -0.02em; line-height: 1.12; }
.tpp-mgr { background: var(--perf-grad-hero); -webkit-background-clip: text; background-clip: text; color: transparent; }
.tpp-title-2 { font-weight: 800; color: var(--perf-text-secondary); }
.tpp-title-2 em { font-style: normal; color: var(--perf-gold); }
.tpp-sub { margin: 0; font-size: 12px; line-height: 1.5; color: var(--perf-text-muted); max-width: 78ch; }
.tpp-lenses { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-top: 15px; }
.tpp-lens { position: relative; overflow: hidden; text-align: left; display: flex; flex-direction: column; gap: 2px; padding: 11px 13px 12px; border-radius: 14px; cursor: pointer; font: inherit;
  background: var(--perf-glass); border: 1px solid var(--perf-border); --acc: var(--perf-gold); transition: transform 0.22s var(--perf-spring), border-color 0.22s; }
.tpp-lens:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--acc) 40%, transparent); }
.tpp-lens.on { border-color: var(--acc); background: color-mix(in srgb, var(--acc) 10%, var(--perf-glass)); }
.tpp-lens-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; color: var(--acc); background: color-mix(in srgb, var(--acc) 13%, transparent); border: 1px solid color-mix(in srgb, var(--acc) 26%, transparent); }
.tpp-lens.alert .tpp-lens-ic::after { content: ''; position: absolute; top: 11px; left: 33px; width: 7px; height: 7px; border-radius: 50%; background: var(--acc); box-shadow: 0 0 8px var(--acc); animation: tpp-pulse 1.8s ease-in-out infinite; }
.tpp-lens-val { margin-top: 6px; font-size: 20px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; line-height: 1; }
.tpp-lens-lab { font-size: 10.5px; font-weight: 650; color: var(--perf-text-muted); }
.tpp-lens-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: var(--acc); transform: scaleX(0); transform-origin: left; transition: transform 0.3s var(--perf-spring); }
.tpp-lens.on .tpp-lens-bar { transform: scaleX(1); }

/* ── 360° feedback cross-link banner ── */
.tpp-fb-cta { display: flex; align-items: center; gap: 12px; padding: 13px 16px; border-radius: 15px; text-decoration: none;
  background: color-mix(in srgb, var(--perf-orange) 8%, var(--perf-surface)); border: 1px solid color-mix(in srgb, var(--perf-orange) 30%, transparent); transition: transform 0.2s var(--perf-spring), border-color 0.2s, box-shadow 0.25s; }
.tpp-fb-cta:hover { transform: translateY(-2px); border-color: var(--perf-orange); box-shadow: var(--perf-card-shadow-hover); }
.tpp-fb-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 12px; flex-shrink: 0; color: var(--perf-orange); background: color-mix(in srgb, var(--perf-orange) 15%, transparent); border: 1px solid color-mix(in srgb, var(--perf-orange) 32%, transparent); }
.tpp-fb-cta > div { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.tpp-fb-cta b { font-size: 13.5px; font-weight: 800; color: var(--perf-text); }
.tpp-fb-cta > div span { font-size: 11.5px; color: var(--perf-text-muted); }
.tpp-fb-go { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 750; color: var(--perf-orange); flex-shrink: 0; }

/* ── stage panel ── */
.tpp-stage-panel { display: flex; flex-direction: column; gap: 11px; }
.tpp-stage-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.tpp-stage-title { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 850; color: var(--perf-text); }
.tpp-stage-title :deep(svg) { color: var(--perf-gold); }
.tpp-stage-meta { font-size: 11px; color: var(--perf-text-muted); }

/* ── roster ── */
.tpp-roster { display: flex; flex-direction: column; gap: 14px; }
.tpp-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.tpp-bar-l { display: inline-flex; align-items: center; gap: 9px; }
.tpp-bar-lab { font-size: 13px; font-weight: 800; color: var(--perf-text); }
.tpp-bar-n { font-size: 11px; font-weight: 800; padding: 2px 9px; border-radius: 999px; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 14%, transparent); }
.tpp-bar-lab { display: inline-flex; align-items: center; gap: 7px; }
.tpp-bar-lab :deep(svg) { color: var(--perf-gold); }
.tpp-pip-hint { font-size: 11.5px; color: var(--perf-text-muted); }
.tpp-pip-hint em { font-style: normal; font-weight: 800; color: var(--perf-conflict); }
.tpp-pips { display: flex; flex-direction: column; gap: 14px; }

/* ── states + grid ── */
.tpp-load, .tpp-none { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 44px; color: var(--perf-text-muted); font-size: 13px; }
.tpp-none :deep(svg), .tpp-load :deep(svg) { color: var(--perf-text-dim); }
.tpp-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 50px 24px; border-radius: 18px; background: var(--perf-surface); border: 1px dashed var(--perf-border-strong); }
.tpp-empty-ic { display: grid; place-items: center; width: 60px; height: 60px; border-radius: 18px; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 12%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 26%, transparent); }
.tpp-empty b { font-size: 16px; font-weight: 850; }
.tpp-empty p { margin: 0; font-size: 12.5px; color: var(--perf-text-muted); max-width: 48ch; line-height: 1.5; }
.tpp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }

@keyframes tpp-edge { to { background-position: 200% 0; } }
@keyframes tpp-drift { from { transform: translate(0, 0); } to { transform: translate(-34px, 26px); } }
@keyframes tpp-scanline { 0% { top: 0; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
@keyframes tpp-pulse { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.3); } }

@media (max-width: 860px) { .tpp-lenses { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 560px) { .tpp-lenses { grid-template-columns: repeat(2, 1fr); } }
.tpp[data-reduced="true"] .tpp-orb, .tpp[data-reduced="true"] .tpp-scan, .tpp[data-reduced="true"] .tpp-eyebrow-dot, .tpp[data-reduced="true"] .tpp-rise, .tpp[data-reduced="true"] .tpp-edge { animation: none; }
@media (prefers-reduced-motion: reduce) { .tpp-orb, .tpp-scan, .tpp-eyebrow-dot, .tpp-rise, .tpp-edge { animation: none; } .tpp-lens:hover { transform: none; } }
</style>
