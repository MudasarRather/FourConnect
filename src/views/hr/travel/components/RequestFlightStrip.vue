<template>
  <Motion as="article" class="fs" :class="{ inflight: req.status === 'IN_PROGRESS' }"
    :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.38, delay: Math.min(index * 0.03, 0.3), ease: [0.16, 1, 0.3, 1] }"
    :whileHover="{ x: 3 }" @click="$emit('open', req)">
    <span class="fs-spine" :style="{ background: stMeta.hex }" aria-hidden="true" />

    <div class="fs-id">
      <span class="fs-ref trv-mono"><component :is="stMeta.icon" :size="11" /> {{ req.travel_reference_number }}</span>
      <TrvStatusPill :status="req.status" :icon="false" />
    </div>

    <div class="fs-route">
      <span class="fs-code trv-mono">{{ code(req.from_location) }}</span>
      <span class="fs-path"><i /><Plane :size="13" class="fs-plane" /><i /></span>
      <span class="fs-code trv-mono">{{ code(req.to_location) }}</span>
    </div>

    <div class="fs-cell"><span class="lab">Traveller</span><span class="val">{{ req.employee_name || '—' }}</span></div>
    <div class="fs-cell"><span class="lab">Depart</span><span class="val trv-mono">{{ fmtDate(req.departure_date) }}</span></div>
    <div class="fs-cell num"><span class="lab">Days</span><span class="val trv-mono">{{ req.num_days }}</span></div>
    <div class="fs-cell num"><span class="lab">Est.</span><span class="val trv-mono amber">{{ fmtCompactINR(req.est_total_cost) }}</span></div>

    <div class="fs-links">
      <span v-if="isMultiCity(req)" class="dot mc" :title="`Multi-city · ${legCount(req)} legs`"><Route :size="12" /></span>
      <span v-if="req.bookings && req.bookings.length" class="dot" title="Bookings"><Ticket :size="12" /></span>
      <span v-if="req.advance" class="dot" title="Advance"><Coins :size="12" /></span>
      <span v-if="req.da" class="dot" title="DA"><Calculator :size="12" /></span>
      <span v-if="req.settlement" class="dot" title="Settlement"><Scale :size="12" /></span>
    </div>

    <div class="fs-rail" @click.stop>
      <Motion as="button" class="rb" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.92 }" title="Details" @click="$emit('open', req)"><Eye :size="14" /></Motion>
      <Motion v-if="req.can_execute" as="button" class="rb go" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.92 }" title="Start travel" @click="emit('action', { type: 'execute', req })"><PlaneTakeoff :size="14" /></Motion>
      <Motion v-if="req.can_complete" as="button" class="rb ok" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.92 }" title="Complete" @click="emit('action', { type: 'complete', req })"><CircleCheckBig :size="14" /></Motion>
      <Motion v-if="canBook" as="button" class="rb" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.92 }" title="Booking" @click="emit('action', { type: 'booking', req })"><Ticket :size="14" /></Motion>
      <Motion v-if="req.can_edit" as="button" class="rb" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.92 }" title="Edit" @click="emit('action', { type: 'edit', req })"><FilePen :size="14" /></Motion>
    </div>
  </Motion>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Plane, PlaneTakeoff, Eye, Ticket, FilePen, CircleCheckBig, Coins, Calculator, Scale, Route } from 'lucide-vue-next'
import TrvStatusPill from './TrvStatusPill.vue'
import { fmtCompactINR, fmtDate, airportCode, statusMeta, isMultiCity, legCount } from '@/composables/useTravel'

const props = defineProps({ req: { type: Object, required: true }, index: { type: Number, default: 0 } })
const emit = defineEmits(['open', 'action'])

const code = (l) => airportCode(l)
const stMeta = computed(() => statusMeta(props.req.status))
const canBook = computed(() => ['APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(props.req.status))
</script>

<style scoped>
.fs {
  position: relative; display: grid; align-items: center; gap: 14px; cursor: pointer; overflow: hidden;
  grid-template-columns: 168px 150px 1fr 110px 56px 88px 78px auto;
  padding: 12px 16px 12px 18px; border-radius: 13px;
  background: var(--trv-surface); border: 1px solid var(--trv-border); box-shadow: var(--trv-card-shadow);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.fs:hover { border-color: var(--trv-amber-border); box-shadow: var(--trv-shadow-hover); }
.fs-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; }
.fs.inflight .fs-spine { animation: trv-spine-pulse 1.8s ease-in-out infinite; }

.fs-id { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.fs-ref { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 700; color: var(--trv-amber-bright); }

.fs-route { display: flex; align-items: center; gap: 8px; }
.fs-code { font-size: 16px; font-weight: 800; color: var(--trv-text); }
.fs-path { display: flex; align-items: center; gap: 3px; color: var(--trv-amber); flex: 1; }
.fs-path i { flex: 1; height: 1.5px; background: repeating-linear-gradient(90deg, currentColor 0 4px, transparent 4px 8px); opacity: 0.5; }
.fs.inflight .fs-plane { animation: trv-plane-drift 2.4s ease-in-out infinite; }

.fs-cell { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.fs-cell.num { text-align: right; }
.fs-cell .lab { font-size: 8.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--trv-text-dim); }
.fs-cell .val { font-size: 12.5px; font-weight: 650; color: var(--trv-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fs-cell .val.amber { color: var(--trv-amber-bright); }

.fs-links { display: flex; gap: 5px; }
.fs-links .dot { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; color: var(--trv-amber); background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }
.fs-links .dot.mc { color: var(--trv-ember); background: color-mix(in srgb, var(--trv-ember) 14%, transparent); border-color: color-mix(in srgb, var(--trv-ember) 32%, transparent); }

.fs-rail { display: flex; gap: 6px; }
.rb { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; cursor: pointer; background: var(--trv-panel); border: 1px solid var(--trv-border-strong); color: var(--trv-text-secondary); }
.rb:hover { color: var(--trv-amber); border-color: var(--trv-amber-border); }
.rb.go { color: var(--trv-st-progress); }
.rb.ok { color: var(--trv-st-completed); }

@media (max-width: 1080px) {
  .fs { grid-template-columns: 150px 130px 1fr auto; }
  .fs-cell, .fs-links { display: none; }
}
@media (prefers-reduced-motion: reduce) { .fs.inflight .fs-spine, .fs.inflight .fs-plane { animation: none; } }
</style>
