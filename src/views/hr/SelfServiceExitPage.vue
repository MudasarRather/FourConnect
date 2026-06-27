<template>
  <div class="ss-exit">
    <!-- ───────── HERO — Departure console ───────── -->
    <Motion as="header" class="sse-hero ex-grain" :initial="reduced ? false : { opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
      <span class="sse-aura" aria-hidden="true" />
      <span class="sse-bg" aria-hidden="true" />
      <div class="sse-lead">
        <span class="sse-eyebrow"><DoorOpen :size="12" /> My exit · Self-service</span>
        <h1 class="sse-title">Your <span class="grad">Passage</span></h1>
        <p class="sse-sub">{{ heroSub }}</p>
        <div v-if="active" class="sse-idrow">
          <ExStatusPill :status="c.status" />
          <span class="idchip"><FileText :size="12" /> Filed {{ fmtDate(c.resignation_date) }}</span>
          <span class="idchip"><component :is="typeMeta.icon" :size="12" /> {{ typeMeta.label }}</span>
          <span v-if="c.last_working_date" class="idchip"><CalendarClock :size="12" /> Last day {{ fmtDate(c.last_working_date) }}</span>
        </div>
      </div>

      <div v-if="active" class="sse-medallion">
        <template v-if="heroDays != null">
          <span class="med-ring" :style="{ '--ex-p': heroPct * 3.6 + 'deg' }" aria-hidden="true" />
          <span class="med-spin" aria-hidden="true" />
          <span class="med-core">
            <b class="ex-mono"><ExCountUp :value="heroPct" suffix="%" /></b>
            <i>notice served</i>
          </span>
        </template>
        <template v-else>
          <span class="med-emblem" :style="{ '--c': statusMeta.hex }"><component :is="statusMeta.icon" :size="30" /></span>
        </template>
      </div>
    </Motion>

    <!-- ───────── states ───────── -->
    <div v-if="loading" class="sse-skel">
      <div class="skel hero-skel"><span class="sh" /></div>
      <div class="skel"><span class="sh" /></div>
      <div class="skel"><span class="sh" /></div>
    </div>

    <div v-else-if="unlinked" class="sse-banner"><AlertTriangle :size="16" /> Your account isn't linked to an employee profile yet. Please contact HR.</div>

    <!-- No active exit (none, or a closed one) -->
    <template v-else-if="!active">
      <!-- closed outcome summary -->
      <Motion v-if="closedCase" as="div" class="ex-card ex-grain sse-closed" :initial="reduced ? false : { opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45 }">
        <div class="ssc-head"><span class="ssc-h"><History :size="14" /> Your last resignation</span><ExStatusPill :status="c.status" /></div>
        <div class="ssc-facts">
          <div><span class="fk">Filed</span><span class="fv">{{ fmtDate(c.resignation_date) }}</span></div>
          <div><span class="fk">Type</span><span class="fv">{{ typeMeta.label }}</span></div>
          <div><span class="fk">Outcome</span><span class="fv">{{ closedLabel }}</span></div>
        </div>
        <p v-if="closedNote" class="sse-closed-note"><Info :size="13" /> {{ closedNote }}</p>
      </Motion>

      <SsPassagePortal :eligible="eligibleToResign" :gate-note="gateNote" :closed="!!closedCase" :reduced="reduced" @begin="openResign(null)" />
    </template>

    <!-- ───────── ACTIVE — full journey dashboard ───────── -->
    <template v-else>
      <!-- live reverse timer to the last working day -->
      <SsDepartureClock v-if="showClock" :lwd="clockLWD" :notice-start="c.notice_period_start_date"
        :notice-window="noticeWindow" :provisional="clockProvisional" :served-pct="clockProvisional ? null : noticeServedPct" />

      <SsExitJourney :state="stage" :closed-reason="''" />

      <!-- telemetry strip -->
      <div class="sse-stats">
        <Motion v-for="(t, i) in stats" :key="t.key" as="div" class="stat" :style="{ '--c': t.color }"
          :initial="reduced ? false : { opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.05 + i * 0.06, ease: [0.16, 1, 0.3, 1] }">
          <span class="stat-ic"><component :is="t.icon" :size="15" /></span>
          <span class="stat-tx">
            <b><ExCountUp v-if="t.num != null" :value="t.num" :suffix="t.suffix || ''" /><template v-else>{{ t.text }}</template></b>
            <i>{{ t.label }}</i>
          </span>
          <span class="stat-bar" />
        </Motion>
      </div>

      <div class="sse-grid">
        <div class="sse-col">
          <!-- resignation -->
          <SsTiltCard accent="var(--ex-violet)" :delay="0.04">
            <div class="ssc-head"><span class="ssc-h"><FileText :size="14" /> Resignation</span><ExStatusPill :status="c.status" /></div>
            <div class="ssc-facts">
              <div><span class="fk">Filed</span><span class="fv">{{ fmtDate(c.resignation_date) }}</span></div>
              <div><span class="fk">Type</span><span class="fv">{{ typeMeta.label }}</span></div>
              <div><span class="fk">Requested</span><span class="fv">{{ c.requested_last_working_date ? fmtDate(c.requested_last_working_date) : '—' }}</span></div>
            </div>
            <p v-if="c.reason_detail" class="ssc-reason">“{{ c.reason_detail }}”</p>

            <!-- manager review state -->
            <div v-if="c.status === 'MANAGER_REVIEW'" class="mgr-banner wait">
              <Gavel :size="13" /> Awaiting review from {{ c.manager_name || 'your manager' }}.
            </div>
            <div v-else-if="c.manager_decision === 'APPROVED'" class="mgr-banner ok">
              <BadgeCheck :size="13" /> {{ c.manager_name || 'Your manager' }} approved your resignation.
            </div>

            <div v-if="canEdit || canWithdraw" class="ssc-acts">
              <button v-if="canEdit" class="act-btn" type="button" @click="openResign(c)"><FilePen :size="13" /> Edit</button>
              <button v-if="canWithdraw" class="act-btn danger" type="button" @click="withdrawOpen = true"><Undo2 :size="13" /> Withdraw</button>
            </div>
            <p v-else class="ssc-locked"><Info :size="12" /> Your resignation is in process and can no longer be edited or withdrawn.</p>
          </SsTiltCard>

          <!-- notice countdown -->
          <SsTiltCard v-if="c.status === 'NOTICE_PERIOD' && c.last_working_date" accent="var(--ex-st-notice)" :delay="0.08">
            <div class="ssc-head"><span class="ssc-h"><CalendarClock :size="14" /> Notice countdown</span></div>
            <div class="notice-body">
              <NoticeCountdownArc :days="daysRemaining(c.last_working_date) ?? 0" :total="noticeWindow" />
              <p class="notice-txt">{{ noticeMsg }}</p>
            </div>
            <div v-if="c.notice_start?.started_at" class="notice-began" :class="c.notice_start.in_working_hours ? 'ok' : 'warn'">
              <Clock :size="12" /> Notice began {{ noticeBeganLabel }} · {{ c.notice_start.in_working_hours ? 'within working hours' : 'outside working hours' }}
            </div>

            <!-- attendance reality during notice (calendar countdown is unaffected) -->
            <template v-if="noticeServing">
              <div class="notice-serve">
                <span class="ns-chip ok">{{ Math.round(noticeServing.present_days) }} attended</span>
                <span v-if="noticeServing.leave_days" class="ns-chip leave">{{ Math.round(noticeServing.leave_days) }} on leave</span>
                <span v-if="noticeGapDays" class="ns-chip gap">{{ noticeGapDays }} not recorded</span>
              </div>
              <p v-if="noticeGapDays" class="notice-warn">
                <AlertTriangle :size="12" /> Days you don't serve (absent or unrecorded) are settled as loss-of-pay in your Full &amp; Final — they don't change your last working day.
              </p>
            </template>
          </SsTiltCard>

          <!-- settlement / F&F -->
          <SsTiltCard v-if="settlement" :accent="ffPayable ? 'var(--ex-cleared)' : 'var(--ex-blocked)'" :delay="0.12">
            <div class="ssc-head"><span class="ssc-h"><Scale :size="14" /> Full &amp; final</span><ExStatusPill :status="settlement.status" kind="settlement" /></div>
            <div class="ff-net">
              <span class="ff-net-lab">{{ ffPayable ? 'Net payable to you' : 'Net recoverable' }}</span>
              <b class="ff-net-val ex-mono" :class="{ rec: !ffPayable }"><ExCountUp :value="Math.abs(settlement.net_amount || 0)" :format="fmtINR" /></b>
            </div>
            <!-- proportional earnings ⇄ recoveries balance bar (signature instrument) -->
            <div v-if="(ffEarn + ffRec) > 0" class="ff-balance" :title="`Earnings ${ffEarnPct}% · Recoveries ${100 - ffEarnPct}%`" aria-hidden="true">
              <span class="ffb earn" :style="{ width: ffEarnPct + '%' }" />
              <span class="ffb rec" :style="{ width: (100 - ffEarnPct) + '%' }" />
              <span class="ffb-sweep" />
            </div>
            <div class="ff-split">
              <div class="ff-leg earn"><span><Wallet :size="12" /> Earnings</span><b class="ex-mono">{{ fmtINR(settlement.total_earnings) }}</b></div>
              <div class="ff-leg rec"><span><Undo2 :size="12" /> Recoveries</span><b class="ex-mono">{{ fmtINR(settlement.total_recoveries) }}</b></div>
            </div>
            <p class="ff-foot"><Info :size="12" /> Your final settlement is reviewed &amp; released by HR / Finance per policy.</p>
          </SsTiltCard>
        </div>

        <div class="sse-col">
          <!-- permanent document link (survives ERP de-activation) -->
          <SsTiltCard v-if="c.public_token" accent="var(--ex-violet)" :delay="0.04">
            <div class="ssc-head"><span class="ssc-h"><LinkIcon :size="14" /> Your document link</span></div>
            <p class="dl-note">Save this link. Your <b>relieving &amp; experience letters</b> appear here once HR issues them — even after your system access ends on your last day.</p>
            <div class="dl-row">
              <span class="dl-field">
                <input class="dl-input" :value="docLink" readonly @focus="$event.target.select()" />
                <span class="dl-beam" aria-hidden="true" />
              </span>
              <button class="dl-copy" type="button" @click="copyLink"><component :is="copied ? Check : Copy" :size="14" /> {{ copied ? 'Copied' : 'Copy' }}</button>
            </div>
            <a class="dl-open" :href="docLink" target="_blank" rel="noopener"><ExternalLink :size="12" /> Open my document portal</a>
            <p class="dl-sec"><Clock :size="12" />
              <span>
                <template v-if="docExpiry">For your security this link is active until <b>{{ fmtDate(docExpiry) }}</b> — please download your documents before then.</template>
                <template v-else>For your security, the link stays active for <b>5 days</b> after your documents are issued. HR can re-send a fresh link if you need it later.</template>
              </span>
            </p>
          </SsTiltCard>

          <!-- clearance -->
          <SsTiltCard v-if="c.clearance_items?.length" accent="var(--ex-cleared)" :delay="0.06">
            <div class="ssc-head"><span class="ssc-h"><ClipboardCheck :size="14" /> Clearance</span>
              <span class="clr-ring" :style="{ '--ex-p': (c.clearance_progress_pct || 0) * 3.6 + 'deg' }"><b class="ex-mono"><ExCountUp :value="c.clearance_progress_pct || 0" /></b><span class="clr-ring-glow" aria-hidden="true" /></span>
            </div>
            <ul class="clr-list">
              <li v-for="(it, i) in c.clearance_items" :key="i" :class="[`st-${it.status.toLowerCase()}`, { 'is-ho': it.is_self_handover }]">
                <span class="cl-dot" />
                <span class="cl-main">
                  <span class="cl-row1"><span class="cl-title">{{ it.title }}</span><span class="cl-dept">{{ it.department }}</span></span>
                  <span v-if="it.is_self_handover" class="cl-hostat" :class="`hs-${it.status.toLowerCase()}`">{{ handoverHint(it) }}</span>
                </span>
                <button v-if="canHandover(it)" class="cl-act" type="button" @click="openHandover(it)">
                  <component :is="it.status === 'BLOCKED' ? RotateCcw : (it.submission ? FilePen : ArrowRight)" :size="12" />
                  {{ it.status === 'BLOCKED' ? 'Re-submit' : (it.submission ? 'Update' : 'Complete') }}
                </button>
                <Check v-else-if="it.is_self_handover && it.status === 'CLEARED'" :size="15" class="cl-done-ic" />
              </li>
            </ul>
            <p class="clr-foot"><Info :size="12" />
              <template v-if="hasHandoverWork">Complete your <b>handover</b> lanes above — your manager signs them off. Other lanes are confirmed by their departments.</template>
              <template v-else>Your departments confirm no-dues here — nothing to action from your side.</template>
            </p>
          </SsTiltCard>

          <!-- exit interview -->
          <SsTiltCard v-if="iv" :accent="ivDone ? 'var(--ex-cleared)' : 'var(--ex-violet)'" :delay="0.1"
            :class="{ done: ivDone, led: !ivDone && !ivPending && !ivSelf, pend: ivPending }">
            <div class="ssc-head">
              <span class="ssc-h"><MessagesSquare :size="14" /> Exit interview</span>
              <span v-if="ivDone" class="ssc-done"><Check :size="13" /> Submitted</span>
              <span v-else-if="ivPending" class="iv-badge wait"><CalendarClock :size="11" /> Awaiting HR</span>
              <span v-else class="iv-badge" :class="ivSelf ? 'emp' : 'hr'"><component :is="ivModeMeta.icon" :size="11" /> {{ ivModeMeta.label }}</span>
            </div>
            <p v-if="ivDone" class="iv-thanks">Thank you for your candid feedback — it genuinely helps us improve. 🙏</p>
            <div v-else-if="ivPending" class="iv-pend">
              <span class="iv-pend-ic"><CalendarClock :size="17" /></span>
              <p class="iv-pend-t">Your exit interview will be scheduled by HR.</p>
              <p class="iv-pend-s">Once it's set up, your appointment — or a confidential survey — appears right here. Nothing to do for now.</p>
            </div>
            <template v-else>
              <InterviewAppointment :iv="iv" />
              <p v-if="!ivSelf" class="iv-attend"><Info :size="12" /> Please attend — your interviewer records the conversation. Nothing to fill in here.</p>
              <template v-else>
                <p class="iv-prompt">Share your candid feedback — it's confidential and shapes how we improve.</p>
                <button class="ex-btn primary sm" type="button" @click="ivOpen = true"><MessageSquarePlus :size="14" /> Complete survey</button>
              </template>
            </template>
          </SsTiltCard>

          <!-- letters -->
          <SsTiltCard v-if="issuedDocs.length" accent="var(--ex-amber-strong)" :delay="0.14">
            <div class="ssc-head"><span class="ssc-h"><ScrollText :size="14" /> My letters</span></div>
            <Motion v-for="d in issuedDocs" :key="d.id" as="button" class="doc-row" type="button" @click="downloadDoc(d)"
              :whileHover="reduced ? {} : { x: 3 }" :whileTap="{ scale: 0.98 }">
              <span class="doc-seal"><ScrollText :size="15" /></span>
              <span class="doc-meta"><b>{{ d.doc_type === 'RELIEVING_LETTER' ? 'Relieving letter' : 'Experience letter' }}</b><i>Issued · ready to download</i></span>
              <Download :size="15" class="dr-dl" />
            </Motion>
          </SsTiltCard>
        </div>
      </div>
    </template>

    <!-- Withdraw modal -->
    <Teleport to="body"><Presence>
      <div v-if="withdrawOpen" class="exm-overlay" @mousedown.self="withdrawOpen = false">
        <Motion as="div" class="exm-sm ex-grain" :initial="{ opacity: 0, y: 24, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }" :exit="{ opacity: 0, y: 16 }" :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }">
          <span class="exm-aura warn" aria-hidden="true" />
          <header class="exm-sm-head"><span class="exm-sm-ico"><Undo2 :size="18" /></span><div><h3>Withdraw resignation</h3><p>You'll stay on as an active employee. This can't be undone — you'd need to re-file.</p></div></header>
          <div class="exm-sm-body"><label class="fl">Reason <i>optional</i></label><textarea v-model="withdrawReason" rows="2" placeholder="A short note for HR…" /></div>
          <footer class="exm-sm-foot"><button class="exm-btn ghost" type="button" @click="withdrawOpen = false">Keep my resignation</button>
            <button class="exm-btn warn" :disabled="busy" type="button" @click="submitWithdraw"><Loader2 v-if="busy" :size="14" class="spin" /><Undo2 v-else :size="14" /> Withdraw</button></footer>
        </Motion>
      </div>
    </Presence></Teleport>

    <SsResignModal :open="resignOpen" :edit-case="resignEditCase" :emp-name="empName" :emp-code="empCode" :busy="busy"
      @close="resignOpen = false" @submit="onResignSubmit" />
    <SsInterviewModal :open="ivOpen" :interview="iv" :busy="busy" @close="ivOpen = false" @submit="onInterviewSubmit" />
    <SsHandoverModal :open="handoverOpen" :item="handoverItem" :manager-name="c?.manager_name" :busy="busy"
      @close="handoverOpen = false" @submit="onHandoverSubmit" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  DoorOpen, Loader2, AlertTriangle, FileText, CalendarClock, ClipboardCheck,
  MessagesSquare, MessageSquarePlus, ScrollText, Download, Undo2, Check, Info, Clock,
  Scale, Wallet, Gauge, BadgeCheck, FilePen, History, Gavel,
  Users, Video, Captions, RotateCcw, ArrowRight,
  Link as LinkIcon, Copy, ExternalLink,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { authHeader } from '@/utils/api'
