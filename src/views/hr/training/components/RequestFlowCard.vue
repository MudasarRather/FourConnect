<template>
  <Motion as="article" class="rfc" :class="[`tone-${tone}`, { actionable }]"
    :data-status="request.status"
    :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.42, delay: Math.min(index * 0.04, 0.32), ease: [0.16, 1, 0.3, 1] }"
    :whileHover="reduced ? {} : { y: -3 }">
    <span class="rfc-rail" aria-hidden="true" />
    <span class="rfc-glow" aria-hidden="true" />

    <div class="rfc-main" @click="$emit('view', request)">
      <div class="rfc-row">
        <span class="rfc-num trn-mono">{{ request.request_number || '—' }}</span>
        <TrnStatusStamp :status="request.status" kind="request" />
        <span v-if="actionable" class="rfc-flag" aria-hidden="true"><Zap :size="11" /> Action</span>
        <span v-if="request.estimated_cost != null" class="rfc-cost trn-mono">{{ fmtCost(request.estimated_cost, request.currency) }}</span>
      </div>

      <h3 class="rfc-title">{{ request.title || 'Untitled request' }}</h3>

      <div class="rfc-emp">
        <span class="rfc-avatar" aria-hidden="true">{{ initials(request.employee_name) }}</span>
        <div class="rfc-emp-info">
          <span class="rfc-emp-name">{{ request.employee_name || '—' }}</span>
          <span class="rfc-emp-meta">
            <template v-if="request.employee_code"><span class="trn-mono">{{ request.employee_code }}</span></template>
            <template v-if="request.department_name"> · {{ request.department_name }}</template>
          </span>
        </div>
        <span v-if="request.program_name" class="rfc-tag"><BookOpen :size="12" /> {{ request.program_name }}</span>
        <span v-else-if="request.external_provider" class="rfc-tag ext"><Building2 :size="12" /> {{ request.external_provider }}</span>
      </div>

      <!-- inline approval chain -->
      <div v-if="chain.length" class="rfc-chain" ref="chainRef">
        <div class="rfc-chain-track"><span class="rfc-chain-fill" :style="{ width: progressW }" /></div>
        <div class="rfc-chain-nodes">
          <span v-for="(s, i) in chain" :key="i" class="rfc-node" :data-state="s.state"
            :style="{ transitionDelay: (0.15 + i * 0.08) + 's' }">
            <component :is="s.icon" :size="11" />
            <span class="rfc-node-tip">{{ s.label }} · {{ s.stateText }}</span>
          </span>
          <span class="rfc-node rfc-node-end" :data-state="endState">
            <GraduationCap :size="11" />
            <span class="rfc-node-tip">Enrolment · {{ endText }}</span>
          </span>
        </div>
      </div>
      <div class="rfc-foot-meta">
        <span v-if="request.preferred_start_date"><CalendarClock :size="11" /> Prefers {{ fmtDate(request.preferred_start_date) }}</span>
        <span v-if="submitted"><Clock3 :size="11" /> {{ submitted }}</span>
        <span v-if="request.status === 'APPROVED' && !request.program_id" class="warn"><AlertTriangle :size="11" /> Needs program</span>
      </div>
    </div>

    <div class="rfc-actions">
      <Motion as="button" type="button" class="rfc-btn" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }" @click="$emit('view', request)">
        <Eye :size="14" /> View
      </Motion>
      <Motion v-if="request.status === 'PENDING_APPROVAL'" as="button" type="button" class="rfc-btn primary"
        :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }" @click="$emit('decide', request)">
        <Gavel :size="14" /> Decide
      </Motion>
      <Motion v-else-if="request.status === 'APPROVED'" as="button" type="button" class="rfc-btn go"
        :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }" @click="$emit('fulfill', request)">
        <CheckCheck :size="14" /> Fulfil
      </Motion>
      <span v-else-if="request.status === 'FULFILLED'" class="rfc-done"><BadgeCheck :size="14" /> Enrolled</span>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { Motion } from 'motion-v'
