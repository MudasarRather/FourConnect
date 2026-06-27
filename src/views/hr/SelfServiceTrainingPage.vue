<template>
  <div class="sst-root" ref="rootRef">
    <!-- ── ambient backdrop ── -->
    <div class="sst-atmos" aria-hidden="true">
      <span class="sst-orb o1" /><span class="sst-orb o2" /><span class="sst-orb o3" />
      <span class="sst-grid" />
      <span class="trn-grain" />
    </div>

    <!-- ── loading skeleton ── -->
    <div v-if="loading" class="sst-load">
      <div class="trn-skel" style="height: 440px; border-radius: 28px" />
      <div class="sst-load-row">
        <div class="trn-skel" style="height: 320px; border-radius: 20px" />
        <div class="trn-skel" style="height: 320px; border-radius: 20px" />
      </div>
    </div>

    <!-- ── unlinked empty state ── -->
    <template v-else-if="unlinked">
      <Motion as="div" class="sst-unlinked" :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
        <div class="ul-orb" aria-hidden="true">
          <span class="ul-ring r1" /><span class="ul-ring r2" />
          <Telescope :size="30" />
        </div>
        <h2>Not in orbit yet</h2>
        <p>Your account isn't linked to an employee profile yet — ask HR to connect it, and your learning universe will light up here.</p>
        <span class="ul-tag"><AlertCircle :size="14" /> Contact HR to get connected</span>
      </Motion>
    </template>

    <!-- ── the learning universe ── -->
    <template v-else>
      <!-- a) HERO -->
      <SstHero :summary="s" :completion-pct="completionPct" :status-counts="statusCounts"
        :name="currentUserName" :greeting="greeting"
        @request="openReqModal" @go="scrollTo" />

      <!-- b) BENTO: journey + snapshot -->
      <section class="sst-bento">
        <!-- LEFT: my learning journey -->
        <div class="bento-main" ref="trainingsRef">
          <Motion as="div" class="block-head" v-bind="reveal(0)">
            <div class="bh-left">
              <span class="bh-eyebrow trn-mono"><Rocket :size="12" /> THE MISSION TRACK</span>
              <h3>My learning journey</h3>
            </div>
            <span class="bh-meta trn-mono">{{ trainings.length }} assigned</span>
          </Motion>

          <TrnEmptyState v-if="!trainings.length" :icon="BookOpen" title="No trainings assigned yet"
            sub="When HR enrolls you in a program — or fulfils a request — it lands here, ready to launch." />

          <div v-else class="journey">
            <Motion v-for="(t, i) in trainings" :key="t.id" as="div" class="j-row"
              :initial="{ opacity: 0, x: -16 }" :animate="{ opacity: 1, x: 0 }"
              :transition="{ duration: 0.45, delay: Math.min(i * 0.05, 0.4), ease: [0.16, 1, 0.3, 1] }">
              <span class="j-node" :class="nodeClass(t)" aria-hidden="true" />
              <Motion as="article" class="j-card" :whileHover="reduced ? {} : { y: -3 }">
                <span class="j-spot trn-spotlight" aria-hidden="true" />
                <div class="j-main">
                  <div class="j-top">
                    <h4>{{ t.program_name || 'Training program' }}</h4>
                    <span v-if="t.program_type" class="j-type">{{ typeLabel(t.program_type) }}</span>
                  </div>
                  <div class="j-prog">
                    <SstSegProgress :pct="progressPct(t)" :color="statusColor(t)" :segments="16" />
                    <span class="j-pct trn-mono" :style="{ color: statusColor(t) }">{{ progressPct(t) }}%</span>
                  </div>
                  <div class="j-meta">
                    <TrnStatusStamp :status="t.status || 'NOT_STARTED'" kind="assignment" />
                    <span v-if="t.due_date && t.status !== 'COMPLETED'" class="j-pill" :class="{ overdue: isOverdue(t), soon: isSoon(t) }">
                      <CalendarClock :size="11" /> {{ dueLabel(t) }}
                    </span>
                    <span v-if="t.completion_date" class="j-pill ok"><CheckCircle2 :size="11" /> Done {{ fmtDate(t.completion_date) }}</span>
                    <span v-if="t.score != null" class="j-pill"><Gauge :size="11" /> {{ t.score }}</span>
                  </div>
                </div>
                <div class="j-acts">
                  <Motion v-if="t.status === 'NOT_STARTED'" as="button" class="trn-btn trn-btn-primary sm" :disabled="busyId === t.id"
                    :whileTap="{ scale: 0.95 }" @click="setProgress(t, 'IN_PROGRESS')"><Play :size="13" /> Start</Motion>
                  <Motion v-if="t.status === 'NOT_STARTED' || t.status === 'IN_PROGRESS'" as="button" class="trn-btn trn-btn-ghost sm"
                    :disabled="busyId === t.id" :whileTap="{ scale: 0.95 }" @click="setProgress(t, 'COMPLETED')"><Check :size="13" /> Mark complete</Motion>
                  <Motion v-if="t.status === 'COMPLETED' && !t.feedback_submitted" as="button" class="trn-btn trn-btn-ghost sm"
                    :whileTap="{ scale: 0.95 }" @click="openFeedback(t)"><Star :size="13" /> Give feedback</Motion>
                  <span v-else-if="t.status === 'COMPLETED'" class="j-rated"><Star :size="12" :fill="'currentColor'" /> Rated</span>
                </div>
              </Motion>
            </Motion>
          </div>
        </div>

        <!-- RIGHT: growth snapshot -->
        <Motion as="aside" class="bento-side" v-bind="reveal(1)">
          <div class="snap-head">
            <span class="bh-eyebrow trn-mono"><Activity :size="12" /> GROWTH SNAPSHOT</span>
            <h3>Where you stand</h3>
          </div>
          <div class="snap-orbit">
            <SstMultiRing :rings="snapRings" :size="150" :stroke="9" :gap="6"
              :center="{ value: completionPct, suffix: '%', label: 'complete' }" />
          </div>
          <div class="snap-stats">
            <div class="snap-stat"><span class="ss-ic ok"><Target :size="14" /></span>
              <span class="ss-v"><TrnCountUp :value="skillsAtTarget" /></span><span class="ss-l">Skills at target</span></div>
            <div class="snap-stat"><span class="ss-ic"><Award :size="14" /></span>
              <span class="ss-v"><TrnCountUp :value="Number(s.certifications_active) || 0" /></span><span class="ss-l">Certs active</span></div>
            <div class="snap-stat"><span class="ss-ic warn"><Grid3x3 :size="14" /></span>
              <span class="ss-v"><TrnCountUp :value="avgGapDisplay" :decimals="avgGapDecimals" /></span><span class="ss-l">Avg skill gap</span></div>
            <div class="snap-stat"><span class="ss-ic ember"><Inbox :size="14" /></span>
              <span class="ss-v"><TrnCountUp :value="Number(s.pending_requests) || 0" /></span><span class="ss-l">Open requests</span></div>
          </div>
          <div v-if="nextDue" class="snap-next" :class="{ overdue: isOverdue(nextDue) }">
            <span class="sn-eyebrow"><CalendarClock :size="12" /> {{ isOverdue(nextDue) ? 'Overdue' : 'Next due' }}</span>
            <span class="sn-name">{{ nextDue.program_name }}</span>
            <span class="sn-date">{{ dueLabel(nextDue) }}</span>
          </div>
          <div v-else class="snap-clear"><CheckCircle2 :size="15" /> Nothing due — you're all caught up.</div>
        </Motion>
      </section>

      <!-- c) SKILLS -->
      <section class="sst-block" v-if="skills.length" ref="skillsRef">
        <Motion as="div" class="block-head" v-bind="reveal(0)">
          <div class="bh-left">
            <span class="bh-eyebrow trn-mono"><Grid3x3 :size="12" /> COMPETENCY CONSTELLATION</span>
            <h3>My skills</h3>
          </div>
          <span class="bh-meta trn-mono">{{ skills.length }} tracked · {{ skillsAtTarget }} at target</span>
        </Motion>
        <div class="skill-grid">
          <Motion v-for="(sk, i) in skills" :key="sk.id || sk.skill_id || i" as="div" class="skill-row"
            :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.4, delay: Math.min(i * 0.03, 0.3), ease: [0.16, 1, 0.3, 1] }">
            <div class="sk-head">
              <span class="sk-name">{{ sk.skill_name || sk.name || 'Skill' }}</span>
              <span class="sk-gap" :class="gapClass(sk)">
                <template v-if="gapOf(sk) > 0"><ArrowUpRight :size="11" /> {{ gapOf(sk) }} to target</template>
                <template v-else><Check :size="11" /> At target</template>
              </span>
            </div>
            <div class="sk-bar">
              <span class="sk-fill" :style="{ width: levelPct(sk) + '%' }" />
              <span v-if="reqPct(sk) != null" class="sk-marker" :style="{ left: reqPct(sk) + '%' }" :title="`Required: ${requiredOf(sk)}`" />
            </div>
            <span class="sk-scale trn-mono">{{ currentOf(sk) }} / {{ maxOf(sk) }}<i v-if="requiredOf(sk) != null"> · req {{ requiredOf(sk) }}</i></span>
          </Motion>
        </div>
      </section>

      <!-- d) CERTIFICATIONS -->
      <section class="sst-block" ref="certsRef">
        <Motion as="div" class="block-head" v-bind="reveal(0)">
          <div class="bh-left">
            <span class="bh-eyebrow trn-mono"><Award :size="12" /> CREDENTIAL VAULT</span>
            <h3>My certifications</h3>
          </div>
          <span class="bh-meta trn-mono">{{ certs.length }} held · issued by HR</span>
        </Motion>

        <TrnEmptyState v-if="!certs.length" :icon="Award" title="No certifications yet"
          sub="Credentials you earn — or that HR awards you — appear here automatically, tracked for renewal. To get one recognised, complete a certified training or ask HR." />

        <div v-else class="cert-grid">
          <Motion v-for="(c, i) in certs" :key="c.id" as="article" class="cert-card" :class="'st-' + certStatus(c).toLowerCase()"
            :initial="{ opacity: 0, y: 16, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
            :transition="{ duration: 0.45, delay: Math.min(i * 0.05, 0.4), ease: [0.16, 1, 0.3, 1] }"
            :whileHover="reduced ? {} : { y: -4 }">
            <span class="cert-spot trn-spotlight" aria-hidden="true" />
            <header class="cert-top">
              <span class="cert-seal"><Award :size="18" /></span>
              <TrnStatusStamp :status="certStatus(c)" kind="cert" />
            </header>
            <h4>{{ c.name || 'Certification' }}</h4>
            <p v-if="c.issuing_authority" class="cert-iss">{{ c.issuing_authority }}</p>
            <div class="cert-foot">
              <span v-if="c.expiry_date" class="cert-exp" :class="{ red: isExpired(c), warn: !isExpired(c) && (daysToExpiry(c) ?? 999) <= 90 }">
                <CalendarClock :size="12" />
                <template v-if="isExpired(c)">Expired {{ fmtDate(c.expiry_date) }}</template>
                <template v-else-if="daysToExpiry(c) != null">{{ daysToExpiry(c) }}d to expiry</template>
                <template v-else>Expires {{ fmtDate(c.expiry_date) }}</template>
              </span>
              <span v-else class="cert-exp"><Infinity :size="12" /> No expiry</span>
              <a v-if="c.certificate_url" class="cert-link" :href="certHref(c)" target="_blank" rel="noopener">
                <ExternalLink :size="12" /> View
              </a>
            </div>
          </Motion>
        </div>
      </section>

      <!-- e) REQUESTS -->
      <section class="sst-block" ref="requestsRef">
        <Motion as="div" class="block-head" v-bind="reveal(0)">
          <div class="bh-left">
            <span class="bh-eyebrow trn-mono"><Inbox :size="12" /> NOMINATIONS</span>
            <h3>My requests</h3>
          </div>
          <button class="trn-btn trn-btn-ghost sm" @click="openReqModal"><Plus :size="13" /> Request a training</button>
        </Motion>

        <TrnEmptyState v-if="!requests.length" :icon="Inbox" title="No training requests"
          sub="Found a course that would help you grow? Nominate yourself and HR will review it.">
          <button class="trn-btn trn-btn-primary" style="margin-top: 12px" @click="openReqModal"><Plus :size="14" /> Request a training</button>
        </TrnEmptyState>

        <div v-else class="req-list">
          <Motion v-for="(r, i) in requests" :key="r.id" as="article" class="req-card"
            :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.4, delay: Math.min(i * 0.05, 0.3), ease: [0.16, 1, 0.3, 1] }"
            :whileHover="reduced ? {} : { y: -2 }">
            <span class="req-spot trn-spotlight" aria-hidden="true" />
            <div class="req-main">
              <div class="req-top">
                <h4>{{ r.title || 'Training request' }}</h4>
                <span class="req-num trn-mono">{{ r.request_number }}</span>
              </div>
              <span class="req-src"><BookOpen :size="12" /> {{ r.program_name || r.external_provider || 'External / self-sourced' }}</span>
              <!-- approval chain stepper -->
              <div v-if="r.approval_steps && r.approval_steps.length" class="req-chain">
                <template v-for="(step, si) in r.approval_steps" :key="si">
                  <span class="rc-step" :class="stepClass(r, step, si)" :title="stepTitle(step)">
                    <component :is="stepIcon(step)" :size="11" />
                  </span>
                  <span v-if="si < r.approval_steps.length - 1" class="rc-conn" :class="{ done: si < r.current_step || isFinalApproved(r) }" />
                </template>
              </div>
            </div>
            <div class="req-side">
              <TrnStatusStamp :status="r.status || 'PENDING_APPROVAL'" kind="request" />
              <span v-if="r.estimated_cost != null" class="req-cost trn-mono">{{ fmtMoney(r.estimated_cost) }}</span>
              <Motion v-if="r.can_withdraw" as="button" class="trn-btn trn-btn-danger sm" :disabled="busyId === r.id"
                :whileTap="{ scale: 0.95 }" @click="openWithdraw(r)"><X :size="13" /> Withdraw</Motion>
            </div>
          </Motion>
        </div>
      </section>

      <!-- f) APPROVAL QUEUE (managers) -->
      <section class="sst-block" v-if="queue.length">
        <Motion as="div" class="block-head" v-bind="reveal(0)">
          <div class="bh-left">
            <span class="bh-eyebrow trn-mono q"><ClipboardCheck :size="12" /> AWAITING YOU</span>
            <h3>Awaiting your approval</h3>
          </div>
          <span class="bh-meta trn-mono">{{ queue.length }} pending</span>
        </Motion>
        <div class="q-list">
          <Motion v-for="(q, i) in queue" :key="q.id" as="article" class="q-card"
            :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.4, delay: Math.min(i * 0.05, 0.3), ease: [0.16, 1, 0.3, 1] }">
            <div class="q-main">
              <h4>{{ q.title || 'Training request' }}</h4>
              <span class="q-by">
                <CircleUser :size="12" /> {{ q.employee_name || 'Team member' }}
                <template v-if="q.program_name || q.external_provider"><i class="q-dot" />{{ q.program_name || q.external_provider }}</template>
                <template v-if="q.estimated_cost != null"><i class="q-dot" />{{ fmtMoney(q.estimated_cost) }}</template>
              </span>
              <p v-if="q.justification" class="q-just">“{{ q.justification }}”</p>
            </div>
            <div class="q-acts">
              <button class="trn-btn trn-btn-primary sm" :disabled="busyId === q.id" @click="decide(q, 'APPROVE')"><Check :size="13" /> Approve</button>
              <button class="trn-btn trn-btn-ghost sm" :disabled="busyId === q.id" @click="decide(q, 'RETURN')"><CornerUpLeft :size="13" /> Return</button>
              <button class="trn-btn trn-btn-danger sm" :disabled="busyId === q.id" @click="decide(q, 'REJECT')"><X :size="13" /> Reject</button>
            </div>
          </Motion>
        </div>
      </section>

      <!-- g) REPORTS FOUNDRY -->
      <section class="sst-block" v-if="reportsList.length" ref="reportsRef">
        <Motion as="div" class="block-head" v-bind="reveal(0)">
          <div class="bh-left">
            <span class="bh-eyebrow trn-mono"><FileBarChart2 :size="12" /> LEARNING RECORDS</span>
            <h3>Download my reports</h3>
          </div>
          <span class="bh-meta trn-mono">PDF · Excel · CSV</span>
        </Motion>
        <div class="rep-grid">
          <SstReportCard v-for="(rep, i) in reportsList" :key="rep.key" :report="rep" :index="i"
            :issue="'M' + (i + 1)" :busy="reportBusy.key === rep.key ? reportBusy.format : false"
            @download="downloadReport" />
        </div>
      </section>
    </template>

    <!-- ── feedback modal ── -->
    <TrnModal :open="fbModal.open" title="Rate this training" :subtitle="fbModal.programName" :icon="Star" @close="closeFeedback">
      <div class="fb-form">
        <div class="fb-rate-pick">
          <span class="fb-label">Your rating</span>
          <div class="star-pick" role="radiogroup" aria-label="Rating">
            <button v-for="n in 5" :key="n" type="button" class="sp-star" :class="{ on: n <= (fbHover || fbForm.rating) }"
              role="radio" :aria-checked="n === fbForm.rating" :aria-label="`${n} star`"
              @click="fbForm.rating = n" @mouseenter="fbHover = n" @mouseleave="fbHover = 0">
              <Star :size="26" :fill="n <= (fbHover || fbForm.rating) ? 'currentColor' : 'none'" />
            </button>
            <span class="sp-val trn-mono">{{ fbForm.rating }}/5</span>
          </div>
        </div>
        <TrnField v-model="fbForm.comments" type="textarea" label="Comments" :rows="3" placeholder="What worked, what could be better?" />
        <TrnField v-model="fbForm.would_recommend" type="toggle" label="Would you recommend this training?" />
      </div>
      <template #footer>
        <button class="trn-btn trn-btn-ghost" @click="closeFeedback">Cancel</button>
        <button class="trn-btn trn-btn-primary" :disabled="!fbForm.rating || saving" @click="submitFeedbackNow"><Star :size="14" /> Submit feedback</button>
      </template>
    </TrnModal>

    <!-- ── request a training modal ── -->
    <TrnModal :open="reqModal" title="Request a training" subtitle="Nominate yourself for a course" :icon="Inbox" @close="reqModal = false">
      <div class="m-form">
        <TrnField v-model="reqForm.title" label="Training title" placeholder="What do you want to learn?" required />
        <div class="m-grid">
          <TrnField v-model="reqForm.external_provider" label="Provider" placeholder="e.g. Coursera, internal" />
          <TrnField v-model="reqForm.estimated_cost" type="number" step="0.01" label="Estimated cost" placeholder="0.00" />
        </div>
        <TrnField v-model="reqForm.justification" type="textarea" label="Justification" :rows="3" required
          placeholder="How will this help you and the team?" />
      </div>
      <template #footer>
        <button class="trn-btn trn-btn-ghost" @click="reqModal = false">Cancel</button>
        <button class="trn-btn trn-btn-primary" :disabled="!reqForm.title || !reqForm.justification || saving" @click="submitReq"><Plus :size="14" /> Submit request</button>
      </template>
    </TrnModal>

    <!-- ── withdraw request modal ── -->
    <WithdrawRequestModal :open="!!withdrawTarget" :request="withdrawTarget || {}" :loading="withdrawing"
      @close="closeWithdraw" @confirm="confirmWithdraw" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import axios from 'axios'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  Telescope, AlertCircle, BookOpen, Award, Grid3x3, Inbox, ClipboardCheck,
  CalendarClock, CheckCircle2, Check, Play, Star, Plus, X, ExternalLink,
  ArrowUpRight, CircleUser, CornerUpLeft, Infinity, Rocket, Activity, Target,
  Gauge, FileBarChart2, Clock,
} from 'lucide-vue-next'

