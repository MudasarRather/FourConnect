<template>
  <div class="nc-shell" :style="{ '--i': index }">
    <article ref="cardEl" class="nc ex-grain" :class="{ over: row.overdue, soon: soon }" @click="$emit('open', row)">
      <span class="nc-glare" aria-hidden="true" />
      <span class="nc-spine" :style="{ background: urgency.color }" :class="{ live: row.overdue || soon }" />

      <NoticeCountdownArc :days="row.days_remaining ?? 0" :total="row.notice_total_days ?? (row.notice_period_days || 30)" />

      <div class="nc-id">
        <div class="nc-top">
          <span class="nc-name">{{ row.employee_name || row.employee_code }}</span>
          <span class="nc-pill" :style="{ '--c': urgency.color }">
            <component :is="urgency.icon" :size="11" /> {{ urgency.label }}
          </span>
          <span v-if="row.notice_waived" class="nc-waived"><Undo2 :size="10" /> waived</span>
        </div>
        <span class="nc-meta ex-mono">{{ row.case_number }} · {{ row.department_name || '—' }}</span>
        <div class="nc-dates">
          <span><CalendarClock :size="11" /> {{ fmtDate(row.notice_period_start_date) }}</span>
          <span class="nc-arrow"><ArrowRight :size="11" /></span>
          <span class="nc-lwd"><Flag :size="11" /> {{ fmtDate(row.last_working_date) }}</span>
        </div>
        <div class="nc-served">
          <span v-if="row.not_started" class="ns-txt"><Clock :size="11" /> Notice starts {{ fmtDate(row.notice_period_start_date) }}</span>
          <template v-else-if="servedWindow">
            <span class="ns-txt"><CalendarCheck :size="11" /> Day <b>{{ row.served_days ?? '—' }}</b> of <b>{{ servedWindow }}</b> served</span>
            <span class="ns-track"><span class="ns-fill" :style="{ width: (row.progress_pct || 0) + '%' }" /></span>
          </template>
          <span v-if="row.short_notice" class="ns-short" :title="`${row.shortfall_days}d short of the required ${row.required_days}d notice — recoverable in F&F`">
            <AlertTriangle :size="10" /> short notice −{{ row.shortfall_days }}d
          </span>
        </div>
      </div>

      <div class="nc-clear">
        <span class="ncc-head"><span class="ncc-lab">Clearance</span><span class="ncc-val ex-mono">{{ clr }}%</span></span>
        <span class="ncc-track"><span class="ncc-fill" :style="{ width: clr + '%' }" :class="{ done: clr >= 100 }" /></span>
        <div class="nc-stages">
          <button v-for="s in stages" :key="s.tab" type="button" class="nc-stage" :title="s.title"
            @click.stop="$emit('go', { tab: s.tab })"><component :is="s.icon" :size="12" /></button>
        </div>
      </div>

      <div class="nc-act">
        <Motion as="button" type="button" class="nc-btn primary" :whileHover="{ y: -2, scale: 1.03 }" :whileTap="{ scale: 0.96 }"
          @click.stop="$emit('adjust', row)"><CalendarClock :size="13" /> Adjust</Motion>
        <button type="button" class="nc-btn ghost" :class="{ on: expanded }" @click.stop="expanded = !expanded">
          <Activity :size="13" /> Serving <ChevronDown :size="12" class="ch" :class="{ flip: expanded }" />
        </button>
      </div>

      <!-- expandable serving telemetry: attendance · leave · settlement impact -->
      <Presence>
        <Motion v-if="expanded" as="div" class="nc-serving" @click.stop
          :initial="{ opacity: 0, y: -8 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: -8 }"
          :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }">
          <NoticeServingPanel :case-id="row.case_id" @go="$emit('go', $event)" />
        </Motion>
      </Presence>
    </article>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  CalendarClock, CalendarCheck, ArrowRight, ArrowUpRight, Flag, Undo2, AlertTriangle, Hourglass, Clock,
  ClipboardCheck, PackageCheck, MessagesSquare, Scale, Activity, ChevronDown,
} from 'lucide-vue-next'
import NoticeCountdownArc from './NoticeCountdownArc.vue'
import NoticeServingPanel from './NoticeServingPanel.vue'
import { fmtDate } from '@/composables/useExit'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  row: { type: Object, required: true },
  index: { type: Number, default: 0 },
})
defineEmits(['open', 'adjust', 'go'])

const cardEl = ref(null)
usePointerSpotlight(cardEl)

const expanded = ref(false)
const clr = computed(() => Math.round(props.row.clearance_progress_pct || 0))
const d = computed(() => props.row.days_remaining)
const soon = computed(() => !props.row.overdue && d.value != null && d.value <= 7)
const servedWindow = computed(() => props.row.notice_total_days ?? null)

const urgency = computed(() => {
  const days = d.value
  if (props.row.overdue) return { color: 'var(--ex-blocked)', label: `+${-days}d overdue`, icon: AlertTriangle }
  if (days == null) return { color: 'var(--ex-steel)', label: 'no last day', icon: Clock }
  if (days <= 3) return { color: 'var(--ex-ember-deep)', label: `${days}d left`, icon: AlertTriangle }
  if (days <= 7) return { color: 'var(--ex-ember)', label: `${days}d left`, icon: Hourglass }
  if (days <= 14) return { color: 'var(--ex-amber-strong)', label: `${days}d left`, icon: Hourglass }
  return { color: 'var(--ex-amber)', label: `${days}d left`, icon: CalendarClock }
})

