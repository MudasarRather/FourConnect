<template>
  <div class="ssp perf-scope" :data-reduced="reduced">
    <!-- full-page ambient backdrop — drifting auroras + dot-grid + scan beam -->
    <div class="ssp-backdrop" aria-hidden="true">
      <span class="ssp-bd-aurora a" /><span class="ssp-bd-aurora b" /><span class="ssp-bd-aurora c" />
      <span class="ssp-bd-grid" /><span class="ssp-bd-scan" />
    </div>

    <!-- ═══════════════════════ GROWTH ATRIUM — cinematic command deck ═══════════════════════ -->
    <header ref="heroEl" class="ssp-hero ssp-rise" @pointermove="onHeroMove" @pointerleave="resetHero">
      <span class="ssp-edge" aria-hidden="true" />
      <div class="ssp-hero-bg" aria-hidden="true" :style="heroParallax">
        <span class="ssp-mesh" /><span class="ssp-orb o1" /><span class="ssp-orb o2" /><span class="ssp-orb o3" />
        <span class="ssp-hgrid" /><span class="ssp-scan" />
      </div>

      <div class="ssp-hero-in">
        <!-- identity lead -->
        <div class="ssp-lead">
          <span class="ssp-eyebrow"><span class="ssp-eyebrow-dot" /> My growth · Self-service</span>
          <h1 class="ssp-title">{{ greeting }}<template v-if="myFirst">,&nbsp;<span class="ssp-accent">{{ myFirst }}</span></template></h1>
          <p class="ssp-sub">Your growth cockpit — track your goals &amp; OKRs, give the feedback your colleagues are waiting on, and stay ahead of any improvement plan. Your appraisal dossiers wait just below.</p>
          <div v-if="!unlinked && myRole" class="ssp-whoami">
            <span class="ssp-whoami-av">{{ myInitials }}</span>
            <span class="ssp-whoami-txt"><b>{{ myName }}</b><em>{{ myRole }}</em></span>
          </div>
          <Transition name="ssp-pop">
            <div v-if="focusPill" class="ssp-cycle">
              <span class="ssp-cycle-ic"><component :is="focusPill.icon" :size="15" /></span>
              <span class="ssp-cycle-txt"><b>{{ focusPill.title }}</b><em>{{ focusPill.detail }}</em></span>
              <span class="ssp-cycle-live" aria-hidden="true">Now</span>
            </div>
          </Transition>
        </div>

        <!-- growth instrument bento: momentum rings (signature) + the three domain lenses -->
        <template v-if="!loading && !unlinked">
          <div class="ssp-bento">
            <GrowthRings class="ssp-rings" :rings="rings" :focus="focusObj" :reduced="reduced" @go="goTo" />

            <div class="ssp-lenses">
              <!-- Goals & OKRs -->
              <Motion as="button" type="button" class="ssp-lens" style="--lc: var(--perf-gold)" @click="goTo('goals')"
                :initial="reduced ? false : { opacity: 0, x: 16 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.45, delay: 0.05, ease: [0.16, 1, 0.3, 1] }"
                :whileHover="reduced ? {} : { y: -3 }" :whileTap="reduced ? {} : { scale: 0.99 }">
                <span class="ssp-lens-glow" aria-hidden="true" />
                <header class="ssp-lens-h"><span class="ssp-lens-ic"><Target :size="15" /></span><span class="ssp-lens-t">Goals &amp; OKRs</span><ArrowRight class="ssp-lens-go" :size="14" /></header>
                <div class="ssp-lens-main">
                  <b class="ssp-lens-val"><template v-if="myGoals.length"><SetCountUp :value="goalsAvg" suffix="%" /></template><template v-else>—</template></b>
                  <span class="ssp-lens-sub">{{ myGoals.length ? `${myGoals.length} active · ${goalsOnTrack} on track` : 'No goals yet' }}</span>
                </div>
                <div class="ssp-lens-bars">
                  <template v-if="goalBars.length">
                    <span v-for="g in goalBars" :key="g.id" class="ssp-lens-bar"><i :style="{ height: Math.max(9, g.progress) + '%', background: goalTone(g.progress) }" /></span>
                  </template>
                  <span v-else class="ssp-lens-mini-empty">Set your first objective to start climbing</span>
                </div>
                <span class="ssp-lens-chip" :class="goalsAtRisk ? 'warn' : 'ok'"><component :is="goalsAtRisk ? AlertTriangle : TrendingUp" :size="11" /> {{ goalsAtRisk ? `${goalsAtRisk} at risk` : (myGoals.length ? 'On track' : 'Awaiting goals') }}</span>
              </Motion>

              <!-- Feedback to give -->
              <Motion as="button" type="button" class="ssp-lens" style="--lc: var(--perf-orange)" @click="goTo('feedback')"
                :initial="reduced ? false : { opacity: 0, x: 16 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.45, delay: 0.11, ease: [0.16, 1, 0.3, 1] }"
                :whileHover="reduced ? {} : { y: -3 }" :whileTap="reduced ? {} : { scale: 0.99 }">
                <span class="ssp-lens-glow" aria-hidden="true" />
                <header class="ssp-lens-h"><span class="ssp-lens-ic"><Orbit :size="15" /></span><span class="ssp-lens-t">Feedback to give</span><ArrowRight class="ssp-lens-go" :size="14" /></header>
                <div class="ssp-lens-main">
                  <b class="ssp-lens-val"><template v-if="feedbackTotal"><SetCountUp :value="feedbackPending" /><i class="ssp-lens-unit">{{ feedbackPending ? ' to give' : ' done' }}</i></template><template v-else>0</template></b>
                  <span class="ssp-lens-sub">{{ feedbackTotal ? `${feedbackDone}/${feedbackTotal} responses given` : 'No requests yet' }}</span>
                </div>
                <div class="ssp-lens-dots">
                  <template v-if="fbDots.length">
                    <span v-for="d in fbDots" :key="d.id" class="ssp-lens-dot" :class="{ done: d.done, pend: !d.done }" />
                  </template>
                  <span v-else class="ssp-lens-mini-empty">Nobody is waiting on your input right now</span>
                </div>
                <span class="ssp-lens-chip" :class="feedbackPending ? 'warn' : 'ok'"><component :is="feedbackPending ? Send : CheckCircle2" :size="11" /> {{ feedbackPending ? `${feedbackPending} pending` : (feedbackTotal ? 'All given' : 'Nothing pending') }}</span>
              </Motion>

              <!-- Improvement plan -->
              <Motion as="button" type="button" class="ssp-lens" :class="improveState" :style="{ '--lc': improveTone }" @click="goTo('pip')"
                :initial="reduced ? false : { opacity: 0, x: 16 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.45, delay: 0.17, ease: [0.16, 1, 0.3, 1] }"
                :whileHover="reduced ? {} : { y: -3 }" :whileTap="reduced ? {} : { scale: 0.99 }">
                <span class="ssp-lens-glow" aria-hidden="true" />
                <header class="ssp-lens-h"><span class="ssp-lens-ic"><LifeBuoy :size="15" /></span><span class="ssp-lens-t">Improvement plan</span><ArrowRight class="ssp-lens-go" :size="14" /></header>
                <div class="ssp-lens-main">
                  <b class="ssp-lens-val ssp-lens-val--txt">{{ improveHeadline }}</b>
                  <span class="ssp-lens-sub">{{ improveSub }}</span>
                </div>
                <div class="ssp-lens-pips">
                  <template v-if="improvePips.length">
                    <span v-for="p in improvePips" :key="p.id" class="ssp-lens-pip" :class="{ met: p.met }" />
                  </template>
                  <span v-else class="ssp-lens-clear"><CheckCircle2 :size="13" /> You're in good standing — no formal plan</span>
                </div>
                <span class="ssp-lens-chip" :class="improveState === 'ack' ? 'danger' : improveState === 'active' ? 'warn' : 'ok'">
                  <component :is="improveState === 'ack' ? BellRing : improveState === 'active' ? Activity : CheckCircle2" :size="11" />
                  {{ improveState === 'ack' ? 'Acknowledge needed' : improveState === 'active' ? `${activePips.length} active` : 'Good standing' }}
                </span>
              </Motion>
            </div>
          </div>
        </template>
      </div>
    </header>

    <div v-if="loading" class="ssp-load"><Loader2 :size="20" class="perf-spin" /> Loading your performance…</div>

    <template v-else>
      <!-- my improvement plan(s) — prominent, supportive -->
      <section v-if="myPips.length" class="ssp-panel ssp-pip" data-ssp-anchor="pip" v-reveal>
        <header class="ssp-ph">
          <div class="ssp-ph-l">
            <span class="ssp-ph-eye amber"><LifeBuoy :size="12" /> Support</span>
            <h2 class="ssp-ph-title">My improvement plan{{ myPips.length > 1 ? 's' : '' }}</h2>
            <span class="ssp-ph-sub">A structured plan to bring you back to standard — your manager runs the check-ins</span>
          </div>
          <span v-if="pipToAck" class="ssp-ph-badge alert">{{ pipToAck }} to acknowledge</span>
        </header>
        <div class="ssp-grid">
          <SsPipMiniCard v-for="(p, i) in myPips" :key="p.id" :pip="p" :index="i" mode="employee" @open="openPip" />
        </div>
      </section>

      <!-- manager CTA — premium accent bar -->
      <RouterLink v-if="teamCount" to="/user/self-service/team-performance" class="ssp-mgr-cta" v-reveal>
        <span class="ssp-mgr-ic"><UserCheck :size="18" /></span>
        <div><b>You lead a team</b><span>{{ teamCount }} report review{{ teamCount > 1 ? 's' : '' }}{{ teamPending ? ` · ${teamPending} awaiting your assessment` : '' }}</span></div>
        <span class="ssp-mgr-go">Open Team Performance <ArrowRight :size="14" /></span>
      </RouterLink>

      <!-- action banners -->
      <Transition name="ssp-pop">
        <div v-if="!unlinked && actionNeeded" class="ssp-action" v-reveal>
          <span class="ssp-action-ic"><MessageSquareText :size="15" /></span>
          <span><b>{{ actionNeeded }}</b> review{{ actionNeeded > 1 ? 's' : '' }} in progress — add an optional reflection. Your manager owns the score; you never rate yourself.</span>
        </div>
      </Transition>
      <Transition name="ssp-pop">
        <div v-if="!unlinked && toAck" class="ssp-action ack" v-reveal>
          <span class="ssp-action-ic"><BadgeCheck :size="15" /></span>
          <span><b>{{ toAck }}</b> finalized review{{ toAck > 1 ? 's' : '' }} awaiting your acknowledgement — open it to read your manager's assessment and sign off.</span>
        </div>
      </Transition>

      <!-- ═══ FEEDBACK PANEL ═══ -->
      <section v-if="feedbackToGive.length" class="ssp-panel" data-ssp-anchor="feedback" v-reveal>
        <header class="ssp-ph">
          <div class="ssp-ph-l">
            <span class="ssp-ph-eye"><Orbit :size="12" /> 360° feedback</span>
            <h2 class="ssp-ph-title">Feedback to give</h2>
            <span class="ssp-ph-sub">Multi-rater requests waiting on your input</span>
          </div>
          <span v-if="feedbackPending" class="ssp-ph-badge alert">{{ feedbackPending }} pending</span>
        </header>
        <div class="ssp-fb-grid">
          <Motion v-for="(f, i) in feedbackToGive" :key="f.response_id" as="button" class="ssp-fb" :class="fbState(f)"
            :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.42, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }"
            :whileHover="reduced ? {} : { y: -4 }" :whileTap="reduced ? {} : { scale: 0.985 }" @click="openFeedback(f)">
            <span class="ssp-fb-glow" aria-hidden="true" />
            <span class="ssp-fb-rel" :style="{ '--rc': relColor(f.relationship_type) }">{{ relLabel(f.relationship_type) }}</span>
            <div class="ssp-fb-row">
              <span class="ssp-fb-av" :style="{ '--rc': relColor(f.relationship_type) }">{{ initials(f.subject_name) }}</span>
              <div class="ssp-fb-txt">
                <b>{{ f.subject_name }}</b>
                <span>{{ (f.competencies || []).length }} competenc{{ (f.competencies || []).length === 1 ? 'y' : 'ies' }} · rate &amp; comment</span>
              </div>
            </div>
            <span class="ssp-fb-cta" :class="fbState(f)"><component :is="fbIcon(f)" :size="13" /> {{ fbVerb(f) }}</span>
          </Motion>
        </div>
      </section>

      <!-- ═══ REVIEWS PANEL (needs a linked employee profile) ═══ -->
      <template v-if="!unlinked">
        <section class="ssp-panel" v-reveal>
          <header class="ssp-ph">
            <div class="ssp-ph-l">
              <span class="ssp-ph-eye"><ClipboardList :size="12" /> Appraisals</span>
              <h2 class="ssp-ph-title">My reviews</h2>
              <span class="ssp-ph-sub">Open a dossier to read your manager's assessment &amp; acknowledge</span>
            </div>
            <span v-if="myReviews.length" class="ssp-ph-badge">{{ myReviews.length }} total</span>
          </header>
          <div v-if="myReviews.length" class="ssp-grid">
            <SsReviewCard v-for="(r, i) in myReviews" :key="r.id" :review="r" :index="i" @open="openSelf" />
          </div>
          <div v-else class="ssp-panel-empty">
            <span class="ssp-pe-ic"><ClipboardList :size="22" /></span>
            <b>No reviews yet</b>
            <p>Your reviews appear here the moment HR or your manager opens a cycle — you'll add a reflection and acknowledge the outcome.</p>
          </div>
        </section>

        <!-- ═══ GOALS PANEL ═══ -->
        <section v-if="myGoals.length" class="ssp-panel" data-ssp-anchor="goals" v-reveal>
          <header class="ssp-ph">
            <div class="ssp-ph-l">
              <span class="ssp-ph-eye green"><Target :size="12" /> Objectives</span>
              <h2 class="ssp-ph-title">My goals &amp; OKRs</h2>
              <span class="ssp-ph-sub">Track progress with check-ins</span>
            </div>
            <span class="ssp-ph-badge green">{{ myGoals.length }} active</span>
          </header>
          <div class="ssp-goals">
            <Motion v-for="(g, i) in myGoals" :key="g.id" as="div" class="ssp-goal"
              :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.42, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }">
              <span class="ssp-goal-spine" :style="{ background: goalTone(g.progress) }" aria-hidden="true" />
              <div class="ssp-goal-head">
                <div class="ssp-goal-ring" :style="{ '--perf-p': goalDeg(g.progress) + 'deg', '--c': goalTone(g.progress) }">
                  <span>{{ Math.round(g.progress || 0) }}<i>%</i></span>
                </div>
                <div class="ssp-goal-id">
                  <span class="ssp-goal-type" :class="g.goal_type === 'OBJECTIVE' ? 'obj' : 'goal'">{{ g.goal_type === 'OBJECTIVE' ? 'Objective' : 'Goal' }}</span>
                  <b>{{ g.title }}</b>
                </div>
              </div>
              <div v-if="(g.key_results || []).length" class="ssp-krs">
                <div v-for="kr in g.key_results" :key="kr.id" class="ssp-kr">
                  <span class="ssp-kr-title">{{ kr.title }}</span>
                  <span class="ssp-kr-track"><i :style="{ width: (kr.progress || 0) + '%', background: goalTone(kr.progress) }" /></span>
                  <button class="ssp-kr-btn" type="button" title="Log progress" @click="openCheckIn(kr)"><TrendingUp :size="12" /></button>
                </div>
              </div>
              <button v-else class="ssp-goal-checkin" type="button" @click="openCheckIn(g)"><TrendingUp :size="12" /> Check in</button>
            </Motion>
          </div>
        </section>
      </template>

      <!-- no linked employee profile -->
      <div v-else class="ssp-empty" :class="{ soft: teamCount || feedbackToGive.length }">
        <span class="ssp-empty-ic"><Gauge :size="26" /></span>
        <b>No employee profile linked</b>
        <p v-if="teamCount || feedbackToGive.length">Your login isn't linked to your own employee record yet, so there are no personal reviews or goals here — but the team &amp; feedback duties above are yours to complete. Contact HR to link your profile.</p>
        <p v-else>Your login isn't linked to an employee record yet. Contact HR to get set up.</p>
      </div>
    </template>

    <SsPerfReviewDrawer :open="drawerOpen" :review="selected" context="self" @close="drawerOpen = false" @mutated="onMutated" />
    <GoalCheckInModal :open="checkInOpen" :goal="checkInGoal" :saving="savingCheckIn" @close="checkInOpen = false" @save="onCheckIn" />
    <SsGiveFeedbackModal :open="feedbackOpen" :req="feedbackReq" @close="feedbackOpen = false" @done="onFeedbackDone" />
    <SsPipDrawer :open="pipDrawerOpen" :pip="pipSelected" mode="employee" @close="pipDrawerOpen = false" @mutated="onMutated" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import axios from 'axios'
