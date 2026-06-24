<template>
  <div class="tex">
    <!-- hero -->
    <section class="tex-hero ex-grain">
      <span class="tex-aura" aria-hidden="true" />
      <div class="tex-hero-body">
        <Motion as="span" class="tex-eye" :initial="{ y: -8, opacity: 0 }" :animate="{ y: 0, opacity: 1 }" :transition="{ duration: 0.45 }">
          <span class="tex-dot" /> Manager · two-stage separation review
        </Motion>
        <Motion as="h1" class="tex-title" :initial="{ y: 8, opacity: 0 }" :animate="{ y: 0, opacity: 1 }" :transition="{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }">
          {{ greeting }}, <span class="tex-grad">{{ verb }}</span>
        </Motion>
        <Motion as="p" class="tex-sub" :initial="{ y: 8, opacity: 0 }" :animate="{ y: 0, opacity: 1 }" :transition="{ duration: 0.55, delay: 0.14 }">
          A resignation lands here the moment a direct report files it. Endorse it and it moves to HR for formal acceptance — reject it and it stops here with your written reason.
        </Motion>

        <div class="tex-stats">
          <Motion as="article" class="tstat pending" :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.22 }">
            <span class="tstat-eye">Pending decisions</span>
            <span class="tstat-num">{{ pending.length }}</span>
            <span class="tstat-sub">awaiting your call</span>
            <span class="tstat-pulse" />
          </Motion>
          <Motion as="article" class="tstat" :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.28 }">
            <span class="tstat-eye">Oldest open</span>
            <span class="tstat-num">{{ oldest.value }}<small class="tstat-unit">{{ oldest.unit }}</small></span>
            <span class="tstat-sub">{{ oldest.note }}</span>
          </Motion>
          <Motion as="article" class="tstat" :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.34 }">
            <span class="tstat-eye">Decided this session</span>
            <span class="tstat-num"><span class="d-ok">{{ session.approved }}</span><span class="d-sep">/</span><span class="d-no">{{ session.rejected }}</span></span>
            <span class="tstat-sub">endorsed · rejected</span>
          </Motion>
        </div>
      </div>
    </section>

    <!-- queue -->
    <header class="tex-head">
      <div class="tex-head-meta">
        <span class="tex-head-eye"><span class="tex-dot" /> Live queue</span>
        <h2 class="tex-head-title">Pending separation endorsements</h2>
      </div>
      <button class="tex-refresh" :disabled="loading" @click="reload"><RefreshCw :size="13" :class="{ spin: loading }" /> Refresh</button>
    </header>

    <div v-if="loading && !cases.length" class="tex-grid">
      <div v-for="i in 2" :key="i" class="tex-skel ex-grain"><span class="tex-skel-sh" /></div>
    </div>

    <Motion v-else-if="!pending.length && !handoverCases.length" as="div" class="tex-empty ex-grain"
      :initial="{ opacity: 0, scale: 0.94 }" :animate="{ opacity: 1, scale: 1 }" :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
      <span class="te-aura" /><span class="te-ring r1" /><span class="te-ring r2" />
      <DoorClosed :size="42" class="te-ic" />
      <div class="te-title">{{ cases.length ? 'No separations awaiting you' : 'No team separations yet' }}</div>
      <div class="te-sub">When a direct report files a resignation, it appears here for your endorsement before HR’s final acceptance.</div>
    </Motion>

    <TransitionGroup v-else name="tex-card" tag="div" class="tex-grid">
      <article v-for="(c, i) in pending" :key="c.id" class="tcard ex-grain" :class="{ decided: decided[c.id], rejecting: rejectId === c.id }"
        :style="{ '--i': i }">
        <span class="tcard-spine" :style="{ '--c': statusHex(c) }" />
        <span v-if="decided[c.id]" class="tcard-wash" :class="decided[c.id]">{{ decided[c.id] === 'APPROVED' ? 'ENDORSED' : 'REJECTED' }}</span>

        <header class="tcard-head">
          <span class="tcard-ava" :style="{ '--c': typeMeta(c).hex }">{{ initials(c.employee_name) }}</span>
          <div class="tcard-id">
            <span class="tcard-name">{{ c.employee_name || c.employee_code || '—' }}</span>
            <span class="tcard-meta ex-mono">{{ c.case_number }} · {{ c.department_name || c.designation_name || '—' }}</span>
          </div>
          <span class="tcard-type" :style="{ '--c': typeMeta(c).hex }"><component :is="typeMeta(c).icon" :size="12" /> {{ typeMeta(c).label }}</span>
        </header>

        <div class="tcard-route">
          <div class="rt-end">
            <span class="rt-k">Filed</span>
            <span class="rt-v">{{ fmtDate(c.resignation_date) }}</span>
          </div>
          <div class="rt-track"><span class="rt-dot" /><span class="rt-line" /><span class="rt-plane"><Plane :size="12" /></span></div>
          <div class="rt-end right">
            <span class="rt-k">Requested LWD</span>
            <span class="rt-v">{{ c.requested_last_working_date ? fmtDate(c.requested_last_working_date) : '—' }}</span>
          </div>
        </div>

        <div class="tcard-chips">
          <span v-if="c.reason_category" class="tcard-chip"><component :is="reasonMeta(c.reason_category).icon" :size="11" /> {{ reasonMeta(c.reason_category).label }}</span>
          <span v-if="c.notice_period_days != null" class="tcard-chip soft"><CalendarClock :size="11" /> {{ c.notice_period_days }}d notice</span>
        </div>
        <p v-if="c.reason_detail" class="tcard-quote">“{{ c.reason_detail }}”</p>

        <transition name="tex-rsn">
          <textarea v-if="rejectId === c.id" v-model="rejectNote" rows="2" maxlength="1000"
            class="tcard-reason" placeholder="Reason for rejecting (shared with the employee + HR)…" />
        </transition>

        <footer class="tcard-foot">
          <span class="tcard-age ex-mono"><Clock :size="11" /> applied {{ ago(c.created_at) }}</span>
          <div class="tcard-acts">
            <template v-if="rejectId === c.id">
              <button class="tbtn ghost" :disabled="busy[c.id]" @click="cancelReject">Back</button>
              <button class="tbtn danger" :disabled="busy[c.id] || rejectNote.trim().length < 3" @click="confirmReject(c)"><X :size="13" /> Confirm reject</button>
            </template>
            <template v-else>
              <button class="tbtn ghost danger-ghost" :disabled="busy[c.id]" @click="startReject(c)"><X :size="13" /> Reject</button>
              <button class="tbtn primary" :disabled="busy[c.id]" @click="approve(c)">
                <Loader2 v-if="busy[c.id] === 'approve'" :size="13" class="spin" /><Check v-else :size="13" /> Endorse → HR
              </button>
            </template>
          </div>
        </footer>
      </article>
    </TransitionGroup>

    <!-- ───────── Handover sign-off (post-acceptance: MANAGER + PROJECT lanes) ───────── -->
    <template v-if="handoverCases.length">
      <header class="tex-head tex-head-sep">
        <div class="tex-head-meta">
          <span class="tex-head-eye"><span class="tex-dot" /> Handover</span>
          <h2 class="tex-head-title">Work &amp; project handover sign-off</h2>
        </div>
        <span v-if="pendingSignoffCount" class="tex-ho-badge">{{ pendingSignoffCount }} awaiting you</span>
      </header>

      <div class="tex-grid">
        <article v-for="(c, i) in handoverCases" :key="'ho-' + c.id" class="tcard ex-grain" :style="{ '--i': i }">
          <span class="tcard-spine" :style="{ '--c': statusHex(c) }" />
          <header class="tcard-head">
            <span class="tcard-ava" :style="{ '--c': typeMeta(c).hex }">{{ initials(c.employee_name) }}</span>
            <div class="tcard-id">
              <span class="tcard-name">{{ c.employee_name || c.employee_code || '—' }}</span>
              <span class="tcard-meta ex-mono">{{ c.case_number }} · {{ caseStatusMeta(c.status).label }}</span>
            </div>
            <span class="tcard-prog ex-mono">{{ clr(c).progress_pct || 0 }}%</span>
          </header>

          <ul class="ho-lanes">
            <li v-for="lane in clr(c).items" :key="lane.id" class="ho-lane" :class="`st-${lane.status.toLowerCase()}`">
              <div class="ho-lane-head">
                <span class="ho-lane-ttl">{{ lane.title }}</span>
                <span class="ho-pill" :style="{ '--c': clearanceStatusMeta(lane.status).hex }">{{ clearanceStatusMeta(lane.status).label }}</span>
              </div>

              <div v-if="lane.submission && lane.submission.submitted_at" class="ho-sub">
                <span v-if="laneStepsDone(lane)" class="ho-meta"><ListChecks :size="11" /> {{ laneStepsDone(lane) }}</span>
                <span v-if="lane.submission.successor_name" class="ho-meta"><UserRoundCheck :size="11" /> Successor: {{ lane.submission.successor_name }}</span>
                <p v-if="lane.submission.notes" class="ho-notes">{{ lane.submission.notes }}</p>
              </div>
              <p v-else class="ho-empty"><Info :size="11" /> {{ employeeFirst(c) }} hasn't submitted this handover yet.</p>

              <template v-if="lane.status !== 'CLEARED'">
                <transition name="tex-rsn">
                  <textarea v-if="sendBackId === lane.id" v-model="sendBackNote" rows="2" maxlength="2000"
                    class="tcard-reason" placeholder="What needs fixing before you can sign off? (shared with the employee)…" />
                </transition>
                <div class="ho-acts">
                  <template v-if="sendBackId === lane.id">
                    <button class="tbtn ghost" :disabled="signBusy[lane.id]" @click="sendBackId = null">Back</button>
                    <button class="tbtn danger" :disabled="signBusy[lane.id] || sendBackNote.trim().length < 3" @click="doSignoff(c, lane, 'BLOCKED', sendBackNote)"><Undo2 :size="12" /> Send back</button>
                  </template>
                  <template v-else>
                    <button class="tbtn ghost danger-ghost" :disabled="signBusy[lane.id] || !lane.submission" @click="startSendBack(lane)"><Undo2 :size="12" /> Send back</button>
                    <button class="tbtn primary" :disabled="signBusy[lane.id]" @click="doSignoff(c, lane, 'CLEARED', null)">
                      <Loader2 v-if="signBusy[lane.id]" :size="12" class="spin" /><Check v-else :size="12" /> Sign off
                    </button>
                  </template>
                </div>
              </template>
              <div v-else class="ho-cleared"><BadgeCheck :size="12" /> Cleared{{ lane.signed_off_by_name ? ' · ' + lane.signed_off_by_name : '' }}</div>
            </li>
          </ul>
        </article>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  RefreshCw, Check, X, Loader2, Plane, Clock, CalendarClock, DoorClosed,
  Undo2, ListChecks, UserRoundCheck, BadgeCheck, Info,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import {
  fetchMyTeamCases, myTeamDecision, caseStatusMeta, resignationTypeMeta, reasonMeta,
  fetchTeamCaseClearance, managerSignoffClearance, clearanceItemPlaybook, clearanceStatusMeta,
  fmtDate, initials, errText,
} from '@/composables/useExit'