import '@/styles/exit-theme.css'
import ExStatusPill from './exit/components/ExStatusPill.vue'
import ExCountUp from './exit/components/ExCountUp.vue'
import InterviewAppointment from './exit/components/InterviewAppointment.vue'
import NoticeCountdownArc from './exit/components/NoticeCountdownArc.vue'
import SsDepartureClock from './exit/components/SsDepartureClock.vue'
import SsTiltCard from './exit/components/SsTiltCard.vue'
import SsExitJourney from './exit/components/SsExitJourney.vue'
import SsPassagePortal from './exit/components/SsPassagePortal.vue'
import SsResignModal from './exit/modals/SsResignModal.vue'
import SsInterviewModal from './exit/modals/SsInterviewModal.vue'
import SsHandoverModal from './exit/modals/SsHandoverModal.vue'
import {
  fetchMyExit, submitMyResignation, editMyResignation, withdrawMyResignation, submitMyInterview, myLetterDownloadUrl,
  submitHandover, portalLink, exitStageState, resignationTypeMeta, caseStatusMeta,
  fmtDate, fmtINR, daysRemaining, daysBetween, errText,
} from '@/composables/useExit'
import { prefersReduced } from '@/composables/useShiftMotion'

const toast = useToast()
const reduced = prefersReduced()

