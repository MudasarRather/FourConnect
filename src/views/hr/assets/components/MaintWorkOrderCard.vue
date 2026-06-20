<template>
  <article class="wo-shell" :style="{ '--i': index }">
    <div ref="cardEl" class="wo" :data-status="job.status" :data-type="job.maintenance_type">
      <span class="wo-glare" aria-hidden="true" />
      <span class="wo-spine" aria-hidden="true" />
      <span v-if="job.status === 'IN_PROGRESS'" class="wo-scan" aria-hidden="true" />

      <!-- header -->
      <header class="wo-head">
        <span class="wo-medal" :data-live="job.status === 'IN_PROGRESS'">
          <MaintGear v-if="job.status === 'IN_PROGRESS'" class="wo-medal-gear" :size="48" :teeth="12"
            color="var(--as-amber)" :duration="3.4" />
          <component :is="typeMeta.icon" :size="17" class="wo-medal-ic" />
        </span>
        <div class="wo-id">
          <span class="wo-code as-mono">{{ job.asset_code || '—' }}</span>
          <span class="wo-type">{{ typeMeta.label }}<span v-if="job.damage_id" class="wo-dmg" title="Linked to a damage report"><ShieldAlert :size="10" /> from damage</span></span>
        </div>
        <AsStamp :value="job.status" />
      </header>

      <!-- service progress track -->
      <div class="wo-track" :class="{ cancelled: job.status === 'CANCELLED' }">
        <template v-for="(s, i) in TRACK" :key="s.key">
          <span v-if="i > 0" class="wo-link" :data-on="stageIndex > i - 1 && job.status !== 'CANCELLED'" />
          <span class="wo-node" :data-state="nodeState(i)">
            <span class="wo-node-dot"><component :is="nodeIcon(i)" :size="11" /></span>
            <span class="wo-node-lab">{{ s.label }}</span>
          </span>
        </template>
        <span v-if="job.status === 'CANCELLED'" class="wo-cancel-tag"><Ban :size="11" /> stood down</span>
      </div>

      <!-- meta chips -->
      <div class="wo-meta">
        <span v-if="job.vendor_name" class="wo-chip"><Building2 :size="12" />{{ job.vendor_name }}</span>
        <span v-else class="wo-chip ghost"><Wrench :size="12" />Internal</span>
        <span v-if="job.cost != null" class="wo-chip"><IndianRupee :size="12" />{{ Number(job.cost).toLocaleString() }}</span>
        <span v-if="conditionDelta" class="wo-chip cond">
          <AsStamp :value="conditionDelta.before" />
          <ArrowRight :size="11" class="wo-cond-arrow" />
          <AsStamp :value="conditionDelta.after" />
        </span>
        <span v-else-if="job.condition_before" class="wo-chip cond"><AsStamp :value="job.condition_before" /></span>
      </div>

      <p v-if="job.description || job.resolution_notes" class="wo-desc">
        {{ job.resolution_notes || job.description }}
      </p>

      <!-- date timeline -->
      <div class="wo-dates">
        <span v-for="d in timeline" :key="d.key" class="wo-date" :data-done="d.done">
          <component :is="d.icon" :size="11" />
          <em>{{ d.label }}</em>
          <b>{{ d.value }}</b>
        </span>
      </div>

      <!-- actions -->
      <footer class="wo-foot">
        <template v-if="job.status === 'SCHEDULED'">
          <Motion as="button" type="button" class="as-btn as-btn-primary mini" :whileHover="{ y: -2, scale: 1.03 }" :whileTap="{ scale: 0.96 }" @click="$emit('action', 'start')">
            <Play :size="13" /> Start
          </Motion>
          <Motion as="button" type="button" class="as-btn as-btn-ghost mini" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="$emit('action', 'cancel')">
            <Ban :size="13" /> Cancel
          </Motion>
        </template>
        <template v-else-if="job.status === 'IN_PROGRESS'">
          <Motion as="button" type="button" class="as-btn as-btn-primary mini" :whileHover="{ y: -2, scale: 1.03 }" :whileTap="{ scale: 0.96 }" @click="$emit('action', 'complete')">
            <CheckCheck :size="13" /> Complete
          </Motion>
          <Motion as="button" type="button" class="as-btn as-btn-ghost mini" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="$emit('action', 'cancel')">
            <Ban :size="13" /> Cancel
          </Motion>
        </template>
        <span v-else class="wo-terminal" :data-status="job.status">
          <component :is="job.status === 'COMPLETED' ? CircleCheck : Ban" :size="13" />
          {{ job.status === 'COMPLETED' ? `Released ${fmt(job.completed_date) || ''}`.trim() : 'Cancelled' }}
        </span>
        <button type="button" class="wo-detail" @click="$emit('detail')" title="Open asset history"><History :size="13" /></button>
      </footer>
    </div>
  </article>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import {
  Wrench, ShieldCheck, ScanSearch, ChevronsUp, Gauge, Hammer,
  Building2, IndianRupee, ArrowRight, Play, Ban, CheckCheck, History,
  ShieldAlert, CircleCheck, CalendarClock, Clock, Cog, Flag,
} from 'lucide-vue-next'
import MaintGear from './MaintGear.vue'
import AsStamp from './AsStamp.vue'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  job: { type: Object, required: true },
  index: { type: Number, default: 0 },
})
defineEmits(['action', 'detail'])