const emit = defineEmits(['count', 'go'])
const toast = useToast()

const cases = ref([])
const loading = ref(false)
const busy = reactive({})        // id → 'approve' | 'reject'
const decided = reactive({})     // id → 'APPROVED' | 'REJECTED' (exit wash)
const session = reactive({ approved: 0, rejected: 0 })
const rejectId = ref(null)
const rejectNote = ref('')

// ── handover sign-off (post-acceptance MANAGER + PROJECT lanes) ──
const HANDOVER_WINDOW = ['ACCEPTED', 'NOTICE_PERIOD', 'CLEARANCE']
const clearanceMap = reactive({})   // caseId → { items, progress_pct, in_window }
const signBusy = reactive({})       // laneId → bool
const sendBackId = ref(null)
const sendBackNote = ref('')

const pending = computed(() => cases.value.filter(c => c.status === 'MANAGER_REVIEW' && !decided[c.id]).concat(
  cases.value.filter(c => c.status === 'MANAGER_REVIEW' && decided[c.id])))
const statusHex = (c) => caseStatusMeta(c.status).hex
const typeMeta = (c) => resignationTypeMeta(c.resignation_type)

const windowCases = computed(() => cases.value.filter(c => HANDOVER_WINDOW.includes(c.status)))
const clr = (c) => clearanceMap[c.id] || { items: [], progress_pct: c.clearance_progress_pct || 0 }
const handoverCases = computed(() => windowCases.value.filter(c => {
  const items = clr(c).items || []
  return items.length && items.some(l => l.status !== 'CLEARED')
}))
const pendingSignoffCount = computed(() => {
  let n = 0
  for (const c of windowCases.value) for (const l of (clr(c).items || [])) if (l.status === 'IN_PROGRESS') n++
  return n
})
const liveCount = computed(() => pending.value.filter(c => !decided[c.id]).length)
const totalCount = computed(() => liveCount.value + pendingSignoffCount.value)
const employeeFirst = (c) => (c.employee_name || 'The employee').split(' ')[0]
const laneStepsDone = (lane) => {
  const pb = clearanceItemPlaybook(lane.item_key, lane.department)
  const total = pb.steps?.length || 0
  if (!total) return ''
  const done = Object.values(lane.submission?.checklist || {}).filter(Boolean).length
  return `${done}/${total} steps confirmed`
}