const data = ref(null); const loading = ref(false); const busy = ref(false)
const unlinked = computed(() => !!data.value?.unlinked)
const c = computed(() => data.value?.case || null)
const lifecycleState = computed(() => data.value?.lifecycle_state || null)
const CLOSED = ['REJECTED', 'WITHDRAWN', 'CANCELLED']
const active = computed(() => !!c.value && !CLOSED.includes(c.value.status))
const closedCase = computed(() => !!c.value && CLOSED.includes(c.value.status))
// Block beginning a resignation only when the lifecycle is clearly terminal /
// already-leaving; ACTIVE / CONFIRMED / ON_PROBATION (and an absent value) all
// pass — the backend remains the hard gate (409 with a clear reason otherwise).
const BLOCKED_LIFECYCLE = ['ON_NOTICE', 'EXITED', 'ARCHIVED', 'SUSPENDED', 'INACTIVE', 'TERMINATED', 'RESIGNED', 'RELIEVED']
const eligibleToResign = computed(() => !active.value && !BLOCKED_LIFECYCLE.includes(lifecycleState.value))
const stage = computed(() => exitStageState(c.value))
const typeMeta = computed(() => resignationTypeMeta(c.value?.resignation_type))
const statusMeta = computed(() => caseStatusMeta(c.value?.status))
const canEdit = computed(() => c.value && ['DRAFT', 'SUBMITTED', 'MANAGER_REVIEW'].includes(c.value.status))
const canWithdraw = computed(() => canEdit.value)
const issuedDocs = computed(() => (c.value?.documents || []).filter(d => d.status === 'ISSUED'))
const settlement = computed(() => { const s = c.value?.settlement; return s && (s.net_amount != null || s.status) ? s : null })
const ffPayable = computed(() => Number(settlement.value?.net_amount || 0) >= 0)
// F&F balance bar — proportional earnings vs recoveries (the card's signature instrument)
const ffEarn = computed(() => Number(settlement.value?.total_earnings || 0))
const ffRec = computed(() => Number(settlement.value?.total_recoveries || 0))
const ffEarnPct = computed(() => {
  const t = ffEarn.value + ffRec.value
  return t > 0 ? Math.round((ffEarn.value / t) * 100) : (ffEarn.value > 0 ? 100 : 0)
})

