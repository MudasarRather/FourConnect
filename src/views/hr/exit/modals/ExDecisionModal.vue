<template>
  <Teleport to="body">
    <Presence>
      <div v-if="open" class="exd-overlay" @mousedown.self="close">
        <Motion as="div" class="exd ex-grain" :class="`tone-${tone}`"
          :initial="reduced ? false : { opacity: 0, y: 26, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18, scale: 0.97 }" :transition="{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }">
          <span class="exd-aura" aria-hidden="true" />
          <span class="exd-edge" aria-hidden="true" />

          <header class="exd-head">
            <span class="exd-ico">
              <span class="exd-pulse" aria-hidden="true" />
              <span v-if="cfg.reverts" class="exd-rewind" aria-hidden="true" />
              <component :is="cfg.icon" :size="20" />
            </span>
            <div class="exd-htxt">
              <h3 class="exd-title">{{ cfg.title }}</h3>
              <p class="exd-sub">{{ cfg.sub }}</p>
            </div>
            <button class="exd-x" @click="close" type="button" aria-label="Close"><X :size="17" /></button>
          </header>

          <div class="exd-body">
            <!-- subject of the action -->
            <div class="exd-subject">
              <span class="exd-avatar">{{ init }}</span>
              <div class="exd-sid">
                <span class="exd-name">{{ caseInfo?.employee_name || caseInfo?.employee_code || 'This case' }}</span>
                <span class="exd-code ex-mono">{{ caseInfo?.case_number || '—' }}</span>
              </div>
              <Presence>
                <Motion v-if="valid" class="exd-stamp" :initial="{ opacity: 0, scale: 1.6, rotate: -8 }"
                  :animate="{ opacity: 1, scale: 1, rotate: -6 }" :exit="{ opacity: 0, scale: 1.4 }"
                  :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">{{ cfg.stamp }}</Motion>
              </Presence>
            </div>

            <!-- live impact of undoing an in-progress separation -->
            <div v-if="hasImpact" class="exd-impact">
              <Motion v-for="(s, i) in impactStats" :key="s.k" as="div" class="imp"
                :initial="reduced ? false : { opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.32, delay: 0.05 + i * 0.07, ease: [0.16, 1, 0.3, 1] }">
                <span class="imp-ico"><component :is="s.icon" :size="14" /></span>
                <span class="imp-v ex-mono">{{ s.v }}</span>
                <span class="imp-k">{{ s.k }}</span>
              </Motion>
            </div>

            <!-- structured consequences -->
            <div class="exd-conseq">
              <span class="cq-h"><component :is="cfg.reverts ? RotateCcw : AlertTriangle" :size="13" /> What happens</span>
              <ul>
                <Motion v-for="(c, i) in cfg.consequences" :key="i" as="li"
                  :initial="reduced ? false : { opacity: 0, x: -8 }" :animate="{ opacity: 1, x: 0 }"
                  :transition="{ duration: 0.3, delay: 0.08 + i * 0.06, ease: [0.16, 1, 0.3, 1] }">
                  <span class="cq-dot" /> {{ c }}
                </Motion>
              </ul>
            </div>

            <!-- preset reasons -->
            <div class="exd-fld">
              <label>Reason <i>*</i></label>
              <div class="reason-grid">
                <Motion v-for="(r, i) in presets" :key="r" as="button" type="button"
                  class="reason-chip" :class="{ on: picked === r }" @click="pick(r)"
                  :initial="reduced ? false : { opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
                  :transition="{ duration: 0.3, delay: 0.06 + i * 0.04, ease: [0.16, 1, 0.3, 1] }"
                  :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }">
                  <span class="rc-tick"><Check :size="11" /></span>
                  <span>{{ r }}</span>
                </Motion>
              </div>
            </div>

            <!-- elaboration -->
            <div class="exd-fld">
              <label>{{ picked === 'Other' ? 'Specify the reason' : 'Add a note' }} <i v-if="picked === 'Other'">*</i><span v-else class="opt">optional</span></label>
              <textarea v-model="note" rows="2" :placeholder="cfg.placeholder" />
            </div>

            <!-- acknowledgment gate (reverting actions only) -->
            <button v-if="needAck" class="exd-ack" :class="{ on: acknowledged }" type="button" @click="acknowledged = !acknowledged">
              <span class="ack-box"><Check :size="12" /></span>
              <span class="ack-txt">{{ ackLabel }}</span>
            </button>
          </div>

          <footer class="exd-foot">
            <button class="exd-btn ghost" @click="close" type="button">Keep case</button>
            <Motion as="button" class="exd-btn danger" :class="{ off: !valid || busy }" type="button"
              @click="submit" :whileHover="valid && !busy ? { y: -2 } : {}" :whileTap="valid && !busy ? { scale: 0.96 } : {}">
              <span class="exd-btn-sheen" aria-hidden="true" />
              <Loader2 v-if="busy" :size="15" class="spin" />
              <component v-else :is="cfg.icon" :size="15" />
              {{ cfg.cta }}
            </Motion>
          </footer>
        </Motion>
      </div>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X, Check, Loader2, XCircle, Ban, RotateCcw, AlertTriangle, CalendarClock, ClipboardCheck, Hourglass } from 'lucide-vue-next'
