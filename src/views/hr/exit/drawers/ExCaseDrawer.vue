<template>
  <Teleport to="body">
    <Presence>
      <div v-if="open" class="exd-scrim" @mousedown.self="$emit('close')">
        <Motion ref="rootEl" as="aside" class="exd ex-grain" :style="{ '--accent': accent }"
          :initial="{ x: '100%' }" :animate="{ x: 0 }"
          :exit="{ x: '100%' }" :transition="{ duration: 0.46, ease: [0.16, 1, 0.3, 1] }">
          <span class="exd-aura" aria-hidden="true" />
          <span class="exd-spot" aria-hidden="true" />
          <span class="exd-scan" aria-hidden="true" />

          <!-- ── hero header ─────────────────────────────────────────── -->
          <header class="exd-head">
            <div class="exd-medal" :class="`st-${(detail?.status || 'draft').toLowerCase()}`">
              <span class="medal-ring" aria-hidden="true" />
              <span class="medal-txt">{{ initials(detail?.employee_name || detail?.employee_code) }}</span>
            </div>
            <div class="exd-id">
              <span class="exd-num ex-mono">{{ detail?.case_number || '…' }}</span>
              <h3 class="exd-name">{{ detail?.employee_name || detail?.employee_code || 'Loading…' }}</h3>
              <span class="exd-role">{{ [detail?.designation_name, detail?.department_name].filter(Boolean).join(' · ') || '—' }}</span>
            </div>
            <button class="exd-x" @click="$emit('close')" type="button"><X :size="18" /></button>
            <div v-if="detail" class="exd-chips">
              <ExStatusPill :status="detail.status" />
              <span class="exd-chip"><component :is="initBy.icon" :size="11" /> {{ initBy.label }}</span>
              <span v-if="detail.eligible_for_rehire != null" class="exd-chip" :class="detail.eligible_for_rehire ? 'good' : 'bad'">
                <RotateCcw :size="11" /> {{ detail.eligible_for_rehire ? 'Rehire OK' : 'No rehire' }}</span>
              <span v-if="detail.lifecycle_state" class="exd-chip"><Activity :size="11" /> {{ prettyState(detail.lifecycle_state) }}</span>
            </div>
          </header>

          <div v-if="loading" class="exd-loading"><Loader2 :size="22" class="spin" /> Loading case…</div>

          <template v-else-if="detail">
            <!-- lifecycle warning -->
            <div v-if="detail.lifecycle_consistent === false" class="exd-warn">
              <AlertTriangle :size="14" /> Workflow & employee lifecycle are out of sync — review before proceeding.
            </div>

            <!-- procession -->
            <div class="exd-proc-wrap"><ExitProcession mode="single" :state="stage" @pick="onStagePick" /></div>

            <!-- quick stat strip -->
            <div class="exd-stats">
              <button class="qs" :class="{ over: noticeOverdue }" @click="$emit('go', { tab: 'notice' })" type="button">
                <span class="qs-ico"><CalendarClock :size="14" /></span>
                <span class="qs-b"><span class="qs-v ex-mono"><ExCountUp :value="Math.abs(noticeDays ?? 0)" /><i>{{ noticeUnit }}</i></span><span class="qs-l">notice</span></span>
              </button>
              <button class="qs" @click="$emit('go', { tab: 'clearance' })" type="button">
                <span class="qs-ico"><ClipboardCheck :size="14" /></span>
                <span class="qs-b"><span class="qs-v ex-mono"><ExCountUp :value="detail.clearance_progress_pct || 0" :suffix="'%'" /></span><span class="qs-l">clearance</span></span>
              </button>
              <button class="qs" @click="$emit('go', { tab: 'settlement' })" type="button">
                <span class="qs-ico"><Scale :size="14" /></span>
                <span class="qs-b"><span class="qs-v ex-mono" :class="netClass">{{ detail.settlement ? fmtCompactINR(detail.settlement.net_amount) : '—' }}</span><span class="qs-l">F&amp;F net</span></span>
              </button>
              <button class="qs" @click="$emit('go', { tab: 'interviews' })" type="button">
                <span class="qs-ico"><MessagesSquare :size="14" /></span>
                <span class="qs-b"><span class="qs-v sm">{{ detail.interview ? interviewMeta(detail.interview.status).label : 'None' }}</span><span class="qs-l">interview</span></span>
              </button>
            </div>

            <!-- tab bar -->
            <nav class="exd-tabs">
              <button v-for="t in tabs" :key="t.key" class="exd-tab" :class="{ on: tab === t.key }" @click="tab = t.key" type="button">
                <component :is="t.icon" :size="14" /> {{ t.label }}
                <span v-if="t.badge" class="tab-badge">{{ t.badge }}</span>
                <Motion v-if="tab === t.key" as="span" class="tab-ink" layout :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }" />
              </button>
            </nav>

            <!-- tab content -->
            <div class="exd-body">
              <Transition :name="`exd-swap`" mode="out-in">
                <div :key="tab" class="exd-pane">
                  <!-- ───── OVERVIEW ───── -->
                  <template v-if="tab === 'overview'">
                    <div class="exd-facts">
                      <div class="fact"><span class="fact-ic"><component :is="typeMeta.icon" :size="15" /></span><div class="fact-t"><span class="fk">Type</span><span class="fv">{{ typeMeta.label }}</span></div></div>
                      <div class="fact"><span class="fact-ic"><component :is="reason.icon" :size="15" /></span><div class="fact-t"><span class="fk">Reason</span><span class="fv">{{ reason.label }}</span></div></div>
                      <div class="fact"><span class="fact-ic"><CalendarClock :size="15" /></span><div class="fact-t"><span class="fk">Notice</span><span class="fv">{{ noticeFact }}</span></div></div>
                      <div class="fact" v-if="detail.notice_buyout_days"><span class="fact-ic"><Undo2 :size="15" /></span><div class="fact-t"><span class="fk">Buyout</span><span class="fv">{{ detail.notice_buyout_days }}d</span></div></div>
                    </div>
                    <span class="exd-seclabel"><Clock :size="11" /> Journey timeline</span>

                    <!-- date timeline -->
                    <div class="exd-time">
                      <div v-for="(e, i) in timeline" :key="i" class="te" :class="{ dim: !e.date }" :style="{ '--i': i }">
                        <span class="te-rail"><span class="te-node" :class="{ on: e.date }" /></span>
                        <div class="te-c"><span class="te-k">{{ e.label }}</span><span class="te-v">{{ e.date ? fmtDate(e.date) : 'pending' }}</span></div>
                      </div>
                    </div>

                    <div v-if="detail.notice_start?.started_at" class="exd-began" :class="detail.notice_start.in_working_hours ? 'ok' : 'warn'">
                      <Clock :size="12" />
                      <span>Notice began <b>{{ noticeBeganLabel }}</b><i v-if="detail.notice_start.weekday"> · {{ detail.notice_start.weekday }}</i></span>
                      <span class="bg-hrs">{{ detail.notice_start.in_working_hours ? 'working hours' : 'after hours' }}</span>
                    </div>

                    <p v-if="detail.reason_detail" class="exd-detail">“{{ detail.reason_detail }}”</p>

                    <!-- approval chain -->
                    <div class="exd-card">
                      <span class="ec-head"><ShieldCheck :size="13" /> Approval</span>
                      <div class="ec-row"><span class="ec-k">Manager</span><span class="ec-v">{{ detail.manager_name || '—' }}</span></div>
                      <div class="ec-row"><span class="ec-k">Decision</span>
                        <span class="ec-v"><span class="dec" :class="decClass">{{ detail.manager_decision || 'Pending' }}</span></span></div>
                      <p v-if="detail.manager_notes" class="ec-note">{{ detail.manager_notes }}</p>
                    </div>

                    <div v-if="detail.rejection_reason" class="exd-callout danger"><XCircle :size="13" /> <span><b>Rejected:</b> {{ detail.rejection_reason }}</span></div>
                    <div v-if="detail.cancel_reason" class="exd-callout"><Ban :size="13" /> <span><b>Cancelled:</b> {{ detail.cancel_reason }}</span></div>

                    <!-- policy -->
                    <div v-if="detail.policy" class="exd-card">
                      <span class="ec-head"><FileBadge :size="13" /> Policy applied</span>
                      <div class="ec-row"><span class="ec-k">{{ detail.policy.policy_name }}</span>
                        <span class="ec-v">{{ detail.policy.notice_period_days }}d notice</span></div>
                      <div class="ec-tags">
                        <span v-if="detail.policy.buyout_allowed" class="ec-tag">buyout allowed</span>
                        <span v-if="detail.policy.gratuity_enabled" class="ec-tag">gratuity</span>
                      </div>
                    </div>

                    <div class="exd-stamp">
                      <span><Clock :size="11" /> Filed {{ fmtDate(detail.resignation_date) }}</span>
                      <span v-if="detail.updated_at">Updated {{ fmtDate(detail.updated_at) }}</span>
                    </div>
                  </template>

                  <!-- ───── CLEARANCE ───── -->
                  <template v-else-if="tab === 'clearance'">
                    <div class="clr-head">
                      <div class="clr-ring" :style="{ '--p': clrPct * 3.6 + 'deg' }">
                        <span class="clr-ring-v">{{ clrPct }}<i>%</i></span>
                      </div>
                      <div class="clr-htxt">
                        <span class="clr-hk"><ClipboardCheck :size="12" /> Clearance progress</span>
                        <span class="clr-hv"><b>{{ clrDone }}</b> of {{ clrTotal }} departments cleared</span>
                        <span class="clr-htrack"><span class="clr-hfill" :style="{ width: clrPct + '%' }" /></span>
                      </div>
                      <button class="clr-open" @click="$emit('go', { tab: 'clearance' })" type="button" title="Open clearance"><ArrowUpRight :size="15" /></button>
                    </div>
                    <div class="clr-list">
                      <div v-for="(c, i) in detail.clearance_items" :key="c.id" class="clr" :style="{ '--i': i, '--c': clrDept(c.department).hex, '--st': clrStatus(c.status).hex }">
                        <span class="clr-spine" />
                        <span class="clr-dept"><component :is="clrDept(c.department).icon" :size="14" /></span>
                        <div class="clr-c">
                          <span class="clr-t">{{ c.title }}<i v-if="c.is_mandatory" class="clr-req" title="Mandatory">*</i></span>
                          <span class="clr-m"><span class="clr-dept-tag">{{ clrDept(c.department).label }}</span><template v-if="c.assignee_name"> · {{ c.assignee_name }}</template></span>
                          <span v-if="c.remarks" class="clr-rem">{{ c.remarks }}</span>
                        </div>
                        <div class="clr-r">
                          <span class="clr-st">{{ clrStatus(c.status).label }}</span>
                          <span v-if="c.recovery_amount && Number(c.recovery_amount) > 0" class="clr-rec">−{{ fmtCompactINR(c.recovery_amount) }}</span>
                        </div>
                      </div>
                    </div>
                  </template>

                  <!-- ───── SETTLEMENT ───── -->
                  <template v-else-if="tab === 'settlement'">
                    <div class="fnf-hero" :class="netClass">
                      <span class="fnf-grain" aria-hidden="true" />
                      <div class="fnf-hero-top">
                        <span class="fnf-lab"><Scale :size="12" /> {{ netClass === 'recover' ? 'Recoverable' : 'Net payable' }}</span>
                        <ExStatusPill :status="detail.settlement.status" kind="settlement" :icon="false" />
                      </div>
                      <span class="fnf-amt ex-mono">{{ fmtINR(Math.abs(detail.settlement.net_amount)) }}</span>
                      <div class="fnf-bar"><span class="fnf-earn" :style="{ flex: earnPct }" /><span class="fnf-rec" :style="{ flex: 100 - earnPct }" /></div>
                      <div class="fnf-split">
                        <span class="up"><TrendingUp :size="11" /> Earnings {{ fmtCompactINR(detail.settlement.total_earnings) }}</span>
                        <span class="dn">{{ fmtCompactINR(detail.settlement.total_recoveries) }} Recoveries <TrendingDown :size="11" /></span>
                      </div>
                    </div>
                    <div class="fnf-cols">
                      <div class="fnf-col">
                        <span class="fnf-h up">Earnings · {{ fmtCompactINR(detail.settlement.total_earnings) }}</span>
                        <span v-for="l in earnLines" :key="l.k" class="fnf-line"><span>{{ l.k }}</span><span class="ex-mono">{{ fmtCompactINR(l.v) }}</span></span>
                      </div>
                      <div class="fnf-col">
                        <span class="fnf-h dn">Recoveries · {{ fmtCompactINR(detail.settlement.total_recoveries) }}</span>
                        <span v-for="l in recLines" :key="l.k" class="fnf-line"><span>{{ l.k }}</span><span class="ex-mono">−{{ fmtCompactINR(l.v) }}</span></span>
                        <span v-if="!recLines.length" class="fnf-line dim"><span>No recoveries</span></span>
                      </div>
                    </div>
                    <button class="exd-mini link" @click="$emit('go', { tab: 'settlement' })" type="button">
                      <Scale :size="13" /> Open F&amp;F · {{ detail.settlement.settlement_number }} <ArrowRight :size="13" /></button>
                  </template>

                  <!-- ───── DOCUMENTS ───── -->
                  <template v-else-if="tab === 'documents'">
                    <div class="doc-list">
                      <div v-for="d in detail.documents" :key="d.id" class="doc" :style="{ '--c': letterMeta(d.status).hex }">
                        <span class="doc-ico"><ScrollText :size="15" /></span>
                        <div class="doc-c">
                          <span class="doc-t">{{ d.doc_type === 'EXPERIENCE_LETTER' ? 'Experience letter' : d.doc_type === 'RELIEVING_LETTER' ? 'Relieving letter' : d.doc_type }}</span>
                          <span class="doc-m">{{ letterMeta(d.status).label }}<template v-if="d.issued_at"> · {{ fmtDate(d.issued_at) }}</template></span>
                          <span v-if="d.verification_code" class="doc-code ex-mono"><Hash :size="10" />{{ d.verification_code }}</span>
                        </div>
                      </div>
                    </div>
                    <button class="exd-mini link" @click="$emit('go', { tab: 'experience-letter' })" type="button">
                      <ScrollText :size="13" /> Manage letters <ArrowRight :size="13" /></button>
                  </template>
                </div>
              </Transition>
            </div>

            <!-- action rail -->
            <footer class="exd-foot">
              <button v-for="a in actions" :key="a.mode" class="exd-act" :class="a.tone"
                @click="$emit('action', { mode: a.mode, detail })" type="button">
                <component :is="a.icon" :size="14" /> {{ a.label }}
              </button>
            </footer>
          </template>
        </Motion>
      </div>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  X, Loader2, AlertTriangle, ClipboardCheck, Scale, ScrollText,
  CheckCircle2, XCircle, CalendarClock, ShieldCheck, Ban, BadgeCheck, Archive, Undo2,
  ArrowRight, ArrowUpRight, FilePen, User, Building2, RotateCcw, MessagesSquare, FileText, Clock, Hash,
  FileBadge, Activity, Trash2, TrendingUp, TrendingDown,
} from 'lucide-vue-next'
import ExStatusPill from '../components/ExStatusPill.vue'
import ExitProcession from '../components/ExitProcession.vue'
import ExCountUp from '../components/ExCountUp.vue'
import {
  fetchCase, fetchNoticePreview, exitStageState, resignationTypeMeta, reasonMeta, settlementStatusMeta,
  letterStatusMeta, interviewStatusMeta, clearanceDeptMeta, clearanceStatusMeta, caseStatusMeta,
  fmtDate, fmtINR, fmtCompactINR, daysBetween, initials, todayISO, errText, isDeletable,
} from '@/composables/useExit'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'
import { useToast } from 'vue-toastification'