import '@/styles/training-theme.css'
import TrnStatusStamp from './training/components/TrnStatusStamp.vue'
import TrnCountUp from './training/components/TrnCountUp.vue'
import TrnModal from './training/components/TrnModal.vue'
import TrnField from './training/components/TrnField.vue'
import TrnEmptyState from './training/components/TrnEmptyState.vue'
import WithdrawRequestModal from './training/modals/WithdrawRequestModal.vue'
import SstHero from './training/components/selfservice/SstHero.vue'
import SstReportCard from './training/components/selfservice/SstReportCard.vue'
import SstMultiRing from './training/components/selfservice/SstMultiRing.vue'
import SstSegProgress from './training/components/selfservice/SstSegProgress.vue'
import { usePointerSpotlight, prefersReduced } from '@/composables/useShiftMotion'
import { typeMeta } from '@/composables/useTraining'
import { API, API_BASE } from '@/utils/api'
import { useGreeting } from '@/composables/useGreeting'
import {
  fetchMyTrainingSummary, fetchMyTraining, updateMyProgress,
  fetchMyCertifications,
  fetchMySkills, fetchMyRequests, createMyRequest, withdrawMyRequest,
  fetchMyApprovalQueue, decideMyQueue, submitMyFeedback,
  fetchMyReportsList, downloadMyReport,
} from '@/composables/useTraining'

