<template>
  <TrnDrawer :open="open" wide eyebrow="Training request" :title="request?.title || ''" :icon="Inbox" @close="$emit('close')">
    <template v-if="request">
      <!-- status + lifecycle ribbon -->
      <Motion as="div" class="rd-hero"
        :initial="reduced ? false : { opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4 }">
        <div class="rd-hero-top">
          <span class="rd-num trn-mono">{{ request.request_number || '—' }}</span>
          <TrnStatusStamp :status="request.status" kind="request" />
        </div>
        <div class="rd-ribbon" :class="{ terminal: isTerminal }">
          <template v-for="(p, i) in phases" :key="p.key">
            <div class="rd-rib-node" :data-state="p.state" :style="{ transitionDelay: (0.1 + i * 0.09) + 's' }">
              <span class="rd-rib-dot"><component :is="p.icon" :size="12" /></span>
              <span class="rd-rib-lab">{{ p.label }}</span>
            </div>
            <span v-if="i < phases.length - 1" class="rd-rib-link" :data-on="p.state === 'done'" aria-hidden="true" />
          </template>
        </div>
        <div v-if="isTerminal" class="rd-terminal" :class="terminalTone">
          <component :is="terminalIcon" :size="13" /> {{ terminalText }}
        </div>
      </Motion>

      <!-- employee -->
      <Motion as="div" class="rd-emp"
        :initial="reduced ? false : { opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.06 }">
        <span class="rd-emp-avatar" aria-hidden="true">{{ initials(request.employee_name) }}</span>
        <div class="rd-emp-info">
          <span class="rd-emp-name">{{ request.employee_name || '—' }}</span>
          <span class="rd-emp-meta">
            <template v-if="request.employee_code"><span class="trn-mono">{{ request.employee_code }}</span></template>
            <template v-if="request.designation_name"> · {{ request.designation_name }}</template>
            <template v-if="request.department_name"> · {{ request.department_name }}</template>
          </span>
        </div>
      </Motion>

      <!-- key facts -->
      <Motion as="dl" class="rd-meta"
        :initial="reduced ? false : { opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.12 }">
        <div class="rd-meta-cell">
          <dt><BookOpen :size="11" /> Program</dt>
          <dd v-if="request.program_name">{{ request.program_name }}</dd>
          <dd v-else-if="request.external_provider" class="ext"><Building2 :size="12" /> {{ request.external_provider }}</dd>
          <dd v-else class="dim">Not specified</dd>
        </div>
        <div class="rd-meta-cell">
          <dt><Banknote :size="11" /> Estimated cost</dt>
          <dd>{{ fmtCost(request.estimated_cost, request.currency) }}</dd>
        </div>
        <div class="rd-meta-cell">
          <dt><CalendarClock :size="11" /> Preferred start</dt>
          <dd>{{ fmtDate(request.preferred_start_date) }}</dd>
        </div>
        <div class="rd-meta-cell">
          <dt><Layers :size="11" /> Current stage</dt>
          <dd>{{ currentStageLabel }}</dd>
        </div>
        <div class="rd-meta-cell">
          <dt><Send :size="11" /> Submitted</dt>
          <dd>{{ fmtDateTime(request.submitted_at || request.created_at) }}</dd>
        </div>
        <div class="rd-meta-cell">
          <dt><CircleCheck :size="11" /> Approved</dt>
          <dd>{{ fmtDateTime(request.approved_at) }}</dd>
        </div>
      </Motion>

      <!-- enrolment link -->
      <Motion v-if="request.resulting_assignment_id" as="button" type="button" class="rd-enrol"
        :initial="reduced ? false : { opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.16 }"
        :whileHover="{ y: -2 }" :whileTap="{ scale: 0.98 }" @click="$emit('go-enrollment', request)">
        <span class="rd-enrol-ic"><GraduationCap :size="16" /></span>
        <div class="rd-enrol-txt">
          <span class="rd-enrol-lab">Enrolment created</span>
          <span class="rd-enrol-sub">Open this employee's training in Employee Trainings</span>
        </div>
        <ArrowRight :size="16" class="rd-enrol-go" />
      </Motion>

      <!-- description / justification -->
      <Motion v-if="request.description" as="div" class="rd-block is-desc"
        :initial="reduced ? false : { opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.2, ease: [0.16, 1, 0.3, 1] }"
        :whileHover="reduced ? {} : { y: -2 }">
        <span class="rd-block-accent" aria-hidden="true" />
        <span class="rd-block-sheen" aria-hidden="true" />
        <FileText :size="60" class="rd-block-mark" aria-hidden="true" />
        <div class="rd-block-head">
          <span class="rd-block-ic"><FileText :size="14" /></span>
          <h4>Description</h4>
        </div>
        <p class="rd-block-text">{{ request.description }}</p>
      </Motion>
      <Motion v-if="request.justification" as="div" class="rd-block is-just"
        :initial="reduced ? false : { opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.24, ease: [0.16, 1, 0.3, 1] }"
        :whileHover="reduced ? {} : { y: -2 }">
        <span class="rd-block-accent" aria-hidden="true" />
        <span class="rd-block-sheen" aria-hidden="true" />
        <Quote :size="60" class="rd-block-mark flip" aria-hidden="true" />
        <div class="rd-block-head">
          <span class="rd-block-ic"><Quote :size="14" /></span>
          <h4>Business justification</h4>
        </div>
        <p class="rd-block-text">{{ request.justification }}</p>
      </Motion>

      <!-- decision notes -->
      <div v-if="request.reject_reason" class="rd-note danger">
        <span class="rd-note-label"><Ban :size="12" /> Reject reason</span><p>{{ request.reject_reason }}</p>
      </div>
      <div v-if="request.return_reason" class="rd-note warn">
        <span class="rd-note-label"><CornerUpLeft :size="12" /> Return reason</span><p>{{ request.return_reason }}</p>
      </div>
      <div v-if="request.approver_notes" class="rd-note">
        <span class="rd-note-label"><MessageSquare :size="12" /> Approver notes</span><p>{{ request.approver_notes }}</p>
      </div>

      <!-- approval timeline -->
      <Motion v-if="steps.length" as="div" class="rd-block is-chain"
        :initial="reduced ? false : { opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.28, ease: [0.16, 1, 0.3, 1] }">
        <span class="rd-block-accent" aria-hidden="true" />
        <div class="rd-block-head">
          <span class="rd-block-ic"><Route :size="14" /></span>
          <h4>Approval chain</h4>
          <span class="rd-chain-meta trn-mono">{{ resolvedCount }}/{{ steps.length }}</span>
        </div>
        <ol class="rd-timeline">
          <li v-for="(s, i) in steps" :key="i" class="rd-step" :class="{ current: i === request.current_step }"
            :style="{ '--d': (0.32 + i * 0.1) + 's' }">
            <span class="rd-step-dot" :data-decision="dotState(s, i)" aria-hidden="true">
              <component :is="stateIcon(s, i)" :size="11" />
            </span>
            <div class="rd-step-body">
              <div class="rd-step-head">
                <span class="rd-step-label">{{ s.label || ('Stage ' + (i + 1)) }}</span>
                <span class="rd-step-state" :data-decision="dotState(s, i)">{{ stateText(s, i) }}</span>
              </div>
              <span class="rd-step-approver">
                <component :is="s.approver_type === 'HR' ? ShieldCheck : User" :size="11" />
                {{ s.approver_name || (s.approver_type === 'HR' ? 'HR' : s.approver_type) || '—' }}
                <template v-if="s.decided_by_name"> · decided by {{ s.decided_by_name }}</template>
              </span>
              <span v-if="s.decided_at" class="rd-step-time">{{ fmtDateTime(s.decided_at) }}</span>
              <p v-if="s.notes" class="rd-step-notes">{{ s.notes }}</p>
            </div>
          </li>
        </ol>
      </Motion>
    </template>

    <template #footer>
      <button v-if="request && request.status === 'PENDING_APPROVAL'" class="trn-btn trn-btn-primary" @click="$emit('decide', request)">
        <Gavel :size="14" /> Decide
      </button>
      <button v-else-if="request && request.status === 'APPROVED'" class="trn-btn rd-fulfil" @click="$emit('fulfill', request)">
        <CheckCheck :size="14" /> Fulfil → enrol
      </button>
      <button class="trn-btn trn-btn-ghost" @click="$emit('close')">Done</button>
    </template>
  </TrnDrawer>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import {
  Inbox, Gavel, CheckCheck, Ban, CornerUpLeft, MessageSquare, BookOpen, Building2, Banknote,
  CalendarClock, Layers, Send, CircleCheck, GraduationCap, ArrowRight, FileText, Quote, Route,
  ShieldCheck, User, Check, X, SkipForward, Clock3, CircleSlash,
} from 'lucide-vue-next'
import TrnDrawer from '../components/TrnDrawer.vue'
import TrnStatusStamp from '../components/TrnStatusStamp.vue'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  open: { type: Boolean, default: false },
  request: { type: Object, default: null },
})
defineEmits(['close', 'decide', 'fulfill', 'go-enrollment'])
const reduced = prefersReduced()

