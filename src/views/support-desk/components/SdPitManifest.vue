<template>
  <div class="pmf" :style="{ '--tc': accent }">
    <div v-if="rows.length" class="pmf-list">
      <div v-for="(t, i) in rows" :key="t.id" class="pmf-card"
        :class="{ breached: isBreached(t), sel: selected.includes(t.id), cur: cursor === i }"
        :style="{ '--i': i, '--pc': priColor(t) }" :data-pmf-i="i">
        <span class="pmf-spine" aria-hidden="true" />
        <label class="pmf-check" :title="'Couple ' + t.ticket_number + ' for a bulk pit call'">
          <input type="checkbox" :checked="selected.includes(t.id)" @change="$emit('toggle', t.id)" />
          <span class="pmf-check-box" aria-hidden="true" />
        </label>

        <button class="pmf-car sd-mono" :title="'Open ' + t.ticket_number" @click="$emit('open', t)">
          <b>{{ t.ticket_number }}</b>
          <i>CAR {{ carOf(t) }}</i>
        </button>

        <div class="pmf-main">
          <button class="pmf-subj" @click="$emit('open', t)">{{ t.subject }}</button>
          <div class="pmf-chips">
            <span class="pmf-p sd-mono" :class="`p-${priBand(t)}`">P{{ priBand(t) }}</span>
            <span class="pmf-lane sd-mono" :style="{ '--lc': laneOf(t).color || 'var(--tc)' }">{{ laneOf(t).name }}</span>
            <span v-if="(t.viewing || []).length" class="pmf-ghost sd-mono" :title="`Serve-next slipstreams past cars in a teammate's window`">
              GHOST LIVERY · IN {{ (t.viewing[0] || 'A TEAMMATE').toUpperCase() }}'S WINDOW
            </span>
            <span v-else-if="!t.assigned_agent_id" class="pmf-unowned sd-mono">UNOWNED</span>
            <span v-if="t.is_escalated" class="pmf-esc sd-mono">ESCALATED · L{{ Math.min(3, (t.escalation_level || 1) + 1) }} CALL</span>
            <span class="pmf-meta">for {{ t.requester_name || t.contact_name || 'Unknown' }} · {{ statusLabel(t) }} · updated {{ ago(t) }}</span>
          </div>
        </div>

        <div class="pmf-right">
          <span class="pmf-tyre" :class="tyreTone(t)" aria-hidden="true">
            <svg viewBox="0 0 22 22" width="22" height="22">
              <circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" stroke-opacity="0.22" stroke-width="2.8" />
              <circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"
                :stroke-dasharray="`${tyreLeft(t) * 50.3} 50.3`" transform="rotate(-90 11 11)" />
            </svg>
          </span>
          <span class="pmf-gapblock sd-mono">
            <b :class="gapTone(t)">{{ gapOf(t) }}</b>
            <i :class="gapTone(t)">{{ stateOf(t) }}</i>
          </span>
          <span class="pmf-mono" :class="{ empty: !t.assigned_agent_name }" :title="t.assigned_agent_name || 'Unowned'">
            {{ monogram(t) }}
          </span>
        </div>
      </div>
    </div>
    <div v-else-if="!loading" class="pmf-empty">
      <component :is="emptyIcon" :size="26" />
      <h4>{{ empty.title }}</h4>
      <p>{{ empty.blurb }}</p>
    </div>
  </div>
</template>

<script setup>
/* SdPitManifest — the CIRCUIT view: every ticket as a car card (priority spine,
   CAR number block, lane livery chip, GHOST LIVERY when a teammate has it open,
   checkered hatch + warning-flag edge when SLA-breached, tyre ring, live ±gap,
   owner monogram). Selectable for the bulk pit-call bar; entrance staggers per row. */
import { computed, watch, nextTick } from 'vue'
import { Inbox } from 'lucide-vue-next'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  selected: { type: Array, default: () => [] },
  queues: { type: Array, default: () => [] },
  now: { type: Number, default: () => Date.now() },
  accent: { type: String, default: 'var(--sd-qs-core)' },
  loading: { type: Boolean, default: false },
  cursor: { type: Number, default: -1 },
  empty: { type: Object, default: () => ({ title: 'Grid clear', blurb: 'Nothing matches the current lens.' }) },
  emptyIcon: { type: [Object, Function], default: () => Inbox },
})
defineEmits(['open', 'toggle'])

