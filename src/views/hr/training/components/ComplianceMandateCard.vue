<template>
  <article class="cmc" :class="{ paused: !config.is_active }">
    <span class="cmc-rail" aria-hidden="true" />
    <span class="cmc-sheen" aria-hidden="true" />

    <header class="cmc-head">
      <div class="cmc-orbit">
        <span class="cmc-orbit-glow" aria-hidden="true" />
        <TrnProgressOrbit :pct="donutPct" :size="74" :stroke="6" :color="donutColor" label="compliant" />
      </div>
      <div class="cmc-titles">
        <h3>{{ config.program_name || 'Untitled program' }}</h3>
        <div class="cmc-chips">
          <span class="cmc-chip freq"><Repeat :size="11" /> {{ freqLabel }}</span>
          <span v-if="config.validity_months" class="cmc-chip"><CalendarClock :size="11" /> {{ config.validity_months }}mo valid</span>
          <span class="cmc-chip" :class="config.auto_reassign ? 'auto' : 'manual'">
            <Zap :size="11" /> {{ config.auto_reassign ? 'Auto' : 'Manual' }}
          </span>
          <span v-if="!config.is_active" class="cmc-chip off"><Pause :size="11" /> Paused</span>
        </div>
      </div>
    </header>

    <!-- cohort spectrum -->
    <div class="cmc-spectrum">
      <div class="cmc-bar" :title="`${total} in cohort`">
        <span v-for="s in segments" :key="s.key" class="cmc-seg" :class="s.key"
          :style="{ width: (ready ? s.pct : 0) + '%' }" />
        <span v-if="!total" class="cmc-bar-empty">No eligible cohort yet</span>
      </div>
      <div class="cmc-legend">
        <span v-for="s in legend" :key="s.key" class="cmc-leg" :class="s.key">
          <i /> {{ s.label }} <b class="trn-mono"><TrnCountUp :value="s.count" /></b>
        </span>
      </div>
    </div>

    <div class="cmc-meta">
      <span><Users :size="11" /> {{ total }} eligible</span>
      <span><Hourglass :size="11" /> {{ config.grace_period_days ?? 0 }}d grace</span>
      <span><CalendarDays :size="11" /> due +{{ config.due_days_after_assign ?? 0 }}d</span>
    </div>

    <div class="cmc-foot">
      <Motion as="button" class="cmc-act" :whileTap="{ scale: 0.93 }" @click="$emit('toggle-active', config)"
        :title="config.is_active ? 'Pause this rule' : 'Resume this rule'">
        <component :is="config.is_active ? Pause : Play" :size="14" /> {{ config.is_active ? 'Pause' : 'Resume' }}
      </Motion>
      <Motion as="button" class="cmc-act sweep" :whileTap="reassigning === config.id ? {} : { scale: 0.93 }"
        :disabled="!config.is_active || reassigning === config.id" @click="$emit('sweep', config)"
        :title="!config.is_active ? 'Resume the rule to run a sweep' : 'Create enrollments for due / never-completed employees now'">
        <Loader v-if="reassigning === config.id" :size="14" class="spin" /><RefreshCw v-else :size="14" /> Sweep
      </Motion>
      <button class="cmc-act" :class="{ active: showRoster }" :disabled="!roster.length" @click="showRoster = !showRoster">
        <Users :size="14" /> Roster
      </button>
      <Motion as="button" class="cmc-act" :whileTap="{ scale: 0.93 }" @click="$emit('edit', config)" title="Edit rule"><Pencil :size="14" /></Motion>
      <Motion as="button" class="cmc-act danger" :whileTap="{ scale: 0.93 }" @click="$emit('delete', config)" title="Delete rule"><Trash2 :size="14" /></Motion>
    </div>

    <Presence>
      <Motion v-if="showRoster" as="div" class="cmc-roster"
        :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }"
        :transition="{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }">
        <div class="cmc-roster-inner">
          <table class="cmc-table">
            <thead><tr><th>Employee</th><th>Last completed</th><th>Valid until</th><th>State</th></tr></thead>
            <tbody>
              <Motion v-for="(r, ri) in roster" :key="r.employee_id || ri" as="tr"
                :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }"
                :transition="{ duration: 0.3, delay: Math.min(ri * 0.03, 0.3) }">
                <td>
                  <span class="cmc-emp">{{ r.employee_name || '—' }}</span>
                  <span v-if="r.employee_code" class="cmc-emp-code trn-mono">{{ r.employee_code }}</span>
                </td>
                <td>{{ fmtDate(r.last_completed) }}</td>
                <td>{{ fmtDate(r.valid_until) }}</td>
                <td><span class="cmc-pill" :data-state="r.state || 'NEVER'">{{ stateLabel(r.state) }}</span></td>
              </Motion>
            </tbody>
          </table>
          <button class="cmc-roster-link" @click="$emit('go', 'enrollment')">
            View renewals in Employee Trainings <ArrowRight :size="12" />
          </button>
        </div>
      </Motion>
    </Presence>
  </article>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  Repeat, CalendarClock, Zap, Pause, Play, RefreshCw, Loader, Users, Hourglass, CalendarDays,
  Pencil, Trash2, ArrowRight,
} from 'lucide-vue-next'
import TrnProgressOrbit from './TrnProgressOrbit.vue'
import TrnCountUp from './TrnCountUp.vue'

