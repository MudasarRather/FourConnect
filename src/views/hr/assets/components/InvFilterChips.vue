<template>
  <div class="fc">
    <!-- status rail -->
    <div class="fc-rail">
      <button class="fc-pill" :class="{ on: !statusFilter }" :style="cssI(0)" @click="setStatus('')">
        <Layers :size="12" /> All <span class="fc-n as-mono">{{ totalCount }}</span>
      </button>
      <button v-for="(s, i) in STATUS_LIST" :key="s" class="fc-pill" :data-status="s"
        :class="{ on: statusFilter === s }" :style="cssI(i + 1)" @click="setStatus(s)">
        <span class="fc-dot" :data-status="s" /> {{ statusMeta(s).label }}
        <span class="fc-n as-mono">{{ count('by_status', s) }}</span>
      </button>
    </div>

    <!-- type + condition + warranty -->
    <div class="fc-rail fc-meta">
      <div class="fc-types">
        <button v-for="(t, i) in TYPE_LIST" :key="t" class="fc-type" :class="{ on: typeFilter === t }"
          :style="{ ...cssI(i), '--accent': `var(${typeMeta(t).cssVar})` }" @click="setType(t)" :title="typeMeta(t).label">
          <component :is="typeIcon(t)" :size="13" />
          <span class="fc-type-lab">{{ typeMeta(t).label }}</span>
          <span v-if="count('by_type', t)" class="fc-type-n as-mono">{{ count('by_type', t) }}</span>
        </button>
      </div>

      <span class="fc-sep" />

      <button v-for="(c, i) in COND_LIST" :key="c" class="fc-cond" :data-cond="c"
        :class="{ on: conditionFilter === c }" :style="cssI(i)" @click="setCond(c)">
        <span class="fc-cond-dot" :data-cond="c" /> {{ conditionMeta(c).label }}
      </button>

      <span class="fc-sep" />

      <button class="fc-warranty" :class="{ on: warranty }" @click="$emit('update:warranty', !warranty)" title="Warranty expiring within 30 days">
        <CalendarClock :size="13" /> Warranty 30d
      </button>

      <Transition name="fc-clear">
        <button v-if="anyActive" class="fc-clear" @click="clearAll"><X :size="12" /> Clear</button>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  Layers, CalendarClock, X,
  Laptop, HardDrive, Monitor, Smartphone, CreditCard, Headphones,
  Keyboard, Mouse, Car, KeyRound, Package,
} from 'lucide-vue-next'
import {
  statusMeta, conditionMeta, typeMeta, ASSET_STATUSES, ASSET_TYPES, ASSET_CONDITIONS,
} from '@/composables/useAssets'

const props = defineProps({
  stats: { type: Object, default: () => ({}) },
  statusFilter: { type: String, default: '' },
  typeFilter: { type: String, default: '' },
  conditionFilter: { type: String, default: '' },
  warranty: { type: Boolean, default: false },
})
const emit = defineEmits(['update:statusFilter', 'update:typeFilter', 'update:conditionFilter', 'update:warranty', 'clear'])

const STATUS_LIST = ASSET_STATUSES
const TYPE_LIST = ASSET_TYPES
const COND_LIST = ASSET_CONDITIONS.filter(c => c !== 'RETIRED')

const TYPE_ICONS = {
  LAPTOP: Laptop, DESKTOP: HardDrive, MONITOR: Monitor, MOBILE: Smartphone,
  SIM: CreditCard, RFID_CARD: CreditCard, ID_CARD: CreditCard, HEADSET: Headphones,
  KEYBOARD: Keyboard, MOUSE: Mouse, VEHICLE: Car, KEYS: KeyRound, OTHER: Package,
}
const typeIcon = (t) => TYPE_ICONS[t] || Package

const count = (bucket, key) => (props.stats?.[bucket]?.[key]) || 0
const totalCount = computed(() => props.stats?.total ?? ASSET_STATUSES.reduce((a, k) => a + count('by_status', k), 0))
const anyActive = computed(() => !!(props.statusFilter || props.typeFilter || props.conditionFilter || props.warranty))
const cssI = (i) => ({ '--i': i })

const setStatus = (s) => emit('update:statusFilter', props.statusFilter === s ? '' : s)
const setType = (t) => emit('update:typeFilter', props.typeFilter === t ? '' : t)
const setCond = (c) => emit('update:conditionFilter', props.conditionFilter === c ? '' : c)
function clearAll() {
  emit('update:statusFilter', '')
  emit('update:typeFilter', '')
  emit('update:conditionFilter', '')
  emit('update:warranty', false)
  emit('clear')
}
</script>

<style scoped>
.fc { display: flex; flex-direction: column; gap: 9px; }
.fc-rail { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; }
.fc-meta { gap: 6px; }

.fc-pill { display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 600;
  color: var(--as-text-secondary); background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: all 0.22s var(--as-spring);
  animation: as-deal-row 0.4s var(--as-spring) both; animation-delay: calc(var(--i) * 0.035s); }