const props = defineProps({
  open: { type: Boolean, default: false },
  caseId: { type: String, default: null },
})
const emit = defineEmits(['close', 'action', 'go', 'refresh'])
const toast = useToast()

const reduced = prefersReduced()
const rootEl = ref(null)
usePointerSpotlight(rootEl)   // ambient accent light follows the pointer across the panel

const detail = ref(null)
const loading = ref(false)
const tab = ref('overview')
// Status-tinted accent drives the header glow, spotlight, medal ring & scan line.
const accent = computed(() => caseStatusMeta(detail.value?.status).hex)
const noticePreview = ref(null)   // policy-resolved notice for pre-accept cases
const load = async () => {
  if (!props.caseId) return
  loading.value = true
  noticePreview.value = null
  try {
    detail.value = await fetchCase(props.caseId)
    const d = detail.value
    if (d && d.notice_period_days == null && !d.last_working_date && d.employee_id) {
      try { noticePreview.value = await fetchNoticePreview(d.employee_id, d.resignation_type) } catch {}
    }
  }
  catch (e) { toast.error(errText(e, 'Failed to load case')) }
  finally { loading.value = false }
}
watch(() => [props.open, props.caseId], ([o]) => { if (o) { tab.value = 'overview'; load() } else detail.value = null })
defineExpose({ reload: load })