import {
  Eye, Gavel, CheckCheck, BookOpen, Building2, GraduationCap, CalendarClock, Clock3,
  BadgeCheck, Zap, AlertTriangle, Check, X, CornerUpLeft, SkipForward, User,
} from 'lucide-vue-next'
import TrnStatusStamp from './TrnStatusStamp.vue'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  request: { type: Object, required: true },
  index: { type: Number, default: 0 },
})
defineEmits(['view', 'decide', 'fulfill'])
const reduced = prefersReduced()

const TONE = {
  PENDING_APPROVAL: 'pending', APPROVED: 'approved', FULFILLED: 'done',
  REJECTED: 'danger', RETURNED: 'warn', CANCELLED: 'mute', DRAFT: 'mute',
}
const tone = computed(() => TONE[props.request.status] || 'mute')
const actionable = computed(() => ['PENDING_APPROVAL', 'APPROVED'].includes(props.request.status))

const ICONS = { approved: Check, rejected: X, returned: CornerUpLeft, skipped: SkipForward, pending: User, upcoming: User }

const stepState = (s, i) => {
  const raw = (s?.decision || s?.status || '').toString().toUpperCase()
  if (raw.includes('APPROV')) return 'approved'
  if (raw.includes('REJECT')) return 'rejected'
  if (raw.includes('RETURN')) return 'returned'
  if (raw.includes('SKIP')) return 'skipped'
  const cur = props.request?.current_step ?? 0
  if (raw.includes('PEND')) return i === cur ? 'pending' : 'upcoming'
  if (i < cur) return 'approved'
  if (i === cur) return props.request.status === 'PENDING_APPROVAL' ? 'pending' : 'upcoming'
  return 'upcoming'
}
const STATE_TEXT = { approved: 'Approved', rejected: 'Rejected', returned: 'Returned', skipped: 'Skipped', pending: 'Pending', upcoming: 'Upcoming' }

const chain = computed(() => {
  const steps = Array.isArray(props.request?.approval_steps) ? props.request.approval_steps : []
  return steps.map((s, i) => {
    const state = stepState(s, i)
    return { label: s.label || `Stage ${i + 1}`, state, stateText: STATE_TEXT[state] || 'Pending', icon: ICONS[state] || User }
  })
})

const endState = computed(() => {
  if (props.request.status === 'FULFILLED') return 'approved'
  if (props.request.status === 'APPROVED') return 'pending'
  if (['REJECTED', 'CANCELLED'].includes(props.request.status)) return 'skipped'
  return 'upcoming'
})
const endText = computed(() => props.request.status === 'FULFILLED' ? 'Created' : props.request.status === 'APPROVED' ? 'Ready' : 'Pending')

// progress fill — fraction of the chain (+ enrolment node) that's resolved
const mounted = ref(false)
onMounted(() => nextTick(() => { mounted.value = true }))
const progressW = computed(() => {
  if (!mounted.value) return '0%'
  const total = chain.value.length + 1
  let done = chain.value.filter(c => ['approved', 'rejected', 'returned', 'skipped'].includes(c.state)).length
  if (props.request.status === 'FULFILLED') done = total
  else if (props.request.status === 'APPROVED') done = chain.value.length
  const frac = total ? done / total : 0
  return `${Math.round(frac * 100)}%`
})

const initials = (name) => name ? name.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() : '—'
const fmtDate = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}
const submitted = computed(() => {
  const d = props.request.submitted_at || props.request.created_at
  if (!d) return ''
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return ''
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
})
const fmtCost = (v, ccy) => {
  if (v == null) return ''
  try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: ccy || 'INR', maximumFractionDigits: 0 }).format(v) }
  catch { return `${ccy || 'INR'} ${v}` }
}
</script>

