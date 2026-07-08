<template>
  <!-- Final calls — the desk's next resolution deadlines, counting down live.
       Under an hour reads FINAL CALL; past due flips to DELAYED. Click boards
       the ticket (opens the drawer). -->
  <div class="sd-iar">
    <button v-for="(r, i) in items" :key="r.id" type="button" class="iar-row" :class="cls(r)"
      :style="{ '--i': i }" @click="$emit('open', r.id)">
      <span class="cd sd-mono" :class="cls(r)">{{ countdown(r) }}</span>
      <span class="body">
        <span class="l1">
          <b class="no sd-mono">{{ r.ticket_number }}</b>
          <span class="subj">{{ r.subject }}</span>
        </span>
        <span class="l2 sd-mono">
          {{ r.team_name || 'UNROUTED' }} · {{ r.assignee_name || (r.unassigned ? 'UNASSIGNED' : '—') }}
        </span>
      </span>
      <SdPill kind="priority" :value="r.priority" />
      <span class="call sd-mono" :class="cls(r)">{{ callOf(r) }}</span>
    </button>
    <p v-if="!items.length" class="iar-empty">{{ loading ? 'Checking the departure sheets…' : 'No deadlines at risk — the hall is calm.' }}</p>
  </div>
</template>

<script setup>
import SdPill from './SdPill.vue'

const props = defineProps({
  items: { type: Array, default: () => [] },   // IntelAtRiskItem[]
  now: { type: Number, default: () => Date.now() },
  loading: { type: Boolean, default: false },
})
defineEmits(['open'])

const minsLeft = (r) => {
  if (!r.due_at) return r.minutes_left
  return Math.floor((new Date(r.due_at).getTime() - props.now) / 60000)
}
const cls = (r) => {
  const m = minsLeft(r)
  if (r.breached || (m != null && m < 0)) return 'blown'
  if (m != null && m <= 60) return 'final'
  return 'due'
}
const callOf = (r) => ({ blown: 'DELAYED', final: 'FINAL CALL', due: 'BOARDING' })[cls(r)]
const countdown = (r) => {
  const m = minsLeft(r)
  if (m == null) return '—'
  const a = Math.abs(m); const sign = m < 0 ? '−' : ''
  if (a < 60) return `${sign}${a}m`
  if (a < 2880) return `${sign}${Math.floor(a / 60)}h ${String(a % 60).padStart(2, '0')}m`
  return `${sign}${Math.floor(a / 1440)}d ${Math.floor((a % 1440) / 60)}h`
}
</script>

<style scoped>
.sd-iar { display: flex; flex-direction: column; gap: 6px; }
.iar-row { display: grid; grid-template-columns: 92px 1fr auto 92px; align-items: center; gap: 12px;
  width: 100%; padding: 9px 12px; border-radius: 12px; border: 1px solid var(--sd-border); background: transparent;
  cursor: pointer; text-align: left; transition: background 0.16s, border-color 0.16s;
  animation: sd-stream-in 0.5s var(--sd-spring) backwards; animation-delay: calc(var(--i) * 0.05s); }
.iar-row:hover { background: var(--sd-surface-glass); border-color: var(--sd-border-strong); }
.iar-row.blown { border-color: color-mix(in srgb, var(--intel-dn) 40%, transparent); background: color-mix(in srgb, var(--intel-dn) 5%, transparent); }
.iar-row.final { border-color: color-mix(in srgb, var(--intel) 40%, transparent); }

.cd { font-size: 15px; font-weight: 800; letter-spacing: 0.02em; font-variant-numeric: tabular-nums; }
.cd.due { color: var(--sd-text); } .cd.final { color: var(--intel); } .cd.blown { color: var(--intel-dn); }

.body { display: flex; flex-direction: column; gap: 2px; overflow: hidden; }
.l1 { display: flex; align-items: baseline; gap: 8px; overflow: hidden; }
.no { font-size: 11.5px; font-weight: 700; color: var(--intel); flex: none; }
.subj { font-size: 13px; color: var(--sd-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.l2 { font-size: 9.5px; letter-spacing: 0.1em; color: var(--sd-text-dim); text-transform: uppercase; }

.call { font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-align: right; }
.call.due { color: var(--intel-up); }
.call.final { color: var(--intel); animation: sd-iar-blink 1.25s steps(2, jump-none) infinite; }
.call.blown { color: var(--intel-dn); animation: sd-iar-blink 1.25s steps(2, jump-none) infinite; }
@keyframes sd-iar-blink { 50% { opacity: 0.35; } }

.iar-empty { text-align: center; color: var(--sd-text-dim); font-size: 12.5px; padding: 16px; margin: 0; }

@media (max-width: 640px) {
  .iar-row { grid-template-columns: 76px 1fr 78px; }
  .iar-row :deep(.sd-pill) { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .iar-row { animation: none; }
  html:not([data-cinematic="on"]) .call.final, html:not([data-cinematic="on"]) .call.blown { animation: none; }
}
</style>