const steps = computed(() => Array.isArray(props.request?.approval_steps) ? props.request.approval_steps : [])
const resolvedCount = computed(() => steps.value.filter(s => {
  const d = (s?.decision || '').toString().toUpperCase()
  return d.includes('APPROV') || d.includes('REJECT') || d.includes('RETURN') || d.includes('SKIP')
}).length)

// ── lifecycle ribbon ──────────────────────────────────────────────────────────
const PHASE_IDX = { DRAFT: 0, PENDING_APPROVAL: 1, RETURNED: 1, APPROVED: 2, FULFILLED: 3, REJECTED: 1, CANCELLED: 0 }
const isTerminal = computed(() => ['REJECTED', 'CANCELLED'].includes(props.request?.status))
const phases = computed(() => {
  const idx = PHASE_IDX[props.request?.status] ?? 0
  const defs = [
    { key: 'submitted', label: 'Submitted', icon: Send },
    { key: 'review', label: 'In review', icon: Clock3 },
    { key: 'approved', label: 'Approved', icon: CircleCheck },
    { key: 'enrolled', label: 'Enrolled', icon: GraduationCap },
  ]
  return defs.map((d, i) => ({
    ...d,
    state: isTerminal.value ? (i <= idx ? 'done' : 'dead')
      : i < idx ? 'done' : i === idx ? 'current' : 'upcoming',
  }))
})
const terminalTone = computed(() => props.request?.status === 'REJECTED' ? 'danger' : 'mute')
const terminalIcon = computed(() => props.request?.status === 'REJECTED' ? Ban : CircleSlash)
const terminalText = computed(() => props.request?.status === 'REJECTED'
  ? 'This request was rejected and is closed.'
  : 'This request was cancelled by the employee.')