const props = defineProps({
  config: { type: Object, required: true },
  roster: { type: Array, default: () => [] },
  reassigning: { default: null },
})
defineEmits(['sweep', 'edit', 'delete', 'toggle-active', 'go'])

const showRoster = ref(false)

const FREQ_LABELS = {
  ONE_TIME: 'One-time', MONTHLY: 'Monthly', QUARTERLY: 'Quarterly',
  HALF_YEARLY: 'Half-yearly', ANNUAL: 'Annual', BIENNIAL: 'Biennial',
}
const freqLabel = computed(() => FREQ_LABELS[props.config.frequency] || (props.config.frequency ? props.config.frequency.replace(/_/g, ' ') : '—'))

const STATES = [
  { key: 'compliant', match: 'COMPLIANT', label: 'Compliant' },
  { key: 'due', match: 'DUE', label: 'Due' },
  { key: 'overdue', match: 'OVERDUE', label: 'Overdue' },
  { key: 'never', match: 'NEVER', label: 'Never' },
]
const hasRoster = computed(() => Array.isArray(props.roster) && props.roster.length > 0)
const counts = computed(() => {
  if (hasRoster.value) {
    const c = { COMPLIANT: 0, DUE: 0, OVERDUE: 0, NEVER: 0 }
    for (const r of props.roster) c[r.state || 'NEVER'] = (c[r.state || 'NEVER'] || 0) + 1
    return c
  }
  const el = props.config.eligible_count || 0
  const co = props.config.compliant_count || 0
  return { COMPLIANT: co, DUE: 0, OVERDUE: props.config.overdue_count ?? Math.max(el - co, 0), NEVER: 0 }
})
const total = computed(() => (hasRoster.value ? props.roster.length : (props.config.eligible_count || 0)))
const segments = computed(() => {
  const t = total.value || 1
  return STATES.map(s => ({ key: s.key, pct: (counts.value[s.match] / t) * 100 })).filter(s => s.pct > 0)
})
const legend = computed(() => STATES.map(s => ({ key: s.key, label: s.label, count: counts.value[s.match] || 0 })))

const donutPct = computed(() => (total.value ? Math.round((counts.value.COMPLIANT / total.value) * 100) : (props.config.completion_rate || 0)))
const donutColor = computed(() => {
  const p = donutPct.value
  if (p >= 80) return 'var(--trn-st-completed)'
  if (p >= 50) return 'var(--trn-st-in-progress)'
  return 'var(--trn-st-failed)'
})

const STATE_LABELS = { COMPLIANT: 'Compliant', DUE: 'Due', OVERDUE: 'Overdue', NEVER: 'Never' }
const stateLabel = (s) => STATE_LABELS[s] || 'Never'
const fmtDate = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const ready = ref(false)
onMounted(async () => { await nextTick(); requestAnimationFrame(() => requestAnimationFrame(() => { ready.value = true })) })
</script>

<style scoped>
.cmc { position: relative; overflow: hidden; isolation: isolate; padding: 18px; border-radius: 20px; border: 1px solid var(--trn-border-soft);
  background: var(--trn-surf-card); box-shadow: var(--trn-card-shadow); display: flex; flex-direction: column; gap: 14px;
  transition: transform 0.3s var(--trn-spring), box-shadow 0.3s var(--trn-spring), border-color 0.3s; }