const cardEl = ref(null)
usePointerSpotlight(cardEl)

const TYPE_META = {
  REPAIR:      { label: 'Repair',      icon: Hammer },
  PREVENTIVE:  { label: 'Preventive',  icon: ShieldCheck },
  INSPECTION:  { label: 'Inspection',  icon: ScanSearch },
  UPGRADE:     { label: 'Upgrade',     icon: ChevronsUp },
  CALIBRATION: { label: 'Calibration', icon: Gauge },
}
const typeMeta = computed(() => TYPE_META[props.job.maintenance_type] || { label: 'Service', icon: Wrench })

const TRACK = [
  { key: 'sched', label: 'Scheduled', icon: CalendarClock },
  { key: 'lift', label: 'On the lift', icon: Cog },
  { key: 'done', label: 'Released', icon: Flag },
]
const stageIndex = computed(() => {
  switch (props.job.status) {
    case 'SCHEDULED': return 0
    case 'IN_PROGRESS': return 1
    case 'COMPLETED': return 2
    default: return 0 // cancelled
  }
})
const nodeIcon = (i) => TRACK[i].icon
function nodeState(i) {
  if (props.job.status === 'CANCELLED') return i === 0 ? 'done' : 'cancelled'
  if (props.job.status === 'COMPLETED') return 'done'
  if (i < stageIndex.value) return 'done'
  if (i === stageIndex.value) return 'active'
  return 'future'
}

const conditionDelta = computed(() => {
  const { condition_before: b, condition_after: a } = props.job
  if (b && a && b !== a) return { before: b, after: a }
  return null
})

function fmt(iso) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) }
  catch { return iso }
}
const timeline = computed(() => {
  const j = props.job
  return [
    { key: 'rep', label: 'Reported', value: fmt(j.reported_date), icon: ShieldAlert, raw: j.reported_date },
    { key: 'sch', label: 'Scheduled', value: fmt(j.scheduled_date), icon: CalendarClock, raw: j.scheduled_date },
    { key: 'sta', label: 'Started', value: fmt(j.started_date), icon: Play, raw: j.started_date },
    { key: 'com', label: 'Done', value: fmt(j.completed_date), icon: Clock, raw: j.completed_date },
  ].filter(d => d.raw).map(d => ({ ...d, done: true }))
})
</script>

<style scoped>
.wo-shell { min-width: 0; animation: as-deal 0.5s var(--as-spring) both; animation-delay: calc(var(--i, 0) * 0.045s); }
.wo { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 12px; padding: 15px 16px 14px 19px; border-radius: 18px;
  background: var(--as-surf-card); border: 1px solid var(--as-border-soft); box-shadow: var(--as-card-shadow);
  transform: perspective(1100px) rotateX(0) rotateY(0); transform-style: preserve-3d;
  transition: transform 0.4s var(--as-spring), box-shadow 0.4s var(--as-spring), border-color 0.3s; }
.wo:hover { border-color: var(--as-border-strong); box-shadow: var(--as-card-shadow-hover);
  transform: perspective(1100px) rotateX(calc((var(--my, 0.5) - 0.5) * -6deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 8deg)) translateY(-2px); }
.wo-glare { position: absolute; inset: 0; pointer-events: none; z-index: 3; opacity: var(--spot, 0); transition: opacity 0.4s ease;
  background: radial-gradient(320px 240px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), color-mix(in srgb, var(--lc, var(--as-amber)) 16%, transparent), transparent 60%); }

/* status spine + accent var */
.wo[data-status="SCHEDULED"]   { --lc: var(--as-st-reserved); }
.wo[data-status="IN_PROGRESS"] { --lc: var(--as-amber); }
.wo[data-status="COMPLETED"]   { --lc: var(--as-st-available); }
.wo[data-status="CANCELLED"]   { --lc: var(--as-st-retired); }
.wo-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: linear-gradient(180deg, var(--lc), color-mix(in srgb, var(--lc) 30%, transparent));
  box-shadow: 0 0 14px -2px var(--lc); }
.wo-scan { position: absolute; left: 0; right: 0; top: 0; height: 38%; pointer-events: none; z-index: 2;
  background: linear-gradient(180deg, color-mix(in srgb, var(--as-amber) 14%, transparent), transparent); animation: wo-scan 2.8s ease-in-out infinite; }

.wo-head { position: relative; z-index: 1; display: flex; align-items: center; gap: 11px; }
.wo-medal { position: relative; flex-shrink: 0; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px;
  color: var(--lc); background: color-mix(in srgb, var(--lc) 13%, transparent); border: 1px solid color-mix(in srgb, var(--lc) 28%, transparent); }