const empName = computed(() => c.value?.employee_name || (() => { try { return JSON.parse(localStorage.getItem('user') || '{}').full_name || '' } catch { return '' } })())
const empCode = computed(() => c.value?.employee_code || '')

const heroSub = computed(() => {
  if (unlinked.value) return 'Link your profile to begin.'
  if (closedCase.value) return 'Your previous separation is closed. A fresh start begins whenever you choose.'
  if (!active.value) return 'When the time comes, your respectful send-off begins right here.'
  if (c.value.status === 'MANAGER_REVIEW') return 'Your resignation is with your manager for review.'
  if (c.value.status === 'NOTICE_PERIOD') return 'You\'re serving your notice — track every step to your last day.'
  return 'Track your separation journey from resignation to relieving — all in one place.'
})

// hero countdown
const heroDays = computed(() => (c.value?.last_working_date ? daysRemaining(c.value.last_working_date) : null))
const noticeWindow = computed(() => {
  const w = daysBetween(c.value?.notice_period_start_date, c.value?.last_working_date)
  return (w && w > 0) ? w : (c.value?.notice_period_days || 30)
})
// Authoritative notice progress from the backend (notice_metrics) — same numbers
// the admin notice board uses. "served" + clock "left" therefore always sum to 100.
const noticeMetrics = computed(() => c.value?.notice_metrics || null)
const noticeServing = computed(() => c.value?.notice_serving || null)
const noticeServedPct = computed(() => {
  const m = noticeMetrics.value
  if (m && m.progress_pct != null) return Math.max(0, Math.min(100, m.progress_pct))
  // fallback mirrors the backend formula: served = (window − remaining) / window
  const d = heroDays.value
  if (d == null) return 0
  const w = noticeWindow.value || 30
  return Math.round(Math.max(0, Math.min(100, ((w - d) / w) * 100)))
})
const heroPct = noticeServedPct

// attendance reality during notice — gap = absent + unrecorded days. Surfaced so
// the employee sees that NOT serving notice (no punches) has an F&F consequence,
// even though it never changes the calendar countdown to the last working day.
const noticeGapDays = computed(() => {
  const s = noticeServing.value
  if (!s) return 0
  return (Number(s.absent_days) || 0) + (Number(s.no_record_days) || 0) + (Number(s.lwp_days) || 0)
})

// live reverse-timer (departure clock) — counts down to the last working day.
// Falls back to the requested LWD as a provisional countdown before acceptance.
const clockLWD = computed(() => c.value?.last_working_date || c.value?.requested_last_working_date || null)
const clockProvisional = computed(() => !c.value?.last_working_date && !!c.value?.requested_last_working_date)
// Only show the live countdown while it's still meaningful — the run-up to the
// last day. Once clearance / settlement / relieving begins the countdown is over.
const COUNTDOWN_STATUSES = ['SUBMITTED', 'MANAGER_REVIEW', 'ACCEPTED', 'NOTICE_PERIOD']
const showClock = computed(() => active.value && !!clockLWD.value && COUNTDOWN_STATUSES.includes(c.value?.status))
const noticeMsg = computed(() => {
  const d = daysRemaining(c.value?.last_working_date)
  if (d == null) return ''
  if (d < 0) return 'Your last working day has passed.'
  return `${d} day${d !== 1 ? 's' : ''} remain until your last working day.`
})
const noticeBeganLabel = computed(() => {
  const s = c.value?.notice_start
  if (!s?.started_at) return ''
  return `${fmtDate(s.started_at)}${s.time_label ? ' · ' + s.time_label : ''}`
})

// closed-case copy
const closedLabel = computed(() => ({ WITHDRAWN: 'Withdrawn', REJECTED: 'Not accepted', CANCELLED: 'Cancelled' }[c.value?.status] || '—'))
const closedNote = computed(() => {
  const s = c.value?.status
  if (s === 'REJECTED') return c.value?.manager_notes ? `Manager note: ${c.value.manager_notes}` : 'Your resignation was not accepted. Speak with your manager or HR for next steps.'
  if (s === 'WITHDRAWN') return 'You withdrew this resignation — you remain an active employee.'
  if (s === 'CANCELLED') return 'This resignation was cancelled by HR.'
  return ''
})
const gateNote = computed(() => {
  const st = (lifecycleState.value || '').replace(/_/g, ' ').toLowerCase()
  return `You can't begin a resignation while your status is "${st || 'unavailable'}". Please contact HR.`
})

// telemetry tiles
const stats = computed(() => {
  const out = []
  out.push(heroDays.value != null
    ? { key: 'days', icon: CalendarClock, num: Math.abs(heroDays.value), label: heroDays.value < 0 ? 'days over LWD' : 'days to last day', color: '#fb923c' }
    : { key: 'days', icon: CalendarClock, text: '—', label: 'last day pending', color: '#fb923c' })
  out.push({ key: 'clr', icon: Gauge, num: c.value?.clearance_progress_pct || 0, suffix: '%', label: 'clearance done', color: '#34d399' })
  out.push({ key: 'iv', icon: MessagesSquare, text: ivStatusWord.value, label: 'exit interview', color: '#fbbf24' })
  out.push({ key: 'let', icon: ScrollText, num: issuedDocs.value.length, label: 'letters ready', color: '#f59e0b' })
  return out
})

// interview
const IV_MODES = { IN_PERSON: { label: 'In person', icon: Users }, VIDEO: { label: 'Video call', icon: Video }, FORM: { label: 'Survey', icon: Captions } }
const iv = computed(() => c.value?.interview || null)
const ivDone = computed(() => iv.value?.status === 'COMPLETED')
const ivPending = computed(() => iv.value?.awaiting_schedule === true || iv.value?.status === 'PENDING')
const ivSelf = computed(() => iv.value?.self_complete === true)
const ivModeMeta = computed(() => IV_MODES[iv.value?.mode] || IV_MODES.FORM)
const ivStatusWord = computed(() => {
  if (!iv.value) return 'N/A'
  if (ivDone.value) return 'Done'
  if (ivPending.value) return 'Pending'
  if (ivSelf.value) return 'Survey'
  return 'Scheduled'
})

const load = async () => {
  loading.value = true
  try { data.value = await fetchMyExit() }
  catch (e) { toast.error(errText(e, 'Failed to load your exit')) }
  finally { loading.value = false }
}

// resign (new + edit, shared modal)
const resignOpen = ref(false)
const resignEditCase = ref(null)
const openResign = (caseObj) => { resignEditCase.value = caseObj; resignOpen.value = true }
const onResignSubmit = async (payload) => {
  busy.value = true
  try {
    if (resignEditCase.value) { await editMyResignation(resignEditCase.value.id, payload); toast.success('Resignation updated') }
    else { await submitMyResignation(payload); toast.success('Resignation submitted — your manager & HR are notified') }
    resignOpen.value = false; await load()
  } catch (e) { toast.error(errText(e, 'Could not submit')) }
  finally { busy.value = false }
}

// withdraw
const withdrawOpen = ref(false); const withdrawReason = ref('')
const submitWithdraw = async () => {
  busy.value = true
  try { await withdrawMyResignation(c.value.id, withdrawReason.value || null); toast.success('Resignation withdrawn'); withdrawOpen.value = false; withdrawReason.value = ''; await load() }
  catch (e) { toast.error(errText(e, 'Could not withdraw')) }
  finally { busy.value = false }
}