<style scoped>
.rfc { position: relative; display: flex; align-items: stretch; gap: 14px; padding: 15px 16px 15px 19px; overflow: hidden; isolation: isolate;
  border-radius: 18px; border: 1px solid var(--trn-border-soft); background: var(--trn-surf-card); box-shadow: var(--trn-card-shadow);
  transition: box-shadow 0.3s, border-color 0.3s; }
.rfc:hover { box-shadow: var(--trn-card-shadow-hover); border-color: color-mix(in srgb, var(--tone-c) 30%, transparent); }
.rfc { --tone-c: var(--trn-st-not-started); }
.rfc.tone-pending { --tone-c: var(--trn-st-in-progress); }
.rfc.tone-approved { --tone-c: var(--trn-amber-strong); }
.rfc.tone-done { --tone-c: var(--trn-st-completed); }
.rfc.tone-danger { --tone-c: var(--trn-st-failed); }
.rfc.tone-warn { --tone-c: var(--trn-st-waived); }
.rfc.tone-mute { --tone-c: var(--trn-st-not-started); }

.rfc-rail { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: linear-gradient(180deg, var(--tone-c), color-mix(in srgb, var(--tone-c) 30%, transparent)); }
.rfc.actionable .rfc-rail { box-shadow: 0 0 12px -1px var(--tone-c); }
.rfc-glow { position: absolute; inset: 0; z-index: -1; pointer-events: none; opacity: 0; transition: opacity 0.35s;
  background: radial-gradient(120% 140% at 0% 50%, color-mix(in srgb, var(--tone-c) 9%, transparent), transparent 55%); }
.rfc:hover .rfc-glow { opacity: 1; }

.rfc-main { flex: 1; min-width: 0; cursor: pointer; display: flex; flex-direction: column; gap: 8px; }
.rfc-row { display: flex; align-items: center; gap: 10px; }
.rfc-num { font-size: 12px; font-weight: 700; color: var(--trn-amber-strong); }
.rfc-flag { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
  padding: 2px 7px; border-radius: 999px; color: var(--tone-c); background: color-mix(in srgb, var(--tone-c) 14%, transparent); }
