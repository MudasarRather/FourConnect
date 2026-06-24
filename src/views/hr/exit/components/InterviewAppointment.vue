<template>
  <!-- Signature "Appointment Beacon" — the cinematic readout of a scheduled exit
       interview. A countdown date-medallion (conic urgency ring + sonar ping when
       imminent) beside the session facts, over a temporal runway from Scheduled → Today
       → Conducted. Distinct from the completed-state voiceprint and the pending waveform. -->
  <div class="ia" :class="[`u-${urgency.key}`, { form: isForm }]" :style="{ '--c': urgency.hex, '--p': ringDeg }">
    <span class="ia-grain" aria-hidden="true" />

    <div class="ia-top">
      <!-- date medallion -->
      <div class="ia-med">
        <span v-if="ping" class="ia-ping" aria-hidden="true"><i /><i /></span>
        <span class="ia-ring" aria-hidden="true" />
        <div class="ia-medface">
          <template v-if="day">
            <span class="med-d">{{ day }}</span>
            <span class="med-m">{{ mon }}</span>
          </template>
          <template v-else>
            <Infinity :size="20" class="med-inf" />
            <span class="med-m">open</span>
          </template>
        </div>
      </div>

      <!-- facts -->
      <div class="ia-facts">
        <span class="ia-mode"><component :is="modeMeta.icon" :size="12" /> {{ modeMeta.label }}</span>
        <span class="ia-line head"><component :is="isForm ? ClipboardList : Clock" :size="13" /> {{ headLine }}</span>
        <span v-if="iv.conducted_by_name && !isForm" class="ia-line"><UserRound :size="13" /> with {{ iv.conducted_by_name }}</span>
        <span v-if="iv.details" class="ia-line det"><component :is="modeMeta.detIcon" :size="13" /> <span class="det-t">{{ iv.details }}</span></span>
      </div>

      <!-- countdown headline -->
      <div class="ia-count">
        <span class="cnt-v">{{ countMain }}</span>
        <span class="cnt-k">{{ countSub }}</span>
      </div>
    </div>

    <!-- temporal runway -->
    <div class="ia-track">
      <span class="trk-rail" aria-hidden="true" />
      <span class="trk-fill" :style="{ width: trackPct + '%' }" aria-hidden="true" />
      <span class="trk-node n0" :class="{ done: trackPct > 1 }"><Send :size="9" /></span>
      <span class="trk-now" :style="{ left: `clamp(7%, ${trackPct}%, 93%)` }">
        <i class="now-dot" /><b>{{ markerLabel }}</b>
      </span>
      <span class="trk-node n1" :class="{ done: overdue }"><CircleCheckBig :size="9" /></span>
    </div>
    <div class="ia-trklabels"><span>Scheduled</span><span>{{ isForm ? 'Submitted' : 'Conducted' }}</span></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  Clock, UserRound, Users, Video, Captions, MapPin, Link2, MessageSquare,
  ClipboardList, Send, CircleCheckBig, Infinity,
} from 'lucide-vue-next'
import { fmtDate } from '@/composables/useExit'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({ iv: { type: Object, required: true } })
const reduced = prefersReduced()

const MODE = {
  IN_PERSON: { label: 'In-person session', icon: Users, detIcon: MapPin },
  VIDEO: { label: 'Video call', icon: Video, detIcon: Link2 },
  FORM: { label: 'Self-service survey', icon: Captions, detIcon: MessageSquare },
}
const modeMeta = computed(() => MODE[props.iv.mode] || MODE.FORM)
const isForm = computed(() => (props.iv.mode || 'FORM') === 'FORM')

// ── parse the scheduled date (date-only, local) ──
const schedDate = computed(() => {
  const at = props.iv.scheduled_at
  if (!at) return null
  const d = new Date(String(at).slice(0, 10) + 'T00:00:00')
  return isNaN(d) ? null : d
})
const timeStr = computed(() => {
  const at = props.iv.scheduled_at
  if (!at) return ''
  const t = String(at).slice(11, 16)
  return t && t !== '23:59' ? t : ''
})
const day = computed(() => schedDate.value ? String(schedDate.value.getDate()).padStart(2, '0') : '')
const mon = computed(() => schedDate.value ? schedDate.value.toLocaleString('en', { month: 'short' }).toUpperCase() : '')

