<template>
  <Motion as="article" class="hc-shell"
    :initial="reduced ? false : { opacity: 0, y: 16, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
    :transition="{ duration: 0.45, delay: Math.min(index * 0.05, 0.4), ease: [0.16, 1, 0.3, 1] }">
    <div class="hc" :class="{ open, pending: needsAck }" :data-status="al.status" ref="cardEl">
      <span class="hc-bezel" aria-hidden="true" />
      <span class="as-spotlight" aria-hidden="true" />
      <span v-if="needsAck && !reduced" class="hc-scan" aria-hidden="true" />

      <header class="hc-head" @click="open = !open">
        <AssetTypeBadge :type="al.asset_type" medallion />
        <div class="hc-id">
          <span class="hc-code as-mono">{{ al.asset_code || '—' }}</span>
          <span class="hc-since">{{ brandModel ? brandModel + ' · ' : '' }}issued {{ fmt(al.allocated_date) }}</span>
        </div>
        <AssetStatusStamp :value="al.status" kind="allocation" />
        <span class="hc-chev" :class="{ open }"><ChevronDown :size="15" /></span>
      </header>

      <div class="hc-meters">
        <span class="hc-ack" :data-ok="al.acknowledged_by_employee">
          <component :is="al.acknowledged_by_employee ? CheckCheck : Clock" :size="13" />
          {{ al.acknowledged_by_employee ? 'Acknowledged' : 'Awaiting sign-off' }}
        </span>
        <span v-if="dueChip" class="hc-due" :data-tone="dueChip.tone"><CalendarClock :size="12" />{{ dueChip.label }}</span>
        <AssetConditionMeter v-if="al.condition_on_issue" :value="al.condition_on_issue" class="hc-cond" />
      </div>

      <footer v-if="al.status === 'ALLOCATED'" class="hc-actions">
        <Motion v-if="needsAck" as="button" type="button" class="as-btn as-btn-primary mini" :disabled="busy"
          :whileHover="reduced ? {} : { y: -2 }" :whileTap="{ scale: 0.96 }" @click="$emit('ack', al)">
          <Loader v-if="busy" :size="13" class="spin" /><CheckCheck v-else :size="13" /> Acknowledge
        </Motion>
        <Motion as="button" type="button" class="as-btn as-btn-danger mini"
          :whileHover="reduced ? {} : { y: -2 }" :whileTap="{ scale: 0.96 }" @click="$emit('damage', al)"><ShieldAlert :size="13" /> Damage</Motion>
        <template v-if="al.return_requested">
          <span class="hc-reqstate" :title="al.return_request_note || 'Return requested — awaiting HR'">
            <Hourglass :size="12" /> Return requested<span v-if="reqDate" class="hc-reqdate"> · {{ reqDate }}</span>
          </span>
          <Motion as="button" type="button" class="as-btn as-btn-ghost mini" :disabled="busy"
            :whileHover="reduced ? {} : { y: -2 }" :whileTap="{ scale: 0.96 }" @click="$emit('cancel-return', al)">
            <Loader v-if="busy" :size="13" class="spin" /><X v-else :size="13" /> Cancel
          </Motion>
        </template>
        <Motion v-else as="button" type="button" class="as-btn as-btn-ghost mini" :disabled="busy"
          :whileHover="reduced ? {} : { y: -2 }" :whileTap="{ scale: 0.96 }" @click="$emit('return', al)"><Undo2 :size="13" /> Return</Motion>
      </footer>

      <Presence>
        <Motion v-if="open" as="div" class="hc-exp"
          :initial="{ opacity: 0, y: -8 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: -8 }" :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }">
          <div class="hc-facts">
            <div class="hc-fact"><span><CalendarClock :size="11" /> Issued</span><b class="as-mono">{{ fmt(al.allocated_date) }}</b></div>
            <div v-if="al.expected_return_date" class="hc-fact"><span><Undo2 :size="11" /> Return by</span><b class="as-mono">{{ fmt(al.expected_return_date) }}</b></div>
            <div v-if="al.returned_date" class="hc-fact"><span><PackageCheck :size="11" /> Returned</span><b class="as-mono">{{ fmt(al.returned_date) }}</b></div>
            <div v-if="al.acknowledged_at" class="hc-fact"><span><CheckCheck :size="11" /> Signed</span><b class="as-mono">{{ fmt(al.acknowledged_at) }}</b></div>
            <div v-if="al.condition_on_issue" class="hc-fact"><span><Gauge :size="11" /> Condition</span><b>{{ condLabel(al.condition_on_issue) }}</b></div>
            <div v-if="al.serial_number" class="hc-fact"><span><ScanLine :size="11" /> Serial</span><b class="as-mono">{{ al.serial_number }}</b></div>
            <div v-if="al.warranty_end" class="hc-fact"><span><ShieldCheck :size="11" /> Warranty</span><b :data-warranty="warranty?.tone">{{ warranty?.label }}</b></div>
          </div>
          <p v-if="al.notes" class="hc-notes"><FileText :size="12" /> {{ al.notes }}</p>

          <div v-if="events.length" class="hc-events">
            <span class="hc-events-h">Recent activity</span>
            <div v-for="ev in events.slice(0, 4)" :key="ev.id" class="hc-event" :style="{ '--c': eventMeta(ev.event_type).color }">
              <span class="hc-event-dot"><component :is="eventMeta(ev.event_type).icon" :size="10" /></span>
              <span class="hc-event-lab">{{ eventMeta(ev.event_type).label }}</span>
              <span class="hc-event-time as-mono">{{ relTime(ev.created_at) }}</span>
            </div>
          </div>
        </Motion>
      </Presence>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { CheckCheck, Clock, ShieldAlert, Undo2, Loader, ChevronDown, CalendarClock, PackageCheck, Gauge, FileText, ScanLine, ShieldCheck, Hourglass, X } from 'lucide-vue-next'