import { Motion } from 'motion-v'
import { Gauge, Loader2, ClipboardList, UserCheck, CheckCircle2, Orbit, Target, TrendingUp, MessageSquareText, ArrowRight, BadgeCheck, Sparkles, Send, CircleSlash, LifeBuoy, AlertTriangle, BellRing, Activity } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { API, authHeader } from '@/utils/api'
import '@/styles/performance-theme.css'
import GrowthRings from './performance/components/GrowthRings.vue'
import SsReviewCard from './performance/components/SsReviewCard.vue'
import SsPerfReviewDrawer from './performance/components/SsPerfReviewDrawer.vue'
import GoalCheckInModal from './performance/components/GoalCheckInModal.vue'
import SsGiveFeedbackModal from './performance/components/SsGiveFeedbackModal.vue'
import SsPipMiniCard from './performance/components/SsPipMiniCard.vue'
import SsPipDrawer from './performance/components/SsPipDrawer.vue'
import SetCountUp from './settings/components/SetCountUp.vue'
import { prefersReduced } from '@/composables/useShiftMotion'
import { useGreeting } from '@/composables/useGreeting'
import {
  fetchMyReviews, fetchTeamReviews, fetchMyGoals, myGoalCheckIn, fetchMyFeedbackToGive, fetchMyPips,
  goalTone, feedbackRelMeta,
} from '@/composables/usePerformance'

