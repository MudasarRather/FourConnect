<template>
  <!-- Squad Board — the team command center's signature view. Swimlane columns grouped by
       agent | status | priority | sla. Agent + status columns accept drops (drag-to-assign /
       drag-to-status); priority + sla are read-only triage lenses. Click a card → drawer. -->
  <div class="sqb" :class="'by-' + groupBy">
    <div v-for="col in columns" :key="col.key" class="sqb-col" :class="{ drop: dropKey === col.key && col.accept, triage: col.triage }"
      @dragover="onOver($event, col)" @dragleave="onLeave(col)" @drop="onDrop($event, col)">
      <div class="sqb-colhead">
        <span class="ch-dot" :style="{ background: col.color }" />
        <span class="ch-label" :title="col.label">{{ col.label }}</span>
        <span class="ch-n sd-mono">{{ col.items.length }}</span>
      </div>
      <div class="sqb-stack">
        <article v-for="t in col.items" :key="t.id" class="sqc" :class="{ crit: t.priority === 'critical', dragging: draggingId === String(t.id) }"
          :draggable="canDrag" @dragstart="onDragStart($event, t)" @dragend="draggingId = null" @click="emit('open', t.id)">
          <span class="sqc-spine" :style="{ background: pc(t.priority) }" />
          <div class="sqc-top">
            <span class="sqc-no sd-mono">{{ t.ticket_number }}</span>
            <span class="sqc-sla" :class="slaOf(t).cls">{{ slaOf(t).label }}</span>
          </div>
          <p class="sqc-sub">{{ t.subject }}</p>
          <div class="sqc-foot">
            <span class="sqc-pri" :style="{ color: pc(t.priority) }">{{ cap(t.priority) }}</span>
            <span v-if="t.is_escalated" class="sqc-esc"><Flame :size="11" /></span>
            <span class="sqc-ava" :title="t.assigned_agent_name || 'Unassigned'">{{ t.assigned_agent_name ? ini(t.assigned_agent_name) : '—' }}</span>
          </div>
        </article>
        <div v-if="!col.items.length" class="sqb-empty">{{ col.triage ? 'Triage clear' : 'Empty' }}</div>
      </div>
    </div>
    <div v-if="capped" class="sqb-capnote">Showing the first {{ tickets.length }} — refine filters to see more.</div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Flame } from 'lucide-vue-next'
import { priorityColor, statusColor, statusLabel } from '@/composables/useSupportDesk'

const props = defineProps({
  tickets: { type: Array, default: () => [] },
  groupBy: { type: String, default: 'agent' },   // agent | status | priority | sla
  squad: { type: Array, default: () => [] },
  now: { type: Number, default: () => Date.now() },
  capped: { type: Boolean, default: false },
})
const emit = defineEmits(['open', 'assign', 'move'])

const pc = (p) => priorityColor(p)
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')
const ini = (n) => (n || '').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()

const canDrag = computed(() => props.groupBy === 'agent' || props.groupBy === 'status')

const STATUS_COLS = ['open', 'in_progress', 'pending_customer', 'pending_vendor', 'on_hold', 'escalated', 'resolved']
const PRI_COLS = ['critical', 'urgent', 'high', 'medium', 'low']
const active = (t) => !['resolved', 'closed'].includes(t.status)

const dueMs = (t) => { const d = t.resolution_due_at || t.response_due_at; return d ? new Date(d).getTime() : null }
const slaOf = (t) => {
  if (t.sla_resolution_breached) return { cls: 'breach', label: 'Breached' }
  const dm = dueMs(t)
  if (dm == null || !active(t)) return { cls: '', label: '' }
  const ms = dm - props.now
  if (ms <= 0) return { cls: 'breach', label: 'Overdue' }
  const h = ms / 3600000
  const label = h < 1 ? `${Math.max(1, Math.round(h * 60))}m` : h < 48 ? `${Math.round(h)}h` : `${Math.round(h / 24)}d`
  return { cls: ms < 7200000 ? 'soon' : 'ok', label }
}

const columns = computed(() => {
  const ts = props.tickets || []
  if (props.groupBy === 'status') {
    return STATUS_COLS.map(s => ({ key: s, label: statusLabel(s), color: statusColor(s), accept: true, items: ts.filter(t => t.status === s) }))
  }
  if (props.groupBy === 'priority') {
    return PRI_COLS.map(p => ({ key: p, label: cap(p), color: priorityColor(p), accept: false, items: ts.filter(t => t.priority === p) }))
  }
  if (props.groupBy === 'sla') {
    const breach = ts.filter(t => slaOf(t).cls === 'breach')
    const soon = ts.filter(t => slaOf(t).cls === 'soon')
    const ok = ts.filter(t => slaOf(t).cls === 'ok')
    const none = ts.filter(t => !slaOf(t).cls)
    return [
      { key: 'breach', label: 'Breached / Overdue', color: 'var(--sd-danger)', accept: false, items: breach },
      { key: 'soon', label: 'Due soon', color: 'var(--sd-warning)', accept: false, items: soon },
      { key: 'ok', label: 'On track', color: 'var(--sd-success)', accept: false, items: ok },
      { key: 'none', label: 'No SLA', color: 'var(--sd-text-dim)', accept: false, items: none },
    ]
  }
  // agent
  const map = new Map()
  const ensure = (key, label, agentId, triage = false) => {
    if (!map.has(key)) map.set(key, { key, label, agentId, accept: true, triage, color: triage ? 'var(--sd-amber-strong)' : 'var(--sd-st-progress)', items: [] })
    return map.get(key)
  }
  ensure('__triage', 'Unassigned · Triage', null, true)
  for (const s of props.squad) ensure(String(s.agent_id), s.name || 'Agent', String(s.agent_id))
  for (const t of ts) {
    if (t.assigned_agent_id) ensure(String(t.assigned_agent_id), t.assigned_agent_name || 'Agent', String(t.assigned_agent_id)).items.push(t)
    else ensure('__triage', 'Unassigned · Triage', null, true).items.push(t)
  }
  return [...map.values()].sort((a, b) => (a.triage ? -1 : b.triage ? 1 : b.items.length - a.items.length))
})

