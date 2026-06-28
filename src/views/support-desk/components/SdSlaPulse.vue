<template>
  <div class="sd-pulse">
    <!-- Top: gauge + three state cards -->
    <div class="pl-top">
      <div class="pl-gauge sd-card" :style="{ '--p': compliancePct + '%' }">
        <div class="gauge-ring">
          <span class="gauge-val">{{ compliancePct }}<i>%</i></span>
          <span class="gauge-cap">SLA compliance</span>
        </div>
        <span class="gauge-foot">{{ withinCount }} of {{ clockCount }} clocks healthy</span>
      </div>

      <div class="pl-states">
        <button
          v-for="s in states"
          :key="s.key"
          class="pl-state sd-card"
          :class="s.key"
          :style="{ '--ac': s.color }"
          @click="filter = filter === s.key ? null : s.key"
          :data-on="filter === s.key"
        >
          <span class="ps-ico"><component :is="s.icon" :size="18" /></span>
          <span class="ps-val">{{ s.value }}</span>
          <span class="ps-label">{{ s.label }}</span>
          <span class="ps-bar"><i :style="{ width: barPct(s.value) + '%' }" /></span>
        </button>
      </div>
    </div>

    <!-- Live countdown table -->
    <section class="sd-card pl-table">
      <header class="pl-thead">
        <h3><Activity :size="15" /> SLA countdown — at-risk tickets</h3>
        <span class="pl-live"><i /> live</span>
      </header>

      <div v-if="rows.length" class="pl-rows">
        <div class="pl-row pl-row--head">
          <span>Ticket</span><span>Customer</span><span>Agent</span><span class="ta-r">Remaining</span>
        </div>
        <button
          v-for="t in rows"
          :key="t.id"
          class="pl-row"
          :class="{ over: rstate(t) === 'over', soon: rstate(t) === 'soon' }"
          @click="$emit('open', t.id)"
        >
          <span class="pr-tk">
            <b class="sd-mono">{{ t.ticket_number }}</b>
            <small>{{ t.subject }}</small>
          </span>
          <span class="pr-cust">{{ t.organization_name || t.contact_name || 'Internal' }}</span>
          <span class="pr-ag">{{ t.assigned_agent_name || 'Unassigned' }}</span>
          <span class="pr-rem ta-r" :class="rstate(t)">
            <Timer :size="12" />{{ remain(t) }}
          </span>
        </button>
      </div>
      <p v-else class="pl-empty">{{ loading ? 'Reading SLA clocks…' : 'No tickets are approaching or past their SLA. The basin is calm.' }}</p>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Activity, Timer, ShieldCheck, AlarmClock, Siren } from 'lucide-vue-next'

const props = defineProps({
  tickets: { type: Array, default: () => [] },
  now: { type: Number, default: () => Date.now() },
  loading: { type: Boolean, default: false },
})
defineEmits(['open'])

const filter = ref(null)

const active = computed(() => props.tickets.filter(t => !['closed', 'resolved'].includes(t.status)))
const dueMs = (t) => { const d = t.resolution_due_at || t.response_due_at; return d ? new Date(d).getTime() : null }
const hasClock = (t) => dueMs(t) != null
const isBreached = (t) => t.sla_resolution_breached || t.sla_resolution_state === 'breached' || (dueMs(t) != null && props.now > dueMs(t))
const isSoon = (t) => !isBreached(t) && hasClock(t) && (t.sla_resolution_state === 'due-soon' || (dueMs(t) - props.now) < 7200000)

const clockCount = computed(() => active.value.filter(hasClock).length)
const breachedCount = computed(() => active.value.filter(isBreached).length)
const soonCount = computed(() => active.value.filter(isSoon).length)
const withinCount = computed(() => clockCount.value - breachedCount.value - soonCount.value)
const compliancePct = computed(() => clockCount.value ? Math.round((withinCount.value / clockCount.value) * 100) : 100)

const states = computed(() => [
  { key: 'within', label: 'Within SLA', value: withinCount.value, color: 'var(--sd-success)', icon: ShieldCheck },
  { key: 'soon', label: 'Approaching breach', value: soonCount.value, color: 'var(--sd-warning)', icon: AlarmClock },
  { key: 'over', label: 'Breached', value: breachedCount.value, color: 'var(--sd-danger)', icon: Siren },
])
const maxState = computed(() => Math.max(1, withinCount.value, soonCount.value, breachedCount.value))
const barPct = (v) => Math.round((v / maxState.value) * 100)

const rstate = (t) => isBreached(t) ? 'over' : isSoon(t) ? 'soon' : 'ok'
const rows = computed(() => {
  let r = active.value.filter(t => hasClock(t) && (isBreached(t) || isSoon(t)))
  if (filter.value === 'within') r = active.value.filter(t => hasClock(t) && rstate(t) === 'ok')
  else if (filter.value === 'soon') r = active.value.filter(t => isSoon(t))
  else if (filter.value === 'over') r = active.value.filter(t => isBreached(t))
  return [...r].sort((a, b) => (dueMs(a) - props.now) - (dueMs(b) - props.now)).slice(0, 60)
})