import AssetTypeBadge from './AssetTypeBadge.vue'
import AssetStatusStamp from './AssetStatusStamp.vue'
import AssetConditionMeter from './AssetConditionMeter.vue'
import { conditionMeta } from '@/composables/useAssets'
import { eventMeta, relTime } from './histEventMeta.js'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  al: { type: Object, required: true },
  index: { type: Number, default: 0 },
  busy: { type: Boolean, default: false },
  events: { type: Array, default: () => [] },
})
defineEmits(['ack', 'damage', 'return', 'cancel-return'])

const cardEl = ref(null)
const open = ref(false)
const reduced = prefersReduced()
usePointerSpotlight(cardEl)

const needsAck = computed(() => props.al.status === 'ALLOCATED' && !props.al.acknowledged_by_employee)
const condLabel = (c) => conditionMeta(c).label
const brandModel = computed(() => [props.al.brand, props.al.model].filter(Boolean).join(' '))
const warranty = computed(() => {
  if (!props.al.warranty_end) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const w = new Date(props.al.warranty_end); w.setHours(0, 0, 0, 0)
  const label = fmt(props.al.warranty_end)
  return w >= today ? { label: `until ${label}`, tone: 'ok' } : { label: `expired ${label}`, tone: 'bad' }
})
const fmt = (d) => d ? new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: '2-digit' }) : '—'

const dueChip = computed(() => {
  if (props.al.status !== 'ALLOCATED' || !props.al.expected_return_date) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(props.al.expected_return_date); d.setHours(0, 0, 0, 0)
  const days = Math.round((d - today) / 86400000)
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, tone: 'danger' }
  if (days === 0) return { label: 'due today', tone: 'warn' }
  if (days <= 7) return { label: `due in ${days}d`, tone: 'warn' }
  return { label: `due in ${days}d`, tone: 'calm' }
})

const reqDate = computed(() => props.al.return_requested_at
  ? new Date(props.al.return_requested_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) : '')
</script>

<style scoped>
.hc-shell { list-style: none; }
.hc { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 12px; padding: 16px; border-radius: 18px;
  background: var(--as-surf-card); border: 1px solid var(--as-border-soft); box-shadow: var(--as-card-shadow);
  transition: transform 0.3s var(--as-spring), border-color 0.3s, box-shadow 0.3s; }
.hc:hover { transform: perspective(1100px) rotateX(calc((var(--my, 0.5) - 0.5) * -5deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 7deg)) translateY(-3px);
  border-color: var(--as-border-strong); box-shadow: var(--as-card-shadow-hover); }
.hc.pending { border-color: color-mix(in srgb, var(--as-st-allocated) 34%, transparent); }
.hc-bezel { position: absolute; left: 0; right: 0; top: 0; height: 3px; background: var(--as-bezel-ring); opacity: 0.5; }

