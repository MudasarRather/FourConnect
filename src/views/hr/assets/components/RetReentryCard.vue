<template>
  <article class="rrc" ref="root" :data-tone="tone" :class="{ reduced }" :style="{ '--i': index, '--accent': `var(${typeVar})` }">
    <!-- corridor node (docks to the spine) -->
    <span class="rrc-node" aria-hidden="true"><span class="rrc-node-core" /></span>

    <div class="rrc-inner">
      <span class="rrc-rail" aria-hidden="true" />
      <span class="rrc-scan" aria-hidden="true" />
      <span class="as-spotlight" aria-hidden="true" />

      <span class="rrc-med">
        <span class="rrc-med-ring" aria-hidden="true" />
        <component :is="typeIcon" :size="18" />
      </span>

      <div class="rrc-main">
        <div class="rrc-top">
          <span class="rrc-code as-mono">{{ alloc.asset_code }}</span>
          <span class="rrc-type">{{ typeLabel }}</span>
          <span v-if="alloc.return_requested" class="rrc-req"
            :title="alloc.return_request_note || 'Employee requested return'">
            <Hand :size="9" /> Requested
          </span>
          <span class="rrc-ack" :data-acked="alloc.acknowledged_by_employee ? '1' : '0'"
            :title="alloc.acknowledged_by_employee ? 'Acknowledged by employee' : 'Not yet acknowledged'">
            <component :is="alloc.acknowledged_by_employee ? CheckCheck : Clock" :size="10" />
          </span>
        </div>
        <span class="rrc-holder"><span class="rrc-av">{{ initials(alloc.employee_name) }}</span>{{ alloc.employee_name || 'Unassigned' }}</span>

        <!-- descent track: marker docks in from the right toward its due position -->
        <div class="rrc-track" :title="dueTitle">
          <span class="rrc-track-line" aria-hidden="true" />
          <span class="rrc-track-gate" aria-hidden="true" />
          <span v-if="hasDue" class="rrc-track-mark" :style="{ left: `${localX * 100}%`, animationDelay: `${0.25 + index * 0.04}s` }" aria-hidden="true" />
          <span class="rrc-track-since"><CalendarDays :size="10" /> {{ sinceLabel }}</span>
        </div>
      </div>

      <!-- countdown -->
      <div class="rrc-count">
        <span class="rrc-count-num as-mono">{{ countNum }}</span>
        <span class="rrc-count-lab">{{ countLab }}</span>
      </div>

      <div class="rrc-actions">
        <button class="rrc-act" @click.stop="$emit('history', alloc.asset_id)" title="Movement log"><Eye :size="13" /></button>
        <Motion as="button" type="button" class="as-btn as-btn-primary rrc-return"
          :whileHover="{ y: -2, scale: 1.03 }" :whileTap="{ scale: 0.96 }" @click.stop="$emit('return', alloc)">
          <Undo2 :size="13" /> Return
        </Motion>
      </div>
    </div>
  </article>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  Undo2, Eye, CheckCheck, Clock, CalendarDays, Hand,
  Laptop, HardDrive, Monitor, Smartphone, CreditCard, Headphones,
  Keyboard, Mouse, Car, KeyRound, Package,
} from 'lucide-vue-next'
import { Motion } from 'motion-v'
import { typeMeta } from '@/composables/useAssets'
import { usePointerSpotlight, prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  alloc: { type: Object, required: true },
  index: { type: Number, default: 0 },
})
defineEmits(['return', 'history'])

const root = ref(null)
usePointerSpotlight(root)
const reduced = prefersReduced()

const TYPE_ICONS = {
  LAPTOP: Laptop, DESKTOP: HardDrive, MONITOR: Monitor, MOBILE: Smartphone,
  SIM: CreditCard, RFID_CARD: CreditCard, ID_CARD: CreditCard, HEADSET: Headphones,
  KEYBOARD: Keyboard, MOUSE: Mouse, VEHICLE: Car, KEYS: KeyRound, OTHER: Package,
}
const typeIcon = computed(() => TYPE_ICONS[props.alloc.asset_type] || Package)
const typeLabel = computed(() => typeMeta(props.alloc.asset_type).label)
const typeVar = computed(() => typeMeta(props.alloc.asset_type).cssVar)

const today = new Date().toISOString().slice(0, 10)
const hasDue = computed(() => !!props.alloc.expected_return_date)
const daysToDue = computed(() => {
  if (!hasDue.value) return null
  return Math.round((new Date(props.alloc.expected_return_date) - new Date(today)) / 86400000)
})
const tone = computed(() => {
  if (!hasDue.value) return 'open'
  if (daysToDue.value < 0) return 'over'
  if (daysToDue.value <= 3) return 'soon'
  return 'ok'
})