// days from today → scheduled (positive = future)
const days = computed(() => {
  if (!schedDate.value) return null
  const now = new Date(); now.setHours(0, 0, 0, 0)
  return Math.round((schedDate.value - now) / 86400000)
})
const overdue = computed(() => days.value != null && days.value < 0)

const urgency = computed(() => {
  const d = days.value
  if (d == null) return { key: 'open', hex: '#34d399' }       // survey, no deadline → calm emerald
  if (d < 0) return { key: 'over', hex: '#ef4444' }            // past due
  if (d === 0) return { key: 'today', hex: '#fb923c' }         // today → ember
  if (d <= 2) return { key: 'soon', hex: '#fbbf24' }           // imminent → amber
  return { key: 'upcoming', hex: '#a78bfa' }                   // comfortably ahead → violet accent
})

// conic urgency ring — fuller as the date nears (14-day runway), full when overdue/open
const ringDeg = computed(() => {
  const d = days.value
  if (d == null) return '300deg'
  if (d < 0) return '360deg'
  const p = Math.max(0, Math.min(1, 1 - d / 14))
  return (p * 360).toFixed(0) + 'deg'
})

// sonar ping only when it actually matters (today / imminent) and motion is allowed
const ping = computed(() => !reduced && days.value != null && days.value >= 0 && days.value <= 2)

// headline line under the mode chip
const headLine = computed(() => {
  if (isForm.value) return schedDate.value ? `Complete by ${fmtDate(props.iv.scheduled_at)}` : 'Open — complete any time'
  if (!schedDate.value) return 'Date to be confirmed'
  return `${fmtDate(props.iv.scheduled_at)}${timeStr.value ? ' · ' + timeStr.value : ''}`
})

// big countdown
const countMain = computed(() => {
  const d = days.value
  if (d == null) return '∞'
  if (d === 0) return 'Today'
  return String(Math.abs(d))
})
const countSub = computed(() => {
  const d = days.value
  if (d == null) return 'no deadline'
  if (d === 0) return isForm.value ? 'due today' : 'on the day'
  if (d === 1) return 'day to go'
  if (d === -1) return 'day overdue'
  if (d > 0) return 'days to go'
  return 'days overdue'
})
const markerLabel = computed(() => {
  const d = days.value
  if (d == null) return 'Now'
  if (d === 0) return 'Today'
  if (d === 1) return 'Tomorrow'
  if (d === -1) return 'Yesterday'
  return d > 0 ? `In ${d}d` : `${Math.abs(d)}d ago`
})

// runway marker position (0% scheduled-window start … 100% the date)
const trackPct = computed(() => {
  const d = days.value
  if (d == null) return 60
  if (d <= 0) return 100
  return Math.max(6, Math.min(94, 100 - (Math.min(d, 14) / 14) * 100))
})
</script>

<style scoped>
@property --p { syntax: '<angle>'; inherits: false; initial-value: 0deg; }

.ia { position: relative; overflow: hidden; padding: 12px 13px 10px; border-radius: 14px; margin-bottom: 11px;
  background: var(--ex-panel); border: 1px solid color-mix(in srgb, var(--c) 26%, var(--ex-border));
  animation: ia-in 0.5s var(--ex-spring) backwards; }
.ia-grain { position: absolute; inset: -50% 30% 40% -10%; pointer-events: none; opacity: 0.7;
  background: radial-gradient(58% 80% at 18% 0%, color-mix(in srgb, var(--c) 18%, transparent), transparent 70%); }

.ia-top { position: relative; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 13px; }