const toast = useToast()
const reduced = prefersReduced()
const rootRef = ref(null)
usePointerSpotlight(rootRef)

// section refs for hero quick-nav
const trainingsRef = ref(null)
const skillsRef = ref(null)
const certsRef = ref(null)
const requestsRef = ref(null)
const reportsRef = ref(null)

// ── state ──
const loading = ref(true)
const unlinked = ref(false)
const saving = ref(false)
const busyId = ref(null)

const summary = ref({})
const trainings = ref([])
const certs = ref([])
const skills = ref([])
const requests = ref([])
const queue = ref([])
const reportsList = ref([])
const currentUserName = ref('')

const s = computed(() => summary.value || {})

// ── greeting + hero quick-nav ──
const { greeting } = useGreeting()
const scrollTo = (key) => {
  const map = { trainings: trainingsRef, skills: skillsRef, certifications: certsRef, requests: requestsRef, reports: reportsRef }
  const el = map[key]?.value
  if (el?.scrollIntoView) el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
}

const completionPct = computed(() => {
  const a = Number(s.value.assigned) || 0
  const c = Number(s.value.completed) || 0
  return a > 0 ? Math.round((c / a) * 100) : 0
})

// concentric rings for the snapshot multi-ring (completed / in-progress / to-start)
const snapRings = computed(() => {
  const a = Math.max(0, Number(s.value.assigned) || 0)
  const done = Number(s.value.completed) || 0
  const prog = Number(s.value.in_progress) || 0
  const todo = Math.max(0, a - done - prog)
  const p = (n) => (a > 0 ? (n / a) * 100 : 0)
  return [
    { pct: p(done), color: 'var(--trn-st-completed-hex)', label: 'Completed' },
    { pct: p(prog), color: 'var(--trn-amber)', label: 'In progress' },
    { pct: p(todo), color: 'var(--trn-st-not-started-hex)', label: 'To start' },
  ]
})

