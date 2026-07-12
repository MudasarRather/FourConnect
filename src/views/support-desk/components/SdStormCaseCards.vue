<template>
  <div class="src">
    <div v-if="loading && !rows.length" class="src-skel">
      <div v-for="i in 4" :key="i" class="src-skel-card" :style="{ '--i': i }" />
    </div>

    <div v-else-if="!rows.length" class="src-empty">
      <component :is="emptyIcon" :size="26" />
      <h4>{{ empty.title }}</h4>
      <p>{{ empty.blurb }}</p>
    </div>

    <div v-else class="src-grid">
      <article v-for="(t, i) in rows" :key="t.id" ref="cardEls" class="src-card"
        :class="{ sel: selected.includes(t.id), cur: i === cursor, breached: isBreached(t) }"
        :style="{ '--i': i, '--pc': prioColor(t.priority) }" tabindex="0"
        @click="$emit('open', t)" @keydown.enter.prevent="$emit('open', t)">
        <!-- priority spine + breach hatch -->
        <i class="src-spine" aria-hidden="true" />
        <i v-if="isBreached(t)" class="src-hatch" aria-hidden="true" />

        <label class="src-pick" :title="selected.includes(t.id) ? 'Uncouple' : 'Select for a bulk action'" @click.stop>
          <input type="checkbox" :checked="selected.includes(t.id)" @change="$emit('toggle', t.id)" />
        </label>

        <!-- station-model glyph: barbs = priority -->
        <svg class="src-glyph" viewBox="0 0 34 34" aria-hidden="true">
          <circle cx="17" cy="21" r="5.5" class="src-glyph-eye" />
          <line v-for="b in barbs(t.priority)" :key="b" class="src-glyph-barb"
            x1="17" y1="16" :x2="17 + 8 * Math.sin(-0.5 - b * 0.5)" :y2="16 - 8 * Math.cos(-0.5 - b * 0.5)" />
        </svg>

        <div class="src-main">
          <p class="src-top sd-mono">
            <b class="src-num">{{ t.ticket_number }}</b>
            <SdPill kind="priority" :value="t.priority" />
            <span v-if="laneOf(t)" class="src-lane" :style="{ '--lc': laneColorOf(t) }"><i />{{ laneOf(t) }}</span>
          </p>
          <h4 class="src-subj">{{ t.subject }}</h4>
          <p class="src-meta sd-mono">
            <span class="src-owner" :class="{ un: !t.assigned_agent_id }">
              <span v-if="t.assigned_agent_id" class="src-mono">{{ initials(t.assigned_agent_name) }}</span>
              {{ t.assigned_agent_name || 'UNOWNED' }}
            </span>
            <span v-if="t.is_escalated" class="src-badge esc"><Flame :size="9" /> ESC · L{{ t.escalation_level }}</span>
            <span v-if="ackDue(t)" class="src-badge ack"><BellRing :size="9" /> ACK {{ ackDue(t) }}</span>
            <span v-if="t.swarming" class="src-badge swarm"><Users :size="9" /> SWARM</span>
            <span v-if="t.watching" class="src-badge watch"><Eye :size="9" /> WATCHING</span>
            <span v-if="(t.viewing || []).length" class="src-badge view" :title="`Being viewed by ${t.viewing.join(', ')}`">
              <ScanEye :size="9" /> {{ initials(t.viewing[0]) }}{{ t.viewing.length > 1 ? ` +${t.viewing.length - 1}` : '' }}
            </span>
          </p>
        </div>

        <!-- pressure-tendency dial = SLA -->
        <div class="src-sla" :title="slaTitle(t)">
          <svg viewBox="0 0 44 44" class="src-sla-svg" aria-hidden="true">
            <circle cx="22" cy="22" r="18" class="src-sla-track" />
            <circle cx="22" cy="22" r="18" class="src-sla-arc" :class="slaToneOf(t)"
              :stroke-dasharray="`${slaFrac(t) * 113} 113`" transform="rotate(-90 22 22)" />
          </svg>
          <span class="src-sla-v sd-mono" :class="slaToneOf(t)">{{ slaLabel(t) }}</span>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup>
/* SdStormCaseCards — STATION REPORTS: each ticket is a chart-paper report card with a
   station-model glyph (barbs = priority), a pressure-tendency SLA dial, and the L2
   workbench badges (swarm / watching / ACK due / being viewed). */
