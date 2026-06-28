<template>
  <!-- Outer shell runs the entrance; inner runs the 3D tilt so they never fight. -->
  <div class="sd-tc-shell" :style="{ '--i': index }">
    <article
      ref="cardEl"
      class="sd-tc"
      :class="{ breached: isBreached, escalated: ticket.is_escalated, selected }"
      :style="{ '--pc': priColor }"
      @pointermove="onMove"
      @pointerleave="onLeave"
      @click="$emit('open', ticket.id)"
    >
      <span class="sd-tc-spine" />
      <span class="sd-tc-glare" />

      <!-- Selection -->
      <button
        v-if="selectable"
        type="button"
        class="sd-tc-check"
        :class="{ on: selected }"
        @click.stop="$emit('toggle', ticket.id)"
        :aria-label="selected ? 'Deselect ticket' : 'Select ticket'"
      >
        <Check v-if="selected" :size="13" />
      </button>

      <!-- Body -->
      <div class="sd-tc-main">
        <div class="sd-tc-top">
          <span class="sd-tc-no sd-mono">{{ ticket.ticket_number }}</span>
          <span class="sd-tc-type">{{ typeLabel }}</span>
          <span v-if="ticket.is_escalated" class="sd-tc-esc"><Flame :size="11" /> Escalated</span>
          <SdPill kind="priority" :value="ticket.priority" />
        </div>
        <p class="sd-tc-subject">{{ ticket.subject }}</p>
        <div class="sd-tc-meta">
          <span v-if="ticket.organization_name" class="m"><Building2 :size="12" />{{ ticket.organization_name }}</span>
          <span v-else-if="ticket.contact_name" class="m"><User :size="12" />{{ ticket.contact_name }}</span>
          <span class="m"><Clock :size="12" />{{ ago(ticket.created_at) }}</span>
          <span v-if="ticket.comment_count" class="m"><MessageSquare :size="12" />{{ ticket.comment_count }}</span>
        </div>
      </div>

      <!-- Right rail: SLA ring + assignee + status -->
      <div class="sd-tc-rail">
        <div class="sd-tc-sla" :style="{ '--p': slaPct + '%', '--sc': slaColor }" :title="slaTitle">
          <span class="sla-time" :class="{ over: remainMs < 0 }">{{ remainLabel }}</span>
        </div>
        <div class="sd-tc-bottom">
          <span class="sd-tc-agent" :class="{ none: !ticket.assigned_agent_name }">
            <span class="ag-dot">{{ initials }}</span>
            <span class="ag-name">{{ ticket.assigned_agent_name || 'Unassigned' }}</span>
          </span>
          <SdPill kind="status" :value="ticket.status" />
        </div>
      </div>
    </article>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Check, Flame, Building2, User, Clock, MessageSquare } from 'lucide-vue-next'
import SdPill from './SdPill.vue'
import { TICKET_TYPES } from '@/composables/useSupportDesk'

const props = defineProps({
  ticket: { type: Object, required: true },
  index: { type: Number, default: 0 },
  selectable: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  now: { type: Number, default: () => Date.now() },
})
defineEmits(['open', 'toggle'])

const PRI = { critical: 'var(--sd-pri-critical)', urgent: 'var(--sd-pri-urgent)', high: 'var(--sd-pri-high)', medium: 'var(--sd-pri-medium)', low: 'var(--sd-pri-low)' }
const priColor = computed(() => PRI[props.ticket.priority] || 'var(--sd-steel)')
const typeLabel = computed(() => TICKET_TYPES.find(t => t.value === props.ticket.ticket_type)?.label || props.ticket.ticket_type || 'Ticket')

const initials = computed(() => {
  const n = props.ticket.assigned_agent_name
  if (!n) return '—'
  return n.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase()
})