// interview
const ivOpen = ref(false)
const onInterviewSubmit = async (payload) => {
  busy.value = true
  try { await submitMyInterview(c.value.id, payload); toast.success('Thank you — your feedback was submitted'); ivOpen.value = false; await load() }
  catch (e) { toast.error(errText(e, 'Could not submit')) }
  finally { busy.value = false }
}

// permanent document link (survives ERP de-activation after clearance)
const docLink = computed(() => (c.value?.public_token ? portalLink(c.value.public_token) : ''))
const docExpiry = computed(() => c.value?.public_token_expires_at || null)
const copied = ref(false)
const copyLink = async () => {
  try { await navigator.clipboard.writeText(docLink.value); copied.value = true; setTimeout(() => { copied.value = false }, 1800) }
  catch { toast.info('Copy failed — select the link and copy manually') }
}

// handover (employee fills MANAGER + PROJECT lanes → reporting manager signs off)
const handoverOpen = ref(false)
const handoverItem = ref(null)
const HANDOVER_WINDOW = ['ACCEPTED', 'NOTICE_PERIOD', 'CLEARANCE']
const inHandoverWindow = computed(() => HANDOVER_WINDOW.includes(c.value?.status))
const canHandover = (it) => it.is_self_handover && it.status !== 'CLEARED' && inHandoverWindow.value
const hasHandoverWork = computed(() => (c.value?.clearance_items || []).some(canHandover))
const handoverHint = (it) => {
  if (it.status === 'CLEARED') return `Cleared${it.signed_off_by_name ? ' by ' + it.signed_off_by_name : ''}`
  if (it.status === 'BLOCKED') return 'Sent back — needs an update'
  if (it.status === 'IN_PROGRESS') return `Submitted — awaiting ${c.value?.manager_name || 'your manager'}`
  return 'Awaiting your handover'
}
const openHandover = (it) => { handoverItem.value = it; handoverOpen.value = true }
const onHandoverSubmit = async (payload) => {
  busy.value = true
  try {
    await submitHandover(c.value.id, handoverItem.value.id, payload)
    toast.success('Handover submitted — sent to your manager for sign-off')
    handoverOpen.value = false
    await load()
  } catch (e) { toast.error(errText(e, 'Could not submit handover')) }
  finally { busy.value = false }
}

const downloadDoc = async (d) => {
  const slug = d.doc_type === 'RELIEVING_LETTER' ? 'relieving-letter' : 'experience-letter'
  try {
    const res = await fetch(myLetterDownloadUrl(c.value.id, slug), { headers: authHeader() })
    if (!res.ok) throw new Error()
    const blob = await res.blob(); const url = URL.createObjectURL(blob)
    window.open(url, '_blank'); setTimeout(() => URL.revokeObjectURL(url), 4000)
  } catch { toast.error('Could not download') }
}

onMounted(load)
</script>

<style scoped>
.ss-exit { padding: 18px; color: var(--ex-text); max-width: 1120px; margin: 0 auto; }

/* hero */
.sse-hero { position: relative; overflow: hidden; isolation: isolate; display: grid; grid-template-columns: 1fr auto; gap: 18px; align-items: center;
  padding: 24px 26px; border-radius: 22px; margin-bottom: 16px; background: var(--ex-surface-elevated); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow); }
.sse-aura { position: absolute; inset: -40% 30% 30% -10%; pointer-events: none; background: radial-gradient(60% 80% at 24% 0%, rgba(251, 146, 60, 0.2), transparent 70%); animation: ex-aura-drift 12s ease-in-out infinite; }
.sse-bg { position: absolute; inset: 0; pointer-events: none; opacity: 0.4;
  background-image: linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px); background-size: 30px 30px, 30px 30px;
  -webkit-mask: radial-gradient(120% 120% at 90% 10%, #000, transparent 70%); mask: radial-gradient(120% 120% at 90% 10%, #000, transparent 70%); }
[data-theme="light"] .sse-bg { background-image: linear-gradient(rgba(120, 53, 15, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(120, 53, 15, 0.05) 1px, transparent 1px); }
.sse-lead { position: relative; z-index: 2; }
.sse-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ex-violet); padding: 4px 10px; border-radius: 999px; background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.sse-title { font-size: clamp(24px, 3.4vw, 34px); font-weight: 860; margin: 10px 0 4px; line-height: 1.05; }
.sse-title .grad { background: var(--ex-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.sse-sub { color: var(--ex-text-secondary); font-size: 13px; margin: 0; max-width: 520px; line-height: 1.5; }
.sse-idrow { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 13px; }
.idchip { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; color: var(--ex-text-secondary); padding: 4px 10px; border-radius: 999px; background: var(--ex-panel); border: 1px solid var(--ex-border); }
.idchip svg { color: var(--ex-violet); }

.sse-medallion { position: relative; z-index: 2; width: 132px; height: 132px; display: grid; place-items: center; flex-shrink: 0; }
.med-ring { position: absolute; inset: 0; border-radius: 50%; background: conic-gradient(from -90deg, var(--ex-amber) var(--ex-p, 0deg), color-mix(in srgb, var(--ex-steel) 22%, transparent) 0); transition: --ex-p 1s var(--ex-spring);
  -webkit-mask: radial-gradient(circle, transparent 60%, #000 61.5%); mask: radial-gradient(circle, transparent 60%, #000 61.5%); filter: drop-shadow(0 0 12px rgba(251, 146, 60, 0.3)); }
.med-spin { position: absolute; inset: -4px; border-radius: 50%; border: 1px dashed var(--ex-border-strong); animation: ex-spin-slow 24s linear infinite; }
.med-core { display: flex; flex-direction: column; align-items: center; line-height: 1; }
.med-core b { font-size: 32px; font-weight: 900; color: var(--ex-text); }
.med-core i { font-size: 9px; font-style: normal; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ex-text-muted); margin-top: 3px; }
.med-emblem { display: grid; place-items: center; width: 92px; height: 92px; border-radius: 50%; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 34%, transparent); box-shadow: 0 0 26px -6px color-mix(in srgb, var(--c) 60%, transparent); }

/* skeleton */
.sse-skel { display: flex; flex-direction: column; gap: 14px; }
.skel { position: relative; overflow: hidden; height: 110px; border-radius: 18px; background: var(--ex-surface); border: 1px solid var(--ex-border); }
.skel.hero-skel { height: 180px; }
.sh { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(251, 146, 60, 0.08) 50%, transparent 70%); animation: ex-sheen-pass 1.4s ease-in-out infinite; }

.sse-banner { display: flex; align-items: center; gap: 8px; padding: 13px 16px; border-radius: 13px; font-size: 13px; color: var(--ex-amber); background: var(--ex-amber-soft); border: 1px solid var(--ex-amber-border); }

/* closed summary */
.sse-closed { padding: 16px; margin-bottom: 14px; }
.sse-closed-note { display: flex; align-items: flex-start; gap: 7px; margin: 12px 0 0; font-size: 12px; line-height: 1.5; color: var(--ex-text-muted); }
.sse-closed-note svg { color: var(--ex-text-dim); flex-shrink: 0; margin-top: 1px; }

/* begin-resignation CTA (also used by the interview "Complete survey" button) */
.ex-btn { position: relative; display: inline-flex; align-items: center; gap: 6px; padding: 11px 18px; border-radius: 12px; font-size: 13px; font-weight: 760; cursor: pointer; border: none; background: var(--ex-grad-hero); color: #1a1206; box-shadow: var(--ex-violet-glow); transition: transform 0.2s var(--ex-spring), filter 0.2s; }
.ex-btn:hover { transform: translateY(-2px); filter: brightness(1.04); }
.ex-btn.sm { padding: 8px 14px; font-size: 12.5px; }

/* telemetry strip */
.sse-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 14px 0; }
.stat { position: relative; overflow: hidden; display: flex; align-items: center; gap: 11px; padding: 13px 15px; border-radius: 15px; background: var(--ex-surface); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow); transition: transform 0.25s var(--ex-spring), border-color 0.25s; }
.stat:hover { transform: translateY(-2px); border-color: var(--ex-border-strong); }
.stat-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 11px; flex-shrink: 0; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.stat-tx { display: flex; flex-direction: column; line-height: 1.1; min-width: 0; }
.stat-tx b { font-size: 20px; font-weight: 880; color: var(--ex-text); font-variant-numeric: tabular-nums; }
.stat-tx i { font-size: 10px; font-style: normal; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ex-text-muted); }
.stat-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--c); opacity: 0.7; }