const currentStageLabel = computed(() => {
  const r = props.request
  if (!r) return '—'
  if (r.status === 'FULFILLED') return 'Enrolled'
  if (r.status === 'APPROVED') return 'Ready to fulfil'
  if (isTerminal.value) return r.status === 'REJECTED' ? 'Rejected' : 'Cancelled'
  const step = steps.value[r.current_step]
  return step?.label || (r.status === 'RETURNED' ? 'Returned to employee' : '—')
})

const initials = (name) => name ? name.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() : '—'
const fmtDate = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
const fmtDateTime = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
const fmtCost = (v, ccy) => {
  if (v == null) return '—'
  try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: ccy || 'INR', maximumFractionDigits: 0 }).format(v) }
  catch { return `${ccy || 'INR'} ${v}` }
}

// timeline step state
const dotState = (s, i) => {
  const raw = (s?.decision || s?.status || '').toString().toUpperCase()
  if (raw.includes('APPROV')) return 'approved'
  if (raw.includes('REJECT')) return 'rejected'
  if (raw.includes('RETURN')) return 'returned'
  if (raw.includes('SKIP')) return 'skipped'
  if (raw.includes('PEND')) return i === props.request?.current_step ? 'pending' : 'upcoming'
  if (i < (props.request?.current_step ?? 0)) return 'approved'
  if (i === (props.request?.current_step ?? 0)) return props.request?.status === 'PENDING_APPROVAL' ? 'pending' : 'upcoming'
  return 'upcoming'
}
const STATE_TEXT = { approved: 'Approved', rejected: 'Rejected', returned: 'Returned', skipped: 'Skipped', pending: 'Pending', upcoming: 'Upcoming' }
const STATE_ICON = { approved: Check, rejected: X, returned: CornerUpLeft, skipped: SkipForward, pending: Clock3, upcoming: Clock3 }
const stateText = (s, i) => STATE_TEXT[dotState(s, i)] || 'Pending'
const stateIcon = (s, i) => STATE_ICON[dotState(s, i)] || Clock3
</script>

<style scoped>
.rd-hero { padding: 14px 16px; border-radius: 16px; margin-bottom: 16px; background: var(--trn-grad-hero), var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.rd-hero-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 16px; }
.rd-num { font-size: 13px; font-weight: 700; color: var(--trn-amber-strong); }

