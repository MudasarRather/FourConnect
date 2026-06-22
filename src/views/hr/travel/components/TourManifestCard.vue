<template>
  <div class="tm-shell" :style="{ '--i': index }">
    <article ref="cardEl" class="tm" :class="{ done: fulfilled }">
      <span class="tm-glare" aria-hidden="true" />
      <span class="tm-spine" :style="{ '--sc': statusHex }" aria-hidden="true" />

      <!-- header -->
      <header class="tm-head">
        <div class="tm-id">
          <span class="tm-ref trv-mono">{{ tour.travel_reference_number }}</span>
          <div class="tm-pills">
            <TrvStatusPill :status="tour.status" />
            <span v-if="locked" class="tm-lock" title="Settlement finalized — bookings are locked"><Lock :size="10" /> Settled</span>
          </div>
        </div>
        <div class="tm-route">
          <span class="tm-code trv-mono">{{ code(tour.from_location) }}</span>
          <span class="tm-arc"><span class="tm-dash" /><Plane :size="13" /><span class="tm-dash" /></span>
          <span class="tm-code trv-mono">{{ code(tour.to_location) }}</span>
        </div>
      </header>

      <div class="tm-sub">
        <span class="tm-emp"><span class="tm-av">{{ initials }}</span>{{ tour.employee_name || '—' }}</span>
        <span class="tm-dates trv-mono">{{ fmtDate(tour.departure_date) }} · {{ tour.num_days }}d</span>
        <span v-if="budget.over" class="tm-overbudget"><TriangleAlert :size="11" /> Over budget</span>
        <span class="tm-total trv-mono" :class="{ over: budget.over }">{{ fmtINR(totalCost) }}</span>
      </div>

      <!-- fulfilment meter -->
      <div class="tm-fuel">
        <span class="tm-fuel-track"><span class="tm-fuel-fill" :style="{ width: pct * 100 + '%' }" /></span>
        <span class="tm-fuel-lbl">{{ confirmed }}/{{ segments.length }} confirmed</span>
      </div>

      <!-- booked vs approved estimate -->
      <div class="tm-budget" :class="{ over: budget.over }">
        <span class="tm-budget-track"><span class="tm-budget-fill" :style="{ width: Math.min(100, budget.pct * 100) + '%' }" /></span>
        <span class="tm-budget-lbl">
          <component :is="budget.over ? TriangleAlert : Wallet" :size="11" />
          <b>{{ fmtCompactINR(budget.booked) }}</b> <span class="muted">of {{ fmtCompactINR(budget.est) }} approved</span>
        </span>
      </div>

      <!-- journey track -->
      <div v-if="segments.length" class="tm-track">
        <div class="tm-rail">
          <button v-for="(b, i) in segments" :key="b.id" type="button" class="tm-stop" :class="{ readonly: locked }"
            :style="{ '--c': typeMeta(b).hex, '--sd': statusMeta(b.status).hex, '--si': i }"
            :title="locked ? 'Settled — locked' : 'Edit segment'" @click="onSegClick(b)">
            <span class="tm-node"><component :is="typeMeta(b).icon" :size="15" /><span class="tm-status-dot" /></span>
            <span class="tm-node-lbl">{{ segLabel(b) }}</span>
            <span class="tm-node-cost trv-mono">{{ fmtCompactINR(b.total_cost) }}</span>
          </button>
          <button v-if="!locked" type="button" class="tm-stop add" @click="$emit('add', tour)">
            <span class="tm-node ghost"><Plus :size="15" /></span>
            <span class="tm-node-lbl">Add</span>
          </button>
        </div>
      </div>

      <!-- empty itinerary -->
      <div v-else class="tm-assemble" :class="{ locked }">
        <div class="tm-assemble-txt">
          <component :is="locked ? Lock : PackageOpen" :size="16" />
          <span>{{ locked ? 'No bookings were made — settlement is closed' : 'Itinerary empty — assemble this trip' }}</span>
        </div>
        <Motion v-if="!locked" as="button" class="tm-assemble-btn" :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.96 }" @click="$emit('add', tour)">
          <Plus :size="14" /> Add first segment
        </Motion>
      </div>

      <!-- footer -->
      <footer class="tm-foot">
        <button class="tm-act ghost" @click="$emit('detail', tour.id)"><Eye :size="13" /> Details</button>
        <span v-if="locked" class="tm-act locked" title="Settlement finalized — bookings are locked"><Lock :size="13" /> Locked</span>
        <Motion v-else as="button" class="tm-act primary" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="$emit('add', tour)">
          <Plus :size="13" /> Add segment
        </Motion>
      </footer>
    </article>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Plane, Plus, Eye, PackageOpen, Wallet, TriangleAlert, Lock } from 'lucide-vue-next'