/* cards grid */
.sse-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.sse-col { display: flex; flex-direction: column; gap: 14px; }
.ss-card { padding: 16px; }
.ssc-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.ssc-h { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ex-violet); }
.ssc-done { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: var(--ex-cleared); }
.ssc-facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.ssc-facts > div { display: flex; flex-direction: column; gap: 2px; padding: 9px 10px; border-radius: 10px; background: var(--ex-panel); }
.fk { font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ex-text-dim); }
.fv { font-size: 12.5px; font-weight: 750; color: var(--ex-text); }
.ssc-reason { font-size: 12px; font-style: italic; line-height: 1.5; color: var(--ex-text-muted); margin: 11px 0 0; padding: 9px 11px; border-radius: 10px; background: var(--ex-panel); }

.mgr-banner { display: inline-flex; align-items: center; gap: 7px; margin-top: 12px; padding: 7px 12px; border-radius: 999px; font-size: 11.5px; font-weight: 700; }
.mgr-banner.wait { color: var(--ex-amber); background: var(--ex-amber-soft); border: 1px solid var(--ex-amber-border); }
.mgr-banner.ok { color: var(--ex-cleared); background: var(--ex-cleared-soft); border: 1px solid color-mix(in srgb, var(--ex-cleared) 30%, transparent); }
.ssc-acts { display: flex; gap: 8px; margin-top: 13px; }
.act-btn { display: inline-flex; align-items: center; gap: 5px; padding: 8px 13px; border-radius: 10px; cursor: pointer; font-size: 12px; font-weight: 750; font-family: inherit; background: var(--ex-surface); border: 1px solid var(--ex-border-strong); color: var(--ex-text-secondary); transition: all 0.2s; }
.act-btn:hover { border-color: var(--ex-violet-border); color: var(--ex-violet); transform: translateY(-1px); }
.act-btn.danger:hover { border-color: color-mix(in srgb, var(--ex-blocked) 40%, transparent); color: var(--ex-blocked); }
.ssc-locked { display: flex; align-items: flex-start; gap: 6px; margin: 13px 0 0; font-size: 11.5px; line-height: 1.45; color: var(--ex-text-muted); }
.ssc-locked svg { color: var(--ex-text-dim); flex-shrink: 0; margin-top: 1px; }

.notice-body { display: flex; align-items: center; gap: 16px; }
.notice-txt { font-size: 13px; color: var(--ex-text-secondary); margin: 0; line-height: 1.5; }
.notice-began { display: inline-flex; align-items: center; gap: 6px; margin-top: 11px; font-size: 11.5px; font-weight: 600; padding: 6px 11px; border-radius: 999px; }
.notice-began svg { flex-shrink: 0; }
.notice-began.ok { color: var(--ex-cleared); background: var(--ex-cleared-soft); border: 1px solid color-mix(in srgb, var(--ex-cleared) 28%, transparent); }
.notice-began.warn { color: var(--ex-amber); background: var(--ex-amber-soft); border: 1px solid var(--ex-amber-border); }
.notice-serve { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 11px; }
.ns-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 750; padding: 4px 10px; border-radius: 999px; border: 1px solid transparent; }
.ns-chip::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.ns-chip.ok { color: var(--ex-cleared); background: var(--ex-cleared-soft); border-color: color-mix(in srgb, var(--ex-cleared) 28%, transparent); }
.ns-chip.leave { color: var(--ex-amber); background: var(--ex-amber-soft); border-color: var(--ex-amber-border); }
.ns-chip.gap { color: var(--ex-blocked); background: var(--ex-blocked-soft); border-color: color-mix(in srgb, var(--ex-blocked) 30%, transparent); }
.notice-warn { display: flex; align-items: flex-start; gap: 6px; margin: 9px 0 0; font-size: 11px; line-height: 1.45; color: var(--ex-text-muted); }
.notice-warn svg { color: var(--ex-blocked); flex-shrink: 0; margin-top: 1px; }

/* F&F */
.ff-net { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding: 11px 13px; border-radius: 12px; background: var(--ex-panel); }
.ff-net-lab { font-size: 11px; font-weight: 750; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ex-text-muted); }
.ff-net-val { font-size: 22px; font-weight: 900; color: var(--ex-cleared); }
.ff-net-val.rec { color: var(--ex-blocked); }
.ff-split { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-top: 10px; }
.ff-leg { display: flex; flex-direction: column; gap: 3px; padding: 9px 11px; border-radius: 10px; background: var(--ex-surface); border: 1px solid var(--ex-border); }
.ff-leg span { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--ex-text-dim); }
.ff-leg.earn span { color: var(--ex-cleared); }
.ff-leg.rec span { color: var(--ex-blocked); }
.ff-leg b { font-size: 14px; font-weight: 800; color: var(--ex-text); }
.ff-foot, .clr-foot { display: flex; align-items: flex-start; gap: 6px; margin: 11px 0 0; font-size: 11px; line-height: 1.45; color: var(--ex-text-muted); }
.ff-foot svg, .clr-foot svg { color: var(--ex-text-dim); flex-shrink: 0; margin-top: 1px; }

/* document link */
.dl-note { font-size: 12px; line-height: 1.5; color: var(--ex-text-muted); margin: 0 0 11px; }
.dl-note b { color: var(--ex-text-secondary); font-weight: 750; }
.dl-row { display: flex; gap: 7px; }
.dl-input { flex: 1; min-width: 0; padding: 9px 11px; border-radius: 10px; font-size: 11.5px; font-family: var(--ex-mono, monospace); color: var(--ex-text-secondary);
  background: var(--ex-panel); border: 1px solid var(--ex-border); }
.dl-input:focus { outline: none; border-color: var(--ex-violet-border); }
.dl-copy { display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0; padding: 9px 13px; border-radius: 10px; cursor: pointer; font-family: inherit;
  font-size: 12px; font-weight: 750; background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); color: var(--ex-violet); transition: filter 0.2s; }