.rd-ribbon { display: flex; align-items: flex-start; }
.rd-ribbon.terminal { opacity: 0.78; }
.rd-rib-node { display: flex; flex-direction: column; align-items: center; gap: 5px; width: 58px; flex-shrink: 0; text-align: center;
  opacity: 0; transform: translateY(6px); transition: opacity 0.4s var(--trn-spring), transform 0.4s var(--trn-spring); }
.rd-hero .rd-rib-node { opacity: 1; transform: none; }
.rd-rib-dot { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
  color: var(--trn-text-dim); background: var(--trn-surface-elevated); border: 1.5px solid var(--trn-border-strong); transition: all 0.35s; }
.rd-rib-node[data-state="done"] .rd-rib-dot { color: #fff; background: var(--trn-st-completed); border-color: var(--trn-st-completed); }
[data-theme="light"] .rd-rib-node[data-state="done"] .rd-rib-dot { color: #fff; }
.rd-rib-node[data-state="current"] .rd-rib-dot { color: var(--trn-amber); border-color: var(--trn-amber); background: color-mix(in srgb, var(--trn-amber) 14%, transparent);
  animation: rd-rib-pulse 1.9s ease-in-out infinite; }
.rd-rib-node[data-state="dead"] { opacity: 0.4; }
.rd-rib-lab { font-size: 10.5px; font-weight: 600; color: var(--trn-text-muted); line-height: 1.2; }
.rd-rib-node[data-state="current"] .rd-rib-lab { color: var(--trn-amber-strong); font-weight: 700; }
.rd-rib-link { flex: 1; height: 2px; margin-top: 15px; border-radius: 999px; background: var(--trn-border-strong); transition: background 0.4s; }
.rd-rib-link[data-on="true"] { background: var(--trn-st-completed); }

.rd-terminal { display: flex; align-items: center; gap: 7px; margin-top: 14px; padding: 8px 11px; border-radius: 10px; font-size: 12px; font-weight: 600; }
.rd-terminal.danger { color: var(--trn-st-failed); background: var(--trn-st-failed-soft); }
.rd-terminal.mute { color: var(--trn-text-muted); background: var(--trn-surface-elevated); }

.rd-emp { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 14px; margin-bottom: 16px;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.rd-emp-avatar { display: inline-flex; align-items: center; justify-content: center; width: 42px; height: 42px; flex-shrink: 0;
  border-radius: 12px; font-family: var(--trn-mono); font-size: 14px; font-weight: 700; color: var(--trn-amber);
  background: color-mix(in srgb, var(--trn-amber) 14%, transparent); border: 1px solid color-mix(in srgb, var(--trn-amber) 24%, transparent); }
.rd-emp-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.rd-emp-name { font-size: 14.5px; font-weight: 700; color: var(--trn-text); }
.rd-emp-meta { font-size: 11.5px; color: var(--trn-text-muted); }

.rd-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; margin: 0 0 16px; border-radius: 14px; overflow: hidden;
  background: var(--trn-border-soft); border: 1px solid var(--trn-border-soft); }
.rd-meta-cell { display: flex; flex-direction: column; gap: 4px; padding: 11px 13px; background: var(--trn-surface); }
.rd-meta dt { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--trn-text-dim); }
.rd-meta dt :deep(svg) { color: var(--trn-text-dim); }
.rd-meta dd { margin: 0; font-size: 13.5px; color: var(--trn-text); font-weight: 650; display: inline-flex; align-items: center; gap: 5px; }
.rd-meta dd.ext :deep(svg) { color: var(--trn-ember); }
.rd-meta dd.dim { color: var(--trn-text-dim); font-weight: 500; }

.rd-enrol { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; cursor: pointer; padding: 12px 14px; border-radius: 14px; margin-bottom: 16px;
  background: var(--trn-st-completed-soft); border: 1px solid color-mix(in srgb, var(--trn-st-completed) 30%, transparent); transition: background 0.2s; }
.rd-enrol:hover { background: color-mix(in srgb, var(--trn-st-completed) 18%, transparent); }
.rd-enrol-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
  color: var(--trn-st-completed); background: color-mix(in srgb, var(--trn-st-completed) 15%, transparent); }
.rd-enrol-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.rd-enrol-lab { font-size: 13.5px; font-weight: 700; color: var(--trn-text); }
.rd-enrol-sub { font-size: 11.5px; color: var(--trn-text-muted); }
.rd-enrol-go { color: var(--trn-st-completed); flex-shrink: 0; }