const toast = useToast()
const reduced = prefersReduced()
const loading = ref(true)
const unlinked = ref(false)
const myReviews = ref([])
const teamCount = ref(0)
const teamPending = ref(0)
const summary = ref({})

// appraisal counters still feed the body action banners (reflection / acknowledge)
const actionNeeded = computed(() => summary.value.action_needed || 0)
const toAck = computed(() => myReviews.value.filter(r => r.status === 'COMPLETED').length)

// identity
const me = ref(null)
const myName = computed(() => me.value?.full_name || me.value?.name || myReviews.value[0]?.employee_name || '')
const myFirst = computed(() => (myName.value || '').split(/\s+/)[0])
const myInitials = computed(() => (myName.value || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?')
const myRole = computed(() => {
  const r = myReviews.value[0]
  if (!r) return me.value?.organisation || ''
  return [r.designation_name, r.department_name].filter(Boolean).join(' · ')
})
const { greeting } = useGreeting()

// pointer-parallax depth on the hero atmosphere
const heroEl = ref(null)
const heroParallax = ref({})
function onHeroMove(e) {
  if (reduced || !heroEl.value) return
  const rect = heroEl.value.getBoundingClientRect()
  const dx = (e.clientX - rect.left) / rect.width - 0.5
  const dy = (e.clientY - rect.top) / rect.height - 0.5
  heroParallax.value = { transform: `translate3d(${(dx * 20).toFixed(1)}px, ${(dy * 14).toFixed(1)}px, 0)` }
}
const resetHero = () => { heroParallax.value = {} }

const myGoals = ref([])
const myPips = ref([])
const pipToAck = computed(() => myPips.value.filter(p => ['ACTIVE', 'EXTENDED'].includes(p.status) && !p.employee_ack_at).length)
const feedbackToGive = ref([])
const feedbackPending = ref(0)
const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
const relLabel = (k) => feedbackRelMeta(k).label
const relColor = (k) => feedbackRelMeta(k).color
// feedback-card state: a submitted/declined response is locked → opens view-only
const fbState = (f) => f.status === 'SUBMITTED' ? 'done' : f.status === 'DECLINED' ? 'declined' : ''
const fbIcon = (f) => f.status === 'SUBMITTED' ? CheckCircle2 : f.status === 'DECLINED' ? CircleSlash : Send
const fbVerb = (f) => f.status === 'SUBMITTED' ? 'View' : f.status === 'DECLINED' ? 'Declined' : 'Give'
const goalDeg = (p) => Math.round(Math.max(0, Math.min(100, Number(p || 0))) / 100 * 360)

// ════════════════════════════════════════════════════════════════════════════
//  Growth-momentum hero — the three personal tracks (Goals · Feedback · Plan)
//  drive the activity-ring instrument + the three domain lenses.
// ════════════════════════════════════════════════════════════════════════════
// Goals & OKRs
const goalsAvg = computed(() => {
  const gs = myGoals.value
  if (!gs.length) return 0
  return Math.round(gs.reduce((s, g) => s + Number(g.progress || 0), 0) / gs.length)
})
const goalsOnTrack = computed(() => myGoals.value.filter(g => ['ON_TRACK', 'ACHIEVED'].includes(g.status)).length)
const goalsAtRisk = computed(() => myGoals.value.filter(g => ['AT_RISK', 'OFF_TRACK', 'MISSED'].includes(g.status)).length)
const goalBars = computed(() => myGoals.value.slice(0, 9).map(g => ({ id: g.id, progress: Math.max(0, Math.min(100, Number(g.progress || 0))) })))

// Feedback to give
const feedbackTotal = computed(() => feedbackToGive.value.length)
const feedbackDone = computed(() => feedbackToGive.value.filter(f => ['SUBMITTED', 'DECLINED'].includes(f.status)).length)
const feedbackPct = computed(() => feedbackTotal.value ? Math.round(feedbackDone.value / feedbackTotal.value * 100) : 100)
const fbDots = computed(() => feedbackToGive.value.slice(0, 12).map(f => ({ id: f.response_id, done: ['SUBMITTED', 'DECLINED'].includes(f.status) })))

// Improvement plan — "no active plan" is the GOOD state (full emerald ring)
const activePips = computed(() => myPips.value.filter(p => ['ACTIVE', 'EXTENDED'].includes(p.status)))
const pipObjFrac = (p) => {
  const objs = p.objectives || []
  if (!objs.length) return 0
  return objs.filter(o => o.status === 'MET').length / objs.length
}
const improvePct = computed(() => {
  if (!activePips.value.length) return 100   // on standing → ring reads complete
  const fr = activePips.value.map(pipObjFrac)
  return Math.round(fr.reduce((a, b) => a + b, 0) / fr.length * 100)
})
const improveState = computed(() => pipToAck.value ? 'ack' : activePips.value.length ? 'active' : 'clear')
const improveTone = computed(() => improveState.value === 'ack' ? 'var(--perf-conflict)' : improveState.value === 'active' ? 'var(--perf-amber)' : 'var(--perf-ok)')
const improveHeadline = computed(() => improveState.value === 'ack' ? 'Acknowledge' : improveState.value === 'active' ? `${improvePct.value}%` : 'On standing')
const improveSub = computed(() => improveState.value === 'ack'
  ? `${pipToAck.value} plan${pipToAck.value > 1 ? 's' : ''} to acknowledge`
  : improveState.value === 'active' ? `${activePips.value.length} active · objectives met` : 'No active plan')
const improvePips = computed(() => {
  const p = activePips.value[0]
  if (!p) return []
  return (p.objectives || []).slice(0, 12).map((o, i) => ({ id: o.id || i, met: o.status === 'MET' }))
})

// the activity-ring instrument descriptors (outer → inner)
const rings = computed(() => [
  {
    key: 'goals', label: 'Goals & OKRs', icon: Target, tone: 'var(--perf-gold)',
    pct: myGoals.value.length ? goalsAvg.value : 0,
    valueText: myGoals.value.length ? goalsAvg.value + '%' : '—',
    sub: myGoals.value.length ? `${myGoals.value.length} active · ${goalsOnTrack.value} on track` : 'Set your first goal',
    alert: goalsAtRisk.value > 0,
  },
  {
    key: 'feedback', label: 'Feedback to give', icon: Orbit, tone: 'var(--perf-orange)',
    pct: feedbackPct.value,
    valueText: feedbackTotal.value ? (feedbackPending.value ? feedbackPending.value + ' to give' : 'Complete') : 'None',
    sub: feedbackTotal.value ? `${feedbackDone.value}/${feedbackTotal.value} given` : 'No requests',
    alert: feedbackPending.value > 0,
  },
  {
    key: 'pip', label: 'Improvement', icon: LifeBuoy, tone: improveTone.value,
    pct: improvePct.value,
    valueText: improveHeadline.value,
    sub: improveSub.value,
    alert: improveState.value === 'ack',
  },
])

// center readout + lead pill — how many growth actions are waiting on the employee
const growthActions = computed(() => feedbackPending.value + pipToAck.value + goalsAtRisk.value)
const focusObj = computed(() => ({ count: growthActions.value, label: growthActions.value === 1 ? 'needs you' : 'need you' }))
const focusPill = computed(() => {
  if (unlinked.value || !growthActions.value) return null
  const parts = []
  if (feedbackPending.value) parts.push(`${feedbackPending.value} feedback`)
  if (pipToAck.value) parts.push(`${pipToAck.value} plan to acknowledge`)
  if (goalsAtRisk.value) parts.push(`${goalsAtRisk.value} goal${goalsAtRisk.value > 1 ? 's' : ''} at risk`)
  const n = growthActions.value
  return { icon: Sparkles, title: `${n} ${n === 1 ? 'action needs' : 'actions need'} you`, detail: parts.join(' · ') }
})

// smooth-scroll a hero ring/lens click down to the matching section
function goTo(name) {
  const el = document.querySelector(`[data-ssp-anchor="${name}"]`)
  if (el) el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
}

async function hydrateMe() {
  try { me.value = (await axios.get(`${API}/auth/me`, { headers: authHeader() })).data } catch { /* fall back to review-derived name */ }
}

async function load() {
  loading.value = true
  try {
    const mine = await fetchMyReviews()
    unlinked.value = !!mine.unlinked
    myReviews.value = mine.items || []
    summary.value = mine.summary || {}
    // User-scoped duties resolve regardless of employee linkage — 360° nomination and
    // team management key on the login (reviewer_user_id / manager id), NOT a linked
    // employee record, so a manager/rater with no profile must still see them.
    try { const team = await fetchTeamReviews(); teamCount.value = (team.items || []).length; teamPending.value = (team.counts?.to_score || 0) } catch { /* not a manager */ }
    try {
      const f = await fetchMyFeedbackToGive()
      // team-relationship duties (rating your direct reports) now live on Team Performance;
      // keep only personal rater duties (self / peer / upward / external) on this page.
      const personal = (f.items || []).filter(it => !['MANAGER', 'SKIP_LEVEL'].includes((it.relationship_type || '').toUpperCase()))
      feedbackToGive.value = personal
      feedbackPending.value = personal.filter(it => it.status === 'PENDING').length
    } catch { feedbackToGive.value = []; feedbackPending.value = 0 }
    if (!unlinked.value) { try { const g = await fetchMyGoals(); myGoals.value = g.items || [] } catch { myGoals.value = [] } }
    if (!unlinked.value) { try { const pp = await fetchMyPips(); myPips.value = pp.items || [] } catch { myPips.value = [] } }
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load your performance') }
  finally { loading.value = false }
}

const drawerOpen = ref(false)
const selected = ref(null)
const openSelf = (r) => { selected.value = r; drawerOpen.value = true }
function onMutated() { load() }

// improvement plan (employee read + acknowledge)
const pipDrawerOpen = ref(false)
const pipSelected = ref(null)
const openPip = (p) => { pipSelected.value = p; pipDrawerOpen.value = true }

// goal check-in (self)
const checkInOpen = ref(false)
const checkInGoal = ref(null)
const savingCheckIn = ref(false)
const openCheckIn = (g) => { checkInGoal.value = g; checkInOpen.value = true }
async function onCheckIn(payload) {
  savingCheckIn.value = true
  try { await myGoalCheckIn(checkInGoal.value.id, payload); toast.success('Progress logged'); checkInOpen.value = false; await load() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Check-in failed') }
  finally { savingCheckIn.value = false }
}

// 360 feedback to give
const feedbackOpen = ref(false)
const feedbackReq = ref(null)
const openFeedback = (f) => { feedbackReq.value = f; feedbackOpen.value = true }
function onFeedbackDone() { feedbackOpen.value = false; load() }

onMounted(() => { hydrateMe(); load() })
</script>

<style scoped>
.ssp { position: relative; isolation: isolate; display: flex; flex-direction: column; gap: 20px; color: var(--perf-text); }
.ssp > * { position: relative; z-index: 1; }

/* ── full-page ambient backdrop ── */
.ssp .ssp-backdrop { position: fixed; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; }
.ssp-bd-aurora { position: absolute; border-radius: 50%; filter: blur(82px); opacity: 0.5; will-change: transform; }
.ssp-bd-aurora.a { width: 520px; height: 520px; top: -190px; left: 28%; background: radial-gradient(circle, color-mix(in srgb, var(--perf-gold) 42%, transparent), transparent 65%); animation: ssp-bd-a 23s ease-in-out infinite; }
.ssp-bd-aurora.b { width: 460px; height: 460px; bottom: -180px; right: -120px; background: radial-gradient(circle, color-mix(in srgb, var(--perf-orange) 40%, transparent), transparent 65%); animation: ssp-bd-b 27s ease-in-out infinite; }
.ssp-bd-aurora.c { width: 380px; height: 380px; top: 42%; left: -130px; background: radial-gradient(circle, color-mix(in srgb, var(--perf-ember) 30%, transparent), transparent 65%); animation: ssp-bd-c 30s ease-in-out infinite; }
.ssp-bd-grid { position: absolute; inset: 0; background-image: radial-gradient(color-mix(in srgb, var(--perf-gold) 8%, transparent) 1px, transparent 1px); background-size: 23px 23px; mask-image: linear-gradient(180deg, rgba(0,0,0,0.5), transparent 72%); }
.ssp-bd-scan { position: absolute; left: 0; right: 0; height: 150px; background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--perf-gold) 9%, transparent), transparent); filter: blur(22px); animation: ssp-bd-scan 11s linear infinite; }
@keyframes ssp-bd-a { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-30px,40px) scale(1.08); } }
@keyframes ssp-bd-b { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px,-30px) scale(1.1); } }
@keyframes ssp-bd-c { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(22px,20px) scale(0.95); } }
@keyframes ssp-bd-scan { 0% { transform: translateY(-30%); opacity: 0; } 10% { opacity: 0.8; } 90% { opacity: 0.8; } 100% { transform: translateY(120vh); opacity: 0; } }