import { initials, daysBetween, daysRemaining, todayISO } from '@/composables/useExit'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  open: { type: Boolean, default: false },
  mode: { type: String, default: 'reject' }, // reject | cancel
  caseInfo: { type: Object, default: null },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'submit'])
const reduced = prefersReduced()

const CFG = {
  reject: {
    title: 'Reject resignation', sub: 'Decline this separation request', cta: 'Reject request', stamp: 'REJECTED',
    icon: XCircle, tone: 'danger', reverts: false, placeholder: 'Context the employee and audit log will see…',
    consequences: [
      'The request is marked REJECTED — a terminal state kept for audit.',
      'The employee’s lifecycle is unchanged — they stay ACTIVE.',
      'They may file a fresh resignation later if circumstances change.',
    ],
  },
  cancel: {
    title: 'Cancel case', sub: 'Void this separation and stand the employee down', cta: 'Cancel case', stamp: 'VOID',
    icon: Ban, tone: 'caution', reverts: true, placeholder: 'Why is this separation being cancelled…',
    consequences: [
      'The case moves to CANCELLED — retained in the registry for audit.',
      'If the employee is ON NOTICE, their lifecycle reverts to ACTIVE.',
      'The notice countdown stops and the planned last working day is cleared.',
      'Clearance / settlement progress is halted and will not auto-resume.',
    ],
  },
}
const cfg = computed(() => CFG[props.mode] || CFG.reject)
const tone = computed(() => cfg.value.tone)

const PRESETS = {
  reject: ['Not aligned with business needs', 'Incomplete / unclear request', 'Retention — counter-offer extended', 'Policy / eligibility issue', 'Duplicate request', 'Other'],
  cancel: ['Employee retracted resignation', 'Counter-offer accepted — staying', 'Raised in error', 'Superseded by a new case', 'Management hold / review', 'Other'],
}
const presets = computed(() => PRESETS[props.mode] || PRESETS.reject)

const picked = ref('')
const note = ref('')
const acknowledged = ref(false)
const pick = (r) => { picked.value = picked.value === r ? '' : r }
watch(() => props.open, (o) => { if (o) { picked.value = ''; note.value = ''; acknowledged.value = false } })

const init = computed(() => initials(props.caseInfo?.employee_name || props.caseInfo?.employee_code))
const needAck = computed(() => cfg.value.reverts)
const ackLabel = computed(() => {
  if (props.mode !== 'cancel') return ''
  return noticeStart.value
    ? 'I understand the employee returns to ACTIVE and the notice period is voided.'
    : 'I understand this permanently voids the separation case.'
})

// ── live impact (only meaningful for a reverting cancel on an in-progress case) ──
const noticeStart = computed(() => props.caseInfo?.notice_period_start_date || null)
const servedDays = computed(() => {
  if (!noticeStart.value) return null
  const d = daysBetween(noticeStart.value, todayISO())
  return d == null ? null : Math.max(0, d)
})
const clearancePct = computed(() => {
  const v = props.caseInfo?.clearance_progress_pct
  return v == null ? null : Number(v)
})
const daysLeft = computed(() => {
  const v = props.caseInfo?.days_remaining
  return v != null ? v : daysRemaining(props.caseInfo?.last_working_date)
})
const impactStats = computed(() => {
  const out = []
  if (servedDays.value != null) out.push({ k: 'Notice served', v: `${servedDays.value}d`, icon: CalendarClock })
  if (clearancePct.value != null) out.push({ k: 'Clearance', v: `${Math.round(clearancePct.value)}%`, icon: ClipboardCheck })
  if (daysLeft.value != null) out.push({ k: daysLeft.value < 0 ? 'Overdue' : 'Days left', v: `${Math.abs(daysLeft.value)}d`, icon: Hourglass })
  return out
})
const hasImpact = computed(() => cfg.value.reverts && impactStats.value.length > 0)