/* ── content blocks — animated cards ─────────────────────────────────────── */
.rd-block { --accent-c: var(--trn-amber-strong); --accent-delay: 0.32s;
  position: relative; overflow: hidden; margin-bottom: 14px; padding: 15px 17px 16px 19px; border-radius: 16px;
  background: var(--trn-surf-card); border: 1px solid var(--trn-border-soft); box-shadow: var(--trn-card-shadow);
  transition: border-color 0.32s, box-shadow 0.32s; }
.rd-block:hover { border-color: color-mix(in srgb, var(--accent-c) 30%, transparent); box-shadow: var(--trn-card-shadow-hover); }
.rd-block.is-desc { --accent-c: var(--trn-amber-strong); --accent-delay: 0.26s; }
.rd-block.is-just { --accent-c: var(--trn-ember); --accent-delay: 0.3s; }
.rd-block.is-chain { --accent-c: var(--trn-amber-strong); --accent-delay: 0.34s; }

/* left accent bar — draws in, soft glow */
.rd-block-accent { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; z-index: 3; transform-origin: top center;
  background: linear-gradient(180deg, color-mix(in srgb, var(--accent-c) 88%, #fff), var(--accent-c));
  box-shadow: 0 0 12px -1px color-mix(in srgb, var(--accent-c) 75%, transparent);
  animation: rd-accent-draw 0.7s var(--trn-spring) both; animation-delay: var(--accent-delay); }

/* one-shot light sweep on reveal */
.rd-block-sheen { position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background: linear-gradient(105deg, transparent 32%, var(--trn-glare) 50%, transparent 68%);
  background-size: 240% 100%; background-position: 150% 0;
  animation: rd-block-sheen 1.2s var(--trn-ease) both; animation-delay: var(--accent-delay); }

/* oversized watermark glyph */
.rd-block-mark { position: absolute; right: 6px; bottom: 2px; z-index: 0; color: var(--accent-c); opacity: 0.07; pointer-events: none;
  transition: transform 0.5s var(--trn-spring), opacity 0.5s; }
.rd-block-mark.flip { transform: scaleX(-1); }
.rd-block:hover .rd-block-mark { opacity: 0.14; transform: rotate(-8deg) scale(1.1); }
.rd-block:hover .rd-block-mark.flip { transform: scaleX(-1) rotate(8deg) scale(1.1); }

.rd-block-head { position: relative; z-index: 2; display: flex; align-items: center; gap: 10px; margin-bottom: 11px; }
.rd-block-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 10px; flex-shrink: 0;
  color: var(--accent-c); background: color-mix(in srgb, var(--accent-c) 13%, transparent); border: 1px solid color-mix(in srgb, var(--accent-c) 28%, transparent);
  transition: transform 0.32s var(--trn-spring), box-shadow 0.32s; animation: rd-ic-pop 0.55s var(--trn-spring) backwards; animation-delay: var(--accent-delay); }
.rd-block:hover .rd-block-ic { transform: scale(1.08) rotate(-5deg); box-shadow: 0 0 14px -3px color-mix(in srgb, var(--accent-c) 70%, transparent); }
.rd-block-head h4 { margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--trn-text-muted); font-weight: 700; }
.rd-chain-meta { margin-left: auto; font-size: 11px; font-weight: 700; padding: 2px 9px; border-radius: 999px;
  color: var(--trn-amber-strong); background: color-mix(in srgb, var(--trn-amber) 14%, transparent); }

.rd-block-text { position: relative; z-index: 2; margin: 0; font-size: 13.5px; line-height: 1.62; color: var(--trn-text-secondary); white-space: pre-wrap; }
.rd-block.is-just .rd-block-text { font-style: italic; }

@keyframes rd-accent-draw { from { transform: scaleY(0); } to { transform: scaleY(1); } }
@keyframes rd-block-sheen { from { background-position: 150% 0; } to { background-position: -50% 0; } }
@keyframes rd-ic-pop { 0% { opacity: 0; transform: scale(0.55); } 60% { transform: scale(1.14); } 100% { opacity: 1; transform: scale(1); } }

.rd-note { padding: 11px 14px; border-radius: 12px; margin-bottom: 14px; background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.rd-note-label { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--trn-text-muted); margin-bottom: 4px; }
.rd-note p { margin: 0; font-size: 13px; line-height: 1.5; color: var(--trn-text-secondary); white-space: pre-wrap; }
.rd-note.danger { border-color: color-mix(in srgb, var(--trn-st-failed) 32%, transparent); }
.rd-note.danger .rd-note-label { color: var(--trn-st-failed); }
.rd-note.warn { border-color: color-mix(in srgb, var(--trn-st-waived) 32%, transparent); }
.rd-note.warn .rd-note-label { color: var(--trn-st-waived); }