.dl-copy:hover { filter: brightness(1.08); }
.dl-open { display: inline-flex; align-items: center; gap: 5px; margin-top: 10px; font-size: 11.5px; font-weight: 700; color: var(--ex-violet); text-decoration: none; }
.dl-open:hover { text-decoration: underline; }
.dl-sec { display: flex; align-items: flex-start; gap: 6px; margin: 10px 0 0; padding: 8px 10px; border-radius: 10px; font-size: 11px; line-height: 1.45;
  color: var(--ex-amber-strong); background: var(--ex-amber-soft); border: 1px solid var(--ex-amber-border); }
.dl-sec svg { flex-shrink: 0; margin-top: 1px; }
.dl-sec b { font-weight: 800; }

/* clearance */
.clr-ring { position: relative; display: grid; place-items: center; width: 38px; height: 38px; border-radius: 50%;
  background: conic-gradient(from -90deg, var(--ex-cleared) var(--ex-p, 0deg), color-mix(in srgb, var(--ex-steel) 22%, transparent) 0); transition: --ex-p 0.9s var(--ex-spring); }
.clr-ring::after { content: ''; position: absolute; inset: 4px; border-radius: 50%; background: var(--ex-surface); }
.clr-ring b { position: relative; z-index: 1; font-size: 11px; font-weight: 850; color: var(--ex-text); }
.clr-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; max-height: 280px; overflow-y: auto; }
.clr-list li { display: flex; align-items: center; gap: 9px; padding: 7px 8px; border-radius: 8px; font-size: 12px; }
.clr-list li.is-ho { background: var(--ex-panel); padding: 9px 10px; align-items: flex-start; }
.cl-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: var(--ex-steel); box-shadow: 0 0 6px currentColor; margin-top: 4px; }
.st-cleared .cl-dot, .st-na .cl-dot { background: var(--ex-cleared); }
.st-blocked .cl-dot { background: var(--ex-blocked); }
.st-in_progress .cl-dot { background: var(--ex-amber); }
.cl-main { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.cl-row1 { display: flex; align-items: center; gap: 8px; }
.cl-title { flex: 1; color: var(--ex-text-secondary); }
.cl-dept { font-size: 10px; color: var(--ex-text-dim); text-transform: uppercase; flex-shrink: 0; }
.cl-hostat { font-size: 10.5px; font-weight: 650; color: var(--ex-text-muted); }
.hs-in_progress { color: var(--ex-amber); }
.hs-blocked { color: var(--ex-blocked); }
.hs-cleared { color: var(--ex-cleared); }
.cl-act { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; padding: 5px 10px; border-radius: 8px; cursor: pointer; font-family: inherit;
  font-size: 11px; font-weight: 750; background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); color: var(--ex-violet); transition: filter 0.2s, transform 0.2s; }
.cl-act:hover { filter: brightness(1.08); transform: translateY(-1px); }
.cl-done-ic { color: var(--ex-cleared); flex-shrink: 0; margin-top: 2px; }