watch(totalCount, (n) => emit('count', n), { immediate: false })

const firstName = computed(() => {
  try { const u = JSON.parse(localStorage.getItem('user') || 'null'); return (u?.full_name || u?.email || '').split(' ')[0] || 'manager' }
  catch { return 'manager' }
})
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 5) return `Late night, ${firstName.value}`
  if (h < 12) return `Good morning, ${firstName.value}`
  if (h < 17) return `Good afternoon, ${firstName.value}`
  return `Good evening, ${firstName.value}`
})
const verb = computed(() => liveCount.value === 0 ? 'your team is settled' : liveCount.value === 1 ? '1 separation needs your call' : `${liveCount.value} separations need your call`)

const ago = (iso) => {
  if (!iso) return '—'
  const h = (Date.now() - new Date(iso).getTime()) / 3600000
  if (h < 1) return `${Math.max(1, Math.floor(h * 60))}m ago`
  if (h < 24) return `${Math.floor(h)}h ago`
  if (h < 24 * 7) return `${Math.floor(h / 24)}d ago`
  return `${Math.floor(h / (24 * 7))}w ago`
}
const oldest = computed(() => {
  const live = pending.value.filter(c => !decided[c.id])
  if (!live.length) return { value: '0', unit: 'h', note: 'all clear' }
  const t = live.reduce((acc, c) => { const x = new Date(c.created_at).getTime(); return acc === null || x < acc ? x : acc }, null)
  const h = (Date.now() - t) / 3600000
  if (h < 1) return { value: Math.max(1, Math.floor(h * 60)), unit: 'm', note: 'just now' }
  if (h < 48) return { value: Math.floor(h), unit: 'h', note: h >= 24 ? 'over a day' : 'today' }
  return { value: Math.floor(h / 24), unit: 'd', note: 'overdue' }
})