/* ── rich glass section panel ── */
.ssp-panel { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 16px; padding: 20px 22px 22px; border-radius: 22px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--perf-surface) 92%, transparent), var(--perf-panel)); border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow); }
.ssp-panel::before { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 1px; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--perf-gold) 45%, transparent), transparent); }
.ssp-ph { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.ssp-ph-l { min-width: 0; }
.ssp-ph-eye { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: var(--perf-gold); }
.ssp-ph-eye.green { color: var(--perf-ok); }
.ssp-ph-eye.amber { color: var(--perf-amber); }
.ssp-panel.ssp-pip::before { background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--perf-amber) 50%, transparent), transparent); }
.ssp-ph-title { margin: 6px 0 3px; font-size: clamp(18px, 2.4vw, 23px); font-weight: 850; letter-spacing: -0.02em; color: var(--perf-text); }
.ssp-ph-sub { font-size: 12px; color: var(--perf-text-muted); }
.ssp-ph-badge { flex-shrink: 0; font-size: 11px; font-weight: 800; padding: 5px 12px; border-radius: 999px; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 13%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 26%, transparent); }
.ssp-ph-badge.green { color: var(--perf-ok); background: var(--perf-ok-soft); border-color: color-mix(in srgb, var(--perf-ok) 28%, transparent); }
.ssp-ph-badge.alert { color: var(--perf-orange); background: color-mix(in srgb, var(--perf-orange) 13%, transparent); border-color: color-mix(in srgb, var(--perf-orange) 28%, transparent); }
.ssp-panel-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; padding: 40px 24px; border-radius: 16px; background: var(--perf-panel); border: 1px dashed var(--perf-border-strong); }
.ssp-pe-ic { display: grid; place-items: center; width: 54px; height: 54px; border-radius: 16px; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 11%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 24%, transparent); }
.ssp-panel-empty b { font-size: 14px; font-weight: 850; color: var(--perf-text); }
.ssp-panel-empty p { margin: 0; font-size: 12px; color: var(--perf-text-muted); max-width: 44ch; line-height: 1.55; }