import { ref, watch, nextTick } from 'vue'
import { Flame, BellRing, Users, Eye, ScanEye } from 'lucide-vue-next'
import SdPill from './SdPill.vue'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  selected: { type: Array, default: () => [] },
  queues: { type: Array, default: () => [] },
  now: { type: Number, default: () => Date.now() },
  loading: { type: Boolean, default: false },
  cursor: { type: Number, default: -1 },
  empty: { type: Object, default: () => ({ title: 'Chart clear', blurb: 'No systems on the board.' }) },
  emptyIcon: { type: [Object, Function], default: null },
})
defineEmits(['open', 'toggle'])

const cardEls = ref([])
watch(() => props.cursor, async (i) => {
  if (i < 0) return
  await nextTick()
  cardEls.value[i]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
})

const initials = (n) => (n || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
const BARB_N = { critical: 4, urgent: 4, high: 3, medium: 2, low: 1 }
const barbs = (p) => Array.from({ length: BARB_N[p] || 1 }, (_, k) => k)
const prioColor = (p) => ({
  critical: 'var(--sd-l2-halt)', urgent: 'var(--sd-l2-halt)', high: 'var(--sd-l2-core)',
  medium: 'var(--sd-l2-front)', low: 'var(--sd-l2-ink)',
}[p] || 'var(--sd-l2-ink)')
const laneOf = (t) => props.queues.find(q => String(q.id) === String(t.queue_id))?.name || ''
const laneColorOf = (t) => props.queues.find(q => String(q.id) === String(t.queue_id))?.color || 'var(--sd-l2-core)'

const isBreached = (t) => t.sla_resolution_state === 'breached' || t.sla_response_state === 'breached'
const slaMs = (t) => (t.resolution_due_at ? new Date(t.resolution_due_at).getTime() - props.now : null)
const slaFrac = (t) => {
  const ms = slaMs(t)
  if (ms === null) return 0.06
  if (ms <= 0) return 1
  return Math.max(0.06, Math.min(1, 1 - ms / (24 * 3600000)))
}
const slaToneOf = (t) => {
  const ms = slaMs(t)
  if (ms === null) return 'dim'
  return ms <= 0 ? 'bad' : ms < 4 * 3600000 ? 'warn' : 'ok'
}
const slaLabel = (t) => {
  const ms = slaMs(t)
  if (ms === null) return '—'
  const neg = ms < 0
  const a = Math.abs(ms)
  const d = Math.floor(a / 86400000), h = Math.floor((a % 86400000) / 3600000), m = Math.floor((a % 3600000) / 60000)
  const core = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`
  return `${neg ? '−' : ''}${core}`
}
const slaTitle = (t) => {
  const ms = slaMs(t)
  if (ms === null) return 'No resolution SLA on this ticket'
  return ms < 0 ? `Resolution SLA breached ${slaLabel(t)} ago` : `Resolution due in ${slaLabel(t)}`
}
const ackDue = (t) => {
  if (!t.is_escalated || t.escalation_acknowledged_at || !t.escalation_response_due_at) return ''
  const ms = new Date(t.escalation_response_due_at).getTime() - props.now
  if (ms <= 0) return 'OVERDUE'
  const m = Math.round(ms / 60000)
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h`
}
</script>

<style scoped>
.src-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 11px; }

.src-card { position: relative; display: flex; align-items: center; gap: 13px; padding: 14px 16px 14px 20px;
  border-radius: 15px; cursor: pointer; overflow: hidden;
  border: 1px solid var(--sd-border); background: var(--sd-surface); color: var(--sd-text);
  /* chart vellum: faint isoline texture */
  background-image: repeating-linear-gradient(112deg, var(--sd-l2-paper) 0 1px, transparent 1px 26px);
  animation: sd-deal 0.45s var(--sd-spring) both; animation-delay: calc(var(--i) * 0.045s);
  transition: border-color 0.2s, transform 0.18s, box-shadow 0.2s; }
.src-card:hover, .src-card.cur { border-color: color-mix(in srgb, var(--sd-l2-core) 55%, transparent);
  transform: translateY(-3px);
  box-shadow: 0 16px 34px -18px color-mix(in srgb, var(--sd-l2-core) 55%, transparent); }
.src-card.cur { outline: 2px solid color-mix(in srgb, var(--sd-l2-core) 45%, transparent); outline-offset: 1px; }
.src-card.sel { border-color: var(--sd-l2-core); background-color: color-mix(in srgb, var(--sd-l2-core) 7%, var(--sd-surface)); }

.src-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--pc); }
.src-hatch { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background: repeating-linear-gradient(135deg, color-mix(in srgb, var(--sd-l2-halt) 10%, transparent) 0 8px, transparent 8px 22px); }