// staggered reveal helper — clean rise (no blur) so the motion reads differently
// from the admin module's blur-up reveals.
const reveal = (i) => ({
  initial: reduced ? false : { opacity: 0, y: 26 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.04 + i * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
})

// ── formatters ──
const fmtDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
const fmtMoney = (n) => '₹' + (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })
const certHref = (c) => {
  const u = c.certificate_url || ''
  return /^https?:\/\//i.test(u) ? u : `${API_BASE}${u}`
}
const typeLabel = (t) => typeMeta(t).label

// ── training helpers ──
const STATUS_COLOR = {
  COMPLETED: 'var(--trn-st-completed-hex)', IN_PROGRESS: 'var(--trn-amber)',
  FAILED: 'var(--trn-st-failed-hex)', WAIVED: 'var(--trn-st-waived-hex)', NOT_STARTED: 'var(--trn-st-not-started-hex)',
}
const statusColor = (t) => STATUS_COLOR[t.status] || STATUS_COLOR.NOT_STARTED
const progressPct = (t) => {
  if (t.status === 'COMPLETED' || t.status === 'WAIVED') return 100
  if (t.status === 'FAILED') return 100
  if (t.status === 'IN_PROGRESS') return 55
  return 0
}
const nodeClass = (t) => ({
  done: t.status === 'COMPLETED' || t.status === 'WAIVED',
  active: t.status === 'IN_PROGRESS',
  fail: t.status === 'FAILED',
  overdue: isOverdue(t),
})
const isOverdue = (t) => {
  if (!t.due_date || t.status === 'COMPLETED' || t.status === 'WAIVED') return false
  const d = new Date(t.due_date)
  return !isNaN(d) && d < new Date()
}
const isSoon = (t) => {
  if (!t.due_date || isOverdue(t) || t.status === 'COMPLETED') return false
  const d = new Date(t.due_date)
  if (isNaN(d)) return false
  const days = Math.ceil((d - new Date()) / 86400000)
  return days >= 0 && days <= 7
}
const dueLabel = (t) => {
  if (!t.due_date) return ''
  const d = new Date(t.due_date)
  if (isNaN(d)) return ''
  const days = Math.ceil((d - new Date()) / 86400000)
  if (isOverdue(t)) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Due today'
  if (days <= 30) return `Due in ${days}d`
  return `Due ${fmtDate(t.due_date)}`
}
const nextDue = computed(() => {
  const open = trainings.value
    .filter(t => t.due_date && t.status !== 'COMPLETED' && t.status !== 'WAIVED')
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
  return open[0] || null
})