/* ── entrance ── */
.ssp-rise { animation: ssp-rise 0.5s var(--perf-spring) backwards; }
@keyframes ssp-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }

/* ── command-deck hero ── */
.ssp-hero { position: relative; overflow: hidden; border-radius: 26px; border: 1px solid var(--perf-border); background: var(--perf-surface); }
.ssp-edge { position: absolute; top: 0; left: 0; right: 0; height: 3px; z-index: 2;
  background: linear-gradient(90deg, transparent, var(--perf-gold), var(--perf-orange), var(--perf-gold), transparent); background-size: 200% 100%; animation: ssp-edge 5s linear infinite; }
.ssp-hero-bg { position: absolute; inset: 0; pointer-events: none; transition: transform 0.4s var(--perf-ease); will-change: transform; }
.ssp-mesh { position: absolute; inset: -10%;
  background:
    radial-gradient(38% 50% at 82% 8%, color-mix(in srgb, var(--perf-orange) 22%, transparent), transparent 70%),
    radial-gradient(40% 55% at 12% 92%, color-mix(in srgb, var(--perf-gold) 18%, transparent), transparent 72%);
  animation: ssp-mesh 20s var(--perf-ease) infinite alternate; }
.ssp-orb { position: absolute; border-radius: 50%; filter: blur(64px); }
.ssp-orb.o1 { width: 340px; height: 340px; top: -130px; right: -40px; background: radial-gradient(circle, color-mix(in srgb, var(--perf-orange) 48%, transparent), transparent 70%); opacity: 0.5; animation: ssp-drift 18s var(--perf-ease) infinite alternate; }
.ssp-orb.o2 { width: 300px; height: 300px; bottom: -150px; left: 8%; background: radial-gradient(circle, color-mix(in srgb, var(--perf-gold) 48%, transparent), transparent 70%); opacity: 0.4; animation: ssp-drift 24s var(--perf-ease) infinite alternate-reverse; }
.ssp-orb.o3 { width: 200px; height: 200px; top: 36%; left: 46%; background: radial-gradient(circle, color-mix(in srgb, var(--perf-ember) 40%, transparent), transparent 70%); opacity: 0.28; animation: ssp-drift 21s var(--perf-ease) infinite alternate; }
.ssp-hgrid { position: absolute; inset: 0; opacity: 0.4; background-image: linear-gradient(var(--perf-border) 1px, transparent 1px), linear-gradient(90deg, var(--perf-border) 1px, transparent 1px); background-size: 46px 46px; mask-image: radial-gradient(circle at 76% 12%, #000, transparent 78%); }
.ssp-scan { position: absolute; left: 0; right: 0; height: 2px; top: 0; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--perf-gold) 50%, transparent), transparent); animation: ssp-scan 9s linear infinite; }

