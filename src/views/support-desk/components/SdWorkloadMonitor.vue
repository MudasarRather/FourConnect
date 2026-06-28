<template>
  <div class="sd-load">
    <header class="ld-head">
      <div class="ld-legend">
        <span class="lg"><i class="d balanced" /> Balanced ≤ {{ BUSY }}</span>
        <span class="lg"><i class="d busy" /> Busy {{ BUSY + 1 }}–{{ OVER }}</span>
        <span class="lg"><i class="d over" /> Overloaded &gt; {{ OVER }}</span>
      </div>
      <span class="ld-sum">{{ agents.length }} agents · {{ totalActive }} active tickets</span>
    </header>

    <div v-if="agents.length" class="ld-grid">
      <article
        v-for="(a, i) in agents"
        :key="a.id"
        class="ld-card sd-card"
        :class="a.tone"
        :style="{ '--tc': toneColor(a.tone), '--i': i }"
      >
        <div class="ld-card-top">
          <span class="ld-avatar">{{ a.initials }}</span>
          <div class="ld-id">
            <span class="ld-name">{{ a.name }}</span>
            <span class="ld-state" :class="a.tone">{{ toneLabel(a.tone) }}</span>
          </div>
          <span class="ld-total">{{ a.assigned }}</span>
        </div>

        <div class="ld-meter"><i :style="{ width: meterPct(a.assigned) + '%' }" /></div>

        <div class="ld-stats">
          <div class="ls"><b>{{ a.in_progress }}</b><span>In progress</span></div>
          <div class="ls"><b>{{ a.pending }}</b><span>Pending</span></div>
          <div class="ls"><b class="ok">{{ a.resolved_today }}</b><span>Resolved today</span></div>
        </div>
      </article>
    </div>
    <p v-else class="ld-empty">{{ loading ? 'Computing workload…' : 'No assigned tickets to balance.' }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  tickets: { type: Array, default: () => [] },
  now: { type: Number, default: () => Date.now() },
  loading: { type: Boolean, default: false },
})

const BUSY = 4   // ≤ balanced
const OVER = 8   // > overloaded
const ACTIVE_ST = ['open', 'in_progress', 'pending_customer', 'pending_vendor', 'escalated']

const startOfToday = computed(() => { const d = new Date(props.now); d.setHours(0, 0, 0, 0); return d.getTime() })

const agents = computed(() => {
  const map = new Map()
  const key = (t) => t.assigned_agent_id || (t.assigned_agent_name ? 't:' + t.assigned_agent_name : '__unassigned__')
  for (const t of props.tickets) {
    const k = key(t)
    if (!map.has(k)) map.set(k, { id: k, name: t.assigned_agent_name || 'Unassigned', assigned: 0, in_progress: 0, pending: 0, resolved_today: 0 })
    const a = map.get(k)
    const isActive = ACTIVE_ST.includes(t.status)
    if (isActive) a.assigned++
    if (t.status === 'in_progress') a.in_progress++
    if (t.status === 'pending_customer' || t.status === 'pending_vendor') a.pending++
    if (t.status === 'resolved' && t.resolved_at && new Date(t.resolved_at).getTime() >= startOfToday.value) a.resolved_today++
  }
  return [...map.values()]
    .filter(a => a.assigned > 0 || a.resolved_today > 0)
    .map(a => ({
      ...a,
      initials: a.name === 'Unassigned' ? '—' : a.name.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase(),
      tone: a.name === 'Unassigned' ? 'idle' : a.assigned <= BUSY ? 'balanced' : a.assigned <= OVER ? 'busy' : 'over',
    }))
    .sort((a, b) => b.assigned - a.assigned)
})

const totalActive = computed(() => agents.value.reduce((s, a) => s + a.assigned, 0))
const maxLoad = computed(() => Math.max(OVER + 2, ...agents.value.map(a => a.assigned)))
const meterPct = (v) => Math.round((v / maxLoad.value) * 100)

const toneColor = (t) => ({ balanced: 'var(--sd-success)', busy: 'var(--sd-warning)', over: 'var(--sd-danger)', idle: 'var(--sd-steel)' }[t])
const toneLabel = (t) => ({ balanced: 'Balanced', busy: 'Busy', over: 'Overloaded', idle: 'Queue' }[t])
</script>

<style scoped>
.sd-load { display: flex; flex-direction: column; gap: 14px; }
.ld-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
.ld-legend { display: flex; flex-wrap: wrap; gap: 14px; }
.lg { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--sd-text-muted); }
.lg .d { width: 9px; height: 9px; border-radius: 50%; }
.d.balanced { background: var(--sd-success); box-shadow: 0 0 7px var(--sd-success); }
.d.busy { background: var(--sd-warning); box-shadow: 0 0 7px var(--sd-warning); }
.d.over { background: var(--sd-danger); box-shadow: 0 0 7px var(--sd-danger); }
.ld-sum { font-size: 12px; color: var(--sd-text-dim); font-family: var(--sd-mono); }

.ld-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(252px, 1fr)); gap: 12px; }
.ld-card { padding: 16px; display: flex; flex-direction: column; gap: 12px; animation: sd-deal 0.45s var(--sd-spring) backwards; animation-delay: calc(var(--i) * 0.04s); border-left: 3px solid var(--tc); }
.ld-card.over { box-shadow: 0 0 0 1px color-mix(in srgb, var(--sd-danger) 35%, transparent), var(--sd-card-shadow); }

.ld-card-top { display: flex; align-items: center; gap: 11px; }
.ld-avatar { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; font-size: 13px; font-weight: 800; color: #1a1206; background: var(--sd-grad-rail); flex-shrink: 0; }
[data-theme="light"] .ld-avatar { color: #fff8ec; }
.ld-card.idle .ld-avatar { background: var(--sd-surface-glass); color: var(--sd-text-dim); border: 1px solid var(--sd-border-strong); }
.ld-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.ld-name { font-size: 13.5px; font-weight: 700; color: var(--sd-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ld-state { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--tc); }
.ld-total { font-size: 26px; font-weight: 800; color: var(--sd-text); letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }

.ld-meter { height: 7px; border-radius: 999px; background: var(--sd-surface-glass); overflow: hidden; }
.ld-meter i { display: block; height: 100%; border-radius: 999px; background: var(--tc); box-shadow: 0 0 10px var(--tc); transition: width 0.6s var(--sd-spring); }

.ld-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.ls { display: flex; flex-direction: column; gap: 2px; align-items: center; padding: 9px 6px; border-radius: 10px; background: var(--sd-surface-glass); }
.ls b { font-size: 17px; font-weight: 800; color: var(--sd-text); font-variant-numeric: tabular-nums; }
.ls b.ok { color: var(--sd-success); }
.ls span { font-size: 10px; color: var(--sd-text-muted); text-align: center; }

.ld-empty { text-align: center; color: var(--sd-text-dim); font-size: 13px; padding: 30px; margin: 0; }

@media (prefers-reduced-motion: reduce) { .ld-card { animation: none; } }
</style>