const stage = computed(() => exitStageState(detail.value))
const typeMeta = computed(() => resignationTypeMeta(detail.value?.resignation_type))
const reason = computed(() => reasonMeta(detail.value?.reason_category))
const interviewMeta = interviewStatusMeta
const letterMeta = letterStatusMeta
const clrDept = clearanceDeptMeta
const clrStatus = clearanceStatusMeta

const initBy = computed(() => {
  const v = String(detail.value?.initiated_by || '').toUpperCase()
  return v.includes('SELF') || v.includes('EMP')
    ? { icon: User, label: 'Self-service' } : { icon: Building2, label: 'HR-initiated' }
})
const prettyState = (s) => String(s || '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())

const noticeDays = computed(() => {
  const d = detail.value
  if (d?.last_working_date) return daysBetween(todayISO(), d.last_working_date)
  if (d?.notice_period_days != null) return d.notice_period_days
  if (noticePreview.value) return noticePreview.value.applied_notice_days
  return null
})
const noticeIsPreview = computed(() => {
  const d = detail.value
  return !!noticePreview.value && !d?.last_working_date && d?.notice_period_days == null
})
const noticeOverdue = computed(() => noticeDays.value != null && noticeDays.value < 0 && detail.value?.status === 'NOTICE_PERIOD')
const noticeUnit = computed(() => {
  const d = detail.value
  if (d?.last_working_date) return noticeOverdue.value ? 'd late' : 'd left'
  if (noticeIsPreview.value) return 'd · policy'
  return 'd'
})
const noticeFact = computed(() => {
  const d = detail.value
  if (d?.notice_period_days != null) return `${d.notice_period_days}d${d.notice_waived ? ' · waived' : ''}`
  if (noticePreview.value) return `≈${noticePreview.value.applied_notice_days}d · policy`
  return '—'
})
const noticeBeganLabel = computed(() => {
  const s = detail.value?.notice_start
  if (!s?.started_at) return ''
  return `${fmtDate(s.started_at)}${s.time_label ? ' · ' + s.time_label : ''}`
})

const netClass = computed(() => {
  const n = Number(detail.value?.settlement?.net_amount || 0)
  return n < 0 ? 'recover' : 'payable'
})
const clrPct = computed(() => Math.round(Number(detail.value?.clearance_progress_pct || 0)))
const clrTotal = computed(() => detail.value?.clearance_items?.length || 0)
const clrDone = computed(() => Math.round((clrPct.value / 100) * clrTotal.value))
const decClass = computed(() => {
  const d = detail.value?.manager_decision
  return d === 'APPROVED' ? 'ok' : d === 'REJECTED' ? 'no' : 'pend'
})

const timeline = computed(() => {
  const d = detail.value || {}
  return [
    { label: 'Filed', date: d.resignation_date },
    { label: 'Requested last day', date: d.requested_last_working_date },
    { label: 'Notice start', date: d.notice_period_start_date },
    { label: 'Last working day', date: d.last_working_date },
    { label: 'Exit date', date: d.exit_date },
  ]
})

// settlement breakdown lines
const S = computed(() => detail.value?.settlement || null)
const earnPct = computed(() => {
  const s = S.value; if (!s) return 50
  const e = Number(s.total_earnings || 0), r = Number(s.total_recoveries || 0)
  const t = e + r
  return t ? Math.round((e / t) * 100) : 100
})
const earnLines = computed(() => {
  const s = S.value; if (!s) return []
  return [
    { k: 'Pending salary', v: s.pending_salary }, { k: 'Leave encashment', v: s.leave_encashment_amount },
    { k: 'Gratuity', v: s.gratuity_amount }, { k: 'Bonus', v: s.bonus_amount },
    { k: 'Incentives', v: s.incentives_amount }, { k: 'Reimbursements', v: s.reimbursements_amount },
    { k: 'Other', v: s.other_earnings },
  ].filter(l => Number(l.v) > 0)
})
const recLines = computed(() => {
  const s = S.value; if (!s) return []
  return [
    { k: 'Notice recovery', v: s.notice_recovery }, { k: 'Loan recovery', v: s.loan_recovery },
    { k: 'Advance recovery', v: s.advance_recovery }, { k: 'Asset recovery', v: s.asset_recovery },
    { k: 'Other deductions', v: s.other_deductions },
  ].filter(l => Number(l.v) > 0)
})

const tabs = computed(() => {
  const d = detail.value || {}
  const out = [{ key: 'overview', label: 'Overview', icon: FileText }]
  if (d.clearance_items?.length) out.push({ key: 'clearance', label: 'Clearance', icon: ClipboardCheck, badge: d.clearance_items.length })
  if (d.settlement) out.push({ key: 'settlement', label: 'F&F', icon: Scale })
  if (d.documents?.length) out.push({ key: 'documents', label: 'Letters', icon: ScrollText, badge: d.documents.length })
  return out
})
watch(tabs, (t) => { if (!t.some(x => x.key === tab.value)) tab.value = 'overview' })

const actions = computed(() => {
  const d = detail.value
  if (!d) return []
  const s = d.status
  const out = []
  if (['DRAFT', 'SUBMITTED', 'MANAGER_REVIEW'].includes(s)) out.push({ mode: 'edit', label: 'Edit', icon: FilePen, tone: 'ghost' })
  if (['SUBMITTED', 'MANAGER_REVIEW'].includes(s)) {
    if (s === 'MANAGER_REVIEW') out.push({ mode: 'manager-decision', label: 'Manager decision', icon: ShieldCheck, tone: 'ghost' })
    out.push({ mode: 'accept', label: 'Accept', icon: CheckCircle2, tone: 'primary' })
    out.push({ mode: 'reject', label: 'Reject', icon: XCircle, tone: 'danger' })
  }
  if (s === 'ACCEPTED') {
    out.push({ mode: 'start-notice', label: 'Start notice', icon: CalendarClock, tone: 'primary' })
    out.push({ mode: 'waive-notice', label: 'Waive notice', icon: Undo2, tone: 'ghost' })
  }
  if (s === 'NOTICE_PERIOD') out.push({ mode: 'adjust-notice', label: 'Adjust notice', icon: CalendarClock, tone: 'ghost' })
  if (s === 'SETTLEMENT') out.push({ mode: 'finalize-exit', label: 'Finalize exit', icon: BadgeCheck, tone: 'primary' })
  // Archive a relieved case once — hide the action when the employee record is
  // already ARCHIVED (re-archiving would 409 on the lifecycle state guard).
  if (s === 'COMPLETED' && d.lifecycle_state !== 'ARCHIVED') out.push({ mode: 'archive', label: 'Archive', icon: Archive, tone: 'ghost' })
  if (s === 'COMPLETED' && d.lifecycle_state === 'ARCHIVED') out.push({ mode: 'view-archive', label: 'View in archive', icon: Archive, tone: 'ghost' })
  if (!['COMPLETED', 'REJECTED', 'WITHDRAWN', 'CANCELLED'].includes(s)) out.push({ mode: 'cancel', label: 'Cancel', icon: Ban, tone: 'danger-ghost' })
  // Expunge: pre-accept (not yet ACCEPTED) or already-closed cases can be removed from the registry.
  if (isDeletable(s)) out.push({ mode: 'delete', label: 'Delete', icon: Trash2, tone: 'danger-ghost' })
  return out
})

const onStagePick = (key) => {
  const map = { clearance: 'clearance', assets: 'asset-return', settlement: 'settlement',
    interview: 'interviews', notice: 'notice', experience: 'experience-letter', relieving: 'relieving-letter' }
  if (map[key]) emit('go', { tab: map[key] })
}
</script>

<style scoped>
.exd-scrim { position: fixed; inset: 0; z-index: 1430; display: flex; justify-content: flex-end;
  background: rgba(6,5,10,0.62); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
[data-theme="light"] .exd-scrim { background: rgba(40,30,15,0.4); }
.exd { position: relative; display: flex; flex-direction: column; overflow: hidden; width: min(500px, 97vw); height: 100%;
  --accent: var(--ex-violet);
  background: var(--ex-surface-elevated); border-left: 1px solid var(--ex-border-strong); box-shadow: -24px 0 70px rgba(0,0,0,0.55); }
.exd-aura { position: absolute; inset: 0 0 52% 0; pointer-events: none; z-index: 0; animation: ex-aura-drift 12s ease-in-out infinite;
  background: radial-gradient(85% 60% at 82% 0%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 70%); transition: background 0.6s; }
.exd-spot { position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: var(--spot, 0); transition: opacity 0.45s;
  background: radial-gradient(560px 380px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), color-mix(in srgb, var(--accent) 15%, transparent), transparent 60%); }
.exd-scan { position: absolute; top: 0; left: 0; right: 0; height: 2px; pointer-events: none; z-index: 2;
  background: linear-gradient(90deg, transparent, var(--accent), color-mix(in srgb, var(--accent) 55%, #fff), transparent); opacity: 0.85; transition: background 0.6s; }
/* keep all interactive layers above the ambient light */
.exd-head, .exd-proc-wrap, .exd-stats, .exd-tabs, .exd-body, .exd-foot, .exd-warn { position: relative; z-index: 1; }

/* hero header */
.exd-head { position: relative; display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: center; padding: 18px 18px 14px; }
.exd-medal { position: relative; display: grid; place-items: center; width: 46px; height: 46px; border-radius: 14px; flex-shrink: 0;
  background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border);
  animation: exd-medal-in 0.6s var(--ex-spring) backwards; animation-delay: 0.12s; }
.medal-ring { position: absolute; inset: -3px; border-radius: 16px; border: 1.5px solid transparent;
  background: conic-gradient(from 0deg, var(--accent), color-mix(in srgb, var(--accent) 30%, transparent), var(--accent)) border-box;
  -webkit-mask: linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude;
  animation: ex-spin-slow 9s linear infinite; opacity: 0.7; transition: background 0.6s; }
.medal-txt { font-family: var(--ex-mono); font-size: 16px; font-weight: 850; color: var(--ex-violet); }
@keyframes exd-medal-in { 0% { opacity: 0; transform: scale(0.4) rotate(-25deg); } 70% { transform: scale(1.12) rotate(4deg); } 100% { opacity: 1; transform: none; } }
.exd-id { min-width: 0; }
.exd-num { font-size: 11px; color: var(--ex-text-muted); }
.exd-name { font-size: 17px; font-weight: 850; color: var(--ex-text); margin: 1px 0; line-height: 1.15; }
.exd-role { font-size: 12px; color: var(--ex-text-muted); }
.exd-x { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; cursor: pointer; align-self: flex-start;
  background: transparent; border: 1px solid var(--ex-border); color: var(--ex-text-muted); transition: all 0.2s; }
.exd-x:hover { color: var(--ex-text); border-color: var(--ex-border-strong); transform: rotate(90deg); }
.exd-chips { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 6px; }
.exd-chips > * { animation: exd-chip-in 0.45s var(--ex-spring) backwards; }
.exd-chips > *:nth-child(1) { animation-delay: 0.2s; } .exd-chips > *:nth-child(2) { animation-delay: 0.26s; }
.exd-chips > *:nth-child(3) { animation-delay: 0.32s; } .exd-chips > *:nth-child(4) { animation-delay: 0.38s; }
@keyframes exd-chip-in { from { opacity: 0; transform: translateY(7px) scale(0.92); } to { opacity: 1; transform: none; } }
.exd-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 700; padding: 3px 9px; border-radius: 999px;
  color: var(--ex-text-secondary); background: var(--ex-surface); border: 1px solid var(--ex-border); }
.exd-chip.good { color: var(--ex-cleared); border-color: color-mix(in srgb, var(--ex-cleared) 30%, transparent); }
.exd-chip.bad { color: var(--ex-blocked); border-color: color-mix(in srgb, var(--ex-blocked) 30%, transparent); }

.exd-loading { display: flex; align-items: center; gap: 8px; justify-content: center; padding: 60px; color: var(--ex-text-muted); font-size: 13px; }
.spin { animation: ex-spin-slow 0.8s linear infinite; }
.exd-warn { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--ex-amber); margin: 0 18px 10px; padding: 9px 11px; border-radius: 10px; background: var(--ex-amber-soft); border: 1px solid var(--ex-amber-border); }
.exd-proc-wrap { padding: 0 14px; animation: exd-rise 0.55s var(--ex-spring) backwards; animation-delay: 0.1s; }
/* choreographed reveal — blocks rise in sequence after the panel slides in */
@keyframes exd-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }

/* quick stats */
.exd-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; padding: 10px 18px 0; animation: exd-rise 0.55s var(--ex-spring) backwards; animation-delay: 0.17s; }
.qs { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 6px; padding: 9px 10px; border-radius: 12px; cursor: pointer; text-align: left;
  background: var(--ex-surface); border: 1px solid var(--ex-border); transition: transform 0.2s var(--ex-spring), border-color 0.2s, box-shadow 0.3s; }
.qs:hover { transform: translateY(-3px); border-color: var(--ex-violet-border); box-shadow: var(--ex-card-shadow); }
.qs:active { transform: translateY(-1px) scale(0.97); }
/* sheen sweep across the tile on hover */
.qs::after { content: ''; position: absolute; inset: 0; pointer-events: none; border-radius: inherit;
  background: linear-gradient(120deg, transparent 36%, color-mix(in srgb, var(--accent) 20%, transparent) 50%, transparent 64%);
  transform: translateX(-130%); transition: transform 0.6s var(--ex-spring); }
.qs:hover::after { transform: translateX(130%); }
.qs.over { border-color: color-mix(in srgb, var(--ex-blocked) 36%, transparent); }
.qs-ico { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); transition: transform 0.25s var(--ex-spring); }
.qs:hover .qs-ico { transform: scale(1.12) rotate(-4deg); }
.qs-b { display: flex; flex-direction: column; min-width: 0; }
.qs-v { font-size: 17px; font-weight: 900; color: var(--ex-text); line-height: 1; }
.qs-v i { font-size: 9px; font-weight: 700; font-style: normal; color: var(--ex-text-muted); margin-left: 2px; }
.qs-v.sm { font-size: 12px; }
.qs-v.payable { color: var(--ex-cleared); } .qs-v.recover { color: var(--ex-blocked); }
.qs.over .qs-v { color: var(--ex-blocked); }
.qs-l { font-size: 9.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ex-text-dim); margin-top: 3px; }

