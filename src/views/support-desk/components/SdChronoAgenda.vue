<template>
  <div class="ca">
    <p v-if="!groups.length" class="ca-empty sd-mono">NOTHING SCHEDULED IN THIS WINDOW.</p>

    <section v-for="(g, gi) in groups" :key="g.key" class="ca-group" :style="{ '--g': gi }">
      <header class="ca-day">
        <b class="ca-day-lbl" :class="{ today: g.isToday }">{{ g.label }}</b>
        <span class="ca-day-count sd-mono">{{ g.events.length }} event{{ g.events.length === 1 ? '' : 's' }}</span>
        <i class="ca-day-rule" aria-hidden="true"></i>
      </header>

      <button
        v-for="(ev, i) in g.events" :key="ev.kind + '-' + ev.id"
        class="ca-row" :class="[`tk-${tokenOf(ev)}`, { brc: ev.is_breached }]"
        :style="{ '--i': i }"
        @click="$emit('open', ev)"
      >
        <span class="ca-time sd-mono">{{ fmtTime(ev.at) }}</span>
        <i class="ca-dot" aria-hidden="true"></i>
        <span class="ca-kind sd-mono">{{ shortOf(ev) }}</span>
        <b class="ca-num sd-mono">{{ ev.ticket_number || 'PIN' }}</b>
        <span class="ca-subject">{{ ev.subject || ev.note || '—' }}</span>
        <SdPill v-if="ev.priority" kind="priority" :value="ev.priority" />
        <span v-if="ev.is_breached" class="ca-brc sd-mono">OVERDUE</span>
        <span v-if="ev.assigned_agent_name" class="ca-agent">{{ ev.assigned_agent_name }}</span>
        <ChevronRight class="ca-go" :size="14" />
      </button>
    </section>
  </div>
</template>

<script setup>
import { ChevronRight } from 'lucide-vue-next'
import SdPill from './SdPill.vue'
import { calKindMeta } from '@/composables/useSupportDesk'
import { fmtTime } from '../chrono'

defineProps({
  /** [{key, label, isToday, events[]}] in chronological order */
  groups: { type: Array, default: () => [] },
})
defineEmits(['open'])

const tokenOf = (ev) => calKindMeta(ev.kind).token
const shortOf = (ev) => calKindMeta(ev.kind).short
</script>

<style scoped>
.ca { display: flex; flex-direction: column; gap: 22px; }
.ca-empty { padding: 70px 0; text-align: center; font-size: 10px; letter-spacing: 0.3em; color: var(--sd-text-dim); }

.ca-group { display: flex; flex-direction: column; gap: 7px; animation: sd-cal-rise 0.5s var(--sd-spring) both; animation-delay: calc(var(--g) * 0.06s); }
.ca-day { display: flex; align-items: center; gap: 12px; }
.ca-day-lbl { font-size: 13px; font-weight: 800; color: var(--sd-text); letter-spacing: -0.01em; }
.ca-day-lbl.today { color: var(--sd-cal-core); }
.ca-day-count { font-size: 9px; letter-spacing: 0.18em; color: var(--sd-text-dim); }
.ca-day-rule { flex: 1; height: 1px; background: linear-gradient(90deg, var(--sd-cal-brd), transparent); }

.ca-row {
  --tk: var(--sd-cal-core);
  display: flex; align-items: center; gap: 11px; min-width: 0; text-align: left; cursor: pointer;
  padding: 9px 14px; border-radius: 12px;
  background: var(--sd-surface); border: 1px solid var(--sd-border);
  animation: sd-cal-rise 0.4s var(--sd-spring) both; animation-delay: calc(var(--i) * 0.04s);
  transition: transform 0.18s var(--sd-spring), border-color 0.18s;
}
.ca-row:hover { transform: translateX(3px); border-color: color-mix(in srgb, var(--tk) 40%, transparent); }
.ca-time { flex: none; width: 44px; font-size: 10.5px; font-weight: 700; color: var(--sd-text-muted); }
.ca-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--tk); box-shadow: 0 0 8px var(--tk); flex: none; }
.ca-kind { flex: none; width: 66px; font-size: 8.5px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--tk); }
.ca-num { flex: none; font-size: 11px; font-weight: 700; color: var(--sd-text); }
.ca-subject { flex: 1; min-width: 0; font-size: 12px; color: var(--sd-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ca-brc {
  flex: none; font-size: 8px; font-weight: 700; letter-spacing: 0.18em; color: var(--sd-cal-storm);
  border: 1px solid var(--sd-cal-storm); border-radius: 999px; padding: 1px 7px;
}
.ca-agent { flex: none; font-size: 10px; color: var(--sd-text-dim); }
.ca-go { flex: none; color: var(--sd-text-dim); }
.ca-row:hover .ca-go { color: var(--tk); }
.ca-row.brc { border-color: color-mix(in srgb, var(--sd-cal-storm) 30%, transparent); }

.tk-core { --tk: var(--sd-cal-core); } .tk-ember { --tk: var(--sd-cal-ember); }
.tk-rose { --tk: var(--sd-cal-rose); } .tk-gold { --tk: var(--sd-cal-gold); }
.tk-resume { --tk: var(--sd-cal-resume); } .tk-stone { --tk: var(--sd-cal-stone); }
.tk-moon { --tk: var(--sd-cal-moon); } .tk-pin { --tk: var(--sd-cal-pin); }

@media (max-width: 800px) { .ca-agent, .ca-kind { display: none; } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .ca-group,
  html:not([data-cinematic="on"]) .ca-row { animation: none; }
}
</style>