import TrvStatusPill from './TrvStatusPill.vue'
import { usePointerSpotlight } from '@/composables/useShiftMotion'
import {
  fmtINR, fmtCompactINR, fmtDate, airportCode, bookingMeta, statusMeta as reqStatusMeta,
  BOOKING_STATUS,
} from '@/composables/useTravel'

const props = defineProps({
  tour: { type: Object, required: true },
  bookings: { type: Array, default: () => [] },
  index: { type: Number, default: 0 },
  locked: { type: Boolean, default: false },   // settlement finalized → bookings frozen
})
const emit = defineEmits(['add', 'edit', 'detail'])
const onSegClick = (booking) => { if (!props.locked) emit('edit', { booking, tour: props.tour }) }

const cardEl = ref(null)
usePointerSpotlight(cardEl)

const STATUS_MAP = Object.fromEntries(BOOKING_STATUS.map(s => [s.key, s]))
const CONFIRMED = new Set(['CONFIRMED', 'COMPLETED'])

const segments = computed(() => props.bookings)
const totalCost = computed(() => segments.value.reduce((s, b) => s + Number(b.total_cost || 0), 0))
const confirmed = computed(() => segments.value.filter(b => CONFIRMED.has(b.status)).length)
const pct = computed(() => (segments.value.length ? confirmed.value / segments.value.length : 0))
const fulfilled = computed(() => segments.value.length > 0 && confirmed.value === segments.value.length)

// Booked logistics vs the employee's approved estimate (the trip's budget ceiling).
const budget = computed(() => {
  const est = Number(props.tour.est_total_cost || 0)
  const booked = totalCost.value
  return { est, booked, pct: est ? booked / est : (booked ? 1 : 0), over: est > 0 && booked > est }
})

const code = (l) => airportCode(l)
const typeMeta = (b) => bookingMeta(b.booking_type)
const statusMeta = (s) => STATUS_MAP[s] || { hex: '#9ca3af', label: s }
const statusHex = computed(() => reqStatusMeta(props.tour.status).hex)
const initials = computed(() => (props.tour.employee_name || '·').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase())

const segLabel = (b) => b.vendor || b.hotel_name || (b.from_place && b.to_place ? `${b.from_place}→${b.to_place}` : typeMeta(b).label)
</script>

<style scoped>
.tm-shell { opacity: 0; animation: trv-deal 0.5s var(--trv-spring) forwards; animation-delay: calc(var(--i) * 0.06s); }
.tm {
  position: relative; overflow: hidden; padding: 16px 18px 14px 22px; border-radius: 20px;
  background: var(--trv-surface); border: 1px solid var(--trv-border); box-shadow: var(--trv-card-shadow);
  transition: transform 0.4s var(--trv-spring), box-shadow 0.4s var(--trv-spring), border-color 0.3s;
  transform: perspective(1300px) rotateX(calc((var(--my, 0.5) - 0.5) * -4deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 6deg));
}
.tm:hover { box-shadow: var(--trv-shadow-hover); border-color: var(--trv-border-strong); transform: perspective(1300px) rotateX(calc((var(--my, 0.5) - 0.5) * -4deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 6deg)) translateY(-3px); }
.tm.done { border-color: color-mix(in srgb, var(--trv-st-approved) 34%, var(--trv-border)); }
.tm-glare { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 6; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(420px circle at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), rgba(251, 191, 36, 0.13), transparent 60%); }
.tm-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--sc); opacity: 0.85; }