/* hover-gated rotating border-beam (no idle cost) */
@property --hc-beam-a { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
.hc::after { content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1.5px; pointer-events: none; z-index: 0; opacity: 0; transition: opacity 0.35s ease;
  background: conic-gradient(from var(--hc-beam-a), transparent 0deg, color-mix(in srgb, var(--as-amber) 88%, transparent) 38deg, color-mix(in srgb, var(--as-amber-bright) 90%, transparent) 54deg, transparent 104deg, transparent 360deg);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask-composite: exclude; }
.hc:hover::after { opacity: 1; animation: hc-beam-spin 4s linear infinite; }
@keyframes hc-beam-spin { to { --hc-beam-a: 360deg; } }
.hc-scan { position: absolute; left: 0; right: 0; top: 0; height: 60px; pointer-events: none; z-index: 0;
  background: linear-gradient(180deg, color-mix(in srgb, var(--as-st-allocated) 14%, transparent), transparent); animation: hc-scan 3.4s ease-in-out infinite; }

.hc-head { display: flex; align-items: center; gap: 11px; cursor: pointer; }
.hc-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.hc-code { font-size: 13.5px; font-weight: 800; color: var(--as-text); }
.hc-since { font-size: 11.5px; color: var(--as-text-muted); }
.hc-chev { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; color: var(--as-text-dim); background: var(--as-surface);
  border: 1px solid var(--as-border-soft); transition: transform 0.3s var(--as-spring), color 0.2s; flex-shrink: 0; }
.hc-chev.open { transform: rotate(180deg); color: var(--as-amber); }

.hc-meters { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.hc-ack { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 700; color: var(--as-st-reserved); }
.hc-ack[data-ok="true"] { color: var(--as-st-available); }
.hc-due { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 999px;
  color: var(--as-text-muted); background: var(--as-surface); border: 1px solid var(--as-border-soft); }
.hc-due[data-tone="warn"] { color: var(--as-st-reserved); background: var(--as-st-reserved-soft); border-color: color-mix(in srgb, var(--as-st-reserved) 30%, transparent); }
.hc-due[data-tone="danger"] { color: var(--as-al-lost); background: var(--as-al-lost-soft); border-color: color-mix(in srgb, var(--as-al-lost) 30%, transparent); }
.hc-cond { margin-left: auto; }

.hc-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; padding-top: 11px; border-top: 1px solid var(--as-border-soft); }
.as-btn.mini { padding: 7px 11px; font-size: 12px; }
.hc-reqstate { display: inline-flex; align-items: center; gap: 5px; margin-right: auto; font-size: 11.5px; font-weight: 700; color: var(--as-st-reserved);
  padding: 6px 11px; border-radius: 999px; background: var(--as-st-reserved-soft); border: 1px solid color-mix(in srgb, var(--as-st-reserved) 30%, transparent); }
.hc-reqdate { font-weight: 600; color: var(--as-text-muted); }
.spin { animation: as-spin 0.9s linear infinite; }

/* expanded */
.hc-exp { display: flex; flex-direction: column; gap: 11px; padding-top: 11px; border-top: 1px dashed var(--as-border-strong); }
.hc-facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 9px; }
.hc-fact { display: flex; flex-direction: column; gap: 2px; }
.hc-fact span { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-dim); }
.hc-fact span :deep(svg) { color: var(--as-steel-dim); }
.hc-fact b { font-size: 12.5px; color: var(--as-text); font-weight: 700; }
.hc-fact b[data-warranty="ok"] { color: var(--as-st-available); }
.hc-fact b[data-warranty="bad"] { color: var(--as-al-lost); }
.hc-notes { display: flex; align-items: flex-start; gap: 7px; margin: 0; padding: 9px 11px; border-radius: 10px; font-size: 12px; line-height: 1.5; color: var(--as-text-secondary);
  background: var(--as-surface); border: 1px solid var(--as-border-soft); }
.hc-notes :deep(svg) { color: var(--as-amber); flex-shrink: 0; margin-top: 2px; }

.hc-events { display: flex; flex-direction: column; gap: 6px; }
.hc-events-h { font-size: 9.5px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: var(--as-text-dim); }
.hc-event { display: flex; align-items: center; gap: 9px; }
.hc-event-dot { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 6px; flex-shrink: 0; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); }
.hc-event-lab { flex: 1; min-width: 0; font-size: 12px; color: var(--as-text-secondary); }
.hc-event-time { font-size: 10px; color: var(--as-text-dim); }

@keyframes hc-scan { 0%, 100% { opacity: 0; transform: translateY(-6px); } 50% { opacity: 1; transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) { .hc:hover { transform: translateY(-3px); } .hc-scan { animation: none; } .hc:hover::after { animation: none; } }
</style>