.cmc:hover { transform: translateY(-3px); box-shadow: var(--trn-card-shadow-hover); border-color: color-mix(in srgb, var(--trn-amber) 30%, transparent); }
.cmc > *:not(.cmc-rail):not(.cmc-sheen) { position: relative; z-index: 1; }
.cmc.paused { opacity: 0.92; }
.cmc.paused::before { content: ''; position: absolute; inset: 0; z-index: 0;
  background: repeating-linear-gradient(45deg, transparent, transparent 9px, color-mix(in srgb, var(--trn-st-not-started) 5%, transparent) 9px, color-mix(in srgb, var(--trn-st-not-started) 5%, transparent) 18px); }

.cmc-rail { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; z-index: 0; opacity: 0.5;
  background: linear-gradient(180deg, transparent, var(--trn-amber) 50%, transparent); transition: opacity 0.3s, width 0.3s var(--trn-spring), box-shadow 0.3s; }
.cmc:hover .cmc-rail { opacity: 1; width: 4px; box-shadow: 0 0 16px -1px var(--trn-amber); }
.cmc-sheen { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0; background-repeat: no-repeat; background-size: 250% 100%; background-position: 150% 0;
  background-image: linear-gradient(110deg, transparent 38%, color-mix(in srgb, var(--trn-amber) 12%, rgba(255,255,255,0.08)) 50%, transparent 62%); }
.cmc:hover .cmc-sheen { opacity: 1; animation: cmc-sheen 0.9s var(--trn-spring); }
@keyframes cmc-sheen { from { background-position: 150% 0; } to { background-position: -60% 0; } }

.cmc-head { display: flex; align-items: center; gap: 15px; }
.cmc-orbit { position: relative; flex-shrink: 0; display: grid; place-items: center; width: 74px; height: 74px; }
.cmc-orbit-glow { position: absolute; inset: 8px; border-radius: 50%; background: radial-gradient(circle, var(--trn-dome-glow), transparent 70%); animation: trn-core-breathe 5s ease-in-out infinite; }
.cmc-orbit :deep(.trn-orbit-meter) { position: relative; z-index: 1; }
.cmc-titles { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
.cmc-titles h3 { margin: 0; font-size: 15.5px; font-weight: 750; color: var(--trn-text); line-height: 1.3; }
.cmc-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.cmc-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 600; padding: 2px 9px; border-radius: 999px;
  color: var(--trn-text-muted); background: var(--trn-surface); border: 1px solid var(--trn-border-soft); white-space: nowrap; }
.cmc-chip.freq { color: var(--trn-amber-strong); background: color-mix(in srgb, var(--trn-amber) 12%, transparent); border-color: color-mix(in srgb, var(--trn-amber) 28%, transparent); }
.cmc-chip.auto { color: var(--trn-st-completed); background: var(--trn-st-completed-soft); border-color: transparent; }
.cmc-chip.manual { color: var(--trn-text-dim); }
.cmc-chip.off { color: var(--trn-st-not-started); }

.cmc-spectrum { display: flex; flex-direction: column; gap: 8px; }
.cmc-bar { position: relative; display: flex; height: 13px; border-radius: 999px; overflow: hidden;
  background: var(--trn-surface-elevated); box-shadow: inset 0 1px 3px rgba(0,0,0,0.22); }