const loadClearances = async () => {
  // Pull handover lanes for every post-acceptance case so we can show sign-off
  // cards + an accurate "awaiting you" count. The /team/cases list doesn't carry
  // clearance items, so this is a parallel fan-out over the window cases.
  await Promise.all(windowCases.value.map(async (c) => {
    try { clearanceMap[c.id] = await fetchTeamCaseClearance(c.id) }
    catch { /* leave unset — card just won't show */ }
  }))
  emit('count', totalCount.value)
}

const reload = async () => {
  loading.value = true
  try {
    cases.value = (await fetchMyTeamCases())?.items || []
    await loadClearances()
  }
  catch (e) { toast.error(errText(e, 'Failed to load team separations')) }
  finally { loading.value = false; emit('count', totalCount.value) }
}
onMounted(reload)

const startReject = (c) => { rejectId.value = c.id; rejectNote.value = '' }
const cancelReject = () => { rejectId.value = null; rejectNote.value = '' }

const decide = async (c, decision, notes) => {
  busy[c.id] = decision === 'APPROVED' ? 'approve' : 'reject'
  try {
    await myTeamDecision(c.id, decision, notes || null)
    if (decision === 'APPROVED') session.approved += 1; else session.rejected += 1
    decided[c.id] = decision
    emit('count', totalCount.value)
    toast.success(decision === 'APPROVED'
      ? `Endorsed — ${c.employee_name || 'case'} moves to HR.`
      : `Rejected — ${c.employee_name || 'the employee'} will be notified.`)
    setTimeout(() => { cases.value = cases.value.filter(x => x.id !== c.id); delete decided[c.id]; delete busy[c.id]; emit('count', totalCount.value) }, 1000)
  } catch (e) {
    delete busy[c.id]
    toast.error(errText(e, 'Failed to record decision'))
  }
}
const approve = (c) => decide(c, 'APPROVED', null)
const confirmReject = (c) => { const n = rejectNote.value.trim(); rejectId.value = null; decide(c, 'REJECTED', n) }