const reason = computed(() => {
  const preset = picked.value && picked.value !== 'Other' ? picked.value : ''
  const n = note.value.trim()
  if (preset && n) return `${preset} — ${n}`
  return preset || n
})
const reasonValid = computed(() => (picked.value === 'Other' ? !!note.value.trim() : !!reason.value))
const valid = computed(() => reasonValid.value && (!needAck.value || acknowledged.value))

const close = () => { if (!props.busy) emit('close') }
const submit = () => { if (valid.value && !props.busy) emit('submit', { reason: reason.value }) }
</script>

<style scoped>
.exd-overlay { position: fixed; inset: 0; z-index: 1450; display: grid; place-items: center; padding: 20px;
  background: rgba(8, 4, 4, 0.7); backdrop-filter: blur(9px); -webkit-backdrop-filter: blur(9px); }
[data-theme="light"] .exd-overlay { background: rgba(50, 20, 12, 0.42); }
.exd { position: relative; overflow: hidden; width: min(470px, 96vw); max-height: 92vh; overflow-y: auto;
  border-radius: 22px; background: var(--ex-surface-elevated); border: 1px solid var(--ex-border-strong); box-shadow: var(--ex-shadow);
  --tone-c: #ef4444; --tone-soft: rgba(239, 68, 68, 0.14); --tone-bd: rgba(239, 68, 68, 0.34); }
.exd.tone-caution { --tone-c: #ea580c; --tone-soft: rgba(234, 88, 12, 0.14); --tone-bd: rgba(234, 88, 12, 0.34); }
.exd-aura { position: absolute; inset: -45% 25% 55% -10%; pointer-events: none; animation: ex-aura-drift 11s ease-in-out infinite;
  background: radial-gradient(60% 80% at 22% 0%, var(--tone-soft), transparent 72%); }
.exd-edge { position: absolute; top: 0; left: 0; right: 0; height: 2px; pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--tone-c), transparent); opacity: 0.85; }

.exd-head { position: relative; display: flex; align-items: flex-start; gap: 12px; padding: 18px 20px 12px; }
.exd-ico { position: relative; display: grid; place-items: center; width: 42px; height: 42px; border-radius: 13px; flex-shrink: 0;
  color: var(--tone-c); background: var(--tone-soft); border: 1px solid var(--tone-bd); }
.exd-pulse { position: absolute; inset: 0; border-radius: inherit; border: 1px solid var(--tone-c); animation: exd-pulse 2.4s ease-out infinite; }
.exd-rewind { position: absolute; inset: -6px; border-radius: 50%; border: 1.5px dashed color-mix(in srgb, var(--tone-c) 55%, transparent);
  border-right-color: transparent; border-bottom-color: transparent; animation: exd-rewind 3.4s linear infinite; }
.exd-htxt { flex: 1; min-width: 0; }
.exd-title { font-size: 17px; font-weight: 850; color: var(--ex-text); margin: 0; }
.exd-sub { font-size: 12px; color: var(--ex-text-muted); margin: 2px 0 0; }
.exd-x { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; cursor: pointer; flex-shrink: 0;
  background: transparent; border: 1px solid var(--ex-border); color: var(--ex-text-muted); transition: all 0.2s; }
.exd-x:hover { color: var(--ex-text); border-color: var(--ex-border-strong); transform: rotate(90deg); }

.exd-body { position: relative; padding: 4px 20px 14px; display: flex; flex-direction: column; gap: 13px; }

.exd-subject { position: relative; display: flex; align-items: center; gap: 11px; padding: 12px 13px; border-radius: 14px;
  background: var(--ex-surface); border: 1px solid var(--ex-border); overflow: hidden; }
.exd-avatar { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
  font-size: 13px; font-weight: 850; color: var(--tone-c); background: var(--tone-soft); border: 1px solid var(--tone-bd); }
.exd-sid { min-width: 0; flex: 1; }
.exd-name { display: block; font-size: 14px; font-weight: 820; color: var(--ex-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.exd-code { display: block; font-size: 11px; color: var(--ex-text-muted); }
.exd-stamp { font-size: 12px; font-weight: 900; letter-spacing: 0.1em; color: var(--tone-c); padding: 4px 10px; border-radius: 7px;
  border: 1.5px solid var(--tone-bd); background: var(--tone-soft); flex-shrink: 0; }

/* impact stats */
.exd-impact { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.exd-impact:has(.imp:only-child) { grid-template-columns: 1fr; }
.imp { display: flex; flex-direction: column; gap: 1px; padding: 9px 11px; border-radius: 12px; background: var(--ex-surface); border: 1px solid var(--ex-border); }
.imp-ico { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 8px; margin-bottom: 3px; color: var(--tone-c); background: var(--tone-soft); }
.imp-v { font-size: 16px; font-weight: 850; color: var(--ex-text); line-height: 1; }
.imp-k { font-size: 9.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ex-text-dim); margin-top: 3px; }

/* consequences */
.exd-conseq { padding: 11px 13px; border-radius: 12px; background: var(--tone-soft); border: 1px solid var(--tone-bd); }
.cq-h { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--tone-c); }
.exd-conseq ul { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.exd-conseq li { display: flex; align-items: flex-start; gap: 8px; font-size: 12.5px; line-height: 1.45; color: var(--ex-text-secondary); }
.cq-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--tone-c); flex-shrink: 0; margin-top: 6px; }