.tm-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.tm-id { display: flex; flex-direction: column; gap: 6px; }
.tm-ref { font-size: 12px; font-weight: 700; color: var(--trv-amber-bright); }
.tm-pills { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.tm-lock { display: inline-flex; align-items: center; gap: 3px; font-size: 9px; font-weight: 750; letter-spacing: 0.04em; text-transform: uppercase; padding: 2px 7px; border-radius: 999px; color: var(--trv-st-completed); background: color-mix(in srgb, var(--trv-st-completed) 14%, transparent); border: 1px solid color-mix(in srgb, var(--trv-st-completed) 30%, transparent); }
.tm-route { display: flex; align-items: center; gap: 8px; }
.tm-code { font-size: 19px; font-weight: 850; color: var(--trv-text); }
.tm-arc { display: inline-flex; align-items: center; gap: 4px; color: var(--trv-amber); }
.tm-dash { width: 14px; height: 1.5px; background: repeating-linear-gradient(90deg, currentColor 0 3px, transparent 3px 7px); opacity: 0.5; }

.tm-sub { display: flex; align-items: center; gap: 10px; margin: 10px 0 12px; flex-wrap: wrap; }
.tm-emp { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 650; color: var(--trv-text-secondary); }
.tm-av { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; font-size: 9px; font-weight: 800; color: #1a1205; background: var(--trv-grad-hero); }
.tm-dates { font-size: 11px; color: var(--trv-text-muted); }
.tm-overbudget { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 750; letter-spacing: 0.04em; text-transform: uppercase; color: var(--trv-st-rejected); padding: 2px 7px; border-radius: 999px; background: color-mix(in srgb, var(--trv-st-rejected) 13%, transparent); border: 1px solid color-mix(in srgb, var(--trv-st-rejected) 30%, transparent); }
.tm-total { margin-left: auto; font-size: 15px; font-weight: 800; color: var(--trv-amber); }
.tm-total.over { color: var(--trv-st-rejected); }

.tm-fuel { display: flex; align-items: center; gap: 10px; margin-bottom: 9px; }

.tm-budget { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.tm-budget-track { flex: 1; height: 5px; border-radius: 999px; background: var(--trv-panel); overflow: hidden; border: 1px solid var(--trv-border); }
.tm-budget-fill { display: block; height: 100%; border-radius: 999px; background: var(--trv-steel); transition: width 0.9s var(--trv-spring); }
.tm-budget.over .tm-budget-fill { background: linear-gradient(90deg, var(--trv-st-rejected), var(--trv-ember)); }
.tm-budget-lbl { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--trv-text-muted); white-space: nowrap; }
.tm-budget-lbl b { color: var(--trv-text-secondary); font-weight: 750; }
.tm-budget.over .tm-budget-lbl, .tm-budget.over .tm-budget-lbl b { color: var(--trv-st-rejected); }
.tm-budget-lbl .muted { color: var(--trv-text-dim); }
.tm-fuel-track { flex: 1; height: 6px; border-radius: 999px; background: var(--trv-panel); overflow: hidden; border: 1px solid var(--trv-border); }
.tm-fuel-fill { display: block; height: 100%; border-radius: 999px; background: var(--trv-grad-hero); transition: width 0.9s var(--trv-spring); }
.tm.done .tm-fuel-fill { background: linear-gradient(90deg, var(--trv-st-approved), var(--trv-st-completed)); }
.tm-fuel-lbl { font-size: 10.5px; color: var(--trv-text-muted); white-space: nowrap; }

/* journey track */
.tm-track { overflow-x: auto; overflow-y: hidden; padding: 4px 2px 8px; margin: 0 -2px; scrollbar-width: thin; }
.tm-rail { position: relative; display: inline-flex; align-items: flex-start; gap: 22px; padding: 18px 10px 4px; min-width: 100%; }
.tm-rail::before {
  content: ""; position: absolute; left: 24px; right: 24px; top: 33px; height: 2px;
  background: repeating-linear-gradient(90deg, var(--trv-amber) 0 6px, transparent 6px 13px);
  background-size: 200% 100%; opacity: 0.5; animation: tm-flow 1.6s linear infinite;
}
.tm-stop { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; background: none; border: none; cursor: pointer; padding: 0; min-width: 56px; max-width: 92px;
  opacity: 0; animation: tm-pop 0.4s var(--trv-spring) forwards; animation-delay: calc(var(--si) * 0.07s + 0.1s); }
.tm-node { position: relative; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
  color: var(--c); background: color-mix(in srgb, var(--c) 16%, var(--trv-surface)); border: 1.6px solid var(--c);
  transition: transform 0.25s var(--trv-spring); }
.tm-stop:hover .tm-node { transform: scale(1.14); }
.tm-stop.readonly { cursor: default; }
.tm-stop.readonly:hover .tm-node { transform: none; }
.tm-node.ghost { color: var(--trv-text-muted); background: var(--trv-panel); border: 1.5px dashed var(--trv-border-strong); }
.tm-stop.add:hover .tm-node.ghost { color: var(--trv-amber); border-color: var(--trv-amber-border); }
.tm-status-dot { position: absolute; right: -1px; bottom: -1px; width: 10px; height: 10px; border-radius: 50%; background: var(--sd); border: 2px solid var(--trv-surface); }
.tm-node-lbl { font-size: 10px; color: var(--trv-text-secondary); max-width: 88px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; }
.tm-node-cost { font-size: 10px; font-weight: 700; color: var(--trv-amber); }

/* empty */
.tm-assemble { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 14px 16px; border-radius: 14px; background: var(--trv-panel); border: 1px dashed var(--trv-border-strong); margin-bottom: 4px; }
.tm-assemble.locked { background: var(--trv-steel-soft); border-style: solid; }
.tm-assemble-txt { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--trv-text-muted); }
.tm-assemble-txt svg { color: var(--trv-amber); }
.tm-assemble.locked .tm-assemble-txt svg { color: var(--trv-st-completed); }
.tm-assemble-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; border: none; cursor: pointer; font-size: 12px; font-weight: 700; color: #1a1205; background: var(--trv-grad-hero); }

/* footer */
.tm-foot { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
.tm-act { display: inline-flex; align-items: center; gap: 5px; padding: 7px 13px; border-radius: 9px; font-size: 12px; font-weight: 650; cursor: pointer; border: 1px solid transparent; }
.tm-act.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.tm-act.ghost:hover { color: var(--trv-text); border-color: var(--trv-text-dim); }
.tm-act.primary { background: var(--trv-grad-hero); color: #1a1205; box-shadow: var(--trv-amber-glow); }
.tm-act.locked { color: var(--trv-st-completed); border-color: color-mix(in srgb, var(--trv-st-completed) 30%, transparent); background: color-mix(in srgb, var(--trv-st-completed) 10%, transparent); cursor: default; }

@keyframes tm-flow { to { background-position: 200% 0; } }
@keyframes tm-pop { 0% { opacity: 0; transform: translateY(8px) scale(0.9); } 100% { opacity: 1; transform: translateY(0) scale(1); } }

@media (prefers-reduced-motion: reduce) {
  .tm-shell, .tm-stop { animation: none; opacity: 1; }
  .tm { transform: none; } .tm:hover { transform: translateY(-3px); }
  .tm-rail::before { animation: none; }
  .tm-fuel-fill { transition: none; }
}
</style>
