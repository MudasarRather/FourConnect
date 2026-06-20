<template>
  <article class="afc" ref="root" :data-state="state" :class="{ reduced, fresh }"
    :style="{ '--i': index, '--accent': `var(${typeVar})` }">
    <span class="afc-land" aria-hidden="true" />
    <div class="afc-inner">
      <span class="afc-rail" aria-hidden="true" />
      <span class="as-spotlight" aria-hidden="true" />

      <!-- holder -->
      <span class="afc-av">
        {{ initials(alloc.employee_name) }}
        <span class="afc-av-ping" v-if="state === 'pending'" aria-hidden="true" />
      </span>

      <div class="afc-main">
        <div class="afc-top">
          <span class="afc-code as-mono">{{ alloc.asset_code }}</span>
          <span class="afc-type"><component :is="typeIcon" :size="11" />{{ typeLabel }}</span>
        </div>
        <span class="afc-emp">{{ alloc.employee_name || 'Unassigned' }}</span>
        <div class="afc-meta">
          <span class="afc-since"><CalendarDays :size="11" /> since {{ fmtShort(alloc.allocated_date) }}</span>
          <span class="afc-due" :data-tone="dueTone"><Hourglass :size="11" /> {{ dueLabel }}</span>
        </div>
      </div>

      <!-- acknowledgement ring -->
      <span class="afc-ack" :data-acked="alloc.acknowledged_by_employee ? '1' : '0'"
        :style="{ '--ack': alloc.acknowledged_by_employee ? 1 : 0 }"
        :title="alloc.acknowledged_by_employee ? 'Acknowledged by employee' : 'Awaiting acknowledgement'">
        <CheckCheck v-if="alloc.acknowledged_by_employee" :size="14" />
        <Clock v-else :size="13" />
      </span>

      <!-- actions -->
      <div class="afc-actions">
        <button v-if="!alloc.acknowledged_by_employee" class="afc-act ack" :disabled="busy" @click.stop="$emit('acknowledge', alloc)" title="Mark acknowledged">
          <Loader v-if="busy" :size="13" class="spin" /><BadgeCheck v-else :size="13" />
        </button>
        <button class="afc-act" @click.stop="$emit('history', alloc.asset_id)" title="Movement log"><Eye :size="13" /></button>
        <button class="afc-act return" @click.stop="$emit('return', alloc)" title="Process return"><Undo2 :size="13" /></button>
      </div>
    </div>
  </article>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  CheckCheck, Clock, CalendarDays, Hourglass, BadgeCheck, Eye, Undo2, Loader,
  Laptop, HardDrive, Monitor, Smartphone, CreditCard, Headphones,
  Keyboard, Mouse, Car, KeyRound, Package,
} from 'lucide-vue-next'
import { typeMeta } from '@/composables/useAssets'
import { usePointerSpotlight, prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  alloc: { type: Object, required: true },
  index: { type: Number, default: 0 },
  fresh: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
})
defineEmits(['acknowledge', 'return', 'history'])

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
const isOverdue = computed(() => props.alloc.expected_return_date && props.alloc.expected_return_date < today)
const state = computed(() => isOverdue.value ? 'overdue' : (props.alloc.acknowledged_by_employee ? 'live' : 'pending'))

const dueTone = computed(() => {
  if (!props.alloc.expected_return_date) return 'none'
  if (isOverdue.value) return 'over'
  const diff = Math.round((new Date(props.alloc.expected_return_date) - new Date(today)) / 86400000)
  return diff <= 3 ? 'soon' : 'ok'
})
const dueLabel = computed(() => {
  if (!props.alloc.expected_return_date) return 'open-ended'
  const diff = Math.round((new Date(props.alloc.expected_return_date) - new Date(today)) / 86400000)
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff === 0) return 'due today'
  return `due in ${diff}d`
})

const initials = (n) => (n || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
const fmtShort = (d) => d ? new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) : '—'
</script>

<style scoped>
.afc { position: relative; perspective: 900px; border-radius: 16px;
  animation: as-deal-row 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: calc(var(--i) * 0.04s); }
.afc.fresh .afc-land { animation: afc-land 1.4s ease both; }
.afc-land { position: absolute; inset: -2px; z-index: 3; pointer-events: none; opacity: 0; border-radius: 18px;
  box-shadow: 0 0 0 1.5px var(--as-st-allocated), 0 0 26px 2px color-mix(in srgb, var(--as-st-allocated) 50%, transparent); }

.afc-inner { position: relative; overflow: hidden; display: flex; align-items: center; gap: 13px; padding: 12px 14px; border-radius: 16px;
  background: var(--as-surf-card); border: 1px solid var(--as-border-soft); box-shadow: var(--as-card-shadow);
  transform: translateY(var(--lift, 0px)); transition: transform 0.3s var(--as-spring), box-shadow 0.3s var(--as-spring), border-color 0.3s; }