.wo-medal-gear { position: absolute; opacity: 0.4; }
.wo-medal-ic { position: relative; z-index: 1; }
.wo-medal[data-live="true"] { box-shadow: 0 0 0 0 color-mix(in srgb, var(--as-amber) 50%, transparent); animation: wo-medal-pulse 2s ease-in-out infinite; }
.wo-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.wo-code { font-size: 14.5px; font-weight: 800; color: var(--as-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wo-type { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--as-text-muted); }
.wo-dmg { display: inline-flex; align-items: center; gap: 3px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
  color: var(--as-al-damaged); padding: 2px 6px; border-radius: 999px; background: var(--as-al-damaged-soft); }

/* progress track */
.wo-track { position: relative; z-index: 1; display: flex; align-items: center; gap: 0; padding: 2px 2px; }
.wo-node { display: flex; flex-direction: column; align-items: center; gap: 4px; flex-shrink: 0; }
.wo-node-dot { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; color: var(--as-text-dim);
  background: var(--as-surface); border: 1px solid var(--as-border-strong); transition: all 0.3s var(--as-spring); }
.wo-node-lab { font-size: 9px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: var(--as-text-dim); }
.wo-node[data-state="done"] .wo-node-dot { color: #1a1206; background: var(--as-st-available); border-color: var(--as-st-available); }
.wo-node[data-state="done"] .wo-node-lab { color: var(--as-text-secondary); }
.wo-node[data-state="active"] .wo-node-dot { color: #1a1206; background: var(--lc); border-color: var(--lc); box-shadow: 0 0 0 4px color-mix(in srgb, var(--lc) 18%, transparent); animation: wo-node-pulse 2s ease-in-out infinite; }
.wo-node[data-state="active"] .wo-node-lab { color: var(--lc); }
.wo-node[data-state="cancelled"] .wo-node-dot { opacity: 0.4; }
.wo-link { flex: 1; height: 2px; margin: 0 4px 16px; border-radius: 2px; background: var(--as-border-strong); position: relative; overflow: hidden; }
.wo-link[data-on="true"] { background: color-mix(in srgb, var(--as-st-available) 55%, transparent); }
.wo-track.cancelled { opacity: 0.6; }
.wo-cancel-tag { display: inline-flex; align-items: center; gap: 4px; margin-left: 8px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--as-st-retired); padding: 3px 8px; border-radius: 999px; background: var(--as-st-retired-soft); }

/* meta chips */
.wo-meta { position: relative; z-index: 1; display: flex; flex-wrap: wrap; align-items: center; gap: 7px; }
.wo-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 600; color: var(--as-text-secondary);
  padding: 4px 9px; border-radius: 8px; background: var(--as-surface); border: 1px solid var(--as-border-soft); }
.wo-chip :deep(svg) { color: var(--as-steel-dim); }
.wo-chip.ghost { color: var(--as-text-dim); }
.wo-chip.cond { gap: 6px; padding: 3px 8px; }
.wo-cond-arrow { color: var(--as-text-dim); }

.wo-desc { position: relative; z-index: 1; margin: 0; font-size: 12px; line-height: 1.5; color: var(--as-text-muted);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

/* date timeline */
.wo-dates { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 6px; }
.wo-date { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; color: var(--as-text-muted);
  padding: 3px 8px; border-radius: 7px; background: color-mix(in srgb, var(--as-surface-elevated) 60%, transparent); border: 1px solid var(--as-border-soft); }
.wo-date :deep(svg) { color: var(--lc); opacity: 0.8; }
.wo-date em { font-style: normal; color: var(--as-text-dim); }
.wo-date b { font-weight: 700; color: var(--as-text-secondary); font-variant-numeric: tabular-nums; }

/* footer */
.wo-foot { position: relative; z-index: 1; display: flex; align-items: center; gap: 8px; margin-top: 2px; }
.as-btn.mini { padding: 7px 13px; font-size: 12.5px; }
.wo-terminal { flex: 1; display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; }
.wo-terminal[data-status="COMPLETED"] { color: var(--as-st-available); }
.wo-terminal[data-status="CANCELLED"] { color: var(--as-text-muted); }
.wo-detail { margin-left: auto; display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; cursor: pointer;
  color: var(--as-text-muted); background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: all 0.2s; }
.wo-detail:hover { color: var(--as-amber); border-color: color-mix(in srgb, var(--as-amber) 40%, transparent); transform: translateY(-1px); }

@keyframes wo-scan { 0% { transform: translateY(-100%); opacity: 0; } 18% { opacity: 0.9; } 100% { transform: translateY(280%); opacity: 0; } }
@keyframes wo-medal-pulse { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--as-amber) 45%, transparent); } 50% { box-shadow: 0 0 0 7px color-mix(in srgb, var(--as-amber) 0%, transparent); } }
@keyframes wo-node-pulse { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--lc) 28%, transparent); } 50% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--lc) 0%, transparent); } }

@media (prefers-reduced-motion: reduce) {
  .wo-shell { animation: none; }
  .wo, .wo:hover { transform: none; }
  .wo-scan, .wo-medal[data-live="true"], .wo-node[data-state="active"] .wo-node-dot { animation: none; }
}
</style>
