<template>
  <div class="sd-board-wrap">
    <div class="sd-board" :class="{ dragging: dragId }">
      <section
        v-for="col in columns"
        :key="col.key"
        class="bd-col"
        :class="{ over: dragOver === col.key }"
        :style="{ '--cc': col.color }"
        @dragover.prevent="dragOver = col.key"
        @dragleave="dragOver === col.key && (dragOver = null)"
        @drop="onDrop(col.key)"
      >
        <header class="bd-col-head">
          <span class="bd-col-rail" />
          <span class="bd-col-title">{{ col.label }}</span>
          <span class="bd-col-count">{{ col.items.length }}</span>
        </header>

        <div class="bd-col-body">
          <article
            v-for="t in col.items"
            :key="t.id"
            class="bd-card"
            :class="{ ghost: dragId === t.id, breached: breached(t) }"
            :style="{ '--pc': priColor(t.priority) }"
            draggable="true"
            @dragstart="onDragStart(t, $event)"
            @dragend="onDragEnd"
            @click="$emit('open', t.id)"
          >
            <span class="bd-card-spine" />
            <div class="bd-card-top">
              <span class="bd-no sd-mono">{{ t.ticket_number }}</span>
              <span class="bd-pri-dot" :title="t.priority" />
              <Flame v-if="t.is_escalated" :size="11" class="bd-esc" />
            </div>
            <p class="bd-subj">{{ t.subject }}</p>
            <div class="bd-card-foot">
              <span class="bd-cust">{{ t.organization_name || t.contact_name || 'Internal' }}</span>
              <span class="bd-sla" :class="slaTone(t)" :title="slaTitle(t)"><Timer :size="11" />{{ remain(t) }}</span>
            </div>
            <span class="bd-agent" :title="t.assigned_agent_name || 'Unassigned'">{{ initials(t.assigned_agent_name) }}</span>
          </article>

          <p v-if="!col.items.length" class="bd-col-empty">Drop here</p>
        </div>
      </section>
    </div>
    <p class="bd-hint"><Waypoints :size="13" /> Drag a card across columns to change its status. {{ capNote }}</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Flame, Timer, Waypoints } from 'lucide-vue-next'

const props = defineProps({
  tickets: { type: Array, default: () => [] },
  now: { type: Number, default: () => Date.now() },
  capped: { type: Boolean, default: false },
})
const emit = defineEmits(['open', 'move'])

const COLS = [
  { key: 'open', label: 'Open', color: 'var(--sd-st-open)' },
  { key: 'in_progress', label: 'In Progress', color: 'var(--sd-st-progress)' },
  { key: 'pending_customer', label: 'Pending Customer', color: 'var(--sd-st-pending)' },
  { key: 'pending_vendor', label: 'Pending Vendor', color: 'var(--sd-st-pending)' },
  { key: 'escalated', label: 'Escalated', color: 'var(--sd-st-escalated)' },
  { key: 'resolved', label: 'Resolved', color: 'var(--sd-st-resolved)' },
  { key: 'closed', label: 'Closed', color: 'var(--sd-st-closed)' },
]
const PRI = { critical: 'var(--sd-pri-critical)', urgent: 'var(--sd-pri-urgent)', high: 'var(--sd-pri-high)', medium: 'var(--sd-pri-medium)', low: 'var(--sd-pri-low)' }
const priColor = (p) => PRI[p] || 'var(--sd-steel)'

const columns = computed(() => COLS.map(c => ({ ...c, items: props.tickets.filter(t => t.status === c.key) })))
const capNote = computed(() => props.capped ? 'Showing the first 100 — refine with filters to narrow the board.' : '')