.rfc-cost { margin-left: auto; font-size: 13px; font-weight: 800; color: var(--trn-text); }
.rfc-title { margin: 0; font-size: 15px; font-weight: 750; color: var(--trn-text); line-height: 1.3;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.rfc-emp { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.rfc-avatar { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; flex-shrink: 0;
  border-radius: 9px; font-family: var(--trn-mono); font-size: 11px; font-weight: 700; color: var(--trn-amber);
  background: color-mix(in srgb, var(--trn-amber) 14%, transparent); }
.rfc-emp-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.rfc-emp-name { font-size: 13px; font-weight: 700; color: var(--trn-text); }
.rfc-emp-meta { font-size: 11px; color: var(--trn-text-muted); }
.rfc-tag { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 600; color: var(--trn-text-secondary);
  padding: 4px 9px; border-radius: 8px; background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.rfc-tag :deep(svg) { color: var(--trn-amber-strong); }
.rfc-tag.ext :deep(svg) { color: var(--trn-ember); }

/* inline approval chain */
.rfc-chain { position: relative; padding: 6px 0 2px; }
.rfc-chain-track { position: absolute; left: 9px; right: 9px; top: 15px; height: 2px; border-radius: 999px; background: var(--trn-border-strong); }
.rfc-chain-fill { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--trn-amber-strong), var(--tone-c));
  transition: width 0.9s var(--trn-spring); }
.rfc-chain-nodes { position: relative; display: flex; align-items: center; justify-content: space-between; }
.rfc-node { position: relative; display: grid; place-items: center; width: 19px; height: 19px; border-radius: 50%; flex-shrink: 0;
  background: var(--trn-surface-elevated); border: 1.5px solid var(--trn-border-strong); color: var(--trn-text-dim);
  transition: transform 0.3s var(--trn-spring), border-color 0.3s, color 0.3s, background 0.3s; }
.rfc-node[data-state="approved"] { color: #fff; background: var(--trn-st-completed); border-color: var(--trn-st-completed); }
.rfc-node[data-state="rejected"] { color: #fff; background: var(--trn-st-failed); border-color: var(--trn-st-failed); }
.rfc-node[data-state="returned"] { color: #fff; background: var(--trn-st-waived); border-color: var(--trn-st-waived); }
.rfc-node[data-state="pending"] { color: var(--trn-st-in-progress); border-color: var(--trn-st-in-progress);
  background: var(--trn-st-in-progress-soft); animation: rfc-node-pulse 1.9s ease-in-out infinite; }
.rfc-node[data-state="skipped"] { opacity: 0.55; }
[data-theme="light"] .rfc-node[data-state="approved"], [data-theme="light"] .rfc-node[data-state="rejected"], [data-theme="light"] .rfc-node[data-state="returned"] { color: #fff; }
.rfc-node-tip { position: absolute; bottom: calc(100% + 7px); left: 50%; transform: translateX(-50%) translateY(4px); white-space: nowrap;
  font-size: 10.5px; font-weight: 600; padding: 4px 8px; border-radius: 7px; pointer-events: none; opacity: 0; z-index: 5;
  color: var(--trn-text); background: var(--trn-glass-deep); border: 1px solid var(--trn-border-strong); box-shadow: var(--trn-glass-shadow);
  transition: opacity 0.2s, transform 0.2s; }
.rfc-node:hover .rfc-node-tip { opacity: 1; transform: translateX(-50%) translateY(0); }

.rfc-foot-meta { display: flex; flex-wrap: wrap; gap: 14px; font-size: 11px; color: var(--trn-text-muted); }
.rfc-foot-meta span { display: inline-flex; align-items: center; gap: 5px; }
.rfc-foot-meta :deep(svg) { color: var(--trn-text-dim); }
.rfc-foot-meta .warn { color: var(--trn-st-waived); font-weight: 600; }
.rfc-foot-meta .warn :deep(svg) { color: var(--trn-st-waived); }

.rfc-actions { display: flex; flex-direction: column; justify-content: center; gap: 7px; flex-shrink: 0; }
.rfc-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; font: inherit; font-size: 12px; font-weight: 600;
  padding: 8px 13px; border-radius: 10px; border: 1px solid var(--trn-border-soft); background: var(--trn-surface); color: var(--trn-text-secondary);
  cursor: pointer; white-space: nowrap; transition: background 0.2s, color 0.2s, border-color 0.2s; }
.rfc-btn:hover { color: var(--trn-text); background: var(--trn-surface-elevated); }
.rfc-btn.primary { color: var(--trn-amber-strong); border-color: color-mix(in srgb, var(--trn-amber) 40%, transparent); background: color-mix(in srgb, var(--trn-amber) 13%, transparent); }
.rfc-btn.primary:hover { background: color-mix(in srgb, var(--trn-amber) 20%, transparent); }
.rfc-btn.go { color: var(--trn-st-completed); border-color: color-mix(in srgb, var(--trn-st-completed) 40%, transparent); background: var(--trn-st-completed-soft); }
.rfc-done { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: var(--trn-st-completed); padding: 8px 4px; }

@keyframes rfc-node-pulse { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--trn-st-in-progress) 55%, transparent); } 50% { box-shadow: 0 0 0 5px transparent; } }

@media (max-width: 620px) {
  .rfc { flex-direction: column; }
  .rfc-actions { flex-direction: row; justify-content: flex-end; }
  .rfc-title { white-space: normal; }
}
@media (prefers-reduced-motion: reduce) {
  .rfc-node[data-state="pending"] { animation: none; }
  .rfc-chain-fill, .rfc-node { transition: none !important; }
}
</style>