.ssp-hero-in { position: relative; z-index: 1; padding: 22px 24px; display: flex; flex-direction: column; gap: 18px; }
.ssp-lead { max-width: 82ch; }
.ssp-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.09em; text-transform: uppercase; color: var(--perf-gold); }
.ssp-eyebrow-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--perf-gold); box-shadow: 0 0 10px var(--perf-gold); animation: ssp-pulse 2s ease-in-out infinite; }
.ssp-title { margin: 8px 0 6px; font-size: clamp(23px, 3.4vw, 34px); font-weight: 850; letter-spacing: -0.02em; line-height: 1.08; }
.ssp-accent { background: var(--perf-grad-hero); -webkit-background-clip: text; background-clip: text; color: transparent; }
.ssp-sub { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--perf-text-muted); }
.ssp-whoami { display: inline-flex; align-items: center; gap: 10px; margin-top: 13px; padding: 7px 14px 7px 7px; border-radius: 999px; background: var(--perf-glass); border: 1px solid var(--perf-border); }
.ssp-whoami-av { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; font-size: 12px; font-weight: 850; color: #1a1206; background: var(--perf-grad-hero); }
.ssp-whoami-txt { display: flex; flex-direction: column; line-height: 1.25; }
.ssp-whoami-txt b { font-size: 12.5px; font-weight: 800; color: var(--perf-text); }
.ssp-whoami-txt em { font-size: 10.5px; font-style: normal; color: var(--perf-text-muted); }

/* current-cycle status pill (review in flight, not yet on the employee) */
.ssp-cycle { display: inline-flex; align-items: center; gap: 11px; margin-top: 11px; padding: 9px 14px 9px 10px; border-radius: 14px;
  background: color-mix(in srgb, var(--perf-orange) 9%, var(--perf-glass));
  border: 1px solid color-mix(in srgb, var(--perf-orange) 26%, transparent); }
.ssp-cycle-ic { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0;
  color: var(--perf-orange); background: color-mix(in srgb, var(--perf-orange) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--perf-orange) 28%, transparent); }
.ssp-cycle-txt { display: flex; flex-direction: column; line-height: 1.25; min-width: 0; }
.ssp-cycle-txt b { font-size: 12.5px; font-weight: 800; color: var(--perf-text); }
.ssp-cycle-txt em { font-size: 10.5px; font-style: normal; color: var(--perf-text-muted); }
.ssp-cycle-live { margin-left: 5px; display: inline-flex; align-items: center; gap: 6px; font-size: 9px; font-weight: 850; letter-spacing: 0.12em; text-transform: uppercase; color: var(--perf-orange); }
.ssp-cycle-live::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--perf-orange); box-shadow: 0 0 8px var(--perf-orange); animation: ssp-pulse 1.6s ease-in-out infinite; }

/* instrument bento: momentum rings + the three domain lenses */
.ssp-bento { display: grid; grid-template-columns: minmax(280px, 344px) minmax(0, 1fr); gap: 14px; align-items: stretch; }
.ssp-rings { width: 100%; }
.ssp-lenses { display: grid; grid-template-rows: repeat(3, 1fr); gap: 10px; min-width: 0; }
@media (max-width: 820px) { .ssp-bento { grid-template-columns: 1fr; } }

/* domain lens card — color-keyed to its matching ring (--lc) */
.ssp-lens { position: relative; overflow: hidden; display: grid; grid-template-columns: auto 1fr; grid-template-rows: auto auto; gap: 6px 13px; align-items: center;
  padding: 13px 15px; border-radius: 16px; cursor: pointer; text-align: left; font: inherit; --lc: var(--perf-gold);
  background: var(--perf-glass); border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow);
  transition: border-color 0.22s, box-shadow 0.25s; }