// local descent track — same window mapping as the global horizon
const HWIN_MIN = -14, HWIN_MAX = 30
const localX = computed(() => {
  const d = Math.max(HWIN_MIN, Math.min(HWIN_MAX, daysToDue.value ?? HWIN_MAX))
  return (d - HWIN_MIN) / (HWIN_MAX - HWIN_MIN)
})

const countNum = computed(() => {
  if (!hasDue.value) return '∞'
  const d = daysToDue.value
  if (d === 0) return '0d'
  return `${Math.abs(d)}d`
})
const countLab = computed(() => {
  if (!hasDue.value) return 'open-ended'
  const d = daysToDue.value
  if (d < 0) return 'overdue'
  if (d === 0) return 'due today'
  return 'to return'
})

const fmt = (d) => d ? new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) : '—'
const sinceLabel = computed(() => `out since ${fmt(props.alloc.allocated_date)}`)
const dueTitle = computed(() => hasDue.value ? `Due ${fmt(props.alloc.expected_return_date)}` : 'No expected return date')
const initials = (n) => (n || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
</script>

<style scoped>
.rrc { position: relative; padding-left: 22px; border-radius: 16px;
  animation: rrc-incoming 0.55s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: calc(var(--i) * 0.05s); }

/* corridor node sitting on the spine */
.rrc-node { position: absolute; left: 0; top: 50%; width: 14px; height: 14px; margin-top: -7px; border-radius: 50%; display: grid; place-items: center;
  background: var(--as-surface-elevated); border: 1px solid var(--nc, var(--as-st-allocated)); z-index: 2; }
.rrc-node-core { width: 6px; height: 6px; border-radius: 50%; background: var(--nc, var(--as-st-allocated)); box-shadow: 0 0 8px var(--nc, var(--as-st-allocated)); }
.rrc[data-tone="over"] { --nc: var(--as-al-lost); }
.rrc[data-tone="soon"] { --nc: var(--as-st-reserved); }
.rrc[data-tone="ok"]   { --nc: var(--as-st-available); }
.rrc[data-tone="open"] { --nc: var(--as-steel-dim); }
.rrc[data-tone="over"] .rrc-node { animation: rrc-node-pulse 1.8s ease-in-out infinite; }

.rrc-inner { position: relative; overflow: hidden; display: flex; align-items: center; gap: 13px; padding: 12px 14px; border-radius: 16px;
  background: var(--as-surf-card); border: 1px solid var(--as-border-soft); box-shadow: var(--as-card-shadow);
  transform: translateY(var(--lift, 0px)); transition: transform 0.3s var(--as-spring), box-shadow 0.3s var(--as-spring), border-color 0.3s; }
.rrc:hover .rrc-inner { --lift: -3px; box-shadow: var(--as-card-shadow-hover); border-color: var(--as-border-strong); }
.rrc[data-tone="over"] .rrc-inner { border-color: color-mix(in srgb, var(--as-al-lost) 30%, transparent); }

.rrc-rail { position: absolute; left: 0; top: 10px; bottom: 10px; width: 3px; border-radius: 3px; background: var(--nc, var(--as-st-allocated)); box-shadow: 0 0 9px 0 var(--nc, var(--as-st-allocated)); opacity: 0.85; }
.rrc:hover .rrc-rail { animation: as-bay-pulse 2.2s ease-in-out infinite; }
.rrc-scan { position: absolute; left: 7%; right: 7%; top: 0; height: 2px; z-index: 2; pointer-events: none; border-radius: 2px;
  background: linear-gradient(90deg, transparent, var(--accent, var(--as-amber)), transparent); box-shadow: 0 0 12px 1px var(--accent, var(--as-amber)); opacity: 0;
  animation: as-scanline 1s ease both; animation-delay: calc(var(--i) * 0.05s + 0.2s); }

.rrc-med { position: relative; display: inline-grid; place-items: center; width: 40px; height: 40px; flex-shrink: 0; border-radius: 12px; color: var(--accent);
  background: color-mix(in srgb, var(--accent) 15%, transparent); border: 1px solid color-mix(in srgb, var(--accent) 32%, transparent); }
.rrc-med-ring { position: absolute; inset: -4px; border-radius: 15px; pointer-events: none; opacity: 0; transition: opacity 0.4s ease;
  background: conic-gradient(from 0deg, transparent, color-mix(in srgb, var(--accent) 55%, transparent), transparent 55%);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px)); mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px)); }
.rrc:hover .rrc-med-ring { opacity: 0.85; animation: as-holo-spin 3.4s linear infinite; }