const dragId = ref(null)
const dragOver = ref(null)
const onDragStart = (t, e) => { dragId.value = t.id; try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', t.id) } catch {} }
const onDragEnd = () => { dragId.value = null; dragOver.value = null }
const onDrop = (status) => {
  const id = dragId.value
  dragOver.value = null
  if (!id) return
  const t = props.tickets.find(x => x.id === id)
  dragId.value = null
  if (t && t.status !== status) emit('move', { id, status, from: t.status })
}

const initials = (n) => n ? n.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() : '—'
const dueMs = (t) => { const d = t.resolution_due_at || t.response_due_at; return d ? new Date(d).getTime() : null }
const breached = (t) => t.sla_resolution_breached || t.sla_resolution_state === 'breached' || (dueMs(t) != null && props.now > dueMs(t) && !['resolved', 'closed'].includes(t.status))
const slaTone = (t) => {
  if (['resolved', 'closed'].includes(t.status)) return 'done'
  if (breached(t)) return 'over'
  const r = dueMs(t); if (r != null && r - props.now < 7200000) return 'soon'
  return ''
}
const remain = (t) => {
  if (['resolved', 'closed'].includes(t.status)) return '✓'
  const d = dueMs(t); if (d == null) return '—'
  const ms = d - props.now, abs = Math.abs(ms), m = Math.floor(abs / 60000)
  const lbl = m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`
  return ms < 0 ? `-${lbl}` : lbl
}
const slaTitle = (t) => { const d = t.resolution_due_at || t.response_due_at; return d ? `Resolution due ${new Date(d).toLocaleString()}` : 'No SLA clock' }
</script>

<style scoped>
.sd-board-wrap { display: flex; flex-direction: column; gap: 10px; }
.sd-board { display: flex; gap: 12px; overflow-x: auto; padding: 4px 2px 12px; scroll-snap-type: x proximity; }
.sd-board::-webkit-scrollbar { height: 8px; }
.sd-board::-webkit-scrollbar-thumb { background: var(--sd-border-strong); border-radius: 999px; }

.bd-col {
  flex: 0 0 252px; scroll-snap-align: start; display: flex; flex-direction: column;
  border-radius: 16px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border);
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s; min-height: 180px;
}
.sd-board.dragging .bd-col { border-style: dashed; }
.bd-col.over { border-color: var(--cc); background: color-mix(in srgb, var(--cc) 8%, var(--sd-surface-glass)); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--cc) 40%, transparent); }

.bd-col-head { display: flex; align-items: center; gap: 8px; padding: 12px 14px 10px; position: relative; }
.bd-col-rail { width: 8px; height: 8px; border-radius: 50%; background: var(--cc); box-shadow: 0 0 8px var(--cc); }
.bd-col-title { font-size: 12.5px; font-weight: 700; color: var(--sd-text); flex: 1; }
.bd-col-count { font-size: 11px; font-weight: 800; color: var(--sd-text-muted); padding: 1px 9px; border-radius: 999px; background: var(--sd-surface); font-variant-numeric: tabular-nums; }

.bd-col-body { display: flex; flex-direction: column; gap: 8px; padding: 0 10px 12px; overflow-y: auto; max-height: 560px; }
.bd-card {
  position: relative; padding: 11px 12px 11px 16px; border-radius: 13px; cursor: grab;
  background: var(--sd-surface); border: 1px solid var(--sd-border); overflow: hidden;
  transition: transform 0.18s var(--sd-spring), box-shadow 0.18s, border-color 0.18s;
  animation: sd-deal 0.4s var(--sd-spring) backwards;
}
.bd-card:hover { transform: translateY(-2px); box-shadow: var(--sd-card-shadow); border-color: color-mix(in srgb, var(--pc) 40%, var(--sd-border-strong)); }
.bd-card:active { cursor: grabbing; }
.bd-card.ghost { opacity: 0.35; transform: scale(0.97); }
.bd-card.breached { border-color: color-mix(in srgb, var(--sd-danger) 38%, transparent); }
.bd-card-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--pc); }

.bd-card-top { display: flex; align-items: center; gap: 7px; margin-bottom: 6px; }
.bd-no { font-size: 11px; font-weight: 700; color: var(--sd-amber); }
.bd-pri-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--pc); box-shadow: 0 0 7px var(--pc); margin-left: auto; }
.bd-esc { color: var(--sd-st-escalated); }
.bd-subj { font-size: 12.5px; font-weight: 600; color: var(--sd-text); margin: 0 0 9px; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.bd-card-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.bd-cust { font-size: 10.5px; color: var(--sd-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 120px; }
.bd-sla { display: inline-flex; align-items: center; gap: 3px; font-size: 10.5px; font-weight: 700; color: var(--sd-text-muted); font-variant-numeric: tabular-nums; }
.bd-sla.soon { color: var(--sd-warning); }
.bd-sla.over { color: var(--sd-danger); }
.bd-sla.done { color: var(--sd-success); }
.bd-agent { position: absolute; top: 10px; right: 10px; width: 19px; height: 19px; border-radius: 50%; display: grid; place-items: center; font-size: 8.5px; font-weight: 800; color: #1a1206; background: var(--sd-grad-rail); }
[data-theme="light"] .bd-agent { color: #fff8ec; }

.bd-col-empty { text-align: center; font-size: 11px; color: var(--sd-text-dim); padding: 20px 0; margin: 0; border: 1px dashed var(--sd-border); border-radius: 11px; }
.bd-hint { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; color: var(--sd-text-dim); margin: 0; }

@media (prefers-reduced-motion: reduce) { .bd-card { animation: none; } }
</style>