.ssp-lens:hover { border-color: color-mix(in srgb, var(--lc) 42%, transparent); box-shadow: var(--perf-card-shadow-hover); }
.ssp-lens::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--lc); opacity: 0.85; }
.ssp-lens-glow { position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.3s;
  background: radial-gradient(130% 100% at 0% 0%, color-mix(in srgb, var(--lc) 13%, transparent), transparent 58%); }
.ssp-lens:hover .ssp-lens-glow { opacity: 1; }
.ssp-lens-h { grid-column: 1 / -1; display: flex; align-items: center; gap: 9px; }
.ssp-lens-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0; color: var(--lc);
  background: color-mix(in srgb, var(--lc) 14%, transparent); border: 1px solid color-mix(in srgb, var(--lc) 28%, transparent); }
.ssp-lens-t { flex: 1; min-width: 0; font-size: 12px; font-weight: 800; letter-spacing: 0.01em; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ssp-lens-go { color: var(--perf-text-dim); flex-shrink: 0; transition: transform 0.2s, color 0.2s; }
.ssp-lens:hover .ssp-lens-go { color: var(--lc); transform: translateX(3px); }
.ssp-lens-main { grid-column: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.ssp-lens-val { font-size: 24px; font-weight: 850; line-height: 1; color: var(--perf-text); font-variant-numeric: tabular-nums; white-space: nowrap; }
.ssp-lens-val--txt { font-size: 17px; }
.ssp-lens-unit, .ssp-lens-dash { font-size: 11px; font-weight: 650; font-style: normal; color: var(--perf-text-muted); }
.ssp-lens-sub { font-size: 10.5px; color: var(--perf-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ssp-lens-chip { grid-column: 1 / -1; justify-self: start; display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px;
  font-size: 10px; font-weight: 800; letter-spacing: 0.02em; }
.ssp-lens-chip.ok { color: var(--perf-ok); background: var(--perf-ok-soft); }
.ssp-lens-chip.warn { color: var(--perf-orange); background: color-mix(in srgb, var(--perf-orange) 13%, transparent); }
.ssp-lens-chip.danger { color: var(--perf-conflict); background: var(--perf-conflict-soft); }

/* mini-visuals — distinct per domain */
.ssp-lens-bars { grid-column: 2; grid-row: 2; display: flex; align-items: flex-end; justify-content: flex-end; gap: 3px; height: 34px; }
.ssp-lens-bar { width: 7px; height: 100%; display: flex; align-items: flex-end; border-radius: 3px; background: var(--perf-track); overflow: hidden; }
.ssp-lens-bar i { display: block; width: 100%; border-radius: 3px; transition: height 0.9s var(--perf-spring); }
.ssp-lens-dots { grid-column: 2; grid-row: 2; display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 5px; }
.ssp-lens-dot { width: 9px; height: 9px; border-radius: 50%; }
.ssp-lens-dot.done { background: var(--lc); box-shadow: 0 0 6px color-mix(in srgb, var(--lc) 60%, transparent); }
.ssp-lens-dot.pend { background: transparent; border: 1.5px solid color-mix(in srgb, var(--lc) 55%, transparent); animation: ssp-pulse 2s ease-in-out infinite; }
.ssp-lens-pips { grid-column: 2; grid-row: 2; display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 4px; }
.ssp-lens-pip { width: 14px; height: 6px; border-radius: 3px; background: var(--perf-track); }
.ssp-lens-pip.met { background: var(--lc); box-shadow: 0 0 6px color-mix(in srgb, var(--lc) 55%, transparent); }
.ssp-lens-clear { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 650; color: var(--perf-ok); text-align: right; }
.ssp-lens-mini-empty { font-size: 9.5px; line-height: 1.4; color: var(--perf-text-dim); text-align: right; max-width: 16ch; }

@keyframes ssp-edge { to { background-position: 200% 0; } }
@keyframes ssp-mesh { from { transform: translate(0,0) scale(1); } to { transform: translate(-18px, 14px) scale(1.05); } }
@keyframes ssp-drift { from { transform: translate(0,0); } to { transform: translate(-30px, 22px); } }
@keyframes ssp-scan { 0% { top: 0; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
@keyframes ssp-pulse { 0%,100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.3); } }

.ssp-load { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 50px; color: var(--perf-text-muted); font-size: 13px; }
.ssp-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 9px; padding: 56px 24px; border-radius: 18px; background: var(--perf-surface); border: 1px dashed var(--perf-border-strong); }
.ssp-empty.soft { padding: 26px 24px; }
.ssp-empty-ic { display: grid; place-items: center; width: 60px; height: 60px; border-radius: 18px; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 12%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 26%, transparent); }
.ssp-empty b { font-size: 15px; font-weight: 800; color: var(--perf-text); margin-top: 4px; }
.ssp-empty p { margin: 0; font-size: 12.5px; color: var(--perf-text-muted); max-width: 40ch; line-height: 1.5; }

/* action banners */
.ssp-action { display: flex; align-items: center; gap: 10px; padding: 12px 15px; border-radius: 13px; font-size: 12.5px; color: var(--perf-text-secondary);
  background: color-mix(in srgb, var(--perf-gold) 9%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 24%, transparent); }
.ssp-action.ack { background: var(--perf-ok-soft); border-color: color-mix(in srgb, var(--perf-ok) 28%, transparent); }
.ssp-action-ic { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 14%, transparent); }
.ssp-action.ack .ssp-action-ic { color: var(--perf-ok); background: var(--perf-ok-soft); }
.ssp-action b { color: var(--perf-text); }

.ssp-mgr-cta { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 15px; text-decoration: none;
  background: var(--perf-surface); border: 1px solid var(--perf-border-warm); transition: transform 0.2s var(--perf-spring), border-color 0.2s, box-shadow 0.25s; }
.ssp-mgr-cta:hover { transform: translateY(-2px); border-color: var(--perf-orange); box-shadow: var(--perf-card-shadow-hover); }
.ssp-mgr-ic { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0; color: #1a1206; background: var(--perf-grad-hero); }
.ssp-mgr-cta > div { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.ssp-mgr-cta b { font-size: 13.5px; font-weight: 800; color: var(--perf-text); }
.ssp-mgr-cta > div span { font-size: 11.5px; color: var(--perf-text-muted); }
.ssp-mgr-go { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 750; color: var(--perf-orange); flex-shrink: 0; }

/* ── feedback cards ── */
.ssp-fb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(258px, 1fr)); gap: 12px; }
.ssp-fb { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 12px; padding: 14px 15px; border-radius: 16px; cursor: pointer; text-align: left; font: inherit;
  background: var(--perf-surface); border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow); transition: border-color 0.22s, box-shadow 0.25s; }