.rrc-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.rrc-top { display: flex; align-items: center; gap: 8px; }
.rrc-code { font-size: 13px; font-weight: 800; color: var(--as-text); letter-spacing: 0.02em; }
.rrc-type { font-size: 10px; font-weight: 600; color: var(--accent); }
.rrc-req { display: inline-flex; align-items: center; gap: 3px; font-size: 9px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase;
  padding: 2px 7px; border-radius: 999px; color: var(--as-amber); background: color-mix(in srgb, var(--as-amber) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--as-amber) 34%, transparent); animation: rrc-req-glow 2.4s ease-in-out infinite; }
.rrc-ack { display: inline-grid; place-items: center; width: 18px; height: 18px; border-radius: 6px; }
.rrc-ack[data-acked="1"] { color: var(--as-st-available); background: var(--as-st-available-soft); }
.rrc-ack[data-acked="0"] { color: var(--as-st-reserved); background: var(--as-st-reserved-soft); }
.rrc-holder { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--as-text-secondary); min-width: 0; }
.rrc-av { display: inline-grid; place-items: center; width: 19px; height: 19px; border-radius: 6px; font-size: 9px; font-weight: 700; flex-shrink: 0;
  color: var(--as-amber); background: color-mix(in srgb, var(--as-amber) 14%, transparent); }

/* descent track */
.rrc-track { position: relative; height: 16px; margin-top: 3px; }
.rrc-track-line { position: absolute; left: 0; right: 0; top: 7px; height: 2px; border-radius: 2px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--as-al-lost) 30%, transparent), var(--as-border-soft) 35%, color-mix(in srgb, var(--as-st-available) 28%, transparent)); }
.rrc-track-gate { position: absolute; left: 31.8%; top: 2px; width: 1.5px; height: 12px; transform: translateX(-0.75px); background: color-mix(in srgb, var(--as-amber) 70%, transparent); }
.rrc-track-mark { position: absolute; top: 8px; width: 9px; height: 9px; margin: -4.5px 0 0 -4.5px; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff, var(--nc) 65%, transparent); box-shadow: 0 0 8px 1px color-mix(in srgb, var(--nc) 70%, transparent);
  animation: rrc-dock 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }
.rrc-track-since { position: absolute; right: 0; top: -1px; display: inline-flex; align-items: center; gap: 3px; font-size: 9.5px; color: var(--as-text-dim);
  background: var(--as-surf-card); padding-left: 4px; }
.rrc-track-since :deep(svg) { color: var(--as-steel-dim); }

/* countdown */
.rrc-count { display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 56px; padding: 0 4px; flex-shrink: 0; }
.rrc-count-num { font-size: 19px; font-weight: 850; line-height: 1; color: var(--nc, var(--as-text)); }
.rrc[data-tone="ok"] .rrc-count-num, .rrc[data-tone="open"] .rrc-count-num { color: var(--as-text); }
.rrc-count-lab { font-size: 9px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--as-text-dim); margin-top: 3px; }
.rrc[data-tone="over"] .rrc-count-lab { color: var(--as-al-lost); }

.rrc-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.rrc-act { display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; cursor: pointer; color: var(--as-text-muted);
  background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: color 0.2s, background 0.2s, transform 0.2s, opacity 0.3s; }
.rrc-act:hover { color: var(--as-text); background: var(--as-surface-elevated); transform: translateY(-2px); }
.rrc-return { padding: 8px 14px; font-size: 12.5px; }

@keyframes rrc-incoming { 0% { opacity: 0; transform: translateX(40px); filter: blur(4px); } 60% { filter: blur(0); } 100% { opacity: 1; transform: translateX(0); filter: blur(0); } }
@keyframes rrc-node-pulse { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--as-al-lost) 55%, transparent); } 50% { box-shadow: 0 0 0 5px color-mix(in srgb, var(--as-al-lost) 0%, transparent); } }
@keyframes rrc-dock { 0% { opacity: 0; transform: translateX(34px) scale(0.4); } 100% { opacity: 1; transform: translateX(0) scale(1); } }
@keyframes rrc-req-glow { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--as-amber) 40%, transparent); } 50% { box-shadow: 0 0 0 4px color-mix(in srgb, var(--as-amber) 0%, transparent); } }

@media (hover: hover) and (pointer: fine) {
  .rrc-act { opacity: 0; transform: translateX(6px); }
  .rrc:hover .rrc-act, .rrc:focus-within .rrc-act { opacity: 1; transform: translateX(0); }
}
@media (prefers-reduced-motion: reduce) {
  .rrc, .rrc-track-mark, .rrc-req { animation: none; }
  .rrc-scan, .rrc-med-ring { display: none; }
  .rrc[data-tone="over"] .rrc-node, .rrc:hover .rrc-rail { animation: none; }
  .rrc-act { opacity: 1 !important; transform: none !important; }
}
</style>