// ── cert helpers ──
const daysToExpiry = (c) => {
  if (c.days_to_expiry != null) return c.days_to_expiry
  if (!c.expiry_date) return null
  const d = new Date(c.expiry_date)
  return isNaN(d) ? null : Math.ceil((d - new Date()) / 86400000)
}
const isExpired = (c) => {
  if (c.status === 'EXPIRED') return true
  const dte = daysToExpiry(c)
  return dte != null && dte < 0
}
const certStatus = (c) => {
  if (c.status) return c.status
  if (isExpired(c)) return 'EXPIRED'
  const dte = daysToExpiry(c)
  if (dte != null && dte <= 90) return 'EXPIRING_SOON'
  return 'ACTIVE'
}

// ── skill helpers ──
const currentOf = (sk) => Number(sk.current_level ?? sk.level ?? 0)
const maxOf = (sk) => Number(sk.max_level ?? sk.max ?? 5) || 5
const requiredOf = (sk) => (sk.required_level != null ? Number(sk.required_level) : null)
const gapOf = (sk) => {
  const req = requiredOf(sk)
  if (req == null) return Number(sk.gap) || 0
  return Math.max(0, req - currentOf(sk))
}
const levelPct = (sk) => Math.max(0, Math.min(100, (currentOf(sk) / maxOf(sk)) * 100))
const reqPct = (sk) => {
  const req = requiredOf(sk)
  return req == null ? null : Math.max(0, Math.min(100, (req / maxOf(sk)) * 100))
}
const gapClass = (sk) => (gapOf(sk) > 0 ? 'warn' : 'ok')
const skillsAtTarget = computed(() => skills.value.filter(sk => gapOf(sk) <= 0).length)
const avgGapDisplay = computed(() => Number(s.value.avg_skill_gap) || 0)
const avgGapDecimals = computed(() => (Number.isInteger(avgGapDisplay.value) ? 0 : 1))

// ── request approval-chain stepper ──
const stepDecision = (step) => (step?.decision || '').toUpperCase()
const isFinalApproved = (r) => ['APPROVED', 'FULFILLED'].includes((r.status || '').toUpperCase())
const stepClass = (r, step, si) => {
  const dec = stepDecision(step)
  if (dec === 'APPROVED') return 'ok'
  if (dec === 'REJECTED') return 'fail'
  if (dec === 'RETURNED') return 'warn'
  if (isFinalApproved(r)) return 'ok'
  if (si === r.current_step && (r.status || '').toUpperCase() === 'PENDING_APPROVAL') return 'active'
  return 'pending'
}
const stepIcon = (step) => {
  const dec = stepDecision(step)
  if (dec === 'APPROVED') return Check
  if (dec === 'REJECTED') return X
  if (dec === 'RETURNED') return CornerUpLeft
  return step?.approver_type === 'HR' ? ClipboardCheck : Clock
}
const stepTitle = (step) => {
  const who = step?.approver_name || step?.approver_type || 'Approver'
  const dec = stepDecision(step)
  return dec ? `${who} · ${dec.toLowerCase()}` : `${who} · awaiting`
}