.ssp-fb:hover { border-color: var(--perf-border-warm); box-shadow: var(--perf-card-shadow-hover); }
.ssp-fb-glow { position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.3s; background: radial-gradient(120% 90% at 100% 0%, color-mix(in srgb, var(--perf-gold) 12%, transparent), transparent 60%); }
.ssp-fb:hover .ssp-fb-glow { opacity: 1; }
.ssp-fb.done { opacity: 0.85; }
.ssp-fb.declined { opacity: 0.68; }
.ssp-fb-rel { position: relative; z-index: 1; align-self: flex-start; font-size: 9px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; padding: 3px 9px; border-radius: 999px;
  color: var(--rc); background: color-mix(in srgb, var(--rc) 14%, transparent); border: 1px solid color-mix(in srgb, var(--rc) 28%, transparent); }
.ssp-fb-row { position: relative; z-index: 1; display: flex; align-items: center; gap: 11px; }
.ssp-fb-av { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; font-size: 13px; font-weight: 850; color: #1a1206;
  background: linear-gradient(135deg, color-mix(in srgb, var(--rc) 86%, #fff), var(--rc)); box-shadow: 0 0 0 3px color-mix(in srgb, var(--rc) 20%, transparent); }
.ssp-fb-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ssp-fb-txt b { font-size: 13.5px; font-weight: 800; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ssp-fb-txt span { font-size: 10.5px; color: var(--perf-text-muted); }
.ssp-fb-cta { position: relative; z-index: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; border-radius: 10px; font-size: 11.5px; font-weight: 750; color: #1a1206; background: var(--perf-grad-hero); }
.ssp-fb-cta.done { color: var(--perf-ok); background: var(--perf-ok-soft); }
.ssp-fb-cta.declined { color: var(--perf-text-muted); background: var(--perf-unset-soft); }

/* ── reviews grid ── */
.ssp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(252px, 1fr)); gap: 13px; }

/* ── goals ── */
.ssp-goals { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 13px; }
.ssp-goal { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 12px; padding: 16px 16px 16px 19px; border-radius: 16px; background: var(--perf-surface); border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow); transition: border-color 0.22s, box-shadow 0.25s, transform 0.22s var(--perf-spring); }
.ssp-goal:hover { transform: translateY(-2px); border-color: var(--perf-border-warm); box-shadow: var(--perf-card-shadow-hover); }
.ssp-goal-spine { position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px; border-radius: 0 3px 3px 0; }
.ssp-goal-head { display: flex; align-items: center; gap: 13px; }
.ssp-goal-ring { position: relative; display: grid; place-items: center; width: 50px; height: 50px; border-radius: 50%; flex-shrink: 0;
  background: conic-gradient(var(--c) var(--perf-p, 0deg), var(--perf-track) 0); transition: --perf-p 0.9s var(--perf-spring); filter: drop-shadow(0 0 8px color-mix(in srgb, var(--c) 28%, transparent)); }
.ssp-goal-ring::after { content: ''; position: absolute; inset: 4px; border-radius: 50%; background: var(--perf-surface); }
.ssp-goal-ring span { position: relative; z-index: 1; font-size: 14px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; }
.ssp-goal-ring span i { font-size: 8px; font-style: normal; font-weight: 600; color: var(--perf-text-muted); }
.ssp-goal-id { min-width: 0; flex: 1; }
.ssp-goal-type { display: inline-block; font-size: 9px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; padding: 2px 8px; border-radius: 999px; margin-bottom: 5px; }
.ssp-goal-type.obj { color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 14%, transparent); }
.ssp-goal-type.goal { color: var(--perf-amber); background: color-mix(in srgb, var(--perf-amber) 14%, transparent); }
.ssp-goal-id b { display: block; font-size: 13.5px; font-weight: 800; color: var(--perf-text); line-height: 1.3; }
.ssp-krs { display: flex; flex-direction: column; gap: 7px; }
.ssp-kr { display: flex; align-items: center; gap: 9px; }
.ssp-kr-title { flex: 1; min-width: 0; font-size: 11.5px; color: var(--perf-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ssp-kr-track { width: 72px; height: 5px; border-radius: 999px; background: var(--perf-track); overflow: hidden; flex-shrink: 0; }
.ssp-kr-track i { display: block; height: 100%; border-radius: 999px; transition: width 0.9s var(--perf-spring); }
.ssp-kr-btn { width: 27px; height: 27px; flex-shrink: 0; border-radius: 8px; display: grid; place-items: center; cursor: pointer; color: var(--perf-text-muted); background: var(--perf-surface-elevated); border: 1px solid var(--perf-border); transition: all 0.18s; }
.ssp-kr-btn:hover { color: var(--perf-ok); border-color: color-mix(in srgb, var(--perf-ok) 40%, transparent); }
.ssp-goal-checkin { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; padding: 7px 13px; border-radius: 9px; cursor: pointer; font: inherit; font-size: 11.5px; font-weight: 650; color: var(--perf-ok); background: var(--perf-ok-soft); border: 1px solid color-mix(in srgb, var(--perf-ok) 30%, transparent); transition: all 0.18s; }
.ssp-goal-checkin:hover { background: color-mix(in srgb, var(--perf-ok) 20%, transparent); }

/* transitions */
.ssp-pop-enter-active { transition: opacity 0.4s var(--perf-spring), transform 0.4s var(--perf-spring); }
.ssp-pop-enter-from { opacity: 0; transform: translateY(-8px); }

.ssp[data-reduced="true"] .ssp-edge, .ssp[data-reduced="true"] .ssp-mesh, .ssp[data-reduced="true"] .ssp-orb, .ssp[data-reduced="true"] .ssp-scan, .ssp[data-reduced="true"] .ssp-eyebrow-dot, .ssp[data-reduced="true"] .ssp-rise,
.ssp[data-reduced="true"] .ssp-bd-aurora, .ssp[data-reduced="true"] .ssp-bd-scan,
.ssp[data-reduced="true"] .ssp-cycle-live::before, .ssp[data-reduced="true"] .ssp-lens-dot.pend { animation: none; }
.ssp[data-reduced="true"] .ssp-hero-bg { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .ssp-edge, .ssp-mesh, .ssp-orb, .ssp-scan, .ssp-eyebrow-dot, .ssp-rise, .ssp-bd-aurora, .ssp-bd-scan, .ssp-cycle-live::before, .ssp-lens-dot.pend { animation: none; }
  .ssp-hero-bg { transition: none; }
  .ssp-mgr-cta:hover, .ssp-fb:hover, .ssp-goal:hover { transform: none; }
  .ssp-kr-track i, .ssp-goal-ring, .ssp-lens-bar i { transition: none; }
}
</style>