.src-pick { display: grid; place-items: center; }
.src-pick input { width: 15px; height: 15px; accent-color: var(--sd-l2-core); cursor: pointer; }

.src-glyph { width: 34px; height: 34px; flex: none; }
.src-glyph-eye { fill: color-mix(in srgb, var(--pc) 18%, transparent); stroke: var(--pc); stroke-width: 1.6; }
.src-glyph-barb { stroke: var(--pc); stroke-width: 1.6; stroke-linecap: round; }

.src-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.src-top { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 10px; flex-wrap: wrap; }
.src-num { color: var(--sd-l2-core); letter-spacing: 0.05em; font-weight: 800; }
.src-lane { display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: 999px;
  font-size: 8.5px; font-weight: 700; letter-spacing: 0.08em; color: var(--sd-text-secondary);
  border: 1px solid var(--sd-border-strong); }
.src-lane i { width: 6px; height: 6px; border-radius: 50%; background: var(--lc); }
.src-subj { margin: 0; font-size: 13px; font-weight: 700; line-height: 1.32;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.src-meta { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 9px; flex-wrap: wrap;
  color: var(--sd-text-dim); }
.src-owner { display: inline-flex; align-items: center; gap: 5px; font-weight: 700; letter-spacing: 0.06em; }
.src-owner.un { color: var(--sd-l2-warn); }
.src-mono { display: grid; place-items: center; width: 17px; height: 17px; border-radius: 50%;
  font-size: 7px; font-weight: 800; color: var(--sd-l2-core);
  border: 1px solid color-mix(in srgb, var(--sd-l2-core) 50%, transparent); }
.src-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 999px;
  font-size: 8px; font-weight: 800; letter-spacing: 0.1em; border: 1px solid var(--sd-border-strong); }
.src-badge.esc { color: var(--sd-st-escalated, var(--sd-l2-warn)); }
.src-badge.ack { color: var(--sd-l2-warn); border-color: color-mix(in srgb, var(--sd-l2-warn) 45%, transparent); }
.src-badge.swarm { color: var(--sd-l2-core); border-color: color-mix(in srgb, var(--sd-l2-core) 45%, transparent); }
.src-badge.watch { color: var(--sd-l2-go); border-color: color-mix(in srgb, var(--sd-l2-go) 40%, transparent); }
.src-badge.view { color: var(--sd-text-secondary); border-style: dashed; }

.src-sla { position: relative; display: grid; place-items: center; width: 52px; height: 52px; flex: none; }
.src-sla-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.src-sla-track { fill: none; stroke: color-mix(in srgb, var(--sd-text) 12%, transparent); stroke-width: 3.4; }
.src-sla-arc { fill: none; stroke-width: 3.4; stroke-linecap: round; transition: stroke-dasharray 0.6s var(--sd-spring); }
.src-sla-arc.ok { stroke: var(--sd-l2-go); } .src-sla-arc.warn { stroke: var(--sd-l2-warn); }
.src-sla-arc.bad { stroke: var(--sd-l2-halt); } .src-sla-arc.dim { stroke: var(--sd-text-dim); }
.src-sla-v { position: relative; font-size: 8.5px; font-weight: 800; font-variant-numeric: tabular-nums; }
.src-sla-v.ok { color: var(--sd-l2-go); } .src-sla-v.warn { color: var(--sd-l2-warn); }
.src-sla-v.bad { color: var(--sd-l2-halt); } .src-sla-v.dim { color: var(--sd-text-dim); }

.src-skel { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 11px; }
.src-skel-card { height: 84px; border-radius: 15px; border: 1px solid var(--sd-border);
  background: linear-gradient(100deg, var(--sd-surface) 40%, color-mix(in srgb, var(--sd-l2-core) 6%, var(--sd-surface)) 50%, var(--sd-surface) 60%);
  background-size: 200% 100%; animation: src-shimmer 1.4s linear infinite; animation-delay: calc(var(--i) * 0.1s); }
@keyframes src-shimmer { to { background-position: -200% 0; } }

.src-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 46px 20px;
  border: 1px dashed var(--sd-border-strong); border-radius: 16px; color: var(--sd-text-dim); text-align: center; }
.src-empty h4 { margin: 4px 0 0; font-size: 14px; color: var(--sd-text-secondary); }
.src-empty p { margin: 0; font-size: 11.5px; max-width: 44ch; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .src-card { animation: none; }
  html:not([data-cinematic="on"]) .src-skel-card { animation: none; }
}
</style>