.afc:hover .afc-inner { --lift: -3px; box-shadow: var(--as-card-shadow-hover); border-color: var(--as-border-strong); }

/* left state rail */
.afc-rail { position: absolute; left: 0; top: 10px; bottom: 10px; width: 3px; border-radius: 3px; background: var(--rc, var(--as-st-allocated)); box-shadow: 0 0 9px 0 var(--rc, var(--as-st-allocated)); opacity: 0.85; }
.afc[data-state="live"]    { --rc: var(--as-st-available); }
.afc[data-state="pending"] { --rc: var(--as-st-reserved); }
.afc[data-state="overdue"] { --rc: var(--as-al-lost); }
.afc[data-state="overdue"] .afc-inner { border-color: color-mix(in srgb, var(--as-al-lost) 30%, transparent); }
.afc:hover .afc-rail { animation: as-bay-pulse 2.2s ease-in-out infinite; }

.afc-av { position: relative; display: grid; place-items: center; width: 40px; height: 40px; flex-shrink: 0; border-radius: 12px; font-size: 13px; font-weight: 700;
  color: var(--as-amber); background: color-mix(in srgb, var(--as-amber) 14%, transparent); border: 1px solid color-mix(in srgb, var(--as-amber) 26%, transparent); }
.afc-av-ping { position: absolute; top: -3px; right: -3px; width: 9px; height: 9px; border-radius: 50%; background: var(--as-st-reserved);
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--as-st-reserved) 60%, transparent); animation: afc-ping 1.9s ease-in-out infinite; border: 1.5px solid var(--as-surface-elevated); }

.afc-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.afc-top { display: flex; align-items: center; gap: 8px; }
.afc-code { font-size: 13px; font-weight: 800; color: var(--as-text); letter-spacing: 0.02em; }
.afc-type { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 600; color: var(--accent); }
.afc-emp { font-size: 12.5px; font-weight: 600; color: var(--as-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.afc-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 2px; }
.afc-since { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; color: var(--as-text-dim); }
.afc-since :deep(svg) { color: var(--as-steel-dim); }
.afc-due { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 700; font-family: var(--as-mono); }
.afc-due[data-tone="ok"]   { color: var(--as-text-muted); }
.afc-due[data-tone="soon"] { color: var(--as-st-reserved); }
.afc-due[data-tone="over"] { color: var(--as-al-lost); }
.afc-due[data-tone="none"] { color: var(--as-text-dim); }

/* acknowledgement ring */
.afc-ack { position: relative; display: grid; place-items: center; width: 38px; height: 38px; flex-shrink: 0; border-radius: 50%;
  background: conic-gradient(var(--ac, var(--as-st-reserved)) calc(var(--ack, 0) * 360deg), var(--as-border-soft) 0); transition: background 0.8s var(--as-spring); }
.afc-ack::after { content: ''; position: absolute; inset: 4px; border-radius: 50%; background: var(--as-surface-elevated); }
.afc-ack :deep(svg) { position: relative; z-index: 1; }
.afc-ack[data-acked="1"] { --ac: var(--as-st-available); color: var(--as-st-available); }
.afc-ack[data-acked="0"] { color: var(--as-st-reserved); }

.afc-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.afc-act { display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; cursor: pointer; color: var(--as-text-muted);
  background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: color 0.2s, background 0.2s, transform 0.2s, opacity 0.3s, border-color 0.2s; }
.afc-act:hover { color: var(--as-text); background: var(--as-surface-elevated); transform: translateY(-2px); }
.afc-act.ack { color: var(--as-st-available); border-color: color-mix(in srgb, var(--as-st-available) 30%, transparent); background: var(--as-st-available-soft); }
.afc-act.return:hover { color: var(--as-amber); border-color: color-mix(in srgb, var(--as-amber) 34%, transparent); }
.spin { animation: as-spin 0.9s linear infinite; }

@keyframes afc-ping { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--as-st-reserved) 55%, transparent); } 50% { box-shadow: 0 0 0 5px color-mix(in srgb, var(--as-st-reserved) 0%, transparent); } }
@keyframes afc-land { 0% { opacity: 1; } 70% { opacity: 0.8; } 100% { opacity: 0; } }

/* reveal actions on intent (precise pointers) */
@media (hover: hover) and (pointer: fine) {
  .afc-act:not(.ack) { opacity: 0; transform: translateX(6px); }
  .afc:hover .afc-act, .afc:focus-within .afc-act { opacity: 1; transform: translateX(0); }
  .afc:hover .afc-act:nth-last-child(1) { transition-delay: 0.04s; }
  .afc:hover .afc-act:nth-last-child(2) { transition-delay: 0.02s; }
}
@media (prefers-reduced-motion: reduce) {
  .afc { animation: none; }
  .afc-av-ping, .afc:hover .afc-rail { animation: none; }
  .afc.fresh .afc-land { animation: none; }
  .afc-act { opacity: 1 !important; transform: none !important; }
}
</style>