.cmc-seg { position: relative; overflow: hidden; height: 100%; transition: width 1s var(--trn-spring); }
.cmc-seg:not(:last-child) { box-shadow: inset -1.5px 0 0 var(--trn-canvas); }
.cmc-seg.compliant { background: linear-gradient(180deg, color-mix(in srgb, var(--trn-st-completed) 86%, #fff), var(--trn-st-completed)); }
.cmc-seg.due { background: linear-gradient(180deg, color-mix(in srgb, var(--trn-st-in-progress) 86%, #fff), var(--trn-st-in-progress)); }
.cmc-seg.overdue { background: linear-gradient(180deg, color-mix(in srgb, var(--trn-st-failed) 86%, #fff), var(--trn-st-failed)); }
.cmc-seg.never { background: linear-gradient(180deg, color-mix(in srgb, var(--trn-st-not-started) 70%, #fff), var(--trn-st-not-started)); }
.cmc-seg::after { content: ''; position: absolute; inset: 0; background: linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.4) 50%, transparent 80%);
  background-size: 220% 100%; animation: trn-sheen 3s linear infinite; }
.cmc-bar-empty { position: absolute; inset: 0; display: grid; place-items: center; font-size: 10px; color: var(--trn-text-dim); }
.cmc-legend { display: flex; flex-wrap: wrap; gap: 10px; }
.cmc-leg { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--trn-text-muted); }
.cmc-leg i { width: 8px; height: 8px; border-radius: 3px; }
.cmc-leg.compliant i { background: var(--trn-st-completed); }
.cmc-leg.due i { background: var(--trn-st-in-progress); }
.cmc-leg.overdue i { background: var(--trn-st-failed); }
.cmc-leg.never i { background: var(--trn-st-not-started); }
.cmc-leg b { color: var(--trn-text); }

.cmc-meta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 11px; color: var(--trn-text-muted); }
.cmc-meta span { display: inline-flex; align-items: center; gap: 4px; }
.cmc-meta :deep(svg) { color: var(--trn-text-dim); flex-shrink: 0; }

.cmc-foot { display: flex; flex-wrap: wrap; gap: 6px; border-top: 1px solid var(--trn-border-soft); padding-top: 12px; }
.cmc-act { display: inline-flex; align-items: center; gap: 5px; font: inherit; font-size: 12px; font-weight: 600; padding: 6px 11px; border-radius: 9px;
  border: 1px solid var(--trn-border-soft); background: var(--trn-surface); color: var(--trn-text-secondary); cursor: pointer; transition: color 0.2s, background 0.2s, border-color 0.2s; }
.cmc-act:hover:not(:disabled) { color: var(--trn-text); background: var(--trn-surface-elevated); }
.cmc-act:disabled { opacity: 0.5; cursor: not-allowed; }
.cmc-act.sweep:hover:not(:disabled) { color: var(--trn-amber-strong); border-color: color-mix(in srgb, var(--trn-amber) 38%, transparent); }
.cmc-act.active { color: var(--trn-amber); border-color: color-mix(in srgb, var(--trn-amber) 38%, transparent); background: color-mix(in srgb, var(--trn-amber) 12%, transparent); }
.cmc-act.danger { margin-left: auto; color: var(--trn-st-failed); }
.cmc-act.danger:hover { background: var(--trn-st-failed-soft); border-color: color-mix(in srgb, var(--trn-st-failed) 34%, transparent); }

.cmc-roster { overflow: hidden; }
.cmc-roster-inner { padding-top: 12px; }
.cmc-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.cmc-table th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--trn-text-dim); font-weight: 600; padding: 6px 8px; border-bottom: 1px solid var(--trn-border-soft); }
.cmc-table td { padding: 9px 8px; border-bottom: 1px solid var(--trn-border-soft); color: var(--trn-text-secondary); vertical-align: middle; }
.cmc-table tr:last-child td { border-bottom: none; }
.cmc-emp { display: block; font-weight: 600; color: var(--trn-text); }
.cmc-emp-code { display: block; font-size: 10.5px; color: var(--trn-text-dim); }
.cmc-pill { display: inline-flex; align-items: center; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 3px 9px; border-radius: 999px; font-family: var(--trn-mono); }
.cmc-pill[data-state="COMPLIANT"] { color: var(--trn-st-completed); background: var(--trn-st-completed-soft); }
.cmc-pill[data-state="DUE"]       { color: var(--trn-st-in-progress); background: var(--trn-st-in-progress-soft); }
.cmc-pill[data-state="OVERDUE"]   { color: var(--trn-st-failed); background: var(--trn-st-failed-soft); }
.cmc-pill[data-state="NEVER"]     { color: var(--trn-st-not-started); background: var(--trn-st-not-started-soft); }
.cmc-roster-link { display: inline-flex; align-items: center; gap: 5px; margin-top: 10px; font: inherit; font-size: 11.5px; font-weight: 600;
  border: 0; background: transparent; color: var(--trn-amber-strong); cursor: pointer; }
.cmc-roster-link:hover { text-decoration: underline; }

.spin { animation: trn-orbit-spin 0.9s linear infinite; }

@media (prefers-reduced-motion: reduce) {
  .cmc, .cmc-seg { transition: none; }
  .cmc-sheen, .cmc-seg::after, .cmc-orbit-glow { animation: none; }
}
</style>