/* date medallion */
.ia-med { position: relative; width: 54px; height: 54px; flex-shrink: 0; display: grid; place-items: center; }
.ia-ring { position: absolute; inset: 0; border-radius: 15px;
  background: conic-gradient(var(--c) var(--p, 0deg), var(--ex-steel-soft) 0); transition: --p 1s var(--ex-spring); }
.ia-ring::after { content: ''; position: absolute; inset: 3px; border-radius: 12px; background: var(--ex-surface); }
.ia-medface { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; line-height: 1; }
.med-d { font-family: var(--ex-mono); font-size: 19px; font-weight: 850; color: var(--ex-text); }
.med-m { font-size: 8.5px; font-weight: 800; letter-spacing: 0.12em; color: var(--c); margin-top: 2px; }
.med-inf { color: var(--c); }
.ia-ping { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
.ia-ping i { position: absolute; inset: 0; border-radius: 15px; border: 1.5px solid var(--c); opacity: 0; animation: ia-ping 2.4s ease-out infinite; }
.ia-ping i:nth-child(2) { animation-delay: 1.2s; }

/* facts */
.ia-facts { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.ia-mode { display: inline-flex; align-items: center; gap: 5px; align-self: flex-start; font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.05em; text-transform: uppercase; color: var(--c); padding: 2px 8px; border-radius: 999px;
  background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); margin-bottom: 1px; }
.ia-line { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--ex-text-secondary); min-width: 0; }
.ia-line svg { color: var(--c); flex-shrink: 0; }
.ia-line.head { font-size: 12.5px; font-weight: 750; color: var(--ex-text); }
.ia-line.det { color: var(--ex-text-muted); }
.det-t { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* countdown */
.ia-count { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; line-height: 1; }
.cnt-v { font-family: var(--ex-mono); font-size: 22px; font-weight: 900; color: var(--c); text-shadow: 0 0 16px color-mix(in srgb, var(--c) 40%, transparent); }
.cnt-k { font-size: 8.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ex-text-muted); margin-top: 3px; }

/* temporal runway */
.ia-track { position: relative; height: 22px; margin-top: 11px; }
.trk-rail { position: absolute; left: 7px; right: 7px; top: 50%; height: 2px; transform: translateY(-50%); border-radius: 2px; background: var(--ex-steel-soft); }
.trk-fill { position: absolute; left: 7px; top: 50%; height: 2px; transform: translateY(-50%); border-radius: 2px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--c) 50%, transparent), var(--c)); box-shadow: 0 0 8px var(--c); transition: width 0.9s var(--ex-spring); }
.trk-node { position: absolute; top: 50%; transform: translateY(-50%); display: grid; place-items: center; width: 16px; height: 16px; border-radius: 50%;
  color: var(--ex-text-muted); background: var(--ex-surface); border: 1px solid var(--ex-border-strong); z-index: 2; }
.trk-node.n0 { left: 0; } .trk-node.n1 { right: 0; }
.trk-node.done { color: var(--c); border-color: var(--c); }
.trk-now { position: absolute; top: 50%; transform: translate(-50%, -50%); z-index: 3; display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 7px 2px 5px; border-radius: 999px; background: var(--ex-surface-elevated); border: 1px solid var(--c); box-shadow: 0 2px 10px -3px var(--c);
  transition: left 0.9s var(--ex-spring); }
.trk-now b { font-size: 9px; font-weight: 800; color: var(--ex-text); white-space: nowrap; }
.now-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--c); box-shadow: 0 0 6px var(--c); animation: ia-blink 1.8s ease-in-out infinite; }
.ia-trklabels { display: flex; justify-content: space-between; margin-top: 1px; font-size: 8px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ex-text-dim); }

@keyframes ia-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes ia-ping { 0% { opacity: 0.6; transform: scale(0.85); } 100% { opacity: 0; transform: scale(1.5); } }
@keyframes ia-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

@media (prefers-reduced-motion: reduce) {
  .ia, .ia-ping i, .now-dot { animation: none; }
  .ia-ring, .trk-fill, .trk-now { transition: none; }
}
</style>