/* tabs — segmented control with a filled active pill */
.exd-tabs { display: flex; gap: 3px; margin: 12px 16px 0; padding: 4px; border-radius: 13px; background: var(--ex-panel); border: 1px solid var(--ex-border); animation: exd-rise 0.55s var(--ex-spring) backwards; animation-delay: 0.23s; }
.exd-tab { position: relative; z-index: 1; flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 9px 5px; border: none; background: none; cursor: pointer; border-radius: 9px;
  font-size: 12px; font-weight: 800; color: var(--ex-text-muted); transition: color 0.25s; }
.exd-tab:hover { color: var(--ex-text-secondary); }
.exd-tab.on { color: var(--ex-violet); }
.tab-badge { font-family: var(--ex-mono); font-size: 9.5px; font-weight: 800; padding: 1px 6px; border-radius: 999px; background: var(--ex-steel-soft); color: var(--ex-text-muted); }
.exd-tab.on .tab-badge { background: color-mix(in srgb, var(--ex-violet) 22%, transparent); color: var(--ex-violet); }
.tab-ink { position: absolute; inset: 0; z-index: -1; border-radius: 9px; background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); box-shadow: 0 4px 12px -6px color-mix(in srgb, var(--ex-violet) 55%, transparent); }

/* body / panes */
.exd-body { position: relative; flex: 1; overflow-y: auto; padding: 14px 18px 18px; border-top: 1px solid var(--ex-border); }
.exd-pane { display: flex; flex-direction: column; gap: 12px; }
.exd-pane > * { animation: ex-fade-up 0.4s var(--ex-spring) backwards; }
.exd-pane > *:nth-child(2) { animation-delay: 0.05s; }
.exd-pane > *:nth-child(3) { animation-delay: 0.1s; }
.exd-pane > *:nth-child(4) { animation-delay: 0.15s; }
.exd-pane > *:nth-child(5) { animation-delay: 0.2s; }
.exd-pane > *:nth-child(6) { animation-delay: 0.25s; }
.exd-swap-enter-active, .exd-swap-leave-active { transition: opacity 0.2s, transform 0.24s var(--ex-spring); }
.exd-swap-enter-from { opacity: 0; transform: translateX(12px); }
.exd-swap-leave-to { opacity: 0; transform: translateX(-10px); }