const stages = [
  { tab: 'clearance', icon: ClipboardCheck, title: 'Clearance gatehouse' },
  { tab: 'asset-return', icon: PackageCheck, title: 'Asset recovery' },
  { tab: 'interviews', icon: MessagesSquare, title: 'Exit interview' },
  { tab: 'settlement', icon: Scale, title: 'Final settlement' },
]
</script>

<style scoped>
.nc-shell { animation: ex-deal 0.55s var(--ex-spring) backwards; animation-delay: calc(var(--i, 0) * 0.05s); }
.nc { position: relative; overflow: hidden; display: grid; grid-template-columns: 120px 1.5fr 1.1fr auto; gap: 16px; align-items: center;
  padding: 15px 18px 15px 22px; border-radius: 18px; cursor: pointer;
  background: var(--ex-surface); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow);
  transition: transform 0.3s var(--ex-spring), border-color 0.3s, box-shadow 0.3s; transform-style: preserve-3d; }
.nc:hover { transform: perspective(1200px) rotateX(calc((var(--my, 0.5) - 0.5) * -4deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 6deg)) translateY(-3px);
  border-color: var(--ex-violet-border); box-shadow: var(--ex-shadow-hover); }
.nc.over { border-color: color-mix(in srgb, var(--ex-blocked) 34%, transparent); }
.nc-glare { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s; border-radius: inherit;
  background: radial-gradient(420px 280px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), rgba(251,146,60,0.14), transparent 60%); }
.nc-spine { position: absolute; left: 0; top: 14px; bottom: 14px; width: 4px; border-radius: 0 4px 4px 0; opacity: 0.85; }
.nc-spine.live { animation: spine-glow 2.2s ease-in-out infinite; }
@keyframes spine-glow { 0%, 100% { opacity: 0.5; box-shadow: none; } 50% { opacity: 1; box-shadow: 2px 0 12px var(--ex-ember); } }

.nc-id { min-width: 0; position: relative; }
.nc-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.nc-name { font-size: 15px; font-weight: 850; color: var(--ex-text); }
.nc-pill { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 800; color: var(--c);
  padding: 2px 8px; border-radius: 999px; background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.nc-waived { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 700; color: var(--ex-amber); }
.nc-meta { font-size: 11px; color: var(--ex-text-muted); display: block; margin-top: 4px; }
.nc-dates { display: flex; align-items: center; gap: 7px; margin-top: 6px; flex-wrap: wrap; }
.nc-dates span { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--ex-text-secondary); }
.nc-arrow { color: var(--ex-text-dim); }
.nc-lwd { font-weight: 700; color: var(--ex-text) !important; }

.nc-clear { position: relative; display: flex; flex-direction: column; gap: 6px; }
.ncc-head { display: flex; align-items: center; justify-content: space-between; }
.ncc-lab { font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ex-text-dim); }
.ncc-val { font-size: 12px; font-weight: 850; color: var(--ex-text); }
.ncc-track { height: 7px; border-radius: 999px; background: var(--ex-steel-soft); overflow: hidden; }
.ncc-fill { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--ex-ember), var(--ex-amber-bright)); transition: width 0.9s var(--ex-spring); }
.ncc-fill.done { background: linear-gradient(90deg, var(--ex-amber-bright), var(--ex-cleared)); }
.nc-stages { display: flex; gap: 5px; margin-top: 2px; }
.nc-stage { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; cursor: pointer;
  background: var(--ex-surface-elevated); border: 1px solid var(--ex-border); color: var(--ex-text-muted); transition: all 0.2s; }
.nc-stage:hover { color: var(--ex-violet); border-color: var(--ex-violet-border); background: var(--ex-violet-soft); transform: translateY(-2px); }

.nc-served { display: flex; align-items: center; gap: 8px; margin-top: 6px; flex-wrap: wrap; }
.ns-txt { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; color: var(--ex-text-muted); }
.ns-txt svg { color: var(--ex-violet); }
.ns-txt b { color: var(--ex-text); font-family: var(--ex-mono); }
.ns-track { width: 78px; height: 5px; border-radius: 999px; background: var(--ex-steel-soft); overflow: hidden; }
.ns-fill { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--ex-ember), var(--ex-amber-bright)); transition: width 0.8s var(--ex-spring); }
.ns-short { display: inline-flex; align-items: center; gap: 3px; font-size: 9.5px; font-weight: 800; color: var(--ex-blocked);
  padding: 2px 7px; border-radius: 999px; background: var(--ex-blocked-soft); border: 1px solid color-mix(in srgb, var(--ex-blocked) 30%, transparent); }

.nc-act { display: flex; flex-direction: column; gap: 7px; position: relative; }
.nc-btn { display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 8px 12px; border-radius: 10px; font-size: 12px; font-weight: 800; cursor: pointer; white-space: nowrap; }
.nc-btn.primary { border: none; background: var(--ex-grad-hero); color: #1a1206; }
.nc-btn.ghost { background: var(--ex-surface-elevated); border: 1px solid var(--ex-border); color: var(--ex-text-secondary); }
.nc-btn.ghost.on { border-color: var(--ex-violet-border); background: var(--ex-violet-soft); color: var(--ex-violet); }
.nc-btn .ch { transition: transform 0.3s var(--ex-spring); }
.nc-btn .ch.flip { transform: rotate(180deg); }

.nc-serving { grid-column: 1 / -1; margin-top: 4px; }

@media (max-width: 880px) {
  .nc { grid-template-columns: 100px 1fr; }
  .nc-clear, .nc-act { grid-column: 1 / -1; }
  .nc-act { flex-direction: row; }
  .nc:hover { transform: translateY(-3px); }
}
@media (prefers-reduced-motion: reduce) {
  .nc-shell { animation: none; }
  .nc:hover { transform: translateY(-2px); }
  .nc-spine.live { animation: none; }
}
</style>
