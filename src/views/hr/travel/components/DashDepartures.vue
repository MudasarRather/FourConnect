<template>
  <Motion as="article" class="dep panel trv-grain"
    :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, delay: 0.06 }">
    <span class="dep-aura" aria-hidden="true" />
    <header class="dep-head">
      <div>
        <span class="dep-eyebrow"><PlaneTakeoff :size="12" /> Departures board</span>
        <h3 class="dep-title">Next on the runway</h3>
      </div>
      <button v-if="rows.length" class="dep-all" @click="$emit('go', { tab: 'requests', filter: { status: 'APPROVED' } })">
        View all <ArrowUpRight :size="12" />
      </button>
    </header>

    <div v-if="loading" class="dep-skel"><span v-for="n in 3" :key="n" /></div>

    <div v-else-if="rows.length" class="dep-list">
      <button v-for="(r, i) in rows" :key="r.id" type="button" class="dep-row" :class="[r.tone, { soon: r.soon }]"
        :style="{ '--c': r.hex, '--d': (0.08 * i) + 's' }"
        @click="$emit('go', { tab: 'requests', filter: { q: r.ref } })">
        <span class="dep-when" :class="r.tone">
          <component :is="r.inFlight ? Plane : Clock" :size="11" />
          {{ r.countdown }}
        </span>

        <span class="dep-route">
          <span class="dr-code trv-mono">{{ r.fromCode }}</span>
          <span class="dr-line"><i /><Plane :size="11" class="dr-plane" /><i /></span>
          <span class="dr-code trv-mono">{{ r.toCode }}</span>
        </span>

        <span class="dep-who">
          <span class="dw-name">{{ r.name }}</span>
          <span class="dw-ref trv-mono">{{ r.ref }} · {{ r.date }}</span>
        </span>

        <span class="dep-pill" :style="{ '--c': r.hex }">{{ r.label }}</span>
      </button>
    </div>

    <div v-else class="dep-empty">
      <Radar :size="24" />
      <span>Runway clear — no upcoming departures</span>
    </div>
  </Motion>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { PlaneTakeoff, Plane, Clock, Radar, ArrowUpRight } from 'lucide-vue-next'
import { airportCode, fmtDate, statusMeta } from '@/composables/useTravel'

const props = defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})
defineEmits(['go'])

const daysTo = (d) => {
  if (!d) return 9e9
  return Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000)
}

const rows = computed(() => props.items.map(r => {
  const inFlight = r.status === 'IN_PROGRESS'
  const dt = daysTo(r.departure_date)
  let countdown, tone
  if (inFlight) { countdown = 'In flight'; tone = 'flight' }
  else if (dt < 0) { countdown = 'Departed'; tone = 'past' }
  else if (dt === 0) { countdown = 'Today'; tone = 'urgent' }
  else if (dt === 1) { countdown = 'Tomorrow'; tone = 'urgent' }
  else if (dt <= 7) { countdown = `in ${dt}d`; tone = 'soon' }
  else { countdown = `in ${dt}d`; tone = 'calm' }
  const m = statusMeta(r.status)
  return {
    id: r.id, ref: r.travel_reference_number, name: r.employee_name || '—',
    fromCode: airportCode(r.from_location), toCode: airportCode(r.to_location),
    date: fmtDate(r.departure_date), countdown, tone, inFlight,
    label: m.label, hex: m.hex, soon: tone === 'urgent' || inFlight,
  }
}))
</script>

<style scoped>
.dep { position: relative; overflow: hidden; isolation: isolate; padding: 18px; border-radius: 18px; background: var(--trv-surface); border: 1px solid var(--trv-border); box-shadow: var(--trv-card-shadow); flex: 1; }
.dep-aura { position: absolute; inset: -40% 30% 50% -10%; pointer-events: none; z-index: 0; background: radial-gradient(55% 70% at 25% 0%, rgba(251,146,60,0.12), transparent 70%); animation: trv-aura-drift 12s ease-in-out infinite; }
.dep-head { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 14px; }
.dep-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trv-ember); }
.dep-title { font-size: 14px; font-weight: 800; color: var(--trv-text); margin: 5px 0 0; }
.dep-all { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: var(--trv-amber); background: none; border: none; cursor: pointer; padding: 0; }
.dep-all:hover { text-decoration: underline; }

.dep-list { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 4px; }
.dep-row {
  display: grid; grid-template-columns: 78px auto 1fr auto; align-items: center; gap: 12px;
  padding: 10px 11px; border-radius: 12px; border: 1px solid transparent; background: var(--trv-panel); cursor: pointer; text-align: left;
  transition: transform 0.2s var(--trv-spring), border-color 0.2s, background 0.2s;
  animation: trv-deal 0.5s var(--trv-spring) backwards; animation-delay: var(--d);
}
.dep-row:hover { transform: translateX(3px); border-color: color-mix(in srgb, var(--c) 45%, transparent); background: color-mix(in srgb, var(--c) 7%, var(--trv-panel)); }
.dep-row.soon { border-color: color-mix(in srgb, var(--c) 30%, transparent); }

.dep-when { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 750; padding: 4px 8px; border-radius: 8px; white-space: nowrap; justify-content: center;
  color: var(--trv-text-muted); background: var(--trv-steel-soft); }
.dep-when.urgent { color: var(--trv-amber); background: var(--trv-amber-soft); }
.dep-when.flight { color: var(--trv-ember); background: rgba(251,146,60,0.12); }
.dep-when.soon { color: var(--trv-st-approved); background: var(--trv-st-approved-soft); }
.dep-when.past { color: var(--trv-text-dim); }

.dep-route { display: inline-flex; align-items: center; gap: 7px; }
.dr-code { font-size: 14px; font-weight: 850; color: var(--trv-text); }
.dr-line { display: inline-flex; align-items: center; gap: 3px; color: var(--trv-amber); }
.dr-line i { width: 12px; height: 1.5px; background: repeating-linear-gradient(90deg, currentColor 0 3px, transparent 3px 6px); opacity: 0.6; }
.dep-row.soon .dr-plane { animation: dep-taxi 2.4s ease-in-out infinite; }

.dep-who { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.dw-name { font-size: 12.5px; font-weight: 650; color: var(--trv-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dw-ref { font-size: 10px; color: var(--trv-text-dim); }
.dep-pill { font-size: 9.5px; font-weight: 800; padding: 3px 9px; border-radius: 999px; white-space: nowrap; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }

.dep-empty { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 9px; padding: 32px 16px; color: var(--trv-text-dim); font-size: 12.5px; text-align: center; }
.dep-empty svg { color: var(--trv-amber); opacity: 0.7; }

.dep-skel { display: flex; flex-direction: column; gap: 6px; }
.dep-skel span { height: 44px; border-radius: 12px; background: linear-gradient(100deg, var(--trv-panel) 30%, var(--trv-surface-elevated) 50%, var(--trv-panel) 70%); background-size: 200% 100%; animation: trv-runway-flow 1.4s linear infinite; }

@keyframes dep-taxi { 0%, 100% { transform: translateX(-1px); } 50% { transform: translateX(2px); } }
@media (max-width: 560px) { .dep-row { grid-template-columns: 70px auto 1fr; } .dep-pill { display: none; } }
@media (prefers-reduced-motion: reduce) { .dep-aura, .dep-row, .dr-plane, .dep-skel span { animation: none; } }
</style>