const remain = (t) => {
  const d = dueMs(t); if (d == null) return '—'
  const ms = d - props.now, abs = Math.abs(ms)
  const m = Math.floor(abs / 60000)
  const lbl = m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h`
  return ms < 0 ? `${lbl} over` : lbl
}
</script>

<style scoped>
.sd-pulse { display: flex; flex-direction: column; gap: 16px; }
.pl-top { display: grid; grid-template-columns: 220px 1fr; gap: 16px; }

.pl-gauge { padding: 18px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.gauge-ring {
  position: relative; width: 132px; height: 132px; border-radius: 50%; display: grid; place-items: center; text-align: center;
  background:
    radial-gradient(closest-side, var(--sd-surface) 76%, transparent 77%),
    conic-gradient(var(--sd-success) calc(var(--p)), color-mix(in srgb, var(--sd-text-dim) 24%, transparent) 0);
}
.gauge-ring::after { content: ""; position: absolute; inset: 9px; border-radius: 50%; box-shadow: inset 0 0 22px var(--sd-success-soft); }
.gauge-val { font-size: 30px; font-weight: 800; color: var(--sd-text); letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
.gauge-val i { font-size: 15px; font-style: normal; color: var(--sd-text-muted); }
.gauge-cap { font-size: 10px; color: var(--sd-text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
.gauge-foot { font-size: 11px; color: var(--sd-text-dim); text-align: center; }

.pl-states { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.pl-state {
  position: relative; padding: 16px; display: flex; flex-direction: column; gap: 5px; text-align: left; cursor: pointer;
  transition: transform 0.2s var(--sd-spring), border-color 0.2s; overflow: hidden;
}
.pl-state:hover { transform: translateY(-3px); }
.pl-state[data-on="true"] { border-color: var(--ac); box-shadow: 0 0 0 1px var(--ac); }
.ps-ico { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; color: var(--ac); background: color-mix(in srgb, var(--ac) 14%, transparent); }
.ps-val { font-size: 30px; font-weight: 800; color: var(--sd-text); letter-spacing: -0.02em; font-variant-numeric: tabular-nums; margin-top: 6px; }
.ps-label { font-size: 12px; color: var(--sd-text-muted); }
.ps-bar { margin-top: 8px; height: 4px; border-radius: 999px; background: var(--sd-surface-glass); overflow: hidden; }
.ps-bar i { display: block; height: 100%; border-radius: 999px; background: var(--ac); box-shadow: 0 0 8px var(--ac); transition: width 0.6s var(--sd-spring); }
.pl-state.over { animation: none; }

.pl-table { padding: 16px 18px; }
.pl-thead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.pl-thead h3 { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: var(--sd-text); margin: 0; }
.pl-live { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--sd-danger); }
.pl-live i { width: 7px; height: 7px; border-radius: 50%; background: var(--sd-danger); animation: sd-pulse-ring 1.6s ease-in-out infinite; }

.pl-rows { display: flex; flex-direction: column; }
.pl-row {
  display: grid; grid-template-columns: 1fr 150px 130px 110px; align-items: center; gap: 12px;
  padding: 11px 12px; border-radius: 11px; text-align: left; cursor: pointer; background: transparent; border: 1px solid transparent;
  transition: background 0.16s, border-color 0.16s;
}
.pl-row:not(.pl-row--head):hover { background: var(--sd-surface-glass); border-color: var(--sd-border); }
.pl-row--head { cursor: default; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--sd-text-dim); padding-bottom: 6px; }
.pl-row.over { background: var(--sd-danger-soft); }
.pr-tk { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.pr-tk b { font-size: 12px; color: var(--sd-amber); }
.pr-tk small { font-size: 12.5px; color: var(--sd-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pr-cust, .pr-ag { font-size: 12px; color: var(--sd-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ta-r { text-align: right; justify-self: end; }
.pr-rem { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 700; color: var(--sd-text-secondary); font-variant-numeric: tabular-nums; }
.pr-rem.soon { color: var(--sd-warning); }
.pr-rem.over { color: var(--sd-danger); }
.pl-empty { text-align: center; color: var(--sd-text-dim); font-size: 13px; padding: 28px; margin: 0; }

@media (max-width: 760px) {
  .pl-top { grid-template-columns: 1fr; }
  .pl-states { grid-template-columns: 1fr; }
  .pl-row { grid-template-columns: 1fr 90px; }
  .pr-cust, .pr-ag { display: none; }
}
@media (prefers-reduced-motion: reduce) { .pl-live i { animation: none; } }
</style>