/* drag-and-drop */
const draggingId = ref(null)
const dropKey = ref(null)
const onDragStart = (e, t) => { if (!canDrag.value) return; draggingId.value = String(t.id); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(t.id)) } catch { /* ie */ } }
const onOver = (e, col) => { if (col.accept && draggingId.value) { e.preventDefault(); dropKey.value = col.key } }
const onLeave = (col) => { if (dropKey.value === col.key) dropKey.value = null }
const onDrop = (e, col) => {
  if (!col.accept || !draggingId.value) return
  e.preventDefault()
  const id = draggingId.value
  if (props.groupBy === 'agent') emit('assign', { id, agentId: col.agentId })
  else if (props.groupBy === 'status') emit('move', { id, status: col.key })
  draggingId.value = null; dropKey.value = null
}
</script>

<style scoped>
.sqb { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(244px, 1fr); gap: 12px; overflow-x: auto; padding-bottom: 6px; align-items: start; }
.sqb-col { display: flex; flex-direction: column; gap: 9px; min-height: 120px; padding: 11px; border-radius: 15px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); transition: border-color 0.18s, background 0.18s; }
.sqb-col.triage { background: var(--sd-amber-soft); border-color: var(--sd-amber-border); }
.sqb-col.drop { border-color: var(--sd-amber); background: color-mix(in srgb, var(--sd-amber) 12%, var(--sd-surface-glass)); }
.sqb-colhead { display: flex; align-items: center; gap: 8px; padding: 2px 4px; }
.ch-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.ch-label { font-size: 12.5px; font-weight: 700; color: var(--sd-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.ch-n { font-size: 11px; font-weight: 800; color: var(--sd-text-muted); padding: 2px 7px; border-radius: 999px; background: var(--sd-surface-elevated); }
.sqb-stack { display: flex; flex-direction: column; gap: 8px; }
.sqc { position: relative; overflow: hidden; padding: 10px 12px 10px 15px; border-radius: 12px; cursor: pointer; background: var(--sd-surface); border: 1px solid var(--sd-border-strong); transition: transform 0.14s var(--sd-spring), border-color 0.14s, box-shadow 0.14s; }
.sqc:hover { transform: translateY(-2px); border-color: var(--sd-amber-border); box-shadow: 0 10px 24px rgba(0,0,0,0.22); }
.sqc.dragging { opacity: 0.4; }
.sqc[draggable="true"] { cursor: grab; }
.sqc[draggable="true"]:active { cursor: grabbing; }
.sqc-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; }
.sqc.crit .sqc-spine { animation: sqc-pulse 2s ease-in-out infinite; }
.sqc-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.sqc-no { font-size: 10px; font-weight: 700; color: var(--sd-amber); }
.sqc-sla { font-size: 9.5px; font-weight: 800; font-family: var(--sd-mono); padding: 2px 6px; border-radius: 6px; }
.sqc-sla.ok { color: var(--sd-success); background: color-mix(in srgb, var(--sd-success) 14%, transparent); }
.sqc-sla.soon { color: var(--sd-warning); background: color-mix(in srgb, var(--sd-warning) 16%, transparent); }
.sqc-sla.breach { color: var(--sd-danger); background: color-mix(in srgb, var(--sd-danger) 16%, transparent); }
.sqc-sub { font-size: 12.5px; line-height: 1.4; color: var(--sd-text); margin: 6px 0 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.sqc-foot { display: flex; align-items: center; gap: 8px; }
.sqc-pri { font-size: 10.5px; font-weight: 700; }
.sqc-esc { display: inline-grid; place-items: center; color: var(--sd-st-escalated); }
.sqc-ava { margin-left: auto; display: grid; place-items: center; min-width: 24px; height: 24px; padding: 0 6px; border-radius: 7px; font-size: 9.5px; font-weight: 800; color: var(--sd-text-secondary); background: var(--sd-surface-elevated); }
.sqb-empty { font-size: 11px; color: var(--sd-text-dim); text-align: center; padding: 12px 0; }
.sqb-capnote { grid-column: 1 / -1; font-size: 11px; color: var(--sd-text-dim); padding: 4px; }
@keyframes sqc-pulse { 0%, 100% { box-shadow: 0 0 6px 0 var(--sd-pri-critical); } 50% { box-shadow: 0 0 12px 1px var(--sd-pri-critical); } }
@media (prefers-reduced-motion: reduce) { html:not([data-cinematic="on"]) .sqc.crit .sqc-spine { animation: none; } }
</style>