.exd-facts { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
.fact { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 13px; background: var(--ex-grad-card), var(--ex-surface); border: 1px solid var(--ex-border); transition: border-color 0.2s, transform 0.2s var(--ex-spring); }
.fact:hover { border-color: var(--ex-violet-border); transform: translateY(-2px); }
.fact-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.fact-t { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.fk { font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ex-text-dim); }
.fv { font-size: 13px; font-weight: 800; color: var(--ex-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.exd-seclabel { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ex-text-dim); margin: 4px 0 -4px; }
.exd-seclabel svg { color: var(--ex-violet); }

.exd-time { display: flex; flex-direction: column; padding: 4px 4px 4px 2px; border-radius: 14px; background: var(--ex-surface); border: 1px solid var(--ex-border); }
.te { display: grid; grid-template-columns: 22px 1fr; gap: 8px; }
.te-rail { position: relative; display: flex; justify-content: center; }
.te-rail::before { content: ""; position: absolute; top: 0; bottom: 0; width: 2px; background: var(--ex-border);
  transform-origin: top; animation: exd-rail 0.55s var(--ex-spring) backwards; animation-delay: calc(0.16s + var(--i, 0) * 0.07s); }
.te:first-child .te-rail::before { top: 50%; } .te:last-child .te-rail::before { bottom: 50%; }
.te-node { position: relative; width: 10px; height: 10px; border-radius: 50%; margin-top: 11px; background: var(--ex-cleared); box-shadow: 0 0 8px color-mix(in srgb, var(--ex-cleared) 60%, transparent);
  animation: exd-node-pop 0.5s var(--ex-spring) backwards; animation-delay: calc(0.22s + var(--i, 0) * 0.07s); }
.te-node.on { animation: exd-node-pop 0.5s var(--ex-spring) backwards, exd-node-glow 3s ease-in-out infinite;
  animation-delay: calc(0.22s + var(--i, 0) * 0.07s), calc(0.8s + var(--i, 0) * 0.07s); }
.te-node:not(.on) { background: var(--ex-steel); box-shadow: none; }
@keyframes exd-rail { from { transform: scaleY(0); } to { transform: scaleY(1); } }
@keyframes exd-node-pop { 0% { transform: scale(0); } 60% { transform: scale(1.35); } 100% { transform: scale(1); } }
@keyframes exd-node-glow { 0%, 100% { box-shadow: 0 0 7px color-mix(in srgb, var(--ex-cleared) 55%, transparent); } 50% { box-shadow: 0 0 14px color-mix(in srgb, var(--ex-cleared) 95%, transparent); } }
.te-c { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 10px 8px 0; min-width: 0; }
.te-k { font-size: 12px; font-weight: 750; color: var(--ex-text); }
.te.dim .te-k { color: var(--ex-text-muted); font-weight: 600; }
.te-v { font-size: 11px; font-weight: 800; color: var(--ex-text); font-family: var(--ex-mono); padding: 3px 9px; border-radius: 999px; background: var(--ex-panel); border: 1px solid var(--ex-border); white-space: nowrap; }
.te.dim .te-v { color: var(--ex-text-dim); background: transparent; border-color: transparent; padding-right: 0; }

.exd-began { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; font-size: 11.5px; color: var(--ex-text-secondary);
  padding: 8px 11px; border-radius: 10px; background: var(--ex-surface); border: 1px solid var(--ex-border); }
.exd-began svg { color: var(--ex-violet); flex-shrink: 0; }
.exd-began b { color: var(--ex-text); font-weight: 800; } .exd-began i { font-style: normal; color: var(--ex-text-muted); }
.exd-began .bg-hrs { margin-left: auto; font-size: 9.5px; font-weight: 800; padding: 2px 8px; border-radius: 999px; }
.exd-began.ok .bg-hrs { color: var(--ex-cleared); background: var(--ex-cleared-soft); }
.exd-began.warn .bg-hrs { color: var(--ex-amber); background: var(--ex-amber-soft); }
.exd-began.warn svg { color: var(--ex-amber); }

.exd-detail { font-size: 12.5px; font-style: italic; color: var(--ex-text-secondary); margin: 0; padding: 10px 12px; border-left: 2px solid var(--ex-violet-border); background: var(--ex-violet-soft); border-radius: 0 10px 10px 0; }

.exd-card { padding: 11px 13px; border-radius: 13px; background: var(--ex-surface); border: 1px solid var(--ex-border); display: flex; flex-direction: column; gap: 7px; }
.ec-head { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ex-text-muted); }
.ec-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ec-k { font-size: 12.5px; color: var(--ex-text-secondary); font-weight: 700; }
.ec-v { font-size: 12.5px; color: var(--ex-text); font-weight: 700; }
.dec { font-size: 11px; font-weight: 800; padding: 2px 9px; border-radius: 999px; }
.dec.ok { color: var(--ex-cleared); background: var(--ex-cleared-soft); }
.dec.no { color: var(--ex-blocked); background: var(--ex-blocked-soft); }
.dec.pend { color: var(--ex-amber); background: var(--ex-amber-soft); }
.ec-note { font-size: 12px; color: var(--ex-text-secondary); margin: 0; font-style: italic; }
.ec-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.ec-tag { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; color: var(--ex-text-muted); background: var(--ex-steel-soft); }

.exd-callout { display: flex; align-items: flex-start; gap: 7px; font-size: 12px; color: var(--ex-text-secondary); padding: 9px 11px; border-radius: 10px; background: var(--ex-amber-soft); border: 1px solid var(--ex-amber-border); }
.exd-callout b { color: var(--ex-text); }
.exd-callout.danger { background: var(--ex-blocked-soft); border-color: color-mix(in srgb, var(--ex-blocked) 28%, transparent); color: var(--ex-text-secondary); }
.exd-callout.danger svg { color: var(--ex-blocked); flex-shrink: 0; }
.exd-callout svg { color: var(--ex-amber); flex-shrink: 0; margin-top: 1px; }

.exd-stamp { display: flex; justify-content: space-between; gap: 8px; font-size: 10.5px; color: var(--ex-text-dim); padding-top: 2px; }
.exd-stamp span { display: inline-flex; align-items: center; gap: 4px; }

/* clearance */
.exd-mini { display: flex; align-items: center; gap: 10px; width: 100%; padding: 11px 13px; border-radius: 12px; cursor: pointer; background: var(--ex-surface); border: 1px solid var(--ex-border); }
.exd-mini:hover { border-color: var(--ex-violet-border); }
.exd-mini.link { justify-content: center; gap: 7px; font-size: 12.5px; font-weight: 800; color: var(--ex-violet); }
.mini-lab { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 700; color: var(--ex-text-secondary); }
.mini-track { flex: 1; height: 7px; border-radius: 999px; background: var(--ex-steel-soft); overflow: hidden; }
.mini-fill { display: block; height: 100%; background: linear-gradient(90deg, var(--ex-ember), var(--ex-cleared)); transition: width 0.7s var(--ex-spring); }
.mini-val { font-family: var(--ex-mono); font-size: 12px; font-weight: 800; color: var(--ex-text); }
/* clearance header */
.clr-head { display: flex; align-items: center; gap: 13px; padding: 13px 14px; border-radius: 16px; background: var(--ex-grad-card), var(--ex-surface); border: 1px solid var(--ex-border-strong); }
.clr-ring { position: relative; display: grid; place-items: center; width: 58px; height: 58px; border-radius: 50%; flex-shrink: 0;
  background: conic-gradient(var(--ex-cleared) var(--p, 0deg), var(--ex-steel-soft) 0); }
.clr-ring::after { content: ''; position: absolute; inset: 5px; border-radius: 50%; background: var(--ex-surface); }
.clr-ring-v { position: relative; z-index: 1; font-family: var(--ex-mono); font-size: 16px; font-weight: 850; color: var(--ex-text); }
.clr-ring-v i { font-size: 9px; font-style: normal; color: var(--ex-text-muted); }
.clr-htxt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.clr-hk { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ex-text-muted); }
.clr-hk svg { color: var(--ex-violet); }
.clr-hv { font-size: 12.5px; color: var(--ex-text-secondary); } .clr-hv b { color: var(--ex-text); font-weight: 850; font-family: var(--ex-mono); }
.clr-htrack { height: 6px; border-radius: 999px; background: var(--ex-steel-soft); overflow: hidden; }
.clr-hfill { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--ex-ember), var(--ex-cleared)); transition: width 0.9s var(--ex-spring); }
.clr-open { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; cursor: pointer; color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); transition: transform 0.2s var(--ex-spring); }
.clr-open:hover { transform: translateY(-2px) rotate(10deg); }