.exd-fld { display: flex; flex-direction: column; gap: 7px; }
.exd-fld label { font-size: 11px; font-weight: 750; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ex-text-muted); }
.exd-fld label i { color: var(--tone-c); font-style: normal; }
.exd-fld label .opt { font-size: 10px; font-weight: 600; text-transform: none; letter-spacing: 0; color: var(--ex-text-dim); margin-left: 5px; }
.reason-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.reason-chip { display: inline-flex; align-items: center; gap: 8px; padding: 9px 11px; border-radius: 11px; cursor: pointer; text-align: left;
  background: var(--ex-surface); border: 1px solid var(--ex-border); color: var(--ex-text-secondary); font-size: 12px; font-weight: 650; font-family: inherit; }
.rc-tick { display: grid; place-items: center; width: 17px; height: 17px; border-radius: 6px; flex-shrink: 0;
  border: 1px solid var(--ex-border-strong); color: transparent; transition: all 0.2s; }
.reason-chip.on { border-color: var(--tone-bd); background: var(--tone-soft); color: var(--ex-text); }
.reason-chip.on .rc-tick { background: var(--tone-c); border-color: var(--tone-c); color: #fff; }
.exd-fld textarea { width: 100%; padding: 10px 12px; border-radius: 10px; font-size: 13px; font-family: inherit; resize: vertical;
  background: rgba(0, 0, 0, 0.3); border: 1px solid var(--ex-border); color: var(--ex-text); transition: border-color 0.2s, box-shadow 0.2s; }
.exd-fld textarea:focus { outline: none; border-color: var(--tone-bd); box-shadow: 0 0 0 3px var(--tone-soft); }
[data-theme="light"] .exd-fld textarea { background: rgba(255, 250, 242, 0.72); }

/* acknowledgment gate */
.exd-ack { display: flex; align-items: center; gap: 10px; padding: 11px 12px; border-radius: 12px; cursor: pointer; text-align: left; font-family: inherit;
  background: var(--ex-surface); border: 1px solid var(--ex-border); transition: border-color 0.2s, background 0.2s; }
.exd-ack:hover { border-color: var(--ex-border-strong); }
.exd-ack.on { border-color: var(--tone-bd); background: var(--tone-soft); }
.ack-box { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 7px; flex-shrink: 0;
  border: 1.5px solid var(--ex-border-strong); color: transparent; transition: all 0.2s; }
.exd-ack.on .ack-box { background: var(--tone-c); border-color: var(--tone-c); color: #fff; }
.ack-txt { font-size: 12.5px; font-weight: 650; color: var(--ex-text-secondary); }
.exd-ack.on .ack-txt { color: var(--ex-text); }

.exd-foot { position: relative; display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px 18px; }
.exd-btn { position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: 6px; padding: 10px 17px; border-radius: 12px; font-size: 13px; font-weight: 800; cursor: pointer; font-family: inherit; }
.exd-btn.ghost { background: transparent; border: 1px solid var(--ex-border-strong); color: var(--ex-text-secondary); }
.exd-btn.danger { border: none; color: #fff; background: linear-gradient(135deg, var(--tone-c), color-mix(in srgb, var(--tone-c) 60%, #000));
  box-shadow: 0 8px 22px -10px var(--tone-c); }
.exd-btn.danger.off { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.exd-btn-sheen { position: absolute; top: 0; left: 0; width: 40%; height: 100%; pointer-events: none; opacity: 0;
  background: linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.45), transparent); }
.exd-btn.danger:not(.off):hover .exd-btn-sheen { opacity: 1; animation: ex-sheen-pass 0.9s ease-out; }
.spin { animation: ex-spin-slow 0.8s linear infinite; }

@keyframes exd-pulse { 0% { transform: scale(1); opacity: 0.7; } 100% { transform: scale(1.4); opacity: 0; } }
@keyframes exd-rewind { to { transform: rotate(-360deg); } }

@media (max-width: 480px) { .reason-grid, .exd-impact { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) {
  .exd-aura, .exd-pulse, .exd-rewind, .spin, .exd-btn-sheen { animation: none; }
}
</style>