.fc-pill:hover { border-color: var(--as-border-strong); color: var(--as-text); transform: translateY(-1px); }
.fc-pill.on { color: var(--as-text); border-color: var(--as-border-strong); background: var(--as-surface-elevated); box-shadow: inset 0 0 0 1px var(--as-border-soft); }
.fc-pill[data-status].on { box-shadow: 0 0 0 1px var(--ac, var(--as-border-strong)), 0 6px 16px -8px var(--ac); }
.fc-pill[data-status="AVAILABLE"].on   { --ac: var(--as-st-available); background: var(--as-st-available-soft); }
.fc-pill[data-status="ALLOCATED"].on   { --ac: var(--as-st-allocated); background: var(--as-st-allocated-soft); }
.fc-pill[data-status="RESERVED"].on    { --ac: var(--as-st-reserved); background: var(--as-st-reserved-soft); }
.fc-pill[data-status="MAINTENANCE"].on { --ac: var(--as-st-maintenance); background: var(--as-st-maintenance-soft); }
.fc-pill[data-status="RETIRED"].on     { --ac: var(--as-st-retired); background: var(--as-st-retired-soft); }
.fc-dot { width: 7px; height: 7px; border-radius: 50%; }
.fc-dot[data-status="AVAILABLE"]   { background: var(--as-st-available); box-shadow: 0 0 6px var(--as-st-available); }
.fc-dot[data-status="ALLOCATED"]   { background: var(--as-st-allocated); box-shadow: 0 0 6px var(--as-st-allocated); }
.fc-dot[data-status="RESERVED"]    { background: var(--as-st-reserved); box-shadow: 0 0 6px var(--as-st-reserved); }
.fc-dot[data-status="MAINTENANCE"] { background: var(--as-st-maintenance); }
.fc-dot[data-status="RETIRED"]     { background: var(--as-st-retired); }
.fc-n { font-size: 11px; font-weight: 700; color: var(--as-text-muted); padding-left: 2px; }
.fc-pill.on .fc-n { color: var(--as-text); }

/* type chips */
.fc-types { display: flex; align-items: center; gap: 6px; overflow-x: auto; max-width: 100%; padding-bottom: 2px; scrollbar-width: thin; }
.fc-types::-webkit-scrollbar { height: 5px; }
.fc-types::-webkit-scrollbar-thumb { background: var(--as-border-strong); border-radius: 4px; }
.fc-type { flex-shrink: 0; display: inline-flex; align-items: center; gap: 5px; padding: 5px 9px; border-radius: 9px; cursor: pointer; font: inherit; font-size: 11.5px; font-weight: 600;
  color: var(--as-text-muted); background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: all 0.2s var(--as-spring);
  animation: as-deal-row 0.4s var(--as-spring) both; animation-delay: calc(var(--i) * 0.025s); }
.fc-type :deep(svg) { color: var(--accent); }
.fc-type:hover { border-color: var(--as-border-strong); color: var(--as-text); }
.fc-type.on { color: var(--as-text); background: color-mix(in srgb, var(--accent) 14%, transparent); border-color: color-mix(in srgb, var(--accent) 40%, transparent); }
.fc-type-lab { white-space: nowrap; }
.fc-type-n { font-size: 10px; color: var(--as-text-dim); }

.fc-sep { width: 1px; height: 20px; background: var(--as-border-soft); flex-shrink: 0; }

.fc-cond { display: inline-flex; align-items: center; gap: 5px; padding: 5px 9px; border-radius: 9px; cursor: pointer; font: inherit; font-size: 11.5px; font-weight: 600;
  color: var(--as-text-muted); background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: all 0.2s var(--as-spring);
  animation: as-deal-row 0.4s var(--as-spring) both; animation-delay: calc(var(--i) * 0.03s); }
.fc-cond:hover { color: var(--as-text); border-color: var(--as-border-strong); }
.fc-cond.on { color: var(--as-text); border-color: var(--cc); background: color-mix(in srgb, var(--cc) 12%, transparent); }
.fc-cond[data-cond="NEW"]  { --cc: var(--as-cond-new); }
.fc-cond[data-cond="GOOD"] { --cc: var(--as-cond-good); }
.fc-cond[data-cond="FAIR"] { --cc: var(--as-cond-fair); }
.fc-cond[data-cond="POOR"] { --cc: var(--as-cond-poor); }
.fc-cond-dot { width: 6px; height: 6px; border-radius: 2px; background: var(--cc); }

.fc-warranty { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 9px; cursor: pointer; font: inherit; font-size: 11.5px; font-weight: 600;
  color: var(--as-text-muted); background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: all 0.2s var(--as-spring); }
.fc-warranty:hover { color: var(--as-text); border-color: var(--as-border-strong); }
.fc-warranty.on { color: var(--as-ember); border-color: color-mix(in srgb, var(--as-ember) 42%, transparent); background: color-mix(in srgb, var(--as-ember) 13%, transparent); box-shadow: 0 0 0 1px color-mix(in srgb, var(--as-ember) 24%, transparent); }

.fc-clear { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 9px; cursor: pointer; font: inherit; font-size: 11.5px; font-weight: 600;
  color: var(--as-text-muted); background: transparent; border: 1px dashed var(--as-border-strong); transition: all 0.2s; }
.fc-clear:hover { color: var(--as-cond-poor); border-color: color-mix(in srgb, var(--as-cond-poor) 40%, transparent); }
.fc-clear-enter-active, .fc-clear-leave-active { transition: opacity 0.22s, transform 0.22s var(--as-spring); }
.fc-clear-enter-from, .fc-clear-leave-to { opacity: 0; transform: scale(0.85); }

@media (prefers-reduced-motion: reduce) {
  .fc-pill, .fc-type, .fc-cond { animation: none; }
}
</style>