// handover lane sign-off / send-back
const startSendBack = (lane) => { sendBackId.value = lane.id; sendBackNote.value = '' }
const doSignoff = async (c, lane, decision, note) => {
  signBusy[lane.id] = true
  try {
    await managerSignoffClearance(c.id, lane.id, decision, (note && note.trim()) || null)
    clearanceMap[c.id] = await fetchTeamCaseClearance(c.id)   // refresh lanes + progress
    sendBackId.value = null; sendBackNote.value = ''
    toast.success(decision === 'CLEARED'
      ? `Signed off — ${lane.title}`
      : `Sent back to ${employeeFirst(c)} for rework.`)
    emit('count', totalCount.value)
  } catch (e) { toast.error(errText(e, 'Could not record sign-off')) }
  finally { signBusy[lane.id] = false }
}
</script>

<style scoped>
@import '@/styles/exit-theme.css';

.tex { display: flex; flex-direction: column; gap: 20px; color: var(--ex-text); }

/* hero */
.tex-hero { position: relative; overflow: hidden; padding: 28px 30px; border-radius: 22px;
  background: var(--ex-surface-elevated); border: 1px solid var(--ex-border); box-shadow: var(--ex-shadow); }
.tex-aura { position: absolute; inset: -45% 30% 45% -10%; pointer-events: none;
  background: radial-gradient(60% 80% at 18% 0%, rgba(251, 146, 60, 0.18), transparent 70%); animation: ex-aura-drift 11s ease-in-out infinite; }