.rd-timeline { list-style: none; margin: 0; padding: 0; }
.rd-step { position: relative; display: flex; gap: 13px; padding-bottom: 18px; animation: rd-step-in 0.45s var(--trn-spring) both; animation-delay: var(--d); }
.rd-step::before { content: ''; position: absolute; left: 11px; top: 22px; bottom: -2px; width: 1.5px; background: var(--trn-border-strong); }
.rd-step:last-child { padding-bottom: 0; }
.rd-step:last-child::before { display: none; }
.rd-step-dot { position: relative; z-index: 1; display: grid; place-items: center; flex-shrink: 0; width: 23px; height: 23px; border-radius: 50%;
  color: var(--trn-text-dim); background: var(--trn-surface-elevated); border: 1.5px solid var(--trn-border-strong); box-shadow: 0 0 0 3px var(--trn-surface-elevated); }
.rd-step-dot[data-decision="approved"] { color: #fff; background: var(--trn-st-completed); border-color: var(--trn-st-completed); }
.rd-step-dot[data-decision="rejected"] { color: #fff; background: var(--trn-st-failed); border-color: var(--trn-st-failed); }
.rd-step-dot[data-decision="returned"] { color: #fff; background: var(--trn-st-waived); border-color: var(--trn-st-waived); }
.rd-step-dot[data-decision="skipped"]  { opacity: 0.55; }
.rd-step-dot[data-decision="upcoming"] { opacity: 0.6; }
.rd-step-dot[data-decision="pending"]  { color: var(--trn-st-in-progress); border-color: var(--trn-st-in-progress); background: var(--trn-st-in-progress-soft); animation: rd-rib-pulse 1.8s ease-in-out infinite; }
[data-theme="light"] .rd-step-dot[data-decision="approved"], [data-theme="light"] .rd-step-dot[data-decision="rejected"], [data-theme="light"] .rd-step-dot[data-decision="returned"] { color: #fff; }

.rd-step.current .rd-step-label { color: var(--trn-amber); }
.rd-step-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.rd-step-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.rd-step-label { font-size: 13.5px; font-weight: 700; color: var(--trn-text); }
.rd-step-state { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; font-family: var(--trn-mono); }
.rd-step-state[data-decision="approved"] { color: var(--trn-st-completed); }
.rd-step-state[data-decision="rejected"] { color: var(--trn-st-failed); }
.rd-step-state[data-decision="returned"] { color: var(--trn-st-waived); }
.rd-step-state[data-decision="pending"]  { color: var(--trn-st-in-progress); }
.rd-step-state[data-decision="skipped"], .rd-step-state[data-decision="upcoming"] { color: var(--trn-text-dim); }
.rd-step-approver { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--trn-text-muted); }
.rd-step-approver :deep(svg) { color: var(--trn-text-dim); }
.rd-step-time { font-size: 11px; font-family: var(--trn-mono); color: var(--trn-text-dim); }
.rd-step-notes { margin: 5px 0 0; font-size: 12.5px; line-height: 1.5; color: var(--trn-text-secondary); padding: 7px 10px; border-radius: 9px; background: var(--trn-surface); white-space: pre-wrap; }

.rd-fulfil { background: linear-gradient(120deg, var(--trn-st-completed), color-mix(in srgb, var(--trn-st-completed) 70%, #000)); color: #04261a; border: none;
  box-shadow: 0 8px 22px -10px color-mix(in srgb, var(--trn-st-completed) 70%, transparent); }
[data-theme="light"] .rd-fulfil { color: #fff; }

@keyframes rd-rib-pulse { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--trn-amber) 50%, transparent); } 50% { box-shadow: 0 0 0 5px transparent; } }
@keyframes rd-step-in { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
@media (prefers-reduced-motion: reduce) {
  .rd-rib-node[data-state="current"] .rd-rib-dot, .rd-step-dot[data-decision="pending"] { animation: none; }
  .rd-step { animation: none; }
  .rd-block-accent, .rd-block-sheen, .rd-block-ic { animation: none !important; }
  .rd-block-accent { transform: scaleY(1); }
  .rd-block-sheen { display: none; }
  .rd-block:hover .rd-block-mark, .rd-block:hover .rd-block-ic { transform: none; }
  .rd-block:hover .rd-block-mark.flip { transform: scaleX(-1); }
}
</style>