/* clearance rows */
.clr-list { display: flex; flex-direction: column; gap: 8px; }
.clr { position: relative; overflow: hidden; display: grid; grid-template-columns: auto 1fr auto; gap: 11px; align-items: center; padding: 11px 13px 11px 15px; border-radius: 13px; background: var(--ex-surface); border: 1px solid var(--ex-border);
  transition: border-color 0.2s, transform 0.2s var(--ex-spring), box-shadow 0.3s; animation: ex-fade-up 0.4s var(--ex-spring) backwards; animation-delay: calc(var(--i) * 0.04s); }
.clr:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--st) 36%, var(--ex-border)); box-shadow: var(--ex-card-shadow); }
.clr-spine { position: absolute; left: 0; top: 8px; bottom: 8px; width: 3px; border-radius: 0 3px 3px 0; background: var(--st); box-shadow: 0 0 10px -1px var(--st); }
.clr-dept { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 28%, transparent); }
.clr-c { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.clr-t { display: flex; align-items: center; gap: 3px; font-size: 13px; font-weight: 800; color: var(--ex-text); }
.clr-req { color: var(--ex-blocked); font-style: normal; }
.clr-m { display: flex; align-items: center; gap: 4px; font-size: 10.5px; color: var(--ex-text-muted); }
.clr-dept-tag { color: var(--c); font-weight: 700; }
.clr-rem { font-size: 11px; font-style: italic; color: var(--ex-text-secondary); margin-top: 1px; }
.clr-r { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
.clr-st { font-size: 10px; font-weight: 800; color: var(--st); padding: 3px 9px; border-radius: 999px; white-space: nowrap;
  background: color-mix(in srgb, var(--st) 14%, transparent); border: 1px solid color-mix(in srgb, var(--st) 30%, transparent); }
.clr-rec { font-family: var(--ex-mono); font-size: 11px; font-weight: 800; color: var(--ex-blocked); }

/* settlement hero */
.fnf-hero { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 11px; padding: 16px; border-radius: 16px; border: 1px solid var(--ex-border-strong); background: var(--ex-grad-card), var(--ex-panel); }
.fnf-hero.payable { background: radial-gradient(120% 90% at 100% 0%, color-mix(in srgb, var(--ex-cleared) 13%, transparent), transparent 60%), var(--ex-panel); }
.fnf-hero.recover { background: radial-gradient(120% 90% at 100% 0%, color-mix(in srgb, var(--ex-blocked) 13%, transparent), transparent 60%), var(--ex-panel); }
.fnf-grain { position: absolute; inset: -40% -10% 50% -10%; pointer-events: none; opacity: 0.55; background: radial-gradient(60% 80% at 80% 0%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 70%); }
.fnf-hero-top { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.fnf-lab { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ex-text-muted); }
.fnf-amt { position: relative; font-size: 30px; font-weight: 900; line-height: 1; }
.fnf-hero.payable .fnf-amt { color: var(--ex-cleared); } .fnf-hero.recover .fnf-amt { color: var(--ex-blocked); }
.fnf-bar { position: relative; display: flex; height: 9px; border-radius: 999px; overflow: hidden; background: var(--ex-steel-soft); }
.fnf-earn { background: linear-gradient(90deg, var(--ex-cleared), #60d394); transition: flex 0.8s var(--ex-spring); }
.fnf-rec { background: linear-gradient(90deg, #f87171, var(--ex-blocked)); transition: flex 0.8s var(--ex-spring); }
.fnf-split { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 10.5px; font-weight: 750; }
.fnf-split .up { display: inline-flex; align-items: center; gap: 4px; color: var(--ex-cleared); }
.fnf-split .dn { display: inline-flex; align-items: center; gap: 4px; color: var(--ex-blocked); }
.fnf-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.fnf-col { display: flex; flex-direction: column; gap: 5px; padding: 10px 11px; border-radius: 12px; background: var(--ex-surface); border: 1px solid var(--ex-border); }
.fnf-h { font-size: 10.5px; font-weight: 800; letter-spacing: 0.03em; }
.fnf-h.up { color: var(--ex-cleared); } .fnf-h.dn { color: var(--ex-blocked); }
.fnf-line { display: flex; align-items: center; justify-content: space-between; gap: 6px; font-size: 11.5px; color: var(--ex-text-secondary); }
.fnf-line span:last-child { color: var(--ex-text); font-weight: 700; }
.fnf-line.dim { color: var(--ex-text-dim); }

/* documents */
.doc-list { display: flex; flex-direction: column; gap: 8px; }
.doc { position: relative; overflow: hidden; display: grid; grid-template-columns: auto 1fr; gap: 11px; align-items: center; padding: 12px 13px 12px 15px; border-radius: 13px; background: var(--ex-surface); border: 1px solid var(--ex-border); transition: border-color 0.2s, transform 0.2s var(--ex-spring); }
.doc:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--c) 36%, var(--ex-border)); }
.doc::before { content: ''; position: absolute; left: 0; top: 8px; bottom: 8px; width: 3px; border-radius: 0 3px 3px 0; background: var(--c); }
.doc-ico { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); border: 1px solid color-mix(in srgb, var(--c) 28%, transparent); }
.doc-c { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.doc-t { font-size: 13px; font-weight: 800; color: var(--ex-text); }
.doc-m { font-size: 11px; color: var(--c); font-weight: 700; }
.doc-code { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; color: var(--ex-text-muted); }

/* action rail */
.exd-foot { display: flex; flex-wrap: wrap; gap: 8px; padding: 13px 18px; background: var(--ex-panel); border-top: 1px solid var(--ex-border);
  animation: exd-rise 0.55s var(--ex-spring) backwards; animation-delay: 0.3s; }
.exd-act { position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: 6px; padding: 9px 13px; border-radius: 11px; font-size: 12.5px; font-weight: 800; cursor: pointer; border: 1px solid var(--ex-border-strong); background: var(--ex-surface); color: var(--ex-text-secondary); transition: transform 0.2s var(--ex-spring), border-color 0.2s, box-shadow 0.3s; }
.exd-act:hover { transform: translateY(-2px); }
.exd-act:active { transform: translateY(0) scale(0.96); }
.exd-act.primary { border: none; background: var(--ex-grad-hero); color: #1a1206; box-shadow: 0 8px 22px -10px rgba(234, 88, 12, 0.7); }
.exd-act.primary:hover { box-shadow: 0 12px 28px -10px rgba(234, 88, 12, 0.85); }
/* primary shimmer sweep */
.exd-act.primary::after { content: ''; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(115deg, transparent 40%, rgba(255, 255, 255, 0.35) 50%, transparent 60%);
  transform: translateX(-130%); transition: transform 0.7s var(--ex-spring); }
.exd-act.primary:hover::after { transform: translateX(130%); }
.exd-act.danger { border: none; background: linear-gradient(135deg, #ef4444, #b91c1c); color: #fff; }
.exd-act.danger-ghost { color: var(--ex-blocked); border-color: color-mix(in srgb, var(--ex-blocked) 30%, transparent); }
@media (prefers-reduced-motion: reduce) {
  .spin, .exd-aura, .medal-ring, .exd-pane > *, .clr,
  .exd-medal, .exd-chips > *, .exd-proc-wrap, .exd-stats, .exd-tabs, .exd-foot,
  .te-rail::before, .te-node, .te-node.on { animation: none !important; }
  .exd-x:hover, .qs:hover, .qs:active, .exd-act:hover, .exd-act:active { transform: none; }
  .qs:hover .qs-ico { transform: none; }
  .qs::after, .exd-act.primary::after { transition: none; }
  .exd-spot { display: none; }
  .exd-swap-enter-active, .exd-swap-leave-active { transition: opacity 0.15s; }
  .exd-swap-enter-from, .exd-swap-leave-to { transform: none; }
}
</style>