.tex-hero-body { position: relative; display: flex; flex-direction: column; gap: 7px; }
.tex-eye { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ex-violet); }
.tex-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--ex-violet); box-shadow: 0 0 8px var(--ex-violet); animation: ex-gate-light 1.8s ease-in-out infinite; }
.tex-title { margin: 6px 0 0; font-size: clamp(24px, 3.4vw, 32px); font-weight: 900; letter-spacing: -0.02em; line-height: 1.12; color: var(--ex-text); }
.tex-grad { background: var(--ex-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.tex-sub { margin: 8px 0 0; font-size: 13px; line-height: 1.6; max-width: 720px; color: var(--ex-text-secondary); }

.tex-stats { margin-top: 22px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 13px; }
.tstat { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 3px; padding: 15px 17px; border-radius: 15px;
  background: var(--ex-surface); border: 1px solid var(--ex-border); }
.tstat-eye { font-size: 9px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ex-text-muted); }
.tstat-num { font-size: 30px; font-weight: 900; letter-spacing: -0.025em; color: var(--ex-text); line-height: 1; display: flex; align-items: baseline; gap: 4px; }
.tstat-unit { font-size: 13px; font-weight: 700; color: var(--ex-text-muted); }
.tstat-sub { margin-top: 3px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ex-text-muted); }
.tstat.pending { background: linear-gradient(135deg, var(--ex-violet-soft), var(--ex-surface)); border-color: var(--ex-violet-border); }
.tstat.pending .tstat-num { background: var(--ex-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.tstat-pulse { position: absolute; right: -36px; top: -36px; width: 110px; height: 110px; border-radius: 50%;
  background: radial-gradient(circle, rgba(251, 146, 60, 0.28), transparent 70%); animation: tex-pulse 3.4s ease-in-out infinite; pointer-events: none; }
.d-ok { color: var(--ex-cleared); } .d-no { color: var(--ex-blocked); } .d-sep { color: var(--ex-text-dim); margin: 0 6px; }

/* queue head */
.tex-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.tex-head-meta { display: flex; flex-direction: column; gap: 4px; }
.tex-head-eye { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ex-violet); }
.tex-head-title { margin: 0; font-size: 21px; font-weight: 850; letter-spacing: -0.015em; color: var(--ex-text); }
.tex-refresh { display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border-radius: 10px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 700;
  background: var(--ex-surface); border: 1px solid var(--ex-border-strong); color: var(--ex-text-secondary); }
.spin { animation: ex-spin-slow 0.9s linear infinite; }

.tex-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 15px; }

/* skeleton */
.tex-skel { position: relative; overflow: hidden; height: 230px; border-radius: 18px; background: var(--ex-surface); border: 1px solid var(--ex-border); }
.tex-skel-sh { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(251, 146, 60, 0.08) 50%, transparent 70%); animation: ex-sheen-pass 1.5s ease-in-out infinite; }

/* empty */
.tex-empty { position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; gap: 9px; text-align: center; padding: 56px 28px; border-radius: 22px;
  background: var(--ex-surface); border: 1px dashed var(--ex-violet-border); }
.te-aura { position: absolute; top: 30px; width: 130px; height: 130px; border-radius: 50%; background: radial-gradient(circle, rgba(251, 146, 60, 0.26), transparent 70%); filter: blur(18px); animation: tex-pulse 4s ease-in-out infinite; }
.te-ring { position: absolute; top: 44px; width: 70px; height: 70px; border-radius: 50%; border: 1.5px solid var(--ex-violet-border); animation: te-ring 3s ease-out infinite; }
.te-ring.r2 { animation-delay: 1.5s; }
.te-ic { position: relative; color: var(--ex-violet); filter: drop-shadow(0 0 14px rgba(251, 146, 60, 0.45)); margin-bottom: 4px; }
.te-title { position: relative; font-size: 16px; font-weight: 850; color: var(--ex-text); }
.te-sub { position: relative; font-size: 12.5px; line-height: 1.55; color: var(--ex-text-muted); max-width: 400px; }

/* card */
.tcard { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 11px; padding: 15px 17px 13px 19px; border-radius: 18px;
  background: var(--ex-surface); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow);
  animation: ex-deal 0.5s var(--ex-spring) backwards; animation-delay: calc(var(--i) * 0.05s); transition: border-color 0.3s, transform 0.3s; }