// ── load ──
const unwrapList = (res) => (Array.isArray(res) ? res : (res?.items || []))
const hydrateName = async () => {
  try {
    const cached = JSON.parse(localStorage.getItem('user') || 'null')
    if (cached?.full_name) { currentUserName.value = cached.full_name; return }
  } catch { /* ignore */ }
  try {
    const { data } = await axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${localStorage.getItem('user_token')}` } })
    if (data?.full_name) currentUserName.value = data.full_name
  } catch { /* non-fatal */ }
}
const load = async () => {
  loading.value = true
  hydrateName()
  try {
    const [sum, tr, ce, sk, rq, qe, rl] = await Promise.allSettled([
      fetchMyTrainingSummary(), fetchMyTraining(), fetchMyCertifications(),
      fetchMySkills(), fetchMyRequests(), fetchMyApprovalQueue(), fetchMyReportsList(),
    ])
    const sumVal = sum.status === 'fulfilled' ? (sum.value || {}) : {}
    summary.value = sumVal
    unlinked.value = !!sumVal.unlinked || (tr.status === 'fulfilled' && !!tr.value?.unlinked)
    if (unlinked.value) return
    if (tr.status === 'fulfilled') trainings.value = unwrapList(tr.value)
    if (ce.status === 'fulfilled') certs.value = unwrapList(ce.value)
    if (sk.status === 'fulfilled') skills.value = unwrapList(sk.value)
    if (rq.status === 'fulfilled') requests.value = unwrapList(rq.value)
    if (qe.status === 'fulfilled') queue.value = unwrapList(qe.value)
    if (rl.status === 'fulfilled') reportsList.value = rl.value?.reports || []
  } catch {
    toast.error('Failed to load your learning hub')
  } finally {
    loading.value = false
  }
}
const reloadAll = async () => {
  try {
    const [sum, tr, ce, rq, qe] = await Promise.allSettled([
      fetchMyTrainingSummary(), fetchMyTraining(), fetchMyCertifications(), fetchMyRequests(), fetchMyApprovalQueue(),
    ])
    if (sum.status === 'fulfilled') summary.value = sum.value || {}
    if (tr.status === 'fulfilled') trainings.value = unwrapList(tr.value)
    if (ce.status === 'fulfilled') certs.value = unwrapList(ce.value)
    if (rq.status === 'fulfilled') requests.value = unwrapList(rq.value)
    if (qe.status === 'fulfilled') queue.value = unwrapList(qe.value)
  } catch { /* non-fatal */ }
}
onMounted(load)

// ── progress ──
const setProgress = async (t, status) => {
  busyId.value = t.id
  try {
    await updateMyProgress(t.id, status)
    toast.success(status === 'COMPLETED' ? 'Marked complete' : 'Training started')
    await reloadAll()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not update progress')
  } finally { busyId.value = null }
}

// ── feedback ──
const fbModal = reactive({ open: false, assignmentId: null, programName: '', programId: null })
const fbForm = reactive({ rating: 0, comments: '', would_recommend: true })
const fbHover = ref(0)
const openFeedback = (t) => {
  fbModal.open = true; fbModal.assignmentId = t.id; fbModal.programName = t.program_name || ''; fbModal.programId = t.program_id || null
  fbForm.rating = 0; fbForm.comments = ''; fbForm.would_recommend = true; fbHover.value = 0
}
const closeFeedback = () => { fbModal.open = false }
const submitFeedbackNow = async () => {
  if (!fbForm.rating) { toast.error('Pick a rating first'); return }
  saving.value = true
  try {
    await submitMyFeedback(fbModal.assignmentId, {
      rating: fbForm.rating, comments: fbForm.comments || null,
      would_recommend: !!fbForm.would_recommend, program_id: fbModal.programId,
    })
    toast.success('Thanks for your feedback')
    fbModal.open = false
    await reloadAll()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not submit feedback')
  } finally { saving.value = false }
}

// ── request a training ──
const reqModal = ref(false)
const reqForm = reactive({ title: '', external_provider: '', estimated_cost: null, justification: '' })
const openReqModal = () => {
  Object.assign(reqForm, { title: '', external_provider: '', estimated_cost: null, justification: '' })
  reqModal.value = true
}
const submitReq = async () => {
  if (!reqForm.title || !reqForm.justification) { toast.error('Title and justification are required'); return }
  saving.value = true
  try {
    const payload = { title: reqForm.title, justification: reqForm.justification }
    if (reqForm.external_provider) payload.external_provider = reqForm.external_provider
    if (reqForm.estimated_cost != null && reqForm.estimated_cost !== '') payload.estimated_cost = Number(reqForm.estimated_cost)
    await createMyRequest(payload)
    toast.success('Request submitted')
    reqModal.value = false
    await reloadAll()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not submit request')
  } finally { saving.value = false }
}
const withdrawTarget = ref(null)
const withdrawing = ref(false)
const openWithdraw = (r) => { withdrawTarget.value = r }
const closeWithdraw = () => { if (!withdrawing.value) withdrawTarget.value = null }
const confirmWithdraw = async () => {
  const r = withdrawTarget.value
  if (!r || withdrawing.value) return
  withdrawing.value = true
  busyId.value = r.id
  try {
    await withdrawMyRequest(r.id)
    toast.success('Request withdrawn')
    withdrawTarget.value = null
    await reloadAll()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not withdraw request')
  } finally { withdrawing.value = false; busyId.value = null }
}

// ── approval queue ──
const decide = async (q, decision) => {
  let notes = ''
  if (decision === 'RETURN' || decision === 'REJECT') {
    notes = window.prompt(`Add a note for this ${decision.toLowerCase()} (optional):`, '') || ''
  }
  busyId.value = q.id
  try {
    await decideMyQueue(q.id, { decision, notes: notes || null })
    toast.success(`Request ${decision.toLowerCase()}d`)
    await reloadAll()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not record decision')
  } finally { busyId.value = null }
}

// ── reports ──
const reportBusy = reactive({ key: null, format: null })
const downloadReport = async (key, format) => {
  reportBusy.key = key; reportBusy.format = format
  try {
    await downloadMyReport(key, format)
  } catch (e) {
    const detail = e?.response?.status === 503 ? 'PDF service unavailable right now' : (e?.response?.data?.detail || 'Could not generate the report')
    toast.error(detail)
  } finally {
    reportBusy.key = null; reportBusy.format = null
  }
}
</script>

<style scoped>
.sst-root { position: relative; min-height: calc(100vh - 80px); padding: 14px 4px 64px;
  color: var(--trn-text); background: var(--trn-canvas); overflow-x: clip; }

/* ── ambient backdrop ── */
.sst-atmos { position: absolute; inset: 0; z-index: 0; overflow: hidden; border-radius: 26px; pointer-events: none; }
.sst-orb { position: absolute; border-radius: 50%; filter: blur(64px); }
.sst-orb.o1 { width: 460px; height: 460px; top: -160px; left: -70px; opacity: 0.2;
  background: radial-gradient(circle, rgba(251,191,36,0.9), transparent 68%); animation: sst-drift1 26s ease-in-out infinite; }
.sst-orb.o2 { width: 400px; height: 400px; top: 36%; right: -90px; opacity: 0.14;
  background: radial-gradient(circle, rgba(251,146,60,0.85), transparent 70%); animation: sst-drift2 32s ease-in-out infinite; }
.sst-orb.o3 { width: 360px; height: 360px; bottom: -120px; left: 36%; opacity: 0.1;
  background: radial-gradient(circle, rgba(234,88,12,0.8), transparent 70%); animation: sst-drift1 35s ease-in-out infinite reverse; }
.sst-grid { position: absolute; inset: 0; opacity: 0.5;
  background-image: linear-gradient(var(--trn-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--trn-grid-line) 1px, transparent 1px);
  background-size: 44px 44px; -webkit-mask: radial-gradient(150% 110% at 50% 0%, #000, transparent 74%); mask: radial-gradient(150% 110% at 50% 0%, #000, transparent 74%); }
.sst-root > :not(.sst-atmos) { position: relative; z-index: 1; }

/* ── loading ── */
.sst-load { display: flex; flex-direction: column; gap: 18px; }
.sst-load-row { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }

/* ── unlinked ── */
.sst-unlinked { display: grid; place-items: center; gap: 8px; text-align: center; max-width: 520px; margin: 48px auto;
  padding: 48px 32px; border: 1.5px dashed var(--trn-border-strong); border-radius: 24px; background: var(--trn-surface); color: var(--trn-text-muted); }
.ul-orb { position: relative; width: 96px; height: 96px; display: grid; place-items: center; color: var(--trn-amber); margin-bottom: 8px; }
.ul-orb .ul-ring { position: absolute; inset: 0; border-radius: 50%; border: 1px solid var(--trn-border-strong); }
.ul-orb .ul-ring.r2 { inset: 16px; opacity: 0.6; animation: trn-orbit-spin 16s linear infinite; }
.ul-orb :deep(svg) { filter: drop-shadow(0 0 12px var(--trn-dome-glow)); }
.sst-unlinked h2 { margin: 0; font-size: 22px; font-weight: 800; color: var(--trn-text); letter-spacing: -0.02em; }
.sst-unlinked p { margin: 0; font-size: 14px; line-height: 1.55; max-width: 420px; }
.ul-tag { display: inline-flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 12.5px; font-weight: 600;
  padding: 6px 13px; border-radius: 999px; color: var(--trn-st-waived); background: var(--trn-st-waived-soft);
  border: 1px solid color-mix(in srgb, var(--trn-st-waived) 30%, transparent); }

/* ── blocks ── */
.sst-block { margin-top: 34px; scroll-margin-top: 90px; }
.block-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 14px; flex-wrap: wrap; }
.bh-left { display: flex; flex-direction: column; gap: 4px; }
.bh-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--trn-amber-strong); }
.bh-eyebrow.q { color: var(--trn-ember); }
.block-head h3 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; color: var(--trn-text); }
.bh-meta { font-size: 11px; color: var(--trn-text-muted); }
.trn-btn.sm { font-size: 12px; padding: 7px 12px; border-radius: 9px; }

/* ── bento layout ── */
.sst-bento { display: grid; grid-template-columns: minmax(0, 1.85fr) minmax(280px, 1fr); gap: 18px; margin-top: 28px; align-items: start; }
.bento-main { scroll-margin-top: 90px; }

/* ── journey track ── */
.journey { position: relative; display: flex; flex-direction: column; gap: 12px; padding-left: 26px; }
.journey::before { content: ''; position: absolute; left: 9px; top: 8px; bottom: 8px; width: 2px; border-radius: 2px;
  background: linear-gradient(180deg, var(--trn-amber), color-mix(in srgb, var(--trn-ember) 60%, transparent), transparent); opacity: 0.6; }
.j-row { position: relative; }
.j-node { position: absolute; left: -22px; top: 28px; width: 12px; height: 12px; border-radius: 50%;
  background: var(--trn-canvas); border: 2px solid var(--trn-st-not-started-hex); z-index: 2; }
.j-node.active { border-color: var(--trn-amber); box-shadow: 0 0 0 4px color-mix(in srgb, var(--trn-amber) 18%, transparent); animation: trn-pulse-dot 2.2s ease-out infinite; }
.j-node.done { border-color: var(--trn-st-completed-hex); background: var(--trn-st-completed-hex); }
.j-node.fail { border-color: var(--trn-st-failed-hex); background: var(--trn-st-failed-hex); }
.j-node.overdue { border-color: var(--trn-st-failed-hex); }

.j-card { position: relative; overflow: hidden; display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-radius: 16px;
  border: 1px solid var(--trn-border-soft); background: var(--trn-surf-card); box-shadow: var(--trn-card-shadow);
  transition: border-color 0.3s, box-shadow 0.3s; flex-wrap: wrap; }
.j-card:hover { border-color: color-mix(in srgb, var(--trn-amber) 26%, transparent); box-shadow: var(--trn-card-shadow-hover); }
.j-spot { z-index: 0; }
.j-card > :not(.j-spot) { position: relative; z-index: 1; }
.j-main { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 8px; }
.j-prog { display: flex; align-items: center; gap: 10px; }
.j-pct { font-size: 11px; font-weight: 800; flex-shrink: 0; min-width: 34px; text-align: right; }
.j-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 7px; }
.j-top h4 { margin: 0; font-size: 14.5px; font-weight: 700; color: var(--trn-text); }
.j-type { font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; padding: 2px 8px; border-radius: 999px;
  color: var(--trn-amber-strong); background: color-mix(in srgb, var(--trn-amber) 12%, transparent); }
.j-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.j-pill { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 999px;
  color: var(--trn-text-muted); background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.j-pill.overdue { color: var(--trn-st-failed); background: var(--trn-st-failed-soft); border-color: transparent; }
.j-pill.soon { color: var(--trn-st-waived); background: var(--trn-st-waived-soft); border-color: transparent; }
.j-pill.ok { color: var(--trn-st-completed); background: var(--trn-st-completed-soft); border-color: transparent; }
.j-acts { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; flex-shrink: 0; }
.j-rated { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 600; color: var(--trn-st-completed); }

/* ── snapshot ── */
.bento-side { position: sticky; top: 80px; display: flex; flex-direction: column; gap: 14px; padding: 20px; border-radius: 20px;
  border: 1px solid var(--trn-border-soft); background: var(--trn-surf-card); box-shadow: var(--trn-card-shadow); }
.snap-head { display: flex; flex-direction: column; gap: 4px; }
.snap-head h3 { margin: 0; font-size: 18px; font-weight: 800; color: var(--trn-text); letter-spacing: -0.01em; }
.snap-orbit { display: flex; justify-content: center; padding: 6px 0 2px; }
.snap-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
.snap-stat { display: flex; flex-direction: column; gap: 3px; padding: 11px 12px; border-radius: 13px;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.ss-ic { display: inline-flex; width: 26px; height: 26px; border-radius: 8px; align-items: center; justify-content: center;
  color: var(--trn-amber); background: color-mix(in srgb, var(--trn-amber) 14%, transparent); }
.ss-ic.ok { color: var(--trn-st-completed); background: var(--trn-st-completed-soft); }
.ss-ic.warn { color: var(--trn-st-waived); background: var(--trn-st-waived-soft); }
.ss-ic.ember { color: var(--trn-ember); background: color-mix(in srgb, var(--trn-ember) 14%, transparent); }
.ss-v { font-family: var(--trn-mono); font-size: 21px; font-weight: 800; color: var(--trn-text); line-height: 1.1; margin-top: 4px; }
.ss-l { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--trn-text-dim); }
.snap-next { display: flex; flex-direction: column; gap: 3px; padding: 12px 14px; border-radius: 14px;
  background: color-mix(in srgb, var(--trn-amber) 9%, transparent); border: 1px solid color-mix(in srgb, var(--trn-amber) 24%, transparent); }
.snap-next.overdue { background: var(--trn-st-failed-soft); border-color: color-mix(in srgb, var(--trn-st-failed) 30%, transparent); }
.sn-eyebrow { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--trn-amber-strong); }
.snap-next.overdue .sn-eyebrow { color: var(--trn-st-failed); }
.sn-name { font-size: 13.5px; font-weight: 700; color: var(--trn-text); }
.sn-date { font-size: 11.5px; color: var(--trn-text-muted); }
.snap-clear { display: flex; align-items: center; gap: 7px; padding: 12px 14px; border-radius: 14px; font-size: 12.5px; font-weight: 600;
  color: var(--trn-st-completed); background: var(--trn-st-completed-soft); }

/* ── skills ── */
.skill-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px 22px; padding: 18px 20px;
  border-radius: 18px; border: 1px solid var(--trn-border-soft); background: var(--trn-surf-card); box-shadow: var(--trn-card-shadow); }
.skill-row { display: flex; flex-direction: column; gap: 6px; }
.sk-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.sk-name { font-size: 13.5px; font-weight: 700; color: var(--trn-text); }
.sk-gap { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 600; padding: 2px 8px; border-radius: 999px; }
.sk-gap.ok { color: var(--trn-st-completed); background: var(--trn-st-completed-soft); }
.sk-gap.warn { color: var(--trn-st-waived); background: var(--trn-st-waived-soft); }
.sk-bar { position: relative; height: 9px; border-radius: 999px; background: var(--trn-heat-0); overflow: visible; }
.sk-fill { position: absolute; inset: 0 auto 0 0; height: 100%; border-radius: 999px; background: var(--trn-grad-rail);
  box-shadow: 0 0 10px var(--trn-dome-glow); transition: width 1s var(--trn-spring); }
.sk-marker { position: absolute; top: -3px; bottom: -3px; width: 2px; border-radius: 2px; background: var(--trn-text);
  box-shadow: 0 0 0 2px var(--trn-canvas); transform: translateX(-1px); }
.sk-scale { font-size: 10.5px; color: var(--trn-text-dim); }
.sk-scale i { font-style: normal; }

/* ── certifications ── */
.cert-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(248px, 1fr)); gap: 14px; }
.cert-card { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 8px; padding: 16px; border-radius: 16px;
  border: 1px solid var(--trn-border-soft); background: var(--trn-surf-card); box-shadow: var(--trn-card-shadow); transition: border-color 0.3s, box-shadow 0.3s; }
.cert-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--trn-cert-active); }
.cert-card.st-expiring_soon::before { background: var(--trn-cert-expiring); }
.cert-card.st-expired::before { background: var(--trn-cert-expired); }
.cert-card.st-revoked::before { background: var(--trn-cert-revoked); }
.cert-card:hover { border-color: color-mix(in srgb, var(--trn-amber) 26%, transparent); box-shadow: var(--trn-card-shadow-hover); }
.cert-spot { z-index: 0; }
.cert-card > :not(.cert-spot) { position: relative; z-index: 1; }
.cert-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.cert-seal { display: inline-flex; width: 34px; height: 34px; border-radius: 50%; align-items: center; justify-content: center;
  color: var(--trn-amber); background: color-mix(in srgb, var(--trn-amber) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--trn-amber) 30%, transparent); box-shadow: 0 0 16px -6px var(--trn-amber); }
.cert-card h4 { margin: 0; font-size: 14px; font-weight: 700; color: var(--trn-text); line-height: 1.3; }
.cert-iss { margin: 0; font-size: 12px; color: var(--trn-text-muted); }
.cert-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: auto; padding-top: 8px;
  border-top: 1px solid var(--trn-border-soft); flex-wrap: wrap; }
.cert-exp { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 600; color: var(--trn-text-secondary); }
.cert-exp.red { color: var(--trn-st-failed); }
.cert-exp.warn { color: var(--trn-st-waived); }
.cert-link { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 600; color: var(--trn-amber); text-decoration: none; }
.cert-link:hover { text-decoration: underline; }

/* ── requests ── */
.req-list { display: flex; flex-direction: column; gap: 10px; }
.req-card { position: relative; overflow: hidden; display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 14px 16px; border-radius: 16px; border: 1px solid var(--trn-border-soft); background: var(--trn-surf-card);
  box-shadow: var(--trn-card-shadow); transition: border-color 0.3s, box-shadow 0.3s; flex-wrap: wrap; }
.req-card:hover { border-color: color-mix(in srgb, var(--trn-amber) 26%, transparent); box-shadow: var(--trn-card-shadow-hover); }
.req-spot { z-index: 0; }
.req-card > :not(.req-spot) { position: relative; z-index: 1; }
.req-main { min-width: 0; flex: 1; }
.req-top { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.req-main h4 { margin: 0 0 2px; font-size: 14px; font-weight: 700; color: var(--trn-text); }
.req-num { font-size: 10.5px; color: var(--trn-text-dim); }
.req-src { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--trn-text-muted); }
.req-chain { display: flex; align-items: center; gap: 0; margin-top: 9px; }
.rc-step { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
  color: var(--trn-st-not-started); background: var(--trn-st-not-started-soft); border: 1px solid currentColor; }
.rc-step.ok { color: var(--trn-st-completed); background: var(--trn-st-completed-soft); }
.rc-step.fail { color: var(--trn-st-failed); background: var(--trn-st-failed-soft); }
.rc-step.warn { color: var(--trn-st-waived); background: var(--trn-st-waived-soft); }
.rc-step.active { color: var(--trn-amber); background: var(--trn-st-in-progress-soft); animation: trn-pulse-dot 2s ease-out infinite; }
.rc-conn { width: 18px; height: 2px; background: var(--trn-border-strong); }
.rc-conn.done { background: var(--trn-st-completed); }
.req-side { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; flex-shrink: 0; }
.req-cost { font-size: 13px; font-weight: 700; color: var(--trn-text); }

/* ── approval queue ── */
.q-list { display: flex; flex-direction: column; gap: 10px; }
.q-card { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 16px; border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--trn-ember) 24%, transparent); background: var(--trn-surf-card); box-shadow: var(--trn-card-shadow); flex-wrap: wrap; }
.q-main { min-width: 0; flex: 1; }
.q-main h4 { margin: 0 0 4px; font-size: 14px; font-weight: 700; color: var(--trn-text); }
.q-by { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 12px; color: var(--trn-text-muted); }
.q-dot { width: 3px; height: 3px; border-radius: 50%; background: var(--trn-text-dim); }
.q-just { margin: 6px 0 0; font-size: 12.5px; line-height: 1.45; color: var(--trn-text-secondary); font-style: italic; }
.q-acts { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; flex-shrink: 0; }

/* ── reports ── */
.rep-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; }

/* ── modal forms ── */
.m-form, .fb-form { display: flex; flex-direction: column; gap: 14px; }
.m-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.fb-rate-pick { display: flex; flex-direction: column; gap: 8px; }
.fb-label { font-size: 12px; font-weight: 600; color: var(--trn-text-secondary); }
.star-pick { display: flex; align-items: center; gap: 6px; }
.sp-star { display: inline-flex; padding: 2px; border: none; background: none; cursor: pointer; color: var(--trn-star-dim); transition: color 0.2s, transform 0.15s; }
.sp-star:hover { transform: scale(1.12); }
.sp-star.on { color: var(--trn-star); }
.sp-val { margin-left: 8px; font-size: 13px; font-weight: 700; color: var(--trn-text-muted); }

/* ── keyframes ── */
@keyframes sst-drift1 { 0%, 100% { translate: 0 0; } 50% { translate: 46px 36px; } }
@keyframes sst-drift2 { 0%, 100% { translate: 0 0; } 50% { translate: -40px -28px; } }

@media (max-width: 960px) {
  .sst-bento { grid-template-columns: 1fr; }
  .bento-side { position: static; }
}
@media (max-width: 760px) {
  .m-grid { grid-template-columns: 1fr; }
  .sst-load-row { grid-template-columns: 1fr; }
  .snap-stats { grid-template-columns: 1fr 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .sst-orb, .j-node.active, .rc-step.active { animation: none !important; }
  .sk-fill { transition: none; }
}
</style>