/* interview */
.iv-prompt, .iv-thanks { font-size: 12.5px; color: var(--ex-text-muted); margin: 0 0 10px; line-height: 1.5; }
.iv-card.led { border-color: var(--ex-violet-border); }
.iv-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 800; padding: 3px 9px; border-radius: 999px; }
.iv-badge.hr { color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.iv-badge.emp { color: var(--ex-cleared); background: var(--ex-cleared-soft); border: 1px solid color-mix(in srgb, var(--ex-cleared) 32%, transparent); }
.iv-badge.wait { color: var(--ex-text-muted); background: var(--ex-steel-soft); border: 1px dashed var(--ex-border-strong); }
.iv-pend { display: flex; flex-direction: column; gap: 5px; padding: 8px 0 4px; }
.iv-pend-ic { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; margin-bottom: 4px; color: var(--ex-text-muted); background: var(--ex-steel-soft); border: 1px solid var(--ex-border-strong); }
.iv-pend-t { font-size: 13px; font-weight: 750; color: var(--ex-text); margin: 0; }
.iv-pend-s { font-size: 12px; line-height: 1.5; color: var(--ex-text-muted); margin: 0; }
.iv-attend { display: flex; align-items: flex-start; gap: 6px; font-size: 11.5px; line-height: 1.45; color: var(--ex-text-muted); margin: 0; }
.iv-attend svg { color: var(--ex-violet); flex-shrink: 0; margin-top: 1px; }

/* letters */
.doc-row { display: flex; align-items: center; gap: 11px; width: 100%; padding: 11px 12px; border-radius: 12px; cursor: pointer; margin-bottom: 7px; font-family: inherit; text-align: left; background: var(--ex-surface); border: 1px solid var(--ex-border); color: var(--ex-text); transition: border-color 0.2s; }
.doc-row:last-child { margin-bottom: 0; }
.doc-row:hover { border-color: var(--ex-violet-border); }
.doc-seal { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.doc-meta { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.doc-meta b { font-size: 13px; font-weight: 750; }
.doc-meta i { font-size: 10.5px; font-style: normal; color: var(--ex-text-muted); }
.dr-dl { color: var(--ex-violet); flex-shrink: 0; }

/* withdraw modal */
.exm-overlay { position: fixed; inset: 0; z-index: 1440; display: grid; place-items: center; padding: 20px; background: rgba(6, 5, 10, 0.66); backdrop-filter: blur(9px); -webkit-backdrop-filter: blur(9px); }
[data-theme="light"] .exm-overlay { background: rgba(60, 45, 20, 0.34); }
.exm-sm { position: relative; overflow: hidden; width: min(420px, 96vw); border-radius: 22px; background: var(--ex-surface-elevated); border: 1px solid var(--ex-border-strong); box-shadow: var(--ex-shadow); }
.exm-aura { position: absolute; inset: -55% 20% 55% -12%; pointer-events: none; background: radial-gradient(60% 80% at 32% 0%, rgba(251, 146, 60, 0.16), transparent 70%); }
.exm-aura.warn { background: radial-gradient(60% 80% at 32% 0%, rgba(239, 68, 68, 0.16), transparent 70%); }
.exm-sm-head { position: relative; z-index: 2; display: flex; align-items: flex-start; gap: 12px; padding: 18px 20px 10px; }
.exm-sm-ico { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; color: var(--ex-blocked); background: var(--ex-blocked-soft); border: 1px solid color-mix(in srgb, var(--ex-blocked) 30%, transparent); }
.exm-sm-head h3 { font-size: 15px; font-weight: 820; margin: 0; color: var(--ex-text); }
.exm-sm-head p { font-size: 12px; color: var(--ex-text-muted); margin: 3px 0 0; line-height: 1.45; }
.exm-sm-body { position: relative; z-index: 2; padding: 4px 20px 8px; display: flex; flex-direction: column; gap: 6px; }
.fl { font-size: 11px; font-weight: 750; text-transform: uppercase; color: var(--ex-text-muted); }
.fl i { font-style: normal; text-transform: none; font-weight: 600; color: var(--ex-text-dim); margin-left: 5px; }
.exm-sm-body textarea { width: 100%; padding: 10px 12px; border-radius: 10px; font-size: 13px; font-family: inherit; background: rgba(0, 0, 0, 0.3); border: 1px solid var(--ex-border); color: var(--ex-text); resize: vertical; }
[data-theme="light"] .exm-sm-body textarea { background: rgba(255, 250, 242, 0.74); }
.exm-sm-foot { position: relative; z-index: 2; display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px 18px; }
.exm-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 15px; border-radius: 11px; font-size: 12.5px; font-weight: 750; cursor: pointer; font-family: inherit; border: none; }
.exm-btn.ghost { background: transparent; border: 1px solid var(--ex-border-strong); color: var(--ex-text-secondary); }
.exm-btn.warn { background: linear-gradient(135deg, #fca5a5, #ef4444 55%, #dc2626); color: #fff; box-shadow: 0 8px 22px -10px rgba(239, 68, 68, 0.55); }
.exm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.spin { animation: ex-spin-slow 0.8s linear infinite; }

/* ═══════════ core-component motion & signature instruments ═══════════ */
/* card-title icon gently breathes */
.ssc-h svg { animation: ssc-breathe 3.4s ease-in-out infinite; transform-origin: center; }
/* staggered entrance for the data atoms inside every card */
.ssc-facts > div, .ff-leg, .ns-chip, .clr-list li, .doc-row { animation: ssc-rise 0.5s var(--ex-spring) backwards; }
.ssc-facts > div:nth-child(1) { animation-delay: 0.05s; }
.ssc-facts > div:nth-child(2) { animation-delay: 0.11s; }
.ssc-facts > div:nth-child(3) { animation-delay: 0.17s; }
.ff-leg:nth-child(1) { animation-delay: 0.10s; }
.ff-leg:nth-child(2) { animation-delay: 0.17s; }
.ns-chip:nth-child(1) { animation-delay: 0.06s; } .ns-chip:nth-child(2) { animation-delay: 0.12s; } .ns-chip:nth-child(3) { animation-delay: 0.18s; }
.clr-list li:nth-child(1) { animation-delay: 0.05s; } .clr-list li:nth-child(2) { animation-delay: 0.10s; } .clr-list li:nth-child(3) { animation-delay: 0.15s; }
.clr-list li:nth-child(4) { animation-delay: 0.20s; } .clr-list li:nth-child(5) { animation-delay: 0.25s; } .clr-list li:nth-child(n+6) { animation-delay: 0.30s; }
@keyframes ssc-rise { from { opacity: 0; transform: translateY(9px); } to { opacity: 1; transform: translateY(0); } }
@keyframes ssc-breathe { 0%, 100% { opacity: 0.78; transform: scale(1); } 50% { opacity: 1; transform: scale(1.12); } }
@keyframes ssc-shine { 0% { transform: translateX(-120%); } 55%, 100% { transform: translateX(230%); } }

/* manager-decision banners: a soft brand sweep across the pill */
.mgr-banner { position: relative; overflow: hidden; }
.mgr-banner.ok::after, .mgr-banner.wait::after { content: ''; position: absolute; inset: 0; pointer-events: none; transform: translateX(-120%); animation: ssc-shine 3.4s ease-in-out infinite; }
.mgr-banner.ok::after { background: linear-gradient(110deg, transparent 38%, color-mix(in srgb, var(--ex-cleared) 34%, transparent) 50%, transparent 62%); }
.mgr-banner.wait::after { background: linear-gradient(110deg, transparent 38%, color-mix(in srgb, var(--ex-amber) 32%, transparent) 50%, transparent 62%); }

/* clearance — live dots pulse by state + ring keeps a continuous glow */
.clr-list li.st-in_progress .cl-dot, .clr-list li.st-blocked .cl-dot { animation: ssc-dot 1.7s ease-in-out infinite; }
@keyframes ssc-dot { 0%, 100% { box-shadow: 0 0 4px currentColor; } 50% { box-shadow: 0 0 11px currentColor, 0 0 18px currentColor; } }
.clr-ring-glow { position: absolute; inset: -3px; border-radius: 50%; pointer-events: none; animation: ssc-ring-pulse 2.8s ease-in-out infinite; }
@keyframes ssc-ring-pulse { 0%, 100% { box-shadow: 0 0 8px -2px color-mix(in srgb, var(--ex-cleared) 48%, transparent); } 50% { box-shadow: 0 0 17px 0 color-mix(in srgb, var(--ex-cleared) 62%, transparent); } }
.cl-act { position: relative; overflow: hidden; }
.cl-act::after { content: ''; position: absolute; inset: 0; pointer-events: none; transform: translateX(-130%); background: linear-gradient(110deg, transparent 40%, rgba(255, 255, 255, 0.35) 50%, transparent 60%); animation: ssc-shine 3.6s ease-in-out infinite; }

/* document link — secure scan beam over the link field */
.dl-field { position: relative; flex: 1; min-width: 0; overflow: hidden; border-radius: 10px; }
.dl-field .dl-input { width: 100%; flex: none; }
.dl-beam { position: absolute; top: 0; bottom: 0; left: -45%; width: 42%; pointer-events: none;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--ex-violet) 24%, transparent), transparent); animation: dl-scan 3.6s ease-in-out infinite; }
@keyframes dl-scan { 0% { left: -45%; } 60%, 100% { left: 116%; } }
.dl-sec svg { animation: ssc-breathe 3s ease-in-out infinite; }

/* F&F — proportional earnings ⇄ recoveries balance bar */
.ff-balance { position: relative; display: flex; height: 9px; margin-top: 11px; border-radius: 999px; overflow: hidden; background: var(--ex-steel-soft); border: 1px solid var(--ex-border); }
.ffb { height: 100%; transition: width 0.9s var(--ex-spring); }
.ffb.earn { background: linear-gradient(90deg, #10b981, #34d399); box-shadow: 0 0 10px -2px rgba(52, 211, 153, 0.5); }
.ffb.rec { background: linear-gradient(90deg, #ef4444, #f87171); box-shadow: 0 0 10px -2px rgba(239, 68, 68, 0.5); }
.ffb-sweep { position: absolute; top: 0; bottom: 0; left: -42%; width: 40%; pointer-events: none; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.45), transparent); animation: dl-scan 3s linear infinite; }
.ff-net-val { display: inline-block; }

/* interview — pending icon breathes */
.iv-pend-ic { animation: ssc-breathe 2.6s ease-in-out infinite; }

/* letters — download arrow nudges down on hover */
.dr-dl { transition: transform 0.25s var(--ex-spring); }
.doc-row:hover .dr-dl { transform: translateY(2px); }

@media (max-width: 860px) { .sse-hero { grid-template-columns: 1fr; } .sse-stats { grid-template-columns: repeat(2, 1fr); } .sse-grid { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) {
  .spin, .sse-aura, .med-spin, .sh,
  .ssc-h svg, .ssc-facts > div, .ff-leg, .ns-chip, .clr-list li, .doc-row,
  .mgr-banner.ok::after, .mgr-banner.wait::after, .cl-dot, .clr-ring-glow, .cl-act::after,
  .dl-beam, .dl-sec svg, .ffb-sweep, .iv-pend-ic { animation: none !important; }
  .stat, .doc-row, .med-ring, .clr-ring, .ffb, .dr-dl { transition: none; }
}
</style>