.tcard:hover { border-color: var(--ex-violet-border); transform: translateY(-2px); }
.tcard.rejecting { border-color: color-mix(in srgb, var(--ex-blocked) 40%, transparent); }
.tcard-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--c); box-shadow: 0 0 12px -1px var(--c); }
.tcard-wash { position: absolute; inset: 0; z-index: 3; display: grid; place-items: center; font-size: 22px; font-weight: 900; letter-spacing: 0.16em;
  backdrop-filter: blur(2px); animation: tex-wash 1s ease forwards; }
.tcard-wash.APPROVED { color: var(--ex-cleared); background: color-mix(in srgb, var(--ex-cleared) 14%, transparent); }
.tcard-wash.REJECTED { color: var(--ex-blocked); background: color-mix(in srgb, var(--ex-blocked) 14%, transparent); }

.tcard-head { display: flex; align-items: center; gap: 11px; }
.tcard-ava { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 12px; flex-shrink: 0; font-size: 13px; font-weight: 850;
  color: var(--c); background: color-mix(in srgb, var(--c) 15%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.tcard-id { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.tcard-name { font-size: 14px; font-weight: 800; color: var(--ex-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tcard-meta { font-size: 10.5px; color: var(--ex-text-muted); }
.tcard-type { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; flex-shrink: 0;
  color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); border: 1px solid color-mix(in srgb, var(--c) 28%, transparent); }

.tcard-route { display: flex; align-items: center; gap: 12px; padding: 11px 13px; border-radius: 13px; background: var(--ex-panel); border: 1px solid var(--ex-border); }
.rt-end { display: flex; flex-direction: column; gap: 2px; }
.rt-end.right { text-align: right; }
.rt-k { font-size: 8.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ex-text-dim); }
.rt-v { font-size: 13px; font-weight: 800; color: var(--ex-text); }
.rt-track { position: relative; flex: 1; height: 14px; display: flex; align-items: center; }
.rt-line { flex: 1; height: 0; border-top: 1.5px dashed var(--ex-violet-border); }
.rt-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--ex-violet); box-shadow: 0 0 6px var(--ex-violet); flex-shrink: 0; }
.rt-plane { position: absolute; right: -2px; top: 50%; transform: translateY(-50%); color: var(--ex-amber-bright); }

.tcard-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.tcard-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.tcard-chip.soft { color: var(--ex-text-muted); background: var(--ex-steel-soft); border-color: var(--ex-border); }
.tcard-quote { margin: 0; font-size: 12px; font-style: italic; line-height: 1.5; color: var(--ex-text-secondary); padding: 8px 11px; border-left: 2px solid var(--ex-violet-border); background: var(--ex-violet-soft); border-radius: 0 9px 9px 0; }
.tcard-reason { width: 100%; padding: 9px 11px; border-radius: 10px; font: inherit; font-size: 12.5px; resize: vertical; color: var(--ex-text);
  background: rgba(0, 0, 0, 0.3); border: 1px solid color-mix(in srgb, var(--ex-blocked) 30%, transparent); outline: none; }
.tcard-reason:focus { border-color: var(--ex-blocked); box-shadow: 0 0 0 3px var(--ex-blocked-soft); }
[data-theme="light"] .tcard-reason { background: rgba(255, 250, 242, 0.72); }

.tcard-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 2px; padding-top: 11px; border-top: 1px dashed var(--ex-border); }
.tcard-age { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--ex-text-muted); }
.tcard-acts { display: flex; gap: 8px; }
.tbtn { display: inline-flex; align-items: center; gap: 5px; padding: 8px 13px; border-radius: 10px; cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 750; border: 1px solid transparent; }
.tbtn.ghost { background: var(--ex-surface); border-color: var(--ex-border-strong); color: var(--ex-text-secondary); }
.tbtn.danger-ghost { color: var(--ex-blocked); border-color: color-mix(in srgb, var(--ex-blocked) 30%, transparent); }
.tbtn.danger { border: none; color: #fff; background: linear-gradient(135deg, #ef4444, #b91c1c); }
.tbtn.primary { border: none; color: #1a1206; background: var(--ex-grad-hero); }
.tbtn:disabled { opacity: 0.55; cursor: not-allowed; }

/* handover sign-off */
.tex-head-sep { margin-top: 6px; padding-top: 18px; border-top: 1px dashed var(--ex-border); }
.tex-ho-badge { display: inline-flex; align-items: center; font-size: 11.5px; font-weight: 750; padding: 5px 12px; border-radius: 999px;
  color: var(--ex-amber); background: var(--ex-amber-soft); border: 1px solid var(--ex-amber-border); }
.tcard-prog { margin-left: auto; flex-shrink: 0; font-size: 13px; font-weight: 850; color: var(--ex-cleared); }
.ho-lanes { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 9px; }
.ho-lane { display: flex; flex-direction: column; gap: 7px; padding: 11px 12px; border-radius: 13px; background: var(--ex-panel); border: 1px solid var(--ex-border); }
.ho-lane.st-in_progress { border-color: var(--ex-amber-border); }
.ho-lane.st-blocked { border-color: color-mix(in srgb, var(--ex-blocked) 32%, transparent); }
.ho-lane.st-cleared { border-color: color-mix(in srgb, var(--ex-cleared) 32%, transparent); }
.ho-lane-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ho-lane-ttl { font-size: 12.5px; font-weight: 800; color: var(--ex-text); }
.ho-pill { display: inline-flex; align-items: center; font-size: 9.5px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; padding: 3px 9px; border-radius: 999px;
  color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.ho-sub { display: flex; flex-direction: column; gap: 5px; }
.ho-meta { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 650; color: var(--ex-text-secondary); }
.ho-meta svg { color: var(--ex-violet); flex-shrink: 0; }
.ho-notes { margin: 0; font-size: 12px; line-height: 1.5; color: var(--ex-text-secondary); white-space: pre-wrap;
  padding: 8px 10px; border-radius: 9px; background: var(--ex-surface); border: 1px solid var(--ex-border); }
.ho-empty { display: inline-flex; align-items: center; gap: 6px; margin: 0; font-size: 11.5px; color: var(--ex-text-muted); }
.ho-empty svg { color: var(--ex-text-dim); flex-shrink: 0; }
.ho-acts { display: flex; justify-content: flex-end; gap: 8px; }
.ho-acts .tbtn { padding: 6px 11px; font-size: 11.5px; }
.ho-cleared { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 750; color: var(--ex-cleared); }

@keyframes tex-pulse { 0%, 100% { transform: scale(0.85); opacity: 0.45; } 50% { transform: scale(1.15); opacity: 1; } }
@keyframes te-ring { 0% { transform: scale(0.5); opacity: 0.85; } 100% { transform: scale(1.55); opacity: 0; } }
@keyframes tex-wash { 0% { opacity: 0; } 25% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; } }
.tex-rsn-enter-active, .tex-rsn-leave-active { transition: opacity 0.25s, transform 0.25s; }
.tex-rsn-enter-from, .tex-rsn-leave-to { opacity: 0; transform: translateY(-4px); }
.tex-card-leave-active { transition: opacity 0.5s var(--ex-spring), transform 0.5s var(--ex-spring); position: absolute; }
.tex-card-leave-to { opacity: 0; transform: scale(0.92) translateY(-12px); }
.tex-card-move { transition: transform 0.5s var(--ex-spring); }

@media (max-width: 760px) { .tex-stats { grid-template-columns: 1fr; } .tex-grid { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) {
  .tex-aura, .tex-dot, .tstat-pulse, .te-aura, .te-ring, .spin, .tcard, .tcard-wash { animation: none !important; }
  .tcard:hover { transform: none; }
}
</style>
