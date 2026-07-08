<template>
  <div class="cd">
    <div class="cd-rail" aria-hidden="true">
      <span v-for="h in 24" :key="h" class="cd-hour sd-mono" :style="{ top: ((h - 1) / 24) * 100 + '%' }">
        {{ String(h - 1).padStart(2, '0') }}:00
      </span>
      <i v-if="day.isToday && nowTop != null" class="cd-nowline" :style="{ top: nowTop + '%' }"></i>
    </div>

    <div class="cd-flow">
      <p v-if="!day.events.length" class="cd-empty sd-mono">
        A CLEAR DAY — NOTHING ON THE CLOCK.
      </p>
      <Motion
        v-for="(ev, i) in day.events" :key="ev.kind + '-' + ev.id"
        as="button" class="cd-ev" :class="[`tk-${tokenOf(ev)}`, { brc: ev.is_breached }]"
        :initial="{ opacity: 0, x: -18 }" :animate="{ opacity: 1, x: 0 }"
        :transition="{ duration: 0.4, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }"
        :whileHover="{ x: 4 }" :whileTap="{ scale: 0.985 }"
        @click="$emit('open', ev)"
      >
        <span class="cd-ev-time sd-mono">{{ fmtTime(ev.at) }}</span>
        <span class="cd-ev-spine" aria-hidden="true"></span>
        <span class="cd-ev-main">
          <span class="cd-ev-top">
            <b class="cd-ev-num sd-mono">{{ ev.ticket_number || 'PIN' }}</b>
            <span class="cd-ev-kind">{{ labelOf(ev) }}</span>
            <SdPill v-if="ev.priority" kind="priority" :value="ev.priority" />
            <span v-if="ev.is_breached" class="cd-ev-brc sd-mono">OVERDUE</span>
          </span>
          <span class="cd-ev-sub">{{ ev.subject || ev.note || '—' }}</span>
          <span v-if="ev.assigned_agent_name" class="cd-ev-agent">
            <UserRound :size="10" /> {{ ev.assigned_agent_name }}
          </span>
        </span>
        <span v-if="ev.kind === 'reminder'" class="cd-ev-act" title="Mark done" @click.stop="$emit('done', ev)">
          <CircleCheck :size="15" />
        </span>
      </Motion>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { UserRound, CircleCheck } from 'lucide-vue-next'
import SdPill from './SdPill.vue'
import { calKindMeta } from '@/composables/useSupportDesk'
import { fmtTime } from '../chrono'

defineProps({
  /** {key, isToday, events[]} — events sorted by at */
  day: { type: Object, default: () => ({ events: [] }) },
})
defineEmits(['open', 'done'])

const tokenOf = (ev) => calKindMeta(ev.kind).token
const labelOf = (ev) => calKindMeta(ev.kind).label

const nowTop = computed(() => {
  const d = new Date()
  return ((d.getHours() + d.getMinutes() / 60) / 24) * 100
})
</script>

<style scoped>
.cd { display: grid; grid-template-columns: 64px 1fr; gap: 14px; min-height: 420px; }

.cd-rail { position: relative; border-right: 1px solid var(--sd-border); }
.cd-hour {
  position: absolute; right: 10px; transform: translateY(-50%);
  font-size: 8.5px; letter-spacing: 0.12em; color: var(--sd-text-dim);
}
.cd-nowline {
  position: absolute; right: 0; width: 26px; height: 2px;
  background: var(--sd-cal-core); box-shadow: 0 0 10px var(--sd-cal-core);
}

.cd-flow { display: flex; flex-direction: column; gap: 9px; padding: 6px 0; }
.cd-empty { padding: 60px 0; text-align: center; font-size: 10px; letter-spacing: 0.3em; color: var(--sd-text-dim); }

.cd-ev {
  --tk: var(--sd-cal-core);
  display: flex; align-items: stretch; gap: 12px; text-align: left; cursor: pointer;
  padding: 11px 14px; border-radius: 14px;
  background: var(--sd-surface); border: 1px solid var(--sd-border);
}
.cd-ev:hover { border-color: color-mix(in srgb, var(--tk) 45%, transparent); box-shadow: 0 8px 26px rgba(0, 0, 0, 0.22); }
.cd-ev-time { flex: none; width: 46px; font-size: 11px; font-weight: 700; color: var(--tk); align-self: center; }
.cd-ev-spine { flex: none; width: 3px; border-radius: 2px; background: var(--tk); box-shadow: 0 0 8px var(--tk); }
.cd-ev-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.cd-ev-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.cd-ev-num { font-size: 11px; font-weight: 700; color: var(--sd-text); }
.cd-ev-kind { font-size: 9.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--tk); }
.cd-ev-brc {
  font-size: 8.5px; font-weight: 700; letter-spacing: 0.2em; color: var(--sd-cal-storm);
  border: 1px solid var(--sd-cal-storm); border-radius: 999px; padding: 1px 7px;
  animation: sd-cal-pulse 2s ease-in-out infinite;
}
.cd-ev-sub { font-size: 12px; color: var(--sd-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cd-ev-agent { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; color: var(--sd-text-muted); }
.cd-ev-act { align-self: center; color: var(--sd-cal-pin); opacity: 0.7; }
.cd-ev-act:hover { opacity: 1; }
.cd-ev.brc { border-color: color-mix(in srgb, var(--sd-cal-storm) 35%, transparent); }

.tk-core { --tk: var(--sd-cal-core); } .tk-ember { --tk: var(--sd-cal-ember); }
.tk-rose { --tk: var(--sd-cal-rose); } .tk-gold { --tk: var(--sd-cal-gold); }
.tk-resume { --tk: var(--sd-cal-resume); } .tk-stone { --tk: var(--sd-cal-stone); }
.tk-moon { --tk: var(--sd-cal-moon); } .tk-pin { --tk: var(--sd-cal-pin); }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .cd-ev-brc { animation: none; }
}
</style>