/* keep the wheel-controls cursor row in view */
watch(() => props.cursor, async (i) => {
  if (i < 0) return
  await nextTick()
  document.querySelector(`.pmf-card[data-pmf-i="${i}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
})

const laneById = computed(() => Object.fromEntries((props.queues || []).map(q => [String(q.id), q])))
const laneOf = (t) => laneById.value[String(t.queue_id)] || { name: 'Lane' }
const carOf = (t) => String(t.ticket_number || '').replace(/\D/g, '').slice(-2).padStart(2, '0') || '—'
const PRI_BAND = { urgent: 1, critical: 1, high: 2, medium: 3, low: 4 }
const priBand = (t) => PRI_BAND[t.priority] || 3
const priColor = (t) => {
  const b = priBand(t)
  return b === 1 ? 'var(--sd-qs-halt)' : b === 2 ? 'var(--sd-qs-warn)' : b === 3 ? 'var(--sd-qs-core)' : 'var(--sd-qs-rail, var(--sd-text-dim))'
}
const isBreached = (t) => t.sla_resolution_state === 'breached' || t.sla_response_state === 'breached'
const tyreLeft = (t) => {
  const created = t.created_at ? new Date(t.created_at).getTime() : 0
  const due = t.resolution_due_at ? new Date(t.resolution_due_at).getTime() : 0
  if (!created || !due || due <= created) return 1
  return Math.max(0, Math.min(1, (due - props.now) / (due - created)))
}
const tyreTone = (t) => (isBreached(t) || tyreLeft(t) <= 0 ? 'flat' : tyreLeft(t) < 0.25 ? 'worn' : 'fresh')
const gapOf = (t) => {
  const due = t.resolution_due_at ? new Date(t.resolution_due_at).getTime() : 0
  if (!due) return '· · ·'
  const s = Math.round((due - props.now) / 1000), a = Math.abs(s)
  const h = Math.floor(a / 3600), m = Math.floor((a % 3600) / 60), ss = a % 60
  const core = h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${m}:${String(ss).padStart(2, '0')}`
  return (s < 0 ? '−' : '+') + core
}
const gapTone = (t) => {
  const due = t.resolution_due_at ? new Date(t.resolution_due_at).getTime() : 0
  if (!due) return ''
  const s = due - props.now
  return s < 0 ? 'bad' : s < 4 * 3600e3 ? 'warn' : 'ok'
}
const stateOf = (t) => (isBreached(t) ? 'BREACHED'
  : (t.sla_resolution_state === 'due-soon' || t.sla_response_state === 'due-soon') ? 'DUE SOON' : 'HEALTHY')
const STATUS_LB = { open: 'open', in_progress: 'in progress', pending_customer: 'clock-stopped', pending_vendor: 'clock-stopped', on_hold: 'clock-stopped', escalated: 'escalated', resolved: 'resolved', closed: 'closed' }
const statusLabel = (t) => STATUS_LB[t.status] || t.status
const ago = (t) => {
  const at = t.updated_at ? new Date(t.updated_at).getTime() : 0
  if (!at) return '—'
  const m = Math.max(0, Math.floor((props.now - at) / 60000))
  return m < 1 ? 'now' : m < 60 ? `${m} m ago` : m < 1440 ? `${Math.floor(m / 60)} h ago` : `${Math.floor(m / 1440)} d ago`
}
const monogram = (t) => {
  const n = t.assigned_agent_name
  if (!n) return '—'
  return n.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase()
}
</script>

<style scoped>
.pmf-list { display: flex; flex-direction: column; gap: 9px; }
.pmf-card { position: relative; overflow: hidden; display: flex; align-items: center; gap: 14px;
  padding: 13px 16px 13px 20px; border-radius: 14px;
  border: 1px solid var(--sd-border); background: var(--sd-surface);
  animation: sd-deal 0.4s var(--sd-spring) both; animation-delay: calc(var(--i) * 0.04s);
  transition: border-color 0.2s, transform 0.18s, box-shadow 0.2s; }
.pmf-card:hover { border-color: color-mix(in srgb, var(--pc) 50%, var(--sd-border)); transform: translateX(4px);
  box-shadow: 0 12px 28px -16px color-mix(in srgb, var(--pc) 55%, transparent); }
.pmf-card.sel { border-color: var(--tc); background: color-mix(in srgb, var(--tc) 6%, var(--sd-surface)); }
.pmf-card.cur { border-color: var(--tc); box-shadow: 0 0 0 2px color-mix(in srgb, var(--tc) 35%, transparent),
  0 12px 28px -16px color-mix(in srgb, var(--tc) 55%, transparent); transform: translateX(4px); }
.pmf-card.breached { background:
  repeating-linear-gradient(-45deg, transparent 0 14px, color-mix(in srgb, var(--sd-qs-halt) 4%, transparent) 14px 28px),
  var(--sd-surface); }
.pmf-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 5px; background: var(--pc); }
.pmf-card.breached .pmf-spine { background: repeating-linear-gradient(180deg, var(--sd-qs-halt) 0 8px, #f6efdf 8px 16px); }

.pmf-check { position: relative; flex-shrink: 0; display: grid; place-items: center; cursor: pointer; }
.pmf-check input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.pmf-check-box { width: 15px; height: 15px; border-radius: 5px; border: 1.5px solid var(--sd-border-strong);
  background: var(--sd-surface); transition: background 0.15s, border-color 0.15s; }
.pmf-check input:checked + .pmf-check-box { background: var(--tc); border-color: var(--tc); }
.pmf-check input:focus-visible + .pmf-check-box { outline: 2px solid var(--tc); outline-offset: 2px; }

.pmf-car { flex-shrink: 0; display: flex; flex-direction: column; gap: 1px; min-width: 86px; padding: 0; border: none;
  background: none; cursor: pointer; text-align: left; font-family: inherit; }
.pmf-car b { font-size: 15.5px; font-weight: 800; letter-spacing: 0.01em; color: var(--sd-text); }
.pmf-car:hover b { color: var(--tc); }
.pmf-car i { font-style: normal; font-size: 8.5px; font-weight: 800; letter-spacing: 0.16em; color: var(--sd-text-dim); }

.pmf-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.pmf-subj { padding: 0; border: none; background: none; cursor: pointer; text-align: left; font-family: inherit;
  font-size: 13.5px; font-weight: 700; color: var(--sd-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pmf-subj:hover { color: var(--tc); }
.pmf-chips { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.pmf-p { padding: 2px 7px; border-radius: 6px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.08em; }
.pmf-p.p-1 { color: #fff; background: var(--sd-qs-halt); }
.pmf-p.p-2 { color: #241703; background: var(--sd-qs-warn); }
.pmf-p.p-3 { color: #241703; background: var(--sd-qs-core, #f5b942); }
.pmf-p.p-4 { color: var(--sd-text-secondary); border: 1px solid var(--sd-border-strong); }
.pmf-lane { padding: 2px 8px; border-radius: 6px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.08em;
  color: var(--lc); border: 1px solid color-mix(in srgb, var(--lc) 45%, transparent);
  background: color-mix(in srgb, var(--lc) 8%, transparent); }
.pmf-unowned { padding: 2px 8px; border-radius: 6px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.1em;
  color: var(--sd-qs-warn); border: 1px dashed color-mix(in srgb, var(--sd-qs-warn) 55%, transparent); }
.pmf-ghost { padding: 2px 8px; border-radius: 6px; font-size: 8px; font-weight: 800; letter-spacing: 0.08em;
  color: var(--sd-text-dim); border: 1px dashed var(--sd-border-strong);
  background: repeating-linear-gradient(45deg, transparent 0 5px, color-mix(in srgb, var(--sd-text) 4%, transparent) 5px 10px); }
.pmf-esc { padding: 2px 8px; border-radius: 6px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.08em;
  color: var(--sd-st-escalated, var(--sd-qs-warn)); border: 1px solid color-mix(in srgb, var(--sd-st-escalated, var(--sd-qs-warn)) 45%, transparent); }
.pmf-meta { font-size: 10.5px; color: var(--sd-text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.pmf-right { flex-shrink: 0; display: flex; align-items: center; gap: 12px; }
.pmf-tyre.fresh { color: var(--sd-qs-go); }
.pmf-tyre.worn { color: var(--sd-qs-warn); }
.pmf-tyre.flat { color: var(--sd-qs-halt); animation: pmf-flat 0.9s ease-in-out infinite; }
.pmf-gapblock { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; min-width: 78px; }
.pmf-gapblock b { font-size: 13.5px; font-weight: 800; font-variant-numeric: tabular-nums; }
.pmf-gapblock i { font-style: normal; font-size: 7.5px; font-weight: 800; letter-spacing: 0.16em; }
.pmf-gapblock .ok { color: var(--sd-text-secondary); }
.pmf-gapblock i.ok { color: var(--sd-qs-go); }
.pmf-gapblock .warn { color: var(--sd-qs-warn); }
.pmf-gapblock .bad { color: var(--sd-qs-halt); }
.pmf-mono { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%;
  font-size: 10px; font-weight: 800; letter-spacing: 0.04em; color: #241703;
  background: linear-gradient(135deg, #ffd98a, var(--sd-qs-core)); }
.pmf-mono.empty { color: var(--sd-text-dim); background: transparent; border: 1.5px dashed var(--sd-border-strong); }

.pmf-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 44px 16px;
  border: 1px dashed var(--sd-border-strong); border-radius: 16px; color: var(--sd-text-dim); text-align: center; }
.pmf-empty h4 { margin: 0; font-size: 14px; font-weight: 800; color: var(--sd-text-secondary); }
.pmf-empty p { margin: 0; font-size: 11.5px; max-width: 46ch; }

@keyframes pmf-flat { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
@media (max-width: 900px) {
  .pmf-card { flex-wrap: wrap; }
  .pmf-right { width: 100%; justify-content: flex-end; }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .pmf-card { animation: none; }
  html:not([data-cinematic="on"]) .pmf-tyre.flat { animation: none; }
}
</style>