/* ── SLA clock (resolution window) ─────────────────────────── */
const due = computed(() => props.ticket.resolution_due_at || props.ticket.response_due_at || null)
const created = computed(() => props.ticket.created_at ? new Date(props.ticket.created_at).getTime() : null)
const dueMs = computed(() => due.value ? new Date(due.value).getTime() : null)
const isBreached = computed(() =>
  props.ticket.sla_resolution_breached || props.ticket.sla_resolution_state === 'breached' ||
  (dueMs.value != null && props.now > dueMs.value && !['resolved', 'closed'].includes(props.ticket.status)))
const remainMs = computed(() => dueMs.value != null ? dueMs.value - props.now : null)
const slaPct = computed(() => {
  if (dueMs.value == null || created.value == null) return 0
  const win = dueMs.value - created.value
  if (win <= 0) return 100
  return Math.max(0, Math.min(100, ((props.now - created.value) / win) * 100))
})
const slaColor = computed(() => {
  const st = props.ticket.sla_resolution_state
  if (isBreached.value || st === 'breached') return 'var(--sd-danger)'
  if (st === 'met') return 'var(--sd-success)'
  if (st === 'due-soon' || (remainMs.value != null && remainMs.value < 7200000)) return 'var(--sd-warning)'
  if (slaPct.value >= 100) return 'var(--sd-danger)'
  return 'var(--sd-success)'
})
const remainLabel = computed(() => {
  if (['resolved', 'closed'].includes(props.ticket.status)) return '✓'
  if (remainMs.value == null) return '—'
  const abs = Math.abs(remainMs.value)
  const m = Math.floor(abs / 60000)
  const lbl = m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${Math.floor(m / 1440)}d`
  return remainMs.value < 0 ? `${lbl} over` : lbl
})
const slaTitle = computed(() => due.value ? `SLA ${remainMs.value < 0 ? 'breached' : 'resolution due'}: ${new Date(due.value).toLocaleString()}` : 'No SLA clock')

/* ── pointer spotlight + tilt ──────────────────────────────── */
const cardEl = ref(null)
const onMove = (e) => {
  const el = cardEl.value; if (!el) return
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', ((e.clientX - r.left) / r.width).toFixed(3))
  el.style.setProperty('--my', ((e.clientY - r.top) / r.height).toFixed(3))
  el.style.setProperty('--spot', '1')
}
const onLeave = () => {
  const el = cardEl.value; if (!el) return
  el.style.setProperty('--spot', '0'); el.style.setProperty('--mx', '0.5'); el.style.setProperty('--my', '0.5')
}

const ago = (iso) => {
  if (!iso) return ''
  const s = Math.floor((props.now - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
</script>

<style scoped>
.sd-tc-shell { animation: sd-deal 0.5s var(--sd-spring) backwards; animation-delay: calc(var(--i) * 0.04s); }

.sd-tc {
  position: relative; display: flex; align-items: stretch; gap: 16px;
  padding: 15px 16px 15px 20px; border-radius: 16px; cursor: pointer; overflow: hidden;
  background: var(--sd-surface); border: 1px solid var(--sd-border);
  transition: border-color 0.25s var(--sd-spring), box-shadow 0.25s var(--sd-spring), transform 0.3s var(--sd-spring);
  transform: perspective(1100px)
    rotateX(calc((var(--my, 0.5) - 0.5) * -4deg))
    rotateY(calc((var(--mx, 0.5) - 0.5) * 6deg));
  transform-style: preserve-3d;
}
.sd-tc::before { /* warm corner wash */
  content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: var(--sd-grad-card); opacity: 0.7;
}
.sd-tc:hover { border-color: color-mix(in srgb, var(--pc) 45%, var(--sd-border-strong)); box-shadow: var(--sd-card-shadow); transform: perspective(1100px) rotateX(calc((var(--my,0.5) - 0.5) * -4deg)) rotateY(calc((var(--mx,0.5) - 0.5) * 6deg)) translateY(-2px); }
.sd-tc.selected { border-color: var(--sd-amber-border); box-shadow: 0 0 0 2px var(--sd-amber-soft), var(--sd-card-shadow); }
.sd-tc.breached { border-color: color-mix(in srgb, var(--sd-danger) 40%, transparent); }
.sd-tc.breached .sd-tc-spine { animation: sd-breach-flash 1.8s ease-in-out infinite; }

.sd-tc-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--pc); box-shadow: 0 0 14px color-mix(in srgb, var(--pc) 55%, transparent); }
.sd-tc-glare {
  position: absolute; inset: 0; pointer-events: none; border-radius: inherit; opacity: var(--spot, 0);
  background: radial-gradient(420px circle at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), rgba(255, 255, 255, 0.1), transparent 45%);
  transition: opacity 0.3s; mix-blend-mode: overlay;
}

.sd-tc-check {
  position: absolute; top: 12px; right: 12px; z-index: 3;
  width: 20px; height: 20px; display: grid; place-items: center; border-radius: 6px; cursor: pointer;
  background: var(--sd-surface-glass); border: 1.5px solid var(--sd-border-strong); color: #1a1206;
}
.sd-tc-check.on { background: var(--sd-grad-hero); border-color: transparent; }
[data-theme="light"] .sd-tc-check.on { color: #fff8ec; }

.sd-tc-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.sd-tc-top { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.sd-tc-no { font-size: 12px; font-weight: 700; color: var(--sd-amber); }
.sd-tc-type { font-size: 10.5px; font-weight: 600; color: var(--sd-text-muted); text-transform: uppercase; letter-spacing: 0.04em; padding: 2px 7px; border-radius: 6px; background: var(--sd-surface-glass); }
.sd-tc-esc { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 700; color: var(--sd-st-escalated); padding: 2px 7px; border-radius: 6px; background: var(--sd-st-escalated-soft); }
.sd-tc-subject { font-size: 14.5px; font-weight: 600; color: var(--sd-text); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sd-tc-meta { display: flex; flex-wrap: wrap; gap: 14px; }
.sd-tc-meta .m { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--sd-text-muted); }

.sd-tc-rail { display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; gap: 10px; flex-shrink: 0; }
.sd-tc-sla {
  position: relative; width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center;
  background:
    radial-gradient(closest-side, var(--sd-surface) 70%, transparent 71% 100%),
    conic-gradient(var(--sc) calc(var(--p)), color-mix(in srgb, var(--sd-text-dim) 26%, transparent) 0);
}
.sla-time { font-size: 9.5px; font-weight: 800; color: var(--sd-text-secondary); font-variant-numeric: tabular-nums; letter-spacing: -0.02em; line-height: 1; text-align: center; max-width: 38px; }
.sla-time.over { color: var(--sd-danger); }

.sd-tc-bottom { display: flex; flex-direction: column; align-items: flex-end; gap: 7px; }
.sd-tc-agent { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--sd-text-secondary); max-width: 150px; }
.sd-tc-agent.none { color: var(--sd-text-dim); }
.ag-dot { width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; font-size: 9px; font-weight: 800; color: #1a1206; background: var(--sd-grad-rail); }
.sd-tc-agent.none .ag-dot { background: var(--sd-surface-glass); color: var(--sd-text-dim); border: 1px solid var(--sd-border-strong); }
[data-theme="light"] .ag-dot { color: #fff8ec; }
.ag-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

@media (max-width: 720px) {
  .sd-tc-rail { align-items: flex-end; }
  .sd-tc-agent .ag-name { display: none; }
}
/* Respect OS Reduce Motion unless the in-app Cinematic mode is on. */
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .sd-tc-shell { animation: none; }
  html:not([data-cinematic="on"]) .sd-tc, html:not([data-cinematic="on"]) .sd-tc:hover { transform: none; }
  html:not([data-cinematic="on"]) .sd-tc.breached .sd-tc-spine { animation: none; }
}
</style>
